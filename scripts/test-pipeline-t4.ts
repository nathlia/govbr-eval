/**
 * T4 — testes do pipeline de uma execução e do arquivo de resultados. Sem modelo, sem GitHub, sem rede.
 *
 *   npm run test:pipeline-t4 [-- --sem-docker] [--manter]
 *
 * Cobre: o workflow (lido do YAML: gatilho só manual, permissões, cada segredo só no job/passo dele,
 * nenhuma interpolação no shell, checkouts por SHA sem credencial persistida, coleta sem gabarito no
 * disco, arquivamento com always()); as entradas do disparo; a conferência das imagens contra o lock;
 * o ambiente dos contêineres; o site-manifest.v1 servido; o manifesto de coleta isolado; a linha de
 * base (registro baseline.v1, identidade e completude); o arquivo (caminho imutável, recusa de
 * sobrescrita, reenvio idempotente, índice, tar.gz + sha256, segredo no pacote, execução sem pacote,
 * entrega do anexo que só avança) e a restauração só pelo arquivo. Com Docker: uma execução do agente
 * roteirizado com tokens-sentinela no ambiente do runner, que não podem chegar a contêiner nem pacote.
 */
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import { validateContract, type Run } from "../contracts/index";
import { avaliar, interpolar, type Workflow } from "./ci/emular-workflow";
import { cartaoSaude, conferirAmbienteDosConteineres, conferirCheckouts, conferirEntradas, conferirImagens, resumoArquivo, situacaoDoPar } from "./pipeline-t4";
import { buildIsolatedManifest, documentoDaCampanha, isolatedManifestProblems, problemasDaCampanha, readIsolatedManifest, type IsolatedCollectionManifest } from "./manifesto-coleta-isolada";
import {
  caminhoCampanha, caminhoSite, conjuntoDeSnapshots, criarTarGz, garantirGitattributes, gravarEntrada, gravarImutavel, lerTarGz, listagemDoCommit, listarArquivos, problemasDoPacote, Recusa,
  registrarLinhaDeBase, restaurar, sha, type EntradaIndice,
} from "./arquivo-resultados";
import { arquivarExecucao, confirmarEvidencias } from "./arquivar-execucao";
import { loadSite, verifyServedSite } from "./measurement-surface";
import { ROOT } from "./adjudication";
import { BASELINE_VERSION, type FlowBaselines } from "./run-baselines-flow";
import { DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR, dockerAvailable } from "../runner/lib";
import { runOnce } from "../runner/run-once";

const args = process.argv.slice(2);
const semDocker = args.includes("--sem-docker");
const manter = args.includes("--manter");
const TMP = mkdtempSync(join(tmpdir(), "govbr-t4-"));
const WORKFLOW = join(ROOT, ".github", "workflows", "execucao-isolada.yml");
const T4SH = join(ROOT, "scripts", "ci", "t4.sh");
const REF_FIXTURE = join(ROOT, "scripts", "fixtures", "analise", "referencia-fixture.json");
const resultados: { nome: string; ok: boolean; detalhe?: string }[] = [];

async function teste(nome: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    resultados.push({ nome, ok: true });
    console.log(`ok   ${nome}`);
  } catch (e) {
    resultados.push({ nome, ok: false, detalhe: (e as Error).message });
    console.log(`FAIL ${nome}\n     ${(e as Error).message.split("\n").join("\n     ")}`);
  }
}

