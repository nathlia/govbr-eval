/**
 * Teste de isolamento da superfície de medida — checklist v02, fatia 1 (D-40). Nenhuma chamada de
 * modelo.
 *
 * Sobe a superfície a partir do build do corpus, liga o painel antigo como alvo REAL do vazamento
 * (o teste confere, de fora da política, que o gabarito responde nele — senão o teste seria vazio)
 * e dirige pelo MCP o mesmo Playwright MCP e o mesmo oráculo que as execuções usam, lidos de
 * pipeline/mcp-*.json, como um agente faria.
 *
 * Uso: tsx scripts/test-isolation.ts [--corpus-dist ../govbr-corpus/dist] [--out ARQUIVO.json]
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ROOT } from "./adjudication";
import { statePlanOf } from "./collection-manifest";
import { DEFAULT_PORTS, HOST, createEgressProxy, startSurface, type EgressEvent, type RunningSurface } from "./measurement-surface";

interface McpServerConfig { command: string; args?: string[]; env?: Record<string, string> }
interface Check { name: string; passed: boolean; detail: string }

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const corpusDist = resolve(ROOT, argValue("--corpus-dist") ?? "../govbr-corpus/dist");
const outFile = argValue("--out");

const checks: Check[] = [];
const check = (name: string, passed: boolean, detail = ""): void => {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const BLOCK_PAGE = "Bloqueado pela politica de rede";
const CHROME_BACKGROUND = /(^|\.)(google\.com|gstatic\.com|googleapis\.com|gvt1\.com)(:\d+)?$/;
const fsUrl = (host: string, rel: string): string =>
  `http://${host}/@fs/${encodeURI(join(ROOT, rel).replace(/\\/g, "/"))}`;

function readMcp(file: string): Record<string, McpServerConfig> {
  return (JSON.parse(readFileSync(join(ROOT, "pipeline", file), "utf8")) as { mcpServers: Record<string, McpServerConfig> }).mcpServers;
}

async function connect(config: McpServerConfig, cwd: string, overrideArgs?: string[]): Promise<Client> {
  const transport = new StdioClientTransport({
    command: config.command,
    args: overrideArgs ?? config.args ?? [],
    env: { ...(process.env as Record<string, string>), ...(config.env ?? {}) },
    cwd,
    stderr: "pipe",
  });
  const client = new Client({ name: "govbr-eval-isolation", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

function toolText(result: unknown): { isError: boolean; text: string } {
  const r = result as { isError?: boolean; content?: { type: string; text?: string }[] };
  return { isError: Boolean(r.isError), text: (r.content ?? []).map((c) => c.text ?? "").join("\n") };
}

async function navigate(client: Client, url: string): Promise<{ error: string | null; body: string }> {
  // Uma navegação recusada deixa a página de erro do Chromium ainda carregando, e a próxima pode ser
  // interrompida ou abortada por ela. Repetir é esperar o erro anterior assentar, não mascarar
  // recusa: a recusa do proxy chega como página 403 ou ERR_TUNNEL, que não entram aqui.
  let nav = toolText(await client.callTool({ name: "browser_navigate", arguments: { url } }));
  for (let attempt = 1; attempt < 4 && /is interrupted by another navigation|net::ERR_ABORTED/.test(nav.text); attempt++) {
    await new Promise((r) => setTimeout(r, 1000 * attempt));
    nav = toolText(await client.callTool({ name: "browser_navigate", arguments: { url } }));
  }
  if (nav.isError || /### Error/.test(nav.text)) return { error: nav.text.replace(/\s+/g, " ").slice(0, 240), body: "" };
  return { error: null, body: await evaluate(client, "() => document.body ? document.body.innerText.slice(0, 2000) : ''") };
}

async function evaluate(client: Client, fn: string): Promise<string> {
  const { text } = toolText(await client.callTool({ name: "browser_evaluate", arguments: { function: fn } }));
  const match = /### Result\n([\s\S]*?)(\n### |$)/.exec(text);
  if (!match) return text;
  try {
    return String(JSON.parse(match[1]));
  } catch {
    return match[1];
  }
}

async function httpText(url: string): Promise<{ status: number; text: string } | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { status: response.status, text: await response.text() };
  } catch {
    return null;
  }
}

async function waitFor<T>(probe: () => Promise<T | null>, ms: number): Promise<T | null> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function eventsSince(events: EgressEvent[], from: number): EgressEvent[] {
  return events.slice(from);
}

async function main(): Promise<void> {
  if (!existsSync(join(corpusDist, "fluxo.html"))) throw new Error(`Build do corpus ausente em ${corpusDist}. Rode 'npm run build' em govbr-corpus.`);

  // ── Configuração: a mesma que o runner entrega aos dois braços.
  const com = readMcp("mcp-com-oraculo.json");
  const sem = readMcp("mcp-sem-oraculo.json");
  const proxyServer = `http://${HOST}:${DEFAULT_PORTS.proxy}`;
  const siteOrigin = `http://${HOST}:${DEFAULT_PORTS.site}`;
  const collectorOrigin = `http://${HOST}:${DEFAULT_PORTS.collector}`;
  check("braços recebem o mesmo Playwright MCP", JSON.stringify(com.playwright) === JSON.stringify(sem.playwright));
  const pwArgs = com.playwright.args ?? [];
  check("Playwright MCP aponta para o proxy da superfície", pwArgs.join(" ").includes(`--proxy-server ${proxyServer}`), pwArgs.join(" "));
  check("Playwright MCP com perfil em memória", pwArgs.includes("--isolated"));
  const validatorEnv = com["govbr-ds-validator"].env ?? {};
  check("oráculo aponta para o mesmo proxy", validatorEnv.GOVBR_VALIDATOR_PROXY_SERVER === proxyServer, String(validatorEnv.GOVBR_VALIDATOR_PROXY_SERVER));
  check("oráculo só abre o site congelado", validatorEnv.GOVBR_VALIDATOR_ALLOWED_ORIGINS === siteOrigin, String(validatorEnv.GOVBR_VALIDATOR_ALLOWED_ORIGINS));

  const work = mkdtempSync(join(tmpdir(), "govbr-isolation-"));
  const children: ChildProcess[] = [];
  const clients: Client[] = [];
  const servers: Server[] = [];
  let surface: RunningSurface | null = null;

  try {
    surface = await startSurface({ corpusDist, entry: "fluxo.html", outDir: join(work, "surface") });
    const entryUrl = surface.description.entryUrl;

    // ── O alvo do vazamento tem de estar vivo, conferido de FORA da política.
    const gabaritoProbe = fsUrl("localhost:4000", "ground-truth-fluxo.json");
    if (!(await httpText(gabaritoProbe))) {
      const dashboard = spawn("npm --prefix dashboard run dev -- --port 4000 --strictPort", { cwd: ROOT, shell: true, stdio: "ignore" });
      children.push(dashboard);
    }
    const live = await waitFor(async () => {
      const r = await httpText(gabaritoProbe);
      return r && r.status === 200 && r.text.includes('"violations"') ? r : null;
    }, 60_000);
    check("controle: o painel serve o gabarito a quem está fora da política", Boolean(live), gabaritoProbe);
    if (!live) throw new Error("Sem alvo vivo o teste de isolamento não prova nada.");

    const playwright = await connect(com.playwright, work);
    clients.push(playwright);

    // ── Negativos: navegação.
    const blockedHttp = [
      "http://localhost:4000/",
      gabaritoProbe,
      fsUrl("127.0.0.1:4000", "ground-truth-fluxo.json"),
      fsUrl("[::1]:4000", "ground-truth-fluxo.json"),
      fsUrl("localhost:4000", "ground-truth.json"),
      fsUrl("localhost:4000", "results/agent-results.json"),
      fsUrl("localhost:4000", "adjudications.json"),
      "http://localhost:4000/agent-results.json",
      "http://localhost:3000/",
      "http://localhost:3000/fluxo.html",
      `http://${HOST}:${DEFAULT_PORTS.control}/control/status`,
      `http://${HOST}:${DEFAULT_PORTS.proxy}/`,
      `http://localhost:${DEFAULT_PORTS.site}/fluxo.html`,
    ];
    for (const url of blockedHttp) {
      const from = surface.egress.length;
      const result = await navigate(playwright, url);
      const denied = eventsSince(surface.egress, from).some((e) => !e.allowed && url.includes(e.target.replace(/^http:\/\//, "").split("/")[0]));
      const leaked = /"violations"|"verdicts"|"adjudications"|"allowedHosts"/.test(result.body);
      check(`navegação bloqueada: ${url}`, denied && !leaked && (result.error !== null || result.body.includes(BLOCK_PAGE)),
        result.error ?? result.body.slice(0, 60));
    }

    // ── Negativos: rotas irmãs na origem permitida.
    const mainBundle = readdirSync(join(corpusDist, "assets")).find((f) => /^main-.*\.js$/.test(f));
    const siblings = ["/", "/index.html", "/real/pnip-login.html", "/static/protocolo.html", "/src/fluxo.tsx",
      `/@fs/${encodeURI(join(ROOT, "ground-truth-fluxo.json").replace(/\\/g, "/"))}`, ...(mainBundle ? [`/assets/${mainBundle}`] : [])];
    for (const path of siblings) {
      const result = await navigate(playwright, `${siteOrigin}${path}`);
      check(`rota irmã indisponível: ${path}`, result.body.trim() === "404", result.error ?? result.body.slice(0, 60));
    }

    // ── Positivo: a tela congelada carrega inteira, sem recurso externo.
    let from = surface.egress.length;
    const page = await navigate(playwright, entryUrl);
    check("a tela congelada carrega", page.body.includes("CPF"), page.error ?? page.body.slice(0, 80));
    await evaluate(playwright, "() => { document.querySelector('.acao-continuar').click(); return 'ok'; }");
    const errorShown = await evaluate(playwright, "() => new Promise(r => setTimeout(() => r(String(!!document.querySelector('.mensagem-erro-cpf'))), 500))");
    check("o estado do setup do gabarito é alcançável", errorShown === "true");

    // ── A janela é uma dimensão do experimento (D-46). O scorer só ancora uma alegação na cena de
    // mesma LARGURA, e o protocolo manda relatar a janela real: se o navegador medido não abre na
    // janela padrão do plano, o braço mede 0 por construção. Conferir os argumentos não basta — a
    // janela é MEDIDA aqui, contra o mesmo plano de estados que o manifesto e o scorer leem.
    const statePlan = statePlanOf(JSON.parse(readFileSync(join(ROOT, "ground-truth-fluxo.json"), "utf8")));
    const windowSize = "() => window.innerWidth + 'x' + window.innerHeight";
    const opened = await evaluate(playwright, windowSize);
    check("o navegador medido abre na janela padrão do plano", opened === `${statePlan.padrao.width}x${statePlan.padrao.height}`,
      `medido ${opened}, plano ${statePlan.padrao.width}x${statePlan.padrao.height}`);
    for (const extra of statePlan.extras.length ? statePlan.extras : [{ viewport: { width: 320, height: 720 } }]) {
      await playwright.callTool({ name: "browser_resize", arguments: extra.viewport });
      await new Promise((r) => setTimeout(r, 500));
      const resized = await evaluate(playwright, windowSize);
      check(`a janela ${extra.viewport.width}x${extra.viewport.height} do plano é alcançável pelo agente`,
        resized === `${extra.viewport.width}x${extra.viewport.height}`, `medido ${resized}`);
    }
    const loadEvents = eventsSince(surface.egress, from);
    const missing = loadEvents.filter((e) => e.target.startsWith(siteOrigin) && e.status !== 200 && !e.target.endsWith("/favicon.ico"));
    check("nenhum arquivo da tela falta no site congelado", missing.length === 0, missing.map((e) => `${e.target} ${e.status}`).join(", "));
    const externalFromPage = loadEvents.filter((e) => !e.allowed && !CHROME_BACKGROUND.test(e.target.replace(/^https?:\/\//, "").split("/")[0]));
    check("a tela não pede recurso fora da política", externalFromPage.length === 0, externalFromPage.map((e) => e.target).join(", "));

    // ── Negativos: pedidos feitos pela própria página (fetch, frame, worker).
    from = surface.egress.length;
    const inPage = await evaluate(playwright, `async () => {
      const out = [];
      for (const target of ${JSON.stringify([gabaritoProbe, fsUrl("127.0.0.1:4000", "ground-truth-fluxo.json"), `http://${HOST}:${DEFAULT_PORTS.control}/control/status`])}) {
        try { const r = await fetch(target); out.push(r.status + ':' + (await r.text()).slice(0, 80)); } catch (e) { out.push('erro'); }
      }
      const frame = document.createElement('iframe'); frame.src = ${JSON.stringify(fsUrl("localhost:4000", "ground-truth.json"))}; document.body.appendChild(frame);
      new Worker(URL.createObjectURL(new Blob(["fetch(" + ${JSON.stringify(JSON.stringify(fsUrl("localhost:4000", "adjudications.json")))} + ").catch(() => {})"])));
      await new Promise(r => setTimeout(r, 1500));
      return out.join(' | ');
    }`);
    const inPageDenied = eventsSince(surface.egress, from).filter((e) => !e.allowed).map((e) => e.target);
    check("fetch da página não alcança o painel nem o controle", !/"violations"|allowedHosts/.test(inPage), inPage.slice(0, 160));
    check("frame e worker da página passam pelo proxy e são negados",
      inPageDenied.some((t) => t.endsWith("ground-truth.json")) && inPageDenied.some((t) => t.endsWith("adjudications.json")),
      inPageDenied.join(", "));

    // ── Negativos: documentação externa (por último entre as navegações: a página de erro do
    // Chromium que cada recusa HTTPS deixa não deve interferir nas verificações acima).
    for (const url of ["https://www.gov.br/ds/", "https://cdngovbr-ds.estaleiro.serpro.gov.br/design-system/", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"]) {
      const from = surface.egress.length;
      const result = await navigate(playwright, url);
      const denied = eventsSince(surface.egress, from).some((e) => e.kind === "connect" && !e.allowed && url.includes(e.target.split(":")[0]));
      check(`documentação externa bloqueada: ${url}`, denied && result.error !== null, result.error ?? result.body.slice(0, 60));
    }

    // ── Redirecionamento: mesmo mecanismo, com um redirecionador permitido só neste teste.
    const redirector = createServer((_req, res) => { res.writeHead(302, { location: gabaritoProbe }); res.end(); });
    await new Promise<void>((r) => redirector.listen(0, HOST, () => r()));
    servers.push(redirector);
    const redirectorHost = `${HOST}:${(redirector.address() as AddressInfo).port}`;
    const testProxy = createEgressProxy([redirectorHost], null);
    await new Promise<void>((r) => testProxy.server.listen(0, HOST, () => r()));
    servers.push(testProxy.server);
    const testProxyUrl = `http://${HOST}:${(testProxy.server.address() as AddressInfo).port}`;
    const redirectArgs = pwArgs.map((a) => (a === proxyServer ? testProxyUrl : a));
    const redirectClient = await connect(com.playwright, work, redirectArgs);
    clients.push(redirectClient);
    const redirected = await navigate(redirectClient, `http://${redirectorHost}/go`);
    const followed = testProxy.events.find((e) => e.target.includes("ground-truth-fluxo.json"));
    check("redirecionamento para fora da política é negado no salto",
      Boolean(followed && !followed.allowed) && !redirected.body.includes('"violations"'),
      followed ? `${followed.target} → ${followed.status}` : "o salto não passou pelo proxy");

    // ── Positivo: submissão pelo coletor, idempotente.
    const runId = `isolation-${Date.now()}`;
    const control = `http://${HOST}:${DEFAULT_PORTS.control}`;
    await fetch(`${control}/control/arm`, { method: "POST", body: JSON.stringify({ runId }) });
    await navigate(playwright, `${collectorOrigin}/`);
    const report = { timestamp: new Date().toISOString(), model: "teste", appUrl: entryUrl, scope: ["teste"], findings: [{
      selector: "#cpf", rule: null, observed: "teste de encanamento", expected: "o relatório chega ao coletor",
      state: { viewport: { width: 1280, height: 720 }, steps: [] }, evidence: [] }] };
    const post = (body: unknown): string => `async () => { const r = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }); return r.status + ' ' + (await r.text()); }`;
    const first = await evaluate(playwright, post(report));
    const again = await evaluate(playwright, post(report));
    const different = await evaluate(playwright, post({ ...report, findings: [] }));
    const legacyShape = await evaluate(playwright, post({ ...report, findings: [{ selector: "#cpf", rule: "wcag:3.3.2", description: "contrato antigo" }] }));
    check("o coletor aceita o relatório da execução armada", first.startsWith("200") && first.includes('"receipt"'), first.slice(0, 120));
    check("reenvio idêntico devolve o mesmo recibo", again.startsWith("200") && again.includes('"duplicate":true'), again.slice(0, 120));
    check("relatório diferente não sobrescreve o aceito", different.startsWith("409"), different.slice(0, 120));
    check("relatório no contrato antigo é recusado com erro acionável", legacyShape.startsWith("400") && legacyShape.includes("observed"), legacyShape.slice(0, 120));
    const disarmed = await (await fetch(`${control}/control/disarm`, { method: "POST" })).json() as { receipt: unknown; rejected: string[] };
    check("o desarme devolve recibo e as duas recusas arquivadas", Boolean(disarmed.receipt) && disarmed.rejected.length === 2);
    const unarmed = await evaluate(playwright, post(report));
    check("sem execução armada, nada é aceito", unarmed.startsWith("409"), unarmed.slice(0, 80));

    // Execução que só envia relatório fora do contrato: o desarme arquiva a última recusa como o
    // relatório dela, sinalizado e sem satisfazer o contrato.
    const refusedRun = `isolation-recusa-${Date.now()}`;
    await fetch(`${control}/control/arm`, { method: "POST", body: JSON.stringify({ runId: refusedRun }) });
    const onlyLegacy = await evaluate(playwright, post({ ...report, findings: [{ selector: "#cpf", rule: "wcag:3.3.2", description: "contrato antigo" }] }));
    const promotedOutcome = await (await fetch(`${control}/control/disarm`, { method: "POST" })).json() as {
      receipt: { status?: string; rejectedFile?: string; file?: string } | null; rejected: string[] };
    const promotedRecord = promotedOutcome.receipt?.file
      ? JSON.parse(readFileSync(join(work, "surface", "inbox", promotedOutcome.receipt.file), "utf8")) as {
        collector?: { status?: string; satisfiesContract?: boolean }; findings?: unknown[] }
      : null;
    check("sem relatório aceito, a última recusa vira o relatório da execução, sinalizada",
      onlyLegacy.startsWith("400") && promotedOutcome.receipt?.status === "recusa-arquivada" &&
      promotedOutcome.receipt.rejectedFile === promotedOutcome.rejected.at(-1) &&
      promotedRecord?.collector?.status === "recusa-arquivada" && promotedRecord.collector.satisfiesContract === false &&
      promotedRecord.findings?.length === 1,
      JSON.stringify(promotedOutcome.receipt).slice(0, 160));

    // ── Oráculo: o navegador dele obedece à mesma política.
    const validatorDist = com["govbr-ds-validator"].args?.[0] ?? "";
    if (!existsSync(validatorDist)) throw new Error(`dist do oráculo ausente: ${validatorDist}`);
    const oracle = await connect(com["govbr-ds-validator"], work);
    clients.push(oracle);
    const leakScan = toolText(await oracle.callTool({ name: "scan_page", arguments: { url: gabaritoProbe, checks: ["tokens"] } }));
    check("scan_page recusa o painel", leakScan.isError && /fora da política/.test(leakScan.text), leakScan.text.slice(0, 120));
    const okScan = toolText(await oracle.callTool({ name: "scan_page", arguments: { url: entryUrl, checks: ["tokens"] } }));
    check("scan_page funciona na tela congelada", !okScan.isError && okScan.text.includes("stateFingerprint"), okScan.text.slice(0, 120));
  } finally {
    for (const client of clients) await client.close().catch(() => {});
    for (const server of servers) { server.closeAllConnections(); server.close(); }
    await surface?.close();
    for (const child of children) {
      if (child.pid) { try { execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* já saiu */ } }
    }
  }

  const passed = checks.every((c) => c.passed);
  const result = {
    test: "isolation",
    surfaceVersion: surface?.description.version ?? null,
    at: new Date().toISOString(),
    corpusDist,
    siteManifestSha256: surface?.description.siteManifestSha256 ?? null,
    playwrightArgs: com.playwright.args,
    validatorEgressEnv: {
      GOVBR_VALIDATOR_PROXY_SERVER: com["govbr-ds-validator"].env?.GOVBR_VALIDATOR_PROXY_SERVER ?? null,
      GOVBR_VALIDATOR_ALLOWED_ORIGINS: com["govbr-ds-validator"].env?.GOVBR_VALIDATOR_ALLOWED_ORIGINS ?? null,
    },
    passed,
    checks,
  };
  if (outFile) writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(`\ntest:isolation - ${checks.filter((c) => c.passed).length}/${checks.length} ${passed ? "ok" : "FALHOU"}`);
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
