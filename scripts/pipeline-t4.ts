/**
 * Passos do workflow `execucao-isolada` (T4) que precisam de lógica: ficam aqui, num script testável
 * localmente, e o YAML só os chama. Nada aqui fala com o GitHub nem com o provedor.
 *
 *   tsx scripts/pipeline-t4.ts entradas                  ENTRADAS = toJSON(inputs); grava em GITHUB_OUTPUT
 *   tsx scripts/pipeline-t4.ts conferir-imagens --travado ARQ --construido ARQ --imagens agent,screens,...
 *   tsx scripts/pipeline-t4.ts conferir-ambiente [--pacote DIR] [--checkouts DIR,DIR] [--credencial-permitida NOME]
 *   tsx scripts/pipeline-t4.ts resumo-coleta --pacote DIR | resumo-linha-de-base --dir DIR | resumo-arquivo --saida-json ARQ
 *
 * Entradas sempre por variável de ambiente, nunca interpoladas no shell pelo YAML.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EFFORT_LEVELS, CREDENTIAL_ENV } from "../runner/cliente-claude";
import type { Run } from "../contracts/index";
import { MODELO_ENSAIO } from "./manifesto-coleta-isolada";

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const MODELO = /^[A-Za-z0-9][A-Za-z0-9._:@\-[\]]{0,127}$/;
export const TELAS = ["solicitacao", "vistorias"] as const;
export const MODOS = ["real", "duble", "roteirizado"] as const;
export const ETAPAS = ["coleta+linha-de-base", "so-coleta", "so-linha-de-base"] as const;

export interface Entradas {
  tela: string; braco: string; modo: string; modelo: string; esforco: string; limite_min: string;
  campanha: string; slot: string; par: string; tentativa: string; repeticao: string;
  telas_sha: string; validator_sha: string; etapas: string; refazer_linha_de_base_de?: string; motivo_refazer?: string;
}

/** Valida as entradas do disparo e devolve os valores derivados que os jobs usam. */
export function conferirEntradas(e: Partial<Entradas>): { problemas: string[]; saidas: Record<string, string> } {
  const p: string[] = [];
  const has = (k: keyof Entradas): string => String(e[k] ?? "").trim();
  if (!(TELAS as readonly string[]).includes(has("tela"))) p.push(`tela: ${TELAS.join(" | ")}`);
  if (!["sem", "com"].includes(has("braco"))) p.push("braco: sem | com");
  if (!(MODOS as readonly string[]).includes(has("modo"))) p.push(`modo: ${MODOS.join(" | ")}`);
  if (!(ETAPAS as readonly string[]).includes(has("etapas"))) p.push(`etapas: ${ETAPAS.join(" | ")}`);
  for (const k of ["campanha", "slot", "par"] as const) if (!ID.test(has(k))) p.push(`${k}: id [A-Za-z0-9._-], até 128`);
  for (const k of ["telas_sha", "validator_sha"] as const) if (!COMMIT.test(has(k))) p.push(`${k}: commit completo (40 hex), nunca branch ou tag`);
  const limite = Number(has("limite_min"));
  if (!Number.isInteger(limite) || limite < 1 || limite > 90) p.push("limite_min: inteiro de 1 a 90 (teto de segurança, D-67)");
  for (const k of ["tentativa", "repeticao"] as const) {
    const n = Number(has(k));
    if (!Number.isInteger(n) || n < 1 || n > 99) p.push(`${k}: inteiro de 1 a 99`);
  }
  const modo = has("modo");
  if (modo === "real") {
    if (!MODELO.test(has("modelo")) || /duble|teste|roteirizado/i.test(has("modelo"))) p.push("modelo: id exato do modelo (modo real)");
    if (!EFFORT_LEVELS.includes(has("esforco"))) p.push(`esforco: ${EFFORT_LEVELS.join(" | ")}`);
  }
  const rerun = has("refazer_linha_de_base_de");
  if (rerun && (!ID.test(rerun) || !has("motivo_refazer"))) p.push("refazer_linha_de_base_de exige id válido e motivo_refazer");
  if (rerun && has("etapas") !== "so-linha-de-base") p.push("refazer a linha de base só com etapas = so-linha-de-base (sem chamar o agente de novo)");
  const agente = modo === "roteirizado" ? "fake" : "claude";
  const egress = modo === "real" ? "real" : "stub";
  const saidas: Record<string, string> = {
    agente, egress, fixture: String(modo !== "real"),
    modelo: modo === "real" ? has("modelo") : modo === "duble" ? MODELO_ENSAIO.duble : MODELO_ENSAIO.roteirizado,
    esforco: modo === "roteirizado" ? "nao-se-aplica" : (EFFORT_LEVELS.includes(has("esforco")) ? has("esforco") : "high"),
    imagens: has("braco") === "com" ? "agent,screens,collector,egress,oracle" : "agent,screens,collector,egress",
    coleta: String(has("etapas") !== "so-linha-de-base"),
    linha_de_base: String(has("etapas") !== "so-coleta"),
    limite_seg: String(limite * 60),
  };
  return { problemas: p, saidas };
}

