// Proveniência de propriedades customizadas (variáveis CSS) que resolvem valores contestados: em que seletor cada
// variável é definida no elemento ou em seus ancestrais (CDP CSS.getMatchedStylesForNode, matched + inherited).
import { abrirNavegador, irPara, ESTADOS, gravar } from "./comum.mjs";
const nav = await abrirNavegador();
const np = await irPara(nav, ESTADOS[1]); const p = np.pagina;
const c = await p.context().newCDPSession(p); await c.send("DOM.enable"); await c.send("CSS.enable");
const { root } = await c.send("DOM.getDocument", { depth: -1 });
async function defs(sel, nomes) {
  const { nodeId } = await c.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  const r = await c.send("CSS.getMatchedStylesForNode", { nodeId }); const out = {};
  const todas = [...(r.matchedCSSRules || []).map(m => ({ nivel: 0, m })), ...(r.inherited || []).flatMap((h, i) => (h.matchedCSSRules || []).map(m => ({ nivel: i + 1, m })))];
  for (const n of nomes) out[n] = todas.flatMap(({ nivel, m }) => m.rule.style.cssProperties.filter(d => d.name === n && d.value).map(d => ({ nivelAncestral: nivel, seletor: m.rule.selectorList.text, valor: d.value }))).slice(0, 6);
  return out;
}
const out = {
  rotuloOpcao: await defs("#sel-continente .br-list .br-item:nth-of-type(1) label", ["--text-color", "--color"]),
  msgErro: await defs("#msg-erro .content", ["--message-background", "--message-text", "--background", "--color"]),
  msgErroRaiz: await defs("#msg-erro", ["--message-background", "--message-text", "--feedback-background"]),
};
const vals = await p.evaluate(() => ({ textColorRotulo: getComputedStyle(document.querySelector("#sel-continente .br-list .br-item label")).getPropertyValue("--text-color"), msgBg: getComputedStyle(document.querySelector("#msg-erro")).getPropertyValue("--message-background"), msgOrientBg: getComputedStyle(document.querySelector("#msg-orientacao")).getPropertyValue("--message-background"), danger: getComputedStyle(document.documentElement).getPropertyValue("--danger"), dangerAlt: getComputedStyle(document.documentElement).getPropertyValue("--danger-alternative") }));
gravar("interacoes/proveniencia-variaveis.json", { ...out, valores: vals });
console.log(JSON.stringify({ ...out, valores: vals }, null, 1));
await c.detach(); await nav.close();
