/**
 * Contratos do benchmark isolado (M0) — tipos TS + validador.
 *
 * Os JSON Schemas desta pasta são a fonte; os tipos abaixo os espelham à mão (sem geração) e o
 * validador usa Ajv (draft 2020-12). Além do schema, `validateContract` aplica as poucas regras que
 * um schema não expressa (paths duplicados, vínculos de hash internos, ausência planejada anterior à
 * coleta). Regras entre documentos ficam em funções próprias: `crossCheckRun`,
 * `checkPlannedAbsence`, `checkAggregation`.
 *
 * O que NÃO está aqui: nenhum runner, painel ou scorer. A unidade de avaliação continua a do scorer
 * (scripts/semantic-flow.ts); `findings.v1` só envelopa o relatório que scripts/flow-contract.ts já
 * aceita. Método em docs/contratos-benchmark.md.
 *
 * NAT-81: `findings.v2` acrescenta o registro de inspeção (`report.inspection`, inspection.v1) sem mudar o
 * achado-2, e `artifact-manifest.v2` existe só porque o v1 trava `findings.v1`. Os leitores aceitam as duas
 * versões; os pacotes históricos continuam v1 e válidos. As regras do registro que o schema não expressa
 * moram em inspection-ledger.mjs (o coletor usa a mesma cópia).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import { inspectionLedgerErrors } from "./inspection-ledger.mjs";

export const CONTRACTS_DIR = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_BASE = "https://govbr-eval.invalid/contracts/";

export const CONTRACT_NAMES = [
  "campaign.v1", "run.v1", "findings.v1", "findings.v2", "isolation.v1", "artifact-manifest.v1", "artifact-manifest.v2",
  "baseline.v1", "snapshot-manifest.v1", "analysis-binding.v1",
] as const;
export type ContractName = typeof CONTRACT_NAMES[number];

// ───────────────────────────────────────────────────────────────── estados

export type LifecycleState = "planned" | "preparing" | "preflight" | "running" | "collected" | "archived"
  | "failed" | "interrupted" | "not-started";
export type Stage = "preparing" | "preflight" | "running" | "collecting" | "archiving";
export type TechnicalStatus = "passed" | "failed" | "interrupted" | "not-run";
export type IsolationStatus = "passed" | "failed" | "unverified";
export type ProtocolStatus = "adherent" | "non-adherent" | "unverified" | "not-applicable";
export type OracleUsage = "absent-verified" | "used-adherent" | "available-unused" | "used-with-errors" | "unverified" | "not-applicable";
export type ScoreStatus = "not-prepared" | "pending-review" | "provisional" | "final" | "not-applicable";
export type FailureReason = "preflight-failed" | "isolation-failed" | "rate-limited" | "auth-failed" | "model-unavailable"
  | "timeout" | "cancelled" | "output-empty" | "output-malformed" | "output-refused" | "no-submission"
  | "vm-lost" | "archive-unavailable" | "harness-error";
export type Arm = "sem" | "com";

// ───────────────────────────────────────────────────────────────── comuns

export type Sha256 = string;
/** Caminho relativo dentro do pacote (sem `..`, sem barra inicial). */
export type PackagePath = string;
export type UtcTimestamp = string;

export type Location =
  | { kind: "package-path"; path: PackagePath; note?: string }
  | { kind: "archive-repo"; repo: string; path: PackagePath; commit?: string; note?: string }
  | { kind: "git-commit-path"; repo: string; commit: string; path: PackagePath; note?: string }
  | { kind: "external-store"; uri: string; note?: string };
export interface RecoverableObject { sha256: Sha256; bytes: number; location: Location }
export interface Screen { id: string; label: string; version: string }
export interface Limits { timeoutSeconds: number; maxTurns: number | null; maxBudgetUsd: number | null }
export type Metric =
  | { value: number; status: "measured"; source: string }
  | { value: null; status: "unavailable" | "not-applicable"; source?: string };
