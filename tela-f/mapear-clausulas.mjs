/**
 * Tela F — filtro (d): a cláusula citada pelo seletor existe na base literal com id citável.
 *
 * Da base literal (ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl) lê SÓ id, source.corpusFile,
 * source.charRange e originalText (o texto literal). Nenhum outro campo é lido (nem força, estratégia de validação,
 * automatizável, confiança, evidência esperada, texto normalizado).
 *
 * Para cada candidato aprovado pelo conferente: o trecho citado (partes separadas por "[…]") é localizado no arquivo
 * do corpus citado (comparação depois de juntar espaços e tirar marcas inline `*`, `_`, crase); liga-se todo id cujo
 * charRange (mesmo arquivo) se sobrepõe à posição de alguma parte. Para cada id ligado registra-se se o originalText
 * contém a parte (casamento literal) ou só se sobrepõe pela faixa.
 * Uso: node tela-f/mapear-clausulas.mjs → tela-f/clausulas-base.json
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(AQUI, "../../../ds-rules/govbr-ds-3.7.0-corpus");
const sha = b => createHash("sha256").update(b).digest("hex");
const limpa = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\\\[|\\\]/g, m => m[1]).replace(/\s+/g, " ").trim();

const bruto = readFileSync(join(CORPUS, "normalizacao/rules.jsonl"));
const base = bruto.toString("utf8").trim().split("\n").map(l => { const r = JSON.parse(l); return { id: r.id, arquivo: r.source?.corpusFile, faixa: r.source?.charRange, texto: r.originalText }; });
const cand = JSON.parse(readFileSync(join(AQUI, "selecao/candidatos.json"), "utf8"));
const ver = new Map(JSON.parse(readFileSync(join(AQUI, "conferencia/veredictos.json"), "utf8")).map(v => [v.id, v]));

// mapa de posições: texto limpo → índice no bruto (para converter posição do achado em charRange do arquivo)
function indexar(t) {
  const out = []; const map = [];
  let i = 0; let ultimoEspaco = true;
  while (i < t.length) {
    if (t.startsWith("**", i) || t.startsWith("__", i)) { i += 2; continue; }
    const c = t[i];
    if (c === "*" || c === "`") { i++; continue; }
    if (c === "\\" && (t[i + 1] === "[" || t[i + 1] === "]")) { i++; continue; }
    if (/\s/.test(c)) { if (!ultimoEspaco) { out.push(" "); map.push(i); ultimoEspaco = true; } i++; continue; }
    out.push(c); map.push(i); ultimoEspaco = false; i++;
  }
  return { s: out.join(""), map };
}

const arquivos = new Map();
const resultado = {};
for (const c of cand) {
  const v = ver.get(c.id);
  if (!v?.aprovado) continue;
  const arq = c.clausula.arquivo;
  if (!arquivos.has(arq)) { const t = readFileSync(join(CORPUS, arq), "utf8"); arquivos.set(arq, { t, idx: indexar(t), sha: sha(Buffer.from(t, "utf8")) }); }
  const { idx } = arquivos.get(arq);
  const partes = c.clausula.trecho.split(/\[…\]/).map(limpa).map(p => p.replace(/^\|\s*|\s*\|$/g, "").trim()).filter(Boolean);
  const achadas = [];
  for (const p of partes) {
    const pos = idx.s.indexOf(p);
    if (pos < 0) { achadas.push({ parte: p, achada: false }); continue; }
    const ini = idx.map[pos], fim = idx.map[pos + p.length - 1] + 1;
    const ids = base.filter(r => r.arquivo === arq && Array.isArray(r.faixa) && r.faixa[0] < fim && r.faixa[1] > ini)
      .map(r => ({ id: r.id, faixa: r.faixa, textoContemParte: limpa(r.texto).includes(p) }));
    achadas.push({ parte: p, achada: true, faixaNoArquivo: [ini, fim], ids });
  }
  resultado[c.id] = { arquivo: arq, partes: achadas };
}
const saida = {
  _meta: {
    regra: "tela-f/mapear-clausulas.mjs (cabeçalho): só id, source.corpusFile, source.charRange e originalText da base literal",
    base: { arquivo: "ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl", sha256: sha(bruto), regras: base.length, camposLidos: ["id", "source.corpusFile", "source.charRange", "originalText"] },
    arquivosDoCorpus: Object.fromEntries([...arquivos].map(([k, x]) => [k, x.sha])),
  },
  porCandidato: resultado,
};
writeFileSync(join(AQUI, "clausulas-base.json"), JSON.stringify(saida, null, 1) + "\n");
for (const [k, x] of Object.entries(resultado)) console.log(k, x.arquivo, x.partes.map(p => p.achada ? `[${p.ids.map(i => `${i.id}${i.textoContemParte ? "*" : ""}`).join(",")}]` : "NAO-ACHADA:" + p.parte.slice(0, 60)).join(" "));
