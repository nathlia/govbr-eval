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
import { analisar, seguro, type OpcoesAnalise, type Resumo } from "./analisar-execucao";
import { REGIOES_DO_CLI, regiaoDe } from "./preparo-cenas";
import { normalizarIdsGerados, presenteNoSite } from "./identidade-cartoes";
import { cenasDoPlano } from "./collection-manifest";
import { alvoDoAxe } from "./run-baselines-flow";
import type { FlowGroundTruth } from "../types";
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

    // ── identidade da cena entre recálculos (NAT-67) ─────────────────────────
    await test("id gerado curto que também aparece como texto no site (list-1 dentro de .fa-list-1-2) continua normalizado", () => {
      // O br-select sorteia list-${0..9999}; o CSS do Font Awesome da tela A tem `.fa-list-1-2`.
      const site = [{ body: Buffer.from(".fa-list-1-2:before{content:\"\"}.fa-list-ol{x:1}") },
        { body: Buffer.from("n.setAttribute(`id`,`list-${Math.floor(Math.random()*1e4)}`)") }];
      const cena = (id: string) => `<button aria-controls="${id}"></button><ul id="${id}" role="listbox"></ul>`;
      const noSite = presenteNoSite(site);
      assert.equal(noSite("list-1"), false, "list-1 só aparece colado em fa-…-2: não é token do site");
      const a = normalizarIdsGerados(cena("list-1"), noSite), b = normalizarIdsGerados(cena("list-4946"), noSite);
      assert.equal(a.html, b.html, "o sorteio de list-1 dá o mesmo HTML normalizado que qualquer outro sorteio");
      assert.deepEqual(a.ids, [{ id: "list-1", como: "list-#g1" }]);
      // Id que o site escreve de verdade (atributo, seletor CSS, string JS) continua presente e não é renomeado.
      for (const corpo of ['<ul id="list-1">', "#list-1{color:red}", 'document.getElementById("list-1")', "list-1"]) {
        const fixo = presenteNoSite([{ body: Buffer.from(corpo) }]);
        assert.equal(fixo("list-1"), true, corpo);
        assert.deepEqual(normalizarIdsGerados(cena("list-1"), fixo).ids, [], corpo);
      }
      assert.equal(presenteNoSite([{ body: Buffer.from("list-12 xlist-1 list-1_a") }])("list-1"), false);
    });

    await test("APP_ID sorteado pelo Angular (_ngcontent-XXX-cN, _nghost-XXX-cN, também no CSS dos <style>) sai do hash; o resto continua contando", () => {
      const cena = (app: string, texto = "Vistorias") =>
        `<style>.x[_ngcontent-${app}-c16]{color:red}</style><pnip-header _nghost-${app}-c16=""><h1 _ngcontent-${app}-c16="">${texto}</h1></pnip-header>`;
      const nada = () => false;
      const a = normalizarIdsGerados(cena("baa"), nada), b = normalizarIdsGerados(cena("ksf"), nada);
      assert.equal(a.html, b.html);
      assert.match(a.html, /_nghost-#a1-c16=""/);
      assert.deepEqual(a.ids, [{ id: "_ngcontent/_nghost-baa-c*", como: "_ngcontent/_nghost-#a1-c*" }]);
      assert.notEqual(normalizarIdsGerados(cena("baa", "Outra"), nada).html, a.html, "texto diferente continua mudando o hash");
    });

    await test("página que mostra a data de hoje: o relógio da captura é o createdAt do conjunto de snapshots, e duas preparações dão o mesmo sceneHash", async () => {
      const f = fixture({ hojeNaPagina: true });
      const criado = readJson<{ createdAt: string }>(f.snapshots).createdAt;
      const esperado = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(criado));
      const r1 = await analisar(opcoes(f)), r2 = await analisar(opcoes(f));
      const cap = (saida: string) => readJson<{ sceneHash: string; relogio: { instante: string; fuso: string; origem: string } }>(join(saida, "revisao", "capture.json"));
      const html = readFileSync(join(r1.saida, "revisao", "scene-0.html"), "utf8");
      assert.match(html, new RegExp(`Hoje: ${esperado}`), "a página vê o dia do conjunto de snapshots, não o do recálculo");
      assert.equal(cap(r1.saida).sceneHash, cap(r2.saida).sceneHash);
      assert.deepEqual(readJson<SemanticPackage>(join(r2.saida, "revisao", "package.json")).cards.map(c => c.id),
        readJson<SemanticPackage>(join(r1.saida, "revisao", "package.json")).cards.map(c => c.id));
      assert.equal(cap(r1.saida).relogio.instante, criado);
      assert.equal(cap(r1.saida).relogio.fuso, "America/Sao_Paulo");
      assert.equal(readJson<Resumo>(join(r1.saida, "summary.json")).versoes?.adaptador, "adaptador-benchmark-1.2.0");
    });

    await test("preparo-cenas.ts tem as regiões de semantic-flow-cli.ts texto a texto (os dois ramos de prepare + baselineRuns)", () => {
      const cli = readFileSync(join(ROOT, "scripts", "semantic-flow-cli.ts"), "utf8");
      const mod = readFileSync(join(ROOT, "scripts", "preparo-cenas.ts"), "utf8");
      for (const r of REGIOES_DO_CLI) {
        assert.equal(regiaoDe(mod, r, "preparo-cenas.ts"), regiaoDe(cli, r, "semantic-flow-cli.ts"),
          `"${r.nome}" difere entre semantic-flow-cli.ts e preparo-cenas.ts: ressincronize a cópia (NAT-51)`);
      }
      assert.throws(() => regiaoDe("sem âncora", REGIOES_DO_CLI[0], "x"), /âncora de início/);
      // analisar-execucao.ts não guarda mais nenhum espelho próprio
      const analisarSrc = readFileSync(join(ROOT, "scripts", "analisar-execucao.ts"), "utf8");
      assert.ok(!/function baselineRuns\(|for \(const p of planned\)/.test(analisarSrc));
    });

    // ── referência que navega (D-60, NAT-51) ─────────────────────────────────
    const telas = join(ROOT, "..", "govbr-telas");
    if (!existsSync(join(telas, "site-manifest.json"))) {
      console.log(`PULADO referência que navega: ${telas} ausente (clone o govbr-telas ao lado do govbr-eval)`);
    } else {
      await test("referência que navega (Vistorias 1.0.0 sobre o site do govbr-telas): uma cena por segmento, par analisado; duas preparações dão o mesmo sceneHash (NAT-67)", async () => {
        const referencia = join(ROOT, "ground-truth-vistorias.json");
        const refAntes = sha(readFileSync(referencia));
        const gtV = readJson<FlowGroundTruth>(referencia);
        const cenasV = cenasDoPlano(gtV);
        assert.ok(cenasV.length > 1 && cenasV.every(c => c.segmento), "a Vistorias navega: cenas por segmento");
        const estado = (passos: string) => ({ viewport: { width: 1280, height: 900 }, steps: [passos] });
        const cenaModal = cenasV.find(c => c.segmento!.estado === "modal")!.id;
        const cenaInicial = cenasV[0].id;
        // NAT-34: alvos REAIS do axe na cena inicial (medidos no site do govbr-telas), um nó dentro de shadow
        // root por regra. Na forma da linha de base 2.2.0 (`host >>> interno`, alvoDoAxe) e na da 2.1.0
        // (target.flat().join(" ")), que não resolve nada e deixa o nó sem unidade candidata.
        const olhoHost = 'tr:nth-child(1) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon="eye"][type="secondary"]';
        const olhoInterno = '.secondary.middle[aria-label=""]';
        const dataHost = "br-input:nth-child(2)", dataInterno = "#br-input-8";
        assert.equal(alvoDoAxe([[olhoHost, olhoInterno]]), `${olhoHost} >>> ${olhoInterno}`);
        assert.equal(alvoDoAxe(["#a", "#b"]), "#a #b", "salto de iframe sem shadow: igual à 2.1.0");
        const axeInicial = [
          { rule: "button-name", target: alvoDoAxe([[olhoHost, olhoInterno]]) },
          { rule: "label", target: alvoDoAxe([[dataHost, dataInterno]]) },
          { rule: "button-name", target: [[olhoHost, olhoInterno]].flat().join(" ") },
        ];
        const f = fixture({ telaReal: { site: telas, referencia,
          achados: {
            sem: [{ selector: "pnip-propesc-vistorias table input[type=checkbox]", rule: null, observed: "Caixa de seleção sem nome (sintético).",
              expected: "Nome acessível (sintético).", state: estado("lista inicial"), evidence: [] }],
            com: [{ selector: "pnip-propesc-vistorias table input[type=checkbox]", rule: null, observed: "Caixa de seleção sem nome (sintético).",
              expected: "Nome acessível (sintético).", state: estado("lista inicial"), evidence: [] },
            { selector: "pnip-propesc-trocar-embarcacao .br-modal", rule: null, observed: "O foco sai do diálogo aberto (sintético).",
              expected: "Foco preso no diálogo (sintético).", state: estado("setup até o modal de troca de embarcação"), evidence: [] }],
          },
          axePorCena: { [cenaModal]: [{ rule: "aria-dialog-name", target: "pnip-propesc-trocar-embarcacao .br-modal" }], [cenaInicial]: axeInicial } } });
        const r = await analisar(opcoes(f));
        assert.equal(r.estado, "pronta", r.motivo ?? "");
        assert.equal(sha(readFileSync(referencia)), refAntes, "a referência congelada não foi tocada");
        const pkg = readJson<SemanticPackage>(join(r.saida, "revisao", "package.json"));
        assert.deepEqual(pkg.scenes.map(s => s.id), cenasV.map(c => c.id), "uma cena por segmento, na ordem do plano");
        assert.deepEqual(pkg.scenes.map(s => s.segmento?.estado), cenasV.map(c => c.segmento!.estado));
        assert.equal(pkg.units.length, 102, "102 unidades da 1.0.0");
        const capture = readJson<{ scenes: { id: string; segmento?: unknown; entradaDireta?: unknown }[] }>(join(r.saida, "revisao", "capture.json"));
        assert.ok(capture.scenes.every(s => s.segmento && "entradaDireta" in s));
        assert.equal(readdirSync(join(r.saida, "revisao")).filter(x => /^scene-\d+\.html$/.test(x)).length, cenasV.length);
        assert.ok(pkg.runs.some(x => x.id === "linha-de-base/axe"), "linha de base por segmento entra no pacote");
        const specDe = (id: string) => pkg.units.find(u => u.id === id)!.specId;
        const cartaoAxe = (sel: string) => pkg.cards.find(c => c.origin === "linha-de-base" && c.selector === sel && c.scene === cenaInicial);
        for (const [alvo, spec] of [[axeInicial[0].target, "B-07"], [axeInicial[1].target, "B-05"]] as const) {
          const c = cartaoAxe(alvo);
          assert.ok(c, `cartão do axe para ${alvo}`);
          assert.ok(c!.subjects.every(x => x.key !== null), `${alvo} resolve`);
          assert.ok(c!.candidateUnitIds.map(specDe).includes(spec), `${alvo} oferece ${spec} (NAT-34): ${c!.candidateUnitIds.join(", ")}`);
        }
        const achatado = cartaoAxe(axeInicial[2].target);
        assert.ok(achatado, "cartão do alvo achatado (2.1.0)");
        assert.ok(achatado!.subjects.every(x => x.key === null) && achatado!.candidateUnitIds.length === 0,
          "forma 2.1.0 (achatada) não resolve e não tem candidata — o defeito que o NAT-34 corrige");
        const s = readJson<Resumo>(join(r.saida, "summary.json"));
        assert.equal(s.revisaoSemantica!.cartoes, pkg.cards.length);
        assert.equal(execDe(s, "sem").pontuacao.metricas.referenceUnits, 102);
        // NAT-67: duas preparações seguidas da tela que navega (Angular + web components, relógio do mock)
        // dão o mesmo sceneHash e os mesmos cartões — nada sorteado ou datado escapa da normalização.
        const r2 = await analisar(opcoes(f));
        assert.equal(r2.estado, "pronta", r2.motivo ?? "");
        const cap = (saida: string) => readJson<{ sceneHash: string; relogio: { instante: string; fuso: string } }>(join(saida, "revisao", "capture.json"));
        assert.equal(cap(r2.saida).sceneHash, cap(r.saida).sceneHash, "segunda preparação da Vistorias com outro sceneHash");
        assert.deepEqual(readJson<SemanticPackage>(join(r2.saida, "revisao", "package.json")).cards.map(c => c.id), pkg.cards.map(c => c.id));
        assert.deepEqual(cap(r.saida).relogio, { ...cap(r.saida).relogio, instante: readJson<{ createdAt: string }>(f.snapshots).createdAt, fuso: "America/Sao_Paulo" });
        console.log(`   Vistorias: ${pkg.scenes.length} cenas (${pkg.scenes.map(x => x.id).join(", ")}), ${pkg.units.length} unidades, ${pkg.cards.length} cartões; sceneHash ${cap(r.saida).sceneHash.slice(0, 12)} nas duas preparações`);
      });
    }

    // ── NAT-61: trio sem/ferramentas/com (campanha v2, run.v2) ───────────────
    const fxt = fixture({ trio: true });
    let trio1!: string;
    await test("trio (NAT-61): um pacote de revisão para os três braços, bindings v2, três comparações com o seu n (principal ferramentas × com)", async () => {
      const r = await analisar(opcoes(fxt, { ferramentas: fxt.ferramentas }));
      trio1 = r.saida;
      assert.equal(r.estado, "pronta", r.motivo ?? "");
      for (const arm of ["sem", "ferramentas", "com"]) {
        const b = binding(r.saida, arm);
        assert.equal((b as { contract: string }).contract, "analysis-binding.v2");
        assert.ok(validateContract(b).valid, JSON.stringify(validateContract(b).errors));
      }
      const pkg = readJson<SemanticPackage>(join(r.saida, "revisao", "package.json"));
      assert.deepEqual(pkg.runs.filter(x => x.kind === "agente").map(x => x.id).sort(),
        ["fixture-analise-run-com-01", "fixture-analise-run-ferramentas-01", "fixture-analise-run-sem-01"]);
      const cs = r.resumo.comparacoes!;
      assert.deepEqual(cs.map(c => [c.id, c.bracos.join("×"), c.papel]), [["ferramentas-com", "ferramentas×com", "primary"],
        ["sem-ferramentas", "sem×ferramentas", "secondary"], ["sem-com", "sem×com", "secondary"]]);
      assert.ok(cs.every(c => c.disponivel && c.n === 1 && c.estado === "provisoria"));
      // a comparação sem × com do par continua no campo de sempre (mesma forma)
      assert.equal(r.resumo.comparacao!.disponivel, true);
      // vazamento com × ferramentas: o com cita get_ds_rules e um id da base (FINDINGS_TRIO)
      assert.equal(r.resumo.revisaoSemantica!.vazamentosComFerramentas, 1);
      const md = readFileSync(join(r.saida, "summary.md"), "utf8");
      assert.ok(md.includes("## Comparações do grupo (NAT-61)"));
      assert.ok(md.includes("oráculo sem conhecimento (ferramentas)"));
      assert.ok(md.includes("Oráculo: ferramentas efetivas (tools/list)"));
    });

    await test("trio com decisões: cada comparação final com a sua diferença", async () => {
      const decisoes = decidir(trio1, {
        "fixture-analise-run-sem-01": { "#fx-campo": "gabarito", ".fx-aviso": "incorreta" },
        "fixture-analise-run-ferramentas-01": { "#fx-campo": "gabarito" },
        "fixture-analise-run-com-01": { "#fx-campo": "gabarito", "#fx-botao": "gabarito", "#fx-titulo": "novo" },
      });
      const r = await analisar(opcoes(fxt, { ferramentas: fxt.ferramentas, decisoes, anterior: trio1 }));
      const cs = new Map(r.resumo.comparacoes!.map(c => [c.id, c]));
      assert.equal(cs.get("ferramentas-com")!.estado, "final");
      assert.equal(cs.get("ferramentas-com")!.diferencaUnidadesConfirmadas, 1);
      assert.deepEqual(cs.get("ferramentas-com")!.unidades!.soTratamento.map(u => u.specId), ["FX-02"]);
      assert.equal(cs.get("sem-ferramentas")!.diferencaUnidadesConfirmadas, 0);
      assert.equal(cs.get("sem-com")!.diferencaUnidadesConfirmadas, 1);
      assert.equal(r.resumo.comparacao!.diferencaUnidadesConfirmadas, 1, "o campo de sempre segue sendo sem × com");
    });

    await test("trio incompleto (falta o sem): só ferramentas × com é calculada; as outras dizem que o braço falta, n = 0", async () => {
      const r = await analisar({ ...opcoes(fxt, { ferramentas: fxt.ferramentas }), sem: undefined });
      assert.equal(r.estado, "pronta", r.motivo ?? "");
      assert.equal(r.resumo.comparacao, null, "sem o sem, não há a comparação do par");
      const cs = new Map(r.resumo.comparacoes!.map(c => [c.id, c]));
      assert.equal(cs.get("ferramentas-com")!.disponivel, true);
      assert.equal(cs.get("ferramentas-com")!.n, 1);
      for (const id of ["sem-ferramentas", "sem-com"]) {
        assert.equal(cs.get(id)!.disponivel, false);
        assert.equal(cs.get(id)!.n, 0);
        assert.match(cs.get(id)!.motivo!, /grupo incompleto: falta o braço sem/);
      }
    });

    await test("trio: o pacote do braço ferramentas não serve como --com (braço conferido pelo run.json)", async () => {
      const r = await analisar({ ...opcoes(fxt), com: fxt.ferramentas });
      assert.equal(r.estado, "recusada");
      assert.match(r.motivo!, /--com é do braço ferramentas/);
    });

    await test("par v1 inalterado: sem comparacoes nem vazamentosComFerramentas no resumo", () => {
      const s = readJson<Resumo>(join(primeira, "summary.json"));
      assert.equal("comparacoes" in s, false);
      assert.equal("vazamentosComFerramentas" in s.revisaoSemantica!, false);
      assert.equal(binding(primeira, "sem").contract, "analysis-binding.v1");
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
