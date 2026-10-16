/**
 * Comparador V — regressão visual contra o gêmeo conforme (plano NAT-76 §4, §5, §6).
 *
 * Referência = o gêmeo `-C` do caso, nunca captura do oráculo. Cada gêmeo comparado é renderizado
 * com a mesma receita; em cada ponto `capturar`/`recortar` a página inteira é capturada e comparada
 * com a da referência no ponto de mesmo nome (pixelmatch, threshold 0.1, includeAA false; decisão:
 * qualquer pixel diferente). Sem normalização: o piso de ruído é medido renderizando a referência
 * duas vezes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { chromium, type Browser } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  sha256, gravar, classeDoEsperado, seletorDoSujeito, servir, novoContexto, executarReceita, pontosDaReceita,
  trocasEmContextoAria, PAPEIS_DE_EVIDENCIA, type Gemeo, type Expectativas,
} from "./comum";
import type { ResultadoCelula } from "./lint";

const exigir = createRequire(import.meta.url);
export const VERSOES_VISUAL = {
  playwright: (exigir("playwright/package.json") as { version: string }).version,
  pixelmatch: (exigir("pixelmatch/package.json") as { version: string }).version,
  pngjs: (exigir("pngjs/package.json") as { version: string }).version,
};
export const PARAMETROS_VISUAL = {
  viewport: "o da expectativa do gêmeo (1280×900 em todo o desenvolvimento)",
  captura: { fullPage: true, animations: "disabled", caret: "hide", esperaAntesMs: 150 },
  pixelmatch: { threshold: 0.1, includeAA: false, diffMask: true },
  decisao: "pixelsDiferentes > 0 (maxDiffPixels = 0)",
  tamanhoDiferente: "estende as duas imagens até a união com magenta opaco; a área estendida conta como diferença",
  margemDoSujeitoPx: 8,
  normalizacao: "nenhuma",
};

const MARGEM = 8;

/**
 * Caixas (coordenadas da página) dos elementos de um seletor, atravessando raiz aberta com `>>>`.
 * Como TEXTO, pelo mesmo motivo do `IN_PAGE_PRELUDE` de anchors.ts: sob tsx, função nomeada passada
 * a `page.evaluate` chega ao navegador chamando `__name`, que lá não existe.
 */
const CAIXAS_NA_PAGINA = `function (s) {
  var lista = [];
  function andar(raiz, partes) {
    var cab = partes[0], resto = partes.slice(1);
    raiz.querySelectorAll(cab).forEach(function (el) {
      if (resto.length === 0) lista.push(el);
      else if (el.shadowRoot) andar(el.shadowRoot, resto);
    });
  }
  try { andar(document, s.split(">>>").map(function (x) { return x.trim(); })); } catch (e) { return []; }
  return lista.map(function (el) {
    var r = el.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  }).filter(function (r) { return r.width > 0 || r.height > 0; });
}`;
const COR_DIFF: [number, number, number] = [255, 0, 0];
const COR_AA: [number, number, number] = [255, 255, 0];

interface Caixa { x: number; y: number; width: number; height: number }
export interface Captura { png: Buffer; caixas: Record<string, Caixa[]> }

/** Renderiza um gêmeo e devolve, por ponto, a captura de página inteira e as caixas dos sujeitos. */
export async function capturarGemeo(navegador: Browser, base: string, g: Gemeo): Promise<Map<string, Captura>> {
  const { contexto } = await novoContexto(navegador, base, g.viewport, g.toque);
  const pagina = await contexto.newPage();
  await pagina.goto(base + g.pagina.caminho, { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);
  const saida = new Map<string, Captura>();
  let indice = 0;
  await executarReceita(pagina, g.receita, async (ponto) => {
    // pixels primeiro; só depois a marca de sujeito por texto toca o DOM
    const png = await pagina.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
    const caixas: Record<string, Caixa[]> = {};
    for (const c of g.celulas) {
      if (c.sujeito in caixas) continue;
      const sel = await seletorDoSujeito(pagina, c.sujeito, indice++);
      caixas[c.sujeito] = sel
        ? ((await pagina.evaluate(`(${CAIXAS_NA_PAGINA})(${JSON.stringify(sel)})`)) as Caixa[])
        : [];
    }
    await pagina.evaluate(() => document.querySelectorAll("*").forEach((el) => Array.from(el.attributes).forEach((a) => a.name.startsWith("data-comparador-sujeito-") && el.removeAttribute(a.name))));
    saida.set(ponto, { png, caixas });
  });
  await contexto.close();
  return saida;
}

function estender(p: PNG, w: number, h: number): PNG {
  if (p.width === w && p.height === h) return p;
  const n = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) n.data.set([255, 0, 255, 255], i * 4);
  for (let y = 0; y < p.height; y++) p.data.copy(n.data, y * w * 4, y * p.width * 4, (y + 1) * p.width * 4);
  return n;
}

