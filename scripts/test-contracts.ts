/**
 * M0 — contratos do benchmark isolado. Sem navegador, sem modelo.
 *
 * Todo exemplo válido passa; todo inválido falha PELA regra que o nome dele diz (caminho + palavra-chave,
 * não só "falhou"); os relatórios de findings.v1 continuam aceitos pelo contrato atual do coletor
 * (validateFlowReport/normalizeFinding, achado-2); e a chave de comparação recusa agregar execuções que
 * diferem fora do desenho (o braço é a única diferença permitida).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CONTRACTS_DIR, CONTRACT_NAMES, checkAggregation, checkPlannedAbsence, comparisonKeyOf, crossCheckManifest, crossCheckRun, validateContract,
  type AnalysisBinding, type ArtifactManifest, type ArtifactManifestV2, type Campaign, type ContractError, type Findings, type FindingsV2, type Isolation, type Run,
} from "../contracts/index";
import { normalizeFinding, validateFlowReport, FINDING_CONTRACT } from "./flow-contract";
import { ROOT } from "./adjudication";

let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

const EXAMPLES = join(CONTRACTS_DIR, "examples");
const read = <T>(dir: string, name: string): T => JSON.parse(readFileSync(join(EXAMPLES, dir, name), "utf8")) as T;
const files = (dir: string): string[] => readdirSync(join(EXAMPLES, dir)).filter(f => f.endsWith(".json")).sort();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Regra que cada exemplo inválido quebra: o erro esperado tem de aparecer exatamente. */
const EXPECTED: Record<string, { path: string; keyword: string; missingProperty?: string }> = {
  "run--model-id-invented.json": { path: "/model/resolvedSource", keyword: "enum" },
  "run--metric-unavailable-but-zero.json": { path: "/usage/inputTokens/value", keyword: "type" },
  "run--passed-without-submission.json": { path: "/submission/status", keyword: "const" },
  "run--not-run-with-score.json": { path: "/status/score", keyword: "const" },
  "run--sem-with-oracle.json": { path: "/intervention/oracle", keyword: "type" },
  "run--com-absent-verified.json": { path: "/status/oracleUsage", keyword: "not" },
  "findings--rule-missing.json": { path: "/report/findings/0", keyword: "required", missingProperty: "rule" },
  "findings--viewport-not-positive.json": { path: "/report/findings/0/state/viewport/width", keyword: "minimum" },
  "findings--fixture-flag-missing.json": { path: "", keyword: "required", missingProperty: "fixture" },
  "isolation--passed-without-checks.json": { path: "/checks", keyword: "minItems" },
  "isolation--passed-with-required-check-failed.json": { path: "/checks", keyword: "not" },
  "isolation--passed-without-positive-control.json": { path: "/positiveControls", keyword: "minItems" },
  "artifact-manifest--path-escapes-package.json": { path: "/files/3/path", keyword: "pattern" },
  "artifact-manifest--absolute-path.json": { path: "/files/3/path", keyword: "pattern" },
  "artifact-manifest--reference-file-in-package.json": { path: "/files/3/path", keyword: "not" },
  "artifact-manifest--duplicate-path.json": { path: "/files/2/path", keyword: "x-unique" },
  "snapshot-manifest--hash-without-location.json": { path: "/items/1", keyword: "required", missingProperty: "location" },
  "snapshot-manifest--exposed-to-agent.json": { path: "/items/1/exposedToAgent", keyword: "const" },
  "snapshot-manifest--missing-site.json": { path: "/items", keyword: "contains" },
  "baseline--identity-link-mismatch.json": { path: "/links/reference/sha256", keyword: "x-identity-link" },
  "baseline--failed-without-error.json": { path: "/error", keyword: "type" },
  "baseline--dev-global-scope.json": { path: "/scope", keyword: "const" },
  "analysis-binding--missing-baseline-no-justification.json": { path: "/baseline", keyword: "required", missingProperty: "justification" },
  "analysis-binding--absence-declared-after-collection.json": { path: "/baseline/declaredAt", keyword: "x-planned-absence-after-collection" },
  "analysis-binding--composite-planned-absence.json": { path: "/baseline/mode", keyword: "not" },
  "analysis-binding--blocked-metric-zero.json": { path: "/metrics/recall", keyword: "type" },
  "analysis-binding--blocked-baseline-but-ready.json": { path: "/status", keyword: "const" },
  "campaign--formal-not-frozen.json": { path: "/frozenAt", keyword: "type" },
  // NAT-81 — registro de inspeção (findings.v2 / inspection.v1) e manifesto v2
  "findings--v2-duplicate-id.json": { path: "/report/inspection/candidates/1/id", keyword: "x-unique" },
  "findings--v2-unknown-state.json": { path: "/report/inspection/items/0/state", keyword: "x-unknown-state" },
  "findings--v2-unknown-finding.json": { path: "/report/inspection/candidates/0/findings/0", keyword: "x-unknown-finding" },
  "findings--v2-confirmed-without-origin.json": { path: "/report/inspection/states/0/arrival", keyword: "required", missingProperty: "originRef" },
  "findings--v2-rejected-without-reason.json": { path: "/report/inspection/candidates/2", keyword: "required", missingProperty: "reason" },
  "findings--v2-complete-with-gaps.json": { path: "/report/inspection/completion", keyword: "x-complete-with-gaps" },
  "findings--v2-recipe-not-from-load.json": { path: "/report/inspection/states/1/recipe/0/action", keyword: "x-recipe-from-load" },
  "artifact-manifest--v1-declares-findings-v2.json": { path: "/schemaVersions/findings", keyword: "const" },
  "artifact-manifest--v1-tool-payload-role.json": { path: "/files/6/role", keyword: "enum" },
  // NAT-84 — auditoria final: nada sinalizável fica fora das verificações
  "inspection-audit--cursor-hidden.json": { path: "/verificacoes/5/ocorrencias", keyword: "x-audit-unflagged" },
};

