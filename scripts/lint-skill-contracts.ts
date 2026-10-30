/** Static contract checks for the optimized evaluation skills. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const shared = read("skills/_shared/evaluation-protocol.md");
const screen = read("skills/evaluate-screen/SKILL.md");
const all = read("skills/evaluate-all/SKILL.md");
// T2: skill única e genérica, entregue inteira como texto da tarefa nos dois braços.
const avaliar = read("skills/avaliar-tela/SKILL.md");
const failures: string[] = [];

function requireText(label: string, text: string, fragments: string[]) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) failures.push(`${label}: falta '${fragment}'`);
  }
}

function words(text: string) {
  return text.match(/\S+/g)?.length ?? 0;
}

requireText("shared", shared, ["scan_page", "compareToScanId", "12 investigações", "aceito, rejeitado"]);
requireText("evaluate-screen", screen, [
  "name: evaluate-screen",
  "../_shared/evaluation-protocol.md",
  '"selector"',
  '"findings"',
  "document.querySelectorAll",
  // fluxo-1.3.0: o contrato do achado separa observação, expectativa, estado e evidência.
  '"observed"',
  '"expected"',
  '"state"',
  '"evidence"',
  '"rule": null',
]);
requireText("evaluate-all", all, [
  "name: evaluate-all",
  "../_shared/evaluation-protocol.md",
  '"verdicts"',
  "/api/save-agent-results",
  "/static/atualizacao.html",
]);

requireText("avaliar-tela", avaliar, [
  "name: avaliar-tela",
  // Cláusula comum dos dois braços (plano T2 / PROPOSTA), literal.
  "Use as ferramentas de validação disponíveis para fundamentar a avaliação. Quando elas não estiverem disponíveis, inspecione a interface com as ferramentas de navegador e declare as incertezas. Não procure substitutos externos.",
  // D-63 / NAT-32: a janela é fixada pelo ambiente; outras larguras só pelo meio declarado.
  "A janela do navegador começa com o tamanho que o ambiente fixou",
  "Não altere o tamanho da janela",
  "{{MEIO_LARGURAS}}",
  "Se houver ferramentas de validação",
  "document.querySelectorAll",
  '"selector"', '"relatedSelectors"', '"observed"', '"expected"', '"state"', '"viewport"', '"steps"', '"evidence"',
  '"rule":null', '"rule": null', '"findings": []',
  // D-156: referências secundárias opcionais, o mesmo contrato nos três braços.
  "`references`: opcional, até duas",
  "O envio é obrigatório",
  "declare as incertezas",
  // O alvo da avaliação é escopo da tarefa, igual nos dois braços: nomes das normas e formatos de id.
  "gov.br Design System", "e-MAG e WCAG 2.2", "`emag:<seção>`", "`wcag:<critério>`", "`ds:<regra>`",
  // NAT-81: registro de inspeção comum aos braços; declaração não é comprovação; parcial por orçamento.
  "## Registro de inspeção", '"inspection"', "afirme ter coberto o que não chegou a descobrir", "`confirmed` somente com `originRef`",
  '"completion": "partial"', "a limitação `budget`",
]);
for (const forbidden of ["../_shared/", "evaluation-protocol.md", "leia o arquivo", "Antes de agir, leia"]) {
  if (avaliar.includes(forbidden)) failures.push(`avaliar-tela: não pode pedir leitura de arquivo ('${forbidden}')`);
}
const avaliarWords = words(avaliar);
// NAT-81: o registro de inspeção (seção + exemplo) acrescentou ~250 palavras, iguais nos dois braços; meta 1100 → 1250.
// Oráculo 2.15 lote 1 (D-140, revisão Codex): frases de procedimento iguais nos três braços (veredito sobre a
// regra não desmente o fato medido, contrafato medido desmente; silêncio numa especificação não é
// conformidade), ~60 palavras; meta 1250 → 1300.
// Oráculo 3.0.0 (NAT-99, nota de migração do validator): continuação por cursor ou id, próximo passo indicado em
// erro/ausência/ambiguidade, ação da ferramenta é sugestão e não conclusão; ~45 palavras, iguais nos três braços; meta 1300 → 1350.
// D-156: campo opcional `references` (até duas referências secundárias, formato de `rule`), ~30 palavras de contrato,
// iguais nos três braços e só procedimento (nenhum id nem regra); meta 1350 → 1400.
if (avaliarWords < 800 || avaliarWords > 1400) failures.push(`avaliar-tela: ${avaliarWords} palavras; meta 800–1400`);

const screenWords = words(shared) + words(screen);
// Oráculo 3.0.0 (NAT-99): continuação por cursor ou id + ação da ferramenta como sugestão, ~18 palavras; meta 800 → 820.
if (screenWords < 600 || screenWords > 820) failures.push(`evaluate-screen: ${screenWords} palavras combinadas; meta 600–820`);
const allWords = words(all);
if (allWords < 240 || allWords > 400) failures.push(`evaluate-all: ${allWords} palavras além do protocolo; meta 240–400`);
if (shared.includes("/api/save-")) failures.push("shared: destino específico deve ficar na especialização");

if (failures.length) {
  console.error(`lint:skills — ${failures.length} falha(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`lint:skills — ok (${screenWords} palavras no protocolo geral; ${allWords} na especialização TC; ${avaliarWords} em avaliar-tela)`);
