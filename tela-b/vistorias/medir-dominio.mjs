/**
 * D-168 — medição SEM MODELO do domínio das specs de rota de registro da tela B (Vistorias): para cada registro de
 * detalhe alcançável pela lista (as três abas, todas as páginas, todas as linhas), o observável de cada spec de parada
 * em rota de registro (B-20…B-24, B-27), medido na página congelada. Não é julgamento e não decide domínio: só põe lado
 * a lado o que cada registro mostra; quem declara o domínio é a referência 1.1.0, que cita este arquivo.
 *
 * Site: `govbr-telas/site/` servido pelo próprio `govbr-telas/server.mjs` (que confere o sha256 de cada arquivo do
 * site-manifest.json antes de subir) numa porta livre de 127.0.0.1 (nunca 3100/3300/3302/3303/4100-4102). A árvore
 * `pnip/` desse site é conferida aqui, arquivo a arquivo, contra `govbr-corpus/public/pnip/manifesto.json`.
 * Condições de medida de `comum.mjs` (1280×900, fuso, aborto de toda saída, registro de escritas, `executarPassos`),
 * Chromium headless do Playwright do govbr-eval.
 *
 *  1. Lista: para cada aba (Tramitando = padrão, Agendar, Concluídos) e página, as linhas (posição, embarcação, situação,
 *     ícones de ação). Para cada linha, carga nova: aba → página → clique no olho (ou no "Agendar"/calendário da aba
 *     Agendar) → rota alcançada (o registro = fim do path).
 *  2. Detalhe: na MESMA carga da linha (a receita que os cartões descrevem), depois do clique: títulos (h1–h6, árvore
 *     composta), textareas do detalhe (B-20), tabelas do detalhe (B-22), `.bg-secondary-06 > .text-secondary-01` e
 *     todo texto "0%" (B-23), botão "Trocar embarcação da vistoria" (B-24/B-27), com nome acessível pela árvore do
 *     Chromium (CDP).
 *  3. Modal: para cada registro com o botão, carga nova + navigate por path (como a referência chega ao `modal`) + clique
 *     no botão: atributos do `.br-modal` (B-24), nós dialog/alertdialog na árvore (B-24), Tab real a partir do 1º
 *     controle do modal, 30 teclas (B-27).
 *  4. Filtro Cidade: para cada aba e opção, as linhas filtradas de cada página, ligadas ao registro pela linha igual da
 *     lista sem filtro (para ler receitas "filtro Cidade > X, linha N" sem modelo).
 *
 * Uso (da raiz do govbr-eval):  node tela-b/vistorias/medir-dominio.mjs <saida.json> [--porta 3319]
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { novaPagina, carregar, hidratar, abrirNavegador, PRELUDIO, VIEWPORT, RAIZ_EVAL, CORPUS } from "./comum.mjs";

const saida = process.argv[2];
if (!saida) { console.error("uso: node tela-b/vistorias/medir-dominio.mjs <saida.json> [--porta N]"); process.exit(1); }
const PORTA = Number(process.argv.includes("--porta") ? process.argv[process.argv.indexOf("--porta") + 1] : 3319);
if ([3100, 3300, 3302, 3303, 4100, 4101, 4102].includes(PORTA)) throw new Error(`porta ${PORTA} reservada`);
const TELAS = join(RAIZ_EVAL, "../govbr-telas");
const sha = b => createHash("sha256").update(b).digest("hex");

// ── conferência do site: govbr-telas/site/pnip × manifesto do corpus ───────────────────────────────────────────────
const siteManifesto = JSON.parse(readFileSync(join(TELAS, "site-manifest.json"), "utf8"));
const pnipManifesto = JSON.parse(readFileSync(join(CORPUS, "public/pnip/manifesto.json"), "utf8"));
const doSite = new Map(siteManifesto.files.map(f => [f.path, f.sha256]));
const divergentes = Object.entries(pnipManifesto.arquivos).filter(([rel, h]) => doSite.get("pnip/" + rel) !== h || sha(readFileSync(join(TELAS, "site/pnip", rel))) !== h).map(([rel]) => rel);
if (divergentes.length) { console.error(`govbr-telas/site/pnip diverge do manifesto do corpus: ${divergentes.slice(0, 5).join(", ")}`); process.exit(2); }

const ABAS = [{ id: "TRAMITANDO", nome: "Tramitando", padrao: true }, { id: "AGENDAR", nome: "Agendar" }, { id: "HISTORICO", nome: "Concluídos" }];
const UUID_FIM = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

const servidor = spawn(process.execPath, ["server.mjs", "--port", String(PORTA)], { cwd: TELAS, stdio: ["ignore", "pipe", "pipe"] });
let saidaServidor = "";
servidor.stdout.on("data", d => { saidaServidor += d; });
servidor.stderr.on("data", d => { saidaServidor += d; });
const base = `http://127.0.0.1:${PORTA}`;
for (let i = 0; ; i++) {
  try { const r = await fetch(base + "/pnip/portal-mpa/vistorias"); if (r.ok) break; } catch { /* sobe */ }
  if (i > 100) { servidor.kill(); throw new Error(`servidor do govbr-telas não subiu na porta ${PORTA}: ${saidaServidor}`); }
  await new Promise(r => setTimeout(r, 200));
}

