/**
 * Conferência da construção da tela A2 (`acompanhamento`) contra tela-a2/sorteio-2.json — sem modelo,
 * sem oráculo e sem axe (regra de reserva: nada disso roda na tela antes de a referência congelar).
 *
 * Serve o `dist/` do corpus num servidor local, abre /acompanhamento.html no Chromium do Playwright
 * (headless, 1280×900) e mede, para cada unidade sorteada, o fato declarado em
 * tela-a2/construcao.md: `defeito` tem de ser verdadeiro no hospedeiro (e na cópia compartilhada);
 * `conforme` tem de ser verdadeiro nos pontos de comparação, nas alternativas válidas, nos
 * chamarizes e na moldura da página. Cada estado parte de carga nova e termina em até 120 s
 * (plano § 14.5): S0 = carga; S1 = clicar a aba Documentos; S2 = S1 + clicar Enviar Documento com o
 * formulário vazio. A medida da e-MAG 2.3 roda em contexto próprio, em paralelo, numa janela de
 * 360 s (≥ 2 eventos load do documento + a meta). Nada é importado do govbr-ds-validator.
 *
 * Uso: node tela-a2/conferir-construcao.mjs [--capturas <dir>] [--sem-janela-recarga]
 *      (`--sem-janela-recarga` pula só a janela de 360 s, para iteração; a conferência fica incompleta
 *      e sai com código 2)
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { createHash } from "crypto";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(AQUI, "../../govbr-corpus");
const DIST = join(CORPUS, "dist");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const args = process.argv.slice(2);
const capturas = args.includes("--capturas") ? args[args.indexOf("--capturas") + 1] : null;
const semJanelaRecarga = args.includes("--sem-janela-recarga");
const VIEWPORT = { width: 1280, height: 900 };
const JANELA_RECARGA_MS = 360_000;
const LIMITE_ESTADO_MS = 120_000;

const servidor = createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const corpo = await readFile(join(DIST, caminho));
    res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" }).end(corpo);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(ok => servidor.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${servidor.address().port}`;
const URL_TELA = `${base}/acompanhamento.html`;

const resultados = [];
const medir = (unidade, tipo, valor, detalhe = "") => resultados.push({ unidade, tipo, ok: valor === true, detalhe: typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe) });

const navegador = await chromium.launch({ headless: true });

// ---------- e-MAG 2.3 em contexto próprio (corre em paralelo ao resto)
async function janelaRecarga() {
  const contexto = await navegador.newContext({ viewport: VIEWPORT });
  const pagina = await contexto.newPage();
  const cargas = [];
  const inicio = Date.now();
  pagina.on("load", () => cargas.push(Date.now() - inicio));
  await pagina.goto(URL_TELA);
  const meta = await pagina.evaluate(() => [...document.querySelectorAll('meta[http-equiv="refresh" i]')].map(m => m.getAttribute("content")));
  await pagina.waitForTimeout(Math.max(0, JANELA_RECARGA_MS - (Date.now() - inicio)));
  await contexto.close();
  return { meta, cargas };
}
const recarga = semJanelaRecarga ? null : janelaRecarga();

// ---------- contexto das medidas por estado
const contexto = await navegador.newContext({ viewport: VIEWPORT });
const pagina = await contexto.newPage();
const erros = [];
const pedidos = [];
pagina.on("pageerror", e => erros.push(String(e)));
pagina.on("console", m => { if (m.type() === "error") erros.push(m.text()); });
pagina.on("request", r => pedidos.push(r.url()));
pagina.on("response", r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`); });

let inicioEstado = 0;
let cargasNoEstado = 0;
pagina.on("load", () => { cargasNoEstado += 1; });
const abrir = async () => {
  await pagina.goto(URL_TELA);
  await pagina.evaluate(() => document.fonts.ready);
  inicioEstado = Date.now();
  cargasNoEstado = 0;
};
const fecharEstado = nome => medir(`estado ${nome}: medido em até 120 s da carga, sem recarga no meio`, "conforme",
  Date.now() - inicioEstado < LIMITE_ESTADO_MS && cargasNoEstado === 0, `${Date.now() - inicioEstado} ms`);
const irParaS1 = async () => { await abrir(); await pagina.click("#aba-documentos"); await pagina.waitForSelector("#painel-documentos.active"); };
const irParaS2 = async () => { await irParaS1(); await pagina.click(".acao-enviar"); await pagina.waitForSelector("#msg-retorno"); };

// funções medidas dentro da página
const NA_PAGINA = `
  window.__centro = el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; };
  window.__desvio = (botao) => { const b = __centro(botao), i = __centro(botao.querySelector('i')); return Math.max(Math.abs(b.x - i.x), Math.abs(b.y - i.y)); };
  window.__ocultoVisual = span => { const r = span.getBoundingClientRect(); const c = getComputedStyle(span); return r.width <= 1 && r.height <= 1 && c.clip === 'rect(0px, 0px, 0px, 0px)'; };
  window.__escrito = span => { const r = span.getBoundingClientRect(); const c = getComputedStyle(span); if (!(r.width > 20 && r.height > 8 && c.clip === 'auto' && c.visibility === 'visible' && c.opacity !== '0')) return false; const alvo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!alvo && (alvo === span || span.contains(alvo)); };
`;
const preparar = () => pagina.evaluate(NA_PAGINA);

const axNo = async seletor => {
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("DOM.enable"); await cdp.send("Accessibility.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: seletor });
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  await cdp.detach();
  const n = nodes[0];
  return { nome: n?.name?.value ?? null, papel: n?.role?.value ?? null, ignorado: n?.ignored ?? null, descricao: n?.description?.value ?? null };
};
const fonteUsada = async seletor => {
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: seletor });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  await cdp.detach();
  return fonts.map(f => f.familyName);
};

// ---------- página servida (HTML cru, como chega ao navegador)
const htmlServido = await (await fetch(URL_TELA)).text();
const sha = async caminho => createHash("sha256").update(await readFile(caminho)).digest("hex");
medir("página: sem bloco style nem script embutido no HTML servido", "conforme", !/<style[\s>]/i.test(htmlServido) && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(htmlServido));
medir("página: elementos vazios sem barra de fechamento ('/>') no HTML servido", "conforme", !/\/>/.test(htmlServido), String((htmlServido.match(/\/>/g) ?? []).length));
medir("página: script sem type/language e link sem type", "conforme", !/<script[^>]*\b(type|language)=/i.test(htmlServido) && !/<link[^>]*\btype=/i.test(htmlServido));
medir("página: core.min.js servido é o do pacote @govbr-ds/core 3.7.0, byte a byte", "conforme",
  (await sha(join(DIST, "acompanhamento/core.min.js"))) === (await sha(join(CORPUS, "node_modules/@govbr-ds/core/dist/core.min.js"))));
const versaoCore = JSON.parse(await readFile(join(CORPUS, "node_modules/@govbr-ds/core/package.json"), "utf8")).version;
medir("página: pacote do DS é o 3.7.0", "conforme", versaoCore === "3.7.0", versaoCore);

// ================================================================ S0
await abrir();
await preparar();
if (capturas) await pagina.screenshot({ path: join(capturas, "tela-a2-S0.png"), fullPage: true });

const s0 = await pagina.evaluate(() => {
  const cs = (el, pse) => getComputedStyle(typeof el === "string" ? document.querySelector(el) : el, pse);
  const raiz = getComputedStyle(document.documentElement);
  const token = nome => raiz.getPropertyValue(nome).trim();
  const ordem = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  const main = document.querySelector("main");
  const header = document.querySelector(".br-header");
  const footer = document.querySelector(".br-footer");
  const visivel = el => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.display !== "none" && c.visibility !== "hidden"; };
  const etapas = [...document.querySelectorAll("#stp-andamento .step-progress-btn")];
  const tabela = document.querySelector("#tbl-movimentacoes table");
  const ths = [...tabela.querySelectorAll("th")];
  const idsTh = new Set(ths.map(t => t.id));
  const tds = [...tabela.querySelectorAll("tbody td")];
  const pend = document.getElementById("msg-pendencia");
  const card = document.getElementById("crd-resumo");
  const textoCard = card.innerText;
  const nup = textoCard.indexOf("NUP");
  return {
    doctype: document.doctype && document.doctype.name === "html" && !document.doctype.publicId && !document.doctype.systemId,
    lang: document.documentElement.lang,
    charset: document.characterSet,
    xua: !!document.querySelector('meta[http-equiv="X-UA-Compatible" i]'),
    refresh: [...document.querySelectorAll('meta[http-equiv="refresh" i]')].map(m => m.getAttribute("content")),
    titulo: document.title,
    mains: document.querySelectorAll("main, [role=main]").length,
    mainVisivel: visivel(main),
    header: !!header && visivel(header) && ordem(header, main) && header.getBoundingClientRect().top === 0,
    footer: !!footer && visivel(footer) && ordem(main, footer),
    skip: (() => { const s = document.querySelector(".br-skiplink"); return !!s && document.body.firstElementChild === s && [...s.querySelectorAll("a")].every(a => !!document.querySelector(a.getAttribute("href"))); })(),
    trilha: (() => { const t = document.querySelector(".br-breadcrumb"); return !!t && main.querySelector(".container-lg").firstElementChild === t && !!t.querySelector('[aria-current="page"]'); })(),
    headings: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(h => h.tagName + ":" + h.textContent.trim()),
    noscript: (() => { const ns = [...document.querySelectorAll("noscript")]; const s = document.querySelector(".br-skiplink"); return { total: ns.length, depoisDoAtalho: ns.length === 1 && s?.nextElementSibling === ns[0], texto: ns[0]?.textContent.trim() ?? "" }; })(),
    atalhosPapeis: [...document.querySelectorAll(".br-skiplink, .br-skiplink *")].map(e => e.getAttribute("role")).filter(Boolean),
    trilhaAtual: (() => { const a = document.querySelector('.br-breadcrumb [aria-current="page"]'); return { tag: a.tagName, tabindex: a.getAttribute("tabindex"), tabIndex: a.tabIndex }; })(),
    links: [...document.querySelectorAll("a[href]")].map(a => ({ href: a.getAttribute("href"), texto: a.textContent.replace(/\s+/g, " ").trim() })),
    sms: (() => { const t = document.body.textContent; const i = t.indexOf("SMS"); return i < 0 ? null : t.slice(i, i + 40).replace(/\s+/g, " "); })(),
    // tab
    abaFonte: [...document.querySelectorAll("#tab-requerimento .tab-item button")].map(b => [cs(b).fontSize, cs(b).fontWeight]),
    tokenBase: token("--font-size-scale-base"), tokenUp02: token("--font-size-scale-up-02"),
    abaSelecionada: [...document.querySelectorAll("#tab-requerimento [role=tab]")].map(b => b.getAttribute("aria-selected")),
    // h2 da seção de dúvidas
    h2Duvidas: [cs(".titulo-duvidas").fontSize, cs(".titulo-duvidas").fontWeight],
    // step
    indicadores: etapas.map(e => { const c = cs(e, "::before"); return { vis: c.visibility, disp: c.display, w: c.width, h: c.height, conteudo: c.content }; }),
    etapaAtual: etapas.map(e => e.getAttribute("aria-current")),
    // message de pendência
    pendFecharTag: pend.querySelector(".close .fechar-mensagem").tagName,
    pendFecharDesvio: __desvio(pend.querySelector(".close .fechar-mensagem")),
    pendFecharSpanOculto: __ocultoVisual(pend.querySelector(".fechar-mensagem .rotulo-botao")),
    pendApresentacao: { font: pend.querySelectorAll("font[color]").length, align: pend.querySelectorAll("[align]").length },
    pendTipoOculto: (() => { const s = pend.querySelector(".icon .sr-only"); return !!s && __ocultoVisual(s) ? s.textContent : null; })(),
    pendTextoVisivelComecaComTipo: /^(Atenção|Alerta|Erro)\s*:/i.test(pend.querySelector(".content").innerText.trim()),
    // tooltips (gatilhos)
    gatilhos: ["tip-protocolo-gatilho", "tip-prazo-gatilho"].map(id => { const b = document.getElementById(id); const s = b.querySelector(".rotulo-botao"); return { id, escrito: __escrito(s), oculto: __ocultoVisual(s), texto: s.textContent, desvio: __desvio(b), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, rotulo: b.getAttribute("aria-label"), labelledby: b.getAttribute("aria-labelledby") }; }),
    baloesOcultosNaCarga: [...document.querySelectorAll("#crd-resumo .br-tooltip")].every(t => getComputedStyle(t).visibility !== "visible"),
    // tabela
    tabela: {
      captionPrimeiro: tabela.firstElementChild.tagName === "CAPTION" && !!tabela.caption.textContent.trim(),
      thNoThead: ths.length === 3 && ths.every(t => t.parentElement.parentElement.tagName === "THEAD"),
      tbody: !!tabela.tBodies.length && tds.length === 15,
      headersOk: tds.every(td => (td.getAttribute("headers") || "").split(" ").filter(Boolean).every(id => idsTh.has(id)) && !!td.getAttribute("headers")),
      semScope: !tabela.querySelector("[scope]"),
    },
    // card (chamariz)
    card: { classe: card.classList.contains("br-card"), fundo: cs(card).backgroundColor, sombra: cs(card).boxShadow !== "none", nupPrimeira: textoCard.slice(Math.max(0, nup - 34), nup + 4), apresentacao: card.querySelectorAll("font, [align]").length, rotulo: card.querySelector(".card-footer a")?.getAttribute("href") },
    // divisor entre seções (chamariz)
    divisor: (() => { const d = document.getElementById("div-secoes"); return { classe: d.classList.contains("br-divider"), cor: cs(d).borderTopColor, largura: cs(d).borderTopWidth, estilo: cs(d).borderTopStyle, focavel: d.tabIndex >= 0, entre: ordem(document.getElementById("tab-requerimento"), d) && ordem(d, document.querySelector(".secao-duvidas")) }; })(),
    cinza20: getComputedStyle(document.documentElement).getPropertyValue("--gray-20").trim(),
    // botão voltar (chamariz)
    voltar: (() => { const v = document.querySelector(".acao-voltar"); return { tag: v.tagName, classes: v.className, href: v.getAttribute("href"), texto: v.textContent.trim() }; })(),
    // accordion antes de interagir
    accExpandido: [...document.querySelectorAll("#acc-duvidas .header")].map(h => h.getAttribute("aria-expanded")),
    accSingle: document.getElementById("acc-duvidas").getAttribute("single"),
    secaoDuvidas: document.querySelector(".titulo-duvidas").closest("section") !== null,
  };
});

medir("página: DOCTYPE html, lang pt-BR, UTF-8, X-UA-Compatible, título descritivo", "conforme",
  s0.doctype && s0.lang === "pt-BR" && s0.charset === "UTF-8" && s0.xua && /Acompanhar requerimento/.test(s0.titulo), [s0.lang, s0.charset, s0.titulo]);
medir("página: hierarquia de títulos h1 → h2 sem salto", "conforme", s0.headings[0].startsWith("H1:") && s0.headings.slice(1).every(h => h.startsWith("H2:")), s0.headings);
medir("moldura: região principal (main) única e visível", "conforme", s0.mains === 1 && s0.mainVisivel);
medir("chamariz hdr-govbr: br-header visível no topo, antes do main", "conforme", s0.header);
medir("chamariz ftr-govbr: br-footer visível depois do main", "conforme", s0.footer);
medir("chamariz skp-conteudo: br-skiplink primeiro no body, âncoras existem", "conforme", s0.skip);
const axAtalhos = await axNo(".br-skiplink");
const axAtalho1 = await axNo('.br-skiplink a[href="#main-content"]');
medir("chamariz skp-conteudo: atalhos como navegação com links (sem papel de menu na marcação nem na árvore de acessibilidade)", "conforme",
  s0.atalhosPapeis.length === 0 && axAtalhos.papel === "navigation" && axAtalho1.papel === "link", { papeis: s0.atalhosPapeis, nav: axAtalhos.papel, link: axAtalho1.papel });
medir("página: um noscript logo depois do atalho, com aviso em texto", "conforme", s0.noscript.total === 1 && s0.noscript.depoisDoAtalho && s0.noscript.texto.length > 0, s0.noscript);
medir("chamariz brd-trilha: br-breadcrumb primeiro conteúdo do main, com aria-current=page", "conforme", s0.trilha);
medir("chamariz brd-trilha: item atual (span aria-current=page) fora da ordem de Tab, sem tabindex", "conforme",
  s0.trilhaAtual.tag === "SPAN" && s0.trilhaAtual.tabindex === null && s0.trilhaAtual.tabIndex === -1, s0.trilhaAtual);
const axTrilha = await axNo(".br-breadcrumb");
medir("chamariz brd-trilha: nome acessível da navegação em português", "conforme", axTrilha.nome === "Trilha de navegação" && axTrilha.papel === "navigation", axTrilha);
const descricoesPorDestino = Object.entries(s0.links.reduce((acc, l) => ((acc[l.href] ??= new Set()).add(l.texto), acc), {})).map(([href, textos]) => [href, [...textos]]);
medir("página: links para o mesmo destino com a mesma descrição", "conforme", descricoesPorDestino.every(([, textos]) => textos.length === 1), descricoesPorDestino);
const destinos = await Promise.all([...new Set(s0.links.map(l => l.href).filter(h => !h.startsWith("#")))].map(async h => [h, (await fetch(`${base}/${h}`)).status]));
medir("página: destinos dos links existem no dist", "conforme", destinos.every(([, st]) => st === 200), destinos);
medir("página: 1ª ocorrência de 'SMS' com a forma completa em texto", "conforme", /^SMS \(mensagem de texto/.test(s0.sms ?? ""), s0.sms);

// a2-10aee59f9c1b rotulo-aba-pequeno @tab-requerimento
medir("a2-10aee59f9c1b rotulo-aba-pequeno @tab-requerimento: rótulos das duas abas em --font-size-scale-base", "defeito",
  s0.abaFonte.every(([tam]) => tam === s0.tokenBase) && s0.tokenBase !== s0.tokenUp02, { abas: s0.abaFonte, base: s0.tokenBase, up02: s0.tokenUp02 });
medir("a2-10aee59f9c1b (só o tamanho muda): peso dos rótulos das abas = medium (500)", "conforme", s0.abaFonte.every(([, peso]) => peso === "500"));

// a2-329f74d7646c titulo-fora-da-tabela @pagina (h2 de Dúvidas Frequentes)
medir("a2-329f74d7646c titulo-fora-da-tabela @pagina: h2 'Dúvidas Frequentes' com 16px e peso 700", "defeito",
  s0.h2Duvidas[0] === "16px" && s0.h2Duvidas[1] === "700", s0.h2Duvidas);

// a2-52ea5c58a080 sem-indicador @stp-andamento
const [i1, i2, i3, i4] = s0.indicadores;
medir("a2-52ea5c58a080 sem-indicador @stp-andamento: indicador da 3ª etapa oculto, rótulo mantido", "defeito", i3.vis === "hidden", i3);
medir("a2-52ea5c58a080 comparação: indicadores das etapas 1, 2 e 4 visíveis (40×40, número)", "conforme",
  [i1, i2, i4].every(i => i.vis === "visible" && i.w === "40px" && i.h === "40px" && /\d/.test(i.conteudo)), [i1, i2, i4]);
medir("core.js: BRStep instanciado (2ª etapa com aria-current=step)", "conforme", s0.etapaAtual[1] === "step" && s0.etapaAtual.filter(Boolean).length === 1, s0.etapaAtual);

// a2-5f85eeafe863 icone-descentralizado @msg-pendencia
medir("a2-5f85eeafe863 icone-descentralizado @msg-pendencia: ícone do Fechar fora do centro do botão (> 3 px)", "defeito", s0.pendFecharDesvio > 3, `${s0.pendFecharDesvio} px`);
medir("a2-5f85eeafe863 comparação: ícones dos gatilhos das tooltips centrados (≤ 1 px)", "conforme", s0.gatilhos.every(g => g.desvio <= 1), s0.gatilhos.map(g => g.desvio));

// a2-e99c92f13ac0 texto-alternativo-visivel @tip-protocolo + tip-prazo (compartilhada)
const [gProt, gPrazo] = s0.gatilhos;
medir("a2-e99c92f13ac0 texto-alternativo-visivel @tip-protocolo: span da alternativa escrito ao lado do ícone", "defeito", gProt.escrito && !gProt.oculto, gProt.texto);
medir("a2-e99c92f13ac0 texto-alternativo-visivel @tip-prazo (compartilhada)", "defeito", gPrazo.escrito && !gPrazo.oculto, gPrazo.texto);
medir("a2-e99c92f13ac0 comparação: span do Fechar de msg-pendencia oculto visualmente (sr-only)", "conforme", s0.pendFecharSpanOculto);
const axGatilho = await axNo("#tip-protocolo-gatilho");
medir("a2-e99c92f13ac0 (só a ocultação visual muda): nome acessível do gatilho = texto do balão", "conforme", axGatilho.nome === "Use o NUP para consultar" && axGatilho.papel === "button", axGatilho);
medir("gatilhos das tooltips: botão circular 40×40 com aria-label e aria-labelledby para o balão", "conforme",
  s0.gatilhos.every(g => g.w === 40 && g.h === 40 && !!g.rotulo && ["tip-protocolo", "tip-prazo"].includes(g.labelledby)), s0.gatilhos.map(g => [g.w, g.h, g.labelledby]));
medir("tooltips: balões ocultos na carga", "conforme", s0.baloesOcultosNaCarga);

// a2-671056d628cb apresentacao-no-html @msg-pendencia
medir("a2-671056d628cb apresentacao-no-html @msg-pendencia: font[color] e atributo align no texto", "defeito", s0.pendApresentacao.font >= 1 && s0.pendApresentacao.align >= 1, s0.pendApresentacao);
medir("chamariz crd-resumo: sem font/align no HTML do card", "conforme", s0.card.apresentacao === 0);
medir("chamariz crd-resumo: br-card, superfície #fff com sombra, NUP por extenso na 1ª ocorrência, caminho para detalhes", "conforme",
  s0.card.classe && s0.card.fundo === "rgb(255, 255, 255)" && s0.card.sombra && /Número Único de Protocolo \(NUP/.test(s0.card.nupPrimeira) && !!s0.card.rotulo, s0.card);

// a2-959ca4537add alternativa associacao-por-headers @tbl-movimentacoes
medir("a2-959ca4537add alternativa associacao-por-headers @tbl-movimentacoes: caption 1º filho, th no thead, td com headers → ids dos th, sem scope", "conforme",
  s0.tabela.captionPrimeiro && s0.tabela.thNoThead && s0.tabela.tbody && s0.tabela.headersOk && s0.tabela.semScope, s0.tabela);

// a2-e5b4728ca51e: msg-pendencia é a forma canônica (texto oculto do tipo, sem palavra visível)
medir("a2-e5b4728ca51e comparação: msg-pendencia diz o tipo por texto oculto do ícone, sem palavra visível no início", "conforme", s0.pendTipoOculto === "Alerta" && !s0.pendTextoVisivelComecaComTipo, s0.pendTipoOculto);

// chamarizes div-secoes, btn-voltar
medir("chamariz div-secoes: br-divider --gray-20 sólido 1px entre abas e dúvidas, fora do foco", "conforme",
  s0.divisor.classe && s0.divisor.cor === "rgb(204, 204, 204)" && s0.cinza20 === "#ccc" && s0.divisor.largura === "1px" && s0.divisor.estilo === "solid" && !s0.divisor.focavel && s0.divisor.entre, s0.divisor);
medir("chamariz btn-voltar: a.br-button secundário para meus-requerimentos.html", "conforme",
  s0.voltar.tag === "A" && /\bbr-button\b/.test(s0.voltar.classes) && /\bsecondary\b/.test(s0.voltar.classes) && s0.voltar.href === "meus-requerimentos.html" && !!s0.voltar.texto, s0.voltar);
medir("chamariz btn-voltar: rótulo com iniciais maiúsculas e a mesma descrição do item da trilha ('Meus Requerimentos')", "conforme", s0.voltar.texto === "Meus Requerimentos", s0.voltar.texto);
const destino = await fetch(`${base}/meus-requerimentos.html`);
medir("página de destino meus-requerimentos.html existe no dist", "conforme", destino.status === 200);

// a2-22240b8959ba recarga-periodica @pagina (a meta; a janela de 360 s vai no fim)
medir("a2-22240b8959ba recarga-periodica @pagina: meta refresh de 300 s sem url no head", "defeito", s0.refresh.length === 1 && s0.refresh[0] === "300", s0.refresh);

// Rawline (fonte usada, não a pilha declarada)
const fonteH1 = await fonteUsada(".titulo-pagina");
const fonteMsg = await fonteUsada("#msg-pendencia .message-body");
medir("Rawline empacotada: fonte usada no h1 e no texto da mensagem", "conforme", fonteH1.some(f => /rawline/i.test(f)) && fonteMsg.some(f => /rawline/i.test(f)), [fonteH1, fonteMsg]);

// tooltips: tip-protocolo abre abaixo (alternativa), tip-prazo acima (canônica); Esc fecha
const balao = async (gatilho, id) => {
  await pagina.focus(`#${gatilho}`);
  await pagina.waitForTimeout(150);
  return pagina.evaluate(([g, b]) => {
    const rg = document.getElementById(g).getBoundingClientRect();
    const el = document.getElementById(b);
    const rb = el.getBoundingClientRect();
    const ra = el.querySelector(".arrow").getBoundingClientRect();
    const visiveis = [...document.querySelectorAll(".br-tooltip")].filter(t => getComputedStyle(t).visibility === "visible").length;
    return { visivel: getComputedStyle(el).visibility === "visible", lugar: el.getAttribute("data-popper-placement"),
      gatilho: { top: rg.top, bottom: rg.bottom, left: rg.left, right: rg.right }, balao: { top: rb.top, bottom: rb.bottom, left: rb.left, right: rb.right },
      seta: { cx: ra.left + ra.width / 2, top: ra.top, bottom: ra.bottom, w: ra.width, h: ra.height }, visiveis };
  }, [gatilho, id]);
};
const bProt = await balao("tip-protocolo-gatilho", "tip-protocolo");
medir("a2-61f57f2a7ff5 alternativa balao-abaixo @tip-protocolo: balão abaixo do gatilho, a ≤ 16 px, seta em cima apontando para o gatilho", "conforme",
  bProt.visivel && bProt.lugar === "bottom" && bProt.balao.top >= bProt.gatilho.bottom && bProt.balao.top - bProt.gatilho.bottom <= 16
  && bProt.seta.bottom <= bProt.balao.top + 1 && bProt.seta.cx >= bProt.gatilho.left && bProt.seta.cx <= bProt.gatilho.right, bProt);
const bPrazo = await balao("tip-prazo-gatilho", "tip-prazo");
medir("a2-61f57f2a7ff5 comparação: tip-prazo abre acima do gatilho, junto dele, seta apontando para o gatilho", "conforme",
  bPrazo.visivel && bPrazo.lugar === "top" && bPrazo.balao.bottom <= bPrazo.gatilho.top && bPrazo.gatilho.top - bPrazo.balao.bottom <= 16
  && bPrazo.seta.top >= bPrazo.balao.bottom - 1 && bPrazo.seta.cx >= bPrazo.gatilho.left && bPrazo.seta.cx <= bPrazo.gatilho.right, bPrazo);
medir("tooltips: no máximo um balão visível por vez", "conforme", bPrazo.visiveis === 1, String(bPrazo.visiveis));
await pagina.keyboard.press("Escape");
medir("tooltips: Esc fecha o balão aberto por foco", "conforme", await pagina.evaluate(() => getComputedStyle(document.getElementById("tip-prazo")).visibility !== "visible"));

// a2-281b82e2e6be (não sorteada): seta no topo/base centrada com o balão, em todo balão simples, aberto por ponteiro e por foco
const setas = [];
const medirSeta = async (gatilho, balaoSel, modo) => {
  if (modo === "ponteiro") {
    await pagina.evaluate(g => document.querySelector(g).scrollIntoView({ block: "center" }), gatilho);
    await pagina.waitForTimeout(150);
    const c = await pagina.evaluate(g => __centro(document.querySelector(g)), gatilho);
    await pagina.mouse.move(c.x, c.y);
  } else if (modo === "foco") {
    await pagina.focus(gatilho);
  }
  await pagina.waitForTimeout(250);
  const m = await pagina.evaluate(([g, b]) => {
    const el = document.querySelector(b); const a = el.querySelector(".arrow");
    const rb = el.getBoundingClientRect(), ra = a.getBoundingClientRect(), rg = document.querySelector(g).getBoundingClientRect();
    return { visivel: getComputedStyle(el).visibility === "visible", lugar: el.getAttribute("data-popper-placement"),
      desvioBalao: Math.abs(ra.left + ra.width / 2 - (rb.left + rb.width / 2)), desvioGatilho: Math.abs(ra.left + ra.width / 2 - (rg.left + rg.width / 2)) };
  }, [gatilho, balaoSel]);
  setas.push({ gatilho, modo, ...m, desvioBalao: +m.desvioBalao.toFixed(1), desvioGatilho: +m.desvioGatilho.toFixed(1) });
  if (modo === "ponteiro") { await pagina.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1); await pagina.waitForTimeout(150); }
  else if (modo === "foco") await pagina.keyboard.press("Escape");
};
for (const modo of ["ponteiro", "foco"]) {
  await medirSeta("#tip-protocolo-gatilho", "#tip-protocolo", modo);
  await medirSeta("#tip-prazo-gatilho", "#tip-prazo", modo);
  await medirSeta("#msg-pendencia .fechar-mensagem", "#msg-pendencia .close .br-tooltip", modo);
}

// a2-971db6a57c75 item-expandido-sem-estado @acc-duvidas
medir("acc-duvidas: atributo single sem valor, cabeçalhos com aria-expanded=false na carga", "conforme", s0.accSingle === "" && s0.accExpandido.every(v => v === "false"), [s0.accSingle, s0.accExpandido]);
await pagina.click('#acc-duvidas .header[aria-controls="acc-duvidas-1"]');
const acc1 = await pagina.evaluate(() => {
  const h = document.querySelector('#acc-duvidas .header[aria-controls="acc-duvidas-1"]');
  const painel = document.getElementById("acc-duvidas-1");
  return { aberto: h.parentElement.hasAttribute("active"), painelVisivel: getComputedStyle(painel).display !== "none" && painel.getBoundingClientRect().height > 0, expandido: h.getAttribute("aria-expanded"), icone: h.querySelector(".icon i").className };
});
medir("a2-971db6a57c75 item-expandido-sem-estado @acc-duvidas: item aberto e painel visível, cabeçalho continua aria-expanded=false", "defeito",
  acc1.aberto && acc1.painelVisivel && acc1.expandido === "false", acc1);
await pagina.click('#acc-duvidas .header[aria-controls="acc-duvidas-2"]');
const abertos = await pagina.evaluate(() => document.querySelectorAll("#acc-duvidas .item[active]").length);
medir("core.js: accordion single (abrir o 2º fecha o 1º)", "conforme", abertos === 1, String(abertos));

// e-MAG 4.3 (não sorteada): janela de 640×450 (200 %) sem rolagem horizontal nem elemento além da borda
await pagina.setViewportSize({ width: 640, height: 450 });
await pagina.waitForTimeout(600);
const reflow = await pagina.evaluate(() => {
  const cw = document.documentElement.clientWidth;
  const visivel = el => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none"; };
  return { scrollWidth: document.documentElement.scrollWidth, clientWidth: cw,
    alem: [...document.querySelectorAll("body *")].filter(e => visivel(e) && e.getBoundingClientRect().right > cw + 1).map(e => e.tagName + "." + e.className),
    rotulos: [...document.querySelectorAll(".rotulo-botao")].map(s => Math.round(s.getBoundingClientRect().right)) };
});
await pagina.setViewportSize(VIEWPORT);
await pagina.waitForTimeout(300);
medir("página: a 640×450 (200 %) sem rolagem horizontal e nenhum elemento além da largura da janela", "conforme", reflow.scrollWidth <= reflow.clientWidth && reflow.alem.length === 0, reflow);

// skiplink: primeiro Tab
await abrir();
await pagina.keyboard.press("Tab");
await pagina.waitForTimeout(400);
const primeiroFoco = await pagina.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { dentro: !!a.closest(".br-skiplink"), visivel: r.width > 0 && r.top >= 0 && r.top < innerHeight, href: a.getAttribute("href") }; });
medir("chamariz skp-conteudo: o 1º Tab cai no atalho, visível, para #main-content", "conforme", primeiroFoco.dentro && primeiroFoco.visivel && primeiroFoco.href === "#main-content", primeiroFoco);

// a2-14f2e6c3226f (não sorteada): fechar msg-pendencia pelo teclado leva o foco ao título da página
await pagina.focus("#msg-pendencia .fechar-mensagem");
await pagina.keyboard.press("Enter");
const aposFecharPend = await pagina.evaluate(() => ({ existe: !!document.getElementById("msg-pendencia"), foco: document.activeElement.className }));
medir("core.js: Fechar remove msg-pendencia; foco vai ao título da página", "conforme", !aposFecharPend.existe && /titulo-pagina/.test(aposFecharPend.foco), aposFecharPend);
fecharEstado("S0");

// ================================================================ S1
await irParaS1();
await preparar();
if (capturas) await pagina.screenshot({ path: join(capturas, "tela-a2-S1.png"), fullPage: true });
const s1 = await pagina.evaluate(() => {
  const cs = (el, pse) => getComputedStyle(typeof el === "string" ? document.querySelector(el) : el, pse);
  const ajuda = document.getElementById("arquivo-apoio");
  const input = document.getElementById("arquivo-documento");
  const descritoPor = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
  return {
    selecionada: [...document.querySelectorAll("#tab-requerimento [role=tab]")].map(b => b.getAttribute("aria-selected")),
    painel2: document.getElementById("painel-documentos").classList.contains("active") && getComputedStyle(document.getElementById("painel-documentos")).display !== "none",
    h2Form: [cs(".titulo-formulario").fontSize, cs(".titulo-formulario").fontWeight],
    tokenUp05: getComputedStyle(document.documentElement).getPropertyValue("--font-size-scale-up-05").trim(),
    gatilhoSelectDesvio: __desvio(document.querySelector("#sel-tipo-documento [data-trigger]")),
    ajuda: ajuda ? ajuda.textContent.trim() : null,
    ajudaLigada: descritoPor.includes("arquivo-apoio"),
    fieldset: (() => { const f = document.querySelector(".grupo-avisos"); return { tag: f.tagName, legends: f.querySelectorAll("legend").length, textoAntes: f.previousElementSibling?.textContent.trim(), tagAntes: f.previousElementSibling?.tagName, contem: ["avisos-todos", "aviso-email", "aviso-sms"].every(id => f.contains(document.getElementById(id))) }; })(),
    ariaChecked: ["aviso-email", "aviso-sms"].map(id => document.getElementById(id).getAttribute("aria-checked")),
    enviar: (() => { const b = document.querySelector(".acao-enviar"); return { tag: b.tagName, tipo: b.type, classes: b.className, texto: b.textContent.trim(), h: b.getBoundingClientRect().height }; })(),
    fonteTokens: { base: getComputedStyle(document.documentElement).getPropertyValue("--font-size-scale-base").trim() },
  };
});
medir("estado S1: aba Documentos ativa e painel visível", "conforme", s1.painel2);
medir("a2-971db6a57c75 comparação: aria-selected das abas acompanha a troca (core.js)", "conforme", s1.selecionada[0] === "false" && s1.selecionada[1] === "true", s1.selecionada);
medir("a2-329f74d7646c comparação: h2 do formulário com --font-size-scale-up-05 e peso regular", "conforme", s1.h2Form[0] === s1.tokenUp05 && s1.h2Form[1] === "400", s1.h2Form);
medir("a2-5f85eeafe863 comparação: ícone do gatilho do select centrado (≤ 1 px)", "conforme", s1.gatilhoSelectDesvio <= 1, `${s1.gatilhoSelectDesvio} px`);
medir("a2-cd5cbf0f18dc sem-formato @upl-documento: texto de apoio ligado ao campo não diz formatos nem tamanho máximo", "defeito",
  s1.ajudaLigada && !!s1.ajuda && !/\b(PDF|JPE?G|PNG|MB|KB)\b|formato|tamanho/i.test(s1.ajuda), s1.ajuda);
medir("a2-cd5cbf0f18dc (a2-2e8e53cf16ef): o texto de apoio continua dizendo que se pode arrastar", "conforme", /arrast/i.test(s1.ajuda ?? ""), s1.ajuda);
medir("a2-18bccce4132a grupo-sem-legend @chk-avisos-todos: fieldset dos avisos sem legend; o texto vira p antes dele", "defeito",
  s1.fieldset.tag === "FIELDSET" && s1.fieldset.legends === 0 && s1.fieldset.tagAntes === "P" && s1.fieldset.textoAntes === "Avisos sobre o requerimento" && s1.fieldset.contem, s1.fieldset);
medir("chamariz btn-enviar: button.br-button primário type=submit, 40 px, rótulo com iniciais maiúsculas ('Enviar Documento')", "conforme",
  s1.enviar.tag === "BUTTON" && s1.enviar.tipo === "submit" && /\bprimary\b/.test(s1.enviar.classes) && s1.enviar.h === 40 && s1.enviar.texto === "Enviar Documento", s1.enviar);

// a2-caf6bc80cb4b borda-sem-feedback @upl-documento
const arrasto = await pagina.evaluate(() => {
  const botao = document.querySelector("#upl-documento .upload-button");
  const antes = { borda: getComputedStyle(botao).borderTopColor, fundo: getComputedStyle(botao).backgroundImage };
  const dt = new DataTransfer();
  dt.items.add(new File(["%PDF-1.4"], "comprovante.pdf", { type: "application/pdf" }));
  for (const tipo of ["dragenter", "dragover"]) botao.dispatchEvent(new DragEvent(tipo, { dataTransfer: dt, bubbles: true, cancelable: true }));
  const c = getComputedStyle(botao);
  const durante = { classe: document.getElementById("upl-documento").classList.contains("dragging"), borda: c.borderTopColor, fundo: c.backgroundImage, cursor: c.cursor };
  botao.dispatchEvent(new DragEvent("dragleave", { dataTransfer: dt, bubbles: true, cancelable: true }));
  const sucesso = getComputedStyle(document.documentElement).getPropertyValue("--success").trim();
  return { antes, durante, sucesso };
});
medir("a2-caf6bc80cb4b borda-sem-feedback @upl-documento: com arquivo válido arrastado, a borda continua na cor de interação (não fica verde)", "defeito",
  arrasto.durante.classe && arrasto.durante.borda === arrasto.antes.borda && arrasto.durante.borda !== "rgb(22, 136, 33)", arrasto);
medir("a2-caf6bc80cb4b (a área responde): dropzone ativo com fundo de interação e cursor copy durante o arrasto", "conforme",
  arrasto.durante.classe && arrasto.durante.fundo !== arrasto.antes.fundo && arrasto.durante.cursor === "copy", arrasto.durante);

// a2-e9ded28efe9c aria-checked-fixo @swt-aviso-email + swt-aviso-sms (compartilhada)
medir("switches: aria-checked=false na carga (desligados)", "conforme", s1.ariaChecked.every(v => v === "false"), s1.ariaChecked);
await pagina.click('label[for="aviso-email"]');
const email = await pagina.evaluate(() => ({ ligado: document.getElementById("aviso-email").checked, aria: document.getElementById("aviso-email").getAttribute("aria-checked"), principalIntermediario: document.getElementById("avisos-todos").indeterminate, aviso: document.querySelector(".situacao-avisos").textContent }));
medir("a2-e9ded28efe9c aria-checked-fixo @swt-aviso-email: switch ligado com aria-checked=false", "defeito", email.ligado && email.aria === "false", email);
await pagina.click('label[for="aviso-sms"]');
const sms = await pagina.evaluate(() => ({ ligado: document.getElementById("aviso-sms").checked, aria: document.getElementById("aviso-sms").getAttribute("aria-checked"), principal: document.getElementById("avisos-todos").checked && !document.getElementById("avisos-todos").indeterminate }));
medir("a2-e9ded28efe9c aria-checked-fixo @swt-aviso-sms (compartilhada): switch ligado com aria-checked=false", "defeito", sms.ligado && sms.aria === "false", sms);
const axPrincipal = await axNo("#avisos-todos");
medir("core.js: checkbox principal intermediário com um switch e marcado com os dois", "conforme", email.principalIntermediario && sms.principal, { email: email.principalIntermediario, ambos: sms.principal, ax: axPrincipal });
medir("a2-8f7b9c91d55e (não sorteada): alternar aplica na hora (aviso 'Preferência salva.')", "conforme", email.aviso === "Preferência salva.", email.aviso);
for (const modo of ["ponteiro", "foco"]) await medirSeta("#sel-tipo-documento [data-trigger]", "#sel-tipo-documento .br-input > .br-tooltip", modo);
fecharEstado("S1");

// ================================================================ S2
await irParaS2();
await preparar();
if (capturas) await pagina.screenshot({ path: join(capturas, "tela-a2-S2.png"), fullPage: true });
const s2 = await pagina.evaluate(() => {
  const msg = document.getElementById("msg-retorno");
  const fechar = msg.querySelector(".close .fechar-mensagem");
  const raiz = getComputedStyle(document.documentElement);
  const selCampo = document.getElementById("tipo-documento");
  const selCaixa = document.querySelector("#sel-tipo-documento .br-input");
  const descricao = el => (el.getAttribute("aria-describedby") || "").split(" ").filter(Boolean).map(id => document.getElementById(id)?.textContent.trim() ?? "");
  const arquivo = document.getElementById("arquivo-documento");
  const retornoArquivo = document.getElementById("arquivo-retorno");
  return {
    tipo: [...msg.classList],
    foco: document.activeElement === fechar,
    fecharTag: fechar.tagName, fecharRole: fechar.getAttribute("role"), fecharTab: fechar.tabIndex, fecharRotulo: fechar.getAttribute("aria-label"),
    fecharDesvio: __desvio(fechar),
    fecharSpanOculto: __ocultoVisual(fechar.querySelector(".rotulo-botao")),
    texto: msg.querySelector(".content").innerText.trim(),
    regiaoViva: msg.querySelector(".content").getAttribute("role"),
    icone: msg.querySelector(".icon i").className,
    iconeSoDecorativo: msg.querySelector(".icon i").getAttribute("aria-hidden") === "true" && !msg.querySelector(".icon .sr-only"),
    apresentacao: msg.querySelectorAll("font, [align]").length,
    selBorda: getComputedStyle(selCampo).borderTopColor,
    erro: (() => { const v = raiz.getPropertyValue("--danger").trim(); const d = document.createElement("div"); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })(),
    selClasseErro: selCaixa.classList.contains("danger"),
    selTextoErro: [...document.querySelectorAll("#sel-tipo-documento .feedback, .campo-tipo-documento .feedback, .campo-tipo-documento [role=alert]")].map(n => n.textContent.trim()),
    selDescricao: descricao(selCampo),
    selInvalido: selCampo.getAttribute("aria-invalid"),
    upErro: document.getElementById("upl-documento").hasAttribute("data-danger"),
    upTexto: retornoArquivo ? retornoArquivo.textContent.trim() : null,
    upTextoClasse: retornoArquivo ? retornoArquivo.className : null,
    upTextoBotao: retornoArquivo ? retornoArquivo.querySelectorAll("button, [role=button]").length : null,
    upDescricao: descricao(arquivo),
  };
});
medir("estado S2: mensagem de retorno de erro exibida e foco no Fechar", "conforme", s2.tipo.includes("danger") && s2.foco, s2.tipo);
medir("a2-d45711a55b6c fechar-div @msg-retorno: Fechar é div role=button tabindex=0", "defeito", s2.fecharTag === "DIV" && s2.fecharRole === "button" && s2.fecharTab === 0, `${s2.fecharTag} role=${s2.fecharRole} tabindex=${s2.fecharTab}`);
medir("a2-d45711a55b6c comparação: Fechar de msg-pendencia é BUTTON", "conforme", s0.pendFecharTag === "BUTTON", s0.pendFecharTag);
medir("a2-d45711a55b6c (teclado intacto): o div tem nome", "conforme", s2.fecharRotulo === "Fechar");
medir("a2-5f85eeafe863 comparação: ícone do Fechar de msg-retorno centrado (≤ 1 px)", "conforme", s2.fecharDesvio <= 1, `${s2.fecharDesvio} px`);
medir("a2-e99c92f13ac0 comparação: span do Fechar de msg-retorno oculto visualmente (sr-only)", "conforme", s2.fecharSpanOculto);
medir("a2-671056d628cb comparação: msg-retorno sem font/align", "conforme", s2.apresentacao === 0);
medir("a2-e5b4728ca51e alternativa prefixo-textual-visivel @msg-retorno: texto começa com 'Erro:' visível, ícone times-circle do DS mantido", "conforme",
  /^Erro:/.test(s2.texto) && /fa-times-circle/.test(s2.icone) && s2.iconeSoDecorativo, s2.texto.slice(0, 40));
medir("msg-retorno: região viva (role=alert), diz o porquê e o que fazer, sem nomear o campo do select", "conforme",
  s2.regiaoViva === "alert" && /Corrija/.test(s2.texto) && !/Tipo de documento/i.test(s2.texto), s2.texto);
medir("a2-d720ea8520cb erro-so-borda @sel-tipo-documento: campo com borda de erro e nenhum texto que o identifique e descreva", "defeito",
  s2.selClasseErro && s2.selBorda === s2.erro && s2.selTextoErro.length === 0 && s2.selDescricao.length === 0 && s2.selInvalido === null, { borda: s2.selBorda, erro: s2.erro, textos: s2.selTextoErro, descricao: s2.selDescricao });
medir("a2-d720ea8520cb comparação: upload inválido com texto de erro (.feedback, sem Fechar) ligado ao input por aria-describedby", "conforme",
  s2.upErro && !!s2.upTexto && /\bfeedback\b/.test(s2.upTextoClasse) && s2.upTextoBotao === 0 && s2.upDescricao.includes(s2.upTexto), { texto: s2.upTexto, descricao: s2.upDescricao });

await medirSeta("#msg-retorno .fechar-mensagem", "#msg-retorno .close .br-tooltip", "aberto");
medir("a2-281b82e2e6be (não sorteada): seta centrada com o balão (≤ 1 px) e apontando para o gatilho, nos 5 balões, por ponteiro e por foco", "conforme",
  setas.length === 9 && setas.every(m => m.visivel && m.desvioBalao <= 1 && m.desvioGatilho <= 1), setas.map(m => `${m.gatilho} ${m.modo} ${m.lugar} ${m.desvioBalao}/${m.desvioGatilho}`));

// Fechar (div) pelo teclado: Enter fecha e o foco volta ao Enviar
await pagina.keyboard.press("Enter");
const aposFechar = await pagina.evaluate(() => ({ existe: !!document.getElementById("msg-retorno"), foco: document.activeElement.className }));
medir("a2-d45711a55b6c (teclado intacto): Enter no div fecha a mensagem; foco volta ao Enviar documento", "conforme", !aposFechar.existe && /acao-enviar/.test(aposFechar.foco), aposFechar);
fecharEstado("S2");

// a2-cd5cbf0f18dc: a restrição de formato continua valendo no envio
await irParaS1();
await pagina.click("#sel-tipo-documento [data-trigger]");
await pagina.click('label[for="tipo-documento-op0"]');
await pagina.setInputFiles("#arquivo-documento", { name: "comprovante.txt", mimeType: "text/plain", buffer: Buffer.from("texto") });
await pagina.click(".acao-enviar");
await pagina.waitForSelector("#msg-retorno");
const formato = await pagina.evaluate(() => ({ tipo: document.getElementById("tipo-documento").value, texto: document.getElementById("arquivo-retorno")?.textContent.trim() ?? null }));
medir("a2-cd5cbf0f18dc (a restrição continua): arquivo .txt é recusado no envio com texto de formato e tamanho", "conforme",
  formato.tipo === "Comprovante de residência" && /PDF, JPG ou PNG/.test(formato.texto ?? "") && /5 MB/.test(formato.texto ?? ""), formato);
fecharEstado("envio com arquivo fora do formato");

// pedidos: nenhum recurso fora da origem
const externos = pedidos.filter(u => !u.startsWith(base) && !u.startsWith("data:"));
medir("página: nenhum pedido fora da origem servida", "conforme", externos.length === 0, externos.slice(0, 3).join(" | "));
medir("sem erros de console/página nem respostas 4xx/5xx", "conforme", erros.length === 0, erros.slice(0, 3).join(" | "));
await contexto.close();

// ---------- e-MAG 2.3: a janela de 360 s
if (recarga) {
  const { meta, cargas } = await recarga;
  medir("a2-22240b8959ba recarga-periodica @pagina: em 360 s a página se recarrega sozinha (≥ 2 eventos load)", "defeito",
    cargas.length >= 2 && meta.length === 1 && meta[0] === "300", { cargasMs: cargas, meta });
}

await navegador.close();
servidor.close();

for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} [${r.tipo}] ${r.unidade}${r.detalhe ? ` — ${r.detalhe}` : ""}`);
const falhas = resultados.filter(r => !r.ok).length;
const defeitos = resultados.filter(r => r.tipo === "defeito");
const conformes = resultados.filter(r => r.tipo === "conforme");
console.log(`\n${resultados.length - falhas}/${resultados.length} conferências ok (${defeitos.filter(r => r.ok).length}/${defeitos.length} observáveis de defeito, ${conformes.filter(r => r.ok).length}/${conformes.length} pontos conformes)`);
if (semJanelaRecarga) console.log("ATENÇÃO: janela de 360 s da recarga periódica não medida (--sem-janela-recarga); conferência incompleta.");
process.exit(falhas > 0 ? 1 : semJanelaRecarga ? 2 : 0);
