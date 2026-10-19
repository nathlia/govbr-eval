/**
 * Máscara de ids de regra do oráculo na fila de revisão cega (NAT-60).
 *
 * O braço "com" cita regras pelo esquema de ids do oráculo (`ds-page-footer`, `govbr-3.7.0-…`); o
 * braço "sem" não tem como conhecer esse esquema. Um id desses no texto do cartão denuncia o braço à
 * revisora. Aqui ele vira "[regra citada]" — SÓ na vista. O pacote, os arquivos e a pontuação ficam
 * intactos (o .tar.gz da revisão é o registro e leva o texto original). Este módulo não está em
 * SCORER_FILES e não deve entrar: não muda o que um cartão diz, só o que a fila mostra.
 *
 * Padrões derivados dos dados (pacotes do piloto-01, par-01 e par-02, rev-001..004), sem abrir o
 * código do validador nem checker-aliases.json:
 *   - `ds-<nome>` e `ds:<nome>` em minúsculas: ds-page-header, ds-page-footer, ds-token-color,
 *     ds-structure-button-tag, ds:page-header, ds:page-footer, ds:token-color, ds:structure-button-tag.
 *     Exige letra logo após o separador, então a prosa "do DS: ícone…" (maiúsculas, espaço) fica.
 *   - `govbr-<versão>[-…]`: govbr-3.7.0-foundation-global-21b1a2733f7b,
 *     govbr-3.7.0-accessibility-global-2f22b7245ef9, govbr-3.7.0-component-message-66b01a712e67.
 * Ficam visíveis as referências públicas, que os dois braços podem citar sem o oráculo:
 * `wcag:2.4.3`, "WCAG 2.4.3", `emag:2.2`, "e-MAG 2.1", `axe:label` e nomes de regra do axe
 * (`aria-hidden-focus`, `button-name`, `label`, `tabindex`).
 */
import { armLeaks, type SemanticPackage } from "../semantic-flow";

export const REGRA_CITADA = "[regra citada]";

/** Esquemas de id que só existem no oráculo. Com /g: use só via `mascarar`/`citaIdDoOraculo`. */
export const IDS_DO_ORACULO: readonly RegExp[] = [
  /\bds[-:][a-z][a-z0-9]*(?:-[a-z0-9]+)*/g,
  /\bgovbr-\d+(?:\.\d+)*(?:-[A-Za-z0-9]+)*/g,
];

export function mascarar(texto: string): string;
export function mascarar(texto: string | null): string | null;
export function mascarar(texto: string | null): string | null {
  if (texto === null) return null;
  return IDS_DO_ORACULO.reduce((t, re) => t.replace(re, REGRA_CITADA), texto);
}

export const citaIdDoOraculo = (texto: string | null): boolean =>
  texto !== null && IDS_DO_ORACULO.some(re => { re.lastIndex = 0; const r = re.test(texto); re.lastIndex = 0; return r; });

/** Texto livre que a fila mostra de um cartão (o que a máscara cobre). */
export interface TextoVisivel { id: string; regra: string | null; observado: string | null; esperado: string | null; extras: string[] }

/**
 * `citavam`: cartões cujo texto visível citava um id do oráculo (todos mascarados).
 * `aposMascara`: cartões cujo texto visível, já mascarado, ainda denuncia o braço — pelos mesmos
 * termos de `armLeaks` (o scorer, intocado) ou por um id que a máscara não pegou.
 */
export function contarMascara(antes: TextoVisivel[], depois: TextoVisivel[]): { citavam: number; aposMascara: number } {
  const campos = (t: TextoVisivel) => [t.regra, t.observado, t.esperado, ...t.extras];
  const citavam = antes.filter(t => campos(t).some(citaIdDoOraculo)).length;
  const pseudo = { cards: depois.map(t => ({ id: t.id, description: [t.regra, ...t.extras].filter(Boolean).join(" "),
    reportedEvidence: [], observed: t.observado, expected: t.esperado })) } as unknown as SemanticPackage;
  const termos = new Set(armLeaks(pseudo).map(l => l.cardId));
  const aposMascara = depois.filter(t => termos.has(t.id) || campos(t).some(citaIdDoOraculo)).length;
  return { citavam, aposMascara };
}

