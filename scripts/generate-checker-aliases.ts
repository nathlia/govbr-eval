/**
 * Generates checker-aliases.json from the validator's check grounding (D-27, built in D-37).
 *
 * D-27 made every deterministic checker declare the normative rule it implements, and decided that
 * the vocabulary bridge lives "no verificador, declarada e depois gerada num mapa de alias que o
 * scorer consome". The declaration shipped (govbr-ds-validator/src/checkers/grounding.ts, 01/09);
 * this generator is the half that did not. Without it, a claim citing the rule the oracle's own
 * checker declares (`govbr-3.7.0-foundation-global-21b1a2733f7b` for off-palette colour) never
 * matched a spec anchored on the checker id (`ds:token-color`), and the arm WITH the oracle paid for
 * following the oracle — the floor D-27 predicted: "todo piso futuro nasce errado".
 *
 * Two rules, both taken from the grounding table itself, not from any run:
 *
 * 1. Specific before generic. The table says the general token rule is used "quando não há regra
 *    mais específica para a propriedade". An id declared by more than one check is generic; a check
 *    that also declares a non-shared id is bridged ONLY to that one. So colour → the palette rule,
 *    and a colour claim cannot take a spacing unit through "consumo correto dos tokens".
 * 2. One direction. The map widens the EXPECTED unit (a spec anchored on a checker id also accepts
 *    the norm that checker implements). units.ts never applies it to a claim, so a claim citing
 *    `ds:token-radius` does not reach a `ds:token-spacing` unit through the shared generic rule.
 *
 * GENERATED FILE — never edit checker-aliases.json by hand; re-run `npm run checker:aliases` after
 * the validator's grounding changes.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GROUNDING = join(ROOT, "../govbr-ds-validator/src/checkers/grounding.ts");
const OUT = join(ROOT, "checker-aliases.json");

interface CheckGrounding { implements: string[]; basis: string }

/**
 * The rule id each check reports, as the scorer normalizes it (`ds-token-color` → `ds:token-color`).
 * `*` stands for the component name. `null` = the check reports a normative id directly, so there is
 * nothing to bridge. A kind missing here stops the generator: a new check must be mapped on purpose.
 */
const REPORTED_ID: Record<string, string | null> = {
  "token-color": "ds:token-color",
  "token-font-family": "ds:token-font-family",
  "token-font-size": "ds:token-font-size",
  "token-radius": "ds:token-radius",
  "token-spacing": "ds:token-spacing",
  "structure-tag": "ds:structure-*-tag",
  "structure-accessible-name": null, // reports `emag-2.2` itself
  "structure-unknown-classes": "ds:structure-*-variant",
  // 2.7.0: restrições de página (Template Base + e-MAG 1.5), reportadas com id próprio.
  "page-header": "ds:page-header",
  "page-footer": "ds:page-footer",
  "page-skip-link": "ds:page-skip-link",
};

/** Validator ids (`emag-2.2`) normalized the way the scorer does (`emag:2.2`). */
const normalize = (id: string) => (id.startsWith("govbr-") ? id : id.replace(/^(emag|wcag)[-.]/, "$1:"));

const { CHECK_GROUNDING } = (await import(pathToFileURL(GROUNDING).href)) as {
  CHECK_GROUNDING: Record<string, CheckGrounding>;
};

const unmapped = Object.keys(CHECK_GROUNDING).filter(kind => !(kind in REPORTED_ID));
if (unmapped.length) {
  throw new Error(`grounding.ts has checks with no reported-id mapping here: ${unmapped.join(", ")}`);
}

const declaredBy = new Map<string, number>();
for (const g of Object.values(CHECK_GROUNDING)) {
  for (const id of new Set(g.implements)) declaredBy.set(id, (declaredBy.get(id) ?? 0) + 1);
}

const checks: { kind: string; matches: string; aliases: string[]; generic: string[]; basis: string }[] = [];
const withoutNorm: string[] = [];
const reportsNorm: string[] = [];

for (const [kind, g] of Object.entries(CHECK_GROUNDING)) {
  const reported = REPORTED_ID[kind];
  if (g.implements.length === 0) { withoutNorm.push(kind); continue; } // observation, never a finding
  if (reported === null) { reportsNorm.push(kind); continue; }
  const specific = g.implements.filter(id => declaredBy.get(id) === 1);
  const chosen = specific.length > 0 ? specific : g.implements;
  checks.push({
    kind,
    matches: reported,
    aliases: chosen.map(normalize).sort(),
    generic: g.implements.filter(id => !chosen.includes(id)).map(normalize).sort(),
    basis: g.basis,
  });
}

const out = {
  _meta: {
    generatedAt: new Date().toISOString(),
    generatedBy: "scripts/generate-checker-aliases.ts — do not edit by hand",
    source: "govbr-ds-validator/src/checkers/grounding.ts (CHECK_GROUNDING, D-27)",
    direction: "expected unit only: a spec anchored on `matches` also accepts `aliases`; claims are never widened",
    specificBeforeGeneric: "an id declared by more than one check is used only by checks with no specific id",
    checksWithoutNorm: withoutNorm.sort(),
    checksReportingNormDirectly: reportsNorm.sort(),
  },
  checks,
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`checker-aliases.json: ${checks.length} bridged check(s)`);
for (const c of checks) {
  console.log(`  ${c.matches.padEnd(24)} → ${c.aliases.join(", ")}${c.generic.length ? `  (generic not used: ${c.generic.join(", ")})` : ""}`);
}
console.log(`  without norm (observation only): ${withoutNorm.join(", ") || "none"}`);
console.log(`  report a norm directly: ${reportsNorm.join(", ") || "none"}`);
