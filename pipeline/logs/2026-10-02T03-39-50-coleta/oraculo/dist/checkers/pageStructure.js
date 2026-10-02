import { nextFindingId } from "../schema/finding.js";
import { getPageRules } from "../data/load.js";
import { PAGE_REGION_SELECTORS } from "../evidence/pageFacts.js";
import { groundingFor } from "./grounding.js";
import { EXPECTED_CONDITIONS } from "../schema/structuredClaims.js";
const REGION_CHECKS = [
    { region: "header", kind: "page-header", heading: "Área de Cabeçalho (Obrigatório)", component: "Header" },
    { region: "footer", kind: "page-footer", heading: "Área de Rodapé (Obrigatório)", component: "Footer" },
];
/** O trecho da página oficial que nomeia a área e a declara obrigatória — provado presente pelos testes. */
export function templateBaseExcerpt(heading) {
    const text = getPageRules().categories.page_structure?.sections?.["visao-geral"];
    if (typeof text !== "string")
        return null;
    const start = text.indexOf(heading);
    if (start < 0)
        return null;
    const body = text.slice(start);
    const firstSentence = body.slice(heading.length).split(/(?<=\.)\s/)[0]?.replace(/\s+/g, " ").trim() ?? "";
    return `${heading} — ${firstSentence}`;
}
function pageSource() {
    const rules = getPageRules();
    return { url: rules.categories.page_structure?.url ?? "https://www.gov.br/ds/templates/base", scrapedAt: rules.meta.scrapedAt };
}
/** As restrições de página publicadas por `get_page_rules` — as mesmas que o scanner e o portão usam. */
export function pageConstraints() {
    const source = pageSource();
    const regions = REGION_CHECKS.map(({ region, kind, heading, component }) => ({
        id: `ds-page-${region}`,
        kind: "page-region",
        region,
        selector: PAGE_REGION_SELECTORS[region],
        description: `O Template Base tem uma ${heading.replace(/ \(Obrigatório\)$/, "")} obrigatória, ocupada pelo componente ${component} ` +
            `(${PAGE_REGION_SELECTORS[region]} do core ou o web component <br-${region}>). Uma página sem nenhum dos dois não a preenche.`,
        force: "required",
        implements: groundingFor(kind),
        claim: { expectedCondition: EXPECTED_CONDITIONS.pageRegion, fields: ["region", "observedCount", "expectedCondition"] },
        source: { ...source, excerpt: templateBaseExcerpt(heading) },
    }));
    return [
        ...regions,
        {
            id: "ds-page-skip-link",
            kind: "page-skip-link",
            region: "skip-link",
            selector: "a[href]",
            description: "O primeiro link da página deve ser o salto para o conteúdo: uma âncora interna (href=\"#id\") cujo alvo existe " +
                "no documento (e-MAG 1.5). Página sem nenhum link não é cobrada.",
            force: "required",
            implements: groundingFor("page-skip-link"),
            claim: { expectedCondition: EXPECTED_CONDITIONS.skipLink, fields: ["region", "firstLinkHref", "expectedCondition"] },
            source: { url: "https://emag.governoeletronico.gov.br/", scrapedAt: source.scrapedAt, excerpt: "Recomendação 1.5 — Fornecer âncoras para ir direto a um bloco de conteúdo: o primeiro link da página deve ser o salto para o conteúdo." },
        },
    ];
}
export function checkPageStructure(page, facts) {
    const findings = [];
    const element = { locator: "html", page: page.url };
    for (const constraint of pageConstraints()) {
        if (constraint.kind === "page-region") {
            const region = constraint.region;
            const count = facts.regions[region];
            if (count > 0 || constraint.implements.length === 0)
                continue;
            findings.push({
                id: nextFindingId(),
                rule: { id: constraint.id, source: "govbr-ds-page", description: constraint.description, implements: constraint.implements },
                element,
                evidence: {
                    observed: `Nenhum elemento ${constraint.selector} nem web component <br-${region}> no documento (DOM claro e shadow roots abertos).`,
                    expected: `Uma ${region === "header" ? "Área de Cabeçalho com o componente Header" : "Área de Rodapé com o componente Footer"} (${constraint.selector} ou <br-${region}>), como o Template Base exige.`,
                    data: { region, selector: constraint.selector, observedCount: count, expectedCondition: EXPECTED_CONDITIONS.pageRegion },
                },
                severity: "serious",
                nature: "syntactic",
                mode: "display",
                pathway: "deterministic",
            });
            continue;
        }
        // page-skip-link
        if (constraint.implements.length === 0 || facts.linkCount === 0 || !facts.firstLink || facts.firstLink.skipsToContent)
            continue;
        const first = facts.firstLink;
        findings.push({
            id: nextFindingId(),
            rule: { id: constraint.id, source: "govbr-ds-page", description: constraint.description, implements: constraint.implements },
            element,
            evidence: {
                observed: first.targetId === null
                    ? `O primeiro link da página (href="${first.href}"${first.text ? `, "${first.text}"` : ""}) não é uma âncora interna.`
                    : `O primeiro link da página aponta para "#${first.targetId}", que não existe no documento.`,
                expected: "O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).",
                data: { region: "skip-link", firstLinkHref: first.href, targetExists: first.targetExists, expectedCondition: EXPECTED_CONDITIONS.skipLink },
            },
            severity: "serious",
            nature: "syntactic",
            mode: "display",
            pathway: "deterministic",
        });
    }
    return findings;
}
//# sourceMappingURL=pageStructure.js.map