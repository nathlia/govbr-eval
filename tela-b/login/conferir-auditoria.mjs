/**
 * Conferência da auditoria de real/pnip-login.html (recuo do § 9 de tela-b/metodo-auditoria.md) —
 * sem modelo e sem oráculo (§ 8.2).
 *
 * Confere os quatro sha256 (página + manifesto + dois ativos, em public/ e em dist/), serve o
 * `dist/` do corpus num servidor próprio, aborta os três hosts externos que o <head> da captura
 * referencia, alcança o único estado (`inicial`) e RE-MEDE cada unidade `viola` da referência
 * candidata e cada veredito `conforme` de tela-b/login/decisoes.json, imprimindo N/N. Sai ≠ 0 em
 * qualquer falha. Nada importado do govbr-ds-validator nem do axe.
 *
 * A tela não está declarada em telas.json: externos e ausentes estão escritos aqui, como medidos
 * na auditoria (tela-b/login/auditoria.md § 1).
 *
 * Uso: node tela-b/login/conferir-auditoria.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { chromium, servir, novaPagina, carregar, conferirHashes, PRELUDIO, RAIZ_EVAL, HASHES_LOGIN } from "../comum.mjs";

const URL = "/real/pnip-login.html";
const EXTERNOS = ["cdngovbr-ds.estaleiro.serpro.gov.br", "cdnjs.cloudflare.com", "fonts.googleapis.com"];
const AUSENTES = ["/assets/images/exit-icon.png", "/real/assets/images/govbr-logo.png"];

const resultados = [];
const medir = (id, tipo, ok, detalhe = "") => resultados.push({ id, tipo, ok: ok === true, detalhe });

const hashes = conferirHashes(HASHES_LOGIN);
for (const arquivo of Object.keys(HASHES_LOGIN)) {
  const par = hashes.filter(h => h.arquivo.endsWith(arquivo));
  medir(`hash ${arquivo}`, "objeto", par.length === 2 && par.every(h => h.ok), par.map(h => `${h.arquivo.split("/")[0]}=${h.obtido.slice(0, 12)}`).join(" "));
}
if (resultados.some(r => !r.ok)) {
  for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} [${r.tipo}] ${r.id} — ${r.detalhe}`);
  console.error("\nhash divergente: a página não é a auditada, nada foi medido.");
  process.exit(1);
}

const referencia = JSON.parse(readFileSync(join(RAIZ_EVAL, "ground-truth-pnip-login.json"), "utf8"));
const decisoes = JSON.parse(readFileSync(join(RAIZ_EVAL, "tela-b/login/decisoes.json"), "utf8"));
const js = corpo => `(() => { ${PRELUDIO} ${corpo} })()`;

const { servidor, base } = await servir();
const navegador = await chromium.launch();
try {
  const { contexto, pagina, pedidos } = await novaPagina(navegador);
  const status404 = [];
  pagina.on("response", r => { if (r.status() === 404) status404.push(new globalThis.URL(r.url()).pathname); });
  await carregar(pagina, base, URL);
  await pagina.waitForSelector(referencia._meta.waitFor, { timeout: 10_000 });

  const abortados = [...new Set(pedidos.filter(p => p.abortado).map(p => p.host))].sort();
  medir("isolamento: os três hosts do <head> foram pedidos e abortados", "condicao", JSON.stringify(abortados) === JSON.stringify(EXTERNOS), abortados.join(", "));
  const outros = pedidos.filter(p => p.externo && !EXTERNOS.includes(p.host));
  medir("isolamento: nenhum outro host externo", "condicao", outros.length === 0, outros.map(p => p.host).join(", ") || "nenhum");
  medir("isolamento: 404 são exatamente os ausentes medidos", "condicao", JSON.stringify([...new Set(status404)].sort()) === JSON.stringify(AUSENTES), [...new Set(status404)].join(", "));
  medir(`estado inicial alcançado (waitFor "${referencia._meta.waitFor}")`, "estado", await pagina.locator(referencia._meta.waitFor).count() === 1);
  medir("referência declara um único estado (inicial, afterStep 0, setup vazio)", "estado",
    referencia._meta.states.map(s => s.id).join() === "inicial" && referencia._meta.states[0].afterStep === 0 && referencia._meta.setup.length === 0);

  const m = await pagina.evaluate(js(`
    const els = todos();
    const rgba = s => { const p = s.match(/rgba?\\(([^)]+)\\)/)[1].split(",").map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const pai = el => el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el).host : null);
    const fundo = el => { for (let e = el; e; e = pai(e)) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = rgba(cs.backgroundColor); if (c.a === 1) return cs.backgroundColor; if (c.a > 0) return null; } return "rgb(255, 255, 255)"; };
    const razao = el => { const fg = rgba(getComputedStyle(el).color), f = fundo(el); if (!f || fg.a !== 1) return null; const a = lum(fg), b = lum(rgba(f)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    // Texto renderizado: todo nó de texto não vazio cujo pai renderiza caixa (slot com display:contents
    // conta pelo primeiro ancestral com caixa — é esse que pinta o texto).
    const textos = [];
    const andar = raiz => { const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; let e = n.parentElement; if (!e || e.closest("head, script, style")) continue; const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width === 0 || b.height === 0) continue; textos.push(e); } };
    andar(document.body); for (const el of els) if (el.shadowRoot) andar(el.shadowRoot);
    const cores = new Set();
    for (const el of textos) cores.add(getComputedStyle(el).color);
    for (const el of els.filter(visivel)) { const cs = getComputedStyle(el); if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") cores.add(cs.backgroundColor);
      for (const l of ["top", "right", "bottom", "left"]) if (parseFloat(cs.getPropertyValue("border-" + l + "-width")) > 0) cores.add(cs.getPropertyValue("border-" + l + "-color")); }
    const header = document.querySelector("br-header");
    const bb = document.querySelector("br-button").shadowRoot.querySelector("button");
    const ajuda = document.querySelector("pnip-login .br-button.primary");
    const cabeca = Array.from(document.head.children).map(e => e.getAttribute("href") || e.getAttribute("src") || e.tagName.toLowerCase());
    const bAjuda = ajuda.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(ajuda.querySelector("span")); const tAjuda = rg.getBoundingClientRect();
    return {
      niveis: els.filter(e => /^H[1-6]$/.test(e.tagName)).map(e => ({ n: +e.tagName[1], k: chave(e), t: e.textContent.trim() })),
      hrefs: els.filter(e => e.tagName === "A" && e.hasAttribute("href")).length,
      ancorasInternas: els.filter(e => (e.getAttribute("href") || "").startsWith("#")).length,
      pnipRoot: document.querySelectorAll("pnip-root").length,
      focaveis: els.filter(e => e.tabIndex >= 0 && visivel(e) && !e.disabled).map(chave),
      tabindexPositivo: els.filter(e => e.hasAttribute("tabindex") && e.tabIndex > 0).length,
      textos: textos.map(e => ({ k: chave(e), razao: razao(e), cor: getComputedStyle(e).color })),
      cores: [...cores].sort(),
      lang: document.documentElement.getAttribute("lang"),
      metaHttp: document.querySelectorAll("meta[http-equiv]").length,
      scripts: Array.from(document.querySelectorAll("script")).map(s => ({ src: s.getAttribute("src"), type: s.getAttribute("type") })),
      cabeca, fonte: getComputedStyle(document.querySelector("pnip-login h2")).fontFamily,
      animacoes: document.getAnimations().length,
      truncados: els.filter(e => visivel(e) && /^(H[1-6]|BUTTON|LABEL|P|LI|STRONG)$/.test(e.tagName)).filter(e => { const c = getComputedStyle(e); if (c.textOverflow === "ellipsis") return true; if (c.overflowX === "visible") return false;
        const r = document.createRange(); r.selectNodeContents(e); const t = r.getBoundingClientRect(), b = e.getBoundingClientRect(); return t.left < b.left - 1 || t.right > b.right + 1; }).map(chave),
      ajuda: { classes: ajuda.className, nome: ajuda.textContent.replace(/\\s+/g, " ").trim(), visivel: visivel(ajuda), texto: [tAjuda.left, tAjuda.right], caixa: [bAjuda.left, bAjuda.right] },
      bb: { classes: bb.className, texto: bb.textContent.trim(), cor: getComputedStyle(bb).color, fundo: fundo(bb), razao: razao(bb) },
      ajudaCor: { cor: getComputedStyle(ajuda).color, fundo: fundo(ajuda), razao: razao(ajuda) },
      nav: header.shadowRoot.querySelector("#navigation").className + " " + header.shadowRoot.querySelector("#navigation").getAttribute("aria-label"),
      divisorTab: header.shadowRoot.querySelector(".br-divider").tabIndex,
      contrasteHeader: [".header-sign", ".header-title"].map(s => { const e = header.shadowRoot.querySelector(s); return { cor: getComputedStyle(e).color, fundo: fundo(e), razao: razao(e) }; }),
      url: location.href,
    };
  `));

  const spec = id => referencia.violations.find(v => v.id === id);
  // L-01
  medir(`${spec("L-01").id} âncora pnip-root resolve 1`, "viola", m.pnipRoot === 1);
  medir(`${spec("L-01").id} nenhum <a href> e nenhuma âncora #…; 1º focável é o botão Menu`, "viola",
    m.hrefs === 0 && m.ancorasInternas === 0 && m.focaveis[0]?.endsWith("slot>button"), `a[href]=${m.hrefs}, #…=${m.ancorasInternas}`);
  // L-02
  medir(`${spec("L-02").id} único título é h2, nenhum h1`, "viola", m.niveis.length === 1 && m.niveis[0].n === 2 && !m.niveis.some(h => h.n === 1), m.niveis.map(h => `h${h.n} "${h.t}"`).join(" "));
  const h2 = await pagina.evaluate(js(`const e = document.querySelectorAll(${JSON.stringify(spec("L-02").anchor)}); return e.length === 1 ? chave(e[0]) : String(e.length);`));
  medir(`${spec("L-02").id} âncora resolve exatamente esse h2`, "viola", h2 === m.niveis[0]?.k, h2);

  // conformes da tabela
  const mediu = new Set();
  const conforme = (ids, rotulo, ok, detalhe) => { ids.forEach(i => mediu.add(i)); medir(`${rotulo} [${ids.map(i => i.replace("govbr-3.7.0-", "")).join(", ")}]`, "conforme", ok, detalhe); };
  conforme(["govbr-3.7.0-development-global-406774b1cb87"], "fonte declarada Rawline", m.fonte.startsWith("Rawline") && m.cabeca.some(h => /rawline\.css$/.test(h)), m.fonte);
  // #333 --gray-80, #fff --pure-0, #ccc --gray-20, #005ea2 --blue-vivid-60, #1351b4 --blue-warm-vivid-70 (tokens/colors.json 3.7.0)
  const PALETA = ["rgb(0, 94, 162)", "rgb(19, 81, 180)", "rgb(204, 204, 204)", "rgb(255, 255, 255)", "rgb(51, 51, 51)"];
  conforme(["govbr-3.7.0-foundation-global-21b1a2733f7b"], "toda cor computada visível é token", m.cores.every(c => PALETA.includes(c)), m.cores.join(" · "));
  const ordem = m.focaveis.map(k => k.split(">").slice(-2).join(">"));
  conforme(["govbr-3.7.0-accessibility-global-79db88c7f55d", "govbr-3.7.0-accessibility-global-cb56ad444da2"], "sem tabindex positivo; focáveis em ordem Menu → Entrar → ajuda",
    m.tabindexPositivo === 0 && m.focaveis.length === 3 && m.focaveis[0].includes("br-header") && m.focaveis[1].includes("br-button >>>") && m.focaveis[2].endsWith("div:nth-of-type(2)>button"), ordem.join(" | "));
  conforme(["govbr-3.7.0-accessibility-global-cd5de9a6f164", "govbr-3.7.0-accessibility-global-d6e816588306"], "nenhum meta http-equiv", m.metaHttp === 0);
  conforme(["govbr-3.7.0-accessibility-global-8faca42c2c9a", "govbr-3.7.0-accessibility-global-33b13d9fa271", "govbr-3.7.0-accessibility-global-6ea7ecc60c01"], "nenhuma animação", m.animacoes === 0, String(m.animacoes));
  conforme(["govbr-3.7.0-accessibility-global-698e0a4783a9"], "lang do documento", m.lang === "pt-br", m.lang);
  const semFundo = m.textos.filter(t => t.razao === null);
  const minimo = Math.min(...m.textos.map(t => t.razao ?? 99));
  conforme(["govbr-3.7.0-accessibility-global-cb09bc0c77c0"], "contraste ≥ 4,5:1 em todo nó de texto renderizado (inclui rótulos em <slot>)",
    semFundo.length === 0 && minimo >= 4.5 && m.textos.length >= 6, `${m.textos.length} nós, mínimo ${minimo.toFixed(2)}:1; Entrar ${m.bb.razao.toFixed(2)}, ajuda ${m.ajudaCor.razao.toFixed(2)}`);
  conforme(["govbr-3.7.0-development-global-a43ad8231ad0"], "fontes e ícones antes de core.min.css",
    ["rawline", "Raleway", "font-awesome"].every(x => m.cabeca.findIndex(h => h.includes(x)) < m.cabeca.indexOf("assets/core.min.css")));
  conforme(["govbr-3.7.0-development-global-9826b6862644"], "script sem type", m.scripts.length === 1 && m.scripts[0].type === null);
  conforme(["govbr-3.7.0-pattern-global-9d9f1c9bf1ed"], "nenhum título/rótulo recortado (o texto do botão de ajuda cabe na caixa dele)",
    m.truncados.length === 0 && m.ajuda.texto[0] >= m.ajuda.caixa[0] && m.ajuda.texto[1] <= m.ajuda.caixa[1], `texto ${m.ajuda.texto.map(Math.round).join("–")} em caixa ${m.ajuda.caixa.map(Math.round).join("–")}`);
  conforme(["govbr-3.7.0-pattern-global-5717506ac2e6"], "ponto de ajuda visível no conteúdo", m.ajuda.visivel && /Problemas ou dificuldades\? Contate nossa central/.test(m.ajuda.nome), m.ajuda.nome);
  conforme(["govbr-3.7.0-component-button-4d7b5f978df1"], "Buttons: Menu circular com nome; Entrar e ajuda com rótulo visível",
    /circle/.test(m.nav) && m.nav.endsWith("Menu") && /secondary/.test(m.bb.classes) && m.bb.texto === "Entrar com gov.br" && /primary/.test(m.ajuda.classes), `${m.nav} · ${m.bb.classes} "${m.bb.texto}" · ${m.ajuda.classes}`);
  conforme(["govbr-3.7.0-accessibility-divider-30bbcbf3a17c"], "divisor fora da ordem de foco", m.divisorTab < 0, String(m.divisorTab));

  // árvore de acessibilidade
  const cdp = await contexto.newCDPSession(pagina);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const botoes = nodes.filter(n => !n.ignored && n.role?.value === "button").map(n => n.name?.value);
  medir("árvore: três botões com nome (Menu, Entrar com gov.br, ajuda)", "conforme",
    botoes.length === 3 && botoes.includes("Menu") && botoes.includes("Entrar com gov.br") && botoes.some(b => /^Problemas ou dificuldades/.test(b ?? "")), botoes.map(b => (b ?? "").slice(0, 30)).join(" | "));
  await pagina.evaluate(() => document.querySelector("br-header").shadowRoot.querySelector(".br-divider").setAttribute("data-conf-divisor", "1"));
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  let alvo = null;
  const visitar = n => { if (n.attributes?.includes("data-conf-divisor")) alvo = n.backendNodeId; for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? [])]) visitar(c); };
  visitar(root);
  const nd = (await cdp.send("Accessibility.getFullAXTree")).nodes.find(n => n.backendDOMNodeId === alvo);
  conforme(["govbr-3.7.0-accessibility-divider-30bbcbf3a17c"], "divisor ignorado pela árvore de acessibilidade", !nd || nd.ignored === true);
  await cdp.detach();

  // teclado: foco visível nos três, e Enter ≡ clique (nenhum efeito) em cada
  const snap = () => pagina.evaluate(js(`return document.documentElement.outerHTML + todos().filter(e => e.shadowRoot).map(e => e.shadowRoot.innerHTML).join("") + location.href;`));
  const focos = [];
  let equivalentes = true;
  for (let i = 0; i < 3; i++) {
    await pagina.keyboard.press("Tab");
    focos.push(await pagina.evaluate(js(`const a = ativoProfundo(); const c = getComputedStyle(a); return { k: chave(a), o: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, fv: a.matches(":focus-visible") };`)));
  }
  const antes = await snap();
  for (const f of focos) {
    const h = await pagina.evaluateHandle(`(() => { ${PRELUDIO} return todos().find(e => chave(e) === ${JSON.stringify(f.k)}); })()`);
    await h.asElement().focus(); await pagina.keyboard.press("Enter"); await pagina.waitForTimeout(300);
    if ((await snap()) !== antes) equivalentes = false;
    await h.asElement().click(); await pagina.waitForTimeout(300);
    if ((await snap()) !== antes) equivalentes = false;
  }
  conforme(["govbr-3.7.0-accessibility-global-21fbcc2fe37b"], "foco de teclado visível nos três controles",
    focos.length === 3 && focos.every(f => f.fv && f.o === "dashed 4px rgb(194, 133, 12)"), focos.map(f => f.o).join(" | "));
  conforme(["govbr-3.7.0-accessibility-global-e6fd5e1247de", "govbr-3.7.0-accessibility-global-f639993e9416", "govbr-3.7.0-accessibility-global-41850b4791b8"],
    "os três controles alcançáveis por Tab; Enter ≡ clique (nenhum efeito, DOM e URL inalterados)", equivalentes && focos.length === 3);
  medir("estado: nenhum dos três controles produz estado", "estado", equivalentes);

  for (const c of referencia._meta.conformes.itens) {
    const n = await pagina.evaluate(js(`
      const s = ${JSON.stringify(c.selector)};
      if (s.includes(">>>")) { const hops = s.split(">>>").map(x => x.trim()); let roots = [document], found = [];
        for (let i = 0; i < hops.length; i++) { found = []; for (const r of roots) found.push(...r.querySelectorAll(hops[i])); roots = found.map(e => e.shadowRoot).filter(Boolean); } return found.length; }
      let n = 0; const v = r => { n += r.querySelectorAll(s).length; for (const e of r.querySelectorAll("*")) if (e.shadowRoot) v(e.shadowRoot); }; v(document); return n;`));
    medir(`_meta.conformes ${c.id}: "${c.selector}" resolve ${c.count}`, "conforme", n === c.count, String(n));
  }
  medir("_meta.conformes C-01/C-02: cores dos rótulos dos botões", "conforme",
    m.bb.cor === "rgb(19, 81, 180)" && m.bb.fundo === "rgb(255, 255, 255)" && m.ajudaCor.cor === "rgb(255, 255, 255)" && m.ajudaCor.fundo === "rgb(19, 81, 180)" && m.bb.razao >= 4.5 && m.ajudaCor.razao >= 4.5);
  medir("_meta.conformes C-05: textos do cabeçalho #333 sobre #fff", "conforme",
    m.contrasteHeader.every(h => h.cor === "rgb(51, 51, 51)" && h.fundo === "rgb(255, 255, 255)" && h.razao >= 4.5), m.contrasteHeader.map(h => h.razao.toFixed(2)).join(", "));

  const faltam = decisoes.linhas.filter(l => l.veredito === "conforme").map(l => l.id).filter(id => !mediu.has(id));
  medir("toda linha `conforme` de decisoes.json foi re-medida", "cobertura", faltam.length === 0, faltam.join(", ") || `${decisoes.linhas.filter(l => l.veredito === "conforme").length} linhas`);
  const unidades = [...new Set(decisoes.linhas.filter(l => l.destino === "unidade").flatMap(l => l.unidades))].sort();
  medir("unidades da tabela = specs da referência", "cobertura", JSON.stringify(unidades) === JSON.stringify(referencia.violations.map(v => v.id).sort()), unidades.join(","));
  await contexto.close();
} finally {
  await navegador.close();
  servidor.close();
}

for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} [${r.tipo}] ${r.id}${r.detalhe ? ` — ${r.detalhe}` : ""}`);
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} conferências ok (página ${URL})`);
process.exit(falhas === 0 ? 0 : 1);
