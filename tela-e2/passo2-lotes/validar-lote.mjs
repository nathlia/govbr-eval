// Valida um lote do passo 2 da E2 (critérios em CRITERIOS.md; adaptação de tela-a2/passo2-lotes + efeitos-lotes/validar-lote.mjs).
// Uso: node tela-e2/passo2-lotes/validar-lote.mjs <N>   (ou: <entrada.json> <saida.json>)
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const voc = JSON.parse(readFileSync(join(ROOT, "tela-e2/VOCABULARIO.json"), "utf8"));
const ids = new Set(JSON.parse(readFileSync(join(ROOT, "tela-e2/universo.json"), "utf8")).unidades.map(u => u.id));

export const MOTIVOS = new Set(["forca", "nao-se-aplica", "escopo", "so-andaime", "nao-normativa", "sem-medicao", "acoplada", "duplicada", "conflito"]);
export const PROIBIDO = /detector|checker|or[áa]culo|oracle|validator|busca|suporte|\bkb\b/i;
export const CATEGORIAS = new Set(["token", "tipografia", "estrutura", "componente", "comportamento", "acessibilidade", "navegacao", "formulario"]);
export const TIPOS = new Set(["estrutura-classe", "visual-token", "comportamento"]);
export const CAMINHOS = new Set(["axe", "medicao", "leitura-da-regra", "interacao"]);
export const GUIAS_GERAIS = new Set(["acessibilidade.md", "guias/acessibilidade-html.md", "guias/wai-aria.md"]);
/** Nós do documento que são andaime: nenhuma variante os toca nem remove. */
export const PAGINA_PROTEGIDA = new Set(["doctype", "html", "head", "title", "body", "h1", "regioes", "titulo-form", "titulo-lista"]);

export function validarEfeito(where, ef, host, errs) {
  if (!ef || typeof ef !== "object") return errs.push(`${where}: efeito ausente`);
  for (const k of Object.keys(ef)) if (!["toca", "remove", "cascata", "estado", "nota"].includes(k)) errs.push(`${where}: campo desconhecido ${k}`);
  if (!Array.isArray(ef.toca) || ef.toca.length === 0) errs.push(`${where}: 'toca' vazio`);
  for (const f of ["toca", "remove"]) for (const n of ef[f] ?? []) {
    const m = /^([^:]+):(.+)$/.exec(n);
    const inst = m ? (m[1] === "$" ? host : m[1]) : null;
    const comp = inst ? voc.instancias[inst] : null;
    if (!comp || !voc.partes[comp]?.includes(m[2])) { errs.push(`${where}: nó fora do vocabulário em ${f}: ${n} (hospedeiro ${host})`); continue; }
    if (inst === "pagina" && PAGINA_PROTEGIDA.has(m[2])) errs.push(`${where}: toca andaime do documento: ${n}`);
  }
  for (const i of ef.cascata ?? []) if (i !== "*" && !voc.instancias[i]) errs.push(`${where}: cascata com instância desconhecida ${i}`);
  if (ef.estado != null && !["recarga", "navegacao"].includes(ef.estado)) errs.push(`${where}: estado inválido ${ef.estado}`);
  if (typeof ef.nota !== "string" || !ef.nota.trim()) errs.push(`${where}: 'nota' obrigatória`);
}

