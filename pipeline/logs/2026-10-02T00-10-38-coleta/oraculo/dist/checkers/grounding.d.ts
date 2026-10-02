/**
 * D-27 — onde cada verificador determinístico declara a norma que implementa.
 *
 * A regra: **um verificador que não consegue nomear uma regra do oráculo não produz achado.**
 * Produz sinal de revisão, que é outra coisa e não entra na pontuação.
 *
 * Por que isto existe. O portão anti-alucinação (`verify_finding`) foi construído para impedir que
 * o AGENTE cite regra inexistente. Ele não alcançava o oráculo: para as fontes dos próprios
 * verificadores conferia formato, não existência — `govbr-ds-token` aceitava qualquer id que
 * começasse com `ds-token-`. E foi assim que uma verificação de "classes não canônicas" passou
 * anos como achado sem que nenhuma regra do gov.br DS a sustentasse: a base de conhecimento fala de
 * **anatomia** do componente (tag, estrutura), não de classes extras — o DS distribui utilitárias e
 * aplicação de verdade acrescenta as suas. Numa tela realista aquela verificação virava a maior
 * fonte isolada de falso positivo, e pior: batia com mais força justamente nos elementos que o D-24
 * tornou conformes, derrubando o piso de precisão do braço COM oráculo.
 *
 * Declarar aqui serve a três coisas ao mesmo tempo: o portão passa a poder verificar existência de
 * verdade; o scorer ganha a ponte de vocabulário sem que o gabarito precise conhecer as entranhas
 * do oráculo (o mapa de alias é GERADO daqui); e quem revisa consegue conferir a afirmação, porque
 * `basis` diz por que aquele id e não outro.
 */
/** As verificações determinísticas, uma por tipo de julgamento (não por componente). */
export type CheckKind = "token-color" | "token-font-family" | "token-font-size" | "token-radius" | "token-spacing" | "structure-tag" | "structure-accessible-name" | "structure-unknown-classes" | "page-header" | "page-footer" | "page-skip-link";
export interface CheckGrounding {
    /**
     * Ids normativos que esta verificação implementa — regra da KB (`govbr-<versão>-…`) ou do
     * e-MAG (`emag-<n.n>`). **Vazio significa que não há norma**, e então a verificação não pode
     * produzir achado.
     */
    implements: string[];
    /** Por que estes ids. É a frase que um revisor confere contra a fonte. */
    basis: string;
}
export declare const CHECK_GROUNDING: Record<CheckKind, CheckGrounding>;
/** Ids normativos de uma verificação. Vazio = não pode virar achado (D-27). */
export declare function groundingFor(kind: CheckKind): string[];
/** True quando a verificação tem norma e portanto pode produzir achado. */
export declare function podeVirarAchado(kind: CheckKind): boolean;
