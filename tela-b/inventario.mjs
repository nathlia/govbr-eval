/**
 * Inventário da tela B (tela-b/metodo-auditoria.md § 3.1) — fato de DOM, sem modelo e sem oráculo.
 *
 * Todo elemento do light DOM e das shadow roots abertas: tag, classes br-*, papel e nome acessíveis
 * (CDP Accessibility.getFullAXTree), caixa em 1280×900, focabilidade, ordem de Tab real; mais as
 * estruturas de página (título, lang, regiões, cabeçalhos, listas, links, imagens), cores, tipografia
 * e contraste computados. Grava tela-b/inventario.json.
 *
 * Os papéis e nomes acessíveis são ligados ao elemento por um atributo `data-aud-i` posto DEPOIS de
 * todas as outras medidas, só nesta sessão (a página congelada não muda).
 *
 * Uso: node tela-b/inventario.mjs
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { chromium, servir, novaPagina, carregar, conferirHashes, PRELUDIO, RAIZ_EVAL } from "./comum.mjs";

const hashes = conferirHashes();
if (hashes.some(h => !h.ok)) { console.error("hash divergente — a medida é recusada"); process.exit(2); }

const MEDIR = `() => {
${PRELUDIO}
  const paiComposto = el => el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el).host : null);
  const rgba = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(",").map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
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
    return { resolvido: true, cor: "rgb(255, 255, 255)", de: "canvas (nenhum fundo opaco na cadeia; branco do navegador)" };
  };
  const els = todos();
  const focavel = el => el.tabIndex >= 0 && visivel(el) && !el.disabled;
  const elementos = els.map((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      i, chave: chave(el), tag: el.tagName.toLowerCase(), sombra: ehSombra(raizDe(el)),
      id: el.id || null,
      classes: (typeof el.className === "string" ? el.className : "").split(/\\s+/).filter(Boolean),
      atributos: Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("_ng") && a.name !== "class").map(a => [a.name, a.value.slice(0, 80)])),
      caixa: [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)],
      display: cs.display, visibility: cs.visibility, visivel: visivel(el), focavel: focavel(el), tabIndex: el.tabIndex,
      texto: Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join("").replace(/\\s+/g, " ").trim().slice(0, 60),
      conhecido: !(el instanceof HTMLUnknownElement),
      customizado: el.tagName.includes("-"), definido: el.tagName.includes("-") ? !!customElements.get(el.tagName.toLowerCase()) : null,
    };
  });

  // Contraste: todo elemento visível com nó de texto próprio não vazio (§ 4).
  const contraste = els.filter(visivel).filter(el => Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())).map(el => {
    const cs = getComputedStyle(el);
    const fg = rgba(cs.color); const fundo = fundoDe(el);
    const base = { chave: chave(el), texto: Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join("").replace(/\\s+/g, " ").trim().slice(0, 40),
      cor: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fundo };
    if (!fundo.resolvido || !fg || fg.a !== 1) return { ...base, razao: null };
    const bg = rgba(fundo.cor); const l1 = lum(fg), l2 = lum(bg);
    return { ...base, razao: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100 };
  });

  const cabecalhos = els.filter(e => /^H[1-6]$/.test(e.tagName)).map(e => ({ chave: chave(e), nivel: +e.tagName[1], texto: e.textContent.replace(/\\s+/g, " ").trim().slice(0, 70),
    filhos: Array.from(e.children).map(c => c.tagName.toLowerCase()), fontSize: getComputedStyle(e).fontSize, fontWeight: getComputedStyle(e).fontWeight }));
  const pseudo = els.filter(e => e.tagName === "P" && e.children.length === 1 && e.children[0].tagName === "STRONG" && e.textContent.trim() === e.children[0].textContent.trim())
    .map(e => ({ chave: chave(e), texto: e.textContent.trim().slice(0, 60), fontSize: getComputedStyle(e.children[0]).fontSize, fontWeight: getComputedStyle(e.children[0]).fontWeight }));
  const imagens = els.filter(e => e.tagName === "IMG").map(e => ({ chave: chave(e), alt: e.getAttribute("alt"), src: e.getAttribute("src"), completa: e.complete, naturalWidth: e.naturalWidth, visivel: visivel(e), sombra: ehSombra(raizDe(e)) }));
  const links = els.filter(e => e.tagName === "A").map(e => ({ chave: chave(e), href: e.getAttribute("href"), texto: e.textContent.trim() }));
  const listas = els.filter(e => ["UL", "OL", "DL"].includes(e.tagName)).map(e => ({ chave: chave(e), itens: e.children.length, filhosNaoLi: Array.from(e.children).filter(c => c.tagName !== "LI").length }));
  const tipografia = ["h1", "h3", "p", "li", "strong"].map(t => { const e = document.querySelector("privacidade " + t); const cs = getComputedStyle(e); return { tag: t, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, color: cs.color, textAlign: cs.textAlign }; });
  const cores = {};
  for (const el of els.filter(visivel)) {
    const cs = getComputedStyle(el);
    const add = (prop, v) => { if (!v || v === "rgba(0, 0, 0, 0)") return; (cores[v] = cores[v] || new Set()).add(prop + (ehSombra(raizDe(el)) ? "@sombra" : "@light")); };
    if (Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) add("color", cs.color);
    add("background-color", cs.backgroundColor);
    for (const lado of ["top", "right", "bottom", "left"]) if (parseFloat(cs.getPropertyValue("border-" + lado + "-width")) > 0) add("border-" + lado + "-color", cs.getPropertyValue("border-" + lado + "-color"));
  }
  const raizVars = getComputedStyle(document.documentElement);
  return {
    titulo: document.title, lang: document.documentElement.getAttribute("lang"),
    metaRefresh: !!document.querySelector("meta[http-equiv=refresh i]"),
    scripts: Array.from(document.scripts).map(s => ({ src: s.getAttribute("src"), type: s.getAttribute("type") })),
    cabeca: Array.from(document.head.children).map(e => e.tagName.toLowerCase() + (e.getAttribute("href") ? " " + e.getAttribute("href") : "") + (e.getAttribute("src") ? " " + e.getAttribute("src") : "")),
    elementos, contraste, cabecalhos, pseudo, imagens, links, listas, tipografia,
    cores: Object.fromEntries(Object.entries(cores).map(([k, v]) => [k, [...v]])),
    rolagemHorizontal: document.documentElement.scrollWidth > innerWidth,
    alturaDocumento: document.documentElement.scrollHeight,
    varsRaiz: { "--font-family-base": raizVars.getPropertyValue("--font-family-base").trim() },
  };
}`;

const { servidor, base } = await servir();
const navegador = await chromium.launch();
let inv;
try {
  const { contexto, pagina, pedidos } = await novaPagina(navegador);
  await carregar(pagina, base);
  inv = await pagina.evaluate(`(${MEDIR})()`);
  inv.pedidos = pedidos.map(p => `${p.abortado ? "ABORTADO " : ""}${p.host}${p.caminho}`);

  // Ordem de Tab real, lendo o foco através das shadow roots.
  const ordem = [];
  for (let k = 0; k < 15; k++) {
    await pagina.keyboard.press("Tab");
    const atual = await pagina.evaluate(`(() => { ${PRELUDIO} const a = ativoProfundo(); return a && a !== document.body ? chave(a) : "body"; })()`);
    ordem.push(atual);
    if (k > 0 && atual === ordem[0]) break;
  }
  inv.ordemTab = ordem;

  // Indicador de foco do(s) focável(is): estilo computado com o foco vindo do teclado.
  await pagina.keyboard.press("Escape");
  inv.focoTeclado = [];
  await pagina.goto(base + "/real/pnip-privacidade.html", { waitUntil: "networkidle" });
  await carregar(pagina, base);
  const semFoco = await pagina.evaluate(`(() => { ${PRELUDIO} return todos().filter(e => e.tabIndex >= 0 && visivel(e)).map(e => { const c = getComputedStyle(e); return { chave: chave(e), outline: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, boxShadow: c.boxShadow, border: c.borderTopWidth + " " + c.borderTopColor }; }); })()`);
  await pagina.keyboard.press("Tab");
  const comFoco = await pagina.evaluate(`(() => { ${PRELUDIO} const e = ativoProfundo(); const c = getComputedStyle(e); return { chave: chave(e), outline: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, outlineOffset: c.outlineOffset, boxShadow: c.boxShadow, border: c.borderTopWidth + " " + c.borderTopColor, focusVisible: e.matches(":focus-visible") }; })()`);
  inv.focoTeclado = { semFoco, comFoco };

  // Papel e nome acessíveis por elemento.
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
  const ax = new Map();
  for (const n of nodes) {
    if (n.backendDOMNodeId == null) continue;
    const i = porBackend.get(n.backendDOMNodeId);
    if (i == null) continue;
    ax.set(i, { ignorado: !!n.ignored, papel: n.role?.value ?? null, nome: n.name?.value ?? "" });
  }
  for (const el of inv.elementos) el.ax = ax.get(el.i) ?? null;
  inv.marcos = nodes.filter(n => !n.ignored && ["banner", "main", "contentinfo", "navigation", "complementary", "region", "search", "form"].includes(n.role?.value)).map(n => ({ papel: n.role.value, nome: n.name?.value ?? "", elemento: inv.elementos[porBackend.get(n.backendDOMNodeId)]?.chave ?? null }));
  await contexto.close();
} finally {
  await navegador.close();
  servidor.close();
}

// Componentes presentes: por classe br-*, tag br-* customizada.
const componentes = {};
for (const el of inv.elementos) {
  const nomes = [...el.classes.filter(c => c.startsWith("br-")), ...(el.tag.startsWith("br-") ? [`<${el.tag}>`] : [])];
  for (const n of nomes) (componentes[n] = componentes[n] || []).push({ chave: el.chave, visivel: el.visivel, sombra: el.sombra });
}
inv.componentes = componentes;
inv.hashes = hashes;
inv.medidoEm = new Date().toISOString();

writeFileSync(join(RAIZ_EVAL, "tela-b/inventario.json"), JSON.stringify(inv, null, 2));
const vis = inv.elementos.filter(e => e.visivel).length;
console.log(`elementos: ${inv.elementos.length} (${vis} visíveis; ${inv.elementos.filter(e => e.sombra).length} em shadow root)`);
console.log(`título: "${inv.titulo}" · lang: ${inv.lang} · links: ${inv.links.length} · imagens: ${inv.imagens.length} · listas: ${inv.listas.length}`);
console.log(`marcos: ${inv.marcos.map(m => m.papel + (m.nome ? `("${m.nome}")` : "")).join(", ")}`);
console.log(`cabeçalhos: ${inv.cabecalhos.map(h => "h" + h.nivel).join(" ")}`);
console.log(`pseudo-títulos p>strong: ${inv.pseudo.length}`);
console.log(`ordem de Tab: ${inv.ordemTab.join(" → ")}`);
console.log(`componentes: ${Object.entries(componentes).map(([k, v]) => `${k}×${v.length}${v.every(x => !x.visivel) ? " (não renderizado)" : ""}`).join(", ")}`);
const falhas = inv.contraste.filter(c => c.razao !== null && c.razao < 4.5);
console.log(`contraste: ${inv.contraste.length} elementos com texto; ${inv.contraste.filter(c => c.razao === null).length} não resolvidos; ${falhas.length} abaixo de 4,5:1; mínimo ${Math.min(...inv.contraste.filter(c => c.razao).map(c => c.razao))}`);
console.log(`desconhecidos (HTMLUnknownElement): ${inv.elementos.filter(e => !e.conhecido).map(e => e.tag).join(", ") || "nenhum"}`);
console.log("inventário gravado em tela-b/inventario.json");
