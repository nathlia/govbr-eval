/**
 * Identidade de execução × campanha congelada (NAT-63, R1 da revisão pré-T7).
 *
 * Uma regra só, com três chamadores:
 *   - preflight do disparo (`manifesto-coleta-isolada.ts`, job `preparar`, ANTES de qualquer chamada
 *     de modelo): o que o disparo vai usar — esforço, tempo limite, cliente travado nas imagens,
 *     protocolo do commit, tentativa e repetição — contra o que a campanha congelou;
 *   - entrada da análise (`analisar-execucao.ts`): o que cada `run.json` REGISTROU contra a campanha.
 *     `checkAggregation` (contracts/index.ts) só compara as execuções entre si: dois braços que
 *     divergem IGUALMENTE da campanha passariam lá; aqui não passam;
 *   - elegibilidade da comparação principal (R2), que reusa esta lista.
 *
 * Campo `null` em `IdentidadeEfetiva` = não conhecido naquele ponto (ex.: protocolo de um manifesto
 * 1.1.0, gravado antes deste campo): fica de fora da conferência daquele ponto e é conferido na
 * análise pelo `run.json`, que sempre o registra.
 *
 * Fora daqui: o teto de tentativas da CAMPANHA (`retryPolicy.campaignAttemptCeiling`) e a seleção
 * de tentativa por slot ficam na agenda de slots (`agenda-campanha.ts`, NAT-65).
 */
import type { Campaign, Run } from "../contracts/index";

export interface IdentidadeEfetiva {
  /** Esforço que o cliente recebe (`nao-se-aplica` no agente roteirizado). */
  effort: string | null;
  /** Teto de tempo do agente, em segundos. */
  timeoutSeconds: number | null;
  /** Os outros limites (o run-once não aplica nenhum dos dois: grava null). */
  maxTurns: number | null;
  maxBudgetUsd: number | null;
  /** Cliente (nome e versão), como o run.json o registra. */
  client: { name: string; version: string } | null;
  /** sha256 do protocolo (template da skill normalizado), como `run.versions.protocolSha256`. */
  protocolSha256: string | null;
  attempt: number;
  repetition: number;
}

/** Diferenças entre o que a execução usa/usou e o que a campanha congelou. [] = idêntico. */
export function divergenciasDaCampanha(c: Campaign, e: IdentidadeEfetiva): string[] {
  const p: string[] = [];
  if (e.effort !== null && e.effort !== c.design.effort) p.push(`esforço ${e.effort} ≠ ${c.design.effort} congelado na campanha`);
  if (e.timeoutSeconds !== null && e.timeoutSeconds !== c.limits.timeoutSeconds) {
    p.push(`tempo limite ${e.timeoutSeconds}s ≠ ${c.limits.timeoutSeconds}s congelado na campanha`);
  }
  if (e.maxTurns !== c.limits.maxTurns || e.maxBudgetUsd !== c.limits.maxBudgetUsd) {
    p.push(`limites de turnos/orçamento ${String(e.maxTurns)}/${String(e.maxBudgetUsd)} ≠ ${String(c.limits.maxTurns)}/${String(c.limits.maxBudgetUsd)} congelados na campanha`);
  }
  if (e.client !== null && (e.client.name !== c.fixed.client.name || e.client.version !== c.fixed.client.version)) {
    p.push(`cliente ${e.client.name} ${e.client.version} ≠ ${c.fixed.client.name} ${c.fixed.client.version} congelado na campanha`);
  }
  if (e.protocolSha256 !== null && e.protocolSha256 !== c.fixed.protocolSha256) {
    p.push(`protocolo ${e.protocolSha256.slice(0, 12)} ≠ ${c.fixed.protocolSha256.slice(0, 12)} congelado na campanha`);
  }
  const max = c.retryPolicy.maxAttemptsPerSlot;
  if (!Number.isInteger(e.attempt) || e.attempt < 1 || e.attempt > max) p.push(`tentativa ${e.attempt} fora da política da campanha (1–${max} por slot)`);
  const reps = c.design.repetitions;
  if (!Number.isInteger(e.repetition) || e.repetition < 1 || e.repetition > reps) p.push(`repetição ${e.repetition} fora do desenho da campanha (1–${reps})`);
  return p;
}

/** A identidade que um run.json registrou. */
export function identidadeDoRun(run: Run): IdentidadeEfetiva {
  return { effort: run.effort, timeoutSeconds: run.limits.timeoutSeconds, maxTurns: run.limits.maxTurns, maxBudgetUsd: run.limits.maxBudgetUsd, client: run.client, protocolSha256: run.versions.protocolSha256,
    attempt: run.attempt, repetition: run.repetition };
}
