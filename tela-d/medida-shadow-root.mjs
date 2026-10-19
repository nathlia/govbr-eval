/**
 * Medida (sem modelo e sem detector): a tela D (`processos`) tem algum elemento dentro de shadow root,
 * aberto ou FECHADO, e em particular algum controle de formulário dentro de raiz fechada? Pergunta das
 * linhas F1-04-D/F1-05-C do portão de reserva (o validador 2.14.3 não enxerga raiz fechada).
 *
 * Como: carga nova da árvore congelada pnip-d/ (tela-d/comum.mjs, conferida contra o manifesto), 1280×900,
 * headless; um init script (page.addInitScript, antes de qualquer script da página) envolve
 * Element.prototype.attachShadow e guarda cada chamada (hospedeiro, modo) e a referência da raiz — é a
 * única forma de alcançar raiz fechada. Também caminha as raízes abertas por element.shadowRoot (pega
 * raiz declarativa aberta, que não passa por attachShadow). Paradas pelo setup de tela-d/sequencia.mjs,
 * como em conferir-paradas.mjs. Conta controles no light DOM, em raízes abertas e em raízes fechadas, e
 * os custom elements (br-* vs outros). Complemento estático: ocorrências de `attachShadow`/`shadowrootmode`
 * nos bytes servidos.
 *
 * Uso: node tela-d/medida-shadow-root.mjs [--candidato] [--headed]
 * Saída: tela-d/medidas/shadow-root-<UTC>.json
 */
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { exigirBytes, servir, abrirNavegador, novaPagina, carregar, executarPassos, RAIZ_EVAL, RAIZ_BYTES, ALA, ENTRADA } from "./comum.mjs";
import { SETUP, STATES } from "./sequencia.mjs";

const INIT = `(() => {
  const original = Element.prototype.attachShadow;
  const registro = [];
  Object.defineProperty(window, "__medidaSombras", { value: registro, enumerable: false });
  Element.prototype.attachShadow = function (opcoes) {
    const raiz = original.call(this, opcoes);
    registro.push({ host: this, raiz, modo: opcoes && opcoes.mode, ordem: registro.length });
    return raiz;
  };
})();`;

const MEDIR = () => {
  const CONTROLES = 'input,select,textarea,button,[contenteditable]:not([contenteditable="false"]),[role=textbox],[role=combobox],[role=checkbox],[role=radio]';
  const passo = el => {
    const pai = el.parentNode;
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    if (pai && pai.children) {
      const irmaos = [...pai.children].filter(x => x.tagName === el.tagName);
      if (irmaos.length > 1) s += `:nth-of-type(${irmaos.indexOf(el) + 1})`;
    }
    return s;
  };
  const caminho = el => {
    const partes = [];
    let atual = el, seg = [];
    while (atual) {
      seg.unshift(passo(atual));
      const pai = atual.parentNode;
      if (pai && pai.nodeType === 11 && pai.host) { partes.unshift(seg.join(">")); seg = []; atual = pai.host; }
      else if (pai && pai.nodeType === 1) atual = pai;
      else { partes.unshift(seg.join(">")); atual = null; }
    }
    return partes.join(" >>> ");
  };
  const registro = window.__medidaSombras || [];
  const porRaiz = new Map(registro.map(r => [r.raiz, r]));
  // raízes: as registradas + as abertas achadas caminhando (declarativas)
  const porHost = new Map(registro.map(r => [r.host, r.raiz]));
  const raizes = new Map();
  const visitar = raiz => {
    for (const el of raiz.querySelectorAll("*")) {
      const sr = el.shadowRoot || porHost.get(el) || null;
      if (sr && !raizes.has(sr)) { raizes.set(sr, { modo: sr.mode, viaAttachShadow: porRaiz.has(sr) }); visitar(sr); }
    }
  };
  visitar(document);
  for (const r of registro) if (!raizes.has(r.raiz)) raizes.set(r.raiz, { modo: r.raiz.mode, viaAttachShadow: true, foraDaArvore: true });
  const descrever = el => ({
    tag: el.tagName.toLowerCase(), id: el.id || null, type: el.getAttribute("type"), role: el.getAttribute("role"),
    name: el.getAttribute("name"), classe: el.getAttribute("class"), ariaLabel: el.getAttribute("aria-label"),
    caminho: caminho(el), conectado: el.isConnected,
  });
  const ce = {};
  const contarCE = raiz => { for (const el of raiz.querySelectorAll("*")) { const t = el.tagName.toLowerCase(); if (t.includes("-")) ce[t] = (ce[t] || 0) + 1; } };
  contarCE(document);
  const raizesOut = [];
  for (const [sr, info] of raizes) {
    contarCE(sr);
    const controles = [...sr.querySelectorAll(CONTROLES)].map(descrever);
    raizesOut.push({ modo: info.modo, viaAttachShadow: info.viaAttachShadow, hospedeiro: caminho(sr.host), hospedeiroTag: sr.host.tagName.toLowerCase(),
      conectado: sr.host.isConnected, elementos: sr.querySelectorAll("*").length, controles });
  }
  const chamadas = registro.map(r => ({ ordem: r.ordem, modo: r.modo, hospedeiroTag: r.host.tagName.toLowerCase(), hospedeiroId: r.host.id || null, hospedeiro: caminho(r.host), conectado: r.host.isConnected }));
  const porModo = m => chamadas.filter(c => c.modo === m).length;
  const tags = Object.keys(ce).sort();
  const light = [...document.querySelectorAll(CONTROLES)];
  return {
    url: location.pathname,
    attachShadow: { total: chamadas.length, open: porModo("open"), closed: porModo("closed"), outros: chamadas.filter(c => c.modo !== "open" && c.modo !== "closed").length, chamadas },
    raizes: { total: raizesOut.length, abertas: raizesOut.filter(r => r.modo === "open").length, fechadas: raizesOut.filter(r => r.modo === "closed").length,
      declarativasSemAttachShadow: raizesOut.filter(r => !r.viaAttachShadow).length },
    controles: {
      lightDom: light.length,
      raizesAbertas: raizesOut.filter(r => r.modo === "open").reduce((n, r) => n + r.controles.length, 0),
      raizesFechadas: raizesOut.filter(r => r.modo === "closed").reduce((n, r) => n + r.controles.length, 0),
      listaFechadas: raizesOut.filter(r => r.modo === "closed").flatMap(r => r.controles.map(c => ({ ...c, hospedeiro: r.hospedeiro }))),
      listaAbertas: raizesOut.filter(r => r.modo === "open").flatMap(r => r.controles.map(c => ({ tag: c.tag, type: c.type, role: c.role, id: c.id, ariaLabel: c.ariaLabel, caminho: c.caminho }))),
    },
    raizesDetalhe: raizesOut.map(({ controles, ...r }) => ({ ...r, nControles: controles.length })),
    customElements: {
      instancias: Object.values(ce).reduce((a, b) => a + b, 0),
      tags: tags.length,
      ds: tags.filter(t => t.startsWith("br-")).map(t => ({ tag: t, n: ce[t], definido: !!customElements.get(t) })),
      outros: tags.filter(t => !t.startsWith("br-")).map(t => ({ tag: t, n: ce[t], definido: !!customElements.get(t) })),
    },
  };
};

