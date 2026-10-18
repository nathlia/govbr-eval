/**
 * NAT-74 — reanálise retrospectiva das três campanhas formais sob a política normativa 1.2.0.
 * Peças comuns: caminhos, leitura do arquivo de resultados (só leitura), escrita determinística.
 *
 * Fora de SCORER_FILES de propósito: nada aqui muda o que um cartão diz nem como o scorer pontua.
 * Plano: thesis-workspace/planejamento/atual/plano-nat74-reanalise-2026-10-16.md.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SemanticPackage, SemanticReviews } from "../semantic-flow";

export const DERIVADO_VERSAO = "nat74-retrospectiva-1.0.0";
export const FORMATO_RESULTADO = "nat74-resultado-1.0.0";
export const POLITICA_PRINCIPAL = "politica-normativa-1.2.0";
export const POLITICA_SENSIBILIDADE = "politica-normativa-1.1.0";

const AQUI = dirname(fileURLToPath(import.meta.url));
/** Raiz do govbr-eval. */
export const EVAL = resolve(AQUI, "..", "..");
/** Raiz do projeto (pasta que contém os repositórios irmãos). */
export const TCC = resolve(EVAL, "..");
export const RESULTADOS = join(TCC, "govbr-resultados");
export const PLANEJAMENTO = join(TCC, "thesis-workspace", "planejamento", "atual");
export const NAT73 = join(PLANEJAMENTO, "nat73-politica-2026-10-13");
export const REVISAO_INTEGRADA = join(PLANEJAMENTO, "revisao-integrada-2026-10-13");
export const PLANO = join(PLANEJAMENTO, "plano-nat74-reanalise-2026-10-16.md");
/** Commit do arquivo de resultados em que a reanálise se apoia (plano §2). */
export const COMMIT_RESULTADOS = "b69857f";
export const CAMINHO_DERIVADO = "derivados/nat74-retrospectiva/1.0.0";
/**
 * Derivado 1.1.0: julgamentos da fila T3 (E14) + medidas da T2. Fixa as próprias entradas: o arquivo original no
 * commit `COMMIT_RESULTADOS` (fora de derivados/ nada mudou desde então), o derivado 1.0.0 no commit
 * `COMMIT_DERIVADO_100` (de onde vêm os pacotes 1.7.0 já preparados e a fila T3) e o sha256 dos julgamentos.
 */
export const DERIVADO_VERSAO_110 = "nat74-retrospectiva-1.1.0";
export const CAMINHO_DERIVADO_110 = "derivados/nat74-retrospectiva/1.1.0";
export const COMMIT_DERIVADO_100 = "da42f24";
/**
 * Derivado 1.2.0: scorer flow-semantic-1.8.0 (domínio de aplicabilidade provado; thesis decisoes 59019ac). Mesmas
 * entradas analíticas da 1.1.0 (julgamentos T3 da 1.0.0, medidas T2 da 1.1.0), fixadas também no commit da 1.1.0.
 */
export const DERIVADO_VERSAO_120 = "nat74-retrospectiva-1.2.0";
export const CAMINHO_DERIVADO_120 = "derivados/nat74-retrospectiva/1.2.0";
export const COMMIT_DERIVADO_110 = "dc3fa08";

/** Raiz da saída: o derivado no arquivo, ou outra pasta (segunda execução do teste de determinismo). */
export function raizSaida(): string {
  const i = process.argv.indexOf("--saida");
  if (i > 0 && process.argv[i + 1]) return resolve(process.argv[i + 1]);
  return process.env.NAT74_SAIDA ? resolve(process.env.NAT74_SAIDA) : join(RESULTADOS, CAMINHO_DERIVADO);
}

export type Campanha = "t7-tela-a-01" | "t7b-sonnet-tela-a-01" | "t7-tela-b-01";
export const CAMPANHAS: readonly Campanha[] = ["t7-tela-a-01", "t7b-sonnet-tela-a-01", "t7-tela-b-01"];
export const TELA: Record<Campanha, "A" | "B"> = { "t7-tela-a-01": "A", "t7b-sonnet-tela-a-01": "A", "t7-tela-b-01": "B" };
export const MODO_D: Record<Campanha, "unidade" | "spec"> = { "t7-tela-a-01": "unidade", "t7b-sonnet-tela-a-01": "unidade", "t7-tela-b-01": "spec" };
export const ROTULO: Record<Campanha, string> = { "t7-tela-a-01": "A Opus", "t7b-sonnet-tela-a-01": "A Sonnet", "t7-tela-b-01": "B" };
/** Sementes congeladas (plano P15); conferidas contra a agenda no G0. */
export const SEMENTES: Record<Campanha, number> = { "t7-tela-a-01": 3675791356, "t7b-sonnet-tela-a-01": 1573597886, "t7-tela-b-01": 2608969728 };
export const PARES = ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10"] as const;

