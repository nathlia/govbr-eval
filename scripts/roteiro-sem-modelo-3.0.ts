/**
 * Roteiro sem modelo do oráculo 3.0.0 (NAT-99, plano §5): dirige o servidor MCP por stdio, como um agente
 * faria, por observar → buscar → contexto → medir → verificar nas telas congeladas de desenvolvimento
 * (fluxo, A = solicitacao, B = Vistorias/pnip), servidas localmente a partir do dist/ do corpus. Só usa o
 * que as respostas devolvem: passos `next`, cursores, `citeAs`, `investigate`, `actions`. Nenhum modelo,
 * nenhuma bateria; navegador próprio headless, contado à parte (passos de navegador).
 *
 * Uso: npm run roteiro:sem-modelo -- [--validator ../govbr-ds-validator] [--porta 3241] [--saida arquivo.json]
 *
 * Aceite mecânico (plano §5; falha = exit 1):
 *   A1 toda resposta inicial ≤ 8.000 caracteres (content[0].text.length);
 *   A2 caso respondível com entrada suficiente: ≤ 2 chamadas de recuperação até um citeAs;
 *   A3 continuação termina, sem cursor repetido nem item duplicado, e cobre o total anunciado;
 *   A4 ausência: no-match sem resultados, absenceNote, gaps e ≤ 3 next;
 *   A5 erro: isError; erro de aplicação com errorCode e ≥ 1 next que, seguido, resolve;
 *   A6 estado divergente: nunca observation.status "contradicted"; o veredito é sobre o estado;
 *   A7 verify devolve motivos estruturados (verdict, about, observation, reasons[], actions ≤ 3).
 * Nunca serve pnip-c/, pnip-d/, controles/ nem real/ (fora das telas de desenvolvimento).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { chromium, type Page } from "playwright";

type Obj = Record<string, any>;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "../govbr-corpus/dist");
const BUDGET = 8000;
const RETRIEVAL = new Set(["get_ds_rules", "get_component_spec", "get_emag_rules", "get_page_rules", "get_design_tokens"]);

const argv = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const VALIDATOR = resolve(ROOT, opt("--validator", "../govbr-ds-validator"));
const PORTA = Number(opt("--porta", "3241"));
const SAIDA = opt("--saida", "");
if ([3000, 3100, 3217, 4000, 4100, 4101, 4102].includes(PORTA)) throw new Error(`porta ${PORTA} reservada`);

// ─────────────────────────────── telas congeladas (dist/ do corpus), só as de desenvolvimento
const telas = JSON.parse(readFileSync(join(ROOT, "telas.json"), "utf8"));
const TELAS = [
  { id: "fluxo", entry: telas.fluxo.entry as string, arrival: undefined as Obj | undefined, interacao: telas.fluxo.isolamento.interacao as Obj },
  { id: "solicitacao", entry: telas.solicitacao.entry as string, arrival: undefined as Obj | undefined, interacao: telas.solicitacao.isolamento.interacao as Obj },
  // a lista da SPA (mesma espera da conferência da tela B, tela-b/vistorias/comum.mjs WAIT_FOR)
  { id: "vistorias", entry: telas.vistorias.entry as string, arrival: { visible: "main tbody tr" } as Obj | undefined, interacao: null as Obj | null },
];
const SITE = telas.vistorias.isolamento.site as { aliases?: Record<string, string>; indice: string; arvore: string };
const TIPOS: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json", ".ico": "image/x-icon" };
const PROIBIDO = /^\/(pnip-c|pnip-d|controles|real)(\/|$)/;

function servir(): Promise<Server> {
  const s = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    if (PROIBIDO.test(p) || p === "/pnip/manifesto.json") { res.writeHead(404).end(); return; }
    if (SITE.aliases?.[p]) p = "/" + SITE.aliases[p];
    else if (p.startsWith("/" + SITE.arvore) && !extname(p)) p = "/" + SITE.indice;
    try { res.writeHead(200, { "content-type": TIPOS[extname(p).toLowerCase()] ?? "application/octet-stream" }).end(readFileSync(join(DIST, p))); }
    catch { res.writeHead(404).end(); }
  });
  return new Promise((ok, fail) => { s.once("error", fail); s.listen(PORTA, "127.0.0.1", () => ok(s)); });
}

// ─────────────────────────────── registro das chamadas e do aceite
interface Rec { n: number; tela: string; fase: string; tool: string; args: Obj; chars: number; initial: boolean; isError: boolean; errorCode: string | null; kind: string | null; status: string | null }
const recs: Rec[] = [];
const checks: { id: string; ok: boolean; detail: string }[] = [];
const casos: { tela: string; caso: string; retrievalCalls: number; citeAs: string | null; respondivel: boolean; nota: string }[] = [];
const verdicts: { tela: string; caso: string; verdict: string | null; about: string | null; observation: string | null; reasons: string[]; actions: string[] }[] = [];
let browserSteps = 0;
const check = (id: string, ok: boolean, detail: string): boolean => { checks.push({ id, ok, detail }); if (!ok) console.log(`  FALHA ${id}: ${detail}`); return ok; };

let client: Client;
async function call(tela: string, fase: string, tool: string, args: Obj, initial = true): Promise<{ d: Obj | null; text: string; rec: Rec }> {
  const r = await client.callTool({ name: tool, arguments: args }, undefined, { timeout: 240_000 }) as { content?: { type: string; text?: string }[]; isError?: boolean };
  const text = r.content?.[0]?.type === "text" ? r.content[0].text ?? "" : "";
  let d: Obj | null = null;
  try { d = JSON.parse(text); } catch { d = null; }
  const rec: Rec = { n: recs.length + 1, tela, fase, tool, args, chars: text.length, initial, isError: Boolean(r.isError), errorCode: d?.errorCode ?? null, kind: d?.kind ?? null, status: d?.status ?? null };
  recs.push(rec);
  if (initial) check("A1-orcamento", text.length <= BUDGET, `${tela}/${fase} ${tool} ${text.length} caracteres`);
  return { d, text, rec };
}
/** Segue um passo devolvido pelo oráculo ({tool, arguments}); null quando o passo é fora do oráculo. */
const seguir = (tela: string, fase: string, step: Obj | undefined, initial = true) =>
  step && step.tool ? call(tela, fase, step.tool, step.arguments ?? {}, initial) : Promise.resolve(null);

