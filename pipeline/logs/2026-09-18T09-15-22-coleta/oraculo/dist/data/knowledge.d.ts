export type RuleForce = "required" | "prohibited" | "recommended" | "discouraged" | "permitted" | "informative" | "example" | "unclear";
/** Forces that constitute normative guidance (D-10 bucket 1). */
export declare const NORMATIVE_FORCES: readonly RuleForce[];
export interface KnowledgeRule {
    id: string;
    dsVersion: string;
    status: "stable" | "legacy" | "alpha" | "beta" | "unknown";
    category: string;
    subcategory?: string | null;
    component: string | null;
    title: string;
    originalText: string;
    originalTextMode?: string;
    normalizedRule: string;
    force: RuleForce;
    rationale: string | null;
    conditions: string[];
    exceptions: string[];
    expectedEvidence: string[];
    validationStrategy: string;
    automatable: boolean;
    automationConfidence?: "high" | "medium" | "low";
    severitySuggestion?: string;
    relatedTokens: string[];
    relatedComponents: string[];
    wcagReferences: string[];
    emagReferences: string[];
    standard?: string;
    standardVersion?: string;
    notes?: string;
    source: {
        url: string;
        retrievedAt: string;
        contentHash: string;
        [key: string]: unknown;
    };
}
export interface KnowledgeBase {
    meta: {
        dsVersion: string;
        extractionTimestamp: string;
        totalRules: number;
        normativeRules: number;
        evidenceRules: number;
        schemaErrors: string[];
    };
    rules: KnowledgeRule[];
    byId: Map<string, KnowledgeRule>;
}
export declare function getKnowledgeBase(): KnowledgeBase;
export interface RuleFilter {
    component?: string;
    category?: string;
    force?: RuleForce;
    validationStrategy?: string;
    automatable?: boolean;
    automationConfidence?: "high" | "medium" | "low";
    severitySuggestion?: string;
    standard?: string;
    query?: string;
}
/**
 * Filter the KB. Evidence records (`force:"example"`) are excluded unless
 * explicitly requested via `force:"example"` — they are returned by
 * `getEvidence`, keeping the normative/evidence channels separate (D-10).
 */
export declare function filterRules(filter?: RuleFilter): KnowledgeRule[];
/** Canonical implementation evidence (force:"example") for a component. */
export declare function getEvidence(component?: string): KnowledgeRule[];
export declare function getRuleById(id: string): KnowledgeRule | undefined;
export interface PackageAccessibilityFinding {
    id: string;
    type: string;
    severity: string;
    component: string;
    file: string;
    element: string;
    evidence: string;
    sourceSha256: string;
    status: string;
    [key: string]: unknown;
}
export interface KnowledgeConflicts {
    conflicts: unknown;
    packageAudit: {
        accessibilityFindings: PackageAccessibilityFinding[];
        [key: string]: unknown;
    };
}
export declare function getKnowledgeConflicts(): KnowledgeConflicts;
/**
 * Defects observed in the official package's canonical examples for a
 * component (D-13's organic wing source). Served as warnings alongside
 * component specs so the agent knows the reference artifact is imperfect.
 */
export declare function getComponentDefects(component: string): PackageAccessibilityFinding[];
export interface EmagValidationTemplate {
    ruleId: string;
    recommendation: string;
    strategy: string;
    automatable: boolean;
    checks: string[];
    manualReviewRequired: boolean;
}
/** KB validation template for an e-MAG recommendation id (e.g. "6.2"). */
export declare function getEmagValidationTemplate(recommendation: string): EmagValidationTemplate | undefined;
export interface VersionAlignment {
    kbVersion: string;
    installedVersion: string | null;
    aligned: boolean;
}
/**
 * Compare the KB's dsVersion with the installed @govbr-ds/core. A mismatch
 * means the oracle's rules describe a different DS release than the package
 * the deterministic checkers' data was generated from.
 */
export declare function checkVersionAlignment(installedVersion?: string): VersionAlignment;
/** Log a warning when the installed DS diverges from the KB (startup guard). */
export declare function warnOnVersionMismatch(installedVersion?: string, log?: (msg: string) => void): VersionAlignment;
/** Reset memoized state (tests only). */
export declare function resetKnowledgeCache(): void;
