/**
 * Adjudication of unmatched findings (D-21) — shared by the scorer and `npm run adjudicate`.
 *
 * The scorer charges every agent finding that matches no expected unit as a false positive.
 * "Matched nothing" and "the agent was wrong" are not the same claim, and only a human can tell
 * them apart. Until each unmatched finding is judged, precision is a FLOOR, not a measurement
 * (D-19). This module holds the parts both scripts must agree on — the run inventory, the
 * finding identity, and the verdict semantics — because the recurring defect in this codebase is
 * a configuration dimension that one script knows and the other does not (D-13/16/17/19).
 *
 * Identity is the finding's TEXT, not the run it came from, so a claim repeated across runs of a
 * battery carries one record and one verdict. It does NOT make the review arm-blind on its own:
 * measured on the archived runs, no claim is worded identically in both arms, so cross-arm
 * deduplication essentially never fires. Blindness is what `npm run adjudicate -- --blind` is
 * for — it hides the arm while judging. The arm stays recorded, because the discovery balance it
 * feeds (which arm found each gabarito gap) is the bias check that has to be reported.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  AdjudicationRecord, Adjudications, AgentFinding, ComponentVerdict, RuleId,
} from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");

/** Directories scanned for archived runs, with the arm each implies by convention (D-16/D-17). */
export const RUN_DIRS: { dir: string; arm: string; label: string | null }[] = [
  { dir: "runs",         arm: "com-oraculo", label: null },
  { dir: "runs-ablacao", arm: "sem-oraculo", label: "ablação (F2)" },
  { dir: "runs-piloto",  arm: "com-oraculo", label: "piloto" },
];
// results/runs-smoke is deliberately absent: plumbing checks on a cheap model are archived
// outside the scorer's reach and are not measurements to adjudicate.

export const ADJUDICATIONS_FILE = "adjudications.json";

/** Plain text of a finding in either archive format. */
export function findingText(f: AgentFinding): string {
  return typeof f === "string" ? f : `${f.rule} — ${f.description}`;
}

/**
 * Stable id for one finding: `<caseId>:<8 hex>`. The hash runs over case-folded text with
 * collapsed whitespace, so re-wrapping an archive does not orphan a verdict, while any change
 * to what the agent actually claimed produces a new id that must be judged afresh.
 */
export function findingId(caseId: string, f: AgentFinding): string {
  const normalized = findingText(f).toLowerCase().replace(/\s+/g, " ").trim();
  const hash = createHash("sha256").update(`${caseId}\u0000${normalized}`).digest("hex").slice(0, 8);
  return `${caseId}:${hash}`;
}

export interface AdjudicationIndex {
  byId: Map<string, AdjudicationRecord>;
  records: AdjudicationRecord[];
  /** Records whose verdict is still null — counted, never applied. */
  pending: AdjudicationRecord[];
  present: boolean;
}

export function loadAdjudications(root = ROOT): AdjudicationIndex {
  const abs = join(root, ADJUDICATIONS_FILE);
  if (!existsSync(abs)) {
    return { byId: new Map(), records: [], pending: [], present: false };
  }
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as Adjudications;
  const records = parsed.adjudications ?? [];
  const byId = new Map<string, AdjudicationRecord>();
  for (const r of records) byId.set(r.id, r);
  return { byId, records, pending: records.filter(r => r.verdict === null), present: true };
}

/**
 * A decided record is only honoured if it carries its reasons. A verdict with no rationale is an
 * assertion, not an adjudication, and `vocabulario` without a target unit cannot be applied at
 * all — both are reported as defects rather than silently changing the numbers.
 */
