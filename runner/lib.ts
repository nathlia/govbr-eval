/**
 * Utilidades do runner isolado (T3a), lado do host: Docker pela linha de comando, caminhos,
 * hashes e o lockfile das imagens. Nada aqui chama modelo.
 */
import { execFileSync, spawn, type SpawnOptions } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RUNNER_DIR = dirname(fileURLToPath(import.meta.url));
export const EVAL_ROOT = resolve(RUNNER_DIR, "..");
export const TCC_ROOT = resolve(EVAL_ROOT, "..");
export const DEFAULT_TELAS_DIR = join(TCC_ROOT, "govbr-telas");
export const DEFAULT_VALIDATOR_DIR = join(TCC_ROOT, "govbr-ds-validator");
export const LOCK_PATH = join(RUNNER_DIR, "images.lock.json");

/** Base de todas as imagens: Node 24 LTS, fixada por digest (nunca `latest`). */
export const BASE_IMAGE = "node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6";
export const NODE_VERSION = "24.21.0";
export const PLAYWRIGHT_MCP_VERSION = "0.0.70";
export const CLAUDE_CODE_VERSION = "2.1.288";
export const RUNNER_VERSION = "runner-isolado-1.0.0";
export const ISOLATION_POLICY_VERSION = "isolamento-runner-1.0.0";

export const sha256 = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

export interface DockerResult { code: number; stdout: string; stderr: string }

/** `docker …` síncrono; nunca passa por shell (caminhos com espaço vão como argumento). */
export function docker(args: string[], opts: { allowFail?: boolean; input?: string; timeoutMs?: number } = {}): DockerResult {
  try {
    const stdout = execFileSync("docker", args, {
      encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], input: opts.input, timeout: opts.timeoutMs ?? 600_000, maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string; message: string };
    const result = { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? e.message) };
    if (!opts.allowFail) throw new Error(`docker ${args.slice(0, 3).join(" ")} falhou (${result.code}): ${result.stderr.trim().slice(0, 800)}`);
    return result;
  }
}

/** `docker …` assíncrono, com saída transmitida a um callback (build longo). */
export function dockerStream(args: string[], onLine: (line: string) => void, options: SpawnOptions = {}): Promise<number> {
  return new Promise((resolvePromise) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    const feed = (b: Buffer): void => b.toString("utf8").split(/\r?\n/).filter(Boolean).forEach(onLine);
    child.stdout?.on("data", feed);
    child.stderr?.on("data", feed);
    child.on("close", (code) => resolvePromise(code ?? 1));
  });
}

export function dockerAvailable(): { ok: boolean; detail: string } {
  const r = docker(["version", "--format", "{{.Server.Version}} {{.Server.Os}}"], { allowFail: true, timeoutMs: 20_000 });
  return r.code === 0 ? { ok: true, detail: r.stdout.trim() } : { ok: false, detail: r.stderr.trim().split("\n")[0] };
}

export function imageId(ref: string): string | null {
  const r = docker(["image", "inspect", ref, "--format", "{{.Id}}"], { allowFail: true });
  return r.code === 0 ? r.stdout.trim() : null;
}

export function imageLabels(ref: string): Record<string, string> {
  return JSON.parse(docker(["image", "inspect", ref, "--format", "{{json .Config.Labels}}"]).stdout) ?? {};
}

export interface ImageEntry { tag: string; id: string; labels: Record<string, string> }
export interface ImagesLock {
  lockVersion: 1;
  builtAt: string;
  base: { ref: string; node: string };
  images: Record<"screens" | "agent" | "oracle" | "collector" | "egress", ImageEntry>;
  versions: {
    node: string; playwrightMcp: string; playwright: string; chromium: string; claudeCode: string;
    oracle: { package: string; version: string; distSha256: string; dataSha256: string };
    telas: { siteSha256: string; manifestSha256: string };
  };
}

export function loadLock(path = LOCK_PATH): ImagesLock {
  if (!existsSync(path)) throw new Error(`${path} ausente: rode 'npm run runner:imagens' antes`);
  return JSON.parse(readFileSync(path, "utf8")) as ImagesLock;
}

export const nowUtc = (): string => new Date().toISOString().replace(/\.\d+Z$/, "Z");
