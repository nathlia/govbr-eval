// Sondas complementares (carga limpa cada): pixels do btn-ajuda em repouso, readonly do nome, clique em opção no S2,
// hover em item da lista do select, próximo Tab após escolha por teclado, proveniência (seletor vencedor) de valores contestados.
import { abrirNavegador, irPara, ESTADOS, gravar, tabAte, MEDIDAS } from "./comum.mjs";
import { mkdirSync } from "fs";
mkdirSync(MEDIDAS + "/interacoes", { recursive: true });
const E = Object.fromEntries(ESTADOS.map(e => [e.id, e]));
const nav = await abrirNavegador();
const out = {};
async function origem(p, sel, props, pseudo) {
  const c = await p.context().newCDPSession(p); await c.send("DOM.enable"); await c.send("CSS.enable");
  const { root } = await c.send("DOM.getDocument", { depth: -1 }); const { nodeId } = await c.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  const r = await c.send("CSS.getMatchedStylesForNode", { nodeId }); const res = {};
  const regras = pseudo ? (r.pseudoElements || []).filter(x => x.pseudoType === pseudo).flatMap(x => x.matches) : r.matchedCSSRules;
  for (const prop of props) { const cands = []; for (const m of regras || []) for (const d of m.rule.style.cssProperties) if (d.name === prop && !d.disabled && d.parsedOk !== false) cands.push({ seletor: m.rule.selectorList.text, valor: d.value, imp: !!d.important }); res[prop] = cands.slice(-3); }
  await c.detach(); return res;
}
async function pix(p, sel) {
  const r = await p.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }, sel);
  const png = await p.screenshot({ clip: r });
  return await p.evaluate(async b64 => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 700) n++; return { w: c.width, h: c.height, pixelsNaoBrancos: n }; }, png.toString("base64"));
}
{ // btn-ajuda em repouso (sem foco, sem hover)
  const np = await irPara(nav, E.S0); const p = np.pagina; await p.mouse.move(1270, 890);
  out.ajudaRepouso = { botao: await pix(p, "#btn-ajuda"), referenciaFechar: await pix(p, "#msg-orientacao .close button"), fundoBotao: await p.evaluate(() => { const cs = getComputedStyle(document.querySelector("#btn-ajuda")); return { bg: cs.backgroundColor, bgImg: cs.backgroundImage, borda: cs.borderTopWidth, mask: cs.maskImage || cs.webkitMaskImage }; }) };
  await p.screenshot({ path: MEDIDAS + "/interacoes/ajuda-repouso.png", clip: await p.evaluate(() => { const b = document.querySelector(".titulo-cadastro").getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }) });
  out.proveniencia = {
    skiplinkTop: await origem(p, ".br-skiplink a:nth-of-type(1)", ["top", "position"]),
    codigoFonte: await origem(p, "#inp-codigo", ["font-family"]),
    codigoLabelFonte: await origem(p, "#inp-codigo label", ["font-family"]),
    limparOrder: await origem(p, "#btn-limpar", ["order"]),
    rotuloOpcaoCor: await origem(p, "#sel-continente .br-list .br-item:nth-of-type(1) label", ["color"]),
    msgErroFundo: await origem(p, "#msg-erro", ["background-color", "--background", "background"]),
    msgErroCor: await origem(p, "#msg-erro .content", ["color"]),
    marcaRetorno: await origem(p, "#msg-erro .content > i", ["display", "color", "visibility"]),
    breadcrumbAtual: await origem(p, "#brd-trilha [aria-current=page]", ["font-weight"]),
    tituloLista: await origem(p, "#lst-paises .header .title", ["font-size", "font-weight"]),
    feedbackFundo: await origem(p, "#inp-codigo", ["color"]),
  };
  await np.contexto.close();
}
{ // nome: readonly só por Tab, e em S1
  const np = await irPara(nav, E.S0); const p = np.pagina;
  const antes = await p.evaluate(() => document.querySelector("#nome-pais").readOnly);
  await tabAte(p, "#nome-pais"); await p.waitForTimeout(200);
  const aoFocar = await p.evaluate(() => document.querySelector("#nome-pais").readOnly);
  await p.keyboard.type("Uruguai"); const v = await p.evaluate(() => document.querySelector("#nome-pais").value);
  out.nomeReadonly = { antesDoFoco: antes, aposFocoPorTab: aoFocar, valorDigitado: v };
  await np.contexto.close();
  const n1 = await irPara(nav, E.S1); out.nomeReadonly.S1 = await n1.pagina.evaluate(() => document.querySelector("#nome-pais").readOnly); await n1.contexto.close();
}
{ // S2: clique (Playwright) no rótulo da opção 4; hover com diferença de pixels
  const np = await irPara(nav, E.S2); const p = np.pagina;
  const sel = "#sel-continente .br-list .br-item:nth-of-type(4)"; await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), sel); await p.waitForTimeout(200);
  const r = await p.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }, sel);
  await p.mouse.move(1270, 10); await p.waitForTimeout(200); const a = await p.screenshot({ clip: r });
  await p.mouse.move(r.x + 200, r.y + r.height / 2); await p.waitForTimeout(300); const b = await p.screenshot({ clip: r });
  out.hoverItem = { pixelsMudaram: !a.equals(b), bytes: [a.length, b.length] };
  await p.click(sel + " label"); await p.waitForTimeout(400);
  out.cliqueOpcaoS2 = await p.evaluate(() => ({ valor: document.querySelector("#continente").value, aberta: window.__u.visivel(document.querySelector("#sel-continente .br-list")), foco: window.__u.desc(document.activeElement) }));
  await np.contexto.close();
}
{ // S2 por mouse.click em coordenadas (repete a sonda que falhou) — com o ponteiro já sobre o item
  const np = await irPara(nav, E.S2); const p = np.pagina;
  await p.evaluate(() => document.querySelector("#sel-continente .br-list .br-item:nth-of-type(4)").scrollIntoView({ block: "center" })); await p.waitForTimeout(200); const r = await p.evaluate(() => { const b = document.querySelector("#sel-continente .br-list .br-item:nth-of-type(4) label").getBoundingClientRect(); return { x: b.x + 60, y: b.y + b.height / 2 }; });
  await p.mouse.click(r.x, r.y); await p.waitForTimeout(400);
  out.cliqueCoordS2 = await p.evaluate(() => ({ valor: document.querySelector("#continente").value }));
  await np.contexto.close();
}
{ // próximo Tab após escolher por teclado
  const np = await irPara(nav, E.S0); const p = np.pagina;
  await tabAte(p, "#continente"); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  const f = await p.evaluate(() => window.__u.desc(document.activeElement)); await p.keyboard.press("Tab"); await p.waitForTimeout(200);
  out.tabAposEscolha = { focoAposEnter: f, proximoTab: await p.evaluate(() => window.__u.desc(document.activeElement) + " " + (document.activeElement.id || "")), valor: await p.evaluate(() => document.querySelector("#continente").value) };
  await np.contexto.close();
}
{ // foco ao exibir mensagem (carga) e tooltip/title no btn-ajuda com foco por teclado
  const np = await irPara(nav, E.S0); const p = np.pagina;
  await tabAte(p, "#btn-ajuda"); await p.waitForTimeout(600);
  out.ajudaFocoTeclado = await p.evaluate(() => ({ tooltips: [...document.querySelectorAll(".br-tooltip,[role=tooltip]")].filter(e => window.__u.visivel(e)).length, describedby: document.querySelector("#btn-ajuda").getAttribute("aria-describedby") }));
  await np.contexto.close();
}
gravar("interacoes/sondas-extra.json", out);
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
await nav.close();
