/**
 * B1 — deterministic token compliance checker ("syntactic half" of the
 * hybrid architecture). Exact-value comparison of computed styles against the
 * token registry's reverse index; no LLM involvement (oyelayo2026: LLM F1
 * 0.48 on layout/value matching — deterministic code wins there).
 *
 * Pure function over ElementEvidence fixtures → unit-testable without a
 * browser.
 */
import type { Finding, Observation } from "../schema/finding.js";
import type { TokenRegistry } from "../data/load.js";
import type { ElementEvidence } from "../evidence/types.js";
export type TokenCheck = "color" | "font" | "radius" | "spacing";
export declare const ALL_TOKEN_CHECKS: TokenCheck[];
export declare function checkTokenCompliance(page: {
    url: string;
}, elements: ElementEvidence[], registry: TokenRegistry, checks?: TokenCheck[]): Finding[];
/**
 * Sinais de revisão de token (D-32) — o desvio que o oráculo mostra sem afirmar violação.
 *
 * Espelha `collectStructureObservations`: mesma razão, outra família de verificação. A escala
 * tipográfica do gov.br é modular e não redonda, e a única regra da KB sobre tamanho de fonte é
 * informativa; afirmar violação binária sobre uma diferença sub-pixel fazia o veredito depender de
 * onde se corta a tolerância em vez da norma. O desvio continua sendo informação útil — por isso
 * sai —, e quem julga se ele é defeito é a camada semântica, com a página na frente.
 */
export declare function collectTokenObservations(page: {
    url: string;
}, elements: ElementEvidence[], registry: TokenRegistry): Observation[];
