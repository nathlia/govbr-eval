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
import type { ElementRef, Resolution, StateCheckpoint, StateResolutions } from "./anchors";
import type { PredicateResult } from "./acceptance-predicates";
import { elementId, resolveWithExcept } from "./anchors";
import { expandSpecRules, normalizeRuleId, rulesOfFinding } from "./units";
import { normalizeFinding } from "./flow-contract";
import { applyRecord, findingId, type AdjudicationIndex } from "./adjudication";

export interface FlowUnit {
  specId: string;
  /**
   * Participante PRIMÁRIO da unidade: quem lhe dá id e rótulo. Em `unico`/`todos` é o único
   * elemento; em `composicao` é o primeiro participante resolvido (o contêiner, na ordem do DOM).
   */
  element: ElementRef;
  /**
   * Chaves canônicas que podem ancorar o casamento desta unidade. Em `unico`/`todos` contém
   * apenas `element.key` — por isso o comportamento dessas specs não muda. Em `composicao`
   * contém todos os participantes: qualquer um serve de âncora, e o crédito é UM (D-33).
   */
  participants: string[];
  rules: RuleId[];
  categories: string[];
  description: string;
  /** Estado DECLARADO pelo gabarito: `sempre`, ou o id de um estado de `_meta.states`. */
  state: string;
  /**
   * Estados em que o elemento desta unidade de fato resolve, MEDIDOS na página (D-06).
   *
   * Vazio quando a medição não correu — o que mantém as chamadas antigas funcionando sem que a
   * ausência de medida seja lida como "não existe em estado nenhum".
   */
  states: string[];
  /**
   * Resultado do predicado de aceitação da spec, medido na página (fatia 3). Ausente quando a
   * medição não correu; `nao-implementado` quando a spec não declara predicado. Nunca creditar a
   * partir daqui: sustentar prova que o DEFEITO existe, não que a alegação o afirma (D-39).
   */
  acceptance?: PredicateResult;
  conditional: boolean;
}

/** O estado declarado que quer dizer "em todos os estados", e não o id de um estado. */
export const ESTADO_SEMPRE = "sempre";

