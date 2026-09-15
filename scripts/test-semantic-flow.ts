import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { FlowAgentResults } from "../types";
import type { Resolution } from "./anchors";
import type { FlowUnit } from "./units-flow";
import {
  digest, maximumMatching, prepareSemanticPackage, scopeReviews, scoreSemanticPackage, validatePackage,
  type SemanticDecision, type SemanticPackage, type SemanticReviews, type ReviewAtom,
} from "./semantic-flow";

const context = { referenceHash: "reference-v1", sceneHash: "scene-v1", scorerHash: "scorer-v1" };
const element = { key: "body>input", id: "E-input", label: "CPF" };
const other = { key: "body>button", id: "E-button", label: "Button" };
const resolution: Resolution = { url: "http://fixture/fluxo.html",
  byKey: new Map([[element.key, element], [other.key, other]]),
  bySelector: new Map([
    ["#cpf", { selector: "#cpf", ok: true, error: null, keys: [element.key] }],
    ["#button", { selector: "#button", ok: true, error: null, keys: [other.key] }],
    [".both", { selector: ".both", ok: true, error: null, keys: [element.key, other.key] }],
  ]) };
const units: FlowUnit[] = ["A", "B"].map(specId => ({ specId, element, participants: [element.key],
  rules: [specId === "A" ? "wcag:1.3.1" : "wcag:3.3.1"], categories: ["form"],
  description: specId === "A" ? "Help text association" : "Error identification", state: "submitted", conditional: true }));
const finding = (description: string, selector = "#cpf", rule = "wcag:1.3.1") => ({ selector, rule, description });
function run(findings = [finding("Help text is not associated")]): FlowAgentResults {
  return { model: "fixture", timestamp: "fixed", appUrl: resolution.url, findings };
}
function prepare(findings = run().findings, us = units): SemanticPackage {
  return prepareSemanticPackage(context, us, resolution, [{ id: "r1", data: run(findings) }]);
}
function atom(pkg: SemanticPackage, specIds: string[], overrides: Partial<ReviewAtom> = {}): ReviewAtom {
  return { id: "atom", text: "Reviewed actual defect", subjects: [element.key], verdict: "reference",
    unitIds: pkg.units.filter(u => specIds.includes(u.specId)).map(u => u.id), citation: "supported", ...overrides };
}
function decision(cardId: string, atoms: ReviewAtom[]): SemanticDecision {
  return { cardId, status: "reviewed", reviewer: "author", rationale: "Checked claim and applicable evidence",
    complete: true, evidenceRefs: ["fixture DOM after submit"], atoms };
}
function reviews(pkg: SemanticPackage, ds: SemanticDecision[]): SemanticReviews {
  return { ...scopeReviews(pkg), decisions: ds };
}
let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

