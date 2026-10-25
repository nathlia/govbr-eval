/**
 * NAT-94: deterministic retrieval benchmark; never calls a model or a campaign runner.
 * npm run benchmark:oraculo -- --benchmark retrieval/benchmark-1.0.0
 *   --validator ../govbr-ds-validator --saida retrieval/baselines/<new-name>
 * --conjunto aliases --benchmark. --reserva requires an external --manifesto.
 * Manifest schema: existing version/date/kb/counts plus
 * sha256: { "queries.jsonl": "<64 hex>", "qrels.jsonl": "<64 hex>" }.
 * Hashes are required in reserve, optional for legacy development datasets; actual bytes
 * are checked before parsing queries or starting MCP. External manifests are trusted pins.
 * No query/qrel text, raw responses, errors, paths or manifest metadata leave this evaluator.
 * Missing origem stays null, reported separately without inferred provenance.
 * Query ids in reports are SHA256 pseudonyms. Development-only --pool <new-file>
 * optionally exports sorted returned ids per pseudonymous query, without text, labels or rank.
 * Pooling/relabeling needs a separately ratified method before use; this flag does not change scoring.
 * --pool is forbidden with --reserva; ordinary reports never contain returned ids.
 * Optional: --timeout-ms 30000. The server must already be built; inputs are never rewritten.
 * Qrels stay in this process. Only query/component and returned ids cross MCP.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const STRATA = ["respondivel", "sem_resposta", "ambigua", "fora_escopo", "negativa_dificil"] as const;
export type Stratum = typeof STRATA[number];
type Obj = Record<string, unknown>;
export const ORIGINS = ["busca-lexical", "observacao-real"] as const;
export type Origin = typeof ORIGINS[number];
export interface Query { origem?: Origin; id: string; query: string; component?: string; estrato: Stratum; motivo: string }
export interface Qrel { query_id: string; unit_id: string; relevance: 2 | 1 | -1; fonte: string; trecho: string; familia?: string }
export interface Dataset { queries: Query[]; qrels: Qrel[]; manifest: Obj; hashes: Record<string, string> }
export interface Unit { ids: string[]; data: Obj }
export interface Call { error?: string; latencyMs: number; characters: number }
export type Invoke = (args: Obj) => Promise<unknown>;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const object = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
export const sha256 = (v: string | Buffer): string => createHash("sha256").update(v).digest("hex");
const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const inside = (parent: string, child: string) => { const r = relative(parent, child); return r === "" || (!r.startsWith(`..${sep}`) && r !== ".." && !isAbsolute(r)); };
class DatasetLabelConflict extends Error {
  constructor() { super("DATASET_LABEL_CONFLICT"); }
}
const failureCode = (e: unknown) => e instanceof DatasetLabelConflict ? "DATASET_LABEL_CONFLICT" : "BENCHMARK_FAILED";
// Resolve existing ancestors too, so a new file through a directory link cannot target inputs.
function canonicalTarget(path: string): string {
  if (existsSync(path)) return realpathSync(path);
  const parent = dirname(path);
  if (parent === path) throw new Error("POOL_PATH_INVALID");
  return join(canonicalTarget(parent), relative(parent, path));
}

/** Hash actual file bytes, sorted paths, reject links instead of following another tree. */
export function hashTree(root: string): { sha256: string; files: Record<string, string> } {
  const files: Record<string, string> = {};
  function visit(path: string) {
    if (lstatSync(path).isSymbolicLink()) throw new Error(`Symlink in hashed inputs: ${path}`);
    if (lstatSync(path).isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(join(path, name));
    } else if (lstatSync(path).isFile()) files[relative(root, path).split(sep).join("/")] = sha256(readFileSync(path));
    else throw new Error(`Unsupported file type: ${path}`);
  }
  visit(root);
  if (!Object.keys(files).length) throw new Error(`Empty input tree: ${root}`);
  return { sha256: sha256(JSON.stringify(files)), files };
}

