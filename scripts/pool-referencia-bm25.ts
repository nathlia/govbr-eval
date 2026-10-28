/**
 * NAT-95 / complemento do D-143 — sistema de referência FIXO para o pool de julgamento do
 * benchmark de recuperação (`retrieval/benchmark-1.0.0`).
 *
 * Por quê: a baseline 2.15.0 (`get_ds_rules`) casa a frase inteira como substring e devolve zero
 * resultados para todas as consultas respondíveis; o pool dela tem 16 ids. Pooling clássico usa
 * vários sistemas: este é um segundo sistema, independente do motor que o NAT-97 vai ajustar, e
 * congelado (commit + sha256 deste arquivo) ANTES de qualquer ajuste. Mudar qualquer parâmetro
 * abaixo é um sistema novo, não uma correção deste.
 *
 * Especificação (determinística, sem modelo, sem rede):
 * - Corpus: `normalized/rules.jsonl` da KB literal. Exclui `force: "example"` e registros legados
 *   (`status` "legacy"/"deprecated" ou `legacy: true`). Na 3.7.0-literal-2026-10-15 nenhum é excluído
 *   (os legados vivem em `legacy-ids.json` / `carried-over.jsonl`, fora do corpus).
 * - Texto do documento: `title` + `normalizedRule` + `originalText`.
 * - Normalização: minúsculas, NFD sem marcas combinantes; tokens = sequências [a-z0-9]; descarta
 *   stopwords PT (lista curta abaixo) e tokens de 1 caractere; tira um "s" final de tokens com mais
 *   de 3 caracteres. Sem outro stemming.
 * - BM25 (Robertson/Sparck Jones, idf = ln(1 + (N - df + 0.5) / (df + 0.5))), k1 = 1.2, b = 0.75.
 *   Estatísticas (N, df, avgdl) do corpus inteiro, também na corrida restrita.
 * - Duas corridas por consulta: (a) texto da consulta sobre todas as regras; (b) se a consulta tem
 *   `component`, só regras desse componente OU sem componente (globais). Top 10 de cada (score > 0;
 *   empate desfeito por id crescente), união, sem repetição, ids ordenados (sem score nem posição).
 * - Família (README do benchmark): cópias literais = mesmo texto sem acento, sem `* _ \``, espaços
 *   normalizados (aqui sobre `originalText`). Um id do pool cuja família já tem rótulo na consulta
 *   conta como rotulado e não vai para julgamento.
 * - Sanidade (não é meta): hit@5 / recall@5 desta referência nas respondíveis, com os qrels atuais,
 *   ranking = corrida (b) se há componente, senão (a); acerto = rótulo > 0, por família.
 *
 * Uso: tsx scripts/pool-referencia-bm25.ts --out <pool.json> --a-julgar <a-julgar.jsonl>
 *      [--kb <rules.jsonl>] [--queries <queries.jsonl>] [--qrels <qrels.jsonl>]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PARAMS = { k1: 1.2, b: 0.75, depth: 10, fields: ["title", "normalizedRule", "originalText"],
  fold: "lowercase+NFD-strip-combining", tokenizer: "[a-z0-9]+", stripTrailingS: "length>3", minTokenLength: 2,
  idf: "ln(1+(N-df+0.5)/(df+0.5))", tieBreak: "id asc", runs: ["all", "component-or-global"] } as const;

export const STOPWORDS = new Set(("a o e de da do das dos em no na nos nas um uma uns umas para por com sem que se " +
  "ao aos as os ou mais menos muito como pela pelo pelas pelos ser sao esta este isso isto essa esse ja nao " +
  "seu sua seus suas lhe ele ela eles elas entre sobre ate quando onde qual quais tambem pode deve").split(" "));

export interface Rule { id: string; title?: string | null; normalizedRule?: string | null; originalText?: string | null;
  component?: string | null; force?: string | null; status?: string | null; legacy?: boolean }
export interface Query { id: string; query: string; component?: string | null; estrato: string }
export interface Qrel { query_id: string; unit_id: string; relevance: number; familia?: string }

export const sha256 = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
export const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
export function tokenize(s: string): string[] {
  return (fold(s).match(/[a-z0-9]+/g) ?? []).filter(t => t.length >= 2 && !STOPWORDS.has(t))
    .map(t => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}
/** README `familia` key: no accents, no `* _ \``, whitespace normalized. */
export const familyKey = (s: string) => fold(s).replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
export const isExcluded = (r: Rule) => r.force === "example" || r.legacy === true || ["legacy", "deprecated"].includes(String(r.status));

export interface Index { docs: { id: string; component: string | null; tf: Map<string, number>; len: number }[];
  df: Map<string, number>; avgdl: number }
export function buildIndex(rules: Rule[]): Index {
  const df = new Map<string, number>();
  const docs = rules.map(r => {
    const toks = tokenize([r.title, r.normalizedRule, r.originalText].filter(Boolean).join(" "));
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { id: r.id, component: r.component ?? null, tf, len: toks.length };
  });
  return { docs, df, avgdl: docs.reduce((n, d) => n + d.len, 0) / (docs.length || 1) };
}
export function search(ix: Index, query: string, component: string | null, depth = PARAMS.depth): string[] {
  const q = tokenize(query), N = ix.docs.length, { k1, b } = PARAMS;
  const scored: { id: string; s: number }[] = [];
  for (const d of ix.docs) {
    if (component !== null && d.component !== null && d.component !== component) continue;
    let s = 0;
    for (const t of q) {
      const f = d.tf.get(t); if (!f) continue;
      const df = ix.df.get(t)!;
      s += Math.log(1 + (N - df + 0.5) / (df + 0.5)) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / ix.avgdl));
    }
    if (s > 0) scored.push({ id: d.id, s });
  }
  scored.sort((x, y) => y.s - x.s || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return scored.slice(0, depth).map(x => x.id);
}
export function poolFor(ix: Index, q: Query): string[] {
  const a = search(ix, q.query, null);
  const b = q.component ? search(ix, q.query, q.component) : [];
  return [...new Set([...a, ...b])].sort();
}

