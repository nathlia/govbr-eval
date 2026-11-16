/**
 * Tela E2 — âncoras neutras da referência (passo 5 da reconciliação): define, para cada unidade da referência
 * (specs sorteadas e controles conformes) e para os gatilhos de estado, um seletor estável (id de instância do
 * inventário, D-24) e um texto neutro (papel + rótulo visível, nunca o defeito), e confere na página servida que
 * cada âncora resolve com a contagem declarada em cada parada da sequência aditiva S0 → S1 → S2.
 * Sem oráculo, sem axe. Uso: node tela-e2/conferir-ancoras.mjs [porta=3219]  (dist servido por servir.mjs)
 * Grava tela-e2/ancoras-referencia.json.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const AQUI = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(AQUI, "../package.json"));
const { chromium } = require("playwright");
const BASE = `http://127.0.0.1:${process.argv[2] ?? 3219}`;

const setup = [
  { action: "click", selector: "#btn-salvar" },
  { action: "wait", selector: "#msg-erro:not([hidden])" },
  { action: "click", selector: "#sel-continente [data-trigger]" },
  { action: "wait", selector: "#sel-continente .br-list[expanded]" },
];
const states = [
  { id: "S0", afterStep: 0, path: "/cadastro-pais.html", note: "carga inicial" },
  { id: "S1", afterStep: 2, path: "/cadastro-pais.html", note: "Salvar País acionado com o formulário vazio" },
  { id: "S2", afterStep: 4, path: "/cadastro-pais.html", note: "gatilho do select Continente acionado (lista aberta), depois de S1" },
];
// celula → âncora. scope/expectedCount/participantCount como na A2 (composicao = uma unidade, vários participantes).
const SPECS = [
  { celula: "btn-limpar::a2-2ac598dc24db", anchor: "#btn-limpar", scope: "unico", expectedCount: 1, state: "sempre", texto: "botão 'Limpar Campos' da barra de ações do formulário" },
  { celula: "msg-orientacao::a2-d6b3f0e36943", anchor: "#msg-orientacao .message-body", scope: "unico", expectedCount: 1, state: "sempre", texto: "corpo da mensagem informativa 'Como cadastrar.'" },
  { celula: "btn-ajuda::a2-5b47246a41c1", anchor: "#btn-ajuda", scope: "unico", expectedCount: 1, state: "sempre", texto: "botão circular 'Ajuda sobre o cadastro' ao lado do título" },
  { celula: "inp-codigo::a2-a39f3ad397d4", anchor: "#inp-codigo", scope: "unico", expectedCount: 1, state: "sempre", texto: "campo 'Código do país (opcional)' (rótulo, campo e texto de apoio)" },
  { celula: "rad-situacao::a2-f838b54da560", anchor: "#rad-situacao legend", scope: "unico", expectedCount: 1, state: "sempre", texto: "legenda do grupo 'Situação do cadastro'" },
  { celula: "msg-erro::a2-ef29db5bb4ac", anchor: "#msg-erro", scope: "unico", expectedCount: 1, state: "S1", texto: "mensagem 'Não foi possível salvar o país.'" },
  { celula: "sel-continente::a2-7348bce34289", anchor: "#sel-continente .br-list .br-item label", scope: "composicao", expectedCount: 1, participantCount: 6, state: "S2", texto: "rótulos das 6 opções da lista do select 'Continente'" },
  { celula: "inp-nome-pais::a2-328f62cfe4ce", anchor: "#nome-pais", scope: "unico", expectedCount: 1, state: "sempre", texto: "campo 'Nome do país'" },
  { celula: "lst-paises::a2-5432c282d0d7", anchor: "#lst-paises .item-pais", scope: "composicao", expectedCount: 1, participantCount: 4, state: "sempre", texto: "os 4 itens da lista 'Países Cadastrados'" },
];
// Controles conformes (regra em reconciliacao.md § 8).
const CONTROLES = [
  { id: "K-01", instancia: "hdr-govbr", selector: "#cabecalho", count: 1, state: "S0", texto: "cabeçalho gov.br" },
  { id: "K-02", instancia: "ftr-govbr", selector: "#rodape", count: 1, state: "S0", texto: "rodapé gov.br" },
  { id: "K-03", instancia: "div-secoes", selector: "#div-secoes", count: 1, state: "S0", texto: "divisor entre a configuração e a lista" },
  { id: "K-04", instancia: "swt-certificado", selector: "#swt-certificado", count: 1, state: "S0", texto: "switch 'Emitir certificado sanitário automaticamente…'" },
  { id: "K-05", instancia: "btn-cancelar", selector: "#btn-cancelar", count: 1, state: "S0", texto: "botão 'Cancelar' da barra de ações" },
];

const nav = await chromium.launch({ headless: true });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", e => erros.push(String(e.message)));
let navegacoes = 0;
p.on("framenavigated", f => { if (f === p.mainFrame()) navegacoes++; });
await p.goto(BASE + "/cadastro-pais.html", { waitUntil: "load" });
await p.waitForSelector("#main-content");
const medir = async () => {
  const r = {};
  for (const s of SPECS) r[s.celula] = await p.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length, s.anchor);
  for (const k of CONTROLES) r[k.id] = await p.evaluate(sel => document.querySelectorAll(sel).length, k.selector);
  return r;
};
const porParada = { S0: await medir() };
let passo = 0;
for (const st of states.slice(1)) {
  while (passo < st.afterStep) {
    const a = setup[passo++];
    if (a.action === "click") await p.click(a.selector);
    else await p.waitForSelector(a.selector, { timeout: 5000 });
  }
  await p.waitForTimeout(400);
  porParada[st.id] = await medir();
}
await nav.close();

const problemas = [];
const paradasDe = st => st === "sempre" ? ["S0", "S1", "S2"] : states.slice(states.findIndex(s => s.id === st)).map(s => s.id); // aditiva: vale da parada em diante
for (const s of SPECS) {
  const esperado = s.participantCount ?? s.expectedCount;
  s.medido = Object.fromEntries(Object.entries(porParada).map(([k, v]) => [k, v[s.celula]]));
  for (const st of paradasDe(s.state)) if (s.medido[st] !== esperado) problemas.push(`${s.celula} em ${st}: ${s.medido[st]} visíveis, esperado ${esperado}`);
}
for (const k of CONTROLES) {
  k.medido = Object.fromEntries(Object.entries(porParada).map(([st, v]) => [st, v[k.id]]));
  for (const st of ["S0", "S1", "S2"]) if (k.medido[st] !== k.count) problemas.push(`${k.id} em ${st}: ${k.medido[st]}`);
}
if (erros.length) problemas.push(`erros de página: ${erros.join(" | ")}`);
if (navegacoes > 1) problemas.push(`navegação/recarga durante o setup (${navegacoes})`);

const out = {
  _meta: { tela: "E2 — cadastro-pais.html", data: "2026-11-14", regra: "seletor = id de instância do inventário (D-24: lugar, nunca defeito) ou descendente estrutural dele; texto = papel + rótulo visível; nenhuma âncora nomeia o defeito. Contagem = elementos visíveis.",
    pagina: BASE + "/cadastro-pais.html", viewport: "1280×900", problemas },
  waitFor: "#main-content", setup, states, specs: SPECS, controles: CONTROLES,
};
writeFileSync(join(AQUI, "ancoras-referencia.json"), JSON.stringify(out, null, 1) + "\n");
console.log(problemas.length ? "PROBLEMAS:\n" + problemas.join("\n") : `ok: ${SPECS.length} specs e ${CONTROLES.length} controles resolvem em S0 → S1 → S2 (aditiva)`);
process.exit(problemas.length ? 1 : 0);
