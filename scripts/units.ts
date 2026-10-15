/**
 * Unit-level matching core (E3): agent findings against expected units (case × normative rule).
 *
 * Extracted from score-results.ts so that the scorer and `npm run adjudicate` decide "did this
 * finding match anything?" with the SAME code. Two implementations of this question would drift,
 * and a drifted answer would put findings on the adjudication list that the scorer already
 * counted as matches — the fifth instance of the defect the decision log keeps recording.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { AgentFinding, AgentResults, GroundTruth, RuleId } from "../types";
import { ROOT, applyRecord, findingId, type AdjudicationIndex } from "./adjudication";
import { FLOW_KB_ALIASES_FILE, LEGACY_KB_ALIASES_FILE } from "./instrument";
import { expandWith, loadKbAliasVocabulary, type KbAliasVocabulary } from "./kb-aliases";

export function loadJson<T>(relPath: string): T | null {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, "utf8")) as T;
}

const gt = loadJson<GroundTruth>("ground-truth.json");
if (!gt) {
  console.error("Missing ground-truth.json");
  process.exit(1);
}
/**
 * Vocabulários de aliases da KB (scripts/kb-aliases.ts). O PADRÃO de toda função abaixo é o legado
 * congelado (kb-aliases.json): é o da pontuação por citação (TC-*, score:fluxo:legacy, adjudicação)
 * e o de todas as campanhas arquivadas, que assim não mudam por construção. Quem prepara pelo
 * scorer vigente passa `KB_ALIASES_VIGENTE` explicitamente (semantic-flow-cli, preparo-cenas,
 * check-reference), e esse é o arquivo que vai para a identidade da análise.
 */
export const KB_ALIASES_LEGADO: KbAliasVocabulary = loadKbAliasVocabulary(ROOT, LEGACY_KB_ALIASES_FILE);
export const KB_ALIASES_VIGENTE: KbAliasVocabulary = loadKbAliasVocabulary(ROOT, FLOW_KB_ALIASES_FILE);

export const groundTruth = gt;
export const cases = gt.cases;

// ── Rule extraction ───────────────────────────────────────────────────────────

/** Normalize a rule id: lowercase, strip spaces ("WCAG 3.3.2" → "wcag:3.3.2"). KB ids pass through. */
export function normalizeRuleId(raw: string): RuleId {
  const t = raw.trim().toLowerCase();
  if (t.startsWith("govbr-")) return t; // KB deterministic id (first-class, Phase 3.1)
  return t.replace(/\s+/g, "").replace(/^(emag|wcag|ds)[.\-]?:?/, "$1:");
}

/**
 * Expand a rule set with the KB alias map (both directions of citation):
 * a KB id contributes its emag:/wcag: aliases, so a finding citing the KB id
 * matches a gabarito unit that lists the alias — and vice versa, because the
 * expansion is applied to expected units AND findings alike.
 */
export function expandWithKbAliases(rules: RuleId[], vocab: KbAliasVocabulary = KB_ALIASES_LEGADO): RuleId[] {
  return expandWith(vocab, rules);
}

/** Parse normative rule ids out of a free-text finding (legacy string format). */
export function parseRulesFromText(text: string): RuleId[] {
  const rules = new Set<RuleId>();
  const t = text.toLowerCase();

  for (const m of t.matchAll(/e-?mag[\s:]*([0-9]+\.[0-9]+)/g)) rules.add(`emag:${m[1]}`);
  if (/wcag/.test(t)) {
    for (const m of t.matchAll(/\b([0-9]+\.[0-9]+\.[0-9]+)\b/g)) rules.add(`wcag:${m[1]}`);
  }
  // KB deterministic ids cited inline (e.g. "govbr-3.7.0-accessibility-button-efd2d9e7c3c6")
  // Sufixo -2/-3: ids literais distintos com o mesmo hash (KB 3.7.0-literal). Nenhum id da KB 3.7.0 o tem.
  for (const m of t.matchAll(/\bgovbr-[0-9]+\.[0-9]+\.[0-9]+-[a-z-]+-[a-f0-9]{12}(?:-\d+)?\b/g)) rules.add(m[0]);

  // DS-specific rule heuristics (pt-BR + en signals)
  const dsContext = /token|paleta|ds gov|do ds|spec do/i.test(text);
  if (dsContext && /(background|border-color|cor de fundo|cor de borda|paleta)/i.test(text)) rules.add("ds:token-color");
  if (/(font-family|fonte|tipograf)/i.test(text) && /(rawline|raleway|token)/i.test(text)) rules.add("ds:token-font");
  if (/(border-radius|raio)/i.test(text) && dsContext) rules.add("ds:token-radius");
  if (/(foco|focus)/i.test(text) && /(suprimido|indicador|outline)/i.test(text)) rules.add("ds:token-focus");
  if (/(ordem)[\s\S]{0,30}(bot(ão|ões|oes)|button)/i.test(text) || /button.order/i.test(text)) rules.add("ds:button-order");
  if (/(apenas a tag|somente a tag|no lugar de <button>|spec do componente|estrutura do componente|component structure)/i.test(text)) rules.add("ds:component-structure");
  if (/(label|r[óo]tulo)[\s\S]{0,20}vis[íi]vel/i.test(text)) rules.add("ds:form-label");

  return [...rules];
}

