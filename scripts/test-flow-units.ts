import assert from "node:assert/strict";
import type { AdjudicationRecord, FlowAgentResults, FlowGroundTruth } from "../types";
import type { ElementRef, Resolution, ResolvedSelector } from "./anchors";
import { buildFlowUnits, scoreFlow, summarizeFlowFamilies } from "./units-flow";
import { findingId, recordDefect, type AdjudicationIndex } from "./adjudication";

const refs: Record<string, ElementRef> = {
  form: { key: "body>form", id: "E-form", label: "<form>" },
  message: { key: "body>form>p", id: "E-message", label: "<p> error" },
  link1: { key: "body>a:nth-of-type(1)", id: "E-link1", label: "<a> one" },
  link2: { key: "body>a:nth-of-type(2)", id: "E-link2", label: "<a> two" },
  link3: { key: "body>a:nth-of-type(3)", id: "E-link3", label: "<a> three" },
  link4: { key: "body>a:nth-of-type(4)", id: "E-link4", label: "<a> four" },
};

function selector(selector: string, keys: string[]): ResolvedSelector {
  return { selector, ok: true, error: null, keys };
}

const resolution: Resolution = {
  url: "http://example.test/fluxo.html",
  byKey: new Map(Object.values(refs).map(ref => [ref.key, ref])),
  bySelector: new Map([
    [".form", selector(".form", [refs.form.key])],
    [".message", selector(".message", [refs.message.key])],
    [".links", selector(".links", [refs.link1.key, refs.link2.key, refs.link3.key, refs.link4.key])],
  ]),
};

const gt: FlowGroundTruth = {
  _meta: { page: "fixture", url: "/fluxo.html" },
  violations: [
    {
      id: "V-rel", anchor: ".message", scope: "unico", expectedCount: 1,
      rules: ["wcag:4.1.3"], categories: ["acessibilidade"], description: "dynamic status",
    },
    {
      id: "V-many", anchor: ".links", scope: "todos", expectedCount: 4,
      rules: ["wcag:2.4.7"], categories: ["acessibilidade"], description: "focus",
    },
  ],
};

const built = buildFlowUnits(gt, resolution);
assert.deepEqual(built.defects, []);

const run: FlowAgentResults = {
  timestamp: "2026-09-02T00:00:00Z",
  model: "fixture",
  appUrl: resolution.url,
  findings: [
    {
      selector: ".form",
      relatedSelectors: [".message"],
      rule: "wcag:4.1.3",
      description: "The form inserts .message without a live region.",
    },
    { selector: ".links", rule: "wcag:2.4.7", description: "All four links suppress focus." },
  ],
};

const score = scoreFlow(run, built.units, resolution);
assert.equal(score.TP, 5, "one relational unit plus four element units must match");
assert.equal(score.FP, 0);
assert.equal(score.outcomes.find(outcome => outcome.unit.specId === "V-rel")?.anchorMode, "related");
assert.deepEqual(summarizeFlowFamilies(score.outcomes), { detected: 2, complete: 2, total: 2 });

const partial = score.outcomes.map(outcome => outcome.unit.specId === "V-many" && outcome.unit.element.id !== "E-link1"
  ? { ...outcome, matched: false }
  : outcome);
assert.deepEqual(summarizeFlowFamilies(partial), { detected: 2, complete: 1, total: 2 });

const wrongCitation = {
  selector: ".message",
  rule: "govbr-3.7.0-page-global-f6e03bce515b",
  description: "Correctly describes the dynamic status, but borrows an unrelated broad rule.",
};
const adjudicationId = findingId(refs.message.id, {
  rule: wrongCitation.rule,
  description: wrongCitation.description,
});
const adjudication: AdjudicationIndex = {
  present: true,
  pending: [],
  records: [{
    id: adjudicationId,
    caseId: refs.message.id,
    finding: `${wrongCitation.rule} — ${wrongCitation.description}`,
    verdict: "deteccao-correta",
    unit: { caseId: refs.message.id, rule: "wcag:4.1.3" },
    rationale: "Fixture: content is right and grounding is intentionally wrong.",
  }],
  byId: new Map(),
};
adjudication.byId.set(adjudicationId, adjudication.records[0]);
const adjudicated = scoreFlow({
  timestamp: run.timestamp,
  model: run.model,
  appUrl: run.appUrl,
  findings: [wrongCitation],
}, built.units, resolution, adjudication);
const adjudicatedOutcome = adjudicated.outcomes.find(outcome => outcome.unit.specId === "V-rel");
assert.equal(adjudicatedOutcome?.matched, true);
assert.equal(adjudicatedOutcome?.adjudicationVerdict, "deteccao-correta");
assert.equal(adjudicatedOutcome?.ruleVerified, false, "correct detection must not fabricate grounding");

