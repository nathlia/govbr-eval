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

import { chromium, type Browser, type Page } from "playwright";
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
  /** Caminho (`pathname`) em que a parada tem de estar. Obrigatório quando o setup navega. */
  path?: string;
}

/**
 * O que a varredura mediu sobre ONDE a página estava em cada parada (navegação, D-57).
 *
 * `segmentOf` é o número de passos `navigate` já corridos até a parada: paradas de mesmo segmento
 * falam da mesma árvore, e só entre elas a aditividade é cobrada. `documentOf` é uma marca posta
 * no `window` do documento na primeira parada; se ela some ou muda, o documento foi RECARREGADO
 * entre duas paradas — o que nenhum passo declara e o que zeraria o estado de uma SPA.
 */
export interface StateNavigation {
  segmentOf: Map<string, number>;
  /** `pathname` MEDIDO em cada parada. */
  pathOf: Map<string, string>;
  /** `path` DECLARADO em `_meta.states`, quando há. */
  declaredPathOf: Map<string, string>;
  documentOf: Map<string, string>;
  /**
   * Só quando a varredura conferiu estabilidade (setup que navega, D-60): o que mudou na árvore
   * dentro da janela depois de cada parada. Vazio = parada estável.
   */
  instavelOf?: Map<string, string[]>;
}

export interface StateResolutions {
  url: string;
  /** Ordem declarada, do primeiro paint ao estado mais avançado. */
  order: string[];
  byState: Map<string, Resolution>;
  /** Ausente em resoluções montadas à mão (fixtures): tudo num segmento só, sem endereço medido. */
  navigation?: StateNavigation;
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
  // Este caminho mede UM estado, o do fim do setup: com navegação isso perderia os segmentos
  // anteriores, então para aqui em vez de medir o que sobrou.
  exigeSegmentoUnico(opts.setup, "preparação de estado único (preparePage)");
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
    // Passo malformado ou de tipo desconhecido PARA aqui. Antes, um `click` sem seletor ou uma
    // ação que o código não conhecia eram pulados em silêncio, e a página era medida num estado
    // que o gabarito não descreve.
    const problemas = problemasDoPasso(step);
    if (problemas.length) throw new Error(`passo de setup inválido ${JSON.stringify(step)}: ${problemas.join("; ")}`);
    if (step.action === "click") await page.click(step.selector!);
    else if (step.action === "fill") await page.fill(step.selector!, step.value ?? "");
    else if (step.action === "wait") {
      if (step.selector) await page.waitForSelector(step.selector, { timeout: 10_000 });
      else await page.waitForTimeout(step.ms ?? 250);
    } else await navegar(page, step);
  }
}

// ── Navegação dentro da aplicação (D-57) ─────────────────────────────────────

/** Marca posta no `window` do documento: se some, o documento foi recarregado. */
const MARCA_DOCUMENTO = `(() => {
  if (!window.__govbrEvalDocumento) window.__govbrEvalDocumento = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return window.__govbrEvalDocumento;
})()`;

/** Problemas de forma de um passo de `setup`; vazio quando o passo é executável. */
export function problemasDoPasso(step: FlowSetupStep): string[] {
  const p: string[] = [];
  const texto = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const sobrando = (campos: (keyof FlowSetupStep)[]) => {
    for (const c of campos) if (step[c] !== undefined) p.push(`"${c}" não se aplica a "${step.action}"`);
  };
  switch (step.action) {
    case "click":
      if (!texto(step.selector)) p.push("click exige selector");
      sobrando(["path", "waitFor", "value", "ms"]);
      break;
    case "fill":
      if (!texto(step.selector)) p.push("fill exige selector");
      sobrando(["path", "waitFor", "ms"]);
      break;
    case "wait":
      sobrando(["path", "waitFor", "value"]);
      break;
    case "navigate":
      if (texto(step.selector) === texto(step.path)) p.push("navigate declara exatamente um de selector (clique) ou path (caminho)");
      if (!texto(step.waitFor)) p.push("navigate exige waitFor: o seletor que prova que a rota nova pintou");
      if (step.path !== undefined && !(typeof step.path === "string" && step.path.startsWith("/") && !step.path.startsWith("//"))) {
        p.push(`path tem de ser caminho absoluto na mesma origem ("/…"), não ${JSON.stringify(step.path)}`);
      }
      sobrando(["value", "ms"]);
      break;
    default:
      p.push(`ação desconhecida: ${JSON.stringify((step as { action?: unknown }).action)}`);
  }
  return p;
}

