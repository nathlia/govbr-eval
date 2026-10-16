/**
 * Comparador L — Stylelint normativo (plano NAT-76 §3, §5, §6).
 *
 * Controles: lê o HTML da página (blocos <style> e style="") e a folha do site `biblioteca.css`;
 * NUNCA o core.min.css do DS nem o fontawesome (entregues pelo DS/fornecedor, D-52/R5). Telas: as
 * folhas citadas pela página de entrada nos bytes congelados do govbr-telas, menos fontes/ícones de
 * fornecedor; cada achado recebe origem `ds` ou `pagina`.
 *
 * Atribuição: o seletor da regra CSS do achado, reduzido ao sujeito estático, e o sujeito da
 * célula/âncora da spec são resolvidos pelo resolvedor único (`scripts/anchors.ts`) nos mesmos
 * estados; mesma chave de elemento → atribuído; atribuído + norma cruzada → creditado.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import stylelint from "stylelint";
import postcss, { type Document, type Root, type ChildNode, type Rule } from "postcss";
import postcssHtml from "postcss-html";
import valueParser from "postcss-value-parser";
import { normalizarCor } from "./lint/cores.mjs";
import { chromium, type Browser } from "playwright";
import { config, classificar, hashDaConfiguracao } from "./lint/config.mjs";
import { resolveOnPage, resolveStatesOnPage, openPage } from "../scripts/anchors";
import type { FlowGroundTruth } from "../types";
import {
  RAIZ_EVAL, RAIZ_TCC, sha256, barra, classeDoEsperado, normasCruzam, reduzirSeletor, normalizarSeletorParaOrigem,
  seletorDoSujeito, servir, novoContexto, executarReceita, trocasTocamCss, PAPEIS_DE_EVIDENCIA,
  type Gemeo, type Expectativas,
} from "./comum";

const exigir = createRequire(import.meta.url);
export const VERSOES_LINT = {
  stylelint: (exigir("stylelint/package.json") as { version: string }).version,
  "postcss-html": (exigir("postcss-html/package.json") as { version: string }).version,
  postcss: (exigir("postcss/package.json") as { version: string }).version,
};

export interface Achado {
  id: string;
  regraId: string; // N1..N3, H1..H7, ou "?" se a regra não está na tabela (nunca deveria)
  regra: string;
  perfil: "normativo" | "higiene" | "?";
  normas: string[];
  arquivo: string;
  linha: number;
  coluna: number;
  seletor: string | null;
  propriedade: string | null;
  valor: string | null;
  texto: string;
  origem: "pagina" | "site" | "ds";
  /** Telas, achado de origem DS com valor: o valor normalizado é um dos que o DS declara para o mesmo (seletor, propriedade)? (D8) */
  valorConfereComDs?: boolean | null;
}

// ------------------------------------------------------------------ localizar o nó do aviso
function contem(n: ChildNode, linha: number, coluna: number) {
  const a = n.source?.start, b = n.source?.end;
  if (!a || !b) return false;
  const depoisDoInicio = linha > a.line || (linha === a.line && coluna >= a.column);
  const antesDoFim = linha < b.line || (linha === b.line && coluna <= b.column);
  return depoisDoInicio && antesDoFim;
}

function seletorDe(n: ChildNode): string | null {
  let p: { type: string; parent?: unknown; selector?: string } | undefined = n.type === "rule" ? n : (n.parent as never);
  while (p && p.type !== "rule") p = p.parent as never;
  return p && p.type === "rule" ? (p as Rule).selector : null;
}

function localizar(raiz: Root | Document, linha: number, coluna: number): { seletor: string | null; propriedade: string | null; valor: string | null } {
  let decl: ChildNode | null = null;
  let regra: Rule | null = null;
  raiz.walk((n) => {
    if (!contem(n, linha, coluna)) return;
    if (n.type === "decl") decl = n;
    else if (n.type === "rule") regra = n; // walk desce: o mais interno fica por último
  });
  const d = decl as ChildNode | null;
  if (d && d.type === "decl") return { seletor: seletorDe(d), propriedade: d.prop, valor: d.value };
  const r = regra as Rule | null;
  if (r) return { seletor: r.selector, propriedade: null, valor: null };
  return { seletor: null, propriedade: null, valor: null };
}