export interface OracleIdentity {
  package: string; version: string; distSha256: Sha256; dataSha256: Sha256;
  profile: "normative" | "deterministic" | "evidence" | "combined";
}

// ───────────────────────────────────────────────────────────────── documentos

interface Doc<C extends ContractName> { contract: C; fixture: boolean }

export interface Campaign extends Doc<"campaign.v1"> {
  campaignId: string; kind: "pilot" | "formal"; title: string; objective: string; hypotheses: string[];
  createdAt: UtcTimestamp; frozenAt: UtcTimestamp | null;
  design: {
    screens: Screen[]; arms: Arm[]; models: { family: string; requested: string }[]; effort: string;
    repetitions: number; order: "sequencial" | "alternado" | "balanceado" | "aleatorio"; seed: number | null;
  };
  fixed: {
    protocolSha256: Sha256; client: { name: string; version: string };
    provider: { name: string; authMethod: "api-key" | "oauth-subscription" | "unknown" };
    browser: { name: string; version: string }; playwrightMcp: string; isolationPolicyVersion: string;
    oracle: OracleIdentity; scorerVersion: string;
  };
  limits: Limits;
  retryPolicy: { maxAttemptsPerSlot: number; campaignAttemptCeiling: number; retryOn: FailureReason[]; attemptSelection: string };
  failurePolicy: string;
  baselinePolicy: {
    required: true; comparable: string[]; diagnosticOnly: string[];
    plannedAbsences: { screenId: string; justification: string; declaredAt: UtcTimestamp; analysisPath: "individual" }[];
  };
  analysisPlan: { primaryOutcome: string; secondaryOutcomes: string[]; uncertaintyMethod: string | null; exclusionRules: string };
  budget: { approved: boolean; amount: number | null; currency: string | null; approvedBy: string | null; approvedAt: UtcTimestamp | null };
  pendingDecisions?: { topic: string; issue: string; owner: string }[];
}

export interface Run extends Doc<"run.v1"> {
  campaignId: string; slotId: string; pairId: string; runId: string; attempt: number; idempotencyKey: string;
  screen: Screen; arm: Arm; repetition: number;
  model: { family: string; requested: string; resolved: string; resolvedSource: "provider-response" | "client-log" | "unknown"; resolvedEvidence: PackagePath | null };
  provider: { name: string; authMethod: "api-key" | "oauth-subscription" | "unknown" };
  effort: string;
  client: { name: string; version: string };
  browser: { name: string; version: string; headless: boolean };
  versions: { protocolSha256: Sha256; promptSha256: Sha256; skillSha256: Sha256; harnessCommit: string; siteManifestSha256: Sha256; playwrightMcp: string };
  intervention: { oracle: OracleIdentity | null };
  limits: Limits;
  isolationPolicyVersion: string;
  timestamps: { plannedAt: UtcTimestamp; startedAt: UtcTimestamp | null; finishedAt: UtcTimestamp | null };
  lifecycle: { state: LifecycleState; stage: Stage | null };
  status: { technical: TechnicalStatus; isolation: IsolationStatus; protocol: ProtocolStatus; oracleUsage: OracleUsage; score: ScoreStatus };
  failure: { stage: Stage; reason: FailureReason; detail: string } | null;
  submission: { status: "accepted" | "refused" | "none"; findings: PackagePath | null; refusal: { reason: string; archivedBody: PackagePath } | null };
  usage: Record<"wallClockSeconds" | "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheCreationTokens" | "turns"
    | "toolCalls" | "oracleCalls" | "estimatedCostUsd" | "billedCostUsd", Metric>;
  artifactManifest: PackagePath;
  isolation: PackagePath | null;
}

/** Espelha FlowFinding (types.ts) no contrato achado-2 de scripts/flow-contract.ts. */
export interface AgentFinding {
  selector: string; relatedSelectors?: string[]; rule: string | null; observed: string; expected: string;
  description?: string; state: { viewport: { width: number; height: number }; steps: string[] }; evidence: string[];
}
export interface Findings extends Doc<"findings.v1"> {
  campaignId: string; runId: string; receivedAt: UtcTimestamp; receipt: string; findingContract: "achado-2";
  report: { timestamp: string; model: string; appUrl: string; scope?: string[]; notes?: string; findings: AgentFinding[] };
}

