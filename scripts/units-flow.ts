/**
 * Casamento no nível de elemento para a suíte de fluxo (D-23).
 *
 * A unidade de avaliação é (elemento × regra), onde o elemento é a CHAVE CANÔNICA devolvida por
 * `anchors.ts` — não o id de uma seção. Uma spec do gabarito com `scope: "todos"` vira uma unidade
 * por elemento resolvido: é assim que "todos os botões da tela têm o raio errado" pede do agente
 * a ENUMERAÇÃO das instâncias, que é exatamente o que o raciocínio relacional não produz (ele
 * conclui "consistente, portanto conforme").
 *
 * A extração de regras é importada de `units.ts` de propósito. Duas implementações da pergunta
 * "que norma este achado cita?" divergiriam, e o log já registra sete ocorrências do mesmo defeito
 * estrutural: uma dimensão que uma parte do código conhece e a outra não.
 */

import type {
  FlowAgentResults, FlowFinding, FlowGroundTruth, FlowViolationSpec, RuleId,
} from "../types";
import type { ElementRef, Resolution } from "./anchors";
import { elementId, resolveWithExcept } from "./anchors";
import { expandWithKbAliases, normalizeRuleId, rulesOfFinding } from "./units";
import { findingId, type AdjudicationIndex } from "./adjudication";

export interface FlowUnit {
  specId: string;
  element: ElementRef;
  rules: RuleId[];
  categories: string[];
  description: string;
}

/** Todo seletor do gabarito que a página desmente. Enquanto houver um, não se mede nada. */
export interface GabaritoDefect {
  specId: string;
  problem: string;
}

export interface FlowUnitsBuild {
  units: FlowUnit[];
  defects: GabaritoDefect[];
}

/** Seletores que precisam ser resolvidos: âncoras do gabarito e seus `except`. */
export function selectorsOfGroundTruth(gt: FlowGroundTruth): string[] {
  const out: string[] = [];
  for (const v of gt.violations) {
    out.push(v.anchor);
    if (v.except) out.push(v.except);
  }
  return out;
}

export function buildFlowUnits(gt: FlowGroundTruth, res: Resolution): FlowUnitsBuild {
  const units: FlowUnit[] = [];
  const defects: GabaritoDefect[] = [];

  for (const spec of gt.violations) {
    const resolved = res.bySelector.get(spec.anchor);
    if (!resolved?.ok) {
      defects.push({ specId: spec.id, problem: `âncora inválida (${resolved?.error ?? "não resolvida"}): ${spec.anchor}` });
      continue;
    }
    const keys = resolveWithExcept(res, spec.anchor, spec.except);
    if (keys.length === 0) {
      defects.push({ specId: spec.id, problem: `âncora não casa com nenhum elemento da página: ${spec.anchor}` });
      continue;
    }
    if (spec.scope === "unico" && keys.length !== 1) {
      defects.push({ specId: spec.id, problem: `scope "unico", mas a âncora resolve para ${keys.length} elementos` });
      continue;
    }
    if (spec.expectedCount != null && keys.length !== spec.expectedCount) {
      defects.push({ specId: spec.id, problem: `gabarito declara ${spec.expectedCount} instância(s); a página tem ${keys.length}` });
      continue;
    }

    const rules = expandWithKbAliases(spec.rules.map(normalizeRuleId));
    for (const key of keys) {
      const element = res.byKey.get(key);
      if (!element) {
        defects.push({ specId: spec.id, problem: `elemento resolvido sem referência: ${key}` });
        continue;
      }
      units.push({ specId: spec.id, element, rules, categories: spec.categories, description: spec.description });
    }
  }

  return { units, defects };
}

// ── Pontuação ────────────────────────────────────────────────────────────────

export interface FlowOutcome {
  unit: FlowUnit;
  matched: boolean;
  /** Casou por citação explícita de regra (vs. fallback por elemento). */
  ruleVerified: boolean;
  adjudicated: boolean;
  matchedRule: RuleId | null;
  finding: string | null;
}

export interface FlowLeftover {
  id: string;
  elementId: string;
  elementLabel: string;
  selector: string;
  /** true quando o seletor do agente não alcança elemento nenhum da página. */
  unresolved: boolean;
  description: string;
  rules: RuleId[];
  categories: string[];
  verdict: string | null;
}

export interface FlowScore {
  outcomes: FlowOutcome[];
  leftovers: FlowLeftover[];
  falseFindings: FlowLeftover[];
  gaps: FlowLeftover[];
  duplicates: FlowLeftover[];
  pending: FlowLeftover[];
  TP: number; FN: number; FP: number;
  ruleVerifiedTP: number;
  adjudicatedTP: number;
  /** Sem adjudicação: toda sobra cobrada como falso positivo. Nunca é substituído (D-21). */
  floor: { TP: number; FN: number; FP: number };
  /** Achados cujo seletor não resolve — cobrados, mas separados para leitura. */
  unresolvedCount: number;
}

/** Um achado já resolvido: uma afirmação por elemento que o seletor alcança. */
interface Candidate {
  key: string | null;          // null = seletor não resolvido
  elementId: string;
  elementLabel: string;
  selector: string;
  rules: RuleId[];
  description: string;
  used: boolean;
}

