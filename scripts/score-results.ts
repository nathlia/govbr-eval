/**
 * Evaluation scorer
 *
 * Two granularities:
 *  1. Case level — per-case boolean detection for the three-tool comparison
 *     (axe-core, eslint-a11y, agent), as in the pilot.
 *  2. Element × rule (E3) — agent findings matched against expected units
 *     (case × normative rule), with P/R/F1 per violation category and
 *     macro/micro aggregates (F1).
 *
 * Agent findings may be structured ({ rule, description }) or legacy strings —
 * for strings, rule ids are parsed from the normative citations in the text.
 *
 * Usage:
 *   npm run score
 *   npm run score:verbose    (per-case + per-unit breakdown)
 *   npm run score:json       (machine-readable metrics)
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { AgentResults, AxeResults, EslintResults, OrganicGroundTruth, ToolKey } from "../types";
import { ROOT, RUN_DIRS, loadAdjudications } from "./adjudication";
import {
  cases, expandWithKbAliases, expectedUnits, loadJson, normalizeRuleId, rulesOfFinding,
  scoreUnits, type FalseFinding, type UnitScore,
} from "./units";

const VERBOSE = process.argv.includes("--verbose");
const JSON_OUT = process.argv.includes("--json");

// ── Load files ────────────────────────────────────────────────────────────────

const axeRaw    = loadJson<AxeResults>("results/axe-results.json");
const agentRaw  = loadJson<AgentResults>("results/agent-results.json");
const eslintRaw = loadJson<EslintResults>("results/eslint-results.json");
const organicGt = loadJson<OrganicGroundTruth>("organic-ground-truth.json");

// Human verdicts on findings that matched no unit (D-21). Absent file = every leftover charged
// as FP, which is the floor the scorer reported before adjudication existed.
const adj = loadAdjudications();

type ActualMap = Record<string, boolean>;
type Outcome = "TP" | "FP" | "FN" | "TN";


// ── Case-level maps (three-tool comparison, as in the pilot) ─────────────────

function buildAxeActual(): ActualMap | null {
  if (!axeRaw?.results) return null;
  const map: ActualMap = {};
  for (const [id, c] of Object.entries(cases)) {
    if (axeRaw.results[c.page]) map[id] = map[id] ?? false;
  }
  for (const pageData of Object.values(axeRaw.results)) {
    for (const [caseId, viols] of Object.entries(pageData.byCaseId ?? {})) {
      if (viols.length > 0) map[caseId] = true;
    }
  }
  return map;
}

function buildAgentActual(raw: AgentResults | null): ActualMap | null {
  if (!raw?.verdicts || raw._empty) return null;
  const map: ActualMap = {};
  for (const [id, v] of Object.entries(raw.verdicts)) {
    map[id] = v.detected === true;
  }
  return map;
}

// ── Build eslint actual detection map (measured baseline, F2) ────────────────
// eslint-results.json: { byCaseId: { "TC-B-11": [...] } } — files linted cover all cases.

function buildEslintActual(): ActualMap | null {
  if (!eslintRaw?.byCaseId) return null;
  const map: ActualMap = {};
  for (const id of Object.keys(cases)) map[id] = false;
  for (const [caseId, findings] of Object.entries(eslintRaw.byCaseId)) {
    if (findings.length > 0) map[caseId] = true;
  }
  return map;
}

interface CaseRow {
  id: string;
  truth: boolean;
  actual: boolean | "?";
  outcome: Outcome | "missing";
}

interface Metrics {
  TP: number; FP: number; FN: number; TN: number;
  missing: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  rows: CaseRow[];
}

function computeCaseMetrics(toolKey: ToolKey, actualMap: ActualMap | null, scoreReferenceCases = false): Metrics {
  const rows: CaseRow[] = [];
  let TP = 0, FP = 0, FN = 0, TN = 0, missing = 0;

  for (const [id, c] of Object.entries(cases)) {
    const expected = c.detection[toolKey];
    const hasViolation = c.violations.length > 0;
    const actual = actualMap?.[id];

    // Reference cases (expected === null): for measured tools they still count —
    // flagging one is a false positive. Skipped only for expected-value pseudo-tools.
    if (expected === null) {
      if (!scoreReferenceCases || actual === undefined) continue;
      if (actual) { FP++; rows.push({ id, truth: false, actual, outcome: "FP" }); }
      else        { TN++; rows.push({ id, truth: false, actual, outcome: "TN" }); }
      continue;
    }

    if (actual === undefined) {
      missing++;
      rows.push({ id, truth: hasViolation, actual: "?", outcome: "missing" });
      continue;
    }

    let outcome: Outcome;
    if (hasViolation && actual)       { TP++; outcome = "TP"; }
    else if (!hasViolation && actual) { FP++; outcome = "FP"; }
    else if (hasViolation && !actual) { FN++; outcome = "FN"; }
    else                              { TN++; outcome = "TN"; }

    rows.push({ id, truth: hasViolation, actual, outcome });
  }

  return { TP, FP, FN, TN, missing, ...prf(TP, FP, FN), rows };
}

function prf(TP: number, FP: number, FN: number): { precision: number | null; recall: number | null; f1: number | null } {
  const precision = TP + FP === 0 ? null : TP / (TP + FP);
  const recall    = TP + FN === 0 ? null : TP / (TP + FN);
  const f1 = precision !== null && recall !== null && (precision + recall) > 0
    ? 2 * precision * recall / (precision + recall)
    : null;
  return { precision, recall, f1 };
}


interface CategoryMetrics {
  category: string;
  units: number;
  TP: number; FN: number; FP: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

function categoryMetrics(score: UnitScore): CategoryMetrics[] {
  const categories = [...new Set(expectedUnits.flatMap(u => u.categories))].sort();
  return categories.map(category => {
    const inCat = score.outcomes.filter(o => o.unit.categories.includes(category));
    const TP = inCat.filter(o => o.matched).length;
    const FN = inCat.filter(o => !o.matched).length;
    const FP = score.falseFindings.filter(f => f.categories.includes(category)).length;
    return { category, units: inCat.length, TP, FN, FP, ...prf(TP, FP, FN) };
  });
}

// ── Organic wing (D-13) — separate suite, NEVER pooled with injected metrics ──

interface OrganicCaseResult {
  caseId: string;
  fragment: string;
  axe: boolean | "not measured";
  agent: boolean | "not run";
  agentRuleVerified: boolean;
}

interface OrganicScore {
  results: OrganicCaseResult[];
  axe: { TP: number; FN: number; measured: boolean };
  agent: { TP: number; FN: number; FP: number; ruleVerifiedTP: number; ran: boolean };
}

function scoreOrganic(): OrganicScore | null {
  if (!organicGt) return null;
  const caseIds = Object.keys(organicGt.cases);

  // axe: any organic-page run that attributed violations to the case
  const axeMap: Record<string, boolean> = {};
  let axeMeasured = false;
  if (axeRaw?.results) {
    for (const [pageName, pageData] of Object.entries(axeRaw.results)) {
      if (!pageName.startsWith("organic")) continue;
      axeMeasured = true;
      for (const [caseId, viols] of Object.entries(pageData.byCaseId ?? {})) {
        if (viols.length > 0) axeMap[caseId] = true;
      }
    }
  }

  const agentRan = Boolean(agentRaw?.verdicts && !agentRaw._empty && caseIds.some(id => agentRaw.verdicts[id]));
  let agentFP = 0;

  const results: OrganicCaseResult[] = caseIds.map(caseId => {
    const c = organicGt.cases[caseId];
    const expectedRules = c.violations.flatMap(v => expandWithKbAliases(v.rules.map(normalizeRuleId)));
    const verdict = agentRaw?.verdicts?.[caseId];
    const findings = (verdict?.detected ? verdict.violations_found : []).map(rulesOfFinding);
    const matched = findings.filter(f => f.rules.some(r => expectedRules.includes(r)));
    const detected = Boolean(verdict?.detected);
    if (detected && c.violations.length > 0) agentFP += findings.length - Math.min(matched.length, c.violations.length);
    return {
      caseId,
      fragment: c.fragment,
      axe: axeMeasured ? Boolean(axeMap[caseId]) : ("not measured" as const),
      agent: agentRan ? detected : ("not run" as const),
      agentRuleVerified: matched.length > 0,
    };
  });

  return {
    results,
    axe: {
      TP: results.filter(r => r.axe === true).length,
      FN: axeMeasured ? results.filter(r => r.axe === false).length : 0,
      measured: axeMeasured,
    },
    agent: {
      TP: results.filter(r => r.agent === true).length,
      FN: agentRan ? results.filter(r => r.agent === false).length : 0,
      FP: agentFP,
      ruleVerifiedTP: results.filter(r => r.agent === true && r.agentRuleVerified).length,
      ran: agentRan,
    },
  };
}

// ── Format helpers ────────────────────────────────────────────────────────────

function pct(v: number | null): string {
  if (v === null) return "  —   ";
  return (v * 100).toFixed(1).padStart(5) + "%";
}

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}

function outcomeSymbol(o: CaseRow["outcome"]): string {
  return { TP: "✓", FP: "!", FN: "✗", TN: "·", missing: "?" }[o] ?? o;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const axeActual    = buildAxeActual();
const agentActual  = buildAgentActual(agentRaw);
const eslintActual = buildEslintActual();

interface ToolEntry {
  key: ToolKey;
  label: string;
  actual: ActualMap | null;
  source: string;
  note?: string;
}

const tools: ToolEntry[] = [
  { key: "axe",        label: "axe-core",    actual: axeActual,   source: axeRaw   ? `run ${axeRaw.timestamp?.slice(0, 16)}` : "not run" },
  { key: "eslint_a11y",label: "eslint-a11y", actual: null,        source: "expected values only (no runtime runner)" },
  { key: "agent",      label: "Agent",       actual: agentActual, source: agentActual && agentRaw ? `run ${agentRaw.timestamp?.slice(0, 16)} — ${agentRaw.model}` : "not run — execute /evaluate-all first" },
];

if (eslintActual && eslintRaw) {
  tools[1].actual = eslintActual;
  tools[1].source = `run ${eslintRaw.timestamp?.slice(0, 16)} — ${eslintRaw.config}`;
} else {
  // Fallback: expected values from the gabarito (no measured run available)
  const eslintExpected: ActualMap = {};
  for (const [id, c] of Object.entries(cases)) {
    if (c.detection.eslint_a11y !== null) {
      eslintExpected[id] = c.detection.eslint_a11y === true;
    }
  }
  tools[1].actual = eslintExpected;
  tools[1].note   = "(expected — not yet measured empirically)";
}

// Measured tools are scored on reference cases too (flagging one = FP); only the
// expected-values eslint fallback keeps reference cases out of its score.
const eslintMeasured = eslintActual !== null;
const metrics = tools.map(t => ({ ...t, ...computeCaseMetrics(t.key, t.actual, t.key !== "eslint_a11y" || eslintMeasured) }));
const unitScore = scoreUnits(agentRaw, adj);
const catMetrics = unitScore ? categoryMetrics(unitScore) : null;

// ── Multi-run statistics (F3) ─────────────────────────────────────────────────

/**
 * Archived-run summary carrying its CONFIGURATION (D-17).
 *
 * Runs that differ in arm, model or corpus coverage are different experiments and are never
 * pooled into one mean ± SD — same principle as D-13 (organic × injected) and D-16 (ablation
 * arms). Coverage is DERIVED, not declared: a run that produced verdicts for a different set of
 * gabarito cases did not see the same corpus, so its numbers are not comparable regardless of
 * what any metadata claims. That is what caught the pilot being averaged with a later run.
 */
