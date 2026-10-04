/**
 * Passos do workflow `execucao-isolada` (T4) que precisam de lógica: ficam aqui, num script testável
 * localmente, e o YAML só os chama. Nada aqui fala com o GitHub nem com o provedor.
 *
 *   tsx scripts/pipeline-t4.ts entradas                  ENTRADAS = toJSON(inputs); grava em GITHUB_OUTPUT
 *   tsx scripts/pipeline-t4.ts conferir-imagens --travado ARQ --construido ARQ --imagens agent,screens,...
 *   tsx scripts/pipeline-t4.ts conferir-ambiente [--pacote DIR] [--checkouts DIR,DIR] [--credencial-permitida NOME]
 *   tsx scripts/pipeline-t4.ts resumo-coleta --pacote DIR | resumo-linha-de-base --dir DIR | resumo-arquivo --saida-json ARQ [--arquivo DIR] [--pacote DIR]
 *
 * Os resumos começam por um cartão de saúde (NAT-58): ✅/❌ do slot, identidade, números e o próximo passo;
 * as tabelas técnicas ficam dobradas em "Detalhes técnicos". Entradas do cartão por env (CAMPANHA, SLOT, ...).
 *
 * Entradas sempre por variável de ambiente, nunca interpoladas no shell pelo YAML.
 */
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EFFORT_LEVELS, CREDENTIAL_ENV } from "../runner/cliente-claude";
import type { Campaign, Run } from "../contracts/index";
import { caminhoAgenda, type Agenda } from "./agenda-campanha";
import type { EntradaIndice } from "./arquivo-resultados";
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

/** Valor das entradas que diz "venha da agenda" (braço) ou "da campanha" (esforço); texto vazio vale o mesmo. */
export const DA_AGENDA = "da-agenda", DA_CAMPANHA = "da-campanha";

/** A agenda e a campanha commitadas no govbr-eval do disparo, quando a campanha tem agenda (NAT-65). */
export interface AgendaDoDisparo { agenda: Agenda; campanha: Campaign }

/** Lê `campanhas/<campanha>/agenda.json` (e a campanha) do checkout do govbr-eval; null = campanha sem agenda. */
export function agendaDaCampanha(raiz: string, campanha: string): AgendaDoDisparo | null {
  if (!ID.test(campanha)) return null;
  const ag = join(raiz, caminhoAgenda(campanha)), cp = join(raiz, "campanhas", campanha, "campaign.json");
  if (!existsSync(ag)) return null;
  if (!existsSync(cp)) throw new Error(`${caminhoAgenda(campanha)} sem o campaign.json ao lado`);
  return { agenda: JSON.parse(readFileSync(ag, "utf8")) as Agenda, campanha: JSON.parse(readFileSync(cp, "utf8")) as Campaign };
}

/**
 * Valida as entradas do disparo e devolve os valores derivados que os jobs usam.
 *
 * Campanha COM agenda (NAT-65): o disparo leva só o slot (e os commits). Par, braço e repetição saem
 * da agenda; modelo, esforço e tempo limite, da campanha; a tentativa, do índice do arquivo (no passo
 * do manifesto). Campo digitado que diverge é recusado aqui, antes de qualquer gasto. Campanha SEM
 * agenda: tudo digitado, como antes (vazio = par-01, tentativa/repetição 1, limite 90, esforço high).
 */
