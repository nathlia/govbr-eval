/**
 * Preparo das cenas de um pacote de revisão a partir da página congelada: o ramo SEM navegação (uma
 * página nova por janela planejada) e o ramo SEGMENTADO (D-60: uma página por janela, varrendo todas as
 * paradas, com uma cena por segmento capturada na última parada dele), mais a conversão da linha de
 * base em execuções do pacote.
 *
 * POR QUE ESTE ARQUIVO É UMA CÓPIA (NAT-51). O código abaixo é o de `semantic-flow-cli.ts prepare`,
 * copiado texto a texto. Ele não pode ser importado de lá (o CLI executa `main()` ao carregar) nem
 * movido para cá: `semantic-flow-cli.ts` está em SCORER_FILES, o `scorerHash` entra no contexto do
 * pacote e, por ele, no id de todo cartão (`C-${digest({ context, … })}`), e `mapearDecisoes`
 * recusa transpor decisões entre pacotes de scorer diferente. Mexer no CLI deixaria a campanha
 * congelada `t7-tela-a-01` (rev-002 final) sem como ser recalculada: todos os cartões voltariam
 * pendentes. Por isso o CLI fica byte a byte intacto, e a análise T6 (`analisar-execucao.ts`) importa
 * DAQUI os dois ramos.
 *
 * Guarda de deriva: `npm run test:analisar` compara cada região de `REGIOES_DO_CLI` aqui e lá
 * (indentação ignorada) e falha se divergirem. Quando o scorer mudar de versão por outro motivo (o
 * hash muda de qualquer jeito), o CLI passa a importar este módulo e a guarda sai.
 *
 * Este arquivo NÃO está em SCORER_FILES: não decide o que um pacote significa — o que decide (unidades,
 * cartões, pontuação) continua em semantic-flow.ts / units-flow.ts / anchors.ts, todos no hash.
 */
import type { Browser } from "playwright";
import type { FlowAgentResults, FlowGroundTruth, FlowViewport } from "../types";
import {
  abrirEntradaDireta, entradaDireta, impressaoDaArvore, openPage, preparePage, resolveOnPage, resolveStatesOnPage,
  resolveWithExcept, segmentoApos, type Resolution,
} from "./anchors";
import { combinePredicate, measurePredicate, type PredicateResult } from "./acceptance-predicates";
import {
  buildFlowUnits, buildFlowUnitsAcross, measureStatePresence, specMedidaNoEstado, statesOfGroundTruth, type FlowUnit,
} from "./units-flow";
import { sceneIdOf, type PrepareRun, type SceneResolution } from "./semantic-flow";
import { statePlanOf, type CenaDoPlano } from "./collection-manifest";
import type { FlowBaselines } from "./run-baselines-flow";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";

/** Baseline claims become runs of the package: same cards, same review, same matching. */
function baselineRuns(baseline: FlowBaselines, build: string, steps: string[]): PrepareRun[] {
  const config = (tool: string) => ({ instrumentVersion: FLOW_INSTRUMENT_VERSION,
    // A versão é a do ARQUIVO lido: uma linha de base 2.0.0 de bateria fechada não vira 2.1.0 ao ser relida (D-54).
    protocolVersion: `${baseline.baselineVersion}:${tool}`, siteManifestSha256: build });
  const run = (id: string, tool: string, findings: unknown[], seconds: number): PrepareRun => ({
    id, kind: "linha-de-base", tool,
    data: { model: tool, timestamp: baseline.timestamp, appUrl: baseline.appUrl, findings: findings as FlowAgentResults["findings"],
      config: config(tool) as FlowAgentResults["config"],
      cost: { wallClockSeconds: seconds, totalCostUsd: 0 } as unknown as FlowAgentResults["cost"] },
  });
  // Com cenas por segmento (D-60) a passada diz até que parada o setup correu.
  const pass = (p: FlowBaselines["passes"][number]) => ({ scene: p.id, viewport: p.viewport,
    steps: p.segmento ? [`setup do plano de estados até ${p.segmento.estado} (${p.segmento.afterStep} passo(s))`] : steps });
  return [
    run("linha-de-base/validator-nao-guiada", "govbr-ds-validator scan-page (não guiada)",
      baseline.passes.flatMap(p => p.validator.unguided.findings.map(f => ({ selector: f.target, rule: f.rule,
        observed: f.description, expected: f.expected, ...pass(p) }))),
      baseline.passes.reduce((n, p) => n + p.validator.unguided.seconds, 0)),
    run("linha-de-base/axe", "axe-core",
      baseline.passes.flatMap(p => p.axe.findings.map(f => ({ selector: f.target, rule: `axe:${f.rule}`,
        observed: f.description, expected: null, ...pass(p) }))),
      baseline.passes.reduce((n, p) => n + p.axe.seconds, 0)),
  ];
}

