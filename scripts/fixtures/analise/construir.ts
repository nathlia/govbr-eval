/**
 * Fixture SINTÉTICA da análise determinística (T6). Monta, numa pasta nova, tudo o que
 * `npm run analisar` lê: site congelado de uma página inventada, referência inventada (3 specs),
 * campanha, conjunto de snapshots, linha de base arquivada (registro baseline.v1 + bruto
 * FlowBaselines) e dois pacotes de execução (sem e com) com manifesto de artefatos.
 *
 * Nada aqui vem de tela, gabarito ou execução real: todo documento grava `fixture: true`, a tela é
 * `tela-fixture-analise` e os textos dizem que são sintéticos. Datas fixas: a mesma chamada produz os
 * mesmos bytes, e a cópia versionada em `gerado/` é conferida contra uma reconstrução no teste.
 *
 * Uso: npx tsx scripts/fixtures/analise/construir.ts <pasta-nova>
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AgentFinding, ArmV2, ArtifactManifest, Baseline, Campaign, CampaignV2, Findings, Isolation, OracleIdentityV2, Run, RunV2, SnapshotManifest } from "../../../contracts/index";
import type { FlowGroundTruth } from "../../../types";
import { cenasDoPlano, statePlanOf, statePlanSha256 } from "../../collection-manifest";
import { BASELINE_VERSION, UNGUIDED_POLICY, type FlowBaselines } from "../../run-baselines-flow";
import { FLOW_INSTRUMENT_VERSION, FLOW_SCORING_VERSION } from "../../instrument";
import { SURFACE_VERSION, loadSite } from "../../measurement-surface";

export const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));
export const PAGINA = "fixture-analise.html";
export const TELA = { id: "tela-fixture-analise", label: "fixture da análise (sintética)", version: "fixture-analise-0.0.1" };
export const CAMPANHA_ID = "fixture-analise-campanha-01";
export const ORACULO = {
  package: "oraculo-fixture", version: "0.0.0-fixture",
  distSha256: "a".repeat(64), dataSha256: "b".repeat(64), profile: "combined" as const,
};

/**
 * NAT-61 (trio): a mesma imagem do oráculo nos braços com e ferramentas; muda só o perfil MEDIDO e o tools/list.
 * Hashes do tools/list: os fixados no validator 2.14.0 (evaluation = o da 2.13.0; knowledge-free = 72abd549…).
 */
export const ORACULO_V2: Record<"com" | "ferramentas", OracleIdentityV2> = {
  com: { package: ORACULO.package, version: ORACULO.version, distSha256: ORACULO.distSha256, dataSha256: ORACULO.dataSha256, profile: "evaluation",
    tools: ["get_component_spec", "get_design_tokens", "get_ds_rules", "get_emag_rules", "get_finding_details", "get_page_rules", "scan_page", "verify_finding"],
    toolsListSha256: "3d70162f5fed0ec8614d9dcbc18a69a00b4819ad56df1ed1c5bf95213eed0b3b" },
  ferramentas: { package: ORACULO.package, version: ORACULO.version, distSha256: ORACULO.distSha256, dataSha256: ORACULO.dataSha256, profile: "knowledge-free",
    tools: ["get_finding_details", "scan_page", "verify_finding"],
    toolsListSha256: "72abd54968cbe3173fce5dd3b4bba7aff563b37ca11b8a9ec0f25a91a104d39c" },
};

const sha = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");
const json = (value: unknown): string => JSON.stringify(value, null, 2) + "\n";
/** PNG 1×1 transparente: "evidência" sintética com bytes reais. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

export type Submissao = "aceita" | "recusada" | "nenhuma" | "nao-executada";
export interface OpcoesBraco { submissao?: Submissao; findings?: AgentFinding[] }
export interface OpcoesFixture {
  sem?: OpcoesBraco;
  com?: OpcoesBraco;
  /**
   * NAT-61: grupo de três braços — campanha v2 (sem, ferramentas, com; comparações declaradas), run.v2 nos três
   * com o perfil medido do oráculo, e o pacote do braço ferramentas. Padrão desligado: os bytes de `gerado/` não mudam.
   */
  trio?: boolean;
  ferramentas?: OpcoesBraco;
  /** `falha`: registro e bruto com status failed (parcial); `identidade-divergente`: aponta outra referência. */
  linhaDeBase?: "completa" | "falha" | "identidade-divergente";
  /** A campanha declara, antes da coleta, ausência de linha de base para a tela fixture. */
  ausenciaPlanejada?: boolean;
  /** Diferença fora do desenho no braço com (versão do navegador). */
  divergenciaForaDoDesenho?: boolean;
  /**
   * Identidade do par (painel T8a: vários pares na mesma campanha). Padrão = par-01, sufixo 01, dia
   * 2026-01-03 — os bytes de `gerado/` não mudam.
   */
  identidade?: Partial<IdentidadeFixture>;
  /**
   * A página monta, a cada carga, um combobox com id SORTEADO (`fx-lista-NNNN` em `id` e
   * `aria-controls`), como o `br-select` do DS na tela real (piloto-01). Muda o site congelado.
   */
  idsGerados?: boolean;
  /**
   * NAT-67: a página escreve a data de HOJE (relógio da página, fuso dela) num parágrafo e marca o dia
   * com uma classe, como o calendário (flatpickr) da tela A. Muda o site congelado.
   */
  hojeNaPagina?: boolean;
  /**
   * Referência com camada de página (D-83): FX-01/FX-02 viram A-01/A-02 (sorteadas) e FX-03 vira P-01 (página).
   * Mesmas âncoras; só os ids mudam. Padrão desligado — os bytes de `gerado/` não mudam.
   */
  camadaPagina?: boolean;
  /**
   * NAT-51: troca a página e a referência inventadas por um site congelado e uma referência que existem
   * (ex.: govbr-telas + ground-truth-vistorias.json, que NAVEGA — D-60). Os dois são só LIDOS: o site é
   * servido da pasta original (não é copiado) e a referência é copiada byte a byte. Execuções, achados,
   * campanha e linha de base continuam sintéticos e `fixture: true`; a tela recebe id próprio de fixture.
   */
  telaReal?: TelaReal;
}
export interface TelaReal { site: string; referencia: string; achados: Record<"sem" | "com", AgentFinding[]>;
  /** Por cena do plano (id da cena): achados sintéticos do axe na linha de base. */
  axePorCena?: Record<string, { rule: string; target: string }[]> }
