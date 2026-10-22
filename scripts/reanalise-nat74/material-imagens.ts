/**
 * Imagens do material da autora (entrega 6, revisão do orquestrador 20/10): para cada caso, a página congelada é aberta em
 * Playwright headless na janela do cartão, a receita do cartão é refeita COMO ESCRITA (passo a passo, sem completar nem
 * corrigir), e grava-se (a) a tela inteira sem marca e com os elementos do cartão contornados por uma camada própria (um
 * elemento absoluto acrescentado ao documento, sem mexer em estilo nenhum da página), (b) um recorte em volta do elemento,
 * (c) uma linha MEDIDA: onde está o foco depois dos passos e os valores que a alegação nomeia literalmente (atributos e CSS,
 * pela mesma tabela fixa da origem medida, `tracosDaAlegacao`). Mede, não julga. Passo que o intérprete não sabe refazer, ou
 * que não chega aonde diz (ex.: "Tab x8 até #servico" termina noutro elemento), é dito com todas as letras.
 */
import { chromium, type Locator, type Page } from "playwright";
import { createSiteServer, loadSite } from "../measurement-surface";
import type { CartaoCego } from "./e14-comum";
import { tracosDaAlegacao } from "./origem-campanha";

export const IMAGENS_VERSAO = "nat78-material-imagens-1.1.0";

export type Alvo = { css: string } | { nome: string; papel: "button" | null } | { texto: string };
export type Acao =
  | { tipo: "nada"; esperar: string | null }
  | { tipo: "esperar"; css: string }
  | { tipo: "clicar"; alvo: Alvo }
  | { tipo: "focar"; alvo: Alvo }
  | { tipo: "preencher"; alvo: Alvo; valor: string }
  | { tipo: "tecla"; tecla: string; vezes: number; ate: Alvo | null; focoEsperado: Alvo | null; em: Alvo | null };