/**
 * NAT-81 — registro de inspeção (inspection.v1.schema.json), DECLARADO pelo agente e comum aos dois
 * braços. Não é documento com `contract` próprio: a versão vem do envelope (`inspectionContract`), que
 * o harness escolhe. Comprovação por evento de ferramenta é derivada depois (scripts/inspection-ledger.ts).
 */
export type InspectionOrigin = "browser" | "validation-tool";
export interface InspectionStep {
  action: "load" | "navigate" | "click" | "fill" | "press" | "select" | "hover" | "focus" | "scroll" | "wait" | "other";
  target?: string; value?: string; note?: string;
}
export interface InspectionLedger {
  completion: "complete" | "partial";
  regions: { id: string; description: string; selector?: string; origin: InspectionOrigin; originRef?: string;
    status: "inspected" | "partial" | "not-inspected"; reason?: string; states: string[] }[];
  states: { id: string; url: string; viewport: { width: number; height: number }; recipe: InspectionStep[];
    arrival: { status: "confirmed" | "declared" | "not-reached"; observables: string[]; originRef?: string; reason?: string };
    evidence: string[] }[];
  items: { id: string; state: string; region?: string; subject: string; check: string;
    status: "completed" | "failed" | "not-available" | "omitted"; reason?: string; evidence: string[] }[];
  candidates: { id: string; state: string; origin: InspectionOrigin; originRef?: string; subject: string; observation: string;
    decision: "accepted" | "rejected" | "uncertain"; reason?: string; findings?: number[]; evidence: string[] }[];
  limitations: { kind: "budget" | "tool-failure" | "unreachable" | "truncated" | "out-of-scope" | "other"; detail: string }[];
}
export const INSPECTION_CONTRACT = "inspection.v1" as const;

/** findings.v2 (NAT-81): o envelope de findings.v1 + `report.inspection` opcional. O achado é o mesmo achado-2. */
export interface FindingsV2 extends Doc<"findings.v2"> {
  campaignId: string; runId: string; receivedAt: UtcTimestamp; receipt: string; findingContract: "achado-2";
  inspectionContract: typeof INSPECTION_CONTRACT;
  /**
   * Escrito pelo coletor. `invalid`: o registro falhou no contrato, saiu de `report` e ficou em
   * `inspectionRaw` com `inspectionErrors`; os achados foram aceitos assim mesmo.
   */
  inspectionStatus: "valid" | "invalid" | "absent";
  inspectionErrors?: string[];
  inspectionRaw?: unknown;
  report: Findings["report"] & { inspection?: InspectionLedger };
}
/** Qualquer envelope de achados que os leitores aceitam (v1 histórico, v2 novo). */
export type AnyFindings = Findings | FindingsV2;
export const FINDINGS_CONTRACTS = ["findings.v1", "findings.v2"] as const;
export type FindingsContract = typeof FINDINGS_CONTRACTS[number];

export interface Isolation extends Doc<"isolation.v1"> {
  campaignId: string; runId: string; policyVersion: string; producedBy: "harness"; producedAt: UtcTimestamp;
  result: IsolationStatus;
  checks: { id: string; category: "integrity" | "sentinel" | "network" | "tools" | "state" | "tool-errors"; target: string;
    required: boolean; outcome: "passed" | "failed" | "not-exercised"; evidence: PackagePath | null; detail?: string }[];
  positiveControls: { id: string; target: string; outcome: "passed" | "failed"; evidence: PackagePath | null }[];
  toolInventory: { announced: string[]; observed: string[]; oracleAnnounced: boolean };
  capabilitiesObserved: string[]; notExercised: string[]; limitations: string[];
}

