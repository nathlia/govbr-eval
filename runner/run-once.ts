/**
 * run-once — UMA execução isolada (T3 do plano do benchmark isolado; T3a: agente roteirizado).
 *
 *   npm run run-once -- --tela solicitacao|vistorias --braco sem|com --modelo <id> --esforco <nível>
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
 * `--agente claude` está ligado mas recusa partir sem `--permitir-modelo` E credencial no ambiente
 * (ANTHROPIC_API_KEY ou CLAUDE_CODE_OAUTH_TOKEN). O T3a nunca passa nenhum dos dois.
 * Docs: docs/runner-isolado.md.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  assertContract, crossCheckRun, validateContract,
  type ArtifactManifest, type Findings, type Isolation, type Metric, type Run,
} from "../contracts/index";
import { gitState, oracleIdentity } from "../scripts/collection-manifest";
import { renderRun, SKILL_PATH, type TaskInputs } from "../scripts/render-task-prompt";
import {
  DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR, EVAL_ROOT, ISOLATION_POLICY_VERSION, RUNNER_DIR, RUNNER_VERSION, TCC_ROOT,
  docker, dockerAvailable, imageId, loadLock, nowUtc, sha256, type ImagesLock,
} from "./lib";

// ───────────────────────────────────────────────────────────────── política

/**
 * Destinos que o PROCESSO DO AGENTE alcança pelo proxy do provedor (CONNECT, 443). Nada mais sai.
 * verified = exigido pela documentação do Claude Code (Network access requirements, consultada em
 * 2026-10-02) e ainda não exercitado com o cliente real (T3b); unverified = talvez necessário.
 */
export const PROVIDER_ALLOWLIST = [
  { host: "api.anthropic.com", port: 443, status: "documentado", why: "API do Claude (inferência)" },
  { host: "platform.claude.com", port: 443, status: "não verificado", why: "troca/renovação de token OAuth (autenticação por assinatura); confirmar no T3b" },
] as const;
/** Fora da allowlist de propósito: claude.ai, claude.com (login interativo), downloads.claude.ai,
 * registry.npmjs.org, mcp-proxy.anthropic.com, telemetria (datadoghq) — a imagem desliga tráfego não essencial. */
export const PROVIDER_DENIED_ON_PURPOSE = ["claude.ai", "claude.com", "downloads.claude.ai", "registry.npmjs.org", "mcp-proxy.anthropic.com", "http-intake.logs.us5.datadoghq.com", "storage.googleapis.com", "github.com"];
const SITE_ALLOW = ["screens:3300", "collector:8080"];
const SCREENS_ORIGIN = "http://screens:3300";
const COLLECTOR_ORIGIN = "http://collector:8080/";
const OLD_PORTS = [3000, 4000, 4100, 4101, 4102];
const ORACLE_SERVER_NAME = "govbr-ds-validator";
const NORMATIVE_TOOLS = ["get_ds_rules", "get_emag_rules", "get_page_rules", "get_component_spec", "get_design_tokens", "list_components"];
const SCAN_TOOLS = ["scan_page", "run_axe_scan"];
const SECRET_ENV_NAMES = ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"];