function candidatesOf(findings: FlowFinding[], res: Resolution): Candidate[] {
  const out: Candidate[] = [];
  for (const f of findings) {
    const { rules, description } = rulesOfFinding({ rule: f.rule, description: f.description });
    const resolved = res.bySelector.get(f.selector);
    const keys = resolved?.ok ? resolved.keys : [];

    if (keys.length === 0) {
      out.push({
        key: null,
        elementId: elementId(`nao-resolvido:${f.selector}`),
        elementLabel: resolved?.ok
          ? "(seletor sem correspondência na página)"
          : `(seletor inválido: ${resolved?.error ?? "?"})`,
        selector: f.selector, rules, description, used: false,
      });
      continue;
    }
    // Um seletor que alcança k elementos são k afirmações da mesma regra. É o que permite
    // reportar a violação compartilhada de uma vez — e o que faz um seletor largo demais
    // pagar em precisão, elemento por elemento.
    for (const key of keys) {
      const el = res.byKey.get(key)!;
      out.push({ key, elementId: el.id, elementLabel: el.label, selector: f.selector, rules, description, used: false });
    }
  }
  return out;
}

export function scoreFlow(
  run: FlowAgentResults,
  units: FlowUnit[],
  res: Resolution,
  adj?: AdjudicationIndex,
): FlowScore {
  const candidates = candidatesOf(run.findings ?? [], res);
  const outcomes: FlowOutcome[] = [];

  // Passo 1 — casamento verificado por regra, no mesmo elemento.
  for (const unit of units) {
    const c = candidates.find(c => !c.used && c.key === unit.element.key && c.rules.some(r => unit.rules.includes(r)));
    if (c) {
      c.used = true;
      outcomes.push({
        unit, matched: true, ruleVerified: true, adjudicated: false,
        matchedRule: c.rules.find(r => unit.rules.includes(r)) ?? null, finding: c.description,
      });
    }
  }

  // Passo 2 — fallback por elemento: achado sobre o elemento certo, sem norma reconhecível.
  for (const unit of units) {
    if (outcomes.some(o => o.unit === unit)) continue;
    const c = candidates.find(c => !c.used && c.key === unit.element.key && c.rules.length === 0);
    if (c) {
      c.used = true;
      outcomes.push({ unit, matched: true, ruleVerified: false, adjudicated: false, matchedRule: null, finding: c.description });
    } else {
      outcomes.push({ unit, matched: false, ruleVerified: false, adjudicated: false, matchedRule: null, finding: null });
    }
  }

  // Categorias atribuídas às sobras, a partir do próprio gabarito de fluxo.
  const ruleCategories = new Map<RuleId, Set<string>>();
  for (const u of units) {
    for (const r of u.rules) {
      if (!ruleCategories.has(r)) ruleCategories.set(r, new Set());
      for (const cat of u.categories) ruleCategories.get(r)!.add(cat);
    }
  }

  const leftovers: FlowLeftover[] = candidates.filter(c => !c.used).map(c => {
    const cats = new Set<string>();
    for (const r of c.rules) for (const cat of ruleCategories.get(r) ?? []) cats.add(cat);
    return {
      id: findingId(c.elementId, { rule: c.rules[0] ?? "?", description: c.description }),
      elementId: c.elementId,
      elementLabel: c.elementLabel,
      selector: c.selector,
      unresolved: c.key === null,
      description: c.description,
      rules: c.rules,
      categories: cats.size ? [...cats] : ["sem-categoria"],
      verdict: null,
    };
  });

  const floor = {
    TP: outcomes.filter(o => o.matched).length,
    FN: outcomes.filter(o => !o.matched).length,
    FP: leftovers.length,
  };

  // Passo 3 — adjudicação (D-21), com a mesma semântica de veredito da suíte TC-*.
  const falseFindings: FlowLeftover[] = [];
  const gaps: FlowLeftover[] = [];
  const duplicates: FlowLeftover[] = [];
  const pending: FlowLeftover[] = [];

  for (const lf of leftovers) {
    const record = adj?.byId.get(lf.id);
    const decided = record && record.verdict !== null && record.rationale?.trim() ? record : null;
    lf.verdict = decided?.verdict ?? null;
    if (!decided) { pending.push(lf); falseFindings.push(lf); continue; }

    switch (decided.verdict) {
      case "vocabulario": {
        // `unit.caseId` carrega o id do elemento (E-xxxxxx) nesta suíte.
        const target = decided.unit
          ? outcomes.find(o => !o.matched && o.unit.element.id === decided.unit!.caseId
              && o.unit.rules.includes(normalizeRuleId(decided.unit!.rule)))
          : undefined;
        if (target) { target.matched = true; target.adjudicated = true; target.finding = lf.description; }
        else falseFindings.push(lf);
        break;
      }
      case "lacuna-gabarito": gaps.push(lf); break;
      case "duplicado":       duplicates.push(lf); break;
      default:                falseFindings.push(lf); break;
    }
  }

  return {
    outcomes, leftovers, falseFindings, gaps, duplicates, pending,
    TP: outcomes.filter(o => o.matched).length,
    FN: outcomes.filter(o => !o.matched).length,
    FP: falseFindings.length,
    ruleVerifiedTP: outcomes.filter(o => o.matched && o.ruleVerified).length,
    adjudicatedTP: outcomes.filter(o => o.matched && o.adjudicated).length,
    floor,
    unresolvedCount: leftovers.filter(l => l.unresolved).length,
  };
}

/** Seletores citados pelos achados de um conjunto de execuções. */
export function selectorsOfRuns(runs: FlowAgentResults[]): string[] {
  return runs.flatMap(r => (r.findings ?? []).map(f => f.selector));
}

export type { FlowViolationSpec };
