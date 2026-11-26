/**
 * Tela F — monta o RASCUNHO da referência ground-truth-processos-f.json 1.0.0 (adendo de 26/11 § 4 "Referência da F").
 *
 * Estrato natural: as 13 specs da referência 1.1.0 da D copiadas sem mudança (id, âncora, escopo, contagem, estado,
 * rules, rulesLegado, categories, descrição); as âncoras não citam a rota, então "reancorar na pnip-f" é só a `_meta.url`
 * e os `path` das paradas. Estrato semeado: F-01…F-12 de tela-f/composicao.json, com os ids de
 * tela-f/clausulas-oraculo.json (base servida pelo oráculo congelado) e, sem id, `_meta.semIdMapeado` com o trecho e o
 * arquivo. Estados: as duas paradas da D intactas (segmento 1) + duas novas num segmento próprio, depois de ida e volta
 * por navegação (tela-f/explorar-estados.json mostrou que escolher um filtro recarrega a lista e acrescenta uma tag de
 * interação, o que quebraria a aditividade e as contagens da D num segmento só).
 * Uso: node tela-f/montar-referencia-rascunho.mjs → ground-truth-processos-f.json (recusa sobrescrever sem --forcar)
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SAIDA = join(RAIZ, "ground-truth-processos-f.json");
if (existsSync(SAIDA) && !process.argv.includes("--forcar")) { console.error("ground-truth-processos-f.json já existe (use --forcar no rascunho)"); process.exit(1); }
const sha = b => createHash("sha256").update(b).digest("hex");
const ler = p => readFileSync(join(RAIZ, p));
const dBuf = ler("ground-truth-processos-1.1.0.json"), D = JSON.parse(dBuf);
const compBuf = ler("tela-f/composicao.json"), comp = JSON.parse(compBuf);
const clBuf = ler("tela-f/clausulas-oraculo.json"), cl = JSON.parse(clBuf);
const confBuf = ler("tela-f/conformes.json"), conformes = JSON.parse(confBuf);
const ALA = "/pnip-f/portal-mpa/processos";

// ---------- estados ----------
const TAG_ABERTO_HA = "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag";
const ITEM_FILTRO = "pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item";
const TAG_ESCOLHIDA = "pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction";
const setup = [
  ...D._meta.setup, // 0–1: lista do "Exibir" aberta (as duas paradas da D)
  { action: "navigate", path: "/pnip-f/portal-mpa/vistorias", waitFor: "pnip-propesc-vistorias" },
  { action: "navigate", path: ALA, waitFor: "pnip-mpa-processos .br-table tbody tr" },
  { action: "click", selector: TAG_ABERTO_HA },
  { action: "wait", selector: ITEM_FILTRO },
  { action: "click", selector: `${ITEM_FILTRO}:nth-child(3) .br-radio` },
  { action: "wait", selector: TAG_ESCOLHIDA },
  { action: "wait", ms: 1000 },
  { action: "click", selector: TAG_ABERTO_HA },
  { action: "wait", selector: ITEM_FILTRO },
];
const states = [
  { ...D._meta.states[0], path: ALA },
  { ...D._meta.states[1], path: ALA, note: "lista do seletor \"Exibir\" (itens por página) da paginação aberta — última parada do segmento 1" },
  { id: "filtro-escolhido", afterStep: 9, path: ALA, note: "segmento 3 (depois de ida e volta por navegação, a rota recomeça): filtro \"Aberto há\" aberto e a opção \"Últimos 60 dias\" escolhida — a tag do filtro escolhido aparece; a lista continua com as mesmas 9 linhas" },
  { id: "lista-filtro", afterStep: 11, path: ALA, note: "em seguida, a lista de opções do filtro \"Aberto há\" aberta de novo — última parada do segmento 3" },
];

// ---------- specs semeadas ----------
const S = {
  "F-01": { anchor: "pnip-mpa-processos table tbody td:nth-of-type(5)", scope: "todos", expectedCount: 9, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["white-space", "overflow-x", "text-overflow"], forbidden: ["nowrap", "hidden", "clip"], quantifier: "todas",
      note: "Valores medidos nas células do solicitante: texto em uma linha, cortado pelo overflow, sem reticências. Sustenta só quando as três propriedades estão nesses valores (texto truncado sem reticências)." },
    description: "Coluna \"Solicitante\" da tabela (9 células): o texto fica numa linha só e é cortado na largura da coluna (white-space: nowrap; overflow: hidden; text-overflow: clip). Nomes longos aparecem cortados no meio da palavra, sem reticências, e a célula não tem title nem tooltip que mostre o texto completo (scrollWidth > clientWidth). O truncamento da Table pede reticências no fim do texto e o texto completo em tooltip." },
  "F-02": { anchor: "pnip-search-table-utils div.br-input > button.br-button", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["margin-top"], forbidden: ["-12px"], note: "Margem medida no botão da ação interna; com ela o centro do botão fica ~26–28 px abaixo do centro do campo." },
    description: "Ação interna \"Buscar\" do campo de pesquisa da lista: o botão da lupa (32×32) fica deslocado para baixo do campo — o centro vertical dele está cerca de 26–28 px abaixo do centro vertical do campo, e a lupa aparece fora da borda inferior do campo. A ação interna do Input fica centralizada verticalmente no campo (--spacing-vertical-center)." },
  "F-03": { anchor: "pnip-mpa-processos > div.p-5 > div.d-flex.justify-content-end", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["margin-top"], forbidden: ["-20px"], note: "Margem medida no contêiner do botão Voltar; com ela a caixa do botão intersecta a do seletor \"Página\" da paginação." },
    description: "Botão \"Voltar\" no fim da página: o contêiner dele sobe 20 px sobre a barra de paginação (margin-top: -20px), e a caixa do botão se sobrepõe à do seletor \"Página\" da paginação — as duas áreas de interação ficam encavaladas, sem espaço entre elas. A área de proteção do Button pede um espaçamento mínimo em relação aos componentes vizinhos." },
  "F-04": { anchor: "pnip-mpa-processos > div.p-5 > div.d-flex.justify-content-end > button.br-button.secondary", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["border-top-left-radius"], forbidden: ["4px"], note: "Raio medido no botão Voltar (var(--surface-rounder-sm)); o Exportar, secundário da mesma página, mede raio de pílula." },
    description: "Botão secundário \"Voltar\": a superfície tem cantos de 4 px (border-radius: var(--surface-rounder-sm)), enquanto o outro botão secundário da página, \"Exportar\", tem forma de pílula. A superfície do Button padrão tem arredondamento --surface-rounder-pill." },
  "F-05": { anchor: "pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["border-top-left-radius"], allowed: ["4px"], note: "--surface-rounder-sm (4 px no core), o arredondamento da superfície da Tag de interação; medido nas tags de filtro da mesma barra." },
    description: "Tag de interação \"Meus processos\": a superfície tem forma de pílula (border-radius ≥ 16 px, var(--surface-rounder-pill)), enquanto as tags de filtro da mesma barra têm cantos de 4 px. O arredondamento da superfície da Tag de interação é --surface-rounder-sm." },
  "F-06": { anchor: "pnip-mpa-processos table thead th:nth-of-type(7)", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["background-color"], allowed: ["rgb(240, 240, 240)"], note: "--gray-5 (#f0f0f0), o fundo do header da Table; medido nos demais th do mesmo cabeçalho." },
    description: "Cabeçalho da tabela, coluna \"Téc. Adm.\": a célula tem fundo branco (rgb(255, 255, 255)), enquanto as demais células do cabeçalho têm fundo rgb(240, 240, 240) — um vão branco na faixa cinza do header. O fundo do header da Table é --gray-5." },
  "F-07": { anchor: "pnip-header .br-avatar .content", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["border-top-left-radius"], allowed: ["50%"], note: "Superfície circular do Avatar (border-radius 50%, o que o core computa)." },
    description: "Avatar de letra no cabeçalho (\"U\"): a superfície de 40×40 tem cantos de 4 px (border-radius: var(--surface-rounder-sm)) — um quadrado de cantos arredondados, não um círculo. A representação do usuário no Avatar fica contida numa superfície circular." },
  "F-08": { anchor: "pnip-multiple-search-table-utils br-button[label=\"Limpar filtros\"] >>> button", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["text-transform"], allowed: ["none"], note: "Rótulo do Button: text-transform none." },
    description: "Botão \"Limpar filtros\" (desabilitado na carga, visível): o rótulo é renderizado em caixa alta, \"LIMPAR FILTROS\" (text-transform: uppercase no botão interno, herdado da classe text-uppercase do hospedeiro). O rótulo do Button padrão não tem transformação de caixa (text-transform: none)." },
  "F-09": { anchor: "pnip-mpa-processos table tbody td", scope: "composicao", expectedCount: 1, participantCount: 81, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["padding-top", "padding-bottom"], allowed: ["8px", "16px", "24px"], note: "Espaçamento vertical das linhas da Table nas três densidades: alta --spacing-scale-base (8 px), padrão --spacing-scale-2x (16 px), baixa --spacing-scale-3x (24 px)." },
    description: "Linhas do corpo da tabela (81 células, 9 linhas × 9 colunas): padding-top e padding-bottom de 12 px, valor que não corresponde a nenhuma densidade da Table (alta 8 px, padrão 16 px, baixa 24 px); o cabeçalho continua com 16 px. A densidade é uma só para o corpo da tabela, e uma única regra a define: uma unidade para o conjunto." },
  "F-10": { anchor: "pnip-multiple-search-table-utils div.br-select > div.br-list", scope: "unico", expectedCount: 1, state: "lista-filtro",
    acceptance: { kind: "estilo-computado", properties: ["box-shadow"], forbidden: ["none"], note: "Medido na lista de opções aberta do filtro: sem sombra." },
    description: "Lista de opções de um filtro da barra (aberta ao clicar a tag do filtro, aqui \"Aberto há\"): a lista flutua sobre a tabela sem sombra (box-shadow: none). Uma sombra deve dar contraste entre a lista flutuante do Select e o conteúdo da tela ao fundo." },
  "F-11": { anchor: TAG_ESCOLHIDA, scope: "unico", expectedCount: 1, state: "filtro-escolhido",
    description: "Tag do filtro escolhido (aparece depois de abrir um filtro e escolher uma opção, aqui \"Aberto há\" → \"Últimos 60 dias\"): o botão de fechar (×) fica à esquerda, antes do ícone e do rótulo, em vez de na extremidade direita da tag. Na Tag de interação, o ícone se alinha à esquerda e o botão terciário (fechar) à direita." },
  "F-12": { anchor: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item.selected", scope: "unico", expectedCount: 1, state: "lista-exibir",
    acceptance: { kind: "estilo-computado", properties: ["background-color"], allowed: ["rgb(38, 112, 232)"], note: "--blue-warm-vivid-50 (#2670e8), o fundo do estado Selecionado; é o que o item selecionado da lista do \"Página\" (mesmo componente) mede." },
    description: "Lista do seletor \"Exibir\" da paginação aberta: o item selecionado (\"10\") tem fundo rgb(19, 81, 180) (#1351b4) com texto branco, em vez do fundo do estado Selecionado (#2670e8, --blue-warm-vivid-50). Continua azul; só o tom muda." },
};

const semeadas = comp.semeadas.map(s => {
  const x = S[s.id];
  if (!x) throw new Error(`sem spec escrita para ${s.id}`);
  const { anchor, scope, expectedCount, participantCount, state, acceptance, description } = x;
  if (state !== (s.estado.startsWith("inicial") ? "inicial" : state)) throw new Error(`${s.id}: estado`);
  return { id: s.id, anchor, scope, expectedCount, ...(participantCount ? { participantCount } : {}), state, ...(acceptance ? { acceptance } : {}),
    rules: s.rules, categories: s.categories, description };
});
const semId = Object.fromEntries(comp.semeadas.filter(s => s.semIdMapeado).map(s => [s.id, { arquivo: s.clausula.arquivo, trecho: s.clausula.trecho }]));

const naturais = D.violations.map(v => JSON.parse(JSON.stringify(v)));
const exp = D._meta.exposto.specs;

const ref = {
  _meta: {
    version: "1.0.0",
    status: "RASCUNHO — não congelado. Falta o que está em tela-f/pendencias-congelamento.md (conferência na página semeada servida, re-medida das naturais e dos controles, auditorias cegas, classes NAT-71, conferência de ids, hashes).",
    version_note: "1.0.0 (rascunho de 26/11/2026): tela F do estudo de seguimento (adendo-tela-f-protocolo-2026-11-26.md). Estrato semeado F-01…F-12 (tela-f/composicao.json) + estrato natural = as 13 specs da referência 1.1.0 da D (sha256 " + sha(dBuf) + "), sem mudança, a reconferir na página semeada.",
    page: "Processos do portal MPA do PNIP — tela F (estudo de seguimento; cópia da rota da tela D na ala pnip-f, com defeitos do DS no fonte), aplicação real em modo mock",
    url: ALA + "?mock-perfil=mpa",
    waitFor: D._meta.waitFor,
    suite: "processos-f",
    ds: D._meta.ds,
    unit_of_evaluation: D._meta.unit_of_evaluation,
    viewport: D._meta.viewport,
    setup,
    setup_rationale: "Segmento 1 = as duas paradas da D sem mudança (inicial; lista-exibir). Os estados novos ficam no segmento 3: escolher uma opção de filtro pede a lista de novo e acrescenta uma tag de interação (a do filtro escolhido), o que, no mesmo segmento, quebraria a aditividade e as contagens das specs da D. Por isso a sequência navega por caminho para a rota de vistorias (segmento 2, sem parada) e de volta para processos, que recomeça como numa entrada direta (medido no build sem semente: mesma árvore, 590 elementos, nenhuma diferença; sem recarga, sem erro, sem chamada sem fixture; tela-f/explorar-estados.json). No segmento 3: abrir o filtro \"Aberto há\", escolher \"Últimos 60 dias\" (a opção que mantém as mesmas 9 linhas) e abrir a lista do filtro de novo — aditivo dentro do segmento.",
    states,
    estratos: {
      semeado: { nota: "Defeitos do DS injetados no fonte da rota (adendo § 4): o primário da F, por spec. Toda spec aqui é classe ds pela D-156 3.i; nenhuma é exposta. O nível de cada uma está só em tela-f/niveis-1.0.0.json.", specs: semeadas.map(s => s.id) },
      natural: { nota: "As 13 specs da referência 1.1.0 da D (ids, âncoras, unidades, rules e exposição sem mudança), reconferidas na página semeada antes do congelamento; uma natural que mude de âncora ou contagem na página semeada é achado de coviolação a relatar, não algo a ajustar.", specs: naturais.map(v => v.id) },
      exposto: { nota: "O casco, como na D (adendo da D § E): dentro do estrato natural.", specs: [...exp] },
    },
    exposto: { nota: D._meta.exposto.nota, specs: [...exp] },
    semIdMapeado: {
      nota: "Specs semeadas cuja cláusula não tem registro na base que o oráculo congelado serve (govbr-ds-validator congelado-3.7.12; tela-f/clausulas-oraculo.json): ficam sem id em `rules`, com o trecho literal e o arquivo da documentação (adendo § 4 item 3, \"id na base: registro, não filtro\"; como as specs sem id da referência 1.1.0 da D). A coluna fundamentada só credita por id as que têm id.",
      specs: semId,
    },
    conformes: {
      nota: "Controles conformes (protocolo NAT-78 § 5.2: denominador da taxa de falso alarme). Procedimento da D (tela-d/sortear-conformes.mjs) com as âncoras das semeadas somadas à exclusão de elemento-âncora: saem K-06, K-11 e K-12 da D (elemento participante de semeada), entra breadcrumb-orientacao; 10 elegíveis ≤ 12, sem sorteio: 10, não 12 — só 10 elegíveis na página semeada (aceito pelo coordenador em 26/11). Re-medidos na página semeada pelo código da D (tela-f/remedida-d/semeada.log). Arquivo irmão com sha256.",
      arquivo: "tela-f/conformes.json",
      sha256: sha(confBuf),
      total: conformes.itens.length,
      porQue10: "10, não 12: só 10 elegíveis na página semeada (procedimento da D, sem sorteio)",
      itens: conformes.itens.map(({ id, deD, state, selector, count, rules, medida }) => ({ id, deD, state, selector, count, rules, medida })),
    },
    fundo: D._meta.fundo,
    fora_de_escopo: "Como na D (abaixo), menos o que os estados novos trazem para dentro: a lista aberta do filtro \"Aberto há\" e a tag do filtro escolhido (\"Últimos 60 dias\") são paradas da F. Fora continuam: abas \"Aguardando análise\"/\"Concluídos\", \"Meus processos\" desligado, outros filtros e opções, troca de página, \"Exportar\", \"Ver processo\", números de processo, breadcrumb e \"Voltar\" (navegam ou recarregam), os dois SweetAlert2, menu do avatar, a rota de vistorias atravessada pela navegação (segmento 2, sem parada), outras janelas e zoom, linguagem e microcopy, conteúdo das fixtures, regras só da base literal. Texto da D: " + D._meta.fora_de_escopo,
    nunca_agregar_com: "ground-truth-processos.json e ground-truth-processos-1.1.0.json (tela D) e todas as referências listadas na D: " + D._meta.nunca_agregar_com,
    baselines: D._meta.baselines,
    origem: {
      referenciaD: { arquivo: "ground-truth-processos-1.1.0.json", version: D._meta.version, sha256: sha(dBuf) },
      composicao: { arquivo: "tela-f/composicao.json", sha256: sha(compBuf) },
      clausulas: { arquivo: "tela-f/clausulas-oraculo.json", sha256: sha(clBuf) },
      construcao: "tela-f/construcao/ (12/12 pegaram; conferencia-construcao.json, diferencas-atribuidas.json, pagina-congelada.json: lista 195f1e47…)",
      remedidaNaturais: "tela-f/remedida-d/ (código da D na ala pnip-f: evidência das 13 naturais idêntica entre o build sem semente e o semeado)",
      lacunas: "tela-f/lacunas-construcao.json",
      idsNaBase: "tela-f/conferencia-ids-base.json",
    },
  },
  violations: [...semeadas, ...naturais],
};
writeFileSync(SAIDA, JSON.stringify(ref, null, 1) + "\n");
const u = ref.violations.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
console.log(`specs ${ref.violations.length} (semeado ${semeadas.length}, natural ${naturais.length}, exposto ${exp.length}); unidades ${u} (semeado ${semeadas.reduce((n, v) => n + v.expectedCount, 0)}); estados ${states.length}; predicados ${semeadas.filter(s => s.acceptance).length}/${semeadas.length}`);