const git = (cwd: string, ...a: string[]): string => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function repoDeArquivo(nome: string): string {
  const dir = join(TMP, nome);
  mkdirSync(dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  writeFileSync(join(dir, "README.md"), "arquivo de teste (T4)\n");
  git(dir, "add", "README.md");
  git(dir, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "inicial");
  return dir;
}

const wf = yaml.load(readFileSync(WORKFLOW, "utf8")) as Workflow;
type Step = Workflow["jobs"][string]["steps"][number];
const todosOsPassos = (): { job: string; step: Step }[] => Object.entries(wf.jobs).flatMap(([job, j]) => j.steps.map((step) => ({ job, step })));
const texto = (v: unknown): string => JSON.stringify(v ?? null);

// ───────────────────────────────────────────────────────────────── workflow (lint programático)

await teste("workflow: só disparo manual — sem push, agenda, pull_request ou matriz", () => {
  assert.deepEqual(Object.keys(wf.on), ["workflow_dispatch"]);
  for (const [id, j] of Object.entries(wf.jobs)) assert.ok(!("strategy" in (j as object)), `job ${id} com matriz`);
  const inputs = (wf.on.workflow_dispatch as { inputs: Record<string, { default?: string }> }).inputs;
  assert.equal(inputs.modo.default, "roteirizado", "o padrão do disparo não pode custar modelo");
  for (const k of ["tela", "braco", "modelo", "esforco", "limite_min", "campanha", "slot", "telas_sha", "validator_sha"]) assert.ok(k in inputs, `entrada ${k}`);
});

await teste("workflow: permissões mínimas, runner fixado, limite de tempo e concorrência 1", () => {
  assert.deepEqual(wf.permissions, {});
  assert.deepEqual(wf.concurrency, { group: "execucao-isolada", "cancel-in-progress": false });
  for (const [id, j] of Object.entries(wf.jobs)) {
    assert.deepEqual(j.permissions, { contents: "read" }, `permissões de ${id}`);
    assert.equal(j["runs-on"], "ubuntu-24.04", `runs-on de ${id}`);
    assert.ok(typeof j["timeout-minutes"] === "number" && j["timeout-minutes"] <= 150, `timeout de ${id}`);
  }
});

await teste("workflow: cada segredo só onde é usado (escrita só em arquivar; provedor só no passo da coleta real)", () => {
  const usos: Record<string, string[]> = {};
  assert.ok(!/secrets\s*:\s*inherit/.test(readFileSync(WORKFLOW, "utf8")));
  assert.ok(!texto((wf as unknown as { env?: unknown }).env).includes("secrets."), "segredo no env do workflow");
  for (const [id, j] of Object.entries(wf.jobs)) {
    assert.ok(!texto((j as unknown as { env?: unknown }).env).includes("secrets."), `segredo no env do job ${id}`);
    for (const [i, s] of j.steps.entries()) {
      for (const m of texto(s).matchAll(/secrets\.([A-Z_]+)/g)) (usos[m[1]] ??= []).push(`${id}#${i}`);
      assert.ok(!(s.run ?? "").includes("${{"), `interpolação no shell em ${id}#${i}`);
    }
  }
  assert.deepEqual(Object.keys(usos).sort(), ["CLAUDE_CODE_OAUTH_TOKEN", "GOVBR_LEITURA_TOKEN", "GOVBR_RESULTADOS_TOKEN"]);
  assert.ok(usos.GOVBR_RESULTADOS_TOKEN.every((u) => u.startsWith("arquivar#")), `escrita fora de arquivar: ${usos.GOVBR_RESULTADOS_TOKEN}`);
  assert.equal(usos.CLAUDE_CODE_OAUTH_TOKEN.length, 1, "credencial do provedor em mais de um passo");
  const [job, idx] = usos.CLAUDE_CODE_OAUTH_TOKEN[0].split("#");
  const passo = wf.jobs[job].steps[Number(idx)];
  assert.equal(job, "coleta");
  assert.equal(passo.if, "inputs.modo == 'real'");
  assert.deepEqual(Object.keys(passo.env ?? {}).filter((k) => texto(passo.env![k]).includes("secrets.")), ["CLAUDE_CODE_OAUTH_TOKEN"]);
  assert.ok(texto(passo.run).includes("t4.sh coleta"));
  for (const u of usos.GOVBR_LEITURA_TOKEN) {
    const [j2, i2] = u.split("#");
    const s = wf.jobs[j2].steps[Number(i2)];
    assert.ok(s.uses?.startsWith("actions/checkout@") && texto(s.with?.token).includes("GOVBR_LEITURA_TOKEN") && !s.env, `leitura fora de checkout: ${u}`);
  }
  // nenhum job além de arquivar toca o govbr-resultados; arquivar não recebe o provedor
  for (const { job: j3, step } of todosOsPassos()) {
    if (texto(step).includes("govbr-resultados")) assert.equal(j3, "arquivar", `govbr-resultados em ${j3}`);
    if (j3 === "arquivar") assert.ok(!texto(step).includes("CLAUDE_CODE_OAUTH_TOKEN"));
  }
});

await teste("workflow: checkouts por SHA, sem credencial persistida; coleta sem gabarito e sem manifesto", () => {
  for (const { job, step } of todosOsPassos().filter((p) => p.step.uses?.startsWith("actions/checkout@"))) {
    assert.equal(String(step.with?.["persist-credentials"]), "false", `${job}: persist-credentials`);
    const ref = String(step.with?.ref ?? "");
    const permitido = ["${{ github.sha }}", "${{ inputs.telas_sha }}", "${{ inputs.validator_sha }}", "${{ needs.preparar.outputs.corpus_sha }}"];
    assert.ok(permitido.includes(ref) || (ref === "main" && step.with?.repository === "nathlia/govbr-resultados"), `${job}: ref ${ref}`);
  }
  const coleta = wf.jobs.coleta.steps;
  const evalCk = coleta.find((s) => s.uses?.startsWith("actions/checkout@") && s.with?.path === "govbr-eval")!;
  assert.equal(String(evalCk.with?.["sparse-checkout-cone-mode"]), "false");
  const pats = String(evalCk.with?.["sparse-checkout"]).split("\n").map((l) => l.trim()).filter(Boolean);
  for (const p of ["!/ground-truth*.json", "!/adjudications.json", "!/results/", "!/reports/", "!/tela-a/", "!/tela-b/"]) assert.ok(pats.includes(p), `coleta sem exclusão ${p}`);
  assert.ok(!coleta.some((s) => s.uses?.startsWith("actions/download-artifact@")), "a coleta não baixa artefato nenhum (o manifesto traz o plano de estados)");
  assert.ok(!coleta.some((s) => ["nathlia/govbr-corpus", "nathlia/govbr-resultados"].includes(String(s.with?.repository))));
  const val = coleta.find((s) => s.with?.repository === "nathlia/govbr-ds-validator")!;
  assert.equal(val.if, "inputs.braco == 'com'", "o braço sem nem baixa o oráculo");
});

await teste("workflow: pacote e linha de base sobem com always(); arquivar roda sempre e depois de tudo", () => {
  const up = (job: string) => wf.jobs[job].steps.find((s) => s.uses?.startsWith("actions/upload-artifact@"))!;
  assert.equal(up("coleta").if, "always()");
  assert.equal(up("linhas-de-base").if, "always()");
  assert.equal(wf.jobs.arquivar.if, "always()");
  assert.deepEqual(wf.jobs.arquivar.needs, ["preparar", "coleta", "linhas-de-base"]);
  assert.deepEqual([wf.jobs.coleta.needs].flat(), ["preparar"]);
  assert.deepEqual([wf.jobs["linhas-de-base"].needs].flat(), ["preparar"], "linha de base separada da coleta");
  for (const s of wf.jobs.arquivar.steps.filter((x) => x.uses?.startsWith("actions/download-artifact@"))) assert.equal(s["continue-on-error"], true);
});

await teste("workflow: só ações oficiais conhecidas; todo run chama uma fase existente de scripts/ci/t4.sh", () => {
  const fases = [...readFileSync(T4SH, "utf8").matchAll(/^ {2}([a-z-]+)\)$/gm)].map((m) => m[1]);
  for (const { job, step } of todosOsPassos()) {
    if (step.uses) assert.ok(/^actions\/(checkout|setup-node|upload-artifact|download-artifact)@[0-9a-f]{40}$/.test(step.uses), `${job}: ação ${step.uses}`);
    else {
      const m = /^bash govbr-eval\/scripts\/ci\/t4\.sh ([a-z-]+)$/.exec(String(step.run).trim());
      assert.ok(m, `${job}: run fora do padrão: ${step.run}`);
      assert.ok(fases.includes(m![1]), `${job}: fase ${m![1]} não existe em t4.sh`);
    }
  }
});

await teste("emulador: expressões do subconjunto avaliadas como no GitHub; fora dele é erro", () => {
  const ctx = { inputs: { modo: "real", braco: "com" }, needs: { preparar: { outputs: { coleta: "true" }, result: "success" } }, secrets: { X: "s" }, github: { sha: "abc" }, runner: { temp: "/t" }, steps: {}, _status: { falhou: false } };
  assert.equal(avaliar("inputs.modo == 'real'", ctx), true);
  assert.equal(avaliar("inputs.modo != 'REAL'", ctx), false, "comparação de texto sem caixa");
  assert.equal(avaliar("needs.preparar.outputs.coleta == 'true' && inputs.braco == 'com'", ctx), true);
  assert.equal(avaliar("always()", { ...ctx, _status: { falhou: true } }), true);
  assert.equal(avaliar("success()", { ...ctx, _status: { falhou: true } }), false);
  assert.equal(interpolar("${{ runner.temp }}/x-${{ github.sha }}", ctx), "/t/x-abc");
  assert.throws(() => avaliar("hashFiles('x')", ctx), /fora do subconjunto/);
  assert.throws(() => avaliar("vars.X", ctx), /fora do subconjunto/);
});

// ───────────────────────────────────────────────────────────────── entradas, imagens, ambiente

const ENTRADAS_OK = { tela: "solicitacao", braco: "sem", modo: "real", modelo: "claude-opus-4-5", esforco: "high", limite_min: "90", campanha: "piloto-01", slot: "slot-01", par: "par-01",
  tentativa: "1", repeticao: "1", telas_sha: "a".repeat(40), validator_sha: "b".repeat(40), etapas: "coleta+linha-de-base" };

