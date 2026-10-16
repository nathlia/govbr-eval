/**
 * Extrai do `core.min.css` do DS 3.7.0 o que a configuração normativa do Stylelint usa como valor
 * permitido (plano NAT-76 §3.1): as cores atribuídas às propriedades customizadas do `:root` (N1) e
 * os passos da escala tipográfica `--font-size-scale-*` (N2). Nada aqui vem do validator.
 *
 *   node comparadores/lint/gerar-tokens.mjs [--css ../govbr-corpus/public/controles/recursos/core.min.css]
 *
 * Grava comparadores/lint/ds-3.7.0-tokens.json com o sha256 da folha lida. O arquivo gerado é
 * versionado: a configuração congelada depende dele, e o hash dele entra no hash da configuração.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { normalizarCor } from "./cores.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_EVAL = resolve(AQUI, "../..");
const arg = (n, p) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : p);
const CSS = resolve(arg("--css", join(RAIZ_EVAL, "../govbr-corpus/public/controles/recursos/core.min.css")));

const bytes = readFileSync(CSS);
const raiz = postcss.parse(bytes.toString("utf8"));
const cores = new Set();
const escala = {};
let versao = null;
raiz.walkRules((regra) => {
  if (regra.selector.trim() !== ":root" || regra.parent?.type !== "root") return;
  regra.walkDecls((d) => {
    if (!d.prop.startsWith("--")) return;
    const valor = d.value.trim();
    const cor = normalizarCor(valor);
    if (cor) cores.add(cor);
    if (d.prop.startsWith("--font-size-scale-")) escala[d.prop] = valor;
  });
});
// A folha não traz a versão por escrito: confere byte a byte com a do pacote instalado no corpus.
const PACOTE = join(RAIZ_EVAL, "../govbr-corpus/node_modules/@govbr-ds/core");
try {
  const doPacote = readFileSync(join(PACOTE, "dist/core.min.css"));
  if (createHash("sha256").update(doPacote).digest("hex") === createHash("sha256").update(bytes).digest("hex"))
    versao = "@govbr-ds/core " + JSON.parse(readFileSync(join(PACOTE, "package.json"), "utf8")).version;
} catch {}
if (!versao) throw new Error("a folha lida não é byte a byte o core.min.css do @govbr-ds/core instalado no corpus");

const saida = {
  o_que_e: "Valores permitidos da configuração normativa do Stylelint (NAT-76): cores do :root (N1) e escala tipográfica (N2) do DS.",
  fonte: { arquivo: relative(RAIZ_EVAL, CSS).split("\\").join("/"), sha256: createHash("sha256").update(bytes).digest("hex"), pacote: versao },
  cores: [...cores].sort(),
  escalaTipografica: Object.fromEntries(Object.entries(escala).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(join(AQUI, "ds-3.7.0-tokens.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${saida.cores.length} cores, ${Object.keys(saida.escalaTipografica).length} passos de escala; fonte ${saida.fonte.arquivo} (${saida.fonte.sha256.slice(0, 12)}…)`);
