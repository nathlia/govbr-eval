/**
 * Predicados de violação do portão (v02, fatia 4).
 *
 * Um predicado é a única coisa que pode fazer `verify_finding` responder `confirmed`: ele recalcula,
 * na página reaberta e em CADA elemento alegado, a mesma decisão que o verificador determinístico
 * tomaria. Localizar o elemento não basta. E uma regra ampla (WCAG, e-MAG, KB) não seleciona
 * predicado nenhum: a mesma regra cobre defeitos diferentes, e o oráculo não sabe qual deles o texto
 * da alegação afirma.
 *
 * Limites declarados:
 * - só propriedades computadas de token e a tag raiz de componente; relações entre elementos, foco,
 *   ordem, texto, nome acessível e comportamento dinâmico não têm predicado;
 * - o estado é o que as `actions` reproduzem numa página nova — o que a sessão do agente fez em outro
 *   navegador não é herdado;
 * - valores computados passam pela mesma exigência de autoria do verificador: cor herdada ou do
 *   navegador não é atribuída à página, e a alegação sobre ela é contradita.
 */
import type { Finding } from "../schema/finding.js";
import type { ElementEvidence } from "../evidence/types.js";
import type { StyleProperty } from "../evidence/inspect.js";
import type { PageFacts } from "../evidence/pageFacts.js";
export interface PredicateOutcome {
    status: "verified" | "contradicted";
    detail: string;
}
export interface ClaimOutcome {
    status: "consistent" | "contradicted";
    detail: string;
}
export interface Predicate {
    id: string;
    /** Propriedades que a inspeção precisa coletar para decidir. */
    properties: StyleProperty[];
    /** 2.7.0: o predicado decide sobre o documento e precisa dos fatos de página no estado reproduzido. */
    needsPageFacts?: boolean;
    /** Liga os dados estruturados alegados ao valor/tag de CADA elemento vivo (ou aos fatos de página). */
    verifyClaim(elements: ElementEvidence[], facts?: PageFacts): ClaimOutcome;
    evaluate(elements: ElementEvidence[], url: string, facts?: PageFacts): PredicateOutcome;
}
export type PredicateSelection = {
    predicate: Predicate;
    reason?: undefined;
    claimStatus?: undefined;
} | {
    predicate: null;
    reason: string;
    claimStatus?: "missing" | "contradicted";
};
export declare function selectPredicate(finding: Finding): PredicateSelection;
