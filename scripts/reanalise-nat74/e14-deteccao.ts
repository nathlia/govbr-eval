/**
 * [D-156] Tabulação da leitura de campanha: specs achadas por braço em DUAS colunas, e cada uma por classe de spec.
 *
 *   npx tsx scripts/reanalise-nat74/e14-deteccao.ts --passada PASTA_DA_PASSADA [--julgamentos ARQ] --saida PASTA
 *     → PASTA/deteccao.json + deteccao.md (recusa se já existirem: versão nova = arquivo novo)
 *
 * - **detecção**: a classe derivada pela política credita a spec — `derivado.spec` com classe de violação que não seja
 *   `violacao-ds` (R7, R15, Q1; P3). Credita o fato observado mesmo sem norma (Q1) ou com norma mais fraca (R15).
 * - **detecção fundamentada**: fato `verdadeira` + norma `violada: "sim"` + vínculo à spec. A norma é a citada, ou — na
 *   política 1.3.0 — a referência secundária que deu a classe (`derivado.citacaoPor`); o cartão fundamentado por
 *   referência é contado e listado à parte (`viaReferencia`).
 * - **classe da spec** (D-156 3.i, fixada pelo vocabulário de `categories` da referência, antes de ver número de braço):
 *   `ds` (específica do DS) quando TODA categoria da spec está em {`token`, `estrutura`}; `geral` (acessibilidade geral)
 *   quando ela tem `acessibilidade`, `navegacao` ou `formulario`. Categoria fora do vocabulário: para.
 *
 * O braço vem da chave da passada (nunca vai ao juiz). Determinístico, sem rede, sem modelo. Entradas com sha256.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { gravar, jsonTexto, sha } from "./comum";
import type { Derivado, ItemChave, Resposta } from "./e14-comum";

export const DETECCAO_VERSAO = "nat78-deteccao-1.0.0";
/** Vocabulário de `categories` das referências e a classe de spec de cada categoria (D-156 3.i). */
export const CLASSE_DA_CATEGORIA: Record<string, "ds" | "geral"> = {
  token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral",
};
export type ClasseSpec = "ds" | "geral";
export function classeDaSpec(categorias: string[]): ClasseSpec {
  if (!categorias.length) throw new Error("spec sem categories: classe indecidível");
  for (const c of categorias) if (!(c in CLASSE_DA_CATEGORIA)) throw new Error(`categoria fora do vocabulário: ${c}`);
  return categorias.every(c => CLASSE_DA_CATEGORIA[c] === "ds") ? "ds" : "geral";
}

export interface Julgamento { id: string; chave: string; resposta: Resposta; derivado: Derivado }
const VIOLACOES = new Set(["violacao-pagina", "violacao-origem-indeterminada"]);

/** A spec que a classe derivada credita, ou null. */
export const specDetectada = (d: Derivado): string | null => (d.spec && VIOLACOES.has(d.classe) ? d.spec : null);
/** A spec fundamentada (fato verdadeiro + norma que vale violada + vínculo), com a origem da citação, ou null. */
export function specFundamentada(j: Pick<Julgamento, "resposta" | "derivado">): { spec: string; via: "primaria" | string } | null {
  const r = j.resposta;
  if (r.verdadeFactual !== "verdadeira" || typeof r.vinculo !== "object") return null;
  const ref = j.derivado.citacaoPor && Array.isArray(r.referencias) ? r.referencias.find(x => x.id === j.derivado.citacaoPor) : undefined;
  const violada = ref ? ref.violada : r.norma === "nao-perguntado" ? null : r.norma.violada;
  return violada === "sim" ? { spec: r.vinculo.spec, via: ref ? ref.id : "primaria" } : null;
}

export interface Tabela {
  formato: string; politica: string; specs: { id: string; classe: ClasseSpec; categorias: string[] }[];
  bracos: string[];
  porBraco: Record<string, { cartoes: number; deteccao: string[]; fundamentada: string[]; viaReferencia: { spec: string; cartao: string; referencia: string }[];
    porClasse: Record<ClasseSpec, { deteccao: number; fundamentada: number }> }>;
  nenhumBraco: string[];
}

