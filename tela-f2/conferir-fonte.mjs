/**
 * Tela F2 — insumo do filtro (a) "construtível na rota": para cada candidato aprovado pelo conferente, confere no fonte
 * do worktree do pnip-mock da F2 (.tmp-eval/pnip-mock-f2, ramo tela-f2 @ 3d02f68, só leitura) que
 *   - o arquivo da mudança existe e é byte a byte igual ao do pnip-mock em que o seletor mediu (F:/Dev Nath/TCC/pnip-mock);
 *   - o trecho "de" existe (fins de linha normalizados) e começa na linha declarada (ou o trecho é acréscimo, "(nada)");
 *   - quantas vezes o trecho "de" aparece no arquivo (1 = sem ambiguidade para o construtor).
 * Uso: node tela-f2/conferir-fonte.mjs → tela-f2/conferir-fonte.json
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const F2 = "F:/Dev Nath/TCC/.tmp-eval/pnip-mock-f2";
const ORIG = "F:/Dev Nath/TCC/pnip-mock";
const sha = b => createHash("sha256").update(b).digest("hex");
const cand = JSON.parse(readFileSync(join(AQUI, "selecao/candidatos.json"), "utf8"));
const ver = new Map(JSON.parse(readFileSync(join(AQUI, "conferencia/veredictos.json"), "utf8")).candidatos.map(v => [v.id, v]));
const head = execFileSync("git", ["-C", F2, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sujo = execFileSync("git", ["-C", F2, "status", "--porcelain"], { encoding: "utf8" }).trim();

const out = {};
for (const c of cand) {
  if (ver.get(c.id)?.veredito !== "APROVADO") continue;
  const rel = c.mudanca.arquivo.replace(/\\/g, "/").replace(/^.*?pnip-mock\//, "");
  const pF2 = join(F2, rel), pO = join(ORIG, rel);
  const r = { arquivo: rel, existe: existsSync(pF2) };
  if (r.existe) {
    const bF2 = readFileSync(pF2), bO = readFileSync(pO);
    r.sha256 = sha(bF2);
    r.igualAoDoSeletor = sha(bO) === r.sha256;
    r.fimDeLinha = bF2.includes("\r\n") ? "CRLF" : "LF";
    const txt = bF2.toString("utf8").replace(/\r\n/g, "\n");
    const de = c.mudanca.de.replace(/\r\n/g, "\n");
    if (/^\(nada\)$/.test(de.trim())) { r.acrescimo = true; r.linhas = txt.split("\n").length; }
    else {
      const occ = [];
      for (let k = txt.indexOf(de); k >= 0; k = txt.indexOf(de, k + 1)) occ.push(txt.slice(0, k).split("\n").length);
      r.comparacao = "literal";
      if (!occ.length) { // o seletor pode ter tirado a indentação comum do trecho: compara linha a linha sem espaços nas pontas
        const L = txt.split("\n").map(s => s.trim()), D = de.split("\n").map(s => s.trim());
        for (let i = 0; i + D.length <= L.length; i++) if (D.every((d, j) => L[i + j] === d)) occ.push(i + 1);
        r.comparacao = "linhas sem espaços nas pontas (indentação)";
      }
      r.ocorrencias = occ.length; r.linhasOnde = occ;
      const declarada = parseInt(String(c.mudanca.linha), 10);
      r.linhaDeclarada = c.mudanca.linha;
      r.linhaConfere = occ.includes(declarada);
    }
  }
  out[c.id] = r;
}
writeFileSync(join(AQUI, "conferir-fonte.json"), JSON.stringify({ _meta: { worktree: F2, head, limpo: sujo === "", comparadoCom: ORIG }, porCandidato: out }, null, 1) + "\n");
for (const [k, r] of Object.entries(out)) console.log(k, r.arquivo, r.igualAoDoSeletor, r.acrescimo ? `acrescimo (${r.linhas} l.)` : `occ=${r.ocorrencias} linhas=${r.linhasOnde} declarada=${r.linhaDeclarada} confere=${r.linhaConfere}`);
console.log("head", head, "limpo", sujo === "");