export interface Comparacao {
  largura: number;
  altura: number;
  tamanhos: { gemeo: [number, number]; referencia: [number, number] };
  tamanhoDiferente: boolean;
  pixelsDiferentes: number;
  caixaDaDiferenca: Caixa | null;
  diffPng: Buffer | null;
  /** Pixels diferentes dentro da UNIÃO das caixas (aumentadas pela margem); cada pixel conta uma vez. */
  pixelsEm: (cs: Caixa[]) => number;
}

/** Compara duas capturas com os parâmetros congelados. */
export function comparar(a: Buffer, b: Buffer): Comparacao {
  const pa = PNG.sync.read(a), pb = PNG.sync.read(b);
  const w = Math.max(pa.width, pb.width), h = Math.max(pa.height, pb.height);
  const ea = estender(pa, w, h), eb = estender(pb, w, h);
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(ea.data, eb.data, diff.data, w, h, { threshold: 0.1, includeAA: false, diffMask: true, diffColor: COR_DIFF, aaColor: COR_AA });
  const ehDiff = (i: number) => diff.data[i * 4 + 3] > 0 && diff.data[i * 4] === 255 && diff.data[i * 4 + 1] === 0 && diff.data[i * 4 + 2] === 0;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  if (n > 0)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (ehDiff(y * w + x)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return {
    largura: w, altura: h,
    tamanhos: { gemeo: [pa.width, pa.height], referencia: [pb.width, pb.height] },
    tamanhoDiferente: pa.width !== pb.width || pa.height !== pb.height,
    pixelsDiferentes: n,
    caixaDaDiferenca: n > 0 ? { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 } : null,
    diffPng: n > 0 ? PNG.sync.write(diff) : null,
    pixelsEm: (cs: Caixa[]) => {
      const vistos = new Set<number>();
      for (const c of cs) {
        const xa = Math.max(0, Math.floor(c.x - MARGEM)), ya = Math.max(0, Math.floor(c.y - MARGEM));
        const xb = Math.min(w - 1, Math.ceil(c.x + c.width + MARGEM)), yb = Math.min(h - 1, Math.ceil(c.y + c.height + MARGEM));
        for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) if (ehDiff(y * w + x)) vistos.add(y * w + x);
      }
      return vistos.size;
    },
  };
}

export interface RegistroVisualGemeo {
  comparador: "visual";
  gemeo: string;
  caso: string;
  familia: string;
  papel: string;
  referencia: string | null;
  foraDeAlcance: string | null;
  pagina: { caminho: string; sha256: string };
  paginaReferencia: { caminho: string; sha256: string } | null;
  parametros: typeof PARAMETROS_VISUAL;
  pisoDeRuido: { ponto: string; pixels: number }[] | null;
  instavel: boolean;
  pontos: {
    ponto: string;
    png: { gemeo: string; referencia: string | null };
    tamanhos: Comparacao["tamanhos"] | null;
    tamanhoDiferente: boolean;
    pixelsDiferentes: number;
    caixaDaDiferenca: Caixa | null;
    diff: string | null;
    /** Pixels diferentes na união das caixas gêmeo ∪ referência (regra vigente, D1). */
    pixelsNoSujeito: Record<string, number>;
    /** Pixels pela regra congelada no §4, antes do D1: caixa do gêmeo; a da referência só se o sujeito não existe no gêmeo. */
    pixelsNoSujeitoSemD1: Record<string, number>;
    /** Caixas arquivadas por sujeito (coordenadas da página, sem a margem de 8 px), para auditar o D1. */
    caixas: Record<string, { gemeo: Caixa[]; referencia: Caixa[] }>;
  }[];
  marcaMecanica: { contextoAria: boolean };
  celulas: ResultadoCelula[];
  sinalizada: boolean;
}

/** Referência do caso: o gêmeo `-C` (plano §4). */
export function referenciaDoCaso(exp: Expectativas, caso: string): Gemeo | null {
  return exp.gemeos.find((g) => g.caso === caso && g.gemeo === `${caso}-C`) ?? null;
}

