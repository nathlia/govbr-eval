/**
 * Conferência sem modelo da auditoria da tela C = cadastrar-empresa (método da B § 8.2; adendo da C § F).
 * Nada aqui importa do govbr-ds-validator nem do axe; o único texto de norma lido é a paleta de
 * tokens/colors.json da base normalizada 3.7.0 em ds-rules/06 (a mesma base de montar-decisoes.mjs).
 * Headless por padrão (`--headed` mostra a janela).
 *
 * 1. confere o sha256 de cada arquivo de pnip-c/manifesto.json (public e dist), nenhum fora, e a lista
 *    "caminho⇥sha256" = a do inventário da fase 1 (041c9ed8…);
 * 2. confere ground-truth-cadastrar-empresa.json × sequencia.mjs (setup, states), url, viewport, e o
 *    sha256 de tela-c/conformes.json citado no _meta;
 * 3. serve o dist/ como a superfície (SPA + alias), aborta toda saída da origem;
 * 4. numa carga só, alcança cada parada pelo MESMO setup; em cada uma: path, mesmo documento, nenhuma
 *    escrita (rede + registro do mock), nenhum externo, nenhuma chamada sem fixture; resolve as âncoras
 *    e confere contagem e visibilidade; entre as paradas (um segmento) atributos e texto próprio de
 *    cada âncora não mudam (fora `class` e `data-focus-visible-added`, que o polyfill de foco põe no
 *    campo clicado pelo setup — marca de foco, não conteúdo);
 * 5. re-mede cada unidade (C-01…C-07) e cada par conforme elegível (os 12 K sorteados e os demais),
 *    mais as linhas `conforme` de decisoes.json medidas na página; gestos e Tab em cargas auxiliares;
 * 6. grava a evidência de cada spec e de cada K em tela-c/evidencia/<id>.json (conteúdo determinístico)
 *    e, se o _meta.evidencia da referência já tem sha256, confere que a re-medida reproduz o arquivo;
 * 7. imprime N/N e sai com código ≠ 0 se algo falhar.
 *
 * Uso: node tela-c/conferir-auditoria.mjs [--headed]
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { exigirBytes, servir, abrirNavegador, novaPagina, carregar, executarPassos, registroDoMock, PRELUDIO, RAIZ_EVAL } from "./comum.mjs";
import { SETUP, STATES } from "./sequencia.mjs";
import { ELEGIVEIS } from "./sortear-conformes.mjs";
import { arvoreAx } from "../tela-b/vistorias/inventario.mjs";

const GT_CAMINHO = join(RAIZ_EVAL, "ground-truth-cadastrar-empresa.json");
const GT = JSON.parse(readFileSync(GT_CAMINHO, "utf8"));
const CONF_CAMINHO = join(RAIZ_EVAL, "tela-c/conformes.json");
const CONF = JSON.parse(readFileSync(CONF_CAMINHO, "utf8"));
const ESTADOS_TESTE = JSON.parse(readFileSync(join(RAIZ_EVAL, "tela-c/estados.json"), "utf8"));
const DECISOES = JSON.parse(readFileSync(join(RAIZ_EVAL, "tela-c/decisoes.json"), "utf8"));
const EVID = join(RAIZ_EVAL, "tela-c/evidencia");
const PALETA = (() => {
  const s = readFileSync(join(RAIZ_EVAL, "../ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/tokens/colors.json"), "utf8").toLowerCase();
  const hex = new Set(s.match(/#[0-9a-f]{6}\b/g) ?? []);
  for (const h of s.match(/#[0-9a-f]{3}\b/g) ?? []) hex.add("#" + [...h.slice(1)].map(c => c + c).join(""));
  return hex;
})();
const sha = b => createHash("sha256").update(b).digest("hex");
const LISTA_FASE1 = "041c9ed88d3f9ce38ef69a2985b356f3b1a8ac872625afb8c02362acfa692baf";

const resultados = [];
const ok = (id, cond, medida) => { resultados.push({ id, ok: !!cond, medida }); return !!cond; };
const evidencia = {};
const medidasK = {};
const ev = (id, chave, valor) => { (evidencia[id] = evidencia[id] || { id, medidas: {} }).medidas[chave] = valor; };

// ── 1. bytes ──────────────────────────────────────────────────────────────────────────────────────
const bytes = exigirBytes();
ok("bytes: árvore pnip-c/ = manifesto (public e dist), nada fora", bytes.modo === "congelado" && !bytes.divergentes.length && !bytes.fora.length && !bytes.ausentes.length, `${bytes.n} arquivos · manifesto sha256 ${bytes.manifestoSha}`);
ok("bytes: lista caminho⇥sha256 = a do inventário da fase 1", bytes.sha256Lista === LISTA_FASE1, bytes.sha256Lista);

// ── 2. referência × sequência ─────────────────────────────────────────────────────────────────────
ok("referência: _meta.setup = sequencia.mjs", JSON.stringify(GT._meta.setup) === JSON.stringify(SETUP), `${SETUP.length} passos`);
ok("referência: _meta.states = sequencia.mjs", JSON.stringify(GT._meta.states) === JSON.stringify(STATES), STATES.map(s => `${s.id}@${s.afterStep}`).join(" "));
ok("referência: url, waitFor e viewport", GT._meta.url === "/pnip-c/portal-admin/empresas/cadastrar-empresa?mock-perfil=admin" && GT._meta.waitFor === "main br-checkbox" && GT._meta.viewport.width === 1280 && GT._meta.viewport.height === 900, GT._meta.url);
ok("referência: sha256 de conformes.json citado no _meta", GT._meta.conformes.sha256 === sha(readFileSync(CONF_CAMINHO)), GT._meta.conformes.sha256);
ok("referência: _meta.conformes.itens = conformes.json", JSON.stringify(GT._meta.conformes.itens) === JSON.stringify(CONF.itens.map(({ id, state, selector, count, rules, medida }) => ({ id, state, selector, count, rules, medida }))), `${CONF.itens.length} controles`);
ok("conformes: cada K é um par elegível com o mesmo seletor/contagem", CONF.itens.every(k => ELEGIVEIS.some(e => e.par === k.par && e.selector === k.selector && e.count === k.count && e.state === k.state)), CONF.itens.map(k => k.par).join(", "));

const specs = GT.violations;
const conformes = CONF.itens;

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
    return {
      chave: chave(el), visivel: visivel(el), tag: el.tagName.toLowerCase(),
      attrs: Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("_ng") && a.name !== "class" && a.name !== "data-aud-i" && a.name !== "data-focus-visible-added").map(a => [a.name, a.value])),
      classes: (el.getAttribute("class") || "").split(" ").filter(Boolean),
      textoProprio: Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim(),
      texto: (el.textContent || "").trim(), labels: el.labels ? el.labels.length : null,
      labelTextos: el.labels ? Array.from(el.labels).map(l => l.textContent.trim()) : null,
      tabIndex: el.tabIndex, required: el.required === true, razao: razao(el),
      raio: cs.borderRadius, padding: cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft,
      caixa: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      cor: cs.color, fundo: (() => { const f = fundo(el); return f ? "rgb(" + f.r + ", " + f.g + ", " + f.b + ")" : null; })(),
      fonte: cs.fontSize + " " + cs.fontWeight,
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
    idUsuario: els.filter(e => e.id === "idUsuario").map(e => e.tagName.toLowerCase()),
    labelSeletor: (() => { const l = document.querySelector("br-select-pnip label"); const alvo = l && document.getElementById(l.getAttribute("for")); return { for: l && l.getAttribute("for"), texto: l && l.textContent.trim(), resolveEm: alvo ? alvo.tagName.toLowerCase() : null }; })(),
    larguraDoc: document.documentElement.scrollWidth,
    marcasObrigatorio: (() => { const f = document.querySelector("pnip-admin-form-empresa"); return queryAll("pnip-admin-form-empresa *").concat(queryAll("pnip-admin-form-empresa br-input >>> label")).filter(e => visivel(e) && /obrigat|\\*/i.test(Array.from(e.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join(""))).map(e => (e.textContent || "").trim()); })(),
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
    out[i] = { ignorado: !!n.ignored, papel: n.role?.value ?? null, nome: n.name?.value ?? "", props: Object.fromEntries((n.properties ?? []).map(p => [p.name, p.value?.value])) }; }
  await pagina.evaluate(`(() => { ${PRELUDIO} queryAll(${JSON.stringify(sel)}).forEach(e => e.removeAttribute("data-aud-ax")); })()`);
  return out;
}
const ATIVO = `(() => { ${PRELUDIO} const a = ativoProfundo(); if (!a || a === document.body) return { chave: "body" }; const c = getComputedStyle(a);
  const lb = a.labels && a.labels[0]; const antes = lb ? getComputedStyle(lb, "::before") : null;
  return { chave: chave(a), tag: a.tagName.toLowerCase(), tipo: a.type || null, texto: (a.textContent || "").trim().slice(0, 40),
    indicador: (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== "none" || !!(antes && antes.boxShadow !== "none"), contorno: c.outlineStyle + " " + c.outlineWidth, sombra: c.boxShadow, sombraRotulo: antes ? antes.boxShadow : null }; })()`;

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
  }
  {
    const difs = [];
    for (const sel of seletores) for (const x of porEstado.inicial.med[sel]) { const y = porEstado["lista-usuarios"].med[sel].find(e => e.chave === x.chave); if (y && (JSON.stringify(x.attrs) !== JSON.stringify(y.attrs) || x.textoProprio !== y.textoProprio)) difs.push(`${sel} ${x.chave}`); }
    ok("segmento único (inicial → lista-usuarios): âncoras com atributos e texto inalterados", difs.length === 0, difs.join("; ") || "nenhuma diferença");
  }
  const axPrincipal = {};
  for (const s of ["br-select-pnip input[type=text]", "pnip-admin-form-empresa br-button[label=Cancelar]", specs.find(s => s.id === "C-03").anchor, "pnip-admin-form-empresa br-button[label=Salvar] >>> button", "pnip-admin-form-empresa br-divider >>> span"]) axPrincipal[s] = await axDe(principal.contexto, pagina, s);
  await principal.contexto.close();

  const M = (st, sel) => porEstado[st].med[sel];
  const G = st => porEstado[st].g;
  const sp = id => specs.find(s => s.id === id);

  // ── 5. unidades ──────────────────────────────────────────────────────────────────────────────────
  {
    const x = M("inicial", sp("C-01").anchor)[0]; const ax = axPrincipal["br-select-pnip input[type=text]"][0];
    ev("C-01", "campo", { chave: x.chave, id: x.attrs.id, labels: x.labels, ariaLabel: x.attrs["aria-label"] ?? null, ariaLabelledby: x.attrs["aria-labelledby"] ?? null, placeholder: x.attrs.placeholder });
    ev("C-01", "idDuplicado", G("inicial").idUsuario); ev("C-01", "rotulo", G("inicial").labelSeletor); ev("C-01", "ax", { papel: ax?.papel, nome: ax?.nome });
    ok("C-01 campo do seletor sem rótulo associado (labels 0, sem aria-label/labelledby)", x.labels === 0 && !x.attrs["aria-label"] && !x.attrs["aria-labelledby"], `labels ${x.labels} · placeholder "${x.attrs.placeholder}"`);
    ok("C-01 id \"idUsuario\" duplicado (hospedeiro + input); o label resolve no hospedeiro", JSON.stringify(G("inicial").idUsuario) === JSON.stringify(["br-select-pnip", "input"]) && G("inicial").labelSeletor.resolveEm === "br-select-pnip", `${G("inicial").idUsuario.join(", ")} · label for=${G("inicial").labelSeletor.for} → <${G("inicial").labelSeletor.resolveEm}>`);
    ok("C-01 nome acessível = placeholder, não o rótulo visível", ax?.nome === "Selecione" && G("inicial").labelSeletor.texto === "Selecione o usuário", `AX ${ax?.papel} "${ax?.nome}" · rótulo visível "${G("inicial").labelSeletor.texto}"`);
  }
  {
    const x = M("inicial", sp("C-02").anchor)[0]; const ax = axPrincipal["pnip-admin-form-empresa br-button[label=Cancelar]"][0];
    ev("C-02", "hospedeiro", { chave: x.chave, tabindexAttr: x.attrs.tabindex ?? null, tabIndex: x.tabIndex, ax: { papel: ax?.papel, nome: ax?.nome } });
    ok("C-02 hospedeiro do Cancelar: tabindex=\"0\", papel generic, nome vazio", x.attrs.tabindex === "0" && x.tabIndex === 0 && ax?.papel === "generic" && ax?.nome === "", `tabindex=${x.attrs.tabindex} · AX ${ax?.papel} "${ax?.nome}"`);
  }
  {
    const xs = M("inicial", sp("C-03").anchor); const axs = axPrincipal[sp("C-03").anchor];
    ev("C-03", "campos", xs.map((x, i) => ({ chave: x.chave, rotulo: (x.labelTextos || [])[0] ?? null, required: x.required, ariaRequired: x.attrs["aria-required"] ?? null, axRequired: axs[i]?.props.required ?? null })));
    ev("C-03", "marcasDeObrigatorioNoFormulario", G("inicial").marcasObrigatorio);
    ok("C-03 8 campos: rótulo sem marca, sem required/aria-required, árvore required=false", xs.length === 8 && xs.every((x, i) => !x.required && !x.attrs["aria-required"] && !/obrigat|\*/i.test((x.labelTextos || []).join(" ")) && axs[i]?.props.required === false), xs.map(x => (x.labelTextos || [])[0]).join(", "));
    ok("C-03 nenhuma instrução/marca de obrigatório visível no formulário", G("inicial").marcasObrigatorio.length === 0, `${G("inicial").marcasObrigatorio.length} textos com "obrigat"/"*"`);
  }
  ok("C-04 sem salto para o conteúdo (2 paradas)", STATES.every(s => G(s.id).ancoras === 0 && G(s.id).skiplink === 0), STATES.map(s => `${s.id}: âncoras # ${G(s.id).ancoras}, .br-skiplink ${G(s.id).skiplink}`).join(" · "));
  ev("C-04", "paradas", STATES.map(s => ({ parada: s.id, ancorasHash: G(s.id).ancoras, skiplink: G(s.id).skiplink })));
  ok("C-05 títulos h2 h3 h2, nenhum h1", STATES.every(s => JSON.stringify(G(s.id).cabecalhos) === "[2,3,2]" && G(s.id).h1 === 0), STATES.map(s => G(s.id).cabecalhos.map(n => "h" + n).join(" ")).join(" · "));
  ev("C-05", "titulos", STATES.map(s => ({ parada: s.id, niveis: G(s.id).cabecalhos, h1: G(s.id).h1 })));
  ok("C-06 <title> \"PNIP\" nas 2 paradas", STATES.every(s => G(s.id).titulo === "PNIP"), STATES.map(s => `${s.id}: "${G(s.id).titulo}"`).join(" · "));
  ev("C-06", "titulo", STATES.map(s => ({ parada: s.id, titulo: G(s.id).titulo })));
  {
    const xs = STATES.map(s => M(s.id, sp("C-07").anchor)[0]);
    ev("C-07", "contraste", xs.map((x, i) => ({ parada: STATES[i].id, texto: x.texto, cor: x.cor, fundo: x.fundo, fonte: x.fonte, razao: x.razao })));
    ok("C-07 inicial do avatar < 4,5:1 nas 2 paradas", xs.every(x => x.razao !== null && x.razao < 4.5), xs.map(x => `"${x.texto}" ${x.razao}:1`).join(" · "));
  }

  // ── conformes elegíveis (todos), os K são o subconjunto sorteado ─────────────────────────────────
  const E = par => ELEGIVEIS.find(e => e.par === par);
  const ME = par => M(E(par).state, E(par).selector);

  const confere = (par, cond, medida, dados) => { ok(`conforme ${par}`, cond, medida); medidasK[par] = dados ?? medida; };
  confere("breadcrumb-tab", ME("breadcrumb-tab").every(x => x.tabIndex === 0 && x.attrs.href), ME("breadcrumb-tab").map(x => `${x.texto}: tabIndex ${x.tabIndex}`).join(", "), ME("breadcrumb-tab").map(x => ({ texto: x.texto, tabIndex: x.tabIndex })));
  confere("breadcrumb-li", ME("breadcrumb-li").length === 3 && ME("breadcrumb-li").every(x => x.tag === "li"), ME("breadcrumb-li").map(x => x.texto).join(" | "), ME("breadcrumb-li").map(x => ({ tag: x.tag, texto: x.texto })));
  confere("breadcrumb-orientacao", ME("breadcrumb-li").at(-1).texto === "Cadastrar empresa", `último item "${ME("breadcrumb-li").at(-1).texto}"`);
  confere("titulos-contraste", ME("titulos-contraste").every(x => x.razao >= 4.5), ME("titulos-contraste").map(x => `${x.texto} ${x.razao}:1`).join(", "), ME("titulos-contraste").map(x => ({ texto: x.texto, razao: x.razao })));
  confere("input-rotulo", ME("input-rotulo").every(x => x.labels === 1), ME("input-rotulo").map(x => `labels ${x.labels} "${x.labelTextos?.[0]}"`).join(","), ME("input-rotulo").map(x => ({ labels: x.labels, rotulo: x.labelTextos?.[0] })));
  confere("rotulo-contraste", ME("rotulo-contraste").every(x => x.razao >= 4.5), `mín ${Math.min(...ME("rotulo-contraste").map(x => x.razao))}:1 em ${ME("rotulo-contraste").length}`, ME("rotulo-contraste").map(x => ({ texto: x.texto, razao: x.razao })));
  confere("input-acao", ME("input-acao").every(x => ["br-button", "small", "circle"].every(c => x.classes.includes(c)) && !x.classes.includes("primary") && !x.classes.includes("secondary") && x.raio === "50%"), ME("input-acao").map(x => `${x.classes.join(".")} ${x.caixa[2]}×${x.caixa[3]} raio ${x.raio}`).join(","), ME("input-acao").map(x => ({ classes: x.classes, caixa: x.caixa.slice(2), raio: x.raio })));
  confere("checkbox-rotulo", ME("checkbox-rotulo").every(x => x.labels === 1), ME("checkbox-rotulo").map(x => `labels ${x.labels}`).join(","), ME("checkbox-rotulo").map(x => ({ labels: x.labels })));
  confere("abas-teclado", ME("abas-teclado").every(x => x.tag === "button" && x.tabIndex === 0) && ["Usuário Existente", "Cadastrar Usuário"].every(r => { const vs = ESTADOS_TESTE.resultados.filter(q => q.rotulo === r); const c = vs.find(q => q.gesto === "clique"), e = vs.find(q => q.gesto === "enter"); return c && e && c.veredito === e.veredito && c.repeticoes === "3/3" && e.repeticoes === "3/3"; }),
    "botões tabIndex 0; Enter ≡ clique 3/3 (estados.json)", ME("abas-teclado").map(x => ({ texto: x.texto, tag: x.tag, tabIndex: x.tabIndex })));
  confere("mensagem-icone", (() => { const i = ME("mensagem-icone")[0]; const c = M("inicial", "pnip-admin-form-empresa .br-message .icon")[0]; return i && i.caixa[0] < 152 && i.classes.includes("icon"); })(), ME("mensagem-icone").map(x => `ícone x=${x.caixa[0]}`).join(","), ME("mensagem-icone").map(x => ({ caixa: x.caixa })));
  confere("salvar-um-ponto", ME("salvar-um-ponto").every(x => !("tabindex" in x.attrs) && x.tabIndex === -1) && axPrincipal["pnip-admin-form-empresa br-button[label=Salvar] >>> button"][0]?.nome === "Salvar",
    `hospedeiro tabIndex ${ME("salvar-um-ponto")[0].tabIndex} · botão interno "${axPrincipal["pnip-admin-form-empresa br-button[label=Salvar] >>> button"][0]?.nome}"`, { hospedeiroTabIndex: ME("salvar-um-ponto")[0].tabIndex, nomeInterno: axPrincipal["pnip-admin-form-empresa br-button[label=Salvar] >>> button"][0]?.nome });
  confere("adicionar-rotulo", ME("adicionar-rotulo").every(x => x.texto === "Adicionar"), ME("adicionar-rotulo").map(x => x.texto).join(","), ME("adicionar-rotulo").map(x => ({ texto: x.texto })));
  confere("divisor", ME("divisor").every(x => x.tabIndex < 0) && axPrincipal["pnip-admin-form-empresa br-divider >>> span"].every(a => a && (a.ignorado || a.papel === "none")), `tabIndex ${ME("divisor").map(x => x.tabIndex)} · AX ${axPrincipal["pnip-admin-form-empresa br-divider >>> span"].map(a => a?.papel).join(",")}`, { tabIndex: ME("divisor").map(x => x.tabIndex), ax: axPrincipal["pnip-admin-form-empresa br-divider >>> span"].map(a => a?.papel) });
  confere("radio-rotulo", ME("radio-rotulo").every(x => x.labels === 1), ME("radio-rotulo").map(x => x.labels).join(","), ME("radio-rotulo").map(x => ({ labels: x.labels })));
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

  // ── cargas auxiliares: gestos e teclado ──────────────────────────────────────────────────────────
  const aux = async fn => { const s = await novaPagina(navegador); try { await carregar(s.pagina, base); return await fn(s); } finally { await s.contexto.close(); } };
  // Tab real na inicial (300 ms por tecla)
  const ordem = await aux(async ({ pagina }) => {
    const pts = [];
    for (let k = 0; k < 60; k++) { await pagina.keyboard.press("Tab"); await pagina.waitForTimeout(300); pts.push(await pagina.evaluate(ATIVO)); if (pts.length > 1 && pts.at(-1).chave === pts[0].chave) break; }
    return pts;
  });
  {
    const idx = re => ordem.findIndex(p => re.test(p.chave));
    const iAdic = ordem.findIndex(p => p.texto === "Adicionar"), iHost = idx(/br-button:nth-of-type\(1\)$/), iCanc = idx(/br-button:nth-of-type\(1\) >>> button$/), iSalv = idx(/br-button:nth-of-type\(2\) >>> button$/);
    ev("C-02", "sequenciaTab", ordem.slice(iAdic, iSalv + 1).map(p => ({ tag: p.tag, texto: p.texto, chave: p.chave.slice(-60) })));
    ok("C-02 Tab: Adicionar → hospedeiro → button Cancelar → button Salvar", iAdic >= 0 && iHost === iAdic + 1 && iCanc === iHost + 1 && iSalv === iCanc + 1, `posições ${iAdic}, ${iHost}, ${iCanc}, ${iSalv}`);
    ok("C-04 1º ponto de Tab não é salto (é o botão Menu)", /#?navigation|slot>button$/.test(ordem[0].chave) || ordem[0].tag === "button", `1º: <${ordem[0].tag}> ${ordem[0].chave.slice(-50)}`);
    ev("C-04", "primeiroTab", { tag: ordem[0].tag, chave: ordem[0].chave.slice(-60) });
    const iBc = ordem.filter(p => /br-breadcrumb >>> div>ul>li:nth-of-type\([12]\)>a$/.test(p.chave)).length;
    ok("conforme breadcrumb-tab: os 2 links no Tab", iBc === 2, `${iBc} links alcançados`);
    const iComp = idx(/form>div:nth-of-type\(4\)>div:nth-of-type\(1\)>br-input >>> div>input$/), iMun = idx(/form>div:nth-of-type\(4\)>div:nth-of-type\(2\)>div>div>br-input >>> div>input$/);
    ok("conforme input-tab: Complemento entre Número e Município", iComp > 0 && iComp === iMun - 1 && ordem[iComp - 1].chave.endsWith("div:nth-of-type(3)>div:nth-of-type(3)>br-input >>> div>input"), `posições Número ${iComp - 1}, Complemento ${iComp}, Município ${iMun}`);
    const ck = ordem.find(p => /br-checkbox >>> div>input$/.test(p.chave));
    ok("conforme checkbox-foco: ::before do rótulo com box-shadow de foco", ck && ck.sombraRotulo && ck.sombraRotulo !== "none", ck?.sombraRotulo ?? "—");
    medidasK["checkbox-foco"] = { sombraRotulo: ck?.sombraRotulo ?? null };
    medidasK["breadcrumb-tab"] = { ...{ links: medidasK["breadcrumb-tab"] }, alcancadosPorTab: iBc };
    medidasK["input-tab"] = { posicoes: [iComp - 1, iComp, iMun] };
    // 4.4: indicador em todo ponto (fora: botão do calendário do <input type=date>, UA; lista do seletor, fundo)
    const ua = ordem.filter((p, i) => p.tipo === "date" && !p.indicador && ordem[i - 1]?.chave === p.chave);
    const lista = ordem.filter(p => /br-select-pnip>div>div:nth-of-type\(2\)$/.test(p.chave));
    const medidos = ordem.filter(p => p.chave !== "body" && !ua.includes(p) && !lista.includes(p));
    ok("indicador de foco em todo ponto de Tab da inicial (21fbcc2fe37b)", medidos.every(p => p.indicador), `${medidos.filter(p => p.indicador).length}/${medidos.length} (fora: ${ua.length} botão de calendário UA, ${lista.length} lista do seletor — fundo, core .br-select .br-list:focus{outline:none})`);
    ok("fundo: a lista do seletor focada não muda de estilo (regra do core): sem contorno, só a sombra que já tinha", lista.length === 1 && lista[0].contorno.startsWith("none") && lista[0].sombra === "rgba(0, 0, 0, 0.16) 0px 3px 6px 0px", lista.map(p => `${p.contorno} / ${p.sombra}`).join(""));
  }
  // C-02: Enter e Espaço no hospedeiro não fazem nada; Enter no botão interno navega
  for (const tecla of ["Enter", "Space"]) {
    const r = await aux(async ({ pagina }) => {
      const antes = await pagina.evaluate(`(() => { ${PRELUDIO} return todos().filter(visivel).length; })()`);
      await pagina.evaluate(() => document.querySelector("pnip-admin-form-empresa br-button[label=Cancelar]").focus());
      await pagina.keyboard.press(tecla); await pagina.waitForTimeout(900);
      return { path: new URL(pagina.url()).pathname, mais: (await pagina.evaluate(`(() => { ${PRELUDIO} return todos().filter(visivel).length; })()`)) - antes };
    });
    ev("C-02", "hospedeiro" + tecla, r);
    ok(`C-02 ${tecla} no hospedeiro: nada muda`, r.path === STATES[0].path && r.mais === 0, `${r.path} · ${r.mais} visíveis a mais`);
  }
  {
    const r = await aux(async ({ pagina }) => { await pagina.evaluate(`(() => { ${PRELUDIO} queryAll("pnip-admin-form-empresa br-button[label=Cancelar] >>> button")[0].focus(); })()`); await pagina.keyboard.press("Enter"); await pagina.waitForTimeout(1200); return new URL(pagina.url()).pathname; });
    ev("C-02", "botaoInternoEnter", r);
    ok("C-02 Enter no botão interno do Cancelar navega", r !== STATES[0].path, r);
  }
  // C-03: "Campo obrigatório" ao sair de cada um dos 8; nada nos 2 opcionais
  {
    const campos = ["razaoSocial", "nomeFantasia", "cnpj", "rgp", "rua", "numero", "cidade", "uf", "validadeRgp", "complemento"];
    const msgs = {};
    for (const c of campos) msgs[c] = await aux(async ({ pagina }) => {
      await pagina.evaluate(`(() => { ${PRELUDIO} queryAll("pnip-admin-form-empresa br-input[formcontrolname=${c}] >>> input")[0].focus(); })()`);
      await pagina.keyboard.press("Tab"); await pagina.waitForTimeout(500);
      return pagina.evaluate(`(() => { ${PRELUDIO} const h = document.querySelector("pnip-admin-form-empresa br-input[formcontrolname=${c}]"); const col = h.closest("[class*=col]"); return Array.from(col.querySelectorAll(".feedback")).filter(visivel).map(e => e.textContent.trim()); })()`);
    });
    ev("C-03", "mensagemAoSair", msgs);
    ok("C-03 \"Campo obrigatório\" ao sair de cada um dos 8 campos", campos.slice(0, 8).every(c => msgs[c].includes("Campo obrigatório")), campos.slice(0, 8).map(c => `${c}: ${msgs[c].join("|") || "—"}`).join(" · "));
    ok("C-03 nenhuma mensagem nos opcionais (Validade do RGP, Complemento)", campos.slice(8).every(c => msgs[c].length === 0), campos.slice(8).map(c => `${c}: ${msgs[c].length}`).join(" · "));
  }
  // item: hover e clique na borda; teclado do seletor (seta + Enter escolhe)
  {
    const r = await aux(async ({ pagina }) => {
      await executarPassos(pagina, SETUP);
      const bg = () => pagina.evaluate(() => getComputedStyle(document.querySelector("br-select-pnip .br-item")).backgroundImage);
      const antes = await bg(); const it = pagina.locator("br-select-pnip .br-item").first(); await it.hover({ position: { x: 300, y: 2 } }); await pagina.waitForTimeout(300); const depois = await bg();
      const b = await it.boundingBox(); await pagina.mouse.click(b.x + b.width - 3, b.y + 1); await pagina.waitForTimeout(600);
      const valor = await pagina.evaluate(() => document.querySelector("br-select-pnip input[type=text]").value);
      return { antes, depois, marcou: valor.length > 0 };
    });
    confere("item-superficie", r.antes === "none" && r.depois !== "none" && r.marcou, `hover: ${r.depois} · clique na borda escolhe: ${r.marcou}`, r);
    const t = await aux(async ({ pagina }) => {
      await pagina.evaluate(() => document.querySelector("br-select-pnip input[type=text]").focus()); await pagina.waitForTimeout(400);
      await pagina.keyboard.press("ArrowDown"); await pagina.waitForTimeout(300); await pagina.keyboard.press("Enter"); await pagina.waitForTimeout(500);
      return pagina.evaluate(() => [document.querySelector("br-select-pnip input[type=text]").value, [...document.querySelectorAll("br-select-pnip input[type=radio]")].filter(x => x.checked).length]);
    });
    ok("seletor operável por teclado: seta + Enter escolhe (e6fd5e1247de)", t[0].length > 0 && t[1] === 1, `valor "${t[0].slice(0, 30)}…" · marcados ${t[1]}`);
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
console.log(`\n${bons}/${n}`);
process.exit(bons === n ? 0 : 1);