export function rulesOfFinding(f: AgentFinding, vocab: KbAliasVocabulary = KB_ALIASES_LEGADO): { rules: RuleId[]; description: string; structured: boolean } {
  if (typeof f === "string") {
    return { rules: expandWithKbAliases(parseRulesFromText(f), vocab), description: f, structured: false };
  }
  const declared = normalizeRuleId(f.rule);
  // Also parse the description so aliases in the text still count
  const parsed = parseRulesFromText(f.description);
  return { rules: expandWithKbAliases([...new Set([declared, ...parsed])], vocab), description: f.description, structured: true };
}

// ── Expected units (element × rule) ──────────────────────────────────────────

/**
 * D-37 — a ponte de vocabulário que o D-27 decidiu e não chegou a existir.
 *
 * Cada verificador do oráculo declara a norma que implementa (`grounding.ts`), e o gabarito ancora
 * algumas specs no id do verificador (`ds:token-color`). Sem esta ponte, a alegação que cita a norma
 * que o próprio verificador declara nunca casava, e o braço COM oráculo pagava por seguir o oráculo.
 *
 * Aplicada SÓ ao lado esperado. Uma spec ancorada no id do verificador aceita também a norma dele;
 * uma alegação nunca é alargada — senão `ds:token-radius` alcançaria uma unidade de espaçamento pela
 * regra geral de tokens que as duas verificações compartilham. O mapa é gerado
 * (`npm run checker:aliases`), nunca editado à mão.
 */
interface CheckerAliasFile {
  _meta: unknown;
  checks: { kind: string; matches: string; aliases: string[] }[];
}
const checkerAliases = loadJson<CheckerAliasFile>("checker-aliases.json");
const checkerMatchers = (checkerAliases?.checks ?? []).map(check => ({
  test: new RegExp(`^${check.matches.split("*").map(part => part.replace(/[.+?^${}()|[\]\\-]/g, "\\$&")).join("[a-z0-9-]+")}$`),
  aliases: check.aliases,
}));

export function expandWithCheckerGrounding(rules: RuleId[]): RuleId[] {
  const out = new Set(rules);
  for (const r of rules) {
    for (const m of checkerMatchers) if (m.test.test(r)) for (const alias of m.aliases) out.add(alias);
  }
  return [...out];
}

/** Regras de uma unidade ESPERADA: ponte do verificador (D-37), depois aliases da KB. */
export function expandSpecRules(rules: string[], vocab: KbAliasVocabulary = KB_ALIASES_LEGADO): RuleId[] {
  return expandWithKbAliases(expandWithCheckerGrounding(rules.map(normalizeRuleId)), vocab);
}

export interface ExpectedUnit {
  caseId: string;
  rules: RuleId[];       // any alias counts as a match
  categories: string[];
  description: string;
}

export const expectedUnits: ExpectedUnit[] = [];
for (const [caseId, c] of Object.entries(cases)) {
  for (const v of c.violations) {
    expectedUnits.push({ caseId, rules: expandSpecRules(v.rules), categories: v.categories, description: v.description });
  }
}

/** rule id → categories it appears with in the gabarito (used to attribute FP categories). */
export const ruleCategoryMap = new Map<RuleId, Set<string>>();
for (const u of expectedUnits) {
  for (const r of u.rules) {
    if (!ruleCategoryMap.has(r)) ruleCategoryMap.set(r, new Set());
    for (const cat of u.categories) ruleCategoryMap.get(r)!.add(cat);
  }
}

// ── Unit-level scoring: agent findings vs expected (element × rule) ──────────

export interface UnitOutcome {
  unit: ExpectedUnit;
  matched: boolean;
  ruleVerified: boolean;       // matched on an explicit rule id (vs case-level fallback)
  /** Matched only because a human judged a leftover finding to be this unit (D-21). */
  adjudicated: boolean;
  matchedRule: RuleId | null;
  finding: string | null;
}

export interface FalseFinding {
  /** Stable adjudication key (D-21) — `<caseId>:<8 hex>`. */
  id: string;
  caseId: string;
  description: string;
  rules: RuleId[];
  categories: string[];        // attributed via ruleCategoryMap ("sem-categoria" if unknown)
  onReferenceCase: boolean;
  /** Human verdict, when this finding has been adjudicated. */
  verdict: string | null;
}

export interface UnitScore {
  outcomes: UnitOutcome[];
  /** Findings still charged as false positives (unadjudicated, `falso-positivo`, `indeterminado`). */
  falseFindings: FalseFinding[];
  /** Every leftover finding before adjudication — the floor's FP set (D-19). */
  unmatchedFindings: FalseFinding[];
  /** Adjudicated `lacuna-gabarito`: real violations the gabarito does not yet carry. */
  gaps: FalseFinding[];
  /** Adjudicated `duplicado`: restatements of a finding already matched on the same case. */
  duplicates: FalseFinding[];
  /** Leftovers with no decided record — the reason the numbers are provisional. */
  pending: FalseFinding[];
  TP: number; FN: number; FP: number;
  ruleVerifiedTP: number;
  adjudicatedTP: number;
  /** Floor metrics: every leftover charged as FP, exactly as before adjudication existed. */
  floor: { TP: number; FN: number; FP: number };
}

