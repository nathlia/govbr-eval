/**
 * Resolução de âncoras (D-23): seletor CSS → elemento canônico da página viva.
 *
 * O problema que este módulo existe para resolver: o gabarito da suíte de fluxo escreve um
 * seletor (`#dados-pessoais .br-button`), o agente escreve outro (`form > div:nth-child(3) button`),
 * e os dois podem apontar para o MESMO elemento. Comparar as strings não responde nada. Comparar
 * elementos, sim — então ambos os lados são resolvidos no mesmo carregamento da página e
 * reduzidos a uma CHAVE CANÔNICA, derivada do lugar do elemento na árvore e independente de como
 * cada lado escolheu nomeá-lo.
 *
 * A chave é uma cadeia `tag:nth-of-type(n)` da raiz até o elemento. Dois seletores quaisquer que
 * cheguem no mesmo nó produzem a mesma chave; nenhum atributo do elemento entra nela, para que
 * marcar o DOM com âncoras de correção nunca se torne necessário (D-02 — a tela não pode carregar
 * pista nenhuma do gabarito).
 */

import { chromium, type Page } from "playwright";
import { createHash } from "crypto";
import type { FlowSetupStep, FlowViewport } from "../types";

/** Janela usada quando o gabarito não declara `_meta.viewport` (D-35). */
export const VIEWPORT_PADRAO: FlowViewport = { width: 1280, height: 900 };

/** Identidade curta e estável de um elemento, usada como prefixo de id de achado. */
export function elementId(key: string): string {
  return "E-" + createHash("sha256").update(key).digest("hex").slice(0, 6);
}

export interface ElementRef {
  /** Chave canônica: `body>main>form:nth-of-type(2)>button:nth-of-type(3)`. */
  key: string;
  /** `E-a1b2c3` — derivado da chave. */
  id: string;
  /** Rótulo legível para quem for adjudicar: tag, id do DOM e texto/nome acessível. */
  label: string;
}

export interface ResolvedSelector {
  selector: string;
  /** false quando o seletor é sintaticamente inválido — cobrado, mas reportado à parte. */
  ok: boolean;
  error: string | null;
  keys: string[];
}

export interface Resolution {
  url: string;
  bySelector: Map<string, ResolvedSelector>;
  byKey: Map<string, ElementRef>;
}

interface InPageResult {
  selector: string;
  ok: boolean;
  error: string | null;
  items: { key: string; label: string }[];
}

/**
 * Código executado DENTRO da página, mantido como TEXTO de propósito.
 *
 * Passar uma função daqui para `page.evaluate` não funciona sob `tsx`: o esbuild reescreve toda
 * função nomeada para chamar seu helper `__name`, que existe no processo do Node e não no
 * navegador — a avaliação morre com `ReferenceError: __name is not defined`. Como texto, o que
 * chega à página é exatamente o que está escrito aqui.
 *
 * A chave canônica é a cadeia `tag:nth-of-type(n)` da raiz até o elemento; o índice só aparece
 * quando há irmãos de mesma tag, para a chave não ficar mais longa do que precisa.
 *
 * SHADOW DOM. `document.querySelectorAll` para em cada fronteira de shadow root, e os componentes
 * do gov.br (`@govbr-ds/webcomponents`, usados pelas telas reais) renderizam tudo dentro de um
 * shadow root ABERTO. Sem atravessar: o gabarito não consegue ancorar nada dentro de um componente,
 * e todo achado que o agente reportar lá dentro vira falso positivo por incapacidade do
 * instrumento — o erro mais caro possível, porque é silencioso e sistemático contra o braço que
 * enxerga melhor.
 *
 * A travessia aparece na chave: `pnip-root>br-header >>> header>div>button`. O separador é o mesmo
 * que o oráculo usa nos seus locators, e isso é deliberado — o agente muitas vezes reporta o
 * locator que recebeu, e um formato que o scorer não resolvesse transformaria a citação correta
 * em achado sem unidade. Os dois lados escrevem seletor como quiserem, e ambos continuam sendo
 * reduzidos ao MESMO elemento.
 */
