/** NAT-94: synthetic labels + real MCP stdio stub; no models, screen data or real KB. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
  { id: "q1", origem: "busca-lexical", query: "first observation", component: "button", estrato: "respondivel", motivo: "test" },
  { id: "q2", origem: "observacao-real", query: "second observation", estrato: "respondivel", motivo: "test" },
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
  assert.ok(first.latencyMs >= 0); assert.equal(first.characters, first.calls.reduce((n, c) => n + c.characters, 0));
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
await test("explicit relevance=0 is judged nonrelevant: not unjudged, not a hit, no label conflict", async () => {
  const r = await evaluateQuery(qs[0], [labels[0], { ...labels[0], unit_id: "zero", relevance: 0 }], async () => wire({ rules: [full("u1"), full("zero"), full("other")] }));
  assert.equal(r.unjudged, 1); assert.equal(r.relevant, 1); assert.equal(r.misleading, 0); assert.equal(r.precisionAt5, 1 / 3);
  const z = await evaluateQuery(qs[0], [{ ...labels[0], unit_id: "zero", relevance: 0 }], async () => wire({ rules: [full("zero")] }));
  assert.equal(z.hitAt5, false); assert.equal(z.unjudged, 0);
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
  assert.equal(r.error, "TOOL_CALL_FAILED"); assert.equal(r.calls.length, 1); assert.equal(r.hitAt5, false);
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
  put(join(dir, "manifest.json"), manifest); assert.throws(() => loadDataset(dir), /DATASET_INVALID/);
  dataset(dir); writeFileSync(join(dir, "queries.jsonl"), [...qs, qs[0]].map(q => JSON.stringify(q)).join("\n"));
  assert.throws(() => loadDataset(dir), /DATASET_INVALID/);
  dataset(dir); writeFileSync(join(dir, "qrels.jsonl"), ""); assert.throws(() => loadDataset(dir), /DATASET_INVALID/);
  await assert.rejects(evaluateQuery(qs[0], [...labels, { ...labels[0], unit_id: "alias", relevance: -1 }], async () => wire({ rules: [full("u1", { aliases: ["alias"] })] })), /^Error: DATASET_LABEL_CONFLICT$/);
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
  assert.equal(input.validator.dist, hashTree(join(validator, "dist")).sha256);
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
await test("mid-run input changes invalidate the baseline while preserving sanitized metrics for diagnosis", async () => {
  const entry = join(validator, "dist/index.js"), kb = join(validator, "data/knowledge/versions/fixture-kb/manifest.json");
  const originalEntry = readFileSync(entry), originalKb = readFileSync(kb);
  writeFileSync(entry, 'import { appendFileSync } from "node:fs";\n' + serverScript.replace(
    "const a = request.params.arguments;", `const a = request.params.arguments; if (a.query === "missing source") appendFileSync(${JSON.stringify(kb)}, " ");`));
  try {
    const output = join(TMP, "changed-input");
    await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output, timeoutMs: 5000 }), /BENCHMARK_FAILED/);
    assert.equal(JSON.parse(readFileSync(join(output, "results.json"), "utf8")).length, 5);
    assert.equal(JSON.parse(readFileSync(join(output, "failure.json"), "utf8")).status, "failed");
    assert.throws(() => readFileSync(join(output, "manifest.json")), /ENOENT/);
  } finally { writeFileSync(entry, originalEntry); writeFileSync(kb, originalKb); }
});
await test("CLI help is read-only; missing output and unknown flags exit nonzero", () => {
  const cli = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"),
    join(ROOT, "scripts/benchmark-oraculo.ts"), ...args], { cwd: ROOT, encoding: "utf8", timeout: 10_000 });
  const help = cli("--help"); assert.equal(help.status, 0, help.stderr); assert.match(help.stdout, /No models/);
  const missing = cli(); assert.equal(missing.status, 1); assert.match(missing.stderr, /BENCHMARK_FAILED/);
  const unknown = cli("--campaign", "x"); assert.equal(unknown.status, 1); assert.match(unknown.stderr, /BENCHMARK_FAILED/);
});

await test("origin is grouped only when declared, with a separate missing provenance bucket", async () => {
  const report = await evaluate(loadDataset(dataDir), invoke);
  assert.equal(report.summary.byOrigin["busca-lexical"].queries, 1);
  assert.equal(report.summary.byOrigin["observacao-real"].queries, 1);
  assert.equal(report.summary.originMissing.queries, 3);
  assert.equal(report.results[2].origem, null);
  const dir = join(TMP, "bad-origin"); dataset(dir);
  writeFileSync(join(dir, "queries.jsonl"), JSON.stringify({ ...qs[0], origem: "invented" }));
  assert.throws(() => loadDataset(dir), /DATASET_INVALID/);
});

const CANARY = "PRIVATE_SYNTHETIC_QUERY_QREL_CANARY_7ac9";
const reserveDir = join(TMP, "synthetic-reserve"); dataset(reserveDir);
const reserveQueries = qs.map((q, i) => ({ ...q, id: i === 0 ? CANARY : q.id, query: `${CANARY}-${i}`, motivo: CANARY, component: CANARY }));
const reserveQrels = labels.map(r => ({ ...r, query_id: r.query_id === "q1" ? CANARY : r.query_id, fonte: CANARY, trecho: CANARY, familia: CANARY }));
writeFileSync(join(reserveDir, "queries.jsonl"), reserveQueries.map(q => JSON.stringify(q)).join("\n"));
writeFileSync(join(reserveDir, "qrels.jsonl"), reserveQrels.map(r => JSON.stringify(r)).join("\n"));
const trustedManifest = join(TMP, "trusted-manifest.json");
const pin = () => {
  const manifest = JSON.parse(readFileSync(join(reserveDir, "manifest.json"), "utf8"));
  manifest.sha256 = Object.fromEntries(["queries.jsonl", "qrels.jsonl"].map(name => [name, sha256(readFileSync(join(reserveDir, name))).toUpperCase()]));
  manifest.privateExtra = CANARY;
  put(trustedManifest, manifest);
};
pin();
const clean = (value: unknown) => assert.ok(!JSON.stringify(value).includes(CANARY), "Private synthetic canary escaped");
const cleanFiles = (dir: string) => { for (const name of readdirSync(dir)) clean(readFileSync(join(dir, name), "utf8")); };
const cli = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"),
  join(ROOT, "scripts/benchmark-oraculo.ts"), ...args], { cwd: ROOT, encoding: "utf8", timeout: 10_000 });

await test("trusted external pins verify byte hashes, fail closed before parsing/spawning, and reject malformed digest schema", async () => {
  assert.equal(loadDataset(reserveDir, { manifest: trustedManifest, reserve: true }).queries.length, 5);
  assert.throws(() => loadDataset(reserveDir, { reserve: true }), /DATASET_INVALID/);
  assert.throws(() => loadDataset(reserveDir, { manifest: join(reserveDir, "manifest.json"), reserve: true }), /DATASET_INVALID/);
  const original = readFileSync(trustedManifest), queryBytes = readFileSync(join(reserveDir, "queries.jsonl"));
  const entry = join(validator, "dist/index.js"), originalEntry = readFileSync(entry), marker = join(TMP, "spawned-marker");
  writeFileSync(entry, `import {writeFileSync} from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "spawned");`);
  try {
    writeFileSync(join(reserveDir, "queries.jsonl"), CANARY + " invalid JSON");
    await assert.rejects(runBenchmark({ validator, benchmark: reserveDir, manifest: trustedManifest, reserve: true, output: join(TMP, "mismatch") }), /RESERVE_RUN_FAILED/);
    assert.equal(existsSync(marker), false); assert.equal(existsSync(join(TMP, "mismatch")), false);
    const malformed = JSON.parse(original.toString()); malformed.sha256["queries.jsonl"] = CANARY;
    put(trustedManifest, malformed);
    assert.throws(() => loadDataset(reserveDir, { manifest: trustedManifest, reserve: true }), /DATASET_INVALID/);
  } finally { writeFileSync(trustedManifest, original); writeFileSync(join(reserveDir, "queries.jsonl"), queryBytes); writeFileSync(entry, originalEntry); }
});

await test("five-case reserve MCP and CLI never emit reflected text, labels, ids, manifest extras or errors", async () => {
  const entry = join(validator, "dist/index.js"), original = readFileSync(entry);
  const reflected = serverScript.replace('name: "fixture", version: "fixture-server"', `name: "${CANARY}", version: "${CANARY}"`).replace(
    "const a = request.params.arguments;", `const a = request.params.arguments;
    console.error(a.query);
    if (a.query?.endsWith("-1")) return {isError:true,content:[{type:"text",text:a.query}]};
    if (a.query?.endsWith("-2")) throw new Error(a.query);
    if (a.query?.endsWith("-3")) return {content:[{type:"text",text:a.query}]};
    if (a.query) return {content:[{type:"text",text:JSON.stringify({rules:[{id:a.query,normalizedRule:a.query,sourceUrl:a.query,conditions:[],exceptions:[],expectedEvidence:[]}]})}]};`);
  writeFileSync(entry, reflected);
  try {
    const output = join(TMP, "reserve-safe");
    const report = await runBenchmark({ validator, benchmark: reserveDir, manifest: trustedManifest, reserve: true, output, timeoutMs: 5000 });
    assert.equal(report.summary.all.queries, 5); assert.equal(report.summary.all.errors, 3);
    assert.equal(report.results[0].queryId, sha256(CANARY)); clean(report); cleanFiles(output);
    const evidence = JSON.parse(readFileSync(join(output, "inputs.json"), "utf8"));
    assert.equal(evidence.benchmark.files["queries.jsonl"], sha256(readFileSync(join(reserveDir, "queries.jsonl"))));
    assert.deepEqual(readdirSync(output).sort(), ["inputs.json", "manifest.json", "results.json", "summary.json"]);
    const outputCli = join(TMP, "reserve-cli");
    const result = cli("--conjunto", reserveDir, "--manifesto", trustedManifest, "--reserva", "--validator", validator, "--saida", outputCli);
    assert.equal(result.status, 2, result.stderr); clean(result.stdout); clean(result.stderr); cleanFiles(outputCli);
    const devOutput = join(TMP, "dev-private-safe");
    const dev = await runBenchmark({ validator, benchmark: reserveDir, output: devOutput }); clean(dev); cleanFiles(devOutput);
  } finally { writeFileSync(entry, original); }
});

await test("reserve startup/CLI/parser failures and direct API errors expose static codes only", async () => {
  const entry = join(validator, "dist/index.js"), original = readFileSync(entry);
  writeFileSync(entry, `console.error(${JSON.stringify(CANARY)}); throw new Error(${JSON.stringify(CANARY)});`);
  try {
    const output = join(TMP, "reserve-startup-failure");
    await assert.rejects(runBenchmark({ validator, benchmark: reserveDir, manifest: trustedManifest, reserve: true, output, timeoutMs: 1000 }), e => { clean(String(e)); return true; });
    cleanFiles(output); assert.equal(JSON.parse(readFileSync(join(output, "failure.json"), "utf8")).error, "BENCHMARK_FAILED");
    const result = cli("--benchmark", reserveDir, "--manifesto", trustedManifest, "--reserva", "--validator", validator, "--saida", join(TMP, "reserve-cli-failed"));
    assert.equal(result.status, 1); clean(result.stdout); clean(result.stderr); cleanFiles(join(TMP, "reserve-cli-failed"));
    const noPin = cli("--conjunto", reserveDir, "--reserva", "--saida", join(TMP, "unpinned"));
    assert.equal(noPin.status, 1); clean(noPin.stderr); assert.equal(existsSync(join(TMP, "unpinned")), false);
    assert.throws(() => payload({isError:true,content:[{text:CANARY}]}), e => { clean(String(e)); return true; });
    const r = await evaluateQuery(reserveQueries[0], reserveQrels, async () => { throw new Error(CANARY); }); clean(r);
    const saved = readFileSync(trustedManifest);
    try { writeFileSync(trustedManifest, CANARY + " malformed"); assert.throws(() => loadDataset(reserveDir, { manifest: trustedManifest, reserve: true }), e => { clean(String(e)); return true; }); }
    finally { writeFileSync(trustedManifest, saved); }
  } finally { writeFileSync(entry, original); }
});

await test("development pool is opt-in, label-independent, sorted and limited to initial top five; ordinary reports stay sanitized", async () => {
  const entry = join(validator, "dist/index.js"), original = readFileSync(entry);
  const script = serverScript.replace('const rules = a.query === "first observation" ? [rule("u1")] : a.query === "second observation" ? [rule("u2")] : [];',
    'const rules = a.query === "first observation" ? [rule("z"),rule("u1"),rule("a"),rule("z"),rule("x"),rule("b"),{...rule("late-alias"),aliases:["u1"]},rule("rank-six")] : a.query === "second observation" ? [rule("u2")] : [];');
  writeFileSync(entry, script);
  try {
    const output = join(TMP, "pool-development"), pool = join(output, "pool.json");
    const report = await runBenchmark({ validator, benchmark: dataDir, output, pool });
    const rows = JSON.parse(readFileSync(pool, "utf8"));
    assert.equal(rows.length, qs.length);
    assert.deepEqual(rows.map((r: { queryId: string }) => r.queryId), qs.map(q => sha256(q.id)).sort());
    assert.deepEqual(rows.find((r: { queryId: string }) => r.queryId === sha256("q1")), { queryId: sha256("q1"), ids: ["a", "b", "u1", "x", "z"] });
    for (const row of rows) assert.deepEqual(Object.keys(row).sort(), ["ids", "queryId"]);
    const bytes = readFileSync(pool, "utf8");
    for (const secret of [qs[0].query, labels[0].trecho, labels[0].fonte, "relevance", "rank-six", "late-alias", "rank", "estrato"]) assert.ok(!bytes.includes(secret), secret);
    assert.ok(!JSON.stringify(report).includes('"ids"'));
    const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
    assert.equal(manifest.pool.sha256, sha256(bytes));
    // Changing local labels cannot change the exported candidates or MCP selection.
    const altered = join(TMP, "pool-altered-labels"); dataset(altered);
    writeFileSync(join(altered, "qrels.jsonl"), labels.map(r => JSON.stringify({ ...r, relevance: 1, familia: "local-only" })).join("\n"));
    const secondPool = join(TMP, "external-pool.json");
    await runBenchmark({ validator, benchmark: altered, output: join(TMP, "pool-second"), pool: secondPool });
    assert.equal(readFileSync(secondPool, "utf8"), bytes);
    const duplicateOutput = join(TMP, "pool-existing-target");
    await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output: duplicateOutput, pool: secondPool }), /POOL_REQUIRES_NEW_FILE/);
    assert.equal(existsSync(duplicateOutput), false); assert.equal(readFileSync(secondPool, "utf8"), bytes);
    const cliPool = join(TMP, "cli-pool.json"), cliOutput = join(TMP, "cli-pool-output");
    const result = cli("--conjunto", dataDir, "--validator", validator, "--saida", cliOutput, "--pool", cliPool);
    assert.equal(result.status, 0, result.stderr); assert.equal(readFileSync(cliPool, "utf8"), bytes);
    assert.ok(!result.stdout.includes('"ids"')); assert.equal(result.stderr, "");
  } finally { writeFileSync(entry, original); }
});

await test("pool cannot target dataset, validator, artifact names or output ancestors", async () => {
  const output = join(TMP, "pool-path-conflicts");
  for (const pool of [join(dataDir, "new-pool.json"), join(validator, "new-pool.json"), output,
    join(output, "inputs.json"), join(output, "results.json"), join(output, "summary.json"), join(output, "manifest.json"), join(output, "failure.json")]) {
    await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output, pool }), /POOL_PATH_CONFLICT/);
    assert.equal(existsSync(output), false);
  }
  const ancestor = join(TMP, "pool-ancestor");
  await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output: join(ancestor, "out"), pool: ancestor }), /POOL_PATH_CONFLICT/);
  assert.equal(existsSync(ancestor), false);
});

await test("reserve plus pool is rejected by API and CLI before any input access, output or server startup", async () => {
  const missing = join(TMP, "must-not-be-read"), output = join(TMP, "reserve-pool-blocked"), pool = join(TMP, "reserve-pool.json");
  await assert.rejects(runBenchmark({ validator: missing, benchmark: missing, manifest: missing, output, pool, reserve: true }), /^Error: RESERVE_RUN_FAILED$/);
  const result = cli("--conjunto", missing, "--validator", missing, "--manifesto", missing, "--saida", output, "--pool", pool, "--reserva");
  assert.equal(result.status, 1); assert.equal(result.stderr.trim(), "RESERVE_RUN_FAILED"); assert.equal(result.stdout, "");
  assert.equal(existsSync(output), false); assert.equal(existsSync(pool), false);
});

await test("label conflicts retain the static dataset code in API, CLI and failure artifact, with no completed pool or manifest", async () => {
  const entry = join(validator, "dist/index.js"), original = readFileSync(entry);
  const conflicting = join(TMP, "conflicting-labels"); dataset(conflicting);
  writeFileSync(join(conflicting, "qrels.jsonl"), [...labels, { ...labels[0], unit_id: "alias", relevance: -1 }].map(r => JSON.stringify(r)).join("\n"));
  writeFileSync(entry, serverScript.replace('const rules = a.query === "first observation" ? [rule("u1")]', 'const rules = a.query === "first observation" ? [{...rule("u1"), aliases:["alias"]}]'));
  try {
    const output = join(TMP, "dataset-conflict"), pool = join(TMP, "conflict-pool.json");
    await assert.rejects(runBenchmark({ validator, benchmark: conflicting, output, pool }), /^Error: DATASET_LABEL_CONFLICT$/);
    assert.equal(JSON.parse(readFileSync(join(output, "failure.json"), "utf8")).error, "DATASET_LABEL_CONFLICT");
    assert.equal(existsSync(join(output, "manifest.json")), false); assert.equal(existsSync(pool), false);
    const cliOutput = join(TMP, "dataset-conflict-cli");
    const result = cli("--conjunto", conflicting, "--validator", validator, "--saida", cliOutput);
    assert.equal(result.status, 1); assert.equal(result.stderr.trim(), "DATASET_LABEL_CONFLICT"); assert.equal(result.stdout, "");
    assert.equal(JSON.parse(readFileSync(join(cliOutput, "failure.json"), "utf8")).error, "DATASET_LABEL_CONFLICT");
    assert.throws(() => groupFamilies(units({rules:[full("u1",{aliases:["alias"]})]}), [
      {...labels[0],familia:"first"}, {...labels[0],unit_id:"alias",familia:"second"}
    ]), /^Error: DATASET_LABEL_CONFLICT$/);
  } finally { writeFileSync(entry, original); }
});

await test("input mutation and tool failures never publish a completed development pool", async () => {
  const entry = join(validator, "dist/index.js"), original = readFileSync(entry);
  const kb = join(validator, "data/knowledge/versions/fixture-kb/manifest.json"), originalKb = readFileSync(kb);
  for (const mode of ["mutate", "tool-error"]) {
    const extra = mode === "mutate" ? `if(a.query === "missing source") appendFileSync(${JSON.stringify(kb)}, " ");` : 'if(a.query === "missing source") throw new Error("synthetic");';
    writeFileSync(entry, 'import {appendFileSync} from "node:fs";\n' + serverScript.replace("const a = request.params.arguments;", "const a = request.params.arguments;" + extra));
    try {
      const output = join(TMP, `pool-${mode}`), pool = join(TMP, `pool-${mode}.json`);
      await assert.rejects(runBenchmark({ validator, benchmark: dataDir, output, pool }), /BENCHMARK_FAILED/);
      assert.equal(existsSync(pool), false); assert.equal(existsSync(join(output, "manifest.json")), false);
    } finally { writeFileSync(entry, original); writeFileSync(kb, originalKb); }
  }
});

// ── validator 3.0.0 response contract (retrieval-evaluator-1.4.0), synthetic cards only ──
const card = (citeAs: string, more: Record<string, unknown> = {}, ids: string[] = [citeAs]) => ({ rank: 1, ids, citeAs, status: "investigate", force: "required",
  requirement: { heading: "H", text: "A public clause", complete: true }, why: { matched: ["x"], relation: "component", field: "text" },
  toVerify: [{ code: "no-declared-condition", origin: "clause" }], evidence: [], applicability: "unknown",
  source: { standard: "gov.br Design System", version: "3.7.0", url: "https://example.org/frozen" },
  more: { adjacentClauses: 0, next: { tool: "get_ds_rules", arguments: { id: citeAs } } }, ...more });
const v3 = (results: unknown[], page: Record<string, unknown> = {}) => wire({ contract: "oraculo-resposta/1.0.0", kind: "retrieval", status: results.length ? "candidates" : "no-match",
  results, gaps: [], page: { returned: results.length, matched: results.length, cursor: null, stop: "relevance-floor", ...page }, next: [] });
const idResponse = (id: string) => wire({ contract: "oraculo-resposta/1.0.0", kind: "normative", rule: full(id, { originalText: "A public clause", source: { url: "https://example.org/frozen" } }), normativeContext: {}, next: [] });

await test("3.0.0: relevance is the citeAs label only; context ids neither add relevance nor count as returned units", async () => {
  // citeAs unlabelled + a labelled context id: unjudged, not a hit.
  const r = await evaluateQuery(qs[0], labels, async () => v3([card("unlabelled", {}, ["unlabelled", "u1"])]));
  assert.equal(r.returned, 1); assert.equal(r.unjudged, 1); assert.equal(r.relevant, 0); assert.equal(r.hitAt5, false);
  const s = await evaluateQuery(qs[0], labels, async () => v3([card("u1"), card("bad"), card("other")]));
  assert.equal(s.returned, 3); assert.equal(s.relevant, 1); assert.equal(s.misleading, 1); assert.equal(s.unjudged, 1);
  assert.equal(s.precisionAt5, 1 / 3); assert.equal(s.supportedHitAt5, true); assert.equal(s.calls.length, 1);
  assert.deepEqual(units({ results: [card("a", {}, ["a", "t"]), card("a", {}, ["a", "z"])] }).map(u => u.ids), [["a", "t", "z"]]);
});
await test("3.0.0: a card whose context ids carry opposite labels is no conflict; legacy shape and one-family conflicts still are", async () => {
  const mixed = [labels[0], { ...labels[0], unit_id: "ctx-bad", relevance: -1 as const }];
  const r = await evaluateQuery(qs[0], mixed, async () => v3([card("u1", {}, ["u1", "ctx-bad"])]));
  assert.equal(r.relevant, 1); assert.equal(r.misleading, 0); assert.equal(r.hitAt5, true);
  const n = await evaluateQuery(qs[0], mixed, async () => v3([card("ctx-bad", {}, ["ctx-bad", "u1"])]));
  assert.equal(n.relevant, 0); assert.equal(n.misleading, 1);
  await assert.rejects(evaluateQuery(qs[0], mixed, async () => wire({ rules: [full("u1", { aliases: ["ctx-bad"] })] })), /^Error: DATASET_LABEL_CONFLICT$/);
  const family = mixed.map(x => ({ ...x, familia: "f" }));
  await assert.rejects(evaluateQuery(qs[0], family, async () => v3([card("u1"), card("ctx-bad")])), /^Error: DATASET_LABEL_CONFLICT$/);
  const copies = [labels[0], { ...labels[0], unit_id: "u1-copy" }].map(x => ({ ...x, familia: "f" }));
  const g = await evaluateQuery(qs[0], copies, async () => v3([card("u1"), card("u1-copy"), card("other")]));
  assert.equal(g.returned, 2); assert.equal(g.relevant, 1); assert.equal(g.precisionAt5, 1 / 2);
});
await test("3.0.0: isError is TOOL_CALL_FAILED with only an allow-listed static errorCode, never error text", async () => {
  const err = (code: unknown) => ({ isError: true, content: [{ type: "text", text: JSON.stringify({ contract: "oraculo-resposta/1.0.0", kind: "error", error: CANARY, errorCode: code, available: [CANARY], next: [] }) }] });
  const r = await evaluateQuery(qs[0], labels, async () => err("unknown-component"));
  assert.equal(r.error, "TOOL_CALL_FAILED"); assert.equal(r.errorCode, "unknown-component"); assert.equal(r.calls[0].errorCode, "unknown-component");
  assert.equal(r.returned, 0); clean(r);
  const odd = await evaluateQuery(qs[0], labels, async () => err(CANARY)); assert.equal(odd.errorCode, "unrecognized-error-code"); clean(odd);
  const plain = await evaluateQuery(qs[0], labels, async () => ({ isError: true, content: [{ type: "text", text: CANARY }] }));
  assert.equal(plain.error, "TOOL_CALL_FAILED"); assert.equal(plain.errorCode, null); clean(plain);
  const s = summarize([r, odd, plain]); assert.deepEqual(s.all.errorCodes, { "unknown-component": 1, "unrecognized-error-code": 1 }); assert.equal(s.all.errors, 3); clean(s);
  // An id follow-up that fails keeps the initial scoring and records the code.
  const f = await evaluateQuery(qs[0], labels, async args => args.id ? err("unknown-id") : v3([card("u1", { requirement: { heading: "H", text: "t", complete: false, code: "text-deferred" } })]));
  assert.equal(f.error, "TOOL_CALL_FAILED"); assert.equal(f.errorCode, "unknown-id"); assert.equal(f.hitAt5, true); assert.equal(f.callsUntilSufficientContext, null);
});
await test("3.0.0: ambiguous brief cards are scored the same way (ids[0] stands for citeAs) and followed by id", async () => {
  const brief = (ids: string[], group: string) => ({ rank: 1, group, ids, force: "required", status: "investigate", text: "t", complete: true, applicability: "unknown" });
  const seen: unknown[] = [];
  const r = await evaluateQuery(qs[0], labels, async args => {
    seen.push(args);
    if (args.id) return idResponse(String(args.id));
    return wire({ contract: "oraculo-resposta/1.0.0", kind: "retrieval", status: "ambiguous", ambiguity: { message: "m", groups: [] },
      results: [brief(["u1", "bad"], "menu"), brief(["other"], "modal")], page: { returned: 2, matched: 24, cursor: null, stop: "ambiguous" }, next: [] });
  });
  assert.equal(r.returned, 2); assert.equal(r.relevant, 1); assert.equal(r.misleading, 0); assert.equal(r.unjudged, 1);
  assert.equal(r.candidates, 24); assert.equal(r.callsUntilSufficientContext, 2);
  assert.deepEqual(seen.slice(1), [{ id: "u1" }, { id: "other" }]);
});
await test("3.0.0: candidates come from page.matched; legacy total still wins when present", async () => {
  const r = await evaluateQuery(qs[0], labels, async () => v3([card("u1")], { matched: 9 }));
  assert.equal(r.candidates, 9);
  const none = await evaluateQuery(qs[0], labels, async () => wire({ contract: "x", kind: "retrieval", results: [] }));
  assert.equal(none.candidates, null); assert.equal(none.returned, 0); assert.equal(none.error, null);
  assert.equal((await evaluateQuery(qs[0], labels, async () => wire({ total: 4, rules: [] }))).candidates, 4);
});
await test("3.0.0: complete requirement + source = context at call 1; otherwise the card's own more.next id is the second call", async () => {
  const seen: unknown[] = [];
  const incomplete = { requirement: { heading: "H", text: "cut…", complete: false, code: "text-deferred" } };
  const r = await evaluateQuery(qs[1], labels, async args => {
    seen.push(args);
    if (args.id) return idResponse(String(args.id));
    return v3([card("u2", incomplete), card("other", { source: undefined }), card("ok")]);
  });
  assert.deepEqual(seen, [{ query: qs[1].query, limit: 5 }, { id: "u2" }, { id: "other" }]);
  assert.equal(r.callsUntilSufficientContext, 2); assert.equal(r.calls.length, 3);
  assert.equal(r.characters, r.calls.reduce((n, c) => n + c.characters, 0));
  assert.equal(r.initialCharacters, JSON.stringify(v3([card("u2", incomplete), card("other", { source: undefined }), card("ok")])).length);
  const one = await evaluateQuery(qs[1], labels, async () => v3([card("u2")]));
  assert.equal(one.callsUntilSufficientContext, 1); assert.equal(one.calls.length, 1);
  // more.next pointing outside the card (or another tool) is not followed blindly: citeAs is asked instead.
  const odd: unknown[] = [];
  await evaluateQuery(qs[1], labels, async args => { odd.push(args); return args.id ? idResponse(String(args.id)) :
    v3([card("u2", { ...incomplete, more: { adjacentClauses: 0, next: { tool: "scan_page", arguments: { id: "elsewhere" } } } })]); });
  assert.deepEqual(odd[1], { id: "u2" });
  // An id response without context never becomes sufficient.
  const thin = await evaluateQuery(qs[1], labels, async args => args.id ? wire({ kind: "normative", rule: { id: "u2", normalizedRule: "text only" } }) : v3([card("u2", incomplete)]));
  assert.equal(thin.callsUntilSufficientContext, null); assert.equal(thin.error, null);
});

console.log(`\n${passed} passed; ${failed} failed. Synthetic artifacts: ${TMP}`);
if (failed) process.exitCode = 1;