/** Em que estados cada chave canônica resolve. É a página que responde, nunca o gabarito. */
export interface StatePresence {
  /** Ordem declarada, do primeiro paint ao estado mais avançado. */
  order: string[];
  statesOfKey: Map<string, string[]>;
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
/**
 * Paradas de estado declaradas pelo gabarito, ou `null` quando ele não declara nenhuma.
 *
 * `null` e não um padrão: sem `_meta.states` a resolução volta a ser a de antes, num estado só, e
 * nada de estado é cobrado. Assim um gabarito que ainda não declarou estados não passa a falhar —
 * e, principalmente, a ausência de medida não se disfarça de medida (D-06).
 */
export function statesOfGroundTruth(gt: FlowGroundTruth): StateCheckpoint[] | null {
  const declared = gt._meta.states;
  if (!declared || declared.length === 0) return null;
  return declared.map(s => ({ id: s.id, afterStep: s.afterStep }));
}

export function selectorsOfGroundTruth(gt: FlowGroundTruth): string[] {
  const out: string[] = [];
  for (const v of gt.violations) {
    out.push(v.anchor);
    if (v.except) out.push(v.except);
  }
  return out;
}

/**
 * Mede em que estados cada elemento ancorado existe, e cobra a ADITIVIDADE da sequência de setup.
 *
 * O gabarito afirma, em `_meta.setup_rationale`, que a sequência só faz nascer elementos e nunca
 * destrói os que ele ancora — é essa afirmação que autoriza resolver tudo num estado só. A
 * afirmação era um comentário. Aqui vira medida: se um elemento ancorado num estado deixa de
 * resolver num estado posterior, a premissa é falsa para esta página, as duas metades do gabarito
 * passam a descrever árvores diferentes, e a construção PARA em vez de medir (D-06).
 *
 * O contrário não se cobra: elemento que nasce no meio do caminho é exatamente o que o `setup`
 * existe para alcançar — a mensagem de erro que ancora o V-03b e o V-09.
 */
export function measureStatePresence(res: StateResolutions): { presence: StatePresence; defects: GabaritoDefect[] } {
  const defects: GabaritoDefect[] = [];
  const statesOfKey = new Map<string, string[]>();

  for (const state of res.order) {
    const resolution = res.byState.get(state);
    if (!resolution) {
      defects.push({ specId: "_meta.states", problem: `estado declarado sem resolução: ${state}` });
      continue;
    }
    for (const key of resolution.byKey.keys()) {
      const states = statesOfKey.get(key) ?? [];
      states.push(state);
      statesOfKey.set(key, states);
    }
  }

  for (const [key, states] of statesOfKey) {
    const desde = res.order.indexOf(states[0]);
    const faltando = res.order.slice(desde).filter(e => !states.includes(e));
    if (faltando.length > 0) {
      defects.push({
        specId: "_meta.setup",
        problem: `sequência de setup NÃO é aditiva: ${key} resolve em ${states.join(", ")} e desaparece em ${faltando.join(", ")}`,
      });
    }
  }

  return { presence: { order: res.order, statesOfKey }, defects };
}

/**
 * Confere o estado DECLARADO por uma spec contra o estado MEDIDO dos seus participantes.
 *
 * `state: "sempre"` promete que a unidade é alcançável desde o primeiro paint; `conditional: true`
 * promete o oposto — que ela não existe antes do estado declarado, e por isso nunca é presumida
 * lá. Nenhuma das duas promessas era conferida: o campo era um rótulo que entrava no id da
 * unidade e não era lido por código nenhum.
 */
function stateDefectsOf(
  spec: FlowViolationSpec,
  keys: string[],
  presence: StatePresence,
): GabaritoDefect[] {
  const defects: GabaritoDefect[] = [];
  const declarado = spec.state ?? ESTADO_SEMPRE;
  const conditional = spec.conditional ?? false;

  if (declarado === ESTADO_SEMPRE) {
    if (conditional) {
      defects.push({ specId: spec.id, problem: `conditional: true com state "${ESTADO_SEMPRE}": a unidade não pode ser condicional e existir sempre` });
      return defects;
    }
    for (const key of keys) {
      const states = presence.statesOfKey.get(key) ?? [];
      const faltando = presence.order.filter(e => !states.includes(e));
      if (faltando.length > 0) {
        defects.push({ specId: spec.id, problem: `state "${ESTADO_SEMPRE}", mas ${key} não existe em: ${faltando.join(", ")}` });
      }
    }
    return defects;
  }

  const alvo = presence.order.indexOf(declarado);
  if (alvo < 0) {
    defects.push({ specId: spec.id, problem: `state "${declarado}" não está declarado em _meta.states (${presence.order.join(", ")})` });
    return defects;
  }

  for (const key of keys) {
    const states = presence.statesOfKey.get(key) ?? [];
    if (!states.includes(declarado)) {
      defects.push({ specId: spec.id, problem: `state "${declarado}", mas ${key} não existe nesse estado` });
      continue;
    }
    if (!conditional) continue;
    const antes = presence.order.slice(0, alvo).filter(e => states.includes(e));
    if (antes.length > 0) {
      defects.push({ specId: spec.id, problem: `conditional: true, mas ${key} já existe antes de "${declarado}": ${antes.join(", ")}` });
    }
  }
  return defects;
}

/**
 * Estados em que a unidade INTEIRA é alcançável: a interseção dos estados dos participantes.
 *
 * Em `composicao` isto importa — o defeito é propriedade do conjunto, e o conjunto só existe onde
 * todos os participantes existem. Sem medição devolve vazio: ausência de medida não é ausência de
 * estado.
 */
function statesOf(keys: string[], presence?: StatePresence): string[] {
  if (!presence) return [];
  return presence.order.filter(state => keys.every(k => (presence.statesOfKey.get(k) ?? []).includes(state)));
}

export function buildFlowUnits(gt: FlowGroundTruth, res: Resolution, presence?: StatePresence): FlowUnitsBuild {
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

    // Ponte do verificador (D-37) + aliases da KB, só do lado esperado — o mesmo que a suíte TC-*.
    const rules = expandSpecRules(spec.rules);

    // `composicao` (D-33): o defeito é propriedade do conjunto, então a âncora resolve para os N
    // participantes e a spec vale UMA unidade. É o que separa "quantos elementos participam" de
    // "quanto isso vale" — as duas coisas estavam amarradas porque o número de chaves ERA o
    // número de unidades.
    if (spec.scope === "composicao") {
      if (spec.expectedCount != null && spec.expectedCount !== 1) {
        defects.push({ specId: spec.id, problem: `scope "composicao" vale uma unidade; o gabarito declara expectedCount ${spec.expectedCount}` });
        continue;
      }
      if (spec.participantCount != null && keys.length !== spec.participantCount) {
        defects.push({ specId: spec.id, problem: `gabarito declara ${spec.participantCount} participante(s); a página tem ${keys.length}` });
        continue;
      }
      const primary = res.byKey.get(keys[0]);
      if (!primary) {
        defects.push({ specId: spec.id, problem: `elemento resolvido sem referência: ${keys[0]}` });
        continue;
      }
      if (presence) {
        const doEstado = stateDefectsOf(spec, keys, presence);
        if (doEstado.length > 0) { defects.push(...doEstado); continue; }
      }
      units.push({
        specId: spec.id,
        element: primary,
        participants: [...keys],
        rules,
        categories: spec.categories,
        description: spec.description,
        state: spec.state ?? ESTADO_SEMPRE,
        states: statesOf(keys, presence),
        conditional: spec.conditional ?? false,
      });
      continue;
    }

    if (spec.participantCount != null) {
      defects.push({ specId: spec.id, problem: `participantCount só existe em scope "composicao"; spec é "${spec.scope}"` });
      continue;
    }
    if (spec.expectedCount != null && keys.length !== spec.expectedCount) {
      defects.push({ specId: spec.id, problem: `gabarito declara ${spec.expectedCount} instância(s); a página tem ${keys.length}` });
      continue;
    }

    if (presence) {
      const doEstado = stateDefectsOf(spec, keys, presence);
      if (doEstado.length > 0) { defects.push(...doEstado); continue; }
    }

    for (const key of keys) {
      const element = res.byKey.get(key);
      if (!element) {
        defects.push({ specId: spec.id, problem: `elemento resolvido sem referência: ${key}` });
        continue;
      }
      units.push({
        specId: spec.id,
        element,
        participants: [element.key],
        rules,
        categories: spec.categories,
        description: spec.description,
        state: spec.state ?? ESTADO_SEMPRE,
        states: statesOf([element.key], presence),
        conditional: spec.conditional ?? false,
      });
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
  adjudicationVerdict: "vocabulario" | "deteccao-correta" | null;
  matchedRule: RuleId | null;
  finding: string | null;
  /** Whether the unit was the finding's primary subject or an explicit relational participant. */
  anchorMode: "exact" | "related" | "adjudicated" | null;
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
  /** Irmãos de uma unidade de composição já casada: nem crédito nem cobrança (D-33). */
  absorbed: FlowLeftover[];
  TP: number; FN: number; FP: number;
  ruleVerifiedTP: number;
  adjudicatedTP: number;
  /** Sem adjudicação: toda sobra cobrada como falso positivo. Nunca é substituído (D-21). */
  floor: { TP: number; FN: number; FP: number };
  /** Achados cujo seletor não resolve — cobrados, mas separados para leitura. */
  unresolvedCount: number;
}

export interface FlowFamilySummary {
  detected: number;
  complete: number;
  total: number;
}

/** Cluster-aware companion to element-level scoring: each V-spec has weight one. */
export function summarizeFlowFamilies(outcomes: FlowOutcome[]): FlowFamilySummary {
  const bySpec = new Map<string, { hit: number; total: number }>();
  for (const outcome of outcomes) {
    const item = bySpec.get(outcome.unit.specId) ?? { hit: 0, total: 0 };
    item.total++;
    if (outcome.matched) item.hit++;
    bySpec.set(outcome.unit.specId, item);
  }
  return {
    detected: [...bySpec.values()].filter(item => item.hit > 0).length,
    complete: [...bySpec.values()].filter(item => item.hit === item.total).length,
    total: bySpec.size,
  };
}

/** Um achado já resolvido: uma afirmação por elemento que o seletor alcança. */
interface Candidate {
  key: string | null;          // null = seletor não resolvido
  elementId: string;
  elementLabel: string;
  selector: string;
  relatedKeys: Set<string>;
  rules: RuleId[];
  description: string;
  used: boolean;
}

function candidatesOf(findings: FlowFinding[], res: Resolution): Candidate[] {
  const out: Candidate[] = [];
  for (const raw of findings) {
    // O casamento legado lê regra e texto. Um achado do contrato novo chega normalizado (observado e
    // esperado no texto, regra incerta como vazia); o legado passa idêntico, e os números não mudam.
    const f = normalizeFinding(raw);
    const { rules, description } = rulesOfFinding({ rule: f.rule ?? "", description: f.description });
    const resolved = res.bySelector.get(f.selector);
    const keys = resolved?.ok ? resolved.keys : [];
    const relatedKeys = new Set(
      (f.relatedSelectors ?? []).flatMap(selector => {
        const relation = res.bySelector.get(selector);
        return relation?.ok ? relation.keys : [];
      }),
    );

    if (keys.length === 0) {
      out.push({
        key: null,
        elementId: elementId(`nao-resolvido:${f.selector}`),
        elementLabel: resolved?.ok
          ? "(seletor sem correspondência na página)"
          : `(seletor inválido: ${resolved?.error ?? "?"})`,
        selector: f.selector, relatedKeys, rules, description, used: false,
      });
      continue;
    }
    // Um seletor que alcança k elementos são k afirmações da mesma regra. É o que permite
    // reportar a violação compartilhada de uma vez — e o que faz um seletor largo demais
    // pagar em precisão, elemento por elemento.
    for (const key of keys) {
      const el = res.byKey.get(key)!;
      out.push({ key, elementId: el.id, elementLabel: el.label, selector: f.selector, relatedKeys, rules, description, used: false });
    }
  }
  return out;
}

/** Um achado ancora numa unidade quando cai sobre QUALQUER participante dela (D-33). */
function onUnit(c: Candidate, unit: FlowUnit): boolean {
  return c.key !== null && unit.participants.includes(c.key);
}

/** O mesmo, pela via relacional que o D-29 abriu do lado do achado. */
function relatedToUnit(c: Candidate, unit: FlowUnit): boolean {
  return unit.participants.some(key => c.relatedKeys.has(key));
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
    const c = candidates.find(c => !c.used && onUnit(c, unit) && c.rules.some(r => unit.rules.includes(r)));
    if (c) {
      c.used = true;
      outcomes.push({
        unit, matched: true, ruleVerified: true, adjudicated: false,
        adjudicationVerdict: null,
        matchedRule: c.rules.find(r => unit.rules.includes(r)) ?? null, finding: c.description,
        anchorMode: "exact",
      });
    }
  }

  // Passo 1b — mesma regra, participante relacional declarado explicitamente pelo agente.
  // `relatedSelectors` não cria candidatos nem multiplica crédito: apenas permite que uma
  // afirmação sobre a relação alcance a unidade ancorada em outro participante observado.
  for (const unit of units) {
    if (outcomes.some(o => o.unit === unit)) continue;
    const c = candidates.find(c => !c.used && relatedToUnit(c, unit)
      && c.rules.some(r => unit.rules.includes(r)));
    if (c) {
      c.used = true;
      outcomes.push({
        unit, matched: true, ruleVerified: true, adjudicated: false,
        adjudicationVerdict: null,
        matchedRule: c.rules.find(r => unit.rules.includes(r)) ?? null,
        finding: c.description, anchorMode: "related",
      });
    }
  }

  // Passo 2 — fallback por elemento: achado sobre o elemento certo, sem norma reconhecível.
  for (const unit of units) {
    if (outcomes.some(o => o.unit === unit)) continue;
    const c = candidates.find(c => !c.used && onUnit(c, unit) && c.rules.length === 0);
    if (c) {
      c.used = true;
      outcomes.push({ unit, matched: true, ruleVerified: false, adjudicated: false, adjudicationVerdict: null, matchedRule: null, finding: c.description, anchorMode: "exact" });
    } else {
      const related = candidates.find(c => !c.used && relatedToUnit(c, unit) && c.rules.length === 0);
      if (related) {
        related.used = true;
        outcomes.push({ unit, matched: true, ruleVerified: false, adjudicated: false, adjudicationVerdict: null, matchedRule: null, finding: related.description, anchorMode: "related" });
      } else {
        outcomes.push({ unit, matched: false, ruleVerified: false, adjudicated: false, adjudicationVerdict: null, matchedRule: null, finding: null, anchorMode: null });
      }
    }
  }

  // Passo 2b — absorção de irmãos numa unidade de composição (D-33).
  // Casada a unidade, uma segunda alegação sobre OUTRO participante do mesmo defeito, citando a
  // mesma norma, é a mesma alegação dita de novo: não credita (o conserto é um só) e não é cobrada
  // (a leitura está certa). Cobrá-la puniria enumerar; creditá-la premiaria prolixidade, que é o
  // que o D-30 recusou ao fixar cobrança por alegação. Fica CONTADA e visível, nunca silenciosa.
  const absorbedCandidates: Candidate[] = [];
  for (const outcome of outcomes) {
    if (!outcome.matched || outcome.unit.participants.length < 2) continue;
    for (const c of candidates) {
      if (c.used || !onUnit(c, outcome.unit)) continue;
      if (!c.rules.some(r => outcome.unit.rules.includes(r))) continue;
      c.used = true;
      absorbedCandidates.push(c);
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

  const asLeftover = (c: Candidate): FlowLeftover => {
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
  };

  const leftovers: FlowLeftover[] = candidates.filter(c => !c.used).map(asLeftover);
  const absorbed: FlowLeftover[] = absorbedCandidates.map(asLeftover);

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

    // Mesma semântica da suíte TC-*, do mesmo módulo, de propósito (D-30).
    const applied = applyRecord(decided, (unit, verdict, finding) => {
      // `unit.caseId` carrega o id do elemento (E-xxxxxx) nesta suíte.
      const target = outcomes.find(o => !o.matched && o.unit.element.id === unit.caseId
        && o.unit.rules.includes(normalizeRuleId(unit.rule)));
      if (!target) return false;
      target.matched = true;
      target.adjudicated = true;
      target.adjudicationVerdict = verdict;
      target.finding = finding;
      target.anchorMode = "adjudicated";
      return true;
    }, lf.description);

    for (let i = 0; i < applied.gaps; i++) gaps.push(lf);
    for (let i = 0; i < applied.duplicates; i++) duplicates.push(lf);
    if (applied.charged) falseFindings.push(lf);
  }

  return {
    outcomes, leftovers, falseFindings, gaps, duplicates, pending, absorbed,
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
  return runs.flatMap(r => (r.findings ?? []).flatMap(raw => {
    const f = normalizeFinding(raw);
    return [f.selector, ...f.relatedSelectors].filter(Boolean);
  }));
}

export type { FlowViolationSpec };
