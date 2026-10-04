/**
 * Estatística pareada da campanha T7 (NAT-65, protocolo §4 com a revisão da NAT-64). Módulo puro,
 * sem I/O, testado por `npm run test:estatistica`.
 *
 * A unidade é o PAR: cada valor de `d` é D = confirmadas_com − confirmadas_sem de um par final e
 * elegível. Defeitos ou achados nunca entram aqui como repetições.
 *
 *   - teste principal: permutação exata por troca de sinal sobre a MÉDIA de D (todos os 2^n sinais,
 *     zeros incluídos — um zero vale 0 com qualquer sinal); p bicaudal = fração das atribuições com
 *     |média| ≥ |média observada|. n ≤ 20, senão erro. Testa a mesma quantidade que o IC;
 *   - robustez (secundária, rotulada): Wilcoxon de postos sinalizados com zeros à Pratt (os zeros
 *     entram no ranqueamento de |D| e saem da estatística) e postos médios nos empates, p exato pela
 *     enumeração dos sinais (sem aproximação normal); teste do sinal exato (zeros fora, contados);
 *   - IC 95% da média por bootstrap percentil sobre PARES, com gerador nomeado e semente gravada;
 *     indisponível (com motivo) se n < 5 ou se todos os D forem iguais.
 */
import { createHash } from "node:crypto";

export const ESTATISTICA_VERSAO = "estatistica-pareada-1.0.0";
export const MAX_N_EXATO = 20;
const EPS = 1e-9;

export const media = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Desvio-padrão amostral (n − 1); null com n < 2. */
export function desvioPadrao(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = media(xs)!;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

function exigirExato(n: number): void {
  if (n > MAX_N_EXATO) throw new Error(`enumeração exata só até n = ${MAX_N_EXATO} (n = ${n}); o protocolo não prevê aproximação`);
}

/** Soma de `valores` com o sinal de cada bit de `mascara` (bit 1 = negativo). */
function somaComSinais(valores: number[], mascara: number): number {
  let s = 0;
  for (let i = 0; i < valores.length; i++) s += (mascara >> i) & 1 ? -valores[i] : valores[i];
  return s;
}

export interface TestePermutacao { metodo: "permutacao-troca-de-sinal-exata"; n: number; atribuicoes: number; mediaObservada: number | null; p: number | null; nota: string | null }

/** Teste principal: troca de sinal exata sobre a média de D, bicaudal. */
export function testePermutacaoSinal(d: number[]): TestePermutacao {
  const base = { metodo: "permutacao-troca-de-sinal-exata" as const, n: d.length };
  if (!d.length) return { ...base, atribuicoes: 0, mediaObservada: null, p: null, nota: "sem pares" };
  exigirExato(d.length);
  const obs = Math.abs(d.reduce((a, b) => a + b, 0));
  const total = 2 ** d.length;
  if (d.every(x => x === 0)) return { ...base, atribuicoes: total, mediaObservada: 0, p: 1, nota: "todos os D = 0: sem diferença" };
  let extremos = 0;
  for (let m = 0; m < total; m++) if (Math.abs(somaComSinais(d, m)) >= obs - EPS) extremos++;
  return { ...base, atribuicoes: total, mediaObservada: media(d), p: extremos / total, nota: null };
}

/** Postos médios de `xs` (1 = menor), empates com a média dos postos. */
export function postosMedios(xs: number[]): number[] {
  const ordem = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const postos = new Array<number>(xs.length);
  for (let k = 0; k < ordem.length;) {
    let j = k;
    while (j + 1 < ordem.length && Math.abs(ordem[j + 1].v - ordem[k].v) < EPS) j++;
    const p = (k + 1 + j + 1) / 2;
    for (let t = k; t <= j; t++) postos[ordem[t].i] = p;
    k = j + 1;
  }
  return postos;
}

export interface TesteWilcoxon {
  metodo: "wilcoxon-postos-sinalizados-pratt-exato"; n: number; zeros: number; nNaoNulos: number;
  wMais: number | null; wMenos: number | null; p: number | null; nota: string | null;
}

/**
 * Wilcoxon de postos sinalizados, zeros à Pratt, postos médios, p exato bicaudal: fração das 2^k
 * atribuições de sinal aos k postos não nulos com |W+ − E| ≥ |W+obs − E|, E = (soma dos postos não nulos)/2.
 */
export function testeWilcoxon(d: number[]): TesteWilcoxon {
  const zeros = d.filter(x => x === 0).length;
  const base = { metodo: "wilcoxon-postos-sinalizados-pratt-exato" as const, n: d.length, zeros, nNaoNulos: d.length - zeros };
  if (!d.length) return { ...base, wMais: null, wMenos: null, p: null, nota: "sem pares" };
  exigirExato(d.length);
  const postos = postosMedios(d.map(Math.abs));
  const nz = d.map((x, i) => ({ x, r: postos[i] })).filter(o => o.x !== 0);
  if (!nz.length) return { ...base, wMais: 0, wMenos: 0, p: 1, nota: "todos os D = 0: sem diferença" };
  const wMais = nz.filter(o => o.x > 0).reduce((a, o) => a + o.r, 0);
  const wMenos = nz.filter(o => o.x < 0).reduce((a, o) => a + o.r, 0);
  const r = nz.map(o => o.r), soma = r.reduce((a, b) => a + b, 0), e = soma / 2;
  const obs = Math.abs(wMais - e);
  const total = 2 ** r.length;
  let extremos = 0;
  for (let m = 0; m < total; m++) {
    let w = 0;
    for (let i = 0; i < r.length; i++) if (!((m >> i) & 1)) w += r[i];
    if (Math.abs(w - e) >= obs - EPS) extremos++;
  }
  return { ...base, wMais, wMenos, p: extremos / total, nota: zeros ? `${zeros} par(es) com D = 0: ranqueados e fora da estatística (Pratt)` : null };
}

export interface TesteSinal { metodo: "sinal-exato"; positivos: number; negativos: number; zeros: number; p: number | null; nota: string | null }

const binom = (n: number, k: number): number => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };

