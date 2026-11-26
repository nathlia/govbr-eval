/**
 * Tela F2 — composição (adendo 2 § 4 item 5), arquivo de estratos (formato tela-f2-estratos-1.0.0, bancada § 3) e lista
 * de mudanças para o agente de construção.
 *
 * Composição: os 3 primeiros sobreviventes de cada tipo (tela-f2/filtros.json), na ordem do seletor → semeadas, ids
 * F2-01… na ordem T1, T2, T3, T4 (dentro do tipo, a do seletor); os seguintes → reserva do tipo, na mesma ordem, ids
 * R-01… (numeração única, na mesma ordem). Tipo com menos de 3 sobreviventes: o script PARA (o orquestrador devolve o
 * tipo ao seletor uma vez).
 * Recomposição do portão (adendo 2 § 5), calculada aqui sem olhar resultado: em cada tipo, sai o semeado de menor nível
 * para o qual exista na reserva do tipo um sobrevivente de nível superior (empate: o último na ordem do seletor); entra a
 * primeira reserva do tipo, na ordem do seletor, de nível superior ao do que sai. Tipo sem troca possível fica.
 *
 * Lista de mudanças (para o construtor): SÓ id neutro, arquivo, linha, antes → depois, estado e medida de antes/depois.
 * Sem cláusula, tipo, nível, id de regra nem justificativa. Ids M-01… na ordem de arquivo e linha (não na de tipo);
 * por entrada, as reservas R-… que também têm de ser provadas construtíveis (as do mesmo grupo), sem nomear o grupo.
 * Uso: node tela-f2/compor.mjs → tela-f2/composicao.json, tela-f2/estratos-1.0.0.json,
 *      ../tela-f2-para-construcao/mudancas.json e mudancas.md
 */
import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA_CONSTRUCAO = "F:/Dev Nath/TCC/.tmp-eval/tela-f2-para-construcao";
const sha = b => createHash("sha256").update(b).digest("hex");
const filtrosBuf = readFileSync(join(AQUI, "filtros.json"));
const filtros = JSON.parse(filtrosBuf);
const cand = new Map(JSON.parse(readFileSync(join(AQUI, "selecao/candidatos.json"), "utf8")).map(c => [c.id, c]));
const TIPOS = ["T1", "T2", "T3", "T4"];
const ROTULO = { T1: "Estrutura", T2: "Valor fora do sistema", T3: "Valor do sistema no lugar errado", T4: "Estado e comportamento" };
const NIV = ["facil", "medio", "dificil", "muito-dificil"];
const P = "src/app/pages/portal-mpa/processos/processos.component.html";
const SCSS = "src/app/pages/portal-mpa/processos/processos.component.scss";
const PAG = "src/app/utils/components/govbr-custom-pagination/govbr-custom-pagination.component.html";
const SEL = "src/app/shared/br-select/br-select.component.html";
const BUSCA = "src/app/utils/components/search-table.utils.ts";
const FILT = "src/app/utils/components/multiple-search-table.utils.ts";
const HDR = "src/app/layout/header/header.component.html";
const HDRS = "src/app/layout/header/header.component.scss";
const ROTA = "/pnip-f2/portal-mpa/processos?mock-perfil=mpa";

