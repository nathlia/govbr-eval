/**
 * Manifesto de coleta do benchmark isolado (T4). Um por disparo do workflow, gravado pelo job
 * `preparar` ANTES da coleta e da linha de base, e lido pelos dois jobs que vêm depois dela que
 * podem vê-lo: `linhas-de-base` e `arquivar`. O job `coleta` nunca o recebe — ele carrega o plano de
 * estados, que vem da referência.
 *
 * O manifesto da v02 (`collection-manifest.ts`, `manifesto-coleta-1.0.0`) exige superfície de medida,
 * plano de bateria e corpus; nada disso existe no instrumento novo. Este guarda só o que a linha de
 * base e a análise comparam (`ExecutableIdentity`), mais os commits e o lock das imagens, e o
 * caminho da referência dentro do checkout do govbr-eval (no mesmo commit).
 *
 * T8a.1 (1.1.0): o manifesto passa a levar a CAMPANHA (`campaign.v1`) que a análise T6 exige. Ela é
 * escrita antes da coleta: no modo real, `campanhas/<campanha>/campaign.json` commitado no govbr-eval
 * (no commit do disparo) — sem ele o `preparar` recusa, antes de qualquer gasto; nos ensaios (dublê,
 * roteirizado), se não houver arquivo commitado, uma campanha `fixture: true` é gerada do próprio
 * disparo, com bytes determinísticos (os dois braços de um par geram a mesma). O job `arquivar` grava
 * a campanha por conteúdo no govbr-resultados. Manifestos 1.0.0 continuam legíveis (sem campanha).
 *
 *   tsx scripts/manifesto-coleta-isolada.ts build --out ARQ_NOVO --tela solicitacao [--telas DIR] [--validator DIR]
 *        [--referencia ARQ] --campanha ID --slot ID --par ID --braco sem|com --modo real|duble|roteirizado
 *        [--modelo ID] [--esforco N] [--limite-min N] [--tentativa N] [--repeticao N] [--campanha-arquivo ARQ]
 *        [--agenda-arquivo ARQ] [--arquivo-indice CLONE_DO_GOVBR_RESULTADOS]
 *   tsx scripts/manifesto-coleta-isolada.ts verify --manifest ARQ
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLLECTION_MANIFEST_VERSION, compareIdentities, gitState, identityProblems, oracleIdentity, readCollectionManifest, sha256,
  statePlanOf, statePlanSha256, type ExecutableIdentity, type StatePlan,
} from "./collection-manifest";
import { ROOT } from "./adjudication";
import { FLOW_INSTRUMENT_VERSION, FLOW_SCORING_VERSION } from "./instrument";
import { normalizeNewlines, SKILL_PATH } from "./render-task-prompt";
import { divergenciasDaCampanha, type IdentidadeEfetiva } from "./identidade-campanha";
import { referenciaDe, telaOf } from "./telas";
import {
  caminhoAgenda, documentoDaAgenda, lerEntradasDoIndice, problemasDaAgenda, proximaTentativa, type Agenda, type SlotAgenda,
} from "./agenda-campanha";
import { validateContract, type Campaign } from "../contracts/index";

export const ISOLATED_MANIFEST_VERSION = "manifesto-coleta-isolada-1.3.0";
/**
 * Versões legíveis: 1.0.0 (T4, sem campanha), 1.1.0 (T8a.1, com a campanha), 1.2.0 (NAT-63, com a
 * execução efetiva — esforço, tempo limite, cliente, protocolo — conferida contra a campanha) e 1.3.0
 * (NAT-65, com a agenda congelada quando a campanha tem uma: slot resolvido e tentativa contada no índice).
 */
export const ISOLATED_MANIFEST_VERSIONS = ["manifesto-coleta-isolada-1.0.0", "manifesto-coleta-isolada-1.1.0", "manifesto-coleta-isolada-1.2.0", ISOLATED_MANIFEST_VERSION] as const;
const COM_CAMPANHA: readonly string[] = ["manifesto-coleta-isolada-1.1.0", "manifesto-coleta-isolada-1.2.0", ISOLATED_MANIFEST_VERSION];
const COM_EXECUCAO: readonly string[] = ["manifesto-coleta-isolada-1.2.0", ISOLATED_MANIFEST_VERSION];
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const COMMIT = /^[a-f0-9]{40}$/;

/**
 * A campanha do disparo. `sha256` é o dos bytes que o arquivo grava (`documentoDaCampanha(document)`);
 * `origin` diz de onde ela veio: o arquivo commitado (com o sha256 dos bytes de lá) ou gerada para ensaio.
 */
export interface CampaignRecord {
  sha256: string;
  origin: "commitada" | "gerada-ensaio";
  sourcePath: string | null;
  sourceSha256: string | null;
  document: Campaign;
}

