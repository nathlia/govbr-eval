// B1: associa somente evidência medida que a ponte realmente devolveu a uma rota.
// Não interpreta norma, texto do achado nem URL declarada pelo agente.
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

export const ROUTE_GUARD_VERSION = "collector-route-guard-1.0.0";
const MAX_EVENTS = 16 * 1024 * 1024;
const MAX_PAYLOAD = 2 * 1024 * 1024;
const TOOLS = new Set(["scan_page", "get_finding_details"]);
const record = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const id = (x) => typeof x === "string" && x.length > 0 && x.length <= 200 ? x : null;

export function routeKey(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Mesmo conceito de rota da sessão do oráculo: query/filtro não cria outra rota;
    // fragmento só entra quando expressa rota de SPA, sem sua query.
    const hashRoute = /^#!?\//.test(u.hash) ? u.hash.replace(/[?].*$/, "") : "";
    return `${u.origin}${u.pathname.replace(/\/+$/, "") || "/"}${hashRoute}`;
  } catch { return null; }
}

function readBounded(root, path, limit) {
  const target = realpathSync(join(root, path));
  const rel = relative(root, target);
  if (isAbsolute(rel) || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\")) throw new Error("outside-context");
  const st = statSync(target);
  if (!st.isFile() || st.size > limit) throw new Error("context-limit");
  const bytes = readFileSync(target);
  if (bytes.length > limit) throw new Error("context-limit");
  return bytes;
}

function side(root, value, expectedSha) {
  if (!record(value)) return null;
  if (value.truncated === false && typeof value.text === "string") {
    return typeof expectedSha === "string" && sha(value.text) === expectedSha ? value.text : null;
  }
  const p = value.payload;
  if (!record(p) || p.status !== "complete" || typeof p.path !== "string" ||
    !/^payloads\/[A-Za-z0-9._-]+$/.test(p.path) || !Number.isInteger(p.bytes) || p.bytes > MAX_PAYLOAD) return null;
  try {
    const bytes = readBounded(root, p.path, MAX_PAYLOAD);
    return bytes.length === p.bytes && sha(bytes) === p.sha256 && p.sha256 === expectedSha ? bytes.toString("utf8") : null;
  } catch { return null; }
}

/** Resultado parcial: referência desconhecida/ambígua não prova mistura de rotas. */
export function mixedRouteErrors(report, directory) {
  const errors = [];
  if (!directory) return { errors, checked: false, unavailable: 0 };
  let root, lines;
  try {
    root = realpathSync(directory);
    lines = readBounded(root, "tool-events.ndjson", MAX_EVENTS).toString("utf8").split("\n");
  } catch { return { errors, checked: false, unavailable: 1 }; }
  let unavailable = 0;
  const refs = new Map();
  const scans = new Map();
  const put = (map, ref, route) => {
    if (!id(ref) || !route) return;
    const routes = map.get(ref) ?? new Set();
    routes.add(route); map.set(ref, routes);
  };
  const replies = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.server !== "oracle" || event.kind !== "call" || event.isError !== false || event.outcome !== "ok" || !TOOLS.has(event.tool)) continue;
      const text = side(root, event.result, event.resultSha256);
      if (text === null) { unavailable++; continue; }
      const reply = JSON.parse(text);
      if (!record(reply) || reply.isError === true || reply.kind === "error") continue;
      // url no topo/argumentos é a URL pedida e pode preceder redirect/navigate.
      // Sem URL final medida, só uma continuação de scan já conhecido pode vincular ids.
      const route = routeKey(reply.state?.observed?.url ?? reply.ledger?.state?.observed?.url);
      if (id(reply.scanId) && route) put(scans, reply.scanId, route);
      replies.push({ reply, route });
    } catch { unavailable++; }
  }
  for (const { reply, route: direct } of replies) {
    const known = scans.get(reply.scanId);
    const route = direct ?? (known?.size === 1 ? [...known][0] : null);
    if (!route) continue;
    if (id(reply.scanId)) put(refs, reply.scanId, route);
    // Listas estruturadas conhecidas. Não percorrer `alsoIn`, next, rules ou texto normativo.
    for (const list of [reply.findings, reply.members]) {
      if (!Array.isArray(list)) continue;
      for (const item of list) if (record(item)) {
        const declared = routeKey(item.element?.page);
        if (!declared || declared === route) put(refs, item.id, route);
      }
    }
    if (Array.isArray(reply.families)) for (const family of reply.families) {
      if (!record(family)) continue;
      put(refs, family.familyId, route);
      if (Array.isArray(family.memberIds)) for (const member of family.memberIds) put(refs, member, route);
    }
    for (const list of [reply.observations, reply.checksRun?.pageLevel?.notMeasured, reply.ledger?.checksRun?.pageLevel?.notMeasured]) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (record(item)) {
          const declared = routeKey(item.element?.page);
          if (!declared || declared === route) put(refs, item.pendingId, route);
        }
        else if (typeof item === "string") put(refs, /^\[([^\]:]+):/.exec(item)?.[1], route);
      }
    }
  }
  if (Array.isArray(report?.findings)) report.findings.forEach((finding, i) => {
    if (!Array.isArray(finding?.evidence)) return;
    const routes = new Map();
    for (const evidence of finding.evidence) {
      if (typeof evidence !== "string") continue;
      // Identificadores inteiros, nunca uma busca por substring.
      for (const token of evidence.match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) ?? []) {
        const known = refs.get(token);
        if (known?.size !== 1) continue;
        const route = [...known][0];
        const cited = routes.get(route) ?? new Set(); cited.add(token); routes.set(route, cited);
      }
    }
    if (routes.size > 1) errors.push({ path: `/report/findings/${i}/evidence`, code: "mixed-routes",
      message: "O mesmo achado cita evidência de rotas diferentes; separe um achado por rota e envie novamente.",
      routes: [...routes].map(([route, cited]) => ({ route, refs: [...cited] })) });
  });
  return { errors: errors.slice(0, 10), checked: true, unavailable };
}
