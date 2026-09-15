/**
 * Reviewed semantic scoring, independent of the legacy citation matcher.
 * An anchor/rule overlap is a suggestion, never an acceptance decision.
 * Input packages are immutable; author decisions are separate, context-bound data.
 */
import { createHash } from "node:crypto";
import type { FlowAgentResults } from "../types";
import type { Resolution } from "./anchors";
import type { FlowUnit } from "./units-flow";
import { FLOW_SCORING_VERSION } from "./instrument";

export const SEMANTIC_SCORING_VERSION = FLOW_SCORING_VERSION;

/** Stable across object insertion order; array order is retained deliberately. */
export function canonical(value: unknown): string {
  if (value === undefined) throw new Error("Undefined cannot be hashed");
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => compare(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}
export function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const unique = (xs: string[]): string[] => [...new Set(xs)].sort(compare);
const requireThat: (ok: unknown, message: string) => asserts ok = (ok, message) => {
  if (!ok) throw new Error(message);
};

export interface SemanticUnit extends FlowUnit { id: string }
export interface ReviewCard {
  id: string;
  selector: string;
  rule: string;
  description: string;
  /** Null key is an unresolved selector, not a real element. */
  subjects: { id: string; key: string | null; label: string }[];
  relatedKeys: string[];
  /** Hints only. Broad normative aliases do not establish defect identity. */
  candidateUnitIds: string[];
  reportedEvidence: unknown;
}
export interface SemanticRun {
  id: string;
  sourceHash: string;
  model: string;
  config: unknown;
  cost: unknown;
  cardIds: string[];
}
export interface SemanticPackage {
  version: typeof SEMANTIC_SCORING_VERSION;
  context: { referenceHash: string; sceneHash: string; scorerHash: string };
  units: SemanticUnit[];
  cards: ReviewCard[];
  runs: SemanticRun[];
  packageHash: string;
}
export interface ReviewAtom {
  id: string;
  /** Author's decomposition of the original claim; never inferred by rule regex. */
  text: string;
  subjects: string[];
  verdict: "reference" | "novel" | "false" | "unresolved";
  /** Semantically approved alternatives. One instance can earn at most one unit. */
  unitIds: string[];
  citation: "supported" | "unsupported" | "uncertain";
}
export interface SemanticDecision {
  cardId: string;
  status: "pending" | "reviewed";
  reviewer: string;
  rationale: string;
  /** Explicit assertion that every substantive clause/subject was accounted for. */
  complete: boolean;
  evidenceRefs: string[];
  atoms: ReviewAtom[];
}
export interface SemanticReviews {
  version: typeof SEMANTIC_SCORING_VERSION;
  decisions: SemanticDecision[];
}

export function prepareSemanticPackage(
  context: SemanticPackage["context"],
  units: FlowUnit[], res: Resolution,
  runs: { id: string; data: FlowAgentResults }[],
): SemanticPackage {
  const semanticUnits = units.map(u => ({ ...u, participants: unique(u.participants), rules: unique(u.rules),
    id: `U-${digest([u.specId, u.element.key, u.state])}` })).sort((a, b) => compare(a.id, b.id));
  requireThat(new Set(semanticUnits.map(u => u.id)).size === units.length, "Duplicate reference unit identity");
  const cardMap = new Map<string, ReviewCard>();
  const semanticRuns = runs.map(({ id, data }) => {
    requireThat(Array.isArray(data.findings), `Missing findings: ${id}`);
    const cardIds = data.findings.map(f => {
      requireThat(typeof f.selector === "string" && typeof f.rule === "string"
        && typeof f.description === "string" && f.description.trim(), `Invalid finding: ${id}`);
      const resolved = res.bySelector.get(f.selector);
      const keys = resolved?.ok ? unique(resolved.keys) : [];
      const subjects: ReviewCard["subjects"] = keys.length ? keys.map(key => ({
        id: key, key, label: res.byKey.get(key)?.label ?? key,
      })) : [{ id: `unresolved:${f.selector}`, key: null, label: "Seletor não resolvido" }];
      const relatedKeys = unique((f.relatedSelectors ?? []).flatMap(s => {
        const r = res.bySelector.get(s);
        return r?.ok ? r.keys : [];
      }));
      // Include full finding and run-supplied evidence/limitations. No fuzzy, case-folded,
      // rule-only or cross-state reuse. Grouped subjects remain individually accountable.
      const reportedEvidence = {
        finding: f, scope: data.scope ?? [],
        notes: (data as FlowAgentResults & { notes?: string }).notes ?? null,
      };
      const candidateUnitIds = semanticUnits.filter(u => u.participants.some(k =>
        keys.includes(k) || relatedKeys.includes(k))).map(u => u.id);
      const body = { selector: f.selector, rule: f.rule, description: f.description,
        subjects, relatedKeys, candidateUnitIds, reportedEvidence };
      const cardId = `C-${digest({ context, body, units: semanticUnits })}`;
      cardMap.set(cardId, { id: cardId, ...body });
      return cardId;
    });
    return { id, sourceHash: digest(data), model: data.model,
      config: data.config ?? null, cost: data.cost ?? null, cardIds: unique(cardIds) };
  }).sort((a, b) => compare(a.id, b.id));
  requireThat(new Set(semanticRuns.map(r => r.id)).size === runs.length, "Duplicate run id");
  const body: Omit<SemanticPackage, "packageHash"> = { version: SEMANTIC_SCORING_VERSION, context, units: semanticUnits,
    cards: [...cardMap.values()].sort((a, b) => compare(a.id, b.id)), runs: semanticRuns };
  return structuredClone({ ...body, packageHash: digest(body) });
}

export function validatePackage(pkg: SemanticPackage): void {
  requireThat(pkg.version === SEMANTIC_SCORING_VERSION, "Incompatible semantic scoring version");
  const { packageHash, ...body } = pkg;
  requireThat(digest(body) === packageHash, "Review package changed; prepare a new package");
  const cards = new Set(pkg.cards.map(c => c.id));
  requireThat(cards.size === pkg.cards.length, "Duplicate card id");
  requireThat(new Set(pkg.units.map(u => u.id)).size === pkg.units.length, "Duplicate unit id");
  requireThat(new Set(pkg.runs.map(r => r.id)).size === pkg.runs.length, "Duplicate run id");
  for (const card of pkg.cards) {
    const { id, ...cardBody } = card;
    requireThat(id === `C-${digest({ context: pkg.context, body: cardBody, units: pkg.units })}`,
      "Card content/context changed; existing review cannot be reused");
  }
  for (const r of pkg.runs) for (const id of r.cardIds) requireThat(cards.has(id), `Unknown card ${id}`);
}

export function pendingDecision(cardId: string): SemanticDecision {
  return { cardId, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [] };
}

/** Reuses only content/context-addressed cards. Other batteries never create work here. */
export function scopeReviews(pkg: SemanticPackage, old?: SemanticReviews): SemanticReviews {
  validatePackage(pkg);
  if (old) requireThat(old.version === SEMANTIC_SCORING_VERSION, "Incompatible review version");
  const byId = new Map<string, SemanticDecision>();
  for (const d of old?.decisions ?? []) {
    requireThat(!byId.has(d.cardId), `Duplicate decision ${d.cardId}`);
    byId.set(d.cardId, d);
  }
  return structuredClone({ version: SEMANTIC_SCORING_VERSION,
    decisions: pkg.cards.map(c => byId.get(c.id) ?? pendingDecision(c.id)) });
}

function anchored(subject: ReviewCard["subjects"][number], card: ReviewCard, unit: SemanticUnit): boolean {
  // An unresolved subject cannot borrow a resolved related selector to claim credit.
  return subject.key !== null && (unit.participants.includes(subject.key)
    || unit.participants.some(k => card.relatedKeys.includes(k)));
}

function validateDecision(d: SemanticDecision, card: ReviewCard, units: Map<string, SemanticUnit>): void {
  requireThat(d.status === "pending" || d.status === "reviewed", `Invalid status: ${card.id}`);
  if (d.status === "pending") {
    requireThat(!d.complete && d.atoms.length === 0, `Pending decision carries effects: ${card.id}`);
    return;
  }
  requireThat(d.complete && d.reviewer.trim() && d.rationale.trim() && d.evidenceRefs.length > 0
    && d.evidenceRefs.every(ref => typeof ref === "string" && ref.trim()), `Incomplete review: ${card.id}`);
  requireThat(d.atoms.length > 0, `Reviewed card without atoms: ${card.id}`);
  requireThat(new Set(d.atoms.map(a => a.id)).size === d.atoms.length, `Duplicate atom id: ${card.id}`);
  const covered = new Set<string>();
  for (const a of d.atoms) {
    requireThat(a.id.trim() && a.text.trim() && a.subjects.length > 0, `Incomplete atom: ${card.id}`);
    requireThat(["reference", "novel", "false", "unresolved"].includes(a.verdict), `Invalid verdict: ${a.id}`);
    requireThat(["supported", "unsupported", "uncertain"].includes(a.citation), `Invalid citation: ${a.id}`);
    requireThat(unique(a.subjects).length === a.subjects.length, `Repeated subject: ${a.id}`);
    requireThat(unique(a.unitIds).length === a.unitIds.length, `Repeated unit: ${a.id}`);
    requireThat(a.verdict === "reference" ? a.unitIds.length > 0 : a.unitIds.length === 0,
      `Only reference atoms declare nonempty unitIds: ${a.id}`);
    const subjects = a.subjects.map(id => {
      const s = card.subjects.find(s => s.id === id);
      requireThat(s, `Unknown subject: ${id}`);
      covered.add(id);
      return s;
    });
    for (const id of a.unitIds) {
      const u = units.get(id);
      requireThat(u && subjects.some(s => anchored(s, card, u)), `Unanchored/unknown unit: ${id}`);
    }
    if (a.verdict === "reference") for (const s of subjects) {
      requireThat(a.unitIds.some(id => anchored(s, card, units.get(id)!)), `Unsupported subject: ${s.id}`);
    }
  }
  requireThat(card.subjects.every(s => covered.has(s.id)), `Review omitted a subject: ${card.id}`);
}

/** Maximum-cardinality bipartite assignment with stable iteration/tie-breaking. */
export function maximumMatching(edges: Map<string, string[]>): Map<string, string> {
  const owner = new Map<string, string>();
  const visit = (left: string, seen: Set<string>): boolean => {
    for (const right of unique(edges.get(left) ?? [])) {
      if (seen.has(right)) continue;
      seen.add(right);
      const previous = owner.get(right);
      if (previous === undefined || visit(previous, seen)) {
        owner.set(right, left);
        return true;
      }
    }
    return false;
  };
  for (const left of [...edges.keys()].sort(compare)) visit(left, new Set());
  return new Map([...owner].map(([right, left]): [string, string] => [left, right]).sort(([a], [b]) => compare(a, b)));
}

export interface SemanticRunScore {
  runId: string;
  status: "complete" | "provisional";
  matched: { unitId: string; instanceId: string; cardId: string; atomId: string; citation: string }[];
  missedUnitIds: string[];
  pendingCardIds: string[];
  assertions: { instanceId: string; cardId: string; atomId: string | null; subjectId: string;
    verdict: ReviewAtom["verdict"] | "pending" | "redundant-reference";
    eligibleUnitIds: string[]; matchedUnitId: string | null }[];
  counts: { referenceUnits: number; detectedUnits: number; novelAssertions: number; falseAssertions: number;
    unresolvedAssertions: number; redundantReferenceAssertions: number };
  /** Reference F1 excludes correct novel discoveries; full-report precision is separate. */
  metrics: { confirmedReferenceRecall: number | null; referenceRecall: number | null;
    referencePrecision: number | null; referenceF1: number | null;
    assertionPrecision: number | null; citationSupport: number | null };
  families: { specId: string; detected: number; total: number }[];
}

export function scoreSemanticPackage(pkg: SemanticPackage, reviews: SemanticReviews): {
  version: string; packageHash: string; reviewHash: string; scores: SemanticRunScore[];
} {
  validatePackage(pkg);
  requireThat(reviews.version === SEMANTIC_SCORING_VERSION, "Incompatible review version");
  const units = new Map(pkg.units.map(u => [u.id, u]));
  const cards = new Map(pkg.cards.map(c => [c.id, c]));
  const decisions = new Map<string, SemanticDecision>();
  for (const d of reviews.decisions) {
    requireThat(!decisions.has(d.cardId), `Duplicate decision: ${d.cardId}`);
    const card = cards.get(d.cardId);
    requireThat(card, `Decision outside this package: ${d.cardId}; use scopeReviews for reuse`);
    validateDecision(d, card, units);
    decisions.set(d.cardId, d);
  }
  const scores = pkg.runs.map(run => {
    const edges = new Map<string, string[]>();
    const sources = new Map<string, { cardId: string; atomId: string; citation: string }>();
    const pendingCardIds: string[] = [];
    const assertions: SemanticRunScore["assertions"] = [];
    let novel = 0, incorrect = 0, unresolved = 0, citationKnown = 0, citationSupported = 0;
    for (const id of unique(run.cardIds)) {
      const card = cards.get(id)!;
      const decision = decisions.get(id);
      if (!decision || decision.status === "pending") {
        pendingCardIds.push(id);
        // A lower count of unresolved assertion instances, not an exact atom count.
        unresolved += card.subjects.length;
        for (const s of card.subjects) assertions.push({ instanceId: digest([id, null, s.id]),
          cardId: id, atomId: null, subjectId: s.id, verdict: "pending", eligibleUnitIds: [], matchedUnitId: null });
        continue;
      }
      for (const atom of [...decision.atoms].sort((a, b) => compare(a.id, b.id))) {
        for (const subjectId of unique(atom.subjects)) {
          const instanceId = digest([id, atom.id, subjectId]);
          const assertion: SemanticRunScore["assertions"][number] = { instanceId, cardId: id,
            atomId: atom.id, subjectId, verdict: atom.verdict, eligibleUnitIds: [], matchedUnitId: null };
          assertions.push(assertion);
          if (atom.verdict === "reference") {
            const subject = card.subjects.find(s => s.id === subjectId)!;
            edges.set(instanceId, atom.unitIds.filter(uid => anchored(subject, card, units.get(uid)!)));
            assertion.eligibleUnitIds = unique(edges.get(instanceId)!);
            sources.set(instanceId, { cardId: id, atomId: atom.id, citation: atom.citation });
          } else if (atom.verdict === "novel") novel++;
          else if (atom.verdict === "false") incorrect++;
          else { unresolved++; if (!pendingCardIds.includes(id)) pendingCardIds.push(id); }
          // Citation accuracy is assessed on reviewed assertions, separately from detection.
          if (atom.verdict !== "unresolved") {
            citationKnown++;
            if (atom.citation === "supported") citationSupported++;
          }
        }
      }
    }
    const matches = maximumMatching(edges);
    for (const a of assertions) if (a.verdict === "reference") {
      a.matchedUnitId = matches.get(a.instanceId) ?? null;
      if (a.matchedUnitId === null) a.verdict = "redundant-reference";
    }
    const detected = new Set(matches.values());
    const matched = [...matches].map(([instanceId, unitId]) => ({ unitId, instanceId, ...sources.get(instanceId)! }))
      .sort((a, b) => compare(a.unitId, b.unitId));
    const families = unique(pkg.units.map(u => u.specId)).map(specId => {
      const us = pkg.units.filter(u => u.specId === specId);
      return { specId, detected: us.filter(u => detected.has(u.id)).length, total: us.length };
    });
    const complete = unresolved === 0;
    const referenceRecall = pkg.units.length ? matched.length / pkg.units.length : null;
    const precisionDenominator = matched.length + novel + incorrect;
    const referencePrecisionDenominator = matched.length + incorrect;
    const f1Denominator = matched.length + pkg.units.length + incorrect;
    return {
      runId: run.id, status: complete ? "complete" as const : "provisional" as const,
      matched, missedUnitIds: pkg.units.filter(u => !detected.has(u.id)).map(u => u.id),
      pendingCardIds: unique(pendingCardIds),
      assertions: assertions.sort((a, b) => compare(a.instanceId, b.instanceId)),
      counts: { referenceUnits: pkg.units.length, detectedUnits: matched.length,
        novelAssertions: novel, falseAssertions: incorrect, unresolvedAssertions: unresolved,
        redundantReferenceAssertions: edges.size - matched.length },
      metrics: { confirmedReferenceRecall: referenceRecall, referenceRecall: complete ? referenceRecall : null,
        referencePrecision: complete && referencePrecisionDenominator ? matched.length / referencePrecisionDenominator : null,
        referenceF1: complete && f1Denominator ? 2 * matched.length / f1Denominator : null,
        assertionPrecision: complete && precisionDenominator ? (matched.length + novel) / precisionDenominator : null,
        citationSupport: complete && citationKnown ? citationSupported / citationKnown : null },
      families,
    };
  });
  return { version: SEMANTIC_SCORING_VERSION, packageHash: pkg.packageHash,
    reviewHash: digest([...reviews.decisions].sort((a, b) => compare(a.cardId, b.cardId))), scores };
}
