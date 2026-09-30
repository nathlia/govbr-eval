/**
 * Teste de estados da tela B = Vistorias (metodo-auditoria.md § 2, como trocado pelo adendo § B) —
 * sem modelo e sem oráculo. Nada aqui olha para defeito: mede efeito, aditividade, escrita no mock,
 * endereço e os TIPOS (componente do DS / estrutura de página) que cada vista torna visíveis.
 *
 * Fases:
 *  0. confere o manifesto; carrega a entrada; hidratação = WAIT_FOR + whenDefined dos br-*.
 *  1. rotas da lista: abre o detalhe de CADA linha da aba padrão (páginas 1..N), por carga nova, e
 *     registra o endereço e as ações (rótulos de botão) que o detalhe oferece — para escolher, por
 *     ação, "a primeira linha da aba padrão que a oferece" (adendo § B, regra 2).
 *  2. bases: a entrada; o detalhe da 1ª linha (clique no olho); o detalhe da 1ª linha que oferece
 *     cada ação que a 1ª linha não oferece; e cada rota da mesma árvore alcançada por clique a partir
 *     dessas (fase 3 descobre, fase 3 de novo testa).
 *  3. em cada base: gatilhos enumerados mecanicamente (light DOM + shadow roots abertas; + br-tag e
 *     controles da barra de filtros); cada gatilho × gesto (clique real, Enter com foco) em 3 cargas
 *     novas: fotografa DOM serializado, árvore de acessibilidade (CDP), URL, escritas no mock
 *     (registro do próprio mock `window.__pnipMock.atendidos()` + log de rede); aciona; fotografa.
 *
 * Saída: resumo no console e o registro completo em JSON (`--json <arquivo>`).
 * Uso: node tela-b/vistorias/teste-estados.mjs [--json tela-b/vistorias/estados.json] [--headed]
 */
import { writeFileSync } from "fs";
import { createHash } from "crypto";
import { exigirManifesto, servir, abrirNavegador, novaPagina, carregar, hidratar, executarPassos, PRELUDIO, ENTRADA, WAIT_FOR } from "./comum.mjs";

const CARGAS = 3;
const PARALELO = 6;
const args = process.argv.slice(2);
const saidaJson = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

const manifesto = exigirManifesto();

/** Componentes do DS (nomes dos arquivos de components/ da base 3.7.0) — por tag ou classe br-*. */
const COMPONENTES = ["accordion", "avatar", "breadcrumb", "button", "card", "carousel", "checkbox", "cookiebar", "datetimepicker", "divider",
  "footer", "header", "input", "item", "list", "loading", "magicbutton", "menu", "message", "modal", "notification", "pagination", "radio",
  "scrim", "select", "signin", "skiplink", "step", "switch", "tab", "table", "tag", "textarea", "tooltip", "upload", "wizard"];