/** Versões medidas de dentro das imagens construídas no CI × as do lock commitado. Ids diferem por construção. */
export function conferirImagens(travado: { versions: Record<string, unknown> }, construido: { versions: Record<string, unknown>; images: Record<string, { id: string }> }, imagens: string[]): string[] {
  const p: string[] = [];
  const campos = ["node", "playwrightMcp", "playwright", "chromium", "claudeCode", "telas", ...(imagens.includes("oracle") ? ["oracle"] : [])];
  for (const c of campos) {
    if (JSON.stringify(travado.versions[c]) !== JSON.stringify(construido.versions[c])) {
      p.push(`${c}: travado ${JSON.stringify(travado.versions[c])} × construído ${JSON.stringify(construido.versions[c])}`);
    }
  }
  for (const i of imagens) if (!/^sha256:[a-f0-9]{64}$/.test(construido.images[i]?.id ?? "")) p.push(`imagem ${i} sem id no lock construído`);
  return p;
}

/** Nomes que nunca podem chegar a um contêiner da execução (o valor nem é olhado). */
export const PROIBIDOS_NO_CONTEINER = /^(GITHUB_|ACTIONS_|RUNNER_|GH_|GIT_|INPUT_)|(_PAT$)|^GOVBR_(LEITURA|RESULTADOS)_TOKEN$/;
const SUSPEITOS = /TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL/i;
/** Nomes que o processo do runner não pode ter no passo da coleta (credenciais de GitHub/publicação). */
export const PROIBIDOS_NO_PASSO = ["GITHUB_TOKEN", "GH_TOKEN", "GOVBR_LEITURA_TOKEN", "GOVBR_RESULTADOS_TOKEN"];

/**
 * Ambiente efetivo de cada contêiner (evidence/container-config.json, gravado pelo run-once a partir do
 * `docker inspect`): nenhum nome do GitHub/Actions/publicação; credencial só no agente e só redigida.
 */
export function conferirAmbienteDosConteineres(configs: Record<string, { env?: string[] }>, credencialPermitida: string | null): string[] {
  const p: string[] = [];
  for (const [papel, c] of Object.entries(configs)) {
    for (const kv of c.env ?? []) {
      const nome = kv.split("=")[0], valor = kv.slice(nome.length + 1);
      if (PROIBIDOS_NO_CONTEINER.test(nome)) p.push(`${papel}: ${nome} no ambiente do contêiner`);
      else if ((CREDENTIAL_ENV as readonly string[]).includes(nome)) {
        if (papel !== "agent") p.push(`${papel}: credencial do provedor fora do contêiner do agente`);
        if (nome !== credencialPermitida && credencialPermitida !== "*") p.push(`${papel}: credencial ${nome} não autorizada neste disparo`);
        if (valor !== "<redigido>") p.push(`${papel}: valor de ${nome} não redigido no pacote`);
      } else if (SUSPEITOS.test(nome) && valor !== "<redigido>") p.push(`${papel}: ${nome} parece credencial e não está redigido`);
    }
  }
  return p;
}

/** `persist-credentials: false` de fato: nenhum checkout guarda token no .git/config. */
export function conferirCheckouts(dirs: string[]): string[] {
  return dirs.flatMap((d) => {
    const cfg = join(d, ".git", "config");
    if (!existsSync(cfg)) return [];
    const text = readFileSync(cfg, "utf8");
    return /extraheader|authorization|x-access-token|ghp_|github_pat_/i.test(text) ? [`${d}: credencial guardada em .git/config`] : [];
  });
}

