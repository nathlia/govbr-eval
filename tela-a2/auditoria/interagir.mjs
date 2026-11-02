/**
 * Sondas de interação (teclado, ponteiro, dimensão), cada uma em carga nova + setup do estado de partida.
 * Nenhuma escolhe dados além do necessário para observar o comportamento (uma opção do select, ligar um
 * switch). Cada sonda termina em até 120 s da carga (protocolo); se a página recarregar/navegar no meio,
 * a sonda registra a navegação e é refeita uma vez.
 * Grava medidas/<estado>/interacoes.json (estado de partida da sonda).
 * Uso: node tela-a2/auditoria/interagir.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { abrirNavegador, irPara, ESTADOS, MEDIDAS, VIEWPORT, novaPagina, carregar } from "./comum.mjs";
import { UTIL } from "./util-navegador.mjs";

const E = Object.fromEntries(ESTADOS.map(e => [e.id, e]));

/* ---- auxiliares no navegador ---- */
const ATIVO = () => { const el = document.activeElement; if (!el || el === document.body) return "body"; return window.__u.desc(el) + (el.getAttribute("aria-label") ? `[aria-label=${el.getAttribute("aria-label")}]` : "") + (el.textContent.trim() ? ` "${el.textContent.replace(/\s+/g, " ").trim().slice(0, 40)}"` : ""); };
const VIS = sel => { const el = document.querySelector(sel); return el ? { presente: true, visivel: window.__u.visivel(el), caixa: window.__u.caixa(el) } : { presente: false }; };

async function tabAte(p, seletor, max = 45) {
  await p.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); });
  for (let i = 1; i <= max; i++) {
    await p.keyboard.press("Tab"); await p.waitForTimeout(80);
    if (await p.evaluate(s => document.activeElement && document.activeElement.matches(s), seletor)) return i;
  }
  return null;
}
const ativo = p => p.evaluate(ATIVO);
const vis = (p, s) => p.evaluate(VIS, s);
const attr = (p, s, a) => p.evaluate(([s, a]) => document.querySelector(s)?.getAttribute(a) ?? null, [s, a]);
const prop = (p, s, k) => p.evaluate(([s, k]) => document.querySelector(s)?.[k] ?? null, [s, k]);

