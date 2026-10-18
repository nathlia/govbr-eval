import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { FlowAgentResults } from "../types";
import type { Resolution } from "./anchors";
import type { FlowUnit } from "./units-flow";
import type { PredicateResult } from "./acceptance-predicates";
import { renderReview } from "./semantic-flow-render";
import {
  SCORER_FILES, SEMANTIC_LEGACY_VERSIONS, aceitaDominio, aceitaDominioAmarrado, exigeParadaEmTodoCredito, aceitaVinculos, aplicarDominio, cartaoDoVinculo, participanteDePagina, SEMANTIC_SCORING_VERSION, VINCULO_CONTRATO, digest, maximumMatching, normalizeReviews, prepareSemanticPackage, scopeReviews, scoreSemanticPackage, tocaParticipante, validatePackage,
  type RawReviewAtom, type SemanticDecision, type SemanticPackage, type SemanticReviews, type ReviewAtom, type ReviewLink, type PrepareRun, type SceneResolution,
} from "./semantic-flow";
import { montarAtomos, montarVinculos } from "./decisao-atomos";

const context = { referenceHash: "reference-v1", sceneHash: "scene-v1", scorerHash: "scorer-v1" };
const element = { key: "body>input", id: "E-input", label: "CPF", hidden: null };
const other = { key: "body>button", id: "E-button", label: "Button", hidden: null };
const resolution: Resolution = { url: "http://fixture/fluxo.html",
  byKey: new Map([[element.key, element], [other.key, other]]),
  bySelector: new Map([
    ["#cpf", { selector: "#cpf", ok: true, error: null, keys: [element.key] }],
    ["#button", { selector: "#button", ok: true, error: null, keys: [other.key] }],
    [".both", { selector: ".both", ok: true, error: null, keys: [element.key, other.key] }],
  ]) };
const units: FlowUnit[] = ["A", "B"].map(specId => ({ specId, element, participants: [element.key],
  rules: [specId === "A" ? "wcag:1.3.1" : "wcag:3.3.1"], categories: ["form"],
  description: specId === "A" ? "Help text association" : "Error identification", state: "submitted",
  states: ["submitted"], conditional: true }));
const finding = (description: string, selector = "#cpf", rule = "wcag:1.3.1") => ({ selector, rule, description });
function run(findings: FlowAgentResults["findings"] = [finding("Help text is not associated")]): FlowAgentResults {
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
// 1.5.0 (piloto-01 par-02): a chave dentro de um participante toca a unidade; ancestral e irmão de prefixo não.
{
  const dialogo = { key: "body>div:nth-of-type(1)>div", id: "E-dialogo", label: "<div> diálogo", hidden: null };
  const dentro = { key: "body>div:nth-of-type(1)>div>div:nth-of-type(3)>button:nth-of-type(1)", id: "E-dentro", label: "<button> Cancelar", hidden: null };
  const sombra = { key: "body>div:nth-of-type(1)>div >>> header>button", id: "E-sombra", label: "<button> [shadow]", hidden: null };
  const irmao = { key: "body>div:nth-of-type(10)>div", id: "E-irmao", label: "<div>", hidden: null };
  const corpo = { key: "body", id: "E-body", label: "<body>", hidden: null };
  const fora = { key: "body>form>button", id: "E-fora", label: "<button> Cancelar (form)", hidden: null };
  const els = [dialogo, dentro, sombra, irmao, corpo, fora];
  const res: Resolution = { url: "http://fixture/dialogo.html", byKey: new Map(els.map(e => [e.key, e])),
    bySelector: new Map(els.map(e => [`#${e.id}`, { selector: `#${e.id}`, ok: true, error: null, keys: [e.key] }])) };
  const foco: FlowUnit[] = [{ specId: "A-01", element: dialogo, participants: [dialogo.key], rules: ["wcag:2.4.3"], categories: ["focus"],
    description: "Focus returns to the trigger when the dialog closes", state: "aberto", states: ["aberto"], conditional: false }];
  const pacote = (selector: string, related: string[] = []) => prepareSemanticPackage(context, foco, res,
    [{ id: "r1", data: { model: "fixture", timestamp: "fixed", appUrl: res.url,
      findings: [{ selector, rule: "wcag:2.4.3", description: "Focus goes to body on close", relatedSelectors: related }] } }]);
  const unidade = (pkg: SemanticPackage) => pkg.units[0].id;

  test("1.5.0: tocaParticipante is equality or descent by explicit separator, never ancestry or prefix collision", () => {
    assert.ok(tocaParticipante(dialogo.key, dialogo.key));
    assert.ok(tocaParticipante(dentro.key, dialogo.key));
    assert.ok(tocaParticipante(sombra.key, dialogo.key));
    assert.ok(!tocaParticipante(corpo.key, dialogo.key));
    assert.ok(!tocaParticipante(irmao.key, "body>div:nth-of-type(1)"));
    assert.ok(!tocaParticipante("body>div:nth-of-type(10)>div", "body>div:nth-of-type(1)"));
    assert.ok(!tocaParticipante("body>br-button-x", "body>br-button"));
    assert.ok(!tocaParticipante(fora.key, dialogo.key));
  });
  test("1.5.0: exact participant still offers the unit", () => {
    const pkg = pacote(`#${dialogo.id}`);
    assert.deepEqual(pkg.cards[0].candidateUnitIds, [unidade(pkg)]);
  });
  test("1.5.0: a related key inside the participant offers the unit, and the reviewer can credit it", () => {
    const pkg = pacote(`#${fora.id}`, [`#${dentro.id}`]);
    const card = pkg.cards[0];
    assert.deepEqual(card.candidateUnitIds, [unidade(pkg)]);
    // Offer is not credit: a pending card earns nothing.
    assert.equal(scoreSemanticPackage(pkg, scopeReviews(pkg)).scores[0].counts.detectedUnits, 0);
    const ds = reviews(pkg, [decision(card.id, [{ id: "a", text: "Focus lost on close", subjects: [fora.key], verdict: "reference",
      unitIds: [unidade(pkg)], citation: "supported" }])]);
    assert.equal(scoreSemanticPackage(pkg, ds).scores[0].counts.detectedUnits, 1);
  });
  test("1.5.0: a subject inside the participant (light or shadow tree) offers the unit", () => {
    for (const e of [dentro, sombra]) {
      const pkg = pacote(`#${e.id}`);
      assert.deepEqual(pkg.cards[0].candidateUnitIds, [unidade(pkg)], e.key);
    }
  });
  test("1.5.0: a RELATED key that is an ancestor of the participant offers nothing", () => {
    const pkg = pacote(`#${fora.id}`, [`#${corpo.id}`]);
    assert.deepEqual(pkg.cards[0].candidateUnitIds, []);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [decision(pkg.cards[0].id, [{ id: "a", text: "t",
      subjects: [fora.key], verdict: "reference", unitIds: [unidade(pkg)], citation: "supported" }])])), /Unanchored/);
  });
  test("1.5.0: an ancestor or a prefix-colliding sibling offers nothing and cannot be credited", () => {
    for (const e of [corpo, irmao]) {
      const pkg = pacote(`#${e.id}`);
      assert.deepEqual(pkg.cards[0].candidateUnitIds, [], e.key);
      assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [decision(pkg.cards[0].id, [{ id: "a", text: "t",
        subjects: [e.key], verdict: "reference", unitIds: [unidade(pkg)], citation: "supported" }])])), /Unanchored/);
    }
  });
}
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
test("unbacked claims stay scoped to their execution", () => {
  const data = run();
  const pkg = prepareSemanticPackage(context, units, resolution, [{ id: "r1", data }, { id: "r2", data }]);
  assert.equal(pkg.cards.length, 2);
  assert.equal(pkg.runs.length, 2);
  const changed = prepare([finding("Help text IS associated")]);
  assert.notEqual(changed.cards[0].id, pkg.cards[0].id);
  const negative = prepare([finding("Help text is NOT associated")]);
  assert.notEqual(changed.cards[0].id, negative.cards[0].id);
});

test("opaque evidence and changed original builds cannot inherit another run's review", () => {
  const currentFinding = { selector: "#cpf", rule: null, observed: "Help missing", expected: "Help associated",
    state: { viewport: { width: 1280, height: 720 }, steps: [] }, evidence: ["S-001"] };
  const data = { ...run(), findings: [currentFinding], config: { siteManifestSha256: "a".repeat(64) } };
  const first = prepareSemanticPackage(context, units, resolution, [{ id: "r1", data }]);
  const approved = reviews(first, [decision(first.cards[0].id, [atom(first, ["A"])])]);
  for (const changed of [
    { id: "r2", data },
    { id: "r1", data: { ...data, config: { siteManifestSha256: "b".repeat(64) } } },
    { id: "r1", data, evidence: { dir: "changed", files: [{ path: "snapshot.yml", bytes: 1, sha256: "c".repeat(64) }] } },
  ]) {
    const next = prepareSemanticPackage(context, units, resolution, [changed]);
    const result = scoreSemanticPackage(next, scopeReviews(next, approved)).scores[0];
    assert.equal(result.status, "provisional");
    assert.equal(result.counts.detectedUnits, 0);
  }
});

test("verified exact file evidence and original build support cross-run reuse", () => {
  const data = { ...run(), config: { siteManifestSha256: "a".repeat(64), instrumentVersion: "fluxo-1.3.0", protocolVersion: "fixture-protocol" }, findings: [{
    selector: "#cpf", rule: null, observed: "Help missing", expected: "Help associated",
    state: { viewport: { width: 1280, height: 720 }, steps: [] }, evidence: ["snapshot.yml"],
  }] };
  const evidence = { dir: "shared-immutable-evidence", files: [{ path: "snapshot.yml", bytes: 1, sha256: "b".repeat(64) }],
    integrity: { indexSha256: "c".repeat(64) } };
  const pkg = prepareSemanticPackage(context, units, resolution, [{ id: "r1", data, evidence }, { id: "r2", data, evidence }]);
  assert.equal(pkg.cards.length, 1);
  const approved = reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"])])]);
  assert.ok(scoreSemanticPackage(pkg, approved).scores.every(s => s.counts.detectedUnits === 1));
  const changed = prepareSemanticPackage(context, units, resolution, [{ id: "r2", data,
    evidence: { ...evidence, files: [{ ...evidence.files[0], sha256: "d".repeat(64) }] } }]);
  assert.equal(scopeReviews(changed, approved).decisions[0].status, "pending");
});

test("reviewer-linked citation aliases count false and novel assertions once, with provenance", () => {
  for (const verdict of ["false", "novel", "reference"] as const) {
    const pkg = prepare([finding("Same observation", "#cpf", "wcag:1.3.1"), finding("Same observation", "#cpf", "emag:1.3")]);
    const primary = atom(pkg, verdict === "reference" ? ["A"] : [], { verdict, citation: "supported" });
    const duplicate = { ...primary, citation: "unsupported" as const,
      duplicateOf: { cardId: pkg.cards[0].id, atomId: primary.id } };
    const ds = reviews(pkg, [decision(pkg.cards[0].id, [primary]), decision(pkg.cards[1].id, [duplicate])]);
    const result = scoreSemanticPackage(pkg, ds).scores[0];
    assert.equal(result.counts.duplicateAssertions, 1);
    assert.equal(result.counts.falseAssertions, verdict === "false" ? 1 : 0);
    assert.equal(result.counts.novelAssertions, verdict === "novel" ? 1 : 0);
    assert.equal(result.counts.detectedUnits, verdict === "reference" ? 1 : 0);
    assert.equal(result.metrics.citationSupport, 0.5, "citations remain separately accountable");
    assert.ok(result.assertions.find(a => a.verdict === "duplicate")?.duplicateOf);
    assert.deepEqual(scoreSemanticPackage(pkg, { ...ds, decisions: [...ds.decisions].reverse() }).scores[0], result);
  }
});