// ─────────────────────────────── passos de navegador (próprio, headless, fora do oráculo)
async function medir(page: Page, url: string, arrival: Obj | undefined, locator: string, property: string | null): Promise<{ count: number; values: string[] }> {
  browserSteps++; await page.goto(url, { waitUntil: "networkidle" });
  if (arrival?.visible) { browserSteps++; await page.waitForSelector(arrival.visible, { timeout: 15_000 }); }
  browserSteps++;
  return page.evaluate(([sel, prop]) => {
    // localizador do oráculo: `a >>> b` atravessa a shadow root aberta de cada `a`
    let els: Element[] = [document.documentElement];
    for (const [i, parte] of (sel as string).split(/\s*>>>\s*/).entries()) {
      els = els.flatMap((e) => Array.from((i === 0 ? document : (e.shadowRoot ?? e)).querySelectorAll(parte)));
    }
    return { count: els.length, values: prop ? els.slice(0, 5).map((e) => getComputedStyle(e).getPropertyValue(prop as string)) : [] };
  }, [locator, property] as const);
}
const hexDe = (rgb: string): string | null => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  return m ? "#" + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("") : null;
};

// ─────────────────────────────── percurso por tela
async function percorrer(t: typeof TELAS[number], base: string, page: Page): Promise<Obj> {
  const url = `${base}/${t.entry}`;
  console.log(`\n▸ ${t.id}: ${url}`);
  // 1. observar
  const { d: lido } = await call(t.id, "observar", "scan_page", { url, ...(t.arrival ? { arrival: t.arrival } : {}) });
  if (!check("scan-ok", lido?.kind === "scan" && lido.status === "scanned", `${t.id}: kind ${lido?.kind} status ${lido?.status}`)) return { scan: lido };
  const scan = lido!;
  check("scan-checksRun", Boolean(scan.checksRun?.executed && scan.checksRun?.omitted && scan.checksRun?.coverageNote), `${t.id}: checksRun ${Object.keys(scan.checksRun ?? {}).join(",")}`);
  check("scan-investigate", Array.isArray(scan.investigate?.items) && scan.investigate.items.length <= 5, `${t.id}: ${scan.investigate?.items?.length} itens`);

  // 2. continuação das famílias (scanId + nextCursor), sem laço
  const fams = new Set<string>((scan.families ?? []).map((f: Obj) => f.familyId));
  const todas: Obj[] = [...(scan.families ?? [])];
  let cur = scan.nextCursor ?? scan.partial?.nextCursor ?? null; const vistos = new Set<unknown>(); let dup = 0; let voltas = 0;
  while (cur !== null && cur !== undefined) {
    if (vistos.has(cur) || ++voltas > (scan.totalFamilies ?? 0) + 1) { check("A3-continuacao", false, `${t.id}: cursor ${cur} repetido ou voltas demais`); break; }
    vistos.add(cur);
    const { d } = await call(t.id, "continuar", "get_finding_details", { scanId: scan.scanId, cursor: cur }, false);
    for (const f of d?.families ?? []) { if (fams.has(f.familyId)) dup++; fams.add(f.familyId); todas.push(f); }
    cur = d?.nextCursor ?? d?.partial?.nextCursor ?? null;
  }
  check("A3-continuacao", dup === 0 && fams.size === scan.totalFamilies, `${t.id}: famílias ${fams.size}/${scan.totalFamilies}, duplicadas ${dup}, páginas ${voltas + 1}`);

  // 3. contexto: o passo do investigate → especificação → 1º next dela (até um citeAs)
  const item = scan.investigate?.items?.[0];
  if (item) {
    const spec = await seguir(t.id, "contexto", item.next);
    const passo = spec?.d?.rules?.next?.[0];
    const regras = await seguir(t.id, "contexto", passo);
    let citeAs: string | null = regras?.d?.results?.[0]?.citeAs ?? null;
    let n = (spec ? 1 : 0) + (regras ? 1 : 0);
    let nota = `${passo?.what ?? "sem passo"}; ${regras?.d?.kind}/${regras?.d?.status}`;
    // listagem (títulos, sem citeAs): a própria resposta manda ler a unidade por id antes de julgar
    if (!citeAs && regras?.d?.kind === "listing" && regras.d.items?.[0]?.id) {
      const u = await call(t.id, "contexto", "get_ds_rules", { id: regras.d.items[0].id }); n++;
      citeAs = u.d?.rule?.id ?? null; nota += ` → por id: ${u.d?.kind}`;
    }
    // só o nome do componente não é entrada suficiente (plano §5): registrado, não cobrado no A2
    casos.push({ tela: t.id, caso: `contexto:${item.component}`, retrievalCalls: n, citeAs, respondivel: false, nota });
    if (regras?.d?.results?.[0]) check("citeAs-nos-ids", (regras.d.results[0].ids ?? []).includes(citeAs), `${t.id}: citeAs ${citeAs} entre ids do cartão`);
  }

  // escolha do achado: prefere o que tem dado estruturado (propriedade/hex/tag) — é o que dá para medir e verificar
  const fam = todas.find((f) => f.rule?.source === "govbr-ds-structure") ?? todas.find((f) => f.rule?.source === "govbr-ds-token") ?? todas[0];
  if (!fam?.example?.id) return { scan, fams: fams.size };
  const { d: det } = await call(t.id, "evidencia", "get_finding_details", { ids: [fam.example.id], detail: "full" });
  const finding = det?.findings?.[0] as Obj | undefined;
  if (!finding) { check("finding-full", false, `${t.id}: ${fam.example.id} sem objeto completo`); return { scan }; }

  // 4. buscar: pelo que o achado mediu (propriedade/observado), sem conhecimento do roteiro
  const data = finding.evidence?.data ?? {};
  const termo = (data.property ?? String(finding.evidence?.observed ?? "").split(/\s+/).slice(0, 8).join(" ")) as string;
  let busca = await call(t.id, "buscar", "get_ds_rules", { query: termo });
  let nBusca = 1;
  if (busca.d?.status === "ambiguous") {
    const grupo = busca.d.ambiguity?.groups?.find((g: Obj) => g.next) ?? null;
    const r = await seguir(t.id, "buscar", grupo?.next); if (r) { busca = r; nBusca++; }
  }
  const citeBusca = busca.d?.results?.[0]?.citeAs ?? null;
  const implementa: string[] = finding.rule?.implements ?? [];
  casos.push({ tela: t.id, caso: `busca:"${termo}"`, retrievalCalls: nBusca, citeAs: citeBusca, respondivel: Boolean(citeBusca),
    nota: `status ${busca.d?.status}; citeAs ${implementa.includes(citeBusca) ? "=" : "≠"} norma do achado; ${busca.d?.gaps?.length ?? 0} lacunas` });
  if (citeBusca) check("A2-recuperacao", nBusca <= 2, `${t.id} busca: ${nBusca} chamadas`);

  // 5. medir (navegador próprio, fora do oráculo)
  const m = await medir(page, url, t.arrival, finding.element.locator, data.property ?? null);
  const hexMedido = m.values.map(hexDe);
  const medidoConfere = data.observedHex ? hexMedido.includes(String(data.observedHex).toLowerCase()) : m.count > 0;
  console.log(`  medir ${finding.element.locator.slice(0, 60)} → ${m.count} elementos ${m.values.slice(0, 2).join(" | ")} (${medidoConfere ? "confere" : "diverge"})`);

  // 6. verificar: o achado do próprio scan, sem implements, live no estado do scan
  const { implements: _sem, ...rule } = finding.rule;
  const v = await call(t.id, "verificar", "verify_finding", { finding: { ...finding, rule }, live: true, scanId: scan.scanId });
  registrarVerify(t.id, `achado ${finding.id} ${finding.rule.id}`, v.d);
  const acao = (v.d?.actions ?? []).find((a: Obj) => a.tool);
  if (acao) await seguir(t.id, "verificar:acao", acao); // uma vez, sem laço

  return { scan, finding, medido: { ...m, confere: medidoConfere } };
}

