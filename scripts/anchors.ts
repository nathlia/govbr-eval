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
  /**
   * Por que o elemento não é visível, ou `null` quando é. Medido na página junto da chave.
   *
   * Não é veredito: um defeito em elemento oculto pode ser legítimo, e há defeito que só existe
   * porque o elemento está oculto. É o fato chegando à revisão — antes, oculto e visível produziam
   * a mesma chave e nada os distinguia.
   */
  hidden: string | null;
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

/**
 * Parada nomeada dentro da sequência de `setup`, em que as âncoras são resolvidas.
 *
 * `afterStep` é quantos passos de `setup` já correram quando o estado é alcançado — 0 é o primeiro
 * paint. É índice na sequência, e não uma segunda cópia dela, para que gabarito e resolvedor nunca
 * possam discordar sobre o que "apos-submit-vazio" quer dizer.
 */
export interface StateCheckpoint {
  id: string;
  afterStep: number;
}

export interface StateResolutions {
  url: string;
  /** Ordem declarada, do primeiro paint ao estado mais avançado. */
  order: string[];
  byState: Map<string, Resolution>;
}

interface InPageResult {
  selector: string;
  ok: boolean;
  error: string | null;
  items: { key: string; label: string; hidden: string | null }[];
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
export const IN_PAGE_PRELUDE = `
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

  // Por que a visibilidade é medida junto da chave: a chave canônica é estrutural, e um elemento
  // escondido do usuário e da árvore de acessibilidade produz exatamente a mesma chave de um
  // visível. Sem isto, uma unidade do gabarito ancorada em elemento oculto, ou uma alegação sobre
  // ele, chegariam à revisão indistinguíveis de qualquer outra. Não é veredito — há defeito
  // legítimo em elemento oculto —, é o fato ficando visível para quem decide.
  const hiddenOf = (el) => {
    const reasons = [];
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkVisibilityCSS: true })) {
      reasons.push("nao-renderizado");
    }
    if (el.closest && el.closest("[aria-hidden='true']")) reasons.push("aria-hidden");
    if (el.hasAttribute("hidden")) reasons.push("atributo hidden");
    return reasons.length ? reasons.join(", ") : null;
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
`;

/**
 * Resolve seletores e devolve chave canônica + rótulo de cada elemento.
 *
 * Monta-se sobre `IN_PAGE_PRELUDE` para que exista UMA definição de "que elemento é este" na
 * página. Os predicados de aceitação usam o mesmo prelúdio: duas implementações da chave canônica
 * divergiriam, e o log já acompanha nove ocorrências desse mesmo defeito estrutural — uma dimensão
 * que uma parte do código conhece e a outra não.
 */
const RESOLVE_IN_PAGE = `(selectors) => {
${IN_PAGE_PRELUDE}
  return selectors.map(selector => {
    try {
      const nodes = queryAll(selector);
      return { selector, ok: true, error: null,
        items: nodes.map(n => ({ key: keyOf(n), label: labelOf(n), hidden: hiddenOf(n) })) };
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
  await openPage(page, url, opts);

  // Leva a página ao estado que o gabarito descreve. Sem isto, uma violação que só nasce
  // depois de um uso da tela — submeter em branco, abrir um passo — seria inancorável, e o
  // corpus ficaria restrito aos defeitos visíveis no primeiro paint.
  await runSetupSteps(page, opts.setup ?? []);
}

/** Abre a página e espera o que o gabarito manda esperar. Nenhum passo de `setup` corre aqui. */
export async function openPage(
  page: Page,
  url: string,
  opts: { waitFor?: string } = {},
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 10_000 });
}

/** Aplica uma FATIA da sequência de `setup`. Separado para que os estados sejam alcançados em ordem. */
export async function runSetupSteps(page: Page, steps: FlowSetupStep[]): Promise<void> {
  for (const step of steps) {
    if (step.action === "click" && step.selector) await page.click(step.selector);
    else if (step.action === "fill" && step.selector) await page.fill(step.selector, step.value ?? "");
    else if (step.action === "wait") {
      if (step.selector) await page.waitForSelector(step.selector, { timeout: 10_000 });
      else await page.waitForTimeout(step.ms ?? 250);
    }
  }
}

/**
 * Resolve os mesmos seletores em CADA estado declarado da página, no mesmo carregamento.
 *
 * Por que isto existe: até aqui o gabarito resolvia tudo num estado só — o do fim do `setup` — e
 * o campo `state` de cada spec era um rótulo que nenhum código lia. A afirmação de que a sequência
 * é aditiva ("nada que o gabarito ancora deixa de existir") vivia num comentário, e o campo
 * `conditional` ("a unidade só existe no estado declarado; nunca é presumida no primeiro paint")
 * não era conferido contra a página. Os dois viraram medida: resolver em cada parada permite dizer
 * em QUE estados cada elemento existe, e é a página que responde (D-06).
 *
 * Um único carregamento, avançando o `setup` entre as paradas, pelo mesmo motivo que
 * `resolveSelectors` carrega uma vez: recarregar entre estados admitiria que a página mudasse no
 * meio, e a comparação entre estados passaria a ser entre duas árvores diferentes.
 */
export async function resolveAcrossStates(
  url: string,
  selectors: string[],
  opts: {
    waitFor?: string;
    setup?: FlowSetupStep[];
    viewport?: FlowViewport;
    states: StateCheckpoint[];
  },
): Promise<StateResolutions> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: opts.viewport ?? VIEWPORT_PADRAO });
    const page = await context.newPage();
    await openPage(page, url, opts);
    return await resolveStatesOnPage(page, url, selectors, opts);
  } finally {
    await browser.close();
  }
}

/**
 * O mesmo, numa página JÁ aberta — é por aqui que a preparação do pacote mede os estados sem abrir
 * uma segunda janela, na mesma página de que saem as capturas e as unidades da cena.
 */
export async function resolveStatesOnPage(
  page: Page,
  url: string,
  selectors: string[],
  opts: {
    setup?: FlowSetupStep[];
    states: StateCheckpoint[];
    /**
     * Chamado com a página JÁ no estado, logo depois da resolução. É por aqui que os predicados de
     * aceitação são medidos no estado a que pertencem — depois da varredura a página está no último
     * estado, e medir tudo lá seria medir um estado e cobrar outro.
     */
    onState?: (state: string, resolution: Resolution, page: Page) => Promise<void>;
  },
): Promise<StateResolutions> {
  const setup = opts.setup ?? [];
  const states = [...opts.states].sort((a, b) => a.afterStep - b.afterStep);
  if (states.length === 0) throw new Error("estados: nenhum estado declarado");

  const seen = new Set<string>();
  for (const st of states) {
    if (seen.has(st.id)) throw new Error(`estado declarado duas vezes: ${st.id}`);
    seen.add(st.id);
    if (!Number.isInteger(st.afterStep) || st.afterStep < 0 || st.afterStep > setup.length) {
      throw new Error(`estado ${st.id}: afterStep ${st.afterStep} fora da sequência de setup (0..${setup.length})`);
    }
  }
  // O último estado tem de ser o fim da sequência: é nele que as unidades são construídas, e uma
  // parada que ficasse no meio do `setup` mediria a tela num estado que o gabarito não descreve.
  const ultimo = states[states.length - 1];
  if (ultimo.afterStep !== setup.length) {
    throw new Error(`último estado (${ultimo.id}) para em ${ultimo.afterStep} de ${setup.length} passos de setup`);
  }

  const byState = new Map<string, Resolution>();
  let applied = 0;
  for (const st of states) {
    await runSetupSteps(page, setup.slice(applied, st.afterStep));
    applied = st.afterStep;
    const { bySelector, byKey } = await resolveOnPage(page, selectors);
    const resolution: Resolution = { url, bySelector, byKey };
    byState.set(st.id, resolution);
    if (opts.onState) await opts.onState(st.id, resolution, page);
  }
  return { url, order: states.map(s => s.id), byState };
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
      if (!byKey.has(i.key)) byKey.set(i.key, { key: i.key, id: elementId(i.key), label: i.label, hidden: i.hidden });
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
