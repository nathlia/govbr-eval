/** Shared data model: ground truth (gabarito) and generated result files. */

/** true = tool detects; false = tool misses; null = reference case (no violation expected) */
export type Detection = boolean | null;

export type ToolKey = "axe" | "eslint_a11y" | "agent";

/**
 * Rule id vocabulary (E3 matching):
 *   emag:<section>   e.g. "emag:6.5"
 *   wcag:<sc>        e.g. "wcag:3.3.2"
 *   ds:<rule>        token-color | token-font | token-radius | token-focus | token-spacing |
 *                    button-order | component-structure | form-label
 */
export type RuleId = string;

export interface GroundTruthViolation {
  description: string;
  /** Normative rule aliases — a finding matches this violation if it cites ANY of them. */
  rules: RuleId[];
  categories: string[];
}

export interface GroundTruthCase {
  page: "buttons" | "forms";
  description: string;
  violations: GroundTruthViolation[];
  /** Union of the violations' categories (kept for display/back-compat). */
  categories: string[];
  detection: Record<ToolKey, Detection>;
  notes?: string;
}

export interface GroundTruth {
  _meta: Record<string, unknown>;
  cases: Record<string, GroundTruthCase>;
}

export interface AxeViolationRef {
  rule: string;
  impact?: string;
  description: string;
  helpUrl?: string;
}

export interface AxePageResult {
  passes: number;
  violationCount: number;
  byCaseId: Record<string, AxeViolationRef[]>;
  raw?: unknown;
}

export interface AxeResults {
  timestamp: string;
  tool: string;
  appUrl: string;
  results: Record<string, AxePageResult>;
}

/**
 * One agent finding. Preferred (v2.1+): structured object with a rule id from the vocabulary.
 * Legacy (pilot runs): plain string — rule ids are parsed from the normative citations in the text.
 */
export type AgentFinding = string | { rule: RuleId; description: string };

export interface AgentVerdict {
  detected: boolean;
  violations_found: AgentFinding[];
  notes?: string;
}

export interface AgentResults {
  timestamp: string;
  model: string;
  appUrl: string;
  _empty?: boolean;
  verdicts: Record<string, AgentVerdict>;
}
