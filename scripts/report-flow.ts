/**
 * Resultados da bateria a partir de UMA pontuação (fatia 7).
 *
 * A regra que este script existe para cumprir: tabelas, JSON de resultados e resumo de fechamento
 * saem todos da mesma chamada de `scoreSemanticPackage`. O painel v01 mantinha fórmulas próprias e
 * por isso podia discordar do scorer sem que nada acusasse — duas fontes da mesma verdade, o defeito
 * estrutural que o log acompanha desde o D-13. Aqui não há aritmética de métrica: o que este arquivo
 * faz é agrupar, ordenar e imprimir o que o scorer já decidiu.
 *
 * O que ele calcula por conta própria, e só isso: média e desvio-padrão entre execuções do mesmo
 * braço, e somas de custo. Nenhuma delas redefine detecção, crédito ou veredito.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  normalizeReviews, reviewEffort, reviewQueue, scoreSemanticPackage, validatePackage,
  type RawReviews, type SemanticPackage, type SemanticRunScore,
} from "./semantic-flow";

const args = process.argv.slice(2);
function option(name: string, required = true): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0) {
    if (required) throw new Error(`Missing --${name}`);
    return undefined;
  }
  const v = args[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`Missing value for --${name}`);
  return v;
}
const read = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;

/** `com-oraculo` / `sem-oraculo` vêm do config da execução arquivada; a linha de base é o terceiro. */
function armOf(config: unknown, kind: string): string {
  if (kind === "linha-de-base") return "linha-de-base";
  const arm = (config as { arm?: string } | null)?.arm;
  return arm ?? "desconhecido";
}

