/**
 * Tela E2 — exclusões por unidade antes do sorteio (metodo.md § 5): sem-clausula-na-base, exposta, tentativa-e.
 *
 * Ponte unidade ↔ id da base literal: tela-e2/ponte-base.json (só id, corpusFile e charRange da base). Ids citados
 * nas referências ou na tentativa real que NÃO estão na base literal do corpus (normalizacao/rules.jsonl) são
 * resolvidos, nesta ordem, sem ler nada do validator:
 *  1. id antigo (base de 186 regras) em normalizacao/mapa-ids.json com `novos` → os ids novos, pela ponte;
 *  2. id antigo sem `novos` → o texto antigo (`originalTextAntigo` do mapa-ids) casado com as unidades do universo
 *     pelo mesmo critério da ponte (contém/contido ≥ 15 caracteres, ou Jaccard das palavras ≥ 0,6);
 *  3. id sem localizador cuja spec cita `emag:X.Y` → coberto pela exposição da recomendação X.Y (registrado);
 *  4. `template-global` (emenda do Template Base, fora do corpus literal) → nenhuma unidade do universo (registrado).
 * Id que não cai em nenhum caso fica em `naoResolvidos` (contado no --validar).
 * Grava tela-e2/exclusoes.json. Uso: node tela-e2/montar-exclusoes.mjs
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NORM = join(ROOT, "../ds-rules/govbr-ds-3.7.0-corpus/normalizacao");
const sha256 = b => createHash("sha256").update(b).digest("hex");
const norm = t => t.replace(/\s+/g, " ").trim();
const plain = t => norm(t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`|]/g, " "));
const chave = t => plain(t).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
const palavras = t => new Set(chave(t).split(" ").filter(w => w.length > 2));
const ler = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const ponte = ler("tela-e2/ponte-base.json");
const expostas = ler("tela-e2/expostas.json");
const U = ler("tela-e2/universo.json").unidades;
const baseBruta = readFileSync(join(NORM, "rules.jsonl"));
const naBase = new Set(baseBruta.toString("utf8").trim().split("\n").map(l => JSON.parse(l).id));
const mapaBruto = readFileSync(join(NORM, "mapa-ids.json"));
const mapa = new Map(JSON.parse(mapaBruto).mapa.map(m => [m.antigo, { novos: m.novos ?? [], texto: m.originalTextAntigo ?? "" }]));

const porId = new Map(); // id da base → unidades
for (const [u, x] of Object.entries(ponte.porUnidade)) for (const id of x.ids) porId.set(id, [...(porId.get(id) ?? []), u]);
const porTexto = texto => {
  const k = chave(texto), w = palavras(texto);
  return U.filter(u => {
    const ku = chave(u.texto), wu = palavras(u.texto);
    const [a, b] = ku.length <= k.length ? [ku, k] : [k, ku];
    if (a.length >= 15 && b.includes(a)) return true;
    const inter = [...wu].filter(x => w.has(x)).length, uni = new Set([...wu, ...w]).size;
    return uni > 0 && inter / uni >= 0.6;
  }).map(u => u.id);
};

const resolucao = { naBase: 0, mapaNovos: 0, mapaTexto: 0, cobertoPorEmag: 0, templateForaDoCorpus: 0, naoResolvidos: [] };
function resolver(id, emagNaMesmaSpec) {
  if (naBase.has(id)) { resolucao.naBase++; return porId.get(id) ?? []; }
  const m = mapa.get(id);
  if (m?.novos.length) { resolucao.mapaNovos++; return m.novos.flatMap(n => porId.get(n) ?? []); }
  if (m) { resolucao.mapaTexto++; return porTexto(m.texto); }
  if (emagNaMesmaSpec?.length) { resolucao.cobertoPorEmag++; return []; }
  if (/^govbr-3\.7\.0-template-global-/.test(id)) { resolucao.templateForaDoCorpus++; return []; }
  resolucao.naoResolvidos.push(id); return [];
}

const exp = new Map(), tent = new Map();
const marca = (m, u, r) => m.set(u, [...new Set([...(m.get(u) ?? []), r])]);
const emagExp = new Set();
for (const p of expostas.expostas) {
  if (p.regra.startsWith("emag:")) { emagExp.add(p.regra.slice(5)); continue; }
  for (const u of resolver(p.regra, p.emagNaMesmaSpec)) marca(exp, u, p.regra);
}
const tentEmag = new Set();
for (const r of expostas.tentativaE) for (const u of resolver(r, null)) marca(tent, u, r);
const resolucaoTotal = { ...resolucao, naoResolvidos: resolucao.naoResolvidos.length };

const elig = ler("tela-e2/elegibilidade.json").regras;
const eqEmag = new Map(elig.filter(r => r.equivalenteEmag).map(r => [r.id, r.equivalenteEmag]));
const porUnidade = {};
for (const u of U) {
  const x = ponte.porUnidade[u.id];
  const emag = x.emag ?? eqEmag.get(u.id) ?? null;
  const e = [...(exp.get(u.id) ?? []), ...(emag && emagExp.has(emag) ? [`emag:${emag}`] : [])];
  // tentativa real: regra da unidade (pela ponte) entre as sorteadas/vigentes; e-MAG por recomendação
  const t = [...(tent.get(u.id) ?? [])];
  if (x.emag && x.ids.some(id => expostas.tentativaE.includes(id))) t.push(`emag:${x.emag}`);
  const semClausula = !x.emag && x.ids.length === 0;
  if (semClausula || e.length || t.length) porUnidade[u.id] = { semClausula, exposta: e, tentativaE: t };
}
writeFileSync(join(ROOT, "tela-e2/exclusoes.json"), JSON.stringify({
  _meta: {
    regra: "tela-e2/metodo.md § 5; resolução de ids fora da base literal descrita no cabeçalho de tela-e2/montar-exclusoes.mjs",
    insumos: { ponte: "tela-e2/ponte-base.json", expostas: "tela-e2/expostas.json", baseSha256: sha256(baseBruta), mapaIdsSha256: sha256(mapaBruto), camposDoMapaLidos: ["antigo", "novos", "originalTextAntigo"] },
    resolucaoDosIds: resolucaoTotal,
  },
  naoResolvidos: resolucao.naoResolvidos,
  porUnidade,
}, null, 1) + "\n");
console.log(JSON.stringify({ resolucaoDosIds: resolucaoTotal, unidadesMarcadas: Object.keys(porUnidade).length }));
