/**
 * NAT-63 (T7.0) — revisão pré-T7, R1 e R2. Base: thesis-workspace/planejamento/atual/
 * evidencias-revisao-pre-t7-2026-10-03/reproduzir.mts, agora como testes.
 *
 *   npm run test:identidade
 *
 * R1 — identidade × campanha congelada:
 *   - preflight (`problemasDaCampanha`, job `preparar`, antes de qualquer modelo): esforço, tempo
 *     limite, cliente, protocolo, tentativa e repetição, cada um isolado; controle negativo (modelo);
 *     o caminho real de `buildIsolatedManifest` recusa e não grava nada;
 *   - entrada da análise: os dois braços divergindo IGUALMENTE da campanha → recusada.
 * R2 — inelegível nunca vira final: submissão aceita com técnico failed (harness-error depois do
 *   envio), com isolamento unverified e com tempo esgotado depois do envio → comparação indisponível
 *   com o motivo, mesmo com a revisão fechada; painel/RESULTADOS dizem "não conta".
 * Piloto: os quatro run.json e manifestos arquivados de piloto-01 batem com a campanha (só leitura do
 *   govbr-resultados irmão; pulado se ele não existir).
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateContract, type Campaign, type Run } from "../contracts/index";
import { ROOT } from "./adjudication";
import { analisar, motivosDeInelegibilidade, renderResumo, type Resumo } from "./analisar-execucao";
import { construirFixture } from "./fixtures/analise/construir";
import { divergenciasDaCampanha, identidadeDoRun } from "./identidade-campanha";
import {
  buildIsolatedManifest, documentoDaCampanha, ISOLATED_MANIFEST_VERSION, isolatedManifestProblems, problemasDaCampanha, readIsolatedManifest,
  type BuildOptions, type IsolatedCollectionManifest,
} from "./manifesto-coleta-isolada";
import { placarDaCampanha, resultadoDaRevisao, type InfoCampanha, type Revisao, type VistaParResumo } from "./painel/modelo";
import { DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR } from "../runner/lib";

const lerJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const gravar = (p: string, v: unknown) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const clone = <T>(v: T): T => structuredClone(v);
const work = mkdtempSync(join(tmpdir(), "teste-identidade-"));

let ok = 0, falhas = 0, pulados = 0;
async function teste(nome: string, f: () => void | Promise<void>): Promise<void> {
  const t0 = Date.now();
  try { await f(); ok++; console.log(`ok   ${nome} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); } catch (e) {
    falhas++; console.log(`FAIL ${nome}\n     ${(e instanceof Error ? e.stack ?? e.message : String(e)).split("\n").slice(0, 6).join("\n     ")}`);
  }
}

// ───────────────────────────────────────────────────────────────── piloto (arquivo real, só leitura)

const RESULTADOS = join(ROOT, "..", "govbr-resultados");
const CAMPANHA_PILOTO = lerJson<Campaign>(join(ROOT, "campanhas", "piloto-01", "campaign.json"));
const temPiloto = existsSync(join(RESULTADOS, "coletas", "piloto-01"));
const manifestosPiloto = temPiloto ? readdirSync(join(RESULTADOS, "coletas", "piloto-01")).map(d => join(RESULTADOS, "coletas", "piloto-01", d, "manifesto-coleta.json")) : [];
const runsPiloto = temPiloto ? readdirSync(join(RESULTADOS, "execucoes", "piloto-01")).map(d => join(RESULTADOS, "execucoes", "piloto-01", d, "pacote", "run.json")) : [];

if (temPiloto) {
  await teste("piloto-01 continua válido: 4 manifestos e 4 run.json arquivados batem com a campanha congelada (só leitura)", () => {
    assert.equal(manifestosPiloto.length, 4);
    assert.equal(runsPiloto.length, 4);
    for (const p of manifestosPiloto) {
      const { manifest } = readIsolatedManifest(p); // inclui problemasDaCampanha com a campanha que o próprio manifesto carrega
      assert.equal(manifest.manifestVersion, "manifesto-coleta-isolada-1.1.0");
      assert.equal(manifest.campaign!.sha256, sha(documentoDaCampanha(CAMPANHA_PILOTO)), "a campanha commitada é a do manifesto");
      assert.deepEqual(problemasDaCampanha(CAMPANHA_PILOTO, manifest), [], p);
    }
    for (const p of runsPiloto) {
      const run = lerJson<Run>(p);
      assert.deepEqual(divergenciasDaCampanha(CAMPANHA_PILOTO, identidadeDoRun(run)), [], run.runId);
      assert.deepEqual(motivosDeInelegibilidade(run, CAMPANHA_PILOTO), [], `${run.runId} elegível`);
    }
  });

  await teste("R1 preflight: cada diferença isolada sobre o manifesto do piloto é recusada; controle negativo (modelo) também; o original passa", () => {
    const base = readIsolatedManifest(manifestosPiloto.find(p => lerJson<IsolatedCollectionManifest>(p).dispatch.slotId === "p01-sem")!).manifest;
    const run = lerJson<Run>(runsPiloto.find(p => p.includes("solicitacao-sem-d049"))!);
    // como um manifesto 1.2.0 gravaria a execução efetiva deste disparo (protocolo = o registrado pelo runner)
    const v12 = (m: IsolatedCollectionManifest, protocolo = run.versions.protocolSha256): IsolatedCollectionManifest => ({ ...m, manifestVersion: ISOLATED_MANIFEST_VERSION,
      execution: { effort: m.dispatch.effort!, timeoutSeconds: m.dispatch.limitMinutes * 60, client: { name: "claude-code", version: (m.imagesLock.versions as { claudeCode: string }).claudeCode }, protocolSha256: protocolo } });
    assert.deepEqual(problemasDaCampanha(CAMPANHA_PILOTO, base), []);
    assert.deepEqual(problemasDaCampanha(CAMPANHA_PILOTO, v12(base)), [], "1.2.0 com o protocolo do piloto passa");
    const casos: [string, (m: IsolatedCollectionManifest) => IsolatedCollectionManifest, RegExp][] = [
      ["esforço high→low", m => { m.dispatch.effort = "low"; return m; }, /esforço low ≠ high/],
      ["tempo limite 90→1 min", m => { m.dispatch.limitMinutes = 1; return m; }, /tempo limite 60s ≠ 5400s/],
      ["tentativa 99", m => { m.dispatch.attempt = 99; return m; }, /tentativa 99 fora da política da campanha \(1–2/],
      ["repetição 99", m => { m.dispatch.repetition = 99; return m; }, /repetição 99 fora do desenho da campanha \(1–2\)/],
      ["cliente divergente (lock)", m => { (m.imagesLock.versions as { claudeCode: string }).claudeCode = "9.9.9 (Claude Code)"; return m; }, /cliente claude-code 9\.9\.9/],
      ["protocolo divergente (1.2.0)", m => v12(m, "f".repeat(64)), /protocolo ffffffffffff ≠ 61d94cc16de2/],
      ["controle negativo: outro modelo", m => { m.dispatch.model = "outro-modelo"; return m; }, /não traz o modelo outro-modelo/],
    ];
    for (const [nome, muda, esperado] of casos) {
      const p = problemasDaCampanha(CAMPANHA_PILOTO, muda(clone(base)));
      assert.ok(p.length > 0, `${nome}: aceito`);
      assert.match(p.join("; "), esperado, nome);
    }
    // e na releitura do manifesto (verify / linha de base / arquivar): a mesma recusa
    const m = clone(base); m.dispatch.effort = "low";
    assert.match(isolatedManifestProblems(m).join("; "), /esforço low ≠ high/);
  });
} else {
  pulados++;
  console.log(`skip piloto-01: ${RESULTADOS} não existe (o arquivo real é irmão do govbr-eval)`);
}

// ───────────────────────────────────────────────────────────────── R1: caminho real do preparar

await teste("R1 preflight no caminho do preparar (buildIsolatedManifest): divergência isolada recusa ANTES de gravar; a idêntica passa", () => {
  const opcoes: BuildOptions = { tela: "solicitacao", telasDir: DEFAULT_TELAS_DIR, validatorDir: DEFAULT_VALIDATOR_DIR, campanha: "nat63-teste", slot: "slot-01",
    par: "par-01", braco: "sem", modo: "duble", modelo: null, esforco: "high", limiteMin: 5, tentativa: 1, repeticao: 1 };
  const gerado = buildIsolatedManifest(opcoes);
  assert.equal(gerado.manifestVersion, ISOLATED_MANIFEST_VERSION);
  assert.equal(gerado.execution!.timeoutSeconds, 300);
  assert.equal(gerado.execution!.effort, "high");
  assert.equal(gerado.execution!.client.name, "claude-code");
  assert.match(gerado.execution!.protocolSha256, /^[a-f0-9]{64}$/);
  // a campanha "commitada" do teste = a gerada para o disparo, com tetos de 2 (tentativa e repetição)
  const campanha = clone(gerado.campaign!.document) as Campaign;
  campanha.design.repetitions = 2;
  campanha.retryPolicy.maxAttemptsPerSlot = 2;
  const arq = join(work, "campanha-preflight.json");
  gravar(arq, campanha);
  const ok1 = buildIsolatedManifest({ ...opcoes, campanhaPath: arq });
  assert.equal(ok1.campaign!.origin, "commitada");
  assert.deepEqual(isolatedManifestProblems(ok1), []);
  assert.doesNotThrow(() => buildIsolatedManifest({ ...opcoes, tentativa: 2, repeticao: 2, campanhaPath: arq }), "dentro dos tetos passa");
  const recusa = (o: Partial<BuildOptions>, esperado: RegExp, c: Campaign = campanha) => {
    const p = join(work, `campanha-${sha(JSON.stringify([o, c])).slice(0, 8)}.json`);
    gravar(p, c);
    assert.throws(() => buildIsolatedManifest({ ...opcoes, ...o, campanhaPath: p }), (e: Error) => /campanha não serve a este disparo; nada foi gravado/.test(e.message) && esperado.test(e.message));
  };
  recusa({ esforco: "low" }, /esforço low ≠ high/);
  recusa({ limiteMin: 1 }, /tempo limite 60s ≠ 300s/);
  recusa({ tentativa: 99 }, /tentativa 99 fora da política/);
  recusa({ repeticao: 99 }, /repetição 99 fora do desenho/);
  recusa({}, /cliente claude-code .* ≠ claude-code 0\.0\.0-outro/, { ...campanha, fixed: { ...campanha.fixed, client: { name: "claude-code", version: "0.0.0-outro" } } });
  recusa({}, /protocolo .* ≠ ffffffffffff/, { ...campanha, fixed: { ...campanha.fixed, protocolSha256: "f".repeat(64) } });
  recusa({}, /turnos\/orçamento null\/null ≠ 50\/null/, { ...campanha, limits: { ...campanha.limits, maxTurns: 50 } });
  recusa({ modelo: "outro-modelo" }, /não traz o modelo outro-modelo/);
});

// ───────────────────────────────────────────────────────────────── análise (fixture T6)

type Fixture = ReturnType<typeof construirFixture>;
const saidas = new Map<string, number>();
function nova(nome: string): Fixture {
  const n = (saidas.get(nome) ?? 0) + 1;
  saidas.set(nome, n);
  return construirFixture(join(work, `${nome}-${n}`));
}
/** Muda o run.json de um braço e refaz os sha256 do artifact-manifest (como um pacote coerente faria). */
function mudarRun(fx: Fixture, arm: "sem" | "com", muda: (run: Run, iso: { result: string; checks: { required: boolean; outcome: string }[] }) => void): Run {
  const dir = fx[arm];
  const run = lerJson<Run>(join(dir, "run.json"));
  const iso = lerJson<{ result: string; checks: { required: boolean; outcome: string }[] }>(join(dir, "isolation.json"));
  muda(run, iso);
  gravar(join(dir, "run.json"), run);
  gravar(join(dir, "isolation.json"), iso);
  const mp = join(dir, "artifact-manifest.json");
  const man = lerJson<{ files: { path: string; bytes: number; sha256: string }[] }>(mp);
  for (const f of man.files) { const b = readFileSync(join(dir, f.path)); f.bytes = b.length; f.sha256 = sha(b); }
  gravar(mp, man);
  const v = validateContract(run);
  assert.ok(v.valid, JSON.stringify(v.errors));
  return run;
}
function mudarCampanha(fx: Fixture, muda: (c: Campaign) => void): void {
  const c = lerJson<Campaign>(fx.campanha);
  muda(c);
  gravar(fx.campanha, c);
}
const entradas = (fx: Fixture) => ({ sem: fx.sem, com: fx.com, campanha: fx.campanha, snapshots: fx.snapshots, referencia: fx.referencia, site: fx.site, linhaDeBase: fx.linhaDeBase });
/** Análise + revisão sintética fechada (veredito fixo de TESTE, nunca adjudicação): a revisão nº 2. */
async function analisarEFechar(fx: Fixture, nome: string): Promise<{ antes: Resumo; depois: Resumo }> {
  const r1 = await analisar({ ...entradas(fx), saida: join(work, `${nome}-analise`) });
  assert.equal(r1.estado, "pronta", r1.motivo ?? "");
  const pkg = lerJson<{ cards: { id: string; subjects: { id: string }[] }[] }>(join(r1.saida, "revisao", "package.json"));
  const reviews = lerJson<Record<string, unknown>>(join(r1.saida, "revisao", "reviews.json"));
  reviews.decisions = pkg.cards.map(c => ({ cardId: c.id, status: "reviewed", complete: true, reviewer: "teste-sintetico",
    rationale: "Veredito sintético fixo, só para testar elegibilidade.", evidenceRefs: ["revisao/scene-0.png"],
    atoms: [{ id: "a1", text: "afirmação sintética", subjects: c.subjects.map(s => s.id), decisao: "incorreta", unitIds: [], citation: "uncertain" }] }));
  const dec = join(work, `${nome}-decisoes.json`);
  gravar(dec, reviews);
  const r2 = await analisar({ ...entradas(fx), decisoes: dec, anterior: r1.saida, saida: join(work, `${nome}-final`) });
  assert.equal(r2.estado, "pronta", r2.motivo ?? "");
  return { antes: r1.resumo, depois: r2.resumo };
}

