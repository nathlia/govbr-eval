/**
 * Medida estática por estado (S0, S1, S2), cada um de carga limpa: documento, instâncias (atributos, caixa,
 * estilos computados, pseudo-elementos, árvore AX via CDP), texto visível (fonte, contraste), cores computadas
 * (paleta), ordem de Tab com diferença de pixels foco × sem foco, e proveniência de estilo (seletor vencedor, CDP).
 * Saída: medidas/S{0,1,2}/{pagina,instancias,texto,cores,tab}.json
 */
import { abrirNavegador, irPara, ESTADOS, gravar, ax } from "./comum.mjs";

/** Partes medidas por instância do inventário (âncoras = ids/classes presentes no DOM servido). */
export const PARTES = {
  "btn-limpar": { raiz: "#btn-limpar" },
  "btn-ajuda": { raiz: "#btn-ajuda" },
  "btn-salvar": { raiz: "#btn-salvar" },
  "btn-cancelar": { raiz: "#btn-cancelar" },
  "inp-nome-pais": { raiz: "#inp-nome-pais", label: "#inp-nome-pais label", campo: "#nome-pais", feedback: "#inp-nome-pais .feedback" },
  "inp-codigo": { raiz: "#inp-codigo", label: "#inp-codigo label", campo: "#codigo-pais", apoio: "#codigo-pais-apoio" },
  "sel-continente": { raiz: "#sel-continente", combobox: "#sel-continente > .br-input", label: "#sel-continente label", campo: "#continente", gatilho: "#sel-continente [data-trigger]", gatilhoIcone: "#sel-continente [data-trigger] i", lista: "#sel-continente .br-list", item1: "#sel-continente .br-list .br-item:nth-of-type(1)", item1Label: "#sel-continente .br-list .br-item:nth-of-type(1) label", feedback: "#sel-continente .feedback", iconeBusca: "#sel-continente .input-icon" },
  "rad-situacao": { raiz: "#rad-situacao", legend: "#rad-situacao legend", op1: "#situacao-habilitado", op1Label: "label[for=situacao-habilitado]", op2Label: "label[for=situacao-suspenso]", op3Label: "label[for=situacao-analise]", opcoes: "#rad-situacao .opcoes-situacao", feedback: "#rad-situacao .feedback, #situacao-erro" },
  "swt-certificado": { raiz: "#swt-certificado", campo: "#certificado-automatico", label: "#swt-certificado label", dados: "#swt-certificado .switch-data", situacao: ".situacao-configuracao" },
  "lst-paises": { raiz: "#lst-paises", titulo: "#lst-paises .header .title", item1: "#lst-paises .br-item:nth-of-type(1)", principal1: "#lst-paises .br-item:nth-of-type(1) .texto-principal", secundario1: "#lst-paises .br-item:nth-of-type(1) .texto-secundario" },
  "msg-orientacao": { raiz: "#msg-orientacao", icone: "#msg-orientacao .icon i", titulo: "#msg-orientacao .message-title", corpo: "#msg-orientacao .message-body", conteudo: "#msg-orientacao .content", fechar: "#msg-orientacao .close button", fecharIcone: "#msg-orientacao .close button i" },
  "msg-erro": { raiz: "#msg-erro", icone: "#msg-erro .icon i", iconeConteudo: "#msg-erro .content > i", titulo: "#msg-erro .message-title", corpo: "#msg-erro .message-body", conteudo: "#msg-erro .content" },
  "hdr-govbr": { raiz: "#cabecalho", titulo: "#cabecalho .header-title", logo: "#cabecalho .header-logo img", divisor: "#cabecalho .br-divider" },
  "sgn-usuaria": { raiz: "#sgn-usuaria" },
  "ava-usuaria": { raiz: "#ava-usuaria", conteudo: "#ava-usuaria .content" },
  "ftr-govbr": { raiz: "#rodape", logo: "#rodape .logo img", divisor: "#rodape .br-divider", info: "#rodape .info div" },
  "skp-conteudo": { raiz: ".br-skiplink", item1: ".br-skiplink a:nth-of-type(1)", item2: ".br-skiplink a:nth-of-type(2)" },
  "brd-trilha": { raiz: "#brd-trilha", home: "#brd-trilha .crumb.home a", atual: "#brd-trilha [aria-current=page]", link2: "#brd-trilha .crumb:nth-of-type(2) a", sep: "#brd-trilha .crumb:nth-of-type(2) i.icon" },
  "div-secoes": { raiz: "#div-secoes" },
  "pagina": { h1: "h1", formTitulo: "#form-pais h2", secaoTitulo: "#titulo-configuracao", form: "#form-pais", container: "main > .container-lg", acoes: "#form-pais .acoes-formulario" },
};

