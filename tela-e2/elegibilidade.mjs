/**
 * Tela E2 — elegibilidade (metodo.md § 4): passo 1 mecânico + passo 2 (herdado da A2 por id, ou julgado agora nos
 * lotes passo2-lotes/lote-*.json com os critérios de passo2-lotes/CRITERIOS.md). Equivalente, para a E2, do main()
 * de scripts/tela-a2-universo.ts, com as mesmas recusas (motivo fora da lista, palavra de detector/oráculo, hospedeiro
 * desconhecido, variante sem hospedeiro) e as conferências de efeitos e categorias do validar-lote.
 * Grava tela-e2/elegibilidade-passo2.json (decisões finais, com origem) e tela-e2/elegibilidade.json (todas as unidades).
 * Uso: node tela-e2/elegibilidade.mjs
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { passo1, hospedeirosPossiveis } from "./passo2-lotes/preparar-lib.mjs";
import { validarDecisao, GUIAS_GERAIS } from "./passo2-lotes/validar-lote.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOTES = join(ROOT, "tela-e2/passo2-lotes");
const sha256 = b => createHash("sha256").update(b).digest("hex");
const ler = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const universoBruto = readFileSync(join(ROOT, "tela-e2/universo.json"));
const U = JSON.parse(universoBruto).unidades;
const inv = ler("tela-e2/inventario.json");
const herdado = ler("tela-e2/passo2-lotes/herdado.json").regras;
const julgado = {};
/** Lote de rejulgamento (inventário iteração 2): substitui a decisão anterior da mesma unidade, que fica registrada. */
const REJULGAMENTO = new Set(["lote-9.json"]);
const numero = f => Number(/\d+/.exec(f)[0]);
const lotes = readdirSync(LOTES).filter(f => /^lote-\d+\.json$/.test(f)).sort((a, b) => numero(a) - numero(b));
let substituidas = 0;
for (const f of lotes) for (const [id, d] of Object.entries(JSON.parse(readFileSync(join(LOTES, f), "utf8")))) if (!id.startsWith("_")) {
  if (julgado[id] && !REJULGAMENTO.has(f)) throw new Error(`unidade julgada em dois lotes: ${id}`);
  if (julgado[id]) substituidas++;
  julgado[id] = { ...d, heranca: "nova", lote: f, ...(julgado[id] ? { substitui: julgado[id].lote } : {}) };
}
const revisao = JSON.parse(readFileSync(join(LOTES, "revisao-duplicatas.json"), "utf8")).regras;
for (const [id, d] of Object.entries(revisao)) { if (!julgado[id]) throw new Error(`revisão de unidade não julgada: ${id}`); julgado[id] = { ...d, heranca: "nova", lote: "revisao-duplicatas.json", substitui: julgado[id].lote }; }
const decisoes = {}, errs = [];
const conta = { herdadas: 0, novas: 0, pendentes: 0 };
const regras = U.map(u => {
  const p1 = passo1(u, inv);
  let j = null;
  if (!p1) {
    if (herdado[u.id] && julgado[u.id]) errs.push(`${u.id}: herdada e julgada`);
    j = herdado[u.id] ?? julgado[u.id] ?? null;
    if (j) {
      decisoes[u.id] = j;
      if (j.heranca === "a2") conta.herdadas++; else { conta.novas++; validarDecisao({ ...u, arquivo: u.fonte.arquivo, hospedeirosPossiveis: hospedeirosPossiveis(u, inv) }, j, errs); }
    } else conta.pendentes++;
  }
  const geral = u.fonte.arquivo.startsWith("emag/") || GUIAS_GERAIS.has(u.fonte.arquivo) || Boolean(j?.equivalenteEmag);
  return {
    id: u.id, componente: u.componente, arquivo: u.fonte.arquivo, texto: u.texto, forca: u.forca,
    passo1: p1 ? "rejeitada" : "aceita",
    passo2: p1 ? null : j ? (j.aceita ? "aceita" : "rejeitada") : "pendente",
    origemPasso2: p1 || !j ? null : j.heranca,
    motivo: p1 ?? (j && !j.aceita ? j.motivo ?? null : null),
    justificativa: j?.justificativa ?? null,
    instancias: j?.aceita ? j.instancias : [],
    variantes: j?.aceita ? j.variantes.map(v => ({ ...v, clausula: v.clausula ?? u.texto })) : [],
    tipo: j?.aceita ? j.tipo : null,
    caminhoDeteccao: j?.aceita ? j.caminhoDeteccao : null,
    categorias: j?.aceita ? j.categorias : null,
    razaoCategorias: j?.aceita ? j.razaoCategorias : null,
    equivalenteEmag: j?.equivalenteEmag ?? null,
    estratoFonte: j?.aceita ? (geral ? "G" : "DS") : null,
  };
});
for (const r of regras) if (r.motivo?.startsWith("duplicada:")) { const alvo = r.motivo.slice(10); if (!U.some(u => u.id === alvo)) errs.push(`${r.id}: duplicada de id inexistente`); }
if (errs.length) { console.error(errs.slice(0, 60).join("\n")); console.error(`${errs.length} erro(s)`); process.exit(1); }
const c = f => { const o = {}; for (const r of regras) { const k = f(r); if (k) o[k] = (o[k] ?? 0) + 1; } return o; };
const resumo = {
  universo: regras.length,
  rejeitadasPasso1: c(r => (r.passo1 === "rejeitada" ? r.motivo : null)),
  chegaramPasso2: regras.filter(r => r.passo1 === "aceita").length,
  julgamentos: { ...conta, rejulgadasNoLote9: substituidas, revisaoDuplicatas: Object.keys(revisao).length },
  rejeitadasPasso2: c(r => (r.passo2 === "rejeitada" ? r.motivo.split(":")[0] : null)),
  elegiveis: regras.filter(r => r.passo2 === "aceita").length,
  elegiveisPorOrigem: c(r => (r.passo2 === "aceita" ? r.origemPasso2 : null)),
};
writeFileSync(join(ROOT, "tela-e2/elegibilidade-passo2.json"), JSON.stringify({ _meta: { regra: "tela-e2/metodo.md § 4.3–4.4", criterios: "tela-e2/passo2-lotes/CRITERIOS.md", herdadoDe: "tela-a2/elegibilidade-passo2.json", lotes }, regras: decisoes }, null, 1) + "\n");
writeFileSync(join(ROOT, "tela-e2/elegibilidade.json"), JSON.stringify({ _meta: { geradoPor: "tela-e2/elegibilidade.mjs", universoSha256: sha256(universoBruto), ...resumo }, regras }, null, 1) + "\n");
console.log(JSON.stringify(resumo, null, 1));