interface Contexto { tela: { id: string; label: string; version: string }; appUrl: string }
const CONTEXTO_PADRAO: Contexto = { tela: TELA, appUrl: `http://127.0.0.1:3100/${PAGINA}` };
const IDS_CAMADA: Record<string, string> = { "FX-01": "A-01", "FX-02": "A-02", "FX-03": "P-01" };
const idDaSpec = (o: OpcoesFixture, id: string): string => (o.camadaPagina ? IDS_CAMADA[id] ?? id : id);
export interface IdentidadeFixture { par: string; sufixo: string; dia: string; slots: { sem: string; com: string; ferramentas?: string } }
const IDENTIDADE_PADRAO: IdentidadeFixture = { par: "par-01", sufixo: "01", dia: "2026-01-03", slots: { sem: "slot-02", com: "slot-01" } };

/** Combobox cujo id é sorteado a cada carga (o PNG não muda; o HTML sim). Fora de toda âncora e de todo achado. */
const HOJE_NA_PAGINA = `  <p class="fx-hoje" aria-current="date"></p>
  <script>
    (function () {
      var d = new Date(), dois = function (n) { return (n < 10 ? "0" : "") + n; };
      var p = document.querySelector(".fx-hoje");
      p.textContent = "Hoje: " + d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate());
      p.className = "fx-hoje fx-dia-" + d.getDay();
    })();
  </script>
`;

const COMBO_COM_ID_SORTEADO = `  <div class="fx-combo" role="combobox" aria-expanded="false" aria-label="lista sintética"></div>
  <script>
    (function () {
      var id = "fx-lista-" + Math.floor(Math.random() * 1e6);
      var combo = document.querySelector(".fx-combo");
      combo.setAttribute("aria-controls", id);
      var lista = document.createElement("ul");
      lista.id = id; lista.setAttribute("role", "listbox"); lista.hidden = true;
      combo.appendChild(lista);
    })();
  </script>
`;

const estado = { viewport: { width: 1280, height: 900 }, steps: [] as string[] };

/** Achados padrão. Os textos são sintéticos; um deles carrega HTML e URL de propósito (escape no resumo). */
export const FINDINGS_PADRAO: Record<"sem" | "com", AgentFinding[]> = {
  sem: [
    { selector: "#fx-campo", rule: "fixture:campo-sem-rotulo",
      observed: "Campo sintético sem rótulo associado. <script>alert('fixture')</script> ver http://exemplo.invalid/x",
      expected: "Campo com rótulo associado (condição sintética).", state: estado, evidence: ["sem-01.png"] },
    { selector: ".fx-aviso", rule: null,
      observed: "O aviso sintético parece ter contraste baixo (afirmação sintética para ser julgada incorreta).",
      expected: "Contraste maior (condição sintética).", state: estado, evidence: [] },
  ],
  com: [
    { selector: "#fx-campo", rule: "fixture:campo-sem-rotulo",
      observed: "Campo sintético sem rótulo associado.", expected: "Campo com rótulo associado (condição sintética).",
      state: estado, evidence: ["com-01.png"] },
    { selector: "#fx-botao", rule: "fixture:cor-fora-da-paleta",
      observed: "Fundo #ff00ff, fora da paleta sintética.", expected: "Cor da paleta sintética.", state: estado, evidence: [] },
    { selector: "#fx-titulo", rule: null,
      observed: "Título sintético sem hierarquia declarada (descoberta sintética fora da referência).",
      expected: "Hierarquia declarada (condição sintética).", state: estado, evidence: [] },
  ],
};

