/**
 * Pacote de revisão da suíte de fluxo (11.9 / D-21).
 *
 * A primeira versão deste gerador lia os stubs de `adjudications.json` direto. Era uma SEGUNDA
 * implementação da pergunta "o que ainda sobrou sem unidade?", e divergiu na primeira vez que o
 * gabarito mudou: a correção de escopo do V-06 (D-31) transformou duas alegações em acertos, e o
 * pacote seguiu listando as duas porque os stubs continuavam lá. Agora reusa exatamente o caminho
 * do scorer — resolver âncoras na página viva, montar unidades, pontuar, ler `leftovers`.
 *
 * Uso: `npm run pacote:revisao` com o corpus no ar em :3000.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FlowAgentResults, FlowGroundTruth } from "../types";
import { ROOT, loadAdjudications, recordDefect } from "./adjudication";
import { resolveSelectors } from "./anchors";
import {
  buildFlowUnits, scoreFlow, selectorsOfGroundTruth, selectorsOfRuns,
} from "./units-flow";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const OUT = join(ROOT, "docs", "pacote-revisao-fluxo.md");

/** A execução pontuada. Alegações de execuções que o scorer recusa não movem número nenhum. */
const RUN_PONTUADA = process.env.PACOTE_RUN ?? "agent-2026-09-02T06-21-31-820Z.json";

function loadRun(): { file: string; data: FlowAgentResults } {
  for (const dir of ["runs-fluxo", "runs-fluxo-ablacao"]) {
    const abs = join(ROOT, "results", dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs)) {
      if (file === RUN_PONTUADA) {
        return { file, data: JSON.parse(readFileSync(join(abs, file), "utf8")) as FlowAgentResults };
      }
    }
  }
  throw new Error(`Execução ${RUN_PONTUADA} não encontrada.`);
}