function registrarVerify(tela: string, caso: string, v: Obj | null): void {
  const estruturado = v?.kind === "verification" && typeof v.verdict === "string" && typeof v.about === "string" && typeof v.observation?.status === "string"
    && Array.isArray(v.reasons) && Array.isArray(v.actions) && v.actions.length <= 3 && typeof v.verification === "object";
  check("A7-verify-estruturado", estruturado, `${tela} ${caso}: ${JSON.stringify({ verdict: v?.verdict, about: v?.about, obs: v?.observation?.status })}`);
  verdicts.push({ tela, caso, verdict: v?.verdict ?? null, about: v?.about ?? null, observation: v?.observation?.status ?? null,
    reasons: (v?.reasons ?? []).map((r: Obj) => r.code), actions: (v?.actions ?? []).map((a: Obj) => a.action) });
}

// ─────────────────────────────── casos de fronteira (sessão única)
async function fronteiras(base: string, ctx: { fluxo: Obj; solicitacao: Obj }): Promise<void> {
  const T = "fronteira";
  console.log("\n▸ fronteiras");
  // ausência
  const aus = await call(T, "ausencia", "get_ds_rules", { query: "xyzzy" });
  check("A4-ausencia", aus.d?.status === "no-match" && aus.d.results?.length === 0 && Boolean(aus.d.absenceNote) && aus.d.gaps?.length > 0 && aus.d.next?.length <= 3,
    `status ${aus.d?.status}, ${aus.d?.results?.length} resultados, absenceNote ${Boolean(aus.d?.absenceNote)}, next ${aus.d?.next?.length}`);
  for (const s of (aus.d?.next ?? []).filter((x: Obj) => x.tool)) await seguir(T, "ausencia:next", s);

  // ambiguidade → escolher o grupo devolvido (2 chamadas)
  const amb = await call(T, "ambigua", "get_ds_rules", { query: "fechar" });
  if (amb.d?.status === "ambiguous") {
    const g = amb.d.ambiguity.groups.find((x: Obj) => x.next);
    const r = await seguir(T, "ambigua", g?.next);
    casos.push({ tela: T, caso: `ambigua→${g?.group}`, retrievalCalls: 2, citeAs: r?.d?.results?.[0]?.citeAs ?? null, respondivel: Boolean(r?.d?.results?.[0]?.citeAs), nota: `depois do grupo: ${r?.d?.status}` });
    check("ambigua-resolve", r?.d?.status !== "ambiguous" && Boolean(r?.d?.results?.[0]?.citeAs), `grupo ${g?.group}: ${r?.d?.status}`);
  } else check("ambigua-sinal", false, `"fechar" não veio ambiguous (${amb.d?.status})`);

  // erro de aplicação: componente desconhecido → errorCode + next seguido
  const e1 = await call(T, "erro", "get_ds_rules", { component: "paginacao" });
  check("A5-erro-aplicacao", e1.rec.isError && e1.d?.kind === "error" && Boolean(e1.d.errorCode) && e1.d.next?.length >= 1, `isError ${e1.rec.isError} errorCode ${e1.d?.errorCode} next ${e1.d?.next?.length}`);
  const e1n = await seguir(T, "erro:next", (e1.d?.next ?? []).find((x: Obj) => x.tool));
  check("A5-erro-next-resolve", e1n !== null && !e1n.rec.isError, `next seguido: ${e1n?.rec.tool} ${JSON.stringify(e1n?.rec.args)} isError ${e1n?.rec.isError}`);
  // erro de esquema: parâmetro desconhecido (validação do SDK, -32602)
  const e2 = await call(T, "erro-esquema", "get_ds_rules", { querry: "x" });
  check("A5-erro-esquema", e2.rec.isError, `isError ${e2.rec.isError}; JSON ${e2.d ? "sim" : "não"}; errorCode ${e2.d?.errorCode ?? null}; sugere nome ${/você quis dizer 'query'/.test(e2.text)}`);
  // entrada vazia
  const e3 = await call(T, "erro", "get_ds_rules", { query: "  " });
  check("A5-erro-aplicacao", e3.rec.isError && e3.d?.errorCode === "no-content-terms" && e3.d.next?.length >= 1, `query vazia: errorCode ${e3.d?.errorCode}`);

  // continuação de listagem até o fim, sem laço; cursor de outra consulta = stale-cursor
  const comp = ctx.fluxo.scan?.investigate?.items?.[0]?.component ?? "button";
  let lst = await call(T, "listagem", "get_ds_rules", { component: comp });
  const total = lst.d?.page?.total ?? lst.d?.total; const ids = new Set<string>(); let dup = 0; const cursores = new Set<string>(); let primeiroCursor: string | null = null;
  for (let volta = 0; lst.d; volta++) {
    for (const it of lst.d.items ?? []) { if (ids.has(it.id)) dup++; ids.add(it.id); }
    const c = lst.d.page?.cursor ?? null; primeiroCursor ??= c;
    if (!c) break;
    if (cursores.has(c) || volta > 20) { check("A3-continuacao", false, `listagem ${comp}: cursor repetido/voltas`); break; }
    cursores.add(c);
    lst = await call(T, "listagem", "get_ds_rules", { component: comp, cursor: c }, false);
  }
  check("A3-continuacao", dup === 0 && ids.size === total, `listagem ${comp}: ${ids.size}/${total} ids, ${dup} duplicados, ${cursores.size + 1} páginas`);
  if (primeiroCursor) {
    const st = await call(T, "cursor-alheio", "get_ds_rules", { query: "fechar", component: "modal", cursor: primeiroCursor });
    check("A5-stale-cursor", st.rec.isError && st.d?.errorCode === "stale-cursor" && st.d.next?.length >= 1, `errorCode ${st.d?.errorCode}`);
    const stn = await seguir(T, "cursor-alheio:next", (st.d?.next ?? []).find((x: Obj) => x.tool));
    check("A5-erro-next-resolve", stn !== null && !stn.rec.isError && !("cursor" in (stn.rec.args ?? {})), `refeito sem cursor: ${JSON.stringify(stn?.rec.args)}`);
  }

  // resposta grande: um exemplo de componente por chamada, dentro do orçamento
  await call(T, "grande", "get_component_spec", { component: comp, include_examples: true });

  // estados: alcançado (interação declarada da tela, comparado ao inicial) e não alcançado
  const f = TELAS[0] as typeof TELAS[number] & { interacao: Obj }; const urlF = `${base}/${f.entry}`; const scanF = ctx.fluxo.scan;
  const acoes = [{ action: "click", selector: f.interacao.clicar }];
  const alc = await call(T, "estado-alcancado", "scan_page", { url: urlF, actions: acoes, arrival: { visible: f.interacao.esperar }, compareToScanId: scanF.scanId });
  check("estado-alcancado", alc.d?.status === "scanned" && Boolean(alc.d?.stateDiff), `status ${alc.d?.status}; stateDiff ${Boolean(alc.d?.stateDiff)}`);
  const nao = await call(T, "estado-nao-alcancado", "scan_page", { url: urlF, actions: acoes, arrival: { visible: "#roteiro-sem-modelo-inexistente" } });
  check("estado-nao-alcancado", nao.d?.status !== "scanned", `status ${nao.d?.status}; next ${JSON.stringify(nao.d?.next ?? null).slice(0, 160)}`);

  // estado divergente no verify: impressão digital alheia; scan de outra página
  const fin = ctx.fluxo.finding as Obj | undefined;
  if (fin) {
    const { implements: _x, ...rule } = fin.rule;
    const v1 = await call(T, "estado-divergente", "verify_finding", { finding: { ...fin, rule }, live: true, stateFingerprint: "sha256:" + "0".repeat(64) });
    if (v1.d?.kind === "verification") registrarVerify(T, "impressão digital alheia", v1.d);
    check("A6-estado-divergente", v1.d?.observation?.status !== "contradicted" && (v1.rec.isError || ["state", "none"].includes(v1.d?.about)),
      `isError ${v1.rec.isError} ${v1.d?.errorCode ?? ""} verdict ${v1.d?.verdict} about ${v1.d?.about} obs ${v1.d?.observation?.status}`);
    const sA = ctx.solicitacao.scan?.scanId;
    if (sA) {
      const v2 = await call(T, "estado-divergente", "verify_finding", { finding: { ...fin, rule }, live: true, scanId: sA });
      if (v2.d?.kind === "verification") registrarVerify(T, "scanId de outra página", v2.d);
      check("A6-estado-divergente", v2.d?.observation?.status !== "contradicted" && (v2.rec.isError || ["state", "none"].includes(v2.d?.about)),
        `isError ${v2.rec.isError} ${v2.d?.errorCode ?? ""} verdict ${v2.d?.verdict} about ${v2.d?.about}`);
      if (v2.rec.isError) await seguir(T, "estado-divergente:next", (v2.d?.next ?? []).find((x: Obj) => x.tool));
    }
  }
}