const LINHAS = `(() => [...document.querySelectorAll("main tbody tr")].map((tr, i) => ({ linha: i + 1,
  celulas: [...tr.querySelectorAll("td")].map(td => td.textContent.replace(/\\s+/g, " ").trim()),
  icones: [...tr.querySelectorAll("br-button")].map(b => b.getAttribute("icon")) })))()`;

async function irPara(pagina, aba, pag) {
  if (!aba.padrao) { await pagina.click("#" + aba.id); await pagina.waitForSelector(`.tab-item.active #${aba.id}`, { timeout: 10_000 }); await pagina.waitForTimeout(800); }
  if (pag > 1) {
    const antes = await pagina.evaluate(LINHAS);
    await pagina.click(`a.page >> text="${pag}"`);
    await pagina.waitForFunction(a => JSON.stringify([...document.querySelectorAll("main tbody tr")].map(tr => tr.textContent.replace(/\s+/g, " ").trim())) !== a,
      JSON.stringify(antes.map(l => l.celulas.join(" ").replace(/\s+/g, " ").trim())), { timeout: 10_000 }).catch(() => {});
    await pagina.waitForTimeout(800);
  }
  await hidratar(pagina);
}

/** Medidas do detalhe, na página (texto). */
const DETALHE = `(() => {
${PRELUDIO}
  const rgba = s => { const m = /rgba?\\(([^)]+)\\)/.exec(s); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const comp = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const paiC = e => e.parentElement || (ehSombra(raizDe(e)) ? raizDe(e).host : null);
  const fundo = el => { const pilha = []; for (let e = el; e; e = paiC(e)) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c.a > 0) pilha.push(c); if (c && c.a === 1) break; }
    let b = { r: 255, g: 255, b: 255, a: 1 }; for (const x of pilha.reverse()) b = comp(x, b); return b; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const hex = c => "#" + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  const txt = e => (e.textContent || "").replace(/\\s+/g, " ").trim();
  const secao = el => { for (let e = el.parentElement; e; e = e.parentElement) { const h = e.querySelector("h4"); if (h) return txt(h); } return null; };
  const h4Antes = el => { let melhor = null; for (const h of document.querySelectorAll("pnip-propesc-agendar-vistoria h4")) if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) melhor = txt(h); return melhor; };
  const attrs = el => Object.fromEntries(Array.from(el.attributes).filter(a => !a.name.startsWith("_ng") && a.name !== "class" && !a.name.startsWith("data-dom-")).map(a => [a.name, a.value]));
  const cor = el => { const cs = getComputedStyle(el), f0 = rgba(cs.color), bg = fundo(el), f = f0.a < 1 ? comp(f0, bg) : f0, L1 = lum(f), L2 = lum(bg);
    return { cor: hex(f), fundo: hex(bg), contraste: Math.round((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) * 100) / 100, fonte: cs.fontSize + " / " + cs.fontWeight }; };
  const raiz = document.querySelector("pnip-propesc-agendar-vistoria");
  const els = todos();
  let n = 0; const marca = el => { const k = "d" + (n++); el.setAttribute("data-dom-i", k); return k; };
  return {
    path: location.pathname, componente: !!raiz, titulo: document.title,
    titulos: els.filter(e => /^H[1-6]$/.test(e.tagName) && visivel(e)).map(e => ({ nivel: +e.tagName[1], texto: txt(e), noDetalhe: !!(raiz && raiz.contains(e)), chave: chave(e) })),
    textareas: raiz ? [...raiz.querySelectorAll("textarea")].map(t => ({ marca: marca(t), chave: chave(t), seletorB20: t.matches("pnip-propesc-agendar-vistoria .br-textarea textarea"), visivel: visivel(t),
      id: t.id || null, labels: t.labels ? t.labels.length : null, disabled: t.disabled, readonly: t.readOnly, attrs: attrs(t),
      labelIrmao: t.parentElement ? [...t.parentElement.children].filter(c => c.tagName === "LABEL").map(c => ({ texto: txt(c), for: c.getAttribute("for") })) : [] })) : [],
    tabelas: raiz ? [...raiz.querySelectorAll("table")].map(t => ({ marca: marca(t), chave: chave(t), visivel: visivel(t), caption: t.caption ? txt(t.caption) : null,
      ariaLabel: t.getAttribute("aria-label"), ariaLabelledby: t.getAttribute("aria-labelledby"), cabecalhos: [...t.querySelectorAll("th")].map(txt), h4Antes: h4Antes(t), linhas: t.querySelectorAll("tbody tr").length })) : [],
    seletorB23: queryAll("pnip-propesc-agendar-vistoria .bg-secondary-06 > .text-secondary-01").map(e => ({ chave: chave(e), texto: txt(e), visivel: visivel(e), secao: secao(e), ...cor(e) })),
    textos0: raiz ? [...raiz.querySelectorAll("*")].filter(e => txt(e) === "0%" && ![...e.children].some(c => txt(c) === "0%")).map(e => ({ chave: chave(e), classes: e.getAttribute("class"), secao: secao(e), visivel: visivel(e), ...cor(e) })) : [],
    trocarEmbarcacao: queryAll('br-button[label="Trocar embarcação da vistoria"]').length,
    secoes: raiz ? [...raiz.querySelectorAll("h4")].map(txt) : [],
  };
})()`;

