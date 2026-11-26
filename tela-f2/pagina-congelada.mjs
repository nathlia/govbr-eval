/**
 * Tela F2 — registro da página congelada (molde: tela-f/pagina-congelada.json): lista caminho⇥sha256 do build semeado
 * (.tmp-eval/pnip-f2-semeada) conferida contra a ala congelada no corpus (govbr-corpus tela-f2 a7d6ccd, public/pnip-f2/,
 * manifesto.json) e contra o que o construtor registrou (b113879f…).
 * Uso: node tela-f2/pagina-congelada.mjs → tela-f2/pagina-congelada.json
 */
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, relative, sep } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const SEMEADA = "F:/Dev Nath/TCC/.tmp-eval/pnip-f2-semeada", CORPUS = "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f2";
const sha = b => createHash("sha256").update(b).digest("hex");
const listar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]);
const arquivos = Object.fromEntries(listar(SEMEADA).map(p => [relative(SEMEADA, p).split(sep).join("/"), sha(readFileSync(p))]).sort(([a], [b]) => a < b ? -1 : 1));
const lista = Object.entries(arquivos).map(([k, v]) => `${k}\t${v}\n`).join("");
const sha256Lista = sha(lista);
const manBuf = readFileSync(join(CORPUS, "public/pnip-f2/manifesto.json")), man = JSON.parse(manBuf);
const listaMan = Object.entries(man.arquivos).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}\t${v}\n`).join("");
const commit = execFileSync("git", ["-C", CORPUS, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const listaSem = (() => { const d = "F:/Dev Nath/TCC/.tmp-eval/pnip-f2-sem-semente"; const a = Object.fromEntries(listar(d).map(p => [relative(d, p).split(sep).join("/"), sha(readFileSync(p))]).sort(([x], [y]) => x < y ? -1 : 1)); return sha(Object.entries(a).map(([k, v]) => `${k}\t${v}\n`).join("")); })();
const out = { _meta: { arvore: SEMEADA, ala: "pnip-f2", baseHref: "/pnip-f2/", formatoLista: "linhas caminho\tsha256\n ordenadas (como govbr-eval/tela-d/comum.mjs)", builds: "2 builds limpos do pnip-mock tela-f2, mesma lista (construcao/build1-x-build2.json)",
  corpus: { repositorio: "govbr-corpus", ramo: "tela-f2", commit, ala: "public/pnip-f2/", manifestoSha256: sha(manBuf), arquivos: Object.keys(man.arquivos).length, sha256Lista: sha(listaMan), igualAConstrucao: sha(listaMan) === sha256Lista, forkCommit: man.origem?.forkCommit ?? null },
  pnipMock: { ramo: "tela-f2", commit: "9d16700" }, semSemente: { sha256Lista: listaSem } },
  n: Object.keys(arquivos).length, sha256Lista, arquivos };
if (sha256Lista !== "b113879fcbdf26b4e9b8c4c5de1d16f635f6d949898aeadc719e2af8c7a25a56" || !out._meta.corpus.igualAConstrucao) throw new Error("lista diverge");
writeFileSync(join(AQUI, "pagina-congelada.json"), JSON.stringify(out, null, 1) + "\n");
console.log(out.n, sha256Lista, commit, out._meta.corpus.igualAConstrucao, listaSem, out._meta.corpus.forkCommit);
