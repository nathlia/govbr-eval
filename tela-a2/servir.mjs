/**
 * Serve o dist/ do corpus como arquivos estáticos (sem fallback de SPA: o que não existe é 404),
 * numa porta fixa, para `APP_URL=http://127.0.0.1:<porta> npm run conferir:referencia -- --tela acompanhamento`
 * quando a referência da A2 existir, e para olhar a tela à mão. É o mesmo serviço que
 * tela-a2/conferir-construcao.mjs sobe em porta aleatória.
 * Antes: `npm run build` no govbr-corpus (a entrada acompanhamento.html está no vite.config.ts).
 * Uso: node tela-a2/servir.mjs [porta=3218]   (nunca 3100/4100-4102, reservadas à superfície de medida)
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "../../govbr-corpus/dist");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const porta = Number(process.argv[2] ?? 3218);
if ([3100, 4100, 4101, 4102].includes(porta)) throw new Error("porta reservada à superfície de medida");

createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const corpo = await readFile(join(DIST, caminho));
    res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" }).end(corpo);
  } catch {
    res.writeHead(404).end();
  }
}).listen(porta, "127.0.0.1", () => console.log(`servindo dist/ em http://127.0.0.1:${porta}/acompanhamento.html`));