export function conferirEntradas(e: Partial<Entradas>, ag: AgendaDoDisparo | null = null): { problemas: string[]; saidas: Record<string, string> } {
  const p: string[] = [];
  const has = (k: keyof Entradas): string => String(e[k] ?? "").trim();
  const vazio = (k: keyof Entradas): boolean => ["", DA_AGENDA, DA_CAMPANHA].includes(has(k));
  if (!(TELAS as readonly string[]).includes(has("tela"))) p.push(`tela: ${TELAS.join(" | ")}`);
  if (!(MODOS as readonly string[]).includes(has("modo"))) p.push(`modo: ${MODOS.join(" | ")}`);
  if (!(ETAPAS as readonly string[]).includes(has("etapas"))) p.push(`etapas: ${ETAPAS.join(" | ")}`);
  for (const k of ["campanha", "slot"] as const) if (!ID.test(has(k))) p.push(`${k}: id [A-Za-z0-9._-], até 128`);
  for (const k of ["telas_sha", "validator_sha"] as const) if (!COMMIT.test(has(k))) p.push(`${k}: commit completo (40 hex), nunca branch ou tag`);
  const modo = has("modo");
  let braco = has("braco"), par = has("par"), repeticao = has("repeticao"), tentativa = has("tentativa"), modelo = has("modelo"), esforco = has("esforco"), limiteTxt = has("limite_min");
  if (ag) {
    const slot = ag.agenda.slots.find((s) => s.slotId === has("slot"));
    const c = ag.campanha;
    if (!slot) p.push(`slot ${has("slot")} fora da agenda de ${ag.agenda.campaignId} (${ag.agenda.slots.map((s) => s.slotId).join(", ")})`);
    else {
      const confere = (k: keyof Entradas, rotulo: string, esperado: string): string => {
        if (!vazio(k) && has(k) !== esperado) p.push(`${rotulo} ${has(k)} ≠ ${esperado} da agenda/campanha (slot ${slot.slotId}): deixe vazio ou igual`);
        return esperado;
      };
      braco = confere("braco", "braco", slot.arm);
      par = confere("par", "par", slot.pairId);
      repeticao = confere("repeticao", "repeticao", String(slot.repetition));
      esforco = confere("esforco", "esforco", c.design.effort);
      limiteTxt = confere("limite_min", "limite_min", String(c.limits.timeoutSeconds / 60));
      if (modo === "real") modelo = confere("modelo", "modelo", c.design.models[0]?.requested ?? "");
      if (vazio("tentativa")) tentativa = "auto";
    }
    if (c.design.screens[0] && c.design.screens[0].id !== has("tela")) p.push(`tela ${has("tela")} ≠ ${c.design.screens[0].id} da campanha`);
  } else {
    if (braco === DA_AGENDA || !braco) p.push(`braco: sem | com (a campanha ${has("campanha")} não tem agenda)`);
    if (!par) par = "par-01";
    if (!repeticao) repeticao = "1";
    if (!tentativa) tentativa = "1";
    if (!limiteTxt) limiteTxt = "90";
    if (esforco === DA_CAMPANHA) esforco = "high";
  }
  if (!["sem", "com"].includes(braco) && !p.some((x) => x.startsWith("braco"))) p.push("braco: sem | com");
  if (!ID.test(par)) p.push("par: id [A-Za-z0-9._-], até 128");
  const limite = Number(limiteTxt);
  if (!Number.isInteger(limite) || limite < 1 || limite > 90) p.push("limite_min: inteiro de 1 a 90 (teto de segurança, D-67)");
  for (const [k, v] of [["tentativa", tentativa], ["repeticao", repeticao]] as const) {
    if (v === "auto" && k === "tentativa") continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 99) p.push(`${k}: inteiro de 1 a 99`);
  }
  if (modo === "real") {
    if (!MODELO.test(modelo) || /duble|teste|roteirizado/i.test(modelo)) p.push("modelo: id exato do modelo (modo real)");
    if (!EFFORT_LEVELS.includes(esforco)) p.push(`esforco: ${EFFORT_LEVELS.join(" | ")}`);
  }
  const rerun = has("refazer_linha_de_base_de");
  if (rerun && (!ID.test(rerun) || !has("motivo_refazer"))) p.push("refazer_linha_de_base_de exige id válido e motivo_refazer");
  if (rerun && has("etapas") !== "so-linha-de-base") p.push("refazer a linha de base só com etapas = so-linha-de-base (sem chamar o agente de novo)");
  const agente = modo === "roteirizado" ? "fake" : "claude";
  const egress = modo === "real" ? "real" : "stub";
  const saidas: Record<string, string> = {
    agente, egress, fixture: String(modo !== "real"),
    modelo: modo === "real" ? modelo : modo === "duble" ? MODELO_ENSAIO.duble : MODELO_ENSAIO.roteirizado,
    esforco: modo === "roteirizado" ? "nao-se-aplica" : (EFFORT_LEVELS.includes(esforco) ? esforco : "high"),
    imagens: braco === "com" ? "agent,screens,collector,egress,oracle" : "agent,screens,collector,egress",
    coleta: String(has("etapas") !== "so-linha-de-base"),
    linha_de_base: String(has("etapas") !== "so-coleta"),
    limite_seg: String(limite * 60),
    limite_min: String(limite),
    braco, par, repeticao, tentativa,
    agenda: String(Boolean(ag)),
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

// ───────────────────────────────────────────────────────────────── cartão de saúde (NAT-58)

/**
 * O que o disparo sabe dele mesmo, pelas entradas (env do passo). Serve quando não há run.json.
 * Nada da referência entra aqui: a coleta não a tem, e o cartão só lê run.json, findings.json e o índice.
 */
export interface ContextoCartao { campanha?: string; slot?: string; par?: string; tela?: string; braco?: string; modelo?: string; esforco?: string; tentativa?: string; etapas?: string }
/** O que só o job arquivar sabe: se gravou, se o anexo foi confirmado, e o clone do govbr-resultados (para ver o par). */
export interface InfoArquivamento { concluido: boolean; pendentes: string[]; arquivo: string | null }

/** Primeira linha útil de um texto, sem stack nem log (a mesma ideia do `frase()` do painel). */
export function umaFrase(texto: string | null | undefined, max = 200): string {
  const linha = String(texto ?? "").split(/\r?\n/).map((l) => l.trim()).find((l) => l && !/^at\s/.test(l)) ?? "";
  const limpa = linha.replace(/\s+/g, " ").replace(/\|/g, "/");
  return limpa.length > max ? `${limpa.slice(0, max - 1).trimEnd()}…` : limpa;
}
const medido = (m: { value: number | null; status: string } | undefined): number | null => (m && m.status === "measured" && typeof m.value === "number" ? m.value : null);
function duracaoTexto(s: number | null): string {
  if (s === null) return "desconhecida";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m} min${r ? ` ${r} s` : ""}` : `${r} s`;
}
const BRACO_TXT: Record<string, string> = { sem: "braço sem (sem oráculo)", com: "braço com (com oráculo)" };
const ETAPA_TXT: Record<string, string> = { preparing: "preparação", preflight: "conferência prévia", running: "execução do agente", collecting: "coleta do relatório", archiving: "gravação do pacote" };
const ISOL_TXT: Record<string, string> = { passed: "isolamento conferido", failed: "isolamento VIOLADO", unverified: "isolamento não verificado" };

function lerRunSeguro(dir: string | null): Run | null {
  if (!dir || !existsSync(join(dir, "run.json"))) return null;
  try { return JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) as Run; } catch { return null; }
}
function achadosTexto(dir: string, r: Run): string {
  if (r.submission.status === "refused") return "relatório recusado pelo coletor (não é 0 achados)";
  if (r.submission.status !== "accepted" || !r.submission.findings) return "nenhum relatório enviado (não é 0 achados)";
  try {
    const n = (JSON.parse(readFileSync(join(dir, r.submission.findings), "utf8")) as { report?: { findings?: unknown[] } }).report?.findings?.length;
    if (typeof n !== "number") return "achados ilegíveis no pacote";
    return n === 0 ? "0 achados (lista vazia aceita)" : `${n} achado${n === 1 ? "" : "s"} enviado${n === 1 ? "" : "s"}`;
  } catch { return "achados ilegíveis no pacote"; }
}

/** Situação do par no clone do arquivo: só o índice e o desenho da campanha (nunca a referência). */
export function situacaoDoPar(arquivo: string, campanha: string, par: string, braco: string): string {
  const dir = join(arquivo, "indice", "entradas");
  if (!existsSync(dir)) return "abra o painel (o clone do arquivo não tem índice)";
  const es: EntradaIndice[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    try {
      const e = JSON.parse(readFileSync(join(dir, f), "utf8")) as EntradaIndice;
      if (e.tipo === "execucao" && e.campanha === campanha && e.par === par) es.push(e);
    } catch { /* entrada ilegível: o painel avisa */ }
  }
  let desenho: string[] | null = null;
  const cdir = join(arquivo, "campanhas", campanha);
  if (existsSync(cdir)) {
    for (const s of readdirSync(cdir).sort()) {
      const c = join(cdir, s, "campaign.json");
      try { if (existsSync(c)) desenho = (JSON.parse(readFileSync(c, "utf8")) as { design?: { arms?: string[] } }).design?.arms ?? desenho; } catch { /* sem desenho */ }
    }
  }
  const outro = braco === "sem" ? "com" : "sem";
  if (desenho && !desenho.includes(outro)) return `campanha de um braço só (pelo desenho) → atualize o clone (git pull) e prepare a análise da execução no painel`;
  const doOutro = es.filter((e) => e.braco === outro).sort((a, b) => b.dataUtc.localeCompare(a.dataUtc));
  if (!doOutro.length) return `falta o braço ${outro} do ${par} (dispare o slot dele)`;
  const ultimo = doOutro[0];
  if (ultimo.estado.arquivo === "sem-pacote" || ultimo.estado.tecnico !== "passed") return `o braço ${outro} do ${par} falhou na última tentativa → nova tentativa do slot dele`;
  return `${par} completo → atualize o clone (git pull) e clique em Preparar análise no painel`;
}

/**
 * O cartão do topo do resumo: uma linha de saúde, uma de identidade, uma de números e o próximo passo.
 * As tabelas técnicas vão dobradas logo abaixo (`detalhes`). Valor não medido fica "desconhecido", nunca 0.
 */
export function cartaoSaude(pacote: string | null, ctx: ContextoCartao, arq: InfoArquivamento | null = null): string {
  const r = lerRunSeguro(pacote);
  const slot = r?.slotId ?? ctx.slot ?? "slot desconhecido";
  const par = r?.pairId ?? ctx.par ?? null;
  const campanha = r?.campaignId ?? ctx.campanha ?? null;
  const braco = r?.arm ?? ctx.braco ?? "";
  const tentativa = r?.attempt ?? (Number(ctx.tentativa) || null);
  const soLinhaDeBase = !r && ctx.etapas === "so-linha-de-base";
  let causa: string | null = null;
  if (soLinhaDeBase) causa = null;
  else if (!r) causa = "interrompida sem pacote — o run.json não foi produzido";
  else if (r.status.technical !== "passed") {
    const motivo = r.failure ? umaFrase(r.failure.detail) || r.failure.reason : "";
    const como = r.status.technical === "not-run" ? "o modelo não foi chamado" : r.status.technical === "interrupted" ? "interrompida" : "falhou";
    causa = `${como}${r.failure ? ` na ${ETAPA_TXT[r.failure.stage] ?? `etapa ${r.failure.stage}`}` : ""}${motivo ? ` — ${motivo}` : ""}`;
  } else if (r.status.isolation === "failed") causa = "isolamento violado — a execução não serve para análise";
  else if (r.submission.status !== "accepted") causa = r.submission.status === "refused" ? "o coletor recusou o relatório do agente (não é 0 achados)" : "o agente terminou sem enviar relatório (não é 0 achados)";

  const L: string[] = [soLinhaDeBase ? `### ➖ ${slot}: só linha de base neste disparo (sem coleta)` : causa ? `### ❌ ${slot}: ${umaFrase(causa, 240)}` : `### ✅ ${slot}: execução limpa`];
  L.push("", `**${r?.screen.id ?? ctx.tela ?? "tela desconhecida"}** · ${BRACO_TXT[braco] ?? "braço desconhecido"} · ${r?.model.requested ?? ctx.modelo ?? "modelo desconhecido"} · esforço ${r?.effort ?? ctx.esforco ?? "desconhecido"}${r?.fixture ? " · ENSAIO (não é dado)" : ""}`);
  if (r && pacote) {
    const custo = medido(r.usage.estimatedCostUsd);
    L.push("", [
      `duração do agente: ${duracaoTexto(medido(r.usage.wallClockSeconds))}`,
      `custo estimado pelo cliente: ${custo === null ? "desconhecido" : `US$ ${custo.toFixed(2).replace(".", ",")} (estimativa, não fatura)`}`,
      achadosTexto(pacote, r),
      ...(r.arm === "com" ? [`chamadas ao oráculo: ${medido(r.usage.oracleCalls) ?? "desconhecido"}`] : []),
      ISOL_TXT[r.status.isolation] ?? `isolamento: ${r.status.isolation}`,
    ].join(" · "));
  }
  let proximo: string;
  if (arq && (!arq.concluido || arq.pendentes.length)) {
    proximo = `repita o job arquivar (Re-run failed jobs) — ${arq.concluido ? "o anexo de evidências não foi confirmado" : "nada foi gravado no govbr-resultados"}; o modelo não é chamado de novo`;
  } else if (soLinhaDeBase) proximo = arq ? "a linha de base está no arquivo; abra o painel" : "aguarde o job arquivar e abra o painel";
  else if (causa) {
    proximo = !r || r.status.technical !== "passed" || r.status.isolation === "failed"
      ? `nova tentativa do slot ${slot}${tentativa ? ` (tentativa ${tentativa + 1})` : ""} — só por falha técnica (D-67)`
      : "abra a execução no painel para ver por que o relatório não foi aceito";
  } else if (arq?.arquivo && par && campanha) proximo = situacaoDoPar(arq.arquivo, campanha, par, braco);
  else proximo = "aguarde o job arquivar; depois atualize o clone (git pull) e abra o painel";
  L.push("", `**Próximo passo:** ${proximo}`);
  return L.join("\n") + "\n";
}