export type Tela = "solicitacao" | "vistorias";
export interface RunOptions {
  tela: Tela;
  braco: "sem" | "com";
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
export interface RunOutcome { exitCode: number; runDir: string; run: Run; problems: string[] }

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

/** Configuração MCP que o cliente recebe. A única diferença entre os braços é a entrada do oráculo. */
export function mcpConfig(braco: "sem" | "com"): { mcpServers: Record<string, { type: "http"; url: string }> } {
  const servers: Record<string, { type: "http"; url: string }> = { playwright: { type: "http", url: "http://browser:8931/mcp" } };
  if (braco === "com") servers[ORACLE_SERVER_NAME] = { type: "http", url: "http://oracle:8932/mcp" };
  return { mcpServers: servers };
}

/**
 * Comando do cliente real (T3b). Só ferramentas MCP; nada de shell, arquivo ou web. Não exercitado no
 * T3a — as capacidades efetivas do cliente instalado continuam a verificar com o cliente real.
 */
export function claudeCommand(opts: Pick<RunOptions, "modelo" | "esforco">): string[] {
  return ["/opt/runner/node_modules/.bin/claude", "-p", "--input-format", "text", "--output-format", "stream-json", "--verbose",
    "--model", opts.modelo, "--mcp-config", "/run/task/mcp.json", "--strict-mcp-config", "--setting-sources", "",
    "--allowedTools", "mcp__playwright,mcp__govbr-ds-validator",
    "--disallowedTools", "Bash,Read,Write,Edit,MultiEdit,NotebookEdit,Glob,Grep,LS,WebFetch,WebSearch,Task,TodoWrite",
    "--permission-mode", "dontAsk"];
}

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
function hostSentinelServer(token: string): Promise<{ child: ChildProcess; port: number }> {
  const script = "require('http').createServer((q,r)=>{r.writeHead(200,{'content-type':'text/plain'});r.end(process.env.T+'\\n'+q.url+'\\n')})" +
    ".listen(0,'127.0.0.1',function(){console.log(this.address().port)})";
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['-e', script], { env: { T: token }, stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout!.once('data', (d: Buffer) => resolvePromise({ child, port: Number(d.toString().trim()) }));
    child.once('error', reject);
  });
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
  const roles = ["task", "agent", "probe", "browser", "oracle", "collector", "egress-provider", "egress-site"];
  for (const r of roles) mkdirSync(join(work, r), { recursive: true });
  const short = runId.replace(/[^A-Za-z0-9]/g, "").slice(-10).toLowerCase() + randomBytes(2).toString("hex");
  const cname = (role: string): string => `gr-${short}-${role}`;
  const nname = (net: string): string => `gr-${short}-${net}`;
  const label = ["--label", `govbr.run=${runId}`];
  const fixture = opts.agente === "fake";

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
  try {
    lock = loadLock();
  } catch (e) {
    integ("imagens-travadas", "runner/images.lock.json", false, (e as Error).message);
  }
  const needed: (keyof ImagesLock["images"])[] = ["screens", "agent", "collector", "egress", ...(opts.braco === "com" ? ["oracle" as const] : [])];
  if (lock && dockerState.ok) {
    for (const n of needed) {
      const live = imageId(lock.images[n].tag);
      integ(`imagem-${n}`, `${lock.images[n].tag} = ${lock.images[n].id.slice(0, 19)}…`, live === lock.images[n].id, live ?? "ausente");
    }
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
    rendered = renderRun(skillPkg.toString("utf8"), { task: inputs, arm: opts.braco, runId, collectorToken: null, oracleProfile: opts.braco === "com" ? "evaluation" : null });
    integ("texto-da-tarefa", "texto renderizado da skill + entradas, sem vocabulário proibido", true, rendered.promptSha256);
  } catch (e) {
    integ("texto-da-tarefa", "texto renderizado da skill + entradas", false, (e as Error).message);
  }
  const oracleNow = opts.braco === "com" ? oracleIdentity(opts.validatorDir) : null;
  if (opts.braco === "com" && lock) {
    integ("oraculo", "dist/ e data/ do validador = distribuição embutida na imagem do oráculo",
      oracleNow?.distSha256 === lock.versions.oracle.distSha256 && oracleNow?.dataSha256 === lock.versions.oracle.dataSha256,
      `${oracleNow?.distSha256?.slice(0, 12)}/${oracleNow?.dataSha256?.slice(0, 12)} × ${lock.versions.oracle.distSha256.slice(0, 12)}/${lock.versions.oracle.dataSha256.slice(0, 12)}`);
  }
  if (opts.agente === "claude") {
    const cred = SECRET_ENV_NAMES.filter((k) => process.env[k]);
    integ("cliente-real-autorizado", "cliente real exige --permitir-modelo e credencial no ambiente", opts.permitirModelo && cred.length > 0,
      `--permitir-modelo=${opts.permitirModelo}; credencial=${cred.length > 0 ? "presente" : "ausente"}`);
  }
  const harness = gitState(EVAL_ROOT);
  const preflightDoc = { runner: RUNNER_VERSION, policy: ISOLATION_POLICY_VERSION, plannedAt, harness, lock: lock ? { images: Object.fromEntries(Object.entries(lock.images).map(([k, v]) => [k, { tag: v.tag, id: v.id }])), versions: lock.versions } : null,
    telasManifestSha, skillSha256: sha256(skillPkg), prompt: rendered ? { sha256: rendered.promptSha256, templateSha256: rendered.templateSha256, bytes: rendered.bytes } : null,
    oracle: oracleNow, providerAllowlist: PROVIDER_ALLOWLIST, providerDeniedOnPurpose: PROVIDER_DENIED_ON_PURPOSE };

