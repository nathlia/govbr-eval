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
 *   tsx scripts/manifesto-coleta-isolada.ts build --out ARQ_NOVO --tela solicitacao [--telas DIR] [--validator DIR]
 *        [--referencia ARQ] --campanha ID --slot ID --par ID --braco sem|com --modo real|duble|roteirizado
 *        [--modelo ID] [--esforco N] [--limite-min N] [--tentativa N] [--repeticao N] [--fixture]
 *   tsx scripts/manifesto-coleta-isolada.ts verify --manifest ARQ
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLLECTION_MANIFEST_VERSION, compareIdentities, gitState, identityProblems, oracleIdentity, readCollectionManifest, sha256,
  statePlanOf, statePlanSha256, type ExecutableIdentity, type StatePlan,
} from "./collection-manifest";
import { ROOT } from "./adjudication";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";
import { referenciaDe, telaOf } from "./telas";

export const ISOLATED_MANIFEST_VERSION = "manifesto-coleta-isolada-1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const COMMIT = /^[a-f0-9]{40}$/;

export interface IsolatedCollectionManifest {
  manifestVersion: typeof ISOLATED_MANIFEST_VERSION;
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
}

/** A identidade da tela que run-once grava em `run.screen.version`: o mesmo texto, para a análise casar. */
export function screenVersionOf(siteSha256: string): string {
  return `govbr-telas-site-${siteSha256.slice(0, 12)}`;
}
export const SCREEN_LABELS: Record<string, string> = { solicitacao: "Solicitar serviço", vistorias: "Vistorias" };

export interface BuildOptions {
  tela: string; telasDir: string; validatorDir: string; referencePath?: string;
  campanha: string; slot: string; par: string; braco: "sem" | "com"; modo: "real" | "duble" | "roteirizado";
  modelo: string | null; esforco: string | null; limiteMin: number; tentativa: number; repeticao: number;
  github?: IsolatedCollectionManifest["dispatch"]["github"];
}

export function buildIsolatedManifest(o: BuildOptions): IsolatedCollectionManifest {
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
  const manifest: IsolatedCollectionManifest = {
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
  };
  const problems = isolatedManifestProblems(manifest);
  if (problems.length) throw new Error(`manifesto de coleta incompleto; nada foi gravado: ${problems.join("; ")}`);
  return manifest;
}

export function isolatedManifestProblems(m: IsolatedCollectionManifest): string[] {
  const p = identityProblems("identidade", m.identity);
  if (m.manifestVersion !== ISOLATED_MANIFEST_VERSION) p.push(`versão ${String(m.manifestVersion)}`);
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
  return p;
}

export function readIsolatedManifest(path: string): { manifest: IsolatedCollectionManifest; sha256: string; bytes: number } {
  const bytes = readFileSync(path);
  const manifest = JSON.parse(bytes.toString("utf8")) as IsolatedCollectionManifest;
  if (manifest.manifestVersion !== ISOLATED_MANIFEST_VERSION) throw new Error(`manifesto de coleta isolada de versão desconhecida: ${String(manifest.manifestVersion)}`);
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
  if (head.manifestVersion === ISOLATED_MANIFEST_VERSION) {
    const { manifest, sha256: sha } = readIsolatedManifest(path);
    return { versao: ISOLATED_MANIFEST_VERSION, identity: manifest.identity, referencePath: manifest.reference.path, sha256: sha };
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
    tentativa: Number(val("--tentativa") ?? 1), repeticao: Number(val("--repeticao") ?? 1), github: gh,
  });
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  console.log(`manifesto de coleta isolada: ${out}`);
  console.log(`  site ${manifest.identity.siteManifestSha256!.slice(0, 12)} · referência ${manifest.identity.referenceSha256!.slice(0, 12)} · plano ${manifest.identity.statePlanSha256!.slice(0, 12)} · oráculo ${manifest.identity.oracleDistSha256!.slice(0, 12)}`);
  console.log(`MANIFEST_SHA256=${sha256(readFileSync(out))}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