export interface ArtifactManifest extends Doc<"artifact-manifest.v1"> {
  campaignId: string; runId: string; producedBy: string; producedAt: UtcTimestamp;
  schemaVersions: { run: "run.v1"; findings?: "findings.v1"; isolation?: "isolation.v1" };
  files: { path: PackagePath; bytes: number; sha256: Sha256; mediaType: string;
    role: "run" | "findings" | "isolation" | "tool-events" | "evidence" | "summary" | "log" | "refusal" | "model-identity" | "other" }[];
}
/** artifact-manifest.v2 (NAT-81): só existe porque v1 trava `findings.v1`. Escrito quando o envelope é findings.v2. */
export interface ArtifactManifestV2 extends Doc<"artifact-manifest.v2"> {
  campaignId: string; runId: string; producedBy: string; producedAt: UtcTimestamp;
  schemaVersions: { run: "run.v1"; findings: "findings.v2"; inspection?: typeof INSPECTION_CONTRACT; isolation?: "isolation.v1" };
  /** Igual ao `inspectionStatus` de findings.json (registro inválido fica visível sem abrir o envelope). */
  inspectionStatus: FindingsV2["inspectionStatus"];
  /** Como v1, mais `tool-payload` (NAT-82): texto integral de um lado de chamada cortado na projeção da ponte. */
  files: (Omit<ArtifactManifest["files"][number], "role"> & { role: ArtifactManifest["files"][number]["role"] | "tool-payload" })[];
}
export type AnyArtifactManifest = ArtifactManifest | ArtifactManifestV2;
export const ARTIFACT_MANIFEST_CONTRACTS = ["artifact-manifest.v1", "artifact-manifest.v2"] as const;

export interface SnapshotLink { snapshotSetId: string; itemId: string; sha256: Sha256 }
/** Envelope de arquivo de um FlowBaselines (scripts/run-baselines-flow.ts). */
export interface Baseline extends Doc<"baseline.v1"> {
  baselineId: string; campaignId: string; screen: Screen; attempt: number; rerunOf: string | null; rerunReason: string | null;
  producer: { script: "scripts/run-baselines-flow.ts"; baselineVersion: string };
  scope: "bateria"; status: "complete" | "failed"; error: string | null; raw: RecoverableObject;
  timestamps: { startedAt: UtcTimestamp; finishedAt: UtcTimestamp | null };
  links: { collectionManifest: RecoverableObject; site: SnapshotLink; reference: SnapshotLink; statePlan: SnapshotLink };
  /** = ExecutableIdentity de scripts/collection-manifest.ts. */
  identity: { collection: string; referenceSha256: Sha256; siteManifestSha256: Sha256; oracleDistSha256: Sha256; oracleDataSha256: Sha256; statePlanSha256: Sha256 };
  comparable: string[]; diagnosticOnly: string[];
  eslint: { status: "measured" | "absent"; absentReason: string | null };
}

export interface SnapshotManifest extends Doc<"snapshot-manifest.v1"> {
  snapshotSetId: string; createdAt: UtcTimestamp;
  items: { id: string; kind: "site" | "reference" | "state-plan" | "instrument" | "oracle" | "lockfile" | "scorer";
    description: string; sha256: Sha256; bytes: number; location: Location; immutable: true; exposedToAgent: false; version?: string }[];
}

export type BaselineBinding =
  | { mode: "used"; baselineId: string; record: RecoverableObject; designatedBattery: string | null; choiceJustification: string | null }
  | { mode: "planned-absence"; justification: string; declaredAt: UtcTimestamp; declaredIn: { campaignId: string; campaignSha256: Sha256 } }
  | { mode: "blocked"; cause: "baseline-failed" | "missing-unplanned" | "incompatible"; detail: string };