/** Roda a configuração congelada sobre um texto e devolve os achados localizados. */
export async function lintar(codigo: string, arquivo: string, ehHtml: boolean, origem: Achado["origem"]): Promise<Achado[]> {
  const r = await stylelint.lint({ code: codigo, codeFilename: arquivo, config: ehHtml ? { ...config, customSyntax: "postcss-html" } : config });
  const res = r.results[0];
  if (res.parseErrors?.length) throw new Error(`${arquivo}: erro de análise ${JSON.stringify(res.parseErrors)}`);
  const arvore = ehHtml ? postcssHtml.parse(codigo, { from: arquivo }) : postcss.parse(codigo, { from: arquivo });
  const achados: Achado[] = res.warnings
    .filter((w) => w.severity === "error" || w.severity === "warning")
    .map((w) => {
      const loc = localizar(arvore, w.line, w.column);
      const meta = classificar(w.rule, loc.propriedade);
      return {
        id: "",
        regraId: meta?.id ?? "?",
        regra: w.rule,
        perfil: meta?.perfil ?? "?",
        normas: meta?.normas ?? [],
        arquivo,
        linha: w.line,
        coluna: w.column,
        ...loc,
        texto: w.text,
        origem,
      };
    });
  achados.sort((a, b) => a.linha - b.linha || a.coluna - b.coluna || a.regra.localeCompare(b.regra) || a.texto.localeCompare(b.texto));
  return achados;
}

const numerar = (lista: Achado[]) => lista.map((a, i) => ({ ...a, id: `L-${String(i + 1).padStart(3, "0")}` }));

// ------------------------------------------------------------------ controles
export interface ResultadoCelula {
  sujeito: string;
  normas: string[];
  esperado: string;
  classe: "positivo" | "negativo" | "aparte";
  resultado: "TP" | "FN" | "FP" | "TN" | "aparte" | "referencia";
  foraDeAlcance?: string;
  /** V: resultado pela regra de caixa congelada no §4, antes do D1 (só para auditar o D1). */
  resultadoSemD1?: "TP" | "FN" | "FP" | "TN" | "aparte" | "referencia";
  /** Marca mecânica (V): a mudança controlada é toda em contexto ARIA. */
  marca?: string;
  sujeitoResolvido: boolean;
  atribuidos: string[];
  creditados: string[];
}

export interface RegistroLintGemeo {
  comparador: "lint";
  gemeo: string;
  caso: string;
  familia: string;
  papel: string;
  foraDeAlcance: string | null;
  pagina: { caminho: string; sha256: string } | null;
  arquivos: { caminho: string; sha256: string; papel: "pagina" | "site" }[];
  configSha256: string;
  achados: Achado[];
  resolucao: { ponto: string; sujeitos: Record<string, string[]>; achados: Record<string, string[]> }[];
  celulas: ResultadoCelula[];
  alcance: { mudancaTocaCss: boolean; categoria: AlcanceLint };
  sinalizada: boolean;
}

export type AlcanceLint = "toca-css" | "nao-toca-css" | "sem-mudanca-declarada";

/**
 * Por caso (plano §6): alguma troca declarada (de qualquer gêmeo do caso) toca CSS da página-par?
 * Caso sem troca nenhuma (T-01: só a origem muda) fica `sem-mudanca-declarada` — não há o que medir,
 * e isso não é o mesmo que "medido e fora de alcance" (M4 da revisão).
 */
export function alcancePorCaso(exp: Expectativas, lerPagina: (caminho: string) => string): Map<string, AlcanceLint> {
  const m = new Map<string, AlcanceLint>();
  for (const g of exp.gemeos) {
    if (!m.has(g.caso)) m.set(g.caso, "sem-mudanca-declarada");
    const d = g.derivacao;
    if (!d || d.trocas.length + d.trocasJs.length === 0) continue;
    if (m.get(g.caso) === "sem-mudanca-declarada") m.set(g.caso, "nao-toca-css");
    if (d.trocas.length && trocasTocamCss(lerPagina(d.paginaDe), d.trocas)) m.set(g.caso, "toca-css");
  }
  return m;
}