export interface IsolatedCollectionManifest {
  manifestVersion: (typeof ISOLATED_MANIFEST_VERSIONS)[number];
  generatedAt: string;
  /** true nos modos sem modelo (dublê, roteirizado): nunca dado científico. */
  fixture: boolean;
  dispatch: {
    campaignId: string; slotId: string; pairId: string; screenId: string; arm: "sem" | "com";
    mode: "real" | "duble" | "roteirizado"; attempt: number; repetition: number;
    model: string | null; effort: string | null; limitMinutes: number;
    github: { repository: string; runId: string; runAttempt: string; workflowSha: string } | null;
  };
  identity: ExecutableIdentity;
  /** Caminho relativo à raiz do govbr-eval, no commit de `repos.govbr-eval`. Nunca exposto ao agente. */
  reference: { path: string; sha256: string; bytes: number; version: string | null };
  statePlan: StatePlan;
  site: { manifestSha256: string; manifestBytes: number; siteSha256: string; packageVersion: string; corpusCommit: string | null; screenVersion: string };
  oracle: { package: string | null; version: string | null; distSha256: string; dataSha256: string };
  repos: Record<"govbr-eval" | "govbr-telas" | "govbr-ds-validator", { commit: string | null; dirty: boolean | null }>;
  imagesLock: { sha256: string; versions: unknown };
  /** Ausente só em manifestos 1.0.0 (arquivados antes do T8a.1). */
  campaign?: CampaignRecord;
  /**
   * 1.2.0 (NAT-63): o que a coleta deste disparo vai usar, medido no `preparar` e conferido contra a
   * campanha antes de qualquer chamada de modelo. Ausente em 1.0.0/1.1.0 (derivado do despacho e do
   * lock; protocolo desconhecido, conferido só na análise pelo run.json).
   */
  execution?: ExecucaoDoDisparo;
  /**
   * 1.3.0 (NAT-65): presente quando a campanha tem `campanhas/<id>/agenda.json`. O slot do disparo
   * resolvido na agenda e a tentativa contada no índice do arquivo, ambos conferidos no `preparar`.
   */
  agenda?: AgendaRecord;
}

/** A agenda do disparo: os bytes (por conteúdo, como a campanha), o slot e a contagem de tentativas. */
export interface AgendaRecord {
  sha256: string;
  sourcePath: string;
  document: Agenda;
  slot: SlotAgenda;
  attempt: { anteriores: { chave: string; classe: string; razao: string | null }[]; extrasUsadas: number; extrasLimite: number };
}

/** A execução efetiva de um disparo: os mesmos valores que o run.json vai registrar. */
export interface ExecucaoDoDisparo {
  effort: string;
  timeoutSeconds: number;
  client: { name: string; version: string };
  protocolSha256: string;
}

/**
 * O modelo que a coleta pede: o do disparo; nos ensaios, sem modelo no disparo, o mesmo que
 * `pipeline-t4.ts entradas` entrega ao run-once.
 */
export const MODELO_ENSAIO = { duble: "claude-opus-duble-teste", roteirizado: "agente-roteirizado" } as const;
export function modeloDaColeta(modo: "real" | "duble" | "roteirizado", modelo: string | null): string | null {
  return modo === "real" ? modelo : (modelo ?? MODELO_ENSAIO[modo]);
}

/**
 * Esforço que a coleta passa ao cliente — o mesmo de `pipeline-t4.ts entradas` (saída `esforco`):
 * roteirizado não tem esforço; sem esforço no disparo, `high`.
 */
export function esforcoDaColeta(modo: "real" | "duble" | "roteirizado", esforco: string | null): string {
  return modo === "roteirizado" ? "nao-se-aplica" : (esforco ?? "high");
}

/** Cliente que o run-once registra: o agente roteirizado ou o Claude Code travado nas imagens. */
export function clienteDaColeta(modo: "real" | "duble" | "roteirizado", imagesLock: { versions: unknown }): { name: string; version: string } {
  const v = (imagesLock.versions ?? {}) as { claudeCode?: string };
  return modo === "roteirizado" ? { name: "fake-agent", version: "1.0.0" } : { name: "claude-code", version: v.claudeCode ?? "desconhecida" };
}

/** sha256 do protocolo como o run-once o registra (`templateSha256`: o template com quebras normalizadas). */
export function protocoloSha256(path = SKILL_PATH): string {
  return sha256Texto(normalizeNewlines(readFileSync(path, "utf8")));
}

/** Execução efetiva do disparo (manifestos sem `execution`: derivada do despacho, protocolo desconhecido). */
export function identidadeDoDisparo(m: Pick<IsolatedCollectionManifest, "dispatch" | "imagesLock" | "execution">): IdentidadeEfetiva {
  const d = m.dispatch;
  const x = m.execution;
  return {
    effort: x?.effort ?? esforcoDaColeta(d.mode, d.effort),
    timeoutSeconds: x?.timeoutSeconds ?? d.limitMinutes * 60,
    // o run-once não aplica teto de turnos nem de orçamento (grava null): a campanha não pode exigi-los
    maxTurns: null, maxBudgetUsd: null,
    client: x?.client ?? clienteDaColeta(d.mode, m.imagesLock ?? { versions: {} }),
    protocolSha256: x?.protocolSha256 ?? null,
    attempt: d.attempt, repetition: d.repetition,
  };
}

