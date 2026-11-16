/**
 * Tela E2 — passo 2 do congelamento: cada id de regra da referência (principal e variante comU09) tem de existir, com o
 * mesmo texto literal, na base literal que o oráculo congelado 3.7.12 serve (govbr-ds-validator main 816f4ba).
 *
 * Lê do validator SÓ arquivos de dados da base (somente leitura; nada é construído nem executado):
 *   data/knowledge/manifest.json (activeVersion) → versions/<v>/manifest.json (ruleFiles, sha256 declarados)
 *   → normalized/rules.jsonl + normalized/carried-over.jsonl (o que dist/data/knowledge.js carrega).
 * O e-MAG é servido pelas mesmas linhas (standard "e-MAG", emagReferences ["X.Y"]; get_emag_rules id "X.Y").
 *
 * Critério:
 *   - id da base do DS: o registro existe nos arquivos servidos e o texto literal dele (originalText) é o mesmo da
 *     unidade do universo ligada a esse id pela ponte (tela-e2/ponte-base.json), comparado depois de só juntar espaços
 *     e tirar marcas de formatação inline do markdown (ênfase `**`/`*`/`__` e crase de código); "igual" ou "contido" (um trecho dentro do outro) casam, o resto diverge;
 *   - emag:X.Y: a recomendação X.Y é servida (≥ 1 cláusula com emagReferences X.Y, força ≠ example), o título dela é
 *     o texto da unidade do universo, e cada frase em que a referência se apoia (cláusula da variante sorteada; frases
 *     citadas pelo auditor nos achados reconciliados à célula) está literal numa cláusula servida de X.Y.
 * Divergência não se conserta escolhendo outro id: fica registrada e a unidade para.
 *
 * Uso: node tela-e2/conferir-ids-base.mjs [--validator <dir>] → tela-e2/conferencia-ids-base.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const iV = process.argv.indexOf("--validator");
const VAL = iV > 0 ? process.argv[iV + 1] : "F:/Dev Nath/TCC/govbr-ds-validator";
const json = f => JSON.parse(readFileSync(join(AQUI, f), "utf8"));
const shaBuf = b => createHash("sha256").update(b).digest("hex");
// Marcas de formatação inline do markdown (ênfase e código) não são texto: o universo as tira, a base as guarda.
const norm = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\s+/g, " ").trim();
const normSemCodigo = s => String(s ?? "").replace(/\*\*|\*|__/g, "").replace(/\s+/g, " ").trim();

const commitVal = execFileSync("git", ["-C", VAL, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const versaoVal = JSON.parse(readFileSync(join(VAL, "package.json"), "utf8")).version;
const KD = join(VAL, "data/knowledge");
const ativa = JSON.parse(readFileSync(join(KD, "manifest.json"), "utf8")).activeVersion;
const vman = JSON.parse(readFileSync(join(KD, "versions", ativa, "manifest.json"), "utf8"));
const arquivos = {};
const registros = [];
for (const f of vman.ruleFiles) {
  const buf = readFileSync(join(KD, "versions", ativa, f));
  const s = shaBuf(buf);
  const declarado = vman.files?.[f] ?? null;
  if (declarado && declarado !== s) throw new Error(`${f}: sha256 ${s} ≠ declarado no manifesto ${declarado}`);
  arquivos[f] = { sha256: s, declaradoNoManifesto: declarado };
  for (const l of buf.toString("utf8").split("\n").filter(Boolean)) registros.push(JSON.parse(l));
}
const porId = new Map(registros.map(r => [r.id, r]));
const emagDe = x => registros.filter(r => r.standard === "e-MAG" && (r.emagReferences ?? []).includes(x) && r.force !== "example");

const ref = json("referencia-candidata.json");
const U = Object.fromEntries(json("universo.json").unidades.map(u => [u.id, u]));
const ponte = json("ponte-base.json").porUnidade;
const cv = json("coviolacoes.json").porCelula;
const p2 = json("elegibilidade-passo2.json").regras;
const rec = json("reconciliacao.json");

const specs = [...ref.violations.map(v => ({ v, onde: "principal" })), { v: ref._meta.sensibilidades.comU09.spec, onde: "comU09" }];
const linhas = [];
for (const { v, onde } of specs) {
  const celula = ref._meta.porSpec[v.id].celula;
  const c = cv[celula];
  // id → unidades do universo que a referência liga a ele nesta spec
  const lig = [{ unidade: c.unidadeSorteada, ids: c.idsSorteada, sorteada: true }, ...c.coviolacoes.map(x => ({ unidade: x.unidade, ids: x.idsBase, sorteada: false }))];
  for (const id of v.rules) {
    const unidades = lig.filter(l => l.ids.includes(id)).map(l => l.unidade);
    const linha = { spec: v.id, onde, id, unidades, existe: false, texto: null, resultado: "diverge", nota: "" };
    if (unidades.length === 0) { linha.nota = "id sem unidade ligada na spec"; linhas.push(linha); continue; }
    if (id.startsWith("emag:")) {
      const x = id.slice(5);
      const servidas = emagDe(x);
      linha.existe = servidas.length > 0;
      linha.servido = { getEmagRulesId: x, clausulas: servidas.length };
      const titulo = norm(U[unidades[0]].texto);
      const tituloServido = servidas.find(r => norm(r.originalText) === titulo);
      // frases em que a referência se apoia
      const frases = [];
      for (const un of unidades) {
        const j = p2[un];
        if (j?.variantes) for (const va of j.variantes) if (va.id === ref._meta.porSpec[v.id].variante && va.clausula) frases.push({ de: `variante ${va.id}`, texto: va.clausula });
        for (const a of rec.achados.filter(a => a.celula === celula)) for (const cl of a.clausulas) if (cl.unidades.some(uu => uu.unidade === un)) frases.push({ de: a.id, texto: cl.citacao });
      }
      const frasesRes = frases.map(f => ({ de: f.de, literalNaBase: servidas.some(r => norm(r.originalText).includes(norm(f.texto))) }));
      linha.texto = { titulo: tituloServido ? "igual" : "ausente", frases: frasesRes };
      const ok = linha.existe && tituloServido && frasesRes.every(f => f.literalNaBase);
      linha.resultado = ok ? "casa" : "diverge";
      linha.nota = ok ? `recomendação ${x} servida; título igual; ${frasesRes.length} frase(s) de apoio literais` : "ver texto";
    } else {
      const r = porId.get(id);
      linha.existe = !!r;
      if (r) {
        const servido = norm(r.originalText);
        const comparacoes = unidades.map(un => {
          const t = norm(U[un].texto);
          const p = ponte[un]?.ids?.includes(id) ?? false;
          const soComMarcaDeCodigo = servido === t && normSemCodigo(r.originalText) !== normSemCodigo(U[un].texto);
          return { unidade: un, naPonte: p, comparacao: servido === t ? "igual" : (servido.includes(t) || t.includes(servido)) ? "contido" : "diferente", soDepoisDeTirarCrasesDeCodigo: soComMarcaDeCodigo, forcaNoUniverso: U[un].forca };
        });
        linha.texto = comparacoes;
        linha.servido = { corpusFile: r.source?.corpusFile ?? null, charRange: r.source?.charRange ?? null, force: r.force };
        const ok = comparacoes.every(cc => cc.naPonte && cc.comparacao !== "diferente");
        linha.resultado = ok ? "casa" : "diverge";
        linha.nota = ok ? comparacoes.map(cc => cc.comparacao).join(",") : "texto ou ponte diverge";
      } else linha.nota = "id ausente da base servida";
    }
    linhas.push(linha);
  }
}
const unicos = [...new Set(linhas.map(l => l.id))];
const divergentes = linhas.filter(l => l.resultado !== "casa");
const out = {
  _meta: {
    data: new Date().toISOString().slice(0, 10),
    criterio: "ver cabeçalho de tela-e2/conferir-ids-base.mjs",
    validator: { dir: VAL, commit: commitVal, versao: versaoVal, somenteLeitura: true },
    base: { versao: ativa, ruleFiles: arquivos, rulesSha256: arquivos["normalized/rules.jsonl"].sha256, registros: registros.length },
    referencia: { arquivo: "tela-e2/referencia-candidata.json", sha256: shaBuf(readFileSync(join(AQUI, "referencia-candidata.json"))), version: ref._meta.version,
      // sha256 só dos ids conferidos ([spec, rules] na ordem): não muda quando a referência só ganha a nota desta conferência
      rulesSha256: shaBuf(Buffer.from(JSON.stringify(specs.map(({ v }) => [v.id, v.rules])))) },
    contagens: {
      conferidos: linhas.length, casam: linhas.length - divergentes.length, divergem: divergentes.length,
      idsDistintos: unicos.length, ds: linhas.filter(l => !l.id.startsWith("emag:")).length, emag: linhas.filter(l => l.id.startsWith("emag:")).length,
      principal: linhas.filter(l => l.onde === "principal").length, comU09: linhas.filter(l => l.onde === "comU09").length,
      textoIgual: linhas.filter(l => Array.isArray(l.texto) && l.texto.every(t => t.comparacao === "igual")).length,
      igualSoSemCrases: linhas.filter(l => Array.isArray(l.texto) && l.texto.some(t => t.soDepoisDeTirarCrasesDeCodigo)).length,
      forcaServidaNaoObrigatoria: linhas.filter(l => l.servido?.force && !["required", "prohibited"].includes(l.servido.force)).map(l => ({ spec: l.spec, id: l.id, force: l.servido.force })),
      textoContido: linhas.filter(l => Array.isArray(l.texto) && l.texto.some(t => t.comparacao === "contido")).length,
    },
    divergentes: divergentes.map(l => ({ spec: l.spec, id: l.id, nota: l.nota })),
  },
  linhas,
};
writeFileSync(join(AQUI, "conferencia-ids-base.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`validator ${versaoVal} @ ${commitVal.slice(0, 7)} · base ${ativa} (${registros.length} registros) · ` +
  `conferidos ${linhas.length} (principal ${out._meta.contagens.principal}, comU09 ${out._meta.contagens.comU09}; DS ${out._meta.contagens.ds}, e-MAG ${out._meta.contagens.emag}) · ` +
  `casam ${out._meta.contagens.casam} · divergem ${divergentes.length}` + (divergentes.length ? `: ${divergentes.map(d => `${d.spec}/${d.id}`).join(", ")}` : ""));
process.exit(divergentes.length ? 1 : 0);
