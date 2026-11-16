/**
 * Conferência da construção da tela E2 (página construída `cadastro-pais.html`) contra tela-e2/sorteio.json —
 * sem modelo, sem oráculo, sem validator e sem axe (metodo.md § 2 e § 6 "Pegou").
 *
 * Serve o `dist/` do corpus em servidores locais e abre a página no Chromium do Playwright (headless,
 * 1280×900). Cada célula sorteada tem (a) um OBSERVÁVEL medido no estado declarado e (b) as TROCAS literais
 * que a desfazem (de → para, cada `de` ocorre exatamente uma vez no arquivo servido). Com as trocas o
 * script monta, em memória, a PÁGINA SEM SEMENTE (todas desfeitas) e as 9 páginas com UMA célula desfeita.
 * Mede:
 *   1. página semeada: os 9 observáveis violados;
 *   2. página sem semente: os 9 observáveis conformes (só o observável da célula muda — "pegou");
 *   3. interferência: em cada página com uma célula desfeita, só o observável dela fica conforme e os
 *      outros 8 continuam violados;
 *   4. estados S0/S1/S2 alcançáveis pelos gatilhos declarados (carga; Salvar País; gatilho do select),
 *      cada um de carga nova, em até 120 s, sem recarga no meio — nas 11 páginas;
 *   5. pontos conformes (obrigações elegíveis não sorteadas, andaime e moldura) na página semeada E na
 *      página sem semente: as sementes não podem tocá-los.
 * Nada é importado do govbr-ds-validator.
 *
 * Uso: node tela-e2/conferir-construcao.mjs [--saida <arquivo.json>] [--capturas <dir>]
 *      CORPUS_DIR=<checkout do govbr-corpus> (padrão ../../govbr-corpus a partir daqui), já com `npm run build`.
 */
import { createServer } from "http";
import { readFile, readdir, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { join, extname, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const AQUI = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(AQUI, "../package.json"));
const { chromium } = require("playwright");
const CORPUS = resolve(process.env.CORPUS_DIR ?? join(AQUI, "../../govbr-corpus"));
const DIST = join(CORPUS, "dist");
const PAGINA = "cadastro-pais.html";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const args = process.argv.slice(2);
const saida = args.includes("--saida") ? args[args.indexOf("--saida") + 1] : null;
const capturas = args.includes("--capturas") ? args[args.indexOf("--capturas") + 1] : null;
const VIEWPORT = { width: 1280, height: 900 };
const ZOOM_200 = { width: 640, height: 450 };
const LIMITE_ESTADO_MS = 120_000;

// ---------------------------------------------------------------- arquivos servidos e trocas
const htmlSemeado = await readFile(join(DIST, PAGINA), "utf8");
const hrefCss = htmlSemeado.match(/<link rel="stylesheet"[^>]*href="\/(assets\/cadastro-pais-[^"]+\.css)"/)[1];
const ARQ = { html: PAGINA, css: hrefCss, js: "cadastro-pais/comportamento.js" };
const ORIGINAL = { html: htmlSemeado, css: await readFile(join(DIST, ARQ.css), "utf8"), js: await readFile(join(DIST, ARQ.js), "utf8") };

const sorteio = JSON.parse(await readFile(join(AQUI, "sorteio.json"), "utf8"));
const SEMENTES = [
  { celula: "btn-limpar::a2-2ac598dc24db", estado: "S0", trocas: [
    { arq: "css", de: ".acoes-formulario .acao-limpar{order:1}", para: "" }] },
  { celula: "msg-orientacao::a2-d6b3f0e36943", estado: "S0", trocas: [
    { arq: "html", de: " Os dados do país são persistidos no banco após o commit da transação, e a listagem abaixo é renderizada a partir do cache do endpoint de consulta.",
      para: " Preencha os dados do país e use Salvar País. O país salvo passa a constar na lista de países cadastrados, abaixo do formulário." }] },
  { celula: "btn-ajuda::a2-5b47246a41c1", estado: "S0", trocas: [
    { arq: "html", de: 'aria-label="Ajuda sobre o cadastro"><span class="sr-only">', para: 'aria-label="Ajuda sobre o cadastro"><i class="fas fa-question" aria-hidden="true"></i><span class="sr-only">' }] },
  { celula: "inp-codigo::a2-a39f3ad397d4", estado: "S0", trocas: [
    { arq: "css", de: ".campo-codigo .br-input{font-family:Arial,Helvetica,sans-serif}", para: "" }] },
  { celula: "rad-situacao::a2-f838b54da560", estado: "S0", trocas: [
    { arq: "css", de: ".grupo-situacao .rotulo-situacao{text-align:center;width:100%}", para: "" }] },
  { celula: "msg-erro::a2-ef29db5bb4ac", estado: "S1", trocas: [
    { arq: "css", de: ".formulario-pais .retorno-envio{--message-background:var(--blue-warm-vivid-50);--message-color-icon:var(--pure-0);--message-text:var(--pure-0)}", para: "" },
    { arq: "css", de: ".retorno-envio .marca-retorno{margin-right:var(--spacing-scale-base)}", para: "" },
    { arq: "html", de: '<i class="fas fa-check marca-retorno" aria-hidden="true"></i>', para: "" }] },
  { celula: "sel-continente::a2-7348bce34289", estado: "S2", trocas: [
    { arq: "css", de: ".campo-continente .br-item{--text-color:#aaa}", para: "" }] },
  { celula: "inp-nome-pais::a2-328f62cfe4ce", estado: "S0", trocas: [
    { arq: "html", de: ' required readonly>', para: " required>" },
    { arq: "js", de: "  nome.addEventListener('click', function () { nome.readOnly = false; });", para: "" }] },
  { celula: "lst-paises::a2-5432c282d0d7", estado: "S0 (janela 640×450 = 200 %)", trocas: [
    { arq: "css", de: ".lista-paises .item-pais{height:74px;overflow:hidden}", para: "" }] },
];

// as células conferidas são exatamente as sementes do sorteio (nem mais, nem menos)
const doSorteio = sorteio.sementes.map(s => s.id).sort();
const aqui = SEMENTES.map(s => s.celula).sort();
if (JSON.stringify(doSorteio) !== JSON.stringify(aqui)) throw new Error(`células da conferência ≠ sementes do sorteio: ${JSON.stringify({ doSorteio, aqui })}`);
for (const s of SEMENTES) for (const t of s.trocas) {
  const n = ORIGINAL[t.arq].split(t.de).length - 1;
  if (n !== 1) throw new Error(`troca de ${s.celula} ocorre ${n} vezes em ${ARQ[t.arq]}: ${t.de.slice(0, 60)}`);
}
function montar(desfeitas) {
  const c = { ...ORIGINAL };
  for (const s of SEMENTES) if (desfeitas.has(s.celula)) for (const t of s.trocas) c[t.arq] = c[t.arq].replace(t.de, t.para);
  return c;
}

