/**
 * Sondas de interação (teclado, ponteiro, redimensionamento), cada uma em carga limpa no estado declarado.
 * Saída: medidas/interacoes/<sonda>.json  (e resumo em medidas/interacoes.json)
 */
import { abrirNavegador, irPara, ESTADOS, gravar, ax, tabAte, VIEWPORT } from "./comum.mjs";

const E = Object.fromEntries(ESTADOS.map(e => [e.id, e]));
const esperar = (p, ms = 350) => p.waitForTimeout(ms);
const vis = (p, s) => p.evaluate(s => { const el = document.querySelector(s); return el ? window.__u.visivel(el) : null; }, s);
const caixa = (p, s) => p.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, s);
const ativo = p => p.evaluate(() => window.__u.desc(document.activeElement));
const glifo = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].map(el => { const c = getComputedStyle(el, "::before").content; return { el: window.__u.desc(el), classes: el.className, codigo: c && c !== "none" ? [...c.replace(/^"|"$/g, "")].map(ch => ch.codePointAt(0).toString(16)).join(" ") : null, visivel: window.__u.visivel(el), cor: getComputedStyle(el).color }; }), s);
/** pixels não-fundo numa região (detecta se há desenho visível, ex. ícone). */
async function pixelsDesenhados(p, s) {
  await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), s);
  const r = await caixa(p, s); if (!r || r.w < 1) return null;
  const png = await p.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  return await p.evaluate(async b64 => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; const base = [d[0], d[1], d[2]]; let n = 0, cores = new Set();
    for (let i = 0; i < d.length; i += 4) { if (Math.abs(d[i] - base[0]) + Math.abs(d[i + 1] - base[1]) + Math.abs(d[i + 2] - base[2]) > 60) n++; cores.add(d[i] + "," + d[i + 1] + "," + d[i + 2]); }
    return { largura: c.width, altura: c.height, pixelsDiferentesDoCanto: n, coresDistintas: cores.size, corDoCanto: base.join(",") };
  }, png.toString("base64"));
}
async function difFoco(p, s, pad = 10) {
  const r = await caixa(p, s); const clip = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + 2 * pad, height: r.h + 2 * pad };
  const com = await p.screenshot({ clip }); await p.evaluate(() => document.activeElement.blur()); await esperar(p, 200);
  const sem = await p.screenshot({ clip }); return { clip, iguais: com.equals(sem), bytesCom: com.length, bytesSem: sem.length };
}

