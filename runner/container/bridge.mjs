#!/usr/bin/env node
// Ponte MCP (T3a do runner isolado): expõe por HTTP (Streamable HTTP, sem sessão) um servidor MCP de
// stdio que roda no MESMO contêiner, aplicando a política do braço e registrando cada chamada.
//
//   node bridge.mjs --name playwright --port 8931 --windows 1280x900[,390x844] --events /out/tool-events.ndjson \
//        --inventory /out/inventory.json -- node .../@playwright/mcp/cli.js ... --viewport-size {VIEWPORT}
//   node bridge.mjs --name oracle --port 8932 --events ... --inventory ... -- node /opt/oracle/dist/index.js
//
// Por que uma ponte e não o servidor direto no processo do agente:
//   1. o navegador fica noutro contêiner, com outra rede (só a tela e o coletor, via proxy);
//   2. o registro de ferramentas (tool-events) é escrito por quem o agente não controla;
//   3. a trava da janela (D-63/NAT-32) é aplicada aqui, não pedida no texto.
//
// Trava da janela, em três camadas:
//   a. allowlist de ferramentas do Playwright MCP: `browser_resize` e `browser_run_code` (código
//      Playwright arbitrário com `page`, que pode chamar setViewportSize/CDP) NÃO são anunciadas, e
//      chamá-las pelo nome é recusado e registrado (`refused`, motivo `ferramenta-oculta`);
//   b. `browser_evaluate` roda no contexto da página (não alcança a API do Playwright), mas o texto
//      da função é conferido e recusado quando tenta redimensionar, dar zoom ou emular;
//   c. depois de cada chamada encaminhada, a ponte mede innerWidth × innerHeight na página e registra
//      `drift` se a janela ativa saiu do tamanho fixado — pega qualquer caminho não previsto.
// Outras larguras: uma instância do Playwright MCP por largura declarada, cada uma com o próprio
// navegador de tamanho fixo; a ferramenta declarada `browser_select_window` troca a instância ativa.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const BRIDGE_VERSION = "bridge-1.0.0";
/** Política de payload integral (NAT-82). Fica no inventário e no evento `start`; a versão anunciada ao agente não muda. */
export const PAYLOAD_POLICY = "tool-payload-1.0.0";

