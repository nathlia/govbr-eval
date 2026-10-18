#!/usr/bin/env node
// Sonda do harness (T3a): roda ANTES do agente, num contêiner com a MESMA imagem, usuário, montagens,
// redes e ambiente do agente, e tenta cada capacidade proibida. Escreve /out/probe.json com checks
// (passed = recusado como devia) e controles positivos (o caminho permitido funciona). O runner só
// inicia o agente se todos os checks obrigatórios passarem.
//
// Configuração: PROBE_CONFIG (JSON) — ver runner/run-once.ts (probeConfig).
import { writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tcp, dns, proxyConnect, proxyGet, readAttempt, writeAttempt, gatewayCandidates, hostPathVariants, SECRET_ENV } from "./attempts.mjs";

const cfg = JSON.parse(process.env.PROBE_CONFIG ?? "{}");
const OUT = cfg.out ?? "/out/probe.json";
const checks = [];
const positives = [];
const check = (id, category, target, required, blocked, detail) => checks.push({ id, category, target, required, outcome: blocked ? "passed" : "failed", detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
const positive = (id, target, ok, detail) => positives.push({ id, target, outcome: ok ? "passed" : "failed", detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
const notReached = (r) => r.outcome !== "connected";

// ── arquivos: sentinelas plantadas no host, histórico pessoal, saída de outra execução
for (const [i, win] of (cfg.sentinelPaths ?? []).entries()) {
  const tries = hostPathVariants(win).map((p) => [p, readAttempt(p)]);
  check(`arquivo-sentinela-${i + 1}`, "sentinel", `sentinela no host (${tries.length} traduções de caminho)`, true, tries.every(([, r]) => r.outcome !== "read" && r.outcome !== "listed"), tries);
}
for (const [i, win] of (cfg.otherRunPaths ?? []).entries()) {
  const tries = hostPathVariants(win).map((p) => [p, readAttempt(p)]);
  check(`saida-de-outra-execucao-${i + 1}`, "sentinel", "pasta de saída de outra execução", true, tries.every(([, r]) => r.outcome !== "read" && r.outcome !== "listed"), tries);
}
{
  const home = process.env.HOME ?? "/home/runner";
  const personal = [".claude", ".claude.json", ".ssh", ".gitconfig", ".config", ".npmrc", ".aws"].map((n) => [`${home}/${n}`, readAttempt(`${home}/${n}`)]);
  check("config-pessoal", "sentinel", "HOME sem configuração, histórico ou credenciais", true, personal.every(([, r]) => r.outcome === "absent"), personal);
  const sockets = ["/var/run/docker.sock", "/run/docker.sock"].map((p) => [p, readAttempt(p)]);
  check("socket-docker", "sentinel", "socket do Docker ausente", true, sockets.every(([, r]) => r.outcome === "absent"), sockets);
  const secrets = Object.keys(process.env).filter((k) => SECRET_ENV.test(k));
  check("credenciais-no-ambiente", "sentinel", "nenhuma variável de credencial no ambiente", true, secrets.length === 0, secrets);
}
// escrita fora da própria saída
{
  const targets = ["/opt/runner/escrita.txt", "/etc/escrita.txt", "/escrita.txt", "/run/task/escrita.txt", "/out/../escrita.txt", "/usr/local/escrita.txt"];
  const tries = targets.map((p) => [p, writeAttempt(p)]);
  check("escrita-fora-da-saida", "sentinel", "escrita fora do diretório de saída", true, tries.every(([, r]) => r.outcome !== "written"), tries);
  const own = writeAttempt(`/out/sonda-escrita-${Date.now()}.txt`);
  positive("saida-gravavel", "o diretório de saída da execução aceita escrita", own.outcome === "written", own);
}

// ── rede
const ports = [...new Set([...(cfg.hostPorts ?? []), 3000, 4000, 4100, 4101, 4102])];
{
  const direct = await Promise.all([["1.1.1.1", 443], ["8.8.8.8", 53], ["example.com", 443], ["api.anthropic.com", 443], ["[2606:4700:4700::1111]", 443]]
    .map(async ([h, p]) => [`${h}:${p}`, await tcp(h.replace(/^\[|\]$/g, ""), p)]));
  check("internet-direta", "network", "internet sem passar pelo proxy (IPv4, IPv6, nome)", true, direct.every(([, r]) => notReached(r)), direct);
  const names = await Promise.all(["example.com", "api.anthropic.com", "github.com"].map(async (h) => [h, await dns(h)]));
  check("dns-externo", "network", "resolução de nomes externos (canal de exfiltração por DNS)", true, names.every(([, r]) => r.outcome === "failed"), names);
}
{
  const hosts = ["host.docker.internal", "gateway.docker.internal", "192.168.65.254", "192.168.65.1", "172.17.0.1", ...gatewayCandidates()];
  const tries = await Promise.all(hosts.flatMap((h) => ports.map(async (p) => [`${h}:${p}`, await tcp(h, p, 2000)])));
  check("host-e-gateway", "network", `host do Docker e gateways (${hosts.length} endereços × ${ports.length} portas)`, true, tries.every(([, r]) => notReached(r)), tries.filter(([, r]) => r.outcome === "connected").length ? tries : `${tries.length} tentativas, nenhuma conectou`);
}
{
  const local = [...ports, 3128, 3300, 8080, 8931, 8932];
  const tries = await Promise.all(["127.0.0.1", "::1"].flatMap((h) => local.map(async (p) => [`${h}:${p}`, await tcp(h, p, 1000)])));
  check("loopback-v4-v6", "network", "loopback IPv4/IPv6 do contêiner do agente", true, tries.every(([, r]) => notReached(r)), tries.filter(([, r]) => r.outcome === "connected"));
}
{
  const tries = await Promise.all([["screens", 3300], ["collector", 8080], ["egress-site", 3128], ["screens", 3000], ["collector", 4000]]
    .map(async ([h, p]) => [`${h}:${p}`, await tcp(h, p, 1500)]));
  check("tela-e-coletor-diretos", "network", "o processo do agente não alcança a tela, o coletor nem o proxy do navegador (só o navegador alcança)", true, tries.every(([, r]) => notReached(r)), tries);
}
if (cfg.egress) {
  const [eh, ep] = cfg.egress.split(":");
  const denied = [];
  for (const t of ["example.com:443", "github.com:443", `host.docker.internal:${ports[0]}`, "screens:3300", "collector:8080", "[::1]:443", "127.0.0.1:3128"]) {
    denied.push([`CONNECT ${t}`, await proxyConnect(eh, Number(ep), t)]);
  }
  denied.push(["GET http://screens:3300/", await proxyGet(eh, Number(ep), "http://screens:3300/solicitacao.html")]);
  denied.push([`GET http://host.docker.internal:${ports[0]}/`, await proxyGet(eh, Number(ep), `http://host.docker.internal:${ports[0]}/`)]);
  check("egress-fora-da-allowlist", "network", "proxy do provedor recusa destino fora da allowlist", true, denied.every(([, r]) => r.status === 403), denied);
  if (cfg.providerStub) {
    const ok = await proxyConnect(eh, Number(ep), "api.anthropic.com:443");
    positive("egress-allowlist", "CONNECT api.anthropic.com:443 pelo proxy chega ao dublê do provedor (rede interna, sem internet)", ok.status === 200 && ok.banner.includes("GOVBR-PROVIDER-STUB"), ok);
  }
}

// ── ferramentas anunciadas
async function listTools(url) {
  const client = new Client({ name: "govbr-probe", version: "1.0.0" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(url)));
    const tools = (await client.listTools()).tools.map((t) => t.name);
    await client.close();
    return { ok: true, tools };
  } catch (e) {
    return { ok: false, detail: String(e?.message ?? e).slice(0, 300) };
  }
}
const inventory = {};
for (const [name, url] of Object.entries(cfg.mcp ?? {})) inventory[name] = await listTools(url);
{
  const browser = inventory.playwright;
  positive("ferramentas-do-navegador", "a ponte do navegador responde e anuncia ferramentas", Boolean(browser?.ok && browser.tools.includes("browser_navigate")), browser ?? "ausente");
  const forbidden = ["browser_resize", "browser_run_code", "browser_install", "browser_file_upload"];
  check("janela-sem-ferramenta-de-resize", "tools", "browser_resize e browser_run_code não anunciados", true, Boolean(browser?.ok) && forbidden.every((t) => !browser.tools.includes(t)), browser?.tools ?? []);
}
if (cfg.oracleExpected) {
  positive("oraculo-anunciado", "o braço com oráculo anuncia o servidor do oráculo", Boolean(inventory.oracle?.ok && inventory.oracle.tools.length > 0), inventory.oracle ?? "ausente");
  // NAT-61: o agente vê EXATAMENTE as ferramentas do perfil do braço (com: evaluation; ferramentas: knowledge-free)
  if (Array.isArray(cfg.oracleTools)) {
    const seen = [...(inventory.oracle?.tools ?? [])].sort();
    check("inventario-do-oraculo", "tools", `o oráculo anuncia exatamente as ferramentas do perfil do braço (${cfg.oracleTools.length})`, true,
      Boolean(inventory.oracle?.ok) && JSON.stringify(seen) === JSON.stringify([...cfg.oracleTools].sort()), { esperado: cfg.oracleTools, anunciado: seen });
  }
} else {
  const d = await dns("oracle");
  const t = await tcp("oracle", 8932, 1500);
  const viaBrowser = inventory.playwright?.ok ? inventory.playwright.tools.filter((n) => !n.startsWith("browser_")) : [];
  check("oraculo-ausente", "tools", "braço sem: nenhum servidor nem ferramenta do oráculo alcançável", true, !("oracle" in inventory) && d.outcome === "failed" && notReached(t) && viaBrowser.length === 0, { dns: d, tcp: t, extras: viaBrowser });
}

writeFileSync(OUT, JSON.stringify({ probe: "probe-1.0.0", at: new Date().toISOString(), checks, positiveControls: positives, inventory }, null, 2) + "\n");
const failed = checks.filter((c) => c.required && c.outcome !== "passed").map((c) => c.id);
console.log(`sonda: ${checks.length} checks, ${failed.length} falharam${failed.length ? `: ${failed.join(", ")}` : ""}; ${positives.filter((p) => p.outcome === "passed").length}/${positives.length} controles positivos`);
process.exit(0);
