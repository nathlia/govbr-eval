#!/usr/bin/env node
// Dublê do provedor, só para testes (T3a/T3b). Escuta em 443 numa rede interna, com os aliases dos
// hosts da allowlist do provedor (api.anthropic.com, platform.claude.com). Nunca toca a internet.
//
// Duas faces na mesma porta, separadas pelo 1º byte que o cliente manda:
//   - TLS (0x16, ClientHello): API Messages ROTEIRIZADA para o cliente real (T3b). O certificado vem de
//     uma CA de teste gerada por execução (tls-cert.mjs); o cliente confia nela via NODE_EXTRA_CA_CERTS.
//   - nada em 1,5 s (ou texto): responde o marcador GOVBR-PROVIDER-STUB e fecha — o controle positivo
//     da sonda ("o túnel permitido chega ao dublê"), como no T3a.
//
// A API roteirizada NÃO é um modelo: devolve, por turno, o que o roteiro manda (blocos tool_use, texto,
// erro HTTP), e grava cada pedido que o cliente fez — hosts, caminhos, cabeçalhos (só nomes e o tipo
// de credencial, nunca o valor), ferramentas anunciadas, mensagens e resultados de ferramenta.
//
// Ambiente: STUB_PORT (443), STUB_DIR (cert.pem, key.pem, roteiro.json; sem eles, só o marcador),
//           STUB_OUT (pasta de saída: requests.ndjson + requests/<n>.json).
import { createServer as netServer } from "node:net";
import { createServer as tlsServer } from "node:https";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BANNER = "GOVBR-PROVIDER-STUB\n";
const DIR = process.env.STUB_DIR ?? "/run/stub";
const OUT = process.env.STUB_OUT ?? null;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const hasTls = existsSync(join(DIR, "cert.pem")) && existsSync(join(DIR, "key.pem"));
const roteiro = existsSync(join(DIR, "roteiro.json")) ? JSON.parse(readFileSync(join(DIR, "roteiro.json"), "utf8")) : { name: "vazio", steps: [] };
if (OUT) mkdirSync(join(OUT, "requests"), { recursive: true });
let seq = 0;
let msgSeq = 0;

function record(entry, body) {
  const n = seq++;
  const line = { seq: n, at: new Date().toISOString(), ...entry };
  if (OUT) {
    appendFileSync(join(OUT, "requests.ndjson"), JSON.stringify(line) + "\n");
    if (body !== undefined) writeFileSync(join(OUT, "requests", `${String(n).padStart(3, "0")}.json`), JSON.stringify(body, null, 2) + "\n");
  }
  return line;
}

/** Tipo de credencial apresentada, sem o valor (só um prefixo de hash, para comparar entre pedidos). */
function credential(headers) {
  if (headers["x-api-key"]) return { kind: "x-api-key", sha256Prefix: sha256(String(headers["x-api-key"])).slice(0, 12) };
  const auth = String(headers.authorization ?? "");
  if (/^Bearer\s/i.test(auth)) return { kind: "bearer", sha256Prefix: sha256(auth.slice(7).trim()).slice(0, 12) };
  return { kind: auth ? "outro" : "nenhuma" };
}

const textOf = (content) => typeof content === "string" ? content
  : Array.isArray(content) ? content.map((b) => (b.type === "text" ? b.text : `[${b.type}]`)).join("\n") : "";

/** Resumo do pedido de mensagens: o que o cliente mostra ao "modelo". */
function summarize(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const assistantTurns = messages.filter((m) => m.role === "assistant").length;
  // resultados de ferramenta devolvidos desde a última resposta do "modelo" (o cliente pode intercalar
  // mensagens de sistema depois deles)
  const lastAssistant = messages.map((m) => m.role).lastIndexOf("assistant");
  const toolResults = lastAssistant < 0 ? [] : messages.slice(lastAssistant + 1)
    .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
    .filter((b) => b.type === "tool_result")
    .map((b) => ({ toolUseId: b.tool_use_id, isError: Boolean(b.is_error), text: textOf(b.content).slice(0, 1500) }));
  const first = messages.find((m) => m.role === "user");
  const firstBlocks = !first ? [] : typeof first.content === "string" ? [{ type: "text", text: first.content }] : first.content;
  return {
    model: body.model ?? null, stream: Boolean(body.stream), maxTokens: body.max_tokens ?? null,
    tools: (body.tools ?? []).map((t) => t.name ?? t.type ?? "?"),
    deferredTools: (body.tools ?? []).filter((t) => t.defer_loading).map((t) => t.name),
    systemSha256: body.system ? sha256(JSON.stringify(body.system)) : null,
    messages: messages.length, assistantTurns, toolResults,
    userTextSha256: messages.filter((m) => m.role === "user").flatMap((m) => typeof m.content === "string" ? [sha256(m.content)]
      : (m.content ?? []).filter((b) => b.type === "text").map((b) => sha256(b.text))),
    firstUserBlocks: firstBlocks.map((b) => ({ type: b.type, sha256: b.type === "text" ? sha256(b.text) : null, bytes: b.type === "text" ? Buffer.byteLength(b.text) : null })),
    thinking: body.thinking ?? null, outputConfig: body.output_config ?? null,
  };
}