// ---------- mudanças, por candidato (fonte conferido em .tmp-eval/pnip-mock-f2 @ 3d02f68; medidas do conferente) ----------
// chave de ordenação neutra: [arquivo, linha]
const M = {
  "T1-1": {
    ordem: [PAG, 8],
    localizador: "govbr-custom-pagination nav.br-pagination > ul > li > button.br-button.circle (botões de seta da paginação, light DOM)",
    estado: "inicial; rolar até a paginação, abaixo da tabela",
    mudanca: { arquivo: PAG, linha: "8–12", antes: "        <li>\n          <button class=\"br-button circle\" type=\"button\" [disabled]=\"currentPage === 1\" (click)=\"previousPage()\" aria-label=\"Página anterior\">\n            <i class=\"fas fa-angle-left\" aria-hidden=\"true\"></i>\n          </button>\n        </li>", depois: "(as 5 linhas 8–12 removidas inteiras; a linha 13, só com espaços, fica)" },
    medida: "Contar os button.br-button.circle com aria-label dentro de nav.br-pagination. Sem semente: 2 (\"Página anterior\" e \"Página seguinte\", 40×40, border-radius 50%). Semeada: 1 (\"Página seguinte\"); o identificador de página \"1\" continua lá.",
  },
  "T1-2": {
    ordem: [HDR, 7],
    localizador: "pnip-header button#avatar-dropdown-trigger span.br-avatar > span (o primeiro filho, com a letra)",
    estado: "inicial",
    mudanca: { arquivo: HDR, linha: 7, antes: "<span class=\"content bg-orange-vivid-30 text-pure-0\">", depois: "<span class=\"bg-orange-vivid-30 text-pure-0\">" },
    medida: "Medir o span filho de span.br-avatar. Sem semente: classe com content, 40×40 px, display flex, border-radius 50%, background-color rgb(255, 140, 0), font-size 24.192px. Semeada: sem a classe content, cerca de 18×40 px, display block, border-radius 0px; background-color e font-size iguais aos de antes.",
  },
  "T1-5": {
    ordem: [FILT, 28],
    localizador: "pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction > button (botão × da etiqueta do filtro escolhido, light DOM)",
    estado: "contexto novo do navegador (sem sessionStorage herdado); clicar na etiqueta de filtro \"Status\" e escolher a 1ª opção (\"Aguardando análise\"): aparece a etiqueta azul do filtro escolhido com o botão ×",
    mudanca: { arquivo: FILT, linha: 28, antes: "<button class=\"br-button inverted circle\" type=\"button\" (click)=\"removeSelected(i)\">", depois: "<button class=\"inverted circle\" type=\"button\" (click)=\"removeSelected(i)\">" },
    medida: "No estado indicado, medir o botão ×. Sem semente: classe br-button inverted circle, 28×28 px, border-radius 50%, background-color rgb(19, 81, 180), sem borda. Semeada: classe inverted circle, cerca de 40×30 px, border-radius 0px, background-color rgb(240, 240, 240), border-top-style outset 2px. Clicar no × continua removendo o filtro (a etiqueta some).",
  },
  "T2-3": {
    ordem: [P, 6],
    localizador: "pnip-mpa-processos h2 (\"Processos\")",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 6, antes: "<h2 class=\"text-bold text-blue-vivid-60 mt-0 mb-4 pb-0\">Processos</h2>", depois: "<h2 class=\"text-bold text-blue-vivid-60 mt-0 mb-4 pb-0\" style=\"font-size: 2rem\">Processos</h2>" },
    medida: "font-size computado do h2. Sem semente: 34.832px (altura 40 px). Semeada: 32px (altura ≈ 36,8 px); peso 700 e cor rgb(0, 94, 162) iguais.",
  },
  "T2-4": {
    ordem: [P, 29],
    localizador: "pnip-mpa-processos span.br-tag.interaction (\"Meus processos\") > span.text-truncate",
    estado: "inicial (aba Tramitando)",
    mudanca: { arquivo: P, linha: 29, antes: "<span class=\"text-truncate\">Meus processos</span>", depois: "<span class=\"text-truncate\" style=\"font-size: 15px\">Meus processos</span>" },
    medida: "font-size computado do span.text-truncate de \"Meus processos\". Sem semente: 16.8px. Semeada: 15px. As etiquetas de filtro vizinhas seguem 16.8px nos dois builds.",
  },
  "T2-5": {
    ordem: [P, 2],
    localizador: "pnip-mpa-processos br-divider (logo abaixo do breadcrumb) → shadow: span.br-divider",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 2, antes: "<br-divider size=\"medium\" class=\"mt-0 mb-0\"></br-divider>", depois: "<br-divider size=\"medium\" class=\"mt-0 mb-0\" style=\"--border-color: #d6d6d6\"></br-divider>" },
    medida: "border-top-color do span.br-divider no shadow root de br-divider. Sem semente: rgb(204, 204, 204) (2px solid). Semeada: rgb(214, 214, 214) (2px solid).",
  },
  "T2-6": {
    ordem: [HDRS, 95],
    localizador: "pnip-header br-header → shadow: header.br-header",
    estado: "inicial",
    mudanca: { arquivo: HDRS, linha: "fim do arquivo (depois da l. 94)", antes: "(nada)", depois: "br-header {\n   --surface-shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.3);\n}" },
    medida: "box-shadow de header.br-header no shadow root de br-header. Sem semente: rgba(0, 0, 0, 0.16) 0px 1px 6px 0px. Semeada: rgba(0, 0, 0, 0.3) 0px 2px 12px 0px (também depois de rolar a página).",
  },
  "T3-3": {
    ordem: [P, 1],
    localizador: "pnip-mpa-processos br-breadcrumb → shadow: li.crumb.home button i.fa-home",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 1, antes: "<br-breadcrumb [links]=\"breadcrumb\"></br-breadcrumb>", depois: "<br-breadcrumb [links]=\"breadcrumb\" style=\"--interactive: var(--blue-vivid-60)\"></br-breadcrumb>" },
    medida: "color do i.fa-home no shadow root de br-breadcrumb. Sem semente: rgb(19, 81, 180). Semeada: rgb(0, 94, 162). O texto do crumb \"Processos\" segue rgb(51, 51, 51) nos dois.",
  },
  "T3-4": {
    ordem: [P, 13],
    localizador: "pnip-mpa-processos br-tab → shadow: li.tab-item > button (rótulos das 3 abas)",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 13, antes: "<br-tab (onTabItemClick)=\"onTabItemClick($event)\">", depois: "<br-tab style=\"--font-size-scale-up-02: var(--font-size-scale-up-01)\" (onTabItemClick)=\"onTabItemClick($event)\">" },
    medida: "font-size computado dos 3 botões .tab-item no shadow root de br-tab. Sem semente: 20.16px (peso 500). Semeada: 16.8px (peso 500).",
  },
  "T3-5": {
    ordem: [SEL, 10],
    localizador: "govbr-custom-pagination br-select-pnip div.br-select > div.br-list (lista do campo \"Exibir\")",
    estado: "rolar até a paginação e clicar no campo \"Exibir\" para abrir a lista",
    mudanca: { arquivo: SEL, linha: 10, antes: "<div class=\"br-list\" tabindex=\"0\" (keydown.enter)=\"onEnterKeyPress($event)\">", depois: "<div class=\"br-list\" tabindex=\"0\" style=\"box-shadow: var(--surface-shadow-lg)\" (keydown.enter)=\"onEnterKeyPress($event)\">" },
    medida: "Com a lista aberta, box-shadow de div.br-list. Sem semente: rgba(0, 0, 0, 0.16) 0px 3px 6px 0px. Semeada: rgba(0, 0, 0, 0.16) 0px 6px 6px 0px (o estilo continua no elemento depois de abrir).",
  },
  "T3-6": {
    ordem: [BUSCA, 18],
    localizador: "pnip-search-table-utils div.br-input > button.br-button[aria-label=\"Buscar\"]",
    estado: "inicial (campo de busca vazio)",
    mudanca: { arquivo: BUSCA, linha: "18 (só o 1º botão, o de aria-label \"Buscar\"; o do l. 27 fica igual)", antes: "                  class=\"br-button\" ", depois: "                  class=\"br-button\" \n                  style=\"--button-size: var(--button-medium)\" " },
    medida: "width/height do botão Buscar. Sem semente: 32×32 px (campo com 32 px de altura). Semeada: 40×40 px, ultrapassando o campo em cima e embaixo; border-radius 50% nos dois.",
  },
  "T4-1": {
    ordem: [SCSS, 4],
    localizador: "pnip-mpa-processos table tbody br-button[disabled] (os 8 \"Desassociar processo…\" desabilitados) → host e shadow: button",
    estado: "inicial (aba Tramitando)",
    mudanca: { arquivo: SCSS, linha: "fim do arquivo (depois da l. 3)", antes: "(nada)", depois: "br-button[disabled] {\n   --disabled: 1;\n}" },
    medida: "opacity do host e do button interno dos br-button[disabled] de título \"Desassociar…\". Sem semente: 0.45 (cursor not-allowed); o habilitado da 1ª linha 1. Semeada: 1 nos desabilitados (cursor continua not-allowed). O \"Limpar filtros\" desabilitado segue 0.45 nos dois.",
  },
  "T4-2": {
    ordem: [P, 15],
    localizador: "pnip-mpa-processos br-tab → shadow: li.tab-item (qual tem .active) e o conteúdo exibido",
    estado: "inicial",
    mudanca: { arquivo: P, linha: 15, antes: "<br-tab-item id=\"TRAMITANDO\" title=\"Tramitando\" is-active=\"true\"/>", depois: "<br-tab-item id=\"TRAMITANDO\" title=\"Tramitando\"/>" },
    medida: "Qual li.tab-item tem .active e o conteúdo da tabela. Sem semente: \"Tramitando\" ativo (cor rgb(12, 50, 111)), etiqueta \"Meus processos\" presente, colunas Analista/Téc. Adm. Semeada: \"Aguardando análise\" ativo, com o mesmo conteúdo de antes (etiqueta \"Meus processos\", colunas Analista/Téc. Adm., mesmos status). Clicar em \"Concluídos\" continua trocando o conteúdo.",
  },
  "T4-3": {
    ordem: [P, 165],
    localizador: "pnip-mpa-processos br-button[label=\"Voltar\"] → shadow: button",
    estado: "rolar até o fim da página e passar o mouse sobre \"Voltar\"",
    mudanca: { arquivo: P, linha: 165, antes: "<br-button label=\"Voltar\" type=\"secondary\" (click)=\"voltar()\"/>", depois: "<br-button label=\"Voltar\" type=\"secondary\" style=\"--hover: 0\" (click)=\"voltar()\"/>" },
    medida: "background-image do button interno com o mouse em cima. Sem semente: linear-gradient(rgba(19, 81, 180, 0.16), rgba(19, 81, 180, 0.16)). Semeada: linear-gradient(rgba(19, 81, 180, 0), rgba(19, 81, 180, 0)). Em repouso, none nos dois; o Exportar, com o mouse em cima, segue 0.16 nos dois.",
  },
  "T4-4": {
    ordem: [BUSCA, 9],
    localizador: "pnip-search-table-utils br-input#search → shadow: input",
    estado: "clicar no campo de busca (foco)",
    mudanca: { arquivo: BUSCA, linha: 9, antes: "               <br-input ", depois: "               <br-input \n                  style=\"--focus: var(--blue-warm-vivid-70)\"" },
    medida: "Com o campo focado, border-top-color e box-shadow do input interno. Sem semente: rgb(194, 133, 12) e rgb(194, 133, 12) 0px 0px 0px 2px. Semeada: rgb(19, 81, 180) e rgb(19, 81, 180) 0px 0px 0px 2px.",
  },
  "T4-5": {
    ordem: [SEL, 18],
    localizador: "govbr-custom-pagination br-select-pnip div.br-list > div.br-item (item \"25\" da lista do \"Exibir\")",
    estado: "rolar até a paginação, abrir o \"Exibir\" e passar o mouse sobre o item \"25\"",
    mudanca: { arquivo: SEL, linha: 18, antes: "<div class=\"br-item\" [class.selected]=\"optionSelected &&", depois: "<div class=\"br-item\" style=\"--hover: 0\" [class.selected]=\"optionSelected &&" },
    medida: "background-image do div.br-item \"25\" com o mouse em cima. Sem semente: linear-gradient(rgba(51, 51, 51, 0.16), rgba(51, 51, 51, 0.16)). Semeada: linear-gradient(rgba(51, 51, 51, 0), rgba(51, 51, 51, 0)).",
  },
};

