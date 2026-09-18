import { type Finding, type Verification } from "../schema/finding.js";
export interface ReportSummary {
    total: number;
    bySeverity: Record<string, number>;
    byNature: Record<string, number>;
    byPathway: Record<string, number>;
    bySource: Record<string, number>;
    /** Heuristic findings whose verification was inconclusive — outside `total`. */
    reviewItems?: number;
}
export interface Report {
    meta: {
        url: string;
        generatedAt: string;
        tool: string;
        disclaimer: string;
    };
    summary: ReportSummary;
    findings: Finding[];
    reviewItems: Finding[];
    notes?: string;
}
export interface SubmissionResult {
    accepted: Finding[];
    reviewItems: Finding[];
    rejected: {
        index: number;
        errors: string[];
    }[];
}
export interface ValidationOptions {
    /** Findings produced by this server's scanners and referenced by id. */
    serverFindings?: Finding[];
    /** Server-held verification for the exact payload. */
    verificationFor?: (finding: Finding) => Verification | undefined;
}
/**
 * Validate submitted findings. Invalid entries come back with actionable,
 * per-field errors (A5: responses as feedback signals the agent can act on),
 * never silently dropped.
 */
export declare function validateFindings(raw: unknown[], options?: ValidationOptions): SubmissionResult;
export declare function summarize(findings: Finding[]): ReportSummary;
export declare function buildReport(url: string, findings: Finding[], notes?: string, reviewItems?: Finding[]): Report;
export declare function renderMarkdown(report: Report): string;
export interface PersistedReport {
    jsonPath: string;
    markdownPath: string;
}
export declare function persistReport(report: Report, outDir: string): PersistedReport;