await teste("entradas: válidas derivam agente/egress/imagens; inválidas param antes de qualquer gasto", () => {
  const ok = conferirEntradas(ENTRADAS_OK);
  assert.deepEqual(ok.problemas, []);
  assert.equal(ok.saidas.agente, "claude");
  assert.equal(ok.saidas.egress, "real");
  assert.equal(ok.saidas.imagens, "agent,screens,collector,egress", "braço sem: sem imagem do oráculo");
  assert.equal(conferirEntradas({ ...ENTRADAS_OK, braco: "com" }).saidas.imagens, "agent,screens,collector,egress,oracle");
  const ensaio = conferirEntradas({ ...ENTRADAS_OK, modo: "roteirizado", modelo: "" });
  assert.deepEqual(ensaio.problemas, []);
  assert.equal(ensaio.saidas.agente, "fake");
  assert.equal(ensaio.saidas.egress, "stub");
  const casos: [Record<string, string>, RegExp][] = [
    [{ telas_sha: "main" }, /telas_sha/], [{ validator_sha: "abc123" }, /validator_sha/], [{ limite_min: "91" }, /limite_min/],
    [{ modelo: "" }, /modelo/], [{ esforco: "turbo" }, /esforco/], [{ campanha: "../x" }, /campanha/], [{ tela: "fluxo" }, /tela/],
    [{ refazer_linha_de_base_de: "lb-1", motivo_refazer: "queda" }, /so-linha-de-base/],
  ];
  for (const [delta, re] of casos) assert.match(conferirEntradas({ ...ENTRADAS_OK, ...delta }).problemas.join(" "), re, JSON.stringify(delta));
});

await teste("imagens: versões iguais às travadas passam; Chromium ou oráculo diferente param", () => {
  const lock = JSON.parse(readFileSync(join(ROOT, "runner", "images.lock.json"), "utf8"));
  const construido = JSON.parse(JSON.stringify(lock));
  for (const k of Object.keys(construido.images)) construido.images[k].id = `sha256:${"c".repeat(64)}`;
  assert.deepEqual(conferirImagens(lock, construido, ["agent", "screens", "collector", "egress"]), [], "ids diferentes por construção não reprovam");
  const outro = JSON.parse(JSON.stringify(construido));
  outro.versions.chromium = "999.0";
  assert.match(conferirImagens(lock, outro, ["agent"]).join(), /chromium/);
  const oraculo = JSON.parse(JSON.stringify(construido));
  oraculo.versions.oracle.distSha256 = "d".repeat(64);
  assert.deepEqual(conferirImagens(lock, oraculo, ["agent"]), [], "braço sem não confere o oráculo");
  assert.match(conferirImagens(lock, oraculo, ["agent", "oracle"]).join(), /oracle/);
});

await teste("ambiente: token do GitHub/publicação em contêiner, credencial fora do agente ou sem redação reprovam", () => {
  const limpo = { agent: { env: ["HOME=/home/runner", "HTTPS_PROXY=http://egress:3128", "CLAUDE_CODE_OAUTH_TOKEN=<redigido>"] }, browser: { env: ["HOME=/home/runner"] } };
  assert.deepEqual(conferirAmbienteDosConteineres(limpo, "CLAUDE_CODE_OAUTH_TOKEN"), []);
  assert.match(conferirAmbienteDosConteineres({ agent: { env: ["GITHUB_TOKEN=x"] } }, null).join(), /GITHUB_TOKEN/);
  assert.match(conferirAmbienteDosConteineres({ agent: { env: ["GOVBR_RESULTADOS_TOKEN=<redigido>"] } }, null).join(), /GOVBR_RESULTADOS_TOKEN/);
  assert.match(conferirAmbienteDosConteineres({ browser: { env: ["ANTHROPIC_API_KEY=<redigido>"] } }, "*").join(), /fora do contêiner do agente/);
  assert.match(conferirAmbienteDosConteineres({ agent: { env: ["CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat-xyz"] } }, "CLAUDE_CODE_OAUTH_TOKEN").join(), /não redigido/);
  assert.match(conferirAmbienteDosConteineres({ agent: { env: ["ANTHROPIC_API_KEY=<redigido>"] } }, "CLAUDE_CODE_OAUTH_TOKEN").join(), /não autorizada/);
  const ck = join(TMP, "checkout-com-token");
  mkdirSync(join(ck, ".git"), { recursive: true });
  writeFileSync(join(ck, ".git", "config"), "[http \"https://github.com/\"]\n\textraheader = AUTHORIZATION: basic eDp5\n");
  assert.match(conferirCheckouts([ck]).join(), /credencial guardada/);
});

// ───────────────────────────────────────────────────────────────── site, manifesto, snapshots

await teste("site-manifest.v1 do govbr-telas: carregado e servido byte a byte (linha de base e análise)", async () => {
  const site = loadSite(DEFAULT_TELAS_DIR);
  assert.ok(site.files.size > 100);
  assert.equal(site.manifest.spa?.prefixo, "/pnip/");
  const port = 33000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, [join(DEFAULT_TELAS_DIR, "server.mjs"), "--port", String(port)], { stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
    const v = await verifyServedSite(`http://127.0.0.1:${port}`, join(DEFAULT_TELAS_DIR, "site-manifest.json"));
    assert.equal(v.manifestSha256, sha(readFileSync(join(DEFAULT_TELAS_DIR, "site-manifest.json"))));
  } finally { child.kill(); }
});

const comum = { tela: "solicitacao", telasDir: DEFAULT_TELAS_DIR, validatorDir: DEFAULT_VALIDATOR_DIR, referencePath: REF_FIXTURE, campanha: "t4-teste", slot: "slot-01", par: "par-01",
  modo: "roteirizado" as const, modelo: null, esforco: null, limiteMin: 5, tentativa: 1, repeticao: 1 };
const manifestoSem = buildIsolatedManifest({ ...comum, braco: "sem" });
const manifestoCom = buildIsolatedManifest({ ...comum, braco: "com", slot: "slot-02" });
const manifestoPath = join(TMP, "manifesto-coleta.json");
writeFileSync(manifestoPath, JSON.stringify(manifestoSem, null, 2) + "\n");

