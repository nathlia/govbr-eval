/**
 * NAT-86 — roda os detectores do validator sobre os controles, linha a linha da matriz congelada
 * (plano §3–§5). Sem modelo.
 *
 *   npm run portao:oraculo -- [--divisao desenvolvimento] [--matriz portao-nat86/matriz.json]
 *                              [--raiz ../govbr-corpus/dist] [--saida portao-nat86/medicoes] [--gemeos A,B]
 *   reserva (uma vez): ... --divisao reserva --portao-nat86 --matriz-sha256 <sha256 gravado no plano>
 *
 * D1 = portão `verifyFinding` (a mesma função da ferramenta `verify_finding`), live, com as ações da
 *      entrada da linha; cada alegação da linha vai separada e a linha é julgada pelo conjunto.
 * D2 = scanner `scanPage` (a mesma da ferramenta `scan_page`, janela congelada do oráculo) no estado da
 *      receita do gêmeo; um achado casa uma linha quando cruza a norma (hash de 12 da base literal,
 *      ou o id wcag/emag) E o elemento (o mesmo nó, ou um contém o outro) no estado da receita.
 * Grava <saida>/<carimbo>/<divisao>/{linhas.json, resumo.json, tabela.md} e manifesto.json (sha256).
 *
 * NAT-61 — `--perfil knowledge-free` (validator ≥ 2.14.0): os MESMOS detectores no perfil do braço ferramentas
 * (verifyFinding/scanPage com `knowledgeFree`, trava de conhecimento ligada no processo; tentativas > 0 = bloqueia),
 * julgados contra uma EXPECTATIVA PRÓPRIA derivada da matriz congelada por regra declarada (a matriz não muda):
 *   - linhas de norma WCAG: a mesma expectativa do evaluation (P1 fica no perfil, decisão 6);
 *   - linhas de fonte DS / e-MAG / outras: `confirmar` e `nao-confirmar` viram `nao-confirmavel-por-desenho`
 *     (o perfil devolve ruleExists unknown e nunca confirma: um confirmed é FP bloqueante); `so-unverifiable` e
 *     `fora-do-escopo` ficam como estão;
 *   - D2: `detectar` (anatomia P2) vira informativo — o scan do perfil é só axe-core, por desenho.
 * Capacidade 1.1.0 (validator ≥ 2.14.2, revisão Codex 8963921e): `portao-nat86/capacidade-knowledge-free.json`, versionado à
 * parte da matriz, lista as linhas WCAG `confirmar` cuja detecção do erro só o S5 (estado de erro declarado pelo componente DS)
 * sustenta — no perfil elas viram `nao-confirmavel-por-desenho` (confirmed = FP bloqueante, unverifiable = TN-por-desenho).
 * Saída em <carimbo>/<divisao>-knowledge-free/. `--janela LxA` (padrão 1280x900, a do runner desde a NAT-61) vai
 * para GOVBR_VALIDATOR_VIEWPORT antes de carregar o dist/ e para o contexto da conferência do D2.
 * A reserva continua só com --portao-nat86 e a matriz congelada; nada aqui a abre por conta própria.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { arg, barra, gravar, json, lerExpectativas, sha256, PAPEIS_DE_EVIDENCIA, type Divisao } from "../comparadores/comum";
import { PASTA_PORTAO, RAIZ_CORPUS_DIST, VALIDATOR_DIR, executarPasso, servirRaiz, type Passo } from "./comum";
import type { Linha } from "./matriz";

type Veredito = { tipo: string; condicao?: string; localizador: string; dados?: unknown; verdict: string; violation?: string; detalhe: string };
interface ResultadoLinha {
  id: string; gemeo: string; familia: string; classe: string; esperado: string; norma: string;
  esperadoD1: EsperadoD1; d1: { veredictos: Veredito[]; julgamento: string };
  esperadoD2: Linha["esperadoD2"]; d2: { achados: { regra: string; localizador: string }[]; julgamento: string } | null;
}

export type Perfil = "evaluation" | "knowledge-free";
/** NAT-61: classe a mais do perfil knowledge-free (fonte DS/e-MAG: nunca confirmável, por desenho). */
export type EsperadoD1 = Linha["esperadoD1"] | "nao-confirmavel-por-desenho";

