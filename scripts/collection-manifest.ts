/**
 * Manifesto de coleta — checklist v02, fatia 6.
 *
 * O que identifica uma medida não é a versão declarada de nada: é o BYTE do que rodou. Até aqui o
 * runner carimbava `validatorVersion` e conferia que `dist/index.js` existia — duas coisas que
 * continuam verdadeiras depois de um `npm run build` que mudou o comportamento inteiro do oráculo.
 *
 * Três identidades, separadas pelo MOMENTO em que existem:
 *   coleta    — antes da primeira execução: oráculo compilado e sua base, página congelada, gabarito,
 *               plano de estados/janelas, agenda, ambiente. É o que este manifesto congela.
 *   análise   — o código de pontuação e os aliases; registrado aqui só como "o que estava instalado",
 *               e conferido de novo no pacote semântico, que é quem o usa.
 *   decisões  — as da autora, que só existem depois; moram no `reviews.json` do pacote e entram no
 *               resultado pelo `reviewHash`. Nada delas aparece aqui.
 *
 * Comparação é feita sobre a identidade EFETIVA (hash do compilado, da base, da página, do
 * gabarito e do plano de estados). Commit e árvore suja são proveniência: duas árvores sujas podem
 * ser diferentes, então `dirty` nunca substitui um hash.
 *
 * CLI, para o runner em PowerShell:
 *   tsx scripts/collection-manifest.ts build --out-dir NOVO_DIR --site-manifest ARQ --surface ARQ
 *       --plan ARQ --client NOME --client-version VER [--oracle-built] [--no-archive]
 *   tsx scripts/collection-manifest.ts verify --manifest ARQ
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { ROOT } from "./adjudication";
import { FLOW_INSTRUMENT_VERSION, FLOW_SCORING_VERSION, FLOW_ACCEPTANCE_POLICY_VERSION, FLOW_REFERENCE_FILE } from "./instrument";
import { SCORER_FILES, digest } from "./semantic-flow";
import { VIEWPORT_PADRAO } from "./anchors";

export const COLLECTION_MANIFEST_VERSION = "manifesto-coleta-1.0.0";
export const COLLECTION_PLAN_VERSION = "plano-bateria-1.0.0";

const TCC_ROOT = resolve(ROOT, "..");
export const VALIDATOR_ROOT = join(TCC_ROOT, "govbr-ds-validator");
const CORPUS_ROOT = join(TCC_ROOT, "govbr-corpus");
const VALIDATOR_DATA_FILES = ["component-specs.json", "ds-page-rules.json", "emag.json", "tokens.json", "wcag-2.2.json"];

export const sha256 = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

export function sha256File(path: string): string | null {
  return existsSync(path) ? sha256(readFileSync(path)) : null;
}

/**
 * Hash de uma árvore inteira: caminho relativo + conteúdo de cada arquivo, em ordem estável. Um
 * `dist/` recompilado com outro código muda o hash mesmo que a versão do package.json não ande.
 */
export function sha256Tree(dir: string): { sha256: string; files: number; bytes: number } | null {
  if (!existsSync(dir)) return null;
  const entries: string[] = [];
  let bytes = 0;
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const body = readFileSync(full);
      bytes += body.length;
      entries.push(`${relative(dir, full).replace(/\\/g, "/")}:${sha256(body)}`);
    }
  };
  walk(dir);
  return { sha256: sha256(entries.join("\n")), files: entries.length, bytes };
}

/** Falha do Git fica registrada como falha, não como "sem commit". */
export function gitState(repo: string): { commit: string | null; dirty: boolean | null; error?: string } {
  try {
    const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const status = execFileSync("git", ["-C", repo, "status", "--porcelain"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { commit, dirty: status.length > 0 };
  } catch (error) {
    return { commit: null, dirty: null, error: (error instanceof Error ? error.message : String(error)).split("\n")[0] };
  }
}

// ───────────────────────────────────────────────────────────────── identidades parciais

export interface ReferenceIdentity {
  /** `_meta.version` do gabarito — o DADO de referência, não o contrato (D-31). */
  version: string;
  /** sha256 do arquivo inteiro: uma unidade acrescentada muda o hash mesmo sem mexer na versão. */
  sha256: string;
  file: string;
  units: number;
  specs: number;
}

export function referenceIdentity(path = join(ROOT, FLOW_REFERENCE_FILE)): ReferenceIdentity | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path);
  const gt = JSON.parse(raw.toString("utf8")) as {
    _meta: { version: string };
    violations: { scope?: string; expectedCount?: number }[];
  };
  const units = gt.violations.reduce((total, spec) => total + (spec.scope === "todos" ? (spec.expectedCount ?? 1) : 1), 0);
  return { version: gt._meta.version, sha256: sha256(raw), file: relative(ROOT, path).replace(/\\/g, "/"), units, specs: gt.violations.length };
}

