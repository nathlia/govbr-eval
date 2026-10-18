/**
 * NAT-86 — constrói a MATRIZ CONGELADA do portão sem modelo (plano §3).
 *
 *   npm run portao:matriz -- [--incluir-reserva] [--raiz ../govbr-corpus/dist] [--saida portao-nat86/matriz.json]
 *
 * Uma linha por (gêmeo × célula × norma), para desenvolvimento e, com `--incluir-reserva`, reserva.
 * Entram só: as expectativas do catálogo (escritas sem olhar os detectores, D-126), o CONTRATO
 * declarado do validator 2.13.0 (quais regras têm condição contextual, quais partes de anatomia cada
 * regra exige, ids da base literal — o que o agente também lê pelo `get_ds_rules`) e uma
 * pré-conferência em Playwright puro: quantos elementos o localizador derivado encontra no estado da
 * receita e quais mensagens com id ficaram visíveis com a última ação (candidatas a `errorMessage`).
 * Nenhum detector roda aqui (nem scanner, nem portão, nem axe).
 *
 * O resultado exigido por detector sai da classe do esperado do catálogo, nunca de uma execução:
 *   D1 (portão verify_finding): positivo com condição contextual → confirmar; positivo sem condição →
 *       fora do escopo implementado; conforme/não aplicável → nunca confirmar (FP bloqueia);
 *       unverifiable/unsupported → todas as alegações `unverifiable` (confirmar = FP; rejeitar =
 *       desconhecido virou decisão).
 *   D2 (scanner scan_page): célula negativa ou desconhecida → nenhum achado do scanner que case
 *       norma (hash de 12) + elemento; positivo com regra de anatomia (P2) → detectar; resto informativo.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { arg, barra, classeDoEsperado, gravar, json, sha256, PAPEIS_DE_EVIDENCIA } from "../comparadores/comum";
import {
  PASTA_PORTAO, RAIZ_CORPUS_DIST, RAIZ_EVAL, VALIDATOR_DIR, agePassos, derivarLocalizador, executarPasso, servirRaiz, traduzirReceita,
  type AcaoOraculo, type Passo,
} from "./comum";

export const VERSAO_MATRIZ = "portao-nat86-matriz-1.0.0";

interface Celula { sujeito: string; normas: string[]; esperado: string; nota?: string }
interface Gemeo {
  gemeo: string; caso: string; familia: string; papel: string; descricaoCatalogo: string; celulas: Celula[];
  pagina: { id: string; caminho: string; sha256: string }; viewport: { width: number; height: number }; toque: boolean; receita: Passo[];
}

/**
 * Localizadores DECLARADOS, por sujeito do catálogo, onde o texto do sujeito não é um seletor que a
 * página resolve (divergências catálogo × página do D-127 "para a NAT-86" e açúcares do catálogo
 * medidos na pré-conferência de desenvolvimento). A expectativa não muda; a alegação aponta para o
 * elemento que a página tem. Valem iguais para desenvolvimento e reserva.
 */
export const LOCALIZADORES_DECLARADOS: Record<string, { para: string; motivo: string }> = {
  ".br-message#aviso-fechado": { para: "#aviso-horario", motivo: "D-127: a página F2-06 usa #aviso-horario" },
  "modal#renovar-data": { para: "#renovar", motivo: "D-127: a página F3-02-Q usa #renovar" },
  "menu#principal": { para: "#menu-principal", motivo: "pré-conferência: o Menu da página tem id menu-principal (aria-controls do gatilho)" },
  "a.skip": { para: ".br-skiplink a", motivo: "pré-conferência: o salto é o link dentro de nav.br-skiplink (sem classe skip)" },
  "bib-campo-fechado::input": { para: "bib-campo", motivo: "pré-conferência: raiz FECHADA — de fora só o host bib-campo é alcançável, e é ele que uma alegação pode citar" },
};

export interface Alegacao { tipo: "generica" | "condicao"; condicao?: string; dados?: Record<string, unknown>; localizador: string }
export interface Linha {
  id: string; divisao: "desenvolvimento" | "reserva"; gemeo: string; caso: string; familia: string; papel: string;
  pagina: { caminho: string; sha256: string }; viewport: { width: number; height: number };
  celula: number; sujeito: string; normasCelula: string[]; norma: string; esperado: string; classe: "positivo" | "negativo" | "aparte";
  regra: { source: string; id: string } | null; implementadoD1: boolean; anatomia: boolean;
  localizador: string; localizadorOrigem: string; contagem: number | null;
  entrada: { modo: "receita" | "estado-inicial" | "evidencia-de" | "sem-passos-anteriores"; de?: string; acoes: AcaoOraculo[]; traduzivel: boolean; motivo: string | null };
  alegacoes: Alegacao[];
  esperadoD1: "confirmar" | "fora-do-escopo" | "nao-confirmar" | "so-unverifiable";
  esperadoD2: "detectar" | "nao-sinalizar" | "informativo";
}