/** Tipos visíveis: componentes do DS e estruturas de página (adendo § B, regra 3). */
const TIPOS = `(() => {
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

const FOTO = `(() => {
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
  const sel = "button, a[href], [role=button], [role=menuitem], [role=tab], [aria-expanded], [aria-haspopup], [aria-controls], [data-toggle], [tabindex], .br-sign-in, .br-avatar, .br-tag, pnip-filter-panel input, pnip-filter-panel select, pnip-search-table-utils input";
  return todos().filter(e => e.matches(sel)).map(e => ({ chave: chave(e), tag: e.tagName.toLowerCase(), id: e.id || null,
    classe: (e.getAttribute("class") || "").trim() || null, sombra: !!(e.getRootNode() && e.getRootNode().host),
    hospedeiro: e.getRootNode() && e.getRootNode().host ? (e.getRootNode().host.getAttribute("icon") || e.getRootNode().host.getAttribute("label") || e.getRootNode().host.getAttribute("title") || null) : null,
    visivel: visivel(e), rotulo: (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").split(/[\\n\\t ]+/).join(" ").trim().slice(0, 40) }));
})()`;

const LOCALIZAR = alvo => `(() => {
${PRELUDIO}
  return todos().find(e => chave(e) === ${JSON.stringify(alvo)}) || null;
})()`;

const ACOES = `(() => {
${PRELUDIO}
  return [...new Set(todos().filter(e => visivel(e) && e.matches("button, a[href]")).map(e => {
    const h = e.getRootNode() && e.getRootNode().host;
    return (e.getAttribute("aria-label") || e.getAttribute("title") || (h && (h.getAttribute("label") || h.getAttribute("title"))) || e.textContent || "").split(/[\\n\\t ]+/).join(" ").trim().slice(0, 50) || ("<" + ((h && h.getAttribute("icon")) || "?") + ">");
  }))];
})()`;

async function arvoreAx(pagina) {
  const cdp = await pagina.context().newCDPSession(pagina);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const linhas = nodes.filter(n => !n.ignored).map(n => [n.role?.value, n.name?.value ?? "",
    (n.properties ?? []).filter(p => p.name !== "focused").map(p => `${p.name}=${JSON.stringify(p.value?.value)}`).sort().join(",")].join("|"));
  return { n: linhas.length, hash: createHash("sha256").update(linhas.join("\n")).digest("hex").slice(0, 16) };
}

const escritasDoMock = pagina => pagina.evaluate(() => Object.keys(window.__pnipMock?.atendidos?.() ?? {}).filter(k => !/^GET /.test(k)));

const { servidor, base } = await servir();
const navegador = await abrirNavegador();

/** Pool simples de tarefas concorrentes, cada uma em contexto próprio (carga nova). */
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

const registro = { entrada: ENTRADA, waitFor: WAIT_FOR, manifesto: { sha256: manifesto.manifestoSha, arquivos: manifesto.n }, carga: null, linhas: [], bases: [], resultados: [] };

try {
  // ── Fase 0: carga da entrada ──────────────────────────────────────────────────────────────────
  registro.carga = await comPagina(async ({ pagina, pedidos, erros, escritas, externos }) => ({
    url: pagina.url(), pedidos: pedidos.length, externos: externos().map(p => p.host + p.caminho), escritasRede: escritas().map(p => p.metodo + " " + p.caminho),
    escritasMock: await escritasDoMock(pagina), erros, tipos: await pagina.evaluate(TIPOS),
    linhasPorPagina: await pagina.locator("main tbody tr").count(),
    paginas: await pagina.locator("govbr-custom-pagination a.page").count(),
  }));

  // ── Fase 1: detalhe de cada linha da aba padrão ───────────────────────────────────────────────
  const tarefasLinhas = [];
  for (let p = 1; p <= registro.carga.paginas; p++) for (let r = 1; r <= registro.carga.linhasPorPagina; r++) tarefasLinhas.push({ p, r });
  registro.linhas = (await emParalelo(tarefasLinhas, ({ p, r }) => comPagina(async ({ pagina, escritas }) => {
    if (p > 1) {
      await pagina.click(`govbr-custom-pagination a.page:text-is("${p}")`);
      await pagina.waitForSelector(`govbr-custom-pagination a.page.active:text-is("${p}")`);
      await pagina.waitForTimeout(600);
    }
    const linha = pagina.locator("main tbody tr").nth(r - 1);
    if (!(await linha.count())) return null;
    const status = (await linha.locator(".br-tag, pnip-status-solicitacao-utils").first().innerText().catch(() => "")).trim();
    const olho = linha.locator('br-button[icon="eye"]');
    if (!(await olho.count())) return { p, r, status, olho: false };
    const antes = pagina.url();
    await olho.click();
    await pagina.waitForURL(u => u.href !== antes, { timeout: 10_000 });
    await pagina.waitForTimeout(1500); await hidratar(pagina);
    return { p, r, status, olho: true, path: new URL(pagina.url()).pathname, acoes: await pagina.evaluate(ACOES), escritas: [...escritas().map(x => x.metodo + " " + x.caminho), ...(await escritasDoMock(pagina))] };
  }))).filter(Boolean);

  // ── Fase 2: bases ─────────────────────────────────────────────────────────────────────────────
  const OLHO = r => `main tbody tr:nth-child(${r}) br-button[icon="eye"] button`;
  const DETALHE_WAIT = "pnip-propesc-detalhes-vistoria";
  const bases = [{ id: "lista", passos: [], origem: "entrada" }];
  const primeira = registro.linhas.find(l => l.olho);
  bases.push({ id: "detalhe@1", passos: [{ action: "navigate", selector: OLHO(primeira.r), waitFor: DETALHE_WAIT }], origem: `olho da 1ª linha (p.${primeira.p}, l.${primeira.r}) — ${primeira.status}`, linha: primeira });
  const vistas = new Set(primeira.acoes);
  for (const l of registro.linhas.filter(x => x.olho)) {
    const novas = l.acoes.filter(a => !vistas.has(a));
    if (!novas.length) continue;
    novas.forEach(a => vistas.add(a));
    const passos = l.p === 1 ? [{ action: "navigate", selector: OLHO(l.r), waitFor: DETALHE_WAIT }] : [{ action: "navigate", path: l.path, waitFor: DETALHE_WAIT }];
    bases.push({ id: `detalhe@${(l.p - 1) * registro.carga.linhasPorPagina + l.r}`, passos, origem: `1ª linha da aba padrão que oferece: ${novas.join(" · ")} (p.${l.p}, l.${l.r}) — ${l.status}`, linha: l });
  }

  // ── Fase 3: gatilhos × gestos × cargas, por base; rotas novas alcançadas por clique viram base ──
  const testadas = new Set();
  for (let bi = 0; bi < bases.length; bi++) {
    const b = bases[bi];
    const info = await comPagina(async ({ pagina }) => { await executarPassos(pagina, b.passos); return { gatilhos: await pagina.evaluate(GATILHOS), path: new URL(pagina.url()).pathname, tipos: await pagina.evaluate(TIPOS) }; });
    b.path = info.path; b.tipos = info.tipos; b.gatilhos = info.gatilhos.length;
    testadas.add(b.path.replace(/[0-9a-f-]{36}$/, ":uuid") + "|" + b.id);
    const tarefas = [];
    for (const g of info.gatilhos) for (const gesto of ["clique", "enter"]) for (let i = 0; i < CARGAS; i++) tarefas.push({ g, gesto, i });
    const brutos = await emParalelo(tarefas, ({ g, gesto }) => comPagina(async ({ pagina, pedidos, escritas }) => {
      await executarPassos(pagina, b.passos);
      const antes = await pagina.evaluate(FOTO);
      const axAntes = await arvoreAx(pagina);
      const escritasAntes = [...escritas().map(x => x.metodo + " " + x.caminho), ...(await escritasDoMock(pagina))];
      const nPedidos = pedidos.length;
      let erro = null;
      try {
        const el = (await pagina.evaluateHandle(LOCALIZAR(g.chave))).asElement();
        if (!el) throw new Error("gatilho não localizado");
        if (gesto === "clique") await el.click({ timeout: 2000 });
        else { await el.focus(); await pagina.keyboard.press("Enter"); }
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
    for (const g of info.gatilhos) for (const gesto of ["clique", "enter"]) {
      const cargas = brutos.filter((_, k) => tarefas[k].g === g && tarefas[k].gesto === gesto);
      const efeito = c => !c.erro && (c.novosVisiveis > 0 || c.expandidoVirou.length > 0 || !c.urlIgual);
      const navega = c => efeito(c) && new URL(b.path, "http://x").pathname !== c.pathDepois && !c.recarregou;
      const aditivo = c => c.sumiram === 0 && c.deixaramVisiveis === 0;
      const limpo = c => c.externosDepois.length === 0 && c.escritas.length === 0;
      const rep = cargas.filter(efeito).length;
      let veredito;
      if (rep === 0) veredito = "sem-efeito";
      else if (cargas.some(c => c.escritas?.length)) veredito = "escrita";
      else if (cargas.some(c => c.recarregou)) veredito = "recarga";
      else if (rep === CARGAS && cargas.every(navega) && cargas.every(limpo) && new Set(cargas.map(c => c.pathDepois)).size === 1) veredito = "navega";
      else if (rep === CARGAS && cargas.every(c => c.urlIgual && aditivo(c) && limpo(c))) veredito = "produz-estado";
      else if (rep < CARGAS) veredito = "efeito-parcial";
      else if (cargas.some(c => !aditivo(c))) veredito = "nao-aditivo";
      else veredito = "efeito-nao-estado";
      const c0 = cargas.find(efeito) ?? cargas[0];
      registro.resultados.push({ base: b.id, gatilho: g.chave, tag: g.tag, id: g.id, rotulo: g.rotulo || g.hospedeiro || "", visivel: g.visivel, gesto, veredito,
        repeticoes: `${rep}/${CARGAS}`, pathDepois: c0.pathDepois, tipos: c0.tipos, escritas: [...new Set(cargas.flatMap(c => c.escritas ?? []))],
        amostra: { erro: c0.erro, dom: c0.domMudou, ax: `${c0.axAntes}→${c0.axDepois}`, novosVisiveis: c0.novosVisiveis, sumiram: c0.sumiram, deixaramVisiveis: c0.deixaramVisiveis, expandido: c0.expandidoVirou } });
    }
    // Rotas novas da mesma árvore (vistorias/…), alcançadas por clique a partir desta base, viram base.
    for (const r of registro.resultados.filter(x => x.base === b.id && x.veredito === "navega" && x.gesto === "clique")) {
      if (!r.pathDepois.startsWith("/pnip/portal-mpa/vistorias/")) continue;
      const padrao = r.pathDepois.replace(/[0-9a-f-]{36}$/, ":uuid");
      if (bases.some(x => x.path && x.path.replace(/[0-9a-f-]{36}$/, ":uuid") === padrao && x.path === r.pathDepois) || bases.some(x => x.alvo === r.pathDepois)) continue;
      if (padrao.includes("agendar-vistoria")) continue; // o detalhe já é base pelas regras da fase 2
      const sel = r.gatilho.split(" >>> ").join(" ");
      bases.push({ id: `${padrao.split("/").slice(-2, -1)[0]}@${b.id}`, alvo: r.pathDepois, origem: `clique em ${r.rotulo || r.gatilho} na base ${b.id}`,
        passos: [...b.passos, { action: "navigate", selector: sel, waitFor: "main" }] });
    }
    registro.bases = bases.map(x => ({ id: x.id, origem: x.origem, passos: x.passos, path: x.path, gatilhos: x.gatilhos, tipos: x.tipos }));
    console.error(`base ${b.id}: ${info.gatilhos.length} gatilhos testados`);
  }
} finally {
  await navegador.close();
  servidor.close();
}

// ── Resumo ─────────────────────────────────────────────────────────────────────────────────────
const c = registro.carga;
console.log(`entrada: ${ENTRADA} → ${c.url.replace(/^http:\/\/[^/]+/, "")}`);
console.log(`manifesto: ${registro.manifesto.arquivos}/${registro.manifesto.arquivos} arquivos conferem (public e dist) · sha256 do manifesto ${registro.manifesto.sha256}`);
console.log(`carga: ${c.pedidos} pedidos · externos ${c.externos.length} · escritas (rede ${c.escritasRede.length}, mock ${c.escritasMock.length}) · erros ${c.erros.length} · ${c.linhasPorPagina} linhas × ${c.paginas} páginas`);
console.log(`\nfase 1 — detalhe de cada linha da aba padrão (${registro.linhas.length}):`);
for (const l of registro.linhas) console.log(`  p.${l.p} l.${String(l.r).padStart(2)} ${l.status.padEnd(22)} ${l.olho ? l.path.split("/").slice(-2).join("/") : "sem olho"} · escritas ${l.escritas?.length ?? 0} · ${l.acoes?.length ?? 0} ações`);
console.log(`\nbases testadas:`);
for (const b of registro.bases) console.log(`  ${b.id.padEnd(28)} ${b.path ?? "?"} · ${b.gatilhos ?? "?"} gatilhos · ${b.origem}\n    passos: ${JSON.stringify(b.passos)}\n    tipos: DS [${b.tipos?.componentes.join(" ")}] · estruturas [${b.tipos?.estruturas.join(" ")}]`);
const cont = {};
for (const r of registro.resultados) cont[r.veredito] = (cont[r.veredito] ?? 0) + 1;
console.log(`\n${registro.resultados.length} gatilho×gesto: ${Object.entries(cont).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`\ncom efeito (tudo que não é sem-efeito):`);
for (const r of registro.resultados.filter(x => x.veredito !== "sem-efeito")) {
  console.log(`  ${r.veredito.padEnd(17)} ${r.base.padEnd(14)} ${r.gesto.padEnd(6)} ${r.repeticoes} "${r.rotulo}" <${r.tag}${r.id ? "#" + r.id : ""}> ${r.gatilho.slice(-80)}` +
    ` · +vis ${r.amostra.novosVisiveis} −vis ${r.amostra.deixaramVisiveis} −dom ${r.amostra.sumiram} · ax ${r.amostra.ax}${r.escritas.length ? " · ESCRITA " + r.escritas.join(",") : ""}${r.pathDepois !== registro.bases.find(b => b.id === r.base)?.path ? " → " + r.pathDepois : ""}`);
}
if (saidaJson) writeFileSync(saidaJson, JSON.stringify(registro, null, 1));
