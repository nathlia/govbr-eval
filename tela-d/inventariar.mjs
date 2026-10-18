/**
 * Inventário da tela D, por parada (método da tela B § 3.1; adendo da D § F) — fato de DOM, sem modelo
 * e sem detector. As medidas são EXATAMENTE as da tela B: MEDIR, arvoreAx e ordemTab vêm de
 * tela-b/vistorias/inventario.mjs (congelado com a referência da B, D-61). Para cada parada de
 * tela-d/sequencia.mjs, em carga nova e pelo mesmo setup: todo elemento do light DOM e das shadow roots
 * abertas, papel e nome acessíveis (CDP), estruturas de página, cores e tipografia computadas, contraste
 * pela fórmula da WCAG sobre cor computada, truncamento, rolagem horizontal e a ordem de Tab real.
 *
 * NOME DESTE ARQUIVO: não pode terminar em "inventario.mjs" — o módulo da B roda o próprio main (e
 * regrava tela-b/vistorias/inventario.json) quando o script chamado termina assim.
 *
 * Uso: node tela-d/inventariar.mjs --candidato [--headed]  → tela-d/inventario.json
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { MEDIR, arvoreAx, ordemTab } from "../tela-b/vistorias/inventario.mjs";
import { exigirBytes, servir, abrirNavegador, novaPagina, carregar, executarPassos, registroDoMock, RAIZ_EVAL } from "./comum.mjs";
import { SETUP, STATES } from "./sequencia.mjs";

if (process.argv[1].endsWith("inventario.mjs")) throw new Error("renomeie: ver o comentário do topo");
const bytes = exigirBytes();
const { servidor, base } = await servir();
const navegador = await abrirNavegador();
const saida = { bytes, medidoEm: new Date().toISOString(), setup: SETUP, states: STATES, estados: {} };
try {
  for (const st of STATES) {
    const { contexto, pagina, escritas, externos } = await novaPagina(navegador);
    await carregar(pagina, base);
    await executarPassos(pagina, SETUP.slice(0, st.afterStep));
    const inv = await pagina.evaluate(MEDIR);
    inv.marcos = await arvoreAx(contexto, pagina, inv.elementos);
    inv.ordemTab = await ordemTab(pagina);
    inv.escritas = escritas().map(p => p.metodo + " " + p.caminho);
    inv.externos = externos().map(p => p.host + p.caminho);
    inv.mock = await registroDoMock(pagina);
    const componentes = {};
    for (const el of inv.elementos) {
      const nomes = [...el.classes.filter(c => c.startsWith("br-")).map(c => "." + c), ...(el.tag.startsWith("br-") ? [`<${el.tag}>`] : [])];
      for (const n of nomes) (componentes[n] = componentes[n] || { total: 0, visiveis: 0 }), componentes[n].total++, el.visivel && componentes[n].visiveis++;
    }
    inv.componentes = componentes;
    saida.estados[st.id] = inv;
    const vis = inv.elementos.filter(e => e.visivel).length;
    console.log(`${st.id} (${inv.path}): ${inv.elementos.length} elementos (${inv.elementos.filter(e => e.sombra).length} em shadow), ${vis} visíveis · ` +
      `focáveis ${inv.focaveis.length} · h: ${inv.cabecalhos.filter(h => h.visivel).map(h => "h" + h.nivel).join(" ")} · marcos: ${inv.marcos.map(m => m.papel).join(",")} · ` +
      `campos ${inv.campos.filter(c => c.visivel).length} · botões ${inv.botoes.filter(b => b.visivel).length} · links ${inv.links.filter(l => l.visivel).length} · imagens ${inv.imagens.length} · ` +
      `diálogos ${inv.dialogos.filter(d => d.visivel).length} · tabelas ${inv.tabelas.length} · Tab ${inv.ordemTab.length} paradas · textos com contraste medido ${inv.contraste.length} (não resolvidos ${inv.contraste.filter(c => c.razao === null).length}) · ` +
      `classes/tags br-* ${Object.keys(componentes).length} · escritas ${inv.escritas.length} · externos ${inv.externos.length} · não mockados ${inv.mock.naoMockados.length}`);
    await contexto.close();
  }
} finally {
  await navegador.close();
  servidor.close();
}
writeFileSync(join(RAIZ_EVAL, "tela-d/inventario.json"), JSON.stringify(saida, null, 1));
console.log("inventário gravado em tela-d/inventario.json");
