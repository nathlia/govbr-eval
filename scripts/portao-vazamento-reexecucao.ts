/**
 * Portão do detector de vazamento ANTES de uma campanha (detector 1.3.1, dev-366-b-01; vale para o 1.3.2, dev-371-b-01).
 *
 * Por quê: duas execuções do braço ferramentas da `dev-366-b-01` (oráculo 3.6.6) falharam o isolamento só porque a
 * 3.6.5/3.6.6 passou a devolver formas de resposta que o detector não conhecia (localizador medido em
 * `checksRun.pageLevel.notMeasured[*].measured[*].locator`, seletor citado no texto do verify, seletor da falha do
 * replay). O falso positivo só apareceu depois de gastar a execução. Na `dev-371-b-01` (oráculo 3.7.1) o mesmo aconteceu
 * com o ledger do get_finding_details (seletores de um scan_page anterior) e com o seletor de aspas internas citado na
 * prosa do verify_finding (detector 1.3.2). Na reexecução os scanId trocados também chegam ao vínculo do ledger: o
 * detector casa o scanId pedido com o que o scan_page reexecutado devolveu. Este portão pega a classe de erro antes:
 *
 *   --chamadas <pasta>   chamadas REAIS de uma reexecução (formato `calls/*.json` das pastas
 *                        `thesis-workspace/planejamento/atual/reexecucao-*`: { campaign, rep, screen, calls: [{ name,
 *                        arguments }] }) — normalmente do braço com, que exercita mais formas de resposta;
 *   --pacote <pasta>     um pacote de execução (com `evidence/raw/oracle/tool-events.ndjson`): as chamadas ao oráculo
 *                        que o agente fez, na ordem;
 *   --validator <raiz>   o build a conferir (data/ + dist/ + node_modules, ex.: .tmp-eval/validator-371).
 *
 * Cada sessão (um arquivo de chamadas ou um pacote) vira UM processo MCP novo do build, no perfil `knowledge-free`
 * (o do braço ferramentas), janela 1280x900, contra o site congelado já servido (`--site`, padrão
 * http://127.0.0.1:3300; o endereço `http://screens:3300` das chamadas é reescrito para ele). Chamadas a ferramentas
 * fora do perfil (get_ds_rules, get_component_spec…) não são enviadas (contadas em `foraDoPerfil`). scanId e F-id da
 * sessão original são trocados pelos da reexecução (chave regra|localizador, como o replay.mjs); o que não casar segue
 * como está e a resposta (um erro, por exemplo) é varrida assim mesmo: o portão mede FORMAS de resposta, não vereditos.
 * Toda resposta + o tools/list passam pelo MESMO detector do run-once (`varrerPayloadsDoOraculo`, dicionário do data/
 * do build, bytes do site em --telas). Aceite: 0 `sem-explicacao`, canários todos ok, trava de conhecimento 0.
 *
 *   --revarrer <pacote>  modo offline (sem servidor nem navegador): revarre as respostas GRAVADAS de um pacote do braço
 *                        ferramentas com o detector atual (rechecagem de um falso positivo já ocorrido). O pacote TEM de
 *                        trazer evidence/raw/oracle/inventory.json com o perfil knowledge-free; senão é recusado.
 *   --controle-positivo <pacote>  idem para um pacote do perfil evaluation (braço com), escolhido de propósito: passa só
 *                        se o detector ACHA conteúdo da base (> 0 sem explicação), como o controle positivo do run-once.
 *
 * A tela de cada sessão (pacote: run.json → screen.id; calls/*.json: screen "A" → solicitacao, "B" → vistorias) escolhe o
 * inventário do DOM renderizado (scripts/vazamento/inventario-dom/<tela>.json); tela desconhecida = sem inventário = a
 * regra do seletor de elemento da página não perdoa nada.
 *
 * Uso:
 *   npx tsx scripts/portao-vazamento-reexecucao.ts --validator ../.tmp-eval/validator-371 \
 *     --chamadas ../thesis-workspace/planejamento/atual/reexecucao-3.7.0-2026-11-02/calls [--pacote <pasta>]... \
 *     [--site http://127.0.0.1:3300] [--telas ../govbr-telas] [--saida <arquivo.json>]
 *   npx tsx scripts/portao-vazamento-reexecucao.ts --validator ../.tmp-eval/validator-366 --revarrer <pacote>... [--controle-positivo <pacote>]
 *
 * Saída: resumo no terminal e o relatório JSON (--saida; padrão no diretório temporário). Código 0 = passa, 1 = falha.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DEFAULT_TELAS_DIR } from "../runner/lib";
import { PERFIS } from "../runner/perfis-oraculo";
import { rebaseToolPayloads } from "./tool-payloads";
import { VARREDURA_VERSAO, varrerPayloadsDoOraculo, type RelatorioVazamento } from "./vazamento/conhecimento";

type Evento = Record<string, unknown>;
interface Sessao { nome: string; tela: string | null; chamadas: { name: string; arguments: unknown; originalResponse?: string }[] }
interface ResultadoSessao {
  sessao: string;
  modo: "reexecucao" | "revarredura";
  tela: string | null;
  inventario: string;
  enviadas: number;
  foraDoPerfil: number;
  isError: number;
  trocas: number;
  travaMax: number | null;
  respostas: number;
  semExplicacao: RelatorioVazamento["semExplicacao"];
  porClasse: Record<string, number>;
  incompletas: number;
  canarios: string;
  canariosOk: boolean;
  /**
   * Perfil do tools/list da sessão. Um pacote do braço com (evaluation) é CONTROLE POSITIVO, como no run-once: lá o
   * scan e o verify também citam a base, então ocorrências sem explicação são esperadas (tem de haver > 0).
   */
  perfil: "knowledge-free" | "evaluation";
  /** knowledge-free: o aceite (tem de ser 0). evaluation: o total (controle positivo, tem de ser > 0). */
  sem: number;
  ok: boolean;
}
type Base = Pick<ResultadoSessao, "sessao" | "modo" | "tela" | "enviadas" | "foraDoPerfil" | "isError" | "trocas" | "travaMax">;

