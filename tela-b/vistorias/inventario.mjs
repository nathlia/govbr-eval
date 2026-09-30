/**
 * Inventário da tela Vistorias, por estado (metodo-auditoria.md § 3.1; adendo § F: inventario.json
 * por estado) — fato de DOM, sem modelo e sem oráculo.
 *
 * Para cada parada de sequencia.mjs, em carga nova e pelo mesmo setup: todo elemento do light DOM e
 * das shadow roots abertas (tag, classes br-*, caixa, visibilidade, focabilidade, texto próprio),
 * papel e nome acessíveis (CDP Accessibility.getFullAXTree, ligados ao elemento por `data-aud-i`
 * posto DEPOIS das outras medidas), estruturas de página (título, lang, marcos, cabeçalhos, tabelas,
 * campos e rótulos, imagens, links, diálogos), cores e tipografia computadas, contraste (fórmula da
 * WCAG sobre cor computada e primeiro fundo opaco), truncamento, rolagem horizontal e a ordem de Tab
 * real (pausa de 300 ms por tecla: focar a busca recarrega a lista, ver auditoria.md § 4) com o
 * estilo computado de cada ponto de foco.
 *
 * Uso: node tela-b/vistorias/inventario.mjs [--headed]  → tela-b/vistorias/inventario.json
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { exigirManifesto, servir, abrirNavegador, novaPagina, carregar, executarPassos, PRELUDIO, RAIZ_EVAL } from "./comum.mjs";
import { SETUP, STATES } from "./sequencia.mjs";

const manifesto = exigirManifesto();

export const MEDIR = `(() => {
${PRELUDIO}
  const paiComposto = el => el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el).host : null);
  const rgba = s => { const m = s.match(/rgba?[(]([^)]+)[)]/); if (!m) return null; const p = m[1].split(",").map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fundoDe = el => {
    let e = el;
    while (e) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { resolvido: false, motivo: "imagem/gradiente em " + chave(e) };
      const c = rgba(cs.backgroundColor);
      if (c && c.a === 1) return { resolvido: true, cor: cs.backgroundColor, de: chave(e) };
      if (c && c.a > 0) return { resolvido: false, motivo: "fundo translúcido " + cs.backgroundColor + " em " + chave(e) };
      e = paiComposto(e);
    }
    return { resolvido: true, cor: "rgb(255, 255, 255)", de: "canvas" };
  };
  const txt = el => Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join("").split(/[ \\n\\t]+/).join(" ").trim();
  const els = todos();
  const focavel = el => el.tabIndex >= 0 && visivel(el) && !el.disabled;
  const elementos = els.map((el, i) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { i, chave: chave(el), tag: el.tagName.toLowerCase(), sombra: ehSombra(raizDe(el)), id: el.id || null,
      classes: (el.getAttribute("class") || "").split(" ").filter(Boolean),
      atributos: Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("_ng") && a.name !== "class" && a.name !== "style").map(a => [a.name, a.value.slice(0, 80)])),
      estiloInline: el.getAttribute("style") || null,
      caixa: [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)],
      visivel: visivel(el), focavel: focavel(el), tabIndex: el.tabIndex, texto: txt(el).slice(0, 60),
      conhecido: !(el instanceof HTMLUnknownElement), customizado: el.tagName.includes("-"),
      definido: el.tagName.includes("-") ? !!customElements.get(el.tagName.toLowerCase()) : null };
  });
  const contraste = els.filter(visivel).filter(el => txt(el)).map(el => {
    const cs = getComputedStyle(el); const fg = rgba(cs.color); const fundo = fundoDe(el);
    const base = { chave: chave(el), texto: txt(el).slice(0, 40), cor: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fundo };
    if (!fundo.resolvido || !fg || fg.a !== 1) return { ...base, razao: null };
    const bg = rgba(fundo.cor); const l1 = lum(fg), l2 = lum(bg);
    return { ...base, razao: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100 };
  });
  const cabecalhos = els.filter(e => /^H[1-6]$/.test(e.tagName)).map(e => ({ chave: chave(e), nivel: +e.tagName[1], visivel: visivel(e), texto: e.textContent.split(/[ \\n\\t]+/).join(" ").trim().slice(0, 70) }));
  const tabelas = els.filter(e => e.tagName === "TABLE").map(t => ({ chave: chave(t), visivel: visivel(t), caption: t.caption ? t.caption.textContent.trim() : null,
    ariaLabel: t.getAttribute("aria-label"), ariaLabelledby: t.getAttribute("aria-labelledby"), largura: Math.round(t.getBoundingClientRect().width), scrollWidth: t.scrollWidth,
    th: Array.from(t.querySelectorAll("th")).map(th => ({ texto: th.textContent.trim(), scope: th.getAttribute("scope"), filhos: Array.from(th.children).map(c => c.tagName.toLowerCase() + (c.type ? "[" + c.type + "]" : "")) })),
    linhas: t.tBodies[0] ? t.tBodies[0].rows.length : 0, tdsEmThead: t.tHead ? t.tHead.querySelectorAll("td").length : 0 }));
  const campos = els.filter(e => ["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName) && e.type !== "hidden").map(e => ({ chave: chave(e), tipo: e.type, id: e.id || null, visivel: visivel(e),
    labels: e.labels ? Array.from(e.labels).map(l => l.textContent.trim()) : [], ariaLabel: e.getAttribute("aria-label"), ariaLabelledby: e.getAttribute("aria-labelledby"),
    placeholder: e.getAttribute("placeholder"), title: e.getAttribute("title"), readOnly: e.readOnly, disabled: e.disabled, required: e.required, valor: (e.value || "").slice(0, 30),
    largura: e.clientWidth, scrollWidth: e.scrollWidth, fieldset: !!e.closest("fieldset") }));
  const botoes = els.filter(e => e.tagName === "BUTTON" || e.getAttribute("role") === "button").map(e => { const h = ehSombra(raizDe(e)) ? raizDe(e).host : null; const r = e.getBoundingClientRect();
    return { chave: chave(e), visivel: visivel(e), classes: (e.getAttribute("class") || "").split(" ").filter(Boolean), texto: e.textContent.split(/[ \\n\\t]+/).join(" ").trim().slice(0, 40),
      ariaLabel: e.getAttribute("aria-label"), title: e.getAttribute("title"), hospedeiro: h ? { tag: h.tagName.toLowerCase(), icon: h.getAttribute("icon"), label: h.getAttribute("label"), title: h.getAttribute("title"), type: h.getAttribute("type"), circle: h.hasAttribute("circle") } : null,
      w: Math.round(r.width), h: Math.round(r.height) }; });
  const imagens = els.filter(e => e.tagName === "IMG").map(e => ({ chave: chave(e), alt: e.getAttribute("alt"), src: e.getAttribute("src"), naturalWidth: e.naturalWidth, visivel: visivel(e), sombra: ehSombra(raizDe(e)) }));
  const links = els.filter(e => e.tagName === "A").map(e => ({ chave: chave(e), href: e.getAttribute("href"), texto: e.textContent.trim(), visivel: visivel(e), ariaCurrent: e.getAttribute("aria-current") }));
  const dialogos = els.filter(e => e.getAttribute("role") === "dialog" || e.getAttribute("role") === "alertdialog" || (e.classList && (e.classList.contains("br-modal") || e.classList.contains("swal2-popup")))).map(e => ({ chave: chave(e), visivel: visivel(e), role: e.getAttribute("role"), ariaModal: e.getAttribute("aria-modal"), ariaLabelledby: e.getAttribute("aria-labelledby"), ariaLabel: e.getAttribute("aria-label"), classes: (e.getAttribute("class") || "").split(" ").filter(Boolean) }));
  const truncados = els.filter(visivel).filter(e => { const cs = getComputedStyle(e); const conteudo = txt(e) || (e.tagName === "INPUT" ? (e.value || e.placeholder) : "");
    return conteudo && e.scrollWidth > e.clientWidth + 1 && (cs.overflow !== "visible" || cs.textOverflow === "ellipsis" || e.tagName === "INPUT"); })
    .map(e => { const cs = getComputedStyle(e); return { chave: chave(e), tag: e.tagName.toLowerCase(), conteudo: (txt(e) || e.value || e.placeholder || "").slice(0, 40), mostraValor: !!e.value, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth, overflow: cs.overflow, textOverflow: cs.textOverflow }; });
  const cores = {};
  for (const el of els.filter(visivel)) {
    const cs = getComputedStyle(el);
    const add = (prop, v) => { if (!v || v === "rgba(0, 0, 0, 0)") return; const k = prop + (ehSombra(raizDe(el)) ? "@sombra" : "@light"); (cores[v] = cores[v] || {})[k] = (cores[v][k] || 0) + 1; };
    if (txt(el)) add("color", cs.color);
    add("background-color", cs.backgroundColor);
    for (const lado of ["top", "right", "bottom", "left"]) if (parseFloat(cs.getPropertyValue("border-" + lado + "-width")) > 0 && cs.getPropertyValue("border-" + lado + "-style") !== "none") add("border-color", cs.getPropertyValue("border-" + lado + "-color"));
  }
  const tipografia = {};
  for (const el of els.filter(visivel).filter(e => txt(e))) { const cs = getComputedStyle(el); const k = cs.fontFamily + " | " + cs.fontSize + " | " + cs.fontWeight; tipografia[k] = (tipografia[k] || 0) + 1; }
  const focaveis = els.filter(focavel).map(e => { const c = getComputedStyle(e); return { chave: chave(e), outline: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, boxShadow: c.boxShadow, borda: c.borderTopWidth + " " + c.borderTopStyle + " " + c.borderTopColor }; });
  return {
    path: location.pathname, titulo: document.title, lang: document.documentElement.getAttribute("lang"),
    metaRefresh: !!document.querySelector("meta[http-equiv=refresh i]"),
    scripts: Array.from(document.scripts).map(s => ({ src: s.getAttribute("src"), type: s.getAttribute("type") })),
    cabeca: Array.from(document.head.children).map(e => e.tagName.toLowerCase() + (e.getAttribute("href") ? " " + e.getAttribute("href") : "") + (e.getAttribute("src") ? " " + e.getAttribute("src") : "")),
    elementos, contraste, cabecalhos, tabelas, campos, botoes, imagens, links, dialogos, truncados, cores, tipografia, focaveis,
    rolagemHorizontal: { documento: document.documentElement.scrollWidth, janela: innerWidth },
    animacoes: document.getAnimations().length,
  };
})()`;

export async function arvoreAx(contexto, pagina, elementos) {
  await pagina.evaluate(`(() => { ${PRELUDIO} todos().forEach((e, i) => e.setAttribute("data-aud-i", String(i))); })()`);
  const cdp = await contexto.newCDPSession(pagina);
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const porBackend = new Map();
  const visitar = n => {
    if (n.attributes) { const k = n.attributes.indexOf("data-aud-i"); if (k >= 0) porBackend.set(n.backendNodeId, +n.attributes[k + 1]); }
    for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? [])]) visitar(c);
  };
  visitar(root);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  for (const n of nodes) {
    if (n.backendDOMNodeId == null) continue;
    const i = porBackend.get(n.backendDOMNodeId);
    if (i == null || !elementos[i]) continue;
    elementos[i].ax = { ignorado: !!n.ignored, papel: n.role?.value ?? null, nome: n.name?.value ?? "",
      props: Object.fromEntries((n.properties ?? []).filter(p => ["expanded", "selected", "checked", "modal", "level", "hasPopup", "focusable"].includes(p.name)).map(p => [p.name, p.value?.value])) };
  }
  await pagina.evaluate(`(() => { ${PRELUDIO} todos().forEach(e => e.removeAttribute("data-aud-i")); })()`);
  return nodes.filter(n => !n.ignored && ["banner", "main", "contentinfo", "navigation", "complementary", "region", "search", "form", "dialog", "alertdialog"].includes(n.role?.value))
    .map(n => ({ papel: n.role.value, nome: n.name?.value ?? "", elemento: elementos[porBackend.get(n.backendDOMNodeId)]?.chave ?? null }));
}

/** Tab real a partir do corpo; pausa entre teclas; para ao voltar ao primeiro ponto ou em 200. */
export async function ordemTab(pagina, max = 200) {
  await pagina.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  const ordem = [];
  for (let k = 0; k < max; k++) {
    await pagina.keyboard.press("Tab");
    await pagina.waitForTimeout(300);
    const f = await pagina.evaluate(`(() => { ${PRELUDIO} const a = ativoProfundo(); if (!a || a === document.body) return { chave: "body" };
      const c = getComputedStyle(a); const r = a.getBoundingClientRect();
      return { chave: chave(a), tag: a.tagName.toLowerCase(), outline: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, outlineOffset: c.outlineOffset, boxShadow: c.boxShadow, borda: c.borderTopWidth + " " + c.borderTopStyle + " " + c.borderTopColor, focusVisible: a.matches(":focus-visible"), caixa: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; })()`);
    ordem.push(f);
    if (k > 0 && f.chave === ordem[0].chave) break;
  }
  return ordem;
}

