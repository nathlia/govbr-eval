/**
 * E7 do derivado 1.1.0 (plano NAT-74 §5 E7, §11 item 3): as medidas mecânicas da fila T2 — R2 (nome calculado)
 * e R4 (declaração de estilo: quem escreve e se o valor está na escala de tokens do DS) — na tela B congelada.
 *
 *   npm run reanalise:nat74:t2-medir -- [--saida PASTA_DO_DERIVADO_1.1.0]
 *
 * Sem modelo, sem rede (só 127.0.0.1), Playwright headless 1280×900, receitas fixas ANTES de classificar. A medida é
 * por ALVO (elemento + receita), nunca por cartão: o braço não entra (P9). Os cartões são ligados aos alvos depois,
 * só pelo próprio texto (regra, seletor, observado), em `vereditoT2`.
 *
 * Reuso da NAT-73 (`origem/sondas-runtime.mjs`, que não exporta as funções): mesmo servidor do site congelado
 * (roteamento do site-manifest: SPA em /pnip/ + alias), mesmo bloqueio de rede, mesma "regra vencedora" por CDP
 * (CSS.getMatchedStylesForNode), mesma regra de origem do `medir-origem.mjs` (R2: escrito literalmente nos bytes
 * da página → pagina; declaração da folha oficial do DS não sobrescrita → ds-entregue; falha → indeterminada).
 * A saída não tem carimbo de tempo: duas medidas dão o mesmo arquivo byte a byte.
 */
import { readdirSync, readFileSync, statSync, existsSync, createReadStream } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, relative } from "node:path";
import { TCC, gravar, jsonTexto, posix, raizSaida, sha, shaArquivo } from "./comum";
import { normalizarRegra } from "./politica";
import type { Norma, VereditoAtomo } from "./vereditos";

const req = createRequire(import.meta.url);
export const T2_VERSAO = "nat74-medidas-t2-1.0.0";
export const SITE_SHA = "7438081cbc1d27f7a591dbe6e85d0d745fe3b84658f1e8c268c03737d10f5227";
export const SITE_DIR = join(TCC, "govbr-resultados", "sites", SITE_SHA, "site");
/** DS usado pela tela B (core 3.4.1, D-129): a folha oficial e a escala de tokens vêm daqui. */
export const DS341_CSS = join(TCC, "pnip-mock", "node_modules", "@govbr-ds", "core", "dist", "core.min.css");
export const ENTRADA_TELA_B = "/pnip/portal-mpa/vistorias?mock-perfil=mpa";
export const CAMINHO_MEDIDAS_T2 = "medidas/t2/medidas-t2.json";

// ───────────────────────────────────────────────────────────────── tipos

export interface AlvoNome { receita: string[]; seletor: string; alcancado: boolean;
  /** `nome` = nome calculado bruto; `nomeUtil` = sem caracteres de uso privado (glifo de fonte de ícone) e sem espaços. */
  elementos: { papel: string | null; nome: string; codigos: string[]; nomeUtil: string; outer: string }[]; todosSemNome: boolean | null }
/** Glifos de fonte de ícone (Font Awesome) entram no nome calculado como caracteres de uso privado; não são nome. */
export const nomeUtil = (n: string): string => n.replace(/\p{Co}/gu, "").trim();
export interface Trecho { arquivo: string; sha256: string; trecho: string }
export interface AlvoEstilo {
  receita: string[]; seletor: string; propriedade: string; alcancado: boolean;
  computado: string | null; atributoStyle: string | null;
  vencedora: { seletor: string; valor: string; origem: string; folha: string | null } | null;
  /** O literal da declaração nos bytes da página (bundle congelado) e na folha oficial do DS 3.4.1. */
  literalNaPagina: Trecho[]; literalNoDS: number;
  /** Estado sem a receita (página recém-aberta): o elemento existe e é visível? (R10) */
  semReceita?: { presente: boolean; visivel: boolean };
  /** Valor em px comparado com a escala de tokens do DS 3.4.1 (custom properties de :root da core.min.css). */
  valorPx: number | null; naEscala: boolean | null; escala: string[];
}
export interface MedidasT2 {
  formato: string; ferramenta: { playwright: string; chromium: string; node: string; headless: true; viewport: "1280x900" };
  site: { sha256: string; manifesto: string }; ds: { versao: "3.4.1"; css: string; sha256: string };
  regras: Record<string, string>;
  nomes: { chipFiltro: AlvoNome; chipData: AlvoNome; selectAtribuir: AlvoNome };
  estilos: { sairRaio: AlvoEstilo; limparMargem: AlvoEstilo; buscarMargem: AlvoEstilo };
  origem: { chips: { origem: string; trechos: Trecho[]; quemEscreve: string }; selectAtribuir: { origem: string; trechos: Trecho[]; quemEscreve: string } };
}

