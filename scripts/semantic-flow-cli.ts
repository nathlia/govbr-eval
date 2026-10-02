/** Offline scoring and a finite, manifest-selected semantic review workbench. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve, join, relative } from "node:path";
import { chromium, type Browser } from "playwright";
import type { FlowAgentResults, FlowGroundTruth, FlowViewport } from "../types";
import { ROOT } from "./adjudication";
import {
  abrirEntradaDireta, entradaDireta, impressaoDaArvore, openPage, preparePage, resolveOnPage, resolveStatesOnPage,
  resolveWithExcept, segmentoApos, type Resolution,
} from "./anchors";
import { combinePredicate, measurePredicate, type PredicateResult } from "./acceptance-predicates";
import {
  buildFlowUnits, buildFlowUnitsAcross, measureStatePresence, selectorsOfGroundTruth, selectorsOfRuns,
  specMedidaNoEstado, statesOfGroundTruth, type FlowUnit,
} from "./units-flow";
import { verifyArchivedEvidence } from "./evidence-integrity";
import { renderReview } from "./semantic-flow-render";
import {
  SCORER_FILES, armLeaks, digest, historicalPending, normalizeReviews, prepareSemanticPackage, resolutionDigest,
  reviewEffort, reviewQueue, sceneIdOf, scopeReviews, scoreSemanticPackage, validatePackage,
  type PrepareRun, type RawReviews, type SceneResolution, type SemanticPackage, type SemanticReviews,
} from "./semantic-flow";
import {
  analysisIdentity, cenasDoPlano, checkPlanConformity, compareIdentities, readCollectionManifest, sha256, statePlanOf,
  statePlanSha256, type CenaDoPlano, type CollectionManifest,
} from "./collection-manifest";
import { READABLE_BASELINE_VERSIONS, type FlowBaselines } from "./run-baselines-flow";
import { createSiteServer, loadSite } from "./measurement-surface";
import { loadBatteryEntry, motivoDeRecusa, readAnalysisManifest, telaOfBattery, type Battery } from "./analysis-manifest";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";
import { TELA_PADRAO, referenciaDe, telaOf } from "./telas";

const args = process.argv.slice(2);
const command = args.shift();
function option(name: string, required = true): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index < 0) {
    if (required) throw new Error(`Missing --${name}`);
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
  return value;
}
function read<T>(path: string): T { return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")); }
function write(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
}
function scorerHash(): string {
  return digest(SCORER_FILES.map(path => [path, readFileSync(join(ROOT, path), "utf8")]));
}
function loadPackage(path: string): SemanticPackage {
  const pkg = read<SemanticPackage>(path);
  validatePackage(pkg);
  if (pkg.context.scorerHash !== scorerHash()) throw new Error("Scorer/aliases changed. Use the pinned code or prepare a new package; do not relabel old scores.");
  for (const run of pkg.runs) if (run.evidenceIndex) verifyArchivedEvidence(ROOT, run.evidenceIndex);
  return pkg;
}

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

function loadBaseline(path: string, collection: { manifest: CollectionManifest; sha256: string }, cenas: CenaDoPlano[]): { data: FlowBaselines; sha256: string } {
  const bytes = readFileSync(path);
  const data = JSON.parse(bytes.toString("utf8")) as FlowBaselines;
  // D-54: 2.0.0 (tokens+structure) e 2.1.0 (+page) têm o mesmo formato; a bateria só se compara com a própria linha de base.
  if (!READABLE_BASELINE_VERSIONS.includes(String(data.baselineVersion))) throw new Error(`Baseline version ${String(data.baselineVersion)} is not one of ${READABLE_BASELINE_VERSIONS.join(", ")}`);
  if (data.status !== "complete") throw new Error(`Baseline did not complete: ${data.error ?? "unknown failure"}`);
  if (data.scope !== "bateria") throw new Error("A dev-global baseline cannot be compared with a battery");
  if (data.provenance.collectionManifest?.sha256 !== collection.sha256) throw new Error("Baseline belongs to another collection manifest");
  const mismatches = compareIdentities(collection.manifest.identity, data.provenance.identity);
  if (mismatches.length) throw new Error(`Baseline identity differs from the collection: ${mismatches.join("; ")}`);
  const planned = cenas.map(c => c.id);
  if (JSON.stringify(data.passes.map(p => p.id)) !== JSON.stringify(planned)) throw new Error("Baseline passes differ from the state plan");
  return { data, sha256: sha256(bytes) };
}

/**
 * Uma bateria inteira, slot a slot. As conferências por slot moram em analysis-manifest.ts e são as
 * MESMAS que o manifesto de análise aplica a cada slot que inclui: o caminho composto não tem régua
 * mais frouxa que este.
 */
