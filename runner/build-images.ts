/**
 * Constrói as cinco imagens fixadas do runner isolado (T3a) e grava runner/images.lock.json com o id
 * (digest da configuração) de cada uma, as versões efetivas de dentro da imagem e as identidades do
 * conteúdo embutido (site das telas, distribuição do oráculo). O run-once confere tudo isso no
 * preflight e recusa rodar com imagem diferente da travada.
 *
 *   npm run runner:imagens [-- --telas ../govbr-telas] [--validator ../govbr-ds-validator] [--so agent,screens]
 *
 * O contexto de cada imagem é montado numa pasta temporária por lista explícita: nada do govbr-eval
 * além de runner/container e dos dois schemas do coletor entra numa imagem; do govbr-telas só
 * server.mjs, site-manifest.json e site/; do validador só dist/, data/ e os package*.json.
 * Nenhuma credencial entra em contexto de build.
 *
 * Oráculo >= 3.2.0 (NAT-100): a imagem serve SÓ a busca léxica padrão (idêntica à 3.1.0). De data/ saem o
 * que o git do validador ignora (pesos dos modelos em data/models/<id>/, ~377 MB, e vetores de candidatos)
 * e os vetores do modelo padrão (data/retrieval/embeddings/, versionados, mas a léxica não os lê). Fica
 * data/models/models.json (+ licença): sem ele um `retrieval:"hybrid"` pedido numa chamada lançaria em vez
 * de cair na léxica com `ranking.dense:"unavailable"`. A imagem não define GOVBR_RETRIEVAL_* (conferido
 * depois do build) e as etiquetas dizem o commit do validador e o modo de busca.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { oracleIdentity, sha256Tree } from "../scripts/collection-manifest";
import { PERFIS, type PerfilOraculo } from "./perfis-oraculo";
import {
  BASE_IMAGE, CLAUDE_CODE_VERSION, COMMITTED_LOCK_PATH, DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR, EVAL_ROOT, LOCK_PATH, NODE_VERSION, PLAYWRIGHT_MCP_VERSION,
  RUNNER_DIR, RUNNER_VERSION, docker, dockerStream, imageId, imageLabels, sha256, type ImagesLock,
} from "./lib";

type Name = keyof ImagesLock["images"];
/** Arquivos de contrato embutidos no coletor (NAT-81: + findings.v2, inspection.v1 e as regras do registro). */
export const COLLECTOR_CONTRACT_FILES = ["common.v1.schema.json", "findings.v1.schema.json", "findings.v2.schema.json", "inspection.v1.schema.json", "inspection-ledger.mjs"];
const ORDER: Name[] = ["agent", "screens", "collector", "egress", "oracle"];

export function telasIdentity(telasDir: string): { siteSha256: string; manifestSha256: string; version: string } {
  const text = readFileSync(join(telasDir, "site-manifest.json"));
  const manifest = JSON.parse(text.toString("utf8")) as { item: { sha256: string }; package: { version: string } };
  return { siteSha256: manifest.item.sha256, manifestSha256: sha256(text), version: manifest.package.version };
}

/** Modo de busca que a imagem do oráculo serve (etiqueta `govbr.oracle.retrieval-mode`). */
export const ORACLE_RETRIEVAL_MODE = "lexical-default";
/** Fora de data/ na imagem, além do que o git do validador ignora: vetores densos (só a híbrida/vetorial os lê). */
export const ORACLE_DATA_ALWAYS_EXCLUDED = ["retrieval/embeddings/"];
/** Variáveis do validador que trocariam o modo de busca: nenhuma pode estar no ambiente da imagem nem do contêiner. */
export const RETRIEVAL_ENV_PREFIX = "GOVBR_RETRIEVAL_";

const git = (dir: string, args: string[]): string => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * Caminhos de data/ (relativos a data/, com "/" final nas pastas) que não entram na imagem do oráculo:
 * o que o git do validador ignora (pesos dos modelos, vetores de candidatos) + ORACLE_DATA_ALWAYS_EXCLUDED.
 */
