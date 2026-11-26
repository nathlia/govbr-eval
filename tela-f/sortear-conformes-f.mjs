/**
 * Controles conformes da tela F: o procedimento da D (tela-d/sortear-conformes.mjs — os mesmos pares elegíveis
 * `ELEGIVEIS`, a mesma regra de camadas, o mesmo PRNG e o mesmo teto de 12), com UMA mudança declarada antes de rodar:
 * a exclusão que a D já tinha ("fora pares cujo elemento é âncora de uma unidade") passa a valer também para as âncoras
 * das specs semeadas da F. Pares cujo elemento participa de uma spec semeada:
 *   - th-contraste (os 7 títulos de coluna): inclui o th da F-06;
 *   - item-superficie e item-padding (os 4 br-item da lista "Exibir"): incluem o item da F-12;
 *   - botoes-rotulo ("Exportar" e "Voltar"): o "Voltar" é âncora da F-04 (e o contêiner dele, da F-03); na página semeada
 *     o seletor do par resolve 1 elemento, não 2.
 * Semente nova, gravada antes de rodar; com ≤ 12 elegíveis o procedimento da D não sorteia (entram todos).
 * Re-medida: os pares que ficam foram re-medidos na página semeada pelo código da D (tela-f/remedida-d/semeada.log).
 * Uso: node tela-f/sortear-conformes-f.mjs → tela-f/conformes.json
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ELEGIVEIS, TETO } from "../tela-d/sortear-conformes.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SEMENTE = "tela-f/conformes 2026-11-26 (gravada antes do sorteio)";
const TIPOS = ["breadcrumb", "tab", "button", "table", "divider", "radio", "item", "estrutura"]; // os da D
const EXCLUIDOS = {
  "th-contraste": "elemento participante da F-06 (th Téc. Adm.)",
  "item-superficie": "elemento participante da F-12 (item selecionado da lista Exibir)",
  "item-padding": "elemento participante da F-12 (item selecionado da lista Exibir)",
  "botoes-rotulo": "elemento âncora da F-04 (Voltar) e do contêiner da F-03; seletor resolve 1 de 2 na página semeada",
};
const D = JSON.parse(readFileSync(join(AQUI, "../tela-d/conformes.json"), "utf8"));
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
  tela: "processos-f (tela F)",
  regra: "procedimento da D (tela-d/sortear-conformes.mjs), com as âncoras das specs semeadas somadas à exclusão que a D já fazia (elemento âncora de unidade); ver cabeçalho de tela-f/sortear-conformes-f.mjs",
  semente: SEMENTE, prng: D.prng, teto: TETO,
  elegiveisDaD: ELEGIVEIS.map(e => e.par), excluidos: EXCLUIDOS, elegiveis: restantes.map(e => e.par), camada1_um_por_tipo: camada1, sorteio,
  substituicao: { saem: D.itens.filter(k => EXCLUIDOS[k.par]).map(k => k.id + " " + k.par), entram: itens.filter(k => !k.deD).map(k => k.par), total: itens.length,
    nota: "com 10 elegíveis depois das exclusões (≤ 12), o procedimento da D põe todos: só um par novo entra (o único elegível que a D não tinha escolhido e que nenhuma semeada toca), e a F fica com 10 controles, não 12" },
  remedida: { arquivo: "tela-f/remedida-d/semeada.log", resultado: "os 10 pares conformes na página semeada (código da D)" },
  itens,
};
writeFileSync(join(AQUI, "conformes.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${ELEGIVEIS.length} elegíveis da D − ${Object.keys(EXCLUIDOS).length} excluídos = ${restantes.length} → ${itens.length} controles (${sorteio ? "sorteio" : "todos"}); saem ${saida.substituicao.saem.join(", ")}; entram ${saida.substituicao.entram.join(", ")}`);
