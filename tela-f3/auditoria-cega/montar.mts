/**
 * Tela F3 — pacote da auditoria cega das descrições das semeadas (adendo 3 § 4: "auditoria cega por dois auditores e
 * iscas, como na F2"). Molde: tela-f2/auditoria-cega/montar.mjs.
 *
 * Mistura, numa lista única e neutra de AFIRMAÇÕES, as 12 specs semeadas (fato + norma + cláusula, como um juiz as lê)
 * com 12 iscas da MESMA forma sobre elementos e comportamentos em que a página está conforme (verdadeiras na forma,
 * FALSAS na página). Como a F3 tem casos de comportamento e de redação, 5 iscas também pedem interação (clicar, escolher,
 * passar o mouse) e 2 são gêmeas dos casos de comportamento (o seletor "Página", gêmeo do "Exibir"; a coluna "Tipo de
 * Processo", gêmea da "Solicitante"). As iscas foram escritas e a falsidade delas medida na página semeada servida ANTES
 * de qualquer resposta de auditor; a medida fica só na chave. Nenhuma isca afirma condição já registrada como defeito
 * natural ou fundo da rota.
 * Ordem: sha256(SEMENTE|id de origem) crescente; ids opacos A-01…A-24 nessa ordem. A chave (afirmação → spec ou isca,
 * com a medida) fica em tela-f3/auditoria-cega/chave.json, nunca em pedido/.
 * Uso: npx tsx tela-f3/auditoria-cega/montar.mts <url que serve a ala pnip-f3 semeada>
 */
import { createHash } from "crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium, type Page } from "playwright";
import { SEMEADAS as LISTA } from "../semeadas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "../..");
const CORPUS = "F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus";
const SEMENTE = "tela-f3/auditoria-cega 2026-11-27 (gravada antes de montar o pedido)";
const FORA = "F:/Dev Nath/TCC/.tmp-eval/tela-f3-auditoria/pedido";
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const URLBASE = process.argv[2];
if (!URLBASE) throw new Error("diga a url que serve a ala pnip-f3 semeada");
const ROTA = "/pnip-f3/portal-mpa/processos?mock-perfil=mpa";
const ref = JSON.parse(readFileSync(join(RAIZ, "ground-truth-processos-f3.json"), "utf8"));
const literal = (arquivo: string, trecho: string) => { const t = readFileSync(join(CORPUS, arquivo), "utf8"); if (!t.includes(trecho)) throw new Error(`${arquivo}: trecho não está literal: ${trecho}`); return { arquivo, trecho }; };
const LINHA = (arquivo: string, n: number) => { const l = readFileSync(join(CORPUS, arquivo), "utf8").split(/\r?\n/)[n - 1]; if (!l || !l.trim()) throw new Error(`${arquivo}:${n} vazia`); return { arquivo, trecho: l.trim() }; };