export async function visualControles(exp: Expectativas, raizSite: string, pastaSaida: string, tempos: Record<string, number>): Promise<RegistroVisualGemeo[]> {
  const servidor = await servir(raizSite);
  const navegador = await chromium.launch({ headless: true });
  const saida: RegistroVisualGemeo[] = [];
  const cacheRef = new Map<string, { a: Map<string, Captura>; piso: { ponto: string; pixels: number }[] }>();
  const confere = (g: Gemeo) => {
    if (sha256(readFileSync(join(raizSite, g.pagina.caminho))) !== g.pagina.sha256) throw new Error(`${g.gemeo}: sha256 da página difere da expectativa`);
  };
  const trocasDoCaso = (caso: string) => exp.gemeos.filter((x) => x.caso === caso && x.derivacao);
  try {
    for (const g of exp.gemeos) {
      const t0 = Date.now();
      confere(g);
      const ref = referenciaDoCaso(exp, g.caso);
      const ehRef = ref?.gemeo === g.gemeo;
      const derivs = trocasDoCaso(g.caso);
      const contextoAria = derivs.length > 0 && derivs.every((x) => trocasEmContextoAria(x.derivacao!.trocas, x.derivacao!.trocasJs));
      const base = {
        comparador: "visual" as const, gemeo: g.gemeo, caso: g.caso, familia: g.familia, papel: g.papel,
        pagina: { caminho: g.pagina.caminho, sha256: g.pagina.sha256 }, parametros: PARAMETROS_VISUAL, marcaMecanica: { contextoAria },
      };
      const celulasFora = (motivo: string): ResultadoCelula[] =>
        g.celulas.map((c) => ({ sujeito: c.sujeito, normas: c.normas, esperado: c.esperado, classe: classeDoEsperado(c.esperado), resultado: classeDoEsperado(c.esperado) === "positivo" ? "FN" : "aparte", foraDeAlcance: motivo, sujeitoResolvido: false, atribuidos: [], creditados: [] }));
      let fora: string | null = null;
      if (PAPEIS_DE_EVIDENCIA.has(g.papel)) fora = "papel de evidência: a página é a de outro gêmeo; o que muda é o pacote";
      else if (!ref) fora = "sem referência: o caso não tem gêmeo -C";
      else if (JSON.stringify(ref.receita) !== JSON.stringify(g.receita)) fora = "receita diferente da referência";
      else if (!ehRef && ref.pagina.caminho === g.pagina.caminho) fora = "mesma página da referência";

      // referência: duas renderizações → piso de ruído (uma vez por caso)
      if (ref && !cacheRef.has(ref.gemeo) && !PAPEIS_DE_EVIDENCIA.has(g.papel)) {
        confere(ref);
        const a = await capturarGemeo(navegador, servidor.base, ref);
        const b = await capturarGemeo(navegador, servidor.base, ref);
        const piso = [...a.keys()].map((p) => ({ ponto: p, pixels: comparar(a.get(p)!.png, b.get(p)!.png).pixelsDiferentes }));
        cacheRef.set(ref.gemeo, { a, piso });
        for (const [p, c] of a) gravar(join(pastaSaida, g.caso, `${ref.gemeo}__${p}.png`), c.png);
      }
      const r = ref ? cacheRef.get(ref.gemeo) : undefined;
      const piso = r?.piso ?? null;
      const instavel = !!piso?.some((p) => p.pixels > 0);

      if (fora) {
        saida.push({ ...base, referencia: ref?.gemeo ?? null, foraDeAlcance: fora, paginaReferencia: ref ? { caminho: ref.pagina.caminho, sha256: ref.pagina.sha256 } : null, pisoDeRuido: piso, instavel, pontos: [], celulas: celulasFora(fora), sinalizada: false });
        tempos[`visual/${g.gemeo}`] = (Date.now() - t0) / 1000;
        console.log(`visual ${g.gemeo.padEnd(9)} fora de alcance — ${fora}`);
        continue;
      }
      if (ehRef) {
        saida.push({
          ...base, referencia: g.gemeo, foraDeAlcance: null, paginaReferencia: { caminho: g.pagina.caminho, sha256: g.pagina.sha256 }, pisoDeRuido: piso, instavel,
          pontos: [...r!.a].map(([p, c]) => ({ ponto: p, png: { gemeo: sha256(c.png), referencia: sha256(c.png) }, tamanhos: null, tamanhoDiferente: false, pixelsDiferentes: 0, caixaDaDiferenca: null, diff: null, pixelsNoSujeito: {}, pixelsNoSujeitoSemD1: {}, caixas: Object.fromEntries(Object.entries(c.caixas).map(([s, cx]) => [s, { gemeo: cx, referencia: cx }])) })),
          celulas: g.celulas.map((c) => ({ sujeito: c.sujeito, normas: c.normas, esperado: c.esperado, classe: classeDoEsperado(c.esperado), resultado: "referencia", sujeitoResolvido: [...r!.a.values()].some((cap) => (cap.caixas[c.sujeito] ?? []).length > 0), atribuidos: [], creditados: [] })),
          sinalizada: false,
        });
        tempos[`visual/${g.gemeo}`] = (Date.now() - t0) / 1000;
        console.log(`visual ${g.gemeo.padEnd(9)} referência · piso ${piso!.map((p) => p.pixels).join(",")}`);
        continue;
      }
      const capt = await capturarGemeo(navegador, servidor.base, g);
      const pontos: RegistroVisualGemeo["pontos"] = [];
      const pixelsPorSujeito: Record<string, number> = {};
      const pixelsPorSujeitoSemD1: Record<string, number> = {};
      const resolvidos = new Set<string>();
      for (const ponto of pontosDaReceita(g.receita)) {
        const cg = capt.get(ponto)!;
        const cr = r!.a.get(ponto)!;
        const cmp = comparar(cg.png, cr.png);
        gravar(join(pastaSaida, g.caso, `${g.gemeo}__${ponto}.png`), cg.png);
        let diffArq: string | null = null;
        if (cmp.diffPng) {
          diffArq = `${g.caso}/${g.gemeo}__${ponto}__diff.png`;
          gravar(join(pastaSaida, diffArq), cmp.diffPng);
        }
        const noSujeito: Record<string, number> = {};
        const noSujeitoSemD1: Record<string, number> = {};
        const caixasArq: Record<string, { gemeo: Caixa[]; referencia: Caixa[] }> = {};
        for (const c of g.celulas) {
          if (c.sujeito in caixasArq) continue;
          const doGemeo = cg.caixas[c.sujeito] ?? [];
          const daRef = cr.caixas[c.sujeito] ?? [];
          caixasArq[c.sujeito] = { gemeo: doGemeo, referencia: daRef };
          // vigente (D1): união gêmeo ∪ referência — a parte que falta só tem lugar na referência
          const uniao = [...doGemeo, ...daRef];
          if (uniao.length) resolvidos.add(c.sujeito);
          noSujeito[c.sujeito] = cmp.pixelsEm(uniao);
          // congelada no §4 (sem D1): a do gêmeo; a da referência só se o sujeito não existe no gêmeo
          noSujeitoSemD1[c.sujeito] = cmp.pixelsEm(doGemeo.length ? doGemeo : daRef);
          pixelsPorSujeito[c.sujeito] = (pixelsPorSujeito[c.sujeito] ?? 0) + noSujeito[c.sujeito];
          pixelsPorSujeitoSemD1[c.sujeito] = (pixelsPorSujeitoSemD1[c.sujeito] ?? 0) + noSujeitoSemD1[c.sujeito];
        }
        pontos.push({
          ponto, png: { gemeo: sha256(cg.png), referencia: sha256(cr.png) }, tamanhos: cmp.tamanhos, tamanhoDiferente: cmp.tamanhoDiferente,
          pixelsDiferentes: cmp.pixelsDiferentes, caixaDaDiferenca: cmp.caixaDaDiferenca, diff: diffArq, pixelsNoSujeito: noSujeito, pixelsNoSujeitoSemD1: noSujeitoSemD1, caixas: caixasArq,
        });
      }
      const celulas: ResultadoCelula[] = g.celulas.map((c) => {
        const classe = classeDoEsperado(c.esperado);
        const decidir = (loc: boolean): ResultadoCelula["resultado"] =>
          classe === "positivo" ? (loc ? "TP" : "FN") : classe === "negativo" ? (loc ? "FP" : "TN") : "aparte";
        const resultado = decidir((pixelsPorSujeito[c.sujeito] ?? 0) > 0);
        const resultadoSemD1 = decidir((pixelsPorSujeitoSemD1[c.sujeito] ?? 0) > 0);
        const ids = pontos.filter((p) => (p.pixelsNoSujeito[c.sujeito] ?? 0) > 0).map((p) => p.ponto);
        const marca = resultado === "FN" && contextoAria ? "contexto-aria" : undefined;
        return { sujeito: c.sujeito, normas: c.normas, esperado: c.esperado, classe, resultado, resultadoSemD1, ...(marca ? { marca } : {}), sujeitoResolvido: resolvidos.has(c.sujeito), atribuidos: ids, creditados: ids };
      });
      saida.push({
        ...base, referencia: ref!.gemeo, foraDeAlcance: null, paginaReferencia: { caminho: ref!.pagina.caminho, sha256: ref!.pagina.sha256 }, pisoDeRuido: piso, instavel,
        pontos, celulas, sinalizada: pontos.some((p) => p.pixelsDiferentes > 0),
      });
      tempos[`visual/${g.gemeo}`] = (Date.now() - t0) / 1000;
      console.log(`visual ${g.gemeo.padEnd(9)} vs ${ref!.gemeo.padEnd(8)} ${pontos.map((p) => `${p.ponto}:${p.pixelsDiferentes}`).join(" ")} · ${celulas.map((c) => c.resultado).join(",")}`);
    }
  } finally {
    await navegador.close();
    await servidor.fechar();
  }
  return saida;
}