/** Pooled ids not yet labelled for the query (by id or by literal family). */
export function toJudge(pool: string[], labels: Qrel[], rules: Map<string, Rule>): string[] {
  const fam = (id: string) => { const r = rules.get(id); return r ? familyKey(r.originalText ?? r.normalizedRule ?? "") : null; };
  const ids = new Set(labels.map(l => l.unit_id));
  const fams = new Set([...labels.map(l => fam(l.unit_id)), ...labels.map(l => l.familia && fam(l.familia))].filter(Boolean));
  return pool.filter(id => !ids.has(id) && !fams.has(fam(id)));
}

/** Sanity only: hit@5 and recall@5 (by family, relevance > 0) on `respondivel`. */
export function sanity(ix: Index, queries: Query[], qrels: Qrel[], rules: Map<string, Rule>) {
  const fam = (id: string) => { const r = rules.get(id); return r ? familyKey(r.originalText ?? r.normalizedRule ?? "") : `id:${id}`; };
  let n = 0, hits = 0, recallSum = 0;
  for (const q of queries.filter(q => q.estrato === "respondivel")) {
    const rel = new Set(qrels.filter(l => l.query_id === q.id && l.relevance > 0).map(l => fam(l.unit_id)));
    if (!rel.size) continue;
    const top = new Set(search(ix, q.query, q.component ?? null, 5).map(fam));
    const found = [...rel].filter(f => top.has(f)).length;
    n++; if (found) hits++; recallSum += found / rel.size;
  }
  return { queries: n, hitsAt5: hits, hitRateAt5: n ? hits / n : null, meanRecallAt5: n ? recallSum / n : null };
}

const readJsonl = <T>(p: string): T[] => readFileSync(p, "utf8").split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l) as T);

function main(argv: string[]) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const arg = (k: string, d?: string) => { const i = argv.indexOf(k); const v = i >= 0 ? argv[i + 1] : d; if (!v) throw new Error(`missing ${k}`); return v; };
  const kb = arg("--kb", resolve(ROOT, "../govbr-ds-validator/data/knowledge/versions/3.7.0-literal-2026-10-15/normalized/rules.jsonl"));
  const queriesPath = arg("--queries", resolve(ROOT, "retrieval/benchmark-1.0.0/queries.jsonl"));
  const qrelsPath = arg("--qrels", resolve(ROOT, "retrieval/benchmark-1.0.0/qrels.jsonl"));
  const out = arg("--out"), judgeOut = arg("--a-julgar");
  const kbBytes = readFileSync(kb);
  const all = readJsonl<Rule>(kb), corpus = all.filter(r => !isExcluded(r));
  const rules = new Map(all.map(r => [r.id, r]));
  const queries = readJsonl<Query>(queriesPath), qrels = readJsonl<Qrel>(qrelsPath);
  const ix = buildIndex(corpus);
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const pool = queries.map(q => ({ query_id: q.id, ids: poolFor(ix, q) })).sort((x, y) => x.query_id.localeCompare(y.query_id));
  const judge = pool.flatMap(p => toJudge(p.ids, qrels.filter(l => l.query_id === p.query_id), rules).map(id => {
    const r = rules.get(id)!;
    return { query_id: p.query_id, unit_id: id, title: r.title ?? null, normalizedRule: (r.normalizedRule ?? "").slice(0, 400),
      component: r.component ?? null, force: r.force ?? null };
  }));
  const check = sanity(ix, queries, qrels, rules);
  const header = { system: "pool-referencia-bm25 1.0", params: PARAMS, stopwords: [...STOPWORDS],
    corpus: { path: "govbr-ds-validator/data/knowledge/versions/3.7.0-literal-2026-10-15/normalized/rules.jsonl",
      sha256: sha256(kbBytes), records: all.length, indexed: corpus.length, excluded: all.length - corpus.length },
    script: { path: "govbr-eval/scripts/pool-referencia-bm25.ts", sha256LF: sha256(self) },
    queries: { sha256: sha256(readFileSync(queriesPath)), count: queries.length },
    qrels: { sha256: sha256(readFileSync(qrelsPath)), lines: qrels.length },
    pooledIds: pool.reduce((n, p) => n + p.ids.length, 0), toJudge: judge.length, sanity: check };
  writeFileSync(out, JSON.stringify({ header, pool }, null, 2) + "\n");
  writeFileSync(judgeOut, judge.map(r => JSON.stringify(r)).join("\n") + (judge.length ? "\n" : ""));
  const per = pool.map(p => judge.filter(j => j.query_id === p.query_id).length).sort((a, b) => a - b);
  console.log(JSON.stringify({ pooledIds: header.pooledIds, toJudge: judge.length,
    perQueryToJudge: { min: per[0], median: (per[Math.floor((per.length - 1) / 2)] + per[Math.ceil((per.length - 1) / 2)]) / 2, max: per[per.length - 1] }, sanity: check }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