export function loadDataset(dir: string, options: { manifest?: string; reserve?: boolean } = {}): Dataset {
  try { return loadDatasetChecked(dir, options); }
  catch { throw new Error("DATASET_INVALID"); }
}
function loadDatasetChecked(dir: string, options: { manifest?: string; reserve?: boolean }): Dataset {
  const hashes: Record<string, string> = {};
  const read = (name: string) => {
    const bytes = readFileSync(join(dir, name)); hashes[name] = sha256(bytes);
    return bytes.toString("utf8").replace(/^\uFEFF/, "");
  };
  if (options.reserve && !options.manifest) throw new Error("Reserve requires an external trusted manifest");
  if (options.reserve && inside(realpathSync(dir), realpathSync(options.manifest!))) throw new Error("Reserve manifest must be external");
  const manifestBytes = readFileSync(options.manifest ?? join(dir, "manifest.json"));
  hashes["manifest.json"] = sha256(manifestBytes);
  const manifest: unknown = JSON.parse(manifestBytes.toString("utf8").replace(/^\uFEFF/, ""));
  if (!object(manifest) || !nonempty(manifest.version ?? manifest.versao) ||
      !nonempty(manifest.date ?? manifest.data) || !manifest.kb) throw new Error("manifest requires version/versao, date/data, kb");
  if (manifest.sha256 !== undefined || options.reserve) {
    if (!object(manifest.sha256) || Object.keys(manifest.sha256).sort().join(",") !== "qrels.jsonl,queries.jsonl") throw new Error("Invalid sha256 manifest schema");
    for (const name of ["queries.jsonl", "qrels.jsonl"]) {
      const expected = manifest.sha256[name];
      if (typeof expected !== "string" || !/^[a-f0-9]{64}$/i.test(expected)) throw new Error("Invalid SHA256 digest");

    }
  }
  const counts = manifest.counts ?? manifest.contagens;
  if (!object(counts)) throw new Error("manifest requires counts/contagens per stratum");
  const inputs = { "queries.jsonl": read("queries.jsonl"), "qrels.jsonl": read("qrels.jsonl") };
  if (object(manifest.sha256)) for (const name of Object.keys(inputs)) {
    if ((manifest.sha256[name] as string).toLowerCase() !== hashes[name]) throw new Error("Dataset SHA256 mismatch");
  }
  const lines = (name: keyof typeof inputs): unknown[] => inputs[name].split(/\r?\n/).filter(x => x.trim()).map((x, i) => {
    try { return JSON.parse(x); } catch { throw new Error(`${name}: invalid JSON at nonempty line ${i + 1}`); }
  });
  const queries = lines("queries.jsonl");
  const qrels = lines("qrels.jsonl");
  const ids = new Set<string>();
  for (const q of queries) {
    if (!object(q) || !nonempty(q.id) || !nonempty(q.query) || !nonempty(q.motivo) ||
        !STRATA.includes(q.estrato as Stratum) || (q.component !== undefined && !nonempty(q.component)) || (q.origem !== undefined && !ORIGINS.includes(q.origem as Origin))) throw new Error("Invalid query");
    if (Object.keys(q).some(k => !["id", "query", "component", "estrato", "motivo", "origem"].includes(k))) throw new Error("Unexpected query field");
    if (ids.has(q.id)) throw new Error("Duplicate query id");
    ids.add(q.id);
  }
  if (!queries.length) throw new Error("Empty benchmark");
  for (const s of STRATA) {
    const n = queries.filter(q => (q as Query).estrato === s).length;
    if ((counts[s] ?? 0) !== n) throw new Error(`manifest count mismatch: ${s}`);
  }
  const pairs = new Set<string>();
  for (const r of qrels) {
    if (!object(r) || !nonempty(r.query_id) || !ids.has(r.query_id) || !nonempty(r.unit_id) ||
        ![2, 1, -1].includes(r.relevance as number) || !nonempty(r.fonte) || !nonempty(r.trecho) ||
        (r.familia !== undefined && !nonempty(r.familia))) throw new Error("Invalid qrel/source/excerpt/family");
    const pair = JSON.stringify([r.query_id, r.unit_id]);
    if (pairs.has(pair)) throw new Error("Duplicate qrel");
    pairs.add(pair);
  }
  for (const q of queries as Query[]) if (q.estrato === "respondivel" &&
    !(qrels as Qrel[]).some(r => r.query_id === q.id && r.relevance > 0)) throw new Error("Answerable query without positive qrel");
  return { queries: queries as Query[], qrels: qrels as Qrel[], manifest, hashes };
}

