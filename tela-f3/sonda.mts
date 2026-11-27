/**
 * Tela F3 — sonda das 12 specs semeadas nos dois builds, sem oráculo, sem axe, sem detector: Playwright (Chromium
 * headless, 1280×900, America/Sao_Paulo) e predicados próprios, escritos aqui.
 *
 * Uma carga por build, com o MESMO setup da referência (tela-f3/estados.mjs) aplicado pelo `runSetupSteps` da
 * bancada (scripts/anchors.ts); em cada parada mede o que cada spec semeada afirma. Três cargas auxiliares por build
 * medem o que não está numa parada: o diálogo aberto pelo botão de ação em lote (antes do Cancelar), o × da tag do
 * filtro antes do clique, e o passar do mouse sobre a célula do nome comprido (tooltip/title).
 * Cada spec tem um predicado próprio (`PEGA`), que tem de valer no semeado e falhar no sem semente.
 * Uso: npx tsx tela-f3/sonda.mts <url semeado> <url sem semente> → tela-f3/sonda.json (sai ≠ 0 se alguma não separar)
 */
import { chromium, type Page } from "playwright";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { openPage, runSetupSteps } from "../scripts/anchors.ts";
import { ALA, PARADAS, SEL, SETUP } from "./estados.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const [URL_SEMEADO, URL_SEM] = process.argv.slice(2);
if (!URL_SEMEADO || !URL_SEM) throw new Error("uso: sonda.mts <url semeado> <url sem semente>");
const ENTRADA = `${ALA}?mock-perfil=mpa`;
const WAIT = "main .br-table tbody tr";