const argv = process.argv.slice(2);
const muitos = (k: string): string[] => argv.flatMap((a, i) => (a === `--${k}` && argv[i + 1] ? [argv[i + 1]] : []));
const um = (k: string, d?: string): string | undefined => muitos(k)[0] ?? d;

const PROFILE = "knowledge-free" as const;
const PERMITIDAS = new Set(PERFIS[PROFILE].tools);

function lerNdjson(p: string): Evento[] {
  return readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Evento);
}

/** Texto integral de um lado (args/result) de um evento da ponte, já com o caminho do payload relativo ao pacote. */
function integral(pacote: string, e: Evento, lado: "args" | "result"): string | null {
  const s = e[lado] as { text?: string; truncated?: boolean; payload?: { status?: string; path?: string | null } } | undefined;
  if (!s || typeof s.text !== "string") return null;
  if (!s.truncated) return s.text;
  const p = s.payload?.path ? join(pacote, s.payload.path) : null;
  return s.payload?.status === "complete" && p && existsSync(p) ? readFileSync(p, "utf8") : null;
}

function eventosDoPacote(pacote: string): Evento[] {
  return lerNdjson(join(pacote, "evidence", "raw", "oracle", "tool-events.ndjson")).map((e) => rebaseToolPayloads(e, "evidence/raw/oracle"));
}

const TELA_DA_LETRA: Record<string, string> = { A: "solicitacao", B: "vistorias" };
/** Tela de um pacote (run.json → screen.id), ou null. */
function telaDoPacote(pacote: string): string | null {
  const f = join(pacote, "run.json");
  if (!existsSync(f)) return null;
  const id = (JSON.parse(readFileSync(f, "utf8")) as { screen?: { id?: string } }).screen?.id;
  return typeof id === "string" ? id : null;
}

/** inventory.json da ponte do oráculo, obrigatório: sem ele não há como saber o perfil (falha fechada). */
function inventarioDaPonte(pacote: string): { toolsList: unknown[] | null; exposed: string[] } {
  const f = join(pacote, "evidence", "raw", "oracle", "inventory.json");
  if (!existsSync(f)) throw new Error(`${pacote}: sem evidence/raw/oracle/inventory.json — o perfil do oráculo não é conhecido; pacote recusado`);
  const inv = JSON.parse(readFileSync(f, "utf8")) as { toolsList?: unknown[]; exposed?: string[] };
  if (!Array.isArray(inv.exposed) || !inv.exposed.length) throw new Error(`${pacote}: inventory.json sem a lista exposed; pacote recusado`);
  return { toolsList: inv.toolsList ?? null, exposed: inv.exposed };
}

