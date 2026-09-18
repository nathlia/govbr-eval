import type { Page } from "playwright";
import { type TokenCheck } from "../checkers/tokenCompliance.js";
import type { Finding, Observation } from "../schema/finding.js";
export type PageScanCheck = "tokens" | "structure" | "axe";
export type PageScanAction = {
    action: "click";
    selector: string;
} | {
    action: "fill";
    selector: string;
    value: string;
} | {
    action: "press";
    key: string;
    selector?: string;
} | {
    action: "wait";
    selector?: string;
    ms?: number;
};
export interface PageScanRequest {
    url: string;
    selectors?: string[];
    checks?: PageScanCheck[];
    tokenChecks?: TokenCheck[];
    components?: string[];
    actions?: PageScanAction[];
    /**
     * Window for the scan. Accepted only from the deterministic baseline CLI (2.5.2): the MCP tool
     * schema does not expose it, so the agent-facing surface is unchanged.
     */
    viewport?: {
        width: number;
        height: number;
    };
}
export interface PageScanResult {
    url: string;
    stateFingerprint: string;
    cacheHit: boolean;
    cacheMissReason?: "no-exact-fingerprint-and-scope-match";
    findings: Finding[];
    /** Sinais de revisão fora da pontuação (D-27). */
    observations: Observation[];
    coverage: {
        checks: PageScanCheck[];
        /** Explicit selectors from the request; empty means each checker uses its documented default. */
        selectors: string[];
        evidenceSelectors: string[];
        axeScope: string | null;
        elementsInspected: number;
        componentsRequested: string[];
        componentsFound: string[];
        axe?: {
            engine: {
                name: string;
                version: string;
            };
            passes: number;
            incomplete: number;
        };
        actionsApplied: Array<{
            action: PageScanAction["action"];
            selector?: string;
            key?: string;
        }>;
    };
    deduplication: {
        input: number;
        output: number;
        merged: number;
        key: string;
    };
}
interface CachedScan extends Omit<PageScanResult, "cacheHit" | "cacheMissReason"> {
}
/** Process-local LRU. A battery run starts a fresh MCP process, so entries never cross runs. */
export declare class PageScanCache {
    private readonly maxEntries;
    private readonly entries;
    constructor(maxEntries?: number);
    get(key: string): CachedScan | undefined;
    set(key: string, value: CachedScan): void;
}
export declare function fingerprintPage(page: Page): Promise<string>;
export declare function applyActions(page: Page, actions: PageScanAction[]): Promise<void>;
export declare function scanPage(request: PageScanRequest, cache: PageScanCache): Promise<PageScanResult>;
export {};
