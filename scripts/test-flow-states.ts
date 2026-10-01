/**
 * Estado como MEDIDA, não como rótulo (fatia 3).
 *
 * Até a fatia 2 o campo `state` de cada spec entrava no id da unidade e mais nada: nenhum código
 * lia o valor, e a promessa de `_meta.setup_rationale` — a sequência é aditiva, nada que o gabarito
 * ancora deixa de existir — vivia num comentário. O mesmo valia para `conditional`, cuja
 * documentação diz "a unidade só existe no estado declarado; nunca é presumida no primeiro paint".
 *
 * Estas fixtures existem para que as duas promessas FALHEM quando forem falsas. As de presença não
 * abrem navegador: a medida é uma função sobre resoluções por estado, e é aí que ela é cobrada. A
 * conferência contra a página viva fica no `test:fatia6`, que prepara o pacote sobre o build
 * congelado e o gabarito real.
 *
 * As de NAVEGAÇÃO (D-57) abrem: uma SPA mínima servida em HTTP local, com pushState, porque só a
 * página diz se o `navigate` trocou de rota sem recarregar, em que endereço cada parada ficou e
 * se a aditividade foi cobrada dentro do segmento e dispensada entre segmentos.
 */

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import type { FlowGroundTruth, FlowSetupStep } from "../types";
import type { ElementRef, Resolution, StateCheckpoint, StateResolutions } from "./anchors";
import {
  abrirEntradaDireta, entradaDireta, exigeSegmentoUnico, impressaoDaArvore, openPage, preparePage, resolveSelectors,
  resolveStatesOnPage, runSetupSteps, segmentosDasParadas,
} from "./anchors";
import { buildFlowUnits, buildFlowUnitsAcross, measureStatePresence, specMedidaNoEstado, statesOfGroundTruth } from "./units-flow";

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

// ── Navegação dentro da aplicação (D-57) ─────────────────────────────────────

/**
 * Uma SPA mínima, servida por HTTP local (pushState precisa de origem de verdade): `/app/lista` e
 * `/app/detalhe` desenhados pelo mesmo documento, links internos com `data-spa` e um link comum
 * que RECARREGA — o caso que o `navigate` tem de recusar.
 */
const SPA = `<!doctype html><html><head><meta charset="utf-8"><title>spa</title></head><body>
  <nav class="menu"><a id="ir-detalhe" data-spa href="/app/detalhe">Detalhe</a>
    <a id="ir-lista" data-spa href="/app/lista">Lista</a> <a id="ir-recarga" href="/app/detalhe">Recarga</a></nav>
  <main id="raiz"></main>
  <script>
    // Contador de instância (D-60): como os ids das aplicações reais, depende do caminho percorrido.
    var renders = 0, primeira = location.pathname;
    function render() {
      var raiz = document.getElementById("raiz");
      renders++;
      if (location.pathname === "/app/detalhe") {
        raiz.innerHTML = '<section class="detalhe"><h1 class="titulo">Detalhe</h1>' +
          '<input class="campo" id="campo-' + renders + '">' +
          '<button id="apagar-titulo">apagar</button><button id="abrir-painel">abrir</button></section>';
        // ?diverge: a entrada direta desenha algo que a navegação não desenha.
        if (location.search.indexOf("diverge") >= 0 && primeira === "/app/detalhe") raiz.insertAdjacentHTML("beforeend", '<p class="so-direto">x</p>');
      } else {
        raiz.innerHTML = '<ul class="lista"><li class="item">A</li><li class="item">B</li></ul>' +
          '<button id="abrir-painel">abrir</button><button id="rota-escondida">ir</button><button id="carregar-tarde">tarde</button>';
      }
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-spa]");
      if (a) { e.preventDefault(); history.pushState(null, "", a.getAttribute("href")); render(); return; }
      // ?lento: o painel do detalhe traz uma parte que chega 300 ms depois do seletor esperado.
      if (e.target.id === "abrir-painel" && location.search.indexOf("lento") >= 0) setTimeout(function () { document.getElementById("raiz").insertAdjacentHTML("beforeend", '<p class="tarde">t</p>'); }, 300);
      if (e.target.id === "abrir-painel") { var p = document.createElement("div"); p.className = "painel"; p.textContent = "painel"; document.getElementById("raiz").appendChild(p); }
      if (e.target.id === "apagar-titulo") document.querySelector(".titulo").remove();
      if (e.target.id === "rota-escondida") { history.pushState(null, "", "/app/detalhe"); render(); }
      if (e.target.id === "carregar-tarde") setTimeout(function () { document.getElementById("raiz").insertAdjacentHTML("beforeend", '<p class="tarde">t</p>'); }, 300);
    });
    window.addEventListener("popstate", render);
    render();
  </script></body></html>`;

