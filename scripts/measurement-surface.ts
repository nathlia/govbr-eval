/**
 * Superfície de medida — checklist v02, fatia 1 (D-40).
 *
 * O que o navegador de uma execução alcança deixa de depender do prompt. Quatro servidores, e só
 * dois deles alcançáveis:
 *
 *   site      a tela congelada: somente o fechamento de arquivos da entrada, copiado do build de
 *             produção do corpus, conferido por sha256 e servido da memória. Sem índice, sem
 *             fallback de SPA, sem /@fs — o que não está no manifesto é 404.
 *   coletor   recebe o relatório da execução armada (POST /api/submit). Não serve arquivo nenhum.
 *   proxy     todo pedido do navegador passa por ele — o Playwright encaminha inclusive o loopback.
 *             Só as origens do site e do coletor seguem adiante; o resto recebe 403 e fica no log.
 *   controle  arma e desarma a execução. Fica fora da política: o agente não arma nada.
 *
 * Uso:
 *   tsx scripts/measurement-surface.ts serve --corpus-dist ../govbr-corpus/dist --entry fluxo.html --out DIR
 *
 * `serve` congela o site em DIR (que precisa ser novo), sobe os quatro servidores e escreve
 * DIR/surface.json. Roda até ser encerrado.
 */
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SURFACE_VERSION = "surface-1.0.0";
export const HOST = "127.0.0.1";
export const DEFAULT_PORTS = { site: 3100, collector: 4100, control: 4101, proxy: 4102 } as const;
export type SurfacePorts = { site: number; collector: number; control: number; proxy: number };

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const RUNNER_OWNED_FIELDS = ["config", "cost"];

const sha256 = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

// ───────────────────────────────────────────────────────────────── site congelado

export interface SiteManifest {
  version: string;
  entry: string;
  sourceDist: string;
  corpusCommit: string | null;
  corpusDirty: boolean | null;
  /** caminho servido ("/fluxo.html") → sha256 */
  files: Record<string, string>;
}

const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

