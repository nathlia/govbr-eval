import assert from "node:assert/strict";
import type { AdjudicationRecord, FlowAgentResults, FlowGroundTruth } from "../types";
import type { ElementRef, Resolution, ResolvedSelector } from "./anchors";
import { buildFlowUnits, scoreFlow, summarizeFlowFamilies } from "./units-flow";
import { findingId, recordDefect, type AdjudicationIndex } from "./adjudication";

const refs: Record<string, ElementRef> = {
  form: { key: "body>form", id: "E-form", label: "<form>", hidden: null },
  message: { key: "body>form>p", id: "E-message", label: "<p> error", hidden: null },
  link1: { key: "body>a:nth-of-type(1)", id: "E-link1", label: "<a> one", hidden: null },
  link2: { key: "body>a:nth-of-type(2)", id: "E-link2", label: "<a> two", hidden: null },
  link3: { key: "body>a:nth-of-type(3)", id: "E-link3", label: "<a> three", hidden: null },
  link4: { key: "body>a:nth-of-type(4)", id: "E-link4", label: "<a> four", hidden: null },
  list: { key: "body>div", id: "E-list", label: "<div> .br-list", hidden: null },
  item1: { key: "body>div>div:nth-of-type(1)", id: "E-item1", label: "<div> .br-item one", hidden: null },
  item2: { key: "body>div>div:nth-of-type(2)", id: "E-item2", label: "<div> .br-item two", hidden: null },
  item3: { key: "body>div>div:nth-of-type(3)", id: "E-item3", label: "<div> .br-item three", hidden: null },
  item4: { key: "body>div>div:nth-of-type(4)", id: "E-item4", label: "<div> .br-item four", hidden: null },
};

const itemKeys = [refs.item1.key, refs.item2.key, refs.item3.key, refs.item4.key];

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
    [".lista, .lista > .item", selector(".lista, .lista > .item", [refs.list.key, ...itemKeys])],
    [".lista", selector(".lista", [refs.list.key])],
    [".item", selector(".item", itemKeys)],
    ...itemKeys.map((key, i): [string, ResolvedSelector] =>
      [`.item:nth-of-type(${i + 1})`, selector(`.item:nth-of-type(${i + 1})`, [key])]),
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
  retired: [],
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
  present: true, pending: [], retired: [], records: [compoundRecord],
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
  { present: true, pending: [], retired: [], records: [mixed], byId: new Map([[compoundId, mixed]]) });
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

// ── D-33: `composicao` — N participantes, UMA unidade ───────────────────────
//
// O caso que forçou o scope: a semântica de lista ausente. A spec ancorava só no contêiner, mas o
// defeito é do conjunto, e a leitura CORRETA (dizer que os itens não têm papel) não casava em
// nenhum dos três passos — 0 TP e 4 FP. Passar a spec para `todos` consertaria o casamento e
// criaria outro erro: quatro créditos para quem enumera, um para quem diz a mesma coisa uma vez.
const gtComp: FlowGroundTruth = {
  _meta: { page: "fixture", url: "/fluxo.html" },
  violations: [{
    id: "V-comp", anchor: ".lista, .lista > .item", scope: "composicao",
    expectedCount: 1, participantCount: 5,
    rules: ["wcag:1.3.1"], categories: ["estrutura"], description: "list semantics",
  }],
};
const comp = buildFlowUnits(gtComp, resolution);
assert.deepEqual(comp.defects, []);
assert.equal(comp.units.length, 1, "cinco participantes valem UMA unidade");
assert.equal(comp.units[0].participants.length, 5);
assert.equal(comp.units[0].element.id, "E-list", "o primeiro participante resolvido dá id à unidade");

const scoreAt = (findings: { selector: string; rule: string; description: string }[]) =>
  scoreFlow({ timestamp: run.timestamp, model: run.model, appUrl: run.appUrl, findings },
    comp.units, resolution);

// Ancorar no contêiner casa, como antes do D-33.
const atContainer = scoreAt([{ selector: ".lista", rule: "wcag:1.3.1", description: "list has no role" }]);
assert.equal(atContainer.TP, 1);
assert.equal(atContainer.FP, 0);

// Ancorar num FILHO casa — este é exatamente o caso que devolvia 0 TP.
const atChild = scoreAt([{ selector: ".item:nth-of-type(1)", rule: "wcag:1.3.1", description: "item has no listitem role" }]);
assert.equal(atChild.TP, 1, "qualquer participante ancora a unidade");
assert.equal(atChild.FP, 0, "a leitura correta deixa de ser cobrada como falso positivo");

// Enumerar os quatro filhos: crédito UM, cobrança ZERO, três absorvidos e contados.
const atAll = scoreAt(itemKeys.map((_, i) => ({
  selector: `.item:nth-of-type(${i + 1})`, rule: "wcag:1.3.1", description: `item ${i + 1} has no role`,
})));
assert.equal(atAll.TP, 1, "prolixidade não multiplica crédito (D-30)");
assert.equal(atAll.FP, 0, "e também não é punida");
assert.equal(atAll.absorbed.length, 3, "os irmãos ficam contados, nunca silenciosos");
assert.deepEqual(summarizeFlowFamilies(atAll.outcomes), { detected: 1, complete: 1, total: 1 });

// Um seletor que alcança os quatro filhos de uma vez: mesma leitura, mesmo resultado.
const atBroad = scoreAt([{ selector: ".item", rule: "wcag:1.3.1", description: "no item carries listitem" }]);
assert.equal(atBroad.TP, 1);
assert.equal(atBroad.FP, 0);
assert.equal(atBroad.absorbed.length, 3);

