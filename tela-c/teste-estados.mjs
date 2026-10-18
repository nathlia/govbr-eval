/**
 * Teste de estados da tela C = cadastrar empresa (método da tela B § 2, como trocado pelo adendo
 * tela-c/metodo-auditoria-adendo-cadastrar-empresa.md § B) — sem modelo e sem detector. Nada aqui
 * olha para defeito: mede efeito, aditividade, escrita no mock, endereço e os TIPOS (componente do DS /
 * estrutura de página) que cada vista torna visíveis. Adaptado de tela-b/vistorias/teste-estados.mjs:
 * uma rota só (sem fase de linhas nem bases por navegação), gatilhos + campos de formulário, e o gesto
 * "saída de campo" (foco + Tab) só nos campos.
 *
 * Uso: node tela-c/teste-estados.mjs --candidato [--json tela-c/estados.json] [--headed]
 */
import { writeFileSync } from "fs";
import { createHash } from "crypto";
import { exigirBytes, servir, abrirNavegador, novaPagina, carregar, registroDoMock, PRELUDIO, ENTRADA, WAIT_FOR } from "./comum.mjs";

const CARGAS = 3;
const PARALELO = 6;
const args = process.argv.slice(2);
const saidaJson = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const bytes = exigirBytes();

/** Componentes do DS (nomes dos arquivos de components/ da base 3.7.0), como na tela B. */
export const COMPONENTES = ["accordion", "avatar", "breadcrumb", "button", "card", "carousel", "checkbox", "cookiebar", "datetimepicker", "divider",
  "footer", "header", "input", "item", "list", "loading", "magicbutton", "menu", "message", "modal", "notification", "pagination", "radio",
  "scrim", "select", "signin", "skiplink", "step", "switch", "tab", "table", "tag", "textarea", "tooltip", "upload", "wizard"];

/** Tipos visíveis — o mesmo texto da tela B (adendo da B § B, regra 3). */
export const TIPOS = `(() => {
${PRELUDIO}
  const COMP = ${JSON.stringify(COMPONENTES)};
  const nomeDe = tok => { const s = tok.replace(/^br-/, "").replace(/-/g, ""); let melhor = null;
    for (const c of COMP) if (s === c || s.startsWith(c)) if (!melhor || c.length > melhor.length) melhor = c; return melhor; };
  const comp = new Set(), estr = new Set();
  for (const e of todos()) {
    if (!visivel(e)) continue;
    const t = e.tagName.toLowerCase();
    if (t.startsWith("br-")) { const n = nomeDe(t); if (n) comp.add(n); }
    for (const k of (e.getAttribute("class") || "").split(" ")) if (k.startsWith("br-")) { const n = nomeDe(k); if (n) comp.add(n); }
    const r = e.getAttribute("role");
    if (r === "dialog" || r === "alertdialog" || e.getAttribute("aria-modal") === "true") estr.add("dialogo");
    if (["banner", "main", "navigation", "contentinfo", "complementary", "search", "region"].includes(r)) estr.add("regiao:" + r);
    if (t === "header" && !e.closest("article,section")) estr.add("regiao:banner");
    if (t === "main") estr.add("regiao:main"); if (t === "nav") estr.add("regiao:navigation"); if (t === "footer") estr.add("regiao:contentinfo");
    if (/^h[1-6]$/.test(t)) estr.add("titulo:" + t);
    if (t === "table") estr.add("tabela"); if (t === "form") estr.add("formulario");
    if (t === "ul" || t === "ol") estr.add("lista"); if (t === "img") estr.add("imagem");
    if (t === "a" && e.hasAttribute("href")) estr.add("link");
    if (t === "textarea" || (t === "input" && !["hidden", "checkbox", "radio"].includes(e.type))) estr.add("campo");
    if (t === "input" && e.type === "checkbox") estr.add("caixa-de-selecao");
    if (t === "input" && e.type === "radio") estr.add("botao-de-opcao");
    if (t === "input" && e.type === "file") estr.add("envio-de-arquivo");
    if (r === "alert" || (e.classList && e.classList.contains("feedback"))) estr.add("mensagem");
    if (e.classList && e.classList.contains("note-editor")) estr.add("editor-de-texto");
  }
  return { componentes: [...comp].sort(), estruturas: [...estr].sort() };
})()`;

