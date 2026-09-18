/**
 * Predicados de aceitação (fatia 3): a condição MECÂNICA sob a qual o defeito de uma spec existe.
 *
 * O problema que este módulo resolve. O gabarito da tela de fluxo foi redigido pelo assistente, e a
 * regra de independência (`docs/adjudicacao.md § Quem pode julgar`) desqualifica quem escreveu a
 * tela ou o gabarito de julgar sobre eles. Até aqui o gabarito era inteiramente autoria: dizia
 * "padding de 13px, fora da escala do DS" e ninguém conferia contra a página. Um predicado
 * declarado torna essa afirmação REEXECUTÁVEL — a preparação mede na página congelada, no estado
 * declarado, e a construção para se o que o gabarito afirma não estiver lá.
 *
 * O que um predicado NÃO faz, e não pode fazer:
 *
 * 1. **Não credita.** Sustentar um predicado prova que o DEFEITO existe na página; não prova que a
 *    alegação do agente afirma esse defeito. "Verificar que o defeito existe na página é
 *    insuficiente: o agente tem de alegar aquele defeito." A ponte entre o texto da alegação e o
 *    defeito é decisão semântica da autora (D-39), e continua sendo.
 * 2. **Não é o oráculo.** Nada aqui importa do `govbr-ds-validator`, nem lê a KB. São checagens
 *    pequenas e legíveis sobre estilo computado e atributos, com o valor esperado DECLARADO no
 *    gabarito. Reaproveitar os verificadores do oráculo faria o avaliador confirmar o avaliado —
 *    e o D-41 já registra que nenhum script do `govbr-eval` usa o `confirmed` do oráculo como
 *    verdade independente.
 * 3. **Não vira fallback.** Spec sem predicado fica `nao-implementado` e segue para a fila da
 *    revisora exatamente como antes. Ausência de predicado nunca é lida como aceitação, e
 *    `nao-implementado` jamais se converte em "casou por elemento, logo está certo".
 *
 * Sobre `allowed` e `forbidden`. `allowed` enuncia a NORMA (a escala de espaçamento do DS, por
 * exemplo) e é a forma preferida: o predicado sustenta quando o valor medido cai fora dela.
 * `forbidden` nomeia o valor autoral que o gabarito acusa, e existe porque o registro completo de
 * tokens do DS mora no oráculo — trazê-lo para cá seria reconstruir o avaliado dentro do avaliador.
 * Todo `forbidden` carrega `note` dizendo de onde o valor veio. Nos dois casos, consertar a tela faz
 * o predicado deixar de sustentar e a construção parar: o gabarito não sobrevive em silêncio à
 * correção do defeito que ele cataloga (D-06).
 */

import type { Page } from "playwright";
import type { FlowAcceptancePredicate } from "../types";
import { IN_PAGE_PRELUDE } from "./anchors";

/**
 * `sustenta`       — a condição declarada foi medida na página, elemento a elemento.
 * `refuta`         — a página desmente a spec: o defeito catalogado não está lá.
 * `nao-implementado` — a spec não declara predicado, ou declara uma espécie que este módulo não
 *                      implementa. Não é aceitação nem recusa: é ausência de máquina.
 * `nao-replicavel` — a medida não pôde ser feita (elemento sumiu, propriedade inexistente), ou
 *                    discordou de si mesma entre os estados em que a unidade existe.
 */
export type PredicateOutcome = "sustenta" | "refuta" | "nao-implementado" | "nao-replicavel";

/** Espécies implementadas. Uma espécie fora desta lista é `nao-implementado`, nunca um erro. */
export const PREDICATE_KINDS = [
  "estilo-computado",
  "atributos-ausentes",
  "classe-no-elemento",
  "cor-de-borda-pintada",
] as const;
export type PredicateKind = (typeof PREDICATE_KINDS)[number];

/** A forma vive em `types.ts`, junto da spec que a declara. */
export type AcceptancePredicate = FlowAcceptancePredicate;

export interface PredicateMeasurement {
  key: string;
  values: Record<string, string | null>;
  sustains: boolean;
  reason: string;
}

export interface PredicateResult {
  kind: string | null;
  outcome: PredicateOutcome;
  /** O que a spec afirma, em texto, para o cartão da revisora. */
  expected: string;
  /** Estado em que a medida foi feita. Uma unidade `sempre` é medida em todos e tem de concordar. */
  states: string[];
  measured: PredicateMeasurement[];
  reason: string;
}

export const NAO_IMPLEMENTADO: PredicateResult = {
  kind: null, outcome: "nao-implementado", expected: "", states: [], measured: [],
  reason: "a spec não declara predicado de aceitação: nada foi medido, e nada se conclui",
};