export const MOTIVO_SEM_MUDANCA = "sem mudança declarada no caso";

export async function lintControles(
  exp: Expectativas,
  raizSite: string,
  tempos: Record<string, number>,
): Promise<RegistroLintGemeo[]> {
  const configSha256 = hashDaConfiguracao();
  const lerPagina = (c: string) => readFileSync(join(raizSite, c)).toString("utf8");
  const alcance = alcancePorCaso(exp, lerPagina);
  const SITE = "/controles/recursos/biblioteca.css";
  const siteBytes = readFileSync(join(raizSite, SITE));
  const achadosSite = await lintar(siteBytes.toString("utf8"), SITE, false, "site");
  const cache = new Map<string, Achado[]>();
  const servidor = await servir(raizSite);
  const navegador: Browser = await chromium.launch({ headless: true });
  const saida: RegistroLintGemeo[] = [];
  try {
    for (const g of exp.gemeos) {
      const t0 = Date.now();
      const base: Omit<RegistroLintGemeo, "achados" | "resolucao" | "celulas" | "sinalizada" | "pagina" | "arquivos" | "foraDeAlcance"> = {
        comparador: "lint", gemeo: g.gemeo, caso: g.caso, familia: g.familia, papel: g.papel, configSha256,
        alcance: { mudancaTocaCss: alcance.get(g.caso) === "toca-css", categoria: alcance.get(g.caso) ?? "sem-mudanca-declarada" },
      };
      if (PAPEIS_DE_EVIDENCIA.has(g.papel)) {
        saida.push({
          ...base, foraDeAlcance: "papel de evidência: o que muda é o pacote, que o lint não lê", pagina: null, arquivos: [], achados: [], resolucao: [],
          celulas: g.celulas.map((c) => ({ sujeito: c.sujeito, normas: c.normas, esperado: c.esperado, classe: classeDoEsperado(c.esperado), resultado: classeDoEsperado(c.esperado) === "positivo" ? "FN" : "aparte", foraDeAlcance: "papel de evidência", sujeitoResolvido: false, atribuidos: [], creditados: [] })),
          sinalizada: false,
        });
        continue;
      }
      const html = readFileSync(join(raizSite, g.pagina.caminho));
      if (sha256(html) !== g.pagina.sha256) throw new Error(`${g.gemeo}: sha256 da página difere da expectativa`);
      if (!cache.has(g.pagina.caminho)) cache.set(g.pagina.caminho, await lintar(html.toString("utf8"), g.pagina.caminho, true, "pagina"));
      const achados = numerar([...cache.get(g.pagina.caminho)!, ...achadosSite]);

      // resolução nos pontos da receita
      const seletoresDosAchados = new Map(achados.map((a) => [a.id, a.seletor ? reduzirSeletor(a.seletor) : []]));
      const { contexto } = await novoContexto(navegador, servidor.base, g.viewport, g.toque);
      const pagina = await contexto.newPage();
      await pagina.goto(servidor.base + g.pagina.caminho, { waitUntil: "load" });
      await pagina.evaluate(() => document.fonts.ready);
      const resolucao: RegistroLintGemeo["resolucao"] = [];
      let indice = 0;
      await executarReceita(pagina, g.receita, async (ponto) => {
        const sujeitos: Record<string, string | null> = {};
        for (const c of g.celulas) if (!(c.sujeito in sujeitos)) sujeitos[c.sujeito] = await seletorDoSujeito(pagina, c.sujeito, indice++);
        const todos = [...new Set([...[...seletoresDosAchados.values()].flat(), ...Object.values(sujeitos).filter((s): s is string => !!s)])];
        const { bySelector } = await resolveOnPage(pagina, todos);
        const chaves = (s: string) => bySelector.get(s)?.keys ?? [];
        resolucao.push({
          ponto,
          sujeitos: Object.fromEntries(Object.entries(sujeitos).map(([k, s]) => [k, s ? chaves(s) : []])),
          achados: Object.fromEntries([...seletoresDosAchados].map(([id, sels]) => [id, [...new Set(sels.flatMap(chaves))].sort()])),
        });
        // marca de sujeito por texto é retirada para não vazar ao próximo ponto
        await pagina.evaluate(() => document.querySelectorAll("*").forEach((el) => Array.from(el.attributes).forEach((a) => a.name.startsWith("data-comparador-sujeito-") && el.removeAttribute(a.name))));
      });
      await contexto.close();

      const celulas: ResultadoCelula[] = g.celulas.map((c) => {
        const classe = classeDoEsperado(c.esperado);
        const resolvido = resolucao.some((r) => (r.sujeitos[c.sujeito] ?? []).length > 0);
        const atribuidos = achados.filter((a) => resolucao.some((r) => (r.achados[a.id] ?? []).some((k) => (r.sujeitos[c.sujeito] ?? []).includes(k)))).map((a) => a.id);
        const creditados = achados.filter((a) => a.perfil === "normativo" && atribuidos.includes(a.id) && normasCruzam(a.normas, c.normas)).map((a) => a.id);
        let resultado: ResultadoCelula["resultado"];
        if (classe === "positivo") resultado = creditados.length ? "TP" : "FN";
        else if (classe === "negativo") resultado = creditados.length ? "FP" : "TN";
        else resultado = "aparte";
        const fora = resultado !== "FN" || base.alcance.mudancaTocaCss ? undefined : base.alcance.categoria === "sem-mudanca-declarada" ? MOTIVO_SEM_MUDANCA : "a mudança controlada não toca CSS";
        return { sujeito: c.sujeito, normas: c.normas, esperado: c.esperado, classe, resultado, ...(fora ? { foraDeAlcance: fora } : {}), sujeitoResolvido: resolvido, atribuidos, creditados };
      });
      saida.push({
        ...base,
        foraDeAlcance: null,
        pagina: { caminho: g.pagina.caminho, sha256: g.pagina.sha256 },
        arquivos: [
          { caminho: g.pagina.caminho, sha256: g.pagina.sha256, papel: "pagina" },
          { caminho: SITE, sha256: sha256(siteBytes), papel: "site" },
        ],
        achados,
        resolucao,
        celulas,
        sinalizada: achados.some((a) => a.perfil === "normativo"),
      });
      tempos[`lint/${g.gemeo}`] = (Date.now() - t0) / 1000;
      console.log(`lint  ${g.gemeo.padEnd(9)} ${achados.filter((a) => a.perfil === "normativo").length} normativo(s), ${achados.filter((a) => a.perfil === "higiene").length} higiene · ${celulas.map((c) => c.resultado).join(",")}`);
    }
  } finally {
    await navegador.close();
    await servidor.fechar();
  }
  return saida;
}