/**
 * NAT-61: achados do trio. O com cita o que só ele tem (uma ferramenta retirada e um id da base) — é o que a
 * revisão cega precisa contar como vazamento com × ferramentas; o ferramentas acha FX-01 pelo axe.
 */
export const FINDINGS_TRIO: Record<"ferramentas" | "com", AgentFinding[]> = {
  ferramentas: [
    { selector: "#fx-campo", rule: "fixture:campo-sem-rotulo", observed: "Campo sintético sem rótulo associado (scan_page, só axe).",
      expected: "Campo com rótulo associado (condição sintética).", state: estado, evidence: ["ferramentas-01.png"] },
  ],
  com: [
    ...FINDINGS_PADRAO.com.slice(0, 2),
    { selector: "#fx-titulo", rule: null,
      observed: "Título sintético sem hierarquia declarada; get_ds_rules devolveu govbr-3.7.0-fixture-000000000000 (texto sintético).",
      expected: "Hierarquia declarada (condição sintética).", state: estado, evidence: [] },
  ],
};

function metric(value: number | null, source: string) {
  return value === null ? { value: null, status: "unavailable" as const } : { value, status: "measured" as const, source };
}
function notApplicable() { return { value: null, status: "not-applicable" as const }; }

function campanha(o: OpcoesFixture, cx: Contexto = CONTEXTO_PADRAO): Campaign {
  return {
    contract: "campaign.v1", fixture: true, campaignId: CAMPANHA_ID, kind: "pilot",
    title: "Campanha fixture da análise (FIXTURE SINTÉTICA — não é dado científico)",
    objective: "Exercitar a análise determinística (T6) sem nenhuma chamada de modelo.",
    hypotheses: ["Hipótese sintética de fixture."],
    createdAt: "2026-01-01T00:00:00Z", frozenAt: "2026-01-02T00:00:00Z",
    design: { screens: [cx.tela], arms: ["sem", "com"], models: [{ family: "familia-fixture", requested: "modelo-fixture" }],
      effort: "medium", repetitions: 1, order: "sequencial", seed: null },
    fixed: { protocolSha256: "c".repeat(64), client: { name: "cliente-fixture", version: "0.0.0" },
      provider: { name: "provedor-fixture", authMethod: "unknown" }, browser: { name: "chromium", version: "0.0.0-fixture" },
      playwrightMcp: "0.0.0-fixture", isolationPolicyVersion: "isolamento-fixture-1", oracle: ORACULO, scorerVersion: FLOW_SCORING_VERSION },
    limits: { timeoutSeconds: 1800, maxTurns: null, maxBudgetUsd: null },
    retryPolicy: { maxAttemptsPerSlot: 1, campaignAttemptCeiling: 2, retryOn: [], attemptSelection: "primeira tentativa; nenhuma repetição" },
    failurePolicy: "Falha fica registrada no slot; nada é repetido automaticamente.",
    baselinePolicy: { required: true, comparable: ["linha-de-base/validator-nao-guiada", "linha-de-base/axe"],
      diagnosticOnly: ["linha-de-base/validator-guiada"],
      plannedAbsences: o.ausenciaPlanejada ? [{ screenId: cx.tela.id, analysisPath: "individual",
        justification: "Ausência sintética declarada antes da coleta para exercitar o caminho individual.", declaredAt: "2026-01-01T12:00:00Z" }] : [] },
    analysisPlan: { primaryOutcome: "Desfecho sintético.", secondaryOutcomes: [], uncertaintyMethod: null, exclusionRules: "Nenhuma exclusão." },
    budget: { approved: false, amount: null, currency: null, approvedBy: null, approvedAt: null },
  };
}

/** NAT-61: a campanha do trio (v2), com o perfil do oráculo por braço e as comparações declaradas. */
function campanhaTrio(o: OpcoesFixture, cx: Contexto = CONTEXTO_PADRAO): CampaignV2 {
  const { contract: _c, design, fixed, ...resto } = campanha(o, cx);
  const { oracle: _o, ...fixo } = fixed;
  return {
    contract: "campaign.v2", ...resto,
    design: { ...design, arms: ["sem", "ferramentas", "com"], order: "quadrado-latino", seed: 61,
      comparisons: [
        { id: "ferramentas-com", arms: ["ferramentas", "com"], role: "primary", question: "Pergunta sintética: o conhecimento do oráculo acrescenta?" },
        { id: "sem-ferramentas", arms: ["sem", "ferramentas"], role: "secondary", question: "Pergunta sintética: as ferramentas genéricas acrescentam?" },
        { id: "sem-com", arms: ["sem", "com"], role: "secondary", question: "Pergunta sintética: o oráculo inteiro acrescenta?" },
      ] },
    fixed: { ...fixo, oracleProfiles: ORACULO_V2 },
  };
}

