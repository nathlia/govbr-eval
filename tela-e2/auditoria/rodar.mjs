/**
 * Refaz a auditoria inteira, na ordem, de cargas limpas. Requer a página servida em 127.0.0.1:3219
 * (`CORPUS_DIR=<...>/auditoria-e2/corpus node ../servir.mjs 3219`).
 * Uso: node rodar.mjs [--saida <dir>]   (--saida = AUDITORIA_SAIDA; grava medidas e decisões lá)
 */
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const iS = process.argv.indexOf("--saida");
if (iS > 0) process.env.AUDITORIA_SAIDA = process.argv[iS + 1];
for (const p of ["medir-html-servido.mjs", "medir.mjs", "interagir.mjs", "sondas-extra.mjs", "proveniencia-variaveis.mjs", "avaliar.mjs", "conferir-auditoria.mjs"]) {
  console.log(`\n== ${p}`);
  execFileSync(process.execPath, [join(AQUI, p)], { stdio: "inherit", cwd: AQUI, env: process.env });
}
