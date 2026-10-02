/**
 * A6 — the validation procedure shipped as an MCP prompt primitive. Any MCP
 * client that invokes this prompt runs the same standardized procedure
 * (suh2025feeda11y: structured procedure beats loose prompting; less
 * run-to-run variance, no client improvisation).
 *
 * Deliberate design constraints:
 *  - Procedure ONLY. Domain knowledge (rules, tokens, specs) stays in the
 *    tools/resources (A1) — the prompt tells the agent where to fetch it.
 *  - No few-shot violation examples (suh2025feeda11y: few-shot was the worst
 *    configuration).
 *  - Two-phase split: evidence gathering, then judgment (rosenbach2025gerallt
 *    controller/evaluator split, C5).
 *  - Dual pathway with the verification gate (wang2025sgcr, C3).
 *  - Iteration cap (suh2025feeda11y converges ~2.4 iterations; oyelayo2026:
 *    +52% cost, no gain beyond that).
 */
export interface ValidatePageArgs {
    url: string;
    /** Optional comma-separated component names to focus on (e.g. "button,input"). */
    scope?: string;
    /** Max reasoning iterations after the first pass. Default "2". */
    max_iterations?: string;
}
export declare function buildValidatePagePrompt({ url, scope, max_iterations }: ValidatePageArgs): string;