/** Capacidade do perfil knowledge-free versionada à parte da matriz (portao-nat86/capacidade-knowledge-free.json). */
export interface CapacidadeKnowledgeFree {
  versao: string;
  naoConfirmavelPorDesenho: { linha: string; sinal: string; motivo: string }[];
}
export const ARQUIVO_CAPACIDADE_KF = join(PASTA_PORTAO, "capacidade-knowledge-free.json");
export function lerCapacidadeKnowledgeFree(arquivo = ARQUIVO_CAPACIDADE_KF): { capacidade: CapacidadeKnowledgeFree; sha256: string } {
  const bytes = readFileSync(arquivo);
  return { capacidade: JSON.parse(bytes.toString("utf8")) as CapacidadeKnowledgeFree, sha256: sha256(bytes) };
}

/**
 * Expectativa da linha no perfil knowledge-free, derivada da expectativa congelada (regra no cabeçalho).
 * Fonte = a da regra citável da linha (`regra.source`), ou o prefixo da norma quando não há regra.
 * Com `capacidade` (1.1.0): linha WCAG `confirmar` listada como confirmável só pelo S5 → nao-confirmavel-por-desenho.
 */
export function expectativaKnowledgeFree(
  l: Pick<Linha, "esperadoD1" | "esperadoD2" | "norma" | "regra"> & { id?: string },
  capacidade?: CapacidadeKnowledgeFree
): { esperadoD1: EsperadoD1; esperadoD2: Linha["esperadoD2"]; motivo: string } {
  const fonte = l.regra?.source ?? l.norma.split(":")[0];
  const d2 = l.esperadoD2 === "detectar" ? "informativo" as const : l.esperadoD2;
  const so = l.id ? capacidade?.naoConfirmavelPorDesenho.find((x) => x.linha === l.id) : undefined;
  if (so && capacidade && fonte === "wcag" && l.esperadoD1 === "confirmar") {
    return { esperadoD1: "nao-confirmavel-por-desenho", esperadoD2: d2, motivo: `${capacidade.versao}: detecção só por ${so.sinal} (conhecimento do DS, fora do perfil) — ${so.motivo}` };
  }
  if (fonte === "wcag") return { esperadoD1: l.esperadoD1, esperadoD2: d2, motivo: "WCAG: mesma expectativa do evaluation (P1 no perfil)" };
  if (l.esperadoD1 === "confirmar" || l.esperadoD1 === "nao-confirmar") {
    return { esperadoD1: "nao-confirmavel-por-desenho", esperadoD2: d2, motivo: `fonte ${fonte}: o perfil não confere DS/e-MAG (ruleExists unknown), nunca confirma` };
  }
  return { esperadoD1: l.esperadoD1, esperadoD2: d2, motivo: `fonte ${fonte}: ${l.esperadoD1} vale igual nos dois perfis` };
}

const hashes = (ids: string[]) => new Set(ids.map((i) => /([0-9a-f]{12})$/.exec(i)?.[1]).filter(Boolean) as string[]);

export function julgarD1(esperado: EsperadoD1, vs: Veredito[]): string {
  const confirmado = vs.some((v) => v.verdict === "confirmed");
  // Sem alegação citável a linha NÃO foi exercitada: não é aprovação, tem denominador próprio.
  if (vs.length === 0) return esperado === "confirmar" ? "FN" : "nao-exercitado";
  switch (esperado) {
    case "confirmar": return confirmado ? "TP" : "FN";
    case "fora-do-escopo": return confirmado ? "TP-fora-do-escopo" : "fora-do-escopo";
    case "nao-confirmar": return confirmado ? "FP" : "TN";
    case "so-unverifiable": return confirmado ? "FP" : vs.every((v) => v.verdict === "unverifiable") ? "preservado" : "decidido";
    case "nao-confirmavel-por-desenho": return confirmado ? "FP" : "TN-por-desenho";
  }
}
/**
 * Decisão do portão sobre as linhas (go/no-go, plano §4.3): no-go com QUALQUER bloqueante (FP no D1
 * ou D2) ou falha de aceite (FN em positivo implementado, FN de anatomia no D2, desconhecido
 * convertido em decisão), e também se alguma classe exigida não foi exercitada nenhuma vez (sem
 * alegação não conta como aprovação).
 */
