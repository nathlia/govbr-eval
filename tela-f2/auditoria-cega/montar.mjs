/**
 * Tela F2 — pacote da auditoria cega das descrições das semeadas (adendo da F § 4 "Referência da F", mantido pelo adendo 2).
 * Molde: tela-f/auditoria-cega/montar.mjs.
 *
 * Mistura, numa lista única e neutra de AFIRMAÇÕES, as 12 specs semeadas (fato + norma + cláusula, como um juiz as lê)
 * com 12 iscas da MESMA forma sobre elementos e propriedades em que a página está conforme (verdadeiras na forma, FALSAS
 * na página). As iscas foram escritas e a falsidade delas medida na página semeada servida ANTES de qualquer resposta de
 * auditor; a medida fica só na chave. Nenhuma isca afirma condição já registrada como defeito natural ou fundo da rota
 * (peso/cor do h2 e do cabeçalho da tabela ficam de fora por isso).
 * Ordem: sha256(SEMENTE|id de origem) crescente; ids opacos A-01…A-24 nessa ordem. A chave (afirmação → spec ou isca,
 * com a medida) fica em tela-f2/auditoria-cega/chave.json, nunca em pedido/.
 * Uso: node tela-f2/auditoria-cega/montar.mjs <url que serve a ala pnip-f2 semeada>
 */
import { createHash } from "crypto";
import { createRequire } from "module";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "../..");
const CORPUS = join(RAIZ, "../../ds-rules/govbr-ds-3.7.0-corpus");
const SEMENTE = "tela-f2/auditoria-cega 2026-11-26 (gravada antes de montar o pedido)";
const FORA = "F:/Dev Nath/TCC/.tmp-eval/tela-f2-auditoria/pedido";
const sha = b => createHash("sha256").update(b).digest("hex");
const URLBASE = process.argv[2];
if (!URLBASE) throw new Error("diga a url que serve a ala pnip-f2 semeada");
const ref = JSON.parse(readFileSync(join(RAIZ, "ground-truth-processos-f2.json"), "utf8"));
const comp = JSON.parse(readFileSync(join(RAIZ, "tela-f2/composicao.json"), "utf8"));
const cand = new Map(JSON.parse(readFileSync(join(RAIZ, "tela-f2/selecao/candidatos.json"), "utf8")).map(c => [c.id, c]));
const CL = id => { const c = cand.get(id).clausula; return { arquivo: c.arquivo, trecho: c.trecho }; };
// cláusula literal tirada da linha do arquivo do corpus (garante que o trecho existe tal como citado)
const LINHA = (arquivo, n) => { const l = readFileSync(join(CORPUS, arquivo), "utf8").split(/\r?\n/)[n - 1]; if (!l || !l.trim()) throw new Error(`${arquivo}:${n} vazia`); return { arquivo, trecho: l.trim() }; };
for (const c of [...cand.values()]) { const t = readFileSync(join(CORPUS, c.clausula.arquivo), "utf8"); if (!t.includes(c.clausula.trecho)) throw new Error(`${c.id}: trecho citado não está literal no arquivo`); }

