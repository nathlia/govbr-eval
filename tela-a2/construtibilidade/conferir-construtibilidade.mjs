// Conferência de construtibilidade da A2 (plano § 13.4.1, Revisão Codex 2 bloqueio 4) — sem oráculo.
// Monta páginas de rascunho com @govbr-ds/core 3.7.0 (govbr-corpus/node_modules), Rawline e Font Awesome locais,
// e mede em Chromium headless 1280×900: a página conforme e cada variante elegível em questão.
// Uso: node tela-a2/construtibilidade/conferir-construtibilidade.mjs tela-a2/construtibilidade/resultado.json
import { createServer } from "http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "site");
const TCC = "F:/Dev Nath/TCC";
const require = createRequire(join(TCC, "govbr-eval/package.json"));
const { chromium } = require("playwright");
const MOUNTS = {
  "/core/": join(TCC, "govbr-corpus/node_modules/@govbr-ds/core/dist/"),
  "/fa/": join(TCC, "govbr-corpus/node_modules/@fortawesome/fontawesome-free/"),
  "/rawline/": join(TCC, "govbr-corpus/dist/pnip/assets/mock/vendor/rawline/"),
};
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
const pages = new Map();
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (pages.has(url)) { res.writeHead(200, { "content-type": TYPES[".html"] }); return res.end(pages.get(url)); }
  let file = null;
  for (const [m, dir] of Object.entries(MOUNTS)) if (url.startsWith(m)) file = join(dir, url.slice(m.length));
  if (!file) file = join(SITE, url);
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const BASE = readFileSync(join(SITE, "base.html"), "utf8");
const SELBTN = 'id="sel-gatilho"><i class="fas fa-angle-down" aria-hidden="true"></i></button>';
const SELTIP = `${SELBTN}\n    <div class="br-tooltip" role="tooltip" info="info" place="top" id="sel-dica"><span class="text" role="tooltip">Exibir lista</span></div>`;
const CONF = { "<!--SR1-->": '<span class="sr-only">, etapa concluída</span>', "<!--SMSCHILD-->": "avisos", [SELBTN]: SELTIP };
function build(name, swaps = {}) {
  let html = BASE;
  for (const [k, v] of Object.entries({ ...CONF, ...swaps })) html = html.split(k).join(v);
  html = html.replace(/<!--[A-Z0-9]+-->/g, "");
  pages.set(`/${name}.html`, html);
  return `${ORIGIN}/${name}.html`;
}

