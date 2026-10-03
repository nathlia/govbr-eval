#!/usr/bin/env node
// Dublê do provedor, só para testes do T3a: escuta TCP em 443 numa rede interna, com os aliases dos
// hosts da allowlist do provedor (api.anthropic.com…). Prova o caminho permitido do egress sem tocar
// a internet nem o provedor real. Responde um marcador e fecha; não fala TLS nem HTTP.
import { createServer } from "node:net";

const BANNER = "GOVBR-PROVIDER-STUB\n";
createServer((socket) => {
  socket.on("error", () => {});
  socket.end(BANNER);
}).listen(Number(process.env.STUB_PORT ?? 443), "0.0.0.0", () => console.log("stub do provedor pronto"));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(0));
