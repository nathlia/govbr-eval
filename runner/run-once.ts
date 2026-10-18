/**
 * run-once — UMA execução isolada (T3 do plano do benchmark isolado; T3a: agente roteirizado).
 *
 *   npm run run-once -- --tela solicitacao|vistorias --braco sem|com|ferramentas --modelo <id> --esforco <nível>
 *        --limite-min 90 --saida <dir-novo> --agente fake|claude [--cenario honesto] [--permitir-modelo]
 *        [--campanha id] [--slot id] [--par id] [--tentativa 1] [--repeticao 1] [--run-id id]
 *        [--larguras 1280x900,390x844] [--egress stub|real] [--limite-seg N] [--telas dir] [--validator dir]
 *
 * Ciclo: preflight (imagens travadas, hashes do site, skill e prompt, oráculo) → infraestrutura nova
 * (redes internas + contêineres) → controles positivos do controlador → sonda negativa com a MESMA
 * configuração do agente → agente → limite de tempo aplicado matando o grupo inteiro → coleta →
 * desmontagem total → pacote (run.json, findings.json se aceito, isolation.json, tool-events.ndjson,
 * artifact-manifest.json + evidence/), validado contra os contratos (validateContract + crossCheckRun).
 * Falha obrigatória no preflight ou na sonda: o agente não parte e o run.json sai `not-run`.
 *
 * NAT-61 (três braços): `com` sobe o oráculo no perfil evaluation e `ferramentas` no knowledge-free (a mesma
 * imagem; runner/perfis-oraculo.ts). Todo braço com oráculo recebe a janela do primeiro navegador
 * (GOVBR_VALIDATOR_VIEWPORT, fora do esquema MCP) e uma ponte com `--allow` = as ferramentas do perfil.
 * O perfil que vai para o run.json (run.v2) é o MEDIDO — tools/list do servidor na ponte (nomes + sha256
 * fixado) e marca de telemetria —, nunca o rótulo do braço. No braço ferramentas, além disso: trava de
 * conhecimento = 0 na telemetria e varredura do dicionário sobre os payloads integrais (scripts/vazamento/).
 *
 * `--agente claude` (T3b) roda o binário real do Claude Code com os flags de produção (cliente-claude.ts):
 *   --egress stub  contra um DUBLÊ ROTEIRIZADO da API (sem modelo, credencial falsa, `fixture: true`,
 *                  `provider.name: "stub"`); `--cenario` escolhe o roteiro (honesto | erros | 429 | 529).
 *                  Recusa `--permitir-modelo`: modo dublê nunca vira dado.
 *   --egress real  contra o provedor real; recusa partir sem `--permitir-modelo` E exatamente uma
 *                  credencial no ambiente (ANTHROPIC_API_KEY ou CLAUDE_CODE_OAUTH_TOKEN).
 * Docs: docs/runner-isolado.md.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  assertContract, crossCheckRun, validateContract,
  crossCheckManifest,
  type AnyArtifactManifest, type AnyFindings, type ArtifactManifest, type ArtifactManifestV2, type FindingsContract, type Isolation, type Metric, type Run,
  type OracleIdentityV2, type RunV2,
} from "../contracts/index";
import { PERFIL_DO_BRACO, PERFIS, allowDoBraco, perfilMedido, temOraculo, toolsListSha256, type Braco, type InventarioOraculo } from "./perfis-oraculo";
import { varrerPayloadsDoOraculo, type RelatorioVazamento } from "../scripts/vazamento/conhecimento";
import { gitState, oracleIdentity } from "../scripts/collection-manifest";
import { TOOL_PAYLOAD_PATH, rebaseToolPayloads, verifyToolPayloads } from "../scripts/tool-payloads";
import {
  CREDENTIAL_ENV, EFFORT_LEVELS, FAKE_CREDENTIAL, ORACLE_SERVER_NAME, STUB_SCENARIOS,
  claudeCommand, clientFailure, oracleAdherence, parseClientStream, stubRoteiro, summarizeStub, type StubRoteiro,
} from "./cliente-claude";
import { generateStubTls } from "./container/tls-cert.mjs";
import { renderRun, SKILL_PATH, type TaskInputs } from "../scripts/render-task-prompt";
import {
  DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR, EVAL_ROOT, ISOLATION_POLICY_VERSION, RUNNER_DIR, RUNNER_VERSION, TCC_ROOT,
  docker, dockerAvailable, imageId, loadLock, nowUtc, sha256, type ImagesLock,
} from "./lib";

// ───────────────────────────────────────────────────────────────── política

/**
 * NAT-81: envelope que o harness arma no coletor, pelo rótulo da imagem travada. Sem rótulo (imagem
 * anterior ao NAT-81) → só findings.v1. Nunca depende do braço nem do texto do agente.
 */
export function collectorFindingsContract(labels: Record<string, string> | undefined): { contracts: string[]; armed: FindingsContract } {
  const contracts = (labels?.["govbr.collector.findings-contracts"] ?? "findings.v1").split(",").map((c) => c.trim()).filter(Boolean);
  return { contracts, armed: contracts.includes("findings.v2") ? "findings.v2" : "findings.v1" };
}

/**
 * Destinos que o PROCESSO DO AGENTE alcança pelo proxy do provedor (CONNECT, 443). Nada mais sai.
 * T3b: com o cliente real contra o dublê (chave de API falsa e token OAuth falso), o cliente só abriu
 * túnel para api.anthropic.com (POST /v1/messages, GET /api/claude_code/settings e /policy_limits).
 * platform.claude.com saiu da allowlist: não foi tentado com nenhum dos dois tipos de credencial.
 * Se a prova com credencial real (piloto) mostrar recusa a outro host, o log do proxy a registra.
 */
export const PROVIDER_ALLOWLIST = [
  { host: "api.anthropic.com", port: 443, status: "exercitado com o cliente real contra o dublê (T3b)", why: "API do Claude (inferência) e configuração remota do cliente" },
] as const;
/** Fora da allowlist de propósito: claude.ai, claude.com (login interativo), platform.claude.com (OAuth
 * interativo; não tentado com token por ambiente no T3b), downloads.claude.ai, registry.npmjs.org,
 * mcp-proxy.anthropic.com, telemetria (datadoghq) — a imagem desliga tráfego não essencial. */
export const PROVIDER_DENIED_ON_PURPOSE = ["claude.ai", "claude.com", "platform.claude.com", "downloads.claude.ai", "registry.npmjs.org", "mcp-proxy.anthropic.com", "http-intake.logs.us5.datadoghq.com", "storage.googleapis.com", "github.com"];
/** Nomes a que o dublê responde (aliases na rede interna). platform.claude.com fica no dublê para que
 * uma tentativa do cliente apareça como recusa no proxy, não como falha de DNS. */
const STUB_HOSTS = ["api.anthropic.com", "platform.claude.com"];
const SITE_ALLOW = ["screens:3300", "collector:8080"];
const SCREENS_ORIGIN = "http://screens:3300";
const COLLECTOR_ORIGIN = "http://collector:8080/";
const OLD_PORTS = [3000, 4000, 4100, 4101, 4102];
const SECRET_ENV_NAMES: readonly string[] = CREDENTIAL_ENV;
/** Ferramenta adiada que o cliente 2.1.288 sempre anuncia, sem esquema, com a instrução de nunca chamá-la. */
const DEFERRED_PLACEHOLDERS = ["DeferredToolPlaceholder"];

export type Tela = "solicitacao" | "vistorias";
export interface RunOptions {
  tela: Tela;
  braco: Braco;
  modelo: string;
  esforco: string;
  limiteSeg: number;
  saida: string;
  agente: "fake" | "claude";
  cenario: string;
  permitirModelo: boolean;
  campanha: string;
  slot: string;
  par: string;
  tentativa: number;
  repeticao: number;
  runId?: string;
  larguras?: string[];
  egress: "stub" | "real";
  telasDir: string;
  validatorDir: string;
  /** Pastas de outras execuções que a sonda e o agente tentam ler (padrão: a pasta-mãe da saída). */
  outrasSaidas?: string[];
  log?: (line: string) => void;
}
export interface RunOutcome { exitCode: number; runDir: string; run: RunV2; problems: string[] }

interface CheckRow { id: string; category: Isolation["checks"][number]["category"]; target: string; required: boolean; outcome: "passed" | "failed" | "not-exercised"; detail?: string; evidence?: string | null }
interface PositiveRow { id: string; target: string; outcome: "passed" | "failed"; detail?: string; evidence?: string | null }

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const COMMON_FLAGS = ["--read-only", "--tmpfs", "/tmp:rw,nosuid,size=768m", "--tmpfs", "/home/runner:rw,nosuid,size=64m,uid=10001,gid=10001,mode=700", "--cap-drop", "ALL",
  "--security-opt", "no-new-privileges", "--pids-limit", "768", "--memory", "2g", "--user", "10001:10001", "--init", "-e", "HOME=/home/runner"];

// ───────────────────────────────────────────────────────────────── entradas da tarefa

export function taskInputs(tela: Tela, telasDir: string, larguras: string[] | undefined, limiteSeg: number): TaskInputs {
  const conf = (JSON.parse(readFileSync(join(RUNNER_DIR, "telas-runner.json"), "utf8")) as Record<string, { escopo: string; larguras: string[] }>)[tela];
  if (!conf) throw new Error(`tela desconhecida: ${tela}`);
  const manifest = JSON.parse(readFileSync(join(telasDir, "site-manifest.json"), "utf8")) as { screens: { id: string; entry: string }[] };
  const entry = manifest.screens.find((s) => s.id === tela)?.entry;
  if (!entry) throw new Error(`site-manifest.json não declara a tela ${tela}`);
  const ws = (larguras ?? conf.larguras).map((s) => {
    const m = /^(\d+)x(\d+)$/.exec(s);
    if (!m) throw new Error(`largura inválida: ${s}`);
    return { width: Number(m[1]), height: Number(m[2]) };
  });
  return {
    url: `${SCREENS_ORIGIN}${entry}`,
    escopo: conf.escopo,
    larguras: ws,
    meioLarguras: ws.length > 1
      ? "a ferramenta de navegador `browser_select_window`: cada largura declarada tem o próprio navegador, aberto com tamanho fixo e sem estado compartilhado com os outros; selecione a largura e repita nela a navegação desde o início."
      : null,
    envio: { origem: COLLECTOR_ORIGIN, caminho: "/api/submit" },
    limites: { tempoMinutos: Math.max(1, Math.ceil(limiteSeg / 60)), maxTurnos: null },
  };
}

/**
 * Configuração MCP que o cliente recebe. A única diferença entre os braços é a entrada do oráculo; com e
 * ferramentas recebem a MESMA entrada (o mesmo nome de servidor, decisão 7): o perfil fica no contêiner.
 */
export function mcpConfig(braco: Braco): { mcpServers: Record<string, { type: "http"; url: string }> } {
  const servers: Record<string, { type: "http"; url: string }> = { playwright: { type: "http", url: "http://browser:8931/mcp" } };
  if (temOraculo(braco)) servers[ORACLE_SERVER_NAME] = { type: "http", url: "http://oracle:8932/mcp" };
  return { mcpServers: servers };
}

export { claudeCommand } from "./cliente-claude";

// ───────────────────────────────────────────────────────────────── utilidades