// ---------- composição ----------
const sob = filtros.candidatos.filter(l => l.sobrevive);
const curtos = TIPOS.map(t => [t, sob.filter(l => l.tipo === t).length]).filter(([, n]) => n < 3);
if (curtos.length) throw new Error(`tipo(s) com menos de 3 sobreviventes: ${curtos.map(([t, n]) => `${t}=${n}`).join(", ")} — composição PARA (adendo 2 § 4 item 5)`);
const semeadas = [], reserva = [];
let nF = 0, nR = 0;
for (const t of TIPOS) {
  for (const [i, l] of sob.filter(x => x.tipo === t).sort((a, b) => a.ordem - b.ordem).entries()) {
    const c = cand.get(l.id);
    const base = {
      tipo: t, subtipo: l.subtipo, nivel: l.nivelSlug, nivelDoSeletor: l.nivelDoSeletor, nivelDoConferente: l.nivelDoConferente, nivelRegra: l.nivelRegra,
      exigeInteracao: l.exigeInteracao, candidato: l.id, ordemDoSeletor: l.ordem,
      rules: l.filtros.d.ids, semIdMapeado: l.filtros.d.semIdMapeado,
      ...(l.filtros.d.semIdMapeado ? { clausula: { arquivo: c.clausula.arquivo, trecho: c.clausula.trecho } } : {}),
      categories: l.filtros.e.categories, classe: l.filtros.e.classe, estado: c.estado,
    };
    if (i < 3) semeadas.push({ id: `F2-${String(++nF).padStart(2, "0")}`, ...base });
    else reserva.push({ id: `R-${String(++nR).padStart(2, "0")}`, posicaoNaReservaDoTipo: i - 2, ...base, ...(l.reservaColideComSemeado?.length ? { colideComSemeado: l.reservaColideComSemeado } : {}) });
  }
}
// recomposição fixa do § 5
const recomposicao = {};
for (const t of TIPOS) {
  const s = semeadas.filter(x => x.tipo === t), r = reserva.filter(x => x.tipo === t && !x.colideComSemeado);
  const porNivel = [...s].sort((a, b) => NIV.indexOf(a.nivel) - NIV.indexOf(b.nivel) || b.ordemDoSeletor - a.ordemDoSeletor);
  let troca = null;
  for (const x of porNivel) {
    const entra = r.find(y => NIV.indexOf(y.nivel) > NIV.indexOf(x.nivel));
    if (entra) { troca = { sai: x.id, nivelSai: x.nivel, entra: entra.id, nivelEntra: entra.nivel }; break; }
  }
  recomposicao[t] = troca ?? { possivel: false };
  if (troca) recomposicao[t].possivel = true;
}
const conta = arr => Object.fromEntries(NIV.map(n => [n, arr.filter(x => x.nivel === n).length]));
const composicao = {
  _meta: {
    regra: "adendo 2 § 4 item 5 (3 primeiros sobreviventes por tipo, na ordem do seletor; o resto é reserva do tipo, na mesma ordem); ids F2-01… na ordem T1, T2, T3, T4; nível oficial = o menor entre seletor e conferente (orquestrador)",
    filtros: { arquivo: "tela-f2/filtros.json", sha256: sha(filtrosBuf) },
    contagens: Object.fromEntries(TIPOS.map(t => {
      const s = semeadas.filter(x => x.tipo === t), r = reserva.filter(x => x.tipo === t);
      return [t, { semeadas: s.length, porNivel: conta(s), exigeInteracao: s.filter(x => x.exigeInteracao).length, comId: s.filter(x => !x.semIdMapeado).length, semIdMapeado: s.filter(x => x.semIdMapeado).length,
        reserva: r.length, reservaPorNivel: conta(r) }];
    })),
    total: { semeadas: semeadas.length, exigeInteracao: semeadas.filter(x => x.exigeInteracao).length, comId: semeadas.filter(x => !x.semIdMapeado).length, reserva: reserva.length },
    recomposicaoDoPortao: {
      regra: "adendo 2 § 5: em cada tipo sai o semeado de menor nível para o qual exista, na reserva do tipo, um sobrevivente de nível superior (empate: o último na ordem do seletor); entra a primeira reserva do tipo, na ordem do seletor, de nível superior ao do que sai; tipo sem troca fica; nenhuma troca em tipo nenhum → a F2 encerra depois da primeira falha",
      porTipo: recomposicao,
      algumaTrocaPossivel: Object.values(recomposicao).some(x => x.possivel),
      tiposComTroca: Object.values(recomposicao).filter(x => x.possivel).length,
    },
    reposicao: "semeada que não pega na construção: o construtor reporta o M-…; a substituição (próxima reserva do mesmo tipo, adendo da F § 4 item 5 lido por tipo) é decidida aqui, não pelo construtor",
  },
  semeadas, reserva,
};
writeFileSync(join(AQUI, "composicao.json"), JSON.stringify(composicao, null, 1) + "\n");