/** A sequência contém alguma navegação? */
export function temNavegacao(setup: readonly unknown[] | undefined): boolean {
  return (setup ?? []).some(s => (s as FlowSetupStep | null)?.action === "navigate");
}

/** Segmento em que a página está depois de `afterStep` passos: quantos `navigate` já correram. */
export function segmentoApos(setup: readonly FlowSetupStep[] | undefined, afterStep: number): number {
  return (setup ?? []).slice(0, afterStep).filter(s => s.action === "navigate").length;
}

/**
 * Recusa explícita de quem mede UM estado só, no fim do `setup`.
 *
 * Numa sequência aditiva o último estado contém todos os anteriores, e medir só ele não perde
 * nada. Com `navigate` isso deixa de valer: a rota nova troca a árvore, e o que o gabarito ancora
 * nos segmentos anteriores não existe mais no fim. Medir mesmo assim seria pular esses segmentos em
 * silêncio — então o consumidor para, dizendo por quê.
 */
export function exigeSegmentoUnico(setup: readonly unknown[] | undefined, consumidor: string): void {
  if (!temNavegacao(setup)) return;
  const n = (setup ?? []).filter(s => (s as FlowSetupStep | null)?.action === "navigate").length;
  throw new Error(`${consumidor}: o setup desta referência navega (${n} passo(s) navigate, ${n + 1} segmentos), e este ` +
    "consumidor mede um estado só, no fim do setup — perderia em silêncio o que os segmentos anteriores ancoram. " +
    "Recusado. Medem referência com navegação, segmento a segmento: `conferir:referencia`, `flow:review prepare`, " +
    "`baselines:fluxo` e `manifest:coleta build` (D-60).");
}

// ── Cenas por segmento (D-60) ────────────────────────────────────────────────

/**
 * Um segmento do plano de estados: as paradas entre dois `navigate`, e a ÚLTIMA delas, em que a
 * cena do segmento é capturada. Dentro do segmento a sequência é aditiva (cobrado pela medida), então
 * a última parada contém tudo o que as anteriores ancoram — o mesmo argumento que sempre autorizou
 * uma cena só no fim do setup, agora aplicado a cada segmento.
 */
export interface SegmentoDoPlano {
  segmento: number;
  estados: string[];
  /** Última parada declarada do segmento: onde a cena é capturada e as unidades são construídas. */
  ultimo: StateCheckpoint;
}

export function segmentosDasParadas(setup: readonly FlowSetupStep[], states: readonly StateCheckpoint[]): SegmentoDoPlano[] {
  const ordem = [...states].sort((a, b) => a.afterStep - b.afterStep);
  const porSegmento = new Map<number, SegmentoDoPlano>();
  for (const st of ordem) {
    const segmento = segmentoApos(setup, st.afterStep);
    const atual = porSegmento.get(segmento);
    if (atual) { atual.estados.push(st.id); atual.ultimo = st; } else porSegmento.set(segmento, { segmento, estados: [st.id], ultimo: st });
  }
  return [...porSegmento.values()];
}

