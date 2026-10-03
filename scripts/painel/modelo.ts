/**
 * Painel de resultados (T8a) — leitura do arquivo. Biblioteca pura: recebe a raiz de um clone do
 * `govbr-resultados` e devolve as vistas que as páginas mostram. Nada aqui calcula métrica: os números
 * vêm do índice do T4 (`indice/entradas/*.json`), do pacote arquivado (`pacote/run.json`) e das saídas do
 * T6 (`summary.json`, `analysis-binding.<braço>.json`, `score.json`). Cada valor carrega a sua fonte.
 *
 * Área nova do arquivo, escrita só pelo painel (o resto é do T4 e é só lido):
 *
 *   analises/<campanha>/<par ou runId>/receita.json          entradas da análise, como caminhos do arquivo
 *   analises/<campanha>/<par ou runId>/revisoes/rev-NNN/      saída do `analisar` (pasta nova por cálculo)
 *   analises/<campanha>/<par ou runId>/revisoes/falhas/<c>/   tentativa que falhou (erro.json + parcial)
 *   analises/<campanha>/<par ou runId>/decisoes/decisoes-NNNN.json   cada gravação da revisora
 *   restauracoes/<runId>/<pasta>/                             pacote inteiro restaurado do anexo (cache)
 *
 * Método: docs/painel-resultados.md.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { AnalysisBinding, Arm, Findings, Run } from "../../contracts/index";
import type { EntradaIndice } from "../arquivo-resultados";
import type { Resumo } from "../analisar-execucao";
import type { RawReviews, SemanticPackage } from "../semantic-flow";

export const PAINEL_VERSAO = "painel-resultados-1.0.0";
export const RECEITA_VERSAO = "receita-analise-1.0.0";
export const DECISOES_VERSAO = "decisoes-painel-1.0.0";
export const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const ARMS: Arm[] = ["sem", "com"];

// ───────────────────────────────────────────────────────────────── caminhos

/** Resolve `rel` dentro do arquivo. Recusa absoluto, `..`, barra invertida e qualquer escape. */
export function dentroDoArquivo(arquivo: string, rel: string): string {
  if (typeof rel !== "string" || !rel || isAbsolute(rel) || rel.includes("\\") || rel.split("/").some(p => p === ".." || p === "")) {
    throw new Error(`caminho fora do arquivo: ${String(rel)}`);
  }
  const alvo = resolve(arquivo, rel);
  const r = relative(resolve(arquivo), alvo);
  if (!r || r.startsWith("..") || isAbsolute(r)) throw new Error(`caminho fora do arquivo: ${rel}`);
  return alvo;
}

const posix = (p: string): string => p.split(sep).join("/");
export const relArquivo = (arquivo: string, abs: string): string => posix(relative(resolve(arquivo), abs));

function lerJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, "")) as T;
}
function tentarJson<T>(path: string): { ok: true; valor: T } | { ok: false; erro: string } {
  try { return { ok: true, valor: lerJson<T>(path) }; } catch (e) { return { ok: false, erro: e instanceof Error ? e.message : String(e) }; }
}
const subpastas = (dir: string): string[] => existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort() : [];

// ───────────────────────────────────────────────────────────────── datas

