/**
 * Portão G0 (plano §7): reproduzir o original antes de qualquer mudança.
 *
 * 1. Os 30 pacotes arquivados (flow-semantic-1.5.0) repontuados pelo caminho legado do scorer vigente
 *    (`scoreSemanticPackage` aceita as versões de `scoring.semanticLegacy` e pontua pelo caminho delas)
 *    dão `score.json` idêntico byte a byte ao arquivado — o mesmo que `analisar` grava.
 * 2. D por par, média, mediana, desvio-padrão, IC, permutação, Wilcoxon e sinal idênticos ao
 *    RESULTADOS.md (valores fixados abaixo) e ao `conferencia-resultados.json` da revisão integrada.
 * 3. Secundários e o estado da linha de base axe da tela B.
 *
 * Qualquer diferença para tudo: o portão só registra, nunca corrige.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { analisePareada, type AnalisePareada } from "../estatistica-pareada";
import { reviewQueue, scoreSemanticPackage, type SemanticPackage } from "../semantic-flow";
import {
  CAMPANHAS, MODO_D, REVISAO_INTEGRADA, RESULTADOS, SEMENTES, bracoDosCartoes, chavePar, jsonTexto, lerJson, lerPar, paresDaCampanha, sha,
  type Campanha, type ParLido,
} from "./comum";

type Score = ReturnType<typeof scoreSemanticPackage>;

/** Contagens por braço de agente de um par, tiradas do score (as mesmas que o summary.json carrega). */
export interface ContagemBraco {
  runId: string;
  unidades: number; total: number;
  /** A-* (tela A) confirmadas; na tela B, todas. */
  sorteadas: number;
  pagina: { confirmadas: number; total: number } | null;
  specs: number; specsTotal: number;
  incorretas: number; novas: number; pendentes: number;
  precisaoAfirmacoes: number | null;
  unidadesConfirmadas: string[];
}

export function contagemDoRun(pkg: SemanticPackage, score: Score, runId: string): ContagemBraco {
  const s = score.scores.find(x => x.runId === runId);
  if (!s) throw new Error(`run ${runId} sem pontuação`);
  const fam = (pref: string) => s.families.filter(f => f.specId.startsWith(pref));
  const temP = s.families.some(f => f.specId.startsWith("P-"));
  const detectadas = new Set(s.matched.map(m => m.unitId));
  const specOf = new Map(pkg.units.map(u => [u.id, u.specId]));
  const specs = new Set([...detectadas].map(u => specOf.get(u)!));
  return {
    runId, unidades: s.counts.detectedUnits, total: s.counts.referenceUnits,
    sorteadas: temP ? fam("A-").reduce((n, f) => n + f.detected, 0) : s.counts.detectedUnits,
    pagina: temP ? { confirmadas: fam("P-").reduce((n, f) => n + f.detected, 0), total: fam("P-").reduce((n, f) => n + f.total, 0) } : null,
    specs: specs.size, specsTotal: new Set(pkg.units.map(u => u.specId)).size,
    incorretas: s.counts.falseAssertions, novas: s.counts.novelAssertions, pendentes: s.pendingCardIds.length,
    precisaoAfirmacoes: s.metrics.assertionPrecision,
    unidadesConfirmadas: [...detectadas].sort(),
  };
}

export function runsDosBracos(pkg: SemanticPackage): { sem: string; com: string; axe: string | null; validator: string | null } {
  const m = bracoDosCartoes(pkg);
  const de = (b: string) => pkg.runs.find(r => r.cardIds.some(id => m.get(id)?.braco === b))?.id ?? null;
  const agentes = pkg.runs.filter(r => r.kind === "agente");
  const sem = agentes.find(r => (r.config as { oracleProfile?: string })?.oracleProfile === "none")!.id;
  const com = agentes.find(r => (r.config as { oracleProfile?: string })?.oracleProfile !== "none")!.id;
  return { sem, com, axe: de("lb-axe") ?? pkg.runs.find(r => r.tool === "axe-core")?.id ?? null,
    validator: de("lb-validator") ?? pkg.runs.find(r => r.kind === "linha-de-base" && r.tool !== "axe-core")?.id ?? null };
}

/** D do par pela agenda original (P15): A = unidades A-*, B = specs. */
export const dDoPar = (c: Campanha, sem: ContagemBraco, com: ContagemBraco): number =>
  MODO_D[c] === "spec" ? com.specs - sem.specs : com.sorteadas - sem.sorteadas;