// ------------------------------------------------------------------ contrato declarado do validator
async function contratoDoValidator() {
  const dist = pathToFileURL(join(VALIDATOR_DIR, "dist") + "/").href;
  const ctx = await import(dist + "verify/contextual.js");
  const pkg = JSON.parse(readFileSync(join(VALIDATOR_DIR, "package.json"), "utf8")) as { version: string };
  const versoes = join(VALIDATOR_DIR, "data", "knowledge", "versions");
  const literal = readdirSync(versoes).filter((v) => v.startsWith("3.7.0-literal")).sort().pop()!;
  const ids = readFileSync(join(versoes, literal, "normalized", "rules.jsonl"), "utf8").split("\n").filter(Boolean)
    .map((l) => (JSON.parse(l) as { id: string }).id);
  return {
    versao: pkg.version,
    base: literal,
    conditions: ctx.CONTEXT_CONDITIONS as { condition: string; check: string; family: string; rules: { source: string; id: string }[]; fields: string[] }[],
    anatomy: ctx.ANATOMY_PARTS as { component: string; part: string; rules: string[] }[],
    kbIds: ids,
  };
}
type Contrato = Awaited<ReturnType<typeof contratoDoValidator>>;

/** Norma do catálogo → regra citável (wcag/emag pelo número; ds:… pelo hash de 12 na base literal). */
function regraDe(norma: string, c: Contrato): { source: string; id: string } | null {
  const m = /^(wcag|emag):(\d+(?:\.\d+)*)$/.exec(norma);
  if (m) return { source: m[1], id: m[2] };
  const h = /^ds:[\w-]+-([0-9a-f]{12})$/.exec(norma);
  if (h) {
    const achados = c.kbIds.filter((id) => id.endsWith(`-${h[1]}`));
    if (achados.length === 1) return { source: "govbr-ds-kb", id: achados[0] };
  }
  return null;
}
const condicoesDe = (r: { source: string; id: string } | null, c: Contrato) =>
  r ? c.conditions.filter((k) => k.rules.some((x) => x.source === r.source && x.id === r.id)) : [];

// ------------------------------------------------------------------ pré-conferência (Playwright puro)
interface Pre { contagem: Record<string, number>; mensagens: string[]; raizes: Record<string, string | null> }