const iso = (d = new Date()): string => d.toISOString().replace(/\.\d+Z$/, "Z");
const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const readJson = <T>(p: string): T | null => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) as T : null);
const readNdjson = (p: string): Record<string, unknown>[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []);
const measured = (value: number, source: string): Metric => ({ value, status: "measured", source });
const na = (): Metric => ({ value: null, status: "not-applicable" });
const unavailable = (): Metric => ({ value: null, status: "unavailable" });

function listFiles(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    return e.isDirectory() ? listFiles(join(dir, e.name), rel) : [rel];
  });
}

/**
 * Servidor-sentinela no loopback do host, num PROCESSO PRÓPRIO: o runner usa docker síncrono, que
 * bloquearia um servidor no mesmo laço de eventos. Faz o papel do painel antigo (que servia o repo
 * inteiro): um alvo real e alcançável fora da política.
 */
function hostSentinelServer(token: string, bindHost: string): Promise<{ child: ChildProcess; port: number }> {
  const script = "require('http').createServer((q,r)=>{r.writeHead(200,{'content-type':'text/plain'});r.end(process.env.T+'\\n'+q.url+'\\n')})" +
    ".listen(0,process.env.H,function(){console.log(this.address().port)})";
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['-e', script], { env: { T: token, H: bindHost }, stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout!.once('data', (d: Buffer) => resolvePromise({ child, port: Number(d.toString().trim()) }));
    child.once('error', reject);
  });
}

/**
 * Docker Desktop (Windows/macOS: `host.docker.internal` leva ao loopback do host) × Docker Engine
 * nativo (Linux: runner do GitHub, dind), onde esse nome não existe por padrão e o loopback do host não
 * é alcançável de contêiner nenhum. No nativo, o servidor-sentinela escuta no gateway da rede `bridge`
 * padrão (o "host" visto de um contêiner comum) e o controle positivo o alcança por `host-gateway`;
 * as redes internas da execução não têm rota para lá — é o que a sonda confere.
 */
export function dockerEngine(): { nativo: boolean; os: string; bridgeGateway: string | null } {
  const os = docker(["info", "--format", "{{.OperatingSystem}}"], { allowFail: true, timeoutMs: 20_000 }).stdout.trim();
  const nativo = os !== "" && !/Docker Desktop/i.test(os);
  const gw = nativo ? docker(["network", "inspect", "bridge", "--format", "{{range .IPAM.Config}}{{.Gateway}} {{end}}"], { allowFail: true }).stdout.trim().split(/\s+/)
    .find((g) => /^\d+\.\d+\.\d+\.\d+$/.test(g)) ?? null : null;
  return { nativo, os, bridgeGateway: gw };
}

/**
 * No Linux, o que os contêineres (usuário 10001) gravaram em /out pertence a eles: um runner não-root
 * não conseguiria apagar a pasta de trabalho depois de copiá-la. Um contêiner de manutenção, sem rede,
 * devolve a posse ao usuário do runner. No Docker Desktop o bind mount não tem dono; nada a fazer.
 */
function devolverPosse(dir: string, image: string): void {
  const getuid = (process as { getuid?: () => number }).getuid, getgid = (process as { getgid?: () => number }).getgid;
  if (process.platform === "win32" || !getuid || !getgid || getuid() === 0) return;
  docker(["run", "--rm", "--network", "none", "--user", "0", "--cap-drop", "ALL", "--cap-add", "CHOWN", "--cap-add", "FOWNER", "--cap-add", "DAC_OVERRIDE",
    "--mount", `type=bind,src=${dir},dst=/w`, image, "chown", "-R", `${getuid()}:${getgid()}`, "/w"], { allowFail: true, timeoutMs: 120_000 });
}

function waitLog(name: string, pattern: RegExp, timeoutMs: number): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = docker(["logs", name], { allowFail: true });
    if (pattern.test(r.stdout + r.stderr)) return true;
    const st = docker(["inspect", "-f", "{{.State.Running}}", name], { allowFail: true }).stdout.trim();
    if (st === "false") return false;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  return false;
}

