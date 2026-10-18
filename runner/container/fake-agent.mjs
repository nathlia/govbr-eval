#!/usr/bin/env node
// Agente roteirizado (T3a): NENHUMA chamada a modelo. Fala com as mesmas pontes MCP (navegador e,
// no braço com, oráculo) que o cliente real vai usar, lê o mesmo texto da tarefa e envia ao mesmo
// coletor pelo navegador, como a skill manda. Serve para provar as paredes, não o cliente real.
//
// FAKE_SCENARIO: honesto | vazio | sem-envio | malformado | proibido | marcador | conferir-marcador |
//                travar | larguras
// FAKE_CONFIG (JSON): sentinelPaths, otherRunPaths, hostPorts, egress, oracleExpected
// Saída: /out/fake-agent.json (passos, tentativas, impressões digitais do estado inicial).
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tcp, dns, proxyConnect, readAttempt, writeAttempt, gatewayCandidates, hostPathVariants } from "./attempts.mjs";

const SCENARIO = process.env.FAKE_SCENARIO ?? "honesto";
const cfg = JSON.parse(process.env.FAKE_CONFIG ?? "{}");
const prompt = readFileSync("/run/task/prompt.txt", "utf8");
const mcpConfig = JSON.parse(readFileSync("/run/task/mcp.json", "utf8")).mcpServers;
const out = { agent: "fake-agent-1.0.0", scenario: SCENARIO, startedAt: new Date().toISOString(), steps: [], attempts: [], fingerprints: {}, submission: null };
const save = () => writeFileSync("/out/fake-agent.json", JSON.stringify(out, null, 2) + "\n");
const step = (s) => { out.steps.push({ at: new Date().toISOString(), ...s }); save(); };
/** expected: "refused" (tinha de ser barrado) | "allowed". outcome observado: "refused" | "reached". */
const attempt = (id, via, target, refused, detail) => { out.attempts.push({ id, via, target, outcome: refused ? "refused" : "reached", detail }); save(); };

