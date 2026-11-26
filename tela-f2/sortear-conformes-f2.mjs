/**
 * Controles conformes da tela F2: o procedimento da D (tela-d/sortear-conformes.mjs — os mesmos pares elegíveis
 * `ELEGIVEIS`, a mesma regra de camadas, o mesmo PRNG e o mesmo teto de 12), com a mesma mudança declarada da F
 * (tela-f/sortear-conformes-f.mjs): a exclusão que a D já tinha ("fora pares cujo elemento é âncora de uma unidade") vale
 * também para as specs semeadas. Elemento participante de spec semeada = a âncora dela ou o hospedeiro em que a mudança
 * semeada está escrita (custom property ou estilo no host do web component). Pares excluídos:
 *   - titulo-contraste (h2 "Processos"): âncora da F2-04;
 *   - divisor (br-divider): hospedeiro da mudança da F2-06 (a âncora é o span interno);
 *   - breadcrumb-orientacao (br-breadcrumb): hospedeiro da mudança da F2-07 (a âncora é o ícone Home interno);
 *   - abas-teclado (os 3 botões das abas): âncora da F2-08; o br-tab é hospedeiro da mudança e o li da F2-11 é o mesmo item;
 *   - botoes-rotulo ("Exportar" e "Voltar"): o "Voltar" é âncora da F2-12.
 * Semente nova, gravada antes de rodar; com ≤ 12 elegíveis o procedimento da D não sorteia (entram todos).
 * Re-medida: os pares que ficam foram re-medidos na página semeada pelo código da D (tela-f2/remedida-d/semeada-d14.log).
 * Uso: node tela-f2/sortear-conformes-f2.mjs → tela-f2/conformes.json
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ELEGIVEIS, TETO } from "../tela-d/sortear-conformes.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SEMENTE = "tela-f2/conformes 2026-11-26 (gravada antes do sorteio)";
const TIPOS = ["breadcrumb", "tab", "button", "table", "divider", "radio", "item", "estrutura"]; // os da D
const EXCLUIDOS = {
  "titulo-contraste": "elemento âncora da F2-04 (h2 \"Processos\")",
  "divisor": "hospedeiro da mudança semeada da F2-06 (br-divider)",
  "breadcrumb-orientacao": "hospedeiro da mudança semeada da F2-07 (br-breadcrumb)",
  "abas-teclado": "elementos âncora da F2-08 (botões das abas; br-tab é hospedeiro da mudança, e o item da F2-11 é um deles)",
  "botoes-rotulo": "elemento âncora da F2-12 (Voltar)",
};
const D = JSON.parse(readFileSync(join(AQUI, "../tela-d/conformes.json"), "utf8"));
for (const k of Object.keys(EXCLUIDOS)) if (!ELEGIVEIS.some(e => e.par === k)) throw new Error(`par inexistente: ${k}`);
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const restantes = ELEGIVEIS.filter(e => !EXCLUIDOS[e.par]);
let escolhidos, camada1 = [], sorteio = false;
if (restantes.length <= TETO) escolhidos = [...restantes];
else {
  sorteio = true;
  const rnd = mulberry32(parseInt(createHash("sha256").update(SEMENTE).digest("hex").slice(0, 8), 16));
  const r = [...restantes]; escolhidos = [];
  for (const t of TIPOS) { const d = r.filter(e => e.tipo === t); if (!d.length) continue; const e = d[Math.floor(rnd() * d.length)]; escolhidos.push(e); camada1.push(e.par); r.splice(r.indexOf(e), 1); }
  while (escolhidos.length < TETO && r.length) escolhidos.push(r.splice(Math.floor(rnd() * r.length), 1)[0]);
  escolhidos.sort((a, b) => ELEGIVEIS.indexOf(a) - ELEGIVEIS.indexOf(b));
}
const daD = new Map(D.itens.map(k => [k.par, k.id]));
const itens = escolhidos.map((e, i) => ({ id: `K-${String(i + 1).padStart(2, "0")}`, deD: daD.get(e.par) ?? null, par: e.par, tipo: e.tipo, state: e.state, selector: e.selector, count: e.count, rules: e.rules, medida: e.medida }));
const saida = {
  tela: "processos-f2 (tela F2)",
  regra: "procedimento da D (tela-d/sortear-conformes.mjs), com as âncoras e os hospedeiros das mudanças das specs semeadas somados à exclusão que a D já fazia (elemento âncora de unidade); ver cabeçalho de tela-f2/sortear-conformes-f2.mjs",
  semente: SEMENTE, prng: D.prng, teto: TETO,
  elegiveisDaD: ELEGIVEIS.map(e => e.par), excluidos: EXCLUIDOS, elegiveis: restantes.map(e => e.par), camada1_um_por_tipo: camada1, sorteio,
  substituicao: { saem: D.itens.filter(k => EXCLUIDOS[k.par]).map(k => k.id + " " + k.par), entram: itens.filter(k => !k.deD).map(k => k.par), total: itens.length,
    nota: `com ${restantes.length} elegíveis depois das exclusões (≤ 12), o procedimento da D põe todos; a F2 fica com ${itens.length} controles, não 12` },
  remedida: { arquivo: "tela-f2/remedida-d/semeada-d14.log", resultado: `os ${itens.length} pares conformes na página semeada (código da D)` },
  itens,
};
writeFileSync(join(AQUI, "conformes.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${ELEGIVEIS.length} elegíveis da D − ${Object.keys(EXCLUIDOS).length} excluídos = ${restantes.length} → ${itens.length} controles (${sorteio ? "sorteio" : "todos"}); saem ${saida.substituicao.saem.join(", ")}; entram ${saida.substituicao.entram.join(", ") || "nenhum"}`);