/** Uso declarado pelo dublê: números fixos e conhecidos, para o teste conferir a telemetria do cliente. */
const usageFor = (turn, main) => main
  ? { input_tokens: 1000 + turn, output_tokens: 20 + turn, cache_creation_input_tokens: 100, cache_read_input_tokens: 10 * turn }
  : { input_tokens: 7, output_tokens: 3, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

function respond(res, body, step, turn, main) {
  const id = `msg_govbr_stub_${String(msgSeq++).padStart(4, "0")}`;
  const usage = usageFor(turn, main);
  const blocks = [];
  if (step.text) blocks.push({ type: "text", text: step.text });
  for (const [i, c] of (step.calls ?? []).entries()) blocks.push({ type: "tool_use", id: `toolu_govbr_${String(turn).padStart(2, "0")}_${i}`, name: c.name, input: c.input ?? {} });
  if (!blocks.length) blocks.push({ type: "text", text: "ok" });
  const stopReason = (step.calls ?? []).length ? "tool_use" : "end_turn";
  const message = { id, type: "message", role: "assistant", model: body.model, content: blocks, stop_reason: stopReason, stop_sequence: null, usage };
  if (!body.stream) {
    res.writeHead(200, { "content-type": "application/json", "request-id": `req_${id}` });
    return res.end(JSON.stringify(message));
  }
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", "request-id": `req_${id}` });
  const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  ev("message_start", { message: { ...message, content: [], stop_reason: null, usage: { ...usage, output_tokens: 1 } } });
  blocks.forEach((b, index) => {
    if (b.type === "text") {
      ev("content_block_start", { index, content_block: { type: "text", text: "" } });
      ev("content_block_delta", { index, delta: { type: "text_delta", text: b.text } });
    } else {
      ev("content_block_start", { index, content_block: { type: "tool_use", id: b.id, name: b.name, input: {} } });
      ev("content_block_delta", { index, delta: { type: "input_json_delta", partial_json: JSON.stringify(b.input) } });
    }
    ev("content_block_stop", { index });
  });
  ev("message_delta", { delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: usage.output_tokens } });
  ev("message_stop", {});
  res.end();
}

function handleApi(req, res) {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    const path = String(req.url ?? "").split("?")[0];
    const base = { host: String(req.headers.host ?? ""), sni: req.socket.servername ?? null, method: req.method, path: String(req.url ?? "").slice(0, 300),
      headerNames: Object.keys(req.headers).sort(), credential: credential(req.headers), userAgent: String(req.headers["user-agent"] ?? "").slice(0, 200),
      anthropicBeta: String(req.headers["anthropic-beta"] ?? "") || null, bodyBytes: raw.length, bodySha256: sha256(raw) };
    if (req.method === "POST" && /^\/v1\/messages\/?$/.test(path)) {
      let body;
      try {
        body = JSON.parse(raw.toString("utf8"));
      } catch {
        record({ ...base, kind: "messages", status: 400, detail: "JSON inválido" });
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "JSON inválido" } }));
      }
      const summary = summarize(body);
      // Pedido do laço principal = o que carrega o texto da tarefa (hash no roteiro); auxiliares do
      // cliente (título, classificação…) recebem "ok" e não avançam o roteiro.
      const main = roteiro.promptSha256 ? summary.userTextSha256.includes(roteiro.promptSha256) : summary.tools.length > 0;
      const turn = summary.assistantTurns;
      const step = main ? (roteiro.steps[turn] ?? { text: roteiro.final ?? "Fim do roteiro." }) : { text: "ok" };
      if (main && step.httpError) {
        const e = step.httpError;
        const n = record({ ...base, kind: "messages", main, turn, status: e.status, scripted: "http-error", summary }, main && turn === 0 ? body : undefined);
        res.writeHead(e.status, { "content-type": "application/json", "request-id": `req_govbr_stub_err_${n.seq}`, ...(e.headers ?? {}) });
        return res.end(JSON.stringify({ type: "error", error: { type: e.type, message: e.message } }));
      }
      record({ ...base, kind: "messages", main, turn, status: 200, scripted: main ? (step.calls?.length ? "tool_use" : "text") : "auxiliar", calls: (step.calls ?? []).map((c) => c.name), usage: usageFor(turn, main), summary },
        turn === 0 ? body : main ? { turn, summary, lastMessage: body.messages?.at(-1) } : undefined);
      return respond(res, body, step, turn, main);
    }
    if (req.method === "POST" && /^\/v1\/messages\/count_tokens\/?$/.test(path)) {
      record({ ...base, kind: "count_tokens", status: 200 });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ input_tokens: 1000 }));
    }
    record({ ...base, kind: "outro", status: 404 });
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "dublê do provedor: rota não roteirizada" } }));
  });
}

const https = hasTls ? tlsServer({ key: readFileSync(join(DIR, "key.pem")), cert: readFileSync(join(DIR, "cert.pem")) }, handleApi) : null;
https?.on("tlsClientError", (e, socket) => {
  record({ kind: "tls-erro", status: null, detail: String(e?.code ?? e?.message ?? e).slice(0, 200) });
  socket.destroy();
});

netServer((socket) => {
  socket.on("error", () => {});
  // a sonda não manda nada e espera o marcador (até 5 s); um cliente TLS manda o ClientHello logo após o túnel
  const timer = setTimeout(() => socket.end(BANNER), 1500);
  socket.once("data", (buf) => {
    clearTimeout(timer);
    if (https && buf[0] === 0x16) {
      socket.pause();
      socket.unshift(buf);
      https.emit("connection", socket);
      process.nextTick(() => socket.resume());
    } else {
      socket.end(BANNER);
    }
  });
}).listen(Number(process.env.STUB_PORT ?? 443), "0.0.0.0", () => console.log(`stub do provedor pronto (tls=${hasTls ? "sim" : "não"}, roteiro=${roteiro.name}, ${roteiro.steps.length} passos)`));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(0));
