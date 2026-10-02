/**
 * Discriminadores fechados para a condição esperada que cada predicado sabe recalcular.
 * O texto livre de evidence.expected continua sendo uma explicação humana; o gate não tenta
 * interpretá-lo. A confirmação liga estes valores estruturados ao predicado determinístico.
 */
export declare const EXPECTED_CONDITIONS: {
    readonly tokenColor: "registered-govbr-ds-color-token";
    readonly tokenFontFamily: "rawline-or-raleway";
    readonly tokenRadius: "govbr-ds-radius-scale";
    readonly tokenSpacing: "govbr-ds-spacing-scale";
    readonly structureTag: "canonical-component-tag";
    /** 2.7.0: regiões obrigatórias do Template Base e o salto para o conteúdo (e-MAG 1.5). */
    readonly pageRegion: "template-base-region-present";
    readonly skipLink: "first-link-skips-to-content";
};