export type Braco = "sem" | "com" | "lb-axe" | "lb-validator";
export const BRACOS: readonly Braco[] = ["sem", "com", "lb-axe", "lb-validator"];

// ───────────────────────────────────────────────────────────────── bytes, hash e JSON

export const sha = (b: string | Buffer): string => createHash("sha256").update(b).digest("hex");
export const shaArquivo = (p: string): string => sha(readFileSync(p));
export const posix = (p: string): string => p.split(sep).join("/");
export const relRes = (p: string): string => posix(relative(RESULTADOS, p));
export const relTcc = (p: string): string => posix(relative(TCC, p));
export const lerJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;
export const jsonTexto = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const ordenar = <T>(xs: T[], chave: (x: T) => string): T[] => [...xs].sort((a, b) => cmp(chave(a), chave(b)));
export const unicos = (xs: string[]): string[] => [...new Set(xs)].sort(cmp);

/** Grava sob a raiz de saída; recusa caminho que escape dela. */
export function gravar(raiz: string, rel: string, corpo: string | Buffer): string {
  const alvo = resolve(raiz, rel);
  const r = relative(raiz, alvo);
  if (r.startsWith("..") || resolve(r) === r) throw new Error(`caminho fora do derivado: ${rel}`);
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, corpo);
  return alvo;
}
export const gravarJson = (raiz: string, rel: string, v: unknown): string => gravar(raiz, rel, jsonTexto(v));

/** CSV RFC 4180 com separador vírgula e quebra \n. */
export function csv(colunas: string[], linhas: Record<string, unknown>[]): string {
  const cel = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [colunas.join(","), ...linhas.map(l => colunas.map(c => cel(l[c])).join(","))].join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── arquivo de resultados

export interface Par {
  campanha: Campanha; par: string;
  /** Revisão final (a última `rev-NNN` do par). */
  revisao: string;
  dir: string;
}

const subpastas = (d: string): string[] => (existsSync(d) ? readdirSync(d).filter(x => statSync(join(d, x)).isDirectory()).sort() : []);

export function paresDaCampanha(c: Campanha): Par[] {
  return PARES.map(par => {
    const revs = subpastas(join(RESULTADOS, "analises", c, par, "revisoes")).filter(r => /^rev-\d{3}$/.test(r));
    if (!revs.length) throw new Error(`${c}/${par} sem revisões`);
    const revisao = revs[revs.length - 1];
    return { campanha: c, par, revisao, dir: join(RESULTADOS, "analises", c, par, "revisoes", revisao) };
  });
}
export const todosOsPares = (): Par[] => CAMPANHAS.flatMap(paresDaCampanha);
export const chavePar = (p: Pick<Par, "campanha" | "par">): string => `${p.campanha}/${p.par}`;

export interface ParLido extends Par {
  pkg: SemanticPackage; reviews: SemanticReviews; scoreBytes: Buffer;
  receita: Receita;
}
export interface Receita {
  formato: string; campanha: string; alvo: string;
  execucoes: { sem: string; com: string };
  pacotes: { sem: string; com: string };
  entradas: { campanha: string; snapshots: string; referencia: string; site: string; linhaDeBase: string; semLinhaDeBase: boolean };
}

export function lerPar(p: Par): ParLido {
  return { ...p,
    pkg: lerJson<SemanticPackage>(join(p.dir, "revisao", "package.json")),
    reviews: lerJson<SemanticReviews>(join(p.dir, "revisao", "reviews.json")),
    scoreBytes: readFileSync(join(p.dir, "score.json")),
    receita: lerJson<Receita>(join(RESULTADOS, "analises", p.campanha, p.par, "receita.json")) };
}

/** Braço de cada cartão pelo `package.runs`. Um cartão em mais de um run é erro (não acontece no arquivo; conferido no E1). */
export function bracoDosCartoes(pkg: SemanticPackage): Map<string, { braco: Braco; runId: string }> {
  const m = new Map<string, { braco: Braco; runId: string }>();
  for (const r of pkg.runs) {
    const braco: Braco = r.kind === "agente"
      ? ((r.config as { oracleProfile?: string } | null)?.oracleProfile === "none" ? "sem" : "com")
      : r.tool === "axe-core" ? "lb-axe" : "lb-validator";
    for (const id of r.cardIds) {
      if (m.has(id)) throw new Error(`cartão em mais de um run: ${id} (${m.get(id)!.runId}, ${r.id})`);
      m.set(id, { braco, runId: r.id });
    }
  }
  return m;
}

/** Chave canônica de átomo da trilha (plano E1). */
export const chaveAtomo = (campanha: string, par: string, cardId: string, atomId: string): string => `${campanha}|${par}|${cardId}|${atomId}`;
