/**
 * P4 (mapa retrospectivo) e portão G1 (invariância do scorer 1.7.0).
 *
 * Cartão antigo → novo por corpo canônico idêntico (sem `id` e sem `candidateUnitIds`: o 1.7.0 muda o
 * vocabulário das unidades e com ele os ids). Unidade antiga → nova por (`specId`, chave do elemento,
 * estado). Exige bijeção completa; qualquer órfão para o pipeline.
 */
import { canonical, scoreSemanticPackage, type SemanticPackage, type SemanticReviews } from "../semantic-flow";
import { contagemDoRun, dDoPar, runsDosBracos } from "./g0";
import { type Campanha } from "./comum";

export const MAPA_RETRO_VERSAO = "mapa-retrospectivo-1.0.0";
export interface MapaRetrospectivo {
  formato: typeof MAPA_RETRO_VERSAO;
  regra: string;
  pacoteAntigo: { packageHash: string; version: string; context: SemanticPackage["context"] };
  pacoteNovo: { packageHash: string; version: string; context: SemanticPackage["context"] };
  cartoes: { de: string; para: string }[];
  unidades: { de: string; para: string; specId: string }[];
  runs: { de: string; para: string }[];
  orfaos: { tipo: "cartao" | "unidade" | "run"; lado: "antigo" | "novo"; id: string; motivo: string }[];
}

const REGRA = "cartão: corpo canônico idêntico sem id e sem candidateUnitIds; unidade: (specId, element.key, state); run: id idêntico. Bijeção completa ou o pipeline para.";
const corpoCartao = (c: SemanticPackage["cards"][number]): string => { const { id: _i, candidateUnitIds: _c, ...r } = c; return canonical(r); };
const chaveUnidade = (u: SemanticPackage["units"][number]): string => canonical([u.specId, u.element.key, u.state]);

function bijecao<T>(tipo: "cartao" | "unidade" | "run", antigos: T[], novos: T[], id: (x: T) => string, chave: (x: T) => string,
  orfaos: MapaRetrospectivo["orfaos"]): Map<string, string> {
  const porChaveNovo = new Map<string, string[]>();
  for (const n of novos) porChaveNovo.set(chave(n), [...(porChaveNovo.get(chave(n)) ?? []), id(n)]);
  const usados = new Set<string>();
  const m = new Map<string, string>();
  for (const a of antigos) {
    const alvo = porChaveNovo.get(chave(a)) ?? [];
    if (alvo.length !== 1) { orfaos.push({ tipo, lado: "antigo", id: id(a), motivo: alvo.length ? `ambíguo (${alvo.length})` : "sem corpo idêntico no pacote novo" }); continue; }
    if (usados.has(alvo[0])) { orfaos.push({ tipo, lado: "antigo", id: id(a), motivo: `alvo ${alvo[0]} já usado` }); continue; }
    usados.add(alvo[0]); m.set(id(a), alvo[0]);
  }
  for (const n of novos) if (!usados.has(id(n))) orfaos.push({ tipo, lado: "novo", id: id(n), motivo: "sem par no pacote antigo" });
  return m;
}

export function mapaRetrospectivo(antigo: SemanticPackage, novo: SemanticPackage): MapaRetrospectivo {
  const orfaos: MapaRetrospectivo["orfaos"] = [];
  const cartoes = bijecao("cartao", antigo.cards, novo.cards, c => c.id, corpoCartao, orfaos);
  const unidades = bijecao("unidade", antigo.units, novo.units, u => u.id, chaveUnidade, orfaos);
  const runs = bijecao("run", antigo.runs, novo.runs, r => r.id, r => r.id, orfaos);
  const spec = new Map(antigo.units.map(u => [u.id, u.specId]));
  const ctx = (p: SemanticPackage) => ({ packageHash: p.packageHash, version: p.version, context: p.context });
  return { formato: MAPA_RETRO_VERSAO, regra: REGRA, pacoteAntigo: ctx(antigo), pacoteNovo: ctx(novo),
    cartoes: [...cartoes].map(([de, para]) => ({ de, para })).sort((a, b) => (a.de < b.de ? -1 : 1)),
    unidades: [...unidades].map(([de, para]) => ({ de, para, specId: spec.get(de)! })).sort((a, b) => (a.de < b.de ? -1 : 1)),
    runs: [...runs].map(([de, para]) => ({ de, para })), orfaos };
}

