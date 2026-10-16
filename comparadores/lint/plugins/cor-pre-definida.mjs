/**
 * N1 — `govbr-eval/cor-pre-definida` (plano NAT-76 §3.1).
 *
 * Norma: govbr-3.7.0-foundation-global-21b1a2733f7b (obrigatório) — "Interfaces digitais do governo
 * devem utilizar sempre as cores pré-definidas." (fundamentos-visuais/cores.md:59).
 *
 * Forma estática: todo literal de cor num valor de declaração (hex, rgb[a]()/hsl[a]() com argumentos
 * literais, cor nomeada), inclusive em propriedade customizada, normalizado para #rrggbb[aa], tem de
 * estar no conjunto `cores` (as cores atribuídas às propriedades customizadas do :root do DS 3.7.0,
 * `ds-3.7.0-tokens.json`). Valor vindo de `var()` passa. Opções: `[true, { cores: [...] }]`.
 */
import stylelint from "stylelint";
import valueParser from "postcss-value-parser";
import { normalizarCor, NEUTRAS } from "../cores.mjs";

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

export const ruleName = "govbr-eval/cor-pre-definida";
export const messages = ruleMessages(ruleName, {
  rejected: (literal, normal, prop) => `Cor fora das pré-definidas do DS: "${literal}" (${normal}) em "${prop}"`,
});
const meta = { url: "thesis-workspace/planejamento/atual/plano-nat76-comparadores-2026-10-16.md" };

/** Só nestas propriedades uma palavra solta é lida como cor nomeada (hex e funções valem em qualquer uma). */
const PROP_COM_COR = /color|background|border|outline|shadow|^fill$|^stroke$|caret|column-rule|text-decoration|^--/i;
const FUNCOES = new Set(["rgb", "rgba", "hsl", "hsla"]);

const ruleFunction = (primary, secundarias) => (root, result) => {
  const ok = validateOptions(result, ruleName, { actual: primary }, { actual: secundarias, possible: { cores: [(v) => typeof v === "string"] } });
  if (!ok || !primary) return;
  const permitidas = new Set(secundarias.cores);
  root.walkDecls((decl) => {
    const literais = [];
    valueParser(decl.value).walk((no) => {
      if (no.type === "function" && FUNCOES.has(no.value.toLowerCase())) {
        literais.push(valueParser.stringify(no));
        return false;
      }
      if (no.type === "function" && no.value.toLowerCase() === "var") return false;
      if (no.type !== "word") return undefined;
      const w = no.value;
      if (w.startsWith("#")) literais.push(w);
      else if (PROP_COM_COR.test(decl.prop) && !NEUTRAS.has(w.toLowerCase()) && /^[a-z]+$/i.test(w) && normalizarCor(w)) literais.push(w);
      return undefined;
    });
    for (const lit of literais) {
      const normal = normalizarCor(lit);
      if (normal === null) continue; // não é literal (função com var(), hex malformado → H2)
      if (permitidas.has(normal)) continue;
      report({ ruleName, result, node: decl, message: messages.rejected(lit, normal, decl.prop), word: lit });
    }
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default createPlugin(ruleName, ruleFunction);
