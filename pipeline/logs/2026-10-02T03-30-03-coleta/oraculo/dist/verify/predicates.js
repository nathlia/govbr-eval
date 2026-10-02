import { checkTokenCompliance } from "../checkers/tokenCompliance.js";
import { checkComponentStructure } from "../checkers/structure.js";
import { checkPageStructure, pageConstraints } from "../checkers/pageStructure.js";
import { normalizeColor } from "../checkers/color.js";
import { getComponentSpecs, getTokenRegistry } from "../data/load.js";
import { EXPECTED_CONDITIONS } from "../schema/structuredClaims.js";
const COLOR_PROPERTIES = new Set(["background-color", "color", "border-color"]);
const SPACING_PROPERTIES = new Set(["padding", "margin"]);
function onEveryElement(elements, label, failure) {
    const failures = elements.map(failure).filter((value) => value !== null);
    if (failures.length > 0) {
        return {
            status: "contradicted",
            detail: `${failures.length} de ${elements.length} elemento(s) não sustentam a alegação (${label}): ${failures.slice(0, 3).join("; ")}.`,
        };
    }
    return { status: "verified", detail: `Violação recalculada em ${elements.length} de ${elements.length} elemento(s): ${label}.` };
}
function claimOnEveryElement(elements, label, failure) {
    const failures = elements.map(failure).filter((value) => value !== null);
    if (failures.length > 0) {
        return {
            status: "contradicted",
            detail: `${failures.length} de ${elements.length} elemento(s) contradizem os dados estruturados (${label}): ${failures.slice(0, 3).join("; ")}.`,
        };
    }
    return { status: "consistent", detail: `Dados estruturados conferidos em ${elements.length} de ${elements.length} elemento(s): ${label}.` };
}
function normalizeCssValue(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}
function normalizeFontFamily(value) {
    return normalizeCssValue(value).replace(/["']/g, "").replace(/\s*,\s*/g, ",");
}
function tokenPredicate(id, check, properties, label, verifyClaim, matches) {
    return {
        id,
        properties,
        verifyClaim(elements) {
            return claimOnEveryElement(elements, label, verifyClaim);
        },
        evaluate(elements, url) {
            const registry = getTokenRegistry();
            return onEveryElement(elements, label, (element) => checkTokenCompliance({ url }, [element], registry, [check]).some(matches)
                ? null
                : `${element.locator} não viola neste estado`);
        },
    };
}
export function selectPredicate(finding) {
    const { source, id } = finding.rule;
    const data = (finding.evidence.data ?? {});
    const none = (reason, claimStatus) => ({ predicate: null, reason, claimStatus });
    const generic = `Nenhum predicado implementado para ${source} '${id}': a regra existe, mas o oráculo não decide ` +
        "mecanicamente a violação alegada. Localizar o elemento não confirma a alegação.";
    if (source === "govbr-ds-token") {
        const property = typeof data.property === "string" ? data.property : null;
        switch (id) {
            case "ds-token-color": {
                if (data.property === undefined || data.observedHex === undefined || data.expectedCondition === undefined) {
                    return none("ds-token-color só é verificável com evidence.data.property (background-color, color ou border-color), observedHex e expectedCondition.", "missing");
                }
                const observedHex = typeof data.observedHex === "string" ? normalizeColor(data.observedHex) : null;
                if (!property || !COLOR_PROPERTIES.has(property) || !observedHex || data.expectedCondition !== EXPECTED_CONDITIONS.tokenColor) {
                    return none(`Dados estruturados contraditórios para ds-token-color: property/observedHex devem ser suportados e expectedCondition deve ser '${EXPECTED_CONDITIONS.tokenColor}'.`, "contradicted");
                }
                const computedProperty = {
                    "background-color": "backgroundColor",
                    color: "color",
                    "border-color": "borderColor",
                }[property];
                return {
                    predicate: tokenPredicate("token-color", "color", ["backgroundColor", "color", "borderColor"], `${property} ${observedHex} fora do registro de tokens`, (element) => normalizeColor(element.computed[computedProperty] ?? "") === observedHex
                        ? null
                        : `${element.locator}: ${property} vivo é ${element.computed[computedProperty] ?? "(ausente)"}, não ${observedHex}`, (f) => f.evidence.data?.property === property && f.evidence.data?.observedHex === observedHex),
                };
            }
            case "ds-token-font-family": {
                if (data.property === undefined || data.observed === undefined || data.expectedCondition === undefined) {
                    return none("ds-token-font-family só é verificável com evidence.data.property='font-family', observed e expectedCondition.", "missing");
                }
                if (property !== "font-family" || typeof data.observed !== "string" || !data.observed.trim() || data.expectedCondition !== EXPECTED_CONDITIONS.tokenFontFamily) {
                    return none(`Dados estruturados contraditórios para ds-token-font-family: property/observed devem ser suportados e expectedCondition deve ser '${EXPECTED_CONDITIONS.tokenFontFamily}'.`, "contradicted");
                }
                const observed = data.observed;
                return {
                    predicate: tokenPredicate("token-font-family", "font", ["fontFamily", "fontSize"], `font-family ${observed} fora da família do DS`, (element) => normalizeFontFamily(element.computed.fontFamily ?? "") === normalizeFontFamily(observed)
                        ? null
                        : `${element.locator}: font-family vivo é ${element.computed.fontFamily ?? "(ausente)"}, não ${observed}`, (f) => f.rule.id === "ds-token-font-family" && f.evidence.data?.property === "font-family" &&
                        typeof f.evidence.data?.observed === "string" && normalizeFontFamily(f.evidence.data.observed) === normalizeFontFamily(observed)),
                };
            }
            case "ds-token-radius": {
                if (data.property === undefined || data.observed === undefined || data.expectedCondition === undefined) {
                    return none("ds-token-radius só é verificável com evidence.data.property='border-radius', observed e expectedCondition.", "missing");
                }
                if (property !== "border-radius" || typeof data.observed !== "string" || !data.observed.trim() || data.expectedCondition !== EXPECTED_CONDITIONS.tokenRadius) {
                    return none(`Dados estruturados contraditórios para ds-token-radius: property/observed devem ser suportados e expectedCondition deve ser '${EXPECTED_CONDITIONS.tokenRadius}'.`, "contradicted");
                }
                const observed = data.observed;
                return {
                    predicate: tokenPredicate("token-radius", "radius", ["borderRadius", "fontSize"], `border-radius ${observed} fora da escala do DS`, (element) => normalizeCssValue(element.computed.borderRadius ?? "") === normalizeCssValue(observed)
                        ? null
                        : `${element.locator}: border-radius vivo é ${element.computed.borderRadius ?? "(ausente)"}, não ${observed}`, (f) => f.rule.id === "ds-token-radius" && f.evidence.data?.property === "border-radius" &&
                        typeof f.evidence.data?.observed === "string" && normalizeCssValue(f.evidence.data.observed) === normalizeCssValue(observed)),
                };
            }
            case "ds-token-spacing": {
                if (data.property === undefined || data.observed === undefined || data.expectedCondition === undefined) {
                    return none("ds-token-spacing só é verificável com evidence.data.property (padding ou margin), observed e expectedCondition.", "missing");
                }
                if (!property || !SPACING_PROPERTIES.has(property) || typeof data.observed !== "string" || !data.observed.trim() || data.expectedCondition !== EXPECTED_CONDITIONS.tokenSpacing) {
                    return none(`Dados estruturados contraditórios para ds-token-spacing: property/observed devem ser suportados e expectedCondition deve ser '${EXPECTED_CONDITIONS.tokenSpacing}'.`, "contradicted");
                }
                const observed = data.observed;
                const computedProperty = property;
                return {
                    predicate: tokenPredicate("token-spacing", "spacing", ["padding", "margin"], `${property} ${observed} fora da escala do DS`, (element) => normalizeCssValue(element.computed[computedProperty] ?? "") === normalizeCssValue(observed)
                        ? null
                        : `${element.locator}: ${property} vivo é ${element.computed[computedProperty] ?? "(ausente)"}, não ${observed}`, (f) => f.rule.id === "ds-token-spacing" && f.evidence.data?.property === property &&
                        typeof f.evidence.data?.observed === "string" && normalizeCssValue(f.evidence.data.observed) === normalizeCssValue(observed)),
                };
            }
            default:
                return none(generic);
        }
    }
    if (source === "govbr-ds-structure") {
        const spec = Object.values(getComponentSpecs().components).find((candidate) => `ds-structure-${candidate.name}-tag` === id);
        if (!spec || spec.tags.length === 0)
            return none(generic);
        if (data.component === undefined || data.observedTag === undefined || data.expectedCondition === undefined) {
            return none(`${id} só é verificável com evidence.data.component, observedTag e expectedCondition.`, "missing");
        }
        if (data.component !== spec.name || typeof data.observedTag !== "string" || !data.observedTag.trim() || data.expectedCondition !== EXPECTED_CONDITIONS.structureTag) {
            return none(`Dados estruturados contraditórios para ${id}: component/observedTag devem ser suportados e expectedCondition deve ser '${EXPECTED_CONDITIONS.structureTag}'.`, "contradicted");
        }
        const observedTag = data.observedTag.toLowerCase();
        return {
            predicate: {
                id: "structure-tag",
                properties: [],
                verifyClaim: (elements) => claimOnEveryElement(elements, `${spec.rootClass} aplicado a <${observedTag}>`, (element) => element.tagName.toLowerCase() === observedTag
                    ? null
                    : `${element.locator}: tag viva é <${element.tagName}>, não <${observedTag}>`),
                evaluate: (elements, url) => onEveryElement(elements, `tag raiz de ${spec.rootClass}`, (element) => checkComponentStructure({ url }, [element], spec).some((f) => f.rule.id === id)
                    ? null
                    : `${element.locator} (<${element.tagName}>) não viola neste estado`),
            },
        };
    }
    if (source === "govbr-ds-page") {
        const constraint = pageConstraints().find((candidate) => candidate.id === id);
        if (!constraint)
            return none(generic);
        const condition = constraint.claim.expectedCondition;
        if (constraint.kind === "page-region") {
            if (data.region === undefined || data.observedCount === undefined || data.expectedCondition === undefined) {
                return none(`${id} só é verificável com evidence.data.region, observedCount e expectedCondition ('${condition}').`, "missing");
            }
            if (data.region !== constraint.region || typeof data.observedCount !== "number" || data.expectedCondition !== condition) {
                return none(`Dados estruturados contraditórios para ${id}: region deve ser '${constraint.region}', observedCount numérico e expectedCondition '${condition}'.`, "contradicted");
            }
            const region = constraint.region;
            const observedCount = data.observedCount;
            return {
                predicate: {
                    id: "page-region",
                    properties: [],
                    needsPageFacts: true,
                    verifyClaim: (_elements, facts) => {
                        if (!facts)
                            return { status: "contradicted", detail: "Fatos de página indisponíveis para o predicado page-region." };
                        const live = facts.regions[region];
                        return live === observedCount
                            ? { status: "consistent", detail: `Dados estruturados conferidos no documento: ${live} elemento(s) ${constraint.selector}.` }
                            : { status: "contradicted", detail: `O documento tem ${live} elemento(s) ${constraint.selector}, não ${observedCount}.` };
                    },
                    evaluate: (_elements, url, facts) => {
                        if (!facts)
                            return { status: "contradicted", detail: "Fatos de página indisponíveis para o predicado page-region." };
                        return checkPageStructure({ url }, facts).some((f) => f.rule.id === id)
                            ? { status: "verified", detail: `Violação recalculada no documento: nenhum ${constraint.selector} (${region} do Template Base).` }
                            : { status: "contradicted", detail: `O documento tem ${facts.regions[region]} elemento(s) ${constraint.selector}; não viola neste estado.` };
                    },
                },
            };
        }
        if (data.region === undefined || data.firstLinkHref === undefined || data.expectedCondition === undefined) {
            return none(`${id} só é verificável com evidence.data.region='skip-link', firstLinkHref e expectedCondition ('${condition}').`, "missing");
        }
        if (data.region !== "skip-link" || typeof data.firstLinkHref !== "string" || data.expectedCondition !== condition) {
            return none(`Dados estruturados contraditórios para ${id}: region deve ser 'skip-link', firstLinkHref texto e expectedCondition '${condition}'.`, "contradicted");
        }
        const firstLinkHref = data.firstLinkHref;
        return {
            predicate: {
                id: "page-skip-link",
                properties: [],
                needsPageFacts: true,
                verifyClaim: (_elements, facts) => {
                    if (!facts)
                        return { status: "contradicted", detail: "Fatos de página indisponíveis para o predicado page-skip-link." };
                    const live = facts.firstLink?.href ?? null;
                    return live === firstLinkHref
                        ? { status: "consistent", detail: `Dados estruturados conferidos: o primeiro link do documento é href="${live}".` }
                        : { status: "contradicted", detail: `O primeiro link do documento é ${live === null ? "inexistente" : `href="${live}"`}, não href="${firstLinkHref}".` };
                },
                evaluate: (_elements, url, facts) => {
                    if (!facts)
                        return { status: "contradicted", detail: "Fatos de página indisponíveis para o predicado page-skip-link." };
                    return checkPageStructure({ url }, facts).some((f) => f.rule.id === id)
                        ? { status: "verified", detail: "Violação recalculada no documento: o primeiro link não é o salto para o conteúdo (e-MAG 1.5)." }
                        : { status: "contradicted", detail: "O primeiro link do documento é uma âncora interna com alvo existente; não viola neste estado." };
                },
            },
        };
    }
    return none(generic);
}
//# sourceMappingURL=predicates.js.map