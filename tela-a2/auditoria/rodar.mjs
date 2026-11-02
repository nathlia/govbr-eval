/**
 * Refaz a auditoria inteira, na ordem. Requer `node tela-a2/servir.mjs` servindo em 127.0.0.1:3218.
 * Sem --longas, reaproveita medidas/observacao-360.json e observacao-recarga-estado.json (≈ 11 min juntas).
 * Uso (de govbr-eval/): node tela-a2/auditoria/rodar.mjs [--longas]
 */
import { execFileSync } from "child_process";
import { join } from "path";
import { AQUI } from "./comum.mjs";

const passos = [
  ...(process.argv.includes("--longas") ? ["observar-360.mjs", "observar-recarga-estado.mjs"] : []),
  "medir-html-servido.mjs", "origem.mjs", "medir.mjs", "interagir.mjs", "inventariar.mjs", "montar-decisoes.mjs", "conferir-auditoria.mjs",
];
for (const p of passos) {
  console.log(`\n== ${p}`);
  execFileSync(process.execPath, [join(AQUI, p)], { stdio: "inherit", cwd: join(AQUI, "../..") });
}