// complemento estático: o que os bytes servidos dizem sobre attachShadow / raiz declarativa
const listar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]);
const estatico = [];
for (const arq of listar(join(RAIZ_BYTES, ALA)).filter(p => /\.(js|html)$/.test(p))) {
  const txt = readFileSync(arq, "utf8");
  for (const re of [/attachShadow\([^)]{0,60}\)/g, /shadowrootmode[^>]{0,30}/gi]) for (const m of txt.matchAll(re)) estatico.push({ arquivo: arq.slice(RAIZ_BYTES.length + 1).replaceAll("\\", "/"), trecho: m[0] });
}

const bytes = exigirBytes();
const { servidor, base } = await servir();
const navegador = await abrirNavegador();
const paradas = {};
let erros = [];
try {
  const np = await novaPagina(navegador);
  await np.pagina.addInitScript(INIT);
  await carregar(np.pagina, base);
  let feito = 0;
  for (const st of STATES) {
    await executarPassos(np.pagina, SETUP.slice(feito, st.afterStep));
    feito = st.afterStep;
    paradas[st.id] = { afterStep: st.afterStep, ...(await np.pagina.evaluate(MEDIR)) };
  }
  erros = np.erros;
  await np.contexto.close();
} finally {
  await navegador.close();
  servidor.close();
}

const agora = new Date();
const carimbo = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const saida = { tela: "processos", entrada: ENTRADA, viewport: "1280x900", headless: !process.argv.includes("--headed"), medidoEm: agora.toISOString(), bytes,
  metodo: "init script envolve Element.prototype.attachShadow antes de qualquer script; caminhada por element.shadowRoot + raízes registradas; paradas por tela-d/sequencia.mjs",
  errosDePagina: erros, estatico, paradas };
mkdirSync(join(RAIZ_EVAL, "tela-d/medidas"), { recursive: true });
const arquivo = join(RAIZ_EVAL, "tela-d/medidas", `shadow-root-${carimbo}.json`);
writeFileSync(arquivo, JSON.stringify(saida, null, 1) + "\n");
console.log(`bytes ${bytes.modo} · lista ${bytes.sha256Lista}`);
for (const [id, p] of Object.entries(paradas)) {
  console.log(`${id}: attachShadow ${p.attachShadow.total} (open ${p.attachShadow.open}, closed ${p.attachShadow.closed}) · raízes ${p.raizes.total} (declarativas ${p.raizes.declarativasSemAttachShadow}) · controles light ${p.controles.lightDom} / abertas ${p.controles.raizesAbertas} / fechadas ${p.controles.raizesFechadas} · CE ${p.customElements.tags} tags (${p.customElements.ds.length} br-*)`);
}
console.log(`estático: ${estatico.map(e => e.arquivo + ": " + e.trecho).join(" | ")}`);
console.log(`→ ${arquivo}`);
