/**
 * Pontuação da suíte de fluxo (D-23) — unidades ancoradas em elemento.
 *
 * Suíte SEPARADA da `TC-*`: outro gabarito, outro diretório de execuções, outra tabela. Os
 * números das duas nunca se somam nem se promediam, pela mesma razão que injetado e orgânico não
 * se misturam (D-13) — são instrumentos que medem coisas diferentes sobre páginas diferentes.
 *
 * Uso:
 *   1. suba o corpus:  cd ../govbr-corpus && npm run dev
 *   2. npm run ancoras       — o que cada âncora do gabarito alcança (auxílio de autoria)
 *      npm run score:fluxo   — a medição
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { FlowAgentResults, FlowGroundTruth } from "../types";
import type { FlowBaselines } from "./run-baselines-flow";
import { resolveSelectors, resolveWithExcept, type Resolution } from "./anchors";
import { ROOT, loadAdjudications } from "./adjudication";
import {
  buildFlowUnits, scoreFlow, selectorsOfGroundTruth, selectorsOfRuns,
  summarizeFlowFamilies,
  type FlowScore, type FlowUnit,
} from "./units-flow";
import { normalizeRuleId } from "./units";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const GROUND_TRUTH = process.env.FLOW_GT ?? "ground-truth-fluxo.json";

/** Diretórios de execuções da suíte de fluxo, com o braço que cada um implica (D-16/D-17). */
const RUN_DIRS: { dir: string; arm: string }[] = [
  { dir: "runs-fluxo",          arm: "com-oraculo" },
  { dir: "runs-fluxo-ablacao",  arm: "sem-oraculo" },
];

const onlyAnchors = process.argv.includes("--ancoras");
const verbose = process.argv.includes("--verbose");
const includeIncompatible = process.argv.includes("--include-incompatible");

function pct(n: number): string {
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—";
}

function prf(TP: number, FP: number, FN: number) {
  const P = TP + FP > 0 ? TP / (TP + FP) : NaN;
  const R = TP + FN > 0 ? TP / (TP + FN) : NaN;
  const F1 = Number.isFinite(P) && Number.isFinite(R) && P + R > 0 ? (2 * P * R) / (P + R) : NaN;
  return { P, R, F1 };
}

interface LoadedRun { file: string; dir: string; arm: string; data: FlowAgentResults }

function loadRuns(): LoadedRun[] {
  const out: LoadedRun[] = [];
  for (const { dir, arm } of RUN_DIRS) {
    const abs = join(ROOT, "results", dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs).filter(f => f.endsWith(".json")).sort()) {
      const data = JSON.parse(readFileSync(join(abs, file), "utf8")) as FlowAgentResults;
      out.push({ file, dir, arm, data });
    }
  }
  return out;
}

function printAnchors(gt: FlowGroundTruth, res: Resolution, units: FlowUnit[]): void {
  console.log(`\nÂncoras do gabarito resolvidas contra ${res.url}\n`);
  for (const spec of gt.violations) {
    const keys = resolveWithExcept(res, spec.anchor, spec.except);
    // Em `composicao` o número de elementos NÃO é o número de unidades (D-33): imprimir os dois
    // separados é o ponto — foi a conflação dos dois que a spec corrige.
    const declared = spec.scope === "composicao"
      ? ` (declarado: ${spec.participantCount ?? "?"} participante(s) → 1 unidade)`
      : spec.expectedCount != null ? ` (declarado: ${spec.expectedCount})` : "";
    const state = `${spec.state ?? "sempre"}${spec.conditional ? " (condicional)" : ""}`;
    console.log(`  ${spec.id}  ${spec.anchor}${spec.except ? `  except ${spec.except}` : ""}`);
    console.log(`     scope ${spec.scope} → ${keys.length} elemento(s)${declared} · estado: ${state} · regras: ${spec.rules.join(", ")}`);
    for (const k of keys.slice(0, verbose ? keys.length : 4)) {
      const el = res.byKey.get(k);
      console.log(`       ${el?.id}  ${el?.label}`);
    }
    if (!verbose && keys.length > 4) console.log(`       … mais ${keys.length - 4} (use --verbose)`);
    console.log("");
  }
  console.log(`Total: ${units.length} unidade(s) de avaliação a partir de ${gt.violations.length} spec(s).`);
}

