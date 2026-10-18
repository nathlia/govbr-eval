/**
 * NAT-74 — reanálise retrospectiva, derivado `nat74-retrospectiva-1.1.0`. Etapas E0–E13 do plano
 * (`thesis-workspace/planejamento/atual/plano-nat74-reanalise-2026-10-16.md`) com a E14 já feita: lê os
 * julgamentos da fila T3 (`fila-t3/julgamentos.json`, ingeridos pelo e14-ingerir) e as medidas da T2
 * (`medidas/t2/medidas-t2.json`, do t2-medir). Nenhuma chamada de modelo, nenhuma rede.
 * A 1.0.0 (commit 59fc919 do govbr-eval) fica como está, byte a byte; esta versão não a regera.
 *
 *   npm run reanalise:nat74 -- [--etapa E<n>] [--saida PASTA] [--julgamentos a.json,b.json] [--medidas-t2 ARQ] [--comparar PASTA]
 *
 * Sem `--julgamentos`, usa os que existirem: `1.0.0/fila-t3/julgamentos.json` e `<saida>/fila-t3/julgamentos.json`
 * (a fila residual desta versão); o segundo vale sobre o primeiro no mesmo átomo (rejulgamento de indeterminado).
 *
 * `--etapa` para depois da etapa pedida. Os portões (E1 contagens, G0, bijeção, G1, G2) param tudo
 * quando falham, gravam `verificacao/portoes.json` com a diferença exata e saem com código 2.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createRequire } from "node:module";
import { analisePareada, ESTATISTICA_VERSAO } from "../estatistica-pareada";
import { analysisIdentity } from "../collection-manifest";
import { scoreSemanticPackage, type SemanticPackage, type SemanticReviews } from "../semantic-flow";
import { loadKbAliasVocabulary } from "../kb-aliases";
import {
  CAMINHO_DERIVADO, CAMINHO_DERIVADO_110, COMMIT_DERIVADO_100, DERIVADO_VERSAO_110, CAMPANHAS, COMMIT_RESULTADOS, EVAL, FORMATO_RESULTADO, MODO_D, NAT73, PLANEJAMENTO, POLITICA_PRINCIPAL,
  POLITICA_SENSIBILIDADE, REVISAO_INTEGRADA, RESULTADOS, ROTULO, TCC, TELA, chaveAtomo, csv, gravar, gravarJson, jsonTexto, lerJson, ordenar, posix, raizSaida,
  relRes, relTcc, sha, shaArquivo, type Braco, type Campanha, type ParLido,
} from "./comum";
import { inventarioDeAtomos, type AtomoArquivado, type Inventario } from "./e1";
import { contagemDoRun, OFICIAL, portaoG0, runsDosBracos, sementeDaCampanha, type ContagemBraco } from "./g0";
import { dirParDerivado } from "./e3";
import { g1DoPar, mapaRetrospectivo, tradutor, type MapaRetrospectivo } from "./mapa";
import { contador, limitesDoPar, type BracoLimite, type LimitesDoPar } from "./limites";
import { CAMINHO_MEDIDAS_T2, vereditoT2, type MedidasT2 } from "./t2";
import { FORMATO_JULGAMENTOS } from "./e14-comum";
import type { VereditoAtomo } from "./vereditos";
import { idDaParte, montarDecisoes, type Montagem } from "./montar";
import {
  classeDoArquivo, classificarVariante, DESCRICAO_VARIANTE, elegibilidade, limiteSuperior, metrica, mudouPorM1, pendenteCreditadoNoArquivo, VARIANTES,
  type AtomoClassificado, type AtomoEntrada, type JulgamentoT3, type ParteClassificada, type Variante,
} from "./politica";
import { vereditosPorAtomo, type SaidaVereditos } from "./vereditos";

const req = createRequire(import.meta.url);
const DERIVADO_VERSAO = DERIVADO_VERSAO_110;
/** Famílias com medida mecânica (T2): R2 nome calculado, R4 declaração de estilo. */
const FAMILIAS_T2 = new Set(["R2-nome", "R4-token"]);
/** Pacote 1.7.0 de um par, preparado na 1.0.0 (commit da42f24): a 1.1.0 não reprepara. */
export const pacoteDe100 = (p: { campanha: string; par: string }): string => join(RESULTADOS, CAMINHO_DERIVADO, p.campanha, p.par, "analise", "revisao", "package.json");
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const ETAPAS = ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11", "E12", "E13"] as const;
type Etapa = typeof ETAPAS[number];

class Portao extends Error { constructor(public portao: string, public diferencas: unknown) { super(`portão ${portao} falhou`); } }

// ───────────────────────────────────────────────────────────────── E0

const git = (cwd: string, ...a: string[]): string => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8" }).trim();

/** Lista fechada de arquivos lidos (§3), relativa a TCC. */
export function arquivosLidos(): string[] {
  const out = new Set<string>();
  const add = (abs: string) => { if (existsSync(abs) && statSync(abs).isFile()) out.add(posix(relative(TCC, abs))); };
  const addDir = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isFile()) add(p); } };
  for (const c of CAMPANHAS) for (const par of ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10"]) {
    const base = join(RESULTADOS, "analises", c, par);
    add(join(base, "receita.json"));
    const revs = readdirSync(join(base, "revisoes")).filter(r => /^rev-\d{3}$/.test(r)).sort();
    const rd = join(base, "revisoes", revs.at(-1)!);
    addDir(rd); add(join(rd, "revisao", "package.json")); add(join(rd, "revisao", "reviews.json"));
    const r = lerJson<{ pacotes: Record<string, string>; entradas: Record<string, string | boolean> }>(join(base, "receita.json"));
    for (const k of ["campanha", "snapshots", "referencia", "linhaDeBase"]) if (typeof r.entradas[k] === "string") add(join(RESULTADOS, r.entradas[k] as string));
    add(join(RESULTADOS, r.entradas.site as string, "site-manifest.json"));
    for (const p of Object.values(r.pacotes)) { add(join(RESULTADOS, p, "artifact-manifest.json")); add(join(RESULTADOS, p, "run.json")); }
  }
  for (const c of CAMPANHAS) { const d = join(RESULTADOS, "campanhas", c, "agendas"); for (const s of readdirSync(d)) add(join(d, s, "agenda.json")); }
  add(join(RESULTADOS, "RESULTADOS.md"));
  for (const f of ["politica-normativa-v1.md", "inventario-casos-materiais.json", "inventario-bracos.json", "selecao-ratificacao.json",
    "equivalencia/julgamentos-revisor-novo.json", "equivalencia/ratificacao-resultado.json", "origem/origem-medida.json", "origem/medidas-runtime.json",
    "origem/grupos-casos.json", "origem/medir-origem.mjs", "ratificacao/chave/revelacao.json"]) add(join(NAT73, f));
  addDir(join(NAT73, "ratificacao", "julgamentos"));
  add(join(REVISAO_INTEGRADA, "conferencia-resultados.json")); add(join(REVISAO_INTEGRADA, "conferencia-resultados.cjs"));
  return [...out].sort();
}
export const hashesDe = (rels: string[]): Record<string, { bytes: number; sha256: string }> =>
  Object.fromEntries(rels.map(r => { const b = readFileSync(resolve(TCC, r)); return [r, { bytes: b.length, sha256: sha(b) }]; }));

/** Cópias pequenas (§3): política, seleção, julgamentos, revisor novo, origem e conferência. */
const ENTRADAS_COPIADAS = (rels: string[]) => rels.filter(r => r.startsWith(posix(relative(TCC, NAT73))) && !/inventario-|grupos-casos|medir-origem/.test(r)
  || r.includes("conferencia-resultados.json"));

interface EntradasV110 { julgamentos: string[]; medidasT2: string; pacotes: string[] }

/**
 * E0 da 1.1.0. Não "sobe uma constante": prova que as entradas são as fixadas.
 * - `b69857f` e `da42f24` são ancestrais do HEAD do govbr-resultados;
 * - fora de `derivados/`, a árvore de trabalho é idêntica a `b69857f` (o arquivo original não mudou);
 * - o derivado 1.0.0 é idêntico a `da42f24`, salvo arquivos NOVOS sob `1.0.0/fila-t3/` (respostas, julgamentos, consistência);
 * - arquivo não rastreado só sob a saída da 1.1.0 ou sob `1.0.0/fila-t3/`;
 * - sha256 de tudo o que se lê (lista fechada + 30 pacotes 1.7.0 da 1.0.0 + julgamentos com o manifesto e a chave da
 *   fila de cada um + medidas da T2), antes de qualquer leitura analítica.
 */