/** `docker wait` com limite. Devolve código de saída ou "timeout". */
function waitContainer(name: string, timeoutMs: number): Promise<number | "timeout"> {
  return new Promise((resolvePromise) => {
    const child = spawn("docker", ["wait", name], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    const timer = setTimeout(() => {
      child.kill();
      resolvePromise("timeout");
    }, timeoutMs);
    child.on("close", () => {
      clearTimeout(timer);
      const code = Number(out.trim());
      resolvePromise(Number.isFinite(code) && out.trim() !== "" ? code : "timeout");
    });
  });
}

// ───────────────────────────────────────────────────────────────── execução

export async function runOnce(opts: RunOptions): Promise<RunOutcome> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const plannedAt = iso();
  const stamp = plannedAt.replace(/[-:]/g, "").replace("T", "-").replace("Z", "");
  const runId = opts.runId ?? `${stamp}-${opts.tela}-${opts.braco}-${randomBytes(2).toString("hex")}`;
  if (!ID.test(runId) || !ID.test(opts.campanha) || !ID.test(opts.slot) || !ID.test(opts.par)) throw new Error("ids inválidos (run, campanha, slot, par)");
  const runDir = resolve(opts.saida);
  if (existsSync(runDir) && readdirSync(runDir).length > 0) throw new Error(`${runDir} já existe e não está vazio: cada execução tem a própria saída, nova`);
  mkdirSync(runDir, { recursive: true });
  const work = join(runDir, ".work");
  const roles = ["task", "agent", "probe", "browser", "oracle", "collector", "egress-provider", "egress-site", "provider-stub"];
  for (const r of roles) {
    mkdirSync(join(work, r), { recursive: true });
    // Linux: o usuário 10001 dos contêineres grava na saída do próprio papel (no Docker Desktop, sem efeito)
    if (process.platform !== "win32" && r !== "task") chmodSync(join(work, r), 0o777);
  }
  // entradas do dublê (certificado + chave do servidor + roteiro): fora de `roles`, nunca copiadas ao pacote
  mkdirSync(join(work, "stub-in"), { recursive: true });
  const short = runId.replace(/[^A-Za-z0-9]/g, "").slice(-10).toLowerCase() + randomBytes(2).toString("hex");
  const cname = (role: string): string => `gr-${short}-${role}`;
  const nname = (net: string): string => `gr-${short}-${net}`;
  const label = ["--label", `govbr.run=${runId}`];
  /** Cliente real contra o dublê roteirizado: nunca modelo, nunca credencial real, sempre fixture. */
  const claudeStub = opts.agente === "claude" && opts.egress === "stub";
  const fixture = opts.agente === "fake" || claudeStub;

  const integrity: CheckRow[] = [];
  const positives: PositiveRow[] = [];
  const runtimeChecks: CheckRow[] = [];
  const capabilities: string[] = [];
  const limitations: string[] = [];
  const notExercised: string[] = [];
  const evidence = (name: string, content: unknown): string => {
    const rel = `evidence/${name}`;
    mkdirSync(dirname(join(runDir, rel)), { recursive: true });
    writeFileSync(join(runDir, rel), typeof content === "string" ? content : json(content));
    return rel;
  };
  const integ = (id: string, target: string, ok: boolean, detail: string): void => {
    integrity.push({ id, category: "integrity", target, required: true, outcome: ok ? "passed" : "failed", detail });
  };

  // ── preflight: imagens, conteúdo, texto da tarefa
  let lock: ImagesLock | null = null;
  const dockerState = dockerAvailable();
  integ("docker", "Docker disponível", dockerState.ok, dockerState.detail);
  const engine = dockerState.ok ? dockerEngine() : { nativo: false, os: "", bridgeGateway: null };
  if (engine.nativo) integ("docker-nativo", "Docker Engine nativo: gateway da rede bridge padrão (alvo do controle positivo do host)", engine.bridgeGateway !== null, `${engine.os} · ${engine.bridgeGateway ?? "sem gateway"}`);
  try {
    lock = loadLock();
  } catch (e) {
    integ("imagens-travadas", "runner/images.lock.json", false, (e as Error).message);
  }
  const needed: (keyof ImagesLock["images"])[] = ["screens", "agent", "collector", "egress", ...(temOraculo(opts.braco) ? ["oracle" as const] : [])];
  if (lock && dockerState.ok) {
    for (const n of needed) {
      const live = imageId(lock.images[n].tag);
      integ(`imagem-${n}`, `${lock.images[n].tag} = ${lock.images[n].id.slice(0, 19)}…`, live === lock.images[n].id, live ?? "ausente");
    }
  }
  // NAT-81: o envelope de achados é escolha do HARNESS, nunca do agente nem do texto da tarefa: o mais novo
  // que a imagem travada do coletor declara saber armar. Imagem sem o rótulo (construída antes do NAT-81)
  // só conhece findings.v1. O agente real recebe a skill que pede o registro de inspeção; um coletor que
  // recusaria esse registro não pode partir (o modelo pagaria por recusas). O agente roteirizado não lê a skill.
  const { contracts: collectorContracts, armed: findingsContract } = collectorFindingsContract(lock?.images.collector.labels);
  if (opts.agente === "claude") {
    integ("coletor-registro-de-inspecao", "a imagem travada do coletor arma findings.v2 (registro de inspeção que a skill pede); reconstrua as imagens se não",
      findingsContract === "findings.v2", `${lock?.images.collector.tag ?? "sem lock"}: ${collectorContracts.join(", ")}`);
  }
  const telasManifestText = existsSync(join(opts.telasDir, "site-manifest.json")) ? readFileSync(join(opts.telasDir, "site-manifest.json")) : Buffer.from("");
  const telasManifestSha = sha256(telasManifestText);
  if (lock) integ("site-manifest", "site-manifest.json do govbr-telas = conteúdo embutido na imagem das telas", telasManifestSha === lock.versions.telas.manifestSha256 && lock.images.screens.labels["govbr.telas.manifest-sha256"] === telasManifestSha, `${telasManifestSha} × ${lock.versions.telas.manifestSha256}`);
  const skillPkgPath = join(opts.telasDir, "skills", "avaliar-tela", "SKILL.md");
  const skillPkg = existsSync(skillPkgPath) ? readFileSync(skillPkgPath) : Buffer.from("");
  const skillEval = readFileSync(SKILL_PATH);
  integ("skill", "skill do pacote do agente = skill do instrumento", sha256(skillPkg) === sha256(skillEval), `${sha256(skillPkg).slice(0, 12)} × ${sha256(skillEval).slice(0, 12)}`);
  let rendered: ReturnType<typeof renderRun> | null = null;
  let inputs: TaskInputs | null = null;
  try {
    inputs = taskInputs(opts.tela, opts.telasDir, opts.larguras, opts.limiteSeg);
    rendered = renderRun(skillPkg.toString("utf8"), { task: inputs, arm: opts.braco, runId, collectorToken: null, oracleProfile: PERFIL_DO_BRACO[opts.braco] });
    integ("texto-da-tarefa", "texto renderizado da skill + entradas, sem vocabulário proibido", true, rendered.promptSha256);
  } catch (e) {
    integ("texto-da-tarefa", "texto renderizado da skill + entradas", false, (e as Error).message);
  }
  const oracleNow = temOraculo(opts.braco) ? oracleIdentity(opts.validatorDir) : null;
  if (temOraculo(opts.braco) && lock) {
    integ("oraculo", "dist/ e data/ do validador = distribuição embutida na imagem do oráculo",
      oracleNow?.distSha256 === lock.versions.oracle.distSha256 && oracleNow?.dataSha256 === lock.versions.oracle.dataSha256,
      `${oracleNow?.distSha256?.slice(0, 12)}/${oracleNow?.dataSha256?.slice(0, 12)} × ${lock.versions.oracle.distSha256.slice(0, 12)}/${lock.versions.oracle.dataSha256.slice(0, 12)}`);
  }
  let roteiro: StubRoteiro | null = null;
  let credentialEnv: string[] = [];
  let authMethod: Run["provider"]["authMethod"] = "unknown";
  if (opts.agente === "claude") {
    integ("esforco-do-cliente", `esforço aceito pelo cliente (${EFFORT_LEVELS.join(", ")})`, EFFORT_LEVELS.includes(opts.esforco), opts.esforco);
    if (claudeStub) {
      integ("duble-sem-modelo-real", "modo dublê: nenhuma chamada a modelo, nenhuma credencial real (recusa --permitir-modelo)", !opts.permitirModelo,
        opts.permitirModelo ? "--permitir-modelo não vale com --egress stub: o dublê nunca produz dado" : "credencial falsa fixa; ambiente do runner não é repassado");
      try {
        if (rendered && inputs) roteiro = stubRoteiro(opts.cenario, opts.braco, inputs, rendered.promptSha256);
        integ("roteiro-do-duble", `roteiro do dublê (${STUB_SCENARIOS.join(" | ")})`, roteiro !== null, roteiro ? `${roteiro.name}: ${roteiro.steps.length} turnos` : "sem texto da tarefa");
      } catch (e) {
        integ("roteiro-do-duble", `roteiro do dublê (${STUB_SCENARIOS.join(" | ")})`, false, (e as Error).message);
      }
      if (roteiro) {
        const fake = FAKE_CREDENTIAL[roteiro.credential];
        credentialEnv = ["-e", `${fake.env}=${fake.value}`];
        for (const [k, v] of Object.entries(roteiro.clientEnv ?? {})) credentialEnv.push("-e", `${k}=${v}`);
        authMethod = roteiro.credential === "oauth" ? "oauth-subscription" : "api-key";
      }
    } else {
      const cred = SECRET_ENV_NAMES.filter((k) => process.env[k]);
      integ("cliente-real-autorizado", "cliente real exige --permitir-modelo e exatamente uma credencial no ambiente", opts.permitirModelo && cred.length === 1,
        `--permitir-modelo=${opts.permitirModelo}; credencial=${cred.length === 0 ? "ausente" : cred.length === 1 ? "presente" : "duas (escolha uma)"}`);
      // só o NOME vai na linha de comando do docker: o valor sai do ambiente do runner direto para o contêiner
      credentialEnv = cred.length === 1 ? ["-e", cred[0]] : [];
      authMethod = cred[0] === "ANTHROPIC_API_KEY" ? "api-key" : cred[0] === "CLAUDE_CODE_OAUTH_TOKEN" ? "oauth-subscription" : "unknown";
    }
  }
  const harness = gitState(EVAL_ROOT);
  const preflightDoc = { runner: RUNNER_VERSION, policy: ISOLATION_POLICY_VERSION, plannedAt, harness, dockerEngine: engine, lock: lock ? { images: Object.fromEntries(Object.entries(lock.images).map(([k, v]) => [k, { tag: v.tag, id: v.id }])), versions: lock.versions } : null,
    telasManifestSha, skillSha256: sha256(skillPkg), prompt: rendered ? { sha256: rendered.promptSha256, templateSha256: rendered.templateSha256, bytes: rendered.bytes } : null,
    oracle: oracleNow, providerAllowlist: PROVIDER_ALLOWLIST, providerDeniedOnPurpose: PROVIDER_DENIED_ON_PURPOSE,
    agent: { kind: opts.agente, provider: opts.agente === "fake" ? null : claudeStub ? "stub" : "real", roteiro: roteiro?.name ?? null,
      credentialEnv: credentialEnv.length ? credentialEnv[1].split("=")[0] : null } };

  // ── estado para o pacote
  let agentStartedAt: string | null = null;
  let agentFinishedAt: string | null = null;
  let agentExit: number | "timeout" | null = null;
  let probeDoc: { checks: CheckRow[]; positiveControls: PositiveRow[]; inventory: Record<string, { ok: boolean; tools?: string[] }> } | null = null;
  /** Linhas do log do proxy do provedor antes do agente partir: o que vem depois é do agente (a sonda usa o mesmo proxy). */
  let egressLinesBeforeAgent = 0;
  let notRunReason: { reason: "preflight-failed" | "isolation-failed" | "harness-error"; detail: string } | null = null;
  /** NAT-61: perfil do oráculo medido na ponte ANTES do agente (inventário do servidor); diverge → o agente não parte. */
  const oracleChecks: CheckRow[] = [];
  const containers: string[] = [];
  const networks: string[] = [];
  let sentinelHost: { child: ChildProcess; port: number } | null = null;
  const sentinelDir = join(TCC_ROOT, ".govbr-sentinelas", runId);
  const sentinelToken = `SENTINELA-${randomBytes(12).toString("hex")}`;
  const sentinelFiles = [
    join(sentinelDir, "govbr-eval", "ground-truth-sentinela.json"),
    join(sentinelDir, "govbr-resultados", "execucao-sentinela.json"),
    join(sentinelDir, "thesis-workspace", "tese-sentinela.md"),
    join(sentinelDir, "home", ".claude", "historico-sentinela.json"),
  ];
  const otherRuns = opts.outrasSaidas ?? [dirname(runDir)];

  const teardown = (): { containersLeft: string[]; networksLeft: string[] } => {
    const ids = docker(["ps", "-aq", "--filter", `label=govbr.run=${runId}`], { allowFail: true }).stdout.split(/\s+/).filter(Boolean);
    if (ids.length) docker(["rm", "-f", "-v", ...ids], { allowFail: true });
    const nets = docker(["network", "ls", "-q", "--filter", `label=govbr.run=${runId}`], { allowFail: true }).stdout.split(/\s+/).filter(Boolean);
    if (nets.length) docker(["network", "rm", ...nets], { allowFail: true });
    return {
      containersLeft: docker(["ps", "-aq", "--filter", `label=govbr.run=${runId}`], { allowFail: true }).stdout.split(/\s+/).filter(Boolean),
      networksLeft: docker(["network", "ls", "-q", "--filter", `label=govbr.run=${runId}`], { allowFail: true }).stdout.split(/\s+/).filter(Boolean),
    };
  };

  const preflightOk = integrity.every((c) => c.outcome === "passed");
  let teardownState = { containersLeft: [] as string[], networksLeft: [] as string[] };
  let containerConfigs: Record<string, unknown> = {};
  if (!preflightOk) {
    notRunReason = { reason: "preflight-failed", detail: integrity.filter((c) => c.outcome !== "passed").map((c) => `${c.id}: ${c.detail}`).join("; ") };
    log(`preflight falhou — o agente não parte: ${notRunReason.detail}`);
  } else {
    const L = lock!;
    const R = rendered!;
    try {
      // sentinelas no host + servidor-sentinela no loopback do host
      for (const f of sentinelFiles) {
        mkdirSync(dirname(f), { recursive: true });
        writeFileSync(f, JSON.stringify({ sentinela: sentinelToken, nota: "arquivo falso plantado pelo runner; nenhum conteúdo real" }) + "\n");
      }
      sentinelHost = await hostSentinelServer(sentinelToken, engine.nativo ? engine.bridgeGateway! : "127.0.0.1");
      const hostPorts = [sentinelHost.port];

      // tarefa (montada só-leitura no agente e na sonda)
      writeFileSync(join(work, "task", "prompt.txt"), R.prompt);
      writeFileSync(join(work, "task", "mcp.json"), json(mcpConfig(opts.braco)));
      // dublê do provedor: CA de teste nova por execução (o cliente confia nela via NODE_EXTRA_CA_CERTS);
      // a chave do servidor fica só em stub-in/, que não entra no pacote; a chave da CA nem é gravada.
      if (opts.egress === "stub") {
        const tls = generateStubTls(STUB_HOSTS);
        writeFileSync(join(work, "stub-in", "cert.pem"), tls.cert);
        writeFileSync(join(work, "stub-in", "key.pem"), tls.key);
        writeFileSync(join(work, "task", "provider-ca.pem"), tls.caCert);
        writeFileSync(join(work, "stub-in", "roteiro.json"), json(roteiro ?? { name: "nenhum (agente roteirizado)", promptSha256: R.promptSha256, credential: "api-key", steps: [], final: "ok" }));
      }

      // redes
      const net = { site: nname("site"), browse: nname("browse"), tools: nname("tools"), egress: nname("egress"), up: nname("up") };
      for (const [k, n] of Object.entries(net)) {
        const internal = !(k === "up" && opts.egress === "real");
        docker(["network", "create", ...(internal ? ["--internal"] : []), ...label, n]);
        networks.push(n);
      }
      const create = (role: string, image: string, nets: [string, string][], extra: string[], cmd: string[], out: string | null): string => {
        const name = cname(role);
        const [first, ...rest] = nets;
        docker(["create", "--name", name, ...label, "--label", `govbr.role=${role}`, ...COMMON_FLAGS,
          "--network", first[0], "--network-alias", first[1],
          ...(out ? ["--mount", `type=bind,src=${join(work, out)},dst=/out`] : []), ...extra, image, ...cmd]);
        for (const [n, alias] of rest) docker(["network", "connect", "--alias", alias, n, name]);
        containers.push(name);
        return name;
      };
      const start = (name: string, ready: RegExp, label2: string): void => {
        docker(["start", name]);
        if (!waitLog(name, ready, 90_000)) throw new Error(`${label2} não ficou pronto: ${docker(["logs", "--tail", "30", name], { allowFail: true }).stderr.slice(0, 600)}`);
      };
      const egressImage = L.images.egress.id;
      create("screens", L.images.screens.id, [[net.site, "screens"]], [], [], null);
      create("collector", L.images.collector.id, [[net.site, "collector"]], ["-e", `COLLECTOR_RUN_ID=${runId}`, "-e", `COLLECTOR_CAMPAIGN_ID=${opts.campanha}`, "-e", `COLLECTOR_FIXTURE=${fixture ? "1" : "0"}`, "-e", `COLLECTOR_FINDINGS_CONTRACT=${findingsContract}`], [], "collector");
      create("egress-site", egressImage, [[net.site, "egress-site"], [net.browse, "egress-site"]],
        ["-e", "EGRESS_NAME=egress-site", "-e", `EGRESS_ALLOW_HTTP=${SITE_ALLOW.join(",")}`, "-e", "EGRESS_ALLOW_CONNECT=", "-e", "EGRESS_LOG=/out/egress.ndjson"], [], "egress-site");
      create("egress-provider", egressImage, [[net.egress, "egress"], [net.up, "egress-up"]],
        ["-e", "EGRESS_NAME=egress-provider", "-e", "EGRESS_ALLOW_HTTP=", "-e", `EGRESS_ALLOW_CONNECT=${PROVIDER_ALLOWLIST.map((a) => `${a.host}:${a.port}`).join(",")}`, "-e", "EGRESS_LOG=/out/egress.ndjson"], [], "egress-provider");
      if (opts.egress === "stub") {
        create("provider-stub", egressImage, [[net.up, STUB_HOSTS[0]]], [...STUB_HOSTS.slice(1).flatMap((h) => ["--network-alias", h]), "--sysctl", "net.ipv4.ip_unprivileged_port_start=0",
          "--mount", `type=bind,src=${join(work, "stub-in")},dst=/run/stub,readonly`, "-e", "STUB_DIR=/run/stub", "-e", "STUB_OUT=/out"], ["node", "/opt/egress/stub.mjs"], "provider-stub");
      }
      const windows = inputs!.larguras.map((w) => `${w.width}x${w.height}`).join(",");
      const oracleWindow = `${inputs!.larguras[0].width}x${inputs!.larguras[0].height}`;
      create("browser", L.images.agent.id, [[net.browse, "browser"], [net.tools, "browser"]], ["--shm-size", "512m"],
        ["node", "/opt/runner/bridge.mjs", "--name", "playwright", "--port", "8931", "--windows", windows, "--events", "/out/tool-events.ndjson", "--inventory", "/out/inventory.json", "--",
          "node", "/opt/runner/node_modules/@playwright/mcp/cli.js", "--headless", "--browser", "chromium", "--no-sandbox", "--isolated", "--block-service-workers",
          "--viewport-size", "{VIEWPORT}", "--proxy-server", "http://egress-site:3128", "--output-dir", "/tmp/pw-{INDEX}"], "browser");
      if (temOraculo(opts.braco)) {
        // NAT-61: o perfil sai da tabela braço → perfil; a janela do oráculo é a do primeiro navegador (D-131 (a));
        // a ponte só deixa passar as ferramentas do perfil (segunda trava)
        create("oracle", L.images.oracle.id, [[net.browse, "oracle"], [net.tools, "oracle"]], ["--shm-size", "512m",
          "-e", `GOVBR_VALIDATOR_TOOL_PROFILE=${PERFIL_DO_BRACO[opts.braco]}`, "-e", `GOVBR_VALIDATOR_VIEWPORT=${oracleWindow}`,
          "-e", "GOVBR_VALIDATOR_PROXY_SERVER=http://egress-site:3128",
          "-e", `GOVBR_VALIDATOR_ALLOWED_ORIGINS=${SCREENS_ORIGIN}`, "-e", "GOVBR_VALIDATOR_REPORTS_DIR=/tmp/reports",
          "-e", "GOVBR_VALIDATOR_TELEMETRY_FILE=/out/oracle-telemetry.ndjson", "-e", `GOVBR_VALIDATOR_RUN_ID=${runId}`],
        ["node", "/opt/runner/bridge.mjs", "--name", "oracle", "--port", "8932", "--allow", allowDoBraco(opts.braco).join(","), "--events", "/out/tool-events.ndjson", "--inventory", "/out/inventory.json", "--",
          "node", "/opt/oracle/dist/index.js"], "oracle");
      }
      start(cname("screens"), /Servidor das telas em/, "telas");
      start(cname("collector"), /coletor armado/, "coletor");
      start(cname("egress-site"), /egress-site em/, "proxy do navegador");
      start(cname("egress-provider"), /egress-provider em/, "proxy do provedor");
      if (opts.egress === "stub") start(cname("provider-stub"), /stub do provedor pronto/, "dublê do provedor");
      start(cname("browser"), /ponte playwright em/, "ponte do navegador");
      if (temOraculo(opts.braco)) {
        start(cname("oracle"), /ponte oracle em/, "ponte do oráculo");
        // perfil medido antes de qualquer agente: o tools/list que o SERVIDOR anunciou à ponte (nomes + sha256) e o exposto
        oracleChecks.push(...checksDoPerfil(opts.braco, readJson<InventarioOraculo>(join(work, "oracle", "inventory.json")), [], "inventário da ponte no arranque, antes da sonda e do agente", "-no-arranque"));
        const falho = oracleChecks.filter((c) => c.required && c.outcome === "failed");
        if (falho.length) throw Object.assign(new Error(`perfil do oráculo diverge do braço: ${falho.map((c) => c.detail).join("; ")}`), { notRun: "isolation-failed" });
      }
      log(`infraestrutura pronta (${containers.length} contêineres, ${networks.length} redes internas${opts.egress === "real" ? " + saída real do proxy do provedor" : ""})`);

      // ── controles positivos do controlador
      const tokenRead = sentinelFiles.every((f) => readFileSync(f, "utf8").includes(sentinelToken));
      positives.push({ id: "sentinelas-no-host", target: `${sentinelFiles.length} arquivos-sentinela legíveis pelo controlador`, outcome: tokenRead ? "passed" : "failed", detail: sentinelFiles.map((f) => relative(TCC_ROOT, f).replace(/\\/g, "/")).join(", ") });
      const hostCtl = docker(["run", "--rm", ...label, "--network", "bridge", ...(engine.nativo ? ["--add-host", "host.docker.internal:host-gateway"] : []), "--read-only", "--cap-drop", "ALL", "--user", "10001:10001", L.images.agent.id, "node", "-e",
        `const n=require('net');const s=n.connect(${sentinelHost.port},'host.docker.internal');let b='';s.on('data',d=>b+=d);s.on('connect',()=>s.write('GET /controle HTTP/1.0\\r\\n\\r\\n'));s.on('end',()=>{console.log(b.includes('${sentinelToken}')?'ALCANCOU':'SEM-TOKEN');});s.on('error',e=>console.log('ERRO '+e.code));setTimeout(()=>{console.log('TIMEOUT');process.exit(0)},5000)`], { allowFail: true, timeoutMs: 60_000 });
      positives.push({ id: "host-alcancavel-fora-da-politica", target: `servidor-sentinela no ${engine.nativo ? `gateway da rede bridge do host (${engine.bridgeGateway})` : "loopback do host"} (porta ${sentinelHost.port}) alcançado por um contêiner comum (rede bridge padrão)`, outcome: /ALCANCOU/.test(hostCtl.stdout) ? "passed" : "failed", detail: hostCtl.stdout.trim() || hostCtl.stderr.trim().slice(0, 200) });
      const hostname = docker(["exec", cname("browser"), "cat", "/etc/hostname"], { allowFail: true });
      positives.push({ id: "arquivo-local-do-navegador", target: "/etc/hostname existe no contêiner do navegador (alvo do teste de file://)", outcome: hostname.code === 0 && hostname.stdout.trim().length > 0 ? "passed" : "failed" });
      const viaProxy = (url: string): string => docker(["exec", cname("browser"), "node", "-e",
        `const h=require('http');h.get({host:'egress-site',port:3128,path:${JSON.stringify(url)},headers:{host:new URL(${JSON.stringify(url)}).host}},r=>{console.log(r.statusCode)}).on('error',e=>console.log('ERRO '+e.code))`], { allowFail: true }).stdout.trim();
      const siteStatus = viaProxy(inputs!.url);
      positives.push({ id: "tela-pelo-proxy", target: `${inputs!.url} pelo proxy do navegador`, outcome: siteStatus === "200" ? "passed" : "failed", detail: siteStatus });
      const collStatus = viaProxy(`${COLLECTOR_ORIGIN}health`);
      positives.push({ id: "coletor-pelo-proxy", target: "coletor /health pelo proxy do navegador", outcome: collStatus === "200" ? "passed" : "failed", detail: collStatus });
      const otherRunVisible = otherRuns.filter((p) => existsSync(p));
      positives.push({ id: "outras-saidas-existem", target: "pastas de outras execuções existem no host (alvo das tentativas de leitura)", outcome: otherRunVisible.length > 0 ? "passed" : "failed", detail: otherRunVisible.map((p) => basename(p)).join(", ") });

      // ── sonda negativa: mesma imagem, flags, montagens, redes e ambiente do agente
      const agentNets: [string, string][] = [[net.tools, "agent"], [net.egress, "agent"]];
      const agentEnv = ["-e", `GOVBR_RUN_ID=${runId}`, "-e", "HTTPS_PROXY=http://egress:3128", "-e", "HTTP_PROXY=http://egress:3128", "-e", "NO_PROXY=browser,oracle",
        // única diferença do caminho de produção no modo dublê: confiar na CA de teste desta execução
        ...(opts.egress === "stub" ? ["-e", "NODE_EXTRA_CA_CERTS=/run/task/provider-ca.pem"] : [])];
      const taskMount = ["--mount", `type=bind,src=${join(work, "task")},dst=/run/task,readonly`];
      const probeCfg = {
        out: "/out/probe.json", sentinelPaths: sentinelFiles, otherRunPaths: otherRuns, hostPorts, egress: "egress:3128", providerStub: opts.egress === "stub",
        mcp: Object.fromEntries(Object.entries(mcpConfig(opts.braco).mcpServers).map(([k, v]) => [k === ORACLE_SERVER_NAME ? "oracle" : k, v.url])),
        oracleExpected: temOraculo(opts.braco), oracleTools: temOraculo(opts.braco) ? allowDoBraco(opts.braco) : null,
      };
      const probe = create("probe", L.images.agent.id, agentNets, [...agentEnv, "-e", `PROBE_CONFIG=${JSON.stringify(probeCfg)}`, ...taskMount], ["node", "/opt/runner/probe.mjs"], "probe");
      docker(["start", probe]);
      const probeExit = await waitContainer(probe, 180_000);
      evidence("logs/probe.log", docker(["logs", probe], { allowFail: true }).stdout);
      probeDoc = readJson(join(work, "probe", "probe.json"));
      if (probeExit !== 0 || !probeDoc) throw Object.assign(new Error(`sonda não concluiu (${probeExit})`), { notRun: "harness-error" });
      for (const p of probeDoc.positiveControls) positives.push(p);
      const failedProbe = probeDoc.checks.filter((c) => c.required && c.outcome !== "passed");
      const failedPositive = positives.filter((p) => p.outcome !== "passed");
      if (failedProbe.length || failedPositive.length) {
        notRunReason = { reason: "isolation-failed", detail: [...failedProbe.map((c) => `check ${c.id}`), ...failedPositive.map((p) => `controle ${p.id}`)].join("; ") };
        log(`isolamento não comprovado — o agente não parte: ${notRunReason.detail}`);
      }

      // ── agente
      if (!notRunReason) {
        const fakeCfg = { sentinelPaths: sentinelFiles, otherRunPaths: otherRuns, hostPorts, egress: "egress:3128" };
        const cmd = opts.agente === "fake" ? ["node", "/opt/runner/fake-agent.mjs"] : claudeCommand(opts);
        const extraEnv = opts.agente === "fake" ? ["-e", `FAKE_SCENARIO=${opts.cenario}`, "-e", `FAKE_CONFIG=${JSON.stringify(fakeCfg)}`] : credentialEnv;
        egressLinesBeforeAgent = readNdjson(join(work, "egress-provider", "egress.ndjson")).length;
        const agent = create("agent", L.images.agent.id, agentNets, [...agentEnv, ...extraEnv, ...taskMount], cmd, "agent");
        containerConfigs = Object.fromEntries(containers.map((c) => [c.replace(`gr-${short}-`, ""), normalizedConfig(c, short, runId, sentinelHost?.port ?? null)]));
        agentStartedAt = iso();
        docker(["start", agent]);
        log(`agente (${opts.agente}${opts.agente === "fake" ? `:${opts.cenario}` : ""}) iniciado; limite ${opts.limiteSeg}s`);
        agentExit = await waitContainer(agent, opts.limiteSeg * 1000);
        agentFinishedAt = iso();
        if (agentExit === "timeout") {
          log("limite de tempo: matando o grupo inteiro de contêineres");
          const ids = docker(["ps", "-q", "--filter", `label=govbr.run=${runId}`], { allowFail: true }).stdout.split(/\s+/).filter(Boolean);
          if (ids.length) docker(["kill", ...ids], { allowFail: true });
        }
      }
      if (!Object.keys(containerConfigs).length) containerConfigs = Object.fromEntries(containers.map((c) => [c.replace(`gr-${short}-`, ""), normalizedConfig(c, short, runId, sentinelHost?.port ?? null)]));
      for (const c of containers) evidence(`logs/${c.replace(`gr-${short}-`, "")}.log`, (() => { const r = docker(["logs", c], { allowFail: true }); return r.stdout + r.stderr; })());
    } catch (e) {
      const err = e as Error & { notRun?: string };
      if (!agentStartedAt) notRunReason = { reason: err.notRun === "isolation-failed" ? "isolation-failed" : "harness-error", detail: err.message };
      else limitations.push(`erro do harness depois do início do agente: ${err.message}`);
      log(`erro do harness: ${err.message}`);
      for (const c of containers) evidence(`logs/${c.replace(`gr-${short}-`, "")}.log`, (() => { const r = docker(["logs", c], { allowFail: true }); return r.stdout + r.stderr; })());
    } finally {
      teardownState = teardown();
      if (lock) devolverPosse(work, lock.images.egress.id);
      sentinelHost?.child.kill();
      rmSync(sentinelDir, { recursive: true, force: true });
      try { rmdirSync(join(TCC_ROOT, ".govbr-sentinelas")); } catch { /* outra execução ainda usa */ }
    }
  }

  // ── pacote
  return await writePackage();

  async function writePackage(): Promise<RunOutcome> {
    const problems: string[] = [];
    evidence("preflight.json", { ...preflightDoc, integrity });
    if (rendered) evidence("prompt.txt", rendered.prompt);
    evidence("mcp-config.json", mcpConfig(opts.braco));
    if (roteiro) evidence("roteiro-do-duble.json", roteiro);
    if (Object.keys(containerConfigs).length) evidence("container-config.json", containerConfigs);
    // brutos de cada papel → evidence/raw/<papel>
    const raw = join(runDir, "evidence", "raw");
    for (const r of roles) {
      const src = join(work, r);
      if (listFiles(src).length) {
        mkdirSync(raw, { recursive: true });
        cpSync(src, join(raw, r), { recursive: true });
      }
    }
    rmSync(work, { recursive: true, force: true });
    const rawPath = (r: string, f: string): string => join(raw, r, f);

    // NAT-82: a ponte cita o payload integral relativo ao próprio /out; no pacote, o caminho é o da cópia bruta
    const browserEvents = readNdjson(rawPath("browser", "tool-events.ndjson")).map((e) => rebaseToolPayloads(e, "evidence/raw/browser"));
    const oracleEvents = readNdjson(rawPath("oracle", "tool-events.ndjson")).map((e) => rebaseToolPayloads(e, "evidence/raw/oracle"));
    const toolEvents = [...browserEvents, ...oracleEvents].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    writeFileSync(join(runDir, "tool-events.ndjson"), toolEvents.map((e) => JSON.stringify(e)).join("\n") + (toolEvents.length ? "\n" : ""));
    const browserInv = readJson<{ exposed: string[]; hidden: string[] }>(rawPath("browser", "inventory.json"));
    const oracleInv = readJson<InventarioOraculo>(rawPath("oracle", "inventory.json"));
    const oracleTelemetry = readNdjson(rawPath("oracle", "oracle-telemetry.ndjson"));
    const egressProvider = readNdjson(rawPath("egress-provider", "egress.ndjson"));
    const egressSite = readNdjson(rawPath("egress-site", "egress.ndjson"));
    const collectorEvents = readNdjson(rawPath("collector", "events.ndjson"));
    // cliente real: telemetria do stream-json e, no modo dublê, o que o "modelo" recebeu
    const client = opts.agente === "claude" && agentStartedAt ? parseClientStream(rawPath("agent", "claude-stream.ndjson")) : null;
    const stubSeen = claudeStub && rendered ? summarizeStub(join(raw, "provider-stub"), rendered.promptSha256) : null;
    const agentConnects = egressProvider.slice(egressLinesBeforeAgent).filter((e) => e.kind === "connect");
    if (client) evidence("cliente.json", { client, stub: stubSeen, providerConnectsDuringAgent: agentConnects.map((e) => ({ target: e.target, allowed: e.allowed, status: e.status })) });

    // checks de execução (só se o agente rodou)
    const ran = agentStartedAt !== null;
    if (ran) {
      const drift = browserEvents.filter((e) => e.kind === "drift");
      runtimeChecks.push({ id: "janela-sem-deriva", category: "tools", target: "a janela de cada navegador ficou no tamanho fixado do começo ao fim (medido pela ponte depois de cada chamada)", required: true, outcome: drift.length === 0 ? "passed" : "failed", detail: drift.length ? JSON.stringify(drift).slice(0, 400) : `${browserEvents.filter((e) => e.viewportAfter).length} medições, nenhuma deriva`, evidence: "tool-events.ndjson" });
      const leakProvider = egressProvider.filter((e) => e.allowed === true && e.kind === "connect" && !PROVIDER_ALLOWLIST.some((a) => e.target === `${a.host}:${a.port}`));
      runtimeChecks.push({ id: "egress-provedor-durante-a-execucao", category: "network", target: "proxy do provedor só deixou passar a allowlist durante a execução", required: true, outcome: leakProvider.length === 0 ? "passed" : "failed", detail: `${egressProvider.filter((e) => e.allowed === false).length} recusas, ${egressProvider.filter((e) => e.allowed === true && e.kind === "connect").length} túneis permitidos`, evidence: "evidence/raw/egress-provider/egress.ndjson" });
      const leakSite = egressSite.filter((e) => e.allowed === true && e.kind === "http" && !SITE_ALLOW.some((h) => String(e.target).startsWith(`http://${h}/`)));
      runtimeChecks.push({ id: "egress-navegador-durante-a-execucao", category: "network", target: "proxy dos navegadores só deixou passar a tela e o coletor", required: true, outcome: leakSite.length === 0 ? "passed" : "failed", detail: `${egressSite.filter((e) => e.allowed === false).length} recusas`, evidence: "evidence/raw/egress-site/egress.ndjson" });
      if (temOraculo(opts.braco)) {
        runtimeChecks.push(...await checksDoOraculoNaExecucao());
      }
      if (opts.braco === "sem") {
        const ok = oracleEvents.length === 0 && !oracleInv && (browserInv?.exposed ?? []).every((t) => t.startsWith("browser_"));
        runtimeChecks.push({ id: "oraculo-ausente-durante-a-execucao", category: "tools", target: "braço sem: nenhum servidor do oráculo, nenhuma ferramenta dele anunciada, zero chamadas", required: true, outcome: ok ? "passed" : "failed", detail: `eventos do oráculo: ${oracleEvents.length}` });
      }
      if (opts.agente === "claude") {
        // inventário efetivo do cliente: o que ele diz ter (init) e, no dublê, o que mandou ao "modelo"
        const expected = [...(browserInv?.exposed ?? []).map((t) => `mcp__playwright__${t}`), ...(oracleInv?.exposed ?? []).map((t) => `mcp__${ORACLE_SERVER_NAME}__${t}`)].sort();
        const same = (xs: string[] | undefined): boolean => JSON.stringify([...(xs ?? [])].sort()) === JSON.stringify(expected);
        const initTools = client?.init?.tools;
        // o cliente anuncia um marcador adiado (DeferredToolPlaceholder, defer_loading: true, "never call"); sem ferramenta
        // de busca, o modelo não tem como carregá-lo. Qualquer OUTRA ferramenta adiada reprova.
        const callable = stubSeen ? stubSeen.advertisedTools.filter((t) => !stubSeen.deferredTools.includes(t)) : [];
        const deferredOk = stubSeen ? stubSeen.deferredTools.every((t) => DEFERRED_PLACEHOLDERS.includes(t)) : true;
        const toolsOk = Boolean(client?.init) && same(initTools) && (!claudeStub || (stubSeen !== null && same(callable) && deferredOk && stubSeen.advertisedStable));
        runtimeChecks.push({ id: "ferramentas-do-cliente", category: "tools", required: true, outcome: toolsOk ? "passed" : "failed", evidence: "evidence/cliente.json",
          target: `o cliente real só tem (e só anuncia ao modelo) as ferramentas MCP das pontes: ${opts.braco === "sem" ? "navegador" : `navegador + oráculo (perfil ${PERFIL_DO_BRACO[opts.braco]})`}; nenhuma ferramenta interna (Bash, Read, Write, WebFetch, Task…)`,
          detail: JSON.stringify({ esperado: expected.length, init: initTools ?? null, anunciadoAoModelo: stubSeen?.advertisedTools ?? "não observável sem o dublê", adiadas: stubSeen?.deferredTools ?? null }).slice(0, 4000) });
        const configured = Object.keys(mcpConfig(opts.braco).mcpServers).sort();
        const init = client?.init;
        const extOk = Boolean(init) && init!.skills.length === 0 && init!.slashCommands.length === 0 && init!.plugins.every((p) => p.source.endsWith("@builtin"))
          && JSON.stringify(init!.mcpServers.map((m) => m.name).sort()) === JSON.stringify(configured) && init!.mcpServers.every((m) => m.status === "connected");
        runtimeChecks.push({ id: "extensoes-do-cliente", category: "tools", required: true, outcome: extOk ? "passed" : "failed", evidence: "evidence/cliente.json",
          target: "cliente sem skills, comandos, plugins instalados ou servidores MCP além dos configurados; os configurados conectados pela ponte",
          detail: JSON.stringify(init ? { mcp: init.mcpServers, skills: init.skills, comandos: init.slashCommands, plugins: init.plugins, agentes: init.agents, credencial: init.apiKeySource } : "sem evento init").slice(0, 4000) });
        runtimeChecks.push(claudeStub
          ? { id: "texto-da-tarefa-entregue", category: "integrity", required: true, outcome: stubSeen?.promptDelivered ? "passed" : "failed", evidence: "evidence/cliente.json",
            target: "o texto da tarefa chega ao modelo byte a byte igual ao renderizado (hash da mensagem do usuário no 1º pedido = hash do texto)", detail: rendered?.promptSha256 }
          : { id: "texto-da-tarefa-entregue", category: "integrity", required: false, outcome: "not-exercised", evidence: null,
            target: "texto da tarefa no pedido ao provedor: não observável sem o dublê (o mesmo comando e o mesmo arquivo do modo dublê)" });
        const foreign = agentConnects.filter((e) => !PROVIDER_ALLOWLIST.some((a) => e.target === `${a.host}:${a.port}`));
        runtimeChecks.push({ id: "hosts-do-cliente", category: "network", required: false, outcome: foreign.length === 0 ? "passed" : "failed", evidence: "evidence/raw/egress-provider/egress.ndjson",
          target: "o cliente só tentou hosts da allowlist do provedor (informativo: uma tentativa fora dela é recusada pelo proxy, não vaza)",
          detail: [...new Set(agentConnects.map((e) => `${String(e.target)}:${e.allowed ? "permitido" : "recusado"}`))].join(", ") || "nenhum túnel" });
        for (const t of client?.toolErrors ?? []) capabilities.push(`erro devolvido pelo cliente ao modelo: ${t.tool} (${t.text.slice(0, 120)})`);
      }
      for (const e of browserEvents.filter((x) => x.kind === "refused")) capabilities.push(`recusado pela ponte: ${String(e.tool)} (${String(e.reason)})`);
      for (const e of [...egressSite, ...egressProvider].filter((x) => x.allowed === false)) capabilities.push(`recusado pelo ${String(e.proxy)}: ${String(e.method)} ${String(e.target)}`);
      for (const e of collectorEvents.filter((x) => typeof x.status === "number" && (x.status as number) >= 400)) capabilities.push(`recusado pelo coletor: ${String(e.method)} ${String(e.path)} → ${String(e.status)} (${String(e.reason ?? "")})`);
    }
    if (containers.length) {
      runtimeChecks.push({ id: "desmontagem", category: "state", target: "nenhum contêiner nem rede da execução sobrevive (perfil do navegador, storage e mocks morrem com eles)", required: true,
        outcome: teardownState.containersLeft.length === 0 && teardownState.networksLeft.length === 0 ? "passed" : "failed", detail: JSON.stringify(teardownState) });
    }
    const probeChecks = (probeDoc?.checks ?? []).map((c) => ({ ...c, evidence: "evidence/raw/probe/probe.json" }));
    if (opts.agente === "fake") {
      notExercised.push(
        "cliente real (Claude Code) e suas ferramentas internas: o agente roteirizado prova as paredes, não as capacidades efetivas do cliente (ver os casos do cliente real contra o dublê)",
        opts.egress === "real" ? "túnel permitido até o provedor real: não aberto pelo agente roteirizado (só recusas com saída real)" : "saída real para o provedor: a allowlist do proxy foi exercitada contra um dublê numa rede interna, sem internet",
      );
      limitations.push("agente roteirizado: nenhuma chamada a modelo; uma recusa aqui é do sistema, não de um LLM");
    } else if (claudeStub) {
      notExercised.push(
        "modelo real: os turnos vieram de um roteiro escrito à mão (dublê); o comportamento de um modelo (o que tenta, o que usa) só a execução real mostra",
        "autenticação real e hosts que só aparecem com credencial válida: credencial falsa, o dublê não confere nada",
        "saída real para o provedor: o túnel permitido termina no dublê, numa rede interna",
        "timeout de ferramenta: a ponte corta em 120 s (transport-error), não exercitado aqui",
      );
      limitations.push("cliente real contra dublê roteirizado: nenhuma chamada a modelo; tokens, modelo e custo são os números fixos do dublê, nunca dado");
    } else {
      notExercised.push("pedido ao provedor (ferramentas anunciadas ao modelo, texto da tarefa): só observável contra o dublê; aqui vale o inventário que o cliente declara (init)");
    }
    if (harness.dirty) limitations.push("govbr-eval com alterações locais no momento da execução (harnessCommit não descreve tudo)");

    const allChecks: CheckRow[] = [...integrity, ...oracleChecks, ...probeChecks, ...runtimeChecks];
    const isolationRan = probeDoc !== null;
    const anyFailed = allChecks.some((c) => c.required && c.outcome === "failed") || positives.some((p) => p.outcome === "failed");
    const isolationResult: Isolation["result"] = !isolationRan ? (anyFailed && notRunReason?.reason === "isolation-failed" ? "failed" : "unverified")
      : anyFailed ? "failed" : allChecks.every((c) => !c.required || c.outcome === "passed") && positives.length > 0 ? "passed" : "unverified";

    let isolationDoc: Isolation | null = null;
    if (isolationRan || integrity.length) {
      const announced = [...(browserInv?.exposed ?? probeDoc?.inventory?.playwright?.tools ?? []), ...(oracleInv?.exposed ?? probeDoc?.inventory?.oracle?.tools ?? [])];
      const observed = [...new Set(toolEvents.filter((e) => e.kind === "call").map((e) => String(e.tool)))];
      const result: Isolation["result"] = !isolationRan ? (integrity.some((c) => c.outcome === "failed") ? "failed" : "unverified") : isolationResult;
      isolationDoc = {
        contract: "isolation.v1", fixture, campaignId: opts.campanha, runId, policyVersion: ISOLATION_POLICY_VERSION, producedBy: "harness", producedAt: iso(), result,
        checks: allChecks.map((c) => ({ id: c.id, category: c.category, target: c.target, required: c.required, outcome: c.outcome, evidence: c.evidence ?? null, ...(c.detail ? { detail: String(c.detail).slice(0, 4000) } : {}) })),
        positiveControls: positives.map((p) => ({ id: p.id, target: p.target, outcome: p.outcome, evidence: p.evidence ?? evidence("controles-positivos.json", positives) })),
        toolInventory: { announced, observed, oracleAnnounced: Boolean(oracleInv?.exposed?.length) || Boolean(probeDoc?.inventory?.oracle?.tools?.length) },
        capabilitiesObserved: [...new Set(capabilities)].slice(0, 400), notExercised, limitations,
      };
    }

    // submissão
    const findingsRaw = readJson<AnyFindings>(rawPath("collector", "findings.json"));
    const refused = listFiles(join(raw, "collector", "refused"));
    for (const f of refused) { mkdirSync(join(runDir, "refused"), { recursive: true }); cpSync(join(raw, "collector", "refused", f), join(runDir, "refused", f)); }
    if (findingsRaw) writeFileSync(join(runDir, "findings.json"), json(findingsRaw));
    const lastRefusal = refused.length ? JSON.parse(readFileSync(join(runDir, "refused", refused[refused.length - 1]), "utf8")) as { reason: string } : null;
    const submission: Run["submission"] = findingsRaw ? { status: "accepted", findings: "findings.json", refusal: null }
      : lastRefusal ? { status: "refused", findings: null, refusal: { reason: lastRefusal.reason.slice(0, 500), archivedBody: `refused/${refused[refused.length - 1]}` } }
      : { status: "none", findings: null, refusal: null };

    // estados
    const cf = client ? clientFailure(client) : null;
    let technical: Run["status"]["technical"];
    let lifecycle: Run["lifecycle"];
    let failure: Run["failure"] = null;
    if (notRunReason) {
      technical = "not-run";
      lifecycle = { state: "not-started", stage: "preflight" };
      failure = { stage: "preflight", reason: notRunReason.reason === "harness-error" ? "preflight-failed" : notRunReason.reason, detail: notRunReason.detail.slice(0, 2000) || "falha no preflight" };
    } else if (agentExit === "timeout") {
      technical = "interrupted";
      lifecycle = { state: "interrupted", stage: "running" };
      failure = { stage: "running", reason: "timeout", detail: `limite de ${opts.limiteSeg}s atingido; grupo de contêineres morto, evidência preservada` };
    } else if (cf && submission.status !== "accepted") {
      // erro de API relatado pelo cliente (429, 529, autenticação…): motivo próprio, nunca "zero achados"
      technical = cf.interrupted ? "interrupted" : "failed";
      lifecycle = { state: cf.interrupted ? "interrupted" : "failed", stage: "running" };
      failure = { stage: "running", reason: cf.reason, detail: `${cf.detail}; submissão: ${submission.status}`.slice(0, 2000) };
    } else if (submission.status === "accepted" && agentExit === 0) {
      technical = "passed";
      lifecycle = { state: "collected", stage: null };
    } else if (submission.status === "accepted") {
      technical = "failed";
      lifecycle = { state: "failed", stage: "running" };
      failure = { stage: "running", reason: cf?.reason ?? "harness-error", detail: cf ? `relatório aceito, depois ${cf.detail}` : `relatório aceito, mas o agente saiu com código ${agentExit}` };
    } else if (submission.status === "refused") {
      technical = "failed";
      lifecycle = { state: "failed", stage: "collecting" };
      failure = { stage: "collecting", reason: /JSON inválido/.test(lastRefusal?.reason ?? "") ? "output-malformed" : "output-refused", detail: lastRefusal?.reason.slice(0, 500) ?? "recusado" };
    } else {
      technical = "failed";
      lifecycle = { state: "failed", stage: "running" };
      failure = { stage: "running", reason: "no-submission", detail: `o agente terminou (código ${String(agentExit)}) sem enviar relatório; isto não é "zero achados"` };
    }
    if (isolationDoc && isolationDoc.result === "failed" && technical === "passed") limitations.push("isolamento falhou depois da coleta: execução em quarentena");

    const oracleCalls = oracleEvents.filter((e) => e.kind === "call");
    const absentVerified = Boolean(isolationDoc) && !isolationDoc!.toolInventory.oracleAnnounced && runtimeChecks.find((c) => c.id === "oraculo-ausente-durante-a-execucao")?.outcome === "passed" && probeChecks.find((c) => c.id === "oraculo-ausente")?.outcome === "passed";
    const adherence = oracleAdherence(opts.braco, technical !== "not-run", absentVerified, oracleEvents, oracleInv?.exposed ?? [], findingsRaw ? findingsRaw.report.findings as { rule: unknown }[] : null);
    const oracleUsage: Run["status"]["oracleUsage"] = adherence.usage;
    if (technical !== "not-run") evidence("aderencia-oraculo.json", adherence);

    const browserCalls = browserEvents.filter((e) => e.kind === "call" || e.kind === "refused").length;
    const wall = agentStartedAt && agentFinishedAt ? (Date.parse(agentFinishedAt) - Date.parse(agentStartedAt)) / 1000 : null;
    const L = lock;
    const tokens = (k: "input" | "output" | "cacheRead" | "cacheCreation"): Metric => opts.agente === "fake" ? na()
      : client?.result?.usage ? measured(client.result.usage[k], `stream-json do cliente (result.usage)${claudeStub ? "; números fixos do dublê" : ""}`) : unavailable();
    // NAT-61: identidade do oráculo com o perfil MEDIDO (inventário do servidor + telemetria). Sem medida (não
    // partiu antes da ponte), fica o pedido para o braço, declarado como não medido nas limitações.
    let oracleIdentityDoc: OracleIdentityV2 | null = null;
    if (temOraculo(opts.braco) && L) {
      const pedido = PERFIL_DO_BRACO[opts.braco]!;
      const medido = perfilMedido(oracleInv, oracleTelemetry);
      if (!oracleInv) limitations.push(`perfil do oráculo não medido (a ponte não chegou a gravar o inventário): run.json registra o pedido para o braço, ${pedido}`);
      oracleIdentityDoc = {
        package: L.versions.oracle.package, version: L.versions.oracle.version, distSha256: L.versions.oracle.distSha256, dataSha256: L.versions.oracle.dataSha256,
        profile: oracleInv ? (medido.perfil ?? "combined") : pedido,
        tools: oracleInv && oracleInv.exposed.length ? [...oracleInv.exposed].sort() : [...PERFIS[pedido].tools],
        toolsListSha256: oracleInv?.exposedToolsSha256 ?? PERFIS[pedido].toolsListSha256,
      };
      if (oracleInv && !medido.perfil) limitations.push(`perfil do oráculo não reconhecido (${medido.problemas.join("; ")}): registrado como combined, isolamento falho`);
    }
    const run: RunV2 = {
      contract: "run.v2", fixture, campaignId: opts.campanha, slotId: opts.slot, pairId: opts.par, runId, attempt: opts.tentativa,
      idempotencyKey: `${opts.campanha}/${opts.slot}/${opts.braco}/${opts.tentativa}`,
      screen: { id: opts.tela, label: opts.tela === "solicitacao" ? "Solicitar serviço" : "Vistorias", version: `govbr-telas-site-${(L?.versions.telas.siteSha256 ?? sha256(telasManifestText)).slice(0, 12)}` },
      arm: opts.braco, repetition: opts.repeticao,
      // modelo resolvido = o `model` das respostas, lido do stream-json do cliente (nunca copiado do pedido)
      model: client && client.models.length === 1
        ? { family: "claude", requested: opts.modelo, resolved: client.models[0], resolvedSource: "client-log", resolvedEvidence: "evidence/raw/agent/claude-stream.ndjson" }
        : { family: opts.agente === "fake" ? "roteirizado" : "claude", requested: opts.modelo, resolved: "unknown", resolvedSource: "unknown", resolvedEvidence: null },
      provider: opts.agente === "fake" ? { name: "nenhum (agente roteirizado)", authMethod: "unknown" } : { name: claudeStub ? "stub" : "anthropic", authMethod },
      effort: opts.esforco,
      client: opts.agente === "fake" ? { name: "fake-agent", version: "1.0.0" } : { name: "claude-code", version: L?.versions.claudeCode ?? "desconhecida" },
      browser: { name: "chromium", version: L?.versions.chromium ?? "desconhecida", headless: true },
      versions: {
        protocolSha256: rendered?.templateSha256 ?? sha256(skillPkg), promptSha256: rendered?.promptSha256 ?? sha256(""), skillSha256: sha256(skillPkg),
        harnessCommit: harness.commit ?? "0".repeat(40), siteManifestSha256: telasManifestSha, playwrightMcp: `@playwright/mcp@${L?.versions.playwrightMcp ?? "?"}`,
      },
      intervention: { oracle: oracleIdentityDoc },
      limits: { timeoutSeconds: opts.limiteSeg, maxTurns: null, maxBudgetUsd: null },
      isolationPolicyVersion: ISOLATION_POLICY_VERSION,
      timestamps: { plannedAt, startedAt: agentStartedAt, finishedAt: agentFinishedAt ?? (technical === "not-run" ? iso() : null) },
      lifecycle,
      status: {
        technical, isolation: isolationDoc?.result ?? "unverified",
        protocol: technical === "not-run" ? "not-applicable" : "unverified",
        oracleUsage,
        score: submission.status === "accepted" ? "not-prepared" : "not-applicable",
      },
      failure, submission,
      usage: {
        wallClockSeconds: wall === null ? (technical === "not-run" ? na() : unavailable()) : measured(wall, "runner"),
        inputTokens: tokens("input"), outputTokens: tokens("output"), cacheReadTokens: tokens("cacheRead"), cacheCreationTokens: tokens("cacheCreation"),
        turns: opts.agente === "fake" ? na() : client?.result?.numTurns != null ? measured(client.result.numTurns, `stream-json do cliente (result.num_turns)${claudeStub ? "; turnos do dublê" : ""}`) : unavailable(),
        toolCalls: ran ? measured(browserCalls + oracleEvents.filter((e) => e.kind === "call" || e.kind === "refused").length, "ponte MCP") : na(),
        oracleCalls: !ran ? na() : opts.braco === "sem" ? measured(0, "inventário: oráculo ausente no braço sem") : measured(oracleCalls.length, "ponte MCP do oráculo"),
        // estimativa do próprio cliente a preço de referência; nunca fatura (assinatura não é custo zero)
        estimatedCostUsd: opts.agente === "fake" ? na() : client?.result?.totalCostUsd != null ? measured(client.result.totalCostUsd, `estimativa do cliente (result.total_cost_usd)${claudeStub ? " sobre tokens fixos do dublê" : ""}`) : unavailable(),
        billedCostUsd: opts.agente === "fake" ? na() : unavailable(),
      },
      artifactManifest: "artifact-manifest.json",
      isolation: isolationDoc ? "isolation.json" : null,
    };
    if (isolationDoc) writeFileSync(join(runDir, "isolation.json"), json(isolationDoc));
    writeFileSync(join(runDir, "run.json"), json(run));

    // manifesto de artefatos (tudo menos ele mesmo)
    // NAT-82: no v2, o texto integral que a ponte gravou tem papel próprio (`tool-payload`) e não entra na lista
    // de evidência do scorer; o v1 não muda (o mesmo arquivo continua `evidence`, como toda a cópia bruta).
    const manifestV2 = findingsRaw?.contract === "findings.v2";
    const roleOf = (p: string): ArtifactManifestV2["files"][number]["role"] =>
      manifestV2 && TOOL_PAYLOAD_PATH.test(p) ? "tool-payload" : p === "run.json" ? "run" : p === "findings.json" ? "findings" : p === "isolation.json" ? "isolation" : p === "tool-events.ndjson" ? "tool-events"
        : p.startsWith("refused/") ? "refusal" : p.startsWith("evidence/logs/") ? "log" : p.startsWith("evidence/") ? "evidence" : "other";
    const mediaOf = (p: string): string => p.endsWith(".json") ? "application/json" : p.endsWith(".ndjson") ? "application/x-ndjson" : p.endsWith(".md") ? "text/markdown" : "text/plain";
    const files = listFiles(runDir).filter((p) => p !== "artifact-manifest.json").sort().map((p) => {
      const body = readFileSync(join(runDir, p));
      return { path: p, bytes: body.length, sha256: sha256(body), mediaType: mediaOf(p), role: roleOf(p) };
    });
    // NAT-81: artifact-manifest.v2 só quando o envelope aceito é findings.v2 (o v1 trava findings.v1);
    // sem submissão ou com findings.v1, o manifesto continua v1 como antes.
    const manifest: AnyArtifactManifest = manifestV2 && findingsRaw?.contract === "findings.v2"
      ? {
        contract: "artifact-manifest.v2", fixture, campaignId: opts.campanha, runId, producedBy: RUNNER_VERSION, producedAt: iso(),
        schemaVersions: { run: "run.v2", findings: "findings.v2", ...(findingsRaw.report.inspection !== undefined ? { inspection: "inspection.v1" as const } : {}),
          ...(isolationDoc ? { isolation: "isolation.v1" as const } : {}) },
        inspectionStatus: findingsRaw.inspectionStatus,
        files,
      }
      : {
        contract: "artifact-manifest.v1", fixture, campaignId: opts.campanha, runId, producedBy: RUNNER_VERSION, producedAt: iso(),
        schemaVersions: { run: "run.v2", ...(findingsRaw ? { findings: "findings.v1" as const } : {}), ...(isolationDoc ? { isolation: "isolation.v1" as const } : {}) },
        files: files as ArtifactManifest["files"],
      };
    writeFileSync(join(runDir, "artifact-manifest.json"), json(manifest));

    // validação de fronteira
    for (const [name, doc] of [["run.json", run], ["isolation.json", isolationDoc], ["findings.json", findingsRaw], ["artifact-manifest.json", manifest]] as const) {
      if (!doc) continue;
      const v = validateContract(doc);
      if (!v.valid) problems.push(`${name}: ${v.errors.map((e) => `${e.path} ${e.message}`).join("; ")}`);
    }
    if (!problems.length) {
      for (const e of crossCheckRun(assertContract<RunV2>(run, "run.v2"), findingsRaw, isolationDoc)) problems.push(`crossCheckRun: ${e.path} ${e.message}`);
      for (const e of crossCheckManifest(manifest, findingsRaw)) problems.push(`crossCheckManifest: ${e.path} ${e.message}`);
      try {
        verifyToolPayloads(readFileSync(join(runDir, "tool-events.ndjson"), "utf8"), (p) => existsSync(join(runDir, p)) ? readFileSync(join(runDir, p)) : null,
          manifest.files, manifest.contract === "artifact-manifest.v2");
      } catch (e) { problems.push(`payloads da ponte: ${e instanceof Error ? e.message : String(e)}`); }
    }
    if (problems.length) log(`PACOTE INVÁLIDO:\n  ${problems.join("\n  ")}`);
    log(`pacote em ${runDir}: técnico=${technical} isolamento=${run.status.isolation} oráculo=${oracleUsage} submissão=${submission.status}`);
    const exitCode = problems.length ? 2 : technical === "passed" ? 0 : technical === "not-run" ? 4 : 3;
    return { exitCode, runDir, run, problems };

    /**
     * NAT-61: checks do oráculo depois da execução (com e ferramentas): perfil medido = pedido, inventário e
     * hash, janela do oráculo; no ferramentas também a trava de conhecimento e a varredura do dicionário.
     */
    async function checksDoOraculoNaExecucao(): Promise<CheckRow[]> {
      const rows = checksDoPerfil(opts.braco, oracleInv, oracleTelemetry, "inventário da ponte + telemetria do servidor, depois da execução");
      const esperado = { width: inputs!.larguras[0].width, height: inputs!.larguras[0].height };
      const calls = oracleEvents.filter((e) => e.kind === "call");
      const textoIntegral = (e: Record<string, unknown>): string | null => {
        const s = e.result as { text?: string; truncated?: boolean; payload?: { status?: string; path?: string } } | undefined;
        if (!s?.text) return null;
        if (!s.truncated) return s.text;
        return s.payload?.status === "complete" && s.payload.path && existsSync(join(runDir, s.payload.path)) ? readFileSync(join(runDir, s.payload.path), "utf8") : null;
      };
      // janela: toda receita/atestação de estado que o oráculo devolve diz a janela e a fonte (2.14.0: "harness")
      const janelas: { tool: string; viewport: unknown; source: unknown }[] = [];
      const andar = (v: unknown, tool: string): void => {
        if (Array.isArray(v)) v.forEach((x) => andar(x, tool));
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if ("viewportSource" in o) janelas.push({ tool, viewport: o.viewport, source: o.viewportSource });
          Object.values(o).forEach((x) => andar(x, tool));
        }
      };
      for (const e of calls) {
        const t = textoIntegral(e);
        if (t) { try { andar(JSON.parse(t), String(e.tool)); } catch { /* texto não-JSON */ } }
      }
      const fora = janelas.filter((j) => j.source !== "harness" || JSON.stringify(j.viewport) !== JSON.stringify(esperado));
      rows.push({ id: "janela-do-oraculo", category: "tools", required: janelas.length > 0, evidence: "tool-events.ndjson",
        outcome: janelas.length === 0 ? "not-exercised" : fora.length === 0 ? "passed" : "failed",
        target: `o oráculo mede na janela do navegador do agente (${esperado.width}×${esperado.height}, declarada pelo harness em GOVBR_VALIDATOR_VIEWPORT)`,
        detail: janelas.length === 0 ? "nenhuma resposta do oráculo trouxe a janela (nenhum scan ou verificação com estado)"
          : fora.length ? JSON.stringify(fora.slice(0, 5)) : `${janelas.length} atestações de estado, todas ${esperado.width}×${esperado.height} (harness)` });
      if (opts.braco !== "ferramentas") {
        // controle positivo do detector (plano §5.2): no perfil evaluation o mesmo dicionário ACHA conteúdo da
        // base quando o agente consultou a base; informativo, nunca falha o isolamento do braço com
        const normativas = calls.filter((e) => ["get_ds_rules", "get_emag_rules", "get_page_rules", "get_component_spec", "get_design_tokens"].includes(String(e.tool)) && e.outcome === "ok").length;
        try {
          const rel = await varrerPayloadsDoOraculo({ validatorDir: opts.validatorDir, telasDir: opts.telasDir, eventos: oracleEvents, toolsList: oracleInv?.toolsList ?? null,
            ler: (p) => (existsSync(join(runDir, p)) ? readFileSync(join(runDir, p), "utf8") : null) });
          evidence("vazamento-conhecimento.json", rel);
          const sem = rel.semExplicacao.reduce((n, u) => n + u.count, 0);
          rows.push({ id: "vazamento-de-conhecimento-controle-positivo", category: "tools", required: false, evidence: "evidence/vazamento-conhecimento.json",
            outcome: normativas === 0 ? "not-exercised" : sem > 0 && rel.canarios.every((c) => c.ok) ? "passed" : "failed",
            target: "controle positivo: no perfil evaluation, o dicionário acha conteúdo da base nas respostas das consultas normativas (senão o detector estaria quebrado)",
            detail: `${normativas} consulta(s) normativa(s) bem-sucedida(s); ${rel.respostas} respostas; sem explicação ${sem}; canários ${rel.canarios.filter((c) => c.ok).length}/${rel.canarios.length}` });
        } catch (e) {
          rows.push({ id: "vazamento-de-conhecimento-controle-positivo", category: "tools", required: false, evidence: null, outcome: "not-exercised",
            target: "controle positivo do detector de vazamento no perfil evaluation", detail: `varredura não rodou: ${(e as Error).message}` });
        }
        return rows;
      }
      // trava de conhecimento: o perfil marca TODO evento com o contador; contador > 0 = isolamento falho
      const marcados = oracleTelemetry.filter((e) => typeof e.knowledgeLockAttempts === "number");
      const tentativas = Math.max(0, ...marcados.map((e) => e.knowledgeLockAttempts as number));
      const chamadasServidas = calls.filter((e) => e.outcome !== "transport-error").length;
      const travaOk = tentativas === 0 && marcados.length === oracleTelemetry.length && oracleTelemetry.length >= chamadasServidas;
      rows.push({ id: "trava-de-conhecimento", category: "tools", required: true, evidence: "evidence/raw/oracle/oracle-telemetry.ndjson",
        outcome: travaOk ? "passed" : "failed",
        target: "perfil knowledge-free: nenhuma tentativa de carregar a base de conhecimento (contador da trava na telemetria = 0 em todo evento)",
        detail: `${oracleTelemetry.length} eventos de telemetria (${marcados.length} com o contador; máximo ${tentativas}); ${chamadasServidas} chamadas servidas pela ponte` });
      // dicionário sobre os payloads integrais + tools/list exposto
      let rel: RelatorioVazamento | null = null;
      let erro: string | null = null;
      try {
        rel = await varrerPayloadsDoOraculo({ validatorDir: opts.validatorDir, telasDir: opts.telasDir, eventos: oracleEvents, toolsList: oracleInv?.toolsList ?? null,
          ler: (p) => (existsSync(join(runDir, p)) ? readFileSync(join(runDir, p), "utf8") : null) });
        evidence("vazamento-conhecimento.json", rel);
      } catch (e) { erro = (e as Error).message; }
      const sem = rel ? rel.semExplicacao.reduce((n, u) => n + u.count, 0) : null;
      const canariosOk = rel ? rel.canarios.every((c) => c.ok) : false;
      const ok = rel !== null && sem === 0 && rel.incompletas.length === 0 && canariosOk && rel.respostas > 0;
      const exemplos = rel && sem ? `; ex.: ${rel.semExplicacao.slice(0, 3).map((u) => `${u.term} em ${u.tool} ${u.path}`).join(" | ")}` : "";
      rows.push({ id: "vazamento-de-conhecimento", category: "tools", required: true, evidence: rel ? "evidence/vazamento-conhecimento.json" : null,
        outcome: ok ? "passed" : "failed",
        target: "dicionário gerado do data/ do validator travado: 0 ocorrências sem explicação nos payloads integrais do oráculo e no tools/list exposto; canários do detector disparando",
        detail: erro || !rel ? `varredura falhou: ${erro}` : `${rel.respostas} respostas; sem explicação ${sem}; perdoadas ${JSON.stringify(rel.porClasse)}; incompletas ${rel.incompletas.length}; canários ${rel.canarios.filter((c) => c.ok).length}/${rel.canarios.length}${exemplos}` });
      return rows;
    }
  }
}

