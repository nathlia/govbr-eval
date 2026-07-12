/**
 * eslint-plugin-jsx-a11y baseline runner (F2)
 *
 * Runs the plugin's `recommended` flat config (standard usage, mirroring how a
 * project would adopt it) over the corpus page sources and maps each finding to
 * its TC-* case by line range (a finding belongs to the last section whose
 * opening tag appears at or before the finding's line).
 *
 * Usage:
 *   npm run eslint         → results/eslint-results.json (+ dashboard/public copy)
 */

import { ESLint } from "eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import type { EslintFindingRef, EslintResults } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CORPUS_SRC = process.env.CORPUS_SRC ?? join(ROOT, "..", "govbr-corpus", "src");

const FILES = [
  join(CORPUS_SRC, "pages", "ButtonPage.tsx"),
  join(CORPUS_SRC, "pages", "FormPage.tsx"),
  join(CORPUS_SRC, "pages", "NavPage.tsx"),
  join(CORPUS_SRC, "pages", "TablePage.tsx"),
  join(CORPUS_SRC, "pages", "ListPage.tsx"),
  join(CORPUS_SRC, "pages", "InteractivePage.tsx"),
];

/** line number → TC-* section, from data-testid occurrences in the source. */
function buildLineIndex(file: string): { line: number; caseId: string }[] {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const index: { line: number; caseId: string }[] = [];
  lines.forEach((text, i) => {
    const m = text.match(/data-testid="(TC-[A-Z]-\d+)"/);
    if (m) index.push({ line: i + 1, caseId: m[1] });
  });
  return index;
}

function caseIdForLine(index: { line: number; caseId: string }[], line: number): string | null {
  let current: string | null = null;
  for (const entry of index) {
    if (entry.line <= line) current = entry.caseId;
    else break;
  }
  return current;
}

async function main() {
  const eslint = new ESLint({
    // Corpus files live outside govbr-eval; without this ESLint 9 ignores them
    // ("File ignored because outside of base path").
    cwd: dirname(CORPUS_SRC),
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.tsx"],
        plugins: { "jsx-a11y": jsxA11y },
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: jsxA11y.flatConfigs.recommended.rules,
      },
    ],
  });

  console.log("Running eslint-plugin-jsx-a11y (recommended) over the corpus...\n");
  const lintResults = await eslint.lintFiles(FILES);

  const byCaseId: Record<string, EslintFindingRef[]> = {};
  const unattributed: EslintFindingRef[] = [];

  for (const result of lintResults) {
    const index = buildLineIndex(result.filePath);
    const file = basename(result.filePath);
    for (const msg of result.messages) {
      const finding: EslintFindingRef = {
        rule: msg.ruleId ?? "(parse)",
        message: msg.message,
        file,
        line: msg.line,
      };
      const caseId = caseIdForLine(index, msg.line);
      if (caseId) {
        (byCaseId[caseId] ??= []).push(finding);
      } else {
        unattributed.push(finding);
      }
    }
    console.log(`  → ${file}: ${result.messages.length} findings`);
  }

  const detected = Object.keys(byCaseId).sort();
  console.log(`\nTest cases with findings: ${detected.join(", ") || "none"}`);
  if (unattributed.length) console.log(`Unattributed findings: ${unattributed.length}`);

  const output: EslintResults = {
    timestamp: new Date().toISOString(),
    tool: "eslint-plugin-jsx-a11y (flat recommended) via ESLint API",
    config: "jsx-a11y/flat/recommended",
    filesLinted: lintResults.map((r) => basename(r.filePath)),
    byCaseId,
    unattributed,
  };

  const json = JSON.stringify(output, null, 2);
  writeFileSync(join(ROOT, "results", "eslint-results.json"), json);
  writeFileSync(join(ROOT, "dashboard", "public", "eslint-results.json"), json);
  console.log("Results written to results/eslint-results.json and dashboard/public/eslint-results.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