const show = (errors: ContractError[]): string => errors.map(e => `${e.path || "/"} ${e.keyword}${e.missingProperty ? `(${e.missingProperty})` : ""}`).join("; ");

// ───────────────────────────────────────────────────────────────── exemplos

test("todo schema compila e todo contrato tem exemplo válido", () => {
  const covered = new Set(files("valid").map(f => read<{ contract: string }>("valid", f).contract));
  for (const name of CONTRACT_NAMES) assert.ok(covered.has(name), `sem exemplo válido para ${name}`);
});

test("todo exemplo é fixture marcada e não usa tela real", () => {
  const telas = Object.keys(JSON.parse(readFileSync(join(ROOT, "telas.json"), "utf8")) as Record<string, unknown>).filter(k => k !== "_meta");
  for (const dir of ["valid", "invalid"]) {
    for (const f of files(dir)) {
      const text = readFileSync(join(EXAMPLES, dir, f), "utf8");
      const doc = JSON.parse(text) as { fixture?: unknown };
      if (f !== "findings--fixture-flag-missing.json") assert.equal(doc.fixture, true, `${dir}/${f}: fixture tem de ser true`);
      for (const tela of telas) assert.ok(!text.includes(`"${tela}"`), `${dir}/${f}: cita a tela real ${tela}`);
    }
  }
});

for (const f of files("valid")) {
  test(`válido: ${f}`, () => {
    const result = validateContract(read("valid", f));
    assert.ok(result.valid, `${f}: ${show(result.errors)}`);
  });
}

test("todo inválido tem regra esperada declarada, e vice-versa", () => {
  assert.deepEqual(files("invalid"), Object.keys(EXPECTED).sort());
});

for (const f of files("invalid")) {
  test(`inválido pela regra certa: ${f}`, () => {
    const result = validateContract(read("invalid", f));
    assert.equal(result.valid, false, `${f} passou`);
    const want = EXPECTED[f];
    const hit = result.errors.some(e => e.path === want.path && e.keyword === want.keyword &&
      (want.missingProperty === undefined || e.missingProperty === want.missingProperty));
    assert.ok(hit, `${f}: esperado ${want.path || "/"} ${want.keyword}${want.missingProperty ? `(${want.missingProperty})` : ""}, obtido ${show(result.errors)}`);
  });
}

test("contrato desconhecido é recusado sem lançar", () => {
  for (const doc of [null, {}, { contract: "run.v0" }, []]) {
    const result = validateContract(doc);
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].keyword, "x-unknown-contract");
  }
});

// ───────────────────────────────────────────────────────────────── compatibilidade com o contrato atual

test("findings.v1: o relatório é aceito pelo coletor atual e normaliza como achado-2", () => {
  for (const f of files("valid").filter(n => n.startsWith("findings--"))) {
    const doc = read<Findings>("valid", f);
    assert.deepEqual(validateFlowReport(doc.report), [], f);
    for (const finding of doc.report.findings) {
      const normalized = normalizeFinding(finding);
      assert.equal(normalized.contract, FINDING_CONTRACT);
      assert.ok(!normalized.flags.some(flag => flag.startsWith("contrato-incompleto")), `${f}: ${normalized.flags.join(", ")}`);
    }
  }
});

