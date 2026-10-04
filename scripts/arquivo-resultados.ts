/**
 * Arquivo de resultados do benchmark isolado (T4, D-65/D-67): o que o job `arquivar` grava num clone
 * do `govbr-resultados`, e o que a restauração lê de volta. Biblioteca pura (sem rede, sem GitHub): o
 * workflow só a chama e depois faz `git push` e `gh release upload` em passos finos.
 *
 * Estrutura do arquivo (raiz = clone do govbr-resultados):
 *
 *   execucoes/<campanha>/<pasta>/          execução formal (modo real)
 *   ensaios/<campanha>/<pasta>/            dublê ou agente roteirizado (`fixture: true`)
 *     pacote/                              os JSONs do pacote (run, findings, isolation, tool-events,
 *                                          artifact-manifest, refused/) — o resto vai no anexo
 *     despacho.json                        disparo, commits, jobs, imagens, anexo de evidências + sha256
 *     resumo.md                            leitura humana: estado técnico primeiro
 *   linhas-de-base/<campanha>/<tela>/<baselineId>/{baseline.json, bruta.json}
 *   coletas/<campanha>/<sha256>/manifesto-coleta.json      (por conteúdo)
 *   snapshots/referencia/<sha256>/referencia.json          (por conteúdo; nunca exposto ao agente)
 *   snapshots/plano-de-estados/<sha256>/plano-estados.json
 *   snapshots/conjuntos/<snapshotSetId>.json               (snapshot-manifest.v1; id derivado do conteúdo)
 *   campanhas/<campanha>/<sha256>/campaign.json            (T8a.1; por conteúdo; a que o manifesto registra)
 *   sites/<sha256 do site-manifest>/{site-manifest.json, site/…}   (T8a.1; o site congelado, por conteúdo:
 *                                          só os arquivos que o site-manifest lista, conferidos um a um)
 *   indice/entradas/<chave>.json           uma entrada por execução/linha de base (imutável salvo o
 *                                          estado da entrega do anexo, que só avança)
 *   indice/indice.json, INDICE.md          projeções reconstruídas de indice/entradas a cada gravação
 *
 * <pasta> = <plannedAt UTC>__<tela>__<família>__<braço>__rep-NN__<runId>; sem pacote:
 * <data>__<tela>__<braço>__sem-pacote__gh-<runId>-<tentativa>.
 *
 * Nada é sobrescrito: arquivo existente com bytes diferentes é recusado; com bytes iguais é a mesma
 * gravação repetida (reenvio idempotente do mesmo pacote).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  crossCheckRun, validateContract, type ArtifactManifest, type Baseline, type Findings, type Isolation, type Run, type SnapshotManifest,
} from "../contracts/index";
import { compareIdentities, statePlanSha256 } from "./collection-manifest";
import { canonical } from "./semantic-flow";
import { SCREEN_LABELS, screenVersionOf, type IsolatedCollectionManifest } from "./manifesto-coleta-isolada";
import type { FlowBaselines } from "./run-baselines-flow";
import { loadSite } from "./measurement-surface";

export const ARCHIVE_VERSION = "arquivo-resultados-1.0.0";
export const OWNER = "nathlia";
export const REPOS = { eval: `${OWNER}/govbr-eval`, telas: `${OWNER}/govbr-telas`, resultados: `${OWNER}/govbr-resultados` } as const;

export const sha = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");
const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function listarArquivos(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    return e.isDirectory() ? listarArquivos(join(dir, e.name), rel) : [rel];
  }).sort();
}

// ───────────────────────────────────────────────────────────────── tar (ustar), determinístico

function octal(n: number, width: number): string {
  return n.toString(8).padStart(width - 1, "0") + "\0";
}

function splitName(name: string): { name: string; prefix: string } {
  if (Buffer.byteLength(name) <= 100) return { name, prefix: "" };
  for (let i = name.length - 1; i > 0; i--) {
    if (name[i] !== "/") continue;
    const prefix = name.slice(0, i), rest = name.slice(i + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(rest) <= 100) return { name: rest, prefix };
  }
  throw new Error(`caminho longo demais para ustar: ${name}`);
}

function header(path: string, size: number): Buffer {
  const h = Buffer.alloc(512, 0);
  const { name, prefix } = splitName(path);
  h.write(name, 0, 100, "utf8");
  h.write(octal(0o644, 8), 100, "ascii");
  h.write(octal(0, 8), 108, "ascii");
  h.write(octal(0, 8), 116, "ascii");
  h.write(octal(size, 12), 124, "ascii");
  h.write(octal(0, 12), 136, "ascii"); // mtime fixo: o mesmo pacote dá os mesmos bytes
  h.write("        ", 148, "ascii");
  h.write("0", 156, "ascii");
  h.write("ustar\0", 257, "ascii");
  h.write("00", 263, "ascii");
  h.write(prefix, 345, 155, "utf8");
  let sum = 0;
  for (const b of h) sum += b;
  h.write(octal(sum, 7) + " ", 148, "ascii");
  return h;
}

/** tar.gz determinístico de `dir` sob a pasta-raiz `raiz` (ordem, data, dono e modo fixos). */
export function criarTarGz(dir: string, raiz: string): Buffer {
  const parts: Buffer[] = [];
  for (const rel of listarArquivos(dir)) {
    const body = readFileSync(join(dir, rel));
    parts.push(header(`${raiz}/${rel}`, body.length), body, Buffer.alloc((512 - (body.length % 512)) % 512, 0));
  }
  parts.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(parts), { level: 9, mtime: 0 } as never);
}