export interface StatePlan {
  /** Janela padrão do gabarito e as janelas extras que alguma spec declara (D-35). */
  padrao: { width: number; height: number };
  extras: { viewport: { width: number; height: number }; specs: string[] }[];
  /** Sequência que leva a página ao estado medido; a mesma para todas as janelas. */
  setup: unknown[];
  waitFor: string | null;
  url: string;
}

/** Plano de estados declarado pelo gabarito: o que a coleta e as linhas de base se propõem a observar. */
/**
 * A bateria entregue tem de ser a bateria PLANEJADA, slot a slot (fatia 5).
 *
 * A regra que isto encarna: não se roda o agente de novo para trocar uma saída difícil, falha ou de
 * pontuação baixa. A fatia 6 já conferia a CONTAGEM de slots, e contagem não distingue "as duas
 * execuções planejadas" de "o slot 1 rodado duas vezes, ficando com a melhor". Os slots planejados
 * vêm do manifesto de coleta, cuja identidade já foi conferida — nunca de um segundo arquivo, para
 * que não haja duas fontes da mesma verdade.
 */
export function checkPlanConformity(
  execucoes: { slot?: number; arm: string }[],
  slots: { slot: number; arm: string }[],
): void {
  if (execucoes.length !== slots.length) {
    throw new Error(`Battery accounts for ${execucoes.length} of ${slots.length} planned slots`);
  }
  const entregues = execucoes.map(e => e.slot);
  if (entregues.some(s => s === undefined)) {
    throw new Error("Battery run without a slot: cannot be checked against the frozen plan");
  }
  if (new Set(entregues).size !== entregues.length) {
    throw new Error("The same plan slot was collected more than once. Do not rerun an agent to replace an output; follow the frozen retry policy.");
  }
  for (const e of execucoes) {
    const planejado = slots.find(s => s.slot === e.slot);
    if (!planejado) throw new Error(`Run outside the frozen plan (slot ${e.slot}): the plan is frozen before collection`);
    if (planejado.arm !== e.arm) {
      throw new Error(`Slot ${e.slot} was planned for arm "${planejado.arm}" and collected as "${e.arm}"`);
    }
  }
}

export function statePlanOf(gt: {
  _meta: { url: string; viewport?: { width: number; height: number }; setup?: unknown[]; waitFor?: string };
  violations: { id: string; viewport?: { width: number; height: number } }[];
}): StatePlan {
  const padrao = gt._meta.viewport ?? VIEWPORT_PADRAO;
  const grupos = new Map<string, { viewport: { width: number; height: number }; specs: string[] }>();
  for (const spec of gt.violations) {
    if (!spec.viewport) continue;
    if (spec.viewport.width === padrao.width && spec.viewport.height === padrao.height) continue;
    const chave = `${spec.viewport.width}x${spec.viewport.height}`;
    const grupo = grupos.get(chave) ?? { viewport: { width: spec.viewport.width, height: spec.viewport.height }, specs: [] };
    grupo.specs.push(spec.id);
    grupos.set(chave, grupo);
  }
  return {
    padrao: { width: padrao.width, height: padrao.height },
    extras: [...grupos.values()],
    setup: gt._meta.setup ?? [],
    waitFor: gt._meta.waitFor ?? null,
    url: gt._meta.url,
  };
}

export interface OracleIdentity {
  version: string | null;
  distSha256: string | null;
  distFiles: number | null;
  /** Fonte e configuração de compilação; o preflight compila a partir delas imediatamente antes. */
  sourceSha256: string | null;
  /** `data/` inteiro, inclusive a base de conhecimento. */
  dataSha256: string | null;
  knowledgeSha256: string | null;
  dataFiles: Record<string, string | null>;
  builtInPreflight: boolean;
}

