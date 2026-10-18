/**
 * Escolha gulosa dos estados da tela D (adendo tela-d/metodo-auditoria-adendo-processos.md
 * § B, regras 4–7) — lê SÓ a saída do teste de estados (tela-d/estados.json) e nunca olha para
 * defeito: a pontuação é cobertura de TIPOS (componente do DS / estrutura de página).
 *
 * Um segmento só. Candidata = `produz-estado` (3/3, aditiva, sem escrita, sem saída, mesmo endereço).
 * Gatilhos da mesma família (mesma chave a menos do índice de irmão) são um só candidato: o primeiro
 * no documento. Ordem: mais componentes do DS novos → mais estruturas novas → menos passos → ordem do
 * documento. Diálogo (role=dialog|alertdialog, aria-modal, ou componente modal/scrim) vai por último e
 * só entra se trouxer componente do DS novo (regra 5 do adendo da B, literal: um SweetAlert2 sem
 * componente do DS não vira parada). Teto: 4 paradas.
 * A cadeia escolhida ainda tem de ser re-medida inteira (tela-d/conferir-paradas.mjs).
 *
 * Uso: node tela-d/selecionar-estados.mjs [--json tela-d/selecao.json]
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(readFileSync(join(AQUI, "estados.json"), "utf8"));
const TETO = 4;
const ehDialogo = t => t.estruturas.includes("dialogo") || t.componentes.includes("modal") || t.componentes.includes("scrim");
const familia = g => g.replace(/:nth-of-type\(\d+\)/g, ":nth-of-type(k)");
const PASSOS = { clique: 1, enter: 1, saida: 1 };

const inicial = R.carga.tipos;
const candidatas = [], fora = [];
const vistas = new Set();
R.resultados.forEach((r, ordem) => {
  if (r.veredito === "sem-efeito") return;
  const rot = `${r.gesto} "${r.rotulo}" (${r.gatilho.slice(-60)})`;
  if (r.veredito !== "produz-estado") {
    fora.push({ vista: rot, motivo: { escrita: "dispara escrita no mock (" + r.escritas.join(", ") + ")", recarga: "recarrega o documento", navega: "navega para outra rota (" + r.pathDepois + "): regra 1, uma tela = uma rota",
      "nao-aditivo": "não aditiva (algo some ou deixa de ser visível: troca de conteúdo no lugar)", "efeito-parcial": `efeito em ${r.repeticoes} cargas, não 3/3`, "efeito-nao-estado": "efeito que não é estado" }[r.veredito] ?? r.veredito });
    return;
  }
  const k = familia(r.gatilho) + "|" + r.gesto;
  if (vistas.has(k)) { fora.push({ vista: rot, motivo: "mesma família de gatilho e gesto que uma candidata anterior no documento" }); return; }
  vistas.add(k);
  candidatas.push({ id: rot, gatilho: r.gatilho, gesto: r.gesto, rotulo: r.rotulo, tipos: r.tipos, passos: PASSOS[r.gesto] + 1, ordem, dialogo: ehDialogo(r.tipos) });
});

const cobertos = { componentes: new Set(inicial.componentes), estruturas: new Set(inicial.estruturas) };
const novosDe = t => ({ componentes: t.componentes.filter(x => !cobertos.componentes.has(x)), estruturas: t.estruturas.filter(x => !cobertos.estruturas.has(x)) });
const paradas = [{ id: "inicial", gatilho: null, gesto: null, tipo: "comum", novos: inicial }];
const traco = [`rodada 0: inicial (obrigatória) — cobre DS [${inicial.componentes.join(" ")}] · estruturas [${inicial.estruturas.join(" ")}]`];
let dialogoEscolhido = null;
for (let rodada = 1; paradas.length + (dialogoEscolhido ? 1 : 0) < TETO; rodada++) {
  const ops = candidatas.filter(c => !paradas.some(p => p.id === c.id) && c !== dialogoEscolhido && !(c.dialogo && dialogoEscolhido))
    .map(c => ({ c, n: novosDe(c.tipos) }))
    .filter(o => o.n.componentes.length + o.n.estruturas.length > 0);
  const elegiveis = ops.filter(o => !o.c.dialogo || o.n.componentes.length > 0);
  elegiveis.sort((a, b) => b.n.componentes.length - a.n.componentes.length || b.n.estruturas.length - a.n.estruturas.length || a.c.passos - b.c.passos || a.c.ordem - b.c.ordem);
  if (!elegiveis.length) { traco.push(`rodada ${rodada}: nenhuma vista elegível acrescenta tipo — fim`); break; }
  const e = elegiveis[0];
  traco.push(`rodada ${rodada}: escolhida ${e.c.id}${e.c.dialogo ? " [diálogo]" : ""} — melhores:\n` +
    elegiveis.slice(0, 6).map(o => `    ${o.c.id}${o.c.dialogo ? " [diálogo]" : ""} +DS ${o.n.componentes.length} (${o.n.componentes.join(",")}) +estr ${o.n.estruturas.length} (${o.n.estruturas.join(",")}) · ${o.c.passos} passos`).join("\n"));
  const p = { id: e.c.id, gatilho: e.c.gatilho, gesto: e.c.gesto, rotulo: e.c.rotulo, tipo: e.c.dialogo ? "diálogo" : "comum", novos: e.n, passos: e.c.passos };
  if (e.c.dialogo) dialogoEscolhido = p; else paradas.push(p);
  for (const x of e.n.componentes) cobertos.componentes.add(x);
  for (const x of e.n.estruturas) cobertos.estruturas.add(x);
}
if (dialogoEscolhido) paradas.push(dialogoEscolhido);

const escolhidas = new Set(paradas.map(p => p.id));
for (const c of candidatas) if (!escolhidas.has(c.id)) {
  const n = novosDe(c.tipos);
  fora.push({ vista: c.id, motivo: (n.componentes.length + n.estruturas.length) === 0 ? "regra 5: não torna visível tipo que as paradas escolhidas não mostraram"
    : c.dialogo && dialogoEscolhido ? "regra 6: já há uma parada de diálogo (a última)"
    : c.dialogo && n.componentes.length === 0 ? `regra 6 (= regra 5 da B): diálogo sem componente do DS novo (estruturas novas: ${n.estruturas.join(", ") || "nenhuma"})` : "teto de 4 paradas" });
}
console.log(`candidatas: ${candidatas.length} (${candidatas.filter(c => c.dialogo).length} diálogos) · ${fora.length} fora\n`);
console.log(traco.join("\n"));
console.log(`\nparadas escolhidas (${paradas.length}):`);
for (const p of paradas) console.log(`  ${p.tipo.padEnd(8)} ${p.id} · novos DS [${p.novos.componentes.join(" ")}] · estruturas [${p.novos.estruturas.join(" ")}]`);
console.log(`\ntipos cobertos: DS [${[...cobertos.componentes].sort().join(" ")}] · estruturas [${[...cobertos.estruturas].sort().join(" ")}]`);
const todos = { componentes: new Set(), estruturas: new Set() };
for (const r of R.resultados) if (r.tipos) { r.tipos.componentes.forEach(x => todos.componentes.add(x)); r.tipos.estruturas.forEach(x => todos.estruturas.add(x)); }
console.log(`tipos vistos em alguma vista e NÃO cobertos: DS [${[...todos.componentes].filter(x => !cobertos.componentes.has(x)).join(" ")}] · estruturas [${[...todos.estruturas].filter(x => !cobertos.estruturas.has(x)).join(" ")}]`);
console.log(`\nfora (${fora.length}):`);
for (const f of fora) console.log(`  ${f.vista} — ${f.motivo}`);
const i = process.argv.indexOf("--json");
if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify({ traco, paradas, fora, cobertos: { componentes: [...cobertos.componentes], estruturas: [...cobertos.estruturas] } }, null, 1));