/** Como a cena de um segmento foi reproduzida por entrada direta (D-60), quando foi. */
interface EntradaDaCena { url: string; passos: number; seletores: string[] }

/** Cenas por segmento, agrupadas por janela, na ordem do plano. */
function janelasSegmentadas(cenas: CenaDoPlano[]): { viewport: FlowViewport; cenas: CenaDoPlano[] }[] {
  const out: { viewport: FlowViewport; cenas: CenaDoPlano[] }[] = [];
  for (const c of cenas) {
    const j = out.find(x => sceneIdOf(x.viewport) === sceneIdOf(c.viewport));
    if (j) j.cenas.push(c); else out.push({ viewport: c.viewport, cenas: [c] });
  }
  return out;
}

/**
 * Uma janela de um plano que navega (D-60): uma página, todas as paradas no MESMO carregamento, e a
 * cena de cada segmento capturada (HTML, imagem e resolução) na última parada dele — onde as unidades
 * das specs daquele segmento são construídas (`buildFlowUnitsAcross`, a mesma construção da
 * `conferir:referencia`). Cada predicado é medido só nas paradas do segmento da sua spec.
 *
 * Quem mede por ENTRADA DIRETA — o scanner do oráculo na linha de base, e o próprio oráculo nas
 * execuções — cita seletores daquela página, e ids numerados por contador mudam com o caminho
 * percorrido. Então, para cada cena alcançada por `navigate` por caminho, a entrada direta é aberta,
 * sua árvore é conferida contra a navegada (diverge → para), e todo seletor de alegação que não
 * alcança nada navegando e alcança na entrada direta é resolvido lá. A lista desses seletores fica em
 * `capture.json`.
 */
async function prepararJanelaSegmentada(
  browser: Browser, gt: FlowGroundTruth, url: string, janela: { viewport: FlowViewport; cenas: CenaDoPlano[] },
  selectors: string[], claimSelectors: string[],
): Promise<{ scenes: (SceneResolution & { html: string; image: Buffer; entrada?: EntradaDaCena })[]; units: (FlowUnit & { scene: string })[] }> {
  const setup = gt._meta.setup ?? [];
  const checkpoints = statesOfGroundTruth(gt);
  if (!checkpoints) throw new Error("O setup navega e _meta.states não declara paradas: não há segmento a capturar");
  const specIds = janela.cenas.flatMap(c => c.specIds);
  const segmentOf = new Map(checkpoints.map(c => [c.id, segmentoApos(setup, c.afterStep)] as const));
  const context = await browser.newContext({ viewport: janela.viewport });
  try {
    const page = await context.newPage();
    await openPage(page, url, { waitFor: gt._meta.waitFor });
    const aceitacao = new Map<string, PredicateResult[]>();
    const capturas = new Map<string, { html: string; image: Buffer; impressao: string[] }>();
    const across = await resolveStatesOnPage(page, url, selectors, {
      setup, states: checkpoints, estabilidade: true,
      onState: async (state, res, pg) => {
        for (const spec of gt.violations) {
          if (!spec.acceptance || !specIds.includes(spec.id) || !specMedidaNoEstado(spec, state, segmentOf)) continue;
          const keys = resolveWithExcept(res, spec.anchor, spec.except);
          if (keys.length === 0) continue;
          aceitacao.set(spec.id, [...(aceitacao.get(spec.id) ?? []), await measurePredicate(pg, spec.anchor, keys, spec.acceptance, state)]);
        }
        if (janela.cenas.some(c => c.segmento!.estado === state)) {
          capturas.set(state, { html: await pg.content(), image: await pg.screenshot({ fullPage: true }), impressao: await impressaoDaArvore(pg) });
        }
      },
    });
    const id = sceneIdOf(janela.viewport);
    const medida = measureStatePresence(across);
    if (medida.defects.length) throw new Error(JSON.stringify({ scene: id, defects: medida.defects }));
    const built = buildFlowUnitsAcross({ ...gt, violations: gt.violations.filter(v => specIds.includes(v.id)) }, across, medida.presence);
    if (built.defects.length) throw new Error(JSON.stringify({ scene: id, defects: built.defects }));
    const desmentidas = built.units
      .map(u => ({ u, r: combinePredicate(aceitacao.get(u.specId) ?? []) }))
      .filter(({ r }) => r.outcome === "refuta" || r.outcome === "nao-replicavel");
    if (desmentidas.length) {
      throw new Error(JSON.stringify({ scene: id, defects: desmentidas.map(({ u, r }) => ({
        specId: u.specId, problem: `predicado de aceitação ${r.outcome}: ${r.reason}`,
      })) }));
    }
    const units = built.units.map(u => {
      u.acceptance = combinePredicate(aceitacao.get(u.specId) ?? []);
      return { ...u, scene: janela.cenas.find(c => c.specIds.includes(u.specId))!.id };
    });

    const scenes: (SceneResolution & { html: string; image: Buffer; entrada?: EntradaDaCena })[] = [];
    for (const cena of janela.cenas) {
      const seg = cena.segmento!;
      const captura = capturas.get(seg.estado)!;
      const navegando = across.byState.get(seg.estado)!;
      const resolution: Resolution = { url, bySelector: new Map(navegando.bySelector), byKey: new Map(navegando.byKey) };
      let entrada: EntradaDaCena | undefined;
      const alcance = entradaDireta(url, setup, seg.afterStep);
      if (alcance.direta) {
        const direta = await abrirEntradaDireta(browser, janela.viewport, alcance, captura.impressao, `cena ${cena.id}`);
        try {
          const lida = await resolveOnPage(direta.page, claimSelectors);
          const seletores: string[] = [];
          for (const s of [...new Set(claimSelectors)]) {
            const aqui = resolution.bySelector.get(s);
            const la = lida.bySelector.get(s);
            if (!aqui?.ok || aqui.keys.length > 0 || !la?.ok || la.keys.length === 0) continue;
            resolution.bySelector.set(s, la);
            for (const k of la.keys) if (!resolution.byKey.has(k)) resolution.byKey.set(k, lida.byKey.get(k)!);
            seletores.push(s);
          }
          const endereco = new URL(alcance.url);
          entrada = { url: endereco.pathname + endereco.search, passos: alcance.passos.length, seletores: seletores.sort() };
        } finally {
          await direta.close();
        }
      }
      scenes.push({ id: cena.id, viewport: cena.viewport, specIds: cena.specIds, resolution,
        segmento: { numero: seg.numero, estado: seg.estado, path: seg.path, estados: seg.estados },
        html: captura.html, image: captura.image, ...(entrada ? { entrada } : {}) });
    }
    return { scenes, units };
  } finally {
    await context.close();
  }
}

