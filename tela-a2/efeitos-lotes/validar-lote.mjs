// Valida um lote de declarações de efeitos (Revisão Codex 2, bloqueio 3) contra o vocabulário fechado
// e contra as regras do lote. Uso: node tela-a2/efeitos-lotes/validar-lote.mjs <entrada.json> <lote-saida.json>
// <entrada.json> = lista de regras aceitas (id, instancias, variantes, alternativasValidas, componente).
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const voc = JSON.parse(readFileSync(join(HERE, "VOCABULARIO.json"), "utf8"));
const [inFile, outFile] = process.argv.slice(2);
const rules = JSON.parse(readFileSync(inFile, "utf8"));
const decl = JSON.parse(readFileSync(outFile, "utf8"));
const errs = [];
const compOf = i => voc.instancias[i];
const validNode = (n, host) => {
  const m = /^([^:]+):(.+)$/.exec(n);
  if (!m) return false;
  const inst = m[1] === "$" ? host : m[1];
  const comp = compOf(inst);
  return Boolean(comp && voc.partes[comp]?.includes(m[2]));
};
const instances = new Set(Object.keys(voc.instancias));
function checkEffect(where, ef, host) {
  if (!ef || typeof ef !== "object") return errs.push(`${where}: efeito ausente`);
  for (const k of Object.keys(ef)) if (!["toca", "remove", "cascata", "estado", "nota"].includes(k)) errs.push(`${where}: campo desconhecido ${k}`);
  if (!Array.isArray(ef.toca) || ef.toca.length === 0) errs.push(`${where}: 'toca' vazio`);
  for (const f of ["toca", "remove"]) for (const n of ef[f] ?? []) if (!validNode(n, host)) errs.push(`${where}: nó fora do vocabulário em ${f}: ${n} (hospedeiro ${host})`);
  for (const i of ef.cascata ?? []) if (i !== "*" && !instances.has(i)) errs.push(`${where}: cascata com instância desconhecida ${i}`);
  if (ef.estado != null && !["recarga", "navegacao"].includes(ef.estado)) errs.push(`${where}: estado inválido ${ef.estado}`);
  if (typeof ef.nota !== "string" || !ef.nota.trim()) errs.push(`${where}: 'nota' (uma linha) obrigatória`);
}
function checkItem(where, d, hosts) {
  if (!d) return errs.push(`${where}: sem declaração`);
  if (d.porHospedeiro) {
    for (const h of hosts) checkEffect(`${where}@${h}`, d.porHospedeiro[h], h);
    for (const h of Object.keys(d.porHospedeiro)) if (!hosts.includes(h)) errs.push(`${where}: hospedeiro a mais ${h}`);
  } else for (const h of hosts) checkEffect(`${where}@${h}`, d, h);
}
for (const r of rules) {
  const d = decl[r.id];
  if (!d) { errs.push(`${r.id}: regra sem declaração`); continue; }
  for (const v of r.variantes) checkItem(`${r.id}/${v.id}`, d.variantes?.[v.id], v.instancias ?? r.instancias);
  for (const k of Object.keys(d.variantes ?? {})) if (!r.variantes.some(v => v.id === k)) errs.push(`${r.id}: variante desconhecida ${k}`);
  for (const a of r.alternativasValidas ?? []) checkItem(`${r.id}/alt:${a.id}`, d.alternativas?.[a.id], a.instancias ?? r.instancias);
  for (const s of d.acoplamentoSuspeito ?? []) if (!s.variante || !s.viola || !s.porque) errs.push(`${r.id}: acoplamentoSuspeito incompleto`);
}
for (const k of Object.keys(decl)) if (!k.startsWith("_") && !rules.some(r => r.id === k)) errs.push(`${k}: regra fora do lote`);
if (errs.length) { console.error(errs.slice(0, 60).join("\n")); console.error(`${errs.length} erro(s)`); process.exit(1); }
console.log(`ok: ${rules.length} regras`);
