/** Serve a árvore da ala pnip-f3 (SPA). Uso: node servir.mjs <diretório> [porta] */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname, resolve } from "path";

const RAIZ = resolve(process.argv[2] ?? "");
const porta = Number(process.argv[3] ?? 3330);
if (!process.argv[2]) throw new Error("diga o diretório da árvore pnip-f3");
if ([3100, 4100, 4101, 4102].includes(porta)) throw new Error("porta reservada à superfície de medida");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject", ".txt": "text/plain" };
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/assets/images/exit-icon.png") p = "/pnip-f3/assets/images/exit-icon.png";
    else if (p.startsWith("/pnip-f3/") && !extname(p)) p = "/pnip-f3/index.html";
    if (!p.startsWith("/pnip-f3/") || p === "/pnip-f3/manifesto.json") throw 0;
    const corpo = await readFile(join(RAIZ, p.slice("/pnip-f3/".length)));
    res.writeHead(200, { "content-type": TIPOS[extname(p).toLowerCase()] ?? "application/octet-stream" }).end(corpo);
  } catch { res.writeHead(404).end(); }
}).listen(porta, "127.0.0.1", () => console.log(`servindo ${RAIZ} em http://127.0.0.1:${porta}/pnip-f3/`));
