/**
 * Bancada de revisão cega, com relógio (fatia 5 / D-06).
 *
 * O que ela é: uma vista do pacote já preparado e um escritor de `reviews.json`. Ela não decide,
 * não agrupa por paráfrase e não propõe veredito — o D-45 recusou explicitamente o motor que
 * proporia agrupamento, e esta bancada não o reintroduz por outra porta. O que ela faz é ordenar a
 * fila (cartões de mesma cena/regra/sujeito ficam vizinhos, o que é apresentação, não decisão),
 * mostrar a evidência que sustenta cada cartão e gravar o que a autora decidir.
 *
 * Cegueira: o payload servido ao navegador NUNCA carrega `reportedEvidence` nem a `description`
 * bruta dos cartões legados — são os dois lugares onde o braço se denuncia (fatia 5). A retenção é
 * declarada em cada cartão, como na renderização `--cego`: esconder sem dizer que esconde seria
 * pior do que mostrar.
 *
 * Validação: cada gravação passa pelo `scoreSemanticPackage` do repositório. Uma decisão inválida
 * (unidade que não ancora, sujeito descoberto, duplicata pendente) volta com o erro do próprio
 * scorer e NÃO é persistida. Não existe segunda fonte da verdade sobre o que é uma decisão válida.
 *
 * Relógio: `tempo-revisao.ndjson` registra abertura e decisão de cada cartão. É ele que substitui a
 * taxa DECLARADA por taxa MEDIDA — a primeira sessão cronometrada é a que finalmente a mede.
 *
 * Uso: npx tsx scripts/review-ui.ts --package results/semantic-review/<carimbo> --revisora "Nome"
 */
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, dirname, join, resolve } from "node:path";
import { ROOT } from "./adjudication";
import { verifyArchivedEvidence } from "./evidence-integrity";
import {
  DECISOES, SCORER_FILES, canonical, digest, normalizeReviews, reviewEffort, reviewQueue, scoreSemanticPackage, validatePackage,
  type RawReviewAtom, type RawReviews, type ReviewCard, type SemanticPackage, type SemanticUnit,
} from "./semantic-flow";
import { montarAtomos, type PedidoAtomo } from "./decisao-atomos";

/**
 * O mesmo hash que o CLI confere: a bancada recusa um pacote preparado por outra versão do scorer.
 * `review-ui.ts` de propósito NÃO entra em SCORER_FILES — ela lê e grava decisões, não pontua, e
 * incluí-la invalidaria todo pacote a cada mexida na interface.
 */
const scorerHash = (): string => digest(SCORER_FILES.map(path => [path, readFileSync(join(ROOT, path), "utf8")]));

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const pkgDir = resolve(option("package") ?? "");
const reviewer = (option("revisora") ?? "").trim();
const port = Number(option("porta") ?? 4300);
if (!pkgDir || !existsSync(join(pkgDir, "package.json"))) {
  throw new Error("Usage: review-ui.ts --package DIR_DO_PACOTE [--revisora NOME] [--porta 4300]");
}
if (!reviewer) throw new Error("--revisora é obrigatório: a decisão é assinada por quem a tomou.");

const pkgPath = join(pkgDir, "package.json");
const reviewsPath = join(pkgDir, "reviews.json");
const timingPath = join(pkgDir, "tempo-revisao.ndjson");

const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

const pkg = read<SemanticPackage>(pkgPath);
validatePackage(pkg);
if (pkg.context.scorerHash !== scorerHash()) {
  throw new Error("Scorer/aliases mudaram desde o preparo. Use o código fixado ou prepare um pacote novo.");
}
for (const run of pkg.runs) if (run.evidenceIndex) verifyArchivedEvidence(ROOT, run.evidenceIndex);

const capture = existsSync(join(pkgDir, "capture.json"))
  ? read<{ scenes: { id: string; image?: string; html?: string }[] }>(join(pkgDir, "capture.json"))
  : { scenes: [] };
const sceneImage = new Map(capture.scenes.map(s => [s.id, s.image]));

/**
 * Arquivos que a bancada aceita servir: só os caminhos que os próprios cartões declaram, e sempre
 * por um identificador opaco. O caminho da evidência contém o id da execução (`…-com-run1-…`), e um
 * link com o caminho na URL denunciava o braço a quem passasse o mouse sobre ele.
 */
