/**
 * Shared headless-browser lifecycle. One Chromium instance per server
 * process, lazily launched, reused across tool calls (the PoC relaunched per
 * call — expensive), closed on shutdown.
 *
 * Egress policy. In a measured run the agent chooses the URL, so this browser can open anything
 * the machine reaches — including the evaluation harness and its answer key. Two variables close
 * that path; unset, behavior is unchanged:
 *   GOVBR_VALIDATOR_ALLOWED_ORIGINS  comma-separated origins a tool may open; others fail before
 *                                    the browser starts loading
 *   GOVBR_VALIDATOR_PROXY_SERVER     every browser request (subresources, redirects, fetch, frames,
 *                                    workers) goes through this proxy, loopback included
 * The origin check gives a readable error; the proxy is the boundary.
 */
import { type Browser, type Page } from "playwright";
export interface EgressPolicy {
    allowedOrigins: string[] | null;
    proxyServer: string | null;
}
export declare function egressPolicyFromEnv(env?: NodeJS.ProcessEnv): EgressPolicy;
export declare function assertUrlAllowed(url: string, policy?: EgressPolicy): void;
export declare function getBrowser(): Promise<Browser>;
/**
 * Run `fn` with a fresh page; the page is always closed afterwards. `viewport` is only set by the
 * deterministic baseline CLI, so that it observes the window the reference declares; without it the
 * page keeps Playwright's default (the MCP tools never pass one).
 */
export declare function withPage<T>(url: string, fn: (page: Page) => Promise<T>, options?: {
    viewport?: {
        width: number;
        height: number;
    };
}): Promise<T>;
export declare function closeBrowser(): Promise<void>;