test("duplicate links reject cycles, missing targets, different verdicts, states, and subjects", () => {
  const pkg = prepare([finding("First"), finding("Second")]);
  const make = () => reviews(pkg, pkg.cards.map(c => decision(c.id, [atom(pkg, [], { verdict: "false" })])));
  const ds = make();
  ds.decisions[1].atoms[0].duplicateOf = { cardId: pkg.cards[0].id, atomId: "atom" };
  for (const mutate of [
    (d: SemanticReviews) => { d.decisions[1].atoms[0].duplicateOf!.atomId = "missing"; },
    (d: SemanticReviews) => { d.decisions[0].atoms[0].verdict = "novel"; },
    (d: SemanticReviews) => { d.decisions[0].atoms[0].duplicateOf = { cardId: pkg.cards[1].id, atomId: "atom" }; },
  ]) {
    const bad = structuredClone(ds); mutate(bad);
    assert.throws(() => scoreSemanticPackage(pkg, bad), /Duplicate target|Incompatible duplicate|Cyclic duplicate/);
  }
  // Same statement at different declared states may not be erased by a duplicate link.
  const stateful = [320, 1280].map(width => ({ selector: "#cpf", rule: null, observed: "Same", expected: "Other",
    state: { viewport: { width, height: 720 }, steps: [] }, evidence: [] }));
  const differentStates = prepare(stateful);
  const stateDs = reviews(differentStates, differentStates.cards.map(c => decision(c.id, [atom(differentStates, [], { verdict: "false" })])));
  stateDs.decisions[1].atoms[0].duplicateOf = { cardId: differentStates.cards[0].id, atomId: "atom" };
  assert.throws(() => scoreSemanticPackage(differentStates, stateDs), /Incompatible duplicate/);
  const differentSubjects = prepare([finding("First", "#cpf"), finding("Second", "#button")]);
  const subjectDs = reviews(differentSubjects, differentSubjects.cards.map(c => decision(c.id,
    [atom(differentSubjects, [], { verdict: "false", subjects: c.subjects.map(s => s.id) })])));
  subjectDs.decisions[1].atoms[0].duplicateOf = { cardId: differentSubjects.cards[0].id, atomId: "atom" };
  assert.throws(() => scoreSemanticPackage(differentSubjects, subjectDs), /Incompatible duplicate/);
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
// ── fatia 6: cenas do plano de estados e linhas de base revisadas ─────────────
const wide = { width: 1280, height: 900 };
const narrow = { width: 320, height: 720 };
const scenes = (): SceneResolution[] => [
  { id: "1280x900", viewport: wide, specIds: ["A"], resolution },
  { id: "320x720", viewport: narrow, specIds: ["B"], resolution },
];
const sceneUnits = [{ ...units[0], scene: "1280x900" }, { ...units[1], scene: "320x720" }];
const atState = (description: string, viewport: { width: number; height: number }, selector = "#cpf") => ({
  selector, rule: null, observed: description, expected: "Should hold", state: { viewport, steps: [] }, evidence: [],
});
function prepareScenes(findings: unknown[], extra: PrepareRun[] = []): SemanticPackage {
  return prepareSemanticPackage(context, sceneUnits, scenes(),
    [{ id: "r1", data: run(findings as FlowAgentResults["findings"]) }, ...extra]);
}
test("a claim earns only units of its own scene, even on the same element key", () => {
  const pkg = prepareScenes([atState("Wide claim", { width: 1280, height: 720 })]);
  const card = pkg.cards[0];
  assert.equal(card.scene, "1280x900");
  assert.ok(card.flags.some(f => f.startsWith("altura-diferente")));
  assert.deepEqual(card.candidateUnitIds, pkg.units.filter(u => u.scene === "1280x900").map(u => u.id));
  const unitB = pkg.units.find(u => u.specId === "B")!;
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [decision(card.id,
    [{ ...atom(pkg, []), unitIds: [unitB.id] }])])), /Unanchored/);
  const narrowPkg = prepareScenes([atState("Narrow claim", narrow)]);
  const ok = reviews(narrowPkg, [decision(narrowPkg.cards[0].id, [atom(narrowPkg, ["B"])])]);
  assert.equal(scoreSemanticPackage(narrowPkg, ok).scores[0].counts.detectedUnits, 1);
});
test("a window outside the plan is readable but cannot anchor any unit", () => {
  const pkg = prepareScenes([atState("Tablet claim", { width: 768, height: 1024 })]);
  const card = pkg.cards[0];
  assert.equal(card.scene, "fora-do-plano:768x1024");
  assert.equal(card.subjects[0].key, element.key);
  assert.deepEqual(card.candidateUnitIds, []);
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [decision(card.id, [atom(pkg, ["A"])])])), /Unanchored/);
  const novel = scoreSemanticPackage(pkg, reviews(pkg, [decision(card.id, [atom(pkg, [], { verdict: "novel" })])]));
  assert.equal(novel.scores[0].counts.novelAssertions, 1);
});
test("a claim without a declared window is placed in the default scene and flagged", () => {
  const pkg = prepareScenes([finding("Legacy claim")]);
  assert.equal(pkg.cards[0].scene, "1280x900");
  assert.ok(pkg.cards[0].flags.some(f => f.startsWith("sem-janela-declarada")));
  assert.throws(() => prepareSemanticPackage(context, [{ ...units[0], scene: "999x1" }], scenes(), []), /undeclared scene/);
});
const build = "f".repeat(64);
const baselineRun = (id: string, findings: unknown[]): PrepareRun => ({ id, kind: "linha-de-base", tool: id,
  data: { model: id, timestamp: "fixed", appUrl: resolution.url, findings: findings as FlowAgentResults["findings"],
    config: { instrumentVersion: "fluxo-1.3.0", protocolVersion: `baseline:${id}`, siteManifestSha256: build } as FlowAgentResults["config"] } });
const det = (observed: string, scene: string, viewport: { width: number; height: number }, selector = "#cpf") =>
  ({ selector, rule: "ds:token-color", observed, expected: null, scene, viewport, steps: ["setup"] });
test("baseline claims are reviewed cards in their pass scene, reusable only on the same build", () => {
  const pkg = prepareScenes([], [baselineRun("validator", [det("Color off", "320x720", narrow)])]);
  const card = pkg.cards.find(c => c.origin === "linha-de-base")!;
  assert.equal(card.contract, "deterministico");
  assert.equal(card.scene, "320x720");
  assert.equal(card.binding.runScope, null);
  assert.equal(pkg.runs.find(r => r.id === "validator")!.kind, "linha-de-base");
  assert.throws(() => prepareScenes([], [baselineRun("validator", [det("x", "777x1", narrow)])]), /outside the planned scenes/);
  const unpinned = baselineRun("validator", [det("Color off", "320x720", narrow)]);
  (unpinned.data.config as { siteManifestSha256: string | null }).siteManifestSha256 = null;
  assert.notEqual(prepareScenes([], [unpinned]).cards[0].binding.runScope, null);
});
test("comparison splits units into both / agent only / baseline only / neither from the same reviewed output", () => {
  const pkg = prepareScenes([atState("Agent sees A", wide)], [
    baselineRun("validator", [det("Tool sees B", "320x720", narrow), det("Tool noise", "1280x900", wide, "#button")]),
    baselineRun("axe", []),
  ]);
  const agentCard = pkg.cards.find(c => c.origin === "agente")!;
  const toolB = pkg.cards.find(c => c.origin === "linha-de-base" && c.scene === "320x720")!;
  const noise = pkg.cards.find(c => c.origin === "linha-de-base" && c.scene === "1280x900")!;
  const pendingResult = scoreSemanticPackage(pkg, scopeReviews(pkg));
  assert.ok(pendingResult.comparisons.every(c => c.status === "provisional"));
  const ds = reviews(pkg, [
    decision(agentCard.id, [atom(pkg, ["A"])]),
    decision(toolB.id, [atom(pkg, ["B"])]),
    decision(noise.id, [atom(pkg, [], { subjects: [other.key], verdict: "false", citation: "unsupported" })]),
  ]);
  const result = scoreSemanticPackage(pkg, ds);
  const unitA = pkg.units.find(u => u.specId === "A")!.id;
  const unitB = pkg.units.find(u => u.specId === "B")!.id;
  const vsValidator = result.comparisons.find(c => c.baseline === "validator")!;
  assert.equal(vsValidator.status, "complete");
  assert.deepEqual(vsValidator.units, { both: [], agentOnly: [unitA], baselineOnly: [unitB], neither: [] });
  assert.deepEqual(vsValidator.baselineClaims, { novel: 0, false: 1, unresolved: 0 });
  const vsAxe = result.comparisons.find(c => c.baseline === "axe")!;
  assert.deepEqual(vsAxe.counts, { referenceUnits: 2, both: 0, agentOnly: 1, baselineOnly: 0, neither: 1 });
  const union = result.comparisons.find(c => c.baseline === "uniao-deterministica")!;
  assert.deepEqual(union.units.baselineOnly, [unitB]);
  assert.equal(union.baselineClaims.false, 1);
  // Baselines are scored like any run, and never appear as an agent row.
  assert.equal(result.scores.find(s => s.runId === "validator")!.counts.detectedUnits, 1);
  assert.equal(result.comparisons.length, 3);
});
test("offline CLI produces provisional JSON, refuses overwrite, rejects stale engine", () => {
  const root = join(import.meta.dirname, "..");
  const pkg = prepare();
  pkg.context.scorerHash = digest(SCORER_FILES.map(path => [path, readFileSync(join(root, path), "utf8")]));
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
// ── Fatia 3: predicado de aceitação e estado declarado ───────────────────────

/** Uma medida que sustenta, como a preparação a gravaria a partir da página. */
const sustenta = (kind: string): PredicateResult => ({
  kind, outcome: "sustenta", expected: "condição declarada", states: ["submitted"],
  measured: [{ key: element.key, values: { "aria-describedby": null }, sustains: true, reason: "ausente" }],
  reason: "1 participante medido",
});

test("predicado não implementado deixa a alegação sem resolver, e nunca credita por elemento", () => {
  const pkg = prepare();
  assert.equal(pkg.units[0].acceptance.outcome, "nao-implementado",
    "sem predicado declarado o pacote diz isso explicitamente, e não omite o campo");

  // Sem decisão, seletor e regra coincidem e mesmo assim nada é creditado: é o D-39 em vigor.
  const semRevisao = scoreSemanticPackage(pkg, scopeReviews(pkg)).scores[0];
  assert.equal(semRevisao.counts.detectedUnits, 0);
  assert.equal(semRevisao.status, "provisional");
  assert.equal(semRevisao.metrics.referenceRecall, null);

  // E o caminho automático é recusado justamente por não haver predicado que sustente.
  const auto: SemanticDecision = { ...decision(pkg.cards[0].id, [atom(pkg, ["A"])]),
    automatic: { predicate: "atributos-ausentes" } };
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [auto])),
    /Automatic credit without a sustaining implemented predicate/);

  // A autora, essa sim, decide — e o mesmo cartão vira crédito pela via de sempre.
  const daAutora = scoreSemanticPackage(pkg, reviews(pkg, [decision(pkg.cards[0].id, [atom(pkg, ["A"])])])).scores[0];
  assert.equal(daAutora.counts.detectedUnits, 1);
});

test("o caminho automático só vale onde um predicado IMPLEMENTADO sustenta, e da mesma espécie", () => {
  const comPredicado = units.map(u => ({ ...u, acceptance: sustenta("atributos-ausentes") }));
  const pkg = prepare(run().findings, comPredicado);
  assert.equal(pkg.units[0].acceptance.outcome, "sustenta");

  const certo: SemanticDecision = { ...decision(pkg.cards[0].id, [atom(pkg, ["A"])]),
    automatic: { predicate: "atributos-ausentes" } };
  assert.equal(scoreSemanticPackage(pkg, reviews(pkg, [certo])).scores[0].counts.detectedUnits, 1);

  // Espécie diferente da medida não serve: o que autoriza é o predicado que de fato rodou.
  const outraEspecie: SemanticDecision = { ...certo, automatic: { predicate: "estilo-computado" } };
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [outraEspecie])),
    /Automatic credit without a sustaining implemented predicate/);
  const semNome: SemanticDecision = { ...certo, automatic: { predicate: "  " } };
  assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [semNome])), /without a named predicate/);
});

test("alegação sem passo declarado sobre unidade que só existe após interação é SINALIZADA, não inferida", () => {
  const comEstado = (findings: FlowAgentResults["findings"]): SemanticPackage =>
    prepareSemanticPackage(context, units, resolution, [{ id: "r1", data: run(findings) }],
      { stateOrder: ["inicial", "submitted"] });

  // As unidades da fixture só existem em "submitted"; a alegação não declara passo nenhum.
  const mudo = comEstado([finding("Help text is not associated")]);
  assert.ok(mudo.cards[0].flags.some(f => f.startsWith("estado-nao-declarado")), mudo.cards[0].flags.join(" | "));
  assert.match(mudo.cards[0].flags.join(" "), /só existe\(m\) em submitted/);

  // Declarando passos, o sinal some — e o texto dos passos nunca é interpretado para casar estado.
  const comPassos = comEstado([{ ...finding("Help text is not associated"), observed: "o", expected: "e",
    state: { viewport: { width: 1280, height: 900 }, steps: ["submeter com o campo em branco"] }, evidence: ["x"] }]);
  assert.ok(!comPassos.cards[0].flags.some(f => f.startsWith("estado-nao-declarado")));

  // O sinal é para a revisora ler: por si só não tira nem dá crédito.
  const s = scoreSemanticPackage(mudo, reviews(mudo, [decision(mudo.cards[0].id, [atom(mudo, ["A"])])])).scores[0];
  assert.equal(s.counts.detectedUnits, 1);
});