await teste("manifesto 1.2.0 (T8a.1 + NAT-63): campanha de ensaio gerada e idêntica nos dois braços; modo real sem campanha commitada é recusado", () => {
  for (const m of [manifestoSem, manifestoCom]) {
    assert.equal(m.manifestVersion, "manifesto-coleta-isolada-1.2.0");
    assert.equal(m.campaign!.origin, "gerada-ensaio");
    assert.ok(validateContract(m.campaign!.document).valid, JSON.stringify(validateContract(m.campaign!.document).errors));
    assert.equal(sha(documentoDaCampanha(m.campaign!.document)), m.campaign!.sha256);
    assert.deepEqual(problemasDaCampanha(m.campaign!.document, m), []);
  }
  assert.equal(manifestoSem.campaign!.sha256, manifestoCom.campaign!.sha256, "os dois braços de um par geram a mesma campanha");
  assert.equal(manifestoSem.campaign!.document.design.models[0].requested, conferirEntradas({ ...ENTRADAS_OK, modo: "roteirizado", modelo: "" }).saidas.modelo);
  const real = { ...comum, braco: "sem" as const, modo: "real" as const, modelo: "claude-opus-4-5", esforco: "high" };
  assert.throws(() => buildIsolatedManifest({ ...real, campanhaPath: join(TMP, "nao-existe", "campaign.json") }), /modo real sem campanha/);
  // campanha commitada que não serve ao disparo (tela fora do desenho): recusada antes de qualquer gasto
  const errada = { ...manifestoSem.campaign!.document, fixture: false, design: { ...manifestoSem.campaign!.document.design, models: [{ family: "claude", requested: "claude-opus-4-5" }], screens: [{ id: "vistorias", label: "Vistorias", version: "x" }] } };
  const errPath = join(TMP, "campanha-errada.json");
  writeFileSync(errPath, JSON.stringify(errada, null, 2) + "\n");
  assert.throws(() => buildIsolatedManifest({ ...real, campanhaPath: errPath }), /não traz a tela solicitacao/);
  // manifesto 1.0.0 (antes do T8a.1) continua legível
  const antigo = JSON.parse(JSON.stringify(manifestoSem)) as IsolatedCollectionManifest;
  delete antigo.campaign;
  (antigo as { manifestVersion: string }).manifestVersion = "manifesto-coleta-isolada-1.0.0";
  assert.deepEqual(isolatedManifestProblems(antigo), []);
  const adulterado = JSON.parse(JSON.stringify(manifestoSem)) as IsolatedCollectionManifest;
  adulterado.campaign!.document.title = "outra";
  assert.match(isolatedManifestProblems(adulterado).join(), /campanha × sha256/);
});

await teste("manifesto de coleta isolada: identidade completa, conferida contra o lock; adulteração recusada", () => {
  assert.deepEqual(isolatedManifestProblems(manifestoSem), []);
  assert.equal(readIsolatedManifest(manifestoPath).manifest.dispatch.arm, "sem");
  assert.equal(manifestoSem.fixture, true);
  const ruim: IsolatedCollectionManifest = JSON.parse(JSON.stringify(manifestoSem));
  ruim.statePlan.padrao = { width: 1, height: 1 };
  assert.match(isolatedManifestProblems(ruim).join(), /plano de estados/);
  assert.throws(() => buildIsolatedManifest({ ...comum, braco: "sem", limiteMin: 120 }), /1 a 90/);
  const formal: IsolatedCollectionManifest = JSON.parse(JSON.stringify(manifestoSem));
  Object.assign(formal, { fixture: false });
  formal.dispatch.mode = "real";
  assert.match(isolatedManifestProblems(formal).join(), /modelo/);
});

const instrumento = listagemDoCommit(ROOT, manifestoSem.repos["govbr-eval"].commit!);
await teste("snapshots: conjunto válido e o MESMO id nos dois braços (a análise de par exige)", () => {
  const a = conjuntoDeSnapshots(manifestoSem, instrumento), b = conjuntoDeSnapshots(manifestoCom, instrumento);
  const v = validateContract(a);
  assert.ok(v.valid, JSON.stringify(v.errors));
  assert.equal(a.snapshotSetId, b.snapshotSetId);
});

// ───────────────────────────────────────────────────────────────── linha de base

function brutoSintetico(m: IsolatedCollectionManifest, msha: string, mudar: Partial<FlowBaselines> = {}): string {
  const b = {
    baselineVersion: BASELINE_VERSION, status: "complete", error: null, scope: "bateria", timestamp: "2026-10-03T12:00:00.000Z", appUrl: "http://127.0.0.1:3300/solicitacao.html",
    state: { setup: [], waitFor: null },
    provenance: { collectionManifest: { path: "/x/manifesto-coleta.json", sha256: msha }, identity: m.identity, corpus: { commit: null, dirty: null }, validatorVersion: "2.7.0", tools: { axe: "4.11.1", playwright: "1.61.1" } },
    passes: [{ id: "1280x900", viewport: { width: 1280, height: 900 }, specs: [], startedAt: "2026-10-03T12:00:00.000Z", seconds: 3,
      axe: { violations: 0, passes: 1, incomplete: [], findings: [], seconds: 1 }, validator: { unguided: { mode: "nao-guiada", policy: "fixture", request: { selectors: null, checks: [], viewport: { width: 1280, height: 900 }, actions: 0 }, stateFingerprint: null, coverage: null, findings: [], seconds: 1 }, guided: null },
      resolution: { bySelector: {}, labels: {} } }],
    coverageCheck: [], eslint: null, eslintAusente: "fixture sintética do teste T4", cost: { wallClockSeconds: 4, apiUsd: 0, platform: "linux x64", passes: [] }, legacy: null, ...mudar,
  };
  const p = join(TMP, `bruta-${Math.random().toString(16).slice(2)}.json`);
  writeFileSync(p, JSON.stringify(b, null, 2) + "\n");
  return p;
}
const msha = sha(readFileSync(manifestoPath));
const mbytes = readFileSync(manifestoPath).length;

await teste("linha de base: registro baseline.v1 utilizável; identidade divergente, falha e bruto alterado reprovam", () => {
  const ok = registrarLinhaDeBase({ bruta: brutoSintetico(manifestoSem, msha), manifest: manifestoSem, manifestSha256: msha, manifestBytes: mbytes, instrumento });
  assert.deepEqual(ok.problemas, []);
  assert.ok(validateContract(ok.registro).valid);
  assert.equal(ok.registro.screen.version, manifestoSem.site.screenVersion, "mesma versão de tela que o run.json grava");
  const outraRef = registrarLinhaDeBase({ bruta: brutoSintetico(manifestoSem, msha, { provenance: { ...JSON.parse(readFileSync(brutoSintetico(manifestoSem, msha), "utf8")).provenance, identity: { ...manifestoSem.identity, referenceSha256: "e".repeat(64) } } }), manifest: manifestoSem, manifestSha256: msha, manifestBytes: mbytes, instrumento });
  assert.match(outraRef.problemas.join(), /referenceSha256/);
  const falha = registrarLinhaDeBase({ bruta: brutoSintetico(manifestoSem, msha, { status: "failed", error: "cena instável" }), manifest: manifestoSem, manifestSha256: msha, manifestBytes: mbytes, instrumento });
  assert.ok(validateContract(falha.registro).valid, "falha também é registrada (com o erro)");
  assert.match(falha.problemas.join(), /não completou/);
  const rerun = registrarLinhaDeBase({ bruta: brutoSintetico(manifestoSem, msha), manifest: manifestoSem, manifestSha256: msha, manifestBytes: mbytes, instrumento, rerunOf: ok.registro.baselineId, motivo: "queda do runner" });
  assert.equal(rerun.registro.attempt, 2);
  assert.ok(validateContract(rerun.registro).valid);
});

// ───────────────────────────────────────────────────────────────── execução real do agente roteirizado (Docker)

