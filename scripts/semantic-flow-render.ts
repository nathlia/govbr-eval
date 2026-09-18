/** Human-readable review cards. Renders a package and its decisions; never scores or decides. */
import { scoreSemanticPackage, type ReviewCard, type SemanticPackage, type SemanticReviews } from "./semantic-flow";

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

function claim(c: ReviewCard): string[] {
  const lines = [`Contrato: ${CONTRACT[c.contract]}`, "",
    `Origem: ${c.origin === "agente" ? "execução do agente" : "linha de base determinística"} · cena ${c.scene}`, ""];
  if (c.contract === "achado-2" || c.contract === "deterministico" || (c.contract === "recusado" && (c.observed !== null || c.expected !== null))) {
    lines.push(`Observado: ${escapeHeadings(c.observed ?? "(ausente)")}`, "",
      `Esperado: ${escapeHeadings(c.expected ?? "(ausente)")}`, "",
      c.state
        ? `Janela: ${c.state.viewport.width}×${c.state.viewport.height} · interações desde o carregamento: ` +
          (c.state.steps.length ? c.state.steps.map((step, i) => `${i + 1}. ${step}`).join(" ") : "nenhuma")
        : "Janela e interações: ausentes ou inválidas no relatório", "");
  } else {
    lines.push(escapeHeadings(c.description), "");
  }
  lines.push(`Regra declarada: ${c.rule === null ? "nenhuma (atribuição incerta)" : c.rule}`, "");
  lines.push(c.binding.runScope
    ? "Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções."
    : "Reuso: condicionado à mesma evidência verificada, estado declarado e build original.", "");
  if (c.flags.length) lines.push(`Sinalizações: ${c.flags.join(" · ")}`, "");
  return lines;
}

export function renderReview(pkg: SemanticPackage, reviews: SemanticReviews): string {
  const result = scoreSemanticPackage(pkg, reviews);
  const pending = new Set(result.scores.flatMap(s => s.pendingCardIds));
  const decisions = new Map(reviews.decisions.map(d => [d.cardId, d]));
  const lines = ["# Revisão semântica — pacote fechado", "",
    `Versão: ${pkg.version} · ${pkg.cards.length} cartões únicos · ${pending.size} pendentes`, "",
    "Este pacote inclui todas as alegações selecionadas, inclusive as que casariam por regra.",
    "Candidatos são sugestões de âncora, não vereditos. Você continua sendo a adjudicadora.",
    "Edite reviews.json; depois gere uma NOVA saída com score. Não edite package.json.", "",
    "Evidência da execução (achado-2) aponta para a cópia preservada do que as ferramentas gravaram durante a execução; confira-a antes das reconstruções.",
    "As capturas scene-* são reconstruções no momento de preparar o pacote, não prova de que o agente observou o mesmo estado.",
    "Confira também reportedEvidence, inclusive as limitações declaradas. Use unresolved quando não houver suporte.", "",
    "Cartões de linha de base (origem determinística) são revisados como os do agente: é o que permite dizer o que o agente acrescenta ou perde em relação à ferramenta.",
    "Cena = janela do plano de estados. Uma unidade só pode ser creditada por cartão da mesma cena.", "",
    "Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.",
    "Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.",
    'Duplicatas revisadas: no átomo repetido, acrescente duplicateOf: { "cardId": "C-...", "atomId": "..." }. A citação continua avaliada separadamente.', ""];
  for (const c of pkg.cards) {
    const d = decisions.get(c.id);
    lines.push(`## ${c.id}`, "", `Estado: ${pending.has(c.id) ? "pendente" : "concluído"}`, "", ...claim(c),
      "### Sujeitos", "",
      ...c.subjects.map(s => `- ${JSON.stringify(s.id)} — ${s.label}${s.hidden ? ` · **oculto**: ${s.hidden}` : ""}`), "",
      "### Unidades candidatas (não são crédito)", "");
    for (const id of c.candidateUnitIds) {
      const u = pkg.units.find(u => u.id === id)!;
      lines.push(`- ${id} — ${u.specId} · ${u.state} · cena ${u.scene} · ${u.element.label}: ${u.description}`);
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
    lines.push("", "### Evidência declarada", "", "````json", JSON.stringify(c.reportedEvidence, null, 2), "````", "",
      "### Decisão", "", "````json", JSON.stringify(d, null, 2), "````", "");
  }
  return lines.join("\n");
}
