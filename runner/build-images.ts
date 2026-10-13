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
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { oracleIdentity } from "../scripts/collection-manifest";
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
      for (const d of ["dist", "data"]) cpSync(join(validatorDir, d), join(ctx, "validator", d), { recursive: true });
      for (const f of ["package.json", "package-lock.json"]) cpSync(join(validatorDir, f), join(ctx, "validator", f));
      break;
  }
  return ctx;
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

  const tags: Record<Name, string> = {
    agent: `govbr-runner-agent:1.0.0-mcp${PLAYWRIGHT_MCP_VERSION}-cc${CLAUDE_CODE_VERSION}`,
    screens: `govbr-runner-screens:telas${telas.version}-${telas.siteSha256.slice(0, 12)}`,
    collector: "govbr-runner-collector:1.0.0",
    egress: "govbr-runner-egress:1.0.0",
    oracle: oracle && oraclePkg ? `govbr-runner-oracle:${oraclePkg.version}-${oracle.distSha256!.slice(0, 12)}` : previous.images?.oracle?.tag ?? "govbr-runner-oracle:nao-construida",
  };
  const labels: Record<Name, Record<string, string>> = {
    agent: { "govbr.playwright-mcp": PLAYWRIGHT_MCP_VERSION, "govbr.claude-code": CLAUDE_CODE_VERSION },
    screens: { "govbr.telas.site-sha256": telas.siteSha256, "govbr.telas.manifest-sha256": telas.manifestSha256 },
    // NAT-81: `findings-contracts` diz ao run-once que envelopes esta imagem sabe armar; imagem antiga
    // (sem o rótulo) só conhece findings.v1. `schemas` continua o hash do findings.v1 (rótulo histórico).
    collector: { "govbr.collector.schemas": sha256(readFileSync(join(EVAL_ROOT, "contracts", "findings.v1.schema.json"))),
      "govbr.collector.findings-contracts": "findings.v1,findings.v2",
      "govbr.collector.contracts-sha256": sha256(COLLECTOR_CONTRACT_FILES.map((f) => `${f}:${sha256(readFileSync(join(EVAL_ROOT, "contracts", f)))}`).join("\n")) },
    egress: {},
    oracle: oracle && oraclePkg ? { "govbr.oracle.package": oraclePkg.name, "govbr.oracle.version": oraclePkg.version, "govbr.oracle.dist-sha256": oracle.distSha256!, "govbr.oracle.data-sha256": oracle.dataSha256! } : {},
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
