// Vocabulário das expectativas: fatos que a medição independente confere em cada captura.
// Nada aqui é lido do govbr-ds-validator; os fatos são interpretados por controles/medir.mjs.

/** Fato da árvore de acessibilidade (CDP Accessibility). `alvo` aceita "host >>> interno" (raiz aberta ou fechada). */
export const ax = (alvo, prop, op, valor, nota = "") => ({ tipo: "ax", alvo, prop, op, ...(valor !== undefined ? { valor } : {}), ...(nota ? { nota } : {}) });

/** Fato de DOM/CSS: `expr` é uma expressão JS avaliada na página no momento da captura. */
export const dom = (expr, op, valor, nota = "") => ({ tipo: "dom", expr, op, ...(valor !== undefined ? { valor } : {}), ...(nota ? { nota } : {}) });

/** activeElement profundo (atravessa raízes abertas) é o elemento do seletor, ou "body". */
export const foco = (alvo, nota = "") => ({ tipo: "foco", alvo, ...(nota ? { nota } : {}) });

/** Lista de títulos da árvore de acessibilidade, em ordem: [[nível, nome], ...]. */
export const titulos = (valor) => ({ tipo: "titulos", valor });

/** Dois recortes de tela (passos `recortar`) iguais ou diferentes byte a byte. */
export const recortes = (a, b, iguais, nota = "") => ({ tipo: "recortes", a, b, iguais, ...(nota ? { nota } : {}) });

/** Troca que insere `novo` logo depois da âncora (a âncora tem de ocorrer uma vez só). */
export const depois = (ancora, novo) => [ancora, ancora + novo];

/** Troca que insere `novo` logo antes da âncora. */
export const antes = (ancora, novo) => [ancora, novo + ancora];