/** Valores oficiais, copiados do RESULTADOS.md (b69857f) e do D-97/D-111/D-112. */
export const OFICIAL: Record<Campanha, { d: number[]; media: number; mediana: number; dp2: string; ic: [number, number]; p: number; wilcoxonP: number; sinalP: number;
  fonte: string }> = {
  "t7-tela-a-01": { d: [0, 2, 0, 1, -1, 0, -1, -2, 1, 0], media: 0, mediana: 0, dp2: "1.15", ic: [-0.7, 0.7], p: 1, wilcoxonP: 1, sinalP: 1, fonte: "RESULTADOS.md + D-97" },
  "t7b-sonnet-tela-a-01": { d: [3, 2, 0, 1, -2, -3, -1, 2, -2, -2], media: -0.2, mediana: -0.5, dp2: "2.10", ic: [-1.4, 1], p: 0.8828, wilcoxonP: 0.8633, sinalP: 1, fonte: "RESULTADOS.md + D-112" },
  "t7-tela-b-01": { d: [-1, 0, -3, -2, 0, 0, -2, 2, -3, 2], media: -0.7, mediana: -0.5, dp2: "1.83", ic: [-1.7, 0.4], p: 0.3125, wilcoxonP: 0.2813, sinalP: 0.4531, fonte: "RESULTADOS.md + D-111" },
};
/** Secundários do plano §7 (G0). */
export const SECUNDARIOS_OFICIAIS = {
  "t7-tela-b-01": { unidades: { sem: 327, com: 320, total: 1020 }, incorretas: { sem: 41, com: 29 } },
  "t7b-sonnet-tela-a-01": { pagina: { sem: 0, com: 6, total: 20 } },
  "t7-tela-a-01": { pagina: { sem: 0, com: 17, total: 20 } },
} as const;

const r4 = (x: number | null): number | null => (x === null ? null : Math.round(x * 1e4) / 1e4);
const r2 = (x: number | null): number | null => (x === null ? null : Math.round(x * 100) / 100);

export interface ResultadoG0 {
  portao: "G0"; passou: boolean; diferencas: string[];
  scores: { par: string; revisao: string; arquivado: string; recalculado: string; igual: boolean }[];
  campanhas: Record<string, { d: number[]; estatistica: AnalisePareada; secundarios: unknown; lbAxe: string[] }>;
}

export function scoreJsonDe(p: ParLido): { bytes: string; score: Score } {
  const score = scoreSemanticPackage(p.pkg, p.reviews);
  return { score, bytes: jsonTexto({ ...score, fila: reviewQueue(p.pkg, p.reviews), provenance: p.pkg.provenance }) };
}