/** NAT-61: o run.v2 do trio — o mesmo run do par, com o braço e a identidade medida do oráculo. */
function runDocV2(arm: ArmV2, submissao: Submissao, siteManifestSha256: string, id: IdentidadeFixture, cx: Contexto = CONTEXTO_PADRAO): RunV2 {
  const base = runDoc(arm === "ferramentas" ? "com" : arm, submissao, siteManifestSha256, false, id, cx);
  if (arm !== "ferramentas") return { ...base, contract: "run.v2", intervention: { oracle: arm === "com" ? ORACULO_V2.com : null } };
  const slot = id.slots.ferramentas ?? "slot-03";
  const t = (h: string) => base.timestamps.startedAt === null ? null : `${id.dia}${h}`;
  return { ...base, contract: "run.v2", arm, slotId: slot, runId: `fixture-analise-run-ferramentas-${id.sufixo}`, idempotencyKey: `${CAMPANHA_ID}/${slot}/1`,
    intervention: { oracle: ORACULO_V2.ferramentas },
    timestamps: { plannedAt: base.timestamps.plannedAt, startedAt: t("T00:40:00Z"), finishedAt: t("T00:50:00Z") } };
}

function runDoc(arm: "sem" | "com", submissao: Submissao, siteManifestSha256: string, divergente: boolean, id: IdentidadeFixture,
  cx: Contexto = CONTEXTO_PADRAO): Run {
  const com = arm === "com";
  const naoExecutada = submissao === "nao-executada";
  const slot = id.slots[arm];
  const started = `${id.dia}${com ? "T00:01:00Z" : "T00:20:00Z"}`;
  const finished = `${id.dia}${com ? "T00:11:00Z" : "T00:30:00Z"}`;
  const base: Run = {
    contract: "run.v1", fixture: true, campaignId: CAMPANHA_ID, slotId: slot, pairId: id.par,
    runId: `fixture-analise-run-${arm}-${id.sufixo}`, attempt: 1, idempotencyKey: `${CAMPANHA_ID}/${slot}/1`,
    screen: cx.tela, arm, repetition: 1,
    model: { family: "familia-fixture", requested: "modelo-fixture", resolved: "unknown", resolvedSource: "unknown", resolvedEvidence: null },
    provider: { name: "provedor-fixture", authMethod: "unknown" }, effort: "medium",
    client: { name: "cliente-fixture", version: "0.0.0" },
    browser: { name: "chromium", version: divergente && com ? "9.9.9-fixture-divergente" : "0.0.0-fixture", headless: true },
    versions: { protocolSha256: "c".repeat(64), promptSha256: "d".repeat(64), skillSha256: "e".repeat(64),
      harnessCommit: "f".repeat(40), siteManifestSha256, playwrightMcp: "0.0.0-fixture" },
    intervention: { oracle: com ? ORACULO : null },
    limits: { timeoutSeconds: 1800, maxTurns: null, maxBudgetUsd: null },
    isolationPolicyVersion: "isolamento-fixture-1",
    timestamps: { plannedAt: `${id.dia}T00:00:00Z`, startedAt: naoExecutada ? null : started, finishedAt: naoExecutada ? null : finished },
    lifecycle: { state: "archived", stage: null },
    status: { technical: "passed", isolation: "passed", protocol: "adherent",
      oracleUsage: com ? "used-adherent" : "absent-verified", score: "pending-review" },
    failure: null,
    submission: { status: "accepted", findings: "findings.json", refusal: null },
    usage: {
      wallClockSeconds: metric(600, "runner"), inputTokens: metric(null, ""), outputTokens: metric(null, ""),
      cacheReadTokens: metric(null, ""), cacheCreationTokens: metric(null, ""), turns: metric(com ? 14 : 12, "cliente"),
      toolCalls: metric(com ? 30 : 25, "bridge"), oracleCalls: metric(com ? 3 : 0, "bridge"),
      estimatedCostUsd: metric(null, ""), billedCostUsd: metric(null, ""),
    },
    artifactManifest: "artifact-manifest.json", isolation: "isolation.json",
  };
  if (submissao === "recusada") {
    base.lifecycle = { state: "failed", stage: "collecting" };
    base.status = { ...base.status, technical: "failed", protocol: "non-adherent", score: "not-applicable" };
    base.failure = { stage: "collecting", reason: "output-refused", detail: "Coletor recusou o relatório sintético (fora do contrato)." };
    base.submission = { status: "refused", findings: null, refusal: { reason: "relatório sintético sem o campo findings", archivedBody: "recusa/corpo-recusado.txt" } };
  } else if (submissao === "nenhuma") {
    base.lifecycle = { state: "failed", stage: "running" };
    base.status = { ...base.status, technical: "failed", protocol: "non-adherent", score: "not-applicable" };
    base.failure = { stage: "running", reason: "no-submission", detail: "A execução sintética terminou sem submeter relatório." };
    base.submission = { status: "none", findings: null, refusal: null };
  } else if (naoExecutada) {
    base.lifecycle = { state: "not-started", stage: "preflight" };
    base.status = { technical: "not-run", isolation: "failed", protocol: "not-applicable", oracleUsage: "not-applicable", score: "not-applicable" };
    base.failure = { stage: "preflight", reason: "preflight-failed", detail: "Check sintético de sentinela falhou; modelo não chamado." };
    base.submission = { status: "none", findings: null, refusal: null };
    base.usage = Object.fromEntries(Object.keys(base.usage).map(k => [k, notApplicable()])) as Run["usage"];
  }
  return base;
}

