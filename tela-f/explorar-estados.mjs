/**
 * Tela F — exploração das paradas novas no build SEM SEMENTE (.tmp-eval/pnip-f-sem-semente), sem modelo, sem oráculo,
 * sem axe. Pergunta: as paradas que as specs semeadas precisam (lista de um filtro aberta; filtro escolhido) cabem numa
 * sequência de setup aditiva, mantendo intactas as duas paradas da D?
 *  1. por opção de cada filtro: escolher a opção mantém as mesmas linhas da tabela? (aditividade num segmento só)
 *  2. caminho com navegação: processos → (path) vistorias → (path) processos; documento sem recarga, pedidos sem fixture,
 *     erros; a árvore depois de voltar é a de uma entrada direta?
 * Uso: node tela-f/explorar-estados.mjs → tela-f/explorar-estados.json
 */
import { createRequire } from "module";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { writeFileSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire("F:/Dev Nath/TCC/govbr-eval/package.json")("playwright");
const RAIZ = "F:/Dev Nath/TCC/.tmp-eval/pnip-f-sem-semente";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject" };
const srv = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/assets/images/exit-icon.png") p = "/pnip-f/assets/images/exit-icon.png";
    else if (p.startsWith("/pnip-f/") && !extname(p)) p = "/pnip-f/index.html";
    if (!p.startsWith("/pnip-f/") || p === "/pnip-f/manifesto.json") throw 0;
    const corpo = await readFile(join(RAIZ, p.slice("/pnip-f/".length)));
    res.writeHead(200, { "content-type": TIPOS[extname(p).toLowerCase()] ?? "application/octet-stream" }).end(corpo);
  } catch { res.writeHead(404).end(); }
});
await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
const BASE = `http://127.0.0.1:${srv.address().port}`;
const ENTRADA = "/pnip-f/portal-mpa/processos?mock-perfil=mpa";
const WAIT = "main .br-table tbody tr";
const TAGS = "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1 > span.br-tag";

const browser = await chromium.launch();
const nova = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const pg = await ctx.newPage();
  const erros = [], externos = [];
  pg.on("pageerror", e => erros.push(String(e)));
  pg.on("request", r => { if (!r.url().startsWith(BASE)) externos.push(r.url()); });
  await pg.goto(BASE + ENTRADA, { waitUntil: "networkidle" });
  await pg.waitForSelector(WAIT, { timeout: 15000 });
  await pg.waitForTimeout(500);
  return { ctx, pg, erros, externos };
};
const linhas = pg => pg.$$eval("main .br-table tbody tr td:nth-of-type(3) a", as => as.map(a => a.textContent.trim()));
const mock = pg => pg.evaluate(() => ({ naoMockados: window.__pnipMock?.naoMockados?.() ?? null }));
const contagens = pg => pg.evaluate(() => {
  const q = s => document.querySelectorAll(s).length;
  return { tagsInteraction: q("pnip-mpa-processos .br-tag.interaction"), linhas: q("main .br-table tbody tr"), listaFiltro: q("pnip-multiple-search-table-utils div.br-select > div.br-list"),
    tagSelecionada: q("pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction"), itensExibir: q("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item") };
});
const assinatura = pg => pg.evaluate(() => {
  const out = [];
  const anda = (raiz, pref) => { for (const e of raiz.querySelectorAll("*")) { if (e.closest("head")) continue; const cs = getComputedStyle(e); out.push(`${pref}${e.tagName.toLowerCase()}.${[...e.classList].sort().join(".")}|${cs.display === "none" || cs.visibility === "hidden" ? "h" : "v"}|${e.children.length ? "" : (e.textContent || "").trim().slice(0, 40)}`); if (e.shadowRoot) anda(e.shadowRoot, pref + ">>"); } };
  anda(document.body, "");
  return out;
});

