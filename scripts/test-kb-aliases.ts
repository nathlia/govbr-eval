/**
 * kb-aliases-2.0.0: o casamento por regra entende os ids literais da KB ativa (validator 2.12.0) e as
 * substituições declaradas, sem casar através de componentes; o vocabulário legado fica congelado.
 *
 * Uso: npm run test:kb-aliases
 */
import assert from "node:assert/strict";
import type { FlowAgentResults, FlowGroundTruth } from "../types";
import type { ElementRef, Resolution } from "./anchors";
import { buildFlowUnits, scoreFlow } from "./units-flow";
import { KB_ALIASES_LEGADO, KB_ALIASES_VIGENTE, parseRulesFromText } from "./units";
import { buildKbAliases, rotuloDoVocabulario, type KbAliasVocabulary } from "./kb-aliases";
import { FLOW_SCORING_VERSION, kbAliasesFileFor } from "./instrument";
import { analysisIdentity } from "./collection-manifest";

let passed = 0;
function test(name: string, fn: () => void): void { fn(); passed++; console.log(`ok ${name}`); }

const K = "govbr-3.7.0-";
const LITERAL_EMAG_62 = `${K}accessibility-global-25887e6e360f`;  // "As etiquetas de texto (LABEL) devem estar associadas…" (e-MAG 6.2, literal)
const OLD_EMAG_62 = `${K}accessibility-global-b95c42b61ed3`;      // 3.7.0: título da recomendação 6.2 (substituído)
const OLD_BUTTON = `${K}component-button-4d7b5f978df1`;           // 3.7.0, substituído
const OLD_AVATAR = `${K}component-avatar-81c7524692f0`;           // 3.7.0, substituído

const el = (key: string, id: string): ElementRef => ({ key, id, label: `<${key}>`, hidden: null });
const refs = { campo: el("body>input", "E-campo"), botao: el("body>button", "E-botao"), avatar: el("body>span", "E-avatar") };
const res: Resolution = {
  url: "http://example.test/",
  byKey: new Map(Object.values(refs).map(r => [r.key, r])),
  bySelector: new Map(Object.entries({ "#campo": refs.campo, "#botao": refs.botao, "#avatar": refs.avatar })
    .map(([s, r]) => [s, { selector: s, ok: true, error: null, keys: [r.key] }])),
};
const spec = (id: string, anchor: string, rules: string[]) =>
  ({ id, anchor, scope: "unico" as const, expectedCount: 1, rules, categories: ["acessibilidade"], description: id });

/** TP de UMA alegação contra UMA spec, com o mesmo vocabulário nos dois lados (como no scorer). */
function tp(specRules: string[], anchor: string, findingRule: string, findingSelector: string, vocab: KbAliasVocabulary): number {
  const gt: FlowGroundTruth = { _meta: { page: "t", url: "/" }, violations: [spec("S-1", anchor, specRules)] };
  const built = buildFlowUnits(gt, res, undefined, vocab);
  assert.deepEqual(built.defects, []);
  const run: FlowAgentResults = { timestamp: "2026-10-15T00:00:00Z", model: "t", appUrl: res.url,
    findings: [{ selector: findingSelector, rule: findingRule, description: "alegação de teste" }] };
  return scoreFlow(run, built.units, res, undefined, vocab).TP;
}
const successors = (id: string): string[] => (KB_ALIASES_VIGENTE.aliases[id] ?? []).filter(a => a.startsWith("govbr-"));

test("vocabulários: vigente é o v2 do instrumento; legado é o kb-aliases.json congelado, byte a byte", () => {
  assert.equal(KB_ALIASES_VIGENTE.version, "kb-aliases-2.0.0");
  assert.equal(kbAliasesFileFor(FLOW_SCORING_VERSION), "kb-aliases-v2.json");
  for (const v of ["flow-semantic-1.6.0", "flow-semantic-1.5.0", "citation-matching-D37"]) assert.equal(kbAliasesFileFor(v), "kb-aliases.json");
  assert.equal(KB_ALIASES_LEGADO.sha256, "e3d79270490f7f18ad0bcd3c9655526d8b15a1f2016c0f7753af581ce01dc656");
  assert.deepEqual(analysisIdentity().kbAliasesApplied, { version: KB_ALIASES_VIGENTE.version, file: "kb-aliases-v2.json", sha256: KB_ALIASES_VIGENTE.sha256 });
  assert.match(rotuloDoVocabulario(KB_ALIASES_VIGENTE), /^kb-aliases-2\.0\.0@[0-9a-f]{12}$/);
});

test("id literal novo do e-MAG 6.2 casa unidade marcada emag:6.2 (v2); com o legado não casava (o defeito)", () => {
  assert.deepEqual(KB_ALIASES_VIGENTE.aliases[LITERAL_EMAG_62]?.includes("emag:6.2"), true, "a chave vem do emagReferences do próprio registro");
  assert.equal(tp(["emag:6.2"], "#campo", LITERAL_EMAG_62, "#campo", KB_ALIASES_VIGENTE), 1);
  assert.equal(tp(["emag:6.2"], "#campo", LITERAL_EMAG_62, "#campo", KB_ALIASES_LEGADO), 0);
});