function isolationDoc(run: Run | RunV2): Isolation {
  const falhou = run.status.isolation === "failed";
  const ferramentas = ["browser_navigate", "browser_snapshot", "browser_take_screenshot", "coletor_enviar"];
  return {
    contract: "isolation.v1", fixture: true, campaignId: run.campaignId, runId: run.runId, policyVersion: "isolamento-fixture-1",
    producedBy: "harness", producedAt: `${run.timestamps.plannedAt.slice(0, 10)}T00:00:50Z`, result: run.status.isolation,
    checks: [
      { id: "sentinela-referencia", category: "sentinel", target: "arquivo-sentinela sintético", required: true,
        outcome: falhou ? "failed" : "passed", evidence: null, ...(falhou ? { detail: "sentinela sintética legível (falha de propósito)" } : {}) },
      { id: "rede-externa", category: "network", target: "destino fora da allowlist", required: true, outcome: "passed", evidence: null },
      { id: "ipv6-loopback", category: "network", target: "[::1] alternativo", required: false, outcome: "not-exercised", evidence: null },
    ],
    positiveControls: [{ id: "controle-sentinela", target: "arquivo-sentinela sintético", outcome: "passed", evidence: null }],
    toolInventory: run.contract === "run.v2" ? {
      // NAT-61: como o run-once grava — os nomes que as pontes expuseram (o oráculo sem prefixo)
      announced: [...ferramentas, ...(run.intervention.oracle?.tools ?? [])],
      observed: run.status.technical === "not-run" ? [] : run.arm === "sem" ? ["browser_navigate"] : ["browser_navigate", "scan_page"],
      oracleAnnounced: run.arm !== "sem",
    } : {
      announced: run.arm === "com" ? [...ferramentas, "mcp__govbr-ds-validator__scan_page"] : ferramentas,
      observed: run.status.technical === "not-run" ? [] : run.arm === "com" ? ["browser_navigate", "mcp__govbr-ds-validator__scan_page"] : ["browser_navigate"],
      oracleAnnounced: run.arm === "com",
    },
    capabilitiesObserved: run.status.technical === "not-run" ? [] : ["navegação", "submissão ao coletor"],
    notExercised: ["ipv6-loopback"],
    limitations: ["FIXTURE SINTÉTICA — não é dado científico"],
  };
}

function toolEvents(arm: ArmV2): string {
  const ev = [{ tool: "browser_navigate", isError: false }, { tool: "browser_snapshot", isError: false }];
  if (arm !== "sem") ev.push({ tool: "mcp__govbr-ds-validator__scan_page", isError: false }, { tool: "mcp__govbr-ds-validator__scan_page", isError: true });
  return ev.map(e => JSON.stringify(e)).join("\n") + "\n";
}

const MEDIA: Record<string, string> = { ".json": "application/json", ".ndjson": "application/x-ndjson", ".png": "image/png", ".txt": "text/plain" };