export const REGRAS_T2: Record<string, string> = {
  "R2-alvo": "alegação de AUSÊNCIA de nome (regex fixa sobre o observado; papel/estado não contam) ligada a um alvo pelo próprio texto: #swal2-select → selectAtribuir; .br-tag + chip de filtro (painel/filtro aplicado/cidade) → chipFiltro; .br-tag + chip de data (Exibindo vistorias/data/período) → chipData",
  "R2-fato": "nome calculado pelo Chromium (CDP Accessibility.getPartialAXTree), sem os caracteres de uso privado (Unicode Co, U+E000–U+F8FF) (glifo de fonte de ícone, ex.: fa-times sem aria-hidden dá U+F00D) e sem espaços, vazio em TODOS os elementos do alvo → fato verdadeiro e a norma de nome (4.1.2 / button-name / select-name) aplicável e violada; algum nome não vazio → erro normativo (R2, D-113); alvo não alcançado → sem decisão",
  "R4-alvo": "regra de token citada + alvo pelo texto: token-radius + avatar-menu/Sair → sairRaio; token-spacing + Limpar/pnip-filter-panel → limparMargem; token-spacing + Buscar/search → buscarMargem",
  "R4-fato": "o valor alegado (px) tem de ser o computado; diferente → erro factual (R1)",
  "R10": "estado declarado: o raio do Sair só aparece com o menu do avatar aberto; cartão cuja cena não é a do menu aberto (detalhe-menu) → evidência indisponível (R10; é o exemplo da própria política, C-96b5c3b1)",
  "R4-norma": "declaração vencedora (CDP) ou atributo style escrito literalmente nos bytes da página e ausente da folha oficial do DS → origem pagina e a regra de token se aplica (R4/D-52); valor fora da escala do DS 3.4.1 → violada; declaração da folha oficial do DS → ds-entregue e erro normativo (R4)",
  "origem": "medir-origem.mjs (NAT-73) R2: escrito literalmente nos bytes da página → pagina (biblioteca de terceiros empacotada pela página conta como página: não é o DS); não achado → indeterminada",
  "sem-decisao": "o que a medida não fecha (alegação que não é de nome ausente, alvo não identificado ou não alcançado) não ganha veredito: vai à T3",
};

// ───────────────────────────────────────────────────────────────── servidor do site congelado (port de sondas-runtime.mjs)

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".ico": "image/x-icon" };

function servir(raiz: string, rot: { spa: { prefix: string; index: string }; aliases: Record<string, string> }): Promise<{ srv: http.Server; base: string }> {
  const srv = http.createServer((rq, rs) => {
    let p = decodeURIComponent(new URL(rq.url ?? "/", "http://x").pathname);
    if (rot.aliases[p]) p = "/" + rot.aliases[p];
    let f = join(raiz, p);
    if (!normalize(f).startsWith(normalize(raiz))) { rs.writeHead(403); rs.end(); return; }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f) && p.startsWith(rot.spa.prefix)) f = join(raiz, rot.spa.index);
    if (!existsSync(f)) { rs.writeHead(404); rs.end(); return; }
    rs.writeHead(200, { "content-type": MIME[extname(f).toLowerCase()] ?? "application/octet-stream" });
    createReadStream(f).pipe(rs);
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, base: `http://127.0.0.1:${(srv.address() as { port: number }).port}` })));
}

