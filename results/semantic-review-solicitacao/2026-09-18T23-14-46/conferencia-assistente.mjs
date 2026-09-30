// Mede a tela A congelada para conferir as alegações dos cartões. Nenhum modelo, nenhum oráculo.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";

const evalRoot = "F:/Dev Nath/TCC/govbr-eval";
const dist = "F:/Dev Nath/TCC/govbr-corpus/dist";
const { chromium } = await import(pathToFileURL(join(evalRoot, "node_modules/playwright/index.mjs")).href);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  const file = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(4398, "127.0.0.1", r));
const url = "http://127.0.0.1:4398/solicitacao.html";
const browser = await chromium.launch();
const out = {};
const abrir = async (page) => { await page.goto(url); await page.waitForSelector(".linhas-anteriores tr"); };
const escolher = async (page, id) => { await page.click(`#${id}`); await page.waitForTimeout(250);
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150); await page.keyboard.press("Enter"); await page.waitForTimeout(300); };
const preencherTudo = async (page, { cpf = "12345678901", descricao = "Preciso da segunda via." } = {}) => {
  await page.fill("#nome", "Maria Souza"); await page.fill("#cpf", cpf);
  await escolher(page, "servico"); await escolher(page, "unidade");
  await page.focus("#forma-video"); await page.keyboard.press("Space");
  await page.evaluate(() => { const d = document.getElementById("data-preferencial"); d.removeAttribute("readonly"); });
  await page.fill("#data-preferencial", "02/10/2026"); await page.keyboard.press("Escape");
  await page.fill("#descricao", descricao);
  await page.evaluate(() => { const c = document.getElementById("declaracao"); if (!c.checked) c.click(); });
};
const retorno = page => page.evaluate(() => ({
  mensagem: document.querySelector(".retorno-envio, .mensagem-retorno")?.innerText.replace(/\s+/g, " ").trim() ?? null,
  camposEmErro: [...document.querySelectorAll("[aria-invalid=true]")].map(e => e.id || e.name),
  valores: Object.fromEntries(["nome", "cpf", "servico", "unidade", "data-preferencial"].map(i => [i, document.getElementById(i).value])),
  descricaoLen: document.getElementById("descricao").value.length,
}));

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ---------- estado inicial
  await abrir(page);
  out.inicial = await page.evaluate(() => {
    const at = e => Object.fromEntries([...e.attributes].map(a => [a.name, a.value]));
    const up = document.querySelector(".upload-button"), doc = document.getElementById("documentos");
    const atual = document.querySelector("nav ol li:nth-of-type(3) > span");
    const tabela = document.querySelector(".tabela-anteriores table");
    const pres = document.getElementById("forma-presencial");
    const cal = document.getElementById("data-preferencial-btn");
    return {
      trilhaAtual: atual ? at(atual) : null,
      trilhaPrimeiroLink: document.querySelector("nav ol li:nth-of-type(1) > a")?.className ?? null,
      upload: { botao: at(up), botaoBox: up.getBoundingClientRect().toJSON(), inputDisplay: getComputedStyle(doc).display, labelFor: document.querySelector(".upload-label")?.getAttribute("for") ?? null },
      tabindexPositivos: [...document.querySelectorAll("[tabindex]")].filter(e => Number(e.getAttribute("tabindex")) > 0).map(e => `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 50)),
      tabela: { caption: tabela.querySelectorAll("caption").length, titulo: document.querySelector(".tabela-anteriores .table-title")?.outerHTML.slice(0, 120) ?? null,
        titutoDentroDaTable: !!tabela.querySelector(".table-title"), responsive: document.querySelectorAll(".tabela-anteriores .responsive").length },
      presencial: { labels: pres.labels.length, ariaLabel: pres.getAttribute("aria-label"), labelledby: pres.getAttribute("aria-labelledby"), title: pres.getAttribute("title"),
        labelIrmao: pres.parentElement.querySelector("label")?.outerHTML ?? null,
        outros: ["forma-video", "forma-telefone"].map(i => [i, document.getElementById(i).labels.length]) },
      raios: Object.fromEntries(["nome", "cpf", "servico", "unidade", "data-preferencial", "descricao"].map(i => [i, getComputedStyle(document.getElementById(i)).borderRadius])),
      paddingSelects: ["servico", "unidade"].map(i => getComputedStyle(document.getElementById(i)).padding),
      listas: [...document.querySelectorAll("[id^='list-']")].map(e => [e.id, e.tagName.toLowerCase(), e.className, getComputedStyle(e).margin]),
      descricao: { maxlength: document.getElementById("descricao").getAttribute("maxlength"), apoio: document.getElementById("descricao-apoio")?.textContent ?? null },
      cpfApoio: document.getElementById("cpf-apoio")?.textContent ?? null,
      calendarioBtn: cal ? at(cal) : null,
      paginacao: [...document.querySelectorAll(".paginacao-anteriores a, .br-pagination a")].map(a => ({ cls: a.className, cur: a.getAttribute("aria-current"), label: a.getAttribute("aria-label"), pai: a.parentElement.tagName })),
      ariaCurrentNaPagina: [...document.querySelectorAll("[aria-current]")].map(e => `${e.tagName.toLowerCase()}:${e.textContent.trim().slice(0, 30)}`),
    };
  });

  // primeiro Tab
  await page.keyboard.press("Tab");
  out.primeiroTab = await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return { el: e.outerHTML.slice(0, 140), outline: `${s.outlineStyle} ${s.outlineWidth}` }; });

  // clique no texto "Presencial"
  await abrir(page);
  const lbl = page.locator("#forma-presencial ~ label, #forma-presencial + label").first();
  await lbl.click({ timeout: 3000 }).catch(e => { out.cliquePresencialErro = String(e).slice(0, 160); });
  out.cliquePresencial = await page.evaluate(() => ({ checked: document.getElementById("forma-presencial").checked,
    opacity: getComputedStyle(document.getElementById("forma-presencial")).opacity }));
  await page.focus("#forma-presencial"); await page.keyboard.press("Space");
  out.espacoPresencial = await page.evaluate(() => document.getElementById("forma-presencial").checked);

  // foco: selects contra #nome
  await abrir(page);
  out.foco = {};
  for (const id of ["nome", "cpf", "servico", "unidade", "descricao"]) {
    const ler = () => page.evaluate(i => { const s = getComputedStyle(document.getElementById(i)); return `${s.borderTopColor} | ${s.boxShadow} | ${s.outlineStyle} ${s.outlineWidth}`; }, id);
    await page.evaluate(() => document.activeElement?.blur()); const antes = await ler();
    await page.focus(`#${id}`); await page.keyboard.press("Shift"); const depois = await ler();
    out.foco[id] = { antes, depois, mudou: antes !== depois };
    await page.keyboard.press("Escape");
  }
  out.regraFoco = await page.evaluate(() => [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch { return []; } })
    .filter(r => r.selectorText && /campo-(servico|unidade).*focus/.test(r.selectorText)).map(r => r.cssText));

  // seleção por teclado no select → foco
  await abrir(page);
  out.selectTeclado = {};
  for (const id of ["servico", "unidade"]) {
    await page.focus(`#${id}`); await page.click(`#${id}`); await page.waitForTimeout(250);
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150);
    const naLista = await page.evaluate(() => document.activeElement.outerHTML.slice(0, 100));
    await page.keyboard.press("Enter"); await page.waitForTimeout(300);
    out.selectTeclado[id] = await page.evaluate(i => ({ valor: document.getElementById(i).value, ativo: document.activeElement.tagName + (document.activeElement.id ? "#" + document.activeElement.id : "") }), id);
    out.selectTeclado[id].naLista = naLista;
  }

  // calendário
  await abrir(page);
  await page.focus("#data-preferencial"); await page.waitForTimeout(250);
  const aberto = () => page.evaluate(() => { const c = document.querySelector(".flatpickr-calendar"); return c ? { open: c.classList.contains("open"), display: getComputedStyle(c).display } : null; });
  out.calendario = { aoFocar: await aberto() };
  await page.keyboard.press("Enter"); await page.waitForTimeout(250); out.calendario.aposEnter = await aberto();
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(250); out.calendario.aposSeta = await aberto();
  await page.keyboard.press("Space"); await page.waitForTimeout(250); out.calendario.aposEspaco = await aberto();
  await abrir(page);
  await page.click("#data-preferencial-btn"); await page.waitForTimeout(400);
  out.calendario.aposCliqueNoBotao = await aberto();
  out.calendario.navegacao = await page.evaluate(() => [...document.querySelectorAll(".flatpickr-calendar .flatpickr-prev-month button, .flatpickr-calendar .flatpickr-next-month button, .flatpickr-calendar .flatpickr-months button")].map(b => ({
    html: b.outerHTML.slice(0, 160), label: b.getAttribute("aria-label"), title: b.getAttribute("title"), texto: b.textContent.trim(), visivel: b.getBoundingClientRect().width > 0,
    caminhoPai: b.parentElement.tagName.toLowerCase() + "." + b.parentElement.className, escondidoPorAria: !!b.closest("[aria-hidden=true]") })));
  out.calendario.dias = await page.evaluate(() => { const d = [...document.querySelectorAll(".flatpickr-day")]; return { total: d.length, tabindex: [...new Set(d.map(e => e.getAttribute("tabindex")))] }; });
  out.calendario.selectMes = await page.evaluate(() => { const s = document.querySelector(".flatpickr-calendar select"); if (!s) return null; const c = getComputedStyle(s);
    return { margin: c.margin, marginTop: c.marginTop, marginLeft: c.marginLeft, padding: c.padding, cls: s.className }; });

  out.calendario.selectMesRegras = await page.evaluate(() => { const el = document.querySelector(".flatpickr-calendar select"); if (!el) return null;
    return [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch { return []; } }).filter(r => r.selectorText && r.style && r.style.margin + r.style.marginTop + r.style.marginLeft !== "" && el.matches(r.selectorText)).map(r => r.selectorText + " { margin: " + r.style.margin + " / top " + r.style.marginTop + " }"); });
  // envio vazio
  await abrir(page);
  await page.click(".acao-enviar"); await page.waitForSelector(".mensagem-retorno");
  out.envioVazio = await page.evaluate(() => {
    const campo = i => { const e = document.getElementById(i); const span = e.closest(".br-select, .br-input, .br-textarea, .br-checkbox, fieldset, div")?.parentElement?.querySelector(".retorno-campo");
      return { invalid: e.getAttribute("aria-invalid"), describedby: e.getAttribute("aria-describedby") }; };
    const msg = document.querySelector(".mensagem-retorno");
    return {
      campos: Object.fromEntries(["nome", "cpf", "servico", "unidade", "forma-presencial", "data-preferencial", "descricao", "declaracao"].map(i => [i, campo(i)])),
      retornos: [...document.querySelectorAll(".retorno-campo")].map(s => ({ id: s.id || null, role: s.getAttribute("role"), texto: s.textContent.trim() })),
      mensagem: { texto: msg.innerText.replace(/\s+/g, " ").trim().slice(0, 120), filhos: [...msg.children].map(c => `${c.tagName.toLowerCase()}.${c.className}`),
        fechar: msg.querySelector("[aria-label='Fechar a mensagem']")?.outerHTML.slice(0, 200) ?? null },
    };
  });

  // diálogo de descarte
  await page.click(".acao-cancelar"); await page.waitForTimeout(500);
  out.dialogo = await page.evaluate(() => { const alvo = document.querySelector("body > div:nth-of-type(1) > div > div > div");
    return { sujeito: alvo ? `${alvo.tagName.toLowerCase()}.${alvo.className}` : null, cor: alvo ? getComputedStyle(alvo).color : null, texto: alvo?.innerText.replace(/\s+/g, " ").slice(0, 80) ?? null,
      focoDentro: !!document.activeElement.closest(".br-modal, [role=dialog]") }; });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  out.dialogo.focoAposFechar = await page.evaluate(() => document.activeElement.tagName + "." + document.activeElement.className);

  // CPF "123" com o resto válido
  await abrir(page); await preencherTudo(page, { cpf: "123" });
  await page.click(".acao-enviar"); await page.waitForTimeout(600);
  out.cpf123 = await retorno(page);

  // descrição com 520 caracteres
  await abrir(page); await preencherTudo(page, { descricao: "x".repeat(520) });
  await page.click(".acao-enviar"); await page.waitForTimeout(600);
  out.descricao520 = await retorno(page);

  // paginação: página 2
  await abrir(page);
  await page.click(".br-pagination a[aria-label='Página 2'], .paginacao-anteriores a[aria-label='Página 2']"); await page.waitForTimeout(400);
  out.pagina2 = await page.evaluate(() => ({ links: [...document.querySelectorAll(".br-pagination a.page, .paginacao-anteriores a.page")].map(a => `${a.textContent.trim()}:${a.className}:${a.getAttribute("aria-current")}`),
    ariaCurrent: [...document.querySelectorAll("[aria-current]")].map(e => e.textContent.trim().slice(0, 30)) }));

  // janelas estreitas
  for (const [w, h] of [[320, 800], [375, 812]]) {
    await page.setViewportSize({ width: w, height: h }); await abrir(page); await page.waitForTimeout(300);
    out[`w${w}x${h}`] = await page.evaluate(() => { const t = document.querySelector(".tabela-anteriores table"), c = t.closest(".br-table");
      const fora = [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && e.getBoundingClientRect().width > 0);
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth, tabela: Math.round(t.getBoundingClientRect().width * 100) / 100,
        conteiner: Math.round(c.getBoundingClientRect().width), overflowX: getComputedStyle(c).overflowX, foraDaJanela: fora.length, foraQueNaoETabela: fora.filter(e => !t.contains(e) && e !== t).map(e => `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 40)) }; });
  }
} finally { await browser.close(); server.close(); }
console.log(JSON.stringify(out, null, 1));