test("findings.v1: zero achados é válido; o relatório inválido para o coletor também é para o schema", () => {
  const empty = read<Findings>("valid", "findings--sem-zero-findings.json");
  assert.deepEqual(empty.report.findings, []);
  const broken = clone(read<Findings>("valid", "findings--com.json"));
  delete (broken.report.findings[0] as Partial<Findings["report"]["findings"][0]>).observed;
  assert.notDeepEqual(validateFlowReport(broken.report), []);
  assert.equal(validateContract(broken).valid, false);
  const nullRule = read<Findings>("valid", "findings--com.json").report.findings.find(x => x.rule === null);
  assert.ok(nullRule, "o exemplo precisa exercitar rule: null");
});

// ───────────────────────────────────────────────────────────────── NAT-81: findings.v2 / inspection.v1

test("findings.v2: mesmo achado-2 de v1; inspeção parcial e zero achados por orçamento são aceitos", () => {
  const v1 = read<Findings>("valid", "findings--com.json");
  const v2 = read<FindingsV2>("valid", "findings--v2-com-inspecao-parcial.json");
  assert.deepEqual(v2.report.findings, v1.report.findings, "o achado não muda entre v1 e v2");
  assert.equal(v2.findingContract, "achado-2");
  assert.equal(v2.report.inspection!.completion, "partial");
  const zero = read<FindingsV2>("valid", "findings--v2-sem-zero-findings-orcamento.json");
  assert.deepEqual(zero.report.findings, []);
  assert.ok(zero.report.inspection!.limitations.some(l => l.kind === "budget"));
  // registro ausente continua válido (não enviado ≠ cobertura zero): o achado nunca é perdido por causa do registro
  const { inspection: _i, ...semRegistro } = v2.report;
  assert.ok(validateContract({ ...clone(v2), inspectionStatus: "absent", report: semRegistro }).valid);
  // status e conteúdo têm de concordar
  assert.equal(validateContract({ ...clone(v2), report: semRegistro }).valid, false, "valid sem registro");
  assert.equal(validateContract({ ...clone(v2), inspectionStatus: "absent" }).valid, false, "absent com registro");
  // registro inválido: guardado à parte, achados intactos, envelope válido
  const inv = read<FindingsV2>("valid", "findings--v2-registro-invalido.json");
  assert.equal(inv.inspectionStatus, "invalid");
  assert.deepEqual(inv.report.findings, v1.report.findings);
  assert.equal(inv.report.inspection, undefined);
  assert.equal(validateContract({ ...clone(inv), inspectionErrors: undefined }).valid, false, "invalid sem lista de erros");
  // v1 não aceita o registro: o envelope é escolha do harness, não do agente
  assert.equal(validateContract({ ...clone(v1), report: { ...clone(v1.report), inspection: v2.report.inspection } }).valid, false);
});

test("findings.v2: regras do registro valem também no schema (motivos, origem de ferramenta, tipos)", () => {
  const v2 = read<FindingsV2>("valid", "findings--v2-com-inspecao-parcial.json");
  const mut = (f: (d: FindingsV2) => void) => { const d = clone(v2); f(d); return validateContract(d); };
  const kw = (r: ReturnType<typeof validateContract>) => r.errors.map(e => `${e.path} ${e.keyword}${e.missingProperty ? `(${e.missingProperty})` : ""}`);
  assert.ok(kw(mut(d => { delete d.report.inspection!.regions[1].reason; })).includes("/report/inspection/regions/1 required(reason)"));
  assert.ok(kw(mut(d => { delete d.report.inspection!.regions[1].originRef; })).includes("/report/inspection/regions/1 required(originRef)"));
  assert.ok(kw(mut(d => { delete d.report.inspection!.states[2].arrival.reason; })).includes("/report/inspection/states/2/arrival required(reason)"));
  assert.ok(kw(mut(d => { d.report.inspection!.candidates[0].findings = []; })).includes("/report/inspection/candidates/0/findings x-accepted-without-finding"));
  assert.ok(kw(mut(d => { d.report.inspection!.candidates[2].findings = [0]; })).includes("/report/inspection/candidates/2/findings x-rejected-with-finding"));
  // como a skill diz: `findings` só é obrigatório quando `accepted`
  assert.ok(mut(d => { delete d.report.inspection!.candidates[2].findings; delete d.report.inspection!.candidates[1].findings; }).valid, "rejeitado/incerto sem findings");
  assert.ok(kw(mut(d => { delete d.report.inspection!.candidates[0].findings; })).includes("/report/inspection/candidates/0 required(findings)"));
  assert.ok(kw(mut(d => { d.report.inspection!.items[0].region = "r9"; })).includes("/report/inspection/items/0/region x-unknown-region"));
  assert.ok(kw(mut(d => { d.report.inspection!.regions[0].states = ["s9"]; })).includes("/report/inspection/regions/0/states/0 x-unknown-state"));
  assert.ok(kw(mut(d => { (d.report.inspection as unknown as Record<string, unknown>).coverage = "100%"; })).some(k => k.endsWith("additionalProperties")),
    "o agente não declara cobertura da página");
  // incerto pode apontar achado enviado; aceito sem região alguma também é registro válido
  assert.ok(mut(d => { d.report.inspection!.regions = []; d.report.inspection!.items[0].region = undefined as unknown as string; delete d.report.inspection!.items[0].region; }).valid);
});