interface RunSummary {
  file: string;
  dir: string;
  arm: string;
  label: string | null;
  timestamp: string;
  model: string;
  coveredCases: number;
  totalCases: number;
  configKey: string;
  /** Floor (D-19): every finding without a matching unit charged as a false positive. */
  precision: number | null;
  recall: number | null;
  f1: number | null;
  FP: number;
  /** After human verdicts (D-21). Provisional while `pending` > 0 — same numbers as the floor
   *  when nothing has been judged, which is why both are always printed. */
  precisionAdj: number | null;
  recallAdj: number | null;
  f1Adj: number | null;
  FPAdj: number;
  pending: number;
  wallClockSeconds: number | null;
  toolCalls: number | null;
}

interface RunGroup {
  key: string;
  arm: string;
  model: string;
  coveredCases: number;
  totalCases: number;
  label: string | null;
  runs: RunSummary[];
}


function loadRuns(): RunSummary[] {
  const summaries: RunSummary[] = [];
  const gabaritoCases = Object.keys(cases).length;

  for (const { dir: sub, arm: dirArm, label: dirLabel } of RUN_DIRS) {
    const dir = join(ROOT, "results", sub);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter(f => f.startsWith("agent-") && f.endsWith(".json")).sort()) {
      try {
        const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as AgentResults;
        const score = scoreUnits(raw, adj);
        if (!score) continue;

        // An explicit config block wins over the directory convention.
        const arm   = raw.config?.arm   ?? dirArm;
        const label = raw.config?.label ?? dirLabel;

        // Derived from the data: how many gabarito cases this run actually judged.
        const coveredCases = Object.keys(raw.verdicts ?? {}).filter(id => id in cases).length;

        summaries.push({
          file,
          dir: sub,
          arm,
          label,
          timestamp: raw.timestamp,
          model: raw.model,
          coveredCases,
          totalCases: gabaritoCases,
          // O protocolo é uma dimensão de configuração como arm, modelo e cobertura: a execução
          // de 2026-08-19 rodou sob o protocolo contaminado (D-18) e não é comparável com as que
          // rodaram sob o protocolo neutro. Sem o rótulo na chave, as duas caíam no mesmo grupo e
          // a média saía entre desenhos experimentais diferentes — o defeito de D-13/D-16/D-17
          // pela quarta vez. Execução sem rótulo não é assumida comparável: vira grupo próprio.
          configKey: `${arm} | ${raw.model} | ${coveredCases}/${gabaritoCases} casos | ${label ?? "protocolo não rotulado"}`,
          ...prf(score.floor.TP, score.floor.FP, score.floor.FN),
          FP: score.floor.FP,
          ...(() => {
            const a = prf(score.TP, score.FP, score.FN);
            return { precisionAdj: a.precision, recallAdj: a.recall, f1Adj: a.f1 };
          })(),
          FPAdj: score.FP,
          pending: score.pending.length,
          wallClockSeconds: raw.cost?.wallClockSeconds ?? null,
          toolCalls: raw.cost?.toolCalls ?? null,
        });
      } catch { /* skip unreadable run files */ }
    }
  }
  return summaries;
}

