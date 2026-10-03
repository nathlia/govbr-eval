#!/usr/bin/env node
// Servidor estático mínimo das telas. Usa só módulos nativos do Node.js.
//
//   node server.mjs [--port 3300] [--host 127.0.0.1]     (ou PORT=... HOST=... node server.mjs)
//
// Serve somente os arquivos listados em site-manifest.json, a partir da pasta site/, carregados na
// memória na partida. Se algum arquivo não bater com o sha256 do manifesto, o servidor não sobe.
// Regras de resposta:
//   - caminho exato de um arquivo do manifesto: 200 com os bytes dele;
//   - caminho declarado em `routing.aliases`: 200 com os bytes do arquivo de destino;
//   - GET sem extensão sob `routing.spa.prefix`: 200 com `routing.spa.index` (aplicação de página única);
//   - caminho com "..", "." , barra invertida, %2e/%2f/%5c/%00 ou letra de unidade: 400;
//   - qualquer outro caminho: 404 (não há listagem de diretório);
//   - método diferente de GET/HEAD: 405.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = join(ROOT, "site");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3300;

const CONTENT_TYPES = {
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
  ".eot": "application/vnd.ms-fontobject",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const SAFE_PATH = /^(?![A-Za-z]:)(?!\/)(?!.*\\)(?!(?:.*\/)?\.\.?(?:\/|$))[^\u0000]+$/;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadSite() {
  const manifest = JSON.parse(readFileSync(join(ROOT, "site-manifest.json"), "utf8"));
  const files = new Map();
  for (const entry of manifest.files) {
    if (!SAFE_PATH.test(entry.path)) throw new Error(`Caminho inválido no manifesto: ${entry.path}`);
    const body = readFileSync(join(SITE_DIR, entry.path));
    if (createHash("sha256").update(body).digest("hex") !== entry.sha256) {
      throw new Error(`site/${entry.path} difere do site-manifest.json; o servidor não sobe com arquivo alterado.`);
    }
    files.set(`/${entry.path}`, { body, type: CONTENT_TYPES[extname(entry.path).toLowerCase()] ?? "application/octet-stream" });
  }
  const spa = manifest.routing?.spa ?? null;
  const aliases = manifest.routing?.aliases ?? {};
  for (const [from, to] of Object.entries(aliases)) {
    if (!files.has(`/${to}`)) throw new Error(`Alias ${from} aponta para ${to}, que não está no manifesto.`);
  }
  if (spa && !files.has(`/${spa.index}`)) throw new Error(`Índice ${spa.index} não está no manifesto.`);
  return { manifest, files, spa, aliases };
}

/** Caminho decodificado e seguro, ou o status de recusa. */
function requestPath(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.startsWith("/")) return { status: 400 };
  const rawPath = rawUrl.split("?")[0].split("#")[0];
  if (/%(2e|2f|5c|00)/i.test(rawPath) || rawPath.includes("\\")) return { status: 400 };
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return { status: 400 };
  }
  if (path.includes("\u0000") || path.includes("\\") || /^\/+[A-Za-z]:/.test(path)) return { status: 400 };
  if (path.split("/").some((segment) => segment === ".." || segment === ".")) return { status: 400 };
  return { path };
}

function resolveFile(site, path) {
  const exact = site.files.get(path);
  if (exact) return exact;
  const alias = site.aliases[path];
  if (alias) return site.files.get(`/${alias}`);
  if (site.spa && path.startsWith(site.spa.prefix) && !extname(path)) return site.files.get(`/${site.spa.index}`);
  return undefined;
}

function reply(res, status, extra = {}) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra });
  res.end(String(status));
}

export function createSiteServer(site) {
  return createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") return reply(res, 405, { allow: "GET, HEAD" });
    const { path, status } = requestPath(req.url);
    if (!path) return reply(res, status);
    const file = resolveFile(site, path);
    if (!file) return reply(res, 404);
    res.writeHead(200, {
      "content-type": file.type,
      "content-length": file.body.length,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : file.body);
  });
}

function main() {
  const host = argValue("--host") ?? process.env.HOST ?? DEFAULT_HOST;
  const portText = argValue("--port") ?? process.env.PORT ?? String(DEFAULT_PORT);
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`Porta inválida: ${portText}`);
    process.exit(1);
  }
  const site = loadSite();
  const server = createSiteServer(site);
  server.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
  server.listen(port, host, () => {
    const address = server.address();
    const origin = `http://${host.includes(":") ? `[${host}]` : host}:${address.port}`;
    console.log(`Servidor das telas em ${origin} (${site.files.size} arquivos). Ctrl+C encerra.`);
    for (const screen of site.manifest.screens) console.log(`  ${screen.title}: ${origin}${screen.entry}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.closeAllConnections?.();
      server.close(() => process.exit(0));
    });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