export function oracleDataExcluded(validatorDir: string): string[] {
  const ignored = git(validatorDir, ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "--", "data"])
    .split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/^data\//, ""));
  return [...new Set([...ignored, ...ORACLE_DATA_ALWAYS_EXCLUDED])].sort();
}

/** O caminho relativo a data/ cai numa exclusão? (exclusão com "/" final = pasta e tudo abaixo dela) */
export function excludedFromOracleData(rel: string, isDir: boolean, excluded: readonly string[]): boolean {
  const r = rel.replace(/\\/g, "/") + (isDir && !rel.endsWith("/") ? "/" : "");
  return excluded.some((e) => (e.endsWith("/") ? r.startsWith(e) : r === e));
}

/** Rejeita qualquer GOVBR_RETRIEVAL_* num ambiente (KEY=valor da imagem, ou os `-e` de um `docker create`). */
export function assertNoRetrievalEnv(env: readonly string[], where: string): void {
  const found = env.filter((e) => e.startsWith(RETRIEVAL_ENV_PREFIX));
  if (found.length) throw new Error(`${where} define ${found.join(", ")}: a imagem do oráculo só serve a busca léxica padrão`);
}

export function stageOracleData(validatorDir: string, dest: string, excluded: readonly string[]): void {
  const src = join(validatorDir, "data");
  cpSync(src, dest, { recursive: true, filter: (from) => {
    const rel = relative(src, from);
    return !rel || !excludedFromOracleData(rel, lstatSync(from).isDirectory(), excluded);
  } });
}

/**
 * Sobe o servidor do oráculo DENTRO da imagem, por stdio, com o cliente MCP da ponte (SDK 1.29.0 de
 * /opt/runner), em cada perfil que as campanhas pedem, sem GOVBR_RETRIEVAL_*, e devolve o sha256 de
 * JSON.stringify(tools) e o serverInfo. Nenhum modelo, nenhuma rede.
 */
export function oracleToolsListInImage(ref: string, perfis: readonly string[]): Record<string, { sha256: string; tools: string[]; description: string | null; version: string | null }> {
  const script = `
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const out = {};
for (const p of ${JSON.stringify(perfis)}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("${RETRIEVAL_ENV_PREFIX}")));
  env.GOVBR_VALIDATOR_TOOL_PROFILE = p;
  const c = new Client({ name: "build-images", version: "1" });
  await c.connect(new StdioClientTransport({ command: "node", args: ["/opt/oracle/dist/index.js"], env, stderr: "ignore" }));
  const tools = (await c.listTools()).tools;
  const info = c.getServerVersion();
  out[p] = { sha256: createHash("sha256").update(JSON.stringify(tools)).digest("hex"), tools: tools.map((t) => t.name).sort(), description: info?.description ?? null, version: info?.version ?? null };
  await c.close();
}
console.log(JSON.stringify(out));`;
  const r = docker(["run", "--rm", "--network", "none", "--read-only", "--tmpfs", "/tmp", "-e", "HOME=/tmp", "-w", "/opt/runner", ref, "node", "--input-type=module", "-e", script], { timeoutMs: 180_000 });
  return JSON.parse(r.stdout.trim().split("\n").pop()!);
}