export function payload(raw: unknown): Obj {
  if (!object(raw)) throw new Error("MCP result is not an object");
  if (raw.isError) throw new Error("MCP tool error");
  let p: unknown = raw.structuredContent;
  if (!object(p)) {
    if (!Array.isArray(raw.content)) throw new Error("MCP result lacks structuredContent/content");
    const text = raw.content.filter(object).filter(x => x.type === "text" && typeof x.text === "string").map(x => x.text).join("\n");
    try { p = JSON.parse(text); } catch { throw new Error("Invalid tool JSON"); }
  }
  if (!object(p) || p.error) throw new Error("Invalid/error tool payload");
  return p;
}

/** Preserve ranking, merge overlapping returned aliases, take five distinct units only. */
export function units(p: Obj, cutoff = Infinity): Unit[] {
  const rows = p.units ?? p.rules ?? p.candidates ?? p.items;
  if (!Array.isArray(rows)) throw new Error("Unrecognized retrieval response (expected units/rules/candidates/items)");
  const out: Unit[] = [];
  for (const row of rows) {
    if (!object(row)) throw new Error("Invalid retrieval unit");
    const ids = [...new Set([row.unit_id, row.unitId, row.id, row.ruleId,
      ...(Array.isArray(row.ids) ? row.ids : []), ...(Array.isArray(row.aliases) ? row.aliases : [])].filter(nonempty))];
    if (!ids.length) throw new Error("Retrieval unit without citable id");
    const overlaps = out.filter(u => u.ids.some(id => ids.includes(id)));
    if (overlaps.length) {
      const first = overlaps[0];
      first.ids = [...new Set([...first.ids, ...ids, ...overlaps.flatMap(u => u.ids)])];
      for (const other of overlaps.slice(1)) out.splice(out.indexOf(other), 1);
    } else out.push({ ids, data: row });
    // Pool collection stops at the initial five distinct units: later aliases must not enter.
    // Default scoring keeps its historical full-response alias normalization.
    if (out.length >= cutoff) break;
  }
  return out;
}

export function hasContext(u: Unit): boolean {
  const r = u.data;
  const source = nonempty(r.sourceUrl) || (object(r.source) && nonempty(r.source.url));
  return Boolean(source && [r.originalText, r.normalizedRule, r.requirement, r.text].some(nonempty) &&
    Array.isArray(r.conditions) && Array.isArray(r.exceptions) && Array.isArray(r.expectedEvidence));
}

/** Dataset families are local scoring metadata and are never sent over MCP. */
export function groupFamilies(rows: Unit[], qrels: Qrel[]): Unit[] {
  const family = new Map(qrels.filter(r => r.familia).map(r => [r.unit_id, r.familia!]));
  const out: Unit[] = [];
  for (const row of rows) {
    const keys = new Set(row.ids.map(id => family.get(id)).filter(nonempty));
    if (keys.size > 1) throw new DatasetLabelConflict();
    const previous = out.find(u => u.ids.some(id => keys.has(family.get(id) ?? "")));
    if (previous) {
      previous.ids = [...new Set([...previous.ids, ...row.ids])];
      if (!hasContext(previous) && hasContext(row)) previous.data = row.data;
    } else out.push({ ids: [...row.ids], data: row.data });
  }
  return out;
}

/** Structured assertions only; this does not claim a prose safety audit. */
export function assertions(p: unknown): { applicable: number; conclusions: number } {
  let applicable = 0, conclusions = 0;
  function walk(v: unknown) {
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (!object(v)) return;
    if (v.applicable === true || (object(v.applicability) && ["applicable", "aplicavel", "aplicável"].includes(String(v.applicability.status)))) applicable++;
    if (["confirmed", "conforme", "compliant", "noncompliant", "violation", "violacao", "violação"].includes(String(v.verdict ?? v.conformance ?? v.conformity))) conclusions++;
    for (const [k, x] of Object.entries(v)) if (k !== "applicability") walk(x);
  }
  walk(p);
  return { applicable, conclusions };
}

