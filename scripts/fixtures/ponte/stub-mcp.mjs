#!/usr/bin/env node
// Servidor MCP de stdio mínimo para testar a ponte (runner/container/bridge.mjs) sem Docker nem navegador.
// `big` devolve um texto determinístico de `n` caracteres com `marker` perto do FIM (depois dos 4.000
// primeiros); o nome da ferramenta vem de STUB_TOOL (browser_snapshot para a ponte playwright, scan_page
// para a do oráculo), assim a mesma resposta passa pelas duas pontes.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const TOOL = process.env.STUB_TOOL || "big";
export function bigText(n, marker) {
  const tail = `\nfim [ref=${marker}] ç\n`;
  let body = "";
  for (let i = 0; body.length < n - tail.length; i++) body += `linha ${i} — ação ${"x".repeat(i % 7)}\n`;
  return body.slice(0, Math.max(0, n - tail.length)) + tail;
}
const server = new Server({ name: "stub", version: "0.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: TOOL, description: "stub", inputSchema: { type: "object", properties: { n: { type: "integer" }, marker: { type: "string" }, pad: { type: "string" } } } }],
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const a = req.params.arguments ?? {};
  return { content: [{ type: "text", text: bigText(Number(a.n ?? 10), String(a.marker ?? "m")) }] };
});
await server.connect(new StdioServerTransport());
