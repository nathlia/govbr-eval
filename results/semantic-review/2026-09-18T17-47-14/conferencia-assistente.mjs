// Mede a tela congelada para conferir as alegações dos cartões. Nenhum modelo, nenhum oráculo.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";

const evalRoot = "F:/Dev Nath/TCC/govbr-eval";
const dist = "F:/Dev Nath/TCC/govbr-corpus/dist";
const { chromium } = await import(pathToFileURL(join(evalRoot, "node_modules/playwright/index.mjs")).href);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  const file = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(4398, "127.0.0.1", r));
const url = "http://127.0.0.1:4398/fluxo.html";
const browser = await chromium.launch();
const out = {};
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url); await page.waitForSelector("#cpf");

  out.skip = await page.evaluate(() => ({
    hashLinks: document.querySelectorAll('a[href^="#"]').length, skiplink: document.querySelectorAll(".br-skiplink").length,
    mainId: document.querySelector("main")?.id ?? null, links: [...document.querySelectorAll("a")].map(a => a.getAttribute("href")),
  }));
  await page.keyboard.press("Tab");
  out.firstFocus = await page.evaluate(() => document.activeElement.outerHTML.slice(0, 90));

  out.cpf = await page.evaluate(() => ({
    attrs: [...document.getElementById("cpf").attributes].map(a => `${a.name}=${a.value}`),
    small: document.querySelectorAll("small").length, describedby: document.querySelectorAll("[aria-describedby]").length,
    formText: document.querySelector("form").innerText.replace(/\s+/g, " "),
    helper: [...document.querySelectorAll("p,span,div")].filter(e => e.children.length === 0 && /Digite seu CPF para/.test(e.textContent)).map(e => e.outerHTML.slice(0, 140)),
    inputHasClass: document.getElementById("cpf").classList.contains("br-input"),
    wrapper: document.getElementById("cpf").closest("div.br-input")?.className ?? null,
  }));

  // foco nos links de opção, por teclado
  out.focus = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    out.focus.push(await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e);
      return { el: `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 40), text: e.textContent.trim().slice(0, 28), fv: e.matches(":focus-visible"),
        outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, shadow: s.boxShadow.slice(0, 40) }; }));
  }
  out.focusRule = await page.evaluate(() => [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch { return []; } })
    .filter(r => r.selectorText && /link-opcao.*focus/.test(r.selectorText)).map(r => r.cssText));

  // lista: semântica
  out.list = await page.evaluate(() => { const l = document.querySelector(".br-list"); return l ? { tag: l.tagName, role: l.getAttribute("role"),
    items: [...l.querySelectorAll(".br-item")].map(i => `${i.tagName}:${i.getAttribute("role")}`) } : null; });

  // padding e bordas
  out.padding = await page.evaluate(() => [...document.querySelectorAll(".opcao-identificacao")].map(e => getComputedStyle(e).padding));
  out.borders = await page.evaluate(() => [...document.querySelectorAll("*")].filter(e => { const s = getComputedStyle(e);
    return ["Top", "Right", "Bottom", "Left"].some(d => parseFloat(s[`border${d}Width`]) > 0 && s[`border${d}Color`] === "rgb(222, 226, 230)"); })
    .map(e => `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 50)));

  // '123' e CPF válido
  await page.fill("#cpf", "123"); await page.click(".acao-continuar"); await page.waitForTimeout(400);
  out.submit123 = await page.evaluate(() => ({ erro: document.querySelector(".mensagem-erro-cpf")?.textContent ?? null, url: location.pathname }));
  await page.fill("#cpf", ""); await page.click(".acao-continuar"); await page.waitForTimeout(400);
  out.vazio = await page.evaluate(() => { const p = document.querySelector(".mensagem-erro-cpf"), i = document.getElementById("cpf"); return {
    msg: p ? p.outerHTML : null, color: p ? getComputedStyle(p).color : null, invalid: i.getAttribute("aria-invalid"), describedby: i.getAttribute("aria-describedby"),
    live: document.querySelectorAll("[aria-live],[role=alert],[role=status]").length, active: document.activeElement.className, inputBorder: getComputedStyle(i).border }; });

  // botões inertes
  for (const nome of ["Alto Contraste", "VLibras"]) {
    const antes = await page.evaluate(() => document.documentElement.outerHTML);
    await page.getByRole("button", { name: nome }).click(); await page.waitForTimeout(400);
    out[`inerte:${nome}`] = antes === await page.evaluate(() => document.documentElement.outerHTML);
  }

  // 320
  for (const [w, h] of [[320, 720], [320, 800]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
    out[`w${w}x${h}`] = await page.evaluate(() => { const r = s => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? [Math.round(b.left), Math.round(b.right)] : null; };
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, barra: r(".barra-recursos"), libras: r(".recurso-libras"),
        wrap: getComputedStyle(document.querySelector(".barra-recursos")).flexWrap,
        padding: [...document.querySelectorAll(".opcao-identificacao")].map(e => getComputedStyle(e).padding),
        listBorder: getComputedStyle(document.querySelector(".br-list")).borderTopColor, inputClass: document.getElementById("cpf").className }; });
  }
} finally { await browser.close(); server.close(); }
console.log(JSON.stringify(out, null, 1));
