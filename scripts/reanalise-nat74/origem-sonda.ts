/**
 * Sonda de autoria (origem medida, D-129) — código que roda DENTRO da página, mantido como TEXTO (como
 * `IN_PAGE_PRELUDE` de anchors.ts: sob `tsx`, função passada a `page.evaluate` chama `__name`, que só existe no Node).
 *
 * `SONDA_INICIAL` entra por `addInitScript`, antes de qualquer script da página: envolve as APIs do DOM que CRIAM
 * elementos (createElement, innerHTML, insertAdjacentHTML, cloneNode, importNode, createContextualFragment, DOMParser,
 * attachShadow) e as que ESCREVEM atributos (setAttribute & cia., propriedades refletidas, classList, style), e grava
 * para cada elemento a pilha de chamadas de quem o criou e de quem escreveu cada atributo. Cada envoltório chama o
 * original com os mesmos argumentos e devolve o que ele devolve: a página não muda de comportamento. Elemento sem
 * registro de criação veio do HTML estático do documento (parser).
 *
 * `LEITURA` (com o prelúdio de anchors.ts) resolve a chave canônica do sujeito e devolve o que foi gravado sobre ele.
 * A classificação dos quadros da pilha (DS × página) é feita fora da página, nos bytes servidos (origem-campanha.ts).
 */
import { IN_PAGE_PRELUDE } from "../anchors";

/** Nome do arquivo virtual da sonda nas pilhas (os quadros dela são descartados). */
export const ARQUIVO_SONDA = "__origem_sonda__.js";

