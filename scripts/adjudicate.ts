/**
 * Adjudication workbench (D-21).
 *
 * Collects every agent finding that matched no expected unit, across all archived runs of both
 * arms, and reports what is judged and what is not.
 *
 * The bias this guards against: judging a claim more generously because it came from the arm the
 * work hopes will win. `--blind` is the answer — it prints the pending claims with the arm and
 * the run hidden, ordered by a key uncorrelated with either, so the verdict is formed before the
 * provenance is known. The provenance is not discarded; it is read back afterwards as the
 * discovery balance, which is a result to report rather than a knob to adjust.
 *
 * Usage:
 *   npm run adjudicate              status: decided / pending / defects / discovery balance
 *   npm run adjudicate -- --blind   pending claims with arm and run hidden — the review mode
 *   npm run adjudicate -- --verbose full text of every pending claim, grouped by case
 *   npm run adjudicate -- --emit    write stubs (verdict: null) for pending claims into
 *                                   adjudications.json, preserving decided records
 *   npm run adjudicate -- --run=2026-08-28   scope to runs whose filename matches (comma-separated)
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { AdjudicationRecord, Adjudications, AgentResults } from "../types";
import {
  ADJUDICATIONS_FILE, ROOT, RUN_DIRS, effectsOf, loadAdjudications, recordDefect,
} from "./adjudication";
import { cases, expectedUnits, normalizeRuleId, scoreUnits } from "./units";

const VERBOSE = process.argv.includes("--verbose");
const EMIT    = process.argv.includes("--emit");
const BLIND   = process.argv.includes("--blind");

/** `--run=2026-08-28,2026-08-27` — scope collection to matching run filenames. */
const RUN_FILTER = (process.argv.find(a => a.startsWith("--run=")) ?? "")
  .slice("--run=".length).split(",").map(s => s.trim()).filter(Boolean);

// ── Collect leftover findings across every archived run ──────────────────────

interface Claim {
  id: string;
  caseId: string;
  description: string;
  rules: string[];
  categories: string[];
  onReferenceCase: boolean;
  seenIn: { run: string; arm: string }[];
}

const claims = new Map<string, Claim>();
/** Per-run scores, kept so `--case=` can show what each run did with the case's units. */
const runScores: { run: string; arm: string; model: string; score: NonNullable<ReturnType<typeof scoreUnits>> }[] = [];

for (const { dir: sub, arm } of RUN_DIRS) {
  const dir = join(ROOT, "results", sub);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter(f => f.startsWith("agent-") && f.endsWith(".json")).sort()) {
    if (RUN_FILTER.length && !RUN_FILTER.some(p => file.includes(p) || sub.includes(p))) continue;
    let raw: AgentResults;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as AgentResults;
    } catch { continue; }
    const score = scoreUnits(raw);
    if (!score) continue;
    runScores.push({ run: file, arm, model: raw.model, score });
    for (const f of score.unmatchedFindings) {
      const existing = claims.get(f.id);
      if (existing) {
        existing.seenIn.push({ run: file, arm });
      } else {
        claims.set(f.id, {
          id: f.id, caseId: f.caseId, description: f.description, rules: f.rules,
          categories: f.categories, onReferenceCase: f.onReferenceCase,
          seenIn: [{ run: file, arm }],
        });
      }
    }
  }
}

const adj = loadAdjudications();

// ── --case=TC-B-03: the dossier for one case ─────────────────────────────────
//
// The unit-targeting verdicts turn on the same two questions: does the
// gabarito already carry a unit for this defect, and did the run in question already match it
// with another finding? Answering those from the raw JSON by hand is how a reviewer ends up
// marking `vocabulario` for a unit that was already matched — which the scorer then refuses to
// apply. This prints both answers per run.

const CASE = (process.argv.find(a => a.startsWith("--case=")) ?? "").slice("--case=".length);
if (CASE) {
  const caseIds = CASE === "all"
    ? [...new Set([...claims.values()].map(c => c.caseId))].sort()
    : CASE.split(",").map(s => s.trim());

  for (const caseId of caseIds) {
    const c = cases[caseId];
    const units = expectedUnits.filter(u => u.caseId === caseId);
    console.log("\n" + "=".repeat(100));
    console.log(`${caseId} — ${c?.description ?? "(fora do gabarito)"}`);
    if (units.length) {
      units.forEach((u, i) => {
        console.log(`  u${i}  [${u.rules.filter(r => !r.startsWith("govbr-") || u.rules.length < 3).slice(0, 5).join(", ")}]`);
        console.log(`      ${u.description}`);
      });
    } else {
      console.log("  ⚠ CASO DE REFERÊNCIA — nenhuma unidade esperada; todo achado aqui é lacuna ou FP");
    }

    for (const r of runScores) {
      const outs = r.score.outcomes.filter(o => o.unit.caseId === caseId);
      const lefts = r.score.unmatchedFindings.filter(f => f.caseId === caseId);
      if (!outs.length && !lefts.length) continue;
      console.log(`\n  ── ${r.arm} · ${r.model.replace("claude-", "")} · ${r.run.slice(6, 16)}`);
      for (const o of outs) {
        const i = units.indexOf(o.unit);
        const how = o.matched ? (o.ruleVerified ? `CASADA via ${o.matchedRule}` : "casada no nível do caso") : "NÃO DETECTADA";
        console.log(`     u${i}: ${how}`);
        if (o.finding) console.log(`         "${o.finding.slice(0, 88)}${o.finding.length > 88 ? "…" : ""}"`);
      }
      for (const f of lefts) {
        const v = adj.byId.get(f.id)?.verdict;
        console.log(`     SOBRA ${f.id} ${v ? `→ ${v}` : ""}  [${f.rules.join(", ") || "—"}]`);
        console.log(`         "${f.description.slice(0, 88)}${f.description.length > 88 ? "…" : ""}"`);
      }
    }
  }
  process.exit(0);
}
const decided = [...claims.values()].filter(c => {
  const r = adj.byId.get(c.id);
  return r && r.verdict !== null && !recordDefect(r);
});
const pending = [...claims.values()].filter(c => !decided.includes(c));