test("false semantics do not receive credit from selector/rule overlap", () => {
  const pkg = prepare([finding("The CPF field autoplays loud music. Invented observation.")]);
  const initial = scoreSemanticPackage(pkg, scopeReviews(pkg)).scores[0];
  assert.equal(initial.counts.detectedUnits, 0);
  assert.equal(initial.counts.falseAssertions, 0);
  assert.equal(initial.status, "provisional");
  assert.equal(initial.metrics.assertionPrecision, null);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, [], { verdict: "false", citation: "unsupported" })])]);
  const final = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(final.status, "complete");
  assert.equal(final.counts.detectedUnits, 0);
  assert.equal(final.counts.falseAssertions, 1);
  assert.equal(final.metrics.assertionPrecision, 0);
});
test("defect acceptance and citation support are independent", () => {
  const pkg = prepare([finding("Help text is not associated", "#cpf", "")]);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"], { citation: "uncertain" })])]);
  const score = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(score.counts.detectedUnits, 1);
  assert.equal(score.metrics.assertionPrecision, 1);
  assert.equal(score.metrics.citationSupport, 0);
});
test("maximum assignment displaces flexible candidates instead of losing TP", () => {
  const permutations = [[['flex', ['A', 'B']], ['onlyA', ['A']]], [['onlyA', ['A']], ['flex', ['B', 'A']]]] as [string, string[]][][];
  const outputs = permutations.map(p => [...maximumMatching(new Map(p))]);
  assert.deepEqual(outputs[0], outputs[1]);
  assert.equal(outputs[0].length, 2);
});
test("matching agrees with brute force on every 3x3 bipartite graph", () => {
  function brute(edges: Map<string, string[]>, left: string[], used = new Set<string>(), at = 0): number {
    if (at === left.length) return 0;
    let best = brute(edges, left, used, at + 1);
    for (const right of edges.get(left[at]) ?? []) if (!used.has(right)) {
      best = Math.max(best, 1 + brute(edges, left, new Set([...used, right]), at + 1));
    }
    return best;
  }
  for (let bits = 0; bits < 512; bits++) {
    const edges = new Map([0, 1, 2].map(i => [`L${i}`, [0, 1, 2].filter(j => bits & (1 << (i * 3 + j))).map(j => `R${j}`)]));
    assert.equal(maximumMatching(edges).size, brute(edges, [...edges.keys()]));
    assert.deepEqual([...maximumMatching(edges)], [...maximumMatching(new Map([...edges].reverse().map(([k, v]) => [k, [...v].reverse()])))]);
  }
});
test("complete scoring invariant to finding, unit, and review order", () => {
  const fs = [finding("Flexible semantically reviewed claim"), finding("Specific A claim")];
  const a = prepare(fs);
  const b = prepare([...fs].reverse(), [...units].reverse());
  assert.deepEqual(a.cards, b.cards);
  const ds = a.cards.map(c => decision(c.id, [atom(a, c.description.startsWith("Flexible") ? ["A", "B"] : ["A"])]));
  assert.deepEqual(scoreSemanticPackage(a, reviews(a, ds)).scores, scoreSemanticPackage(b, reviews(b, [...ds].reverse())).scores);
  assert.equal(scoreSemanticPackage(a, reviews(a, ds)).scores[0].counts.detectedUnits, 2);
});
test("compound claim cannot conceal a false clause", () => {
  const pkg = prepare([finding("Help missing and field autoplays music")]);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"], { id: "help" }),
    atom(pkg, [], { id: "music", text: "Autoplays music", verdict: "false", citation: "unsupported" })])]);
  const s = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(s.counts.detectedUnits, 1);
  assert.equal(s.counts.falseAssertions, 1);
  assert.equal(s.metrics.assertionPrecision, 0.5);
  assert.equal(s.metrics.referencePrecision, 0.5);
  assert.equal(s.metrics.referenceF1, 0.5);
});
test("grouped-selector review accounts for each instance, including a conforming one", () => {
  const pkg = prepare([finding("Both have the defect", ".both")]);
  const omitted = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"])])]);
  assert.throws(() => scoreSemanticPackage(pkg, omitted), /omitted a subject/);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"]),
    atom(pkg, [], { id: "conforming", subjects: [other.key], verdict: "false" })])]);
  const s = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(s.counts.detectedUnits, 1);
  assert.equal(s.counts.falseAssertions, 1);
});
test("no unresolved selector borrowing and no unanchored credit", () => {
  const pkg = prepare([{ ...finding("Claim", "#absent"), relatedSelectors: ["#cpf"] }]);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"], { subjects: [pkg.cards[0].subjects[0].id] })])]);
  assert.throws(() => scoreSemanticPackage(pkg, ds), /Unanchored/);
  const wrong = prepare([finding("Claim", "#button")]);
  assert.throws(() => scoreSemanticPackage(wrong, reviews(wrong,
    [decision(wrong.cards[0].id, [atom(wrong, ["A"], { subjects: [other.key] })])])), /Unanchored/);
});
test("explicit relational participants permit reviewed credit", () => {
  const pkg = prepare([{ ...finding("Help relation is missing", "#button"), relatedSelectors: ["#cpf"] }]);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"], { subjects: [other.key] })])]);
  assert.equal(scoreSemanticPackage(pkg, ds).scores[0].counts.detectedUnits, 1);
});
test("composition and redundant valid claims neither multiply TP nor become FP", () => {
  const us = [{ ...units[0], participants: [element.key, other.key] }];
  const pkg = prepare([finding("List semantics missing", ".both")], us);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"], { subjects: [element.key, other.key] })])]);
  const s = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(s.counts.detectedUnits, 1);
  assert.equal(s.counts.redundantReferenceAssertions, 1);
  assert.equal(s.counts.falseAssertions, 0);
});
test("novel discoveries do not move frozen reference denominator or count as FP", () => {
  const pkg = prepare([finding("A real novel defect", "#button")]);
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, [], { subjects: [other.key], verdict: "novel" })])]);
  const s = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(s.counts.referenceUnits, 2);
  assert.equal(s.counts.novelAssertions, 1);
  assert.equal(s.counts.falseAssertions, 0);
  assert.equal(s.metrics.referenceRecall, 0);
  assert.equal(s.metrics.assertionPrecision, 1);
  assert.equal(s.metrics.referenceF1, 0);
});
test("reviewed but insufficient evidence remains provisional", () => {
  const pkg = prepare();
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, [], { verdict: "unresolved" })])]);
  const s = scoreSemanticPackage(pkg, ds).scores[0];
  assert.equal(s.status, "provisional");
  assert.equal(s.metrics.referenceRecall, null);
});
test("exact pooling reduces work without merging different observations", () => {
  const data = run();
  const pkg = prepareSemanticPackage(context, units, resolution, [{ id: "r1", data }, { id: "r2", data }]);
  assert.equal(pkg.cards.length, 1);
  assert.equal(pkg.runs.length, 2);
  const changed = prepare([finding("Help text IS associated")]);
  assert.notEqual(changed.cards[0].id, pkg.cards[0].id);
  const negative = prepare([finding("Help text is NOT associated")]);
  assert.notEqual(changed.cards[0].id, negative.cards[0].id);
});
test("reuse requires exact context and evidence, not a matching rule", () => {
  const pkg = prepare();
  const ds = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"])])]);
  assert.equal(scopeReviews(pkg, ds).decisions[0].status, "reviewed");
  for (const key of ["referenceHash", "sceneHash", "scorerHash"] as const) {
    const changed = prepareSemanticPackage({ ...context, [key]: "changed" }, units, resolution, [{ id: "r1", data: run() }]);
    assert.equal(scopeReviews(changed, ds).decisions[0].status, "pending");
  }
  const observed = { ...run(), notes: "No interaction evidence was collected" };
  const changed = prepareSemanticPackage(context, units, resolution, [{ id: "r1", data: observed }]);
  assert.equal(scopeReviews(changed, ds).decisions[0].status, "pending");
});
test("historical cards are outside the active queue", () => {
  const a = prepare();
  const b = prepare([finding("Other observation")]);
  const scoped = scopeReviews(b, scopeReviews(a));
  assert.equal(scoped.decisions.length, 1);
  assert.equal(scoped.decisions[0].cardId, b.cards[0].id);
});
test("adding an unrelated claim does not invalidate an identical card", () => {
  const a = prepare();
  const b = prepare([...run().findings, finding("Another defect", "#button")]);
  assert.ok(b.cards.some(c => c.id === a.cards[0].id));
});
test("invalid and duplicate review records fail closed", () => {
  const pkg = prepare();
  const d = decision(pkg.cards[0].id, [atom(pkg, ["A"])]);
  for (const patch of [{ complete: false }, { reviewer: "" }, { evidenceRefs: [] }, { atoms: [] }]) {
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [{ ...d, ...patch }])));
  }
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [d, d])), /Duplicate decision/);
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [{ ...d, cardId: "old-card" }])), /outside this package/);
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [{ ...d, status: "pending" }])), /Pending decision/);
});
test("changed package content invalidates hash", () => {
  const pkg = prepare();
  pkg.units[0].description = "Changed reference";
  assert.throws(() => validatePackage(pkg), /package changed/);
});
test("re-signing a changed card still cannot reuse its previous review identity", () => {
  const pkg = prepare();
  pkg.cards[0].description = "A completely different claim";
  const { packageHash: _ignored, ...body } = pkg;
  pkg.packageHash = digest(body);
  assert.throws(() => validatePackage(pkg), /Card content\/context changed/);
});
test("empty output is complete with zero recall and undefined precision", () => {
  const pkg = prepare([]);
  const s = scoreSemanticPackage(pkg, scopeReviews(pkg)).scores[0];
  assert.equal(s.status, "complete");
  assert.equal(s.metrics.referenceRecall, 0);
  assert.equal(s.metrics.assertionPrecision, null);
});
test("duplicate report entries do not multiply claims", () => {
  const pkg = prepare([finding("Same"), finding("Same")]);
  assert.equal(pkg.cards.length, 1);
  assert.equal(pkg.runs[0].cardIds.length, 1);
});