export async function evaluateQuery(q: Query, qrels: Qrel[], invoke: Invoke) {
  return evaluateQueryCollected(q, qrels, invoke);
}
type PoolRow = { queryId: string; ids: string[] };
async function evaluateQueryCollected(q: Query, qrels: Qrel[], invoke: Invoke, collect?: (row: PoolRow) => void) {
  const calls: Call[] = [];
  async function call(args: Obj): Promise<Obj> {
    const start = performance.now();
    const record: Call = { latencyMs: 0, characters: 0 };
    calls.push(record);
    try {
      const response = await invoke(args);
      record.characters = JSON.stringify(response).length;
      return payload(response);
    } catch {
      record.error = "TOOL_CALL_FAILED";
      throw new Error("TOOL_CALL_FAILED");
    } finally { record.latencyMs = performance.now() - start; }
  }

  const local = qrels.filter(r => r.query_id === q.id);
  let poolIds: string[] = [];
  let top: Unit[] = [], initial: Obj | null = null, detail: Obj | null = null, error: string | null = null;
  try {
    // Measure the default response surface; detail=full would hide future default improvements.
    initial = await call({ query: q.query, ...(q.component ? { component: q.component } : {}), limit: 5 });
    if (collect) poolIds = [...new Set(units(initial, 5).flatMap(u => u.ids))].sort();
    top = units(initial).slice(0, 5);
    // Selection uses only returned data, never relevance labels or expected ids.
    const missing = top.filter(u => !hasContext(u)).map(u => u.ids[0]);
    if (missing.length) detail = await call({ ids: missing, detail: "full" });
  } catch { error = "TOOL_CALL_FAILED"; }
  let details: Unit[] = [];
  try { if (detail) details = units(detail); } catch { error ??= "INVALID_DETAIL_RESPONSE"; }
  // Collect the actual initial top five, before any local label/family grouping. Sort away rank.
  collect?.({ queryId: sha256(q.id), ids: poolIds });
  // Offline families cannot affect which ids are requested or promote rank six.
  top = groupFamilies(top, local);
  const relevance = (u: Unit) => {
    const rs = local.filter(r => u.ids.includes(r.unit_id));
    if (rs.some(r => r.relevance > 0) && rs.some(r => r.relevance < 0)) throw new DatasetLabelConflict();
    return rs.length ? Math.max(...rs.map(r => r.relevance)) : null;
  };
  const ranked = top.map((u, i) => ({ rank: i + 1, ids: u.ids, relevance: relevance(u), contextAtCall:
    hasContext(u) ? 1 : details.some(d => d.ids.some(id => u.ids.includes(id)) && hasContext(d)) ? 2 : null }));
  const relevant = ranked.filter(u => u.relevance !== null && u.relevance > 0);
  const supported = relevant.filter(u => u.relevance === 2);
  const sufficient = supported.map(u => u.contextAtCall).filter((n): n is number => n !== null);
  const a = assertions(initial), b = assertions(detail);
  return { queryId: sha256(q.id), estrato: q.estrato, origem: q.origem ?? null, error, calls, returned: ranked.length,
    relevant: relevant.length, misleading: ranked.filter(u => u.relevance === -1).length,
    unjudged: ranked.filter(u => u.relevance === null).length, hitAt5: relevant.length > 0, supportedHitAt5: supported.length > 0,
    precisionAt5: relevant.length / (ranked.length || 1),
    sourceUnsupported: q.estrato === "sem_resposta",
    callsUntilSufficientContext: sufficient.length ? Math.min(...sufficient) : null,
    candidates: typeof initial?.total === "number" ? initial.total : null,
    latencyMs: calls.reduce((n, c) => n + c.latencyMs, 0), characters: calls.reduce((n, c) => n + c.characters, 0),
    initialCharacters: calls[0]?.characters ?? 0,
    applicableAssertions: a.applicable + b.applicable, normativeConclusions: a.conclusions + b.conclusions };
}
export type QueryResult = Awaited<ReturnType<typeof evaluateQuery>>;