function selectBatteryRuns(battery: Battery, collectionSha: string | null) {
  const tela = telaOfBattery(battery);
  return battery.execucoes.map(entry => {
    const motivo = motivoDeRecusa(entry, tela);
    if (motivo) {
      throw new Error(`Slot ${entry.slot ?? "?"} (${entry.arm}) não entra no pacote: ${motivo}. ` +
        "Não selecione em silêncio as tentativas bem-sucedidas; prepare antes um manifesto de análise explicitamente documentado " +
        "(scripts/analysis-manifest.ts) e passe --analysis-manifest.");
    }
    const { path: _path, ...run } = loadBatteryEntry(entry, tela!, collectionSha);
    return run;
  });
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

async function prepare(): Promise<void> {
  const out = resolve(option("out")!);
  if (existsSync(out)) throw new Error("Output directory already exists; choose a new one (raw packages are never overwritten)");
  // Duas portas, nunca as duas: a bateria inteira como foi coletada (--battery), ou uma análise
  // composta declarada antes num manifesto de análise (--analysis-manifest). Com o manifesto, coleta,
  // site e linha de base vêm DELE — aceitar os mesmos argumentos soltos abriria um segundo lugar para
  // dizer a mesma coisa, e os dois poderiam discordar.
  const analysisArg = option("analysis-manifest", false);
  if (analysisArg) {
    const soltos = ["battery", "collection-manifest", "baseline", "no-baseline", "site-dir", "legacy-reconstruction"].filter(a => args.includes(`--${a}`));
    if (soltos.length) throw new Error(`--analysis-manifest já nomeia bateria(s), coleta, site e linha de base; retire ${soltos.map(a => `--${a}`).join(", ")}`);
  }
  const analysis = analysisArg ? readAnalysisManifest(resolve(analysisArg)) : null;
  const batteryPath = analysis ? null : resolve(option("battery")!);
  const battery = batteryPath ? read<Battery>(batteryPath) : null;
  if (battery && !battery.execucoes?.length) throw new Error("Empty battery");
  const legacy = args.includes("--legacy-reconstruction");
  const manifestArg = option("collection-manifest", false);
  const manifestFile = analysis ? analysis.collectionManifestPath : manifestArg ? resolve(manifestArg) : null;
  if (!analysis && legacy === Boolean(manifestFile)) {
    throw new Error("Use --collection-manifest (battery with frozen identity) OR --legacy-reconstruction (battery collected before slice 6).");
  }
  if (battery?.collectionManifest && legacy) throw new Error("This battery has a collection manifest; a legacy reconstruction would discard it");

  const collection = manifestFile ? readCollectionManifest(manifestFile) : null;
  if (collection && battery) {
    if (battery.collectionManifest?.sha256 !== collection.sha256) throw new Error("Battery does not reference this collection manifest");
    checkPlanConformity(battery.execucoes, collection.manifest.plan!.slots);
  }
  // Composta: cada execução já foi conferida contra o manifesto de coleta da SUA bateria (que o
  // manifesto de análise exige ter identidade igual à da designada), nunca contra o da designada.
  const runs = analysis ? analysis.runs.map(({ path: _path, ...run }) => run) : selectBatteryRuns(battery!, collection?.sha256 ?? null);
  // One collection contract per package: a legacy run next to a current one would read as if both
  // had been asked the same thing.
  if (new Set(runs.map(r => r.data.config?.instrumentVersion ?? null)).size > 1) {
    throw new Error("Battery mixes collection contracts; prepare one package per contract");
  }

  // Reference: the collection's archived copy. A different reference is an explicitly new analysis.
  const referenceArg = option("reference", false);
  const referencePath = referenceArg ? resolve(referenceArg)
    : collection ? join(ROOT, collection.manifest.archive!.reference.path) : join(ROOT, referenciaDe(telaOfBattery(battery!) ?? telaOf(TELA_PADRAO)));
  const referenceBytes = readFileSync(referencePath);
  if (collection && !referenceArg && sha256(referenceBytes) !== collection.manifest.identity.referenceSha256) {
    throw new Error("Archived reference changed since collection");
  }
  const gt = JSON.parse(referenceBytes.toString("utf8")) as FlowGroundTruth;
  const plan = statePlanOf(gt);
  // Sem navegação, uma cena por janela no FIM do setup, como sempre. Com navegação (D-60), uma cena
  // por segmento de cada janela, na última parada dele — e a mesma lista que a linha de base mede.
  const cenas = cenasDoPlano(gt, plan);
  if (collection && !referenceArg && statePlanSha256(plan) !== collection.manifest.identity.statePlanSha256) {
    throw new Error("State plan differs from the collection");
  }

  // Baseline: required with a collection manifest, unless its absence is declared.
  const baselineArg = analysis ? analysis.baselinePath : option("baseline", false);
  const noBaseline = analysis ? undefined : option("no-baseline", false);
  if (collection && Boolean(baselineArg) === Boolean(noBaseline)) {
    throw new Error("Pass --baseline FILE, or --no-baseline \"reason\" for a planned absence");
  }
  if (legacy && baselineArg) throw new Error("A legacy reconstruction has no collection identity to check a baseline against");
  const baseline = baselineArg && collection ? loadBaseline(resolve(baselineArg), collection,
    cenasDoPlano(gt, collection.manifest.statePlan!)) : null;

  // Page: serve the frozen site ourselves and check its identity; never whatever answers on :3000.
  let origin: string;
  let closeSite = async (): Promise<void> => {};
  if (collection) {
    const site = loadSite(analysis ? analysis.siteDir : resolve(option("site-dir")!));
    if (site.manifestSha256 !== collection.manifest.identity.siteManifestSha256) throw new Error("Frozen site differs from the collection");
    const server = createSiteServer(site);
    await new Promise<void>((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", () => ok()); });
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    closeSite = () => new Promise(done => { server.closeAllConnections(); server.close(() => done()); });
  } else {
    origin = option("app-url", false) ?? "http://localhost:3000";
  }

  const url = new URL(gt._meta.url, origin).toString();
  for (const run of runs) if (new URL(run.data.appUrl).pathname !== new URL(url).pathname) throw new Error("Run page differs from reference page");
  const allRuns: PrepareRun[] = [...runs];
  if (baseline) allRuns.push(...baselineRuns(baseline.data, collection!.manifest.identity.siteManifestSha256!,
    [`setup do plano de estados (${plan.setup.length} passo(s))`]));
  const baselineSelectors = baseline ? baseline.data.passes.flatMap(p => [...p.validator.unguided.findings, ...p.axe.findings].map(f => f.target)) : [];
  const selectors = [...selectorsOfGroundTruth(gt), ...selectorsOfRuns(runs.map(r => r.data)), ...baselineSelectors];

  const planned = cenas.map(c => ({ viewport: c.viewport, specIds: c.specIds }));
  const claimSelectors = [...selectorsOfRuns(runs.map(r => r.data)), ...baselineSelectors];
  const browser = await chromium.launch();
  try {
    const scenes: (SceneResolution & { html: string; image: Buffer; entrada?: EntradaDaCena })[] = [];
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
    const sceneHash = digest({ setup: gt._meta.setup ?? [], scenes: scenes.map(s => ({
      ...(s.segmento ? { segmento: s.segmento } : {}),
      id: s.id, viewport: s.viewport, html: s.html, image: s.image.toString("base64"),
    })) });
    const referenceOverride = Boolean(referenceArg && collection && sha256(referenceBytes) !== collection.manifest.identity.referenceSha256);
    const provenance = {
      // Composta sobrepõe os outros rótulos: é o que muda a leitura do pacote. Uma composta com outra
      // referência continua dizendo isso em `reference.override`.
      kind: analysis ? "analise-composta"
        : collection ? (referenceOverride ? "nova-analise-com-outra-referencia" : "coleta-congelada") : "reconstrucao-sem-manifesto",
      collectionManifest: collection ? { path: relative(ROOT, manifestFile!).replaceAll("\\", "/"), sha256: collection.sha256,
        identity: collection.manifest.identity } : null,
      reference: { path: relative(ROOT, referencePath).replaceAll("\\", "/"), sha256: sha256(referenceBytes), version: gt._meta.version,
        collectedSha256: collection?.manifest.identity.referenceSha256 ?? null, override: referenceOverride },
      site: { origin: collection ? "site congelado servido pela preparação" : origin,
        manifestSha256: collection?.manifest.identity.siteManifestSha256 ?? null },
      baseline: baseline ? {
        path: relative(ROOT, resolve(baselineArg!)).replaceAll("\\", "/"), sha256: baseline.sha256,
        runs: ["linha-de-base/validator-nao-guiada", "linha-de-base/axe"],
        guidedDiagnostic: baseline.data.coverageCheck,
        eslint: baseline.data.eslint ? { findings: baseline.data.eslint.findings.length, files: baseline.data.eslint.files,
          note: "fonte da tela, sem atribuição a elemento; fora da contabilidade semântica" } : null,
        cost: baseline.data.cost,
      } : { absent: noBaseline ?? "reconstrução sem manifesto: sem linha de base confrontável" },
      analysis: analysisIdentity(),
      // Composta: não há UMA bateria fonte; `sourceBattery` fica nulo de propósito, para que ninguém leia
      // a designada como se fosse a origem de todas as execuções. As fontes estão em `sourceBatteries`.
      sourceBattery: batteryPath ? { path: relative(ROOT, batteryPath).replaceAll("\\", "/"), sha256: sha256(readFileSync(batteryPath)) } : null,
      ...(analysis ? {
        analysisManifest: { path: relative(ROOT, analysis.path).replaceAll("\\", "/"), sha256: analysis.sha256,
          justificativa: analysis.manifest.justificativa, designada: analysis.manifest.designada.fonte,
          divergenciasRegistradas: analysis.manifest.divergenciasRegistradas, excluidos: analysis.manifest.excluidos },
        sourceBatteries: analysis.manifest.fontes.map(f => ({ fonte: f.fonte, path: f.bateria.path, sha256: f.bateria.sha256,
          collectionManifest: f.collectionManifest, slotsIncluidos: f.slotsIncluidos })),
      } : {}),
    };
    const reuse = option("reuse", false);
    const anterior = reuse ? normalizeReviews(read<RawReviews>(resolve(reuse))) : undefined;
    const orcamento = option("orcamento-revisao", false) ?? undefined;
    const montar = (carriedOverPending: string[]): SemanticPackage => prepareSemanticPackage(
      { referenceHash: digest(gt), sceneHash, scorerHash: scorerHash() }, units, scenes, allRuns,
      { provenance, stateOrder: statesOfGroundTruth(gt)?.map(s => s.id) ?? [], carriedOverPending, reviewBudget: orcamento });
    // A fila histórica precisa dos cartões desta bateria para saber o que NÃO é dela, e o pacote
    // precisa da fila para publicá-la. Uma montagem preliminar resolve o ciclo, com os mesmos insumos.
    const pkg = montar(historicalPending(montar([]), anterior));
    const reviews = scopeReviews(pkg, anterior);
    // Validate reused decisions BEFORE writing anything.
    scoreSemanticPackage(pkg, reviews);
    mkdirSync(out, { recursive: true });
    write(join(out, "package.json"), pkg);
    write(join(out, "reviews.json"), reviews);
    if (battery) write(join(out, "source-battery.json"), battery);
    if (analysis) {
      writeFileSync(join(out, "analysis-manifest.json"), readFileSync(analysis.path), { flag: "wx" });
      for (const b of analysis.batteries) writeFileSync(join(out, `source-battery-${b.fonte}.json`), b.bytes, { flag: "wx" });
    }
    writeFileSync(join(out, "reference.json"), referenceBytes, { flag: "wx" });
    if (collection) writeFileSync(join(out, "collection-manifest.json"), readFileSync(manifestFile!), { flag: "wx" });
    if (baseline) writeFileSync(join(out, "baseline.json"), readFileSync(resolve(baselineArg!)), { flag: "wx" });
    write(join(out, "capture.json"), { capturedAt: new Date().toISOString(), url, sceneHash,
      kind: collection ? "review-time reconstruction of the frozen collection build, not original execution evidence"
        : "review-time reconstruction, not original execution evidence",
      scenes: scenes.map((s, i) => ({ id: s.id, viewport: s.viewport, specIds: s.specIds,
        resolutionHash: resolutionDigest(s.resolution), resolution: `resolution-${i}.json`, html: `scene-${i}.html`, image: `scene-${i}.png`,
        ...(s.segmento ? { segmento: s.segmento, entradaDireta: s.entrada ?? null } : {}) })) });
    scenes.forEach((s, i) => {
      write(join(out, `resolution-${i}.json`), { scene: s.id, url: s.resolution.url,
        bySelector: Object.fromEntries(s.resolution.bySelector), byKey: Object.fromEntries(s.resolution.byKey) });
      writeFileSync(join(out, `scene-${i}.html`), s.html, { flag: "wx" });
      writeFileSync(join(out, `scene-${i}.png`), s.image, { flag: "wx" });
    });
    writeFileSync(join(out, "review.md"), renderReview(pkg, reviews, { cego: args.includes("--cego") }), { flag: "wx" });
    const esforco = reviewEffort(pkg);
    write(join(out, "esforco-revisao.json"), esforco);
    const agentRuns = runs.length;
    console.log(`Prepared ${agentRuns} agent run(s)${baseline ? " + 2 baseline runs" : ""}, ${pkg.cards.length} unique cards, ` +
      `${units.length} reference units in ${scenes.length} scene(s) → ${out}`);
    console.log(`Esforço de revisão: ${esforco.cartoes} cartões · ${esforco.sujeitos} sujeitos · ` +
      `${esforco.semEvidenciaVerificada} sem evidência verificada · ${esforco.comCandidatos} com candidata · ` +
      `estimativa ${esforco.estimativaMinutos} min (${esforco.taxa})`);
    console.log(esforco.orcamentoDeclarado
      ? `Orçamento declarado: ${esforco.orcamentoDeclarado}. Esgotá-lo deixa o não resolvido visível e as métricas provisórias; não derruba alegação.`
      : "Sem orçamento declarado (--orcamento-revisao). Declare antes de começar, não depois de ver os cartões.");
    const vazamentos = armLeaks(pkg);
    if (vazamentos.length) {
      console.log(`ATENÇÃO — ${vazamentos.length} cartão(ões) com texto que revela o braço. Decida em review.md gerado com --cego,`);
      console.log(`e não abra package.json durante a decisão: ele guarda config.arm e o caminho do arquivo da execução.`);
    }
    if (analysis) {
      console.log(`Análise composta (${relative(ROOT, analysis.path).replaceAll("\\", "/")}, ${analysis.sha256.slice(0, 12)}): ` +
        analysis.manifest.fontes.map(f => `${f.fonte} slots ${f.slotsIncluidos.join(",")}`).join(" + ") +
        ` · fora: ${analysis.manifest.excluidos.map(e => `${e.fonte}:${e.slot}`).join(", ") || "nenhum"}`);
      for (const d of analysis.manifest.divergenciasRegistradas) console.log(`  divergência registrada (fora da identidade): ${d.campo}`);
    }
    console.log(`Provenance: ${provenance.kind}${baseline ? "" : ` · no baseline (${provenance.baseline && "absent" in provenance.baseline ? provenance.baseline.absent : ""})`}`);
    console.log("No verdicts invented; no legacy decisions or raw runs changed.");
  } finally {
    await browser.close();
    await closeSite();
  }
}

async function main(): Promise<void> {
  if (command === "prepare") return prepare();
  if (command !== "score" && command !== "render") {
    throw new Error("Usage: semantic-flow-cli.ts prepare --battery FILE --out NEW_DIR --collection-manifest FILE --site-dir DIR\n" +
      "         (--baseline FILE | --no-baseline REASON) [--reference FILE] [--reuse REVIEWS]\n" +
      "       semantic-flow-cli.ts prepare --analysis-manifest FILE --out NEW_DIR [--reference FILE] [--reuse REVIEWS]\n" +
      "       semantic-flow-cli.ts prepare --battery FILE --out NEW_DIR --legacy-reconstruction [--app-url URL] [--reuse REVIEWS]\n" +
      "       score|render --package FILE --reviews FILE --out NEW_FILE [--require-complete] [--cego]");
  }
  const pkg = loadPackage(resolve(option("package")!));
  // `decisao` (vocabulário da autora) vira `verdict` (categoria contábil) aqui, uma vez, na entrada.
  const reviews = normalizeReviews(read<RawReviews>(resolve(option("reviews")!)));
  const out = resolve(option("out")!);
  const result = scoreSemanticPackage(pkg, reviews);
  const fila = reviewQueue(pkg, reviews);
  if (command === "render") writeFileSync(out, renderReview(pkg, reviews, { cego: args.includes("--cego") }), { flag: "wx" });
  else {
    write(out, { ...result, fila, provenance: pkg.provenance });
    for (const s of result.scores) console.log(`${s.runId}: ${s.status}, ${s.counts.detectedUnits}/${s.counts.referenceUnits} confirmed units, ${s.pendingCardIds.length} unresolved cards`);
    console.log(`fila ativa (fecha a bateria) ${fila.ativa.cartoes} · histórica de outras baterias ${fila.historica.cartoes} · ` +
      `descobertas para a próxima referência ${fila.proximaVersao.afirmacoes}`);
    for (const c of result.comparisons) {
      console.log(`${c.agentRunId} × ${c.baseline}: ${c.status} · ambos ${c.counts.both} · só agente ${c.counts.agentOnly} · ` +
        `só linha de base ${c.counts.baselineOnly} · nenhum ${c.counts.neither}`);
    }
    if (args.includes("--require-complete") && result.scores.some(s => s.status !== "complete")) {
      console.error("Provisional output saved; unresolved claims prevent a final score.");
      process.exitCode = 2;
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
