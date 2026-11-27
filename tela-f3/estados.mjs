/**
 * Tela F3 — plano de estados da referência (setup + paradas), num lugar só: montar-referencia.mjs, sonda.mjs e
 * conferir-arvores.mjs leem daqui.
 *
 * Segmento 0 = as duas paradas da D sem mudança (inicial; lista-exibir), como na F2. Os estados novos ficam em
 * segmentos próprios, cada um depois de ida e volta pela rota de vistorias (navegação dentro da SPA, sem recarga):
 *   seg 2 — assinatura-cancelada: marcar a caixa da 2ª linha (a 1ª caixa da lista da carga), abrir o diálogo pelo
 *           botão de ação em lote e CANCELAR (nunca "Assinar");
 *   seg 4 — pagina-2: aba "Concluídos" (14 itens), "Página seguinte";
 *   seg 6 — exibir-25: aba "Concluídos", seletor "Exibir" → 25;
 *   seg 8 — filtro-removido: filtro "Aberto há" → "Últimos 60 dias" (a mesma opção da F2, que mantém as 9 linhas),
 *           depois clique no × da tag do filtro escolhido.
 * Por que essa ordem (medido em tela-f3/sondas/persistencia*.mts, nos dois builds): a página guarda na sessão o
 * "Meus processos" desligado e os filtros escolhidos, mas não a aba, a página, os itens por página nem a linha
 * marcada. O filtro só é removido pelo × no build sem semente; no semeado ele continua na sessão. Por isso o
 * segmento do filtro é o último (nada depois dele herda a tag), e nenhum segmento desliga "Meus processos" (página 2
 * e Exibir 25 usam a aba "Concluídos", que não persiste). Assim cada segmento começa igual a uma entrada direta.
 */
export const ALA = "/pnip-f3/portal-mpa/processos";
export const VISTORIAS = "/pnip-f3/portal-mpa/vistorias";

export const SEL = {
  exibirCampo: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total",
  exibirItem: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item",
  exibir25: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item:nth-child(2) .br-radio",
  caixaLinha2: "pnip-mpa-processos table tbody tr:nth-child(2) input[type=checkbox]",
  botaoLote: 'pnip-mpa-processos div.mt-3 > br-button[icon="check"][type="primary"]',
  cancelar: ".swal2-cancel",
  abaConcluidos: 'pnip-mpa-processos br-tab button[data-panel="HISTORICO"]',
  paginaSeguinte: 'govbr-custom-pagination nav.br-pagination button[aria-label="Página seguinte"]',
  tagAbertoHa: "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag",
  itemFiltro: "pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item",
  tagEscolhida: "pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction",
};
const ida = { action: "navigate", path: VISTORIAS, waitFor: "pnip-propesc-vistorias" };
const volta = { action: "navigate", path: ALA, waitFor: "pnip-mpa-processos .br-table tbody tr" };

export const SETUP = [
  // segmento 0 (a D): 0–1
  { action: "click", selector: SEL.exibirCampo },
  { action: "wait", selector: SEL.exibirItem },
  // segmento 1 (passagem) e 2: 2–9
  ida, volta,
  { action: "click", selector: SEL.caixaLinha2 },
  { action: "wait", selector: SEL.botaoLote },
  { action: "click", selector: SEL.botaoLote },
  { action: "wait", selector: SEL.cancelar },
  { action: "click", selector: SEL.cancelar },
  { action: "wait", ms: 1500 },
  // segmento 3 (passagem) e 4: 10–15
  ida, volta,
  { action: "click", selector: SEL.abaConcluidos },
  { action: "wait", selector: "pnip-mpa-processos .br-table tbody tr:nth-child(10)" },
  { action: "click", selector: SEL.paginaSeguinte },
  { action: "wait", ms: 1000 },
  // segmento 5 (passagem) e 6: 16–24
  ida, volta,
  { action: "click", selector: SEL.abaConcluidos },
  { action: "wait", selector: "pnip-mpa-processos .br-table tbody tr:nth-child(10)" },
  { action: "click", selector: SEL.exibirCampo },
  { action: "wait", selector: SEL.exibir25 },
  { action: "click", selector: SEL.exibir25 },
  { action: "wait", selector: "pnip-mpa-processos .br-table tbody tr:nth-child(14)" },
  { action: "wait", ms: 1000 },
  // segmento 7 (passagem) e 8: 25–33
  ida, volta,
  { action: "click", selector: SEL.tagAbertoHa },
  { action: "wait", selector: SEL.itemFiltro },
  { action: "click", selector: `${SEL.itemFiltro}:nth-child(3) .br-radio` },
  { action: "wait", selector: SEL.tagEscolhida },
  { action: "wait", ms: 1000 },
  { action: "click", selector: `${SEL.tagEscolhida} > button` },
  { action: "wait", ms: 1000 },
];

export const PARADAS = [
  { id: "inicial", afterStep: 0, path: ALA },
  { id: "lista-exibir", afterStep: 2, path: ALA },
  { id: "assinatura-cancelada", afterStep: 10, path: ALA },
  { id: "pagina-2", afterStep: 16, path: ALA },
  { id: "exibir-25", afterStep: 25, path: ALA },
  { id: "filtro-removido", afterStep: 34, path: ALA },
];
if (SETUP.length !== 34) throw new Error(`setup com ${SETUP.length} passos, esperado 34`);
