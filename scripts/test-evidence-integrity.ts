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
console.log(`${tests} evidence integrity groups passed.`);