const resultado = { base: RAIZ, entrada: ENTRADA, opcoes: [], navegacao: null };
// 1. opções dos filtros
{
  const { ctx, pg } = await nova();
  const base = await linhas(pg);
  resultado.linhasIniciais = base;
  resultado.contagensIniciais = await contagens(pg);
  const nTags = await pg.$$eval(TAGS, x => x.length);
  await ctx.close();
  for (let t = 0; t < nTags; t++) {
    const s = await nova();
    await s.pg.click(`${TAGS} >> nth=${t}`);
    await s.pg.waitForSelector("pnip-multiple-search-table-utils div.br-select .br-item");
    const rotulo = await s.pg.$eval(`${TAGS} >> nth=${t}`, e => e.textContent.trim()).catch(() => null);
    const nOp = await s.pg.$$eval("pnip-multiple-search-table-utils div.br-select .br-item", x => x.map(i => i.textContent.trim()));
    await s.ctx.close();
    for (let o = 0; o < nOp.length; o++) {
      const u = await nova();
      await u.pg.click(`${TAGS} >> nth=${t}`);
      await u.pg.waitForSelector("pnip-multiple-search-table-utils div.br-select .br-item");
      await u.pg.click(`pnip-multiple-search-table-utils div.br-select .br-item >> nth=${o} >> .br-radio`);
      await u.pg.waitForSelector("pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction");
      await u.pg.waitForTimeout(800);
      const l = await linhas(u.pg);
      resultado.opcoes.push({ filtro: t, rotulo, opcao: nOp[o], linhas: l.length, mesmasLinhas: JSON.stringify(l) === JSON.stringify(base), contagens: await contagens(u.pg), erros: u.erros.length, mock: await mock(u.pg) });
      await u.ctx.close();
    }
  }
}
// 2. navegação ida e volta
{
  const s = await nova();
  const marca = await s.pg.evaluate(() => (window.__m = Math.random()));
  await s.pg.click("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total");
  await s.pg.waitForSelector("govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item");
  const nav = async path => { await s.pg.evaluate(p => { history.pushState(null, "", p); dispatchEvent(new PopStateEvent("popstate", { state: null })); }, path); };
  await nav("/pnip-f/portal-mpa/vistorias");
  let vist = null;
  try { await s.pg.waitForSelector("main .br-table tbody tr", { timeout: 10000 }); await s.pg.waitForTimeout(600); vist = { path: new URL(s.pg.url()).pathname, h2: await s.pg.$eval("main h2", e => e.textContent.trim()).catch(() => null) }; } catch (e) { vist = { erro: String(e) }; }
  await nav("/pnip-f/portal-mpa/processos");
  await s.pg.waitForSelector("pnip-mpa-processos " + "main .br-table tbody tr".replace("main ", ""), { timeout: 10000 }).catch(() => {});
  await s.pg.waitForSelector(WAIT, { timeout: 10000 });
  await s.pg.waitForTimeout(800);
  const volta = { path: new URL(s.pg.url()).pathname, mesmaPagina: (await s.pg.evaluate(() => window.__m)) === marca, linhas: await linhas(s.pg), contagens: await contagens(s.pg) };
  const aNav = await assinatura(s.pg);
  // filtro escolhido e lista do filtro de novo
  await s.pg.click(`${TAGS} >> nth=1`);
  await s.pg.waitForSelector("pnip-multiple-search-table-utils div.br-select .br-item");
  await s.pg.click("pnip-multiple-search-table-utils div.br-select .br-item >> nth=0 >> .br-radio");
  await s.pg.waitForSelector("pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction");
  await s.pg.waitForTimeout(800);
  const escolhido = await contagens(s.pg);
  await s.pg.click(`${TAGS} >> nth=1`);
  await s.pg.waitForSelector("pnip-multiple-search-table-utils div.br-select .br-item");
  await s.pg.waitForTimeout(500);
  const listaDeNovo = await contagens(s.pg);
  const errosNav = s.erros.length, mockNav = await mock(s.pg);
  await s.ctx.close();
  const d = await nova();
  const aDir = await assinatura(d.pg);
  await d.ctx.close();
  const so = (a, b) => a.filter(x => !b.includes(x));
  resultado.navegacao = { vistorias: vist, volta, escolhido, listaDeNovo, erros: errosNav, mock: mockNav,
    arvoreNavegadaVsDireta: { navegada: aNav.length, direta: aDir.length, soNaNavegada: so(aNav, aDir).slice(0, 20), soNaDireta: so(aDir, aNav).slice(0, 20) } };
}
await browser.close();
srv.close();
writeFileSync(join(AQUI, "explorar-estados.json"), JSON.stringify(resultado, null, 1) + "\n");
console.log(JSON.stringify({ linhas: resultado.linhasIniciais.length, contagens: resultado.contagensIniciais,
  opcoesQueMantem: resultado.opcoes.filter(o => o.mesmasLinhas).map(o => `${o.rotulo}:${o.opcao}`), totalOpcoes: resultado.opcoes.length, navegacao: resultado.navegacao }, null, 1));