const RESOLVE_IN_PAGE = `(selectors) => {
  const SHADOW = " >>> ";

  const rootOf = (el) => el.getRootNode();
  const isShadowRoot = (root) => !!(root && root.host);

  const segOf = (el) => {
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    const container = parent ? parent : (isShadowRoot(rootOf(el)) ? rootOf(el) : null);
    const sameTag = container
      ? Array.from(container.children).filter(c => c.tagName === el.tagName)
      : [el];
    return sameTag.length > 1 ? tag + ":nth-of-type(" + (sameTag.indexOf(el) + 1) + ")" : tag;
  };

  const keyOf = (start) => {
    const trees = [];
    let parts = [];
    let el = start;
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      parts.unshift(segOf(el));
      const parent = el.parentElement;
      if (parent) { el = parent; continue; }
      const root = rootOf(el);
      if (isShadowRoot(root)) {
        // Fim de uma árvore de shadow: fecha o trecho e continua a partir do host.
        trees.unshift(parts.join(">"));
        parts = [];
        el = root.host;
        continue;
      }
      break;
    }
    trees.unshift(parts.join(">"));
    return trees.filter(Boolean).join(SHADOW);
  };

  const labelOf = (el) => {
    const tag = el.tagName.toLowerCase();
    const domId = el.id ? "#" + el.id : "";
    const text = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "")
      .replace(/\\s+/g, " ").trim().slice(0, 48);
    const sombra = isShadowRoot(rootOf(el)) ? " [shadow]" : "";
    return "<" + tag + domId + ">" + (text ? ' "' + text + '"' : "") + sombra;
  };

  // Um seletor pode nomear um caminho por shadow roots (\`host >>> interno\`) ou não dizer nada
  // sobre eles — neste caso a busca desce por toda shadow root aberta, para que \`.br-button\`
  // encontre também as instâncias dentro dos componentes.
  const queryAll = (selector) => {
    if (selector.indexOf(">>>") !== -1) {
      const hops = selector.split(">>>").map(s => s.trim()).filter(Boolean);
      let roots = [document];
      let found = [];
      for (let i = 0; i < hops.length; i++) {
        found = [];
        for (const r of roots) found.push.apply(found, Array.from(r.querySelectorAll(hops[i])));
        if (i < hops.length - 1) roots = found.map(e => e.shadowRoot).filter(Boolean);
      }
      return found;
    }
    const out = [];
    const visit = (root) => {
      out.push.apply(out, Array.from(root.querySelectorAll(selector)));
      for (const el of Array.from(root.querySelectorAll("*"))) {
        if (el.shadowRoot) visit(el.shadowRoot);
      }
    };
    visit(document);
    return out;
  };

  return selectors.map(selector => {
    try {
      const nodes = queryAll(selector);
      return { selector, ok: true, error: null, items: nodes.map(n => ({ key: keyOf(n), label: labelOf(n) })) };
    } catch (e) {
      return { selector, ok: false, error: String((e && e.message) || e), items: [] };
    }
  });
}`;

/**
 * Carrega a página uma vez e resolve todos os seletores contra ela.
 *
 * Um único carregamento para os dois lados não é detalhe de desempenho: resolver o gabarito e os
 * achados em cargas diferentes admitiria que a página mudasse no meio, e a comparação passaria a
 * ser entre duas árvores distintas sem que nada acusasse.
 */
export async function resolveSelectors(
  url: string,
  selectors: string[],
  opts: { waitFor?: string; setup?: FlowSetupStep[]; viewport?: FlowViewport } = {},
): Promise<Resolution> {
  const browser = await chromium.launch();
  try {
    // Sem `viewport` explícito o Playwright abria 1280×720 aqui enquanto o runner de linha de base
    // abria 1280×900: mesma suíte, duas janelas, ninguém avisado (D-35). O gabarito agora declara o
    // padrão e os dois leem o mesmo número; VIEWPORT_PADRAO é só o piso se o gabarito calar.
    const context = await browser.newContext({ viewport: opts.viewport ?? VIEWPORT_PADRAO });
    const page = await context.newPage();
    await preparePage(page, url, opts);
    const { bySelector, byKey } = await resolveOnPage(page, selectors);
    return { url, bySelector, byKey };
  } finally {
    await browser.close();
  }
}

/**
 * Leva uma página já aberta ao estado que o gabarito descreve.
 *
 * Separado de `resolveSelectors` para que o runner de linha de base alcance EXATAMENTE o mesmo
 * estado — se o axe medisse a tela no primeiro paint e o scorer resolvesse as âncoras depois da
 * interação, as duas metades estariam falando de árvores diferentes e nada acusaria.
 */
export async function preparePage(
  page: Page,
  url: string,
  opts: { waitFor?: string; setup?: FlowSetupStep[] } = {},
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 10_000 });

  // Leva a página ao estado que o gabarito descreve. Sem isto, uma violação que só nasce
  // depois de um uso da tela — submeter em branco, abrir um passo — seria inancorável, e o
  // corpus ficaria restrito aos defeitos visíveis no primeiro paint.
  for (const step of opts.setup ?? []) {
    if (step.action === "click" && step.selector) await page.click(step.selector);
    else if (step.action === "fill" && step.selector) await page.fill(step.selector, step.value ?? "");
    else if (step.action === "wait") {
      if (step.selector) await page.waitForSelector(step.selector, { timeout: 10_000 });
      else await page.waitForTimeout(step.ms ?? 250);
    }
  }
}

/**
 * Resolve seletores numa página JÁ preparada. É por aqui que o runner de linha de base e o scorer
 * compartilham uma única definição de "que elemento é este".
 */
export async function resolveOnPage(
  page: Page,
  selectors: string[],
): Promise<{ bySelector: Map<string, ResolvedSelector>; byKey: Map<string, ElementRef> }> {
  const unique = [...new Set(selectors.filter(s => s.trim().length > 0))];

  const raw = (await page.evaluate(
    `(${RESOLVE_IN_PAGE})(${JSON.stringify(unique)})`,
  )) as InPageResult[];

  const bySelector = new Map<string, ResolvedSelector>();
  const byKey = new Map<string, ElementRef>();
  for (const r of raw) {
    bySelector.set(r.selector, { selector: r.selector, ok: r.ok, error: r.error, keys: r.items.map(i => i.key) });
    for (const i of r.items) {
      if (!byKey.has(i.key)) byKey.set(i.key, { key: i.key, id: elementId(i.key), label: i.label });
    }
  }
  return { bySelector, byKey };
}

/** Elementos de `anchor` menos os de `except`, na ordem do documento. */
export function resolveWithExcept(res: Resolution, anchor: string, except?: string): string[] {
  const keys = res.bySelector.get(anchor)?.keys ?? [];
  if (!except) return keys;
  const drop = new Set(res.bySelector.get(except)?.keys ?? []);
  return keys.filter(k => !drop.has(k));
}