/** Lê um tar.gz (ustar/GNU simples). Recusa caminho absoluto, `..` ou barra invertida. */
export function lerTarGz(buf: Buffer): { path: string; body: Buffer }[] {
  const tar = gunzipSync(buf);
  const out: { path: string; body: Buffer }[] = [];
  let off = 0;
  while (off + 512 <= tar.length) {
    const h = tar.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (a: number, b: number): string => h.subarray(a, a + b).toString("utf8").replace(/\0.*$/s, "");
    const name = str(0, 100), prefix = str(345, 155);
    const size = parseInt(str(124, 12).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    const path = prefix ? `${prefix}/${name}` : name;
    const bodyStart = off + 512;
    if (type === "0" || type === "\0") {
      if (path.startsWith("/") || path.split("/").includes("..") || path.includes("\\")) throw new Error(`caminho inseguro no anexo: ${path}`);
      out.push({ path, body: Buffer.from(tar.subarray(bodyStart, bodyStart + size)) });
    }
    off = bodyStart + Math.ceil(size / 512) * 512;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────── escrita imutável

export class Recusa extends Error {
  constructor(message: string) { super(message); this.name = "Recusa"; }
}

/** Grava `bytes` em `path` se não existir; se existir, só aceita bytes idênticos. Devolve se gravou. */
export function gravarImutavel(path: string, bytes: Buffer | string): "gravado" | "ja-arquivado" {
  const body = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
  if (existsSync(path)) {
    if (sha(readFileSync(path)) === sha(body)) return "ja-arquivado";
    throw new Recusa(`${path} já existe com outro conteúdo: o arquivo nunca é sobrescrito`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, { flag: "wx" });
  return "gravado";
}

// ───────────────────────────────────────────────────────────────── snapshots

/** Identidade do código do instrumento num commit: sha256 da listagem `git ls-tree -r` (ids dos blobs + caminhos). */
export function listagemDoCommit(repoDir: string, commit: string): { sha256: string; bytes: number } {
  const listing = execFileSync("git", ["-C", repoDir, "ls-tree", "-r", "--full-tree", commit], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { sha256: sha(listing), bytes: Buffer.byteLength(listing) };
}

export const caminhoReferencia = (refSha: string): string => `snapshots/referencia/${refSha}/referencia.json`;
export const caminhoPlano = (planSha: string): string => `snapshots/plano-de-estados/${planSha}/plano-estados.json`;
export const caminhoManifesto = (campanha: string, manifestSha: string): string => `coletas/${campanha}/${manifestSha}/manifesto-coleta.json`;
export const caminhoCampanha = (campanha: string, campanhaSha: string): string => `campanhas/${campanha}/${campanhaSha}/campaign.json`;
export const caminhoSite = (siteManifestSha: string): string => `sites/${siteManifestSha}`;

/**
 * Grava o site congelado no arquivo, por conteúdo (T8a.1): `site-manifest.json` + só os arquivos que ele
 * lista, cada um conferido pelo sha256 do manifesto (`loadSite`). Recusa se o site-manifest não é o
 * esperado. Reenvio é idempotente (mesmos bytes); git guarda cada blob uma vez entre versões do site.
 */
export function arquivarSite(arquivo: string, telasDir: string, esperado: string): { caminho: string; arquivos: number; bytes: number } {
  const site = loadSite(telasDir);
  if (site.manifestSha256 !== esperado) throw new Recusa(`o site-manifest.json em ${telasDir} (${site.manifestSha256.slice(0, 12)}) não é o do manifesto de coleta (${esperado.slice(0, 12)})`);
  const caminho = caminhoSite(esperado);
  gravarImutavel(join(arquivo, caminho, "site-manifest.json"), readFileSync(join(telasDir, "site-manifest.json")));
  let bytes = 0;
  for (const [p, f] of site.files) {
    gravarImutavel(join(arquivo, caminho, "site", p.slice(1)), f.body);
    bytes += f.body.length;
  }
  return { caminho, arquivos: site.files.size, bytes };
}

/**
 * Conjunto de snapshots de um disparo. Determinístico: os dois braços de um par (mesmos commits,
 * mesmo site, mesma referência) chegam ao mesmo `snapshotSetId`, que a análise de par exige.
 */
export function conjuntoDeSnapshots(m: IsolatedCollectionManifest, instrumento: { sha256: string; bytes: number }): SnapshotManifest {
  const planoBytes = Buffer.byteLength(json(m.statePlan));
  const items: SnapshotManifest["items"] = [
    { id: "site", kind: "site", description: "Site servido às execuções (govbr-telas): sha256 = do site-manifest.json; site/ ao lado, conferido arquivo a arquivo pelo manifesto.",
      sha256: m.site.manifestSha256, bytes: m.site.manifestBytes, immutable: true, exposedToAgent: false, version: m.site.packageVersion,
      location: { kind: "git-commit-path", repo: REPOS.telas, commit: m.repos["govbr-telas"].commit!, path: "site-manifest.json" } },
    { id: "referencia", kind: "reference", description: "Referência congelada da tela (cópia arquivada; nunca exposta ao agente).",
      sha256: m.reference.sha256, bytes: m.reference.bytes, immutable: true, exposedToAgent: false, ...(m.reference.version ? { version: m.reference.version } : {}),
      location: { kind: "archive-repo", repo: REPOS.resultados, path: caminhoReferencia(m.reference.sha256) } },
    { id: "plano-estados", kind: "state-plan", description: "Plano de estados/janelas da referência (sha256 = statePlanSha256, forma canônica).",
      sha256: m.identity.statePlanSha256!, bytes: planoBytes, immutable: true, exposedToAgent: false,
      location: { kind: "archive-repo", repo: REPOS.resultados, path: caminhoPlano(m.identity.statePlanSha256!) } },
    { id: "instrumento", kind: "instrument", description: "Código do instrumento (govbr-eval) no commit do disparo: sha256 da listagem `git ls-tree -r` do commit.",
      sha256: instrumento.sha256, bytes: instrumento.bytes, immutable: true, exposedToAgent: false,
      location: { kind: "git-commit-path", repo: REPOS.eval, commit: m.repos["govbr-eval"].commit!, path: ".", note: "árvore inteira do commit; sha256 = listagem git ls-tree -r --full-tree" } },
  ];
  return { contract: "snapshot-manifest.v1", fixture: m.fixture, snapshotSetId: `snapshots-${sha(canonical(items)).slice(0, 16)}`, createdAt: m.generatedAt, items };
}

// ───────────────────────────────────────────────────────────────── linha de base

export interface RegistroOpcoes {
  bruta: string; manifest: IsolatedCollectionManifest; manifestSha256: string; manifestBytes: number;
  instrumento: { sha256: string; bytes: number }; baselineId?: string; tentativa?: number; rerunOf?: string | null; motivo?: string | null;
}

/** Caminho da linha de base no arquivo. O registro aponta para lá antes mesmo de ser arquivado. */
export const caminhoLinhaDeBase = (campanha: string, tela: string, baselineId: string): string => `linhas-de-base/${campanha}/${tela}/${baselineId}`;

/**
 * Envelope baseline.v1 em volta do bruto FlowBaselines. Recusa bruto sem identidade completa (um
 * registro que não se pode conferir não serve à análise) e confere a identidade contra o manifesto.
 */
export function registrarLinhaDeBase(o: RegistroOpcoes): { registro: Baseline; problemas: string[] } {
  const brutoBytes = readFileSync(o.bruta);
  const bruto = JSON.parse(brutoBytes.toString("utf8")) as FlowBaselines;
  const m = o.manifest;
  const stamp = String(bruto.timestamp ?? new Date().toISOString()).replace(/\.\d+Z$/, "Z");
  const baselineId = o.baselineId ?? `lb-${stamp.replace(/[-:]/g, "").replace("T", "-").replace("Z", "")}-${m.dispatch.screenId}-${sha(brutoBytes).slice(0, 6)}`;
  if (!ID.test(baselineId)) throw new Error(`baselineId inválido: ${baselineId}`);
  const dir = caminhoLinhaDeBase(m.dispatch.campaignId, m.dispatch.screenId, baselineId);
  const snaps = conjuntoDeSnapshots(m, o.instrumento);
  const link = (itemId: string) => {
    const item = snaps.items.find((i) => i.id === itemId)!;
    return { snapshotSetId: snaps.snapshotSetId, itemId, sha256: item.sha256 };
  };
  const finishedMs = Date.parse(stamp) + Math.round((bruto.cost?.wallClockSeconds ?? 0) * 1000);
  const tentativa = o.tentativa ?? (o.rerunOf ? 2 : 1);
  const registro: Baseline = {
    contract: "baseline.v1", fixture: m.fixture, baselineId, campaignId: m.dispatch.campaignId,
    // a versão que o manifesto registra (= screenVersionOf(siteSha256) num manifesto do buildIsolatedManifest)
    screen: { id: m.dispatch.screenId, label: SCREEN_LABELS[m.dispatch.screenId] ?? m.dispatch.screenId, version: m.site.screenVersion ?? screenVersionOf(m.site.siteSha256) },
    attempt: tentativa, rerunOf: o.rerunOf ?? null, rerunReason: o.rerunOf ? (o.motivo ?? null) : null,
    producer: { script: "scripts/run-baselines-flow.ts", baselineVersion: bruto.baselineVersion },
    scope: "bateria", status: bruto.status, error: bruto.status === "failed" ? (bruto.error ?? "falha sem mensagem") : null,
    raw: { sha256: sha(brutoBytes), bytes: brutoBytes.length, location: { kind: "archive-repo", repo: REPOS.resultados, path: `${dir}/bruta.json` } },
    timestamps: { startedAt: stamp, finishedAt: bruto.status === "complete" ? new Date(finishedMs).toISOString().replace(/\.\d+Z$/, "Z") : null },
    links: {
      collectionManifest: { sha256: o.manifestSha256, bytes: o.manifestBytes, location: { kind: "archive-repo", repo: REPOS.resultados, path: caminhoManifesto(m.dispatch.campaignId, o.manifestSha256) } },
      site: link("site"), reference: link("referencia"), statePlan: link("plano-estados"),
    },
    identity: bruto.provenance.identity as Baseline["identity"],
    comparable: ["linha-de-base/validator-nao-guiada", "linha-de-base/axe"],
    diagnosticOnly: ["linha-de-base/validator-guiada"],
    eslint: bruto.eslint ? { status: "measured", absentReason: null } : { status: "absent", absentReason: bruto.eslintAusente ?? "linha de base sem medida de fonte" },
  } as Baseline;
  return { registro, problemas: problemasDaLinhaDeBase(registro, brutoBytes, m, o.manifestSha256) };
}

/** Identidade e completude: o que precisa valer antes de a linha de base ficar utilizável pela análise. */
export function problemasDaLinhaDeBase(registro: Baseline, brutoBytes: Buffer, m: IsolatedCollectionManifest, manifestSha256: string): string[] {
  const p: string[] = [];
  const v = validateContract(registro);
  if (!v.valid) p.push(...v.errors.map((e) => `baseline.v1 ${e.path || "/"} ${e.message}`));
  if (sha(brutoBytes) !== registro.raw.sha256 || brutoBytes.length !== registro.raw.bytes) p.push("bruto ≠ hash/tamanho do registro");
  const bruto = JSON.parse(brutoBytes.toString("utf8")) as FlowBaselines;
  if (bruto.status !== "complete") p.push(`linha de base não completou: ${bruto.error ?? "sem motivo"}`);
  if (bruto.scope !== "bateria") p.push("escopo dev-global nunca é confrontável");
  if (bruto.provenance?.collectionManifest?.sha256 !== manifestSha256) p.push("o bruto mediu outro manifesto de coleta");
  p.push(...compareIdentities(m.identity, bruto.provenance?.identity, { expected: "manifesto", actual: "linha de base" }));
  if (registro.campaignId !== m.dispatch.campaignId || registro.screen.id !== m.dispatch.screenId) p.push("campanha/tela do registro ≠ do manifesto");
  if (bruto.status === "complete" && !(bruto.passes?.length > 0)) p.push("linha de base completa sem nenhuma passada");
  return p;
}

// ───────────────────────────────────────────────────────────────── pacote de execução

/** Confere um pacote de execução: contratos, hashes do manifesto de artefatos contra os bytes, nada a mais. */
export function problemasDoPacote(dir: string): { problemas: string[]; run: Run | null; manifesto: ArtifactManifest | null } {
  const p: string[] = [];
  const read = <T>(f: string): T | null => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf8")) as T : null);
  let run: Run | null = null, manifesto: ArtifactManifest | null = null;
  try {
    run = read<Run>("run.json");
    manifesto = read<ArtifactManifest>("artifact-manifest.json");
  } catch (e) { p.push(`JSON ilegível: ${(e as Error).message}`); }
  if (!run) p.push("run.json ausente");
  if (!manifesto) p.push("artifact-manifest.json ausente");
  if (!run || !manifesto) return { problemas: p, run, manifesto };
  const findings = read<Findings>("findings.json");
  const isolation = read<Isolation>("isolation.json");
  for (const [n, d] of [["run.json", run], ["artifact-manifest.json", manifesto], ["findings.json", findings], ["isolation.json", isolation]] as const) {
    if (!d) continue;
    const v = validateContract(d);
    if (!v.valid) p.push(`${n}: ${v.errors.map((e) => `${e.path || "/"} ${e.message}`).join("; ")}`);
  }
  if (!p.length) for (const e of crossCheckRun(run, findings, isolation)) p.push(`crossCheckRun ${e.path} ${e.message}`);
  const declarados = new Map(manifesto.files.map((f) => [f.path, f]));
  for (const f of manifesto.files) {
    const abs = join(dir, f.path);
    if (!existsSync(abs)) { p.push(`ausente: ${f.path}`); continue; }
    const body = readFileSync(abs);
    if (body.length !== f.bytes || sha(body) !== f.sha256) p.push(`hash/tamanho diverge: ${f.path}`);
  }
  for (const f of listarArquivos(dir)) if (f !== "artifact-manifest.json" && !declarados.has(f)) p.push(`arquivo fora do manifesto: ${f}`);
  if (run.runId !== manifesto.runId) p.push("runId do run.json ≠ do artifact-manifest.json");
  return { problemas: p, run, manifesto };
}

/** Coerência do pacote com o disparo: mesma campanha, slot, braço, tela, site e natureza (fixture). */
export function problemasDeVinculo(run: Run, m: IsolatedCollectionManifest): string[] {
  const p: string[] = [];
  const d = m.dispatch;
  if (run.campaignId !== d.campaignId) p.push(`campanha ${run.campaignId} ≠ ${d.campaignId}`);
  if (run.slotId !== d.slotId) p.push(`slot ${run.slotId} ≠ ${d.slotId}`);
  if (run.arm !== d.arm) p.push(`braço ${run.arm} ≠ ${d.arm}`);
  if (run.screen.id !== d.screenId) p.push(`tela ${run.screen.id} ≠ ${d.screenId}`);
  if (run.screen.version !== m.site.screenVersion) p.push(`versão da tela ${run.screen.version} ≠ ${m.site.screenVersion}`);
  if (run.versions.siteManifestSha256 !== m.identity.siteManifestSha256) p.push("site da execução ≠ site do manifesto");
  if (run.fixture !== m.fixture) p.push(`fixture ${String(run.fixture)} ≠ ${String(m.fixture)} (modo ${d.mode})`);
  if (run.arm === "com" && run.intervention.oracle && (run.intervention.oracle.distSha256 !== m.oracle.distSha256 || run.intervention.oracle.dataSha256 !== m.oracle.dataSha256)) p.push("oráculo da execução ≠ do manifesto");
  return p;
}

/** Procura o VALOR de cada segredo informado em todos os bytes do pacote (nunca o nome). */
export function segredosNoPacote(dir: string, valores: string[]): string[] {
  const alvos = valores.filter((v) => v && v.length >= 8).map((v) => Buffer.from(v, "utf8"));
  if (!alvos.length) return [];
  return listarArquivos(dir).filter((f) => {
    const body = readFileSync(join(dir, f));
    return alvos.some((a) => body.includes(a));
  });
}

const familiaDe = (run: Run): string => /opus|sonnet|haiku/i.exec(run.model.requested)?.[0].toLowerCase() ?? run.model.family;
const carimbo = (iso: string): string => iso.replace(/\.\d+Z$/, "Z").replace(/:/g, "-");

export function pastaDaExecucao(run: Run): string {
  return `${carimbo(run.timestamps.plannedAt)}__${run.screen.id}__${familiaDe(run)}__${run.arm}__rep-${String(run.repetition).padStart(2, "0")}__${run.runId}`;
}

// ───────────────────────────────────────────────────────────────── índice

export type EstadoEntrega = "pendente" | "confirmado" | "falhou" | "nao-se-aplica";
export interface EntradaIndice {
  indice: typeof ARCHIVE_VERSION;
  chave: string;
  tipo: "execucao" | "linha-de-base";
  natureza: "formal" | "ensaio";
  campanha: string; slot: string | null; par: string | null; tela: string; braco: "sem" | "com" | null;
  modelo: string | null; esforco: string | null; modo: string | null;
  dataUtc: string; caminho: string;
  estado: {
    arquivo: "arquivado" | "sem-pacote" | "pacote-invalido" | "retido-segredo";
    tecnico: string | null; isolamento: string | null; oraculo: string | null; submissao: string | null; pontuacao: string | null;
    linhaDeBase: "utilizavel" | "nao-utilizavel" | null;
  };
  motivo: string | null;
  pacote: { artifactManifestSha256: string; arquivos: number; bytes: number } | null;
  evidencias: { estado: EstadoEntrega; release: string | null; anexo: string | null; sha256: string | null; bytes: number | null; url: string | null } | null;
  github: { repositorio: string; execucao: string; url: string } | null;
  manifestoColeta: { sha256: string; caminho: string } | null;
}

/** A entrega só avança: pendente → falhou → confirmado (uma nova tentativa do job pode confirmar o que falhou). */
const ORDEM_ENTREGA: Record<EstadoEntrega, number> = { "nao-se-aplica": 0, pendente: 1, falhou: 2, confirmado: 3 };

/** Entrada já gravada para a chave, se houver (reenvio do mesmo pacote numa nova tentativa do job). */
export function entradaExistente(arquivo: string, chave: string): EntradaIndice | null {
  const path = join(arquivo, "indice", "entradas", `${chave}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as EntradaIndice : null;
}

/**
 * Grava a entrada do índice. Entrada existente só aceita mudança no estado da entrega do anexo, e só
 * para frente (pendente/falhou → confirmado): o resto é imutável como o pacote.
 */
export function gravarEntrada(arquivo: string, e: EntradaIndice): "gravado" | "ja-arquivado" | "atualizado" {
  const path = join(arquivo, "indice", "entradas", `${e.chave}.json`);
  if (!existsSync(path)) return gravarImutavel(path, json(e));
  const antes = JSON.parse(readFileSync(path, "utf8")) as EntradaIndice;
  const semEntrega = (x: EntradaIndice) => canonical({ ...x, evidencias: x.evidencias ? { ...x.evidencias, estado: null, url: null } : null });
  if (semEntrega(antes) !== semEntrega(e)) throw new Recusa(`indice/entradas/${e.chave}.json já existe com outro conteúdo: a execução já foi arquivada de outra forma`);
  if (canonical(antes) === canonical(e)) return "ja-arquivado";
  const a = antes.evidencias?.estado ?? "nao-se-aplica", b = e.evidencias?.estado ?? "nao-se-aplica";
  if (ORDEM_ENTREGA[b] <= ORDEM_ENTREGA[a]) throw new Recusa(`entrega do anexo de ${e.chave} não pode voltar de ${a} para ${b}`);
  writeFileSync(path, json(e));
  return "atualizado";
}

export function lerEntradas(arquivo: string): EntradaIndice[] {
  const dir = join(arquivo, "indice", "entradas");
  return listarArquivos(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as EntradaIndice);
}

const md = (s: unknown): string => String(s ?? "—").replace(/[|\r\n<>]/g, " ");

/**
 * Garante `.gitattributes` com `* -text` na raiz do arquivo: os sha256 gravados são dos bytes exatos, e um
 * clone com core.autocrlf=true converteria LF → CRLF no checkout. Cria se faltar; se existir sem a linha,
 * acrescenta; se já tiver, não mexe (idempotente).
 */
export const GITATTRIBUTES_LINHA = "* -text";
export function garantirGitattributes(arquivo: string): "criado" | "atualizado" | "inalterado" {
  const path = join(arquivo, ".gitattributes");
  if (!existsSync(path)) { mkdirSync(arquivo, { recursive: true }); writeFileSync(path, `${GITATTRIBUTES_LINHA}\n`); return "criado"; }
  const atual = readFileSync(path, "utf8");
  if (atual.split(/\r?\n/).some(l => l.trim() === GITATTRIBUTES_LINHA)) return "inalterado";
  writeFileSync(path, `${atual}${atual === "" || atual.endsWith("\n") ? "" : "\n"}${GITATTRIBUTES_LINHA}\n`);
  return "atualizado";
}

/** Reconstrói indice/indice.json e INDICE.md das entradas. Mais recente primeiro. */
export function reconstruirIndice(arquivo: string): { entradas: number } {
  const entradas = lerEntradas(arquivo).sort((a, b) => b.dataUtc.localeCompare(a.dataUtc) || a.chave.localeCompare(b.chave));
  writeFileSync(join(arquivo, "indice", "indice.json"), json({ indice: ARCHIVE_VERSION, entradas }));
  const L: string[] = [
    "# Índice do arquivo de resultados", "",
    "Gerado de `indice/entradas/` a cada gravação; não edite à mão. Mais recente primeiro. Horários em UTC.",
    "`ensaio` = dublê ou agente roteirizado: nunca dado científico. O pacote de evidências completo de cada",
    "execução é um anexo da Release indicada, com o sha256 abaixo; restaure com `npx tsx scripts/restaurar-execucao.ts`",
    "no govbr-eval.", "",
    "| Data (UTC) | Tipo | Campanha | Tela | Braço | Modelo | Técnico | Isolamento | Oráculo | Submissão | Linha de base | Evidências | Caminho |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const e of entradas) {
    const tipo = e.tipo === "linha-de-base" ? "linha de base" : e.natureza === "ensaio" ? "ensaio" : "execução";
    const tec = e.estado.arquivo === "arquivado" ? e.estado.tecnico : `${e.estado.arquivo}${e.estado.tecnico ? ` (${e.estado.tecnico})` : ""}`;
    const evid = e.evidencias ? `${e.evidencias.estado}${e.evidencias.sha256 ? ` · ${e.evidencias.sha256.slice(0, 12)}` : ""}` : "—";
    L.push(`| ${md(e.dataUtc)} | ${tipo} | ${md(e.campanha)} | ${md(e.tela)} | ${md(e.braco)} | ${md(e.modelo)} | ${md(tec)} | ${md(e.estado.isolamento)} | ${md(e.estado.oraculo)} | ${md(e.estado.submissao)} | ${md(e.estado.linhaDeBase)} | ${md(evid)} | \`${md(e.caminho)}\` |`);
  }
  writeFileSync(join(arquivo, "INDICE.md"), L.join("\n") + "\n");
  return { entradas: entradas.length };
}

// ───────────────────────────────────────────────────────────────── restauração

export interface Restauracao { ok: boolean; conferidos: string[]; problemas: string[] }

/**
 * Recupera uma entrada do índice só com o arquivo (clone do govbr-resultados) e, para execuções, o
 * anexo de evidências baixado. Confere sha256 de tudo; não lê nada do workspace original.
 */
export function restaurar(arquivo: string, chave: string, anexo: string | null, saida: string): Restauracao {
  const ok: string[] = [], p: string[] = [];
  const entradaPath = join(arquivo, "indice", "entradas", `${chave}.json`);
  if (!existsSync(entradaPath)) return { ok: false, conferidos: ok, problemas: [`entrada ${chave} ausente do índice`] };
  const e = JSON.parse(readFileSync(entradaPath, "utf8")) as EntradaIndice;
  if (existsSync(saida) && readdirSync(saida).length) return { ok: false, conferidos: ok, problemas: [`${saida} já existe e não está vazia`] };
  mkdirSync(saida, { recursive: true });
  const base = join(arquivo, e.caminho);
  if (e.manifestoColeta) {
    const b = existsSync(join(arquivo, e.manifestoColeta.caminho)) ? readFileSync(join(arquivo, e.manifestoColeta.caminho)) : null;
    if (!b || sha(b) !== e.manifestoColeta.sha256) p.push("manifesto de coleta ausente ou com sha256 divergente");
    else {
      ok.push(`manifesto de coleta ${e.manifestoColeta.sha256.slice(0, 12)}`);
      const m = JSON.parse(b.toString("utf8")) as IsolatedCollectionManifest;
      const ref = join(arquivo, caminhoReferencia(m.reference.sha256));
      if (!existsSync(ref) || sha(readFileSync(ref)) !== m.identity.referenceSha256) p.push("referência arquivada ausente ou divergente");
      else ok.push(`referência ${m.reference.sha256.slice(0, 12)}`);
      const plano = join(arquivo, caminhoPlano(m.identity.statePlanSha256!));
      if (!existsSync(plano) || statePlanSha256(JSON.parse(readFileSync(plano, "utf8"))) !== m.identity.statePlanSha256) p.push("plano de estados arquivado ausente ou divergente");
      else ok.push(`plano de estados ${m.identity.statePlanSha256!.slice(0, 12)}`);
      // T8a.1: campanha e site por conteúdo (manifesto 1.1.0); manifesto 1.0.0 não os tinha
      if (m.campaign) {
        const c = join(arquivo, caminhoCampanha(m.dispatch.campaignId, m.campaign.sha256));
        if (!existsSync(c) || sha(readFileSync(c)) !== m.campaign.sha256) p.push("campanha arquivada ausente ou divergente");
        else ok.push(`campanha ${m.campaign.sha256.slice(0, 12)}`);
        const s = join(arquivo, caminhoSite(m.identity.siteManifestSha256!));
        let siteOk = false;
        try { siteOk = loadSite(s).manifestSha256 === m.identity.siteManifestSha256; } catch { siteOk = false; }
        if (!siteOk) p.push("site congelado arquivado ausente ou divergente");
        else ok.push(`site ${m.identity.siteManifestSha256!.slice(0, 12)}`);
      }
    }
  }
  if (e.tipo === "linha-de-base") {
    const reg = join(base, "baseline.json"), bruta = join(base, "bruta.json");
    if (!existsSync(reg) || !existsSync(bruta)) p.push("linha de base sem baseline.json/bruta.json");
    else {
      const registro = JSON.parse(readFileSync(reg, "utf8")) as Baseline;
      const bb = readFileSync(bruta);
      const v = validateContract(registro);
      if (!v.valid) p.push("baseline.json fora do contrato");
      if (sha(bb) !== registro.raw.sha256 || bb.length !== registro.raw.bytes) p.push("bruta.json ≠ hash/tamanho do registro");
      else ok.push(`bruto da linha de base ${registro.raw.sha256.slice(0, 12)}`);
      writeFileSync(join(saida, "baseline.json"), readFileSync(reg));
      writeFileSync(join(saida, "bruta.json"), bb);
    }
    return { ok: p.length === 0, conferidos: ok, problemas: p };
  }
  if (e.estado.arquivo === "sem-pacote") return { ok: p.length === 0, conferidos: [...ok, "execução registrada sem pacote (nada a restaurar além do despacho)"], problemas: p };
  if (!e.evidencias?.sha256) return { ok: false, conferidos: ok, problemas: [...p, "entrada sem sha256 do anexo"] };
  if (!anexo || !existsSync(anexo)) return { ok: false, conferidos: ok, problemas: [...p, `anexo ${e.evidencias.anexo} não informado (baixe da Release ${e.evidencias.release})`] };
  const tar = readFileSync(anexo);
  if (sha(tar) !== e.evidencias.sha256) return { ok: false, conferidos: ok, problemas: [...p, "sha256 do anexo ≠ do índice"] };
  ok.push(`anexo ${e.evidencias.sha256.slice(0, 12)} (${tar.length} bytes)`);
  const pasta = basename(e.caminho);
  for (const f of lerTarGz(tar)) {
    if (!f.path.startsWith(`${pasta}/`)) { p.push(`arquivo fora da pasta da execução no anexo: ${f.path}`); continue; }
    const dest = join(saida, f.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, f.body);
  }
  const restaurado = join(saida, pasta);
  const pac = problemasDoPacote(restaurado);
  p.push(...pac.problemas);
  if (!pac.problemas.length) ok.push(`pacote restaurado: ${pac.manifesto!.files.length} arquivos conferidos contra artifact-manifest.json`);
  if (pac.manifesto && e.pacote && sha(readFileSync(join(restaurado, "artifact-manifest.json"))) !== e.pacote.artifactManifestSha256) p.push("artifact-manifest.json do anexo ≠ do índice");
  // as cópias navegáveis no repositório são as mesmas do anexo
  for (const f of listarArquivos(join(base, "pacote"))) {
    const a = readFileSync(join(base, "pacote", f)), b = join(restaurado, f);
    if (!existsSync(b) || sha(readFileSync(b)) !== sha(a)) p.push(`cópia no repositório ≠ anexo: pacote/${f}`);
  }
  if (!p.length) ok.push("cópias do repositório idênticas às do anexo");
  return { ok: p.length === 0, conferidos: ok, problemas: p };
}