/** Bytes canônicos da campanha no arquivo (é o que o sha256 do registro cobre). */
export const documentoDaCampanha = (c: Campaign): string => JSON.stringify(c, null, 2) + "\n";
const sha256Texto = (s: string | Buffer): string => createHash("sha256").update(s).digest("hex");
export const caminhoCampanhaCommitada = (campanha: string): string => `campanhas/${campanha}/campaign.json`;

/**
 * Campanha de ENSAIO gerada do disparo (só dublê/roteirizado, nunca no modo real). Determinística: não
 * leva braço, slot nem horário do disparo, para que os dois braços de um par cheguem aos mesmos bytes.
 */
export function campanhaDeEnsaio(m: Pick<IsolatedCollectionManifest, "dispatch" | "site" | "oracle" | "imagesLock" | "execution">): Campaign {
  const d = m.dispatch;
  if (d.mode === "real") throw new Error("campanha gerada só existe para ensaio; o modo real exige campanhas/<id>/campaign.json commitado");
  const v = (m.imagesLock.versions ?? {}) as { playwrightMcp?: string; chromium?: string; claudeCode?: string };
  const modelo = modeloDaColeta(d.mode, d.model)!;
  const x = identidadeDoDisparo(m);
  return {
    contract: "campaign.v1", fixture: true, campaignId: d.campaignId, kind: "pilot",
    title: `Campanha de ensaio ${d.campaignId} (gerada do disparo; ENSAIO, nunca dado científico)`,
    objective: `Ensaio do pipeline isolado no modo ${d.mode}: exercitar coleta, arquivo e análise sem custo de modelo.`,
    hypotheses: ["Ensaio de infraestrutura: nenhuma hipótese científica."],
    createdAt: "2026-10-03T00:00:00Z", frozenAt: null,
    design: { screens: [{ id: d.screenId, label: SCREEN_LABELS[d.screenId] ?? d.screenId, version: m.site.screenVersion }], arms: ["sem", "com"],
      models: [{ family: d.mode === "roteirizado" ? "roteirizado" : "claude", requested: modelo }],
      effort: x.effort!, repetitions: 1, order: "sequencial", seed: null },
    fixed: {
      protocolSha256: x.protocolSha256 ?? protocoloSha256(),
      client: x.client!,
      provider: d.mode === "roteirizado" ? { name: "nenhum (agente roteirizado)", authMethod: "unknown" } : { name: "stub", authMethod: "unknown" },
      browser: { name: "chromium", version: v.chromium ?? "desconhecida" }, playwrightMcp: `@playwright/mcp@${v.playwrightMcp ?? "?"}`,
      isolationPolicyVersion: "a do runner (registrada em cada run.json)",
      oracle: { package: m.oracle.package ?? "desconhecido", version: m.oracle.version ?? "desconhecida", distSha256: m.oracle.distSha256, dataSha256: m.oracle.dataSha256, profile: "combined" },
      scorerVersion: FLOW_SCORING_VERSION,
    },
    limits: { timeoutSeconds: x.timeoutSeconds!, maxTurns: null, maxBudgetUsd: null },
    retryPolicy: { maxAttemptsPerSlot: 1, campaignAttemptCeiling: 2, retryOn: [], attemptSelection: "ensaio: a única tentativa arquivada de cada braço" },
    failurePolicy: "Ensaio: falha fica registrada; nada é repetido automaticamente.",
    baselinePolicy: { required: true, comparable: ["linha-de-base/validator-nao-guiada", "linha-de-base/axe"], diagnosticOnly: ["linha-de-base/validator-guiada"], plannedAbsences: [] },
    analysisPlan: { primaryOutcome: "Nenhum (ensaio de infraestrutura).", secondaryOutcomes: [], uncertaintyMethod: null, exclusionRules: "Ensaio: nada entra em resultado científico." },
    budget: { approved: false, amount: null, currency: null, approvedBy: null, approvedAt: null },
  };
}

/**
 * A campanha serve a este disparo? Contrato, id, natureza, tela/versão, braço, modelo, oráculo e
 * (NAT-63) a execução efetiva: esforço, tempo limite, cliente, protocolo (manifesto 1.2.0), tentativa
 * e repetição dentro dos tetos congelados. Roda no `preparar`, antes de qualquer chamada de modelo.
 */