function pacote(dir: string, arm: ArmV2, o: OpcoesBraco, siteSha: string, divergente: boolean, id: IdentidadeFixture,
  cx: Contexto = CONTEXTO_PADRAO, v2 = false): void {
  const submissao = o.submissao ?? "aceita";
  const run: Run | RunV2 = v2 ? runDocV2(arm, submissao, siteSha, id, cx) : runDoc(arm as "sem" | "com", submissao, siteSha, divergente, id, cx);
  const files: { path: string; role: ArtifactManifest["files"][number]["role"]; body: string | Buffer }[] = [];
  files.push({ path: "run.json", role: "run", body: json(run) });
  if (submissao === "aceita") {
    const findings: Findings = {
      contract: "findings.v1", fixture: true, campaignId: CAMPANHA_ID, runId: run.runId,
      receivedAt: `${id.dia}${arm === "com" ? "T00:10:30Z" : arm === "ferramentas" ? "T00:49:30Z" : "T00:29:30Z"}`, receipt: `recibo-fixture-${arm}-${id.sufixo}`,
      findingContract: "achado-2",
      report: { timestamp: `${id.dia}${arm === "com" ? "T00:10:29Z" : arm === "ferramentas" ? "T00:49:29Z" : "T00:29:29Z"}`, model: "modelo-fixture",
        appUrl: cx.appUrl, scope: ["tela fixture inteira"], notes: "FIXTURE SINTÉTICA — não é dado científico",
        findings: o.findings ?? (v2 && arm !== "sem" ? FINDINGS_TRIO[arm] : FINDINGS_PADRAO[arm as "sem" | "com"]) },
    };
    files.push({ path: "findings.json", role: "findings", body: json(findings) });
    files.push({ path: `evidence/${arm}-01.png`, role: "evidence", body: PNG });
  }
  if (submissao === "recusada") files.push({ path: "recusa/corpo-recusado.txt", role: "refusal", body: "{\"relatorio\": \"corpo sintético recusado\"}\n" });
  files.push({ path: "isolation.json", role: "isolation", body: json(isolationDoc(run)) });
  if (submissao !== "nao-executada") files.push({ path: "tool-events.ndjson", role: "tool-events", body: toolEvents(arm) });
  const manifest: ArtifactManifest = {
    contract: "artifact-manifest.v1", fixture: true, campaignId: CAMPANHA_ID, runId: run.runId,
    producedBy: "construtor-fixture-analise", producedAt: `${id.dia}T00:40:00Z`,
    schemaVersions: { run: run.contract, ...(submissao === "aceita" ? { findings: "findings.v1" as const } : {}), isolation: "isolation.v1" },
    files: files.map(f => ({ path: f.path, bytes: Buffer.byteLength(f.body), sha256: sha(f.body),
      mediaType: MEDIA[f.path.slice(f.path.lastIndexOf("."))] ?? "application/octet-stream", role: f.role })),
  };
  for (const f of files) {
    mkdirSync(dirname(join(dir, f.path)), { recursive: true });
    writeFileSync(join(dir, f.path), f.body);
  }
  writeFileSync(join(dir, "artifact-manifest.json"), json(manifest));
}

function bruto(o: OpcoesFixture, identity: Baseline["identity"], coleta: { path: string; sha256: string },
  cx: Contexto = CONTEXTO_PADRAO, gt?: FlowGroundTruth): FlowBaselines {
  const viewport = { width: 1280, height: 900 };
  const falha = o.linhaDeBase === "falha";
  if (o.telaReal && gt && !falha) return brutoTelaReal(o.telaReal, identity, coleta, cx, gt);
  return {
    baselineVersion: BASELINE_VERSION, status: falha ? "failed" : "complete",
    error: falha ? "falha sintética da linha de base: validator não respondeu" : null,
    scope: "bateria", timestamp: "2026-01-03T01:00:00Z", appUrl: cx.appUrl,
    state: { setup: [], waitFor: null },
    provenance: { collectionManifest: coleta, identity, corpus: { commit: null, dirty: null }, validatorVersion: null,
      tools: { axe: null, playwright: null } },
    passes: falha ? [] : [{
      id: "1280x900", viewport, specs: ["FX-01", "FX-02", "FX-03"].map(id => idDaSpec(o, id)), startedAt: "2026-01-03T01:00:01Z", seconds: 2,
      axe: { violations: 1, passes: 0, incomplete: [], seconds: 1,
        findings: [{ rule: "label", impact: "critical", description: "Campo sem rótulo (texto sintético da fixture).", target: "#fx-campo" }] },
      validator: { guided: null, unguided: { mode: "nao-guiada", policy: UNGUIDED_POLICY,
        request: { selectors: null, checks: ["tokens", "structure", "page"], viewport, actions: 0 },
        stateFingerprint: "sha256:fixture", coverage: null, seconds: 1,
        findings: [{ id: null, rule: "fixture:cor-fora-da-paleta", source: "fixture", description: "Cor sintética fora da paleta.",
          expected: "Cor da paleta sintética.", target: "#fx-botao" }] } },
      resolution: { bySelector: {}, labels: {} },
    }],
    coverageCheck: [], eslint: null, eslintAusente: "tela fixture sem fontes declaradas",
    cost: { wallClockSeconds: 2, apiUsd: 0, platform: "fixture", passes: falha ? [] : [{ id: "1280x900", seconds: 2 }] },
    legacy: null,
  };
}

