/**
 * Tela F — pacote da auditoria cega das descrições (pendências do congelamento § 6).
 *
 * Mistura, numa lista única e neutra de AFIRMAÇÕES, as 12 specs semeadas (fato + norma + cláusula, como um juiz as lê)
 * com 12 iscas da MESMA forma sobre elementos em que a página está conforme (verdadeiras na forma, FALSAS na página):
 * tiradas dos controles conformes e do estado sem semente de outros elementos. As iscas foram escritas e a falsidade
 * delas medida na página ANTES de qualquer resposta de auditor; a medida fica só na chave.
 * Ordem: sha256(SEMENTE|id de origem) crescente; ids opacos A-01…A-24 nessa ordem. A chave (afirmação → spec ou isca,
 * com a medida) fica em tela-f/auditoria-cega/chave.json, nunca em pedido/.
 * Uso: node tela-f/auditoria-cega/montar.mjs <url que serve a ala pnip-f semeada>
 */
import { createHash } from "crypto";
import { createRequire } from "module";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "../..");
const SEMENTE = "tela-f/auditoria-cega 2026-11-26 (gravada antes de montar o pedido)";
const FORA = "F:/Dev Nath/TCC/.tmp-eval/tela-f-auditoria/pedido";
const sha = b => createHash("sha256").update(b).digest("hex");
const URLBASE = process.argv[2];
if (!URLBASE) throw new Error("diga a url que serve a ala pnip-f");
const ref = JSON.parse(readFileSync(join(RAIZ, "ground-truth-processos-f.json"), "utf8"));
const comp = JSON.parse(readFileSync(join(RAIZ, "tela-f/composicao.json"), "utf8"));
const cand = new Map(JSON.parse(readFileSync(join(RAIZ, "tela-f/selecao/candidatos.json"), "utf8")).map(c => [c.id, c]));
const CL = id => { const c = cand.get(id).clausula; return { arquivo: c.arquivo, trecho: c.trecho }; };