export interface Tradutor { cartao: (id: string) => string; unidade: (id: string) => string }
export function tradutor(m: MapaRetrospectivo): Tradutor {
  const c = new Map(m.cartoes.map(x => [x.de, x.para])), u = new Map(m.unidades.map(x => [x.de, x.para]));
  return {
    cartao: id => { const v = c.get(id); if (!v) throw new Error(`cartão sem mapa: ${id}`); return v; },
    unidade: id => { const v = u.get(id); if (!v) throw new Error(`unidade sem mapa: ${id}`); return v; },
  };
}

/** Decisões arquivadas transpostas pelo mapa, sem vínculo nem átomo novo (G1). */
export function transporArquivo(rev: SemanticReviews, m: MapaRetrospectivo, versaoNova: string): SemanticReviews {
  const t = tradutor(m);
  return { version: versaoNova, decisions: rev.decisions.map(d => ({ ...structuredClone(d), cardId: t.cartao(d.cardId),
    atoms: d.atoms.map(a => ({ ...structuredClone(a), unitIds: a.unitIds.map(t.unidade),
      ...(a.duplicateOf ? { duplicateOf: { cardId: t.cartao(a.duplicateOf.cardId), atomId: a.duplicateOf.atomId } } : {}) })) })) };
}

/** Conjunto de unidades confirmadas por run, como (specId, chave do elemento) — comparável entre versões. */
export function confirmadasPorRun(pkg: SemanticPackage, score: ReturnType<typeof scoreSemanticPackage>): Map<string, string[]> {
  const u = new Map(pkg.units.map(x => [x.id, `${x.specId}|${x.element.key}|${x.state}`]));
  return new Map(score.scores.map(s => [s.runId, [...new Set(s.matched.map(mm => u.get(mm.unitId)!))].sort()]));
}

export interface ResultadoG1Par { par: string; iguais: boolean; diferencas: string[]; d: number; lbAxe: string | null }
export function g1DoPar(c: Campanha, rotulo: string, antigo: SemanticPackage, revAntigo: SemanticReviews, novo: SemanticPackage, m: MapaRetrospectivo): ResultadoG1Par {
  const dif: string[] = [];
  const sa = scoreSemanticPackage(antigo, revAntigo);
  const rn = transporArquivo(revAntigo, m, novo.version);
  const sn = scoreSemanticPackage(novo, rn);
  const ca = confirmadasPorRun(antigo, sa), cn = confirmadasPorRun(novo, sn);
  for (const [run, xs] of ca) if (canonical(xs) !== canonical(cn.get(run) ?? null)) dif.push(`${rotulo} ${run}: unidades confirmadas mudaram`);
  for (const s of sa.scores) {
    const n = sn.scores.find(x => x.runId === s.runId)!;
    for (const k of ["detectedUnits", "falseAssertions", "novelAssertions"] as const)
      if (s.counts[k] !== n.counts[k]) dif.push(`${rotulo} ${s.runId}: ${k} ${s.counts[k]} → ${n.counts[k]}`);
    if (s.pendingCardIds.length !== n.pendingCardIds.length) dif.push(`${rotulo} ${s.runId}: pendentes ${s.pendingCardIds.length} → ${n.pendingCardIds.length}`);
    if (s.status !== n.status) dif.push(`${rotulo} ${s.runId}: status ${s.status} → ${n.status}`);
  }
  const runs = runsDosBracos(novo);
  const d = dDoPar(c, contagemDoRun(novo, sn, runs.sem), contagemDoRun(novo, sn, runs.com));
  const ra = runsDosBracos(antigo);
  const dAnt = dDoPar(c, contagemDoRun(antigo, sa, ra.sem), contagemDoRun(antigo, sa, ra.com));
  if (d !== dAnt) dif.push(`${rotulo}: D ${dAnt} → ${d}`);
  return { par: rotulo, iguais: dif.length === 0, diferencas: dif, d, lbAxe: runs.axe ? sn.scores.find(s => s.runId === runs.axe)!.status : null };
}
