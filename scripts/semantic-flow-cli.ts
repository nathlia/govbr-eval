/** Offline scoring and a finite, manifest-selected semantic review workbench. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, relative, isAbsolute } from "node:path";
import { chromium } from "playwright";
import type { FlowAgentResults, FlowGroundTruth } from "../types";
import { ROOT } from "./adjudication";
import { preparePage, resolveOnPage, VIEWPORT_PADRAO } from "./anchors";
import { buildFlowUnits, selectorsOfGroundTruth, selectorsOfRuns } from "./units-flow";
import {
  digest, prepareSemanticPackage, scopeReviews, scoreSemanticPackage, validatePackage,
  type SemanticPackage, type SemanticReviews,
} from "./semantic-flow";

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
function read<T>(path: string): T { return JSON.parse(readFileSync(path, "utf8")); }
function write(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
}
function scorerHash(): string {
  return digest(["scripts/semantic-flow.ts", "scripts/semantic-flow-cli.ts", "scripts/units-flow.ts",
    "scripts/units.ts", "scripts/anchors.ts", "scripts/instrument.ts", "instrument.json",
    "types.ts", "checker-aliases.json", "kb-aliases.json"]
    .map(path => [path, readFileSync(join(ROOT, path), "utf8")]));
}
function loadPackage(path: string): SemanticPackage {
  const pkg = read<SemanticPackage>(path);
  validatePackage(pkg);
  if (pkg.context.scorerHash !== scorerHash()) throw new Error("Scorer/aliases changed. Use the pinned code or prepare a new package; do not relabel old scores.");
  return pkg;
}
function render(pkg: SemanticPackage, reviews: SemanticReviews): string {
  const result = scoreSemanticPackage(pkg, reviews);
  const pending = new Set(result.scores.flatMap(s => s.pendingCardIds));
  const decisions = new Map(reviews.decisions.map(d => [d.cardId, d]));
  const lines = ["# Revisão semântica — pacote fechado", "",
    `Versão: ${pkg.version} · ${pkg.cards.length} cartões únicos · ${pending.size} pendentes`, "",
    "Este pacote inclui todas as alegações selecionadas, inclusive as que casariam por regra.",
    "Candidatos são sugestões de âncora, não vereditos. Você continua sendo a adjudicadora.",
    "Edite reviews.json; depois gere uma NOVA saída com score. Não edite package.json.", "",
    "As capturas scene-* são reconstruções no momento de preparar o pacote, não prova de que o agente observou o mesmo estado.",
    "Confira também reportedEvidence, inclusive as limitações declaradas. Use unresolved quando não houver suporte.", "",
    "Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.",
    "Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.", ""];
  for (const c of pkg.cards) {
    const d = decisions.get(c.id);
    lines.push(`## ${c.id}`, "", `Estado: ${pending.has(c.id) ? "pendente" : "concluído"}`, "",
      c.description.replace(/^#/gm, "\\#"), "", `Regra declarada: ${c.rule}`, "",
      "### Sujeitos", "", ...c.subjects.map(s => `- ${JSON.stringify(s.id)} — ${s.label}`), "",
      "### Unidades candidatas (não são crédito)", "");
    for (const id of c.candidateUnitIds) {
      const u = pkg.units.find(u => u.id === id)!;
      lines.push(`- ${id} — ${u.specId} · ${u.state} · ${u.element.label}: ${u.description}`);
    }
    if (!c.candidateUnitIds.length) lines.push("Nenhuma âncora candidata; um achado novo correto continua sendo possível.");
    lines.push("", "### Evidência declarada", "", "````json", JSON.stringify(c.reportedEvidence, null, 2), "````", "",
      "### Decisão", "", "````json", JSON.stringify(d, null, 2), "````", "");
  }
  return lines.join("\n");
}

interface Battery {
  execucoes: { archive: string | null; archiveDir: string; exitCode: number; suite: string; arm: string;
    instrumentVersion?: string; protocolVersion?: string }[];
}

async function prepare(): Promise<void> {
  const batteryPath = resolve(option("battery")!);
  const out = resolve(option("out")!);
  if (existsSync(out)) throw new Error("Output directory already exists; choose a new one (raw packages are never overwritten)");
  const battery = read<Battery>(batteryPath);
  if (!battery.execucoes?.length) throw new Error("Empty battery");
  const runs = battery.execucoes.map(entry => {
    if (entry.suite !== "fluxo" || entry.exitCode !== 0 || !entry.archive) {
      throw new Error("Battery contains failed/missing/non-flow runs. Do not silently select successful attempts; prepare an explicitly documented analysis manifest first.");
    }
    const expectedDir = entry.arm === "com" ? "results/runs-fluxo" : entry.arm === "sem" ? "results/runs-fluxo-ablacao" : null;
    if (entry.archiveDir.replaceAll("\\", "/") !== expectedDir) throw new Error("Archive arm/directory mismatch");
    const path = resolve(ROOT, entry.archiveDir, entry.archive);
    const rel = relative(join(ROOT, entry.archiveDir), path);
    if (rel.startsWith("..") || isAbsolute(rel) || rel.includes("/") || rel.includes("\\")) throw new Error("Archive must be a file in its declared run directory");
    const data = read<FlowAgentResults>(path);
    if (data.config?.instrumentVersion !== entry.instrumentVersion || data.config?.protocolVersion !== entry.protocolVersion) {
      throw new Error(`Manifest/archive configuration mismatch: ${path}`);
    }
    return { id: relative(ROOT, path).replaceAll("\\", "/"), data };
  });
  const gt = read<FlowGroundTruth>(join(ROOT, "ground-truth-fluxo.json"));
  const url = new URL(gt._meta.url, option("app-url", false) ?? "http://localhost:3000").toString();
  for (const run of runs) if (new URL(run.data.appUrl).pathname !== new URL(url).pathname) throw new Error("Run page differs from reference page");
  const selectors = [...selectorsOfGroundTruth(gt), ...selectorsOfRuns(runs.map(r => r.data))];
  const browser = await chromium.launch();
  try {
    const viewport = gt._meta.viewport ?? VIEWPORT_PADRAO;
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await preparePage(page, url, { waitFor: gt._meta.waitFor, setup: gt._meta.setup });
    const resolution = { url, ...await resolveOnPage(page, selectors) };
    const { units, defects } = buildFlowUnits(gt, resolution);
    if (defects.length) throw new Error(JSON.stringify(defects));
    const scenes: { viewport: typeof viewport; html: string; image: Buffer }[] = [];
    const viewports = new Map([viewport, ...gt.violations.flatMap(v => v.viewport ? [v.viewport] : [])]
      .map(v => [digest(v), v]));
    for (const v of viewports.values()) {
      await page.setViewportSize(v);
      scenes.push({ viewport: v, html: await page.content(), image: await page.screenshot({ fullPage: true }) });
    }
    const sceneHash = digest({ setup: gt._meta.setup ?? [], scenes: scenes.map(s => ({
      viewport: s.viewport, html: s.html, image: s.image.toString("base64"),
    })) });
    const pkg = prepareSemanticPackage({ referenceHash: digest(gt), sceneHash, scorerHash: scorerHash() }, units, resolution, runs);
    const reuse = option("reuse", false);
    const reviews = scopeReviews(pkg, reuse ? read<SemanticReviews>(resolve(reuse)) : undefined);
    // Validate reused decisions BEFORE writing anything.
    scoreSemanticPackage(pkg, reviews);
    mkdirSync(out, { recursive: true });
    write(join(out, "package.json"), pkg);
    write(join(out, "reviews.json"), reviews);
    write(join(out, "source-battery.json"), battery);
    write(join(out, "reference.json"), gt);
    write(join(out, "capture.json"), { capturedAt: new Date().toISOString(), url, sceneHash,
      kind: "review-time reconstruction, not original execution evidence", viewports: scenes.map(s => s.viewport) });
    scenes.forEach((s, i) => {
      writeFileSync(join(out, `scene-${i}.html`), s.html, { flag: "wx" });
      writeFileSync(join(out, `scene-${i}.png`), s.image, { flag: "wx" });
    });
    writeFileSync(join(out, "review.md"), render(pkg, reviews), { flag: "wx" });
    console.log(`Prepared ${runs.length} runs, ${pkg.cards.length} unique cards, ${units.length} reference units in ${out}`);
    console.log("No verdicts invented; no legacy decisions or raw runs changed.");
  } finally { await browser.close(); }
}

async function main(): Promise<void> {
  if (command === "prepare") return prepare();
  if (command !== "score" && command !== "render") {
    throw new Error("Usage: semantic-flow-cli.ts prepare --battery FILE --out NEW_DIR [--app-url URL] [--reuse REVIEWS]\n  score|render --package FILE --reviews FILE --out NEW_FILE [--require-complete]");
  }
  const pkg = loadPackage(resolve(option("package")!));
  const reviews = read<SemanticReviews>(resolve(option("reviews")!));
  const out = resolve(option("out")!);
  const result = scoreSemanticPackage(pkg, reviews);
  if (command === "render") writeFileSync(out, render(pkg, reviews), { flag: "wx" });
  else {
    write(out, result);
    for (const s of result.scores) console.log(`${s.runId}: ${s.status}, ${s.counts.detectedUnits}/${s.counts.referenceUnits} confirmed units, ${s.pendingCardIds.length} unresolved cards`);
    if (args.includes("--require-complete") && result.scores.some(s => s.status !== "complete")) {
      console.error("Provisional output saved; unresolved claims prevent a final score.");
      process.exitCode = 2;
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