export interface AnalysisMetrics {
  referenceUnits: number | null; confirmedReferenceUnits: number | null; recall: number | null; precision: number | null;
  incorrectClaims: number | null; newCorrect: number | null; pending: number | null;
}
export interface AnalysisBinding extends Doc<"analysis-binding.v1"> {
  analysisId: string; campaignId: string; createdAt: UtcTimestamp; kind: "individual" | "composite"; screen: Screen;
  runs: { runId: string; arm: Arm; artifactManifest: RecoverableObject }[];
  collectionStartedAt: UtcTimestamp;
  snapshots: { snapshotSetId: string; manifest: RecoverableObject };
  reference: { snapshotItemId: string; version: string; sha256: Sha256 };
  scorer: { version: string; acceptancePolicy: string; scorerSha256: Sha256 };
  baseline: BaselineBinding;
  compatibility: { source: "scripts/analysis-manifest.ts"; analysisManifest: RecoverableObject | null };
  status: "ready" | "blocked"; blockedReason: string | null; scoreStatus: ScoreStatus; metrics: AnalysisMetrics;
}

export type ContractDocument = Campaign | Run | Findings | FindingsV2 | Isolation | ArtifactManifest | ArtifactManifestV2 | Baseline | SnapshotManifest | AnalysisBinding;

// ───────────────────────────────────────────────────────────────── validador

/** Um problema: caminho JSON (`/a/b`), palavra-chave do schema (ou `x-…` para regra própria) e mensagem. */
export interface ContractError { path: string; keyword: string; message: string; missingProperty?: string }
export interface ValidationResult { contract: ContractName | null; valid: boolean; errors: ContractError[] }

let compiled: Map<ContractName, ValidateFunction> | null = null;

function validators(): Map<ContractName, ValidateFunction> {
  if (compiled) return compiled;
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, strictRequired: false, allowUnionTypes: true });
  for (const file of readdirSync(CONTRACTS_DIR).filter(f => f.endsWith(".schema.json"))) {
    ajv.addSchema(JSON.parse(readFileSync(join(CONTRACTS_DIR, file), "utf8")) as object);
  }
  compiled = new Map(CONTRACT_NAMES.map(name => {
    const fn = ajv.getSchema(`${SCHEMA_BASE}${name}.schema.json`);
    if (!fn) throw new Error(`Schema ausente: ${name}.schema.json`);
    return [name, fn] as const;
  }));
  return compiled;
}