const COMO: Record<string, string> = {
  inicial: "carregar a rota e esperar a tabela de processos (estado da carga, sem clicar em nenhuma aba)",
  sempre: "carregar a rota e rolar até o rodapé da tabela; a afirmação vale para qualquer página da paginação (por exemplo, também na aba \"Concluídos\" depois de clicar em \"Página seguinte\")",
  "filtro-removido": "carregar a rota; clicar na tag de filtro \"Aberto há\" (barra de filtros acima da tabela), escolher \"Últimos 60 dias\" e, na tag \"Últimos 60 dias\" que aparece acima da barra, clicar no botão ×",
  "exibir-25": "carregar a rota; clicar na aba \"Concluídos\"; no rodapé da tabela, abrir o seletor \"Exibir\" e escolher 25",
  "assinatura-cancelada": "carregar a rota; marcar a caixa de seleção da 2ª linha da tabela (a primeira caixa da lista); clicar no botão que aparece abaixo da tabela e, no diálogo que abre, clicar em \"Cancelar\" (NUNCA em \"Assinar\")",
  "inicial-mouse": "carregar a rota e passar o mouse sobre a célula \"Solicitante\" da 1ª linha da tabela",
  "concluidos": "carregar a rota e clicar na aba \"Concluídos\"",
  "concluidos-seguinte": "carregar a rota; clicar na aba \"Concluídos\" e, no rodapé da tabela, clicar na seta \"Página seguinte\"",
  "concluidos-pagina": "carregar a rota; clicar na aba \"Concluídos\"; no rodapé da tabela, abrir o seletor \"Página\" e escolher 2",
  "meus-processos": "carregar a rota e clicar na tag \"Meus processos\" (barra acima da tabela), contando as linhas da tabela antes e depois",
  "filtro-escolhido": "carregar a rota; clicar na tag de filtro \"Aberto há\" (barra de filtros acima da tabela) e escolher \"Últimos 60 dias\"",
  "hover-exportar": "carregar a rota e passar o mouse sobre o botão \"Exportar\" (topo da página, ao lado do título)",
};
// fato a verificar e norma, por spec semeada (a descrição da referência, separada em fato e norma)
const SEMEADAS: Record<string, [string, string, string?]> = {
  "F3-01": ["Na paginação do rodapé da tabela só existe a seta \"Página seguinte\" (à direita dos números de página); a seta \"Página anterior\" não existe em nenhuma página — na carga o número \"1\" fica sem seta antes dele, e na página 2 da aba \"Concluídos\" também não há seta para voltar.", "A Pagination tem duas setas de navegação obrigatórias, um botão para a esquerda e outro para a direita."],
  "F3-02": ["O avatar de letra do cabeçalho (\"U\") é um retângulo laranja estreito (cerca de 18×40 px, cantos retos) com a letra encostada, e não um círculo; o conteúdo interno do avatar não tem a classe `content`.", "No Avatar, a classe `content` é propriedade obrigatória do conteúdo interno."],
  "F3-03": ["O botão × da tag \"Últimos 60 dias\" (filtro escolhido) parece o botão circular azul do DS e recebe foco, mas clicar nele (ou focá-lo e apertar Enter) não remove o filtro: depois do clique a tag continua visível e \"Limpar filtros\" continua habilitado.", "Uma Tag interativa dispensável apresenta o botão que permite ao usuário excluí-la."],
  "F3-04": ["As 9 células da coluna \"Solicitante\" cortam o texto em 150 px, numa linha só e sem reticências (overflow hidden, white-space nowrap, text-overflow clip), e nenhuma tem title nem tooltip que mostre o texto completo ao passar o mouse; o nome comprido da 1ª linha é o que mais perde.", "Na Table, o texto truncado exibe reticências no final e o texto completo é revelado por tooltip ao passar o mouse.", "inicial-mouse"],
  "F3-05": ["A tag \"Meus processos\" (ligada) tem cor de fundo rgb(23, 85, 169) (#1755a9), em estilo inline na própria tag, e não rgb(19, 81, 180) (#1351b4).", "A superfície da Tag de interação usa --blue-warm-vivid-70."],
  "F3-06": ["A seta \"Página seguinte\" da paginação tem border-radius 7px (estilo inline): é um quadrado de 40×40 com cantos arredondados, e não um botão circular; os botões \"Exibir lista\" dos seletores da mesma paginação são circulares (50%).", "As setas de navegação da Pagination são Botões Circulares."],
  "F3-07": ["No breadcrumb, o último item, \"Processos\" (a página atual), é um link (<a href=\"portal-mpa/processos\">, para a própria página), com cor de link e focável por Tab, e não texto comum.", "Cada item do breadcrumb é um link, exceto o último, que define a tela atual; a página atual não deve ser considerada um link."],
  "F3-08": ["Os rótulos das três abas (\"Aguardando análise\", \"Tramitando\", \"Concluídos\") têm font-size 16,8 px.", "O rótulo da Tab usa --font-size-scale-up-02 (20,16 px) com --font-weight-medium."],
  "F3-09": ["Depois de escolher 25 no seletor \"Exibir\", a tabela passa a mostrar as 14 linhas (\"1 – 14 de 14 itens\") e o 25 fica marcado na lista, mas o campo do seletor continua mostrando 10.", "O campo de entrada do Select exibe a opção selecionada."],
  "F3-10": ["Os botões \"Desassociar processo do analista responsável\" desabilitados, na coluna de ações, têm opacidade 1, iguais ao habilitado da 1ª linha; o botão \"Limpar filtros\", também desabilitado, tem opacidade 0,45.", "No estado desabilitado, fundo e primeiro plano têm opacidade --surface-opacity-md."],
  "F3-11": ["A aba \"Aguardando análise\" aparece como aba ativa, mas o conteúdo exibido é o da aba \"Tramitando\" (tag \"Meus processos\", colunas Analista e Téc. Adm.).", "O item ativo da Tab mostra ao usuário em qual aba ele se encontra."],
  "F3-12": ["O botão que aparece abaixo da tabela com uma linha marcada tem o rótulo \"Confirmar\", mas abre o diálogo \"Confirma a assinatura de 1 processo(s)?\" (com \"Assinar\" e \"Cancelar\"): o rótulo não diz que a ação é assinar.", "O rótulo do Button deve orientar de forma clara qual ação é esperada."],
};
const CLAUS = Object.fromEntries(LISTA.map((s: any) => [s.id, s.clausulas.map((c: any) => literal(c.arquivo, c.trecho))]));
const LOC = Object.fromEntries(ref.violations.map((v: any) => [v.id, v.anchor]));

