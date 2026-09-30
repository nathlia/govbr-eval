/**
 * Escolha gulosa dos estados da tela Vistorias (adendo § B, "Regra de escolha") — lê SÓ a saída do
 * teste de estados (tela-b/vistorias/estados.json) e nunca olha para defeito: a pontuação é
 * cobertura de TIPOS (componente do DS / estrutura de página) que cada vista torna visíveis.
 *
 * Vistas candidatas:
 *  - `inicial` (a entrada, afterStep 0) — obrigatória, é a parada do segmento da lista;
 *  - parada comum de um segmento de rota: a rota nua, ou a rota + um gesto `produz-estado` que não
 *    é diálogo (regra 5: uma parada por segmento);
 *  - parada de diálogo: gesto `produz-estado` cujo resultado mostra `dialogo` ou sobreposto modal
 *    (`modal`/`scrim`); só entra se trouxer componente do DS novo (regra 5), e é a última do seu
 *    segmento. Um diálogo de segmento ainda sem parada comum entra com a rota nua como parada comum.
 *  - excluídos antes da conta: escrita, recarga, navegação para fora da árvore `vistorias/`, não
 *    aditivos, parciais, e os tipos do item 2 (abas, paginação, "Exibir N", filtro aplicado — que
 *    no teste aparecem como `nao-aditivo`).
 * Ordem: mais componentes do DS novos → mais estruturas novas → menos passos → ordem do documento.
 * Teto: 6 paradas. Gesto: o clique (o Enter dá o mesmo resultado onde há efeito; conferido abaixo).
 *
 * Uso: node tela-b/vistorias/selecionar-estados.mjs [--json tela-b/vistorias/selecao.json]
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(readFileSync(join(AQUI, "estados.json"), "utf8"));
const TETO = 6;
const ehDialogo = t => t.estruturas.includes("dialogo") || t.componentes.includes("modal") || t.componentes.includes("scrim");
const passosDoSegmento = b => {
  // passos contados a partir do início do segmento da base (o último `navigate`)
  let i = b.passos.length - 1; while (i > 0 && b.passos[i].action !== "navigate") i--;
  return b.passos.length - Math.max(0, i);
};

// Adendo § B, regra 3: `dialogo` = role=dialog|alertdialog OU sobreposto modal. O teste de estados só registra o papel;
// o sobreposto (componente modal/scrim visível) é acrescentado aqui.
const normalizar = t => (t.componentes.includes("modal") || t.componentes.includes("scrim")) && !t.estruturas.includes("dialogo") ? { ...t, estruturas: [...t.estruturas, "dialogo"].sort() } : t;
for (const b of R.bases) b.tipos = normalizar(b.tipos);
for (const r of R.resultados) if (r.tipos) r.tipos = normalizar(r.tipos);
const bases = R.bases;
const lista = bases.find(b => b.id === "lista");
const semRow = g => g.replace(/tr:nth-of-type\(\d+\)/, "tr:nth-of-type(k)");

// ── candidatos ────────────────────────────────────────────────────────────────────────────────
const comuns = [], dialogos = [], fora = [];
const vistos = new Set();
for (const b of bases) {
  if (b.id !== "lista") comuns.push({ id: `${b.id} (rota)`, base: b.id, gesto: null, tipos: b.tipos, passos: passosDoSegmento(b), ordem: comuns.length });
  for (const r of R.resultados.filter(x => x.base === b.id && x.gesto === "clique")) {
    const k = b.id + "|" + semRow(r.gatilho);
    if (r.veredito === "sem-efeito") continue;
    if (vistos.has(k)) continue; // linhas repetidas da mesma tabela: a 1ª linha representa (regra 2, desempate por ordem)
    vistos.add(k);
    const enter = R.resultados.find(x => x.base === b.id && x.gatilho === r.gatilho && x.gesto === "enter");
    if (r.veredito !== "produz-estado") {
      fora.push({ vista: `${b.id} + clique "${r.rotulo}"`, motivo: { escrita: "dispara escrita no mock (" + r.escritas.join(", ") + ")", recarga: "recarrega o documento (sai da aplicação: " + r.pathDepois + ")", "nao-aditivo": "não aditiva (troca de conteúdo: aba/paginação/edição no lugar — item 2 ou não aditiva)", navega: r.pathDepois.startsWith("/pnip/portal-mpa/vistorias/") ? "navegação para rota já tratada como base (" + r.pathDepois.replace(/[0-9a-f-]{36}$/, ":uuid") + ")" : "navegação para fora da árvore vistorias/ (" + r.pathDepois + ")", "efeito-parcial": "efeito em menos de 3/3 cargas", "efeito-nao-estado": "efeito que não é estado" }[r.veredito] ?? r.veredito });
      continue;
    }
    const c = { id: `${b.id} + clique "${r.rotulo || r.gatilho.slice(-30)}"`, base: b.id, gesto: r.gatilho, rotulo: r.rotulo, tipos: r.tipos, passos: (b.id === "lista" ? 0 : passosDoSegmento(b)) + 2, enter: enter?.veredito, ordem: comuns.length + dialogos.length };
    (ehDialogo(r.tipos) ? dialogos : comuns).push(c);
  }
}

// ── escolha gulosa ───────────────────────────────────────────────────────────────────────────
const cobertos = { componentes: new Set(lista.tipos.componentes), estruturas: new Set(lista.tipos.estruturas) };
const paradas = [{ id: "inicial", base: "lista", gesto: null, tipo: "comum", novos: { componentes: lista.tipos.componentes, estruturas: lista.tipos.estruturas } }];
const comumDe = new Map([["lista", paradas[0]]]);
const dialogoDe = new Map();
const traco = [`rodada 0: inicial (obrigatória) — cobre DS [${lista.tipos.componentes.join(" ")}] · estruturas [${lista.tipos.estruturas.join(" ")}]`];
const novosDe = t => ({ componentes: t.componentes.filter(x => !cobertos.componentes.has(x)), estruturas: t.estruturas.filter(x => !cobertos.estruturas.has(x)) });

for (let rodada = 1; paradas.length < TETO; rodada++) {
  const opcoes = [];
  for (const c of comuns) {
    if (comumDe.has(c.base)) continue; // uma parada comum por segmento
    const n = novosDe(c.tipos);
    opcoes.push({ tipo: "comum", c, n, custo: 1 });
  }
  for (const d of dialogos) {
    if (dialogoDe.has(d.base)) continue; // um diálogo por segmento
    const n = novosDe(d.tipos);
    if (!comumDe.has(d.base)) {
      if (d.base === "lista") continue;
      opcoes.push({ tipo: "diálogo (com a rota nua como parada comum)", c: d, n, custo: 2 });
    } else opcoes.push({ tipo: "diálogo", c: d, n, custo: 1 });
  }
  const elegiveis = opcoes.filter(o => (o.n.componentes.length + o.n.estruturas.length) > 0 && !(o.tipo.startsWith("diálogo") && o.n.componentes.length === 0) && paradas.length + o.custo <= TETO);
  elegiveis.sort((a, b) => b.n.componentes.length - a.n.componentes.length || b.n.estruturas.length - a.n.estruturas.length || a.c.passos - b.c.passos || a.c.ordem - b.c.ordem);
  const top = elegiveis.slice(0, 6).map(o => `    ${o.c.id} [${o.tipo}] +DS ${o.n.componentes.length} (${o.n.componentes.join(",")}) +estr ${o.n.estruturas.length} (${o.n.estruturas.join(",")}) · ${o.c.passos} passos`);
  if (!elegiveis.length) { traco.push(`rodada ${rodada}: nenhuma vista elegível acrescenta tipo — fim`); break; }
  const e = elegiveis[0];
  traco.push(`rodada ${rodada}: escolhida ${e.c.id} [${e.tipo}] — melhores candidatas:\n${top.join("\n")}`);
  if (e.tipo.startsWith("diálogo (com")) {
    const rota = comuns.find(c => c.base === e.c.base && c.gesto === null);
    const p = { id: rota.id, base: rota.base, gesto: null, tipo: "comum", novos: novosDe(rota.tipos) };
    paradas.push(p); comumDe.set(rota.base, p);
  }
  const p = { id: e.c.id, base: e.c.base, gesto: e.c.gesto, rotulo: e.c.rotulo, tipo: e.tipo.startsWith("diálogo") ? "diálogo" : "comum", novos: e.n, passos: e.c.passos, enter: e.c.enter };
  paradas.push(p);
  (p.tipo === "comum" ? comumDe : dialogoDe).set(p.base, p);
  for (const x of e.n.componentes) cobertos.componentes.add(x);
  for (const x of e.n.estruturas) cobertos.estruturas.add(x);
  if (p.tipo === "diálogo") {
    // a parada comum já escolhida tem de ter sido medida sem gesto para o diálogo valer (medido a partir da rota nua)
    const comum = comumDe.get(p.base);
    if (comum.gesto) traco.push(`    nota: o diálogo foi medido a partir da rota nua; a sequência final o aciona depois de "${comum.rotulo}" — aditividade conferida em conferir-auditoria.mjs`);
  }
}

// ── o que sobrou ──────────────────────────────────────────────────────────────────────────────
const escolhidas = new Set(paradas.map(p => p.id));
for (const c of [...comuns, ...dialogos]) {
  if (escolhidas.has(c.id)) continue;
  const n = novosDe(c.tipos);
  const motivo = c.base === "lista" && !dialogos.includes(c) ? "regra 5: o segmento da lista já tem sua parada (inicial, afterStep 0) e esta vista não é diálogo"
    : dialogos.includes(c) && dialogoDe.has(c.base) ? "regra 5: o segmento já tem uma parada de diálogo"
    : dialogos.includes(c) && novosDe(c.tipos).componentes.length === 0 ? `regra 5: diálogo sem componente do DS novo (estruturas novas: ${n.estruturas.join(", ") || "nenhuma"})`
    : comumDe.has(c.base) ? "regra 5: o segmento já tem sua parada comum"
    : (n.componentes.length + n.estruturas.length) === 0 ? "regra 3: não torna visível nenhum tipo que as paradas escolhidas não mostraram"
    : "teto de 6 paradas";
  fora.push({ vista: c.id, motivo });
}

console.log(`candidatas: ${comuns.length} paradas comuns · ${dialogos.length} diálogos · ${fora.length} fora antes ou depois da conta\n`);
console.log(traco.join("\n"));
console.log(`\nparadas escolhidas (${paradas.length}):`);
for (const p of paradas) console.log(`  ${p.tipo.padEnd(8)} ${p.id} · novos DS [${p.novos.componentes.join(" ")}] · estruturas [${p.novos.estruturas.join(" ")}]${p.enter ? ` · Enter: ${p.enter}` : ""}`);
console.log(`\ntipos cobertos: DS [${[...cobertos.componentes].sort().join(" ")}] · estruturas [${[...cobertos.estruturas].sort().join(" ")}]`);
const todosTipos = { componentes: new Set(), estruturas: new Set() };
for (const c of [...comuns, ...dialogos]) { c.tipos.componentes.forEach(x => todosTipos.componentes.add(x)); c.tipos.estruturas.forEach(x => todosTipos.estruturas.add(x)); }
console.log(`tipos vistos em alguma vista e NÃO cobertos: DS [${[...todosTipos.componentes].filter(x => !cobertos.componentes.has(x)).join(" ")}] · estruturas [${[...todosTipos.estruturas].filter(x => !cobertos.estruturas.has(x)).join(" ")}]`);
console.log(`\nfora (${fora.length}):`);
for (const f of fora) console.log(`  ${f.vista} — ${f.motivo}`);
const i = process.argv.indexOf("--json");
if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify({ traco, paradas, fora, cobertos: { componentes: [...cobertos.componentes], estruturas: [...cobertos.estruturas] } }, null, 1));