// ------------------------------------------------------------------ telas (bytes do govbr-telas)
export const SITE_TELAS = join(RAIZ_TCC, "govbr-telas");

/** Folhas de fonte/ícone de fornecedor: fora do lint (plano §3.3). Decidido pelo conteúdo. */
export function ehFornecedor(texto: string): string | null {
  const cabeca = texto.slice(0, 400);
  if (/Font Awesome/i.test(cabeca)) return "Font Awesome";
  const semFontFace = texto.replace(/@font-face\s*\{[^}]*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (semFontFace === "" || semFontFace === '@charset "UTF-8";') return "só @font-face (fonte de fornecedor)";
  return null;
}

/** Pares (seletor normalizado, propriedade) declarados no core.min.css do DS (plano §3.3). */
export function chavesDoDs(cssDs: string): Set<string> {
  const s = new Set<string>();
  postcss.parse(cssDs).walkDecls((d) => {
    const sel = seletorDe(d);
    if (!sel) return;
    for (const n of normalizarSeletorParaOrigem(sel)) s.add(n + "\u0000" + d.prop.toLowerCase());
  });
  return s;
}

/**
 * Valor normalizado para auditar o D8: minúsculas, espaços colapsados, toda cor literal (inclusive
 * `transparent`) na forma #rrggbb[aa], zero à esquerda de decimal retirado, unidade de zero retirada.
 */
export function normalizarValor(v: string, propriedade = ""): string {
  const arvore = valueParser(v.trim().toLowerCase());
  arvore.walk((n) => {
    if (n.type === "function" && /^(rgba?|hsla?)$/.test(n.value)) {
      const c = normalizarCor(valueParser.stringify(n));
      if (c) Object.assign(n, { type: "word", value: c, nodes: [] });
      return false;
    }
    if (n.type === "word") {
      const c = n.value === "transparent" ? "#00000000" : n.value.startsWith("#") || /^[a-z]+$/.test(n.value) ? normalizarCor(n.value) : null;
      if (c) n.value = c;
      else n.value = n.value.replace(/^(-?)0\./, "$1.").replace(/^0(px|em|rem|%)$/, "0");
    }
    if (n.type === "space") n.value = " ";
    if (n.type === "div") { n.before = ""; n.after = ""; }
    return undefined;
  });
  const texto = valueParser.stringify(arvore.nodes);
  // box-shadow: o minificador tira o desfoque zero ("1px 0 0 #c" → "1px 0 #c"); a sombra é a mesma
  if (/box-shadow$/i.test(propriedade)) return texto.split(",").map((s) => s.trim().replace(/^((?:inset )?\S+ \S+) 0 (#[0-9a-f]+)$/, "$1 $2")).join(",");
  return texto;
}

/** Valores normalizados que o DS declara por (seletor normalizado, propriedade). */
export function valoresDoDs(cssDs: string): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  postcss.parse(cssDs).walkDecls((d) => {
    const sel = seletorDe(d);
    if (!sel) return;
    for (const n of normalizarSeletorParaOrigem(sel)) {
      const k = n + "\u0000" + d.prop.toLowerCase();
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(normalizarValor(d.value, d.prop));
    }
  });
  return m;
}

export function valorConfere(a: Achado, valores: Map<string, Set<string>>): boolean | null {
  if (a.origem !== "ds" || !a.seletor || !a.propriedade || a.valor === null) return null;
  const v = normalizarValor(a.valor, a.propriedade);
  return normalizarSeletorParaOrigem(a.seletor).every((n) => valores.get(n + "\u0000" + a.propriedade!.toLowerCase())?.has(v));
}

/**
 * Biblioteca embutida de um achado da tela, pelo prefixo do seletor (heurística declarada, L7):
 * só descreve; não muda a origem nem o crédito.
 */
export function bibliotecaDoSeletor(sel: string | null): string {
  if (!sel) return "sem seletor";
  if (/\.note-/.test(sel)) return "Summernote";
  if (/swal/.test(sel)) return "SweetAlert2";
  if (/flatpickr/.test(sel)) return "flatpickr";
  if (/ng-select|\.ng-option|\.ng-dropdown/.test(sel)) return "ng-select";
  if (/toast/.test(sel)) return "toast";
  return "aplicação/outros";
}

/**
 * Origem de um achado. Achado de declaração: o par (seletor, propriedade) existe no DS. Achado de
 * regra (N3, que aponta o bloco): a declaração que ele acusa é `outline`, então o par é
 * (seletor, outline).
 */
export function origemDoAchado(a: Achado, ds: Set<string>): "ds" | "pagina" {
  if (!a.seletor) return "pagina";
  const prop = a.propriedade ?? (a.regraId === "N3" ? "outline" : null);
  if (!prop) return "pagina";
  const sels = normalizarSeletorParaOrigem(a.seletor);
  return sels.length > 0 && sels.every((n) => ds.has(n + "\u0000" + prop.toLowerCase())) ? "ds" : "pagina";
}

export interface RegistroLintTela {
  comparador: "lint";
  tela: string;
  site: { item: string; sha256: string };
  entrada: string;
  referencia: { arquivo: string; versao: string };
  configSha256: string;
  dsDeOrigem: { pacote: string; sha256: string };
  arquivos: { caminho: string; sha256: string; lido: boolean; motivo?: string }[];
  foraDeAlcance: string[];
  achados: Achado[];
  contagem: {
    normativoPagina: number; normativoDs: number; higienePagina: number; higieneDs: number;
    /** D8: normativos classificados DS cujo valor normalizado NÃO está entre os do DS (null = sem valor, N3). */
    normativoDsValorDiferente: number; normativoDsSemValor: number;
    /** L7: normativos de origem página por biblioteca embutida (heurística por seletor). */
    normativoPaginaPorBiblioteca: Record<string, number>;
  };
  resolucao: { estado: string; achados: Record<string, string[]>; specs: Record<string, string[]> }[];
  specs: { id: string; estado: string; regras: string[]; atribuidos: string[]; creditados: string[] }[];
}

const TELAS: Record<string, { entrada: string; referencia: string; ds: string; foraDeAlcance: string[] }> = {
  solicitacao: {
    entrada: "solicitacao.html",
    referencia: "ground-truth-solicitacao.json",
    ds: join(RAIZ_TCC, "govbr-corpus/node_modules/@govbr-ds/core"),
    foraDeAlcance: ["estilo inline do React (style={{}}) vai no JS, não numa folha", "regressão visual: não há build conforme anterior à injeção (plano §7)"],
  },
  vistorias: {
    entrada: "pnip/index.html",
    referencia: "ground-truth-vistorias.json",
    ds: join(RAIZ_TCC, "pnip-mock/node_modules/@govbr-ds/core"),
    foraDeAlcance: ["estilos de componente do Angular vão como texto dentro dos chunks JS: não são folha servida (sem fonte: sources vazio)", "regressão visual: aplicação real sem versão conforme (plano §7)"],
  },
};

export async function lintTela(nome: string, tempos: Record<string, number>): Promise<RegistroLintTela> {
  const t0 = Date.now();
  const def = TELAS[nome];
  if (!def) throw new Error(`tela desconhecida: ${nome}`);
  const manifesto = JSON.parse(readFileSync(join(SITE_TELAS, "site-manifest.json"), "utf8"));
  const raiz = join(SITE_TELAS, "site");
  const ref = JSON.parse(readFileSync(join(RAIZ_EVAL, def.referencia), "utf8")) as FlowGroundTruth & { _meta: { version: string; states: { id: string; afterStep: number; path?: string }[] } };
  const dsPkg = JSON.parse(readFileSync(join(def.ds, "package.json"), "utf8")) as { version: string };
  const dsCss = readFileSync(join(def.ds, "dist/core.min.css"));
  const ds = chavesDoDs(dsCss.toString("utf8"));
  const dsValores = valoresDoDs(dsCss.toString("utf8"));

  // folhas citadas pela entrada (+ blocos <style>)
  const entradaHtml = readFileSync(join(raiz, def.entrada), "utf8");
  const dirEntrada = def.entrada.includes("/") ? def.entrada.slice(0, def.entrada.lastIndexOf("/") + 1) : "";
  const hrefs = [...new Set([...entradaHtml.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0].match(/href=["']([^"']+)["']/)![1]))];
  const arquivos: RegistroLintTela["arquivos"] = [];
  let achados: Achado[] = [];
  const hashDe = (p: string) => (manifesto.files as { path: string; sha256: string }[]).find((f) => f.path === p)?.sha256;
  for (const h of hrefs) {
    const p = h.startsWith("/") ? h.slice(1) : dirEntrada + h;
    const bytes = readFileSync(join(raiz, p));
    if (sha256(bytes) !== hashDe(p)) throw new Error(`${p} difere do site-manifest`);
    const fornecedor = ehFornecedor(bytes.toString("utf8"));
    arquivos.push({ caminho: p, sha256: sha256(bytes), lido: !fornecedor, ...(fornecedor ? { motivo: `fornecedor: ${fornecedor}` } : {}) });
    if (!fornecedor) achados.push(...(await lintar(bytes.toString("utf8"), p, false, "pagina")));
  }
  if (/<style\b/i.test(entradaHtml)) {
    arquivos.push({ caminho: def.entrada, sha256: sha256(Buffer.from(entradaHtml)), lido: true });
    achados.push(...(await lintar(entradaHtml, def.entrada, true, "pagina")));
  }
  achados = numerar(achados.map((a) => ({ ...a, origem: origemDoAchado(a, ds) }))).map((a) => ({ ...a, valorConfereComDs: valorConfere(a, dsValores) }));
  const daPagina = achados.filter((a) => a.origem === "pagina");

  // resolução nos estados da referência, com o setup dela (navegação incluída)
  const servidor = await servir(raiz, manifesto);
  const navegador = await chromium.launch({ headless: true });
  const resolucao: RegistroLintTela["resolucao"] = [];
  try {
    const vp = ref._meta.viewport ?? { width: 1280, height: 900 };
    const { contexto } = await novoContexto(navegador, servidor.base, vp);
    const pagina = await contexto.newPage();
    const url = servidor.base + "/" + ((ref._meta as { url: string }).url.replace(/^\//, "") || def.entrada);
    const selAchados = new Map(daPagina.map((a) => [a.id, a.seletor ? reduzirSeletor(a.seletor) : []]));
    const ancoras = [...new Set(ref.violations.map((v) => v.anchor))];
    const todos = [...new Set([...[...selAchados.values()].flat(), ...ancoras])];
    await openPage(pagina, url, { waitFor: ref._meta.waitFor });
    const est = await resolveStatesOnPage(pagina, url, todos, { setup: ref._meta.setup ?? [], states: ref._meta.states });
    for (const estado of est.order) {
      const r = est.byState.get(estado)!;
      const chaves = (s: string) => r.bySelector.get(s)?.keys ?? [];
      resolucao.push({
        estado,
        achados: Object.fromEntries([...selAchados].map(([id, sels]) => [id, [...new Set(sels.flatMap(chaves))].sort()])),
        specs: Object.fromEntries(ref.violations.map((v) => [v.id, chaves(v.anchor)])),
      });
    }
    await contexto.close();
  } finally {
    await navegador.close();
    await servidor.fechar();
  }
  const specs = ref.violations.map((v) => {
    const estados = resolucao.filter((r) => v.state === "sempre" || r.estado === v.state);
    const atribuidos = daPagina.filter((a) => estados.some((r) => (r.achados[a.id] ?? []).some((k) => (r.specs[v.id] ?? []).includes(k)))).map((a) => a.id);
    const creditados = daPagina.filter((a) => a.perfil === "normativo" && atribuidos.includes(a.id) && normasCruzam(a.normas, v.rules)).map((a) => a.id);
    return { id: v.id, estado: v.state ?? "sempre", regras: v.rules, atribuidos, creditados };
  });
  tempos[`lint/tela-${nome}`] = (Date.now() - t0) / 1000;
  const conta = (perfil: string, origem: string) => achados.filter((a) => a.perfil === perfil && a.origem === origem).length;
  return {
    comparador: "lint",
    tela: nome,
    site: { item: manifesto.item.id, sha256: manifesto.item.sha256 },
    entrada: def.entrada,
    referencia: { arquivo: def.referencia, versao: ref._meta.version },
    configSha256: hashDaConfiguracao(),
    dsDeOrigem: { pacote: `@govbr-ds/core ${dsPkg.version}`, sha256: sha256(dsCss) },
    arquivos,
    foraDeAlcance: def.foraDeAlcance,
    // os achados de origem DS ficam listados só por contagem e amostra curta: o arquivo traz todos os da página
    achados: [...daPagina, ...achados.filter((a) => a.origem === "ds").slice(0, 50)],
    contagem: {
      normativoPagina: conta("normativo", "pagina"), normativoDs: conta("normativo", "ds"), higienePagina: conta("higiene", "pagina"), higieneDs: conta("higiene", "ds"),
      normativoDsValorDiferente: achados.filter((a) => a.perfil === "normativo" && a.origem === "ds" && a.valorConfereComDs === false).length,
      normativoDsSemValor: achados.filter((a) => a.perfil === "normativo" && a.origem === "ds" && a.valorConfereComDs === null).length,
      normativoPaginaPorBiblioteca: Object.fromEntries(Object.entries(daPagina.filter((a) => a.perfil === "normativo").reduce<Record<string, number>>((m, a) => { const b = bibliotecaDoSeletor(a.seletor); m[b] = (m[b] ?? 0) + 1; return m; }, {})).sort()),
    },
    resolucao,
    specs,
  };
}

export const caminhoRelativo = (p: string) => barra(p);