export function oracleIdentity(root = VALIDATOR_ROOT, builtInPreflight = false): OracleIdentity {
  const pkgPath = join(root, "package.json");
  const pkg = existsSync(pkgPath) ? (JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string }) : null;
  const dist = sha256Tree(join(root, "dist"));
  const src = sha256Tree(join(root, "src"));
  const tsconfig = sha256File(join(root, "tsconfig.json"));
  const dataFiles: Record<string, string | null> = {};
  for (const asset of VALIDATOR_DATA_FILES) dataFiles[asset] = sha256File(join(root, "data", asset));
  return {
    version: pkg?.version ?? null,
    distSha256: dist?.sha256 ?? null,
    distFiles: dist?.files ?? null,
    sourceSha256: src && tsconfig ? sha256(`${src.sha256}\ntsconfig.json:${tsconfig}`) : null,
    dataSha256: sha256Tree(join(root, "data"))?.sha256 ?? null,
    knowledgeSha256: sha256Tree(join(root, "data", "knowledge"))?.sha256 ?? null,
    dataFiles,
    builtInPreflight,
  };
}

/** Código e vocabulário que decidem o que um pacote significa — o mesmo conjunto que o pacote confere. */
export function analysisIdentity(): { scoringVersion: string; acceptancePolicy: string; scorerSha256: string;
  checkerAliasesSha256: string | null; kbAliasesSha256: string | null } {
  return {
    scoringVersion: FLOW_SCORING_VERSION,
    acceptancePolicy: FLOW_ACCEPTANCE_POLICY_VERSION,
    scorerSha256: digest(SCORER_FILES.map(path => [path, readFileSync(join(ROOT, path), "utf8")])),
    checkerAliasesSha256: sha256File(join(ROOT, "checker-aliases.json")),
    kbAliasesSha256: sha256File(join(ROOT, "kb-aliases.json")),
  };
}

// ───────────────────────────────────────────────────────────────── plano

/** Agenda congelada antes da coleta. O runner escreve; aqui só se confere o formato. */
export interface CollectionPlan {
  planVersion: string;
  stamp: string;
  schedule: "alternado" | "sequencial";
  /** Semente só existe quando há sorteio. A agenda alternada é determinística. */
  seed: null;
  attemptBudget: number;
  retryPolicy: string;
  failurePolicy: string;
  arms: string[];
  runsPerArm: number;
  model: string;
  reasoningEffort: string;
  oracleProfile: string;
  provider: string;
  scope: string;
  suite: string;
  slots: { slot: number; arm: string; repetition: number; block: number }[];
}

export function planProblems(plan: CollectionPlan | null): string[] {
  if (!plan) return ["plano ausente"];
  const problems: string[] = [];
  if (plan.planVersion !== COLLECTION_PLAN_VERSION) problems.push(`plano: versão ${plan.planVersion}, esperada ${COLLECTION_PLAN_VERSION}`);
  if (!Array.isArray(plan.slots) || plan.slots.length === 0) problems.push("plano sem slots");
  else {
    if (plan.slots.length !== plan.arms.length * plan.runsPerArm) problems.push("plano: slots ≠ braços × repetições");
    if (plan.attemptBudget !== plan.slots.length) problems.push("plano: orçamento de tentativas ≠ número de slots (retry não declarado)");
    plan.slots.forEach((slot, index) => {
      if (slot.slot !== index + 1) problems.push(`plano: slot ${index + 1} fora de ordem`);
      if (!plan.arms.includes(slot.arm)) problems.push(`plano: slot ${slot.slot} com braço desconhecido`);
    });
    const pairs = new Set(plan.slots.map(s => `${s.arm}/${s.repetition}`));
    if (pairs.size !== plan.slots.length) problems.push("plano: braço/repetição repetido");
  }
  if (!plan.retryPolicy?.trim() || !plan.failurePolicy?.trim()) problems.push("plano sem política de retry/falha");
  if (plan.seed !== null) problems.push("plano: semente declarada sem sorteio");
  return problems;
}

// ───────────────────────────────────────────────────────────────── manifesto

export interface RepoIdentity {
  commit: string | null;
  dirty: boolean | null;
  gitError?: string;
  lockSha256: string | null;
}

function repoIdentity(repo: string): RepoIdentity {
  const git = gitState(repo);
  return { commit: git.commit, dirty: git.dirty, ...(git.error ? { gitError: git.error } : {}),
    lockSha256: sha256File(join(repo, "package-lock.json")) };
}

