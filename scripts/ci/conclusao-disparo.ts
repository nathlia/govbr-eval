/**
 * Emenda (a) às regras de falha (§ 7.2, proposta de 12/11/2026): o laço de disparo olha a conclusão do JOB `coleta`, não a
 * do workflow inteiro. Falha só em job de infraestrutura fora do agente (`arquivar`, `linhas-de-base`) não é tentativa do
 * agente: o job que falhou é reexecutado no MESMO disparo, sem rodar o agente de novo e sem contar no teto.
 *
 * Este script só DECIDE e imprime o comando; nunca dispara nem reexecuta nada (quem roda o comando é o laço/a autora).
 *
 *   npx tsx scripts/ci/conclusao-disparo.ts --run RUN_ID [--repo nathlia/govbr-eval]     (lê com gh run view / gh api, só leitura)
 *   npx tsx scripts/ci/conclusao-disparo.ts --json run.json [--artefatos artefatos.json] (offline: a saída de
 *       `gh run view ID --json databaseId,attempt,status,conclusion,jobs` e de `gh api repos/R/actions/runs/ID/artifacts`)
 *
 * stdout: a decisão em JSON (uma linha). Códigos: 0 concluído · 10 reexecutar job de infraestrutura · 11 tentativa do agente
 * (o arquivo decide pelo protocolo) · 12 recusado no preparar (nenhum modelo chamado) · 13 caso para a autora (artifact
 * ausente, reexecuções esgotadas, job desconhecido) · 14 em andamento · 2 erro de uso.
 *
 * Regras (o comando sai sempre por `--job <databaseId>` do job de infraestrutura mais a montante que falhou: o GitHub
 * reexecuta junto os jobs que dependem dele, e NUNCA o preparar nem a coleta; com a coleta concluída, equivale a
 * `gh run rerun <id> --failed`, mas não depende disso):
 *   - preparar falhou → recusado no preparo (o arquivar grava "recusado no preflight", não é tentativa); se o arquivar
 *     também falhou, reexecutar só o arquivar;
 *   - coleta failure/cancelled/timed_out → tentativa do agente (a entrada do arquivo decide se é técnica); se o arquivar
 *     falhou, reexecutar só o arquivar (o pacote subiu com `if: always()`);
 *   - coleta success (ou skipped por `so-linha-de-base`) e falha em arquivar → reexecutar o arquivar, se os artifacts que
 *     ele baixa existem no run e não expiraram (manifesto-coleta; pacote quando a coleta rodou). Variante conservadora: a
 *     documentação do GitHub não diz se o download-artifact de um job reexecutado vê os artifacts da tentativa anterior;
 *     se não vir, o arquivar recusa (pacote ausente com coleta success) sem gravar nada e o run volta aqui;
 *   - falha em linhas-de-base: a linha de base do disparo nunca é reexecutada no mesmo run (o upload do artifact
 *     `linha-de-base` da tentativa anterior pode colidir: upload-artifact v4 falha se o nome já existe); com a linha de
 *     base congelada da campanha ela não é usada, e sem ela o caminho é o de sempre (novo disparo `so-linha-de-base` com
 *     `refazer_linha_de_base_de`, sem agente). Se o arquivar também falhou, reexecutar só o arquivar;
 *   - mais de MAX_TENTATIVAS_DO_RUN tentativas do mesmo run → caso para a autora.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_TENTATIVAS_DO_RUN = 3;
export interface JobDoRun { name: string; databaseId: number; status: string; conclusion: string | null }
export interface RunDoGh { databaseId: number; attempt: number; status: string; conclusion: string | null; jobs: JobDoRun[] }
export interface Artefato { name: string; expired: boolean }

export type Decisao =
  | { decisao: "concluido"; motivo: string }
  | { decisao: "em-andamento"; motivo: string }
  | { decisao: "reexecutar-infra"; motivo: string; job: string; comando: string; tentativaDoAgente: false }
  | { decisao: "tentativa-do-agente"; motivo: string; comando: string | null }
  | { decisao: "recusado-no-preparo"; motivo: string; comando: string | null }
  | { decisao: "caso-da-autora"; motivo: string };

export const CODIGO: Record<Decisao["decisao"], number> = {
  concluido: 0, "reexecutar-infra": 10, "tentativa-do-agente": 11, "recusado-no-preparo": 12, "caso-da-autora": 13, "em-andamento": 14,
};

/** Os quatro jobs de execucao-isolada.yml, pelo começo do `name:` (o que `gh run view --json jobs` devolve). */
const PAPEIS = { preparar: /^Preparar\b/, coleta: /^Coleta\b/, "linhas-de-base": /^Linhas de base\b/, arquivar: /^Arquivar\b/ } as const;
type Papel = keyof typeof PAPEIS;
const FALHOU = new Set(["failure", "cancelled", "timed_out", "startup_failure"]);

