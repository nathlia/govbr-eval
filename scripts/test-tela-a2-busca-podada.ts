/**
 * Revisão formal 2 da A2 (NAT-110, D-160) — teste de propriedade da poda: em instâncias pequenas sorteadas com as
 * MESMAS espécies de restrição do sorteio (estratos com cota, um por estrato e maxPorInstancia por hospedeiro, `tipo`
 * em hospedeiros aninhados, nós tocados / cascata / mudança de estado, cópias compartilhadas em irmãos do mesmo
 * componente, alternativas válidas, chamarizes livres), buscar(…, "cega") e buscar(…, "podada") têm de devolver a
 * MESMA primeira solução (ou as duas nenhuma), e a podada nunca visita mais nós.
 *
 * As funções do contrato (related, clash, touchedInstances, canPlace) são as do script, copiadas literalmente.
 * Nenhuma instância usa a semente real nem os insumos da A2.
 *
 *   npx tsx scripts/test-tela-a2-busca-podada.ts [instâncias] [semente-do-gerador]
 */
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buscar, solucaoCanonica, type ContextoBusca, type FxBusca, type PlacementBusca, type RegraBusca, type VarianteBusca } from "./tela-a2-busca-podada.js";

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

/** Gerador determinístico (mulberry32), para o teste ser reproduzível. */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const sample = <T>(xs: T[], n: number) => { const c = [...xs]; const out: T[] = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(next() * c.length), 1)[0]); return out; };
  return { next, int, pick, sample };
}

interface Instancia { ctx: ContextoBusca<RegraBusca>; seed: string }

export function gerarInstancia(gseed: number): Instancia {
  const R = rng(gseed);
  const nComp = R.int(2, 4);
  const comps = Array.from({ length: nComp }, (_, i) => `c${i}`);
  const nDraw = R.int(4, 9);
  const drawable = Array.from({ length: nDraw }, (_, i) => `i${i}`);
  if (R.next() < 0.3) drawable.push("pagina");
  const scaffold = Array.from({ length: R.int(0, 3) }, (_, i) => `s${i}`);
  const componentOf = new Map<string, string>();
  for (const i of drawable) componentOf.set(i, i === "pagina" ? "pagina" : R.pick(comps));
  // aninhamento: pai sempre de índice menor (sem ciclos)
  const parents = new Map<string, string[]>();
  for (let k = 1; k < drawable.length; k++) if (R.next() < 0.35) { const p = drawable[R.int(0, k - 1)]; parents.set(drawable[k], [...(parents.get(drawable[k]) ?? []), p]); }
  const ancestors = (i: string): Set<string> => { const out = new Set<string>(); const st = [...(parents.get(i) ?? [])]; while (st.length) { const p = st.pop()!; if (!out.has(p)) { out.add(p); st.push(...(parents.get(p) ?? [])); } } return out; };
  const anc = new Map(drawable.map(i => [i, ancestors(i)]));
  const ALL = [...drawable, ...scaffold];
  const partes = ["raiz", "rotulo", "icone"];

  const tipos = ["estrutura-classe", "visual-token", "comportamento"];
  const eligible: RegraBusca[] = [];
  const mkRegra = (estrato: string, n: number) => {
    const instancias = R.sample(drawable, R.int(1, Math.min(3, drawable.length)));
    const variantes: VarianteBusca[] = Array.from({ length: R.int(1, 3) }, (_, v) => {
      const restr = R.next() < 0.25 ? R.sample(instancias, R.int(1, instancias.length)) : undefined;
      return restr ? { id: `v${v}`, instancias: restr } : { id: `v${v}` };
    });
    const alternativasValidas: VarianteBusca[] = R.next() < 0.3 ? Array.from({ length: R.int(1, 2) }, (_, a) => (R.next() < 0.4 ? { id: `a${a}`, instancias: R.sample(drawable, R.int(1, 2)) } : { id: `a${a}` })) : [];
    eligible.push({ id: `${estrato.toLowerCase()}-${n}-${sha256(`${gseed}|${estrato}|${n}`).slice(0, 6)}`, estrato, tipo: R.pick(tipos), instancias, variantes, alternativasValidas });
  };
  const nDS = R.int(3, 10), nG = R.int(2, 7);
  for (let n = 0; n < nDS; n++) mkRegra("DS", n);
  for (let n = 0; n < nG; n++) mkRegra("G", n);

  const params = {
    ordemEstratos: ["DS", "G"],
    cotas: { DS: R.int(1, Math.min(4, nDS)), G: R.int(1, Math.min(3, nG)) } as Record<string, number>,
    maxPorInstancia: R.pick([1, 2, 2]),
    compartilhadas: R.pick([0, 1, 1, 2]),
    alternativasValidas: R.pick([0, 1, 1, 2]),
    chamarizes: R.int(0, 4),
  };
  // parte das instâncias com chamarizes no aperto (como na A2: 8 de 21), onde o limite (D) decide
  const nUniv = [...drawable, ...scaffold].filter(i => i !== "pagina").length;
  if (R.next() < 0.4) params.chamarizes = Math.max(0, nUniv - R.int(2, 6));

  // efeitos: gerados uma vez por (regra, tipo, id, hospedeiro) e memoizados, como o fxCache do script
  const fxCache = new Map<string, FxBusca>();
  const fxOf = (rule: RegraBusca, kind: "variantes" | "alternativas", id: string, host: string): FxBusca => {
    const k = `${rule.id}|${kind}|${id}|${host}`;
    let fx = fxCache.get(k);
    if (!fx) {
      const F = rng(parseInt(sha256(`${gseed}|${k}`).slice(0, 8), 16));
      const nodes = new Set<string>([`${host}:${F.pick(partes)}`]);
      if (F.next() < 0.3) nodes.add(`${F.pick(ALL)}:${F.pick(partes)}`);
      const hit = new Set<string>();
      if (F.next() < 0.15) hit.add(F.pick(ALL));
      if (F.next() < 0.1) for (const p of partes) nodes.add(`${host}:${p}`); // remoção da raiz do próprio hospedeiro
      hit.delete(host);
      fx = { nodes, hit, estado: F.next() < 0.08 };
      fxCache.set(k, fx);
    }
    return fx;
  };

  // ---- funções do contrato: cópia literal de scripts/draw-tela-a2.ts ----
  const related = (a: string, b: string) => a === b || anc.get(a)!.has(b) || anc.get(b)!.has(a);
  const appliesTo = (v: VarianteBusca, inst: string) => !v.instancias || v.instancias.includes(inst);
  const instOfNode = (n: string) => n.split(":")[0];
  function clash(a: { inst: string; fx: FxBusca }, b: { inst: string; fx: FxBusca }): string | null {
    for (const n of a.fx.nodes) if (b.fx.nodes.has(n)) return `nó ${n}`;
    if (a.fx.hit.has(b.inst) || [...b.fx.nodes].some(n => a.fx.hit.has(instOfNode(n)))) return `cascata/remoção de ${a.inst} atinge ${b.inst}`;
    if (b.fx.hit.has(a.inst) || [...a.fx.nodes].some(n => b.fx.hit.has(instOfNode(n)))) return `cascata/remoção de ${b.inst} atinge ${a.inst}`;
    if (a.fx.estado && b.fx.estado) return "duas mudanças de estado da página";
    return null;
  }
  const touchedInstances = (p: { inst: string; fx: FxBusca }) => new Set([p.inst, ...[...p.fx.nodes].map(instOfNode), ...p.fx.hit]);
  function canPlace(placed: PlacementBusca[], p: PlacementBusca): boolean {
    const same = placed.filter(x => x.inst === p.inst);
    if (same.length >= params.maxPorInstancia || same.some(x => x.estrato === p.estrato)) return false;
    if (placed.some(x => x.tipo === p.tipo && related(x.inst, p.inst))) return false;
    return !placed.some(x => clash(x, p));
  }
  const ctx: ContextoBusca<RegraBusca> = { params, eligible, componentOf, drawable, scaffold, nodeLimit: 3_000_000, related, appliesTo, fxOf, clash, touchedInstances, canPlace };
  return { ctx, seed: sha256(`instancia-sintetica|${gseed}`).slice(0, 40) };
}

