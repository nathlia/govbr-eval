/**
 * A sequência de estados escolhida para a tela D (tela-d/selecionar-estados.mjs → selecao.json; adendo
 * tela-d/metodo-auditoria-adendo-processos.md § B) — será a MESMA `_meta.setup` / `_meta.states` de
 * ground-truth-processos.json, e a conferência da auditoria (fase 2) confere que as duas são idênticas
 * antes de medir.
 *
 * Um segmento só (nenhum `navigate`: a tela é uma rota, adendo § B regra 1).
 * - `inicial`: primeiro paint da aba padrão "Tramitando" com a lista paginada (waitFor
 *   `main .br-table tbody tr`).
 * - `lista-exibir`: clique no campo do seletor "Exibir" (itens por página) da paginação; a lista abre
 *   (traz item, list e radio, que nenhuma outra parada mostra). Escolhida pela regra gulosa na rodada 1
 *   (empate com "Enter"/"saída" no mesmo campo e com o botão "Exibir lista" → menos passos → ordem do
 *   documento); a rodada 2 não achou vista elegível (o menu do avatar não acrescenta tipo; os dois
 *   SweetAlert2 — "Desassociar" e "Assinar" da linha — não trazem componente do DS, regra 6).
 */
export const ROTA = "/pnip-d/portal-mpa/processos";

export const SETUP = [
  { action: "click", selector: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total" },
  { action: "wait", selector: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item" },
];

export const STATES = [
  { id: "inicial", afterStep: 0, path: ROTA, note: "aba padrão \"Tramitando\" com \"Meus processos\" ligado — primeiro paint da lista paginada" },
  { id: "lista-exibir", afterStep: 2, path: ROTA, note: "lista do seletor \"Exibir\" (itens por página) da paginação aberta — última parada" },
];