function sessoes(): Sessao[] {
  const out: Sessao[] = [];
  for (const dir of muitos("chamadas")) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const run = JSON.parse(readFileSync(join(dir, f), "utf8")) as { screen?: string; calls: Sessao["chamadas"] };
      out.push({ nome: f.replace(/\.json$/, ""), tela: TELA_DA_LETRA[run.screen ?? ""] ?? null, chamadas: run.calls.map((c) => ({ name: c.name, arguments: c.arguments, originalResponse: c.originalResponse })) });
    }
  }
  for (const pacote of muitos("pacote")) {
    const chamadas = eventosDoPacote(pacote).filter((e) => e.kind === "call").map((e) => {
      const t = integral(pacote, e, "args") ?? "{}";
      let a: unknown = {};
      try { a = JSON.parse(t); } catch { a = {}; }
      return { name: String(e.tool), arguments: a, originalResponse: integral(pacote, e, "result") ?? undefined };
    });
    out.push({ nome: pacote.split(/[\\/]/).filter(Boolean).at(-1)!, tela: telaDoPacote(pacote), chamadas });
  }
  return out;
}

// ---- trocas de id de sessão (mesma ideia do replay.mjs da reexecução 3.7.0)
const deepMap = (v: unknown, f: (s: unknown) => unknown): unknown =>
  Array.isArray(v) ? v.map((x) => deepMap(x, f)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, f)])) : f(v);
const primeiroScanId = (t: string): string | undefined => (/"scanId"\s*:\s*"(S-[^"]+)"/.exec(t) ?? [])[1];
function chavesDeAchado(text: string): Map<string, string> {
  const m = new Map<string, string>();
  const partes: unknown[] = [];
  for (const linha of text.split("\n")) { try { partes.push(JSON.parse(linha)); } catch { /* não-JSON */ } }
  const rk = (r: unknown): string => (typeof r === "string" ? r : r && typeof r === "object" ? String((r as Record<string, unknown>).checker ?? (r as Record<string, unknown>).id ?? "") : "");
  const andar = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(andar); return; }
    if (!o || typeof o !== "object") return;
    const x = o as Record<string, any>;
    if (typeof x.familyId === "string" && x.rule) {
      const fam = `${rk(x.rule)}|${x.property ?? ""}|${x.example?.element?.locator ?? ""}`;
      (x.memberIds ?? []).forEach((id: string, i: number) => { if (!m.has(id)) m.set(id, `${fam}|#${i}`); });
      if (x.example?.id && !m.has(x.example.id)) m.set(x.example.id, `${fam}|#0`);
      return;
    }
    const id = typeof x.id === "string" && /^F-\d+/.test(x.id) ? x.id : typeof x.findingId === "string" ? x.findingId : null;
    if (id && !m.has(id)) m.set(id, `${rk(x.rule) || x.ruleId || ""}|${x.locator ?? x.element?.locator ?? ""}`);
    Object.values(x).forEach(andar);
  };
  partes.forEach(andar);
  return m;
}

