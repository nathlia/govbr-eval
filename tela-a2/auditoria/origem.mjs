/**
 * Proveniência de cada atributo/elemento do DOM medido, por ablação da página servida (sem ler fontes):
 *   A = só HTML servido (JavaScript desligado)
 *   B = HTML + core.min.js do DS (o pedido de /acompanhamento/comportamento.js é abortado)
 *   C = página inteira (como servida)
 * Para cada estado alcançável sem script autoral só se mede S0 (os passos do setup dependem do
 * comportamento da página). Atributo presente em C e ausente em B → posto pelo script autoral;
 * presente em B e ausente em A → posto pelo core do DS sozinho; presente em A → marcação servida.
 * Medido: B = A (o core sozinho não altera o DOM; os componentes só são instanciados pelo script da
 * página), então "script" = core do DS instanciado pela página OU script autoral — inseparáveis aqui.
 * Uso: node tela-a2/auditoria/origem.mjs → medidas/origem.json
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";
import { URL_ENTRADA, VIEWPORT, MEDIDAS, ANCORAS } from "./comum.mjs";
import { UTIL } from "./util-navegador.mjs";

const COLETAR = () => {
  const u = window.__u; const o = {};
  for (const el of document.querySelectorAll("body *")) {
    const k = u.caminho(el);
    o[k] = Object.fromEntries([...el.attributes].filter(a => a.name !== "style" && a.name !== "data-focus-visible-added").map(a => [a.name, a.value]));
  }
  return o;
};

async function variante(navegador, { js, bloquear }) {
  const contexto = await navegador.newContext({ viewport: VIEWPORT, javaScriptEnabled: js });
  const pagina = await contexto.newPage();
  if (bloquear) await pagina.route(u => u.pathname.endsWith(bloquear), r => r.abort());
  await pagina.goto(URL_ENTRADA, { waitUntil: "load" });
  await pagina.waitForTimeout(800);
  let dom;
  if (js) { await pagina.evaluate(UTIL); dom = await pagina.evaluate(COLETAR); }
  else {
    // sem JS na página: mede o DOM num contexto com JS, a partir do HTML servido como texto
    const html = await pagina.content();
    const c2 = await navegador.newContext({ viewport: VIEWPORT });
    const p2 = await c2.newPage();
    await p2.route("**/*.js", r => r.abort());
    await p2.goto(URL_ENTRADA, { waitUntil: "load" });
    await p2.evaluate(UTIL); dom = await p2.evaluate(COLETAR);
    await c2.close();
    void html;
  }
  await contexto.close();
  return dom;
}

const navegador = await chromium.launch({ headless: true });
const A = await variante(navegador, { js: false });
const B = await variante(navegador, { js: true, bloquear: "/comportamento.js" });
const C = await variante(navegador, { js: true });
await navegador.close();

const proveniencia = {};
for (const [k, attrsC] of Object.entries(C)) {
  const a = A[k] || null, b = B[k] || null;
  const el = { elemento: !a ? (!b ? "script" : "core-DS-sozinho") : "marcacao", atributos: {} };
  for (const [n, v] of Object.entries(attrsC)) {
    if (a && a[n] === v) el.atributos[n] = "marcacao";
    else if (b && b[n] === v) el.atributos[n] = a && n in a ? "core-DS-sozinho (alterado)" : "core-DS-sozinho";
    else el.atributos[n] = (b && n in b) || (a && n in a) ? "script (alterado)" : "script";
  }
  for (const n of Object.keys(b || {})) if (!(n in attrsC)) el.atributos[n] = "removido por script";
  if (Object.values(el.atributos).some(x => x !== "marcacao") || el.elemento !== "marcacao") proveniencia[k] = el;
}
const removidosDoDOM = Object.keys(B).filter(k => !(k in C));
const saida = { medida: "proveniência por ablação (A: HTML servido sem JS; B: + core.min.js; C: página inteira), estado S0", entrada: ANCORAS.entrada,
  contagem: { A: Object.keys(A).length, B: Object.keys(B).length, C: Object.keys(C).length }, naoMarcacao: proveniencia, removidosDoDOM };
writeFileSync(join(MEDIDAS, "origem.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(`elementos A ${saida.contagem.A} · B ${saida.contagem.B} · C ${saida.contagem.C} · com algo não-marcação ${Object.keys(proveniencia).length} · removidos ${removidosDoDOM.length}`);
