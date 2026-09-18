import { z } from "zod";
import type { Finding } from "../schema/finding.js";
export declare const FindingDetailSchema: z.ZodEnum<["summary", "evidence", "full"]>;
export type FindingDetail = z.infer<typeof FindingDetailSchema>;
export declare const FindingPageInputShape: {
    detail: z.ZodOptional<z.ZodEnum<["summary", "evidence", "full"]>>;
    cursor: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    maxChars: z.ZodOptional<z.ZodNumber>;
};
export interface FindingPageOptions {
    detail?: FindingDetail;
    cursor?: number;
    limit?: number;
    maxChars?: number;
}
export declare const FINDING_DEDUPLICATION_KEY = "rule.source + rule.id + element.page + element.locator + evidence.data.property/evidence.observed";
export declare function findingIdentity(finding: Finding): string;
export declare function deduplicateFindings(input: Finding[]): {
    findings: Finding[];
    inputCount: number;
    outputCount: number;
    merged: number;
    key: string;
};
export declare function diffFindings(previous: Finding[], current: Finding[]): {
    added: string[];
    removed: string[];
    unchanged: number;
};
export declare class FindingStore {
    private readonly findings;
    private readonly batches;
    private batchCounter;
    put(items: Finding[]): void;
    putBatch(kind: string, items: Finding[], metadata?: Record<string, unknown>): string;
    get(ids: string[]): {
        found: Finding[];
        missing: string[];
    };
    getBatch(scanId: string): Finding[] | undefined;
    getBatchMetadata(scanId: string): Record<string, unknown> | undefined;
}
/**
 * Creates a bounded page. The budget is conservative and applies to projected findings; response
 * metadata adds a small fixed overhead. At least one finding is returned so callers can always
 * make progress, with budgetExceeded=true when that single item exceeds the requested budget.
 */
export declare function buildFindingPage(findings: Finding[], options?: FindingPageOptions): {
    detailHint?: string | undefined;
    budgetExceeded?: boolean | undefined;
    responseCharsEstimate: number;
    nextCursor?: number | undefined;
    detail: "evidence" | "summary" | "full";
    total: number;
    cursor: number;
    count: number;
    findings: unknown[];
    truncated: boolean;
};