/** Cena preparada: resolução, HTML e captura; `entrada` só nas cenas de segmento abertas por entrada direta. */
export type CenaPreparada = SceneResolution & { html: string; image: Buffer; entrada?: EntradaDaCena };

/**
 * As cenas e unidades do plano, exatamente como `semantic-flow-cli.ts prepare` as monta: com navegação,
 * uma cena por segmento de cada janela; sem navegação, uma cena por janela no fim do setup. `selectors`
 * são todos os seletores a resolver (referência, alegações e linha de base); `claimSelectors`, só os de
 * alegação e linha de base (os que a entrada direta pode resolver).
 */
export async function prepararCenas(a: {
  browser: Browser; gt: FlowGroundTruth; url: string; cenas: CenaDoPlano[]; selectors: string[]; claimSelectors: string[];
}): Promise<{ scenes: CenaPreparada[]; units: (FlowUnit & { scene: string })[] }> {
  const { browser, gt, url, cenas, selectors, claimSelectors } = a;
  const plan = statePlanOf(gt);
  const planned = cenas.map(c => ({ viewport: c.viewport, specIds: c.specIds }));
  const scenes: CenaPreparada[] = [];
  const units: (FlowUnit & { scene: string })[] = [];
  if (plan.paradas) {
    // Com navegação (D-60): uma página por janela, varrendo todas as paradas, com a cena de cada
    // segmento capturada na última parada dele.
    for (const janela of janelasSegmentadas(cenas)) {
      const r = await prepararJanelaSegmentada(browser, gt, url, janela, selectors, claimSelectors);
      scenes.push(...r.scenes);
      units.push(...r.units);
    }
  }
  // One fresh page per planned window, each brought to the reference state: selectors, units and
  // captures of a scene all come from that same page.
  for (const p of plan.paradas ? [] : planned) {
    const context = await browser.newContext({ viewport: p.viewport });
    const page = await context.newPage();
    const id = sceneIdOf(p.viewport);
    // Estados declarados: resolve em cada parada do `setup`, no MESMO carregamento, para medir em
    // que estados cada elemento existe. Sem `_meta.states` a preparação volta ao estado único de
    // antes — ausência de medida não vira medida.
    const checkpoints = statesOfGroundTruth(gt);
    let resolution: Resolution;
    let presence: ReturnType<typeof measureStatePresence>["presence"] | undefined;
    const aceitacao = new Map<string, PredicateResult[]>();
    if (checkpoints) {
      await openPage(page, url, { waitFor: gt._meta.waitFor });
      const across = await resolveStatesOnPage(page, url, selectors, {
        setup: gt._meta.setup, states: checkpoints,
        // Cada predicado é medido NO estado a que a spec pertence. Depois da varredura a página
        // está no último estado, e medir tudo lá mediria um estado cobrando outro.
        onState: async (state, res, pg) => {
          for (const spec of gt.violations) {
            if (!spec.acceptance || !p.specIds.includes(spec.id)) continue;
            const keys = resolveWithExcept(res, spec.anchor, spec.except);
            if (keys.length === 0) continue; // ainda não existe neste estado; a presença já cobra isso
            const medido = await measurePredicate(pg, spec.anchor, keys, spec.acceptance, state);
            aceitacao.set(spec.id, [...(aceitacao.get(spec.id) ?? []), medido]);
          }
        },
      });
      const medida = measureStatePresence(across);
      if (medida.defects.length) throw new Error(JSON.stringify({ scene: id, defects: medida.defects }));
      presence = medida.presence;
      resolution = across.byState.get(across.order[across.order.length - 1])!;
    } else {
      await preparePage(page, url, { waitFor: gt._meta.waitFor, setup: gt._meta.setup });
      resolution = { url, ...await resolveOnPage(page, selectors) };
    }
    const built = buildFlowUnits({ ...gt, violations: gt.violations.filter(v => p.specIds.includes(v.id)) }, resolution, presence);
    if (built.defects.length) throw new Error(JSON.stringify({ scene: id, defects: built.defects }));

    // O predicado declarado tem de SUSTENTAR na página. Quando não sustenta, o gabarito está
    // catalogando um defeito que a tela não tem — consertaram a tela, ou a spec sempre esteve
    // errada — e a preparação para em vez de medir contra uma referência desmentida (D-06).
    const desmentidas = built.units
      .map(u => ({ u, r: combinePredicate(aceitacao.get(u.specId) ?? []) }))
      .filter(({ r }) => r.outcome === "refuta" || r.outcome === "nao-replicavel");
    if (desmentidas.length) {
      throw new Error(JSON.stringify({ scene: id, defects: desmentidas.map(({ u, r }) => ({
        specId: u.specId, problem: `predicado de aceitação ${r.outcome}: ${r.reason}`,
      })) }));
    }
    for (const u of built.units) u.acceptance = combinePredicate(aceitacao.get(u.specId) ?? []);
    units.push(...built.units.map(u => ({ ...u, scene: id })));
    scenes.push({ id, viewport: p.viewport, specIds: p.specIds, resolution,
      html: await page.content(), image: await page.screenshot({ fullPage: true }) });
    await context.close();
  }
  return { scenes, units };
}