const LOCAL = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
export const dataLocal = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${LOCAL.format(d)} (Brasília)`;
};

// ───────────────────────────────────────────────────────────────── fonte de cada valor

/** De onde um valor veio: arquivo (relativo ao arquivo), campo, versão do formato, data e pacote. */
export interface Fonte { arquivo: string; campo: string; versao: string | null; atualizadoEm: string | null; pacote: string | null }
export interface Valor<T = string | number | null> { valor: T; texto: string; fonte: Fonte }

// ───────────────────────────────────────────────────────────────── receita e análise

export interface Receita {
  formato: typeof RECEITA_VERSAO;
  fixture: boolean;
  campanha: string;
  /** `par`: análise de um par sem/com; `individual`: uma execução. */
  tipo: "par" | "individual";
  /** Pasta da análise: o id do par ou o runId. */
  alvo: string;
  /** Chave do índice de cada braço (runId). */
  execucoes: Partial<Record<Arm, string>>;
  /** Pacote INTEIRO de cada braço (com evidence/), caminho dentro do arquivo. */
  pacotes: Partial<Record<Arm, string>>;
  entradas: {
    campanha: string; snapshots: string; referencia: string;
    /** Pasta do site congelado dentro do arquivo; null = usar `--telas` (clone do govbr-telas). */
    site: string | null;
    linhaDeBase: string | null;
    semLinhaDeBase: boolean;
  };
  criadaEm: string;
  nota?: string;
}

export interface Revisao {
  numero: number; nome: string; dir: string; rel: string;
  resumo: Resumo; bindings: Partial<Record<Arm, AnalysisBinding>>;
}
export interface Falha { carimbo: string; em: string; motivo: string; rel: string }
export interface VersaoDecisoes { numero: number; nome: string; rel: string; meta: MetaDecisao | null }
export interface MetaDecisao {
  formato: typeof DECISOES_VERSAO; versao: number; salvoEm: string; revisora: string; cartao: string; decisao: string;
  justificativa: string; baseadaEm: { revisao: string; decisoes: string | null };
}

export interface Analise {
  id: string; campanha: string; alvo: string; dir: string; rel: string;
  receita: Receita | null; erroReceita: string | null;
  revisoes: Revisao[]; atual: Revisao | null;
  falhas: Falha[]; ultimaFalhaDepoisDaAtual: Falha | null;
  decisoes: VersaoDecisoes[];
  avisos: string[];
}

const NOME_REV = /^rev-(\d{3,})$/;
const NOME_DEC = /^decisoes-(\d{4,})\.json$/;

/**
 * Uma revisão (saída do `analisar`) lida de uma pasta qualquer — do arquivo ou de um download extraído.
 * Devolve o aviso em texto quando a pasta está incompleta: ela é ignorada, nunca mostrada como nova.
 */
export function lerRevisao(rdir: string, nome: string, rel: string): Revisao | string {
  const m = NOME_REV.exec(nome);
  const s = tentarJson<Resumo>(join(rdir, "summary.json"));
  if (!s.ok) return `A revisão ${nome} está incompleta (summary.json ausente ou ilegível) e foi ignorada; a anterior íntegra continua valendo`;
  const bindings: Partial<Record<Arm, AnalysisBinding>> = {};
  for (const arm of ARMS) {
    const p = join(rdir, `analysis-binding.${arm}.json`);
    if (!existsSync(p)) continue;
    const b = tentarJson<AnalysisBinding>(p);
    if (!b.ok) return `A revisão ${nome} tem binding ilegível e foi ignorada`;
    bindings[arm] = b.valor;
  }
  return { numero: m ? Number(m[1]) : 0, nome, dir: rdir, rel, resumo: s.valor, bindings };
}

export function lerAnalise(arquivo: string, campanha: string, alvo: string): Analise | null {
  if (!ID.test(campanha) || !ID.test(alvo)) return null;
  const dir = join(arquivo, "analises", campanha, alvo);
  if (!existsSync(join(dir, "receita.json"))) return null;
  const avisos: string[] = [];
  const r = tentarJson<Receita>(join(dir, "receita.json"));
  const receita = r.ok && r.valor.formato === RECEITA_VERSAO ? r.valor : null;
  const erroReceita = r.ok ? (receita ? null : `formato desconhecido: ${String((r.valor as { formato?: unknown }).formato)}`) : r.erro;
  if (erroReceita) avisos.push(`A receita.json está ilegível (${erroReceita}): não dá para recalcular esta análise`);

  const revisoes: Revisao[] = [];
  for (const nome of subpastas(join(dir, "revisoes"))) {
    if (!NOME_REV.test(nome)) continue;
    const rdir = join(dir, "revisoes", nome);
    const r = lerRevisao(rdir, nome, relArquivo(arquivo, rdir));
    if (typeof r === "string") avisos.push(r); else revisoes.push(r);
  }
  revisoes.sort((a, b) => b.numero - a.numero);
  // a atual é a última íntegra que não foi recusada (recusada não tem números; é tratada como falha)
  const atual = revisoes.find(rv => rv.resumo.analise.estado !== "recusada") ?? null;

  const falhas: Falha[] = [];
  for (const carimbo of subpastas(join(dir, "revisoes", "falhas"))) {
    const p = join(dir, "revisoes", "falhas", carimbo, "erro.json");
    const e = tentarJson<{ em: string; motivo: string }>(p);
    falhas.push({ carimbo, em: e.ok ? e.valor.em : carimbo, motivo: e.ok ? e.valor.motivo : "erro.json ilegível", rel: relArquivo(arquivo, join(dir, "revisoes", "falhas", carimbo)) });
  }
  falhas.sort((a, b) => b.em.localeCompare(a.em));
  const ultima = falhas[0] ?? null;
  const ultimaFalhaDepoisDaAtual = ultima && (!atual || ultima.em > atual.resumo.geradoEm) ? ultima : null;
  if (ultimaFalhaDepoisDaAtual) {
    avisos.push(atual
      ? `A última tentativa de recalcular, em ${dataLocal(ultimaFalhaDepoisDaAtual.em)}, falhou: ${ultimaFalhaDepoisDaAtual.motivo}. Os números mostrados são da ${atual.nome}, a última versão íntegra.`
      : `A tentativa de calcular, em ${dataLocal(ultimaFalhaDepoisDaAtual.em)}, falhou: ${ultimaFalhaDepoisDaAtual.motivo}. Ainda não há versão íntegra.`);
  }

  const decisoes: VersaoDecisoes[] = [];
  const ddir = join(dir, "decisoes");
  if (existsSync(ddir)) {
    for (const nome of readdirSync(ddir).sort()) {
      const m = NOME_DEC.exec(nome);
      if (!m) continue;
      const d = tentarJson<RawReviews & { _painel?: MetaDecisao }>(join(ddir, nome));
      if (!d.ok) { avisos.push(`As decisões ${nome} estão ilegíveis: ignoradas (a versão anterior continua valendo)`); continue; }
      decisoes.push({ numero: Number(m[1]), nome, rel: relArquivo(arquivo, join(ddir, nome)), meta: d.valor._painel ?? null });
    }
  }
  decisoes.sort((a, b) => b.numero - a.numero);
  return { id: `${campanha}/${alvo}`, campanha, alvo, dir, rel: relArquivo(arquivo, dir), receita, erroReceita, revisoes, atual,
    falhas, ultimaFalhaDepoisDaAtual, decisoes, avisos };
}

export function listarAnalises(arquivo: string): Analise[] {
  const out: Analise[] = [];
  for (const c of subpastas(join(arquivo, "analises"))) {
    if (!ID.test(c)) continue;
    for (const a of subpastas(join(arquivo, "analises", c))) {
      const an = lerAnalise(arquivo, c, a);
      if (an) out.push(an);
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────── índice

export interface EntradaLida { entrada: EntradaIndice | null; arquivoEntrada: string; erro: string | null }

export function lerIndice(arquivo: string): EntradaLida[] {
  const dir = join(arquivo, "indice", "entradas");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".json")).sort().map(f => {
    const r = tentarJson<EntradaIndice>(join(dir, f));
    const arquivoEntrada = `indice/entradas/${f}`;
    if (!r.ok) return { entrada: null, arquivoEntrada, erro: r.erro };
    const e = r.valor;
    if (!e || typeof e.chave !== "string" || !ID.test(e.chave) || typeof e.caminho !== "string") return { entrada: null, arquivoEntrada, erro: "entrada fora do formato do índice" };
    try { dentroDoArquivo(arquivo, e.caminho); } catch { return { entrada: null, arquivoEntrada, erro: `caminho inválido: ${e.caminho}` }; }
    return { entrada: e, arquivoEntrada, erro: null };
  });
}

/** O arquivo é fixture se o marcador existe ou alguma entrada é ensaio. */
export function ehFixture(arquivo: string, entradas: EntradaLida[]): boolean {
  return existsSync(join(arquivo, "FIXTURE-SINTETICA.md")) || entradas.some(e => e.entrada?.natureza === "ensaio");
}

// ───────────────────────────────────────────────────────────────── estados com nome próprio

export type Estado =
  | "ok" | "pendente" | "provisoria" | "final" | "falha" | "findings-vazio" | "sem-submissao" | "par-incompleto"
  | "publicacao-indisponivel" | "sem-analise" | "bloqueada" | "nao-se-aplica" | "aviso";

export interface Selo { estado: Estado; texto: string }

const TECNICO: Record<string, string> = {
  passed: "rodou até o fim", failed: "falhou", interrupted: "interrompida", "not-run": "não rodou (modelo não chamado)",
};
export const rotuloTecnico = (t: string | null): string => (t ? TECNICO[t] ?? t : "desconhecido");

const PONTUACAO: Record<string, Selo> = {
  final: { estado: "final", texto: "final (revisão fechada)" },
  provisional: { estado: "provisoria", texto: "provisória (há cartões pendentes)" },
  "pending-review": { estado: "pendente", texto: "aguardando revisão" },
  "not-prepared": { estado: "bloqueada", texto: "não preparada" },
  "not-applicable": { estado: "nao-se-aplica", texto: "não se aplica (sem achados para pontuar)" },
};
export const seloPontuacao = (s: string): Selo => PONTUACAO[s] ?? { estado: "aviso", texto: s };

/** Publicação: o pacote foi arquivado e o anexo de evidências confirmado na Release? */
export function seloPublicacao(e: EntradaIndice): Selo {
  if (e.estado.arquivo === "retido-segredo") return { estado: "publicacao-indisponivel", texto: "retida: credencial no pacote, nada publicado" };
  if (e.estado.arquivo === "pacote-invalido") return { estado: "publicacao-indisponivel", texto: "pacote arquivado com problemas" };
  if (e.estado.arquivo === "sem-pacote") return { estado: "falha", texto: "sem pacote (execução interrompida)" };
  const ev = e.evidencias;
  if (!ev || ev.estado === "nao-se-aplica") return { estado: "ok", texto: "arquivada" };
  if (ev.estado === "confirmado") return { estado: "ok", texto: "arquivada; anexo confirmado" };
  if (ev.estado === "falhou") return { estado: "publicacao-indisponivel", texto: "anexo de evidências não publicado (falhou)" };
  return { estado: "publicacao-indisponivel", texto: "anexo de evidências pendente (ainda não confirmado)" };
}

// ───────────────────────────────────────────────────────────────── execuções

export interface Achados { estado: "lista" | "vazia" | "recusada" | "nenhuma" | "sem-pacote" | "ilegivel"; total: number | null; texto: string; fonte: string | null }

function achadosDe(arquivo: string, e: EntradaIndice): Achados {
  if (e.estado.arquivo === "sem-pacote") return { estado: "sem-pacote", total: null, texto: "sem pacote", fonte: null };
  const fRel = `${e.caminho}/pacote/findings.json`;
  const fPath = join(arquivo, fRel);
  if (!existsSync(fPath)) {
    if (e.estado.submissao === "refused") return { estado: "recusada", total: null, texto: "submissão recusada pelo coletor (não é zero achados)", fonte: `${e.caminho}/pacote/run.json` };
    return { estado: "nenhuma", total: null, texto: "nenhuma submissão (não é zero achados)", fonte: `${e.caminho}/pacote/run.json` };
  }
  const f = tentarJson<Findings>(fPath);
  if (!f.ok || !Array.isArray(f.valor.report?.findings)) return { estado: "ilegivel", total: null, texto: "findings.json ilegível", fonte: fRel };
  const n = f.valor.report.findings.length;
  return n === 0
    ? { estado: "vazia", total: 0, texto: "0 achados — lista vazia aceita (o agente olhou e não alegou nada)", fonte: fRel }
    : { estado: "lista", total: n, texto: `${n} achado(s) enviado(s)`, fonte: fRel };
}

export interface LinhaExecucao {
  chave: string; arquivoEntrada: string; natureza: "formal" | "ensaio"; campanha: string; par: string | null; slot: string | null;
  tela: string; braco: Arm | null; modelo: string | null; esforco: string | null; dataUtc: string; dataLocal: string;
  tecnico: Selo; causaFalha: string | null; achados: Achados; publicacao: Selo;
  pontuacao: Selo & { fonte: Fonte | null };
  analise: string | null; caminho: string;
}

function revisaoQueCobre(analises: Analise[], e: EntradaIndice): { an: Analise; arm: Arm } | null {
  for (const an of analises) {
    const rc = an.receita;
    if (!rc || rc.campanha !== e.campanha) continue;
    for (const arm of ARMS) if (rc.execucoes[arm] === e.chave) return { an, arm };
  }
  return null;
}

export function linhaExecucao(arquivo: string, lida: EntradaLida & { entrada: EntradaIndice }, analises: Analise[]): LinhaExecucao {
  const e = lida.entrada;
  const tec = e.estado.tecnico;
  const tecnico: Selo = e.estado.arquivo === "sem-pacote"
    ? { estado: "falha", texto: "interrompida, sem pacote" }
    : { estado: tec === "passed" ? "ok" : "falha", texto: rotuloTecnico(tec) };
  const achados = achadosDe(arquivo, e);
  const cobre = revisaoQueCobre(analises, e);
  let pontuacao: LinhaExecucao["pontuacao"];
  if (cobre?.an.atual?.bindings[cobre.arm]) {
    const rv = cobre.an.atual, b = rv.bindings[cobre.arm]!;
    pontuacao = { ...seloPontuacao(b.scoreStatus), fonte: { arquivo: `${rv.rel}/analysis-binding.${cobre.arm}.json`, campo: "scoreStatus",
      versao: b.contract, atualizadoEm: b.createdAt, pacote: e.chave } };
  } else if (e.estado.arquivo === "sem-pacote") {
    pontuacao = { estado: "nao-se-aplica", texto: "não se aplica (sem pacote)", fonte: null };
  } else {
    pontuacao = { estado: "sem-analise", texto: "sem análise no arquivo", fonte: null };
  }
  return {
    chave: e.chave, arquivoEntrada: lida.arquivoEntrada, natureza: e.natureza, campanha: e.campanha, par: e.par, slot: e.slot, tela: e.tela,
    braco: e.braco, modelo: e.modelo, esforco: e.esforco, dataUtc: e.dataUtc, dataLocal: dataLocal(e.dataUtc), tecnico,
    causaFalha: e.motivo, achados, publicacao: seloPublicacao(e), pontuacao,
    analise: cobre?.an.id ?? null, caminho: e.caminho,
  };
}

export interface VistaExecucoes {
  fixture: boolean; execucoes: LinhaExecucao[]; linhasDeBase: EntradaIndice[]; ilegiveis: { arquivo: string; erro: string }[];
  pares: VistaParResumo[];
}
export interface VistaParResumo {
  campanha: string; par: string; tela: string; modelo: string | null; dataUtc: string; bracos: Arm[]; faltando: Arm[];
  analise: string | null; selo: Selo;
}

export function vistaExecucoes(arquivo: string): VistaExecucoes {
  const lidas = lerIndice(arquivo);
  const analises = listarAnalises(arquivo);
  const validas = lidas.filter((l): l is EntradaLida & { entrada: EntradaIndice } => l.entrada !== null);
  const execucoes = validas.filter(l => l.entrada.tipo === "execucao").map(l => linhaExecucao(arquivo, l, analises))
    .sort((a, b) => b.dataUtc.localeCompare(a.dataUtc) || a.chave.localeCompare(b.chave));
  const linhasDeBase = validas.filter(l => l.entrada.tipo === "linha-de-base").map(l => l.entrada)
    .sort((a, b) => b.dataUtc.localeCompare(a.dataUtc));
  return { fixture: ehFixture(arquivo, lidas), execucoes, linhasDeBase,
    ilegiveis: lidas.filter(l => l.erro).map(l => ({ arquivo: l.arquivoEntrada, erro: l.erro! })), pares: resumoPares(execucoes, analises) };
}

function resumoPares(execucoes: LinhaExecucao[], analises: Analise[]): VistaParResumo[] {
  const grupos = new Map<string, LinhaExecucao[]>();
  for (const x of execucoes) {
    if (!x.par) continue;
    const k = `${x.campanha}/${x.par}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x]);
  }
  return [...grupos.entries()].map(([k, xs]) => {
    const [campanha, par] = k.split("/");
    const bracos = ARMS.filter(a => xs.some(x => x.braco === a));
    const faltando = ARMS.filter(a => !bracos.includes(a));
    const an = analises.find(a => a.campanha === campanha && a.alvo === par) ?? null;
    const comp = an?.atual?.resumo.comparacao ?? null;
    let selo: Selo;
    if (faltando.length) selo = { estado: "par-incompleto", texto: `par incompleto: falta o braço ${faltando.join(" e ")}` };
    else if (!an) selo = { estado: "sem-analise", texto: "sem análise no arquivo" };
    else if (!an.atual) selo = { estado: "falha", texto: "análise sem versão íntegra" };
    else if (an.atual.resumo.analise.estado === "bloqueada") selo = { estado: "bloqueada", texto: "análise bloqueada" };
    else if (comp && !comp.disponivel) selo = { estado: "nao-se-aplica", texto: "comparação indisponível" };
    else if (comp?.estado === "final") selo = { estado: "final", texto: "comparação final" };
    else selo = { estado: "pendente", texto: "comparação provisória (revisão aberta)" };
    const recente = [...xs].sort((a, b) => b.dataUtc.localeCompare(a.dataUtc))[0];
    return { campanha, par, tela: recente.tela, modelo: recente.modelo, dataUtc: recente.dataUtc, bracos, faltando, analise: an?.id ?? null, selo };
  }).sort((a, b) => b.dataUtc.localeCompare(a.dataUtc) || a.par.localeCompare(b.par));
}

