/**
 * [D-168, migração de ids] Ids da base 3.7.0 antiga (186 regras) citados em `rules[]` de uma referência → unidade(s) da
 * base literal que carregam a MESMA cláusula. Determinístico e sem modelo; lê só `data/` do validador indicado.
 *
 * Para cada entrada de `rules[]`:
 *  - `emag:N.N` / `wcag:N.N.N` (ids públicos) e id que já está na base literal → ficam como estão (`publico`, `literal`);
 *  - id em `legacy-ids.json` com `supersededBy` → o(s) sucessor(es) (`legado-sucessor`), conferido(s) pelo texto
 *    normalizado (igual, ou o antigo é o começo do novo);
 *  - id descartado (`supersededBy: []`) → a unidade literal cujo texto normalizado é IGUAL ao antigo, ou COMEÇA por ele
 *    (o antigo era excerto da mesma frase: índice de busca), se houver exatamente uma (`texto-normalizado`); senão nenhuma
 *    (`sem-unidade`, com o motivo do descarte). Nada é escolhido por semelhança: só igualdade ou prefixo do texto.
 * Normalização: tira marcação markdown (`*`, `_`, crase, `\`), junta espaços, minúsculas, tira pontuação final.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DIR_BASE_LITERAL = "data/knowledge/versions/3.7.0-literal-2026-10-15/normalized";
/** Prefixo mínimo (caracteres normalizados) para o antigo valer como excerto da frase nova. */
export const PREFIXO_MINIMO = 40;

export type Como = "publico" | "literal" | "legado-sucessor" | "texto-normalizado" | "sem-unidade";
export interface Migracao { de: string; para: string[]; como: Como; nota: string }
interface Registro { id: string; originalText?: string; force?: string }
interface Legado { id: string; class: string; supersededBy: string[]; reason: string; record: Registro }
export interface BaseLiteral { literais: Map<string, Registro>; legado: Map<string, Legado>; fontes: Record<string, string> }

export const normalizar = (t: string): string => t.replace(/[*_`\\]/g, "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase().replace(/[\s.;:,!]+$/, "");

export function lerBaseLiteral(validador: string): BaseLiteral {
  const dir = join(validador, DIR_BASE_LITERAL), fontes: Record<string, string> = {}, literais = new Map<string, Registro>();
  const ler = (f: string) => { const b = readFileSync(join(dir, f)); fontes[`${DIR_BASE_LITERAL}/${f}`] = createHash("sha256").update(b).digest("hex"); return b.toString("utf8"); };
  for (const f of ["rules.jsonl", "carried-over.jsonl"]) for (const l of ler(f).split("\n").filter(x => x.trim())) { const r = JSON.parse(l) as Registro; literais.set(r.id, r); }
  const legado = new Map((JSON.parse(ler("legacy-ids.json")) as { entries: Legado[] }).entries.map(e => [e.id, e]));
  return { literais, legado, fontes };
}

export function migrarRegra(id: string, b: BaseLiteral): Migracao {
  if (/^(?:emag|wcag):/.test(id)) return { de: id, para: [id], como: "publico", nota: "id público (e-MAG/WCAG)" };
  if (b.literais.has(id)) return { de: id, para: [id], como: "literal", nota: "já é unidade da base literal" };
  const e = b.legado.get(id);
  if (!e) throw new Error(`${id}: nem na base literal nem em legacy-ids.json`);
  const antigo = normalizar(e.record.originalText ?? "");
  const mesmoTexto = (r: Registro | undefined) => { const n = normalizar(r?.originalText ?? ""); return n === antigo ? "igual" : antigo.length >= PREFIXO_MINIMO && n.startsWith(antigo) ? "prefixo" : null; };
  if (e.supersededBy.length) {
    for (const s of e.supersededBy) if (!b.literais.has(s)) throw new Error(`${id}: sucessor ${s} fora da base literal`);
    return { de: id, para: [...e.supersededBy], como: "legado-sucessor",
      nota: `legacy-ids.json supersededBy (${e.reason}); texto ${e.supersededBy.map(s => mesmoTexto(b.literais.get(s))
        ?? (antigo.startsWith(normalizar(b.literais.get(s)?.originalText ?? "") || "\u0000") ? "novo = começo do antigo" : "diferente")).join("/")}` };
  }
  const achados = [...b.literais.values()].map(r => ({ r, m: mesmoTexto(r) })).filter(x => x.m);
  if (achados.length === 1) return { de: id, para: [achados[0].r.id], como: "texto-normalizado",
    nota: `descartado em legacy-ids.json (${e.reason}), mas a unidade literal tem o mesmo texto (${achados[0].m === "igual" ? "igual" : "o antigo é o começo dela"})` };
  if (achados.length > 1) return { de: id, para: [], como: "sem-unidade", nota: `descartado em legacy-ids.json (${e.reason}); ${achados.length} unidades com o mesmo texto: ambíguo` };
  // a base literal partiu a frase antiga em duas unidades CONSECUTIVAS (mesmo arquivo, mesmo componente): as duas, juntas,
  // têm exatamente o texto antigo (vírgulas e espaços à parte)
  const semVirgula = (s: string) => s.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const lista = [...b.literais.values()], pares: [Registro, Registro][] = [];
  for (let i = 0; i + 1 < lista.length; i++)
    if (semVirgula(`${normalizar(lista[i].originalText ?? "")} ${normalizar(lista[i + 1].originalText ?? "")}`) === semVirgula(antigo)) pares.push([lista[i], lista[i + 1]]);
  if (pares.length === 1) return { de: id, para: pares[0].map(r => r.id), como: "texto-normalizado",
    nota: `descartado em legacy-ids.json (${e.reason}), mas a base literal partiu a mesma frase em duas unidades consecutivas` };
  return { de: id, para: [], como: "sem-unidade", nota: `descartado em legacy-ids.json (${e.reason}); ${pares.length ? `${pares.length} pares com o mesmo texto: ambíguo` : "nenhuma unidade literal (nem par consecutivo) com o mesmo texto"}` };
}

/** `rules[]` migrado: cada entrada pela sua migração, na ordem, sem repetir. */
export function migrarRules(rules: string[], b: BaseLiteral): { rules: string[]; tabela: Migracao[] } {
  const tabela = rules.map(r => migrarRegra(r, b)), out: string[] = [];
  for (const m of tabela) for (const x of m.para) if (!out.includes(x)) out.push(x);
  return { rules: out, tabela };
}
export const temLegado = (rules: string[], b: BaseLiteral): boolean => rules.some(r => !/^(?:emag|wcag):/.test(r) && !b.literais.has(r));