const SENTINELAS: Record<string, string> = {
  GITHUB_TOKEN: `ghs_SENTINELA${sha("a").slice(0, 24)}`, GH_TOKEN: `gho_SENTINELA${sha("b").slice(0, 24)}`,
  GOVBR_LEITURA_TOKEN: `github_pat_SENTINELA${sha("c").slice(0, 24)}`, GOVBR_RESULTADOS_TOKEN: `github_pat_SENTINELA${sha("d").slice(0, 24)}`,
  ACTIONS_RUNTIME_TOKEN: `SENTINELA-actions-${sha("e").slice(0, 24)}`,
};
let pacote: string | null = null;
const docker = !semDocker && dockerAvailable().ok;
if (docker) {
  await teste("coleta (agente roteirizado, Docker): tokens do GitHub/publicação no runner não chegam a contêiner nem pacote", async () => {
    const antes = { ...process.env };
    Object.assign(process.env, SENTINELAS);
    try {
      const saida = join(TMP, "execucoes-locais", "execucao");
      const r = await runOnce({ tela: "solicitacao", braco: "sem", modelo: "agente-roteirizado", esforco: "nao-se-aplica", limiteSeg: 300, saida, agente: "fake", cenario: "honesto",
        permitirModelo: false, campanha: "t4-teste", slot: "slot-01", par: "par-01", tentativa: 1, repeticao: 1, egress: "stub",
        telasDir: DEFAULT_TELAS_DIR, validatorDir: DEFAULT_VALIDATOR_DIR, log: (l) => console.log(`     · ${l}`) });
      assert.equal(r.exitCode, 0, r.problems.join("; "));
      pacote = saida;
    } finally {
      for (const k of Object.keys(SENTINELAS)) if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k];
    }
    const cfg = JSON.parse(readFileSync(join(pacote!, "evidence", "container-config.json"), "utf8"));
    assert.deepEqual(conferirAmbienteDosConteineres(cfg, null), []);
    for (const papel of Object.keys(cfg)) for (const kv of cfg[papel].env as string[]) assert.ok(!Object.keys(SENTINELAS).includes(kv.split("=")[0]), `${papel}: ${kv.split("=")[0]}`);
    const { segredosNoPacote } = await import("./arquivo-resultados");
    assert.deepEqual(segredosNoPacote(pacote!, Object.values(SENTINELAS)), [], "valor de token no pacote");
    assert.deepEqual(problemasDoPacote(pacote!).problemas, []);
  });
} else console.log("skip coleta com Docker (--sem-docker ou Docker indisponível): o arquivo usa um pacote sintético");

if (!pacote) {
  // Sem Docker: o pacote sintético da fixture do T6 (contratos válidos, mas de outra tela: o arquivo o
  // guarda como `pacote-invalido`, que é exatamente o que deve fazer com pacote que não casa com o disparo).
  const dir = join(TMP, "pacote-sintetico");
  cpSync(join(ROOT, "scripts", "fixtures", "analise", "gerado", "pacotes", "sem"), dir, { recursive: true });
  pacote = dir;
}

// ───────────────────────────────────────────────────────────────── arquivo

const arquivo = repoDeArquivo("govbr-resultados");
const evid = join(TMP, "anexos");
const ENT = { ...ENTRADAS_OK, modo: "roteirizado", campanha: "t4-teste", slot: "slot-01", etapas: "coleta+linha-de-base" };
const lbDir = join(TMP, "linha-de-base");
{
  // o que o job linhas-de-base sobe: baseline.json + bruta.json (o mesmo bruto que o registro descreve)
  mkdirSync(lbDir, { recursive: true });
  cpSync(brutoSintetico(manifestoSem, msha), join(lbDir, "bruta.json"));
  const r = registrarLinhaDeBase({ bruta: join(lbDir, "bruta.json"), manifest: manifestoSem, manifestSha256: msha, manifestBytes: mbytes, instrumento });
  writeFileSync(join(lbDir, "baseline.json"), JSON.stringify(r.registro, null, 2) + "\n");
}
const todosOsArquivos = (dir: string): string[] => execFileSync("git", ["-C", dir, "ls-files", "--cached", "--others"], { encoding: "utf8" }).split("\n").filter(Boolean);
const JOBS = { preparar: { result: "success" }, coleta: { result: "success" }, "linhas-de-base": { result: "success" } };
let chaveRun = "";
let anexoPath = "";

await teste("arquivo: grava pacote, linha de base, manifesto, snapshots, índice e tar.gz com sha256", () => {
  const r = arquivarExecucao({ arquivo, evidenciasSaida: evid, pacote, manifesto: manifestoPath, linhaDeBase: lbDir, segredos: [], entradas: ENT, jobs: JOBS, telas: DEFAULT_TELAS_DIR });
  const run = JSON.parse(readFileSync(join(pacote!, "run.json"), "utf8")) as Run;
  chaveRun = run.runId;
  const g = r.gravacoes.find((x) => x.tipo === "execucao")!;
  assert.ok(g, JSON.stringify(r));
  anexoPath = g.anexoLocal!;
  assert.ok(g.caminho.startsWith(`ensaios/${run.campaignId}/`), "agente roteirizado vai para ensaios/, nunca execucoes/");
  assert.match(g.caminho, new RegExp(`__${run.screen.id}__.+__sem__rep-01__${run.runId}$`));
  const e = JSON.parse(readFileSync(join(arquivo, "indice", "entradas", `${chaveRun}.json`), "utf8")) as EntradaIndice;
  assert.equal(e.evidencias!.sha256, sha(readFileSync(anexoPath)));
  assert.equal(e.evidencias!.estado, "pendente");
  assert.equal(e.estado.arquivo, docker ? "arquivado" : "pacote-invalido", e.motivo ?? "");
  const lb = r.gravacoes.find((x) => x.tipo === "linha-de-base")!;
  assert.equal(lb.estado, "utilizavel");
  for (const f of ["INDICE.md", "indice/indice.json", `coletas/t4-teste/${msha}/manifesto-coleta.json`, `snapshots/referencia/${manifestoSem.reference.sha256}/referencia.json`]) assert.ok(existsSync(join(arquivo, f)), f);
  assert.ok(!existsSync(join(arquivo, g.caminho, "pacote", "evidence")), "evidence/ vai só no anexo");
  assert.match(readFileSync(join(arquivo, "INDICE.md"), "utf8"), new RegExp(chaveRun));
  // tar determinístico e legível por tar comum
  assert.equal(sha(criarTarGz(pacote!, "x")), sha(criarTarGz(pacote!, "x")));
  assert.ok(lerTarGz(readFileSync(anexoPath)).length > 3);
  // T8a.1: campanha e site congelado, por conteúdo
  const camp = join(arquivo, caminhoCampanha("t4-teste", manifestoSem.campaign!.sha256));
  assert.equal(sha(readFileSync(camp)), manifestoSem.campaign!.sha256);
  const siteArq = join(arquivo, caminhoSite(manifestoSem.identity.siteManifestSha256!));
  assert.equal(loadSite(siteArq).manifestSha256, manifestoSem.identity.siteManifestSha256, "site arquivado conferido arquivo a arquivo");
  assert.equal(listarArquivos(join(siteArq, "site")).length, loadSite(DEFAULT_TELAS_DIR).files.size, "só os arquivos que o site-manifest lista");
  // O arquivamento da campanha e do site não pode gerar problema. Sem Docker, o pacote sintético é de
  // outra campanha/tela de propósito: o arquivo o recusa numa única linha "pacote arquivado com
  // problemas: …" (que TEM de aparecer, com a campanha e o site divergentes); essa linha é a do pacote,
  // não a do arquivamento da campanha/site, e só ela é descontada. Com Docker, nada é descontado.
  const doPacote = (p: string) => p.startsWith("pacote arquivado com problemas: ");
  if (!docker) {
    const linhaPacote = r.problemas.filter(doPacote);
    assert.equal(linhaPacote.length, 1, `sem Docker, o pacote de outra campanha é recusado: ${r.problemas.join("; ")}`);
    assert.match(linhaPacote[0], /campanha fixture-analise-campanha-01 ≠ t4-teste/);
    assert.match(linhaPacote[0], /site da execução ≠ site do manifesto/);
  }
  const doArquivamento = docker ? r.problemas : r.problemas.filter((p) => !doPacote(p));
  assert.ok(!doArquivamento.some((p) => /campanha|site/.test(p)), r.problemas.join("; "));
  const semTelas = arquivarExecucao({ arquivo, evidenciasSaida: join(TMP, "anexos-sem-telas"), pacote: null, manifesto: manifestoPath, linhaDeBase: null, segredos: [], entradas: { ...ENT, etapas: "so-linha-de-base" }, jobs: JOBS });
  assert.match(semTelas.problemas.join(), /site congelado não arquivado/, "sem --telas, o aviso aparece");
});