const servableEvidence = new Map<string, string>();
const evidenceToken = (path: string): string => digest(["evidencia", resolve(ROOT, path)]).slice(0, 16);
for (const card of pkg.cards) for (const e of card.evidence) if (e.path) servableEvidence.set(evidenceToken(e.path), resolve(ROOT, e.path));

const units = new Map(pkg.units.map(u => [u.id, u]));

/** Ordenação: vizinhança, não agrupamento. Quem diz que dois cartões são a mesma coisa é a autora. */
const ordered = [...pkg.cards].sort((a, b) =>
  a.scene.localeCompare(b.scene) || (a.rule ?? "~").localeCompare(b.rule ?? "~") ||
  (a.subjects[0]?.key ?? "").localeCompare(b.subjects[0]?.key ?? "") || a.id.localeCompare(b.id));

/**
 * `duplicada` só vale onde o scorer a aceita: alvo na MESMA execução, cobrindo os mesmos sujeitos,
 * no mesmo estado, com os mesmos relacionados e o mesmo build. A bancada oferecia como duplicata
 * qualquer cartão parecido, inclusive os de outra execução, e o scorer recusava na hora de gravar.
 * A mesma alegação em três execuções são três cartões — cada execução responde pelo que disse —, e
 * para isso a bancada copia a decisão anterior da autora, que ela confere e salva.
 */
const runsOfCard = new Map<string, string[]>();
for (const run of pkg.runs) for (const id of run.cardIds) runsOfCard.set(id, [...(runsOfCard.get(id) ?? []), run.id]);
function duplicataElegivel(c: ReviewCard, alvo: ReviewCard): boolean {
  const runs = runsOfCard.get(c.id) ?? [], runsAlvo = runsOfCard.get(alvo.id) ?? [];
  return alvo.id !== c.id && runs.length > 0 && runs.every(r => runsAlvo.includes(r)) &&
    c.subjects.every(s => alvo.subjects.some(t => t.id === s.id)) &&
    canonical(c.state) === canonical(alvo.state) && canonical(c.relatedKeys) === canonical(alvo.relatedKeys) &&
    c.binding.build === alvo.binding.build;
}

function unitView(u: SemanticUnit) {
  return {
    id: u.id, specId: u.specId, scene: u.scene, state: u.state, states: u.states,
    label: u.element.label, description: u.description, rules: u.rules,
    acceptance: u.acceptance.outcome === "nao-implementado"
      ? { texto: "predicado não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua", sustenta: false }
      : {
        texto: `${u.acceptance.kind} ${u.acceptance.outcome} em ${u.acceptance.states.join(", ")} — ${u.acceptance.expected}`,
        medido: u.acceptance.measured.map(m => m.reason),
        sustenta: u.acceptance.outcome === "sustenta",
      },
  };
}

/** A vista cega de um cartão. `reportedEvidence` e a `description` bruta nunca entram aqui. */
function cardView(c: ReviewCard) {
  const legado = c.contract !== "achado-2" && c.contract !== "deterministico";
  return {
    id: c.id, origin: c.origin, scene: c.scene, contract: c.contract, rule: c.rule, flags: c.flags,
    observed: legado ? null : c.observed, expected: legado ? null : c.expected,
    state: c.state, subjects: c.subjects, relatedKeys: c.relatedKeys,
    // Cenas por segmento (D-60): quando o seletor resolve em mais de uma, a autora escolhe de qual a
    // alegação fala, e só os sujeitos dela são gravados.
    segmentos: c.segmentos?.map(o => ({ scene: o.scene, path: o.path })) ?? null,
    reuso: c.binding.runScope ? "restrito à execução de origem" : "condicionado à mesma evidência verificada",
    candidatas: c.candidateUnitIds.map(id => unitView(units.get(id)!)),
    duplicataDe: pkg.cards.filter(alvo => duplicataElegivel(c, alvo)).map(alvo => alvo.id),
    evidencia: c.evidence.map(e => ({
      ref: e.ref, status: e.status, arquivo: e.path ? basename(e.path) : null,
      url: e.path ? `/evidencia?ref=${evidenceToken(e.path)}` : null,
      sha256: e.sha256?.slice(0, 12) ?? null,
    })),
    imagem: sceneImage.get(c.scene) ? `/cena/${sceneImage.get(c.scene)}` : null,
    retido: legado
      ? "cartão legado: o texto bruto foi retido porque pode nomear o braço; peça a renderização completa DEPOIS de decidir"
      : "a narrativa livre da execução (reportedEvidence) está retida: ela pode nomear o braço",
  };
}