const SONDAS = {
  "skiplink-teclado": ["S0", async p => {
    const r = { passos: [] };
    await p.keyboard.press("Tab"); await esperar(p, 700);
    r.passos.push({ tecla: "Tab 1", foco: await ativo(p), item1: await caixa(p, ".br-skiplink a:nth-of-type(1)"), item1Visivel: await vis(p, ".br-skiplink a:nth-of-type(1)") });
    await p.keyboard.press("Tab"); await esperar(p, 700);
    r.passos.push({ tecla: "Tab 2", foco: await ativo(p), item2: await caixa(p, ".br-skiplink a:nth-of-type(2)"), item2Visivel: await vis(p, ".br-skiplink a:nth-of-type(2)"), item1Visivel: await vis(p, ".br-skiplink a:nth-of-type(1)") });
    await p.keyboard.press("Tab"); await esperar(p, 700);
    r.passos.push({ tecla: "Tab 3", foco: await ativo(p), item1Visivel: await vis(p, ".br-skiplink a:nth-of-type(1)"), item2Visivel: await vis(p, ".br-skiplink a:nth-of-type(2)") });
    // ativação
    await p.keyboard.press("Shift+Tab"); await esperar(p, 400); await p.keyboard.press("Shift+Tab"); await esperar(p, 400);
    const antes = await ativo(p); await p.keyboard.press("Enter"); await esperar(p, 500);
    r.ativacao = { focoAntes: antes, hash: await p.evaluate(() => location.hash), focoDepois: await ativo(p), mainTopo: await p.evaluate(() => document.querySelector("#main-content").getBoundingClientRect().top) };
    await p.keyboard.press("Tab"); await esperar(p, 300); r.ativacao.proximoTab = await ativo(p);
    return r;
  }],
  "skiplink-ponteiro": ["S0", async p => {
    const r = [];
    for (const [x, y] of [[20, 5], [60, 15], [160, 20], [300, 10]]) { await p.mouse.move(x, y); await esperar(p, 500); r.push({ ponteiro: [x, y], item1Visivel: await vis(p, ".br-skiplink a:nth-of-type(1)"), item1: await caixa(p, ".br-skiplink a:nth-of-type(1)") }); }
    return r;
  }],
  "nome-digitar": ["S0", async p => {
    await p.click("#nome-pais"); await p.keyboard.type("Brasil"); await esperar(p, 200);
    const porClique = await p.evaluate(() => ({ valor: document.querySelector("#nome-pais").value, readOnly: document.querySelector("#nome-pais").readOnly, foco: window.__u.desc(document.activeElement) }));
    const n = await tabAte(p, "#nome-pais"); await p.keyboard.type("Chile"); await esperar(p, 200);
    const porTab = await p.evaluate(() => ({ valor: document.querySelector("#nome-pais").value, foco: window.__u.desc(document.activeElement) }));
    return { porClique, porTab: { ...porTab, paradasAte: n }, cursor: await p.evaluate(() => getComputedStyle(document.querySelector("#nome-pais")).cursor) };
  }],
  "nome-salvar-preenchido": ["S0", async p => {
    // tenta cumprir o envio: preenche o que é possível e salva
    await p.fill("#codigo-pais", "BRA"); await p.click("#continente"); await p.keyboard.type("Am"); await esperar(p, 300);
    await p.click("#sel-continente .br-list .br-item:nth-of-type(3) label").catch(() => {}); await esperar(p, 300);
    await p.click("label[for=situacao-habilitado]"); await p.click("#btn-salvar"); await esperar(p, 500);
    return await p.evaluate(() => ({ continente: document.querySelector("#continente").value, situacao: document.querySelector("#situacao-habilitado").checked, nome: document.querySelector("#nome-pais").value, msgErroVisivel: window.__u.visivel(document.querySelector("#msg-erro")), errosCampo: [...document.querySelectorAll(".feedback")].filter(f => window.__u.visivel(f)).map(f => f.textContent.trim()) }));
  }],
  "codigo-digitar": ["S0", async p => {
    await tabAte(p, "#codigo-pais"); await p.keyboard.type("A B"); await esperar(p, 100);
    const v = await p.evaluate(() => { const i = document.querySelector("#codigo-pais"); return { valor: i.value, cursor: i.selectionStart }; });
    await p.keyboard.press("Control+ArrowLeft"); const c1 = await p.evaluate(() => document.querySelector("#codigo-pais").selectionStart);
    await p.keyboard.press("Control+ArrowLeft"); const c2 = await p.evaluate(() => document.querySelector("#codigo-pais").selectionStart);
    await p.keyboard.press("Control+ArrowRight"); const c3 = await p.evaluate(() => document.querySelector("#codigo-pais").selectionStart);
    return { ...v, ctrlEsq1: c1, ctrlEsq2: c2, ctrlDir: c3 };
  }],
  "select-teclado": ["S0", async p => {
    const r = {};
    r.paradas = await tabAte(p, "#continente"); await esperar(p, 400);
    r.aoFocar = { listaVisivel: await vis(p, "#sel-continente .br-list"), expanded: await p.evaluate(() => document.querySelector("#sel-continente > .br-input").getAttribute("aria-expanded")) };
    await p.keyboard.press("ArrowDown"); await esperar(p, 400);
    r.aposArrowDown = { listaVisivel: await vis(p, "#sel-continente .br-list"), foco: await ativo(p), focoTexto: await p.evaluate(() => document.activeElement.textContent.trim()) };
    await p.keyboard.press("ArrowDown"); await esperar(p, 250);
    r.aposArrowDown2 = { foco: await ativo(p), focoTexto: await p.evaluate(() => document.activeElement.textContent.trim()) };
    await p.keyboard.press("ArrowUp"); await esperar(p, 250);
    r.aposArrowUp = { foco: await ativo(p), focoTexto: await p.evaluate(() => document.activeElement.textContent.trim()) };
    await p.keyboard.press("ArrowDown"); await esperar(p, 250);
    await p.keyboard.press("Enter"); await esperar(p, 400);
    r.aposEnter = { valor: await p.evaluate(() => document.querySelector("#continente").value), listaVisivel: await vis(p, "#sel-continente .br-list"), foco: await ativo(p) };
    // Space numa nova abertura
    await p.focus("#continente"); await p.keyboard.press("ArrowDown"); await esperar(p, 300); await p.keyboard.press("ArrowDown"); await esperar(p, 200); await p.keyboard.press("ArrowDown"); await esperar(p, 200);
    const alvo = await p.evaluate(() => document.activeElement.textContent.trim());
    await p.keyboard.press("Space"); await esperar(p, 400);
    r.aposSpace = { alvo, valor: await p.evaluate(() => document.querySelector("#continente").value), listaVisivel: await vis(p, "#sel-continente .br-list") };
    // Esc
    await p.focus("#continente"); await p.keyboard.press("ArrowDown"); await esperar(p, 300);
    const abertaAntesEsc = await vis(p, "#sel-continente .br-list");
    await p.keyboard.press("Escape"); await esperar(p, 400);
    r.esc = { abertaAntesEsc, listaVisivelDepois: await vis(p, "#sel-continente .br-list"), valor: await p.evaluate(() => document.querySelector("#continente").value) };
    return r;
  }],
  "select-filtro": ["S0", async p => {
    await p.click("#continente"); await p.keyboard.type("Eu"); await esperar(p, 500);
    const filtrado = await p.evaluate(() => [...document.querySelectorAll("#sel-continente .br-list .br-item")].filter(i => window.__u.visivel(i)).map(i => i.textContent.trim()));
    await p.fill("#continente", ""); await p.keyboard.type("zzz"); await esperar(p, 500);
    const vazio = await p.evaluate(() => [...document.querySelectorAll("#sel-continente .br-list .br-item")].filter(i => window.__u.visivel(i)).map(i => ({ texto: i.textContent.replace(/\s+/g, " ").trim(), classes: i.className, caixa: window.__u.caixa(i) })));
    const campo = await caixa(p, "#continente");
    return { filtrado, vazio, campo };
  }],
  "select-clique": ["S2", async p => {
    const hoverAntes = await p.evaluate(() => getComputedStyle(document.querySelector("#sel-continente .br-list .br-item:nth-of-type(4)")).backgroundColor);
    const r4 = await caixa(p, "#sel-continente .br-list .br-item:nth-of-type(4)");
    await p.mouse.move(r4.x + 50, r4.y + r4.h / 2); await esperar(p, 300);
    const hoverDepois = await p.evaluate(() => getComputedStyle(document.querySelector("#sel-continente .br-list .br-item:nth-of-type(4)")).backgroundImage + " | " + getComputedStyle(document.querySelector("#sel-continente .br-list .br-item:nth-of-type(4)")).backgroundColor);
    await p.mouse.click(r4.x + 50, r4.y + r4.h / 2); await esperar(p, 400);
    const depois = await p.evaluate(() => ({ valor: document.querySelector("#continente").value, listaVisivel: window.__u.visivel(document.querySelector("#sel-continente .br-list")), selecionado: [...document.querySelectorAll("#sel-continente .br-item")].filter(i => i.classList.contains("selected")).map(i => i.textContent.trim()) }));
    // reabre e mede o item selecionado e sua cor de texto
    await p.click("#sel-continente [data-trigger]"); await esperar(p, 400);
    const itens = await p.evaluate(() => [...document.querySelectorAll("#sel-continente .br-list .br-item")].map(i => { const l = i.querySelector("label"); return { texto: i.textContent.trim(), classes: i.className, corRotulo: getComputedStyle(l).color, fundo: getComputedStyle(i).backgroundColor, ax: null }; }));
    return { hoverAntes, hoverDepois, depois, itensReabertos: itens };
  }],
  "radio-teclado": ["S0", async p => {
    const n = await tabAte(p, "input[name=situacao]");
    const f1 = await ativo(p); await esperar(p, 300);
    const anel = await p.evaluate(() => { const l = document.querySelector("label[for=" + document.activeElement.id + "]"); const b = getComputedStyle(l, "::before"); return { outline: [b.outlineStyle, b.outlineWidth, b.outlineColor, b.outlineOffset].join(" "), boxShadow: b.boxShadow, borda: [b.borderTopStyle, b.borderTopWidth, b.borderTopColor].join(" "), w: b.width, h: b.height, fundo: b.backgroundColor }; });
    const dif = await difFoco(p, "label[for=situacao-habilitado]");
    await p.focus("#situacao-habilitado");
    await p.keyboard.press("Space"); await esperar(p, 200);
    const s1 = await p.evaluate(() => [...document.querySelectorAll("input[name=situacao]")].map(i => i.checked));
    await p.keyboard.press("ArrowDown"); await esperar(p, 200);
    const s2 = await p.evaluate(() => ({ marcados: [...document.querySelectorAll("input[name=situacao]")].map(i => i.checked), foco: window.__u.desc(document.activeElement) }));
    const marcado = await p.evaluate(() => { const l = document.querySelector("label[for=situacao-suspenso]"); const b = getComputedStyle(l, "::after"); return { content: b.content, fundo: b.backgroundColor, w: b.width, h: b.height, display: b.display }; });
    return { paradasAte: n, primeiroFoco: f1, anelFoco: anel, difFocoLabel: dif, aposSpace: s1, aposArrowDown: s2, indicadorMarcado: marcado };
  }],
  "switch-teclado": ["S0", async p => {
    const r = {};
    r.paradasAte = await tabAte(p, "#certificado-automatico"); await esperar(p, 400);
    r.focoVisual = await p.evaluate(() => { const l = document.querySelector("#swt-certificado label"); const b = getComputedStyle(l, "::before"), a = getComputedStyle(l, "::after"); return { before: { outline: [b.outlineStyle, b.outlineWidth, b.outlineColor].join(" "), boxShadow: b.boxShadow, borda: b.borderTopStyle + " " + b.borderTopWidth + " " + b.borderTopColor, w: b.width, h: b.height, fundo: b.backgroundColor }, after: { boxShadow: a.boxShadow, w: a.width, h: a.height, fundo: a.backgroundColor, left: a.left }, focusVisible: document.activeElement.matches(":focus-visible") }; });
    r.difFoco = await difFoco(p, "#swt-certificado label");
    await p.focus("#certificado-automatico");
    const cont = async () => ({ checked: await p.evaluate(() => document.querySelector("#certificado-automatico").checked), ariaChecked: await p.evaluate(() => document.querySelector("#certificado-automatico").getAttribute("aria-checked")), ax: await ax(p, "#certificado-automatico"), situacao: await p.evaluate(() => document.querySelector(".situacao-configuracao").textContent.trim()), rotuloEstado: await p.evaluate(() => getComputedStyle(document.querySelector("#swt-certificado .switch-data"), "::before").content), caixaRaiz: await caixa(p, "#swt-certificado"), chave: await p.evaluate(() => { const a = getComputedStyle(document.querySelector("#swt-certificado label"), "::after"); return { left: a.left, fundo: a.backgroundColor, transform: a.transform }; }) });
    r.inicial = await cont();
    await p.keyboard.press("Space"); await esperar(p, 500); r.aposSpace = await cont();
    await p.keyboard.press("Enter"); await esperar(p, 500); r.aposEnter = await cont();
    await p.keyboard.press("Space"); await esperar(p, 500); r.aposSpace2 = await cont();
    r.navegacoes = await p.evaluate(() => location.href);
    return r;
  }],
  "switch-clique": ["S0", async p => {
    const est = async () => p.evaluate(() => ({ checked: document.querySelector("#certificado-automatico").checked, ariaChecked: document.querySelector("#certificado-automatico").getAttribute("aria-checked"), situacao: document.querySelector(".situacao-configuracao").textContent.trim() }));
    const a = await est(); await p.click("#swt-certificado label"); await esperar(p, 500); const b = await est(); await p.click("#swt-certificado label"); await esperar(p, 500); const c = await est();
    return { inicial: a, aposClique1: b, aposClique2: c };
  }],
  "mensagem-fechar-teclado": ["S0", async p => {
    const n = await tabAte(p, "#msg-orientacao .close button"); await esperar(p, 200);
    await p.keyboard.press("Enter"); await esperar(p, 500);
    const r = { paradasAte: n, visivelAposEnter: await vis(p, "#msg-orientacao"), presente: await p.evaluate(() => !!document.querySelector("#msg-orientacao")), focoApos: await ativo(p) };
    await p.keyboard.press("Tab"); await esperar(p, 200); r.proximoTab = await ativo(p);
    return r;
  }],
  "mensagem-fechar-espaco": ["S0", async p => { await tabAte(p, "#msg-orientacao .close button"); await p.keyboard.press("Space"); await esperar(p, 500); return { visivel: await vis(p, "#msg-orientacao"), foco: await ativo(p) }; }],
  "mensagem-fechar-clique": ["S0", async p => { await p.click("#msg-orientacao .close button"); await esperar(p, 500); return { visivel: await vis(p, "#msg-orientacao"), foco: await ativo(p) }; }],
  "ajuda-acao": ["S0", async p => {
    const antes = await p.evaluate(() => ({ n: document.querySelectorAll("*").length, texto: document.body.innerText.length, visiveis: [...document.querySelectorAll("body *")].filter(e => window.__u.visivel(e)).length }));
    await p.hover("#btn-ajuda"); await esperar(p, 600);
    const hover = await p.evaluate(() => ({ tooltips: [...document.querySelectorAll(".br-tooltip, [role=tooltip]")].filter(e => window.__u.visivel(e)).length, title: document.querySelector("#btn-ajuda").getAttribute("title") }));
    await p.click("#btn-ajuda"); await esperar(p, 800);
    const depois = await p.evaluate(() => ({ n: document.querySelectorAll("*").length, texto: document.body.innerText.length, visiveis: [...document.querySelectorAll("body *")].filter(e => window.__u.visivel(e)).length, url: location.href, expanded: document.querySelector("#btn-ajuda").getAttribute("aria-expanded"), dialogs: document.querySelectorAll("[role=dialog], dialog[open], .br-modal").length }));
    await p.focus("#btn-ajuda"); await p.keyboard.press("Enter"); await esperar(p, 600);
    const teclado = await p.evaluate(() => ({ visiveis: [...document.querySelectorAll("body *")].filter(e => window.__u.visivel(e)).length, texto: document.body.innerText.length }));
    return { antes, hover, depois, teclado, pixels: await pixelsDesenhados(p, "#btn-ajuda"), pseudo: await p.evaluate(() => { const b = document.querySelector("#btn-ajuda"); return { before: getComputedStyle(b, "::before").content, after: getComputedStyle(b, "::after").content, filhosVisiveis: [...b.querySelectorAll("*")].filter(e => window.__u.visivel(e)).map(e => window.__u.desc(e)), html: b.innerHTML }; }) };
  }],
  "icones-glifos": ["S1", async p => ({
    ajuda: await glifo(p, "#btn-ajuda i, #btn-ajuda"),
    msgOrientacao: await glifo(p, "#msg-orientacao i"),
    msgErro: await glifo(p, "#msg-erro i"),
    select: await glifo(p, "#sel-continente i"),
    breadcrumb: await glifo(p, "#brd-trilha i"),
    feedbacks: await glifo(p, ".feedback i"),
    pixelsMsgErroIconeConteudo: await pixelsDesenhados(p, "#msg-erro .content > i"),
    pixelsBotaoFechar: await pixelsDesenhados(p, "#msg-orientacao .close button"),
  })],
  "botoes-ordem": ["S0", async p => p.evaluate(() => {
    const bs = [...document.querySelectorAll("#form-pais .acoes-formulario > *")];
    return { container: (({ display, flexDirection, justifyContent, gap, columnGap }) => ({ display, flexDirection, justifyContent, gap, columnGap }))(getComputedStyle(bs[0].parentElement)), botoes: bs.map((b, i) => ({ domIndice: i, id: b.id, texto: b.textContent.trim(), classes: b.className, order: getComputedStyle(b).order, x: b.getBoundingClientRect().x, direita: b.getBoundingClientRect().right, y: b.getBoundingClientRect().y, marginLeft: getComputedStyle(b).marginLeft, marginRight: getComputedStyle(b).marginRight, linhasRotulo: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || 20)) })) };
  })],
  "limpar-acao": ["S1", async p => {
    const antes = await p.evaluate(() => ({ erros: [...document.querySelectorAll(".feedback")].filter(f => window.__u.visivel(f)).length, msg: window.__u.visivel(document.querySelector("#msg-erro")) }));
    await p.fill("#codigo-pais", "ARG");
    await tabAte(p, "#btn-limpar"); await p.keyboard.press("Space"); await esperar(p, 500);
    const depois = await p.evaluate(() => ({ codigo: document.querySelector("#codigo-pais").value, erros: [...document.querySelectorAll(".feedback")].filter(f => window.__u.visivel(f)).length, msg: window.__u.visivel(document.querySelector("#msg-erro")), foco: window.__u.desc(document.activeElement) }));
    return { antes, depois };
  }],
  "cancelar-acao": ["S0", async p => { await p.click("#btn-cancelar"); await esperar(p, 800); return { url: p.url() }; }],
  "salvar-teclado": ["S0", async p => { await tabAte(p, "#btn-salvar"); await p.keyboard.press("Enter"); await esperar(p, 500); return { msgErroVisivel: await vis(p, "#msg-erro"), foco: await ativo(p) }; }],
  "clique-sem-foco-visual": ["S0", async p => {
    const r = {};
    for (const s of ["#btn-limpar", "#btn-ajuda", "#btn-cancelar", "#msg-orientacao .close button"]) {
      if (s === "#btn-limpar") { await p.click(s); } else { await p.click(s); }
      await esperar(p, 250);
      r[s] = await p.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const cs = getComputedStyle(el); return { focado: document.activeElement === el, focusVisible: el.matches(":focus-visible"), outline: cs.outlineStyle + " " + cs.outlineWidth }; }, s);
      if (p.url().indexOf("cadastro-pais") < 0) break;
    }
    return r;
  }],
  "cursores": ["S0", async p => p.evaluate(() => Object.fromEntries(["#btn-limpar", "#btn-ajuda", "#nome-pais", "#codigo-pais", "#continente", "#sel-continente [data-trigger]", "label[for=situacao-habilitado]", "#swt-certificado label", "#msg-orientacao .close button", "#brd-trilha a"].map(s => [s, getComputedStyle(document.querySelector(s)).cursor])))],
  "cabecalho-titulo-linhas": ["S0", async p => p.evaluate(() => { const t = document.querySelector("#cabecalho .header-title"); const cs = getComputedStyle(t); return { altura: t.getBoundingClientRect().height, lineHeight: cs.lineHeight, linhas: Math.round(t.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; })],
  "lista-geometria": ["S0", async p => p.evaluate(() => {
    const itens = [...document.querySelectorAll("#lst-paises .br-item")]; const divs = [...document.querySelectorAll("#lst-paises .itens-paises > .br-divider")];
    return { itens: itens.map(i => { const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); return { texto: i.querySelector(".texto-principal").textContent, top: r.top + scrollY, bottom: r.bottom + scrollY, h: r.height, pt: cs.paddingTop, pb: cs.paddingBottom, pl: cs.paddingLeft }; }), divisores: divs.map(d => { const r = d.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, borda: getComputedStyle(d).borderTopWidth + " " + getComputedStyle(d).borderTopColor }; }), tabStops: itens.filter(i => i.tabIndex >= 0).length };
  })],
  "radio-geometria": ["S1", async p => p.evaluate(() => {
    const leg = document.querySelector("#rad-situacao legend").getBoundingClientRect(); const fs = getComputedStyle(document.querySelector("#rad-situacao"));
    const labels = [...document.querySelectorAll("#rad-situacao .br-radio label")].map(l => { const r = l.getBoundingClientRect(); const b = getComputedStyle(l, "::before"); return { texto: l.textContent.trim(), x: r.x, top: r.top, bottom: r.bottom, caixaOpcao: { w: b.width, h: b.height, left: b.left, borda: b.borderTopWidth + " " + b.borderTopColor, raio: b.borderTopLeftRadius } }; });
    const fb = document.querySelector("#situacao-erro"); const fr = fb && fb.getBoundingClientRect();
    return { legend: { x: leg.x, top: leg.top, bottom: leg.bottom }, fieldset: { borda: fs.borderTopStyle + " " + fs.borderTopWidth, marginBottom: fs.marginBottom }, labels, feedback: fb ? { x: fr.x, top: fr.top, n: document.querySelectorAll("#rad-situacao .feedback, #situacao-erro").length } : null };
  })],
  "mensagem-erro-foco": ["S0", async p => { await tabAte(p, "#btn-salvar"); await p.keyboard.press("Enter"); await esperar(p, 600); return { foco: await ativo(p), msgTemFechar: await p.evaluate(() => !!document.querySelector("#msg-erro .close button")), role: await p.evaluate(() => document.querySelector("#msg-erro [role=alert]")?.getAttribute("role")) }; }],
};