function packageVersion(path: string): string | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as { version?: string }).version ?? null : null;
}

/** Versão do Playwright MCP tal como as configurações dos dois braços a fixam (`@playwright/mcp@X`). */
function playwrightMcpVersion(): string | null {
  const versions = ["mcp-com-oraculo.json", "mcp-sem-oraculo.json"].map(file => {
    const config = join(ROOT, "pipeline", file);
    const match = existsSync(config) ? /@playwright\/mcp@([\w.\-]+)/.exec(readFileSync(config, "utf8")) : null;
    return match ? match[1] : null;
  });
  return versions[0] && versions[0] === versions[1] ? versions[0] : null;
}

/** Versão do Chromium que o Playwright do govbr-eval abre (axe da linha de base, preparação). */
export async function evalBrowserVersion(): Promise<string | null> {
  try {
    const browser = await chromium.launch();
    try { return browser.version(); } finally { await browser.close(); }
  } catch { return null; }
}

/** Versão do Chromium que o oráculo abre, pelo Playwright instalado NO validator. */
function validatorBrowserVersion(): string | null {
  try {
    const script = "import('playwright').then(async ({ chromium }) => { const b = await chromium.launch(); " +
      "process.stdout.write(b.version()); await b.close(); })";
    return execFileSync(process.execPath, ["--input-type=module", "-e", script],
      { cwd: VALIDATOR_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 }).trim() || null;
  } catch { return null; }
}

export interface CollectionManifest {
  manifestVersion: string;
  generatedAt: string;
  collection: { version: string };
  /** Identidade que linhas de base e pacotes comparam campo a campo. */
  identity: ExecutableIdentity;
  reference: ReferenceIdentity | null;
  statePlan: StatePlan | null;
  oracle: OracleIdentity;
  site: { manifestSha256: string | null; corpusCommit: string | null; corpusDirty: boolean | null } ;
  /** Perfil efetivo de ferramentas e rede — copiado da superfície desta bateria, não do desenho. */
  surface: unknown | null;
  surfaceSha256: string | null;
  plan: CollectionPlan | null;
  planSha256: string | null;
  /** Instalado no momento da coleta; o pacote semântico confere o seu próprio no momento da análise. */
  analysisAtCollection: ReturnType<typeof analysisIdentity>;
  repos: Record<string, RepoIdentity>;
  runtime: {
    node: string;
    platform: string;
    client: { name: string | null; version: string | null };
    playwright: { eval: string | null; validator: string | null; mcp: string | null };
    browsers: { eval: string | null; validator: string | null };
    /** Declarado, não medido: o navegador do Playwright MCP é resolvido pelo npx na execução. */
    notMeasured: string[];
  };
  /** Cópias que permitem reproduzir a coleta: oráculo compilado + dados, e o gabarito. */
  archive: {
    dir: string;
    oracle: { dir: string; distSha256: string; dataSha256: string };
    reference: { path: string; sha256: string };
  } | null;
}

export interface ExecutableIdentity {
  collection: string;
  referenceSha256: string | null;
  siteManifestSha256: string | null;
  oracleDistSha256: string | null;
  oracleDataSha256: string | null;
  statePlanSha256: string | null;
}

const IDENTITY_FIELDS: (keyof ExecutableIdentity)[] = [
  "collection", "referenceSha256", "siteManifestSha256", "oracleDistSha256", "oracleDataSha256", "statePlanSha256",
];

const isHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/** Identidade incompleta não é comparável: cada campo ausente é um motivo explícito. */
export function identityProblems(label: string, identity: Partial<ExecutableIdentity> | null | undefined): string[] {
  if (!identity) return [`${label}: identidade ausente`];
  return IDENTITY_FIELDS.flatMap(field => {
    const value = identity[field];
    if (field === "collection") return typeof value === "string" && value.trim() ? [] : [`${label}: ${field} ausente`];
    return isHash(value) ? [] : [`${label}: ${field} ausente ou inválido`];
  });
}

/**
 * Divergências entre duas identidades. Lista vazia = mesma coleta. Primeiro completude, depois
 * campo a campo: dois nulos nunca contam como iguais.
 */
