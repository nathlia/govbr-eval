/**
 * Compara a re-medida de 16/11 (página com a F-02) com a de 14/11 (página com a F-01), por instância|chave
 * (os ids EA/EC/EI são renumerados a cada rodada). Uso: node tela-e2/remedida-2026-11-16/comparar.mjs → comparacao.json
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (d, f) => { const j = JSON.parse(readFileSync(join(AQUI, d, f), "utf8")); return Object.values(j).find(Array.isArray) ?? j; };
const chave = x => `${x.instancia}|${x.chave}`;
const out = {};
for (const tipo of ["achados", "conformes", "incertos"]) {
  const antes = ler("../remedida-2026-11-14", `${tipo}.json`).map(chave), depois = ler(".", `${tipo}.json`).map(chave);
  out[tipo] = { antes: antes.length, depois: depois.length, sairam: antes.filter(k => !depois.includes(k)), entraram: depois.filter(k => !antes.includes(k)) };
}
writeFileSync(join(AQUI, "comparacao.json"), JSON.stringify({ _meta: { antes: "tela-e2/remedida-2026-11-14 (corpus 386a8d8)", depois: "tela-e2/remedida-2026-11-16 (corpus com a F-02)" }, ...out }, null, 1) + "\n");
console.log(JSON.stringify(out));