export function problemasDaCampanha(c: Campaign, m: Pick<IsolatedCollectionManifest, "dispatch" | "site" | "oracle" | "fixture" | "imagesLock" | "execution">): string[] {
  const v = validateContract(c);
  if (v.contract !== "campaign.v1" || !v.valid) return [`campanha fora do contrato campaign.v1: ${v.errors.map((e) => `${e.path || "/"} ${e.message}`).join("; ")}`];
  const p: string[] = [];
  const d = m.dispatch;
  if (c.campaignId !== d.campaignId) p.push(`campanha ${c.campaignId} ≠ ${d.campaignId} do disparo`);
  if (c.fixture !== m.fixture) p.push(`campanha fixture=${String(c.fixture)} num disparo ${d.mode} (fixture=${String(m.fixture)})`);
  if (!c.design.screens.some((s) => s.id === d.screenId && s.version === m.site.screenVersion)) p.push(`a campanha não traz a tela ${d.screenId}@${m.site.screenVersion} no desenho`);
  if (!c.design.arms.includes(d.arm)) p.push(`a campanha não traz o braço ${d.arm}`);
  const modelo = modeloDaColeta(d.mode, d.model);
  if (!c.design.models.some((x) => x.requested === modelo)) p.push(`a campanha não traz o modelo ${String(modelo)}`);
  if (c.fixed.oracle.distSha256 !== m.oracle.distSha256 || c.fixed.oracle.dataSha256 !== m.oracle.dataSha256) p.push("oráculo fixado na campanha ≠ o compilado para o disparo");
  p.push(...divergenciasDaCampanha(c, identidadeDoDisparo(m)));
  return p;
}

/** Lê a campanha commitada (o modo real exige) ou gera a de ensaio. Recusa campanha que não serve ao disparo. */
export function campanhaDoDisparo(m: Omit<IsolatedCollectionManifest, "campaign">, caminho: string): CampaignRecord {
  let document: Campaign, origin: CampaignRecord["origin"], sourcePath: string | null = null, sourceSha256: string | null = null;
  if (existsSync(caminho)) {
    const bytes = readFileSync(caminho);
    try { document = JSON.parse(bytes.toString("utf8")) as Campaign; } catch { throw new Error(`campanha ilegível (JSON inválido): ${caminho}`); }
    origin = "commitada";
    const rel = relative(ROOT, caminho).replace(/\\/g, "/");
    sourcePath = rel.startsWith("..") ? caminho.replace(/\\/g, "/") : rel;
    sourceSha256 = sha256Texto(bytes);
  } else if (m.dispatch.mode === "real") {
    throw new Error(`modo real sem campanha: falta ${caminhoCampanhaCommitada(m.dispatch.campaignId)} no govbr-eval (a campanha é escrita e commitada antes da coleta, e a análise exige)`);
  } else {
    document = campanhaDeEnsaio(m);
    origin = "gerada-ensaio";
  }
  const p = problemasDaCampanha(document, m);
  if (p.length) throw new Error(`campanha não serve a este disparo; nada foi gravado: ${p.join("; ")}`);
  return { sha256: sha256Texto(documentoDaCampanha(document)), origin, sourcePath, sourceSha256, document };
}

/** A identidade da tela que run-once grava em `run.screen.version`: o mesmo texto, para a análise casar. */
export function screenVersionOf(siteSha256: string): string {
  return `govbr-telas-site-${siteSha256.slice(0, 12)}`;
}
export const SCREEN_LABELS: Record<string, string> = { solicitacao: "Solicitar serviço", vistorias: "Vistorias" };

export interface BuildOptions {
  tela: string; telasDir: string; validatorDir: string; referencePath?: string;
  campanha: string; slot: string; par: string; braco: "sem" | "com"; modo: "real" | "duble" | "roteirizado";
  modelo: string | null; esforco: string | null; limiteMin: number;
  /** "auto" (só com agenda): a tentativa que o índice do arquivo dá ao slot. */
  tentativa: number | "auto"; repeticao: number;
  github?: IsolatedCollectionManifest["dispatch"]["github"];
  /** Padrão: campanhas/<campanha>/campaign.json do govbr-eval. */
  campanhaPath?: string;
  /** Padrão: agenda.json ao lado do campaign.json. Sem o arquivo, a campanha não tem agenda. */
  agendaPath?: string;
  /** Clone (ou checkout esparso de `indice/entradas`) do govbr-resultados: exigido quando há agenda. */
  arquivoIndice?: string | null;
}

/**
 * Agenda do disparo (NAT-65): a campanha commitada tem agenda? Então o slot vem dela — par, braço e
 * repetição que divergem são recusados — e a tentativa vem do índice do arquivo. Campanha formal no
 * modo real sem agenda é recusada; campanha sem agenda (piloto, ensaio) segue como antes.
 */
