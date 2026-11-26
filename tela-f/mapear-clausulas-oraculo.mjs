/**
 * Tela F — "id na base: registro, não filtro" (adendo § 4 item 3, revisto em 26/11).
 *
 * Para cada candidato aprovado pelo conferente, procura a cláusula citada na base que o oráculo congelado serve:
 * govbr-ds-validator, tag `congelado-3.7.12` (816f4ba), lida por `git show` (nenhum checkout, nada executado):
 *   data/knowledge/manifest.json › activeVersion → versions/<v>/manifest.json › ruleFiles (+ sha256 em `files`)
 *   → normalized/rules.jsonl + normalized/carried-over.jsonl.
 * De cada registro lê SÓ: id, originalText, source.corpusFile, source.charRange. Nenhum campo de força, estratégia,
 * automatizável, confiança, evidência esperada ou detector.
 * Os arquivos do corpus citados são lidos de ds-rules/govbr-ds-3.7.0-corpus e conferidos pelo sha256 contra o
 * manifesto da versão servida (`files["corpus/<arquivo>"]`).
 *
 * Localização: o trecho citado é partido em "[…]"; cada parte é procurada no arquivo (espaços juntados, marcas inline
 * do markdown fora) DEPOIS do fim da parte anterior (a ordem do "[…]"); todas as ocorrências ficam gravadas.
 * Ligação: registro do mesmo arquivo cuja faixa se sobrepõe à parte localizada E cujo texto (limpo) está contido na
 * parte ou a contém. Sem registro ligado em nenhuma parte → `semIdMapeado: true`, com trecho literal e arquivo.
 * Uso: node tela-f/mapear-clausulas-oraculo.mjs → tela-f/clausulas-oraculo.json
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(AQUI, "../../../ds-rules/govbr-ds-3.7.0-corpus");
const VAL = "F:/Dev Nath/TCC/govbr-ds-validator";
const TAG = "congelado-3.7.12";
const sha = b => createHash("sha256").update(b).digest("hex");
const show = p => execFileSync("git", ["-C", VAL, "show", `${TAG}:${p}`], { maxBuffer: 1 << 30 });
const commit = execFileSync("git", ["-C", VAL, "rev-parse", `${TAG}^{commit}`], { encoding: "utf8" }).trim();
const chave = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\\\[|\\\]/g, m => m[1]).replace(/\|/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

const ativa = JSON.parse(show("data/knowledge/manifest.json")).activeVersion;
const VD = `data/knowledge/versions/${ativa}`;
const vman = JSON.parse(show(`${VD}/manifest.json`));
const fontes = {};
const registros = [];
for (const f of vman.ruleFiles) {
  const buf = show(`${VD}/${f}`);
  const s = sha(buf);
  if (vman.files?.[f] && vman.files[f] !== s) throw new Error(`${f}: sha256 diverge do manifesto`);
  fontes[f] = s;
  for (const l of buf.toString("utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    registros.push({ id: r.id, texto: r.originalText, arquivo: r.source?.corpusFile ?? null, faixa: r.source?.charRange ?? null });
  }
}

// texto limpo com mapa de posições para o bruto
function indexar(t) {
  const out = [], map = [];
  let i = 0, esp = true;
  while (i < t.length) {
    if (t.startsWith("**", i) || t.startsWith("__", i)) { i += 2; continue; }
    const c = t[i];
    if (c === "*" || c === "`") { i++; continue; }
    if (c === "\\" && (t[i + 1] === "[" || t[i + 1] === "]")) { i++; continue; }
    if (/\s/.test(c)) { if (!esp) { out.push(" "); map.push(i); esp = true; } i++; continue; }
    out.push(c); map.push(i); esp = false; i++;
  }
  return { s: out.join(""), map };
}
const limpaParte = p => indexar(p).s.trim();

const cand = JSON.parse(readFileSync(join(AQUI, "selecao/candidatos.json"), "utf8"));
const ver = new Map(JSON.parse(readFileSync(join(AQUI, "conferencia/veredictos.json"), "utf8")).map(v => [v.id, v]));
const arquivos = {};
const porCandidato = {};
for (const c of cand) {
  if (!ver.get(c.id)?.aprovado) continue;
  const arq = c.clausula.arquivo;
  const bruto = readFileSync(join(CORPUS, arq));
  const declarado = vman.files?.[`corpus/${arq}`] ?? null;
  if (declarado !== sha(bruto)) throw new Error(`${arq}: corpus local difere do corpus da versão servida`);
  arquivos[arq] = sha(bruto);
  const idx = indexar(bruto.toString("utf8"));
  const partes = c.clausula.trecho.split("[…]").map(limpaParte).filter(Boolean);
  let desde = 0;
  const res = [];
  for (const p of partes) {
    const ocorrencias = [];
    for (let k = idx.s.indexOf(p); k >= 0; k = idx.s.indexOf(p, k + 1)) ocorrencias.push(k);
    const k = ocorrencias.find(o => o >= desde);
    if (k === undefined) { res.push({ parte: p, achada: false, ocorrencias: ocorrencias.length }); continue; }
    const ini = idx.map[k], fim = idx.map[k + p.length - 1] + 1;
    desde = k + p.length;
    const cp = chave(p);
    const sobrepostos = registros.filter(r => r.arquivo === arq && Array.isArray(r.faixa) && r.faixa[0] < fim && r.faixa[1] > ini);
    const ligados = sobrepostos.filter(r => { const cr = chave(r.texto); return cr.length > 0 && (cp.includes(cr) || cr.includes(cp)); });
    res.push({ parte: p, achada: true, ocorrenciasNoArquivo: ocorrencias.length, faixaNoArquivo: [ini, fim],
      ids: ligados.map(r => r.id), soSobrepostos: sobrepostos.filter(r => !ligados.includes(r)).map(r => r.id) });
  }
  const ids = [...new Set(res.flatMap(r => r.ids ?? []))];
  porCandidato[c.id] = { arquivo: arq, trechoLiteral: c.clausula.trecho, partes: res, ids, semIdMapeado: ids.length === 0 };
}
const saida = {
  _meta: {
    regra: "adendo § 4 item 3 (id na base: registro, não filtro); procedimento no cabeçalho de tela-f/mapear-clausulas-oraculo.mjs",
    validador: { dir: VAL, tag: TAG, commit, baseAtiva: ativa, ruleFiles: fontes, registros: registros.length,
      camposLidos: ["id", "originalText", "source.corpusFile", "source.charRange"], somenteLeitura: "git show; nenhum checkout, build ou execução" },
    arquivosDoCorpus: arquivos,
  },
  porCandidato,
};
writeFileSync(join(AQUI, "clausulas-oraculo.json"), JSON.stringify(saida, null, 1) + "\n");
for (const [k, x] of Object.entries(porCandidato))
  console.log(k, x.semIdMapeado ? "SEM-ID" : x.ids.join(","), "|", x.partes.map(p => p.achada ? `occ${p.ocorrenciasNoArquivo} ids${p.ids.length} sobre${p.soSobrepostos.length}` : "NAO-ACHADA").join(" ; "));