// Real CLI smoke: scoring is offline, outputs are append-only, and incomplete reviews
// have an actionable process status. Fixtures use the current engine fingerprint.
test("offline CLI produces provisional JSON, refuses overwrite, rejects stale engine", () => {
  const root = join(import.meta.dirname, "..");
  const pkg = prepare();
  pkg.context.scorerHash = digest(["scripts/semantic-flow.ts", "scripts/semantic-flow-cli.ts", "scripts/units-flow.ts",
    "scripts/units.ts", "scripts/anchors.ts", "scripts/instrument.ts", "instrument.json",
    "types.ts", "checker-aliases.json", "kb-aliases.json"]
    .map(path => [path, readFileSync(join(root, path), "utf8")]));
  // Re-prepare rather than re-signing a package with altered context.
  const current = prepareSemanticPackage(pkg.context, units, resolution, [{ id: "r1", data: run() }]);
  const dir = mkdtempSync(join(tmpdir(), "semantic-flow-test-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify(current));
    writeFileSync(join(dir, "reviews.json"), JSON.stringify(scopeReviews(current)));
    const args = [join(root, "node_modules/tsx/dist/cli.mjs"), join(root, "scripts/semantic-flow-cli.ts"), "score",
      "--package", join(dir, "package.json"), "--reviews", join(dir, "reviews.json"), "--out", join(dir, "score.json"), "--require-complete"];
    const first = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(first.status, 2, first.stderr);
    assert.equal(JSON.parse(readFileSync(join(dir, "score.json"), "utf8")).scores[0].status, "provisional");
    assert.equal(spawnSync(process.execPath, args, { encoding: "utf8" }).status, 1);
    const approved = reviews(current, [decision(current.cards[0].id, [atom(current, ["A"])])]);
    writeFileSync(join(dir, "reviews.json"), JSON.stringify(approved));
    const completedArgs = args.map(a => a === join(dir, "score.json") ? join(dir, "score-complete.json") : a);
    const complete = spawnSync(process.execPath, completedArgs, { encoding: "utf8" });
    assert.equal(complete.status, 0, complete.stderr);
    const score = JSON.parse(readFileSync(join(dir, "score-complete.json"), "utf8")).scores[0];
    assert.equal(score.status, "complete");
    assert.equal(score.metrics.referenceF1, 2 / 3);
    writeFileSync(join(dir, "package.json"), JSON.stringify(prepare()));
    const stale = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /Scorer\/aliases changed/);
  } finally {
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    assert.ok(basename(dir).startsWith("semantic-flow-test-"));
    rmSync(dir, { recursive: true, force: true });
  }
});
console.log(`${tests} semantic scoring tests passed (including exhaustive 512-graph matching verification).`);
