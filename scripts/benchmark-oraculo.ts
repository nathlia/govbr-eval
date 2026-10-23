/**
 * NAT-94: deterministic retrieval benchmark; never calls a model or a campaign runner.
 * npm run benchmark:oraculo -- --benchmark retrieval/benchmark-1.0.0
 *   --validator ../govbr-ds-validator --saida retrieval/baselines/<new-name>
 * Optional: --timeout-ms 30000. The server must already be built; inputs are never rewritten.
 * Qrels stay in this process. Only query/component and returned ids cross MCP.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const STRATA = ["respondivel", "sem_resposta", "ambigua", "fora_escopo", "negativa_dificil"] as const;
export type Stratum = typeof STRATA[number];
type Obj = Record<string, unknown>;
export interface Query { id: string; query: string; component?: string; estrato: Stratum; motivo: string }
export interface Qrel { query_id: string; unit_id: string; relevance: 2 | 1 | -1; fonte: string; trecho: string; familia?: string }
export interface Dataset { queries: Query[]; qrels: Qrel[]; manifest: Obj; hashes: Record<string, string> }
export interface Unit { ids: string[]; data: Obj }
export interface Call { arguments: Obj; response?: unknown; error?: string; latencyMs: number; characters: number }
export type Invoke = (args: Obj) => Promise<unknown>;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const object = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
export const sha256 = (v: string | Buffer): string => createHash("sha256").update(v).digest("hex");
const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);

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

export function loadDataset(dir: string): Dataset {
  const hashes: Record<string, string> = {};
  const read = (name: string) => {
    const bytes = readFileSync(join(dir, name)); hashes[name] = sha256(bytes);
    return bytes.toString("utf8").replace(/^\uFEFF/, "");
  };
  const lines = (name: string): unknown[] => read(name).split(/\r?\n/).filter(x => x.trim()).map((x, i) => {
    try { return JSON.parse(x); } catch { throw new Error(`${name}: invalid JSON at nonempty line ${i + 1}`); }
  });
  const queries = lines("queries.jsonl");
  const qrels = lines("qrels.jsonl");
  const manifest: unknown = JSON.parse(read("manifest.json"));
  if (!object(manifest) || !nonempty(manifest.version ?? manifest.versao) ||
      !nonempty(manifest.date ?? manifest.data) || !manifest.kb) throw new Error("manifest requires version/versao, date/data, kb");
  const counts = manifest.counts ?? manifest.contagens;
  if (!object(counts)) throw new Error("manifest requires counts/contagens per stratum");
  const ids = new Set<string>();
  for (const q of queries) {
    if (!object(q) || !nonempty(q.id) || !nonempty(q.query) || !nonempty(q.motivo) ||
        !STRATA.includes(q.estrato as Stratum) || (q.component !== undefined && !nonempty(q.component))) throw new Error("Invalid query");
    if (Object.keys(q).some(k => !["id", "query", "component", "estrato", "motivo"].includes(k))) throw new Error(`Unexpected query field: ${q.id}`);
    if (ids.has(q.id)) throw new Error(`Duplicate query id: ${q.id}`);
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
    if (pairs.has(pair)) throw new Error(`Duplicate qrel: ${pair}`);
    pairs.add(pair);
  }
  for (const q of queries as Query[]) if (q.estrato === "respondivel" &&
    !(qrels as Qrel[]).some(r => r.query_id === q.id && r.relevance > 0)) throw new Error(`Answerable query without positive qrel: ${q.id}`);
  return { queries: queries as Query[], qrels: qrels as Qrel[], manifest, hashes };
}

export function payload(raw: unknown): Obj {
  if (!object(raw)) throw new Error("MCP result is not an object");
  if (raw.isError) throw new Error(`MCP tool error: ${JSON.stringify(raw)}`);
  let p: unknown = raw.structuredContent;
  if (!object(p)) {
    if (!Array.isArray(raw.content)) throw new Error("MCP result lacks structuredContent/content");
    const text = raw.content.filter(object).filter(x => x.type === "text" && typeof x.text === "string").map(x => x.text).join("\n");
    p = JSON.parse(text);
  }
  if (!object(p) || p.error) throw new Error(`Invalid/error tool payload: ${JSON.stringify(p)}`);
  return p;
}

/** Preserve ranking, merge overlapping returned aliases, take five distinct units only. */
export function units(p: Obj): Unit[] {
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
    if (keys.size > 1) throw new Error("Returned aliases belong to conflicting dataset families");
    const previous = out.find(u => u.ids.some(id => keys.has(family.get(id) ?? "")));
    if (previous) {
      previous.ids = [...new Set([...previous.ids, ...row.ids])];
      if (!hasContext(previous) && hasContext(row)) previous.data = row.data;
    } else out.push({ ids: [...row.ids], data: row.data });
  }
  return out;
}

