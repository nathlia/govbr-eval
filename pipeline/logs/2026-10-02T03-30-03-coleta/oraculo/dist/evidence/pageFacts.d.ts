/**
 * Fatos de página inteira (2.7.0): o que o verificador de estrutura de página e o predicado do
 * portão precisam saber sobre o documento, não sobre um elemento.
 *
 * `inspectPageComputedStyles` responde por elemento e não tem como dizer "não existe rodapé": a
 * ausência de um elemento não é evidência de elemento nenhum. Aqui a unidade é o documento, lido
 * uma vez no mesmo navegador e no mesmo estado que o resto da varredura.
 *
 * Uma região do Template Base pode chegar de duas formas: a classe raiz do `@govbr-ds/core`
 * (`<header class="br-header">`) ou o web component do `@govbr-ds/webcomponents` (`<br-header>`),
 * que renderiza a mesma anatomia dentro de um shadow root. A tela B do corpus (Angular + web
 * components) tem a segunda forma e nenhuma ocorrência da primeira no DOM claro; contar só a classe
 * acusaria uma página com cabeçalho de não ter cabeçalho. Por isso a leitura percorre o DOM claro e
 * todo shadow root aberto, como `inspect.ts` já faz, e aceita tag ou classe. Um host contado não tem
 * o seu interior contado de novo para a mesma região.
 */
import type { Page } from "playwright";
/** Regiões do Template Base e do Padrão Mínimo: classe raiz do core e tag do web component. */
export declare const PAGE_REGION_SELECTORS: {
    readonly header: ".br-header";
    readonly footer: ".br-footer";
    readonly breadcrumb: ".br-breadcrumb";
    readonly cookiebar: ".br-cookiebar";
    readonly menu: ".br-menu";
};
export type PageRegion = keyof typeof PAGE_REGION_SELECTORS;
export interface PageFacts {
    url: string;
    lang: string | null;
    title: string;
    /** Elementos que ocupam cada região: classe raiz ou web component, no DOM claro ou em shadow roots abertos. */
    regions: Record<PageRegion, number>;
    /** Quantos `<main>` ou `[role=main]`. */
    mainLandmarks: number;
    /** Total de `<a href>` no documento, na ordem composta (shadow roots abertos incluídos). */
    linkCount: number;
    /**
     * O primeiro `<a href>` na ordem composta — o que o e-MAG 1.5 manda ser o salto para o conteúdo.
     * `skipsToContent`: o href é uma âncora interna (`#id`) cujo alvo existe no documento.
     */
    firstLink: {
        href: string;
        text: string;
        targetId: string | null;
        targetExists: boolean;
        skipsToContent: boolean;
    } | null;
}
export declare function inspectPageStructure(page: Page, url: string): Promise<PageFacts>;