/**
 * NAT-61: o perfil do oráculo medido × o pedido para o braço:
 *   - perfil-do-oraculo: o tools/list que o SERVIDOR anunciou (nomes + sha256 fixado; e a marca da telemetria,
 *     quando há eventos) é o do perfil pedido para o braço;
 *   - inventario-exposto-do-oraculo: a ponte expôs ao agente exatamente as ferramentas do perfil, com o sha256
 *     fixado, recalculado aqui sobre o tools/list integral que ela gravou.
 */
function checksDoPerfil(braco: Braco, inv: InventarioOraculo | null, telemetria: Record<string, unknown>[], quando: string, sufixo = ""): CheckRow[] {
  const pedido = PERFIL_DO_BRACO[braco];
  if (!pedido) return [];
  const m = perfilMedido(inv, telemetria);
  const fixado = PERFIS[pedido];
  const exposto = inv ? [...inv.exposed].sort() : null;
  const hashLocal = inv?.toolsList ? toolsListSha256(inv.toolsList) : null;
  const expostoOk = exposto !== null && JSON.stringify(exposto) === JSON.stringify([...fixado.tools])
    && inv!.exposedToolsSha256 === fixado.toolsListSha256 && hashLocal === fixado.toolsListSha256;
  return [
    { id: `perfil-do-oraculo${sufixo}`, category: "tools", required: true, evidence: "evidence/raw/oracle/inventory.json", outcome: m.perfil === pedido ? "passed" : "failed",
      target: `braço ${braco}: o servidor do oráculo está no perfil ${pedido} (medido, não declarado)`,
      detail: `${quando}: medido ${m.perfil ?? "nenhum perfil conhecido"} via ${m.fonte}${m.problemas.length ? `; ${m.problemas.join("; ")}` : ""}; servidor ${JSON.stringify(inv?.serverInfo ?? null)}` },
    { id: `inventario-exposto-do-oraculo${sufixo}`, category: "tools", required: true, evidence: "evidence/raw/oracle/inventory.json", outcome: expostoOk ? "passed" : "failed",
      target: `a ponte expõe exatamente ${fixado.tools.join(", ")} com o tools/list de sha256 ${fixado.toolsListSha256.slice(0, 12)}… (fixado no validator)`,
      detail: `${quando}: exposto ${JSON.stringify(exposto)}; sha256 gravado ${String(inv?.exposedToolsSha256 ?? "ausente").slice(0, 12)}, recalculado ${String(hashLocal ?? "sem tools/list").slice(0, 12)}; ocultas ${JSON.stringify(inv?.hidden ?? null)}` },
  ];
}

