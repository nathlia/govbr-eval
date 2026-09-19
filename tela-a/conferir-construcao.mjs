/**
 * Conferência da construção da tela A contra tela-a/sorteio.json — sem modelo e sem oráculo.
 *
 * Serve o `dist/` do corpus num servidor local, abre /solicitacao.html no Chromium do Playwright e
 * mede, para cada spec sorteada, o observável declarado em elegibilidade-passo2.json: `defeito`
 * tem de ser verdadeiro no hospedeiro e `conforme` tem de ser verdadeiro nos pontos de comparação.
 * Nada é importado do govbr-ds-validator.
 *
 * Uso: node tela-a/conferir-construcao.mjs [--capturas <dir>]
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "../../govbr-corpus/dist");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const capturas = process.argv.includes("--capturas") ? process.argv[process.argv.indexOf("--capturas") + 1] : null;

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

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
pagina.on("pageerror", e => erros.push(String(e)));
pagina.on("console", m => { if (m.type() === "error") erros.push(m.text()); });

const resultados = [];
const medir = (spec, tipo, valor, detalhe = "") => resultados.push({ spec, tipo, ok: valor === true, detalhe });
const abrir = async () => { await pagina.goto(`${base}/solicitacao.html`); await pagina.waitForSelector(".linhas-anteriores tr"); };

// ---------- S0
await abrir();
if (capturas) await pagina.screenshot({ path: join(capturas, "tela-a-S0.png"), fullPage: true });

const s0 = await pagina.evaluate(() => {
  const nome = el => (el.getAttribute("aria-label") || el.labels?.[0]?.textContent || "").trim();
  const rotulado = id => { const c = document.getElementById(id); return !!document.querySelector(`label[for="${id}"]`) && nome(c) !== ""; };
  const tabela = document.querySelector(".tabela-anteriores table");
  const paginas = [...document.querySelectorAll(".paginacao-anteriores a.page")];
  return {
    caption: !!tabela.querySelector("caption"),
    cabecalhos: [...tabela.querySelectorAll("thead tr > *")].every(c => c.tagName === "TH" && c.getAttribute("scope") === "col"),
    linksEmLista: paginas.every(a => a.parentElement.tagName === "LI"),
    ariaCurrent: paginas.some(a => a.classList.contains("active") && a.getAttribute("aria-current") === "page"),
    trilhaAriaCurrent: !!document.querySelector(".trilha-servico [aria-current=page]"),
    rotuloForma1: rotulado("forma-presencial"),
    rotulosConformes: ["forma-video", "forma-telefone", "recurso-libras", "recurso-mobilidade", "declaracao", "nome", "cpf", "servico", "unidade", "data-preferencial", "descricao", "documentos"].filter(id => !rotulado(id)),
    apoioDocumentos: document.getElementById("documentos-apoio").textContent,
    tabindexPositivo: [...document.querySelectorAll("[tabindex]")].filter(e => e.tabIndex > 0).map(e => e.className),
    fonte: getComputedStyle(document.querySelector(".formulario-solicitacao label")).fontFamily,
  };
});
medir("cd705eb5da2a caption-removido @tab-anteriores", "defeito", s0.caption === false);
medir("1ccbc61dddbc (descartada) cabeçalhos th+scope", "conforme", s0.cabecalhos);
medir("cf61b3eb3c71 links-fora-de-lista @pag-anteriores", "defeito", s0.linksEmLista === false);
medir("e038367bd7d6 aria-removido @pag-anteriores", "defeito", s0.ariaCurrent === false);
medir("e038367bd7d6 comparação: trilha tem aria-current", "conforme", s0.trilhaAriaCurrent);
medir("b5fad7ce076d label-sem-for @rad-forma (1ª opção)", "defeito", s0.rotuloForma1 === false);
medir("b5fad7ce076d comparação: demais campos rotulados", "conforme", s0.rotulosConformes.length === 0, s0.rotulosConformes.join(","));
medir("985fd2775586 apoio-sem-arraste @upl-documentos", "defeito", !/arrast|solt/i.test(s0.apoioDocumentos), s0.apoioDocumentos);
medir("01b1806c30e9 (não sorteada) apoio ainda informa formato", "conforme", /PDF/.test(s0.apoioDocumentos));
medir("79db88c7f55d tabindex-positivo @upl-documentos", "defeito", s0.tabindexPositivo.join() === "upload-button", s0.tabindexPositivo.join());

// foco: o DS desenha o indicador dos campos de texto com box-shadow + borda, não com outline —
// o indicador existe se qualquer um dos dois estiver presente no elemento focado.
const contorno = async seletor => {
  await pagina.focus(seletor);
  return pagina.evaluate(s => { const c = getComputedStyle(document.querySelector(s)); return c.outlineStyle !== "none" || c.boxShadow !== "none" ? "visivel" : "none"; }, seletor);
};
await pagina.keyboard.press("Tab"); // entra em modo teclado para :focus-visible
medir("21fbcc2fe37b comparação: #nome tem contorno de foco", "conforme", (await contorno("#nome")) !== "none");
medir("21fbcc2fe37b comparação: #descricao tem contorno de foco", "conforme", (await contorno("#descricao")) !== "none");
medir("21fbcc2fe37b comparação: #data-preferencial tem contorno de foco", "conforme", (await contorno("#data-preferencial")) !== "none");
medir("21fbcc2fe37b outline-none @sel-servico", "defeito", (await contorno("#servico")) === "none");
medir("21fbcc2fe37b outline-none @sel-unidade (compartilhada)", "defeito", (await contorno("#unidade")) === "none");

// ordem de foco: o upload salta para a frente de tudo
await abrir();
await pagina.keyboard.press("Tab");
const primeiroFoco = await pagina.evaluate(() => document.activeElement.className);
medir("79db88c7f55d o 1º Tab cai no upload, não no atalho", "defeito", primeiroFoco.includes("upload-button"), primeiroFoco);

// select do DS funciona (comportamento do core.js ligado)
await abrir();
await pagina.click("#servico");
const listaAberta = await pagina.evaluate(() => getComputedStyle(document.querySelector(".campo-servico .br-list")).display !== "none");
medir("core.js: lista do select abre", "conforme", listaAberta);
await pagina.click(".campo-servico .br-item:nth-child(2) label");
const valorSelect = await pagina.inputValue("#servico");
medir("core.js: escolher opção preenche o select", "conforme", valorSelect === "Atualização cadastral", valorSelect);
medir("de1efebaf255 (não sorteada) escolher opção não envia", "conforme", (await pagina.locator(".mensagem-retorno").count()) === 0);
const botaoUpload = await pagina.locator(".campo-documentos .upload-button").count();
medir("core.js: upload montou o botão", "conforme", botaoUpload === 1, String(botaoUpload));

// paginação troca as linhas
const antes = await pagina.textContent(".linhas-anteriores tr td");
await pagina.click(".paginacao-anteriores a.page >> nth=1");
const depois = await pagina.textContent(".linhas-anteriores tr td");
medir("paginação troca as linhas", "conforme", antes !== depois);

// ---------- S1
await abrir();
await pagina.click(".acao-enviar");
await pagina.waitForSelector(".mensagem-retorno");
if (capturas) await pagina.screenshot({ path: join(capturas, "tela-a-S1.png"), fullPage: true });
const s1 = await pagina.evaluate(() => {
  const msg = document.querySelector(".mensagem-retorno");
  const caixa = s => msg.querySelector(s).getBoundingClientRect();
  const fechar = msg.querySelector(".close > *");
  const associado = id => {
    const c = document.getElementById(id);
    return (c.getAttribute("aria-describedby") ?? "").split(" ").some(ref => document.getElementById(ref)?.classList.contains("retorno-campo"));
  };
  const temTexto = seletor => !!document.querySelector(`${seletor} .retorno-campo`)?.textContent.trim();
  return {
    fecharTag: fechar.tagName,
    fecharRole: fechar.getAttribute("role"),
    fecharFocavel: fechar.tabIndex === 0,
    fecharNome: fechar.getAttribute("aria-label"),
    fecharAEsquerda: caixa(".close").left < caixa(".content").left,
    iconeADireita: caixa(".icon").left > caixa(".content").left,
    focoNaMensagem: msg.contains(document.activeElement),
    textoServico: temTexto(".campo-servico"), textoUnidade: temTexto(".campo-unidade"),
    assocServico: associado("servico"), assocUnidade: associado("unidade"),
    conformes: ["nome", "cpf", "data-preferencial", "descricao", "declaracao", "forma-presencial"].filter(id => !associado(id)),
    semTexto: [".campo-nome", ".campo-cpf", ".grupo-forma", ".campo-data", ".campo-descricao", ".campo-declaracao"].filter(s => !temTexto(s)),
  };
});
medir("1cb2c878824b nativo-para-div @msg-retorno", "defeito", s1.fecharTag === "DIV" && s1.fecharRole === "button", `${s1.fecharTag} role=${s1.fecharRole}`);
medir("1cb2c878824b o div continua focável e nomeado", "conforme", s1.fecharFocavel && !!s1.fecharNome);
medir("66b01a712e67 icone-e-fechar-trocados @msg-retorno", "defeito", s1.fecharAEsquerda && s1.iconeADireita);
medir("cc837bbaf713 (3ª cláusula) foco vai para a mensagem", "conforme", s1.focoNaMensagem);
medir("cc837bbaf713 erro-sem-associacao @sel-servico", "defeito", s1.textoServico && !s1.assocServico);
medir("cc837bbaf713 erro-sem-associacao @sel-unidade (compartilhada)", "defeito", s1.textoUnidade && !s1.assocUnidade);
medir("cc837bbaf713 comparação: demais campos associados", "conforme", s1.conformes.length === 0, s1.conformes.join(","));
medir("cc837bbaf713 comparação: todo campo inválido tem texto", "conforme", s1.semTexto.length === 0, s1.semTexto.join(","));
await pagina.focus(".mensagem-retorno .close [role=button]");
await pagina.keyboard.press("Enter");
medir("1cb2c878824b o div fecha com Enter", "conforme", (await pagina.locator(".mensagem-retorno").count()) === 0);

// ---------- S2
await abrir();
await pagina.click(".acao-cancelar");
await pagina.waitForSelector(".dialogo-descarte");
if (capturas) await pagina.screenshot({ path: join(capturas, "tela-a-S2.png") });
const s2 = await pagina.evaluate(() => {
  const d = document.querySelector(".dialogo-descarte");
  return { focoDentro: d.contains(document.activeElement), cor: getComputedStyle(d).color, corCorpo: getComputedStyle(document.body).color, role: d.getAttribute("role"), modal: d.getAttribute("aria-modal") };
});
medir("5be1f553cc03 comparação: abrir leva o foco ao diálogo", "conforme", s2.focoDentro);
medir("e038367bd7d6 (não neste hospedeiro) role=dialog + aria-modal", "conforme", s2.role === "dialog" && s2.modal === "true");
medir("21b1a2733f7b cor-fora-da-paleta @mod-descartar", "defeito", s2.cor === "rgb(51, 67, 51)", `${s2.cor} (corpo: ${s2.corCorpo})`);
const visitados = [];
for (let i = 0; i < 4; i++) { await pagina.keyboard.press("Tab"); visitados.push(await pagina.evaluate(() => document.querySelector(".dialogo-descarte").contains(document.activeElement))); }
medir("64b84991229c (não sorteada) Tab fica dentro do diálogo", "conforme", visitados.every(Boolean));
await pagina.keyboard.press("Escape");
const aposFechar = await pagina.evaluate(() => ({ aberto: !!document.querySelector(".dialogo-descarte"), foco: document.activeElement.tagName, noGatilho: document.activeElement.classList.contains("acao-cancelar") }));
medir("5be1f553cc03 fecha-sem-devolver @mod-descartar", "defeito", !aposFechar.aberto && !aposFechar.noGatilho, `foco em ${aposFechar.foco}`);

medir("sem erros de console/página", "conforme", erros.length === 0, erros.slice(0, 3).join(" | "));

await navegador.close();
servidor.close();

for (const r of resultados) console.log(`${r.ok ? "ok  " : "FALHA"} [${r.tipo}] ${r.spec}${r.detalhe ? ` — ${r.detalhe}` : ""}`);
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} conferências ok`);
process.exit(falhas === 0 ? 0 : 1);