/**
 * Como alcançar uma parada numa página NOVA, só com clique, preenchimento e espera — o vocabulário do
 * scanner do oráculo, que não conhece `navigate` e não herda a página de ninguém.
 *
 * `navigate` por clique vira clique + espera pelo `waitFor`: é a mesma navegação dentro da aplicação.
 * `navigate` por caminho não tem equivalente em clique, então a página nova ENTRA DIRETO na rota: o
 * endereço é o `path` do último `navigate` por caminho, com a consulta da entrada repetida (numa SPA
 * a consulta costuma escolher sessão ou perfil, como o `?mock-perfil` da tela B), e os passos são a
 * espera pelo `waitFor` dele e o que vem depois. Entrar direto não é a mesma coisa que navegar, e por
 * isso ninguém presume que dê no mesmo: `diferencasDeArvore` MEDE, e quem usa isto recusa quando a
 * árvore diverge.
 *
 * Sem `navigate` por caminho antes da parada, o endereço é a entrada e os passos são o próprio setup
 * (com os `navigate` por clique traduzidos) — sem navegação nenhuma, exatamente o setup de sempre.
 */
export interface EntradaDireta {
  url: string;
  passos: FlowSetupStep[];
  /** true quando a página nova entra numa rota diferente da entrada (houve `navigate` por caminho). */
  direta: boolean;
}

export function entradaDireta(url: string, setup: readonly FlowSetupStep[], afterStep: number): EntradaDireta {
  const ate = setup.slice(0, afterStep);
  let inicio = 0;
  let endereco = url;
  let direta = false;
  ate.forEach((step, i) => {
    if (step.action !== "navigate" || !step.path) return;
    const entrada = new URL(url);
    const alvo = new URL(step.path, entrada);
    if (!alvo.search) alvo.search = entrada.search;
    endereco = alvo.toString();
    inicio = i;
    direta = true;
  });
  const passos: FlowSetupStep[] = [];
  ate.slice(inicio).forEach((step, i) => {
    if (step.action !== "navigate") { passos.push(step); return; }
    if (direta && i === 0) { passos.push({ action: "wait", selector: step.waitFor }); return; }
    passos.push({ action: "click", selector: step.selector }, { action: "wait", selector: step.waitFor });
  });
  return { url: endereco, passos, direta };
}

/**
 * Impressão estrutural da árvore: cada elemento sob `body` (atravessando shadow roots abertos) com
 * sua chave canônica, a visibilidade medida e o rótulo SEM o id do DOM. O id sai porque aplicações
 * reais numeram ids por contador de instância (`br-input-14` numa entrada direta, `br-input-105`
 * depois de passar pela lista): o mesmo elemento, no mesmo lugar, com o mesmo texto. `head` sai
 * porque é onde o framework injeta o CSS dos componentes que já carregou — o que depende do caminho
 * percorrido, não do que está na tela.
 */
export async function impressaoDaArvore(page: Page): Promise<string[]> {
  // `*` e não `body *`: dentro de um shadow root nenhum seletor alcança o `body` do documento.
  const { bySelector, byKey } = await resolveOnPage(page, ["*"]);
  return (bySelector.get("*")?.keys ?? []).filter(k => k === "body" || k.startsWith("body>")).map(k => {
    const e = byKey.get(k)!;
    return `${k} | ${e.label.replace(/^<([a-z0-9-]+)#[^>]*>/i, "<$1>")} | ${e.hidden ?? ""}`;
  });
}

/**
 * Janela em que uma parada tem de ficar parada (D-60). Numa SPA real o conteúdo continua chegando
 * depois de o seletor esperado aparecer (a lista do modal da tela B chega ~0,5 s depois do
 * `.br-modal`), e cada medidor olharia a página num instante diferente: a resolução logo depois do
 * passo, o axe um pouco depois, o scanner do oráculo noutro navegador. Uma parada que muda dentro da
 * janela não é um estado — falta declarar uma espera pelo que ainda carrega.
 */
export const JANELA_ESTABILIDADE_MS = 1000;