const SONDAS = [
  /* ---------------- S0 ---------------- */
  { id: "skiplink-tab", estado: "S0", regra: "skiplink: primeiro foco, visível ao focar, itens na mesma posição, volta a oculto ao sair", async f(p) {
      await p.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); });
      const r = { antes: { nav: await vis(p, ".atalhos-pagina"), item1: await vis(p, ".atalhos-pagina > a:nth-of-type(1)") } };
      await p.keyboard.press("Tab"); await p.waitForTimeout(200);
      r.tab1 = { ativo: await ativo(p), item1: await vis(p, ".atalhos-pagina > a:nth-of-type(1)"), item2: await vis(p, ".atalhos-pagina > a:nth-of-type(2)") };
      await p.keyboard.press("Tab"); await p.waitForTimeout(200);
      r.tab2 = { ativo: await ativo(p), item1: await vis(p, ".atalhos-pagina > a:nth-of-type(1)"), item2: await vis(p, ".atalhos-pagina > a:nth-of-type(2)") };
      await p.keyboard.press("Tab"); await p.waitForTimeout(250);
      r.tab3 = { ativo: await ativo(p), item1: await vis(p, ".atalhos-pagina > a:nth-of-type(1)"), item2: await vis(p, ".atalhos-pagina > a:nth-of-type(2)") };
      return r; } },
  { id: "skiplink-mouse", estado: "S0", regra: "skiplink visível para quem navega com mouse", async f(p) {
      const r = {};
      for (const [x, y] of [[20, 5], [100, 20], [200, 10]]) { await p.mouse.move(x, y); await p.waitForTimeout(250); r[`${x},${y}`] = { item1: await vis(p, ".atalhos-pagina > a:nth-of-type(1)"), item2: await vis(p, ".atalhos-pagina > a:nth-of-type(2)") }; }
      return r; } },
  { id: "skiplink-enter", estado: "S0", regra: "skiplink leva ao bloco (#main-content)", async f(p) {
      await tabAte(p, ".atalhos-pagina > a:nth-of-type(1)");
      await p.keyboard.press("Enter"); await p.waitForTimeout(400);
      const r = { conteudo: { ativo: await ativo(p), hash: await p.evaluate(() => location.hash), scrollY: await p.evaluate(() => scrollY), alvoTabindex: await attr(p, "#main-content", "tabindex") } };
      await p.keyboard.press("Tab"); await p.waitForTimeout(150);
      r.conteudo.tabSeguinte = await ativo(p);
      return r; } },
  { id: "skiplink-enter-rodape", estado: "S0", regra: "skiplink leva ao bloco (#rodape)", async f(p) {
      await tabAte(p, ".atalhos-pagina > a:nth-of-type(2)");
      await p.keyboard.press("Enter"); await p.waitForTimeout(400);
      return { ativo: await ativo(p), hash: await p.evaluate(() => location.hash), scrollY: await p.evaluate(() => scrollY), rodapeTopo: await p.evaluate(() => document.querySelector("#rodape").getBoundingClientRect().top) }; } },
  { id: "abas-teclado", estado: "S0", regra: "tab: Tab + setas esquerda/direita; foco visível; foco inicial na primeira aba", async f(p) {
      const passos = await tabAte(p, "#aba-andamento");
      const r = { tabsAtePrimeiraAba: passos, foco: await ativo(p), tabindexAbas: await p.evaluate(() => [...document.querySelectorAll("[role=tab]")].map(t => [t.id, t.getAttribute("tabindex"), t.tabIndex])) };
      await p.keyboard.press("ArrowRight"); await p.waitForTimeout(250);
      r.setaDireita = { ativo: await ativo(p), selecionada: await p.evaluate(() => document.querySelector("[role=tab][aria-selected=true]")?.id), painel: await p.evaluate(() => document.querySelector(".tab-panel.active")?.id) };
      await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(250);
      r.setaEsquerda = { ativo: await ativo(p), selecionada: await p.evaluate(() => document.querySelector("[role=tab][aria-selected=true]")?.id) };
      await p.keyboard.press("Tab"); await p.waitForTimeout(150);
      r.tabDepoisDaPrimeira = await ativo(p);
      await p.keyboard.press("Enter"); await p.waitForTimeout(300);
      r.enterNaSegunda = { selecionada: await p.evaluate(() => document.querySelector("[role=tab][aria-selected=true]")?.id), painel: await p.evaluate(() => document.querySelector(".tab-panel.active")?.id), ativo: await ativo(p) };
      return r; } },
  { id: "abas-espaco", estado: "S0", regra: "tab: Space aciona a aba", async f(p) {
      await tabAte(p, "#aba-documentos"); await p.keyboard.press("Space"); await p.waitForTimeout(300);
      return { selecionada: await p.evaluate(() => document.querySelector("[role=tab][aria-selected=true]")?.id), painel: await p.evaluate(() => document.querySelector(".tab-panel.active")?.id) }; } },
  { id: "acordeao", estado: "S0", regra: "accordion: Enter/Space expandem, detalhe aparece, single", async f(p) {
      const cont = n => p.evaluate(n => { const c = document.querySelector("#acc-duvidas-" + n); return { visivel: window.__u.visivel(c), display: getComputedStyle(c).display, hidden: c.hidden, h: c.getBoundingClientRect().height }; }, n);
      const exp = () => p.evaluate(() => [...document.querySelectorAll("#acc-duvidas button.header")].map(b => b.getAttribute("aria-expanded")));
      const r = { inicial: { expandido: await exp(), c1: await cont(1) } };
      await tabAte(p, "#acc-duvidas .item:nth-of-type(1) button.header");
      await p.keyboard.press("Enter"); await p.waitForTimeout(500);
      r.enter1 = { expandido: await exp(), c1: await cont(1), ativo: await ativo(p) };
      await p.keyboard.press("Tab"); await p.waitForTimeout(120);
      r.tabDepois = await ativo(p);
      await p.keyboard.press("Space"); await p.waitForTimeout(500);
      r.espaco2 = { expandido: await exp(), c1: await cont(1), c2: await cont(2) };
      r.corTituloAtivo = await p.evaluate(() => { const b = document.querySelector("#acc-duvidas button.header[aria-expanded=true]"); if (!b) return null; const t = b.querySelector(".title"); return { titulo: getComputedStyle(t).color, botao: getComputedStyle(b).color, fundoItem: getComputedStyle(b.parentElement).backgroundColor, classeItem: b.parentElement.className }; });
      r.corTituloInativo = await p.evaluate(() => { const b = document.querySelector("#acc-duvidas button.header[aria-expanded=false]"); const t = b.querySelector(".title"); return { titulo: getComputedStyle(t).color, botao: getComputedStyle(b).color }; });
      return r; } },
  ...["#tip-protocolo-gatilho|#tip-protocolo", "#tip-prazo-gatilho|#tip-prazo", "#msg-pendencia .close button|#msg-pendencia .close .br-tooltip"].flatMap(par => {
    const [g, t] = par.split("|");
    return [
      { id: "tooltip-hover " + g, estado: "S0", regra: "tooltip: aparece no hover, posição, seta, sombra, permanece sob o ponteiro (WCAG 1.4.13)", async f(p) {
          const box = await p.evaluate(s => window.__u.caixa(document.querySelector(s)), g);
          await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), g); await p.waitForTimeout(150);
          const vb = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, g);
          await p.mouse.move(vb.x + vb.w / 2, vb.y + vb.h / 2); await p.waitForTimeout(500);
          const medir = () => p.evaluate(([g, t]) => { const tt = document.querySelector(t), gg = document.querySelector(g); if (!tt) return { presente: false };
            const a = tt.querySelector(".arrow"); const rt = tt.getBoundingClientRect(), rg = gg.getBoundingClientRect(); const ra = a ? a.getBoundingClientRect() : null;
            return { visivel: window.__u.visivel(tt), placement: tt.getAttribute("data-popper-placement"), place: tt.getAttribute("place"), caixaTooltip: { x: rt.x, y: rt.y, w: rt.width, h: rt.height }, caixaGatilho: { x: rg.x, y: rg.y, w: rg.width, h: rg.height },
              seta: ra ? { x: ra.x, y: ra.y, w: ra.width, h: ra.height, centroX: ra.x + ra.width / 2, centroTooltipX: rt.x + rt.width / 2, centroGatilhoX: rg.x + rg.width / 2, display: getComputedStyle(a).display, antes: getComputedStyle(a, "::before").content } : null,
              sombra: getComputedStyle(tt).boxShadow, fundo: getComputedStyle(tt).backgroundColor, corTexto: getComputedStyle(tt.querySelector(".text") || tt).color, texto: tt.textContent.trim(),
              distanciaVertical: rt.top >= rg.bottom ? rt.top - rg.bottom : rg.top - rt.bottom, acima: rt.bottom <= rg.top + 1, abaixo: rt.top >= rg.bottom - 1, sobrepoeGatilho: !(rt.right < rg.left || rt.left > rg.right || rt.bottom < rg.top || rt.top > rg.bottom),
              viewport: { w: innerWidth, h: innerHeight }, dentroDaJanela: rt.left >= 0 && rt.top >= 0 && rt.right <= innerWidth && rt.bottom <= innerHeight }; }, [g, t]);
          const r = { caixaGatilhoPagina: box, hover: await medir() };
          if (r.hover.visivel) {
            const c = r.hover.caixaTooltip; await p.mouse.move(c.x + c.w / 2, c.y + c.h / 2, { steps: 5 }); await p.waitForTimeout(400);
            r.ponteiroSobreTooltip = { visivel: (await medir()).visivel };
            await p.mouse.move(vb.x + vb.w / 2, vb.y + vb.h / 2); await p.waitForTimeout(300);
            await p.keyboard.press("Escape"); await p.waitForTimeout(300);
            r.escapeComHover = { visivel: (await medir()).visivel };
          }
          await p.mouse.move(1279, 899); await p.waitForTimeout(400);
          r.saiu = { visivel: (await medir()).visivel };
          return r; } },
      { id: "tooltip-foco " + g, estado: "S0", regra: "tooltip: não depende só de hover (foco por teclado); Escape fecha", async f(p) {
          const n = await tabAte(p, g); await p.waitForTimeout(400);
          const v = () => p.evaluate(t => window.__u.visivel(document.querySelector(t)), t);
          const r = { tabs: n, ativo: await ativo(p), visivelComFoco: await v() };
          await p.keyboard.press("Escape"); await p.waitForTimeout(300);
          r.depoisEscape = await v();
          r.focoDepoisEscape = await ativo(p);
          await p.keyboard.press("Tab"); await p.waitForTimeout(300);
          r.depoisTab = await v();
          return r; } },
    ];
  }),
  { id: "mensagem-fechar-enter", estado: "S0", regra: "message: botão fechar operável; destino do foco", async f(p) {
      await tabAte(p, "#msg-pendencia .close button"); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
      return { mensagem: await vis(p, "#msg-pendencia"), ativo: await ativo(p) }; } },
  { id: "etapas", estado: "S0", regra: "step: Tab/Shift+Tab, estados, setas (listbox)", async f(p) {
      const r = {};
      r.botoes = await p.evaluate(() => [...document.querySelectorAll("#stp-andamento .step-progress-btn")].map(b => { const cs = getComputedStyle(b); const info = b.querySelector(".step-info"); const ci = info ? getComputedStyle(info) : null; const bef = getComputedStyle(b, "::before"); const aft = getComputedStyle(b, "::after");
        return { texto: b.textContent.trim(), disabled: b.disabled, active: b.hasAttribute("active"), alerta: b.getAttribute("data-alert"), ariaCurrent: b.getAttribute("aria-current"), cursor: cs.cursor, cor: cs.color, opacidade: cs.opacity, infoCor: ci?.color, infoAlign: ci?.textAlign, infoPeso: ci?.fontWeight, antes: { content: bef.content, cor: bef.color, fundo: bef.backgroundColor, borda: bef.border, w: bef.width, h: bef.height, boxShadow: bef.boxShadow }, depois: { content: aft.content, fundo: aft.backgroundColor, w: aft.width, h: aft.height, borda: aft.borderTop }, alertaSpan: (() => { const s = b.querySelector(".step-alert"); if (!s) return null; const sb = getComputedStyle(s, "::before"); return { content: sb.content, cor: sb.color, fundo: getComputedStyle(s).backgroundColor, borda: getComputedStyle(s).border, w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height }; })() }; }));
      r.linhaDoTempo = await p.evaluate(() => { const sp = document.querySelector("#stp-andamento .step-progress"); const b = getComputedStyle(sp, "::before"), a = getComputedStyle(sp, "::after"); return { antes: { content: b.content, fundo: b.backgroundColor, h: b.height, w: b.width, borda: b.borderTop }, depois: { content: a.content, fundo: a.backgroundColor, h: a.height }, filhosLinha: [...document.querySelectorAll("#stp-andamento .step-progress-btn")].map(x => getComputedStyle(x, "::after").content) }; });
      await tabAte(p, "#stp-andamento .etapa-envio");
      r.focoEnvio = await ativo(p);
      await p.keyboard.press("ArrowRight"); await p.waitForTimeout(200);
      r.setaDireita = await ativo(p);
      await p.evaluate(() => document.querySelector("#stp-andamento .etapa-envio").focus());
      await p.keyboard.press("Tab"); await p.waitForTimeout(150);
      r.tab = await ativo(p);
      await p.keyboard.press("Shift+Tab"); await p.waitForTimeout(150);
      r.shiftTab = await ativo(p);
      const antes = await p.evaluate(() => document.querySelector("#stp-andamento").outerHTML.length);
      await p.keyboard.press("Enter"); await p.waitForTimeout(300);
      r.enterEnvio = { ativo: await ativo(p), mudouDom: antes !== await p.evaluate(() => document.querySelector("#stp-andamento").outerHTML.length), current: await p.evaluate(() => [...document.querySelectorAll("#stp-andamento [aria-current]")].map(b => b.textContent.trim())) };
      return r; } },
  { id: "card-link", estado: "S0", regra: "card: controles por Tab e Enter", async f(p) {
      await tabAte(p, "#crd-resumo .detalhe-resumo"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
      return { ativo: await ativo(p), hash: await p.evaluate(() => location.hash), topoAbas: await p.evaluate(() => document.querySelector("#tab-requerimento").getBoundingClientRect().top) }; } },
  { id: "card-ajuda-click", estado: "S0", regra: "botão de ajuda (card): o que o clique faz", async f(p) {
      await p.click("#tip-protocolo-gatilho"); await p.waitForTimeout(400);
      return { tooltip: await vis(p, "#tip-protocolo"), ativo: await ativo(p), rotuloVisivel: await p.evaluate(() => { const s = document.querySelector("#tip-protocolo-gatilho .rotulo-botao"); const r = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { visivel: window.__u.visivel(s), caixa: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }, overflowPai: getComputedStyle(s.parentElement).overflow, clip: cs.clip, position: cs.position, cor: cs.color, fontSize: cs.fontSize, whiteSpace: cs.whiteSpace }; }) }; } },
  { id: "breadcrumb-atual", estado: "S0", regra: "breadcrumb: item atual (span tabindex=0) — o que o foco/Enter faz; estilo", async f(p) {
      await tabAte(p, ".trilha-servico [aria-current=page]");
      const r = { ativo: await ativo(p) };
      await p.keyboard.press("Enter"); await p.waitForTimeout(300);
      r.depoisEnter = { url: p.url(), ativo: await ativo(p) };
      r.estilo = await p.evaluate(() => { const s = document.querySelector(".trilha-servico [aria-current=page]"); const a = document.querySelector(".trilha-servico .crumb:nth-of-type(2) a"); const cs = getComputedStyle(s), ca = getComputedStyle(a); return { atual: { cor: cs.color, peso: cs.fontWeight, decoracao: cs.textDecorationLine, cursor: cs.cursor, fontSize: cs.fontSize }, link: { cor: ca.color, peso: ca.fontWeight, decoracao: ca.textDecorationLine, cursor: ca.cursor } }; });
      return r; } },
  { id: "cursores", estado: "S1", regra: "estados: cursor mão em interativos; não-permitido em desabilitados", async f(p) {
      return p.evaluate(() => [...document.querySelectorAll("a[href],button,[role=button],[role=tab],input,label,.br-item[role=option],[tabindex='0']")].filter(e => window.__u.visivel(e) || e.matches("input")).map(e => ({ el: window.__u.desc(e), texto: e.textContent.trim().slice(0, 30), disabled: e.disabled ?? null, cursor: getComputedStyle(e).cursor, cursorRotulo: e.labels?.[0] ? getComputedStyle(e.labels[0]).cursor : null, visivel: window.__u.visivel(e) }))); } },
  { id: "cursores-S0", estado: "S0", regra: "estados: cursor em interativos/desabilitados (etapas)", async f(p) {
      return p.evaluate(() => [...document.querySelectorAll("a[href],button,[role=button],[role=tab],[tabindex='0']")].filter(e => window.__u.visivel(e)).map(e => ({ el: window.__u.desc(e), texto: e.textContent.trim().slice(0, 30), disabled: e.disabled ?? null, cursor: getComputedStyle(e).cursor }))); } },
  { id: "redimensionar-200", estado: "S0", regra: "e-MAG 4.3 / WCAG 1.4.4–1.4.10: 200% (janela 640×450 CSS px)", async f(p) {
      await p.setViewportSize({ width: 640, height: 450 }); await p.waitForTimeout(600);
      const r = await p.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
        largos: [...document.querySelectorAll("body *")].filter(e => window.__u.visivel(e) && e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => window.__u.desc(e)).slice(0, 15),
        truncados: [...document.querySelectorAll("body *")].filter(e => window.__u.visivel(e) && (e.scrollWidth > e.clientWidth + 1) && getComputedStyle(e).overflowX === "hidden" && e.textContent.trim()).map(e => window.__u.desc(e)).slice(0, 15) }));
      await p.setViewportSize(VIEWPORT);
      return r; } },
  /* ---------------- S1 ---------------- */
  { id: "select-teclado", estado: "S1", regra: "select: Tab, abrir com foco, setas, Enter/Escape", async f(p) {
      const n = await tabAte(p, "#tipo-documento");
      const lista = () => p.evaluate(() => { const l = document.querySelector("#sel-tipo-documento .br-list"); return { visivel: window.__u.visivel(l), expandedCombobox: document.querySelector("#sel-tipo-documento .br-input").getAttribute("aria-expanded"), expandedBotao: document.querySelector("#sel-tipo-documento .br-input > button").getAttribute("aria-expanded"), activedescendant: document.querySelector("#tipo-documento").getAttribute("aria-activedescendant"), itensFocados: [...l.querySelectorAll(".br-item")].map(i => i.classList.contains("focus-visible") || document.activeElement === i || i.contains(document.activeElement)), valor: document.querySelector("#tipo-documento").value }; });
      const r = { tabs: n, foco: await ativo(p), aoFocar: await lista() };
      await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300);
      r.setaBaixo1 = { ativo: await ativo(p), ...(await lista()) };
      await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300);
      r.setaBaixo2 = { ativo: await ativo(p), ...(await lista()) };
      await p.keyboard.press("Space"); await p.waitForTimeout(300);
      r.espaco = { ativo: await ativo(p), ...(await lista()) };
      await p.keyboard.press("Enter"); await p.waitForTimeout(300);
      r.enter = { ativo: await ativo(p), ...(await lista()) };
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      r.escape = { ativo: await ativo(p), ...(await lista()) };
      return r; } },
  { id: "select-enter-no-campo", estado: "S1", regra: "select: Enter/Space com foco no campo abrem a lista?", async f(p) {
      await tabAte(p, "#tipo-documento"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
      const l = () => p.evaluate(() => window.__u.visivel(document.querySelector("#sel-tipo-documento .br-list")));
      const r = { enter: await l(), ativo: await ativo(p) };
      await p.keyboard.press("Alt+ArrowDown"); await p.waitForTimeout(300);
      r.altSetaBaixo = await l();
      return r; } },
  { id: "select-clique", estado: "S1", regra: "select: botão abre lista; sombra; posição; escolha", async f(p) {
      await p.click("#sel-tipo-documento .br-input > button"); await p.waitForTimeout(400);
      const r = { lista: await p.evaluate(() => { const l = document.querySelector("#sel-tipo-documento .br-list"); const cs = getComputedStyle(l); const ri = document.querySelector("#tipo-documento").getBoundingClientRect(), rl = l.getBoundingClientRect(); return { visivel: window.__u.visivel(l), sombra: cs.boxShadow, posicao: cs.position, zIndex: cs.zIndex, abaixoDoCampo: rl.top >= ri.bottom - 1, caixa: { x: rl.x, y: rl.y, w: rl.width, h: rl.height }, campo: { x: ri.x, w: ri.width }, itens: [...l.querySelectorAll(".br-item")].map(i => ({ texto: i.textContent.trim(), padding: getComputedStyle(i).padding, h: i.getBoundingClientRect().height, papel: i.getAttribute("role"), radioName: i.querySelector("input")?.name, radioValue: i.querySelector("input")?.value })) }; }), ativo: await ativo(p) };
      await p.mouse.move(r.lista.caixa.x + 20, r.lista.caixa.y + 20); await p.waitForTimeout(250);
      r.hoverItem = await p.evaluate(() => { const i = document.querySelector("#sel-tipo-documento .br-list .br-item:hover"); return i ? { fundo: getComputedStyle(i).backgroundColor, fundoImagem: getComputedStyle(i).backgroundImage.slice(0, 80) } : null; });
      await p.keyboard.press("Tab"); await p.waitForTimeout(200);
      r.tabComListaAberta = { ativo: await ativo(p), lista: await p.evaluate(() => window.__u.visivel(document.querySelector("#sel-tipo-documento .br-list"))) };
      return r; } },
  { id: "select-escolha", estado: "S1", regra: "select: escolher com clique preenche o campo", async f(p) {
      await p.click("#sel-tipo-documento .br-input > button"); await p.waitForTimeout(300);
      await p.click("#sel-tipo-documento .br-list .br-item:nth-of-type(3) label"); await p.waitForTimeout(400);
      return { valor: await prop(p, "#tipo-documento", "value"), lista: await p.evaluate(() => window.__u.visivel(document.querySelector("#sel-tipo-documento .br-list"))), ativo: await ativo(p) }; } },
  { id: "checkbox-pai", estado: "S1", regra: "checkbox: Tab + Space; pai/filho; estado intermediário", async f(p) {
      const est = () => p.evaluate(() => ({ todos: [document.querySelector("#avisos-todos").checked, document.querySelector("#avisos-todos").indeterminate, document.querySelector("#avisos-todos").getAttribute("aria-checked")], email: [document.querySelector("#aviso-email").checked, document.querySelector("#aviso-email").getAttribute("aria-checked")], sms: [document.querySelector("#aviso-sms").checked, document.querySelector("#aviso-sms").getAttribute("aria-checked")], viva: document.querySelector(".situacao-avisos").textContent.trim() }));
      const n = await tabAte(p, "#avisos-todos");
      const r = { tabs: n, inicial: await est() };
      await p.keyboard.press("Space"); await p.waitForTimeout(300); r.espacoPai = await est();
      await p.keyboard.press("Space"); await p.waitForTimeout(300); r.espacoPai2 = await est();
      await p.keyboard.press("Tab"); await p.waitForTimeout(120);
      r.focoFilho = await ativo(p);
      await p.keyboard.press("Space"); await p.waitForTimeout(300); r.espacoFilho = await est();
      return r; } },
  { id: "switch-teclado", estado: "S1", regra: "switch: Tab, Space e Enter alternam; aria-checked acompanha; efeito imediato", async f(p) {
      const est = () => p.evaluate(() => { const i = document.querySelector("#aviso-email"); const c = i.closest(".br-switch"); return { checked: i.checked, ariaChecked: i.getAttribute("aria-checked"), dataEnabled: c.getAttribute("data-enabled"), dataDisabled: c.getAttribute("data-disabled"), classes: c.className, viva: document.querySelector(".situacao-avisos").textContent.trim() }; });
      const n = await tabAte(p, "#aviso-email");
      const r = { tabs: n, inicial: await est() };
      await p.keyboard.press("Space"); await p.waitForTimeout(400); r.espaco = await est();
      await p.keyboard.press("Enter"); await p.waitForTimeout(400); r.enter = await est();
      await p.keyboard.press("Space"); await p.waitForTimeout(400); r.espaco2 = await est();
      r.ax = await (async () => { const cdp = await p.context().newCDPSession(p); await cdp.send("Accessibility.enable"); const { root } = await cdp.send("DOM.getDocument", { depth: -1 }); const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#aviso-email" }); const { node } = await cdp.send("DOM.describeNode", { nodeId }); const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false }); await cdp.detach(); const x = nodes[0]; return { papel: x.role?.value, nome: x.name?.value, props: Object.fromEntries((x.properties || []).map(q => [q.name, q.value?.value])) }; })();
      return r; } },
  { id: "switch-clique", estado: "S1", regra: "switch: clique no rótulo alterna; aria-checked acompanha", async f(p) {
      await p.click("label[for=aviso-sms]"); await p.waitForTimeout(400);
      return p.evaluate(() => { const i = document.querySelector("#aviso-sms"); return { checked: i.checked, ariaChecked: i.getAttribute("aria-checked"), viva: document.querySelector(".situacao-avisos").textContent.trim(), pai: [document.querySelector("#avisos-todos").checked, document.querySelector("#avisos-todos").indeterminate] }; }); } },
  { id: "upload-teclado", estado: "S1", regra: "upload: alcançável e operável por teclado; nome acessível", async f(p) {
      const n = await tabAte(p, "#upl-documento .upload-button");
      const r = { tabsAteBotao: n, inputFile: await p.evaluate(() => { const i = document.querySelector("#arquivo-documento"); const cs = getComputedStyle(i); return { tabIndex: i.tabIndex, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height, alcancadoPorTab: false }; }) };
      let chooser = false; p.once("filechooser", () => { chooser = true; });
      await p.keyboard.press("Enter"); await p.waitForTimeout(600);
      r.enterAbreSeletor = chooser;
      r.ax = await (async () => { const cdp = await p.context().newCDPSession(p); await cdp.send("Accessibility.enable"); const { root } = await cdp.send("DOM.getDocument", { depth: -1 }); const out = {}; for (const s of ["#upl-documento .upload-button", "#arquivo-documento"]) { const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: s }); const { node } = await cdp.send("DOM.describeNode", { nodeId }); const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false }); const x = nodes[0]; out[s] = { ignorado: x.ignored, motivo: (x.ignoredReasons || []).map(q => q.name), papel: x.role?.value, nome: x.name?.value, descricao: x.description?.value }; } await cdp.detach(); return out; })();
      // o input de arquivo entra na ordem de Tab?
      r.inputFile.alcancadoPorTab = (await tabAte(p, "#arquivo-documento", 40)) !== null;
      r.estiloSuperficie = await p.evaluate(() => { const b = document.querySelector("#upl-documento .upload-button"); const cs = getComputedStyle(b); return { borda: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, fundo: cs.backgroundColor, raio: cs.borderRadius, w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, texto: b.textContent.trim(), icone: b.querySelector("i")?.className }; });
      return r; } },
  { id: "enviar-enter", estado: "S1", regra: "form: Enter no botão Enviar → mesma resposta do clique; foco", async f(p) {
      await tabAte(p, ".acao-enviar"); await p.keyboard.press("Enter"); await p.waitForTimeout(600);
      return { mensagem: await vis(p, "#msg-retorno"), ativo: await ativo(p), url: p.url() }; } },
  /* ---------------- S2 ---------------- */
  { id: "erro-identificacao", estado: "S2", regra: "e-MAG 6.6 / WCAG 3.3.1, 1.4.1: campo com erro identificado e descrito por texto", async f(p) {
      return p.evaluate(() => {
        const sel = document.querySelector("#sel-tipo-documento .br-input"), inp = document.querySelector("#tipo-documento"), up = document.querySelector("#upl-documento"), fi = document.querySelector("#arquivo-documento");
        const texto = el => { const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean); return ids.map(i => document.getElementById(i)?.textContent.trim() ?? `(id ${i} ausente)`); };
        const feedbackPerto = el => [...el.closest(".campo").querySelectorAll(".feedback, [role=alert]")].map(f => ({ texto: f.textContent.trim(), visivel: window.__u.visivel(f), cor: getComputedStyle(f).color }));
        const cs = getComputedStyle(inp);
        return {
          select: { classes: sel.className, ariaInvalid: inp.getAttribute("aria-invalid"), descricao: texto(inp), feedback: feedbackPerto(sel), bordaCampo: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, corRotulo: getComputedStyle(sel.querySelector("label")).color, iconeErro: !!sel.closest(".campo").querySelector(".fa-times-circle, .fa-exclamation-triangle") },
          upload: { dataDanger: up.getAttribute("data-danger"), ariaInvalid: fi.getAttribute("aria-invalid"), descricao: texto(fi), feedback: feedbackPerto(up) },
          mensagemGeral: document.querySelector("#msg-retorno .content")?.textContent.trim(),
          linksParaCampos: [...document.querySelectorAll("#msg-retorno a")].map(a => a.getAttribute("href")),
        };
      }); } },
  { id: "erro-borda-S1", estado: "S1", regra: "referência S1: borda do campo do select antes do erro", async f(p) {
      return p.evaluate(() => { const inp = document.querySelector("#tipo-documento"); const cs = getComputedStyle(inp); return { bordaCampo: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, corRotulo: getComputedStyle(document.querySelector("#sel-tipo-documento label")).color }; }); } },
  { id: "retorno-fechar-enter", estado: "S2", regra: "message (S2): fechar (div role=button) com Enter", async f(p) {
      const r = { focoInicial: await ativo(p) };
      await p.evaluate(() => document.querySelector("#msg-retorno .fechar-mensagem").focus());
      await p.keyboard.press("Enter"); await p.waitForTimeout(500);
      r.depois = { mensagem: await vis(p, "#msg-retorno"), ativo: await ativo(p) };
      return r; } },
  { id: "retorno-fechar-espaco", estado: "S2", regra: "message (S2): fechar (div role=button) com Space", async f(p) {
      await p.evaluate(() => document.querySelector("#msg-retorno .fechar-mensagem").focus());
      const y0 = await p.evaluate(() => scrollY);
      await p.keyboard.press("Space"); await p.waitForTimeout(500);
      return { mensagem: await vis(p, "#msg-retorno"), ativo: await ativo(p), rolou: (await p.evaluate(() => scrollY)) !== y0 }; } },
  { id: "retorno-fechar-clique", estado: "S2", regra: "message (S2): fechar com clique", async f(p) {
      await p.click("#msg-retorno .fechar-mensagem"); await p.waitForTimeout(500);
      return { mensagem: await vis(p, "#msg-retorno"), ativo: await ativo(p) }; } },
  { id: "retorno-tooltip", estado: "S2", regra: "tooltip do fechar (S2) visível ao chegar no estado; posição", async f(p) {
      return p.evaluate(() => { const t = document.querySelector("#msg-retorno .br-tooltip"), g = document.querySelector("#msg-retorno .fechar-mensagem"); const rt = t.getBoundingClientRect(), rg = g.getBoundingClientRect(); return { visivel: window.__u.visivel(t), placement: t.getAttribute("data-popper-placement"), acima: rt.bottom <= rg.top + 1, sombra: getComputedStyle(t).boxShadow, gatilho: { x: rg.x, y: rg.y }, tooltip: { x: rt.x, y: rt.y, w: rt.width, h: rt.height }, dentroDaJanela: rt.left >= 0 && rt.top >= 0 && rt.right <= innerWidth && rt.bottom <= innerHeight }; }); } },
  /* ---------------- complementares ---------------- */
  { id: "acordeao-ativo", estado: "S0", regra: "accordion: cor da fonte do item expandido = estado ativo; aria-expanded", async f(p) {
      await p.click("#acc-duvidas .item:nth-of-type(1) button.header"); await p.waitForTimeout(500);
      return p.evaluate(() => [...document.querySelectorAll("#acc-duvidas .item")].map(it => { const b = it.querySelector("button.header"), t = b.querySelector(".title"), ic = b.querySelector(".icon i"); const c = document.getElementById(b.getAttribute("aria-controls"));
        return { classeItem: it.className, ariaExpanded: b.getAttribute("aria-expanded"), conteudoVisivel: window.__u.visivel(c), corTitulo: getComputedStyle(t).color, pesoTitulo: getComputedStyle(t).fontWeight, fundoItem: getComputedStyle(it).backgroundColor, icone: ic?.className }; })); } },
  { id: "acordeao-ax", estado: "S0", regra: "accordion: estado exposto na árvore AX depois de expandir", async f(p) {
      await p.click("#acc-duvidas .item:nth-of-type(1) button.header"); await p.waitForTimeout(500);
      const cdp = await p.context().newCDPSession(p); await cdp.send("Accessibility.enable"); const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#acc-duvidas .item:nth-of-type(1) button.header" }); const { node } = await cdp.send("DOM.describeNode", { nodeId });
      const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false }); await cdp.detach(); const x = nodes[0];
      return { papel: x.role?.value, nome: x.name?.value, props: Object.fromEntries((x.properties || []).map(q => [q.name, q.value?.value])), conteudoVisivel: await p.evaluate(() => window.__u.visivel(document.querySelector("#acc-duvidas-1"))) }; } },
  { id: "switch-ax-ligado", estado: "S1", regra: "switch: aria-checked e estado AX com o switch ligado", async f(p) {
      await p.click("label[for=aviso-email]"); await p.waitForTimeout(400);
      const cdp = await p.context().newCDPSession(p); await cdp.send("Accessibility.enable"); const { root } = await cdp.send("DOM.getDocument", { depth: -1 }); const out = {};
      for (const sel of ["#aviso-email", "#aviso-sms", "#avisos-todos"]) { const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel }); const { node } = await cdp.send("DOM.describeNode", { nodeId }); const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false }); const x = nodes[0];
        out[sel] = { checkedDom: await p.evaluate(s => document.querySelector(s).checked, sel), indeterminateDom: await p.evaluate(s => document.querySelector(s).indeterminate, sel), ariaChecked: await p.evaluate(s => document.querySelector(s).getAttribute("aria-checked"), sel), papel: x.role?.value, nome: x.name?.value, axChecked: Object.fromEntries((x.properties || []).map(q => [q.name, q.value?.value])).checked }; }
      await cdp.detach(); return out; } },
  { id: "select-foco-depois-escolha", estado: "S1", regra: "select: para onde vai o Tab depois de escolher com Space", async f(p) {
      await tabAte(p, "#tipo-documento"); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300); await p.keyboard.press("Space"); await p.waitForTimeout(300);
      const r = { depoisEscolha: await ativo(p), valor: await prop(p, "#tipo-documento", "value") };
      await p.keyboard.press("Tab"); await p.waitForTimeout(150); r.tab = await ativo(p);
      await p.keyboard.press("Shift+Tab"); await p.waitForTimeout(150); r.shiftTab = await ativo(p);
      return r; } },
  { id: "skiplink-setas", estado: "S0", regra: "skiplink com role=menubar: setas movem entre os menuitems?", async f(p) {
      await tabAte(p, ".atalhos-pagina > a:nth-of-type(1)");
      await p.keyboard.press("ArrowRight"); await p.waitForTimeout(200); const r = { setaDireita: await ativo(p) };
      await p.keyboard.press("ArrowDown"); await p.waitForTimeout(200); r.setaBaixo = await ativo(p);
      return r; } },
  { id: "rotulo-largo-200", estado: "S0", regra: "qual rótulo extrapola a janela de 640 px", async f(p) {
      await p.setViewportSize({ width: 640, height: 450 }); await p.waitForTimeout(600);
      const r = await p.evaluate(() => [...document.querySelectorAll(".rotulo-botao")].map(s => ({ caminho: window.__u.caminho(s), texto: s.textContent.trim(), direita: s.getBoundingClientRect().right, visivel: window.__u.visivel(s) })));
      await p.setViewportSize(VIEWPORT); return { clientWidth: 640, rotulos: r }; } },
  { id: "etapa-indicadores", estado: "S0", regra: "step: indicador (::before) de cada etapa visível?", async f(p) {
      return p.evaluate(() => [...document.querySelectorAll("#stp-andamento .step-progress-btn")].map(b => { const bf = getComputedStyle(b, "::before"); return { etapa: b.textContent.trim(), indicador: bf.content, visibility: bf.visibility, display: bf.display, opacity: bf.opacity, disabled: b.disabled }; })); } },
  { id: "foco-por-clique", estado: "S0", regra: "estados: clicar não deve gerar foco visual (foundation-global-bd9546eb77e4)", async f(p) {
      const out = {};
      for (const sel of ["#aba-documentos", "#acc-duvidas .item:nth-of-type(1) button.header", "#tip-prazo-gatilho"]) {
        const antes = await p.evaluate(s => { const cs = getComputedStyle(document.querySelector(s)); return cs.outlineStyle + " " + cs.outlineWidth + " " + cs.boxShadow; }, sel);
        await p.click(sel); await p.waitForTimeout(300);
        out[sel] = await p.evaluate(([s, antes]) => { const el = document.querySelector(s); const cs = getComputedStyle(el); return { focado: document.activeElement === el, focusVisible: el.matches(":focus-visible"), classeFocusVisible: el.classList.contains("focus-visible"), outline: cs.outlineStyle + " " + cs.outlineWidth + " " + cs.outlineColor, antes, contornoVisivel: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 }; }, [sel, antes]);
        await p.mouse.click(1270, 870); await p.waitForTimeout(150);
      }
      return out; } },
  { id: "select-digitar", estado: "S1", regra: "select: o ícone de lupa corresponde a uma ação (digitar filtra?)", async f(p) {
      await p.click("#tipo-documento"); await p.keyboard.type("pro", { delay: 60 }); await p.waitForTimeout(400);
      const r = { digitado: await prop(p, "#tipo-documento", "value"), lista: await p.evaluate(() => { const l = document.querySelector("#sel-tipo-documento .br-list"); return { visivel: window.__u.visivel(l), itensVisiveis: [...l.querySelectorAll(".br-item")].filter(i => window.__u.visivel(i)).map(i => i.textContent.trim()) }; }) };
      for (let i = 0; i < 3; i++) await p.keyboard.press("Backspace");
      await p.waitForTimeout(300);
      r.apagado = { valor: await prop(p, "#tipo-documento", "value"), placeholderVisivel: await p.evaluate(() => document.querySelector("#tipo-documento").matches(":placeholder-shown")) };
      return r; } },
  { id: "select-sem-resultado", estado: "S1", regra: "select: pesquisa sem resultado mostra feedback (Empty State / item not-found)?", async f(p) {
      await p.click("#tipo-documento"); await p.keyboard.type("xyz", { delay: 60 }); await p.waitForTimeout(500);
      return p.evaluate(() => { const l = document.querySelector("#sel-tipo-documento .br-list"); return { listaVisivel: window.__u.visivel(l), itensVisiveis: [...l.querySelectorAll(".br-item")].filter(i => window.__u.visivel(i)).map(i => ({ texto: i.textContent.trim(), classes: i.className })), notFound: [...document.querySelectorAll("#sel-tipo-documento .not-found")].map(n => ({ texto: n.textContent.trim(), classes: n.className, visivel: window.__u.visivel(n) })), feedbackAbaixo: [...document.querySelectorAll("#sel-tipo-documento ~ .feedback, #sel-tipo-documento .feedback")].map(f => f.textContent.trim()) }; }); } },
];