export function tabular(julgs: Julgamento[], bracoDe: (chave: string) => string, specs: { id: string; categories: string[] }[], politica: string, bracosDoDesenho: string[]): Tabela {
  const cls = new Map(specs.map(s => [s.id, classeDaSpec(s.categories)]));
  const presentes = [...new Set(julgs.map(j => bracoDe(j.chave)))];
  const bracos = [...bracosDoDesenho.filter(b => presentes.includes(b)), ...presentes.filter(b => !bracosDoDesenho.includes(b)).sort()];
  const porBraco: Tabela["porBraco"] = {};
  for (const b of bracos) {
    const js = julgs.filter(j => bracoDe(j.chave) === b);
    const det = new Set<string>(), fun = new Set<string>(), via: Tabela["porBraco"][string]["viaReferencia"] = [];
    for (const j of js) {
      const s = specDetectada(j.derivado); if (s) det.add(s);
      const f = specFundamentada(j);
      if (f) { fun.add(f.spec); if (f.via !== "primaria") via.push({ spec: f.spec, cartao: j.id, referencia: f.via }); }
    }
    for (const s of [...det, ...fun]) if (!cls.has(s)) throw new Error(`spec ${s} fora da referência`);
    const conta = (xs: Set<string>, c: ClasseSpec) => [...xs].filter(s => cls.get(s) === c).length;
    porBraco[b] = { cartoes: js.length, deteccao: [...det].sort(), fundamentada: [...fun].sort(), viaReferencia: via.sort((x, y) => x.spec.localeCompare(y.spec) || x.cartao.localeCompare(y.cartao)),
      porClasse: { ds: { deteccao: conta(det, "ds"), fundamentada: conta(fun, "ds") }, geral: { deteccao: conta(det, "geral"), fundamentada: conta(fun, "geral") } } };
  }
  const alguma = new Set(Object.values(porBraco).flatMap(x => x.deteccao));
  return { formato: DETECCAO_VERSAO, politica, specs: specs.map(s => ({ id: s.id, classe: cls.get(s.id)!, categorias: s.categories })), bracos, porBraco,
    nenhumBraco: specs.map(s => s.id).filter(s => !alguma.has(s)) };
}

export function tabelaMd(t: Tabela, titulo: string): string {
  const n = { ds: t.specs.filter(s => s.classe === "ds").length, geral: t.specs.filter(s => s.classe === "geral").length };
  const linha = (rot: string, f: (b: string) => string) => `| ${rot} | ${t.bracos.map(f).join(" | ")} |`;
  const pb = t.porBraco;
  return [
    `# ${titulo}`, "",
    `Política do juiz: \`${t.politica}\`. Specs da referência: ${t.specs.length} (específicas do DS ${n.ds} · acessibilidade geral ${n.geral}).`,
    "**Detecção** = a classe derivada credita a spec. **Fundamentada** = fato verdadeiro + norma violada = sim + vínculo (norma citada, ou a referência secundária que deu a classe na 1.3.0).", "",
    `| | ${t.bracos.join(" | ")} |`, `|---|${t.bracos.map(() => "---").join("|")}|`,
    linha("cartões", b => String(pb[b].cartoes)),
    linha("**detecção**", b => `**${pb[b].deteccao.length}**`),
    linha(`detecção · específica do DS (de ${n.ds})`, b => String(pb[b].porClasse.ds.deteccao)),
    linha(`detecção · acessibilidade geral (de ${n.geral})`, b => String(pb[b].porClasse.geral.deteccao)),
    linha("**detecção fundamentada**", b => `**${pb[b].fundamentada.length}**`),
    linha(`fundamentada · específica do DS (de ${n.ds})`, b => String(pb[b].porClasse.ds.fundamentada)),
    linha(`fundamentada · acessibilidade geral (de ${n.geral})`, b => String(pb[b].porClasse.geral.fundamentada)),
    linha("fundamentada pela referência secundária", b => String(pb[b].viaReferencia.length)), "",
    "## Specs por braço", "",
    ...t.bracos.flatMap(b => [`- **${b}** — detecção: ${pb[b].deteccao.join(", ") || "—"}; fundamentada: ${pb[b].fundamentada.join(", ") || "—"}` +
      (pb[b].viaReferencia.length ? `; pela referência: ${pb[b].viaReferencia.map(v => `${v.spec} (${v.referencia})`).join(", ")}` : "")]),
    `- nenhum braço detectou: ${t.nenhumBraco.join(", ") || "—"}`, "",
    "## Classe de cada spec (pela `categories` da referência)", "",
    "| categorias | classe |", "|---|---|",
    "| todas em {`token`, `estrutura`} | específica do DS |", "| alguma de {`acessibilidade`, `navegacao`, `formulario`} | acessibilidade geral |", "",
    t.specs.map(s => `${s.id} ${s.classe === "ds" ? "DS" : "geral"}`).join(" · "), "",
  ].join("\n");
}