export function agendaDoDisparo(o: Pick<BuildOptions, "slot" | "par" | "braco" | "tentativa" | "repeticao" | "arquivoIndice" | "modo">,
  campanha: CampaignRecord, agendaPath: string): AgendaRecord | undefined {
  if (!existsSync(agendaPath)) {
    if (campanha.document.kind === "formal" && o.modo === "real") throw new Error(`campanha formal sem agenda: falta ${caminhoAgenda(campanha.document.campaignId)} (gere com npm run campanha:agenda e commite antes do primeiro disparo)`);
    return undefined;
  }
  if (campanha.origin !== "commitada" || !campanha.sourceSha256) throw new Error("agenda sem campanha commitada: a agenda aponta os bytes de um campaign.json");
  const bytes = readFileSync(agendaPath);
  let document: Agenda;
  try { document = JSON.parse(bytes.toString("utf8")) as Agenda; } catch { throw new Error(`agenda ilegível (JSON inválido): ${agendaPath}`); }
  const pa = problemasDaAgenda(document, campanha.document, campanha.sourceSha256);
  if (pa.length) throw new Error(`agenda não serve a esta campanha; nada foi gravado: ${pa.join("; ")}`);
  const slot = document.slots.find((s) => s.slotId === o.slot);
  if (!slot) throw new Error(`o slot ${o.slot} não está na agenda de ${document.campaignId} (slots: ${document.slots.map((s) => s.slotId).join(", ")})`);
  const div: string[] = [];
  if (o.par !== slot.pairId) div.push(`par ${o.par} ≠ ${slot.pairId}`);
  if (o.braco !== slot.arm) div.push(`braço ${o.braco} ≠ ${slot.arm}`);
  if (o.repeticao !== slot.repetition) div.push(`repetição ${o.repeticao} ≠ ${slot.repetition}`);
  if (div.length) throw new Error(`o disparo diverge da agenda no slot ${slot.slotId}; nada foi gravado: ${div.join("; ")}`);
  if (!o.arquivoIndice) throw new Error("campanha com agenda sem o índice do arquivo (--arquivo-indice): sem ele não se sabe quantas tentativas o slot já teve");
  const d = proximaTentativa(document, campanha.document, lerEntradasDoIndice(o.arquivoIndice), slot.slotId);
  if (!d.ok) throw new Error(`nova tentativa recusada pela política da campanha; nada foi gravado: ${d.motivo}`);
  if (o.tentativa !== d.tentativa) throw new Error(`tentativa ${o.tentativa} ≠ ${d.tentativa}, a que o índice do arquivo dá ao slot ${slot.slotId}`);
  const rel = relative(ROOT, agendaPath).replace(/\\/g, "/");
  return { sha256: sha256Texto(bytes), sourcePath: rel.startsWith("..") ? agendaPath.replace(/\\/g, "/") : rel, document, slot,
    attempt: { anteriores: d.anteriores.map((t) => ({ chave: t.chave, classe: t.classe, razao: t.razao })), extrasUsadas: d.extrasUsadas, extrasLimite: d.extrasLimite } };
}

