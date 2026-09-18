/**
 * Fatia 6 de ponta a ponta, sem modelo: site congelado do build do corpus, manifesto de coleta pela
 * CLI, linha de base de bateria pela CLI (navegador e oráculo compilado reais), bateria sintética
 * com uma execução do contrato fluxo-1.3.0, pacote semântico pela CLI e pontuação offline.
 *
 * Depois, as trocas que a fatia promete recusar: página, linha de base, gabarito, compilado, hash
 * ausente, slot não tentado, sobrescrita. Tudo fica numa pasta temporária sob pipeline/logs (os
 * caminhos arquivados são relativos ao govbr-eval) e numa execução temporária em
 * results/runs-fluxo-ablacao; as duas são removidas no fim.
 *
 * Uso: npm run test:fatia6   (o corpus precisa ter dist/ — `npm run build` em govbr-corpus)
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { ROOT } from "./adjudication";
import { createSiteServer, freezeSite, loadSite } from "./measurement-surface";
import { COLLECTION_PLAN_VERSION, sha256, sha256File, type CollectionManifest } from "./collection-manifest";
import type { FlowBaselines } from "./run-baselines-flow";
import type { SemanticPackage, SemanticReviews } from "./semantic-flow";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";

const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const corpusDist = resolve(ROOT, "..", "govbr-corpus", "dist");
const id = randomUUID().slice(0, 8);
const work = join(ROOT, "pipeline", "logs", `_teste-fatia6-${id}`);
const runFile = join(ROOT, "results", "runs-fluxo-ablacao", `agent-teste-fatia6-${id}.json`);
const rel = (path: string): string => relative(ROOT, path).replaceAll("\\", "/");

let tests = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  const started = Date.now();
  await fn();
  tests++;
  console.log(`ok ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

/** Asynchronous on purpose: this process also serves the frozen site the child measures. */
function cli(script: string, args: string[], env: Record<string, string> = {}): Promise<{ status: number | null; out: string }> {
  return new Promise(done => {
    const child = spawn(process.execPath, [TSX, join(ROOT, "scripts", script), ...args],
      { cwd: ROOT, env: { ...process.env, ...env } });
    let out = "";
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { out += chunk; });
    const timer = setTimeout(() => child.kill(), 300_000);
    child.on("close", status => { clearTimeout(timer); done({ status, out }); });
  });
}

function listen(server: Server): Promise<string> {
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => ok(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });
}
const close = (server: Server): Promise<void> => new Promise(done => { server.closeAllConnections(); server.close(() => done()); });
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const writeJson = (path: string, value: unknown): void => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");