const SELETORES_SPA = [".menu a", ".item", ".titulo", ".painel", ".detalhe"];

async function testesDeNavegacao(): Promise<void> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(SPA);
  });
  await new Promise<void>(ok => server.listen(0, "127.0.0.1", () => ok()));
  const origem = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const entrada = `${origem}/app/lista`;
  const browser = await chromium.launch();
  const ok = (nome: string) => { tests++; console.log(`ok ${nome}`); };

  /** Abre a SPA numa página nova e varre as paradas, como `conferir:referencia` faz. */
  async function varrer(setup: FlowSetupStep[], states: StateCheckpoint[]) {
    const page = await browser.newPage();
    try {
      await openPage(page, entrada, { waitFor: ".lista" });
      const across = await resolveStatesOnPage(page, entrada, SELETORES_SPA, { setup, states });
      return { across, ...measureStatePresence(across) };
    } finally {
      await page.close();
    }
  }

  const PELO_CLIQUE: FlowSetupStep[] = [
    { action: "click", selector: "#abrir-painel" },
    { action: "wait", selector: ".painel" },
    { action: "navigate", selector: "#ir-detalhe", waitFor: ".detalhe" },
    { action: "click", selector: "#abrir-painel" },
    { action: "wait", selector: ".painel" },
  ];
  const PARADAS: StateCheckpoint[] = [
    { id: "lista", afterStep: 0, path: "/app/lista" },
    { id: "lista-painel", afterStep: 2, path: "/app/lista" },
    { id: "detalhe", afterStep: 3, path: "/app/detalhe" },
    { id: "detalhe-painel", afterStep: 5, path: "/app/detalhe" },
  ];

  try {
    {
      // Navegação por clique: a lista SOME depois do navigate, e isso não é defeito — a aditividade
      // não atravessa a navegação. Dentro de cada segmento, o painel só nasce.
      const { across, presence, defects } = await varrer(PELO_CLIQUE, PARADAS);
      assert.deepEqual(defects, [], "sumir do outro lado de um navigate não quebra a aditividade");
      assert.deepEqual([...across.navigation!.segmentOf.values()], [0, 0, 1, 1]);
      assert.deepEqual([...across.navigation!.pathOf.values()], ["/app/lista", "/app/lista", "/app/detalhe", "/app/detalhe"]);
      const item = across.byState.get("lista")!.bySelector.get(".item")!.keys[0];
      assert.deepEqual(presence.statesOfKey.get(item), ["lista", "lista-painel"], "o item existe só no segmento da lista");
      assert.ok(presence.segmentOf, "com navegação a presença carrega os segmentos");

      // Unidades: cada spec é construída no fim do SEU segmento, e só carrega estados dele.
      const gt: FlowGroundTruth = {
        _meta: { page: "spa", url: "/app/lista", setup: PELO_CLIQUE, states: PARADAS },
        violations: [
          spec({ id: "V-item", anchor: ".item", scope: "todos", expectedCount: 2, state: "lista" }),
          // A mesma chave estrutural (main>div) já existiu na lista, do outro lado do navigate: não é
          // "existir antes" — o condicional é cobrado dentro do segmento.
          spec({ id: "V-painel-detalhe", anchor: ".painel", state: "detalhe-painel", conditional: true }),
          spec({ id: "V-menu", anchor: ".menu a", scope: "todos", expectedCount: 3, state: "sempre" }),
        ],
      };
      const sel = SELETORES_SPA;
      const page = await browser.newPage();
      await openPage(page, entrada, { waitFor: ".lista" });
      const medida = await resolveStatesOnPage(page, entrada, sel, { setup: PELO_CLIQUE, states: PARADAS });
      await page.close();
      const m2 = measureStatePresence(medida);
      const built = buildFlowUnitsAcross(gt, medida, m2.presence);
      assert.deepEqual(built.defects, [], JSON.stringify(built.defects));
      assert.deepEqual(built.units.map(u => u.specId), ["V-item", "V-item", "V-painel-detalhe", "V-menu", "V-menu", "V-menu"]);
      assert.deepEqual(built.units[0].states, ["lista", "lista-painel"]);
      assert.deepEqual(built.units[2].states, ["detalhe-painel"]);
      const painel = medida.byState.get("detalhe-painel")!.bySelector.get(".painel")!.keys[0];
      assert.deepEqual(m2.presence.statesOfKey.get(painel), ["lista-painel", "detalhe-painel"],
        "a mesma chave estrutural resolve nos dois segmentos — e o condicional não a confunde");
      assert.deepEqual(built.units[3].states, ["lista", "lista-painel", "detalhe", "detalhe-painel"]);
      // Predicado de spec com estado declarado só é medido nas paradas do segmento desse estado.
      assert.equal(specMedidaNoEstado(gt.violations[0], "detalhe", m2.presence.segmentOf), false);
      assert.equal(specMedidaNoEstado(gt.violations[0], "lista-painel", m2.presence.segmentOf), true);
      assert.equal(specMedidaNoEstado(gt.violations[2], "detalhe", m2.presence.segmentOf), true);
      ok("navigate por clique: novo segmento, endereço medido, aditividade não atravessa a navegação, unidades por segmento");
    }
    {
      // Navegação por caminho: pushState + popstate, sem recarregar.
      const { across, defects } = await varrer(
        [{ action: "navigate", path: "/app/detalhe", waitFor: ".detalhe" }],
        [{ id: "lista", afterStep: 0, path: "/app/lista" }, { id: "detalhe", afterStep: 1, path: "/app/detalhe" }],
      );
      assert.deepEqual(defects, []);
      assert.equal(across.navigation!.pathOf.get("detalhe"), "/app/detalhe");
      assert.equal(across.navigation!.documentOf.get("lista"), across.navigation!.documentOf.get("detalhe"), "mesmo documento");
      ok("navigate por caminho: mesma origem, mesmo documento, rota nova");
    }
    {
      // Aditividade DENTRO de um segmento continua cobrada: apagar o título depois do navigate.
      const { defects } = await varrer(
        [{ action: "navigate", selector: "#ir-detalhe", waitFor: ".titulo" },
          { action: "click", selector: "#apagar-titulo" }],
        [{ id: "lista", afterStep: 0, path: "/app/lista" }, { id: "detalhe", afterStep: 1, path: "/app/detalhe" },
          { id: "detalhe-sem-titulo", afterStep: 2, path: "/app/detalhe" }],
      );
      assert.equal(defects.length, 1, JSON.stringify(defects));
      assert.equal(defects[0].specId, "_meta.setup");
      assert.match(defects[0].problem, /NÃO é aditiva: .*h1.* desaparece em detalhe-sem-titulo \(segmento 1/);
      ok("aditividade dentro de um segmento continua cobrada depois de um navigate");
    }
    {
      // O MESMO sumiço sem navegação no meio é defeito (a violação que o navigate isenta).
      const { defects } = await varrer(
        [{ action: "click", selector: "#rota-escondida" }, { action: "wait", selector: ".detalhe" }],
        [{ id: "lista", afterStep: 0 }, { id: "depois", afterStep: 2 }],
      );
      assert.match(defects.map(d => d.problem).join("\n"), /NÃO é aditiva: .*li.* desaparece em depois/);
      assert.match(defects.map(d => d.problem).join("\n"), /mudou de endereço entre lista \(\/app\/lista\) e depois \(\/app\/detalhe\) sem passo navigate/);
      ok("troca de rota por um click comum não abre segmento: some = defeito, e o endereço denuncia");
    }
    {
      // Endereço declarado que a página desmente.
      const { defects } = await varrer(PELO_CLIQUE, PARADAS.map(p => p.id === "detalhe" ? { ...p, path: "/app/editar" } : p));
      assert.deepEqual(defects, [{ specId: "_meta.states", problem: "estado detalhe declara path /app/editar, mas a página está em /app/detalhe" }]);
      ok("path declarado diferente do medido é acusado");
    }
    {
      // Recusas: forma, recarga, origem, e quem mede um estado só.
      await assert.rejects(varrer(PELO_CLIQUE, PARADAS.map(({ path: _p, ...r }) => r)), /o setup navega, então a parada declara path/);
      await assert.rejects(varrer([{ action: "navigate", selector: "#ir-detalhe", path: "/app/detalhe", waitFor: ".detalhe" }],
        [{ id: "a", afterStep: 0, path: "/app/lista" }, { id: "b", afterStep: 1, path: "/app/detalhe" }]), /exatamente um de selector/);
      await assert.rejects(varrer([{ action: "navigate", selector: "#ir-detalhe" }],
        [{ id: "a", afterStep: 0, path: "/app/lista" }, { id: "b", afterStep: 1, path: "/app/detalhe" }]), /exige waitFor/);
      await assert.rejects(varrer([{ action: "navigate", selector: "#ir-recarga", waitFor: ".detalhe" }],
        [{ id: "a", afterStep: 0, path: "/app/lista" }, { id: "b", afterStep: 1, path: "/app/detalhe" }]), /documento foi recarregado/);
      await assert.rejects(varrer([{ action: "navigate", path: "//exemplo.invalid/app", waitFor: ".detalhe" }],
        [{ id: "a", afterStep: 0, path: "/app/lista" }, { id: "b", afterStep: 1, path: "/app/detalhe" }]), /caminho absoluto na mesma origem/);
      await assert.rejects(varrer([{ action: "navigate", selector: "#abrir-painel", waitFor: ".painel" }],
        [{ id: "a", afterStep: 0, path: "/app/lista" }, { id: "b", afterStep: 1, path: "/app/lista" }]), /o endereço não mudou/);
      await assert.rejects(varrer([{ action: "scroll" as FlowSetupStep["action"], selector: "#x" }],
        [{ id: "a", afterStep: 0 }, { id: "b", afterStep: 1 }]), /ação desconhecida/);
      const page = await browser.newPage();
      await assert.rejects(preparePage(page, entrada, { waitFor: ".lista", setup: PELO_CLIQUE }), /mede um estado só.*Recusado/);
      await page.close();
      assert.throws(() => exigeSegmentoUnico(PELO_CLIQUE, "consumidor"), /1 passo\(s\) navigate, 2 segmentos/);
      assert.doesNotThrow(() => exigeSegmentoUnico([{ action: "click", selector: "#a" }], "consumidor"));
      ok("recusas explícitas: path ausente, forma do passo, recarga, outra origem, clique que não navega, ação desconhecida, consumidor de estado único");
    }
    // ── Cenas por segmento (D-60) ───────────────────────────────────────────────
    {
      // Segmentos do plano: a cena de cada um é a ÚLTIMA parada dele.
      const segs = segmentosDasParadas(PELO_CLIQUE, PARADAS);
      assert.deepEqual(segs.map(s => [s.segmento, s.estados, s.ultimo.id]),
        [[0, ["lista", "lista-painel"], "lista-painel"], [1, ["detalhe", "detalhe-painel"], "detalhe-painel"]]);
      // Entrada direta: navigate por clique vira clique + espera; por caminho, a rota com a consulta
      // da entrada, a espera do navigate e o que vem depois. Sem navigate por caminho, o próprio setup.
      assert.deepEqual(entradaDireta(entrada, PELO_CLIQUE, 5), { url: entrada, direta: false, passos: [
        { action: "click", selector: "#abrir-painel" }, { action: "wait", selector: ".painel" },
        { action: "click", selector: "#ir-detalhe" }, { action: "wait", selector: ".detalhe" },
        { action: "click", selector: "#abrir-painel" }, { action: "wait", selector: ".painel" }] });
      const PELO_CAMINHO: FlowSetupStep[] = [
        { action: "click", selector: "#abrir-painel" }, { action: "wait", selector: ".painel" },
        { action: "navigate", path: "/app/detalhe", waitFor: ".detalhe" },
        { action: "click", selector: "#abrir-painel" }, { action: "wait", selector: ".painel" },
      ];
      assert.deepEqual(entradaDireta(`${entrada}?perfil=x`, PELO_CAMINHO, 5), { url: `${origem}/app/detalhe?perfil=x`, direta: true,
        passos: [{ action: "wait", selector: ".detalhe" }, { action: "click", selector: "#abrir-painel" }, { action: "wait", selector: ".painel" }] });
      assert.deepEqual(entradaDireta(entrada, PELO_CAMINHO, 2).direta, false, "antes do navigate, a entrada de sempre");
      assert.deepEqual(entradaDireta(entrada, [], 0), { url: entrada, direta: false, passos: [] });
      ok("segmentos do plano e entrada direta: clique traduzido, caminho vira rota com a consulta da entrada");
    }
    {
      // Navegando e entrando direto, a árvore é a mesma — só o id numerado por contador difere, e a
      // impressão não o vê. Medido, não presumido.
      const PELO_CAMINHO: FlowSetupStep[] = [{ action: "navigate", path: "/app/detalhe", waitFor: ".detalhe" },
        { action: "click", selector: "#abrir-painel" }, { action: "wait", selector: ".painel" }];
      const page = await browser.newPage();
      await openPage(page, entrada, { waitFor: ".lista" });
      await runSetupSteps(page, PELO_CAMINHO);
      const navegando = await impressaoDaArvore(page);
      const idNavegando = await page.getAttribute(".campo", "id");
      const alcance = entradaDireta(entrada, PELO_CAMINHO, 3);
      const direta = await abrirEntradaDireta(browser, { width: 1280, height: 900 }, alcance, navegando, "teste");
      const idDireto = await direta.page.getAttribute(".campo", "id");
      assert.notEqual(idNavegando, idDireto, "o contador numera diferente nos dois caminhos");
      assert.deepEqual(await impressaoDaArvore(direta.page), navegando);
      await direta.close();
      // ?diverge: a entrada direta desenha um elemento a mais — e é recusada.
      const divergente = entradaDireta(`${entrada}?diverge=1`, PELO_CAMINHO, 3);
      await assert.rejects(abrirEntradaDireta(browser, { width: 1280, height: 900 }, divergente, navegando, "teste"),
        /não reproduz a árvore alcançada navegando[\s\S]*só entrada direta: .*p.*"x"/);
      // ?lento: a entrada direta ainda está mudando quando o último passo termina — o scanner varreria antes.
      const lenta = entradaDireta(`${entrada}?lento=1`, PELO_CAMINHO, 3);
      await assert.rejects(abrirEntradaDireta(browser, { width: 1280, height: 900 }, lenta, navegando, "teste"),
        /ainda muda depois do último passo/);
      await page.close();
      ok("entrada direta: mesma árvore apesar do id por contador; árvore diferente ou ainda carregando é recusada");
    }
    {
      // Parada instável: o clique faz algo chegar 300 ms depois, e nenhuma espera o declara.
      const instavel: FlowSetupStep[] = [{ action: "click", selector: "#carregar-tarde" },
        { action: "navigate", path: "/app/detalhe", waitFor: ".detalhe" }];
      const states: StateCheckpoint[] = [{ id: "lista", afterStep: 0, path: "/app/lista" },
        { id: "tarde", afterStep: 1, path: "/app/lista" }, { id: "detalhe", afterStep: 2, path: "/app/detalhe" }];
      const page = await browser.newPage();
      await openPage(page, entrada, { waitFor: ".lista" });
      const medida = measureStatePresence(await resolveStatesOnPage(page, entrada, SELETORES_SPA, { setup: instavel, states, estabilidade: true }));
      await page.close();
      assert.equal(medida.defects.length, 1, JSON.stringify(medida.defects));
      assert.match(medida.defects[0].problem, /a parada tarde não é estável: .*só até 1000 ms depois: .*"t"/);
      // Declarando a espera, a mesma parada é estável.
      const comEspera: FlowSetupStep[] = [instavel[0], { action: "wait", selector: ".tarde" }, instavel[1]];
      const page2 = await browser.newPage();
      await openPage(page2, entrada, { waitFor: ".lista" });
      const ok2 = measureStatePresence(await resolveStatesOnPage(page2, entrada, SELETORES_SPA, { setup: comEspera,
        states: states.map(s => s.id === "tarde" ? { ...s, afterStep: 2 } : s.id === "detalhe" ? { ...s, afterStep: 3 } : s), estabilidade: true }));
      await page2.close();
      assert.deepEqual(ok2.defects, []);
      ok("parada que muda depois do último passo é acusada; com a espera declarada, estável");
    }
  } finally {
    await browser.close();
    server.close();
  }
}

testeDeElementoOculto().then(testesDeNavegacao).then(() => {
  console.log(`${tests} state-measurement tests passed.`);
}).catch(err => { console.error(err); process.exit(1); });