/**
 * Linha de base determinística contra as MESMAS unidades (D-06).
 *
 * Deliberadamente generoso com o axe: uma unidade conta como detectada se o axe reportou qualquer
 * coisa naquele elemento, sem exigir que a norma citada bata. Um número generoso que ainda assim
 * é baixo diz mais do que um número apertado que se possa acusar de injusto.
 */
function printBaselines(units: FlowUnit[]): void {
  const path = join(ROOT, "results/baselines-fluxo.json");
  if (!existsSync(path)) {
    console.log("\n!! Linhas de base não medidas — rode `npm run baselines:fluxo`.");
    console.log("   Sem elas nenhuma afirmação comparativa sobre esta tela se sustenta (D-06).");
    return;
  }
  const b = JSON.parse(readFileSync(path, "utf8")) as FlowBaselines;

  const comAxe = new Set(Object.keys(b.axe.byElementKey));
  const TP = units.filter(u => comAxe.has(u.element.key)).length;
  const chavesDeUnidade = new Set(units.map(u => u.element.key));
  const foraDoGabarito = [...comAxe].filter(k => !chavesDeUnidade.has(k)).length;

  console.log(`\nLinhas de base (medidas em ${b.timestamp.slice(0, 16)} · estado: ${b.state})`);
  console.log(
    `  axe-core     ${TP}/${units.length} unidades detectadas · ${b.axe.passes} passes` +
    (foraDoGabarito ? ` · ${foraDoGabarito} elemento(s) sinalizado(s) fora do gabarito` : "") +
    (b.axe.unattributed.length ? ` · ${b.axe.unattributed.length} nó(s) sem elemento resolvido` : ""),
  );
  console.log("               crédito generoso: qualquer achado no elemento conta, sem exigir a norma");
  console.log(`  eslint-a11y  ${b.eslint.findings.length} achado(s) no fonte da tela — NÃO atribuídos a elemento,`);
  console.log("               portanto não comparáveis unidade a unidade; leia como contagem declarada");
  if (TP === 0) {
    console.log(`  → nenhuma das ${units.length} unidades é alcançada pelas ferramentas genéricas.`);
  }
  if (b.validator) {
    const validatorTP = units.filter(unit =>
      (b.validator!.byElementKey[unit.element.key] ?? [])
        .some(finding => unit.rules.includes(normalizeRuleId(finding.rule))),
    ).length;
    console.log(`  validator    ${validatorTP}/${units.length} unidades detectadas por regra exata`);
    console.log(`               baseline obrigatório: ${b.validator.requiredSpecs.map(spec => `${spec.specId}=${spec.detected ? "ok" : "FALHA"}`).join(", ")}`);
  }
}