export function buildIsolatedManifest(opcoes: BuildOptions): IsolatedCollectionManifest {
  const o = { ...opcoes, tentativa: opcoes.tentativa === "auto" ? tentativaAutomatica(opcoes) : opcoes.tentativa };
  for (const [k, v] of [["campanha", o.campanha], ["slot", o.slot], ["par", o.par]] as const) if (!ID.test(v)) throw new Error(`--${k} inválido: ${v}`);
  if (o.braco !== "sem" && o.braco !== "com") throw new Error("--braco: sem | com");
  if (!["real", "duble", "roteirizado"].includes(o.modo)) throw new Error("--modo: real | duble | roteirizado");
  if (!Number.isInteger(o.limiteMin) || o.limiteMin < 1 || o.limiteMin > 90) throw new Error("--limite-min: inteiro de 1 a 90 (teto de segurança do piloto, D-67)");
  const tela = telaOf(o.tela);
  const referencePath = resolve(o.referencePath ?? join(ROOT, referenciaDe(tela)));
  const refBytes = readFileSync(referencePath);
  const gt = JSON.parse(refBytes.toString("utf8")) as Parameters<typeof statePlanOf>[0] & { _meta?: { version?: string } };
  const statePlan = statePlanOf(gt);
  const siteText = readFileSync(join(o.telasDir, "site-manifest.json"));
  const site = JSON.parse(siteText.toString("utf8")) as { contract?: string; item: { sha256: string }; package: { version: string }; origin?: { corpus?: { commit?: string | null } }; screens: { id: string }[] };
  if (site.contract !== "site-manifest.v1") throw new Error("site-manifest.json do govbr-telas fora do contrato site-manifest.v1");
  if (!site.screens.some((s) => s.id === o.tela)) throw new Error(`o site-manifest.json não declara a tela ${o.tela}`);
  const oracle = oracleIdentity(o.validatorDir);
  if (!oracle.distSha256 || !oracle.dataSha256) throw new Error(`validador sem dist/ ou data/ em ${o.validatorDir} (rode npm run build nele)`);
  const lockPath = join(ROOT, "runner", "images.lock.json");
  const lockBytes = readFileSync(lockPath);
  const lock = JSON.parse(lockBytes.toString("utf8")) as { versions: { oracle: { distSha256: string; dataSha256: string }; telas: { manifestSha256: string } } };
  const siteManifestSha256 = sha256(siteText);
  // O que a coleta vai conferir de novo (run-once), conferido aqui antes de gastar o runner da coleta.
  if (lock.versions.telas.manifestSha256 !== siteManifestSha256) throw new Error(`site-manifest.json (${siteManifestSha256.slice(0, 12)}) ≠ o travado em runner/images.lock.json (${lock.versions.telas.manifestSha256.slice(0, 12)})`);
  if (lock.versions.oracle.distSha256 !== oracle.distSha256 || lock.versions.oracle.dataSha256 !== oracle.dataSha256) {
    throw new Error(`oráculo compilado (${oracle.distSha256.slice(0, 12)}/${oracle.dataSha256.slice(0, 12)}) ≠ o travado em runner/images.lock.json (${lock.versions.oracle.distSha256.slice(0, 12)}/${lock.versions.oracle.dataSha256.slice(0, 12)})`);
  }
  const pkg = existsSync(join(o.validatorDir, "package.json")) ? JSON.parse(readFileSync(join(o.validatorDir, "package.json"), "utf8")) as { name?: string; version?: string } : {};
  const relRef = relative(ROOT, referencePath).replace(/\\/g, "/");
  if (relRef.startsWith("..")) throw new Error("a referência precisa estar dentro do govbr-eval (mesmo commit do instrumento)");
  const semCampanha: Omit<IsolatedCollectionManifest, "campaign"> = {
    manifestVersion: ISOLATED_MANIFEST_VERSION,
    generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    fixture: o.modo !== "real",
    dispatch: {
      campaignId: o.campanha, slotId: o.slot, pairId: o.par, screenId: o.tela, arm: o.braco, mode: o.modo,
      attempt: o.tentativa, repetition: o.repeticao, model: o.modelo, effort: o.esforco, limitMinutes: o.limiteMin, github: o.github ?? null,
    },
    identity: {
      collection: FLOW_INSTRUMENT_VERSION,
      referenceSha256: sha256(refBytes),
      siteManifestSha256,
      oracleDistSha256: oracle.distSha256,
      oracleDataSha256: oracle.dataSha256,
      statePlanSha256: statePlanSha256(statePlan),
    },
    reference: { path: relRef, sha256: sha256(refBytes), bytes: refBytes.length, version: gt._meta?.version != null ? String(gt._meta.version) : null },
    statePlan,
    site: { manifestSha256: siteManifestSha256, manifestBytes: siteText.length, siteSha256: site.item.sha256, packageVersion: site.package.version,
      corpusCommit: site.origin?.corpus?.commit ?? null, screenVersion: screenVersionOf(site.item.sha256) },
    oracle: { package: pkg.name ?? null, version: pkg.version ?? null, distSha256: oracle.distSha256, dataSha256: oracle.dataSha256 },
    repos: { "govbr-eval": gitState(ROOT), "govbr-telas": gitState(o.telasDir), "govbr-ds-validator": gitState(o.validatorDir) },
    imagesLock: { sha256: sha256(lockBytes), versions: lock.versions },
    execution: {
      effort: esforcoDaColeta(o.modo, o.esforco), timeoutSeconds: o.limiteMin * 60,
      client: clienteDaColeta(o.modo, { versions: lock.versions }), protocolSha256: protocoloSha256(),
    },
  };
  const campanhaPath = resolve(o.campanhaPath ?? join(ROOT, caminhoCampanhaCommitada(o.campanha)));
  const campaign = campanhaDoDisparo(semCampanha, campanhaPath);
  const agenda = agendaDoDisparo(o, campaign, resolve(o.agendaPath ?? join(dirname(campanhaPath), "agenda.json")));
  const manifest: IsolatedCollectionManifest = { ...semCampanha, campaign, ...(agenda ? { agenda } : {}) };
  const problems = isolatedManifestProblems(manifest);
  if (problems.length) throw new Error(`manifesto de coleta incompleto; nada foi gravado: ${problems.join("; ")}`);
  return manifest;
}