export function portaoG0(): ResultadoG0 {
  const dif: string[] = [];
  const scores: ResultadoG0["scores"] = [];
  const campanhas: ResultadoG0["campanhas"] = {};
  const conf = lerJson<{ campaigns: { id: string; seed: string; statistics: { d: number[]; mean: number; median: number; sd: number; permutationP: number; prattP: number; signP: number;
    bootstrap: { seed: number; interval: [number, number] } } }[] }>(join(REVISAO_INTEGRADA, "conferencia-resultados.json"));
  for (const c of CAMPANHAS) {
    const d: number[] = [];
    const agg = { sem: { unidades: 0, total: 0, pagina: 0, paginaTotal: 0, incorretas: 0 }, com: { unidades: 0, total: 0, pagina: 0, paginaTotal: 0, incorretas: 0 } };
    const lbAxe: string[] = [];
    for (const par of paresDaCampanha(c)) {
      const p = lerPar(par);
      const { bytes, score } = scoreJsonDe(p);
      const arquivado = sha(p.scoreBytes), recalculado = sha(bytes);
      scores.push({ par: chavePar(p), revisao: p.revisao, arquivado, recalculado, igual: arquivado === recalculado });
      if (arquivado !== recalculado) dif.push(`${chavePar(p)}/${p.revisao}: score.json recalculado difere do arquivado (${arquivado.slice(0, 16)} × ${recalculado.slice(0, 16)})`);
      const runs = runsDosBracos(p.pkg);
      const sem = contagemDoRun(p.pkg, score, runs.sem), com = contagemDoRun(p.pkg, score, runs.com);
      d.push(dDoPar(c, sem, com));
      for (const [k, b] of [["sem", sem], ["com", com]] as const) {
        agg[k].unidades += b.unidades; agg[k].total += b.total; agg[k].incorretas += b.incorretas;
        if (b.pagina) { agg[k].pagina += b.pagina.confirmadas; agg[k].paginaTotal += b.pagina.total; }
      }
      if (runs.axe) lbAxe.push(score.scores.find(s => s.runId === runs.axe)!.status);
      // O summary.json arquivado tem de dizer o mesmo que o score (confirmadas por braço).
      const summary = lerJson<{ execucoes: { braco: string; pontuacao: { metricas: { confirmedReferenceUnits: number | null } } }[] }>(join(p.dir, "summary.json"));
      for (const e of summary.execucoes) {
        const b = e.braco === "sem" ? sem : com;
        if (e.pontuacao.metricas.confirmedReferenceUnits !== b.unidades) dif.push(`${chavePar(p)}: summary.json ${e.braco} diz ${e.pontuacao.metricas.confirmedReferenceUnits} confirmadas, o score ${b.unidades}`);
      }
    }
    const of = OFICIAL[c];
    const est = analisePareada(d, sementeDaCampanha(c));
    if (JSON.stringify(d) !== JSON.stringify(of.d)) dif.push(`${c}: D ${JSON.stringify(d)} ≠ oficial ${JSON.stringify(of.d)}`);
    if (est.ic.semente !== SEMENTES[c]) dif.push(`${c}: semente ${est.ic.semente} ≠ ${SEMENTES[c]}`);
    const cmpN = (nome: string, a: number | null, b: number) => { if (a === null || Math.abs(a - b) > 1e-9) dif.push(`${c}: ${nome} ${a} ≠ oficial ${b}`); };
    cmpN("média", r2(est.media), of.media); cmpN("mediana", r2(est.mediana), of.mediana);
    if ((est.desvioPadrao ?? NaN).toFixed(2) !== of.dp2) dif.push(`${c}: desvio-padrão ${est.desvioPadrao} ≠ oficial ${of.dp2}`);
    cmpN("IC inferior", r2(est.ic.inferior), of.ic[0]); cmpN("IC superior", r2(est.ic.superior), of.ic[1]);
    cmpN("p permutação", r4(est.principal.p), of.p); cmpN("p Wilcoxon", r4(est.robustez.wilcoxon.p), of.wilcoxonP); cmpN("p sinal", r4(est.robustez.sinal.p), of.sinalP);
    // conferência independente (revisão integrada): valores crus
    const ci = conf.campaigns.find(x => x.id === c);
    if (!ci) dif.push(`${c}: ausente do conferencia-resultados.json`);
    else {
      const s = ci.statistics;
      if (JSON.stringify(s.d) !== JSON.stringify(d)) dif.push(`${c}: D ≠ conferência independente`);
      const igual = (nome: string, a: number | null, b: number) => { if (a === null || Math.abs(a - b) > 1e-12) dif.push(`${c}: ${nome} ${a} ≠ conferência ${b}`); };
      igual("média", est.media, s.mean); igual("mediana", est.mediana, s.median); igual("dp", est.desvioPadrao, s.sd);
      igual("p permutação", est.principal.p, s.permutationP); igual("p Wilcoxon", est.robustez.wilcoxon.p, s.prattP); igual("p sinal", est.robustez.sinal.p, s.signP);
      if (s.bootstrap.seed !== est.ic.semente) dif.push(`${c}: semente ≠ conferência`);
      igual("IC inferior", r2(est.ic.inferior), s.bootstrap.interval[0]); igual("IC superior", r2(est.ic.superior), s.bootstrap.interval[1]);
    }
    const so = SECUNDARIOS_OFICIAIS[c] as Record<string, Record<string, number>>;
    if (so.unidades) {
      if (agg.sem.unidades !== so.unidades.sem || agg.com.unidades !== so.unidades.com || agg.sem.total !== so.unidades.total)
        dif.push(`${c}: unidades ${agg.sem.unidades}/${agg.sem.total} × ${agg.com.unidades} ≠ oficial ${so.unidades.sem}/${so.unidades.total} × ${so.unidades.com}`);
    }
    if (so.incorretas && (agg.sem.incorretas !== so.incorretas.sem || agg.com.incorretas !== so.incorretas.com))
      dif.push(`${c}: incorretas ${agg.sem.incorretas} × ${agg.com.incorretas} ≠ oficial ${so.incorretas.sem} × ${so.incorretas.com}`);
    if (so.pagina && (agg.sem.pagina !== so.pagina.sem || agg.com.pagina !== so.pagina.com || agg.sem.paginaTotal !== so.pagina.total))
      dif.push(`${c}: P-* ${agg.sem.pagina}/${agg.sem.paginaTotal} × ${agg.com.pagina} ≠ oficial ${so.pagina.sem}/${so.pagina.total} × ${so.pagina.com}`);
    if (c === "t7-tela-b-01" && !(lbAxe.length === 10 && lbAxe.every(s => s === "provisional"))) dif.push(`${c}: LB axe não é provisional em 10/10 (${lbAxe.join(",")})`);
    campanhas[c] = { d, estatistica: est, secundarios: agg, lbAxe };
  }
  return { portao: "G0", passou: dif.length === 0, diferencas: dif, scores, campanhas };
}

/** Commit-semente da agenda arquivada da campanha (origem da semente do bootstrap). */
export function sementeDaCampanha(c: Campanha): string {
  const conf = lerJson<{ campaigns: { id: string; seed: string }[] }>(join(REVISAO_INTEGRADA, "conferencia-resultados.json"));
  const s = conf.campaigns.find(x => x.id === c)?.seed;
  const ag = agendaDe(c);
  if (s && s !== ag.seed.commit) throw new Error(`${c}: semente da agenda ${ag.seed.commit} ≠ conferência ${s}`);
  return ag.seed.commit;
}

export function agendaDe(c: Campanha): { seed: { commit: string }; pairs: number; campaign: { sha256: string } } {
  // Uma agenda por campanha (conferido): o painel faz o mesmo (agenda-painel.ts lerAgendaDoArquivo).
  const dir = join(RESULTADOS, "campanhas", c, "agendas");
  const subs = readdirSync(dir);
  if (subs.length !== 1) throw new Error(`${c}: ${subs.length} agendas arquivadas`);
  return lerJson(join(dir, subs[0], "agenda.json"));
}
