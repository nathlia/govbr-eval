/** NAT-95: synthetic test of the fixed BM25 reference pool (no real KB, no models). */
import assert from "node:assert/strict";
import { buildIndex, familyKey, fold, isExcluded, poolFor, sanity, search, tokenize, toJudge, type Qrel, type Rule } from "./pool-referencia-bm25";

let passed = 0, failed = 0;
function test(name: string, f: () => void) {
  try { f(); passed++; console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}\n${(e as Error).stack}`); }
}
const rule = (id: string, text: string, component: string | null, more: Partial<Rule> = {}): Rule =>
  ({ id, title: text.slice(0, 20), normalizedRule: text, originalText: text, component, force: "required", status: "stable", ...more });
const rules: Rule[] = [
  rule("g1", "O foco do teclado deve ser visível em todos os elementos", null),
  rule("m1", "Ao fechar o modal, o foco deve voltar ao elemento que o abriu", "modal"),
  rule("m2", "O modal deve ter um título", "modal"),
  rule("b1", "Botões só com ícones precisam de rótulo acessível; o foco é obrigatório", "button"),
  rule("b2", "Botões só com *ícones* precisam de rótulo  acessível; o foco é obrigatório", "radio"),
  rule("x1", "Exemplo de foco de modal", "modal", { force: "example" }),
];
const ix = buildIndex(rules.filter(r => !isExcluded(r)));
const byId = new Map(rules.map(r => [r.id, r]));

test("fold strips accents and case; tokenize drops stopwords and trailing s", () => {
  assert.equal(fold("Ação É"), "acao e");
  assert.deepEqual(tokenize("Os botões do Modal"), ["botoe", "modal"]);
});
test("example and legacy records are excluded", () => {
  assert.equal(isExcluded(rules[5]), true);
  assert.equal(isExcluded(rule("l", "t", null, { status: "legacy" })), true);
  assert.ok(!ix.docs.some(d => d.id === "x1"));
});
test("accent-insensitive ranking, deterministic", () => {
  const r = search(ix, "fechar modal FOCO volta", null);
  assert.equal(r[0], "m1");
  assert.deepEqual(r, search(ix, "fechar modal FOCO volta", null));
});
test("component run keeps component + globals only; pool = sorted union", () => {
  const b = search(ix, "foco", "modal");
  assert.ok(b.every(id => ["g1", "m1", "m2"].includes(id)) && b.includes("g1"));
  const p = poolFor(ix, { id: "q", query: "foco", component: "modal", estrato: "respondivel" });
  assert.deepEqual(p, [...p].sort());
  assert.ok(p.includes("b1") && p.includes("m1"));
  assert.equal(new Set(p).size, p.length);
});
test("toJudge skips labelled ids and literal-family copies", () => {
  assert.equal(familyKey("Botões só com *ícones* precisam de rótulo  acessível"), familyKey("Botoes so com icones precisam de rotulo acessivel"));
  const labels: Qrel[] = [{ query_id: "q", unit_id: "b1", relevance: 2 }];
  assert.deepEqual(toJudge(["b1", "b2", "g1"], labels, byId), ["g1"]);
});
test("sanity counts family hits on respondivel only", () => {
  const s = sanity(ix, [{ id: "q", query: "fechar modal foco", component: "modal", estrato: "respondivel" },
    { id: "z", query: "foco", estrato: "sem_resposta" }], [{ query_id: "q", unit_id: "m1", relevance: 2 }], byId);
  assert.deepEqual([s.queries, s.hitsAt5, s.meanRecallAt5], [1, 1, 1]);
});
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