const COMO = {
  inicial: "carregar a rota e esperar a tabela de processos (estado inicial, aba \"Tramitando\")",
  "lista-exibir": "carregar a rota; clicar no campo do seletor \"Exibir\" da paginação (no rodapé da tabela) e esperar a lista de opções abrir",
  "filtro-escolhido": "carregar a rota; clicar na tag de filtro \"Aberto há\" (barra de filtros acima da tabela), esperar a lista de opções e escolher \"Últimos 60 dias\"",
  "lista-filtro": "carregar a rota; clicar na tag de filtro \"Aberto há\" (barra de filtros acima da tabela) e esperar a lista de opções abrir",
  "hover-voltar": "carregar a rota, rolar até o fim da página e passar o mouse sobre o botão \"Voltar\"",
  "hover-exportar": "carregar a rota e passar o mouse sobre o botão \"Exportar\" (topo da página, ao lado do título)",
};
// fato a verificar e norma, por spec semeada (a descrição da referência, separada em fato e norma)
const SEMEADAS = {
  "F2-01": ["Na paginação do rodapé da tabela só existe a seta \"Página seguinte\" (botão circular à direita do número da página); a seta \"Página anterior\" não existe, e o número \"1\" fica sem seta antes dele.", "A Pagination tem duas setas de navegação obrigatórias, um botão para a esquerda e outro para a direita."],
  "F2-02": ["O avatar de letra do cabeçalho (\"U\") é um retângulo laranja estreito (cerca de 18×40 px, cantos retos) com a letra encostada, e não um círculo; o conteúdo interno do avatar não tem a classe `content`.", "No Avatar, a classe `content` é propriedade obrigatória do conteúdo interno."],
  "F2-03": ["Na tag do filtro escolhido (acima da barra de filtros), o botão de remover (×) é um botão nativo do navegador — fundo cinza rgb(240, 240, 240), borda outset de 2 px, cantos retos, cerca de 40×30 px — sem a classe `br-button`, e não um botão circular azul.", "O Button exige a classe `br-button` no contêiner do componente."],
  "F2-04": ["O título da página, h2 \"Processos\", tem font-size 32px (2rem).", "O título H2 usa --font-size-scale-up-05 (34,832 px nesta janela)."],
  "F2-05": ["O rótulo da tag de interação \"Meus processos\" tem font-size 15px, menor que o das tags de filtro da mesma barra (16,8 px).", "O label da Tag de interação usa --font-size-scale-up-01."],
  "F2-06": ["A linha do Divider logo abaixo do breadcrumb tem cor rgb(214, 214, 214) (#d6d6d6).", "O Divider sobre fundo claro usa --gray-20 (#ccc)."],
  "F2-07": ["O ícone da casa do botão Home do breadcrumb está em rgb(0, 94, 162) (#005ea2), não no azul de interação #1351b4 usado pelo botão \"Exportar\".", "O ícone do Botão Terciário Home do Breadcrumb usa --blue-warm-vivid-70."],
  "F2-08": ["Os rótulos das três abas (\"Aguardando análise\", \"Tramitando\", \"Concluídos\") têm font-size 16,8 px.", "O rótulo da Tab usa --font-size-scale-up-02 (20,16 px) com --font-weight-medium."],
  "F2-09": ["A lista de opções do seletor \"Exibir\", aberta, tem sombra rgba(0, 0, 0, 0.16) 0 6px 6px (deslocamento vertical de 6 px).", "A superfície do Select usa --surface-shadow-md (0 3px 6px)."],
  "F2-10": ["Os botões \"Desassociar processo do analista responsável\" desabilitados, na coluna de ações, têm opacidade 1, iguais ao habilitado da 1ª linha; o botão \"Limpar filtros\", também desabilitado, tem opacidade 0,45.", "No estado desabilitado, fundo e primeiro plano têm opacidade --surface-opacity-md."],
  "F2-11": ["A aba \"Aguardando análise\" aparece como aba ativa, mas o conteúdo exibido é o da aba \"Tramitando\" (tag \"Meus processos\", colunas Analista e Téc. Adm.).", "O item ativo da Tab mostra ao usuário em qual aba ele se encontra."],
  "F2-12": ["Com o mouse em cima, o botão secundário \"Voltar\" não muda: o overlay de hover do botão interno tem opacidade 0, enquanto o \"Exportar\", do mesmo tipo, escurece.", "O estado hover sobre fundo claro aplica o overlay com --surface-opacity-xs."],
};
const ESTADO_AUD = { "F2-12": "hover-voltar" };
const LOC = Object.fromEntries(ref.violations.map(v => [v.id, v.anchor]));
const ESTADO = Object.fromEntries(ref.violations.map(v => [v.id, ESTADO_AUD[v.id] ?? v.state]));
const CANDIDATO = Object.fromEntries(comp.semeadas.map(s => [s.id, s.candidato]));

