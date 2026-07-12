/**
 * Generates kb-aliases.json from the validator's knowledge base (Phase 3.1).
 *
 * KB deterministic rule ids (govbr-3.7.0-…) are first-class citizens of the
 * scoring vocabulary; this map lets the scorer translate them to/from the
 * emag:/wcag: aliases so a finding matches a gabarito unit whichever form it
 * cites. GENERATED FILE — never edit kb-aliases.json by hand; re-run
 * `npm run kb:aliases` after a KB update.
 *
 * Alias extraction:
 *   emagReferences: "1.1"           → emag:1.1
 *   wcagReferences: "WCAG 2.0 2.2.2" → wcag:2.2.2 (non-numeric refs like
 *                    "Accessible Name" carry no SC number and are skipped)
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const KB_RULES = join(ROOT, "../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl");
const OUT = join(ROOT, "kb-aliases.json");

interface KbRule {
  id: string;
  force: string;
  wcagReferences?: string[];
  emagReferences?: string[];
}

const lines = readFileSync(KB_RULES, "utf8").split("\n").filter((l) => l.trim());
const aliases: Record<string, string[]> = {};
let withAliases = 0;

for (const line of lines) {
  const rule = JSON.parse(line) as KbRule;
  if (rule.force === "example") continue; // evidence records are never cited as norms (D-10)

  const set = new Set<string>();
  for (const ref of rule.emagReferences ?? []) {
    const m = ref.match(/(\d+\.\d+)/);
    if (m) set.add(`emag:${m[1]}`);
  }
  for (const ref of rule.wcagReferences ?? []) {
    const m = ref.match(/(\d+\.\d+\.\d+)/);
    if (m) set.add(`wcag:${m[1]}`);
  }

  aliases[rule.id] = [...set].sort();
  if (set.size > 0) withAliases++;
}

const out = {
  _meta: {
    generatedAt: new Date().toISOString(),
    generatedBy: "scripts/generate-kb-aliases.ts — do not edit by hand",
    source: "govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl",
    normativeRules: Object.keys(aliases).length,
    rulesWithAliases: withAliases,
  },
  aliases,
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`kb-aliases.json: ${Object.keys(aliases).length} normative KB ids, ${withAliases} with emag:/wcag: aliases`);
