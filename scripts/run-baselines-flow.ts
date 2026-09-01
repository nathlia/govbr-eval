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
import type { FlowGroundTruth } from "../types";
import { ROOT } from "./adjudication";
import { preparePage, resolveOnPage } from "./anchors";

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
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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

  const { bySelector } = await resolveOnPage(page, targets);
  await browser.close();

  const byElementKey: Record<string, AxeFindingRef[]> = {};
  const unattributed: AxeFindingRef[] = [];
  for (const { finding } of nodes) {
    const keys = bySelector.get(finding.target)?.keys ?? [];
    if (!keys.length) { unattributed.push(finding); continue; }
    for (const k of keys) (byElementKey[k] ??= []).push(finding);
  }

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
  };

  writeFileSync(join(ROOT, OUT), JSON.stringify(out, null, 2));
  console.log(`\nEscrito em ${OUT}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
