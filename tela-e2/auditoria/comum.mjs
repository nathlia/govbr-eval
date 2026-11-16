/**
 * Condições de medida da auditoria cega da tela E2 ("Cadastrar país importador").
 * Entrada e estados vêm SÓ de ../inventario.json (lista neutra). Sem oráculo, sem axe: Playwright + CDP + estilos computados.
 * Mede a página como servida (http://127.0.0.1:3219, `node servir.mjs 3219`), nunca fontes.
 */
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const INVENTARIO = JSON.parse(readFileSync(join(AQUI, "..", "inventario.json"), "utf8"));
export const BASE = process.env.APP_URL || "http://127.0.0.1:3219";
export const URL_ENTRADA = BASE + "/cadastro-pais.html";
export const VIEWPORT = { width: 1280, height: 900 };
export const SAIDA = process.env.AUDITORIA_SAIDA ? resolve(process.env.AUDITORIA_SAIDA) : AQUI;
export const MEDIDAS = join(SAIDA, "medidas");
export const CORPUS = "F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus";

/** Estados declarados no inventário; gatilhos traduzidos em ações neutras (texto/papel visível). */
export const ESTADOS = [
  { id: "S0", descricao: INVENTARIO.estados[0].descricao, passos: [] },
  { id: "S1", descricao: INVENTARIO.estados[1].descricao, passos: [{ acao: "click", alvo: "#btn-salvar" }] },
  { id: "S2", descricao: INVENTARIO.estados[2].descricao, passos: [{ acao: "click", alvo: "#sel-continente [data-trigger]" }] },
];

export async function abrirNavegador() { return chromium.launch({ headless: !process.argv.includes("--headed") }); }

export async function novaPagina(navegador, viewport = VIEWPORT) {
  const contexto = await navegador.newContext({ viewport, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const pagina = await contexto.newPage();
  const pedidos = [], erros = [], navegacoes = [], consoles = [];
  pagina.on("request", r => pedidos.push({ metodo: r.method(), url: r.url() }));
  pagina.on("pageerror", e => erros.push(String(e.message)));
  pagina.on("console", m => { if (m.type() === "error" || m.type() === "warning") consoles.push(m.type() + ": " + m.text()); });
  pagina.on("framenavigated", f => { if (f === pagina.mainFrame()) navegacoes.push(f.url()); });
  return { contexto, pagina, pedidos, erros, navegacoes, consoles };
}

export async function carregar(pagina) {
  await pagina.goto(URL_ENTRADA, { waitUntil: "load" });
  await pagina.waitForSelector("#main-content", { timeout: 15000 });
  await pagina.waitForTimeout(400);
}

export async function executarPassos(pagina, passos) {
  for (const p of passos) {
    if (p.acao === "click") await pagina.click(p.alvo);
    await pagina.waitForTimeout(350);
  }
}

export async function irPara(navegador, estado, viewport) {
  const np = await novaPagina(navegador, viewport);
  await carregar(np.pagina);
  np.t0 = Date.now();
  await executarPassos(np.pagina, estado.passos);
  await np.pagina.evaluate((await import("./util-navegador.mjs")).UTIL);
  return np;
}

export function gravar(rel, obj) { const f = join(MEDIDAS, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(obj, null, 1)); return f; }

/** Árvore AX (CDP) de um seletor: papel, nome, propriedades. */
export async function ax(pagina, sel) {
  const c = await pagina.context().newCDPSession(pagina);
  await c.send("Accessibility.enable");
  const { root } = await c.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeId } = await c.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  if (!nodeId) { await c.detach(); return null; }
  const { node } = await c.send("DOM.describeNode", { nodeId });
  const { nodes } = await c.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false });
  await c.detach();
  const x = nodes[0];
  return { papel: x.role?.value, nome: x.name?.value ?? "", ignorado: !!x.ignored, props: Object.fromEntries((x.properties || []).map(q => [q.name, q.value?.value])) };
}

/** Tab a partir do início do documento até casar `sel` (ou max). */
export async function tabAte(p, sel, max = 40) {
  await p.evaluate(() => { document.activeElement?.blur(); window.getSelection()?.removeAllRanges(); });
  await p.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); });
  for (let i = 0; i < max; i++) { await p.keyboard.press("Tab"); await p.waitForTimeout(60); if (await p.evaluate(s => document.activeElement?.matches(s), sel)) return i + 1; }
  return 0;
}