const fromAjv = (errors: ErrorObject[] | null | undefined): ContractError[] =>
  (errors ?? []).map(e => {
    const missing = (e.params as { missingProperty?: unknown }).missingProperty;
    return { path: e.instancePath, keyword: e.keyword, message: e.message ?? e.keyword,
      ...(typeof missing === "string" ? { missingProperty: missing } : {}) };
  });

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** Regras que o schema não expressa. Só rodam sobre documento já válido no schema. */
function semanticErrors(doc: ContractDocument): ContractError[] {
  const errors: ContractError[] = [];
  const duplicates = (values: string[], at: (i: number) => string, what: string) => {
    const seen = new Set<string>();
    values.forEach((v, i) => {
      if (seen.has(v)) errors.push({ path: at(i), keyword: "x-unique", message: `${what} repetido: ${v}` });
      seen.add(v);
    });
  };
  switch (doc.contract) {
    case "artifact-manifest.v1":
    case "artifact-manifest.v2":
      duplicates(doc.files.map(f => f.path), i => `/files/${i}/path`, "caminho");
      break;
    case "findings.v2":
      // Registro inválido já saiu de `report` (fica em inspectionRaw); as regras valem para o registro aceito.
      errors.push(...inspectionLedgerErrors(doc.report, "/report"));
      break;
    case "snapshot-manifest.v1":
      duplicates(doc.items.map(i => i.id), i => `/items/${i}/id`, "id de item");
      break;
    case "baseline.v1": {
      const pairs: [keyof Baseline["links"], keyof Baseline["identity"]][] = [
        ["site", "siteManifestSha256"], ["reference", "referenceSha256"], ["statePlan", "statePlanSha256"],
      ];
      for (const [link, field] of pairs) {
        const linked = (doc.links[link] as SnapshotLink).sha256;
        if (linked !== doc.identity[field]) {
          errors.push({ path: `/links/${link}/sha256`, keyword: "x-identity-link", message: `vínculo ${link} não coincide com identity.${field}` });
        }
      }
      break;
    }
    case "analysis-binding.v1":
      if (doc.baseline.mode === "planned-absence" && !(Date.parse(doc.baseline.declaredAt) < Date.parse(doc.collectionStartedAt))) {
        errors.push({ path: "/baseline/declaredAt", keyword: "x-planned-absence-after-collection",
          message: "ausência de linha de base só é planejada se declarada antes do início da coleta; depois disso é falha ou bloqueio" });
      }
      duplicates(doc.runs.map(r => r.runId), i => `/runs/${i}/runId`, "runId");
      break;
    case "campaign.v1":
      duplicates(doc.design.screens.map(s => s.id), i => `/design/screens/${i}/id`, "tela");
      for (const [i, a] of doc.baselinePolicy.plannedAbsences.entries()) {
        if (!doc.design.screens.some(s => s.id === a.screenId)) {
          errors.push({ path: `/baselinePolicy/plannedAbsences/${i}/screenId`, keyword: "x-unknown-screen", message: `tela ${a.screenId} fora do desenho` });
        }
        if (doc.frozenAt && !(Date.parse(a.declaredAt) <= Date.parse(doc.frozenAt))) {
          errors.push({ path: `/baselinePolicy/plannedAbsences/${i}/declaredAt`, keyword: "x-planned-absence-after-freeze",
            message: "ausência planejada declarada depois do congelamento da campanha" });
        }
      }
      break;
    default:
      break;
  }
  return errors;
}

/** Valida um documento pelo seu campo `contract`. Nunca lança por conteúdo inválido. */
export function validateContract(doc: unknown): ValidationResult {
  const name = isRecord(doc) ? doc.contract : undefined;
  if (typeof name !== "string" || !(CONTRACT_NAMES as readonly string[]).includes(name)) {
    return { contract: null, valid: false, errors: [{ path: "/contract", keyword: "x-unknown-contract",
      message: `contrato desconhecido: ${String(name)} (conhecidos: ${CONTRACT_NAMES.join(", ")})` }] };
  }
  const contract = name as ContractName;
  const fn = validators().get(contract)!;
  if (!fn(doc)) return { contract, valid: false, errors: fromAjv(fn.errors) };
  const errors = semanticErrors(doc as ContractDocument);
  return { contract, valid: errors.length === 0, errors };
}

/** Como `validateContract`, mas lança com a lista de problemas. Para fronteiras (coletor, análise, publicação). */
export function assertContract<T extends ContractDocument>(doc: unknown, expected: T["contract"]): T {
  const result = validateContract(doc);
  if (result.contract !== expected) throw new Error(`Esperado ${expected}, recebido ${result.contract ?? "desconhecido"}`);
  if (!result.valid) throw new Error(`${expected} inválido: ${result.errors.map(e => `${e.path || "/"} ${e.keyword}: ${e.message}`).join("; ")}`);
  return doc as T;
}

// ───────────────────────────────────────────────────────────────── regras entre documentos

/**
 * artifact-manifest × findings.json do mesmo pacote (NAT-81): o envelope tem de ser o que o manifesto
 * declara, e `inspection` só é declarado quando o relatório aceito traz o registro.
 */