// ─────────────────────────────── principal
async function main(): Promise<void> {
  const pkg = JSON.parse(readFileSync(join(VALIDATOR, "package.json"), "utf8"));
  console.log(`roteiro sem modelo — validator ${pkg.version} em ${VALIDATOR}; telas em http://127.0.0.1:${PORTA}`);
  const srv = await servir();
  const base = `http://127.0.0.1:${PORTA}`;
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(VALIDATOR, "dist/index.js")],
    env: { ...process.env, GOVBR_VALIDATOR_TOOL_PROFILE: "evaluation" } as Record<string, string>, stderr: "ignore" });
  client = new Client({ name: "roteiro-sem-modelo", version: "1.0.0" });
  await client.connect(transport);
  const desc = client.getServerVersion()?.description ?? null;
  check("perfil-declarado", desc === "toolProfile=evaluation", `serverInfo.description ${JSON.stringify(desc)}`);
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "pt-BR" })).newPage();
  const ctx: Obj = {};
  try {
    for (const t of TELAS) ctx[t.id] = await percorrer(t, base, page);
    await fronteiras(base, ctx as { fluxo: Obj; solicitacao: Obj });
  } finally { await browser.close(); await client.close(); srv.close(); }

  // ─── resumo
  const porTool: Record<string, { calls: number; chars: number; max: number }> = {};
  for (const r of recs) { const x = (porTool[r.tool] ??= { calls: 0, chars: 0, max: 0 }); x.calls++; x.chars += r.chars; x.max = Math.max(x.max, r.chars); }
  const iniciais = recs.filter((r) => r.initial);
  console.log("\n── resumo");
  console.log(`chamadas ao oráculo: ${recs.length} (${recs.filter((r) => RETRIEVAL.has(r.tool)).length} de recuperação, ${recs.filter((r) => !r.initial).length} continuações); passos de navegador: ${browserSteps}`);
  console.log(`caracteres: total ${recs.reduce((s, r) => s + r.chars, 0)}; maior resposta inicial ${Math.max(...iniciais.map((r) => r.chars))}`);
  for (const [k, v] of Object.entries(porTool)) console.log(`  ${k.padEnd(20)} ${String(v.calls).padStart(3)} chamadas, ${String(v.chars).padStart(6)} car., máx ${v.max}`);
  console.log("casos de recuperação:");
  for (const c of casos) console.log(`  ${c.tela.padEnd(11)} ${c.caso.slice(0, 40).padEnd(40)} ${c.respondivel ? "[respondível]" : "[só componente]"} ${c.retrievalCalls} chamada(s) → ${c.citeAs ?? "sem citeAs"} (${c.nota})`);
  console.log(`erros: ${recs.filter((r) => r.isError).map((r) => `${r.tool}:${r.errorCode ?? "sem errorCode (texto do SDK)"}`).join(", ")}`);
  console.log("vereditos:");
  for (const v of verdicts) console.log(`  ${v.tela.padEnd(11)} ${v.caso.slice(0, 50).padEnd(50)} ${v.verdict}/${v.about}/${v.observation} reasons=[${v.reasons.join(",")}] actions=[${v.actions.join(",")}]`);
  const falhas = checks.filter((c) => !c.ok);
  const porId = [...new Set(checks.map((c) => c.id))].map((id) => `${id} ${checks.filter((c) => c.id === id && c.ok).length}/${checks.filter((c) => c.id === id).length}`);
  console.log(`aceite: ${porId.join(" · ")}`);
  if (SAIDA) writeFileSync(resolve(SAIDA), JSON.stringify({ validator: { version: pkg.version, root: VALIDATOR }, browserSteps, porTool, casos, verdicts, checks, chamadas: recs }, null, 2) + "\n");
  console.log(falhas.length ? `\nFALHOU: ${falhas.length} verificação(ões)` : "\nok — aceite mecânico cumprido");
  process.exit(falhas.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