await teste("arquivo: reenvio do MESMO pacote é idempotente; bytes diferentes no mesmo caminho são recusados", () => {
  const r = arquivarExecucao({ arquivo, evidenciasSaida: join(TMP, "anexos2"), pacote, manifesto: manifestoPath, linhaDeBase: lbDir, segredos: [], entradas: ENT, jobs: JOBS });
  assert.ok(r.gravacoes.some((g) => g.chave === chaveRun));
  assert.equal(sha(readFileSync(join(TMP, "anexos2", `${r.gravacoes.find((g) => g.chave === chaveRun)!.caminho.split("/").pop()}.tar.gz`))), sha(readFileSync(anexoPath)), "mesmo pacote, mesmo anexo");
  const adulterado = join(TMP, "pacote-adulterado");
  cpSync(pacote!, adulterado, { recursive: true });
  writeFileSync(join(adulterado, "tool-events.ndjson"), readFileSync(join(adulterado, "tool-events.ndjson"), "utf8") + "{\"kind\":\"forjado\"}\n");
  assert.throws(() => arquivarExecucao({ arquivo, evidenciasSaida: join(TMP, "anexos3"), pacote: adulterado, manifesto: manifestoPath, linhaDeBase: null, segredos: [], entradas: ENT, jobs: {} }), Recusa);
  assert.throws(() => gravarImutavel(join(arquivo, "INDICE.md.teste"), "a") && gravarImutavel(join(arquivo, "INDICE.md.teste"), "b"), Recusa);
  rmSync(join(arquivo, "INDICE.md.teste"), { force: true });
});

await teste("arquivo: .gitattributes com `* -text` na raiz (clone com autocrlf não converte bytes com sha256), idempotente", () => {
  const ga = join(arquivo, ".gitattributes");
  assert.equal(readFileSync(ga, "utf8"), "* -text\n", "o job arquivar grava o .gitattributes");
  assert.equal(garantirGitattributes(arquivo), "inalterado");
  assert.equal(readFileSync(ga, "utf8"), "* -text\n");
  const outro = join(TMP, "arquivo-gitattributes");
  mkdirSync(outro, { recursive: true });
  writeFileSync(join(outro, ".gitattributes"), "*.png binary");
  assert.equal(garantirGitattributes(outro), "atualizado");
  assert.equal(readFileSync(join(outro, ".gitattributes"), "utf8"), "*.png binary\n* -text\n", "linha existente preservada");
  assert.equal(garantirGitattributes(outro), "inalterado");
  assert.equal(readFileSync(join(outro, ".gitattributes"), "utf8"), "*.png binary\n* -text\n");
});

await teste("arquivo: entrega do anexo só avança (pendente → confirmado), nunca volta; sha errado não confirma", () => {
  const errado = join(TMP, "baixado-errado.tar.gz");
  writeFileSync(errado, "não é o anexo");
  assert.equal(confirmarEvidencias(arquivo, chaveRun, { baixado: errado, url: "https://x" }).evidencias!.estado, "falhou");
  assert.equal(confirmarEvidencias(arquivo, chaveRun, { baixado: anexoPath, url: "https://github.com/nathlia/govbr-resultados/releases/download/t/a" }).evidencias!.estado, "confirmado");
  assert.equal(confirmarEvidencias(arquivo, chaveRun, { falhou: "teste" }).evidencias!.estado, "confirmado", "confirmado não regride");
  const e = JSON.parse(readFileSync(join(arquivo, "indice", "entradas", `${chaveRun}.json`), "utf8")) as EntradaIndice;
  const outra = { ...e, estado: { ...e.estado, tecnico: "failed" } };
  assert.throws(() => gravarEntrada(arquivo, outra), Recusa, "entrada só muda no estado da entrega");
  assert.throws(() => gravarEntrada(arquivo, { ...e, evidencias: { ...e.evidencias!, estado: "pendente" } }), Recusa, "entrega não regride");
  // reenvio do mesmo pacote depois de confirmado: mantém a entrega confirmada
  arquivarExecucao({ arquivo, evidenciasSaida: join(TMP, "anexos5"), pacote, manifesto: manifestoPath, linhaDeBase: null, segredos: [], entradas: ENT, jobs: JOBS });
  assert.equal((JSON.parse(readFileSync(join(arquivo, "indice", "entradas", `${chaveRun}.json`), "utf8")) as EntradaIndice).evidencias!.estado, "confirmado");
  const saidaJson = join(TMP, "arquivamento.json");
  writeFileSync(saidaJson, JSON.stringify({ gravacoes: [{ chave: chaveRun, tipo: "execucao", caminho: e.caminho, estado: e.estado.arquivo, evidencias: { estado: "pendente", anexo: null, sha256: e.evidencias!.sha256 } }] }));
  assert.deepEqual(resumoArquivo(saidaJson, arquivo).pendentes, [], "o resumo lê o estado atual do índice");
});

