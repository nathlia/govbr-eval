import { type EmagRule } from "../data/load.js";
import { type KnowledgeRule } from "../data/knowledge.js";
import { type CheckKind } from "../checkers/grounding.js";
export interface WcagCriterion {
    num: string;
    id: string;
    handle: string;
    level: "A" | "AA" | "AAA" | null;
    versions: string[];
}
export interface WcagRegistry {
    meta: {
        standard: string;
        source: string;
        retrievedAt: string;
        sourceSha256: string;
        totalListed: number;
        inWcag22: number;
        obsoleteInWcag22: string[];
        note: string;
    };
    criteria: WcagCriterion[];
}
export declare function getWcagRegistry(): WcagRegistry;
export type MembershipStatus = "member" | "obsolete" | "unknown" | "malformed";
export interface Membership<T> {
    status: MembershipStatus;
    normalizedId: string;
    entry?: T;
    detail: string;
}
export declare function wcagMembership(raw: string): Membership<WcagCriterion>;
export declare function emagMembership(raw: string): Membership<EmagRule & {
    section: string;
}>;
export declare function kbMembership(id: string): Membership<KnowledgeRule>;
/** Ids dos verificadores de token. `implements` vazio: a verificação não sustenta achado (D-27/D-32). */
export declare function tokenRuleMembership(id: string): Membership<{
    kind: CheckKind;
    implements: string[];
}>;
/** Restrições estruturais citáveis — as mesmas que `get_component_spec` publica (D-29). */
export declare function structureRuleMembership(id: string): Membership<{
    component: string;
}>;
/** Versões contra as quais o portão conferiu, devolvidas em toda verificação. */
export declare function registryVersions(): Record<string, string>;
