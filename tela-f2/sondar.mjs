/**
 * Tela F2 — sonda das âncoras e dos valores das specs semeadas e das iscas, nos dois builds (sem modelo, sem oráculo,
 * sem axe). Só leitura de DOM e estilo computado, Playwright headless 1280×900, America/Sao_Paulo.
 * Uso: node tela-f2/sondar.mjs <url sem semente> <url semeada> → tela-f2/sonda.json
 */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire("F:/Dev Nath/TCC/govbr-eval/package.json")("playwright");
const [SEM, SEMEADA] = process.argv.slice(2);
const ROTA = "/pnip-f2/portal-mpa/processos?mock-perfil=mpa";
const TAG_ABERTO_HA = "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag";
const ITEM_FILTRO = "pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item";
const TAG_ESCOLHIDA = "pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction";

// q(sel): resolve "a >>> b" atravessando o shadow root do hospedeiro
const PRE = `
const qa = (sel) => { const partes = sel.split(">>>").map(s => s.trim()); let raizes = [document], els = [];
  for (let i = 0; i < partes.length; i++) { els = []; for (const r of raizes) els.push(...r.querySelectorAll(partes[i])); if (i < partes.length - 1) raizes = els.map(e => e.shadowRoot).filter(Boolean); }
  return els; };
const cs = (el, ps) => Object.fromEntries(ps.map(p => [p, getComputedStyle(el).getPropertyValue(p).trim()]));
const caixa = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x*10)/10, y: Math.round(r.y*10)/10, w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10 }; };
`;
const SONDAS = {
  inicial: {
    paginacao: `qa("govbr-custom-pagination nav.br-pagination button.br-button.circle").map(b => ({ aria: b.getAttribute("aria-label"), ...caixa(b) }))`,
    paginacaoUl: `qa("govbr-custom-pagination nav.br-pagination > ul").map(u => ({ filhos: u.children.length, lis: [...u.children].map(li => li.className + "|" + li.textContent.trim().slice(0,20)) }))`,
    avatar: `qa("pnip-header .br-avatar > span").map(s => ({ classe: s.className, ...caixa(s), ...cs(s, ["border-top-left-radius","display","background-color","color","font-size","font-weight"]) }))`,
    avatarContent: `qa("pnip-header .br-avatar .content").length`,
    h2: `qa("pnip-mpa-processos h2").map(h => ({ t: h.textContent.trim(), ...cs(h, ["font-size","font-weight","color"]) }))`,
    meus: `qa("pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction > span.text-truncate").map(s => ({ t: s.textContent.trim(), ...cs(s, ["font-size"]) }))`,
    tagsFiltro: `qa("pnip-multiple-search-table-utils div.row.align-items-center span.br-tag").map(s => ({ t: s.textContent.trim(), ...cs(s, ["font-size","border-top-left-radius"]) }))`,
    divisor: `qa("pnip-mpa-processos > br-divider >>> .br-divider").map(s => ({ classe: s.className, ...cs(s, ["border-top-color","border-top-width"]) }))`,
    breadcrumbShadow: `qa("pnip-mpa-processos br-breadcrumb").map(h => h.shadowRoot ? h.shadowRoot.innerHTML.replace(/\\s+/g, " ").slice(0, 1500) : null)`,
    breadcrumbHome: `qa("pnip-mpa-processos br-breadcrumb >>> li.crumb.home i.fa-home").map(i => ({ tag: i.tagName, pai: i.parentElement.tagName + "." + i.parentElement.className, ...cs(i, ["color"]) }))`,
    breadcrumbA: `qa("pnip-mpa-processos br-breadcrumb >>> a").map(a => ({ t: a.textContent.trim(), contemIcone: !!a.querySelector("i.fa-home"), ...cs(a, ["color"]) }))`,
    breadcrumbLi: `qa("pnip-mpa-processos br-breadcrumb >>> li").map(li => ({ c: li.className, t: li.textContent.trim(), ...cs(li, ["color"]) }))`,
    abas: `qa("pnip-mpa-processos br-tab >>> button").map(b => ({ t: b.textContent.trim(), ...cs(b, ["font-size","font-weight"]) }))`,
    abasLi: `qa("pnip-mpa-processos br-tab >>> li.tab-item").map(li => ({ t: li.textContent.trim(), ativo: li.classList.contains("active"), ...cs(li, ["color"]) }))`,
    abaItens: `qa("pnip-mpa-processos br-tab-item").map(e => ({ id: e.id, isActive: e.getAttribute("is-active") }))`,
    meusPresente: `qa("pnip-mpa-processos div.tab-panel span.br-tag.interaction").map(s => s.textContent.trim())`,
    ths: `qa("pnip-mpa-processos table thead th").map(t => t.textContent.trim())`,
    desab: `qa("pnip-mpa-processos br-button[disabled]").map(b => ({ title: b.getAttribute("title"), label: b.getAttribute("label"), naTabela: !!b.closest("table"), host: cs(b, ["opacity"]).opacity, interno: b.shadowRoot && b.shadowRoot.querySelector("button") ? cs(b.shadowRoot.querySelector("button"), ["opacity","cursor"]) : null }))`,
    desabTodos: `qa("br-button[disabled]").map(b => (b.getAttribute("label") || b.getAttribute("title")) + "@" + (b.closest("pnip-mpa-processos") ? "processos" : "fora"))`,
    voltar: `qa("pnip-mpa-processos br-button[label=\\"Voltar\\"]").map(b => ({ hover: cs(b, ["--hover"])["--hover"], interno: cs(b.shadowRoot.querySelector("button"), ["--hover","background-image"]) }))`,
    exportar: `qa("pnip-mpa-processos br-button[label=Exportar]").map(b => ({ hover: cs(b, ["--hover"])["--hover"] }))`,
    exibirInput: `qa("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total").length`,
  },
};
const browser = await chromium.launch();
const out = {};
async function carregar(base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const pg = await ctx.newPage();
  await pg.goto(base + ROTA, { waitUntil: "networkidle" });
  await pg.waitForSelector("main .br-table tbody tr"); await pg.waitForTimeout(600);
  return { ctx, pg };
}
for (const [nome, base] of [["semSemente", SEM], ["semeada", SEMEADA]]) {
  const r = {};
  let { ctx, pg } = await carregar(base);
  for (const [k, expr] of Object.entries(SONDAS.inicial)) r[k] = await pg.evaluate(PRE + "(" + expr + ")");
  // hover no Voltar
  await pg.hover("pnip-mpa-processos br-button[label=\"Voltar\"]"); await pg.waitForTimeout(400);
  r.voltarHover = await pg.evaluate(PRE + `(qa("pnip-mpa-processos br-button[label=\\"Voltar\\"] >>> button").map(b => cs(b, ["background-image"])))`);
  await pg.mouse.move(0, 0);
  // lista Exibir
  await pg.click("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total");
  await pg.waitForSelector("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item"); await pg.waitForTimeout(400);
  r.listaExibir = await pg.evaluate(PRE + `(qa("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip div.br-list").map(l => cs(l, ["box-shadow","display"])))`);
  r.listaPagina = await pg.evaluate(PRE + `(qa("govbr-custom-pagination nav > div:nth-of-type(2) br-select-pnip div.br-list").map(l => cs(l, ["box-shadow","display"])))`);
  await ctx.close();
  // filtro escolhido (sequência da F, sem a ida e volta)
  ({ ctx, pg } = await carregar(base));
  await pg.click(TAG_ABERTO_HA); await pg.waitForSelector(ITEM_FILTRO);
  await pg.click(`${ITEM_FILTRO}:nth-child(3) .br-radio`); await pg.waitForSelector(TAG_ESCOLHIDA); await pg.waitForTimeout(1000);
  r.tagEscolhida = await pg.evaluate(PRE + `(qa(${JSON.stringify(TAG_ESCOLHIDA)}).map(t => ({ t: t.textContent.trim(), filhos: [...t.children].map(c => c.tagName + "." + c.className), botao: t.querySelector("button") ? { classe: t.querySelector("button").className, ...caixa(t.querySelector("button")), ...cs(t.querySelector("button"), ["border-top-left-radius","background-color","border-top-style","border-top-width","color"]) } : null })))`);
  r.linhas = await pg.evaluate(() => document.querySelectorAll("main .br-table tbody tr").length);
  await ctx.close();
  out[nome] = r;
}
await browser.close();
writeFileSync(join(AQUI, "sonda.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out, null, 1));
