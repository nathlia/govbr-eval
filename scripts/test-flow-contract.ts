/**
 * Contrato do achado (fluxo-1.3.0, fatia 2 do v02): coletor, rótulo legado, resolução de evidência
 * e cartões de revisão. Sem navegador e sem chamada de modelo. A cópia da evidência pelo runner é
 * testada em pipeline/test-runner-support.ps1, onde a função mora.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { FlowAgentResults } from "../types";
import type { Resolution } from "./anchors";
import type { FlowUnit } from "./units-flow";
import { normalizeFinding, resolveEvidence, validateFlowReport, type EvidenceIndex } from "./flow-contract";
import { Collector } from "./measurement-surface";
import { prepareSemanticPackage, scopeReviews } from "./semantic-flow";
import { renderReview } from "./semantic-flow-render";

let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

const current = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  selector: "#cpf", relatedSelectors: ["#button"], rule: "wcag:1.3.1",
  observed: "Help text is rendered but not referenced by the field", expected: "The field references its help text",
  state: { viewport: { width: 1280, height: 900 }, steps: ["submit the empty form"] },
  evidence: [".playwright-mcp/page-1.yml"], ...overrides,
});
const legacy = { selector: "#cpf", rule: "wcag:1.3.1", description: "Help text is not associated" };
const report = (findings: unknown[]) => ({ timestamp: "t", model: "m", appUrl: "http://127.0.0.1:3100/fluxo.html", findings });

const element = { key: "body>input", id: "E-input", label: "CPF", hidden: null };
const resolution: Resolution = { url: "http://fixture/fluxo.html",
  byKey: new Map([[element.key, element]]),
  bySelector: new Map([["#cpf", { selector: "#cpf", ok: true, error: null, keys: [element.key] }]]) };
const units: FlowUnit[] = [{ specId: "A", element, participants: [element.key], rules: ["wcag:1.3.1"],
  categories: ["form"], description: "Help text association", state: "sempre",
  states: ["inicial", "submitted"], conditional: false }];
const context = { referenceHash: "r", sceneHash: "s", scorerHash: "h" };
const index: EvidenceIndex = { dir: "pipeline/logs/run-1-evidencia", files: [
  { path: ".playwright-mcp/page-1.yml", bytes: 10, sha256: "a".repeat(64) },
  { path: ".playwright-mcp/shot.png", bytes: 20, sha256: "b".repeat(64) },
  { path: "other/shot.png", bytes: 20, sha256: "c".repeat(64) },
] };
const run = (findings: unknown[]): FlowAgentResults =>
  ({ timestamp: "t", model: "m", appUrl: resolution.url, findings: findings as FlowAgentResults["findings"] });

function temporary(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "flow-contract-test-"));
  try { fn(dir); } finally {
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    assert.ok(basename(dir).startsWith("flow-contract-test-"));
    rmSync(dir, { recursive: true, force: true });
  }
}

test("collector contract accepts an atomic finding with state and evidence, including uncertain attribution", () => {
  assert.deepEqual(validateFlowReport(report([current()])), []);
  assert.deepEqual(validateFlowReport(report([current({
    rule: null, evidence: [], state: { viewport: { width: 320, height: 720 }, steps: [] },
  })])), []);
});

test("collector contract rejects legacy-shaped and incomplete findings with actionable errors", () => {
  const errors = validateFlowReport(report([legacy]));
  for (const field of ["observed", "expected", "state", "evidence"]) {
    assert.ok(errors.some(e => e.startsWith(`findings[0].${field}`)), field);
  }
  const { rule: _rule, ...withoutRule } = current();
  assert.ok(validateFlowReport(report([withoutRule])).some(e => e.startsWith("findings[0].rule")));
  assert.ok(validateFlowReport(report([current({ state: { viewport: { width: 0, height: 0 }, steps: [] } })]))
    .some(e => e.startsWith("findings[0].state.viewport")));
  assert.ok(validateFlowReport(report([current({ evidence: "page-1.yml" })])).some(e => e.startsWith("findings[0].evidence")));
  assert.deepEqual(validateFlowReport([]), ["o corpo precisa ser um objeto JSON"]);
});

test("collector keeps a rejected body verbatim and still accepts the corrected report", () => {
  temporary(dir => {
    const collector = new Collector(join(dir, "inbox"), join(dir, "rejected"), []);
    collector.arm("run-1");
    const bad = JSON.stringify(report([legacy]));
    assert.equal(collector.submit(bad).status, 400);
    const good = JSON.stringify(report([current()]));
    assert.equal(collector.submit(good).status, 200);
    const outcome = collector.disarm();
    assert.equal(outcome.rejected.length, 1);
    assert.equal(JSON.parse(readFileSync(join(dir, "rejected", outcome.rejected[0]), "utf8")).body, bad);
    assert.equal(readFileSync(join(dir, "inbox", "run-1.raw.txt"), "utf8"), good);
  });
});

test("normalization labels legacy findings and never promotes them", () => {
  const n = normalizeFinding(legacy);
  assert.equal(n.contract, "achado-1-legado");
  assert.deepEqual([n.observed, n.expected, n.state, n.evidence], [null, null, null, []]);
  assert.ok(n.flags.includes("legado-sem-estado-nem-evidencia"));
  assert.equal(n.description, legacy.description);
  assert.equal(n.rule, legacy.rule);
});

test("normalization flags uncertain, multi-rule, evidence-less, incomplete and malformed claims without splitting", () => {
  assert.ok(normalizeFinding(current({ rule: null })).flags.includes("regra-incerta"));
  const multi = normalizeFinding(current({ rule: "wcag:1.3.1, emag:6.2" }));
  assert.ok(multi.flags.includes("varias-regras"));
  assert.equal(multi.rule, "wcag:1.3.1, emag:6.2");
  assert.ok(normalizeFinding(current({ evidence: [] })).flags.includes("sem-evidencia"));
  const partial = normalizeFinding({ selector: "#cpf", rule: "wcag:1.3.1", observed: "only an observation" });
  assert.equal(partial.contract, "achado-2");
  assert.ok(partial.flags.some(flag => flag.startsWith("contrato-incompleto")));
  const malformed = normalizeFinding({ rule: 7 });
  assert.equal(malformed.contract, "malformado");
  assert.match(malformed.description, /preservado como veio: \{"rule":7\}/);
});

test("evidence references resolve against the preserved archive, and only exactly", () => {
  const resolved = resolveEvidence([
    "[Snapshot](.playwright-mcp\\page-1.yml)",
    "C:\\Users\\x\\AppData\\Local\\Temp\\govbr-eval-run-1\\.playwright-mcp\\page-1.yml",
    "page-1.yml", "shot.png", ".playwright-mcp/missing.yml", "S-page-001",
  ], index);
  assert.deepEqual(resolved.map(e => e.status), ["encontrado", "encontrado", "encontrado", "ambiguo", "ausente", "identificador"]);
  assert.equal(resolved[0].path, "pipeline/logs/run-1-evidencia/.playwright-mcp/page-1.yml");
  assert.equal(resolved[0].sha256, "a".repeat(64));
  assert.deepEqual(resolveEvidence(["page-1.yml"], null).map(e => e.status), ["sem-arquivo"]);
});

test("review package keeps legacy, current and malformed findings as separately labeled cards", () => {
  const pkg = prepareSemanticPackage(context, units, resolution, [
    { id: "legacy", data: run([legacy]) },
    { id: "current", data: run([current(), { rule: 7 }]), evidence: index },
  ]);
  assert.deepEqual(pkg.cards.map(c => c.contract).sort(), ["achado-1-legado", "achado-2", "malformado"]);
  const card = pkg.cards.find(c => c.contract === "achado-2")!;
  assert.equal(card.evidence[0].status, "encontrado");
  assert.equal(pkg.cards.find(c => c.contract === "achado-1-legado")!.evidence.length, 0);
  const other = { ...index, files: index.files.map(f => ({ ...f, sha256: "d".repeat(64) })) };
  const changed = prepareSemanticPackage(context, units, resolution, [{ id: "current", data: run([current()]), evidence: other }]);
  assert.notEqual(changed.cards[0].id, card.id, "different evidence bytes never reuse a decision");
});

test("review cards show observed, expected, state and resolved evidence, and label legacy claims", () => {
  const pkg = prepareSemanticPackage(context, units, resolution, [
    { id: "legacy", data: run([legacy]) },
    { id: "current", data: run([current({ evidence: [".playwright-mcp/page-1.yml", "S-page-001"] }), { rule: 7 }]), evidence: index },
  ]);
  const md = renderReview(pkg, scopeReviews(pkg));
  for (const text of ["Contrato: achado-1 (legado", "Contrato: achado-2", "Contrato: malformado",
    "Observado: Help text is rendered", "Esperado: The field references", "Janela: 1280×900",
    "1. submit the empty form", "### Evidência da execução",
    "`pipeline/logs/run-1-evidencia/.playwright-mcp/page-1.yml` (sha256 aaaaaaaaaaaa)",
    "identificador devolvido por ferramenta", "Sinalizações: legado-sem-estado-nem-evidencia"]) {
    assert.ok(md.includes(text), text);
  }
  const uncertain = prepareSemanticPackage(context, units, resolution, [{ id: "u", data: run([current({ rule: null })]), evidence: index }]);
  assert.ok(renderReview(uncertain, scopeReviews(uncertain)).includes("Regra declarada: nenhuma (atribuição incerta)"));
});

test("blind review masks rule ids of the DS base and tool mentions in the claim; the full render does not (plano de revisão 19/10, C)", () => {
  const pkg = prepareSemanticPackage(context, units, resolution, [{ id: "c", data: run([current({ rule: "govbr-3.7.0-component-message-66b01a712e67",
    observed: "scan_page e o axe acharam ds-page-footer ausente", steps: ["browser_snapshot"] })]), evidence: index }]);
  const cego = renderReview(pkg, scopeReviews(pkg), { cego: true }), completo = renderReview(pkg, scopeReviews(pkg));
  assert.ok(cego.includes("Regra declarada: [regra citada]"), "rule id masked");
  for (const x of ["govbr-3.7.0", "ds-page-footer", "scan_page", "browser_snapshot", " axe "]) assert.ok(!cego.includes(x), x);
  assert.ok(cego.includes("Observado: [ferramenta citada] e o [ferramenta citada] acharam [regra citada] ausente"));
  assert.ok(completo.includes("Regra declarada: govbr-3.7.0-component-message-66b01a712e67") && completo.includes("scan_page e o axe"));
  const wcag = prepareSemanticPackage(context, units, resolution, [{ id: "w", data: run([current()]), evidence: index }]);
  assert.ok(renderReview(wcag, scopeReviews(wcag), { cego: true }).includes("Regra declarada: wcag:1.3.1"), "public norm stays");
});

const entry = "http://127.0.0.1:3100/fluxo.html";

test("collector promotes the last refused body when a run never had a report accepted", () => {
  temporary(dir => {
    const collector = new Collector(join(dir, "inbox"), join(dir, "rejected"), [], entry);
    collector.arm("run-1");
    assert.equal(collector.submit(JSON.stringify(report([legacy]))).status, 400);
    const { appUrl: _appUrl, ...withoutPage } = report([current({ state: undefined })]);
    const last = JSON.stringify({ ...withoutPage, collector: { status: "aceito" } });
    const refused = collector.submit(last);
    assert.equal(refused.status, 400, "agent-facing behavior is unchanged");
    const outcome = collector.disarm();
    assert.equal(outcome.receipt?.status, "recusa-arquivada");
    assert.equal(outcome.rejected.length, 2);
    assert.equal(outcome.receipt?.rejectedFile, outcome.rejected[1], "the LAST refusal is promoted");
    assert.match(outcome.receipt?.reason ?? "", /appUrl/);
    assert.deepEqual(outcome.receipt?.droppedFields, ["collector"], "an agent cannot write the collector's record");
    const record = JSON.parse(readFileSync(join(dir, "inbox", "run-1.json"), "utf8"));
    assert.equal(record.collector.status, "recusa-arquivada");
    assert.equal(record.collector.parseable, true);
    assert.equal(record.collector.satisfiesContract, false);
    assert.equal(record.collector.rawBody, last);
    assert.equal(record.collector.rejectedFile, outcome.rejected[1]);
    assert.deepEqual(record.collector.filled, ["appUrl"]);
    assert.equal(record.appUrl, entry);
    assert.equal(record.findings.length, 1);
    assert.equal(readFileSync(join(dir, "inbox", "run-1.raw.txt"), "utf8"), last);
  });
});

test("a refused body that is not JSON still becomes a run record that keeps its raw text", () => {
  temporary(dir => {
    const collector = new Collector(join(dir, "inbox"), join(dir, "rejected"), [], entry);
    collector.arm("run-2");
    assert.equal(collector.submit("achados: nenhum {").status, 400);
    const outcome = collector.disarm();
    assert.equal(outcome.receipt?.status, "recusa-arquivada");
    assert.match(outcome.receipt?.reason ?? "", /JSON inválido/);
    const record = JSON.parse(readFileSync(join(dir, "inbox", "run-2.json"), "utf8"));
    assert.equal(record.collector.parseable, false);
    assert.equal(record.collector.rawBody, "achados: nenhum {");
    assert.deepEqual(record.findings, []);
    assert.deepEqual(record.collector.filled, ["findings", "timestamp", "appUrl"]);
    collector.arm("run-4");
    assert.equal(collector.disarm().receipt, null, "no submission at all promotes nothing");
  });
});

test("an accepted report wins: earlier refusals stay only in rejected/, and idempotency is unchanged", () => {
  temporary(dir => {
    const collector = new Collector(join(dir, "inbox"), join(dir, "rejected"), [], entry);
    collector.arm("run-3");
    assert.equal(collector.submit("not json").status, 400);
    const good = JSON.stringify(report([current()]));
    const accepted = collector.submit(good);
    assert.equal(accepted.status, 200);
    assert.equal((accepted.response.receipt as { status: string }).status, "aceito");
    assert.equal(collector.submit(good).response.duplicate, true);
    assert.equal(collector.submit(JSON.stringify(report([]))).status, 409);
    const outcome = collector.disarm();
    assert.equal(outcome.receipt?.status, "aceito");
    assert.equal(outcome.rejected.length, 2);
    const record = JSON.parse(readFileSync(join(dir, "inbox", "run-3.json"), "utf8"));
    assert.equal(record.collector, undefined);
    assert.equal(readFileSync(join(dir, "inbox", "run-3.raw.txt"), "utf8"), good);
  });
});

test("findings of a promoted report are flagged and never read as achado-2; bodies without findings become one malformed card", () => {
  temporary(dir => {
    const collector = new Collector(join(dir, "inbox"), join(dir, "rejected"), [], entry);
    const promoted = (runId: string, body: string): FlowAgentResults => {
      collector.arm(runId);
      assert.equal(collector.submit(body).status, 400);
      assert.equal(collector.disarm().receipt?.status, "recusa-arquivada");
      return JSON.parse(readFileSync(join(dir, "inbox", `${runId}.json`), "utf8")) as FlowAgentResults;
    };
    // A complete finding refused only for a report-level gap is still `recusado`.
    const { timestamp: _timestamp, ...noTimestamp } = report([current(), legacy]);
    const pkg = prepareSemanticPackage(context, units, resolution, [
      { id: "partial", data: promoted("partial", JSON.stringify(noTimestamp)) },
      { id: "broken", data: promoted("broken", "{ not json") },
      { id: "empty", data: promoted("empty", JSON.stringify({ model: "m", findings: [] })) },
    ]);
    const cardsOf = (id: string) => pkg.runs.find(r => r.id === id)!.cardIds.map(cardId => pkg.cards.find(c => c.id === cardId)!);
    assert.deepEqual(cardsOf("partial").map(c => c.contract), ["recusado", "recusado"]);
    for (const card of cardsOf("partial")) {
      assert.ok(card.flags[0].startsWith("contrato-incompleto: relatório recusado pelo coletor"), card.flags.join(" | "));
    }
    assert.ok(cardsOf("partial").some(c => c.flags.includes("legado-sem-estado-nem-evidencia")));
    for (const id of ["broken", "empty"]) {
      const cards = cardsOf(id);
      assert.equal(cards.length, 1, id);
      assert.equal(cards[0].contract, "malformado");
      assert.ok(cards[0].flags.includes("malformado"));
      assert.ok(cards[0].flags.some(f => f.startsWith("contrato-incompleto: relatório recusado")));
    }
    assert.ok(cardsOf("broken")[0].description.includes("{ not json"));
    assert.ok(!pkg.cards.some(c => c.contract === "achado-2"));
    const md = renderReview(pkg, scopeReviews(pkg));
    assert.ok(md.includes("Contrato: recusado"));
    assert.ok(md.includes('"status": "recusa-arquivada"'));
  });
});

console.log(`${tests} finding-contract tests passed.`);