/** `--tentativa auto`: a próxima tentativa do slot pela agenda e pelo índice (recusa o que a política recusa). */
function tentativaAutomatica(o: BuildOptions): number {
  const campanhaPath = resolve(o.campanhaPath ?? join(ROOT, caminhoCampanhaCommitada(o.campanha)));
  const agendaPath = resolve(o.agendaPath ?? join(dirname(campanhaPath), "agenda.json"));
  if (!existsSync(agendaPath) || !existsSync(campanhaPath)) throw new Error("--tentativa auto só existe para campanha commitada com agenda");
  if (!o.arquivoIndice) throw new Error("--tentativa auto sem --arquivo-indice: sem o índice não se sabe quantas tentativas o slot já teve");
  const c = JSON.parse(readFileSync(campanhaPath, "utf8")) as Campaign;
  const d = proximaTentativa(JSON.parse(readFileSync(agendaPath, "utf8")) as Agenda, c, lerEntradasDoIndice(o.arquivoIndice), o.slot);
  if (!d.ok) throw new Error(`nova tentativa recusada pela política da campanha; nada foi gravado: ${d.motivo}`);
  return d.tentativa;
}

export function isolatedManifestProblems(m: IsolatedCollectionManifest): string[] {
  const p = identityProblems("identidade", m.identity);
  if (!(ISOLATED_MANIFEST_VERSIONS as readonly string[]).includes(m.manifestVersion)) p.push(`versão ${String(m.manifestVersion)}`);
  if (m.identity.referenceSha256 !== m.reference?.sha256) p.push("identidade × referência: sha256 diverge");
  if (statePlanSha256(m.statePlan) !== m.identity.statePlanSha256) p.push("identidade × plano de estados: sha256 diverge");
  if (m.site?.manifestSha256 !== m.identity.siteManifestSha256) p.push("identidade × site: sha256 diverge");
  if (m.oracle?.distSha256 !== m.identity.oracleDistSha256 || m.oracle?.dataSha256 !== m.identity.oracleDataSha256) p.push("identidade × oráculo diverge");
  for (const [repo, g] of Object.entries(m.repos ?? {})) {
    if (!g.commit || !COMMIT.test(g.commit)) p.push(`commit de ${repo} ausente`);
    if (g.dirty !== false && !m.fixture) p.push(`${repo} com alterações locais: a coleta formal parte de checkout limpo`);
  }
  if (!m.dispatch || !ID.test(m.dispatch.campaignId) || !ID.test(m.dispatch.slotId)) p.push("despacho sem campanha/slot válidos");
  if (m.dispatch?.mode === "real" && (!m.dispatch.model || !m.dispatch.effort)) p.push("modo real sem modelo/esforço");
  if (m.fixture !== (m.dispatch?.mode !== "real")) p.push("fixture incoerente com o modo");
  if (COM_EXECUCAO.includes(m.manifestVersion)) {
    if (!m.execution) p.push(`${m.manifestVersion.replace("manifesto-coleta-isolada-", "manifesto ")} sem a execução efetiva`);
    else if (m.dispatch && m.execution.timeoutSeconds !== m.dispatch.limitMinutes * 60) p.push("execução × despacho: tempo limite diverge");
  }
  if (COM_CAMPANHA.includes(m.manifestVersion)) {
    if (!m.campaign?.document) p.push(`${m.manifestVersion.replace("manifesto-coleta-isolada-", "manifesto ")} sem campanha`);
    else {
      if (sha256Texto(documentoDaCampanha(m.campaign.document)) !== m.campaign.sha256) p.push("campanha × sha256 registrado diverge");
      if (m.dispatch && m.site && m.oracle) p.push(...problemasDaCampanha(m.campaign.document, m));
    }
  }
  if (m.agenda) {
    if (m.manifestVersion !== ISOLATED_MANIFEST_VERSION) p.push("agenda num manifesto anterior ao 1.3.0");
    if (sha256Texto(documentoDaAgenda(m.agenda.document)) !== m.agenda.sha256) p.push("agenda × sha256 registrado diverge");
    if (m.campaign?.sourceSha256 && m.campaign.document) p.push(...problemasDaAgenda(m.agenda.document, m.campaign.document, m.campaign.sourceSha256));
    const s = m.agenda.document.slots?.find((x) => x.slotId === m.agenda!.slot.slotId);
    if (!s || JSON.stringify(s) !== JSON.stringify(m.agenda.slot)) p.push("slot registrado ≠ o da agenda");
    else if (m.dispatch && (m.dispatch.slotId !== s.slotId || m.dispatch.pairId !== s.pairId || m.dispatch.arm !== s.arm || m.dispatch.repetition !== s.repetition)) p.push("despacho × slot da agenda diverge");
    if (m.dispatch && m.dispatch.attempt !== m.agenda.attempt.anteriores.length + 1) p.push("tentativa do despacho × tentativas anteriores registradas diverge");
  }
  return p;
}

export function readIsolatedManifest(path: string): { manifest: IsolatedCollectionManifest; sha256: string; bytes: number } {
  const bytes = readFileSync(path);
  const manifest = JSON.parse(bytes.toString("utf8")) as IsolatedCollectionManifest;
  if (!(ISOLATED_MANIFEST_VERSIONS as readonly string[]).includes(manifest.manifestVersion)) throw new Error(`manifesto de coleta isolada de versão desconhecida: ${String(manifest.manifestVersion)}`);
  const problems = isolatedManifestProblems(manifest);
  if (problems.length) throw new Error(`manifesto de coleta isolada inválido: ${problems.join("; ")}`);
  return { manifest, sha256: sha256(bytes), bytes: bytes.length };
}