export const FOTO = `(() => {
${PRELUDIO}
  const serial = raiz => Array.from(raiz.childNodes).map(n => {
    if (n.nodeType === 3) return n.textContent;
    if (n.nodeType !== 1) return "";
    const attrs = Array.from(n.attributes).map(a => a.name + "=" + JSON.stringify(a.value)).sort().join(" ");
    return "<" + n.tagName.toLowerCase() + " " + attrs + ">" + (n.shadowRoot ? "#shadow(" + serial(n.shadowRoot) + ")" : "") + serial(n) + "</>";
  }).join("");
  const els = todos();
  return {
    domHash: (() => { const t = serial(document); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return t.length + ":" + h; })(),
    visiveis: els.filter(visivel).map(chave),
    presentes: els.map(chave),
    expandidos: els.filter(e => e.hasAttribute("aria-expanded")).map(e => chave(e) + "=" + e.getAttribute("aria-expanded")),
    url: location.href,
    doc: window.__auditoriaDoc || (window.__auditoriaDoc = Math.random().toString(36).slice(2)),
  };
})()`;

const GATILHOS = `(() => {
${PRELUDIO}
  const sel = "button, a[href], [role=button], [role=menuitem], [role=tab], [role=option], [aria-expanded], [aria-haspopup], [aria-controls], [data-toggle], [tabindex], .br-sign-in, .br-avatar, input:not([type=hidden]), select, textarea";
  return todos().filter(e => e.matches(sel)).map(e => ({ chave: chave(e), tag: e.tagName.toLowerCase(), id: e.id || null, tipo: e.type || null,
    campo: ["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName),
    classe: (e.getAttribute("class") || "").trim() || null, sombra: !!(e.getRootNode() && e.getRootNode().host),
    hospedeiro: e.getRootNode() && e.getRootNode().host ? (e.getRootNode().host.getAttribute("label") || e.getRootNode().host.getAttribute("name") || e.getRootNode().host.getAttribute("icon") || e.getRootNode().host.getAttribute("title") || e.getRootNode().host.tagName.toLowerCase()) : null,
    visivel: visivel(e), rotulo: (e.getAttribute("aria-label") || e.getAttribute("title") || e.getAttribute("name") || e.textContent || "").split(/[\\n\\t ]+/).join(" ").trim().slice(0, 40) }));
})()`;

const LOCALIZAR = alvo => `(() => {
${PRELUDIO}
  return todos().find(e => chave(e) === ${JSON.stringify(alvo)}) || null;
})()`;

export async function arvoreAx(pagina) {
  const cdp = await pagina.context().newCDPSession(pagina);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const linhas = nodes.filter(n => !n.ignored).map(n => [n.role?.value, n.name?.value ?? "",
    (n.properties ?? []).filter(p => p.name !== "focused").map(p => `${p.name}=${JSON.stringify(p.value?.value)}`).sort().join(",")].join("|"));
  return { n: linhas.length, hash: createHash("sha256").update(linhas.join("\n")).digest("hex").slice(0, 16) };
}

const escritasDoMock = async pagina => (await registroDoMock(pagina)).atendidos.filter(k => !/^GET /.test(k));

