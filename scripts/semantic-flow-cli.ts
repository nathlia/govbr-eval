/** Offline scoring and a finite, manifest-selected semantic review workbench. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { resolve, join, relative, isAbsolute } from "node:path";
import { chromium } from "playwright";
import type { FlowAgentResults, FlowGroundTruth } from "../types";
import { ROOT } from "./adjudication";
import { openPage, preparePage, resolveOnPage, resolveStatesOnPage, resolveWithExcept, type Resolution } from "./anchors";
import { combinePredicate, measurePredicate, type PredicateResult } from "./acceptance-predicates";
import {
  buildFlowUnits, measureStatePresence, selectorsOfGroundTruth, selectorsOfRuns,
  statesOfGroundTruth, type FlowUnit,
} from "./units-flow";
import { loadVerifiedEvidence, verifyArchivedEvidence, type EvidenceDeclaration } from "./evidence-integrity";
import { renderReview } from "./semantic-flow-render";
import {
  SCORER_FILES, armLeaks, digest, historicalPending, normalizeReviews, prepareSemanticPackage, resolutionDigest,
  reviewEffort, reviewQueue, sceneIdOf, scopeReviews, scoreSemanticPackage, validatePackage,
  type PrepareRun, type RawReviews, type SceneResolution, type SemanticPackage, type SemanticReviews,
} from "./semantic-flow";
import {
  analysisIdentity, checkPlanConformity, compareIdentities, readCollectionManifest, sha256, statePlanOf, statePlanSha256,
  type CollectionManifest, type StatePlan,
} from "./collection-manifest";
import { BASELINE_VERSION, type FlowBaselines } from "./run-baselines-flow";
import { createSiteServer, loadSite } from "./measurement-surface";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";

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

interface BatteryEntry {
  archive: string | null; archiveDir: string; exitCode: number | null; suite: string; arm: string; slot?: number;
  collectionStatus?: string; collectionManifestSha256?: string;
  instrumentVersion?: string; protocolVersion?: string; evidence?: EvidenceDeclaration | null;
}
interface Battery {
  collectionManifest?: { path: string; sha256: string };
  execucoes: BatteryEntry[];
}


/** Baseline claims become runs of the package: same cards, same review, same matching. */
function baselineRuns(baseline: FlowBaselines, build: string, steps: string[]): PrepareRun[] {
  const config = (tool: string) => ({ instrumentVersion: FLOW_INSTRUMENT_VERSION,
    protocolVersion: `${BASELINE_VERSION}:${tool}`, siteManifestSha256: build });
  const run = (id: string, tool: string, findings: unknown[], seconds: number): PrepareRun => ({
    id, kind: "linha-de-base", tool,
    data: { model: tool, timestamp: baseline.timestamp, appUrl: baseline.appUrl, findings: findings as FlowAgentResults["findings"],
      config: config(tool) as FlowAgentResults["config"],
      cost: { wallClockSeconds: seconds, totalCostUsd: 0 } as unknown as FlowAgentResults["cost"] },
  });
  const pass = (p: FlowBaselines["passes"][number]) => ({ scene: p.id, viewport: p.viewport, steps });
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

function loadBaseline(path: string, collection: { manifest: CollectionManifest; sha256: string }, plan: StatePlan): { data: FlowBaselines; sha256: string } {
  const bytes = readFileSync(path);
  const data = JSON.parse(bytes.toString("utf8")) as FlowBaselines;
  if (data.baselineVersion !== BASELINE_VERSION) throw new Error(`Baseline version ${String(data.baselineVersion)} is not ${BASELINE_VERSION}`);
  if (data.status !== "complete") throw new Error(`Baseline did not complete: ${data.error ?? "unknown failure"}`);
  if (data.scope !== "bateria") throw new Error("A dev-global baseline cannot be compared with a battery");
  if (data.provenance.collectionManifest?.sha256 !== collection.sha256) throw new Error("Baseline belongs to another collection manifest");
  const mismatches = compareIdentities(collection.manifest.identity, data.provenance.identity);
  if (mismatches.length) throw new Error(`Baseline identity differs from the collection: ${mismatches.join("; ")}`);
  const planned = [plan.padrao, ...plan.extras.map(e => e.viewport)].map(sceneIdOf);
  if (JSON.stringify(data.passes.map(p => p.id)) !== JSON.stringify(planned)) throw new Error("Baseline passes differ from the state plan");
  return { data, sha256: sha256(bytes) };
}

function selectBatteryRuns(battery: Battery, collectionSha: string | null) {
  return battery.execucoes.map(entry => {
    if (entry.suite !== "fluxo" || entry.exitCode !== 0 || !entry.archive || (entry.collectionStatus && entry.collectionStatus !== "collected")) {
      throw new Error("Battery contains failed/missing/unattempted/non-flow runs. Do not silently select successful attempts; prepare an explicitly documented analysis manifest first.");
    }
    if (collectionSha && entry.collectionManifestSha256 !== collectionSha) throw new Error("Run was not collected under this collection manifest");
    const expectedDir = entry.arm === "com" ? "results/runs-fluxo" : entry.arm === "sem" ? "results/runs-fluxo-ablacao" : null;
    if (entry.archiveDir.replaceAll("\\", "/") !== expectedDir) throw new Error("Archive arm/directory mismatch");
    const path = resolve(ROOT, entry.archiveDir, entry.archive);
    const rel = relative(join(ROOT, entry.archiveDir), path);
    if (rel.startsWith("..") || isAbsolute(rel) || rel.includes("/") || rel.includes("\\")) throw new Error("Archive must be a file in its declared run directory");
    const data = read<FlowAgentResults>(path);
    if (data.config?.instrumentVersion !== entry.instrumentVersion || data.config?.protocolVersion !== entry.protocolVersion) {
      throw new Error(`Manifest/archive configuration mismatch: ${path}`);
    }
    if (collectionSha && (data.config as { collectionManifestSha256?: string } | undefined)?.collectionManifestSha256 !== collectionSha) {
      throw new Error(`Archived run does not name this collection manifest: ${path}`);
    }
    return { id: relative(ROOT, path).replaceAll("\\", "/"), data, kind: "agente" as const,
      evidence: loadVerifiedEvidence(ROOT, entry.evidence, data.config) };
  });
}

async function prepare(): Promise<void> {
  const batteryPath = resolve(option("battery")!);
  const out = resolve(option("out")!);
  if (existsSync(out)) throw new Error("Output directory already exists; choose a new one (raw packages are never overwritten)");
  const battery = read<Battery>(batteryPath);
  if (!battery.execucoes?.length) throw new Error("Empty battery");
  const legacy = args.includes("--legacy-reconstruction");
  const manifestArg = option("collection-manifest", false);
  if (legacy === Boolean(manifestArg)) {
    throw new Error("Use --collection-manifest (battery with frozen identity) OR --legacy-reconstruction (battery collected before slice 6).");
  }
  if (battery.collectionManifest && legacy) throw new Error("This battery has a collection manifest; a legacy reconstruction would discard it");

  const collection = manifestArg ? readCollectionManifest(resolve(manifestArg)) : null;
  if (collection) {
    if (battery.collectionManifest?.sha256 !== collection.sha256) throw new Error("Battery does not reference this collection manifest");
    checkPlanConformity(battery.execucoes, collection.manifest.plan!.slots);
  }
  const runs = selectBatteryRuns(battery, collection?.sha256 ?? null);
  // One collection contract per package: a legacy run next to a current one would read as if both
  // had been asked the same thing.
  if (new Set(runs.map(r => r.data.config?.instrumentVersion ?? null)).size > 1) {
    throw new Error("Battery mixes collection contracts; prepare one package per contract");
  }

  // Reference: the collection's archived copy. A different reference is an explicitly new analysis.
  const referenceArg = option("reference", false);
  const referencePath = referenceArg ? resolve(referenceArg)
    : collection ? join(ROOT, collection.manifest.archive!.reference.path) : join(ROOT, "ground-truth-fluxo.json");
  const referenceBytes = readFileSync(referencePath);
  if (collection && !referenceArg && sha256(referenceBytes) !== collection.manifest.identity.referenceSha256) {
    throw new Error("Archived reference changed since collection");
  }
  const gt = JSON.parse(referenceBytes.toString("utf8")) as FlowGroundTruth;
  const plan = statePlanOf(gt);
  if (collection && !referenceArg && statePlanSha256(plan) !== collection.manifest.identity.statePlanSha256) {
    throw new Error("State plan differs from the collection");
  }

  // Baseline: required with a collection manifest, unless its absence is declared.
  const baselineArg = option("baseline", false);
  const noBaseline = option("no-baseline", false);
  if (collection && Boolean(baselineArg) === Boolean(noBaseline)) {
    throw new Error("Pass --baseline FILE, or --no-baseline \"reason\" for a planned absence");
  }
  if (legacy && baselineArg) throw new Error("A legacy reconstruction has no collection identity to check a baseline against");
  const baseline = baselineArg && collection ? loadBaseline(resolve(baselineArg), collection, collection.manifest.statePlan!) : null;

  // Page: serve the frozen site ourselves and check its identity; never whatever answers on :3000.
  let origin: string;
  let closeSite = async (): Promise<void> => {};
  if (collection) {
    const site = loadSite(resolve(option("site-dir")!));
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

  const planned = [
    { viewport: plan.padrao, specIds: gt.violations.filter(v => !plan.extras.some(e => e.specs.includes(v.id))).map(v => v.id) },
    ...plan.extras.map(e => ({ viewport: e.viewport, specIds: e.specs })),
  ];
  const browser = await chromium.launch();
  try {
    const scenes: (SceneResolution & { html: string; image: Buffer })[] = [];
    const units: (FlowUnit & { scene: string })[] = [];
    // One fresh page per planned window, each brought to the reference state: selectors, units and
    // captures of a scene all come from that same page.
    for (const p of planned) {
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
      id: s.id, viewport: s.viewport, html: s.html, image: s.image.toString("base64"),
    })) });
    const referenceOverride = Boolean(referenceArg && collection && sha256(referenceBytes) !== collection.manifest.identity.referenceSha256);
    const provenance = {
      kind: collection ? (referenceOverride ? "nova-analise-com-outra-referencia" : "coleta-congelada") : "reconstrucao-sem-manifesto",
      collectionManifest: collection ? { path: relative(ROOT, resolve(manifestArg!)).replaceAll("\\", "/"), sha256: collection.sha256,
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
      sourceBattery: { path: relative(ROOT, batteryPath).replaceAll("\\", "/"), sha256: sha256(readFileSync(batteryPath)) },
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
    write(join(out, "source-battery.json"), battery);
    writeFileSync(join(out, "reference.json"), referenceBytes, { flag: "wx" });
    if (collection) writeFileSync(join(out, "collection-manifest.json"), readFileSync(resolve(manifestArg!)), { flag: "wx" });
    if (baseline) writeFileSync(join(out, "baseline.json"), readFileSync(resolve(baselineArg!)), { flag: "wx" });
    write(join(out, "capture.json"), { capturedAt: new Date().toISOString(), url, sceneHash,
      kind: collection ? "review-time reconstruction of the frozen collection build, not original execution evidence"
        : "review-time reconstruction, not original execution evidence",
      scenes: scenes.map((s, i) => ({ id: s.id, viewport: s.viewport, specIds: s.specIds,
        resolutionHash: resolutionDigest(s.resolution), resolution: `resolution-${i}.json`, html: `scene-${i}.html`, image: `scene-${i}.png` })) });
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
