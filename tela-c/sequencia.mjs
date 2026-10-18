/**
 * A sequência de estados escolhida para a tela C (tela-c/selecionar-estados.mjs → selecao.json; adendo
 * § B) — será a MESMA `_meta.setup` / `_meta.states` de ground-truth-cadastrar-empresa.json, e a
 * conferência da auditoria (fase 2) confere que as duas são idênticas antes de medir.
 *
 * Um segmento só (nenhum `navigate`: a tela é uma rota, adendo § B regra 1).
 * - `inicial`: primeiro paint depois das três listas do carregamento (waitFor `main br-checkbox`).
 * - `lista-usuarios`: clique no campo do seletor "Selecione o usuário" (aba padrão "Usuário Existente");
 *   a lista abre com os três usuários (traz item, list e radio, que nenhuma outra parada mostra).
 *   Escolhida pela regra gulosa na rodada 1; a rodada 2 não achou vista elegível (o menu do avatar não
 *   acrescenta tipo; os dois SweetAlert2 — "Adicionar" sem usuário e "Salvar" incompleto — não trazem
 *   componente do DS, regra 5 da B).
 */
export const ROTA = "/pnip-c/portal-admin/empresas/cadastrar-empresa";

export const SETUP = [
  { action: "click", selector: "br-select-pnip input#idUsuario" },
  { action: "wait", selector: "br-select-pnip .br-list .br-item" },
];

export const STATES = [
  { id: "inicial", afterStep: 0, path: ROTA, note: "formulário vazio, aba padrão \"Usuário Existente\" — primeiro paint depois das três listas do carregamento" },
  { id: "lista-usuarios", afterStep: 2, path: ROTA, note: "lista do seletor \"Selecione o usuário\" aberta (três usuários fictícios) — última parada" },
];
