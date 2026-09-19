/**
 * Confere a referência de uma tela contra a página viva — sem modelo, sem bateria.
 *
 * É a mesma medida que `flow:review prepare` faz ao montar o pacote (estados, aditividade do setup,
 * `sempre` / `conditional`, contagens e predicados de aceitação), tirada daqui para que uma
 * referência errada pare ANTES de a bateria ser paga, e não na preparação do pacote depois dela.
 * Nada é creditado e nada é gravado.
 *
 * Uso: APP_URL=http://host:porta npx tsx scripts/check-reference.ts --tela solicitacao
 *      (APP_URL aponta para quem serve o `dist/` do corpus; padrão http://localhost:3000)
 */
import { readFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";
import { ROOT } from "./adjudication";
import { openPage, resolveStatesOnPage, resolveWithExcept } from "./anchors";
import { statePlanOf } from "./collection-manifest";
import { combinePredicate, describePredicate, measurePredicate, validatePredicate, type PredicateResult } from "./acceptance-predicates";
import { buildFlowUnits, measureStatePresence, selectorsOfGroundTruth, statesOfGroundTruth } from "./units-flow";
import { telaFromArgs } from "./telas";
import type { FlowGroundTruth } from "../types";

async function main(): Promise<number> {
  const tela = telaFromArgs(process.argv.slice(2));
  const gt = JSON.parse(readFileSync(join(ROOT, tela.reference), "utf8")) as FlowGroundTruth;
  const url = new URL(gt._meta.url, process.env.APP_URL ?? "http://localhost:3000").toString();
  const checkpoints = statesOfGroundTruth(gt);
  if (!checkpoints) throw new Error(`${tela.reference} não declara _meta.states: não há estado a conferir.`);
  const problems: string[] = [];
  for (const spec of gt.violations) {
    const forma = spec.acceptance ? validatePredicate(spec.acceptance) : null;
    if (forma) problems.push(`${spec.id}: predicado malformado — ${forma}`);
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: statePlanOf(gt).padrao });
    const page = await context.newPage();
    await openPage(page, url, { waitFor: gt._meta.waitFor });
    const aceitacao = new Map<string, PredicateResult[]>();
    const across = await resolveStatesOnPage(page, url, selectorsOfGroundTruth(gt), {
      setup: gt._meta.setup, states: checkpoints,
      onState: async (state, res, pg) => {
        for (const spec of gt.violations) {
          if (!spec.acceptance) continue;
          const keys = resolveWithExcept(res, spec.anchor, spec.except);
          if (keys.length === 0) continue;
          aceitacao.set(spec.id, [...(aceitacao.get(spec.id) ?? []), await measurePredicate(pg, spec.anchor, keys, spec.acceptance, state)]);
        }
      },
    });
    const medida = measureStatePresence(across);
    problems.push(...medida.defects.map(d => `${d.specId}: ${d.problem}`));
    const built = buildFlowUnits(gt, across.byState.get(across.order[across.order.length - 1])!, medida.presence);
    problems.push(...built.defects.map(d => `${d.specId}: ${d.problem}`));

    console.log(`${tela.nome} · ${tela.reference} ${String(gt._meta.version)} · ${url}`);
    console.log(`estados: ${across.order.join(" → ")} · ${gt.violations.length} specs · ${built.units.length} unidades\n`);
    for (const spec of gt.violations) {
      const unidades = built.units.filter(u => u.specId === spec.id);
      const resultado = combinePredicate(aceitacao.get(spec.id) ?? []);
      const predicado = spec.acceptance ? `${resultado.outcome} — ${describePredicate(spec.acceptance)} (${resultado.reason})` : "sem predicado";
      if (resultado.outcome === "refuta" || resultado.outcome === "nao-replicavel") problems.push(`${spec.id}: predicado ${resultado.outcome} — ${resultado.reason}`);
      console.log(`  ${spec.id}  ${unidades.length} unidade(s) · ${spec.state ?? "sempre"}${spec.conditional ? " (condicional)" : ""} · ${predicado}`);
    }
    await context.close();
  } finally {
    await browser.close();
  }

  if (problems.length) {
    console.error(`\n${problems.length} problema(s) na referência:\n${problems.map(p => `  - ${p}`).join("\n")}`);
    return 1;
  }
  console.log("\nReferência conferida: estados, contagens e predicados sustentam na página.");
  return 0;
}

main().then(code => process.exit(code)).catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