function listFiles(root: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * Fechamento da entrada: todo arquivo do build cujo nome aparece no texto de um arquivo já incluído,
 * transitivamente. É conservador por construção — um nome citado entra —, e o teste de isolamento
 * confere o outro lado: rota irmã (a suíte TC-*, a ala real) fica de fora e responde 404.
 */
export function assetClosure(distDir: string, entry: string): string[] {
  const all = listFiles(distDir);
  if (!all.includes(entry)) throw new Error(`Entrada ${entry} não existe em ${distDir}. Rode 'npm run build' no corpus.`);
  const byName = new Map<string, string[]>();
  for (const rel of all) byName.set(basename(rel), [...(byName.get(basename(rel)) ?? []), rel]);
  const included = new Set([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const rel = queue.shift()!;
    if (!TEXT_EXTENSIONS.has(extname(rel))) continue;
    const text = readFileSync(join(distDir, rel), "utf8");
    for (const [name, rels] of byName) {
      if (!text.includes(name)) continue;
      for (const candidate of rels) {
        if (included.has(candidate)) continue;
        included.add(candidate);
        queue.push(candidate);
      }
    }
  }
  return [...included].sort();
}

function gitState(repo: string): { commit: string | null; dirty: boolean | null } {
  try {
    const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const status = execFileSync("git", ["-C", repo, "status", "--porcelain"], { encoding: "utf8" }).trim();
    return { commit, dirty: status.length > 0 };
  } catch {
    return { commit: null, dirty: null };
  }
}

export function freezeSite(distDir: string, entry: string, outDir: string, corpusRoot = dirname(resolve(distDir))): SiteManifest {
  const files: Record<string, string> = {};
  for (const rel of assetClosure(distDir, entry)) {
    const body = readFileSync(join(distDir, rel));
    const target = join(outDir, "site", rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body, { flag: "wx" });
    files[`/${rel}`] = sha256(body);
  }
  const git = gitState(corpusRoot);
  const manifest: SiteManifest = {
    version: SURFACE_VERSION,
    entry: `/${entry}`,
    sourceDist: resolve(distDir),
    corpusCommit: git.commit,
    corpusDirty: git.dirty,
    files,
  };
  writeFileSync(join(outDir, "site-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return manifest;
}

export interface LoadedSite {
  manifest: SiteManifest;
  manifestSha256: string;
  files: Map<string, { body: Buffer; type: string }>;
}

/** Carrega o site congelado na memória e recusa qualquer arquivo que não bata com o manifesto. */
export function loadSite(outDir: string): LoadedSite {
  const manifestText = readFileSync(join(outDir, "site-manifest.json"), "utf8");
  const manifest = JSON.parse(manifestText) as SiteManifest;
  const files = new Map<string, { body: Buffer; type: string }>();
  for (const [path, expected] of Object.entries(manifest.files)) {
    const body = readFileSync(join(outDir, "site", path.slice(1)));
    if (sha256(body) !== expected) throw new Error(`Site congelado alterado: ${path}`);
    files.set(path, { body, type: CONTENT_TYPES[extname(path)] ?? "application/octet-stream" });
  }
  return { manifest, manifestSha256: sha256(manifestText), files };
}

function requestPath(url: string | undefined): string | null {
  try {
    return decodeURIComponent(new URL(url ?? "/", "http://site").pathname);
  } catch {
    return null;
  }
}

export function createSiteServer(site: LoadedSite): Server {
  return createServer((req, res) => {
    const path = requestPath(req.url);
    const file = path ? site.files.get(path) : undefined;
    if (!file || (req.method !== "GET" && req.method !== "HEAD")) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("404");
      return;
    }
    res.writeHead(200, { "content-type": file.type, "content-length": file.body.length, "cache-control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : file.body);
  });
}

// ───────────────────────────────────────────────────────────────── proxy de saída

export interface EgressEvent {
  seq: number;
  at: string;
  kind: "http" | "connect" | "upgrade";
  method: string;
  /** esquema + host + caminho, sem query */
  target: string;
  allowed: boolean;
  status: number | null;
}

export interface EgressProxy {
  server: Server;
  events: EgressEvent[];
}

/** `allowedHosts` são pares host:porta exatos, só HTTP. HTTPS (CONNECT) é sempre negado. */
export function createEgressProxy(allowedHosts: string[], logFile: string | null): EgressProxy {
  const allowed = new Set(allowedHosts);
  const events: EgressEvent[] = [];
  const record = (event: Omit<EgressEvent, "seq" | "at">): EgressEvent => {
    const full = { seq: events.length, at: new Date().toISOString(), ...event };
    events.push(full);
    if (logFile) appendFileSync(logFile, JSON.stringify(full) + "\n", "utf8");
    return full;
  };

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let url: URL;
    try {
      url = new URL(req.url ?? "");
    } catch {
      record({ kind: "http", method: req.method ?? "?", target: String(req.url), allowed: false, status: 400 });
      res.writeHead(400);
      res.end();
      return;
    }
    const target = `${url.protocol}//${url.host}${url.pathname}`;
    if (url.protocol !== "http:" || !allowed.has(url.host)) {
      record({ kind: "http", method: req.method ?? "?", target, allowed: false, status: 403 });
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("Bloqueado pela politica de rede desta execucao.");
      return;
    }
    const headers = { ...req.headers };
    delete headers["proxy-connection"];
    delete headers["proxy-authorization"];
    const upstream = httpRequest(
      { host: url.hostname, port: url.port, method: req.method, path: url.pathname + url.search, headers },
      (upstreamRes) => {
        record({ kind: "http", method: req.method ?? "?", target, allowed: true, status: upstreamRes.statusCode ?? null });
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      }
    );
    upstream.on("error", () => {
      record({ kind: "http", method: req.method ?? "?", target, allowed: true, status: 502 });
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });

  server.on("connect", (req: IncomingMessage, socket: Socket) => {
    record({ kind: "connect", method: "CONNECT", target: String(req.url), allowed: false, status: 403 });
    socket.on("error", () => {});
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  });
  server.on("upgrade", (req: IncomingMessage, socket: Socket) => {
    record({ kind: "upgrade", method: req.method ?? "GET", target: String(req.url), allowed: false, status: 403 });
    socket.on("error", () => {});
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  });
  return { server, events };
}

export function summarizeEgress(events: EgressEvent[]): { requests: number; allowed: number; denied: number; deniedTargets: string[] } {
  const denied = events.filter((e) => !e.allowed);
  return {
    requests: events.length,
    allowed: events.length - denied.length,
    denied: denied.length,
    deniedTargets: [...new Set(denied.map((e) => e.target))].sort(),
  };
}

// ───────────────────────────────────────────────────────────────── coletor

export interface SubmissionReceipt {
  runId: string;
  sha256: string;
  acceptedAt: string;
  file: string;
  droppedFields: string[];
}

export function validateFlowReport(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["o corpo precisa ser um objeto JSON"];
  const report = value as Record<string, unknown>;
  for (const field of ["timestamp", "model", "appUrl"]) {
    if (typeof report[field] !== "string" || !(report[field] as string).trim()) errors.push(`${field}: texto obrigatório`);
  }
  if (report.scope !== undefined && (!Array.isArray(report.scope) || report.scope.some((s) => typeof s !== "string"))) {
    errors.push("scope: lista de textos");
  }
  if (report.notes !== undefined && typeof report.notes !== "string") errors.push("notes: texto");
  if (!Array.isArray(report.findings)) {
    errors.push("findings: lista obrigatória");
    return errors;
  }
  report.findings.forEach((finding, index) => {
    const at = `findings[${index}]`;
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
      errors.push(`${at}: objeto`);
      return;
    }
    const f = finding as Record<string, unknown>;
    for (const field of ["selector", "rule", "description"]) {
      if (typeof f[field] !== "string" || !(f[field] as string).trim()) errors.push(`${at}.${field}: texto obrigatório`);
    }
    if (f.relatedSelectors !== undefined &&
      (!Array.isArray(f.relatedSelectors) || f.relatedSelectors.some((s) => typeof s !== "string"))) {
      errors.push(`${at}.relatedSelectors: lista de textos`);
    }
  });
  return errors;
}

interface ArmedRun {
  runId: string;
  armedAt: string;
  egressFrom: number;
  receipt: SubmissionReceipt | null;
  rejected: string[];
}

export class Collector {
  private armed: ArmedRun | null = null;
  private rejectedCount = 0;

  constructor(private readonly inboxDir: string, private readonly rejectedDir: string, private readonly egress: EgressEvent[]) {
    mkdirSync(inboxDir, { recursive: true });
    mkdirSync(rejectedDir, { recursive: true });
  }

  arm(runId: string): ArmedRun {
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(runId)) throw new Error("runId inválido");
    if (this.armed) throw new Error(`Execução ${this.armed.runId} ainda armada`);
    if (existsSync(join(this.inboxDir, `${runId}.json`))) throw new Error(`runId ${runId} já recebeu relatório`);
    this.armed = { runId, armedAt: new Date().toISOString(), egressFrom: this.egress.length, receipt: null, rejected: [] };
    return this.armed;
  }

  disarm(): { runId: string; armedAt: string; receipt: SubmissionReceipt | null; rejected: string[]; egress: ReturnType<typeof summarizeEgress> } {
    if (!this.armed) throw new Error("Nenhuma execução armada");
    const run = this.armed;
    this.armed = null;
    return {
      runId: run.runId,
      armedAt: run.armedAt,
      receipt: run.receipt,
      rejected: run.rejected,
      egress: summarizeEgress(this.egress.slice(run.egressFrom)),
    };
  }

  private archiveRejected(reason: string, body: string): string {
    const name = `${this.armed?.runId ?? "sem-execucao"}-${String(++this.rejectedCount).padStart(3, "0")}.json`;
    writeFileSync(join(this.rejectedDir, name), JSON.stringify({ reason, receivedAt: new Date().toISOString(), body }, null, 2) + "\n");
    this.armed?.rejected.push(name);
    return name;
  }

  /** Devolve status HTTP e corpo da resposta. */
  submit(body: string): { status: number; response: Record<string, unknown> } {
    if (!this.armed) {
      this.archiveRejected("nenhuma execução armada", body);
      return { status: 409, response: { ok: false, error: "nenhuma execução armada neste receptor" } };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      this.archiveRejected("JSON inválido", body);
      return { status: 400, response: { ok: false, error: `JSON inválido: ${(error as Error).message}` } };
    }
    const errors = validateFlowReport(parsed);
    if (errors.length > 0) {
      this.archiveRejected(`contrato: ${errors.join("; ")}`, body);
      return { status: 400, response: { ok: false, errors } };
    }
    const report = { ...(parsed as Record<string, unknown>) };
    const droppedFields = RUNNER_OWNED_FIELDS.filter((field) => field in report);
    for (const field of droppedFields) delete report[field];
    const canonical = JSON.stringify(report, null, 2) + "\n";
    const hash = sha256(canonical);
    const run = this.armed;
    if (run.receipt) {
      if (run.receipt.sha256 === hash) return { status: 200, response: { ok: true, duplicate: true, receipt: run.receipt } };
      this.archiveRejected("relatório diferente do já aceito para esta execução", body);
      return { status: 409, response: { ok: false, error: "esta execução já tem um relatório aceito e diferente" } };
    }
    const file = `${run.runId}.json`;
    writeFileSync(join(this.inboxDir, file), canonical, { flag: "wx" });
    writeFileSync(join(this.inboxDir, `${run.runId}.raw.txt`), body, { flag: "wx" });
    run.receipt = { runId: run.runId, sha256: hash, acceptedAt: new Date().toISOString(), file, droppedFields };
    return { status: 200, response: { ok: true, receipt: run.receipt } };
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("corpo acima de 2 MB"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

const NEUTRAL_PAGE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receptor de resultados</title></head><body><p>Receptor de resultados desta execução.</p></body></html>`;

export function createCollectorServer(collector: Collector): Server {
  return createServer(async (req, res) => {
    const path = requestPath(req.url);
    if (req.method === "GET" && path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(NEUTRAL_PAGE);
      return;
    }
    if (req.method === "GET" && path === "/health") return sendJson(res, 200, { ok: true });
    if (path === "/api/submit") {
      if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "use POST" });
      if (!String(req.headers["content-type"] ?? "").includes("application/json")) {
        return sendJson(res, 415, { ok: false, error: "Content-Type: application/json" });
      }
      try {
        const result = collector.submit(await readBody(req));
        return sendJson(res, result.status, result.response);
      } catch (error) {
        return sendJson(res, 413, { ok: false, error: (error as Error).message });
      }
    }
    sendJson(res, 404, { ok: false });
  });
}

export function createControlServer(collector: Collector, status: () => unknown, onShutdown: () => void): Server {
  return createServer(async (req, res) => {
    const path = requestPath(req.url);
    try {
      if (req.method === "GET" && path === "/control/status") return sendJson(res, 200, status());
      if (req.method === "POST" && path === "/control/arm") {
        const { runId } = JSON.parse(await readBody(req)) as { runId: string };
        return sendJson(res, 200, { ok: true, armed: collector.arm(runId) });
      }
      if (req.method === "POST" && path === "/control/disarm") return sendJson(res, 200, { ok: true, ...collector.disarm() });
      if (req.method === "POST" && path === "/control/shutdown") {
        sendJson(res, 200, { ok: true });
        onShutdown();
        return;
      }
      sendJson(res, 404, { ok: false });
    } catch (error) {
      sendJson(res, 409, { ok: false, error: (error as Error).message });
    }
  });
}

// ───────────────────────────────────────────────────────────────── superfície inteira

export interface SurfaceDescription {
  version: string;
  startedAt: string;
  pid: number;
  entryUrl: string;
  origins: { site: string; collector: string };
  proxyServer: string;
  control: string;
  allowedHosts: string[];
  siteManifest: string;
  siteManifestSha256: string;
  corpusCommit: string | null;
  corpusDirty: boolean | null;
  egressLog: string;
  policy: Record<string, string>;
}

export interface RunningSurface {
  description: SurfaceDescription;
  collector: Collector;
  egress: EgressEvent[];
  close: () => Promise<void>;
}

const listen = (server: Server, port: number): Promise<void> =>
  new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => resolveListen());
  });

export async function startSurface(options: {
  corpusDist: string;
  entry: string;
  outDir: string;
  ports?: SurfacePorts;
}): Promise<RunningSurface> {
  const ports = options.ports ?? DEFAULT_PORTS;
  if (existsSync(options.outDir)) throw new Error(`${options.outDir} já existe: a superfície de cada bateria é nova.`);
  mkdirSync(options.outDir, { recursive: true });
  freezeSite(options.corpusDist, options.entry, options.outDir);
  const site = loadSite(options.outDir);

  const siteHost = `${HOST}:${ports.site}`;
  const collectorHost = `${HOST}:${ports.collector}`;
  const egressLog = join(options.outDir, "egress.ndjson");
  const proxy = createEgressProxy([siteHost, collectorHost], egressLog);
  const collector = new Collector(join(options.outDir, "inbox"), join(options.outDir, "rejected"), proxy.events);

  const description: SurfaceDescription = {
    version: SURFACE_VERSION,
    startedAt: new Date().toISOString(),
    pid: process.pid,
    entryUrl: `http://${siteHost}${site.manifest.entry}`,
    origins: { site: `http://${siteHost}`, collector: `http://${collectorHost}` },
    proxyServer: `http://${HOST}:${ports.proxy}`,
    control: `http://${HOST}:${ports.control}`,
    allowedHosts: [siteHost, collectorHost],
    siteManifest: "site-manifest.json",
    siteManifestSha256: site.manifestSha256,
    corpusCommit: site.manifest.corpusCommit,
    corpusDirty: site.manifest.corpusDirty,
    egressLog: "egress.ndjson",
    policy: {
      boundary: "proxy HTTP de encaminhamento; o navegador do Playwright MCP e o do oráculo apontam para ele (--proxy-server / GOVBR_VALIDATOR_PROXY_SERVER), e o Playwright encaminha o loopback",
      allowed: "somente as origens do site congelado e do coletor, por host:porta exato, só HTTP",
      https: "negado (CONNECT 403)",
      site: "somente os arquivos do manifesto; sem índice, sem fallback, sem /@fs",
      collector: "POST /api/submit da execução armada; relatório diferente do aceito é recusado e arquivado",
    },
  };

  const servers: Server[] = [];
  let closing: Promise<void> | null = null;
  const close = (): Promise<void> => {
    closing ??= Promise.all(servers.map((s) => new Promise<void>((done) => { s.closeAllConnections(); s.close(() => done()); }))).then(() => undefined);
    return closing;
  };

  const siteServer = createSiteServer(site);
  const collectorServer = createCollectorServer(collector);
  const controlServer = createControlServer(
    collector,
    () => ({ ...description, egress: summarizeEgress(proxy.events) }),
    () => void close().then(() => process.exit(0))
  );
  for (const [server, port] of [[siteServer, ports.site], [collectorServer, ports.collector], [controlServer, ports.control], [proxy.server, ports.proxy]] as const) {
    await listen(server, port);
    servers.push(server);
  }
  writeFileSync(join(options.outDir, "surface.json"), JSON.stringify(description, null, 2) + "\n", { flag: "wx" });
  return { description, collector, egress: proxy.events, close };
}

// ───────────────────────────────────────────────────────────────── CLI

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const corpusDist = argValue(args, "--corpus-dist");
  const entry = argValue(args, "--entry") ?? "fluxo.html";
  const outDir = argValue(args, "--out");
  if (command !== "serve" || !corpusDist || !outDir) {
    console.error("Uso: measurement-surface.ts serve --corpus-dist DIR --entry fluxo.html --out NOVO_DIR");
    process.exit(1);
  }
  const surface = await startSurface({ corpusDist, entry, outDir: resolve(outDir) });
  console.log(JSON.stringify(surface.description));
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => void surface.close().then(() => process.exit(0)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
