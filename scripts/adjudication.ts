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
import type { AdjudicationRecord, Adjudications, AgentFinding } from "../types";

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
  if (r.verdict === "vocabulario" && !r.unit?.rule) return "verdict `vocabulario` sem `unit` alvo";
  return null;
}