function loadReviews(): RawReviews {
  return read<RawReviews>(reviewsPath);
}

/** Grava só depois que o scorer do repositório aceitou o conjunto inteiro. */
function persist(next: RawReviews): void {
  const normalized = normalizeReviews(structuredClone(next));
  scoreSemanticPackage(pkg, normalized);
  const tmp = `${reviewsPath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(tmp, reviewsPath);
}

function logTime(event: Record<string, unknown>): void {
  appendFileSync(timingPath, `${JSON.stringify({ at: new Date().toISOString(), revisora: reviewer, ...event })}\n`, "utf8");
}

function timingSummary(): { decididos: number; segundos: number[]; medianaSegundos: number | null } {
  if (!existsSync(timingPath)) return { decididos: 0, segundos: [], medianaSegundos: null };
  const segundos: number[] = [];
  for (const line of readFileSync(timingPath, "utf8").split("\n").filter(Boolean)) {
    const e = JSON.parse(line) as { event: string; segundos?: number };
    if (e.event === "decidiu" && typeof e.segundos === "number") segundos.push(e.segundos);
  }
  const sorted = [...segundos].sort((a, b) => a - b);
  return {
    decididos: segundos.length, segundos,
    medianaSegundos: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null,
  };
}

function state() {
  const reviews = loadReviews();
  const decisions = Object.fromEntries(reviews.decisions.map(d => [d.cardId, d]));
  const normalized = normalizeReviews(structuredClone(reviews));
  const fila = reviewQueue(pkg, normalized);
  const esforco = reviewEffort(pkg);
  return {
    meta: {
      versao: pkg.version, revisora: reviewer, cartoes: pkg.cards.length, unidades: pkg.units.length,
      orcamento: pkg.queue.reviewBudget, fila: { ativa: fila.ativa.cartoes, historica: fila.historica.cartoes },
      esforcoEstimado: esforco.estimativaMinutos, vocabulario: Object.keys(DECISOES),
    },
    cards: ordered.map(cardView), decisions, tempo: timingSummary(),
  };
}

const PAGE = /* html */ `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Revisão cega</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#f6f7f9;--fg:#15181c;--mut:#5b6672;--line:#d7dce2;--card:#fff;--acc:#1351b4;--warn:#a8410b}
@media(prefers-color-scheme:dark){:root{--bg:#14171b;--fg:#e8ecf1;--mut:#9aa6b2;--line:#2c333b;--card:#1b1f25;--acc:#6ea8fe;--warn:#f0a868}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}
header{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;z-index:5}
header b{font-size:14px}
.rel{font-variant-numeric:tabular-nums;font-size:20px;min-width:72px}
main{max-width:1100px;margin:0 auto;padding:16px;display:grid;gap:16px;grid-template-columns:1fr}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}
h2{font-size:15px;margin:0 0 4px}
.mut{color:var(--mut);font-size:13px}
.kv{margin:10px 0}.kv b{display:block;font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}
code,pre{font-family:ui-monospace,Consolas,monospace;font-size:12.5px}
pre{white-space:pre-wrap;word-break:break-word;margin:4px 0}
.unit{border-left:3px solid var(--acc);padding:6px 10px;margin:8px 0;background:color-mix(in srgb,var(--acc) 7%,transparent)}
.flag{display:inline-block;background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn);border-radius:4px;padding:1px 6px;font-size:12px;margin-right:6px}
button{font:inherit;padding:7px 12px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--fg);cursor:pointer}
button.sel{background:var(--acc);color:#fff;border-color:var(--acc)}
button:disabled{opacity:.45;cursor:not-allowed}
textarea,select,input{font:inherit;width:100%;padding:7px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--fg)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
img{max-width:100%;border:1px solid var(--line);border-radius:6px}
.err{color:#b3261e;white-space:pre-wrap}
.ok{color:#1a7f37}
.lista{max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:7px}
.lista div{padding:5px 9px;border-bottom:1px solid var(--line);font-size:13px}
.lista button{padding:2px 8px;font-size:12px}
.lista div.done{color:var(--mut)}
</style></head><body>
<header>
  <b id="pos">—</b><span class="rel" id="rel">0:00</span>
  <span class="mut" id="resumo"></span>
  <span class="row" style="margin-left:auto">
    <button id="ant">◀ anterior</button><button id="prox">próximo ▶</button>
  </span>
</header>
<main>
  <div class="card" id="cartao"></div>
  <div class="card" id="decisao"></div>
</main>
<script>
const $ = s => document.querySelector(s);
let S = null, i = 0, aberto = null, similares = [];
const DEC = [["defeito-do-gabarito","g · acertou defeito do gabarito"],["defeito-novo-correto","n · certo, fora do gabarito"],
  ["incorreta","i · alegação errada"],["duplicada","d · já decidida noutro cartão"],["evidencia-insuficiente","e · não dá para decidir"]];
let escolha = null, unidades = new Set(), dup = null, citacao = "uncertain", cenaEscolhida = null;

async function carrega(){ S = await (await fetch("/api/state")).json(); pinta(); }
function card(){ return S.cards[i]; }
function dec(id){ return S.decisions[id]; }

function relogio(){ if(!aberto) return; const s = Math.round((Date.now()-aberto)/1000);
  $("#rel").textContent = Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
setInterval(relogio, 1000);

async function abre(){ aberto = Date.now(); relogio();
  await fetch("/api/abriu",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({cardId:card().id})}); }

function pinta(){
  const c = card(), d = dec(c.id);
  const decididos = Object.values(S.decisions).filter(x=>x.status==="reviewed").length;
  $("#pos").textContent = \`cartão \${i+1}/\${S.cards.length} · \${decididos} decididos\`;
  $("#resumo").textContent = \`fila ativa \${S.meta.fila.ativa} · mediana medida \${S.tempo.medianaSegundos ?? "—"}s · orçamento: \${S.meta.orcamento ?? "não declarado"}\`;
  escolha = null; unidades = new Set(); dup = null; citacao = "uncertain"; cenaEscolhida = null;
  $("#cartao").innerHTML = \`
    <h2>\${c.origin === "agente" ? "Execução do agente" : "Linha de base determinística"} · cena \${c.scene}</h2>
    <div class="mut">\${c.contract} · \${c.id.slice(0,18)}…</div>
    \${c.flags.map(f=>\`<span class="flag">\${f}</span>\`).join("")}
    <div class="kv"><b>Observado</b><pre>\${esc(c.observed ?? "(retido/ausente)")}</pre></div>
    <div class="kv"><b>Esperado</b><pre>\${esc(c.expected ?? "(retido/ausente)")}</pre></div>
    <div class="kv"><b>Janela e interações</b><pre>\${c.state ? c.state.viewport.width+"×"+c.state.viewport.height+" · "+(c.state.steps.join(" → ")||"nenhuma") : "ausentes no relatório"}</pre></div>
    <div class="kv"><b>Regra declarada</b><pre>\${esc(c.rule ?? "nenhuma (atribuição incerta)")}</pre></div>
    \${c.segmentos?\`<div class="kv"><b>De que cena a alegação fala (obrigatório)</b><div class="row" id="cenas">\${c.segmentos.map(o=>\`<button data-cena="\${o.scene}">\${o.scene} · \${esc(o.path??"?")}</button>\`).join("")}</div>
      <div class="mut">o seletor resolve em mais de um segmento; só os sujeitos da cena escolhida contam</div></div>\`:""}
    <div class="kv"><b>Sujeitos</b>\${c.subjects.map(s=>\`<pre>\${esc(s.id)} — \${esc(s.label)}\${s.hidden?" · OCULTO: "+esc(s.hidden):""}</pre>\`).join("")}</div>
    <div class="kv"><b>Unidades candidatas (não são crédito)</b>\${c.candidatas.length ? c.candidatas.map(u=>\`
      <div class="unit"><b>\${u.specId}</b> · \${u.state} · cena \${u.scene}<br>\${esc(u.description)}<br>
      <span class="mut">predicado: \${esc(u.acceptance.texto)}</span></div>\`).join("")
      : '<div class="mut">Nenhuma âncora candidata; um achado novo correto continua possível.</div>'}</div>
    <div class="kv"><b>Evidência da execução</b>\${c.evidencia.length ? c.evidencia.map(e=>\`<pre>\${esc(e.ref)} → \${e.url?\`<a href="\${e.url}" target="_blank">\${esc(e.arquivo)}</a> (sha \${e.sha256})\`:esc(e.status)}</pre>\`).join("") : '<div class="mut">nenhuma referência declarada</div>'}</div>
    <div class="kv"><b>Retido na cegueira</b><div class="mut">\${esc(c.retido)}</div></div>
    \${c.imagem?\`<div class="kv"><b>Reconstrução da cena (não é evidência da execução)</b><img src="\${c.imagem}"></div>\`:""}\`;
  similares = S.cards.filter(o=>o.id!==c.id && dec(o.id)?.status==="reviewed" &&
    (o.rule===c.rule || o.subjects[0]?.key===c.subjects[0]?.key || c.duplicataDe.includes(o.id)));
  // O mais parecido primeiro: é ele que a tecla "c" copia. Ordem é apresentação, não decisão.
  const proximidade = o => (o.rule===c.rule?2:0) + (o.subjects[0]?.key===c.subjects[0]?.key?1:0) + (o.expected===c.expected?1:0);
  similares.sort((a,b)=>proximidade(b)-proximidade(a));
  pintaDecisao(d);
  if($("#cenas")) $("#cenas").onclick = e => { const v = e.target.dataset.cena; if(!v) return; cenaEscolhida = v;
    [...$("#cenas").children].forEach(b=>b.classList.toggle("sel", b.dataset.cena===v)); };
  abre();
}
function esc(s){ return String(s).replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m])); }

function pintaDecisao(d){
  const c = card();
  $("#decisao").innerHTML = \`
    <h2>Decisão</h2>
    \${d?.status==="reviewed"?\`<div class="ok">já decidido: \${d.atoms.map(a=>a.decisao).join(", ")} — "\${esc(d.rationale)}"</div>\`:""}
    <div class="row" id="botoes">\${DEC.map(([v,t])=>\`<button data-v="\${v}">\${t}</button>\`).join("")}</div>
    <div id="extra"></div>
    <div class="kv"><b>Citação da regra</b><div class="row" id="cit">
      <button data-c="supported">a citação sustenta</button><button data-c="unsupported">citação errada</button>
      <button data-c="uncertain" class="sel">incerta</button></div></div>
    <div class="kv"><b>Justificativa (obrigatória)</b><textarea id="just" rows="2"></textarea></div>
    <div class="kv"><b>O que você consultou</b><input id="ev" value="cartão; reconstrução da cena"></div>
    <div class="row"><button id="salvar">salvar e seguir (Enter)</button><span id="msg" class="err"></span></div>
    <div class="kv"><b>Já decididos parecidos</b>
      <div class="mut">Tecla <b>c</b> copia a do primeiro da lista. "copiar decisão" preenche o formulário com o que você decidiu lá — confira e salve. A mesma alegação em outra execução é outro cartão, e se decide assim. "é duplicata deste" só aparece quando o outro cartão é da MESMA execução, com os mesmos elementos e o mesmo estado.</div>
      <div class="lista">\${similares.length?similares.map(o=>{ const a = dec(o.id).atoms[0]; return \`<div>
        <b>\${esc(a.decisao)}</b> · \${o.scene} · \${esc(o.rule??"—")} · \${esc((o.observed??"").slice(0,80))}
        <span class="row">\${a.decisao!=="duplicada"?\`<button data-copy="\${o.id}">copiar decisão</button>\`:""}
        \${c.duplicataDe.includes(o.id)?\`<button data-dup="\${o.id}">é duplicata deste</button>\`:""}</span></div>\`; }).join(""):'<div class="done">nenhum ainda</div>'}</div></div>\`;
  $("#botoes").onclick = e => { const v = e.target.dataset.v; if(!v) return;
    escolha = v; [...$("#botoes").children].forEach(b=>b.classList.toggle("sel", b.dataset.v===v)); extra(); };
  $("#cit").onclick = e => { const v = e.target.dataset.c; if(!v) return; citacao = v;
    [...$("#cit").children].forEach(b=>b.classList.toggle("sel", b.dataset.c===v)); };
  $("#salvar").onclick = salvar;
  document.querySelectorAll("[data-dup]").forEach(el=>el.onclick=()=>{ dup = el.dataset.dup; escolha="duplicada";
    [...$("#botoes").children].forEach(b=>b.classList.toggle("sel", b.dataset.v==="duplicada")); extra(); });
  document.querySelectorAll("[data-copy]").forEach(el=>el.onclick=()=>copia(el.dataset.copy));
}

// Copia a decisão que a autora já tomou noutro cartão. Nada é gravado: o formulário fica preenchido
// e ela confere antes de salvar. Só entram unidades que também são candidatas DESTE cartão.
function copia(id){
  const o = dec(id), a = o.atoms[0], c = card();
  escolha = a.decisao; dup = null;
  [...$("#botoes").children].forEach(b=>b.classList.toggle("sel", b.dataset.v===escolha));
  extra();
  // A unidade é elemento × defeito: o mesmo defeito noutro elemento é OUTRA unidade, da mesma spec.
  // A cópia leva a spec e o estado, e marca a candidata deste cartão que os tem — se houver uma só.
  const origem = S.cards.find(x=>x.id===id);
  unidades = new Set((a.unitIds||[]).flatMap(u=>{
    if(c.candidatas.some(k=>k.id===u)) return [u];
    const de = origem.candidatas.find(k=>k.id===u);
    const iguais = de ? c.candidatas.filter(k=>k.specId===de.specId && k.state===de.state) : [];
    return iguais.length===1 ? [iguais[0].id] : [];
  }));
  [...$("#extra").querySelectorAll("[data-u]")].forEach(b=>b.classList.toggle("sel", unidades.has(b.dataset.u)));
  citacao = a.citation || "uncertain";
  [...$("#cit").children].forEach(b=>b.classList.toggle("sel", b.dataset.c===citacao));
  $("#just").value = o.rationale || "";
  $("#ev").value = (o.evidenceRefs||[]).join("; ");
  $("#msg").textContent = escolha==="defeito-do-gabarito" && !unidades.size
    ? "decisão copiada, mas nenhuma candidata daqui é da mesma spec: escolha a unidade deste cartão"
    : "copiada de: \\"" + (origem.observed||"").slice(0,70) + "…\\" — confira ESTE cartão e salve (Enter)";
}

function extra(){
  const c = card();
  if(escolha === "defeito-do-gabarito"){
    $("#extra").innerHTML = c.candidatas.length
      ? \`<div class="kv"><b>Qual unidade a alegação acertou</b>\${c.candidatas.map(u=>\`<div class="row"><button data-u="\${u.id}">\${u.specId} · \${u.state}</button></div>\`).join("")}</div>\`
      : '<div class="err">este cartão não tem unidade candidata nesta cena: o scorer recusará crédito de gabarito aqui</div>';
    $("#extra").onclick = e => { const u = e.target.dataset.u; if(!u) return;
      unidades.has(u) ? unidades.delete(u) : unidades.add(u);
      [...$("#extra").querySelectorAll("[data-u]")].forEach(b=>b.classList.toggle("sel", unidades.has(b.dataset.u))); };
  } else if(escolha === "duplicada"){
    $("#extra").innerHTML = dup ? \`<div class="mut">duplicada de \${dup.slice(0,18)}… (escolha outro na lista abaixo se preciso)</div>\`
      : '<div class="err">escolha na lista "já decididos parecidos" de qual cartão esta é duplicata</div>';
  } else $("#extra").innerHTML = "";
}

async function salvar(){
  const c = card(), just = $("#just").value.trim(), ev = $("#ev").value.split(";").map(s=>s.trim()).filter(Boolean);
  $("#msg").textContent = "";
  if(!escolha) return $("#msg").textContent = "escolha uma das cinco palavras";
  if(!just) return $("#msg").textContent = "a justificativa é obrigatória";
  if(!ev.length) return $("#msg").textContent = "declare o que você consultou";
  if(escolha === "defeito-do-gabarito" && !unidades.size) return $("#msg").textContent = "nomeie a unidade acertada";
  if(escolha === "duplicada" && !dup) return $("#msg").textContent = "aponte o cartão do qual esta é duplicata";
  if(c.segmentos && !cenaEscolhida) return $("#msg").textContent = "escolha de que cena a alegação fala";
  const segundos = Math.round((Date.now()-aberto)/1000);
  const r = await fetch("/api/decisao",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({cardId:c.id, decisao:escolha, unitIds:[...unidades], duplicadaDe:dup, citacao, rationale:just, evidenceRefs:ev, segundos,
      ...(c.segmentos ? {cena:cenaEscolhida} : {})})});
  const j = await r.json();
  if(!j.ok) return $("#msg").textContent = j.error;
  S = j.state; if(i < S.cards.length-1) i++; pinta();
}

$("#ant").onclick = ()=>{ if(i>0){ i--; pinta(); } };
$("#prox").onclick = ()=>{ if(i<S.cards.length-1){ i++; pinta(); } };
document.addEventListener("keydown", e=>{
  if(e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT"){ if(e.key==="Enter" && e.ctrlKey) salvar(); return; }
  const m = {g:"defeito-do-gabarito",n:"defeito-novo-correto",i:"incorreta",d:"duplicada",e:"evidencia-insuficiente"}[e.key];
  if(m){ escolha=m; [...$("#botoes").children].forEach(b=>b.classList.toggle("sel", b.dataset.v===m)); extra(); }
  if(e.key === "c"){ const o = similares.find(x=>dec(x.id).atoms[0].decisao!=="duplicada"); if(o) copia(o.id); }
  if(e.key === "Enter") salvar();
  if(e.key === "ArrowLeft") $("#ant").click();
  if(e.key === "ArrowRight") $("#prox").click();
});
carrega();
</script></body></html>`;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const send = (code: number, type: string, body: string | Buffer): void => {
    res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  };
  const json = (code: number, body: unknown): void => send(code, "application/json; charset=utf-8", JSON.stringify(body));

  if (req.method === "GET" && url.pathname === "/") return send(200, "text/html; charset=utf-8", PAGE);
  if (req.method === "GET" && url.pathname === "/api/state") return json(200, state());

  if (req.method === "GET" && url.pathname.startsWith("/cena/")) {
    const file = join(pkgDir, basename(url.pathname));
    if (!existsSync(file)) return json(404, { error: "cena não encontrada" });
    return send(200, file.endsWith(".png") ? "image/png" : "text/html; charset=utf-8", readFileSync(file));
  }
  if (req.method === "GET" && url.pathname === "/evidencia") {
    const file = servableEvidence.get(url.searchParams.get("ref") ?? "");
    if (!file || !existsSync(file)) return json(403, { error: "fora da evidência declarada" });
    return send(200, file.endsWith(".png") ? "image/png" : "text/plain; charset=utf-8", readFileSync(file));
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      const payload = JSON.parse(body || "{}") as Record<string, string & string[] & number>;
      if (url.pathname === "/api/abriu") {
        logTime({ event: "abriu", cardId: payload.cardId });
        return json(200, { ok: true });
      }
      if (url.pathname !== "/api/decisao") return json(404, { error: "rota desconhecida" });

      const card = pkg.cards.find(c => c.id === payload.cardId);
      if (!card) return json(400, { error: "cartão desconhecido" });
      const reviews = loadReviews();
      const decision = reviews.decisions.find(d => d.cardId === card.id);
      if (!decision) return json(400, { error: "cartão fora deste pacote" });

      // Duplicata: o scorer copia o veredito do alvo, mas exige as MESMAS unidades nos dois átomos.
      // Elas vêm do átomo apontado, nunca de uma escolha nova feita aqui.
      let unidadesDoAlvo: string[] = [];
      if (payload.decisao === "duplicada") {
        const alvo = pkg.cards.find(c => c.id === String(payload.duplicadaDe));
        const decisaoDoAlvo = reviews.decisions.find(d => d.cardId === alvo?.id);
        if (!alvo || !duplicataElegivel(card, alvo)) {
          return json(200, { ok: false, error: "duplicada só vale dentro da mesma execução, com os mesmos elementos e o mesmo estado. " +
            "Para a mesma alegação vinda de outra execução, use \"copiar decisão\"." });
        }
        if (decisaoDoAlvo?.status !== "reviewed") return json(200, { ok: false, error: "o cartão apontado ainda não foi decidido" });
        unidadesDoAlvo = [...(decisaoDoAlvo.atoms[0]?.unitIds ?? [])];
      }

      // Um átomo por cartão é o andaime, não uma decisão: dividir uma alegação composta em vários
      // átomos continua sendo trabalho da autora, e por ora ela o faz editando `reviews.json`.
      // Cartão com segmentos (D-60): só os sujeitos da cena escolhida; a validação é a do scorer.
      const sujeitos = (card.segmentos ? card.subjects.filter(s => s.scene === String(payload.cena)) : card.subjects).map(s => s.id);
      const atom = {
        id: "a1",
        text: card.observed ?? card.description,
        subjects: sujeitos,
        unitIds: payload.decisao === "defeito-do-gabarito" ? [...payload.unitIds] : unidadesDoAlvo,
        citation: payload.citacao as "supported" | "unsupported" | "uncertain",
        decisao: payload.decisao as keyof typeof DECISOES,
        ...(payload.decisao === "duplicada" ? { duplicateOf: { cardId: String(payload.duplicadaDe), atomId: "a1" } } : {}),
      };
      // Alegação composta: o scorer credita UMA unidade por (átomo × sujeito), então duas afirmações
      // num mesmo cartão só valem duas unidades como dois átomos. `atomos` chega pronto de quem
      // decide — a bancada não divide nada por conta própria — e passa pelo mesmo scorer ao gravar.
      // NAT-72: cada parte diz os PRÓPRIOS sujeitos (antes todas recebiam todos, e a parte certa
      // emprestava crédito ao sujeito extra); vínculo de revisão só com relação, estado e evidência.
      const compostos = (payload as unknown as { atomos?: PedidoAtomo[] }).atomos;
      let atoms: RawReviewAtom[] = [atom];
      if (compostos?.length) {
        const segmento = card.segmentos?.find(o => o.scene === String(payload.cena));
        const m = montarAtomos(pkg, card, segmento?.scene ?? null, reviewer, sujeitos,
          segmento ? segmento.candidateUnitIds : card.candidateUnitIds, compostos);
        if (!m.ok) return json(200, { ok: false, error: m.erro });
        atoms = m.atoms;
      }
      const next: RawReviews = {
        ...reviews,
        decisions: reviews.decisions.map(d => d.cardId !== card.id ? d : {
          ...d, status: "reviewed" as const, reviewer, rationale: String(payload.rationale),
          complete: true, evidenceRefs: [...payload.evidenceRefs], atoms,
          ...(card.segmentos ? { cena: String(payload.cena) } : {}),
        }),
      };
      try {
        persist(next);
      } catch (error) {
        return json(200, { ok: false, error: (error as Error).message });
      }
      logTime({ event: "decidiu", cardId: card.id, decisao: payload.decisao, segundos: payload.segundos });
      return json(200, { ok: true, state: state() });
    });
    return;
  }
  return json(404, { error: "rota desconhecida" });
});

server.listen(port, "127.0.0.1", () => {
  const t = timingSummary();
  logTime({ event: "sessao-inicio", pacote: basename(pkgDir) });
  console.log(`Bancada de revisão cega em http://127.0.0.1:${port}`);
  console.log(`Pacote: ${pkgDir}`);
  console.log(`Revisora: ${reviewer} · ${pkg.cards.length} cartões · já decididos com relógio: ${t.decididos}`);
  console.log(`O relógio grava em ${basename(timingPath)}; é ele que substitui a taxa declarada por medida (D-06).`);
  console.log(`A narrativa livre da execução não é servida a esta página, e ${dirname(pkgPath) === pkgDir ? "package.json" : "o pacote"} não deve ser aberto durante a decisão.`);
});