await teste("controle: par elegível e idêntico à campanha → pronta e, com a revisão fechada, comparação FINAL", async () => {
  const { antes, depois } = await analisarEFechar(nova("controle"), "controle");
  assert.equal(antes.comparacao!.estado, "provisoria");
  assert.equal(antes.comparacao!.elegivel, true);
  assert.equal(depois.comparacao!.estado, "final");
  assert.ok(depois.execucoes.every(e => e.elegibilidade!.elegivel));
});

await teste("R1 análise: os DOIS braços divergindo igualmente da campanha → recusada (esforço, tempo, cliente, protocolo, tentativa, repetição, limites); modelo também", async () => {
  const casos: [string, (fx: Fixture) => void, RegExp][] = [
    ["esforço", fx => mudarCampanha(fx, c => { c.design.effort = "low"; }), /esforço medium ≠ low/],
    ["tempo limite", fx => mudarCampanha(fx, c => { c.limits.timeoutSeconds = 60; }), /tempo limite 1800s ≠ 60s/],
    ["limites de turnos", fx => mudarCampanha(fx, c => { c.limits.maxTurns = 10; }), /turnos\/orçamento null\/null ≠ 10\/null/],
    ["cliente", fx => mudarCampanha(fx, c => { c.fixed.client.version = "9.9.9"; }), /cliente cliente-fixture 0\.0\.0 ≠ cliente-fixture 9\.9\.9/],
    ["protocolo", fx => mudarCampanha(fx, c => { c.fixed.protocolSha256 = "f".repeat(64); }), /protocolo cccccccccccc ≠ ffffffffffff/],
    ["tentativa 99", fx => { for (const a of ["sem", "com"] as const) mudarRun(fx, a, r => { r.attempt = 99; }); }, /tentativa 99 fora da política da campanha/],
    ["repetição 99", fx => { for (const a of ["sem", "com"] as const) mudarRun(fx, a, r => { r.repetition = 99; }); }, /repetição 99 fora do desenho da campanha/],
    ["controle negativo: modelo", fx => mudarCampanha(fx, c => { c.design.models = [{ family: "x", requested: "outro-modelo" }]; }), /modelo modelo-fixture fora do desenho/],
  ];
  for (const [nome, muda, esperado] of casos) {
    const fx = nova(`r1-${nome.replace(/\W+/g, "-")}`);
    muda(fx);
    const r = await analisar({ ...entradas(fx), saida: join(work, `r1-${nome.replace(/\W+/g, "-")}-analise`) });
    assert.equal(r.estado, "recusada", `${nome}: ${r.estado}`);
    assert.match(r.motivo ?? "", esperado, nome);
    assert.equal(r.resumo.comparacao, null, `${nome}: nenhuma comparação`);
  }
});