type Isca = { id: string; estado: string; localizador: string; fato: string; norma: string; clausula: { arquivo: string; trecho: string }; medir: (p: Page) => Promise<unknown>; falsaSe: (v: any) => boolean };
const EXP = "pnip-mpa-processos br-button[label=Exportar]";
const concluidos = async (p: Page) => { await p.click('pnip-mpa-processos br-tab button[data-panel="HISTORICO"]'); await p.waitForSelector("pnip-mpa-processos .br-table tbody tr:nth-child(10)"); await p.waitForTimeout(500); };
const info = (p: Page) => p.evaluate(() => (document.querySelector("govbr-custom-pagination") as HTMLElement).innerText.replace(/\s+/g, " ").match(/\d+\s*–\s*\d+ de \d+ itens/)?.[0] ?? null);
const ISCAS: Isca[] = [
  { id: "I-01", estado: "inicial", localizador: "pnip-mpa-processos table tbody br-button[title=Assinar] >>> button", fato: "Os botões \"Assinar\" da coluna de ações não têm a classe `br-button`: aparecem como botões nativos do navegador (fundo cinza, borda outset, cantos retos).", norma: "O Button exige a classe `br-button` no contêiner do componente.", clausula: literal("componentes/button__desenvolvedor.md", "| class    | string | **br-button** | Container do componente. |"),
    medir: p => p.evaluate(() => [...document.querySelectorAll("pnip-mpa-processos table tbody br-button[title=Assinar]")].map(h => { const b = h.shadowRoot!.querySelector("button")!; return b.className + "/" + getComputedStyle(b).borderTopLeftRadius; })), falsaSe: v => v.length > 0 && v.every((x: string) => /(^|\s)br-button(\s|\/)/.test(x) && !x.endsWith("/0px")) },
  { id: "I-02", estado: "inicial", localizador: "pnip-mpa-processos table tbody td:nth-of-type(4)", fato: "As células da coluna \"Tipo de Processo\" cortam o texto numa linha só, sem reticências (overflow hidden, white-space nowrap), e os nomes compridos dos tipos ficam pela metade.", norma: "Na Table, o texto truncado exibe reticências no final e o texto completo é revelado por tooltip ao passar o mouse.", clausula: CLAUS["F3-04"][0],
    medir: p => p.evaluate(() => [...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(4)")].map((td: any) => { const c = getComputedStyle(td); return `${c.overflowX}/${c.whiteSpace}/${td.scrollWidth > td.clientWidth}`; })), falsaSe: v => v.length > 0 && v.every((x: string) => x === "visible/normal/false") },
  { id: "I-03", estado: "inicial", localizador: "govbr-custom-pagination nav.br-pagination > ul", fato: "A paginação do rodapé não mostra nenhum identificador de página: entre as setas não aparece o número da página.", norma: "Os Identificadores de Páginas são elemento obrigatório da Pagination.", clausula: LINHA("componentes/pagination__designer.md", 34),
    medir: p => p.evaluate(() => [...document.querySelectorAll("govbr-custom-pagination nav.br-pagination a.page, govbr-custom-pagination nav.br-pagination button.page")].map(a => a.textContent!.trim() + "/" + (a.getBoundingClientRect().width > 0))), falsaSe: v => v.some((x: string) => x === "1/true") },
  { id: "I-04", estado: "inicial", localizador: "pnip-mpa-processos table tbody td:nth-of-type(4)", fato: "O texto das células da coluna \"Tipo de Processo\" tem font-size 15px, valor fora da escala tipográfica (os degraus vizinhos são 14 px e 16,8 px).", norma: "O texto das linhas da Table usa --font-size-scale-base.", clausula: LINHA("componentes/table__designer.md", 409),
    medir: p => p.evaluate(() => [...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(4)")].map(td => getComputedStyle(td).fontSize)), falsaSe: v => v.length > 0 && v.every((x: string) => x !== "15px") },
  { id: "I-05", estado: "meus-processos", localizador: "pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction", fato: "Clicar na tag \"Meus processos\" não muda nada: a tag não desliga e a tabela continua com as mesmas 9 linhas.", norma: "Uma Tag de interação persistente pode ser selecionada e desselecionada.", clausula: literal("componentes/tag__designer.md", "Uma *tag* é considerada persistente quando permitir que possa ser selecionada/desselecionada."),
    medir: async p => { const a = await p.locator("pnip-mpa-processos table tbody tr").count(); await p.click("pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction"); await p.waitForTimeout(1500); return `${a}->${await p.locator("pnip-mpa-processos table tbody tr").count()}`; }, falsaSe: v => v === "9->10" },
  { id: "I-06", estado: "concluidos-seguinte", localizador: "govbr-custom-pagination nav.br-pagination button[aria-label=\"Página seguinte\"]", fato: "Na aba \"Concluídos\" (14 itens), clicar na seta \"Página seguinte\" não muda de página: a tabela continua em \"1 – 10 de 14 itens\".", norma: "A cada clique nas setas, o usuário navega página por página.", clausula: LINHA("componentes/pagination__designer.md", 49),
    medir: async p => { await concluidos(p); const a = await info(p); await p.click('govbr-custom-pagination nav.br-pagination button[aria-label="Página seguinte"]'); await p.waitForTimeout(1200); return `${a} -> ${await info(p)}`; }, falsaSe: v => /1 – 10 de 14 itens -> 11 – 14 de 14 itens/.test(v) },
  { id: "I-07", estado: "inicial", localizador: `${EXP} >>> button`, fato: "O rótulo e a borda do botão secundário \"Exportar\" estão em rgb(0, 94, 162) (#005ea2), não no azul de interação #1351b4.", norma: "O ícone e o rótulo do Button de ênfase secundária usam --blue-warm-vivid-70.", clausula: LINHA("componentes/button__designer.md", 314),
    medir: p => p.evaluate(s => { const b = document.querySelector(s)!.shadowRoot!.querySelector("button")!; return getComputedStyle(b).color + "/" + getComputedStyle(b).borderTopColor; }, EXP), falsaSe: v => !String(v).includes("rgb(0, 94, 162)") },
  { id: "I-08", estado: "inicial", localizador: `${EXP} >>> button`, fato: "O rótulo do botão \"Exportar\" tem font-size 14px, um degrau abaixo do previsto para o rótulo do Button.", norma: "O rótulo do Button padrão usa --font-size-scale-up-01 com --font-weight-semi-bold.", clausula: LINHA("componentes/button__designer.md", 299),
    medir: p => p.evaluate(s => getComputedStyle(document.querySelector(s)!.shadowRoot!.querySelector("button")!).fontSize, EXP), falsaSe: v => v !== "14px" },
  { id: "I-09", estado: "filtro-escolhido", localizador: "pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center)", fato: "Escolher \"Últimos 60 dias\" no filtro \"Aberto há\" não acrescenta nenhuma tag do filtro escolhido: acima da barra de filtros não aparece tag nova.", norma: "Uma Tag interativa dispensável pode ser adicionada por meio de componentes de entrada como input e select.", clausula: literal("componentes/tag__designer.md", "Uma *tag* interativa dispensável pode ser adicionada por meio de diversos componentes de entrada como: *input*, *select*, etc."),
    medir: async p => { await p.click("pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag"); await p.waitForSelector("pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item"); await p.click("pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item:nth-child(3) .br-radio"); await p.waitForTimeout(1200); return p.evaluate(() => [...document.querySelectorAll("pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction")].map(t => t.textContent!.trim())); }, falsaSe: v => v.includes("Últimos 60 dias") },
  { id: "I-10", estado: "inicial", localizador: "pnip-multiple-search-table-utils br-button[label=\"Limpar filtros\"]", fato: "O botão \"Limpar filtros\", desabilitado, tem opacidade 1: fica igual a um botão habilitado, e só o cursor indica o estado.", norma: "No estado desabilitado, fundo e primeiro plano têm opacidade --surface-opacity-md.", clausula: CLAUS["F3-10"][0],
    medir: p => p.evaluate(() => getComputedStyle(document.querySelector("pnip-multiple-search-table-utils br-button[label='Limpar filtros']")!).opacity), falsaSe: v => v !== "1" },
  { id: "I-11", estado: "concluidos-pagina", localizador: "govbr-custom-pagination br-select-pnip[label=\"Página\"] input#page", fato: "Na aba \"Concluídos\", depois de escolher 2 no seletor \"Página\", a tabela vai para a página 2 (\"11 – 14 de 14 itens\"), mas o campo do seletor continua mostrando 1.", norma: "O campo de entrada do Select exibe a opção selecionada.", clausula: CLAUS["F3-09"][0],
    medir: async p => { await concluidos(p); const S = 'govbr-custom-pagination br-select-pnip[label="Página"]'; await p.click(`${S} input#page`); await p.waitForSelector(`${S} .br-list .br-item`); await p.click(`${S} .br-list .br-item:nth-child(2) .br-radio`); await p.waitForTimeout(1200); return `${await info(p)} / campo ${await p.evaluate(s => (document.querySelector(s) as HTMLInputElement).value, `${S} input#page`)}`; }, falsaSe: v => /11 – 14 de 14 itens \/ campo 2$/.test(v) },
  { id: "I-12", estado: "hover-exportar", localizador: `${EXP} >>> button`, fato: "Com o mouse em cima, o botão secundário \"Exportar\" não muda: o overlay de hover do botão interno tem opacidade 0.", norma: "O estado hover sobre fundo claro aplica o overlay com --surface-opacity-xs.", clausula: LINHA("fundamentos-visuais/estados.md", 263),
    medir: async p => { await p.hover(EXP); await p.waitForTimeout(500); return p.evaluate(s => getComputedStyle(document.querySelector(s)!.shadowRoot!.querySelector("button")!).backgroundImage, EXP); }, falsaSe: v => /0\.16/.test(v) },
];

// medida das iscas na página servida (só a chave guarda)
const browser = await chromium.launch();
const medidas: Record<string, { valor: unknown; falsa: boolean }> = {};
for (const i of ISCAS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const pg = await ctx.newPage();
  await pg.goto(URLBASE + ROTA, { waitUntil: "networkidle" });
  await pg.waitForSelector("main .br-table tbody tr"); await pg.waitForTimeout(500);
  const v = await i.medir(pg);
  medidas[i.id] = { valor: v, falsa: i.falsaSe(v) };
  await ctx.close();
}
await browser.close();
const naoFalsas = Object.entries(medidas).filter(([, m]) => !m.falsa).map(([k]) => k);
if (naoFalsas.length) throw new Error(`isca(s) não falsa(s) na página: ${naoFalsas.join(", ")} — ${JSON.stringify(naoFalsas.map(k => medidas[k]))}`);

const itens = [
  ...ref._meta.estratos.semeado.specs.map((id: string) => { const v = ref.violations.find((x: any) => x.id === id); const est = SEMEADAS[id][2] ?? v.state;
    return { origem: id, estado: est, localizador: LOC[id], fato: SEMEADAS[id][0], norma: SEMEADAS[id][1], clausulas: CLAUS[id] }; }),
  ...ISCAS.map(i => ({ origem: i.id, estado: i.estado, localizador: i.localizador, fato: i.fato, norma: i.norma, clausulas: [i.clausula] })),
];
const ordem = [...itens].sort((a, b) => (sha(`${SEMENTE}|${a.origem}`) < sha(`${SEMENTE}|${b.origem}`) ? -1 : 1));
const afirmacoes = ordem.map((x, k) => ({
  id: `A-${String(k + 1).padStart(2, "0")}`,
  comoChegar: COMO[x.estado] ?? (() => { throw new Error(`sem receita para ${x.estado}`); })(),
  elemento: x.localizador,
  aPaginaMostra: x.fato,
  norma: x.norma,
  documentacao: x.clausulas.map(c => ({ arquivo: `ds-rules/govbr-ds-3.7.0-corpus/${c.arquivo}`, trecho: c.trecho })),
}));
const PAGINA = {
  arvore: "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f3/public/pnip-f3/",
  rota: ROTA,
  endereco: `${URLBASE}${ROTA}`,
  comoServir: `já servida em ${URLBASE} (servidor estático deixado de pé); se não responder: node servir.mjs "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f3/public/pnip-f3" <porta livre> (este pacote) e abrir http://127.0.0.1:<porta>${ROTA}`,
  janela: "1280×900, Chromium, fuso America/Sao_Paulo; recarregar a página volta ao estado inicial (a página guarda na sessão do navegador o filtro escolhido e o \"Meus processos\" desligado: use um contexto/aba nova por afirmação)",
};
const pedido = {
  titulo: "Auditoria de afirmações sobre uma página (processos do portal MPA, aplicação PNIP em modo mock)",
  pagina: PAGINA,
  tarefa: [
    "Para cada afirmação, alcance o estado indicado em `comoChegar`, ache o elemento (`elemento` é um seletor CSS; `>>>` entra no shadow root do hospedeiro) e verifique, medindo e usando a página (estilo computado, caixas, texto, DOM, cliques, teclado), se a página mostra exatamente o que `aPaginaMostra` diz.",
    "Responda por afirmação, em `respostas.json` (formato em LEIA.md): `veredicto` = `verdadeira` (a página mostra isso), `falsa` (a página não mostra isso) ou `indecidivel` (a frase não permite decidir pela página: diga o que falta); `violaClausula` = `sim` | `nao` | `nao-se-aplica` (se verdadeira: o que a página mostra contraria o trecho citado da documentação?); `clausulaConfere` = `sim` | `nao` (o trecho existe literalmente no arquivo citado); `juizDecide` = `sim` | `nao` (um juiz que só tem a página e esta frase consegue decidir, sem ambiguidade de elemento, estado ou fato?); `medida` = o que você mediu; `nota` = o que mais importar.",
    "A `norma` e a `documentacao` dizem de onde vem a expectativa; confira o trecho no arquivo, mas o veredicto é sobre a página. Não use nenhuma ferramenta de validação automática (validadores de design system, axe ou similares) nem nenhum servidor MCP: só o navegador e a documentação.",
    "Num diálogo de confirmação de assinatura, clique sempre em \"Cancelar\", nunca em \"Assinar\".",
  ],
  afirmacoes,
};
const leia = `# Auditoria de afirmações — instruções (texto a entregar ao auditor)

Você é um auditor independente. Outro auditor faz o mesmo trabalho sem ver o seu. Seu número de auditor (1 ou 2) vem
no pedido que você recebeu.

## O que você pode usar

- Esta pasta (\`pedido.json\`, \`LEIA.md\`, \`servir.mjs\`), só leitura.
- A página servida em ${PAGINA.endereco} (já está no ar; se não responder, veja \`pedido.json › pagina.comoServir\`).
  Abra-a num navegador (por exemplo Playwright/Chromium headless, janela 1280×900, fuso America/Sao_Paulo), meça e use
  a página (clicar, escolher, passar o mouse, teclado), com um contexto novo por afirmação.
- A documentação do DS 3.7.0 em \`F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus/\`, **sem** a subpasta \`normalizacao/\`.

## O que você não pode usar

Nenhum outro arquivo do disco (nenhum repositório, nenhuma pasta \`.tmp-eval\` fora desta e da sua pasta de saída,
nenhum código-fonte da aplicação), nenhuma ferramenta de validação automática (validadores de design system, axe ou
similares), nenhum servidor MCP, nenhuma busca na web. Não mude nada na página servida nem no servidor. Num diálogo
de confirmação de assinatura, clique sempre em "Cancelar", nunca em "Assinar".

## Tarefa

Para cada uma das ${afirmacoes.length} afirmações de \`pedido.json\`: alcance o estado de \`comoChegar\`, ache o elemento
(\`elemento\` é um seletor CSS; \`>>>\` entra no shadow root do hospedeiro) e verifique, medindo e usando a página, se a
página mostra exatamente o que \`aPaginaMostra\` diz. Confira também se cada trecho de \`documentacao\` existe literalmente
no arquivo. Algumas afirmações são verdadeiras e outras falsas; não há cota.

## Saída

Crie \`F:/Dev Nath/TCC/.tmp-eval/tela-f3-auditoria/auditor-<n>/respostas.json\` (n = seu número), uma entrada por id:

\`\`\`json
{
 "auditor": "<n>",
 "pedidoSha256": "<sha256 de pedido.json, que você calcula>",
 "respostas": [
  { "id": "A-01", "veredicto": "verdadeira | falsa | indecidivel", "violaClausula": "sim | nao | nao-se-aplica",
    "clausulaConfere": "sim | nao", "juizDecide": "sim | nao", "medida": "<o que você mediu>", "nota": "<opcional>" }
 ]
}
\`\`\`

\`violaClausula\`: só para afirmação \`verdadeira\` (a página mostra o fato; o fato contraria o trecho citado?); para
\`falsa\` ou \`indecidivel\`, \`nao-se-aplica\`. \`juizDecide\`: \`sim\` se um juiz com só a página e a frase decidiria sem
ambiguidade; \`nao\` se a frase deixa dúvida sobre elemento, estado ou fato (diga qual em \`nota\`). Pode guardar
medidas e capturas na sua pasta de saída. Não altere nada nesta pasta.
`;
const textoPedido = JSON.stringify(pedido) + leia;
for (const proibido of ["F3-", "F2-", "isca", "semead", "defeito", "chave.json", "eval-tela-f3", "ground-truth", "M-0", "M-1", "controle"]) if (textoPedido.includes(proibido)) throw new Error(`termo que revela a chave no pedido: ${proibido}`);
rmSync(join(AQUI, "pedido"), { recursive: true, force: true });
mkdirSync(join(AQUI, "pedido"), { recursive: true });
writeFileSync(join(AQUI, "pedido/pedido.json"), JSON.stringify(pedido, null, 1) + "\n");
writeFileSync(join(AQUI, "pedido/LEIA.md"), leia);
writeFileSync(join(AQUI, "pedido/servir.mjs"), readFileSync(join(RAIZ, "tela-f3/servir.mjs"), "utf8").replace(/^\/\*\*[\s\S]*?\*\/\n/, "/** Serve a árvore da ala pnip-f3 (SPA). Uso: node servir.mjs <diretório> [porta] */\n"));
const pedidoSha = sha(readFileSync(join(AQUI, "pedido/pedido.json")));
const chave = {
  _meta: { semente: SEMENTE, ordem: "sha256(semente|origem) crescente", pedidoSha256: pedidoSha, data: "2026-11-27",
    regra: "iscas escritas e medidas falsas na página semeada antes de qualquer resposta; nada da chave vai para pedido/", pagina: URLBASE,
    referenciaSha256: sha(readFileSync(join(RAIZ, "ground-truth-processos-f3.json"))) },
  afirmacoes: ordem.map((x, k) => ({ id: `A-${String(k + 1).padStart(2, "0")}`, origem: x.origem, tipo: x.origem.startsWith("F3-") ? "semeada" : "isca",
    ...(x.origem.startsWith("I-") ? { medidaNaPagina: medidas[x.origem].valor, esperado: "falsa" } : { esperado: "verdadeira" }) })),
};
writeFileSync(join(AQUI, "chave.json"), JSON.stringify(chave, null, 1) + "\n");
rmSync(FORA, { recursive: true, force: true });
mkdirSync(FORA, { recursive: true });
cpSync(join(AQUI, "pedido"), FORA, { recursive: true });
console.log(`afirmações ${afirmacoes.length} (semeadas ${chave.afirmacoes.filter(a => a.tipo === "semeada").length}, iscas ${chave.afirmacoes.filter(a => a.tipo === "isca").length}); iscas falsas ${Object.values(medidas).filter(m => m.falsa).length}/12; pedido sha256 ${pedidoSha}; cópia em ${FORA}`);
