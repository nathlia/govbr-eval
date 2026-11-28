/**
 * Imagens do material da autora (entrega 6, revisão do orquestrador 20/10): para cada caso, a página congelada é aberta em
 * Playwright headless na janela do cartão, a receita do cartão é refeita COMO ESCRITA (passo a passo, sem completar nem
 * corrigir), e grava-se (a) a tela inteira sem marca e com os elementos do cartão contornados por uma camada própria (um
 * elemento absoluto acrescentado ao documento, sem mexer em estilo nenhum da página), (b) um recorte em volta do elemento,
 * (c) uma linha MEDIDA: onde está o foco depois dos passos e os valores que a alegação nomeia literalmente (atributos e CSS,
 * pela mesma tabela fixa da origem medida, `tracosDaAlegacao`). Mede, não julga. Passo que o intérprete não sabe refazer, ou
 * que não chega aonde diz (ex.: "Tab x8 até #servico" termina noutro elemento), é dito com todas as letras.
 *
 * 1.2.0 (nat78-tela-f3-01, revisão do material): seletor composto (descendente, `>`, `[atributo="com espaço"]`,
 * `:nth-child(n)`, elemento personalizado com hífen) é reconhecido como CSS, e o Playwright o resolve através das shadow
 * roots abertas dos componentes do DS; formas "rótulo (seletor)" e "seletor (comentário)", com parênteses aninhados;
 * texto visível entre aspas (simples ou duplas) quando o passo não dá seletor, buscado primeiro como nome acessível de
 * botão, link, aba, caixa de seleção, chave, opção de rádio ou item de menu, e depois como texto exato; e o passo de SPA
 * "navegar para `/caminho` … e esperar `seletor`", refeito como o `navigate` do setup da referência (mesma origem,
 * history.pushState + popstate, nunca recarga, e a espera que ele nomeia). A medida e o contorno acham o elemento do
 * cartão também dentro de shadow root aberta (pelo localizador do Playwright, quando document.querySelector não acha).
 * Passo escrito como o próprio passo de `setup` da referência (JSON `{"action": …}`: click, fill, wait com selector ou ms,
 * navigate com path e waitFor) é refeito como o setup o refaz; JSON fora dessas formas continua "não sei refazer".
 */
import { chromium, type JSHandle, type Locator, type Page } from "playwright";
import { createSiteServer, loadSite } from "../measurement-surface";
import type { CartaoCego } from "./e14-comum";
import { tracosDaAlegacao } from "./origem-campanha";

export const IMAGENS_VERSAO = "nat78-material-imagens-1.2.0";

export type Alvo = { css: string } | { nome: string; papel: "button" | null } | { texto: string };
export type Acao =
  | { tipo: "nada"; esperar: string | null }
  | { tipo: "esperar"; css: string }
  | { tipo: "navegar"; caminho: string; esperar: string | null }
  | { tipo: "pausa"; ms: number }
  | { tipo: "clicar"; alvo: Alvo }
  | { tipo: "focar"; alvo: Alvo }
  | { tipo: "preencher"; alvo: Alvo; valor: string }
  | { tipo: "tecla"; tecla: string; vezes: number; ate: Alvo | null; focoEsperado: Alvo | null; em: Alvo | null };

