/**
 * Testes da origem medida para campanha nova (origem-campanha.ts, plano de revisão 19/10, entrega 5). Sem modelo, sem rede.
 *   1. puros: traços da alegação (tabela fixa), regiões DS num pacote servido, quadro → dono, dono de atributo (R2 > DS >
 *      criação/R3), CSS (folha do DS × aplicação × navegador, var(), seletor do DS com outro valor), R1–R4 e cartão, CLI;
 *   2. navegador (headless, site sintético em memória + pacote DS sintético): nó criado pelo DS, atributo da página em nó
 *      estático, interior de shadow root do DS, autoria composta (R4), folha do DS em ::before, var() sobrescrita pela
 *      página, nó criado por clique na 2ª parada, cópia do exemplo oficial (ausência alegada) e ausência não alegada;
 *   3. forma do ensaio (D-138, fora da amostra; só leitura): a derivação da origem reproduz os derivados gravados da passada
 *      adjudicada, uma origem sintética muda classe/crédito pela regra P3, o recálculo usa e relata a origem (estrato 4) e,
 *      sem --origem, sai igual. Pula (com aviso) se o ensaio não estiver em govbr-resultados.
 *   npx tsx scripts/reanalise-nat74/test-origem-campanha.ts
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LoadedSite } from "../measurement-surface";
import { RESULTADOS, jsonTexto, sha } from "./comum";
import {
  FORMATO_ORIGEM, ORIGEM_VERSAO, aplicarOrigem, autoriaDaPilha, decidirCartao, decidirSujeito, donoCss, donoDoAtributo, executar, indexarCss,
  lerPacoteDS, lerQuadro, medir, normSeletor, normValor, paradaDaCena, regioesDS, tracosDaAlegacao,
  type Autoria, type ContextoCss, type DocOrigem, type PacoteDS, type Servido,
} from "./origem-campanha";
import { recalcular } from "./recalculo-campanha";
import { lerPassada } from "./revisao-campanha";

let n = 0, falhas = 0, pulados = 0;
const t = async (nome: string, f: () => void | Promise<void>) => { n++; try { await f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 4).join(" | ") : e}`); } };
const silencioso = async <T>(f: () => Promise<T>): Promise<T> => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return await f(); } finally { console.error = e; console.log = l; } };

// ───────────────────────────────────────────── pacote DS sintético (UMD "core" com marcas BR…) e site que o empacota
const DS_JS = `(function(e,t){typeof exports=="object"&&typeof module=="object"?module.exports=t():typeof define=="function"&&define.amd?define("core",[],t):typeof exports=="object"?exports["core"]=t():e.core=t()})(self,function(){
  class BRAlpha { constructor(el){ const b = document.createElement("button"); b.className = "br-fake-btn"; b.setAttribute("aria-hidden", "true"); el.appendChild(b); } }
  class BRBeta { constructor(el){ el.setAttribute("role", "option"); } }
  class BRFakeEl extends HTMLElement { connectedCallback(){ if (this.shadowRoot) return; const r = this.attachShadow({ mode: "open" }); const s = document.createElement("span"); s.className = "interior"; s.textContent = "x"; r.appendChild(s); } }
  const BRGamma = 1, BRDelta = 2, BREpsilon = 3;
  customElements.define("br-fake", BRFakeEl);
  return { BRAlpha, BRBeta, BRFakeEl, BRGamma, BRDelta, BREpsilon };
});
`;
const PAGINA_JS = `
var nucleo = self.core;
new nucleo.BRAlpha(document.querySelector(".br-fake"));
new nucleo.BRBeta(document.querySelector("#misto"));
document.querySelector("#misto").setAttribute("tabindex", "0");
document.querySelector("#estatico").setAttribute("aria-hidden", "true");
document.querySelector("#abrir").addEventListener("click", function () { var d = document.createElement("div"); d.id = "novo"; d.className = "painel"; d.setAttribute("aria-label", ""); d.textContent = "painel"; document.body.appendChild(d); });
`;
const DS_CSS = `.br-check input + label::before { border: 1px solid var(--borda); }\n:root { --borda: #cccccc; }\n.br-msg .close { color: #333333; }\n.text-azul { color: #1351b4; }\n.br-msg .realce { color: #555555; }\n.br-fake-btn { border-top: 1px solid #eeeeee; }\n`;
const PAGINA_CSS = `#estatico{color:red}.pagina{--borda:#dddddd}.br-msg .close{color:#000}`;
const HTML = `<!doctype html><html lang="pt-BR"><head><title>Teste</title><link rel="stylesheet" href="/estilo.css"></head><body>
<div class="br-fake"></div>
<button id="estatico">ok</button>
<div id="misto" class="br-item">item</div>
<br-fake></br-fake>
<div class="br-check"><input id="c1" type="checkbox"><label for="c1">Aceito</label></div>
<div class="br-check pagina"><input id="c2" type="checkbox"><label for="c2">Outro</label></div>
<div class="br-msg"><div class="close">x</div></div>
<h2 class="text-azul">Título</h2>
<div class="br-msg"><div class="realce">aviso</div></div>
<button id="abrir">abrir</button>
<script src="/app.js"></script></body></html>`;
const EXEMPLO_MSG = `<!doctype html><html><head><title>msg</title><link rel="stylesheet" href="../../core.css"></head><body><div class="br-msg"><div class="close">fechar</div></div><div class="br-msg"><div class="corpo"><div class="realce">a</div></div></div></body></html>`;
const EXEMPLO_CHECK = `<!doctype html><html><head><title>check</title><link rel="stylesheet" href="../../core.css"></head><body><div class="br-check"><input id="e1" type="checkbox"><label for="e1">Opção</label></div></body></html>`;

function pacoteSintetico(raiz: string): PacoteDS {
  mkdirSync(join(raiz, "dist", "components", "msg"), { recursive: true });
  writeFileSync(join(raiz, "package.json"), JSON.stringify({ name: "@govbr-ds/core", version: "9.9.9" }));
  writeFileSync(join(raiz, "dist", "core.js"), DS_JS);
  writeFileSync(join(raiz, "dist", "core.css"), DS_CSS);
  writeFileSync(join(raiz, "dist", "components", "msg", "examples.html"), EXEMPLO_MSG);
  mkdirSync(join(raiz, "dist", "components", "check"), { recursive: true });
  writeFileSync(join(raiz, "dist", "components", "check", "examples.html"), EXEMPLO_CHECK);
  return lerPacoteDS(raiz);
}
function siteSintetico(): LoadedSite {
  const arquivos: Record<string, { body: Buffer; type: string }> = {
    "/index.html": { body: Buffer.from(HTML), type: "text/html; charset=utf-8" },
    "/app.js": { body: Buffer.from(PAGINA_JS.replace("var nucleo", DS_JS + "\nvar nucleo")), type: "text/javascript" },
    "/estilo.css": { body: Buffer.from(DS_CSS.replace(/\s*\n\s*/g, "").replace(/ \+ /g, "+") + PAGINA_CSS), type: "text/css" },
  };
  return { manifest: { version: "teste", entry: "/index.html", sourceDist: "teste", corpusCommit: null, corpusDirty: null, files: Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, sha(v.body)])) } as LoadedSite["manifest"],
    manifestSha256: "0".repeat(64), files: new Map(Object.entries(arquivos)) };
}
const REF = { _meta: { url: "/index.html", setup: [{ action: "click" as const, selector: "#abrir" }, { action: "wait" as const, selector: "#novo" }], states: [{ id: "inicial", afterStep: 0 }, { id: "aberto", afterStep: 2 }], ds: "DS sintético 9.9.9" } };

