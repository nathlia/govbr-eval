import type { Finding } from "../schema/finding.js";
import type { Page } from "playwright";
/**
 * Flatten axe's target into the locator format the evidence layer resolves.
 *
 * Joining the array with a space or a comma is the bug this replaces: `["br-input","input"]`
 * became `br-input input` (a descendant selector that matches nothing, since the input is not a
 * light-DOM descendant) or `br-input,input` (a selector list that matches the wrong elements).
 * Both fail silently, which is worse than not reporting the element at all.
 */
export declare function axeLocator(target: (string | string[])[]): string;
export interface AxeScanResult {
    findings: Finding[];
    engine: {
        name: string;
        version: string;
    };
    passeCount: number;
    incompleteCount: number;
}
export declare function runAxeScan(url: string, selector?: string): Promise<AxeScanResult>;
/** Run axe against an already-loaded page so aggregate scans do not navigate twice. */
export declare function runAxeScanOnPage(page: Page, url: string, selector?: string): Promise<AxeScanResult>;