// ── D-60: cenas por segmento ─────────────────────────────────────────────────
{
  const li = { key: "body>ul>li", id: "E-li", label: "<li>", hidden: null };
  const botao = { key: "body>main>button", id: "E-bt", label: "<button>", hidden: null };
  const sel = (keys: Record<string, string[]>) => new Map(Object.entries(keys).map(([s, k]) => [s, { selector: s, ok: true, error: null, keys: k }]));
  const resLista: Resolution = { url: "http://fixture/app/lista", byKey: new Map([[li.key, li], [botao.key, botao]]),
    bySelector: sel({ li: [li.key], button: [botao.key], "#so-detalhe": [], "#nada": [] }) };
  const resDetalhe: Resolution = { url: "http://fixture/app/lista", byKey: new Map([[botao.key, { ...botao, label: "<button> detalhe" }]]),
    bySelector: sel({ li: [], button: [botao.key], "#so-detalhe": [botao.key], "#nada": [] }) };
  const segScenes: SceneResolution[] = [
    { id: "1280x900@lista", viewport: wide, specIds: ["L", "LB"], resolution: resLista, segmento: { numero: 0, estado: "lista", path: "/app/lista", estados: ["lista"] } },
    { id: "1280x900@detalhe", viewport: wide, specIds: ["D"], resolution: resDetalhe, segmento: { numero: 1, estado: "detalhe", path: "/app/detalhe", estados: ["detalhe"] } },
  ];
  const u = (specId: string, el: typeof li, scene: string, state: string) => ({ specId, element: el, participants: [el.key],
    rules: ["wcag:1.3.1"], categories: ["x"], description: specId, state, states: [state], conditional: false, scene });
  const segUnits = [u("L", li, "1280x900@lista", "lista"), u("LB", botao, "1280x900@lista", "lista"), u("D", botao, "1280x900@detalhe", "detalhe")];
  const claim = (selector: string) => ({ selector, rule: null, observed: `sobre ${selector}`, expected: "e",
    state: { viewport: wide, steps: ["abriu o detalhe"] }, evidence: [] });
  const pkg = prepareSemanticPackage(context, segUnits, segScenes,
    [{ id: "r1", data: run([claim("button"), claim("li"), claim("#nada"), claim("#so-detalhe")] as FlowAgentResults["findings"]) }],
    { stateOrder: ["lista", "detalhe"] });
  const unitOf = (specId: string) => pkg.units.find(x => x.specId === specId)!.id;
  const card = (selector: string) => pkg.cards.find(c => c.selector === selector)!;

  test("D-60: a scene per segment is declared in the package, and the same key in two segments is two units", () => {
    assert.deepEqual(pkg.scenes.map(s => [s.id, s.segmento?.path]), [["1280x900@lista", "/app/lista"], ["1280x900@detalhe", "/app/detalhe"]]);
    assert.notEqual(unitOf("LB"), unitOf("D"));
  });

  test("D-60: a selector resolving in one segment is placed there; in none, flagged; in several, the reviewer chooses", () => {
    assert.equal(card("li").scene, "1280x900@lista");
    assert.ok(card("li").flags.some(f => f.startsWith("segmento-pela-resolucao")));
    assert.equal(card("li").segmentos, undefined);
    assert.equal(card("#so-detalhe").scene, "1280x900@detalhe");
    assert.ok(card("#nada").flags.some(f => f.startsWith("segmento-nao-resolvido")));
    assert.equal(card("#nada").subjects[0].key, null);
    const b = card("button");
    assert.equal(b.scene, "a-decidir:1280x900");
    assert.deepEqual(b.segmentos!.map(o => [o.scene, o.path]), [["1280x900@lista", "/app/lista"], ["1280x900@detalhe", "/app/detalhe"]]);
    assert.deepEqual(b.subjects.map(s => [s.id, s.scene, s.label]), [
      ["1280x900@lista|body>main>button", "1280x900@lista", "<button>"],
      ["1280x900@detalhe|body>main>button", "1280x900@detalhe", "<button> detalhe"]]);
    assert.deepEqual(b.candidateUnitIds.sort(), [unitOf("LB"), unitOf("D")].sort());
    assert.ok(b.flags.some(f => f.startsWith("segmento-a-decidir")));
  });

  test("D-60: the chosen scene decides which subjects count and which units they can earn", () => {
    const b = card("button");
    const em = (cena: string | undefined, atoms: ReviewAtom[]) => ({ ...decision(b.id, atoms), ...(cena ? { cena } : {}) });
    const sujeito = (cena: string) => `${cena}|body>main>button`;
    const ref = (cena: string, unitId: string): ReviewAtom => ({ id: "a", text: "t", subjects: [sujeito(cena)], verdict: "reference", unitIds: [unitId], citation: "supported" });
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [em(undefined, [ref("1280x900@detalhe", unitOf("D"))])])), /must name "cena"/);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [em("1280x900@outra", [ref("1280x900@detalhe", unitOf("D"))])])), /must name "cena"/);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [em("1280x900@detalhe", [ref("1280x900@lista", unitOf("LB"))])])), /Subject outside the chosen scene/);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [em("1280x900@detalhe", [ref("1280x900@detalhe", unitOf("LB"))])])), /Unanchored/);
    const s = scoreSemanticPackage(pkg, reviews(pkg, [em("1280x900@detalhe", [ref("1280x900@detalhe", unitOf("D"))])])).scores[0];
    assert.deepEqual(s.matched.map(m => m.unitId), [unitOf("D")]);
    // A subject of the other segment is not a claim: nothing is charged for it.
    assert.equal(s.assertions.filter(a => a.cardId === b.id).length, 1);
    // "cena" only exists where there is a choice, and a pending decision carries no choice.
    const li = card("li");
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [{ ...decision(li.id, [atom(pkg, [], { subjects: [li.subjects[0].id], verdict: "novel", unitIds: [] })]), cena: "1280x900@lista" }])), /only applies/);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [{ cardId: b.id, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [], cena: "1280x900@lista" }])), /Pending decision carries effects/);
    // Pending: the floor is the smallest segment group, never the union.
    const pendente = scoreSemanticPackage(pkg, reviews(pkg, [])).scores[0];
    assert.equal(pendente.assertions.filter(a => a.cardId === b.id).length, 1);
  });

  test("1.5.0: on the segment path (a-decidir), a subject inside a participant offers that segment's unit", () => {
    const span = { key: "body>main>button>span", id: "E-span", label: "<span>", hidden: null };
    const comSpan = (r: Resolution): Resolution => ({ ...r, byKey: new Map([...r.byKey, [span.key, span]]),
      bySelector: new Map([...r.bySelector, ["span", { selector: "span", ok: true, error: null, keys: [span.key] }]]) });
    const cenas = segScenes.map(c => ({ ...c, resolution: comSpan(c.resolution) }));
    const p2 = prepareSemanticPackage(context, segUnits, cenas,
      [{ id: "r1", data: run([claim("span")] as FlowAgentResults["findings"]) }], { stateOrder: ["lista", "detalhe"] });
    const id = (specId: string) => p2.units.find(x => x.specId === specId)!.id;
    const c = p2.cards[0];
    assert.equal(c.scene, "a-decidir:1280x900");
    assert.deepEqual(c.segmentos!.map(o => [o.scene, o.candidateUnitIds]), [["1280x900@lista", [id("LB")]], ["1280x900@detalhe", [id("D")]]]);
    assert.deepEqual([...c.candidateUnitIds].sort(), [id("LB"), id("D")].sort());
    const s = scoreSemanticPackage(p2, reviews(p2, [{ ...decision(c.id, [{ id: "a", text: "t", subjects: [`1280x900@detalhe|${span.key}`],
      verdict: "reference", unitIds: [id("D")], citation: "supported" }]), cena: "1280x900@detalhe" }])).scores[0];
    assert.deepEqual(s.matched.map(m => m.unitId), [id("D")]);
  });

  test("D-60: review.md says the plan navigates and lists the subjects per scene to choose from", () => {
    const md = renderReview(pkg, reviews(pkg, []));
    assert.match(md, /Este plano navega \(D-60\)/);
    assert.match(md, /Cena `1280x900@detalhe` \(\/app\/detalhe\) — escolha com `"cena": "1280x900@detalhe"`/);
    // Without segments, review.md does not mention them.
    assert.doesNotMatch(renderReview(prepare(), reviews(prepare(), [])), /Este plano navega|"cena"/);
  });
}

