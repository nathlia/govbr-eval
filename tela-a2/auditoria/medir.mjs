/**
 * Medida por estado (S0/S1/S2 de ../ancoras-neutras.json), cada um de carga nova pelo setup declarado.
 * Grava em medidas/<estado>/:
 *   pagina.json      título, lang, meta, títulos, accesskeys, ids repetidos, imagens, links, botões,
 *                    campos e rótulos, fieldsets/legend, regiões vivas, marcação apresentacional, rolagem
 *   instancias.json  cada instância da lista neutra: presença, visibilidade, caixa, atributos, nó AX (CDP,
 *                    DOM.getDocument pierce), estilos computados da raiz, ::before/::after e dos descendentes
 *   contraste.json   todo texto visível: cor, fundo efetivo (composição alfa pelos ancestrais), tamanho,
 *                    peso, razão WCAG; placeholder pelo ::placeholder
 *   tab.json         ordem de Tab real (carga nova à parte), indicador de foco de cada parada e o mesmo
 *                    elemento sem foco
 *   ax.json          árvore AX completa (papel, nome, propriedades) — CDP Accessibility.getFullAXTree
 * Uso: node tela-a2/auditoria/medir.mjs [S0 S1 S2]
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { abrirNavegador, irPara, ESTADOS, ANCORAS, MEDIDAS, ehExterno } from "./comum.mjs";
import { UTIL } from "./util-navegador.mjs";

const pedidosEstados = process.argv.slice(2).filter(a => /^S\d$/.test(a));
const alvo = pedidosEstados.length ? ESTADOS.filter(e => pedidosEstados.includes(e.id)) : ESTADOS;

const MEDIR_PAGINA = () => {
  const u = window.__u;
  const todos = [...document.querySelectorAll("*")];
  const ids = {}; for (const e of todos) if (e.id) ids[e.id] = (ids[e.id] || 0) + 1;
  const ak = {}; for (const e of document.querySelectorAll("[accesskey]")) (ak[e.getAttribute("accesskey")] = ak[e.getAttribute("accesskey")] || []).push(u.desc(e));
  const rot = el => el.labels ? [...el.labels].map(l => ({ texto: l.textContent.trim(), visivel: u.visivel(l) })) : [];
  const comTexto = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const FOC = "a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]";
  return {
    focoNaChegada: document.activeElement === document.body ? "body" : u.caminho(document.activeElement),
    url: location.href, path: location.pathname, titulo: document.title, lang: document.documentElement.getAttribute("lang"),
    doctype: document.doctype ? document.doctype.name : null,
    meta: [...document.querySelectorAll("meta")].map(m => u.attrs(m)),
    titulos: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]")].map(h => ({ nivel: h.tagName, texto: h.textContent.trim(), visivel: u.visivel(h), tabindex: h.getAttribute("tabindex"), seletor: u.caminho(h), estilo: { fontSize: getComputedStyle(h).fontSize, fontWeight: getComputedStyle(h).fontWeight } })),
    textosComoTitulo: [...document.querySelectorAll("p,div,span")].filter(e => comTexto(e) && u.visivel(e) && (Number(getComputedStyle(e).fontWeight) >= 600 || parseFloat(getComputedStyle(e).fontSize) >= 20) && e.textContent.trim().length < 80).map(e => ({ seletor: u.caminho(e), texto: e.textContent.trim(), fontSize: getComputedStyle(e).fontSize, fontWeight: getComputedStyle(e).fontWeight })),
    idsRepetidos: Object.entries(ids).filter(([, n]) => n > 1),
    accesskeys: ak,
    imagens: [...document.images].map(i => ({ src: i.getAttribute("src"), alt: i.getAttribute("alt"), visivel: u.visivel(i), caixa: u.caixa(i) })),
    links: [...document.querySelectorAll("a")].map(a => ({ texto: a.textContent.replace(/\s+/g, " ").trim(), href: a.getAttribute("href"), target: a.getAttribute("target"), title: a.getAttribute("title"), visivel: u.visivel(a), seletor: u.caminho(a) })),
    botoes: [...document.querySelectorAll("button,[role=button],input[type=submit],input[type=button]")].map(b => ({ tag: b.tagName.toLowerCase(), texto: b.textContent.replace(/\s+/g, " ").trim(), ariaLabel: b.getAttribute("aria-label"), labelledby: b.getAttribute("aria-labelledby"), title: b.getAttribute("title"), type: b.getAttribute("type"), disabled: b.disabled ?? null, tabindex: b.getAttribute("tabindex"), ariaHidden: b.getAttribute("aria-hidden") || (b.closest("[aria-hidden=true]") ? "herdado" : null), visivel: u.visivel(b), caixa: u.caixa(b), seletor: u.caminho(b) })),
    campos: [...document.querySelectorAll("input,select,textarea")].map(c => ({ tag: c.tagName.toLowerCase(), type: c.type, id: c.id, name: c.name, required: c.required, ariaRequired: c.getAttribute("aria-required"), ariaInvalid: c.getAttribute("aria-invalid"), describedby: c.getAttribute("aria-describedby"), placeholder: c.getAttribute("placeholder"), role: c.getAttribute("role"), ariaChecked: c.getAttribute("aria-checked"), checked: c.checked ?? null, indeterminate: c.indeterminate ?? null, rotulos: rot(c), visivel: u.visivel(c), caixa: u.caixa(c), estilo: { opacity: getComputedStyle(c).opacity, position: getComputedStyle(c).position }, seletor: u.caminho(c) })),
    fieldsets: [...document.querySelectorAll("fieldset")].map(f => ({ seletor: u.caminho(f), legend: f.querySelector(":scope > legend")?.textContent.trim() ?? null, ariaLabel: f.getAttribute("aria-label"), labelledby: f.getAttribute("aria-labelledby"), visivel: u.visivel(f) })),
    forms: [...document.querySelectorAll("form")].map(f => ({ seletor: u.caminho(f), novalidate: f.noValidate, action: f.getAttribute("action") })),
    regioesVivas: [...document.querySelectorAll("[aria-live],[role=alert],[role=status],[role=log]")].map(e => ({ seletor: u.caminho(e), role: e.getAttribute("role"), ariaLive: e.getAttribute("aria-live"), texto: e.textContent.replace(/\s+/g, " ").trim().slice(0, 200), visivel: u.visivel(e) })),
    apresentacional: [...document.querySelectorAll("font,center,[align],[bgcolor],b,u,marquee,blink")].map(e => ({ seletor: u.caminho(e), tag: e.tagName.toLowerCase(), attrs: u.attrs(e) })),
    tabindexPositivo: [...document.querySelectorAll("[tabindex]")].filter(e => Number(e.getAttribute("tabindex")) > 0).map(e => u.caminho(e)),
    tabindexNaoInterativo: [...document.querySelectorAll("[tabindex]")].filter(e => Number(e.getAttribute("tabindex")) >= 0 && !e.matches("a[href],button,input,select,textarea,[role=button],[role=tab],[role=option],[role=menuitem],[role=checkbox],[role=switch],[role=link]")).map(e => ({ seletor: u.caminho(e), tag: e.tagName.toLowerCase(), role: e.getAttribute("role"), tabindex: e.getAttribute("tabindex"), texto: e.textContent.trim().slice(0, 80) })),
    focaveisOcultos: [...document.querySelectorAll(FOC)].filter(e => e.tabIndex >= 0 && !u.visivel(e)).map(e => ({ seletor: u.caminho(e), tag: e.tagName.toLowerCase(), dentroAriaHidden: !!e.closest("[aria-hidden=true]"), painelInativo: !!e.closest(".tab-panel:not(.active)") })),
    ariaHiddenFocavel: [...document.querySelectorAll("[aria-hidden=true]")].flatMap(h => [h, ...h.querySelectorAll("*")]).filter(e => e.matches(FOC) && e.tabIndex >= 0).map(e => ({ seletor: u.caminho(e), tag: e.tagName.toLowerCase(), tabIndex: e.tabIndex, visivel: u.visivel(e) })),
    rolagem: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight },
    fontesCarregadas: [...document.fonts].filter(f => f.status === "loaded").map(f => f.family + " " + f.weight),
    familiasUsadas: [...new Set(todos.filter(e => u.visivel(e) && comTexto(e)).map(e => getComputedStyle(e).fontFamily))],
    tamanhosUsados: [...new Set(todos.filter(e => u.visivel(e) && comTexto(e)).map(e => getComputedStyle(e).fontSize))],
    coresUsadas: [...new Set(todos.filter(e => u.visivel(e)).flatMap(e => { const c = getComputedStyle(e); return [c.color, c.backgroundColor, c.borderTopColor].filter(x => x && x !== "rgba(0, 0, 0, 0)"); }))],
    scripts: [...document.scripts].map(s => ({ src: s.getAttribute("src"), type: s.getAttribute("type") })),
    noscript: document.querySelectorAll("noscript").length,
  };
};

const MEDIR_INSTANCIAS = (insts) => {
  const u = window.__u;
  return insts.map(inst => {
    const els = [...document.querySelectorAll(inst.seletor)];
    if (!els.length) return { ...inst, presente: false, n: 0 };
    const el = els[0];
    const desc = [...el.querySelectorAll("*")].slice(0, 60).map(d => ({ el: u.desc(d), caminho: u.caminho(d), texto: [...d.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").replace(/\s+/g, " ").trim().slice(0, 120), attrs: u.attrs(d), visivel: u.visivel(d), caixa: u.caixa(d), estilo: u.estilo(d), antes: u.estilo(d, "::before").display !== "none" ? u.estilo(d, "::before") : null }));
    return { ...inst, presente: true, n: els.length, visivel: u.visivel(el), caixa: u.caixa(el), tag: el.tagName.toLowerCase(), attrs: u.attrs(el), texto: el.textContent.replace(/\s+/g, " ").trim().slice(0, 300), outerHTML: el.outerHTML.replace(/\s+/g, " ").slice(0, 1500), estilo: u.estilo(el), antes: u.estilo(el, "::before"), depois: u.estilo(el, "::after"), descendentes: desc };
  });
};

const MEDIR_CONTRASTE = () => {
  const u = window.__u; const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const texto = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").replace(/\s+/g, " ").trim();
    if (!texto || !u.visivel(el)) continue;
    const cs = getComputedStyle(el); let c = u.rgba(cs.color); const f = u.fundo(el);
    let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    c = u.sobre({ ...c, a: c.a * op }, f.cor);
    const px = parseFloat(cs.fontSize), peso = Number(cs.fontWeight) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    out.push({ seletor: u.caminho(el), texto: texto.slice(0, 80), cor: cs.color, opacidade: op, fundo: `rgb(${Math.round(f.cor.r)}, ${Math.round(f.cor.g)}, ${Math.round(f.cor.b)})`, imagemFundo: f.imagem, fontSize: cs.fontSize, fontWeight: cs.fontWeight, grande, razao: Math.round(u.razao(c, f.cor) * 100) / 100, minimo: grande ? 3 : 4.5 });
  }
  for (const el of document.querySelectorAll("input[placeholder]")) {
    if (!u.visivel(el)) continue;
    const cs = getComputedStyle(el, "::placeholder"); const c = u.rgba(cs.color); const f = u.fundo(el);
    out.push({ seletor: u.caminho(el) + "::placeholder", texto: el.placeholder, cor: cs.color, opacidade: 1, fundo: `rgb(${Math.round(f.cor.r)}, ${Math.round(f.cor.g)}, ${Math.round(f.cor.b)})`, fontSize: cs.fontSize, fontWeight: cs.fontWeight, grande: false, razao: Math.round(u.razao(u.sobre(c, f.cor), f.cor) * 100) / 100, minimo: 4.5 });
  }
  return out;
};

async function arvoreAx(contexto, pagina) {
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes.filter(n => !n.ignored).map(n => ({ id: n.nodeId, pai: n.parentId, papel: n.role?.value, nome: n.name?.value ?? "", fonteNome: n.name?.sources?.find(s => s.value)?.type ?? null, descricao: n.description?.value ?? null, backend: n.backendDOMNodeId,
    props: Object.fromEntries((n.properties || []).map(p => [p.name, p.value?.value])) }));
}

async function axDasInstancias(contexto, pagina, insts) {
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("Accessibility.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const out = {};
  for (const inst of insts) {
    try {
      const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: inst.seletor });
      out[inst.seletor] = [];
      for (const nodeId of nodeIds.slice(0, 3)) {
        const { node } = await cdp.send("DOM.describeNode", { nodeId });
        const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false });
        const n = nodes[0];
        out[inst.seletor].push(n ? { ignorado: !!n.ignored, motivoIgnorado: (n.ignoredReasons || []).map(r => r.name), papel: n.role?.value, nome: n.name?.value ?? "", fonteNome: n.name?.sources?.find(s => s.value)?.type ?? null, descricao: n.description?.value ?? null, props: Object.fromEntries((n.properties || []).map(p => [p.name, p.value?.value])) } : null);
      }
    } catch (e) { out[inst.seletor] = { erro: String(e.message) }; }
  }
  await cdp.detach();
  return out;
}

const FOCO_ESTILO = () => {
  const el = document.activeElement; const u = window.__u;
  if (!el || el === document.body) return { el: "body" };
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return { el: u.desc(el), caminho: u.caminho(el), papel: el.getAttribute("role"), texto: el.textContent.replace(/\s+/g, " ").trim().slice(0, 60), ariaLabel: el.getAttribute("aria-label"), visivel: u.visivel(el), caixa: u.caixa(el),
    emViewport: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
    focoVisibleClasse: el.classList.contains("focus-visible"), matchesFocusVisible: el.matches(":focus-visible"),
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`, boxShadow: cs.boxShadow, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, fundo: cs.backgroundColor, cor: cs.color, textDecoration: cs.textDecorationLine,
    inativoEmPainel: !!el.closest(".tab-panel:not(.active)"), dentroAriaHidden: !!el.closest("[aria-hidden=true]") };
};

/** Diferença de pixels entre dois PNG (base64), calculada num canvas de uma página auxiliar em branco. */
async function diffPng(aux, a, b) {
  return aux.evaluate(async ([a, b]) => {
    const carrega = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = "data:image/png;base64," + src; });
    const [ia, ib] = await Promise.all([carrega(a), carrega(b)]);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const px = img => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib); let n = 0, max = 0;
    for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); if (d > 30) n++; if (d > max) max = d; }
    return { pixelsDiferentes: n, total: w * h, maxDiff: max };
  }, [a, b]);
}

