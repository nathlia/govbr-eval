/** Static contract checks for the optimized evaluation skills. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const shared = read("skills/_shared/evaluation-protocol.md");
const screen = read("skills/evaluate-screen/SKILL.md");
const all = read("skills/evaluate-all/SKILL.md");
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
]);
requireText("evaluate-all", all, [
  "name: evaluate-all",
  "../_shared/evaluation-protocol.md",
  '"verdicts"',
  "/api/save-agent-results",
  "/static/atualizacao.html",
]);

const screenWords = words(shared) + words(screen);
if (screenWords < 600 || screenWords > 800) failures.push(`evaluate-screen: ${screenWords} palavras combinadas; meta 600–800`);
const allWords = words(all);
if (allWords < 240 || allWords > 400) failures.push(`evaluate-all: ${allWords} palavras além do protocolo; meta 240–400`);
if (shared.includes("/api/save-")) failures.push("shared: destino específico deve ficar na especialização");

if (failures.length) {
  console.error(`lint:skills — ${failures.length} falha(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`lint:skills — ok (${screenWords} palavras no protocolo geral; ${allWords} na especialização TC)`);
