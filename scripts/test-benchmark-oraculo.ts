/** NAT-94: synthetic labels + real MCP stdio stub; no models, screen data or real KB. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertions, evaluate, evaluateQuery, groupFamilies, hashTree, loadDataset, payload, runBenchmark, serverEnvironment, sha256, summarize, units, type Query, type Qrel } from "./benchmark-oraculo";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TMP = mkdtempSync(join(tmpdir(), "nat94-"));
let passed = 0, failed = 0;
async function test(name: string, f: () => void | Promise<void>) {
  try { await f(); passed++; console.log(`ok ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n${(e as Error).stack}`); }
}
const put = (p: string, value: unknown) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(value, null, 2) + "\n"); };
const wire = (p: unknown) => ({ content: [{ type: "text", text: JSON.stringify(p) }] });
const full = (id: string, more = {}) => ({ id, normalizedRule: "A public clause", sourceUrl: "https://example.org/frozen", conditions: [], exceptions: [], expectedEvidence: ["measure"], ...more });
const qs: Query[] = [
  { id: "q1", query: "first observation", component: "button", estrato: "respondivel", motivo: "test" },
  { id: "q2", query: "second observation", estrato: "respondivel", motivo: "test" },
  { id: "q3", query: "missing source", estrato: "sem_resposta", motivo: "explicit source gap" },
  { id: "q4", query: "insufficient evidence", estrato: "negativa_dificil", motivo: "candidate only" },
  { id: "q5", query: "ambiguous observation", estrato: "ambigua", motivo: "test" },
];
const labels: Qrel[] = [
  { query_id: "q1", unit_id: "u1", relevance: 2, fonte: "frozen-source-secret", trecho: "label-never-crosses-MCP" },
  { query_id: "q1", unit_id: "bad", relevance: -1, fonte: "frozen", trecho: "does not support the question" },
  { query_id: "q2", unit_id: "u2", relevance: 2, fonte: "frozen", trecho: "supports the answer" },
];
function dataset(dir: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "queries.jsonl"), qs.map(q => JSON.stringify(q)).join("\n") + "\n");
  writeFileSync(join(dir, "qrels.jsonl"), labels.map(r => JSON.stringify(r)).join("\n") + "\n");
  put(join(dir, "manifest.json"), { version: "fixture-1", date: "2026-10-22", kb: "fixture-kb", counts: { respondivel: 2, sem_resposta: 1, negativa_dificil: 1, ambigua: 1 } });
}
const dataDir = join(TMP, "benchmark"); dataset(dataDir);
const expectedArgs = [
  { query: qs[0].query, component: "button", limit: 5 },
  { query: qs[1].query, limit: 5 }, { ids: ["u2"], detail: "full" },
  { query: qs[2].query, limit: 5 },
  { query: qs[3].query, limit: 5 }, { query: qs[4].query, limit: 5 },
];
const seen: unknown[] = [];
const invoke = async (args: Record<string, unknown>) => {
  seen.push(args);
  if (args.ids) return wire({ rules: [full("u2")] });
  if (args.query === qs[0].query) return wire({ total: 7, rules: [full("u1"), full("u1"), full("bad"), full("unjudged")] });
  if (args.query === qs[1].query) return wire({ total: 1, rules: [{ id: "u2" }] });
  if (args.query === qs[3].query) return wire({ total: 1, rules: [full("not-applicable", { applicability: { status: "unknown" } })] });
  return wire({ total: 0, rules: [] });
};

await test("five-case fixture validates, records actual hashes and does not require 60 development cases", () => {
  const ds = loadDataset(dataDir);
  assert.equal(ds.queries.length, 5); assert.equal(ds.qrels.length, 3);
  assert.equal(ds.hashes["queries.jsonl"], sha256(readFileSync(join(dataDir, "queries.jsonl"))));
});
await test("hand-calculated macro metrics: aliases/duplicates do not inflate denominator; no padding", async () => {
  const report = await evaluate(loadDataset(dataDir), invoke);
  assert.deepEqual(seen, expectedArgs);
  const first = report.results[0];
  assert.equal(first.returned, 3); assert.equal(first.relevant, 1); assert.equal(first.precisionAt5, 1 / 3);
  assert.equal(first.misleading, 1); assert.equal(first.unjudged, 1);
  assert.equal(report.results[1].precisionAt5, 1); assert.equal(report.results[1].callsUntilSufficientContext, 2);
  assert.equal(first.callsUntilSufficientContext, 1);
  assert.equal(report.summary.byStratum.respondivel.hitRateAt5, 1);
  assert.equal(report.summary.byStratum.respondivel.meanPrecisionAt5, (1 / 3 + 1) / 2);
  assert.equal(report.summary.byStratum.sem_resposta.sourceUnsupported, 1);
  assert.equal(report.results[2].precisionAt5, 0); assert.equal(report.results[2].callsUntilSufficientContext, null);
  assert.equal(report.summary.engineeringTargets.meanPrecisionAt5, false);
  assert.equal(report.summary.engineeringTargets.noApplicableHardNegatives, true);
  assert.ok(first.latencyMs >= 0); assert.equal(first.characters, first.calls.reduce((n, c) => n + JSON.stringify(c.response).length, 0));
  assert.equal(first.candidates, 7);
});
await test("MCP arguments contain only public query/component or ids actually returned, never labels/metadata", () => {
  const text = JSON.stringify(seen);
  for (const word of ["q1", "q2", "frozen-source-secret", "label-never-crosses-MCP", "motivo", "relevance", "query_id", "estrato"]) assert.ok(!text.includes(word), word);
  process.env.NAT94_QRELS = "private";
  try { assert.equal(serverEnvironment("fixture").NAT94_QRELS, undefined); }
  finally { delete process.env.NAT94_QRELS; }
  assert.equal(serverEnvironment("fixture").GOVBR_VALIDATOR_TOOL_PROFILE, "evaluation");
});
await test("overlapping aliases merge transitively, preserve first rank, and do not count twice", () => {
  const r = units({ units: [{ id: "a", ids: ["b"] }, { id: "c" }, { id: "b", aliases: ["c"] }, { id: "d" }] });
  assert.equal(r.length, 2); assert.deepEqual(new Set(r[0].ids), new Set(["a", "b", "c"]));
});
await test("distinct ids for the same labeled family count once; family labels do not influence MCP requests", async () => {
  const familyLabels: Qrel[] = [labels[0], { ...labels[0], unit_id: "u-copy" }].map(r => ({ ...r, familia: "same-public-clause" }));
  const r = groupFamilies(units({ rules: [full("u1"), full("u-copy"), full("other")] }), familyLabels);
  assert.equal(r.length, 2); assert.deepEqual(r[0].ids, ["u1", "u-copy"]);
  const seen: unknown[] = [];
  const result = await evaluateQuery(qs[0], familyLabels, async args => {
    seen.push(args); return wire({ rules: args.ids ? [full("u1"), full("u-copy")] : [{ id: "u1" }, { id: "u-copy" }] });
  });
  assert.equal(result.returned, 1); assert.equal(result.precisionAt5, 1);
  assert.deepEqual(seen[1], { ids: ["u1", "u-copy"], detail: "full" });
});
await test("acceptable context (relevance=1) is retrieved but is not a source-supported sufficient answer", async () => {
  const r = await evaluateQuery(qs[0], [{ ...labels[0], relevance: 1 }], async () => wire({ rules: [full("u1")] }));
  assert.equal(r.hitAt5, true); assert.equal(r.supportedHitAt5, false); assert.equal(r.callsUntilSufficientContext, null);
});
await test("unknown payloads, MCP errors, and missing ids fail instead of silently passing as empty results", async () => {
  assert.throws(() => payload({ isError: true, content: [] }), /tool error/);
  assert.throws(() => payload(wire({ error: "bad" })), /error tool payload/);
  assert.throws(() => units({ other: [] }), /Unrecognized/);
  assert.throws(() => units({ rules: [{}] }), /citable id/);
  const r = await evaluateQuery(qs[0], labels, async () => { throw new Error("timeout"); });
  assert.match(r.error!, /timeout/); assert.equal(r.calls.length, 1); assert.equal(r.hitAt5, false);
  assert.equal(summarize([r]).engineeringTargets.noToolErrors, false);
});
await test("empty negatives are not counted as source gaps unless explicitly classified; absent strata stay null", async () => {
  const r = await evaluateQuery(qs[3], labels, async () => wire({ rules: [] }));
  assert.equal(r.sourceUnsupported, false);
  const s = summarize([r]); assert.equal(s.engineeringTargets.hitRateAt5, null);
  assert.equal(s.byStratum.fora_escopo.hitRateAt5, null);
});
await test("structured applicable and normative conclusion assertions block the appropriate gates", async () => {
  assert.deepEqual(assertions({ note: "absence is not conformity", rules: [{ applicability: { status: "applicable" } }, { verdict: "confirmed" }] }), { applicable: 1, conclusions: 1 });
  const r = await evaluateQuery(qs[3], labels, async () => wire({ rules: [full("x", { applicable: true, verdict: "confirmed" })] }));
  const s = summarize([r]); assert.equal(s.engineeringTargets.noApplicableHardNegatives, false); assert.equal(s.engineeringTargets.noStructuredNormativeConclusions, false);
});
await test("follow-up is chosen without qrels, incomplete source/context never becomes sufficient", async () => {
  const seen: unknown[] = [];
  const r = await evaluateQuery(qs[0], labels, async args => { seen.push(args); return wire({ rules: [{ id: "u1", normalizedRule: "text only" }] }); });
  assert.deepEqual(seen[1], { ids: ["u1"], detail: "full" });
  assert.equal(r.hitAt5, true); assert.equal(r.callsUntilSufficientContext, null);
  assert.equal(r.calls.length, 2);
});
await test("manifest count drift, duplicate ids, missing positive labels, and conflicting labels are refused", async () => {
  const dir = join(TMP, "invalid"); dataset(dir);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")); manifest.counts.respondivel = 8;
  put(join(dir, "manifest.json"), manifest); assert.throws(() => loadDataset(dir), /count mismatch/);
  dataset(dir); writeFileSync(join(dir, "queries.jsonl"), [...qs, qs[0]].map(q => JSON.stringify(q)).join("\n"));
  assert.throws(() => loadDataset(dir), /Duplicate query/);
  dataset(dir); writeFileSync(join(dir, "qrels.jsonl"), ""); assert.throws(() => loadDataset(dir), /without positive/);
  await assert.rejects(evaluateQuery(qs[0], [...labels, { ...labels[0], unit_id: "alias", relevance: -1 }], async () => wire({ rules: [full("u1", { aliases: ["alias"] })] })), /Conflicting labels/);
});
await test("hashes include nested actual bytes and stable sorted paths", () => {
  const dir = join(TMP, "tree"); put(join(dir, "nested/a.json"), { a: 1 });
  const first = hashTree(dir); assert.equal(first.sha256, hashTree(dir).sha256);
  put(join(dir, "nested/a.json"), { a: 2 }); assert.notEqual(first.sha256, hashTree(dir).sha256);
});

// A tiny real MCP server proves initialize/call/close, cwd, profile pinning and CLI artifacts.
const validator = join(TMP, "validator");
put(join(validator, "package.json"), { name: "fixture", version: "fixture-server", type: "module" });
put(join(validator, "package-lock.json"), { fixture: true });
put(join(validator, "data/knowledge/manifest.json"), { activeVersion: "fixture-kb" });
put(join(validator, "data/knowledge/versions/fixture-kb/manifest.json"), { version: "fixture-kb" });
const sdkUrl = pathToFileURL(join(ROOT, "node_modules/@modelcontextprotocol/sdk/dist/esm")).href;
const serverScript = `
import { Server } from ${JSON.stringify(sdkUrl + "/server/index.js")};
import { StdioServerTransport } from ${JSON.stringify(sdkUrl + "/server/stdio.js")};
import { ListToolsRequestSchema, CallToolRequestSchema } from ${JSON.stringify(sdkUrl + "/types.js")};
const server = new Server({ name: "fixture", version: "fixture-server" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({tools:[{name:"get_ds_rules",inputSchema:{type:"object"}}]}));
server.setRequestHandler(CallToolRequestSchema, async request => {
  const a = request.params.arguments;
  if (request.params.name !== "get_ds_rules" || Object.keys(a).some(k=>!["query","component","limit","detail","ids"].includes(k))) throw new Error("Unexpected tool/argument");
  if (JSON.stringify(a).includes("label-never-crosses-MCP") || process.env.NAT94_QRELS) throw new Error("Labels leaked");
  if (process.env.GOVBR_VALIDATOR_TOOL_PROFILE !== "evaluation" || process.env.GOVBR_KB_VERSION !== "fixture-kb") throw new Error("Wrong environment");
  const rule = id => ({id, normalizedRule:"text",sourceUrl:"https://example.org/frozen",conditions:[],exceptions:[],expectedEvidence:[]});
  const rules = a.query === "first observation" ? [rule("u1")] : a.query === "second observation" ? [rule("u2")] : [];
  return { content:[{type:"text",text:JSON.stringify({total:rules.length,rules})}] };
});
await server.connect(new StdioServerTransport());
`;
mkdirSync(join(validator, "dist"), { recursive: true }); writeFileSync(join(validator, "dist/index.js"), serverScript);
await test("end-to-end real MCP stdio: five synthetic queries, input identities, versioned output and tamper-evident artifacts", async () => {
  const output = join(TMP, "baseline-1");
  process.env.NAT94_QRELS = "must-not-be-inherited";
  try {
    const report = await runBenchmark({ validator, benchmark: dataDir, output, timeoutMs: 5000 });
    assert.equal(report.results.length, 5); assert.equal(report.summary.all.errors, 0);
  } finally { delete process.env.NAT94_QRELS; }
  const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
  assert.equal(manifest.status, "complete");
  for (const [name, hash] of Object.entries(manifest.files)) assert.equal(sha256(readFileSync(join(output, name))), hash);
  const input = JSON.parse(readFileSync(join(output, "inputs.json"), "utf8"));
  assert.equal(input.validator.version, "fixture-server"); assert.equal(input.validator.kbVersion, "fixture-kb");
  assert.equal(input.validator.dist.sha256, hashTree(join(validator, "dist")).sha256);
  assert.deepEqual(input.benchmark.files, loadDataset(dataDir).hashes);
  const original = readFileSync(join(output, "summary.json"));
  await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output }), /never overwritten/);
  assert.deepEqual(readFileSync(join(output, "summary.json")), original);
  await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output: join(dataDir, "nested") }), /inside/);
});
await test("startup failure is preserved, never emitted as an empty successful baseline", async () => {
  const path = join(validator, "dist/index.js"), original = readFileSync(path);
  writeFileSync(path, "process.exit(2);");
  try {
    const output = join(TMP, "failed-baseline");
    await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output, timeoutMs: 1000 }));
    assert.equal(JSON.parse(readFileSync(join(output, "failure.json"), "utf8")).status, "failed");
    assert.throws(() => readFileSync(join(output, "manifest.json")), /ENOENT/);
  } finally { writeFileSync(path, original); }
});
await test("mid-run input changes invalidate the baseline while preserving raw responses for diagnosis", async () => {
  const entry = join(validator, "dist/index.js"), kb = join(validator, "data/knowledge/versions/fixture-kb/manifest.json");
  const originalEntry = readFileSync(entry), originalKb = readFileSync(kb);
  writeFileSync(entry, 'import { appendFileSync } from "node:fs";\n' + serverScript.replace(
    "const a = request.params.arguments;", `const a = request.params.arguments; if (a.query === "missing source") appendFileSync(${JSON.stringify(kb)}, " ");`));
  try {
    const output = join(TMP, "changed-input");
    await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output, timeoutMs: 5000 }), /Inputs changed/);
    assert.equal(JSON.parse(readFileSync(join(output, "results.json"), "utf8")).length, 5);
    assert.equal(JSON.parse(readFileSync(join(output, "failure.json"), "utf8")).status, "failed");
    assert.throws(() => readFileSync(join(output, "manifest.json")), /ENOENT/);
  } finally { writeFileSync(entry, originalEntry); writeFileSync(kb, originalKb); }
});
await test("CLI help is read-only; missing output and unknown flags exit nonzero", () => {
  const cli = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"),
    join(ROOT, "scripts/benchmark-oraculo.ts"), ...args], { cwd: ROOT, encoding: "utf8", timeout: 10_000 });
  const help = cli("--help"); assert.equal(help.status, 0, help.stderr); assert.match(help.stdout, /No models/);
  const missing = cli(); assert.equal(missing.status, 1); assert.match(missing.stderr, /--saida/);
  const unknown = cli("--campaign", "x"); assert.equal(unknown.status, 1); assert.match(unknown.stderr, /Unknown/);
});

console.log(`\n${passed} passed; ${failed} failed. Synthetic artifacts: ${TMP}`);
if (failed) process.exitCode = 1;
