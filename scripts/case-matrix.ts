/**
 * Case-matrix generator (Phase 4.1, decision D-12).
 *
 * Filters the KB to the corpus candidate set — force ∈ {required, prohibited}
 * ∧ automatable ∧ automationConfidence = high — and emits a curation table
 * grouped by mechanism (validationStrategy) × component, with a *suggested*
 * knowledge category (the gabarito taxonomy: structural / token / ds-pattern /
 * emag-specific / compositional). The suggestion is a heuristic starting point
 * for human curation (Phase 4.2), not a decision.
 *
 * Output: docs/case-matrix.md (curation table) + docs/case-matrix.csv, and
 * per-stratum counts on stdout.
 *
 * Usage: npm run case-matrix
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const KB_RULES = join(ROOT, "../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl");

interface KbRule {
  id: string;
  category: string;
  subcategory?: string | null;
  component: string | null;
  title: string;
  normalizedRule: string;
  force: string;
  validationStrategy: string;
  automatable: boolean;
  automationConfidence?: string;
  severitySuggestion?: string;
  expectedEvidence: string[];
  relatedTokens: string[];
  standard?: string;
}

const rules = readFileSync(KB_RULES, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as KbRule);

// D-12 candidate filter
const candidates = rules.filter(
  (r) =>
    (r.force === "required" || r.force === "prohibited") &&
    r.automatable &&
    r.automationConfidence === "high"
);

/** Heuristic gabarito-taxonomy suggestion — curation adjusts, never trusts. */
function suggestCategory(r: KbRule): string {
  if (r.standard === "eMAG") return "emag-specific";
  if (r.validationStrategy === "computed-style" || r.relatedTokens.length > 0) return "token";
  if (r.category === "pattern" || r.category === "template" || r.category === "page") return "ds-pattern";
  if (r.component === null || r.category === "foundation") return "compositional";
  return "structural";
}

// Order mechanisms by candidate count (desc) for the report
const byMechanism = new Map<string, KbRule[]>();
for (const r of candidates) {
  if (!byMechanism.has(r.validationStrategy)) byMechanism.set(r.validationStrategy, []);
  byMechanism.get(r.validationStrategy)!.push(r);
}
const mechanisms = [...byMechanism.entries()].sort((a, b) => b[1].length - a[1].length);

// ── stdout: counts per stratum ────────────────────────────────────────────────

console.log(`\nCandidate set (D-12): ${candidates.length} / ${rules.length} KB rules`);
console.log(`(force required|prohibited ∧ automatable ∧ confidence high)\n`);
console.log("Mechanism × suggested category (candidates per stratum):\n");

const categories = ["structural", "token", "ds-pattern", "emag-specific", "compositional"];
const pad = (s: string | number, n: number) => String(s).padEnd(n);
console.log(pad("mechanism", 22) + categories.map((c) => pad(c, 15)).join("") + "total");
console.log("─".repeat(22 + 15 * categories.length + 5));
for (const [mech, list] of mechanisms) {
  const counts = categories.map((cat) => list.filter((r) => suggestCategory(r) === cat).length);
  console.log(pad(mech, 22) + counts.map((c) => pad(c || "·", 15)).join("") + list.length);
}
console.log();
console.log("Scope rulings (D-12): keyboard-interaction = agent-only wing (no deterministic checker);");
console.log("responsive-viewport n=1 — cite, do not build a wing; guard against near-duplicate cases.\n");

// ── docs/case-matrix.md ───────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
let md = `# Case matrix — curation table (Phase 4.1, D-12)

> Generated ${today} by \`scripts/case-matrix.ts\` from the validator KB (${candidates.length} candidates
> = force required|prohibited ∧ automatable ∧ automationConfidence high, of ${rules.length} KB rules).
> **Curation notes (Phase 4.2):** pick target cases per stratum, balance mechanisms and knowledge
> categories, give every violation case a conformant twin, add false-positive traps. The
> \`suggested category\` column is a heuristic — adjust freely. Record the frozen matrix in
> \`thesis-workspace/tcc2-decisions-log.md\`.
> Per-tool expected detections are NOT part of this table: they get *measured* (D-06).

`;

for (const [mech, list] of mechanisms) {
  md += `\n## ${mech} (${list.length})\n\n`;
  md += `| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (const r of list.sort((a, b) => (a.component ?? "~").localeCompare(b.component ?? "~"))) {
    const evidence = r.expectedEvidence.join("; ").replace(/\|/g, "\\|");
    md += `| ☐ | \`${r.id}\` | ${r.component ?? "—"} | ${r.force} | ${r.severitySuggestion ?? "—"} | ${suggestCategory(r)} | ${r.normalizedRule.replace(/\|/g, "\\|")} | ${evidence} |\n`;
  }
}

writeFileSync(join(ROOT, "docs/case-matrix.md"), md, "utf8");

// ── docs/case-matrix.csv ──────────────────────────────────────────────────────

const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
const csv = [
  "kb_rule_id,component,mechanism,force,severity,suggested_category,normalized_rule,expected_evidence",
  ...candidates.map((r) =>
    [
      r.id,
      r.component ?? "",
      r.validationStrategy,
      r.force,
      r.severitySuggestion ?? "",
      suggestCategory(r),
      csvEscape(r.normalizedRule),
      csvEscape(r.expectedEvidence.join("; ")),
    ].join(",")
  ),
].join("\n");
writeFileSync(join(ROOT, "docs/case-matrix.csv"), csv + "\n", "utf8");

console.log(`Wrote docs/case-matrix.md and docs/case-matrix.csv (${candidates.length} rows).`);
