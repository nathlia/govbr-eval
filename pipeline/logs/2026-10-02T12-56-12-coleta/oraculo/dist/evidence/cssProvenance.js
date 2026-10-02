/** Propriedades CSS que alimentam cada propriedade computada inspecionada. */
export const AUTHORED_CSS_NAMES = {
    backgroundColor: ["background-color", "background"],
    color: ["color"],
    fontFamily: ["font-family", "font"],
    fontSize: ["font-size", "font"],
    fontWeight: ["font-weight", "font"],
    lineHeight: ["line-height", "font"],
    borderRadius: ["border-radius", "border"],
    borderColor: ["border-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border"],
    border: ["border", "border-top", "border-right", "border-bottom", "border-left"],
    padding: ["padding", "padding-top", "padding-right", "padding-bottom", "padding-left"],
    margin: ["margin", "margin-top", "margin-right", "margin-bottom", "margin-left"],
    outline: ["outline"],
    cursor: ["cursor"],
    opacity: ["opacity"],
};
/** Todas as propriedades CSS que o índice do DS precisa cobrir. */
export const INDEXED_CSS_NAMES = [...new Set(Object.values(AUTHORED_CSS_NAMES).flat())].sort();
/** Divide uma lista de seletores nas vírgulas de nível superior — `:is(a, b)` e `[x="a,b"]` ficam inteiros. */
export function splitSelectorList(selectorText) {
    const parts = [];
    let depth = 0;
    let quote = null;
    let current = "";
    for (let i = 0; i < selectorText.length; i += 1) {
        const ch = selectorText[i];
        if (quote) {
            current += ch;
            if (ch === "\\") {
                current += selectorText[i + 1] ?? "";
                i += 1;
            }
            else if (ch === quote)
                quote = null;
            continue;
        }
        if (ch === '"' || ch === "'")
            quote = ch;
        else if (ch === "(" || ch === "[")
            depth += 1;
        else if (ch === ")" || ch === "]")
            depth = Math.max(0, depth - 1);
        if (ch === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
            continue;
        }
        current += ch;
    }
    if (current.trim())
        parts.push(current.trim());
    return parts.filter(Boolean);
}
/**
 * A declaração é do DS quando TODOS os seletores da regra estão no índice com a mesma propriedade
 * e o mesmo valor. Todos, e não algum: um empacotador só funde regras do DS com regras do DS, e
 * uma regra da página que pegue carona num seletor oficial (`.minha, .br-textarea textarea`)
 * continua sendo escolha da página. Estilo inline nunca é do DS.
 */
export function isDsShipped(index, declaration) {
    if (declaration.selectorText === null)
        return false;
    const selectors = splitSelectorList(declaration.selectorText);
    return selectors.length > 0 && selectors.every((selector) => index.declarations[selector]?.[declaration.cssName]?.includes(declaration.value) ?? false);
}
/** Separa, preservando a ordem das folhas, o que a página declarou do que a folha oficial declara. */
export function partitionDeclarations(raw, index) {
    const out = { authored: {}, dsShipped: {} };
    for (const declaration of raw) {
        const side = isDsShipped(index, declaration) ? out.dsShipped : out.authored;
        (side[declaration.property] ??= []).push(declaration.value);
    }
    return out;
}
//# sourceMappingURL=cssProvenance.js.map