/**
 * Regiões copiadas de semantic-flow-cli.ts, delimitadas por âncoras (texto com indentação removida).
 * A guarda de deriva exige que cada uma seja igual aqui e lá.
 */
export const REGIOES_DO_CLI = [
  { nome: "baselineRuns", inicio: "/** Baseline claims become runs of the package", fim: "\n}\n" },
  { nome: "EntradaDaCena + janelasSegmentadas + prepararJanelaSegmentada", inicio: "/** Como a cena de um segmento foi reproduzida",
    fim: "await context.close();\n}\n}\n" },
  { nome: "prepare: ramo segmentado e ramo sem navegação", inicio: "if (plan.paradas) {\n// Com navegação (D-60)",
    fim: "await context.close();\n}\n" },
] as const;

/**
 * Texto de uma região, com fim de linha LF e sem indentação. A âncora de início vale só no começo de
 * uma linha (a lista acima, que a cita entre aspas, não conta). Âncora ausente ou repetida = erro.
 */
export function regiaoDe(src: string, r: { nome: string; inicio: string; fim: string }, arquivo: string): string {
  const texto = "\n" + src.replace(/\r\n/g, "\n").split("\n").map(l => l.trimStart()).join("\n");
  const inicio = "\n" + r.inicio;
  const i = texto.indexOf(inicio) + 1;
  if (i < 1 || texto.indexOf(inicio, i) >= 0) throw new Error(`âncora de início de "${r.nome}" ausente ou repetida em ${arquivo}`);
  const j = texto.indexOf(r.fim, i);
  if (j < 0) throw new Error(`âncora de fim de "${r.nome}" ausente em ${arquivo}`);
  return texto.slice(i, j + r.fim.length);
}

export { baselineRuns, janelasSegmentadas, prepararJanelaSegmentada, type EntradaDaCena };
