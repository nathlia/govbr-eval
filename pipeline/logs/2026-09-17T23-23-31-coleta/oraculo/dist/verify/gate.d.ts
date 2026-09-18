/**
 * C3 — portão de verificação (wang2025sgcr dual-pathway), refeito na fatia 4 do v02.
 *
 * O portão respondia `confirmed` quando a regra citada existia e, com live, quando o localizador
 * achava um elemento: existência da regra e presença do elemento viravam confirmação de qualquer
 * alegação semântica. Nas execuções de 14/09 foram 4 chamadas, todas `confirmed` assim (D-38).
 * Agora cada coisa é conferida e devolvida em separado:
 *
 *   ruleExists          o id pertence a um registro versionado — formato nunca prova existência
 *   applicability       a regra pode sustentar achado (evidência de exemplo e verificação sem norma
 *                       não podem)
 *   evidenceConsistent  valores legíveis por máquina concordam com o registro e, com live, com cada
 *                       elemento no estado reproduzido
 *   violation           um predicado implementado recalculou a violação em todos os elementos
 *
 * `confirmed` só existe com `violation: verified`. Qualquer conferência que falha → `rejected`. O
 * resto — regra real, evidência não contradita, violação que o oráculo não decide — é
 * `unverifiable`, e é assim que ele deve chegar a quem revisa.
 */
import type { CheckStatus, Finding, Verdict, Verification, ViolationStatus } from "../schema/finding.js";
import { type PageScanAction } from "../scan/pageScan.js";
export interface GateInput {
    finding: Finding;
    /** Reabre element.page, reproduz actions e verifica cada elemento de element.locator. */
    live?: boolean;
    actions?: PageScanAction[];
    /** Estado alegado; se o estado reproduzido tiver outro fingerprint, a verificação é rejeitada. */
    stateFingerprint?: string;
}
interface Checks {
    ruleExists: CheckStatus;
    applicability: CheckStatus;
    evidenceConsistent: CheckStatus;
    violation: ViolationStatus;
}
export declare function verdictOf(checks: Checks): Verdict;
export declare function verifyFinding({ finding, live, actions, stateFingerprint }: GateInput): Promise<Verification>;
export {};
