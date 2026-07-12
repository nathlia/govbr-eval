/**
 * Axe-core baseline runner
 *
 * Runs axe-core against each test page and maps violations back to
 * test case IDs (via data-testid on the containing <section>).
 *
 * Usage:
 *   1. Start the corpus app: cd ../govbr-corpus && npm run dev
 *   2. npm run axe
 *   3. Results written to results/axe-results.json
 */

import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AxePageResult, AxeResults, AxeViolationRef } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface PageConfig {
  name: string;
  url: string;
  /** SPA tab label to click, or null for standalone pages (static routes, D-15). */
  tabLabel: string | null;
  /**
   * Static routes carry exactly one case — document-level violations (e.g. a
   * <meta> in <head>, outside any data-testid section) attribute to it.
   */
  defaultCaseId?: string;
  /**
   * Organic wing (D-13): fragment-selector button to click inside the tab —
   * the tab mounts one official example fragment at a time.
   */
  subLabel?: string;
}

const PAGES: PageConfig[] = [
  { name: "buttons",         url: APP_URL, tabLabel: "Botões" },
  { name: "forms",           url: APP_URL, tabLabel: "Formulário" },
  { name: "nav",             url: APP_URL, tabLabel: "Navegação" },
  { name: "table",           url: APP_URL, tabLabel: "Tabelas" },
  { name: "list",            url: APP_URL, tabLabel: "Listas" },
  { name: "interactive",     url: APP_URL, tabLabel: "Interativos" },
  { name: "static-refresh",  url: `${APP_URL}/static/atualizacao.html`, tabLabel: null, defaultCaseId: "TC-S-01" },
  { name: "static-layering", url: `${APP_URL}/static/confirmacao.html`, tabLabel: null, defaultCaseId: "TC-S-02" },
  { name: "static-clean",    url: `${APP_URL}/static/protocolo.html`,   tabLabel: null, defaultCaseId: "TC-S-03" },
  // Organic wing (D-13) — scored by the separate organic suite, never pooled
  { name: "organic-card-collapse",     url: APP_URL, tabLabel: "Orgânico", subLabel: "card-collapse.html" },
  { name: "organic-card-disabled",     url: APP_URL, tabLabel: "Orgânico", subLabel: "card-disabled.html" },
  { name: "organic-card-examples",     url: APP_URL, tabLabel: "Orgânico", subLabel: "card-examples.html" },
  { name: "organic-card-scroll",       url: APP_URL, tabLabel: "Orgânico", subLabel: "card-scroll.html" },
  { name: "organic-wizard-horizontal", url: APP_URL, tabLabel: "Orgânico", subLabel: "wizard-horizontal.html" },
  { name: "organic-wizard-vertical",   url: APP_URL, tabLabel: "Orgânico", subLabel: "wizard-vertical.html" },
];

// Map an axe violation node's target selector back to its data-testid ancestor.
// axe returns targets like ["#some-id"] or ["section[data-testid='TC-B-02'] button"]
// We use playwright to evaluate the closest data-testid ancestor of each node.
async function findTestCaseId(page: Page, target: string | string[]): Promise<string | null> {
  const selector = Array.isArray(target) ? target[target.length - 1] : target;
  try {
    return await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const section = el.closest("[data-testid]");
      return section ? section.getAttribute("data-testid") : null;
    }, selector);
  } catch {
    return null;
  }
}

interface EnrichedNode {
  target: unknown;
  testCaseId: string | null;
}

interface EnrichedViolation {
  id: string;
  impact: string | null | undefined;
  description: string;
  helpUrl: string;
  nodes: EnrichedNode[];
}

async function runPage({ name, url, tabLabel, defaultCaseId, subLabel }: PageConfig) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  // Click the nav tab to activate the right page (SPA pages only)
  if (tabLabel !== null) {
    const tabButton = page.locator("nav button", { hasText: tabLabel });
    if (await tabButton.count() > 0) {
      await tabButton.click();
      await page.waitForTimeout(300);
    }
  }

  // Organic wing: mount the requested fragment
  if (subLabel) {
    await page.locator("main button", { hasText: subLabel }).click();
    await page.waitForTimeout(300);
  }

  const results = await new AxeBuilder({ page }).analyze();

  // Enrich each result with the test case ID
  const enrich = (list: typeof results.violations): Promise<EnrichedViolation[]> =>
    Promise.all(
      list.map(async (v) => {
        const enrichedNodes: EnrichedNode[] = await Promise.all(
          v.nodes.map(async (n) => {
            const caseId = await findTestCaseId(page, n.target as string | string[]);
            return { target: n.target, testCaseId: caseId ?? defaultCaseId ?? null };
          })
        );
        return {
          id: v.id,
          impact: v.impact,
          description: v.description,
          helpUrl: v.helpUrl,
          nodes: enrichedNodes,
        };
      })
    );

  const enriched = await enrich(results.violations);
  const incomplete = await enrich(results.incomplete);

  await browser.close();
  return { page: name, url, violations: enriched, incomplete, passes: results.passes.length };
}

async function main() {
  console.log("Running axe-core baseline...\n");

  const allResults: Record<string, AxePageResult> = {};

  for (const pageConfig of PAGES) {
    console.log(`  → ${pageConfig.name}`);
    const result = await runPage(pageConfig);

    // Build flat summaries keyed by test case ID
    const toByCaseId = (list: EnrichedViolation[]): Record<string, AxeViolationRef[]> => {
      const map: Record<string, AxeViolationRef[]> = {};
      for (const violation of list) {
        for (const node of violation.nodes) {
          const id = node.testCaseId;
          if (!id) continue;
          if (!map[id]) map[id] = [];
          map[id].push({
            rule: violation.id,
            impact: violation.impact ?? undefined,
            description: violation.description,
            helpUrl: violation.helpUrl,
          });
        }
      }
      return map;
    };
    const byCaseId = toByCaseId(result.violations);
    const incompleteByCaseId = toByCaseId(result.incomplete);
    allResults[pageConfig.name] = {
      passes: result.passes,
      violationCount: result.violations.length,
      byCaseId,
      incompleteByCaseId,
      raw: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({ target: n.target, testCaseId: n.testCaseId })),
      })),
    };

    const detected = Object.keys(byCaseId);
    console.log(`     Violations: ${result.violations.length} rules fired`);
    console.log(`     Test cases with violations: ${detected.join(", ") || "none"}`);
    console.log(`     Needs review (incomplete, not counted): ${Object.keys(incompleteByCaseId).join(", ") || "none"}\n`);
  }

  const output: AxeResults = {
    timestamp: new Date().toISOString(),
    tool: "axe-core via @axe-core/playwright",
    appUrl: APP_URL,
    results: allResults,
  };

  const json = JSON.stringify(output, null, 2);
  const outPath = join(ROOT, "results", "axe-results.json");
  const publicPath = join(ROOT, "dashboard", "public", "axe-results.json");
  writeFileSync(outPath, json);
  writeFileSync(publicPath, json);
  console.log(`Results written to results/axe-results.json and dashboard/public/axe-results.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