export interface ResultadoPropriedade { instancias: number; comSolucao: number; semSolucao: number; limite: number; divergencias: string[]; nosCega: number; nosPodada: number; podadaComMaisNos: number }

export function propriedadeBuscaPodada(n: number, base = 20261102): ResultadoPropriedade {
  const out: ResultadoPropriedade = { instancias: 0, comSolucao: 0, semSolucao: 0, limite: 0, divergencias: [], nosCega: 0, nosPodada: 0, podadaComMaisNos: 0 };
  for (let t = 0; t < n; t++) {
    const gseed = base + t;
    const { ctx, seed } = gerarInstancia(gseed);
    const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);
    const cega = buscar(ctx, key, "cega");
    if ("erro" in cega && cega.erro === "limite de nós") { out.limite++; continue; }
    const podada = buscar(ctx, key, "podada");
    out.instancias++;
    out.nosCega += cega.nodes; out.nosPodada += podada.nodes;
    if (podada.nodes > cega.nodes) out.podadaComMaisNos++;
    const a = "erro" in cega ? `ERRO ${cega.erro}` : solucaoCanonica(cega);
    const b = "erro" in podada ? `ERRO ${podada.erro}` : solucaoCanonica(podada);
    if ("erro" in cega) out.semSolucao++; else out.comSolucao++;
    if (a !== b) out.divergencias.push(`gerador ${gseed}: cega ${a.slice(0, 120)} × podada ${b.slice(0, 120)}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = Number(process.argv[2] ?? 2000), base = Number(process.argv[3] ?? 20261102);
  const t0 = Date.now();
  const r = propriedadeBuscaPodada(n, base);
  console.log(JSON.stringify({ ...r, divergencias: r.divergencias.slice(0, 10), ms: Date.now() - t0 }, null, 2));
  process.exit(r.divergencias.length || r.podadaComMaisNos ? 1 : 0);
}