const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function summarize(results: QueryResult[]) {
  function group(rs: QueryResult[]) {
    const context = rs.map(r => r.callsUntilSufficientContext).filter((n): n is number => n !== null);
    const candidates = rs.map(r => r.candidates).filter((n): n is number => n !== null);
    return { queries: rs.length, errors: rs.filter(r => r.error).length,
      hitsAt5: rs.filter(r => r.hitAt5).length, hitRateAt5: mean(rs.map(r => Number(r.hitAt5))),
      supportedHitsAt5: rs.filter(r => r.supportedHitAt5).length, supportedHitRateAt5: mean(rs.map(r => Number(r.supportedHitAt5))),
      meanPrecisionAt5: mean(rs.map(r => r.precisionAt5)), returned: rs.reduce((n, r) => n + r.returned, 0),
      unjudged: rs.reduce((n, r) => n + r.unjudged, 0), misleading: rs.reduce((n, r) => n + r.misleading, 0),
      sourceUnsupported: rs.filter(r => r.sourceUnsupported).length, contextSufficient: context.length,
      meanCallsUntilSufficientContext: mean(context), contextNotReached: rs.length - context.length,
      meanLatencyMs: mean(rs.map(r => r.latencyMs)), meanCharacters: mean(rs.map(r => r.characters)),
      meanInitialCharacters: mean(rs.map(r => r.initialCharacters)),
      meanCandidates: mean(candidates), candidatesUnknown: rs.length - candidates.length,
      applicableAssertions: rs.reduce((n, r) => n + r.applicableAssertions, 0),
      normativeConclusions: rs.reduce((n, r) => n + r.normativeConclusions, 0) };
  }
  const byStratum = Object.fromEntries(STRATA.map(s => [s, group(results.filter(r => r.estrato === s))]));
  const answerable = byStratum.respondivel;
  return { all: group(results), byStratum, byOrigin: Object.fromEntries(ORIGINS.map(o => [o, group(results.filter(r => r.origem === o))])),
    originMissing: group(results.filter(r => r.origem === null)),
    engineeringTargets: { hitRateAt5: answerable.hitRateAt5 === null ? null : answerable.hitRateAt5 >= .9,
      meanPrecisionAt5: answerable.meanPrecisionAt5 === null ? null : answerable.meanPrecisionAt5 >= .7,
      noApplicableHardNegatives: byStratum.negativa_dificil.queries ? byStratum.negativa_dificil.applicableAssertions === 0 : null,
      noStructuredNormativeConclusions: results.every(r => r.normativeConclusions === 0), noToolErrors: results.every(r => !r.error) },
    manualProseSafetyReview: "pending",
    interpretation: { precision: "Conservative: unjudged units count as nonrelevant; empty response = 0. Macro mean, actual distinct returned units, no padding.",
      applicability: "Only structured assertions audited automatically. Prose requires independent review without exporting private raw data; this is not a blanket compliance guarantee.",
      sourceUnsupported: "sem_resposta is source-unsupported by dataset classification, separate from retrieval miss; not inferred from an empty response.",
      context: "Operational proxy: relevance=2 (supports the answer), text, source, conditions, exceptions and expectedEvidence. Relevance=1 is acceptable retrieval context, not a sufficient answer. Prose completeness requires review.",
      deduplication: "Returned ids/aliases and locally declared qrel familia; no inferred family for unjudged results. Offline labels never extend the top-five cutoff." } };
}

export async function evaluate(dataset: Dataset, invoke: Invoke) {
  return evaluateCollected(dataset, invoke);
}
async function evaluateCollected(dataset: Dataset, invoke: Invoke, collect?: (row: PoolRow) => void) {
  const results: QueryResult[] = [];
  for (const q of dataset.queries) results.push(await evaluateQueryCollected(q, dataset.qrels, invoke, collect));
  return { results, summary: summarize(results) };
}

/** Only runtime essentials; no evaluation labels, screen identity or credentials in child env. */
export function serverEnvironment(kbVersion: string): Record<string, string> {
  const env: Record<string, string> = { GOVBR_KB_VERSION: kbVersion, GOVBR_VALIDATOR_TOOL_PROFILE: "evaluation" };
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "PATHEXT"]) {
    if (process.env[key]) env[key] = process.env[key]!;
  }
  return env;
}