/** Tabelas técnicas dobradas sob o cartão. */
export const detalhes = (texto: string): string => `\n<details><summary>Detalhes técnicos</summary>\n\n${texto.trim()}\n\n</details>\n`;

/** Cabeçalho de uma linha do job da linha de base (ele não sabe da coleta). */
export function cartaoLinhaDeBase(dir: string): string {
  const refazer = "**Próximo passo:** repita só a linha de base (etapas = so-linha-de-base) — o modelo não é chamado.\n";
  const reg = join(dir, "baseline.json");
  if (!existsSync(reg)) return `### ❌ Linha de base: não produziu registro (baseline.json)\n\n${refazer}`;
  const b = JSON.parse(readFileSync(reg, "utf8")) as { baselineId: string; status: string; error: string | null };
  const prob = existsSync(join(dir, "problemas.json")) ? JSON.parse(readFileSync(join(dir, "problemas.json"), "utf8")) as string[] : [];
  if (b.status === "complete" && !prob.length) return `### ✅ Linha de base ${b.baselineId}: registrada e utilizável pela análise\n`;
  return `### ❌ Linha de base ${b.baselineId}: ${umaFrase(b.error ?? prob[0] ?? b.status, 200)}\n\n${refazer}`;
}

/** Entradas do disparo pelo env do passo; vazio = não informado. */
export const contextoDoAmbiente = (env: NodeJS.ProcessEnv = process.env): ContextoCartao => {
  const v = (k: string): string | undefined => env[k]?.trim() || undefined;
  return { campanha: v("CAMPANHA"), slot: v("SLOT"), par: v("PAR"), tela: v("TELA"), braco: v("BRACO"), modelo: v("MODELO"), esforco: v("ESFORCO"),
    tentativa: v("TENTATIVA"), etapas: v("ETAPAS") };
};

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
      const ent = JSON.parse(process.env.ENTRADAS ?? "{}") as Partial<Entradas>;
      let ag: AgendaDoDisparo | null = null, erro: string | null = null;
      try { ag = agendaDaCampanha(resolve(fileURLToPath(import.meta.url), "..", ".."), String(ent.campanha ?? "")); } catch (x) { erro = (x as Error).message; }
      const { problemas, saidas } = conferirEntradas(ent, ag);
      if (erro) problemas.push(erro);
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
    case "resumo-coleta": {
      const pacote = resolve(need("--pacote"));
      saida(cartaoSaude(pacote, contextoDoAmbiente()) + detalhes(resumoColeta(pacote)));
      return 0;
    }
    case "resumo-linha-de-base": { const dir = resolve(need("--dir")); saida(cartaoLinhaDeBase(dir) + detalhes(resumoLinhaDeBase(dir))); return 0; }
    case "resumo-arquivo": {
      const saidaJson = resolve(need("--saida-json"));
      const arquivo = val("--arquivo") ? resolve(val("--arquivo")!) : null;
      const r = resumoArquivo(saidaJson, arquivo);
      const pacote = val("--pacote") ? resolve(val("--pacote")!) : null;
      saida(cartaoSaude(pacote, contextoDoAmbiente(), { concluido: existsSync(saidaJson), pendentes: r.pendentes, arquivo }) + detalhes(r.texto));
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
