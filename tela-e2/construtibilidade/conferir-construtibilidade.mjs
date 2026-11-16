// Conferência de construtibilidade da E2 (metodo.md § 4.5), sem oráculo, sem axe, sem validator: página de rascunho
// (site/base.html) com o @govbr-ds/core 3.7.0 (govbr-corpus/node_modules), Rawline e Font Awesome locais, medida em
// Chromium headless 1280×900. Confere que a página conforme é construível nos pontos sinalizados: estados S0/S1/S2
// alcançáveis pelos gatilhos declarados, e os mecanismos do core em que variantes de comportamento se apoiam.
// Uso: node tela-e2/construtibilidade/conferir-construtibilidade.mjs tela-e2/construtibilidade/resultado.json
import { createServer } from "http";
import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "site");
const TCC = "F:/Dev Nath/TCC";
const require = createRequire(join(HERE, "../../package.json"));
const { chromium } = require("playwright");
const MOUNTS = {
  "/core/": join(TCC, "govbr-corpus/node_modules/@govbr-ds/core/dist/"),
  "/fa/": join(TCC, "govbr-corpus/node_modules/@fortawesome/fontawesome-free/"),
  "/rawline/": join(TCC, "govbr-corpus/dist/pnip/assets/mock/vendor/rawline/"),
};
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let file = null;
  for (const [m, dir] of Object.entries(MOUNTS)) if (url.startsWith(m)) file = join(dir, url.slice(m.length));
  if (!file) file = join(SITE, url);
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/base.html`;
const coreVersion = JSON.parse(readFileSync(join(TCC, "govbr-corpus/node_modules/@govbr-ds/core/package.json"), "utf8")).version;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const out = { core: coreVersion, checks: {} };
const ck = (k, ok, fato) => { out.checks[k] = { ok: !!ok, fato }; };
const nova = async () => { const p = await ctx.newPage(); const erros = []; p.on("pageerror", e => erros.push(String(e))); p.on("requestfailed", r => erros.push("falhou " + r.url())); await p.goto(URL0); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready); return { p, erros }; };

// S0
{ const { p, erros } = await nova();
  ck("S0-carga-sem-erro", erros.length === 0, erros);
  const fonte = await p.evaluate(() => [getComputedStyle(document.querySelector("h1")).fontFamily, document.fonts.check("16px Rawline")]);
  ck("rawline", /rawline/i.test(fonte[0]) && fonte[1], fonte);
  ck("S0-msg-erro-oculta", await p.evaluate(() => document.getElementById("msg-erro").hidden), null);
  // tab order: gatilho do select entra no Tab (decisão herdada da A2: sem tabindex=-1)
  const ordem = [];
  await p.focus("#continente"); await p.keyboard.press("Tab"); ordem.push(await p.evaluate(() => document.activeElement.id));
  ck("select-gatilho-no-tab", ordem[0] === "sel-gatilho", ordem);
  // switch: texto de estado (CSS attr data-enabled/data-disabled) e aria-checked mantido pela página
  const est = async () => p.evaluate(() => { const r = document.getElementById("swt-certificado"); const i = r.querySelector("input"); const d = r.querySelector(".switch-data"); return { textoEstado: d ? getComputedStyle(d, "::before").content : null, checked: i.checked, aria: i.getAttribute("aria-checked") }; });
  const e1 = await est(); await p.click("#swt-certificado label"); const e2 = await est();
  ck("switch-estado-imediato", e1.checked === false && e2.checked === true && e2.aria === "true" && e1.textoEstado === "\"Desligada\"" && e2.textoEstado === "\"Ligada\"", { antes: e1, depois: e2 });
  // message: Fechar remove; btn-ajuda volta a mostrar
  await p.click("#msg-orientacao-fechar"); await p.waitForTimeout(400);
  const fechou = await p.evaluate(() => { const m = document.getElementById("msg-orientacao"); return !m || !m.isConnected || getComputedStyle(m).display === "none"; });
  await p.click("#btn-ajuda"); await p.waitForTimeout(200);
  const voltou = await p.evaluate(() => { const m = document.getElementById("msg-orientacao"); return !!m && m.isConnected && getComputedStyle(m).display !== "none"; });
  ck("message-fechar-e-ajuda", fechou && voltou, { fechou, voltou });
  // radio: setas movem a escolha dentro do grupo
  await p.focus("#sit0"); await p.keyboard.press("Space"); await p.keyboard.press("ArrowDown");
  ck("radio-setas", await p.evaluate(() => document.activeElement.id === "sit1" && document.getElementById("sit1").checked), await p.evaluate(() => document.activeElement.id));
  // estado hover/foco de botão (mecanismo de feedback do core)
  const bg0 = await p.evaluate(() => getComputedStyle(document.getElementById("btn-limpar")).backgroundImage + "|" + getComputedStyle(document.getElementById("btn-limpar")).backgroundColor);
  await p.hover("#btn-limpar"); const bg1 = await p.evaluate(() => getComputedStyle(document.getElementById("btn-limpar")).backgroundImage + "|" + getComputedStyle(document.getElementById("btn-limpar")).backgroundColor);
  ck("botao-hover-muda", bg0 !== bg1, { bg0, bg1 });
  await p.focus("#btn-limpar"); const foco = await p.evaluate(() => { const s = getComputedStyle(document.getElementById("btn-limpar")); return s.outlineStyle + " " + s.outlineWidth + " " + s.outlineColor; });
  ck("botao-foco-visivel", !/none/.test(foco), foco);
  // lista: 4 itens, divisores
  ck("lista-itens", await p.evaluate(() => document.querySelectorAll("#lst-paises > .br-item").length === 4 && document.querySelectorAll("#lst-paises > .br-divider").length === 3), null);
  await p.close(); }
// S1
{ const { p } = await nova();
  await p.click("#btn-salvar"); await p.waitForTimeout(200);
  const s1 = await p.evaluate(() => ({ msg: !document.getElementById("msg-erro").hidden, nome: document.getElementById("inp-nome-pais").classList.contains("danger") && !document.getElementById("nome-pais-msg").hidden, cont: !document.getElementById("continente-msg").hidden, sit: !document.getElementById("situacao-msg").hidden, borda: getComputedStyle(document.getElementById("nome-pais")).borderColor }));
  ck("S1-alcancavel", s1.msg && s1.nome && s1.cont && s1.sit, s1);
  await p.close(); }
// S2
{ const { p } = await nova();
  const fechada = await p.evaluate(() => getComputedStyle(document.querySelector("#sel-continente .br-list")).display);
  await p.click("#sel-gatilho"); await p.waitForTimeout(300);
  const aberta = await p.evaluate(() => { const l = document.querySelector("#sel-continente .br-list"); return { display: getComputedStyle(l).display, expanded: l.hasAttribute("expanded"), itens: l.querySelectorAll(".br-item").length }; });
  ck("S2-alcancavel", fechada === "none" && aberta.display !== "none", { fechada, aberta });
  await p.click("label[for=ct1]"); await p.waitForTimeout(200);
  ck("select-simples-escolhe", await p.evaluate(() => document.getElementById("continente").value), await p.evaluate(() => document.getElementById("continente").value));
  await p.close(); }
await browser.close(); server.close();
const falhas = Object.entries(out.checks).filter(([, v]) => !v.ok).map(([k]) => k);
out.resumo = { checks: Object.keys(out.checks).length, ok: Object.keys(out.checks).length - falhas.length, falhas };
writeFileSync(process.argv[2] ?? join(HERE, "resultado.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out.resumo));
