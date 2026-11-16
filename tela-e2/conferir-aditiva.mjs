/**
 * Tela E2 — conferência pelo caminho ADITIVO da referência (S0 → S1 → S2, sem recarga), depois da correção F-02.
 * conferir-construcao.mjs e a re-medida do auditor partem da carga em cada estado; aqui as paradas são as do `setup`
 * da referência, em sequência, e em cada uma se medem: a instrução geral do formulário (F-02, item 9a) e os
 * observáveis das 9 sorteadas (8 da principal + U-09, esta só a 640×450 ao fim). Sem oráculo, sem axe.
 * Uso: node tela-e2/conferir-aditiva.mjs [porta=3219] → conferencia-aditiva-2026-11-16.json  (dist servido por servir.mjs)
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = `http://127.0.0.1:${process.argv[2] ?? 3219}`;
const TERMOS = ["persistidos", "banco", "commit", "transação", "renderizada", "cache", "endpoint"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
page.on("pageerror", e => erros.push(String(e)));
await page.goto(`${BASE}/cadastro-pais.html`);
await page.waitForSelector("#main-content");

const medir = () => page.evaluate(TERMOS => {
  const r = s => document.querySelector(s)?.getBoundingClientRect();
  const visivel = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const instr = document.querySelector("#form-pais .apoio-formulario");
  const primeiroCampo = document.querySelector("#form-pais .campo");
  const legend = document.querySelector("#rad-situacao legend");
  const rg = document.createRange(); rg.selectNodeContents(legend);
  const corpo = document.querySelector("#msg-orientacao .message-body")?.textContent.toLowerCase() ?? "";
  const erro = document.querySelector("#msg-erro");
  return {
    instrucao: { texto: instr?.textContent.trim() ?? null, visivel: visivel(instr), antesDoPrimeiroCampo: !!instr && !!primeiroCampo && (instr.compareDocumentPosition(primeiroCampo) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 },
    "U-01": { limparX: r("#btn-limpar").x, salvarDireita: r("#btn-salvar").right },
    "U-02": { termosTecnicos: TERMOS.filter(t => corpo.includes(t)).length },
    "U-03": { iconesFilhos: document.querySelectorAll("#btn-ajuda i, #btn-ajuda svg, #btn-ajuda img").length },
    "U-04": { fontes: ["#inp-codigo label", "#codigo-pais", "#codigo-pais-apoio"].map(s => getComputedStyle(document.querySelector(s)).fontFamily) },
    "U-05": { esquerdaTexto: rg.getBoundingClientRect().x, esquerdaOpcao: r("#rad-situacao .br-radio")?.x ?? null },
    "U-06": { visivel: visivel(erro), fundo: getComputedStyle(erro).backgroundColor, faCheckVisivel: visivel(erro.querySelector(".fa-check")) },
    "U-07": { cores: [...document.querySelectorAll("#sel-continente .br-list .br-item label")].filter(visivel).map(l => getComputedStyle(l).color) },
    "U-08": { readonly: document.querySelector("#nome-pais").hasAttribute("readonly") },
  };
}, TERMOS);

const estados = {};
estados.S0 = await medir();
await page.click("#btn-salvar"); await page.waitForSelector("#msg-erro:not([hidden])");
estados.S1 = await medir();
await page.click("#sel-continente [data-trigger]"); await page.waitForSelector("#sel-continente .br-list[expanded]");
estados.S2 = await medir();
// U-09 (só variante comU09): a mesma página, já em S2, a 640×450 — a medida substituta da construção
await page.setViewportSize({ width: 640, height: 450 });
await page.waitForTimeout(300);
const u09 = await page.$$eval("#lst-paises .item-pais", els => els.map(e => ({ scrollH: e.scrollHeight, clientH: e.clientHeight, overflowY: getComputedStyle(e).overflowY })));
await browser.close();

const ok = {}, falhas = [];
const conferir = (nome, cond) => { ok[nome] = !!cond; if (!cond) falhas.push(nome); };
for (const [e, m] of Object.entries(estados)) {
  conferir(`${e} instrução visível antes do 1º campo`, m.instrucao.visivel && m.instrucao.antesDoPrimeiroCampo);
  conferir(`${e} U-01 secundário à direita do primário`, m["U-01"].limparX > m["U-01"].salvarDireita);
  conferir(`${e} U-02 ≥ 3 termos técnicos`, m["U-02"].termosTecnicos >= 3);
  conferir(`${e} U-03 0 ícone`, m["U-03"].iconesFilhos === 0);
  conferir(`${e} U-04 sem Rawline`, m["U-04"].fontes.every(f => !/rawline/i.test(f)));
  conferir(`${e} U-05 texto > 20 px à direita da 1ª opção`, m["U-05"].esquerdaOpcao !== null && m["U-05"].esquerdaTexto - m["U-05"].esquerdaOpcao > 20);
  conferir(`${e} U-08 readonly`, m["U-08"].readonly);
}
for (const e of ["S1", "S2"]) conferir(`${e} U-06 fundo #2670e8 e fa-check visível`, estados[e]["U-06"].visivel && estados[e]["U-06"].fundo === "rgb(38, 112, 232)" && estados[e]["U-06"].faCheckVisivel);
conferir("S2 U-07 6 opções em #aaa", estados.S2["U-07"].cores.length === 6 && estados.S2["U-07"].cores.every(c => c === "rgb(170, 170, 170)"));
conferir("S2 a 640×450 U-09 altura fixa com overflow hidden nos 4 itens", u09.length === 4 && u09.every(i => i.overflowY === "hidden"));
conferir("sem erro de página", erros.length === 0);

const out = { _meta: { data: "2026-11-16", base: BASE, caminho: "S0 → clicar #btn-salvar, esperar #msg-erro visível (S1) → clicar o gatilho do select, esperar a lista aberta (S2), sem recarga" }, resumo: `${Object.values(ok).filter(Boolean).length}/${Object.keys(ok).length}`, falhas, ok, estados, u09_640x450: u09, erros };
writeFileSync(join(AQUI, "conferencia-aditiva-2026-11-16.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`caminho aditivo S0 → S1 → S2: ${out.resumo}` + (falhas.length ? ` — falhas: ${falhas.join("; ")}` : ""));
process.exit(falhas.length ? 1 : 0);