const CENARIOS_R2: [string, (run: Run, iso: { result: string; checks: { required: boolean; outcome: string }[] }) => void, RegExp][] = [
  ["envio aceito e depois harness-error (técnico failed)", run => {
    run.status.technical = "failed"; run.lifecycle = { state: "failed", stage: "running" };
    run.failure = { stage: "running", reason: "harness-error", detail: "relatório aceito, mas o agente saiu com código 1" };
  }, /status técnico failed \(running · harness-error\)/],
  ["envio aceito e isolamento unverified", (run, iso) => {
    run.status.isolation = "unverified"; iso.result = "unverified";
    const exigido = iso.checks.find(c => c.required); if (exigido) exigido.outcome = "not-exercised";
  }, /isolamento unverified, não comprovado/],
  ["envio aceito e depois tempo esgotado (técnico interrupted)", run => {
    run.status.technical = "interrupted"; run.lifecycle = { state: "interrupted", stage: "running" };
    run.failure = { stage: "running", reason: "timeout", detail: "limite de 1800s atingido" };
  }, /status técnico interrupted \(running · timeout\)/],
];

for (const [nome, muda, esperado] of CENARIOS_R2) {
  await teste(`R2: ${nome} → pontuação só diagnóstica; comparação indisponível com o motivo, nunca final (nem com a revisão fechada)`, async () => {
    const fx = nova(`r2-${nome.replace(/\W+/g, "-")}`);
    mudarRun(fx, "sem", muda);
    const { antes, depois } = await analisarEFechar(fx, `r2-${nome.replace(/\W+/g, "-").slice(0, 30)}`);
    for (const r of [antes, depois]) {
      const c = r.comparacao!;
      assert.equal(c.disponivel, false);
      assert.equal(c.estado, null);
      assert.equal(c.elegivel, false);
      assert.match(c.motivo ?? "", /par inelegível para a comparação principal/);
      assert.match(c.motivo ?? "", esperado);
      const sem = r.execucoes.find(e => e.braco === "sem")!;
      assert.equal(sem.elegibilidade!.elegivel, false);
      assert.match(sem.elegibilidade!.motivos.join("; "), esperado);
      assert.notEqual(sem.pontuacao.estado, "not-prepared", "a pontuação diagnóstica continua calculada");
      assert.ok(r.analise.avisos.some(a => /fora da comparação principal — pontuação só diagnóstica/.test(a)));
    }
    assert.equal(depois.execucoes.find(e => e.braco === "sem")!.pontuacao.estado, "final", "a revisão do braço fechou (diagnóstico)");
    const md = renderResumo(depois);
    assert.match(md, /\*\*sem não conta para a comparação principal\*\*/);
    assert.match(md, /\| Entra na comparação principal \| não \(só diagnóstico\) \| sim \|/);
    assert.doesNotMatch(md, /Estado: final/);
    // painel e RESULTADOS.md: o selo do par diz que não conta; não entra nos finais nem na soma
    const rv = { numero: 2, nome: "rev-002", dir: "x", rel: "analises/x/par-01/revisoes/rev-002", resumo: depois, bindings: {} } as Revisao;
    const resultado = resultadoDaRevisao(rv)!;
    assert.equal(resultado.elegivel, false);
    const info: InfoCampanha = { id: "c", titulo: null, tipo: "pilot", bracos: ["sem", "com"], natureza: "formal", rotulo: "c", explicacao: "" };
    const parResumo = { campanha: "c", par: "par-01", tela: "t", modelo: null, dataUtc: "", bracos: ["sem", "com"], faltando: [], porDesenho: false,
      execucoes: [], analise: "a", selo: { estado: "nao-se-aplica", texto: "" }, avisos: [], resultado } as unknown as VistaParResumo;
    const placar = placarDaCampanha(info, [parResumo]);
    assert.equal(placar.linhas[0].selo, "indisponivel");
    assert.match(placar.linhas[0].seloTexto, /NÃO CONTA — par inelegível/);
    assert.equal(placar.finais, 0);
    assert.equal(placar.somaSem, null);
  });
}

console.log(`\n${ok}/${ok + falhas} testes de identidade/elegibilidade ok${pulados ? ` (${pulados} bloco pulado)` : ""} — saídas em ${work}`);
if (falhas) process.exit(1);