/** Configuração efetiva de um contêiner (docker inspect), sem nomes/ids da execução, para a paridade entre braços. */
function normalizedConfig(name: string, short: string, runId: string, sentinelPort: number | null): Record<string, unknown> {
  const r = docker(["inspect", name], { allowFail: true });
  if (r.code !== 0) return { ausente: true };
  const [c] = JSON.parse(r.stdout) as [{
    Config: { Image: string; Cmd: string[]; Env: string[]; User: string; Labels: Record<string, string>; WorkingDir: string };
    HostConfig: { ReadonlyRootfs: boolean; CapDrop: string[]; CapAdd: string[] | null; SecurityOpt: string[]; Privileged: boolean; NetworkMode: string; PidsLimit: number; Memory: number; Tmpfs: Record<string, string>; Init: boolean; ShmSize: number; Sysctls?: Record<string, string> };
    Mounts: { Type: string; Source: string; Destination: string; RW: boolean }[];
    NetworkSettings: { Networks: Record<string, { Aliases: string[] | null }> };
  }];
  const scrub = (s: string): string => {
    const t = s.split(short).join("<run>").split(runId).join("<runId>");
    return sentinelPort === null ? t : t.split(String(sentinelPort)).join("<porta-sentinela>");
  };
  // valor de credencial nunca entra no pacote (nem o falso do dublê): fica só o nome
  const redact = (e: string): string => {
    const name = e.split("=")[0];
    return SECRET_ENV_NAMES.includes(name) || /TOKEN|API_KEY|SECRET|PASSWORD/i.test(name) ? `${name}=<redigido>` : e;
  };
  return {
    image: c.Config.Image, cmd: c.Config.Cmd.map(scrub), env: c.Config.Env.map(scrub).map(redact).sort(), user: c.Config.User, workingDir: c.Config.WorkingDir,
    readOnlyRootfs: c.HostConfig.ReadonlyRootfs, capDrop: c.HostConfig.CapDrop, capAdd: c.HostConfig.CapAdd, securityOpt: c.HostConfig.SecurityOpt,
    privileged: c.HostConfig.Privileged, pidsLimit: c.HostConfig.PidsLimit, memory: c.HostConfig.Memory, tmpfs: c.HostConfig.Tmpfs, init: c.HostConfig.Init,
    shmSize: c.HostConfig.ShmSize, sysctls: c.HostConfig.Sysctls ?? null,
    mounts: c.Mounts.map((m) => ({ type: m.Type, destination: m.Destination, rw: m.RW, source: scrub(basename(dirname(m.Source)) + "/" + basename(m.Source)) })).sort((a, b) => a.destination.localeCompare(b.destination)),
    networks: Object.entries(c.NetworkSettings.Networks).map(([n, v]) => ({ network: scrub(n), aliases: (v.Aliases ?? []).filter((a) => !/^[0-9a-f]{12}$/.test(a)).map(scrub).sort() })).sort((a, b) => a.network.localeCompare(b.network)),
  };
}

