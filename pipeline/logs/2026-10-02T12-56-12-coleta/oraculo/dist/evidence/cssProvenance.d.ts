/**
 * Proveniência das declarações CSS: o que a página escreveu × o que o próprio DS publica.
 *
 * `getComputedStyle` não diz de quem é o valor, e a folha de estilo também não: num site real o
 * `core.css` do gov.br DS chega empacotado no mesmo arquivo que o CSS da página, então a origem do
 * arquivo não separa as duas autorias. O que separa é o conteúdo — uma declaração cujo seletor,
 * propriedade e valor coincidem com os da folha oficial é o DS falando, não a página.
 *
 * Sem essa separação os verificadores de token acusavam a folha do próprio DS: o raio de 6px do
 * `.br-textarea textarea`, o `margin-top: -2px` do `.br-select .br-list`, o `padding-right: 29px`
 * do campo do select. A página usa o componente como o DS o publica e não tem o que corrigir
 * (D-51: 5 das 7 alegações falsas do validator na tela A).
 *
 * O índice (`data/ds-stylesheet.json`) é gerado por `npm run build:data` lendo a folha oficial pelo
 * CSSOM do mesmo navegador que mede as páginas: seletor e valor saem serializados do mesmo jeito
 * dos dois lados, então a comparação é por igualdade.
 */
import type { ComputedStyleEvidence } from "./types.js";
/** Propriedades CSS que alimentam cada propriedade computada inspecionada. */
export declare const AUTHORED_CSS_NAMES: Record<keyof ComputedStyleEvidence, string[]>;
/** Todas as propriedades CSS que o índice do DS precisa cobrir. */
export declare const INDEXED_CSS_NAMES: string[];
/** seletor → propriedade CSS → valores declarados pela folha oficial (com ` !important` quando houver). */
export interface DsStylesheetIndex {
    meta: {
        source: string;
        version: string;
        generatedAt: string;
        files: string[];
        selectors: number;
        declarations: number;
    };
    declarations: Record<string, Record<string, string[]>>;
}
/** Uma declaração que alcança o elemento, como o navegador a devolve. `selectorText` nulo = estilo inline. */
export interface RawDeclaration {
    property: keyof ComputedStyleEvidence;
    cssName: string;
    value: string;
    selectorText: string | null;
}
/** Divide uma lista de seletores nas vírgulas de nível superior — `:is(a, b)` e `[x="a,b"]` ficam inteiros. */
export declare function splitSelectorList(selectorText: string): string[];
/**
 * A declaração é do DS quando TODOS os seletores da regra estão no índice com a mesma propriedade
 * e o mesmo valor. Todos, e não algum: um empacotador só funde regras do DS com regras do DS, e
 * uma regra da página que pegue carona num seletor oficial (`.minha, .br-textarea textarea`)
 * continua sendo escolha da página. Estilo inline nunca é do DS.
 */
export declare function isDsShipped(index: DsStylesheetIndex, declaration: RawDeclaration): boolean;
export interface PartitionedDeclarations {
    authored: Partial<Record<keyof ComputedStyleEvidence, string[]>>;
    dsShipped: Partial<Record<keyof ComputedStyleEvidence, string[]>>;
}
/** Separa, preservando a ordem das folhas, o que a página declarou do que a folha oficial declara. */
export declare function partitionDeclarations(raw: RawDeclaration[], index: DsStylesheetIndex): PartitionedDeclarations;