export function compareIdentities(expected: Partial<ExecutableIdentity> | null | undefined,
  actual: Partial<ExecutableIdentity> | null | undefined, labels = { expected: "coleta", actual: "linha de base" }): string[] {
  const incomplete = [...identityProblems(labels.expected, expected), ...identityProblems(labels.actual, actual)];
  if (incomplete.length) return incomplete;
  return IDENTITY_FIELDS.flatMap(field => expected![field] === actual![field] ? [] : [
    `${field}: ${labels.expected} ${String(expected![field]).slice(0, 12)}, ${labels.actual} ${String(actual![field]).slice(0, 12)}`,
  ]);
}

export function statePlanSha256(plan: StatePlan | null): string | null {
  return plan ? digest(plan) : null;
}

/** Campos obrigatórios de um manifesto formal. Faltou um, a bateria não parte. */
export function manifestProblems(m: CollectionManifest): string[] {
  const problems = identityProblems("identidade", m.identity);
  const need = (ok: unknown, what: string) => { if (!ok) problems.push(`${what} ausente`); };
  need(m.reference?.version, "versão do gabarito");
  need(m.oracle.version, "versão do oráculo");
  need(isHash(m.oracle.sourceSha256), "hash da fonte do oráculo");
  need(isHash(m.oracle.knowledgeSha256), "hash da base de conhecimento");
  for (const [file, hash] of Object.entries(m.oracle.dataFiles)) need(isHash(hash), `hash de data/${file}`);
  need(m.surface, "descrição da superfície");
  need(isHash(m.surfaceSha256), "hash da descrição da superfície");
  need(isHash(m.planSha256), "hash do plano");
  problems.push(...planProblems(m.plan));
  for (const [repo, identity] of Object.entries(m.repos)) {
    need(identity.commit, `commit de ${repo}${identity.gitError ? ` (${identity.gitError})` : ""}`);
    need(identity.dirty !== null, `estado da árvore de ${repo}`);
    need(isHash(identity.lockSha256), `package-lock de ${repo}`);
  }
  need(m.runtime.client.name, "nome do cliente");
  need(m.runtime.client.version && m.runtime.client.version !== "unknown", "versão do cliente");
  need(m.runtime.playwright.eval, "versão do Playwright do govbr-eval");
  need(m.runtime.playwright.validator, "versão do Playwright do oráculo");
  need(m.runtime.playwright.mcp, "versão fixada do Playwright MCP (igual nos dois braços)");
  need(m.runtime.browsers.eval, "versão do navegador do govbr-eval");
  need(m.runtime.browsers.validator, "versão do navegador do oráculo");
  need(isHash(m.analysisAtCollection.scorerSha256), "hash do código de análise");
  need(isHash(m.analysisAtCollection.checkerAliasesSha256), "hash de checker-aliases.json");
  need(isHash(m.analysisAtCollection.kbAliasesSha256), "hash de kb-aliases.json");
  if (m.site.manifestSha256 !== m.identity.siteManifestSha256) problems.push("site: hash diverge da identidade");
  return problems;
}