const browser = await chromium.launch({ headless: true });
const out = { _meta: { quando: new Date().toISOString(), core: JSON.parse(readFileSync(join(MOUNTS["/core/"], "../package.json"), "utf8")).version, playwright: require("playwright/package.json").version, viewport: "1280x900", nota: "Páginas de rascunho, não a tela construída. Nenhuma ferramenta do govbr-ds-validator nem axe." }, itens: {} };
async function open(url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errors };
}
const rec = (k, v) => { out.itens[k] = v; console.log(k, JSON.stringify(v).slice(0, 400)); };
const usedFont = async (page, sel) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  return fonts.map(f => f.familyName);
};
const axName = async (page, sel) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("Accessibility.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  const n = nodes[0];
  return { name: n?.name?.value ?? null, role: n?.role?.value ?? null, ignored: n?.ignored ?? null, checked: n?.properties?.find(p => p.name === "checked")?.value?.value ?? null };
};
const contrast = (a, b) => {
  const lum = c => { const [r, g, bl] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return +((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
};

// ---------- página conforme ----------
{
  const { ctx, page, errors } = await open(build("conforme"));
  const html = pages.get("/conforme.html");
  rec("erros-js-conforme", errors);
  // G1 Rawline
  rec("rawline-conforme", { fonteUsadaParagrafo: await usedFont(page, "#acc-duvidas .title"), fonteUsadaH1: await usedFont(page, "h1"), fontsCheck: await page.evaluate(() => document.fonts.check("16px Rawline")), familiaComputada: await page.evaluate(() => getComputedStyle(document.body).fontFamily) });
  // G4 style/script/link no HTML servido
  rec("estilo-script-conforme", {
    servido: { styleOuScriptEmbutido: (html.match(/<style[\s>]|<script(?![^>]*\ssrc=)[\s>]/g) ?? []).length, scriptComTypeOuLanguage: (html.match(/<script[^>]*\s(type|language)=/g) ?? []).length, linkComType: (html.match(/<link[^>]*\stype=/g) ?? []).length },
    emExecucao: await page.evaluate(() => ({ style: document.querySelectorAll("style").length, scriptSemSrc: document.querySelectorAll("script:not([src])").length })),
  });
  // G2 tooltip / gatilho
  const tip = {};
  tip.visivelNaCarga = await page.evaluate(() => [...document.querySelectorAll("#tip-prazo,#tip-protocolo")].map(t => getComputedStyle(t).display !== "none" && getComputedStyle(t).visibility !== "hidden" && t.offsetParent !== null));
  tip.nomeGatilho = await axName(page, "#tip-prazo-gatilho");
  tip.ariaLabelPresente = await page.getAttribute("#tip-prazo-gatilho", "aria-label");
  tip.labelledbyAponta = await page.evaluate(() => { const g = document.getElementById("tip-prazo-gatilho"); const id = g.getAttribute("aria-labelledby"); return Boolean(document.getElementById(id)?.closest(".br-tooltip")); });
  await page.keyboard.press("Tab"); // pula para o 1º focável
  await page.focus("#tip-prazo-gatilho");
  tip.focoAbre = await page.evaluate(() => { const t = document.getElementById("tip-prazo"); return t.hasAttribute("data-show") || getComputedStyle(t).display !== "none"; });
  await page.focus("#tip-protocolo-gatilho");
  tip.balaoesVisiveisDepoisDeTrocar = await page.evaluate(() => [...document.querySelectorAll("#tip-prazo,#tip-protocolo")].filter(t => t.hasAttribute("data-show")).length);
  tip.balaoFocavel = await page.evaluate(() => [...document.querySelectorAll(".br-tooltip, .br-tooltip *")].some(e => e.tabIndex >= 0 && (e.matches("a,button,input,[tabindex]"))));
  await page.mouse.move(5, 5); await page.evaluate(() => document.activeElement?.blur());
  // botões só de ícone com tooltip do rótulo (a2-be0b9ab18685): Fechar e gatilho do select
  await page.hover("#msg-pendencia-fechar");
  tip.fecharHoverMostraRotulo = await page.evaluate(() => document.getElementById("msg-pendencia-dica").hasAttribute("data-show"));
  await page.mouse.move(5, 5);
  await page.focus("#sel-gatilho");
  tip.gatilhoSelectFocoMostraRotulo = await page.evaluate(() => document.getElementById("sel-dica")?.hasAttribute("data-show") ?? null);
  rec("tooltip-gatilho-conforme", tip);
  // G3 select
  const sel = {};
  sel.tabindexGatilho = await page.evaluate(() => document.getElementById("sel-gatilho").tabIndex);
  await page.focus("#sel-campo");
  await page.keyboard.press("Tab");
  sel.tabDoCampoVaiAoGatilho = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press("Space");
  sel.spaceNoGatilhoAbre = await page.evaluate(() => document.querySelector("#sel-tipo-documento .br-list").hasAttribute("expanded") || getComputedStyle(document.querySelector("#sel-tipo-documento .br-list")).display !== "none");
  await page.keyboard.press("Escape");
  await page.focus("#sel-campo"); await page.keyboard.press("ArrowDown");
  sel.setaNoCampoAbre = await page.evaluate(() => document.querySelector("#sel-tipo-documento .br-list").hasAttribute("expanded"));
  await page.keyboard.press("ArrowDown");
  sel.setaMoveDestaque = await page.evaluate(() => document.activeElement?.closest(".br-item") ? document.activeElement.closest(".br-item").textContent.trim() : document.activeElement?.tagName);
  await page.keyboard.press("Enter");
  sel.enterEscolhe = await page.inputValue("#sel-campo");
  sel.dicaNaoQuebraSelect = sel.setaNoCampoAbre && Boolean(sel.enterEscolhe);
  rec("select-conforme", sel);
  // G5 switch e checkbox principal
  const sw = {};
  const swColor = () => page.evaluate(() => { const r0 = getComputedStyle(document.querySelector(".br-switch")); const on = r0.getPropertyValue("--on").trim(), off = r0.getPropertyValue("--off").trim(); const i = document.getElementById("swt-email"); const lab = i.nextElementSibling; const b = getComputedStyle(lab, "::before"), a = getComputedStyle(lab, "::after"); return { trilhoBefore: b.backgroundColor, chaveAfter: a.backgroundColor, bordaBefore: b.borderColor, tokenOn: on, tokenOff: off }; });
  const tokens = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return { "gray-20": s.getPropertyValue("--gray-20").trim(), "gray-40": s.getPropertyValue("--gray-40").trim(), "blue-warm-vivid-40": s.getPropertyValue("--blue-warm-vivid-40").trim(), "success": s.getPropertyValue("--success").trim(), "green-cool-vivid-50": s.getPropertyValue("--green-cool-vivid-50").trim(), "pure-0": s.getPropertyValue("--pure-0").trim() }; });
  sw.tokens = tokens;
  sw.desligado = await swColor();
  const st = () => page.evaluate(() => { const p = document.getElementById("chk-todos"); return { principal: p.indeterminate ? "intermediario" : p.checked ? "marcado" : "desmarcado", email: document.getElementById("swt-email").checked, sms: document.getElementById("swt-sms").checked, ariaEmail: document.getElementById("swt-email").getAttribute("aria-checked") }; });
  await page.click("label[for=swt-email]"); sw.soEmailLigado = await st(); await page.waitForTimeout(500); sw.ligado = await swColor();
  await page.click("label[for=swt-sms]"); sw.osDoisLigados = await st();
  await page.click("label[for=swt-email]"); sw.soSmsLigado = await st();
  await page.click("label[for=chk-todos]"); sw.principalNoIntermediarioClicado = await st();
  await page.click("label[for=chk-todos]"); sw.principalDesmarcado = await st();
  await page.focus("#swt-sms"); await page.keyboard.press("Space"); sw.spaceAlterna = await st();
  sw.axSwitch = await axName(page, "#swt-sms");
  sw.axPrincipal = await axName(page, "#chk-todos");
  rec("switch-grupo-conforme", sw);
  // G6 step / Tag
  const stp = await page.evaluate(() => {
    const b1 = document.getElementById("stp-1"), m = b1.querySelector(".step-alert"), ind = b1.getBoundingClientRect();
    const mr = m.getBoundingClientRect(), cs = getComputedStyle(m), ca = getComputedStyle(m, "::after");
    const b2 = document.getElementById("stp-2");
    return { marcadorFundo: cs.backgroundColor, marcadorAltura: mr.height, marcadorLargura: mr.width, raio: cs.borderRadius, alinhamento: cs.alignItems + "/" + cs.justifyContent, corIcone: cs.color, conteudoIcone: ca.content, tamanhoIcone: ca.fontSize, filhosNoMarcador: m.children.length,
      marcadorVsIndicador: { indTop: ind.top, indRight: ind.right, mTop: mr.top, mRight: mr.right, mCentroX: mr.left + mr.width / 2, mCentroY: mr.top + mr.height / 2 },
      ativo2: b2.getAttribute("aria-current") ?? b2.className, numero1: getComputedStyle(b1, "::before").content };
  });
  stp.nome1 = await axName(page, "#stp-1");
  stp.indicador = await page.evaluate(() => { const r = document.getElementById("stp-1"); const b = getComputedStyle(r, "::before"); return { w: b.width, h: b.height, top: b.top, left: b.left }; });
  stp.contrasteIconeSobreFundoBranco_casoVerde = contrast(`rgb(22, 136, 33)`, `rgb(255, 255, 255)`);
  rec("step-tag-conforme", stp);
  // accordion: parágrafo
  rec("paragrafo-conforme", await page.evaluate(() => { const p = document.querySelector("#acc-1 p"); const s = getComputedStyle(p); const r = getComputedStyle(document.documentElement); return { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, color: s.color, upOne: r.getPropertyValue("--font-size-scale-up-01").trim(), base: r.getPropertyValue("--font-size-scale-base").trim() }; }));
  await ctx.close();
}

// ---------- variantes ----------
async function variant(key, swaps, fn) {
  const { ctx, page, errors } = await open(build(key, swaps));
  const r = await fn(page, pages.get(`/${key}.html`));
  rec(key, { ...r, errosJs: errors });
  await ctx.close();
}
await variant("v-a2-a39f3ad397d4-fonte-do-sistema", { "<!--HEAD-->": "" , 'href="pagina.css">': 'href="pagina.css">\n<style>#acc-duvidas, #acc-duvidas *{font-family: system-ui, Arial, sans-serif}</style>' }, async page => ({ fonteUsada: await usedFont(page, "#acc-duvidas .title") }));
await variant("v-a2-6afb3201269f-estilo-embutido", { 'href="pagina.css">': 'href="pagina.css">\n<style>#crd-resumo{margin:16px 0}</style>' }, async (page, html) => ({ styleOuScriptEmbutido: (html.match(/<style[\s>]|<script(?![^>]*\ssrc=)[\s>]/g) ?? []).length }));
await variant("v-a2-81fd932c0990-gatilho-fora-do-tab", { "<!--SELTAB-->": ' tabindex="-1"' }, async page => { await page.focus("#sel-campo"); await page.keyboard.press("Tab"); return { focoDepoisDoCampo: await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName) }; });
await variant("v-a2-dc561d157556-sem-aria-label", { 'id="msg-pendencia-fechar" aria-label="Fechar"': 'id="msg-pendencia-fechar" title="Fechar"><span class="sr-only">Fechar</span' }, async page => ({ ariaLabel: await page.getAttribute("#msg-pendencia-fechar", "aria-label"), nome: await axName(page, "#msg-pendencia-fechar") }));
await variant("v-a2-615adba6e634-filho-com-grupo-errado-compensado", { "<!--SMSCHILD-->": "avisos-sms", "<!--BODYEND-->": '<script src="sync-sms.js"></script>' }, async page => {
  const st = () => page.evaluate(() => { const p = document.getElementById("chk-todos"); return { principal: p.indeterminate ? "intermediario" : p.checked ? "marcado" : "desmarcado", email: document.getElementById("swt-email").checked, sms: document.getElementById("swt-sms").checked }; });
  const r = {};
  r.dataChildSms = await page.getAttribute("#swt-sms", "data-child"); r.dataParent = await page.getAttribute("#chk-todos", "data-parent");
  await page.click("label[for=swt-email]"); r.soEmailLigado = await st();
  await page.click("label[for=swt-sms]"); r.osDoisLigados = await st();
  await page.click("label[for=swt-email]"); r.soSmsLigado = await st();
  await page.click("label[for=chk-todos]"); r.principalNoIntermediarioClicado = await st();
  await page.click("label[for=chk-todos]"); r.principalDesmarcado = await st();
  await page.focus("#swt-sms"); await page.keyboard.press("Space"); r.spaceAlternaSms = await st();
  await page.focus("#chk-todos"); await page.keyboard.press("Space"); r.spaceNoPrincipal = await st();
  r.axPrincipal = await axName(page, "#chk-todos");
  return r;
});
await variant("v-a2-615adba6e634-sem-compensacao", { "<!--SMSCHILD-->": "avisos-sms" }, async page => {
  const st = () => page.evaluate(() => { const p = document.getElementById("chk-todos"); return { principal: p.indeterminate ? "intermediario" : p.checked ? "marcado" : "desmarcado", email: document.getElementById("swt-email").checked, sms: document.getElementById("swt-sms").checked }; });
  await page.click("label[for=swt-sms]"); const soSms = await st();
  await page.click("label[for=chk-todos]"); const principal = await st();
  return { soSmsLigado: soSms, principalClicado: principal };
});
await variant("v-a2-7682991ef915-tag-sem-superficie", { 'href="pagina.css">': 'href="pagina.css">\n<link rel="stylesheet" href="v-tag-sem-superficie.css">' }, async page => page.evaluate(() => { const m = document.querySelector("#stp-1 .step-alert"); const cs = getComputedStyle(m), ca = getComputedStyle(m, "::after"); return { fundo: cs.backgroundColor, corIcone: cs.color, corAfter: ca.color }; }));
await variant("v-a2-3584b59ba47f-tag-em-duas-linhas", { "<!--MARCADOR-->": '<i class="fas fa-check" aria-hidden="true"></i>', 'href="pagina.css">': 'href="pagina.css">\n<link rel="stylesheet" href="v-tag-duas-linhas.css">' }, async page => page.evaluate(() => { const m = document.querySelector("#stp-1 .step-alert"); return { altura: m.getBoundingClientRect().height, icones: m.children.length + 1 }; }));
await variant("v-a2-86453e6d513e-concluido-so-visual", { "<!--SR1-->": "" }, async page => ({ nome1: await axName(page, "#stp-1") }));
await variant("v-a2-5f5d70c647f1-tag-com-fechar-markup", { "<!--MARCADOR-->": '<button class="br-button circle small" type="button" aria-label="Remover">x</button>' }, async page => page.evaluate(() => { const b1 = document.getElementById("stp-1"); return { botaoDentroDoMarcador: Boolean(b1.querySelector(".step-alert button")), botoesDeEtapa: document.querySelectorAll("#stp-andamento button.step-progress-btn").length, filhosDoProgress: [...document.querySelector("#stp-andamento .step-progress").children].map(c => c.tagName + "." + c.className).slice(0, 6) }; }));
await variant("v-a2-5f5d70c647f1-tag-com-fechar-dom", {}, async page => page.evaluate(() => { const m = document.querySelector("#stp-1 .step-alert"); const b = document.createElement("button"); b.className = "br-button circle small"; b.type = "button"; b.setAttribute("aria-label", "Remover"); b.textContent = "x"; m.appendChild(b); return { botaoAninhadoEmBotao: Boolean(b.parentElement.closest("button.step-progress-btn")), serializacaoReparseada: (() => { const d = new DOMParser().parseFromString(`<body>${document.getElementById("stp-1").outerHTML}</body>`, "text/html"); return d.querySelectorAll("button.step-progress-btn button").length; })() }; }));