/** Group by configuration. Aggregation happens INSIDE a group, never across groups. */
function groupRuns(rs: RunSummary[]): RunGroup[] {
  const byKey = new Map<string, RunGroup>();
  for (const r of rs) {
    let g = byKey.get(r.configKey);
    if (!g) {
      g = {
        key: r.configKey,
        arm: r.arm,
        model: r.model,
        coveredCases: r.coveredCases,
        totalCases: r.totalCases,
        label: r.label,
        runs: [],
      };
      byKey.set(r.configKey, g);
    }
    g.runs.push(r);
  }
  return [...byKey.values()];
}

function meanSd(values: number[]): { mean: number; sd: number | null } {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (values.length < 2) return { mean, sd: null };
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
  return { mean, sd };
}

const runs = loadRuns();
const organicScore = scoreOrganic();

if (JSON_OUT) {
  const out: Record<string, unknown> = {};
  for (const m of metrics) {
    out[m.key] = { TP: m.TP, FP: m.FP, FN: m.FN, TN: m.TN,
      precision: m.precision, recall: m.recall, f1: m.f1, source: m.source };
  }
  if (unitScore && catMetrics) {
    const defined = catMetrics.filter(c => c.f1 !== null);
    out.agent_units = {
      TP: unitScore.TP, FN: unitScore.FN, FP: unitScore.FP,
      ruleVerifiedTP: unitScore.ruleVerifiedTP,
      ...prf(unitScore.TP, unitScore.FP, unitScore.FN),
      // D-21: the floor travels with the adjudicated figure. A consumer that reads only one of
      // the two is reading a number whose provenance it cannot state.
      adjudication: {
        adjudicatedTP: unitScore.adjudicatedTP,
        unmatchedFindings: unitScore.unmatchedFindings.length,
        pending: unitScore.pending.length,
        gaps: unitScore.gaps.length,
        duplicates: unitScore.duplicates.length,
        provisional: unitScore.pending.length > 0,
        floor: { ...unitScore.floor, ...prf(unitScore.floor.TP, unitScore.floor.FP, unitScore.floor.FN) },
      },
      perCategory: catMetrics,
      macro: {
        precision: defined.length ? defined.reduce((s, c) => s + (c.precision ?? 0), 0) / defined.length : null,
        recall:    defined.length ? defined.reduce((s, c) => s + (c.recall ?? 0), 0) / defined.length : null,
        f1:        defined.length ? defined.reduce((s, c) => s + (c.f1 ?? 0), 0) / defined.length : null,
      },
    };
  }
  if (organicScore) {
    // D-13: separate key — consumers must not merge this with the main metrics
    out.organic = {
      pooling: "NEVER pooled with injected-corpus metrics (D-13)",
      cases: organicScore.results,
      axe: organicScore.axe,
      agent: organicScore.agent,
    };
  }
  if (runs.length) {
    // D-17: grouped by configuration; consumers must not merge groups.
    out.runs = {
      pooling: "grouped by configuration (arm | model | corpus coverage); NEVER pooled across groups (D-17)",
      count: runs.length,
      groups: groupRuns(runs).map(g => {
        const gf1 = g.runs.map(r => r.f1).filter((v): v is number => v !== null);
        const gf1Adj = g.runs.map(r => r.f1Adj).filter((v): v is number => v !== null);
        const gw  = g.runs.map(r => r.wallClockSeconds).filter((v): v is number => v !== null);
        return {
          config: g.key,
          arm: g.arm,
          model: g.model,
          label: g.label,
          partialCoverage: g.coveredCases < g.totalCases,
          coveredCases: g.coveredCases,
          totalCases: g.totalCases,
          count: g.runs.length,
          runs: g.runs,
          f1: gf1.length >= 2 ? meanSd(gf1) : null,
          f1Adjudicated: gf1Adj.length >= 2 ? meanSd(gf1Adj) : null,
          pending: g.runs.reduce((s, r) => s + r.pending, 0),
          wallClockSeconds: gw.length >= 2 ? meanSd(gw) : null,
        };
      }),
    };
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const violationCases = Object.values(cases).filter(c => c.violations.length > 0).length;
const referenceCases = Object.values(cases).filter(c => c.violations.length === 0).length;
const totalCases     = Object.keys(cases).length;

console.log("\n=== govbr-ds Validator — Evaluation Results ===\n");
console.log(`Ground-truth: ${totalCases} cases (${violationCases} violations, ${referenceCases} reference) · ${expectedUnits.length} expected units (element × rule)`);
console.log();

// Case-level summary table
console.log(
  pad("Tool", 14) +
  pad("TP",  5) + pad("FP",  5) + pad("FN",  5) + pad("TN",  5) +
  pad("Precision", 12) + pad("Recall",  10) + pad("F1",  10) +
  "Source"
);
console.log("─".repeat(90));

for (const m of metrics) {
  console.log(
    pad(m.label, 14) +
    pad(m.TP,  5) + pad(m.FP,  5) + pad(m.FN,  5) + pad(m.TN,  5) +
    pad(pct(m.precision), 12) + pad(pct(m.recall), 10) + pad(pct(m.f1), 10) +
    m.source + (m.note ? `  ${m.note}` : "")
  );
}

console.log();

// Agent-only highlight
const agentOnlyCases = Object.entries(cases).filter(([, c]) =>
  c.violations.length > 0 &&
  c.detection.axe === false &&
  c.detection.eslint_a11y === false &&
  c.detection.agent === true
);
console.log(`Agent-only detections (expected): ${agentOnlyCases.length} / ${violationCases} violation cases`);
console.log(`  → ${agentOnlyCases.map(([id]) => id).join(", ")}`);

if (agentActual) {
  const actualAgentOnly = agentOnlyCases.filter(([id]) => agentActual[id] === true);
  console.log(`Agent-only detections (actual):   ${actualAgentOnly.length} / ${agentOnlyCases.length} correctly found`);
}

console.log();

// ── Agent element × rule section (E3 + F1) ───────────────────────────────────

if (unitScore && catMetrics) {
  const floor = prf(unitScore.floor.TP, unitScore.floor.FP, unitScore.floor.FN);
  const u     = prf(unitScore.TP, unitScore.FP, unitScore.FN);
  console.log("=== Agent — element × rule (E3) ===\n");

  // Two rows on purpose (D-21). The floor is what the run measures with no human judgement in
  // it; the adjudicated row is what it measures once each unmatched finding has been judged.
  // The adjudicated row never replaces the floor — a reader has to be able to see how much of
  // the number came from the agent and how much from a decision about the gabarito.
  console.log(
    pad(`Units: ${expectedUnits.length}`, 14) +
    pad("piso", 12) +
    pad(`TP ${unitScore.floor.TP}`, 8) + pad(`FN ${unitScore.floor.FN}`, 8) + pad(`FP ${unitScore.floor.FP}`, 8) +
    `micro  P ${pct(floor.precision)}  R ${pct(floor.recall)}  F1 ${pct(floor.f1)}`
  );
  const provisional = unitScore.pending.length > 0;
  console.log(
    pad("", 14) +
    pad(provisional ? "adjudicado*" : "adjudicado", 12) +
    pad(`TP ${unitScore.TP}`, 8) + pad(`FN ${unitScore.FN}`, 8) + pad(`FP ${unitScore.FP}`, 8) +
    `micro  P ${pct(u.precision)}  R ${pct(u.recall)}  F1 ${pct(u.f1)}`
  );
  console.log(`Rule-verified matches: ${unitScore.ruleVerifiedTP} / ${unitScore.TP} TP (remainder matched at case level without a recognizable rule id)`);
  if (unitScore.adjudicatedTP) {
    console.log(`Adjudicated matches (vocabulário): ${unitScore.adjudicatedTP} — unidade certa sob nome que o scorer não conhece`);
  }
  if (provisional) {
    console.log(`* ${unitScore.pending.length} de ${unitScore.unmatchedFindings.length} achados sem unidade ainda não julgados — seguem cobrados como FP.`);
    console.log(`  Enquanto houver pendentes, a precisão dos dois braços é PISO, não medida (D-19). Rode 'npm run adjudicate'.`);
  }
  if (unitScore.gaps.length) {
    console.log(`Lacunas de gabarito reconhecidas: ${unitScore.gaps.length} — fora do FP e fora do TP; dívida a escrever em ground-truth.json (D-06).`);
  }
  if (unitScore.duplicates.length) {
    console.log(`Duplicados: ${unitScore.duplicates.length} — reformulações de achados já casados no mesmo caso.`);
  }
  console.log();

  console.log(
    pad("Category", 16) + pad("Units", 7) +
    pad("TP", 5) + pad("FN", 5) + pad("FP", 5) +
    pad("Precision", 12) + pad("Recall", 10) + "F1"
  );
  console.log("─".repeat(70));
  for (const c of catMetrics) {
    console.log(
      pad(c.category, 16) + pad(c.units, 7) +
      pad(c.TP, 5) + pad(c.FN, 5) + pad(c.FP, 5) +
      pad(pct(c.precision), 12) + pad(pct(c.recall), 10) + pct(c.f1)
    );
  }
  const defined = catMetrics.filter(c => c.f1 !== null);
  if (defined.length) {
    const mp = defined.reduce((s, c) => s + (c.precision ?? 0), 0) / defined.length;
    const mr = defined.reduce((s, c) => s + (c.recall ?? 0), 0) / defined.length;
    const mf = defined.reduce((s, c) => s + (c.f1 ?? 0), 0) / defined.length;
    console.log("─".repeat(70));
    console.log(pad("macro avg", 38) + pad(pct(mp), 12) + pad(pct(mr), 10) + pct(mf));
  }
  console.log("\nNote: a unit may carry multiple categories — it counts in each (columns do not sum to the total).");
  console.log();

  if (unitScore.unmatchedFindings.length) {
    console.log("Findings without a matching unit (unit granularity):");
    for (const f of unitScore.unmatchedFindings) {
      const status = f.verdict ?? "PENDENTE";
      console.log(`  • [${f.caseId}${f.onReferenceCase ? " — reference case" : ""}] ${status} · ${f.id}`);
      console.log(`    ${f.description.slice(0, 100)}${f.description.length > 100 ? "…" : ""}`);
      console.log(`    rules: ${f.rules.join(", ") || "(none recognized)"} · categories: ${f.categories.join(", ")}`);
    }
    console.log();
  }

  if (VERBOSE) {
    console.log("Per-unit outcomes:");
    for (const o of unitScore.outcomes) {
      const sym = o.matched ? (o.ruleVerified ? "✓" : "≈") : "✗";
      const via = o.matched ? (o.ruleVerified ? `via ${o.matchedRule}` : "case-level (rule not verified)") : "NOT DETECTED";
      console.log(`  ${sym} ${pad(o.unit.caseId, 10)} [${o.unit.rules.join(", ")}] ${via}`);
    }
    console.log("\nLegend: ✓ = rule-verified match  ≈ = case-level fallback  ✗ = missed unit");
    console.log();
  }
}

// ── Organic wing report (D-13) — printed separately, never pooled ─────────────

if (organicScore) {
  console.log("=== Organic wing (exploratory, D-13) — official-package defects, NEVER pooled ===\n");
  console.log(
    pad("Case", 10) + pad("Fragment", 42) + pad("axe", 15) + pad("Agent", 12) + "Rule-verified"
  );
  console.log("─".repeat(92));
  for (const r of organicScore.results) {
    console.log(
      pad(r.caseId, 10) +
      pad(r.fragment.replace("dist/components/", ""), 42) +
      pad(String(r.axe), 15) +
      pad(String(r.agent), 12) +
      (r.agent === true ? (r.agentRuleVerified ? "✓" : "≈") : "—")
    );
  }
  console.log("─".repeat(92));
  const oa = organicScore.axe;
  const og = organicScore.agent;
  console.log(
    `axe: ${oa.measured ? `${oa.TP}/${oa.TP + oa.FN} defects detected` : "not measured — npm run axe"} · ` +
    `Agent: ${og.ran ? `${og.TP}/${og.TP + og.FN} detected (${og.ruleVerifiedTP} rule-verified, ${og.FP} FP)` : "not run — /evaluate-all"}`
  );
  console.log("These 6 defects are ORGANIC (present in @govbr-ds/core 3.7.0 itself) — the oracle-problem");
  console.log("argument: the validator catches defects in the very artifact it learned from. TC-O-05/06");
  console.log("share the broken-aria-labelledby mechanism with injected TC-F-11 (see organic-ground-truth _meta).");
  console.log();
}

// ── Multi-run report (F3/F4), grouped by configuration (D-17) ────────────────

if (runs.length) {
  const groups = groupRuns(runs);
  console.log(`=== Multi-run statistics (F3) — ${runs.length} archived run(s) in ${groups.length} configuration(s) ===\n`);

  if (groups.length > 1) {
    console.log("Configurations are reported separately and NEVER pooled: runs differing in arm,");
    console.log("model, corpus coverage or protocol are different experiments (D-13 / D-16 / D-17 / D-18).\n");
  }

  for (const g of groups) {
    console.log(`── ${g.key} — ${g.runs.length} run(s)`);

    if (!g.label) {
      console.log(`   ⚠ execução sem rótulo de protocolo: anterior ao D-18, portanto conduzida sob o`);
      console.log(`     protocolo que carregava normas do DS. Não é braço de experimento e não entra`);
      console.log(`     em média com execuções de protocolo neutro.`);
    }

    if (g.coveredCases < g.totalCases) {
      console.log(`   ⚠ cobertura parcial: julgou ${g.coveredCases} dos ${g.totalCases} casos do gabarito atual.`);
      console.log(`     A revocação abaixo é limitada por construção — não compare com execuções de cobertura total.`);
    }

    console.log(
      pad("Run", 22) + pad("Model", 20) +
      pad("P piso", 9) + pad("R piso", 9) + pad("F1 piso", 10) +
      pad("F1 adj", 10) + pad("FP", 5) + pad("pend.", 7) +
      pad("Wall (s)", 10) + "Tool calls"
    );
    console.log("─".repeat(112));
    for (const r of g.runs) {
      console.log(
        pad(r.timestamp.slice(0, 19), 22) + pad(r.model.slice(0, 18), 20) +
        pad(pct(r.precision), 9) + pad(pct(r.recall), 9) + pad(pct(r.f1), 10) +
        pad(pct(r.f1Adj) + (r.pending ? "*" : " "), 10) + pad(r.FP, 5) + pad(r.pending, 7) +
        pad(r.wallClockSeconds ?? "—", 10) + (r.toolCalls ?? "—")
      );
    }
    const groupPending = g.runs.reduce((s, r) => s + r.pending, 0);
    if (groupPending) {
      console.log(`   * ${groupPending} achado(s) sem unidade ainda não julgado(s) nesta configuração — F1 adj ainda é provisório (D-21).`);
    }

    const f1s = g.runs.map(r => r.f1).filter((v): v is number => v !== null);
    if (f1s.length >= 2) {
      const { mean, sd } = meanSd(f1s);
      console.log("─".repeat(112));
      console.log(`F1 piso (element × rule): mean ${pct(mean)} ± ${sd !== null ? pct(sd).trim() : "—"} (n=${f1s.length}, sample SD)`);
      const f1sAdj = g.runs.map(r => r.f1Adj).filter((v): v is number => v !== null);
      if (f1sAdj.length >= 2) {
        const a = meanSd(f1sAdj);
        console.log(`F1 adjudicado:            mean ${pct(a.mean)} ± ${a.sd !== null ? pct(a.sd).trim() : "—"} (n=${f1sAdj.length}, sample SD)`);
      }
      const walls = g.runs.map(r => r.wallClockSeconds).filter((v): v is number => v !== null);
      if (walls.length >= 2) {
        const w = meanSd(walls);
        console.log(`Wall-clock: mean ${w.mean.toFixed(0)}s ± ${w.sd !== null ? w.sd.toFixed(0) : "—"}s (n=${walls.length})`);
      }
    } else {
      console.log(`   F3 exige 3–5 execuções nesta MESMA configuração para média ± DP (há ${f1s.length}).`);
    }
    console.log();
  }

  const principal = groups.find(g => g.arm === "com-oraculo" && g.coveredCases === g.totalCases);
  const ablacao   = groups.find(g => g.arm === "sem-oraculo");
  if (principal && ablacao) {
    console.log("Ablação (F2): os dois braços existem, mas a comparação lado a lado ainda não é");
    console.log("emitida por este scorer — comparar médias entre braços exige que ambos tenham");
    console.log("n ≥ 3 na mesma cobertura. Veja pipeline/README.md.\n");
  } else if (!ablacao) {
    console.log("Ablação (F2): nenhuma execução sem oráculo arquivada — a comparação central do");
    console.log("trabalho ainda não existe. Rode pipeline/run-battery.ps1 -Arm sem.\n");
  }
}

// Per-case breakdown (--verbose)
if (VERBOSE) {
  console.log("=== Per-case breakdown ===\n");

  const axeCol   = metrics[0];
  const agentCol = metrics[2];

  console.log(
    pad("Case", 10) +
    pad("Category", 20) +
    pad("Truth",  8) +
    pad("axe",    8) +
    pad("eslint", 8) +
    pad("Agent",  8) +
    "Description"
  );
  console.log("─".repeat(100));

  for (const [id, c] of Object.entries(cases)) {
    const truth = c.violations.length > 0 ? "FAIL" : "pass";
    const cats  = c.categories.join("+") || "—";

    const axeOut   = axeCol.rows.find(r => r.id === id);
    const agentOut = agentCol.rows.find(r => r.id === id);

    const axeSym   = axeOut   ? outcomeSymbol(axeOut.outcome)   : (c.detection.axe === null ? "—" : "?");
    const agentSym = agentOut ? outcomeSymbol(agentOut.outcome)  : (c.detection.agent === null ? "—" : "?");

    let eslintSym = "—";
    if (c.detection.eslint_a11y !== null) {
      eslintSym = c.detection.eslint_a11y ? "✓" : "✗";
    }

    console.log(
      pad(id,   10) +
      pad(cats.slice(0, 18), 20) +
      pad(truth,  8) +
      pad(axeSym,   8) +
      pad(eslintSym, 8) +
      pad(agentSym,  8) +
      c.description
    );
  }

  console.log();
  console.log("Legend: ✓=correct detection  ✗=missed  !=false positive  ·=correct clean  ?=not run  —=reference");
}

// Data quality warnings
const warnings: string[] = [];
if (!axeRaw)    warnings.push("axe-results.json not found — run '▶ Executar axe-core' in the dashboard");
if (!agentRaw)  warnings.push("agent-results.json not found — run '/evaluate-all' first");
if (!eslintRaw) warnings.push("eslint-results.json not found — run 'npm run eslint' for the measured baseline");
if (warnings.length) {
  console.log("⚠  Warnings:");
  warnings.forEach(w => console.log(`   • ${w}`));
  console.log();
}