function stage(name: Name, telasDir: string, validatorDir: string): string {
  const ctx = mkdtempSync(join(tmpdir(), `govbr-runner-${name}-`));
  const img = join(RUNNER_DIR, "images", name);
  cpSync(join(img, "Dockerfile"), join(ctx, "Dockerfile"));
  const container = join(RUNNER_DIR, "container");
  switch (name) {
    case "agent":
      for (const f of ["package.json", "package-lock.json"]) cpSync(join(img, f), join(ctx, f));
      mkdirSync(join(ctx, "container"));
      for (const f of ["attempts.mjs", "bridge.mjs", "fake-agent.mjs", "probe.mjs"]) cpSync(join(container, f), join(ctx, "container", f));
      break;
    case "screens":
      mkdirSync(join(ctx, "telas"));
      for (const f of ["server.mjs", "site-manifest.json"]) cpSync(join(telasDir, f), join(ctx, "telas", f));
      cpSync(join(telasDir, "site"), join(ctx, "telas", "site"), { recursive: true });
      break;
    case "collector":
      for (const f of ["package.json", "package-lock.json"]) cpSync(join(img, f), join(ctx, f));
      cpSync(join(container, "collector.mjs"), join(ctx, "collector.mjs"));
      mkdirSync(join(ctx, "schemas"));
      for (const f of COLLECTOR_CONTRACT_FILES) cpSync(join(EVAL_ROOT, "contracts", f), join(ctx, "schemas", f));
      break;
    case "egress":
      for (const f of ["egress.mjs", "stub.mjs"]) cpSync(join(container, f), join(ctx, f));
      break;
    case "oracle":
      mkdirSync(join(ctx, "validator"));
      cpSync(join(validatorDir, "dist"), join(ctx, "validator", "dist"), { recursive: true });
      stageOracleData(validatorDir, join(ctx, "validator", "data"), oracleDataExcluded(validatorDir));
      for (const f of ["package.json", "package-lock.json"]) cpSync(join(validatorDir, f), join(ctx, "validator", f));
      break;
  }
  return ctx;
}

/**
 * NAT-61: conteúdo do contexto da imagem do agente (ponte, sonda, agente roteirizado, dependências), com
 * quebras de linha normalizadas. Vai na etiqueta: mudar a ponte muda a etiqueta, e reconstruir numa
 * worktree não move a etiqueta que o lock de outro checkout usa (o run-once confere id por etiqueta).
 */
export function agentContentSha256(): string {
  const img = join(RUNNER_DIR, "images", "agent");
  const container = join(RUNNER_DIR, "container");
  const files = [["Dockerfile", join(img, "Dockerfile")], ["package.json", join(img, "package.json")], ["package-lock.json", join(img, "package-lock.json")],
    ...["attempts.mjs", "bridge.mjs", "fake-agent.mjs", "probe.mjs"].map((f) => [`container/${f}`, join(container, f)])];
  return sha256(files.map(([n, p]) => `${n}:${sha256(readFileSync(p, "utf8").replace(/\r\n/g, "\n"))}`).join("\n"));
}

