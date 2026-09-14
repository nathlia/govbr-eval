/**
 * Linhas de base determinísticas da suíte de fluxo (D-06/D-23/D-25).
 *
 * A suíte `TC-*` atribui achado do axe a caso pelo `data-testid` da seção que o contém. A tela de
 * fluxo não tem seções, então esse runner não serve aqui — e herdar os números dele seria pior do
 * que não ter nenhum: seriam medidas de OUTRA página apresentadas ao lado de execuções desta.
 *
 * Este runner atribui cada nó violado pelo axe à mesma CHAVE CANÔNICA de elemento que o scorer
 * usa, resolvendo os seletores que o próprio axe devolve. E prepara a página com a mesma sequência
 * de `setup` do gabarito: medir no primeiro paint enquanto o scorer resolve depois da interação
 * faria as duas metades falarem de árvores diferentes.
 *
 * Uso:
 *   1. suba o corpus: cd ../govbr-corpus && npm run dev
 *   2. npm run baselines:fluxo
 */

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { ESLint } from "eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FlowGroundTruth, FlowViewport } from "../types";
import { ROOT } from "./adjudication";
import { VIEWPORT_PADRAO, preparePage, resolveOnPage } from "./anchors";
import { normalizeRuleId } from "./units";

const execFileAsync = promisify(execFile);

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const GROUND_TRUTH = process.env.FLOW_GT ?? "ground-truth-fluxo.json";
const CORPUS_SRC = process.env.CORPUS_SRC ?? join(ROOT, "..", "govbr-corpus", "src");
const OUT = "results/baselines-fluxo.json";

/** Página-fonte da tela de fluxo. eslint-plugin-jsx-a11y é um linter de código, não de DOM. */
const FLOW_SOURCES = [join(CORPUS_SRC, "pages", "LoginPage.tsx")];

interface AxeFindingRef {
  rule: string;
  impact: string | null;
  description: string;
  /** Seletor que o próprio axe devolveu para o nó. */
  target: string;
}

export interface FlowBaselines {
  timestamp: string;
  appUrl: string;
  state: string;
  /**
   * Janela da passada principal e de cada passada extra (D-35). Uma unidade que só se manifesta em
   * viewport móvel não pode ser cobrada do axe medido a 1280 — ele não teria como vê-la. As
   * detecções de uma passada extra são atribuídas SOMENTE às specs que declaram aquele viewport,
   * para que uma passada não credite a ferramenta por unidades que não estava medindo.
   */
  viewports?: {
    padrao: FlowViewport;
    extras: { viewport: FlowViewport; specs: string[]; violationCount: number; passes: number }[];
  };
  axe: {
    tool: string;
    violationCount: number;
    passes: number;
    /** chave canônica de elemento → achados do axe naquele elemento. */
    byElementKey: Record<string, AxeFindingRef[]>;
    /** Nós cujo seletor o resolvedor não alcançou — reportados, nunca descartados em silêncio. */
    unattributed: AxeFindingRef[];
    /** "needs review" do axe: informativo, nunca contado como detecção. */
    incomplete: string[];
  };
  eslint: {
    tool: string;
    config: string;
    filesLinted: string[];
    /**
     * Achados do linter, SEM atribuição a elemento. Um linter de código aponta arquivo e linha;
     * a unidade desta suíte é um elemento do DOM, e não existe mapa honesto entre os dois sem
     * marcar o corpus — o que o D-02 proíbe. Fica como contagem declarada, e é assim que tem de
     * ser lida.
     */
    findings: { rule: string; message: string; file: string; line: number }[];
  };
  validator?: {
    tool: string;
    version: string;
    byElementKey: Record<string, { rule: string; source: string; description: string; target: string }[]>;
    unattributed: { rule: string; source: string; description: string; target: string }[];
    requiredSpecs: { specId: string; detected: boolean }[];
  };
}