async function preConferir(nav: Browser, base: string, g: Gemeo, locs: string[], componentes: { loc: string; comp: string }[], passos: Passo[]): Promise<Pre> {
  const ctx = await nav.newContext({ viewport: g.viewport, deviceScaleFactor: 1, hasTouch: !!g.toque, isMobile: !!g.toque, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  await ctx.route("**/*", (r) => (new URL(r.request().url()).origin === base ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  await p.goto(base + g.pagina.caminho, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  // Texto (não função) para o esbuild do tsx não injetar __name no navegador.
  const visiveis = () => p.evaluate(`(() => {
    const out = {};
    const pilha = [document];
    while (pilha.length) {
      const raiz = pilha.pop();
      for (const el of Array.from(raiz.querySelectorAll("*"))) {
        if (el.id) {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          const texto = (el.innerText ?? el.textContent ?? "").trim();
          if (r.width > 0 && r.height > 0 && s.visibility !== "hidden" && texto) out[el.id] = texto;
        }
        if (el.shadowRoot) pilha.push(el.shadowRoot);
      }
    }
    return out;
  })()`) as Promise<Record<string, string>>;
  const age = agePassos(passos);
  let antes: Record<string, string> = await visiveis();
  for (let i = 0; i < passos.length; i++) {
    if (age.length && passos[i] === age[age.length - 1]) antes = await visiveis();
    await executarPasso(p, passos[i]);
  }
  await p.waitForTimeout(500);
  const depois = await visiveis();
  // Só a mais interna: um contêiner cujo texto mudou porque contém a mensagem não é "o texto de erro".
  const mudaram = Object.keys(depois).filter((id) => antes[id] !== depois[id]);
  const mensagens = (await p.evaluate(`((ids) => {
    const achar = (id) => { const pilha = [document]; while (pilha.length) { const r = pilha.pop(); const el = r.getElementById ? r.getElementById(id) : r.querySelector('#' + CSS.escape(id)); if (el) return el; for (const h of Array.from(r.querySelectorAll('*'))) if (h.shadowRoot) pilha.push(h.shadowRoot); } return null; };
    const els = ids.map((id) => [id, achar(id)]);
    return els.filter(([id, el]) => el && !els.some(([o, x]) => o !== id && x && el.contains(x))).map(([id]) => id);
  })(${JSON.stringify(mudaram)})`) as string[]).sort();
  const contagem: Record<string, number> = {};
  for (const l of locs) contagem[l] = await p.locator(l).count().catch(() => -1);
  const raizes: Record<string, string | null> = {};
  for (const { loc, comp } of componentes) {
    raizes[`${loc}|${comp}`] = await p.locator(loc).first().evaluate((el, comp) => {
      const cls = `br-${comp}`;
      const raiz = el.closest(`.${cls}`) ?? el.querySelector(`.${cls}`);
      if (!raiz) return null;
      if (raiz.id) return `#${raiz.id}`;
      return document.querySelectorAll(`.${cls}`).length === 1 ? `.${cls}` : null;
    }, comp).catch(() => null);
  }
  await ctx.close();
  return { contagem, mensagens, raizes };
}

// ------------------------------------------------------------------ construção
function lerGemeos(arquivo: string): { sha256: string; gemeos: Gemeo[] } {
  const bytes = readFileSync(arquivo);
  return { sha256: sha256(bytes), gemeos: (JSON.parse(bytes.toString("utf8")) as { gemeos: Gemeo[] }).gemeos };
}

function entradaDe(g: Gemeo, todos: Gemeo[]): { modo: Linha["entrada"]["modo"]; de?: string; passos: Passo[] } {
  if (g.papel === "estado-diferente") return { modo: "estado-inicial", passos: g.receita };
  if (g.papel === "evidencia-velha") {
    const de = /(?:build|traço do build) de ([A-Z]\d?-\d+-[A-Z])/.exec(g.descricaoCatalogo)?.[1];
    if (!de || !todos.some((o) => o.gemeo === de)) throw new Error(`${g.gemeo}: evidência velha sem gêmeo de origem legível na descrição`);
    return { modo: "evidencia-de", de, passos: g.receita };
  }
  if (g.papel === "dado-faltante") {
    const age = agePassos(g.receita);
    return { modo: "sem-passos-anteriores", passos: age.slice(-1) };
  }
  return { modo: "receita", passos: g.receita };
}

export async function construirMatriz(opcoes: { raiz: string; incluirReserva: boolean }) {
  const c = await contratoDoValidator();
  const divisoes: { divisao: Linha["divisao"]; arquivo: string }[] = [{ divisao: "desenvolvimento", arquivo: join(RAIZ_EVAL, "controles", "expectativas.json") }];
  if (opcoes.incluirReserva) divisoes.push({ divisao: "reserva", arquivo: join(RAIZ_EVAL, "controles", "reserva", "expectativas.json") });
  const { base, servidor } = await servirRaiz(opcoes.raiz, opcoes.incluirReserva);
  const nav = await chromium.launch({ headless: true });
  const linhas: Linha[] = [];
  const fontes: Record<string, string> = {};
  const preConferencia: Record<string, Pre & { entrada: string }> = {};
  try {
    for (const { divisao, arquivo } of divisoes) {
      const { sha256: shaExp, gemeos } = lerGemeos(arquivo);
      fontes[barra(relative(RAIZ_EVAL, arquivo))] = shaExp;
      for (const g of gemeos) {
        const bytes = readFileSync(join(opcoes.raiz, g.pagina.caminho));
        if (sha256(bytes) !== g.pagina.sha256) throw new Error(`${g.gemeo}: bytes servidos ≠ sha256 da expectativa`);
        const ent = entradaDe(g, gemeos);
        const trad = traduzirReceita(ent.passos);
        // localizadores e raízes de componente pedidos por esta página
        const porCelula = g.celulas.map((cel) => {
          const decl = LOCALIZADORES_DECLARADOS[cel.sujeito.replace(/@.*$/, "").trim()];
          return decl ? { loc: decl.para, origem: `declarado: ${decl.motivo}` } : { loc: derivarLocalizador(cel.sujeito), origem: "derivado" };
        });
        const comps: { loc: string; comp: string }[] = [];
        g.celulas.forEach((cel, i) => {
          for (const n of cel.normas) {
            for (const k of condicoesDe(regraDe(n, c), c)) {
              if (k.check === "anatomy-part") for (const a of c.anatomy.filter((a) => a.rules.includes(regraDe(n, c)!.id))) comps.push({ loc: porCelula[i].loc, comp: a.component });
              if (k.check === "current-crumb-not-link") comps.push({ loc: porCelula[i].loc, comp: "breadcrumb" });
            }
          }
        });
        // a pré-conferência roda a receita do PRÓPRIO gêmeo (o estado da expectativa), não a da entrada
        const pre = await preConferir(nav, base, g, [...new Set(porCelula.map((x) => x.loc))], comps, PAPEIS_DE_EVIDENCIA.has(g.papel) ? g.receita : ent.passos);
        preConferencia[`${divisao}/${g.gemeo}`] = { ...pre, entrada: ent.modo };
        g.celulas.forEach((cel, i) => {
          const { loc, origem } = porCelula[i];
          for (const norma of cel.normas) {
            const regra = regraDe(norma, c);
            const conds = condicoesDe(regra, c);
            const classe = classeDoEsperado(cel.esperado);
            const anatomia = conds.some((k) => k.family === "P2");
            const alegacoes: Alegacao[] = [];
            if (regra) alegacoes.push({ tipo: "generica", localizador: loc });
            for (const k of conds) {
              if (k.check === "anatomy-part") {
                for (const a of c.anatomy.filter((a) => a.rules.includes(regra!.id))) {
                  const raiz = pre.raizes[`${loc}|${a.component}`] ?? loc;
                  alegacoes.push({ tipo: "condicao", condicao: k.condition, dados: { expectedCondition: k.condition, component: a.component, part: a.part }, localizador: raiz });
                }
              } else if (k.check === "current-crumb-not-link") {
                alegacoes.push({ tipo: "condicao", condicao: k.condition, dados: { expectedCondition: k.condition }, localizador: pre.raizes[`${loc}|breadcrumb`] ?? loc });
              } else if (k.fields.includes("errorMessage")) {
                const cand = pre.mensagens.length ? pre.mensagens : [""];
                for (const m of cand) alegacoes.push({ tipo: "condicao", condicao: k.condition, dados: { expectedCondition: k.condition, errorMessage: m ? `#${m}` : "" }, localizador: loc });
              } else {
                alegacoes.push({ tipo: "condicao", condicao: k.condition, dados: { expectedCondition: k.condition }, localizador: loc });
              }
            }
            const esperadoD1: Linha["esperadoD1"] =
              classe === "positivo" ? (conds.length ? "confirmar" : "fora-do-escopo") : classe === "negativo" ? "nao-confirmar" : "so-unverifiable";
            const esperadoD2: Linha["esperadoD2"] =
              classe === "positivo" ? (anatomia ? "detectar" : "informativo") : "nao-sinalizar";
            linhas.push({
              id: `${divisao === "reserva" ? "R" : "D"}|${g.gemeo}|${i}|${norma}`,
              divisao, gemeo: g.gemeo, caso: g.caso, familia: g.familia, papel: g.papel,
              pagina: { caminho: g.pagina.caminho, sha256: g.pagina.sha256 }, viewport: g.viewport,
              celula: i, sujeito: cel.sujeito, normasCelula: cel.normas, norma, esperado: cel.esperado, classe,
              regra, implementadoD1: conds.length > 0, anatomia,
              localizador: loc, localizadorOrigem: origem, contagem: pre.contagem[loc] ?? null,
              entrada: { modo: ent.modo, ...(ent.de ? { de: ent.de } : {}), acoes: trad.acoes, traduzivel: trad.traduzivel, motivo: trad.motivo },
              alegacoes, esperadoD1, esperadoD2,
            });
          }
        });
      }
    }
  } finally {
    await nav.close();
    servidor.close();
  }
  return {
    versao: VERSAO_MATRIZ,
    o_que_e: "NAT-86: matriz finita do portão sem modelo — uma linha por gêmeo × célula × norma, com o resultado exigido por detector (plano §3).",
    plano: "thesis-workspace/planejamento/atual/plano-nat86-portao-sem-modelo-2026-10-18.md",
    fontes: { expectativas: fontes, validator: { versao: c.versao, baseConhecimento: c.base, contrato: "dist/verify/contextual.js (CONTEXT_CONDITIONS, ANATOMY_PARTS)" } },
    localizadoresDeclarados: LOCALIZADORES_DECLARADOS,
    preConferencia,
    linhas,
  };
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("matriz.ts")) {
  const saida = resolve(arg("--saida", join(PASTA_PORTAO, "matriz.json"))!);
  construirMatriz({ raiz: resolve(arg("--raiz", RAIZ_CORPUS_DIST)!), incluirReserva: process.argv.includes("--incluir-reserva") })
    .then((m) => {
      const texto = json(m);
      gravar(saida, texto);
      const por: Record<string, Record<string, number>> = {};
      for (const l of m.linhas) { const k = `${l.divisao}/${l.familia}`; por[k] ??= {}; por[k][l.esperadoD1] = (por[k][l.esperadoD1] ?? 0) + 1; }
      console.log(JSON.stringify(por, null, 1));
      const sem = m.linhas.filter((l) => l.contagem !== 1 && l.regra);
      console.log(`linhas ${m.linhas.length} · localizador ≠ 1 elemento em ${sem.length} linha(s) citáveis:`);
      for (const l of sem) console.log(`  ${l.id} → ${l.localizador} = ${l.contagem}`);
      console.log(`${barra(relative(process.cwd(), saida))} sha256 ${sha256(texto)}`);
    })
    .catch((e) => { console.error(e instanceof Error ? e.stack : e); process.exitCode = 1; });
}