function commit(root: string): string | null {
  try { return execFileSync("git", ["-c", `safe.directory=${root.split(sep).join("/")}`, "-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch { return null; }
}
export function identity(validator: string, benchmark: string, datasetOptions: { manifest?: string; reserve?: boolean } = {}) {
  try { return identityChecked(validator, benchmark, datasetOptions); }
  catch { throw new Error("INPUT_IDENTITY_INVALID"); }
}
function identityChecked(validator: string, benchmark: string, datasetOptions: { manifest?: string; reserve?: boolean }) {
  const pkg = json(join(validator, "package.json"));
  const active = json(join(validator, "data/knowledge/manifest.json"));
  if (!object(pkg) || !nonempty(pkg.version) || !object(active) || !nonempty(active.activeVersion) ||
      active.activeVersion.includes("/") || active.activeVersion.includes("\\")) throw new Error("Invalid validator package/active KB manifest");
  if (!existsSync(join(validator, "dist/index.js"))) throw new Error("Missing dist/index.js; build the indicated validator first");
  return { validator: { root: validator, version: pkg.version, commit: commit(validator),
      dist: hashTree(join(validator, "dist")), data: hashTree(join(validator, "data")),
      packageSha256: sha256(readFileSync(join(validator, "package.json"))),
      lockSha256: sha256(readFileSync(join(validator, "package-lock.json"))),
      kbVersion: active.activeVersion, kb: hashTree(join(validator, "data/knowledge")) },
    benchmark: { files: loadDataset(benchmark, datasetOptions).hashes },
    evaluator: { version: "retrieval-evaluator-1.2.0", sha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
      sdkVersion: (json(join(ROOT, "node_modules/@modelcontextprotocol/sdk/package.json")) as Obj).version,
      lockSha256: sha256(readFileSync(join(ROOT, "package-lock.json"))), node: process.version } };
}

export interface RunOptions { validator: string; benchmark: string; output: string; timeoutMs?: number; reserve?: boolean; manifest?: string; pool?: string }
export async function runBenchmark(options: RunOptions) {
  try { return await runBenchmarkChecked(options); }
  catch (e) { if (options.reserve) throw new Error("RESERVE_RUN_FAILED"); throw e; }
}
async function runBenchmarkChecked(options: RunOptions) {
  // Reject before dataset reads, input hashing, output creation or server startup.
  if (options.reserve && options.pool !== undefined) throw new Error("POOL_FORBIDDEN_IN_RESERVE");
  const validator = resolve(options.validator), benchmark = resolve(options.benchmark), output = resolve(options.output);
  const pool = options.pool === undefined ? undefined : canonicalTarget(resolve(options.pool));
  if (pool !== undefined) {
    if (!nonempty(options.pool) || existsSync(pool)) throw new Error("POOL_REQUIRES_NEW_FILE");
    if ([validator, benchmark].some(root => inside(canonicalTarget(root), pool)) ||
        pool === canonicalTarget(output) || inside(pool, canonicalTarget(output)) ||
        (inside(canonicalTarget(output), pool) && ["inputs.json", "results.json", "summary.json", "manifest.json", "failure.json"].some(name => pool === join(canonicalTarget(output), name)))) {
      throw new Error("POOL_PATH_CONFLICT");
    }
  }
  if (inside(validator, output) || inside(benchmark, output)) throw new Error("Output cannot be inside validator or benchmark inputs");
  if (existsSync(output)) throw new Error(`Output already exists (never overwritten): ${output}`);
  if (options.reserve && (!options.manifest || inside(benchmark, resolve(options.manifest)))) throw new Error("Reserve requires an external trusted manifest");
  const datasetOptions = { manifest: options.manifest, reserve: options.reserve };
  const dataset = loadDataset(benchmark, datasetOptions), before = identity(validator, benchmark, datasetOptions);
  const kb = dataset.manifest.kb;
  const declared = typeof kb === "string" ? kb : object(kb) ? kb.version ?? kb.versao : undefined;
  if (nonempty(declared) && declared !== before.validator.kbVersion) throw new Error("Benchmark KB does not match indicated validator KB");
  const timeout = options.timeoutMs ?? 30_000;
  if (!Number.isInteger(timeout) || timeout <= 0) throw new Error("timeout-ms must be a positive integer");
  mkdirSync(dirname(output), { recursive: true }); mkdirSync(output);
  const save = (name: string, value: unknown) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  // Store hashes only: manifests, paths and metadata can contain private text too.
  const evidence = (value: typeof before) => ({
    validator: { dist: value.validator.dist.sha256, data: value.validator.data.sha256,
      packageSha256: value.validator.packageSha256, lockSha256: value.validator.lockSha256, kb: value.validator.kb.sha256 },
    benchmark: value.benchmark, evaluator: { version: "retrieval-evaluator-1.2.0", node: process.version, sha256: value.evaluator.sha256, lockSha256: value.evaluator.lockSha256 },
    validatorCommit: value.validator.commit && /^[a-f0-9]{40,64}$/.test(value.validator.commit) ? value.validator.commit : null });
  save("inputs.json", { ...evidence(before), reserve: Boolean(options.reserve), startedAt: new Date().toISOString() });
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(validator, "dist/index.js")],
    cwd: validator, env: serverEnvironment(before.validator.kbVersion), stderr: "pipe" });
  // Drain diagnostics without copying potentially unrelated logs into benchmark artifacts.
  transport.stderr?.on("data", () => {});
  const client = new Client({ name: "retrieval-benchmark", version: "1.2.0" });
  try {
    await client.connect(transport, { timeout, maxTotalTimeout: timeout });
    const poolRows: PoolRow[] = [];
    const report = await evaluateCollected(dataset, args => client.callTool({ name: "get_ds_rules", arguments: args }, undefined, { timeout, maxTotalTimeout: timeout }), pool ? row => poolRows.push(row) : undefined);
    save("results.json", report.results);
    save("summary.json", { ...report.summary, finishedAt: new Date().toISOString() });
    const after = identity(validator, benchmark, datasetOptions);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Inputs changed during benchmark; results cannot be accepted");
    let poolSha256: string | undefined;
    if (pool) {
      if (report.summary.all.errors) throw new Error("POOL_INCOMPLETE");
      mkdirSync(dirname(pool), { recursive: true });
      const bytes = JSON.stringify(poolRows.sort((a, b) => a.queryId < b.queryId ? -1 : a.queryId > b.queryId ? 1 : 0), null, 2) + "\n";
      writeFileSync(pool, bytes, { flag: "wx" });
      poolSha256 = sha256(bytes);
    }
    const files = ["inputs.json", "results.json", "summary.json"];
    save("manifest.json", { version: "retrieval-baseline-1.2.0", status: report.summary.all.errors ? "completed-with-tool-errors" : "complete", files: Object.fromEntries(files.map(f => [f, sha256(readFileSync(join(output, f)))])), ...(poolSha256 ? { pool: { sha256: poolSha256 } } : {}) });
    return report;
  } catch (e) { const code = failureCode(e); save("failure.json", { status: "failed", error: code, at: new Date().toISOString() }); if (e instanceof DatasetLabelConflict) throw e; throw new Error(code); }
  finally { await client.close().catch(() => {}); await transport.close().catch(() => {}); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("benchmark:oraculo --conjunto <dataset-dir> [--reserva --manifesto <external-trusted-manifest>] --validator <validator-root> --saida <new-dir> [--pool <new-development-file>] [--timeout-ms 30000]\nNo models; prebuilt MCP stdio; immutable output. Pool exports only sorted ids by pseudonymous query, no labels/text/rank; forbidden with --reserva. Pooling/relabeling requires a separately ratified method. Prose safety requires independent review."); return;
  }
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--reserva" && !values[args[i]]) { values[args[i]] = "true"; i--; continue; }
    if (!["--benchmark", "--conjunto", "--manifesto", "--validator", "--saida", "--pool", "--timeout-ms"].includes(args[i]) || !args[i + 1] || values[args[i]]) throw new Error("Unknown, repeated or missing CLI argument; use --help");
    values[args[i]] = args[i + 1];
  }
  if (!values["--saida"]) throw new Error("--saida must name a new baseline directory");
  if (values["--benchmark"] && values["--conjunto"]) throw new Error("Use only one dataset alias");
  if (values["--reserva"] && (!values["--manifesto"] || !(values["--conjunto"] || values["--benchmark"]))) throw new Error("Reserve requires explicit --conjunto and --manifesto");
  const report = await runBenchmark({ pool: values["--pool"], reserve: Boolean(values["--reserva"]), manifest: values["--manifesto"], benchmark: values["--conjunto"] ?? values["--benchmark"] ?? join(ROOT, "retrieval/benchmark-1.0.0"),
    validator: values["--validator"] ?? join(ROOT, "../govbr-ds-validator"), output: values["--saida"],
    timeoutMs: values["--timeout-ms"] ? Number(values["--timeout-ms"]) : undefined });
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.all.errors) process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(process.argv.includes("--reserva") ? "RESERVE_RUN_FAILED" : failureCode(e)); process.exitCode = 1; });
