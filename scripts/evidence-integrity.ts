/** Verify archived execution evidence at preparation AND offline score/render boundaries. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { EvidenceFile, EvidenceIndex } from "./flow-contract";

export interface EvidenceDeclaration {
  dir?: string | null;
  indexSha256?: string;
  status?: string;
}
const hash = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const isHash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

function inside(root: string, path: string): string {
  const rel = relative(realpathSync(root), realpathSync(path));
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || isAbsolute(rel)) {
    throw new Error(`Evidence path escapes archive: ${path}`);
  }
  return realpathSync(path);
}
function portable(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes(":") ||
      normalized.split("/").some(p => !p || p === "." || p === "..")) {
    throw new Error(`Invalid evidence relative path: ${path}`);
  }
  return normalized;
}

export function loadVerifiedEvidence(root: string, declared: EvidenceDeclaration | null | undefined,
  archived?: { evidenceDir?: string; evidenceIndexSha256?: string }): EvidenceIndex | null {
  if (declared?.status && declared.status !== "preserved") throw new Error("Run evidence preservation failed");
  if (!declared?.dir) {
    if (archived?.evidenceDir || archived?.evidenceIndexSha256) throw new Error("Manifest omitted archived run evidence");
    return null;
  }
  const dir = portable(declared.dir);
  if (archived?.evidenceDir && portable(archived.evidenceDir) !== dir) throw new Error("Evidence directory mismatch");
  if (!isHash(declared.indexSha256)) throw new Error("Missing/invalid evidence index hash in manifest");
  if (archived?.evidenceIndexSha256 && archived.evidenceIndexSha256 !== declared.indexSha256) {
    throw new Error("Manifest/archive evidence index hash mismatch");
  }
  const directory = inside(root, resolve(root, dir));
  const indexPath = inside(directory, resolve(directory, "evidence-index.json"));
  const bytes = readFileSync(indexPath);
  if (hash(bytes) !== declared.indexSha256) throw new Error(`Evidence index changed: ${dir}`);
  const index = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")) as { files?: unknown };
  if (!Array.isArray(index.files)) throw new Error(`Invalid evidence index: ${dir}`);
  const seen = new Set<string>();
  const files: EvidenceFile[] = index.files.map((file: EvidenceFile) => {
    if (!file || typeof file.path !== "string" || !isHash(file.sha256) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error(`Invalid evidence entry: ${dir}`);
    const path = portable(file.path);
    if (seen.has(path.toLowerCase())) throw new Error(`Duplicate evidence path: ${path}`);
    seen.add(path.toLowerCase());
    const target = inside(directory, resolve(directory, path));
    if (!statSync(target).isFile()) throw new Error(`Evidence is not a file: ${path}`);
    const content = readFileSync(target);
    if (content.length !== file.bytes || hash(content) !== file.sha256) throw new Error(`Evidence file changed: ${path}`);
    return { path, bytes: file.bytes, sha256: file.sha256 };
  });
  return { dir, files, integrity: { indexSha256: declared.indexSha256 } };
}

export function verifyArchivedEvidence(root: string, index: EvidenceIndex): void {
  if (!index.integrity) throw new Error("Package evidence was not verified at preparation");
  const fresh = loadVerifiedEvidence(root, { dir: index.dir, indexSha256: index.integrity.indexSha256 });
  if (JSON.stringify(fresh?.files) !== JSON.stringify(index.files)) throw new Error("Package/index evidence mismatch");
}
