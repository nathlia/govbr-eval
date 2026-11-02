/**
 * Busca do sorteio da A2 com PODA SÓLIDA — revisão formal 2 (NAT-110, D-160).
 *
 * `buscar(ctx, keyFn, "cega")` é a busca de `solve()` de scripts/draw-tela-a2.ts copiada linha a linha, só com os
 * globais do script trocados por campos de `ctx` (mesma ordem de valores, mesmos desempates, mesma fase final:
 * compartilhadas → alternativas → chamarizes). `buscar(ctx, keyFn, "podada")` é EXATAMENTE a mesma busca, com
 * ganchos `if (poda && …) return null` em três pontos (entrada de dfs, de tryShared e de tryAlt). Cada gancho só
 * devolve null quando uma condição NECESSÁRIA para existir solução completa na subárvore falha; logo a poda só tira
 * subárvores sem solução, a ordem de visita do resto é a mesma, e a primeira solução devolvida é a da busca cega
 * sem limite de nós. Nada muda variável, ordem de valores ou desempate.
 *
 * Por que as condições são necessárias: todas as restrições do contrato são MONÓTONAS — acrescentar colocações
 * nunca torna possível uma colocação que já era impossível (canPlace(Q, p) ⇒ canPlace(Q', p) para Q' ⊆ Q), e o
 * conjunto de instâncias contaminadas só cresce. Cada limite abaixo compara o que ainda falta com o que AINDA é
 * possível no estado atual, que é um superconjunto do que será possível em qualquer estado descendente:
 *   (Q) cotas: para cada estrato s com faltam_s > 0, emparelhamento máximo regra → hospedeiro entre as regras de s
 *       ainda disponíveis (posição ≥ k) e os hospedeiros das colocações vivas delas (canPlace exato: mesmo hospedeiro
 *       e estrato, `tipo` em hospedeiros relacionados, clash, maxPorInstancia) ≥ faltam_s — specs novas de s são de
 *       regras distintas e em hospedeiros distintos (um por estrato por hospedeiro);
 *   (D) chamarizes: instâncias livres (não contaminadas, ≠ pagina) − mínimo de livres que as specs que faltam têm de
 *       ocupar (por estrato: faltam_s − hospedeiros vivos de s já não livres) ≥ chamarizes;
 *   (A×D) alternativas: existe trinca exata de alternativas (regras distintas na ordem de key("alternativa"),
 *       hospedeiros distintos, sem clash entre si, cada uma compatível com as colocações: `tipo` relacionado, clash,
 *       hospedeiro de defeito ou cópia da mesma regra) com a qual, somada a contaminação dela, (D) ainda vale;
 *   (C) compartilhadas: existe conjunto de `compartilhadas` candidatas — postas cujas cópias cabem contra as
 *       colocações menos a origem, ou futuras (regra disponível, colocação viva, cópias cabendo) — com regras
 *       distintas, no máximo faltam_s futuras por estrato, futura × futura compatível na ordem da fila, nenhuma
 *       bloqueando as cópias de outra, tal que com elas e as cópias delas na página (A×D) ainda vale (faltam_s
 *       descontadas as futuras escolhidas). Mais de 600 candidatas: não corta (custo), continua sólido;
 *   (R) relaxação do último estrato (G), só enquanto a busca está nos anteriores: existe escolha das specs que faltam
 *       de G, regra a regra em ordem de posição, cada uma viva contra as colocações e as já escolhidas, com (Q)(D)
 *       (A×D)(C) valendo a cada passo (regras dos outros estratos disponíveis = posição > a última spec posta)? Toda
 *       solução da subárvore dá um caminho assim; "não existe" ⇒ subárvore sem solução. Memo por conjunto posto (o
 *       resultado não depende de k); passou de 50.000 nós ⇒ "talvez", não corta.
 *   (R) e (C) supõem conflito simétrico (a ordem em que duas colocações entram não muda se são compatíveis); a poda
 *   confere isso na matriz inteira ao começar e recusa se não valer.
 *   Toda condição usa só superconjuntos do que uma solução descendente usa (colocações vivas agora, regras ainda
 *   disponíveis) e subconjuntos do que ela contamina e bloqueia; nenhuma depende da ordem de visita.
 * Em finish(), (A) e (D) valem de novo com as cópias compartilhadas (extra) e as alternativas já escolhidas.
 */

