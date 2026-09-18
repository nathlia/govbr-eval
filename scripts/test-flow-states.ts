/**
 * Estado como MEDIDA, não como rótulo (fatia 3).
 *
 * Até a fatia 2 o campo `state` de cada spec entrava no id da unidade e mais nada: nenhum código
 * lia o valor, e a promessa de `_meta.setup_rationale` — a sequência é aditiva, nada que o gabarito
 * ancora deixa de existir — vivia num comentário. O mesmo valia para `conditional`, cuja
 * documentação diz "a unidade só existe no estado declarado; nunca é presumida no primeiro paint".
 *
 * Estas fixtures existem para que as duas promessas FALHEM quando forem falsas. Nenhuma delas abre
 * navegador: a medida de presença é uma função sobre resoluções por estado, e é aí que ela é
 * cobrada. A conferência contra a página viva fica no `test:fatia6`, que prepara o pacote sobre o
 * build congelado e o gabarito real.
 */

import assert from "node:assert/strict";
import type { FlowGroundTruth } from "../types";
import type { ElementRef, Resolution, StateResolutions } from "./anchors";
import { resolveSelectors } from "./anchors";
import { buildFlowUnits, measureStatePresence, statesOfGroundTruth } from "./units-flow";

let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

const campo: ElementRef = { key: "body>input", id: "E-campo", label: "<input#cpf>", hidden: null };
const erro: ElementRef = { key: "body>p", id: "E-erro", label: "<p.mensagem-erro-cpf>", hidden: null };
const barra: ElementRef = { key: "body>header", id: "E-barra", label: "<header.barra-recursos>", hidden: null };

/** Uma resolução com os elementos indicados, cada um alcançado por um seletor de mesmo nome. */
function resolution(refs: ElementRef[], selectors: Record<string, string[]>): Resolution {
  return {
    url: "http://fixture/fluxo.html",
    byKey: new Map(refs.map(r => [r.key, r])),
    bySelector: new Map(Object.entries(selectors).map(([selector, keys]) => [
      selector, { selector, ok: true, error: null, keys },
    ])),
  };
}

/** Duas paradas: o primeiro paint e o estado depois do submit em branco. */
function across(inicial: Resolution, apos: Resolution): StateResolutions {
  return {
    url: inicial.url,
    order: ["inicial", "apos-submit-vazio"],
    byState: new Map([["inicial", inicial], ["apos-submit-vazio", apos]]),
  };
}

const SEM_ERRO = resolution([campo, barra], { "#cpf": [campo.key], ".barra-recursos": [barra.key], ".mensagem-erro-cpf": [] });
const COM_ERRO = resolution([campo, barra, erro], { "#cpf": [campo.key], ".barra-recursos": [barra.key], ".mensagem-erro-cpf": [erro.key] });

function gabarito(violations: FlowGroundTruth["violations"]): FlowGroundTruth {
  return {
    _meta: {
      page: "fixture", url: "/fluxo.html",
      setup: [{ action: "click", selector: ".acao-continuar" }, { action: "wait", selector: ".mensagem-erro-cpf" }],
      states: [{ id: "inicial", afterStep: 0 }, { id: "apos-submit-vazio", afterStep: 2 }],
    },
    violations,
  };
}

const spec = (over: Partial<FlowGroundTruth["violations"][number]>): FlowGroundTruth["violations"][number] => ({
  id: "V-fx", anchor: "#cpf", scope: "unico", rules: ["wcag:1.3.1"], categories: ["form"],
  description: "fixture", ...over,
});

// ── A promessa de aditividade ────────────────────────────────────────────────

test("um elemento que nasce no meio do caminho é aditivo e não é defeito", () => {
  const { presence, defects } = measureStatePresence(across(SEM_ERRO, COM_ERRO));
  assert.deepEqual(defects, []);
  assert.deepEqual(presence.statesOfKey.get(campo.key), ["inicial", "apos-submit-vazio"]);
  assert.deepEqual(presence.statesOfKey.get(erro.key), ["apos-submit-vazio"]);
});

