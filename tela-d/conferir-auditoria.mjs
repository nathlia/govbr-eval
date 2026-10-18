/**
 * Conferência sem modelo da auditoria da tela D = processos (método da B § 8.2; adendo da D § F).
 * Nada aqui importa do govbr-ds-validator nem do axe; o único texto de norma lido é a paleta de
 * tokens/colors.json da base normalizada 3.7.0 em ds-rules/06 (a mesma base de montar-decisoes.mjs).
 * Headless por padrão (`--headed` mostra a janela).
 *
 * 1. confere o sha256 de cada arquivo de pnip-d/manifesto.json (public e dist), nenhum fora, e a lista
 *    "caminho⇥sha256" = a do inventário da fase 1 (d3b99cab…);
 * 2. confere ground-truth-processos.json × sequencia.mjs (setup, states), url, viewport, e o sha256 de
 *    tela-d/conformes.json citado no _meta;
 * 3. serve o dist/ como a superfície (SPA + alias), aborta toda saída da origem;
 * 4. numa carga só, alcança cada parada pelo MESMO setup; em cada uma: path, mesmo documento, nenhuma
 *    escrita (rede + registro do mock), nenhum externo, nenhuma chamada sem fixture; resolve as âncoras
 *    e confere contagem e visibilidade; entre as paradas (um segmento) atributos e texto próprio de
 *    cada âncora não mudam (fora `class` e `data-focus-visible-added`, marca do polyfill de foco);
 * 5. re-mede cada unidade (D-01…D-14) e cada par conforme elegível (os 12 K sorteados e os demais),
 *    mais as linhas `conforme` de decisoes.json medidas na página; gestos e Tab em cargas auxiliares.
 *    O Tab real espera, depois de cada tecla, 300 ms e a lista presente (`WAIT_FOR`): sair do campo de
 *    pesquisa vazio refaz a consulta e a tabela some por um instante (E-04) — sem a espera, o Tab que
 *    cai nesse instante pula a tabela e a ordem dependeria do relógio;
 * 6. grava a evidência de cada spec e de cada K em tela-d/evidencia/<id>.json (conteúdo determinístico)
 *    e, se o _meta.evidencia da referência já tem sha256, confere que a re-medida reproduz o arquivo;
 * 7. imprime N/N e sai com código ≠ 0 se algo falhar.
 *
 * Uso: node tela-d/conferir-auditoria.mjs [--headed]
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { exigirBytes, servir, abrirNavegador, novaPagina, carregar, executarPassos, registroDoMock, PRELUDIO, RAIZ_EVAL, WAIT_FOR } from "./comum.mjs";
import { SETUP, STATES } from "./sequencia.mjs";
import { ELEGIVEIS } from "./sortear-conformes.mjs";

const GT_CAMINHO = join(RAIZ_EVAL, "ground-truth-processos.json");
const GT = JSON.parse(readFileSync(GT_CAMINHO, "utf8"));
const CONF_CAMINHO = join(RAIZ_EVAL, "tela-d/conformes.json");
const CONF = JSON.parse(readFileSync(CONF_CAMINHO, "utf8"));
const ESTADOS_TESTE = JSON.parse(readFileSync(join(RAIZ_EVAL, "tela-d/estados.json"), "utf8"));
const DECISOES = JSON.parse(readFileSync(join(RAIZ_EVAL, "tela-d/decisoes.json"), "utf8"));
const EVID = join(RAIZ_EVAL, "tela-d/evidencia");
const PALETA = (() => {
  const s = readFileSync(join(RAIZ_EVAL, "../ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/tokens/colors.json"), "utf8").toLowerCase();
  const hex = new Set(s.match(/#[0-9a-f]{6}\b/g) ?? []);
  for (const h of s.match(/#[0-9a-f]{3}\b/g) ?? []) hex.add("#" + [...h.slice(1)].map(c => c + c).join(""));
  return hex;
})();
const sha = b => createHash("sha256").update(b).digest("hex");
const LISTA_FASE1 = "d3b99cabb89492cf2b0c5d6bb6d4ae721d99e6ed1277c7e6d4c9db31ba16857e";
const ROTA = STATES[0].path;

const resultados = [];
const ok = (id, cond, medida) => { resultados.push({ id, ok: !!cond, medida }); return !!cond; };
const evidencia = {};
const medidasK = {};
const ev = (id, chave, valor) => { (evidencia[id] = evidencia[id] || { id, medidas: {} }).medidas[chave] = valor; };

// ── 1. bytes ──────────────────────────────────────────────────────────────────────────────────────
const bytes = exigirBytes();
ok("bytes: árvore pnip-d/ = manifesto (public e dist), nada fora", bytes.modo === "congelado" && !bytes.divergentes.length && !bytes.fora.length && !bytes.ausentes.length, `${bytes.n} arquivos · manifesto sha256 ${bytes.manifestoSha}`);
ok("bytes: lista caminho⇥sha256 = a do inventário da fase 1", bytes.sha256Lista === LISTA_FASE1, bytes.sha256Lista);

// ── 2. referência × sequência ─────────────────────────────────────────────────────────────────────
ok("referência: _meta.setup = sequencia.mjs", JSON.stringify(GT._meta.setup) === JSON.stringify(SETUP), `${SETUP.length} passos`);
ok("referência: _meta.states = sequencia.mjs", JSON.stringify(GT._meta.states) === JSON.stringify(STATES), STATES.map(s => `${s.id}@${s.afterStep}`).join(" "));
ok("referência: url, waitFor e viewport", GT._meta.url === "/pnip-d/portal-mpa/processos?mock-perfil=mpa" && GT._meta.waitFor === WAIT_FOR && GT._meta.viewport.width === 1280 && GT._meta.viewport.height === 900, GT._meta.url);
ok("referência: sha256 de conformes.json citado no _meta", GT._meta.conformes.sha256 === sha(readFileSync(CONF_CAMINHO)), GT._meta.conformes.sha256);
ok("referência: _meta.conformes.itens = conformes.json", JSON.stringify(GT._meta.conformes.itens) === JSON.stringify(CONF.itens.map(({ id, state, selector, count, rules, medida }) => ({ id, state, selector, count, rules, medida }))), `${CONF.itens.length} controles`);
ok("conformes: cada K é um par elegível com o mesmo seletor/contagem", CONF.itens.every(k => ELEGIVEIS.some(e => e.par === k.par && e.selector === k.selector && e.count === k.count && e.state === k.state)), CONF.itens.map(k => k.par).join(", "));

const specs = GT.violations;
const conformes = CONF.itens;
const sp = id => specs.find(s => s.id === id);

// Medida de uma âncora, dentro da página (texto).
const MEDIR = `((sel) => {
${PRELUDIO}
  const rgba = s => { const m = s.match(/rgba?[(]([^)]+)[)]/); if (!m) return null; const p = m[1].split(",").map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const paiComposto = el => el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el).host : null);
  const fundo = el => { let e = el; while (e) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = rgba(cs.backgroundColor); if (c && c.a === 1) return c; if (c && c.a > 0) return null; e = paiComposto(e); } return { r: 255, g: 255, b: 255, a: 1 }; };
  const razao = el => { const fg = rgba(getComputedStyle(el).color); const bg = fundo(el); if (!fg || !bg) return null; const a = lum(fg), b = lum(bg); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
  return queryAll(sel).map(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const interno = el.shadowRoot ? el.shadowRoot.querySelector("button") : null;
    const ri = interno ? interno.getBoundingClientRect() : null;
    return {
      chave: chave(el), visivel: visivel(el), tag: el.tagName.toLowerCase(),
      attrs: Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("_ng") && a.name !== "class" && a.name !== "data-aud-i" && a.name !== "data-focus-visible-added").map(a => [a.name, a.value])),
      classes: (el.getAttribute("class") || "").split(" ").filter(Boolean),
      textoProprio: Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim(),
      texto: (el.textContent || "").trim(), labels: el.labels ? el.labels.length : null,
      tabIndex: el.tabIndex, razao: razao(el), cursor: cs.cursor,
      raio: cs.borderRadius, padding: cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft,
      caixa: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      cor: cs.color, fundo: (() => { const f = fundo(el); return f ? "rgb(" + f.r + ", " + f.g + ", " + f.b + ")" : null; })(),
      fonte: cs.fontSize + " " + cs.fontWeight,
      interno: interno ? { classes: (interno.getAttribute("class") || "").split(" ").filter(Boolean), texto: (interno.innerText || "").trim(), titulo: interno.getAttribute("title"), ariaLabel: interno.getAttribute("aria-label"), desabilitado: interno.disabled, raio: getComputedStyle(interno).borderRadius, caixa: [Math.round(ri.width), Math.round(ri.height)] } : null,
      caption: el.tagName === "TABLE" ? (el.caption ? el.caption.textContent.trim() : null) : undefined,
    };
  });
})`;
const medir = (pagina, sel) => pagina.evaluate(`${MEDIR}(${JSON.stringify(sel)})`);

const GLOBAL = `(() => {
${PRELUDIO}
  const els = todos();
  return {
    path: location.pathname, doc: window.__auditoriaDoc || null, titulo: document.title, lang: document.documentElement.getAttribute("lang"),
    metaRefresh: !!document.querySelector("meta[http-equiv=refresh i]"), animacoes: document.getAnimations().length,
    ancoras: els.filter(e => e.tagName === "A" && (e.getAttribute("href") || "").startsWith("#")).length, skiplink: els.filter(e => e.classList && e.classList.contains("br-skiplink")).length,
    cabecalhos: els.filter(e => /^H[1-6]$/.test(e.tagName) && visivel(e)).map(e => +e.tagName[1]),
    h1: els.filter(e => e.tagName === "H1").length,
    fontes: [...new Set(els.filter(e => visivel(e) && Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())).map(e => getComputedStyle(e).fontFamily))],
    cores: [...new Set(els.filter(visivel).flatMap(e => { const cs = getComputedStyle(e); const out = [];
      if (Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) out.push(cs.color);
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") out.push(cs.backgroundColor);
      for (const l of ["top", "right", "bottom", "left"]) if (parseFloat(cs.getPropertyValue("border-" + l + "-width")) > 0 && cs.getPropertyValue("border-" + l + "-style") !== "none") out.push(cs.getPropertyValue("border-" + l + "-color"));
      return out; }))],
    cabeca: Array.from(document.head.children).map(e => e.getAttribute("href") || e.getAttribute("src") || e.tagName.toLowerCase()),
    scripts: Array.from(document.scripts).map(s => s.getAttribute("type")),
    dialogosAbertos: els.filter(e => visivel(e) && (e.classList.contains("br-modal") || e.classList.contains("swal2-popup") || ["dialog", "alertdialog"].includes(e.getAttribute("role")))).length,
    larguraDoc: document.documentElement.scrollWidth,
    pesquisaHospedeiro: (() => { const h = document.querySelector("pnip-search-table-utils br-input"); return h ? { label: h.getAttribute("label"), placeholder: h.getAttribute("placeholder") } : null; })(),
    iframe: (() => { const f = document.querySelector("pnip-mpa-processos > iframe"); if (!f) return null; let d = null; try { d = { url: f.contentDocument.URL, filhos: f.contentDocument.body ? f.contentDocument.body.childElementCount : null }; } catch (e) { d = "cross-origin"; } return { src: f.getAttribute("src"), title: f.getAttribute("title"), name: f.getAttribute("name"), aria: f.getAttribute("aria-label"), doc: d }; })(),
  };
})()`;
const hex = c => { const n = (c.match(/\d+(\.\d+)?/g) ?? []).map(Number); if (n.length > 3 && n[3] < 1) return null; return "#" + n.slice(0, 3).map(v => v.toString(16).padStart(2, "0")).join(""); };

/** AX (CDP) dos elementos casados por um seletor (queryAll), com todas as propriedades. */
async function axDe(contexto, pagina, sel) {
  await pagina.evaluate(`(() => { ${PRELUDIO} queryAll(${JSON.stringify(sel)}).forEach((e, i) => e.setAttribute("data-aud-ax", String(i))); })()`);
  const cdp = await contexto.newCDPSession(pagina);
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const porBackend = new Map();
  const visitar = n => { if (n.attributes) { const k = n.attributes.indexOf("data-aud-ax"); if (k >= 0) porBackend.set(n.backendNodeId, +n.attributes[k + 1]); } for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? [])]) visitar(c); };
  visitar(root);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const out = [];
  for (const n of nodes) { const i = porBackend.get(n.backendDOMNodeId); if (i == null) continue;
    out[i] = { ignorado: !!n.ignored, papel: n.role?.value ?? null, nome: n.name?.value ?? "", focavel: (n.properties ?? []).some(p => p.name === "focusable" && p.value?.value === true) }; }
  await pagina.evaluate(`(() => { ${PRELUDIO} queryAll(${JSON.stringify(sel)}).forEach(e => e.removeAttribute("data-aud-ax")); })()`);
  return out;
}
const ATIVO = `(() => { ${PRELUDIO} const a = ativoProfundo(); if (!a || a === document.body) return { chave: "body" }; const c = getComputedStyle(a);
  return { chave: chave(a), tag: a.tagName.toLowerCase(), texto: (a.textContent || "").trim().slice(0, 40),
    indicador: (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== "none", contorno: c.outlineStyle + " " + c.outlineWidth + " " + c.outlineColor, sombra: c.boxShadow, focoVisivel: a.matches(":focus-visible") }; })()`;

