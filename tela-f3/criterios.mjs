/**
 * Tela F3 — critérios de julgamento para TODAS as specs da referência (passada 1.4.8: um critério por spec, senão para).
 * Molde: tela-f2/criterios.mjs (mesmo formato, mesmos critérios comuns C-1…C-6, mais o C-7 da F3).
 *
 * Naturais (D-01…D-14): os registros da F2 copiados sem mudança (são os textos da F e da D; a D-14 com a mesma âncora
 * nova da F2), conferidos contra a referência da F3 (localizador = âncora, escopo e contagem).
 * Semeadas sem predicado (F3-01, F3-03, F3-09, F3-12): registro completo `semPredicado` (observável / estado / critério).
 * Os critérios de 03, 09 e 12 usam a redação do adendo 3 § 3; o de 01 vale em qualquer página (adendo 3 § 3, "Estado do
 * caso 01"). Onde o estado declarado é um entre vários equivalentes (outra página, outro filtro, outra quantidade, outra
 * linha marcada), o critério diz que o comportamento observado em qualquer estado equivalente leva o crédito (C-7).
 * Semeadas com predicado (8): uma linha de observável, estado e critério em `comPredicado`, porque o predicado sustenta a
 * spec mas não credita alegação; a do caso 04 usa a redação do adendo 3 § 3 (spec da coluna; qualquer célula cortada).
 * Nenhuma medida nova; tudo vem da referência (descrição, estado, âncora) e de tela-f3/sonda.json.
 * Uso: node tela-f3/criterios.mjs → tela-f3/criterios-de-julgamento.json (cita o sha256 da referência atual)
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const sha = b => createHash("sha256").update(b).digest("hex");
const refBuf = readFileSync(join(RAIZ, "ground-truth-processos-f3.json")), ref = JSON.parse(refBuf);
const critF2 = JSON.parse(readFileSync(join(RAIZ, "tela-f2/criterios-de-julgamento.json"), "utf8"));
const v = id => ref.violations.find(x => x.id === id);

const semPredicado = {};
// naturais: os registros da F2, sem mudança, conferidos contra a referência da F3
for (const id of ref._meta.estratos.natural.specs) {
  const r = critF2.semPredicado[id], x = v(id);
  if (!r) throw new Error(`${id}: sem registro na F2`);
  if (r.observavel.localizador !== `${x.anchor} (scope ${x.scope}, expectedCount ${x.expectedCount})` || r.estado.declarado !== x.state) throw new Error(`${id}: localizador ou estado da F2 ≠ referência da F3`);
  semPredicado[id] = JSON.parse(JSON.stringify(r));
}
const loc = id => { const x = v(id); return `${x.anchor} (scope ${x.scope}, ${x.scope === "composicao" ? `participantCount ${x.participantCount}` : `expectedCount ${x.expectedCount}`})`; };
Object.assign(semPredicado, {
  "F3-01": {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o observável é a ausência de um elemento (a seta \"Página anterior\" da paginação); nenhuma espécie implementada mede ausência de filho.",
    observavel: { situacao: "fixado", elemento: "a paginação no rodapé da tabela (setas de navegação e números de página)", localizador: loc("F3-01"),
      oQueSeOlha: "quantas setas de navegação a paginação tem: só existe a seta \"Página seguinte\" (à direita dos números de página); não há a seta \"Página anterior\" à esquerda, em nenhuma página e em nenhuma aba." },
    estado: { situacao: "fixado", declarado: "sempre (todas as paradas: inicial, lista-exibir, assinatura-cancelada, pagina-2, exibir-25, filtro-removido)",
      comoSeAlcanca: "em qualquer página da paginação: na carga da rota (página 1, a seta seguinte desabilitada) e em qualquer outra página, de qualquer aba — por exemplo na aba \"Concluídos\" (14 itens) depois de \"Página seguinte\", onde se nota que não há seta para voltar. O estado em que a alegação observou a falta não importa." },
    criterio: { situacao: "fixado",
      acerto: "A alegação afirma que a paginação desta lista não tem a seta/botão de página anterior (voltar), ou que só tem uma das duas setas de navegação (a de avançar), observado em qualquer página ou aba (página 1 na carga, página 2 de \"Concluídos\" ou outra).",
      naoConta: ["afirmar só que as setas estão desabilitadas ou que há uma página só (é o estado dos dados, não o defeito)", "afirmar só a forma da seta \"Página seguinte\" (outra spec, C-6)", "falar dos seletores \"Exibir\" e \"Página\" da paginação (outros elementos)", "citar a anatomia da Pagination sem dizer que falta a seta anterior nesta paginação (C-2)"] },
  },
  "F3-03": {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o observável é um comportamento (a tag continua depois do clique no ×); nenhuma espécie implementada mede o efeito de um clique. A referência ancora a tag do filtro escolhido na parada depois do clique: no build semeado ela resolve; no sem semente, não.",
    observavel: { situacao: "fixado", elemento: "a tag do filtro escolhido (acima da barra de filtros) e o botão × dela", localizador: loc("F3-03"),
      oQueSeOlha: "o que acontece ao clicar no × da tag (ou focá-lo e apertar Enter): a tag deveria sair e o filtro deixar de valer; aqui a tag continua visível e o filtro continua aplicado (\"Limpar filtros\" segue habilitado). Por fora o × é o botão circular do DS (br-button, 28×28, azul) e recebe foco." },
    estado: { situacao: "fixado", declarado: "filtro-removido",
      comoSeAlcanca: "abrir o filtro \"Aberto há\" (barra acima da tabela), escolher \"Últimos 60 dias\" e clicar no × da tag que aparece. Vale igual para qualquer filtro e qualquer opção escolhidos e para o × acionado por teclado: o que conta é o comportamento depois do clique." },
    criterio: { situacao: "fixado",
      acerto: "Depois de clicar no × (ou acionar o × pelo teclado), a própria tag do filtro escolhido continua visível — a alegação afirma que o × não remove/fecha a tag ou o filtro. A lista continuar filtrada corrobora, mas não é exigida.",
      naoConta: ["afirmar só a aparência, o tamanho, o nome acessível ou o foco do × (outros defeitos)", "afirmar que o filtro não foi aplicado, sem ter clicado no ×", "falar das tags de filtro da barra ou de \"Meus processos\"", "citar a norma da Tag dispensável sem dizer que o × não remove esta tag (C-2)"] },
  },
  "F3-09": {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o observável é o valor exibido no campo depois de uma escolha (propriedade value do input, não atributo); nenhuma espécie implementada o mede.",
    observavel: { situacao: "fixado", elemento: "o campo do seletor \"Exibir\" (itens por página) da paginação", localizador: loc("F3-09"),
      oQueSeOlha: "o que o campo mostra depois de escolher outra quantidade: com 25 escolhido, a tabela atualiza (14 linhas em \"Concluídos\", \"1 – 14 de 14 itens\") e o 25 fica marcado na lista, mas o campo continua mostrando 10." },
    estado: { situacao: "fixado", declarado: "exibir-25",
      comoSeAlcanca: "aba \"Concluídos\" (14 itens), abrir o seletor \"Exibir\" no rodapé da tabela e escolher 25. Vale igual para 50 ou 100 e em outra aba ou lista: o que conta é o campo mostrar 10 depois de outra escolha." },
    criterio: { situacao: "fixado",
      acerto: "A alegação afirma que, depois de escolher 25 (ou outra quantidade diferente de 10) em \"Exibir\", o seletor continua exibindo 10 enquanto a tabela já reflete a escolha — a divergência entre a opção escolhida e o valor exibido no campo.",
      naoConta: ["afirmar que a tabela não atualiza (ela atualiza)", "falar do seletor \"Página\" ou das setas da paginação (outros elementos)", "afirmar a aparência ou a sombra da lista aberta", "citar a norma do Select sem dizer que o campo mostra outro valor depois da escolha (C-2)"] },
  },
  "F3-12": {
    classe: "conforme a referência",
    aceitacaoNaReferencia: "sem predicado: o observável é a redação do rótulo comparada com a ação que o botão oferece (o diálogo que ele abre); nenhuma espécie implementada compara texto com ação.",
    observavel: { situacao: "fixado", elemento: "o botão de ação em lote abaixo da tabela (aparece com ao menos uma linha marcada)", localizador: loc("F3-12"),
      oQueSeOlha: "o rótulo visível do botão (\"Confirmar\") e o diálogo que ele abre (\"Confirma a assinatura de 1 processo(s)?\", com \"Assinar\" e \"Cancelar\"): o rótulo não diz que a ação é assinar." },
    estado: { situacao: "fixado", declarado: "assinatura-cancelada",
      comoSeAlcanca: "na carga da rota (lista da carga, \"Meus processos\" ligado), marcar a caixa de uma linha (a 1ª caixa está na 2ª linha; qualquer linha ou mais de uma valem igual); o botão aparece abaixo da tabela, acima da paginação. Para ver a ação, clicar e depois Cancelar no diálogo — nunca \"Assinar\". O diálogo aberto e cancelado é a evidência, não uma condição: a alegação vale com ou sem ele." },
    criterio: { situacao: "fixado",
      acerto: "O rótulo visível \"Confirmar\" omite a assinatura: a alegação afirma que o rótulo do botão não identifica a ação oferecida (assinar os processos selecionados), por exemplo que é genérico ou que o diálogo revela outra ação. O diálogo aberto pelo botão mostra qual ação estava sendo oferecida.",
      naoConta: ["afirmar só o ícone, a cor ou a ênfase do botão", "falar dos botões \"Assinar\" das linhas (outro elemento)", "afirmar só a falta de rótulo/nome das caixas de seleção (D-04)", "citar a norma de rótulo do Button sem dizer que \"Confirmar\" não informa a ação (C-2)"] },
  },
});
const comPredicado = {
  nota: "Os predicados medem a propriedade no estado da spec e sustentam a spec; não creditam alegação (docs/semantic-scoring.md § O que um predicado não faz). Por isso cada uma tem uma linha de observável, estado e critério.",
  "F3-02": { observavel: "avatar de letra do cabeçalho (\"U\"): conteúdo interno sem a classe content, deformado num retângulo estreito (≈18×40, cantos retos) em vez do círculo de 40×40.", estado: "inicial (o avatar é o mesmo em todas as paradas).",
    criterio: "Acerto = afirmar que o avatar do cabeçalho não é circular / está deformado (retângulo estreito, letra encostada) ou que o conteúdo interno do avatar não tem a classe/estrutura prevista (content). Não conta: só o contraste da letra (D-14, C-6), ou citar a anatomia do Avatar sem mostrar a deformação neste avatar (C-2)." },
  "F3-04": { observavel: "coluna \"Solicitante\": as 9 células cortam o texto em 150 px, numa linha, sem reticências (overflow hidden, text-overflow clip) e sem title/tooltip com o texto completo; o nome comprido da 1ª linha é o que mais perde. A spec é da coluna (uma regra corta todas as células).", estado: "inicial (lista da carga); a mesma regra corta a coluna nas outras abas.",
    criterio: "Acerto = afirmar que o nome transborda e aparece cortado sem reticências e que o texto completo não é revelado (sem tooltip/title) — os dois sintomas formam esta spec, e o relato de QUALQUER célula cortada da coluna Solicitante leva o crédito (não só a do nome comprido); também conta afirmar só o corte sem reticências de nomes da coluna. Não conta: falar do conteúdo do nome (dado da lista), da largura das outras colunas ou do rolamento horizontal da tabela sem o corte, ou citar a norma de truncamento da Table sem mostrar o corte nesta coluna (C-2)." },
  "F3-05": { observavel: "tag \"Meus processos\" ligada: fundo rgb(23, 85, 169) (#1755a9), inline, fora da paleta, em vez de rgb(19, 81, 180) (#1351b4, --blue-warm-vivid-70).", estado: "inicial (\"Meus processos\" ligado).",
    criterio: "Acerto = afirmar que a cor de fundo da tag \"Meus processos\" não é o azul previsto da Tag de interação (#1755a9 em vez de #1351b4 / --blue-warm-vivid-70), ou que está fora da paleta. Não conta: teclado/papel da tag (D-03, C-6), o tamanho do rótulo, ou citar a cor da Tag sem mostrar o valor medido nesta tag (C-2)." },
  "F3-06": { observavel: "seta \"Página seguinte\": border-radius 7px (inline), quadrado arredondado de 40×40 em vez de botão circular; os \"Exibir lista\" da mesma paginação são circulares.", estado: "inicial (a seta é a mesma em todas as paradas).",
    criterio: "Acerto = afirmar que a seta \"Página seguinte\" não é circular (cantos de 7px / raio diferente de 50%) ou que tem forma diferente dos outros botões circulares da paginação. Não conta: a falta da seta \"Página anterior\" (F3-01, C-6), a seta estar desabilitada, o nome acessível da seta, ou citar o Botão Circular sem mostrar o raio desta seta (C-2)." },
  "F3-07": { observavel: "breadcrumb: o último item, \"Processos\" (página atual), é um link <a href=\"portal-mpa/processos\"> para a própria página, com cor de link e no Tab, sem a marca de item atual (data-active).", estado: "inicial (o breadcrumb é o mesmo em todas as paradas).",
    criterio: "Acerto = afirmar que o último item do breadcrumb (a página atual, \"Processos\") é um link/clicável/focável, ou que tem aparência de link em vez de texto comum. Não conta: o link Home apontar para fora da ala ou recarregar, a falta de aria-current (fundo), a cor do ícone Home, ou citar a regra do Breadcrumb sem dizer que o item atual é link (C-2)." },
  "F3-08": { observavel: "rótulos das três abas: font-size 16,8px em vez de 20,16px (um único estilo para os três: uma unidade).", estado: "inicial (os rótulos são os mesmos em todas as paradas).",
    criterio: "Acerto = afirmar que o texto das abas é menor que o previsto para a Tab (16,8px em vez de 20,16px / --font-size-scale-up-02) ou está num degrau errado da escala. Não conta: qual aba está ativa (F3-11, C-6), teclado ou aria das abas, ou citar a norma sem mostrar o tamanho medido (C-2)." },
  "F3-10": { observavel: "botões \"Desassociar\" desabilitados (8): opacidade 1, iguais ao habilitado; só o cursor indica o estado (um único estilo para os oito: uma unidade).", estado: "inicial (lista da carga).",
    criterio: "Acerto = afirmar que os botões desabilitados da coluna de ações não têm o tratamento visual do estado desabilitado (opacidade 1 em vez de 0,45 / --surface-opacity-md) ou que não se distinguem do habilitado. Não conta: falta de rótulo visível desses botões (D-01, C-6), ou citar o estado desabilitado sem mostrar a opacidade medida (C-2)." },
  "F3-11": { observavel: "abas: \"Aguardando análise\" marcada como ativa enquanto o conteúdo exibido é o de \"Tramitando\".", estado: "inicial (carga da rota, sem clicar em nenhuma aba).",
    criterio: "Acerto = afirmar que a aba marcada como ativa não corresponde ao conteúdo exibido (\"Aguardando análise\" ativa com o conteúdo de \"Tramitando\") ou que a aba atual não está indicada como ativa. Não conta: tamanho do texto das abas (F3-08, C-6), aria-selected ausente (fundo), ou citar a norma sem dizer qual aba aparece ativa (C-2)." },
};
const ids = ref.violations.map(x => x.id);
const cobertos = [...Object.keys(semPredicado), ...Object.keys(comPredicado).filter(k => k !== "nota")];
const faltam = ids.filter(id => !cobertos.includes(id)), sobram = cobertos.filter(id => !ids.includes(id));
if (faltam.length || sobram.length || new Set(cobertos).size !== cobertos.length) throw new Error(`critérios: faltam ${faltam} / sobram ${sobram}`);
for (const id of ids) { const x = v(id); if (!!x.acceptance !== !!comPredicado[id]) throw new Error(`${id}: seção não bate com o predicado`); }
const comuns = critF2._meta.criteriosComuns.map(c => c.id === "C-3" ? { ...c, fonte: "adendo da F § 2 e § 4 item 3; adendo 2 § 4 item 4; mantido pelo adendo 3" } : c.id === "C-1" || c.id === "C-4" ? { ...c, fonte: c.fonte.replace("ground-truth-processos-f2.json", "ground-truth-processos-f3.json") } : c);
comuns.push({ id: "C-7", texto: "Spec de comportamento ou de estado (F3-01, F3-03, F3-09, F3-12): o estado declarado é um exemplo de onde o fato se vê. O comportamento observado em qualquer estado equivalente leva o crédito — outra página ou aba (F3-01), outro filtro ou opção, × por teclado (F3-03), outra quantidade por página (F3-09), outra linha marcada, com ou sem o diálogo aberto (F3-12). O que não conta é o estado em que o fato não existe (por exemplo afirmar que o × não remove sem tê-lo acionado).", fonte: "adendo 3 de 27/11 § 3 (critérios de 03, 09 e 12; estado do caso 01)" });
const doc = {
  _meta: {
    titulo: "Tela F3 — critérios de julgamento fixados antes da coleta para todas as specs (observável, estado, critério)",
    data: "2026-11-27",
    status: /RASCUNHO/.test(String(ref._meta.status)) ? `Rascunho até o congelamento da referência 1.0.0; um critério para cada uma das ${ids.length} specs.` : `Fixado antes de qualquer execução de agente na tela F3, com a referência congelada 1.0.0; um critério para cada uma das ${ids.length} specs.`,
    referencia: { arquivo: "ground-truth-processos-f3.json", versao: ref._meta.version, sha256: sha(refBuf) },
    mandato: "Para cada spec sem predicado implementado, o observável, o estado em que é observado e o critério de decisão do juiz cego ficam escritos antes da coleta (adendo da F § 4 'Referência da F', mantido pelos adendos 2 e 3; mesmo formato da F e da F2). Para as specs com predicado, uma linha de observável/estado/critério, porque o predicado sustenta a spec mas não credita alegação. Os critérios dos casos 03, 04, 09 e 12 usam a redação do adendo 3 § 3.",
    naoFeito: "Nenhum modelo, nenhuma ferramenta do validator, nenhum axe. As specs naturais (D-01…D-14) mantêm os critérios e a política de julgamento da tela D (os mesmos textos da F e da F2).",
    criteriosComuns: comuns,
  },
  semPredicado, comPredicado,
  contagens: { semPredicado: Object.keys(semPredicado), comPredicado: Object.keys(comPredicado).filter(k => k !== "nota").length, total: cobertos.length },
};
writeFileSync(join(AQUI, "criterios-de-julgamento.json"), JSON.stringify(doc, null, 1) + "\n");
console.log(`critérios ${cobertos.length} (sem predicado ${Object.keys(semPredicado).length}, com ${cobertos.length - Object.keys(semPredicado).length}); sha256 ${sha(readFileSync(join(AQUI, "criterios-de-julgamento.json")))}`);
