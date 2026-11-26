/**
 * Tela F2 — critérios de julgamento para TODAS as specs da referência (passada 1.4.8: um critério por spec, senão para).
 * Molde: tela-f/criterios-de-julgamento-sem-predicado.json (mesmo formato, mesmos critérios comuns C-1…C-6) e
 * tela-f/criterios-naturais.mjs (as 13 naturais: mesmos textos da F, que são os da D; a D-14 com a âncora nova).
 * Specs sem predicado (a F2-01 e as 13 naturais): registro completo `semPredicado` (observável / estado / critério).
 * Specs com predicado (11 semeadas): uma linha de observável, estado e critério em `comPredicado`, porque o predicado
 * sustenta a spec mas não credita alegação. Nenhuma medida nova; tudo vem da referência (descrição, estado, âncora).
 * Uso: node tela-f2/criterios.mjs → tela-f2/criterios-de-julgamento.json (cita o sha256 da referência atual)
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const sha = b => createHash("sha256").update(b).digest("hex");
const refBuf = readFileSync(join(RAIZ, "ground-truth-processos-f2.json")), ref = JSON.parse(refBuf);
const critF = JSON.parse(readFileSync(join(RAIZ, "tela-f/criterios-de-julgamento-sem-predicado.json"), "utf8"));
const v = id => ref.violations.find(x => x.id === id);

const COMO = {
  inicial: "na carga da rota (aba \"Tramitando\", lista paginada); presente também na parada seguinte do mesmo segmento",
  sempre: "em todas as paradas (desde a carga da rota)",
};
// naturais: os textos da F (tela-f/criterios-naturais.mjs), que são os da D
const N = {
  "D-01": ["botões de ação das linhas da tabela \"Ver processo\" (9) e \"Desassociar processo do analista responsável\" (9; 8 desabilitados)", "<br-button> sem `label` e sem `circle`: o <button> interno é br-button middle de 72×40 px com raio de pílula (não circular), sem nenhum texto visível — só o ícone projetado (eye, user-times) — e o nome acessível vem só do `title`. A norma exige rótulo visível em todo Button não circular. Na mesma coluna o \"Assinar\" tem texto visível.", "esses botões de ação das linhas não têm rótulo visível (só ícone) sem serem botões circulares"],
  "D-02": ["números de processo da coluna \"Nº Processo\"", "<a role=\"button\" style=\"cursor:pointer\"> sem href nem tabindex: não são focáveis (fora do Tab real), mas o clique navega (nas linhas 2, 3, 4, 6, 7 e 9 abre a sub-rota …/documentos do processo, que o \"Ver processo\" da mesma linha não abre; nas linhas 1, 5 e 8 o destino recarrega em /login); o controle é o mesmo e igualmente inalcançável por teclado.", "os números de processo são controles clicáveis que não se alcançam nem se acionam por teclado (sem href nem tabindex)"],
  "D-03": ["etiquetas interativas \"Meus processos\" e os seis filtros (\"Aberto há\", \"Tipo de processo\", \"Status\", \"Espécie alvo\", \"Método de pesca\", \"Petrecho\")", "<span class=\"br-tag interaction\"> com cursor:pointer, sem role, sem tabindex (tabIndex -1), papel generic e nome \"\" na árvore. O clique liga/desliga \"Meus processos\" (a lista passa de 9 para 10 linhas) ou abre a lista de opções do filtro; nenhuma é alcançada por Tab nem acionável por teclado, e nenhuma expõe estado (aria-pressed/aria-expanded). Os exemplos oficiais da Tag 3.7.0 só usam button e input+label como elementos interativos.", "essas etiquetas clicáveis não são alcançáveis/acionáveis por teclado, ou não têm papel, nome ou estado acessível"],
  "D-04": ["caixas de seleção da tabela (uma no cabeçalho, uma em cada uma das 6 linhas selecionáveis)", "<input type=\"checkbox\"> sem <label>, aria-label, aria-labelledby ou title; labels.length = 0 e nome \"\" na árvore. Estão no Tab (operáveis), sem nome.", "essas caixas de seleção não têm rótulo/nome acessível"],
  "D-05": ["campo de pesquisa da lista", "o <br-input> recebeu `placeholder=\"Pesquise aqui ...\"` mas não `label`; o input interno (id search) tem labels.length = 0, sem aria-label nem aria-labelledby; o nome acessível é o placeholder. Os seletores \"Exibir\" e \"Página\" da mesma tela têm rótulo associado.", "o campo de pesquisa não tem rótulo associado (o placeholder é o único nome)"],
  "D-06": ["etiquetas de status da coluna \"Status\"", "texto branco (text-secondary-01, 14 px/500) sobre bg-orange-vivid-40 #e66f0e = 3,16:1 (5 linhas), bg-indigo-vivid-40 #8289ff = 3,01:1 (1) e bg-secondary-06 #888888 = 3,54:1 (2) — 8 de 9 abaixo de 4,5:1. O status \"Em revisão analista\" sobre indigo-vivid-60 passa (6,49:1).", "o texto dessas etiquetas de status tem contraste insuficiente (abaixo de 4,5:1)"],
  "D-07": ["tabela de processos", "a tabela não tem <caption> nem aria-label/aria-labelledby (nome \"\" na árvore); o h2 \"Processos\" fica fora do contêiner da tabela, sem associação. A norma pede caption que identifique a tabela (os exemplos oficiais da Table 3.7.0 trazem caption).", "a tabela não tem legenda (caption) nem nome acessível que a identifique"],
  "D-08": ["cabeçalho da coluna de ações (Ver processo / Desassociar / Assinar)", "<th scope=\"col\"> vazio, columnheader sem nome na árvore — as células de ação ficam sem cabeçalho identificável.", "o cabeçalho da coluna de ações está vazio / sem nome"],
  "D-10": ["<iframe> vazio no fim do componente", "sem src, documento about:blank sem conteúdo, 1160×500 px, sem title, name nem aria-label (papel Iframe com nome \"\" na árvore): é ponto de Tab depois do \"Voltar\" e, focado, nada muda na tela (outline none, sem sombra, :focus-visible falso). Depois dele o Tab real alterna iframe ↔ body; Shift+Tab sai para o \"Voltar\".", "o iframe vazio recebe foco por Tab sem nenhuma indicação visível de foco, ou é um iframe sem título/nome"],
  "D-11": ["a página inteira (ausência de salto para o conteúdo)", "nenhum salto para o conteúdo: 0 âncoras \"#…\" e 0 .br-skiplink em todas as paradas; o primeiro ponto de Tab é o botão Menu do cabeçalho.", "a página não tem link de salto para o conteúdo principal (skip link)"],
  "D-12": ["a página inteira (títulos)", "um só título visível na página, <h2> \"Processos\"; nenhum <h1> (light DOM e shadow roots), em todas as paradas. Ausência global, ancorada na raiz.", "a página não tem h1 / a hierarquia de títulos começa no h2"],
  "D-13": ["<title> do documento", "<title>PNIP</title> em todas as paradas: nomeia só o sistema, não o conteúdo principal (\"Processos\").", "o título do documento não descreve a página (só o nome do sistema)"],
  "D-14": ["inicial do avatar no cabeçalho (\"U\")", "texto branco sobre #ff8c00 = 2,33:1 (24,2 px/700).", "a letra do avatar tem contraste insuficiente com o fundo"],
};
// conferência: os textos das naturais são os mesmos da F
for (const [id, [el, oq]] of Object.entries(N)) { const f = critF.semPredicado[id]; if (!f || f.observavel.elemento !== el || f.observavel.oQueSeOlha !== oq) throw new Error(`${id}: texto da natural diverge do da F`); }

const semPredicado = {
  "F2-01": {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o observável é a ausência de um elemento (a seta \"Página anterior\" da paginação); nenhuma espécie implementada mede ausência de filho.",
    observavel: { situacao: "fixado", elemento: "a paginação no rodapé da tabela (setas de navegação e número da página)",
      localizador: `${v("F2-01").anchor} (scope unico, expectedCount 1)`,
      oQueSeOlha: "quantas setas de navegação a paginação tem: só existe a seta \"Página seguinte\" (botão circular à direita do número \"1\"); não há a seta \"Página anterior\" à esquerda. A lista da paginação tem 2 itens (a página e a seta seguinte)." },
    estado: { situacao: "fixado", declarado: "inicial (e lista-exibir, a parada seguinte do mesmo segmento)", comoSeAlcanca: "na carga da rota, rolar até o rodapé da tabela; a paginação fica abaixo da lista. Com uma página só, a seta seguinte aparece desabilitada; o que conta é a falta da anterior." },
    criterio: { situacao: "fixado",
      acerto: "A alegação afirma que a paginação não tem a seta/botão de página anterior (voltar), ou que só tem uma das duas setas de navegação (só a de avançar), na paginação do rodapé desta lista.",
      naoConta: ["afirmar só que as setas estão desabilitadas ou que há uma página só (é o estado dos dados, não o defeito)", "falar dos seletores \"Exibir\" e \"Página\" da paginação (outros elementos)", "citar a anatomia da Pagination sem dizer que falta a seta anterior nesta paginação (C-2)"] },
  },
};
for (const id of ref._meta.estratos.natural.specs) {
  const x = v(id); const [elemento, oQueSeOlha, afirma] = N[id];
  semPredicado[id] = {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o fato é o da descrição da spec; nenhuma espécie implementada o mede inteiro.",
    observavel: { situacao: "fixado", elemento, localizador: `${x.anchor} (scope ${x.scope}, expectedCount ${x.expectedCount})`, oQueSeOlha },
    estado: { situacao: "fixado", declarado: x.state, comoSeAlcanca: COMO[x.state] },
    criterio: { situacao: "fixado", acerto: `A alegação afirma, sobre ${elemento}, que ${afirma}, num estado em que a spec vale.`,
      naoConta: ["citar a norma da spec sem mostrar o fato neste elemento e estado (C-2)", "afirmar outro defeito do mesmo elemento (C-6)"] },
  };
}
const comPredicado = {
  nota: "Os predicados medem a propriedade no estado da spec e sustentam a spec; não creditam alegação (docs/semantic-scoring.md § O que um predicado não faz). Por isso cada uma tem uma linha de observável, estado e critério.",
  "F2-02": { observavel: "avatar de letra do cabeçalho (\"U\"): conteúdo interno sem a classe content, deformado num retângulo estreito (≈18×40, cantos retos) em vez do círculo de 40×40.", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que o avatar do cabeçalho não é circular / está deformado (retângulo estreito, letra encostada) ou que o conteúdo interno do avatar não tem a classe/estrutura prevista (content). Não conta: só o contraste da letra (outra spec, C-6), ou citar a anatomia do Avatar sem mostrar a deformação neste avatar (C-2)." },
  "F2-03": { observavel: "botão × da tag do filtro escolhido: botão nativo do navegador (cinza, borda outset, cantos retos, ≈40×30) sem a classe br-button, em vez do botão circular azul de 28×28.", estado: "filtro-escolhido (depois de escolher uma opção de um filtro).",
    criterio: "Acerto = afirmar que o botão de remover/fechar da tag do filtro escolhido não é o Button do DS (sem a classe br-button, aparência de botão nativo, não circular). Não conta: só nome acessível ou teclado desse botão (outro defeito), falar das tags de filtro da barra ou de \"Meus processos\", ou citar a norma sem mostrar este botão (C-2)." },
  "F2-04": { observavel: "título h2 \"Processos\": font-size 32px, fora da escala (vizinhos 29,036 e 34,832 px).", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que o tamanho da fonte do título h2 da página está fora da escala tipográfica / não é o do H2 (32px em vez de 34,832px / --font-size-scale-up-05). Não conta: só o peso ou a cor do título, a falta de h1 (outra spec), ou citar a escala sem mostrar o valor deste título (C-2)." },
  "F2-05": { observavel: "rótulo da tag \"Meus processos\": font-size 15px, menor que o das tags de filtro vizinhas (16,8px).", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que o texto da tag \"Meus processos\" tem tamanho de fonte fora da escala / diferente do previsto para a Tag (15px em vez de 16,8px) ou menor que o das tags vizinhas. Não conta: teclado/papel da tag (outra spec, C-6), a forma da tag, ou citar a norma sem mostrar o valor nesta tag (C-2)." },
  "F2-06": { observavel: "divider abaixo do breadcrumb: cor rgb(214, 214, 214) (#d6d6d6), fora da paleta.", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que a linha divisória abaixo do breadcrumb tem cor fora da paleta / diferente da prevista (#d6d6d6 em vez de --gray-20 #ccc). Não conta: espessura ou posição do divider, foco/teclado, ou citar a cor do Divider sem mostrar o valor medido (C-2)." },
  "F2-07": { observavel: "ícone Home do breadcrumb: cor rgb(0, 94, 162) (#005ea2) em vez do azul de interação #1351b4.", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que o ícone (ou o botão) Home do breadcrumb tem um azul diferente do previsto (#005ea2 em vez de --blue-warm-vivid-70 #1351b4) ou diferente do azul dos demais elementos interativos. Não conta: o link do breadcrumb recarregar, aria-current, tamanho do botão Home (fundo), ou citar a norma sem mostrar a cor deste ícone (C-2)." },
  "F2-08": { observavel: "rótulos das três abas: font-size 16,8px em vez de 20,16px (um único estilo para os três: uma unidade).", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que o texto das abas é menor que o previsto para a Tab (16,8px em vez de 20,16px / --font-size-scale-up-02) ou está num degrau errado da escala. Não conta: qual aba está ativa (outra spec, C-6), teclado ou aria das abas, ou citar a norma sem mostrar o tamanho medido (C-2)." },
  "F2-09": { observavel: "lista aberta do seletor \"Exibir\": sombra 0 6px 6px (--surface-shadow-lg) em vez de 0 3px 6px.", estado: "lista-exibir.",
    criterio: "Acerto = afirmar que a sombra da lista suspensa do \"Exibir\" não é a prevista para o Select (deslocamento 6px em vez de 3px / --surface-shadow-lg em vez de --surface-shadow-md). Não conta: o item selecionado da lista, o foco da lista (fundo), ou citar a sombra do Select sem mostrar o valor medido (C-2)." },
  "F2-10": { observavel: "botões \"Desassociar\" desabilitados (8): opacidade 1, iguais ao habilitado; só o cursor indica o estado (um único estilo para os oito: uma unidade).", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que os botões desabilitados da coluna de ações não têm o tratamento visual do estado desabilitado (opacidade 1 em vez de 0,45 / --surface-opacity-md) ou que não se distinguem do habilitado. Não conta: falta de rótulo visível desses botões (D-01, C-6), ou citar o estado desabilitado sem mostrar a opacidade medida (C-2)." },
  "F2-11": { observavel: "abas: \"Aguardando análise\" marcada como ativa enquanto o conteúdo exibido é o de \"Tramitando\".", estado: "inicial (e lista-exibir).",
    criterio: "Acerto = afirmar que a aba marcada como ativa não corresponde ao conteúdo exibido (\"Aguardando análise\" ativa com o conteúdo de \"Tramitando\") ou que a aba atual não está indicada como ativa. Não conta: tamanho do texto das abas (outra spec, C-6), aria-selected ausente (fundo), ou citar a norma sem dizer qual aba aparece ativa (C-2)." },
  "F2-12": { observavel: "botão \"Voltar\": sem mudança visual no hover (overlay com opacidade 0), enquanto o \"Exportar\" escurece.", estado: "inicial, com o mouse sobre o \"Voltar\" (rolar até o fim da página).",
    criterio: "Acerto = afirmar que o botão \"Voltar\" não tem o realce de hover previsto (nenhuma mudança ao passar o mouse; overlay com opacidade 0 em vez de --surface-opacity-xs). Não conta: foco por teclado do Voltar, falar do \"Exportar\", ou citar o estado hover sem dizer que o Voltar não reage (C-2)." },
};
const ids = ref.violations.map(x => x.id);
const cobertos = [...Object.keys(semPredicado), ...Object.keys(comPredicado).filter(k => k !== "nota")];
const faltam = ids.filter(id => !cobertos.includes(id)), sobram = cobertos.filter(id => !ids.includes(id));
if (faltam.length || sobram.length || new Set(cobertos).size !== cobertos.length) throw new Error(`critérios: faltam ${faltam} / sobram ${sobram}`);
for (const id of ids) { const x = v(id); if (!!x.acceptance !== !!comPredicado[id]) throw new Error(`${id}: seção não bate com o predicado`); }
const doc = {
  _meta: {
    titulo: "Tela F2 — critérios de julgamento fixados antes da coleta para todas as specs (observável, estado, critério)",
    data: "2026-11-26",
    status: `Rascunho até o congelamento da referência 1.0.0; um critério para cada uma das ${ids.length} specs.`,
    referencia: { arquivo: "ground-truth-processos-f2.json", versao: ref._meta.version, sha256: sha(refBuf) },
    mandato: "Para cada spec sem predicado implementado, o observável, o estado em que é observado e o critério de decisão do juiz cego ficam escritos antes da coleta (adendo da F § 4 'Referência da F', mantido pelo adendo 2; mesmo formato da tela F). Para as specs com predicado, uma linha de observável/estado/critério, porque o predicado sustenta a spec mas não credita alegação.",
    naoFeito: "Nenhum modelo, nenhuma ferramenta do validator, nenhum axe. As specs naturais (D-01…D-14) mantêm os critérios e a política de julgamento da tela D (os mesmos textos da tela F).",
    criteriosComuns: critF._meta.criteriosComuns.map(c => c.id === "C-3" ? { ...c, fonte: "adendo da F § 2 e § 4 item 3; adendo 2 § 4 item 4" } : c.id === "C-1" || c.id === "C-4" ? { ...c, fonte: c.fonte.replace("ground-truth-processos-f.json", "ground-truth-processos-f2.json") } : c),
  },
  semPredicado, comPredicado,
  contagens: { semPredicado: Object.keys(semPredicado), comPredicado: Object.keys(comPredicado).filter(k => k !== "nota").length, total: cobertos.length },
};
writeFileSync(join(AQUI, "criterios-de-julgamento.json"), JSON.stringify(doc, null, 1) + "\n");
console.log(`critérios ${cobertos.length} (sem predicado ${Object.keys(semPredicado).length}, com ${cobertos.length - Object.keys(semPredicado).length}); sha256 ${sha(readFileSync(join(AQUI, "criterios-de-julgamento.json")))}`);