test("manifesto: v1 e v2 coerentes com o envelope; v2 declara o registro só quando ele existe", () => {
  const m1 = read<ArtifactManifest>("valid", "artifact-manifest--com.json");
  const m2 = read<ArtifactManifestV2>("valid", "artifact-manifest--v2-com-inspecao.json");
  const f1 = read<Findings>("valid", "findings--com.json");
  const f2 = read<FindingsV2>("valid", "findings--v2-com-inspecao-parcial.json");
  assert.deepEqual(crossCheckManifest(m1, f1), []);
  assert.deepEqual(crossCheckManifest(m2, f2), []);
  assert.ok(crossCheckManifest(m1, f2).some(e => e.keyword === "x-findings-version"));
  assert.ok(crossCheckManifest(m2, f1).some(e => e.keyword === "x-findings-version"));
  const semRegistro = clone(f2);
  delete semRegistro.report.inspection;
  assert.ok(crossCheckManifest(m2, semRegistro).some(e => e.keyword === "x-inspection-version"));
  semRegistro.inspectionStatus = "absent";
  const m2sem = clone(m2);
  delete m2sem.schemaVersions.inspection;
  m2sem.inspectionStatus = "absent";
  assert.deepEqual(crossCheckManifest(m2sem, semRegistro), []);
  assert.ok(crossCheckManifest(m2, { ...clone(f2), inspectionStatus: "invalid" }).some(e => e.keyword === "x-inspection-status"));
  assert.ok(crossCheckManifest(m2sem, f2).some(e => e.keyword === "x-inspection-version"));
});

test("fronteira: nenhum schema que o agente preenche tem campo de referência/gabarito", () => {
  for (const f of ["findings.v1.schema.json", "findings.v2.schema.json", "inspection.v1.schema.json"]) {
    const keys = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
        if (k === "properties" && x && typeof x === "object") for (const p of Object.keys(x)) keys.add(p);
        walk(x);
      }
    };
    walk(JSON.parse(readFileSync(join(CONTRACTS_DIR, f), "utf8")));
    const proibidas = [...keys].filter(k => /^(specs?(Id)?|units?(Id)?|reference|referencia|gabarito|groundTruth|expectedDetection|answerKey)$/i.test(k));
    assert.deepEqual(proibidas, [], `${f}: ${proibidas.join(", ")}`);
  }
});

// ───────────────────────────────────────────────────────────────── regras entre documentos

const runCom = read<Run>("valid", "run--com-passed.json");
const runSem = read<Run>("valid", "run--sem-passed.json");
const runNotRun = read<Run>("valid", "run--sem-not-run-preflight.json");
const findingsCom = read<Findings>("valid", "findings--com.json");
const findingsSem = read<Findings>("valid", "findings--sem-zero-findings.json");
const isolation = read<Isolation>("valid", "isolation--passed.json");
const campaign = read<Campaign>("valid", "campaign--pilot.json");
const bindingUsed = read<AnalysisBinding>("valid", "analysis-binding--individual-used.json");
const bindingAbsent = read<AnalysisBinding>("valid", "analysis-binding--individual-planned-absence.json");

test("crossCheckRun: pacote coerente passa; findings de outro run, isolamento divergente e oráculo no sem não", () => {
  assert.deepEqual(crossCheckRun(runCom, findingsCom, isolation), []);
  const keyword = (errors: ContractError[]) => errors.map(e => e.keyword);
  assert.ok(keyword(crossCheckRun(runCom, findingsSem, isolation)).includes("x-run-mismatch"));
  assert.ok(keyword(crossCheckRun(runCom, null, isolation)).includes("x-missing-findings"));
  assert.ok(keyword(crossCheckRun(runNotRun, findingsSem, null)).includes("x-unexpected-findings"));
  const semIsolation = { ...clone(isolation), runId: runSem.runId };
  assert.ok(keyword(crossCheckRun(runSem, findingsSem, semIsolation)).includes("x-oracle-in-sem"));
  const failed = { ...clone(isolation), result: "unverified" as const };
  assert.ok(keyword(crossCheckRun(runCom, findingsCom, failed)).includes("x-isolation-mismatch"));
});