const MEDIR = `(() => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const cs = (e, p) => e ? getComputedStyle(e).getPropertyValue(p) : null;
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return Math.round(r.width * 10) / 10 + "x" + Math.round(r.height * 10) / 10; };
  const pag = q("govbr-custom-pagination");
  const setas = qa("govbr-custom-pagination nav.br-pagination > ul button[aria-label]").map(b => ({ rotulo: b.getAttribute("aria-label"), desabilitado: b.disabled, raio: cs(b, "border-top-left-radius"), estilo: b.getAttribute("style"), caixa: box(b) }));
  const exibirLista = qa("govbr-custom-pagination button[aria-label='Exibir lista']").map(b => cs(b, "border-top-left-radius"));
  const av = q("pnip-header .br-avatar > span");
  const tds = qa("pnip-mpa-processos table tbody td:nth-of-type(5)").map(td => ({ texto: td.textContent.trim(), classe: td.className, overflowX: cs(td, "overflow-x"), whiteSpace: cs(td, "white-space"), textOverflow: cs(td, "text-overflow"), maxWidth: cs(td, "max-width"), scrollWidth: td.scrollWidth, clientWidth: td.clientWidth, title: td.getAttribute("title"), titlesDentro: td.querySelectorAll("[title]").length }));
  const th5 = q("pnip-mpa-processos table thead th:nth-of-type(5)")?.textContent.trim() ?? null;
  const meus = q("pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction");
  const filtros = qa("pnip-multiple-search-table-utils div.row.align-items-center span.br-tag.interaction").map(t => t.textContent.trim() + "=" + cs(t, "background-color"));
  const bc = q("pnip-mpa-processos br-breadcrumb")?.shadowRoot;
  const crumbs = bc ? [...bc.querySelectorAll("li.crumb")] : [];
  const ult = crumbs[crumbs.length - 1];
  const ultA = ult?.querySelector("a");
  const tab = q("pnip-mpa-processos br-tab")?.shadowRoot;
  const abas = tab ? [...tab.querySelectorAll("li.tab-item")].map(l => ({ texto: l.textContent.trim(), ativa: l.classList.contains("active"), fonte: cs(l.querySelector("button"), "font-size"), peso: cs(l.querySelector("button"), "font-weight") })) : [];
  const des = qa("pnip-mpa-processos table tbody br-button[disabled]").map(h => cs(h, "opacity") + "/" + cs(h.shadowRoot?.querySelector("button"), "opacity"));
  const hab = qa("pnip-mpa-processos table tbody br-button:not([disabled])").slice(0, 1).map(h => h.getAttribute("title") + ":" + cs(h, "opacity"));
  const limpar = q("pnip-multiple-search-table-utils br-button[label='Limpar filtros']");
  const campo = q("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total");
  const itens = qa("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item").map(i => i.textContent.trim() + (i.classList.contains("selected") ? "*" : "") + (i.querySelector("input")?.checked ? "(marcado)" : ""));
  const lote = qa("pnip-mpa-processos div.mt-3 > br-button[icon='check'][type='primary']").map(b => ({ label: b.getAttribute("label"), texto: b.shadowRoot?.querySelector("button")?.textContent.trim() ?? null, icon: b.getAttribute("icon") }));
  const esc = qa("pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction").map(t => ({ texto: t.textContent.trim(), visivel: t.getBoundingClientRect().width > 0 }));
  const cabec = qa("pnip-mpa-processos table thead th").map(t => t.textContent.trim()).filter(Boolean);
  return {
    linhas: qa("pnip-mpa-processos table tbody tr").length, informacao: pag?.innerText.replace(/\\s+/g, " ").match(/\\d+\\s*–\\s*\\d+ de \\d+ itens/)?.[0] ?? null,
    paginacao: { setas, itensDaLista: q("govbr-custom-pagination nav.br-pagination > ul")?.children.length ?? null, numeros: qa("govbr-custom-pagination nav.br-pagination > ul a.page, govbr-custom-pagination nav.br-pagination > ul button.page").map(a => a.textContent.trim() + (a.classList.contains("active") ? "*" : "")) },
    exibirListaRaios: exibirLista,
    avatar: av ? { classe: av.className, caixa: box(av), display: cs(av, "display"), raio: cs(av, "border-top-left-radius") } : null,
    solicitante: { cabecalho: th5, celulas: tds },
    meusProcessos: meus ? { texto: meus.textContent.trim(), fundo: cs(meus, "background-color"), estilo: meus.getAttribute("style") } : null, tagsDeFiltro: filtros,
    breadcrumb: { itens: crumbs.length, ultimo: ult ? { dataActive: ult.getAttribute("data-active"), temLink: !!ultA, href: ultA?.getAttribute("href") ?? null, hrefResolvido: ultA?.href ?? null, cor: ultA ? cs(ultA, "color") : cs(ult.querySelector("span"), "color"), tabIndex: ultA ? ultA.tabIndex : null, texto: ult.textContent.trim() } : null },
    abas, cabecalhos: cabec,
    desassociarDesabilitados: des, habilitadoNaLinha: hab, limparFiltros: limpar ? { desabilitado: limpar.hasAttribute("disabled"), opacidade: cs(limpar, "opacity") } : null,
    exibir: { campo: campo?.value ?? null, itens },
    botaoLote: lote, tagEscolhida: esc,
    sessao: Object.keys(sessionStorage).filter(k => /^filters-/.test(k)).map(k => k + "=" + sessionStorage.getItem(k)),
    // naturais "sempre" da D (D-11, D-12, D-13, D-14) também nas paradas novas
    naturaisSempre: (() => { const todos = []; const andar = r => { for (const e of r.querySelectorAll("*")) { todos.push(e); if (e.shadowRoot) andar(e.shadowRoot); } }; andar(document);
      return { h1: todos.filter(e => e.tagName === "H1").length, h2: todos.filter(e => e.tagName === "H2").map(e => e.textContent.trim()), saltos: todos.filter(e => e.tagName === "A" && (e.getAttribute("href") || "").startsWith("#")).length + todos.filter(e => e.classList?.contains("br-skiplink")).length,
        title: document.title, avatar: av ? cs(av, "color") + " sobre " + cs(av, "background-color") + " " + cs(av, "font-size") + "/" + cs(av, "font-weight") : null }; })(),
  };
})()`;

