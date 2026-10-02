/**
 * Color/value normalization for the deterministic token checker (B1).
 * Computed styles come back as rgb()/rgba() strings; the token registry's
 * reverse index is keyed by lowercase #rrggbb hex.
 */
/**
 * Normalize a CSS color value to lowercase #rrggbb hex.
 * Returns null for fully transparent or unparseable values (nothing to check).
 */
export declare function normalizeColor(value: string): string | null;
export interface NearestToken {
    token: string;
    hex: string;
    distance: number;
}
/**
 * Nearest DS token by Euclidean RGB distance — used as the remediation hint
 * in the finding's feedback signal ("did you mean --blue-warm-vivid-70?").
 */
export declare function nearestToken(hex: string, hexLookup: Record<string, string[]>): NearestToken | null;
/** Parse a CSS px length ("14px") to a number, or null. */
export declare function parsePx(value: string): number | null;