const so = process.argv.slice(2);
const navegador = await abrirNavegador();
const saida = {};
try {
  for (const s of SONDAS) {
    if (so.length && !so.some(x => s.id.includes(x))) continue;
    let tent = 0, r;
    while (tent < 2) {
      const np = await irPara(navegador, E[s.estado]);
      await np.pagina.evaluate(UTIL);
      const navAntes = np.navegacoes.length, cargasAntes = np.cargas.length;
      try { r = await s.f(np.pagina); } catch (e) { r = { erro: String(e.message).slice(0, 300) }; }
      const ms = Date.now() - np.t0, navs = np.navegacoes.length - navAntes, recargas = np.cargas.length - cargasAntes;
      await np.contexto.close();
      r = { _ms_desde_carga: ms, _navegacoesDuranteSonda: navs, _documentosNovosDuranteSonda: recargas, ...r };
      if (ms <= 120000 && recargas === 0) break;
      tent++;
    }
    (saida[s.estado] = saida[s.estado] || {})[s.id] = { regra: s.regra, ...r };
    console.log(s.estado, s.id, JSON.stringify(r).slice(0, 220));
  }
} finally { await navegador.close(); }
for (const [est, sondas] of Object.entries(saida)) {
  mkdirSync(join(MEDIDAS, est), { recursive: true });
  const arq = join(MEDIDAS, est, "interacoes.json");
  let ant = {}; try { ant = JSON.parse((await import("fs")).readFileSync(arq, "utf8")).dados; } catch {}
  writeFileSync(arq, JSON.stringify({ _meta: { estado: est, medidoEm: new Date().toISOString(), viewport: "1280x900", headless: true }, dados: so.length ? { ...ant, ...sondas } : sondas }, null, 1) + "\n");
}
void novaPagina; void carregar;
