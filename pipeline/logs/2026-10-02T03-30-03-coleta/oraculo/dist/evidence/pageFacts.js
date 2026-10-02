/** Regiões do Template Base e do Padrão Mínimo: classe raiz do core e tag do web component. */
export const PAGE_REGION_SELECTORS = {
    header: ".br-header",
    footer: ".br-footer",
    breadcrumb: ".br-breadcrumb",
    cookiebar: ".br-cookiebar",
    menu: ".br-menu",
};
export async function inspectPageStructure(page, url) {
    const facts = await page.evaluate((selectors) => {
        const regionNames = Object.keys(selectors);
        const regions = Object.fromEntries(regionNames.map((r) => [r, 0]));
        const links = [];
        const ids = new Set();
        let mainLandmarks = 0;
        const occupies = (el, region) => el.classList.contains(`br-${region}`) || el.tagName.toLowerCase() === `br-${region}`;
        // Ordem composta: o shadow root de um host vem antes dos filhos claros do host.
        const walk = (root, counted) => {
            for (const el of Array.from(root.children)) {
                if (el.id)
                    ids.add(el.id);
                if (el.tagName.toLowerCase() === "main" || el.getAttribute("role") === "main")
                    mainLandmarks += 1;
                if (el.tagName.toLowerCase() === "a" && el.hasAttribute("href"))
                    links.push(el);
                const nowCounted = new Set(counted);
                for (const region of regionNames) {
                    if (!counted.has(region) && occupies(el, region)) {
                        regions[region] += 1;
                        nowCounted.add(region);
                    }
                }
                if (el.shadowRoot)
                    walk(el.shadowRoot, nowCounted);
                walk(el, nowCounted);
            }
        };
        walk(document.documentElement, new Set());
        const first = links[0];
        let firstLink = null;
        if (first) {
            const href = first.getAttribute("href") ?? "";
            const targetId = href.startsWith("#") && href.length > 1 ? decodeURIComponent(href.slice(1)) : null;
            const targetExists = targetId !== null &&
                (ids.has(targetId) || document.querySelector(`a[name="${CSS.escape(targetId)}"]`) !== null);
            firstLink = {
                href,
                text: (first.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
                targetId,
                targetExists,
                skipsToContent: targetExists,
            };
        }
        return {
            lang: document.documentElement.getAttribute("lang"),
            title: document.title,
            regions,
            mainLandmarks,
            linkCount: links.length,
            firstLink,
        };
    }, PAGE_REGION_SELECTORS);
    return { url, ...facts, regions: facts.regions };
}
//# sourceMappingURL=pageFacts.js.map