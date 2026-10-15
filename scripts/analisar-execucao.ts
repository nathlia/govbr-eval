/**
 * T6 — análise determinística de UM pacote de execução ou de UM par sem/com do benchmark isolado.
 *
 * Fronteira de entrada: cada contrato M0 é validado (assertContract, crossCheckRun), o manifesto de
 * artefatos é conferido byte a byte contra a pasta (hash, tamanho, arquivo fora do manifesto, caminho
 * que escapa), a campanha, os snapshots, a referência e o site congelado têm de coincidir por hash, e a
 * linha de base é conferida contra a política (checkPlannedAbsence; falha/incompatibilidade nunca vira
 * ausência planejada). Um par passa por checkAggregation.
 *
 * Depois, um ADAPTADOR converte os pacotes novos na entrada que o scorer existente já entende
 * (findings.v1 → FlowAgentResults/achado-2; FlowBaselines → execuções de linha de base) e chama as
 * funções de scripts/semantic-flow.ts sem mudar nada nelas: prepareSemanticPackage, scopeReviews,
 * scoreSemanticPackage, reviewQueue, renderReview. A captura da página congelada usa os dois ramos de
 * `semantic-flow-cli.ts prepare` — sem navegação (uma cena por janela) e com navegação (D-60, uma cena
 * por segmento) —, importados de scripts/preparo-cenas.ts (NAT-51: cópia texto a texto com guarda de
 * deriva, porque mexer no CLI mudaria o hash do scorer e, por ele, os ids de cartão das campanhas
 * congeladas).
 *
 * Saídas: analysis-binding.<braço>.json (contrato v1), summary.json, summary.md (PT-BR), pacote de
 * revisão em revisao/, score.json e cópias das entradas pequenas em entradas/. O pacote bruto nunca é
 * alterado; a pasta de saída é sempre nova; correção = nova revisão ligada à anterior (--anterior).
 *
 * Método: docs/analise-execucao.md.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import {
  assertContract, checkAggregation, checkPlannedAbsence, crossCheckManifest, crossCheckRun, validateContract,
  type AnalysisBinding, type AnalysisMetrics, type AnyArtifactManifest, type AnyFindings, type ArtifactManifest, type Baseline, type BaselineBinding, type Campaign,
  type Isolation, type Location, type Run, type ContractName, type ScoreStatus, type SnapshotManifest,
} from "../contracts/index";
import { auditarInspecao } from "./inspection-audit";
import { resumirInspecao, type ResumoInspecao } from "./inspection-ledger";
import { verifyToolPayloads } from "./tool-payloads";
import type { FlowAgentResults, FlowGroundTruth, RunConfig } from "../types";
import { ROOT } from "./adjudication";
import { analysisIdentity, cenasDoPlano, compareIdentities, statePlanOf, statePlanSha256 } from "./collection-manifest";
import type { EvidenceIndex } from "./flow-contract";
import { FLOW_INSTRUMENT_VERSION, FLOW_SCORING_VERSION } from "./instrument";
import { divergenciasDaCampanha, identidadeDoRun } from "./identidade-campanha";
import {
  FUSO_DA_CAPTURA, REGRA_IDS_GERADOS, REGRA_RELOGIO, mapearDecisoes, navegadorComRelogio, normalizarIdsGerados, presenteNoSite,
  type IdGerado, type MapaCartoes, type RelogioDaCaptura,
} from "./identidade-cartoes";
import { createSiteServer, loadSite, type LoadedSite } from "./measurement-surface";
import { baselineRuns, prepararCenas, type CenaPreparada } from "./preparo-cenas";
import { READABLE_BASELINE_VERSIONS, type FlowBaselines } from "./run-baselines-flow";
import { renderReview } from "./semantic-flow-render";
import {
  digest, historicalPending, normalizeReviews, prepareSemanticPackage, reviewEffort, reviewQueue, scopeReviews,
  scoreSemanticPackage, armLeaks, type PrepareRun, type RawReviews, type ReviewEffort, type ReviewQueue,
  type SemanticPackage, type SemanticReviews, type SemanticRunScore, type BaselineComparison,
} from "./semantic-flow";
import { selectorsOfGroundTruth, selectorsOfRuns, statesOfGroundTruth } from "./units-flow";

export const RESUMO_VERSAO = "resumo-analise-1.0.0";
/**
 * 1.1.0: o `sceneHash` é calculado sobre o HTML com os ids gerados em tempo de execução normalizados
 * (identidade-cartoes.ts) e decisões de outro pacote são transpostas por corpo idêntico
 * (`revisao/mapa-cartoes.json`). Pontuação e conteúdo dos cartões não mudam.
 * 1.2.0 (NAT-67): a captura roda com fuso fixo e o relógio da página instalado no `createdAt` do conjunto
 * de snapshots (o calendário da tela A marca "hoje"; recapturar noutro dia mudava o `sceneHash` e o
 * cartão de `.flatpickr-day.today`), e um id só conta como presente no site como token inteiro.
 */
export const ADAPTADOR_VERSAO = "adaptador-benchmark-1.2.0";

type Arm = "sem" | "com";
const sha = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");
const json = (value: unknown): string => JSON.stringify(value, null, 2) + "\n";
const posix = (p: string): string => p.split(sep).join("/");

/** Recusa na fronteira: nenhum número sai de um pacote ou entrada que não passou na conferência. */
export class RecusaDeEntrada extends Error {}
const recusar = (msg: string): never => { throw new RecusaDeEntrada(msg); };

// ───────────────────────────────────────────────────────────────── opções e resultado

export interface OpcoesAnalise {
  /** Um pacote só, ou o par. */
  pacote?: string;
  sem?: string;
  com?: string;
  campanha: string;
  snapshots: string;
  referencia: string;
  /** Pasta do site congelado (site-manifest.json + site/). */
  site: string;
  linhaDeBase?: string;
  /** Usar a ausência planejada que a campanha declara para a tela (nunca inventada aqui). */
  semLinhaDeBase?: boolean;
  tipo?: "individual" | "composta";
  manifestoAnalise?: string;
  bateriaDesignada?: string;
  justificativa?: string;
  /** Raiz local do repositório de arquivo, para locais `archive-repo`. */
  arquivo?: string;
  decisoes?: string;
  /**
   * `package.json` do pacote contra o qual `decisoes` foi gravado. Decisões com id de outro pacote só
   * são transpostas (corpo idêntico, `revisao/mapa-cartoes.json`) contra ele. Padrão: o da `--anterior`.
   */
  pacoteDecisoes?: string;
  anterior?: string;
  orcamentoRevisao?: string;
  /** Também grava review-completo.md (sem cegueira). O padrão é só a renderização cega. */
  revisaoCompleta?: boolean;
  saida: string;
}

export type EstadoAnalise = "pronta" | "bloqueada" | "recusada";
export interface ResultadoAnalise { estado: EstadoAnalise; motivo: string | null; saida: string; resumo: Resumo }

// ───────────────────────────────────────────────────────────────── leitura do pacote

interface PacoteLido {
  dir: string;
  manifest: AnyArtifactManifest;
  manifestBytes: Buffer;
  run: Run;
  runBytes: Buffer;
  findings: AnyFindings | null;
  isolation: Isolation | null;
  toolEvents: string | null;
  /** Texto integral conferido de cada payload que a ponte gravou (NAT-82), por caminho no pacote. */
  toolPayloads: Map<string, string>;
}

function listarArquivos(root: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) recusar(`link simbólico no pacote não é aceito: ${rel}`);
    if (entry.isDirectory()) out.push(...listarArquivos(root, rel));
    else out.push(rel);
  }
  return out;
}

