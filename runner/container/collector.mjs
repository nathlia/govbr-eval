#!/usr/bin/env node
// Coletor de uma execução (T3a do runner isolado).
//
// Um contêiner novo por execução, armado por ambiente com UM run id (COLLECTOR_RUN_ID) que o agente
// não escolhe nem vê no texto da tarefa. Aceita uma submissão: o corpo é o relatório do agente; o
// coletor monta o envelope findings.v1 com a identidade que ele mesmo conhece e o valida contra o
// schema (Ajv, draft 2020-12; schemas copiados de govbr-eval/contracts na construção da imagem).
//
//   GET  /            página neutra (origem para o POST do navegador)
//   GET  /health      { ok: true }
//   POST /api/submit  relatório JSON (Content-Type: application/json, até COLLECTOR_MAX_BYTES)
//   GET  /tempo       relógio real da execução (só com COLLECTOR_LIMITE_SEG; ver abaixo)
//   o resto           404 — não há listagem nem leitura de relatórios
//
// Regras: caminho com "..", "%2e", "%2f", "%5c", barra invertida ou NUL → 400; cabeçalho
// x-govbr-run-id diferente do run armado → 409; relatório idêntico ao aceito → 200 duplicate (recibo
// igual); diferente do aceito → 409 (sem sobrescrita); fora do schema ou JSON inválido → 400, corpo
// arquivado em refused/. Recibo mínimo: { ok, receipt }.
//
// NAT-81: o HARNESS escolhe o envelope por COLLECTOR_FINDINGS_CONTRACT (findings.v1 | findings.v2;
// ausente = findings.v1, o mesmo envelope de antes). findings.v2 aceita `report.inspection`
// (inspection.v1) e aplica as regras de inspection-ledger.mjs, copiado junto com os schemas. O agente
// não escolhe contrato: o mesmo texto de tarefa vale nos dois braços e o envelope é o do run armado.
// Relógio real (revisão relogio-1, NAT-111 opção A): o relógio das telas é simulado (congelado), então o
// agente não mede o tempo pela página. Com COLLECTOR_LIMITE_SEG, `GET /tempo` devolve
// { ok, inicio, agora, decorridoS, restanteS, limiteS } no relógio DESTE contêiner. O relógio começa quando
// o harness cria COLLECTOR_RELOGIO_ARQUIVO (no tmpfs do próprio coletor, por `docker exec`, logo ANTES de
// partir o agente: o restante nunca passa do que o limite do harness deixa); antes disso, 503. O agente não
// alcança esse arquivo (outro contêiner). A resposta não depende de braço, oráculo, run nem referência: só
// do relógio e do limite, que já está no texto da tarefa. Sem COLLECTOR_LIMITE_SEG, /tempo é 404 como antes.
// relogio-2 (série 3.7.8): `/tempo` responde com CORS aberto (`*`, sem credenciais; OPTIONS = pré-voo 204), para
// que o agente leia o relógio com `fetch` de DENTRO da página da tela (outra origem) sem sair dela: navegar até
// /tempo recarregava a aplicação e desfazia o estado montado (dev-375-b-01: 3 a 5 vezes por execução). A resposta
// é a mesma de antes; o evento registra a origem que pediu (`origem`), para o harness provar a leitura na página.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { mixedRouteErrors, ROUTE_GUARD_VERSION } from "./route-guard.mjs";