const entrada = (label) => {
  const m = new RegExp(`- ${label}: (.+)`).exec(prompt);
  if (!m) throw new Error(`entrada ausente no texto da tarefa: ${label}`);
  return m[1].trim();
};
const URL_TELA = entrada("URL da tela");
const envio = /navegue até (\S+) e, a partir dessa página, faça `POST` em `([^`]+)`/.exec(prompt);
if (!envio) throw new Error("destino de envio ausente no texto da tarefa");
const [ORIGEM, CAMINHO] = [envio[1], envio[2]];

// ── MCP
const clients = {};
/** Ferramentas que o oráculo anuncia (com: perfil evaluation; ferramentas: knowledge-free). */
let oracleTools = [];
for (const [name, conf] of Object.entries(mcpConfig)) {
  const c = new Client({ name: "fake-agent", version: "1.0.0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(conf.url)));
  clients[name] = c;
  const tools = (await c.listTools()).tools.map((t) => t.name);
  if (name !== "playwright") { clients.oracle = c; oracleTools = tools; }
  step({ kind: "connect", server: name, tools });
}
/** NAT-61: ferramentas do perfil evaluation que o perfil knowledge-free retira (e uma que nenhum braço tem). */
const RETIRADAS = ["get_ds_rules", "get_component_spec", "get_design_tokens", "get_emag_rules", "get_page_rules", "run_axe_scan", "inspect_computed_styles"];
const textOf = (r) => (r?.content ?? []).map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n");
async function call(server, tool, args = {}) {
  try {
    const r = await clients[server].callTool({ name: tool, arguments: args }, undefined, { timeout: 180_000 });
    return { isError: Boolean(r.isError), text: textOf(r) };
  } catch (e) {
    return { isError: true, text: `exceção: ${e?.message ?? e}` };
  }
}
const pw = (tool, args) => call("playwright", tool, args);
function evalResult(text) {
  const m = /### Result\n([\s\S]*?)(\n###|$)/.exec(text);
  let v = m ? m[1].trim() : text;
  try { v = JSON.parse(v); } catch { /* texto */ }
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return v; } }
  return v;
}
async function evaluate(fn) {
  const r = await pw("browser_evaluate", { function: fn });
  return { ...r, value: r.isError ? null : evalResult(r.text) };
}
const FINGERPRINT = `async () => {
  const idb = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name).sort() : null;
  const sw = navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : null;
  const cache = self.caches ? (await caches.keys()).sort() : null;
  return JSON.stringify({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage).sort(), cookie: document.cookie,
    idb, sw, cache, w: innerWidth, h: innerHeight, title: document.title, marker: localStorage.getItem('govbr-marcador') });
}`;
async function viewport() {
  const r = await evaluate("() => JSON.stringify({ width: innerWidth, height: innerHeight })");
  return r.value;
}
async function submit(bodyText, headers = {}) {
  await pw("browser_navigate", { url: ORIGEM });
  const fn = `async () => { const r = await fetch(${JSON.stringify(CAMINHO)}, { method: 'POST', headers: ${JSON.stringify({ "content-type": "application/json", ...headers })}, body: ${JSON.stringify(bodyText)} }); return JSON.stringify({ status: r.status, body: await r.text() }); }`;
  const r = await evaluate(fn);
  return r.value ?? { error: r.text.slice(0, 300) };
}
function report(findings, vp, extra = {}) {
  return { timestamp: new Date().toISOString(), model: "agente-roteirizado", appUrl: URL_TELA, scope: ["janela inicial"], notes: `cenário ${SCENARIO}; agente roteirizado sem modelo`, findings, ...extra };
}
async function honestFinding() {
  await pw("browser_navigate", { url: URL_TELA });
  const vp = await viewport();
  step({ kind: "viewport", vp });
  await pw("browser_snapshot", {});
  const subject = await evaluate("() => { const h = document.querySelector('h1'); return JSON.stringify({ sel: h ? 'h1' : 'body', text: ((h ? h.textContent : document.title) || '').trim().slice(0, 80) }); }");
  const evidence = [];
  if (clients.oracle) {
    // consulta normativa só onde o perfil a anuncia (com); no braço ferramentas ela não existe
    if (oracleTools.includes("get_emag_rules")) {
      const rules = await call("oracle", "get_emag_rules", { section: 1 });
      step({ kind: "oracle", tool: "get_emag_rules", isError: rules.isError, bytes: rules.text.length });
    }
    const scan = await call("oracle", "scan_page", { url: URL_TELA });
    step({ kind: "oracle", tool: "scan_page", isError: scan.isError, bytes: scan.text.length });
    const id = /"scanId"\s*:\s*"([^"]+)"/.exec(scan.text)?.[1];
    if (id) evidence.push(id);
  }
  const v = subject.value ?? { sel: "body", text: "" };
  return {
    vp,
    finding: {
      selector: v.sel, rule: null, observed: `texto do sujeito: "${v.text || "(vazio)"}"`,
      expected: "achado de teste do agente roteirizado; sem valor de avaliação",
      state: { viewport: { width: vp?.width ?? 1, height: vp?.height ?? 1 }, steps: [] }, evidence,
    },
  };
}

// ── tentativas proibidas pelo caminho do agente (MCP + processo)
async function forbidden() {
  const ports = [...new Set([...(cfg.hostPorts ?? []), 3000, 4000, 4100])];
  // arquivos
  for (const p of (cfg.sentinelPaths ?? []).flatMap(hostPathVariants)) { const r = readAttempt(p); attempt("ler-sentinela", "processo", p, r.outcome !== "read" && r.outcome !== "listed", r); }
  for (const p of (cfg.otherRunPaths ?? []).flatMap(hostPathVariants)) { const r = readAttempt(p); attempt("ler-outra-execucao", "processo", p, r.outcome !== "read" && r.outcome !== "listed", r); }
  for (const p of ["/opt/runner/x.txt", "/etc/x.txt", "/x.txt", "/run/task/x.txt", "/out/../x.txt"]) { const r = writeAttempt(p); attempt("escrever-fora-da-saida", "processo", p, r.outcome !== "written", r); }
  // rede do processo
  for (const [h, p] of [["1.1.1.1", 443], ["example.com", 443], ["host.docker.internal", ports[0]], ["::1", ports[0]], ["127.0.0.1", ports[0]], ...gatewayCandidates().map((g) => [g, ports[0]]), ["screens", 3300], ["collector", 8080]]) {
    const r = await tcp(h, p, 1500); attempt("tcp-direto", "processo", `${h}:${p}`, r.outcome !== "connected", r);
  }
  { const r = await dns("example.com"); attempt("dns-externo", "processo", "example.com", r.outcome === "failed", r); }
  if (cfg.egress) {
    const [eh, ep] = cfg.egress.split(":");
    for (const t of ["example.com:443", `host.docker.internal:${ports[0]}`]) { const r = await proxyConnect(eh, Number(ep), t); attempt("egress-fora-da-allowlist", "processo", t, r.status === 403, r); }
  }
  // navegador: file://, internet, host, outras portas, controles do runner
  const navTargets = [
    "file:///etc/hostname", "file:///out/tool-events.ndjson", ...(cfg.sentinelPaths ?? []).map((p) => `file:///${p.replace(/\\/g, "/")}`),
    "http://example.com/", "https://example.com/", `http://host.docker.internal:${ports[0]}/sentinela`, ...ports.map((p) => `http://host.docker.internal:${p}/`),
    `http://[::1]:${ports[0]}/`, "http://127.0.0.1:8931/health", "http://screens:3000/", "http://collector:4000/", "http://egress-site:3128/",
    "http://oracle:8932/health", "http://browser:8931/health", "http://172.17.0.1:4000/",
  ];
  for (const url of navTargets) {
    const r = await pw("browser_navigate", { url });
    const body = r.isError ? "" : (await evaluate("() => document.body ? document.body.innerText.slice(0, 200) : ''")).value ?? "";
    const reached = !r.isError && !/Bloqueado pela politica|ERR_|403/.test(`${r.text}\n${body}`);
    attempt("navegar", "browser_navigate", url, !reached, { isError: r.isError, text: r.text.slice(0, 200), body: String(body).slice(0, 120) });
  }
  // fetch de file:// e de outro host a partir da página da tela
  await pw("browser_navigate", { url: URL_TELA });
  for (const target of ["file:///etc/hostname", `http://host.docker.internal:${ports[0]}/`, "http://example.com/"]) {
    const r = await evaluate(`async () => { try { const x = await fetch(${JSON.stringify(target)}); return JSON.stringify({ status: x.status, text: (await x.text()).slice(0, 80) }); } catch (e) { return JSON.stringify({ error: String(e) }); } }`);
    const v = r.value ?? {};
    attempt("fetch-na-pagina", "browser_evaluate", target, Boolean(v.error) || v.status === 403, v);
  }
  // janela: ferramenta ausente, chamada direta, código Playwright, redimensionar pela página
  const before = await viewport();
  { const r = await pw("browser_resize", { width: 375, height: 812 }); attempt("resize-direto", "browser_resize", "375x812", r.isError, r.text.slice(0, 200)); }
  { const r = await pw("browser_run_code", { code: "async (page) => { await page.setViewportSize({ width: 1440, height: 900 }); }" }); attempt("resize-por-codigo", "browser_run_code", "page.setViewportSize(1440)", r.isError, r.text.slice(0, 200)); }
  { const r = await evaluate("() => { window.resizeTo(1440, 900); return 'ok'; }"); attempt("resize-pela-pagina", "browser_evaluate", "window.resizeTo", r.isError, r.text.slice(0, 200)); }
  { const r = await evaluate("() => { document.body.style.zoom = '2'; return 'ok'; }"); attempt("zoom-pela-pagina", "browser_evaluate", "style.zoom", r.isError, r.text.slice(0, 200)); }
  const after = await viewport();
  attempt("janela-inalterada", "browser_evaluate", "innerWidth × innerHeight", JSON.stringify(before) === JSON.stringify(after), { before, after });
  // oráculo
  if (!clients.oracle) {
    const r = await pw("scan_page", { url: URL_TELA }); attempt("oraculo-pela-ponte-do-navegador", "playwright:scan_page", "scan_page", r.isError, r.text.slice(0, 200));
    let reached = false;
    let detail = "";
    try {
      const c = new Client({ name: "fake-agent", version: "1.0.0" });
      await c.connect(new StreamableHTTPClientTransport(new URL("http://oracle:8932/mcp")));
      reached = true;
      detail = (await c.listTools()).tools.map((t) => t.name).join(",");
    } catch (e) { detail = String(e?.message ?? e).slice(0, 200); }
    attempt("oraculo-direto", "mcp-http", "http://oracle:8932/mcp", !reached, detail);
  } else {
    const r = await call("oracle", "scan_page", { url: `http://host.docker.internal:${ports[0]}/` });
    attempt("oraculo-fora-da-tela", "oracle:scan_page", `host.docker.internal:${ports[0]}`, r.isError || /fora da pol[ií]tica|Bloqueado|ERR_/.test(r.text), r.text.slice(0, 200));
    // NAT-61: ferramenta que o perfil não anuncia, pedida pelo nome, é recusada pela ponte (segunda trava)
    for (const t of RETIRADAS.filter((x) => !oracleTools.includes(x))) {
      const x = await call("oracle", t, t === "get_ds_rules" ? { ids: ["x"] } : {});
      attempt("ferramenta-fora-do-perfil", `oracle:${t}`, t, x.isError && /n[aã]o est[aá] dispon[ií]vel|Recusado/.test(x.text), x.text.slice(0, 200));
    }
  }
  // coletor: listagem, leitura, run id errado, travessia
  await pw("browser_navigate", { url: ORIGEM });
  for (const [path, headers, label] of [["/api/submissions", {}, "listar"], ["/inbox", {}, "listar"], ["/findings.json", {}, "ler"], [`/api/submit/..%2f..%2ffindings.json`, {}, "travessia"], ["/api/submit", { "x-govbr-run-id": "outra-execucao" }, "run-id-errado"]]) {
    const method = path.startsWith("/api/submit") ? "POST" : "GET";
    const r = await evaluate(`async () => { const x = await fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: ${JSON.stringify({ "content-type": "application/json", ...headers })}${method === "POST" ? `, body: ${JSON.stringify(JSON.stringify(report([], null)))}` : ""} }); return JSON.stringify({ status: x.status }); }`);
    const v = r.value ?? {};
    attempt(`coletor-${label}`, "browser_evaluate", path, typeof v.status === "number" && v.status >= 400, v);
  }
}