const fmt = (m: { value: number | null; status: string } | undefined): string => !m ? "—" : m.value === null ? (m.status === "not-applicable" ? "não se aplica" : "indisponível") : String(m.value);

export function resumoColeta(dir: string): string {
  const runPath = join(dir, "run.json");
  if (!existsSync(runPath)) return `### Coleta\n\n**Sem pacote**: \`run.json\` não foi produzido em \`${dir}\`. A execução fica registrada como interrompida, sem pacote.\n`;
  const r = JSON.parse(readFileSync(runPath, "utf8")) as Run;
  const L = [
    `### Coleta — ${r.screen.id} · braço ${r.arm} · ${r.fixture ? "ENSAIO (fixture, nunca dado)" : "execução formal"}`, "",
    "| Estado | Valor |", "|---|---|",
    `| Técnico | **${r.status.technical}** (${r.lifecycle.state}${r.lifecycle.stage ? ` / ${r.lifecycle.stage}` : ""}) |`,
    `| Motivo da falha | ${r.failure ? `${r.failure.reason}: ${r.failure.detail.replace(/[|\n]/g, " ").slice(0, 300)}` : "—"} |`,
    `| Isolamento | ${r.status.isolation} |`, `| Uso do oráculo | ${r.status.oracleUsage} |`,
    `| Submissão | ${r.submission.status} |`, `| Pontuação | ${r.status.score} (a análise é outra etapa) |`,
    `| Modelo | ${r.model.requested} → ${r.model.resolved} · esforço ${r.effort} |`,
    `| Duração do agente (s) | ${fmt(r.usage.wallClockSeconds)} |`, `| Tokens entrada/saída | ${fmt(r.usage.inputTokens)} / ${fmt(r.usage.outputTokens)} |`,
    `| Custo estimado pelo cliente (US$) | ${fmt(r.usage.estimatedCostUsd)} (estimativa, não fatura) |`,
    `| Chamadas ao oráculo | ${fmt(r.usage.oracleCalls)} |`, `| runId | \`${r.runId}\` |`,
  ];
  return L.join("\n") + "\n";
}

export function resumoLinhaDeBase(dir: string): string {
  const reg = join(dir, "baseline.json");
  if (!existsSync(reg)) return "### Linha de base\n\n**Sem registro**: a linha de base não produziu `baseline.json`.\n";
  const b = JSON.parse(readFileSync(reg, "utf8")) as { baselineId: string; status: string; error: string | null; screen: { id: string }; eslint: { status: string; absentReason: string | null } };
  const prob = existsSync(join(dir, "problemas.json")) ? JSON.parse(readFileSync(join(dir, "problemas.json"), "utf8")) as string[] : [];
  return [`### Linha de base — ${b.screen.id}`, "", "| Campo | Valor |", "|---|---|", `| Id | \`${b.baselineId}\` |`, `| Status | **${b.status}** |`,
    `| Erro | ${b.error ? b.error.replace(/[|\n]/g, " ").slice(0, 300) : "—"} |`, `| ESLint | ${b.eslint.status}${b.eslint.absentReason ? ` (${b.eslint.absentReason.slice(0, 120)})` : ""} |`,
    `| Utilizável pela análise | ${prob.length ? `não: ${prob.join("; ").replace(/[|\n]/g, " ").slice(0, 400)}` : "sim (identidade e completude conferidas)"} |`].join("\n") + "\n";
}