function e0(raiz: string, x: EntradasV110): { hashes: Record<string, { bytes: number; sha256: string }> } {
  const head = git(RESULTADOS, "rev-parse", "HEAD");
  for (const c of [COMMIT_RESULTADOS, COMMIT_DERIVADO_100]) {
    try { execFileSync("git", ["-C", RESULTADOS, "merge-base", "--is-ancestor", c, "HEAD"]); }
    catch { throw new Portao("E0", `govbr-resultados em ${head}: ${c} não é ancestral do HEAD`); }
  }
  const linhas = (t: string) => t.split("\n").map(l => l.trim()).filter(Boolean);
  const foraDerivados = linhas(git(RESULTADOS, "diff", "--name-only", COMMIT_RESULTADOS, "--", ".", ":(exclude)derivados"));
  if (foraDerivados.length) throw new Portao("E0", { motivo: `arquivo original mudou desde ${COMMIT_RESULTADOS} (fora de derivados/)`, arquivos: foraDerivados });
  const filaT3 = `${CAMINHO_DERIVADO}/fila-t3/`;
  const d100 = linhas(git(RESULTADOS, "diff", "--name-status", COMMIT_DERIVADO_100, "--", CAMINHO_DERIVADO))
    .filter(l => !(/^A\t/.test(l) && l.slice(2).startsWith(filaT3)));
  if (d100.length) throw new Portao("E0", { motivo: `derivado 1.0.0 difere de ${COMMIT_DERIVADO_100} (fora dos arquivos novos da fila T3)`, arquivos: d100 });
  const saidaRel = posix(relative(RESULTADOS, raiz));
  const naoRastreados = linhas(git(RESULTADOS, "status", "--porcelain", "--untracked-files=all")).filter(l => l.startsWith("??")).map(l => l.slice(3))
    .filter(p => !p.startsWith(filaT3) && !p.startsWith(`${CAMINHO_DERIVADO_110}/`) && (saidaRel.startsWith("..") || !p.startsWith(`${saidaRel}/`)));
  if (naoRastreados.length) throw new Portao("E0", { motivo: "arquivos não rastreados fora da saída da 1.1.0 e da fila T3 da 1.0.0", arquivos: naoRastreados });
  const extra = [...x.pacotes, ...x.julgamentos.flatMap(j => [j, join(dirname(j), "lotes", "manifesto.json"), join(dirname(j), "chave", "fila-t3-chave.json")]), x.medidasT2];
  const rels = [...new Set([...arquivosLidos(), ...extra.map(a => posix(relative(TCC, a)))])].sort();
  const hashes = hashesDe(rels);
  gravarJson(raiz, "verificacao/hashes-antes.json", { formato: "nat74-hashes-1.0.0", resultados: { commit: head, tree: git(RESULTADOS, "rev-parse", "HEAD^{tree}") },
    arquivos: hashes, total: rels.length });
  const copias = ENTRADAS_COPIADAS(rels);
  for (const r of copias) { const alvo = join(raiz, "entradas", "copias", r); mkdirSync(dirname(alvo), { recursive: true }); copyFileSync(join(TCC, r), alvo); }
  // Julgamentos e medidas da T2 copiados com nome fixo (a origem pode estar fora do TCC, nos testes).
  x.julgamentos.forEach((j, i) => copyFileSync(j, gravar(raiz, `entradas/copias/julgamentos-${i + 1}.json`, "")));
  copyFileSync(x.medidasT2, gravar(raiz, "entradas/copias/medidas-t2.json", ""));
  gravarJson(raiz, "entradas/manifesto-entradas.json", { formato: "nat74-manifesto-entradas-1.0.0", nota: "sha256 calculados antes de qualquer leitura analítica (E0); decisoes/, sites e pacotes brutos são referenciados, não copiados; os pacotes 1.7.0 são os da 1.0.0",
    entradas: rels.map(r => ({ caminho: r, ...hashes[r], copia: copias.includes(r) ? `entradas/copias/${r}` : null })) });
  const id = analysisIdentity();
  const evalHead = git(EVAL, "rev-parse", "HEAD");
  const pw = req("playwright/package.json") as { version: string };
  const axe = req("axe-core/package.json") as { version: string };
  const chromium = (() => { try { return lerJson<{ browsers: { name: string; revision: string; browserVersion?: string }[] }>(join(dirname(req.resolve("playwright-core/package.json")), "browsers.json")).browsers.find(b => b.name === "chromium"); } catch { return null; } })();
  const kb1 = loadKbAliasVocabulary(EVAL, "kb-aliases.json"), kb2 = loadKbAliasVocabulary(EVAL, "kb-aliases-v2.json");
  const julgamentos = x.julgamentos.map(j => { const t = readFileSync(j, "utf8"); const o = JSON.parse(t) as { completo?: boolean; julgados?: number; total?: number };
    return { caminho: posix(relative(TCC, j)), sha256: sha(t), completo: o.completo ?? null, julgados: o.julgados ?? null, total: o.total ?? null }; });
  gravarJson(raiz, "entradas/ferramenta.json", { formato: "nat74-ferramenta-1.1.0", derivado: DERIVADO_VERSAO,
    entradasFixadas: { arquivoOriginal: { commit: COMMIT_RESULTADOS, regra: "fora de derivados/, árvore de trabalho idêntica a este commit" },
      derivado100: { commit: COMMIT_DERIVADO_100, arvore: git(RESULTADOS, "rev-parse", `${COMMIT_DERIVADO_100}:${CAMINHO_DERIVADO}`), regra: "idêntico a este commit, salvo arquivos novos sob 1.0.0/fila-t3/" },
      julgamentos, medidasT2: { caminho: posix(relative(TCC, x.medidasT2)), sha256: shaArquivo(x.medidasT2) } },
    govbrEval: { commitBase: evalHead, nota: "a reanálise roda sobre a árvore de trabalho do commit-base mais os arquivos de scripts/reanalise-nat74/ (commit novo, registrado ao commitar)" },
    scorer: { version: id.scoringVersion, acceptancePolicy: id.acceptancePolicy, scorerSha256: id.scorerSha256 },
    estatistica: ESTATISTICA_VERSAO, kbAliases: { v1: { version: kb1.version, sha256: kb1.sha256 }, v2: { version: kb2.version, sha256: kb2.sha256 } },
    node: process.version, playwright: pw.version, chromium: chromium ? { revision: chromium.revision, versao: chromium.browserVersion ?? null } : null, axeCore: axe.version,
    politica: { principal: POLITICA_PRINCIPAL, sensibilidade: POLITICA_SENSIBILIDADE, sha256: hashes[posix(relative(TCC, join(NAT73, "politica-normativa-v1.md")))].sha256 } });
  return { hashes };
}

/** Julgamentos da fila T3 (um ou mais arquivos do e14-ingerir); o posterior vale sobre o anterior no mesmo átomo. */
export function carregarJulgamentos(arqs: string[], chaves: ReadonlySet<string>): { porChave: Map<string, JulgamentoT3>; info: Record<string, unknown>[]; sobrescritos: string[] } {
  const porChave = new Map<string, JulgamentoT3>(), info: Record<string, unknown>[] = [], sobrescritos: string[] = [];
  for (const abs of arqs) {
    const texto = readFileSync(abs, "utf8");
    const j = JSON.parse(texto) as { formato: string; completo: boolean; julgados: number; total: number; conteudoSha256: string; fila: { manifestoSha256: string; chaveSha256: string };
      julgamentos: { id: string; chave: string; tipo: string; resposta: JulgamentoT3["resposta"]; derivado: JulgamentoT3["derivado"] }[] };
    const erro = (m: string) => new Portao("julgamentos", `${posix(relative(TCC, abs))}: ${m}`);
    if (j.formato !== FORMATO_JULGAMENTOS) throw erro(`formato ${j.formato}`);
    if (sha(JSON.stringify(j.julgamentos)) !== j.conteudoSha256) throw erro("conteúdo difere de conteudoSha256");
    const fila = dirname(abs);
    if (sha(readFileSync(join(fila, "lotes", "manifesto.json"))) !== j.fila.manifestoSha256) throw erro("manifesto dos lotes difere do que a ingestão gravou");
    if (sha(readFileSync(join(fila, "chave", "fila-t3-chave.json"))) !== j.fila.chaveSha256) throw erro("chave da fila difere do que a ingestão gravou");
    const fonte = `${posix(relative(TCC, abs))}#${sha(texto)}`;
    for (const x of j.julgamentos) {
      if (!chaves.has(x.chave)) throw erro(`átomo desconhecido ${x.chave}`);
      if (porChave.has(x.chave)) sobrescritos.push(x.chave);
      porChave.set(x.chave, { id: x.id, tipo: x.tipo, fonte, resposta: x.resposta, derivado: x.derivado });
    }
    info.push({ arquivo: posix(relative(TCC, abs)), sha256: sha(texto), completo: j.completo, julgados: j.julgados, total: j.total });
  }
  return { porChave, info, sobrescritos: [...new Set(sobrescritos)].sort() };
}

// ───────────────────────────────────────────────────────────────── vocabulário (P5) e sugestão da LB (P13)

function vocabulario(): { equivalentes: (r: string) => string[]; axeBoaPratica: (r: string) => boolean | null } {
  const v1 = loadKbAliasVocabulary(EVAL, "kb-aliases.json").aliases;
  const inverso = new Map<string, string[]>();
  for (const [k, vs] of Object.entries(v1)) for (const x of vs) inverso.set(x, [...(inverso.get(x) ?? []), k]);
  const checks = lerJson<{ checks: { matches: string; aliases: string[]; generic: string[] }[] }>(join(EVAL, "checker-aliases.json")).checks;
  const axe = req("axe-core") as { getRules: () => { ruleId: string; tags: string[] }[] };
  const regras = new Map(axe.getRules().map(r => [r.ruleId, r.tags]));
  const wcagDasTags = (tags: string[]) => tags.map(t => /^wcag(\d)(\d)(\d+)$/.exec(t)).filter(Boolean).map(m => `wcag:${m![1]}.${m![2]}.${m![3]}`);
  return {
    equivalentes: (r: string) => {
      const n = r.replace(/^ds-(?!:)/, "ds:");
      const axeId = n.replace(/^axe:/, "");
      return [...new Set([...(v1[n] ?? []), ...(inverso.get(n) ?? []),
        ...checks.filter(c => n === c.matches || (c.matches.endsWith("-") && n.startsWith(c.matches))).flatMap(c => [...c.aliases, ...c.generic]),
        ...(regras.has(axeId) ? wcagDasTags(regras.get(axeId)!) : [])])];
    },
    axeBoaPratica: (r: string) => { const t = regras.get(r.replace(/^axe:/, "")); return t ? !t.some(x => /^wcag\d{3,}$/.test(x)) && t.includes("best-practice") : null; },
  };
}

function sugestoesDaLinhaDeBase(pares: ParLido[]): Map<string, "generica" | "ausente" | "indeterminada"> {
  const porRegra = new Map<string, Set<string>>();
  for (const p of pares) for (const c of p.pkg.cards) if (c.origin !== "agente") {
    const k = `${TELA[p.campanha]}|${c.binding.protocol}|${c.rule}`;
    (porRegra.get(k) ?? porRegra.set(k, new Set()).get(k)!).add(c.expected === null ? "\u0000null" : c.expected);
  }
  const out = new Map<string, "generica" | "ausente" | "indeterminada">();
  for (const p of pares) for (const c of p.pkg.cards) if (c.origin !== "agente") {
    const s = porRegra.get(`${TELA[p.campanha]}|${c.binding.protocol}|${c.rule}`)!;
    out.set(`${p.campanha}|${p.par}|${c.id}`, c.expected === null ? "ausente" : s.size === 1 ? "generica" : "indeterminada");
  }
  return out;
}

// ───────────────────────────────────────────────────────────────── agregação

interface ParDerivado { p: ParLido; novo: SemanticPackage; mapa: MapaRetrospectivo; dir: string }

function contagemArmada(pd: ParDerivado, reviews: SemanticReviews) {
  const score = scoreSemanticPackage(pd.novo, reviews);
  const runs = runsDosBracos(pd.novo);
  return { score, runs, sem: contagemDoRun(pd.novo, score, runs.sem), com: contagemDoRun(pd.novo, score, runs.com) };
}

const r4 = (x: number | null) => (x === null ? null : Math.round(x * 1e4) / 1e4);

export interface ResultadoPipeline { raiz: string; portoes: Record<string, unknown>; filas: unknown; resultados: Record<string, unknown> }

export interface Opcoes { raiz?: string; ate?: Etapa; log?: (s: string) => void; julgamentos?: string[]; medidasT2?: string }