test("um elemento ancorado que DESAPARECE quebra a aditividade e para a medida", () => {
  // A sequência destrói o campo em vez de só fazer nascer a mensagem: é a premissa do gabarito
  // sendo falsa para esta página, e é o que nada acusava antes.
  const some = resolution([erro], { "#cpf": [], ".barra-recursos": [], ".mensagem-erro-cpf": [erro.key] });
  const { defects } = measureStatePresence(across(SEM_ERRO, some));
  assert.equal(defects.length, 2, "campo e barra desaparecem");
  assert.equal(defects[0].specId, "_meta.setup");
  assert.match(defects[0].problem, /NÃO é aditiva/);
  assert.match(defects.map(d => d.problem).join(" "), /desaparece em apos-submit-vazio/);
});

// ── A promessa de cada spec ──────────────────────────────────────────────────

test('state "sempre" é cobrado contra todos os estados medidos', () => {
  const gt = gabarito([spec({ id: "V-erro", anchor: ".mensagem-erro-cpf", state: "sempre" })]);
  const { presence } = measureStatePresence(across(SEM_ERRO, COM_ERRO));
  const built = buildFlowUnits(gt, COM_ERRO, presence);
  assert.equal(built.units.length, 0, "unidade não é construída sobre promessa falsa");
  assert.equal(built.defects.length, 1);
  assert.match(built.defects[0].problem, /state "sempre", mas .* não existe em: inicial/);
});

test("conditional: true é cobrado ao contrário — a unidade não pode existir antes", () => {
  const gt = gabarito([spec({ id: "V-campo", anchor: "#cpf", state: "apos-submit-vazio", conditional: true })]);
  const { presence } = measureStatePresence(across(SEM_ERRO, COM_ERRO));
  const built = buildFlowUnits(gt, COM_ERRO, presence);
  assert.equal(built.units.length, 0);
  assert.match(built.defects[0].problem, /conditional: true, mas .* já existe antes de "apos-submit-vazio": inicial/);
});

test("a spec condicional correta constrói, e a unidade carrega os estados MEDIDOS", () => {
  const gt = gabarito([
    spec({ id: "V-erro", anchor: ".mensagem-erro-cpf", state: "apos-submit-vazio", conditional: true }),
    spec({ id: "V-campo", anchor: "#cpf", state: "sempre" }),
  ]);
  const { presence } = measureStatePresence(across(SEM_ERRO, COM_ERRO));
  const built = buildFlowUnits(gt, COM_ERRO, presence);
  assert.deepEqual(built.defects, []);
  assert.equal(built.units.length, 2);
  assert.deepEqual(built.units.find(u => u.specId === "V-erro")!.states, ["apos-submit-vazio"]);
  assert.deepEqual(built.units.find(u => u.specId === "V-campo")!.states, ["inicial", "apos-submit-vazio"]);
});

test("conditional com state 'sempre' é contradição declarada, e não um caso a resolver", () => {
  const gt = gabarito([spec({ id: "V-x", anchor: "#cpf", state: "sempre", conditional: true })]);
  const { presence } = measureStatePresence(across(SEM_ERRO, COM_ERRO));
  const built = buildFlowUnits(gt, COM_ERRO, presence);
  assert.equal(built.units.length, 0);
  assert.match(built.defects[0].problem, /não pode ser condicional e existir sempre/);
});

test("um state que _meta.states não declara para a construção em vez de ser ignorado", () => {
  const gt = gabarito([spec({ id: "V-x", anchor: "#cpf", state: "apos-logout" })]);
  const { presence } = measureStatePresence(across(SEM_ERRO, COM_ERRO));
  const built = buildFlowUnits(gt, COM_ERRO, presence);
  assert.equal(built.units.length, 0);
  assert.match(built.defects[0].problem, /não está declarado em _meta\.states/);
});