export function decidir(rs: { id: string; esperadoD1: EsperadoD1; d1: { veredictos: unknown[]; julgamento: string }; d2: { julgamento: string } | null }[]) {
  const motivos: string[] = [];
  const bloq = rs.filter((r) => r.d1.julgamento === "FP" || r.d2?.julgamento === "FP");
  const aceite = rs.filter((r) => r.d1.julgamento === "FN" || r.d1.julgamento === "decidido" || r.d2?.julgamento === "FN");
  if (bloq.length) motivos.push(`${bloq.length} linha(s) com falso positivo (bloqueia)`);
  if (aceite.length) motivos.push(`${aceite.length} linha(s) com falha de aceite (FN/desconhecido decidido)`);
  const exercitadas: Record<string, { exercitadas: number; total: number }> = {};
  for (const k of ["confirmar", "nao-confirmar", "so-unverifiable", "nao-confirmavel-por-desenho"] as const) {
    const ls = rs.filter((r) => r.esperadoD1 === k);
    if (k === "nao-confirmavel-por-desenho" && !ls.length) continue;
    exercitadas[k] = { exercitadas: ls.filter((r) => r.d1.veredictos.length > 0).length, total: ls.length };
    if (ls.length && exercitadas[k].exercitadas === 0) motivos.push(`classe ${k} sem nenhuma linha exercitada`);
  }
  return { resultado: motivos.length ? "no-go" as const : "go" as const, motivos, exercitadas };
}

export function julgarD2(esperado: Linha["esperadoD2"], n: number): string {
  if (esperado === "detectar") return n ? "TP" : "FN";
  if (esperado === "nao-sinalizar") return n ? "FP" : "TN";
  return n ? "sinal" : "-";
}

