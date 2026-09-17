import { createHash } from "node:crypto";
import { withPage } from "../evidence/browser.js";
import { DEFAULT_SELECTOR, inspectPageComputedStyles } from "../evidence/inspect.js";
import { checkTokenCompliance, collectTokenObservations, ALL_TOKEN_CHECKS } from "../checkers/tokenCompliance.js";
import { checkComponentStructure, collectStructureObservations } from "../checkers/structure.js";
import { runAxeScanOnPage } from "../checkers/axe.js";
import { getComponentSpecs, getTokenRegistry } from "../data/load.js";
import { deduplicateFindings } from "../responses/findings.js";
/** Process-local LRU. A battery run starts a fresh MCP process, so entries never cross runs. */
export class PageScanCache {
    maxEntries;
    entries = new Map();
    constructor(maxEntries = 20) {
        this.maxEntries = maxEntries;
    }
    get(key) {
        const value = this.entries.get(key);
        if (!value)
            return undefined;
        this.entries.delete(key);
        this.entries.set(key, value);
        return value;
    }
    set(key, value) {
        this.entries.set(key, value);
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (!oldest)
                break;
            this.entries.delete(oldest);
        }
    }
}
function hash(value) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export async function fingerprintPage(page) {
    const state = await page.evaluate(() => ({
        url: location.href,
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
        html: document.documentElement.outerHTML,
        activeElement: document.activeElement
            ? {
                tag: document.activeElement.tagName.toLowerCase(),
                id: document.activeElement.id || null,
                testId: document.activeElement.getAttribute("data-testid"),
            }
            : null,
        controls: Array.from(document.querySelectorAll("input, select, textarea, [aria-expanded], [aria-selected], [aria-checked]"))
            .map((element) => {
            const control = element;
            return {
                id: element.id || null,
                name: element.getAttribute("name"),
                value: "value" in control ? control.value : null,
                checked: "checked" in control ? control.checked : null,
                expanded: element.getAttribute("aria-expanded"),
                selected: element.getAttribute("aria-selected"),
                ariaChecked: element.getAttribute("aria-checked"),
            };
        }),
    }));
    return `sha256:${hash(state)}`;
}
function tokenProperties(checks) {
    const properties = new Set();
    if (checks.includes("color"))
        ["backgroundColor", "color", "borderColor"].forEach((p) => properties.add(p));
    if (checks.includes("font"))
        ["fontFamily", "fontSize"].forEach((p) => properties.add(p));
    if (checks.includes("radius"))
        ["borderRadius", "fontSize"].forEach((p) => properties.add(p));
    if (checks.includes("spacing"))
        ["padding", "margin"].forEach((p) => properties.add(p));
    return [...properties];
}
function normalizedRequest(request) {
    return {
        selectors: [...(request.selectors ?? [])].sort(),
        checks: [...(request.checks ?? ["tokens", "structure", "axe"])].sort(),
        tokenChecks: [...(request.tokenChecks ?? ALL_TOKEN_CHECKS)].sort(),
        components: [...(request.components ?? [])].sort(),
        actions: request.actions ?? [],
    };
}
export async function applyActions(page, actions) {
    for (const action of actions) {
        if (action.action === "click") {
            await page.locator(action.selector).first().click();
        }
        else if (action.action === "fill") {
            await page.locator(action.selector).first().fill(action.value);
        }
        else if (action.action === "press") {
            if (action.selector)
                await page.locator(action.selector).first().press(action.key);
            else
                await page.keyboard.press(action.key);
        }
        else if (action.selector) {
            await page.locator(action.selector).first().waitFor({ state: "visible", timeout: 10_000 });
        }
        else {
            await page.waitForTimeout(Math.min(action.ms ?? 0, 5_000));
        }
    }
}
export async function scanPage(request, cache) {
    return withPage(request.url, async (page) => {
        await applyActions(page, request.actions ?? []);
        const stateFingerprint = await fingerprintPage(page);
        const normalized = normalizedRequest(request);
        const cacheKey = hash({ stateFingerprint, ...normalized });
        const cached = cache.get(cacheKey);
        if (cached)
            return { ...cached, cacheHit: true };
        const checks = normalized.checks;
        const activeTokenChecks = normalized.tokenChecks;
        const specs = getComponentSpecs().components;
        const componentTargets = normalized.components.length ? normalized.components : Object.keys(specs);
        const selectors = normalized.selectors.length ? normalized.selectors : [DEFAULT_SELECTOR];
        const rawFindings = [];
        const observations = [];
        let elementsInspected = 0;
        let componentsFound = [];
        if (checks.includes("tokens") || checks.includes("structure")) {
            const properties = checks.includes("tokens") ? tokenProperties(activeTokenChecks) : [];
            const evidence = await inspectPageComputedStyles(page, request.url, selectors, properties);
            elementsInspected = evidence.count;
            componentsFound = [
                ...new Set(evidence.elements.flatMap((element) => element.classes.filter((name) => /^br-[a-z]+$/.test(name)).map((name) => name.slice(3)))),
            ];
            if (checks.includes("tokens")) {
                rawFindings.push(...checkTokenCompliance({ url: request.url }, evidence.elements, getTokenRegistry(), activeTokenChecks));
                if (activeTokenChecks.includes("font")) {
                    observations.push(...collectTokenObservations({ url: request.url }, evidence.elements, getTokenRegistry()));
                }
            }
            if (checks.includes("structure")) {
                for (const component of componentTargets) {
                    const spec = specs[component];
                    if (!spec)
                        continue;
                    rawFindings.push(...checkComponentStructure({ url: request.url }, evidence.elements, spec));
                    observations.push(...collectStructureObservations({ url: request.url }, evidence.elements, spec));
                }
            }
        }
        let axe;
        if (checks.includes("axe")) {
            const result = await runAxeScanOnPage(page, request.url, normalized.selectors.length ? normalized.selectors.join(", ") : undefined);
            rawFindings.push(...result.findings);
            axe = {
                engine: result.engine,
                passes: result.passeCount,
                incomplete: result.incompleteCount,
            };
        }
        const deduplicated = deduplicateFindings(rawFindings);
        const value = {
            url: request.url,
            stateFingerprint,
            findings: deduplicated.findings,
            observations,
            coverage: {
                checks,
                selectors: normalized.selectors,
                evidenceSelectors: checks.includes("tokens") || checks.includes("structure") ? selectors : [],
                axeScope: checks.includes("axe")
                    ? (normalized.selectors.length ? normalized.selectors.join(", ") : "document")
                    : null,
                elementsInspected,
                componentsRequested: componentTargets,
                componentsFound,
                actionsApplied: (request.actions ?? []).map((action) => ({
                    action: action.action,
                    ...(action.selector ? { selector: action.selector } : {}),
                    ...(action.action === "press" ? { key: action.key } : {}),
                })),
                ...(axe ? { axe } : {}),
            },
            deduplication: {
                input: deduplicated.inputCount,
                output: deduplicated.outputCount,
                merged: deduplicated.merged,
                key: deduplicated.key,
            },
        };
        cache.set(cacheKey, value);
        return { ...value, cacheHit: false, cacheMissReason: "no-exact-fingerprint-and-scope-match" };
    }, request.viewport ? { viewport: request.viewport } : {});
}
//# sourceMappingURL=pageScan.js.map