  // ── estado para o pacote
  let agentStartedAt: string | null = null;
  let agentFinishedAt: string | null = null;
  let agentExit: number | "timeout" | null = null;
  let probeDoc: { checks: CheckRow[]; positiveControls: PositiveRow[]; inventory: Record<string, { ok: boolean; tools?: string[] }> } | null = null;
  let notRunReason: { reason: "preflight-failed" | "isolation-failed" | "harness-error"; detail: string } | null = null;
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
      sentinelHost = await hostSentinelServer(sentinelToken);
      const hostPorts = [sentinelHost.port];

      // tarefa (montada só-leitura no agente e na sonda)
      writeFileSync(join(work, "task", "prompt.txt"), R.prompt);
      writeFileSync(join(work, "task", "mcp.json"), json(mcpConfig(opts.braco)));

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
      create("collector", L.images.collector.id, [[net.site, "collector"]], ["-e", `COLLECTOR_RUN_ID=${runId}`, "-e", `COLLECTOR_CAMPAIGN_ID=${opts.campanha}`, "-e", `COLLECTOR_FIXTURE=${fixture ? "1" : "0"}`], [], "collector");
      create("egress-site", egressImage, [[net.site, "egress-site"], [net.browse, "egress-site"]],
        ["-e", "EGRESS_NAME=egress-site", "-e", `EGRESS_ALLOW_HTTP=${SITE_ALLOW.join(",")}`, "-e", "EGRESS_ALLOW_CONNECT=", "-e", "EGRESS_LOG=/out/egress.ndjson"], [], "egress-site");
      create("egress-provider", egressImage, [[net.egress, "egress"], [net.up, "egress-up"]],
        ["-e", "EGRESS_NAME=egress-provider", "-e", "EGRESS_ALLOW_HTTP=", "-e", `EGRESS_ALLOW_CONNECT=${PROVIDER_ALLOWLIST.map((a) => `${a.host}:${a.port}`).join(",")}`, "-e", "EGRESS_LOG=/out/egress.ndjson"], [], "egress-provider");
      if (opts.egress === "stub") {
        create("provider-stub", egressImage, [[net.up, "api.anthropic.com"]], ["--network-alias", "platform.claude.com", "--sysctl", "net.ipv4.ip_unprivileged_port_start=0"], ["node", "/opt/egress/stub.mjs"], null);
      }
      const windows = inputs!.larguras.map((w) => `${w.width}x${w.height}`).join(",");
      create("browser", L.images.agent.id, [[net.browse, "browser"], [net.tools, "browser"]], ["--shm-size", "512m"],
        ["node", "/opt/runner/bridge.mjs", "--name", "playwright", "--port", "8931", "--windows", windows, "--events", "/out/tool-events.ndjson", "--inventory", "/out/inventory.json", "--",
          "node", "/opt/runner/node_modules/@playwright/mcp/cli.js", "--headless", "--browser", "chromium", "--no-sandbox", "--isolated", "--block-service-workers",
          "--viewport-size", "{VIEWPORT}", "--proxy-server", "http://egress-site:3128", "--output-dir", "/tmp/pw-{INDEX}"], "browser");
      if (opts.braco === "com") {
        create("oracle", L.images.oracle.id, [[net.browse, "oracle"], [net.tools, "oracle"]], ["--shm-size", "512m",
          "-e", "GOVBR_VALIDATOR_TOOL_PROFILE=evaluation", "-e", "GOVBR_VALIDATOR_PROXY_SERVER=http://egress-site:3128",
          "-e", `GOVBR_VALIDATOR_ALLOWED_ORIGINS=${SCREENS_ORIGIN}`, "-e", "GOVBR_VALIDATOR_REPORTS_DIR=/tmp/reports",
          "-e", "GOVBR_VALIDATOR_TELEMETRY_FILE=/out/oracle-telemetry.ndjson", "-e", `GOVBR_VALIDATOR_RUN_ID=${runId}`],
        ["node", "/opt/runner/bridge.mjs", "--name", "oracle", "--port", "8932", "--events", "/out/tool-events.ndjson", "--inventory", "/out/inventory.json", "--",
          "node", "/opt/oracle/dist/index.js"], "oracle");
      }
      start(cname("screens"), /Servidor das telas em/, "telas");
      start(cname("collector"), /coletor armado/, "coletor");
      start(cname("egress-site"), /egress-site em/, "proxy do navegador");
      start(cname("egress-provider"), /egress-provider em/, "proxy do provedor");
      if (opts.egress === "stub") start(cname("provider-stub"), /stub do provedor pronto/, "dublê do provedor");
      start(cname("browser"), /ponte playwright em/, "ponte do navegador");
      if (opts.braco === "com") start(cname("oracle"), /ponte oracle em/, "ponte do oráculo");
      log(`infraestrutura pronta (${containers.length} contêineres, ${networks.length} redes internas${opts.egress === "real" ? " + saída real do proxy do provedor" : ""})`);