// ── Ausência de medida não é medida ──────────────────────────────────────────

test("sem _meta.states nada de estado é cobrado, e a unidade não finge estados medidos", () => {
  const gt = gabarito([spec({ id: "V-erro", anchor: ".mensagem-erro-cpf", state: "sempre" })]);
  delete (gt._meta as { states?: unknown }).states;
  assert.equal(statesOfGroundTruth(gt), null);
  const built = buildFlowUnits(gt, COM_ERRO);
  assert.deepEqual(built.defects, [], "a promessa falsa passa — é o comportamento de antes da fatia 3");
  assert.deepEqual(built.units[0].states, [], "e o vazio diz que ninguém mediu");
});

test("composição: a unidade só é alcançável onde TODOS os participantes existem", () => {
  const gt = gabarito([spec({
    id: "V-comp", anchor: ".conjunto", scope: "composicao", participantCount: 2, state: "apos-submit-vazio",
  })]);
  const conjunto = { ...COM_ERRO, bySelector: new Map(COM_ERRO.bySelector).set(".conjunto",
    { selector: ".conjunto", ok: true, error: null, keys: [campo.key, erro.key] }) };
  const conjuntoInicial = { ...SEM_ERRO, bySelector: new Map(SEM_ERRO.bySelector).set(".conjunto",
    { selector: ".conjunto", ok: true, error: null, keys: [campo.key] }) };
  const { presence } = measureStatePresence(across(conjuntoInicial, conjunto));
  const built = buildFlowUnits(gt, conjunto, presence);
  assert.deepEqual(built.defects, []);
  // O campo existe desde o primeiro paint, a mensagem não: a composição só existe depois do submit.
  assert.deepEqual(built.units[0].states, ["apos-submit-vazio"]);
});

// ── Elemento oculto ──────────────────────────────────────────────────────────

/**
 * A chave canônica é estrutural: oculto e visível produzem exatamente a mesma chave. Sem medir a
 * visibilidade, uma unidade ancorada em elemento invisível — ou uma alegação sobre ele — chegaria à
 * revisão indistinguível de qualquer outra. Isto abre navegador porque a pergunta só a página
 * responde.
 */
async function testeDeElementoOculto(): Promise<void> {
  const html = `<!doctype html><html><body>
    <p class="alvo" id="visivel">visível</p>
    <p class="alvo" id="sem-display" style="display:none">escondido por display</p>
    <p class="alvo" id="sem-visibilidade" style="visibility:hidden">escondido por visibility</p>
    <div aria-hidden="true"><p class="alvo" id="fora-da-arvore">fora da árvore de acessibilidade</p></div>
    <p class="alvo" id="atributo" hidden>escondido pelo atributo</p>
  </body></html>`;
  const res = await resolveSelectors(`data:text/html,${encodeURIComponent(html)}`, [".alvo"]);
  const porId = (domId: string) => [...res.byKey.values()].find(e => e.label.includes(`#${domId}`));

  assert.equal(res.bySelector.get(".alvo")?.keys.length, 5, "todos os cinco resolvem: ocultar não some da árvore");
  assert.equal(porId("visivel")?.hidden, null, "o visível não carrega motivo");
  assert.match(porId("sem-display")!.hidden!, /nao-renderizado/);
  assert.match(porId("sem-visibilidade")!.hidden!, /nao-renderizado/);
  assert.match(porId("fora-da-arvore")!.hidden!, /aria-hidden/);
  assert.match(porId("atributo")!.hidden!, /nao-renderizado|atributo hidden/);
  tests++;
  console.log("ok elemento oculto resolve como qualquer outro, mas chega à revisão dizendo que está oculto");
}

testeDeElementoOculto().then(() => {
  console.log(`${tests} state-measurement tests passed.`);
}).catch(err => { console.error(err); process.exit(1); });
