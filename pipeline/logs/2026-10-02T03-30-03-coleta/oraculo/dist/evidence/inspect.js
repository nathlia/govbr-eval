import { withPage } from "./browser.js";
import { AUTHORED_CSS_NAMES, partitionDeclarations } from "./cssProvenance.js";
import { getDsStylesheet } from "../data/load.js";
export const DEFAULT_SELECTOR = "button, a, input, select, textarea, [role='button'], [role='link'], [role='checkbox'], [role='radio'], [class*='br-']";
/** Separator between shadow trees in a locator: `host >>> element-inside-the-shadow-root`. */
export const SHADOW_STEP = ">>>";
export const COMPUTED_STYLE_PROPERTIES = [
    "backgroundColor", "color", "fontFamily", "fontSize", "fontWeight", "lineHeight",
    "borderRadius", "borderColor", "border", "padding", "margin", "outline", "cursor", "opacity",
];
export const FOCUS_STYLE_PROPERTIES = [
    "outline", "outlineColor", "outlineWidth", "outlineStyle", "outlineOffset", "boxShadow",
];
export const STYLE_PROPERTIES = [...COMPUTED_STYLE_PROPERTIES, ...FOCUS_STYLE_PROPERTIES];
function normalizeSelectors(selector) {
    const values = selector === undefined ? [DEFAULT_SELECTOR] : Array.isArray(selector) ? selector : [selector];
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
export async function inspectComputedStyles(url, selector, properties = [...STYLE_PROPERTIES]) {
    return withPage(url, (page) => inspectPageComputedStyles(page, url, selector, properties));
}
/** Collect evidence from an already-loaded page so aggregate scans share one exact DOM state. */
export async function inspectPageComputedStyles(page, url, selector, properties = [...STYLE_PROPERTIES]) {
    const selectors = normalizeSelectors(selector);
    const target = selectors.join(", ");
    const requested = [...new Set(properties)];
    const computedProperties = requested.filter((p) => COMPUTED_STYLE_PROPERTIES.includes(p));
    const focusProperties = requested.filter((p) => FOCUS_STYLE_PROPERTIES.includes(p));
    const elements = await page.evaluate(({ sels, shadowStep, computedProps, focusProps, cssNames }) => {
        /**
         * Every element matching `selector`, in this root and in every open shadow root below it.
         * A selector that already names a shadow path (`host >>> inner`) is walked hop by hop:
         * each hop resolves inside the previous hop's shadow root, never across it.
         */
        function deepQueryAll(selector) {
            if (selector.includes(shadowStep)) {
                const hops = selector.split(shadowStep).map((s) => s.trim()).filter(Boolean);
                let roots = [document];
                let found = [];
                hops.forEach((hop, i) => {
                    found = roots.flatMap((root) => Array.from(root.querySelectorAll(hop)));
                    if (i < hops.length - 1) {
                        roots = found
                            .map((el) => el.shadowRoot)
                            .filter((r) => r !== null);
                    }
                });
                return found;
            }
            const out = [];
            const visit = (root) => {
                out.push(...Array.from(root.querySelectorAll(selector)));
                for (const el of Array.from(root.querySelectorAll("*"))) {
                    if (el.shadowRoot)
                        visit(el.shadowRoot);
                }
            };
            visit(document);
            return out;
        }
        // Build a stable, unique CSS locator for an element, within its own root.
        function locatorWithinRoot(el) {
            if (el.id)
                return `#${CSS.escape(el.id)}`;
            const testId = el.getAttribute("data-testid");
            if (testId)
                return `[data-testid="${testId}"]`;
            const parts = [];
            let node = el;
            while (node && node !== document.body && parts.length < 5) {
                const parent = node.parentElement;
                if (!parent) {
                    // Top of a shadow tree: there is no parent element, but the node still needs a
                    // segment — without one the locator ends at the host and points at nothing.
                    const root = node.getRootNode();
                    const tag = node.tagName.toLowerCase();
                    const siblings = root instanceof ShadowRoot
                        ? Array.from(root.children).filter((c) => c.tagName === node.tagName)
                        : [];
                    const idx = siblings.indexOf(node) + 1;
                    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
                    break;
                }
                const tag = node.tagName.toLowerCase();
                const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
                const idx = siblings.indexOf(node) + 1;
                parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
                if (parent.id) {
                    parts.unshift(`#${CSS.escape(parent.id)}`);
                    break;
                }
                const parentTestId = parent.getAttribute("data-testid");
                if (parentTestId) {
                    parts.unshift(`[data-testid="${parentTestId}"]`);
                    break;
                }
                node = parent;
            }
            return parts.join(" > ");
        }
        /** Full locator: one segment per shadow tree crossed, joined by ` >>> `. */
        function locatorFor(el) {
            const segments = [];
            let node = el;
            for (let depth = 0; depth < 6; depth += 1) {
                segments.unshift(locatorWithinRoot(node));
                const root = node.getRootNode();
                if (root instanceof ShadowRoot)
                    node = root.host;
                else
                    break;
            }
            return segments.join(` ${shadowStep} `);
        }
        const matched = [];
        const seen = new Set();
        for (const selector of sels) {
            for (const el of deepQueryAll(selector)) {
                if (!seen.has(el)) {
                    seen.add(el);
                    matched.push(el);
                }
            }
        }
        return matched.map((el) => {
            const htmlEl = el;
            const computed = window.getComputedStyle(el);
            const allComputed = {
                backgroundColor: computed.backgroundColor,
                color: computed.color,
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                lineHeight: computed.lineHeight,
                borderRadius: computed.borderRadius,
                borderColor: computed.borderColor,
                border: computed.border,
                padding: computed.padding,
                margin: computed.margin,
                outline: computed.outline,
                cursor: computed.cursor,
                opacity: computed.opacity,
            };
            const snapshot = Object.fromEntries(computedProps.map((property) => [property, allComputed[property]]));
            // getComputedStyle mistura origens que o verificador não pode confundir: CSS da página,
            // CSS do próprio DS, valores resolvidos pelo layout (por exemplo margin:auto) e defaults do
            // browser. Aqui saem as declarações que casam diretamente com o elemento, cada uma com o
            // seletor da regra; quem separa página de DS é `partitionDeclarations`, fora do navegador.
            const authoredRaw = [];
            const collect = (style, selectorText) => {
                for (const property of computedProps) {
                    for (const cssName of cssNames[property] ?? []) {
                        const value = style.getPropertyValue(cssName).trim();
                        if (value)
                            authoredRaw.push({ property, cssName, value: value + (style.getPropertyPriority(cssName) ? " !important" : ""), selectorText });
                    }
                }
            };
            const visitRules = (rules) => {
                for (const rule of Array.from(rules)) {
                    if (rule instanceof CSSStyleRule) {
                        try {
                            if (el.matches(rule.selectorText))
                                collect(rule.style, rule.selectorText);
                        }
                        catch { /* seletor não suportado pelo browser desta medição */ }
                        continue;
                    }
                    if (rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches)
                        continue;
                    if (rule instanceof CSSSupportsRule && !CSS.supports(rule.conditionText))
                        continue;
                    const nested = rule.cssRules;
                    if (nested)
                        visitRules(nested);
                }
            };
            for (const sheet of Array.from(document.styleSheets)) {
                try {
                    if (sheet.cssRules)
                        visitRules(sheet.cssRules);
                }
                catch { /* folha cross-origin: não é autoria inspecionável da página */ }
            }
            collect(htmlEl.style, null);
            let focused = {};
            if (focusProps.length > 0) {
                // Capture focus-state styles only when requested.
                htmlEl.focus({ preventScroll: true });
                const fc = window.getComputedStyle(el);
                const allFocused = {
                    outline: fc.outline,
                    outlineColor: fc.outlineColor,
                    outlineWidth: fc.outlineWidth,
                    outlineStyle: fc.outlineStyle,
                    outlineOffset: fc.outlineOffset,
                    boxShadow: fc.boxShadow,
                };
                focused = Object.fromEntries(focusProps.map((property) => [property, allFocused[property]]));
                htmlEl.blur();
            }
            const text = el.textContent?.trim() ?? "";
            return {
                locator: locatorFor(el),
                tagName: el.tagName.toLowerCase(),
                id: el.id || null,
                classes: Array.from(el.classList),
                attributes: {
                    type: el.getAttribute("type"),
                    role: el.getAttribute("role"),
                    ariaLabel: el.getAttribute("aria-label"),
                    ariaRequired: el.getAttribute("aria-required"),
                    ariaDisabled: el.getAttribute("aria-disabled"),
                    ariaDescribedby: el.getAttribute("aria-describedby"),
                    ariaHidden: el.getAttribute("aria-hidden"),
                    disabled: el.hasAttribute("disabled"),
                    required: el.hasAttribute("required"),
                    htmlFor: el.getAttribute("for"),
                    placeholder: el.getAttribute("placeholder"),
                    alt: el.getAttribute("alt"),
                    tabindex: el.getAttribute("tabindex"),
                    href: el.getAttribute("href"),
                },
                content: {
                    textContent: text.slice(0, 100),
                    hasVisibleText: text.length > 0,
                    hasIconOnly: !text && el.querySelector("i, svg, img") !== null,
                },
                inlineStyle: el.getAttribute("style"),
                authoredRaw,
                computed: snapshot,
                focused,
                outerHTML: el.outerHTML.slice(0, 500),
                inShadowDom: el.getRootNode() instanceof ShadowRoot,
            };
        });
    }, {
        sels: selectors,
        shadowStep: SHADOW_STEP,
        computedProps: computedProperties,
        focusProps: focusProperties,
        cssNames: AUTHORED_CSS_NAMES,
    });
    const dsStylesheet = getDsStylesheet();
    const withProvenance = elements.map(({ authoredRaw, ...element }) => ({
        ...element,
        ...partitionDeclarations(authoredRaw, dsStylesheet),
    }));
    return {
        url,
        selector: target,
        selectors,
        properties: requested,
        count: withProvenance.length,
        elements: withProvenance,
    };
}
//# sourceMappingURL=inspect.js.map