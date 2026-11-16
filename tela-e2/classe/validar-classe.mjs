// Valida um lote da segunda classificação DS/G. Uso: node tela-e2/classe/validar-classe.mjs <N>
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const HERE = dirname(fileURLToPath(import.meta.url));
const DS = new Set(["token", "tipografia", "estrutura", "componente", "comportamento"]), G = new Set(["acessibilidade", "navegacao", "formulario"]);
const GERAIS = new Set(["acessibilidade.md", "guias/acessibilidade-html.md", "guias/wai-aria.md"]);
export function validarClasse(e, d, errs) {
  if (!d) return errs.push(`${e.celula}: sem classificação`);
  if (!Array.isArray(d.categorias) || !d.categorias.length || d.categorias.some(c => !DS.has(c) && !G.has(c))) errs.push(`${e.celula}: categorias inválidas`);
  const classe = (d.categorias ?? []).every(c => DS.has(c)) ? "DS" : "G";
  if (d.classe !== classe) errs.push(`${e.celula}: classe não bate com as categorias`);
  if ((e.arquivo.startsWith("emag/") || GERAIS.has(e.arquivo)) && classe !== "G") errs.push(`${e.celula}: unidade geral tem de ser G`);
  if (typeof d.razao !== "string" || !d.razao.trim()) errs.push(`${e.celula}: razão vazia`);
  if (/detector|checker|or[áa]culo|oracle|validator|busca|suporte|\bkb\b/i.test(d.razao ?? "")) errs.push(`${e.celula}: palavra proibida`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = process.argv[2];
  const ent = JSON.parse(readFileSync(join(HERE, "entradas", `lote-${n}.json`), "utf8"));
  const sai = JSON.parse(readFileSync(join(HERE, `lote-${n}.json`), "utf8"));
  const errs = [];
  for (const e of ent) validarClasse(e, sai[e.celula], errs);
  for (const k of Object.keys(sai)) if (!ent.some(e => e.celula === k)) errs.push(`${k}: fora do lote`);
  if (errs.length) { console.error(errs.slice(0, 60).join("\n")); console.error(`${errs.length} erro(s)`); process.exit(1); }
  console.log(`ok: ${ent.length} células`);
}