/** Linha de base sintética de uma tela real: uma passada por cena do plano (por segmento, se navega — D-60). */
function brutoTelaReal(t: TelaReal, identity: Baseline["identity"], coleta: { path: string; sha256: string }, cx: Contexto,
  gt: FlowGroundTruth): FlowBaselines {
  const cenas = cenasDoPlano(gt);
  return {
    baselineVersion: BASELINE_VERSION, status: "complete", error: null,
    scope: "bateria", timestamp: "2026-01-03T01:00:00Z", appUrl: cx.appUrl,
    state: { setup: gt._meta.setup ?? [], waitFor: gt._meta.waitFor ?? null },
    provenance: { collectionManifest: coleta, identity, corpus: { commit: null, dirty: null }, validatorVersion: null,
      tools: { axe: null, playwright: null } },
    passes: cenas.map(c => {
      const axe = (t.axePorCena?.[c.id] ?? []).map(f => ({ rule: f.rule, impact: "serious", description: "Achado sintético do axe (fixture).", target: f.target }));
      return {
        id: c.id, viewport: c.viewport, specs: c.specIds, startedAt: "2026-01-03T01:00:01Z", seconds: 1,
        axe: { violations: axe.length, passes: 0, incomplete: [], seconds: 1, findings: axe },
        validator: { guided: null, unguided: { mode: "nao-guiada", policy: UNGUIDED_POLICY,
          request: { selectors: null, checks: ["tokens", "structure", "page"], viewport: c.viewport, actions: 0 },
          stateFingerprint: "sha256:fixture", coverage: null, seconds: 0, findings: [] } },
        ...(c.segmento ? { segmento: { ...c.segmento, entradaDireta: null } } : {}),
        resolution: { bySelector: {}, labels: {} },
      };
    }),
    coverageCheck: [], eslint: null, eslintAusente: "fixture de tela real sem fontes declaradas",
    cost: { wallClockSeconds: cenas.length, apiUsd: 0, platform: "fixture", passes: cenas.map(c => ({ id: c.id, seconds: 1 })) },
    legacy: null,
  } as FlowBaselines;
}

