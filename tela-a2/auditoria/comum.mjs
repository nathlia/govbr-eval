/**
 * Condições de medida da auditoria cega da tela A2 ("Acompanhar requerimento").
 * Entrada, espera, setup e estados vêm SÓ de ../ancoras-neutras.json (lista neutra).
 * Sem modelo, sem oráculo (govbr-ds-validator), sem axe: Playwright + CDP + estilos computados.
 * Mede a página como servida (http://127.0.0.1:3218, `node tela-a2/servir.mjs`), nunca os fontes.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const ANCORAS = JSON.parse(readFileSync(join(AQUI, "..", "ancoras-neutras.json"), "utf8"));
export const BASE = process.env.APP_URL || "http://127.0.0.1:3218";
export const URL_ENTRADA = BASE + ANCORAS.entrada;
export const VIEWPORT = { width: 1280, height: 900 };
export const ESTADOS = ANCORAS.states;
export const SETUP = ANCORAS.setup;
export const MEDIDAS = join(AQUI, "medidas");
export const KB_DIR = join(AQUI, "../../../govbr-ds-validator/data/knowledge/versions/3.7.0-literal-2026-10-15/normalized");

export async function abrirNavegador() {
  return chromium.launch({ headless: !process.argv.includes("--headed") });
}

/** Contexto novo (carga limpa), registra pedidos e navegações do quadro principal. */
export async function novaPagina(navegador) {
  const contexto = await navegador.newContext({ viewport: VIEWPORT, locale: "pt-BR", timezoneId: "America/Sao_Paulo", reducedMotion: "no-preference" });
  const pagina = await contexto.newPage();
  const pedidos = [], navegacoes = [], erros = [];
  pagina.on("request", r => pedidos.push({ metodo: r.method(), url: r.url() }));
  pagina.on("framenavigated", f => { if (f === pagina.mainFrame()) navegacoes.push({ t: Date.now(), url: f.url() }); });
  const cargas = [];
  pagina.on("pageerror", e => erros.push(String(e.message)));
  pagina.on("load", () => cargas.push(Date.now()));
  return { contexto, pagina, pedidos, navegacoes, erros, cargas };
}

export async function carregar(pagina) {
  await pagina.goto(URL_ENTRADA, { waitUntil: "load" });
  await pagina.waitForSelector(ANCORAS.waitFor, { timeout: 15000 });
  await pagina.waitForTimeout(300);
}

/** Passos do setup com a semântica da lista neutra (click / wait). */
export async function executarPassos(pagina, passos) {
  for (const p of passos) {
    if (p.action === "click") await pagina.click(p.selector);
    else if (p.action === "wait") await pagina.waitForSelector(p.selector, { timeout: 10000 });
    else throw new Error("ação desconhecida " + p.action);
    await pagina.waitForTimeout(200);
  }
  await pagina.waitForTimeout(300);
}

/** Carga nova + setup até o estado; devolve também o instante da carga (protocolo: medidas em ≤ 120 s). */
export async function irPara(navegador, estado) {
  const np = await novaPagina(navegador);
  await carregar(np.pagina);
  np.t0 = Date.now();
  await executarPassos(np.pagina, SETUP.slice(0, estado.afterStep));
  return np;
}

export const ehExterno = url => !url.startsWith(BASE) && !url.startsWith("data:") && !url.startsWith("about:");