/** Diferenças da árvore entre o instante da parada e o fim da janela; vazio = parada estável. */
export async function instabilidadeDaParada(page: Page): Promise<string[]> {
  const inicio = await impressaoDaArvore(page);
  let fim = inicio;
  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(JANELA_ESTABILIDADE_MS / 2);
    fim = await impressaoDaArvore(page);
    const d = diferencasDeArvore(inicio, fim, { a: "na parada", b: `até ${JANELA_ESTABILIDADE_MS} ms depois` });
    if (d.length) return d;
  }
  return [];
}

/** Diferenças entre duas impressões; vazio = mesma árvore. */
export function diferencasDeArvore(a: readonly string[], b: readonly string[], rotulos = { a: "navegando", b: "entrada direta" }): string[] {
  const sa = new Set(a);
  const sb = new Set(b);
  const soA = a.filter(x => !sb.has(x));
  const soB = b.filter(x => !sa.has(x));
  if (!soA.length && !soB.length && a.length === b.length) return [];
  return [`${a.length} elemento(s) ${rotulos.a} × ${b.length} ${rotulos.b}`,
    ...soA.slice(0, 5).map(x => `só ${rotulos.a}: ${x}`), ...soB.slice(0, 5).map(x => `só ${rotulos.b}: ${x}`)];
}

/**
 * Abre a entrada direta numa página nova do mesmo navegador (contexto próprio, como o scanner do
 * oráculo abriria), confere a árvore contra a impressão medida navegando e devolve a página para quem
 * precisa resolver nela os seletores de quem mediu por essa entrada. Árvore divergente para aqui.
 */
export async function abrirEntradaDireta(
  browser: Browser,
  viewport: FlowViewport,
  alcance: EntradaDireta,
  impressaoNavegando: readonly string[],
  onde: string,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    await page.goto(alcance.url, { waitUntil: "networkidle" });
    await runSetupSteps(page, alcance.passos);
    // O scanner varre quando a última ação dele termina. Se a entrada direta ainda está carregando
    // nesse instante, ele mediria uma árvore que a navegada não tem — mesmo que as duas acabem iguais.
    const instavel = await instabilidadeDaParada(page);
    if (instavel.length) {
      throw new Error(`${onde}: a entrada direta (${alcance.url}, ${alcance.passos.length} passo(s)) ainda muda depois do último ` +
        `passo — o scanner do oráculo varreria antes de ela assentar. Declare no setup uma espera pelo que ainda carrega:\n  - ${instavel.join("\n  - ")}`);
    }
    const diferencas = diferencasDeArvore(impressaoNavegando, await impressaoDaArvore(page));
    if (diferencas.length) {
      throw new Error(`${onde}: a entrada direta (${alcance.url}, ${alcance.passos.length} passo(s)) não reproduz a árvore ` +
        `alcançada navegando — quem mede por essa entrada estaria medindo outra página:\n  - ${diferencas.join("\n  - ")}`);
    }
    return { page, close: () => context.close() };
  } catch (error) {
    await context.close();
    throw error;
  }
}

/**
 * Executa um `navigate`: troca de rota na MESMA origem e no MESMO documento.
 *
 * Por clique, espera o endereço mudar (um clique que não troca de endereço não é navegação — é um
 * `click` mal declarado). Por caminho, empurra o endereço no histórico e avisa o roteador com
 * `popstate`, como o botão Voltar faria; `page.goto` está fora de questão porque recarregaria o
 * documento e zeraria o backend em memória. Em ambos: a origem tem de continuar a mesma, o
 * documento não pode ter sido recarregado e `waitFor` tem de aparecer.
 */