/** Structured assertions only: prose remains in raw responses for independent review. */
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
  const calls: Call[] = [];
  async function call(args: Obj): Promise<Obj> {
    const start = performance.now();
    try {
      const response = await invoke(args);
      const record: Call = { arguments: args, response, latencyMs: performance.now() - start, characters: JSON.stringify(response).length };
      calls.push(record);
      return payload(response);
    } catch (e) {
      if (!calls.length || calls.at(-1)!.arguments !== args) calls.push({ arguments: args, latencyMs: performance.now() - start, characters: 0 });
      calls.at(-1)!.error = errorText(e);
      throw e;
    }
  }
  const local = qrels.filter(r => r.query_id === q.id);
  let top: Unit[] = [], initial: Obj | null = null, detail: Obj | null = null, error: string | null = null;
  try {
    // Measure the default response surface; detail=full would hide future default improvements.
    initial = await call({ query: q.query, ...(q.component ? { component: q.component } : {}), limit: 5 });
    top = units(initial).slice(0, 5);
    // Selection uses only returned data, never relevance labels or expected ids.
    const missing = top.filter(u => !hasContext(u)).map(u => u.ids[0]);
    if (missing.length) detail = await call({ ids: missing, detail: "full" });
  } catch (e) { error = errorText(e); }
  let details: Unit[] = [];
  try { if (detail) details = units(detail); } catch (e) { error ??= errorText(e); }
  // Offline families cannot affect which ids are requested or promote rank six.
  top = groupFamilies(top, local);
  const relevance = (u: Unit) => {
    const rs = local.filter(r => u.ids.includes(r.unit_id));
    if (rs.some(r => r.relevance > 0) && rs.some(r => r.relevance < 0)) throw new Error(`Conflicting labels for aliases: ${q.id}/${u.ids.join(",")}`);
    return rs.length ? Math.max(...rs.map(r => r.relevance)) : null;
  };
  const ranked = top.map((u, i) => ({ rank: i + 1, ids: u.ids, relevance: relevance(u), contextAtCall:
    hasContext(u) ? 1 : details.some(d => d.ids.some(id => u.ids.includes(id)) && hasContext(d)) ? 2 : null }));
  const relevant = ranked.filter(u => u.relevance !== null && u.relevance > 0);
  const supported = relevant.filter(u => u.relevance === 2);
  const sufficient = supported.map(u => u.contextAtCall).filter((n): n is number => n !== null);
  const a = assertions(initial), b = assertions(detail);
  return { queryId: q.id, estrato: q.estrato, error, calls, ranked, returned: ranked.length,
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
  return { all: group(results), byStratum,
    engineeringTargets: { hitRateAt5: answerable.hitRateAt5 === null ? null : answerable.hitRateAt5 >= .9,
      meanPrecisionAt5: answerable.meanPrecisionAt5 === null ? null : answerable.meanPrecisionAt5 >= .7,
      noApplicableHardNegatives: byStratum.negativa_dificil.queries ? byStratum.negativa_dificil.applicableAssertions === 0 : null,
      noStructuredNormativeConclusions: results.every(r => r.normativeConclusions === 0), noToolErrors: results.every(r => !r.error) },
    manualProseSafetyReview: "pending",
    interpretation: { precision: "Conservative: unjudged units count as nonrelevant; empty response = 0. Macro mean, actual distinct returned units, no padding.",
      applicability: "Only structured assertions audited automatically. Raw prose requires independent review; this is not a blanket compliance guarantee.",
      sourceUnsupported: "sem_resposta is source-unsupported by dataset classification, separate from retrieval miss; not inferred from an empty response.",
      context: "Operational proxy: relevance=2 (supports the answer), text, source, conditions, exceptions and expectedEvidence. Relevance=1 is acceptable retrieval context, not a sufficient answer. Prose completeness requires review.",
      deduplication: "Returned ids/aliases and locally declared qrel familia; no inferred family for unjudged results. Offline labels never extend the top-five cutoff." } };
}