interface Cost {
  totalCostUsd: number | null; wallClockSeconds: number | null; turns: number | null;
  tokens: number | null; cacheReadInput: number | null; cacheCreationInput: number | null;
  output: number | null; mcpCalls: number | null;
}
function costOf(raw: unknown): Cost {
  const c = (raw ?? {}) as Record<string, unknown>;
  const usage = (c.tokenUsage ?? {}) as Record<string, number | undefined>;
  const mcp = (c.mcp ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => typeof v === "number" ? v : null;
  return {
    totalCostUsd: num(c.totalCostUsd), wallClockSeconds: num(c.wallClockSeconds), turns: num(c.turns),
    tokens: num(c.tokens), cacheReadInput: num(usage.cacheReadInput), cacheCreationInput: num(usage.cacheCreationInput),
    output: num(usage.output), mcpCalls: num(mcp.calls),
  };
}

/** Média e desvio-padrão AMOSTRAL. `null` quando não há duas observações para dispersar. */
function spread(values: (number | null)[]): { n: number; media: number | null; desvio: number | null } {
  const xs = values.filter((v): v is number => v !== null);
  if (xs.length === 0) return { n: 0, media: null, desvio: null };
  const media = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (xs.length < 2) return { n: xs.length, media, desvio: null };
  const variancia = xs.reduce((a, b) => a + (b - media) ** 2, 0) / (xs.length - 1);
  return { n: xs.length, media, desvio: Math.sqrt(variancia) };
}

const pct = (v: number | null): string => v === null ? "—" : `${(v * 100).toFixed(1)}%`;
const usd = (v: number | null): string => v === null ? "—" : `US$ ${v.toFixed(4)}`;
const num = (v: number | null, casas = 1): string => v === null ? "—" : v.toFixed(casas);

interface RunLine {
  runId: string; arm: string; kind: string; model: string; status: string;
  score: SemanticRunScore; cost: Cost;
}

export function buildReport(pkg: SemanticPackage, reviews: RawReviews) {
  const normalizadas = normalizeReviews(reviews);
  const result = scoreSemanticPackage(pkg, normalizadas);
  const fila = reviewQueue(pkg, normalizadas);
  const esforco = reviewEffort(pkg);
  const porId = new Map(pkg.runs.map(r => [r.id, r]));

  const linhas: RunLine[] = result.scores.map(score => {
    const run = porId.get(score.runId)!;
    return { runId: score.runId, arm: armOf(run.config, run.kind), kind: run.kind, model: run.model,
      status: score.status, score, cost: costOf(run.cost) };
  });

  const bracos = [...new Set(linhas.filter(l => l.kind === "agente").map(l => l.arm))].sort();
  const porBraco = bracos.map(arm => {
    const doBraco = linhas.filter(l => l.arm === arm);
    return {
      arm,
      execucoes: doBraco.length,
      // Desfecho primário: revocação de referência. Individual e disperso, nunca só a média.
      revocacao: spread(doBraco.map(l => l.score.metrics.referenceRecall)),
      precisao: spread(doBraco.map(l => l.score.metrics.referencePrecision)),
      f1: spread(doBraco.map(l => l.score.metrics.referenceF1)),
      precisaoDeAfirmacao: spread(doBraco.map(l => l.score.metrics.assertionPrecision)),
      citacao: spread(doBraco.map(l => l.score.metrics.citationSupport)),
      detectadas: spread(doBraco.map(l => l.score.counts.detectedUnits)),
      novas: doBraco.reduce((n, l) => n + l.score.counts.novelAssertions, 0),
      falsas: doBraco.reduce((n, l) => n + l.score.counts.falseAssertions, 0),
      naoResolvidas: doBraco.reduce((n, l) => n + l.score.counts.unresolvedAssertions, 0),
      custoUsd: doBraco.reduce<number | null>((a, l) => a === null || l.cost.totalCostUsd === null ? null : a + l.cost.totalCostUsd, 0),
      segundos: spread(doBraco.map(l => l.cost.wallClockSeconds)),
      turnos: spread(doBraco.map(l => l.cost.turns)),
      chamadasMcp: spread(doBraco.map(l => l.cost.mcpCalls)),
      tokens: spread(doBraco.map(l => l.cost.tokens)),
      completo: doBraco.every(l => l.status === "complete"),
    };
  });

  // Cobertura por família, lado a lado com a de elemento/defeito. Instâncias repetidas são
  // oportunidade de cobertura, não tela independente — por isso as duas aparecem juntas.
  const familias = [...new Set(pkg.units.map(u => u.specId))].sort().map(specId => ({
    specId,
    unidades: pkg.units.filter(u => u.specId === specId).length,
    porBraco: bracos.map(arm => {
      const doBraco = linhas.filter(l => l.arm === arm);
      const detectadas = doBraco.map(l => l.score.families.find(f => f.specId === specId)?.detected ?? 0);
      return { arm, maximo: Math.max(0, ...detectadas), execucoesQueDetectaram: detectadas.filter(d => d > 0).length };
    }),
  }));

  return { result, fila, esforco, linhas, porBraco, familias, bracos };
}

export function renderReport(pkg: SemanticPackage, d: ReturnType<typeof buildReport>): string {
  const { result, fila, esforco, linhas, porBraco, familias } = d;
  const provisorias = linhas.filter(l => l.status !== "complete");
  const L: string[] = [];

  L.push("# Resultados — bateria v02 da tela de fluxo", "",
    `Pontuação \`${result.version}\` · pacote \`${pkg.packageHash.slice(0, 12)}\` · decisões \`${result.reviewHash.slice(0, 12)}\``, "",
    "Todos os números desta página saem de UMA execução do scorer sobre o pacote acima. Não há",
    "fórmula mantida em paralelo: quem discordar do scorer discorda desta página também.", "");

  if (provisorias.length) {
    L.push("> **PROVISÓRIO.** " + `${provisorias.length} execução(ões) ainda têm alegação sem decisão ` +
      `(${fila.ativa.cartoes} cartão(ões) na fila ativa). Revocação, precisão e F1 saem \`null\` até a ` +
      "revisão fechar. Nada aqui é resultado final.", "");
  }

  L.push("## Por execução", "",
    "| Execução | Braço | Estado | Detectadas | Revocação | Precisão | F1 | Citação | Novas | Falsas | Sem resolver | US$ | s | Turnos |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const l of linhas) {
    const m = l.score.metrics, c = l.score.counts;
    L.push(`| \`${l.runId.split("/").pop()}\` | ${l.arm} | ${l.status} | ${c.detectedUnits}/${c.referenceUnits} | ` +
      `${pct(m.referenceRecall)} | ${pct(m.referencePrecision)} | ${pct(m.referenceF1)} | ${pct(m.citationSupport)} | ` +
      `${c.novelAssertions} | ${c.falseAssertions} | ${c.unresolvedAssertions} | ${usd(l.cost.totalCostUsd)} | ` +
      `${num(l.cost.wallClockSeconds)} | ${num(l.cost.turns, 0)} |`);
  }

  L.push("", "## Por braço", "",
    "| Braço | n | Revocação média | DP | Precisão média | F1 médio | Detectadas média | US$ total | s médio | Turnos médio |",
    "|---|---|---|---|---|---|---|---|---|---|");
  for (const b of porBraco) {
    L.push(`| ${b.arm} | ${b.execucoes} | ${pct(b.revocacao.media)} | ${b.revocacao.desvio === null ? "—" : pct(b.revocacao.desvio)} | ` +
      `${pct(b.precisao.media)} | ${pct(b.f1.media)} | ${num(b.detectadas.media, 1)} | ${usd(b.custoUsd)} | ` +
      `${num(b.segundos.media)} | ${num(b.turnos.media, 1)} |`);
  }
  L.push("", "O desvio-padrão é amostral e descreve a dispersão entre as execuções deste braço. **Nenhum teste",
    "inferencial é aplicado**: três execuções por braço é o que cabe no orçamento desta pesquisa, e foi",
    "declarado como estudo de caso antes da coleta, não como limiar de suficiência.", "");

  L.push("## Citação, separada da detecção", "",
    "| Braço | Citação média | Detectadas média | Falsas revisadas | Sem resolver |",
    "|---|---|---|---|---|");
  for (const b of porBraco) {
    L.push(`| ${b.arm} | ${pct(b.citacao.media)} | ${num(b.detectadas.media, 1)} | ${b.falsas} | ${b.naoResolvidas} |`);
  }
  L.push("", "Citar a norma certa não prova detecção, e detectar sem citação mecanicamente válida não é falso",
    "positivo. **Falsas revisadas** e **sem resolver** ficam em colunas diferentes de propósito: uma é",
    "alegação julgada errada; a outra é dúvida que ninguém decidiu ainda.", "");

  L.push("## Cobertura por família e por unidade", "",
    `| Spec | Unidades | ${d.bracos.map(a => `${a} (máx.)`).join(" | ")} | ${d.bracos.map(a => `${a} (execuções que detectaram)`).join(" | ")} |`,
    `|---|---|${d.bracos.map(() => "---").join("|")}|${d.bracos.map(() => "---").join("|")}|`);
  for (const f of familias) {
    L.push(`| ${f.specId} | ${f.unidades} | ${f.porBraco.map(p => p.maximo).join(" | ")} | ` +
      `${f.porBraco.map(p => `${p.execucoesQueDetectaram}/${porBraco.find(b => b.arm === p.arm)?.execucoes ?? 0}`).join(" | ")} |`);
  }
  L.push("", "Instâncias repetidas da mesma spec são **oportunidades de cobertura**, não telas independentes:",
    "uma spec com oito instâncias pesa oito no denominador de unidades e uma na contagem de famílias.", "");

  if (result.comparisons.length) {
    L.push("## Contra a linha de base determinística", "",
      "| Agente | Linha de base | Estado | Ambos | Só agente | Só linha de base | Nenhum |",
      "|---|---|---|---|---|---|---|");
    for (const c of result.comparisons) {
      L.push(`| \`${c.agentRunId.split("/").pop()}\` | ${c.baseline} | ${c.status} | ${c.counts.both} | ` +
        `${c.counts.agentOnly} | ${c.counts.baselineOnly} | ${c.counts.neither} |`);
    }
    L.push("");
  }

  L.push("## Esforço de avaliação — não é custo de operação", "",
    `Cartões únicos: **${esforco.cartoes}** · sujeitos: ${esforco.sujeitos} · sem evidência verificada: ` +
    `${esforco.semEvidenciaVerificada} · com unidade candidata: ${esforco.comCandidatos}.`, "",
    `Estimativa: **${esforco.estimativaMinutos} min** (${esforco.taxa}).`, "",
    esforco.orcamentoDeclarado
      ? `Orçamento declarado antes da revisão: **${esforco.orcamentoDeclarado}**.`
      : "Nenhum orçamento de revisão foi declarado para este pacote.", "",
    "Isto é o que custou **medir**, e fica separado do que custaria **operar** o agente — as duas",
    "contas respondem a perguntas diferentes e somá-las não significaria nada.", "");

  L.push("## Fechamento", "",
    "| Fila | Quantidade | Efeito |",
    "|---|---|---|",
    `| Ativa (desta bateria) | ${fila.ativa.cartoes} | **Fecha a bateria.** Enquanto houver um, tudo é provisório |`,
    `| Histórica (outras baterias) | ${fila.historica.cartoes} | Dívida declarada; não cobra desta |`,
    `| Descobertas para a próxima referência | ${fila.proximaVersao.afirmacoes} | Entram na próxima versão do gabarito |`,
    "",
    fila.ativa.cartoes === 0
      ? "**Bateria fechada.** Todas as alegações foram decididas; os números acima são finais sob este gabarito e este contrato de pontuação."
      : "**Bateria aberta.** Há alegação sem decisão; nenhum número desta página é final.", "");

  return L.join("\n");
}

function main(): void {
  const pkg = read<SemanticPackage>(resolve(option("package")!));
  validatePackage(pkg);
  const d = buildReport(pkg, read<RawReviews>(resolve(option("reviews")!)));
  const out = resolve(option("out")!);
  const md = renderReport(pkg, d);
  writeFileSync(out.endsWith(".md") ? out : `${out}.md`, md + "\n", { encoding: "utf8", flag: "wx" });
  writeFileSync(out.replace(/\.md$/, "") + ".json", JSON.stringify({
    version: d.result.version, packageHash: pkg.packageHash, reviewHash: d.result.reviewHash,
    provenance: pkg.provenance, porExecucao: d.linhas, porBraco: d.porBraco, familias: d.familias,
    comparacoes: d.result.comparisons, fila: d.fila, esforcoDeAvaliacao: d.esforco,
    aviso: "Gerado de uma única pontuação; nenhuma métrica é recalculada aqui.",
  }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log(md.split("\n").slice(0, 8).join("\n"));
  console.log(`\n→ ${out}`);
}

// Só roda como CLI. Importado por um teste, o módulo não pode executar nada.
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/report-flow.ts")) main();