/** Constrói a fixture em `out` (pasta nova). Devolve os caminhos que `analisar` recebe. */
export function construirFixture(out: string, o: OpcoesFixture = {}) {
  if (existsSync(out)) throw new Error(`Pasta já existe: ${out}`);
  mkdirSync(out, { recursive: true });
  const w = (rel: string, body: string | Buffer) => {
    mkdirSync(dirname(join(out, rel)), { recursive: true });
    writeFileSync(join(out, rel), body);
    return { sha256: sha(body), bytes: Buffer.byteLength(body) };
  };

  // Site congelado no formato de measurement-surface.ts (site-manifest.json + site/). Tela real: lido
  // da pasta original, sem cópia; o sha256 é o que `loadSite` confere.
  let site: { sha256: string; bytes: number };
  if (o.telaReal) {
    const carregado = loadSite(o.telaReal.site);
    site = { sha256: carregado.manifestSha256, bytes: readFileSync(join(o.telaReal.site, "site-manifest.json")).length };
  } else {
    const original = readFileSync(join(FIXTURE_DIR, "pagina", PAGINA));
    const extra = (o.idsGerados ? COMBO_COM_ID_SORTEADO : "") + (o.hojeNaPagina ? HOJE_NA_PAGINA : "");
    const html = extra ? Buffer.from(original.toString("utf8").replace("</main>", extra + "</main>"), "utf8") : original;
    w(`site/site/${PAGINA}`, html);
    const siteManifest = json({ version: SURFACE_VERSION, entry: `/${PAGINA}`, sourceDist: "fixture-sintetica",
      corpusCommit: null, corpusDirty: null, files: { [`/${PAGINA}`]: sha(html) } });
    site = w("site/site-manifest.json", siteManifest);
  }

  const refOriginal = readFileSync(o.telaReal ? o.telaReal.referencia : join(FIXTURE_DIR, "referencia-fixture.json"));
  const refBytes = o.camadaPagina ? Buffer.from(refOriginal.toString("utf8").replace(/"id": "(FX-0\d)"/g, (_m, id: string) => `"id": "${idDaSpec(o, id)}"`), "utf8") : refOriginal;
  const ref = w("referencia.json", refBytes);
  const gt = JSON.parse(refBytes.toString("utf8")) as FlowGroundTruth;
  const plan = statePlanOf(gt);
  const cx: Contexto = o.telaReal
    ? { tela: { id: "tela-fixture-real", label: `fixture sobre ${gt._meta.page} (execuções sintéticas)`, version: String(gt._meta.version) },
      appUrl: new URL(gt._meta.url, "http://127.0.0.1:3100").toString() }
    : CONTEXTO_PADRAO;
  const planSha = statePlanSha256(plan)!;
  const planFile = w("plano-estados.json", json(plan));

  const camp = w("campanha.json", json(o.trio ? campanhaTrio(o, cx) : campanha(o, cx)));

  const snapshots: SnapshotManifest = {
    contract: "snapshot-manifest.v1", fixture: true, snapshotSetId: "fixture-analise-snapshots-01", createdAt: "2026-01-02T12:00:00Z",
    items: [
      { id: "site", kind: "site", description: "Site congelado sintético (sha256 = do site-manifest.json).", sha256: site.sha256,
        bytes: site.bytes, location: { kind: "package-path", path: "site/site-manifest.json" }, immutable: true, exposedToAgent: false },
      { id: "referencia", kind: "reference", description: "Referência sintética (nenhum conteúdo de gabarito real).", sha256: ref.sha256,
        bytes: ref.bytes, location: { kind: "package-path", path: "referencia.json" }, immutable: true, exposedToAgent: false, version: cx.tela.version },
      { id: "plano-estados", kind: "state-plan", description: "Plano de estados/janelas da referência sintética (sha256 = statePlanSha256).",
        sha256: planSha, bytes: planFile.bytes, location: { kind: "package-path", path: "plano-estados.json" }, immutable: true, exposedToAgent: false },
      { id: "instrumento", kind: "instrument", description: "Código do instrumento no commit sintético.", sha256: "0".repeat(64), bytes: 1,
        location: { kind: "git-commit-path", repo: "govbr-eval", commit: "f".repeat(40), path: "scripts" }, immutable: true, exposedToAgent: false },
    ],
  };
  w("snapshots.json", json(snapshots));

  // Linha de base: bruto FlowBaselines + registro baseline.v1 que aponta para ele.
  const coleta = w("linha-de-base/manifesto-coleta.json", json({ fixture: true, nota: "manifesto de coleta sintético (só bytes para o vínculo)" }));
  const divergente = o.linhaDeBase === "identidade-divergente";
  const identity: Baseline["identity"] = { collection: FLOW_INSTRUMENT_VERSION, referenceSha256: divergente ? "0".repeat(64) : ref.sha256,
    siteManifestSha256: site.sha256, oracleDistSha256: ORACULO.distSha256, oracleDataSha256: ORACULO.dataSha256, statePlanSha256: planSha };
  const raw = w("linha-de-base/bruta.json", json(bruto(o, identity, { path: "linha-de-base/manifesto-coleta.json", sha256: coleta.sha256 }, cx, gt)));
  const falha = o.linhaDeBase === "falha";
  const registro: Baseline = {
    contract: "baseline.v1", fixture: true, baselineId: "fixture-analise-linha-de-base-01", campaignId: CAMPANHA_ID, screen: cx.tela,
    attempt: 1, rerunOf: null, rerunReason: null,
    producer: { script: "scripts/run-baselines-flow.ts", baselineVersion: BASELINE_VERSION },
    scope: "bateria", status: falha ? "failed" : "complete", error: falha ? "falha sintética da linha de base: validator não respondeu" : null,
    raw: { ...raw, location: { kind: "package-path", path: "bruta.json" } },
    timestamps: { startedAt: "2026-01-03T01:00:00Z", finishedAt: "2026-01-03T01:00:03Z" },
    links: {
      collectionManifest: { ...coleta, location: { kind: "package-path", path: "manifesto-coleta.json" } },
      site: { snapshotSetId: snapshots.snapshotSetId, itemId: "site", sha256: site.sha256 },
      reference: { snapshotSetId: snapshots.snapshotSetId, itemId: "referencia", sha256: identity.referenceSha256 },
      statePlan: { snapshotSetId: snapshots.snapshotSetId, itemId: "plano-estados", sha256: planSha },
    },
    identity,
    comparable: ["linha-de-base/validator-nao-guiada", "linha-de-base/axe"], diagnosticOnly: ["linha-de-base/validator-guiada"],
    eslint: { status: "absent", absentReason: "tela fixture sem fontes declaradas" },
  };
  w("linha-de-base/registro.json", json(registro));

  const id: IdentidadeFixture = { ...IDENTIDADE_PADRAO, ...o.identidade, slots: { ...IDENTIDADE_PADRAO.slots, ...o.identidade?.slots } };
  const braco = (arm: "sem" | "com"): OpcoesBraco => ({ ...(o.telaReal ? { findings: o.telaReal.achados[arm] } : {}), ...o[arm] });
  pacote(join(out, "pacotes", "sem"), "sem", braco("sem"), site.sha256, Boolean(o.divergenciaForaDoDesenho), id, cx);
  pacote(join(out, "pacotes", "com"), "com", braco("com"), site.sha256, Boolean(o.divergenciaForaDoDesenho), id, cx);
  if (o.trio) {
    // NAT-61: os três braços em run.v2 (sem e com reescritos no contrato novo; o par v1 acima continua o padrão)
    for (const arm of ["sem", "com"] as const) {
      rmSync(join(out, "pacotes", arm), { recursive: true, force: true });
      pacote(join(out, "pacotes", arm), arm, braco(arm), site.sha256, false, id, cx, true);
    }
    pacote(join(out, "pacotes", "ferramentas"), "ferramentas", o.ferramentas ?? {}, site.sha256, false, id, cx, true);
  }

  return {
    dir: out, campanha: join(out, "campanha.json"), campanhaSha256: camp.sha256, snapshots: join(out, "snapshots.json"),
    referencia: join(out, "referencia.json"), site: o.telaReal ? o.telaReal.site : join(out, "site"), linhaDeBase: join(out, "linha-de-base", "registro.json"),
    sem: join(out, "pacotes", "sem"), com: join(out, "pacotes", "com"),
    ...(o.trio ? { ferramentas: join(out, "pacotes", "ferramentas") } : {}),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2];
  if (!out) throw new Error("Uso: npx tsx scripts/fixtures/analise/construir.ts <pasta-nova>");
  const r = construirFixture(out);
  console.log(`Fixture sintética construída em ${relative(process.cwd(), r.dir) || "."}`);
}