/** Nome acessível (árvore do Chromium) de cada elemento marcado com data-dom-i. */
async function nomesAx(contexto, pagina) {
  const cdp = await contexto.newCDPSession(pagina);
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const porBackend = new Map();
  const visitar = no => { if (no.attributes) { const k = no.attributes.indexOf("data-dom-i"); if (k >= 0) porBackend.set(no.backendNodeId, no.attributes[k + 1]); }
    for (const c of [...(no.children ?? []), ...(no.shadowRoots ?? [])]) visitar(c); };
  visitar(root);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const out = {};
  for (const no of nodes) { const k = porBackend.get(no.backendDOMNodeId); if (k) out[k] = { papel: no.role?.value ?? null, nome: no.name?.value ?? "", ignorado: !!no.ignored }; }
  return out;
}

async function medirDetalhe(contexto, pagina) {
  const d = await pagina.evaluate(DETALHE);
  const ax = await nomesAx(contexto, pagina);
  for (const x of [...d.textareas, ...d.tabelas]) { x.ax = ax[x.marca] ?? null; delete x.marca; }
  await pagina.evaluate(() => document.querySelectorAll("[data-dom-i]").forEach(e => e.removeAttribute("data-dom-i")));
  return d;
}

const nav = await abrirNavegador();
const lista = [], detalhes = new Map(), modais = {}, filtros = [];
const problemas = [];
try {
  // ── 1–2. lista e detalhe pela receita ──────────────────────────────────────────────────────────────────────────
  for (const aba of ABAS) {
    let paginas = 1;
    for (let pag = 1; pag <= paginas; pag++) {
      const s = await novaPagina(nav);
      await carregar(s.pagina, base);
      await irPara(s.pagina, aba, pag);
      if (pag === 1) paginas = Math.max(1, ...(await s.pagina.$$eval("a.page", as => as.map(a => +a.textContent.trim()).filter(Number.isFinite))));
      const linhas = await s.pagina.evaluate(LINHAS);
      await s.contexto.close();
      for (const l of linhas) {
        const botao = l.icones.includes("eye") ? "eye" : l.icones.includes("calendar") ? "calendar" : null;
        const entrada = { aba: aba.nome, pagina: pag, linha: l.linha, celulas: l.celulas, icones: l.icones, botao, path: null, registro: null };
        lista.push(entrada);
        if (!botao) continue;
        const t = await novaPagina(nav);
        try {
          await carregar(t.pagina, base);
          await irPara(t.pagina, aba, pag);
          const antes = t.pagina.url();
          const doc = await t.pagina.evaluate(() => (window.__auditoriaDoc = Math.random().toString(36).slice(2)));
          await t.pagina.click(`main tbody tr:nth-child(${l.linha}) br-button[icon="${botao}"] button`, { timeout: 10_000 });
          await t.pagina.waitForURL(u => u.href !== antes, { timeout: 10_000, waitUntil: "commit" });
          await t.pagina.waitForSelector("pnip-propesc-agendar-vistoria", { timeout: 10_000 });
          await hidratar(t.pagina); await t.pagina.waitForTimeout(1200);
          if (await t.pagina.evaluate(() => window.__auditoriaDoc || null) !== doc) throw new Error("documento recarregado");
          const d = await medirDetalhe(t.contexto, t.pagina);
          entrada.path = d.path; entrada.registro = UUID_FIM.exec(d.path)?.[1] ?? null;
          const escritas = t.escritas().length, externos = t.externos().length;
          if (escritas || externos || t.erros.length) problemas.push(`${aba.nome} p${pag} l${l.linha}: escritas ${escritas}, externos ${externos}, erros ${t.erros.join("; ")}`);
          if (entrada.registro && !detalhes.has(entrada.registro))
            detalhes.set(entrada.registro, { registro: entrada.registro, alcancadoPor: { aba: aba.nome, pagina: pag, linha: l.linha, botao }, situacaoNaLista: l.celulas.filter(Boolean).slice(-2), ...d, escritas, externos, erros: t.erros });
          else if (entrada.registro) detalhes.get(entrada.registro).tambemPor = [...(detalhes.get(entrada.registro).tambemPor ?? []), { aba: aba.nome, pagina: pag, linha: l.linha, botao }];
        } catch (e) { problemas.push(`${aba.nome} p${pag} l${l.linha}: ${String(e.message).split("\n")[0]}`); }
        finally { await t.contexto.close(); }
        process.stdout.write(`${aba.nome} p${pag} l${l.linha} → ${entrada.registro?.slice(-4) ?? "—"}\n`);
      }
    }
  }
  // ── 3. modal (B-24/B-27) ───────────────────────────────────────────────────────────────────────────────────────
  for (const d of detalhes.values()) {
    if (!d.trocarEmbarcacao) continue;
    const s = await novaPagina(nav);
    try {
      await carregar(s.pagina, base);
      await s.pagina.evaluate(c => { history.pushState(null, "", c); dispatchEvent(new PopStateEvent("popstate", { state: null })); }, d.path);
      await s.pagina.waitForSelector('br-button[label="Trocar embarcação da vistoria"]', { timeout: 10_000 });
      await hidratar(s.pagina); await s.pagina.waitForTimeout(1200);
      await s.pagina.click('br-button[label="Trocar embarcação da vistoria"] button', { timeout: 10_000 });
      await s.pagina.waitForSelector(".br-modal", { timeout: 10_000 });
      const listaOk = await s.pagina.waitForSelector(".lista-embarcacoes .item-embarcacao:nth-child(2)", { timeout: 5_000 }).then(() => true, () => false);
      await s.pagina.waitForTimeout(600);
      const m = await s.pagina.evaluate(`(() => { ${PRELUDIO} return queryAll(".br-modal").map(e => ({ chave: chave(e), noComponente: !!e.closest("pnip-propesc-trocar-embarcacao"), visivel: visivel(e),
        classes: e.getAttribute("class"), role: e.getAttribute("role"), ariaModal: e.getAttribute("aria-modal"), ariaLabel: e.getAttribute("aria-label"), ariaLabelledby: e.getAttribute("aria-labelledby"),
        titulo: (e.querySelector(".br-modal-header") || {}).textContent?.replace(/\\s+/g, " ").trim() ?? null })); })()`);
      const cdp = await s.contexto.newCDPSession(s.pagina);
      const { nodes } = await cdp.send("Accessibility.getFullAXTree"); await cdp.detach();
      const dialogos = nodes.filter(no => !no.ignored && ["dialog", "alertdialog"].includes(no.role?.value)).length;
      await s.pagina.evaluate(() => document.querySelector(".br-modal input, .br-modal button")?.focus());
      const giro = [];
      for (let k = 0; k < 30; k++) {
        await s.pagina.keyboard.press("Tab"); await s.pagina.waitForTimeout(150);
        giro.push(await s.pagina.evaluate(`(() => { ${PRELUDIO} const a = ativoProfundo(); if (!a || a === document.body) return { fora: true, chave: "body" };
          let e = a; while (e && !(e.classList && e.classList.contains("br-modal"))) e = e.parentElement || (ehSombra(raizDe(e)) ? raizDe(e).host : null);
          return { fora: !e, chave: chave(a) }; })()`));
      }
      const fora = giro.filter(p => p.fora);
      modais[d.registro] = { listaDeEmbarcacoes: listaOk, modais: m, dialogosNaArvore: dialogos, tab: { teclas: giro.length, dentro: giro.length - fora.length, fora: fora.length, primeiroFora: fora[0]?.chave ?? null },
        escritas: s.escritas().length, externos: s.externos().length, erros: s.erros };
    } catch (e) { problemas.push(`modal ${d.registro}: ${String(e.message).split("\n")[0]}`); }
    finally { await s.contexto.close(); }
    process.stdout.write(`modal ${d.registro.slice(-4)}\n`);
  }
  // ── 4. filtro Cidade (receitas "filtro Cidade > X" + linha N) ────────────────────────────────────────────────────
  // Por aba e por opção: carga nova → aba → etiqueta "Cidade" → opção → linhas de cada página. Cada linha filtrada é
  // ligada ao registro pela linha IGUAL (todas as células menos o número de ordem) da lista sem filtro da mesma aba.
  for (const aba of ABAS) {
    const s = await novaPagina(nav);
    let opcoes = [];
    try {
      await carregar(s.pagina, base); await irPara(s.pagina, aba, 1);
      await s.pagina.locator("pnip-filter-panel span.br-tag.interaction", { hasText: /^\s*Cidade\s*$/ }).first().click();
      await s.pagina.waitForTimeout(800);
      opcoes = await s.pagina.$$eval("pnip-filter-panel label", ls => ls.filter(l => l.getBoundingClientRect().width > 0).map(l => l.textContent.replace(/\s+/g, " ").trim()).filter(t => t && !["Exibir", "Página"].includes(t)));
    } finally { await s.contexto.close(); }
    for (const opcao of opcoes) {
      let paginas = 1;
      for (let pag = 1; pag <= paginas; pag++) {
        const f = await novaPagina(nav);
        try {
          await carregar(f.pagina, base); await irPara(f.pagina, aba, 1);
          await f.pagina.locator("pnip-filter-panel span.br-tag.interaction", { hasText: /^\s*Cidade\s*$/ }).first().click();
          await f.pagina.waitForTimeout(800);
          await f.pagina.locator("pnip-filter-panel label", { hasText: new RegExp(`^\\s*${opcao.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }).first().click();
          await f.pagina.waitForTimeout(1500);
          if (pag === 1) paginas = Math.max(1, ...(await f.pagina.$$eval("a.page", as => as.map(a => +a.textContent.trim()).filter(Number.isFinite))));
          if (pag > 1) await irPara(f.pagina, { ...aba, padrao: true }, pag);
          const linhas = await f.pagina.evaluate(LINHAS);
          for (const l of linhas) {
            const igual = lista.filter(x => x.aba === aba.nome && x.celulas.slice(1).join("|") === l.celulas.slice(1).join("|"));
            filtros.push({ aba: aba.nome, filtro: "Cidade", opcao, pagina: pag, linha: l.linha, celulas: l.celulas, registro: igual.length === 1 ? igual[0].registro : null, casamentos: igual.length });
          }
        } catch (e) { problemas.push(`filtro ${aba.nome} Cidade=${opcao} p${pag}: ${String(e.message).split("\n")[0]}`); }
        finally { await f.contexto.close(); }
      }
      process.stdout.write(`filtro ${aba.nome} Cidade=${opcao}\n`);
    }
  }
} finally { await nav.close(); servidor.kill(); }

const doc = {
  formato: "d168-medicao-dominio-1.0.0",
  aviso: "medição sem modelo na página congelada; não é julgamento nem decide domínio (a referência 1.1.0 declara o domínio e cita este arquivo)",
  tela: "vistorias", data: "2026-11-04",
  referencia: { arquivo: "govbr-eval/ground-truth-vistorias.json", versao: JSON.parse(readFileSync(join(RAIZ_EVAL, "ground-truth-vistorias.json"), "utf8"))._meta.version },
  site: { servidor: "govbr-telas/server.mjs (confere o sha256 de cada arquivo de site-manifest.json ao subir)", siteSha256: siteManifesto.item.sha256, siteManifestoSha256: sha(readFileSync(join(TELAS, "site-manifest.json"))),
    pnipConferidoContra: { arquivo: "govbr-corpus/public/pnip/manifesto.json", sha256: sha(readFileSync(join(CORPUS, "public/pnip/manifesto.json"))), arquivos: Object.keys(pnipManifesto.arquivos).length, divergentes: 0 } },
  script: { arquivo: "govbr-eval/tela-b/vistorias/medir-dominio.mjs", sha256: sha(readFileSync(new URL(import.meta.url))) },
  janela: VIEWPORT, navegador: "chromium headless (Playwright, govbr-eval/node_modules)", entrada: "/pnip/portal-mpa/vistorias?mock-perfil=mpa",
  contraste: "WCAG 2.x (luminância relativa), fundo efetivo = composição dos fundos não transparentes dos ancestrais sobre branco",
  problemas,
  lista,
  detalhes: [...detalhes.values()].sort((a, b) => a.registro.localeCompare(b.registro)),
  modais,
  filtros,
};
writeFileSync(saida, JSON.stringify(doc, null, 2) + "\n");
console.log(`lista ${lista.length} linhas · ${detalhes.size} registros de detalhe · ${Object.keys(modais).length} modais · ${filtros.length} linhas filtradas (${filtros.filter(f => !f.registro).length} sem registro único) · problemas ${problemas.length}`);
for (const p of problemas) console.log("  " + p);