      // ── controles positivos do controlador
      const tokenRead = sentinelFiles.every((f) => readFileSync(f, "utf8").includes(sentinelToken));
      positives.push({ id: "sentinelas-no-host", target: `${sentinelFiles.length} arquivos-sentinela legíveis pelo controlador`, outcome: tokenRead ? "passed" : "failed", detail: sentinelFiles.map((f) => relative(TCC_ROOT, f).replace(/\\/g, "/")).join(", ") });
      const hostCtl = docker(["run", "--rm", ...label, "--network", "bridge", "--read-only", "--cap-drop", "ALL", "--user", "10001:10001", L.images.agent.id, "node", "-e",
        `const n=require('net');const s=n.connect(${sentinelHost.port},'host.docker.internal');let b='';s.on('data',d=>b+=d);s.on('connect',()=>s.write('GET /controle HTTP/1.0\\r\\n\\r\\n'));s.on('end',()=>{console.log(b.includes('${sentinelToken}')?'ALCANCOU':'SEM-TOKEN');});s.on('error',e=>console.log('ERRO '+e.code));setTimeout(()=>{console.log('TIMEOUT');process.exit(0)},5000)`], { allowFail: true, timeoutMs: 60_000 });
      positives.push({ id: "host-alcancavel-fora-da-politica", target: `servidor-sentinela no loopback do host (porta ${sentinelHost.port}) alcançado por um contêiner comum (rede bridge padrão)`, outcome: /ALCANCOU/.test(hostCtl.stdout) ? "passed" : "failed", detail: hostCtl.stdout.trim() || hostCtl.stderr.trim().slice(0, 200) });
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
      const agentEnv = ["-e", `GOVBR_RUN_ID=${runId}`, "-e", "HTTPS_PROXY=http://egress:3128", "-e", "HTTP_PROXY=http://egress:3128", "-e", "NO_PROXY=browser,oracle"];
      const taskMount = ["--mount", `type=bind,src=${join(work, "task")},dst=/run/task,readonly`];
      const probeCfg = {
        out: "/out/probe.json", sentinelPaths: sentinelFiles, otherRunPaths: otherRuns, hostPorts, egress: "egress:3128", providerStub: opts.egress === "stub",
        mcp: Object.fromEntries(Object.entries(mcpConfig(opts.braco).mcpServers).map(([k, v]) => [k === ORACLE_SERVER_NAME ? "oracle" : k, v.url])),
        oracleExpected: opts.braco === "com",
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
        const extraEnv = opts.agente === "fake" ? ["-e", `FAKE_SCENARIO=${opts.cenario}`, "-e", `FAKE_CONFIG=${JSON.stringify(fakeCfg)}`] : [];
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
      if (!agentStartedAt) notRunReason = { reason: "harness-error", detail: err.message };
      else limitations.push(`erro do harness depois do início do agente: ${err.message}`);
      log(`erro do harness: ${err.message}`);
      for (const c of containers) evidence(`logs/${c.replace(`gr-${short}-`, "")}.log`, (() => { const r = docker(["logs", c], { allowFail: true }); return r.stdout + r.stderr; })());
    } finally {
      teardownState = teardown();
      sentinelHost?.child.kill();
      rmSync(sentinelDir, { recursive: true, force: true });
      try { rmdirSync(join(TCC_ROOT, ".govbr-sentinelas")); } catch { /* outra execução ainda usa */ }
    }
  }

  // ── pacote
  return writePackage();

  function writePackage(): RunOutcome {
    const problems: string[] = [];
    evidence("preflight.json", { ...preflightDoc, integrity });
    if (rendered) evidence("prompt.txt", rendered.prompt);
    evidence("mcp-config.json", mcpConfig(opts.braco));
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

    const browserEvents = readNdjson(rawPath("browser", "tool-events.ndjson"));
    const oracleEvents = readNdjson(rawPath("oracle", "tool-events.ndjson"));
    const toolEvents = [...browserEvents, ...oracleEvents].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    writeFileSync(join(runDir, "tool-events.ndjson"), toolEvents.map((e) => JSON.stringify(e)).join("\n") + (toolEvents.length ? "\n" : ""));
    const browserInv = readJson<{ exposed: string[]; hidden: string[] }>(rawPath("browser", "inventory.json"));
    const oracleInv = readJson<{ exposed: string[] }>(rawPath("oracle", "inventory.json"));
    const egressProvider = readNdjson(rawPath("egress-provider", "egress.ndjson"));
    const egressSite = readNdjson(rawPath("egress-site", "egress.ndjson"));
    const collectorEvents = readNdjson(rawPath("collector", "events.ndjson"));

    // checks de execução (só se o agente rodou)
    const ran = agentStartedAt !== null;
    if (ran) {
      const drift = browserEvents.filter((e) => e.kind === "drift");
      runtimeChecks.push({ id: "janela-sem-deriva", category: "tools", target: "a janela de cada navegador ficou no tamanho fixado do começo ao fim (medido pela ponte depois de cada chamada)", required: true, outcome: drift.length === 0 ? "passed" : "failed", detail: drift.length ? JSON.stringify(drift).slice(0, 400) : `${browserEvents.filter((e) => e.viewportAfter).length} medições, nenhuma deriva`, evidence: "tool-events.ndjson" });
      const leakProvider = egressProvider.filter((e) => e.allowed === true && e.kind === "connect" && !PROVIDER_ALLOWLIST.some((a) => e.target === `${a.host}:${a.port}`));
      runtimeChecks.push({ id: "egress-provedor-durante-a-execucao", category: "network", target: "proxy do provedor só deixou passar a allowlist durante a execução", required: true, outcome: leakProvider.length === 0 ? "passed" : "failed", detail: `${egressProvider.filter((e) => e.allowed === false).length} recusas, ${egressProvider.filter((e) => e.allowed === true && e.kind === "connect").length} túneis permitidos`, evidence: "evidence/raw/egress-provider/egress.ndjson" });
      const leakSite = egressSite.filter((e) => e.allowed === true && e.kind === "http" && !SITE_ALLOW.some((h) => String(e.target).startsWith(`http://${h}/`)));
      runtimeChecks.push({ id: "egress-navegador-durante-a-execucao", category: "network", target: "proxy dos navegadores só deixou passar a tela e o coletor", required: true, outcome: leakSite.length === 0 ? "passed" : "failed", detail: `${egressSite.filter((e) => e.allowed === false).length} recusas`, evidence: "evidence/raw/egress-site/egress.ndjson" });
      if (opts.braco === "sem") {
        const ok = oracleEvents.length === 0 && !oracleInv && (browserInv?.exposed ?? []).every((t) => t.startsWith("browser_"));
        runtimeChecks.push({ id: "oraculo-ausente-durante-a-execucao", category: "tools", target: "braço sem: nenhum servidor do oráculo, nenhuma ferramenta dele anunciada, zero chamadas", required: true, outcome: ok ? "passed" : "failed", detail: `eventos do oráculo: ${oracleEvents.length}` });
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
    notExercised.push(
      "cliente real (Claude Code) e suas ferramentas internas: o agente roteirizado prova as paredes, não as capacidades efetivas do cliente (T3b)",
      "saída real para o provedor: a allowlist do proxy foi exercitada contra um dublê numa rede interna, sem internet",
      "erros de ferramenta simulados (timeout/isError/truncamento) do lado do cliente real",
    );
    if (opts.egress === "real") notExercised.splice(1, 1, "túnel permitido até o provedor real: não aberto no T3a (só recusas com saída real)");
    limitations.push("agente roteirizado: nenhuma chamada a modelo; uma recusa aqui é do sistema, não de um LLM");
    if (harness.dirty) limitations.push("govbr-eval com alterações locais no momento da execução (harnessCommit não descreve tudo)");

    const allChecks: CheckRow[] = [...integrity, ...probeChecks, ...runtimeChecks];
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
    const findingsRaw = readJson<Findings>(rawPath("collector", "findings.json"));
    const refused = listFiles(join(raw, "collector", "refused"));
    for (const f of refused) { mkdirSync(join(runDir, "refused"), { recursive: true }); cpSync(join(raw, "collector", "refused", f), join(runDir, "refused", f)); }
    if (findingsRaw) writeFileSync(join(runDir, "findings.json"), json(findingsRaw));
    const lastRefusal = refused.length ? JSON.parse(readFileSync(join(runDir, "refused", refused[refused.length - 1]), "utf8")) as { reason: string } : null;
    const submission: Run["submission"] = findingsRaw ? { status: "accepted", findings: "findings.json", refusal: null }
      : lastRefusal ? { status: "refused", findings: null, refusal: { reason: lastRefusal.reason.slice(0, 500), archivedBody: `refused/${refused[refused.length - 1]}` } }
      : { status: "none", findings: null, refusal: null };

    // estados
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
    } else if (submission.status === "accepted" && agentExit === 0) {
      technical = "passed";
      lifecycle = { state: "collected", stage: null };
    } else if (submission.status === "accepted") {
      technical = "failed";
      lifecycle = { state: "failed", stage: "running" };
      failure = { stage: "running", reason: "harness-error", detail: `relatório aceito, mas o agente saiu com código ${agentExit}` };
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
    let oracleUsage: Run["status"]["oracleUsage"];
    if (technical === "not-run") oracleUsage = "not-applicable";
    else if (opts.braco === "sem") oracleUsage = isolationDoc && !isolationDoc.toolInventory.oracleAnnounced && runtimeChecks.find((c) => c.id === "oraculo-ausente-durante-a-execucao")?.outcome === "passed" && probeChecks.find((c) => c.id === "oraculo-ausente")?.outcome === "passed" ? "absent-verified" : "unverified";
    else if (oracleCalls.length === 0) oracleUsage = "available-unused";
    else {
      const okCalls = oracleCalls.filter((e) => e.outcome === "ok");
      const gate = okCalls.some((e) => NORMATIVE_TOOLS.includes(String(e.tool))) && okCalls.some((e) => SCAN_TOOLS.includes(String(e.tool)));
      oracleUsage = oracleCalls.some((e) => e.outcome !== "ok") ? "used-with-errors" : gate ? "used-adherent" : "unverified";
    }

    const browserCalls = browserEvents.filter((e) => e.kind === "call" || e.kind === "refused").length;
    const wall = agentStartedAt && agentFinishedAt ? (Date.parse(agentFinishedAt) - Date.parse(agentStartedAt)) / 1000 : null;
    const L = lock;
    const oracleIdentityDoc = opts.braco === "com" && L ? { package: L.versions.oracle.package, version: L.versions.oracle.version, distSha256: L.versions.oracle.distSha256, dataSha256: L.versions.oracle.dataSha256, profile: "combined" as const } : null;
    const run: Run = {
      contract: "run.v1", fixture, campaignId: opts.campanha, slotId: opts.slot, pairId: opts.par, runId, attempt: opts.tentativa,
      idempotencyKey: `${opts.campanha}/${opts.slot}/${opts.braco}/${opts.tentativa}`,
      screen: { id: opts.tela, label: opts.tela === "solicitacao" ? "Solicitar serviço" : "Vistorias", version: `govbr-telas-site-${(L?.versions.telas.siteSha256 ?? sha256(telasManifestText)).slice(0, 12)}` },
      arm: opts.braco, repetition: opts.repeticao,
      model: { family: opts.agente === "fake" ? "roteirizado" : "claude", requested: opts.modelo, resolved: "unknown", resolvedSource: "unknown", resolvedEvidence: null },
      provider: opts.agente === "fake" ? { name: "nenhum (agente roteirizado)", authMethod: "unknown" } : { name: "anthropic", authMethod: process.env.ANTHROPIC_API_KEY ? "api-key" : process.env.CLAUDE_CODE_OAUTH_TOKEN ? "oauth-subscription" : "unknown" },
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
        inputTokens: opts.agente === "fake" ? na() : unavailable(), outputTokens: opts.agente === "fake" ? na() : unavailable(),
        cacheReadTokens: opts.agente === "fake" ? na() : unavailable(), cacheCreationTokens: opts.agente === "fake" ? na() : unavailable(),
        turns: opts.agente === "fake" ? na() : unavailable(),
        toolCalls: ran ? measured(browserCalls + oracleEvents.filter((e) => e.kind === "call" || e.kind === "refused").length, "ponte MCP") : na(),
        oracleCalls: !ran ? na() : opts.braco === "sem" ? measured(0, "inventário: oráculo ausente no braço sem") : measured(oracleCalls.length, "ponte MCP do oráculo"),
        estimatedCostUsd: opts.agente === "fake" ? na() : unavailable(), billedCostUsd: opts.agente === "fake" ? na() : unavailable(),
      },
      artifactManifest: "artifact-manifest.json",
      isolation: isolationDoc ? "isolation.json" : null,
    };
    if (isolationDoc) writeFileSync(join(runDir, "isolation.json"), json(isolationDoc));
    writeFileSync(join(runDir, "run.json"), json(run));

    // manifesto de artefatos (tudo menos ele mesmo)
    const roleOf = (p: string): ArtifactManifest["files"][number]["role"] =>
      p === "run.json" ? "run" : p === "findings.json" ? "findings" : p === "isolation.json" ? "isolation" : p === "tool-events.ndjson" ? "tool-events"
        : p.startsWith("refused/") ? "refusal" : p.startsWith("evidence/logs/") ? "log" : p.startsWith("evidence/") ? "evidence" : "other";
    const mediaOf = (p: string): string => p.endsWith(".json") ? "application/json" : p.endsWith(".ndjson") ? "application/x-ndjson" : p.endsWith(".md") ? "text/markdown" : "text/plain";
    const files = listFiles(runDir).filter((p) => p !== "artifact-manifest.json").sort().map((p) => {
      const body = readFileSync(join(runDir, p));
      return { path: p, bytes: body.length, sha256: sha256(body), mediaType: mediaOf(p), role: roleOf(p) };
    });
    const manifest: ArtifactManifest = {
      contract: "artifact-manifest.v1", fixture, campaignId: opts.campanha, runId, producedBy: RUNNER_VERSION, producedAt: iso(),
      schemaVersions: { run: "run.v1", ...(findingsRaw ? { findings: "findings.v1" as const } : {}), ...(isolationDoc ? { isolation: "isolation.v1" as const } : {}) },
      files,
    };
    writeFileSync(join(runDir, "artifact-manifest.json"), json(manifest));

    // validação de fronteira
    for (const [name, doc] of [["run.json", run], ["isolation.json", isolationDoc], ["findings.json", findingsRaw], ["artifact-manifest.json", manifest]] as const) {
      if (!doc) continue;
      const v = validateContract(doc);
      if (!v.valid) problems.push(`${name}: ${v.errors.map((e) => `${e.path} ${e.message}`).join("; ")}`);
    }
    if (!problems.length) {
      for (const e of crossCheckRun(assertContract<Run>(run, "run.v1"), findingsRaw, isolationDoc)) problems.push(`crossCheckRun: ${e.path} ${e.message}`);
    }
    if (problems.length) log(`PACOTE INVÁLIDO:\n  ${problems.join("\n  ")}`);
    log(`pacote em ${runDir}: técnico=${technical} isolamento=${run.status.isolation} oráculo=${oracleUsage} submissão=${submission.status}`);
    const exitCode = problems.length ? 2 : technical === "passed" ? 0 : technical === "not-run" ? 4 : 3;
    return { exitCode, runDir, run, problems };
  }
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
  return {
    image: c.Config.Image, cmd: c.Config.Cmd.map(scrub), env: c.Config.Env.map(scrub).sort(), user: c.Config.User, workingDir: c.Config.WorkingDir,
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
  const braco = need("--braco") as "sem" | "com";
  if (braco !== "sem" && braco !== "com") throw new Error("--braco: sem | com");
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