export function crossCheckManifest(manifest: AnyArtifactManifest, findings: AnyFindings | null): ContractError[] {
  const errors: ContractError[] = [];
  const declared = manifest.schemaVersions.findings ?? null;
  if (findings && declared !== findings.contract) {
    errors.push({ path: "/schemaVersions/findings", keyword: "x-findings-version", message: `manifesto declara ${declared ?? "nenhum"}, findings.json é ${findings.contract}` });
  }
  if (!findings && declared) {
    errors.push({ path: "/schemaVersions/findings", keyword: "x-findings-version", message: `manifesto declara ${declared} sem findings.json` });
  }
  if (manifest.contract === "artifact-manifest.v2" && findings?.contract === "findings.v2" && manifest.inspectionStatus !== findings.inspectionStatus) {
    errors.push({ path: "/inspectionStatus", keyword: "x-inspection-status", message: `manifesto diz ${manifest.inspectionStatus}, findings.json diz ${findings.inspectionStatus}` });
  }
  const hasLedger = findings?.contract === "findings.v2" && findings.report.inspection !== undefined;
  const declaresLedger = manifest.contract === "artifact-manifest.v2" && manifest.schemaVersions.inspection !== undefined;
  if (hasLedger !== declaresLedger) {
    errors.push({ path: "/schemaVersions/inspection", keyword: "x-inspection-version",
      message: hasLedger ? "findings.json traz registro de inspeção que o manifesto não declara" : "manifesto declara registro de inspeção ausente de findings.json" });
  }
  return errors;
}

/** run.json × findings.json × isolation.json do mesmo pacote. */
export function crossCheckRun(run: Run, findings: AnyFindings | null, isolation: Isolation | null): ContractError[] {
  const errors: ContractError[] = [];
  if (run.submission.status === "accepted" && !findings) {
    errors.push({ path: "/submission", keyword: "x-missing-findings", message: "submissão aceita sem findings.json" });
  }
  if (run.submission.status !== "accepted" && findings) {
    errors.push({ path: "/submission", keyword: "x-unexpected-findings", message: "findings.json existe, mas o run não registra submissão aceita" });
  }
  if (findings && (findings.runId !== run.runId || findings.campaignId !== run.campaignId)) {
    errors.push({ path: "/runId", keyword: "x-run-mismatch", message: "findings.json pertence a outro run" });
  }
  if (isolation) {
    if (isolation.runId !== run.runId || isolation.campaignId !== run.campaignId) {
      errors.push({ path: "/runId", keyword: "x-run-mismatch", message: "isolation.json pertence a outro run" });
    }
    if (isolation.result !== run.status.isolation) {
      errors.push({ path: "/status/isolation", keyword: "x-isolation-mismatch", message: `run diz ${run.status.isolation}, isolation.json diz ${isolation.result}` });
    }
    if (run.arm === "sem" && isolation.toolInventory.oracleAnnounced) {
      errors.push({ path: "/arm", keyword: "x-oracle-in-sem", message: "oráculo anunciado ao cliente no braço sem" });
    }
    if (run.status.oracleUsage === "absent-verified" && isolation.toolInventory.oracleAnnounced) {
      errors.push({ path: "/status/oracleUsage", keyword: "x-oracle-in-sem", message: "absent-verified com oráculo no inventário" });
    }
  } else if (run.status.isolation !== "unverified") {
    errors.push({ path: "/status/isolation", keyword: "x-missing-isolation", message: "estado de isolamento sem isolation.json que o sustente" });
  }
  return errors;
}

/**
 * Ausência planejada de linha de base: tem de estar na campanha, para a mesma tela, com o mesmo
 * texto, declarada antes da coleta e só no caminho individual. Falha ou incompatibilidade nunca vira
 * ausência planejada.
 */
export function checkPlannedAbsence(campaign: Campaign, campaignSha256: Sha256, binding: AnalysisBinding): ContractError[] {
  if (binding.baseline.mode !== "planned-absence") return [];
  const b = binding.baseline;
  const errors: ContractError[] = [];
  if (b.declaredIn.campaignId !== campaign.campaignId || b.declaredIn.campaignSha256 !== campaignSha256) {
    errors.push({ path: "/baseline/declaredIn", keyword: "x-campaign-mismatch", message: "a ausência aponta para outra campanha (ou outra versão dela)" });
  }
  const declared = campaign.baselinePolicy.plannedAbsences.find(a =>
    a.screenId === binding.screen.id && a.justification === b.justification && a.declaredAt === b.declaredAt);
  if (!declared) {
    errors.push({ path: "/baseline", keyword: "x-absence-not-planned", message: `a campanha não declara ausência de linha de base para ${binding.screen.id} com esta justificativa` });
  }
  if (binding.kind !== "individual") {
    errors.push({ path: "/kind", keyword: "x-absence-composite", message: "análise composta exige linha de base completa e compatível" });
  }
  return errors;
}