// Absorção exige a MESMA norma: outra regra sobre um participante segue sendo alegação própria.
const otherRule = scoreAt([
  { selector: ".lista", rule: "wcag:1.3.1", description: "list has no role" },
  { selector: ".item:nth-of-type(1)", rule: "ds:token-color", description: "border colour is off-token" },
]);
assert.equal(otherRule.TP, 1);
assert.equal(otherRule.FP, 1, "norma diferente no mesmo elemento não é a mesma alegação");

// Guardas do gabarito (D-06): a página é quem responde pela contagem.
const wrongCount = buildFlowUnits(
  { ...gtComp, violations: [{ ...gtComp.violations[0], participantCount: 4 }] }, resolution);
assert.equal(wrongCount.units.length, 0);
assert.match(wrongCount.defects[0].problem, /declara 4 participante\(s\); a página tem 5/);

const wrongExpected = buildFlowUnits(
  { ...gtComp, violations: [{ ...gtComp.violations[0], expectedCount: 5 }] }, resolution);
assert.equal(wrongExpected.units.length, 0);
assert.match(wrongExpected.defects[0].problem, /vale uma unidade/);

// `participantCount` fora de `composicao` é defeito, não campo ignorado — o log já conta doze
// ocorrências de uma dimensão que uma parte do código conhece e a outra não.
const misplaced = buildFlowUnits(
  { ...gtComp, violations: [{ ...gtComp.violations[0], scope: "todos", participantCount: 5 }] }, resolution);
assert.equal(misplaced.units.length, 0);
assert.match(misplaced.defects[0].problem, /só existe em scope "composicao"/);

// ── D-37: a ponte do verificador que o D-27 decidiu ─────────────────────────
//
// O caso que a forçou: na bateria de 14/09 o braço com oráculo citou a norma que o próprio
// verificador declara (`…21b1a2733f7b` para cor fora da paleta, `…137c50bea6ca` para espaçamento,
// `…e30aab6e9a68` para a tag do componente), e as specs ancoradas em `ds:token-*`/`ds:structure-*`
// não casavam: 15 alegações sobre elementos do gabarito cobradas como falso positivo.
const PALETA = "govbr-3.7.0-foundation-global-21b1a2733f7b";
const TOKENS_EM_GERAL = "govbr-3.7.0-development-global-137c50bea6ca";
const ANATOMIA = "govbr-3.7.0-component-global-e30aab6e9a68";

const gtBridge: FlowGroundTruth = {
  _meta: { page: "fixture", url: "/fluxo.html" },
  violations: [
    { id: "V-spacing", anchor: ".item", scope: "todos", expectedCount: 4, rules: ["ds:token-spacing"], categories: ["tokens"], description: "padding" },
    { id: "V-color", anchor: ".item", scope: "todos", expectedCount: 4, rules: ["ds:token-color"], categories: ["tokens"], description: "border" },
    { id: "V-tag", anchor: ".form", scope: "unico", expectedCount: 1, rules: ["ds:structure-input-tag"], categories: ["estrutura"], description: "tag" },
  ],
};
const bridge = buildFlowUnits(gtBridge, resolution);
assert.deepEqual(bridge.defects, []);
const scoreBridge = (findings: { selector: string; rule: string; description: string }[]) =>
  scoreFlow({ timestamp: run.timestamp, model: run.model, appUrl: run.appUrl, findings }, bridge.units, resolution);
const hits = (s: ReturnType<typeof scoreBridge>, specId: string) =>
  s.outcomes.filter(o => o.unit.specId === specId && o.matched).length;

// A norma declarada pelo verificador casa a spec ancorada no id do verificador.
const palette = scoreBridge([{ selector: ".item", rule: PALETA, description: "border colour off the palette" }]);
assert.equal(hits(palette, "V-color"), 4, "a regra da paleta é a norma de ds:token-color");
assert.equal(hits(palette, "V-spacing"), 0);
assert.equal(palette.FP, 0);
assert.ok(palette.outcomes.filter(o => o.matched).every(o => o.ruleVerified), "casamento pela ponte é verificado por regra");

const spacing = scoreBridge([{ selector: ".item", rule: TOKENS_EM_GERAL, description: "padding 13px off the scale" }]);
assert.equal(hits(spacing, "V-spacing"), 4, "espaçamento só declara a regra geral, então ela é a sua ponte");

const tag = scoreBridge([{ selector: ".form", rule: ANATOMIA, description: "br-input on the <input> itself" }]);
assert.equal(hits(tag, "V-tag"), 1, "o padrão ds:structure-*-tag alcança o componente nomeado");

// Específica antes de geral: a regra geral NÃO é ponte de cor, que tem regra própria.
const genericForColor = scoreBridge([{ selector: ".item:nth-of-type(1)", rule: TOKENS_EM_GERAL, description: "border colour off-token" }]);
assert.equal(hits(genericForColor, "V-color"), 0, "a regra geral não credita cor");

// Direção única: a alegação nunca é alargada pela ponte.
const radius = scoreBridge([{ selector: ".item:nth-of-type(1)", rule: "ds:token-radius", description: "radius off-token" }]);
assert.equal(hits(radius, "V-spacing"), 0, "raio não alcança espaçamento pela regra geral compartilhada");
assert.equal(radius.FP, 1);

// O id do próprio verificador segue casando como antes.
const scannerId = scoreBridge([{ selector: ".form", rule: "ds-structure-input-tag", description: "br-input on input" }]);
assert.equal(hits(scannerId, "V-tag"), 1);

console.log("test:flow - relational anchors, family summaries, compound verdicts, composition units and checker bridge ok");
