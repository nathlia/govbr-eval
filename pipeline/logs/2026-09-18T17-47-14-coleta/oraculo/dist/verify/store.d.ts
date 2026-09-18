import type { Finding, Verification } from "../schema/finding.js";
/** Hash do achado inteiro, exceto o campo `verification`, que é resultado e não alegação. */
export declare function findingSha256(finding: Finding): string;
export interface StoredVerification {
    verificationId: string;
    findingSha256: string;
    verifiedAt: string;
    verification: Verification;
}
export declare class VerificationStore {
    private readonly byHash;
    private counter;
    /** A verificação mais recente de um mesmo payload substitui a anterior. */
    record(finding: Finding, verification: Verification): StoredVerification;
    lookup(finding: Finding): StoredVerification | undefined;
}
