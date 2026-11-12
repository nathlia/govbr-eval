// B1: associa somente evidência medida que a ponte realmente devolveu a uma rota.
// Não interpreta norma, texto do achado nem URL declarada pelo agente.
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

// 1.0.1 (série 3.7.8): só a mensagem da recusa muda (a regra é a mesma): o fato de outra rota ou estado é achado
// próprio dela, enviado à parte, e não texto a dobrar num achado de outra rota (dev-375-b-01 p03-com: fatos do
// detalhe dobrados num achado da lista depois da recusa).
// 1.0.2 (leitura dev-3710-b § 7 item 2): a regra e a mensagem de cada erro são as mesmas; a resposta de recusa ganha
// `avisos`, só de procedimento. (1) Toda recusa `mixed-routes` diz quantas referências de evidência estão nos achados
// que juntam rotas e que o primeiro relatório aceito é final. (2) Depois de uma recusa `mixed-routes`, toda recusa
// seguinte compara as referências daquela recusa com as do novo envio e diz quantas sumiram de todos os achados
// (dev-3710-b-01 p02-com: cortou F-148/F-159/F-147/F-270 e o reenvio foi aceito em silêncio). O aceite continua
// mínimo e final ({ ok, receipt }; sem sobrescrita): o corte que chega a ser aceito fica só no evento do coletor.
export const ROUTE_GUARD_VERSION = "collector-route-guard-1.0.2";
/** Mensagem da recusa `mixed-routes`, exportada para os testes. */
export const MIXED_ROUTES_MESSAGE = "O mesmo achado cita evidência de rotas diferentes. Um fato observado em outra rota ou estado é um achado " +
  "próprio dessa rota ou estado: envie-o como achado separado, com a evidência e os passos dele, em vez de juntá-lo ao " +
  "texto de um achado de outra rota. Depois envie o relatório novamente.";
/** Aviso da própria recusa `mixed-routes` (1.0.2). `n` = referências citadas nos achados que juntam rotas. */
export const avisoMistura = (n) => `Este envio cita ${n} referência(s) de evidência em achados que juntam rotas diferentes. ` +
  "No reenvio, uma referência retirada sem ir para um achado próprio da rota dela deixa esse fato fora do relatório, e o " +
  "primeiro relatório aceito é final: depois dele o coletor não aceita outro.";
/** Aviso de corte (1.0.2), numa recusa seguinte a uma recusa `mixed-routes`. `n` = referências que sumiram. */
export const avisoCorte = (n) => `${n} referência(s) de evidência de outra rota, citada(s) num envio recusado por juntar rotas ` +
  "diferentes, não aparece(m) em nenhum achado deste envio. Cada fato de outra rota pode ser enviado como achado próprio " +
  "dessa rota, com a evidência dele, enquanto houver tempo; o primeiro relatório aceito é final.";
/** Referências que a recusa atribuiu a uma rota (o `routes[].refs` de cada erro `mixed-routes`). */
export function refsDosErros(errors) {
  const out = new Set();
  for (const e of Array.isArray(errors) ? errors : []) for (const r of Array.isArray(e?.routes) ? e.routes : [])
    for (const ref of Array.isArray(r?.refs) ? r.refs : []) if (id(ref)) out.add(ref);
  return out;
}
/** Identificadores inteiros citados na evidência de qualquer achado (mesma tokenização da conferência). */
export function evidenceTokens(report) {
  const out = new Set();
  if (Array.isArray(report?.findings)) for (const finding of report.findings) {
    if (!Array.isArray(finding?.evidence)) continue;
    for (const evidence of finding.evidence) if (typeof evidence === "string")
      for (const token of evidence.match(TOKEN) ?? []) out.add(token);
  }
  return out;
}
const MAX_EVENTS = 16 * 1024 * 1024;
const MAX_PAYLOAD = 2 * 1024 * 1024;
const TOOLS = new Set(["scan_page", "get_finding_details"]);
const record = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const id = (x) => typeof x === "string" && x.length > 0 && x.length <= 200 ? x : null;
const TOKEN = /[A-Za-z0-9][A-Za-z0-9._-]*/g;

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
      for (const token of evidence.match(TOKEN) ?? []) {
        const known = refs.get(token);
        if (known?.size !== 1) continue;
        const route = [...known][0];
        const cited = routes.get(route) ?? new Set(); cited.add(token); routes.set(route, cited);
      }
    }
    if (routes.size > 1) errors.push({ path: `/report/findings/${i}/evidence`, code: "mixed-routes",
      message: MIXED_ROUTES_MESSAGE,
      routes: [...routes].map(([route, cited]) => ({ route, refs: [...cited] })) });
  });
  return { errors: errors.slice(0, 10), checked: true, unavailable };
}