// ── D-30: uma alegação composta credita a unidade E registra a lacuna ────────
//
// O caso que forçou o veredito: um achado que descreve a unidade catalogada e, na mesma frase,
// uma violação que o gabarito nunca teve. Antes do D-30 era preciso escolher — `vocabulario`
// escondia a lacuna, `lacuna-gabarito` descartava o crédito — e os dois erros enviesavam o
// número em direções opostas.
const compound = {
  selector: ".message",
  rule: "emag:6.5",
  description: "Describes the dynamic status AND a missing format instruction the gabarito lacks.",
};
const compoundId = findingId(refs.message.id, { rule: compound.rule, description: compound.description });
const compoundRecord: AdjudicationRecord = {
  id: compoundId,
  caseId: refs.message.id,
  finding: `${compound.rule} — ${compound.description}`,
  verdict: "composto",
  rationale: "Fixture: two defects in one claim.",
  components: [
    {
      verdict: "vocabulario",
      unit: { caseId: refs.message.id, rule: "wcag:4.1.3" },
      rationale: "A primeira metade é a unidade V-rel sob outro nome.",
    },
    {
      verdict: "lacuna-gabarito",
      rationale: "A segunda metade é violação real que o gabarito não cataloga.",
      gabaritoStatus: "pendente",
    },
  ],
};
const compoundIndex: AdjudicationIndex = {
  present: true, pending: [], records: [compoundRecord],
  byId: new Map([[compoundId, compoundRecord]]),
};
const compoundScore = scoreFlow({
  timestamp: run.timestamp, model: run.model, appUrl: run.appUrl, findings: [compound],
}, built.units, resolution, compoundIndex);

assert.equal(compoundScore.outcomes.find(o => o.unit.specId === "V-rel")?.matched, true,
  "a metade `vocabulario` credita a unidade nomeada");
assert.equal(compoundScore.gaps.length, 1, "a metade `lacuna-gabarito` entra na dívida");
assert.equal(compoundScore.FP, 0, "nenhuma metade resolveu em cobrança");
assert.equal(compoundScore.floor.FP, 1, "o piso ignora adjudicação e cobra a alegação (D-21)");

// Uma metade falsa cobra a alegação UMA vez, sem anular o crédito da outra.
const mixed: AdjudicationRecord = {
  ...compoundRecord,
  components: [compoundRecord.components![0], { verdict: "falso-positivo", rationale: "Fixture: metade falsa." }],
};
const mixedScore = scoreFlow({
  timestamp: run.timestamp, model: run.model, appUrl: run.appUrl, findings: [compound],
}, built.units, resolution,
  { present: true, pending: [], records: [mixed], byId: new Map([[compoundId, mixed]]) });
assert.equal(mixedScore.outcomes.find(o => o.unit.specId === "V-rel")?.matched, true);
assert.equal(mixedScore.FP, 1, "uma alegação com parte falsa é cobrada uma vez, não por componente");

// Registros compostos malformados são defeitos, não vereditos silenciosos.
assert.match(recordDefect({ ...compoundRecord, components: [compoundRecord.components![0]] }) ?? "",
  /menos de 2/);
assert.match(recordDefect({ ...compoundRecord, verdict: "duplicado" }) ?? "", /só é aceito com verdict/);
assert.match(recordDefect({
  ...compoundRecord,
  components: [compoundRecord.components![0], { verdict: "vocabulario", rationale: "sem unit" }],
}) ?? "", /sem `unit` alvo/);

console.log("test:flow - relational anchors, family summaries and compound verdicts ok");