function inImage(ref: string, script: string, network = "none"): string {
  return docker(["run", "--rm", "--network", network, "--read-only", "--tmpfs", "/tmp", "-e", "HOME=/tmp", ref, "sh", "-c", script]).stdout.trim();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const telasDir = resolve(arg("--telas") ?? DEFAULT_TELAS_DIR);
  const validatorDir = resolve(arg("--validator") ?? DEFAULT_VALIDATOR_DIR);
  const only = arg("--so")?.split(",") as Name[] | undefined;
  // Lock anterior: o próprio destino, ou o commitado quando o destino é novo (CI: GOVBR_RUNNER_LOCK).
  const previousPath = existsSync(LOCK_PATH) ? LOCK_PATH : COMMITTED_LOCK_PATH;
  const previous: Partial<ImagesLock> = existsSync(previousPath) ? JSON.parse(readFileSync(previousPath, "utf8")) : {};

  const telas = telasIdentity(telasDir);
  // Braço sem no CI: o validador nem é baixado. Sem a imagem do oráculo na lista, ele não é lido, e o
  // lock repete as versões travadas do oráculo (o run-once sem nunca as usa).
  const withOracle = !only || only.includes("oracle");
  const oracle = withOracle ? oracleIdentity(validatorDir) : null;
  const oraclePkg = withOracle ? JSON.parse(readFileSync(join(validatorDir, "package.json"), "utf8")) as { name: string; version: string } : null;
  if (oracle && (!oracle.distSha256 || !oracle.dataSha256)) throw new Error(`validador sem dist/ ou data/ em ${validatorDir}`);
  // Commit do validador na etiqueta: só vale com src/, data/ e package*.json sem mudança local (dist/ é do build).
  const oracleCommit = withOracle ? git(validatorDir, ["rev-parse", "HEAD"]).trim() : null;
  if (withOracle) {
    const dirty = git(validatorDir, ["status", "--porcelain", "--", "src", "data", "package.json", "package-lock.json", "tsconfig.json"]).trim();
    if (dirty) throw new Error(`validador com mudança local em ${validatorDir} (o commit da etiqueta não diria o conteúdo):\n${dirty}`);
  }
  const oracleExcluded = withOracle ? oracleDataExcluded(validatorDir) : [];
  // O data/ que de fato vai na imagem (sem os excluídos), para a etiqueta.
  let oracleImageData: string | null = null;
  if (withOracle) {
    const tmp = mkdtempSync(join(tmpdir(), "govbr-runner-oracle-data-"));
    stageOracleData(validatorDir, join(tmp, "data"), oracleExcluded);
    oracleImageData = sha256Tree(join(tmp, "data"))!.sha256;
    rmSync(tmp, { recursive: true, force: true });
  }

  const tags: Record<Name, string> = {
    agent: `govbr-runner-agent:1.0.0-mcp${PLAYWRIGHT_MCP_VERSION}-cc${CLAUDE_CODE_VERSION}-c${agentContentSha256().slice(0, 12)}`,
    screens: `govbr-runner-screens:telas${telas.version}-${telas.siteSha256.slice(0, 12)}`,
    collector: "govbr-runner-collector:1.0.0",
    egress: "govbr-runner-egress:1.0.0",
    oracle: oracle && oraclePkg ? `govbr-runner-oracle:${oraclePkg.version}-${oracle.distSha256!.slice(0, 12)}` : previous.images?.oracle?.tag ?? "govbr-runner-oracle:nao-construida",
  };
  const labels: Record<Name, Record<string, string>> = {
    agent: { "govbr.playwright-mcp": PLAYWRIGHT_MCP_VERSION, "govbr.claude-code": CLAUDE_CODE_VERSION, "govbr.agent.content-sha256": agentContentSha256() },
    screens: { "govbr.telas.site-sha256": telas.siteSha256, "govbr.telas.manifest-sha256": telas.manifestSha256 },
    // NAT-81: `findings-contracts` diz ao run-once que envelopes esta imagem sabe armar; imagem antiga
    // (sem o rótulo) só conhece findings.v1. `schemas` continua o hash do findings.v1 (rótulo histórico).
    collector: { "govbr.collector.schemas": sha256(readFileSync(join(EVAL_ROOT, "contracts", "findings.v1.schema.json"))),
      "govbr.collector.findings-contracts": "findings.v1,findings.v2",
      "govbr.collector.contracts-sha256": sha256(COLLECTOR_CONTRACT_FILES.map((f) => `${f}:${sha256(readFileSync(join(EVAL_ROOT, "contracts", f)))}`).join("\n")) },
    egress: {},
    // `data-sha256` = data/ do validador no host, inteiro (o que o preflight do run-once recalcula e compara);
    // `image-data-sha256` = o data/ que entrou na imagem (sem `image-data-excluded`).
    oracle: oracle && oraclePkg ? { "govbr.oracle.package": oraclePkg.name, "govbr.oracle.version": oraclePkg.version, "govbr.oracle.dist-sha256": oracle.distSha256!, "govbr.oracle.data-sha256": oracle.dataSha256!,
      "govbr.oracle.commit": oracleCommit!, "govbr.oracle.retrieval-mode": ORACLE_RETRIEVAL_MODE,
      "govbr.oracle.image-data-sha256": oracleImageData!, "govbr.oracle.image-data-excluded": oracleExcluded.join(",") } : {},
  };

  const images = { ...(previous.images ?? {}) } as ImagesLock["images"];
  for (const name of ORDER) {
    if (only && !only.includes(name)) continue;
    const ctx = stage(name, telasDir, validatorDir);
    const labelArgs = Object.entries({ "govbr.runner.image": name, "govbr.runner.version": RUNNER_VERSION, "govbr.base": BASE_IMAGE, ...labels[name] })
      .flatMap(([k, v]) => ["--label", `${k}=${v}`]);
    const buildArgs = name === "oracle" ? ["--build-arg", `AGENT_IMAGE=${images.agent.tag}`] : [];
    console.log(`\n== ${name} → ${tags[name]}`);
    const ultimas: string[] = [];
    const code = await dockerStream(["build", "--progress", "plain", "-t", tags[name], ...labelArgs, ...buildArgs, ctx], (l) => {
      ultimas.push(l);
      if (ultimas.length > 25) ultimas.shift();
      if (/^#\d+ (DONE|ERROR|\[)|error|ERROR/.test(l)) console.log(`   ${l.slice(0, 200)}`);
    });
    rmSync(ctx, { recursive: true, force: true });
    if (code !== 0) throw new Error(`build de ${name} falhou (${code}):\n${ultimas.map((l) => `   ${l.slice(0, 300)}`).join("\n")}`);
    images[name] = { tag: tags[name], id: imageId(tags[name])!, labels: imageLabels(tags[name]) };
    if (name === "oracle") {
      // Nada no ambiente da imagem troca o modo de busca, e nenhum dado denso entrou.
      const env = JSON.parse(docker(["image", "inspect", tags[name], "--format", "{{json .Config.Env}}"]).stdout) as string[] | null;
      assertNoRetrievalEnv(env ?? [], `a imagem ${tags[name]}`);
      const listed = inImage(images[name].id, "ls -A /opt/oracle/data/models /opt/oracle/data/retrieval").split(/\s+/).filter((f) => f && !f.endsWith(":"));
      const extra = listed.filter((f) => !["e5-small.LICENSE", "models.json"].includes(f) && !/^(guidance|vocab)-[\d.]+\.json$/.test(f));
      if (extra.length) throw new Error(`imagem do oráculo com dados da busca densa: ${extra.join(", ")}`);
      // O servidor sobe em cada perfil das campanhas e anuncia o tools/list fixado em perfis-oraculo.ts.
      const perfis = Object.keys(PERFIS) as PerfilOraculo[];
      const medido = oracleToolsListInImage(images[name].id, perfis);
      for (const p of perfis) {
        const m = medido[p];
        const ok = m?.sha256 === PERFIS[p].toolsListSha256 && JSON.stringify(m.tools) === JSON.stringify(PERFIS[p].tools) && m.description === `toolProfile=${p}`;
        console.log(`   perfil ${p}: tools/list ${m?.sha256?.slice(0, 12)} (${m?.tools.length} ferramentas, ${m?.description}) ${ok ? "= fixado" : "≠ fixado"}`);
        if (!ok) throw new Error(`oráculo na imagem, perfil ${p}: tools/list ${m?.sha256} ≠ fixado ${PERFIS[p].toolsListSha256} (ou nomes/serverInfo divergentes)`);
      }
    }
    console.log(`   id ${images[name].id}`);
  }

  const agentRef = images.agent.id;
  const playwright = inImage(agentRef, "cd /opt/runner && npx --no-install playwright --version");
  const chromium = inImage(agentRef, "cd /opt/runner && node -e \"require('playwright').chromium.launch({args:['--no-sandbox']}).then(async b=>{console.log(b.version());await b.close()})\"");
  const claude = inImage(agentRef, "cd /opt/runner && ./node_modules/.bin/claude --version");
  const node = inImage(agentRef, "node -v");
  if (node !== `v${NODE_VERSION}`) throw new Error(`Node da imagem ${node} ≠ v${NODE_VERSION}`);
  if (!claude.startsWith(CLAUDE_CODE_VERSION)) throw new Error(`Claude Code da imagem: ${claude}`);

  const lock: ImagesLock = {
    lockVersion: 1,
    builtAt: new Date().toISOString(),
    base: { ref: BASE_IMAGE, node: NODE_VERSION },
    images,
    versions: {
      node: NODE_VERSION, playwrightMcp: PLAYWRIGHT_MCP_VERSION, playwright, chromium, claudeCode: claude,
      oracle: oracle && oraclePkg ? { package: oraclePkg.name, version: oraclePkg.version, distSha256: oracle.distSha256!, dataSha256: oracle.dataSha256! } : previous.versions!.oracle,
      telas: { siteSha256: telas.siteSha256, manifestSha256: telas.manifestSha256 },
    },
  };
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
  console.log(`\n${LOCK_PATH}\n${JSON.stringify(lock.versions, null, 2)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