const RUN_ID = process.env.COLLECTOR_RUN_ID ?? "";
const CAMPAIGN_ID = process.env.COLLECTOR_CAMPAIGN_ID ?? "";
const FIXTURE = process.env.COLLECTOR_FIXTURE === "1";
const OUT = process.env.COLLECTOR_OUT ?? "/out";
const MAX_BYTES = Number(process.env.COLLECTOR_MAX_BYTES ?? 2 * 1024 * 1024);
const PORT = Number(process.env.COLLECTOR_PORT ?? 8080);
const SCHEMAS = process.env.COLLECTOR_SCHEMAS ?? "/opt/collector/schemas";
const CONTRACT = process.env.COLLECTOR_FINDINGS_CONTRACT || "findings.v1";
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
if (!ID.test(RUN_ID) || !ID.test(CAMPAIGN_ID)) {
  console.error("COLLECTOR_RUN_ID e COLLECTOR_CAMPAIGN_ID obrigatórios");
  process.exit(2);
}
if (CONTRACT !== "findings.v1" && CONTRACT !== "findings.v2") {
  console.error(`COLLECTOR_FINDINGS_CONTRACT desconhecido: ${CONTRACT}`);
  process.exit(2);
}
const V2 = CONTRACT === "findings.v2";
const ROUTE_CONTEXT = process.env.COLLECTOR_ROUTE_CONTEXT;
const RELOGIO_REVISION = "relogio-2";
/** Cabeçalhos do relógio: qualquer origem lê, sem credenciais; nada além de GET. */
const CORS_TEMPO = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET", "access-control-allow-headers": "*", "access-control-max-age": "600" };
const LIMITE_S = process.env.COLLECTOR_LIMITE_SEG ? Number(process.env.COLLECTOR_LIMITE_SEG) : null;
if (LIMITE_S !== null && !(Number.isInteger(LIMITE_S) && LIMITE_S > 0)) {
  console.error(`COLLECTOR_LIMITE_SEG inválido: ${process.env.COLLECTOR_LIMITE_SEG}`);
  process.exit(2);
}
const RELOGIO_ARQUIVO = process.env.COLLECTOR_RELOGIO_ARQUIVO || "/tmp/relogio-inicio";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, strictRequired: false, allowUnionTypes: true });
const SCHEMA_FILES = ["common.v1.schema.json", "findings.v1.schema.json", ...(V2 ? ["inspection.v1.schema.json", "findings.v2.schema.json"] : [])];
for (const f of SCHEMA_FILES) ajv.addSchema(JSON.parse(readFileSync(join(SCHEMAS, f), "utf8")));
const validateFindings = ajv.getSchema(`https://govbr-eval.invalid/contracts/${CONTRACT}.schema.json`);
const ledgerErrors = V2 ? (await import(pathToFileURL(join(SCHEMAS, "inspection-ledger.mjs")).href)).inspectionLedgerErrors : () => [];

mkdirSync(join(OUT, "refused"), { recursive: true });
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
let seq = 0;
let refusedCount = 0;
let accepted = null; // { sha, receipt }
const FINDINGS = join(OUT, "findings.json");
/** Início do relógio real (ms, relógio deste contêiner); null até o harness armá-lo. */
let relogioInicio = null;
const isoS = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");

function event(e) {
  appendFileSync(join(OUT, "events.ndjson"), JSON.stringify({ seq: seq++, at: new Date().toISOString(), ...e }) + "\n");
}
function send(res, status, body, extra = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra });
  res.end(JSON.stringify(body));
}
function refuse(reason, body) {
  const name = `refused/${String(++refusedCount).padStart(3, "0")}.json`;
  writeFileSync(join(OUT, name), JSON.stringify({ reason, receivedAt: new Date().toISOString(), body }, null, 2) + "\n", { flag: "wx" });
  return name;
}
// Acima de MAX_BYTES o corpo deixa de ser guardado, mas continua sendo LIDO (e descartado) até o fim,
// para que o 413 chegue ao cliente: destruir o socket no meio do envio fazia o cliente (pelo proxy do
// navegador) ver um 502/erro de rede em vez da recusa. Só um corpo absurdo (> DRAIN_CAP) derruba a conexão.
const DRAIN_CAP = MAX_BYTES * 8;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > DRAIN_CAP) {
      reject(Object.assign(new Error("corpo acima do limite"), { code: "TOO_LARGE", destroy: true }));
      return;
    }
    req.on("data", (c) => {
      size += c.length;
      if (tooLarge) {
        if (size > DRAIN_CAP) req.destroy();
        return;
      }
      if (size > MAX_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (tooLarge) reject(Object.assign(new Error("corpo acima do limite"), { code: "TOO_LARGE" }));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
    req.on("close", () => { if (tooLarge && size > DRAIN_CAP) reject(Object.assign(new Error("corpo acima do limite"), { code: "TOO_LARGE" })); });
  });
}