// ── NAT-72: vínculo de revisão explícito e átomos ────────────────────────────
{
  const doc = { key: "", id: "E-html", label: "<html>", hidden: null };
  const corpo = { key: "body", id: "E-body", label: "<body>", hidden: null };
  const cabecalho = { key: "body>div>header", id: "E-header", label: "<header>", hidden: null };
  const botao = { key: "body>div>main>button", id: "E-botao", label: "<button> Enviar", hidden: null };
  const host = { key: "body>div>main>br-input", id: "E-host", label: "<br-input>", hidden: null };
  const interno = { key: "body>div>main>br-input >>> div>input", id: "E-interno", label: "<input> [shadow]", hidden: null };
  const th = { key: "body>div>main>table>thead>tr>th:nth-of-type(2)", id: "E-th", label: "<th> Data", hidden: null };
  const dialogo = { key: "body>div>div:nth-of-type(2)", id: "E-dialogo", label: "<div> diálogo", hidden: null };
  const caixa = { key: "body>div>main>div", id: "E-caixa", label: "<div>", hidden: null };
  const els = [doc, corpo, cabecalho, botao, host, interno, th, dialogo, caixa];
  const sel: Resolution["bySelector"] = new Map(els.map(e => [`#${e.id}`, { selector: `#${e.id}`, ok: true, error: null, keys: [e.key] }]));
  sel.set("#composto", { selector: "#composto", ok: true, error: null, keys: [interno.key, th.key] });
  sel.set("#host-e-interno", { selector: "#host-e-interno", ok: true, error: null, keys: [host.key, interno.key] });
  sel.set("#ausente", { selector: "#ausente", ok: false, error: "no match", keys: [] });
  const res: Resolution = { url: "http://fixture/tela.html", byKey: new Map(els.map(e => [e.key, e])), bySelector: sel };
  const un = (specId: string, el: { key: string }, states: string[], participants = [el.key]): FlowUnit => ({ specId, element: el as FlowUnit["element"],
    participants, rules: ["wcag:x"], categories: ["x"], description: specId, state: states[0], states, conditional: false });
  const refUnits = [
    un("P-01", cabecalho, ["inicial", "aberto"]),
    un("B-04", interno, ["inicial"]),
    un("A-01", dialogo, ["aberto"]),
    un("A-02", botao, ["inicial"]),
  ];
  const claim = (selector: string, observed = `sobre ${selector}`) => ({ selector, rule: null, observed, expected: "e",
    state: { viewport: { width: 1280, height: 900 }, steps: [] }, evidence: [] });
  const pacote = (selectors: string[], runId = "r1") => prepareSemanticPackage(context, refUnits, res,
    [{ id: runId, data: run(selectors.map(s => claim(s)) as FlowAgentResults["findings"]) }]);
  const uid = (pkg: SemanticPackage, specId: string) => pkg.units.find(u => u.specId === specId)!.id;
  const cardOf = (pkg: SemanticPackage, selector: string) => pkg.cards.find(c => c.selector === selector)!;
  const link = (card: SemanticPackage["cards"][number], unitId: string, subjects: string[], o: Partial<ReviewLink> = {}): ReviewLink => ({
    contrato: VINCULO_CONTRATO, unitId, subjects, scene: card.scene, state: "inicial", relation: "ausencia-global",
    evidence: ["medição headless: nenhum <header> do DS no documento"], justification: "a parte obrigatória falta na página inteira",
    reviewer: "author", binding: { build: card.binding.build, runScope: card.binding.runScope, card: cartaoDoVinculo(card) }, ...o });
  const ref = (subjects: string[], unitIds: string[], links?: ReviewLink[], o: Partial<ReviewAtom> = {}): ReviewAtom => ({
    id: "a1", text: "parte", subjects, verdict: "reference", unitIds, citation: "uncertain", ...(links ? { links } : {}), ...o });
  const pontua = (pkg: SemanticPackage, ds: SemanticDecision[]) => scoreSemanticPackage(pkg, reviews(pkg, ds)).scores[0];

  test("NAT-72 html×body: correct absence claim linked manually, no automatic generic ancestor", () => {
    const pkg = pacote(["#E-html", "#E-body"]);
    const html = cardOf(pkg, "#E-html"), body = cardOf(pkg, "#E-body");
    // The automatic path still offers nothing for an ancestor: candidates are suggestions only.
    assert.deepEqual(html.candidateUnitIds, []);
    assert.deepEqual(body.candidateUnitIds, []);
    assert.ok(pkg.cards.every(c => !("links" in c)), "preparation never creates a link");
    const p01 = uid(pkg, "P-01");
    assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [p01])])]), /Unanchored/);
    const s = pontua(pkg, [decision(html.id, [ref([""], [p01], [link(html, p01, [""])])])]);
    assert.deepEqual(s.matched.map(m => [m.unitId, m.vinculo]), [[p01, "ausencia-global"]]);
    // A link on one card does not enable ancestors elsewhere: the body card still cannot name A-02 unlinked.
    assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [p01], [link(html, p01, [""])])]),
      decision(body.id, [ref(["body"], [uid(pkg, "A-02")])])]), /Unanchored/);
    // "ausencia-global" must fit the measured tree: a sibling element is no ancestor of the header.
    const bt = pacote(["#E-botao"]);
    const btc = cardOf(bt, "#E-botao");
    assert.throws(() => pontua(bt, [decision(btc.id, [ref([botao.key], [uid(bt, "P-01")], [link(btc, uid(bt, "P-01"), [botao.key])])])]),
      /does not fit the measured structure/);
  });

  test("NAT-72 host×shadow-internal: link only across an open shadow boundary, with evidence of which subject does the job", () => {
    const pkg = pacote(["#E-host", "#E-caixa"]);
    const h = cardOf(pkg, "#E-host");
    const b04 = uid(pkg, "B-04");
    assert.deepEqual(h.candidateUnitIds, [], "the host is an ancestor of the internal control: not offered");
    const hostLink = link(h, b04, [host.key], { relation: "host-interno",
      evidence: ["árvore de acessibilidade: o input interno do shadow root é o controle sem nome"] });
    assert.equal(pontua(pkg, [decision(h.id, [ref([host.key], [b04], [hostLink])])]).matched[0].vinculo, "host-interno");
    assert.throws(() => pontua(pkg, [decision(h.id, [ref([host.key], [b04], [{ ...hostLink, evidence: [] }])])]), /without evidence/);
    // No shadow boundary between a light-DOM ancestor and the unit: the relation does not fit.
    const cx = cardOf(pkg, "#E-caixa");
    assert.throws(() => pontua(pkg, [decision(cx.id, [ref([caixa.key], [uid(pkg, "A-02")],
      [link(cx, uid(pkg, "A-02"), [caixa.key], { relation: "host-interno" })])])]), /does not fit/);
  });

  test("NAT-72 focus on body after closing the dialog: transition link in the measured state only", () => {
    const pkg = pacote(["#E-body"]);
    const c = cardOf(pkg, "#E-body");
    const a01 = uid(pkg, "A-01");
    const t = link(c, a01, ["body"], { relation: "transicao", state: "aberto",
      evidence: [`Tab real: ao fechar o diálogo ${dialogo.key}, document.activeElement = body`] });
    assert.equal(pontua(pkg, [decision(c.id, [ref(["body"], [a01], [t])])]).matched[0].vinculo, "transicao");
    // A-01 is declared in "aberto": a link declaring "inicial" is refused.
    assert.throws(() => pontua(pkg, [decision(c.id, [ref(["body"], [a01], [{ ...t, state: "inicial" }])])]), /not the declared state/);
    // Without citing the measured participant key, a transition has nothing structural behind it.
    assert.throws(() => pontua(pkg, [decision(c.id, [ref(["body"], [a01], [{ ...t, evidence: ["foco foi para o body"] }])])]), /does not fit/);
  });

  test("NAT-72 review fix: one <html> card split into N linked atoms cannot earn N units", () => {
    const pkg = pacote(["#E-html"]);
    const html = cardOf(pkg, "#E-html");
    const [p01, a01, a02, b04] = ["P-01", "A-01", "A-02", "B-04"].map(s => uid(pkg, s));
    // "ausencia-global" only for page-level participants: a control or dialog unit is no global absence.
    assert.ok(participanteDePagina("body>div>header") && participanteDePagina("") && participanteDePagina("body>pnip-root"));
    assert.ok(!participanteDePagina(botao.key) && !participanteDePagina(interno.key));
    for (const [u, state] of [[a02, "inicial"], [b04, "inicial"]] as const) {
      assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [u], [link(html, u, [""], { state })])])]), /does not fit/);
    }
    // The reviewer's scenario: "no lang" split into a1..aN, each linked (one-word evidence) to another unit.
    const cita = (k: string) => [`medido ${k}`];
    const atomos = [
      ref([""], [p01], [link(html, p01, [""])], { id: "a1" }),
      ref([""], [a01], [link(html, a01, [""], { relation: "transicao", state: "aberto", evidence: cita(dialogo.key) })], { id: "a2" }),
      ref([""], [a02], [link(html, a02, [""], { relation: "participante-relacionado", evidence: cita(botao.key) })], { id: "a3" }),
    ];
    assert.throws(() => pontua(pkg, [decision(html.id, atomos)]), /more than one reference atom/);
    // Same subject, one atom, several link-only units: refused too (not just "matching takes one").
    assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [p01, a01], [link(html, p01, [""]),
      link(html, a01, [""], { relation: "transicao", state: "aberto", evidence: cita(dialogo.key) })])])]), /at most one unit/);
    // The legitimate absence (P-01 header missing, anchored on <html>) is accepted: exactly one unit.
    assert.equal(pontua(pkg, [decision(html.id, [atomos[0]])]).counts.detectedUnits, 1);
  });

  test("NAT-72 review fix: B-01 skip-link absence on the app root is a legit global absence; sibling-card link copies fail", () => {
    const raiz = { key: "body>pnip-root", id: "E-raiz", label: "<pnip-root>", hidden: null };
    const r2: Resolution = { url: res.url, byKey: new Map([...res.byKey, [raiz.key, raiz]]),
      bySelector: new Map([...res.bySelector, ["#E-raiz", { selector: "#E-raiz", ok: true, error: null, keys: [raiz.key] }]]) };
    const b01 = un("B-01", raiz, ["inicial"]);
    const pkg = prepareSemanticPackage(context, [...refUnits, b01], r2,
      [{ id: "r1", data: run([claim("#E-body"), claim("#E-html")] as FlowAgentResults["findings"]) }]);
    const body = cardOf(pkg, "#E-body"), html = cardOf(pkg, "#E-html");
    const u = uid(pkg, "B-01");
    assert.deepEqual(body.candidateUnitIds, []);
    assert.equal(pontua(pkg, [decision(body.id, [ref(["body"], [u], [link(body, u, ["body"])])])]).matched[0].vinculo, "ausencia-global");
    // A link written for the sibling <html> card does not ride on the body card (binding.card differs).
    assert.throws(() => pontua(pkg, [decision(body.id, [ref(["body"], [u], [{ ...link(body, u, ["body"]), binding: link(html, u, [""]).binding }])])]),
      /another card/);
  });

  test("NAT-72 review fix: links exist from flow-semantic-1.6.0 on (semver), never before", () => {
    assert.ok(aceitaVinculos("flow-semantic-1.6.0") && aceitaVinculos("flow-semantic-1.7.2") && aceitaVinculos("flow-semantic-2.0.0"));
    assert.ok(!aceitaVinculos("flow-semantic-1.5.0") && !aceitaVinculos("flow-semantic-1.10") && !aceitaVinculos("outra-1.9.0"));
  });

  test("NAT-72 composite 'unnamed control + another with text': parts judged apart, no borrowed credit", () => {
    const pkg = pacote(["#composto"]);
    const c = cardOf(pkg, "#composto");
    const b04 = uid(pkg, "B-04");
    assert.deepEqual(c.candidateUnitIds, [b04]);
    // One atom over both subjects: the extra subject cannot ride on the correct unit.
    assert.throws(() => pontua(pkg, [decision(c.id, [ref([interno.key, th.key], [b04])])]), /Unsupported subject/);
    const parts = (outro: ReviewAtom["verdict"]) => [ref([interno.key], [b04]),
      { id: "a2", text: "th Data tem texto", subjects: [th.key], verdict: outro, unitIds: [], citation: "unsupported" as const }];
    for (const outro of ["false", "novel", "unresolved"] as const) {
      const s = pontua(pkg, [decision(c.id, parts(outro))]);
      assert.equal(s.counts.detectedUnits, 1, outro);
      assert.equal(s.counts.falseAssertions, outro === "false" ? 1 : 0);
      assert.equal(s.counts.novelAssertions, outro === "novel" ? 1 : 0);
      assert.equal(s.counts.unresolvedAssertions, outro === "unresolved" ? 1 : 0);
      assert.equal(s.status, outro === "unresolved" ? "provisional" : "complete");
      assert.deepEqual(s.assertions.filter(a => a.cardId === c.id).map(a => a.subjectId).sort(), [interno.key, th.key].sort());
    }
    // Every claimed subject must be covered by some atom.
    assert.throws(() => pontua(pkg, [decision(c.id, [ref([interno.key], [b04])])]), /omitted a subject/);
    // The request builder (painel/bench) never assigns a subject by omission.
    const sujeitos = c.subjects.map(s => s.id);
    const so = (pedidos: Parameters<typeof montarAtomos>[6]) => montarAtomos(pkg, c, null, "author", sujeitos, c.candidateUnitIds, pedidos);
    const faltou = so([{ texto: "sem nome", sujeitos: [interno.key], decisao: "defeito-do-gabarito", unitIds: [b04] }]);
    assert.equal(faltou.ok, false);
    assert.match((faltou as { erro: string }).erro, /não estão em nenhuma parte/);
    const montado = so([{ texto: "sem nome", sujeitos: [interno.key], decisao: "defeito-do-gabarito", unitIds: [b04] },
      { texto: "th Data tem texto", sujeitos: [th.key], decisao: "incorreta" }]);
    assert.ok(montado.ok);
    const atoms = normalizeReviews({ version: pkg.version, decisions: [{ ...decision(c.id, []), atoms: (montado as { atoms: RawReviewAtom[] }).atoms }] }).decisions[0].atoms;
    assert.deepEqual(atoms.map(a => [a.subjects, a.verdict]), [[[interno.key], "reference"], [[th.key], "false"]]);
    const s = pontua(pkg, [decision(c.id, atoms)]);
    assert.equal(s.counts.detectedUnits, 1);
    assert.equal(s.counts.falseAssertions, 1);
  });

  test("NAT-72 other state or route is refused; unknown subject or scope does not ride along", () => {
    // Same family in another route (segment scene): a link cannot cross scenes.
    const lista = { ...res, url: "http://fixture/app/lista" }, detalhe = { ...res, url: "http://fixture/app/detalhe" };
    const cenas: SceneResolution[] = [
      { id: "1280x900@lista", viewport: wide, specIds: ["P-01"], resolution: lista, segmento: { numero: 0, estado: "inicial", path: "/app/lista", estados: ["inicial"] } },
      { id: "1280x900@detalhe", viewport: wide, specIds: ["P-01"], resolution: detalhe, segmento: { numero: 1, estado: "aberto", path: "/app/detalhe", estados: ["aberto"] } },
    ];
    const seg = prepareSemanticPackage(context, [{ ...refUnits[0], states: ["inicial"], scene: "1280x900@lista" },
      { ...refUnits[0], state: "aberto", states: ["aberto"], scene: "1280x900@detalhe" }], cenas,
      [{ id: "r1", data: run([claim("#E-html")] as FlowAgentResults["findings"]) }], { stateOrder: ["inicial", "aberto"] });
    const c = seg.cards[0];
    assert.equal(c.scene, "a-decidir:1280x900");
    const daCena = (cena: string) => seg.units.find(u => u.scene === cena)!.id;
    const sujeito = "1280x900@lista|";
    const l = (cena: string, state: string): ReviewLink => ({ ...link(c, daCena(cena), [sujeito], { scene: cena, state }) });
    const em = (links: ReviewLink[], unitId: string) => ({ ...decision(c.id, [ref([sujeito], [unitId], links)]), cena: "1280x900@lista" });
    assert.equal(scoreSemanticPackage(seg, reviews(seg, [em([l("1280x900@lista", "inicial")], daCena("1280x900@lista"))])).scores[0].counts.detectedUnits, 1);
    assert.throws(() => scoreSemanticPackage(seg, reviews(seg, [em([l("1280x900@detalhe", "aberto")], daCena("1280x900@detalhe"))])), /crosses scenes/);
    assert.throws(() => scoreSemanticPackage(seg, reviews(seg, [em([{ ...l("1280x900@detalhe", "aberto"), scene: "1280x900@lista" }],
      daCena("1280x900@detalhe"))])), /not the unit's scene/);
    // Same scene, other state: refused.
    const pkg = pacote(["#E-html", "#ausente"]);
    const html = cardOf(pkg, "#E-html");
    assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [uid(pkg, "P-01")], [link(html, uid(pkg, "P-01"), [""], { state: "envio" })])])]), /not the declared state/);
    // Unresolved selector: there is no subject to link.
    const aus = cardOf(pkg, "#ausente");
    const fantasma = aus.subjects[0].id;
    assert.throws(() => pontua(pkg, [decision(aus.id, [ref([fantasma], [uid(pkg, "P-01")], [link(aus, uid(pkg, "P-01"), [fantasma])])])]), /Unresolved subject cannot be linked/);
    // A subject the card does not have, and a subject outside its atom.
    assert.throws(() => pontua(pkg, [decision(html.id, [ref(["body>nada"], [uid(pkg, "P-01")], [link(html, uid(pkg, "P-01"), ["body>nada"])])])]), /Unknown subject/);
    assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [uid(pkg, "P-01")], [link(html, uid(pkg, "P-01"), ["", "body"])])])]), /outside its atom/);
    // A window outside the plan has no scene to link into.
    const fora = prepareSemanticPackage(context, refUnits, [{ id: "1280x900", viewport: wide, specIds: ["P-01"], resolution: res }],
      [{ id: "r1", data: run([{ ...claim("#E-html"), state: { viewport: { width: 375, height: 800 }, steps: [] } }] as FlowAgentResults["findings"]) }]);
    const fc = fora.cards[0];
    assert.match(fc.scene, /^fora-do-plano/);
    assert.throws(() => scoreSemanticPackage(fora, reviews(fora, [decision(fc.id, [ref([""], [uid(fora, "P-01")], [link(fc, uid(fora, "P-01"), [""], { scene: "1280x900" })])])])), /crosses scenes/);
  });

  test("NAT-72 negative controls: no evidence/context, invented unit, other build/execution, contradicted claim, unsigned", () => {
    const pkg = pacote(["#E-html"]);
    const html = cardOf(pkg, "#E-html");
    const p01 = uid(pkg, "P-01");
    const ok = link(html, p01, [""]);
    const tenta = (l: Partial<ReviewLink> | ReviewLink, atomo: Partial<ReviewAtom> = {}, unitIds = [p01]) =>
      pontua(pkg, [decision(html.id, [ref([""], unitIds, [{ ...ok, ...l } as ReviewLink], atomo)])]);
    assert.equal(tenta({}).counts.detectedUnits, 1);
    assert.throws(() => tenta({ evidence: [] }), /without evidence/);
    assert.throws(() => tenta({ evidence: ["  "] }), /without evidence/);
    assert.throws(() => tenta({ justification: " " }), /without justification/);
    assert.throws(() => tenta({ relation: "parece-certo" as never }), /without a declared relation/);
    assert.throws(() => tenta({ contrato: "vinculo-0" as never }), /Unknown review link contract/);
    assert.throws(() => tenta({ unitId: "U-inventada" }, {}, [p01, "U-inventada"]), /unknown unit/);
    assert.throws(() => tenta({ unitId: uid(pkg, "A-02") }), /does not name/);
    assert.throws(() => tenta({ reviewer: "outra pessoa" }), /not signed by the deciding reviewer/);
    assert.throws(() => tenta({ binding: { ...ok.binding, build: "b".repeat(64) } }), /another build\/execution/);
    // The same claim in another execution has another runScope: its link does not transfer.
    const outra = pacote(["#E-html"], "r2");
    const outroCard = cardOf(outra, "#E-html");
    assert.notEqual(outroCard.binding.runScope, html.binding.runScope);
    assert.throws(() => tenta({ binding: { build: outroCard.binding.build, runScope: outroCard.binding.runScope, card: cartaoDoVinculo(outroCard) } }), /another build\/execution/);
    // Contradicted (false), novel or unresolved claims never carry a link.
    for (const verdict of ["false", "novel", "unresolved"] as const) {
      assert.throws(() => tenta({}, { verdict, unitIds: [] }, []), /non-reference atom/);
    }
    assert.throws(() => pontua(pkg, [decision(html.id, [ref([""], [p01], [])])]), /Empty review link list/);
  });

  test("NAT-72 legacy path: a 1.5.0 package scores as before, refuses links, and gets none retroactively", () => {
    assert.equal(SEMANTIC_SCORING_VERSION, "flow-semantic-1.8.2");
    assert.deepEqual([...SEMANTIC_LEGACY_VERSIONS], ["flow-semantic-1.5.0", "flow-semantic-1.6.0", "flow-semantic-1.7.0", "flow-semantic-1.8.0", "flow-semantic-1.8.1"]);
    const atual = pacote(["#E-html", "#E-header"]);
    const { packageHash: _h, ...corpo } = { ...atual, version: "flow-semantic-1.5.0" };
    const legado: SemanticPackage = { ...corpo, packageHash: digest(corpo) };
    validatePackage(legado);
    const hd = cardOf(legado, "#E-header"), html = cardOf(legado, "#E-html");
    const p01 = uid(legado, "P-01");
    const ds = [decision(hd.id, [ref([cabecalho.key], [p01])]),
      decision(html.id, [{ id: "a1", text: "sem cabeçalho", subjects: [""], verdict: "novel", unitIds: [], citation: "uncertain" }])];
    const rev = { version: "flow-semantic-1.5.0", decisions: scopeReviews(legado).decisions.map(d => ds.find(x => x.cardId === d.cardId) ?? d) };
    const r = scoreSemanticPackage(legado, rev);
    assert.equal(r.version, "flow-semantic-1.5.0", "the result keeps the package's version");
    // Same decisions on the current package: identical scores, only the version label differs.
    const now = scoreSemanticPackage(atual, { ...rev, version: atual.version });
    assert.deepEqual(r.scores, now.scores);
    assert.ok(r.scores[0].matched.every(m => !("vinculo" in m)), "no link marker without links");
    // A link on a legacy decision is refused; reviews of another version are refused, never migrated.
    const comVinculo = { ...rev, decisions: rev.decisions.map(d => d.cardId !== html.id ? d
      : decision(html.id, [ref([""], [p01], [link(html, p01, [""])])])) };
    assert.throws(() => scoreSemanticPackage(legado, comVinculo), /no retroactive link/);
    assert.throws(() => scoreSemanticPackage(legado, { ...rev, version: SEMANTIC_SCORING_VERSION }), /Incompatible review version/);
    assert.throws(() => scopeReviews(atual, rev), /Incompatible review version/);
    assert.throws(() => validatePackage({ ...legado, version: "flow-semantic-1.4.0" }), /Incompatible semantic scoring version/);
    // The request builder refuses too, and the legacy review.md does not teach links.
    const m = montarVinculos(legado, html, null, "author", [""], [p01], [{ unitId: p01, estado: "inicial", relacao: "ausencia-global", evidencia: ["x"], justificativa: "y" }]);
    assert.equal(m.ok, false);
    assert.match((m as { erro: string }).erro, /vínculo retroativo/);
    assert.doesNotMatch(renderReview(legado, rev), /Vínculo de revisão/);
    assert.match(renderReview(atual, scopeReviews(atual)), /Vínculo de revisão/);
  });

  test("NAT-72 maximum matching stays order-invariant with links", () => {
    const pkg = pacote(["#E-html", "#E-header"]);
    const html = cardOf(pkg, "#E-html"), hd = cardOf(pkg, "#E-header");
    const p01 = uid(pkg, "P-01");
    const ds = [decision(html.id, [ref([""], [p01], [link(html, p01, [""])])]), decision(hd.id, [ref([cabecalho.key], [p01])])];
    const a = scoreSemanticPackage(pkg, reviews(pkg, ds));
    const b = scoreSemanticPackage(pkg, reviews(pkg, [...ds].reverse()));
    assert.deepEqual(a.scores, b.scores);
    assert.equal(a.scores[0].counts.detectedUnits, 1);
    assert.equal(a.scores[0].counts.redundantReferenceAssertions, 1);
    // Link order inside an atom does not matter either.
    const two = [link(html, p01, [""]), link(html, p01, [""], { relation: "participante-relacionado", evidence: [`header medido: ${cabecalho.key}`] })];
    const x = scoreSemanticPackage(pkg, reviews(pkg, [decision(html.id, [ref([""], [p01], two)])]));
    const y = scoreSemanticPackage(pkg, reviews(pkg, [decision(html.id, [ref([""], [p01], [...two].reverse())])]));
    assert.deepEqual(x.scores[0].counts, y.scores[0].counts);
  });
}