// ───────────────────────────────────────────────────────────────── par

export interface LinhaMetrica { rotulo: string; valores: Partial<Record<Arm, Valor>> }
export interface VistaPar {
  fixture: boolean; campanha: string; par: string; bracos: Partial<Record<Arm, LinhaExecucao[]>>; faltando: Arm[];
  analise: Analise | null;
  metricas: LinhaMetrica[] | null;
  comparacao: { disponivel: boolean; motivo: string | null; estado: string | null; nota: string;
    diferencaUnidades: Valor<number | null>; diferencaRecall: Valor<number | null>;
    unidades: NonNullable<Resumo["comparacao"]>["unidades"]; fonte: Fonte } | null;
  achadosPorBraco: Partial<Record<Arm, { total: number; itens: { seletor: string; regra: string | null; observado: string }[] } | null>>;
  revisaoAberta: boolean;
}

const pct = (v: number | null): string => v === null ? "indisponível" : `${(v * 100).toFixed(1).replace(".", ",")}%`;
const num = (v: number | null): string => v === null ? "indisponível" : String(v);
const pp = (v: number | null): string => v === null ? "indisponível" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1).replace(".", ",")} p.p.`;
const sinal = (v: number | null): string => v === null ? "indisponível" : v > 0 ? `+${v}` : String(v);

export function fonteDoResumo(rv: Revisao, campo: string, pacote: string | null): Fonte {
  return { arquivo: `${rv.rel}/summary.json`, campo, versao: `${rv.resumo.formato} · scorer ${rv.resumo.versoes?.scorer.version ?? "?"}`,
    atualizadoEm: rv.resumo.geradoEm, pacote };
}

/** Linhas de métrica de uma revisão: SÓ valores de summary.json → execucoes[].pontuacao. */
export function metricasDaRevisao(rv: Revisao): LinhaMetrica[] {
  const ex = (arm: Arm) => rv.resumo.execucoes.find(e => e.braco === arm) ?? null;
  const idx = (arm: Arm) => rv.resumo.execucoes.findIndex(e => e.braco === arm);
  const linha = (rotulo: string, campo: string, f: (e: Resumo["execucoes"][number]) => [number | null, string]): LinhaMetrica => ({
    rotulo, valores: Object.fromEntries(ARMS.filter(a => ex(a)).map(a => {
      const [valor, texto] = f(ex(a)!);
      return [a, { valor, texto, fonte: fonteDoResumo(rv, `execucoes[${idx(a)}].${campo}`, ex(a)!.runId) }];
    })),
  });
  return [
    linha("Defeitos da referência confirmados", "pontuacao.metricas.confirmedReferenceUnits", e => {
      const m = e.pontuacao.metricas;
      return [m.confirmedReferenceUnits, m.confirmedReferenceUnits === null ? "indisponível"
        : `${m.confirmedReferenceUnits} de ${m.referenceUnits}${e.pontuacao.estado === "final" ? "" : " (até agora)"}`];
    }),
    linha("Recall (cobertura da referência)", "pontuacao.metricas.recall", e => [e.pontuacao.metricas.recall, pct(e.pontuacao.metricas.recall)]),
    linha("Precisão sobre a referência", "pontuacao.metricas.precision", e => [e.pontuacao.metricas.precision, pct(e.pontuacao.metricas.precision)]),
    linha("Afirmações incorretas", "pontuacao.metricas.incorrectClaims", e => [e.pontuacao.metricas.incorrectClaims, num(e.pontuacao.metricas.incorrectClaims)]),
    linha("Defeitos novos corretos", "pontuacao.metricas.newCorrect", e => [e.pontuacao.metricas.newCorrect, num(e.pontuacao.metricas.newCorrect)]),
    linha("Cartões pendentes", "pontuacao.metricas.pending", e => [e.pontuacao.metricas.pending, num(e.pontuacao.metricas.pending)]),
    linha("Maturidade", "pontuacao.estado", e => [null, seloPontuacao(e.pontuacao.estado).texto]),
    linha("Achados enviados", "achados.total", e => [e.achados ? e.achados.total : null,
      e.achados ? (e.achados.total === 0 ? "0 (lista vazia aceita)" : String(e.achados.total)) : "nenhuma submissão aceita"]),
  ];
}

export function vistaPar(arquivo: string, campanha: string, par: string): VistaPar | null {
  if (!ID.test(campanha) || !ID.test(par)) return null;
  const v = vistaExecucoes(arquivo);
  const xs = v.execucoes.filter(x => x.campanha === campanha && x.par === par);
  const an = lerAnalise(arquivo, campanha, par);
  if (!xs.length && !an) return null;
  const bracos: VistaPar["bracos"] = {};
  for (const a of ARMS) { const l = xs.filter(x => x.braco === a); if (l.length) bracos[a] = l; }
  const faltando = ARMS.filter(a => !bracos[a]);
  const rv = an?.atual ?? null;
  let comparacao: VistaPar["comparacao"] = null;
  if (rv?.resumo.comparacao) {
    const c = rv.resumo.comparacao;
    const fonte = fonteDoResumo(rv, "comparacao", rv.resumo.execucoes.map(e => e.runId).join(" + "));
    comparacao = { disponivel: c.disponivel, motivo: c.motivo, estado: c.estado, nota: c.nota,
      diferencaUnidades: { valor: c.diferencaUnidadesConfirmadas, texto: `${sinal(c.diferencaUnidadesConfirmadas)}${c.disponivel && c.estado !== "final" ? " (até agora)" : ""}`,
        fonte: { ...fonte, campo: "comparacao.diferencaUnidadesConfirmadas" } },
      diferencaRecall: { valor: c.diferencaRecall, texto: c.diferencaRecall === null ? "indisponível (revisão aberta ou comparação indisponível)" : pp(c.diferencaRecall),
        fonte: { ...fonte, campo: "comparacao.diferencaRecall" } },
      unidades: c.unidades, fonte };
  }
  const achadosPorBraco: VistaPar["achadosPorBraco"] = {};
  if (rv) for (const e of rv.resumo.execucoes) achadosPorBraco[e.braco] = e.achados;
  const revisaoAberta = Boolean(rv && rv.resumo.execucoes.some(e => e.pontuacao.estado === "pending-review" || e.pontuacao.estado === "provisional"));
  return { fixture: v.fixture, campanha, par, bracos, faltando, analise: an, metricas: rv && rv.resumo.analise.estado === "pronta" ? metricasDaRevisao(rv) : null,
    comparacao, achadosPorBraco, revisaoAberta };
}

// ───────────────────────────────────────────────────────────────── execução (resumo técnico)

export interface LinhaTecnica { rotulo: string; valor: Valor }
export interface VistaExecucao {
  fixture: boolean; linha: LinhaExecucao; entrada: EntradaIndice;
  origem: "analise" | "pacote" | "sem-pacote";
  tecnico: LinhaTecnica[]; custo: LinhaTecnica[]; isolamento: LinhaTecnica[];
  despacho: { motivo: string | null; fonte: string } | null;
  analise: Analise | null;
}

const USO_ROTULO: [keyof Run["usage"], string][] = [
  ["wallClockSeconds", "Tempo de relógio (s)"], ["turns", "Turnos"], ["toolCalls", "Chamadas de ferramenta"], ["oracleCalls", "Chamadas ao oráculo"],
  ["inputTokens", "Tokens de entrada"], ["outputTokens", "Tokens de saída"], ["cacheReadTokens", "Tokens lidos do cache"],
  ["cacheCreationTokens", "Tokens gravados no cache"], ["estimatedCostUsd", "Custo estimado (US$, preço de referência)"], ["billedCostUsd", "Cobrança efetiva (US$)"],
];

export function vistaExecucao(arquivo: string, chave: string): VistaExecucao | null {
  if (!ID.test(chave)) return null;
  const lidas = lerIndice(arquivo);
  const lida = lidas.find(l => l.entrada?.chave === chave && l.entrada.tipo === "execucao");
  if (!lida?.entrada) return null;
  const e = lida.entrada;
  const analises = listarAnalises(arquivo);
  const linha = linhaExecucao(arquivo, lida as EntradaLida & { entrada: EntradaIndice }, analises);
  const cobre = revisaoQueCobre(analises, e);
  const rv = cobre?.an.atual ?? null;
  const ex = rv?.resumo.execucoes.find(x => x.runId === chave) ?? null;
  const tecnico: LinhaTecnica[] = [], custo: LinhaTecnica[] = [], isolamento: LinhaTecnica[] = [];
  const T = (rotulo: string, valor: string | number | null, texto: string, fonte: Fonte) => ({ rotulo, valor: { valor, texto, fonte } });
  let origem: VistaExecucao["origem"];
  let despacho: VistaExecucao["despacho"] = null;
  if (e.estado.arquivo === "sem-pacote") {
    origem = "sem-pacote";
    const dRel = `${e.caminho}/despacho.json`;
    const d = existsSync(join(arquivo, dRel)) ? tentarJson<{ motivo?: string }>(join(arquivo, dRel)) : null;
    despacho = { motivo: d?.ok ? d.valor.motivo ?? null : e.motivo, fonte: dRel };
    const f: Fonte = { arquivo: lida.arquivoEntrada, campo: "estado", versao: e.indice, atualizadoEm: e.dataUtc, pacote: null };
    tecnico.push(T("Status técnico", e.estado.tecnico, "interrompida sem pacote: nenhum resultado foi inventado", f));
  } else if (ex && rv) {
    origem = "analise";
    const i = rv.resumo.execucoes.indexOf(ex);
    const f = (campo: string) => fonteDoResumo(rv, `execucoes[${i}].${campo}`, ex.runId);
    tecnico.push(T("Status técnico", ex.tecnico.status, rotuloTecnico(ex.tecnico.status), f("tecnico.status")));
    tecnico.push(T("Etapa / motivo da falha", null, ex.tecnico.falha ? `${ex.tecnico.falha.stage} · ${ex.tecnico.falha.reason}: ${ex.tecnico.falha.detail}` : "—", f("tecnico.falha")));
    tecnico.push(T("Submissão", ex.tecnico.submissao, `${ex.tecnico.submissao}${ex.tecnico.motivoRecusa ? ` (${ex.tecnico.motivoRecusa})` : ""}`, f("tecnico.submissao")));
    tecnico.push(T("Achados enviados", ex.achados?.total ?? null, ex.achados ? (ex.achados.total === 0 ? "0 — lista vazia aceita" : String(ex.achados.total)) : "nenhuma submissão aceita", f("achados.total")));
    tecnico.push(T("Pontuação", ex.pontuacao.estado, seloPontuacao(ex.pontuacao.estado).texto + (ex.pontuacao.motivo ? ` — ${ex.pontuacao.motivo}` : ""), f("pontuacao.estado")));
    for (const [k, rot] of USO_ROTULO) {
      const m = ex.custoTempo[k];
      custo.push(T(rot, m.valor, m.estado === "medido" ? `${m.valor}` : m.estado === "indisponivel" ? "desconhecido" : "não se aplica", f(`custoTempo.${k}`)));
    }
    const mi = ex.mcpIsolamento;
    isolamento.push(T("Isolamento", mi.isolamento, mi.isolamento, f("mcpIsolamento.isolamento")));
    isolamento.push(T("Uso do oráculo", mi.usoOraculo, mi.usoOraculo, f("mcpIsolamento.usoOraculo")));
    isolamento.push(T("Chamadas ao oráculo", mi.chamadasOraculo.valor, mi.chamadasOraculo.estado === "medido" ? String(mi.chamadasOraculo.valor) : "desconhecido", f("mcpIsolamento.chamadasOraculo")));
    isolamento.push(T("Erros de ferramenta", mi.errosDeFerramenta.valor, mi.errosDeFerramenta.estado === "medido" ? String(mi.errosDeFerramenta.valor) : "desconhecido", f("mcpIsolamento.errosDeFerramenta")));
    isolamento.push(T("Checks negativos", mi.checks?.aprovados ?? null, mi.checks ? `${mi.checks.aprovados} aprovado(s); falhos: ${mi.checks.falhos.join("; ") || "nenhum"}; não exercitados: ${mi.checks.naoExercitados.join(", ") || "nenhum"}` : "sem isolation.json", f("mcpIsolamento.checks")));
  } else {
    origem = "pacote";
    const rRel = `${e.caminho}/pacote/run.json`;
    const r = existsSync(join(arquivo, rRel)) ? tentarJson<Run>(join(arquivo, rRel)) : null;
    const f = (campo: string): Fonte => ({ arquivo: rRel, campo, versao: r?.ok ? r.valor.contract : null, atualizadoEm: r?.ok ? r.valor.timestamps.finishedAt ?? r.valor.timestamps.plannedAt : null, pacote: e.chave });
    if (r?.ok) {
      const run = r.valor;
      tecnico.push(T("Status técnico", run.status.technical, rotuloTecnico(run.status.technical), f("status.technical")));
      tecnico.push(T("Etapa / motivo da falha", null, run.failure ? `${run.failure.stage} · ${run.failure.reason}: ${run.failure.detail}` : "—", f("failure")));
      tecnico.push(T("Submissão", run.submission.status, run.submission.status, f("submission.status")));
      tecnico.push(T("Achados enviados", linha.achados.total, linha.achados.texto, { ...f("report.findings"), arquivo: linha.achados.fonte ?? rRel }));
      tecnico.push(T("Pontuação", null, "sem análise no arquivo: os números aparecem depois que a análise (T6) roda", f("status.score")));
      for (const [k, rot] of USO_ROTULO) {
        const m = run.usage[k];
        custo.push(T(rot, m.value, m.status === "measured" ? String(m.value) : m.status === "unavailable" ? "desconhecido" : "não se aplica", f(`usage.${k}`)));
      }
      isolamento.push(T("Isolamento", run.status.isolation, run.status.isolation, f("status.isolation")));
      isolamento.push(T("Uso do oráculo", run.status.oracleUsage, run.status.oracleUsage, f("status.oracleUsage")));
    } else {
      tecnico.push(T("Status técnico", null, `pacote/run.json ${r ? "ilegível" : "ausente"} no arquivo`, f("—")));
    }
  }
  return { fixture: ehFixture(arquivo, lidas), linha, entrada: e, origem, tecnico, custo, isolamento, despacho, analise: cobre?.an ?? null };
}

// ───────────────────────────────────────────────────────────────── revisão atual: pacote e decisões

export function pacoteDaRevisao(rv: Revisao): SemanticPackage | null {
  const p = join(rv.dir, "revisao", "package.json");
  return existsSync(p) ? lerJson<SemanticPackage>(p) : null;
}

/** As decisões em vigor: o último arquivo salvo pelo painel, senão o reviews.json da revisão atual. */
export function decisoesEmVigor(an: Analise): { raw: RawReviews; origem: string; versao: number } | null {
  const ultima = an.decisoes[0];
  if (ultima) {
    const raw = lerJson<RawReviews & { _painel?: unknown }>(join(an.dir, "decisoes", ultima.nome));
    const { _painel: _m, ...limpo } = raw;
    return { raw: limpo as RawReviews, origem: ultima.rel, versao: ultima.numero };
  }
  if (!an.atual) return null;
  const p = join(an.atual.dir, "revisao", "reviews.json");
  return existsSync(p) ? { raw: lerJson<RawReviews>(p), origem: `${an.atual.rel}/revisao/reviews.json`, versao: 0 } : null;
}

export const existeDiretorio = (p: string): boolean => existsSync(p) && statSync(p).isDirectory();
