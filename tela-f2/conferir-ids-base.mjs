/**
 * Tela F2 — conferência de ids contra a base que o oráculo congelado serve (molde de tela-e2/conferir-ids-base.mjs).
 *
 * Lê da árvore congelada .tmp-eval/validator-3712r (HEAD 816f4ba = tag congelado-3.7.12), do disco (sem build ou execução), só os arquivos de
 * regra da versão ativa (manifest.json › activeVersion › ruleFiles, sha256 conferido com o manifesto da versão) e, de
 * cada registro, só id, originalText, source.corpusFile e source.charRange.
 *
 * Critério, por spec semeada de ground-truth-processos-f2.json:
 *  - cada id de `rules` existe na base servida, no arquivo do corpus da cláusula citada, e o texto literal dele
 *    (marcas inline e barras de tabela fora, espaços juntados) está contido no trecho citado ou o contém — o mesmo
 *    critério de ligação de mapear-clausulas-oraculo.mjs;
 *  - spec em `_meta.semIdMapeado`: `rules` vazio e nenhum registro da base servida com faixa sobreposta ao trecho
 *    (relocalizado no arquivo) — continua sem id.
 * Specs naturais: cada id `govbr-…` de `rules` existe na base servida (a migração é a da D 1.1.0; nada muda aqui).
 * Uso: node tela-f2/conferir-ids-base.mjs → tela-f2/conferencia-ids-base.json (sai ≠ 0 se algo divergir)
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const CORPUS = join(RAIZ, "../../ds-rules/govbr-ds-3.7.0-corpus");
const VAL = "F:/Dev Nath/TCC/.tmp-eval/validator-3712r", TAG = "congelado-3.7.12 (HEAD 816f4ba da árvore congelada)";
const sha = b => createHash("sha256").update(b).digest("hex");
const show = p => readFileSync(join(VAL, p));
const chave = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\\\[|\\\]/g, m => m[1]).replace(/\|/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const commit = execFileSync("git", ["-C", VAL, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (commit !== "816f4bae41f4486b7055f0ac265167e87ce0d5e5") throw new Error(`validator-3712r fora de 816f4ba: ${commit}`);
const ativa = JSON.parse(show("data/knowledge/manifest.json")).activeVersion;
const VD = `data/knowledge/versions/${ativa}`;
const vman = JSON.parse(show(`${VD}/manifest.json`));
const fontes = {}, porId = new Map(), todos = [];
for (const f of vman.ruleFiles) {
  const buf = show(`${VD}/${f}`);
  if (vman.files?.[f] && vman.files[f] !== sha(buf)) throw new Error(`${f}: sha256 diverge do manifesto`);
  fontes[f] = sha(buf);
  for (const l of buf.toString("utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); const x = { id: r.id, texto: r.originalText, arquivo: r.source?.corpusFile ?? null, faixa: r.source?.charRange ?? null }; porId.set(r.id, x); todos.push(x); }
}
const refBuf = readFileSync(join(RAIZ, "ground-truth-processos-f2.json"));
const ref = JSON.parse(refBuf);
const comp = JSON.parse(readFileSync(join(AQUI, "composicao.json"), "utf8"));
const semId = ref._meta.semIdMapeado?.specs ?? {};
const sem = new Set(ref._meta.estratos.semeado.specs);
const linhas = [];
for (const v of ref.violations) {
  if (!sem.has(v.id)) {
    for (const id of v.rules.filter(r => r.startsWith("govbr-"))) linhas.push({ spec: v.id, estrato: "natural", id, existe: porId.has(id), resultado: porId.has(id) ? "casa" : "diverge" });
    continue;
  }
  const c = comp.semeadas.find(s => s.id === v.id);
  const cand = JSON.parse(readFileSync(join(AQUI, "selecao/candidatos.json"), "utf8")).find(x => x.id === c.candidato);
  const partes = cand.clausula.trecho.split("[…]").map(chave).filter(Boolean);
  if (semId[v.id]) {
    // relocaliza o trecho no arquivo e procura registro sobreposto
    const t = readFileSync(join(CORPUS, semId[v.id].arquivo), "utf8");
    const ligados = todos.filter(r => r.arquivo === semId[v.id].arquivo && partes.some(p => { const cr = chave(r.texto); return cr && (p.includes(cr) || cr.includes(p)); }));
    const ok = v.rules.length === 0 && ligados.length === 0 && semId[v.id].trecho === cand.clausula.trecho;
    linhas.push({ spec: v.id, estrato: "semeado", id: null, semIdMapeado: true, arquivo: semId[v.id].arquivo, registrosComOMesmoTexto: ligados.map(r => r.id), rulesVazio: v.rules.length === 0, resultado: ok ? "casa" : "diverge", nota: ok ? "continua sem registro na base servida" : "ver campos" });
    continue;
  }
  for (const id of v.rules) {
    const r = porId.get(id);
    const cr = r ? chave(r.texto) : "";
    const contido = !!r && partes.some(p => p.includes(cr) || cr.includes(p));
    const mesmoArquivo = !!r && r.arquivo === cand.clausula.arquivo;
    linhas.push({ spec: v.id, estrato: "semeado", id, existe: !!r, arquivo: r?.arquivo ?? null, charRange: r?.faixa ?? null, mesmoArquivo, textoNoTrecho: contido, resultado: r && contido && mesmoArquivo ? "casa" : "diverge" });
  }
}
const s = linhas.filter(l => l.estrato === "semeado"), n = linhas.filter(l => l.estrato === "natural");
const out = {
  _meta: {
    data: "2026-11-26", criterio: "ver cabeçalho de tela-f2/conferir-ids-base.mjs",
    validador: { dir: VAL, tag: TAG, commit, baseAtiva: ativa, ruleFiles: fontes, registros: todos.length, camposLidos: ["id", "originalText", "source.corpusFile", "source.charRange"] },
    referencia: { arquivo: "ground-truth-processos-f2.json", version: ref._meta.version, sha256: sha(refBuf), status: ref._meta.status.slice(0, 40) },
    contagens: { semeadoIds: s.filter(l => l.id).length, semeadoIdsCasam: s.filter(l => l.id && l.resultado === "casa").length, semeadoSemId: s.filter(l => !l.id).length, semeadoSemIdConfirmado: s.filter(l => !l.id && l.resultado === "casa").length, naturalIds: n.length, naturalIdsExistem: n.filter(l => l.resultado === "casa").length },
  },
  linhas,
};
writeFileSync(join(AQUI, "conferencia-ids-base.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out._meta.contagens));
process.exit(linhas.every(l => l.resultado === "casa") ? 0 : 1);