/** Seletor CSS vencedor por propriedade (CDP CSS.getMatchedStylesForNode) — proveniência sem ler fontes. */
async function origemEstilo(p, sel, props) {
  const c = await p.context().newCDPSession(p);
  await c.send("DOM.enable"); await c.send("CSS.enable");
  const { root } = await c.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await c.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  if (!nodeId) { await c.detach(); return null; }
  const r = await c.send("CSS.getMatchedStylesForNode", { nodeId });
  const out = {};
  for (const prop of props) {
    let venc = null;
    for (const m of r.matchedCSSRules || []) for (const d of m.rule.style.cssProperties) if (d.name === prop && !d.disabled && d.parsedOk !== false) {
      const imp = !!d.important; if (!venc || imp || !venc.imp) venc = { seletor: m.rule.selectorList.text, valor: d.value, imp, origem: m.rule.origin };
    }
    out[prop] = venc;
  }
  await c.detach();
  return out;
}

async function medirEstado(nav, e) {
  const np = await irPara(nav, e);
  const p = np.pagina;
  const focoChegada = await p.evaluate(() => window.__u.desc(document.activeElement));

  const pagina = await p.evaluate(() => {
    const u = window.__u;
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(h => ({ tag: h.tagName, texto: h.textContent.trim(), visivel: u.visivel(h), estilo: (({ fontSize, fontWeight, color, lineHeight, marginTop, marginBottom }) => ({ fontSize, fontWeight, color, lineHeight, marginTop, marginBottom }))(getComputedStyle(h)), caixa: u.caixa(h), tabindex: h.getAttribute("tabindex") }));
    return {
      url: location.href, titulo: document.title, lang: document.documentElement.lang, headings: hs,
      regioes: { header: document.querySelectorAll("body > header, header.br-header").length, main: document.querySelectorAll("main").length, footer: document.querySelectorAll("footer").length, nav: [...document.querySelectorAll("nav")].map(n => ({ classe: n.className, ariaLabel: n.getAttribute("aria-label") })), section: [...document.querySelectorAll("section")].map(s => ({ labelledby: s.getAttribute("aria-labelledby") })) },
      noscript: [...document.querySelectorAll("noscript")].map(n => n.textContent.trim()),
      metaRefresh: document.querySelector("meta[http-equiv=refresh]")?.content ?? null,
      targetBlank: document.querySelectorAll("[target=_blank]").length,
      accesskeys: [...document.querySelectorAll("[accesskey]")].map(a => a.getAttribute("accesskey")),
      tabindexPositivo: [...document.querySelectorAll("[tabindex]")].filter(x => Number(x.getAttribute("tabindex")) > 0).map(x => u.desc(x)),
      tabindexTodos: [...document.querySelectorAll("[tabindex]")].map(x => [u.desc(x), x.getAttribute("tabindex")]),
      imagens: [...document.querySelectorAll("img")].map(i => ({ src: i.getAttribute("src"), alt: i.getAttribute("alt") })),
      primeiroLink: (() => { const a = document.querySelector("a[href]"); return a ? { texto: a.textContent.trim(), href: a.getAttribute("href") } : null; })(),
      links: [...document.querySelectorAll("a[href]")].map(a => ({ texto: a.textContent.replace(/\s+/g, " ").trim(), href: a.getAttribute("href"), title: a.getAttribute("title") })),
      ancoras: ["main-content", "rodape"].map(id => { const el = document.getElementById(id); return { id, existe: !!el, tag: el?.tagName, name: el?.getAttribute("name") ?? null }; }),
      titleAttrs: [...document.querySelectorAll("[title]")].map(x => u.desc(x)),
      lang: document.documentElement.getAttribute("lang"),
      outrosLang: [...document.querySelectorAll("body [lang]")].map(x => [u.desc(x), x.lang]),
      forms: [...document.querySelectorAll("form")].map(f => ({ id: f.id, novalidate: f.noValidate })),
      fieldsets: [...document.querySelectorAll("fieldset")].map(f => ({ id: f.id, legend: f.querySelector(":scope > legend")?.textContent.trim() ?? null })),
      tabelas: document.querySelectorAll("table").length,
      bodyPrimeiroFilho: u.desc(document.body.firstElementChild),
      larguraDoc: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    };
  });
  pagina.focoChegada = focoChegada;
  pagina.erros = np.erros; pagina.console = np.consoles;
  pagina.pedidosExternos = np.pedidos.filter(r => !r.url.startsWith("http://127.0.0.1")).map(r => r.url);
  pagina.metodosNaoGet = np.pedidos.filter(r => r.metodo !== "GET");

  // Instâncias
  const instancias = {};
  for (const [inst, partes] of Object.entries(PARTES)) {
    instancias[inst] = {};
    for (const [nome, sel] of Object.entries(partes)) {
      const d = await p.evaluate(sel => {
        const u = window.__u; const el = document.querySelector(sel);
        if (!el) return { presente: false };
        const pb = getComputedStyle(el, "::before"), pa = getComputedStyle(el, "::after");
        const ph = el.matches("input") ? (({ fontSize, fontWeight, fontStyle, color }) => ({ fontSize, fontWeight, fontStyle, color }))(getComputedStyle(el, "::placeholder")) : null;
        return { presente: true, visivel: u.visivel(el), tag: el.tagName.toLowerCase(), attrs: u.attrs(el), classes: [...el.classList], texto: el.textContent.replace(/\s+/g, " ").trim().slice(0, 300), caixa: u.caixa(el), estilo: Object.assign(u.estilo(el), { fontStyle: getComputedStyle(el).fontStyle }), antes: { content: pb.content, display: pb.display, width: pb.width, height: pb.height, fontFamily: pb.fontFamily }, depois: { content: pa.content, display: pa.display, width: pa.width, height: pa.height, fontFamily: pa.fontFamily }, placeholder: ph, filhos: [...el.children].map(c => u.desc(c)), fundo: u.fundo(el).cor, valor: "value" in el ? el.value : undefined, checked: "checked" in el ? el.checked : undefined, readOnly: "readOnly" in el ? el.readOnly : undefined };
      }, sel);
      if (d.presente) d.ax = await ax(p, sel).catch(() => null);
      instancias[inst][nome] = { seletor: sel, ...d };
    }
  }

  // Proveniência dos estilos medidos contra especificação
  const proveniencia = {};
  for (const [k, sel, props] of [
    ["inp-codigo.apoio", "#codigo-pais-apoio", ["font-size", "font-weight", "color", "margin-top"]],
    ["pagina.h1", "h1", ["font-size", "font-weight", "color"]],
    ["pagina.formTitulo", "#form-pais h2", ["font-size", "font-weight"]],
    ["pagina.secaoTitulo", "#titulo-configuracao", ["font-size", "font-weight"]],
    ["lst-paises.titulo", "#lst-paises .header .title", ["font-size", "font-weight"]],
    ["rad-situacao.legend", "#rad-situacao legend", ["font-size", "font-weight"]],
    ["btn-ajuda", "#btn-ajuda", ["width", "height", "background-color", "color"]],
    ["brd-trilha.atual", "#brd-trilha [aria-current=page]", ["font-weight"]],
    ["msg-orientacao", "#msg-orientacao", ["background-color", "margin-left", "padding-left", "width"]],
    ["msg-erro.iconeConteudo", "#msg-erro .content > i", ["display", "color", "font-size"]],
    ["lst-paises.secundario1", "#lst-paises .br-item:nth-of-type(1) .texto-secundario", ["font-size", "color"]],
    ["lst-paises.principal1", "#lst-paises .br-item:nth-of-type(1) .texto-principal", ["font-size", "color", "font-weight"]],
    ["sel-continente.lista", "#sel-continente .br-list", ["box-shadow"]],
  ]) proveniencia[k] = await origemEstilo(p, sel, props);

  // Texto visível: fonte, tamanho, contraste
  const texto = await p.evaluate(() => {
    const u = window.__u; const out = []; const vistos = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.textContent.replace(/\s+/g, " ").trim(); if (!t) continue;
      const el = n.parentElement; if (!el || vistos.has(el) || el.closest("noscript,script,style")) continue;
      if (!u.visivel(el)) continue;
      const cs = getComputedStyle(el); if (cs.clip === "rect(0px, 0px, 0px, 0px)" || (el.closest(".sr-only"))) continue;
      vistos.add(el);
      const cor = u.rgba(cs.color); const f = u.fundo(el);
      const corEf = u.sobre(cor, f.cor);
      const tam = parseFloat(cs.fontSize), peso = Number(cs.fontWeight);
      const grande = tam >= 24 || (tam >= 18.66 && peso >= 700);
      out.push({ el: u.desc(el), caminho: u.caminho(el), texto: t.slice(0, 80), fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, cor: cs.color, fundo: `rgb(${Math.round(f.cor.r)}, ${Math.round(f.cor.g)}, ${Math.round(f.cor.b)})`, imagemFundo: f.imagem, razao: Math.round(u.razao(corEf, f.cor) * 100) / 100, grande });
    }
    // placeholders
    for (const i of document.querySelectorAll("input[placeholder]")) if (u.visivel(i) && !i.value) { const cs = getComputedStyle(i, "::placeholder"); const f = u.fundo(i); out.push({ el: u.desc(i) + "::placeholder", texto: i.placeholder, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, cor: cs.color, fundo: `rgb(${f.cor.r}, ${f.cor.g}, ${f.cor.b})`, razao: Math.round(u.razao(u.sobre(u.rgba(cs.color), f.cor), f.cor) * 100) / 100, grande: false }); }
    return out;
  });

  // Cores computadas de elementos visíveis
  const cores = await p.evaluate(() => {
    const u = window.__u; const out = [];
    const hex = c => "#" + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
    for (const el of document.querySelectorAll("body *")) {
      if (!u.visivel(el) || el.closest("noscript")) continue;
      const cs = getComputedStyle(el);
      const temTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || el.matches("i,svg,input");
      const cand = [["color", temTexto ? cs.color : null], ["background-color", cs.backgroundColor], ["border-top-color", cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none" ? cs.borderTopColor : null], ["border-bottom-color", cs.borderBottomWidth !== "0px" && cs.borderBottomStyle !== "none" ? cs.borderBottomColor : null]];
      for (const [prop, v] of cand) { const c = v && u.rgba(v); if (!c || c.a === 0) continue; out.push({ el: u.desc(el), caminho: u.caminho(el), prop, valor: v, hex: hex(c), alfa: c.a }); }
    }
    return out;
  });

  // Ordem de Tab com evidência de foco visível (diferença de pixels)
  const tab = [];
  await p.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); });
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab"); await p.waitForTimeout(80);
    const info = await p.evaluate(() => { const u = window.__u; const a = document.activeElement; if (!a || a === document.body) return null; a.setAttribute("data-auditoria-foco", "1"); const cs = getComputedStyle(a); return { el: u.desc(a), caminho: u.caminho(a), texto: (a.getAttribute("aria-label") || a.textContent || a.value || "").replace(/\s+/g, " ").trim().slice(0, 60), caixa: u.caixa(a), outline: [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.outlineOffset].join(" "), boxShadow: cs.boxShadow, visivel: u.visivel(a), focusVisible: a.matches(":focus-visible") }; });
    if (!info) { tab.push({ parada: i + 1, el: "body" }); break; }
    if (tab.length && tab[0].caminho === info.caminho) break;
    // diferença de pixels foco × sem foco
    let difPx = null;
    try {
      const r = await p.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect(); return { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: b.width + 16, height: b.height + 16 }; });
      if (r.width > 1 && r.height > 1 && r.y < 900 && r.y + r.height > 0) {
        const com = await p.screenshot({ clip: r });
        await p.evaluate(() => { const a = document.activeElement; window.__ultimo = a; a.blur(); });
        await p.waitForTimeout(60);
        const sem = await p.screenshot({ clip: r });
        difPx = com.equals(sem) ? 0 : Math.abs(com.length - sem.length) + 1;
        await p.evaluate(() => { const a = window.__ultimo; a.focus({ preventScroll: true }); });
        // devolve o foco "por teclado": refaz a navegação até ele para manter :focus-visible
        await p.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); });
        for (let k = 0; k <= i; k++) { await p.keyboard.press("Tab"); await p.waitForTimeout(25); }
      }
    } catch (err) { difPx = "erro: " + err.message.slice(0, 60); }
    tab.push({ parada: i + 1, ...info, difPx });
  }

  gravar(`${e.id}/pagina.json`, pagina);
  gravar(`${e.id}/instancias.json`, instancias);
  gravar(`${e.id}/proveniencia.json`, proveniencia);
  gravar(`${e.id}/texto.json`, texto);
  gravar(`${e.id}/cores.json`, cores);
  gravar(`${e.id}/tab.json`, tab);
  console.log(`${e.id}: foco na chegada ${focoChegada}; ${texto.length} textos; ${cores.length} cores; ${tab.length} paradas de Tab; erros ${np.erros.length}`);
  await np.contexto.close();
}

const nav = await abrirNavegador();
for (const e of ESTADOS) await medirEstado(nav, e);
await nav.close();
