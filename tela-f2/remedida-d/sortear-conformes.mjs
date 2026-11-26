/**
 * Controles conformes da tela D (o mesmo procedimento da C: plano da C § 6; protocolo NAT-78 § 5.2:
 * denominador da taxa de falso alarme do agente). Sem modelo e sem detector.
 *
 * Regra (fixada ANTES do sorteio, a mesma da C): entram os pares (elemento × norma) medidos `conforme`
 * (decisoes.json) sobre normas que também têm unidade `viola` na tela ou sobre componentes do inventário;
 * se passarem de 12, sorteiam-se 12 com semente fixa gravada antes, preferindo um por tipo de componente
 * do DS. Exclusões declaradas pelo auditor ANTES do sorteio (e gravadas no arquivo):
 *  - fora o casco da aplicação (br-header, avatar, sign-in): é o mesmo das telas B e C, e o piso conta
 *    sem as unidades `exposto` (adendo § E) — controle no casco teria o mesmo problema;
 *  - fora linhas medidas sobre a página inteira (cores, fonte, lang, animações, ordem do DOM): o controle
 *    é (elemento × norma), e a página não é um elemento;
 *  - fora pares cuja medida exige leitura de significado (uso do Checkbox, texto do link, orientação
 *    além da presença do item atual);
 *  - fora pares cujo elemento é âncora de uma unidade ou objeto de uma escalada pendente: os botões de
 *    ícone das linhas (D-01, E-02, E-06), os números de processo (D-02), as etiquetas interativas (D-03),
 *    os checkboxes da tabela (D-04), o campo de pesquisa (D-05), os 8 status abaixo de 4,5:1 (D-06), a
 *    tabela (D-07), o th vazio (D-08), "Buscar" e os dois "Exibir lista" (D-09, E-03), o iframe (D-10,
 *    E-01), os dois seletores da paginação e a lista aberta (E-05), Página anterior/seguinte (E-02).
 *    Ficam os rádios e os itens da lista (elementos dentro dela, não o objeto da E-05), como na C.
 * Sorteio: camada 1 = um item por tipo de componente do DS (ordem fixa de TIPOS), escolhido pela
 * semente; camada 2 = o restante, embaralhado pela mesma semente, até 12. PRNG mulberry32 sobre os
 * 4 primeiros bytes do sha256 da SEMENTE.
 *
 * Uso: node tela-d/sortear-conformes.mjs  → tela-d/conformes.json (e imprime o sha256)
 */
import { writeFileSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const SEMENTE = "tela-d/conformes 2026-10-18 (gravada antes do sorteio)";
export const TETO = 12;
const TIPOS = ["breadcrumb", "tab", "button", "table", "divider", "radio", "item", "estrutura"];
const LISTA = "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip";

/** Pares elegíveis, na ordem do documento do primeiro elemento. `tipo` = componente do DS (ou estrutura). */
export const ELEGIVEIS = [
  { par: "breadcrumb-tab", tipo: "breadcrumb", state: "inicial", selector: "pnip-mpa-processos br-breadcrumb >>> a", count: 1, rules: ["govbr-3.7.0-accessibility-breadcrumb-992f162ca821"], medida: "link \"Home\" do <br-breadcrumb>: tabIndex 0, alcançado por Tab real." },
  { par: "breadcrumb-li", tipo: "breadcrumb", state: "inicial", selector: "pnip-mpa-processos br-breadcrumb >>> li", count: 2, rules: ["govbr-3.7.0-accessibility-global-cf61b3eb3c71", "emag:1.7"], medida: "cada item do breadcrumb (Home, Processos) é um <li> próprio." },
  { par: "breadcrumb-orientacao", tipo: "breadcrumb", state: "inicial", selector: "pnip-mpa-processos br-breadcrumb", count: 1, rules: ["govbr-3.7.0-accessibility-global-75c11ccac582", "emag:3.4"], medida: "breadcrumb hierárquico presente; último item = \"Processos\" (localização atual)." },
  { par: "titulo-contraste", tipo: "estrutura", state: "inicial", selector: "pnip-mpa-processos h2", count: 1, rules: ["govbr-3.7.0-accessibility-global-cb09bc0c77c0", "emag:4.1", "wcag:1.4.3"], medida: "h2 \"Processos\": #005ea2 sobre #fff = 6,72:1 (≥ 4,5:1; a norma tem a unidade D-06)." },
  { par: "botoes-rotulo", tipo: "button", state: "inicial", selector: "pnip-mpa-processos br-button[label]:not([disabled])", count: 2, rules: ["govbr-3.7.0-component-button-4d7b5f978df1"], medida: "\"Exportar\" e \"Voltar\": botões não circulares com o rótulo visível no próprio botão (a norma tem a unidade D-01)." },
  { par: "exportar-foco", tipo: "button", state: "inicial", selector: "pnip-mpa-processos br-button[label=Exportar] >>> button", count: 1, rules: ["govbr-3.7.0-accessibility-global-21fbcc2fe37b", "emag:4.4", "wcag:2.4.7"], medida: "com foco por Tab, o botão \"Exportar\" ganha outline dashed 4px rgb(194,133,12) (a norma tem a unidade D-10)." },
  { par: "abas-teclado", tipo: "tab", state: "inicial", selector: "pnip-mpa-processos br-tab >>> button", count: 3, rules: ["govbr-3.7.0-accessibility-tab-f1807d71dc5f"], medida: "as três abas são <button> tabIndex 0; Enter ≡ clique (3/3 nas três, teste de estados)." },
  { par: "th-contraste", tipo: "table", state: "inicial", selector: "pnip-mpa-processos table thead th.text-bold:not(:last-child)", count: 7, rules: ["govbr-3.7.0-accessibility-global-cb09bc0c77c0", "emag:4.1", "wcag:1.4.3"], medida: "os 7 títulos de coluna com texto: #005ea2 sobre #f0f0f0 ≥ 4,5:1 (a norma tem a unidade D-06)." },
  { par: "assinar-rotulo", tipo: "button", state: "inicial", selector: "pnip-mpa-processos table tbody br-button[title=Assinar]", count: 3, rules: ["govbr-3.7.0-component-button-4d7b5f978df1"], medida: "os 3 \"Assinar\" da coluna de ações: botão não circular com o texto \"Assinar\" visível (vizinho dos botões de ícone da D-01)." },
  { par: "status-contraste", tipo: "estrutura", state: "inicial", selector: "pnip-status-solicitacao-utils .bg-indigo-vivid-60 > div", count: 1, rules: ["govbr-3.7.0-accessibility-global-cb09bc0c77c0", "emag:4.1", "wcag:1.4.3"], medida: "status \"Em revisão analista\": branco sobre indigo-vivid-60 ≥ 4,5:1 (os outros 8 status são a unidade D-06)." },
  { par: "divisor", tipo: "divider", state: "inicial", selector: "pnip-mpa-processos > br-divider", count: 1, rules: ["govbr-3.7.0-accessibility-divider-30bbcbf3a17c"], medida: "<br-divider> abaixo do breadcrumb: fora do Tab (tabIndex < 0) e o span interno sem papel na árvore do Chromium." },
  { par: "radio-rotulo", tipo: "radio", state: "lista-exibir", selector: `${LISTA} .br-radio input[type=radio]`, count: 4, rules: ["govbr-3.7.0-accessibility-global-b95c42b61ed3", "emag:6.2", "wcag:1.3.1", "govbr-3.7.0-accessibility-global-b5fad7ce076d"], medida: "os 4 rádios da lista \"Exibir\" com <label for> associado (labels.length = 1; a norma tem as unidades D-04/D-05)." },
  { par: "item-superficie", tipo: "item", state: "lista-exibir", selector: `${LISTA} .br-item`, count: 4, rules: ["govbr-3.7.0-component-item-a6d29ea54434"], medida: "hover aplica gradiente em toda a superfície do br-item; clique perto da borda do item (fora do texto) escolhe a opção." },
  { par: "item-padding", tipo: "item", state: "lista-exibir", selector: `${LISTA} .br-item`, count: 4, rules: ["govbr-3.7.0-component-item-a10751502b98"], medida: "padding computado 16px (--spacing-scale-2x) nos quatro br-item." },
];

const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export function sortear() {
  const rnd = mulberry32(parseInt(createHash("sha256").update(SEMENTE).digest("hex").slice(0, 8), 16));
  const restantes = [...ELEGIVEIS];
  const escolhidos = [];
  if (restantes.length <= TETO) return { escolhidos: restantes, camada1: [], sorteio: false };
  const camada1 = [];
  for (const t of TIPOS) {
    const do_tipo = restantes.filter(e => e.tipo === t);
    if (!do_tipo.length) continue;
    const e = do_tipo[Math.floor(rnd() * do_tipo.length)];
    escolhidos.push(e); camada1.push(e.par); restantes.splice(restantes.indexOf(e), 1);
  }
  while (escolhidos.length < TETO && restantes.length) escolhidos.push(restantes.splice(Math.floor(rnd() * restantes.length), 1)[0]);
  escolhidos.sort((a, b) => ELEGIVEIS.indexOf(a) - ELEGIVEIS.indexOf(b));
  return { escolhidos, camada1, sorteio: true };
}

if (process.argv[1] && process.argv[1].endsWith("sortear-conformes.mjs")) {
  const { escolhidos, camada1, sorteio } = sortear();
  const itens = escolhidos.map((e, i) => ({ id: `K-${String(i + 1).padStart(2, "0")}`, par: e.par, tipo: e.tipo, state: e.state, selector: e.selector, count: e.count, rules: e.rules, medida: e.medida }));
  const saida = {
    tela: "processos (tela D)",
    regra: "o procedimento da C (plano-tela-c-2026-10-18.md § 6): (elemento × norma) medidos conforme, sobre norma com unidade viola na tela ou sobre componente do inventário; > 12 → 12 por sorteio com semente fixa, preferindo um por tipo de componente do DS. Exclusões declaradas antes do sorteio: casco da aplicação; linhas de página inteira; pares que exigem leitura de significado; elementos que são âncora de unidade ou objeto de escalada pendente (tela-d/sortear-conformes.mjs).",
    semente: SEMENTE, prng: "mulberry32(uint32 dos 8 primeiros hex do sha256 da semente)", teto: TETO,
    elegiveis: ELEGIVEIS.map(e => e.par), camada1_um_por_tipo: camada1, sorteio,
    nota: "Denominador da taxa de falso alarme do agente (protocolo NAT-78 § 5.2). Re-medidos em tela-d/conferir-auditoria.mjs (todos os elegíveis, não só os sorteados).",
    itens,
  };
  const caminho = join(AQUI, "conformes.json");
  writeFileSync(caminho, JSON.stringify(saida, null, 2) + "\n");
  console.log(`${ELEGIVEIS.length} elegíveis → ${itens.length} controles (${sorteio ? "sorteio" : "todos"}); camada 1: ${camada1.join(", ")}`);
  for (const k of itens) console.log(`  ${k.id} ${k.par} [${k.tipo}] ${k.state} ${k.selector} ×${k.count}`);
  console.log(`sha256 conformes.json ${createHash("sha256").update(readFileSync(caminho)).digest("hex")}`);
}
