/**
 * Manifesto de análise, sem navegador e sem modelo: duas baterias sintéticas numa raiz temporária
 * (fora do repo — nada é escrito em pipeline/logs nem em results/), a primeira interrompida como a
 * de 2026-10-02T03-39-50 (slot 5 com 429, slot 6 não tentado) e a segunda o complemento de um slot
 * por braço. O caminho composto de ponta a ponta, com `prepare` e navegador, está em test:fatia6.
 *
 * Uso: npm run test:analise
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "./adjudication";
import { COLLECTION_MANIFEST_VERSION, COLLECTION_PLAN_VERSION, manifestProblems, sha256, type CollectionManifest } from "./collection-manifest";
import { buildAnalysisManifest, readAnalysisManifest, type BuildAnalysisOptions } from "./analysis-manifest";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";
import { telaOf } from "./telas";

const root = mkdtempSync(join(tmpdir(), "teste-analise-"));
const tela = telaOf("vistorias");
const H = (c: string): string => c.repeat(64);
const writeJson = (path: string, value: unknown): string => {
  mkdirSync(join(path, ".."), { recursive: true });
  const text = JSON.stringify(value, null, 2) + "\n";
  writeFileSync(path, text);
  return sha256(text);
};

let tests = 0;
function test(name: string, fn: () => void): void {
  fn();
  tests++;
  console.log(`ok ${name}`);
}
function refuses(fn: () => unknown, pattern: RegExp): void {
  assert.throws(fn, (e: unknown) => {
    assert.match((e as Error).message, pattern);
    return true;
  });
}

// ── site congelado mínimo: o que loadSite lê ─────────────────────────────────
const siteDir = join(root, "superficie");
mkdirSync(join(siteDir, "site"), { recursive: true });
const html = "<!doctype html><title>fixture</title>";
writeFileSync(join(siteDir, "site", "index.html"), html);
const siteManifestText = JSON.stringify({ version: "fixture", files: { "/index.html": sha256(html) } });
writeFileSync(join(siteDir, "site-manifest.json"), siteManifestText);
const siteSha = sha256(siteManifestText);

const identity = { collection: FLOW_INSTRUMENT_VERSION, referenceSha256: H("1"), siteManifestSha256: siteSha,
  oracleDistSha256: H("2"), oracleDataSha256: H("3"), statePlanSha256: H("4") };

type Slot = { slot: number; arm: string; repetition: number; block: number };
function coleta(nome: string, slots: Slot[], over: { clientVersion?: string; identity?: Partial<typeof identity> } = {}): { path: string; sha: string } {
  const plan = { planVersion: COLLECTION_PLAN_VERSION, stamp: nome, schedule: "alternado", seed: null, attemptBudget: slots.length,
    retryPolicy: "nenhuma", failurePolicy: "fixture", arms: ["com", "sem"], runsPerArm: slots.length / 2, model: "claude-opus-5",
    reasoningEffort: "high", oracleProfile: "combined", provider: "claude", scope: "full", suite: "vistorias", slots };
  const repo = { commit: "abc", dirty: false, lockSha256: H("5") };
  const m = {
    manifestVersion: COLLECTION_MANIFEST_VERSION, generatedAt: "2026-10-02T00:00:00Z", collection: { version: FLOW_INSTRUMENT_VERSION },
    identity: { ...identity, ...over.identity },
    reference: { version: "1.0.0", sha256: H("1"), file: "ground-truth-vistorias.json", units: 1, specs: 1 },
    statePlan: null,
    oracle: { version: "2.7.0", distSha256: H("2"), distFiles: 1, sourceSha256: H("6"), dataSha256: H("3"), knowledgeSha256: H("7"),
      dataFiles: { "tokens.json": H("8") }, builtInPreflight: true },
    site: { manifestSha256: over.identity?.siteManifestSha256 ?? siteSha, corpusCommit: "abc", corpusDirty: false },
    surface: { fixture: nome }, surfaceSha256: sha256(nome), plan, planSha256: H("9"),
    analysisAtCollection: { scoringVersion: "x", acceptancePolicy: "x", scorerSha256: H("a"), checkerAliasesSha256: H("b"), kbAliasesSha256: H("c") },
    repos: { "govbr-eval": repo, "govbr-ds-validator": repo, "govbr-corpus": repo },
    runtime: { node: "v25.2.1", platform: "win32 x64", client: { name: "claude-cli", version: over.clientVersion ?? "2.1.287 (Claude Code)" },
      playwright: { eval: "1.61.1", validator: "1.61.1", mcp: "0.0.1" }, browsers: { eval: "140", validator: "140" }, notMeasured: [] },
    archive: null,
  } as unknown as CollectionManifest;
  assert.deepEqual(manifestProblems(m), [], "fixture de manifesto de coleta completa");
  const path = join(root, "pipeline", "logs", `${nome}-coleta`, "manifesto.json");
  return { path, sha: writeJson(path, m) };
}

type Entry = Record<string, unknown> & { slot: number; arm: string };
function entrada(nome: string, slot: Slot, coletaSha: string, over: Record<string, unknown> = {}): Entry {
  const runId = `${nome}-${slot.arm}-run${slot.repetition}`;
  const archiveDir = slot.arm === "com" ? tela.runs.com : tela.runs.sem;
  const archive = `agent-${runId}.json`;
  writeJson(join(root, archiveDir, archive), { timestamp: "2026-10-02T00:00:00Z", model: "claude-opus-5", appUrl: "http://127.0.0.1:3100/pnip/x",
    findings: [], config: { instrumentVersion: FLOW_INSTRUMENT_VERSION, protocolVersion: "sha256:p", siteManifestSha256: siteSha,
      collectionManifestSha256: coletaSha } });
  return { run: slot.slot, slot: slot.slot, repetition: slot.repetition, block: slot.block, runId, arm: slot.arm,
    model: "claude-opus-5", reasoningEffort: "high", oracleProfile: slot.arm === "com" ? "combined" : "none",
    client: "claude-cli", clientVersion: "2.1.287 (Claude Code)", protocolVersion: "sha256:p", instrumentVersion: FLOW_INSTRUMENT_VERSION,
    prompt: "Avalie a tela.", scope: "full", archive, suite: "vistorias", archiveDir, exitCode: 0, apiErrorStatus: null,
    evidence: null, collectionStatus: "collected", collectionManifestSha256: coletaSha, ...over };
}
function bateria(nome: string, c: { path: string; sha: string }, execucoes: Entry[], extra: Record<string, unknown> = {}): string {
  const rel = `pipeline/logs/${nome}-bateria.json`;
  writeJson(join(root, rel), { stamp: nome, collectionManifest: { path: relative(root, c.path).replaceAll("\\", "/"), sha256: c.sha },
    surface: { dir: "superficie", description: { siteManifestSha256: siteSha } }, execucoes, ...extra });
  return rel;
}
function linhaDeBase(nome: string, coletaSha: string): string {
  const rel = `pipeline/logs/${nome}-linha-de-base.json`;
  writeJson(join(root, rel), { status: "complete", scope: "bateria", provenance: { collectionManifest: { sha256: coletaSha } } });
  return rel;
}

// ── bateria A: interrompida como a real ─────────────────────────────────────
const slotsA: Slot[] = [
  { slot: 1, arm: "com", repetition: 1, block: 1 }, { slot: 2, arm: "sem", repetition: 1, block: 1 },
  { slot: 3, arm: "sem", repetition: 2, block: 2 }, { slot: 4, arm: "com", repetition: 2, block: 2 },
  { slot: 5, arm: "com", repetition: 3, block: 3 }, { slot: 6, arm: "sem", repetition: 3, block: 3 },
];
const cA = coleta("A", slotsA);
const entradasA = [
  ...slotsA.slice(0, 4).map(s => entrada("A", s, cA.sha)),
  entrada("A", slotsA[4], cA.sha, { archive: null, exitCode: 1, apiErrorStatus: 429, collectionStatus: "sem-relatorio" }),
  { run: 6, slot: 6, repetition: 3, block: 3, arm: "sem", suite: "vistorias", scope: "full", archive: null, archiveDir: tela.runs.sem,
    exitCode: null, collectionStatus: "nao-tentada", collectionManifestSha256: cA.sha },
];
const batA = bateria("A", cA, entradasA);
// ── bateria B: o complemento, um slot por braço, outra versão do cliente ────
const slotsB: Slot[] = [{ slot: 1, arm: "com", repetition: 1, block: 1 }, { slot: 2, arm: "sem", repetition: 1, block: 1 }];
const cB = coleta("B", slotsB, { clientVersion: "2.1.300 (Claude Code)" });
const batB = bateria("B", cB, slotsB.map(s => entrada("B", s, cB.sha, { clientVersion: "2.1.300 (Claude Code)" })));
const lbB = linhaDeBase("B", cB.sha);
const lbA = linhaDeBase("A", cA.sha);

const base = (over: Partial<BuildAnalysisOptions> = {}): BuildAnalysisOptions => ({
  root,
  baterias: [{ fonte: "A", path: batA }, { fonte: "B", path: batB }],
  incluir: [{ fonte: "A", slots: [1, 2, 3, 4] }, { fonte: "B", slots: [1, 2] }],
  excluir: [{ fonte: "A", slot: 5, motivo: "429, sem relatório" }, { fonte: "A", slot: 6, motivo: "não tentado depois do 429" }],
  justificativa: "fixture",
  designada: "B",
  baseline: { path: lbB, motivo: "a da bateria designada" },
  ...over,
});

try {
  test("happy path: A slots 1-4 + B slots 1-2 compõem 3 com + 3 sem; o manifesto gravado é relido e conferido", () => {
    const m = buildAnalysisManifest(base());
    assert.deepEqual(m.execucoesPorBraco, { com: 3, sem: 3 });
    assert.equal(m.tela, "vistorias");
    assert.deepEqual(m.incluidos.map(i => `${i.fonte}:${i.slot}`), ["A:1", "A:2", "A:3", "A:4", "B:1", "B:2"]);
    assert.ok(m.incluidos.every(i => i.collectionManifestSha256 === (i.fonte === "A" ? cA.sha : cB.sha)), "cada execução sob o manifesto da SUA bateria");
    assert.deepEqual(m.excluidos.map(e => [e.fonte, e.slot, e.collectionStatus, e.apiErrorStatus, e.elegivel]),
      [["A", 5, "sem-relatorio", 429, false], ["A", 6, "nao-tentada", null, false]]);
    assert.equal(m.designada.collectionManifest.sha256, cB.sha);
    assert.equal(m.designada.siteManifestSha256, siteSha);
    assert.deepEqual(m.dimensoesConferidas.find(d => d.campo === "oracleProfile")!.valores, { com: "combined", sem: "none" });
    const path = join(root, "pipeline", "logs", "analise.json");
    const text = JSON.stringify(m, null, 2) + "\n";
    writeFileSync(path, text);
    const loaded = readAnalysisManifest(path, root);
    assert.equal(loaded.sha256, sha256(text));
    assert.equal(loaded.runs.length, 6);
    assert.equal(new Set(loaded.runs.map(r => r.id)).size, 6);
    assert.equal(loaded.collectionManifestPath, cB.path);
  });

  test("clientVersion diferente entre baterias não recusa, e fica registrado em divergenciasRegistradas", () => {
    const m = buildAnalysisManifest(base());
    const cv = m.divergenciasRegistradas.find(d => d.campo === "clientVersion");
    assert.ok(cv, "clientVersion registrada");
    assert.deepEqual([...new Set(cv!.valores.map(v => v.valor))].sort(), ["2.1.287 (Claude Code)", "2.1.300 (Claude Code)"]);
    assert.ok(m.divergenciasRegistradas.some(d => d.campo === "runtime.client"), "e a do manifesto de coleta também");
    // A sozinha não diverge de nada.
    const so = buildAnalysisManifest(base({ baterias: [{ fonte: "A", path: batA }], incluir: [{ fonte: "A", slots: [1, 2, 3, 4] }],
      designada: "A", baseline: { path: lbA, motivo: "própria" } }));
    assert.deepEqual(so.divergenciasRegistradas, []);
  });

  test("identidade de coleta diferente recusa", () => {
    const cX = coleta("X", slotsB, { identity: { oracleDistSha256: H("f") } });
    const batX = bateria("X", cX, slotsB.map(s => entrada("X", s, cX.sha)));
    refuses(() => buildAnalysisManifest(base({ baterias: [{ fonte: "A", path: batA }, { fonte: "B", path: batX }] })),
      /Identidades de coleta diferentes.*oracleDistSha256/);
  });

  test("slot sem destino recusa: nada sai da análise em silêncio", () => {
    refuses(() => buildAnalysisManifest(base({ excluir: [{ fonte: "A", slot: 5, motivo: "429" }] })), /A:6 sem destino/);
    refuses(() => buildAnalysisManifest(base({ incluir: [{ fonte: "A", slots: [1, 2, 3, 4] }] })), /B:1, B:2 sem destino/);
  });

  test("slot incluído e excluído, slot inexistente, exclusão sem motivo: recusados", () => {
    refuses(() => buildAnalysisManifest(base({ excluir: [...base().excluir, { fonte: "A", slot: 4, motivo: "x" }] })), /A:4 está incluído e excluído/);
    refuses(() => buildAnalysisManifest(base({ incluir: [{ fonte: "A", slots: [1, 2, 3, 4, 9] }, { fonte: "B", slots: [1, 2] }] })), /A:9 não existe/);
    refuses(() => buildAnalysisManifest(base({ excluir: [{ fonte: "A", slot: 5, motivo: " " }, base().excluir[1]] })), /excluído sem motivo/);
    refuses(() => buildAnalysisManifest(base({ justificativa: "" })), /justificativa/);
  });

  test("slot falho não pode ser incluído; slot válido excluído fica marcado elegivel", () => {
    refuses(() => buildAnalysisManifest(base({ incluir: [{ fonte: "A", slots: [1, 2, 3, 4, 5] }, { fonte: "B", slots: [1, 2] }],
      excluir: [{ fonte: "A", slot: 6, motivo: "x" }] })), /A:5 \(com\) não pode ser incluído: código de saída 1 \(API 429\)/);
    refuses(() => buildAnalysisManifest(base({ incluir: [{ fonte: "A", slots: [1, 2, 3, 4, 6] }, { fonte: "B", slots: [1, 2] }],
      excluir: [{ fonte: "A", slot: 5, motivo: "x" }] })), /A:6 \(sem\) não pode ser incluído: slot não tentado/);
    const m = buildAnalysisManifest(base({ incluir: [{ fonte: "A", slots: [1, 2, 3, 4] }, { fonte: "B", slots: [2] }],
      excluir: [...base().excluir, { fonte: "B", slot: 1, motivo: "fixture: excluída de propósito" }] }));
    assert.equal(m.excluidos.find(e => e.fonte === "B")!.elegivel, true);
  });

  test("dimensão pedida ao agente diferente recusa (modelo; perfil de oráculo dentro do braço)", () => {
    const batM = bateria("M", cB, slotsB.map(s => entrada("M", s, cB.sha, { model: "claude-sonnet-5" })));
    refuses(() => buildAnalysisManifest(base({ baterias: [{ fonte: "A", path: batA }, { fonte: "B", path: batM }] })), /model difere/);
    const batO = bateria("O", cB, slotsB.map(s => entrada("O", s, cB.sha, s.arm === "com" ? { oracleProfile: "tokens" } : {})));
    refuses(() => buildAnalysisManifest(base({ baterias: [{ fonte: "A", path: batA }, { fonte: "B", path: batO }] })), /oracleProfile difere.*braço com/);
    const batN = bateria("N", cB, slotsB.map(s => entrada("N", s, cB.sha, { model: undefined })));
    refuses(() => buildAnalysisManifest(base({ baterias: [{ fonte: "A", path: batA }, { fonte: "B", path: batN }] })), /model ausente/);
  });

  test("execução que nomeia o manifesto de coleta de outra bateria recusa", () => {
    const batT = bateria("T", cB, slotsB.map(s => entrada("T", s, cA.sha, { collectionManifestSha256: cB.sha })));
    refuses(() => buildAnalysisManifest(base({ baterias: [{ fonte: "A", path: batA }, { fonte: "B", path: batT }] })),
      /does not name this collection manifest/);
  });

  test("linha de base de outra coleta que a designada recusa", () => {
    refuses(() => buildAnalysisManifest(base({ baseline: { path: lbA, motivo: "x" } })), /outro manifesto de coleta que o da bateria designada \(B\)/);
  });

  test("manifesto gravado: fonte alterada ou manifesto editado à mão recusam na releitura", () => {
    const m = buildAnalysisManifest(base());
    const editado = join(root, "pipeline", "logs", "analise-editada.json");
    writeJson(editado, { ...m, excluidos: m.excluidos.slice(0, 1) });
    refuses(() => readAnalysisManifest(editado, root), /A:6 sem destino|não confere com as fontes/);
    const reescrito = join(root, "pipeline", "logs", "analise-reescrita.json");
    // Apagar a divergência registrada é esconder o que o manifesto existe para mostrar.
    writeJson(reescrito, { ...m, divergenciasRegistradas: [] });
    refuses(() => readAnalysisManifest(reescrito, root), /não confere com as fontes/);
    const path = join(root, "pipeline", "logs", "analise-2.json");
    writeJson(path, m);
    const archive = join(root, m.incluidos[0].archive.path);
    const original = readFileSync(archive);
    writeFileSync(archive, Buffer.concat([original, Buffer.from("\n")]));
    try {
      refuses(() => readAnalysisManifest(path, root), /a execução A:1 mudou/);
    } finally {
      writeFileSync(archive, original);
    }
    const batPath = join(root, batB);
    const bat = readFileSync(batPath);
    writeFileSync(batPath, Buffer.concat([bat, Buffer.from("\n")]));
    try {
      refuses(() => readAnalysisManifest(path, root), /a bateria B mudou/);
    } finally {
      writeFileSync(batPath, bat);
    }
    readAnalysisManifest(path, root);
  });

  test("prepare recusa --analysis-manifest junto com --battery/--baseline soltos, antes de ler qualquer coisa", () => {
    const r = spawnSync(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), join(ROOT, "scripts", "semantic-flow-cli.ts"),
      "prepare", "--analysis-manifest", "nao-existe.json", "--battery", "x.json", "--baseline", "y.json", "--out", join(root, "nunca")],
      { cwd: ROOT, encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /retire --battery, --baseline/);
  });
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log(`${tests} analysis-manifest tests passed.`);
