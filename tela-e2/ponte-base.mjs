/**
 * Tela E2 — ponte entre as unidades do universo (a2-…) e os ids da base literal (govbr-3.7.0-…), metodo.md § 2.
 *
 * Da base literal (ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl) lê SÓ id, source.corpusFile e
 * source.charRange; o trecho é lido no próprio corpus por esse localizador. Nenhum outro campo da base é lido.
 * Liga unidade ↔ id quando estão no mesmo arquivo do corpus e o trecho localizado e o texto da unidade se sobrepõem:
 *  - e-MAG: a unidade é a recomendação inteira; liga todo id cujo charRange cai dentro da seção "#### Recomendação X.Y";
 *  - tabela (tabela-especificacao, auditoria-tabela): liga se o trecho está contido no contexto da tabela;
 *  - frase: liga se um texto contém o outro (o menor com ≥ 15 caracteres) ou se o índice de Jaccard das palavras é ≥ 0,6.
 * Grava tela-e2/ponte-base.json: { porUnidade: {a2-id: [govbr ids]}, cobertura }.
 * Uso: node tela-e2/ponte-base.mjs
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = join(ROOT, "../ds-rules/govbr-ds-3.7.0-corpus");
const BASE = join(CORPUS, "normalizacao/rules.jsonl");
const sha256 = b => createHash("sha256").update(b).digest("hex");
const norm = t => t.replace(/\s+/g, " ").trim();
const plain = t => norm(t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`|]/g, " ").replace(/^\s*([-+]|\d+[.)])\s+/gm, "").replace(/^#{1,6}\s+/gm, ""));
const chave = t => plain(t).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
const palavras = t => new Set(chave(t).split(" ").filter(w => w.length > 2));

export function construirPonte() {
  const bruto = readFileSync(BASE);
  const base = bruto.toString("utf8").trim().split("\n").map(l => { const r = JSON.parse(l); return { id: r.id, arquivo: r.source?.corpusFile, faixa: r.source?.charRange }; });
  const U = JSON.parse(readFileSync(join(ROOT, "tela-e2/universo.json"), "utf8")).unidades;
  const textos = new Map();
  const texto = f => { if (!textos.has(f)) textos.set(f, readFileSync(join(CORPUS, f), "utf8")); return textos.get(f); };
  const porArquivo = new Map();
  for (const r of base) {
    if (!r.arquivo || !Array.isArray(r.faixa)) continue;
    const t = texto(r.arquivo).slice(r.faixa[0], r.faixa[1]);
    const x = { ...r, k: chave(t), w: palavras(t) };
    if (!porArquivo.has(r.arquivo)) porArquivo.set(r.arquivo, []);
    porArquivo.get(r.arquivo).push(x);
  }
  const porUnidade = {};
  for (const u of U) {
    const cand = porArquivo.get(u.fonte.arquivo) ?? [];
    let ids = [];
    if (u.marcador === "emag-recomendacao") {
      const num = /Recomenda\S*\s+(\d+\.\d+)/.exec(u.texto)?.[1];
      const t = texto(u.fonte.arquivo);
      const ini = num ? t.search(new RegExp(`^#### Recomenda\S*\s+${num.replace(".", "\.")}\b`, "m")) : -1;
      if (ini >= 0) {
        const resto = t.slice(ini + 5).search(/^#{2,4} /m);
        const fim = resto < 0 ? t.length : ini + 5 + resto;
        ids = cand.filter(r => r.faixa[0] >= ini && r.faixa[1] <= fim).map(r => r.id);
      }
      porUnidade[u.id] = { emag: num ?? null, ids };
      continue;
    }
    const tabela = u.marcador === "tabela-especificacao" || u.marcador === "auditoria-tabela";
    const ku = chave(tabela ? `${u.texto} ${u.contexto ?? ""}` : u.texto), wu = palavras(tabela ? `${u.texto} ${u.contexto ?? ""}` : u.texto);
    for (const r of cand) {
      if (!r.k) continue;
      const [a, b] = ku.length <= r.k.length ? [ku, r.k] : [r.k, ku];
      let liga = a.length >= 15 && b.includes(a);
      if (!liga && !tabela) { const inter = [...wu].filter(w => r.w.has(w)).length; const uni = new Set([...wu, ...r.w]).size; liga = uni > 0 && inter / uni >= 0.6; }
      if (liga) ids.push(r.id);
    }
    porUnidade[u.id] = { emag: null, ids };
  }
  return { porUnidade, baseSha256: sha256(bruto), regrasNaBase: base.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { porUnidade, baseSha256, regrasNaBase } = construirPonte();
  const ligadas = Object.values(porUnidade).filter(x => x.ids.length).length;
  const idsLigados = new Set(Object.values(porUnidade).flatMap(x => x.ids));
  const saida = {
    _meta: {
      regra: "tela-e2/metodo.md § 2 (ponte de ids): só id, source.corpusFile e source.charRange da base literal; trecho lido no corpus",
      base: { arquivo: "ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl", sha256: baseSha256, regras: regrasNaBase, camposLidos: ["id", "source.corpusFile", "source.charRange"] },
      cobertura: { unidades: Object.keys(porUnidade).length, unidadesLigadas: ligadas, idsDaBaseLigados: idsLigados.size },
    },
    porUnidade,
  };
  writeFileSync(join(ROOT, "tela-e2/ponte-base.json"), JSON.stringify(saida, null, 1) + "\n");
  console.log(JSON.stringify(saida._meta.cobertura));
}
