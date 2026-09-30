/**
 * Conferência da auditoria da tela B — sem modelo e sem oráculo (tela-b/metodo-auditoria.md § 8.2).
 *
 * Confere os quatro sha256 do § 1 (em public/ e em dist/), serve o `dist/` do corpus num servidor
 * próprio, aborta os três hosts externos declarados em telas.json, alcança o único estado declarado
 * (`inicial`) e RE-MEDE cada unidade `viola` da referência candidata e cada veredito `conforme` da
 * tabela de decisão (tela-b/decisoes.json), imprimindo N/N. Sai com código ≠ 0 em qualquer falha.
 *
 * Nada é importado do govbr-ds-validator nem do axe; os valores esperados estão escritos aqui, com a
 * origem de cada um (token do DS 3.7.0 na base normativa, medida da auditoria).
 *
 * Uso: node tela-b/conferir-auditoria.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { chromium, servir, novaPagina, carregar, conferirHashes, PRELUDIO, RAIZ_EVAL, EXTERNOS, AUSENTES, URL_TELA } from "./comum.mjs";

const resultados = [];
const medir = (id, tipo, ok, detalhe = "") => resultados.push({ id, tipo, ok: ok === true, detalhe });

// ---------- 1. hashes (recusa medir se divergirem)
const hashes = conferirHashes();
for (const arquivo of ["real/pnip-privacidade.html", "real/manifesto.json", "real/assets/core.min.css", "real/assets/webcomponents.umd.min.js"]) {
  const par = hashes.filter(h => h.arquivo.endsWith(arquivo));
  medir(`hash ${arquivo}`, "objeto", par.length === 2 && par.every(h => h.ok), par.map(h => `${h.arquivo.split("/")[0]}=${h.obtido.slice(0, 12)}`).join(" "));
}
if (resultados.some(r => !r.ok)) {
  for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} [${r.tipo}] ${r.id} — ${r.detalhe}`);
  console.error("\nhash divergente: a página não é a auditada, nada foi medido.");
  process.exit(1);
}

const referencia = JSON.parse(readFileSync(join(RAIZ_EVAL, "ground-truth-privacidade.json"), "utf8"));
const decisoes = JSON.parse(readFileSync(join(RAIZ_EVAL, "tela-b/decisoes.json"), "utf8"));

const { servidor, base } = await servir();
const navegador = await chromium.launch();

const js = corpo => `(() => { ${PRELUDIO} ${corpo} })()`;

try {
  // ---------- 2. isolamento e estado
  const { contexto, pagina, pedidos } = await novaPagina(navegador);
  const status404 = [];
  pagina.on("response", r => { if (r.status() === 404) status404.push(new URL(r.url()).pathname); });
  await carregar(pagina, base);
  const hostsAbortados = [...new Set(pedidos.filter(p => p.abortado).map(p => p.host))].sort();
  medir("isolamento: os três hosts declarados foram pedidos e abortados", "condicao", JSON.stringify(hostsAbortados) === JSON.stringify([...EXTERNOS].sort()), hostsAbortados.join(", "));
  const naoDeclarados = pedidos.filter(p => p.externo && !EXTERNOS.includes(p.host));
  medir("isolamento: nenhum host externo fora da lista", "condicao", naoDeclarados.length === 0, naoDeclarados.map(p => p.host).join(", ") || "nenhum");
  medir("isolamento: 404 são exatamente os ausentes declarados", "condicao", JSON.stringify([...new Set(status404)].sort()) === JSON.stringify([...AUSENTES].sort()), [...new Set(status404)].join(", "));
  medir(`estado inicial alcançado (waitFor "${referencia._meta.waitFor}")`, "estado", await pagina.locator(referencia._meta.waitFor).count() === 1);
  const estados = referencia._meta.states.map(s => s.id).join(",");
  medir("referência declara um único estado (inicial, afterStep 0, setup vazio)", "estado",
    estados === "inicial" && referencia._meta.states[0].afterStep === 0 && (referencia._meta.setup ?? []).length === 0, estados);

  // ---------- 3. medidas no estado inicial (antes de qualquer foco)
  const m = await pagina.evaluate(js(`
    const els = todos();
    const niveis = els.filter(e => /^H[1-6]$/.test(e.tagName)).map(e => ({ n: +e.tagName[1], k: chave(e) }));
    const priv = document.querySelectorAll("privacidade");
    const header = document.querySelector("br-header");
    const nav = header.shadowRoot.querySelector("#navigation");
    const divisor = header.shadowRoot.querySelector(".br-divider");
    const rgba = s => { const p = s.match(/rgba?\\(([^)]+)\\)/)[1].split(",").map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const pai = el => el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el).host : null);
    const fundo = el => { for (let e = el; e; e = pai(e)) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = rgba(cs.backgroundColor); if (c.a === 1) return cs.backgroundColor; if (c.a > 0) return null; } return "rgb(255, 255, 255)"; };
    const razao = el => { const fg = rgba(getComputedStyle(el).color), f = fundo(el); if (!f || fg.a !== 1) return null; const a = lum(fg), b = lum(rgba(f)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    const comTexto = els.filter(visivel).filter(el => Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()));
    const cores = new Set();
    for (const el of els.filter(visivel)) {
      const cs = getComputedStyle(el);
      if (comTexto.includes(el)) cores.add(cs.color);
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") cores.add(cs.backgroundColor);
      for (const l of ["top", "right", "bottom", "left"]) if (parseFloat(cs.getPropertyValue("border-" + l + "-width")) > 0) cores.add(cs.getPropertyValue("border-" + l + "-color"));
    }
    const cabeca = Array.from(document.head.children).map(e => e.getAttribute("href") || e.getAttribute("src") || e.tagName.toLowerCase());
    const truncados = els.filter(e => visivel(e) && /^(H[1-6]|BUTTON|LABEL|P|LI|STRONG)$/.test(e.tagName) || (visivel(e) && e.matches && e.matches(".header-title, .header-sign")))
      .filter(e => { const c = getComputedStyle(e); return c.textOverflow === "ellipsis" || (e.scrollWidth > e.clientWidth + 1 && c.overflowX !== "visible"); }).map(chave);
    return {
      niveis,
      hrefs: els.filter(e => e.hasAttribute("href") && e.tagName === "A").length,
      ancorasInternas: els.filter(e => (e.getAttribute("href") || "").startsWith("#")).length,
      pnipRoot: document.querySelectorAll("pnip-root").length,
      priv: { n: priv.length, desconhecido: priv[0] instanceof HTMLUnknownElement, hifen: priv[0].tagName.includes("-"), visivel: visivel(priv[0]), definido: !!customElements.get("privacidade") },
      header: { hifen: header.tagName.includes("-"), definido: !!customElements.get("br-header"), desconhecido: header instanceof HTMLUnknownElement },
      nav: { classes: nav.className, tabIndex: nav.tabIndex, aria: nav.getAttribute("aria-label"), alvo: nav.getAttribute("data-target"), alvoExiste: !!document.querySelector(nav.getAttribute("data-target")) },
      divisor: { tabIndex: divisor.tabIndex },
      tabindexPositivo: els.filter(e => e.hasAttribute("tabindex") && e.tabIndex > 0).map(chave),
      focaveis: els.filter(e => e.tabIndex >= 0 && visivel(e) && !e.disabled).map(chave),
      contrasteHeader: [".header-sign", ".header-title"].map(s => { const e = header.shadowRoot.querySelector(s); return { s, cor: getComputedStyle(e).color, fundo: fundo(e), razao: razao(e) }; }),
      contraste: { n: comTexto.length, naoResolvidos: comTexto.filter(e => razao(e) === null).length, minimo: Math.min(...comTexto.map(razao).filter(x => x !== null)) },
      cores: [...cores].sort(),
      lang: document.documentElement.getAttribute("lang"),
      metaRefresh: document.querySelectorAll("meta[http-equiv]").length,
      scripts: Array.from(document.querySelectorAll("script")).map(s => ({ src: s.getAttribute("src"), type: s.getAttribute("type") })),
      cabeca,
      fonte: getComputedStyle(document.querySelector("privacidade p")).fontFamily,
      animacoes: document.getAnimations().length,
      truncados,
      url: location.href,
    };
  `));

  // ---------- unidades (viola)
  const spec = id => referencia.violations.find(v => v.id === id);

  // B-01 — sem salto para o conteúdo: nenhum link na página (light + shadow), nenhuma âncora interna,
  // e o primeiro ponto de Tab é o botão Menu do cabeçalho.
  medir(`${spec("B-01").id} âncora pnip-root resolve 1`, "viola", m.pnipRoot === 1, String(m.pnipRoot));
  medir(`${spec("B-01").id} nenhum <a href> e nenhuma âncora #… na página`, "viola", m.hrefs === 0 && m.ancorasInternas === 0, `a[href]=${m.hrefs}, href="#…"=${m.ancorasInternas}`);

  // B-02 — salto de nível: h1 seguido de h3, nenhum h2 no documento.
  const primeiroH3 = m.niveis.findIndex(h => h.n === 3);
  medir(`${spec("B-02").id} sequência de títulos h1 → h3 sem h2`, "viola",
    m.niveis[0]?.n === 1 && primeiroH3 === 1 && !m.niveis.some(h => h.n === 2),
    m.niveis.map(h => "h" + h.n).join(" "));
  const primeiroH3Ancora = await pagina.evaluate(js(`const e = document.querySelectorAll(${JSON.stringify(spec("B-02").anchor)}); return e.length === 1 ? chave(e[0]) : String(e.length);`));
  medir(`${spec("B-02").id} âncora resolve exatamente o primeiro h3`, "viola", primeiroH3Ancora === m.niveis[primeiroH3]?.k, primeiroH3Ancora);

  // B-03 — elemento <privacidade>: nome sem hífen (não é nome válido de custom element) e não é elemento HTML.
  medir(`${spec("B-03").id} <privacidade> é HTMLUnknownElement, sem hífen, renderizado`, "viola",
    m.priv.n === 1 && m.priv.desconhecido && !m.priv.hifen && m.priv.visivel && !m.priv.definido, JSON.stringify(m.priv));

  // ---------- conformes da tabela de decisão
  const conformesTabela = decisoes.linhas.filter(l => l.veredito === "conforme").map(l => l.id);
  const mediu = new Set();
  const conforme = (ids, rotulo, ok, detalhe) => { for (const id of ids) mediu.add(id); medir(`${rotulo} [${ids.map(i => i.replace("govbr-3.7.0-", "")).join(", ")}]`, "conforme", ok, detalhe); };

  conforme(["govbr-3.7.0-development-global-406774b1cb87"], "fonte declarada Rawline (rawline.css no <head>; font-family computado)",
    m.fonte.startsWith("Rawline") && m.cabeca.some(h => /rawline\.css$/.test(h)), m.fonte);
  // Cores: #333333 = --gray-80, #ffffff = --pure-0, #cccccc = --gray-20 (tokens/colors.json da base 3.7.0).
  const PALETA = ["rgb(204, 204, 204)", "rgb(255, 255, 255)", "rgb(51, 51, 51)"];
  conforme(["govbr-3.7.0-foundation-global-21b1a2733f7b"], "toda cor computada visível é token (--gray-80, --pure-0, --gray-20)",
    m.cores.every(c => PALETA.includes(c)), m.cores.join(" · "));
  conforme(["govbr-3.7.0-accessibility-global-79db88c7f55d", "govbr-3.7.0-accessibility-global-cb56ad444da2"],
    "nenhum tabindex positivo; único ponto de Tab é o botão Menu do cabeçalho", m.tabindexPositivo.length === 0 && m.focaveis.length === 1 && m.focaveis[0].endsWith("slot>button"), m.focaveis.join(" | "));
  conforme(["govbr-3.7.0-accessibility-global-cd5de9a6f164", "govbr-3.7.0-accessibility-global-d6e816588306"], "nenhum meta http-equiv (refresh)", m.metaRefresh === 0, String(m.metaRefresh));
  conforme(["govbr-3.7.0-accessibility-global-698e0a4783a9"], "lang do documento declarado", m.lang === "pt-br", m.lang);
  conforme(["govbr-3.7.0-accessibility-global-cb09bc0c77c0"], "contraste ≥ 4,5:1 em todo elemento visível com texto próprio",
    m.contraste.naoResolvidos === 0 && m.contraste.minimo >= 4.5 && m.contraste.n > 100, `${m.contraste.n} elementos, mínimo ${m.contraste.minimo.toFixed(2)}:1`);
  conforme(["govbr-3.7.0-development-global-a43ad8231ad0"], "fontes e ícones externos declarados antes de core.min.css; script do DS ao fim do body",
    m.cabeca.findIndex(h => /rawline/.test(h)) < m.cabeca.indexOf("assets/core.min.css") && m.cabeca.findIndex(h => /Raleway/.test(h)) < m.cabeca.indexOf("assets/core.min.css") && m.cabeca.findIndex(h => /font-awesome/.test(h)) < m.cabeca.indexOf("assets/core.min.css"),
    m.cabeca.filter(h => /\//.test(h)).join(" → "));
  conforme(["govbr-3.7.0-development-global-9826b6862644"], "script sem atributo type", m.scripts.length === 1 && m.scripts[0].type === null, JSON.stringify(m.scripts));
  conforme(["govbr-3.7.0-pattern-global-9d9f1c9bf1ed"], "nenhum título, rótulo ou texto visível truncado", m.truncados.length === 0, m.truncados.join(", ") || "nenhum");
  conforme(["govbr-3.7.0-accessibility-global-8faca42c2c9a", "govbr-3.7.0-accessibility-global-33b13d9fa271", "govbr-3.7.0-accessibility-global-6ea7ecc60c01"],
    "nenhuma animação na página (document.getAnimations)", m.animacoes === 0, String(m.animacoes));
  conforme(["govbr-3.7.0-component-button-4d7b5f978df1"], "botão Menu é variante circular (exceção do rótulo visível) com nome acessível",
    /\bbr-button\b/.test(m.nav.classes) && /\bcircle\b/.test(m.nav.classes) && m.nav.aria === "Menu", `${m.nav.classes} aria-label=${m.nav.aria}`);
  conforme(["govbr-3.7.0-accessibility-divider-30bbcbf3a17c"], "divisor fora da ordem de foco", m.divisor.tabIndex < 0, `tabIndex ${m.divisor.tabIndex}`);

  // Árvore de acessibilidade: nome do botão e divisor ignorado.
  const cdp = await contexto.newCDPSession(pagina);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const botao = nodes.find(n => !n.ignored && n.role?.value === "button" && n.name?.value === "Menu");
  medir("árvore de acessibilidade: botão \"Menu\" exposto como button", "conforme", !!botao);
  await pagina.evaluate(() => document.querySelector("br-header").shadowRoot.querySelector(".br-divider").setAttribute("data-conf-divisor", "1"));
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  let backendDivisor = null;
  const visitar = n => { if (n.attributes?.includes("data-conf-divisor")) backendDivisor = n.backendNodeId; for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? [])]) visitar(c); };
  visitar(root);
  const ax2 = (await cdp.send("Accessibility.getFullAXTree")).nodes.find(n => n.backendDOMNodeId === backendDivisor);
  conforme(["govbr-3.7.0-accessibility-divider-30bbcbf3a17c"], "divisor ignorado pela árvore de acessibilidade", !ax2 || ax2.ignored === true, ax2 ? `ignored=${ax2.ignored}` : "sem nó");
  await cdp.detach();

  // Teclado: o único controle recebe foco por Tab, mostra indicador, e Enter ≡ clique (ambos sem efeito).
  await pagina.keyboard.press("Tab");
  const foco = await pagina.evaluate(js(`const a = ativoProfundo(); const c = getComputedStyle(a); return { k: chave(a), outline: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, fv: a.matches(":focus-visible") };`));
  conforme(["govbr-3.7.0-accessibility-global-21fbcc2fe37b"], "foco por teclado no botão Menu tem contorno visível",
    foco.k.endsWith("slot>button") && foco.fv && !foco.outline.startsWith("none") && parseFloat(foco.outline.split(" ")[1]) > 0, `${foco.outline} (token de foco --gold-vivid-40 = #c2850c)`);
  const antesDom = await pagina.evaluate(() => document.documentElement.outerHTML + document.querySelector("br-header").shadowRoot.innerHTML);
  await pagina.keyboard.press("Enter");
  await pagina.waitForTimeout(400);
  const posEnter = await pagina.evaluate(() => ({ dom: document.documentElement.outerHTML + document.querySelector("br-header").shadowRoot.innerHTML, url: location.href }));
  await pagina.locator("#navigation").click();
  await pagina.waitForTimeout(400);
  const posClique = await pagina.evaluate(() => ({ dom: document.documentElement.outerHTML + document.querySelector("br-header").shadowRoot.innerHTML, url: location.href }));
  conforme(["govbr-3.7.0-accessibility-global-e6fd5e1247de", "govbr-3.7.0-accessibility-global-f639993e9416", "govbr-3.7.0-accessibility-global-41850b4791b8"],
    "único controle alcançável por Tab; Enter e clique têm o mesmo efeito (nenhum), sem aprisionar o foco",
    foco.k.endsWith("slot>button") && posEnter.dom === antesDom && posClique.dom === antesDom && posClique.url === m.url, `alvo ${m.nav.alvo} existe: ${m.nav.alvoExiste}`);
  medir("estado: acionar o botão Menu não produz estado (DOM e URL inalterados)", "estado", posEnter.dom === antesDom && posClique.dom === antesDom);

  // Controles conformes da referência (_meta.conformes) — os seletores resolvem.
  for (const c of referencia._meta.conformes.itens) {
    const n = await pagina.evaluate(js(`
      const s = ${JSON.stringify(c.selector)};
      if (s.includes(">>>")) { const hops = s.split(">>>").map(x => x.trim()); let roots = [document], found = [];
        for (let i = 0; i < hops.length; i++) { found = []; for (const r of roots) found.push(...r.querySelectorAll(hops[i])); roots = found.map(e => e.shadowRoot).filter(Boolean); } return found.length; }
      return document.querySelectorAll(s).length;`));
    medir(`_meta.conformes ${c.id}: "${c.selector}" resolve ${c.count}`, "conforme", n === c.count, String(n));
  }
  medir(`_meta.conformes: h1 único e primeiro título [${"3ac0aaa53900"}]`, "conforme", m.niveis.filter(h => h.n === 1).length === 1 && m.niveis[0].n === 1);
  medir("_meta.conformes: <br-header> é custom element válido e definido [7e6420514860]", "conforme", m.header.hifen && m.header.definido && !m.header.desconhecido);
  medir("_meta.conformes: textos do cabeçalho #333 sobre #fff, 12,63:1 [cb09bc0c77c0, 21b1a2733f7b]", "conforme",
    m.contrasteHeader.every(h => h.cor === "rgb(51, 51, 51)" && h.fundo === "rgb(255, 255, 255)" && h.razao >= 4.5), m.contrasteHeader.map(h => h.razao.toFixed(2)).join(", "));

  const naoMedidos = conformesTabela.filter(id => !mediu.has(id));
  medir("toda linha `conforme` de decisoes.json foi re-medida", "cobertura", naoMedidos.length === 0, naoMedidos.join(", ") || `${conformesTabela.length} linhas`);
  const unidades = decisoes.linhas.filter(l => l.veredito === "viola" && l.destino === "unidade").flatMap(l => l.unidades);
  medir("toda unidade da tabela está na referência e vice-versa", "cobertura",
    JSON.stringify([...new Set(unidades)].sort()) === JSON.stringify(referencia.violations.map(v => v.id).sort()), [...new Set(unidades)].join(","));
  await contexto.close();
} finally {
  await navegador.close();
  servidor.close();
}

for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} [${r.tipo}] ${r.id}${r.detalhe ? ` — ${r.detalhe}` : ""}`);
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} conferências ok (página ${URL_TELA})`);
process.exit(falhas === 0 ? 0 : 1);