async function navegar(page: Page, step: FlowSetupStep): Promise<void> {
  const antes = new URL(page.url());
  const documento = await page.evaluate(MARCA_DOCUMENTO) as string;
  if (step.selector) {
    await page.click(step.selector);
    try {
      await page.waitForURL(u => u.href !== antes.href, { timeout: 10_000, waitUntil: "commit" });
    } catch {
      throw new Error(`navigate por clique em ${step.selector}: o endereço não mudou (${antes.pathname}); não é navegação`);
    }
  } else {
    const alvo = new URL(step.path!, antes);
    if (alvo.origin !== antes.origin) throw new Error(`navigate: ${step.path} sai da origem ${antes.origin}`);
    if (alvo.href === antes.href) throw new Error(`navigate: a página já está em ${step.path}`);
    await page.evaluate(`history.pushState(null, "", ${JSON.stringify(alvo.pathname + alvo.search + alvo.hash)});
      dispatchEvent(new PopStateEvent("popstate", { state: null }));`);
  }
  await page.waitForSelector(step.waitFor!, { timeout: 10_000 });
  const depois = new URL(page.url());
  if (depois.origin !== antes.origin) throw new Error(`navigate: a página saiu da origem ${antes.origin} para ${depois.origin}`);
  const agora = await page.evaluate(`window.__govbrEvalDocumento || null`) as string | null;
  if (agora !== documento) {
    throw new Error(`navigate ${JSON.stringify(step)}: o documento foi recarregado (${antes.pathname} → ${depois.pathname}); ` +
      "navegação só dentro da aplicação, sem recarga");
  }
}

/**
 * Forma da sequência e das paradas, conferida ANTES de a página ser tocada.
 *
 * Com navegação, toda parada declara `path`: é o endereço que diz de que rota a parada fala.
 */
export function problemasDaSequencia(setup: readonly FlowSetupStep[], states: readonly StateCheckpoint[]): string[] {
  const p: string[] = [];
  setup.forEach((step, i) => { for (const q of problemasDoPasso(step)) p.push(`setup[${i}]: ${q}`); });
  const navega = temNavegacao(setup);
  for (const st of states) {
    if (st.path === undefined) {
      if (navega) p.push(`estado ${st.id}: o setup navega, então a parada declara path (o pathname em que a página tem de estar)`);
      continue;
    }
    if (typeof st.path !== "string" || !st.path.startsWith("/") || st.path.startsWith("//") || /[?#]/.test(st.path)) {
      p.push(`estado ${st.id}: path tem de ser um pathname absoluto sem consulta nem fragmento, não ${JSON.stringify(st.path)}`);
    }
  }
  return p;
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
    /**
     * Confere, em cada parada e antes da resolução, que a árvore não muda dentro da janela de
     * estabilidade (D-60). Ligado por quem mede referência que navega; sem isto nada muda.
     */
    estabilidade?: boolean;
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
  const forma = problemasDaSequencia(setup, states);
  if (forma.length) throw new Error(`sequência de setup/estados malformada:\n  - ${forma.join("\n  - ")}`);

  const byState = new Map<string, Resolution>();
  const navigation: StateNavigation = { segmentOf: new Map(), pathOf: new Map(), declaredPathOf: new Map(), documentOf: new Map() };
  let applied = 0;
  for (const st of states) {
    await runSetupSteps(page, setup.slice(applied, st.afterStep));
    applied = st.afterStep;
    // Onde a página está, medido ANTES da resolução: segmento, endereço e documento.
    navigation.segmentOf.set(st.id, segmentoApos(setup, st.afterStep));
    navigation.pathOf.set(st.id, new URL(page.url()).pathname);
    if (st.path !== undefined) navigation.declaredPathOf.set(st.id, st.path);
    navigation.documentOf.set(st.id, await page.evaluate(MARCA_DOCUMENTO) as string);
    if (opts.estabilidade) (navigation.instavelOf ??= new Map()).set(st.id, await instabilidadeDaParada(page));
    const { bySelector, byKey } = await resolveOnPage(page, selectors);
    const resolution: Resolution = { url, bySelector, byKey };
    byState.set(st.id, resolution);
    if (opts.onState) await opts.onState(st.id, resolution, page);
  }
  return { url, order: states.map(s => s.id), byState, navigation };
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