test("ausência planejada: só a que a campanha declarou, para a tela, no caminho individual", () => {
  const campaignSha = bindingAbsent.baseline.mode === "planned-absence" ? bindingAbsent.baseline.declaredIn.campaignSha256 : "";
  assert.deepEqual(checkPlannedAbsence(campaign, campaignSha, bindingAbsent), []);
  assert.deepEqual(checkPlannedAbsence(campaign, campaignSha, bindingUsed), []);
  const undeclared = clone(campaign);
  undeclared.baselinePolicy.plannedAbsences = [];
  assert.ok(checkPlannedAbsence(undeclared, campaignSha, bindingAbsent).some(e => e.keyword === "x-absence-not-planned"));
  const otherVersion = checkPlannedAbsence(campaign, "0".repeat(64), bindingAbsent);
  assert.ok(otherVersion.some(e => e.keyword === "x-campaign-mismatch"));
});

test("campanha: ausência planejada depois do congelamento é recusada", () => {
  const late = clone(campaign);
  late.baselinePolicy.plannedAbsences[0].declaredAt = "2026-01-05T00:00:00Z";
  const result = validateContract(late);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.keyword === "x-planned-absence-after-freeze"), show(result.errors));
});

// ───────────────────────────────────────────────────────────────── chave de comparação

test("chave de comparação: com × sem sob a mesma configuração agrega (braço é a única diferença)", () => {
  const check = checkAggregation([{ run: runCom, binding: bindingUsed }, { run: runSem, binding: bindingUsed }]);
  assert.ok(check.ok, check.problems.join("; "));
  assert.ok(check.warnings.some(w => w.includes("model.resolved")), "unknown em todos tem de avisar");
  assert.ok(!("arm" in comparisonKeyOf(runCom, bindingUsed)));
});

test("chave de comparação: qualquer diferença fora do desenho bloqueia a agregação", () => {
  const mutations: [string, (r: Run, b: AnalysisBinding) => void][] = [
    ["browser.version", r => { r.browser.version = "outra"; }],
    ["model.requested", r => { r.model.requested = "outro-modelo"; }],
    ["effort", r => { r.effort = "high"; }],
    ["client.version", r => { r.client.version = "9.9.9"; }],
    ["provider.authMethod", r => { r.provider.authMethod = "api-key"; }],
    ["versions.protocolSha256", r => { r.versions.protocolSha256 = "0".repeat(64); }],
    ["screen.version", r => { r.screen.version = "outra"; }],
    ["limits", r => { r.limits.timeoutSeconds = 60; }],
    ["isolationPolicyVersion", r => { r.isolationPolicyVersion = "outra"; }],
    ["reference.sha256", (_r, b) => { b.reference.sha256 = "0".repeat(64); }],
    ["scorer.version", (_r, b) => { b.scorer.version = "flow-semantic-9.9.9"; }],
  ];
  for (const [field, mutate] of mutations) {
    const run = clone(runSem);
    const binding = clone(bindingUsed);
    mutate(run, binding);
    const check = checkAggregation([{ run: runCom, binding: bindingUsed }, { run, binding }]);
    assert.equal(check.ok, false, `${field} diferente agregou`);
    assert.ok(check.problems.some(p => p.startsWith(`${field} difere`)), `${field}: ${check.problems.join("; ")}`);
  }
});

test("chave de comparação: oráculos diferentes dentro do braço com bloqueiam; fixture não se mistura com real", () => {
  const otherCom = clone(runCom);
  otherCom.runId = "fixture-run-com-02";
  otherCom.intervention.oracle!.version = "0.0.1-fixture";
  const binding = clone(bindingUsed);
  binding.runs.push({ ...binding.runs[0], runId: otherCom.runId });
  assert.ok(checkAggregation([{ run: runCom, binding }, { run: otherCom, binding }]).problems.some(p => p.includes("intervention.oracle")));
  const real = clone(runSem);
  real.fixture = false;
  assert.ok(checkAggregation([{ run: runCom, binding: bindingUsed }, { run: real, binding: bindingUsed }]).problems.some(p => p.includes("fixture")));
});

console.log(`\n${tests} testes de contratos passaram`);