/** Ferramentas do Playwright MCP que o agente recebe. Qualquer outra fica oculta (inclusive as de versões futuras). */
export const PLAYWRIGHT_ALLOWED = [
  "browser_click", "browser_close", "browser_console_messages", "browser_drag", "browser_evaluate",
  "browser_fill_form", "browser_handle_dialog", "browser_hover", "browser_navigate", "browser_navigate_back",
  "browser_network_requests", "browser_press_key", "browser_select_option", "browser_snapshot", "browser_tabs",
  "browser_take_screenshot", "browser_type", "browser_wait_for",
];
/** Tentativa de mudar janela/zoom/emulação dentro de browser_evaluate. */
export const RESIZE_PATTERN = /setViewportSize|resizeTo|resizeBy|Emulation\.|setDeviceMetricsOverride|newCDPSession|\bzoom\s*=|style\.zoom|setProperty\(\s*['"`]zoom|['"`]zoom['"`]\s*[:\]]|devicePixelRatio\s*=|(inner|outer)(Width|Height)\s*=|matchMedia\s*=/;
const SELECT_WINDOW = "browser_select_window";

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
if (sep < 0) {
  console.error("uso: bridge.mjs --name N --port P [--windows WxH,...] --events F --inventory F -- comando...");
  process.exit(2);
}
const opts = argv.slice(0, sep);
const childCmd = argv.slice(sep + 1);
const opt = (n, d) => (opts.includes(n) ? opts[opts.indexOf(n) + 1] : d);
const NAME = opt("--name", "mcp");
const PORT = Number(opt("--port", "8931"));
const EVENTS = opt("--events", null);
const INVENTORY = opt("--inventory", null);
const IS_PLAYWRIGHT = NAME === "playwright";
const windows = (opt("--windows", "") || "").split(",").filter(Boolean).map((s) => {
  const m = /^(\d+)x(\d+)$/.exec(s);
  if (!m) throw new Error(`janela inválida: ${s}`);
  return { width: Number(m[1]), height: Number(m[2]) };
});
if (IS_PLAYWRIGHT && windows.length === 0) throw new Error("playwright exige --windows");

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
let seq = 0;
const cap = (s, n) => (s.length > n ? { text: s.slice(0, n), truncated: true } : { text: s, truncated: false });

// ───────────────────────────────────────── payload integral (NAT-82)
// O evento continua levando a projeção `{ text, truncated }` de até PROJECTION_CHARS caracteres (D-116 lê esse
// formato). Quando a projeção corta, o texto INTEIRO vai para um arquivo ao lado de tool-events.ndjson
// (`payloads/`), e o lado do evento ganha `payload` = { status, path, mediaType, bytes, sha256, totalBytes,
// limitBytes }. Limite declarado, igual para as duas pontes (Playwright e oráculo) e para os dois braços:
//   - PAYLOAD_LIMIT_BYTES por lado de chamada (2 MiB ≈ 12× o maior resultado medido nas baterias até
//     2026-10-12, 174 KB): acima disso grava-se só o prefixo, `status: "truncated"`;
//   - PAYLOAD_BUDGET_BYTES por processo de ponte (64 MiB ≈ 70× a maior soma de resultados de uma execução,
//     0,9 MB): esgotado, nada é gravado, `status: "over-budget"`;
//   - falha de escrita = `status: "failed"`. Truncado/sem orçamento/falha é limitação declarada; nunca payload completo.
// A gravação é síncrona, depois da chamada, e não toca no resultado devolvido ao agente. O arquivo fica no
// /out da ponte (contêiner do navegador ou do oráculo), que o contêiner do agente não monta.
export const PROJECTION_CHARS = 4000;
export const PAYLOAD_LIMIT_BYTES = 2 * 1024 * 1024;
export const PAYLOAD_BUDGET_BYTES = 64 * 1024 * 1024;
const PAYLOAD_DIR = EVENTS ? join(dirname(EVENTS), "payloads") : null;
let payloadSpent = 0;
let payloadSeq = 0;
/** `kind` = "args" (JSON) | "result" (texto). Devolve o lado do evento: projeção + payload quando cortada. */
function side(text, kind) {
  const projection = cap(text, PROJECTION_CHARS);
  if (!projection.truncated || !PAYLOAD_DIR) return projection;
  const full = Buffer.from(text, "utf8");
  const limitBytes = PAYLOAD_LIMIT_BYTES;
  if (payloadSpent >= PAYLOAD_BUDGET_BYTES) {
    return { ...projection, payload: { status: "over-budget", path: null, totalBytes: full.length, limitBytes, budgetBytes: PAYLOAD_BUDGET_BYTES } };
  }
  const stored = full.length > limitBytes ? full.subarray(0, limitBytes) : full;
  const complete = stored.length === full.length;
  const name = `${NAME}-${String(payloadSeq++).padStart(6, "0")}-${kind}${complete && kind === "args" ? ".json" : ".txt"}`;
  const rel = `payloads/${name}`;
  try {
    mkdirSync(PAYLOAD_DIR, { recursive: true });
    writeFileSync(join(PAYLOAD_DIR, name), stored, { flag: "wx" });
    payloadSpent += stored.length;
  } catch (error) {
    try { if (error?.code !== "EEXIST") rmSync(join(PAYLOAD_DIR, name), { force: true }); } catch { /* nada a limpar */ }
    return { ...projection, payload: { status: "failed", path: null, totalBytes: full.length, limitBytes, detail: String(error?.message ?? error).slice(0, 200) } };
  }
  return { ...projection, payload: { status: complete ? "complete" : "truncated", path: rel,
    mediaType: complete && kind === "args" ? "application/json" : "text/plain",
    bytes: stored.length, sha256: sha256(stored), totalBytes: full.length, limitBytes } };
}
function log(e) {
  const line = { seq: seq++, at: new Date().toISOString(), server: NAME, ...e };
  if (EVENTS) appendFileSync(EVENTS, JSON.stringify(line) + "\n");
  return line;
}

// ───────────────────────────────────────── servidores de stdio (um por janela no Playwright)
const children = [];
async function startChild(i) {
  const vp = windows[i] ? `${windows[i].width}x${windows[i].height}` : "";
  const args = childCmd.slice(1).map((a) => a.replace("{VIEWPORT}", vp).replace("{INDEX}", String(i)));
  const transport = new StdioClientTransport({ command: childCmd[0], args, env: { ...process.env }, stderr: "inherit" });
  const client = new Client({ name: `govbr-bridge-${NAME}`, version: BRIDGE_VERSION });
  await client.connect(transport);
  return { client, window: windows[i] ?? null, pageOpened: false };
}
for (let i = 0; i < Math.max(1, windows.length); i++) children.push(await startChild(i));
let active = 0;

const childTools = (await children[0].client.listTools()).tools;
const allowed = IS_PLAYWRIGHT ? new Set(PLAYWRIGHT_ALLOWED) : new Set(childTools.map((t) => t.name));
const exposedTools = childTools.filter((t) => allowed.has(t.name));
if (IS_PLAYWRIGHT && windows.length > 1) {
  exposedTools.push({
    name: SELECT_WINDOW,
    description: "Troca o navegador ativo para o de outra largura declarada. Cada largura tem o próprio navegador, aberto com tamanho fixo e sem estado compartilhado com os outros.",
    inputSchema: {
      type: "object",
      properties: { width: { type: "integer", enum: windows.map((w) => w.width), description: "largura declarada, em pixels" } },
      required: ["width"], additionalProperties: false,
    },
  });
}
const hidden = childTools.map((t) => t.name).filter((n) => !allowed.has(n));
const inventory = {
  bridge: BRIDGE_VERSION, server: NAME, childTools: childTools.map((t) => t.name), exposed: exposedTools.map((t) => t.name),
  hidden, windows, resizePattern: IS_PLAYWRIGHT ? RESIZE_PATTERN.source : null, startedAt: new Date().toISOString(),
  payloads: { policy: PAYLOAD_POLICY, projectionChars: PROJECTION_CHARS, limitBytes: PAYLOAD_LIMIT_BYTES, budgetBytes: PAYLOAD_BUDGET_BYTES, dir: PAYLOAD_DIR ? "payloads" : null },
};
if (INVENTORY) writeFileSync(INVENTORY, JSON.stringify(inventory, null, 2) + "\n");
log({ kind: "start", exposed: inventory.exposed, hidden, payloads: inventory.payloads });

const textOf = (r) => (r?.content ?? []).map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n");
const refusal = (msg) => ({ content: [{ type: "text", text: `Recusado pela política desta execução: ${msg}` }], isError: true });

async function probeViewport(child) {
  if (!IS_PLAYWRIGHT || !child.pageOpened || !child.window) return null;
  try {
    const r = await child.client.callTool({ name: "browser_evaluate", arguments: { function: "() => JSON.stringify([innerWidth, innerHeight])" } });
    const m = /\[(\d+),\s*(\d+)\]/.exec(textOf(r));
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
  } catch {
    return null;
  }
}

/** Decide antes de encaminhar. null = encaminhar. */
function policyCheck(name, args) {
  if (name === SELECT_WINDOW && IS_PLAYWRIGHT && windows.length > 1) return null;
  if (!allowed.has(name)) return { reason: "ferramenta-oculta", msg: `a ferramenta ${name} não está disponível` };
  if (!IS_PLAYWRIGHT) return null;
  if (name === "browser_evaluate" && RESIZE_PATTERN.test(String(args?.function ?? ""))) {
    return { reason: "janela-fixa", msg: "a janela tem tamanho fixo; redimensionar, dar zoom ou emular não é permitido" };
  }
  if (name === "browser_navigate") {
    let url;
    try {
      url = new URL(String(args?.url ?? ""));
    } catch {
      return { reason: "url-invalida", msg: "URL inválida" };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return { reason: "esquema-recusado", msg: `esquema ${url.protocol} não é permitido` };
  }
  if (name === "browser_tabs" && args?.url) {
    try {
      const u = new URL(String(args.url));
      if (u.protocol !== "http:" && u.protocol !== "https:") return { reason: "esquema-recusado", msg: `esquema ${u.protocol} não é permitido` };
    } catch { /* sem URL útil: o Playwright decide */ }
  }
  return null;
}

async function handleCall(name, args) {
  const argsText = JSON.stringify(args ?? {});
  // `args` (e o arquivo do payload) só é produzido no mesmo bloco síncrono que grava o evento: uma chamada
  // interrompida no meio não deixa payload sem evento que o cite.
  const head = { tool: name, argsSha256: sha256(argsText) };
  const window0 = children[active].window;
  const base = () => ({ ...head, args: side(argsText, "args"), window: window0 });
  const denied = policyCheck(name, args);
  if (denied) {
    log({ kind: "refused", ...base(), reason: denied.reason });
    return refusal(denied.msg);
  }
  if (name === SELECT_WINDOW) {
    const idx = windows.findIndex((w) => w.width === Number(args?.width));
    if (idx < 0) {
      log({ kind: "refused", ...base(), reason: "largura-nao-declarada" });
      return refusal("largura não declarada");
    }
    active = idx;
    log({ kind: "call", ...base(), window: windows[idx], isError: false, outcome: "ok", durationMs: 0 });
    return { content: [{ type: "text", text: `Navegador ativo: ${windows[idx].width}×${windows[idx].height} (navegador próprio, sem estado compartilhado).` }] };
  }
  const child = children[active];
  const t0 = Date.now();
  let result;
  try {
    result = await child.client.callTool({ name, arguments: args ?? {} }, undefined, { timeout: 120_000 });
  } catch (error) {
    log({ kind: "call", ...base(), isError: true, outcome: "transport-error", detail: String(error?.message ?? error).slice(0, 500), durationMs: Date.now() - t0 });
    return refusal(`falha de transporte: ${String(error?.message ?? error).slice(0, 200)}`);
  }
  const text = textOf(result);
  const outcome = result.isError ? "tool-error" : text.trim() === "" ? "empty" : "ok";
  if (IS_PLAYWRIGHT && (name === "browser_navigate" || name === "browser_tabs") && !result.isError) child.pageOpened = true;
  if (IS_PLAYWRIGHT && name === "browser_close") child.pageOpened = false;
  const vp = await probeViewport(child);
  log({ kind: "call", ...base(), isError: Boolean(result.isError), outcome, durationMs: Date.now() - t0, resultBytes: Buffer.byteLength(text),
    resultSha256: sha256(text), result: side(text, "result"), viewportAfter: vp });
  if (vp && child.window && (vp.width !== child.window.width || vp.height !== child.window.height)) {
    log({ kind: "drift", tool: name, expected: child.window, observed: vp });
  }
  return result;
}

function makeServer() {
  const server = new Server({ name: NAME, version: BRIDGE_VERSION }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log({ kind: "list", count: exposedTools.length });
    return { tools: exposedTools };
  });
  server.setRequestHandler(CallToolRequestSchema, async (req) => handleCall(req.params.name, req.params.arguments));
  return server;
}

const http = createServer(async (req, res) => {
  const path = String(req.url ?? "").split("?")[0];
  if (path === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, server: NAME }));
  }
  if (path !== "/mcp") {
    res.writeHead(404).end();
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { allow: "POST" }).end();
    return;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    res.writeHead(400).end();
    return;
  }
  const server = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
});
http.listen(PORT, "0.0.0.0", () => console.log(`ponte ${NAME} em :${PORT} (${exposedTools.length} ferramentas expostas, ${hidden.length} ocultas)`));
for (const s of ["SIGINT", "SIGTERM"]) {
  process.on(s, async () => {
    for (const c of children) await c.client.close().catch(() => {});
    process.exit(0);
  });
}