const servidores = [];
async function servir(conteudo) {
  const porNome = { ["/" + ARQ.html]: conteudo.html, ["/" + ARQ.css]: conteudo.css, ["/" + ARQ.js]: conteudo.js };
  const s = createServer(async (req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const corpo = porNome[caminho] ?? await readFile(join(DIST, caminho));
      res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(ok => s.listen(0, "127.0.0.1", ok));
  servidores.push(s);
  return `http://127.0.0.1:${s.address().port}`;
}

const navegador = await chromium.launch({ headless: true });

// ---------------------------------------------------------------- funções medidas dentro da página
const NA_PAGINA = `
  window.__rgb = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  window.__lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  window.__fundo = el => { for (let e = el; e; e = e.parentElement) { const c = __rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0.99) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  window.__contraste = el => { const a = __lum(__rgb(getComputedStyle(el).color)), b = __lum(__fundo(el)); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2); };
  window.__token = nome => { const d = document.createElement('div'); d.style.color = getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  window.__caixa = el => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) }; };
  window.__texto = el => { const g = document.createRange(); g.selectNodeContents(el); const r = g.getBoundingClientRect(); return { x: r.x, right: r.right, cx: r.x + r.width / 2 }; };
  window.__icones = el => [...el.querySelectorAll('i, svg, img')].filter(i => { const r = i.getBoundingClientRect(); const c = getComputedStyle(i, '::before').content; return r.width > 0 && r.height > 0 && (i.tagName !== 'I' || (c && c !== 'none' && c !== 'normal')); }).length;
  window.__visivel = el => { if (!el) return false; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden'; };
`;

async function novaPagina(contexto, url) {
  const pagina = await contexto.newPage();
  const registro = { erros: [], pedidos: [], cargas: 0 };
  pagina.on("pageerror", e => registro.erros.push(String(e)));
  pagina.on("console", m => { if (m.type() === "error") registro.erros.push(m.text()); });
  pagina.on("request", r => registro.pedidos.push(r.url()));
  pagina.on("response", r => { if (r.status() >= 400) registro.erros.push(`${r.status()} ${r.url()}`); });
  await pagina.goto(`${url}/${PAGINA}`);
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.evaluate(NA_PAGINA);
  registro.inicio = Date.now();
  pagina.on("load", () => { registro.cargas += 1; });
  return { pagina, registro };
}
const fechamento = r => ({ ms: Date.now() - r.inicio, ok: Date.now() - r.inicio < LIMITE_ESTADO_MS && r.cargas === 0 });
const irS1 = async p => { await p.click("#btn-salvar"); await p.waitForSelector("#msg-erro:not([hidden])"); };
const irS2 = async p => { await p.click("#sel-continente [data-trigger]"); await p.waitForSelector("#sel-continente .br-list[expanded]"); };

async function fontesUsadas(contexto, pagina, seletor) {
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: seletor });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  await cdp.detach();
  return fonts.map(f => f.familyName);
}
async function axNo(contexto, pagina, seletor) {
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("DOM.enable"); await cdp.send("Accessibility.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: seletor });
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  await cdp.detach();
  const n = nodes[0];
  const prop = nome => n?.properties?.find(p => p.name === nome)?.value?.value;
  return { nome: n?.name?.value ?? null, papel: n?.role?.value ?? null, checked: prop("checked") ?? null, required: prop("required") ?? null, readonly: prop("readonly") ?? null, invalid: prop("invalid") ?? null };
}

// ---------------------------------------------------------------- observáveis das 9 células (true = violado)
async function observaveis(url, rotulo) {
  const contexto = await navegador.newContext({ viewport: VIEWPORT });
  const obs = {};
  const estados = {};

  // S0
  {
    const { pagina, registro } = await novaPagina(contexto, url);
    if (capturas) await pagina.screenshot({ path: join(capturas, `${rotulo}-S0.png`), fullPage: true });
    const m = await pagina.evaluate(() => {
      const limpar = __caixa(document.getElementById("btn-limpar")), salvar = __caixa(document.getElementById("btn-salvar"));
      const texto = document.querySelector("#msg-orientacao .content").innerText;
      const termos = [...new Set((texto.match(/persistid\w*|commit|transa[cç][aã]o|renderizad\w*|cache|endpoint|banco/gi) ?? []).map(t => t.toLowerCase()))];
      const legenda = __texto(document.querySelector("#rad-situacao legend"));
      const grupo = __caixa(document.getElementById("rad-situacao"));
      const opcao = __caixa(document.querySelector("#rad-situacao .br-radio label"));
      return {
        estado: { erroOculto: document.getElementById("msg-erro").hidden && !__visivel(document.getElementById("msg-erro")), semRetornoCampo: document.querySelectorAll(".retorno-campo").length === 0 },
        limpar: { limpar, salvar }, termos,
        ajudaIcones: __icones(document.getElementById("btn-ajuda")),
        fontesDeclaradas: ["#inp-codigo label", "#codigo-pais", "#codigo-pais-apoio"].map(s => getComputedStyle(document.querySelector(s)).fontFamily),
        legenda: { esquerdaTexto: +legenda.x.toFixed(1), centroTexto: +legenda.cx.toFixed(1), centroGrupo: +(grupo.x + grupo.w / 2).toFixed(1), esquerdaOpcao: opcao.x },
        corte1280: [...document.querySelectorAll("#lst-paises [role=listitem]")].map(i => i.scrollHeight - i.clientHeight),
      };
    });
    obs["btn-limpar::a2-2ac598dc24db"] = { violado: m.limpar.limpar.x > m.limpar.salvar.right, fato: { limparX: m.limpar.limpar.x, salvarDireita: m.limpar.salvar.right } };
    obs["msg-orientacao::a2-d6b3f0e36943"] = { violado: m.termos.length >= 3, fato: { termosTecnicos: m.termos.length } };
    obs["btn-ajuda::a2-5b47246a41c1"] = { violado: m.ajudaIcones === 0, fato: { iconesVisiveis: m.ajudaIcones } };
    obs["rad-situacao::a2-f838b54da560"] = { violado: m.legenda.esquerdaTexto - m.legenda.esquerdaOpcao > 20 && Math.abs(m.legenda.centroTexto - m.legenda.centroGrupo) <= 2,
      fato: m.legenda, conformeSe: Math.abs(m.legenda.esquerdaTexto - m.legenda.esquerdaOpcao) <= 1 };
    // fonte: digita no campo para que ele tenha texto, e lê a fonte usada (CDP) no rótulo, no campo e no apoio
    await pagina.fill("#codigo-pais", "ARG");
    const usadas = [];
    for (const s of ["#inp-codigo label", "#codigo-pais", "#codigo-pais-apoio"]) usadas.push(await fontesUsadas(contexto, pagina, s));
    await pagina.fill("#codigo-pais", "");
    const semRawline = usadas.every(f => f.length && !f.some(n => /rawline/i.test(n))) && m.fontesDeclaradas.every(f => !/rawline/i.test(f));
    const soRawline = usadas.every(f => f.length && f.every(n => /rawline/i.test(n))) && m.fontesDeclaradas.every(f => /^rawline/i.test(f));
    obs["inp-codigo::a2-a39f3ad397d4"] = { violado: semRawline, conformeSe: soRawline, fato: { usadas, declaradas: m.fontesDeclaradas } };
    // campo do nome: foco por Tab (vindo da ajuda) e digitação em seguida
    await pagina.focus("#btn-ajuda");
    await pagina.keyboard.press("Tab");
    const focado = await pagina.evaluate(() => document.activeElement.id);
    await pagina.keyboard.type("Chile");
    const valor = await pagina.evaluate(() => document.getElementById("nome-pais").value);
    obs["inp-nome-pais::a2-328f62cfe4ce"] = { violado: focado === "nome-pais" && valor === "", conformeSe: focado === "nome-pais" && valor === "Chile", fato: { focado, valor } };
    estados.S0 = { alcancado: m.estado.erroOculto && m.estado.semRetornoCampo, ...fechamento(registro), erros: registro.erros.length };
    await pagina.close();
  }
  // e-MAG 4.3: janela de 640×450 (200 % de 1280×900)
  {
    const z = await navegador.newContext({ viewport: ZOOM_200 });
    const { pagina } = await novaPagina(z, url);
    await pagina.waitForTimeout(200);
    const corte = await pagina.evaluate(() => [...document.querySelectorAll("#lst-paises [role=listitem]")].map(i => ({ falta: i.scrollHeight - i.clientHeight, overflow: getComputedStyle(i).overflowY })));
    const cortados = corte.filter(c => c.falta > 1 && c.overflow === "hidden").length;
    obs["lst-paises::a2-5432c282d0d7"] = { violado: cortados > 0, conformeSe: corte.every(c => c.falta <= 1), fato: { cortados, faltaPx: corte.map(c => c.falta) } };
    await z.close();
  }
  // S1
  {
    const { pagina, registro } = await novaPagina(contexto, url);
    await irS1(pagina);
    if (capturas) await pagina.screenshot({ path: join(capturas, `${rotulo}-S1.png`), fullPage: true });
    const m = await pagina.evaluate(() => {
      const msg = document.getElementById("msg-erro");
      return { fundo: getComputedStyle(msg).backgroundColor, azul50: __token("--blue-warm-vivid-50"), erroAlt: __token("--danger-alternative"), marca: msg.querySelectorAll(".fa-check").length,
        visivel: __visivel(msg), retornos: document.querySelectorAll(".retorno-campo").length, nomeErro: document.getElementById("inp-nome-pais").classList.contains("danger") };
    });
    obs["msg-erro::a2-ef29db5bb4ac"] = { violado: m.fundo === m.azul50 && m.marca >= 1, conformeSe: m.fundo === m.erroAlt && m.marca === 0, fato: { fundo: m.fundo, marcas: m.marca } };
    estados.S1 = { alcancado: m.visivel && m.retornos === 3 && m.nomeErro, ...fechamento(registro), erros: registro.erros.length };
    await pagina.close();
  }
  // S2
  {
    const { pagina, registro } = await novaPagina(contexto, url);
    await irS2(pagina);
    if (capturas) await pagina.screenshot({ path: join(capturas, `${rotulo}-S2.png`) });
    const m = await pagina.evaluate(() => {
      const lista = document.querySelector("#sel-continente .br-list");
      const rotulos = [...lista.querySelectorAll(".br-item label")];
      return { aberta: __visivel(lista) && lista.hasAttribute("expanded"), itens: rotulos.filter(__visivel).length,
        expandido: document.querySelector("#sel-continente [data-trigger]").getAttribute("aria-expanded"),
        cores: [...new Set(rotulos.map(l => getComputedStyle(l).color))], contrastes: rotulos.map(__contraste) };
    });
    obs["sel-continente::a2-7348bce34289"] = { violado: m.contrastes.every(c => c < 4.5), conformeSe: m.contrastes.every(c => c >= 4.5), fato: { cores: m.cores, contrasteMin: Math.min(...m.contrastes) } };
    estados.S2 = { alcancado: m.aberta && m.itens === 6 && m.expandido === "true", ...fechamento(registro), erros: registro.erros.length };
    await pagina.close();
  }
  await contexto.close();
  for (const o of Object.values(obs)) if (o.conformeSe === undefined) o.conformeSe = !o.violado;
  return { obs, estados };
}

// ---------------------------------------------------------------- pontos conformes (página semeada e sem semente)
async function pontosConformes(url) {
  const r = [];
  const ok = (nome, valor, fato = "") => r.push({ nome, ok: valor === true, fato: typeof fato === "string" ? fato : JSON.stringify(fato) });
  const contexto = await navegador.newContext({ viewport: VIEWPORT });

  const html = await (await fetch(`${url}/${PAGINA}`)).text();
  ok("página: sem bloco style nem script embutido no HTML servido", !/<style[\s>]/i.test(html) && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html));
  ok("página: sem atributos style e on* no HTML servido", !/\sstyle=/i.test(html) && !/\son[a-z]+=/i.test(html));
  ok("página: elementos vazios sem '/>' no HTML servido", !/\/>/.test(html));
  ok("página: script sem type/language", !/<script[^>]*\b(type|language)=/i.test(html));
  ok("página: sem elementos font nem atributos align/color/bgcolor", !/<font[\s>]/i.test(html) && !/\s(align|bgcolor|color)=/i.test(html));
  ok("página: sem table", !/<table[\s>]/i.test(html));

  // S0
  const { pagina, registro } = await novaPagina(contexto, url);
  const s0 = await pagina.evaluate(() => {
    const cs = s => getComputedStyle(typeof s === "string" ? document.querySelector(s) : s);
    const ordem = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const main = document.querySelector("main"), header = document.querySelector(".br-header"), footer = document.querySelector(".br-footer");
    const msg = document.getElementById("msg-orientacao"), trilha = document.getElementById("brd-trilha");
    const area = document.querySelector("main > .container-lg"); const ac = __caixa(area); const pad = parseFloat(cs(area).paddingLeft);
    const util = { x: ac.x + pad, right: ac.right - pad };
    const fechar = msg.querySelector(".fechar-mensagem");
    const gatilho = document.querySelector("#sel-continente [data-trigger]");
    const desvio = b => { const bb = __caixa(b), ii = __caixa(b.querySelector("i")); return Math.max(Math.abs(bb.x + bb.w / 2 - ii.x - ii.w / 2), Math.abs(bb.y + bb.h / 2 - ii.y - ii.h / 2)); };
    const radios = [...document.querySelectorAll("#rad-situacao input[type=radio]")];
    const circulos = radios.map(i => getComputedStyle(i.nextElementSibling, "::before"));
    const itens = [...document.querySelectorAll("#lst-paises [role=listitem]")];
    const links = [...document.querySelectorAll("a[href]")].map(a => ({ href: a.getAttribute("href"), texto: a.textContent.replace(/\s+/g, " ").trim() }));
    const rotulos = ["nome-pais", "codigo-pais", "continente"].map(id => document.querySelector(`label[for="${id}"]`)?.textContent.trim() ?? null);
    const botoes = ["btn-cancelar", "btn-limpar", "btn-salvar"].map(id => { const b = document.getElementById(id); const bb = __caixa(b); return { id, classes: b.className, h: bb.h, linhas: (() => { const g = document.createRange(); g.selectNodeContents(b); return new Set([...g.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top))).size; })(), texto: b.textContent.trim(), x: bb.x, right: bb.right }; });
    const sw = document.getElementById("certificado-automatico");
    return {
      doc: { doctype: !!document.doctype && document.doctype.name === "html", lang: document.documentElement.lang, charset: document.characterSet, titulo: document.title },
      mains: document.querySelectorAll("main, [role=main]").length,
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(h => h.tagName),
      header: !!header && __visivel(header) && header.getBoundingClientRect().top === 0 && ordem(header, main),
      footer: !!footer && __visivel(footer) && ordem(main, footer),
      skip: (() => { const s = document.querySelector(".br-skiplink"); return { primeiro: document.body.firstElementChild === s, destinos: [...s.querySelectorAll("a")].every(a => !!document.querySelector(a.getAttribute("href"))), papeis: [...document.querySelectorAll(".br-skiplink, .br-skiplink *")].filter(e => e.hasAttribute("role")).length }; })(),
      trilha: { atual: (() => { const a = trilha.querySelector('[aria-current="page"]'); return { tag: a.tagName, tabindex: a.getAttribute("tabindex") }; })(), rotulo: trilha.getAttribute("aria-label"), depoisDaMensagem: ordem(msg, trilha) },
      msg: { entreCabecalhoETrilha: ordem(header, msg) && ordem(msg, trilha), caixa: __caixa(msg), larguraJanela: document.documentElement.clientWidth,
        icone: __caixa(msg.querySelector(".icon i")), fechar: __caixa(fechar), util, fundo: cs(msg).backgroundColor, info10: __token("--blue-warm-vivid-10"),
        tipoIcone: msg.querySelector(".icon i").className, tipoOculto: msg.querySelector(".icon .sr-only")?.textContent, cor: __contraste(msg.querySelector(".message-body")) },
      fechar: { tag: fechar.tagName, classes: fechar.className, rotulo: fechar.getAttribute("aria-label"), w: fechar.getBoundingClientRect().width, h: fechar.getBoundingClientRect().height, icone: fechar.querySelector("i")?.className, oculto: fechar.querySelector("i")?.getAttribute("aria-hidden"), desvio: desvio(fechar) },
      gatilho: { icone: gatilho.querySelector("i")?.className, oculto: gatilho.querySelector("i")?.getAttribute("aria-hidden"), rotulo: gatilho.getAttribute("aria-label"), tabindex: gatilho.getAttribute("tabindex"), desvio: desvio(gatilho), direita: __caixa(gatilho).right, campoDireita: __caixa(document.querySelector("#sel-continente .br-input")).right },
      ajuda: { w: document.getElementById("btn-ajuda").getBoundingClientRect().width, h: document.getElementById("btn-ajuda").getBoundingClientRect().height, classes: document.getElementById("btn-ajuda").className, rotulo: document.getElementById("btn-ajuda").getAttribute("aria-label"), distH1: __caixa(document.getElementById("btn-ajuda")).x - __caixa(document.querySelector("h1")).right },
      botoes,
      rotulos, opcional: rotulos[1],
      nome: { required: document.getElementById("nome-pais").getAttribute("required"), tipo: document.getElementById("nome-pais").type },
      codigo: { tipo: document.getElementById("codigo-pais").type, descritoPor: document.getElementById("codigo-pais").getAttribute("aria-describedby"), apoio: document.getElementById("codigo-pais-apoio")?.textContent.trim(), valor: document.getElementById("codigo-pais").value },
      selectOpcoes: [...document.querySelectorAll("#sel-continente .br-item input")].map(i => [i.name, i.value]),
      placeholder: document.getElementById("continente").getAttribute("placeholder"),
      radio: { requireds: radios.map(i => i.getAttribute("required")), bordas: circulos.map(c => c.borderTopColor), bordaPadrao: __token("--border-color"), perigo: __token("--danger"), dims: circulos.map(c => [c.width, c.height, c.borderTopLeftRadius]),
        fieldsetBorda: cs("#rad-situacao").borderTopStyle === "none" || cs("#rad-situacao").borderTopWidth === "0px", legendaAcima: __caixa(document.querySelector("#rad-situacao legend")).bottom <= __caixa(document.querySelector("#rad-situacao .br-radio")).y,
        palavras: radios.map(i => i.nextElementSibling.textContent.trim().split(/\s+/).length), textos: radios.map(i => i.nextElementSibling.textContent.trim()) },
      switch: { papel: sw.getAttribute("role"), aria: sw.getAttribute("aria-checked"), estado: getComputedStyle(document.querySelector("#swt-certificado .switch-data"), "::before").content, dados: [document.querySelector("#swt-certificado .switch-data").dataset.enabled, document.querySelector("#swt-certificado .switch-data").dataset.disabled] },
      lista: { papelLista: document.querySelector("#lst-paises [role=list]") !== null, itens: itens.length, divisores: document.querySelectorAll("#lst-paises [role=list] > .br-divider").length,
        contrastes: itens.map(i => __contraste(i.querySelector(".texto-secundario"))), situacoes: itens.map(i => i.querySelector(".texto-secundario").textContent.split("·")[0].trim()), titulo: document.getElementById("titulo-lista").textContent.trim(),
        dentroDaGrid: itens.every(i => __texto(i.querySelector(".texto-principal")).x >= util.x - 0.5) },
      links, h1: document.querySelector("h1").textContent.trim(),
      divisor: (() => { const d = document.getElementById("div-secoes"); return { classe: d.classList.contains("br-divider"), entre: ordem(document.getElementById("form-pais"), d) && ordem(d, document.getElementById("lst-paises")), focavel: d.tabIndex >= 0 }; })(),
      erroOculto: document.getElementById("msg-erro").hidden,
    };
  });
  ok("página: DOCTYPE html, lang pt-BR, UTF-8, título descritivo", s0.doc.doctype && s0.doc.lang === "pt-BR" && s0.doc.charset === "UTF-8" && /Cadastrar país importador/.test(s0.doc.titulo), s0.doc);
  ok("página: um único main", s0.mains === 1);
  ok("página: títulos h1 → h2 sem salto", s0.headings[0] === "H1" && s0.headings.slice(1).every(h => h === "H2"), s0.headings);
  ok("andaime hdr-govbr: cabeçalho visível no topo, antes do main", s0.header);
  ok("andaime ftr-govbr: rodapé visível depois do main", s0.footer);
  ok("andaime skp-conteudo: atalho é o 1º filho do body, destinos existem, sem papéis de menu", s0.skip.primeiro && s0.skip.destinos && s0.skip.papeis === 0, s0.skip);
  ok("andaime brd-trilha: item atual sem tabindex, rótulo em português, depois da mensagem de uso geral", s0.trilha.atual.tag === "SPAN" && s0.trilha.atual.tabindex === null && s0.trilha.rotulo === "Trilha de navegação" && s0.trilha.depoisDaMensagem, s0.trilha);
  const porDestino = Object.entries(s0.links.reduce((a, l) => ((a[l.href] ??= new Set()).add(l.texto), a), {})).map(([h, t]) => [h, [...t]]);
  ok("página: links para o mesmo destino com a mesma descrição", porDestino.every(([, t]) => t.length === 1), porDestino);
  const destinos = await Promise.all([...new Set(s0.links.map(l => l.href).filter(h => !h.startsWith("#")))].map(async h => [h, (await fetch(`${url}/${h}`)).status]));
  ok("página: destinos dos links existem no dist", destinos.every(([, s]) => s === 200), destinos);

  const m = s0.msg;
  ok("msg-orientacao (a2-7ce46ea1d9b8): entre o cabeçalho e a trilha", m.entreCabecalhoETrilha);
  ok("msg-orientacao (a2-b141828d5580, a2-7cf0838736be): superfície na largura da janela; ícone e Fechar dentro da área útil da grid", m.caixa.x === 0 && Math.abs(m.caixa.w - m.larguraJanela) <= 1 && m.icone.x >= m.util.x && m.fechar.right <= m.util.right, { caixa: m.caixa, util: m.util, icone: m.icone.x, fechar: m.fechar.right });
  ok("msg-orientacao (a2-6c82acf760ae, a2-952e88a5af0d, a2-55dab9d0155c): tipo Informativo, superfície --blue-warm-vivid-10, ícone info-circle, tipo em texto oculto", m.fundo === m.info10 && /fa-info-circle/.test(m.tipoIcone) && m.tipoOculto === "Informação", { fundo: m.fundo, icone: m.tipoIcone });
  ok("msg-orientacao (a2-5df30996e1c5): ícone à esquerda, Fechar no topo à direita", m.icone.x < m.fechar.x && m.fechar.y - m.caixa.y <= 16, { icone: m.icone, fechar: m.fechar });
  ok("msg-orientacao: contraste do texto ≥ 4,5", m.cor >= 4.5, String(m.cor));
  const f = s0.fechar;
  ok("Fechar de msg-orientacao (a2-507dbd6cdee4, a2-5b47246a41c1, a2-923a3ee74050, a2-5f85eeafe863): BUTTON br-button circle small 32×32, aria-label, ícone fa-times aria-hidden centrado", f.tag === "BUTTON" && /circle/.test(f.classes) && /small/.test(f.classes) && f.w === 32 && f.h === 32 && f.rotulo === "Fechar" && /fa-times/.test(f.icone) && f.oculto === "true" && f.desvio <= 1, f);
  const g = s0.gatilho;
  ok("gatilho do select (a2-5b47246a41c1, a2-30278caa77da, a2-5f85eeafe863): ícone angle-down aria-hidden centrado, aria-label, sem tabindex=-1, na extremidade direita do campo", /fa-angle-down/.test(g.icone) && g.oculto === "true" && !!g.rotulo && g.tabindex !== "-1" && g.desvio <= 1 && g.campoDireita - g.direita <= 12, g);
  const a = s0.ajuda;
  ok("btn-ajuda (a2-b0f874b8b2cf, a2-dc561d157556, a2-4f6b7bd068c4, a2-c23f336807f4): circular 40×40, terciário, aria-label, junto do h1 com espaço", a.w === 40 && a.h === 40 && /circle/.test(a.classes) && !/primary|secondary/.test(a.classes) && a.rotulo === "Ajuda sobre o cadastro" && a.distH1 >= 8 && a.distH1 <= 40, a);
  const axAjuda = await axNo(contexto, pagina, "#btn-ajuda");
  ok("btn-ajuda (a2-35afb7e6ee7c): nome acessível 'Ajuda sobre o cadastro'", axAjuda.nome === "Ajuda sobre o cadastro" && axAjuda.papel === "button", axAjuda);
  const [bc, bl, bs] = s0.botoes;
  ok("barra de ações (a2-b0f874b8b2cf, a2-59c1236e3ebd, a2-4f6b7bd068c4): Salvar primário, Limpar e Cancelar secundários, 40 px, rótulo em uma linha", /primary/.test(bs.classes) && /secondary/.test(bl.classes) && /secondary/.test(bc.classes) && [bc, bl, bs].every(b => b.h === 40 && b.linhas <= 1), s0.botoes);
  ok("barra de ações (a2-2ac598dc24db, controle): Cancelar (secundário) à esquerda de Salvar (primário)", bc.right < bs.x, { cancelarDireita: bc.right, salvarX: bs.x });
  ok("barra de ações (a2-73e03945d5cc, a2-5a1fcf660ae1, a2-12afa1f3c1f0): rótulos com iniciais maiúsculas, sem artigo, com verbo", bl.texto === "Limpar Campos" && bs.texto === "Salvar País" && bc.texto === "Cancelar");
  ok("campos (a2-7c43824db106, a2-1f45d0dc0c3a, a2-b174afd9a294, a2-624afa51bbaf): rótulos associados, sem dois-pontos, opcional entre parênteses, obrigatórios sem marca", s0.rotulos.every(t => t && !t.endsWith(":")) && /\(opcional\)$/.test(s0.opcional) && !s0.rotulos.some(t => /\*|obrigat/i.test(t)), s0.rotulos);
  ok("inp-nome-pais (a2-11b459a3885c): required sem valor, type text", s0.nome.required === "" && s0.nome.tipo === "text", s0.nome);
  ok("inp-codigo (a2-59c41d3b1085, a2-56357b049872, a2-cd5cbf0f18dc, a2-18acbf7b4c9c): type text, apoio ligado por aria-describedby, sem valor inicial, sigla do exemplo por extenso", s0.codigo.tipo === "text" && s0.codigo.descritoPor === "codigo-pais-apoio" && s0.codigo.valor === "" && /ARG para Argentina/.test(s0.codigo.apoio), s0.codigo);
  ok("sel-continente (a2-4c2ef1bf747e, a2-6eb568d6dd94, a2-3312a3e57512): opções com name e value; placeholder mais completo que o rótulo", s0.selectOpcoes.length === 6 && s0.selectOpcoes.every(([n, v]) => !!n && !!v) && s0.placeholder.length > "Continente".length, s0.placeholder);
  const rd = s0.radio;
  ok("rad-situacao (a2-12d0d71f5dd2, a2-11b459a3885c): required sem valor nas 3 opções", rd.requireds.every(v => v === ""), rd.requireds);
  ok("rad-situacao (a2-b4f55de91129): na carga, borda das caixas na cor padrão (não a de erro)", rd.bordas.every(c => c === rd.bordaPadrao) && rd.bordaPadrao !== rd.perigo, { bordas: rd.bordas, padrao: rd.bordaPadrao });
  ok("rad-situacao (a2-8ec9171bd752, a2-02ccd4221688, a2-916abe162da9): caixas 24×24 redondas, fieldset sem borda, legenda acima das opções", rd.dims.every(([w, h]) => w === "24px" && h === "24px") && rd.fieldsetBorda && rd.legendaAcima, rd.dims);
  ok("rad-situacao (a2-29c719d70e4c, a2-df9d11a960cf, a2-6c531e6437e8): opções curtas, só a 1ª letra maiúscula, os mesmos termos da lista", rd.palavras.every(n => n <= 7) && rd.textos.every(t => t[0] === t[0].toUpperCase() && t.slice(1) === t.slice(1).toLowerCase()) && s0.lista.situacoes.every(s => rd.textos.includes(s)), rd.textos);
  const sw = s0.switch;
  ok("swt-certificado (a2-dc662beb73b3, a2-52394d43a884, a2-159612f619b5, a2-c1af8ea16c40): role switch, aria-checked=false, texto de estado 'Desligada' vindo de data-disabled, par de textos", sw.papel === "switch" && sw.aria === "false" && sw.estado === '"Desligada"' && sw.dados[0] === "Ligada" && sw.dados[1] === "Desligada", sw);
  const ls = s0.lista;
  ok("lst-paises (a2-312e000d6784, a2-d45711a55b6c, a2-39c30a5ea7ee): 4 itens em role=list, divisor abaixo de cada item", ls.papelLista && ls.itens === 4 && ls.divisores === 4, ls);
  ok("lst-paises (a2-66fbdcf13772, a2-9250e991e04f, a2-598ca56880b1, a2-6a99b79819ae): texto com contraste ≥ 4,5, situação em texto, título 'Países Cadastrados', texto dentro da área útil", ls.contrastes.every(c => c >= 4.5) && ls.situacoes.every(Boolean) && ls.titulo === "Países Cadastrados" && ls.dentroDaGrid, ls.contrastes);
  ok("andaime div-secoes: divisor entre o formulário e a lista, fora do foco", s0.divisor.classe && s0.divisor.entre && !s0.divisor.focavel, s0.divisor);
  ok("lst-paises (a2-a14d31901423): a 1280×900 nenhum item cortado", (await pagina.evaluate(() => [...document.querySelectorAll("#lst-paises [role=listitem]")].every(i => i.scrollHeight - i.clientHeight <= 1))));

  const fontes = {};
  for (const [nome, sel] of [["h1", "h1"], ["rótulo do nome", 'label[for="nome-pais"]'], ["mensagem", "#msg-orientacao .message-body"], ["lista", "#lst-paises .texto-secundario"], ["legenda", "#rad-situacao legend"], ["switch", "#swt-certificado label"]]) fontes[nome] = await fontesUsadas(contexto, pagina, sel);
  ok("a2-a39f3ad397d4 (controle): Rawline é a fonte usada no h1, no rótulo do nome, na mensagem, na lista, na legenda e no switch", Object.values(fontes).every(f => f.length && f.every(n => /rawline/i.test(n))), fontes);

  // primeiro Tab
  await pagina.keyboard.press("Tab");
  const primeiro = await pagina.evaluate(() => ({ dentro: !!document.activeElement.closest(".br-skiplink"), href: document.activeElement.getAttribute("href") }));
  ok("andaime skp-conteudo: o 1º Tab cai no atalho para #main-content", primeiro.dentro && primeiro.href === "#main-content", primeiro);

  // ordem de Tab no formulário (a2-0f20577609d3, a2-4aeca513aeeb, a2-d1039a4016fe, a2-186453b0926b)
  await pagina.focus("#btn-ajuda");
  const ordem = [];
  for (let i = 0; i < 8; i++) { await pagina.keyboard.press("Tab"); ordem.push(await pagina.evaluate(() => document.activeElement.id || document.activeElement.getAttribute("aria-label") || document.activeElement.tagName)); }
  ok("formulário: ordem de Tab segue o código (nome, código, continente, gatilho, situação, Cancelar, Limpar, Salvar)", JSON.stringify(ordem) === JSON.stringify(["nome-pais", "codigo-pais", "continente", "Exibir lista", "situacao-habilitado", "btn-cancelar", "btn-limpar", "btn-salvar"]), ordem);

  // inp-codigo aceita digitação logo depois do foco por Tab (comparação de a2-328f62cfe4ce)
  await pagina.focus("#nome-pais"); await pagina.keyboard.press("Tab"); await pagina.keyboard.type("CHL");
  ok("inp-codigo (a2-328f62cfe4ce, controle): com foco por Tab, o texto entra no campo", (await pagina.evaluate(() => document.getElementById("codigo-pais").value)) === "CHL");
  await pagina.fill("#codigo-pais", "");

  // radio: Espaço marca, setas movem
  await pagina.focus("#situacao-habilitado"); await pagina.keyboard.press("Space"); await pagina.keyboard.press("ArrowDown");
  const rdTec = await pagina.evaluate(() => ({ foco: document.activeElement.id, marcado: document.querySelector("input[name=situacao]:checked")?.id }));
  ok("rad-situacao (a2-186453b0926b): Espaço marca, seta move a escolha", rdTec.foco === "situacao-suspenso" && rdTec.marcado === "situacao-suspenso", rdTec);

  // switch: alterna pelo rótulo, efeito imediato, aria-checked acompanha, contêiner parado
  const antes = await pagina.evaluate(() => __caixa(document.querySelector("#swt-certificado input + label")));
  await pagina.click('label[for="certificado-automatico"]');
  const depois = await pagina.evaluate(() => ({ caixa: __caixa(document.querySelector("#swt-certificado input + label")), checked: document.getElementById("certificado-automatico").checked, aria: document.getElementById("certificado-automatico").getAttribute("aria-checked"), estado: getComputedStyle(document.querySelector("#swt-certificado .switch-data"), "::before").content, aviso: document.querySelector(".situacao-configuracao").textContent }));
  const axSw = await axNo(contexto, pagina, "#certificado-automatico");
  ok("swt-certificado (a2-14fa162258a8, a2-8f7b9c91d55e, a2-e9ded28efe9c, a2-5b4b95d8e2e0, a2-33e661bc4435, a2-002bf9be74ec): clicar o rótulo liga na hora, aria-checked=true, texto 'Ligada', árvore AX marcada, contêiner parado", depois.checked && depois.aria === "true" && depois.estado === '"Ligada"' && !!depois.aviso && axSw.checked === "true" && antes.x === depois.caixa.x && antes.y === depois.caixa.y, { ...depois, ax: axSw });
  await pagina.focus("#certificado-automatico"); await pagina.keyboard.press("Space");
  ok("swt-certificado (a2-f2a468af452d): Espaço alterna de volta", (await pagina.evaluate(() => document.getElementById("certificado-automatico").checked)) === false);

  // mensagem: Fechar pelo teclado → foco no h1; ajuda reexibe no mesmo lugar com foco no Fechar; fechar → foco volta à ajuda
  await pagina.focus("#msg-orientacao .fechar-mensagem"); await pagina.keyboard.press("Enter");
  const fechada = await pagina.evaluate(() => ({ existe: !!document.getElementById("msg-orientacao"), foco: document.activeElement.tagName }));
  await pagina.click("#btn-ajuda");
  const reaberta = await pagina.evaluate(() => { const m = document.getElementById("msg-orientacao"); return { existe: !!m, antesDaTrilha: !!m && !!(m.compareDocumentPosition(document.getElementById("brd-trilha")) & Node.DOCUMENT_POSITION_FOLLOWING), foco: document.activeElement.classList.contains("fechar-mensagem") }; });
  await pagina.keyboard.press("Enter");
  const voltou = await pagina.evaluate(() => ({ existe: !!document.getElementById("msg-orientacao"), foco: document.activeElement.id }));
  ok("msg-orientacao (a2-8536d91ce5b9, a2-14f2e6c3226f, a2-c7d20a2735ef, a2-db25bc1d1653): Fechar remove e o foco vai ao h1; a ajuda reexibe no mesmo lugar com foco no Fechar; ao fechar, o foco volta à ajuda",
    !fechada.existe && fechada.foco === "H1" && reaberta.existe && reaberta.antesDaTrilha && reaberta.foco && !voltou.existe && voltou.foco === "btn-ajuda", { fechada, reaberta, voltou });
  ok("estado S0: msg-erro oculta na carga", s0.erroOculto);
  const fimS0 = fechamento(registro);
  ok("estado S0 (pontos conformes): medido em até 120 s, sem recarga", fimS0.ok, `${fimS0.ms} ms`);
  const externosS0 = registro.pedidos.filter(u => !u.startsWith(url) && !u.startsWith("data:"));
  await pagina.close();

  // select: abrir, Esc, escolher, item selecionado
  {
    const { pagina: p } = await novaPagina(contexto, url);
    const fechadoIcone = await p.evaluate(() => document.querySelector("#sel-continente [data-trigger] i").className);
    await irS2(p);
    const aberto = await p.evaluate(() => { const l = document.querySelector("#sel-continente .br-list"); const c = getComputedStyle(l); return { sombra: c.boxShadow !== "none", icone: document.querySelector("#sel-continente [data-trigger] i").className, rolagem: l.scrollHeight - l.clientHeight, perto: __caixa(l).y - __caixa(document.querySelector("#sel-continente .br-input")).bottom }; });
    ok("sel-continente (a2-1f3279c0e6a1, a2-daf3655caedf, a2-83611c221e13, a2-386b2c116eb3): lista aberta com sombra, ícone alterna, 6 opções sem rolagem, junto do campo", aberto.sombra && /fa-angle-down/.test(fechadoIcone) && /fa-angle-up/.test(aberto.icone) && aberto.rolagem <= 1 && aberto.perto >= 0 && aberto.perto <= 16, { fechadoIcone, ...aberto });
    await p.keyboard.press("Escape");
    const esc = await p.evaluate(() => ({ aberta: document.querySelector("#sel-continente .br-list").hasAttribute("expanded"), valor: document.getElementById("continente").value }));
    ok("sel-continente (a2-654520f6ba0e): Esc recolhe sem escolher", !esc.aberta && esc.valor === "", esc);
    await irS2(p);
    await p.click('label[for="continente-op3"]');
    const escolhido = await p.evaluate(() => ({ valor: document.getElementById("continente").value, selecionado: document.querySelector("#continente-op3").closest(".br-item").classList.contains("selected") }));
    ok("sel-continente (a2-e85eefb9d6f2, a2-adae4a234fdd, a2-482ab9c4a4b1): escolher a opção a leva ao campo e marca o item como selecionado", escolhido.valor === "Ásia" && escolhido.selecionado, escolhido);
    await p.close();
  }

  // S1: retorno do envio vazio
  {
    const { pagina: p, registro: r1 } = await novaPagina(contexto, url);
    await irS1(p);
    const s1 = await p.evaluate(() => {
      const msg = document.getElementById("msg-erro");
      const desc = id => (document.getElementById(id).getAttribute("aria-describedby") || "").split(" ").filter(Boolean).map(d => document.getElementById(d)?.textContent.trim());
      const erroRadio = document.getElementById("situacao-erro"); const ultima = [...document.querySelectorAll("#rad-situacao .br-radio")].pop();
      return { classes: msg.className, papel: msg.querySelector(".content").getAttribute("role"), icone: msg.querySelector(".icon i").className, tipo: msg.querySelector(".icon .sr-only")?.textContent, texto: msg.querySelector(".content").innerText, fechar: msg.querySelectorAll(".close, button").length,
        largura: [__caixa(msg).right, __caixa(document.getElementById("form-pais")).right],
        nome: { desc: desc("nome-pais"), invalido: document.getElementById("nome-pais").getAttribute("aria-invalid"), borda: getComputedStyle(document.getElementById("nome-pais")).borderTopColor },
        continente: { desc: desc("continente"), invalido: document.getElementById("continente").getAttribute("aria-invalid") },
        situacao: { desc: desc("situacao-habilitado"), mensagens: document.querySelectorAll("#rad-situacao .feedback").length, abaixo: !!erroRadio && __caixa(erroRadio).y >= __caixa(ultima).bottom && Math.abs(__caixa(erroRadio).x - __caixa(ultima).x) <= 1, invalidas: document.querySelectorAll("#rad-situacao .br-radio.invalid").length },
        perigo: __token("--danger"), iconesCampos: [...document.querySelectorAll(".retorno-campo i")].map(i => [i.className, i.getAttribute("aria-hidden")]) };
    });
    ok("S1 msg-erro (a2-1adbb9c1a3ca, a2-f8e02fcd7de2, a2-952e88a5af0d, a2-55dab9d0155c, a2-e175765df557): tipo Erro, região viva, ícone times-circle, tipo em texto oculto, sem Fechar, até a borda direita do formulário",
      /\bdanger\b/.test(s1.classes) && s1.papel === "alert" && /fa-times-circle/.test(s1.icone) && s1.tipo === "Erro" && s1.fechar === 0 && Math.abs(s1.largura[0] - s1.largura[1]) <= 1, s1);
    ok("S1 msg-erro (a2-61f7e680f11b, a2-0ea33ff35779, a2-d6b3f0e36943 controle): diz que houve erro, por quê e o que fazer, sem termos técnicos", /Não foi possível/.test(s1.texto) && /Faltam/.test(s1.texto) && /Preencha/.test(s1.texto) && !/persistid|commit|endpoint|cache|HTTP|payload/i.test(s1.texto), s1.texto);
    ok("S1 campos (a2-d720ea8520cb, a2-56357b049872, a2-7bdc66f1d99d): nome e continente com texto de erro ligado por aria-describedby, aria-invalid e borda de erro", s1.nome.desc.includes("Informe o nome do país.") && s1.nome.invalido === "true" && s1.nome.borda === s1.perigo && s1.continente.desc.includes("Selecione o continente.") && s1.continente.invalido === "true", { nome: s1.nome, continente: s1.continente });
    ok("S1 situação (a2-6ee3ac4d9077, a2-35b101662a6e): uma mensagem para o grupo, abaixo da última opção, alinhada à esquerda; caixas com a classe invalid do DS", s1.situacao.mensagens === 1 && s1.situacao.abaixo && s1.situacao.invalidas === 3 && s1.situacao.desc.includes("Selecione a situação do cadastro."), s1.situacao);
    ok("S1 (a2-1d6a18d52408, a2-fe133882c34a): ícones das mensagens dos campos times-circle com aria-hidden", s1.iconesCampos.length === 3 && s1.iconesCampos.every(([c, h]) => /fa-times-circle/.test(c) && h === "true"), s1.iconesCampos);
    const axNome = await axNo(contexto, p, "#nome-pais");
    ok("S1 inp-nome-pais: árvore AX com nome, obrigatório e inválido", axNome.nome === "Nome do país" && axNome.required === true && axNome.invalid === "true", axNome);
    // erro persiste ao interagir sem corrigir (a2-46523775b9da)
    await p.focus("#codigo-pais"); await p.keyboard.press("Tab"); await p.click("#sel-continente [data-trigger]"); await p.keyboard.press("Escape");
    const persiste = await p.evaluate(() => !document.getElementById("msg-erro").hidden && document.querySelectorAll(".retorno-campo").length === 3 && document.querySelector("#sel-continente .br-input").classList.contains("danger"));
    ok("S1 (a2-46523775b9da): erro continua depois de interagir sem corrigir", persiste);
    const fimS1 = fechamento(r1);
    ok("estado S1 (pontos conformes): medido em até 120 s, sem recarga", fimS1.ok, `${fimS1.ms} ms`);
    await p.close();
  }

  // e-MAG 4.3 da página (fora da célula da lista): 640×450 sem rolagem horizontal; mensagem sem corte
  {
    const z = await navegador.newContext({ viewport: ZOOM_200 });
    const { pagina: p, registro: rz } = await novaPagina(z, url);
    const zm = await p.evaluate(() => { const cw = document.documentElement.clientWidth; const m = document.getElementById("msg-orientacao");
      return { sw: document.documentElement.scrollWidth, cw, alem: [...document.querySelectorAll("body *")].filter(e => __visivel(e) && e.getBoundingClientRect().right > cw + 1 && !e.closest(".sr-only") && !e.classList.contains("sr-only")).map(e => e.tagName + "." + e.className).slice(0, 5), msgCorte: m.scrollHeight - m.clientHeight }; });
    ok("página (e-MAG 4.3, a2-5432c282d0d7 controle em msg-orientacao): a 640×450 sem rolagem horizontal, nada além da janela, mensagem sem corte", zm.sw <= zm.cw && zm.alem.length === 0 && zm.msgCorte <= 1, zm);
    ok("página: sem erros de console a 640×450", rz.erros.length === 0, rz.erros.slice(0, 3).join(" | "));
    await z.close();
  }

  ok("página: core.min.js servido é o do pacote @govbr-ds/core 3.7.0, byte a byte",
    createHash("sha256").update(await readFile(join(DIST, "cadastro-pais/core.min.js"))).digest("hex") === createHash("sha256").update(await readFile(join(CORPUS, "node_modules/@govbr-ds/core/dist/core.min.js"))).digest("hex"));
  ok("página: pacote do DS é o 3.7.0", JSON.parse(await readFile(join(CORPUS, "node_modules/@govbr-ds/core/package.json"), "utf8")).version === "3.7.0");
  ok("página: nenhum pedido fora da origem servida", externosS0.length === 0, externosS0.slice(0, 3).join(" | "));
  ok("página: sem erros de console/página nem respostas 4xx/5xx em S0", registro.erros.length === 0, registro.erros.slice(0, 3).join(" | "));
  await contexto.close();
  return r;
}

