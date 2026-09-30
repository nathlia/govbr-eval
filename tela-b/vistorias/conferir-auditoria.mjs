/**
 * Conferência sem modelo da auditoria da tela Vistorias (metodo-auditoria.md § 8.2, adendo § F).
 * Nada aqui importa do govbr-ds-validator (fora o TEXTO de norma de tokens/colors.json, para a paleta)
 * nem do axe. Headless por padrão (`--headed` mostra a janela).
 *
 * 1. confere o sha256 de cada arquivo de pnip/manifesto.json (public e dist) e que não há arquivo fora;
 * 2. confere que _meta.setup/_meta.states de ground-truth-vistorias.json são os de sequencia.mjs;
 * 3. serve o dist/ como a superfície (SPA + alias), aborta toda saída da origem;
 * 4. numa carga só, alcança cada parada pelo MESMO setup; em cada uma confere o `path` declarado,
 *    que o documento não recarregou, nenhuma escrita no mock (rede + registro do mock) e nenhum pedido
 *    externo; resolve as âncoras e confere contagem; entre paradas do mesmo segmento confere que
 *    atributos e texto próprio de cada âncora não mudaram;
 * 5. re-mede cada unidade (B-01…B-24) e cada conforme (C-01…C-12) no seu estado, mais as medidas
 *    das linhas `conforme` de decisoes.json que não viram controle; gestos (clique/Enter) e Tab em
 *    cargas auxiliares novas, para não mexer na carga principal;
 * 6. imprime N/N e sai com código ≠ 0 se algo falhar.
 *
 * Uso: node tela-b/vistorias/conferir-auditoria.mjs [--headed]
 */
import { readFileSync } from "fs";
import { join } from "path";
import { conferirManifesto, servir, abrirNavegador, novaPagina, carregar, executarPassos, PRELUDIO, RAIZ_EVAL } from "./comum.mjs";
import { SETUP, STATES, LISTA } from "./sequencia.mjs";
import { arvoreAx } from "./inventario.mjs";