const EXIBIR = "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip";
const ISCAS = [
  { id: "I-01", estado: "inicial", localizador: "pnip-mpa-processos table tbody br-button[title=Assinar] >>> button", fato: "Os botões \"Assinar\" da coluna de ações não têm a classe `br-button`: aparecem como botões nativos do navegador (fundo cinza, borda outset, cantos retos).", norma: "O Button exige a classe `br-button` no contêiner do componente.", clausula: CL("T1-5"),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table tbody br-button[title=Assinar]")].map(h => { const b = h.shadowRoot.querySelector("button"); return b.className + "/" + getComputedStyle(b).borderTopLeftRadius; })`, falsaSe: v => v.length > 0 && v.every(x => /(^|\s)br-button(\s|\/)/.test(x) && !x.endsWith("/0px")) },
  { id: "I-02", estado: "inicial", localizador: "pnip-mpa-processos table thead", fato: "A tabela de processos não tem linha de cabeçalho: as colunas não têm títulos (nenhum th com texto).", norma: "O header da tabela é elemento obrigatório.", clausula: LINHA("componentes/table__designer.md", 81),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table thead th")].map(t => t.textContent.trim()).filter(Boolean)`, falsaSe: v => v.length >= 5 },
  { id: "I-03", estado: "inicial", localizador: "govbr-custom-pagination nav.br-pagination > ul", fato: "A paginação do rodapé não mostra nenhum identificador de página: entre as setas não aparece o número da página.", norma: "Os Identificadores de Páginas são elemento obrigatório da Pagination.", clausula: LINHA("componentes/pagination__designer.md", 34),
    medir: `[...document.querySelectorAll("govbr-custom-pagination nav.br-pagination a.page")].map(a => a.textContent.trim() + "/" + (a.getBoundingClientRect().width > 0))`, falsaSe: v => v.some(x => x === "1/true") },
  { id: "I-04", estado: "inicial", localizador: "pnip-mpa-processos table tbody td:nth-of-type(4)", fato: "O texto das células da coluna \"Tipo de Processo\" tem font-size 15px, valor fora da escala tipográfica (os degraus vizinhos são 14 px e 16,8 px).", norma: "O texto das linhas da Table usa --font-size-scale-base.", clausula: LINHA("componentes/table__designer.md", 409),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(4)")].map(td => getComputedStyle(td).fontSize)`, falsaSe: v => v.length > 0 && v.every(x => x !== "15px") },
  { id: "I-05", estado: "inicial", localizador: "pnip-multiple-search-table-utils div.row.align-items-center span.br-tag", fato: "Os rótulos das tags de filtro \"Tipo de processo\" e \"Status\" têm font-size 15px, menores que o da tag \"Aberto há\" (16,8 px).", norma: "O label da Tag de interação usa --font-size-scale-up-01.", clausula: CL("T2-4"),
    medir: `[...document.querySelectorAll("pnip-multiple-search-table-utils div.row.align-items-center span.br-tag")].map(s => s.textContent.trim() + "/" + getComputedStyle(s.querySelector("span") || s).fontSize)`, falsaSe: v => v.filter(x => /^(Tipo de processo|Status)\//.test(x)).length === 2 && v.filter(x => /^(Tipo de processo|Status)\//.test(x)).every(x => !x.endsWith("/15px")) },
  { id: "I-06", estado: "inicial", localizador: "pnip-mpa-processos table tbody td:nth-of-type(4)", fato: "O texto das células da coluna \"Tipo de Processo\" está em rgb(85, 85, 85) (#555555), cinza que não é cor da paleta.", norma: "Interfaces digitais do governo usam sempre as cores pré-definidas da paleta.", clausula: LINHA("fundamentos-visuais/cores.md", 59),
    medir: `[...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(4)")].map(td => getComputedStyle(td).color)`, falsaSe: v => v.length > 0 && v.every(x => x !== "rgb(85, 85, 85)") },
  { id: "I-07", estado: "inicial", localizador: "pnip-mpa-processos br-button[label=Exportar] >>> button", fato: "O rótulo e a borda do botão secundário \"Exportar\" estão em rgb(0, 94, 162) (#005ea2), não no azul de interação #1351b4.", norma: "O ícone e o rótulo do Button de ênfase secundária usam --blue-warm-vivid-70.", clausula: LINHA("componentes/button__designer.md", 314),
    medir: `(() => { const b = document.querySelector("pnip-mpa-processos br-button[label=Exportar]").shadowRoot.querySelector("button"); return getComputedStyle(b).color + "/" + getComputedStyle(b).borderTopColor; })()`, falsaSe: v => !v.includes("rgb(0, 94, 162)") },
  { id: "I-08", estado: "inicial", localizador: "pnip-mpa-processos br-button[label=Exportar] >>> button", fato: "O rótulo do botão \"Exportar\" tem font-size 14px, um degrau abaixo do previsto para o rótulo do Button.", norma: "O rótulo do Button padrão usa --font-size-scale-up-01 com --font-weight-semi-bold.", clausula: LINHA("componentes/button__designer.md", 299),
    medir: `getComputedStyle(document.querySelector("pnip-mpa-processos br-button[label=Exportar]").shadowRoot.querySelector("button")).fontSize`, falsaSe: v => v !== "14px" },
  { id: "I-09", estado: "lista-filtro", localizador: "pnip-multiple-search-table-utils div.br-select > div.br-list", fato: "A lista de opções do filtro \"Aberto há\", aberta, tem sombra rgba(0, 0, 0, 0.16) 0 6px 6px (deslocamento vertical de 6 px).", norma: "A superfície do Select usa --surface-shadow-md (0 3px 6px).", clausula: CL("T3-5"),
    passos: ["pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag"],
    medir: `getComputedStyle(document.querySelector("pnip-multiple-search-table-utils div.br-select > div.br-list")).boxShadow`, falsaSe: v => !/0px 6px 6px/.test(v) },
  { id: "I-10", estado: "inicial", localizador: "pnip-multiple-search-table-utils br-button[label=\"Limpar filtros\"]", fato: "O botão \"Limpar filtros\", desabilitado, tem opacidade 1: fica igual a um botão habilitado, e só o cursor indica o estado.", norma: "No estado desabilitado, fundo e primeiro plano têm opacidade --surface-opacity-md.", clausula: CL("T4-1"),
    medir: `getComputedStyle(document.querySelector("pnip-multiple-search-table-utils br-button[label='Limpar filtros']")).opacity`, falsaSe: v => v !== "1" },
  { id: "I-11", estado: "lista-exibir", localizador: `${EXIBIR} .br-list .br-item.selected`, fato: "Na lista do seletor \"Exibir\" aberta, nenhum item aparece selecionado: o \"10\", valor atual do campo, tem o mesmo fundo branco dos demais itens.", norma: "O fundo do estado Selecionado é --blue-warm-vivid-50.", clausula: LINHA("fundamentos-visuais/estados.md", 430),
    passos: [`${EXIBIR} input#total`],
    medir: `[...document.querySelectorAll("${EXIBIR} .br-list .br-item")].map(i => i.textContent.trim() + "/" + getComputedStyle(i).backgroundColor)`, falsaSe: v => v.some(x => x.startsWith("10/") && x !== "10/rgb(255, 255, 255)" && x !== "10/rgba(0, 0, 0, 0)") },
  { id: "I-12", estado: "hover-exportar", localizador: "pnip-mpa-processos br-button[label=Exportar] >>> button", fato: "Com o mouse em cima, o botão secundário \"Exportar\" não muda: o overlay de hover do botão interno tem opacidade 0.", norma: "O estado hover sobre fundo claro aplica o overlay com --surface-opacity-xs.", clausula: CL("T4-3"),
    hover: "pnip-mpa-processos br-button[label=Exportar]",
    medir: `getComputedStyle(document.querySelector("pnip-mpa-processos br-button[label=Exportar]").shadowRoot.querySelector("button")).backgroundImage`, falsaSe: v => /0\.16/.test(v) },
];

// medida das iscas na página servida (só a chave guarda)
const { chromium } = createRequire("F:/Dev Nath/TCC/govbr-eval/package.json")("playwright");
const browser = await chromium.launch();
const medidas = {};
for (const i of ISCAS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const pg = await ctx.newPage();
  await pg.goto(URLBASE + "/pnip-f2/portal-mpa/processos?mock-perfil=mpa", { waitUntil: "networkidle" });
  await pg.waitForSelector("main .br-table tbody tr"); await pg.waitForTimeout(500);
  for (const p of i.passos ?? []) { await pg.click(p); await pg.waitForTimeout(600); }
  if (i.hover) { await pg.hover(i.hover); await pg.waitForTimeout(400); }
  const v = await pg.evaluate(i.medir);
  medidas[i.id] = { valor: v, falsa: i.falsaSe(v) };
  await ctx.close();
}
await browser.close();
const naoFalsas = Object.entries(medidas).filter(([, m]) => !m.falsa).map(([k]) => k);
if (naoFalsas.length) throw new Error(`isca(s) não falsa(s) na página: ${naoFalsas.join(", ")} — ${JSON.stringify(naoFalsas.map(k => medidas[k]))}`);

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
  documentacao: { arquivo: `ds-rules/govbr-ds-3.7.0-corpus/${x.clausula.arquivo}`, trecho: x.clausula.trecho },
}));
const PAGINA = {
  arvore: "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f2/public/pnip-f2/",
  rota: "/pnip-f2/portal-mpa/processos?mock-perfil=mpa",
  endereco: `${URLBASE}/pnip-f2/portal-mpa/processos?mock-perfil=mpa`,
  comoServir: `já servida em ${URLBASE} (servidor estático deixado de pé); se não responder: node servir.mjs "F:/Dev Nath/TCC/.tmp-eval/corpus-tela-f2/public/pnip-f2" 3320 (este pacote) e abrir http://127.0.0.1:3320/pnip-f2/portal-mpa/processos?mock-perfil=mpa`,
  janela: "1280×900, Chromium, fuso America/Sao_Paulo; recarregar a página volta ao estado inicial",
};
const pedido = {
  titulo: "Auditoria de afirmações sobre uma página (processos do portal MPA, aplicação PNIP em modo mock)",
  pagina: PAGINA,
  tarefa: [
    "Para cada afirmação, alcance o estado indicado em `comoChegar`, ache o elemento (`elemento` é um seletor CSS; `>>>` entra no shadow root do hospedeiro) e verifique, medindo na página (estilo computado, caixas, texto, DOM), se a página mostra exatamente o que `aPaginaMostra` diz.",
    "Responda por afirmação, em `respostas.json` (formato em LEIA.md): `veredicto` = `verdadeira` (a página mostra isso), `falsa` (a página não mostra isso) ou `indecidivel` (a frase não permite decidir pela página: diga o que falta); `violaClausula` = `sim` | `nao` | `nao-se-aplica` (se verdadeira: o que a página mostra contraria o trecho citado da documentação?); `clausulaConfere` = `sim` | `nao` (o trecho existe literalmente no arquivo citado); `juizDecide` = `sim` | `nao` (um juiz que só tem a página e esta frase consegue decidir, sem ambiguidade de elemento, estado ou fato?); `medida` = o que você mediu; `nota` = o que mais importar.",
    "A `norma` e a `documentacao` dizem de onde vem a expectativa; confira o trecho no arquivo, mas o veredicto é sobre a página. Não use nenhuma ferramenta de validação automática (validadores de design system, axe ou similares) nem nenhum servidor MCP: só o navegador e a documentação.",
  ],
  afirmacoes,
};
const leia = `# Auditoria de afirmações — instruções (texto a entregar ao auditor)

Você é um auditor independente. Outro auditor faz o mesmo trabalho sem ver o seu. Seu número de auditor (1 ou 2) vem
no pedido que você recebeu.

## O que você pode usar

- Esta pasta (\`pedido.json\`, \`LEIA.md\`, \`servir.mjs\`), só leitura.
- A página servida em ${PAGINA.endereco} (já está no ar; se não responder, veja \`pedido.json › pagina.comoServir\`).
  Abra-a num navegador (por exemplo Playwright/Chromium headless, janela 1280×900, fuso America/Sao_Paulo) e meça.
- A documentação do DS 3.7.0 em \`F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus/\`, **sem** a subpasta \`normalizacao/\`.

## O que você não pode usar

Nenhum outro arquivo do disco (nenhum repositório, nenhuma pasta \`.tmp-eval\` fora desta e da sua pasta de saída,
nenhum código-fonte da aplicação), nenhuma ferramenta de validação automática (validadores de design system, axe ou
similares), nenhum servidor MCP, nenhuma busca na web. Não mude nada na página servida nem no servidor.

## Tarefa

Para cada uma das ${afirmacoes.length} afirmações de \`pedido.json\`: alcance o estado de \`comoChegar\`, ache o elemento
(\`elemento\` é um seletor CSS; \`>>>\` entra no shadow root do hospedeiro) e verifique, medindo, se a página mostra
exatamente o que \`aPaginaMostra\` diz. Confira também se o trecho de \`documentacao\` existe literalmente no arquivo.
Algumas afirmações são verdadeiras e outras falsas; não há cota.

## Saída

Crie \`F:/Dev Nath/TCC/.tmp-eval/tela-f2-auditoria/auditor-<n>/respostas.json\` (n = seu número), uma entrada por id:

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
for (const proibido of ["F2-", "isca", "semead", "defeito", "chave.json", "eval-tela-f2", "ground-truth"]) if (textoPedido.includes(proibido)) throw new Error(`termo que revela a chave no pedido: ${proibido}`);
rmSync(join(AQUI, "pedido"), { recursive: true, force: true });
mkdirSync(join(AQUI, "pedido"), { recursive: true });
writeFileSync(join(AQUI, "pedido/pedido.json"), JSON.stringify(pedido, null, 1) + "\n");
writeFileSync(join(AQUI, "pedido/LEIA.md"), leia);
writeFileSync(join(AQUI, "pedido/servir.mjs"), readFileSync(join(RAIZ, "tela-f2/servir.mjs"), "utf8").replace(/^\/\*\*[\s\S]*?\*\/\n/, "/** Serve a árvore da ala pnip-f2 (SPA). Uso: node servir.mjs <diretório> [porta] */\n"));
const pedidoSha = sha(readFileSync(join(AQUI, "pedido/pedido.json")));
const chave = {
  _meta: { semente: SEMENTE, ordem: "sha256(semente|origem) crescente", pedidoSha256: pedidoSha, data: "2026-11-26",
    regra: "iscas escritas e medidas falsas na página semeada antes de qualquer resposta; nada da chave vai para pedido/", pagina: URLBASE },
  afirmacoes: ordem.map((x, k) => ({ id: `A-${String(k + 1).padStart(2, "0")}`, origem: x.origem, tipo: x.origem.startsWith("F2-") ? "semeada" : "isca",
    ...(x.origem.startsWith("I-") ? { medidaNaPagina: medidas[x.origem].valor, esperado: "falsa" } : { esperado: "verdadeira" }) })),
};
writeFileSync(join(AQUI, "chave.json"), JSON.stringify(chave, null, 1) + "\n");
rmSync(FORA, { recursive: true, force: true });
mkdirSync(FORA, { recursive: true });
cpSync(join(AQUI, "pedido"), FORA, { recursive: true });
console.log(`afirmações ${afirmacoes.length} (semeadas ${chave.afirmacoes.filter(a => a.tipo === "semeada").length}, iscas ${chave.afirmacoes.filter(a => a.tipo === "isca").length}); iscas falsas ${Object.values(medidas).filter(m => m.falsa).length}/12; pedido sha256 ${pedidoSha}; cópia em ${FORA}`);
