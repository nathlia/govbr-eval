/**
 * A sequência de estados escolhida (tela-b/vistorias/selecionar-estados.mjs → auditoria.md § 3) —
 * a MESMA `_meta.setup` / `_meta.states` de ground-truth-vistorias.json. conferir-auditoria.mjs
 * confere que as duas são idênticas antes de medir.
 *
 * Segmento 0 (lista): parada `inicial` no primeiro paint.
 * Segmento 1 (detalhe da 1ª linha da aba padrão que oferece "Avançar" — Não comparecimento,
 *   p.2 l.7): navigate por path; abre o menu do avatar (a vista que a escolha gulosa escolheu).
 *   Trânsito depois da última parada: fecha o menu (o cabeçalho persiste entre rotas e o menu
 *   aberto cobriria o botão "Trocar embarcação" do segmento seguinte).
 * Segmento 2 (detalhe da 1ª linha que oferece "Trocar embarcação da vistoria" — Vistoria
 *   preenchida, p.2 l.8): navigate por path; parada comum na rota nua; abre o br-modal; parada de
 *   diálogo (última).
 * `path` em vez de clique: as duas linhas estão na página 2 da lista; o clique exigiria trânsito
 * pela paginação, cujo redesenho corre contra o clique no olho (desvio registrado em auditoria.md).
 */
export const DETALHE_NC = "/pnip/portal-mpa/vistorias/agendar-vistoria/00000000-0000-4000-8a01-000000003046";
export const DETALHE_PRE = "/pnip/portal-mpa/vistorias/agendar-vistoria/00000000-0000-4000-8a01-000000003038";
export const LISTA = "/pnip/portal-mpa/vistorias";

export const SETUP = [
  { action: "navigate", path: DETALHE_NC, waitFor: "pnip-propesc-detalhes-vistoria" },
  { action: "click", selector: "#avatar-dropdown-trigger" },
  { action: "wait", selector: "pnip-header .br-list[role=menu]" },
  { action: "click", selector: "#avatar-dropdown-trigger" },
  { action: "navigate", path: DETALHE_PRE, waitFor: "br-button[label=\"Trocar embarcação da vistoria\"]" },
  { action: "click", selector: "br-button[label=\"Trocar embarcação da vistoria\"] button" },
  { action: "wait", selector: ".br-modal" },
  // A lista de embarcações passa por "Nenhuma" → "Buscando..." → 10 itens depois de .br-modal
  // (achado do preflight, D-60, `15e007e`): sem esta espera a parada `modal` não fica estável.
  { action: "wait", selector: ".lista-embarcacoes .item-embarcacao:nth-child(2)" },
];

export const STATES = [
  { id: "inicial", afterStep: 0, path: LISTA, note: "lista, aba padrão Tramitando, página 1 — primeiro paint depois da hidratação" },
  { id: "detalhe-menu", afterStep: 3, path: DETALHE_NC, note: "detalhe da vistoria de não comparecimento (1ª linha da aba padrão que oferece \"Avançar\") com o menu do avatar aberto" },
  { id: "detalhe", afterStep: 5, path: DETALHE_PRE, note: "detalhe da vistoria preenchida (1ª linha da aba padrão que oferece \"Trocar embarcação da vistoria\"), rota nua" },
  { id: "modal", afterStep: 8, path: DETALHE_PRE, note: "br-modal \"Trocar embarcação\" aberto sobre o detalhe — última parada do segmento" },
];
