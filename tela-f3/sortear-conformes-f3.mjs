/**
 * Controles conformes da tela F3: o procedimento da D (tela-d/sortear-conformes.mjs — os mesmos pares elegíveis
 * `ELEGIVEIS`, a mesma regra de camadas, o mesmo PRNG e o mesmo teto de 12), com a mesma mudança declarada da F e da F2
 * (tela-f3/sortear-conformes-f3.mjs): a exclusão que a D já tinha ("fora pares cujo elemento é âncora de uma unidade")
 * vale também para as specs semeadas. Elemento participante de spec semeada = a âncora dela ou o hospedeiro em que a
 * mudança semeada está escrita. Pares excluídos na F3:
 *   - breadcrumb-tab, breadcrumb-li, breadcrumb-orientacao (br-breadcrumb e os itens dele): o último li é âncora da
 *     F3-07, e o br-breadcrumb é hospedeiro da mudança M-07 (os itens que ele recebe); além disso, o link a mais no último
 *     item muda a contagem do seletor `br-breadcrumb >>> a` (1 → 2);
 *   - abas-teclado (os 3 botões das abas): âncora da F3-08; o br-tab é hospedeiro da M-08 e o li da F3-11 é o mesmo item.
 *   - item-superficie (itens da lista do "Exibir"): a medida da D prova a escolha lendo o valor do campo do seletor, que é a
 *     âncora da F3-09; a M-09 congela esse valor em 10, e a medida falha no semeado (achado da re-medida, 27/11, antes
 *     de qualquer execução de agente).
 * Voltam, em relação à F2, os pares que só a F2 tocava: titulo-contraste (h2), divisor e botoes-rotulo ("Exportar" e
 * "Voltar"). Ficam os rádios e o padding dos itens da lista do "Exibir" (dentro do br-select-pnip em que a M-09 escreve, mas não são
 * o hospedeiro nem a âncora da F3-09, o campo; a mesma leitura da F2, que manteve os itens com a F2-09 na lista) e o
 * th-contraste (a M-04 escreve nas células td, não no th).
 * Semente nova, gravada antes de rodar; com ≤ 12 elegíveis o procedimento da D não sorteia (entram todos).
 * Re-medida: os pares que ficam foram re-medidos nos dois builds pelo código da D (tela-f3/remedida-d/).
 * Uso: node tela-f3/sortear-conformes-f3.mjs → tela-f3/conformes.json
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ELEGIVEIS, TETO } from "../tela-d/sortear-conformes.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SEMENTE = "tela-f3/conformes 2026-11-27 (gravada antes do sorteio)";
const TIPOS = ["breadcrumb", "tab", "button", "table", "divider", "radio", "item", "estrutura"]; // os da D
const EXCLUIDOS = {
  "breadcrumb-tab": "hospedeiro da mudança semeada M-07 (br-breadcrumb; o seletor `br-breadcrumb >>> a` passa de 1 para 2 elementos no build semeado)",
  "breadcrumb-li": "elemento âncora da F3-07 (o último li do breadcrumb é um dos dois itens do par)",
  "breadcrumb-orientacao": "hospedeiro da mudança semeada M-07 (br-breadcrumb)",
  "abas-teclado": "elementos âncora da F3-08 (botões das abas; br-tab é hospedeiro da M-08, e o item da F3-11 é um deles)",
  "item-superficie": "a medida do par (clique perto da borda do item \"25\" da lista do \"Exibir\" e leitura do valor do campo) lê o campo que é âncora da F3-09: com a M-09 o campo mostra 10 depois da escolha, e a medida da D dá FALHA no build semeado (tela-f3/remedida-d/semeada-d14.log); a mudança semeada contamina a medida do controle",
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
  tela: "processos-f3 (tela F3)",
  regra: "procedimento da D (tela-d/sortear-conformes.mjs), com as âncoras e os hospedeiros das mudanças das specs semeadas somados à exclusão que a D já fazia (elemento âncora de unidade); ver cabeçalho de tela-f3/sortear-conformes-f3.mjs",
  semente: SEMENTE, prng: D.prng, teto: TETO,
  elegiveisDaD: ELEGIVEIS.map(e => e.par), excluidos: EXCLUIDOS, elegiveis: restantes.map(e => e.par), camada1_um_por_tipo: camada1, sorteio,
  substituicao: { saem: D.itens.filter(k => EXCLUIDOS[k.par]).map(k => k.id + " " + k.par), entram: itens.filter(k => !k.deD).map(k => k.par), total: itens.length,
    nota: `com ${restantes.length} elegíveis depois das exclusões (≤ 12), o procedimento da D põe todos; a F3 fica com ${itens.length} controles, não 12` },
  remedida: { arquivo: "tela-f3/remedida-d/semeada-d14.log e sem-semente-d14.log", resultado: `os ${itens.length} pares re-medidos nos dois builds pelo código da D; ver tela-f3/conferencia-construcao.json › paresDaD` },
  itens,
};
writeFileSync(join(AQUI, "conformes.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${ELEGIVEIS.length} elegíveis da D − ${Object.keys(EXCLUIDOS).length} excluídos = ${restantes.length} → ${itens.length} controles (${sorteio ? "sorteio" : "todos"}); saem ${saida.substituicao.saem.join(", ")}; entram ${saida.substituicao.entram.join(", ") || "nenhum"}`);