async function main(): Promise<void> {
  const gtPath = join(ROOT, GROUND_TRUTH);
  if (!existsSync(gtPath)) {
    console.error(`Falta ${GROUND_TRUTH}.`);
    process.exit(1);
  }
  const gt = JSON.parse(readFileSync(gtPath, "utf8")) as FlowGroundTruth;
  const url = new URL(gt._meta.url, APP_URL).toString();
  const temSetup = (gt._meta.setup ?? []).length > 0;

  console.log(`\nLinhas de base da suíte de fluxo — ${url}`);
  console.log(temSetup ? "Estado: após a sequência de setup do gabarito." : "Estado: primeiro paint.");

  // ── axe ────────────────────────────────────────────────────────────────────
  const browser = await chromium.launch();
  const viewportPadrao = gt._meta.viewport ?? VIEWPORT_PADRAO;
  const context = await browser.newContext({ viewport: viewportPadrao });
  const page = await context.newPage();
  await preparePage(page, url, { waitFor: gt._meta.waitFor, setup: gt._meta.setup });

  const axe = await new AxeBuilder({ page }).analyze();

  // Cada nó violado carrega os seletores que o axe escolheu. Resolvê-los pelo mesmo caminho do
  // scorer é o que torna a comparação com as unidades do gabarito possível.
  const targets: string[] = [];
  const nodes: { finding: AxeFindingRef }[] = [];
  for (const v of axe.violations) {
    for (const n of v.nodes) {
      const target = n.target.flat().join(" ");
      targets.push(target);
      nodes.push({
        finding: { rule: v.id, impact: v.impact ?? null, description: v.help ?? v.description, target },
      });
    }
  }

  const { bySelector } = await resolveOnPage(page, [...targets, ...gt.violations.map(spec => spec.anchor)]);

  const byElementKey: Record<string, AxeFindingRef[]> = {};
  const unattributed: AxeFindingRef[] = [];
  for (const { finding } of nodes) {
    const keys = bySelector.get(finding.target)?.keys ?? [];
    if (!keys.length) { unattributed.push(finding); continue; }
    for (const k of keys) (byElementKey[k] ??= []).push(finding);
  }

  // ── scanner determinístico do próprio validator ──────────────────────────
  // Processo separado, sem LLM. O request inclui as âncoras do gabarito para que cada lacuna
  // incorporada tenha uma prova executada, não uma presunção baseada no código do checker.
  const validatorRoot = join(ROOT, "..", "govbr-ds-validator");
  const validatorEntry = join(validatorRoot, "dist", "cli", "scan-page.js");
  if (!existsSync(validatorEntry)) throw new Error(`Scanner compilado ausente: ${validatorEntry}. Rode npm run build no validator.`);
  const request = {
    url,
    selectors: [...new Set(gt.violations.map(spec => spec.anchor))],
    checks: ["tokens", "structure"],
    actions: (gt._meta.setup ?? []).map(step => ({
      action: step.action,
      ...(step.selector ? { selector: step.selector } : {}),
      ...(step.value !== undefined ? { value: step.value } : {}),
      ...(step.ms !== undefined ? { ms: step.ms } : {}),
    })),
  };
  const encoded = Buffer.from(JSON.stringify(request), "utf8").toString("base64");
  const { stdout } = await execFileAsync(process.execPath, [validatorEntry, encoded], { maxBuffer: 10 * 1024 * 1024 });
  const scan = JSON.parse(stdout) as {
    findings: Array<{ rule: { id: string; source: string }; element: { locator: string }; evidence: { observed: string } }>;
  };
  const validatorTargets = scan.findings.map(finding => finding.element.locator);
  const validatorResolution = await resolveOnPage(page, validatorTargets);

  // ── passadas extras, uma por viewport declarado (D-35) ────────────────────
  // Uma spec que declara `viewport` descreve defeito que só existe naquela janela. Medi-lo na
  // passada padrão cobraria do axe algo que ele não tinha como ver; medir TUDO na janela extra
  // creditaria a ferramenta por unidades que ela não estava medindo. Por isso a atribuição é
  // restrita às âncoras das specs daquele viewport.
  const extras: NonNullable<FlowBaselines["viewports"]>["extras"] = [];
  const porViewport = new Map<string, { viewport: FlowViewport; specs: typeof gt.violations }>();
  for (const spec of gt.violations) {
    if (!spec.viewport) continue;
    if (spec.viewport.width === viewportPadrao.width && spec.viewport.height === viewportPadrao.height) continue;
    const chave = `${spec.viewport.width}x${spec.viewport.height}`;
    const grupo = porViewport.get(chave) ?? { viewport: spec.viewport, specs: [] };
    grupo.specs.push(spec);
    porViewport.set(chave, grupo);
  }

  for (const [chave, grupo] of porViewport) {
    const ctxExtra = await browser.newContext({ viewport: grupo.viewport });
    const pageExtra = await ctxExtra.newPage();
    await preparePage(pageExtra, url, { waitFor: gt._meta.waitFor, setup: gt._meta.setup });
    const axeExtra = await new AxeBuilder({ page: pageExtra }).analyze();

    const alvosExtra: string[] = [];
    const nosExtra: AxeFindingRef[] = [];
    for (const v of axeExtra.violations) {
      for (const n of v.nodes) {
        const target = n.target.flat().join(" ");
        alvosExtra.push(target);
        nosExtra.push({ rule: v.id, impact: v.impact ?? null, description: v.help ?? v.description, target });
      }
    }
    const ancorasDoGrupo = grupo.specs.map(spec => spec.anchor);
    const { bySelector: porSeletorExtra } = await resolveOnPage(pageExtra, [...alvosExtra, ...ancorasDoGrupo]);

    const chavesDoGrupo = new Set(ancorasDoGrupo.flatMap(sel => porSeletorExtra.get(sel)?.keys ?? []));
    for (const finding of nosExtra) {
      const keys = porSeletorExtra.get(finding.target)?.keys ?? [];
      for (const k of keys) {
        if (!chavesDoGrupo.has(k)) continue;   // fora do escopo desta passada, por desenho
        (byElementKey[k] ??= []).push(finding);
      }
    }

    console.log(`
axe-core @ ${chave} (passada extra, specs ${grupo.specs.map(s => s.id).join(", ")}): ` +
      `${axeExtra.violations.length} regra(s), ${axeExtra.passes.length} passes`);
    for (const v of axeExtra.violations) console.log(`  ${v.id} (${v.impact}) × ${v.nodes.length}`);
    if (!axeExtra.violations.length) console.log("  nenhuma violação");

    extras.push({
      viewport: grupo.viewport,
      specs: grupo.specs.map(spec => spec.id),
      violationCount: axeExtra.violations.length,
      passes: axeExtra.passes.length,
    });
    await ctxExtra.close();
  }

  await browser.close();

  const validatorByElementKey: Record<string, { rule: string; source: string; description: string; target: string }[]> = {};
  const validatorUnattributed: NonNullable<FlowBaselines["validator"]>["unattributed"] = [];
  for (const finding of scan.findings) {
    const ref = {
      rule: normalizeRuleId(finding.rule.id),
      source: finding.rule.source,
      description: finding.evidence.observed,
      target: finding.element.locator,
    };
    const keys = validatorResolution.bySelector.get(finding.element.locator)?.keys ?? [];
    if (!keys.length) validatorUnattributed.push(ref);
    else for (const key of keys) (validatorByElementKey[key] ??= []).push(ref);
  }

  const requiredSpecs = gt.violations.filter(spec => spec.deterministicBaseline).map(spec => {
    const anchorKeys = bySelector.get(spec.anchor)?.keys ?? [];
    const expectedRules = new Set(spec.rules.map(normalizeRuleId));
    const detected = anchorKeys.some(key =>
      (validatorByElementKey[key] ?? []).some(finding => expectedRules.has(normalizeRuleId(finding.rule))),
    );
    return { specId: spec.id, detected };
  });
  const missingRequired = requiredSpecs.filter(spec => !spec.detected);
  if (missingRequired.length) {
    throw new Error(`Baseline determinístico não detectou: ${missingRequired.map(spec => spec.specId).join(", ")}`);
  }
  const validatorPackage = JSON.parse(readFileSync(join(validatorRoot, "package.json"), "utf8")) as { version: string };
  console.log(`\ngovbr-ds-validator: ${scan.findings.length} achado(s) determinístico(s)`);
  console.log(`  specs obrigatórias medidas: ${requiredSpecs.map(spec => `${spec.specId}=ok`).join(", ") || "nenhuma"}`);
  if (validatorUnattributed.length) console.log(`  !! ${validatorUnattributed.length} achado(s) sem elemento resolvido`);

  console.log(`\naxe-core: ${axe.violations.length} regra(s) violada(s), ${nodes.length} nó(s), ${axe.passes.length} passes`);
  for (const v of axe.violations) console.log(`  ${v.id} (${v.impact}) × ${v.nodes.length}`);
  if (!axe.violations.length) console.log("  nenhuma violação");
  if (unattributed.length) console.log(`  !! ${unattributed.length} nó(s) sem elemento resolvido`);
  console.log(`  needs review (não contado): ${axe.incomplete.map(i => i.id).join(", ") || "nenhum"}`);

  // ── eslint-plugin-jsx-a11y ────────────────────────────────────────────────
  const eslint = new ESLint({
    // O fonte do corpus mora fora do govbr-eval; sem isto o ESLint 9 o ignora
    // ("File ignored because outside of base path").
    cwd: dirname(CORPUS_SRC),
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.tsx"],
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { "jsx-a11y": jsxA11y },
        rules: jsxA11y.flatConfigs.recommended.rules,
      },
    ],
  });
  const lintResults = await eslint.lintFiles(FLOW_SOURCES);
  const eslintFindings = lintResults.flatMap(r =>
    r.messages.map(m => ({ rule: m.ruleId ?? "?", message: m.message, file: r.filePath, line: m.line })),
  );
  console.log(`\neslint-plugin-jsx-a11y: ${eslintFindings.length} achado(s) sobre ${FLOW_SOURCES.length} arquivo(s)`);
  for (const f of eslintFindings) console.log(`  ${f.rule} — ${f.message} (linha ${f.line})`);
  if (!eslintFindings.length) console.log("  nenhum achado");
  console.log("  (achados do linter não são atribuídos a elemento — ver o comentário do tipo)");

  const out: FlowBaselines = {
    timestamp: new Date().toISOString(),
    appUrl: url,
    state: temSetup ? "após setup do gabarito" : "primeiro paint",
    viewports: { padrao: viewportPadrao, extras },
    axe: {
      tool: "axe-core via @axe-core/playwright",
      violationCount: axe.violations.length,
      passes: axe.passes.length,
      byElementKey,
      unattributed,
      incomplete: axe.incomplete.map(i => i.id),
    },
    eslint: {
      tool: "eslint-plugin-jsx-a11y (recommended)",
      config: "flat, recommended",
      filesLinted: FLOW_SOURCES,
      findings: eslintFindings,
    },
    validator: {
      tool: "govbr-ds-validator scan_page (tokens + structure)",
      version: validatorPackage.version,
      byElementKey: validatorByElementKey,
      unattributed: validatorUnattributed,
      requiredSpecs,
    },
  };

  writeFileSync(join(ROOT, OUT), JSON.stringify(out, null, 2));
  console.log(`\nEscrito em ${OUT}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
