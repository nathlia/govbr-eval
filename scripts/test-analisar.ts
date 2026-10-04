/**
 * T6 — análise determinística de um pacote/par, com resultado conhecido. Navegador headless real
 * (a captura é a mesma do scorer), nenhum modelo. Tudo sobre a fixture SINTÉTICA de
 * scripts/fixtures/analise/ (construída numa pasta temporária a cada caso).
 *
 * Uso: npm run test:analisar
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { validateContract, type AnalysisBinding, type ArtifactManifest } from "../contracts/index";
import { analisar, ESPELHO_CLI, regiaoDoCli, seguro, type OpcoesAnalise, type Resumo } from "./analisar-execucao";
import { ROOT } from "./adjudication";
import { construirFixture, FIXTURE_DIR, FINDINGS_PADRAO, type OpcoesFixture } from "./fixtures/analise/construir";
import { analysisIdentity } from "./collection-manifest";
import { FLOW_SCORING_VERSION } from "./instrument";
import type { RawReviews, SemanticPackage } from "./semantic-flow";

const work = mkdtempSync(join(tmpdir(), "teste-analisar-"));
let n = 0;
let tests = 0;
async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  const t = Date.now();
  await fn();
  tests++;
  console.log(`ok ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
}
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const nova = (rotulo: string) => join(work, `${++n}-${rotulo}`);

function fixture(o: OpcoesFixture = {}) { return construirFixture(nova("fixture"), o); }
type Fx = ReturnType<typeof construirFixture>;
function opcoes(fx: Fx, extra: Partial<OpcoesAnalise> = {}): OpcoesAnalise {
  const base: OpcoesAnalise = { sem: fx.sem, com: fx.com, campanha: fx.campanha, snapshots: fx.snapshots, referencia: fx.referencia,
    site: fx.site, linhaDeBase: fx.linhaDeBase, saida: nova("saida") };
  const o = { ...base, ...extra };
  if (extra.semLinhaDeBase) delete o.linhaDeBase;
  if (extra.pacote) { delete o.sem; delete o.com; }
  return o;
}
const binding = (saida: string, arm: string) => readJson<AnalysisBinding>(join(saida, `analysis-binding.${arm}.json`));
const execDe = (r: Resumo, arm: string) => r.execucoes.find(e => e.braco === arm)!;
function assertBindingValido(saida: string, arm: string): AnalysisBinding {
  const b = binding(saida, arm);
  const v = validateContract(b);
  assert.ok(v.valid, JSON.stringify(v.errors));
  return b;
}
function assertMetricasNulas(b: AnalysisBinding) {
  for (const [k, v] of Object.entries(b.metrics)) assert.equal(v, null, `métrica ${k} deveria ser null`);
}

/** Decisões a partir do pacote preparado: cada cartão do agente pelo seletor; linhas de base ficam pendentes. */
function decidir(saida: string, porSeletor: Record<string, Record<string, "gabarito" | "novo" | "incorreta" | "pendente" | { duplicaDe: string }>>): string {
  const pkg = readJson<SemanticPackage>(join(saida, "revisao", "package.json"));
  const raw = readJson<RawReviews>(join(saida, "revisao", "reviews.json"));
  const unidadeDe = (cardId: string) => {
    const card = pkg.cards.find(c => c.id === cardId)!;
    return pkg.units.filter(u => card.subjects.some(s => s.key && u.participants.includes(s.key))).map(u => u.id);
  };
  const primeiro = new Map<string, string>();
  for (const run of pkg.runs.filter(r => r.kind === "agente")) {
    const regras = porSeletor[run.id] ?? {};
    const regraDe = (card: SemanticPackage["cards"][number]) => {
      const chave = Object.keys(regras).find(k => card.selector === k.split("|")[0] && (!k.includes("|") || (card.observed ?? "").includes(k.split("|")[1])));
      return chave ? regras[chave] : "pendente";
    };
    // duplicadas por último, para que "duplicaDe" aponte um cartão já decidido
    const cards = run.cardIds.map(id => pkg.cards.find(c => c.id === id)!)
      .sort((a, b) => Number(typeof regraDe(a) === "object") - Number(typeof regraDe(b) === "object"));
    for (const card of cards) {
      const regra = regraDe(card);
      const d = raw.decisions.find(x => x.cardId === card.id)!;
      if (regra === "pendente") continue;
      const subjects = card.subjects.map(s => s.id);
      const base = { cardId: card.id, status: "reviewed" as const, reviewer: "teste-fixture", rationale: "decisão sintética do teste",
        complete: true, evidenceRefs: ["revisao/scene-0.png"] };
      let atom: RawReviews["decisions"][number]["atoms"][number];
      if (typeof regra === "object") {
        const alvo = primeiro.get(`${run.id}|${regra.duplicaDe}`)!;
        atom = { id: "a1", text: "mesma afirmação", subjects, decisao: "duplicada", duplicateOf: { cardId: alvo, atomId: "a1" },
          unitIds: unidadeDe(card.id), citation: "supported" };
      } else {
        atom = { id: "a1", text: "afirmação sintética", subjects, citation: "supported",
          decisao: regra === "gabarito" ? "defeito-do-gabarito" : regra === "novo" ? "defeito-novo-correto" : "incorreta",
          unitIds: regra === "gabarito" ? unidadeDe(card.id) : [] };
        if (!primeiro.has(`${run.id}|${card.selector}`)) primeiro.set(`${run.id}|${card.selector}`, card.id);
      }
      Object.assign(d, base, { atoms: [atom] });
    }
  }
  const path = join(saida, "..", `${relative(work, saida).replace(/[\\/]/g, "_")}-decisoes.json`);
  writeFileSync(path, JSON.stringify(raw, null, 2));
  return path;
}