export async function executar(o: Opcoes = {}): Promise<ResultadoPipeline> {
  const raiz = o.raiz ?? join(RESULTADOS, CAMINHO_DERIVADO_110);
  const julgamentosArqs = o.julgamentos ?? [join(RESULTADOS, CAMINHO_DERIVADO, "fila-t3", "julgamentos.json"), join(raiz, "fila-t3", "julgamentos.json")].filter(f => existsSync(f));
  const medidasT2Abs = o.medidasT2 ?? join(raiz, CAMINHO_MEDIDAS_T2);
  const log = o.log ?? ((s: string) => console.log(s));
  const ate = o.ate ?? "E13";
  const parar = (e: Etapa) => ETAPAS.indexOf(e) >= ETAPAS.indexOf(ate);
  const portoes: Record<string, unknown> = {};
  const gravarPortoes = () => gravarJson(raiz, "verificacao/portoes.json", { formato: "nat74-portoes-1.0.0", portoes });
  const falha = (g: string, dif: unknown): never => { portoes[g] = { passou: false, diferencas: dif }; gravarPortoes(); throw new Portao(g, dif); };
  const res: ResultadoPipeline = { raiz, portoes, filas: null, resultados: {} };

  // E0
  if (!existsSync(medidasT2Abs)) throw new Portao("E0", `sem as medidas da T2 (${medidasT2Abs}): rode npm run reanalise:nat74:t2-medir`);
  const pacotes = CAMPANHAS.flatMap(c => ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10"].map(par => pacoteDe100({ campanha: c, par })));
  const { hashes } = e0(raiz, { julgamentos: julgamentosArqs, medidasT2: medidasT2Abs, pacotes });
  log(`E0 ok: ${Object.keys(hashes).length} arquivos congelados`);
  if (parar("E0")) return res;

  // E1
  const inv = inventarioDeAtomos();
  portoes.E1 = { passou: inv.diferencas.length === 0, diferencas: inv.diferencas, contagens: inv.contagens };
  if (inv.diferencas.length) falha("E1", inv.diferencas);
  log(`E1 ok: ${inv.atomos.length} átomos; contagens da §2 reproduzidas`);
  if (parar("E1")) { gravarPortoes(); return res; }

  // E2 — G0
  const g0 = portaoG0();
  portoes.G0 = { passou: g0.passou, diferencas: g0.diferencas, scoresIguais: g0.scores.filter(s => s.igual).length, scores: g0.scores,
    campanhas: Object.fromEntries(Object.entries(g0.campanhas).map(([c, v]) => [c, { d: v.d, media: v.estatistica.media, ic: [v.estatistica.ic.inferior, v.estatistica.ic.superior],
      p: v.estatistica.principal.p, wilcoxon: v.estatistica.robustez.wilcoxon.p, sinal: v.estatistica.robustez.sinal.p, secundarios: v.secundarios, lbAxe: v.lbAxe }])) };
  if (!g0.passou) falha("G0", g0.diferencas);
  log("E2 ok: G0 (30/30 score.json idênticos; D, IC, p e secundários = oficial)");
  if (parar("E2")) { gravarPortoes(); return res; }

  // E3 — 30 pares sob 1.7.0 + mapa retrospectivo (bijeção)
  const pds: ParDerivado[] = [];
  const orfaos: unknown[] = [];
  for (const p of inv.pares) {
    const dir = dirParDerivado(raiz, p);
    // [1.1.0] O pacote 1.7.0 é o da 1.0.0 (da42f24, conferido no E0 e por sha256 em hashes-antes): não se reprepara.
    const pacoteAbs = pacoteDe100(p);
    if (!existsSync(pacoteAbs)) falha("E3", `${p.campanha}/${p.par}: sem o pacote 1.7.0 da 1.0.0 (${relTcc(pacoteAbs)})`);
    const novo = lerJson<SemanticPackage>(pacoteAbs);
    const mapa = mapaRetrospectivo(p.pkg, novo);
    gravarJson(raiz, `${relative(raiz, dir).split("\\").join("/")}/mapa-retrospectivo.json`, mapa);
    if (mapa.orfaos.length) orfaos.push({ par: `${p.campanha}/${p.par}`, orfaos: mapa.orfaos });
    pds.push({ p, novo, mapa, dir });
  }
  portoes.bijecao = { passou: orfaos.length === 0, orfaos, cartoes: pds.reduce((n, x) => n + x.mapa.cartoes.length, 0), unidades: pds.reduce((n, x) => n + x.mapa.unidades.length, 0) };
  if (orfaos.length) falha("bijecao", orfaos);
  log(`E3 ok: 30 pares, pacotes ${analysisIdentity().scoringVersion} da 1.0.0 (${COMMIT_DERIVADO_100}); bijeção completa`);
  if (parar("E3")) { gravarPortoes(); return res; }

  // E4 — G1
  const g1 = pds.map(x => g1DoPar(x.p.campanha, `${x.p.campanha}/${x.p.par}`, x.p.pkg, x.p.reviews, x.novo, x.mapa));
  const difG1 = g1.flatMap(x => x.diferencas);
  const lbAxeB = g1.filter(x => x.par.startsWith("t7-tela-b-01")).map(x => x.lbAxe);
  if (!lbAxeB.every(s => s === "provisional")) difG1.push(`LB axe B não é provisional em 10/10 (${lbAxeB.join(",")})`);
  for (const c of CAMPANHAS) { const d = g1.filter(x => x.par.startsWith(`${c}/`)).map(x => x.d); if (JSON.stringify(d) !== JSON.stringify(OFICIAL[c].d)) difG1.push(`${c}: D ${JSON.stringify(d)} ≠ G0`); }
  portoes.G1 = { passou: difG1.length === 0, diferencas: difG1, pares: g1 };
  if (difG1.length) falha("G1", difG1);
  log("E4 ok: G1 (unidades confirmadas por execução, contagens e LB axe B idênticas sob 1.7.0)");
  if (parar("E4")) { gravarPortoes(); return res; }

  // E5 — vereditos
  const ver = vereditosPorAtomo({ atomos: inv.atomos });
  log(`E5 ok: ${ver.porChave.size} átomos com veredito novo`);
  if (parar("E5")) { gravarPortoes(); return res; }

  // entradas da política (sem braço: P9)
  const origem = lerJson<{ porCaso: Record<string, string>; grupos: { members: string[]; tela: string; descricao: string; origem: string }[] }>(join(NAT73, "origem", "origem-medida.json"));
  // S2: com o exemplo 3.7.0, paginação sem aria-current (20) e select da paginação sem combobox (2) passam a `pagina`.
  const viram370 = new Set(origem.grupos.filter(g => g.tela === "B" && g.origem === "pagina-copiando-exemplo-ds" && /pagina[çc][aã]o|aria-current|combobox/i.test(g.descricao))
    .flatMap(g => g.members));
  const voc = vocabulario();
  const sug = sugestoesDaLinhaDeBase(inv.pares);
  // [1.1.0, S7] cartão com a sinalização `sem-evidencia` do contrato do achado e sem fato medido do próprio caso (origem D-129).
  const semEvidencia = new Set(inv.atomos.filter(a => {
    const card = inv.pares.find(p => p.campanha === a.campanha && p.par === a.par)!.pkg.cards.find(c => c.id === a.cardIdOriginal)!;
    return (card.flags ?? []).includes("sem-evidencia") && !(a.mId && origem.porCaso[a.mId]);
  }).map(a => a.chave));
  // [1.1.0] Julgamentos da fila T3 (LLM cego, D-130) e medidas da T2 (nome calculado, declaração de estilo).
  const julg = carregarJulgamentos(julgamentosArqs, new Set(inv.atomos.map(a => a.chave)));
  const medidasT2 = lerJson<MedidasT2>(medidasT2Abs);
  const fonteT2 = `${posix(relative(TCC, medidasT2Abs))}#${shaArquivo(medidasT2Abs)}`;
  const t2 = { vereditos: new Map<string, VereditoAtomo>(), pendente: new Map<string, string>(), porResultado: {} as Record<string, number> };
  for (const a of inv.atomos) {
    if (a.grupo !== "nao-credito-fora" || !FAMILIAS_T2.has(a.familia) || ver.porChave.has(a.chave)) continue;
    const card = inv.pares.find(p => p.campanha === a.campanha && p.par === a.par)!.pkg.cards.find(c => c.id === a.cardIdOriginal)!;
    const r = vereditoT2({ regra: card.rule, seletor: card.selector, observado: card.observed ?? card.description, sujeitos: a.sujeitos, familia: a.familia,
      cenas: [card.scene, ...card.subjects.map(s => s.scene ?? "")].filter(Boolean) }, medidasT2, fonteT2);
    const k = "veredito" in r ? `${a.familia} · ${r.alvo} · ${r.veredito.vigente.partes[0].classe}` : `${a.familia} · sem decisão: ${r.pendente}`;
    t2.porResultado[k] = (t2.porResultado[k] ?? 0) + 1;
    if ("veredito" in r) t2.vereditos.set(a.chave, r.veredito); else t2.pendente.set(a.chave, r.pendente);
  }
  log(`E5/E7 ok: ${julg.porChave.size} átomos julgados na T3 (${julg.info.length} arquivo(s)); T2: ${t2.vereditos.size} decididos pela medida, ${t2.pendente.size} sem decisão → T3`);
  const entradas = new Map<string, AtomoEntrada>(inv.atomos.map(a => [a.chave, {
    atomo: a, veredito: ver.porChave.get(a.chave) ?? t2.vereditos.get(a.chave) ?? null,
    t3: julg.porChave.get(a.chave) ?? null, t2Pendente: t2.pendente.get(a.chave) ?? null, semEvidencia: semEvidencia.has(a.chave),
    origem341: a.mId ? origem.porCaso[a.mId] ?? null : null,
    origem370: a.mId ? (viram370.has(a.mId) ? "pagina" : origem.porCaso[a.mId] ?? null) : null,
    sugestaoLinhaDeBase: a.origemCartao === "linha-de-base" ? sug.get(`${a.campanha}|${a.par}|${a.cardIdOriginal}`) ?? "indeterminada" : null,
    equivalentes: voc.equivalentes, axeBoaPratica: voc.axeBoaPratica,
  }]));

  // E6 — triagem (principal) e filas T2/T3 por campanha × braço (saída intermediária obrigatória)
  const classif = new Map<Variante, Map<string, AtomoClassificado>>();
  for (const v of VARIANTES) classif.set(v, new Map(inv.atomos.map(a => [a.chave, classificarVariante(entradas.get(a.chave)!, v)])));
  const princ = classif.get("principal")!;
  const s7 = classif.get("S7")!;
  const afetadosS7: Record<string, Record<string, number>> = {};
  for (const a of inv.atomos) if (s7.get(a.chave)!.motivoFila?.startsWith("S7:")) {
    const b = inv.bracoPorChave.get(a.chave)!.braco; const x = (afetadosS7[a.campanha] ??= {}); x[b] = (x[b] ?? 0) + 1; }
  const braco = (k: string): Braco => inv.bracoPorChave.get(k)!.braco;
  const filas: Record<string, Record<string, { T2: number; T3: number; T1: number; julgado: number; pendente: number }>> = {};
  for (const a of inv.atomos) {
    const c = princ.get(a.chave)!;
    const f = ((filas[a.campanha] ??= {})[braco(a.chave)] ??= { T2: 0, T3: 0, T1: 0, julgado: 0, pendente: 0 });
    f[c.tratamento]++;
  }
  const t3Motivos: Record<string, number> = {};
  for (const c of princ.values()) if (c.fila) t3Motivos[`${c.fila}: ${c.motivoFila}`] = (t3Motivos[`${c.fila}: ${c.motivoFila}`] ?? 0) + 1;
  // [mudança revisão H1] átomos que o arquivo creditou e que agora estão pendentes, por campanha × braço × motivo (principal).
  const pendCred: Record<string, Record<string, { total: number; motivos: Record<string, number> }>> = {};
  // [mudança revisão M1] átomos de arquivo creditados cuja origem medida não-página mudou a classe, por variante × campanha × braço.
  const m1: Record<string, Record<string, Record<string, number>>> = {};
  for (const a of inv.atomos) {
    const c = princ.get(a.chave)!;
    if (pendenteCreditadoNoArquivo(a, c)) {
      const x = ((pendCred[a.campanha] ??= {})[braco(a.chave)] ??= { total: 0, motivos: {} });
      x.total++; const mo = `${c.fila ?? c.tratamento}: ${c.motivoFila ?? "classe pendente"}`; x.motivos[mo] = (x.motivos[mo] ?? 0) + 1;
    }
    for (const v of VARIANTES) if (mudouPorM1(a, classif.get(v)!.get(a.chave)!)) {
      const y = ((m1[v] ??= {})[a.campanha] ??= {}); y[braco(a.chave)] = (y[braco(a.chave)] ?? 0) + 1;
    }
  }
  res.filas = { porCampanhaBraco: filas, motivos: t3Motivos, pendentesCreditadosNoArquivo: pendCred, m1 };
  gravarJson(raiz, "fila-t3/filas-e6.json", { formato: "nat74-filas-1.0.0", nota: "tamanho exato das filas T2/T3 por campanha e braço, antes de qualquer julgamento (E6); E14 não rodou",
    porCampanhaBraco: filas, motivos: ordenar(Object.entries(t3Motivos), ([k]) => k).map(([motivo, n]) => ({ motivo, n })),
    pendentesCreditadosNoArquivo: { nota: "H1: átomos que o arquivo creditou (defeito-do-gabarito) e que a triagem deixou pendentes (principal); caem desigualmente nos braços, por isso D sai em limites", porCampanhaBraco: pendCred },
    m1: { nota: "M1: átomos de arquivo creditados cuja origem medida (DS ou indeterminada) mudou a classe arquivada, por variante × campanha × braço", porVarianteCampanhaBraco: m1 } });
  log(`E6 ok: filas ${JSON.stringify(filas)}`);
  if (parar("E6")) { gravarPortoes(); return res; }

  // E7 — medidas: as evidências mecânicas usadas (congeladas na NAT-73; nenhuma medida nova nesta versão)
  gravarJson(raiz, "medidas/medidas-usadas.json", { formato: "nat74-medidas-1.0.0",
    nota: "1.1.0: medidas da NAT-73 no site congelado (origem D-129, B-16) + medidas da T2 desta versão (R2 nome calculado, R4 declaração de estilo e escala do DS 3.4.1), headless, sem modelo; o que a medida não fecha vai à T3",
    t2: { arquivo: posix(relative(TCC, medidasT2Abs)), sha256: shaArquivo(medidasT2Abs), formato: medidasT2.formato, porResultado: Object.fromEntries(Object.entries(t2.porResultado).sort()) },
    julgamentosT3: { arquivos: julg.info, atomos: julg.porChave.size, rejulgados: julg.sobrescritos },
    origem: { arquivo: relTcc(join(NAT73, "origem", "origem-medida.json")), sha256: shaArquivo(join(NAT73, "origem", "origem-medida.json")), casos: Object.keys(origem.porCaso).length, viramPaginaCom370: [...viram370].sort() },
    b16: { arquivo: relTcc(join(NAT73, "origem", "medidas-runtime.json")), sha256: shaArquivo(join(NAT73, "origem", "medidas-runtime.json")),
      trechos: ["telaB.lista.header.logo.alt = \"logo\" (br-header, mesmo componente no detalhe)", "telaB.lista.imgsSemAlt[]: exit-icon.png em BUTTON.br-item dropdown-button; telaB.detalhe.imgsSemAlt[] contém exit-icon.png"] } });
  if (parar("E7")) { gravarPortoes(); return res; }

  // G2 — política identidade pela camada de montagem
  const identidade = new Map<string, AtomoClassificado>(inv.atomos.map(a => {
    const cls = a.decisao === "evidencia-insuficiente" ? "evidencia-indisponivel" : classeDoArquivo(a.decisao);
    const parte: ParteClassificada = { indice: 0, parte: "o cartão inteiro", sujeitos: [...a.sujeitos], verdadeFactual: null, normaId: null, normaForca: null,
      normaAplicabilidade: null, normaViolada: null, origemJuiz: null, origem: null, origemRotulo: null, regraCitada: a.regra, forcaDaCitacao: null,
      aplicabilidadeDaCitada: null, qualidadeDaSugestao: null, classe: cls as ParteClassificada["classe"], spec: a.unidades[0]?.specId ?? null,
      credito: a.decisao === "defeito-do-gabarito" ? "unidade" : null, regraDaPolitica: "identidade", motivo: "política identidade (G2)" };
    return [a.chave, { chave: a.chave, juiz: "identidade", tratamento: "julgado", partes: [parte], transporArquivo: false, aposRevelacao: false,
      aposOrientacao: false, fontes: ["arquivo"], divergencias: [], fila: null, motivoFila: null } as AtomoClassificado];
  }));
  const difG2: string[] = [];
  for (const pd of pds) {
    const m = montarDecisoes({ novo: pd.novo, antigo: pd.p.pkg, revAntigo: pd.p.reviews, mapa: pd.mapa, classificados: identidade,
      chaveDe: (cid, aid) => chaveAtomo(pd.p.campanha, pd.p.par, cid, aid) });
    const sa = scoreSemanticPackage(pd.p.pkg, pd.p.reviews), sn = scoreSemanticPackage(pd.novo, m.reviews);
    for (const s of sa.scores) {
      const n = sn.scores.find(x => x.runId === s.runId)!;
      for (const k of ["detectedUnits", "falseAssertions", "novelAssertions"] as const)
        if (s.counts[k] !== n.counts[k]) difG2.push(`${pd.p.campanha}/${pd.p.par} ${s.runId}: ${k} ${s.counts[k]} → ${n.counts[k]}`);
      if (s.status !== n.status) difG2.push(`${pd.p.campanha}/${pd.p.par} ${s.runId}: status ${s.status} → ${n.status}`);
    }
    for (const r of m.recusados) difG2.push(`${pd.p.campanha}/${pd.p.par}: identidade recusada ${r.cardIdOriginal}: ${r.motivo}`);
  }
  portoes.G2 = { passou: difG2.length === 0, diferencas: difG2 };
  if (difG2.length) falha("G2", difG2);
  log("G2 ok: política identidade reproduz os secundários do arquivo");

  // E8–E10 — montar, pontuar e agregar por variante
  const porVariante: Record<string, Record<string, unknown>> = {};
  const trilha: Record<string, unknown>[] = [];
  const unidadesLinhas: Record<string, unknown>[] = [];
  const recusas: unknown[] = [];
  const precisao: Record<string, Record<string, Record<string, Record<string, unknown>>>> = {};
  const maturidade: Record<string, Record<string, Record<string, unknown>>> = {};
  const scoresPrincipais = new Map<string, ReturnType<typeof scoreSemanticPackage>>();
  const material = materialidade();
  for (const v of VARIANTES) {
    const cl = classif.get(v)!;
    const porCamp: Record<string, { d: number[]; dSup: number[]; dMin: number[]; dMax: number[]; pares: unknown[] }> = {};
    for (const pd of pds) {
      const c = pd.p.campanha;
      const m: Montagem = montarDecisoes({ novo: pd.novo, antigo: pd.p.pkg, revAntigo: pd.p.reviews, mapa: pd.mapa, classificados: cl,
        chaveDe: (cid, aid) => chaveAtomo(c, pd.p.par, cid, aid) });
      const k = contagemArmada(pd, m.reviews);
      const rel = relative(raiz, pd.dir).split("\\").join("/");
      gravarJson(raiz, `${rel}/reviews.${v}.json`, m.reviews);
      gravarJson(raiz, `${rel}/score.${v}.json`, k.score);
      const d = MODO_D[c] === "spec" ? k.com.specs - k.sem.specs : k.com.sorteadas - k.sem.sorteadas;
      const resumo = { variante: v, d, sem: k.sem, com: k.com, pendentes: m.pendentes.length, recusados: m.recusados, vinculos: m.vinculos,
        lb: { axe: k.runs.axe ? k.score.scores.find(s => s.runId === k.runs.axe) : null, validator: k.runs.validator ? k.score.scores.find(s => s.runId === k.runs.validator) : null } };
      gravarJson(raiz, `${rel}/summary.${v}.json`, { formato: "nat74-summary-par-1.0.0", campanha: c, par: pd.p.par, ...resumo,
        lb: { axe: resumo.lb.axe && { status: resumo.lb.axe.status, unidades: resumo.lb.axe.counts.detectedUnits, pendentes: resumo.lb.axe.pendingCardIds.length },
          validator: resumo.lb.validator && { status: resumo.lb.validator.status, unidades: resumo.lb.validator.counts.detectedUnits, pendentes: resumo.lb.validator.pendingCardIds.length } } });
      // [mudança revisão H1] limite superior: pendente creditado no arquivo mantém o crédito arquivado.
      const atomosDoPar = inv.atomos.filter(x => x.campanha === c && x.par === pd.p.par);
      const clSup = new Map(cl);
      let mudou = 0;
      for (const a of atomosDoPar) { const s = limiteSuperior(entradas.get(a.chave)!, cl.get(a.chave)!, v); if (s !== cl.get(a.chave)) { clSup.set(a.chave, s); mudou++; } }
      let dSup = d;
      if (mudou) {
        const mSup = montarDecisoes({ novo: pd.novo, antigo: pd.p.pkg, revAntigo: pd.p.reviews, mapa: pd.mapa, classificados: clSup, chaveDe: (cid, aid) => chaveAtomo(c, pd.p.par, cid, aid) });
        const kSup = contagemArmada(pd, mSup.reviews);
        dSup = MODO_D[c] === "spec" ? kSup.com.specs - kSup.sem.specs : kSup.com.sorteadas - kSup.sem.sorteadas;
      }
      (porCamp[c] ??= { d: [], dSup: [], dMin: [], dMax: [], pares: [] }).d.push(d);
      porCamp[c].dSup.push(dSup);
      // [revisão independente] limites verdadeiros por par (limites.ts); os dois valores acima são cenários.
      const lim = limitesParaPar(pd, k, m, cl, c, ch => entradas.get(ch)?.t3?.resposta.vinculo);
      porCamp[c].dMin.push(lim.dMin); porCamp[c].dMax.push(lim.dMax);
      porCamp[c].pares.push({ par: pd.p.par, d, dMin: lim.dMin, dMax: lim.dMax, limites: lim, dCenarioArquivoRestaurado: dSup, atomosNoCenarioArquivoRestaurado: mudou, sem: { specs: k.sem.specs, sorteadas: k.sem.sorteadas, unidades: k.sem.unidades, pagina: k.sem.pagina, incorretas: k.sem.incorretas, novas: k.sem.novas, pendentes: k.sem.pendentes },
        com: { specs: k.com.specs, sorteadas: k.com.sorteadas, unidades: k.com.unidades, pagina: k.com.pagina, incorretas: k.com.incorretas, novas: k.com.novas, pendentes: k.com.pendentes },
        lbAxe: resumo.lb.axe ? { status: resumo.lb.axe.status, unidades: resumo.lb.axe.counts.detectedUnits, total: resumo.lb.axe.counts.referenceUnits, pendentes: resumo.lb.axe.pendingCardIds.length,
          b16: unidadesConfirmadasSpec(pd.novo, resumo.lb.axe, "B-16") } : null,
        lbValidator: resumo.lb.validator ? { status: resumo.lb.validator.status, unidades: resumo.lb.validator.counts.detectedUnits, total: resumo.lb.validator.counts.referenceUnits, pendentes: resumo.lb.validator.pendingCardIds.length } : null });
      if (v === "principal") {
        scoresPrincipais.set(`${c}/${pd.p.par}`, k.score);
        for (const r of m.recusados) recusas.push({ campanha: c, par: pd.p.par, ...r });
        unidadesLinhas.push(...linhasDeUnidades(pd, k.score, inv));
      }
      // precisão I/II e maturidade por braço/LB (por parte classificada)
      for (const a of inv.atomos.filter(x => x.campanha === c && x.par === pd.p.par)) {
        const cls = cl.get(a.chave)!;
        const b = braco(a.chave);
        const P = ((precisao[v] ??= {})[c] ??= {});
        const M = ((maturidade[v] ??= {})[c] ??= {});
        const mat = (M[b] ??= { pendentes: 0, porJuiz: {} as Record<string, number> }) as { pendentes: number; porJuiz: Record<string, number> };
        mat.porJuiz[cls.juiz] = (mat.porJuiz[cls.juiz] ?? 0) + 1;
        // Pendente = decisão pendente na montagem OU cartão que o scorer deixa pendente (átomo `unresolved`: evidência indisponível, R9).
        const novoId = pd.mapa.cartoes.find(x => x.de === a.cardIdOriginal)!.para;
        const cardPendente = m.pendentes.includes(novoId) || k.score.scores.some(s => s.pendingCardIds.includes(novoId));
        if (cardPendente) mat.pendentes++;
        for (const parte of cls.partes) {
          for (const an of ["I", "II", "I-S6"] as const) {
            const el = cardPendente ? "pendente" : elegibilidade(parte.classe, an === "II" ? "II" : "I", an === "I-S6" || v === "S6");
            const T = ((P[an] ??= {})[b] ??= { tp: 0, fp: 0, excluidas: {} as Record<string, number>, pendentes: 0 }) as { tp: number; fp: number; excluidas: Record<string, number>; pendentes: number };
            if (el === "tp") T.tp++; else if (el === "fp") T.fp++; else if (el === "pendente") T.pendentes++; else T.excluidas[el] = (T.excluidas[el] ?? 0) + 1;
          }
          trilha.push(linhaTrilha(a, b, inv, cls, parte, v, pd, m, material, entradas.get(a.chave)!));
        }
      }
    }
    porVariante[v] = Object.fromEntries(Object.entries(porCamp).map(([c, x]) => [c, x]));
  }
  log(`E8–E10 ok: ${VARIANTES.length} variantes pontuadas`);

  // E11 — agregação pela agenda original
  const resultados: Record<string, unknown> = {};
  for (const c of CAMPANHAS) {
    const of = OFICIAL[c];
    const variantes: Record<string, unknown> = {};
    for (const v of VARIANTES) {
      const x = porVariante[v][c] as { d: number[]; dSup: number[]; dMin: number[]; dMax: number[]; pares: Record<string, unknown>[] };
      const est = analisePareada(x.d, sementeDaCampanha(c));
      const estSup = analisePareada(x.dSup, sementeDaCampanha(c));
      const M = maturidade[v][c] as Record<string, { pendentes: number; porJuiz: Record<string, number> }>;
      const P = precisao[v][c] as Record<string, Record<string, { tp: number; fp: number; excluidas: Record<string, number>; pendentes: number }>>;
      const prec = (an: string) => Object.fromEntries(Object.entries(P[an] ?? {}).map(([b, t]) => [b, { tp: t.tp, fp: t.fp, den: t.tp + t.fp, excluidas: t.excluidas,
        pendentes: t.pendentes, ...metrica(t.tp, t.fp, t.pendentes) }]));
      const soma = (k: "sem" | "com", f: string) => x.pares.reduce((n, p) => n + Number((p[k] as Record<string, unknown>)[f] ?? 0), 0);
      const somaP = (k: "sem" | "com") => x.pares.reduce((n, p) => n + (((p[k] as { pagina: { confirmadas: number } | null }).pagina?.confirmadas) ?? 0), 0);
      const mat = (b: string) => M[b] ? { estado: M[b].pendentes ? "PROVISORIO" : "FINAL-DERIVADO", pendentes: M[b].pendentes, porJuiz: M[b].porJuiz } : null;
      const estado = mat("sem")?.estado === "PROVISORIO" || mat("com")?.estado === "PROVISORIO" ? "PROVISORIO" : "FINAL-DERIVADO";
      const media = (xs: number[]) => (xs.length ? r4(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
      const ic = (e: typeof est) => ({ inferior: e.ic.inferior, superior: e.ic.superior });
      variantes[v] = { descricao: DESCRICAO_VARIANTE[v], estado,
        // FINAL (sem pendente nos braços): D pontual, com IC e p; senão os limites verdadeiros e os cenários.
        pontual: estado === "FINAL-DERIVADO" ? { d: x.d, media: est.media, mediana: est.mediana, dp: est.desvioPadrao, ic95: ic(est), p: est.principal.p,
          wilcoxonP: est.robustez.wilcoxon.p, sinalP: est.robustez.sinal.p } : null, politica: v === "S1" ? "1.1.0" : "1.2.0", modo: MODO_D[c], nEfetivo: x.d.length, nPlanejado: 10,
        d: x.d, media: est.media, mediana: est.mediana, dp: est.desvioPadrao, ic95: { inferior: est.ic.inferior, superior: est.ic.superior, semente: est.ic.semente },
        permutacao: est.principal, wilcoxon: est.robustez.wilcoxon, sinal: est.robustez.sinal, leitura: est.leitura,
        deltaOficial: { media: est.media === null ? null : r4(est.media - of.media), d: x.d.map((d, i) => d - of.d[i]) },
        secundarios: { unidades: { sem: soma("sem", "unidades"), com: soma("com", "unidades") }, specs: { sem: soma("sem", "specs"), com: soma("com", "specs") },
          camadaP: TELA[c] === "A" ? { sem: somaP("sem"), com: somaP("com"), total: 20 } : null,
          incorretasScorer: { sem: soma("sem", "incorretas"), com: soma("com", "incorretas") }, novosCorretosScorer: { sem: soma("sem", "novas"), com: soma("com", "novas") },
          precisaoI: prec("I"), precisaoII: prec("II"), precisaoI_indeterminadaComoPagina: prec("I-S6") },
        maturidade: { sem: mat("sem"), com: mat("com"), lbAxe: mat("lb-axe"), lbValidator: mat("lb-validator") },
        // [mudança revisão H1] D em limites enquanto PROVISÓRIO: média/IC/p não são manchete até a E14.
        limites: { estado, nota: "limites verdadeiros por par (limites.ts): Dmin = com_min − sem_max, Dmax = com_max − sem_min; máximo de um braço = confirmado + tudo o que os pendentes dele podem creditar (ancoragem ∪ arquivo ∪ spec indicada pelo juiz); colapsam em D sem pendente",
          inferior: { d: x.dMin, media: media(x.dMin) }, superior: { d: x.dMax, media: media(x.dMax) } },
        cenarios: { nota: "cenários, NÃO limites (mudam os dois braços ao mesmo tempo): média, IC e p não interpretáveis enquanto PROVISÓRIO",
          semCreditoPendente: { d: x.d, media: est.media, ic95: ic(est), p: est.principal.p },
          comCreditoArquivadoRestaurado: { d: x.dSup, media: estSup.media, ic95: ic(estSup), p: estSup.principal.p } },
        pares: x.pares };
    }
    resultados[c] = { formato: FORMATO_RESULTADO, campanha: c, rotulo: ROTULO[c], retrospectiva: true, exploratoria: true,
      aviso: "mudança de medida, não melhora do detector; o resultado oficial não muda (D-21)",
      oficial: { fonte: of.fonte, d: of.d, media: of.media, mediana: of.mediana, ic95: of.ic, p: of.p, wilcoxonP: of.wilcoxonP, sinalP: of.sinalP },
      variantes,
      semEvidencia: { nota: "S7: átomos julgados na T3 com cartão sem-evidencia (sem evidência resolvida nem fato medido) e fato verdadeiro só inferido, tratados como pendentes (R9)",
        afetadosPorBraco: afetadosS7[c] ?? {}, principal: { estado: (variantes.principal as { estado: string }).estado, d: (variantes.principal as { d: number[] }).d,
          limites: (variantes.principal as { limites: unknown }).limites },
        S7: { estado: (variantes.S7 as { estado: string }).estado, d: (variantes.S7 as { d: number[] }).d, limites: (variantes.S7 as { limites: unknown }).limites } },
      historico: c === "t7-tela-b-01" ? { "D-111-adendo": { d: [1, 1, -3, 0, 1, 1, 0, 2, -2, 3], media: 0.4, mediana: 1, dp: 1.78, p: 0.6, sinalP: 0.29,
        metodo: "regex aproximado sobre justificativas (lista fechada de specs); reproduzido do D-111 adendo, não recalculado" } } : null };
    gravarJson(raiz, `resultados/${c}.json`, resultados[c]);
  }
  res.resultados = resultados;
  log("E11 ok");

  // E12 — exportar
  const colunas = ["campanha", "tela", "par", "braco", "runId", "cardIdOriginal", "cardIdDerivado", "cardSha256", "mId", "atomoId", "parte", "sujeitos", "cena", "estadoSha256",
    "regraCitada", "forcaDaCitacao", "aplicabilidadeDaCitada", "decisaoAntiga", "unidadesAntigas", "citacaoAntiga", "verdadeFactual", "normaId", "normaForca",
    "normaAplicabilidade", "normaViolada", "origemMedida341", "origemMedida370", "origemAutora", "vinculoUnidade", "vinculoSpec", "vinculoRelacao", "vinculoEvidencia",
    "vinculoAssinatura", "vinculoAceitoPeloScorer", "unidadesNovas", "qualidadeDaSugestao", "classe120", "classe110", "elegivelI", "elegivelII", "juiz", "tratamento",
    "regraDaPolitica", "motivo", "evidencia", "politicaVersao", "variante", "aposRevelacao", "aposOrientacao", "material", "mudouCredito", "diferenca"];
  // classe110 de cada linha = a classe da mesma parte na S1
  const s1 = new Map(trilha.filter(l => l.variante === "S1").map(l => [`${l.chave}#${l.parte}`, l.classe]));
  for (const l of trilha) l.classe110 = s1.get(`${l.chave}#${l.parte}`) ?? null;
  const ordenada = ordenar(trilha, l => `${l.variante}|${l.chave}|${l.parte}`);
  gravar(raiz, "trilha/trilha-atomos.csv", csv(colunas, ordenada));
  gravar(raiz, "trilha/trilha-atomos.json", JSON.stringify({ formato: "nat74-trilha-1.0.0", variante: "principal", colunas,
    linhas: ordenada.filter(l => l.variante === "principal") }) + "\n");
  const colU = ["campanha", "par", "braco", "runId", "specId", "unitId", "elemento", "estado", "confirmadaAntes", "confirmadaDepois", "cartoesDepois", "variante"];
  gravar(raiz, "trilha/unidades.csv", csv(colU, unidadesLinhas));
  gravar(raiz, "trilha/unidades.json", JSON.stringify({ formato: "nat74-unidades-1.0.0", colunas: colU, linhas: unidadesLinhas }) + "\n");
  gravarJson(raiz, "trilha/recusas-do-scorer.json", { formato: "nat74-recusas-1.0.0", nota: "decisões montadas que as barreiras do scorer recusaram: ficam pendentes, sem forçar (P8)", recusas });
  const lbs = linhasDeBase(porVariante, precisao, maturidade);
  gravarJson(raiz, "resultados/linhas-de-base.json", lbs);
  const aut = autoraJson(ver, porVariante);
  gravarJson(raiz, "resultados/autora.json", aut);
  gravar(raiz, "RESULTADOS-DERIVADO.md", paginaResultados(resultados, lbs, res.filas as never));
  gravar(raiz, "LEIA-ME.md", leiaMe({ julgamentos: julg.info, rejulgados: julg.sobrescritos.length, t2: t2.porResultado, resultados }));
  gravarJson(raiz, "painel-bloco.json", blocoPainel(resultados, lbs));
  log("E12 ok");

  // E13 — verificar
  const depois = hashesDe(Object.keys(hashes));
  const mudaram = Object.keys(hashes).filter(r => hashes[r].sha256 !== depois[r].sha256);
  gravarJson(raiz, "verificacao/hashes-depois.json", { formato: "nat74-hashes-1.0.0", resultados: { commit: git(RESULTADOS, "rev-parse", "HEAD"), tree: git(RESULTADOS, "rev-parse", "HEAD^{tree}") },
    arquivos: depois, total: Object.keys(depois).length, iguaisAoAntes: mudaram.length === 0, mudaram });
  if (mudaram.length) falha("E13-hashes", mudaram);
  portoes.E13 = { passou: true, hashesIguais: true };
  gravarPortoes();
  log("E13 ok: hashes-depois = hashes-antes");
  return res;
}

// ───────────────────────────────────────────────────────────────── auxiliares de exportação

/** Limites verdadeiros de D num par (por variante): mínimo e máximo admissíveis por braço de agente. */
function limitesParaPar(pd: ParDerivado, k: ReturnType<typeof contagemArmada>, m: Montagem, cl: Map<string, AtomoClassificado>, c: Campanha,
  vinculoT3: (chave: string) => unknown): LimitesDoPar {
  const specDe = new Map(pd.novo.units.map(u => [u.id, u.specId]));
  const contar = contador(MODO_D[c], u => specDe.get(u), "A-");
  const t = tradutor(pd.mapa);
  // Pendentes: os da montagem e os que o scorer deixa pendentes (átomo `unresolved`: evidência indisponível, R9).
  const pend = new Set([...m.pendentes, ...k.score.scores.flatMap(s => s.pendingCardIds)]);
  const deOrig = new Map(pd.mapa.cartoes.map(x => [x.para, x.de]));
  const braco = (runId: string): BracoLimite => {
    const s = k.score.scores.find(x => x.runId === runId)!;
    const adm = new Set<string>();
    for (const cid of pd.novo.runs.find(r => r.id === runId)!.cardIds) {
      if (!pend.has(cid)) continue;
      const card = pd.novo.cards.find(x => x.id === cid)!;
      for (const u of card.candidateUnitIds) adm.add(u);
      const orig = deOrig.get(cid)!;
      const cenas = new Set([card.scene, ...card.subjects.map(sj => sj.scene ?? card.scene)]);
      for (const a of pd.p.reviews.decisions.find(d => d.cardId === orig)?.atoms ?? []) {
        for (const u of a.unitIds) adm.add(t.unidade(u));
        // a spec que o juiz da T3 vinculou, mesmo sem crédito ainda (ex.: aplicabilidade incerta)
        const vj = vinculoT3(chaveAtomo(c, pd.p.par, orig, a.id));
        const specJuiz = vj && typeof vj === "object" ? (vj as { spec: string }).spec : null;
        if (specJuiz) for (const u of pd.novo.units) if (u.specId === specJuiz && cenas.has(u.scene)) adm.add(u.id);
        for (const p of cl.get(chaveAtomo(c, pd.p.par, orig, a.id))?.partes ?? [])
          if (p.spec) for (const u of pd.novo.units) if (u.specId === p.spec && cenas.has(u.scene)) adm.add(u.id);
      }
    }
    return { confirmadas: new Set(s.matched.map(x => x.unitId)), admissiveis: adm };
  };
  const r = limitesDoPar({ sem: braco(k.runs.sem), com: braco(k.runs.com) }, contar);
  const agenda = (b: ContagemBraco) => (MODO_D[c] === "spec" ? b.specs : b.sorteadas);
  if (r.sem.min !== agenda(k.sem) || r.com.min !== agenda(k.com)) throw new Error(`limites: o mínimo não é a contagem da agenda em ${c}/${pd.p.par}`);
  return r;
}

function materialidade(): Map<string, string> {
  const inv = lerJson<{ casos: { campanha: string; par: string; cardId: string; materialPrincipal: boolean; materialSecundarioP: boolean; materialLinhaDeBase: boolean }[] }>(join(NAT73, "inventario-casos-materiais.json")).casos;
  return new Map(inv.map(c => [`${c.campanha}|${c.par}|${c.cardId}`, c.materialPrincipal ? "D" : c.materialSecundarioP ? "P" : c.materialLinhaDeBase ? "LB" : "nao"]));
}

function unidadesConfirmadasSpec(pkg: SemanticPackage, s: ReturnType<typeof scoreSemanticPackage>["scores"][number], spec: string): boolean {
  const u = new Map(pkg.units.map(x => [x.id, x.specId]));
  return s.matched.some(m => u.get(m.unitId) === spec);
}

function linhasDeUnidades(pd: ParDerivado, score: ReturnType<typeof scoreSemanticPackage>, inv: Inventario): Record<string, unknown>[] {
  const antes = scoreSemanticPackage(pd.p.pkg, pd.p.reviews);
  const mapaU = new Map(pd.mapa.unidades.map(x => [x.de, x.para]));
  const out: Record<string, unknown>[] = [];
  const bracoDoRun = new Map<string, string>();
  for (const [k, v] of inv.bracoPorChave) if (k.startsWith(`${pd.p.campanha}|${pd.p.par}|`)) bracoDoRun.set(v.runId, v.braco);
  for (const r of pd.novo.runs) {
    const sA = antes.scores.find(s => s.runId === r.id)!, sN = score.scores.find(s => s.runId === r.id)!;
    const antesU = new Set(sA.matched.map(m => mapaU.get(m.unitId)!));
    for (const u of pd.novo.units) {
      const depois = sN.matched.filter(m => m.unitId === u.id);
      if (!antesU.has(u.id) && !depois.length) continue;
      out.push({ campanha: pd.p.campanha, par: pd.p.par, braco: bracoDoRun.get(r.id) ?? (r.kind === "agente" ? "?" : r.tool === "axe-core" ? "lb-axe" : "lb-validator"), runId: r.id,
        specId: u.specId, unitId: u.id, elemento: u.element.key, estado: u.state, confirmadaAntes: antesU.has(u.id), confirmadaDepois: depois.length > 0,
        cartoesDepois: depois.map(m => `${m.cardId}/${m.atomId}${m.vinculo ? `(vinculo:${m.vinculo})` : ""}`).join(";"), variante: "principal" });
    }
  }
  return out;
}

function linhaTrilha(a: AtomoArquivado, b: Braco, inv: Inventario, cls: AtomoClassificado, p: ParteClassificada, v: Variante, pd: ParDerivado, m: Montagem,
  material: Map<string, string>, e: AtomoEntrada): Record<string, unknown> {
  const novoId = pd.mapa.cartoes.find(x => x.de === a.cardIdOriginal)!.para;
  const dec = m.reviews.decisions.find(d => d.cardId === novoId)!;
  const at = dec.atoms.find(x => x.id === idDaParte(a.atomoId, p.indice)) ?? null;
  const link = at?.links?.[0] ?? null;
  const vinc = m.vinculos.find(x => x.cardIdOriginal === a.cardIdOriginal && x.atomoId === a.atomoId && x.parte === p.indice);
  const creditoAntes = a.decisao === "defeito-do-gabarito";
  const creditoDepois = dec.status === "reviewed" && at?.verdict === "reference";
  const veredito = e.veredito?.vigente;
  const unidadesNovas = at?.unitIds.map(id => `${pd.novo.units.find(u => u.id === id)!.specId}:${id}`).join(";") ?? "";
  const diferenca = dec.status !== "reviewed" ? `${a.decisao} → pendente (${cls.motivoFila ?? "recusado ou classe pendente"})`
    : creditoAntes === creditoDepois ? (creditoAntes ? "crédito mantido" : `sem crédito (${a.decisao} → ${p.classe})`)
    : creditoDepois ? `${a.decisao} → ${p.classe}, ${p.spec}${link ? ` por vínculo ${link.relation}` : ""}` : `${a.decisao} → ${p.classe}, perde o crédito`;
  return {
    chave: a.chave, campanha: a.campanha, tela: a.tela, par: a.par, braco: b, runId: inv.bracoPorChave.get(a.chave)!.runId,
    cardIdOriginal: a.cardIdOriginal, cardIdDerivado: novoId, cardSha256: a.cardSha256, mId: a.mId, atomoId: a.atomoId, parte: p.indice, sujeitos: p.sujeitos.join(";"),
    cena: a.cena, estadoSha256: a.estadoSha256, regraCitada: p.regraCitada, forcaDaCitacao: p.forcaDaCitacao, aplicabilidadeDaCitada: p.aplicabilidadeDaCitada,
    decisaoAntiga: a.decisao, unidadesAntigas: a.unidades.map(u => `${u.specId}:${u.unitId}`).join(";"), citacaoAntiga: a.citacao,
    verdadeFactual: p.verdadeFactual, normaId: p.normaId, normaForca: p.normaForca, normaAplicabilidade: p.normaAplicabilidade, normaViolada: p.normaViolada,
    origemMedida341: e.origem341, origemMedida370: e.origem370, origemAutora: veredito && veredito.juiz.startsWith("autora") ? p.origemJuiz : null,
    vinculoUnidade: link?.unitId ?? null, vinculoSpec: vinc?.spec ?? (p.credito ? p.spec : null), vinculoRelacao: link?.relation ?? null,
    vinculoEvidencia: link ? link.evidence.join(" | ") : null, vinculoAssinatura: link?.reviewer ?? null, vinculoAceitoPeloScorer: vinc ? vinc.aceito : null,
    unidadesNovas, qualidadeDaSugestao: p.qualidadeDaSugestao, classe: p.classe, classe120: v === "S1" ? null : p.classe, classe110: null,
    elegivelI: elegibilidade(p.classe, "I", v === "S6"), elegivelII: elegibilidade(p.classe, "II"), juiz: cls.juiz, tratamento: cls.tratamento,
    regraDaPolitica: p.regraDaPolitica, motivo: p.motivo, evidencia: cls.fontes.join(";"), politicaVersao: v === "S1" ? POLITICA_SENSIBILIDADE : POLITICA_PRINCIPAL,
    variante: v, aposRevelacao: cls.aposRevelacao, aposOrientacao: cls.aposOrientacao, material: material.get(`${a.campanha}|${a.par}|${a.cardIdOriginal}`) ?? "nao",
    mudouCredito: creditoAntes !== creditoDepois, diferenca,
  };
}

function linhasDeBase(porVariante: Record<string, Record<string, unknown>>, precisao: Record<string, unknown>, maturidade: Record<string, unknown>) {
  const out: Record<string, unknown> = { formato: "nat74-linhas-de-base-1.0.0", telas: {} };
  for (const c of CAMPANHAS) {
    const x = (porVariante.principal[c] as { pares: { par: string; lbAxe: { status: string; unidades: number; total: number; pendentes: number; b16: boolean } | null;
      lbValidator: { status: string; unidades: number; total: number; pendentes: number } | null }[] });
    const s1 = (porVariante.S1[c] as typeof x);
    const ferramenta = (k: "lbAxe" | "lbValidator", nome: string) => {
      const ps = x.pares.map(p => p[k]).filter(Boolean) as NonNullable<typeof x.pares[number]["lbAxe"]>[];
      const pend = ps.reduce((n, p) => n + p.pendentes, 0);
      const M = ((maturidade as Record<string, Record<string, Record<string, { pendentes: number; porJuiz: Record<string, number> }>>>).principal[c][nome]);
      return { estado: pend || M?.pendentes ? "PROVISORIO" : "FINAL-DERIVADO", pendentes: { scorer: pend, atomos: M?.pendentes ?? 0 }, porJuiz: M?.porJuiz ?? {},
        recall: pend ? null : { confirmadas: ps.reduce((n, p) => n + p.unidades, 0), total: ps.reduce((n, p) => n + p.total, 0) },
        confirmadasAteAgora: ps.reduce((n, p) => n + p.unidades, 0), total: ps.reduce((n, p) => n + p.total, 0),
        precisao120: { I: (precisao as never)["principal"][c]["I"]?.[nome] ?? null, II: (precisao as never)["principal"][c]["II"]?.[nome] ?? null },
        precisao110: { I: (precisao as never)["S1"][c]["I"]?.[nome] ?? null, II: (precisao as never)["S1"][c]["II"]?.[nome] ?? null },
        ...(k === "lbAxe" && TELA[c] === "B" ? { b16: { confirmadaPorPar: Object.fromEntries(x.pares.map(p => [p.par, p.lbAxe?.b16 ?? null])),
          s1: Object.fromEntries(s1.pares.map(p => [p.par, p.lbAxe?.b16 ?? null])) } } : {}) };
    };
    (out.telas as Record<string, unknown>)[c] = { axe: ferramenta("lbAxe", "lb-axe"), validator: ferramenta("lbValidator", "lb-validator") };
  }
  const b = ((out.telas as Record<string, { axe: { estado: string; b16: { confirmadaPorPar: Record<string, boolean | null> } } }>)["t7-tela-b-01"]).axe;
  out.b16 = { resolucao: "P10: dois átomos por medida (ícone do Sair → B-16; logo alt=\"logo\" → erro factual)",
    confirmadaEm: Object.values(b.b16.confirmadaPorPar).filter(Boolean).length, de: 10, axeB: b.estado,
    leitura: b.estado === "FINAL-DERIVADO" ? "LB axe B FINAL-DERIVADO" : "B-16 resolvida, mas a LB axe B segue PROVISÓRIA: há outros átomos do axe B pendentes pela triagem; o recall dela não é anunciado" };
  return out;
}

function autoraJson(ver: SaidaVereditos, porVariante: Record<string, Record<string, unknown>>) {
  const casos = [...ver.autora].map(([caso, v]) => ({ caso, correcoes: v.correcoes, revisitas: v.revisitas, aposRevelacao: v.vigente.aposRevelacao,
    aposOrientacao: v.vigente.aposOrientacao, rotulo: v.vigente.rotulo, classeCega: v.cego.partes.map(p => p.classe), classeVigente: v.vigente.partes.map(p => p.classe),
    vinculoCego: v.cego.partes.map(p => p.vinculo?.unidade ?? null), vinculoVigente: v.vigente.partes.map(p => p.vinculo?.unidade ?? null) }))
    .filter(x => x.correcoes.length || x.revisitas.length);
  const origem = lerJson<{ divergencia: { caso: string }[] }>(join(NAT73, "origem", "origem-medida.json")).divergencia
    .filter(d => ["N-03", "N-08", "R-15", "R-14", "N-02"].includes(d.caso));
  const efeitoS3 = Object.fromEntries(CAMPANHAS.map(c => [c, { principal: (porVariante.principal[c] as { d: number[] }).d, S3: (porVariante.S3[c] as { d: number[] }).d }]));
  return { formato: "nat74-autora-1.0.0", corte: { regra: "conservadora (E5): gravado depois do último julgamento cego da rodada 2, nos casos citados na orientação", instante: "2026-10-16T10:04:48.951Z" },
    contagens: { correcoesPosRevelacao: casos.filter(c => c.correcoes.length).length, revisitasPosRevelacao: casos.filter(c => c.revisitas.length).length, aposOrientacao: casos.filter(c => c.aposOrientacao).length },
    casos, divergenciasDeOrigem: origem, r14: "autora: violação de origem página por 3.3.1; pela P3 a seria erro normativo; vale o veredito dela (não move D), sinalizado",
    efeitoS3NoD: efeitoS3 };
}

const fmt = (x: number | null | undefined, n = 2) => (x === null || x === undefined ? "—" : x.toFixed(n).replace(".", ","));

type Lim = { d: number[]; media: number | null };
type Ic = { inferior: number | null; superior: number | null };
type VarR = { d: number[]; descricao: string; estado: string; limites: { inferior: Lim; superior: Lim };
  cenarios: { semCreditoPendente: Lim & { ic95: Ic; p: number | null }; comCreditoArquivadoRestaurado: Lim & { ic95: Ic; p: number | null } };
  pontual: null | { d: number[]; media: number | null; ic95: Ic; p: number | null; wilcoxonP: number | null; sinalP: number | null };
  maturidade: { sem: { estado: string; pendentes: number }; com: { estado: string; pendentes: number } } };
type R = { oficial: { media: number; ic95: [number, number]; p: number }; variantes: Record<string, VarR> };
type FilasRelatorio = { porCampanhaBraco: Record<string, Record<string, Record<string, number>>>;
  pendentesCreditadosNoArquivo: Record<string, Record<string, { total: number; motivos: Record<string, number> }>>; m1: Record<string, Record<string, Record<string, number>>> };

/** D por par para leitura: o valor, ou [mín, máx] quando os limites não colapsam. */
const dLegivel = (v: VarR): string => v.limites.inferior.d.map((a, i) => (a === v.limites.superior.d[i] ? `${a}` : `[${a}, ${v.limites.superior.d[i]}]`)).join(", ");

function paginaResultados(resultados: Record<string, unknown>, lbs: Record<string, unknown>, filas: FilasRelatorio): string {
  const L: string[] = [`# Reanálise retrospectiva NAT-74 — derivado ${DERIVADO_VERSAO}`, "",
    "> **Retrospectiva · exploratória · mudança de medida.** O resultado oficial não muda: [RESULTADOS.md](../../../RESULTADOS.md), D-97, D-111 e D-112 (D-21).",
    "> Toda mudança de precisão aqui é mudança de medida, não melhora do detector. Política principal `politica-normativa-1.2.0`; a 1.1.0 vai ao lado (S1).",
    "> Os vereditos novos da fila T3 são de LLM (assistente, subagentes cegos por lote; D-130), salvo os materiais revistos pela autora.", "",
    "## Variante principal, por campanha", "",
    "FINAL-DERIVADO: sem pendente nos braços; D é pontual, com IC 95% e p. PROVISÓRIO: D sai como **limites verdadeiros** por par ([mín, máx]: o",
    "mínimo do braço com contra o máximo do braço sem, e vice-versa); média, IC e p não são manchete.", "",
    "| Campanha | Estado | D por par | Média | IC 95% | p (permutação) | Oficial (média · IC · p) | Pendentes sem / com |", "|---|---|---|---|---|---|---|---|"];
  for (const c of CAMPANHAS) {
    const r = resultados[c] as R, v = r.variantes.principal, of = `${fmt(r.oficial.media)} · ${fmt(r.oficial.ic95[0])} a ${fmt(r.oficial.ic95[1])} · ${fmt(r.oficial.p, 4)}`;
    const pend = `${v.maturidade.sem.pendentes} / ${v.maturidade.com.pendentes}`;
    if (v.pontual) L.push(`| ${ROTULO[c]} (\`${c}\`, ${MODO_D[c]}) | ${v.estado} | ${v.pontual.d.join(", ")} | ${fmt(v.pontual.media)} | ${fmt(v.pontual.ic95.inferior)} a ${fmt(v.pontual.ic95.superior)} | ${fmt(v.pontual.p, 4)} | ${of} | ${pend} |`);
    else L.push(`| ${ROTULO[c]} (\`${c}\`, ${MODO_D[c]}) | ${v.estado} | ${dLegivel(v)} | ${fmt(v.limites.inferior.media)} a ${fmt(v.limites.superior.media)} | — | — | ${of} | ${pend} |`);
  }
  L.push("", "### Átomos creditados no arquivo e ainda pendentes, por braço", "", "| Campanha | Braço | Pendentes creditados no arquivo | Motivos |", "|---|---|---|---|");
  for (const c of CAMPANHAS) for (const [b, x] of Object.entries(filas.pendentesCreditadosNoArquivo[c] ?? {}).sort())
    L.push(`| ${ROTULO[c]} | ${b} | ${x.total} | ${Object.entries(x.motivos).sort().map(([m, n]) => `${m} (${n})`).join("; ")} |`);
  L.push("", "### M1: arquivo creditado com origem medida não-página", "",
    "Átomo de arquivo creditado (defeito-do-gabarito) cuja origem medida é DS ou indeterminada segue a regra do átomo julgado: DS vira novo correto sem crédito (P3); indeterminada sai da análise I. Contagem por variante (campanha · braço):", "");
  for (const v of VARIANTES) L.push(`- ${v}: ${CAMPANHAS.map(c => `${ROTULO[c]} ${Object.entries(filas.m1[v]?.[c] ?? {}).sort().map(([b, n]) => `${b} ${n}`).join(", ") || "0"}`).join(" · ")}`);
  L.push("", "<details><summary>Cenários (não são limites): sem crédito pendente × com crédito arquivado restaurado</summary>", "",
    "Mudam os dois braços ao mesmo tempo; por isso o segundo pode baixar D (revisão independente, NAT-74). Média, IC e p só como registro.", "",
    "| Campanha | Cenário | D por par | Média | IC 95% | p |", "|---|---|---|---|---|---|");
  for (const c of CAMPANHAS) {
    const cen = (resultados[c] as R).variantes.principal.cenarios;
    for (const [k, x] of [["sem crédito pendente", cen.semCreditoPendente], ["com crédito arquivado restaurado", cen.comCreditoArquivadoRestaurado]] as const)
      L.push(`| ${ROTULO[c]} | ${k} | ${x.d.join(", ")} | ${fmt(x.media)} | ${fmt(x.ic95.inferior)} a ${fmt(x.ic95.superior)} | ${fmt(x.p, 4)} |`);
  }
  L.push("", "</details>", "", "### S7: sem-evidencia → pendente", "",
    "Átomos julgados na T3 cujo cartão traz a sinalização `sem-evidencia` (nenhuma evidência resolvida, nenhum fato medido) e cujo fato verdadeiro é só inferido viram pendentes (R9): os juízes trataram fatos só de texto de modos diferentes.", "",
    "| Campanha | Afetados por braço | D principal | D na S7 |", "|---|---|---|---|");
  for (const c of CAMPANHAS) {
    const r = resultados[c] as R & { semEvidencia: { afetadosPorBraco: Record<string, number> } };
    L.push(`| ${ROTULO[c]} | ${Object.entries(r.semEvidencia.afetadosPorBraco).sort().map(([b, n]) => `${b} ${n}`).join(", ") || "0"} | ${r.variantes.principal.pontual ? r.variantes.principal.pontual.d.join(", ") : dLegivel(r.variantes.principal)} | ${r.variantes.S7.pontual ? r.variantes.S7.pontual.d.join(", ") : dLegivel(r.variantes.S7)} |`);
  }
  L.push("", "## Fila T3 residual desta versão (E6)", "", "| Campanha | Braço | T1 | julgado | T2 | T3 | pendente |", "|---|---|---|---|---|---|---|");
  for (const [c, bs] of Object.entries(filas.porCampanhaBraco)) for (const [b, f] of Object.entries(bs).sort()) L.push(`| ${ROTULO[c as Campanha]} | ${b} | ${f.T1} | ${f.julgado} | ${f.T2} | ${f.T3} | ${f.pendente} |`);
  const b16 = (lbs as { b16: { leitura: string; confirmadaEm: number } }).b16;
  L.push("", "## Linhas de base", "", `B-16 (axe image-alt, tela B): confirmada em ${b16.confirmadaEm}/10 pares. ${b16.leitura}.`, "", "<details><summary>Sensibilidades (S1–S6)</summary>", "");
  for (const c of CAMPANHAS) {
    const r = resultados[c] as R;
    L.push(`### ${ROTULO[c]}`, "", "| Variante | Estado | D por par | Média |", "|---|---|---|---|");
    for (const v of VARIANTES) { const x = r.variantes[v];
      L.push(`| ${v} — ${x.descricao} | ${x.estado} | ${x.pontual ? x.pontual.d.join(", ") : dLegivel(x)} | ${x.pontual ? fmt(x.pontual.media) : `${fmt(x.limites.inferior.media)} a ${fmt(x.limites.superior.media)}`} |`); }
    L.push("");
  }
  L.push("</details>", "", "## Histórico", "", "D-111 adendo (regex aproximado, não recalculado): D = 1, 1, −3, 0, 1, 1, 0, 2, −2, 3; média +0,40; p = 0,60.", "");
  return L.join("\n");
}

function leiaMe(x: { julgamentos: Record<string, unknown>[]; rejulgados: number; t2: Record<string, number>; resultados: Record<string, unknown> }): string {
  const estados = CAMPANHAS.map(c => `${ROTULO[c]}: ${((x.resultados[c] as R).variantes.principal).estado}`).join(" · ");
  return [`# ${DERIVADO_VERSAO}`, "", "**Retrospectiva · exploratória · mudança de medida.** Derivado da NAT-74. Não substitui o resultado oficial",
    "(`govbr-resultados/RESULTADOS.md`; D-97, D-111, D-112). Versão nova = pasta irmã, nunca sobrescrita; a 1.0.0 fica como está.", "",
    `Estado (variante principal): ${estados}.`, "",
    "- Plano: `thesis-workspace/planejamento/atual/plano-nat74-reanalise-2026-10-16.md` (E14 = fila T3).",
    "- Política: `politica-normativa-1.2.0` (sha256 em `entradas/ferramenta.json`), 1.1.0 ao lado (S1).",
    `- Entradas fixadas (E0): arquivo original em \`${COMMIT_RESULTADOS}\` (fora de derivados/, idêntico), derivado 1.0.0 em \`${COMMIT_DERIVADO_100}\` (pacotes flow-semantic-1.7.0 reutilizados, não repreparados), julgamentos e medidas da T2 por sha256 (\`entradas/ferramenta.json\`).`,
    `- Julgamentos da fila T3 (LLM cego por lote, D-130): ${x.julgamentos.length ? x.julgamentos.map(j => `\`${j.arquivo}\` (${j.julgados}/${j.total}${j.completo ? ", completo" : ""})`).join("; ") : "nenhum"}${x.rejulgados ? `; ${x.rejulgados} átomo(s) rejulgado(s) pela fila residual` : ""}.`,
    `- Medidas da T2 (\`medidas/t2/medidas-t2.json\`): ${Object.entries(x.t2).sort().map(([k, n]) => `${k} (${n})`).join("; ")}.`,
    "- D: pontual (com IC e p) quando não há pendente; senão limites verdadeiros por par. Os antigos \"limite inferior/superior\" da 1.0.0 eram cenários e saem com esse nome.", "",
    "## Errata da política (P17)", "", "O texto 1.2.0 foi congelado como está. Dois deslizes: o §5 ainda diz \"aplicar a v1.1\"; o exemplo da R15 lista R-04 como",
    "B-02, mas R-04 é a B-26 (`empty-table-header`). Corrigir o texto = 1.2.1 e o derivado roda de novo.", "",
    "## Desvios desta versão", "", "- E3 não reprepara: os 30 pacotes 1.7.0 são os da 1.0.0 (sha256 em `verificacao/hashes-antes.json`).",
    "- `trilha-atomos.json` traz só a variante principal; o CSV traz as sete.",
    "- O bloco do painel sai em `painel-bloco.json` (o gerador do painel não foi editado nesta etapa).", ""].join("\n");
}

function blocoPainel(resultados: Record<string, unknown>, lbs: Record<string, unknown>) {
  return { formato: "nat74-painel-1.1.0", titulo: "Reanálise retrospectiva (NAT-74)", derivado: DERIVADO_VERSAO, politica: POLITICA_PRINCIPAL, original: "govbr-resultados/RESULTADOS.md",
    nota: "FINAL-DERIVADO: D pontual com IC e p; PROVISÓRIO: limites verdadeiros por par (cenários à parte, não interpretáveis)",
    campanhas: CAMPANHAS.map(c => { const r = resultados[c] as R; const v = r.variantes.principal;
      return { campanha: c, rotulo: ROTULO[c], principal: { estado: v.estado, pontual: v.pontual, limites: v.pontual ? null : { inferior: v.limites.inferior, superior: v.limites.superior },
        maturidade: v.maturidade }, oficial: r.oficial }; }),
    b16: (lbs as { b16: unknown }).b16 };
}

// ───────────────────────────────────────────────────────────────── determinismo

/** Compara duas execuções byte a byte (fora `tempos`); devolve os arquivos diferentes. */
export function compararExecucoes(a: string, b: string): { iguais: number; diferentes: string[]; soEmUm: string[] } {
  const lista = (r: string, d = ""): string[] => readdirSync(join(r, d)).flatMap(f => statSync(join(r, d, f)).isDirectory() ? lista(r, join(d, f)) : [posix(join(d, f))]);
  const ignora = (p: string) => p === "verificacao/determinismo.json";
  const la = new Set(lista(a).filter(p => !ignora(p))), lb = new Set(lista(b).filter(p => !ignora(p)));
  const diferentes: string[] = [], soEmUm: string[] = [];
  let iguais = 0;
  for (const p of [...new Set([...la, ...lb])].sort()) {
    if (!la.has(p) || !lb.has(p)) { soEmUm.push(p); continue; }
    if (sha(readFileSync(join(a, p))) === sha(readFileSync(join(b, p)))) iguais++; else diferentes.push(p);
  }
  return { iguais, diferentes, soEmUm };
}

if (process.argv[1] && /pipeline\.ts$/.test(process.argv[1])) {
  const ate = (arg("etapa") ?? "E13") as Etapa;
  const j = arg("julgamentos");
  executar({ ate, raiz: arg("saida") ? resolve(arg("saida")!) : undefined, julgamentos: j === undefined ? undefined : j.split(",").filter(Boolean).map(x => resolve(x)),
    medidasT2: arg("medidas-t2") ? resolve(arg("medidas-t2")!) : undefined }).then(r => {
    const outro = arg("comparar");
    if (outro) {
      const c = compararExecucoes(r.raiz, outro);
      gravarJson(r.raiz, "verificacao/determinismo.json", { formato: "nat74-determinismo-1.0.0", comparadoCom: relative(r.raiz, outro).split("\\").join("/").replace(/^.*derivados/, "…/derivados"), ...c,
        identico: c.diferentes.length === 0 && c.soEmUm.length === 0 });
      console.log(`determinismo: ${c.iguais} iguais, ${c.diferentes.length} diferentes, ${c.soEmUm.length} só num lado`);
      if (c.diferentes.length || c.soEmUm.length) { console.log(c.diferentes.slice(0, 20), c.soEmUm.slice(0, 20)); process.exitCode = 4; }
    }
  }).catch(e => {
    if (e instanceof Portao) { console.error(`PARADO: ${e.message}\n${JSON.stringify(e.diferencas, null, 2).slice(0, 4000)}`); process.exitCode = 2; return; }
    console.error(e); process.exitCode = 1;
  });
}
export { relRes, PLANEJAMENTO, jsonTexto };
