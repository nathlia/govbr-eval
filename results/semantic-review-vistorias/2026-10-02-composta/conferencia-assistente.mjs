/**
 * Conferência do assistente (D-48) para a revisão da Vistorias composta — sem modelo, sem oráculo,
 * sem axe. Re-mede, na tela congelada, o que as alegações das execuções revisadas (as duas em
 * 1280 e as duas linhas de base, D-63) afirmam e a auditoria da referência não mediu. O que a
 * auditoria já mede (B-01…B-29) é reconfirmado por `node tela-b/vistorias/conferir-auditoria.mjs`.
 *
 * Uso (de govbr-eval): node results/semantic-review-vistorias/2026-10-02-composta/conferencia-assistente.mjs
 * Grava conferencia-assistente.json ao lado.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { servir, abrirNavegador, novaPagina, carregar, executarPassos, PRELUDIO, conferirManifesto } from "../../../tela-b/vistorias/comum.mjs";
import { SETUP } from "../../../tela-b/vistorias/sequencia.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const m = conferirManifesto();
if (m.divergentes.length || m.ausentes.length || m.fora.length) throw new Error("árvore pnip/ diverge do manifesto");

const { servidor, base } = await servir();
const navegador = await abrirNavegador();
const saida = { manifesto: m.manifestoSha, medidas: {} };
const med = (id, v) => { saida.medidas[id] = v; console.log(id, JSON.stringify(v).slice(0, 400)); };

const AX = async (contexto, pagina, seletor) => {
  // nome/papel na árvore do Chromium dos elementos que casam `seletor` (com >>>)
  await pagina.evaluate(`(() => { ${PRELUDIO} queryAll(${JSON.stringify(seletor)}).forEach((e, i) => e.setAttribute("data-conf-i", String(i))); })()`);
  const cdp = await contexto.newCDPSession(pagina);
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const porBackend = new Map();
  const visitar = n => { if (n.attributes) { const k = n.attributes.indexOf("data-conf-i"); if (k >= 0) porBackend.set(n.backendNodeId, +n.attributes[k + 1]); } for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? [])]) visitar(c); };
  visitar(root);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const out = [];
  for (const n of nodes) { const i = porBackend.get(n.backendDOMNodeId); if (i != null) out[i] = { papel: n.role?.value, nome: n.name?.value ?? "", ignorado: !!n.ignored }; }
  await pagina.evaluate(`(() => { ${PRELUDIO} queryAll(${JSON.stringify(seletor)}).forEach(e => e.removeAttribute("data-conf-i")); })()`);
  return out;
};
const NA = (pagina, corpo) => pagina.evaluate(`(() => { ${PRELUDIO} ${corpo} })()`);
// regras CSS de folhas acessíveis que casam o elemento e declaram a propriedade
const REGRAS = `const regras = (el, props) => { const out = []; const raiz = el.getRootNode();
  const folhas = [...(raiz.styleSheets ?? []), ...(raiz.adoptedStyleSheets ?? [])];
  const andar = (lista, href) => { for (const r of lista) { if (r.cssRules && !r.selectorText) { andar(r.cssRules, href); continue; } if (!r.selectorText) continue; let casa = false; try { casa = el.matches(r.selectorText); } catch {} if (!casa) continue; for (const p of props) { const v = r.style.getPropertyValue(p); if (v) out.push({ sel: r.selectorText.slice(0, 160), prop: p, v, folha: href }); } } };
  for (const f of folhas) { try { andar(f.cssRules, (f.href || (f.ownerNode ? f.ownerNode.tagName : "adopted")).split("/").pop()); } catch {} }
  return { inline: el.getAttribute("style"), naSombraDe: raiz.host ? raiz.host.tagName.toLowerCase() : null, regras: out }; };`;

// ── inicial ─────────────────────────────────────────────────────────────────────────────────────
{
  const { contexto, pagina } = await novaPagina(navegador);
  await carregar(pagina, base);
  const acoes = "pnip-propesc-vistorias tbody td:nth-of-type(9) br-button >>> button";
  const ax = await AX(contexto, pagina, acoes);
  const hosts = await NA(pagina, `return queryAll("pnip-propesc-vistorias tbody td:nth-of-type(9) br-button").map(h => ({ icon: h.getAttribute("icon"), title: h.getAttribute("title"), ariaLabel: h.getAttribute("aria-label") }));`);
  const porIcone = {};
  hosts.forEach((h, i) => { const k = h.icon; (porIcone[k] ??= { n: 0, nomes: new Set(), titles: new Set() }); porIcone[k].n++; porIcone[k].nomes.add(ax[i]?.nome ?? "?"); porIcone[k].titles.add(h.title); });
  med("acoes-linha: nome acessível por ícone", Object.fromEntries(Object.entries(porIcone).map(([k, v]) => [k, { n: v.n, nomes: [...v.nomes], titleHospedeiro: [...v.titles] }])));

  med("paginação: li filho de li", await NA(pagina, `const li = queryAll("govbr-custom-pagination li").filter(l => l.parentElement && l.parentElement.tagName === "LI"); const atual = queryAll("govbr-custom-pagination a.page.active")[0];
    return { n: li.length, textos: li.map(l => l.textContent.trim()), definidoPeloDS: !!customElements.get("govbr-custom-pagination"), atual: atual ? { texto: atual.textContent.trim(), ariaCurrent: atual.getAttribute("aria-current") } : null };`));
  med("abas: estado selecionado", await NA(pagina, `return queryAll(".br-tab .tab-item").map(li => { const b = li.querySelector("button"); return { texto: b.textContent.trim(), liActive: li.classList.contains("active"), role: b.getAttribute("role"), ariaSelected: b.getAttribute("aria-selected"), ariaCurrent: b.getAttribute("aria-current") }; });`));
  const icones = "pnip-filter-panel i, pnip-propesc-vistorias i.fa-clock, pnip-propesc-vistorias .fa-clock";
  const axIc = await AX(contexto, pagina, icones);
  const ic = await NA(pagina, `return queryAll(${JSON.stringify(icones)}).map(i => ({ classe: i.className, ariaHidden: i.getAttribute("aria-hidden"), antes: getComputedStyle(i, "::before").content.codePointAt(1)?.toString(16) ?? null, visivel: visivel(i) }));`);
  med("ícones do painel de filtros e relógio", ic.map((x, k) => ({ ...x, ax: axIc[k] ?? null })));
  // texto PUA exposto na árvore (StaticText com caractere da área privativa)
  {
    const cdp = await contexto.newCDPSession(pagina); const { nodes } = await cdp.send("Accessibility.getFullAXTree"); await cdp.detach();
    const pua = nodes.filter(n => !n.ignored && /[-]/.test(n.name?.value ?? "")).map(n => ({ papel: n.role?.value, nome: JSON.stringify(n.name.value) }));
    med("árvore: nós com caractere da área privativa (PUA)", { n: pua.length, amostra: pua.slice(0, 12) });
  }
  med("breadcrumb: div.br-breadcrumb e links", await NA(pagina, `${REGRAS} const d = queryAll("pnip-propesc-vistorias br-breadcrumb >>> div")[0]; const a = queryAll("pnip-propesc-vistorias br-breadcrumb >>> div>ul>li a")[0];
    return { brBreadcrumbDoDS: !!customElements.get("br-breadcrumb"), div: d ? { classe: d.className, naSombraDe: d.getRootNode().host?.tagName.toLowerCase() } : null, link: a ? { padding: getComputedStyle(a).padding, ...regras(a, ["padding", "padding-left", "padding-right"]) } : null };`));
  med("tokens: Buscar (margin -38px)", await NA(pagina, `${REGRAS} const b = queryAll("pnip-search-table-utils button")[0]; return { margin: getComputedStyle(b).margin, texto: b.textContent.trim(), classe: b.className, ...regras(b, ["margin", "margin-top", "margin-right"]) };`));
  med("tokens: botão do painel de filtros (margin -5px)", await NA(pagina, `${REGRAS} const b = queryAll("pnip-filter-panel>div>div:nth-of-type(5)>button")[0]; return b ? { margin: getComputedStyle(b).margin, texto: b.textContent.trim(), classe: b.className, ...regras(b, ["margin", "margin-top"]) } : null;`));
  med("tokens: botão do cabeçalho (radius 20px, oculto na inicial)", await NA(pagina, `${REGRAS} const b = queryAll("pnip-header>div>div>div>button")[0]; return b ? { radius: getComputedStyle(b).borderRadius, texto: b.textContent.trim().slice(0, 40), classe: b.className, visivel: visivel(b), ...regras(b, ["border-radius"]) } : null;`));
  med("tokens: padding 0 6px (inicial)", await NA(pagina, `${REGRAS} return queryAll("*").filter(e => { const c = getComputedStyle(e); return c.paddingLeft === "6px" && c.paddingRight === "6px" && c.paddingTop === "0px" && visivel(e); }).map(e => ({ chave: chave(e).slice(-90), ...regras(e, ["padding"]) })).slice(0, 6);`));
  med("th da coluna de caixas", await NA(pagina, `const th = queryAll("pnip-propesc-vistorias thead th")[1]; return { texto: th.textContent.trim(), filhos: [...th.children].map(c => c.tagName + (c.type ? "[" + c.type + "]" : "")), ariaLabel: th.getAttribute("aria-label") };`));
  await contexto.close();
}

// ── busca sem resultado ─────────────────────────────────────────────────────────────────────────
{
  const { contexto, pagina } = await novaPagina(navegador);
  await carregar(pagina, base);
  const antes = await NA(pagina, `return queryAll("[aria-live],[role=status],[role=alert]").map(e => chave(e).slice(-60) + " live=" + e.getAttribute("aria-live"));`);
  await pagina.locator("pnip-search-table-utils input, pnip-propesc-vistorias br-input input#search").first().fill("zzzznaoexiste");
  await pagina.keyboard.press("Enter");
  await pagina.waitForTimeout(1500);
  med("busca sem resultado", await NA(pagina, `const p = queryAll("pnip-propesc-vistorias div.p-5 p")[0]; const at = ativoProfundo();
    return { vivasAntes: ${JSON.stringify(antes)}, vivasDepois: queryAll("[aria-live],[role=status],[role=alert]").map(e => chave(e).slice(-60)), mensagem: p ? { texto: p.textContent.trim(), role: p.getAttribute("role"), live: p.getAttribute("aria-live"), ancestralVivo: !!p.closest("[aria-live],[role=status],[role=alert]") } : null, linhas: queryAll("pnip-propesc-vistorias tbody tr").length, titulos: queryAll("h1,h2,h3,h4,h5,h6").map(h => h.tagName + " " + h.textContent.trim().slice(0, 30)), foco: at ? at.tagName + "#" + at.id : null };`));
  await contexto.close();
}

// ── filtro Cidade: opções e botão de remover ────────────────────────────────────────────────────
{
  const { contexto, pagina } = await novaPagina(navegador);
  await carregar(pagina, base);
  await pagina.locator("pnip-filter-panel span.br-tag", { hasText: "Cidade" }).first().click();
  await pagina.waitForTimeout(600);
  med("filtro Cidade aberto: opções", await NA(pagina, `const painel = queryAll("pnip-filter-panel .br-select, pnip-filter-panel .br-list").filter(visivel)[0]; if (!painel) return null; const itens = [...painel.querySelectorAll(".br-item")];
    return { itens: itens.length, primeiro: itens[0] ? itens[0].outerHTML.slice(0, 220) : null, inputs: painel.querySelectorAll("input").length, radios: painel.querySelectorAll("input[type=radio]").length, focalizaveis: [...painel.querySelectorAll("input,button,a[href],[tabindex]")].filter(e => e.tabIndex >= 0).length, labelsComFor: [...painel.querySelectorAll("label")].filter(l => l.htmlFor).length };`));
  const opcao = pagina.locator("pnip-filter-panel .br-item").filter({ visible: true }).first();
  const textoOpcao = (await opcao.textContent()).trim();
  await opcao.click();
  await pagina.waitForTimeout(800);
  const sel = "pnip-filter-panel span.br-tag button";
  const axRem = await AX(contexto, pagina, sel);
  med("filtro aplicado: botão de remover", { opcao: textoOpcao, botoes: (await NA(pagina, `return queryAll(${JSON.stringify(sel)}).map(b => ({ html: b.outerHTML.slice(0, 160), ariaLabel: b.getAttribute("aria-label"), title: b.getAttribute("title"), texto: b.textContent.trim() }));`)).map((b, i) => ({ ...b, ax: axRem[i] ?? null })) });
  await contexto.close();
}

// ── intervalo de datas invertido ────────────────────────────────────────────────────────────────
{
  const { contexto, pagina } = await novaPagina(navegador);
  await carregar(pagina, base);
  const datas = pagina.locator("pnip-propesc-vistorias br-input[type=date] input");
  await datas.nth(0).fill("2026-05-01");
  await datas.nth(1).fill("2026-01-01");
  await datas.nth(1).press("Tab");
  await pagina.waitForTimeout(1500);
  med("datas invertidas", await NA(pagina, `const ins = queryAll("pnip-propesc-vistorias br-input[type=date] >>> input"); const p = queryAll("pnip-propesc-vistorias div.p-5 p")[0];
    return { valores: ins.map(i => i.value), ariaInvalid: ins.map(i => i.getAttribute("aria-invalid")), describedby: ins.map(i => i.getAttribute("aria-describedby")), etiqueta: queryAll("pnip-propesc-vistorias div:nth-of-type(2)>span").map(s => s.textContent.trim()).filter(Boolean).slice(0, 3), mensagem: p ? p.textContent.trim() : null, erroNoDom: queryAll(".feedback.danger, .text-danger, [role=alert], .invalid-feedback").filter(visivel).map(e => e.textContent.trim().slice(0, 60)), linhas: queryAll("pnip-propesc-vistorias tbody tr").length };`));
  await contexto.close();
}

// ── aba Agendar: etiqueta de status ─────────────────────────────────────────────────────────────
{
  const { contexto, pagina } = await novaPagina(navegador);
  await carregar(pagina, base);
  await pagina.locator(".br-tab .tab-item button", { hasText: "Agendar" }).first().click();
  await pagina.waitForTimeout(1500);
  med("aba Agendar: etiquetas de status", await NA(pagina, `
    const rgba = s => { const m = s.match(/rgba?[(]([^)]+)[)]/); const p = m[1].split(",").map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const fundo = el => { let e = el; while (e) { const c = rgba(getComputedStyle(e).backgroundColor); if (c.a === 1) return c; e = e.parentElement; } return { r: 255, g: 255, b: 255 }; };
    const els = queryAll("pnip-propesc-vistorias tbody td:nth-of-type(8) pnip-status-solicitacao-utils div>div>div");
    return els.map(e => { const fg = rgba(getComputedStyle(e).color), bg = fundo(e); const a = lum(fg), b = lum(bg); return { texto: e.textContent.trim(), cor: getComputedStyle(e).color, fundo: "rgb(" + bg.r + "," + bg.g + "," + bg.b + ")", px: getComputedStyle(e).fontSize, peso: getComputedStyle(e).fontWeight, razao: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 }; }).slice(0, 3).concat([{ total: els.length }]);`));
  await contexto.close();
}

// ── 320 px ──────────────────────────────────────────────────────────────────────────────────────
for (const [w, h] of [[320, 640], [320, 800]]) {
  const { contexto, pagina } = await novaPagina(navegador);
  await pagina.setViewportSize({ width: w, height: h });
  await carregar(pagina, base);
  med(`reflow ${w}x${h}`, await NA(pagina, `const d = document.documentElement; const r = e => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right), w: Math.round(b.width) }; };
    const nav = queryAll("pnip-propesc-vistorias .br-tab nav, pnip-propesc-vistorias nav.tab-nav")[0]; const abas = queryAll(".br-tab .tab-item");
    const filtro = queryAll("pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>div")[0]; const tabela = queryAll("pnip-propesc-vistorias table")[0]; const cont = tabela.parentElement;
    return { doc: { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth }, nav: nav ? { overflowX: getComputedStyle(nav).overflowX, scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth, ...r(nav) } : null, ultimaAba: abas.length ? r(abas[abas.length - 1]) : null, filtroDatas: filtro ? { ...r(filtro), flexWrap: getComputedStyle(filtro).flexWrap } : null, tabela: r(tabela), contTabela: { classe: cont.className, overflowX: getComputedStyle(cont).overflowX, scrollWidth: cont.scrollWidth, clientWidth: cont.clientWidth }, ancestralComScroll: (() => { let e = tabela.parentElement; while (e && e !== document.body) { const o = getComputedStyle(e).overflowX; if (o === "auto" || o === "scroll") return e.className || e.tagName; e = e.parentElement; } return null; })() };`));
  await contexto.close();
}

// ── paradas do plano: detalhe-menu e modal ──────────────────────────────────────────────────────
{
  const { contexto, pagina } = await novaPagina(navegador);
  await carregar(pagina, base);
  await executarPassos(pagina, SETUP.slice(0, 3));
  med("detalhe-menu: títulos, landmark do menu, botão Sair, textarea", await NA(pagina, `${REGRAS}
    const menu = queryAll("#avatar-menu")[0]; const marco = e => { let x = e; while (x) { const t = x.tagName; const role = x.getAttribute && x.getAttribute("role"); if (["HEADER", "MAIN", "NAV", "FOOTER", "ASIDE", "FORM"].includes(t) || ["banner", "main", "navigation", "contentinfo", "complementary", "region", "search", "form"].includes(role)) return t + (role ? "[" + role + "]" : ""); x = x.parentElement || (x.getRootNode().host ?? null); } return null; };
    const sair = queryAll("pnip-header>div>div>div>button")[0]; const ta = queryAll("pnip-propesc-nao-comparecimento textarea")[0];
    return { h: queryAll("h1,h2,h3,h4,h5,h6").map(h => h.tagName), menuDentroDeMarco: menu ? marco(menu) : "sem menu", sair: sair ? { radius: getComputedStyle(sair).borderRadius, ...regras(sair, ["border-radius"]) } : null, textarea: ta ? { radius: getComputedStyle(ta).borderRadius, ...regras(ta, ["border-radius"]) } : null,
      breadcrumbLinkPadding: (() => { const a = queryAll("pnip-propesc-agendar-vistoria br-breadcrumb >>> div>ul>li a"); return a.map(x => ({ padding: getComputedStyle(x).padding, ...regras(x, ["padding"]) })).slice(0, 2); })() };`));
  await executarPassos(pagina, SETUP.slice(3));
  const rolavel = "pnip-propesc-trocar-embarcacao>div>div>div:nth-of-type(2)>div:nth-of-type(2)";
  med("modal: região rolável da lista de embarcações", await NA(pagina, `${REGRAS} const r = queryAll(${JSON.stringify(rolavel)})[0]; const ta = queryAll("pnip-propesc-agendar-vistoria form>div:nth-of-type(4)>div:nth-of-type(2)>div:nth-of-type(3)>div>textarea")[0];
    return { regiao: r ? { classe: r.className, overflowY: getComputedStyle(r).overflowY, scrollHeight: r.scrollHeight, clientHeight: r.clientHeight, tabindex: r.getAttribute("tabindex"), focalizaveisDentro: [...r.querySelectorAll("*")].filter(e => e.tabIndex >= 0).map(e => e.tagName + "." + e.className.toString().slice(0, 30)).slice(0, 5), nFocalizaveis: [...r.querySelectorAll("*")].filter(e => e.tabIndex >= 0).length } : null,
      textareaOculta: ta ? { radius: getComputedStyle(ta).borderRadius, visivel: visivel(ta), ...regras(ta, ["border-radius"]) } : null };`));
  // Tab real dentro do modal: a lista recebe foco?
  await pagina.locator(".br-modal").first().focus().catch(() => {});
  const passos = [];
  for (let i = 0; i < 12; i++) { await pagina.keyboard.press("Tab"); passos.push(await NA(pagina, `const a = ativoProfundo(); return a ? a.tagName + "." + String(a.className).slice(0, 40) + (a.closest && a.closest("pnip-propesc-trocar-embarcacao") ? " [modal]" : "") : null;`)); }
  med("modal: 12 Tabs", passos);
  await contexto.close();
}

writeFileSync(join(AQUI, "conferencia-assistente.json"), JSON.stringify(saida, null, 2) + "\n");
await navegador.close();
servidor.close();
