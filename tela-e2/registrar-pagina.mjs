/**
 * Tela E2 — sha256 da página congelada com a referência 1.0.0 (depois da F-02): o dist/ servido (página, folha com as
 * fontes que ela pede, scripts, marcas, páginas de destino) e as fontes da página no corpus, mais o commit do corpus.
 * Uso: CORPUS_DIR=<checkout do govbr-corpus, já com npm run build> node tela-e2/registrar-pagina.mjs → pagina-congelada.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(process.env.CORPUS_DIR ?? join(AQUI, "../../govbr-corpus"));
const DIST = join(CORPUS, "dist");
const sha = p => createHash("sha256").update(readFileSync(p)).digest("hex");
const git = (...a) => execFileSync("git", ["-C", CORPUS, ...a], { encoding: "utf8" }).trim();
if (git("status", "--porcelain", "--", "cadastro-pais.html", "src/cadastro-pais", "public/cadastro-pais")) throw new Error("fontes da página com mudança não commitada");

const html = readFileSync(join(DIST, "cadastro-pais.html"), "utf8");
const refs = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1].replace(/^\//, ""));
const css = refs.filter(r => r.endsWith(".css"));
const daFolha = css.flatMap(c => [...readFileSync(join(DIST, c), "utf8").matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/["']/g, "").replace(/^\//, "").split(/[?#]/)[0]).filter(u => !u.startsWith("data:")));
const servidos = ["cadastro-pais.html", ...new Set([...refs, ...daFolha])].sort();
const fontes = ["cadastro-pais.html", "src/cadastro-pais/cadastro-pais.css", "src/cadastro-pais/pagina.css", "public/cadastro-pais/comportamento.js", "public/cadastro-pais/core.min.js"];
const out = {
  _meta: { data: "2026-11-16", nota: "página da referência 1.0.0 (F-01 386a8d8 + F-02); dist/ de npm run build no corpus" },
  corpus: { ramo: git("branch", "--show-current"), commit: git("rev-parse", "HEAD"), commitsDaPagina: ["48d53d7", "386a8d8", git("rev-parse", "--short", "HEAD")] },
  arquivos: { dist: Object.fromEntries(servidos.map(f => [f, sha(join(DIST, f))])), fontes: Object.fromEntries(fontes.map(f => [f, sha(join(CORPUS, f))])) },
};
writeFileSync(join(AQUI, "pagina-congelada.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`corpus ${out.corpus.commit.slice(0, 7)} · dist ${servidos.length} arquivos · cadastro-pais.html (dist) ${out.arquivos.dist["cadastro-pais.html"]}`);
