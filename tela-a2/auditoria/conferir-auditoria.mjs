/**
 * Conferência sem modelo: re-mede na página servida, de carga nova e headless, o predicado de CADA achado
 * de achados.json (e alguns conformes-chave) e diz N/N. Não espera os 300 s da recarga: confere a meta
 * refresh viva e a existência/coerência de medidas/observacao-360.json (recarga gravada com carimbo).
 * Uso: node tela-a2/auditoria/conferir-auditoria.mjs   (sai com código 1 se algum predicado falhar)
 */
import { readFileSync } from "fs";
import { join } from "path";
import { AQUI, SAIDA, MEDIDAS, ESTADOS, abrirNavegador, irPara } from "./comum.mjs";
import { UTIL } from "./util-navegador.mjs";

/** CONFERIR_ACHADOS=<arquivo> confere uma lista de achados de outra rodada (ex.: a 1ª auditoria) na página atual. */
const ARQ_ACHADOS = process.env.CONFERIR_ACHADOS || join(SAIDA, "achados.json");
const achados = JSON.parse(readFileSync(ARQ_ACHADOS, "utf8")).achados;
const E = Object.fromEntries(ESTADOS.map(e => [e.id, e]));
const curto = id => id.replace("govbr-3.7.0-", "");
const tab = async (p, sel, max = 45) => { await p.evaluate(() => { const m = document.createElement("span"); m.tabIndex = -1; document.body.prepend(m); m.focus(); m.remove(); }); for (let i = 0; i < max; i++) { await p.keyboard.press("Tab"); await p.waitForTimeout(70); if (await p.evaluate(s => document.activeElement?.matches(s), sel)) return true; } return false; };
const ax = async (p, sel) => { const c = await p.context().newCDPSession(p); await c.send("Accessibility.enable"); const { root } = await c.send("DOM.getDocument", { depth: -1 }); const { nodeId } = await c.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel }); const { node } = await c.send("DOM.describeNode", { nodeId }); const { nodes } = await c.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false }); await c.detach(); const x = nodes[0]; return { papel: x.role?.value, nome: x.name?.value ?? "", props: Object.fromEntries((x.properties || []).map(q => [q.name, q.value?.value])) }; };
const tooltipCentro = (g, t) => async p => { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), g); const b = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, g); await p.mouse.move(...b); await p.waitForTimeout(450);
  const d = await p.evaluate(t => { const tt = document.querySelector(t); const a = tt.querySelector(".arrow").getBoundingClientRect(), r = tt.getBoundingClientRect(); return Math.abs((a.x + a.width / 2) - (r.x + r.width / 2)); }, t); return [d > 4, `desvio da seta ${d.toFixed(1)} px`]; };
const pairavel = (g, t) => async p => { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), g); const b = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, g); await p.mouse.move(...b); await p.waitForTimeout(450);
  const v1 = await p.evaluate(t => window.__u.visivel(document.querySelector(t)), t); const c = await p.evaluate(t => { const r = document.querySelector(t).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, t);
  await p.mouse.move(...c, { steps: 5 }); await p.waitForTimeout(400); const v2 = await p.evaluate(t => window.__u.visivel(document.querySelector(t)), t); return [v1 && !v2, `hover gatilho ${v1}, ponteiro no balão ${v2}`]; };