async function main(): Promise<void> {
  if (!existsSync(join(corpusDist, "fluxo.html"))) throw new Error("Rode `npm run build` em govbr-corpus antes deste teste.");
  mkdirSync(work, { recursive: true });
  const servers: Server[] = [];
  try {
    // ── superfície mínima: site congelado + descrição ───────────────────────────
    const surfaceDir = join(work, "superficie");
    mkdirSync(surfaceDir);
    freezeSite(corpusDist, "fluxo.html", surfaceDir);
    const site = loadSite(surfaceDir);
    const siteServer = createSiteServer(site);
    servers.push(siteServer);
    const origin = await listen(siteServer);
    writeJson(join(surfaceDir, "surface.json"), { version: "teste", entryUrl: `${origin}/fluxo.html`,
      siteManifest: "site-manifest.json", siteManifestSha256: site.manifestSha256, policy: { teste: "sem proxy" } });

    const plan = {
      planVersion: COLLECTION_PLAN_VERSION, stamp: `teste-${id}`, schedule: "alternado", seed: null, attemptBudget: 1,
      retryPolicy: "nenhuma", failurePolicy: "teste", arms: ["sem"], runsPerArm: 1, model: "fixture",
      reasoningEffort: "high", oracleProfile: "combined", provider: "claude", scope: "full", suite: "fluxo",
      slots: [{ slot: 1, arm: "sem", repetition: 1, block: 1 }],
    };
    const planPath = join(work, "plano.json");
    writeJson(planPath, plan);
    const collectionDir = join(work, "coleta");
    const manifestPath = join(collectionDir, "manifesto.json");
    const buildArgs = ["build", "--out-dir", collectionDir, "--site-manifest", join(surfaceDir, "site-manifest.json"),
      "--surface", join(surfaceDir, "surface.json"), "--plan", planPath, "--client", "fixture-cli", "--client-version", "1.0.0"];

    let manifest!: CollectionManifest;
    let manifestSha = "";
    await test("collection manifest is complete, archives oracle and reference, and is never rewritten", async () => {
      const refused = await cli("collection-manifest.ts", buildArgs.map(a => a === planPath ? join(work, "sem-plano.json") : a));
      assert.equal(refused.status, 1, refused.out);
      assert.match(refused.out, /nada foi gravado.*plano ausente/s);
      assert.equal(existsSync(collectionDir), false);
      const built = await cli("collection-manifest.ts", buildArgs);
      assert.equal(built.status, 0, built.out);
      manifest = readJson<CollectionManifest>(manifestPath);
      manifestSha = sha256File(manifestPath)!;
      assert.match(built.out, new RegExp(`MANIFEST_SHA256=${manifestSha}`));
      assert.equal(manifest.identity.siteManifestSha256, site.manifestSha256);
      assert.equal(manifest.archive!.oracle.distSha256, manifest.identity.oracleDistSha256);
      assert.equal(sha256File(join(ROOT, manifest.archive!.reference.path)), manifest.identity.referenceSha256);
      assert.ok(manifest.runtime.browsers.eval && manifest.runtime.browsers.validator);
      assert.deepEqual(manifest.plan, plan);
      const again = await cli("collection-manifest.ts", buildArgs);
      assert.equal(again.status, 1);
      assert.match(again.out, /já existe/);
      assert.equal((await cli("collection-manifest.ts", ["verify", "--manifest", manifestPath])).status, 0);
    });

    const baselinePath = join(work, "linha-de-base.json");
    const baselineArgs = (out: string, manifestFile = manifestPath) =>
      ["--out", out, "--collection-manifest", manifestFile, "--site-manifest", join(surfaceDir, "site-manifest.json")];
    let baseline!: FlowBaselines;
    let unguidedOnly!: { target: string; rule: string; pass: string };
    await test("battery baseline measures every planned window, persists both scans, and refuses to overwrite", async () => {
      const run = await cli("run-baselines-flow.ts", baselineArgs(baselinePath), { APP_URL: origin });
      assert.equal(run.status, 0, run.out);
      baseline = readJson<FlowBaselines>(baselinePath);
      assert.equal(baseline.status, "complete");
      assert.equal(baseline.scope, "bateria");
      assert.equal(baseline.provenance.collectionManifest!.sha256, manifestSha);
      assert.deepEqual(baseline.passes.map(p => p.id), ["1280x900", ...manifest.statePlan!.extras.map(e => `${e.viewport.width}x${e.viewport.height}`)]);
      for (const pass of baseline.passes) {
        assert.equal(pass.validator.unguided.mode, "nao-guiada");
        assert.equal(pass.validator.unguided.request.selectors, null);
        assert.deepEqual(pass.validator.unguided.request.viewport, pass.viewport);
        assert.match(pass.validator.unguided.stateFingerprint ?? "", /^sha256:/);
        assert.ok(pass.validator.unguided.seconds > 0);
        assert.ok(Object.keys(pass.resolution.bySelector).length > 0);
      }
      assert.ok(baseline.coverageCheck.length > 0 && baseline.coverageCheck.every(c => c.detected));
      assert.ok(baseline.cost.wallClockSeconds > 0 && baseline.cost.apiUsd === 0);
      assert.ok(baseline.eslint && baseline.eslint.files[0].sha256);
      const pairs = (pass: FlowBaselines["passes"][number], mode: "unguided" | "guided") =>
        new Set((pass.validator[mode]?.findings ?? []).map(f => `${f.rule}|${(pass.resolution.bySelector[f.target]?.keys ?? []).join(",")}`));
      for (const pass of baseline.passes) {
        const guided = pairs(pass, "guided");
        const f = pass.validator.unguided.findings.find(x =>
          !guided.has(`${x.rule}|${(pass.resolution.bySelector[x.target]?.keys ?? []).join(",")}`));
        if (f && !unguidedOnly) unguidedOnly = { target: f.target, rule: f.rule, pass: pass.id };
      }
      assert.ok(unguidedOnly, "the whole-page scan should report something the anchored scan did not look at");
      const again = await cli("run-baselines-flow.ts", baselineArgs(baselinePath), { APP_URL: origin });
      assert.equal(again.status, 1);
      assert.equal(sha256File(baselinePath), sha256(JSON.stringify(baseline, null, 2) + "\n"));
    });

    await test("baseline refuses another page, and records a partial failure for another compiled oracle", async () => {
      const otherSiteDir = join(work, "outro-site");
      mkdirSync(otherSiteDir);
      cpSync(join(surfaceDir, "site"), join(otherSiteDir, "site"), { recursive: true });
      cpSync(join(surfaceDir, "site-manifest.json"), join(otherSiteDir, "site-manifest.json"));
      const html = join(otherSiteDir, "site", "fluxo.html");
      writeFileSync(html, readFileSync(html, "utf8").replace("</body>", "<!-- outra --></body>"));
      const tampered = createServer((req, res) => {
        const path = new URL(req.url ?? "/", "http://x").pathname;
        const file = join(otherSiteDir, "site", path.slice(1));
        if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { "content-type": path.endsWith(".html") ? "text/html" : "application/javascript" });
        res.end(readFileSync(file));
      });
      servers.push(tampered);
      const tamperedOrigin = await listen(tampered);
      const wrongPage = await cli("run-baselines-flow.ts", baselineArgs(join(work, "lb-outra-pagina.json")), { APP_URL: tamperedOrigin });
      assert.equal(wrongPage.status, 1);
      assert.match(wrongPage.out, /serve outro \/fluxo\.html/);

      const otherOracle = structuredClone(manifest);
      otherOracle.identity.oracleDistSha256 = "0".repeat(64);
      const otherManifest = join(work, "manifesto-outro-oraculo.json");
      writeJson(otherManifest, otherOracle);
      const failedPath = join(work, "lb-outro-oraculo.json");
      const failed = await cli("run-baselines-flow.ts", baselineArgs(failedPath, otherManifest), { APP_URL: origin });
      assert.equal(failed.status, 1);
      const partial = readJson<FlowBaselines>(failedPath);
      assert.equal(partial.status, "failed");
      assert.match(partial.error ?? "", /oracleDistSha256/);

      const incomplete = structuredClone(manifest);
      incomplete.identity.siteManifestSha256 = null;
      const incompletePath = join(work, "manifesto-incompleto.json");
      writeJson(incompletePath, incomplete);
      const refused = await cli("run-baselines-flow.ts", baselineArgs(join(work, "lb-incompleto.json"), incompletePath), { APP_URL: origin });
      assert.equal(refused.status, 1);
      assert.match(refused.out, /Manifesto de coleta incompleto/);
    });

    // ── bateria sintética: uma execução do contrato atual ─────────────────────────
    const narrow = manifest.statePlan!.extras[0]?.viewport;
    const report = {
      timestamp: new Date().toISOString(), model: "fixture", appUrl: `${origin}/fluxo.html`,
      findings: [
        { selector: "#cpf", rule: null, observed: "Campo sem descrição associada", expected: "Descrição associada",
          state: { viewport: { width: 1280, height: 720 }, steps: ["clicou Continuar"] }, evidence: [] },
        ...(narrow ? [{ selector: ".barra-recursos", rule: null, observed: "Barra transborda", expected: "Refluxo",
          state: { viewport: narrow, steps: [] }, evidence: [] }] : []),
      ],
      config: { instrumentVersion: FLOW_INSTRUMENT_VERSION, protocolVersion: "sha256:fixture",
        siteManifestSha256: site.manifestSha256, collectionManifestSha256: manifestSha },
    };
    writeJson(runFile, report);
    const entry = { run: 1, slot: 1, arm: "sem", suite: "fluxo", archive: rel(runFile).split("/").pop(),
      archiveDir: "results/runs-fluxo-ablacao", exitCode: 0, instrumentVersion: FLOW_INSTRUMENT_VERSION,
      protocolVersion: "sha256:fixture", evidence: null, collectionStatus: "collected", collectionManifestSha256: manifestSha };
    const battery = { stamp: `teste-${id}`, collectionManifest: { path: rel(manifestPath), sha256: manifestSha }, execucoes: [entry] };
    const batteryPath = join(work, "bateria.json");
    writeJson(batteryPath, battery);
    const prepareArgs = (out: string, extra: string[] = [], batteryFile = batteryPath) => ["prepare", "--battery", batteryFile,
      "--out", out, "--collection-manifest", manifestPath, "--site-dir", surfaceDir, ...extra];

    const pkgDir = join(work, "pacote");
    let pkg!: SemanticPackage;
    await test("preparation consumes the exact manifest and baseline; the unguided-only finding becomes a reviewable card", async () => {
      const missing = await cli("semantic-flow-cli.ts", prepareArgs(join(work, "pacote-sem-lb")));
      assert.equal(missing.status, 1);
      assert.match(missing.out, /--no-baseline/);
      const prepared = await cli("semantic-flow-cli.ts", prepareArgs(pkgDir, ["--baseline", baselinePath]));
      assert.equal(prepared.status, 0, prepared.out);
      pkg = readJson<SemanticPackage>(join(pkgDir, "package.json"));
      const provenance = pkg.provenance as { kind: string; baseline: { sha256: string }; collectionManifest: { sha256: string } };
      assert.equal(provenance.kind, "coleta-congelada");
      assert.equal(provenance.collectionManifest.sha256, manifestSha);
      assert.equal(provenance.baseline.sha256, sha256File(baselinePath));
      assert.deepEqual(pkg.scenes.map(s => s.id), baseline.passes.map(p => p.id));
      assert.deepEqual(pkg.runs.map(r => r.kind).sort(), ["agente", "linha-de-base", "linha-de-base"]);
      const card = pkg.cards.find(c => c.origin === "linha-de-base" && c.selector === unguidedOnly.target &&
        c.rule === unguidedOnly.rule && c.scene === unguidedOnly.pass);
      assert.ok(card, "unguided-only finding must be in the package");
      if (narrow) {
        const narrowCard = pkg.cards.find(c => c.origin === "agente" && c.selector === ".barra-recursos")!;
        assert.equal(narrowCard.scene, `${narrow.width}x${narrow.height}`);
        const narrowScene = pkg.scenes.find(s => s.id === narrowCard.scene)!;
        assert.ok(narrowCard.candidateUnitIds.every(uid => pkg.units.find(u => u.id === uid)!.scene === narrowScene.id));
        const wideUnitsOnSameKey = pkg.units.filter(u => u.scene !== narrowScene.id &&
          u.participants.some(k => narrowCard.subjects.some(s => s.key === k)));
        assert.ok(wideUnitsOnSameKey.every(u => !narrowCard.candidateUnitIds.includes(u.id)));
      }
      for (const file of ["collection-manifest.json", "baseline.json", "reference.json", "resolution-0.json", "capture.json"]) {
        assert.ok(existsSync(join(pkgDir, file)), file);
      }
      assert.equal(sha256File(join(pkgDir, "reference.json")), manifest.identity.referenceSha256);

      // Fatia 3: o estado de cada unidade é MEDIDO na página, não herdado do rótulo da spec. Se a
      // sequência de setup deixasse de ser aditiva, ou se uma spec condicional passasse a existir
      // no primeiro paint, a preparação teria parado antes de chegar aqui.
      assert.ok(pkg.units.every(u => u.states.length > 0), "toda unidade traz os estados em que foi medida");
      const condicionais = pkg.units.filter(u => u.conditional);
      assert.ok(condicionais.length > 0, "o gabarito tem specs condicionais (V-03b, V-09)");
      for (const u of condicionais) {
        assert.deepEqual(u.states, ["apos-submit-vazio"], `${u.specId} só existe depois do submit`);
      }
      for (const u of pkg.units.filter(u => !u.conditional)) {
        assert.ok(u.states.includes("inicial"), `${u.specId} declara "sempre" e é alcançável no primeiro paint`);
      }

      // Fatia 3: o predicado de aceitação declarado foi MEDIDO na página congelada. As specs que
      // declaram um sustentam-no — se a tela fosse consertada, a preparação teria parado — e as que
      // não declaram ficam `nao-implementado`, que não é aceitação nem recusa.
      const comPredicado = ["V-01", "V-02", "V-03a", "V-03b", "V-06", "V-08", "V-09"];
      for (const u of pkg.units) {
        const esperado = comPredicado.includes(u.specId) ? "sustenta" : "nao-implementado";
        assert.equal(u.acceptance.outcome, esperado, `${u.specId}: ${u.acceptance.reason}`);
        if (esperado === "sustenta") {
          assert.ok(u.acceptance.measured.length > 0, `${u.specId} traz o que foi medido`);
          assert.ok(u.acceptance.measured.every(m => m.sustains), `${u.specId}: todo participante sustenta`);
          assert.ok(u.acceptance.states.length > 0, `${u.specId} diz em que estado mediu`);
        }
      }
      const semPredicado = pkg.units.filter(u => u.acceptance.outcome === "nao-implementado");
      assert.ok(semPredicado.length > 0, "há specs sem predicado — e elas seguem para a revisão como antes");
    });

    await test("reviewed package produces the agent × baseline comparison offline", async () => {
      const reviews = readJson<SemanticReviews>(join(pkgDir, "reviews.json"));
      reviews.decisions = reviews.decisions.map(d => {
        const card = pkg.cards.find(c => c.id === d.cardId)!;
        return { ...d, status: "reviewed", reviewer: "fixture", rationale: "fixture", complete: true, evidenceRefs: ["fixture"],
          atoms: [{ id: "a", text: "fixture", subjects: card.subjects.map(s => s.id), verdict: "novel", unitIds: [], citation: "uncertain" }] };
      });
      const unguidedCard = pkg.cards.find(c => c.origin === "linha-de-base" && c.candidateUnitIds.length > 0);
      if (unguidedCard) {
        const unit = pkg.units.find(u => u.id === unguidedCard.candidateUnitIds[0])!;
        const anchoredSubjects = unguidedCard.subjects.filter(s => s.key && unit.participants.includes(s.key)).map(s => s.id);
        const rest = unguidedCard.subjects.map(s => s.id).filter(s => !anchoredSubjects.includes(s));
        const decision = reviews.decisions.find(d => d.cardId === unguidedCard.id)!;
        decision.atoms = [{ id: "ref", text: "fixture", subjects: anchoredSubjects, verdict: "reference", unitIds: [unit.id], citation: "supported" },
          ...(rest.length ? [{ id: "rest", text: "fixture", subjects: rest, verdict: "false" as const, unitIds: [], citation: "unsupported" as const }] : [])];
      }
      const reviewsPath = join(work, "reviews-fixture.json");
      writeJson(reviewsPath, reviews);
      const scored = await cli("semantic-flow-cli.ts", ["score", "--package", join(pkgDir, "package.json"), "--reviews", reviewsPath,
        "--out", join(work, "score.json"), "--require-complete"]);
      assert.equal(scored.status, 0, scored.out);
      const result = readJson<{ comparisons: { baseline: string; status: string; counts: { baselineOnly: number; agentOnly: number } }[] }>(join(work, "score.json"));
      assert.deepEqual(result.comparisons.map(c => c.baseline).sort(), ["linha-de-base/axe", "linha-de-base/validator-nao-guiada", "uniao-deterministica"]);
      assert.ok(result.comparisons.every(c => c.status === "complete"));
      if (unguidedCard) {
        assert.equal(result.comparisons.find(c => c.baseline === "linha-de-base/validator-nao-guiada")!.counts.baselineOnly, 1);
      }
      // Same frozen inputs and same decisions reproduce the same units, cards and counts.
      const again = join(work, "pacote-2");
      assert.equal((await cli("semantic-flow-cli.ts", prepareArgs(again, ["--baseline", baselinePath]))).status, 0);
      const pkg2 = readJson<SemanticPackage>(join(again, "package.json"));
      assert.deepEqual(pkg2.units.map(u => u.id), pkg.units.map(u => u.id));
      assert.deepEqual(pkg2.scenes.map(s => s.resolutionHash), pkg.scenes.map(s => s.resolutionHash));
      if (pkg2.context.sceneHash === pkg.context.sceneHash) {
        assert.deepEqual(pkg2.cards.map(c => c.id), pkg.cards.map(c => c.id));
        const rescored = await cli("semantic-flow-cli.ts", ["score", "--package", join(again, "package.json"), "--reviews", reviewsPath,
          "--out", join(work, "score-2.json")]);
        assert.equal(rescored.status, 0, rescored.out);
        assert.deepEqual(readJson<{ scores: unknown }>(join(work, "score-2.json")).scores, readJson<{ scores: unknown }>(join(work, "score.json")).scores);
      } else {
        console.log("   note: review-time captures differ between preparations; card identities follow the captures");
      }
    });

    await test("preparation refuses swapped page, baseline, reference, manifest, and unaccounted slots", async () => {
      const refuse = async (label: string, args: string[], pattern: RegExp) => {
        const r = await cli("semantic-flow-cli.ts", args);
        assert.equal(r.status, 1, `${label}: ${r.out}`);
        assert.match(r.out, pattern, label);
      };
      // page
      const otherSurface = join(work, "superficie-alterada");
      cpSync(surfaceDir, otherSurface, { recursive: true });
      const manifestFile = join(otherSurface, "site-manifest.json");
      writeFileSync(manifestFile, readFileSync(manifestFile, "utf8").replace("\"version\"", "\"nota\": \"alterado\", \"version\""));
      await refuse("page", prepareArgs(join(work, "p1"), ["--baseline", baselinePath]).map(a => a === surfaceDir ? otherSurface : a),
        /Frozen site differs/);
      // baseline: another manifest, dev-global, failed
      const foreign = structuredClone(baseline);
      foreign.provenance.collectionManifest = { path: "x", sha256: "1".repeat(64) };
      writeJson(join(work, "lb-alheia.json"), foreign);
      await refuse("foreign baseline", prepareArgs(join(work, "p2"), ["--baseline", join(work, "lb-alheia.json")]), /another collection manifest/);
      writeJson(join(work, "lb-dev.json"), { ...baseline, scope: "dev-global" });
      await refuse("dev baseline", prepareArgs(join(work, "p3"), ["--baseline", join(work, "lb-dev.json")]), /dev-global/);
      await refuse("failed baseline", prepareArgs(join(work, "p4"), ["--baseline", join(work, "lb-outro-oraculo.json")]), /did not complete/);
      const spoofed = structuredClone(baseline);
      spoofed.provenance.identity.statePlanSha256 = "2".repeat(64);
      writeJson(join(work, "lb-plano.json"), spoofed);
      await refuse("baseline identity", prepareArgs(join(work, "p5"), ["--baseline", join(work, "lb-plano.json")]), /statePlanSha256/);
      // An edited but still consistent baseline is not silently the same analysis: its hash is recorded.
      const edited = structuredClone(baseline);
      edited.passes[0].axe.findings = [];
      writeJson(join(work, "lb-editada.json"), edited);
      assert.equal((await cli("semantic-flow-cli.ts", prepareArgs(join(work, "p6"), ["--baseline", join(work, "lb-editada.json")]))).status, 0);
      const editedPkg = readJson<SemanticPackage>(join(work, "p6", "package.json"));
      assert.notEqual(editedPkg.packageHash, pkg.packageHash);
      assert.equal((editedPkg.provenance as { baseline: { sha256: string } }).baseline.sha256, sha256File(join(work, "lb-editada.json")));
      // reference: explicit override is a new, labelled analysis
      const otherReference = join(work, "gabarito-alterado.json");
      const gt = readJson<{ _meta: { version: string } }>(join(ROOT, manifest.archive!.reference.path));
      writeJson(otherReference, { ...gt, _meta: { ...gt._meta, version: `${gt._meta.version}-teste` } });
      assert.equal((await cli("semantic-flow-cli.ts", prepareArgs(join(work, "p7"), ["--baseline", baselinePath, "--reference", otherReference]))).status, 0);
      assert.equal((readJson<SemanticPackage>(join(work, "p7", "package.json")).provenance as { kind: string }).kind, "nova-analise-com-outra-referencia");
      // manifest: battery must name it; runs must name it
      const otherBattery = join(work, "bateria-outro-manifesto.json");
      writeJson(otherBattery, { ...battery, collectionManifest: { path: "x", sha256: "3".repeat(64) } });
      await refuse("battery manifest", prepareArgs(join(work, "p8"), ["--baseline", baselinePath], otherBattery), /does not reference this collection manifest/);
      // unattempted slot
      const partial = join(work, "bateria-parcial.json");
      writeJson(partial, { ...battery, execucoes: [{ ...entry, archive: null, exitCode: null, collectionStatus: "nao-tentada" }] });
      await refuse("unattempted", prepareArgs(join(work, "p9"), ["--baseline", baselinePath], partial), /unattempted/);
      // incomplete accounting against the plan
      const extra = join(work, "bateria-a-mais.json");
      writeJson(extra, { ...battery, execucoes: [entry, { ...entry, slot: 2 }] });
      await refuse("slot accounting", prepareArgs(join(work, "p10"), ["--baseline", baselinePath], extra), /accounts for 2 of 1 planned slots/);
      // archived reference tampering
      const archivedRef = join(ROOT, manifest.archive!.reference.path);
      const original = readFileSync(archivedRef);
      writeFileSync(archivedRef, Buffer.concat([original, Buffer.from("\n")]));
      try {
        await refuse("archived reference", prepareArgs(join(work, "p11"), ["--baseline", baselinePath]), /Archived reference changed/);
        assert.equal((await cli("collection-manifest.ts", ["verify", "--manifest", manifestPath])).status, 1);
      } finally {
        writeFileSync(archivedRef, original);
      }
      // legacy mode cannot be used to bypass a battery manifest
      await refuse("legacy bypass", ["prepare", "--battery", batteryPath, "--out", join(work, "p12"), "--legacy-reconstruction"], /would discard it/);
      // never overwrite
      await refuse("overwrite", prepareArgs(pkgDir, ["--baseline", baselinePath]), /already exists/);
    });
  } finally {
    for (const server of servers) await close(server);
    rmSync(runFile, { force: true });
    if (resolve(work).startsWith(resolve(ROOT, "pipeline", "logs")) && work.includes("_teste-fatia6-")) {
      rmSync(work, { recursive: true, force: true });
    }
  }
  console.log(`${tests} slice-6 integration tests passed.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
