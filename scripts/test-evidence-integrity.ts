import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { loadVerifiedEvidence, verifyArchivedEvidence } from "./evidence-integrity";
import { SCORER_FILES, digest, prepareSemanticPackage, scopeReviews } from "./semantic-flow";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
let tests = 0;
function test(name: string, fn: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "evidence-integrity-test-"));
  try { fn(root); tests++; console.log(`ok ${name}`); } finally {
    assert.equal(resolve(dirname(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("evidence-integrity-test-"));
    rmSync(root, { recursive: true, force: true });
  }
}
function fixture(root: string, files = [{ path: "snap.yml", bytes: 4, sha256: hash("good") }]) {
  mkdirSync(join(root, "archive"), { recursive: true });
  writeFileSync(join(root, "archive/snap.yml"), "good");
  const index = JSON.stringify({ files });
  writeFileSync(join(root, "archive/evidence-index.json"), index);
  return { dir: "archive", indexSha256: hash(index) };
}
test("valid archive verifies index and files; failed preservation is rejected", root => {
  const declared = fixture(root);
  const index = loadVerifiedEvidence(root, declared)!;
  assert.equal(index.integrity?.indexSha256, declared.indexSha256);
  verifyArchivedEvidence(root, index);
  assert.throws(() => loadVerifiedEvidence(root, { ...declared, status: "failed" }), /preservation failed/);
  assert.equal(loadVerifiedEvidence(root, null), null);
  assert.throws(() => loadVerifiedEvidence(root, null, { evidenceDir: "archive" }), /omitted/);
});
test("changed bytes, missing files, index mutation and metadata mismatches fail closed", root => {
  const declared = fixture(root);
  const index = loadVerifiedEvidence(root, declared)!;
  writeFileSync(join(root, "archive/snap.yml"), "evil");
  assert.throws(() => loadVerifiedEvidence(root, declared), /file changed/);
  assert.throws(() => verifyArchivedEvidence(root, index), /file changed/);
  rmSync(join(root, "archive/snap.yml"));
  assert.throws(() => loadVerifiedEvidence(root, declared), /ENOENT/);
  fixture(root);
  writeFileSync(join(root, "archive/evidence-index.json"), "{}");
  assert.throws(() => loadVerifiedEvidence(root, declared), /index changed/);
  fixture(root);
  assert.throws(() => loadVerifiedEvidence(root, declared, { evidenceIndexSha256: "a".repeat(64) }), /hash mismatch/);
  assert.throws(() => loadVerifiedEvidence(root, declared, { evidenceDir: "other" }), /directory mismatch/);
  assert.throws(() => loadVerifiedEvidence(root, { dir: declared.dir }), /index hash/);
});
test("traversal, absolute paths, duplicate entries and invalid file metadata are rejected", root => {
  for (const path of ["../outside.txt", "C:/outside.txt", "/outside.txt", "x/../../outside.txt"]) {
    const declared = fixture(root, [{ path, bytes: 4, sha256: hash("good") }]);
    assert.throws(() => loadVerifiedEvidence(root, declared), /Invalid evidence relative path/);
  }
  const duplicate = { path: "snap.yml", bytes: 4, sha256: hash("good") };
  assert.throws(() => loadVerifiedEvidence(root, fixture(root, [duplicate, duplicate])), /Duplicate evidence path/);
  assert.throws(() => loadVerifiedEvidence(root, fixture(root, [{ ...duplicate, sha256: "invented" }])), /Invalid evidence entry/);
});

// Actual offline CLI: corruption after package preparation must abort before writing a score.
const projectRoot = resolve(import.meta.dirname, "..");
const archiveRoot = mkdtempSync(join(projectRoot, "results", "evidence-integrity-test-"));
try {
  const declared = fixture(archiveRoot);
  declared.dir = relative(projectRoot, join(archiveRoot, declared.dir)).replaceAll("\\", "/");
  const evidence = loadVerifiedEvidence(projectRoot, declared)!;
  const pkg = prepareSemanticPackage({ referenceHash: "fixture", sceneHash: "fixture",
    scorerHash: digest(SCORER_FILES.map(path => [path, readFileSync(join(projectRoot, path), "utf8")])) }, [],
    { url: "http://fixture/fluxo.html", byKey: new Map(), bySelector: new Map() }, [{ id: "fixture",
      data: { model: "fixture", timestamp: "fixed", appUrl: "http://fixture/fluxo.html", findings: [] }, evidence }]);
  writeFileSync(join(archiveRoot, "package.json"), JSON.stringify(pkg));
  writeFileSync(join(archiveRoot, "reviews.json"), JSON.stringify(scopeReviews(pkg)));
  writeFileSync(join(archiveRoot, "archive/snap.yml"), "evil");
  const args = [join(projectRoot, "node_modules/tsx/dist/cli.mjs"), join(projectRoot, "scripts/semantic-flow-cli.ts"),
    "score", "--package", join(archiveRoot, "package.json"), "--reviews", join(archiveRoot, "reviews.json"),
    "--out", join(archiveRoot, "score.json")];
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Evidence file changed/);
  tests++; console.log("ok offline CLI rejects corrupted execution evidence");
} finally {
  assert.equal(resolve(dirname(archiveRoot)), resolve(projectRoot, "results"));
  assert.ok(basename(archiveRoot).startsWith("evidence-integrity-test-"));
  rmSync(archiveRoot, { recursive: true, force: true });
}
// ───────────────────────────────────────────── NAT-82: payload integral da ponte MCP (sem Docker, sem modelo)
// A ponte real (runner/container/bridge.mjs) diante de um servidor MCP de stdio mínimo; o cliente é o mesmo
// transporte HTTP que o agente usa. Playwright e oráculo passam pela MESMA resposta.
{
  const { spawn } = await import("node:child_process");
  const { createServer } = await import("node:net");
  const { cpSync, existsSync, readdirSync } = await import("node:fs");
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const { rebaseToolPayloads, verifyToolPayloads } = await import("./tool-payloads");
  const freePort = () => new Promise<number>(ok => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = (s.address() as { port: number }).port; s.close(() => ok(p)); }); });
  type Side = { text: string; truncated: boolean; payload?: Record<string, unknown> };
  type Ev = Record<string, unknown> & { kind: string; args: Side; result?: Side; argsSha256: string; resultSha256?: string };
  type FileRow = { path: string; role: string; bytes: number; sha256: string; mediaType: string };
  const LIMIT = 2 * 1024 * 1024;
  const root = mkdtempSync(join(tmpdir(), "evidence-integrity-test-"));
  const bridges: { kill: () => void }[] = [];
  try {
    const ponte = async (name: "playwright" | "oracle", tool: string) => {
      const out = join(root, name);
      mkdirSync(out, { recursive: true });
      const port = await freePort();
      const child = spawn(process.execPath, [join(projectRoot, "runner/container/bridge.mjs"), "--name", name, "--port", String(port),
        ...(name === "playwright" ? ["--windows", "1280x900"] : []), "--events", join(out, "tool-events.ndjson"), "--inventory", join(out, "inventory.json"),
        "--", process.execPath, join(projectRoot, "scripts/fixtures/ponte/stub-mcp.mjs")], { env: { ...process.env, STUB_TOOL: tool }, stdio: ["ignore", "pipe", "pipe"] });
      bridges.push({ kill: () => child.kill() });
      await new Promise<void>((ok, fail) => {
        let buf = "";
        const t = setTimeout(() => fail(new Error(`ponte ${name} não subiu: ${buf}`)), 20_000);
        child.stdout!.on("data", d => { buf += d; if (/ponte .* em :/.test(buf)) { clearTimeout(t); ok(); } });
        child.stderr!.on("data", d => { buf += d; });
      });
      const client = new Client({ name: "teste", version: "0" });
      await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
      const call = async (args: Record<string, unknown>) => {
        const r = await client.callTool({ name: tool, arguments: args });
        return (r.content as { type: string; text: string }[]).map(c => c.text).join("\n");
      };
      return { out, call, close: () => client.close() };
    };
    const calls = [
      { n: 10, marker: "e1" },                                   // projeção inteira: nada gravado
      { n: 20_000, marker: "e4242", pad: "p".repeat(5000) },     // > 4k nos dois lados: payload completo
      { n: 2_600_000, marker: "e9999" },                         // > limite declarado: prefixo de 2 MiB
    ];
    const visto: Record<string, { texts: string[]; events: Ev[]; out: string }> = {};
    for (const [name, tool] of [["playwright", "browser_snapshot"], ["oracle", "scan_page"]] as const) {
      const b = await ponte(name, tool);
      const texts: string[] = [];
      for (const a of calls) texts.push(await b.call(a));
      await b.close();
      const events = readFileSync(join(b.out, "tool-events.ndjson"), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l) as Ev).filter(e => e.kind === "call");
      visto[name] = { texts, events, out: b.out };
    }
    for (const [name, v] of Object.entries(visto)) {
      const [pequeno, grande, enorme] = v.events;
      // o agente recebe o resultado inteiro, com ou sem payload gravado
      assert.equal(v.texts[1].length, 20_000);
      assert.match(v.texts[1], /\[ref=e4242\] ç\n$/);
      assert.equal(v.texts[2].length, 2_600_000);
      assert.equal(pequeno.result!.truncated, false);
      assert.ok(!("payload" in pequeno.result!) && !("payload" in pequeno.args), `${name}: projeção inteira sem payload`);
      // > 4k: recuperável e byte-idêntico ao que o agente recebeu
      const rp = grande.result!.payload!;
      assert.equal(grande.result!.truncated, true);
      assert.equal(grande.result!.text.length, 4000);
      assert.equal(rp.status, "complete");
      assert.equal(rp.mediaType, "text/plain");
      assert.equal(rp.limitBytes, LIMIT);
      const file = readFileSync(join(v.out, rp.path as string));
      assert.ok(file.equals(Buffer.from(v.texts[1], "utf8")), `${name}: payload byte-idêntico`);
      assert.equal(rp.sha256, grande.resultSha256);
      assert.equal(rp.bytes, file.length);
      assert.equal(rp.totalBytes, file.length);
      const ap = grande.args.payload!;
      assert.equal(ap.status, "complete");
      assert.equal(ap.mediaType, "application/json");
      assert.equal(ap.sha256, grande.argsSha256);
      assert.deepEqual(JSON.parse(readFileSync(join(v.out, ap.path as string), "utf8")), calls[1]);
      // > limite declarado: prefixo, marcado como truncado; o fim não existe em lugar nenhum
      const tp = enorme.result!.payload!;
      assert.equal(tp.status, "truncated");
      assert.equal(tp.bytes, LIMIT);
      assert.ok((tp.totalBytes as number) > LIMIT);
      assert.ok(readFileSync(join(v.out, tp.path as string)).equals(Buffer.from(v.texts[2], "utf8").subarray(0, LIMIT)));
      assert.equal(readdirSync(join(v.out, "payloads")).length, 3, `${name}: só os lados cortados viram arquivo`);
      const inv = JSON.parse(readFileSync(join(v.out, "inventory.json"), "utf8")) as { payloads: unknown };
      assert.deepEqual(inv.payloads, { policy: "tool-payload-1.0.0", projectionChars: 4000, limitBytes: LIMIT, budgetBytes: 64 * 1024 * 1024, dir: "payloads" });
    }
    // simetria: mesma resposta → mesmo registro nas duas pontes, a menos do nome do arquivo
    const semCaminho = (e: Ev) => JSON.stringify([e.args, e.result].map(s => s && { ...s, payload: s.payload && { ...s.payload, path: "-" } }));
    for (const i of [0, 1, 2]) assert.equal(semCaminho(visto.playwright.events[i]), semCaminho(visto.oracle.events[i]), `chamada ${i}: mesmo registro nas duas pontes`);
    tests++; console.log("ok NAT-82 ponte: payload > 4k recuperável e byte-idêntico; acima do limite declarado = truncado; igual nas duas pontes; agente recebe o mesmo");

    // pacote: caminhos reescritos para o pacote, conferência contra arquivo, manifesto e hash da chamada
    const pkg = join(root, "pacote");
    const evs: Record<string, unknown>[] = [];
    for (const [name, role] of [["playwright", "browser"], ["oracle", "oracle"]] as const) {
      mkdirSync(join(pkg, "evidence/raw", role), { recursive: true });
      cpSync(join(visto[name].out, "payloads"), join(pkg, "evidence/raw", role, "payloads"), { recursive: true });
      evs.push(...readFileSync(join(visto[name].out, "tool-events.ndjson"), "utf8").split("\n").filter(Boolean)
        .map(l => rebaseToolPayloads(JSON.parse(l) as Record<string, unknown>, `evidence/raw/${role}`)));
    }
    const eventsText = evs.map(e => JSON.stringify(e)).join("\n") + "\n";
    const filesOf = (): FileRow[] => {
      const out: FileRow[] = [];
      for (const role of ["browser", "oracle"]) for (const f of readdirSync(join(pkg, "evidence/raw", role, "payloads"))) {
        const path = `evidence/raw/${role}/payloads/${f}`;
        const b = readFileSync(join(pkg, path));
        out.push({ path, role: "tool-payload", bytes: b.length, sha256: hash(b), mediaType: f.endsWith(".json") ? "application/json" : "text/plain" });
      }
      return out;
    };
    const read = (p: string) => existsSync(join(pkg, p)) ? readFileSync(join(pkg, p)) : null;
    const ok = verifyToolPayloads(eventsText, read, filesOf(), true);
    assert.equal(ok.texts.size, 6);
    assert.deepEqual(ok.counts, { complete: 4, truncated: 2, "over-budget": 0, failed: 0 });
    // legado: eventos sem payload leem como antes, nada reconstruído
    const legado = evs.map(e => JSON.stringify(JSON.parse(JSON.stringify(e), (k, v) => k === "payload" ? undefined : v))).join("\n");
    assert.equal(verifyToolPayloads(legado, read).texts.size, 0);
    assert.equal(verifyToolPayloads(null, read).texts.size, 0);
    // adulteração: só o arquivo; arquivo + manifesto; arquivo + manifesto + payload.sha256 (o hash da chamada ainda pega)
    const alvo = (evs.find(e => (e as Ev).result?.payload?.status === "complete") as Ev).result!.payload!.path as string;
    const original = readFileSync(join(pkg, alvo));
    const evil = Buffer.from(original.toString("utf8").replace("e4242", "e4243"), "utf8");
    writeFileSync(join(pkg, alvo), evil);
    const files0 = filesOf().map(f => f.path === alvo ? { ...f, sha256: hash(original), bytes: original.length } : f);
    assert.throws(() => verifyToolPayloads(eventsText, read, files0, true), /Payload alterado/);
    assert.throws(() => verifyToolPayloads(eventsText, read, filesOf(), true), /Payload diverge do manifesto/);
    const forjado = eventsText.replace(`"sha256":"${hash(original)}"`, `"sha256":"${hash(evil)}"`);
    assert.notEqual(forjado, eventsText);
    assert.throws(() => verifyToolPayloads(forjado, read, filesOf(), true), /não confere com o hash da chamada/);
    writeFileSync(join(pkg, alvo), original);
    // arquivo órfão, papel errado, caminho que escapa, arquivo ausente
    const orfao = [...filesOf(), { path: "evidence/raw/oracle/payloads/extra.txt", role: "tool-payload", bytes: 1, sha256: hash("x"), mediaType: "text/plain" }];
    assert.throws(() => verifyToolPayloads(eventsText, read, orfao, true), /sem evento que o cite/);
    assert.throws(() => verifyToolPayloads(eventsText, read, filesOf().map(f => ({ ...f, role: "evidence" })), true), /papel evidence/);
    assert.throws(() => verifyToolPayloads(eventsText.replace(alvo, "../fora.txt"), read), /Invalid payload relative path/);
    assert.throws(() => verifyToolPayloads(eventsText, () => null), /Payload ausente/);
    // sem orçamento / falha: sem arquivo, nunca completo
    const semArquivo = JSON.stringify({ kind: "call", server: "oracle", seq: 1, argsSha256: hash("{}"), args: { text: "{}", truncated: false },
      resultSha256: hash("x"), result: { text: "x", truncated: true, payload: { status: "over-budget", path: null, totalBytes: 9, limitBytes: LIMIT } } });
    assert.deepEqual(verifyToolPayloads(semArquivo, read).counts, { complete: 0, truncated: 0, "over-budget": 1, failed: 0 });
    assert.throws(() => verifyToolPayloads(semArquivo.replace('"path":null', '"path":"x.txt"'), read), /não pode citar arquivo/);
    tests++; console.log("ok NAT-82 pacote: payload conferido contra arquivo, manifesto e hash da chamada; adulteração, órfão e papel errado detectados; legado lido sem reconstrução");
  } finally {
    for (const b of bridges) b.kill();
    assert.equal(resolve(dirname(root)), resolve(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  }
}
console.log(`${tests} evidence integrity groups passed.`);