/**
 * Lê o manifesto de coleta que a linha de base recebe, nos dois formatos: o da v02 (exige o gabarito
 * arquivado pela bateria) e o isolado (a referência está no checkout do govbr-eval, no mesmo commit,
 * e a linha de base mede o hash dela). Devolve só o que a linha de base usa.
 */
export function lerManifestoDeColeta(path: string): { versao: string; identity: ExecutableIdentity; referencePath: string; sha256: string } {
  const head = JSON.parse(readFileSync(path, "utf8")) as { manifestVersion?: string };
  if ((ISOLATED_MANIFEST_VERSIONS as readonly string[]).includes(String(head.manifestVersion))) {
    const { manifest, sha256: sha } = readIsolatedManifest(path);
    return { versao: manifest.manifestVersion, identity: manifest.identity, referencePath: manifest.reference.path, sha256: sha };
  }
  const { manifest, sha256: sha } = readCollectionManifest(path);
  if (!manifest.archive) throw new Error("O manifesto de coleta não arquivou o gabarito.");
  return { versao: COLLECTION_MANIFEST_VERSION, identity: manifest.identity, referencePath: manifest.archive.reference.path, sha256: sha };
}

export { compareIdentities };

// ───────────────────────────────────────────────────────────────── CLI

function main(): void {
  const [command, ...args] = process.argv.slice(2);
  const val = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const need = (n: string): string => {
    const v = val(n);
    if (!v || v.startsWith("--")) throw new Error(`falta ${n}`);
    return v;
  };
  if (command === "verify") {
    const { manifest, sha256: sha } = readIsolatedManifest(resolve(need("--manifest")));
    console.log(`manifesto de coleta isolada ok: ${manifest.dispatch.campaignId}/${manifest.dispatch.slotId} ${manifest.dispatch.screenId}/${manifest.dispatch.arm} sha256=${sha}`);
    return;
  }
  if (command !== "build") throw new Error("uso: manifesto-coleta-isolada.ts build --out ARQ ... | verify --manifest ARQ");
  const out = resolve(need("--out"));
  if (existsSync(out)) throw new Error(`${out} já existe: o manifesto de cada disparo é novo`);
  const gh = process.env.GITHUB_RUN_ID ? {
    repository: process.env.GITHUB_REPOSITORY ?? "?", runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "1", workflowSha: process.env.GITHUB_SHA ?? "?",
  } : null;
  const manifest = buildIsolatedManifest({
    tela: need("--tela"), telasDir: resolve(val("--telas") ?? join(ROOT, "..", "govbr-telas")), validatorDir: resolve(val("--validator") ?? join(ROOT, "..", "govbr-ds-validator")),
    referencePath: val("--referencia"), campanha: need("--campanha"), slot: need("--slot"), par: val("--par") ?? "par-01",
    braco: need("--braco") as "sem" | "com", modo: need("--modo") as "real" | "duble" | "roteirizado",
    modelo: val("--modelo") ?? null, esforco: val("--esforco") ?? null, limiteMin: Number(val("--limite-min") ?? 90),
    tentativa: val("--tentativa") === "auto" ? "auto" : Number(val("--tentativa") ?? 1), repeticao: Number(val("--repeticao") ?? 1), github: gh,
    campanhaPath: val("--campanha-arquivo"), agendaPath: val("--agenda-arquivo"), arquivoIndice: val("--arquivo-indice") ? resolve(val("--arquivo-indice")!) : null,
  });
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  console.log(`manifesto de coleta isolada: ${out}`);
  console.log(`  site ${manifest.identity.siteManifestSha256!.slice(0, 12)} · referência ${manifest.identity.referenceSha256!.slice(0, 12)} · plano ${manifest.identity.statePlanSha256!.slice(0, 12)} · oráculo ${manifest.identity.oracleDistSha256!.slice(0, 12)}`);
  console.log(`  campanha ${manifest.campaign!.document.campaignId} (${manifest.campaign!.origin}) sha256=${manifest.campaign!.sha256.slice(0, 12)}`);
  if (manifest.agenda) console.log(`  agenda ${manifest.agenda.sha256.slice(0, 12)} · slot ${manifest.agenda.slot.slotId} (par ${manifest.agenda.slot.pairId}, braço ${manifest.agenda.slot.arm}, repetição ${manifest.agenda.slot.repetition}) · tentativa ${manifest.dispatch.attempt} · extras ${manifest.agenda.attempt.extrasUsadas}/${manifest.agenda.attempt.extrasLimite}`);
  console.log(`MANIFEST_SHA256=${sha256(readFileSync(out))}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
