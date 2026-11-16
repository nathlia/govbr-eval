/**
 * Serve o dist/ do corpus como arquivos estáticos (sem fallback de SPA: o que não existe é 404), numa porta
 * fixa, para olhar a tela E2 (página construída) à mão ou entregá-la a um auditor cego. É o mesmo serviço que
 * tela-e2/conferir-construcao.mjs sobe em porta aleatória (sem as trocas da página sem semente).
 * Antes: `npm run build` no govbr-corpus (a entrada cadastro-pais.html está no vite.config.ts).
 * Uso: node tela-e2/servir.mjs [porta=3219]   (nunca 3100/4100-4102, reservadas à superfície de medida)
 *      CORPUS_DIR=<checkout do govbr-corpus> muda o corpus servido (padrão: ../../govbr-corpus a partir daqui).
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIST = join(resolve(process.env.CORPUS_DIR ?? join(AQUI, "../../govbr-corpus")), "dist");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const porta = Number(process.argv[2] ?? 3219);
if ([3100, 4100, 4101, 4102].includes(porta)) throw new Error("porta reservada à superfície de medida");

createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const corpo = await readFile(join(DIST, caminho));
    res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" }).end(corpo);
  } catch {
    res.writeHead(404).end();
  }
}).listen(porta, "127.0.0.1", () => console.log(`servindo ${DIST} em http://127.0.0.1:${porta}/cadastro-pais.html`));