const GT = JSON.parse(readFileSync(join(RAIZ_EVAL, "ground-truth-vistorias.json"), "utf8"));
const PALETA = (() => {
  const s = readFileSync(join(RAIZ_EVAL, "../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/tokens/colors.json"), "utf8").toLowerCase();
  const hex = new Set((s.match(/#[0-9a-f]{6}\b/g) ?? []));
  for (const h of s.match(/#[0-9a-f]{3}\b/g) ?? []) hex.add("#" + [...h.slice(1)].map(c => c + c).join(""));
  return hex;
})();

const resultados = [];
const ok = (id, cond, medida) => { resultados.push({ id, ok: !!cond, medida }); };

// ── 1. manifesto ──────────────────────────────────────────────────────────────────────────────
const m = conferirManifesto();
ok("manifesto: arquivos conferem (public e dist)", m.divergentes.length === 0 && m.ausentes.length === 0, `${m.n} arquivos, divergentes ${m.divergentes.length}, ausentes ${m.ausentes.length}`);
ok("manifesto: nenhum arquivo fora", m.fora.length === 0, `fora: ${m.fora.join(", ") || "nenhum"} · sha256 do manifesto ${m.manifestoSha}`);
if (m.divergentes.length || m.ausentes.length || m.fora.length) { console.error("árvore pnip/ diverge do manifesto — a medida é recusada"); process.exit(2); }

// ── 2. referência × sequência ─────────────────────────────────────────────────────────────────
ok("referência: _meta.setup = sequencia.mjs", JSON.stringify(GT._meta.setup) === JSON.stringify(SETUP), `${SETUP.length} passos`);
ok("referência: _meta.states = sequencia.mjs", JSON.stringify(GT._meta.states) === JSON.stringify(STATES), STATES.map(s => `${s.id}@${s.afterStep}`).join(" "));
ok("referência: url e viewport", GT._meta.url === "/pnip/portal-mpa/vistorias?mock-perfil=mpa" && GT._meta.viewport.width === 1280 && GT._meta.viewport.height === 900, GT._meta.url);

const segmentoDe = afterStep => SETUP.slice(0, afterStep).filter(p => p.action === "navigate").length;
const specs = GT.violations;
const conformes = GT._meta.conformes.itens;

// Medida de uma âncora, dentro da página (texto).
const MEDIR = `((sel) => {
${PRELUDIO}
  const rgba = s => { const m = s.match(/rgba?[(]([^)]+)[)]/); if (!m) return null; const p = m[1].split(",").map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const paiComposto = el => el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el).host : null);
  const fundo = el => { let e = el; while (e) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = rgba(cs.backgroundColor); if (c && c.a === 1) return c; if (c && c.a > 0) return null; e = paiComposto(e); } return { r: 255, g: 255, b: 255, a: 1 }; };
  const razao = el => { const fg = rgba(getComputedStyle(el).color); const bg = fundo(el); if (!fg || !bg) return null; const a = lum(fg), b = lum(bg); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
  const host = el => ehSombra(raizDe(el)) ? raizDe(el).host : null;
  return queryAll(sel).map(el => {
    const cs = getComputedStyle(el); const h = host(el);
    return {
      chave: chave(el), visivel: visivel(el), tag: el.tagName.toLowerCase(),
      attrs: Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("_ng") && a.name !== "class").map(a => [a.name, a.value])),
      classes: (el.getAttribute("class") || "").split(" ").filter(Boolean),
      textoProprio: Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim(),
      texto: (el.textContent || "").trim(), labels: el.labels ? el.labels.length : null,
      labelIrmao: el.parentElement ? Array.from(el.parentElement.children).filter(c => c.tagName === "LABEL").map(c => ({ texto: c.textContent.trim(), for: c.getAttribute("for") })) : [],
      tabIndex: el.tabIndex, disabled: !!el.disabled, razao: razao(el),
      hostAttrs: h ? Object.fromEntries(Array.from(h.attributes).filter(a => !a.name.startsWith("_ng")).map(a => [a.name, a.value])) : null,
      filhos: Array.from(el.children).map(c => c.tagName.toLowerCase()),
      menuitems: el.querySelectorAll("[role=menuitem]").length, caption: el.tagName === "TABLE" ? (el.caption ? el.caption.textContent : null) : undefined,
      borderTop: cs.borderTopWidth + " " + cs.borderTopStyle + " " + cs.borderTopColor, raio: cs.borderRadius,
      caixa: (() => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    };
  });
})`;
const medir = (pagina, sel) => pagina.evaluate(`${MEDIR}(${JSON.stringify(sel)})`);

const GLOBAL = `(() => {
${PRELUDIO}
  const els = todos();
  return {
    path: location.pathname, doc: window.__auditoriaDoc || null, lang: document.documentElement.getAttribute("lang"),
    metaRefresh: !!document.querySelector("meta[http-equiv=refresh i]"), animacoes: document.getAnimations().length,
    ancoras: els.filter(e => e.tagName === "A" && (e.getAttribute("href") || "").startsWith("#")).length, skiplink: els.filter(e => e.classList && e.classList.contains("br-skiplink")).length,
    cabecalhos: els.filter(e => /^H[1-6]$/.test(e.tagName) && visivel(e)).map(e => +e.tagName[1]),
    fontes: [...new Set(els.filter(e => visivel(e) && Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())).map(e => getComputedStyle(e).fontFamily))],
    cores: [...new Set(els.filter(visivel).flatMap(e => { const cs = getComputedStyle(e); const out = [];
      if (Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) out.push(cs.color);
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") out.push(cs.backgroundColor);
      for (const l of ["top", "right", "bottom", "left"]) if (parseFloat(cs.getPropertyValue("border-" + l + "-width")) > 0 && cs.getPropertyValue("border-" + l + "-style") !== "none") out.push(cs.getPropertyValue("border-" + l + "-color") + "@" + chave(e));
      return out; }))],
    cabeca: Array.from(document.head.children).map(e => e.getAttribute("href") || e.getAttribute("src") || e.tagName.toLowerCase()),
    scripts: Array.from(document.scripts).map(s => s.getAttribute("type")),
    dialogosAbertos: els.filter(e => visivel(e) && (e.classList.contains("br-modal") || e.classList.contains("swal2-popup") || e.getAttribute("role") === "dialog")).length,
  };
})()`;
const hex = c => { const n = (c.match(/\d+(\.\d+)?/g) ?? []).map(Number); if (n.length > 3 && n[3] < 1) return null; return "#" + n.slice(0, 3).map(v => v.toString(16).padStart(2, "0")).join(""); };

const { servidor, base } = await servir();
const navegador = await abrirNavegador();
try {
  // ── 4. carga principal: todas as paradas pelo mesmo setup ─────────────────────────────────────
  const principal = await novaPagina(navegador);
  const { pagina } = principal;
  await carregar(pagina, base);
  await pagina.evaluate(() => { window.__auditoriaDoc = window.__auditoriaDoc || Math.random().toString(36).slice(2); });
  const docInicial = await pagina.evaluate(() => window.__auditoriaDoc);
  let feito = 0;
  const porEstado = {};
  const ancorasDe = st => [...specs.filter(s => s.state === st.id || s.state === "sempre"), ...conformes.filter(c => c.state === st.id || c.state === "sempre")];
  for (const st of STATES) {
    await executarPassos(pagina, SETUP.slice(feito, st.afterStep)); feito = st.afterStep;
    const g = await pagina.evaluate(GLOBAL);
    ok(`${st.id}: path`, g.path === st.path, g.path);
    ok(`${st.id}: mesmo documento (sem recarga)`, g.doc === docInicial, g.doc === docInicial ? "marca do documento intacta" : "RECARREGOU");
    const escritasMock = await pagina.evaluate(() => Object.keys(window.__pnipMock?.atendidos?.() ?? {}).filter(k => !/^GET /.test(k)));
    ok(`${st.id}: nenhuma escrita no mock, nenhum externo`, principal.escritas().length === 0 && escritasMock.length === 0 && principal.externos().length === 0,
      `rede ${principal.escritas().length} · registro do mock ${escritasMock.length} · externos ${principal.externos().length}`);
    const med = {};
    for (const a of [...specs.map(s => s.anchor), ...conformes.map(c => c.selector)]) med[a] = await medir(pagina, a);
    porEstado[st.id] = { g, med };
    for (const a of ancorasDe(st)) {
      const sel = a.anchor ?? a.selector; const n = a.expectedCount ?? a.count;
      ok(`${a.id} @${st.id}: âncora resolve ${n}`, med[sel].length === n && med[sel].every(x => x.visivel), `${med[sel].length} elemento(s), ${med[sel].filter(x => x.visivel).length} visível(is)`);
    }
  }
  // Mesmo segmento: atributos e texto próprio de cada âncora não mudaram entre paradas.
  for (let i = 1; i < STATES.length; i++) {
    const a = STATES[i - 1], b = STATES[i];
    if (segmentoDe(a.afterStep) !== segmentoDe(b.afterStep)) continue;
    const difs = [];
    for (const sel of [...specs.map(s => s.anchor), ...conformes.map(c => c.selector)]) {
      const x = porEstado[a.id].med[sel], y = porEstado[b.id].med[sel];
      for (const ex of x) { const ey = y.find(e => e.chave === ex.chave); if (!ey) continue; if (JSON.stringify(ex.attrs) !== JSON.stringify(ey.attrs) || ex.textoProprio !== ey.textoProprio) difs.push(`${sel} ${ex.chave}`); }
    }
    ok(`segmento ${segmentoDe(b.afterStep)} (${a.id} → ${b.id}): âncoras com atributos e texto inalterados`, difs.length === 0, difs.join("; ") || "nenhuma diferença");
  }
  // conditional: B-24 não existe antes do modal no seu segmento
  ok("B-24 condicional: .br-modal ausente em `detalhe`", porEstado.detalhe.med["pnip-propesc-trocar-embarcacao .br-modal"].length === 0, `${porEstado.detalhe.med["pnip-propesc-trocar-embarcacao .br-modal"].length} em detalhe`);
  await principal.contexto.close();

  const M = (st, sel) => porEstado[st].med[sel];
  const G = st => porEstado[st].g;
  const sp = id => specs.find(s => s.id === id);
  const semNome = x => !x.texto && !(x.attrs["aria-label"] || "").trim() && !x.attrs["aria-labelledby"] && !x.attrs.title;

  // ── 5. unidades ─────────────────────────────────────────────────────────────────────────────
  ok("B-01 sem salto para o conteúdo (4 paradas)", STATES.every(s => G(s.id).ancoras === 0 && G(s.id).skiplink === 0), STATES.map(s => `${s.id}: âncoras # ${G(s.id).ancoras}, .br-skiplink ${G(s.id).skiplink}`).join(" · "));
  ok("B-02 lista sem h1; único título h2", JSON.stringify(G("inicial").cabecalhos) === "[2]", `títulos visíveis: ${G("inicial").cabecalhos.map(n => "h" + n).join(" ")}`);
  { const t = M("inicial", sp("B-03").anchor)[0]; ok("B-03 tabela da lista sem caption/aria-label/aria-labelledby", t.caption === null && !t.attrs["aria-label"] && !t.attrs["aria-labelledby"], `caption ${t.caption} · aria-label ${t.attrs["aria-label"] ?? "—"}`); }
  for (const id of ["B-04", "B-05", "B-06"]) { const xs = M("inicial", sp(id).anchor); ok(`${id} campos sem rótulo associado`, xs.every(x => x.labels === 0 && !x.attrs["aria-label"] && !x.attrs["aria-labelledby"]), `${xs.length}: labels ${xs.map(x => x.labels).join(",")} · placeholder ${xs.map(x => x.attrs.placeholder ?? "—").join(",")}`); }
  { const xs = M("inicial", sp("B-07").anchor); ok("B-07 olho sem nome (texto, aria-label, title, title do hospedeiro)", xs.every(x => semNome(x) && !x.hostAttrs?.title), `${xs.length} botões; aria-label="${xs[0].attrs["aria-label"]}" · host title ${xs[0].hostAttrs?.title ?? "—"}`); }
  { const xs = M("inicial", sp("B-08").anchor); ok("B-08 ações de linha só com ícone, sem circle", xs.length === 40 && xs.every(x => !x.texto && x.hostAttrs?.icon && !x.hostAttrs?.label && !x.classes.includes("circle")), `ícones: ${[...new Set(xs.map(x => x.hostAttrs?.icon))].join(",")} · classes ${[...new Set(xs.map(x => x.classes.join(".")))].join(" | ")}`); }
  for (const id of ["B-09", "B-10"]) { const xs = M("inicial", sp(id).anchor); ok(`${id} botão só com ícone, sem circle`, xs.every(x => !x.texto && !x.classes.includes("circle")), `${xs.length}: classes ${xs.map(x => x.classes.join(".")).join(" | ")} · ${xs.map(x => x.caixa.join("×")).join(",")}`); }
  { const xs = M("inicial", sp("B-11").anchor); ok("B-11 etiquetas de filtro: <span>, tabIndex -1, sem role", xs.every(x => x.tag === "span" && x.tabIndex === -1 && !x.attrs.role), xs.map(x => x.texto).join(", ")); }
  for (const [id, st, lim] of [["B-12", "inicial"], ["B-13", "inicial"], ["B-14", "inicial"], ["B-23", "detalhe"]]) {
    const alvo = id === "B-12" ? `${sp(id).anchor}` : sp(id).anchor;
    const xs = M(st, alvo); ok(`${id} contraste < 4,5:1`, xs.length > 0 && xs.every(x => x.razao !== null && x.razao < 4.5), xs.map(x => `"${x.textoProprio || x.texto}" ${x.razao}:1`).slice(0, 3).join(" · "));
  }
  ok("B-14 avatar com o mesmo contraste em todas as paradas", STATES.every(s => M(s.id, sp("B-14").anchor)[0]?.razao === M("inicial", sp("B-14").anchor)[0].razao), STATES.map(s => M(s.id, sp("B-14").anchor)[0]?.razao).join(" · "));
  { const x = M("detalhe-menu", sp("B-15").anchor)[0]; const cor = x.borderTop.match(/rgb[^)]+[)]/)?.[0] ?? ""; ok("B-15 hr.solid: borda 2px #bbb, fora da paleta 3.7.0", x.borderTop.startsWith("2px solid rgb(187, 187, 187)") && !PALETA.has(hex(cor)), `${x.borderTop} · ${hex(cor)} na paleta? ${PALETA.has(hex(cor))} (${PALETA.size} cores)`); }
  { const x = M("detalhe-menu", sp("B-16").anchor)[0]; ok("B-16 ícone do Sair sem alt", !("alt" in x.attrs), `src ${x.attrs.src}`); }
  { const x = M("detalhe-menu", sp("B-17").anchor)[0]; ok("B-17 role=menu sem menuitem", x.attrs.role === "menu" && x.menuitems === 0, `role ${x.attrs.role} · menuitem ${x.menuitems}`); }
  { const x = M("detalhe-menu", sp("B-18").anchor)[0]; ok("B-18 <button> com href e <p> dentro", "href" in x.attrs && x.filhos.includes("p"), `href="${x.attrs.href}" · filhos ${x.filhos.join(",")}`); }
  { const x = M("detalhe-menu", sp("B-19").anchor)[0]; ok("B-19 \"Trocar unidade\": <span>, tabIndex -1, sem role", x.tag === "span" && x.tabIndex === -1 && !x.attrs.role, `"${x.texto}"`); }
  { const x = M("detalhe-menu", sp("B-20").anchor)[0]; ok("B-20 textarea: label irmão sem for, não associado", x.labels === 0 && x.labelIrmao.length === 1 && !x.labelIrmao[0].for && !x.attrs.id, `label "${x.labelIrmao[0]?.texto}" for=${x.labelIrmao[0]?.for}`); }
  ok("B-21 detalhe: títulos começam em h3, sem h1/h2", G("detalhe")?.cabecalhos[0] === 3 && !G("detalhe").cabecalhos.some(n => n < 3), `títulos: ${G("detalhe").cabecalhos.map(n => "h" + n).join(" ")}`);
  { const t = M("detalhe", sp("B-22").anchor)[0]; ok("B-22 tabela do detalhe sem caption/aria-label", t.caption === null && !t.attrs["aria-label"] && !t.attrs["aria-labelledby"], `caption ${t.caption}`); }
  { const x = M("modal", sp("B-24").anchor)[0]; ok("B-24 br-modal sem role/aria-modal/nome", !x.attrs.role && !x.attrs["aria-modal"] && !x.attrs["aria-label"] && !x.attrs["aria-labelledby"], `classes ${x.classes.join(".")}`); }

  // ── conformes (_meta.conformes) ───────────────────────────────────────────────────────────────
  const C = id => conformes.find(c => c.id === id);
  const MC = id => M(C(id).state === "sempre" ? "inicial" : C(id).state, C(id).selector);
  ok("C-01 paginação: circle + aria-label", MC("C-01").every(x => x.classes.includes("circle") && (x.attrs["aria-label"] || "").trim()), MC("C-01").map(x => x.attrs["aria-label"]).join(", "));
  ok("C-02 Limpar Filtro com texto visível", MC("C-02").every(x => x.texto), MC("C-02").map(x => x.texto).join(", "));
  ok("C-03 Exibir/Página com label associado", MC("C-03").every(x => x.labels === 1), MC("C-03").map(x => x.labels).join(","));
  ok("C-04 19 campos do detalhe com label", MC("C-04").length === 19 && MC("C-04").every(x => x.labels >= 1), `${MC("C-04").length} campos`);
  ok("C-05 nome da embarcação ≥ 4,5:1", MC("C-05").every(x => x.razao >= 4.5), `mín ${Math.min(...MC("C-05").map(x => x.razao))}:1`);
  ok("C-06 excluir com nome (title do hospedeiro)", MC("C-06").every(x => (x.hostAttrs?.title || "").trim()), MC("C-06")[0].hostAttrs?.title);
  ok("C-07 abas: <button> tabIndex 0", MC("C-07").every(x => x.tag === "button" && x.tabIndex === 0 && !x.disabled), MC("C-07").map(x => x.texto).join(", "));
  ok("C-08 campo do modal com label", MC("C-08").every(x => x.labels >= 1), `labels ${MC("C-08").map(x => x.labels)}`);
  ok("C-09 links de página focáveis", MC("C-09").every(x => x.tabIndex === 0 && "href" in x.attrs), MC("C-09").map(x => x.texto).join(","));
  ok("C-10 link Home do breadcrumb focável", MC("C-10").every(x => x.tabIndex === 0), MC("C-10").map(x => x.texto).join(","));
  ok("C-11 divisor não focável", MC("C-11").every(x => x.tabIndex < 0), `tabIndex ${MC("C-11").map(x => x.tabIndex)}`);
  ok("C-12 avatar circular", MC("C-12").every(x => x.raio === "50%"), MC("C-12").map(x => x.raio + " " + x.caixa.join("×")).join(","));

  // ── linhas `conforme` de decisoes.json medidas na página ──────────────────────────────────────
  ok("lang pt-br (698e0a4783a9)", STATES.every(s => G(s.id).lang === "pt-br"), G("inicial").lang);
  ok("sem meta refresh, 0 animações (2.3, 2.4, 2.6, 2.7, 5.5)", STATES.every(s => !G(s.id).metaRefresh && G(s.id).animacoes === 0), STATES.map(s => G(s.id).animacoes).join(","));
  ok("Rawline em todo texto visível (406774b1cb87)", STATES.every(s => G(s.id).fontes.every(f => f.startsWith("Rawline"))), [...new Set(STATES.flatMap(s => G(s.id).fontes))].join(" | "));
  {
    const fora = [...new Set(STATES.flatMap(s => G(s.id).cores).filter(c => { const h = hex(c.split("@")[0]); return h && !PALETA.has(h); }))];
    ok("cores na paleta 3.7.0, exceto a borda do hr.solid (21b1a2733f7b)", fora.length === 1 && fora[0].includes("hr"), fora.join(" · "));
  }
  ok("fontes antes do CSS do DS (a43ad8231ad0)", (() => { const c = G("inicial").cabeca; const i = c.findIndex(x => /styles\./.test(x)); return i > c.findIndex(x => /rawline/.test(x)) && i > c.findIndex(x => /raleway/.test(x)); })(), G("inicial").cabeca.filter(x => /css/.test(x)).join(" → "));
  ok("scripts sem type redundante (9826b6862644)", G("inicial").scripts.every(t => t === null || t === "module"), G("inicial").scripts.map(t => t ?? "∅").join(","));
  ok("nenhum diálogo aberto sem ação (5be1f553cc03)", G("inicial").dialogosAbertos === 0, `${G("inicial").dialogosAbertos} na carga`);

  // ── cargas auxiliares: gestos e teclado ───────────────────────────────────────────────────────
  const aux = async fn => { const s = await novaPagina(navegador); try { await carregar(s.pagina, base); return await fn(s); } finally { await s.contexto.close(); } };
  const visiveis = p => p.evaluate(`(() => { ${PRELUDIO} return todos().filter(visivel).length; })()`);
  // B-11: clique abre, Enter não
  for (const gesto of ["clique", "enter"]) {
    const r = await aux(async ({ pagina }) => {
      const antes = await visiveis(pagina);
      const tag = pagina.locator("pnip-filter-panel span.br-tag.interaction").first();
      if (gesto === "clique") await tag.click(); else { await tag.evaluate(e => e.focus()); await pagina.keyboard.press("Enter"); }
      await pagina.waitForTimeout(700);
      return { mais: (await visiveis(pagina)) - antes, foco: await pagina.evaluate(() => document.activeElement.tagName) };
    });
    ok(`B-11 etiqueta "Cidade" — ${gesto}`, gesto === "clique" ? r.mais > 0 : r.mais === 0, `+${r.mais} visíveis · foco em ${r.foco}`);
  }
  // B-19: clique navega, Enter não
  for (const gesto of ["clique", "enter"]) {
    const r = await aux(async ({ pagina }) => {
      await executarPassos(pagina, SETUP.slice(0, STATES.find(s => s.id === "detalhe-menu").afterStep));
      const alvo = pagina.locator("pnip-header #avatar-menu span.text-blue-vivid-60");
      if (gesto === "clique") await alvo.click(); else { await alvo.evaluate(e => e.focus()); await pagina.keyboard.press("Enter"); }
      await pagina.waitForTimeout(1200);
      return new URL(pagina.url()).pathname;
    });
    ok(`B-19 "Trocar unidade" — ${gesto}`, gesto === "clique" ? r === "/pnip/portal-mpa" : r !== "/pnip/portal-mpa", r);
  }
  // Tab real na inicial: B-01 (1º ponto não é salto), B-11 (etiquetas fora), 4.4 (indicador em todo ponto)
  {
    const ordem = await aux(async ({ pagina }) => {
      const pts = [];
      for (let k = 0; k < 90; k++) {
        await pagina.keyboard.press("Tab"); await pagina.waitForTimeout(300);
        pts.push(await pagina.evaluate(`(() => { ${PRELUDIO} const a = ativoProfundo(); if (!a || a === document.body) return { chave: "body" }; const c = getComputedStyle(a);
          return { chave: chave(a), tag: a.tagName.toLowerCase(), href: a.getAttribute("href"), classes: a.getAttribute("class") || "", tipo: a.type || null, indicador: (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== "none" }; })()`));
        if (pts.length > 1 && pts[pts.length - 1].chave === pts[0].chave) break;
      }
      return pts;
    });
    const focos = ordem.filter(p => p.chave !== "body");
    ok("B-01 1º ponto de Tab não é salto para o conteúdo", !(ordem[0].href || "").startsWith("#"), `1º: <${ordem[0].tag}> ${ordem[0].chave.slice(-50)}`);
    ok("B-11 etiquetas de filtro fora da ordem de Tab", !focos.some(p => p.classes.includes("br-tag")), `${focos.length} pontos de Tab`);
    // O último ponto de cada <input type=date> é o botão do calendário no shadow FECHADO do navegador: o foco
    // está nele, o estilo computado do input não o descreve e nada autoral o desenha — não mensurável, fora da conta.
    const ua = focos.filter((p, i) => p.tipo === "date" && !p.indicador && focos[i - 1]?.chave === p.chave);
    const medidos = focos.filter(p => !ua.includes(p));
    ok("indicador de foco em todo ponto de Tab da inicial (21fbcc2fe37b)", medidos.every(p => p.indicador), `${medidos.filter(p => p.indicador).length}/${medidos.length} (fora: ${ua.length} botão(ões) de calendário do <input type=date>, UA)`);
    ok("abas (C-07) e paginação (C-09) alcançadas por Tab", focos.some(p => p.chave.includes("tab-item") || p.chave.includes(">nav>ul>li")) && focos.some(p => p.chave.includes("govbr-custom-pagination")), "abas e paginação alcançadas");
  }
  // Árvore de acessibilidade (inicial e modal): nomes vazios e ausência de diálogo
  {
    const r = await aux(async ({ contexto, pagina }) => {
      const els = await pagina.evaluate(`(() => { ${PRELUDIO} return todos().map(e => ({ chave: chave(e) })); })()`);
      await arvoreAx(contexto, pagina, els);
      const alvo = async sel => { const ks = (await medir(pagina, sel)).map(x => x.chave); return els.filter(e => ks.includes(e.chave)).map(e => e.ax?.nome ?? null); };
      return { olho: await alvo(sp("B-07").anchor), tabela: await alvo(sp("B-03").anchor), caixas: await alvo(sp("B-06").anchor), datas: await alvo(sp("B-05").anchor) };
    });
    ok("B-07 nome acessível vazio (árvore do Chromium)", r.olho.length === 10 && r.olho.every(n => n === ""), JSON.stringify(r.olho.slice(0, 3)));
    ok("B-03 tabela com nome acessível vazio", r.tabela.every(n => n === ""), JSON.stringify(r.tabela));
    ok("B-05/B-06 campos com nome acessível vazio", [...r.caixas, ...r.datas].every(n => n === ""), `${r.caixas.length + r.datas.length} campos`);
    const md = await aux(async ({ contexto, pagina }) => {
      await executarPassos(pagina, SETUP);
      const cdp = await contexto.newCDPSession(pagina);
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      return nodes.filter(n => !n.ignored && ["dialog", "alertdialog"].includes(n.role?.value)).length;
    });
    ok("B-24 nenhum dialog na árvore com o modal aberto", md === 0, `${md} nós dialog/alertdialog`);
  }
} finally {
  await navegador.close();
  servidor.close();
}

const n = resultados.length, bons = resultados.filter(r => r.ok).length;
for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} ${r.id} — ${r.medida}`);
console.log(`\n${bons}/${n}`);
process.exit(bons === n ? 0 : 1);