export async function buildCollectionManifest(options: {
  siteManifestPath: string;
  surfacePath: string;
  planPath: string;
  client: { name: string | null; version: string | null };
  oracleBuilt?: boolean;
  referencePath?: string;
}): Promise<CollectionManifest> {
  const referencePath = options.referencePath ?? join(ROOT, FLOW_REFERENCE_FILE);
  const reference = referenceIdentity(referencePath);
  const statePlan = existsSync(referencePath) ? statePlanOf(JSON.parse(readFileSync(referencePath, "utf8"))) : null;
  const oracle = oracleIdentity(VALIDATOR_ROOT, options.oracleBuilt ?? false);
  const siteBytes = existsSync(options.siteManifestPath) ? readFileSync(options.siteManifestPath) : null;
  const siteManifest = siteBytes ? JSON.parse(siteBytes.toString("utf8")) as { corpusCommit: string | null; corpusDirty: boolean | null } : null;
  const surfaceBytes = existsSync(options.surfacePath) ? readFileSync(options.surfacePath) : null;
  const surface = surfaceBytes ? JSON.parse(surfaceBytes.toString("utf8").replace(/^\uFEFF/, "")) as { siteManifestSha256?: string } : null;
  const planBytes = existsSync(options.planPath) ? readFileSync(options.planPath) : null;
  const plan = planBytes ? JSON.parse(planBytes.toString("utf8").replace(/^\uFEFF/, "")) as CollectionPlan : null;
  const siteManifestSha256 = siteBytes ? sha256(siteBytes) : null;
  if (surface && surface.siteManifestSha256 !== siteManifestSha256) {
    throw new Error("A superfície descreve outro site congelado que o manifesto do site informado.");
  }

  return {
    manifestVersion: COLLECTION_MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    collection: { version: FLOW_INSTRUMENT_VERSION },
    identity: {
      collection: FLOW_INSTRUMENT_VERSION,
      referenceSha256: reference?.sha256 ?? null,
      siteManifestSha256,
      oracleDistSha256: oracle.distSha256,
      oracleDataSha256: oracle.dataSha256,
      statePlanSha256: statePlanSha256(statePlan),
    },
    reference,
    statePlan,
    oracle,
    site: { manifestSha256: siteManifestSha256, corpusCommit: siteManifest?.corpusCommit ?? null, corpusDirty: siteManifest?.corpusDirty ?? null },
    surface,
    surfaceSha256: surfaceBytes ? sha256(surfaceBytes) : null,
    plan,
    planSha256: planBytes ? sha256(planBytes) : null,
    analysisAtCollection: analysisIdentity(),
    repos: {
      "govbr-eval": repoIdentity(ROOT),
      "govbr-ds-validator": repoIdentity(VALIDATOR_ROOT),
      "govbr-corpus": repoIdentity(CORPUS_ROOT),
    },
    runtime: {
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      client: options.client,
      playwright: {
        eval: packageVersion(join(ROOT, "node_modules", "playwright", "package.json")),
        validator: packageVersion(join(VALIDATOR_ROOT, "node_modules", "playwright", "package.json")),
        mcp: playwrightMcpVersion(),
      },
      browsers: { eval: await evalBrowserVersion(), validator: validatorBrowserVersion() },
      notMeasured: ["navegador do Playwright MCP: resolvido pelo npx dentro de cada execução; fica a versão fixada do pacote"],
    },
    archive: null,
  };
}

/**
 * Copia o que é preciso para reproduzir a coleta e confere as cópias contra o manifesto. O oráculo
 * arquivado resolve dependências pelo node_modules do validator se for recolocado lá (o lock está
 * no manifesto); o gabarito arquivado é o que a preparação do pacote usa.
 */
export function archiveCollection(manifest: CollectionManifest, dir: string, referencePath = join(ROOT, FLOW_REFERENCE_FILE)): NonNullable<CollectionManifest["archive"]> {
  const oracleDir = join(dir, "oraculo");
  mkdirSync(oracleDir, { recursive: true });
  for (const entry of ["dist", "data", "package.json", "package-lock.json"]) {
    cpSync(join(VALIDATOR_ROOT, entry), join(oracleDir, entry), { recursive: true, errorOnExist: true, force: false });
  }
  const archived = oracleIdentity(oracleDir);
  if (archived.distSha256 !== manifest.oracle.distSha256 || archived.dataSha256 !== manifest.oracle.dataSha256) {
    throw new Error("O oráculo mudou durante o arquivamento; refaça o preflight.");
  }
  const referenceTarget = join(dir, "referencia", relative(ROOT, referencePath));
  mkdirSync(dirname(referenceTarget), { recursive: true });
  cpSync(referencePath, referenceTarget, { errorOnExist: true, force: false });
  const referenceSha = sha256File(referenceTarget);
  if (referenceSha !== manifest.identity.referenceSha256) throw new Error("O gabarito mudou durante o arquivamento.");
  const rel = (path: string) => relative(ROOT, path).replace(/\\/g, "/");
  return {
    dir: rel(dir),
    oracle: { dir: rel(oracleDir), distSha256: archived.distSha256!, dataSha256: archived.dataSha256! },
    reference: { path: rel(referenceTarget), sha256: referenceSha! },
  };
}

export function readCollectionManifest(path: string): { manifest: CollectionManifest; sha256: string } {
  const bytes = readFileSync(path);
  const manifest = JSON.parse(bytes.toString("utf8")) as CollectionManifest;
  if (manifest.manifestVersion !== COLLECTION_MANIFEST_VERSION) throw new Error(`Manifesto de coleta de versão desconhecida: ${manifest.manifestVersion}`);
  const problems = manifestProblems(manifest);
  if (problems.length) throw new Error(`Manifesto de coleta incompleto: ${problems.join("; ")}`);
  return { manifest, sha256: sha256(bytes) };
}