async function carga(browser: any, url: string) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const page: Page = await ctx.newPage();
  const externos: string[] = []; const erros: string[] = [];
  page.on("request", r => { if (!r.url().startsWith(new URL(url).origin)) externos.push(r.url()); });
  page.on("pageerror", e => erros.push(String(e)));
  await openPage(page, new URL(ENTRADA, url).toString(), { waitFor: WAIT });
  return { ctx, page, externos, erros };
}

async function medirBuild(url: string) {
  const browser = await chromium.launch();
  try {
    const paradas: Record<string, any> = {};
    const { ctx, page, externos, erros } = await carga(browser, url);
    let feito = 0;
    for (const p of PARADAS) {
      await runSetupSteps(page, SETUP.slice(feito, p.afterStep) as any); feito = p.afterStep;
      paradas[p.id] = { path: new URL(page.url()).pathname, ...(await page.evaluate(MEDIR)) };
    }
    await ctx.close();
    // auxiliar 1: o diálogo (passos do segmento 2 até o Cancelar aparecer; o Cancelar é clicado, nunca o Assinar)
    const a1 = await carga(browser, url);
    await runSetupSteps(a1.page, [SETUP[4], SETUP[5], SETUP[6], SETUP[7]] as any);
    const dialogo = await a1.page.evaluate(() => ({ titulo: document.querySelector(".swal2-title")?.textContent?.trim() ?? null,
      texto: (document.querySelector(".swal2-html-container") as HTMLElement)?.innerText.replace(/\s+/g, " ").trim() ?? null,
      botoes: [...document.querySelectorAll(".swal2-actions button")].filter(b => (b as HTMLElement).offsetParent !== null).map(b => b.textContent!.trim()) }));
    await a1.page.click(SEL.cancelar); await a1.page.waitForTimeout(1200);
    const depoisDoCancelar = await a1.page.evaluate(() => ({ dialogo: !!document.querySelector(".swal2-container"), rotulo: document.querySelector("pnip-mpa-processos div.mt-3 > br-button[icon=check]")?.getAttribute("label") ?? null }));
    await a1.ctx.close();
    // auxiliar 2: o × antes do clique (passos do segmento 8 até a tag escolhida aparecer)
    const a2 = await carga(browser, url);
    await runSetupSteps(a2.page, SETUP.slice(27, 32) as any);
    const xAntes = await a2.page.evaluate(sel => { const b = document.querySelector(sel + " > button") as HTMLButtonElement; const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
      return { classe: b.className, caixa: `${Math.round(r.width)}x${Math.round(r.height)}`, raio: cs.borderTopLeftRadius, fundo: cs.backgroundColor, tabIndex: b.tabIndex, desabilitado: b.disabled, linhas: document.querySelectorAll("pnip-mpa-processos table tbody tr").length }; }, SEL.tagEscolhida);
    // Enter no × focado, além do clique da parada
    await a2.page.focus(SEL.tagEscolhida + " > button"); await a2.page.keyboard.press("Enter"); await a2.page.waitForTimeout(1000);
    const depoisDoEnter = await a2.page.evaluate(sel => document.querySelectorAll(sel).length, SEL.tagEscolhida);
    await a2.ctx.close();
    // auxiliar 3: mouse sobre a célula Solicitante da 1ª linha (inicial)
    const a3 = await carga(browser, url);
    const alvo = "pnip-mpa-processos table tbody tr:nth-child(1) td:nth-of-type(5)";
    const antesHover = await a3.page.evaluate(() => document.querySelectorAll("[role=tooltip], .br-tooltip, .tooltip").length);
    await a3.page.hover(alvo); await a3.page.waitForTimeout(1200);
    const hover = await a3.page.evaluate(() => ({ tooltipsVisiveis: [...document.querySelectorAll("[role=tooltip], .br-tooltip, .tooltip")].filter(t => (t as HTMLElement).offsetParent !== null).map(t => (t as HTMLElement).innerText.slice(0, 80)) }));
    await a3.ctx.close();
    return { paradas, dialogo, depoisDoCancelar, xAntes, depoisDoEnter, hover: { ...hover, antesHover }, externos: [...externos, ...a1.externos, ...a2.externos, ...a3.externos], erros: [...erros, ...a1.erros, ...a2.erros, ...a3.erros] };
  } finally { await browser.close(); }
}