// ---------- estratos (formato da bancada; o sha256 da referência entra na fase 2) ----------
const estratos = {
  formato: "tela-f2-estratos-1.0.0",
  referencia: { arquivo: "ground-truth-processos-f2.json", versao: "1.0.0", sha256: "PENDENTE-fase-2" },
  tipos: TIPOS.map(t => ({ id: t, rotulo: ROTULO[t], ...(t === "T1" ? { subtipos: ["anatomia", "marcacao"] } : {}) })),
  specs: Object.fromEntries(semeadas.map(s => [s.id, { tipo: s.tipo, ...(s.tipo === "T1" ? { subtipo: s.subtipo } : {}), nivel: s.nivel, exigeInteracao: s.exigeInteracao }])),
};
writeFileSync(join(AQUI, "estratos-1.0.0.json"), JSON.stringify(estratos, null, 2) + "\n");

// ---------- lista de mudanças (neutra) ----------
const porOrdem = (a, b) => a.ordem[0].localeCompare(b.ordem[0]) || a.ordem[1] - b.ordem[1];
const entradaDe = id => { const m = M[id]; if (!m) throw new Error(`sem mudança para ${id}`); return m; };
const sM = semeadas.map(s => ({ s, m: entradaDe(s.candidato) })).sort((a, b) => porOrdem(a.m, b.m));
const mapaM = new Map(sM.map((x, i) => [x.s.id, `M-${String(i + 1).padStart(2, "0")}`]));
const lista = {
  _meta: {
    para: "agente de construção da tela F2",
    fonte: "worktree .tmp-eval/pnip-mock-f2 (ramo tela-f2 @ 3d02f68); caminhos relativos à raiz do worktree",
    rota: ROTA,
    baseDeComparacao: "build sem semente .tmp-eval/pnip-f2-sem-semente (lista 1b44c9cc…), não a pnip-d; Playwright headless, janela 1280×900, contexto novo por medida",
    regras: [
      "Aplicar só as mudanças listadas, no fonte; nada por folha de estilo ou script por cima do build.",
      "Todos os arquivos tocados estão em CRLF: manter CRLF; não rodar git checkout/stash/reset --hard/restore no worktree (construção da F, fase 0 § 3); não mexer em src/mock/manipuladores/.",
      "Cada M-… tem de passar na sua medida (sem semente × semeada; sem oráculo, sem axe, sem nenhum detector). Se não passar, NÃO substituir por conta própria: reportar o M-… e o que foi medido.",
      "Provar também as R-… listadas (todas): aplicar M + R num build de prova (fora do commit), medir cada R pela sua medida e conferir que as M continuam passando; o commit e o build final levam SÓ as M.",
      "A página semeada continua funcional: navegação entre abas, filtros, paginação e o botão Voltar respondem como no build sem semente.",
    ],
  },
  mudancas: sM.map(({ s, m }) => ({
    id: mapaM.get(s.id), localizador: m.localizador, estado: m.estado, mudanca: m.mudanca, medida: m.medida,
    provarTambem: reserva.filter(r => r.tipo === s.tipo).map(r => r.id),
  })),
  reservas: reserva.map(r => { const m = entradaDe(r.candidato); return { id: r.id, localizador: m.localizador, estado: m.estado, mudanca: m.mudanca, medida: m.medida }; }),
};
for (const x of [...lista.mudancas, ...lista.reservas]) {
  const t = JSON.stringify(x).toLowerCase();
  for (const proibido of ["defeito", "cláusula", "clausula", "nível", "nivel", "\"t1", "\"t2", "\"t3", "\"t4", ".md", "govbr-3.7.0"]) if (t.includes(proibido)) throw new Error(`${x.id}: termo proibido na lista de mudanças: ${proibido}`);
}
mkdirSync(SAIDA_CONSTRUCAO, { recursive: true });
writeFileSync(join(SAIDA_CONSTRUCAO, "mudancas.json"), JSON.stringify(lista, null, 1) + "\n");
const bloco = s => "```\n" + s + "\n```";
const md = [
  "# Tela F2 — lista de mudanças para a construção",
  "",
  `Fonte: ${lista._meta.fonte}. Rota: \`${ROTA}\`. Base de comparação: ${lista._meta.baseDeComparacao}.`,
  "",
  "## Regras",
  "",
  ...lista._meta.regras.map(r => `- ${r}`),
  "",
  "## Mudanças (vão no commit)",
  "",
  ...lista.mudancas.flatMap(x => [
    `### ${x.id}`, "",
    `- **Onde:** \`${x.mudanca.arquivo}\`, linha ${x.mudanca.linha}`,
    `- **Elemento:** ${x.localizador}`,
    `- **Estado em que aparece:** ${x.estado}`,
    "- **Antes:**", "", bloco(x.mudanca.antes), "",
    "- **Depois:**", "", bloco(x.mudanca.depois), "",
    `- **Medida (sem semente → semeada):** ${x.medida}`,
    `- **Provar também:** ${x.provarTambem.length ? x.provarTambem.join(", ") : "nada"}`, "",
  ]),
  "## Reservas (só no build de prova, fora do commit)",
  "",
  ...lista.reservas.flatMap(x => [
    `### ${x.id}`, "",
    `- **Onde:** \`${x.mudanca.arquivo}\`, linha ${x.mudanca.linha}`,
    `- **Elemento:** ${x.localizador}`,
    `- **Estado em que aparece:** ${x.estado}`,
    "- **Antes:**", "", bloco(x.mudanca.antes), "",
    "- **Depois:**", "", bloco(x.mudanca.depois), "",
    `- **Medida (sem semente → com a mudança):** ${x.medida}`, "",
  ]),
].join("\n");
writeFileSync(join(SAIDA_CONSTRUCAO, "mudancas.md"), md);
writeFileSync(join(AQUI, "mapa-mudancas.json"), JSON.stringify({ _meta: { nota: "id da lista de mudanças → spec semeada / reserva (só para a referência; não vai ao construtor)" }, M: Object.fromEntries([...mapaM].map(([f, m]) => [m, f])), R: Object.fromEntries(reserva.map(r => [r.id, r.candidato])) }, null, 1) + "\n");
console.log(JSON.stringify(composicao._meta.contagens));
console.log(JSON.stringify(composicao._meta.total), JSON.stringify(composicao._meta.recomposicaoDoPortao.porTipo));