await teste("arquivo: valor de credencial dentro do pacote → nada publicado, entrada 'retido-segredo'", () => {
  const vazado = join(TMP, "pacote-vazado");
  cpSync(pacote!, vazado, { recursive: true });
  const run = JSON.parse(readFileSync(join(vazado, "run.json"), "utf8")) as Run;
  run.runId = `${run.runId}-vazado`;
  writeFileSync(join(vazado, "run.json"), JSON.stringify(run, null, 2) + "\n");
  mkdirSync(join(vazado, "evidence", "logs"), { recursive: true });
  writeFileSync(join(vazado, "evidence", "logs", "vazou.log"), `token=${SENTINELAS.GOVBR_RESULTADOS_TOKEN}\n`);
  process.env.GOVBR_RESULTADOS_TOKEN = SENTINELAS.GOVBR_RESULTADOS_TOKEN;
  try {
    assert.throws(() => arquivarExecucao({ arquivo, evidenciasSaida: join(TMP, "anexos-vazado"), pacote: vazado, manifesto: manifestoPath, linhaDeBase: null, segredos: ["GOVBR_RESULTADOS_TOKEN"], entradas: { ...ENT, etapas: "so-coleta" }, jobs: {} }), Recusa);
  } finally { delete process.env.GOVBR_RESULTADOS_TOKEN; }
  const e = JSON.parse(readFileSync(join(arquivo, "indice", "entradas", `${run.runId}.json`), "utf8")) as EntradaIndice;
  assert.equal(e.estado.arquivo, "retido-segredo");
  assert.ok(!existsSync(join(arquivo, e.caminho, "pacote")), "nenhum byte do pacote no arquivo");
  assert.ok(!existsSync(join(TMP, "anexos-vazado", `${e.caminho.split("/").pop()}.tar.gz`)), "nenhum anexo gerado");
  const comToken = todosOsArquivos(arquivo).filter((f) => readFileSync(join(arquivo, f)).includes(Buffer.from(SENTINELAS.GOVBR_RESULTADOS_TOKEN)));
  assert.deepEqual(comToken, [], "valor do token em algum arquivo do arquivo");
});

await teste("arquivo: execução interrompida sem pacote fica visível no índice (nada inventado)", () => {
  const r = arquivarExecucao({ arquivo, evidenciasSaida: join(TMP, "anexos4"), pacote: null, manifesto: manifestoPath, linhaDeBase: null, segredos: [], entradas: { ...ENT, etapas: "so-coleta" }, jobs: { preparar: { result: "success" }, coleta: { result: "cancelled" } } });
  const g = r.gravacoes.find((x) => x.estado === "sem-pacote")!;
  assert.ok(g);
  const e = JSON.parse(readFileSync(join(arquivo, "indice", "entradas", `${g.chave}.json`), "utf8")) as EntradaIndice;
  assert.equal(e.estado.tecnico, "interrupted");
  assert.match(e.motivo!, /cancelled/);
  assert.equal(e.pacote, null);
  assert.match(readFileSync(join(arquivo, "INDICE.md"), "utf8"), /sem-pacote/);
});

await teste("restauração: só com o arquivo + anexo, todos os hashes conferem; anexo ou cópia adulterados são pegos", () => {
  const ok = restaurar(arquivo, chaveRun, anexoPath, join(TMP, "restaurado"));
  assert.ok(ok.ok, ok.problemas.join("; "));
  assert.ok(ok.conferidos.some((c) => /^campanha /.test(c)) && ok.conferidos.some((c) => /^site /.test(c)), `campanha e site conferidos: ${ok.conferidos.join("; ")}`);
  assert.ok(ok.conferidos.some((c) => /pacote restaurado/.test(c)) || !docker, ok.conferidos.join("; "));
  const lb = restaurar(arquivo, JSON.parse(readFileSync(join(lbDir, "baseline.json"), "utf8")).baselineId, null, join(TMP, "restaurado-lb"));
  assert.ok(lb.ok, lb.problemas.join("; "));
  const corrompido = join(TMP, "corrompido.tar.gz");
  const b = Buffer.from(readFileSync(anexoPath));
  b[b.length - 20] ^= 0xff;
  writeFileSync(corrompido, b);
  assert.match(restaurar(arquivo, chaveRun, corrompido, join(TMP, "restaurado-2")).problemas.join(), /sha256 do anexo/);
  const e = JSON.parse(readFileSync(join(arquivo, "indice", "entradas", `${chaveRun}.json`), "utf8")) as EntradaIndice;
  const copia = join(TMP, "arquivo-adulterado");
  cpSync(arquivo, copia, { recursive: true });
  writeFileSync(join(copia, e.caminho, "pacote", "run.json"), "{}\n");
  assert.match(restaurar(copia, chaveRun, anexoPath, join(TMP, "restaurado-3")).problemas.join(), /cópia no repositório ≠ anexo/);
  assert.ok(!restaurar(arquivo, "nao-existe", null, join(TMP, "restaurado-4")).ok);
});

// ───────────────────────────────────────────────────────────────── cartão de saúde do resumo (NAT-58)

const PACOTE_FIX = join(ROOT, "scripts", "fixtures", "analise", "gerado", "pacotes", "sem");
/** Roda o passo do resumo como o job roda (CLI + GITHUB_STEP_SUMMARY) e devolve o arquivo do resumo. */
function resumoDoPasso(args: string[], env: Record<string, string> = {}): string {
  const f = join(TMP, `resumo-${Math.random().toString(36).slice(2)}.md`);
  try {
    execFileSync(process.execPath, ["--import", "tsx", join(ROOT, "scripts", "pipeline-t4.ts"), ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GITHUB_STEP_SUMMARY: f, ...env } });
  } catch (e) { if (!existsSync(f)) throw e; }
  return readFileSync(f, "utf8");
}
const SEM_GABARITO = /referencia|refer[êe]ncia|gabarito|ground-truth|unidade/i;