export function recordDefect(r: AdjudicationRecord): string | null {
  if (r.verdict === null) return null;
  if (!r.rationale?.trim()) return "sem justificativa (`rationale` vazio)";
  if ((r.verdict === "vocabulario" || r.verdict === "deteccao-correta") && !r.unit?.rule) {
    return `verdict \`${r.verdict}\` sem \`unit\` alvo`;
  }
  if (r.verdict === "composto") {
    const cs = r.components ?? [];
    if (cs.length < 2) return "verdict `composto` com menos de 2 `components`";
    for (const [i, c] of cs.entries()) {
      const at = `componente ${i + 1}`;
      if (!c.rationale?.trim()) return `${at}: sem justificativa`;
      if ((c.verdict === "vocabulario" || c.verdict === "deteccao-correta") && !c.unit?.rule) {
        return `${at}: verdict \`${c.verdict}\` sem \`unit\` alvo`;
      }
      if ((c.verdict as string) === "composto") return `${at}: \`composto\` não aninha`;
    }
  } else if (r.components?.length) {
    return `\`components\` só é aceito com verdict \`composto\` (veio com \`${r.verdict}\`)`;
  }
  return null;
}

/**
 * What one decided record does to the score, as a list of independent effects (D-30).
 *
 * A simple record yields exactly one effect, so behaviour before D-30 is unchanged. A `composto`
 * record yields one per component, which is the whole point: a claim that names a catalogued unit
 * AND an uncatalogued violation credits the first and registers the second, instead of having to
 * pick one and misreport the other.
 *
 * Both suites call this. The recurring defect in this codebase is a dimension one script knows
 * and another does not, tracked since D-13; `composto` implemented twice would have been the
 * eighth occurrence. The running count lives in tcc2-decisions-log.md — enumerating the decision
 * ids here is what let this comment drift out of step with it.
 */
export type VerdictEffect =
  | { kind: "credit"; verdict: "vocabulario" | "deteccao-correta"; unit: { caseId: string; rule: RuleId }; rationale: string }
  | { kind: "gap"; rationale: string }
  | { kind: "duplicate"; rationale: string }
  | { kind: "charge"; rationale: string };

export function effectsOf(r: AdjudicationRecord): VerdictEffect[] {
  const one = (v: ComponentVerdict, unit: { caseId: string; rule: RuleId } | undefined, why: string): VerdictEffect => {
    switch (v) {
      case "vocabulario":
      case "deteccao-correta":
        return unit?.rule
          ? { kind: "credit", verdict: v, unit, rationale: why }
          : { kind: "charge", rationale: why };
      case "lacuna-gabarito": return { kind: "gap", rationale: why };
      case "duplicado":       return { kind: "duplicate", rationale: why };
      default:                return { kind: "charge", rationale: why }; // falso-positivo | indeterminado
    }
  };

  if (r.verdict === "composto") {
    return (r.components ?? []).map(c => one(c.verdict, c.unit, c.rationale));
  }
  return r.verdict === null ? [] : [one(r.verdict, r.unit, r.rationale ?? "")];
}

/**
 * Applies the effects of one record against a scorer's unit table.
 *
 * `tryCredit` returns false when the named unit does not exist or was already matched — the
 * component is then unapplicable and falls back to a charge, exactly as a simple record does
 * today.
 *
 * The claim is charged as a false positive **once**, if any part of it resolved to a charge.
 * A claim containing a false assertion is not a clean detection even when another part of it was
 * right, and D-21's asymmetry stands: the cost of a wrong part falls on the thesis, not on the
 * instrument. Charging once rather than per component keeps FP a count of claims, not of parts.
 */
export interface AppliedRecord {
  credited: number;
  gaps: number;
  duplicates: number;
  charged: boolean;
}

export function applyRecord(
  r: AdjudicationRecord,
  tryCredit: (unit: { caseId: string; rule: RuleId }, verdict: "vocabulario" | "deteccao-correta", finding: string) => boolean,
  finding: string,
): AppliedRecord {
  const out: AppliedRecord = { credited: 0, gaps: 0, duplicates: 0, charged: false };
  for (const e of effectsOf(r)) {
    switch (e.kind) {
      case "credit":
        if (tryCredit(e.unit, e.verdict, finding)) out.credited++;
        else out.charged = true;
        break;
      case "gap":       out.gaps++; break;
      case "duplicate": out.duplicates++; break;
      case "charge":    out.charged = true; break;
    }
  }
  return out;
}