// ───────────────────────────────────────────────────────────────── NAT-61: com × ferramentas

/**
 * NAT-61 (plano §7.4, decisão 18): no trio, a revisão cega mistura cartões de com e de ferramentas. Os dois
 * têm o oráculo e citam `scan_page`, `verify_finding`, `get_finding_details` e "oráculo" — isso NÃO separa um
 * do outro (os termos de `armLeaks` só separam sem × oráculo). O que denuncia o com é o que o perfil
 * knowledge-free tirou: as ferramentas de consulta à base, os ids da base e das checagens que a aplicam, o
 * vocabulário que só o conhecimento curado traz e a anotação e-MAG que o scan do perfil evaluation acrescenta
 * à descrição da regra do axe ("(e-MAG 3.5: título)").
 *
 * `mascarar` (acima) NÃO muda: a NAT-74 (reanalise-nat74/e14-*) usa ela nos materiais cegos já medidos. Esta
 * máscara é outra função, aplicada pela fila só quando o pacote tem execução do braço ferramentas.
 */
export const FERRAMENTA_CITADA = "[ferramenta citada]";
export const TERMO_CITADO = "[termo citado]";
export const NOTA_EMAG_CITADA = "[anotação citada]";
const RETIRADAS = ["get_ds_rules", "get_design_tokens", "get_emag_rules", "get_page_rules", "get_component_spec", "list_components", "normativeContext"];

/** Padrões que distinguem com de ferramentas. Com /g: use só via as funções abaixo. */
export const DISTINGUE_COM_DE_FERRAMENTAS: readonly { re: RegExp; por: string }[] = [
  { re: new RegExp(`\\b(?:mcp__govbr-ds-validator__)?(?:${RETIRADAS.join("|")})\\b`, "g"), por: FERRAMENTA_CITADA },
  { re: /\bgovbr-\d+(?:\.\d+)*(?:-[A-Za-z0-9]+)*/g, por: REGRA_CITADA },
  { re: /\bds[-:](?:token|structure|page)(?:-[a-z0-9]+)*/g, por: REGRA_CITADA },
  { re: /\(e-?MAG \d+(?:\.\d+)*:[^)]*\)/gi, por: NOTA_EMAG_CITADA },
  { re: /\b(?:Template Base|Rawline|knowledge base)\b/gi, por: TERMO_CITADO },
];

export function mascararComFerramentas(texto: string): string;
export function mascararComFerramentas(texto: string | null): string | null;
export function mascararComFerramentas(texto: string | null): string | null {
  if (texto === null) return null;
  return DISTINGUE_COM_DE_FERRAMENTAS.reduce((t, { re, por }) => t.replace(re, por), texto);
}

export const distingueComDeFerramentas = (texto: string | null): boolean =>
  texto !== null && DISTINGUE_COM_DE_FERRAMENTAS.some(({ re }) => { re.lastIndex = 0; const r = re.test(texto); re.lastIndex = 0; return r; });

/** Cartões do pacote cujo texto livre (o que `armLeaks` lê) separa com de ferramentas. */
export function contarComFerramentas(pkg: SemanticPackage): number {
  // o mesmo texto livre que armLeaks lê (descrição, evidência relatada, observado, esperado)
  return pkg.cards.filter(c => distingueComDeFerramentas(JSON.stringify({ d: c.description, r: c.reportedEvidence, o: c.observed, e: c.expected }))).length;
}

// ───────────────────────────────────────────────── campanha nova: vista cega do trio (plano de revisão 19/10, entrega 2)