async function main(): Promise<void> {
  const gt = JSON.parse(readFileSync(join(ROOT, "ground-truth-fluxo.json"), "utf8")) as FlowGroundTruth;
  const gabaritoVersion = String(gt._meta.version ?? "não versionado");
  const run = loadRun();

  const url = new URL(gt._meta.url, APP_URL).toString();
  const res = await resolveSelectors(
    url,
    [...selectorsOfGroundTruth(gt), ...selectorsOfRuns([run.data])],
    { waitFor: gt._meta.waitFor, setup: gt._meta.setup },
  );
  const { units, defects } = buildFlowUnits(gt, res);
  if (defects.length) {
    throw new Error(`Gabarito inválido: ${defects.map(d => `${d.specId}: ${d.problem}`).join("; ")}`);
  }

  const adj = loadAdjudications();
  const score = scoreFlow(run.data, units, res, adj);
  const pendentes = score.leftovers
    .filter(l => {
      const r = adj.byId.get(l.id);
      return !(r && r.verdict !== null && !recordDefect(r));
    })
    .sort((a, b) => a.id.split(":")[1].localeCompare(b.id.split(":")[1]));

  const casadas = new Set(score.outcomes.filter(o => o.matched).map(o => o.unit.specId));
  const tokens = (s: string) => (s ?? "").split(/[\s,>]+/).map(t => t.trim())
    .filter(t => t.startsWith(".") || t.startsWith("#") || /^[a-z]+$/i.test(t));

  const L: string[] = [];
  L.push("# Pacote de revisão — suíte de fluxo (11.9 / D-21)");
  L.push("");
  L.push("> Gerado por `npm run pacote:revisao`, lendo as sobras que o scorer produz agora — não");
  L.push("> os stubs arquivados. Escopo: a única execução pontuada sob o instrumento vigente.");
  L.push("");
  L.push(`- **instrumento:** \`${FLOW_INSTRUMENT_VERSION}\` · **gabarito:** \`${gabaritoVersion}\``);
  L.push(`- **execução:** ${run.file} · ${run.data.model ?? "—"}`);
  L.push(`- **unidades:** ${units.length} a partir de ${gt.violations.length} specs · **sobras pendentes:** ${pendentes.length}`);
  L.push("");
  L.push("**Quem julga.** A tela e o gabarito foram redigidos pelo ASSISTENTE, sob direção da");
  L.push("autora — é o assistente que a regra do 11.9 desqualifica, não ela. A autora nunca");
  L.push("enumerou os defeitos injetados; o que ela tem é exposição pontual às specs que discutiu");
  L.push("nas decisões (V-04 no D-33, V-06 no D-31, V-07 no D-32). Alegação sobre elemento sem spec");
  L.push("e fora dessas: ela julga como revisora independente. Alegação que toque uma spec exposta:");
  L.push("outra pessoa julga, ou o registro carrega `exposicao` declarada. Ver");
  L.push("`docs/adjudicacao.md § Quem pode julgar`.");
  L.push("");
  L.push("**Sobre cegueira.** `--blind` esconde o braço, e esta medida tem um único braço: não há");
  L.push("braço a esconder, e dizê-lo é mais honesto que encenar o procedimento. A ordem abaixo é o");
  L.push("hash do achado, o que ao menos evita ordenar por conveniência. Quando existir o par");
  L.push("`com`/`sem` (11.10), o procedimento cego volta a ser obrigatório.");
  L.push("");
  L.push("## Vereditos");
  L.push("");
  L.push("| veredito | quando | efeito |");
  L.push("|---|---|---|");
  L.push("| `falso-positivo` | não é verdade na página | cobrado da precisão |");
  L.push("| `lacuna-gabarito` | é verdade, e o gabarito nunca catalogou | sai do FP, entra na dívida |");
  L.push("| `vocabulario` | é a unidade abaixo, com nome que o scorer não conhece | casamento adjudicado (**exige `unit`**) |");
  L.push("| `deteccao-correta` | conteúdo certo, citação ou âncora inválida | credita detecção, não `ruleVerifiedTP` (**exige `unit`**) |");
  L.push("| `duplicado` | reformulação de outro achado já casado no mesmo elemento | sai do FP |");
  L.push("| `indeterminado` | revisado e indecidível | **segue cobrado como FP** |");
  L.push("| `composto` | a alegação afirma **mais de um defeito** | decidido por parte em `components` |");
  L.push("");
  L.push("**O teste do defeito composto:** *consertar um defeito consertaria o outro?* Se não, são");
  L.push("duas unidades e o veredito é `composto`, com um componente por defeito. A alegação é");
  L.push("cobrada uma única vez se qualquer parte resolver em cobrança. Ver `docs/adjudicacao.md`.");
  L.push("");
  L.push("Um veredito sem `rationale` não é aplicado: o scorer o ignora e segue cobrando o FP.");
  L.push("Carimbe também `adjudicatedBy` e `adjudicatedAt` em cada registro julgado, e");
  L.push("`exposicao` quando quem julga já tinha discutido aquela spec (ex.: `\"V-07 (D-32)\"`).");
  L.push("");
  L.push("## Referência — as specs do gabarito");
  L.push("");
  L.push("| spec | âncora | regras aceitas | estado | casada nesta execução |");
  L.push("|---|---|---|---|---|");
  for (const v of gt.violations) {
    const est = (v.state ?? "sempre") + (v.conditional ? " (cond.)" : "");
    const n = v.expectedCount != null ? ` ×${v.expectedCount}` : "";
    L.push(`| **${v.id}** | \`${v.anchor}\`${n} | ${v.rules.map(r => `\`${r}\``).join(" · ")} | ${est} | ${casadas.has(v.id) ? "sim" : "**não**"} |`);
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push(`## As ${pendentes.length} alegações pendentes`);
  L.push("");

  pendentes.forEach((c, i) => {
    const meus = new Set(tokens(c.selector));
    const cand = gt.violations.filter(v => tokens(v.anchor).some(t => meus.has(t)));
    L.push(`### ${i + 1}. \`${c.id}\``);
    L.push("");
    L.push(`- **elemento:** \`${c.selector}\` — ${c.elementLabel}`);
    L.push(`- **regras citadas:** ${c.rules.map(r => `\`${r}\``).join(", ") || "—"}`);
    if (c.unresolved) L.push("- ⚠ **seletor não resolve** nenhum elemento da página");
    L.push("");
    L.push("> " + c.description.replace(/\n+/g, " "));
    L.push("");
    if (cand.length) {
      L.push("**Specs ancoradas neste elemento** — candidatas a `unit`:");
      L.push("");
      for (const v of cand) {
        L.push(`- **${v.id}** \`${v.anchor}\` · ${v.rules.map(r => `\`${r}\``).join(" · ")} · ${casadas.has(v.id) ? "**já casada** → se for esta, `duplicado`" : "não casada → `vocabulario` ou `deteccao-correta` cabem"}`);
        L.push(`  - ${(v.description ?? "").slice(0, 220)}`);
      }
    } else {
      L.push("**Nenhuma spec do gabarito ancora neste elemento.** Se a alegação for verdadeira na");
      L.push("página, é `lacuna-gabarito`; se não for, `falso-positivo`.");
    }
    L.push("");
    L.push("```json");
    L.push(`{ "id": "${c.id}", "verdict": "", "rationale": "" }`);
    L.push("```");
    L.push("");
    L.push("---");
    L.push("");
  });

  L.push("## Depois de julgar");
  L.push("");
  L.push("```");
  L.push("npm run adjudicate      # julgados, pendentes, registros não aplicáveis");
  L.push("npm run score:fluxo     # piso e adjudicado lado a lado");
  L.push("npm run pacote:revisao  # regenera este arquivo a partir das sobras atuais");
  L.push("```");
  L.push("");
  L.push("Cada `lacuna-gabarito` vira dívida: escrevê-la no gabarito exige rodar de novo");
  L.push("`npm run baselines:fluxo` (D-06) e incrementar a versão do gabarito (D-31). Toda unidade");
  L.push("acrescentada assim vira FN para execuções que nunca tiveram chance de encontrá-la — o");
  L.push("viés de pooling se relata, não se corrige.");
  L.push("");

  writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(`escrito: ${OUT} · ${pendentes.length} alegações pendentes de ${score.leftovers.length} sobra(s)`);
}

main().catch(err => { console.error(err); process.exit(1); });