function printRun(run: LoadedRun, s: FlowScore): void {
  const floor = prf(s.floor.TP, s.floor.FP, s.floor.FN);
  const adj = prf(s.TP, s.FP, s.FN);
  const stamp = run.data.timestamp?.replace("T", " ").slice(0, 19) ?? run.file;
  const usage = run.data.cost?.tokenUsage;
  const visibleTokens = usage
    ? usage.input + usage.cacheCreationInput + usage.cacheReadInput + usage.output
    : run.data.cost?.tokens;
  const costPerUnit = run.data.cost?.totalCostUsd !== undefined && s.TP > 0
    ? run.data.cost.totalCostUsd / s.TP
    : undefined;
  const unitsPer100k = visibleTokens !== undefined && visibleTokens > 0
    ? (s.TP * 100_000) / visibleTokens
    : undefined;
  console.log(
    `${stamp.padEnd(21)} ${(run.data.model ?? "—").padEnd(18)} ` +
    `${pct(floor.P).padStart(7)} ${pct(floor.R).padStart(8)} ${pct(floor.F1).padStart(9)} ` +
    `${pct(adj.F1).padStart(9)} ${String(s.FP).padStart(5)} ${String(s.pending.length).padStart(6)} ` +
    `${String(s.unresolvedCount).padStart(11)} ` +
    `${String(run.data.cost?.wallClockSeconds ?? "—").padStart(8)} ` +
    `${String(run.data.cost?.turns ?? "—").padStart(6)} ` +
    `${(visibleTokens !== undefined ? (visibleTokens / 1_000_000).toFixed(2) : "—").padStart(9)} ` +
    `${(run.data.cost?.mcp ? (run.data.cost.mcp.responseBytes / 1024).toFixed(1) : "—").padStart(8)} ` +
    `${(run.data.cost?.totalCostUsd !== undefined ? run.data.cost.totalCostUsd.toFixed(2) : "—").padStart(8)} ` +
    `${(costPerUnit !== undefined ? costPerUnit.toFixed(4) : "—").padStart(8)} ` +
    `${(unitsPer100k !== undefined ? unitsPer100k.toFixed(3) : "—").padStart(9)}`,
  );
  const byState = new Map<string, { hit: number; total: number; conditional: boolean }>();
  for (const outcome of s.outcomes) {
    const state = outcome.unit.state;
    const item = byState.get(state) ?? { hit: 0, total: 0, conditional: false };
    item.total++;
    if (outcome.matched) item.hit++;
    item.conditional ||= outcome.unit.conditional;
    byState.set(state, item);
  }
  console.log(
    "   alcance por estado: " + [...byState.entries()]
      .map(([state, item]) => `${state}${item.conditional ? " [condicional]" : ""} ${item.hit}/${item.total}`)
      .join(" · "),
  );
  const families = summarizeFlowFamilies(s.outcomes);
  const grounding = s.TP > 0 ? s.ruleVerifiedTP / s.TP : NaN;
  const related = s.outcomes.filter(outcome => outcome.anchorMode === "related").length;
  const detectedWithoutGrounding = s.outcomes.filter(
    outcome => outcome.matched && outcome.adjudicationVerdict === "deteccao-correta",
  ).length;
  console.log(
    `   famílias: ${families.detected}/${families.total} detectadas · ${families.complete}/${families.total} completas` +
    ` · grounding explícito ${pct(grounding)} · detecção sem grounding ${detectedWithoutGrounding}` +
    ` · âncora relacional ${related}` +
    (s.absorbed.length ? ` · irmãos absorvidos ${s.absorbed.length} (D-33)` : ""),
  );
  if (verbose) {
    for (const o of s.outcomes.filter(o => !o.matched)) {
      console.log(`     FN  ${o.unit.element.id} ${o.unit.element.label} — ${o.unit.specId} (${o.unit.rules[0]})`);
    }
    for (const l of s.leftovers) {
      console.log(`     ${l.verdict ?? "sobra"}  ${l.elementId} ${l.selector} — ${l.description.slice(0, 90)}`);
    }
    // Nem crédito nem cobrança — mas visível, para que "absorvido" nunca vire "desaparecido".
    for (const a of s.absorbed) {
      console.log(`     absorvido  ${a.elementId} ${a.selector} — ${a.description.slice(0, 90)}`);
    }
  }
}

