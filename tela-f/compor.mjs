/**
 * Tela F — composição (adendo § 4 item 4) e listas de mudanças para o agente de construção.
 *
 * Composição: os 3 primeiros sobreviventes de cada nível (tela-f/filtros.json), na ordem do seletor → semeadas,
 * ids F-01… na ordem facil, medio, dificil, muito-dificil; os seguintes → reserva, na mesma ordem, ids R-01….
 * Recomposição do portão (§ 5), fixada aqui sem olhar resultado: sai o 3º fácil e o 3º médio; entram o 1º da
 * reserva do difícil e o 1º da reserva do muito difícil (o 4º de cada nível), se existirem.
 *
 * Listas de mudanças: SÓ id, localizador, estado, mudança no fonte (arquivo em pnip-mock/src, antes → depois) e
 * conferência medível. Sem nível, cláusula, id de regra nem justificativa. A reserva traz, por entrada, as semeadas
 * que ela pode substituir (mesmo grupo), sem nomear o grupo.
 * Uso: node tela-f/compor.mjs → composicao.json, lista-de-mudancas.json, lista-de-mudancas-reserva.json
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const sha = b => createHash("sha256").update(b).digest("hex");
const filtrosBuf = readFileSync(join(AQUI, "filtros.json"));
const filtros = JSON.parse(filtrosBuf);
const cand = new Map(JSON.parse(readFileSync(join(AQUI, "selecao/candidatos.json"), "utf8")).map(c => [c.id, c]));
const NIVEIS = ["facil", "medio", "dificil", "muito-dificil"];
const BASE_SRC = "pnip-mock/src (worktree .tmp-eval/pnip-mock-f, ramo tela-f; manter o fim de linha que o arquivo já tem — hoje LF)";
const P = "src/app/pages/portal-mpa/processos/processos.component.html";

// mudanças por candidato (fonte conferido no worktree em 3d02f68)
const M = {
  "F-facil-2": {
    localizador: "pnip-mpa-processos div.br-table table tbody tr > td que contém o nome do solicitante (5ª célula da linha na aba Tramitando)",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 90, antes: "<td>   (a célula imediatamente antes de {{p.solicitante}}, l. 90)", depois: "<td style=\"max-width:90px; white-space:nowrap; overflow:hidden\">" },
    conferencia: "Depois do build, no estado inicial, as células do solicitante têm white-space = nowrap, overflow = hidden, text-overflow = clip e, em pelo menos uma, scrollWidth > clientWidth. No build sem semente: white-space = normal e scrollWidth == clientWidth em todas.",
  },
  "F-facil-3": {
    localizador: "pnip-search-table-utils div.br-input > button.br-button[aria-label=\"Buscar\"] (e [aria-label=\"Limpar\"], que aparece após digitar)",
    estado: "inicial",
    mudanca: { arquivo: "src/app/utils/components/search-table.utils.ts", linha: "19 e 28", antes: "[style.margin-top]=\"'-38px'\"   (nos dois botões)", depois: "[style.margin-top]=\"'-12px'\"   (nos dois botões)" },
    conferencia: "Depois do build, no estado inicial, o centro vertical do botão Buscar fica cerca de 26–28 px abaixo do centro vertical do campo de busca (botão abaixo da borda inferior do campo). No build sem semente a diferença é ≤ 2 px.",
  },
  "F-facil-6": {
    localizador: "pnip-mpa-processos div.d-flex.justify-content-end (contêiner do botão Voltar, depois da paginação)",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 164, antes: "<div class=\"d-flex justify-content-end mt-4\">", depois: "<div class=\"d-flex justify-content-end\" style=\"margin-top:-20px\">" },
    conferencia: "Depois do build, no estado inicial, a caixa do botão Voltar intersecta a caixa do campo do seletor \"Página\" da paginação (distância vertical paginação→Voltar ≈ −20 px). No build sem semente o Voltar fica 24 px abaixo, sem interseção.",
  },
  "F-medio-2": {
    localizador: "botão Voltar (hoje pnip-mpa-processos br-button[label=\"Voltar\"])",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 165, antes: "<br-button label=\"Voltar\" type=\"secondary\" (click)=\"voltar()\"/>", depois: "<button type=\"button\" class=\"br-button secondary\" style=\"border-radius:var(--surface-rounder-sm)\" (click)=\"voltar()\">Voltar</button>" },
    conferencia: "Depois do build, no estado inicial, o botão Voltar (button.br-button.secondary em light DOM) tem border-radius computado 4px, com o texto \"Voltar\" e o clique funcionando; o Exportar segue com border-radius de pílula (≈ 1680px). No build sem semente o Voltar (interior do br-button) tem border-radius ≈ 1680px.",
  },
  "F-medio-3": {
    localizador: "pnip-mpa-processos div.tab-panel span.br-tag.interaction (a de \"Meus processos\")",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 25, antes: "<span class=\"br-tag interaction small\" (click)=\"toggleMeusProcessos()\"", depois: "<span class=\"br-tag interaction small\" [style.border-radius]=\"'var(--surface-rounder-pill)'\" (click)=\"toggleMeusProcessos()\"" },
    conferencia: "Depois do build, no estado inicial, a tag \"Meus processos\" tem border-top-left-radius computado ≥ 16px (pílula); as tags de filtro vizinhas seguem com 4px. No build sem semente ela tem 4px.",
  },
  "F-medio-4": {
    localizador: "pnip-mpa-processos div.br-table thead th com texto \"Téc. Adm.\"",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 72, antes: "<th class=\"text-blue-vivid-60 text-bold\" scope=\"col\" *ngIf=\"status === 'TRAMITANDO' || status === 'HISTORICO'\">Téc. Adm.</th>", depois: "<th class=\"text-blue-vivid-60 text-bold\" scope=\"col\" style=\"background-color: var(--pure-0)\" *ngIf=\"status === 'TRAMITANDO' || status === 'HISTORICO'\">Téc. Adm.</th>" },
    conferencia: "Depois do build, no estado inicial, esse th tem background-color rgb(255, 255, 255); os demais th seguem rgb(240, 240, 240). No build sem semente todos os th têm rgb(240, 240, 240).",
  },
  "F-medio-5": {
    localizador: "govbr-custom-pagination: 1º div.pagination-per-page (rótulo \"Exibir\") › br-select-pnip input#total",
    estado: "inicial",
    mudanca: [
      { arquivo: "src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html", linha: "1º <div class=\"pagination-per-page\">", antes: "<div class=\"pagination-per-page\">   (o que contém label=\"Exibir\")", depois: "<div class=\"pagination-per-page pp-exibir\">   (se a classe pp-exibir já estiver lá, não repetir)" },
      { arquivo: "src/styles.css", linha: "fim do arquivo", antes: "(nada)", depois: ".pp-exibir input { border-color: var(--gray-40) !important; }" },
    ],
    conferencia: "Depois do build, no estado inicial, input#total tem border-color rgb(136, 136, 136) (largura 1px); input#page segue com borda transparente. No build sem semente os dois têm borda transparente.",
  },
  "F-medio-6": {
    localizador: "govbr-custom-pagination div.pagination-information (\"1–9 de 9 itens\")",
    estado: "inicial",
    mudanca: { arquivo: "src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html", linha: "div.pagination-information", antes: "<div class=\"pagination-information d-sm-flex\" aria-live=\"polite\">", depois: "<div class=\"pagination-information d-sm-flex\" aria-live=\"polite\" style=\"color: var(--blue-warm-vivid-70)\">" },
    conferencia: "Depois do build, no estado inicial, o texto de div.pagination-information tem color rgb(19, 81, 180); os rótulos \"Exibir\" e \"Página\" seguem rgb(51, 51, 51). No build sem semente: rgb(51, 51, 51).",
  },
  "F-dificil-2": {
    localizador: "pnip-header button#avatar-dropdown-trigger span.br-avatar > span.content",
    estado: "inicial",
    mudanca: { arquivo: "src/app/layout/header/header.component.html", linha: 7, antes: "<span class=\"content bg-orange-vivid-30 text-pure-0\">", depois: "<span class=\"content bg-orange-vivid-30 text-pure-0\" style=\"border-radius: var(--surface-rounder-sm)\">" },
    conferencia: "Depois do build, no estado inicial, span.content do avatar tem border-radius computado 4px. No build sem semente: 50%.",
  },
  "F-dificil-3": {
    localizador: "pnip-multiple-search-table-utils br-button[label=\"Limpar filtros\"] → shadow: button",
    estado: "inicial",
    mudanca: { arquivo: "src/app/utils/components/multiple-search-table.utils.ts", linha: 55, antes: "<br-button icon label=\"Limpar filtros\" [disabled]=\"selected && selected.length === 0\" (click)=\"clearSelected()\"></br-button>", depois: "<br-button icon class=\"text-uppercase\" label=\"Limpar filtros\" [disabled]=\"selected && selected.length === 0\" (click)=\"clearSelected()\"></br-button>" },
    conferencia: "Depois do build, no estado inicial, o button interno (shadow root do br-button \"Limpar filtros\") tem text-transform computado uppercase (texto renderizado \"LIMPAR FILTROS\"). No build sem semente: none.",
  },
  "F-dificil-4": {
    localizador: "pnip-mpa-processos div.br-table table.table tbody td (todas as células do corpo)",
    estado: "inicial",
    mudanca: { arquivo: "src/app/pages/portal-mpa/processos/processos.component.scss", linha: "fim do arquivo", antes: "(nada; hoje só .swal-height)", depois: ".br-table .table tbody td { padding-top: 12px !important; padding-bottom: 12px !important; }" },
    conferencia: "Depois do build, no estado inicial, todo td do tbody tem padding-top e padding-bottom 12px (padding-left/right seguem 24px; th segue 16px/24px). No build sem semente: td com 16px/24px.",
  },
  "F-dificil-5": {
    localizador: "pnip-mpa-processos div.br-table tbody td a[role=\"button\"] (número do processo)",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 87, antes: "<a [style.cursor]=\"'pointer'\" role=\"button\" (click)=\"redirectDocumentos(p)\">{{p.numeroProcesso}}</a>", depois: "<a class=\"text-blue-vivid-60\" [style.cursor]=\"'pointer'\" role=\"button\" (click)=\"redirectDocumentos(p)\">{{p.numeroProcesso}}</a>" },
    conferencia: "Depois do build, no estado inicial, os links do número do processo têm color rgb(0, 94, 162). No build sem semente: rgb(19, 81, 180).",
  },
  "F-muito-dificil-1": {
    localizador: "pnip-multiple-search-table-utils div.br-select > div.br-list (lista de opções de um filtro)",
    estado: "clicar numa tag de filtro (ex.: \"Tipo de processo\") para abrir a lista de opções",
    mudanca: { arquivo: "src/app/utils/components/multiple-search-table.utils.ts", linha: 44, antes: "<div class=\"br-list d-block mt-1\">", depois: "<div class=\"br-list d-block mt-1\" style=\"box-shadow:none\">" },
    conferencia: "Depois do build, com a lista do filtro aberta, div.br-list tem box-shadow computado none. No build sem semente, no mesmo estado: rgba(0, 0, 0, 0.16) 0px 3px 6px 0px.",
  },
  "F-muito-dificil-2": {
    localizador: "pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction (tag do filtro escolhido) e seus filhos i / span / button.br-button.inverted.circle",
    estado: "clicar numa tag de filtro (ex.: \"Tipo de processo\") e escolher uma opção (ex.: a 1ª)",
    mudanca: { arquivo: "src/app/utils/components/multiple-search-table.utils.ts", linha: "25–30", antes: "<i class=\"{{s.icon}} mr-1\" aria-hidden=\"true\"></i>\n<span class=\"text-truncate\" [style.max-width]=\"'150px'\">{{s.option}}</span>\n<button class=\"br-button inverted circle\" type=\"button\" (click)=\"removeSelected(i)\">…</button>", depois: "<button class=\"br-button inverted circle\" type=\"button\" (click)=\"removeSelected(i)\">…</button>\n<i class=\"{{s.icon}} mr-1\" aria-hidden=\"true\"></i>\n<span class=\"text-truncate\" [style.max-width]=\"'150px'\">{{s.option}}</span>   (só mover o <button> inteiro, com o <i class=\"fas fa-times\"> de dentro, para antes do <i>)" },
    conferencia: "Depois do build, com uma opção escolhida, na tag selecionada o x do botão < x do ícone < x do rótulo, e o botão continua removendo o filtro. No build sem semente: ícone (x ≈ 104) < rótulo (≈ 132) < botão (≈ 294, extremidade direita).",
  },
  "F-muito-dificil-4": {
    localizador: "govbr-custom-pagination: 1º div.pagination-per-page (rótulo \"Exibir\") › br-select-pnip div.br-list > div.br-item.selected",
    estado: "clicar no campo \"Exibir\" da paginação para abrir a lista (10/25/50/100) — a parada \"lista-exibir\" da tela D",
    mudanca: [
      { arquivo: "src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html", linha: "1º <div class=\"pagination-per-page\">", antes: "<div class=\"pagination-per-page\">   (o que contém label=\"Exibir\")", depois: "<div class=\"pagination-per-page pp-exibir\">   (se a classe pp-exibir já estiver lá, não repetir)" },
      { arquivo: "src/styles.css", linha: "fim do arquivo", antes: "(nada)", depois: ".pp-exibir .br-list .br-item.selected { background-color: var(--blue-warm-vivid-70) !important; }" },
    ],
    conferencia: "Depois do build, com a lista do Exibir aberta, o item selecionado (\"10\") tem background-color rgb(19, 81, 180) e texto branco. No build sem semente, no mesmo estado: rgb(38, 112, 232). A lista do \"Página\" não muda.",
  },
  "F-muito-dificil-5": {
    localizador: "pnip-mpa-processos br-tab → shadow: li.tab-item > button (itens de aba)",
    estado: "foco por teclado (Tab) num item de aba",
    mudanca: { arquivo: P, linha: 13, antes: "<br-tab (onTabItemClick)=\"onTabItemClick($event)\">", depois: "<br-tab style=\"--focus-style: solid; --focus: var(--blue-warm-vivid-70); --focus-color: var(--blue-warm-vivid-70)\" (onTabItemClick)=\"onTabItemClick($event)\">" },
    conferencia: "Depois do build, com foco de teclado num item de aba, o button interno tem outline rgb(19, 81, 180) solid 4px. No build sem semente, no mesmo estado: rgb(194, 133, 12) dashed 4px (offset −4px).",
  },
};

const sob = filtros.candidatos.filter(l => l.sobrevive);
const semeadas = [], reserva = [];
let nF = 0, nR = 0;
const grupo = {};
for (const n of NIVEIS) {
  const ln = sob.filter(l => l.nivel === n).sort((a, b) => a.ordem - b.ordem);
  if (ln.length < 3) throw new Error(`nível ${n} com ${ln.length} sobreviventes: composição para (§ 4 item 4)`);
  grupo[n] = [];
  for (const [i, l] of ln.entries()) {
    const c = cand.get(l.id);
    const base = {
      nivel: n, candidato: l.id, ordemDoSeletor: l.ordem,
      rules: l.filtros.d.ids, semIdMapeado: l.filtros.d.semIdMapeado,
      ...(l.filtros.d.semIdMapeado ? { clausula: { arquivo: c.clausula.arquivo, trecho: c.clausula.trecho } } : {}),
      categories: l.filtros.e.categories, classe: l.filtros.e.classe,
      estado: c.estado, risco: l.risco,
    };
    if (i < 3) { const id = `F-${String(++nF).padStart(2, "0")}`; semeadas.push({ id, ...base }); grupo[n].push(id); }
    else reserva.push({ id: `R-${String(++nR).padStart(2, "0")}`, posicaoNaReservaDoNivel: i - 2, ...base });
  }
}
const primeiroDaReserva = n => reserva.find(r => r.nivel === n)?.id ?? null;
const composicao = {
  _meta: {
    regra: "adendo § 4 item 4 (3 primeiros sobreviventes por nível, na ordem do seletor; o resto é reserva, na mesma ordem); ids F-01… na ordem facil, medio, dificil, muito-dificil",
    filtros: { arquivo: "tela-f/filtros.json", sha256: sha(filtrosBuf) },
    contagens: Object.fromEntries(NIVEIS.map(n => [n, {
      semeadas: semeadas.filter(s => s.nivel === n).length,
      semeadasComId: semeadas.filter(s => s.nivel === n && !s.semIdMapeado).length,
      semeadasSemIdMapeado: semeadas.filter(s => s.nivel === n && s.semIdMapeado).length,
      reserva: reserva.filter(r => r.nivel === n).length,
    }])),
    recomposicaoDoPortao: {
      regra: "adendo § 5: sai o 3º fácil e o 3º médio da ordem do seletor; entram o 4º difícil e o 4º muito difícil (composição 2/2/4/4)",
      sai: [grupo.facil[2], grupo.medio[2]], entra: [primeiroDaReserva("dificil"), primeiroDaReserva("muito-dificil")],
      possivel: !!(primeiroDaReserva("dificil") && primeiroDaReserva("muito-dificil")),
    },
    reposicao: "adendo § 4 item 5: semeada que não pega sai e é reposta pela próxima da reserva do mesmo nível (posicaoNaReservaDoNivel crescente)",
  },
  semeadas, reserva,
};
writeFileSync(join(AQUI, "composicao.json"), JSON.stringify(composicao, null, 1) + "\n");

const entrada = (id, candId) => { const m = M[candId]; if (!m) throw new Error(`sem mudança para ${candId}`); return { id, localizador: m.localizador, estado: m.estado, mudanca: m.mudanca, conferencia: m.conferencia }; };
const lista = {
  _meta: {
    para: "agente de construção da tela F (fase 1)",
    fonte: BASE_SRC,
    baseDeComparacao: "build sem semente da ala pnip-f (.tmp-eval/pnip-f-sem-semente; lista e694a39f…), não a pnip-d",
    regras: [
      "Aplicar só as mudanças listadas, no fonte; nada por folha de estilo ou script por cima do build.",
      "Cada entrada tem de passar na conferência dela (semeado × sem semente, sem oráculo e sem axe). Se não passar, a entrada sai e é reposta pela reserva (lista-de-mudancas-reserva.json): a primeira entrada ainda não usada, na ordem, cujo campo `podeSubstituir` contém o id que saiu.",
      "Não mexer em src/mock/manipuladores/processos-mpa.ts; não rodar git checkout/stash/reset --hard/restore no worktree (fins de linha, fase 0 § 3).",
    ],
  },
  mudancas: semeadas.map(s => entrada(s.id, s.candidato)),
};
writeFileSync(join(AQUI, "lista-de-mudancas.json"), JSON.stringify(lista, null, 1) + "\n");
const listaR = {
  _meta: { para: "agente de construção da tela F (fase 1): substitutas, na ordem", fonte: BASE_SRC, regra: lista._meta.regras[1] },
  reserva: reserva.map(r => ({ ...entrada(r.id, r.candidato), podeSubstituir: grupo[r.nivel] })),
};
writeFileSync(join(AQUI, "lista-de-mudancas-reserva.json"), JSON.stringify(listaR, null, 1) + "\n");
console.log(JSON.stringify(composicao._meta.contagens), JSON.stringify(composicao._meta.recomposicaoDoPortao));
console.log("risco nas semeadas:", semeadas.filter(s => s.risco).length, "· estado não inicial:", semeadas.filter(s => s.estado && !/^inicial/.test(s.estado)).length);