// ---------------------------------------------------------------- execução
const VARIANTES = [
  { rotulo: "semeada", desfeitas: new Set() },
  { rotulo: "sem-semente", desfeitas: new Set(SEMENTES.map(s => s.celula)) },
  ...SEMENTES.map(s => ({ rotulo: `sem-${s.celula.split("::")[0]}`, desfeitas: new Set([s.celula]) })),
];
const relatorio = { pagina: PAGINA, corpus: CORPUS, sha256: {}, sorteio: { semente: sorteio._meta.semente, selo: sorteio._meta.selo }, variantes: {}, pontosConformes: {}, resumo: {} };
for (const [k, arq] of Object.entries(ARQ)) relatorio.sha256[arq] = createHash("sha256").update(ORIGINAL[k]).digest("hex");

for (const v of VARIANTES) {
  const url = await servir(montar(v.desfeitas));
  v.url = url;
  relatorio.variantes[v.rotulo] = await observaveis(url, v.rotulo);
}
relatorio.pontosConformes.semeada = await pontosConformes(VARIANTES[0].url);
relatorio.pontosConformes["sem-semente"] = await pontosConformes(VARIANTES[1].url);
await navegador.close();
for (const s of servidores) s.close();

// ---------------------------------------------------------------- veredito
const linhas = [];
const conta = { defeitos: [0, 0], semSemente: [0, 0], interferencias: 0, celulasIsoladas: [0, 0], estados: [0, 0], conformes: [0, 0] };
const sem = relatorio.variantes["sem-semente"];
const semeada = relatorio.variantes.semeada;
for (const s of SEMENTES) {
  const o = semeada.obs[s.celula], c = sem.obs[s.celula];
  conta.defeitos[1]++; if (o.violado) conta.defeitos[0]++;
  conta.semSemente[1]++; if (c.conformeSe && !c.violado) conta.semSemente[0]++;
  linhas.push(`${o.violado ? "ok  " : "FALHA"} [violado ${s.estado}] ${s.celula} — ${JSON.stringify(o.fato)}`);
  linhas.push(`${c.conformeSe && !c.violado ? "ok  " : "FALHA"} [sem semente: conforme] ${s.celula} — ${JSON.stringify(c.fato)}`);
}
for (const s of SEMENTES) {
  const v = relatorio.variantes[`sem-${s.celula.split("::")[0]}`];
  const propria = v.obs[s.celula].conformeSe && !v.obs[s.celula].violado;
  const outras = SEMENTES.filter(t => t !== s).filter(t => !v.obs[t.celula].violado).map(t => t.celula);
  conta.celulasIsoladas[1]++; if (propria && outras.length === 0) conta.celulasIsoladas[0]++;
  conta.interferencias += outras.length + (propria ? 0 : 1);
  linhas.push(`${propria && outras.length === 0 ? "ok  " : "FALHA"} [isolada] desfazer só ${s.celula}: ela conforme, as outras 8 violadas${outras.length ? ` — mudaram: ${outras.join(", ")}` : ""}`);
}
for (const [rotulo, v] of Object.entries(relatorio.variantes)) for (const [e, st] of Object.entries(v.estados)) {
  const ok = st.alcancado && st.ok && st.erros === 0;
  conta.estados[1]++; if (ok) conta.estados[0]++;
  if (!ok || rotulo === "semeada") linhas.push(`${ok ? "ok  " : "FALHA"} [estado] ${rotulo} ${e}: alcançado pelo gatilho declarado em ${st.ms} ms, sem recarga, sem erro`);
}
for (const [rotulo, pts] of Object.entries(relatorio.pontosConformes)) for (const p of pts) {
  conta.conformes[1]++; if (p.ok) conta.conformes[0]++;
  linhas.push(`${p.ok ? "ok  " : "FALHA"} [conforme · ${rotulo}] ${p.nome}${p.ok ? "" : ` — ${p.fato}`}`);
}
relatorio.resumo = {
  observaveisVioladosNaSemeada: `${conta.defeitos[0]}/${conta.defeitos[1]}`,
  observaveisConformesSemSemente: `${conta.semSemente[0]}/${conta.semSemente[1]}`,
  celulasIsoladasSemInterferencia: `${conta.celulasIsoladas[0]}/${conta.celulasIsoladas[1]}`,
  interferencias: conta.interferencias,
  estadosAlcancados: `${conta.estados[0]}/${conta.estados[1]}`,
  pontosConformes: `${conta.conformes[0]}/${conta.conformes[1]}`,
};
for (const l of linhas) console.log(l);
console.log("\n" + JSON.stringify(relatorio.resumo));
if (saida) await writeFile(saida, JSON.stringify(relatorio, null, 1) + "\n");
const tudo = conta.defeitos[0] === conta.defeitos[1] && conta.semSemente[0] === conta.semSemente[1] && conta.interferencias === 0 && conta.estados[0] === conta.estados[1] && conta.conformes[0] === conta.conformes[1];
process.exit(tudo ? 0 : 1);