await variant("x-core-sem-sync-aria-checked", { "<script src=\"init.js\"></script>": "<script src=\"init-sem-aria.js\"></script>" }, async page => { await page.click("label[for=swt-email]"); return { ariaCheckedAtributo: await page.getAttribute("#swt-email", "aria-checked"), ax: await axName(page, "#swt-email") }; });
await variant("v-a2-e9ded28efe9c-aria-checked-fixo", { "<!--BODYEND-->": "<script src=\"aria-fixo.js\"></script>" }, async page => { await page.click("label[for=swt-email]"); return { ariaCheckedAtributo: await page.getAttribute("#swt-email", "aria-checked"), ax: await axName(page, "#swt-email") }; });
await variant("x-message-instancia-e-fechar", {}, async page => { const tipos = await page.evaluate(() => ({ BRMessage: typeof window.core.BRMessage, BRAlert: typeof window.core.BRAlert })); await page.click("#msg-pendencia-fechar"); return { ...tipos, mensagemRemovidaAoFechar: await page.evaluate(() => !document.getElementById("msg-pendencia")) }; });
// e-MAG 2.3 / 2.4 — período reduzido só nesta conferência (5 s / 4 s); o mecanismo é o mesmo do protocolo (300 s / 600 s)
for (const [key, meta, wait] of [["v-a2-22240b8959ba-recarga-periodica", '<meta http-equiv="refresh" content="5">', 12000], ["v-a2-31b4a3f89649-redireciona-outra-pagina", '<meta http-equiv="refresh" content="4;url=outra.html">', 9000]]) {
  const url = build(key, { "<!--HEAD-->": meta });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const loads = []; page.on("load", () => loads.push({ t: Date.now(), url: page.url() }));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load" });
  // estado S1 medido dentro da janela segura logo depois da carga
  const s1 = await page.evaluate(() => { const i = document.getElementById("swt-email"); i.click(); return i.checked; });
  await page.waitForTimeout(wait);
  const finalUrl = page.url();
  const stillS1 = await page.evaluate(() => document.getElementById("swt-email")?.checked ?? null).catch(() => null);
  rec(key, { meta, cargas: loads.map(l => ({ seg: +((l.t - t0) / 1000).toFixed(1), caminho: new URL(l.url).pathname })), caminhoFinal: new URL(finalUrl).pathname, estadoS1LogoDepoisDaCarga: s1, estadoS1DepoisDaJanela: stillS1 });
  await ctx.close();
}
await browser.close();
server.close();
writeFileSync(process.argv[2], JSON.stringify(out, null, 2) + "\n");
console.log("gravado", process.argv[2]);