// ── cenários
try {
  switch (SCENARIO) {
    case "honesto": {
      const { finding } = await honestFinding();
      out.submission = await submit(JSON.stringify(report([finding])));
      break;
    }
    case "vazio": {
      await pw("browser_navigate", { url: URL_TELA });
      out.submission = await submit(JSON.stringify(report([])));
      break;
    }
    case "sem-envio": {
      await pw("browser_navigate", { url: URL_TELA });
      await pw("browser_snapshot", {});
      break;
    }
    case "malformado": {
      await pw("browser_navigate", { url: URL_TELA });
      out.submission = await submit('{"timestamp": "x", "findings": [');
      break;
    }
    case "proibido": {
      await forbidden();
      {
        const big = await evaluate(`async () => { const x = await fetch(${JSON.stringify(CAMINHO)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ findings: [], notes: 'x'.repeat(3 * 1024 * 1024) }) }); return JSON.stringify({ status: x.status }); }`);
        attempt("coletor-tamanho", "browser_evaluate", "/api/submit (3 MB)", big.value?.status === 413, big.value ?? big.text.slice(0, 200));
      }
      const body = JSON.stringify(report([]));
      out.submission = await submit(body);
      const same = await submit(body);
      out.idempotent = same;
      // sobrescrita depois do aceito: tem de ser recusada
      const again = await submit(JSON.stringify(report([], null, { notes: "segunda versão, diferente" })));
      attempt("coletor-sobrescrita", "browser_evaluate", "/api/submit (segundo relatório)", again?.status === 409, again);
      break;
    }
    case "marcador":
    case "conferir-marcador": {
      await pw("browser_navigate", { url: URL_TELA });
      out.fingerprints.initial = (await evaluate(FINGERPRINT)).value;
      const tmp = readAttempt("/tmp/govbr-marcador.txt");
      out.fingerprints.tmpMarker = tmp.outcome;
      const home = readAttempt(`${process.env.HOME}/govbr-marcador.txt`);
      out.fingerprints.homeMarker = home.outcome;
      if (SCENARIO === "marcador") {
        await evaluate("() => { localStorage.setItem('govbr-marcador', 'run-1'); sessionStorage.setItem('govbr-marcador', 'run-1'); document.cookie = 'govbr-marcador=run-1; max-age=86400'; return 'ok'; }");
        writeAttempt("/tmp/govbr-marcador.txt");
        writeAttempt(`${process.env.HOME}/govbr-marcador.txt`);
        out.fingerprints.afterMarking = (await evaluate(FINGERPRINT)).value;
      }
      out.submission = await submit(JSON.stringify(report([])));
      break;
    }
    case "travar": {
      await pw("browser_navigate", { url: URL_TELA });
      step({ kind: "hang", note: "o agente para de responder; o runner deve matar o grupo" });
      // Um timer mantém o laço de eventos vivo: só `await new Promise(() => {})` deixa o Node sair
      // sozinho (código 13, "unsettled top-level await") e o runner via saída, não travamento.
      await new Promise(() => { setInterval(() => {}, 60_000); });
      break;
    }
    case "larguras": {
      const seen = [];
      const tools = (await clients.playwright.listTools()).tools.map((t) => t.name);
      const enumWidths = (await clients.playwright.listTools()).tools.find((t) => t.name === "browser_select_window")?.inputSchema?.properties?.width?.enum ?? [];
      step({ kind: "windows", tools: tools.includes("browser_select_window"), widths: enumWidths });
      for (const w of enumWidths) {
        await pw("browser_select_window", { width: w });
        await pw("browser_navigate", { url: URL_TELA });
        seen.push(await viewport());
      }
      out.fingerprints.windows = seen;
      const { finding } = await honestFinding();
      out.submission = await submit(JSON.stringify(report([finding])));
      break;
    }
    default:
      throw new Error(`cenário desconhecido: ${SCENARIO}`);
  }
} catch (e) {
  step({ kind: "error", detail: String(e?.stack ?? e).slice(0, 800) });
  save();
  process.exitCode = 1;
}
out.finishedAt = new Date().toISOString();
save();
for (const c of Object.values(clients)) await c.close().catch(() => {});
console.log(`agente roteirizado: cenário ${SCENARIO}; envio: ${JSON.stringify(out.submission)?.slice(0, 160)}`);
process.exit(process.exitCode ?? 0);