export interface VarianteBusca { id: string; instancias?: string[] }
export interface RegraBusca { id: string; estrato: string | null; tipo: string | null; instancias: string[]; variantes: VarianteBusca[]; alternativasValidas: VarianteBusca[] }
export interface FxBusca { nodes: Set<string>; hit: Set<string>; estado: boolean }
export interface PlacementBusca { inst: string; estrato: string; tipo: string; fx: FxBusca }
export interface SpecBusca { regra: string; estrato: string; tipo: string; instancia: string; variante: string; compartilhadaCom: string[] }
export interface SolucaoBusca { specs: SpecBusca[]; alternatives: { regra: string; alternativa: string; instancia: string }[]; decoys: string[]; nodes: number; repairs: number }
export interface FalhaBusca { erro: string; nodes: number }
export interface ParamsBusca { ordemEstratos: string[]; cotas: Record<string, number>; maxPorInstancia: number; compartilhadas: number; alternativasValidas: number; chamarizes: number }
export interface ContextoBusca<R extends RegraBusca> {
  params: ParamsBusca;
  eligible: R[];
  componentOf: Map<string, string>;
  drawable: string[];
  scaffold: string[];
  nodeLimit: number;
  related(a: string, b: string): boolean;
  appliesTo(v: VarianteBusca, inst: string): boolean;
  fxOf(rule: R, kind: "variantes" | "alternativas", id: string, host: string): FxBusca;
  clash(a: { inst: string; fx: FxBusca }, b: { inst: string; fx: FxBusca }): string | null;
  touchedInstances(p: { inst: string; fx: FxBusca }): Set<string>;
  canPlace(placed: PlacementBusca[], p: PlacementBusca): boolean;
}
export interface EstatPoda { cortesDfs: Record<string, number>; cortesFim: Record<string, number>; folhas: number; /** diagnóstico: chamado a cada ~10 s, só com contagens (nem ids nem posições na fila: com a semente pública, posições identificam regras) */ progresso?: (info: Record<string, unknown>) => void }

// ---------- bitset mínimo ----------
const words = (n: number) => Math.max(1, Math.ceil(n / 32));
const setBit = (b: Uint32Array, i: number) => { b[i >>> 5] |= 1 << (i & 31); };
const hasBit = (b: Uint32Array, i: number) => (b[i >>> 5] & (1 << (i & 31))) !== 0;
const orInto = (dst: Uint32Array, src: Uint32Array) => { for (let w = 0; w < dst.length; w++) dst[w] |= src[w]; };