function lerJson<T>(path: string, rotulo: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, "")) as T;
  } catch (e) {
    return recusar(`${rotulo} ilegível (${path}): ${e instanceof Error ? e.message : String(e)}`);
  }
}
function contrato(doc: unknown, nome: ContractName, rotulo: string): unknown {
  try {
    return assertContract(doc, nome as never);
  } catch (e) {
    return recusar(`${rotulo}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Confere o pacote inteiro contra o seu manifesto e os contratos. Nada é lido fora do manifesto. */
export function lerPacote(dirArg: string): PacoteLido {
  const dir = resolve(dirArg);
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) recusar(`pacote ausente: ${dirArg}`);
  const manifestPath = join(dir, "artifact-manifest.json");
  if (!existsSync(manifestPath)) recusar(`pacote sem artifact-manifest.json: ${dirArg}`);
  const manifestBytes = readFileSync(manifestPath);
  // NAT-81: v1 (histórico, e todo pacote sem findings.v2) ou v2; o discriminador decide, nunca o conteúdo.
  const manifestDoc = lerJson<unknown>(manifestPath, "artifact-manifest.json");
  const manifestNome = (manifestDoc as { contract?: unknown })?.contract === "artifact-manifest.v2" ? "artifact-manifest.v2" : "artifact-manifest.v1";
  const manifest = contrato(manifestDoc, manifestNome, `artifact-manifest.json de ${dirArg}`) as AnyArtifactManifest;

  const declarados = new Map(manifest.files.map(f => [f.path, f]));
  for (const rel of listarArquivos(dir)) {
    if (rel === "artifact-manifest.json") continue;
    if (!declarados.has(rel)) recusar(`arquivo fora do manifesto em ${dirArg}: ${rel}`);
  }
  const bytesDe = new Map<string, Buffer>();
  for (const f of manifest.files) {
    const alvo = resolve(dir, f.path);
    const rel = relative(dir, alvo);
    if (rel.startsWith("..") || isAbsolute(rel)) recusar(`caminho escapa do pacote: ${f.path}`);
    if (!existsSync(alvo)) recusar(`arquivo do manifesto ausente: ${f.path}`);
    const st = lstatSync(alvo);
    if (st.isSymbolicLink() || !st.isFile()) recusar(`não é arquivo comum: ${f.path}`);
    const body = readFileSync(alvo);
    if (body.length !== f.bytes || sha(body) !== f.sha256) recusar(`hash ou tamanho diverge do manifesto: ${f.path}`);
    bytesDe.set(f.path, body);
  }
  const doPapel = (role: ArtifactManifest["files"][number]["role"]) => manifest.files.filter(f => f.role === role);
  const runs = doPapel("run");
  if (runs.length !== 1) recusar(`o manifesto precisa de exatamente um arquivo com papel run (${runs.length})`);
  const parse = (path: string, rotulo: string): unknown => {
    try { return JSON.parse(bytesDe.get(path)!.toString("utf8").replace(/^﻿/, "")); } catch (e) {
      return recusar(`${rotulo} ilegível: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const runBytes = bytesDe.get(runs[0].path)!;
  const run = contrato(parse(runs[0].path, "run.json"), "run.v1", `run.json de ${dirArg}`) as Run;
  if (run.artifactManifest !== "artifact-manifest.json") recusar(`run.json aponta outro manifesto (${run.artifactManifest})`);
  if (manifest.runId !== run.runId || manifest.campaignId !== run.campaignId) recusar("artifact-manifest.json pertence a outro run");

  const exigirPapel = (path: string | null, role: string, oque: string) => {
    if (path === null) return;
    const f = declarados.get(path);
    if (!f) recusar(`${oque} (${path}) não está no manifesto`);
    if (f!.role !== role) recusar(`${oque} (${path}) está no manifesto com papel ${f!.role}, esperado ${role}`);
  };
  exigirPapel(run.submission.findings, "findings", "findings do run");
  exigirPapel(run.isolation, "isolation", "isolation do run");
  exigirPapel(run.submission.refusal?.archivedBody ?? null, "refusal", "corpo recusado");
  if (run.model.resolvedEvidence && !declarados.has(run.model.resolvedEvidence)) recusar("evidência do modelo resolvido fora do manifesto");

  const findingsFiles = doPapel("findings");
  if (findingsFiles.length > 1) recusar("mais de um findings no manifesto");
  const findings = findingsFiles.length
    ? contrato(parse(findingsFiles[0].path, "findings.json"), manifest.schemaVersions.findings ?? "findings.v1", `findings.json de ${dirArg}`) as AnyFindings : null;
  const doManifesto = crossCheckManifest(manifest, findings);
  if (doManifesto.length) recusar(`artifact-manifest × findings: ${doManifesto.map(e => `${e.path} ${e.keyword}: ${e.message}`).join("; ")}`);
  const isolation = run.isolation
    ? contrato(parse(run.isolation, "isolation.json"), "isolation.v1", `isolation.json de ${dirArg}`) as Isolation : null;
  const cruzados = crossCheckRun(run, findings, isolation);
  if (cruzados.length) recusar(`run × findings × isolation: ${cruzados.map(e => `${e.path} ${e.keyword}: ${e.message}`).join("; ")}`);
  for (const d of [manifest, findings, isolation]) if (d && d.fixture !== run.fixture) recusar("fixture misturada com dado real dentro do mesmo pacote");
  const te = doPapel("tool-events")[0];
  const toolEvents = te ? bytesDe.get(te.path)!.toString("utf8") : null;
  // NAT-82: payload integral citado por evento, conferido contra o arquivo, o manifesto e o hash da chamada.
  // Pacote anterior (eventos sem `payload`) passa sem nada a conferir; nada é reconstruído.
  let toolPayloads: Map<string, string>;
  try {
    toolPayloads = verifyToolPayloads(toolEvents, path => bytesDe.get(path) ?? null, manifest.files, manifest.contract === "artifact-manifest.v2").texts;
  } catch (e) {
    return recusar(`payloads da ponte em ${dirArg}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { dir, manifest, manifestBytes, run, runBytes, findings, isolation, toolEvents, toolPayloads };
}

// ───────────────────────────────────────────────────────────────── adaptador: pacote novo → scorer existente

/**
 * findings.v1 → FlowAgentResults que o scorer já pontua (achado-2, sem mudança de unidade). A
 * identidade vem do run.json do controlador; o que o agente declara sobre si (report.model) só
 * aparece como `agentReportedModel` quando diverge. A evidência é o conjunto de arquivos `evidence`
 * do manifesto, já conferidos por hash na leitura do pacote.
 */
export function adaptarExecucao(p: PacoteLido): PrepareRun {
  const { run, findings, manifest } = p;
  if (!findings) throw new Error(`adaptarExecucao: ${run.runId} não tem submissão aceita`);
  const manifestSha = sha(p.manifestBytes);
  const evidence: EvidenceIndex = {
    dir: `pacote:${run.runId}`,
    files: manifest.files.filter(f => f.role === "evidence").map(f => ({ path: f.path, bytes: f.bytes, sha256: f.sha256 }))
      .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
    integrity: { indexSha256: manifestSha },
  };
  // O registro de inspeção (findings.v2) NÃO vai ao scorer: só os campos de sempre, achado-2 inalterado.
  const r = findings.report;
  const config: RunConfig & { evidenceIndexSha256: string } = {
    client: run.client.name, clientVersion: run.client.version, reasoningEffort: run.effort,
    oracleProfile: run.intervention.oracle?.profile ?? "none",
    ...(r.model !== run.model.requested ? { agentReportedModel: r.model } : {}),
    ...(run.model.resolved !== "unknown" ? { modelVersion: run.model.resolved } : {}),
    protocolVersion: run.versions.protocolSha256,
    instrumentVersion: FLOW_INSTRUMENT_VERSION,
    siteManifestSha256: run.versions.siteManifestSha256,
    evidenceIndexSha256: manifestSha,
  };
  const data = {
    timestamp: r.timestamp, model: run.model.requested, appUrl: r.appUrl,
    ...(r.scope ? { scope: r.scope } : {}), ...(r.notes !== undefined ? { notes: r.notes } : {}),
    findings: r.findings as FlowAgentResults["findings"], config,
  } as FlowAgentResults;
  return { id: run.runId, data, evidence, kind: "agente" };
}


interface PacotePreparado {
  pkg: SemanticPackage; reviews: SemanticReviews; result: ReturnType<typeof scoreSemanticPackage>; fila: ReviewQueue;
  esforco: ReviewEffort; scenes: CenaPreparada[]; url: string; sceneHash: string;
  idsGerados: IdGerado[][]; mapa: MapaCartoes | null; relogio: RelogioDaCaptura;
}

/**
 * Captura da página congelada e montagem do pacote, com os ramos de `semantic-flow-cli.ts prepare`
 * (preparo-cenas.ts): sem navegação, uma página nova por janela planejada, levada ao estado da
 * referência; com navegação (D-60), uma página por janela varrendo as paradas, e uma cena por segmento
 * capturada na última parada dele. Seletores, unidades e capturas de uma cena vêm da mesma página.
 */
async function prepararPacote(a: {
  gt: FlowGroundTruth; site: LoadedSite; agentes: PrepareRun[]; baseline: FlowBaselines | null; provenance: unknown;
  anterior?: SemanticReviews; orcamento?: string;
  /** Fuso e instante em que o relógio da página começa em toda captura (NAT-67; identidade-cartoes.ts). */
  relogio: RelogioDaCaptura;
  /** Pacote contra o qual `anterior` foi gravado (para transpor decisões por corpo idêntico) e de onde veio. */
  pacoteAnterior?: { pkg: SemanticPackage | null; origem: string };
}): Promise<PacotePreparado> {
  const { gt } = a;
  const plan = statePlanOf(gt);
  const cenas = cenasDoPlano(gt, plan);
  const server = createSiteServer(a.site);
  // O launch fica DENTRO do try: se o navegador não abre, o finally ainda fecha o servidor do site
  // congelado (antes ele ficava aberto e segurava o processo — T6).
  let browser: Browser | undefined;
  try {
    await new Promise<void>((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", () => ok()); });
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    browser = await chromium.launch();
    const url = new URL(gt._meta.url, origin).toString();
    const allRuns: PrepareRun[] = [...a.agentes];
    if (a.baseline) allRuns.push(...baselineRuns(a.baseline, a.site.manifestSha256, [`setup do plano de estados (${plan.setup.length} passo(s))`]));
    const baselineSelectors = a.baseline ? a.baseline.passes.flatMap(p => [...p.validator.unguided.findings, ...p.axe.findings].map(f => f.target)) : [];
    const selectors = [...selectorsOfGroundTruth(gt), ...selectorsOfRuns(a.agentes.map(r => r.data)), ...baselineSelectors];
    const claimSelectors = [...selectorsOfRuns(a.agentes.map(r => r.data)), ...baselineSelectors];
    // Os dois ramos (sem navegação; cenas por segmento, D-60) são os de semantic-flow-cli.ts prepare,
    // importados de preparo-cenas.ts (cópia com guarda de deriva; ver o cabeçalho de lá — NAT-51).
    // Todo contexto que o preparo abre (inclusive a entrada direta do D-60) nasce com o fuso e o relógio
    // declarados: "hoje" na página não depende do dia do recálculo (NAT-67).
    const { scenes, units } = await prepararCenas({ browser: navegadorComRelogio(browser, a.relogio), gt, url, cenas, selectors, claimSelectors });
    // Ids sorteados em tempo de execução (br-select do DS: list-4946 → list-3370) não entram no hash:
    // sem isso cada recálculo muda todos os ids de cartão (identidade-cartoes.ts).
    const noSite = presenteNoSite(a.site.files.values());
    const normalizadas = scenes.map(s => normalizarIdsGerados(s.html, noSite));
    // Como no CLI: o segmento entra no hash só quando existe (sem navegação, o hash não muda).
    const sceneHash = digest({ setup: gt._meta.setup ?? [], scenes: scenes.map((s, i) => ({
      ...(s.segmento ? { segmento: s.segmento } : {}),
      id: s.id, viewport: s.viewport, html: normalizadas[i].html, image: s.image.toString("base64") })) });
    const scorerHash = analysisIdentity().scorerSha256;
    const montar = (carriedOverPending: string[]): SemanticPackage => prepareSemanticPackage(
      { referenceHash: digest(gt), sceneHash, scorerHash }, units, scenes, allRuns,
      { provenance: a.provenance, stateOrder: statesOfGroundTruth(gt)?.map(s => s.id) ?? [], carriedOverPending, reviewBudget: a.orcamento });
    const inicial = montar([]);
    // Decisão gravada com o id de outro pacote: transposta só se o cartão é o mesmo em tudo menos o id.
    const transposto = a.anterior
      ? mapearDecisoes(a.anterior, inicial, a.pacoteAnterior?.pkg ?? null, a.pacoteAnterior?.origem ?? "sem pacote de origem informado")
      : { reviews: undefined, mapa: null };
    const pkg = montar(historicalPending(inicial, transposto.reviews));
    const reviews = scopeReviews(pkg, transposto.reviews);
    const result = scoreSemanticPackage(pkg, reviews);
    return { pkg, reviews, result, fila: reviewQueue(pkg, reviews), esforco: reviewEffort(pkg), scenes, url, sceneHash,
      idsGerados: normalizadas.map(n => n.ids), mapa: transposto.mapa, relogio: a.relogio };
  } finally {
    try { await browser?.close(); } finally {
      await new Promise<void>(done => {
        server.closeAllConnections();
        if (server.listening) server.close(() => done()); else done();
      });
    }
  }
}

// ───────────────────────────────────────────────────────────────── linha de base

interface LinhaDeBaseAvaliada {
  binding: BaselineBinding;
  bruto: FlowBaselines | null;
  registroBytes: Buffer | null;
  brutoBytes: Buffer | null;
  registro: Baseline | null;
}

function resolverLocal(loc: Location, baseDir: string, arquivo: string | undefined): string | null {
  if (loc.kind === "package-path") return resolve(baseDir, loc.path);
  if (loc.kind === "archive-repo") return arquivo ? resolve(arquivo, loc.path) : null;
  return null;
}

function bloqueio(cause: "baseline-failed" | "missing-unplanned" | "incompatible", detail: string, extra: Partial<LinhaDeBaseAvaliada> = {}): LinhaDeBaseAvaliada {
  return { binding: { mode: "blocked", cause, detail }, bruto: null, registroBytes: null, brutoBytes: null, registro: null, ...extra };
}

function avaliarLinhaDeBase(o: OpcoesAnalise, ctx: {
  campaign: Campaign; campaignSha: string; tipo: "individual" | "composta"; screenId: string; screenVersion: string;
  collectionStartedAt: string; referenceSha: string; siteSha: string; planSha: string; cenas: string[]; snapshots: SnapshotManifest;
}): LinhaDeBaseAvaliada {
  if (o.semLinhaDeBase) {
    const declarada = ctx.campaign.baselinePolicy.plannedAbsences.find(a => a.screenId === ctx.screenId);
    if (!declarada) return bloqueio("missing-unplanned", `a campanha ${ctx.campaign.campaignId} não declara ausência de linha de base para ${ctx.screenId}; sem linha de base, a análise fica bloqueada`);
    if (ctx.tipo === "composta") return bloqueio("missing-unplanned", "a análise composta exige linha de base completa e compatível; a ausência planejada só vale no caminho individual");
    if (!(Date.parse(declarada.declaredAt) < Date.parse(ctx.collectionStartedAt))) {
      return bloqueio("missing-unplanned", `a ausência foi declarada em ${declarada.declaredAt}, depois do início da coleta (${ctx.collectionStartedAt}); isso é falta, não ausência planejada`);
    }
    return { binding: { mode: "planned-absence", justification: declarada.justification, declaredAt: declarada.declaredAt,
      declaredIn: { campaignId: ctx.campaign.campaignId, campaignSha256: ctx.campaignSha } }, bruto: null, registroBytes: null, brutoBytes: null, registro: null };
  }
  const recordPath = resolve(o.linhaDeBase!);
  if (!existsSync(recordPath)) return bloqueio("missing-unplanned", `registro de linha de base ausente: ${o.linhaDeBase}`);
  const registroBytes = readFileSync(recordPath);
  let doc: unknown;
  try { doc = JSON.parse(registroBytes.toString("utf8")); } catch { return bloqueio("incompatible", "registro de linha de base ilegível (JSON inválido)", { registroBytes }); }
  const v = validateContract(doc);
  if (v.contract !== "baseline.v1" || !v.valid) {
    return bloqueio("incompatible", `registro de linha de base fora do contrato baseline.v1: ${v.errors.map(e => `${e.path || "/"} ${e.keyword}: ${e.message}`).join("; ")}`, { registroBytes });
  }
  const registro = doc as Baseline;
  const keep = { registroBytes, registro };
  if (registro.status === "failed") return bloqueio("baseline-failed", `a linha de base ${registro.baselineId} falhou: ${registro.error}. O bruto parcial continua arquivado; refazer a linha de base gera novo registro, sem repetir o agente.`, keep);
  const rawPath = resolverLocal(registro.raw.location, dirname(recordPath), o.arquivo);
  if (!rawPath) return bloqueio("incompatible", `o bruto da linha de base está em ${registro.raw.location.kind}, que não é recuperável nesta máquina (passe --arquivo para archive-repo)`, keep);
  if (!existsSync(rawPath)) return bloqueio("incompatible", `bruto da linha de base ausente: ${posix(relative(process.cwd(), rawPath))}`, keep);
  const brutoBytes = readFileSync(rawPath);
  if (brutoBytes.length !== registro.raw.bytes || sha(brutoBytes) !== registro.raw.sha256) return bloqueio("incompatible", "o bruto da linha de base não coincide com o hash/tamanho do registro", keep);
  let bruto: FlowBaselines;
  try { bruto = JSON.parse(brutoBytes.toString("utf8")) as FlowBaselines; } catch { return bloqueio("incompatible", "bruto da linha de base ilegível", keep); }
  const keep2 = { ...keep, brutoBytes };
  const problemas: string[] = [];
  if (!READABLE_BASELINE_VERSIONS.includes(String(bruto.baselineVersion))) problemas.push(`versão ${String(bruto.baselineVersion)} não é legível (${READABLE_BASELINE_VERSIONS.join(", ")})`);
  if (bruto.status !== "complete") return bloqueio("baseline-failed", `o bruto da linha de base não completou: ${bruto.error ?? "motivo não registrado"}`, keep2);
  if (bruto.scope !== "bateria") problemas.push("linha de base dev-global nunca é confrontável com uma coleta");
  if (bruto.baselineVersion !== registro.producer.baselineVersion) problemas.push("versão do bruto difere da do registro");
  if (registro.campaignId !== ctx.campaign.campaignId) problemas.push(`registro é da campanha ${registro.campaignId}`);
  if (registro.screen.id !== ctx.screenId || registro.screen.version !== ctx.screenVersion) problemas.push(`registro é da tela ${registro.screen.id}@${registro.screen.version}`);
  if (bruto.provenance.collectionManifest?.sha256 !== registro.links.collectionManifest.sha256) problemas.push("o bruto aponta outro manifesto de coleta que o registro");
  problemas.push(...compareIdentities(registro.identity, bruto.provenance.identity, { expected: "registro", actual: "bruto" }));
  const esperado = { collection: FLOW_INSTRUMENT_VERSION, referenceSha256: ctx.referenceSha, siteManifestSha256: ctx.siteSha,
    oracleDistSha256: ctx.campaign.fixed.oracle.distSha256, oracleDataSha256: ctx.campaign.fixed.oracle.dataSha256, statePlanSha256: ctx.planSha };
  problemas.push(...compareIdentities(esperado, registro.identity, { expected: "coleta", actual: "linha de base" }));
  for (const [link, kind] of [["site", "site"], ["reference", "reference"], ["statePlan", "state-plan"]] as const) {
    const l = registro.links[link];
    const item = ctx.snapshots.items.find(i => i.id === l.itemId);
    if (l.snapshotSetId !== ctx.snapshots.snapshotSetId || !item || item.kind !== kind) problemas.push(`vínculo ${link} aponta fora do conjunto de snapshots ${ctx.snapshots.snapshotSetId}`);
  }
  if (JSON.stringify(bruto.passes.map(p => p.id)) !== JSON.stringify(ctx.cenas)) problemas.push(`passadas ${bruto.passes.map(p => p.id).join(",")} diferem das cenas do plano ${ctx.cenas.join(",")}`);
  if (problemas.length) return bloqueio("incompatible", `linha de base incompatível com a coleta: ${problemas.join("; ")}`, keep2);
  const composta = ctx.tipo === "composta";
  return { binding: { mode: "used", baselineId: registro.baselineId,
    record: { sha256: sha(registroBytes), bytes: registroBytes.length, location: { kind: "package-path", path: "entradas/linha-de-base-registro.json" } },
    designatedBattery: composta ? o.bateriaDesignada! : null, choiceJustification: composta ? o.justificativa! : null },
  bruto, registroBytes, brutoBytes, registro };
}

// ───────────────────────────────────────────────────────────────── resumo

/** Unidades de uma camada da referência, pelo prefixo do id da spec. `recall` só com o recall total disponível (revisão fechada). */
export interface CamadaResumo { prefixo: "A-" | "P-"; confirmadas: number | null; total: number | null; recall: number | null }
export const PREFIXO_PAGINA = "P-", PREFIXO_SORTEADAS = "A-";
export const temCamadaPagina = (gt: { violations: { id: string }[] }): boolean => gt.violations.some(v => v.id.startsWith(PREFIXO_PAGINA));

function camadasDe(s: SemanticRunScore | null, recallDisponivel: boolean): NonNullable<ExecucaoResumo["pontuacao"]["camadas"]> {
  const camada = (prefixo: "A-" | "P-"): CamadaResumo => {
    if (!s) return { prefixo, confirmadas: null, total: null, recall: null };
    const fs = s.families.filter(f => f.specId.startsWith(prefixo));
    const confirmadas = fs.reduce((n, f) => n + f.detected, 0), total = fs.reduce((n, f) => n + f.total, 0);
    return { prefixo, confirmadas, total, recall: recallDisponivel && total ? confirmadas / total : null };
  };
  return { sorteadas: camada(PREFIXO_SORTEADAS), pagina: camada(PREFIXO_PAGINA) };
}

export interface MetricaResumo { valor: number | null; estado: "medido" | "indisponivel" | "nao-se-aplica"; fonte: string | null }
export interface ExecucaoResumo {
  runId: string; braco: Arm;
  tecnico: { status: Run["status"]["technical"]; ciclo: Run["lifecycle"]["state"]; etapa: Run["lifecycle"]["stage"];
    falha: Run["failure"]; submissao: Run["submission"]["status"]; motivoRecusa: string | null };
  identidade: { tela: Run["screen"]; modelo: { familia: string; pedido: string; resolvido: string; fonte: string }; esforco: string;
    cliente: string; inicioUtc: string | null; inicioLocal: string | null; commit: string; repeticao: number; tentativa: number;
    campanha: string; slot: string; par: string; fixture: boolean };
  pontuacao: { estado: ScoreStatus; motivo: string | null; metricas: AnalysisMetrics;
    detalhe: { cartoes: number; afirmacoesPendentes: number; duplicadas: number; redundantes: number;
      precisaoAfirmacoes: number | null; recallConfirmadoAteAgora: number | null; citacaoSustentada: number | null } | null;
    linhaDeBase: BaselineComparison["counts"] & { estado: BaselineComparison["status"] } | null;
    /**
     * Só quando a referência tem specs `P-*` (camada de página, D-83): unidades sorteadas (`A-*`) e de página (`P-*`)
     * contadas à parte, das famílias do score.json. Ausente nas referências sem camada de página (1.0.0 inalterada).
     */
    camadas?: { sorteadas: CamadaResumo; pagina: CamadaResumo } };
  mcpIsolamento: { isolamento: Run["status"]["isolation"]; protocolo: Run["status"]["protocol"]; usoOraculo: Run["status"]["oracleUsage"];
    oraculoAnunciado: boolean | null; oraculo: Run["intervention"]["oracle"]; chamadasOraculo: MetricaResumo;
    ferramentasAnunciadas: string[] | null; ferramentasObservadas: string[] | null; errosDeFerramenta: MetricaResumo;
    checks: { aprovados: number; falhos: string[]; naoExercitados: string[] } | null; controlesPositivos: { aprovados: number; falhos: string[] } | null;
    limitacoes: string[] };
  custoTempo: Record<keyof Run["usage"], MetricaResumo>;
  achados: { total: number; itens: { seletor: string; regra: string | null; observado: string }[] } | null;
  /**
   * NAT-63 (R2): entra na comparação principal? Sem ela, a pontuação acima é só diagnóstico.
   * Ausente em resumos gerados antes desta regra.
   */
  elegibilidade?: { elegivel: boolean; motivos: string[] };
  /**
   * NAT-81: registro de inspeção (scripts/inspection-ledger.ts). Declaração do agente × comprovação por
   * evento; não pontua. Pacote findings.v1 → `indisponivel` ("registro indisponível", nunca zero cobertura).
   * Ausente em resumos gerados antes do NAT-81.
   */
  inspecao?: ResumoInspecao;
  links: Record<string, string | string[] | null>;
  binding: string;
}
export interface ComparacaoResumo {
  disponivel: boolean; motivo: string | null; estado: "final" | "provisoria" | null;
  /** NAT-63: false = par inelegível (comparação indisponível, não conta). Ausente em resumos anteriores. */
  elegivel?: boolean;
  diferencaUnidadesConfirmadas: number | null; diferencaRecall: number | null;
  unidades: { soCom: UnidadeResumo[]; soSem: UnidadeResumo[]; ambos: UnidadeResumo[]; nenhum: UnidadeResumo[] } | null;
  nota: string;
}
export interface UnidadeResumo { unitId: string; specId: string; elemento: string }
export interface Resumo {
  formato: typeof RESUMO_VERSAO;
  fixture: boolean | null;
  geradoEm: string;
  revisao: { numero: number; anterior: { caminho: string; conteudoCientificoSha256: string; summarySha256: string } | null };
  analise: { estado: EstadoAnalise; motivo: string | null; tipo: "individual" | "composta" | null; avisos: string[] };
  linhaDeBase: { modo: BaselineBinding["mode"]; causa: string | null; detalhe: string | null; baselineId: string | null } | null;
  execucoes: ExecucaoResumo[];
  comparacao: ComparacaoResumo | null;
  revisaoSemantica: { cartoes: number; pendentes: number; vazamentosDeBraco: number; esforco: ReviewEffort } | null;
  versoes: { scorer: AnalysisBinding["scorer"]; referencia: AnalysisBinding["reference"]; adaptador: string } | null;
  hashes: { conteudoCientificoSha256: string; pacoteRevisao: string | null; decisoes: string | null; entradas: Record<string, string> };
  arquivos: Record<string, string | null | Record<string, string>>;
}

const LOCAL = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });
const localDe = (iso: string | null): string | null => iso ? `${LOCAL.format(new Date(iso))} (horário de Brasília)` : null;
function metrica(m: Run["usage"][keyof Run["usage"]]): MetricaResumo {
  return m.status === "measured" ? { valor: m.value, estado: "medido", fonte: m.source }
    : { valor: null, estado: m.status === "unavailable" ? "indisponivel" : "nao-se-aplica", fonte: m.source ?? null };
}
function errosDeFerramenta(text: string | null): MetricaResumo {
  if (text === null) return { valor: null, estado: "indisponivel", fonte: "sem tool-events no pacote" };
  let n = 0;
  for (const line of text.split(/\r?\n/).filter(l => l.trim())) {
    try {
      const ev = JSON.parse(line) as { isError?: unknown };
      if (ev && typeof ev === "object" && ev.isError === true) n++;
    } catch {
      return { valor: null, estado: "indisponivel", fonte: "tool-events.ndjson em formato não reconhecido" };
    }
  }
  return { valor: n, estado: "medido", fonte: "tool-events.ndjson (eventos com isError: true)" };
}

const METRICAS_NULAS: AnalysisMetrics = { referenceUnits: null, confirmedReferenceUnits: null, recall: null, precision: null,
  incorrectClaims: null, newCorrect: null, pending: null };

/** final = revisão fechada (contrato do scorer); pending-review = nenhum cartão decidido; senão provisória. */
function estadoDaPontuacao(score: SemanticRunScore, cardIds: string[], reviews: SemanticReviews): ScoreStatus {
  if (score.status === "complete") return "final";
  const decididos = cardIds.filter(id => reviews.decisions.some(d => d.cardId === id && d.status === "reviewed")).length;
  return decididos === 0 ? "pending-review" : "provisional";
}

// ───────────────────────────────────────────────────────────────── orquestração

const ORDEM: Arm[] = ["sem", "com"];

function relDe(saida: string, alvo: string): string { return posix(relative(saida, alvo)) || "."; }

export async function analisar(o: OpcoesAnalise): Promise<ResultadoAnalise> {
  const saida = resolve(o.saida);
  if (existsSync(saida)) throw new Error(`A pasta de saída já existe: ${o.saida}. Cada análise grava numa pasta nova; nada é sobrescrito.`);
  const par = Boolean(o.sem || o.com);
  if (par && o.pacote) throw new Error("Use --pacote OU --sem/--com, não os dois");
  if (par && !(o.sem && o.com)) throw new Error("O par precisa de --sem e --com");
  if (!par && !o.pacote) throw new Error("Falta --pacote (ou --sem e --com)");
  if (Boolean(o.linhaDeBase) === Boolean(o.semLinhaDeBase)) throw new Error("Passe --linha-de-base REGISTRO ou --sem-linha-de-base (ausência planejada na campanha)");
  const tipo = o.tipo ?? "individual";
  if (tipo === "composta" && !(o.manifestoAnalise && o.bateriaDesignada && o.justificativa)) {
    throw new Error("Análise composta exige --manifesto-analise, --bateria-designada e --justificativa");
  }
  const decisoes = o.decisoes ? normalizeReviews(lerJson<RawReviews>(resolve(o.decisoes), "decisões")) : undefined;

  try {
    return await analisarValidado(o, saida, par, tipo, decisoes);
  } catch (e) {
    if (!(e instanceof RecusaDeEntrada)) throw e;
    const resumo = resumoDeRecusa(e.message, o, saida);
    mkdirSync(saida, { recursive: true });
    writeFileSync(join(saida, "summary.json"), json(resumo), { flag: "wx" });
    writeFileSync(join(saida, "summary.md"), renderResumo(resumo), { flag: "wx" });
    return { estado: "recusada", motivo: e.message, saida, resumo };
  }
}

function resumoDeRecusa(motivo: string, o: OpcoesAnalise, saida: string): Resumo {
  const base: Omit<Resumo, "hashes"> = {
    formato: RESUMO_VERSAO, fixture: null, geradoEm: new Date().toISOString(), revisao: { numero: 1, anterior: null },
    analise: { estado: "recusada", motivo, tipo: null, avisos: [] }, linhaDeBase: null, execucoes: [], comparacao: null,
    revisaoSemantica: null, versoes: null,
    arquivos: { pacotes: Object.fromEntries(Object.entries({ pacote: o.pacote, sem: o.sem, com: o.com })
      .filter((e): e is [string, string] => Boolean(e[1])).map(([k, v]) => [k, relDe(saida, resolve(v))])) },
  };
  return { ...base, hashes: { conteudoCientificoSha256: digest({ analise: base.analise }), pacoteRevisao: null, decisoes: null, entradas: {} } };
}

async function analisarValidado(o: OpcoesAnalise, saida: string, par: boolean, tipo: "individual" | "composta",
  decisoes: SemanticReviews | undefined): Promise<ResultadoAnalise> {
  // ── pacotes ───────────────────────────────────────────────────────────────
  const pacotes: PacoteLido[] = par ? [lerPacote(o.sem!), lerPacote(o.com!)] : [lerPacote(o.pacote!)];
  if (par) {
    if (pacotes[0].run.arm !== "sem") recusar(`o pacote passado em --sem é do braço ${pacotes[0].run.arm}`);
    if (pacotes[1].run.arm !== "com") recusar(`o pacote passado em --com é do braço ${pacotes[1].run.arm}`);
    if (pacotes[0].run.runId === pacotes[1].run.runId) recusar("--sem e --com apontam a mesma execução");
  }
  const fixture = pacotes[0].run.fixture;

  // ── campanha ──────────────────────────────────────────────────────────────
  const campaignBytes = readFileSync(resolve(o.campanha));
  const campaign = contrato(lerJson<unknown>(resolve(o.campanha), "campanha"), "campaign.v1", "campanha") as Campaign;
  const campaignSha = sha(campaignBytes);
  if (campaign.fixture !== fixture) recusar("fixture misturada com dado real (campanha × pacote)");
  // A campanha congela a versão do scorer (fixed.scorerVersion). Analisar com outra misturaria versões
  // de pontuação dentro de uma campanha: recusa, sem revisão nova. Campanha que não a declara segue,
  // com aviso (o contrato campaign.v1 a exige; isto só cobre um documento fora dele).
  const scorerCongelado = (campaign.fixed as { scorerVersion?: unknown }).scorerVersion;
  const avisoScorer = typeof scorerCongelado === "string" && scorerCongelado.trim() ? null
    : `a campanha ${campaign.campaignId} não declara fixed.scorerVersion; analisada com o scorer atual ${FLOW_SCORING_VERSION} sem conferência`;
  if (!avisoScorer && scorerCongelado !== FLOW_SCORING_VERSION) {
    recusar(`a campanha ${campaign.campaignId} foi congelada com ${String(scorerCongelado)}; o scorer atual é ${FLOW_SCORING_VERSION} — análise recusada para não misturar versões`);
  }
  for (const { run } of pacotes) {
    if (run.campaignId !== campaign.campaignId) recusar(`${run.runId} é da campanha ${run.campaignId}, não de ${campaign.campaignId}`);
    if (!campaign.design.screens.some(s => s.id === run.screen.id && s.version === run.screen.version)) recusar(`tela ${run.screen.id}@${run.screen.version} fora do desenho da campanha`);
    if (!campaign.design.arms.includes(run.arm)) recusar(`braço ${run.arm} fora do desenho da campanha`);
    if (!campaign.design.models.some(m => m.requested === run.model.requested)) recusar(`modelo ${run.model.requested} fora do desenho da campanha`);
    if (run.fixture !== fixture) recusar("fixture misturada com dado real entre os pacotes");
    // NAT-63 (R1): a identidade REGISTRADA no run.json contra a campanha congelada — esforço, limites,
    // cliente, protocolo, tentativa e repetição. checkAggregation só compara os braços entre si: dois
    // braços que divergem igualmente da campanha passariam lá.
    const divergencias = divergenciasDaCampanha(campaign, identidadeDoRun(run));
    if (divergencias.length) recusar(`${run.runId} não tem a identidade congelada na campanha ${campaign.campaignId}: ${divergencias.join("; ")}`);
  }
  if (par && pacotes[0].run.screen.id !== pacotes[1].run.screen.id) recusar("o par mistura telas; telas diferentes nunca formam par");

  // ── snapshots, referência, site ──────────────────────────────────────────
  const snapshotsBytes = readFileSync(resolve(o.snapshots));
  const snapshots = contrato(lerJson<unknown>(resolve(o.snapshots), "snapshots"), "snapshot-manifest.v1", "snapshot-manifest") as SnapshotManifest;
  if (snapshots.fixture !== fixture) recusar("fixture misturada com dado real (snapshots × pacote)");
  const itemDe = (kind: SnapshotManifest["items"][number]["kind"]) => {
    const items = snapshots.items.filter(i => i.kind === kind);
    if (items.length !== 1) recusar(`o conjunto de snapshots precisa de exatamente um item ${kind} (${items.length})`);
    return items[0];
  };
  const refItem = itemDe("reference"), siteItem = itemDe("site"), planItem = itemDe("state-plan");
  const referenceBytes = readFileSync(resolve(o.referencia));
  const referenceSha = sha(referenceBytes);
  if (referenceSha !== refItem.sha256) recusar("a referência passada não é a do conjunto de snapshots (sha256 diverge)");
  const gt = JSON.parse(referenceBytes.toString("utf8")) as FlowGroundTruth;
  if (refItem.version && refItem.version !== gt._meta.version) recusar(`versão da referência ${String(gt._meta.version)} difere da do snapshot ${refItem.version}`);
  const plan = statePlanOf(gt);
  const planSha = statePlanSha256(plan)!;
  if (planSha !== planItem.sha256) recusar("o plano de estados da referência não é o do conjunto de snapshots");
  let site: LoadedSite;
  try { site = loadSite(resolve(o.site)); } catch (e) { return recusar(`site congelado inválido: ${e instanceof Error ? e.message : String(e)}`); }
  if (site.manifestSha256 !== siteItem.sha256) recusar("o site congelado não é o do conjunto de snapshots");
  for (const { run, findings } of pacotes) {
    if (run.versions.siteManifestSha256 !== site.manifestSha256) recusar(`${run.runId} foi coletado contra outro site (siteManifestSha256 diverge)`);
    if (findings && new URL(findings.report.appUrl).pathname !== new URL(gt._meta.url, "http://x").pathname) {
      recusar(`${run.runId} avaliou outra página (${new URL(findings.report.appUrl).pathname}) que a da referência (${gt._meta.url})`);
    }
  }
  const cenas = cenasDoPlano(gt, plan).map(c => c.id);

  // ── revisão anterior ─────────────────────────────────────────────────────
  let anterior: Resumo["revisao"]["anterior"] = null;
  let numero = 1;
  if (o.anterior) {
    const path = join(resolve(o.anterior), "summary.json");
    if (!existsSync(path)) recusar(`--anterior não tem summary.json: ${o.anterior}`);
    const bytes = readFileSync(path);
    const prev = JSON.parse(bytes.toString("utf8")) as Resumo;
    const ids = (xs: { runId: string }[]) => xs.map(x => x.runId).sort().join(",");
    if (ids(prev.execucoes) !== ids(pacotes.map(p => p.run))) recusar("a revisão anterior é de outras execuções");
    numero = prev.revisao.numero + 1;
    anterior = { caminho: relDe(saida, resolve(o.anterior)), conteudoCientificoSha256: prev.hashes.conteudoCientificoSha256, summarySha256: sha(bytes) };
  }

  // ── linha de base ────────────────────────────────────────────────────────
  const inicio = (r: Run) => r.timestamps.startedAt ?? r.timestamps.plannedAt;
  const collectionStartedAt = pacotes.map(p => inicio(p.run)).sort()[0];
  const lb = avaliarLinhaDeBase(o, { campaign, campaignSha, tipo, screenId: pacotes[0].run.screen.id, screenVersion: pacotes[0].run.screen.version,
    collectionStartedAt, referenceSha, siteSha: site.manifestSha256, planSha, cenas, snapshots });

  // ── bindings provisórios e agregação ─────────────────────────────────────
  const identity = analysisIdentity();
  const scorer = { version: identity.scoringVersion, acceptancePolicy: identity.acceptancePolicy, scorerSha256: identity.scorerSha256 };
  const reference = { snapshotItemId: refItem.id, version: String(gt._meta.version), sha256: referenceSha };
  const manifestoAnaliseBytes = o.manifestoAnalise ? readFileSync(resolve(o.manifestoAnalise)) : null;
  const entradasHash: Record<string, string> = {
    campanha: campaignSha, snapshots: sha(snapshotsBytes), referencia: referenceSha, site: site.manifestSha256,
    ...Object.fromEntries(pacotes.map(p => [`artifactManifest.${p.run.arm}`, sha(p.manifestBytes)])),
    ...(lb.registroBytes ? { linhaDeBaseRegistro: sha(lb.registroBytes) } : {}),
    ...(lb.brutoBytes ? { linhaDeBaseBruta: sha(lb.brutoBytes) } : {}),
    ...(manifestoAnaliseBytes ? { manifestoAnalise: sha(manifestoAnaliseBytes) } : {}),
  };
  const analysisBase = `analise-${digest({ entradasHash, tipo, scorer }).slice(0, 16)}`;
  const bindingDe = (p: PacoteLido, status: AnalysisBinding["status"], blockedReason: string | null, scoreStatus: ScoreStatus, metrics: AnalysisMetrics): AnalysisBinding => ({
    contract: "analysis-binding.v1", fixture, analysisId: `${analysisBase}-${p.run.arm}`, campaignId: campaign.campaignId,
    createdAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), kind: tipo === "composta" ? "composite" : "individual", screen: p.run.screen,
    runs: [{ runId: p.run.runId, arm: p.run.arm, artifactManifest: { sha256: sha(p.manifestBytes), bytes: p.manifestBytes.length,
      location: { kind: "package-path", path: `entradas/${p.run.arm}/artifact-manifest.json`, note: `cópia do manifesto do pacote ${p.run.runId}` } } }],
    collectionStartedAt,
    snapshots: { snapshotSetId: snapshots.snapshotSetId, manifest: { sha256: sha(snapshotsBytes), bytes: snapshotsBytes.length,
      location: { kind: "package-path", path: "entradas/snapshots.json" } } },
    reference, scorer, baseline: lb.binding,
    compatibility: { source: "scripts/analysis-manifest.ts", analysisManifest: manifestoAnaliseBytes
      ? { sha256: sha(manifestoAnaliseBytes), bytes: manifestoAnaliseBytes.length, location: { kind: "package-path", path: "entradas/manifesto-analise.json" } } : null },
    status, blockedReason, scoreStatus, metrics,
  });

  const avisos: string[] = avisoScorer ? [avisoScorer] : [];
  let bloqueada: string | null = lb.binding.mode === "blocked" ? `linha de base: ${lb.binding.detail}` : null;
  if (par) {
    const provisorios = pacotes.map(p => ({ run: p.run, binding: bindingDe(p, "ready", null, "not-prepared", METRICAS_NULAS) }));
    const ag = checkAggregation(provisorios);
    if (pacotes[0].run.pairId !== pacotes[1].run.pairId) ag.problems.push(`pairId difere: ${pacotes.map(p => `${p.run.runId}=${p.run.pairId}`).join(", ")}`);
    avisos.push(...ag.warnings);
    if (ag.problems.length) {
      const motivo = `o par difere fora do desenho (checkAggregation): ${ag.problems.join("; ")}`;
      bloqueada = bloqueada ? `${bloqueada}; ${motivo}` : motivo;
    }
  }

  // ── pontuação ────────────────────────────────────────────────────────────
  // `pontuavel` = há o que pontuar (DIAGNÓSTICO: calculado e mostrado, rotulado). Quem entra na
  // comparação principal é decidido à parte por `motivosDeInelegibilidade` (NAT-63, R2).
  const pontuavel = (p: PacoteLido) => p.run.submission.status === "accepted" && p.run.status.isolation !== "failed";
  const inelegivel = new Map(pacotes.map(p => [p.run.arm, motivosDeInelegibilidade(p.run, campaign)] as const));
  let prep: PacotePreparado | null = null;
  if (!bloqueada && pacotes.some(pontuavel)) {
    const provenance = {
      kind: "benchmark-isolado", adaptador: ADAPTADOR_VERSAO, fixture,
      campaign: { campaignId: campaign.campaignId, sha256: campaignSha },
      runs: pacotes.filter(pontuavel).map(p => ({ runId: p.run.runId, arm: p.run.arm, artifactManifestSha256: sha(p.manifestBytes) })),
      reference: { sha256: referenceSha, version: gt._meta.version },
      site: { manifestSha256: site.manifestSha256 },
      snapshots: { snapshotSetId: snapshots.snapshotSetId, sha256: sha(snapshotsBytes) },
      baseline: lb.binding.mode === "used"
        ? { mode: "used", baselineId: lb.binding.baselineId, recordSha256: lb.binding.record.sha256, rawSha256: sha(lb.brutoBytes!),
          runs: ["linha-de-base/validator-nao-guiada", "linha-de-base/axe"], guidedDiagnostic: lb.bruto!.coverageCheck, cost: lb.bruto!.cost }
        : { mode: lb.binding.mode, ...(lb.binding.mode === "planned-absence" ? { justification: lb.binding.justification } : {}) },
      analysis: identity,
    };
    const pacoteDecisoes = o.pacoteDecisoes ? resolve(o.pacoteDecisoes)
      : o.anterior && existsSync(join(resolve(o.anterior), "revisao", "package.json")) ? join(resolve(o.anterior), "revisao", "package.json") : null;
    prep = await prepararPacote({ gt, site, agentes: pacotes.filter(pontuavel).map(adaptarExecucao),
      baseline: lb.binding.mode === "used" ? lb.bruto : null, provenance, anterior: decisoes, orcamento: o.orcamentoRevisao,
      relogio: { instante: snapshots.createdAt, fuso: FUSO_DA_CAPTURA, origem: `createdAt do conjunto de snapshots ${snapshots.snapshotSetId}` },
      pacoteAnterior: decisoes ? {
        pkg: pacoteDecisoes && existsSync(pacoteDecisoes) ? lerJson<SemanticPackage>(pacoteDecisoes, "pacote das decisões") : null,
        origem: pacoteDecisoes ? relDe(saida, pacoteDecisoes) : "nenhum (sem --pacote-decisoes e --anterior sem revisao/package.json)",
      } : undefined });
  }

  // ── bindings finais ──────────────────────────────────────────────────────
  const scoreDe = (runId: string) => prep?.result.scores.find(s => s.runId === runId) ?? null;
  const cartoesDe = (runId: string) => prep?.pkg.runs.find(r => r.id === runId)?.cardIds.length ?? 0;
  const bindings = new Map<Arm, AnalysisBinding>();
  for (const p of pacotes) {
    let b: AnalysisBinding;
    if (bloqueada) b = bindingDe(p, "blocked", bloqueada, "not-prepared", METRICAS_NULAS);
    else if (p.run.submission.status !== "accepted") b = bindingDe(p, "ready", null, "not-applicable", METRICAS_NULAS);
    else if (p.run.status.isolation === "failed") b = bindingDe(p, "blocked", "isolamento falhou: execução em quarentena, fora da análise principal", "not-prepared", METRICAS_NULAS);
    else {
      const s = scoreDe(p.run.runId)!;
      b = bindingDe(p, "ready", null, estadoDaPontuacao(s, prep!.pkg.runs.find(r => r.id === p.run.runId)!.cardIds, prep!.reviews), {
        referenceUnits: s.counts.referenceUnits, confirmedReferenceUnits: s.counts.detectedUnits,
        recall: s.metrics.referenceRecall, precision: s.metrics.referencePrecision,
        incorrectClaims: s.counts.falseAssertions, newCorrect: s.counts.novelAssertions, pending: s.pendingCardIds.length,
      });
    }
    assertContract(b, "analysis-binding.v1");
    const ausencia = checkPlannedAbsence(campaign, campaignSha, b);
    if (ausencia.length) throw new Error(`binding com ausência planejada inválida (erro do analisador): ${ausencia.map(e => e.message).join("; ")}`);
    bindings.set(p.run.arm, b);
  }

  // ── resumo ───────────────────────────────────────────────────────────────
  const unidades = new Map((prep?.pkg.units ?? []).map(u => [u.id, { unitId: u.id, specId: u.specId, elemento: u.element.label }]));
  const exec = pacotes.map(p => execucaoResumo(p, saida, bindings.get(p.run.arm)!, scoreDe(p.run.runId), cartoesDe(p.run.runId),
    prep?.result.comparisons.find(c => c.agentRunId === p.run.runId && c.baseline === "uniao-deterministica") ?? null, pontuavel(p) ? null
      : p.run.submission.status !== "accepted" ? submissaoMotivo(p.run) : "isolamento falhou: execução em quarentena", temCamadaPagina(gt),
    inelegivel.get(p.run.arm)!));
  const comparacao = par ? compararPar(exec, prep, unidades, bloqueada) : null;
  for (const e of exec) {
    if (!e.elegibilidade!.elegivel) avisos.push(`${e.braco} (${e.runId}) fora da comparação principal — pontuação só diagnóstica: ${e.elegibilidade!.motivos.join("; ")}`);
  }
  const pendentes = prep ? prep.fila.ativa.cartoes : 0;
  const resumoSemHash: Omit<Resumo, "hashes"> = {
    formato: RESUMO_VERSAO, fixture, geradoEm: new Date().toISOString(), revisao: { numero, anterior },
    analise: { estado: bloqueada ? "bloqueada" : "pronta", motivo: bloqueada, tipo, avisos },
    linhaDeBase: { modo: lb.binding.mode, causa: lb.binding.mode === "blocked" ? lb.binding.cause : null,
      detalhe: lb.binding.mode === "blocked" ? lb.binding.detail : lb.binding.mode === "planned-absence" ? lb.binding.justification : null,
      baselineId: lb.binding.mode === "used" ? lb.binding.baselineId : lb.registro?.baselineId ?? null },
    execucoes: exec, comparacao,
    revisaoSemantica: prep ? { cartoes: prep.pkg.cards.length, pendentes, vazamentosDeBraco: armLeaks(prep.pkg).length, esforco: prep.esforco } : null,
    versoes: { scorer, referencia: reference, adaptador: ADAPTADOR_VERSAO },
    arquivos: {
      bindings: Object.fromEntries(pacotes.map(p => [p.run.arm, `analysis-binding.${p.run.arm}.json`])),
      score: prep ? "score.json" : null, revisao: prep ? "revisao/review.md" : null, decisoes: prep ? "revisao/reviews.json" : null,
      pacoteRevisao: prep ? "revisao/package.json" : null,
      pacotes: Object.fromEntries(pacotes.map(p => [p.run.arm, relDe(saida, p.dir)])),
    },
  };
  const cientifico = conteudoCientifico(resumoSemHash);
  const resumo: Resumo = { ...resumoSemHash, hashes: { conteudoCientificoSha256: digest(cientifico),
    pacoteRevisao: prep?.pkg.packageHash ?? null, decisoes: prep?.result.reviewHash ?? null, entradas: entradasHash } };

  // ── escrita (tudo calculado antes; pasta nova; nada sobrescrito) ─────────
  mkdirSync(join(saida, "entradas"), { recursive: true });
  const put = (rel: string, body: string | Buffer) => {
    mkdirSync(dirname(join(saida, rel)), { recursive: true });
    writeFileSync(join(saida, rel), body, { flag: "wx" });
  };
  put("entradas/campanha.json", campaignBytes);
  put("entradas/snapshots.json", snapshotsBytes);
  put("entradas/referencia.json", referenceBytes);
  for (const p of pacotes) put(`entradas/${p.run.arm}/artifact-manifest.json`, p.manifestBytes);
  if (lb.registroBytes) put("entradas/linha-de-base-registro.json", lb.registroBytes);
  if (lb.brutoBytes) put("entradas/linha-de-base-bruta.json", lb.brutoBytes);
  if (manifestoAnaliseBytes) put("entradas/manifesto-analise.json", manifestoAnaliseBytes);
  if (decisoes) put("entradas/decisoes.json", readFileSync(resolve(o.decisoes!)));
  for (const [arm, b] of bindings) put(`analysis-binding.${arm}.json`, json(b));
  if (prep) {
    put("revisao/package.json", json(prep.pkg));
    put("revisao/reviews.json", json(prep.reviews));
    put("revisao/review.md", renderReview(prep.pkg, prep.reviews, { cego: true }));
    if (o.revisaoCompleta) put("revisao/review-completo.md", renderReview(prep.pkg, prep.reviews, { cego: false }));
    put("revisao/esforco-revisao.json", json(prep.esforco));
    put("revisao/capture.json", json({ capturedAt: new Date().toISOString(), url: new URL(prep.url).pathname, sceneHash: prep.sceneHash,
      kind: "reconstrução no momento da análise do site congelado do conjunto de snapshots; não é evidência original da execução",
      sceneHashIgnora: REGRA_IDS_GERADOS, relogio: { ...prep.relogio, regra: REGRA_RELOGIO },
      scenes: prep.scenes.map((s, i) => ({ id: s.id, viewport: s.viewport, specIds: s.specIds, html: `scene-${i}.html`, image: `scene-${i}.png`,
        idsGerados: prep!.idsGerados[i], ...(s.segmento ? { segmento: s.segmento, entradaDireta: s.entrada ?? null } : {}) })) }));
    if (prep.mapa) put("revisao/mapa-cartoes.json", json(prep.mapa));
    prep.scenes.forEach((s, i) => {
      put(`revisao/resolution-${i}.json`, json({ scene: s.id, url: new URL(s.resolution.url).pathname,
        bySelector: Object.fromEntries(s.resolution.bySelector), byKey: Object.fromEntries(s.resolution.byKey) }));
      put(`revisao/scene-${i}.html`, s.html);
      put(`revisao/scene-${i}.png`, s.image);
    });
    put("score.json", json({ ...prep.result, fila: prep.fila, provenance: prep.pkg.provenance }));
  }
  put("summary.json", json(resumo));
  put("summary.md", renderResumo(resumo));
  return { estado: resumo.analise.estado, motivo: bloqueada, saida, resumo };
}

/**
 * Por que esta execução NÃO entra na comparação principal (NAT-63, R2). [] = elegível. A pontuação
 * diagnóstica pode existir mesmo assim (submissão aceita), mas nunca vira comparação, muito menos final.
 * Exige: submissão aceita, técnico `passed` (falha depois de enviar, tempo esgotado depois de enviar e
 * interrupção não contam), isolamento `passed` (`unverified` não basta) e a identidade congelada na
 * campanha, com tentativa e repetição dentro dos tetos. Qual tentativa de um slot entra
 * (`retryPolicy.attemptSelection`) exige a agenda de slots (T7) e não é decidida aqui.
 */
export function motivosDeInelegibilidade(run: Run, campaign: Campaign): string[] {
  const m: string[] = [];
  if (run.submission.status !== "accepted") m.push(`submissão ${run.submission.status} (não aceita)`);
  if (run.status.technical !== "passed") {
    m.push(`status técnico ${run.status.technical}${run.failure ? ` (${run.failure.stage} · ${run.failure.reason})` : ""}, não passed`);
  }
  if (run.status.isolation !== "passed") m.push(`isolamento ${run.status.isolation}, não comprovado (passed)`);
  m.push(...divergenciasDaCampanha(campaign, identidadeDoRun(run)));
  return m;
}

function submissaoMotivo(run: Run): string {
  if (run.status.technical === "not-run") return "o modelo não foi chamado (execução não rodou); não há o que pontuar";
  if (run.submission.status === "refused") return "a submissão foi recusada pelo coletor; não há achados para pontuar (não é zero achados)";
  return "nenhuma submissão chegou; não há achados para pontuar (não é zero achados)";
}

function execucaoResumo(p: PacoteLido, saida: string, b: AnalysisBinding, s: SemanticRunScore | null, cartoes: number,
  comp: BaselineComparison | null, motivoSemPontuacao: string | null, comCamadas = false, inelegibilidade: string[] = []): ExecucaoResumo {
  const { run, isolation, findings, manifest } = p;
  const link = (path: string | null) => path ? relDe(saida, join(p.dir, path)) : null;
  return {
    runId: run.runId, braco: run.arm,
    tecnico: { status: run.status.technical, ciclo: run.lifecycle.state, etapa: run.lifecycle.stage, falha: run.failure,
      submissao: run.submission.status, motivoRecusa: run.submission.refusal?.reason ?? null },
    identidade: { tela: run.screen, modelo: { familia: run.model.family, pedido: run.model.requested, resolvido: run.model.resolved, fonte: run.model.resolvedSource },
      esforco: run.effort, cliente: `${run.client.name} ${run.client.version}`, inicioUtc: run.timestamps.startedAt,
      inicioLocal: localDe(run.timestamps.startedAt), commit: run.versions.harnessCommit, repeticao: run.repetition, tentativa: run.attempt,
      campanha: run.campaignId, slot: run.slotId, par: run.pairId, fixture: run.fixture },
    pontuacao: { estado: b.scoreStatus, motivo: b.status === "blocked" ? b.blockedReason : motivoSemPontuacao, metricas: b.metrics,
      detalhe: s && b.status === "ready" ? { cartoes, afirmacoesPendentes: s.counts.unresolvedAssertions, duplicadas: s.counts.duplicateAssertions,
        redundantes: s.counts.redundantReferenceAssertions, precisaoAfirmacoes: s.metrics.assertionPrecision,
        recallConfirmadoAteAgora: s.metrics.confirmedReferenceRecall, citacaoSustentada: s.metrics.citationSupport } : null,
      linhaDeBase: comp && b.status === "ready" ? { ...comp.counts, estado: comp.status } : null,
      ...(comCamadas ? { camadas: camadasDe(s && b.status === "ready" ? s : null, b.metrics.recall !== null) } : {}) },
    mcpIsolamento: { isolamento: run.status.isolation, protocolo: run.status.protocol, usoOraculo: run.status.oracleUsage,
      oraculoAnunciado: isolation?.toolInventory.oracleAnnounced ?? null, oraculo: run.intervention.oracle,
      chamadasOraculo: metrica(run.usage.oracleCalls),
      ferramentasAnunciadas: isolation?.toolInventory.announced ?? null, ferramentasObservadas: isolation?.toolInventory.observed ?? null,
      errosDeFerramenta: errosDeFerramenta(p.toolEvents),
      checks: isolation ? { aprovados: isolation.checks.filter(c => c.outcome === "passed").length,
        falhos: isolation.checks.filter(c => c.outcome === "failed").map(c => `${c.id} (${c.category}: ${c.target})`),
        naoExercitados: isolation.checks.filter(c => c.outcome === "not-exercised").map(c => c.id) } : null,
      controlesPositivos: isolation ? { aprovados: isolation.positiveControls.filter(c => c.outcome === "passed").length,
        falhos: isolation.positiveControls.filter(c => c.outcome === "failed").map(c => c.id) } : null,
      limitacoes: isolation?.limitations ?? [] },
    custoTempo: Object.fromEntries(Object.entries(run.usage).map(([k, m]) => [k, metrica(m)])) as ExecucaoResumo["custoTempo"],
    achados: findings ? { total: findings.report.findings.length,
      itens: findings.report.findings.map(f => ({ seletor: f.selector, regra: f.rule, observado: f.observed })) } : null,
    links: { pacote: relDe(saida, p.dir), run: link("run.json"), findings: link(run.submission.findings), isolation: link(run.isolation),
      toolEvents: link(manifest.files.find(f => f.role === "tool-events")?.path ?? null),
      evidencias: manifest.files.filter(f => f.role === "evidence").map(f => link(f.path)!),
      logs: manifest.files.filter(f => f.role === "log").map(f => link(f.path)!),
      recusa: link(run.submission.refusal?.archivedBody ?? null) },
    binding: `analysis-binding.${run.arm}.json`,
    elegibilidade: { elegivel: inelegibilidade.length === 0, motivos: inelegibilidade },
    inspecao: comAuditoria(resumirInspecao(findings, p.toolEvents, p.toolPayloads), p, findings),
  };
}

/**
 * NAT-84: a auditoria final (scripts/inspection-audit.ts) entra no resumo do registro como texto e contagens.
 * Só pacotes com registro (findings.v2); legado fica como estava (`indisponivel`, sem auditoria). Não pontua.
 */
function comAuditoria(resumo: ResumoInspecao, p: PacoteLido, findings: AnyFindings | null): ResumoInspecao {
  if (resumo.estado === "indisponivel") return resumo;
  const a = auditarInspecao({ campaignId: p.run.campaignId, runId: p.run.runId, fixture: p.run.fixture, findings,
    toolEvents: p.toolEvents, payloads: p.toolPayloads, falha: p.run.failure });
  return { ...resumo,
    auditoria: { versao: a.auditVersion, texto: a.texto, destinos: a.destinos, naoRecebidos: a.oraculo.naoRecebidos, parcial: a.parcial,
      sinalizadas: Object.fromEntries(a.verificacoes.filter(v => v.aplica && v.ocorrencias > 0).map(v => [v.id, v.ocorrencias])) } };
}

function compararPar(exec: ExecucaoResumo[], prep: PacotePreparado | null, unidades: Map<string, UnidadeResumo>, bloqueada: string | null): ComparacaoResumo {
  const nota = "n = 1 par, sem inferência. Nenhum braço é declarado melhor por contagem bruta.";
  const indisponivel = (motivo: string): ComparacaoResumo => ({ disponivel: false, motivo, estado: null, diferencaUnidadesConfirmadas: null,
    diferencaRecall: null, unidades: null, nota });
  if (bloqueada) return indisponivel(`análise bloqueada: ${bloqueada}`);
  const [sem, com] = ["sem", "com"].map(a => exec.find(e => e.braco === a)!);
  // NAT-63 (R2): par inelegível nunca vira comparação (nem provisória, nem final); o pacote, a pontuação
  // diagnóstica de cada braço e os motivos ficam no resumo.
  const fora = [sem, com].filter(e => e.elegibilidade && !e.elegibilidade.elegivel);
  const faltando = [sem, com].filter(e => e.pontuacao.estado === "not-applicable" || e.pontuacao.estado === "not-prepared");
  // sem pontuação (sem submissão aceita, quarentena): indisponível pelo motivo de sempre; a inelegibilidade
  // também fica em execucoes[].elegibilidade
  if (faltando.length) return indisponivel(`braço sem pontuação: ${faltando.map(e => `${e.braco} (${e.pontuacao.motivo ?? e.pontuacao.estado})`).join("; ")}`);
  if (fora.length) {
    return { ...indisponivel(`par inelegível para a comparação principal (não conta; pontuação só diagnóstica): ${fora
      .map(e => `${e.braco} — ${e.elegibilidade!.motivos.join("; ")}`).join(" | ")}`), elegivel: false };
  }
  const sc = (e: ExecucaoResumo) => prep!.result.scores.find(s => s.runId === e.runId)!;
  const a = new Set(sc(sem).matched.map(m => m.unitId)), b = new Set(sc(com).matched.map(m => m.unitId));
  const ids = prep!.pkg.units.map(u => u.id);
  const pega = (f: (u: string) => boolean) => ids.filter(f).map(u => unidades.get(u)!);
  const final = sem.pontuacao.estado === "final" && com.pontuacao.estado === "final";
  return {
    disponivel: true, motivo: null, estado: final ? "final" : "provisoria", elegivel: true,
    diferencaUnidadesConfirmadas: com.pontuacao.metricas.confirmedReferenceUnits! - sem.pontuacao.metricas.confirmedReferenceUnits!,
    diferencaRecall: final && com.pontuacao.metricas.recall !== null && sem.pontuacao.metricas.recall !== null
      ? com.pontuacao.metricas.recall - sem.pontuacao.metricas.recall : null,
    unidades: { soCom: pega(u => b.has(u) && !a.has(u)), soSem: pega(u => a.has(u) && !b.has(u)),
      ambos: pega(u => a.has(u) && b.has(u)), nenhum: pega(u => !a.has(u) && !b.has(u)) },
    nota,
  };
}

/** O que entra no hash científico: tudo menos horários operacionais e caminhos desta máquina. */
export function conteudoCientifico(r: Omit<Resumo, "hashes"> | Resumo): unknown {
  return {
    formato: r.formato, fixture: r.fixture, analise: r.analise, linhaDeBase: r.linhaDeBase, comparacao: r.comparacao, versoes: r.versoes,
    revisaoSemantica: r.revisaoSemantica,
    // NAT-81: registro indisponível (pacote v1) não entra no hash — re-análises de pacotes históricos
    // mantêm o mesmo conteúdo científico; registro presente (ou não enviado) entra.
    // NAT-84: a auditoria final é relatório de processo (`efeito` constante) e fica fora do hash.
    execucoes: r.execucoes.map(({ links: _l, inspecao, ...e }) => {
      if (!inspecao || inspecao.estado === "indisponivel") return e;
      const { auditoria: _a, ...registro } = inspecao;
      return { ...e, inspecao: registro };
    }),
  };
}

// ───────────────────────────────────────────────────────────────── summary.md

/**
 * Texto que veio do modelo (ou que pode citá-lo) é dado não confiável: sem HTML ativo, sem markdown
 * que vire link ou formatação, sem autolink para fora do pacote. Colapsa espaços e trunca.
 */
export function seguro(s: string | null | undefined, max = 220): string {
  if (s === null || s === undefined) return "—";
  let t = String(s).replace(/\s+/g, " ").trim();
  if (t.length > max) t = `${t.slice(0, max - 1)}…`;
  t = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  t = t.replace(/([\\`*_[\]()|~!{}])/g, "\\$1");
  t = t.replace(/:\/\//g, "&#58;//").replace(/\bwww\./gi, m => `${m.slice(0, 3)}&#46;`);
  return t || "—";
}
const pct = (v: number | null): string => v === null ? "indisponível" : `${(v * 100).toFixed(1).replace(".", ",")}%`;
const num = (v: number | null): string => v === null ? "indisponível" : String(v);
const link = (texto: string, alvo: string | null): string => alvo ? `[${texto}](${encodeURI(alvo)})` : "—";

const TECNICO: Record<string, string> = { passed: "rodou até o fim e o relatório foi aceito", failed: "falhou", interrupted: "foi interrompida", "not-run": "não rodou (o modelo não foi chamado)" };
const SCORE: Record<ScoreStatus, string> = {
  final: "final", provisional: "provisória", "pending-review": "aguardando revisão", "not-prepared": "não preparada", "not-applicable": "não se aplica",
};
const SUBMISSAO: Record<string, string> = { accepted: "aceita", refused: "recusada pelo coletor", none: "nenhuma" };
const USO: Record<string, string> = { "absent-verified": "ausente (confirmado)", "used-adherent": "usado conforme o protocolo",
  "available-unused": "disponível e não usado", "used-with-errors": "usado com erros", unverified: "não verificado", "not-applicable": "não se aplica" };
const CUSTO: [keyof Run["usage"], string][] = [
  ["wallClockSeconds", "Tempo de relógio (s)"], ["turns", "Turnos"], ["toolCalls", "Chamadas de ferramenta"], ["oracleCalls", "Chamadas ao oráculo"],
  ["inputTokens", "Tokens de entrada"], ["outputTokens", "Tokens de saída"], ["cacheReadTokens", "Tokens lidos do cache"],
  ["cacheCreationTokens", "Tokens gravados no cache"], ["estimatedCostUsd", "Custo estimado (US$, preço de referência)"], ["billedCostUsd", "Cobrança efetiva (US$)"],
];
const valorMetrica = (m: MetricaResumo): string => m.estado === "medido" ? `${m.valor} (${seguro(m.fonte, 60)})`
  : m.estado === "indisponivel" ? "desconhecido" : "não se aplica";

function maturidade(e: ExecucaoResumo): string {
  const m = e.pontuacao.metricas;
  switch (e.pontuacao.estado) {
    case "final": return "final (revisão fechada)";
    case "provisional": return `provisória — ${m.pending} cartão(ões) pendente(s)`;
    case "pending-review": return `aguardando revisão — ${m.pending} cartão(ões), nenhum decidido`;
    case "not-prepared": return `não preparada — ${seguro(e.pontuacao.motivo, 400)}`;
    default: return `não se aplica — ${seguro(e.pontuacao.motivo, 400)}`;
  }
}

export function renderResumo(r: Resumo): string {
  const L: string[] = [];
  const execs = [...r.execucoes].sort((a, b) => ORDEM.indexOf(a.braco) - ORDEM.indexOf(b.braco));
  const tela = execs[0]?.identidade.tela;
  L.push(`# Resumo da análise${tela ? ` — ${seguro(tela.label)} (${seguro(tela.id)})` : ""}`, "");
  if (r.fixture) L.push("> **FIXTURE SINTÉTICA — não é resultado científico.** Serve só para testar o caminho da análise.", "");
  L.push(`Revisão ${r.revisao.numero}${r.revisao.anterior ? ` · substitui ${link("a revisão anterior", `${r.revisao.anterior.caminho}/summary.md`)} (sem alterar o pacote bruto)` : ""} · gerado em ${r.geradoEm} (UTC)`, "");

  // 1. status técnico
  L.push("## 1. Status técnico", "");
  const estado = r.analise.estado === "pronta" ? "**pronta**" : r.analise.estado === "bloqueada" ? "**bloqueada**" : "**recusada**";
  L.push(`Análise: ${estado}${r.analise.motivo ? ` — ${seguro(r.analise.motivo, 800)}` : ""}`, "");
  if (r.analise.estado === "recusada") {
    L.push("Um pacote ou uma entrada não passou na conferência de integridade/contrato. Nenhum número foi calculado e nada foi alterado no pacote bruto. Corrija a entrada (ou refaça o pacote) e rode a análise de novo numa pasta nova.", "");
    return L.join("\n") + "\n";
  }
  if (r.analise.estado === "bloqueada") L.push("O resumo técnico abaixo continua valendo; as métricas ficam indisponíveis (`null`) até o bloqueio ser resolvido. O pacote bruto não foi alterado.", "");
  for (const a of r.analise.avisos) L.push(`Aviso: ${seguro(a, 400)}`, "");
  L.push("| Execução | Braço | O que aconteceu | Etapa / motivo | Submissão | Pontuação |", "|---|---|---|---|---|---|");
  for (const e of execs) {
    const f = e.tecnico.falha;
    L.push(`| ${seguro(e.runId)} | ${e.braco} | ${TECNICO[e.tecnico.status]} | ${f ? `${f.stage} · ${f.reason}: ${seguro(f.detail)}` : "—"} | ` +
      `${SUBMISSAO[e.tecnico.submissao]}${e.tecnico.motivoRecusa ? ` (${seguro(e.tecnico.motivoRecusa)})` : ""} | ${maturidade(e)} |`);
  }
  L.push("", "Uma execução pode ter rodado bem e ainda estar esperando revisão: isso é normal. A pontuação só é final quando todos os cartões dela foram decididos.", "");
  for (const e of execs) {
    if (e.elegibilidade && !e.elegibilidade.elegivel) {
      L.push(`**${e.braco} não conta para a comparação principal** — a pontuação dele é só diagnóstico: ${seguro(e.elegibilidade.motivos.join("; "), 800)}`, "");
    }
  }

  // 2. identidade
  L.push("## 2. Identidade", "");
  const col = (f: (e: ExecucaoResumo) => string) => execs.map(f).join(" | ");
  L.push(`| | ${col(e => e.braco)} |`, `|---|${execs.map(() => "---").join("|")}|`);
  L.push(`| Tela | ${col(e => `${seguro(e.identidade.tela.label)} (${seguro(e.identidade.tela.id)} @ ${seguro(e.identidade.tela.version)})`)} |`);
  L.push(`| Braço | ${col(e => e.braco === "com" ? "com oráculo" : "sem oráculo")} |`);
  L.push(`| Modelo (família) | ${col(e => seguro(e.identidade.modelo.familia))} |`);
  L.push(`| ID pedido | ${col(e => seguro(e.identidade.modelo.pedido))} |`);
  L.push(`| ID efetivo | ${col(e => e.identidade.modelo.resolvido === "unknown" ? "desconhecido (o fornecedor não expôs)" : `${seguro(e.identidade.modelo.resolvido)} (${e.identidade.modelo.fonte})`)} |`);
  L.push(`| Esforço | ${col(e => seguro(e.identidade.esforco))} |`);
  L.push(`| Cliente | ${col(e => seguro(e.identidade.cliente))} |`);
  L.push(`| Início (UTC) | ${col(e => e.identidade.inicioUtc ?? "não iniciou")} |`);
  L.push(`| Início (local) | ${col(e => e.identidade.inicioLocal ?? "não iniciou")} |`);
  L.push(`| Commit do harness | ${col(e => seguro(e.identidade.commit))} |`);
  L.push(`| Repetição · tentativa | ${col(e => `${e.identidade.repeticao} · ${e.identidade.tentativa}`)} |`);
  L.push(`| Campanha · slot · par | ${col(e => `${seguro(e.identidade.campanha)} · ${seguro(e.identidade.slot)} · ${seguro(e.identidade.par)}`)} |`, "");

  // 3. resultado científico
  L.push("## 3. Resultado científico", "");
  if (r.analise.estado === "bloqueada") {
    L.push("Indisponível: a análise está bloqueada. Nenhuma métrica foi calculada (todas `null`).", "");
  } else {
    L.push(`| Medida | ${col(e => e.braco)} |`, `|---|${execs.map(() => "---").join("|")}|`);
    const m = (f: (e: ExecucaoResumo) => string) => `| ${col(f)} |`;
    const confirmadas = (e: ExecucaoResumo) => {
      const x = e.pontuacao.metricas;
      if (x.confirmedReferenceUnits === null) return "indisponível";
      return `${x.confirmedReferenceUnits} de ${x.referenceUnits}${e.pontuacao.estado === "final" ? "" : " (até agora)"}`;
    };
    L.push(`| Defeitos da referência confirmados ${m(confirmadas)}`);
    L.push(`| Recall (cobertura da referência) ${m(e => pct(e.pontuacao.metricas.recall))}`);
    if (execs.some(e => e.pontuacao.camadas)) {
      const camada = (c: CamadaResumo, fim: boolean) => c.confirmadas === null ? `${c.prefixo}\\*: indisponível`
        : `${c.prefixo}\\*: ${c.confirmadas} de ${c.total}${fim ? "" : " (até agora)"} · ${pct(c.recall)}`;
      L.push(`| Sorteadas × página (A-\\* × P-\\*) ${m(e => e.pontuacao.camadas
        ? `${camada(e.pontuacao.camadas.sorteadas, e.pontuacao.estado === "final")} × ${camada(e.pontuacao.camadas.pagina, e.pontuacao.estado === "final")}` : "—")}`);
    }
    L.push(`| Precisão sobre a referência — D/(D+F) ${m(e => pct(e.pontuacao.metricas.precision))}`);
    L.push(`| Precisão das afirmações — (D+N)/(D+N+F) ${m(e => pct(e.pontuacao.detalhe?.precisaoAfirmacoes ?? null))}`);
    L.push(`| Afirmações incorretas (falsos positivos) ${m(e => num(e.pontuacao.metricas.incorrectClaims))}`);
    L.push(`| Defeitos novos corretos (fora da referência) ${m(e => num(e.pontuacao.metricas.newCorrect))}`);
    L.push(`| Duplicadas ${m(e => num(e.pontuacao.detalhe?.duplicadas ?? null))}`);
    L.push(`| Cartões pendentes de revisão ${m(e => num(e.pontuacao.metricas.pending))}`);
    L.push(`| Maturidade ${m(e => maturidade(e))}`);
    if (execs.some(e => e.elegibilidade)) L.push(`| Entra na comparação principal ${m(e => !e.elegibilidade ? "—" : e.elegibilidade.elegivel ? "sim" : "não (só diagnóstico)")}`);
    L.push(`| Achados enviados ${m(e => e.achados ? String(e.achados.total) : "nenhuma submissão aceita")}`, "");
    L.push("Recall e precisão só aparecem com a revisão fechada; enquanto houver cartão pendente ficam “indisponível” (nunca 0). " +
      "“Achados enviados = 0” é um resultado válido (o agente olhou e não alegou nada); submissão recusada ou ausente é outra coisa.", "");
    if (r.linhaDeBase?.modo === "used" && execs.some(e => e.pontuacao.linhaDeBase)) {
      L.push("Linha de base determinística (união das varreduras comparáveis), por unidade da referência:", "");
      L.push(`| Unidades | ${col(e => e.braco)} |`, `|---|${execs.map(() => "---").join("|")}|`);
      const lb = (f: (c: NonNullable<ExecucaoResumo["pontuacao"]["linhaDeBase"]>) => string) => `| ${col(e => e.pontuacao.linhaDeBase ? f(e.pontuacao.linhaDeBase) : "—")} |`;
      L.push(`| Agente e linha de base ${lb(c => String(c.both))}`, `| Só o agente ${lb(c => String(c.agentOnly))}`,
        `| Só a linha de base ${lb(c => String(c.baselineOnly))}`, `| Nenhum ${lb(c => String(c.neither))}`,
        `| Estado ${lb(c => c.estado === "complete" ? "final" : "provisório")}`, "");
    }
  }
  if (r.linhaDeBase) {
    const lb = r.linhaDeBase;
    L.push(`Linha de base: ${lb.modo === "used" ? `usada (${seguro(lb.baselineId)})` : lb.modo === "planned-absence"
      ? `ausência planejada na campanha antes da coleta — ${seguro(lb.detalhe, 400)}` : `bloqueio (${lb.causa}) — ${seguro(lb.detalhe, 600)}`}`, "");
  }

  // 4. comparação
  if (r.comparacao) {
    const c = r.comparacao;
    L.push("## 4. Comparação com − sem", "", `_${c.nota}_`, "");
    if (!c.disponivel) L.push(`Indisponível: ${seguro(c.motivo, 600)}`, "");
    else {
      const sinal = (v: number) => v > 0 ? `+${v}` : String(v);
      L.push(`Estado: ${c.estado === "final" ? "final (as duas revisões fechadas)" : "provisória (há cartões pendentes em pelo menos um braço)"}`, "");
      L.push(`- Diferença de defeitos confirmados (com − sem): ${sinal(c.diferencaUnidadesConfirmadas!)}${c.estado === "final" ? "" : " (até agora)"}`);
      const pp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1).replace(".", ",")} p.p.`;
      L.push(`- Diferença de recall (com − sem): ${c.diferencaRecall === null ? "indisponível (revisão aberta)" : pp(c.diferencaRecall)}`);
      const lista = (us: UnidadeResumo[]) => us.length ? us.map(u => `${seguro(u.specId)} (${seguro(u.elemento, 80)})`).join("; ") : "nenhuma";
      L.push(`- Só o com detectou: ${lista(c.unidades!.soCom)}`, `- Só o sem detectou: ${lista(c.unidades!.soSem)}`,
        `- Os dois detectaram: ${lista(c.unidades!.ambos)}`, `- Nenhum detectou: ${lista(c.unidades!.nenhum)}`, "");
    }
  }

  // 5. MCP e isolamento
  L.push(`## ${r.comparacao ? 5 : 4}. MCP e isolamento`, "");
  L.push(`| | ${col(e => e.braco)} |`, `|---|${execs.map(() => "---").join("|")}|`);
  L.push(`| Isolamento | ${col(e => e.mcpIsolamento.isolamento)} |`);
  L.push(`| Oráculo anunciado ao cliente | ${col(e => e.mcpIsolamento.oraculoAnunciado === null ? "desconhecido" : e.mcpIsolamento.oraculoAnunciado ? "sim" : "não")} |`);
  L.push(`| Oráculo (pacote) | ${col(e => e.mcpIsolamento.oraculo ? `${seguro(e.mcpIsolamento.oraculo.package)} ${seguro(e.mcpIsolamento.oraculo.version)} (${e.mcpIsolamento.oraculo.profile})` : "nenhum")} |`);
  L.push(`| Uso do oráculo | ${col(e => USO[e.mcpIsolamento.usoOraculo])} |`);
  L.push(`| Chamadas ao oráculo | ${col(e => valorMetrica(e.mcpIsolamento.chamadasOraculo))} |`);
  L.push(`| Protocolo | ${col(e => e.mcpIsolamento.protocolo)} |`);
  L.push(`| Ferramentas anunciadas | ${col(e => e.mcpIsolamento.ferramentasAnunciadas ? seguro(e.mcpIsolamento.ferramentasAnunciadas.join(", "), 400) : "desconhecido")} |`);
  L.push(`| Ferramentas usadas | ${col(e => e.mcpIsolamento.ferramentasObservadas ? seguro(e.mcpIsolamento.ferramentasObservadas.join(", ") || "nenhuma", 400) : "desconhecido")} |`);
  L.push(`| Erros de ferramenta | ${col(e => e.mcpIsolamento.errosDeFerramenta.estado === "medido" ? `${e.mcpIsolamento.errosDeFerramenta.valor} (${seguro(e.mcpIsolamento.errosDeFerramenta.fonte, 80)})` : `desconhecido (${seguro(e.mcpIsolamento.errosDeFerramenta.fonte, 80)})`)} |`);
  L.push(`| Checks negativos | ${col(e => e.mcpIsolamento.checks ? `${e.mcpIsolamento.checks.aprovados} aprovado(s); falhos: ${seguro(e.mcpIsolamento.checks.falhos.join("; ") || "nenhum", 300)}; não exercitados: ${seguro(e.mcpIsolamento.checks.naoExercitados.join(", ") || "nenhum", 200)}` : "sem isolation.json")} |`);
  L.push(`| Controles positivos | ${col(e => e.mcpIsolamento.controlesPositivos ? `${e.mcpIsolamento.controlesPositivos.aprovados} aprovado(s); falhos: ${seguro(e.mcpIsolamento.controlesPositivos.falhos.join(", ") || "nenhum")}` : "—")} |`);
  L.push(`| Limitações declaradas | ${col(e => seguro(e.mcpIsolamento.limitacoes.join("; ") || "nenhuma", 300))} |`);
  L.push(`| Registro de inspeção | ${col(e => seguro(e.inspecao?.texto ?? "registro indisponível (resumo anterior ao registro)", 400))} |`);
  // NAT-84: a linha só aparece quando alguma execução tem auditoria (resumos de pacotes v1 ficam iguais).
  if (execs.some(e => e.inspecao?.auditoria)) L.push(`| Auditoria do registro (processo, não pontua) | ${col(e => seguro(e.inspecao?.auditoria?.texto ?? "—", 400))} |`);
  L.push("");
  L.push("O registro de inspeção é declaração do agente sobre o inventário que ele mesmo descobriu; “com evento de ferramenta” só diz que o identificador citado aparece num evento gravado. Não pontua nem decide elegibilidade, e a cobertura da página continua desconhecida.", "");
  L.push("Contagem de chamadas não prova causa: o resumo mostra uso e resultado lado a lado, sem atribuir efeito.", "");

  // 6. custo e tempo
  L.push(`## ${r.comparacao ? 6 : 5}. Custo e tempo`, "");
  L.push(`| | ${col(e => e.braco)} |`, `|---|${execs.map(() => "---").join("|")}|`);
  for (const [k, rotulo] of CUSTO) L.push(`| ${rotulo} | ${col(e => valorMetrica(e.custoTempo[k]))} |`);
  L.push("", "“Desconhecido” é o que o cliente/runner não mediu — nunca vira 0. Estimativa a preço de referência não é fatura.", "");
  if (r.revisaoSemantica) {
    const es = r.revisaoSemantica.esforco;
    L.push(`Custo de revisão (separado do custo de executar): ${es.cartoes} cartão(ões), estimativa ${es.estimativaMinutos} min — ${seguro(es.taxa, 300)}.`, "");
  }

  // 7. detalhes
  L.push(`## ${r.comparacao ? 7 : 6}. Detalhes e evidências`, "");
  for (const e of execs) {
    const k = e.links;
    L.push(`**${e.braco}** (${seguro(e.runId)}): ${link("pacote", k.pacote as string)} · ${link("run.json", k.run as string | null)} · ` +
      `${link("findings.json", k.findings as string | null)} · ${link("isolation.json", k.isolation as string | null)} · ` +
      `${link("eventos de ferramenta", k.toolEvents as string | null)} · ${link("corpo recusado", k.recusa as string | null)} · ` +
      `evidências: ${(k.evidencias as string[]).map((p, i) => link(`#${i + 1}`, p)).join(" ") || "nenhuma"} · ` +
      `logs: ${(k.logs as string[]).map((p, i) => link(`#${i + 1}`, p)).join(" ") || "nenhum"} · ${link("binding", e.binding)}`, "");
    if (e.achados) {
      L.push(`Achados enviados (${e.achados.total}; texto do agente, escapado — dado não confiável):`, "");
      if (e.achados.total === 0) L.push("- nenhum (lista vazia aceita pelo coletor)", "");
      else {
        L.push("| Seletor | Regra | Observado |", "|---|---|---|");
        for (const f of e.achados.itens) L.push(`| ${seguro(f.seletor, 80)} | ${f.regra === null ? "incerta" : seguro(f.regra, 60)} | ${seguro(f.observado)} |`);
        L.push("");
      }
    }
  }
  const a = r.arquivos;
  L.push(`Análise: ${link("revisão (cega)", a.revisao as string | null)} · ${link("decisões", a.decisoes as string | null)} · ` +
    `${link("score.json", a.score as string | null)} · ${link("pacote de revisão", a.pacoteRevisao as string | null)} · ${link("entradas", "entradas")}`, "");
  L.push("## Como revisar e recalcular", "",
    "1. Abra `revisao/review.md` (renderização cega) e decida cada cartão em `revisao/reviews.json` (vocabulário em `docs/semantic-scoring.md`).",
    "2. Rode a análise de novo com `--decisoes <reviews.json> --anterior <esta pasta> --saida <pasta nova>`: sai uma revisão nova ligada a esta; o pacote bruto não muda.",
    "3. A pontuação só é final quando a fila ativa zera.", "");
  L.push(`Hash do conteúdo científico: \`${r.hashes.conteudoCientificoSha256}\``, "");
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── CLI

function lerArgs(argv: string[]): OpcoesAnalise {
  const val = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i < 0) return undefined;
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) throw new Error(`Falta valor para --${name}`);
    return v;
  };
  const req = (name: string): string => val(name) ?? (() => { throw new Error(`Falta --${name}`); })();
  const tipo = val("tipo");
  if (tipo && tipo !== "individual" && tipo !== "composta") throw new Error("--tipo é individual ou composta");
  return {
    pacote: val("pacote"), sem: val("sem"), com: val("com"),
    campanha: req("campanha"), snapshots: req("snapshots"), referencia: req("referencia"), site: req("site"),
    linhaDeBase: val("linha-de-base"), semLinhaDeBase: argv.includes("--sem-linha-de-base"),
    tipo: tipo as OpcoesAnalise["tipo"], manifestoAnalise: val("manifesto-analise"), bateriaDesignada: val("bateria-designada"),
    justificativa: val("justificativa"), arquivo: val("arquivo"), decisoes: val("decisoes"), pacoteDecisoes: val("pacote-decisoes"), anterior: val("anterior"),
    orcamentoRevisao: val("orcamento-revisao"), revisaoCompleta: argv.includes("--revisao-completa"), saida: req("saida"),
  };
}

const USO_CLI = `Uso: npm run analisar -- (--pacote DIR | --sem DIR --com DIR) --campanha campaign.json --snapshots snapshot-manifest.json
         --referencia referencia.json --site DIR_SITE (--linha-de-base baseline.json | --sem-linha-de-base) --saida PASTA_NOVA
         [--tipo individual|composta --manifesto-analise F --bateria-designada ID --justificativa TEXTO] [--arquivo RAIZ_DO_ARQUIVO]
         [--decisoes reviews.json [--pacote-decisoes package.json]] [--anterior PASTA_DA_REVISAO_ANTERIOR] [--orcamento-revisao TEXTO] [--revisao-completa]`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    let o: OpcoesAnalise;
    try { o = lerArgs(process.argv.slice(2)); } catch (e) { console.error(`${e instanceof Error ? e.message : e}\n${USO_CLI}`); process.exitCode = 1; return; }
    const r = await analisar(o);
    const execs = r.resumo.execucoes.map(e => `${e.braco}: técnico ${e.tecnico.status}, pontuação ${e.pontuacao.estado}`).join(" · ");
    console.log(`Análise ${r.estado}${r.motivo ? ` — ${r.motivo}` : ""}${execs ? `\n${execs}` : ""}\n→ ${posix(relative(process.cwd(), r.saida))}/summary.md`);
    process.exitCode = r.estado === "pronta" ? 0 : r.estado === "bloqueada" ? 3 : 1;
  })().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
}