const { servidor, base } = await servir();
const navegador = await abrirNavegador();
try {
  // ── 4. carga principal ───────────────────────────────────────────────────────────────────────────
  const principal = await novaPagina(navegador);
  const { pagina } = principal;
  await carregar(pagina, base);
  await pagina.evaluate(() => { window.__auditoriaDoc = window.__auditoriaDoc || Math.random().toString(36).slice(2); });
  const docInicial = await pagina.evaluate(() => window.__auditoriaDoc);
  let feito = 0;
  const porEstado = {};
  const seletores = [...new Set([...specs.map(s => s.anchor), ...ELEGIVEIS.map(e => e.selector)])];
  const axPrincipal = {};
  const AX_SELS = [sp("D-02").anchor, sp("D-03").anchor, sp("D-04").anchor, sp("D-05").anchor, sp("D-07").anchor, sp("D-08").anchor, sp("D-10").anchor, `${sp("D-01").anchor} >>> button`, "pnip-mpa-processos > br-divider >>> span"];
  for (const st of STATES) {
    await executarPassos(pagina, SETUP.slice(feito, st.afterStep)); feito = st.afterStep;
    const g = await pagina.evaluate(GLOBAL);
    ok(`${st.id}: path`, g.path === st.path, g.path);
    ok(`${st.id}: mesmo documento (sem recarga)`, g.doc === docInicial, g.doc === docInicial ? "marca do documento intacta" : "RECARREGOU");
    const mock = await registroDoMock(pagina);
    ok(`${st.id}: nenhuma escrita, nenhum externo, nenhuma chamada sem fixture`, principal.escritas().length === 0 && mock.atendidos.every(k => /^GET /.test(k)) && principal.externos().length === 0 && mock.naoMockados.length === 0,
      `rede ${principal.escritas().length} · registro do mock ${mock.atendidos.filter(k => !/^GET /.test(k)).length} · externos ${principal.externos().length} · sem fixture ${mock.naoMockados.length}`);
    const med = {};
    for (const s of seletores) med[s] = await medir(pagina, s);
    porEstado[st.id] = { g, med };
    for (const a of [...specs.map(s => ({ id: s.id, sel: s.anchor, n: s.expectedCount, state: s.state })), ...ELEGIVEIS.map(e => ({ id: e.par, sel: e.selector, n: e.count, state: e.state }))]) {
      if (a.state !== st.id && a.state !== "sempre") continue;
      const exigeVisivel = !a.sel.startsWith("head");
      ok(`${a.id} @${st.id}: âncora resolve ${a.n}`, med[a.sel].length === a.n && (!exigeVisivel || med[a.sel].every(x => x.visivel)), `${med[a.sel].length} elemento(s), ${med[a.sel].filter(x => x.visivel).length} visível(is)`);
    }
    if (st.id === "inicial") for (const s of AX_SELS) axPrincipal[s] = await axDe(principal.contexto, pagina, s);
  }
  {
    const difs = [];
    for (const sel of seletores) for (const x of porEstado.inicial.med[sel]) { const y = porEstado["lista-exibir"].med[sel].find(e => e.chave === x.chave); if (y && (JSON.stringify(x.attrs) !== JSON.stringify(y.attrs) || x.textoProprio !== y.textoProprio)) difs.push(`${sel} ${x.chave}`); }
    ok("segmento único (inicial → lista-exibir): âncoras com atributos e texto inalterados", difs.length === 0, difs.join("; ") || "nenhuma diferença");
  }
  await principal.contexto.close();

  const M = (st, sel) => porEstado[st].med[sel];
  const G = st => porEstado[st].g;
  const AX = sel => axPrincipal[sel];

  // ── 5. unidades ──────────────────────────────────────────────────────────────────────────────────
  {
    const xs = M("inicial", sp("D-01").anchor); const axs = AX(`${sp("D-01").anchor} >>> button`);
    ev("D-01", "botoes", xs.map((x, i) => ({ titulo: x.attrs.title, hospedeiroLabel: x.attrs.label ?? null, hospedeiroCircle: x.attrs.circle ?? null, classesInternas: x.interno?.classes, textoVisivel: x.texto + x.interno?.texto, caixa: x.interno?.caixa, raio: x.interno?.raio, desabilitado: x.interno?.desabilitado, ax: { papel: axs[i]?.papel, nome: axs[i]?.nome } })));
    ok("D-01 18 botões de ação das linhas: sem label nem circle no hospedeiro, sem texto visível, não circulares", xs.length === 18 && xs.every(x => !("label" in x.attrs) && !("circle" in x.attrs) && x.texto === "" && x.interno && x.interno.texto === "" && !x.interno.classes.includes("circle") && x.interno.caixa[0] !== x.interno.caixa[1] && x.interno.raio !== "50%"),
      `${xs.length} · caixas ${[...new Set(xs.map(x => x.interno?.caixa.join("×")))].join(",")} · raio ${[...new Set(xs.map(x => x.interno?.raio))].join(",")}`);
    ok("D-01 o nome vem só do title (Ver processo ×9, Desassociar… ×9; 8 desabilitados)", xs.every((x, i) => axs[i]?.papel === "button" && axs[i]?.nome === x.attrs.title) && xs.filter(x => x.attrs.title === "Ver processo").length === 9 && xs.filter(x => x.interno?.desabilitado).length === 8,
      [...new Set(axs.map(a => a?.nome))].join(" | "));
  }
  {
    const xs = M("inicial", sp("D-02").anchor); const axs = AX(sp("D-02").anchor);
    ev("D-02", "elementos", xs.map((x, i) => ({ texto: x.texto, href: x.attrs.href ?? null, tabindex: x.attrs.tabindex ?? null, role: x.attrs.role ?? null, cursor: x.cursor, ax: { papel: axs[i]?.papel, focavel: axs[i]?.focavel } })));
    ok("D-02 9 números de processo: <a role=button> sem href nem tabindex, não focáveis na árvore", xs.length === 9 && xs.every((x, i) => x.tag === "a" && !("href" in x.attrs) && !("tabindex" in x.attrs) && x.attrs.role === "button" && x.cursor === "pointer" && axs[i]?.focavel === false), xs.map(x => x.texto).join(", "));
  }
  {
    const xs = M("inicial", sp("D-03").anchor); const axs = AX(sp("D-03").anchor);
    ev("D-03", "elementos", xs.map((x, i) => ({ texto: x.texto, tag: x.tag, role: x.attrs.role ?? null, tabindex: x.attrs.tabindex ?? null, tabIndex: x.tabIndex, cursor: x.cursor, ax: { papel: axs[i]?.papel, nome: axs[i]?.nome, focavel: axs[i]?.focavel } })));
    ok("D-03 7 etiquetas interativas: <span> sem role nem tabindex, tabIndex -1, cursor pointer, papel generic sem nome", xs.length === 7 && xs.every((x, i) => x.tag === "span" && !("role" in x.attrs) && !("tabindex" in x.attrs) && x.tabIndex === -1 && x.cursor === "pointer" && axs[i]?.papel === "generic" && axs[i]?.nome === "" && !axs[i]?.focavel), xs.map(x => x.texto).join(", "));
  }
  {
    const xs = M("inicial", sp("D-04").anchor); const axs = AX(sp("D-04").anchor);
    ev("D-04", "checkboxes", xs.map((x, i) => ({ chave: x.chave.slice(-60), labels: x.labels, ariaLabel: x.attrs["aria-label"] ?? null, ariaLabelledby: x.attrs["aria-labelledby"] ?? null, title: x.attrs.title ?? null, ax: { papel: axs[i]?.papel, nome: axs[i]?.nome } })));
    ok("D-04 7 checkboxes da tabela sem rótulo (labels 0, sem aria-label/labelledby/title, nome \"\")", xs.length === 7 && xs.every((x, i) => x.labels === 0 && !x.attrs["aria-label"] && !x.attrs["aria-labelledby"] && !x.attrs.title && axs[i]?.papel === "checkbox" && axs[i]?.nome === ""), `${xs.length} · nomes ${[...new Set(axs.map(a => JSON.stringify(a?.nome)))].join(",")}`);
  }
  {
    const x = M("inicial", sp("D-05").anchor)[0]; const ax = AX(sp("D-05").anchor)[0]; const h = G("inicial").pesquisaHospedeiro;
    ev("D-05", "campo", { id: x.attrs.id, labels: x.labels, ariaLabel: x.attrs["aria-label"] ?? null, ariaLabelledby: x.attrs["aria-labelledby"] ?? null, placeholder: x.attrs.placeholder, hospedeiro: h, ax: { papel: ax?.papel, nome: ax?.nome } });
    ok("D-05 campo de pesquisa sem rótulo: labels 0, sem aria-label/labelledby, br-input sem label; nome = placeholder", x.labels === 0 && !x.attrs["aria-label"] && !x.attrs["aria-labelledby"] && h && h.label === null && ax?.nome === x.attrs.placeholder && ax?.nome === "Pesquise aqui ...", `labels ${x.labels} · AX ${ax?.papel} "${ax?.nome}"`);
  }
  {
    const xs = M("inicial", sp("D-06").anchor);
    ev("D-06", "contraste", xs.map(x => ({ texto: x.texto, cor: x.cor, fundo: x.fundo, fonte: x.fonte, razao: x.razao })));
    ok("D-06 8 status com texto branco abaixo de 4,5:1", xs.length === 8 && xs.every(x => x.razao !== null && x.razao < 4.5), xs.map(x => `${x.texto} ${x.razao}`).join(" · "));
  }
  {
    const x = M("inicial", sp("D-07").anchor)[0]; const ax = AX(sp("D-07").anchor)[0];
    ev("D-07", "tabela", { caption: x.caption ?? null, ariaLabel: x.attrs["aria-label"] ?? null, ariaLabelledby: x.attrs["aria-labelledby"] ?? null, summary: x.attrs.summary ?? null, ax: { papel: ax?.papel, nome: ax?.nome } });
    ok("D-07 tabela sem caption nem nome", x.caption === null && !x.attrs["aria-label"] && !x.attrs["aria-labelledby"] && ax?.nome === "", `caption ${x.caption} · AX ${ax?.papel} "${ax?.nome}"`);
  }
  {
    const x = M("inicial", sp("D-08").anchor)[0]; const ax = AX(sp("D-08").anchor)[0];
    ev("D-08", "th", { texto: x.texto, scope: x.attrs.scope ?? null, ax: { papel: ax?.papel, nome: ax?.nome } });
    ok("D-08 th da coluna de ações vazio (columnheader sem nome)", x.texto === "" && ax?.papel === "columnheader" && ax?.nome === "", `texto "${x.texto}" · AX ${ax?.papel} "${ax?.nome}"`);
  }
  {
    const xs = M("inicial", sp("D-09").anchor);
    ev("D-09", "alvos", xs.map(x => ({ ariaLabel: x.attrs["aria-label"], caixa: x.caixa.slice(2), texto: x.texto })));
    ok("D-09 3 alvos de ícone autorais de 32×32 (Buscar, Exibir lista ×2)", xs.length === 3 && xs.every(x => x.caixa[2] === 32 && x.caixa[3] === 32 && x.texto === "") && JSON.stringify(xs.map(x => x.attrs["aria-label"])) === JSON.stringify(["Buscar", "Exibir lista", "Exibir lista"]), xs.map(x => `${x.attrs["aria-label"]} ${x.caixa[2]}×${x.caixa[3]}`).join(" · "));
  }
  {
    const g = G("inicial").iframe; const ax = AX(sp("D-10").anchor)[0]; const x = M("inicial", sp("D-10").anchor)[0];
    ev("D-10", "iframe", { ...g, caixa: x.caixa.slice(2), ax: { papel: ax?.papel, nome: ax?.nome } });
    ok("D-10 iframe vazio sem nome: sem src/title/name, about:blank, papel Iframe nome \"\"", g && g.src === null && g.title === null && g.name === null && g.aria === null && g.doc?.url === "about:blank" && g.doc?.filhos === 0 && ax?.nome === "", `${x.caixa[2]}×${x.caixa[3]} · AX ${ax?.papel} "${ax?.nome}"`);
  }
  ok("D-11 sem salto para o conteúdo (2 paradas)", STATES.every(s => G(s.id).ancoras === 0 && G(s.id).skiplink === 0), STATES.map(s => `${s.id}: âncoras # ${G(s.id).ancoras}, .br-skiplink ${G(s.id).skiplink}`).join(" · "));
  ev("D-11", "paradas", STATES.map(s => ({ parada: s.id, ancorasHash: G(s.id).ancoras, skiplink: G(s.id).skiplink })));
  ok("D-12 um só título (h2), nenhum h1", STATES.every(s => JSON.stringify(G(s.id).cabecalhos) === "[2]" && G(s.id).h1 === 0), STATES.map(s => G(s.id).cabecalhos.map(n => "h" + n).join(" ")).join(" · "));
  ev("D-12", "titulos", STATES.map(s => ({ parada: s.id, niveis: G(s.id).cabecalhos, h1: G(s.id).h1 })));
  ok("D-13 <title> \"PNIP\" nas 2 paradas", STATES.every(s => G(s.id).titulo === "PNIP"), STATES.map(s => `${s.id}: "${G(s.id).titulo}"`).join(" · "));
  ev("D-13", "titulo", STATES.map(s => ({ parada: s.id, titulo: G(s.id).titulo })));
  {
    const xs = STATES.map(s => M(s.id, sp("D-14").anchor)[0]);
    ev("D-14", "contraste", xs.map((x, i) => ({ parada: STATES[i].id, texto: x.texto, cor: x.cor, fundo: x.fundo, fonte: x.fonte, razao: x.razao })));
    ok("D-14 inicial do avatar < 4,5:1 nas 2 paradas", xs.every(x => x.razao !== null && x.razao < 4.5), xs.map(x => `"${x.texto}" ${x.razao}:1`).join(" · "));
  }

  // ── conformes elegíveis (todos), os K são o subconjunto sorteado ─────────────────────────────────
  const E = par => ELEGIVEIS.find(e => e.par === par);
  const ME = par => M(E(par).state, E(par).selector);
  const confere = (par, cond, medida, dados) => { ok(`conforme ${par}`, cond, medida); medidasK[par] = dados ?? medida; };
  confere("breadcrumb-li", ME("breadcrumb-li").length === 2 && ME("breadcrumb-li").every(x => x.tag === "li"), ME("breadcrumb-li").map(x => x.texto).join(" | "), ME("breadcrumb-li").map(x => ({ tag: x.tag, texto: x.texto })));
  confere("breadcrumb-orientacao", ME("breadcrumb-li").at(-1).texto === "Processos", `último item "${ME("breadcrumb-li").at(-1).texto}"`);
  confere("titulo-contraste", ME("titulo-contraste").every(x => x.razao >= 4.5), ME("titulo-contraste").map(x => `${x.texto} ${x.razao}:1`).join(", "), ME("titulo-contraste").map(x => ({ texto: x.texto, razao: x.razao })));
  confere("botoes-rotulo", ME("botoes-rotulo").every(x => x.interno && x.interno.texto === x.attrs.label && !x.interno.classes.includes("circle")), ME("botoes-rotulo").map(x => `"${x.interno?.texto}"`).join(", "), ME("botoes-rotulo").map(x => ({ label: x.attrs.label, textoVisivel: x.interno?.texto })));
  confere("assinar-rotulo", ME("assinar-rotulo").every(x => x.interno && x.texto === "Assinar" && !x.interno.classes.includes("circle") && x.interno.caixa[0] > x.interno.caixa[1]), ME("assinar-rotulo").map(x => `"${x.texto}" (projetado no slot) ${x.interno?.caixa.join("×")}`).join(", "), ME("assinar-rotulo").map(x => ({ textoVisivel: x.texto, caixa: x.interno?.caixa })));
  confere("th-contraste", ME("th-contraste").every(x => x.razao >= 4.5 && x.texto !== ""), `mín ${Math.min(...ME("th-contraste").map(x => x.razao))}:1 em ${ME("th-contraste").length}`, ME("th-contraste").map(x => ({ texto: x.texto, razao: x.razao })));
  confere("status-contraste", ME("status-contraste").every(x => x.razao >= 4.5), ME("status-contraste").map(x => `${x.texto} ${x.razao}:1`).join(","), ME("status-contraste").map(x => ({ texto: x.texto, razao: x.razao })));
  confere("abas-teclado", ME("abas-teclado").every(x => x.tag === "button" && x.tabIndex === 0) && ["AGUARDANDO_ANALISE", "TRAMITANDO", "HISTORICO"].every(r => { const vs = ESTADOS_TESTE.resultados.filter(q => q.rotulo === r); const c = vs.find(q => q.gesto === "clique"), e = vs.find(q => q.gesto === "enter"); return c && e && c.veredito === e.veredito && c.repeticoes === e.repeticoes; }),
    "botões tabIndex 0; Enter ≡ clique nas três (estados.json)", ME("abas-teclado").map(x => ({ texto: x.texto, tag: x.tag, tabIndex: x.tabIndex })));
  {
    const ax = AX("pnip-mpa-processos > br-divider >>> span");
    confere("divisor", ME("divisor").every(x => x.tabIndex < 0) && ax.length > 0 && ax.every(a => a && (a.ignorado || a.papel === "none" || a.papel === "generic") && a.nome === "" && !a.focavel), `tabIndex ${ME("divisor").map(x => x.tabIndex)} · AX ${ax.map(a => `${a?.papel}${a?.ignorado ? "(ignorado)" : ""}`).join(",")}`, { tabIndex: ME("divisor").map(x => x.tabIndex), ax: ax.map(a => ({ papel: a?.papel, ignorado: a?.ignorado })) });
  }
  confere("radio-rotulo", ME("radio-rotulo").every(x => x.labels === 1), ME("radio-rotulo").map(x => x.labels).join(","), ME("radio-rotulo").map(x => ({ labels: x.labels, valor: x.attrs.value })));
  confere("item-padding", ME("item-padding").every(x => x.padding === "16px 16px 16px 16px"), [...new Set(ME("item-padding").map(x => x.padding))].join(" | "), ME("item-padding").map(x => ({ padding: x.padding })));

  // ── linhas `conforme` de decisoes.json medidas na página ─────────────────────────────────────────
  ok("lang pt-br (698e0a4783a9)", STATES.every(s => G(s.id).lang === "pt-br"), G("inicial").lang);
  ok("sem meta refresh, 0 animações (2.3, 2.4, 2.6, 2.7, 5.5)", STATES.every(s => !G(s.id).metaRefresh && G(s.id).animacoes === 0), STATES.map(s => G(s.id).animacoes).join(","));
  ok("Rawline em todo texto visível (406774b1cb87)", STATES.every(s => G(s.id).fontes.every(f => f.startsWith("Rawline"))), [...new Set(STATES.flatMap(s => G(s.id).fontes))].join(" | "));
  { const fora = [...new Set(STATES.flatMap(s => G(s.id).cores).map(hex).filter(h => h && !PALETA.has(h)))]; ok("cores na paleta 3.7.0 (21b1a2733f7b)", fora.length === 0, fora.join(" · ") || `nenhuma fora (${PALETA.size} cores na paleta)`); }
  ok("fontes antes do CSS do DS (a43ad8231ad0)", (() => { const c = G("inicial").cabeca; const i = c.findIndex(x => /styles\./.test(x)); return i > c.findIndex(x => /rawline/.test(x)) && i > c.findIndex(x => /raleway/.test(x)); })(), G("inicial").cabeca.filter(x => /css/.test(x)).join(" → "));
  ok("scripts sem type redundante (9826b6862644)", G("inicial").scripts.every(t => t === null || t === "module"), G("inicial").scripts.map(t => t ?? "∅").join(","));
  ok("nenhum diálogo aberto sem ação (5be1f553cc03)", STATES.every(s => G(s.id).dialogosAbertos === 0), STATES.map(s => G(s.id).dialogosAbertos).join(","));
  ok("sem rolagem horizontal em 1280", STATES.every(s => G(s.id).larguraDoc <= 1280), STATES.map(s => G(s.id).larguraDoc).join(","));
  ok("decisoes.json: 186 linhas, viola só nas regras das unidades", DECISOES.linhas.length === 186 && DECISOES.linhas.filter(l => l.veredito === "viola").every(l => l.unidades.every(u => specs.some(s => s.id === u && s.rules.includes(l.id)))), `${DECISOES.linhas.filter(l => l.veredito === "viola").length} linhas viola`);
  ok("toda spec cita ao menos uma linha viola de decisoes.json", specs.every(s => DECISOES.linhas.some(l => l.veredito === "viola" && l.unidades.includes(s.id) && s.rules.includes(l.id))), specs.map(s => s.id).join(","));

  // ── cargas auxiliares: gestos e teclado ──────────────────────────────────────────────────────────
  const aux = async fn => { const s = await novaPagina(navegador); try { await carregar(s.pagina, base); return await fn(s); } finally { await s.contexto.close(); } };
  const tecla = async (pagina, t) => { await pagina.keyboard.press(t); await pagina.waitForTimeout(300); await pagina.waitForSelector(WAIT_FOR, { timeout: 15_000 }); return pagina.evaluate(ATIVO); };
  // Tab real na inicial, até o ciclo do iframe aparecer duas vezes
  const ordem = await aux(async ({ pagina }) => {
    await pagina.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    const pts = [];
    for (let k = 0; k < 70; k++) { pts.push(await tecla(pagina, "Tab")); if (pts.filter(p => p.tag === "iframe").length >= 3) break; }
    return pts;
  });
  {
    const chaves = ordem.map(p => p.chave);
    const alcancou = sel => M("inicial", sel).filter(x => chaves.includes(x.chave)).length;
    const iV = ordem.findIndex(p => p.texto === "Voltar");
    const cauda = ordem.slice(iV + 1).map(p => p.tag ?? "body");
    ev("D-10", "tabDepoisDoVoltar", cauda);
    const ifr = ordem.find(p => p.tag === "iframe");
    ev("D-10", "focoNoIframe", ifr ? { contorno: ifr.contorno, sombra: ifr.sombra, focoVisivel: ifr.focoVisivel } : null);
    ok("D-10 o iframe é ponto de Tab sem indicação de foco (outline none, sem sombra)", ifr && !ifr.indicador && ifr.contorno.startsWith("none"), ifr ? `${ifr.contorno} / ${ifr.sombra} / :focus-visible ${ifr.focoVisivel}` : "iframe não alcançado");
    ok("D-10 depois do Voltar o Tab alterna iframe ↔ body (E-01)", iV > 0 && cauda.length >= 5 && cauda.every((t, i) => t === (i % 2 === 0 ? "iframe" : "body")), cauda.join(" → "));
    const d02 = alcancou(sp("D-02").anchor), d03 = alcancou(sp("D-03").anchor);
    ev("D-02", "alcancadosPorTab", d02); ev("D-03", "alcancadosPorTab", d03);
    ok("D-02 nenhum número de processo alcançado por Tab real", d02 === 0, `${d02} de 9`);
    ok("D-03 nenhuma etiqueta interativa alcançada por Tab real", d03 === 0, `${d03} de 7`);
    const cbs = ordem.filter(p => /input$/.test(p.chave) && /table>(thead|tbody)/.test(p.chave)).length;
    ok("D-04 os 7 checkboxes estão no Tab (são controles operáveis sem nome)", cbs === 7, `${cbs} alcançados`);
    const iconesTab = ordem.filter(p => /td:nth-of-type\(9\)>br-button:nth-of-type\([12]\) >>> button$/.test(p.chave)).length;
    ev("D-01", "alcancadosPorTab", iconesTab);
    ok("D-01 os 10 botões de ícone habilitados estão no Tab (9 Ver processo + 1 Desassociar)", iconesTab === 10, `${iconesTab}`);
    ok("D-11 1º ponto de Tab não é salto (é o botão Menu)", ordem[0].tag === "button" && /br-header >>> /.test(ordem[0].chave), `1º: <${ordem[0].tag}> ${ordem[0].chave.slice(-50)}`);
    ev("D-11", "primeiroTab", { tag: ordem[0].tag, chave: ordem[0].chave.slice(-60) });
    const bc = ordem.filter(p => /br-breadcrumb >>> div>ul>li:nth-of-type\(1\)>a$/.test(p.chave)).length;
    confere("breadcrumb-tab", bc === 1 && ME("breadcrumb-tab").every(x => x.tabIndex === 0 && x.attrs.href), `link Home no Tab: ${bc}`, { alcancadosPorTab: bc, links: ME("breadcrumb-tab").map(x => ({ texto: x.texto, tabIndex: x.tabIndex })) });
    const exp = ordem.find(p => /div:nth-of-type\(1\)>div:nth-of-type\(2\)>br-button >>> button$/.test(p.chave) && p.texto === "Exportar");
    confere("exportar-foco", exp && exp.contorno.startsWith("dashed 4px") && exp.focoVisivel, exp ? exp.contorno : "—", { contorno: exp?.contorno ?? null });
    // 4.4: indicador em todo ponto de Tab (fora: body, o iframe — D-10 — e a lista do seletor, fundo)
    const lista = ordem.filter(p => /br-select-pnip>div>div:nth-of-type\(2\)$/.test(p.chave));
    const medidos = ordem.filter(p => p.chave !== "body" && p.tag !== "iframe" && !lista.includes(p));
    ok("indicador de foco em todo ponto de Tab da inicial, fora o iframe (21fbcc2fe37b)", medidos.every(p => p.indicador), `${medidos.filter(p => p.indicador).length}/${medidos.length} (fora: iframe = D-10; ${lista.length} lista do seletor — fundo, core .br-select .br-list:focus{outline:none})`);
    ok("fundo: a lista do seletor focada não muda de estilo (regra do core): sem contorno, só a sombra que já tinha", lista.length === 2 && lista.every(p => p.contorno.startsWith("none") && p.sombra === "rgba(0, 0, 0, 0.16) 0px 3px 6px 0px"), lista.map(p => `${p.contorno} / ${p.sombra}`).join(" · "));
    const iL = ordem.findIndex(p => /nav>div:nth-of-type\(1\)>br-select-pnip>div>div:nth-of-type\(2\)$/.test(p.chave));
    ok("E-05 (registro): depois da lista do \"Exibir\" o Tab cai no <body>", iL > 0 && ordem[iL + 1]?.chave === "body", ordem[iL + 1]?.chave ?? "—");
  }
  // D-10: Shift+Tab a partir do iframe sai dele (volta ao Voltar)
  {
    const r = await aux(async ({ pagina }) => { await pagina.evaluate(() => document.querySelector("pnip-mpa-processos > iframe").focus()); return tecla(pagina, "Shift+Tab"); });
    ev("D-10", "shiftTabDoIframe", { tag: r.tag, texto: r.texto });
    ok("D-10 Shift+Tab a partir do iframe volta ao \"Voltar\" (E-01)", r.tag === "button" && r.texto === "Voltar", `${r.tag} "${r.texto}"`);
  }
  // D-02: destino do clique em cada número × destino do "Ver processo" da mesma linha
  {
    const destinos = [];
    for (let r = 1; r <= 9; r++) {
      const linha = {};
      for (const [k, sel] of [["numero", `pnip-mpa-processos table tbody tr:nth-child(${r}) td:nth-of-type(3) a`], ["verProcesso", `pnip-mpa-processos table tbody tr:nth-child(${r}) br-button[title='Ver processo']`]]) {
        linha[k] = await aux(async ({ pagina, escritas }) => { await pagina.evaluate(() => { window.__m = 1; }); await pagina.locator(sel).first().click(); await pagina.waitForTimeout(1500); return { path: new URL(pagina.url()).pathname, mesmoDocumento: await pagina.evaluate(() => window.__m === 1).catch(() => false), escritas: escritas().length }; });
      }
      destinos.push(linha);
    }
    ev("D-02", "destinos", destinos);
    const docs = destinos.filter(d => d.numero.path.endsWith("/documentos"));
    ok("D-02 o clique no número abre …/documentos (6 linhas), que o \"Ver processo\" da linha não abre", docs.length === 6 && docs.every(d => d.numero.path === d.verProcesso.path + "/documentos") && destinos.every(d => d.numero.escritas === 0 && d.verProcesso.escritas === 0), destinos.map((d, i) => `${i + 1}: ${d.numero.path.split("/").slice(-1)[0]}`).join(" · "));
    ok("D-02 linhas 1, 5 e 8: o número recarrega em /login (artefato do mock, adendo § C)", [0, 4, 7].every(i => destinos[i].numero.path === "/pnip-d/login" && !destinos[i].numero.mesmoDocumento), [0, 4, 7].map(i => destinos[i].numero.path).join(","));
  }
  // D-03: o clique em cada etiqueta faz algo (filtro ou lista de opções), sem escrita
  {
    const efeitos = [];
    for (let i = 0; i < 7; i++) efeitos.push(await aux(async ({ pagina, escritas }) => {
      const conta = () => pagina.evaluate(`(() => { ${PRELUDIO} return { linhas: document.querySelectorAll("pnip-mpa-processos table tbody tr").length, opcoes: todos().filter(visivel).filter(e => e.closest && e.closest("pnip-multiple-search-table-utils") && e.matches(".br-list,.br-item,input,[role=listbox],[role=option]")).length }; })()`);
      const antes = await conta(); await pagina.locator("pnip-mpa-processos .br-tag.interaction").nth(i).click(); await pagina.waitForTimeout(1000); const depois = await conta();
      return { texto: (await pagina.locator("pnip-mpa-processos .br-tag.interaction").nth(i).textContent()).trim(), antes, depois, escritas: escritas().length };
    }));
    ev("D-03", "cliques", efeitos);
    ok("D-03 cada etiqueta responde ao clique (Meus processos: 9→10 linhas; filtros: abrem opções), sem escrita", efeitos[0].antes.linhas === 9 && efeitos[0].depois.linhas === 10 && efeitos.slice(1).every(e => e.depois.opcoes > e.antes.opcoes) && efeitos.every(e => e.escritas === 0), efeitos.map(e => `${e.texto}: ${e.antes.linhas}→${e.depois.linhas} linhas, +${e.depois.opcoes - e.antes.opcoes} opções`).join(" · "));
  }
  // item: hover e clique na borda (lista-exibir)
  {
    const r = await aux(async ({ pagina }) => {
      await executarPassos(pagina, SETUP);
      const sel = `${E("item-superficie").selector}`;
      const it = pagina.locator(sel).nth(1);
      const bg = () => it.evaluate(e => getComputedStyle(e).backgroundImage);
      const antes = await bg(); await it.hover({ position: { x: 30, y: 2 } }); await pagina.waitForTimeout(300); const depois = await bg();
      const b = await it.boundingBox(); await pagina.mouse.click(b.x + b.width - 3, b.y + 1); await pagina.waitForTimeout(800);
      const valor = await pagina.evaluate(() => document.querySelector("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input[type=text]").value);
      return { antes, depois: depois === "none" ? "none" : "gradiente", valor };
    });
    confere("item-superficie", r.antes === "none" && r.depois === "gradiente" && r.valor === "25", `hover: ${r.depois} · clique na borda do item "25" escolhe: valor "${r.valor}"`, r);
  }
} finally {
  await navegador.close();
  servidor.close();
}

// ── 6. evidência ──────────────────────────────────────────────────────────────────────────────────
mkdirSync(EVID, { recursive: true });
for (const k of conformes) ev(k.id, k.par, medidasK[k.par] ?? null);
const shas = {};
for (const id of [...specs.map(s => s.id), ...conformes.map(k => k.id)]) {
  const s = specs.find(x => x.id === id), k = conformes.find(x => x.id === id);
  const corpo = JSON.stringify({ id, ancora: s?.anchor ?? k.selector, estado: s?.state ?? k.state, normas: s?.rules ?? k.rules, ...(evidencia[id] ?? { medidas: {} }) }, null, 1) + "\n";
  writeFileSync(join(EVID, id + ".json"), corpo);
  shas[id] = sha(corpo);
  const registrado = GT._meta.evidencia?.[id]?.sha256;
  if (registrado) ok(`evidência ${id} reproduz o sha256 registrado`, registrado === shas[id], shas[id]);
}

const n = resultados.length, bons = resultados.filter(r => r.ok).length;
for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} ${r.id} — ${r.medida}`);
if (process.argv.includes("--shas")) console.log(JSON.stringify(shas));
console.log(`\n${bons}/${n}`);
process.exit(bons === n ? 0 : 1);