/** predicados: [estado, função(p) → [violacaoConfirmada, detalhe]] por (regra curta | trecho do seletor) */
const PRED = [
  ["accessibility-global-6021746e010c", null, "S0", async p => { const c = await p.evaluate(() => document.querySelector("meta[http-equiv=refresh]")?.content); const o = JSON.parse(readFileSync(join(MEDIDAS, "observacao-360.json"), "utf8")); return [c === "300" && o.recargas >= 1, `meta refresh=${c}; recargas gravadas ${o.recargas} (${o.navegacoes.map(n => n.t_ms).join(", ")} ms)`]; }],
  ["accessibility-global-7bb1e5ca34ff", null, "S0", async p => { const o = JSON.parse(readFileSync(join(MEDIDAS, "observacao-recarga-estado.json"), "utf8")); const c = await p.evaluate(() => document.querySelector("meta[http-equiv=refresh]")?.content); return [c === "300" && o.antes.select && !o.depois.select && o.antes.abaAtiva !== o.depois.abaAtiva, `antes ${o.antes.abaAtiva}/${o.antes.select}/${o.antes.switchEmail} → depois ${o.depois.abaAtiva}/'${o.depois.select}'/${o.depois.switchEmail}`]; }],
  ["accessibility-global-19cbc02f51c6", null, "S0", async p => { const n = await p.evaluate(() => document.querySelectorAll("#msg-pendencia font, #msg-pendencia [align]").length); return [n === 2, `${n} elementos font/[align]`]; }],
  ["development-global-a4f97ebb50c5", null, "S0", async p => { const t = await (await fetch(p.url())).text(); const n = (t.match(/<(img|input)\b[^>]*\/>/g) || []).length; return [n > 0, `${n} elementos vazios com '/>'`]; }],
  ["accessibility-global-748eb01e1800", null, "S0", async p => { const n = await p.evaluate(() => document.querySelectorAll("noscript").length); return [n === 0, `${n} noscript`]; }],
  ["accessibility-global-7c91abad32ce", null, "S0", async p => { await tab(p, ".atalhos-pagina > a:nth-of-type(1)"); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(150); const r = await p.evaluate(() => [document.querySelector(".atalhos-pagina").getAttribute("role"), document.activeElement.textContent.trim().slice(0, 18)]); return [r[0] === "menubar" && r[1].startsWith("Ir para o conte"), `role=${r[0]}; foco após ArrowRight: ${r[1]}`]; }],
  ["accessibility-skiplink-fc59fbdac2c2", null, "S0", async p => { await p.mouse.move(20, 5); await p.waitForTimeout(250); const v = await p.evaluate(() => window.__u.visivel(document.querySelector(".atalhos-pagina > a"))); return [!v, `visível com ponteiro: ${v}`]; }],
  ["accessibility-global-742fd4c4f54b", null, "S0", async p => { const ok = await tab(p, ".trilha-servico [aria-current=page]"); return [ok, `span atual focável por Tab: ${ok}`]; }],
  ["component-breadcrumb-8c4ff87d861a", null, "S0", async p => { const w = await p.evaluate(() => getComputedStyle(document.querySelector(".trilha-servico [aria-current=page]")).fontWeight); return [w !== "600" && Number(w) < 600, `font-weight ${w}`]; }],
  ["accessibility-global-9751560f0ae6", null, "S0", async p => { const r = await p.evaluate(() => { const n = document.querySelector(".trilha-servico"); return [n.getAttribute("aria-label"), n.closest("[lang]").getAttribute("lang")]; }); return [r[0] === "Breadcrumbs" && r[1] === "pt-BR", `aria-label=${r[0]} lang herdado=${r[1]}`]; }],
  ["accessibility-global-a54fe3e9b8d7", null, "S0", async p => { const r = await p.evaluate(() => [...document.querySelectorAll(".trilha-servico a")].map(a => [a.getAttribute("href"), a.textContent.trim()])); return [r.length === 2 && r[0][0] === r[1][0] && r[0][1] !== r[1][1], JSON.stringify(r)]; }],
  ["WCAG-2.1-2.5.3", "tip-protocolo", "S0", async p => { const a = await ax(p, "#tip-protocolo-gatilho"); return [!a.nome.includes("Ajuda sobre o NUP"), `nome '${a.nome}'`]; }],
  ["WCAG-2.1-2.5.3", "tip-prazo", "S0", async p => { const a = await ax(p, "#tip-prazo-gatilho"); return [!a.nome.includes("Ajuda sobre o prazo"), `nome '${a.nome}'`]; }],
  ["component-button-81f5e26ec0ef", "tip-protocolo", "S0", async p => { const r = await p.evaluate(() => { const b = document.querySelector("#tip-protocolo-gatilho"), s = b.querySelector(".rotulo-botao"); return [b.getBoundingClientRect().width, s.getBoundingClientRect().width, window.__u.visivel(s)]; }); return [r[2] && r[1] > r[0], `botão ${r[0]} px, rótulo visível ${r[1].toFixed(0)} px`]; }],
  ["component-button-81f5e26ec0ef", "tip-prazo", "S0", async p => { const r = await p.evaluate(() => { const b = document.querySelector("#tip-prazo-gatilho"), s = b.querySelector(".rotulo-botao"); return [b.getBoundingClientRect().width, s.getBoundingClientRect().width, window.__u.visivel(s)]; }); return [r[2] && r[1] > r[0], `botão ${r[0]} px, rótulo visível ${r[1].toFixed(0)} px`]; }],
  ["accessibility-global-24ee65d5b46b", null, "S0", async p => { await p.setViewportSize({ width: 640, height: 450 }); await p.waitForTimeout(500); const r = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); return [r[0] > r[1], `scrollWidth ${r[0]} / clientWidth ${r[1]}`]; }],
  ["component-tooltip-187fe90aeefd", "#tip-protocolo", "S0", tooltipCentro("#tip-protocolo-gatilho", "#tip-protocolo")],
  ["component-tooltip-187fe90aeefd", "#msg-pendencia", "S0", tooltipCentro("#msg-pendencia .close button", "#msg-pendencia .close .br-tooltip")],
  ["WCAG-2.1-1.4.13", "#tip-protocolo-gatilho", "S0", pairavel("#tip-protocolo-gatilho", "#tip-protocolo")],
  ["WCAG-2.1-1.4.13", "#tip-prazo-gatilho", "S0", pairavel("#tip-prazo-gatilho", "#tip-prazo")],
  ["WCAG-2.1-1.4.13", "#msg-pendencia", "S0", pairavel("#msg-pendencia .close button", "#msg-pendencia .close .br-tooltip")],
  ["accessibility-global-5817ddd685a6", "acc-duvidas", "S0", async p => { await p.click("#acc-duvidas .item:nth-of-type(1) button.header"); await p.waitForTimeout(400); const v = await p.evaluate(() => window.__u.visivel(document.querySelector("#acc-duvidas-1"))); const a = await ax(p, "#acc-duvidas .item:nth-of-type(1) button.header"); return [v && a.props.expanded === false, `conteúdo visível ${v}, AX expanded ${a.props.expanded}`]; }],
  ["component-step-518405a28697", null, "S0", async p => { const v = await p.evaluate(() => getComputedStyle(document.querySelector("#stp-andamento .etapa-decisao"), "::before").visibility); return [v === "hidden", `::before visibility ${v}`]; }],
  ["WCAG-2.1-4.1.2", "role=combobox", "S1", async p => { const a = await ax(p, "#sel-tipo-documento > .br-input"); return [a.papel === "combobox" && a.nome === "", `AX ${a.papel} '${a.nome}'`]; }],
  ["WCAG-2.1-4.1.2", "upload-button", "S1", async p => { const r = await p.evaluate(() => { const b = document.querySelector("#upl-documento .upload-button"); return [b.getAttribute("aria-hidden"), b.tabIndex]; }); return [r[0] === "true" && r[1] >= 0, `aria-hidden=${r[0]} tabIndex=${r[1]}`]; }],
  ["accessibility-global-25887e6e360f", null, "S1", async p => { const r = await p.evaluate(() => [getComputedStyle(document.querySelector("#arquivo-documento")).display, document.querySelector("#upl-documento .upload-button").labels?.length ?? 0]); return [r[0] === "none", `input display ${r[0]}; etiquetas do botão ${r[1]}`]; }],
  ["accessibility-switch-364149c5aea4", "#aviso-email", "S1", async p => { await p.click("label[for=aviso-email]"); await p.waitForTimeout(300); const r = await p.evaluate(() => [document.querySelector("#aviso-email").checked, document.querySelector("#aviso-email").getAttribute("aria-checked")]); return [r[0] && r[1] !== "true", `checked ${r[0]} aria-checked ${r[1]}`]; }],
  ["accessibility-switch-364149c5aea4", "#aviso-sms", "S1", async p => { await p.click("label[for=aviso-sms]"); await p.waitForTimeout(300); const r = await p.evaluate(() => [document.querySelector("#aviso-sms").checked, document.querySelector("#aviso-sms").getAttribute("aria-checked")]); return [r[0] && r[1] !== "true", `checked ${r[0]} aria-checked ${r[1]}`]; }],
  ["accessibility-global-4d5b05a1c29c", null, "S1", async p => { const n = await p.evaluate(() => document.querySelectorAll("#fs-avisos > legend").length); return [n === 0, `${n} legend`]; }],
  ["accessibility-global-271582e4fbe8", null, "S2", async p => { const r = await p.evaluate(() => { const c = document.querySelector("#sel-tipo-documento").closest(".campo"); return [document.querySelector("#sel-tipo-documento .br-input").classList.contains("danger"), c.querySelectorAll(".feedback, [role=alert]").length, document.querySelector("#tipo-documento").getAttribute("aria-invalid")]; }); return [r[0] && r[1] === 0 && !r[2], `danger ${r[0]}; textos de erro ${r[1]}; aria-invalid ${r[2]}`]; }],
  ["foundation-global-21fb08664799", null, "S0", async p => { const f = await p.evaluate(() => getComputedStyle(document.querySelector("#titulo-duvidas")).fontSize); return [f === "16px", `font-size ${f}`]; }],
  ["pattern-global-f4a0aa1ba9c3", ".acao-enviar", "S1", async p => { const t = await p.evaluate(() => document.querySelector(".acao-enviar").textContent.trim()); return [t === "Enviar documento", t]; }],
  ["pattern-global-f4a0aa1ba9c3", ".acao-voltar", "S0", async p => { const t = await p.evaluate(() => document.querySelector(".acao-voltar").textContent.trim()); return [t === "Voltar para meus requerimentos", t]; }],
  ["accessibility-global-37aeaff46667", null, "S1", async p => { const r = await p.evaluate(() => { const t = document.body.innerText; const i = t.search(/\bSMS\b/); return [i >= 0, document.querySelectorAll("abbr").length, i >= 0 ? t.slice(i, i + 60).replace(/\s+/g, " ") : ""]; }); const explicada = /^SMS\s*\(/.test(r[2]); return [r[0] && r[1] === 0 && !explicada, `1ª ocorrência: "${r[2]}" · abbr ${r[1]} · expansão logo após: ${explicada}`]; }],
];

const navegador = await abrirNavegador();
let ok = 0, falhas = 0, semPredicado = 0;
try {
  for (const a of achados) {
    const pr = PRED.find(([r, trecho]) => curto(a.regra.id) === r && (!trecho || a.seletor.includes(trecho)));
    if (!pr) { console.log(`?  ${a.id} ${curto(a.regra.id)} — sem predicado`); semPredicado++; continue; }
    const np = await irPara(navegador, E[pr[2]]);
    await np.pagina.evaluate(UTIL);
    let res; try { res = await pr[3](np.pagina); } catch (e) { res = [false, "erro: " + e.message.slice(0, 120)]; }
    await np.contexto.close();
    if (res[0]) ok++; else falhas++;
    console.log(`${res[0] ? "ok" : "XX"} ${a.id} ${pr[2]} ${curto(a.regra.id)} — ${res[1]}`);
  }
} finally { await navegador.close(); }
console.log(`\n${ok}/${achados.length} achados re-medidos e confirmados · ${falhas} falhas · ${semPredicado} sem predicado`);
process.exit(falhas || semPredicado ? 1 : 0);
