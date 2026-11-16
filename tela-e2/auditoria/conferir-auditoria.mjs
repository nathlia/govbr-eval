/**
 * Conferência independente: (1) re-mede, de carga limpa e headless, o predicado de CADA achado (por instância+chave)
 * no(s) estado(s) em que foi registrado; (2) confere que cada achado tem medidas/<id>.json; (3) confere que toda
 * citação (achados, conformes, incertos) existe literalmente no arquivo do corpus (normalizando markdown e espaços).
 * Uso: node conferir-auditoria.mjs   (código de saída 1 se algo falhar). Grava medidas/conferencia.json
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { SAIDA, MEDIDAS, CORPUS, ESTADOS, abrirNavegador, irPara, tabAte, gravar } from "./comum.mjs";

const E = Object.fromEntries(ESTADOS.map(e => [e.id, e]));
const achados = JSON.parse(readFileSync(join(SAIDA, "achados.json"), "utf8")).achados;
const conformes = JSON.parse(readFileSync(join(SAIDA, "conformes.json"), "utf8")).conformes;
const incertos = JSON.parse(readFileSync(join(SAIDA, "incertos.json"), "utf8")).incertos;

const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const razao = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const PRED = {
  "btn-limpar|posicao-enfase-primaria-a-direita": async p => { const r = await p.evaluate(() => ["btn-cancelar", "btn-limpar", "btn-salvar"].map(id => [id, document.getElementById(id).getBoundingClientRect().right])); const m = Object.fromEntries(r); return [m["btn-salvar"] < m["btn-limpar"], `borda direita: ${JSON.stringify(m)}`]; },
  "btn-limpar|ordem-tab-igual-ordem-visual": async p => { const seq = []; await p.evaluate(() => document.activeElement?.blur()); for (let i = 0; i < 40 && seq.length < 3; i++) { await p.keyboard.press("Tab"); const id = await p.evaluate(() => document.activeElement.id); if (/^btn-(cancelar|limpar|salvar)$/.test(id)) seq.push(id); } const vis = await p.evaluate(() => ["btn-cancelar", "btn-limpar", "btn-salvar"].sort((a, b) => document.getElementById(a).getBoundingClientRect().x - document.getElementById(b).getBoundingClientRect().x)); return [seq.join() !== vis.join(), `Tab ${seq.join(" → ")} | visual ${vis.join(" → ")}`]; },
  "btn-ajuda|circular-icone-obrigatorio": async p => { await p.evaluate(() => document.querySelector("#btn-ajuda").scrollIntoView({ block: "center" })); await p.mouse.move(1270, 890); await p.waitForTimeout(150); const b = await p.evaluate(() => { const r = document.querySelector("#btn-ajuda").getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); const png = await p.screenshot({ clip: b }); const n = await p.evaluate(async b64 => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode(); const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d"); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let k = 0; for (let j = 0; j < d.length; j += 4) if (d[j] + d[j + 1] + d[j + 2] < 700) k++; return k; }, png.toString("base64")); const filhos = await p.evaluate(() => [...document.querySelectorAll("#btn-ajuda i, #btn-ajuda svg, #btn-ajuda img")].length); return [n === 0 && filhos === 0, `pixels não brancos ${n}; ícones-filho ${filhos}`]; },
  "inp-nome-pais|usuario-insere-informacao-teclado": async p => { const ro = await p.evaluate(() => document.querySelector("#nome-pais").readOnly); await tabAte(p, "#nome-pais"); await p.keyboard.type("Peru"); const v = await p.evaluate(() => document.querySelector("#nome-pais").value); return [ro && v === "", `readonly ${ro}; digitado após Tab: '${v}'`]; },
  "inp-nome-pais|funcao-script-por-teclado": async p => { await tabAte(p, "#nome-pais"); const aposTab = await p.evaluate(() => document.querySelector("#nome-pais").readOnly); await p.click("#nome-pais"); const aposClique = await p.evaluate(() => document.querySelector("#nome-pais").readOnly); return [aposTab && !aposClique, `readonly após Tab ${aposTab}; após clique ${aposClique}`]; },
  "inp-codigo|familia-tipografica": async p => { const f = await p.evaluate(() => ["#codigo-pais", "#inp-codigo label", "#codigo-pais-apoio"].map(s => getComputedStyle(document.querySelector(s)).fontFamily)); return [f.every(x => !/Rawline/.test(x)), f.join(" | ")]; },
  "inp-codigo|texto-auxiliar-espec": async p => { const m = await p.evaluate(() => getComputedStyle(document.querySelector("#codigo-pais-apoio")).marginTop); return [m !== "8px", `margin-top ${m}`]; },
  "sel-continente|contraste-rotulos-opcoes": async p => { const r = await p.evaluate(() => [...document.querySelectorAll("#sel-continente .br-list .br-item label")].map(l => [getComputedStyle(l).color, getComputedStyle(l.closest(".br-item")).backgroundColor, window.__u.visivel(l)])); const rz = r.filter(x => x[2]).map(x => razao(x[0], x[1])); return [rz.length > 0 && rz.every(x => x < 4.5), `razões ${rz.map(x => x.toFixed(2)).join(", ")}`]; },
  "sel-continente|cor-fora-da-paleta": async p => { const c = await p.evaluate(() => getComputedStyle(document.querySelector("#sel-continente .br-list .br-item label")).color); return [c === "rgb(170, 170, 170)", `cor ${c} (#aaaaaa não está em cores.md)`]; },
  "msg-orientacao|texto-curto-claro-objetivo": async p => { const t = await p.evaluate(() => document.querySelector("#msg-orientacao .message-body").textContent); const j = ["commit", "cache", "endpoint", "persistidos", "renderizada"].filter(w => t.includes(w)); return [j.length >= 3, `termos: ${j.join(", ")}`]; },
  "msg-orientacao|leitura-ensino-fundamental": async p => { const t = await p.evaluate(() => document.querySelector("#msg-orientacao .message-body").textContent); const j = ["commit", "cache", "endpoint"].filter(w => t.includes(w)); const abbr = await p.evaluate(() => document.querySelectorAll("#msg-orientacao abbr, #msg-orientacao dfn").length); return [j.length >= 3 && abbr === 0, `termos ${j.join(", ")}; abbr/dfn ${abbr}`]; },
  "msg-erro|cor-semantica-erro": async p => { const c = await p.evaluate(() => getComputedStyle(document.querySelector("#msg-erro")).backgroundColor); return [c !== "rgb(253, 224, 219)", `fundo ${c}`]; },
  "msg-erro|icone-de-confirmacao-em-erro": async p => { const v = await p.evaluate(() => { const i = document.querySelector("#msg-erro .fa-check"); return i ? window.__u.visivel(i) : false; }); return [v, `fa-check visível: ${v}`]; },
};

const resultado = { achados: [], citacoes: { total: 0, faltando: [] } };
let falhas = 0;
const nav = await abrirNavegador();
for (const a of achados) {
  const k = `${a.instancia}|${a.chave}`;
  const pred = PRED[k];
  const arq = existsSync(join(MEDIDAS, `${a.id}.json`));
  for (const s of a.estados) {
    let ok = false, det = "sem predicado";
    if (pred) { const np = await irPara(nav, E[s]); try { [ok, det] = await pred(np.pagina); } catch (e) { det = "erro " + e.message.slice(0, 120); } await np.contexto.close(); }
    resultado.achados.push({ id: a.id, estado: s, reproduziu: ok, detalhe: det, medidaArquivo: arq });
    if (!ok || !arq) falhas++;
    console.log(`${a.id} ${s} ${ok ? "OK " : "FALHOU"} ${det}`);
  }
}
await nav.close();

const norm = t => t.normalize("NFC").replace(/[*`|_\\]/g, "").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
const cache = {};
for (const d of [...achados, ...conformes, ...incertos]) for (const c of [...d.clausulas, ...(d.tambem || [])]) {
  resultado.citacoes.total++;
  cache[c.arquivo] ??= norm(readFileSync(join(CORPUS, c.arquivo), "utf8"));
  if (!cache[c.arquivo].includes(norm(c.citacao))) { resultado.citacoes.faltando.push({ id: d.id, arquivo: c.arquivo, citacao: c.citacao }); falhas++; }
}
console.log(`citações: ${resultado.citacoes.total - resultado.citacoes.faltando.length}/${resultado.citacoes.total} encontradas`);
for (const f of resultado.citacoes.faltando) console.log("  FALTA", f.id, f.arquivo, f.citacao.slice(0, 90));
const n = resultado.achados.length, okN = resultado.achados.filter(x => x.reproduziu && x.medidaArquivo).length;
console.log(`achados × estados reproduzidos: ${okN}/${n}`);
resultado.resumo = { achadosEstados: n, reproduzidos: okN, citacoesTotal: resultado.citacoes.total, citacoesFaltando: resultado.citacoes.faltando.length };
gravar("conferencia.json", resultado);
process.exit(falhas ? 1 : 0);