async function reexecutar(s: Sessao, o: { validator: string; site: string; tmp: string }): Promise<{ eventos: Evento[]; toolsList: unknown[]; r: Base }> {
  const telemetria = join(o.tmp, `tel-${s.nome}.ndjson`);
  const transport = new StdioClientTransport({
    command: process.execPath, args: [join(o.validator, "dist", "index.js")], cwd: o.validator, stderr: "ignore",
    env: { ...(process.env as Record<string, string>), GOVBR_VALIDATOR_TOOL_PROFILE: PROFILE, GOVBR_VALIDATOR_VIEWPORT: "1280x900",
      GOVBR_VALIDATOR_REPORTS_DIR: join(o.tmp, "reports"), GOVBR_VALIDATOR_TELEMETRY_FILE: telemetria },
  });
  const client = new Client({ name: "portao-vazamento", version: "1.0.0" });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const expostas = tools.map((t) => t.name).sort();
  if (JSON.stringify(expostas) !== JSON.stringify([...PERMITIDAS].sort())) throw new Error(`${s.nome}: o build não expõe o perfil ${PROFILE} (${expostas.join(", ")})`);
  const scanMap = new Map<string, string>();
  const fMap = new Map<string, string>();
  const eventos: Evento[] = [];
  let foraDoPerfil = 0, isError = 0, trocas = 0, seq = 0;
  for (const c of s.chamadas) {
    if (!PERMITIDAS.has(c.name)) { foraDoPerfil += 1; continue; }
    const args = deepMap(c.arguments, (v) => {
      if (typeof v !== "string") return v;
      const t = v.replaceAll("http://screens:3300", o.site);
      const n = scanMap.get(t) ?? fMap.get(t);
      if (n !== undefined && n !== t) { trocas += 1; return n; }
      return t;
    }) as Record<string, unknown>;
    let text: string, erro = false;
    try {
      const r = await client.callTool({ name: c.name, arguments: args }, undefined, { timeout: 240_000 });
      text = (r.content as { type: string; text?: string }[]).map((x) => x.text ?? "").join("\n");
      erro = !!r.isError;
    } catch (e) { text = String(e); erro = true; }
    if (erro) isError += 1;
    seq += 1;
    eventos.push({ kind: "call", seq, tool: c.name, outcome: erro ? "error" : "ok",
      args: { text: JSON.stringify(args), truncated: false }, result: { text, truncated: false } });
    if (c.name === "scan_page" && !erro) {
      // mapa scanId/F-id original → reexecutado, pela resposta original (calls/*.json ou o resultado gravado no pacote)
      const original = c.originalResponse;
      const nScan = primeiroScanId(text);
      if (original) {
        const oScan = primeiroScanId(original);
        if (oScan && nScan) scanMap.set(oScan, nScan);
        const inv = new Map<string, string>();
        for (const [id, k] of chavesDeAchado(text)) if (!inv.has(k)) inv.set(k, id);
        for (const [id, k] of chavesDeAchado(original)) if (inv.has(k)) fMap.set(id, inv.get(k)!);
      }
    }
  }
  await client.close();
  const tel = existsSync(telemetria) ? lerNdjson(telemetria) : [];
  const marcas = tel.map((e) => e.knowledgeLockAttempts).filter((x): x is number => typeof x === "number");
  return { eventos, toolsList: tools, r: { sessao: s.nome, modo: "reexecucao", tela: s.tela, enviadas: seq, foraDoPerfil, isError, trocas, travaMax: marcas.length ? Math.max(...marcas) : null } };
}

