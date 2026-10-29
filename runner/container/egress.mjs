#!/usr/bin/env node
// Proxy de saída com allowlist (T3a do runner isolado). Usa só módulos nativos do Node.
//
// Duas instâncias por execução, mesma imagem, mesmo código:
//   egress-provedor  única saída do processo do agente: só CONNECT para os hosts do provedor (443).
//   egress-site      única saída dos navegadores (Playwright MCP e oráculo): só HTTP para a tela e o
//                    coletor, por host:porta exato.
// Tudo o que não está na allowlist recebe 403 e fica no log (uma linha JSON por pedido).
//
// Ambiente: EGRESS_NAME, EGRESS_ALLOW_HTTP ("host:porta,..."), EGRESS_ALLOW_CONNECT ("host:porta,..."),
//           EGRESS_LOG (arquivo ndjson), EGRESS_PORT (padrão 3128).
import { createServer, request as httpRequest } from "node:http";
import { connect as netConnect } from "node:net";
import { appendFileSync } from "node:fs";

const NAME = process.env.EGRESS_NAME ?? "egress";
const list = (v) => new Set((v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const ALLOW_HTTP = list(process.env.EGRESS_ALLOW_HTTP);
const ALLOW_CONNECT = list(process.env.EGRESS_ALLOW_CONNECT);
const LOG = process.env.EGRESS_LOG ?? null;
const PORT = Number(process.env.EGRESS_PORT ?? 3128);
let seq = 0;

function record(event) {
  const line = { seq: seq++, at: new Date().toISOString(), proxy: NAME, ...event };
  if (LOG) appendFileSync(LOG, JSON.stringify(line) + "\n");
  return line;
}

/** host:porta normalizado; recusa formas ambíguas (credenciais na URL, porta ausente em CONNECT). */
export function normalizeTarget(host, port) {
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, "");
  return `${h.includes(":") ? `[${h}]` : h}:${port}`;
}

const server = createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url ?? "");
  } catch {
    record({ kind: "http", method: req.method, target: String(req.url).slice(0, 200), allowed: false, status: 400, reason: "url-relativa" });
    res.writeHead(400).end();
    return;
  }
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const target = normalizeTarget(url.hostname, port);
  const shown = `${url.protocol}//${target}${url.pathname}`.slice(0, 300);
  if (url.protocol !== "http:" || url.username || url.password || !ALLOW_HTTP.has(target)) {
    record({ kind: "http", method: req.method, target: shown, allowed: false, status: 403, reason: "fora-da-allowlist" });
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("Bloqueado pela politica de rede desta execucao.");
    return;
  }
  const headers = { ...req.headers };
  delete headers["proxy-connection"];
  delete headers["proxy-authorization"];
  // agent:false = uma conexão por pedido. O agente global do Node (>= 19) reusa sockets ociosos, e o
  // coletor fecha os seus no keepAliveTimeout (5 s): o reuso no limite virava ECONNRESET → 502 ao agente.
  const upstream = httpRequest({ host: url.hostname, port, method: req.method, path: url.pathname + url.search, headers, agent: false }, (up) => {
    record({ kind: "http", method: req.method, target: shown, allowed: true, status: up.statusCode ?? null });
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on("error", (error) => {
    record({ kind: "http", method: req.method, target: shown, allowed: true, status: 502, reason: error.code ?? "erro" });
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});

server.on("connect", (req, socket, head) => {
  socket.on("error", () => {});
  const raw = String(req.url ?? "");
  const m = /^\[?([^\]]+?)\]?:(\d{1,5})$/.exec(raw);
  const target = m ? normalizeTarget(m[1], m[2]) : raw.slice(0, 200);
  if (!m || !ALLOW_CONNECT.has(target)) {
    record({ kind: "connect", method: "CONNECT", target, allowed: false, status: 403, reason: "fora-da-allowlist" });
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    return;
  }
  const upstream = netConnect({ host: m[1], port: Number(m[2]) }, () => {
    record({ kind: "connect", method: "CONNECT", target, allowed: true, status: 200 });
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", (error) => {
    record({ kind: "connect", method: "CONNECT", target, allowed: true, status: 502, reason: error.code ?? "erro" });
    socket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
  });
});

server.on("upgrade", (req, socket) => {
  record({ kind: "upgrade", method: req.method, target: String(req.url).slice(0, 200), allowed: false, status: 403, reason: "upgrade-negado" });
  socket.on("error", () => {});
  socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
});

server.listen(PORT, "0.0.0.0", () => {
  record({ kind: "start", method: "-", target: "-", allowed: true, status: null, allowHttp: [...ALLOW_HTTP], allowConnect: [...ALLOW_CONNECT] });
  console.log(`${NAME} em :${PORT}; http=${[...ALLOW_HTTP].join(",") || "-"} connect=${[...ALLOW_CONNECT].join(",") || "-"}`);
});
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(0));