/** Texto curto do que o predicado exige — é o que a revisora lê antes de decidir. */
export function describePredicate(p: AcceptancePredicate): string {
  const alvo = p.quantifier === "todas" ? "todas as propriedades" : "alguma propriedade";
  switch (p.kind) {
    case "estilo-computado":
      return p.allowed
        ? `${alvo} de [${p.properties?.join(", ")}] fora de {${p.allowed.join(", ")}}`
        : `${alvo} de [${p.properties?.join(", ")}] em {${p.forbidden?.join(", ")}}`;
    case "atributos-ausentes":
      return `nenhum destes atributos presente: ${p.attributes?.join(", ")}`;
    case "classe-no-elemento":
      return `o próprio <${p.tag}> carrega a classe .${p.classe}`;
    case "cor-de-borda-pintada":
      return `alguma borda PINTADA (largura > 0) na cor {${p.forbidden?.join(", ")}}`;
    default:
      return `espécie não implementada: ${p.kind}`;
  }
}

/**
 * Executado DENTRO da página, como texto — o mesmo motivo de `anchors.ts`: sob `tsx` o esbuild
 * reescreve função nomeada para chamar `__name`, que não existe no navegador.
 *
 * Reaproveita `IN_PAGE_PRELUDE` para que a chave canônica de um elemento seja a MESMA que a
 * resolução produz. Sem isso o predicado mediria um elemento e a unidade falaria de outro.
 */
const MEASURE_IN_PAGE = `(request) => {
${IN_PAGE_PRELUDE}
  const norm = (s) => String(s == null ? "" : s).trim().replace(/\\s+/g, " ");
  const wanted = new Set(request.keys);
  const out = [];

  for (const el of queryAll(request.selector)) {
    const key = keyOf(el);
    if (!wanted.has(key)) continue;
    const cs = getComputedStyle(el);
    const values = {};
    const p = request.predicate;

    if (p.kind === "estilo-computado") {
      for (const prop of (p.properties || [])) values[prop] = norm(cs.getPropertyValue(prop));
    } else if (p.kind === "atributos-ausentes") {
      for (const attr of (p.attributes || [])) values[attr] = el.getAttribute(attr);
    } else if (p.kind === "classe-no-elemento") {
      values["tag"] = el.tagName.toLowerCase();
      values["class"] = norm(el.className && el.className.toString ? el.className.toString() : "");
    } else if (p.kind === "cor-de-borda-pintada") {
      // Lado com largura 0 não é pintado: comparar só a cor leria como "cor fora do token" um lado
      // que não aparece na tela. Cor e largura andam juntas, e as duas ficam registradas.
      for (const side of ["top", "right", "bottom", "left"]) {
        values["border-" + side + "-color"] = norm(cs.getPropertyValue("border-" + side + "-color"));
        values["border-" + side + "-width"] = norm(cs.getPropertyValue("border-" + side + "-width"));
      }
    }
    out.push({ key: key, values: values });
  }
  return out;
}`;

interface RawMeasurement { key: string; values: Record<string, string | null> }

/** Decide, fora da página, se cada elemento medido sustenta a condição. A regra fica LEGÍVEL aqui. */
function judge(p: AcceptancePredicate, m: RawMeasurement): { sustains: boolean; reason: string } {
  const quantifier = p.quantifier ?? "alguma";

  if (p.kind === "estilo-computado") {
    const props = p.properties ?? [];
    const fora = props.filter(prop => {
      const v = m.values[prop] ?? "";
      return p.allowed ? !p.allowed.includes(v) : (p.forbidden ?? []).includes(v);
    });
    const sustains = quantifier === "todas" ? fora.length === props.length && props.length > 0 : fora.length > 0;
    return { sustains, reason: sustains
      ? `${fora.map(f => `${f}=${m.values[f]}`).join(", ")}`
      : `nenhuma propriedade fora do declarado (${props.map(f => `${f}=${m.values[f]}`).join(", ")})` };
  }

  if (p.kind === "atributos-ausentes") {
    const attrs = p.attributes ?? [];
    const presentes = attrs.filter(a => m.values[a] != null);
    return { sustains: presentes.length === 0, reason: presentes.length === 0
      ? `ausentes: ${attrs.join(", ")}`
      : `presente(s): ${presentes.map(a => `${a}="${m.values[a]}"`).join(", ")}` };
  }

  if (p.kind === "classe-no-elemento") {
    const classes = (m.values["class"] ?? "").split(" ").filter(Boolean);
    const temClasse = classes.includes(p.classe ?? "");
    const temTag = (m.values["tag"] ?? "") === (p.tag ?? "");
    return { sustains: temClasse && temTag, reason: temClasse && temTag
      ? `<${m.values["tag"]} class="${m.values["class"]}">`
      : `esperado <${p.tag}> com .${p.classe}; medido <${m.values["tag"]} class="${m.values["class"]}">` };
  }

  if (p.kind === "cor-de-borda-pintada") {
    const pintadas = ["top", "right", "bottom", "left"].filter(side => {
      const largura = m.values[`border-${side}-width`] ?? "0px";
      return largura !== "0px" && (p.forbidden ?? []).includes(m.values[`border-${side}-color`] ?? "");
    });
    return { sustains: pintadas.length > 0, reason: pintadas.length > 0
      ? `${pintadas.map(s => `${s}: ${m.values[`border-${s}-color`]} em ${m.values[`border-${s}-width`]}`).join("; ")}`
      : "nenhuma borda pintada na cor declarada" };
  }

  return { sustains: false, reason: `espécie não implementada: ${p.kind}` };
}