export function validarDecisao(u, d, errs) {
  if (!d || typeof d !== "object") return errs.push(`${u.id}: sem decisão`);
  if (PROIBIDO.test(`${d.motivo ?? ""} ${d.justificativa ?? ""} ${d.razaoCategorias ?? ""}`)) errs.push(`${u.id}: palavra proibida na justificativa`);
  if (typeof d.justificativa !== "string" || !d.justificativa.trim()) errs.push(`${u.id}: justificativa vazia`);
  if (d.equivalenteEmag != null && !/^\d+\.\d+$/.test(d.equivalenteEmag)) errs.push(`${u.id}: equivalenteEmag fora do formato X.Y`);
  if (d.aceita === false) {
    const [base, alvo] = String(d.motivo ?? "").split(/:(.*)/s);
    if (!MOTIVOS.has(base)) errs.push(`${u.id}: motivo inválido ${d.motivo}`);
    if (base === "duplicada" && (!alvo || !ids.has(alvo))) errs.push(`${u.id}: duplicada de id inexistente ${alvo}`);
    if (base === "duplicada" && alvo === u.id) errs.push(`${u.id}: duplicada de si mesma`);
    return;
  }
  if (d.aceita !== true) return errs.push(`${u.id}: 'aceita' tem de ser true ou false`);
  const hosts = d.instancias ?? [];
  if (!hosts.length) errs.push(`${u.id}: aceita sem instâncias`);
  for (const h of hosts) if (!u.hospedeirosPossiveis.includes(h)) errs.push(`${u.id}: hospedeiro fora dos possíveis: ${h}`);
  if (!TIPOS.has(d.tipo)) errs.push(`${u.id}: tipo inválido`);
  if (!Array.isArray(d.caminhoDeteccao) || !d.caminhoDeteccao.length || d.caminhoDeteccao.some(c => !CAMINHOS.has(c))) errs.push(`${u.id}: caminhoDeteccao inválido`);
  if (!Array.isArray(d.categorias) || !d.categorias.length || d.categorias.some(c => !CATEGORIAS.has(c))) errs.push(`${u.id}: categorias inválidas`);
  const geral = u.arquivo.startsWith("emag/") || GUIAS_GERAIS.has(u.arquivo) || d.equivalenteEmag != null;
  if (geral && !(d.categorias ?? []).includes("acessibilidade")) errs.push(`${u.id}: unidade geral (e-MAG/guia/equivalenteEmag) sem 'acessibilidade'`);
  if (typeof d.razaoCategorias !== "string" || !d.razaoCategorias.trim()) errs.push(`${u.id}: razaoCategorias vazia`);
  if (!Array.isArray(d.variantes) || !d.variantes.length || d.variantes.length > 3) errs.push(`${u.id}: 1–3 variantes`);
  const vids = new Set();
  for (const v of d.variantes ?? []) {
    if (!v.id || vids.has(v.id)) errs.push(`${u.id}: variante sem id ou repetida`); vids.add(v.id);
    if (!v.descricao?.trim() || !v.clausula?.trim()) errs.push(`${u.id}/${v.id}: descricao e clausula obrigatórias`);
    const vh = v.instancias ?? hosts;
    for (const h of vh) if (!hosts.includes(h)) errs.push(`${u.id}/${v.id}: instância fora dos hospedeiros: ${h}`);
    const ef = v.efeitos;
    if (ef?.porHospedeiro) {
      for (const h of vh) validarEfeito(`${u.id}/${v.id}@${h}`, ef.porHospedeiro[h], h, errs);
      for (const h of Object.keys(ef.porHospedeiro)) if (!vh.includes(h)) errs.push(`${u.id}/${v.id}: efeito de hospedeiro a mais ${h}`);
    } else for (const h of vh) validarEfeito(`${u.id}/${v.id}@${h}`, ef, h, errs);
  }
  for (const h of hosts) if (!(d.variantes ?? []).some(v => !v.instancias || v.instancias.includes(h))) errs.push(`${u.id}: hospedeiro sem variante: ${h}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const [inF, outF] = a.length === 1 ? [join(HERE, "entradas", `lote-${a[0]}.json`), join(HERE, `lote-${a[0]}.json`)] : a;
  const entrada = JSON.parse(readFileSync(inF, "utf8"));
  const saida = JSON.parse(readFileSync(outF, "utf8"));
  const errs = [];
  for (const u of entrada) validarDecisao(u, saida[u.id], errs);
  for (const k of Object.keys(saida)) if (!k.startsWith("_") && !entrada.some(u => u.id === k)) errs.push(`${k}: unidade fora do lote`);
  if (errs.length) { console.error(errs.slice(0, 80).join("\n")); console.error(`${errs.length} erro(s)`); process.exit(1); }
  console.log(`ok: ${entrada.length} unidades`);
}