async function main() {
  const { servidor, base } = await servir();
  const navegador = await abrirNavegador();
  const saida = { manifesto: { sha256: manifesto.manifestoSha, arquivos: manifesto.n }, medidoEm: new Date().toISOString(), estados: {} };
  try {
    for (const st of STATES) {
      const { contexto, pagina, escritas, externos } = await novaPagina(navegador);
      await carregar(pagina, base);
      await executarPassos(pagina, SETUP.slice(0, st.afterStep));
      const inv = await pagina.evaluate(MEDIR);
      inv.marcos = await arvoreAx(contexto, pagina, inv.elementos);
      inv.ordemTab = await ordemTab(pagina);
      inv.escritas = escritas().map(p => p.metodo + " " + p.caminho);
      inv.externos = externos().map(p => p.host + p.caminho);
      const componentes = {};
      for (const el of inv.elementos) {
        const nomes = [...el.classes.filter(c => c.startsWith("br-")).map(c => "." + c), ...(el.tag.startsWith("br-") ? [`<${el.tag}>`] : [])];
        for (const n of nomes) (componentes[n] = componentes[n] || { total: 0, visiveis: 0 }), componentes[n].total++, el.visivel && componentes[n].visiveis++;
      }
      inv.componentes = componentes;
      saida.estados[st.id] = inv;
      const vis = inv.elementos.filter(e => e.visivel).length;
      const baixos = inv.contraste.filter(c => c.razao !== null && c.razao < 4.5);
      console.log(`${st.id} (${inv.path}): ${inv.elementos.length} elementos, ${vis} visíveis · h: ${inv.cabecalhos.filter(h => h.visivel).map(h => "h" + h.nivel).join(" ")} · marcos: ${inv.marcos.map(m => m.papel).join(",")} · tabelas ${inv.tabelas.length} · campos ${inv.campos.filter(c => c.visivel).length} · Tab ${inv.ordemTab.length} paradas · contraste < 4,5: ${baixos.length} · truncados ${inv.truncados.length} · escritas ${inv.escritas.length} · externos ${inv.externos.length}`);
      await contexto.close();
    }
  } finally {
    await navegador.close();
    servidor.close();
  }
  writeFileSync(join(RAIZ_EVAL, "tela-b/vistorias/inventario.json"), JSON.stringify(saida, null, 1));
  console.log("inventário gravado em tela-b/vistorias/inventario.json");
}
if (process.argv[1] && process.argv[1].endsWith("inventario.mjs")) await main();