const TAGS = /^(?:a|article|aside|body|button|caption|details|dialog|div|fieldset|footer|form|h[1-6]|header|html|img|input|label|li|main|nav|ol|option|p|section|select|span|summary|svg|table|tbody|td|textarea|tfoot|th|thead|tr|ul)$/;
/** Divide no nível 0 (fora de [], () e aspas) pelos espaços: os compostos de um seletor com descendentes. */
function compostos(t: string): string[] | null {
  const out: string[] = []; let cur = "", dc = 0, dp = 0, q: string | null = null;
  for (const ch of t) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { if (!dc) return null; q = ch; cur += ch; continue; }
    if (ch === "[") dc++; else if (ch === "]") { if (!dc) return null; dc--; } else if (ch === "(") dp++; else if (ch === ")") { if (!dp) return null; dp--; }
    if (/\s/.test(ch) && !dc && !dp) { if (cur) out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (q || dc || dp) return null;
  if (cur) out.push(cur);
  return out;
}
const SIMPLES = /^(?:[.#][\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?)*$/;
/** Um composto: etiqueta HTML conhecida ou elemento personalizado (com hífen), ou só . # [ :, seguido de classes, id, atributos, pseudo. */
function compostoCss(c: string): boolean {
  if (/^[>+~]$/.test(c)) return true;
  const m = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*|\*)?(.*)$/.exec(c)!;
  if (m[1] && m[1] !== "*" && !TAGS.test(m[1]) && !m[1].includes("-")) return false;
  if (!m[1] && !/^[.#[:]/.test(m[2])) return false;
  return SIMPLES.test(m[2]);
}
/** Seletor CSS escrito: cada composto (separado por espaço ou combinador) é CSS; o primeiro não pode ser combinador. Texto com maiúscula ou acento não é. */
const pareceCss = (s: string): boolean => {
  const cs = compostos(s.trim());
  return !!cs && cs.length > 0 && !/^[>+~]$/.test(cs[0]) && !/^[>+~]$/.test(cs[cs.length - 1]) && cs.every(compostoCss);
};
/** Parênteses no fim, balanceados (o de dentro pode ter "(2)" de :nth-child): [antes, dentro] ou null. */
function parentesesFinais(s: string): [string, string] | null {
  if (!s.endsWith(")")) return null;
  let d = 0, q: string | null = null;
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (q) { if (ch === q) q = null; continue; }
    if (ch === '"') { q = ch; continue; }
    if (ch === ")") d++; else if (ch === "(") { d--; if (!d) return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 1, -1)] : null; }
  }
  return null;
}
/** Um só trecho entre aspas (simples, duplas ou tipográficas) num alvo sem seletor: o texto visível que ele nomeia. */
const ASPAS = /["“'‘]([^"”'’]+)["”'’]/g;
const TECLAS: Record<string, string> = { tab: "Tab", "shift+tab": "Shift+Tab", enter: "Enter", escape: "Escape", esc: "Escape", space: "Space", espaco: "Space" };

/** Alvo escrito no passo: `css` entre crases, "texto" entre aspas, seletor CSS, "o botão X …", ou um nome. */
export function lerAlvo(s0: string): Alvo {
  let s = s0.trim().replace(/\s+com o formul[aá]rio vazio$/i, "").trim();
  const par = parentesesFinais(s);
  if (par) {
    s = par[0];
    const dentro = par[1].replace(/`/g, "").trim();
    if (pareceCss(dentro)) return { css: dentro }; // "rótulo (seletor)"
  }
  s = s.replace(/\s+com o formul[aá]rio vazio$/i, "").trim();
  const crase = /^`([^`]+)`$/.exec(s);
  if (crase) return { css: crase[1] };
  const aspas = /^(?:o texto |no texto )?["“]([^"”]+)["”]$/.exec(s);
  if (aspas) return { texto: aspas[1] };
  if (pareceCss(s)) return { css: s };
  const botao = /^(?:o |no )?bot[aã]o\s+(.+?)(?:\s+d[aoe]s?\s+.*)?$/i.exec(s);
  if (botao) return { nome: botao[1].replace(/^["“'‘]|["”'’]$/g, ""), papel: "button" };
  const trechos = [...s.matchAll(ASPAS)].map(x => x[1]);
  if (trechos.length === 1) return { texto: trechos[0] }; // "'Meus processos' para desligar o filtro", "página '2' na paginação"
  return { nome: s.replace(/^(?:o |a |no |na )/i, ""), papel: null };
}

/**
 * Lê um passo escrito; `null` = o intérprete não sabe refazê-lo (e diz isso, sem adivinhar). 1.1.0 (ensaio-trio-real-02):
 * também "clique em X", o verbo antes da tecla ("tecla Tab", "pressionar Enter"), "… a partir do carregamento" (= da página
 * recém-aberta, onde toda receita começa) e "preencher X com 'v'" / "digitar 'v' em X" (valor entre aspas, escrito no campo).
 */
/** Passo no formato do `setup` da referência (anchors.ts › runSetupSteps), com as mesmas exigências de forma; senão null. */
function passoDoSetup(t: string): Acao | null {
  let o: Record<string, unknown>;
  try { o = JSON.parse(t); } catch { return null; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const txt = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
  const so = (...k: string[]) => Object.keys(o).every(x => x === "action" || k.includes(x));
  if (o.action === "click" && txt(o.selector) && so("selector")) return { tipo: "clicar", alvo: { css: o.selector } };
  if (o.action === "fill" && txt(o.selector) && so("selector", "value")) return { tipo: "preencher", alvo: { css: o.selector }, valor: typeof o.value === "string" ? o.value : "" };
  if (o.action === "wait" && so("selector", "ms")) {
    if (txt(o.selector)) return { tipo: "esperar", css: o.selector };
    if (o.selector === undefined && (o.ms === undefined || (typeof o.ms === "number" && o.ms >= 0 && o.ms <= 10_000))) return { tipo: "pausa", ms: (o.ms as number | undefined) ?? 250 };
    return null;
  }
  if (o.action === "navigate" && txt(o.path) && txt(o.waitFor) && so("path", "waitFor") && o.path.startsWith("/") && !o.path.startsWith("//")) return { tipo: "navegar", caminho: o.path, esperar: o.waitFor };
  return null;
}

export function lerPasso(p0: string): Acao | null {
  if (/^s*{/.test(p0)) return passoDoSetup(p0.trim());
  const p = p0.trim().replace(/\s+a partir do carregamento(?: da p[aá]gina)?$/i, "").replace(/^(?:tecla|pressionar|pressione|apertar|aperte)\s+(?=\S)/i, "");
  let m: RegExpExecArray | null;
  if ((m = /^(?:load|abrir a p[aá]gina|abrir o endere[cç]o da tela)(?:\s*\(.*\))?(?: e esperar `([^`]+)`)?$/i.exec(p))) return { tipo: "nada", esperar: m[1] ?? null };
  if ((m = /^esperar `([^`]+)`(?: aparecer)?$/i.exec(p))) return { tipo: "esperar", css: m[1] };
  if ((m = /^(?:navegar|navigate)(?: para| to)?\s+`?(\/[^`\s]*)`?(?:\s*\([^)]*\))?(?:\s+e esperar\s+`([^`]+)`(?: aparecer)?)?$/i.exec(p))) return { tipo: "navegar", caminho: m[1], esperar: m[2] ?? null };
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
  return localizarNome(page, a);
}
const PAPEIS_DE_TEXTO = ["button", "link", "tab", "checkbox", "switch", "radio", "menuitem"] as const;
/** Texto entre aspas: primeiro como nome acessível de um controle (o primeiro papel que casa), senão como texto exato. */
async function localizarTexto(page: Page, texto: string): Promise<Locator> {
  for (const r of PAPEIS_DE_TEXTO) { const l = page.getByRole(r, { name: texto, exact: true }); if (await l.count()) return l; }
  return page.getByText(texto, { exact: true });
}
async function localizarAsync(page: Page, a: Alvo): Promise<Locator> {
  return "texto" in a ? localizarTexto(page, a.texto) : localizar(page, a);
}
function localizarNome(page: Page, a: { nome: string; papel: "button" | null }): Locator {
  const porPapel = a.papel ? page.getByRole(a.papel, { name: a.nome, exact: true }) : page.getByRole("button", { name: a.nome, exact: true }).or(page.getByRole("link", { name: a.nome, exact: true }));
  return porPapel.or(page.getByText(a.nome, { exact: true }));
}

/** O elemento focado, descrito como no cartão (etiqueta#id.classe "texto"). */
const DESCREVER = `(el) => { if (!el || el === document.body) return "<body> (nenhum elemento focado)"; const t = el.tagName.toLowerCase();
  const id = el.id ? "#" + el.id : ""; const cl = !id && el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "";
  const nome = (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  return "<" + t + id + cl + ">" + (nome ? " \\"" + nome + "\\"" : ""); }`;

async function focoCasa(page: Page, a: Alvo): Promise<boolean> {
  const hs = await (await localizarAsync(page, a)).elementHandles().catch(() => []);
  for (const h of hs) if (await h.evaluate(el => el === document.activeElement || el.contains(document.activeElement))) return true;
  return false;
}

export interface Captura { tela: Buffer; telaSemMarca: Buffer; recorte: Buffer | null; passos: string[]; medida: string[]; alcancou: boolean }

async function umClique(page: Page, a: Alvo, nota: string[]): Promise<boolean> {
  const l = await localizarAsync(page, a);
  const n = await l.count();
  if (!n) { nota.push(`não achei ${descAlvo(a)} na página`); return false; }
  if (n > 1) nota.push(`${descAlvo(a)} casa ${n} elementos; usei o primeiro`);
  await l.first().click({ timeout: 3000 });
  return true;
}

/**
 * Passo de SPA "navegar para /caminho": como o `navigate` do setup da referência (anchors.ts), troca de rota na MESMA origem
 * e no MESMO documento — history.pushState + popstate, nunca page.goto (recarregaria o documento e zeraria o backend em
 * memória) — e espera o seletor que o passo nomeia. Sai da origem, recarrega ou não aparece a espera → dito, e não alcança.
 */
async function navegarNaSpa(page: Page, a: { caminho: string; esperar: string | null }, nota: string[]): Promise<boolean> {
  const antes = new URL(page.url()), alvo = new URL(a.caminho, antes);
  if (alvo.origin !== antes.origin) { nota.push(`${a.caminho} sai da origem da página`); return false; }
  const marca = `m${Date.now()}`;
  await page.evaluate(`window.__marcaReplayAutora = ${JSON.stringify(marca)}`);
  if (alvo.href !== antes.href) await page.evaluate(`history.pushState(null, "", ${JSON.stringify(alvo.pathname + alvo.search + alvo.hash)});
    dispatchEvent(new PopStateEvent("popstate", { state: null }));`);
  if (a.esperar) { try { await page.waitForSelector(a.esperar, { timeout: 10_000 }); } catch { nota.push(`depois de navegar para ${a.caminho}, ${a.esperar} não apareceu`); return false; } }
  if (await page.evaluate("window.__marcaReplayAutora || null") !== marca) { nota.push(`navegar para ${a.caminho} recarregou o documento`); return false; }
  nota.push(`rota trocada para ${a.caminho} sem recarregar (pushState + popstate)${a.esperar ? `; ${a.esperar} apareceu` : ""}`);
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
      else if (a.tipo === "pausa") await page.waitForTimeout(a.ms);
      else if (a.tipo === "navegar") { if (!(await navegarNaSpa(page, a, nota))) alcancou = false; }
      else if (a.tipo === "preencher") { const l = await localizarAsync(page, a.alvo); if (await l.count()) await l.first().fill(a.valor, { timeout: 3000 }); else { nota.push(`não achei ${descAlvo(a.alvo)}`); alcancou = false; } }
      else if (a.tipo === "focar") { const l = await localizarAsync(page, a.alvo); if (await l.count()) await l.first().focus(); else { nota.push(`não achei ${descAlvo(a.alvo)}`); alcancou = false; } }
      else {
        if (a.em) { const l = await localizarAsync(page, a.em); if (await l.count()) await l.first().focus(); else { nota.push(`não achei ${descAlvo(a.em)}`); alcancou = false; } }
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
  // O elemento do cartão: document.querySelector; se não acha (dentro de shadow root aberta), o localizador do Playwright.
  const alvos: JSHandle<unknown>[] = await Promise.all(chaves.map(async (k): Promise<JSHandle<unknown>> => {
    const h = await page.evaluateHandle(`(() => { try { return document.querySelector(${JSON.stringify(k)}); } catch { return null; } })()`);
    if (await h.evaluate(x => x !== null)) return h;
    return ((await page.locator(k).first().elementHandle({ timeout: 500 }).catch(() => null)) as JSHandle<unknown> | null) ?? h;
  }));
  // Guardados na página (sem eval na página): a medida e o contorno leem daqui.
  await page.evaluate("window.__alvosAutora = []");
  for (const [i, h] of alvos.entries()) await h.evaluate((el: unknown, n: number) => { (window as unknown as { __alvosAutora: unknown[] }).__alvosAutora[n] = el ?? null; }, i);
  const medida = await page.evaluate(`((a) => {
    const descrever = ${DESCREVER};
    const els = window.__alvosAutora;
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
  })(${JSON.stringify({ atributos: tr.atributos, css: tr.css, pseudo: tr.pseudo })})`) as string[];
  if (chaves.length) await alvos[0].evaluate((el: unknown) => (el as Element | null)?.scrollIntoView({ block: "center", inline: "nearest" })).catch(() => undefined);
  await page.waitForTimeout(150);
  const telaSemMarca = await page.screenshot();
  const caixas = await page.evaluate(`((ks) => { const out = []; ks.forEach((k, i) => { const el = window.__alvosAutora[i]; if (!el) return;
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
  await page.evaluate(() => { document.getElementById("__marca-autora")?.remove(); delete (window as unknown as { __alvosAutora?: unknown }).__alvosAutora; });
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