const COMO = {
  inicial: "carregar a rota e esperar a tabela de processos (estado inicial, aba \"Tramitando\")",
  "lista-exibir": "carregar a rota; clicar no campo do seletor \"Exibir\" da paginação (no rodapé da tabela) e esperar a lista de opções abrir",
  "filtro-escolhido": "carregar a rota; clicar na tag de filtro \"Aberto há\" (barra de filtros acima da tabela), esperar a lista de opções e escolher \"Últimos 60 dias\"",
  "lista-filtro": "carregar a rota; clicar na tag de filtro \"Aberto há\" (barra de filtros acima da tabela) e esperar a lista de opções abrir",
};
// fato a verificar e norma, por spec semeada (a descrição da referência, separada em fato e norma)
const SEMEADAS = {
  "F-01": ["Na coluna \"Solicitante\" da tabela, o texto de cada célula fica numa linha só e é cortado na largura da coluna (white-space: nowrap; overflow: hidden; text-overflow: clip): nomes longos aparecem cortados no meio da palavra, sem reticências, e a célula não tem title nem tooltip com o texto completo.", "O truncamento da Table pede reticências no fim do texto e o texto completo em tooltip."],
  "F-02": ["O botão da lupa (ação interna \"Buscar\") do campo de pesquisa da lista fica deslocado para baixo: o centro vertical dele está cerca de 26–28 px abaixo do centro do campo, e a lupa aparece fora da borda inferior do campo.", "A ação interna do Input fica centralizada verticalmente no campo (--spacing-vertical-center)."],
  "F-03": ["O botão \"Voltar\", no fim da página, se sobrepõe à caixa do seletor \"Página\" da paginação (o contêiner dele tem margin-top: -20px): as duas áreas de interação ficam encavaladas, sem espaço entre elas.", "A área de proteção do Button pede um espaçamento mínimo em relação aos componentes vizinhos."],
  "F-04": ["O botão secundário \"Voltar\" tem cantos de 4 px, enquanto o outro botão secundário da página, \"Exportar\", tem forma de pílula.", "A superfície do Button padrão tem arredondamento --surface-rounder-pill."],
  "F-05": ["A tag de interação \"Meus processos\" tem forma de pílula (border-radius ≥ 16 px), enquanto as tags de filtro da mesma barra têm cantos de 4 px.", "O arredondamento da superfície da Tag de interação é --surface-rounder-sm."],
  "F-06": ["No cabeçalho da tabela, a célula \"Téc. Adm.\" tem fundo branco (rgb(255, 255, 255)), enquanto as demais células do cabeçalho têm fundo rgb(240, 240, 240).", "O fundo do header da Table é --gray-5."],
  "F-07": ["O avatar de letra do cabeçalho (\"U\") é um quadrado de 40×40 com cantos de 4 px, não um círculo.", "A representação do usuário no Avatar fica contida numa superfície circular."],
  "F-08": ["O rótulo do botão \"Limpar filtros\" aparece em caixa alta, \"LIMPAR FILTROS\" (text-transform: uppercase no botão interno).", "O rótulo do Button padrão não tem transformação de caixa (text-transform: none)."],
  "F-09": ["As células do corpo da tabela têm padding-top e padding-bottom de 12 px; o cabeçalho tem 16 px.", "As linhas da Table têm espaçamento vertical de 8 px (densidade alta), 16 px (padrão) ou 24 px (baixa)."],
  "F-10": ["A lista de opções do filtro \"Aberto há\", aberta, flutua sobre a tabela sem sombra (box-shadow: none).", "Uma sombra deve dar contraste entre a lista flutuante do Select e o conteúdo da tela ao fundo."],
  "F-11": ["Na tag do filtro escolhido (acima da barra de filtros), o botão de fechar (×) fica à esquerda, antes do ícone e do rótulo, e não na extremidade direita da tag.", "Na Tag de interação, o ícone se alinha à esquerda e o botão terciário (fechar) à direita."],
  "F-12": ["Na lista do seletor \"Exibir\" aberta, o item selecionado (\"10\") tem fundo rgb(19, 81, 180) (#1351b4) com texto branco.", "O fundo do estado Selecionado é --blue-warm-vivid-50 (#2670e8)."],
};
const LOC = Object.fromEntries(ref.violations.map(v => [v.id, v.anchor]));
const ESTADO = Object.fromEntries(ref.violations.map(v => [v.id, v.state]));
const CANDIDATO = Object.fromEntries(comp.semeadas.map(s => [s.id, s.candidato]));

