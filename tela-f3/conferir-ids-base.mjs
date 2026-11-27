/**
 * Tela F3 — conferência das cláusulas e dos ids contra o corpus do DS e a base que o oráculo congelado serve (molde:
 * tela-f2/conferir-ids-base.mjs), e conferência das regras repetidas contra as referências de A, A2, B, D, E, F e F2.
 *
 * Lê da árvore congelada .tmp-eval/validator-3712r (HEAD 816f4ba = tag congelado-3.7.12), do disco (sem build ou
 * execução), só os arquivos de regra da versão ativa (manifest.json › activeVersion › ruleFiles, sha256 conferido com o
 * manifesto da versão) e, de cada registro, só id, originalText, source.corpusFile e source.charRange.
 *
 * Critério, por spec semeada (tela-f3/semeadas.mjs, e a referência montada):
 *  - cada trecho citado existe LITERAL no arquivo do corpus (ds-rules/govbr-ds-3.7.0-corpus, fora normalizacao/);
 *    grava a(s) linha(s) em que aparece;
 *  - cada id existe na base servida, no arquivo do corpus da cláusula, e o texto literal do registro (marcas inline e
 *    barras de tabela fora, espaços juntados) está contido no trecho ou o contém; a faixa do registro cai numa das
 *    ocorrências do trecho no arquivo;
 *  - spec sem id (`_meta.semIdMapeado`): `rules` vazio e nenhum registro da base servida, no mesmo arquivo, com texto
 *    contido no trecho ou que o contenha — continua sem id;
 *  - `rules` da referência = a união dos ids das cláusulas, na ordem.
 * Specs naturais: cada id `govbr-…` existe na base servida (a migração é a da D 1.1.0; nada muda aqui).
 * Regras repetidas: cada id das 12 semeadas procurado nas `rules` (e em todo o texto) das referências de A, A2, B, D, E,
 * F e F2 (telas.json diz qual arquivo é de qual tela), com e sem o prefixo govbr-3.7.0- (notas citam o id curto);
 * repetição é declarada, não filtrada (adendo 3 § 3).
 * Uso: node tela-f3/conferir-ids-base.mjs → tela-f3/conferencia-ids-base.json (sai ≠ 0 se algo divergir)
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { SEMEADAS } from "./semeadas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const CORPUS = "F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus";
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
const refBuf = readFileSync(join(RAIZ, "ground-truth-processos-f3.json"));
const ref = JSON.parse(refBuf);
const semId = ref._meta.semIdMapeado?.specs ?? {};
const sem = new Set(ref._meta.estratos.semeado.specs);
const ocorrencias = (texto, trecho) => { const o = []; let i = texto.indexOf(trecho); while (i >= 0) { o.push(i); i = texto.indexOf(trecho, i + 1); } return o; };
const linhaDe = (texto, i) => texto.slice(0, i).split("\n").length;
const linhas = [], clausulas = {};
for (const v of ref.violations) {
  if (!sem.has(v.id)) {
    for (const id of v.rules.filter(r => r.startsWith("govbr-"))) linhas.push({ spec: v.id, estrato: "natural", id, existe: porId.has(id), resultado: porId.has(id) ? "casa" : "diverge" });
    continue;
  }
  const s = SEMEADAS.find(x => x.id === v.id);
  const uniao = s.clausulas.flatMap(c => c.rules);
  if (JSON.stringify(uniao) !== JSON.stringify(v.rules)) linhas.push({ spec: v.id, estrato: "semeado", id: null, resultado: "diverge", nota: "rules da referência ≠ ids das cláusulas" });
  clausulas[v.id] = [];
  for (const c of s.clausulas) {
    if (c.arquivo.startsWith("normalizacao/")) throw new Error(`${v.id}: cláusula na pasta normalizacao/`);
    const texto = readFileSync(join(CORPUS, c.arquivo), "utf8");
    const occ = ocorrencias(texto, c.trecho);
    clausulas[v.id].push({ arquivo: c.arquivo, trecho: c.trecho, ...(c.secao ? { secao: c.secao } : {}), literal: occ.length > 0, linhas: occ.map(i => linhaDe(texto, i)), arquivoSha256: sha(Buffer.from(texto, "utf8")), ids: c.rules });
    if (!occ.length) { linhas.push({ spec: v.id, estrato: "semeado", id: null, arquivo: c.arquivo, resultado: "diverge", nota: "trecho não está literal no arquivo" }); continue; }
    const p = chave(c.trecho);
    if (c.rules.length === 0) {
      const ligados = todos.filter(r => r.arquivo === c.arquivo && (() => { const cr = chave(r.texto); return cr && (p.includes(cr) || cr.includes(p)); })());
      const ok = v.rules.length === 0 && ligados.length === 0 && semId[v.id]?.trecho === c.trecho && semId[v.id]?.arquivo === c.arquivo;
      linhas.push({ spec: v.id, estrato: "semeado", id: null, semIdMapeado: true, arquivo: c.arquivo, registrosComOMesmoTexto: ligados.map(r => r.id), rulesVazio: v.rules.length === 0, resultado: ok ? "casa" : "diverge", nota: ok ? "continua sem registro na base servida" : "ver campos" });
      continue;
    }
    for (const id of c.rules) {
      const r = porId.get(id);
      const cr = r ? chave(r.texto) : "";
      const contido = !!r && (p.includes(cr) || cr.includes(p));
      const mesmoArquivo = !!r && r.arquivo === c.arquivo;
      const naOcorrencia = !!r && occ.some(i => r.faixa && r.faixa[0] >= i && r.faixa[0] < i + c.trecho.length + 200);
      linhas.push({ spec: v.id, estrato: "semeado", id, existe: !!r, arquivo: r?.arquivo ?? null, charRange: r?.faixa ?? null, linhaDoRegistro: r?.faixa ? linhaDe(texto, r.faixa[0]) : null, textoDoRegistro: r?.texto ?? null, mesmoArquivo, textoNoTrecho: contido, faixaNaOcorrencia: naOcorrencia, resultado: r && contido && mesmoArquivo && naOcorrencia ? "casa" : "diverge" });
    }
  }
}
// regras repetidas: as 12 semeadas × referências de A, A2, B, D, E, F e F2
const telas = JSON.parse(readFileSync(join(RAIZ, "telas.json"), "utf8"));
const ROTULO = { solicitacao: "A", acompanhamento: "A2", vistorias: "B", processos: "D", "cadastro-pais": "E", "processos-f": "F", "processos-f2": "F2" };
const outras = Object.entries(ROTULO).map(([nome, rot]) => { const arq = telas[nome].reference; const buf = readFileSync(join(RAIZ, arq)); return { tela: rot, nome, arquivo: arq, sha256: sha(buf), texto: buf.toString("utf8"), json: JSON.parse(buf) }; });
const repetidas = [];
for (const s of SEMEADAS) for (const id of s.clausulas.flatMap(c => c.rules)) {
  for (const o of outras) {
    const specs = (o.json.violations ?? []).filter(v => (v.rules ?? []).includes(id) || (v.rulesLegado ?? []).includes(id)).map(v => v.id);
    const curto = id.replace(/^govbr-3\.7\.0-/, ""); // notas citam o id sem o prefixo (ex.: chamariz da A2)
    const noTexto = o.texto.includes(curto);
    if (specs.length || noTexto) {
      // onde, fora das rules, o id aparece (nota, chamariz, conformes...)
      const onde = [];
      const varrer = (x, caminho) => { if (typeof x === "string") { if (x.includes(curto)) onde.push(caminho); } else if (Array.isArray(x)) x.forEach((y, i) => varrer(y, `${caminho}[${i}]`)); else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) varrer(y, `${caminho}.${k}`); };
      varrer(o.json, "$");
      repetidas.push({ semeada: s.id, id, tela: o.tela, arquivo: o.arquivo, specsComARegra: specs, ondeAparece: onde });
    }
  }
}
const s = linhas.filter(l => l.estrato === "semeado"), n = linhas.filter(l => l.estrato === "natural");
const out = {
  _meta: {
    data: "2026-11-27", criterio: "ver cabeçalho de tela-f3/conferir-ids-base.mjs",
    validador: { dir: VAL, tag: TAG, commit, baseAtiva: ativa, ruleFiles: fontes, registros: todos.length, camposLidos: ["id", "originalText", "source.corpusFile", "source.charRange"] },
    referencia: { arquivo: "ground-truth-processos-f3.json", version: ref._meta.version, sha256: sha(refBuf), status: ref._meta.status.slice(0, 40) },
    contagens: { semeadoIds: s.filter(l => l.id).length, semeadoIdsCasam: s.filter(l => l.id && l.resultado === "casa").length, semeadoSemId: s.filter(l => !l.id && l.semIdMapeado).length, semeadoSemIdConfirmado: s.filter(l => !l.id && l.semIdMapeado && l.resultado === "casa").length, clausulasLiterais: Object.values(clausulas).flat().filter(c => c.literal).length, clausulas: Object.values(clausulas).flat().length, naturalIds: n.length, naturalIdsExistem: n.filter(l => l.resultado === "casa").length, repeticoes: repetidas.length },
    referenciasConferidas: outras.map(({ tela, nome, arquivo, sha256 }) => ({ tela, nome, arquivo, sha256 })),
  },
  clausulas, linhas, repetidas,
};
writeFileSync(join(AQUI, "conferencia-ids-base.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out._meta.contagens));
for (const r of repetidas) console.log(`repete: ${r.semeada} ${r.id} na ${r.tela} (${r.arquivo}) specs [${r.specsComARegra.join(", ")}] em ${r.ondeAparece.slice(0, 4).join(" ")}`);
process.exit(linhas.every(l => l.resultado === "casa") && Object.values(clausulas).flat().every(c => c.literal) ? 0 : 1);