await teste("resumo: execução limpa → cartão ✅ no topo (identidade, números, próximo passo) e tabelas dobradas", () => {
  const t = resumoDoPasso(["resumo-coleta", "--pacote", PACOTE_FIX], { SLOT: "ignorado-o-run-manda", ETAPAS: "coleta+linha-de-base" });
  const [card, resto] = t.split("<details>");
  assert.match(t.split("\n")[0], /^### ✅ slot-02: execução limpa$/, "a primeira linha do resumo é a saúde");
  assert.match(card, /\*\*tela-fixture-analise\*\* · braço sem \(sem oráculo\) · modelo-fixture · esforço medium · ENSAIO/);
  assert.match(card, /duração do agente: 10 min · custo estimado pelo cliente: desconhecido · \d+ achados? enviados? · isolamento conferido/);
  assert.ok(!/chamadas ao oráculo/.test(card), "braço sem não fala de oráculo");
  assert.ok(!/US\$ 0/.test(card), "custo desconhecido nunca vira 0");
  assert.match(card, /\*\*Próximo passo:\*\* aguarde o job arquivar; depois atualize o clone \(git pull\) e abra o painel/);
  assert.match(resto ?? "", /^<summary>Detalhes técnicos<\/summary>[\s\S]*\| Técnico \| \*\*passed\*\*[\s\S]*<\/details>/, "as tabelas de antes, dobradas");
  assert.ok(!SEM_GABARITO.test(card), "nada da referência no cartão");
});

await teste("resumo: execução que falhou → ❌ com a causa em uma frase (sem stack), custo como estimativa, nova tentativa", () => {
  const dir = join(TMP, "pacote-falhou");
  cpSync(PACOTE_FIX, dir, { recursive: true });
  const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) as Run;
  run.arm = "com";
  run.status.technical = "failed";
  run.failure = { stage: "running", reason: "timeout", detail: "\nError: o agente passou do limite de 90 min\n    at esperar (runner/run-once.ts:120:5)\n    at main (x.ts:1:1)" } as Run["failure"];
  run.usage.estimatedCostUsd = { value: 1.234, status: "measured", source: "cliente" } as Run["usage"]["estimatedCostUsd"];
  writeFileSync(join(dir, "run.json"), JSON.stringify(run, null, 2) + "\n");
  const t = resumoDoPasso(["resumo-coleta", "--pacote", dir]);
  const card = t.split("<details>")[0];
  assert.match(t.split("\n")[0], /^### ❌ slot-02: falhou na execução do agente — Error: o agente passou do limite de 90 min$/);
  assert.ok(!/\bat esperar|run-once\.ts/.test(card), "nada de stack no cartão");
  assert.match(card, /braço com \(com oráculo\)/);
  assert.match(card, /custo estimado pelo cliente: US\$ 1,23 \(estimativa, não fatura\)/);
  assert.match(card, /chamadas ao oráculo: 0/);
  assert.match(card, /\*\*Próximo passo:\*\* nova tentativa do slot slot-02 \(tentativa 2\) — só por falha técnica \(D-67\)/);
  // sem pacote: o cartão sai das entradas do disparo, sem inventar número
  const sem = resumoDoPasso(["resumo-coleta", "--pacote", join(TMP, "nao-existe")], { SLOT: "p03-com", TELA: "solicitacao", BRACO: "com", MODELO: "claude-x", ESFORCO: "high", TENTATIVA: "1" });
  assert.match(sem.split("\n")[0], /^### ❌ p03-com: interrompida sem pacote/);
  assert.match(sem, /\*\*solicitacao\*\* · braço com \(com oráculo\) · claude-x · esforço high/);
  assert.ok(!/duração do agente/.test(sem.split("<details>")[0]), "sem run.json não há números");
  assert.match(sem, /nova tentativa do slot p03-com \(tentativa 2\)/);
});

await teste("resumo do arquivar: próximo passo pelo par no índice (falta braço / completo) e 'repita o job arquivar'", () => {
  const arq = join(TMP, "arquivo-cartao");
  mkdirSync(join(arq, "indice", "entradas"), { recursive: true });
  const entrada = (chave: string, braco: "sem" | "com", tecnico: string): void => writeFileSync(join(arq, "indice", "entradas", `${chave}.json`), JSON.stringify({
    chave, tipo: "execucao", natureza: "formal", campanha: "c1", slot: `p01-${braco}`, par: "par-01", tela: "solicitacao", braco, dataUtc: `2026-10-03T1${braco === "sem" ? 0 : 1}:00:00Z`,
    caminho: `execucoes/c1/${chave}`, estado: { arquivo: "arquivado", tecnico }, evidencias: null }));
  entrada("r-sem", "sem", "passed");
  const run = JSON.parse(readFileSync(join(PACOTE_FIX, "run.json"), "utf8")) as Run;
  const info = { concluido: true, pendentes: [], arquivo: arq };
  assert.match(cartaoSaude(PACOTE_FIX, {}, info), /\*\*Próximo passo:\*\* falta o braço com do par-01 \(dispare o slot dele\)/, "o par é o do run.json, na campanha do run.json");
  assert.equal(situacaoDoPar(arq, "c1", "par-01", "sem"), "falta o braço com do par-01 (dispare o slot dele)");
  entrada("r-com", "com", "failed");
  assert.match(situacaoDoPar(arq, "c1", "par-01", "sem"), /o braço com do par-01 falhou na última tentativa/);
  entrada("r-com-2", "com", "passed");
  assert.equal(situacaoDoPar(arq, "c1", "par-01", "sem"), "par-01 completo → atualize o clone (git pull) e clique em Preparar análise no painel");
  // o cartão do arquivar usa o par do run.json; anexo pendente manda repetir o job antes de tudo
  mkdirSync(join(arq, "indice", "entradas"), { recursive: true });
  for (const e of ["r-sem", "r-com", "r-com-2"]) {
    const p = join(arq, "indice", "entradas", `${e}.json`);
    writeFileSync(p, readFileSync(p, "utf8").replace(/"c1"/, JSON.stringify(run.campaignId)));
  }
  assert.match(cartaoSaude(PACOTE_FIX, {}, info), /\*\*Próximo passo:\*\* par-01 completo → atualize o clone/);
  assert.match(cartaoSaude(PACOTE_FIX, {}, { ...info, pendentes: ["x: anexo pendente"] }), /\*\*Próximo passo:\*\* repita o job arquivar \(Re-run failed jobs\) — o anexo de evidências não foi confirmado/);
  assert.match(cartaoSaude(null, { slot: "p01-sem", etapas: "so-coleta" }, { concluido: false, pendentes: [], arquivo: null }), /^### ❌ p01-sem: interrompida sem pacote[\s\S]*repita o job arquivar[\s\S]*nada foi gravado/);
  // passo real do job (CLI): cartão no topo, tabela do arquivamento dobrada
  const saidaJson = join(TMP, "arquivamento-cartao.json");
  writeFileSync(saidaJson, JSON.stringify({ gravacoes: [] }));
  const t = resumoDoPasso(["resumo-arquivo", "--saida-json", saidaJson, "--arquivo", arq, "--pacote", PACOTE_FIX]);
  assert.match(t.split("\n")[0], /^### ✅ slot-02: execução limpa$/);
  assert.match(t, /Próximo passo:\*\* par-01 completo[\s\S]*<details><summary>Detalhes técnicos<\/summary>[\s\S]*### Arquivamento/);
});

await teste("resumo da linha de base: uma linha de saúde e a tabela dobrada", () => {
  const t = resumoDoPasso(["resumo-linha-de-base", "--dir", lbDir]);
  assert.match(t.split("\n")[0], /^### ✅ Linha de base \S+: registrada e utilizável pela análise$/);
  assert.match(t, /<details><summary>Detalhes técnicos<\/summary>[\s\S]*### Linha de base/);
  assert.match(resumoDoPasso(["resumo-linha-de-base", "--dir", join(TMP, "nao-existe")]).split("\n")[0], /^### ❌ Linha de base: não produziu registro/);
});

// ───────────────────────────────────────────────────────────────── fim

if (!manter) rmSync(TMP, { recursive: true, force: true });
else console.log(`mantido: ${TMP}`);
const falhos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhos.length}/${resultados.length} ok${docker ? "" : " (sem o caso com Docker)"}`);
process.exitCode = falhos.length ? 1 : 0;
