/**
 * D2 — Finding schema.
 *
 * Every validation result in the framework — deterministic checker output,
 * axe-core findings, agent judgments, verified heuristic findings — is
 * expressed as a Finding. The schema carries the triple proven sufficient to
 * ground remediation guidance (huang2024access, li2025portal):
 *
 *   observed evidence + violated rule (id/source) + expected behavior
 *
 * plus severity, element locator, the two classification axes used for
 * result slicing in the evaluation (oyelayo2026: semantic × syntactic ×
 * layout; zhao2024gtarena: display × interaction), the detection pathway
 * (wang2025sgcr dual-pathway), and an optional reasoning trace (fan2023 —
 * auditability as Oracle Problem mitigation).
 */
import { z } from "zod";
/** Where the violated rule comes from. */
export declare const RuleSourceSchema: z.ZodEnum<["govbr-ds-kb", "govbr-ds-token", "govbr-ds-structure", "govbr-ds-page", "emag", "wcag", "axe-core"]>;
export type RuleSource = z.infer<typeof RuleSourceSchema>;
export declare const SeveritySchema: z.ZodEnum<["critical", "serious", "moderate", "minor"]>;
export type Severity = z.infer<typeof SeveritySchema>;
/**
 * Violation nature (oyelayo2026). Determines which half of the hybrid
 * architecture is expected to detect it:
 *   syntactic — exact-value mismatch (token values, required classes/attrs);
 *               deterministic code territory (LLM F1 0.48 on layout).
 *   semantic  — contextual correctness (right token for the context, ARIA
 *               correct for the role); LLM territory (F1 0.83).
 *   layout    — spatial/visual arrangement.
 */
export declare const NatureSchema: z.ZodEnum<["syntactic", "semantic", "layout"]>;
export type Nature = z.infer<typeof NatureSchema>;
/** Interaction mode (zhao2024gtarena): visible at rest vs. only under interaction. */
export declare const ModeSchema: z.ZodEnum<["display", "interaction"]>;
export type Mode = z.infer<typeof ModeSchema>;
/**
 * Detection pathway (wang2025sgcr dual-pathway):
 *   deterministic — produced by the syntactic checker layer (B1/B2), no LLM.
 *   explicit      — agent judgment against a predefined rule fed to it; without a server-held
 *                   verification it remains a review item, outside confirmed findings.
 *   heuristic     — agent-initiated finding; MUST pass the verification gate
 *                   (verify_finding) before entering a report.
 */
export declare const PathwaySchema: z.ZodEnum<["deterministic", "explicit", "heuristic"]>;
export type Pathway = z.infer<typeof PathwaySchema>;
/** C3 verification gate verdicts. */
export declare const VerdictSchema: z.ZodEnum<["confirmed", "rejected", "unverifiable"]>;
export type Verdict = z.infer<typeof VerdictSchema>;
export declare const RuleRefSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodEnum<["govbr-ds-kb", "govbr-ds-token", "govbr-ds-structure", "govbr-ds-page", "emag", "wcag", "axe-core"]>;
    description: z.ZodString;
    wcag: z.ZodOptional<z.ZodString>;
    implements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
    description: string;
    wcag?: string | undefined;
    implements?: string[] | undefined;
}, {
    id: string;
    source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
    description: string;
    wcag?: string | undefined;
    implements?: string[] | undefined;
}>;
export type RuleRef = z.infer<typeof RuleRefSchema>;
export declare const ElementRefSchema: z.ZodObject<{
    locator: z.ZodString;
    snippet: z.ZodOptional<z.ZodString>;
    page: z.ZodString;
}, "strip", z.ZodTypeAny, {
    locator: string;
    page: string;
    snippet?: string | undefined;
}, {
    locator: string;
    page: string;
    snippet?: string | undefined;
}>;
export type ElementRef = z.infer<typeof ElementRefSchema>;
export declare const EvidenceSchema: z.ZodObject<{
    observed: z.ZodString;
    expected: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    expected: string;
    observed: string;
    data?: Record<string, unknown> | undefined;
}, {
    expected: string;
    observed: string;
    data?: Record<string, unknown> | undefined;
}>;
export type Evidence = z.infer<typeof EvidenceSchema>;
/** Outcome of one separate gate check (v02, slice 4). */
export declare const CheckStatusSchema: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
export type CheckStatus = z.infer<typeof CheckStatusSchema>;
/**
 * Whether the violation itself was verified:
 *   verified      an implemented predicate recomputed it on every asserted element, in the state checked
 *   contradicted  the predicate ran and at least one asserted element does not violate
 *   no-predicate  no predicate exists for this rule/claim — the only honest answer is unverifiable
 *   not-checked   a predicate exists but live=false
 *   error         the page could not be reopened
 */