/**
 * Score one run's findings against the expected units.
 *
 * `adj` is optional: without it the result is the floor — every leftover finding charged as a
 * false positive, which is what the scorer did before D-21 and what it must keep reporting
 * alongside any adjudicated figure. Adjudication never replaces the floor, it accompanies it.
 */
export function scoreUnits(raw: AgentResults | null, adj?: AdjudicationIndex): UnitScore | null {
  if (!raw?.verdicts || raw._empty) return null;

  const outcomes: UnitOutcome[] = [];
  const leftovers: FalseFinding[] = [];

  for (const [caseId, c] of Object.entries(cases)) {
    const verdict = raw.verdicts[caseId];
    const rawFindings = verdict?.detected ? verdict.violations_found : [];
    const findings = rawFindings.map(f => rulesOfFinding(f));
    const used = new Set<number>();
    const units = expectedUnits.filter(u => u.caseId === caseId);

    // Pass 1: rule-verified matches
    for (const unit of units) {
      const idx = findings.findIndex((f, i) => !used.has(i) && f.rules.some(r => unit.rules.includes(r)));
      if (idx >= 0) {
        used.add(idx);
        const rule = findings[idx].rules.find(r => unit.rules.includes(r)) ?? null;
        outcomes.push({ unit, matched: true, ruleVerified: true, adjudicated: false, matchedRule: rule, finding: findings[idx].description });
      }
    }

    // Pass 2: case-level fallback — an unmatched finding with no recognizable rule
    // still counts for an unmatched unit on the same case (rule not verified).
    for (const unit of units) {
      if (outcomes.some(o => o.unit === unit)) continue;
      const idx = findings.findIndex((f, i) => !used.has(i) && f.rules.length === 0);
      if (idx >= 0) {
        used.add(idx);
        outcomes.push({ unit, matched: true, ruleVerified: false, adjudicated: false, matchedRule: null, finding: findings[idx].description });
      } else {
        outcomes.push({ unit, matched: false, ruleVerified: false, adjudicated: false, matchedRule: null, finding: null });
      }
    }

    // Leftover findings: false positives at unit granularity, pending adjudication
    findings.forEach((f, i) => {
      if (used.has(i)) return;
      const cats = new Set<string>();
      for (const r of f.rules) for (const cat of ruleCategoryMap.get(r) ?? []) cats.add(cat);
      leftovers.push({
        id: findingId(caseId, rawFindings[i]),
        caseId,
        description: f.description,
        rules: f.rules,
        categories: cats.size ? [...cats] : ["sem-categoria"],
        onReferenceCase: units.length === 0,
        verdict: null,
      });
    });
  }

  const floor = {
    TP: outcomes.filter(o => o.matched).length,
    FN: outcomes.filter(o => !o.matched).length,
    FP: leftovers.length,
  };

  // Pass 3: adjudication (D-21). Keyed by finding text, so one verdict covers every run the same
  // claim appears in, and re-scoring never re-litigates a decision already made.
  const falseFindings: FalseFinding[] = [];
  const gaps: FalseFinding[] = [];
  const duplicates: FalseFinding[] = [];
  const pending: FalseFinding[] = [];

  for (const lf of leftovers) {
    const record = adj?.byId.get(lf.id);
    const decided = record && record.verdict !== null && record.rationale?.trim() ? record : null;
    lf.verdict = decided?.verdict ?? null;

    if (!decided) { pending.push(lf); falseFindings.push(lf); continue; }

    // Verdict semantics live in adjudication.ts so the two suites cannot drift apart (D-30).
    // A `composto` record applies one effect per component; a simple one applies exactly one,
    // which is why this reproduces pre-D-30 numbers unchanged.
    const applied = applyRecord(decided, (unit, _verdict, finding) => {
      const target = outcomes.find(o => !o.matched && o.unit.caseId === unit.caseId
        && o.unit.rules.includes(normalizeRuleId(unit.rule)));
      if (!target) return false; // unit absent or already matched — reported as a defect
      target.matched = true;
      target.adjudicated = true;
      target.finding = finding;
      return true;
    }, lf.description);

    for (let i = 0; i < applied.gaps; i++) gaps.push(lf);
    for (let i = 0; i < applied.duplicates; i++) duplicates.push(lf);
    if (applied.charged) falseFindings.push(lf);
  }

  return {
    outcomes,
    falseFindings,
    unmatchedFindings: leftovers,
    gaps,
    duplicates,
    pending,
    TP: outcomes.filter(o => o.matched).length,
    FN: outcomes.filter(o => !o.matched).length,
    FP: falseFindings.length,
    ruleVerifiedTP: outcomes.filter(o => o.matched && o.ruleVerified).length,
    adjudicatedTP: outcomes.filter(o => o.matched && o.adjudicated).length,
    floor,
  };
}