const TAGS = /^(?:a|body|button|div|form|h[1-6]|html|input|label|li|main|nav|option|p|section|select|span|table|td|textarea|th|tr|ul)$/;
/** Seletor CSS escrito: começa por . # [, ou é etiqueta HTML minúscula (sozinha ou seguida de . # [). Nome com maiúscula é texto. */
const pareceCss = (s: string): boolean => {
  const t = s.trim();
  if (/\s/.test(t)) return false;
  if (/^[.#[][\w-]/.test(t) || TAGS.test(t)) return true;
  const m = /^([a-z][a-z0-9]*)[.#[][\w-]/.exec(t);
  return !!m && TAGS.test(m[1]);
};
const TECLAS: Record<string, string> = { tab: "Tab", "shift+tab": "Shift+Tab", enter: "Enter", escape: "Escape", esc: "Escape", space: "Space", espaco: "Space" };

/** Alvo escrito no passo: `css` entre crases, "texto" entre aspas, seletor CSS, "o botão X …", ou um nome. */
export function lerAlvo(s0: string): Alvo {
  let s = s0.trim().replace(/\s+com o formul[aá]rio vazio$/i, "").trim();
  const par = /\(([^)]*)\)\s*$/.exec(s);
  if (par) {
    s = s.slice(0, par.index).trim();
    const dentro = par[1].replace(/`/g, "").trim();
    if (pareceCss(dentro)) return { css: dentro };
  }
  s = s.replace(/\s+com o formul[aá]rio vazio$/i, "").trim();
  const crase = /^`([^`]+)`$/.exec(s);
  if (crase) return { css: crase[1] };
  const aspas = /^(?:o texto |no texto )?["“]([^"”]+)["”]$/.exec(s);
  if (aspas) return { texto: aspas[1] };
  if (pareceCss(s)) return { css: s };
  const botao = /^(?:o |no )?bot[aã]o\s+(.+?)(?:\s+d[aoe]s?\s+.*)?$/i.exec(s);
  if (botao) return { nome: botao[1].replace(/^["“'‘]|["”'’]$/g, ""), papel: "button" };
  return { nome: s.replace(/^(?:o |a |no |na )/i, ""), papel: null };
}

/**
 * Lê um passo escrito; `null` = o intérprete não sabe refazê-lo (e diz isso, sem adivinhar). 1.1.0 (ensaio-trio-real-02):
 * também "clique em X", o verbo antes da tecla ("tecla Tab", "pressionar Enter"), "… a partir do carregamento" (= da página
 * recém-aberta, onde toda receita começa) e "preencher X com 'v'" / "digitar 'v' em X" (valor entre aspas, escrito no campo).
 */
export function lerPasso(p0: string): Acao | null {
  const p = p0.trim().replace(/\s+a partir do carregamento(?: da p[aá]gina)?$/i, "").replace(/^(?:tecla|pressionar|pressione|apertar|aperte)\s+(?=\S)/i, "");
  let m: RegExpExecArray | null;
  if ((m = /^(?:load|abrir a p[aá]gina|abrir o endere[cç]o da tela)(?:\s*\(.*\))?(?: e esperar `([^`]+)`)?$/i.exec(p))) return { tipo: "nada", esperar: m[1] ?? null };
  if ((m = /^esperar `([^`]+)`(?: aparecer)?$/i.exec(p))) return { tipo: "esperar", css: m[1] };
  if ((m = /^(?:click|clicar|clique|clica)(?: em| no| na)?\s+(.+)$/i.exec(p))) return { tipo: "clicar", alvo: lerAlvo(m[1].replace(/^(?:no |o )?texto\s+(?=["“])/i, "")) };
  if ((m = /^(?:focus|focar)(?: em)?\s+(.+)$/i.exec(p))) return { tipo: "focar", alvo: lerAlvo(m[1]) };
  if ((m = /^(?:preencher|preencha|digitar|digite)(?: em| o| a| no| na)?\s+(.+?)\s+com\s+["“'‘]([^"”'’]*)["”'’]$/i.exec(p))) return { tipo: "preencher", alvo: lerAlvo(m[1]), valor: m[2] };
  if ((m = /^(?:digitar|digite)\s+["“'‘]([^"”'’]*)["”'’]\s+(?:em|no|na)\s+(.+)$/i.exec(p))) return { tipo: "preencher", alvo: lerAlvo(m[2]), valor: m[1] };
  if ((m = /^(shift\+tab|tab|enter|escape|esc|space|espa[cç]o)(?:\s*x\s*(\d+))?(?:\s+at[eé]\s+(.+?))?(?:\s+em\s+(.+?))?(?:\s*\(([^)]*)\))?$/i.exec(p))) {
    const tecla = TECLAS[m[1].toLowerCase().replace("ç", "c")];
    if (!tecla) return null;
    const foco = m[5] ? /^foco em\s+(.+)$/i.exec(m[5].trim()) : null;
    return { tipo: "tecla", tecla, vezes: m[2] ? Number(m[2]) : 1, ate: m[3] ? lerAlvo(m[3]) : null, em: m[4] ? lerAlvo(m[4]) : null, focoEsperado: foco ? lerAlvo(foco[1]) : null };
  }
  return null;
}

const descAlvo = (a: Alvo) => ("css" in a ? a.css : "texto" in a ? `"${a.texto}"` : `${a.papel === "button" ? "botão " : ""}"${a.nome}"`);

function localizar(page: Page, a: Alvo): Locator {
  if ("css" in a) return page.locator(a.css);
  if ("texto" in a) return page.getByText(a.texto, { exact: true });
  const porPapel = a.papel ? page.getByRole(a.papel, { name: a.nome, exact: true }) : page.getByRole("button", { name: a.nome, exact: true }).or(page.getByRole("link", { name: a.nome, exact: true }));
  return porPapel.or(page.getByText(a.nome, { exact: true }));
}

/** O elemento focado, descrito como no cartão (etiqueta#id.classe "texto"). */
const DESCREVER = `(el) => { if (!el || el === document.body) return "<body> (nenhum elemento focado)"; const t = el.tagName.toLowerCase();
  const id = el.id ? "#" + el.id : ""; const cl = !id && el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "";
  const nome = (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  return "<" + t + id + cl + ">" + (nome ? " \\"" + nome + "\\"" : ""); }`;

async function focoCasa(page: Page, a: Alvo): Promise<boolean> {
  const hs = await localizar(page, a).elementHandles().catch(() => []);
  for (const h of hs) if (await h.evaluate(el => el === document.activeElement || el.contains(document.activeElement))) return true;
  return false;
}

export interface Captura { tela: Buffer; telaSemMarca: Buffer; recorte: Buffer | null; passos: string[]; medida: string[]; alcancou: boolean }

async function umClique(page: Page, a: Alvo, nota: string[]): Promise<boolean> {
  const l = localizar(page, a);
  const n = await l.count();
  if (!n) { nota.push(`não achei ${descAlvo(a)} na página`); return false; }
  if (n > 1) nota.push(`${descAlvo(a)} casa ${n} elementos; usei o primeiro`);
  await l.first().click({ timeout: 3000 });
  return true;
}

/** Refaz a receita como escrita e mede. Devolve o relato de cada passo (o que foi feito, o que não deu). */
export async function capturarCaso(page: Page, url: string, waitFor: string | null, c: CartaoCego): Promise<Captura> {
  await page.goto(url, { waitUntil: "load" });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(300);
  const passos: string[] = [];
  let alcancou = true;
  if (!c.alegacao.estado.passos.length) passos.push("nenhum passo no cartão: página no estado inicial");
  for (const [i, p] of c.alegacao.estado.passos.entries()) {
    const n = `passo ${i + 1} ("${p}")`;
    const a = lerPasso(p);
    if (!a) { passos.push(`${n}: não sei refazer este passo automaticamente; a imagem mostra o estado antes dele`); alcancou = false; break; }
    const nota: string[] = [];
    try {
      if (a.tipo === "nada") { if (a.esperar) await page.waitForSelector(a.esperar, { timeout: 5000 }); }
      else if (a.tipo === "esperar") await page.waitForSelector(a.css, { state: "visible", timeout: 5000 });
      else if (a.tipo === "clicar") { if (!(await umClique(page, a.alvo, nota))) alcancou = false; }
      else if (a.tipo === "preencher") { const l = localizar(page, a.alvo); if (await l.count()) await l.first().fill(a.valor, { timeout: 3000 }); else { nota.push(`não achei ${descAlvo(a.alvo)}`); alcancou = false; } }
      else if (a.tipo === "focar") { const l = localizar(page, a.alvo); if (await l.count()) await l.first().focus(); else { nota.push(`não achei ${descAlvo(a.alvo)}`); alcancou = false; } }
      else {
        if (a.em) { const l = localizar(page, a.em); if (await l.count()) await l.first().focus(); else { nota.push(`não achei ${descAlvo(a.em)}`); alcancou = false; } }
        if (a.ate && !/\bx\s*\d/i.test(p)) {
          let k = 0; while (k < 60 && !(await focoCasa(page, a.ate))) { await page.keyboard.press(a.tecla); k++; }
          if (!(await focoCasa(page, a.ate))) { nota.push(`${a.tecla} 60 vezes sem chegar a ${descAlvo(a.ate)}`); alcancou = false; } else nota.push(`${k}× ${a.tecla}`);
        } else {
          for (let k = 0; k < a.vezes; k++) await page.keyboard.press(a.tecla);
          const alvo = a.ate ?? a.focoEsperado;
          if (alvo && !(await focoCasa(page, alvo))) {
            const onde = await page.evaluate(`(${DESCREVER})(document.activeElement)`) as string;
            nota.push(`termina com o foco em ${onde}, não em ${descAlvo(alvo)}`); alcancou = false;
          }
        }
      }
    } catch (e) { nota.push(`falhou: ${(e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 120)}`); alcancou = false; }
    await page.waitForTimeout(250);
    passos.push(`${n}: ${nota.length ? nota.join("; ") : "feito"}`);
  }
  // Medida (antes de qualquer marca), depois as imagens.
  const tr = tracosDaAlegacao([c.alegacao.observado ?? "", c.alegacao.esperado ?? ""].join("\n"), c.alegacao.regra);
  const chaves = c.alegacao.sujeitos.map(s => s.chave).filter((k): k is string => !!k);
  const medida = await page.evaluate(`((a) => {
    const descrever = ${DESCREVER};
    const els = a.chaves.map(k => { try { return document.querySelector(k); } catch { return null; } });
    const ativo = document.activeElement;
    const i = els.findIndex(e => e === ativo), j = els.findIndex(e => e && e !== ativo && e.contains(ativo));
    const L = ["foco depois dos passos: " + descrever(ativo) + (i >= 0 ? " (é o elemento " + (i + 1) + " do cartão)" : j >= 0 ? " (dentro do elemento " + (j + 1) + " do cartão)" : " (não é elemento deste cartão)")];
    els.forEach((el, k) => {
      if (!el) { L.push("elemento " + (k + 1) + ": não existe na página neste estado"); return; }
      const v = [];
      for (const at of a.atributos) { const x = el.getAttribute(at); v.push(at + " " + (x === null ? "ausente" : '"' + x + '"')); }
      const cs = getComputedStyle(el);
      for (const p of a.css) v.push(p + " " + cs.getPropertyValue(p));
      for (const ps of a.pseudo) { const c2 = getComputedStyle(el, "::" + ps); for (const p of a.css) v.push("::" + ps + " " + p + " " + c2.getPropertyValue(p)); }
      L.push(descrever(el) + ": " + (v.length ? v.join("; ") : "a alegação não nomeia atributo nem propriedade de CSS"));
    });
    return L;
  })(${JSON.stringify({ chaves, atributos: tr.atributos, css: tr.css, pseudo: tr.pseudo })})`) as string[];
  const primeiro = chaves.length ? page.locator(chaves[0]).first() : null;
  if (primeiro && await primeiro.count()) await primeiro.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" })).catch(() => undefined);
  await page.waitForTimeout(150);
  const telaSemMarca = await page.screenshot();
  const caixas = await page.evaluate(`((ks) => { const out = []; ks.forEach((k, i) => { let el = null; try { el = document.querySelector(k); } catch {} if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) return; out.push({ i: i + 1, x: r.left, y: r.top, w: r.width, h: r.height }); });
    const camada = document.createElement("div"); camada.id = "__marca-autora"; camada.setAttribute("aria-hidden", "true");
    camada.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483647";
    for (const b of out) { const d = document.createElement("div");
      d.style.cssText = "position:fixed;box-sizing:border-box;border:3px solid #ff2d95;left:" + (b.x - 4) + "px;top:" + (b.y - 4) + "px;width:" + (b.w + 8) + "px;height:" + (b.h + 8) + "px";
      const n = document.createElement("div"); n.textContent = String(b.i); n.style.cssText = "position:absolute;left:-24px;top:-3px;background:#ff2d95;color:#fff;font:bold 12px sans-serif;padding:1px 4px";
      d.appendChild(n); camada.appendChild(d); }
    document.documentElement.appendChild(camada); return out; })(${JSON.stringify(chaves)})`) as { x: number; y: number; w: number; h: number }[];
  const tela = await page.screenshot();
  let recorte: Buffer | null = null;
  if (caixas.length) {
    const vp = page.viewportSize()!;
    const x0 = Math.max(0, Math.min(...caixas.map(b => b.x)) - 60), y0 = Math.max(0, Math.min(...caixas.map(b => b.y)) - 60);
    const x1 = Math.min(vp.width, Math.max(...caixas.map(b => b.x + b.w)) + 60), y1 = Math.min(vp.height, Math.max(...caixas.map(b => b.y + b.h)) + 60);
    if (x1 - x0 > 10 && y1 - y0 > 10) recorte = await page.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
  }
  await page.evaluate(() => document.getElementById("__marca-autora")?.remove());
  return { tela, telaSemMarca, recorte, passos, medida, alcancou };
}

/** Serve o site congelado (só 127.0.0.1, porta livre) e captura todos os casos, um contexto novo por caso. */
export async function capturarCasos(casos: { caso: string; cartao: CartaoCego }[], o: { siteDir: string; endereco: string; waitFor: string | null }): Promise<Map<string, Captura>> {
  const srv = createSiteServer(loadSite(o.siteDir));
  await new Promise<void>(r => srv.listen(0, "127.0.0.1", () => r()));
  const origem = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  const browser = await chromium.launch();
  const out = new Map<string, Captura>();
  try {
    for (const c of casos) {
      const vp = c.cartao.alegacao.estado.viewport ?? { width: 1280, height: 900 };
      const ctx = await browser.newContext({ viewport: vp, serviceWorkers: "block" });
      await ctx.route("**/*", r => (new URL(r.request().url()).origin === origem ? r.continue() : r.abort()));
      const page = await ctx.newPage();
      try { out.set(c.caso, await capturarCaso(page, origem + o.endereco, o.waitFor, c.cartao)); } finally { await ctx.close(); }
    }
  } finally { await browser.close(); await new Promise<void>(r => srv.close(() => r())); }
  return out;
}