// ───────────────────────────────────────────────────────────────── chave de comparação

/**
 * Tudo o que tem de ser igual para duas execuções entrarem na mesma comparação. O braço e o
 * componente normativo da intervenção (`intervention.oracle`) ficam DE FORA: são a diferença prevista.
 * Referência e scorer vêm da análise; o resto, do run.
 */
export function comparisonKeyOf(run: Run, binding: AnalysisBinding): Record<string, string> {
  return {
    "screen.id": run.screen.id,
    "screen.version": run.screen.version,
    "versions.protocolSha256": run.versions.protocolSha256,
    "versions.promptSha256": run.versions.promptSha256,
    "versions.skillSha256": run.versions.skillSha256,
    "versions.siteManifestSha256": run.versions.siteManifestSha256,
    "client.name": run.client.name,
    "client.version": run.client.version,
    "model.requested": run.model.requested,
    "model.resolved": run.model.resolved,
    "provider.name": run.provider.name,
    "provider.authMethod": run.provider.authMethod,
    effort: run.effort,
    "browser.name": run.browser.name,
    "browser.version": run.browser.version,
    "browser.headless": String(run.browser.headless),
    "versions.playwrightMcp": run.versions.playwrightMcp,
    limits: JSON.stringify(run.limits),
    isolationPolicyVersion: run.isolationPolicyVersion,
    "reference.sha256": binding.reference.sha256,
    "reference.version": binding.reference.version,
    "scorer.version": binding.scorer.version,
    "scorer.scorerSha256": binding.scorer.scorerSha256,
    "scorer.acceptancePolicy": binding.scorer.acceptancePolicy,
  };
}

export interface AggregationCheck { ok: boolean; problems: string[]; warnings: string[] }

/**
 * Pode agregar? Bloqueia qualquer diferença fora do desenho (chave de comparação) e oráculos
 * diferentes DENTRO do braço com — mesma régua de DIMENSOES_TODAS / DIMENSOES_POR_BRACO em
 * scripts/analysis-manifest.ts. `model.resolved: "unknown"` em todos é aceito com aviso: a
 * identidade fica só pelo ID pedido.
 */
export function checkAggregation(entries: { run: Run; binding: AnalysisBinding }[]): AggregationCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (entries.length === 0) return { ok: false, problems: ["nenhuma execução"], warnings };
  const keys = entries.map(e => comparisonKeyOf(e.run, e.binding));
  for (const field of Object.keys(keys[0])) {
    const values = [...new Set(keys.map(k => k[field]))];
    if (values.length > 1) problems.push(`${field} difere: ${entries.map((e, i) => `${e.run.runId}=${keys[i][field]}`).join(", ")}`);
  }
  const oracles = [...new Set(entries.filter(e => e.run.arm === "com").map(e => JSON.stringify(e.run.intervention.oracle)))];
  if (oracles.length > 1) problems.push("intervention.oracle difere entre execuções do braço com");
  for (const e of entries) {
    if (e.run.fixture !== entries[0].run.fixture) problems.push(`fixture misturada com dado real (${e.run.runId})`);
    if (e.binding.runs.every(r => r.runId !== e.run.runId)) problems.push(`${e.run.runId} não consta da análise ${e.binding.analysisId}`);
  }
  if (keys.every(k => k["model.resolved"] === "unknown")) {
    warnings.push("model.resolved é unknown em todas as execuções: mesma identidade presumida só pelo ID pedido");
  }
  return { ok: problems.length === 0, problems, warnings };
}