async function main(): Promise<void> {
  if (!onlyAnchors) {
    console.log("LEGACY citation scorer: selector/rule matches are not semantic verification.");
    console.log("For reviewed detection use npm run flow:review -- prepare/score (flow-semantic-1.0.0). Historical numbers below are unchanged.");
  }
  const gtPath = join(ROOT, GROUND_TRUTH);
  if (!existsSync(gtPath)) {
    console.error(`Falta ${GROUND_TRUTH}. A suíte de fluxo do D-23 ainda não tem gabarito.`);
    process.exit(1);
  }
  const gt = JSON.parse(readFileSync(gtPath, "utf8")) as FlowGroundTruth;
  // Duas dimensões, dois campos (D-31). O gate de compatibilidade é o CONTRATO sob o qual a
  // execução foi coletada; a versão do gabarito diz contra qual conjunto de unidades ela foi
  // pontuada. Corrigir o gabarito muda o número, não invalida a execução.
  const gabaritoVersion = String(gt._meta.version ?? "não versionado");

  if (!gt.violations?.length) {
    console.log(`\n${GROUND_TRUTH} não declara nenhuma violação ainda.`);
    console.log("A tela do D-23 não foi escrita — o instrumento existe, a medição não.\n");
    return;
  }

  const archivedRuns = loadRuns();
  const url = new URL(gt._meta.url, APP_URL).toString();
  const expectedInstrument = FLOW_INSTRUMENT_VERSION;
  const incompatibleRuns = archivedRuns.filter(run => run.data.config?.instrumentVersion !== expectedInstrument);
  const runs = includeIncompatible
    ? archivedRuns
    : archivedRuns.filter(run => run.data.config?.instrumentVersion === expectedInstrument);

  if (incompatibleRuns.length) {
    console.log(`\n⚠ ${incompatibleRuns.length} execução(ões) arquivada(s) não pertencem a ${expectedInstrument}` +
      (includeIncompatible ? " (incluídas apenas por --include-incompatible)." : " e não serão pontuadas."));
    for (const run of incompatibleRuns) {
      console.log(`   ${run.dir}/${run.file}: ${run.data.config?.instrumentVersion ?? "legado/não rotulado"}`);
    }
    console.log("   Use --include-incompatible somente para diagnóstico histórico; nunca agregue esses números à medida atual.");
  }

  // Um único carregamento para os dois lados: gabarito e achados resolvidos contra a MESMA
  // árvore. Resolver em cargas diferentes admitiria que a página mudasse no meio.
  const res = await resolveSelectors(
    url,
    [...selectorsOfGroundTruth(gt), ...selectorsOfRuns(runs.map(r => r.data))],
    { waitFor: gt._meta.waitFor, setup: gt._meta.setup },
  );

  const { units, defects } = buildFlowUnits(gt, res);

  if (defects.length) {
    console.error(`\n✗ O gabarito de fluxo e a página discordam — nada é medido enquanto isto valer:\n`);
    for (const d of defects) console.error(`  ${d.specId}: ${d.problem}`);
    console.error("\nCorrija a âncora ou a contagem declarada e rode de novo.\n");
    process.exit(1);
  }

  if (onlyAnchors) { printAnchors(gt, res, units); return; }

  console.log(`\nSuíte de fluxo — ${gt._meta.page} · ${url}`);
  console.log(`Instrumento: ${FLOW_INSTRUMENT_VERSION}  ·  gabarito: ${gabaritoVersion}`);
  console.log("Os dois versionam coisas diferentes: o instrumento é o contrato de coleta e");
  console.log("pontuação, o gabarito é o conjunto de unidades. Números de gabaritos diferentes");
  console.log("não se comparam entre si, ainda que o instrumento seja o mesmo (D-31).");
  console.log(`${units.length} unidade(s) de avaliação (elemento × regra) a partir de ${gt.violations.length} spec(s).`);

  printBaselines(units);

  if (!runs.length) {
    console.log(`\nNenhuma execução compatível com ${expectedInstrument} arquivada em results/${RUN_DIRS.map(r => r.dir).join(", results/")}.\n`);
    return;
  }

  const adj = loadAdjudications();
  const groups = new Map<string, LoadedRun[]>();
  for (const r of runs) {
    const c = r.data.config;
    const key =
      `${r.arm} | ${r.data.model ?? "—"} | ${c?.client ?? "cliente não rotulado"} | ` +
      `${c?.reasoningEffort ?? "esforço não rotulado"} | ` +
      `${c?.oracleProfile ?? (r.arm === "sem-oraculo" ? "none" : "perfil não rotulado")} | ` +
      `${c?.instrumentVersion ?? "instrumento legado/não rotulado"} | gabarito ${gabaritoVersion} | ` +
      `${c?.protocolVersion ?? "protocolo não versionado"} | ` +
      `${c?.validatorVersion ?? (r.arm === "com-oraculo" ? "validator não versionado" : "sem validator")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  for (const [key, rs] of groups) {
    console.log(`\n── ${key} — ${rs.length} run(s)`);
    console.log(
      "Run".padEnd(21) + " " + "Modelo".padEnd(18) +
      " P piso".padStart(8) + " R piso".padStart(9) + " F1 piso".padStart(10) +
      " F1 adj".padStart(10) + "  FP".padStart(6) + " pend.".padStart(7) + " sem seletor".padStart(12) +
      " wall".padStart(9) + " turns".padStart(7) + " tokens M".padStart(10) +
      " MCP KB".padStart(9) + " US$".padStart(9) + " $/unit".padStart(9) + " unit/100k".padStart(10),
    );
    console.log("─".repeat(166));
    for (const r of rs) printRun(r, scoreFlow(r.data, units, res, adj));
    if (rs.length < 3) console.log("   F3 exige 3–5 execuções nesta MESMA configuração para média ± DP.");
    if (new Set(rs.map(r => r.data.config?.client)).size > 1) {
      console.log("   turns é contador nativo do cliente e não é comparável entre fornecedores.");
    }
  }
  console.log("");
}

main().catch(err => { console.error(err); process.exit(1); });
