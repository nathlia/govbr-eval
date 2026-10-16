/**
 * Configuração CONGELADA do comparador L (Stylelint normativo) — plano NAT-76 §3.
 * 10 regras: 3 normativas (N1–N3, contam nas tabelas) + 7 de higiene (H1–H7, relatadas à parte).
 *
 * Nada aqui foi ajustado olhando resultados dos controles; mudança depois da primeira medição só
 * com registro na seção 10 do plano.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const ARQUIVO_TOKENS = join(AQUI, "ds-3.7.0-tokens.json");
const tokens = JSON.parse(readFileSync(ARQUIVO_TOKENS, "utf8"));

const GLOBAIS = ["inherit", "initial", "unset", "revert", "revert-layer"];
const ESCALA = Object.values(tokens.escalaTipografica);

export const PROPS_ESPACAMENTO = /^(margin|padding)(-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?$|^(row-|column-)?gap$/i;

/** Metadados de cada regra: perfil e normas que ela operacionaliza (plano §3 e §5). */
export const REGRAS = [
  { id: "N1", regra: "govbr-eval/cor-pre-definida", perfil: "normativo", normas: ["govbr-3.7.0-foundation-global-21b1a2733f7b"] },
  { id: "N2", regra: "declaration-property-value-allowed-list", propriedade: /^font-size$/i, perfil: "normativo", normas: ["govbr-3.7.0-foundation-global-21fb08664799", "ds:tipografia-21fb08664799"] },
  { id: "N3", regra: "govbr-eval/sem-remover-contorno-de-foco", perfil: "normativo", normas: ["emag:4.4", "wcag:2.4.7", "govbr-3.7.0-accessibility-global-5f3ebabe87e6", "govbr-3.7.0-accessibility-global-bc492500708d", "govbr-3.7.0-accessibility-global-21fbcc2fe37b"] },
  { id: "H1", regra: "declaration-property-value-allowed-list", propriedade: PROPS_ESPACAMENTO, perfil: "higiene", normas: ["ds:token-spacing (sem fonte literal)"] },
  { id: "H2", regra: "color-no-invalid-hex", perfil: "higiene", normas: [] },
  { id: "H3", regra: "property-no-unknown", perfil: "higiene", normas: [] },
  { id: "H4", regra: "unit-no-unknown", perfil: "higiene", normas: [] },
  { id: "H5", regra: "selector-pseudo-class-no-unknown", perfil: "higiene", normas: [] },
  { id: "H6", regra: "declaration-block-no-duplicate-properties", perfil: "higiene", normas: [] },
  { id: "H7", regra: "font-family-no-missing-generic-family-keyword", perfil: "higiene", normas: [] },
];

/** Qual regra (N2 × H1) produziu um aviso de `declaration-property-value-allowed-list`: pela propriedade. */
export function classificar(regraStylelint, propriedade) {
  const candidatas = REGRAS.filter((r) => r.regra === regraStylelint);
  if (candidatas.length <= 1) return candidatas[0] ?? null;
  return candidatas.find((r) => r.propriedade && propriedade && r.propriedade.test(propriedade)) ?? null;
}

export const config = {
  plugins: [join(AQUI, "plugins/cor-pre-definida.mjs"), join(AQUI, "plugins/sem-remover-contorno-de-foco.mjs")],
  rules: {
    "govbr-eval/cor-pre-definida": [true, { cores: tokens.cores }],
    "govbr-eval/sem-remover-contorno-de-foco": true,
    "declaration-property-value-allowed-list": {
      "/^font-size$/i": ["/^var\\(--font-size-scale-[a-z0-9-]+\\)$/", ...GLOBAIS, ...ESCALA],
      [`/${PROPS_ESPACAMENTO.source}/i`]: ["/^(?:(?:var\\(--spacing-[a-z0-9-]+\\)|0|auto)(?:\\s+|$))+$/", ...GLOBAIS],
    },
    "color-no-invalid-hex": true,
    "property-no-unknown": true,
    "unit-no-unknown": true,
    "selector-pseudo-class-no-unknown": true,
    "declaration-block-no-duplicate-properties": [true, { ignore: ["consecutive-duplicates-with-different-values"] }],
    "font-family-no-missing-generic-family-keyword": true,
  },
};

/** Hash da configuração: este arquivo, os dois plugins, a normalização de cor e os tokens. */
export function hashDaConfiguracao() {
  const h = createHash("sha256");
  for (const f of ["config.mjs", "cores.mjs", "plugins/cor-pre-definida.mjs", "plugins/sem-remover-contorno-de-foco.mjs", "ds-3.7.0-tokens.json"]) {
    h.update(f + "\0");
    h.update(readFileSync(join(AQUI, f)).toString("utf8").replace(/\r\n/g, "\n"));
    h.update("\0");
  }
  return h.digest("hex");
}