/** Teste do sinal exato bicaudal (binomial 1/2), zeros fora e contados. */
export function testeSinal(d: number[]): TesteSinal {
  const positivos = d.filter(x => x > 0).length, negativos = d.filter(x => x < 0).length, zeros = d.length - positivos - negativos;
  const n = positivos + negativos;
  if (!n) return { metodo: "sinal-exato", positivos, negativos, zeros, p: d.length ? 1 : null, nota: d.length ? "todos os D = 0: sem diferença" : "sem pares" };
  const k = Math.min(positivos, negativos);
  let cauda = 0;
  for (let i = 0; i <= k; i++) cauda += binom(n, i);
  return { metodo: "sinal-exato", positivos, negativos, zeros, p: Math.min(1, (2 * cauda) / 2 ** n), nota: zeros ? `${zeros} par(es) com D = 0 fora do teste` : null };
}

/** mulberry32: gerador de 32 bits, determinístico, nomeado no resultado. */
export function mulberry32(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente de 32 bits derivada de um texto (ex.: o commit-semente da campanha): os 8 primeiros hex de sha256(texto|bootstrap). */
export const sementeDoTexto = (texto: string): number => parseInt(createHash("sha256").update(`${texto}|bootstrap`).digest("hex").slice(0, 8), 16);

/** Quantil tipo 7 (interpolação linear, o padrão do R) de uma lista ORDENADA. */
export function quantil(ordenada: number[], q: number): number {
  const h = (ordenada.length - 1) * q, lo = Math.floor(h);
  return lo + 1 < ordenada.length ? ordenada[lo] + (h - lo) * (ordenada[lo + 1] - ordenada[lo]) : ordenada[lo];
}

export interface IcBootstrap {
  metodo: "bootstrap-percentil-pares"; gerador: "mulberry32"; sementeOrigem: string; semente: number; reamostragens: number; nivel: 0.95;
  quantis: "tipo 7 (interpolação linear)"; disponivel: boolean; inferior: number | null; superior: number | null; motivo: string | null;
}

export const MIN_N_IC = 5;

/** IC 95% percentil da média de D, reamostrando pares com reposição. */
export function icBootstrapMedia(d: number[], sementeOrigem: string, reamostragens = 10_000): IcBootstrap {
  const semente = sementeDoTexto(sementeOrigem);
  const base = { metodo: "bootstrap-percentil-pares" as const, gerador: "mulberry32" as const, sementeOrigem, semente, reamostragens, nivel: 0.95 as const,
    quantis: "tipo 7 (interpolação linear)" as const };
  if (d.length < MIN_N_IC) return { ...base, disponivel: false, inferior: null, superior: null, motivo: `indisponível: n efetivo ${d.length} < ${MIN_N_IC}` };
  if (d.every(x => x === d[0])) return { ...base, disponivel: false, inferior: null, superior: null, motivo: "indisponível: todos os D iguais (sem variação para reamostrar)" };
  const rnd = mulberry32(semente), n = d.length, medias = new Array<number>(reamostragens);
  for (let b = 0; b < reamostragens; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)];
    medias[b] = s / n;
  }
  medias.sort((a, b) => a - b);
  return { ...base, disponivel: true, inferior: quantil(medias, 0.025), superior: quantil(medias, 0.975), motivo: null };
}

export type Leitura = "vantagem-com" | "vantagem-sem" | "sem-diferenca-detectavel" | "indisponivel";

export interface AnalisePareada {
  versao: typeof ESTATISTICA_VERSAO; n: number; d: number[];
  media: number | null; mediana: number | null; desvioPadrao: number | null;
  ic: IcBootstrap; principal: TestePermutacao; robustez: { wilcoxon: TesteWilcoxon; sinal: TesteSinal };
  /** Protocolo congelado §4: p < α e média de D > 0 → com; simétrico → sem; senão sem diferença detectável. */
  leitura: Leitura; alfa: number;
}

export function analisePareada(d: number[], sementeOrigem: string, o: { alfa?: number; reamostragens?: number } = {}): AnalisePareada {
  const alfa = o.alfa ?? 0.05;
  const principal = testePermutacaoSinal(d), m = media(d);
  const leitura: Leitura = principal.p === null || m === null ? "indisponivel"
    : principal.p < alfa && m > 0 ? "vantagem-com"
    : principal.p < alfa && m < 0 ? "vantagem-sem" : "sem-diferenca-detectavel";
  return { versao: ESTATISTICA_VERSAO, n: d.length, d: [...d], media: m, mediana: mediana(d), desvioPadrao: desvioPadrao(d),
    ic: icBootstrapMedia(d, sementeOrigem, o.reamostragens), principal, robustez: { wilcoxon: testeWilcoxon(d), sinal: testeSinal(d) }, leitura, alfa };
}