// ───────────────────────────────────────────────────────────────── CLI

export function parseArgs(argv: string[]): RunOptions {
  const has = (n: string): boolean => argv.includes(n);
  const val = (n: string): string | undefined => (has(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const need = (n: string): string => {
    const v = val(n);
    if (!v) throw new Error(`falta ${n}`);
    return v;
  };
  const tela = need("--tela") as Tela;
  if (tela !== "solicitacao" && tela !== "vistorias") throw new Error("--tela: solicitacao | vistorias");
  const braco = need("--braco") as Braco;
  if (braco !== "sem" && braco !== "com" && braco !== "ferramentas") throw new Error("--braco: sem | com | ferramentas");
  const agente = need("--agente") as "fake" | "claude";
  if (agente !== "fake" && agente !== "claude") throw new Error("--agente: fake | claude");
  const limiteSeg = val("--limite-seg") ? Number(val("--limite-seg")) : Number(need("--limite-min")) * 60;
  if (!Number.isInteger(limiteSeg) || limiteSeg < 1) throw new Error("--limite-min/--limite-seg: inteiro positivo");
  const egress = (val("--egress") ?? (agente === "fake" ? "stub" : "real")) as "stub" | "real";
  return {
    tela, braco, agente, limiteSeg, egress,
    modelo: val("--modelo") ?? (agente === "fake" ? "agente-roteirizado" : need("--modelo")),
    esforco: val("--esforco") ?? (agente === "fake" ? "nao-se-aplica" : need("--esforco")),
    saida: need("--saida"),
    cenario: val("--cenario") ?? "honesto",
    permitirModelo: has("--permitir-modelo"),
    campanha: val("--campanha") ?? "t3a-local", slot: val("--slot") ?? "slot-01", par: val("--par") ?? "par-01",
    tentativa: Number(val("--tentativa") ?? 1), repeticao: Number(val("--repeticao") ?? 1), runId: val("--run-id"),
    larguras: val("--larguras")?.split(","),
    telasDir: resolve(val("--telas") ?? DEFAULT_TELAS_DIR), validatorDir: resolve(val("--validator") ?? DEFAULT_VALIDATOR_DIR),
    outrasSaidas: val("--outras-saidas")?.split(",").map((p) => resolve(p)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const opts = parseArgs(process.argv.slice(2));
    const outcome = await runOnce(opts);
    process.exit(outcome.exitCode);
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