const tmp = mkdtempSync(join(tmpdir(), "origem-campanha-"));
try {
  console.log("origem medida: puros");
  const pac = pacoteSintetico(join(tmp, "pacote"));

  await t("traços: atributos literais (aria-*, role, tabindex…), ausência alegada, nome; 'hidden' não casa em aria-hidden; '#id' não é id", () => {
    const a = tracosDaAlegacao("Com o calendário aberto, os botões não têm aria-label, texto nem title: não têm nome acessível.", "button-name");
    assert.deepEqual(a.atributos, ["aria-label", "title"]); assert.deepEqual(a.ausentes, ["aria-label", "title"]); assert.equal(a.nome, true); assert.deepEqual(a.css, []);
    const b = tracosDaAlegacao("O botão tem aria-hidden='true' mas é focável (tabindex='1').", "aria-hidden-focus");
    assert.deepEqual(b.atributos, ["aria-hidden", "tabindex"]); assert.deepEqual(b.ausentes, []);
    assert.deepEqual(tracosDaAlegacao("o campo #id-x é focável", null).atributos, []);
    const c = tracosDaAlegacao("Elemento interativo apenas com ícone (br-button)", "emag:2.2");
    assert.equal(c.nomeados, false);
  });
  await t("traços: CSS só com regra de apresentação quando há atributo; contraste sem grupo → cor + fundo; foco forçado; pseudo", () => {
    const a = tracosDaAlegacao("A página atual aparece com fundo escuro (classe active), mas não tem aria-current.", "wcag:1.3.1");
    assert.deepEqual(a.atributos, ["aria-current"]); assert.deepEqual(a.css, []); assert.deepEqual(a.cssDescartado, ["fundo"]); assert.deepEqual(a.ausentes, ["aria-current"]);
    const b = tracosDaAlegacao("A borda que desenha o círculo do radio (label::before) é 1px solid rgb(204,204,204) sobre fundo branco", "wcag:1.4.11");
    assert.deepEqual(b.css, ["background-color", "border-top-color"]); assert.deepEqual(b.pseudo, ["before"]); assert.equal(b.foco, false);
    const c = tracosDaAlegacao("Com foco por teclado, outline none e box-shadow none", "wcag:2.4.7");
    assert.ok(c.css.includes("outline-style") && c.css.includes("box-shadow")); assert.equal(c.foco, true);
    assert.deepEqual(tracosDaAlegacao("contraste insuficiente do texto", "color-contrast").css, ["background-color", "color"]);
  });
  await t("regiões DS: chamada UMD com nome e ≥ 5 marcas do pacote; código da página fora; poucas marcas não bastam; arquivo idêntico", () => {
    const bundle = "var a=1;" + DS_JS + "function pagina(){document.createElement('p')}";
    const rs = regioesDS(bundle, [pac]);
    assert.equal(rs.length, 1); assert.equal(rs[0].modo, "umd"); assert.equal(rs[0].nomeUmd, "core");
    assert.ok(rs[0].inicio >= 8 && rs[0].fim <= bundle.indexOf("function pagina"));
    assert.ok(bundle.slice(rs[0].inicio, rs[0].fim).includes("BRAlpha"));
    const pobre = { ...pac, js: pac.js.map(f => ({ ...f, marcas: [...f.marcas, "BRZeta", "BRTheta", "BRIota", "BRKappa", "BRLambda", "BRMu", "BRNu"] })) };
    assert.equal(regioesDS(bundle.replace(/BRGamma|BRDelta|BREpsilon|BRFakeEl/g, "Xx"), [pobre]).length, 0);
    const id = regioesDS(DS_JS, [pac]); assert.equal(id[0].modo, "arquivo-identico"); assert.equal(id[0].fim, DS_JS.length);
    assert.deepEqual(regioesDS("function x(){}", [pac]), []);
  });
  const bundle = "var a=1;\n" + DS_JS + "function pagina(){document.createElement('p')}";
  const sv: Servido = { origem: "http://127.0.0.1:1", pacotes: [pac], regioes: new Map(), arquivo: c => (c === "/app.js" ? { texto: bundle, sha256: sha(bundle) } : null) };
  const linhaDS = bundle.split("\n").findIndex(l => l.includes("class BRAlpha")) + 1;
  const ultima = bundle.split("\n").length;
  await t("quadro → dono: região DS → ds; fora → página; sem pilha → HTML estático; sem endereço / outra origem / fora dos bytes → indeterminado", () => {
    assert.deepEqual(lerQuadro("at r._setBehavior (http://127.0.0.1:1/app.js:3:40)"), { funcao: "r._setBehavior", url: "http://127.0.0.1:1/app.js", linha: 3, coluna: 40 });
    assert.equal(lerQuadro("at Array.forEach (<anonymous>)"), null);
    assert.equal(autoriaDaPilha([`at new BRAlpha (http://127.0.0.1:1/app.js:${linhaDS}:40)`], sv).dono, "ds");
    const pg = autoriaDaPilha(["at Array.forEach (<anonymous>)", `at pagina (http://127.0.0.1:1/app.js:${ultima}:5)`], sv);
    assert.equal(pg.dono, "pagina"); assert.equal(pg.quadro?.funcao, "pagina");
    assert.equal(autoriaDaPilha(null, sv).dono, "pagina");
    assert.equal(autoriaDaPilha(["at Array.forEach (<anonymous>)"], sv).dono, "indeterminado");
    assert.equal(autoriaDaPilha(["at x (http://outro:9/app.js:1:1)"], sv).dono, "indeterminado");
    assert.equal(autoriaDaPilha(["at x (http://127.0.0.1:1/fora.js:1:1)"], sv).dono, "indeterminado");
  });
  const quadroDS = `at new BRAlpha (http://127.0.0.1:1/app.js:${linhaDS}:40)`, quadroPg = `at pagina (http://127.0.0.1:1/app.js:${ultima}:5)`;
  const criadorPg: Autoria = { dono: "pagina", motivo: "página", quadro: null, regiao: null }, criadorDS: Autoria = { dono: "ds", motivo: "DS", quadro: null, regiao: null };
  await t("dono do atributo: a página escreveu o valor final (R2) > o DS escreveu o valor final > sem escrita = quem criou (R3, ausência)", () => {
    assert.equal(donoDoAtributo("aria-hidden", "true", [{ valor: "true", pilha: [quadroPg] }, { valor: "true", pilha: [quadroDS] }], criadorDS, sv).dono, "pagina");
    assert.equal(donoDoAtributo("role", "option", [{ valor: "option", pilha: [quadroDS] }], criadorPg, sv).dono, "ds");
    assert.equal(donoDoAtributo("aria-label", null, undefined, criadorDS, sv).dono, "ds");
    assert.equal(donoDoAtributo("aria-label", null, undefined, criadorPg, sv).dono, "pagina");
    assert.equal(donoDoAtributo("tabindex", "1", [{ valor: "0", pilha: [quadroDS] }], criadorPg, sv).como, "última escrita (valor registrado difere do final)");
  });
  await t("CSS: índice da folha do DS normaliza seletor (+, ::before, espaços) e atravessa @media", () => {
    const { indice, classes } = indexarCss("@media (min-width: 1px){ .a  >  .b::before { color : #FFF } }\n.c{border:1px solid var(--x);}");
    assert.ok(indice.get(normSeletor(".a>.b:before"))?.get("color")?.has("rgb(255,255,255)")); assert.equal(normValor("#CCC"), normValor("rgb(204, 204, 204)")); assert.equal(normValor("#00000080"), "rgba(0,0,0,0.502)");
    assert.ok(indice.get(".c")?.get("border")?.has("1px solid var(--x)"));
    assert.ok(classes.has("a") && classes.has("c"));
  });
  const regra = (sel: string, props: { name: string; value: string; important?: boolean }[], origin = "regular") => ({ rule: { selectorList: { selectors: [{ text: sel }], text: sel }, origin, style: { cssProperties: props }, styleSheetId: "s1" }, matchingSelectors: [0] });
  const cx = (casados: ContextoCss["casados"], pseudo: "before" | null = null): ContextoCss => ({ casados, pseudo, criador: criadorPg, escritas: {}, pacotes: [pac], sv, folhas: new Map([["s1", "/estilo.css"]]) });
  await t("CSS: declaração do DS que a página não sobrescreve → ds (com var() do DS); var() sobrescrita pela página → página; navegador → quem criou; seletor do DS com outro valor → indeterminado", () => {
    const dsBorda = regra(".br-check input+label:before", [{ name: "border", value: "1px solid var(--borda)" }, { name: "border-top-color", value: "" }]);
    const raiz = regra(":root", [{ name: "--borda", value: "#cccccc" }]);
    assert.equal(donoCss("border-top-color", cx({ pseudoElements: [{ pseudoType: "before", matches: [dsBorda] }], inherited: [{ matchedCSSRules: [raiz] }] }, "before")).dono, "ds");
    assert.equal(donoCss("border-top-color", cx({ pseudoElements: [{ pseudoType: "before", matches: [dsBorda] }], inherited: [{ matchedCSSRules: [regra(".pagina", [{ name: "--borda", value: "#dddddd" }])] }, { matchedCSSRules: [raiz] }] }, "before")).dono, "pagina");
    assert.equal(donoCss("color", cx({ matchedCSSRules: [regra("button", [{ name: "color", value: "buttontext" }], "user-agent")] })).dono, "pagina");
    assert.equal(donoCss("color", cx({ matchedCSSRules: [regra(".br-msg .close", [{ name: "color", value: "#000" }])] })).dono, "indeterminado");
    assert.equal(donoCss("color", cx({ matchedCSSRules: [regra(".br-msg .close", [{ name: "color", value: "#333333" }]), regra("#estatico", [{ name: "color", value: "red" }])] })).dono, "pagina");
    assert.equal(donoCss("outline-style", cx({ matchedCSSRules: [] })).dono, "pagina");
  });
  await t("R1–R4 do sujeito e regra do cartão", () => {
    const tr = (dono: "ds" | "pagina" | "indeterminado", valor: string | null = "x") => ({ traco: "a", tipo: "atributo" as const, valor, dono, como: "" });
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: { autoria: criadorDS }, tracos: [tr("pagina")], exemplo: null }).origem, "ds-entregue");
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: null, tracos: [tr("ds"), tr("pagina")], exemplo: null }).regra, "R4");
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: null, tracos: [tr("indeterminado")], exemplo: null }).origem, "indeterminada");
    const ex = (mesmoPadrao: boolean | null) => ({ pacote: "p", versao: "1", componente: "msg", arquivo: "a", sha256: "s", assinatura: [], candidatos: 1, mesmoPadrao, diferencas: [] });
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: null, tracos: [tr("pagina", null)], exemplo: ex(true) }).origem, "pagina-copiando-exemplo-ds");
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: null, tracos: [tr("pagina", null)], exemplo: ex(true) }).regra, "R3");
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: null, tracos: [tr("pagina")], exemplo: ex(null) }).origem, "pagina");
    assert.equal(decidirSujeito({ criacao: criadorPg, sombra: null, tracos: [tr("ds")], exemplo: ex(true) }).origem, "ds-entregue");
    assert.equal(decidirCartao(["pagina", "pagina-copiando-exemplo-ds"]).origem, "pagina");
    assert.equal(decidirCartao(["ds-entregue", "pagina"]).origem, "indeterminada");
    assert.equal(decidirCartao([]).origem, "indeterminada");
    assert.equal(decidirCartao(["ds-entregue", "ds-entregue"]).origem, "ds-entregue");
  });
  await t("cena → parada: WxH = última parada; WxH@parada; parada fora da lista recusa", () => {
    assert.equal(paradaDaCena(REF, "1280x900").parada?.id, "aberto");
    assert.equal(paradaDaCena(REF, "800x600@inicial").viewport.width, 800);
    assert.throws(() => paradaDaCena(REF, "1280x900@nada"), /fora de _meta.states/);
    assert.throws(() => paradaDaCena(REF, "grande"), /formato/);
  });
  await t("CLI: modo, --saida, --ds e entradas obrigatórios; opção desconhecida e --saida existente recusam", async () => {
    assert.equal(await silencioso(() => executar([])), 1);
    assert.equal(await silencioso(() => executar(["medir", "--saida", join(tmp, "x")])), 1);
    assert.equal(await silencioso(() => executar(["medir", "--passada", tmp, "--saida", join(tmp, "x"), "--site", tmp])), 1);
    assert.equal(await silencioso(() => executar(["medir", "--passada", tmp, "--saida", tmp, "--ds", join(tmp, "pacote"), "--site", tmp])), 1);
    assert.equal(await silencioso(() => executar(["outro", "--saida", join(tmp, "x")])), 1);
    assert.equal(await silencioso(() => executar(["medir", "--fila", "y"])), 1);
    assert.equal(await silencioso(() => executar(["sujeitos", "--saida", join(tmp, "x"), "--ds", join(tmp, "pacote"), "--referencia", join(tmp, "r.json")])), 1);
  });

  console.log("origem medida: navegador (site sintético)");
  await t("medição de ponta a ponta: DS cria (R1), página escreve em nó estático (R2), shadow do DS (R1), composta (R4), folha do DS em ::before, var() da página, 2ª parada, cópia do exemplo, ausência não alegada", async () => {
    const itens = [
      { id: "X1", regra: null, texto: "O botão criado tem aria-hidden.", sujeitos: [{ seletor: ".br-fake > button", cena: "1280x900@inicial" }] },
      { id: "X2", regra: null, texto: "O botão estático tem aria-hidden.", sujeitos: [{ seletor: "#estatico", cena: "1280x900@inicial" }] },
      { id: "X3", regra: null, texto: "O interior sem aria-label.", sujeitos: [{ seletor: "br-fake >>> span.interior", cena: "1280x900@inicial" }] },
      { id: "X4", regra: null, texto: "O item tem role=option e tabindex=0.", sujeitos: [{ seletor: "#misto", cena: "1280x900@inicial" }] },
      { id: "X5", regra: "wcag:1.4.11", texto: "A borda do label::before tem contraste baixo.", sujeitos: [{ seletor: ".br-check:not(.pagina) label", cena: "1280x900@inicial" }] },
      { id: "X6", regra: "wcag:1.4.11", texto: "A borda do label::before tem contraste baixo.", sujeitos: [{ seletor: ".br-check.pagina label", cena: "1280x900@inicial" }] },
      { id: "X7", regra: null, texto: "O painel tem aria-label vazio.", sujeitos: [{ seletor: "#novo", cena: "1280x900" }] },
      { id: "X8", regra: null, texto: "O fechar não tem aria-label nem role.", sujeitos: [{ seletor: ".br-msg .close", cena: "1280x900@inicial" }] },
      { id: "X9", regra: null, texto: "O fechar é um div com role e tabindex.", sujeitos: [{ seletor: ".br-msg .close", cena: "1280x900@inicial" }] },
      { id: "X10", regra: null, texto: "Seletor que não resolve.", sujeitos: [{ seletor: ".nao-existe", cena: "1280x900@inicial" }] },
      { id: "X11", regra: "ds:token-color", texto: "color: cor do texto do título fora dos tokens.", sujeitos: [{ seletor: "h2.text-azul", cena: "1280x900@inicial" }] },
      { id: "X12", regra: "ds:token-color", texto: "color: cor do texto do aviso fora dos tokens.", sujeitos: [{ seletor: ".br-msg > .realce", cena: "1280x900@inicial" }] },
      { id: "X13", regra: "wcag:1.4.11", texto: "A borda do botão tem contraste baixo.", sujeitos: [{ seletor: ".br-fake > button", cena: "1280x900@inicial" }] },
    ];
    const r = await medir({ site: siteSintetico(), rotulo: "teste", referencia: REF, referenciaSha256: "r", pacotes: [pac] }, itens);
    const o = Object.fromEntries(r.cartoes.map(c => [c.id, c]));
    assert.equal(o.X1.origem, "ds-entregue"); assert.equal(o.X1.sujeitos[0].criacao?.dono, "ds");
    assert.equal(o.X2.origem, "pagina"); assert.equal(o.X2.sujeitos[0].criacao?.tipo, "html-estatico");
    assert.equal(o.X3.origem, "ds-entregue"); assert.equal(o.X3.sujeitos[0].sombra?.autoria.dono, "ds");
    assert.equal(o.X4.origem, "indeterminada"); assert.equal(o.X4.regraDeDecisao, "sujeitos"); assert.equal(o.X4.sujeitos[0].regra, "R4");
    assert.equal(o.X5.origem, "ds-entregue", o.X5.porque + JSON.stringify(o.X5.sujeitos[0].tracos) + JSON.stringify(o.X5.sujeitos[0].exemplo));
    assert.equal(o.X6.origem, "pagina", o.X6.porque + JSON.stringify(o.X6.sujeitos[0].tracos));
    assert.equal(o.X7.origem, "pagina"); assert.equal(o.X7.sujeitos[0].parada, "aberto");
    assert.equal(o.X8.origem, "pagina-copiando-exemplo-ds", o.X8.porque); assert.equal(o.X8.sujeitos[0].exemplo?.componente, "msg");
    assert.equal(o.X9.origem, "pagina", o.X9.porque); assert.equal(o.X9.sujeitos[0].exemplo?.mesmoPadrao, null);
    assert.equal(o.X10.origem, "indeterminada"); assert.equal(o.X10.sujeitos[0].ok, false);
    // escolha de classe (revisão 20/10): estrutura do exemplo → DS (X5); classe utilitária da página sem componente → página;
    // classe do DS usada pelo exemplo com o mesmo valor, fora da estrutura → cópia; classe aplicada pelo DS → DS.
    const ev5 = o.X5.sujeitos[0].tracos!.find(x => x.traco.includes("border-top-color"))!.evidencia as { escolha: string };
    assert.match(ev5.escolha, /estrutura do componente/);
    assert.equal(o.X11.origem, "pagina", o.X11.porque); assert.match(o.X11.sujeitos[0].tracos![0].como, /escolhida\(s\) pela página/);
    assert.equal(o.X12.origem, "pagina-copiando-exemplo-ds", o.X12.porque + JSON.stringify(o.X12.sujeitos[0].tracos));
    assert.equal(o.X13.origem, "ds-entregue", o.X13.porque + JSON.stringify(o.X13.sujeitos[0].tracos));
    assert.equal(Object.keys(r.regioes).length, 1);
    const r2 = await medir({ site: siteSintetico(), rotulo: "teste", referencia: REF, referenciaSha256: "r", pacotes: [pac] }, itens);
    assert.equal(JSON.stringify(r2.cartoes), JSON.stringify(r.cartoes), "determinismo");
  });

  console.log("origem medida: forma do ensaio (D-138, fora da amostra)");
  const T = join(RESULTADOS, "analises", "ensaio-trio-real-01", "trio-01");
  const ADJ = join(T, "revisao-20261019T7", "adjudicada-20261020T1");
  if (!existsSync(ADJ)) { pulados++; console.log("  (pulado: ensaio não encontrado em govbr-resultados)"); }
  else {
    const analises = [join(T, "analisar-20261019T1")];
    const p = lerPassada(ADJ, { analises });
    const violacoes = p.itens.filter(i => p.julgados.get(i.id)!.derivado.classe.startsWith("violacao"));
    await t("aplicarOrigem sem origem reproduz os derivados gravados de todos os 40 cartões (mesma derivação da ingestão)", () => {
      const r = aplicarOrigem(p, null);
      assert.equal(r.derivados.size, 40); assert.equal(r.aplicacao.length, 0);
      for (const it of p.itens) assert.deepEqual(r.derivados.get(it.id), p.julgados.get(it.id)!.derivado);
    });
    const docDS: DocOrigem = { formato: FORMATO_ORIGEM, versao: ORIGEM_VERSAO, modo: "passada", passada: { nome: p.nome, julgamentosSha256: p.julgSha }, cartoes: violacoes.map(i => ({ id: i.id, origem: "ds-entregue" as const })) };
    await t("origem ds-entregue: indeterminada → violacao-ds e vínculo creditado perde o crédito (P3/R5); página mantém; outra passada e sujeitos sintéticos recusam", () => {
      const r = aplicarOrigem(p, docDS);
      assert.equal(r.aplicacao.length, 37);
      assert.ok(r.aplicacao.every(a => a.classeDepois === "violacao-ds" && !a.creditoDepois));
      assert.ok(r.aplicacao.some(a => a.creditoAntes));
      const pg = aplicarOrigem(p, { ...docDS, cartoes: violacoes.map(i => ({ id: i.id, origem: "pagina" as const })) });
      assert.ok(pg.aplicacao.every(a => a.classeDepois === "violacao-pagina" && a.creditoDepois === a.creditoAntes));
      assert.throws(() => aplicarOrigem(p, { ...docDS, passada: { nome: p.nome, julgamentosSha256: "f".repeat(64) } }), /outra passada/);
      assert.throws(() => aplicarOrigem(p, { ...docDS, modo: "sujeitos" }), /sintéticos/);
    });
    await t("recálculo: --origem é usada (DS tira crédito → D muda; estrato 4 listado) e, sem --origem, sai igual", () => {
      const base = { analises, coletas: [join(T, "analisar-20261019T3", "coleta-trio.json")], residuoPassada: join(T, "primeira-passada-20261019T5") };
      const dir = join(tmp, "origem-ds");
      mkdirSync(dir);
      const txt = jsonTexto(docDS);
      writeFileSync(join(dir, "origem.json"), txt); writeFileSync(join(dir, "origem.json.sha256"), `${sha(txt)}  origem.json\n`);
      const sem = recalcular({ passadas: [ADJ], ...base });
      const com = recalcular({ passadas: [ADJ], ...base, origens: [dir] });
      assert.equal(sem.json.origem, undefined);
      const og = com.json.origem as { creditoRetirado: string[]; estrato4: { cartoes: unknown[] } };
      assert.ok(og.creditoRetirado.length > 0); assert.equal(og.estrato4.cartoes.length, 37);
      assert.notDeepEqual((com.json.tabelas as Record<string, { porTrio: unknown }[]>)["principal|1.2.0|primario"][0].porTrio, (sem.json.tabelas as Record<string, { porTrio: unknown }[]>)["principal|1.2.0|primario"][0].porTrio);
      assert.match(com.md, /## Origem medida \(D-129, §8\.6\)/);
      const de = recalcular({ passadas: [ADJ], ...base });
      assert.equal(JSON.stringify(de.json), JSON.stringify(sem.json));
      writeFileSync(join(dir, "origem.json.sha256"), `${"0".repeat(64)}  origem.json\n`);
      assert.throws(() => recalcular({ passadas: [ADJ], ...base, origens: [dir] }), /não confere/);
    });
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da origem medida passaram${pulados ? ` (${pulados} parte(s) pulada(s))` : ""}`);
if (falhas) process.exit(1);
