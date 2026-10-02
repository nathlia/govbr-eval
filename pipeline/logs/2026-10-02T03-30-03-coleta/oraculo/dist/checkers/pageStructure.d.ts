/**
 * Estrutura de página (2.7.0): o Template Base e o Padrão Mínimo lidos como restrições citáveis.
 *
 * Até a 2.6.0 as diretrizes de página só existiam como prosa em `get_page_rules`: o agente podia
 * lê-las, mas um achado baseado nelas não tinha id que o portão reconhecesse, e nas seis execuções
 * com oráculo das baterias de 18/09 nenhuma pediu o Template Base ou o Padrão Mínimo. Aqui a
 * anatomia obrigatória do Template Base vira restrição com id, do mesmo jeito que a tag raiz de um
 * componente virou `ds-structure-<componente>-tag` no D-29: publicada em `get_page_rules`,
 * verificada no `scan_page`, reconhecida pelo portão e recalculável por predicado.
 *
 * A fonte é o texto integral da página oficial do Template Base (`data/ds-page-rules.json`,
 * `page_structure`), que nomeia cada área e diz se é obrigatória: "1. Área de Cabeçalho
 * (Obrigatório)", "5. Área de Rodapé (Obrigatório)". O D-29 tinha vetado inferir rodapé
 * obrigatório do excerto truncado "Template Base como ponto de partida"; o veto era sobre a fonte
 * truncada, e o texto integral resolve a inferência — o trecho citado sai do próprio arquivo de
 * dados, e o teste falha se ele sumir de lá. O salto para o conteúdo vem do e-MAG 1.5, que é
 * explícito: o primeiro link da página.
 *
 * Regiões contam pela classe raiz do core ou pelo web component (`<br-header>`), no DOM claro ou em
 * shadow roots abertos — ver `evidence/pageFacts.ts`.
 *
 * O que fica fora, de propósito: Área de Localização e de Navegação são opcionais; "breadcrumb
 * primeiro na área de conteúdo" depende de saber onde a área de conteúdo começa, e o oráculo não
 * decide isso mecanicamente; título e `lang` já são do axe (`document-title`, `html-has-lang`).
 */
import type { Finding } from "../schema/finding.js";
import type { PageFacts, PageRegion } from "../evidence/pageFacts.js";
export type PageConstraintKind = "page-region" | "page-skip-link";
export interface PageConstraint {
    /** Id citável, ex.: `ds-page-header`. */
    id: string;
    kind: PageConstraintKind;
    /** Região do Template Base (`header`, `footer`) ou `skip-link`. */
    region: PageRegion | "skip-link";
    selector: string | null;
    description: string;
    force: "required";
    /** Ids normativos que sustentam a restrição (D-27). */
    implements: string[];
    /** O que uma alegação verificável precisa trazer em `evidence.data`. */
    claim: {
        expectedCondition: string;
        fields: string[];
    };
    source: {
        url: string;
        scrapedAt: string;
        excerpt: string | null;
    };
}
/** O trecho da página oficial que nomeia a área e a declara obrigatória — provado presente pelos testes. */
export declare function templateBaseExcerpt(heading: string): string | null;
/** As restrições de página publicadas por `get_page_rules` — as mesmas que o scanner e o portão usam. */
export declare function pageConstraints(): PageConstraint[];
export declare function checkPageStructure(page: {
    url: string;
}, facts: PageFacts): Finding[];