export async function rodar(opcoes: { divisao: Divisao; matriz: string; raiz: string; saida: string; gemeos: string[] | null; carimbo: string; perfil?: Perfil; janela?: string; capacidade?: string }) {
  const perfil: Perfil = opcoes.perfil ?? "evaluation";
  const kf = perfil === "knowledge-free";
  const janelaTxt = opcoes.janela ?? "1280x900";
  const mj = /^(\d+)x(\d+)$/.exec(janelaTxt);
  if (!mj) throw new Error(`--janela inválida: ${janelaTxt} (LARGURAxALTURA)`);
  const janela = { width: Number(mj[1]), height: Number(mj[2]) };
  // a janela do oráculo é lida do ambiente pelo dist/ (2.14.0, GOVBR_VALIDATOR_VIEWPORT); antes de qualquer import dele
  process.env.GOVBR_VALIDATOR_VIEWPORT = janelaTxt;
  const bytesMatriz = readFileSync(opcoes.matriz);
  const shaMatriz = sha256(bytesMatriz);
  if (opcoes.divisao === "reserva") {
    const pedido = arg("--matriz-sha256");
    if (!process.argv.includes("--portao-nat86")) throw new Error("a reserva só é medida no portão NAT-86 (--portao-nat86)");
    if (pedido !== shaMatriz) throw new Error(`matriz ${shaMatriz} ≠ --matriz-sha256 ${pedido}: a reserva só roda contra a matriz congelada no plano`);
  }
  const matriz = JSON.parse(bytesMatriz.toString("utf8")) as { versao: string; fontes: unknown; linhas: Linha[] };
  const nomeDivisao = opcoes.divisao;
  const { sha256: shaExp, exp } = lerExpectativas(opcoes.divisao);
  const shaNaMatriz = (matriz.fontes as { expectativas: Record<string, string> }).expectativas[opcoes.divisao === "reserva" ? "controles/reserva/expectativas.json" : "controles/expectativas.json"];
  if (shaNaMatriz !== shaExp) throw new Error(`expectativas mudaram desde a matriz (${shaNaMatriz} ≠ ${shaExp})`);
  const linhas = matriz.linhas.filter((l) => l.divisao === nomeDivisao && (!opcoes.gemeos || opcoes.gemeos.includes(l.gemeo)));
  if (!linhas.length) throw new Error(`nenhuma linha da divisão ${nomeDivisao} na matriz`);
  // capacidade do knowledge-free versionada à parte: cada linha listada tem de existir na matriz e ser WCAG `confirmar`
  const cap = kf ? lerCapacidadeKnowledgeFree(opcoes.capacidade) : null;
  for (const x of cap?.capacidade.naoConfirmavelPorDesenho ?? []) {
    const l = matriz.linhas.find((m) => m.id === x.linha);
    if (!l) throw new Error(`capacidade knowledge-free: linha ${x.linha} não existe na matriz`);
    if (l.esperadoD1 !== "confirmar" || (l.regra?.source ?? l.norma.split(":")[0]) !== "wcag") throw new Error(`capacidade knowledge-free: ${x.linha} não é linha WCAG 'confirmar'`);
  }

  const dist = pathToFileURL(join(VALIDATOR_DIR, "dist") + "/").href;
  const { verifyFinding } = await import(dist + "verify/gate.js");
  const { scanPage, PageScanCache } = await import(dist + "scan/pageScan.js");
  const { closeBrowser } = await import(dist + "evidence/browser.js");
  // NAT-61: no knowledge-free, a trava de conhecimento vale para o processo inteiro (como no servidor do perfil)
  const trava = kf ? await import(dist + "data/lock.js") as { lockKnowledgeForProcess: () => void; knowledgeLockAttempts: () => { attempts: number; loaders: string[] } } : null;
  if (kf && !trava?.lockKnowledgeForProcess) throw new Error("dist/ sem data/lock.js: o perfil knowledge-free exige validator ≥ 2.14.0");
  trava?.lockKnowledgeForProcess();
  const opcoesScan = kf ? { knowledgeFree: true } : {};
  const versaoValidator = (JSON.parse(readFileSync(join(VALIDATOR_DIR, "package.json"), "utf8")) as { version: string }).version;

  const { base, servidor } = await servirRaiz(opcoes.raiz, opcoes.divisao === "reserva");
  const nav: Browser = await chromium.launch({ headless: true });
  const resultados: ResultadoLinha[] = [];
  const gemeosExp = new Map(exp.gemeos.map((g) => [g.gemeo, g]));
  const t0 = Date.now();
  try {
    const porGemeo = new Map<string, Linha[]>();
    for (const l of linhas) porGemeo.set(l.gemeo, [...(porGemeo.get(l.gemeo) ?? []), l]);
    for (const [gemeo, ls] of porGemeo) {
      const g = gemeosExp.get(gemeo)!;
      if (sha256(readFileSync(join(opcoes.raiz, g.pagina.caminho))) !== g.pagina.sha256) throw new Error(`${gemeo}: bytes ≠ expectativa`);
      const url = base + g.pagina.caminho;
      const acoes = ls[0].entrada.acoes;
      // ------------------------------------------------ D1
      let fingerprint: string | undefined;
      if (ls[0].entrada.modo === "estado-inicial") fingerprint = (await scanPage({ url, actions: [], checks: ["page"] }, new PageScanCache(1), opcoesScan)).stateFingerprint;
      if (ls[0].entrada.modo === "evidencia-de") {
        const outro = gemeosExp.get(ls[0].entrada.de!)!;
        fingerprint = (await scanPage({ url: base + outro.pagina.caminho, actions: acoes, checks: ["page"] }, new PageScanCache(1), opcoesScan)).stateFingerprint;
      }
      const d1: Map<string, Veredito[]> = new Map();
      for (const l of ls) {
        const vs: Veredito[] = [];
        for (const a of l.alegacoes) {
          const finding = {
            id: "F-900",
            rule: { id: l.regra!.id, source: l.regra!.source, description: "alegação de controle (portão NAT-86)" },
            element: { locator: a.localizador, page: url },
            evidence: { observed: "alegação de controle", expected: "alegação de controle", data: a.dados ?? {} },
            severity: "serious", nature: "semantic", mode: "interaction", pathway: "heuristic",
          };
          const v = await verifyFinding({ finding, live: true, actions: acoes, ...(fingerprint ? { stateFingerprint: fingerprint } : {}), ...(kf ? { knowledgeFree: true } : {}) });
          vs.push({ tipo: a.tipo, ...(a.condicao ? { condicao: a.condicao } : {}), localizador: a.localizador, ...(a.dados ? { dados: a.dados } : {}),
            verdict: v.verdict, violation: v.checks?.violation, detalhe: String(v.detail ?? "").replace(/127\.0\.0\.1:\d+/g, "127.0.0.1:PORTA").slice(-400) });
        }
        d1.set(l.id, vs);
      }
      // ------------------------------------------------ D2 (só gêmeos de página; papéis de evidência não têm página própria)
      let d2: Map<string, { regra: string; localizador: string }[]> | null = null;
      if (!PAPEIS_DE_EVIDENCIA.has(g.papel)) {
        const scan = await scanPage({ url, actions: acoes }, new PageScanCache(1), opcoesScan);
        const achados = (scan.findings ?? []) as { rule: { id: string; source: string; implements?: string[] }; element: { locator: string } }[];
        d2 = new Map();
        const candidatos: { l: Linha; f: (typeof achados)[number] }[] = [];
        for (const l of ls) {
          const hs = hashes([l.norma]);
          const wm = /^(wcag|emag):(.+)$/.exec(l.norma);
          for (const f of achados) {
            const fh = hashes([f.rule.id, ...(f.rule.implements ?? [])]);
            const cruza = [...hs].some((h) => fh.has(h)) || (wm !== null && f.rule.source === wm[1] && f.rule.id === wm[2]);
            if (cruza) candidatos.push({ l, f });
          }
          d2.set(l.id, []);
        }
        if (candidatos.length) {
          const ctx = await nav.newContext({ viewport: janela, deviceScaleFactor: 1, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
          await ctx.route("**/*", (r) => (new URL(r.request().url()).origin === base ? r.continue() : r.abort()));
          const p = await ctx.newPage();
          await p.goto(url, { waitUntil: "load" });
          for (const passo of g.receita as Passo[]) await executarPasso(p, passo);
          await p.waitForTimeout(400);
          for (const { l, f } of candidatos) {
            const casa = await p.locator(l.localizador).evaluateAll(
              (els, sel) => { let alvo: Element[] = []; try { alvo = Array.from(document.querySelectorAll(sel)); } catch { return false; } return els.some((e) => alvo.some((a) => a === e || a.contains(e) || e.contains(a))); },
              f.element.locator,
            ).catch(() => false);
            if (casa) d2.get(l.id)!.push({ regra: f.rule.id, localizador: f.element.locator });
          }
          await ctx.close();
        }
      }
      for (const l of ls) {
        const vs = d1.get(l.id)!;
        const ach = d2?.get(l.id) ?? null;
        const e = kf ? expectativaKnowledgeFree(l, cap?.capacidade) : { esperadoD1: l.esperadoD1 as EsperadoD1, esperadoD2: l.esperadoD2 };
        resultados.push({
          id: l.id, gemeo: l.gemeo, familia: l.familia, classe: l.classe, esperado: l.esperado, norma: l.norma,
          esperadoD1: e.esperadoD1, d1: { veredictos: vs, julgamento: julgarD1(e.esperadoD1, vs) },
          esperadoD2: e.esperadoD2, d2: ach ? { achados: ach, julgamento: julgarD2(e.esperadoD2, ach.length) } : null,
        });
      }
      console.log(`${gemeo.padEnd(9)} ${ls.map((l) => resultados.find((r) => r.id === l.id)!).map((r) => `${r.d1.julgamento}${r.d2 ? "/" + r.d2.julgamento : ""}`).join(" ")}`);
    }
  } finally {
    await nav.close();
    await closeBrowser().catch(() => {});
    servidor.close();
  }

  // ------------------------------------------------ contagens
  const conta = (sel: (r: ResultadoLinha) => string | null) => {
    const t: Record<string, Record<string, number>> = {};
    for (const r of resultados) { const v = sel(r); if (v === null) continue; t[r.familia] ??= {}; t[r.familia][v] = (t[r.familia][v] ?? 0) + 1; t.total ??= {}; t.total[v] = (t.total[v] ?? 0) + 1; }
    return t;
  };
  // por célula: positivo implementado se alguma norma da célula é "confirmar"; TP se alguma linha confirma
  const celulas = new Map<string, ResultadoLinha[]>();
  for (const r of resultados) { const k = r.id.split("|").slice(0, 3).join("|"); celulas.set(k, [...(celulas.get(k) ?? []), r]); }
  const porCelula: Record<string, Record<string, number>> = {};
  for (const [k, rs] of celulas) {
    const fam = rs[0].familia;
    const conf = rs.some((r) => r.d1.veredictos.some((v) => v.verdict === "confirmed"));
    const impl = rs.some((r) => r.esperadoD1 === "confirmar");
    const exercitada = rs.some((r) => r.d1.veredictos.length > 0);
    const res = rs[0].classe === "positivo" ? (impl ? (conf ? "TP" : "FN") : conf ? "TP-fora-do-escopo" : "fora-do-escopo")
      : conf ? "FP" : !exercitada ? "nao-exercitado"
      : rs[0].classe === "negativo" ? "TN" : rs.every((r) => r.d1.julgamento !== "decidido") ? "preservado" : "decidido";
    for (const f of [fam, "total"]) { porCelula[f] ??= {}; porCelula[f][res] = (porCelula[f][res] ?? 0) + 1; }
  }
  const falhas = {
    bloqueantes: resultados.filter((r) => r.d1.julgamento === "FP" || r.d2?.julgamento === "FP").map((r) => ({ id: r.id, d1: r.d1.julgamento, d2: r.d2?.julgamento ?? null })),
    aceite: resultados.filter((r) => r.d1.julgamento === "FN" || r.d1.julgamento === "decidido" || r.d2?.julgamento === "FN").map((r) => ({ id: r.id, d1: r.d1.julgamento, d2: r.d2?.julgamento ?? null })),
  };
  const decisao = decidir(resultados);
  // NAT-61: no knowledge-free, qualquer tentativa de carregar a base de conhecimento bloqueia (trava por construção)
  const travaDepois = trava ? trava.knowledgeLockAttempts() : null;
  if (travaDepois && travaDepois.attempts > 0) {
    falhas.bloqueantes.push({ id: `trava-de-conhecimento (${travaDepois.attempts} tentativas: ${travaDepois.loaders.join(", ")})`, d1: "trava", d2: null });
    decisao.motivos.push(`trava de conhecimento: ${travaDepois.attempts} tentativa(s) de carregar a base no perfil knowledge-free (bloqueia)`);
    decisao.resultado = "no-go";
  }
  const resumo = {
    o_que_e: "NAT-86: detectores do validator sobre os controles, linha a linha da matriz congelada (sem modelo).",
    divisao: opcoes.divisao, perfil, janela,
    ...(kf ? { expectativa: "knowledge-free (derivada da matriz congelada: WCAG = evaluation; DS/e-MAG confirmar|nao-confirmar → nao-confirmavel-por-desenho; D2 detectar → informativo)",
      capacidade: cap ? { versao: cap.capacidade.versao, sha256: cap.sha256, naoConfirmavelPorDesenho: cap.capacidade.naoConfirmavelPorDesenho.map((x) => x.linha) } : null,
      travaDeConhecimento: travaDepois } : {}),
    matriz: { versao: matriz.versao, sha256: shaMatriz }, expectativasSha256: shaExp,
    validator: versaoValidator, node: process.version, chromium: nav.version(),
    linhas: resultados.length, alegacoes: resultados.reduce((s, r) => s + r.d1.veredictos.length, 0),
    d1PorLinha: conta((r) => r.d1.julgamento), d1PorCelula: porCelula, d2PorLinha: conta((r) => r.d2?.julgamento ?? null),
    falhas, decisao, segundos: Math.round((Date.now() - t0) / 1000),
  };
  const pasta = join(opcoes.saida, opcoes.carimbo, kf ? `${opcoes.divisao}-knowledge-free` : opcoes.divisao);
  gravar(join(pasta, "linhas.json"), json(resultados));
  gravar(join(pasta, "resumo.json"), json(resumo));
  const md = [`# Portão NAT-86 — ${opcoes.divisao} · perfil ${perfil} (${opcoes.carimbo})`, "", `matriz ${shaMatriz} · validator ${versaoValidator} · janela ${janelaTxt}${kf ? ` · trava ${travaDepois?.attempts ?? "?"} tentativas · ${cap?.capacidade.versao} (sha256 ${cap?.sha256.slice(0, 12)})` : ""}`, "",
    "| família | D1 por linha | D1 por célula | D2 por linha |", "|---|---|---|---|",
    ...Object.keys(resumo.d1PorLinha).sort().map((f) => `| ${f} | ${JSON.stringify(resumo.d1PorLinha[f])} | ${JSON.stringify(porCelula[f] ?? {})} | ${JSON.stringify(resumo.d2PorLinha[f] ?? {})} |`),
    "", `**${decisao.resultado.toUpperCase()}** — ${decisao.motivos.join("; ") || "sem falha"}`,
    `exercitadas (D1, linhas com alegação): ${JSON.stringify(decisao.exercitadas)}`,
    "", `bloqueantes: ${falhas.bloqueantes.length} · falhas de aceite: ${falhas.aceite.length}`, ...falhas.bloqueantes.map((f) => `- BLOQUEIA ${f.id} D1=${f.d1} D2=${f.d2}`), ...falhas.aceite.map((f) => `- ACEITE ${f.id} D1=${f.d1} D2=${f.d2}`), ""].join("\n");
  gravar(join(pasta, "tabela.md"), md);
  const arquivos: Record<string, string> = {};
  for (const n of readdirSync(pasta)) arquivos[n] = sha256(readFileSync(join(pasta, n)));
  gravar(join(pasta, "manifesto.json"), json({ carimbo: opcoes.carimbo, divisao: opcoes.divisao, perfil, arquivos }));
  console.log(`\n${md}\narquivado em ${barra(relative(process.cwd(), pasta))}`);
  return resumo;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("oraculo.ts")) {
  const divisao = arg("--divisao", "desenvolvimento") as Divisao;
  if (divisao !== "desenvolvimento" && divisao !== "reserva") throw new Error(`divisão desconhecida: ${divisao}`);
  rodar({
    divisao,
    matriz: resolve(arg("--matriz", join(PASTA_PORTAO, "matriz.json"))!),
    raiz: resolve(arg("--raiz", RAIZ_CORPUS_DIST)!),
    saida: resolve(arg("--saida", join(PASTA_PORTAO, "medicoes"))!),
    gemeos: arg("--gemeos")?.split(",") ?? null,
    carimbo: arg("--carimbo", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z")!,
    perfil: (() => { const p = arg("--perfil", "evaluation"); if (p !== "evaluation" && p !== "knowledge-free") throw new Error(`--perfil: evaluation | knowledge-free (${p})`); return p; })(),
    janela: arg("--janela", process.env.GOVBR_VALIDATOR_VIEWPORT || "1280x900")!,
    capacidade: resolve(arg("--capacidade", ARQUIVO_CAPACIDADE_KF)!),
  }).then((r) => { if (r.falhas.bloqueantes.length) process.exitCode = 2; else if (r.decisao.resultado !== "go") process.exitCode = 3; })
    .catch((e) => { console.error(e instanceof Error ? e.stack : e); process.exitCode = 1; });
}