// iscas: mesma forma; falsas na página (medida abaixo); elementos que nenhuma spec semeada ancora
const ISCAS = [
  { id: "I-01", estado: "inicial", localizador: "pnip-mpa-processos br-button[label=Exportar] >>> button", fato: "O botão secundário \"Exportar\", no topo da página, tem cantos de 4 px.", norma: "A superfície do Button padrão tem arredondamento --surface-rounder-pill.", clausula: CL("F-medio-2"),
    medir: `(() => { const b = document.querySelector("pnip-mpa-processos br-button[label=Exportar]").shadowRoot.querySelector("button"); return getComputedStyle(b).borderTopLeftRadius; })()`, falsaSe: v => v !== "4px" },
  { id: "I-02", estado: "inicial", localizador: "pnip-mpa-processos br-button[label=Exportar] >>> button", fato: "O rótulo do botão \"Exportar\" aparece em caixa alta, \"EXPORTAR\" (text-transform: uppercase).", norma: "O rótulo do Button padrão não tem transformação de caixa (text-transform: none).", clausula: CL("F-dificil-3"),
    medir: `(() => { const b = document.querySelector("pnip-mpa-processos br-button[label=Exportar]").shadowRoot.querySelector("button"); return getComputedStyle(b).textTransform; })()`, falsaSe: v => v === "none" },
  { id: "I-03", estado: "inicial", localizador: "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:nth-child(2) > span.br-tag", fato: "A tag de filtro \"Tipo de processo\" tem forma de pílula (border-radius ≥ 16 px), não cantos de 4 px.", norma: "O arredondamento da superfície da Tag de interação é --surface-rounder-sm.", clausula: CL("F-medio-3"),
    medir: `getComputedStyle(document.querySelector("pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:nth-child(2) > span.br-tag")).borderTopLeftRadius`, falsaSe: v => v === "4px" },
  { id: "I-04", estado: "inicial", localizador: "pnip-mpa-processos table thead th:nth-of-type(8)", fato: "No cabeçalho da tabela, a célula \"Status\" tem fundo branco (rgb(255, 255, 255)), não o cinza rgb(240, 240, 240).", norma: "O fundo do header da Table é --gray-5.", clausula: CL("F-medio-4"),
    medir: `getComputedStyle(document.querySelector("pnip-mpa-processos table thead th:nth-of-type(8)")).backgroundColor`, falsaSe: v => v === "rgb(240, 240, 240)" },
  { id: "I-05", estado: "inicial", localizador: "pnip-mpa-processos table tbody td:nth-of-type(4)", fato: "Na coluna \"Tipo de Processo\" da tabela, o texto de cada célula fica numa linha só e é cortado na largura da coluna (white-space: nowrap; overflow: hidden): textos longos aparecem cortados, sem reticências.", norma: "O truncamento da Table pede reticências no fim do texto e o texto completo em tooltip.", clausula: CL("F-facil-2"),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(4)")].map(td => getComputedStyle(td).whiteSpace + "/" + getComputedStyle(td).overflowX + "/" + (td.scrollWidth > td.clientWidth))`, falsaSe: v => v.every(x => x === "normal/visible/false") },
  { id: "I-06", estado: "lista-exibir", localizador: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list", fato: "A lista de opções do seletor \"Exibir\", aberta, flutua sobre a página sem sombra (box-shadow: none).", norma: "Uma sombra deve dar contraste entre a lista flutuante do Select e o conteúdo da tela ao fundo.", clausula: CL("F-muito-dificil-1"),
    passos: ["govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total"],
    medir: `getComputedStyle(document.querySelector("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list")).boxShadow`, falsaSe: v => v !== "none" },
  { id: "I-07", estado: "inicial", localizador: "pnip-mpa-processos br-button[label=Exportar] >>> button", fato: "O botão \"Exportar\" tem margens internas laterais de 8 px (padding-left e padding-right), apertando o rótulo contra as bordas.", norma: "O botão cresce com o rótulo, mas as margens internas devem ser respeitadas.", clausula: CL("F-facil-4"),
    medir: `(() => { const b = document.querySelector("pnip-mpa-processos br-button[label=Exportar]").shadowRoot.querySelector("button"); return getComputedStyle(b).paddingLeft + "/" + getComputedStyle(b).paddingRight; })()`, falsaSe: v => v === "24px/24px" },
  { id: "I-08", estado: "inicial", localizador: "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:nth-child(3) > span.br-tag", fato: "O rótulo da tag de filtro \"Status\" quebra em duas linhas, e a tag fica mais alta que as vizinhas (mais de 32 px).", norma: "A Tag tem altura fixa e não admite mais de uma linha de texto.", clausula: CL("F-facil-1"),
    medir: `(() => { const t = document.querySelector("pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:nth-child(3) > span.br-tag"); return { texto: t.textContent.trim(), altura: Math.round(t.getBoundingClientRect().height * 10) / 10 }; })()`, falsaSe: v => v.texto === "Status" && v.altura <= 32.5 },
  { id: "I-09", estado: "inicial", localizador: "pnip-mpa-processos table tbody br-button[title=Assinar] >>> button", fato: "Os botões \"Assinar\" da coluna de ações têm cantos de 4 px, não forma de pílula.", norma: "A superfície do Button padrão tem arredondamento --surface-rounder-pill.", clausula: CL("F-medio-2"),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table tbody br-button[title=Assinar]")].map(h => getComputedStyle(h.shadowRoot.querySelector("button")).borderTopLeftRadius)`, falsaSe: v => v.length > 0 && v.every(x => x !== "4px") },
  { id: "I-10", estado: "inicial", localizador: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total", fato: "O campo do seletor \"Exibir\" da paginação tem borda cinza visível (rgb(136, 136, 136)), enquanto o do seletor \"Página\" não tem contorno.", norma: "Nos módulos da Pagination com escolha, o input do select fica em densidade alta, sem contorno.", clausula: CL("F-medio-5"),
    medir: `getComputedStyle(document.querySelector("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total")).borderTopColor`, falsaSe: v => v !== "rgb(136, 136, 136)" },
  { id: "I-11", estado: "inicial", localizador: "govbr-custom-pagination div.pagination-information", fato: "O texto \"1–9 de 9 itens\" da paginação está em azul rgb(19, 81, 180) (#1351b4), enquanto os rótulos \"Exibir\" e \"Página\" estão em rgb(51, 51, 51).", norma: "O texto dos módulos da Pagination tem cor --color-secondary-08.", clausula: CL("F-medio-6"),
    medir: `getComputedStyle(document.querySelector("govbr-custom-pagination div.pagination-information")).color`, falsaSe: v => v !== "rgb(19, 81, 180)" },
  { id: "I-12", estado: "inicial", localizador: "pnip-mpa-processos table tbody td:nth-of-type(3) a", fato: "Os números de processo da coluna \"Nº Processo\" estão em rgb(0, 94, 162) (#005ea2), não no azul de interação.", norma: "O primeiro plano de um elemento interativo sobre fundo claro é --blue-warm-vivid-70.", clausula: CL("F-dificil-5"),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(3) a")].map(a => getComputedStyle(a).color)`, falsaSe: v => v.length > 0 && v.every(x => x !== "rgb(0, 94, 162)") },
];

// medida das iscas na página servida (só a chave guarda)
const { chromium } = createRequire("F:/Dev Nath/TCC/govbr-eval/package.json")("playwright");
const browser = await chromium.launch();
const medidas = {};
for (const i of ISCAS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const pg = await ctx.newPage();
  await pg.goto(URLBASE + "/pnip-f/portal-mpa/processos?mock-perfil=mpa", { waitUntil: "networkidle" });
  await pg.waitForSelector("main .br-table tbody tr"); await pg.waitForTimeout(500);
  for (const p of i.passos ?? []) { await pg.click(p); await pg.waitForTimeout(600); }
  const v = await pg.evaluate(i.medir);
  medidas[i.id] = { valor: v, falsa: i.falsaSe(v) };
  await ctx.close();
}
await browser.close();
const naoFalsas = Object.entries(medidas).filter(([, m]) => !m.falsa).map(([k]) => k);
if (naoFalsas.length) throw new Error(`isca(s) não falsa(s) na página: ${naoFalsas.join(", ")} — trocar antes de montar`);

const itens = [
  ...ref._meta.estratos.semeado.specs.map(id => ({ origem: id, estado: ESTADO[id], localizador: LOC[id], fato: SEMEADAS[id][0], norma: SEMEADAS[id][1],
    clausula: ref._meta.semIdMapeado?.specs?.[id] ?? CL(CANDIDATO[id]) })),
  ...ISCAS.map(i => ({ origem: i.id, estado: i.estado, localizador: i.localizador, fato: i.fato, norma: i.norma, clausula: i.clausula })),
];
const ordem = [...itens].sort((a, b) => (sha(`${SEMENTE}|${a.origem}`) < sha(`${SEMENTE}|${b.origem}`) ? -1 : 1));
const afirmacoes = ordem.map((x, k) => ({
  id: `A-${String(k + 1).padStart(2, "0")}`,
  comoChegar: COMO[x.estado],
  elemento: x.localizador,
  aPaginaMostra: x.fato,
  norma: x.norma,
  documentacao: x.clausula ? { arquivo: `ds-rules/govbr-ds-3.7.0-corpus/${x.clausula.arquivo}`, trecho: x.clausula.trecho } : null,
}));
const pedido = {
  titulo: "Auditoria de afirmações sobre uma página (processos do portal MPA, aplicação PNIP em modo mock)",
  pagina: {
    arvore: "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f/public/pnip-f/",
    rota: "/pnip-f/portal-mpa/processos?mock-perfil=mpa",
    comoServir: "node servir.mjs \"F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f/public/pnip-f\" 3230  (este pacote; depois abrir http://127.0.0.1:3230/pnip-f/portal-mpa/processos?mock-perfil=mpa)",
    janela: "1280×900, Chromium, fuso America/Sao_Paulo; recarregar a página volta ao estado inicial",
  },
  tarefa: [
    "Para cada afirmação, alcance o estado indicado em `comoChegar`, ache o elemento (`elemento` é um seletor CSS; `>>>` entra no shadow root do hospedeiro) e verifique, medindo na página (estilo computado, caixas, texto), se a página mostra exatamente o que `aPaginaMostra` diz.",
    "Responda por afirmação: `veredito` = `verdadeira` (a página mostra isso), `falsa` (a página não mostra isso) ou `indecidivel` (a frase não permite decidir pela página: diga o que falta); `medida` = o que você mediu; `clareza` = se a frase identifica sem ambiguidade o elemento, o estado e o fato (`clara` | `ambigua`, com o porquê).",
    "A `norma` e a `documentacao` dizem de onde vem a expectativa; confira se o trecho citado existe no arquivo, mas o veredito é sobre a página. Não use nenhuma ferramenta de validação automática (validadores de design system, axe ou similares): só o navegador e a documentação.",
    "Escreva as respostas em `respostas.json` ao lado deste arquivo, uma entrada por id, sem alterar nada no pedido.",
  ],
  afirmacoes,
};
rmSync(join(AQUI, "pedido"), { recursive: true, force: true });
mkdirSync(join(AQUI, "pedido"), { recursive: true });
writeFileSync(join(AQUI, "pedido/pedido.json"), JSON.stringify(pedido, null, 1) + "\n");
writeFileSync(join(AQUI, "pedido/servir.mjs"), readFileSync(join(RAIZ, "tela-f/servir.mjs"), "utf8").replace(/^\/\*\*[\s\S]*?\*\/\n/, "/** Serve a árvore da ala pnip-f (SPA). Uso: node servir.mjs <diretório> [porta] */\n").replace(/ \/\/ Ex\.:.*$/m, ""));
const pedidoSha = sha(readFileSync(join(AQUI, "pedido/pedido.json")));
const chave = {
  _meta: { semente: SEMENTE, ordem: "sha256(semente|origem) crescente", pedidoSha256: pedidoSha, data: "2026-11-26",
    regra: "iscas escritas e medidas falsas na página antes de qualquer resposta; nada da chave vai para pedido/", pagina: URLBASE },
  afirmacoes: ordem.map((x, k) => ({ id: `A-${String(k + 1).padStart(2, "0")}`, origem: x.origem, tipo: x.origem.startsWith("F-") ? "semeada" : "isca",
    ...(x.origem.startsWith("I-") ? { medidaNaPagina: medidas[x.origem].valor, esperado: "falsa" } : { esperado: "verdadeira" }) })),
};
writeFileSync(join(AQUI, "chave.json"), JSON.stringify(chave, null, 1) + "\n");
rmSync(FORA, { recursive: true, force: true });
mkdirSync(FORA, { recursive: true });
cpSync(join(AQUI, "pedido"), FORA, { recursive: true });
console.log(`afirmações ${afirmacoes.length} (semeadas ${chave.afirmacoes.filter(a => a.tipo === "semeada").length}, iscas ${chave.afirmacoes.filter(a => a.tipo === "isca").length}); iscas falsas ${Object.values(medidas).filter(m => m.falsa).length}/12; pedido sha256 ${pedidoSha.slice(0, 12)}; cópia em ${FORA}`);