async function main(): Promise<void> {
  const validator = resolve(um("validator") ?? "");
  if (!existsSync(join(validator, "dist", "index.js")) || !existsSync(join(validator, "data"))) {
    console.error("--validator <raiz do build com data/ e dist/> obrigatório"); process.exit(2);
  }
  const telas = resolve(um("telas", DEFAULT_TELAS_DIR)!);
  const site = um("site", "http://127.0.0.1:3300")!.replace(/\/+$/, "");
  const tmp = mkdtempSync(join(tmpdir(), "portao-vazamento-"));
  const versao = (JSON.parse(readFileSync(join(validator, "package.json"), "utf8")) as { version: string }).version;
  const resultados: ResultadoSessao[] = [];
  const fechar = (base: Base, rel: RelatorioVazamento, perfil: ResultadoSessao["perfil"]): ResultadoSessao => {
    const sem = rel.semExplicacao.reduce((n, u) => n + u.count, 0);
    const canariosOk = rel.canarios.every((c) => c.ok);
    return {
      ...base, inventario: `${rel.inventario.tela ?? "-"} ${rel.inventario.status} (${rel.inventario.tags} tags, ${rel.inventario.classes}+${rel.inventario.classesDinamicas} classes)`, respostas: rel.respostas, semExplicacao: rel.semExplicacao, porClasse: rel.porClasse, incompletas: rel.incompletas.length,
      canarios: `${rel.canarios.filter((c) => c.ok).length}/${rel.canarios.length}`, canariosOk, perfil, sem,
      ok: canariosOk && rel.incompletas.length === 0 && rel.respostas > 0 && (perfil === "knowledge-free" ? sem === 0 : sem > 0)
        && (base.modo === "revarredura" || base.travaMax === 0),
    };
  };

  // modo offline: revarre as respostas gravadas (ferramentas por --revarrer; controle positivo só por --controle-positivo)
  const offline = [...muitos("revarrer").map((p) => ({ p, perfil: "knowledge-free" as const })), ...muitos("controle-positivo").map((p) => ({ p, perfil: "evaluation" as const }))];
  for (const { p: pacote, perfil } of offline) {
    const ponte = inventarioDaPonte(pacote);
    const livre = ponte.exposed.every((t) => PERMITIDAS.has(t));
    if (perfil === "knowledge-free" && !livre) throw new Error(`${pacote}: a ponte expôs ${ponte.exposed.join(", ")} (não é o perfil knowledge-free); para um pacote do braço com use --controle-positivo`);
    if (perfil === "evaluation" && livre) throw new Error(`${pacote}: --controle-positivo pede um pacote do perfil evaluation; a ponte expôs só ${ponte.exposed.join(", ")}`);
    const tela = telaDoPacote(pacote);
    const rel = await varrerPayloadsDoOraculo({ validatorDir: validator, telasDir: telas, tela, eventos: eventosDoPacote(pacote), toolsList: ponte.toolsList,
      ler: (p) => (existsSync(join(pacote, p)) ? readFileSync(join(pacote, p), "utf8") : null) });
    resultados.push(fechar({ sessao: pacote.split(/[\\/]/).filter(Boolean).at(-1)!, modo: "revarredura", tela, enviadas: 0, foraDoPerfil: 0, isError: 0, trocas: 0, travaMax: null }, rel, perfil));
  }

  // modo reexecução: as chamadas no perfil knowledge-free contra o build
  const lista = sessoes();
  if (lista.length) {
    const r = await fetch(site + "/").catch(() => null);
    if (!r) { console.error(`site ${site} não responde: sirva o site congelado (ex.: node ../govbr-telas/server.mjs --port 3300)`); process.exit(3); }
    for (const s of lista) {
      const t0 = Date.now();
      const { eventos, toolsList, r: base } = await reexecutar(s, { validator, site, tmp });
      const rel = await varrerPayloadsDoOraculo({ validatorDir: validator, telasDir: telas, tela: s.tela, eventos, toolsList, ler: () => null });
      resultados.push(fechar(base, rel, "knowledge-free"));
      console.error(`${s.nome}: ${base.enviadas} chamadas (${base.foraDoPerfil} fora do perfil) em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }

  const sem = resultados.filter((r) => r.perfil === "knowledge-free").reduce((n, r) => n + r.sem, 0);
  const passa = resultados.length > 0 && resultados.every((r) => r.ok);
  const saida = um("saida", join(tmp, "portao-vazamento.json"))!;
  writeFileSync(saida, JSON.stringify({ portao: "portao-vazamento-reexecucao-1.1.0", detector: VARREDURA_VERSAO, validator, versao, perfil: PROFILE, site, telas,
    passa, semExplicacaoNoPerfilLivre: sem, sessoes: resultados }, null, 1));
  console.log(`detector ${VARREDURA_VERSAO} · validator ${versao} · perfil ${PROFILE}`);
  for (const r of resultados) {
    console.log(`  ${r.ok ? "ok   " : "FALHA"} ${r.modo === "revarredura" ? "revarredura" : "reexecução "} ${r.sessao} [${r.perfil}]: ${r.respostas} respostas; sem explicação ${r.sem}`
      + (r.perfil === "evaluation" ? " (controle positivo: precisa ser > 0)" : "")
      + `; perdoadas ${JSON.stringify(r.porClasse)}; canários ${r.canarios}; inventário ${r.inventario}`
      + (r.modo === "reexecucao" ? `; enviadas ${r.enviadas} (fora do perfil ${r.foraDoPerfil}, isError ${r.isError}, ids trocados ${r.trocas}); trava ${r.travaMax}` : ""));
    if (r.perfil === "knowledge-free") for (const u of r.semExplicacao) console.log(`      SEM EXPLICAÇÃO ${u.term} (${u.source}) em ${u.tool} ${u.path} ×${u.count}: ${JSON.stringify(u.exemplo)}`);
  }
  console.log(`${passa ? "PASSA" : "FALHA"}: ${sem} ocorrência(s) sem explicação nas respostas do perfil knowledge-free em ${resultados.length} sessão(ões); relatório ${saida}`);
  process.exit(passa ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
