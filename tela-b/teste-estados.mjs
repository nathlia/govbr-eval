/**
 * Teste de estados da tela B (tela-b/metodo-auditoria.md § 2) — sem modelo e sem oráculo.
 *
 * 1. carrega nas condições do § 1 e espera a hidratação (whenDefined de cada br-* + shadow root do
 *    <br-header> não vazio; seletor de espera = comum.mjs › WAIT_FOR);
 * 2. enumera mecanicamente os gatilhos candidatos no light DOM e em toda shadow root aberta;
 * 3. para cada gatilho e cada gesto (clique real, Enter com foco), em carga nova: fotografa DOM
 *    serializado com shadow roots, árvore de acessibilidade (CDP Accessibility.getFullAXTree) e URL;
 *    aciona; fotografa de novo;
 * 4. produz estado sse: elemento passa a visível ou aria-expanded vira, URL igual, nenhum pedido a
 *    host externo depois do gesto, efeito 3/3 cargas novas, e mudança aditiva.
 *
 * Uso: node tela-b/teste-estados.mjs [--json <arquivo>]
 */
import { writeFileSync } from "fs";
import { createHash } from "crypto";
import { chromium, servir, novaPagina, carregar, conferirHashes, PRELUDIO } from "./comum.mjs";

const CARGAS = 3;
const saidaJson = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;

const hashes = conferirHashes();
if (hashes.some(h => !h.ok)) {
  console.error("hash divergente — a medida é recusada:\n" + hashes.filter(h => !h.ok).map(h => `  ${h.arquivo}: ${h.obtido}`).join("\n"));
  process.exit(2);
}

const FOTO = `() => {
${PRELUDIO}
  const serial = raiz => Array.from(raiz.childNodes).map(n => {
    if (n.nodeType === 3) return n.textContent;
    if (n.nodeType !== 1) return "";
    const attrs = Array.from(n.attributes).map(a => a.name + "=" + JSON.stringify(a.value)).sort().join(" ");
    return "<" + n.tagName.toLowerCase() + " " + attrs + ">" + (n.shadowRoot ? "#shadow(" + serial(n.shadowRoot) + ")" : "") + serial(n) + "</>";
  }).join("");
  const els = todos();
  return {
    dom: serial(document),
    visiveis: els.filter(visivel).map(chave),
    presentes: els.map(chave),
    expandidos: els.filter(e => e.hasAttribute("aria-expanded")).map(e => chave(e) + "=" + e.getAttribute("aria-expanded")),
    url: location.href,
  };
}`;

const GATILHOS = `() => {
${PRELUDIO}
  const sel = "button, a[href], [role=button], [role=menuitem], [role=tab], [aria-expanded], [aria-haspopup], [aria-controls], [data-toggle], [tabindex], .br-sign-in, .br-avatar";
  return todos().filter(e => e.matches(sel)).map(e => ({ chave: chave(e), tag: e.tagName.toLowerCase(), id: e.id || null,
    classe: typeof e.className === "string" ? e.className : null, sombra: !!(e.getRootNode() && e.getRootNode().host),
    visivel: visivel(e), rotulo: (e.getAttribute("aria-label") || e.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40) }));
}`;

const LOCALIZAR = `(alvo) => {
${PRELUDIO}
  return todos().find(e => chave(e) === alvo) || null;
}`;

async function arvoreAx(pagina) {
  const cdp = await pagina.context().newCDPSession(pagina);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  // `focused` muda com qualquer clique e não é critério do § 2.4; fica fora do resumo comparado.
  const linhas = nodes.filter(n => !n.ignored).map(n => [n.role?.value, n.name?.value ?? "",
    (n.properties ?? []).filter(p => p.name !== "focused").map(p => `${p.name}=${JSON.stringify(p.value?.value)}`).sort().join(",")].join("|"));
  return { n: linhas.length, hash: createHash("sha256").update(linhas.join("\n")).digest("hex").slice(0, 16), linhas };
}

const { servidor, base } = await servir();
const navegador = await chromium.launch();
const registro = { gatilhos: [], resultados: [] };