const NEUTRAL = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receptor de resultados</title></head><body><p>Receptor de resultados desta execução.</p></body></html>`;

createServer(async (req, res) => {
  const raw = String(req.url ?? "");
  const rawPath = raw.split("?")[0].split("#")[0];
  const base = { method: req.method, path: rawPath.slice(0, 200) };
  if (!raw.startsWith("/") || /%(2e|2f|5c|00)/i.test(rawPath) || rawPath.includes("\\") || rawPath.split("/").some((s) => s === ".." || s === ".")) {
    event({ ...base, status: 400, reason: "caminho-recusado" });
    return send(res, 400, { ok: false, error: "caminho recusado" });
  }
  if (req.method === "GET" && rawPath === "/") {
    event({ ...base, status: 200 });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(NEUTRAL);
  }
  if (req.method === "GET" && rawPath === "/health") {
    event({ ...base, status: 200 });
    return send(res, 200, { ok: true });
  }
  if (rawPath === "/tempo" && LIMITE_S !== null) {
    const origem = typeof req.headers.origin === "string" ? req.headers.origin.slice(0, 200) : null;
    if (req.method === "OPTIONS") {
      event({ ...base, status: 204, reason: "tempo-pre-voo", origem });
      res.writeHead(204, { ...CORS_TEMPO, "cache-control": "no-store" });
      return res.end();
    }
    if (req.method !== "GET") {
      event({ ...base, status: 405 });
      return send(res, 405, { ok: false, error: "use GET" }, CORS_TEMPO);
    }
    if (relogioInicio === null) {
      event({ ...base, status: 503, reason: "relogio-parado", origem });
      return send(res, 503, { ok: false, error: "o relógio começa com a execução" }, CORS_TEMPO);
    }
    const agora = Date.now();
    const decorridoS = Math.max(0, Math.floor((agora - relogioInicio) / 1000));
    const restanteS = Math.max(0, LIMITE_S - decorridoS);
    event({ ...base, status: 200, reason: "tempo", decorridoS, origem });
    return send(res, 200, { ok: true, inicio: isoS(relogioInicio), agora: isoS(agora), decorridoS, restanteS, limiteS: LIMITE_S }, CORS_TEMPO);
  }
  if (rawPath !== "/api/submit") {
    event({ ...base, status: 404, reason: "sem-rota" });
    return send(res, 404, { ok: false });
  }
  if (req.method !== "POST") {
    event({ ...base, status: 405 });
    return send(res, 405, { ok: false, error: "use POST" });
  }
  const claimed = req.headers["x-govbr-run-id"];
  if (claimed !== undefined && claimed !== RUN_ID) {
    event({ ...base, status: 409, reason: "run-id-errado" });
    return send(res, 409, { ok: false, error: "execução errada" });
  }
  if (!String(req.headers["content-type"] ?? "").toLowerCase().includes("application/json")) {
    event({ ...base, status: 415 });
    return send(res, 415, { ok: false, error: "Content-Type: application/json" });
  }
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    if (error?.code !== "TOO_LARGE") {
      event({ ...base, status: 400, reason: "corpo-interrompido" });
      return send(res, 400, { ok: false, error: "corpo interrompido" });
    }
    event({ ...base, status: 413, reason: "tamanho" });
    res.setHeader("connection", "close");
    return send(res, 413, { ok: false, error: error.message });
  }
  let report;
  try {
    report = JSON.parse(body);
  } catch (error) {
    const file = refuse(`JSON inválido: ${error.message}`, body);
    event({ ...base, status: 400, reason: "json-invalido", refused: file, bytes: Buffer.byteLength(body) });
    return send(res, 400, { ok: false, error: "JSON inválido" });
  }
  const canonical = JSON.stringify(report);
  const sha = sha256(canonical);
  if (accepted) {
    if (accepted.sha === sha) {
      event({ ...base, status: 200, reason: "duplicado", receipt: accepted.receipt });
      return send(res, 200, { ok: true, receipt: accepted.receipt, duplicate: true });
    }
    const file = refuse("relatório diferente do já aceito (sem sobrescrita)", body);
    event({ ...base, status: 409, reason: "sobrescrita", refused: file });
    return send(res, 409, { ok: false, error: "esta execução já tem um relatório aceito" });
  }
  const receipt = `r-${sha.slice(0, 16)}`;
  const head = {
    contract: CONTRACT, fixture: FIXTURE, campaignId: CAMPAIGN_ID, runId: RUN_ID,
    receivedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), receipt, findingContract: "achado-2",
  };
  let envelope = V2 ? { ...head, inspectionContract: "inspection.v1", inspectionStatus: report?.inspection === undefined ? "absent" : "valid", report } : { ...head, report };
  let errors = validateFindings(envelope) ? ledgerErrors(report, "/report").map((e) => `${e.path || "/"} ${e.keyword}: ${e.message}`)
    : (validateFindings.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`);
  // NAT-81: erro SÓ no registro de inspeção nunca derruba os achados. O registro sai de `report`, fica
  // guardado como veio em `inspectionRaw` com os erros, `inspectionStatus: "invalid"`, e os achados são
  // validados e aceitos como sempre. O recibo ao agente continua mínimo e igual (não há segunda chance
  // nem resposta diferente por braço). Erro em qualquer outro lugar recusa o relatório, como antes.
  if (V2 && errors.length && report && typeof report === "object" && "inspection" in report &&
    errors.every((e) => e.startsWith("/report/inspection"))) {
    const { inspection: raw, ...rest } = report;
    const ledgerIssues = errors.slice(0, 50);
    envelope = { ...head, inspectionContract: "inspection.v1", inspectionStatus: "invalid", inspectionErrors: ledgerIssues, inspectionRaw: raw ?? null, report: rest };
    errors = validateFindings(envelope) ? [] : (validateFindings.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`);
  }
  errors = errors.slice(0, 10);
  if (errors.length) {
    const file = refuse(`contrato: ${errors.join("; ")}`, body);
    event({ ...base, status: 400, reason: "contrato", refused: file });
    return send(res, 400, { ok: false, errors });
  }
  const routeCheck = mixedRouteErrors(report, ROUTE_CONTEXT);
  if (routeCheck.errors.length) {
    const file = refuse(`rotas: ${JSON.stringify(routeCheck.errors)}`, body);
    event({ ...base, status: 400, reason: "rotas-misturadas", refused: file, routeGuard: ROUTE_GUARD_VERSION });
    return send(res, 400, { ok: false, errors: routeCheck.errors });
  }
  if (existsSync(FINDINGS)) {
    event({ ...base, status: 409, reason: "arquivo-existente" });
    return send(res, 409, { ok: false, error: "já existe relatório" });
  }
  writeFileSync(FINDINGS, JSON.stringify(envelope, null, 2) + "\n", { flag: "wx" });
  writeFileSync(join(OUT, "accepted-raw.txt"), body, { flag: "wx" });
  accepted = { sha, receipt };
  event({ ...base, status: 200, reason: "aceito", receipt, contract: CONTRACT, findings: Array.isArray(report.findings) ? report.findings.length : null,
    ...(ROUTE_CONTEXT ? { routeGuard: { version: ROUTE_GUARD_VERSION, checked: routeCheck.checked, unavailable: routeCheck.unavailable } } : {}),
    ...(V2 ? { inspection: envelope.inspectionStatus } : {}) });
  return send(res, 200, { ok: true, receipt });
}).listen(PORT, "0.0.0.0", () => {
  event({ method: "-", path: "-", status: null, reason: "start", contract: CONTRACT, ...(LIMITE_S !== null ? { relogio: RELOGIO_REVISION, limiteS: LIMITE_S } : {}) });
  if (LIMITE_S !== null) {
    const poll = setInterval(() => {
      if (!existsSync(RELOGIO_ARQUIVO)) return;
      relogioInicio = Date.now();
      clearInterval(poll);
      event({ method: "-", path: "-", status: null, reason: "relogio-iniciado", inicio: isoS(relogioInicio), relogio: RELOGIO_REVISION });
    }, 100);
  }
  console.log(`coletor armado em :${PORT}`);
});
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(0));
