/**
 * Confere a referência de uma tela contra a página viva — sem modelo, sem bateria.
 *
 * É a mesma medida que `flow:review prepare` faz ao montar o pacote (estados, aditividade do setup,
 * `sempre` / `conditional`, contagens e predicados de aceitação), tirada daqui para que uma
 * referência errada pare ANTES de a bateria ser paga, e não na preparação do pacote depois dela.
 * Nada é creditado e nada é gravado.
 *
 * Mede também referência cujo `setup` navega (D-57): estado a estado, com a aditividade cobrada por
 * segmento, o endereço de cada parada conferido contra o `path` declarado, cada parada estável na
 * janela de estabilidade (D-60) e cada spec construída no fim do segmento do seu estado. O preflight
 * da bateria a roda contra a página congelada antes de qualquer modelo.
 *
 * Uso: APP_URL=http://host:porta npx tsx scripts/check-reference.ts --tela solicitacao
 *      (APP_URL aponta para quem serve o `dist/` do corpus; padrão http://localhost:3000)
 */
import { readFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";
import { ROOT } from "./adjudication";
import { openPage, resolveStatesOnPage, resolveWithExcept, segmentoApos, temNavegacao } from "./anchors";
import { statePlanOf } from "./collection-manifest";
import { combinePredicate, describePredicate, measurePredicate, validatePredicate, type PredicateResult } from "./acceptance-predicates";
import { buildFlowUnitsAcross, measureStatePresence, selectorsOfGroundTruth, specMedidaNoEstado, statesOfGroundTruth } from "./units-flow";
import { KB_ALIASES_VIGENTE } from "./units";
import { referenciaDe, telaFromArgs } from "./telas";
import type { FlowGroundTruth } from "../types";

async function main(): Promise<number> {
  const tela = telaFromArgs(process.argv.slice(2));
  // Tela sem referência congelada para aqui, nomeando o arquivo que falta: não há o que conferir.
  const referencia = referenciaDe(tela);
  const gt = JSON.parse(readFileSync(join(ROOT, referencia), "utf8")) as FlowGroundTruth;
  const url = new URL(gt._meta.url, process.env.APP_URL ?? "http://localhost:3000").toString();
  const checkpoints = statesOfGroundTruth(gt);
  if (!checkpoints) throw new Error(`${referencia} não declara _meta.states: não há estado a conferir.`);
  const problems: string[] = [];
  // Segmento de cada parada (quantos `navigate` já correram), sabido antes de tocar a página: é
  // por ele que o predicado de uma spec com estado declarado só é medido na rota desse estado.
  const segmentOf = new Map(checkpoints.map(c => [c.id, segmentoApos(gt._meta.setup, c.afterStep)] as const));
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
      // Com navegação (D-60) cada parada tem de ficar parada: é a conferência que o preflight da
      // bateria roda, e a linha de base e o pacote cobram a mesma coisa depois.
      estabilidade: temNavegacao(gt._meta.setup),
      onState: async (state, res, pg) => {
        for (const spec of gt.violations) {
          if (!spec.acceptance || !specMedidaNoEstado(spec, state, segmentOf)) continue;
          const keys = resolveWithExcept(res, spec.anchor, spec.except);
          if (keys.length === 0) continue;
          aceitacao.set(spec.id, [...(aceitacao.get(spec.id) ?? []), await measurePredicate(pg, spec.anchor, keys, spec.acceptance, state)]);
        }
      },
    });
    const medida = measureStatePresence(across);
    problems.push(...medida.defects.map(d => `${d.specId}: ${d.problem}`));
    const built = buildFlowUnitsAcross(gt, across, medida.presence, KB_ALIASES_VIGENTE);
    problems.push(...built.defects.map(d => `${d.specId}: ${d.problem}`));

    console.log(`${tela.nome} · ${referencia} ${String(gt._meta.version)} · ${url}`);
    console.log(`estados: ${across.order.join(" → ")} · ${gt.violations.length} specs · ${built.units.length} unidades\n`);
    // Só com navegação: onde cada parada estava. Sem ela a saída é a de sempre, linha a linha.
    if (medida.presence.segmentOf && across.navigation) {
      for (const e of across.order) {
        console.log(`  ${e}  segmento ${medida.presence.segmentOf.get(e)} · ${across.navigation.pathOf.get(e)}`);
      }
      console.log("");
    }
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
