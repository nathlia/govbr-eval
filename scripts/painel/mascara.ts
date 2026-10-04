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