/** Uma spec declara predicado válido? Validação de FORMA, antes de qualquer página. */
export function validatePredicate(p: AcceptancePredicate): string | null {
  if (!PREDICATE_KINDS.includes(p.kind as PredicateKind)) return null; // nao-implementado, não erro
  if (p.allowed && p.forbidden) return "declare `allowed` OU `forbidden`, nunca os dois";
  if (p.forbidden && !p.note) return "`forbidden` nomeia valor autoral e exige `note` dizendo de onde veio";
  if (p.kind === "estilo-computado") {
    if (!p.properties?.length) return "estilo-computado exige `properties`";
    if (!p.allowed?.length && !p.forbidden?.length) return "estilo-computado exige `allowed` ou `forbidden`";
  }
  if (p.kind === "atributos-ausentes" && !p.attributes?.length) return "atributos-ausentes exige `attributes`";
  if (p.kind === "classe-no-elemento" && (!p.classe || !p.tag)) return "classe-no-elemento exige `classe` e `tag`";
  if (p.kind === "cor-de-borda-pintada" && !p.forbidden?.length) return "cor-de-borda-pintada exige `forbidden`";
  return null;
}

/**
 * Mede o predicado de uma spec, numa página já no estado desejado.
 *
 * `keys` são as chaves canônicas dos participantes da unidade: mede-se exatamente os elementos que
 * a unidade cobre, e não tudo que o seletor alcança.
 */
export async function measurePredicate(
  page: Page,
  selector: string,
  keys: string[],
  predicate: AcceptancePredicate | undefined,
  state: string,
): Promise<PredicateResult> {
  if (!predicate) return NAO_IMPLEMENTADO;
  const invalido = validatePredicate(predicate);
  if (invalido) {
    return { kind: predicate.kind, outcome: "nao-replicavel", expected: describePredicate(predicate),
      states: [state], measured: [], reason: `predicado mal declarado: ${invalido}` };
  }
  if (!PREDICATE_KINDS.includes(predicate.kind as PredicateKind)) {
    return { ...NAO_IMPLEMENTADO, kind: predicate.kind, expected: describePredicate(predicate),
      reason: `espécie não implementada neste avaliador: ${predicate.kind}` };
  }

  const raw = (await page.evaluate(
    `(${MEASURE_IN_PAGE})(${JSON.stringify({ selector, keys, predicate })})`,
  )) as RawMeasurement[];

  const measured: PredicateMeasurement[] = raw.map(m => {
    const { sustains, reason } = judge(predicate, m);
    return { key: m.key, values: m.values, sustains, reason };
  });

  const faltando = keys.filter(k => !measured.some(m => m.key === k));
  if (faltando.length > 0) {
    return { kind: predicate.kind, outcome: "nao-replicavel", expected: describePredicate(predicate), states: [state],
      measured, reason: `participante(s) não alcançado(s) pela medida em "${state}": ${faltando.join(", ")}` };
  }

  const sustentam = measured.filter(m => m.sustains);
  const outcome: PredicateOutcome = sustentam.length === measured.length && measured.length > 0 ? "sustenta" : "refuta";
  return {
    kind: predicate.kind, outcome, expected: describePredicate(predicate), states: [state], measured,
    reason: outcome === "sustenta"
      ? `${measured.length} participante(s) medidos em "${state}": ${measured.map(m => m.reason).join(" | ")}`
      : `a página desmente a spec em ${measured.length - sustentam.length} de ${measured.length} participante(s): ` +
        measured.filter(m => !m.sustains).map(m => `${m.key} — ${m.reason}`).join(" | "),
  };
}

/**
 * Junta as medidas de uma mesma unidade feitas em estados diferentes.
 *
 * Uma unidade `sempre` é medida em todo estado em que existe, e as medidas têm de CONCORDAR. Se um
 * defeito some no meio do caminho, o gabarito está descrevendo um estado e cobrando outro — e isso
 * é `nao-replicavel`, não um detalhe de medição.
 */
export function combinePredicate(results: PredicateResult[]): PredicateResult {
  if (results.length === 0) return NAO_IMPLEMENTADO;
  if (results.length === 1) return results[0];
  const base = results[0];
  const states = results.flatMap(r => r.states);
  const outcomes = [...new Set(results.map(r => r.outcome))];
  if (outcomes.length === 1) {
    return { ...base, states, measured: results.flatMap(r => r.measured),
      reason: `mesmo desfecho (${outcomes[0]}) em ${states.join(", ")}: ${base.reason}` };
  }
  return {
    kind: base.kind, outcome: "nao-replicavel", expected: base.expected, states,
    measured: results.flatMap(r => r.measured),
    reason: `a medida discorda entre estados — ${results.map(r => `${r.states.join("/")}: ${r.outcome}`).join(", ")}`,
  };
}