export declare const ViolationStatusSchema: z.ZodEnum<["verified", "contradicted", "no-predicate", "not-checked", "error"]>;
export type ViolationStatus = z.infer<typeof ViolationStatusSchema>;
export declare const VerificationSchema: z.ZodObject<{
    verdict: z.ZodEnum<["confirmed", "rejected", "unverifiable"]>;
    verifiedBy: z.ZodString;
    detail: z.ZodOptional<z.ZodString>;
    checks: z.ZodOptional<z.ZodObject<{
        ruleExists: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
        applicability: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
        evidenceConsistent: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
        violation: z.ZodEnum<["verified", "contradicted", "no-predicate", "not-checked", "error"]>;
    }, "strip", z.ZodTypeAny, {
        ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
        applicability: "pass" | "fail" | "unknown" | "not-applicable";
        evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
        violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
    }, {
        ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
        applicability: "pass" | "fail" | "unknown" | "not-applicable";
        evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
        violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
    }>>;
    predicate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    binding: z.ZodOptional<z.ZodObject<{
        findingSha256: z.ZodString;
        stateFingerprint: z.ZodNullable<z.ZodString>;
        live: z.ZodBoolean;
        elements: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        findingSha256: string;
        stateFingerprint: string | null;
        live: boolean;
        elements: number | null;
    }, {
        findingSha256: string;
        stateFingerprint: string | null;
        live: boolean;
        elements: number | null;
    }>>;
    registries: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    verdict: "confirmed" | "rejected" | "unverifiable";
    verifiedBy: string;
    detail?: string | undefined;
    checks?: {
        ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
        applicability: "pass" | "fail" | "unknown" | "not-applicable";
        evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
        violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
    } | undefined;
    predicate?: string | null | undefined;
    binding?: {
        findingSha256: string;
        stateFingerprint: string | null;
        live: boolean;
        elements: number | null;
    } | undefined;
    registries?: Record<string, string> | undefined;
}, {
    verdict: "confirmed" | "rejected" | "unverifiable";
    verifiedBy: string;
    detail?: string | undefined;
    checks?: {
        ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
        applicability: "pass" | "fail" | "unknown" | "not-applicable";
        evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
        violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
    } | undefined;
    predicate?: string | null | undefined;
    binding?: {
        findingSha256: string;
        stateFingerprint: string | null;
        live: boolean;
        elements: number | null;
    } | undefined;
    registries?: Record<string, string> | undefined;
}>;
export type Verification = z.infer<typeof VerificationSchema>;
export declare const FindingSchema: z.ZodObject<{
    id: z.ZodString;
    rule: z.ZodObject<{
        id: z.ZodString;
        source: z.ZodEnum<["govbr-ds-kb", "govbr-ds-token", "govbr-ds-structure", "govbr-ds-page", "emag", "wcag", "axe-core"]>;
        description: z.ZodString;
        wcag: z.ZodOptional<z.ZodString>;
        implements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
        description: string;
        wcag?: string | undefined;
        implements?: string[] | undefined;
    }, {
        id: string;
        source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
        description: string;
        wcag?: string | undefined;
        implements?: string[] | undefined;
    }>;
    element: z.ZodObject<{
        locator: z.ZodString;
        snippet: z.ZodOptional<z.ZodString>;
        page: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        locator: string;
        page: string;
        snippet?: string | undefined;
    }, {
        locator: string;
        page: string;
        snippet?: string | undefined;
    }>;
    evidence: z.ZodObject<{
        observed: z.ZodString;
        expected: z.ZodString;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        expected: string;
        observed: string;
        data?: Record<string, unknown> | undefined;
    }, {
        expected: string;
        observed: string;
        data?: Record<string, unknown> | undefined;
    }>;
    severity: z.ZodEnum<["critical", "serious", "moderate", "minor"]>;
    nature: z.ZodEnum<["syntactic", "semantic", "layout"]>;
    mode: z.ZodEnum<["display", "interaction"]>;
    pathway: z.ZodEnum<["deterministic", "explicit", "heuristic"]>;
    verification: z.ZodOptional<z.ZodObject<{
        verdict: z.ZodEnum<["confirmed", "rejected", "unverifiable"]>;
        verifiedBy: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        checks: z.ZodOptional<z.ZodObject<{
            ruleExists: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
            applicability: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
            evidenceConsistent: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
            violation: z.ZodEnum<["verified", "contradicted", "no-predicate", "not-checked", "error"]>;
        }, "strip", z.ZodTypeAny, {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        }, {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        }>>;
        predicate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        binding: z.ZodOptional<z.ZodObject<{
            findingSha256: z.ZodString;
            stateFingerprint: z.ZodNullable<z.ZodString>;
            live: z.ZodBoolean;
            elements: z.ZodNullable<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        }, {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        }>>;
        registries: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        verdict: "confirmed" | "rejected" | "unverifiable";
        verifiedBy: string;
        detail?: string | undefined;
        checks?: {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        } | undefined;
        predicate?: string | null | undefined;
        binding?: {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        } | undefined;
        registries?: Record<string, string> | undefined;
    }, {
        verdict: "confirmed" | "rejected" | "unverifiable";
        verifiedBy: string;
        detail?: string | undefined;
        checks?: {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        } | undefined;
        predicate?: string | null | undefined;
        binding?: {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        } | undefined;
        registries?: Record<string, string> | undefined;
    }>>;
    trace: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    rule: {
        id: string;
        source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
        description: string;
        wcag?: string | undefined;
        implements?: string[] | undefined;
    };
    element: {
        locator: string;
        page: string;
        snippet?: string | undefined;
    };
    evidence: {
        expected: string;
        observed: string;
        data?: Record<string, unknown> | undefined;
    };
    severity: "critical" | "serious" | "moderate" | "minor";
    nature: "syntactic" | "semantic" | "layout";
    mode: "display" | "interaction";
    pathway: "deterministic" | "explicit" | "heuristic";
    verification?: {
        verdict: "confirmed" | "rejected" | "unverifiable";
        verifiedBy: string;
        detail?: string | undefined;
        checks?: {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        } | undefined;
        predicate?: string | null | undefined;
        binding?: {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        } | undefined;
        registries?: Record<string, string> | undefined;
    } | undefined;
    trace?: string | undefined;
}, {
    id: string;
    rule: {
        id: string;
        source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
        description: string;
        wcag?: string | undefined;
        implements?: string[] | undefined;
    };
    element: {
        locator: string;
        page: string;
        snippet?: string | undefined;
    };
    evidence: {
        expected: string;
        observed: string;
        data?: Record<string, unknown> | undefined;
    };
    severity: "critical" | "serious" | "moderate" | "minor";
    nature: "syntactic" | "semantic" | "layout";
    mode: "display" | "interaction";
    pathway: "deterministic" | "explicit" | "heuristic";
    verification?: {
        verdict: "confirmed" | "rejected" | "unverifiable";
        verifiedBy: string;
        detail?: string | undefined;
        checks?: {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        } | undefined;
        predicate?: string | null | undefined;
        binding?: {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        } | undefined;
        registries?: Record<string, string> | undefined;
    } | undefined;
    trace?: string | undefined;
}>;
export type Finding = z.infer<typeof FindingSchema>;
/** Raw ZodRawShape variants for MCP registerTool input/output schemas. */
export declare const FindingShape: {
    id: z.ZodString;
    rule: z.ZodObject<{
        id: z.ZodString;
        source: z.ZodEnum<["govbr-ds-kb", "govbr-ds-token", "govbr-ds-structure", "govbr-ds-page", "emag", "wcag", "axe-core"]>;
        description: z.ZodString;
        wcag: z.ZodOptional<z.ZodString>;
        implements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
        description: string;
        wcag?: string | undefined;
        implements?: string[] | undefined;
    }, {
        id: string;
        source: "govbr-ds-kb" | "govbr-ds-token" | "govbr-ds-structure" | "govbr-ds-page" | "emag" | "wcag" | "axe-core";
        description: string;
        wcag?: string | undefined;
        implements?: string[] | undefined;
    }>;
    element: z.ZodObject<{
        locator: z.ZodString;
        snippet: z.ZodOptional<z.ZodString>;
        page: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        locator: string;
        page: string;
        snippet?: string | undefined;
    }, {
        locator: string;
        page: string;
        snippet?: string | undefined;
    }>;
    evidence: z.ZodObject<{
        observed: z.ZodString;
        expected: z.ZodString;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        expected: string;
        observed: string;
        data?: Record<string, unknown> | undefined;
    }, {
        expected: string;
        observed: string;
        data?: Record<string, unknown> | undefined;
    }>;
    severity: z.ZodEnum<["critical", "serious", "moderate", "minor"]>;
    nature: z.ZodEnum<["syntactic", "semantic", "layout"]>;
    mode: z.ZodEnum<["display", "interaction"]>;
    pathway: z.ZodEnum<["deterministic", "explicit", "heuristic"]>;
    verification: z.ZodOptional<z.ZodObject<{
        verdict: z.ZodEnum<["confirmed", "rejected", "unverifiable"]>;
        verifiedBy: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        checks: z.ZodOptional<z.ZodObject<{
            ruleExists: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
            applicability: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
            evidenceConsistent: z.ZodEnum<["pass", "fail", "unknown", "not-applicable"]>;
            violation: z.ZodEnum<["verified", "contradicted", "no-predicate", "not-checked", "error"]>;
        }, "strip", z.ZodTypeAny, {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        }, {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        }>>;
        predicate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        binding: z.ZodOptional<z.ZodObject<{
            findingSha256: z.ZodString;
            stateFingerprint: z.ZodNullable<z.ZodString>;
            live: z.ZodBoolean;
            elements: z.ZodNullable<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        }, {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        }>>;
        registries: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        verdict: "confirmed" | "rejected" | "unverifiable";
        verifiedBy: string;
        detail?: string | undefined;
        checks?: {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        } | undefined;
        predicate?: string | null | undefined;
        binding?: {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        } | undefined;
        registries?: Record<string, string> | undefined;
    }, {
        verdict: "confirmed" | "rejected" | "unverifiable";
        verifiedBy: string;
        detail?: string | undefined;
        checks?: {
            ruleExists: "pass" | "fail" | "unknown" | "not-applicable";
            applicability: "pass" | "fail" | "unknown" | "not-applicable";
            evidenceConsistent: "pass" | "fail" | "unknown" | "not-applicable";
            violation: "verified" | "contradicted" | "no-predicate" | "not-checked" | "error";
        } | undefined;
        predicate?: string | null | undefined;
        binding?: {
            findingSha256: string;
            stateFingerprint: string | null;
            live: boolean;
            elements: number | null;
        } | undefined;
        registries?: Record<string, string> | undefined;
    }>>;
    trace: z.ZodOptional<z.ZodString>;
};
/**
 * Sinal de revisão (D-27) — o que um verificador observa mas não pode afirmar como violação,
 * porque não há regra normativa que o sustente.
 *
 * Deliberadamente NÃO é um Finding e não tem severidade: se entrasse no mesmo canal, entraria
 * também na precisão, e o oráculo estaria cobrando por uma norma que o design system não escreveu.
 * Serve a quem revisa a página, não à pontuação.
 */
export declare const ObservationSchema: z.ZodObject<{
    kind: z.ZodString;
    element: z.ZodObject<{
        locator: z.ZodString;
        snippet: z.ZodOptional<z.ZodString>;
        page: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        locator: string;
        page: string;
        snippet?: string | undefined;
    }, {
        locator: string;
        page: string;
        snippet?: string | undefined;
    }>;
    note: z.ZodString;
    whyNotAFinding: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    element: {
        locator: string;
        page: string;
        snippet?: string | undefined;
    };
    kind: string;
    note: string;
    whyNotAFinding: string;
    data?: Record<string, unknown> | undefined;
}, {
    element: {
        locator: string;
        page: string;
        snippet?: string | undefined;
    };
    kind: string;
    note: string;
    whyNotAFinding: string;
    data?: Record<string, unknown> | undefined;
}>;
export type Observation = z.infer<typeof ObservationSchema>;
/** Sequential finding ids within a server process. */
export declare function nextFindingId(): string;
/** Reset the counter (tests only). */
export declare function resetFindingIds(): void;
