/**
 * Tela F3 — registro da página congelada (molde: tela-f/pagina-congelada.json): lista caminho⇥sha256 do build semeado
 * (.tmp-eval/pnip-f3-semeada) conferida contra a ala congelada no corpus (govbr-corpus tela-f3 9d194d7, public/pnip-f3/,
 * manifesto.json) e contra o que o construtor registrou (30b16f0d…).
 * Uso: node tela-f3/pagina-congelada.mjs → tela-f3/pagina-congelada.json
 */
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, relative, sep } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const SEMEADA = "F:/Dev Nath/TCC/.tmp-eval/pnip-f3-semeada", CORPUS = "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f3";
const sha = b => createHash("sha256").update(b).digest("hex");
const listar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]);
const arquivos = Object.fromEntries(listar(SEMEADA).map(p => [relative(SEMEADA, p).split(sep).join("/"), sha(readFileSync(p))]).sort(([a], [b]) => a < b ? -1 : 1));
const lista = Object.entries(arquivos).map(([k, v]) => `${k}\t${v}\n`).join("");
const sha256Lista = sha(lista);
const manBuf = readFileSync(join(CORPUS, "public/pnip-f3/manifesto.json")), man = JSON.parse(manBuf);
const listaMan = Object.entries(man.arquivos).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}\t${v}\n`).join("");
const commit = execFileSync("git", ["-C", CORPUS, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const listaSem = (() => { const d = "F:/Dev Nath/TCC/.tmp-eval/pnip-f3-sem-semente"; const a = Object.fromEntries(listar(d).map(p => [relative(d, p).split(sep).join("/"), sha(readFileSync(p))]).sort(([x], [y]) => x < y ? -1 : 1)); return sha(Object.entries(a).map(([k, v]) => `${k}\t${v}\n`).join("")); })();
const out = { _meta: { arvore: SEMEADA, ala: "pnip-f3", baseHref: "/pnip-f3/", formatoLista: "linhas caminho\tsha256\n ordenadas (como govbr-eval/tela-d/comum.mjs)", builds: "2 builds limpos do pnip-mock tela-f3, mesma lista (construcao/build1-x-build2.json)",
  corpus: { repositorio: "govbr-corpus", ramo: "tela-f3", commit, ala: "public/pnip-f3/", manifestoSha256: sha(manBuf), arquivos: Object.keys(man.arquivos).length, sha256Lista: sha(listaMan), igualAConstrucao: sha(listaMan) === sha256Lista, forkCommit: man.origem?.forkCommit ?? null },
  pnipMock: { ramo: "tela-f3", commit: "088a086" }, semSemente: { sha256Lista: listaSem } },
  n: Object.keys(arquivos).length, sha256Lista, arquivos };
if (sha256Lista !== "30b16f0d44fac7ac3b7a7914f4ac3eab4117af26c27d4b37081798dd2bcce173" || !out._meta.corpus.igualAConstrucao) throw new Error("lista diverge");
writeFileSync(join(AQUI, "pagina-congelada.json"), JSON.stringify(out, null, 1) + "\n");
console.log(out.n, sha256Lista, commit, out._meta.corpus.igualAConstrucao, listaSem, out._meta.corpus.forkCommit);