export async function evaluate(dataset: Dataset, invoke: Invoke) {
  const results: QueryResult[] = [];
  for (const q of dataset.queries) results.push(await evaluateQuery(q, dataset.qrels, invoke));
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
export function identity(validator: string, benchmark: string) {
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
    benchmark: { root: benchmark, commit: commit(benchmark), files: loadDataset(benchmark).hashes },
    evaluator: { version: "retrieval-evaluator-1.0.0", sha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
      sdkVersion: (json(join(ROOT, "node_modules/@modelcontextprotocol/sdk/package.json")) as Obj).version,
      lockSha256: sha256(readFileSync(join(ROOT, "package-lock.json"))), node: process.version } };
}

export interface RunOptions { validator: string; benchmark: string; output: string; timeoutMs?: number }
export async function runBenchmark(options: RunOptions) {
  const validator = resolve(options.validator), benchmark = resolve(options.benchmark), output = resolve(options.output);
  const inside = (parent: string, child: string) => { const r = relative(parent, child); return r === "" || (!r.startsWith(`..${sep}`) && r !== ".." && !isAbsolute(r)); };
  if (inside(validator, output) || inside(benchmark, output)) throw new Error("Output cannot be inside validator or benchmark inputs");
  if (existsSync(output)) throw new Error(`Output already exists (never overwritten): ${output}`);
  const dataset = loadDataset(benchmark), before = identity(validator, benchmark);
  const kb = dataset.manifest.kb;
  const declared = typeof kb === "string" ? kb : object(kb) ? kb.version ?? kb.versao : undefined;
  if (nonempty(declared) && declared !== before.validator.kbVersion) throw new Error("Benchmark KB does not match indicated validator KB");
  const timeout = options.timeoutMs ?? 30_000;
  if (!Number.isInteger(timeout) || timeout <= 0) throw new Error("timeout-ms must be a positive integer");
  mkdirSync(dirname(output), { recursive: true }); mkdirSync(output);
  const save = (name: string, value: unknown) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  save("inputs.json", { ...before, manifest: dataset.manifest, startedAt: new Date().toISOString() });
  for (const name of Object.keys(dataset.hashes)) {
    const bytes = readFileSync(join(benchmark, name));
    if (sha256(bytes) !== dataset.hashes[name]) throw new Error("Benchmark changed before snapshot");
    writeFileSync(join(output, name === "manifest.json" ? "benchmark-manifest.json" : name), bytes, { flag: "wx" });
  }
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(validator, "dist/index.js")],
    cwd: validator, env: serverEnvironment(before.validator.kbVersion), stderr: "pipe" });
  // Drain diagnostics without copying potentially unrelated logs into benchmark artifacts.
  transport.stderr?.on("data", () => {});
  const client = new Client({ name: "retrieval-benchmark", version: "1.0.0" });
  try {
    await client.connect(transport, { timeout, maxTotalTimeout: timeout });
    const server = client.getServerVersion();
    const report = await evaluate(dataset, args => client.callTool({ name: "get_ds_rules", arguments: args }, undefined, { timeout, maxTotalTimeout: timeout }));
    save("results.json", report.results);
    save("summary.json", { ...report.summary, server, finishedAt: new Date().toISOString() });
    const after = identity(validator, benchmark);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Inputs changed during benchmark; results cannot be accepted");
    const files = ["inputs.json", "queries.jsonl", "qrels.jsonl", "benchmark-manifest.json", "results.json", "summary.json"];
    save("manifest.json", { version: "retrieval-baseline-1.0.0", status: report.summary.all.errors ? "completed-with-tool-errors" : "complete", files: Object.fromEntries(files.map(f => [f, sha256(readFileSync(join(output, f)))])) });
    return report;
  } catch (e) { save("failure.json", { status: "failed", error: errorText(e), at: new Date().toISOString() }); throw e; }
  finally { await client.close().catch(() => {}); await transport.close().catch(() => {}); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("benchmark:oraculo --benchmark <dataset-dir> --validator <validator-root> --saida <new-dir> [--timeout-ms 30000]\nNo models; prebuilt MCP stdio; immutable output. Prose safety requires independent review."); return;
  }
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--benchmark", "--validator", "--saida", "--timeout-ms"].includes(args[i]) || !args[i + 1] || values[args[i]]) throw new Error("Unknown, repeated or missing CLI argument; use --help");
    values[args[i]] = args[i + 1];
  }
  if (!values["--saida"]) throw new Error("--saida must name a new baseline directory");
  const report = await runBenchmark({ benchmark: values["--benchmark"] ?? join(ROOT, "retrieval/benchmark-1.0.0"),
    validator: values["--validator"] ?? join(ROOT, "../govbr-ds-validator"), output: values["--saida"],
    timeoutMs: values["--timeout-ms"] ? Number(values["--timeout-ms"]) : undefined });
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.all.errors) process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(errorText(e)); process.exitCode = 1; });
