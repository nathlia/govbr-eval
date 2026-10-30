// Monta tela-a2/elegibilidade-passo2.json a partir dos lotes de julgamento arquivados aqui.
//
// O JSON julgado (elegibilidade-passo2.json) é o insumo primário e auditável do sorteio; este montador
// só documenta como ele foi composto e permite reconstruí-lo:
//   1. rodada 0 (b1..b4.mjs, julgamento de 2026-10-30 antes da revisão do Codex), com a fusão
//      automática DS→e-MAG daquela rodada;
//   2. lotes novos lote-*.json (unidades que a extração ampliada trouxe), entradas completas;
//   3. revisao-1.json (Revisão Codex 1): substitui por inteiro as entradas listadas — inclusive as
//      recomendações do e-MAG, reescritas com cláusula literal por variante, o que anula a fusão da rodada 0.
// Uso: node tela-a2/passo2-lotes/montar.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import b1 from "./b1.mjs"; import b2 from "./b2.mjs"; import b3 from "./b3.mjs"; import b4, { EMAG } from "./b4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const uni = JSON.parse(readFileSync(join(ROOT, "tela-a2/universo.json"), "utf8")).unidades;
const elig = JSON.parse(readFileSync(join(ROOT, "tela-a2/elegibilidade.json"), "utf8")).regras;
const pending = new Set(elig.filter(r => r.passo1 === "aceita").map(r => r.id));
for (const u of uni) { const m = /^Recomendação (\d+\.\d+)/.exec(u.texto); if (u.marcador === "emag-recomendacao" && m) EMAG[m[1]] = u.id; }

// ---- rodada 0 ----
const out = {}; const emagIdByNum = n => { if (!EMAG[n]) throw new Error("emag " + n); return EMAG[n]; };
const full = id => (id.startsWith("a2-") ? id : "a2-" + id);
const absorbed = [];
const put = (id, e) => { id = full(id); if (!pending.has(id)) { if (!uni.some(u => u.id === id)) { absorbed.push(id); return; } throw new Error("id fora do passo 2: " + id); } if (out[id]) throw new Error("repetido: " + id); out[id] = e; };
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
  for (const h of m.hosts) if (!t.instancias.includes(h)) t.instancias.push(h);
  for (const v of m.variantes) { if (t.variantes.some(x => x.id === v.id)) v.id = `${v.id}-${v.instancias[0]}`; t.variantes.push(v); }
}

// ---- lotes novos e revisão ----
const loadJson = f => JSON.parse(readFileSync(join(HERE, f), "utf8"));
const lots = readdirSync(HERE).filter(f => /^lote-.*\.json$/.test(f)).sort();
for (const f of lots) for (const [id, e] of Object.entries(loadJson(f))) put(id, e);
const origem = Object.fromEntries(Object.keys(out).map(id => [id, "rodada-0"]));
for (const f of lots) for (const id of Object.keys(loadJson(f))) if (out[full(id)]) origem[full(id)] = f;
{
  const rev = (await import("./revisao-1.mjs")).default;
  for (const [id, e] of Object.entries(rev)) {
    if (id.startsWith("_")) continue;
    const k = full(id);
    if (!pending.has(k)) throw new Error("revisão fora do passo 2: " + k);
    if (e._patch) { const { _patch, ...rest } = e; if (!out[k]?.aceita) throw new Error("patch em não aceita: " + k); out[k] = { ...out[k], ...rest }; }
    else { out[k] = e; origem[k] = "revisao-1"; }
  }
}

const missing = [...pending].filter(id => !out[id]);
const partial = process.argv.includes("--parcial");
if (missing.length && !partial) { console.error(`faltam ${missing.length}: ${missing.slice(0, 20).join(", ")}…`); process.exit(1); }
if (absorbed.length) console.log(`${absorbed.length} julgamentos de unidades que não existem mais no universo (linhas absorvidas por tabela-especificacao): ignorados`);
for (const id of Object.keys(out)) if (!pending.has(id)) throw new Error("sobra: " + id);
const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, { ...out[k], origem: origem[k] }]));
writeFileSync(join(ROOT, "tela-a2/elegibilidade-passo2.json"), JSON.stringify({
  _meta: {
    plano: "thesis-workspace/planejamento/atual/plano-tela-a2-2026-10-30.md",
    julgadoEm: "2026-10-30",
    julgadoPor: "assistente (Claude Opus, NAT-110) + agentes de julgamento por lote com os mesmos critérios (tela-a2/passo2-lotes/CRITERIOS.md); revisão do assistente sobre todos",
    cegueira: "sem abrir govbr-ds-validator, ds-rules/govbr-ds-3.7.0-corpus/normalizacao, ds-rules/0*, checker-aliases, kb-aliases, results/, reports/",
    insumoPrimario: "este arquivo; passo2-lotes/ guarda os lotes de onde foi montado",
  },
  regras: sorted,
}, null, 2) + "\n");
console.log("passo 2:", Object.keys(out).length, "aceitas:", Object.values(out).filter(e => e.aceita).length);
