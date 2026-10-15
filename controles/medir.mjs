/**
 * Medição independente das páginas de controle (catálogo NAT-85/NAT-77) — sem modelo e sem oráculo.
 *
 *   node controles/medir.mjs [--raiz ../govbr-corpus/dist] [--saida controles/medicoes] [--so desenvolvimento|reservado]
 *
 * Nada aqui vem do govbr-ds-validator. A medição lê controles/expectativas.json (desenvolvimento) e
 * controles/reserva/expectativas.json (reserva) e, para cada gêmeo:
 *   1. confere os bytes publicados contra o sha256 da expectativa e o manifesto da ala;
 *   2. confere a mudança controlada: reaplicar as trocas declaradas aos bytes da página-par tem de
 *      dar exatamente os bytes do gêmeo (nada mais mudou);
 *   3. serve a raiz num servidor local, bloqueia qualquer pedido de fora e abre a página no Chromium
 *      do Playwright, sem interface, no viewport declarado (1280×900 se o catálogo não declara outro);
 *   4. executa a receita (preencher, clicar, focar, teclas) e, em cada captura, mede os fatos
 *      declarados: árvore de acessibilidade pelo CDP (nome, descrição, papel, estados, relações —
 *      inclusive dentro de raiz fechada), activeElement profundo, DOM e estilos calculados, recortes de tela;
 *   5. monta o pacote de evidência que o catálogo declara para o gêmeo (estado diferente, build
 *      diferente, traço sem passo, só DOM, proveniência) e confere a propriedade que o torna indecidível;
 *   6. roda o axe-core na página carregada e exige que toda violação esteja em `axePermitido`.
 * Arquiva bytes, estado, viewport, evidências e um manifesto sha256 em <saida>/<carimbo>/.
 * Termina com código 1 se qualquer fato, derivação, conferência de bytes ou axe falhar.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const AQUI = dirname(fileURLToPath(import.meta.url));
const arg = (nome, padrao) => (process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : padrao);
const RAIZ = arg("--raiz", null) ? resolve(arg("--raiz")) : resolve(AQUI, "../../govbr-corpus/dist");
const SAIDA = arg("--saida", null) ? resolve(arg("--saida")) : resolve(AQUI, "medicoes");
const SO = arg("--so", null);
const CARIMBO = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z";
const PASTA = join(SAIDA, CARIMBO);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json" };

// ------------------------------------------------------------------ servidor local, sem rede
const servidor = createServer((req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const alvo = resolve(RAIZ, "." + caminho);
    if (!alvo.startsWith(RAIZ)) throw new Error("fora da raiz");
    const corpo = readFileSync(alvo);
    res.writeHead(200, { "content-type": TIPOS[extname(alvo)] ?? "application/octet-stream", "cache-control": "no-store" }).end(corpo);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const conjuntos = [
  { divisao: "desenvolvimento", arquivo: join(AQUI, "expectativas.json") },
  { divisao: "reservado", arquivo: join(AQUI, "reserva", "expectativas.json") },
].filter((c) => !SO || c.divisao === SO);

const bytes = (caminhoWeb) => readFileSync(join(RAIZ, caminhoWeb));
const manifestos = new Map();
function manifestoDe(caminhoWeb) {
  const pasta = caminhoWeb.split("/").slice(0, -1).join("/");
  if (!manifestos.has(pasta)) manifestos.set(pasta, JSON.parse(readFileSync(join(RAIZ, pasta, "manifesto.json"), "utf8")).arquivos);
  return manifestos.get(pasta)[caminhoWeb.split("/").pop()];
}

// ------------------------------------------------------------------ utilidades de comparação
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function avaliarOp(op, medido, valor, capturas, fato) {
  switch (op) {
    case "igual":
      return igual(medido, valor);
    case "diferente":
      return !igual(medido, valor);
    case "vazio":
      return medido === "" || medido === null || medido === undefined || (Array.isArray(medido) && medido.length === 0);
    case "naoVazio":
      return !(medido === "" || medido === null || medido === undefined || (Array.isArray(medido) && medido.length === 0));
    case "ausente":
      return medido === undefined || medido === null;
    case "contem":
      return typeof medido === "string" && medido.includes(valor);
    case "naoContem":
      return typeof medido === "string" && !medido.includes(valor);
    case "em":
      return valor.includes(medido);
    case "naoEm":
      return !valor.includes(medido);
    case "entre":
      return typeof medido === "number" && medido >= valor[0] && medido <= valor[1];
    case "menorQue":
      return typeof medido === "number" && medido < valor;
    case "diferenteDaCaptura": {
      const anterior = capturas[valor]?.referencias?.[fato.expr];
      return anterior !== undefined && !igual(anterior, medido);
    }
    default:
      throw new Error(`operador desconhecido: ${op}`);
  }
}

// ------------------------------------------------------------------ árvore de acessibilidade (CDP)
function indexar(no, mapa = new Map()) {
  mapa.set(no.nodeId, no);
  for (const f of no.children ?? []) indexar(f, mapa);
  for (const s of no.shadowRoots ?? []) indexar(s, mapa);
  if (no.contentDocument) indexar(no.contentDocument, mapa);
  return mapa;
}
async function noDom(cdp, alvo) {
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const mapa = indexar(root);
  let ctx = root.nodeId;
  const partes = alvo.split(">>>").map((s) => s.trim());
  for (let i = 0; i < partes.length; i++) {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: ctx, selector: partes[i] });
    if (!nodeId) return null;
    if (i === partes.length - 1) return { nodeId, mapa };
    const host = mapa.get(nodeId);
    const raiz = host?.shadowRoots?.[0];
    if (!raiz) return null;
    ctx = raiz.nodeId;
  }
  return null;
}
const textoDe = (no, mapa) => (no.nodeType === 3 ? no.nodeValue : (no.children ?? []).map((f) => textoDe(f, mapa)).join(""));
async function axDe(cdp, alvo) {
  const achado = await noDom(cdp, alvo);
  if (!achado) return { existe: false };
  const no = achado.mapa.get(achado.nodeId);
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId: achado.nodeId, fetchRelatives: false });
  const ax = nodes.find((n) => n.backendDOMNodeId === no.backendNodeId) ?? nodes[0];
  const props = Object.fromEntries((ax?.properties ?? []).map((p) => [p.name, p.value]));
  const rel = (nome) => (props[nome]?.relatedNodes ?? []).map((r) => r.idref ?? r.backendDOMNodeId);
  const v = (nome) => props[nome]?.value;
  return {
    existe: true,
    ignorado: !!ax?.ignored,
    papel: ax?.role?.value,
    nome: ax?.name?.value ?? "",
    descricao: ax?.description?.value ?? "",
    invalido: v("invalid") === "true" || v("invalid") === true,
    expandido: v("expanded"),
    pressionado: v("pressed"),
    live: v("live"),
    nivel: v("level"),
    mensagemDeErro: rel("errormessage"),
    controla: rel("controls"),
    descritoPor: rel("describedby"),
    rotuladoPor: rel("labelledby"),
    textoProfundo: textoDe(no, achado.mapa).trim(),
  };
}
async function titulosAx(pagina, cdp) {
  const n = await pagina.evaluate(() => {
    const els = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]"));
    els.forEach((el, i) => el.setAttribute("data-medicao-titulo", String(i)));
    return els.length;
  });
  const lista = [];
  for (let i = 0; i < n; i++) {
    const a = await axDe(cdp, `[data-medicao-titulo="${i}"]`);
    if (a.papel === "heading" && !a.ignorado) lista.push([a.nivel, a.nome]);
  }
  await pagina.evaluate(() => document.querySelectorAll("[data-medicao-titulo]").forEach((el) => el.removeAttribute("data-medicao-titulo")));
  return lista;
}

// ------------------------------------------------------------------ DOM e foco
const SERIALIZAR = () => {
  const raizes = [];
  const andar = (no, caminho) => {
    for (const el of no.querySelectorAll("*")) {
      if (el.shadowRoot) {
        const c = caminho + " > " + el.tagName.toLowerCase();
        raizes.push({ host: c, html: el.shadowRoot.innerHTML });
        andar(el.shadowRoot, c);
      }
    }
  };
  andar(document, "document");
  return { html: document.documentElement.outerHTML, raizesAbertas: raizes };
};
const FOCO = () => {
  let a = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
  if (!a || a === document.body) return { tag: "body" };
  return { tag: a.tagName.toLowerCase(), id: a.id || null, classe: a.className || null, texto: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 60) };
};

async function preencher(pagina, alvo, valor) {
  if (alvo.includes(">>>")) {
    const host = pagina.locator(alvo.split(">>>")[0].trim());
    const caixa = await host.boundingBox();
    await host.click({ position: { x: 20, y: caixa.height - 14 } });
    await pagina.keyboard.press("Control+A");
    await pagina.keyboard.type(valor);
  } else await pagina.fill(alvo, valor);
}

async function recortar(pagina, alvo, margem, arquivo) {
  const caixa = await pagina.locator(alvo).boundingBox();
  const clip = { x: Math.max(0, caixa.x - margem), y: Math.max(0, caixa.y - margem), width: caixa.width + 2 * margem, height: caixa.height + 2 * margem };
  const png = await pagina.screenshot({ clip, animations: "disabled", caret: "hide" });
  writeFileSync(arquivo, png);
  return { sha256: sha256(png), clip };
}

// ------------------------------------------------------------------ fatos
async function medirFato(f, pagina, cdp, capturas, recortes) {
  if (f.tipo === "dom") {
    const medido = await pagina.evaluate(`(() => { const v = (${f.expr}); return v instanceof Node ? '[elemento]' : v === undefined ? null : v; })()`);
    return { medido, ok: avaliarOp(f.op, medido, f.valor, capturas, f) };
  }
  if (f.tipo === "ax") {
    const a = await axDe(cdp, f.alvo);
    if (!a.existe) return { medido: "[alvo inexistente]", ok: false };
    const medido = a[f.prop];
    return { medido: medido === undefined ? null : medido, ok: avaliarOp(f.op, medido, f.valor, capturas, f), papel: a.papel, nome: a.nome };
  }
  if (f.tipo === "foco") {
    const ok = await pagina.evaluate((sel) => {
      let a = document.activeElement;
      while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
      if (sel === "body") return !a || a === document.body;
      return a === document.querySelector(sel);
    }, f.alvo);
    return { medido: await pagina.evaluate(FOCO), ok };
  }
  if (f.tipo === "titulos") {
    const medido = await titulosAx(pagina, cdp);
    return { medido, ok: igual(medido, f.valor) };
  }
  if (f.tipo === "recortes") {
    const a = recortes[f.a];
    const b = recortes[f.b];
    if (!a || !b) return { medido: "[recorte ausente]", ok: false };
    return { medido: { a: a.sha256, b: b.sha256 }, ok: (a.sha256 === b.sha256) === f.iguais };
  }
  throw new Error(`tipo de fato desconhecido: ${f.tipo}`);
}

// ------------------------------------------------------------------ execução de um gêmeo numa página
async function executar(navegador, g, caminhoWeb, pastaGemeo) {
  const contexto = await navegador.newContext({
    viewport: g.viewport,
    deviceScaleFactor: 1,
    hasTouch: !!g.toque,
    isMobile: !!g.toque,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const externos = [];
  await contexto.route("**/*", (rota) => {
    const u = new URL(rota.request().url());
    if (u.origin === BASE) return rota.continue();
    externos.push(rota.request().url());
    return rota.abort();
  });
  await contexto.addInitScript(() => {
    window.__focos = [];
    document.addEventListener("focusin", (e) => window.__focos.push(e.composedPath()[0]), true);
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on("pageerror", (e) => erros.push(String(e)));
  pagina.on("console", (m) => {
    if (m.type() === "error") erros.push(m.text());
  });
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("DOM.enable");
  await cdp.send("Accessibility.enable");
  const resposta = await pagina.goto(BASE + caminhoWeb, { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);

  // referências pedidas por fatos "diferenteDaCaptura", por nome da captura
  const referencias = {};
  for (const lista of Object.values(g.fatos))
    for (const f of lista) if (f.op === "diferenteDaCaptura") (referencias[f.valor] ??= []).push(f.expr);

  const capturas = {};
  const recortes = {};
  const traco = [];
  const passos = [];
  for (const passo of g.receita) {
    passos.push(passo);
    if (passo.acao === "preencher") await preencher(pagina, passo.alvo, passo.valor);
    else if (passo.acao === "clicar") await pagina.click(passo.alvo);
    else if (passo.acao === "focar") await pagina.focus(passo.alvo);
    else if (passo.acao === "focarSemRolar") await pagina.evaluate((s) => document.querySelector(s).focus({ preventScroll: true }), passo.alvo);
    else if (passo.acao === "tecla") await pagina.keyboard.press(passo.tecla);
    else if (passo.acao === "rolar") await pagina.evaluate((y) => window.scrollTo(0, y), passo.y);
    else if (passo.acao === "rolarAte")
      await pagina.evaluate(({ alvo, topo }) => window.scrollTo(0, window.scrollY + document.querySelector(alvo).getBoundingClientRect().top - topo), passo);
    else if (passo.acao === "recortar") {
      await pagina.waitForTimeout(150);
      recortes[passo.nome] = await recortar(pagina, passo.alvo, passo.margem ?? 8, join(pastaGemeo, `recorte-${passo.nome}.png`));
      traco.push({ passo: passos.length, acao: passo.acao, nome: passo.nome, recorte: recortes[passo.nome] });
      continue;
    } else if (passo.acao === "capturar") {
      await pagina.waitForTimeout(150);
      const cap = { nome: passo.nome, passo: passos.length, foco: await pagina.evaluate(FOCO), referencias: {} };
      for (const expr of referencias[passo.nome] ?? []) cap.referencias[expr] = await pagina.evaluate(`(() => { const v = (${expr}); return v instanceof Node ? '[elemento]' : v === undefined ? null : v; })()`);
      cap.dom = await pagina.evaluate(SERIALIZAR);
      capturas[passo.nome] = cap;
      cap.fatos = [];
      for (const f of g.fatos[passo.nome] ?? []) cap.fatos.push({ ...f, ...(await medirFato(f, pagina, cdp, capturas, recortes)) });
      traco.push({ passo: passos.length, acao: "capturar", nome: passo.nome, foco: cap.foco });
      continue;
    } else throw new Error(`ação desconhecida: ${passo.acao}`);
    await pagina.waitForTimeout(60);
    traco.push({ passo: passos.length, acao: passo.acao, ...(passo.alvo ? { alvo: passo.alvo } : {}), ...(passo.tecla ? { tecla: passo.tecla } : {}), foco: await pagina.evaluate(FOCO) });
  }
  const capturasSemFato = Object.keys(g.fatos).filter((n) => !capturas[n]);
  await contexto.close();
  return { status: resposta.status(), erros, externos, capturas, recortes, traco, capturasSemFato };
}

async function axe(navegador, g, caminhoWeb) {
  const contexto = await navegador.newContext({ viewport: g.viewport, hasTouch: !!g.toque, isMobile: !!g.toque });
  await contexto.route("**/*", (rota) => (new URL(rota.request().url()).origin === BASE ? rota.continue() : rota.abort()));
  const pagina = await contexto.newPage();
  await pagina.goto(BASE + caminhoWeb, { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);
  const r = await new AxeBuilder({ page: pagina }).analyze();
  await contexto.close();
  return r.violations.map((v) => ({ id: v.id, impacto: v.impact, alvos: v.nodes.map((n) => n.target.join(" ")) }));
}

// ------------------------------------------------------------------ principal
mkdirSync(PASTA, { recursive: true });
const navegador = await chromium.launch({ headless: true });
const resumo = { carimbo: CARIMBO, raiz: relative(join(AQUI, ".."), RAIZ), base: "127.0.0.1 (porta efêmera), pedidos externos abortados", navegador: navegador.version(), conjuntos: {} };
let falhas = 0;
const axeCache = new Map();

for (const { divisao, arquivo } of conjuntos) {
  const exp = JSON.parse(readFileSync(arquivo, "utf8"));
  const sub = divisao === "reservado" ? "reserva" : "desenvolvimento";
  const pastaDiv = join(PASTA, sub);
  mkdirSync(pastaDiv, { recursive: true });
  const linhas = [];
  for (const g of exp.gemeos) {
    const pastaGemeo = join(pastaDiv, g.gemeo);
    mkdirSync(pastaGemeo, { recursive: true });
    const problemas = [];

    // 1. bytes e manifesto
    const html = bytes(g.pagina.caminho);
    if (sha256(html) !== g.pagina.sha256) problemas.push("sha256 da página difere da expectativa");
    if (manifestoDe(g.pagina.caminho) !== sha256(html)) problemas.push("sha256 da página difere do manifesto da ala");
    let js = null;
    if (g.pagina.js) {
      js = bytes(g.pagina.js);
      if (sha256(js) !== g.pagina.jsSha256) problemas.push("sha256 do script difere da expectativa");
      if (manifestoDe(g.pagina.js) !== sha256(js)) problemas.push("sha256 do script difere do manifesto da ala");
    }
    writeFileSync(join(pastaGemeo, "pagina.html"), html);
    if (js) writeFileSync(join(pastaGemeo, "pagina.js"), js);

    // 2. mudança controlada
    let derivacao = null;
    if (g.derivacao) {
      const doPar = bytes(g.derivacao.paginaDe).toString("utf8");
      const idPar = g.derivacao.paginaDe.split("/").pop().replace(".html", "");
      let reconstruido = doPar.split(`${idPar}.js`).join("__JS__");
      const erros = [];
      for (const [antigo, novo] of g.derivacao.trocas) {
        const n = reconstruido.split(antigo).length - 1;
        if (n !== 1) erros.push(`troca com ${n} ocorrências`);
        else reconstruido = reconstruido.replace(antigo, () => novo);
      }
      reconstruido = reconstruido.split("__JS__").join(`${g.pagina.id}.js`);
      const okHtml = erros.length === 0 && reconstruido === html.toString("utf8");
      let okJs = true;
      if (g.pagina.js) {
        let rjs = bytes(g.derivacao.paginaDe.replace(/\.html$/, ".js")).toString("utf8");
        for (const [antigo, novo] of g.derivacao.trocasJs) {
          if (rjs.split(antigo).length - 1 !== 1) okJs = false;
          else rjs = rjs.replace(antigo, () => novo);
        }
        okJs = okJs && rjs === js.toString("utf8");
      }
      derivacao = { de: g.derivacao.de, paginaDe: g.derivacao.paginaDe, trocas: g.derivacao.trocas.length + g.derivacao.trocasJs.length, ok: okHtml && okJs, erros };
      if (!derivacao.ok) problemas.push(`a página não é o par + trocas declaradas (${erros.join("; ") || "bytes diferentes"})`);
      if (g.derivacao.trocas.length + g.derivacao.trocasJs.length === 0 && g.derivacao.mudanca !== "cópia byte a byte") problemas.push("derivação sem troca");
    }

    // 3–4. execução e fatos
    // Falha de soquete do próprio Windows no servidor local (ERR_ADDRESS_IN_USE) não é fato da página:
    // repete a execução inteira, no máximo duas vezes, e registra quantas tentativas houve.
    let ex;
    let tentativas = 0;
    do {
      tentativas += 1;
      ex = await executar(navegador, g, g.pagina.caminho, pastaGemeo);
    } while (tentativas < 3 && ex.erros.some((e) => /ERR_ADDRESS_IN_USE|ERR_CONNECTION_(RESET|REFUSED)/.test(e)));
    if (ex.status !== 200) problemas.push(`HTTP ${ex.status}`);
    if (ex.erros.length) problemas.push(`erros no console: ${ex.erros.join(" | ")}`);
    if (ex.externos.length) problemas.push(`pedidos externos: ${ex.externos.join(", ")}`);
    if (ex.capturasSemFato.length) problemas.push(`capturas declaradas não executadas: ${ex.capturasSemFato.join(", ")}`);
    const fatos = Object.values(ex.capturas).flatMap((c) => c.fatos.map((f) => ({ captura: c.nome, ...f })));
    for (const f of fatos.filter((f) => !f.ok)) problemas.push(`fato falhou em ${f.captura}: ${f.tipo} ${f.alvo ?? f.expr ?? ""} ${f.prop ?? ""} ${f.op ?? ""} ${JSON.stringify(f.valor ?? f.iguais)} → ${JSON.stringify(f.medido)}`);

    // 5. pacote de evidência declarado
    const hashBuild = sha256(Buffer.concat([html, js ?? Buffer.alloc(0)]));
    let pacote = {
      tipo: g.pacote?.tipo ?? "completo",
      pagina: g.pagina.caminho,
      hashBuild,
      viewport: g.viewport,
      toque: g.toque,
      eProv: "pagina",
      receita: g.receita,
      tracoFoco: ex.traco,
      capturas: Object.fromEntries(Object.entries(ex.capturas).map(([n, c]) => [n, { passo: c.passo, foco: c.foco, ...(g.receita.find((p) => p.nome === n && p.soDom) ? { dom: c.dom } : { dom: c.dom, ax: c.fatos.filter((f) => f.tipo === "ax") }) }])),
    };
    const verificacoesPacote = [];
    if (g.pacote?.tipo === "estado-diferente") {
      const entregue = ex.capturas[g.pacote.entregue];
      pacote = { ...pacote, estadoDeclarado: g.pacote.declarado, estadoEntregue: g.pacote.entregue, capturas: { [g.pacote.entregue]: pacote.capturas[g.pacote.entregue] } };
      verificacoesPacote.push({ o_que: "o pacote traz só um estado, diferente do declarado", ok: !!entregue && g.pacote.entregue !== g.pacote.declarado });
    } else if (g.pacote?.tipo === "build-de") {
      const outro = (exp.gemeos.find((x) => x.gemeo === g.pacote.gemeoDaEvidencia) ?? {}).pagina;
      const bOutro = bytes(outro.caminho);
      const exOutro = await executar(navegador, { ...g, fatos: {} }, outro.caminho, pastaGemeo);
      const hashOutro = sha256(Buffer.concat([bOutro, outro.js ? bytes(outro.js) : Buffer.alloc(0)]));
      pacote = { ...pacote, hashBuild: hashOutro, paginaDaEvidencia: outro.caminho, tracoFoco: exOutro.traco, capturas: Object.fromEntries(Object.entries(exOutro.capturas).map(([n, c]) => [n, { passo: c.passo, foco: c.foco, dom: c.dom }])) };
      verificacoesPacote.push({ o_que: "o hash do build no pacote é de outra página", ok: hashOutro !== hashBuild, hashDaPagina: hashBuild, hashNoPacote: hashOutro });
    } else if (g.pacote?.tipo === "traco-sem-passo") {
      const retirar = g.pacote.passoRetirado;
      const completo = ex.traco.some((t) => t.nome === retirar);
      const cortado = ex.traco.filter((t) => t.nome !== retirar && (t.passo > (ex.traco.find((x) => x.nome === retirar)?.passo ?? 0)));
      pacote = { ...pacote, tracoFoco: cortado, capturas: Object.fromEntries(Object.entries(pacote.capturas).filter(([n]) => n !== retirar)) };
      verificacoesPacote.push({ o_que: `o traço medido tem '${retirar}' e o pacote não`, ok: completo && !cortado.some((t) => t.nome === retirar) });
    } else if (g.pacote?.tipo === "so-dom") {
      pacote = { ...pacote, capturas: Object.fromEntries(Object.entries(ex.capturas).map(([n, c]) => [n, { passo: c.passo, dom: c.dom }])) };
      delete pacote.tracoFoco;
      verificacoesPacote.push({ o_que: "o pacote não traz E-AX", ok: Object.values(pacote.capturas).every((c) => !("ax" in c)) });
    } else if (g.pacote?.tipo === "proveniencia") {
      pacote = { ...pacote, eProv: g.pacote.origem };
      verificacoesPacote.push({ o_que: `E-PROV = ${g.pacote.origem}`, ok: true });
    }
    for (const v of verificacoesPacote.filter((v) => !v.ok)) problemas.push(`pacote: ${v.o_que}`);

    // 6. axe
    const chaveAxe = `${g.pagina.caminho}@${g.viewport.width}x${g.viewport.height}${g.toque ? "+toque" : ""}`;
    if (!axeCache.has(chaveAxe)) axeCache.set(chaveAxe, await axe(navegador, g, g.pagina.caminho));
    const violacoes = axeCache.get(chaveAxe);
    const naoPermitidas = violacoes.filter((v) => !g.axePermitido.includes(v.id));
    if (naoPermitidas.length) problemas.push(`axe fora do permitido: ${naoPermitidas.map((v) => `${v.id} [${v.alvos.join(", ")}]`).join("; ")}`);

    const registro = {
      gemeo: g.gemeo,
      caso: g.caso,
      papel: g.papel,
      pagina: g.pagina,
      viewport: g.viewport,
      toque: g.toque,
      derivacao,
      fatos,
      pacote,
      verificacoesPacote,
      tentativas,
      axe: { violacoes, permitido: g.axePermitido },
      problemas,
      ok: problemas.length === 0,
    };
    writeFileSync(join(pastaGemeo, "medicao.json"), JSON.stringify(registro, null, 2) + "\n");
    writeFileSync(join(pastaGemeo, "pacote.json"), JSON.stringify(pacote, null, 2) + "\n");
    if (!registro.ok) falhas += 1;
    linhas.push({ gemeo: g.gemeo, ok: registro.ok, fatos: fatos.length, fatosOk: fatos.filter((f) => f.ok).length, axe: violacoes.map((v) => v.id), problemas });
    console.log(`${registro.ok ? "ok  " : "FALHA"} ${divisao.padEnd(15)} ${g.gemeo.padEnd(9)} ${fatos.filter((f) => f.ok).length}/${fatos.length} fatos${violacoes.length ? "  axe: " + violacoes.map((v) => v.id).join(",") : ""}${problemas.length ? "\n      " + problemas.join("\n      ") : ""}`);
  }
  // T-01: os dois pacotes só diferem no E-PROV
  const tP = join(pastaDiv, "T-01-P", "pacote.json");
  const tS = join(pastaDiv, "T-01-S", "pacote.json");
  if (existsSync(tP) && existsSync(tS)) {
    const limpar = (p) => {
      const o = JSON.parse(readFileSync(p, "utf8"));
      delete o.eProv;
      return JSON.stringify(o);
    };
    const ok = limpar(tP) === limpar(tS);
    linhas.push({ gemeo: "T-01 (P × S)", ok, fatos: 1, fatosOk: ok ? 1 : 0, axe: [], problemas: ok ? [] : ["os pacotes de T-01-P e T-01-S diferem além do E-PROV"] });
    if (!ok) falhas += 1;
    console.log(`${ok ? "ok  " : "FALHA"} ${divisao.padEnd(15)} T-01 P×S  pacotes iguais exceto E-PROV`);
  }
  resumo.conjuntos[divisao] = {
    expectativas: relative(join(AQUI, ".."), arquivo).split("\\").join("/"),
    expectativasSha256: sha256(readFileSync(arquivo)),
    gemeos: exp.gemeos.length,
    paginas: new Set(exp.gemeos.map((g) => g.pagina.id)).size,
    fatos: linhas.reduce((s, l) => s + l.fatos, 0),
    fatosOk: linhas.reduce((s, l) => s + l.fatosOk, 0),
    gemeosOk: linhas.filter((l) => l.ok && !l.gemeo.includes("×")).length,
    conferenciasExtras: linhas.filter((l) => l.gemeo.includes("×")).map((l) => ({ o_que: l.gemeo, ok: l.ok })),
    linhas,
  };
}
await navegador.close();
servidor.close();

// manifesto sha256 de tudo o que foi arquivado
const arquivos = {};
const andar = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) andar(p);
    else arquivos[relative(PASTA, p).split("\\").join("/")] = sha256(readFileSync(p));
  }
};
andar(PASTA);
resumo.falhas = falhas;
writeFileSync(join(PASTA, "resumo.json"), JSON.stringify(resumo, null, 2) + "\n");
arquivos["resumo.json"] = sha256(readFileSync(join(PASTA, "resumo.json")));
writeFileSync(join(PASTA, "manifesto.json"), JSON.stringify({ carimbo: CARIMBO, arquivos }, null, 2) + "\n");
for (const [d, c] of Object.entries(resumo.conjuntos))
  console.log(`\n${d}: ${c.gemeosOk}/${c.gemeos} gêmeos ok · ${c.fatosOk}/${c.fatos} fatos · ${c.paginas} páginas${c.conferenciasExtras.map((x) => ` · ${x.o_que} ${x.ok ? "ok" : "FALHA"}`).join("")}`);
console.log(`arquivado em ${relative(process.cwd(), PASTA)}`);
process.exit(falhas ? 1 : 0);