/**
 * Máscara da vista cega do trio (primeira passada da campanha nova e `review.md` cego do `analisar`). Nem `mascarar`
 * (D-87, NAT-74) nem `mascararComFerramentas` (painel, NAT-61) mudam: esta é outra cadeia, só para o caminho novo.
 *
 * Diferenças em relação à cadeia anterior (D-87 + NAT-73 + `mascararComFerramentas` + termos de ferramenta), achado B:
 *   - o que é informação de julgamento NÃO é mascarado: "Rawline" (a fonte que o juiz mede na página) fica, e entra
 *     no resíduo contado (`vocabulario-do-ds`); "Template Base" vira "modelo de página do DS" (paráfrase sem marca: o
 *     texto da regra continua dizendo o que exige, em vez de "Use o [termo citado] como ponto de partida");
 *   - a anotação e-MAG que o perfil evaluation acrescenta à regra do axe sai sem deixar marca (não é a norma);
 *   - no texto livre da alegação (`mascararTextoCego`) também saem as menções a ferramentas que nenhuma norma precisa:
 *     "axe"/"axe-core", ferramentas do navegador (`browser_*`) e ids de achado da ferramenta (`FAM-…`), todos como
 *     "[ferramenta citada]" — o mesmo marcador para os três braços (o `sem` também narra `browser_snapshot`).
 * O id e a fonte da norma citada (`axe:label`, "axe-core 4.11.4", `wcag:…`) nunca passam por `mascararTextoCego`.
 */
export const MODELO_DE_PAGINA = "modelo de página do DS";
/** Id de achado devolvido pela ferramenta de varredura (`FAM-26db15d366c5`): só aponta para a saída dela. */
export const ID_DE_ACHADO = /\bFAM-[0-9a-f]{6,}\b/;
const TROCAS_NORMA_CEGA: readonly { re: RegExp; por: string }[] = [
  { re: /\/tmp\/pw-[^\s"'),;]*/g, por: "[arquivo local]" },
  { re: /\bemag-(\d+(?:\.\d+)?)/g, por: "emag:$1" },
  { re: new RegExp(`\\b(?:mcp__govbr-ds-validator__)?(?:${RETIRADAS.join("|")})\\b`, "g"), por: FERRAMENTA_CITADA },
  { re: /\b(?:mcp__[A-Za-z0-9_-]+__)?(?:scan_page|verify_finding|get_finding_details|check_[a-z_]+|inspect_computed_styles|run_axe_scan|save_report)\b/g, por: FERRAMENTA_CITADA },
  { re: /\bgovbr-\d+(?:\.\d+)*(?:-[A-Za-z0-9]+)*/g, por: REGRA_CITADA },
  { re: /\bds[-:](?:token|structure|page)(?:-[a-z0-9]+)*/g, por: REGRA_CITADA },
  { re: /\s*\(e-?MAG \d+(?:\.\d+)*:[^)]*\)/gi, por: "" },
  { re: /\bTemplate Base\b/gi, por: MODELO_DE_PAGINA },
  { re: /\bknowledge base\b/gi, por: TERMO_CITADO },
  { re: /\bor[aá]culos?\b|\bvalidator\b|\bvalidador\b|\bmcp\b/gi, por: TERMO_CITADO },
];
const TROCAS_TEXTO_CEGO: readonly { re: RegExp; por: string }[] = [
  { re: /\b(?:mcp__[A-Za-z0-9_-]+__)?browser_[a-z_]+\b/g, por: FERRAMENTA_CITADA },
  { re: new RegExp(ID_DE_ACHADO.source, "g"), por: FERRAMENTA_CITADA },
  { re: /\baxe(?:-core)?\b/gi, por: FERRAMENTA_CITADA },
];
const aplicar = (t: string, trocas: readonly { re: RegExp; por: string }[]) => trocas.reduce((s, { re, por }) => s.replace(re, por), t);

/** Norma e referência (id, fonte e texto da regra): só ids e termos que denunciam a proveniência. */
export function mascararNormaCega(texto: string): string;
export function mascararNormaCega(texto: string | null): string | null;
export function mascararNormaCega(texto: string | null): string | null {
  return texto === null ? null : aplicar(mascarar(texto), TROCAS_NORMA_CEGA);
}
/** Texto livre da alegação (observado, esperado, passos, sinalizações, sujeitos, evidências): a norma + menções a ferramenta. */
export function mascararTextoCego(texto: string): string;
export function mascararTextoCego(texto: string | null): string | null;
export function mascararTextoCego(texto: string | null): string | null {
  return texto === null ? null : aplicar(mascararNormaCega(texto), TROCAS_TEXTO_CEGO);
}
/** Marcadores que a máscara deixa no texto (cada um diz que ali havia algo de um braço). */
export const MARCADORES = [REGRA_CITADA, FERRAMENTA_CITADA, TERMO_CITADO, NOTA_EMAG_CITADA, "[arquivo local]"] as const;