async function main(): Promise<void> {
  try {
    // ── par válido com resultado conhecido ──────────────────────────────────
    const fx = fixture();
    let primeira!: string;
    await test("par válido: prepara a fila (aguardando revisão), bindings v1 válidos, nenhuma métrica inventada", async () => {
      const r = await analisar(opcoes(fx));
      primeira = r.saida;
      assert.equal(r.estado, "pronta");
      for (const arm of ["sem", "com"]) {
        const b = assertBindingValido(r.saida, arm);
        assert.equal(b.status, "ready");
        assert.equal(b.scoreStatus, "pending-review");
        assert.equal(b.baseline.mode, "used");
        assert.equal(b.metrics.recall, null);
        assert.equal(b.metrics.precision, null);
        assert.equal(b.scorer.scorerSha256, analysisIdentity().scorerSha256);
      }
      assert.equal(execDe(r.resumo, "sem").pontuacao.metricas.pending, 2);
      assert.equal(execDe(r.resumo, "com").pontuacao.metricas.pending, 3);
      const pkg = readJson<SemanticPackage>(join(r.saida, "revisao", "package.json"));
      assert.deepEqual(pkg.runs.map(x => x.id).sort(), ["fixture-analise-run-com-01", "fixture-analise-run-sem-01",
        "linha-de-base/axe", "linha-de-base/validator-nao-guiada"]);
      assert.equal(pkg.units.length, 3);
      assert.ok(readFileSync(join(r.saida, "revisao", "review.md"), "utf8").includes("renderização cega"));
    });

    await test("par válido com decisões: score conhecido, comparação por unidade, revisão 2 ligada à 1, sem vencedor", async () => {
      const decisoes = decidir(primeira, {
        "fixture-analise-run-sem-01": { "#fx-campo": "gabarito", ".fx-aviso": "incorreta" },
        "fixture-analise-run-com-01": { "#fx-campo": "gabarito", "#fx-botao": "gabarito", "#fx-titulo": "novo" },
      });
      const r = await analisar(opcoes(fx, { decisoes, anterior: primeira }));
      assert.equal(r.estado, "pronta");
      const sem = assertBindingValido(r.saida, "sem"), com = assertBindingValido(r.saida, "com");
      assert.equal(sem.scoreStatus, "final");
      assert.deepEqual(sem.metrics, { referenceUnits: 3, confirmedReferenceUnits: 1, recall: 1 / 3, precision: 0.5,
        incorrectClaims: 1, newCorrect: 0, pending: 0 });
      assert.equal(com.scoreStatus, "final");
      assert.deepEqual(com.metrics, { referenceUnits: 3, confirmedReferenceUnits: 2, recall: 2 / 3, precision: 1,
        incorrectClaims: 0, newCorrect: 1, pending: 0 });
      const c = r.resumo.comparacao!;
      assert.equal(c.disponivel, true);
      assert.equal(c.estado, "final");
      assert.equal(c.diferencaUnidadesConfirmadas, 1);
      assert.ok(Math.abs(c.diferencaRecall! - 1 / 3) < 1e-12);
      assert.deepEqual(c.unidades!.soCom.map(u => u.specId), ["FX-02"]);
      assert.deepEqual(c.unidades!.soSem, []);
      assert.deepEqual(c.unidades!.ambos.map(u => u.specId), ["FX-01"]);
      assert.deepEqual(c.unidades!.nenhum.map(u => u.specId), ["FX-03"]);
      assert.equal(r.resumo.revisao.numero, 2);
      assert.equal(r.resumo.revisao.anterior!.conteudoCientificoSha256, readJson<Resumo>(join(primeira, "summary.json")).hashes.conteudoCientificoSha256);
      const md = readFileSync(join(r.saida, "summary.md"), "utf8");
      assert.match(md, /n = 1 par, sem inferência/);
      assert.doesNotMatch(md, /vencedor|ganhou|melhor braço/i);
      assert.match(md, /Diferença de recall \(com − sem\): \+33,3 p\.p\./);
      // referência sem specs P-* (como a 1.0.0): nenhuma quebra por camada, nem no JSON nem no texto
      for (const e of r.resumo.execucoes) assert.equal("camadas" in e.pontuacao, false);
      assert.doesNotMatch(md, /Sorteadas × página/);
      // ordem do resumo: status → identidade → científico → comparação → MCP → custo → detalhes
      const ordem = ["## 1. Status técnico", "## 2. Identidade", "## 3. Resultado científico", "## 4. Comparação com − sem",
        "## 5. MCP e isolamento", "## 6. Custo e tempo", "## 7. Detalhes e evidências"].map(h => md.indexOf(h));
      assert.ok(ordem.every((p, i) => p >= 0 && (i === 0 || p > ordem[i - 1])), `ordem das seções: ${ordem}`);
      // o pacote bruto não foi tocado
      const man = readJson<ArtifactManifest>(join(fx.sem, "artifact-manifest.json"));
      for (const f of man.files) assert.equal(sha(readFileSync(join(fx.sem, f.path))), f.sha256);
    });

    await test("camada de página (D-83): sorteadas (A-*) × página (P-*) por braço, recall só com revisão fechada", async () => {
      const fxp = fixture({ camadaPagina: true });
      const r1 = await analisar(opcoes(fxp));
      for (const e of r1.resumo.execucoes) {
        assert.equal(e.pontuacao.camadas!.sorteadas.total, 2);
        assert.equal(e.pontuacao.camadas!.pagina.total, 1);
        assert.equal(e.pontuacao.camadas!.sorteadas.recall, null);
        assert.equal(e.pontuacao.camadas!.pagina.recall, null);
      }
      assert.ok(readFileSync(join(r1.saida, "summary.md"), "utf8").includes("| Sorteadas × página (A-\\* × P-\\*) | A-\\*: 0 de 2 (até agora) · indisponível"));
      const decisoes = decidir(r1.saida, {
        "fixture-analise-run-sem-01": { "#fx-campo": "gabarito", ".fx-aviso": "incorreta" },
        "fixture-analise-run-com-01": { "#fx-campo": "gabarito", "#fx-botao": "gabarito", "#fx-titulo": "novo" },
      });
      const r = await analisar(opcoes(fxp, { decisoes, anterior: r1.saida }));
      assert.deepEqual(execDe(r.resumo, "sem").pontuacao.camadas, {
        sorteadas: { prefixo: "A-", confirmadas: 1, total: 2, recall: 0.5 }, pagina: { prefixo: "P-", confirmadas: 0, total: 1, recall: 0 } });
      assert.deepEqual(execDe(r.resumo, "com").pontuacao.camadas, {
        sorteadas: { prefixo: "A-", confirmadas: 2, total: 2, recall: 1 }, pagina: { prefixo: "P-", confirmadas: 0, total: 1, recall: 0 } });
      // a camada só reparte: o total continua o mesmo
      assert.equal(execDe(r.resumo, "com").pontuacao.metricas.confirmedReferenceUnits, 2);
      const md = readFileSync(join(r.saida, "summary.md"), "utf8");
      assert.ok(md.includes("A-\\*: 1 de 2 · 50,0% × P-\\*: 0 de 1 · 0,0%"), "camada no braço sem");
      assert.ok(md.includes("A-\\*: 2 de 2 · 100,0% × P-\\*: 0 de 1 · 0,0%"), "camada no braço com");
    });

    await test("texto do modelo é escapado no summary.md (sem HTML ativo, sem autolink externo)", () => {
      const md = readFileSync(join(primeira, "summary.md"), "utf8");
      assert.ok(!md.includes("<script>"), "HTML cru no resumo");
      assert.ok(md.includes("&lt;script&gt;"));
      assert.ok(!md.includes("http://exemplo"), "URL do modelo virou autolink");
      assert.equal(seguro("[x](https://mal.invalid) <b>"), "\\[x\\]\\(https&#58;//mal.invalid\\) &lt;b&gt;");
    });

    await test("determinismo: mesmas entradas e versões ⇒ mesmo conteúdo científico, pacote, decisões e score.json", async () => {
      const a = await analisar(opcoes(fx)), b = await analisar(opcoes(fx));
      assert.equal(a.resumo.hashes.conteudoCientificoSha256, b.resumo.hashes.conteudoCientificoSha256);
      assert.equal(a.resumo.hashes.pacoteRevisao, b.resumo.hashes.pacoteRevisao);
      assert.equal(a.resumo.hashes.decisoes, b.resumo.hashes.decisoes);
      assert.equal(sha(readFileSync(join(a.saida, "score.json"))), sha(readFileSync(join(b.saida, "score.json"))));
      assert.equal(sha(readFileSync(join(a.saida, "revisao", "review.md"))), sha(readFileSync(join(b.saida, "revisao", "review.md"))));
      for (const arm of ["sem", "com"]) {
        const { createdAt: _a, ...x } = binding(a.saida, arm), { createdAt: _b, ...y } = binding(b.saida, arm);
        assert.deepEqual(x, y);
      }
    });

    await test("findings [] é resultado válido: pontuação final com 0 confirmadas, recall 0, nunca 'sem submissão'", async () => {
      const f = fixture({ sem: { findings: [] } });
      const r = await analisar(opcoes(f, { pacote: f.sem }));
      assert.equal(r.estado, "pronta");
      const b = assertBindingValido(r.saida, "sem");
      assert.equal(b.scoreStatus, "final");
      assert.equal(b.metrics.confirmedReferenceUnits, 0);
      assert.equal(b.metrics.recall, 0);
      assert.equal(b.metrics.precision, null);
      assert.equal(execDe(r.resumo, "sem").achados!.total, 0);
      assert.equal(r.resumo.comparacao, null);
      assert.match(readFileSync(join(r.saida, "summary.md"), "utf8"), /nenhum \(lista vazia aceita pelo coletor\)/);
    });

    await test("submissão recusada ou ausente: não pontua, métricas null, nunca vira zero achados; o outro braço segue", async () => {
      for (const submissao of ["recusada", "nenhuma"] as const) {
        const f = fixture({ sem: { submissao } });
        const r = await analisar(opcoes(f));
        assert.equal(r.estado, "pronta");
        const sem = assertBindingValido(r.saida, "sem");
        assert.equal(sem.scoreStatus, "not-applicable");
        assertMetricasNulas(sem);
        const e = execDe(r.resumo, "sem");
        assert.equal(e.achados, null);
        assert.equal(e.tecnico.submissao, submissao === "recusada" ? "refused" : "none");
        assert.equal(assertBindingValido(r.saida, "com").scoreStatus, "pending-review");
        assert.equal(r.resumo.comparacao!.disponivel, false);
        const md = readFileSync(join(r.saida, "summary.md"), "utf8");
        assert.match(md, submissao === "recusada" ? /recusada pelo coletor/ : /nenhuma submissão chegou/);
        const pkg = readJson<SemanticPackage>(join(r.saida, "revisao", "package.json"));
        assert.ok(!pkg.runs.some(x => x.id === "fixture-analise-run-sem-01"), "execução sem submissão entrou no pacote");
      }
    });

    await test("execução não rodou (preflight): só resumo técnico, pontuação não se aplica, nada preparado", async () => {
      const f = fixture({ sem: { submissao: "nao-executada" } });
      const r = await analisar(opcoes(f, { pacote: f.sem }));
      assert.equal(r.estado, "pronta");
      const b = assertBindingValido(r.saida, "sem");
      assert.equal(b.scoreStatus, "not-applicable");
      assertMetricasNulas(b);
      assert.equal(existsSync(join(r.saida, "revisao")), false);
      assert.equal(existsSync(join(r.saida, "score.json")), false);
      const md = readFileSync(join(r.saida, "summary.md"), "utf8");
      assert.match(md, /não rodou \(o modelo não foi chamado\)/);
      assert.match(md, /preflight · preflight-failed/);
      assert.match(md, /Tempo de relógio \(s\) \| não se aplica/);
    });

    // ── linha de base ────────────────────────────────────────────────────────
    await test("ausência planejada no caminho individual: aceita, sem execuções de linha de base no pacote", async () => {
      const f = fixture({ ausenciaPlanejada: true });
      const r = await analisar(opcoes(f, { semLinhaDeBase: true }));
      assert.equal(r.estado, "pronta");
      const b = assertBindingValido(r.saida, "sem");
      assert.equal(b.baseline.mode, "planned-absence");
      const pkg = readJson<SemanticPackage>(join(r.saida, "revisao", "package.json"));
      assert.ok(pkg.runs.every(x => x.kind === "agente"));
    });

    const bloqueada = async (r: Awaited<ReturnType<typeof analisar>>, causa: string, motivo: RegExp) => {
      assert.equal(r.estado, "bloqueada");
      assert.match(r.motivo!, motivo);
      for (const e of r.resumo.execucoes) {
        const b = assertBindingValido(r.saida, e.braco);
        assert.equal(b.status, "blocked");
        assert.equal(b.scoreStatus, "not-prepared");
        assertMetricasNulas(b);
        if (causa !== "-") { assert.equal(b.baseline.mode, "blocked"); assert.equal((b.baseline as { cause: string }).cause, causa); }
      }
      assert.equal(existsSync(join(r.saida, "revisao")), false);
      const md = readFileSync(join(r.saida, "summary.md"), "utf8");
      assert.match(md, /Análise: \*\*bloqueada\*\*/);
      assert.match(md, /## 2\. Identidade/, "resumo técnico tem de continuar disponível");
      assert.match(md, /Indisponível: a análise está bloqueada/);
    };

    await test("ausência planejada na análise composta: bloqueada (nunca liberada)", async () => {
      const f = fixture({ ausenciaPlanejada: true });
      const man = join(f.dir, "manifesto-analise-sintetico.json");
      writeFileSync(man, JSON.stringify({ fixture: true, nota: "manifesto de análise sintético" }));
      const r = await analisar(opcoes(f, { semLinhaDeBase: true, tipo: "composta", manifestoAnalise: man,
        bateriaDesignada: "bateria-fixture", justificativa: "justificativa sintética" }));
      await bloqueada(r, "missing-unplanned", /composta exige linha de base/);
    });

    await test("ausência não autorizada (campanha não declara): bloqueada", async () => {
      const f = fixture();
      await bloqueada(await analisar(opcoes(f, { semLinhaDeBase: true })), "missing-unplanned", /não declara ausência/);
    });

    await test("linha de base falha/parcial: bloqueada, bruto e registro intactos", async () => {
      const f = fixture({ linhaDeBase: "falha" });
      const bruto = join(f.dir, "linha-de-base", "bruta.json");
      const antes = sha(readFileSync(bruto));
      const r = await analisar(opcoes(f));
      await bloqueada(r, "baseline-failed", /falhou/);
      assert.equal(sha(readFileSync(bruto)), antes);
      assert.ok(existsSync(join(r.saida, "entradas", "linha-de-base-registro.json")));
    });

    await test("linha de base de outra identidade: bloqueada (incompatible)", async () => {
      const f = fixture({ linhaDeBase: "identidade-divergente" });
      await bloqueada(await analisar(opcoes(f)), "incompatible", /referenceSha256/);
    });

    await test("par com diferença fora do desenho: bloqueado por checkAggregation", async () => {
      const f = fixture({ divergenciaForaDoDesenho: true });
      await bloqueada(await analisar(opcoes(f)), "-", /checkAggregation.*browser\.version/);
    });

    // ── duplicadas e pendências ──────────────────────────────────────────────
    await test("duplicada e pendente: provisória, contagem de pendências, recall/precisão null", async () => {
      const f = fixture({ com: { findings: [...FINDINGS_PADRAO.com, { ...FINDINGS_PADRAO.com[0],
        observed: "Campo sintético sem rótulo associado (alegação repetida)." }] } });
      const r1 = await analisar(opcoes(f));
      const decisoes = decidir(r1.saida, {
        "fixture-analise-run-sem-01": { "#fx-campo": "gabarito", ".fx-aviso": "incorreta" },
        "fixture-analise-run-com-01": { "#fx-campo|associado.": "gabarito", "#fx-campo|repetida": { duplicaDe: "#fx-campo" },
          "#fx-botao": "gabarito" },
      });
      const r = await analisar(opcoes(f, { decisoes, anterior: r1.saida }));
      const com = assertBindingValido(r.saida, "com");
      assert.equal(com.scoreStatus, "provisional");
      assert.equal(com.metrics.pending, 1);
      assert.equal(com.metrics.recall, null);
      assert.equal(com.metrics.precision, null);
      assert.equal(com.metrics.confirmedReferenceUnits, 2);
      assert.equal(execDe(r.resumo, "com").pontuacao.detalhe!.duplicadas, 1);
      assert.equal(r.resumo.comparacao!.estado, "provisoria");
      assert.equal(r.resumo.comparacao!.diferencaRecall, null);
      assert.match(readFileSync(join(r.saida, "summary.md"), "utf8"), /provisória — 1 cartão\(ões\) pendente\(s\)/);
    });

    // ── integridade do pacote ────────────────────────────────────────────────
    await test("pacote adulterado (hash diverge) ou arquivo fora do manifesto: recusado, nada calculado", async () => {
      const f = fixture();
      const findings = join(f.sem, "findings.json");
      writeFileSync(findings, readFileSync(findings, "utf8").replace("Campo sintético", "Campo adulterado"));
      const r = await analisar(opcoes(f));
      assert.equal(r.estado, "recusada");
      assert.match(r.motivo!, /hash ou tamanho diverge do manifesto: findings\.json/);
      assert.deepEqual(readdirSync(r.saida).sort(), ["summary.json", "summary.md"]);
      assert.match(readFileSync(join(r.saida, "summary.md"), "utf8"), /Análise: \*\*recusada\*\*/);

      const g = fixture();
      writeFileSync(join(g.com, "extra.txt"), "arquivo não declarado");
      const r2 = await analisar(opcoes(g));
      assert.equal(r2.estado, "recusada");
      assert.match(r2.motivo!, /arquivo fora do manifesto.*extra\.txt/);

      const h = fixture();
      const man = readJson<ArtifactManifest>(join(h.com, "artifact-manifest.json"));
      man.files[0].path = "../fora.json";
      writeFileSync(join(h.com, "artifact-manifest.json"), JSON.stringify(man));
      const r3 = await analisar(opcoes(h));
      assert.equal(r3.estado, "recusada");
      assert.match(r3.motivo!, /artifact-manifest/);
    });

    await test("campanha congelada com outro scorer: recusada em uma frase, nada calculado; com o atual, segue", async () => {
      const f = fixture();
      const camp = readJson<{ campaignId: string; fixed: { scorerVersion: string } }>(f.campanha);
      assert.equal(camp.fixed.scorerVersion, FLOW_SCORING_VERSION);
      const ok = await analisar(opcoes(f));
      assert.notEqual(ok.estado, "recusada");
      assert.ok(!ok.resumo.analise.avisos.some(a => /scorerVersion/.test(a)));
      camp.fixed.scorerVersion = "flow-semantic-1.4.0";
      writeFileSync(f.campanha, JSON.stringify(camp, null, 2));
      const r = await analisar(opcoes(f));
      assert.equal(r.estado, "recusada");
      assert.equal(r.motivo, `a campanha ${camp.campaignId} foi congelada com flow-semantic-1.4.0; o scorer atual é ${FLOW_SCORING_VERSION} — análise recusada para não misturar versões`);
      assert.deepEqual(readdirSync(r.saida).sort(), ["summary.json", "summary.md"]);
    });

    await test("pasta de saída existente é recusada antes de qualquer leitura (nada sobrescrito)", async () => {
      await assert.rejects(analisar({ ...opcoes(fx), saida: primeira }), /já existe/);
    });

    await test("espelho do CLI: regiões de semantic-flow-cli.ts têm o hash fixado (senão, ressincronize o espelho)", () => {
      const src = readFileSync(join(ROOT, "scripts", "semantic-flow-cli.ts"), "utf8");
      for (const r of ESPELHO_CLI) {
        assert.equal(sha(regiaoDoCli(src, r)), r.sha256,
          `semantic-flow-cli.ts mudou em "${r.nome}": ressincronize o espelho em analisar-execucao.ts e atualize o hash`);
      }
      assert.throws(() => regiaoDoCli("sem âncora", ESPELHO_CLI[0]), /âncora de início/);
    });

    // ── fixture versionada ───────────────────────────────────────────────────
    await test("a cópia versionada em scripts/fixtures/analise/gerado/ é idêntica a uma reconstrução", () => {
      const fresh = construirFixture(nova("reconstrucao")).dir;
      const gerado = join(FIXTURE_DIR, "gerado");
      const lista = (root: string, pre = ""): string[] => readdirSync(join(root, pre)).flatMap(e => {
        const rel = pre ? `${pre}/${e}` : e;
        return statSync(join(root, rel)).isDirectory() ? lista(root, rel) : [rel];
      }).sort();
      assert.deepEqual(lista(gerado), lista(fresh));
      for (const rel of lista(fresh)) assert.equal(sha(readFileSync(join(gerado, rel))), sha(readFileSync(join(fresh, rel))), `difere: ${rel}`);
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  console.log(`\n${tests} testes ok`);
}

main().catch(e => { console.error(e); rmSync(work, { recursive: true, force: true }); process.exitCode = 1; });