if (process.argv[1] && /(?:^|[\\/])e14-deteccao\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const passada = val("--passada"), saida = val("--saida");
  if (!passada || !saida) { console.error("Uso: --passada PASTA [--julgamentos ARQ] --saida PASTA"); process.exit(1); }
  const jAbs = resolve(val("--julgamentos") ?? join(passada, "julgamentos.json"));
  for (const f of ["deteccao.json", "deteccao.md"]) if (existsSync(join(saida, f))) { console.error(`${join(saida, f)} já existe (versão nova = pasta nova)`); process.exit(1); }
  const ler = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;
  const jTxt = readFileSync(jAbs, "utf8");
  const j = JSON.parse(jTxt.replace(/^﻿/, "")) as { politica: string; completo: boolean; julgamentos: Julgamento[] };
  if (!j.completo) { console.error("julgamentos.json incompleto: a tabulação só lê passada completa"); process.exit(1); }
  const cAbs = join(passada, "chave", "fila-t3-chave.json"), mAbs = join(passada, "lotes", "manifesto.json");
  const chave = new Map(ler<{ itens: ItemChave[] }>(cAbs).itens.map(i => [i.chave, i.braco]));
  const m = ler<{ analises: { dir: string }[] }>(mAbs);
  if (m.analises.length !== 1) { console.error("uma análise (uma tela) por tabulação"); process.exit(1); }
  const anal = join(dirname(resolve(passada)), m.analises[0].dir);
  const refAbs = join(anal, "entradas", "referencia.json"), campAbs = join(anal, "entradas", "campanha.json");
  const ref = ler<{ violations: { id: string; categories: string[] }[] }>(refAbs);
  const arms = ler<{ design: { arms?: string[] } }>(campAbs).design.arms ?? ["sem", "com"];
  const t = tabular(j.julgamentos, k => { const b = chave.get(k); if (!b) throw new Error(`cartão fora da chave: ${k}`); return b; }, ref.violations, j.politica, arms);
  const entradas = Object.fromEntries([jAbs, cAbs, mAbs, refAbs, campAbs].map(p => [p.replace(/\\/g, "/"), sha(readFileSync(p))]));
  const doc = { ...t, entradas };
  gravar(saida, "deteccao.json", jsonTexto(doc));
  gravar(saida, "deteccao.md", tabelaMd(t, `Specs achadas por braço — ${basename(dirname(dirname(resolve(passada))))}/${basename(dirname(resolve(passada)))}/${basename(resolve(passada))}`));
  for (const b of t.bracos) console.log(`${b}: detecção ${t.porBraco[b].deteccao.length} (DS ${t.porBraco[b].porClasse.ds.deteccao} · geral ${t.porBraco[b].porClasse.geral.deteccao}) · fundamentada ${t.porBraco[b].fundamentada.length} (DS ${t.porBraco[b].porClasse.ds.fundamentada} · geral ${t.porBraco[b].porClasse.geral.fundamentada})`);
}
