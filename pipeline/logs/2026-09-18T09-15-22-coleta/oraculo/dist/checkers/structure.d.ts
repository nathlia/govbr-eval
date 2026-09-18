/**
 * B1 — deterministic component-structure checker. Compares observed DOM
 * elements carrying a `br-*` root class against the canonical component spec
 * extracted from the official @govbr-ds/core examples (A3: automatic
 * comparison implementation × specification).
 */
import type { Finding, Observation } from "../schema/finding.js";
import type { ComponentSpec } from "../data/load.js";
import type { ElementEvidence } from "../evidence/types.js";
export declare function checkComponentStructure(page: {
    url: string;
}, elements: ElementEvidence[], spec: ComponentSpec): Finding[];
/**
 * Sinais de revisão da estrutura (D-27) — informação para quem olha a página, fora da pontuação.
 *
 * A classe fora do vocabulário canônico costumava sair como achado de severidade `minor`. Ela não
 * tem norma que a sustente, e o custo de fingir que tem era alto: numa tela realista virava a maior
 * fonte isolada de falso positivo, concentrada justamente nos elementos que o D-24 tornou
 * conformes — isto é, penalizando o braço COM oráculo por uma decisão do corpus.
 */
export declare function collectStructureObservations(page: {
    url: string;
}, elements: ElementEvidence[], spec: ComponentSpec): Observation[];
