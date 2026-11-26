/**
 * Tela F2 — "id na base: registro, não filtro" (adendo 2 § 4 item 4; adendo da F § 4 item 3).
 * Mesmo procedimento de tela-f/mapear-clausulas-oraculo.mjs, com uma troca de leitura: a base servida pelo oráculo
 * congelado é lida do disco, da árvore congelada `.tmp-eval/validator-3712r` (HEAD 816f4ba = tag congelado-3.7.12),
 * em vez de `git show`. Os sha256 dos arquivos de regras são conferidos contra os gravados na F
 * (tela-f/clausulas-oraculo.json › _meta.validador.ruleFiles); divergência para.
 * De cada registro lê SÓ: id, originalText, source.corpusFile, source.charRange (nenhum campo de força, estratégia,
 * automatizável, confiança, evidência esperada ou detector). Nada é executado no validador.
 * Localização e ligação: iguais às da F (partes separadas por "[…]"; registro do mesmo arquivo com faixa sobreposta
 * e texto contido; sem registro ligado → semIdMapeado).
 * Uso: node tela-f2/mapear-clausulas-oraculo.mjs → tela-f2/clausulas-oraculo.json
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(AQUI, "../../../ds-rules/govbr-ds-3.7.0-corpus");
const VAL = "F:/Dev Nath/TCC/.tmp-eval/validator-3712r";
const sha = b => createHash("sha256").update(b).digest("hex");
const ler = p => readFileSync(join(VAL, p));
const commit = execFileSync("git", ["-C", VAL, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (commit !== "816f4bae41f4486b7055f0ac265167e87ce0d5e5") throw new Error(`validator-3712r não está em 816f4ba: ${commit}`);
const chave = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\\\[|\\\]/g, m => m[1]).replace(/\|/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const DA_F = JSON.parse(readFileSync(join(AQUI, "../tela-f/clausulas-oraculo.json"), "utf8"))._meta.validador.ruleFiles;

const ativa = JSON.parse(ler("data/knowledge/manifest.json")).activeVersion;
const VD = `data/knowledge/versions/${ativa}`;
const vman = JSON.parse(ler(`${VD}/manifest.json`));
const fontes = {};
const registros = [];
for (const f of vman.ruleFiles) {
  const buf = ler(`${VD}/${f}`);
  const s = sha(buf);
  if (vman.files?.[f] && vman.files[f] !== s) throw new Error(`${f}: sha256 diverge do manifesto`);
  if (DA_F[f] !== s) throw new Error(`${f}: sha256 diverge do gravado na F`);
  fontes[f] = s;
  for (const l of buf.toString("utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    registros.push({ id: r.id, texto: r.originalText, arquivo: r.source?.corpusFile ?? null, faixa: r.source?.charRange ?? null });
  }
}

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
const ver = new Map(JSON.parse(readFileSync(join(AQUI, "conferencia/veredictos.json"), "utf8")).candidatos.map(v => [v.id, v]));
const arquivos = {};
const porCandidato = {};
for (const c of cand) {
  if (ver.get(c.id)?.veredito !== "APROVADO") continue;
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
    // a linha declarada pelo seletor desempata quando o trecho aparece mais de uma vez
    const linhaDe = k => bruto.toString("utf8").slice(0, idx.map[k]).split("\n").length;
    const decl = c.clausula.linhasNoArquivo ?? [];
    const k = ocorrencias.find(o => o >= desde && (decl.length === 0 || decl.includes(linhaDe(o)))) ?? ocorrencias.find(o => o >= desde);
    if (k === undefined) { res.push({ parte: p, achada: false, ocorrencias: ocorrencias.length }); continue; }
    const ini = idx.map[k], fim = idx.map[k + p.length - 1] + 1;
    desde = k + p.length;
    const cp = chave(p);
    const sobrepostos = registros.filter(r => r.arquivo === arq && Array.isArray(r.faixa) && r.faixa[0] < fim && r.faixa[1] > ini);
    const ligados = sobrepostos.filter(r => { const cr = chave(r.texto); return cr.length > 0 && (cp.includes(cr) || cr.includes(cp)); });
    res.push({ parte: p, achada: true, ocorrenciasNoArquivo: ocorrencias.length, linhaNoArquivo: linhaDe(k), faixaNoArquivo: [ini, fim],
      ids: ligados.map(r => r.id), soSobrepostos: sobrepostos.filter(r => !ligados.includes(r)).map(r => r.id) });
  }
  const ids = [...new Set(res.flatMap(r => r.ids ?? []))];
  porCandidato[c.id] = { arquivo: arq, trechoLiteral: c.clausula.trecho, partes: res, ids, semIdMapeado: ids.length === 0 };
}
const saida = {
  _meta: {
    regra: "adendo 2 § 4 item 4 (id na base: registro, não filtro); procedimento no cabeçalho de tela-f2/mapear-clausulas-oraculo.mjs",
    validador: { dir: VAL, commit, baseAtiva: ativa, ruleFiles: fontes, registros: registros.length,
      camposLidos: ["id", "originalText", "source.corpusFile", "source.charRange"], somenteLeitura: "leitura de arquivos; nenhum build ou execução" },
    arquivosDoCorpus: arquivos,
  },
  porCandidato,
};
writeFileSync(join(AQUI, "clausulas-oraculo.json"), JSON.stringify(saida, null, 1) + "\n");
for (const [k, x] of Object.entries(porCandidato))
  console.log(k, x.semIdMapeado ? "SEM-ID" : x.ids.join(","), "|", x.partes.map(p => p.achada ? `l${p.linhaNoArquivo} occ${p.ocorrenciasNoArquivo} ids${p.ids.length} sobre${p.soSobrepostos.length}` : "NAO-ACHADA").join(" ; "));
