/**
 * Tela F — acrescenta ao arquivo de critérios os itens das 13 specs que não tinham (passada 1.4.8: um critério para
 * CADA spec da referência). Só deriva do que a referência congelada já registra para elas (descrição, estado, âncora);
 * nenhuma medida nova, nenhum juízo novo. Como não têm predicado, entram no formato completo de `semPredicado`
 * (observável / estado / critério), o mesmo da spec sem predicado que o arquivo já tinha. Tiram-se das descrições só as
 * remissões a arquivos e registros de outras telas; o fato fica como está.
 * A referência não muda. Uso: node tela-f/criterios-naturais.mjs
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const ARQ = join(AQUI, "criterios-de-julgamento-sem-predicado.json");
const refBuf = readFileSync(join(RAIZ, "ground-truth-processos-f.json"));
const ref = JSON.parse(refBuf);
const sha = b => createHash("sha256").update(b).digest("hex");
const crit = JSON.parse(readFileSync(ARQ, "utf8"));
if (crit._meta.referencia.sha256 !== sha(refBuf)) throw new Error("critérios de outra referência");

const COMO = {
  inicial: "na carga da rota (aba \"Tramitando\", lista paginada); presente também na parada seguinte do mesmo segmento",
  sempre: "em todas as paradas (desde a carga da rota)",
};
// elemento, o que se olha (fato da descrição, sem remissões) e o que a alegação tem de afirmar — reescritos da descrição
const N = {
  "D-01": ["botões de ação das linhas da tabela \"Ver processo\" (9) e \"Desassociar processo do analista responsável\" (9; 8 desabilitados)",
    "<br-button> sem `label` e sem `circle`: o <button> interno é br-button middle de 72×40 px com raio de pílula (não circular), sem nenhum texto visível — só o ícone projetado (eye, user-times) — e o nome acessível vem só do `title`. A norma exige rótulo visível em todo Button não circular. Na mesma coluna o \"Assinar\" tem texto visível.",
    "esses botões de ação das linhas não têm rótulo visível (só ícone) sem serem botões circulares"],
  "D-02": ["números de processo da coluna \"Nº Processo\"",
    "<a role=\"button\" style=\"cursor:pointer\"> sem href nem tabindex: não são focáveis (fora do Tab real), mas o clique navega (nas linhas 2, 3, 4, 6, 7 e 9 abre a sub-rota …/documentos do processo, que o \"Ver processo\" da mesma linha não abre; nas linhas 1, 5 e 8 o destino recarrega em /login); o controle é o mesmo e igualmente inalcançável por teclado.",
    "os números de processo são controles clicáveis que não se alcançam nem se acionam por teclado (sem href nem tabindex)"],
  "D-03": ["etiquetas interativas \"Meus processos\" e os seis filtros (\"Aberto há\", \"Tipo de processo\", \"Status\", \"Espécie alvo\", \"Método de pesca\", \"Petrecho\")",
    "<span class=\"br-tag interaction\"> com cursor:pointer, sem role, sem tabindex (tabIndex -1), papel generic e nome \"\" na árvore. O clique liga/desliga \"Meus processos\" (a lista passa de 9 para 10 linhas) ou abre a lista de opções do filtro; nenhuma é alcançada por Tab nem acionável por teclado, e nenhuma expõe estado (aria-pressed/aria-expanded). Os exemplos oficiais da Tag 3.7.0 só usam button e input+label como elementos interativos.",
    "essas etiquetas clicáveis não são alcançáveis/acionáveis por teclado, ou não têm papel, nome ou estado acessível"],
  "D-04": ["caixas de seleção da tabela (uma no cabeçalho, uma em cada uma das 6 linhas selecionáveis)",
    "<input type=\"checkbox\"> sem <label>, aria-label, aria-labelledby ou title; labels.length = 0 e nome \"\" na árvore. Estão no Tab (operáveis), sem nome.",
    "essas caixas de seleção não têm rótulo/nome acessível"],
  "D-05": ["campo de pesquisa da lista",
    "o <br-input> recebeu `placeholder=\"Pesquise aqui ...\"` mas não `label`; o input interno (id search) tem labels.length = 0, sem aria-label nem aria-labelledby; o nome acessível é o placeholder. Os seletores \"Exibir\" e \"Página\" da mesma tela têm rótulo associado.",
    "o campo de pesquisa não tem rótulo associado (o placeholder é o único nome)"],
  "D-06": ["etiquetas de status da coluna \"Status\"",
    "texto branco (text-secondary-01, 14 px/500) sobre bg-orange-vivid-40 #e66f0e = 3,16:1 (5 linhas), bg-indigo-vivid-40 #8289ff = 3,01:1 (1) e bg-secondary-06 #888888 = 3,54:1 (2) — 8 de 9 abaixo de 4,5:1. O status \"Em revisão analista\" sobre indigo-vivid-60 passa (6,49:1).",
    "o texto dessas etiquetas de status tem contraste insuficiente (abaixo de 4,5:1)"],
  "D-07": ["tabela de processos",
    "a tabela não tem <caption> nem aria-label/aria-labelledby (nome \"\" na árvore); o h2 \"Processos\" fica fora do contêiner da tabela, sem associação. A norma pede caption que identifique a tabela (os exemplos oficiais da Table 3.7.0 trazem caption).",
    "a tabela não tem legenda (caption) nem nome acessível que a identifique"],
  "D-08": ["cabeçalho da coluna de ações (Ver processo / Desassociar / Assinar)",
    "<th scope=\"col\"> vazio, columnheader sem nome na árvore — as células de ação ficam sem cabeçalho identificável.",
    "o cabeçalho da coluna de ações está vazio / sem nome"],
  "D-10": ["<iframe> vazio no fim do componente",
    "sem src, documento about:blank sem conteúdo, 1160×500 px, sem title, name nem aria-label (papel Iframe com nome \"\" na árvore): é ponto de Tab depois do \"Voltar\" e, focado, nada muda na tela (outline none, sem sombra, :focus-visible falso). Depois dele o Tab real alterna iframe ↔ body; Shift+Tab sai para o \"Voltar\".",
    "o iframe vazio recebe foco por Tab sem nenhuma indicação visível de foco, ou é um iframe sem título/nome"],
  "D-11": ["a página inteira (ausência de salto para o conteúdo)",
    "nenhum salto para o conteúdo: 0 âncoras \"#…\" e 0 .br-skiplink em todas as paradas; o primeiro ponto de Tab é o botão Menu do cabeçalho.",
    "a página não tem link de salto para o conteúdo principal (skip link)"],
  "D-12": ["a página inteira (títulos)",
    "um só título visível na página, <h2> \"Processos\"; nenhum <h1> (light DOM e shadow roots), em todas as paradas. Ausência global, ancorada na raiz.",
    "a página não tem h1 / a hierarquia de títulos começa no h2"],
  "D-13": ["<title> do documento",
    "<title>PNIP</title> em todas as paradas: nomeia só o sistema, não o conteúdo principal (\"Processos\").",
    "o título do documento não descreve a página (só o nome do sistema)"],
  "D-14": ["inicial do avatar no cabeçalho (\"U\")",
    "texto branco sobre #ff8c00 = 2,33:1 (24,2 px/700).",
    "a letra do avatar tem contraste insuficiente com o fundo"],
};
const nat = ref._meta.estratos.natural.specs;
for (const id of nat) {
  if (crit.semPredicado[id] || crit.comPredicado[id]) throw new Error(`${id} já tem critério`);
  const v = ref.violations.find(x => x.id === id);
  const [elemento, oQueSeOlha, afirma] = N[id];
  crit.semPredicado[id] = {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o fato é o da descrição da spec; nenhuma espécie implementada o mede inteiro.",
    observavel: { situacao: "fixado", elemento, localizador: `${v.anchor} (scope ${v.scope}, expectedCount ${v.expectedCount})`, oQueSeOlha },
    estado: { situacao: "fixado", declarado: v.state, comoSeAlcanca: COMO[v.state] },
    criterio: { situacao: "fixado", acerto: `A alegação afirma, sobre ${elemento}, que ${afirma}, num estado em que a spec vale.`,
      naoConta: ["citar a norma da spec sem mostrar o fato neste elemento e estado (C-2)", "afirmar outro defeito do mesmo elemento (C-6)"] },
  };
}
// a classe das 12 que já tinham fica como estava; "classe" não vai ao juiz
for (const id of Object.keys(crit.semPredicado)) if (!nat.includes(id)) crit.semPredicado[id].classe = "conforme a referência";
crit.contagens = { semPredicado: Object.keys(crit.semPredicado), comPredicado: Object.keys(crit.comPredicado).filter(k => k !== "nota").length, total: Object.keys(crit.semPredicado).length + Object.keys(crit.comPredicado).filter(k => k !== "nota").length };
crit._meta.adendo = "2026-11-26, depois do congelamento e antes de qualquer execução: a passada de julgamento 1.4.8 exige critério para toda spec da referência; acrescentados os itens que faltavam, derivados só da descrição, do estado e da âncora registrados na referência congelada (sem medida nem juízo novo). A referência não mudou.";
crit._meta.status = "Fixado antes de qualquer execução de agente na tela F, com a referência congelada 1.0.0; um critério para cada uma das 25 specs.";
writeFileSync(ARQ, JSON.stringify(crit, null, 1) + "\n");
console.log("itens", crit.contagens.total, "sha256", sha(readFileSync(ARQ)));
