/** Human-readable review cards. Renders a package and its decisions; never scores or decides. */
import {
  RELACOES_VINCULO, VINCULO_CONTRATO, aceitaVinculos, armLeaks, reviewEffort, reviewQueue, scoreSemanticPackage,
  type ReviewCard, type SemanticPackage, type SemanticReviews,
} from "./semantic-flow";
import { mascararNormaCega, mascararTextoCego } from "./painel/mascara";

const CONTRACT: Record<ReviewCard["contract"], string> = {
  "achado-2": "achado-2 — observado, esperado, estado e evidência declarados pelo agente",
  "achado-1-legado": "achado-1 (legado, até fluxo-1.2.0) — sem estado nem evidência da execução; não satisfaz o contrato atual",
  recusado: "recusado — o coletor recusou todo relatório desta execução e a última tentativa foi arquivada como relatório dela; não satisfaz o contrato atual (motivo em Sinalizações)",
  malformado: "malformado — preservado como veio; decida pelo texto bruto em Evidência declarada",
  deterministico: "determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente",
};
const EVIDENCE: Record<ReviewCard["evidence"][number]["status"], string> = {
  encontrado: "",
  ausente: "não encontrado na evidência preservada da execução",
  ambiguo: "ambíguo: mais de um arquivo preservado corresponde",
  identificador: "identificador devolvido por ferramenta (sem arquivo)",
  "sem-arquivo": "a execução não tem evidência preservada",
};
const escapeHeadings = (text: string): string => text.replace(/^#/gm, "\\#");

/**
 * Renderização cega (fatia 5): retém o texto livre em que o agente narra as próprias ferramentas.
 *
 * O que se retém é `reportedEvidence` inteiro e, nos cartões legados, a `description` bruta — são
 * os dois lugares em que "Sem oráculo nem scan_page" ou "o oráculo indica --gray-cool-10" aparecem
 * literalmente. O que NÃO se retém é o que sustenta a decisão: observado, esperado, estado,
 * sujeitos, unidades candidatas, predicado medido e a evidência preservada com seu sha256.
 *
 * A retenção é declarada em cada cartão. Um cartão que esconde algo sem dizer que esconde seria
 * pior do que um que mostra: a revisora precisa saber que existe texto que ela não está vendo, e
 * poder pedi-lo depois de decidir.
 */
const RETIDO = "_(retido na renderização cega: este texto pode nomear o braço da execução)_";

function claim(c: ReviewCard, cego: boolean): string[] {
  // [C, plano de revisão 19/10] Na renderização cega, o texto da alegação passa pela mesma máscara da vista cega do trio
  // (painel/mascara.ts): ids da base do DS e do oráculo viram "[regra citada]", menções a ferramenta "[ferramenta citada]".
  // Sem --cego nada muda.
  const t = (x: string | null) => (cego ? mascararTextoCego(x) : x);
  const lines = [`Contrato: ${CONTRACT[c.contract]}`, "",
    `Origem: ${c.origin === "agente" ? "execução do agente" : "linha de base determinística"} · cena ${c.scene}`, ""];
  if (c.contract === "achado-2" || c.contract === "deterministico" || (c.contract === "recusado" && (c.observed !== null || c.expected !== null))) {
    lines.push(`Observado: ${escapeHeadings(t(c.observed) ?? "(ausente)")}`, "",
      `Esperado: ${escapeHeadings(t(c.expected) ?? "(ausente)")}`, "",
      c.state
        ? `Janela: ${c.state.viewport.width}×${c.state.viewport.height} · interações desde o carregamento: ` +
          (c.state.steps.length ? c.state.steps.map((step, i) => `${i + 1}. ${t(step)}`).join(" ") : "nenhuma")
        : "Janela e interações: ausentes ou inválidas no relatório", "");
  } else {
    lines.push(cego ? RETIDO : escapeHeadings(c.description), "");
  }
  lines.push(`Regra declarada: ${c.rule === null ? "nenhuma (atribuição incerta)" : cego ? mascararNormaCega(c.rule) : c.rule}`, "");
  lines.push(c.binding.runScope
    ? "Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções."
    : "Reuso: condicionado à mesma evidência verificada, estado declarado e build original.", "");
  if (c.flags.length) lines.push(`Sinalizações: ${c.flags.map(t).join(" · ")}`, "");
  return lines;
}

export function renderReview(pkg: SemanticPackage, reviews: SemanticReviews, opts: { cego?: boolean } = {}): string {
  const cego = Boolean(opts.cego);
  const result = scoreSemanticPackage(pkg, reviews);
  const pending = new Set(result.scores.flatMap(s => s.pendingCardIds));
  const decisions = new Map(reviews.decisions.map(d => [d.cardId, d]));
  const fila = reviewQueue(pkg, reviews);
  const esforco = reviewEffort(pkg);
  const vazamentos = armLeaks(pkg);
  const lines = ["# Revisão semântica — pacote fechado", "",
    `Versão: ${pkg.version} · ${pkg.cards.length} cartões únicos · ${pending.size} pendentes` +
      (cego ? " · **renderização cega**" : ""), "",
    "## As três filas", "",
    "| Fila | Quantidade | O que ela cobra |",
    "|---|---|---|",
    `| **Ativa — desta bateria** | ${fila.ativa.cartoes} cartão(ões) | **Só esta fecha a bateria.** Enquanto houver um, as métricas são provisórias. |`,
    `| Histórica — de outras baterias | ${fila.historica.cartoes} | Dívida declarada do projeto. Não cobra nada desta bateria, e não some por isso. |`,
    `| Descobertas para a próxima referência | ${fila.proximaVersao.afirmacoes} afirmação(ões) | Defeito correto fora do gabarito congelado. Entra na PRÓXIMA versão; não mexe no denominador desta. |`,
    "",
    `Esforço: ${esforco.sujeitos} sujeitos · ${esforco.semEvidenciaVerificada} cartão(ões) sem evidência verificada · ` +
      `${esforco.comCandidatos} com unidade candidata · estimativa **${esforco.estimativaMinutos} min** (${esforco.taxa}).`, "",
    esforco.orcamentoDeclarado
      ? `Orçamento de revisão declarado: **${esforco.orcamentoDeclarado}**. Esgotá-lo NÃO é permissão para derrubar ` +
        "alegação difícil ou demorada: o não resolvido continua visível e as métricas, provisórias."
      : "Nenhum orçamento de revisão foi declarado. Declare antes de começar — depois de ver os cartões já não é orçamento.", "",
    cego
      ? `Cegueira: o texto livre da execução está retido em todos os cartões. ${vazamentos.length} deles contêm termos ` +
        "que nomeiam o braço, e é isso que a retenção esconde. **Não abra `package.json` enquanto decide**: ele guarda " +
        "`config.arm` e o caminho do arquivo da execução."
      : `Esta renderização NÃO é cega: ${vazamentos.length} cartão(ões) contêm texto que nomeia o braço da execução. ` +
        "Para decidir sem saber o braço, gere com `--cego`.", "",
    "## Como decidir", "",
    "Escreva `decisao` em cada átomo, com uma destas cinco palavras:", "",
    "| `decisao` | Quer dizer |",
    "|---|---|",
    "| `defeito-do-gabarito` | a alegação acertou um defeito que o gabarito cataloga (nomeie a unidade em `unitIds`) |",
    "| `defeito-novo-correto` | está certa, mas o defeito não está no gabarito: vai para a próxima referência |",
    "| `incorreta` | a alegação está errada |",
    "| `duplicada` | é a mesma afirmação de outro átomo já decidido (aponte `duplicateOf`) |",
    "| `evidencia-insuficiente` | não dá para decidir com o que está aqui |",
    "",
    "A contabilidade (`reference`/`novel`/`false`/`unresolved`) é derivada disso; você não precisa escrevê-la.", "",
    "Este pacote inclui todas as alegações selecionadas, inclusive as que casariam por regra.",
    "Candidatos são sugestões de âncora, não vereditos. Você continua sendo a adjudicadora.",
    "Edite reviews.json; depois gere uma NOVA saída com score. Não edite package.json.", "",
    "Evidência da execução (achado-2) aponta para a cópia preservada do que as ferramentas gravaram durante a execução; confira-a antes das reconstruções.",
    "As capturas scene-* são reconstruções no momento de preparar o pacote, não prova de que o agente observou o mesmo estado.",
    "Confira também reportedEvidence, inclusive as limitações declaradas. Use unresolved quando não houver suporte.", "",
    "Cartões de linha de base (origem determinística) são revisados como os do agente: é o que permite dizer o que o agente acrescenta ou perde em relação à ferramenta.",
    "Cena = janela do plano de estados. Uma unidade só pode ser creditada por cartão da mesma cena.", "",
    // Só em pacote com cenas por segmento (D-60); sem navegação o texto é o de sempre.
    ...(pkg.scenes.some(s => s.segmento) ? [
      "**Este plano navega (D-60):** cada janela tem uma cena por SEGMENTO, capturada na última parada dele " +
        `(${pkg.scenes.map(s => `${s.id} = ${s.segmento?.path ?? "?"}`).join(" · ")}). ` +
        "Quando o seletor de uma alegação resolve em mais de um segmento, o cartão lista os sujeitos de cada um e a " +
        "decisão precisa dizer em `\"cena\"` de qual segmento a alegação fala (pelos passos declarados e pela evidência). " +
        "Só os sujeitos dessa cena contam; os dos outros segmentos não são alegação.", ""] : []),
    "Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.",
    "Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.",
    'Duplicatas revisadas: no átomo repetido, acrescente duplicateOf: { "cardId": "C-...", "atomId": "..." }. A citação continua avaliada separadamente.', "",
    // NAT-72: só em pacote que aceita vínculo; num pacote legado o texto é o de sempre.
    ...(aceitaVinculos(pkg.version) ? [
      "**Vínculo de revisão (exceção declarada):** quando a alegação está certa sobre uma unidade que a ancoragem não ofereceu " +
        "(ausência global ancorada em <html>/body, host no lugar do controle interno, participante relacionado, transição), " +
        `acrescente ao átomo \`"links"\`: [{ "contrato": "${VINCULO_CONTRATO}", "unitId", "subjects", "scene", "state" (estado medido), ` +
        `"relation" (${RELACOES_VINCULO.join(" | ")}), "evidence", "justification", "reviewer" (você), "binding" (o do cartão) }]. ` +
        "Nada cria vínculo por você; o scorer recusa outra cena, estado não medido, relação que não cabe na árvore medida, falta de evidência.", ""] : []),
  ];
  const mt = (x: string) => (cego ? mascararTextoCego(x) : x);
  const sujeito = (s: ReviewCard["subjects"][number]) => `- ${JSON.stringify(s.id)} — ${mt(s.label)}${s.hidden ? ` · **oculto**: ${mt(s.hidden)}` : ""}`;
  for (const c of pkg.cards) {
    const d = decisions.get(c.id);
    lines.push(`## ${c.id}`, "", `Estado: ${pending.has(c.id) ? "pendente" : "concluído"}`, "", ...claim(c, cego),
      "### Sujeitos", "",
      ...(c.segmentos
        ? c.segmentos.flatMap(o => [`Cena \`${o.scene}\` (${o.path ?? "?"}) — escolha com \`"cena": ${JSON.stringify(o.scene)}\`:`,
          ...c.subjects.filter(s => s.scene === o.scene).map(sujeito), ""])
        : c.subjects.map(sujeito)), "",
      "### Unidades candidatas (não são crédito)", "");
    for (const id of c.candidateUnitIds) {
      const u = pkg.units.find(u => u.id === id)!;
      lines.push(`- ${id} — ${u.specId} · ${u.state} · cena ${u.scene}${u.domain ? ` (domínio provado: ${u.domain.map(e => `${e.scene} ${e.kind}`).join(", ")})` : ""} · ${u.element.label}: ${u.description}`);
      // O estado MEDIDO e o predicado MEDIDO são fatos sobre a página, e é por isto que eles
      // existem: chegar a quem decide. Nenhum dos dois é veredito sobre a alegação.
      lines.push(`  - estados em que a unidade existe: ${u.states.length ? u.states.join(", ") : "não medido"}`);
      lines.push(`  - predicado de aceitação: ${u.acceptance.outcome === "nao-implementado"
        ? "não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua"
        : `${u.acceptance.kind} ${u.acceptance.outcome} em ${u.acceptance.states.join(", ")} — ${u.acceptance.expected}. ` +
          `Medido: ${u.acceptance.measured.map(m => m.reason).join(" | ")}`}`);
      lines.push("  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.");
    }
    if (!c.candidateUnitIds.length) lines.push("Nenhuma âncora candidata; um achado novo correto continua sendo possível.");
    if (c.contract === "achado-2" || (c.contract === "recusado" && c.evidence.length > 0)) {
      lines.push("", "### Evidência da execução", "");
      if (!c.evidence.length) lines.push("Nenhuma referência de evidência declarada.");
      for (const e of c.evidence) {
        lines.push(`- \`${e.ref}\` → ${e.status === "encontrado" ? `\`${e.path}\` (sha256 ${e.sha256?.slice(0, 12)})` : EVIDENCE[e.status]}`);
      }
    }
    lines.push("", "### Evidência declarada", "");
    if (cego) lines.push(RETIDO, "", "Peça a renderização completa DEPOIS de decidir, se precisar do texto integral.", "");
    else lines.push("````json", JSON.stringify(c.reportedEvidence, null, 2), "````", "");
    lines.push("### Decisão", "", "````json", JSON.stringify(d, null, 2), "````", "");
  }
  return lines.join("\n");
}