export function decidirDisparo(run: RunDoGh, artefatos: Artefato[] | null, repo = "nathlia/govbr-eval"): Decisao {
  if (run.status !== "completed") return { decisao: "em-andamento", motivo: `run ${run.databaseId} ${run.status}` };
  const porPapel = new Map<Papel, JobDoRun>();
  for (const j of run.jobs) {
    const p = (Object.keys(PAPEIS) as Papel[]).find(k => PAPEIS[k].test(j.name));
    if (!p) return { decisao: "caso-da-autora", motivo: `job desconhecido no run ${run.databaseId}: ${j.name}` };
    if (porPapel.has(p)) return { decisao: "caso-da-autora", motivo: `dois jobs ${p} no run ${run.databaseId}` };
    porPapel.set(p, j);
  }
  const c = (p: Papel): string | null => porPapel.get(p)?.conclusion ?? null;
  const rerun = (p: Papel): string => `gh run rerun ${run.databaseId} --repo ${repo} --job ${porPapel.get(p)!.databaseId}`;
  const arquivarFalhou = FALHOU.has(c("arquivar") ?? "");
  if (run.conclusion === "success" && !arquivarFalhou) return { decisao: "concluido", motivo: `run ${run.databaseId}: todos os jobs concluídos` };
  if (!porPapel.has("preparar") || !porPapel.has("arquivar")) return { decisao: "caso-da-autora", motivo: `run ${run.databaseId} sem o job preparar ou arquivar` };
  const esgotado = run.attempt >= MAX_TENTATIVAS_DO_RUN;

  if (c("preparar") !== "success") {
    return { decisao: "recusado-no-preparo", motivo: `preparar ${c("preparar")}: nenhum modelo chamado, não é tentativa do slot`,
      comando: arquivarFalhou && !esgotado ? rerun("arquivar") : null };
  }
  const coleta = c("coleta");
  if (FALHOU.has(coleta ?? "")) {
    return { decisao: "tentativa-do-agente", motivo: `coleta ${coleta}: é tentativa do agente; a entrada do arquivo diz se a falha é técnica (protocolo § 7.2)` +
      (arquivarFalhou ? "; o arquivar também falhou: reexecutar só ele (não roda o agente)" : ""),
    comando: arquivarFalhou && !esgotado ? rerun("arquivar") : null };
  }
  if (coleta !== "success" && coleta !== "skipped") return { decisao: "caso-da-autora", motivo: `coleta com conclusão ${String(coleta)}` };
  if (!arquivarFalhou) {
    // só a linha de base do disparo falhou (o arquivar registrou a execução)
    if (FALHOU.has(c("linhas-de-base") ?? "")) {
      return { decisao: "concluido", motivo: `linhas-de-base ${c("linhas-de-base")} e execução arquivada: com a linha de base congelada da campanha nada falta; sem ela, ` +
        "novo disparo so-linha-de-base com refazer_linha_de_base_de (sem agente)" };
    }
    return { decisao: "caso-da-autora", motivo: `run ${run.databaseId} ${run.conclusion} sem job de infraestrutura falho` };
  }
  if (esgotado) return { decisao: "caso-da-autora", motivo: `o run ${run.databaseId} já está na tentativa ${run.attempt} (máximo ${MAX_TENTATIVAS_DO_RUN}): o arquivar segue falhando` };
  if (!artefatos) return { decisao: "caso-da-autora", motivo: "sem a lista de artifacts do run não se sabe se o arquivar reexecutado terá o que baixar" };
  const precisa = ["manifesto-coleta", ...(coleta === "success" ? ["pacote"] : [])];
  const falta = precisa.filter(n => !artefatos.some(a => a.name === n && !a.expired));
  if (falta.length) return { decisao: "caso-da-autora", motivo: `artifact(s) ausente(s) ou expirado(s) no run ${run.databaseId}: ${falta.join(", ")}; reexecutar o arquivar não resolve` };
  return { decisao: "reexecutar-infra", job: "arquivar", tentativaDoAgente: false, comando: rerun("arquivar"),
    motivo: `coleta ${coleta}, arquivar ${c("arquivar")}: falha de infraestrutura fora do agente; reexecutar só o arquivar no mesmo run (não é nova tentativa, não conta no teto)` };
}

// ───────────────────────────────────────────────────────────────── CLI

function gh(args: string[]): unknown {
  const r = spawnSync("gh", args, { encoding: "utf8", timeout: 120_000, windowsHide: true });
  if (r.error || r.status !== 0) throw new Error(`gh ${args.slice(0, 3).join(" ")} falhou: ${(r.stderr || String(r.error ?? "")).trim().slice(0, 300)}`);
  return JSON.parse(r.stdout);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const repo = val("repo") ?? "nathlia/govbr-eval";
  try {
    let run: RunDoGh, artefatos: Artefato[] | null = null;
    if (val("json")) {
      run = JSON.parse(readFileSync(resolve(val("json")!), "utf8")) as RunDoGh;
      if (val("artefatos")) artefatos = (JSON.parse(readFileSync(resolve(val("artefatos")!), "utf8")) as { artifacts: Artefato[] }).artifacts;
    } else if (val("run") && /^\d+$/.test(val("run")!)) {
      run = gh(["run", "view", val("run")!, "--repo", repo, "--json", "databaseId,attempt,status,conclusion,jobs"]) as RunDoGh;
      artefatos = (gh(["api", `repos/${repo}/actions/runs/${val("run")}/artifacts`]) as { artifacts: Artefato[] }).artifacts;
    } else throw new Error("uso: conclusao-disparo.ts --run RUN_ID [--repo OWNER/REPO] | --json run.json [--artefatos artefatos.json]");
    const d = decidirDisparo(run, artefatos, repo);
    console.log(JSON.stringify(d));
    console.error(`${d.decisao}: ${d.motivo}${"comando" in d && d.comando ? `\n  comando (não executado): ${d.comando}` : ""}`);
    process.exitCode = CODIGO[d.decisao];
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 2;
  }
}