/**
 * O que está instalado agora ainda é o que a coleta congelou? Confere oráculo compilado e dados
 * (vivos) e as cópias arquivadas. Chamado depois de cada execução: um build no meio da bateria
 * interrompe a bateria em vez de misturar dois oráculos sob a mesma identidade.
 */
export function verifyInstalledIdentity(manifest: CollectionManifest): string[] {
  const live = oracleIdentity(VALIDATOR_ROOT);
  const problems: string[] = [];
  if (live.distSha256 !== manifest.identity.oracleDistSha256) problems.push("oráculo compilado mudou desde o manifesto");
  if (live.dataSha256 !== manifest.identity.oracleDataSha256) problems.push("dados/base do oráculo mudaram desde o manifesto");
  if (manifest.archive) {
    const archived = oracleIdentity(join(ROOT, manifest.archive.oracle.dir));
    if (archived.distSha256 !== manifest.archive.oracle.distSha256 || archived.dataSha256 !== manifest.archive.oracle.dataSha256) {
      problems.push("cópia arquivada do oráculo alterada");
    }
    if (sha256File(join(ROOT, manifest.archive.reference.path)) !== manifest.archive.reference.sha256) {
      problems.push("cópia arquivada do gabarito alterada");
    }
  }
  return problems;
}

// ───────────────────────────────────────────────────────────────── CLI

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function required(args: string[], name: string): string {
  const value = argValue(args, name);
  if (!value || value.startsWith("--")) throw new Error(`Falta ${name}`);
  return value;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "verify") {
    const { manifest } = readCollectionManifest(resolve(required(args, "--manifest")));
    const problems = verifyInstalledIdentity(manifest);
    if (problems.length) throw new Error(`Identidade da coleta violada: ${problems.join("; ")}`);
    console.log("Identidade da coleta conferida: oráculo, dados e cópias arquivadas inalterados.");
    return;
  }
  if (command !== "build") {
    throw new Error("Uso: collection-manifest.ts build --out-dir NOVO_DIR --site-manifest ARQ --surface ARQ --plan ARQ " +
      "--client NOME --client-version VER [--oracle-built] [--no-archive]\n       collection-manifest.ts verify --manifest ARQ");
  }
  const outDir = resolve(required(args, "--out-dir"));
  if (existsSync(outDir)) throw new Error(`${outDir} já existe: o manifesto de cada bateria é novo.`);
  const manifest = await buildCollectionManifest({
    siteManifestPath: resolve(required(args, "--site-manifest")),
    surfacePath: resolve(required(args, "--surface")),
    planPath: resolve(required(args, "--plan")),
    client: { name: required(args, "--client"), version: required(args, "--client-version") },
    oracleBuilt: args.includes("--oracle-built"),
  });
  const problems = manifestProblems(manifest);
  if (problems.length) throw new Error(`Manifesto de coleta incompleto; nada foi gravado: ${problems.join("; ")}`);
  mkdirSync(outDir, { recursive: true });
  if (!args.includes("--no-archive")) manifest.archive = archiveCollection(manifest, outDir);
  const path = join(outDir, "manifesto.json");
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  console.log(`Manifesto de coleta: ${path}`);
  console.log(`  oráculo ${manifest.oracle.version} · dist ${manifest.identity.oracleDistSha256!.slice(0, 12)} (${manifest.oracle.distFiles} arquivos) · dados ${manifest.identity.oracleDataSha256!.slice(0, 12)}`);
  console.log(`  gabarito ${manifest.reference?.version} (${manifest.identity.referenceSha256!.slice(0, 12)}) · site ${manifest.identity.siteManifestSha256!.slice(0, 12)} · coleta ${manifest.collection.version}`);
  console.log(`  plano ${manifest.plan!.schedule}: ${manifest.plan!.slots.map(s => `${s.arm}${s.repetition}`).join(" ")}`);
  for (const [repo, identity] of Object.entries(manifest.repos)) {
    console.log(`  ${repo}: ${identity.commit!.slice(0, 8)}${identity.dirty ? " (árvore suja — o hash acima é o que identifica)" : ""}`);
  }
  console.log(`MANIFEST_SHA256=${sha256File(path)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