async function ordemTab(pagina, aux) {
  // ponto de partida da navegação sequencial = início do <body>: um marcador temporário (tabindex -1) é
  // inserido como primeiro filho, recebe foco e é removido — o Chrome mantém o ponto de partida ali.
  await pagina.mouse.move(1279, 899);
  await pagina.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); window.scrollTo(0, 0); });
  const paradas = [];
  for (let i = 0; i < 80; i++) {
    await pagina.keyboard.press("Tab");
    await pagina.waitForTimeout(150);
    const f = await pagina.evaluate(FOCO_ESTILO);
    if (paradas.length && f.caminho && f.caminho === paradas[0].caminho) { paradas.push({ ...f, ciclo: true }); break; }
    if (f.el === "body") { paradas.push(f); if (i > 2) break; continue; }
    // recorte: a caixa do elemento (ou do pai, se o controle nativo está oculto) com 8 px de margem
    const clip = await pagina.evaluate(() => { let el = document.activeElement; const u = window.__u; if (!u.visivel(el) && el.parentElement) el = el.parentElement;
      const r = el.getBoundingClientRect(); const x = Math.max(0, r.x - 8), y = Math.max(0, r.y - 8); return { x, y, width: Math.max(1, Math.min(innerWidth - x, r.width + 16)), height: Math.max(1, Math.min(innerHeight - y, r.height + 16)) }; });
    let comFoco = null, semFocoImg = null, semFoco = null;
    if (f.emViewport && clip.width > 1 && clip.height > 1) {
      comFoco = (await pagina.screenshot({ clip })).toString("base64");
      semFoco = await pagina.evaluate(() => { const el = document.activeElement; window.__ultimo = el; el.blur(); const cs = getComputedStyle(el);
        return { outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`, boxShadow: cs.boxShadow, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, fundo: cs.backgroundColor, cor: cs.color }; });
      await pagina.waitForTimeout(150);
      semFocoImg = (await pagina.screenshot({ clip })).toString("base64");
      await pagina.evaluate(() => window.__ultimo.focus());
      await pagina.waitForTimeout(100);
    }
    const p = { ...f, recorte: clip, semFoco };
    if (comFoco) { p.diferencaVisual = await diffPng(aux, comFoco, semFocoImg); p.indicadorFoco = p.diferencaVisual.pixelsDiferentes > 0; }
    else p.indicadorFoco = null;
    paradas.push(p);
  }
  return paradas;
}

const navegador = await abrirNavegador();
try {
  for (const est of alvo) {
    const dir = join(MEDIDAS, est.id); mkdirSync(dir, { recursive: true });
    const insts = ANCORAS.instancias.map(i => ({ componente: i.componente, seletor: i.seletor, dentroDe: i.dentroDe, declarado: i.estados[est.id] }));
    // carga A: página, instâncias, contraste, AX (mouse num canto vazio)
    let np = await irPara(navegador, est);
    await np.pagina.evaluate(UTIL);
    await np.pagina.mouse.move(1279, 899);
    await np.pagina.waitForTimeout(400);
    const pagina = await np.pagina.evaluate(MEDIR_PAGINA);
    const instancias = await np.pagina.evaluate(MEDIR_INSTANCIAS, insts);
    const axInst = await axDasInstancias(np.contexto, np.pagina, insts);
    for (const i of instancias) i.ax = axInst[i.seletor];
    const contraste = await np.pagina.evaluate(MEDIR_CONTRASTE);
    const ax = await arvoreAx(np.contexto, np.pagina);
    const tA = Date.now() - np.t0;
    const meta = { estado: est.id, nota: est.note, afterStep: est.afterStep, path: pagina.path, medidoEm: new Date().toISOString(), ms_desde_carga: tA, navegacoes: np.navegacoes.length, externos: np.pedidos.filter(p => ehExterno(p.url)).map(p => p.url), escritas: np.pedidos.filter(p => p.metodo !== "GET").map(p => p.metodo + " " + p.url), errosDePagina: np.erros };
    await np.contexto.close();
    // carga B: ordem de Tab
    np = await irPara(navegador, est);
    await np.pagina.evaluate(UTIL);
    const aux = await np.contexto.newPage();
    const tab = await ordemTab(np.pagina, aux);
    const tB = Date.now() - np.t0;
    await np.contexto.close();
    if (tA > 120000 || tB > 120000) console.warn(`AVISO ${est.id}: medida passou de 120 s (A ${tA} ms, B ${tB} ms)`);
    const grava = (nome, obj) => writeFileSync(join(dir, nome), JSON.stringify({ _meta: { ...meta, ms_desde_carga_tab: tB }, dados: obj }, null, 1) + "\n");
    grava("pagina.json", pagina); grava("instancias.json", instancias); grava("contraste.json", contraste); grava("tab.json", tab); grava("ax.json", ax);
    const pres = instancias.filter(i => i.presente), vis = pres.filter(i => i.visivel);
    console.log(`${est.id}: instâncias presentes ${pres.length}/${instancias.length}, visíveis ${vis.length} (lista neutra: ${ANCORAS.contagem[est.id].presentes}/${ANCORAS.contagem[est.id].visiveis}) · textos ${contraste.length} (abaixo do mínimo ${contraste.filter(c => c.razao < c.minimo).length}) · Tab ${tab.length} paradas · AX ${ax.length} nós · ${tA}/${tB} ms`);
  }
} finally { await navegador.close(); }
