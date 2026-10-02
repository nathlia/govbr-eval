import type { DsStylesheetIndex } from "../evidence/cssProvenance.js";
export interface TokenRegistry {
    meta: {
        source: string;
        version: string;
        generatedAt: string;
        totalTokens: number;
    };
    semantic: Record<string, {
        token: string;
        value: string;
    }>;
    hexLookup: Record<string, string[]>;
    categorized: Record<string, Record<string, string>>;
    all: Record<string, string>;
}
export interface EmagRule {
    id: string;
    title: string;
    description: string;
    wcag: string | null;
}
export interface EmagData {
    meta: {
        source: string;
        authority: string;
        url: string;
        note: string;
    };
    sections: Record<string, {
        title: string;
        rules: EmagRule[];
    }>;
}
export interface PageRulesData {
    meta: {
        source: string;
        url: string;
        scrapedAt: string;
        note?: string;
    } & Record<string, unknown>;
    categories: Record<string, {
        label: string;
        url: string;
        rules?: unknown[];
        sections?: Record<string, unknown>;
    } & Record<string, unknown>>;
}
export interface ComponentSpec {
    name: string;
    rootClass: string;
    /** Tags que carregam a classe raiz nos exemplos oficiais de QUALQUER componente (D-51). */
    tags: string[];
    /** De quais componentes vêm os exemplos de cada tag. */
    tagSources?: Record<string, string[]>;
    variantClasses: string[];
    ariaAttributes: string[];
    tokensUsed: string[];
    examples: {
        name: string;
        html: string;
    }[];
}
export interface ComponentConstraint {
    /** Stable checker/specification id shared by normative and deterministic profiles. */
    id: string;
    kind: "root-tag";
    description: string;
    rootClass: string;
    allowedTags: string[];
}
/**
 * Machine-readable claims exposed with a component specification.
 *
 * The deterministic checker already emitted these ids. Returning them from the normative
 * surface prevents agents from borrowing an unrelated broad KB rule merely because a structural
 * constraint did not have a citable identity (D-29).
 */
/**
 * Tags dos exemplos do PRÓPRIO componente × tags que só aparecem nos exemplos de outros (D-51).
 * `br-button` é `<button>` na pasta do botão e `<a>` no breadcrumb, no footer e no menu — lá ele é
 * um link com aparência de botão. Sem `tagSources` (dados antigos) tudo conta como próprio.
 */
export declare function ownAndBorrowedTags(spec: ComponentSpec): {
    own: string[];
    borrowed: string[];
};
export declare function constraintsForComponent(spec: ComponentSpec): ComponentConstraint[];
export interface ComponentSpecsData {
    meta: {
        source: string;
        version: string;
        generatedAt: string;
        totalComponents: number;
    };
    components: Record<string, ComponentSpec>;
}
export declare function getTokenRegistry(): TokenRegistry;
export declare function getEmag(): EmagData;
export declare function getPageRules(): PageRulesData;
/** Índice das declarações que a folha oficial do DS publica — ver `evidence/cssProvenance.ts`. */
export declare function getDsStylesheet(): DsStylesheetIndex;
export declare function getComponentSpecs(): ComponentSpecsData;
/** Find an e-MAG rule by id (e.g. "3.5") across all sections. */
export declare function findEmagRule(id: string): (EmagRule & {
    section: string;
}) | undefined;
