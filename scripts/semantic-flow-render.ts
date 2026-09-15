/** Human-readable review cards. Renders a package and its decisions; never scores or decides. */
import { scoreSemanticPackage, type ReviewCard, type SemanticPackage, type SemanticReviews } from "./semantic-flow";

const CONTRACT: Record<ReviewCard["contract"], string> = {
  "achado-2": "achado-2 — observado, esperado, estado e evidência declarados pelo agente",
  "achado-1-legado": "achado-1 (legado, até fluxo-1.2.0) — sem estado nem evidência da execução; não satisfaz o contrato atual",
  recusado: "recusado — o coletor recusou todo relatório desta execução e a última tentativa foi arquivada como relatório dela; não satisfaz o contrato atual (motivo em Sinalizações)",
  malformado: "malformado — preservado como veio; decida pelo texto bruto em Evidência declarada",
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
  const lines = [`Contrato: ${CONTRACT[c.contract]}`, ""];
  if (c.contract === "achado-2" || (c.contract === "recusado" && (c.observed !== null || c.expected !== null))) {
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
    "Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.",
    "Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.", ""];
  for (const c of pkg.cards) {
    const d = decisions.get(c.id);
    lines.push(`## ${c.id}`, "", `Estado: ${pending.has(c.id) ? "pendente" : "concluído"}`, "", ...claim(c),
      "### Sujeitos", "", ...c.subjects.map(s => `- ${JSON.stringify(s.id)} — ${s.label}`), "",
      "### Unidades candidatas (não são crédito)", "");
    for (const id of c.candidateUnitIds) {
      const u = pkg.units.find(u => u.id === id)!;
      lines.push(`- ${id} — ${u.specId} · ${u.state} · ${u.element.label}: ${u.description}`);
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
