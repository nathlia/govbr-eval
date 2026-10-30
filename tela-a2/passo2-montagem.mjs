// Monta govbr-eval/tela-a2/elegibilidade-passo2.json a partir dos lotes b1..b4.
import { readFileSync, writeFileSync } from "fs";
import b1 from "./b1.mjs"; import b2 from "./b2.mjs"; import b3 from "./b3.mjs"; import b4, { EMAG } from "./b4.mjs";
const ROOT = "F:/Dev Nath/TCC/govbr-eval";
const uni = JSON.parse(readFileSync(`${ROOT}/tela-a2/universo.json`, "utf8")).unidades;
const elig = JSON.parse(readFileSync(`${ROOT}/tela-a2/elegibilidade.json`, "utf8")).regras;
const pending = new Set(elig.filter(r => r.passo1 === "aceita").map(r => r.id));
for (const u of uni) { const m = /^Recomendação (\d+\.\d+)/.exec(u.texto); if (u.marcador === "emag-recomendacao" && m) EMAG[m[1]] = u.id; }
const out = {}; const emagIdByNum = n => { if (!EMAG[n]) throw new Error("emag " + n); return EMAG[n]; };
const full = id => (id.startsWith("a2-") ? id : "a2-" + id);
const put = (id, e) => { id = full(id); if (!pending.has(id)) throw new Error("id fora do passo 2: " + id); if (out[id]) throw new Error("repetido: " + id); out[id] = e; };
const toVar = (x, hosts) => Array.isArray(x) ? { id: x[0], descricao: x[1], ...(x[2] ? { instancias: x[2] } : hosts ? { instancias: hosts } : {}) } : x;
const merges = [];
const R = (id, motivo, justificativa, opt) => {
  put(id, { aceita: false, motivo, justificativa, ...(opt?.emag ? { equivalenteEmag: opt.emag } : {}) });
  if (opt?.hosts) merges.push({ num: opt.emag, hosts: opt.hosts, variantes: opt.variantes.map(x => toVar(x, opt.hosts)) });
};
const A = (id, justificativa, instancias, variantes, opt) => {
  if (opt?.emag) {
    const target = emagIdByNum(opt.emag);
    put(id, { aceita: false, motivo: `duplicada:${target}`, justificativa: `Repete, para esta instância, a recomendação ${opt.emag} do e-MAG; hospedeiros e variante passam para ela. (${justificativa})`, equivalenteEmag: opt.emag });
    merges.push({ num: opt.emag, hosts: instancias, variantes: variantes.map(x => toVar(x, instancias)) });
    return;
  }
  put(id, { aceita: true, justificativa, instancias, variantes: variantes.map(x => toVar(x, null)), ...(opt?.alt ? { alternativasValidas: opt.alt } : {}) });
};
const E = (num, justificativa, instancias, variantes, alternativas) => {
  put(emagIdByNum(num), { aceita: true, justificativa: `e-MAG 3.1, Recomendação ${num}. ${justificativa}`, instancias: [...instancias], variantes: [...variantes], ...(alternativas ? { alternativasValidas: alternativas } : {}) });
};
b1(R, A); b2(R, A); b3(R, A); b4(R, A, E);
for (const m of merges) {
  const t = out[emagIdByNum(m.num)];
  if (!t?.aceita) throw new Error("merge em e-MAG não aceita: " + m.num);
  for (const h of m.hosts) if (!t.instancias.includes(h)) t.instancias.push(h);
  for (const v of m.variantes) { if (t.variantes.some(x => x.id === v.id)) v.id = `${v.id}-${v.instancias[0]}`; t.variantes.push(v); }
}
for (const [id, e] of Object.entries(out)) if (e.aceita && (!e.instancias.length || !e.variantes.length)) throw new Error("aceita vazia: " + id);
const missing = [...pending].filter(id => !out[id]);
if (missing.length) throw new Error("faltam: " + missing.join(", "));
const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
writeFileSync(`${ROOT}/tela-a2/elegibilidade-passo2.json`, JSON.stringify({
  _meta: {
    plano: "thesis-workspace/planejamento/atual/plano-tela-a2-2026-10-30.md",
    julgadoEm: "2026-10-30",
    julgadoPor: "assistente (Claude Opus, subagente da NAT-110), sem abrir validator/src, normalizacao/, checker-aliases, kb-aliases, results/, reports/",
    criterios: "aplicabilidade à tela do inventário e medida pequena na página construída (DOM, CSS computado, árvore de acessibilidade, sequência de teclas); motivos em scripts/tela-a2-universo.ts MOTIVOS_P2",
    nota: "Unidade do DS que repete uma recomendação do e-MAG entra como duplicada dela (equivalenteEmag) e leva hospedeiros e variante para a recomendação; o estrato G fica com uma unidade por recomendação. Variante com 'instancias' só vale nesses hospedeiros.",
  },
  regras: sorted,
}, null, 2) + "\n");
console.log("passo 2:", Object.keys(out).length, "aceitas:", Object.values(out).filter(e => e.aceita).length);