export const SONDA_INICIAL = `(() => {
  if (window.__origemSonda) return;
  Error.stackTraceLimit = 40;
  const S = { criados: new WeakMap(), escritas: new WeakMap(), sombras: new WeakMap(), estilos: new WeakMap(), listas: new WeakMap(), seq: 0 };
  Object.defineProperty(window, "__origemSonda", { value: S, enumerable: false });
  const pilha = () => String(new Error().stack || "").split("\\n").slice(1).map(l => l.trim()).filter(l => l.indexOf("${ARQUIVO_SONDA}") === -1).slice(0, 14);
  const criar = (n, tipo, p) => { if (n && n.nodeType === 1 && !S.criados.has(n)) S.criados.set(n, { tipo, pilha: p, seq: ++S.seq }); };
  const descendentes = (r) => { const out = []; if (!r) return out; if (r.nodeType === 1) out.push(r); if (r.querySelectorAll) for (const e of r.querySelectorAll("*")) out.push(e); return out; };
  const novos = (raiz, antes, tipo, p) => { for (const e of descendentes(raiz)) if (!antes.has(e)) criar(e, tipo, p); };
  const escrever = (el, nome, valor, p) => {
    if (!el || el.nodeType !== 1) return;
    let m = S.escritas.get(el); if (!m) { m = new Map(); S.escritas.set(el, m); }
    const l = m.get(nome) || []; if (l.length < 24) l.push({ valor: valor === null || valor === undefined ? null : String(valor).slice(0, 200), pilha: p, seq: ++S.seq }); m.set(nome, l);
  };
  const envolver = (proto, nome, depois) => {
    const d = proto && Object.getOwnPropertyDescriptor(proto, nome);
    if (!d || typeof d.value !== "function") return;
    const orig = d.value;
    Object.defineProperty(proto, nome, { ...d, value: function (...a) { const p = pilha(); const antes = depois.antes ? depois.antes(this, a) : null; const r = orig.apply(this, a); try { depois.f(this, a, r, p, antes); } catch (e) {} return r; } });
  };
  const envolverSetter = (proto, nome, f, antesF) => {
    const d = proto && Object.getOwnPropertyDescriptor(proto, nome);
    if (!d || typeof d.set !== "function") return;
    const set = d.set;
    Object.defineProperty(proto, nome, { ...d, set: function (v) { const p = pilha(); const antes = antesF ? antesF(this) : null; set.call(this, v); try { f(this, v, p, antes); } catch (e) {} } });
  };
  const envolverGetter = (proto, nome, f) => {
    const d = proto && Object.getOwnPropertyDescriptor(proto, nome);
    if (!d || typeof d.get !== "function") return;
    const get = d.get;
    Object.defineProperty(proto, nome, { ...d, get: function () { const r = get.call(this); try { f(this, r); } catch (e) {} return r; } });
  };
  // ── criação
  for (const n of ["createElement", "createElementNS"]) envolver(Document.prototype, n, { f: (_t, _a, r, p) => criar(r, n, p) });
  const conjunto = (r) => new Set(descendentes(r));
  for (const proto of [Element.prototype, ShadowRoot.prototype]) {
    envolverSetter(proto, "innerHTML", (t, _v, p, antes) => novos(t, antes, "innerHTML", p), t => conjunto(t));
    if (proto.setHTMLUnsafe) envolver(proto, "setHTMLUnsafe", { antes: t => conjunto(t), f: (t, _a, _r, p, antes) => novos(t, antes, "setHTMLUnsafe", p) });
  }
  envolverSetter(Element.prototype, "outerHTML", (t, _v, p, antes) => antes && novos(antes.pai, antes.c, "outerHTML", p), t => (t.parentNode ? { pai: t.parentNode, c: conjunto(t.parentNode) } : null));
  envolver(Element.prototype, "insertAdjacentHTML", { antes: t => (t.parentNode ? { pai: t.parentNode, c: conjunto(t.parentNode) } : { pai: t, c: conjunto(t) }), f: (_t, _a, _r, p, antes) => novos(antes.pai, antes.c, "insertAdjacentHTML", p) });
  envolver(Node.prototype, "cloneNode", { f: (_t, _a, r, p) => { for (const e of descendentes(r)) criar(e, "cloneNode", p); } });
  envolver(Document.prototype, "importNode", { f: (_t, _a, r, p) => { for (const e of descendentes(r)) criar(e, "importNode", p); } });
  envolver(Range.prototype, "createContextualFragment", { f: (_t, _a, r, p) => { for (const e of descendentes(r)) criar(e, "createContextualFragment", p); } });
  envolver(DOMParser.prototype, "parseFromString", { f: (_t, _a, r, p) => { for (const e of descendentes(r && r.documentElement)) criar(e, "DOMParser", p); } });
  envolver(Element.prototype, "attachShadow", { f: (t, a, r, p) => S.sombras.set(t, { modo: a && a[0] && a[0].mode, pilha: p, seq: ++S.seq }) });
  // ── atributos
  envolver(Element.prototype, "setAttribute", { f: (t, a, _r, p) => escrever(t, String(a[0]).toLowerCase(), a[1], p) });
  envolver(Element.prototype, "setAttributeNS", { f: (t, a, _r, p) => escrever(t, String(a[1]).toLowerCase().replace(/^.*:/, ""), a[2], p) });
  envolver(Element.prototype, "removeAttribute", { f: (t, a, _r, p) => escrever(t, String(a[0]).toLowerCase(), null, p) });
  envolver(Element.prototype, "removeAttributeNS", { f: (t, a, _r, p) => escrever(t, String(a[1]).toLowerCase(), null, p) });
  envolver(Element.prototype, "toggleAttribute", { f: (t, a, _r, p) => escrever(t, String(a[0]).toLowerCase(), t.getAttribute(a[0]), p) });
  for (const n of ["setAttributeNode", "setAttributeNodeNS"]) envolver(Element.prototype, n, { f: (t, a, _r, p) => a[0] && escrever(t, String(a[0].name).toLowerCase(), a[0].value, p) });
  envolverSetter(Attr.prototype, "value", (t, v, p) => t.ownerElement && escrever(t.ownerElement, String(t.name).toLowerCase(), v, p));
  // Propriedades refletidas: a escrita vai para o atributo do mesmo nome (tabela fixa) + ARIA refletido (ariaXxx).
  const refletidas = [["tabIndex", "tabindex"], ["title", "title"], ["hidden", "hidden"], ["lang", "lang"], ["dir", "dir"], ["id", "id"], ["className", "class"],
    ["htmlFor", "for"], ["alt", "alt"], ["placeholder", "placeholder"], ["disabled", "disabled"], ["required", "required"], ["readOnly", "readonly"], ["href", "href"],
    ["src", "src"], ["role", "role"], ["inert", "inert"], ["accessKey", "accesskey"], ["contentEditable", "contenteditable"], ["scope", "scope"], ["headers", "headers"],
    ["type", "type"], ["name", "name"], ["autocomplete", "autocomplete"], ["draggable", "draggable"]];
  const protos = [Element.prototype, HTMLElement.prototype, HTMLInputElement.prototype, HTMLButtonElement.prototype, HTMLAnchorElement.prototype, HTMLImageElement.prototype,
    HTMLLabelElement.prototype, HTMLSelectElement.prototype, HTMLTextAreaElement.prototype, HTMLTableCellElement.prototype, HTMLIFrameElement.prototype, HTMLOutputElement.prototype];
  for (const proto of protos) {
    for (const [prop, attr] of refletidas) if (Object.prototype.hasOwnProperty.call(proto, prop)) envolverSetter(proto, prop, (t, v, p) => escrever(t, attr, t.getAttribute(attr), p));
  }
  for (const prop of Object.getOwnPropertyNames(Element.prototype)) {
    if (!/^aria[A-Z]/.test(prop) || /Elements?$/.test(prop)) continue;
    const attr = "aria-" + prop.slice(4).toLowerCase();
    envolverSetter(Element.prototype, prop, (t, v, p) => escrever(t, attr, t.getAttribute(attr), p));
  }
  // classList / relList: a lista não conhece o dono; o getter registra o par.
  envolverGetter(Element.prototype, "classList", (t, r) => S.listas.set(r, { el: t, attr: "class" }));
  for (const n of ["add", "remove", "toggle", "replace"]) envolver(DOMTokenList.prototype, n, { f: (t, _a, _r, p) => { const d = S.listas.get(t); if (d) escrever(d.el, d.attr, d.el.getAttribute(d.attr), p); } });
  // style: idem (a declaração não conhece o dono); cada propriedade escrita vira "style:<propriedade>".
  for (const proto of [HTMLElement.prototype, SVGElement.prototype]) envolverGetter(proto, "style", (t, r) => S.estilos.set(r, t));
  const decl = CSSStyleDeclaration.prototype;
  envolver(decl, "setProperty", { f: (t, a, _r, p) => { const el = S.estilos.get(t); if (el) escrever(el, "style:" + String(a[0]).toLowerCase(), t.getPropertyValue(a[0]), p); } });
  envolver(decl, "removeProperty", { f: (t, a, _r, p) => { const el = S.estilos.get(t); if (el) escrever(el, "style:" + String(a[0]).toLowerCase(), null, p); } });
  envolverSetter(decl, "cssText", (t, v, p) => { const el = S.estilos.get(t); if (el) escrever(el, "style", el.getAttribute("style"), p); });
  for (const prop of Object.getOwnPropertyNames(decl)) {
    if (prop === "cssText" || prop === "cssFloat" && false) continue;
    const d = Object.getOwnPropertyDescriptor(decl, prop);
    if (!d || typeof d.set !== "function") continue;
    const css = prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase()).replace(/^webkit-/, "-webkit-");
    envolverSetter(decl, prop, (t, v, p) => { const el = S.estilos.get(t); if (el) escrever(el, "style:" + css, v, p); });
  }
})();
//# sourceURL=${ARQUIVO_SONDA}`;