// ── flow-semantic-1.8.0: domínio de aplicabilidade provado (NAT-74, decisão 59019ac) ──
{
  const B = "b".repeat(64), REF = "e".repeat(64), OUTRO_BUILD = "c".repeat(64);
  // 1.8.1: a referência do domínio é a identidade canônica do pacote (context.referenceHash).
  const ctxB = { ...context, referenceHash: REF };
  const ev = (s: string) => [{ source: `tela-b/vistorias/medida.json#${s}`, sha256: "a".repeat(64) }];
  const el = (key: string, label: string) => ({ key, id: `E-${label}`, label, hidden: null });
  const raiz = el("body>pnip-root", "<pnip-root>");
  const titulo = el("head>title", "<title>");
  const h3 = el("body>pnip-root>main>pnip-propesc-agendar-vistoria>div>h3", "<h3>");
  const botao = el("body>pnip-root>pnip-header>button", "<button> Menu");
  const doc = el("", "<html>");
  const corpo = el("body", "<body>");
  const resDe = (url: string, xs: { key: string }[]): Resolution => {
    const byKey = new Map(xs.map(x => [x.key, x as ReturnType<typeof el>]));
    const sel = new Map<string, { selector: string; ok: boolean; error: string | null; keys: string[] }>();
    const por: Record<string, string> = { "pnip-root": raiz.key, "head > title": titulo.key, "h3": h3.key, "header button": botao.key, "html": doc.key, "body": corpo.key };
    for (const [s, k] of Object.entries(por)) sel.set(s, { selector: s, ok: true, error: null, keys: byKey.has(k) ? [k] : [] });
    sel.set("#nada", { selector: "#nada", ok: false, error: "no match", keys: [] });
    return { url, byKey, bySelector: sel } as Resolution;
  };
  const LISTA = "1280x900@inicial", MENU = "1280x900@detalhe-menu", MODAL = "1280x900@modal";
  const cenas: SceneResolution[] = [
    { id: LISTA, viewport: wide, specIds: [], resolution: resDe("http://f/pnip/vistorias", [doc, corpo, raiz, titulo, botao]),
      segmento: { numero: 0, estado: "inicial", path: "/pnip/vistorias", estados: ["inicial"] } },
    { id: MENU, viewport: wide, specIds: [], resolution: resDe("http://f/pnip/vistorias/3046", [doc, corpo, raiz, titulo, botao, h3]),
      segmento: { numero: 1, estado: "detalhe-menu", path: "/pnip/vistorias/3046", estados: ["detalhe-menu"] } },
    { id: MODAL, viewport: wide, specIds: ["B-01", "B-21", "B-25", "C-X"], resolution: resDe("http://f/pnip/vistorias/3038", [doc, corpo, raiz, titulo, botao, h3]),
      segmento: { numero: 2, estado: "modal", path: "/pnip/vistorias/3038", estados: ["detalhe", "modal"] } },
  ];
  type Entrada = Parameters<typeof prepareSemanticPackage>[1][number];
  const dom = (scene: string, states: string[], kind: "ausencia-global" | "elemento" | "documento", predicate: string, participants: string[], build = B) =>
    ({ scene, states, kind, predicate, participants, reference: REF, build, evidence: ev(`${predicate}@${scene}`) });
  const unidade = (specId: string, e: { key: string }, state: string, states: string[], domain?: Entrada["domain"]): Entrada => ({
    specId, element: e as FlowUnit["element"], participants: [e.key], rules: ["wcag:x"], categories: ["x"], description: specId,
    state, states, conditional: false, scene: MODAL, ...(domain ? { domain } : {}) });
  const todas = ["inicial", "detalhe-menu", "detalhe", "modal"];
  const b01Dominio = (cenasB01 = [LISTA, MENU, MODAL]) => cenasB01.map(c => dom(c,
    c === LISTA ? ["inicial"] : c === MENU ? ["detalhe-menu"] : ["detalhe", "modal"], "ausencia-global", "sem-salto-para-conteudo", [raiz.key]));
  const refUnits = (o: { b01?: string[]; b01Build?: string } = {}): Entrada[] => [
    unidade("B-01", raiz, "sempre", todas, (o.b01 ? b01Dominio(o.b01) : b01Dominio()).map(e => ({ ...e, build: o.b01Build ?? B }))),
    unidade("B-25", titulo, "sempre", todas, [LISTA, MENU, MODAL].map(c => dom(c, c === LISTA ? ["inicial"] : c === MENU ? ["detalhe-menu"] : ["detalhe", "modal"],
      "documento", "titulo-inadequado", [titulo.key]))),
    unidade("B-21", h3, "detalhe", ["detalhe", "modal"], [dom(MODAL, ["detalhe"], "documento", "hierarquia-comeca-em-h3", [h3.key]),
      dom(MENU, ["detalhe-menu"], "documento", "hierarquia-comeca-em-h3", [h3.key])]),
    // Controle de estado `sempre`, sem domínio medido: não ganha a exceção por ser `sempre`.
    unidade("C-X", botao, "sempre", todas),
  ];
  const cfg = (build: string) => ({ siteManifestSha256: build, instrumentVersion: "fluxo-1.3.0", protocolVersion: "fixture-protocol" }) as FlowAgentResults["config"];
  const alegacao = (selector: string, rule: string | null = null, viewport = wide) => ({ selector, rule, observed: `sobre ${selector}`, expected: "e",
    state: { viewport, steps: ["navegou"] }, evidence: [] });
  const agente = (id: string, selectors: string[], build = B, viewport = wide): PrepareRun => ({ id, data: { ...run(selectors.map(s => alegacao(s, null, viewport)) as FlowAgentResults["findings"]), config: cfg(build) } });
  const prep = (runs: PrepareRun[], us = refUnits()) => prepareSemanticPackage(ctxB, us, cenas, runs, { stateOrder: todas });
  const uid = (pkg: SemanticPackage, specId: string) => pkg.units.find(u => u.specId === specId)!.id;
  const vinc = (card: SemanticPackage["cards"][number], unitId: string, subject: string, scene: string, o: Partial<ReviewLink> = {}): ReviewLink => ({
    contrato: VINCULO_CONTRATO, unitId, subjects: [subject], scene, state: "sempre", relation: "ausencia-global",
    evidence: [`medida headless em ${scene}: nenhum .br-skiplink nem âncora # (participante ${raiz.key})`], justification: "falta o salto para o conteúdo nesta rota",
    reviewer: "author", binding: { build: card.binding.build, runScope: card.binding.runScope, card: cartaoDoVinculo(card) }, ...o });
  const credito = (pkg: SemanticPackage, card: SemanticPackage["cards"][number], cena: string | undefined, subject: string, unitId: string, link: ReviewLink): SemanticDecision => ({
    ...decision(card.id, [{ id: "a1", text: "parte", subjects: [subject], verdict: "reference", unitIds: [unitId], citation: "uncertain", links: [link] }]),
    ...(cena ? { cena } : {}) });
  const sj = (cena: string, key: string) => `${cena}|${key}`;

  test("1.8.0: version, domain in the package hash, one unit per spec", () => {
    assert.equal(SEMANTIC_SCORING_VERSION, "flow-semantic-1.8.2");
    assert.ok(aceitaDominio("flow-semantic-1.8.0") && aceitaDominio("flow-semantic-2.0.0"));
    assert.ok(!aceitaDominio("flow-semantic-1.7.0") && !aceitaDominio("flow-semantic-1.6.0"));
    const pkg = prep([agente("r1", ["pnip-root"])]);
    assert.equal(pkg.units.filter(u => u.specId === "B-01").length, 1, "no per-segment unit");
    assert.equal(pkg.units.find(u => u.specId === "B-01")!.scene, MODAL, "canonical scene stays the last segment");
    assert.deepEqual(pkg.units.find(u => u.specId === "B-01")!.domain!.map(e => e.scene), [MENU, LISTA, MODAL].sort());
    assert.equal(pkg.units.find(u => u.specId === "C-X")!.domain, undefined);
    const semDominio = prep([agente("r1", ["pnip-root"])], refUnits().map(u => ({ ...u, domain: undefined })));
    assert.notEqual(semDominio.packageHash, pkg.packageHash);
  });

  test("1.8.0: B-01 credited from the authorized list and detail scenes, and only once", () => {
    const pkg = prep([agente("r1", ["pnip-root", "body"])]);
    const b01 = uid(pkg, "B-01");
    const raizCard = pkg.cards.find(c => c.selector === "pnip-root")!, corpoCard = pkg.cards.find(c => c.selector === "body")!;
    assert.equal(raizCard.scene, "a-decidir:1280x900");
    // Lista (rota /vistorias): o participante medido NESTA cena é o próprio sujeito.
    const naLista = credito(pkg, raizCard, LISTA, sj(LISTA, raiz.key), b01, vinc(raizCard, b01, sj(LISTA, raiz.key), LISTA));
    const s1 = scoreSemanticPackage(pkg, reviews(pkg, [naLista])).scores[0];
    assert.deepEqual(s1.matched.map(m => [m.unitId, m.vinculo]), [[b01, "ausencia-global"]]);
    // Detalhe (rota /3046) com <body> como sujeito: ancestral do participante medido ali.
    const noDetalhe = credito(pkg, corpoCard, MENU, sj(MENU, "body"), b01, vinc(corpoCard, b01, sj(MENU, "body"), MENU));
    const s2 = scoreSemanticPackage(pkg, reviews(pkg, [noDetalhe])).scores[0];
    assert.deepEqual(s2.matched.map(m => m.unitId), [b01]);
    // As duas no mesmo run: a unidade é creditada uma vez; a outra afirmação é redundante.
    const s3 = scoreSemanticPackage(pkg, reviews(pkg, [naLista, noDetalhe])).scores[0];
    assert.equal(s3.counts.detectedUnits, 1);
    assert.equal(s3.counts.redundantReferenceAssertions, 1);
    assert.equal(s3.counts.referenceUnits, pkg.units.length, "denominator unchanged");
  });

  test("1.8.0: a route where the skip link exists is not in the domain and earns nothing", () => {
    const pkg = prep([agente("r1", ["pnip-root"])], refUnits({ b01: [LISTA, MODAL] }));
    const b01 = uid(pkg, "B-01");
    const c = pkg.cards[0];
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, MENU, sj(MENU, raiz.key), b01, vinc(c, b01, sj(MENU, raiz.key), MENU))])),
      /outside its proven domain/);
    assert.equal(scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, LISTA, sj(LISTA, raiz.key), b01, vinc(c, b01, sj(LISTA, raiz.key), LISTA))])).scores[0].counts.detectedUnits, 1);
  });

  test("1.8.0: absence measured only in another scene, other build, other window: refused", () => {
    // Domínio só na cena canônica: nada atravessa.
    const so = prep([agente("r1", ["pnip-root"])], refUnits({ b01: [MODAL] }));
    const c = so.cards[0];
    assert.throws(() => scoreSemanticPackage(so, reviews(so, [credito(so, c, LISTA, sj(LISTA, raiz.key), uid(so, "B-01"), vinc(c, uid(so, "B-01"), sj(LISTA, raiz.key), LISTA))])),
      /outside its proven domain/);
    // Outro build: o domínio foi medido no build B; o cartão vem de outro.
    const ob = prep([agente("r1", ["pnip-root"], OUTRO_BUILD)]);
    const oc = ob.cards[0];
    assert.throws(() => scoreSemanticPackage(ob, reviews(ob, [credito(ob, oc, LISTA, sj(LISTA, raiz.key), uid(ob, "B-01"), vinc(oc, uid(ob, "B-01"), sj(LISTA, raiz.key), LISTA))])),
      /measured on another build/);
    // Outra janela: fora do plano, sem cena para vincular.
    const oj = prep([agente("r1", ["pnip-root"], B, { width: 375, height: 800 })]);
    const jc = oj.cards[0];
    assert.match(jc.scene, /^fora-do-plano/);
    assert.throws(() => scoreSemanticPackage(oj, reviews(oj, [credito(oj, jc, undefined, raiz.key, uid(oj, "B-01"), vinc(jc, uid(oj, "B-01"), raiz.key, LISTA))])), /crosses scenes/);
    assert.throws(() => scoreSemanticPackage(oj, reviews(oj, [credito(oj, jc, undefined, raiz.key, uid(oj, "B-01"), vinc(jc, uid(oj, "B-01"), raiz.key, jc.scene))])),
      /outside its proven domain/);
  });

  test("1.8.0: nonexistent subject, button/sibling, link without evidence, bare 2.4.1 citation: never B-01", () => {
    const pkg = prep([agente("r1", ["pnip-root", "header button", "#nada"])]);
    const b01 = uid(pkg, "B-01");
    const bt = pkg.cards.find(c => c.selector === "header button")!;
    // Um botão qualquer não é documento nem ancestral do participante de página medido na cena.
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, bt, LISTA, sj(LISTA, botao.key), b01, vinc(bt, b01, sj(LISTA, botao.key), LISTA))])),
      /does not fit the predicate/);
    const c = pkg.cards.find(x => x.selector === "pnip-root")!;
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, LISTA, sj(LISTA, raiz.key), b01, vinc(c, b01, sj(LISTA, raiz.key), LISTA, { evidence: [] }))])),
      /without evidence/);
    // Sujeito inexistente (seletor não resolvido) e citação nua de 2.4.1: nada a vincular.
    const nada = pkg.cards.find(x => x.selector === "#nada")!;
    assert.equal(nada.subjects[0].key, null);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, nada, undefined, nada.subjects[0].id, b01, vinc(nada, b01, nada.subjects[0].id, nada.scene))])),
      /Unresolved subject cannot be linked|outside its proven domain/);
    const citacao = prepareSemanticPackage(ctxB, refUnits(), cenas, [{ id: "r1", data: { ...run([alegacao("#nada", "wcag:2.4.1")] as FlowAgentResults["findings"]), config: cfg(B) } }], { stateOrder: todas });
    const cc = citacao.cards[0];
    assert.deepEqual(cc.candidateUnitIds, []);
    assert.throws(() => scoreSemanticPackage(citacao, reviews(citacao, [decision(cc.id, [{ id: "a1", text: "sem 2.4.1", subjects: [cc.subjects[0].id], verdict: "reference",
      unitIds: [uid(citacao, "B-01")], citation: "supported" }])])), /Unanchored/);
    // Sujeito de outra cena do cartão: o vínculo nomeia a cena em que o cartão foi julgado.
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, LISTA, sj(LISTA, raiz.key), b01, vinc(c, b01, sj(LISTA, raiz.key), MENU))])), /crosses scenes/);
    // A cena escolhida não pode emprestar o sujeito de outra.
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, MENU, sj(LISTA, raiz.key), b01, vinc(c, b01, sj(LISTA, raiz.key), LISTA))])), /outside the chosen scene/);
  });

  test("1.8.0: B-25 follows its own predicate (inadequate title), never global absence", () => {
    const pkg = prep([agente("r1", ["head > title", "body"])]);
    const b25 = uid(pkg, "B-25");
    const t = pkg.cards.find(c => c.selector === "head > title")!;
    const porTitulo = vinc(t, b25, sj(LISTA, titulo.key), LISTA, { relation: "participante-relacionado",
      evidence: [`document.title = "PNIP" em /pnip/vistorias (${titulo.key})`] });
    assert.deepEqual(scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, t, LISTA, sj(LISTA, titulo.key), b25, porTitulo)])).scores[0].matched.map(m => [m.unitId, m.vinculo]),
      [[b25, "participante-relacionado"]]);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, t, LISTA, sj(LISTA, titulo.key), b25, { ...porTitulo, relation: "ausencia-global" })])), /does not fit the predicate/);
    const corpoCard = pkg.cards.find(c => c.selector === "body")!;
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, corpoCard, LISTA, sj(LISTA, "body"), b25, vinc(corpoCard, b25, sj(LISTA, "body"), LISTA))])), /does not fit the predicate/);
    // O documento (<html>) é sujeito legítimo de uma propriedade do documento; um contêiner como <body>, não.
    const html = prep([agente("r1", ["html"])]);
    const hc = html.cards[0];
    const viaDoc = vinc(hc, uid(html, "B-25"), sj(LISTA, ""), LISTA, { relation: "participante-relacionado", evidence: [`document.title = "PNIP" (${titulo.key})`] });
    assert.equal(scoreSemanticPackage(html, reviews(html, [credito(html, hc, LISTA, sj(LISTA, ""), uid(html, "B-25"), viaDoc)])).scores[0].counts.detectedUnits, 1);
    // Evidência que não cita a chave medida do <title>: não basta.
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, t, LISTA, sj(LISTA, titulo.key), b25, { ...porTitulo, evidence: ["o título é ruim"] })])), /does not fit the predicate/);
  });

  test("1.8.0: B-21 by its own predicate in the measured detail route; not in the list; declared state only", () => {
    const pkg = prep([agente("r1", ["h3", "body"])]);
    const b21 = uid(pkg, "B-21");
    const c = pkg.cards.find(x => x.selector === "h3")!;
    const l = vinc(c, b21, sj(MENU, h3.key), MENU, { relation: "participante-relacionado", state: "detalhe", evidence: [`títulos medidos em /3046: h3 h4 (${h3.key})`] });
    assert.deepEqual(scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, MENU, sj(MENU, h3.key), b21, l)])).scores[0].matched.map(m => m.unitId), [b21]);
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, MENU, sj(MENU, h3.key), b21, { ...l, state: "detalhe-menu" })])), /not the declared state/);
    // "Sem h1" afirmado sobre o documento na rota do detalhe medida: o esboço de títulos é do documento.
    const html = prep([agente("r1", ["html"])]);
    const hc = html.cards[0];
    assert.equal(scoreSemanticPackage(html, reviews(html, [credito(html, hc, MENU, sj(MENU, ""), uid(html, "B-21"), { ...vinc(hc, uid(html, "B-21"), sj(MENU, ""), MENU),
      relation: "participante-relacionado", state: "detalhe", evidence: [`títulos medidos em /3046: h3 h4 (${h3.key})`] })])).scores[0].counts.detectedUnits, 1);
    // Um elemento qualquer (o botão do cabeçalho) não é o documento nem o título medido.
    const bt = prep([agente("r1", ["header button"])]);
    const bc = bt.cards[0];
    assert.throws(() => scoreSemanticPackage(bt, reviews(bt, [credito(bt, bc, MENU, sj(MENU, botao.key), uid(bt, "B-21"), { ...vinc(bc, uid(bt, "B-21"), sj(MENU, botao.key), MENU),
      relation: "participante-relacionado", state: "detalhe", evidence: [h3.key] })])), /does not fit the predicate/);
    const corpoCard = pkg.cards.find(x => x.selector === "body")!;
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, corpoCard, LISTA, sj(LISTA, "body"), b21,
      vinc(corpoCard, b21, sj(LISTA, "body"), LISTA, { relation: "participante-relacionado", state: "detalhe", evidence: [h3.key] }))])), /outside its proven domain/);
  });

  test("1.8.0: control unit `sempre` without measured domain, and transition/host relations, stay strict", () => {
    const pkg = prep([agente("r1", ["header button", "pnip-root"])]);
    const cx = uid(pkg, "C-X");
    const bt = pkg.cards.find(c => c.selector === "header button")!;
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, bt, LISTA, sj(LISTA, botao.key), cx,
      vinc(bt, cx, sj(LISTA, botao.key), LISTA, { relation: "participante-relacionado", evidence: [botao.key] }))])), /not the unit's scene/);
    // Na cena canônica o caminho é o de sempre (ancoragem estrita, sem vínculo).
    assert.equal(scoreSemanticPackage(pkg, reviews(pkg, [{ ...decision(bt.id, [{ id: "a1", text: "t", subjects: [sj(MODAL, botao.key)], verdict: "reference", unitIds: [cx], citation: "supported" }]), cena: MODAL }])).scores[0].counts.detectedUnits, 1);
    // Mesmo dentro do domínio, transição e host-interno não atravessam cena.
    const c = pkg.cards.find(x => x.selector === "pnip-root")!;
    const b01 = uid(pkg, "B-01");
    for (const relation of ["transicao", "host-interno", "participante-relacionado"] as const)
      assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, LISTA, sj(LISTA, raiz.key), b01,
        vinc(c, b01, sj(LISTA, raiz.key), LISTA, { relation, evidence: [`medido ${raiz.key}`] }))])), /does not fit the predicate/, relation);
    // Assinatura e amarração continuam valendo no vínculo que atravessa.
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, LISTA, sj(LISTA, raiz.key), b01, vinc(c, b01, sj(LISTA, raiz.key), LISTA, { reviewer: "outra" }))])), /not signed/);
    const bc = pkg.cards.find(x => x.selector === "header button")!;
    assert.throws(() => scoreSemanticPackage(pkg, reviews(pkg, [credito(pkg, c, LISTA, sj(LISTA, raiz.key), b01, { ...vinc(c, b01, sj(LISTA, raiz.key), LISTA), binding: vinc(bc, b01, "", LISTA).binding })])), /another card/);
  });

  test("1.8.0: arm/baseline symmetry — the same rule for an agent card and a deterministic card", () => {
    const lb: PrepareRun = { id: "axe", kind: "linha-de-base", tool: "axe", data: { model: "axe", timestamp: "fixed", appUrl: "http://f/pnip/vistorias",
      findings: [{ selector: "pnip-root", rule: "axe:bypass", observed: "sem mecanismo de salto", expected: null, scene: LISTA, viewport: wide, steps: [] }] as unknown as FlowAgentResults["findings"],
      config: { instrumentVersion: "fluxo-1.3.0", protocolVersion: "baseline:axe", siteManifestSha256: B } as FlowAgentResults["config"] } };
    const pkg = prep([agente("sem", ["pnip-root"]), agente("com", ["pnip-root"]), lb]);
    const b01 = uid(pkg, "B-01");
    const ag = (runId: string) => pkg.cards.find(c => pkg.runs.find(r => r.id === runId)!.cardIds.includes(c.id))!;
    const lc = ag("axe");
    assert.equal(lc.scene, LISTA);
    const ds = [
      credito(pkg, ag("sem"), LISTA, sj(LISTA, raiz.key), b01, vinc(ag("sem"), b01, sj(LISTA, raiz.key), LISTA)),
      credito(pkg, ag("com"), MENU, sj(MENU, raiz.key), b01, vinc(ag("com"), b01, sj(MENU, raiz.key), MENU)),
      credito(pkg, lc, undefined, raiz.key, b01, vinc(lc, b01, raiz.key, LISTA)),
    ];
    const r = scoreSemanticPackage(pkg, reviews(pkg, ds));
    const by = (id: string) => r.scores.find(s => s.runId === id)!;
    for (const id of ["sem", "com", "axe"]) {
      assert.equal(by(id).counts.detectedUnits, 1, id);
      assert.deepEqual(by(id).matched.map(m => [m.unitId, m.vinculo]), [[b01, "ausencia-global"]], id);
    }
    assert.ok(r.comparisons.filter(x => x.baseline === "axe").every(x => x.units.both.includes(b01)));
    // Recusa simétrica: o mesmo vínculo que um braço não ganha, o outro e a linha de base também não.
    const so = prep([agente("sem", ["pnip-root"]), agente("com", ["pnip-root"]), lb], refUnits({ b01: [MODAL] }));
    const ag2 = (runId: string) => so.cards.find(c => so.runs.find(r => r.id === runId)!.cardIds.includes(c.id))!;
    const u2 = uid(so, "B-01");
    for (const [card, cena, sub] of [[ag2("sem"), LISTA, sj(LISTA, raiz.key)], [ag2("com"), LISTA, sj(LISTA, raiz.key)], [ag2("axe"), undefined, raiz.key]] as const)
      assert.throws(() => scoreSemanticPackage(so, reviews(so, [credito(so, card, cena, sub, u2, vinc(card, u2, sub, LISTA))])), /outside its proven domain/);
    // A barreira de build vale para a linha de base também.
    const lbOutro: PrepareRun = { ...lb, data: { ...lb.data, config: { ...lb.data.config, siteManifestSha256: OUTRO_BUILD } as FlowAgentResults["config"] } };
    const p2 = prep([lbOutro]);
    const c2 = p2.cards[0];
    assert.throws(() => scoreSemanticPackage(p2, reviews(p2, [credito(p2, c2, undefined, raiz.key, uid(p2, "B-01"), vinc(c2, uid(p2, "B-01"), raiz.key, LISTA))])), /measured on another build/);
  });

  test("1.8.0: a package's domain is validated — plan, canonical scene, measured participants, hashes, kind, version", () => {
    const base = () => refUnits();
    const com = (f: (us: Entrada[]) => void) => { const us = base(); f(us); return () => prep([], us); };
    assert.throws(com(us => { us[0].domain = [...us[0].domain!, dom("1280x900@outra", ["x"], "ausencia-global", "p", [raiz.key])]; }), /undeclared scene/);
    assert.throws(com(us => { us[2].domain = [dom(MODAL, ["detalhe"], "documento", "p", [h3.key]), dom(LISTA, ["inicial"], "documento", "p", [h3.key])]; }), /does not resolve in scene/);
    assert.throws(com(us => { us[1].domain = us[1].domain!.map(e => ({ ...e, participants: [""] })); }), /not on the document key/);
    assert.throws(com(us => { us[0].domain = us[0].domain!.filter(e => e.scene !== MODAL); }), /canonical scene/);
    assert.throws(com(us => { us[3].domain = [dom(MODAL, ["modal"], "ausencia-global", "p", [botao.key])]; }), /page-level participants/);
    assert.throws(com(us => { us[0].domain = us[0].domain!.map(e => ({ ...e, evidence: [{ source: "x", sha256: "nao-e-hash" }] })); }), /hashed evidence/);
    assert.throws(com(us => { us[0].domain = us[0].domain!.map(e => e.scene === LISTA ? { ...e, states: ["modal"] } : e); }), /outside segment/);
    assert.throws(com(us => { us[0].domain = us[0].domain!.map(e => e.scene === LISTA ? { ...e, build: OUTRO_BUILD } : e); }), /mixes references or builds/);
    assert.throws(com(us => { us[0].domain = us[0].domain!.map(e => e.scene === LISTA ? { ...e, kind: "documento" } : e); }), /one defect predicate/);
    assert.throws(com(us => { us[0].domain = us[0].domain!.map(e => ({ ...e, predicate: " " })); }), /measured predicate/);
    // Um pacote 1.7.0 não conhece domínio: recusado, nunca lido como 1.8.0.
    const atual = prep([agente("r1", ["pnip-root"])]);
    const { packageHash: _h, ...corpo } = { ...atual, version: "flow-semantic-1.7.0" };
    assert.throws(() => validatePackage({ ...corpo, packageHash: digest(corpo) } as SemanticPackage), /not part of package version flow-semantic-1.7.0/);
  });

  test("1.8.0: aplicarDominio lifts a 1.7.0 package (no re-preparation), recomputes card ids, refuses other versions", () => {
    const us = refUnits().map(u => ({ ...u, domain: undefined }));
    const atual = prep([agente("r1", ["pnip-root"])], us);
    const { packageHash: _h, ...corpo } = { ...atual, version: "flow-semantic-1.7.0" };
    const p17: SemanticPackage = { ...corpo, packageHash: digest(corpo) };
    const comDominio = prep([agente("r1", ["pnip-root"])]);
    const porUnidade = Object.fromEntries(comDominio.units.filter(u => u.domain).map(u => [u.id, u.domain!]));
    const p18 = aplicarDominio(p17, porUnidade, "teste");
    assert.equal(p18.version, "flow-semantic-1.8.2");
    validatePackage(p18);
    assert.deepEqual(p18.units.map(u => u.id), p17.units.map(u => u.id), "unit identity unchanged");
    assert.deepEqual(p18.units, comDominio.units, "same units as a fresh 1.8.0 preparation");
    assert.deepEqual(p18.cards.map(c => c.id).sort(), comDominio.cards.map(c => c.id).sort(), "same card ids as a fresh preparation");
    assert.deepEqual((p18.provenance as { derivadoDe: { packageHash: string } }).derivadoDe.packageHash, p17.packageHash);
    // Sem domínio nenhum, os cartões não mudam de id (só versão e hash do pacote).
    assert.deepEqual(aplicarDominio(p17, {}, "x").cards.map(c => c.id), p17.cards.map(c => c.id));
    assert.throws(() => aplicarDominio(p18, {}, "x"), /pre-domain package/);
    const { packageHash: _g, ...c15 } = { ...p17, version: "flow-semantic-1.5.0" };
    assert.throws(() => aplicarDominio({ ...c15, packageHash: digest(c15) } as SemanticPackage, {}, "x"), /pre-domain package/);
    assert.throws(() => aplicarDominio(p17, { "U-inventada": porUnidade[uid(p17, "B-01")] }, "x"), /unknown unit/);
    // Um domínio inválido não passa pela elevação (validatePackage na saída).
    assert.throws(() => aplicarDominio(p17, { [uid(p17, "B-01")]: porUnidade[uid(p17, "B-01")].filter(e => e.scene !== MODAL) }, "x"), /canonical scene/);
  });

  test("1.8.0: legacy invariance — without domain, 1.7.0 and 1.8.0 score identically and 1.7.0 still refuses crossing", () => {
    const us = refUnits().map(u => ({ ...u, domain: undefined }));
    const atual = prep([agente("r1", ["pnip-root", "body"])], us);
    const { packageHash: _h, ...corpo } = { ...atual, version: "flow-semantic-1.7.0" };
    const legado: SemanticPackage = { ...corpo, packageHash: digest(corpo) };
    validatePackage(legado);
    const c = legado.cards.find(x => x.selector === "pnip-root")!;
    const b01 = uid(legado, "B-01");
    const ds = [credito(legado, c, MODAL, sj(MODAL, raiz.key), b01, vinc(c, b01, sj(MODAL, raiz.key), MODAL))];
    const r17 = scoreSemanticPackage(legado, { version: legado.version, decisions: scopeReviews(legado).decisions.map(d => ds.find(x => x.cardId === d.cardId) ?? d) });
    const r18 = scoreSemanticPackage(atual, { version: atual.version, decisions: scopeReviews(atual).decisions.map(d => ds.find(x => x.cardId === d.cardId) ?? d) });
    assert.equal(r17.version, "flow-semantic-1.7.0");
    assert.deepEqual(r17.scores, r18.scores);
    // Atravessar cena continua recusado em 1.7.0 e em 1.8.0 sem domínio.
    const cruzado = [credito(legado, c, LISTA, sj(LISTA, raiz.key), b01, vinc(c, b01, sj(LISTA, raiz.key), LISTA))];
    assert.throws(() => scoreSemanticPackage(legado, { version: legado.version, decisions: cruzado }), /not the unit's scene/);
    assert.throws(() => scoreSemanticPackage(atual, { version: atual.version, decisions: cruzado }), /not the unit's scene/);
  });

  // ── flow-semantic-1.8.1: domínio AMARRADO à parada medida e à referência do pacote (NAT-91, revisão Codex fdc2aed1) ──
  // A lista passa a ter duas paradas no mesmo segmento/rota: `antes` e `inicial` (a da captura, a última).
  const cenas2: SceneResolution[] = cenas.map(c => c.id === LISTA
    ? { ...c, segmento: { numero: 0, estado: "inicial", path: "/pnip/vistorias", estados: ["antes", "inicial"] } } : c);
  const todas2 = ["antes", ...todas];
  const comB01 = (lista: string[], modal: string[]): Entrada[] => refUnits().map(u => u.specId !== "B-01" ? u
    : { ...u, states: todas2, domain: u.domain!.map(e => e.scene === LISTA ? { ...e, states: lista } : e.scene === MODAL ? { ...e, states: modal } : e) });
  const prep2 = (runs: PrepareRun[], us: Entrada[]) => prepareSemanticPackage(ctxB, us, cenas2, runs, { stateOrder: todas2 });
  const naLista = (pkg: SemanticPackage) => credito(pkg, pkg.cards[0], LISTA, sj(LISTA, raiz.key), uid(pkg, "B-01"),
    vinc(pkg.cards[0], uid(pkg, "B-01"), sj(LISTA, raiz.key), LISTA));

  test("1.8.1: versions — 1.8.0 is legacy, the bound domain starts at 1.8.1", () => {
    assert.ok(aceitaDominioAmarrado("flow-semantic-1.8.1") && aceitaDominioAmarrado("flow-semantic-1.9.0") && aceitaDominioAmarrado("flow-semantic-2.0.0"));
    assert.ok(!aceitaDominioAmarrado("flow-semantic-1.8.0") && !aceitaDominioAmarrado("flow-semantic-1.7.0"));
    assert.ok(SEMANTIC_LEGACY_VERSIONS.includes("flow-semantic-1.8.0"));
  });

  test("1.8.1: the claim is bound to the captured stop — before-defective/after-conformant refused, the inverse credited", () => {
    // Defeito só em `antes`, conforme em `inicial` (a parada capturada): o cartão fala da captura, o domínio não a prova.
    const antes = prep2([agente("r1", ["pnip-root"])], comB01(["antes"], ["detalhe", "modal"]));
    assert.equal(naLista(antes).atoms[0].links![0].state, "sempre", "the link declares `sempre`");
    assert.throws(() => scoreSemanticPackage(antes, reviews(antes, [naLista(antes)])), /captured at stop inicial, but the domain of B-01 there only proves antes/);
    // O inverso: conforme em `antes`, defeito em `inicial` (a captura) — creditado.
    const depois = prep2([agente("r1", ["pnip-root"])], comB01(["inicial"], ["detalhe", "modal"]));
    assert.equal(scoreSemanticPackage(depois, reviews(depois, [naLista(depois)])).scores[0].counts.detectedUnits, 1);
    // As duas paradas provadas: creditado uma vez.
    const ambas = prep2([agente("r1", ["pnip-root"])], comB01(["antes", "inicial"], ["detalhe", "modal"]));
    assert.equal(scoreSemanticPackage(ambas, reviews(ambas, [naLista(ambas)])).scores[0].counts.detectedUnits, 1);
  });

  test("1.8.1: same route/segment — the canonical scene's link also needs its captured stop proven", () => {
    // Cena canônica (modal, captura em `modal`): domínio provado só em `detalhe` — o vínculo do <body> é recusado.
    const viaCorpo = (pkg: SemanticPackage) => { const cc = pkg.cards.find(x => x.selector === "body")!;
      return credito(pkg, cc, MODAL, sj(MODAL, "body"), uid(pkg, "B-01"), vinc(cc, uid(pkg, "B-01"), sj(MODAL, "body"), MODAL)); };
    const soDetalhe = prep2([agente("r1", ["body"])], comB01(["inicial"], ["detalhe"]));
    assert.throws(() => scoreSemanticPackage(soDetalhe, reviews(soDetalhe, [viaCorpo(soDetalhe)])), /captured at stop modal, but the domain of B-01 there only proves detalhe/);
    // O inverso: provado em `modal` (a captura), conforme em `detalhe` — creditado.
    const soModal = prep2([agente("r1", ["body"])], comB01(["inicial"], ["modal"]));
    assert.equal(scoreSemanticPackage(soModal, reviews(soModal, [viaCorpo(soModal)])).scores[0].counts.detectedUnits, 1);
    // Uma cena do domínio sem parada de captura registrada (sem segmento) não amarra nada: recusada na preparação.
    const semParada = cenas2.map(c => c.id === LISTA ? { ...c, segmento: undefined } : c);
    assert.throws(() => prepareSemanticPackage(ctxB, comB01(["inicial"], ["modal"]), semParada, [], { stateOrder: todas2 }), /without a recorded capture stop/);
  });

  test("1.8.1: the domain reference is the package's canonical reference — swapping ALL entries is refused", () => {
    const F = "f".repeat(64);
    const todasTrocadas = refUnits().map(u => u.domain ? { ...u, domain: u.domain.map(e => ({ ...e, reference: F })) } : u);
    // Consistente entre si (passa "mixes references"), mas não é a referência do pacote.
    assert.throws(() => prep([agente("r1", ["pnip-root"])], todasTrocadas), /measured against another reference/);
    // O mesmo domínio num pacote cujo context.referenceHash é outro: recusado.
    assert.throws(() => prepareSemanticPackage({ ...ctxB, referenceHash: "d".repeat(64) }, refUnits(), cenas, [], { stateOrder: todas }), /measured against another reference/);
    // Um pacote já preparado, com o domínio trocado por inteiro e ids/hash recalculados: validatePackage recusa.
    const ok = prep([agente("r1", ["pnip-root"])]);
    const { packageHash: _h, ...corpo } = { ...ok, units: ok.units.map(u => u.domain ? { ...u, domain: u.domain.map(e => ({ ...e, reference: F })) } : u) };
    const cards = corpo.cards.map(c => { const { id: _i, ...b } = c; return { id: `C-${digest({ context: corpo.context, body: b, units: corpo.units })}`, ...b }; });
    const ids = new Map(corpo.cards.map((c, i) => [c.id, cards[i].id]));
    const forjado = { ...corpo, cards, runs: corpo.runs.map(r => ({ ...r, cardIds: r.cardIds.map(i => ids.get(i)!) })) };
    assert.throws(() => validatePackage({ ...forjado, packageHash: digest(forjado) } as SemanticPackage), /measured against another reference/);
    // A elevação (aplicarDominio) também: o domínio trocado por inteiro não sobe.
    const atual = prep([agente("r1", ["pnip-root"])], refUnits().map(u => ({ ...u, domain: undefined })));
    const { packageHash: _g, ...c17 } = { ...atual, version: "flow-semantic-1.7.0" };
    const p17: SemanticPackage = { ...c17, packageHash: digest(c17) };
    const porUnidade = Object.fromEntries(ok.units.filter(u => u.domain).map(u => [u.id, u.domain!.map(e => ({ ...e, reference: F }))]));
    assert.throws(() => aplicarDominio(p17, porUnidade, "x"), /measured against another reference/);
    assert.doesNotThrow(() => aplicarDominio(p17, Object.fromEntries(ok.units.filter(u => u.domain).map(u => [u.id, u.domain!])), "x"));
  });

  test("1.8.1: `documento` is title or heading outline only, named by its hashed evidence — never a generic document class", () => {
    const com = (f: (us: Entrada[]) => void) => { const us = refUnits(); f(us); return () => prep([], us); };
    // B-25 medido num contêiner (pnip-root) da lista, não no <title>: recusado.
    assert.throws(com(us => { us[1].domain = us[1].domain!.map(e => e.scene === LISTA ? { ...e, participants: [raiz.key] } : e); }), /never a generic document defect/);
    // A evidência com hash não nomeia o predicado específico: recusado.
    assert.throws(com(us => { us[1].domain = us[1].domain!.map(e => ({ ...e, evidence: [{ source: "medida.json", sha256: "a".repeat(64) }] })); }), /named by its hashed evidence/);
    // Título e h3 medidos, evidência nomeando o predicado: preparado.
    assert.doesNotThrow(com(() => undefined));
  });

  test("1.8.1: legacy — a 1.8.0 package keeps its own path byte for byte (the published derived 1.2.0 was computed with it)", () => {
    // O mesmo pacote com a parada não provada: em 1.8.0 pontua como pontuava (resultado arquivado); em 1.8.1, recusado.
    const antes = prep2([agente("r1", ["pnip-root"])], comB01(["antes"], ["detalhe", "modal"]));
    const { packageHash: _h, ...corpo } = { ...antes, version: "flow-semantic-1.8.0" };
    const p180: SemanticPackage = { ...corpo, packageHash: digest(corpo) };
    validatePackage(p180);
    const d = naLista(p180);
    assert.equal(scoreSemanticPackage(p180, { version: p180.version, decisions: scopeReviews(p180).decisions.map(x => x.cardId === d.cardId ? d : x) }).scores[0].counts.detectedUnits, 1);
    assert.throws(() => scoreSemanticPackage(antes, reviews(antes, [naLista(antes)])), /only proves antes/);
  });

  // ── flow-semantic-1.8.2: parada provada em TODO crédito, não só no vínculo (NAT-91, achado Codex 74577dd9) ──
  // Cena canônica MODAL capturada em `modal` (estados do segmento: detalhe, modal). B-01 é ancorada diretamente
  // em <pnip-root> ali: o caminho comum, sem `links`. `cobre`: o domínio canônico prova `modal` (a captura);
  // `descobre`: prova só `detalhe`.
  const cobre = () => comB01(["inicial"], ["modal"]), descobre = () => comB01(["inicial"], ["detalhe"]);
  const lbModal = (id: string): PrepareRun => ({ id, kind: "linha-de-base", tool: id, data: { model: id, timestamp: "fixed", appUrl: "http://f/pnip/vistorias/3038",
    findings: [{ selector: "pnip-root", rule: "axe:bypass", observed: "sem mecanismo de salto", expected: null, scene: MODAL, viewport: wide, steps: [] }] as unknown as FlowAgentResults["findings"],
    config: { instrumentVersion: "fluxo-1.3.0", protocolVersion: `baseline:${id}`, siteManifestSha256: B } as FlowAgentResults["config"] } });
  const runsDe = () => [agente("sem", ["pnip-root"]), agente("com", ["pnip-root"]), lbModal("axe")];
  const cartaoDe = (pkg: SemanticPackage, runId: string) => pkg.cards.find(c => pkg.runs.find(r => r.id === runId)!.cardIds.includes(c.id))!;
  /** Decisão do cartão do run na cena canônica: sem `links` (ancoragem direta) ou com o vínculo equivalente. */
  const naCanonica = (pkg: SemanticPackage, runId: string, comLink: boolean, extra: Partial<SemanticDecision> = {}): SemanticDecision => {
    const card = cartaoDe(pkg, runId), b01 = uid(pkg, "B-01");
    const sub = card.segmentos ? sj(MODAL, raiz.key) : raiz.key;
    const link = comLink ? [vinc(card, b01, sub, MODAL)] : undefined;
    return { ...decision(card.id, [{ id: "a1", text: "parte", subjects: [sub], verdict: "reference", unitIds: [b01], citation: "uncertain", ...(link ? { links: link } : {}) }]),
      ...(card.segmentos ? { cena: MODAL } : {}), ...extra };
  };

  test("1.8.2: versions — 1.8.0 and 1.8.1 are legacy, the stop on every credit starts at 1.8.2", () => {
    assert.equal(SEMANTIC_SCORING_VERSION, "flow-semantic-1.8.2");
    assert.ok(exigeParadaEmTodoCredito("flow-semantic-1.8.2") && exigeParadaEmTodoCredito("flow-semantic-1.9.0") && exigeParadaEmTodoCredito("flow-semantic-2.0.0"));
    assert.ok(!exigeParadaEmTodoCredito("flow-semantic-1.8.1") && !exigeParadaEmTodoCredito("flow-semantic-1.8.0") && !exigeParadaEmTodoCredito("flow-semantic-1.7.0"));
    assert.ok(SEMANTIC_LEGACY_VERSIONS.includes("flow-semantic-1.8.1") && SEMANTIC_LEGACY_VERSIONS.includes("flow-semantic-1.8.0"));
  });

  test("1.8.2: identical pairs with and without links — covered stop credits both, uncovered stop refuses both (arms and baseline)", () => {
    const ok = prep2(runsDe(), cobre()), nao = prep2(runsDe(), descobre());
    // O pacote é preparado nos dois casos: o que se recusa é o crédito, não a preparação.
    assert.deepEqual(nao.units.find(u => u.specId === "B-01")!.domain!.find(e => e.scene === MODAL)!.states, ["detalhe"]);
    for (const runId of ["sem", "com", "axe"]) {
      const comL = scoreSemanticPackage(ok, reviews(ok, [naCanonica(ok, runId, true)])).scores.find(s => s.runId === runId)!;
      const semL = scoreSemanticPackage(ok, reviews(ok, [naCanonica(ok, runId, false)])).scores.find(s => s.runId === runId)!;
      assert.equal(semL.counts.detectedUnits, 1, `${runId}: covered, no links`);
      assert.deepEqual(semL.matched, comL.matched, `${runId}: the same credit with and without the link`);
      assert.throws(() => scoreSemanticPackage(nao, reviews(nao, [naCanonica(nao, runId, true)])), /captured at stop modal, but the domain of B-01 there only proves detalhe/, `${runId}: uncovered, link`);
      assert.throws(() => scoreSemanticPackage(nao, reviews(nao, [naCanonica(nao, runId, false)])), /Anchored subject in scene .*captured at stop modal, but the domain of B-01 there only proves detalhe/, `${runId}: uncovered, no links`);
    }
    // Sem decisão (cartão pendente) nada muda: o pacote pontua, provisório, com 0.
    const pend = scoreSemanticPackage(nao, scopeReviews(nao));
    assert.ok(pend.scores.every(s => s.counts.detectedUnits === 0 && s.status === "provisional"));
  });

  test("1.8.2: the automatic path is no bypass — the stop is checked before the predicate", () => {
    const comPred = (us: Entrada[]) => us.map(u => u.specId === "B-01" ? { ...u, acceptance: sustenta("sem-salto-para-conteudo") } : u);
    const auto = { automatic: { predicate: "sem-salto-para-conteudo" } };
    const ok = prep2(runsDe(), comPred(cobre())), nao = prep2(runsDe(), comPred(descobre()));
    assert.equal(scoreSemanticPackage(ok, reviews(ok, [naCanonica(ok, "sem", false, auto)])).scores.find(s => s.runId === "sem")!.counts.detectedUnits, 1);
    assert.throws(() => scoreSemanticPackage(nao, reviews(nao, [naCanonica(nao, "sem", false, auto)])), /Anchored subject .* only proves detalhe/);
    assert.throws(() => scoreSemanticPackage(nao, reviews(nao, [naCanonica(nao, "axe", false, auto)])), /Anchored subject .* only proves detalhe/);
  });

  test("1.8.2: a unit without domain keeps the plain anchored path", () => {
    const pkg = prep2([agente("r1", ["header button"])], descobre());
    const bt = pkg.cards[0];
    assert.equal(scoreSemanticPackage(pkg, reviews(pkg, [{ ...decision(bt.id, [{ id: "a1", text: "t", subjects: [sj(MODAL, botao.key)], verdict: "reference",
      unitIds: [uid(pkg, "C-X")], citation: "supported" }]), cena: MODAL }])).scores[0].counts.detectedUnits, 1);
  });

  test("1.8.2: legacy — a 1.8.1 package keeps its own path byte for byte (the canonical anchored claim still scores there)", () => {
    const nao = prep2(runsDe(), descobre());
    const { packageHash: _h, ...corpo } = { ...nao, version: "flow-semantic-1.8.1" };
    const p181: SemanticPackage = { ...corpo, packageHash: digest(corpo) };
    validatePackage(p181);
    const com181 = (pkg: SemanticPackage, d: SemanticDecision) =>
      scoreSemanticPackage(pkg, { version: pkg.version, decisions: scopeReviews(pkg).decisions.map(x => x.cardId === d.cardId ? d : x) });
    const r = com181(p181, naCanonica(p181, "sem", false));
    assert.equal(r.version, "flow-semantic-1.8.1");
    assert.equal(r.scores.find(s => s.runId === "sem")!.counts.detectedUnits, 1, "1.8.1 credited it (the finding)");
    // E o vínculo continua recusado em 1.8.1, como era.
    assert.throws(() => com181(p181, naCanonica(p181, "sem", true)), /only proves detalhe/);
    // Onde a parada é provada, 1.8.1 e 1.8.2 dão a mesma pontuação: só a recusa muda.
    const ok = prep2(runsDe(), cobre());
    const { packageHash: _g, ...c2 } = { ...ok, version: "flow-semantic-1.8.1" };
    const ok181: SemanticPackage = { ...c2, packageHash: digest(c2) };
    assert.deepEqual(com181(ok181, naCanonica(ok181, "sem", false)).scores, scoreSemanticPackage(ok, reviews(ok, [naCanonica(ok, "sem", false)])).scores);
  });

  test("1.8.2: Codex repro (NAT-91 74577dd9) — canonical capture `after`, domain proves only `before`, exact subject, no links: refused", () => {
    const SRC = "1280x900@source", END = "1280x900@canonical";
    const pr = el("body>pnip-root", "<pnip-root>"), dc = el("", "<html>");
    const res = (url: string): Resolution => ({ url, byKey: new Map([[dc.key, dc], [pr.key, pr]]), bySelector: new Map([
      ["html", { selector: "html", ok: true, error: null, keys: [""] }], ["pnip-root", { selector: "pnip-root", ok: true, error: null, keys: [pr.key] }]]) } as Resolution);
    const sc: SceneResolution[] = [
      { id: SRC, viewport: wide, specIds: [], resolution: res("http://fixture/source"), segmento: { numero: 0, estado: "after", path: "/source", estados: ["before", "after"] } },
      { id: END, viewport: wide, specIds: ["X"], resolution: res("http://fixture/canonical"), segmento: { numero: 1, estado: "after", path: "/canonical", estados: ["before", "after"] } }];
    const exercise = (canonicalStates: string[]) => {
      const domain = [{ scene: SRC, states: ["after"] }, { scene: END, states: canonicalStates }].map(x => ({ ...x, kind: "ausencia-global" as const, predicate: "no-skip-link",
        participants: [pr.key], reference: REF, build: B, evidence: [{ source: "synthetic-evidence", sha256: "a".repeat(64) }] }));
      const unit: Entrada = { specId: "X", element: pr as FlowUnit["element"], participants: [pr.key], rules: ["wcag:2.4.1"], categories: ["accessibility"], description: "no skip link",
        state: "sempre", states: ["before", "after"], conditional: false, scene: END, domain };
      const pkg = prepareSemanticPackage(ctxB, [unit], sc, [{ id: "r1", data: { ...run([{ selector: "pnip-root", rule: "wcag:2.4.1", observed: "source after", expected: "skip link",
        state: { viewport: wide, steps: ["after"] }, evidence: [] }] as unknown as FlowAgentResults["findings"]), config: cfg(B) } }], { stateOrder: ["before", "after", "end"] });
      const card = pkg.cards[0], subject = card.subjects.find(s => s.scene === END)!;
      const d: SemanticDecision = { ...decision(card.id, [{ id: "a1", text: "claim", subjects: [subject.id], verdict: "reference", unitIds: [pkg.units[0].id], citation: "supported" }]), cena: END };
      return scoreSemanticPackage(pkg, reviews(pkg, [d])).scores[0].counts.detectedUnits;
    };
    assert.throws(() => exercise(["before"]), /captured at stop after, but the domain of X there only proves before/);
    assert.equal(exercise(["after"]), 1);
  });
}

console.log(`${tests} semantic scoring tests passed (including exhaustive 512-graph matching verification).`);