test("unidade ancorada no id antigo substituído: casa o literal 6.2, o sucessor declarado e o próprio id antigo", () => {
  const succ = successors(OLD_EMAG_62);
  assert.ok(succ.length >= 1, "a KB declara sucessor do id antigo");
  assert.equal(tp([OLD_EMAG_62], "#campo", LITERAL_EMAG_62, "#campo", KB_ALIASES_VIGENTE), 1);
  for (const s of succ) assert.equal(tp([OLD_EMAG_62], "#campo", s, "#campo", KB_ALIASES_VIGENTE), 1);
  assert.equal(tp([OLD_EMAG_62], "#campo", OLD_EMAG_62, "#campo", KB_ALIASES_VIGENTE), 1);
  // e o inverso: unidade no sucessor, alegação citando o id antigo
  assert.equal(tp([succ[0]], "#campo", OLD_EMAG_62, "#campo", KB_ALIASES_VIGENTE), 1);
});

test("componente do DS: id antigo ↔ sucessor casa; nada atravessa componente", () => {
  const [newButton] = successors(OLD_BUTTON);
  const [newAvatar] = successors(OLD_AVATAR);
  assert.ok(newButton && newAvatar);
  assert.equal(tp([OLD_BUTTON], "#botao", newButton, "#botao", KB_ALIASES_VIGENTE), 1);
  assert.equal(tp([OLD_BUTTON], "#botao", OLD_BUTTON, "#botao", KB_ALIASES_VIGENTE), 1);
  assert.equal(tp([OLD_BUTTON], "#botao", newAvatar, "#botao", KB_ALIASES_VIGENTE), 0, "regra de avatar não casa unidade de botão");
  assert.equal(tp([OLD_AVATAR], "#avatar", newButton, "#avatar", KB_ALIASES_VIGENTE), 0);
  assert.equal(tp([OLD_BUTTON], "#botao", LITERAL_EMAG_62, "#botao", KB_ALIASES_VIGENTE), 0, "chave de norma não alcança regra de componente");
  // Nenhuma ligação do v2 atravessa componente (o gerador recusa; aqui se confere o arquivo gravado).
  const comp = (id: string): string | null => id.match(/^govbr-[\d.]+-[a-z]+-([a-z]+)-/)?.[1] ?? null;
  for (const [id, as] of Object.entries(KB_ALIASES_VIGENTE.aliases)) {
    for (const a of as.filter(x => x.startsWith("govbr-"))) assert.equal(comp(a), comp(id), `${id} → ${a}`);
  }
});

test("gerador: chave do próprio registro (inclusive source.section no e-MAG), união entre versões, substituição só no mesmo componente e família", () => {
  const b = buildKbAliases({
    base: { version: "3.7.0", rules: [
      { id: "old-a", force: "required", standard: "eMAG", emagReferences: ["6.2"], wcagReferences: ["WCAG 2.0 1.3.1"] },
      { id: "old-btn", force: "required", component: "button" },
      { id: "old-x", force: "required", component: "card" },
      { id: "old-emag", force: "required", standard: "eMAG", emagReferences: ["2.1"] },
      { id: "same", force: "required", wcagReferences: ["WCAG 2.0 2.4.7"] },
      { id: "ex", force: "example", emagReferences: ["1.1"] },
    ] },
    active: { version: "lit", legacy: [{ id: "old-a", supersededBy: ["new-a"] }, { id: "old-x", supersededBy: ["new-btn"] }], rules: [
      { id: "new-a", force: "required", standard: "e-MAG", emagReferences: [], source: { section: "Recomendação 6.2 – Associar etiquetas" } },
      { id: "new-btn", force: "required", component: "button", supersedes: ["old-btn"] },
      { id: "new-ds", force: "required", standard: "gov.br Design System", supersedes: ["old-emag"] },
      { id: "same", force: "required", emagReferences: ["4.4"] },
    ] },
  });
  assert.deepEqual(b.aliases["new-a"], ["emag:6.2", "old-a"]);
  assert.deepEqual(b.aliases["old-a"], ["emag:6.2", "new-a", "wcag:1.3.1"]);
  assert.deepEqual(b.aliases["old-btn"], ["new-btn"]);
  assert.deepEqual(b.aliases["new-btn"], ["old-btn"]);
  assert.deepEqual(b.aliases["same"], ["emag:4.4", "wcag:2.4.7"]);
  assert.equal(b.aliases["ex"], undefined);
  assert.deepEqual(b.supersession.recusadas.map(r => [r.from, r.to]), [["old-x", "new-btn"], ["old-emag", "new-ds"]]);
  assert.equal(b.counts.chaveDaSecao, 1);
});

test("ids literais com sufixo -2/-3 são lidos inteiros do texto", () => {
  assert.deepEqual(parseRulesFromText(`viola ${K}component-checkbox-d85e2f92b627-2 e ${K}component-card-086bc8c9c107.`),
    [`${K}component-checkbox-d85e2f92b627-2`, `${K}component-card-086bc8c9c107`]);
});

console.log(`\n${passed} kb-aliases tests passed.`);