// ── --emit: seed stubs for everything still unjudged ─────────────────────────

if (EMIT) {
  const parsed = adj.present
    ? JSON.parse(readFileSync(join(ROOT, ADJUDICATIONS_FILE), "utf8")) as Adjudications
    : { _meta: {}, adjudications: [] as AdjudicationRecord[] };

  const byId = new Map(parsed.adjudications.map(r => [r.id, r]));
  let added = 0;
  for (const c of claims.values()) {
    const existing = byId.get(c.id);
    if (existing) {
      existing.finding = c.description;         // keep the human-readable copy current
      existing.seenIn = c.seenIn;               // provenance is derived, never hand-maintained
      continue;
    }
    byId.set(c.id, {
      id: c.id,
      caseId: c.caseId,
      finding: c.description,
      seenIn: c.seenIn,
      verdict: null,
      rationale: "",
    });
    added++;
  }

  // Stale records: a verdict about a claim that appears in no archived run. Kept (a run may be
  // re-archived) but flagged, never silently deleted.
  const stale = [...byId.entries()]
    .filter(([id, record]) => !claims.has(id) && !record.caseId.startsWith("E-"))
    .map(([id]) => id);

  const out: Adjudications = {
    _meta: {
      ...parsed._meta,
      atualizado: new Date().toISOString().slice(0, 10),
      adjudicacoes: [...byId.values()].filter(r => r.verdict !== null).length,
      pendentes: [...byId.values()].filter(r => r.verdict === null).length,
    },
    adjudications: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  writeFileSync(join(ROOT, ADJUDICATIONS_FILE), JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`adjudications.json: +${added} stub(s), ${out.adjudications.length} record(s) total.`);
  if (stale.length) console.log(`⚠ ${stale.length} registro(s) sem achado correspondente em nenhuma execução: ${stale.join(", ")}`);
  console.log("Preencha `verdict` e `rationale` em cada stub; `npm run score` conta os pendentes como FP até lá.");
  process.exit(0);
}

// ── Status report ────────────────────────────────────────────────────────────

console.log("\n=== Adjudicação de achados sem unidade (D-21) ===\n");
console.log(`Execuções varridas: ${RUN_DIRS.map(d => d.dir).join(", ")} (runs-smoke fora, por desenho)`);
console.log(`Alegações distintas sem unidade: ${claims.size}  ·  julgadas: ${decided.length}  ·  pendentes: ${pending.length}`);

if (!adj.present) {
  console.log(`\n⚠ ${ADJUDICATIONS_FILE} não existe — rode 'npm run adjudicate -- --emit' para semear os stubs.`);
}

// Records that cannot be applied: the difference between a decision and an assertion.
const defects: string[] = [];
for (const r of adj.records) {
  const d = recordDefect(r);
  if (d) defects.push(`${r.id}: ${d}`);
  if ((r.verdict === "vocabulario" || r.verdict === "deteccao-correta") && r.unit) {
    const rule = normalizeRuleId(r.unit.rule);
    const exists = expectedUnits.some(u => u.caseId === r.unit!.caseId && u.rules.includes(rule));
    if (!exists) defects.push(`${r.id}: unidade alvo ${r.unit.caseId} / ${r.unit.rule} não existe no gabarito`);
  }
  // Registros E-* pertencem à suíte de fluxo e são auditados por adjudicate-flow.ts.
  if (!claims.has(r.id) && !r.caseId.startsWith("E-")) {
    defects.push(`${r.id}: nenhum achado arquivado corresponde a este registro (obsoleto?)`);
  }
}
if (defects.length) {
  console.log(`\n⚠ ${defects.length} registro(s) não aplicável(is) — seguem cobrados como FP:`);
  for (const d of defects) console.log(`   • ${d}`);
}

// ── Discovery balance: the pooling bias this file has to keep visible ────────
//
// A gabarito gap found only by looking at the oracle arm's findings enlarges the gabarito in the
// direction of what that arm happens to report, and every unit added that way becomes a miss for
// the other arm. The count below is the check: gaps discovered in both arms are neutral, gaps
// seen in one arm only are the ones that can move the comparison.

const byVerdict = new Map<string, Claim[]>();
for (const c of claims.values()) {
  const v = adj.byId.get(c.id)?.verdict ?? "pendente";
  if (!byVerdict.has(v)) byVerdict.set(v, []);
  byVerdict.get(v)!.push(c);
}

function armsOf(c: Claim): string[] {
  return [...new Set(c.seenIn.map(s => s.arm))].sort();
}

console.log("\nPor veredito:");
for (const [verdict, list] of [...byVerdict.entries()].sort()) {
  const both = list.filter(c => armsOf(c).length > 1).length;
  console.log(`  ${verdict.padEnd(16)} ${String(list.length).padStart(3)}  (${both} presente(s) nos dois braços)`);
}

// Derivada dos EFEITOS, não do veredito de topo: um registro `composto` carrega a lacuna em um
// componente (D-30), e filtrar por `verdict === "lacuna-gabarito"` a tornaria invisível
// justamente para a checagem de viés — a mesma dimensão conhecida por um lugar do código e não
// por outro que o log vem registrando desde o D-13.
const gaps = [...claims.values()].filter(c => {
  const r = adj.byId.get(c.id);
  return r ? effectsOf(r).some(e => e.kind === "gap") : false;
});
if (gaps.length) {
  const onlyCom = gaps.filter(c => armsOf(c).join() === "com-oraculo").length;
  const onlySem = gaps.filter(c => armsOf(c).join() === "sem-oraculo").length;
  console.log("\nEquilíbrio de descoberta das lacunas (viés de pooling):");
  console.log(`  só no braço com oráculo: ${onlyCom}  ·  só no braço sem: ${onlySem}  ·  nos dois: ${gaps.length - onlyCom - onlySem}`);
  console.log("  Cada lacuna incorporada ao gabarito vira unidade nova para TODAS as execuções —");
  console.log("  inclusive as que não a encontraram. Assimetria grande aqui é achado a relatar, não a corrigir.");
  const pendentes = gaps.filter(c => {
    const r = adj.byId.get(c.id)!;
    // Num registro composto o status de incorporação é por componente de lacuna.
    return r.verdict === "composto"
      ? (r.components ?? []).some(k => k.verdict === "lacuna-gabarito" && k.gabaritoStatus !== "incorporada")
      : r.gabaritoStatus !== "incorporada";
  });
  console.log(`  Dívida de gabarito: ${pendentes.length} lacuna(s) ainda não escrita(s) em ground-truth.json (D-06: com linha de base medida).`);
}

// ── Pending list ─────────────────────────────────────────────────────────────

if (pending.length) {
  if (!BLIND) {
    // Where the pending claims come from. Runs outside the current battery — the pilot, the
    // 2026-08-19 run under the contaminated protocol (D-18) — are archived but are not arms of
    // the experiment; adjudicating them buys nothing. Scope with --run= before starting.
    const byRun = new Map<string, number>();
    for (const c of pending) {
      for (const s of c.seenIn) byRun.set(`${s.arm} · ${s.run}`, (byRun.get(`${s.arm} · ${s.run}`) ?? 0) + 1);
    }
    console.log("\nPendentes por execução:");
    for (const [run, n] of [...byRun.entries()].sort()) console.log(`  ${String(n).padStart(3)}  ${run}`);
  }

  console.log(`\n── Pendentes (${pending.length}) — contadas como FP até serem julgadas`);
  if (BLIND) {
    console.log("   modo cego: braço e execução omitidos; ordem pelo hash do achado (não correlacionada com o braço).\n");
  } else {
    console.log("   ⚠ a proveniência está visível. Para julgar, use --blind.\n");
  }

  const listing = BLIND
    ? [...pending].sort((a, b) => a.id.slice(-8).localeCompare(b.id.slice(-8)))
    : [...pending].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.id.localeCompare(b.id));

  let lastCase = "";
  for (const c of listing) {
    if (!BLIND && c.caseId !== lastCase) {
      lastCase = c.caseId;
      const isReference = (cases[c.caseId]?.violations.length ?? 0) === 0;
      console.log(`\n${c.caseId}${isReference ? "  ⚠ CASO DE REFERÊNCIA — ou não é conforme, ou o achado é FP legítimo" : ""}`);
    }
    const text = VERBOSE || BLIND ? c.description : c.description.slice(0, 110) + (c.description.length > 110 ? "…" : "");
    const provenance = BLIND ? "" : `  [${armsOf(c).join(" + ")}] ×${c.seenIn.length}`;
    const reference = BLIND && (cases[c.caseId]?.violations.length ?? 0) === 0 ? "  ⚠ caso de referência" : "";
    console.log(`  ${c.id}${provenance}${reference}`);
    console.log(`    ${text}`);
    console.log(`    regras citadas: ${c.rules.join(", ") || "(nenhuma reconhecida)"} · categorias: ${c.categories.join(", ")}`);
  }
  console.log("\nProcedimento: docs/adjudicacao.md");
}