const semeado = await medirBuild(URL_SEMEADO);
const sem = await medirBuild(URL_SEM);
const ids = PARADAS.map(p => p.id);
const todas = (m: any, f: (x: any) => boolean) => ids.every(id => f(m.paradas[id]));
const cortadas = (x: any) => x.solicitante.celulas.filter((c: any) => c.overflowX === "hidden" && c.textOverflow === "clip" && c.whiteSpace === "nowrap" && c.scrollWidth > c.clientWidth && !c.title && c.titlesDentro === 0).length;
// predicado próprio de cada spec: [o que vale no semeado, o mesmo lido no sem semente]
const PEGA: Record<string, (m: any) => boolean> = {
  "F3-01": m => todas(m, x => x.paginacao.setas.some((s: any) => s.rotulo === "Página seguinte") && !x.paginacao.setas.some((s: any) => s.rotulo === "Página anterior")),
  "F3-02": m => !/(^|\s)content(\s|$)/.test(m.paradas.inicial.avatar.classe) && m.paradas.inicial.avatar.raio !== "50%",
  "F3-03": m => m.xAntes.classe.includes("br-button") && m.paradas["filtro-removido"].tagEscolhida.length === 1 && m.paradas["filtro-removido"].tagEscolhida[0].visivel && m.depoisDoEnter === 1,
  "F3-04": m => cortadas(m.paradas.inicial) === m.paradas.inicial.solicitante.celulas.length && m.paradas.inicial.solicitante.celulas.length === 9 && m.hover.tooltipsVisiveis.length === 0,
  "F3-05": m => m.paradas.inicial.meusProcessos.fundo === "rgb(23, 85, 169)",
  "F3-06": m => m.paradas.inicial.paginacao.setas.find((s: any) => s.rotulo === "Página seguinte")?.raio === "7px",
  "F3-07": m => m.paradas.inicial.breadcrumb.ultimo.temLink && m.paradas.inicial.breadcrumb.ultimo.dataActive === null,
  "F3-08": m => m.paradas.inicial.abas.every((a: any) => a.fonte === "16.8px"),
  "F3-09": m => { const x = m.paradas["exibir-25"]; return x.exibir.campo === "10" && x.exibir.itens.some((i: string) => i.startsWith("25*")) && x.linhas === 14; },
  "F3-10": m => m.paradas.inicial.desassociarDesabilitados.length === 8 && m.paradas.inicial.desassociarDesabilitados.every((o: string) => o === "1/1"),
  "F3-11": m => { const a = m.paradas.inicial.abas; return a[0].ativa && !a[1].ativa && !!m.paradas.inicial.meusProcessos && m.paradas.inicial.cabecalhos.includes("Analista"); },
  "F3-12": m => m.paradas["assinatura-cancelada"].botaoLote.length === 1 && m.paradas["assinatura-cancelada"].botaoLote[0].label === "Confirmar" && /assinatura/i.test(m.dialogo.titulo ?? ""),
};
const resultado = Object.fromEntries(Object.entries(PEGA).map(([id, f]) => { const a = f(semeado), b = f(sem); return [id, { semeado: a, semSemente: b, separa: a && !b }]; }));
const out = { _meta: { data: "2026-11-27", regra: "cabeçalho de tela-f3/sonda.mts; sem oráculo, sem axe, sem detector", semeado: URL_SEMEADO, semSemente: URL_SEM, paradas: ids }, resultado, semeado, semSemente: sem };
writeFileSync(join(AQUI, "sonda.json"), JSON.stringify(out, null, 1) + "\n");
console.log(Object.entries(resultado).map(([k, v]) => `${k} ${v.separa ? "separa" : "NAO SEPARA"} (${v.semeado}/${v.semSemente})`).join("\n"));
console.log("externos", semeado.externos.length, sem.externos.length, "erros", semeado.erros.length, sem.erros.length);
process.exit(Object.values(resultado).every(v => v.separa) ? 0 : 1);
