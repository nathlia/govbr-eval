/**
 * govbr-ds-validator MCP server — the validation oracle (TCC 2 artifact).
 *
 * Design (traceable to tcc2-requirements.md):
 *   A1  rules as queryable tools/resources, never static prompt text
 *   A2  e-MAG 3.1 alongside WCAG-derived checks
 *   A3  canonical component specs from @govbr-ds/core examples
 *   A4  token registry with hex→token reverse index
 *   A5  responses shaped as structured feedback signals
 *   A6  validation procedure as an MCP prompt primitive
 *   B1  deterministic token/structure checkers (no LLM)
 *   B2  axe-core embedded as deterministic accessibility pass
 *   C3  verify_finding anti-hallucination gate
 *   C5  evidence tools separated from judgment
 *   D2–D4  finding schema, dual-format report, persisted traces
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ToolTelemetryOptions } from "./telemetry.js";
export interface ServerOptions {
    reportsDir?: string;
    telemetry?: ToolTelemetryOptions;
    /** Full authoring surface, or the smaller surface used by controlled evaluations. */
    toolProfile?: "full" | "evaluation" | "normative" | "deterministic" | "evidence";
}
export declare function createServer(options?: ServerOptions): McpServer;