/**
 * Leitura de um sujeito pela chave canônica (prelúdio de anchors.ts: mesma definição de chave do pacote). Devolve o
 * elemento (para o CDP) e o registro: criação, escritas por atributo, cadeia de hospedeiros de shadow, componentes do DS
 * candidatos (classe `br-*` ou etiqueta `br-*` na cadeia de ancestrais, atravessando shadow) e os atributos presentes.
 */
export const LEITURA = `(chave) => {
${IN_PAGE_PRELUDE}
  const S = window.__origemSonda;
  const achados = chave === "" ? [document.documentElement] : queryAll(chave);
  const el = achados.length === 1 ? achados[0] : null;
  if (!el) return { ok: false, motivo: achados.length ? achados.length + " elementos com a chave" : "chave não resolvida na parada" };
  const chaveMedida = el === document.documentElement ? "" : keyOf(el);
  const criacao = S ? S.criados.get(el) || null : null;
  const escritas = {};
  if (S && S.escritas.get(el)) for (const [k, v] of S.escritas.get(el)) escritas[k] = v;
  const atributos = {};
  for (const a of el.attributes) atributos[a.name] = a.value.slice(0, 200);
  const hospedeiros = [];
  let r = el.getRootNode();
  while (r && r.host) { const h = r.host; const sh = S ? S.sombras.get(h) : null; hospedeiros.push({ etiqueta: h.tagName.toLowerCase(), chave: keyOf(h), modo: r.mode, criacao: S ? S.criados.get(h) || null : null, sombra: sh, definido: !!customElements.get(h.tagName.toLowerCase()) }); r = h.getRootNode(); }
  const cadeia = [];
  let x = el;
  while (x && x.nodeType === 1) {
    const cls = Array.from(x.classList || []).filter(c => /^br-[a-z]/.test(c) || /^flatpickr-calendar$/.test(c));
    const ex = S && S.escritas.get(x);
    cadeia.push({ etiqueta: x.tagName.toLowerCase(), classes: Array.from(x.classList || []), componentes: cls,
      criacao: S ? (S.criados.get(x) || null) : null, escritasClasse: (ex && ex.get("class")) || null });
    if (x.parentElement) { x = x.parentElement; continue; }
    const rr = x.getRootNode(); x = rr && rr.host ? rr.host : null;
  }
  return { ok: true, chaveMedida, rotulo: labelOf(el), criacao, escritas, atributos, hospedeiros, cadeia };
}`;

/** Elemento pela chave (para o CDP pegar o nó); null se não resolve em exatamente um. */
export const ELEMENTO = `(chave) => {
${IN_PAGE_PRELUDE}
  const achados = chave === "" ? [document.documentElement] : queryAll(chave);
  return achados.length === 1 ? achados[0] : null;
}`;

/** Seletor → chave canônica, só quando resolve em exatamente um nó (sujeitos declarados à mão). */
export const RESOLVER = `(seletor) => {
${IN_PAGE_PRELUDE}
  const n = queryAll(seletor);
  return { chave: n.length === 1 ? keyOf(n[0]) : null, n: n.length };
}`;