/** 200 %: janela 640×450 (equivalente a 1280×900 com zoom 200 %). */
async function redimensionar(nav) {
  const r = {};
  for (const e of ESTADOS) {
    const np = await irPara(nav, e, { width: 640, height: 450 });
    r[e.id] = await np.pagina.evaluate(() => {
      const de = document.documentElement; const largos = [...document.querySelectorAll("body *")].filter(el => window.__u.visivel(el) && el.getBoundingClientRect().right > de.clientWidth + 1).map(el => ({ el: window.__u.desc(el), right: Math.round(el.getBoundingClientRect().right) })).slice(0, 15);
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, alemDaLargura: largos };
    });
    await np.contexto.close();
  }
  return r;
}

const nav = await abrirNavegador();
const resumo = {};
const so = process.argv.slice(2).filter(a => !a.startsWith("--"));
for (const [nome, [est, fn]] of Object.entries(SONDAS)) {
  if (so.length && !so.includes(nome)) continue;
  const np = await irPara(nav, E[est]);
  let r; try { r = await fn(np.pagina); } catch (err) { r = { erro: err.message.slice(0, 300) }; }
  r = { sonda: nome, estado: est, ...r, errosPagina: np.erros };
  gravar(`interacoes/${nome}.json`, r); resumo[nome] = r;
  console.log(nome, JSON.stringify(r).slice(0, 400));
  await np.contexto.close();
}
if (!so.length || so.includes("redimensionar")) { const r = await redimensionar(nav); gravar("interacoes/redimensionar-200.json", r); console.log("redimensionar", JSON.stringify(r).slice(0, 600)); }
await nav.close();
