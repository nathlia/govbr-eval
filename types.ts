/** Shared data model: ground truth (gabarito) and generated result files. */

/** true = tool detects; false = tool misses; null = reference case (no violation expected) */
export type Detection = boolean | null;

export type ToolKey = "axe" | "eslint_a11y" | "agent";

export interface GroundTruthCase {
  page: "buttons" | "forms";
  description: string;
  violations: string[];
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

export interface AgentVerdict {
  detected: boolean;
  violations_found: string[];
  notes?: string;
}

export interface AgentResults {
  timestamp: string;
  model: string;
  appUrl: string;
  _empty?: boolean;
  verdicts: Record<string, AgentVerdict>;
}