async function main() {
  const { servidor, base } = await servir();
  const navegador = await abrirNavegador();
  async function emParalelo(tarefas, fn) {
    const saida = new Array(tarefas.length);
    let i = 0;
    await Promise.all(Array.from({ length: PARALELO }, async () => { while (i < tarefas.length) { const k = i++; saida[k] = await fn(tarefas[k], k); } }));
    return saida;
  }
  async function comPagina(fn) {
    const s = await novaPagina(navegador);
    try { await carregar(s.pagina, base); return await fn(s); } finally { await s.contexto.close(); }
  }
  const registro = { entrada: ENTRADA, waitFor: WAIT_FOR, bytes, medidoEm: new Date().toISOString(), carga: null, gatilhos: [], resultados: [] };
  try {
    registro.carga = await comPagina(async ({ pagina, pedidos, erros, escritas, externos }) => ({
      url: pagina.url(), path: new URL(pagina.url()).pathname, pedidos: pedidos.length, externos: externos().map(p => p.host + p.caminho),
      escritasRede: escritas().map(p => p.metodo + " " + p.caminho), mock: await registroDoMock(pagina), erros, tipos: await pagina.evaluate(TIPOS),
    }));
    const gatilhos = await comPagina(({ pagina }) => pagina.evaluate(GATILHOS));
    registro.gatilhos = gatilhos;
    const tarefas = [];
    for (const g of gatilhos) for (const gesto of g.campo ? ["clique", "enter", "saida"] : ["clique", "enter"]) for (let i = 0; i < CARGAS; i++) tarefas.push({ g, gesto, i });
    console.error(`${gatilhos.length} gatilhos (${gatilhos.filter(g => g.campo).length} campos) → ${tarefas.length} cargas`);
    const brutos = await emParalelo(tarefas, ({ g, gesto }) => comPagina(async ({ pagina, pedidos, escritas }) => {
      const antes = await pagina.evaluate(FOTO);
      const axAntes = await arvoreAx(pagina);
      const escritasAntes = [...escritas().map(x => x.metodo + " " + x.caminho), ...(await escritasDoMock(pagina))];
      const nPedidos = pedidos.length;
      let erro = null;
      try {
        const el = (await pagina.evaluateHandle(LOCALIZAR(g.chave))).asElement();
        if (!el) throw new Error("gatilho não localizado");
        if (gesto === "clique") await el.click({ timeout: 2000 });
        else if (gesto === "enter") { await el.focus(); await pagina.keyboard.press("Enter"); }
        else { await el.focus(); await pagina.keyboard.press("Tab"); }
        await pagina.waitForTimeout(700);
      } catch (e) { erro = String(e.message || e).split("\n")[0]; }
      let depois, axDepois, tipos;
      try { depois = await pagina.evaluate(FOTO); axDepois = await arvoreAx(pagina); tipos = await pagina.evaluate(TIPOS); }
      catch (e) { return { erro: "página indisponível depois do gesto: " + String(e.message).split("\n")[0] }; }
      const escritasDepois = [...escritas().map(x => x.metodo + " " + x.caminho), ...(await escritasDoMock(pagina))];
      return {
        erro, domMudou: antes.domHash !== depois.domHash, axMudou: axAntes.hash !== axDepois.hash, axAntes: axAntes.n, axDepois: axDepois.n,
        novosVisiveis: depois.visiveis.filter(k => !antes.visiveis.includes(k)).length,
        expandidoVirou: depois.expandidos.filter(x => !antes.expandidos.includes(x)),
        sumiram: antes.presentes.filter(k => !depois.presentes.includes(k)).length,
        deixaramVisiveis: antes.visiveis.filter(k => !depois.visiveis.includes(k)).length,
        urlIgual: antes.url === depois.url, pathDepois: new URL(depois.url).pathname, recarregou: antes.doc !== depois.doc,
        externosDepois: pedidos.slice(nPedidos).filter(p => p.externo).map(p => p.host + p.caminho),
        escritas: escritasDepois.filter(x => !escritasAntes.includes(x)),
        tipos,
      };
    }));
    for (const g of gatilhos) for (const gesto of g.campo ? ["clique", "enter", "saida"] : ["clique", "enter"]) {
      const cargas = brutos.filter((_, k) => tarefas[k].g === g && tarefas[k].gesto === gesto);
      const efeito = c => !c.erro && (c.novosVisiveis > 0 || c.expandidoVirou.length > 0 || !c.urlIgual);
      const aditivo = c => c.sumiram === 0 && c.deixaramVisiveis === 0;
      const limpo = c => c.externosDepois.length === 0 && c.escritas.length === 0;
      const rep = cargas.filter(efeito).length;
      let veredito;
      if (rep === 0) veredito = "sem-efeito";
      else if (cargas.some(c => c.escritas?.length)) veredito = "escrita";
      else if (cargas.some(c => c.recarregou)) veredito = "recarga";
      else if (cargas.some(c => efeito(c) && c.pathDepois !== registro.carga.path)) veredito = "navega";
      else if (rep === CARGAS && cargas.every(c => c.urlIgual && aditivo(c) && limpo(c))) veredito = "produz-estado";
      else if (rep < CARGAS) veredito = "efeito-parcial";
      else if (cargas.some(c => !aditivo(c))) veredito = "nao-aditivo";
      else veredito = "efeito-nao-estado";
      const c0 = cargas.find(efeito) ?? cargas[0];
      registro.resultados.push({ gatilho: g.chave, tag: g.tag, id: g.id, campo: g.campo, rotulo: g.rotulo || g.hospedeiro || "", hospedeiro: g.hospedeiro, visivel: g.visivel, gesto, veredito,
        repeticoes: `${rep}/${CARGAS}`, pathDepois: c0.pathDepois, tipos: c0.tipos, escritas: [...new Set(cargas.flatMap(c => c.escritas ?? []))],
        amostra: { erro: c0.erro, dom: c0.domMudou, ax: `${c0.axAntes}→${c0.axDepois}`, novosVisiveis: c0.novosVisiveis, sumiram: c0.sumiram, deixaramVisiveis: c0.deixaramVisiveis, expandido: c0.expandidoVirou } });
    }
  } finally {
    await navegador.close();
    servidor.close();
  }
  const c = registro.carga;
  console.log(`entrada: ${ENTRADA} → ${c.path}`);
  console.log(`bytes: ${bytes.modo}, ${bytes.n} arquivos · sha256 da lista ${bytes.sha256Lista}`);
  console.log(`carga: ${c.pedidos} pedidos · externos ${c.externos.length} · escritas (rede ${c.escritasRede.length}) · mock atendidos ${c.mock.atendidos.length}, não mockados ${c.mock.naoMockados.length} · erros ${c.erros.length}`);
  console.log(`tipos na carga: DS [${c.tipos.componentes.join(" ")}] · estruturas [${c.tipos.estruturas.join(" ")}]`);
  const cont = {};
  for (const r of registro.resultados) cont[r.veredito] = (cont[r.veredito] ?? 0) + 1;
  console.log(`\n${registro.gatilhos.length} gatilhos · ${registro.resultados.length} gatilho×gesto: ${Object.entries(cont).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`\ncom efeito (tudo que não é sem-efeito):`);
  for (const r of registro.resultados.filter(x => x.veredito !== "sem-efeito")) {
    console.log(`  ${r.veredito.padEnd(17)} ${r.gesto.padEnd(6)} ${r.repeticoes} "${r.rotulo}" <${r.tag}${r.id ? "#" + r.id : ""}> ${r.gatilho.slice(-70)}` +
      ` · +vis ${r.amostra.novosVisiveis} −vis ${r.amostra.deixaramVisiveis} −dom ${r.amostra.sumiram} · ax ${r.amostra.ax}${r.escritas.length ? " · ESCRITA " + r.escritas.join(",") : ""}${r.pathDepois !== c.path ? " → " + r.pathDepois : ""}` +
      `\n      tipos: DS [${(r.tipos?.componentes ?? []).join(" ")}] · estr [${(r.tipos?.estruturas ?? []).join(" ")}]`);
  }
  if (saidaJson) writeFileSync(saidaJson, JSON.stringify(registro, null, 1));
}
if (process.argv[1] && process.argv[1].endsWith("teste-estados.mjs")) await main();
