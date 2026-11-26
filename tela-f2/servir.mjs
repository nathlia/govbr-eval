/**
 * Serve uma árvore da ala pnip-f2 (SPA: índice a todo GET sem extensão sob /pnip-f2/; alias do ícone do "Sair"; nada fora
 * da ala), para `APP_URL=http://127.0.0.1:<porta> npx tsx scripts/check-reference.ts --tela processos-f2`.
 * Uso: node tela-f2/servir.mjs <diretório da árvore pnip-f2> [porta=3320]   (nunca 3100/4100-4102)
 * Ex.: build sem semente: "F:/Dev Nath/TCC/.tmp-eval/pnip-f2-sem-semente"; semeado: ".tmp-eval/corpus-tela-f2/public/pnip-f2"
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname, resolve } from "path";

const RAIZ = resolve(process.argv[2] ?? "");
const porta = Number(process.argv[3] ?? 3320);
if (!process.argv[2]) throw new Error("diga o diretório da árvore pnip-f2");
if ([3100, 4100, 4101, 4102].includes(porta)) throw new Error("porta reservada à superfície de medida");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject", ".txt": "text/plain" };
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/assets/images/exit-icon.png") p = "/pnip-f2/assets/images/exit-icon.png";
    else if (p.startsWith("/pnip-f2/") && !extname(p)) p = "/pnip-f2/index.html";
    if (!p.startsWith("/pnip-f2/") || p === "/pnip-f2/manifesto.json") throw 0;
    const corpo = await readFile(join(RAIZ, p.slice("/pnip-f2/".length)));
    res.writeHead(200, { "content-type": TIPOS[extname(p).toLowerCase()] ?? "application/octet-stream" }).end(corpo);
  } catch { res.writeHead(404).end(); }
}).listen(porta, "127.0.0.1", () => console.log(`servindo ${RAIZ} em http://127.0.0.1:${porta}/pnip-f2/`));