/** Resumo do arquivamento; o estado da entrega do anexo é lido da entrada do índice (o mais recente). */
export function resumoArquivo(path: string, arquivo: string | null): { texto: string; pendentes: string[] } {
  if (!existsSync(path)) return { texto: "### Arquivamento\n\n**Não concluído**: nada foi gravado no govbr-resultados.\n", pendentes: ["arquivamento não concluído"] };
  const s = JSON.parse(readFileSync(path, "utf8")) as { gravacoes: { chave: string; tipo: string; caminho: string; estado: string; evidencias?: { estado: string; anexo: string | null; sha256: string | null } | null }[] };
  const L = ["### Arquivamento (govbr-resultados)", "", "| Chave | Tipo | Estado | Caminho | Evidências |", "|---|---|---|---|---|"];
  const pendentes: string[] = [];
  for (const g of s.gravacoes) {
    const ep = arquivo ? join(arquivo, "indice", "entradas", `${g.chave}.json`) : null;
    const entrada = ep && existsSync(ep) ? JSON.parse(readFileSync(ep, "utf8")) as { evidencias: { estado: string; sha256: string | null } | null } : null;
    const ev = entrada?.evidencias ?? g.evidencias ?? null;
    if (ev && ev.estado !== "confirmado" && ev.estado !== "nao-se-aplica") pendentes.push(`${g.chave}: anexo ${ev.estado}`);
    L.push(`| \`${g.chave}\` | ${g.tipo} | ${g.estado} | \`${g.caminho}\` | ${ev ? `${ev.estado}${ev.sha256 ? ` · sha256 ${ev.sha256.slice(0, 16)}…` : ""}` : "—"} |`);
  }
  if (pendentes.length) L.push("", `**Anexo não confirmado**: ${pendentes.join("; ")}. Os JSONs estão arquivados; repita o job arquivar para reenviar o MESMO pacote — o modelo não é chamado de novo.`);
  return { texto: L.join("\n") + "\n", pendentes };
}

function saida(texto: string): void {
  process.stdout.write(texto);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + "\n");
}

function main(): number {
  const [cmd, ...args] = process.argv.slice(2);
  const val = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const need = (n: string): string => {
    const v = val(n);
    if (!v) throw new Error(`falta ${n}`);
    return v;
  };
  switch (cmd) {
    case "entradas": {
      const { problemas, saidas } = conferirEntradas(JSON.parse(process.env.ENTRADAS ?? "{}") as Partial<Entradas>);
      if (problemas.length) {
        saida(`### Entradas recusadas\n\n${problemas.map((x) => `- ${x}`).join("\n")}\n\nNada foi executado.\n`);
        return 1;
      }
      const out = Object.entries(saidas).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, out);
      process.stdout.write(out);
      return 0;
    }
    case "conferir-imagens": {
      const p = conferirImagens(JSON.parse(readFileSync(resolve(need("--travado")), "utf8")), JSON.parse(readFileSync(resolve(need("--construido")), "utf8")), need("--imagens").split(","));
      if (p.length) {
        saida(`### Imagens diferentes das travadas\n\n${p.map((x) => `- ${x}`).join("\n")}\n\nO modelo não é chamado com imagem diferente da travada.\n`);
        return 1;
      }
      console.log("imagens construídas = versões travadas em runner/images.lock.json (ids desta VM gravados no lock do pacote)");
      return 0;
    }
    case "conferir-ambiente": {
      const p: string[] = [];
      for (const n of PROIBIDOS_NO_PASSO) if (process.env[n]) p.push(`${n} presente no ambiente do passo`);
      const checkouts = val("--checkouts")?.split(",").filter(Boolean) ?? [];
      p.push(...conferirCheckouts(checkouts.map((d) => resolve(d))));
      const pacote = val("--pacote");
      if (pacote) {
        const cfg = join(resolve(pacote), "evidence", "container-config.json");
        if (existsSync(cfg)) p.push(...conferirAmbienteDosConteineres(JSON.parse(readFileSync(cfg, "utf8")), val("--credencial-permitida") ?? null));
        else console.log("sem evidence/container-config.json: nenhum contêiner da execução partiu");
      }
      if (p.length) {
        saida(`### Ambiente com credencial fora do lugar\n\n${p.map((x) => `- ${x}`).join("\n")}\n`);
        return 1;
      }
      console.log(`ambiente conferido: nenhuma credencial de GitHub/publicação no passo, nos checkouts (${checkouts.length}) nem nos contêineres`);
      return 0;
    }
    case "resumo-coleta": saida(resumoColeta(resolve(need("--pacote")))); return 0;
    case "resumo-linha-de-base": saida(resumoLinhaDeBase(resolve(need("--dir")))); return 0;
    case "resumo-arquivo": {
      const r = resumoArquivo(resolve(need("--saida-json")), val("--arquivo") ? resolve(val("--arquivo")!) : null);
      saida(r.texto);
      return r.pendentes.length ? 1 : 0;
    }
    default:
      throw new Error("uso: pipeline-t4.ts entradas | conferir-imagens | conferir-ambiente | resumo-coleta | resumo-linha-de-base | resumo-arquivo");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