// ───────────────────────────────────────────────────────────────── bytes da página e do DS

/** Escala de tokens do DS 3.4.1: espaçamento e raio (custom properties de :root), em px. */
export function escalaDS(css: string): { espacamento: number[]; raio: string[] } {
  const props = [...css.matchAll(/--(spacing-scale-[a-z0-9]+|surface-rounder-[a-z]+):\s*([^;}]+)/g)].map(m => [m[1], m[2].trim()] as const);
  const px = (v: string) => (v === "0" ? 0 : /^-?\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : null);
  const espacamento = [...new Set(props.filter(([k]) => k.startsWith("spacing")).map(([, v]) => px(v)).filter((x): x is number => x !== null))].sort((a, b) => a - b);
  const raio = [...new Set(props.filter(([k]) => k.startsWith("surface")).map(([, v]) => v))].sort();
  return { espacamento, raio };
}

function arquivosDaPagina(): string[] {
  const d = join(SITE_DIR, "pnip");
  return readdirSync(d).filter(f => /\.(js|css)$/.test(f)).sort().map(f => join(d, f));
}
function literal(re: RegExp): Trecho[] {
  const out: Trecho[] = [];
  for (const f of arquivosDaPagina()) {
    const t = readFileSync(f, "utf8");
    const m = re.exec(t);
    if (m) out.push({ arquivo: posix(relative(TCC, f)), sha256: shaArquivo(f), trecho: t.slice(Math.max(0, m.index - 80), m.index + m[0].length + 60) });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────── medida (Playwright)

type Page = import("playwright").Page;

async function nomes(page: Page, seletor: string): Promise<AlvoNome["elementos"]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("Accessibility.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: seletor });
  const out: AlvoNome["elementos"] = [];
  for (const nodeId of nodeIds) {
    const ax = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
    const n = ax.nodes[0] as { role?: { value: string }; name?: { value: string } };
    const { outerHTML } = await cdp.send("DOM.getOuterHTML", { nodeId });
    const nome = n.name?.value ?? "";
    out.push({ papel: n.role?.value ?? null, nome, codigos: [...nome].map(ch => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")), nomeUtil: nomeUtil(nome), outer: outerHTML.replace(/_ng(content|host)-[a-z0-9]+-c\d+(="")?/g, "").replace(/\s+/g, " ").slice(0, 220) });
  }
  await cdp.detach();
  return out;
}

/** Regra vencedora de uma propriedade (port de `regraVencedora` da NAT-73): última declaração casada não desativada. */
async function vencedora(page: Page, seletor: string, prop: string): Promise<AlvoEstilo["vencedora"]> {
  const cdp = await page.context().newCDPSession(page);
  const folhas: Record<string, string> = {};
  cdp.on("CSS.styleSheetAdded", (e: { header: { styleSheetId: string; sourceURL: string } }) => { folhas[e.header.styleSheetId] = e.header.sourceURL; });
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: seletor });
  if (!nodeId) { await cdp.detach(); return null; }
  const m = await cdp.send("CSS.getMatchedStylesForNode", { nodeId }) as { inlineStyle?: { cssProperties: { name: string; value: string; disabled?: boolean }[] };
    matchedCSSRules?: { rule: { selectorList: { text: string }; origin: string; styleSheetId?: string; style: { cssProperties: { name: string; value: string; disabled?: boolean }[] } } }[] };
  let v: AlvoEstilo["vencedora"] = null;
  for (const r of m.matchedCSSRules ?? []) {
    const d = r.rule.style.cssProperties.find(x => x.name === prop && !x.disabled && x.value);
    // Os atributos de escopo do Angular (_ngcontent-xyz-c16) são sorteados a cada carga: normalizados (determinismo).
    if (d) v = { seletor: r.rule.selectorList.text.replace(/_ng(content|host)-[a-z0-9]+-(c\d+)/g, "_ng$1-%ID%-$2"), valor: d.value, origem: r.rule.origin, folha: r.rule.styleSheetId ? folhas[r.rule.styleSheetId] ?? "" : null };
  }
  const inl = m.inlineStyle?.cssProperties.find(x => x.name === prop && !x.disabled && x.value);
  if (inl) v = { seletor: "[atributo style]", valor: inl.value, origem: "inline", folha: null };
  await cdp.detach();
  if (v?.folha !== undefined && v.folha !== null) v.folha = v.folha.replace(/^https?:\/\/127\.0\.0\.1:\d+/, "");
  return v;
}

async function estilo(page: Page, receita: string[], seletor: string, prop: string, literalRe: RegExp, ds: string, escala: { espacamento: number[]; raio: string[] }): Promise<AlvoEstilo> {
  const el = await page.$(seletor);
  const base: AlvoEstilo = { receita, seletor, propriedade: prop, alcancado: !!el, computado: null, atributoStyle: null, vencedora: null, literalNaPagina: [], literalNoDS: 0,
    valorPx: null, naEscala: null, escala: prop.includes("radius") ? escala.raio : escala.espacamento.map(x => `${x}px`) };
  if (!el) return base;
  const css = prop.includes("radius") ? "border-top-left-radius" : prop;
  base.computado = await el.evaluate((e, p) => getComputedStyle(e as Element).getPropertyValue(p), css);
  base.atributoStyle = await el.getAttribute("style");
  base.vencedora = await vencedora(page, seletor, prop);
  base.literalNaPagina = literal(literalRe);
  base.literalNoDS = (ds.match(new RegExp(literalRe.source, "g")) ?? []).length;
  const v = base.vencedora?.valor ?? base.computado;
  const px = v && /^-?\d+(\.\d+)?px$/.test(v.trim()) ? parseFloat(v) : v === "0" ? 0 : null;
  base.valorPx = px;
  if (px !== null) base.naEscala = prop.includes("radius") ? escala.raio.some(r => r === `${px}px` || (px === 0 && r === "0")) : escala.espacamento.includes(px);
  return base;
}

export async function medirT2(): Promise<MedidasT2> {
  const { chromium } = req("playwright") as typeof import("playwright");
  const manifestoAbs = join(SITE_DIR, "..", "site-manifest.json");
  const rot = (JSON.parse(readFileSync(manifestoAbs, "utf8")) as { routing: { spa: { prefix: string; index: string }; aliases: Record<string, string> } }).routing;
  const ds = readFileSync(DS341_CSS, "utf8");
  const escala = escalaDS(ds);
  const site = await servir(SITE_DIR, rot);
  const browser = await chromium.launch({ headless: true });
  const abrir = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route("**/*", r => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
    const page = await ctx.newPage();
    await page.goto(site.base + ENTRADA_TELA_B);
    await page.waitForSelector("pnip-propesc-vistorias table tbody tr", { timeout: 45000 });
    await page.waitForTimeout(1500);
    return { ctx, page };
  };
  const vazio = (e: AlvoNome["elementos"]) => (e.length ? e.every(x => x.nomeUtil === "") : null);
  try {
    // chips: filtro "Cidade = Barra Nova" e data inicial 2026-03-25 (receitas fixas, as do próprio fluxo da tela)
    let { ctx, page } = await abrir();
    const rFiltro = ["abrir a tela", "clicar no filtro \"Cidade\"", "clicar na opção \"Barra Nova\""];
    await page.locator("pnip-filter-panel .br-tag", { hasText: "Cidade" }).click(); await page.waitForTimeout(500);
    await page.locator("pnip-filter-panel label", { hasText: "Barra Nova" }).first().click(); await page.waitForTimeout(800);
    const chipFiltroEl = await nomes(page, "pnip-filter-panel .br-tag button");
    const rData = [...rFiltro, "preencher a primeira data com 2026-03-25", "Tab"];
    await page.locator("pnip-propesc-vistorias br-input[type=\"date\"]").first().locator("input").fill("2026-03-25");
    await page.keyboard.press("Tab"); await page.waitForTimeout(800);
    const chipDataEl = await nomes(page, "pnip-propesc-vistorias .br-tag.interaction:not(pnip-filter-panel .br-tag) button");
    // estilos no estado inicial: Limpar Filtro e Buscar
    await ctx.close();
    ({ ctx, page } = await abrir());
    const limparMargem = await estilo(page, ["abrir a tela"], "pnip-filter-panel button.br-button.secondary", "margin-top", /"margin-top","-5px"|margin-top:\s*-5px/, ds, escala);
    const buscarMargem = await estilo(page, ["abrir a tela"], "pnip-search-table-utils button[aria-label=\"Buscar\"]", "margin-top", /"margin-top","-38px"|margin-top:\s*-38px/, ds, escala);
    // menu do avatar aberto: Sair (antes, o estado sem a receita, para a R10)
    const semReceita = await page.evaluate(() => { const b = document.querySelector("#avatar-menu > button") as HTMLElement | null;
      return { presente: !!b, visivel: !!b && b.getClientRects().length > 0 && getComputedStyle(b).visibility !== "hidden" }; });
    await page.click("#avatar-dropdown-trigger"); await page.waitForTimeout(400);
    const sairRaio = await estilo(page, ["abrir a tela", "clicar no avatar (#avatar-dropdown-trigger)"], "#avatar-menu > button", "border-radius", /\.dropdown-button\[_ngcontent-%COMP%\]\{[^}]*border-radius:20px|dropdown-button[^{}]*\{[^}]*border-radius:\s*20px/, ds, escala);
    await ctx.close();
    // diálogo "Atribuir vistoriador" da primeira linha
    ({ ctx, page } = await abrir());
    await page.locator("pnip-propesc-vistorias table tbody tr").first().locator("br-button[title=\"Atribuir vistoriador\"]").click();
    await page.waitForSelector("#swal2-select", { timeout: 10000 }).catch(() => null); await page.waitForTimeout(600);
    const selectEl = await nomes(page, "#swal2-select");
    await ctx.close();
    const versaoChromium = browser.version();
    return {
      formato: T2_VERSAO,
      ferramenta: { playwright: (req("playwright/package.json") as { version: string }).version, chromium: versaoChromium, node: process.version, headless: true, viewport: "1280x900" },
      site: { sha256: SITE_SHA, manifesto: shaArquivo(manifestoAbs) }, ds: { versao: "3.4.1", css: posix(relative(TCC, DS341_CSS)), sha256: sha(ds) },
      regras: REGRAS_T2,
      nomes: {
        chipFiltro: { receita: rFiltro, seletor: "pnip-filter-panel .br-tag button", alcancado: chipFiltroEl.length > 0, elementos: chipFiltroEl, todosSemNome: vazio(chipFiltroEl) },
        chipData: { receita: rData, seletor: "pnip-propesc-vistorias .br-tag.interaction:not(pnip-filter-panel .br-tag) button", alcancado: chipDataEl.length > 0, elementos: chipDataEl, todosSemNome: vazio(chipDataEl) },
        selectAtribuir: { receita: ["abrir a tela", "clicar em \"Atribuir vistoriador\" da primeira linha"], seletor: "#swal2-select", alcancado: selectEl.length > 0, elementos: selectEl, todosSemNome: vazio(selectEl) },
      },
      estilos: { sairRaio: { ...sairRaio, semReceita }, limparMargem, buscarMargem },
      origem: {
        chips: { origem: "", quemEscreve: "template da aplicação (Angular) escreve <button class=\"br-button inverted circle\"><i class=\"fas fa-times\"> sem nome", trechos: literal(/"br-button inverted circle"|"br-button","inverted","circle"|br-button inverted circle/) },
        selectAtribuir: { origem: "", quemEscreve: "SweetAlert2 empacotado no bundle da página cria o <select class=\"swal2-select\"> (biblioteca de terceiros, não o DS)", trechos: literal(/swal2-select/) },
      },
    };
  } finally { await browser.close(); site.srv.close(); }
}

/** Origem por medida (regra `origem`): achado nos bytes da página → pagina; senão indeterminada. */
export function fecharOrigem(m: MedidasT2): MedidasT2 {
  for (const k of ["chips", "selectAtribuir"] as const) m.origem[k].origem = m.origem[k].trechos.length ? "pagina" : "indeterminada";
  return m;
}

// ───────────────────────────────────────────────────────────────── ligação cartão → alvo e veredito por medida

/** O que a ligação lê do cartão: só o próprio texto (P9: sem braço, run, campanha). */
export interface CartaoT2 { regra: string | null; seletor: string | null; observado: string; sujeitos: string[]; familia: string;
  /** Cenas do cartão (a do cartão e as dos sujeitos), para o estado declarado (R10). */
  cenas: string[] }

const AUSENCIA_DE_NOME = /(sem|n[ãa]o t[eê]m?|nem)\s+(nome|label|r[óo]tulo|aria-label|texto)|nome acess[ií]vel( fica)?\s*(vazio|v\b)|sem nome|n[ãa]o tem nome/i;
const PAPEL_OU_ESTADO = /role=|aria-expanded|aria-controls|\bpapel\b|\bestado\b|data-target/i;

export type ResultadoT2 = { veredito: VereditoAtomo; alvo: string } | { pendente: string; alvo: string | null };

export function vereditoT2(c: CartaoT2, m: MedidasT2, fonte: string): ResultadoT2 {
  const txt = `${c.seletor ?? ""} ${c.sujeitos.join(" ")} ${c.observado}`;
  const regra = c.regra ? normalizarRegra(c.regra) : null;
  const ver = (alvo: string, parte: { verdadeFactual: string; norma: Norma | null; origem: string | null; classe: string }, rotulo: string): ResultadoT2 => ({ alvo, veredito: { cego: null, divergencias: [],
    vigente: { juiz: "medida", fonte: [fonte], caso: null, aposRevelacao: false, aposOrientacao: false, rotulo, partes: [{ parte: "o cartão inteiro", vinculo: null, forcaDoVeredito: "medido", ...parte }] } } });
  if (c.familia === "R2-nome") {
    if (!AUSENCIA_DE_NOME.test(c.observado) || PAPEL_OU_ESTADO.test(c.observado)) return { pendente: "R2 restrita à alegação de nome ausente; esta alega papel/estado", alvo: null };
    let alvos: (keyof MedidasT2["nomes"])[] = [];
    if (/swal2-select/.test(txt)) alvos = ["selectAtribuir"];
    else if (/br-tag/.test(txt)) {
      const data = /Exibindo vistorias|filtro de data|\bdata\b|per[ií]odo|\d{2}\/\d{2}\/\d{4}/i.test(c.observado);
      const filtro = /pnip-filter-panel|filtro aplicado|Barra Nova|Areia Branca|Vila do Farol|Cidade/i.test(txt);
      // O cartão que alega os dois chips juntos só é verdadeiro se os dois alvos estão sem nome.
      alvos = [...(filtro ? ["chipFiltro" as const] : []), ...(data ? ["chipData" as const] : [])];
    }
    if (!alvos.length) return { pendente: "alvo da medida de nome não identificado pelo texto do cartão", alvo: null };
    const alvo = alvos.join("+");
    const ms = alvos.map(k => m.nomes[k]);
    if (ms.some(x => !x.alcancado || x.todosSemNome === null)) return { pendente: `receita do alvo ${alvo} não alcançou o elemento`, alvo };
    const a = { todosSemNome: ms.every(x => x.todosSemNome), elementos: ms.flatMap(x => x.elementos) };
    const origem = alvos[0] === "selectAtribuir" ? m.origem.selectAtribuir.origem : m.origem.chips.origem;
    const norma = (violada: string): Norma => ({ id: regra ?? "wcag:4.1.2", forca: "obrigatorio", aplicabilidade: "aplica", violada });
    if (a.todosSemNome) return ver(alvo, { verdadeFactual: "verdadeira", norma: norma("sim"), origem, classe: "violacao-pagina" },
      `medida (R2, nome calculado vazio em ${a.elementos.length} elemento(s) do alvo ${alvo})`);
    return ver(alvo, { verdadeFactual: "verdadeira", norma: norma("nao"), origem: null, classe: "erro-normativo" }, `medida (R2: nome calculado não vazio no alvo ${alvo})`);
  }
  if (c.familia === "R4-token") {
    let alvo: keyof MedidasT2["estilos"] | null = null;
    if (/token-radius/.test(regra ?? "") && /avatar-menu|Sair/i.test(txt)) alvo = "sairRaio";
    else if (/token-spacing/.test(regra ?? "") && /Limpar|pnip-filter-panel/i.test(txt)) alvo = "limparMargem";
    else if (/token-spacing/.test(regra ?? "") && /Buscar|search/i.test(txt)) alvo = "buscarMargem";
    if (!alvo) return { pendente: "alvo da medida de estilo não identificado pelo texto do cartão", alvo: null };
    const a = m.estilos[alvo];
    if (!a.alcancado || a.valorPx === null) return { pendente: `receita do alvo ${alvo} não mediu o valor`, alvo };
    if (alvo === "sairRaio" && !c.cenas.some(x => /detalhe-menu/.test(x)) && !a.semReceita?.visivel)
      return ver(alvo, { verdadeFactual: "indisponivel", norma: null, origem: null, classe: "evidencia-indisponivel" }, "medida (R10: o Sair só existe visível com o menu do avatar aberto; a cena do cartão não é essa)");
    const alegado = [...c.observado.matchAll(/(-?\d+)\s*px/g)].map(x => parseFloat(x[1]));
    const norma = (aplicabilidade: string, violada: string): Norma => ({ id: regra!, forca: "obrigatorio", aplicabilidade, violada });
    if (!alegado.includes(a.valorPx)) return ver(alvo, { verdadeFactual: "falsa", norma: null, origem: null, classe: "erro-factual" }, `medida (R1: valor medido ${a.valorPx}px ≠ alegado)`);
    const naPagina = a.literalNaPagina.length > 0 && a.literalNoDS === 0;
    const doDS = a.vencedora?.origem === "regular" && !!a.vencedora.folha && a.literalNoDS > 0 && !a.literalNaPagina.length;
    if (doDS) return ver(alvo, { verdadeFactual: "verdadeira", norma: norma("nao-aplica", "nao"), origem: "ds-entregue", classe: "erro-normativo" }, "medida (R4: declaração da folha oficial do DS)");
    if (!naPagina) return { pendente: `origem da declaração do alvo ${alvo} não medida (nem só na página, nem só no DS)`, alvo };
    if (a.naEscala) return ver(alvo, { verdadeFactual: "verdadeira", norma: norma("aplica", "nao"), origem: "pagina", classe: "erro-normativo" }, `medida (R4: ${a.valorPx}px está na escala do DS)`);
    return ver(alvo, { verdadeFactual: "verdadeira", norma: norma("aplica", "sim"), origem: "pagina", classe: "violacao-pagina" },
      `medida (R4: ${a.valorPx}px escrito pela página, fora da escala do DS 3.4.1)`);
  }
  return { pendente: "família fora da T2", alvo: null };
}

if (process.argv[1] && /t2\.ts$/.test(process.argv[1])) {
  const i = process.argv.indexOf("--saida");
  const raiz = i > 0 ? raizSaida() : join(TCC, "govbr-resultados", "derivados", "nat74-retrospectiva", "1.1.0");
  medirT2().then(m => {
    const t = jsonTexto(fecharOrigem(m));
    gravar(raiz, CAMINHO_MEDIDAS_T2, t);
    console.log(`T2 medido → ${CAMINHO_MEDIDAS_T2} (sha256 ${sha(t)})`);
    for (const [k, v] of Object.entries(m.nomes)) console.log(`  ${k}: alcançado ${v.alcancado}, ${v.elementos.length} elemento(s), todos sem nome: ${v.todosSemNome}`);
    for (const [k, v] of Object.entries(m.estilos)) console.log(`  ${k}: ${v.computado} (vencedora ${v.vencedora?.origem} ${v.vencedora?.valor}); na página ${v.literalNaPagina.length}, no DS ${v.literalNoDS}; na escala ${v.naEscala}`);
    console.log(`  origem: chips ${m.origem.chips.origem}, select ${m.origem.selectAtribuir.origem}`);
  }).catch(e => { console.error(e); process.exit(1); });
}