/** Busca em ordem lexicográfica fixa. modo "cega" = solve() do script; "podada" = a mesma, com os ganchos. */
export function buscar<R extends RegraBusca>(ctx: ContextoBusca<R>, keyFn: (label: string, id: string) => string, modo: "cega" | "podada", estat?: EstatPoda): SolucaoBusca | FalhaBusca {
  const params = ctx.params;
  const eligible = ctx.eligible;
  const componentOf = ctx.componentOf;
  const drawable = ctx.drawable;
  const scaffold = ctx.scaffold;
  const NODE_LIMIT = ctx.nodeLimit;
  const related = (a: string, b: string) => ctx.related(a, b);
  const appliesTo = (v: VarianteBusca, inst: string) => ctx.appliesTo(v, inst);
  const fxOf = (rule: R, kind: "variantes" | "alternativas", id: string, host: string) => ctx.fxOf(rule, kind, id, host);
  const clash = (a: { inst: string; fx: FxBusca }, b: { inst: string; fx: FxBusca }) => ctx.clash(a, b);
  const touchedInstances = (p: { inst: string; fx: FxBusca }) => ctx.touchedInstances(p);
  const canPlace = (placed: PlacementBusca[], p: PlacementBusca) => ctx.canPlace(placed, p);
  type Estrato = string;
  type Placement = PlacementBusca;
  type Spec = SpecBusca;
  type Solution = SolucaoBusca;

  // ===== início da cópia de solve() (scripts/draw-tela-a2.ts), ganchos de poda marcados com PODA =====
  const byKey = <T>(label: string, items: T[], idOf: (x: T) => string) => [...items].sort((a, b) => keyFn(label, idOf(a)).localeCompare(keyFn(label, idOf(b))) || idOf(a).localeCompare(idOf(b)));
  const queue = params.ordemEstratos.flatMap(s => byKey("regra", eligible.filter(r => r.estrato === s), r => r.id));
  const remaining = params.ordemEstratos.map(s => queue.map(r => (r.estrato === s ? 1 : 0)));
  const suffix = params.ordemEstratos.map((_, si) => { const a = new Array(queue.length + 1).fill(0); for (let k = queue.length - 1; k >= 0; k--) a[k] = a[k + 1] + remaining[si][k]; return a; });
  let nodes = 0; let leaves = 0;
  const specs: Spec[] = []; const placed: Placement[] = [];
  const count = (s: Estrato) => specs.filter(x => x.estrato === s).length;
  const poda = modo === "podada" ? criarPoda() : null; // PODA

  function finish(): Solution | null {
    // 2. compartilhadas: combinações na ordem fixa; a cópia leva a mesma variante, com os efeitos no hospedeiro irmão
    const ordered = byKey("compartilhada", specs, s => s.regra);
    const options = ordered.map(spec => {
      const rule = eligible.find(r => r.id === spec.regra)!;
      const variant = rule.variantes.find(v => v.id === spec.variante)!;
      return { spec, rule, sibs: rule.instancias.filter(i => i !== spec.instancia && componentOf.get(i) === componentOf.get(spec.instancia) && appliesTo(variant, i)) };
    }).filter(o => o.sibs.length > 0);
    const pick: typeof options = [];
    const extra: Placement[] = [];
    const tryShared = (from: number): Solution | null => {
      if (poda && poda.mortoNoFim(extra, [], "compartilhadas")) return null; // PODA
      if (pick.length === params.compartilhadas) return afterShared();
      for (let k = from; k < options.length; k++) {
        const o = options[k]; const add: Placement[] = [];
        let ok = true;
        const origin = placed[specs.indexOf(o.spec)];
        for (const s of o.sibs) {
          const p = { inst: s, estrato: o.spec.estrato, tipo: o.spec.tipo, fx: fxOf(o.rule, "variantes", o.spec.variante, s) };
          // a cópia é a mesma mutação no irmão: contra a origem só vale a incompatibilidade semântica (nó comum,
          // cascata cruzada), não a regra do `tipo`; contra todo o resto vale o contrato inteiro
          if (!canPlace([...placed, ...extra, ...add].filter(x => x !== origin), p) || clash(origin, p)) { ok = false; break; }
          add.push(p);
        }
        if (!ok) continue;
        pick.push(o); extra.push(...add);
        const r = tryShared(k + 1); if (r) return r;
        pick.pop(); extra.splice(extra.length - add.length, add.length);
      }
      return null;
    };
    const afterShared = (): Solution | null => {
      const all = [...placed, ...extra];
      // 3. alternativas válidas
      const rulesAlt = byKey("alternativa", eligible.filter(r => r.alternativasValidas.length > 0), r => r.id);
      const chosen: { regra: string; alternativa: string; instancia: string; p: Placement }[] = [];
      const tryAlt = (from: number): Solution | null => {
        if (poda && poda.mortoNoFim(extra, chosen.map(c => c.p), "alternativas")) return null; // PODA
        if (chosen.length === params.alternativasValidas) {
          // 4. chamarizes: instância sem colocação e não atingida por nenhuma colocação (nós, cascata, remoção)
          const contaminated = new Set<string>();
          for (const p of [...all, ...chosen.map(c => c.p)]) for (const i of touchedInstances(p)) contaminated.add(i);
          const free = byKey("chamariz", [...drawable, ...scaffold].filter(i => i !== "pagina" && !contaminated.has(i)), i => i);
          if (free.length < params.chamarizes) return null;
          const finalSpecs = specs.map(s => ({ ...s, compartilhadaCom: pick.find(p => p.spec === s)?.sibs ?? [] }));
          return { specs: finalSpecs, alternatives: chosen.map(({ p, ...c }) => c), decoys: free.slice(0, params.chamarizes), nodes, repairs: leaves - 1 };
        }
        for (let k = from; k < rulesAlt.length; k++) {
          const rule = rulesAlt[k];
          for (const alt of byKey(`alternativa:${rule.id}`, rule.alternativasValidas, a => a.id)) {
            const hosts = byKey(`alternativa-hospedeiro:${rule.id}:${alt.id}`, alt.instancias ?? rule.instancias, i => i);
            for (const inst of hosts) {
              if (chosen.some(c => c.instancia === inst)) continue;
              if (specs.some(s => s.regra === rule.id && (s.instancia === inst || pick.find(p => p.spec === s)?.sibs.includes(inst)))) continue;
              if (all.some(p => p.tipo === rule.tipo && related(p.inst, inst))) continue;
              const p: Placement = { inst, estrato: rule.estrato!, tipo: rule.tipo!, fx: fxOf(rule, "alternativas", alt.id, inst) };
              if ([...all, ...chosen.map(c => c.p)].some(x => clash(x, p))) continue;
              chosen.push({ regra: rule.id, alternativa: alt.id, instancia: inst, p });
              const r = tryAlt(k + 1); if (r) return r;
              chosen.pop();
            }
          }
        }
        return null;
      };
      return tryAlt(0);
    };
    return tryShared(0);
  }

  function dfs(k: number): Solution | null {
    if (++nodes > NODE_LIMIT) throw new Error("limite de nós");
    if (poda && poda.morto(k)) return null; // PODA
    if (params.ordemEstratos.every(s => count(s) === params.cotas[s])) { leaves++; return finish(); }
    if (k >= queue.length) return null;
    for (let si = 0; si < params.ordemEstratos.length; si++) if (count(params.ordemEstratos[si]) + suffix[si][k] < params.cotas[params.ordemEstratos[si]]) return null;
    const rule = queue[k];
    const s = rule.estrato as Estrato;
    if (count(s) < params.cotas[s]) {
      for (const host of byKey(`instancia:${rule.id}`, rule.instancias, i => i)) {
        for (const v of byKey(`variante:${rule.id}`, rule.variantes.filter(x => appliesTo(x, host)), x => x.id)) {
          const p = { inst: host, estrato: s, tipo: rule.tipo!, fx: fxOf(rule, "variantes", v.id, host) };
          if (!canPlace(placed, p)) continue;
          placed.push(p); specs.push({ regra: rule.id, estrato: s, tipo: rule.tipo!, instancia: host, variante: v.id, compartilhadaCom: [] });
          const r = dfs(k + 1); if (r) return r;
          placed.pop(); specs.pop();
        }
      }
    }
    return dfs(k + 1); // pular
  }
  // ===== fim da cópia de solve() =====

  /**
   * Os limites (Q), (C), (A), (D). Leem só `specs`/`placed` (o estado da busca) e nunca os alteram; os mesmos
   * fxOf/clash/related/touchedInstances do contrato, pré-computados em matrizes.
   */
  function criarPoda() {
    const P = params;
    // --- colocações de spec: (regra, hospedeiro, variante) — inclui as cópias compartilhadas, que são colocações
    //     da mesma regra e variante num irmão em que a variante vale
    interface Pl { rule: R; inst: string; estrato: string; tipo: string; v: string; fx: FxBusca }
    const pls: Pl[] = [];
    const plIndex = new Map<string, number>();
    const ruleRange = new Map<string, number[]>();
    for (const r of eligible) {
      const idx: number[] = [];
      for (const host of r.instancias) for (const v of r.variantes.filter(x => appliesTo(x, host))) {
        const key = `${r.id}\u0000${host}\u0000${v.id}`;
        if (plIndex.has(key)) continue;
        plIndex.set(key, pls.length); idx.push(pls.length);
        pls.push({ rule: r, inst: host, estrato: r.estrato!, tipo: r.tipo!, v: v.id, fx: fxOf(r, "variantes", v.id, host) });
      }
      ruleRange.set(r.id, idx);
    }
    // fxOf tem de ser memoizado (um objeto por regra|tipo|id|hospedeiro, como o fxCache do script): as cópias e as
    // alternativas escolhidas em finish() são reconhecidas pelo objeto de efeito
    const fxToIdx = new Map<FxBusca, number>();
    pls.forEach((pl, i) => { if (fxToIdx.has(pl.fx)) throw new Error("poda: o mesmo objeto de efeito em duas colocações"); fxToIdx.set(pl.fx, i); });
    if (pls.length && fxOf(pls[0].rule, "variantes", pls[0].v, pls[0].inst) !== pls[0].fx) throw new Error("poda: fxOf não é memoizado");
    const N = pls.length, W = words(N);
    // blockedBy[j] = colocações i que deixam de caber quando j está posta (direção do canPlace: clash(posta, nova))
    const blockedBy = pls.map(() => new Uint32Array(W));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (i === j) continue;
      const a = pls[j], b = pls[i];
      if ((a.inst === b.inst && a.estrato === b.estrato) || (a.tipo === b.tipo && related(a.inst, b.inst)) || clash(a, b)) setBit(blockedBy[j], i);
    }
    // (R) e (C) comparam colocações fora da ordem em que a busca as poria: exigem conflito simétrico. clash() do script
    // olha as duas direções, e o resto (hospedeiro e estrato, `tipo` relacionado) é simétrico; confere em vez de supor.
    for (let j = 0; j < N; j++) for (let i = j + 1; i < N; i++) if (hasBit(blockedBy[j], i) !== hasBit(blockedBy[i], j)) throw new Error("poda: conflito não simétrico entre colocações; a poda não vale para este contrato");
    // cópias de cada colocação (mesma regra e variante nos irmãos do mesmo componente) e se a origem já as impede
    const copies: number[][] = pls.map(pl => {
      const rv = pl.rule.variantes.find(v => v.id === pl.v)!;
      return pl.rule.instancias.filter(i => i !== pl.inst && componentOf.get(i) === componentOf.get(pl.inst) && appliesTo(rv, i)).map(i => plIndex.get(`${pl.rule.id}\u0000${i}\u0000${pl.v}`)!);
    });
    const sharedStatic = pls.map((pl, i) => copies[i].length > 0 && copies[i].every(c => !clash(pl, pls[c])));

    // --- instâncias do chamariz (com multiplicidade, como em finish) e contaminação por colocação
    const instIds = new Map<string, number>();
    const iid = (s: string) => { let v = instIds.get(s); if (v === undefined) { v = instIds.size; instIds.set(s, v); } return v; };
    const univ = [...drawable, ...scaffold].filter(i => i !== "pagina").map(iid);
    const univDistinto = new Set(univ).size === univ.length;
    const contamOf = (p: { inst: string; fx: FxBusca }) => [...touchedInstances(p)].map(iid);
    const plContam = pls.map(contamOf);
    const plHost = pls.map(pl => iid(pl.inst));

    // --- alternativas: regras na ordem de key('alternativa'), como em afterShared
    const rulesAlt = byKey("alternativa", eligible.filter(r => r.alternativasValidas.length > 0), r => r.id);
    interface Al { ri: number; rule: R; inst: string; tipo: string; fx: FxBusca }
    const als: Al[] = [];
    rulesAlt.forEach((rule, ri) => {
      for (const alt of rule.alternativasValidas) for (const inst of alt.instancias ?? rule.instancias)
        als.push({ ri, rule, inst, tipo: rule.tipo!, fx: fxOf(rule, "alternativas", alt.id, inst) });
    });
    const NA = als.length, WA = words(NA);
    // altBlockedBy[j]: alternativas impedidas pela colocação de spec (ou cópia) j: mesmo `tipo` relacionado, clash,
    // ou hospedeiro de defeito (ou cópia) da mesma regra
    const altBlockedBy = pls.map(pl => {
      const m = new Uint32Array(WA);
      als.forEach((a, i) => { if ((pl.rule.id === a.rule.id && pl.inst === a.inst) || (pl.tipo === a.tipo && related(pl.inst, a.inst)) || clash(pl, a)) setBit(m, i); });
      return m;
    });
    // par de alternativas (anterior na ordem de regras, posterior): hospedeiros distintos e sem clash(anterior, posterior)
    const altPairOk = als.map((a, i) => als.map((b, j) => i !== j && a.ri < b.ri && a.inst !== b.inst && !clash(a, b)));
    const alContam = als.map(contamOf);
    const altIdxOf = (p: Placement) => { const i = als.findIndex(a => a.inst === p.inst && a.fx === p.fx); if (i < 0) throw new Error("poda: alternativa fora das pré-computadas"); return i; };

    const queueIdx = queue.map(r => ruleRange.get(r.id)!);
    const placedIdx = () => specs.map(s => plIndex.get(`${s.regra}\u0000${s.instancia}\u0000${s.variante}`)!);
    let chamadas = 0, ultimoProgresso = Date.now(), nosRelaxacao = 0;
    const conta = (tab: Record<string, number>, motivo: string) => { if (estat) tab[motivo] = (tab[motivo] ?? 0) + 1; };

    /** existe escolha de `need` alternativas (regras distintas em ordem, hospedeiros distintos, sem clash) entre as vivas? */
    function alternativasPossiveis(vivas: boolean[], escolhidas: number[], need: number, aceita?: (pick: number[]) => boolean): boolean {
      if (need <= 0) return aceita ? aceita([...escolhidas]) : true;
      const pick: number[] = [...escolhidas];
      const rec = (fromRi: number, falta: number): boolean => {
        if (falta === 0) return aceita ? aceita(pick) : true;
        for (let i = 0; i < NA; i++) {
          if (!vivas[i] || als[i].ri < fromRi) continue;
          if (!pick.every(p => altPairOk[p][i])) continue;
          pick.push(i);
          if (rec(als[i].ri + 1, falta - 1)) return true;
          pick.pop();
        }
        return false;
      };
      const start = escolhidas.length ? Math.max(...escolhidas.map(e => als[e].ri)) + 1 : 0;
      return rec(start, need);
    }
    function livres(contam: Uint8Array) { let f = 0; for (const u of univ) if (!contam[u]) f++; return f; }

    // posições da fila por estrato (a fila é a concatenação dos estratos na ordemEstratos)
    const posBy = new Map<string, number[]>(P.ordemEstratos.map(s => [s, [] as number[]]));
    queue.forEach((r, q) => posBy.get(r.estrato!)!.push(q));
    const ULT = P.ordemEstratos[P.ordemEstratos.length - 1];
    const inicioUlt = ULT === undefined ? -1 : (posBy.get(ULT)![0] ?? -1);
    const posOf = new Map(queue.map((r, q) => [r.id, q]));

    interface Estado { all: number[]; blocked: Uint32Array; cnt: Map<string, number>; alive: (i: number) => boolean }
    function estado(all: number[]): Estado {
      const blocked = new Uint32Array(W);
      for (const j of all) orInto(blocked, blockedBy[j]);
      const cnt = new Map<string, number>();
      for (const j of all) cnt.set(pls[j].inst, (cnt.get(pls[j].inst) ?? 0) + 1);
      return { all, blocked, cnt, alive: (i: number) => !hasBit(blocked, i) && (cnt.get(pls[i].inst) ?? 0) < P.maxPorInstancia };
    }
    /** emparelhamento máximo regra → hospedeiro (só colocações vivas), parando em `need`: specs novas de um estrato ocupam hospedeiros distintos */
    function emparelha(posicoes: number[], de: number, alive: (i: number) => boolean, need: number): number {
      const dono = new Map<number, number>();
      const adjCache = new Map<number, number[]>();
      const adj = (q: number) => { let a = adjCache.get(q); if (!a) { a = [...new Set(queueIdx[q].filter(alive).map(i => plHost[i]))]; adjCache.set(q, a); } return a; };
      const tenta = (q: number, visto: Set<number>): boolean => {
        for (const h of adj(q)) {
          if (visto.has(h)) continue;
          visto.add(h);
          const o = dono.get(h);
          if (o === undefined || tenta(o, visto)) { dono.set(h, q); return true; }
        }
        return false;
      };
      let n = 0;
      for (const q of posicoes) { if (q < de) continue; if (n >= need) break; if (adj(q).length && tenta(q, new Set())) n++; }
      return n;
    }
    /**
     * (Q)(D)(A)(C) para o conjunto de colocações `all` (specs e, no relaxado, specs candidatas do último estrato), com as
     * regras ainda disponíveis de cada estrato = posições da fila ≥ de[s]. Devolve o motivo do corte ou null.
     */
    function corte(E: Estado, de: Record<string, number>): string | null {
      const { all, blocked, cnt, alive } = E;
      const falta: Record<string, number> = {};
      for (const s of P.ordemEstratos) falta[s] = P.cotas[s] - all.filter(j => pls[j].estrato === s).length;
      // (Q) cotas, por emparelhamento regra → hospedeiro distinto
      for (const s of P.ordemEstratos) {
        if (falta[s] <= 0) continue;
        if (emparelha(posBy.get(s)!, de[s], alive, falta[s]) < falta[s]) return `cota-${s}`;
      }
      // (D) chamarizes: livres − mínimo de livres que as specs que faltam ocupam (por estrato, hospedeiros distintos)
      const chamarizesOk = (lista: number[], f: Record<string, number> = falta, extra: number[] = []) => {
        const contam = new Uint8Array(instIds.size + 1);
        for (const j of lista) for (const c of plContam[j]) contam[c] = 1;
        for (const c of extra) contam[c] = 1;
        const F = livres(contam);
        let lb = 0;
        if (univDistinto) {
          const isFreeUniv = new Uint8Array(instIds.size + 1);
          for (const u of univ) if (!contam[u]) isFreeUniv[u] = 1;
          for (const s of P.ordemEstratos) {
            if (f[s] <= 0) continue;
            const hosts = new Set<number>();
            for (const q of posBy.get(s)!) if (q >= de[s]) for (const i of queueIdx[q]) if (alive(i)) hosts.add(plHost[i]);
            let naoLivres = 0;
            for (const h of hosts) if (!isFreeUniv[h]) naoLivres++;
            lb = Math.max(lb, f[s] - naoLivres);
          }
        }
        return F - Math.max(0, lb) >= P.chamarizes;
      };
      if (!chamarizesOk(all)) return "chamarizes";
      // (A×D) alternativas: existe trinca exata compatível com as colocações, e com ela (contaminação das alternativas
      // incluída) os chamarizes ainda fecham
      const alternativasOk = (lista: number[], f: Record<string, number> = falta) => {
        const altBlocked = new Uint32Array(WA);
        for (const j of lista) orInto(altBlocked, altBlockedBy[j]);
        return alternativasPossiveis(als.map((_, i) => !hasBit(altBlocked, i)), [], P.alternativasValidas, pick => chamarizesOk(lista, f, pick.flatMap(a => alContam[a])));
      };
      if (!alternativasOk(all)) return "alternativas";
      // (C) compartilhadas. Toda solução escolhe `need` specs compartilhadas; cada uma já está posta (e então as cópias
      // dela cabem contra as colocações menos ela) ou é futura (regra disponível, colocação viva, cópias cabendo). Com
      // as escolhidas e as cópias delas na página, alternativas e chamarizes ainda têm de fechar. Enumera os conjuntos
      // de candidatas com condições só necessárias: regras distintas, no máximo `falta` futuras por estrato, futura ×
      // futura compatível na ordem da fila (a de posição menor é posta antes), nenhuma escolhida bloqueia as cópias de
      // outra; (A) e (D) com tudo isso. Nenhum conjunto ⇒ sem solução.
      const need = P.compartilhadas;
      if (need <= 0) return null;
      interface Cand { i: number; futura: boolean; s: string; q: number; lista: number[] }
      const cands: Cand[] = [];
      for (const j of all) {
        if (!sharedStatic[j]) continue;
        const bl = new Uint32Array(W);
        for (const o of all) if (o !== j) orInto(bl, blockedBy[o]);
        if (copies[j].every(c => !hasBit(bl, c) && ((cnt.get(pls[c].inst) ?? 0) - (pls[j].inst === pls[c].inst ? 1 : 0)) < P.maxPorInstancia))
          cands.push({ i: j, futura: false, s: pls[j].estrato, q: -1, lista: copies[j] });
      }
      const capFuturo = (i: number) => sharedStatic[i] && alive(i) && copies[i].every(c => !hasBit(blocked, c) && (cnt.get(pls[c].inst) ?? 0) < P.maxPorInstancia);
      for (const s of P.ordemEstratos) {
        if (falta[s] <= 0) continue;
        for (const q of posBy.get(s)!) {
          if (q < de[s]) continue;
          for (const i of queueIdx[q]) if (capFuturo(i) && alternativasOk([...all, i, ...copies[i]], { ...falta, [s]: falta[s] - 1 })) cands.push({ i, futura: true, s, q, lista: [i, ...copies[i]] });
        }
      }
      if (cands.length < need) return "compartilhadas";
      if (cands.length > 600) return null; // limite de custo: sem enumeração, sem corte (continua sólido)
      const sub: Cand[] = [];
      const compativel = (a: Cand, b: Cand) => {
        if (a.futura && b.futura) {
          if (a.q === b.q) return false; // mesma regra
          const [x, y] = a.q < b.q ? [a, b] : [b, a];
          if (hasBit(blockedBy[x.i], y.i)) return false;
        }
        // nenhuma escolhida futura bloqueia as cópias da outra (as postas já foram conferidas contra todas as colocações)
        if (b.futura && copies[a.i].some(c => hasBit(blockedBy[b.i], c))) return false;
        if (a.futura && copies[b.i].some(c => hasBit(blockedBy[a.i], c))) return false;
        return true;
      };
      const fecha = (): boolean => {
        const faltaAdj: Record<string, number> = { ...falta };
        for (const c of sub) if (c.futura) faltaAdj[c.s]--;
        if (P.ordemEstratos.some(s => faltaAdj[s] < 0)) return false;
        const lista = [...all, ...sub.flatMap(c => c.lista)];
        return alternativasOk(lista, faltaAdj);
      };
      const existe = (de0: number): boolean => {
        if (sub.length === need) return fecha();
        for (let t = de0; t < cands.length; t++) {
          const c = cands[t];
          if (!sub.every(o => compativel(o, c))) continue;
          sub.push(c); if (existe(t + 1)) return true; sub.pop();
        }
        return false;
      };
      return existe(0) ? null : "compartilhadas";
    }

    /**
     * (R) relaxação do último estrato, enquanto a busca ainda está nos estratos anteriores: existe escolha das specs que
     * faltam do último estrato (regras distintas, em ordem de posição, cada uma viva contra as colocações e as já
     * escolhidas) tal que (Q)(D)(A)(C) valem a cada passo, contando como disponíveis as regras dos outros estratos de
     * posição > a última spec posta? Toda completação verdadeira do estado dá um caminho assim (restrições monótonas),
     * logo "não existe" implica subárvore sem solução. Depende só do conjunto posto (memo); limite de nós = "talvez" (não corta).
     */
    const memoR = new Map<string, boolean>();
    const LIMITE_R = 50_000;
    const ESGOTOU = new Error("limite da relaxação");
    function relaxadoUltimo(idx: number[]): boolean {
      const chave = idx.join(",");
      const m = memoR.get(chave);
      if (m !== undefined) return m;
      if (memoR.size > 2_000_000) memoR.clear();
      const ultimaPos = Math.max(-1, ...idx.map(j => posOf.get(pls[j].rule.id)!));
      let nos = 0;
      const escolhidas: number[] = [];
      const rec = (q: number): boolean => {
        if (++nos > LIMITE_R) throw ESGOTOU;
        nosRelaxacao++;
        const E = estado([...idx, ...escolhidas]);
        const de: Record<string, number> = {};
        for (const s of P.ordemEstratos) de[s] = s === ULT ? q : ultimaPos + 1;
        if (corte(E, de)) return false;
        const faltaU = P.cotas[ULT] - E.all.filter(j => pls[j].estrato === ULT).length;
        if (faltaU <= 0) return true;
        for (const p of posBy.get(ULT)!) {
          if (p < q) continue;
          for (const i of queueIdx[p]) if (E.alive(i)) { escolhidas.push(i); if (rec(p + 1)) return true; escolhidas.pop(); }
        }
        return false;
      };
      let r: boolean;
      try { r = rec(Math.max(inicioUlt, ultimaPos + 1)); } catch (e) { if (e !== ESGOTOU) throw e; r = true; conta(estat?.cortesFim ?? {}, "relaxacao-esgotada"); }
      memoR.set(chave, r);
      return r;
    }

    return {
      /** Entrada de dfs(k): o estado (specs postas, próxima regra k) ainda pode levar a uma solução completa? */
      morto(k: number): boolean {
        if (estat?.progresso && (++chamadas & 0xff) === 0 && Date.now() - ultimoProgresso > 10_000) { ultimoProgresso = Date.now(); estat.progresso({ chamadas, k, relaxacoes: memoR.size, nosRelaxacao, postasPorEstrato: Object.fromEntries(P.ordemEstratos.map(e => [e, specs.filter(x => x.estrato === e).length])), cortesDfs: estat.cortesDfs, cortesFim: estat.cortesFim, folhas: leaves }); }
        const idx = placedIdx();
        const E = estado(idx);
        const de: Record<string, number> = {};
        for (const s of P.ordemEstratos) de[s] = k;
        const motivo = corte(E, de);
        if (motivo) { conta(estat?.cortesDfs ?? {}, motivo); return true; }
        // (R) só antes do último estrato, e só se ainda faltam specs dele
        if (inicioUlt > 0 && k <= inicioUlt && P.cotas[ULT] - idx.filter(j => pls[j].estrato === ULT).length > 0 && !relaxadoUltimo(idx)) { conta(estat?.cortesDfs ?? {}, "relaxacao-ultimo-estrato"); return true; }
        return false;
      },
      /** Em finish(): com as cópias compartilhadas (extra) e as alternativas já escolhidas, (D) e (A) ainda fecham? */
      mortoNoFim(extra: Placement[], escolhidas: Placement[], fase: string): boolean {
        const idx = [...placedIdx(), ...extra.map(p => { const i = fxToIdx.get(p.fx); if (i === undefined || pls[i].inst !== p.inst) throw new Error("poda: cópia compartilhada fora das colocações"); return i; })];
        const contam = new Uint8Array(instIds.size + 1);
        for (const j of idx) for (const c of plContam[j]) contam[c] = 1;
        const esc = escolhidas.map(altIdxOf);
        for (const a of esc) for (const c of alContam[a]) contam[c] = 1;
        if (livres(contam) < P.chamarizes) { conta(estat?.cortesFim ?? {}, `${fase}-chamarizes`); return true; }
        const altBlocked = new Uint32Array(WA);
        for (const j of idx) orInto(altBlocked, altBlockedBy[j]);
        const vivas = als.map((a, i) => !hasBit(altBlocked, i) && esc.every(e => e !== i && als[e].inst !== a.inst && !clash(als[e], a)));
        if (!alternativasPossiveis(vivas, esc, P.alternativasValidas - esc.length)) { conta(estat?.cortesFim ?? {}, `${fase}-alternativas`); return true; }
        return false;
      },
    };
  }

  try { const r = dfs(0); if (estat) estat.folhas = leaves; return r ?? { erro: "sem solução que cumpra cotas, compartilhadas, alternativas e chamarizes", nodes }; }
  catch (e) { if (estat) estat.folhas = leaves; return { erro: (e as Error).message, nodes }; }
}

/** Revisão formal 2: a execução selada só grava o sorteio se a solução for a do compromisso do ensaio; senão, falha com este motivo. */
export function conferirCompromisso(solucaoSha256: string, esperado: string): null | "hash-do-ensaio-diverge" {
  return solucaoSha256 === esperado ? null : "hash-do-ensaio-diverge";
}

/** Forma canônica da solução (sem nós e reparos, que dependem da poda) — para comparar e para o compromisso sha256. */
export function solucaoCanonica(s: SolucaoBusca): string {
  return JSON.stringify({ specs: s.specs, alternativasValidas: s.alternatives, chamarizes: s.decoys });
}