try {
  // Enumeração, numa carga própria.
  {
    const { contexto, pagina, pedidos } = await novaPagina(navegador);
    await carregar(pagina, base);
    registro.gatilhos = await pagina.evaluate(`(${GATILHOS})()`);
    registro.pedidosCarga = pedidos.map(p => `${p.abortado ? "ABORTADO " : p.externo ? "EXTERNO-NAO-DECLARADO " : ""}${p.host}${p.caminho}`);
    await contexto.close();
  }

  for (const g of registro.gatilhos) {
    for (const gesto of ["clique", "enter"]) {
      const cargas = [];
      for (let i = 0; i < CARGAS; i++) {
        const { contexto, pagina, pedidos } = await novaPagina(navegador);
        await carregar(pagina, base);
        const antes = await pagina.evaluate(`(${FOTO})()`);
        const axAntes = await arvoreAx(pagina);
        const nPedidos = pedidos.length;
        const alvo = await pagina.evaluateHandle(`(${LOCALIZAR})(${JSON.stringify(g.chave)})`);
        let erro = null;
        try {
          const el = alvo.asElement();
          if (!el) throw new Error("gatilho não localizado");
          if (gesto === "clique") await el.click({ timeout: 2000 });
          else { await el.focus(); await pagina.keyboard.press("Enter"); }
          await pagina.waitForTimeout(400);
        } catch (e) { erro = String(e.message || e).split("\n")[0]; }
        const depois = await pagina.evaluate(`(${FOTO})()`);
        const axDepois = await arvoreAx(pagina);
        const novosVisiveis = depois.visiveis.filter(k => !antes.visiveis.includes(k));
        const sumiram = antes.presentes.filter(k => !depois.presentes.includes(k));
        const deixaramVisiveis = antes.visiveis.filter(k => !depois.visiveis.includes(k));
        const expandidoVirou = depois.expandidos.filter(x => !antes.expandidos.includes(x));
        const externosDepois = pedidos.slice(nPedidos).filter(p => p.externo);
        cargas.push({
          erro, domMudou: antes.dom !== depois.dom, axMudou: axAntes.hash !== axDepois.hash,
          axAntes: axAntes.n, axDepois: axDepois.n,
          novosVisiveis, expandidoVirou, sumiram, deixaramVisiveis,
          urlIgual: antes.url === depois.url, externosDepois: externosDepois.map(p => p.host + p.caminho),
        });
        await contexto.close();
      }
      const efeito = c => !c.erro && (c.novosVisiveis.length > 0 || c.expandidoVirou.length > 0);
      const valido = c => efeito(c) && c.urlIgual && c.externosDepois.length === 0 && c.sumiram.length === 0 && c.deixaramVisiveis.length === 0;
      const repeticoes = cargas.filter(efeito).length;
      const produz = cargas.every(valido);
      const veredito = produz ? "produz-estado" : repeticoes === 0 ? "sem-efeito" : "efeito-nao-estado";
      registro.resultados.push({ gatilho: g.chave, gesto, veredito, repeticoes: `${repeticoes}/${CARGAS}`, cargas });
    }
  }
} finally {
  await navegador.close();
  servidor.close();
}

console.log(`hashes: ${hashes.length}/${hashes.length} conferem`);
console.log(`pedidos na carga: ${registro.pedidosCarga.join(" · ")}`);
console.log(`\n${registro.gatilhos.length} gatilho(s) candidato(s):`);
for (const g of registro.gatilhos) console.log(`  ${g.chave}  <${g.tag}${g.id ? "#" + g.id : ""}> ${g.sombra ? "[shadow] " : ""}${g.visivel ? "visível" : "NÃO renderizado"} "${g.rotulo}"`);
console.log("\nresultado por gatilho × gesto:");
for (const r of registro.resultados) {
  const c = r.cargas[0];
  console.log(`  ${r.veredito.padEnd(18)} ${r.gesto.padEnd(7)} ${r.repeticoes} ${r.gatilho}` +
    `${c.erro ? ` — erro: ${c.erro}` : ""} · dom ${c.domMudou ? "mudou" : "igual"} · ax ${c.axAntes}→${c.axDepois}${c.axMudou ? " (mudou)" : ""}` +
    ` · +visíveis ${c.novosVisiveis.length} · aria-expanded ${c.expandidoVirou.join(",") || "—"} · url ${c.urlIgual ? "igual" : "MUDOU"} · externos ${c.externosDepois.length}`);
}
const estados = registro.resultados.filter(r => r.veredito === "produz-estado");
console.log(`\nveredito: ${estados.length === 0 ? "nenhum gatilho produz estado → tela de UM estado (inicial, afterStep 0, setup vazio)" : `${estados.length} gatilho×gesto produz(em) estado`}`);
if (saidaJson) writeFileSync(saidaJson, JSON.stringify(registro, null, 2));
