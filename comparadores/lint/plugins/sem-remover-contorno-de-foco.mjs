/**
 * N3 — `govbr-eval/sem-remover-contorno-de-foco` (plano NAT-76 §3.1).
 *
 * Norma: e-MAG 4.4, govbr-3.7.0-accessibility-global-5f3ebabe87e6 (proibido) — "Essa borda pode ser
 * modificada via CSS para melhorar o destaque, mas não deverá ser removida."; WCAG 2.4.7.
 *
 * CÓPIA DA LÓGICA de `a11y/no-outline-none` do pacote stylelint-a11y 1.2.3 (MIT, © 2018 Stanislav),
 * que não roda no Stylelint 17 (dependência de pares `stylelint 10 - 15`). A semântica é a original,
 * sem melhoria: regra (ou @page) cujo seletor contém `:focus` e declara `outline: 0|none` sem
 * declarar, no mesmo bloco, `border`, `border-color` ou `box-shadow` cujo valor não contenha
 * `transparent`. Única diferença: o original pulava regras de sintaxe não padrão (Sass aninhado) com
 * um utilitário interno do Stylelint que não é mais exportado; aqui só há CSS padrão.
 */
import stylelint from "stylelint";

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

export const ruleName = "govbr-eval/sem-remover-contorno-de-foco";
export const messages = ruleMessages(ruleName, {
  expected: (selector) => `Unexpected using "outline" property in ${selector}`,
});
const meta = { url: "https://github.com/YozhikM/stylelint-a11y/blob/master/src/rules/no-outline-none/README.md" };

function check(selector, node) {
  if (node.type !== "rule") return true;
  if (!selector.match(/:focus/gi)) return true;
  const hasEmptyOutline = node.nodes.some(
    (o) => o.type === "decl" && o.prop.toLowerCase() === "outline" && ["0", "none"].indexOf(o.value.toLowerCase()) >= 0,
  );
  if (hasEmptyOutline) {
    return node.nodes.some(
      (o) => o.type === "decl" && ["border", "border-color", "box-shadow"].indexOf(o.prop.toLowerCase()) >= 0 && !o.value.toLowerCase().match(/transparent/gi),
    );
  }
  return true;
}

const ruleFunction = (actual) => (root, result) => {
  if (!validateOptions(result, ruleName, { actual }) || !actual) return;
  root.walk((node) => {
    let selector = null;
    if (node.type === "rule") selector = node.selector;
    else if (node.type === "atrule" && node.name.toLowerCase() === "page" && node.params) selector = node.params;
    if (!selector) return;
    if (!check(selector, node)) report({ message: messages.expected(selector), node, ruleName, result });
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default createPlugin(ruleName, ruleFunction);
