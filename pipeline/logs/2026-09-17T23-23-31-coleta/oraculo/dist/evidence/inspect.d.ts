/**
 * C5 phase 1 — evidence gathering. Returns computed CSS + focus-state styles
 * + accessibility attributes for elements on a page. This is the one piece of
 * evidence @playwright/mcp does not expose (it gives the accessibility tree,
 * not computed styles).
 *
 * Shadow DOM. `document.querySelectorAll` stops at every shadow boundary, and the gov.br web
 * components (`@govbr-ds/webcomponents`) render their entire content inside an OPEN shadow root.
 * A real portal built on them showed the consequence: axe, which traverses open shadow trees,
 * reported the violations inside a component, and these checkers reported nothing — they were
 * looking at empty host elements. So the traversal here descends into every open shadow root,
 * and locators cross the boundary with ` >>> `:
 *
 *     br-input >>> input.br-input      → the <input> inside the component's shadow tree
 *
 * The separator is part of the contract, not decoration: a locator has to find its way back to
 * the element it names — `verify_finding` re-inspects live by locator, and the scoring anchors
 * resolve the agent's selector and the ground truth's to the same node. A path flattened into a
 * plain CSS selector would resolve to the host, or to nothing, and the mistake would be silent.
 * Closed shadow roots stay invisible to everyone, including axe; nothing here can change that.
 */
import type { PageEvidence } from "./types.js";
import type { Page } from "playwright";
export declare const DEFAULT_SELECTOR = "button, a, input, select, textarea, [role='button'], [role='link'], [role='checkbox'], [role='radio'], [class*='br-']";
/** Separator between shadow trees in a locator: `host >>> element-inside-the-shadow-root`. */
export declare const SHADOW_STEP = ">>>";
export declare const COMPUTED_STYLE_PROPERTIES: readonly ["backgroundColor", "color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "borderRadius", "borderColor", "border", "padding", "margin", "outline", "cursor", "opacity"];
export declare const FOCUS_STYLE_PROPERTIES: readonly ["outline", "outlineColor", "outlineWidth", "outlineStyle", "outlineOffset", "boxShadow"];
export declare const STYLE_PROPERTIES: readonly ["backgroundColor", "color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "borderRadius", "borderColor", "border", "padding", "margin", "outline", "cursor", "opacity", "outline", "outlineColor", "outlineWidth", "outlineStyle", "outlineOffset", "boxShadow"];
export type StyleProperty = (typeof STYLE_PROPERTIES)[number];
export declare function inspectComputedStyles(url: string, selector?: string | string[], properties?: StyleProperty[]): Promise<PageEvidence>;
/** Collect evidence from an already-loaded page so aggregate scans share one exact DOM state. */
export declare function inspectPageComputedStyles(page: Page, url: string, selector?: string | string[], properties?: StyleProperty[]): Promise<PageEvidence>;
