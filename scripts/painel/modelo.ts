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
import type { AnyAnalysisBinding, ArmV2 as Arm, Findings, Run, RunV2 } from "../../contracts/index";
import type { EntradaIndice } from "../arquivo-resultados";
import { recusadoNoPreflight } from "../agenda-campanha";
import type { Resumo } from "../analisar-execucao";
import { mapearDecisoes } from "../identidade-cartoes";
import { pendingDecision, type RawReviews, type SemanticPackage } from "../semantic-flow";
import { agregadoDaCampanha, vistaAgenda, type AgregadoCampanha, type VistaAgenda } from "./agenda-painel";

export const PAINEL_VERSAO = "painel-resultados-1.1.0";
export const RECEITA_VERSAO = "receita-analise-1.0.0";
/** 1.1.0 (NAT-72): o registro diz quantas partes (átomos) e quantos vínculos de revisão a gravação trouxe. 1.0.0 continua legível. */
export const DECISOES_VERSAO = "decisoes-painel-1.1.0";
export const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
/** NAT-61: a ordem das colunas; o braço ferramentas só aparece quando o desenho ou o arquivo o traz. */
export const ARMS: Arm[] = ["sem", "ferramentas", "com"];

/**
 * Braços que um par/grupo deve ter: sem e com sempre (como antes do NAT-61), mais ferramentas quando o
 * desenho da campanha o planeja ou uma execução dele está no arquivo. O que falta além do desenho é
 * `porDesenho` (nunca "incompleto").
 */
export function bracosEsperados(desenho: readonly string[] | null, presentes: readonly Arm[]): Arm[] {
  return ARMS.filter(a => a !== "ferramentas" || Boolean(desenho?.includes(a)) || presentes.includes(a));
}

/** NAT-61: a comparação principal do grupo (comparacoes do summary.json), na forma da comparação do par. */
export function comparacaoPrincipal(resumo: Resumo): Resumo["comparacao"] {
  const c = resumo.comparacoes?.find(x => x.papel === "primary");
  if (!c) return resumo.comparacao;
  return { disponivel: c.disponivel, motivo: c.motivo, estado: c.estado, ...(c.elegivel !== undefined ? { elegivel: c.elegivel } : {}),
    diferencaUnidadesConfirmadas: c.diferencaUnidadesConfirmadas, diferencaRecall: c.diferencaRecall, unidades: null, nota: c.nota };
}

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

/**
 * Uma frase para a tela: a primeira linha não vazia, sem stack nem log, com no máximo `max` caracteres.
 * O texto inteiro fica no arquivo de onde veio (erro.json, despacho.json); a tela nunca despeja log.
 */
export function frase(texto: string | null | undefined, max = 220): string {
  const linha = String(texto ?? "").split(/\r?\n/).map(l => l.trim()).find(l => l && !/^at\s/.test(l)) ?? "";
  const limpa = linha.replace(/\s+/g, " ");
  return limpa.length > max ? `${limpa.slice(0, max - 1).trimEnd()}…` : limpa;
}

/**
 * O Git desta máquina converteu os finais de linha do clone (core.autocrlf=true sem .gitattributes)?
 * O job arquivar grava JSON com LF; CRLF numa entrada do índice só aparece por conversão no checkout.
 * Com conversão, todo arquivo de texto deixa de ter o sha256 que o workflow registrou.
 */
export function cloneComCrlf(arquivo: string): boolean {
  const dir = join(arquivo, "indice", "entradas");
  if (!existsSync(dir)) return false;
  const f = readdirSync(dir).find(n => n.endsWith(".json"));
  return f ? readFileSync(join(dir, f)).includes("\r\n") : false;
}

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
  /** T8a.1: receita montada pelo botão "Preparar análise" — de onde cada entrada veio (sha256 do arquivo). */
  preparo?: {
    por: string;
    manifestosColeta: Partial<Record<Arm, string>>;
    anexos: Partial<Record<Arm, string | null>>;
    campanha: { sha256: string; origem: string };
    /**
     * NAT-65: campanha com agenda — qual tentativa de cada slot entrou (a primeira elegível) e todas as
     * tentativas do slot com a classe delas. Ausente em campanha sem agenda.
     */
    selecaoTentativas?: {
      regra: string; agendaSemente: string;
      slots: Partial<Record<Arm, { slot: string; escolhida: string; tentativas: { chave: string; classe: string; motivo: string }[] }>>;
    };
  };
}

export interface Revisao {
  numero: number; nome: string; dir: string; rel: string;
  resumo: Resumo; bindings: Partial<Record<Arm, AnyAnalysisBinding>>;
}
export interface Falha { carimbo: string; em: string; motivo: string; rel: string }
export interface VersaoDecisoes { numero: number; nome: string; rel: string; meta: MetaDecisao | null }
export interface MetaDecisao {
  formato: typeof DECISOES_VERSAO | "decisoes-painel-1.0.0"; versao: number; salvoEm: string; revisora: string; cartao: string; decisao: string;
  justificativa: string; baseadaEm: { revisao: string; decisoes: string | null };
  /** 1.1.0: partes (átomos) gravadas e vínculos de revisão declarados nesta gravação. */
  partes?: number; vinculos?: number;
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
  if (!s.ok) return `A pasta ${nome} está incompleta (sem summary.json legível) e foi ignorada — a versão anterior íntegra continua valendo`;
  const bindings: Partial<Record<Arm, AnyAnalysisBinding>> = {};
  for (const arm of ARMS) {
    const p = join(rdir, `analysis-binding.${arm}.json`);
    if (!existsSync(p)) continue;
    const b = tentarJson<AnyAnalysisBinding>(p);
    if (!b.ok) return `A pasta ${nome} tem binding ilegível e foi ignorada — a versão anterior íntegra continua valendo`;
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
  if (erroReceita) avisos.push(`${alvo}: a receita.json está ilegível (${frase(erroReceita, 120)}) — não dá para recalcular; prepare a análise de novo numa cópia limpa do arquivo.`);

  const revisoes: Revisao[] = [];
  for (const nome of subpastas(join(dir, "revisoes"))) {
    if (!NOME_REV.test(nome)) continue;
    const rdir = join(dir, "revisoes", nome);
    const r = lerRevisao(rdir, nome, relArquivo(arquivo, rdir));
    if (typeof r === "string") avisos.push(`${alvo}: ${r.charAt(0).toLowerCase()}${r.slice(1)}.`); else revisoes.push(r);
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
    const motivo = frase(ultimaFalhaDepoisDaAtual.motivo).replace(/[.;:]$/, "");
    avisos.push(atual
      ? `${alvo}: a última tentativa de recalcular, em ${dataLocal(ultimaFalhaDepoisDaAtual.em)}, falhou — ${motivo}. Os números continuam os da ${atual.nome}, a última versão íntegra; resolva a causa e clique em Recalcular de novo.`
      : `${alvo}: a tentativa de calcular, em ${dataLocal(ultimaFalhaDepoisDaAtual.em)}, falhou — ${motivo}. Ainda não há versão íntegra; resolva a causa e clique em Tentar calcular de novo.`);
  }

  const decisoes: VersaoDecisoes[] = [];
  const ddir = join(dir, "decisoes");
  if (existsSync(ddir)) {
    for (const nome of readdirSync(ddir).sort()) {
      const m = NOME_DEC.exec(nome);
      if (!m) continue;
      const d = tentarJson<RawReviews & { _painel?: MetaDecisao }>(join(ddir, nome));
      if (!d.ok) { avisos.push(`${alvo}: as decisões ${nome} estão ilegíveis e foram ignoradas — a versão anterior das decisões continua valendo.`); continue; }
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

/**
 * O arquivo INTEIRO é fixture só com o marcador que `npm run painel:fixture` grava. Entradas de ensaio
 * (dublê, roteiro) convivem com execuções reais no mesmo `govbr-resultados`: são rotuladas por
 * campanha e por linha ("ensaio"), nunca fazem o arquivo todo virar "FIXTURE SINTÉTICA" (T8a.2).
 */
export function ehFixture(arquivo: string, _entradas: EntradaLida[] = []): boolean {
  return existsSync(join(arquivo, "FIXTURE-SINTETICA.md"));
}

// ───────────────────────────────────────────────────────────────── campanhas

export interface InfoCampanha {
  id: string; titulo: string | null; tipo: "pilot" | "formal" | null; bracos: Arm[] | null;
  /** ensaio = dublê/roteiro/fixture; calibracao = piloto real (D-67); formal = campanha que vira resultado. */
  natureza: "ensaio" | "calibracao" | "formal" | "desconhecida";
  rotulo: string; explicacao: string;
}

/** A campanha congelada no arquivo (`campanhas/<id>/<sha>/campaign.json`, ou direto na pasta na fixture). */
export function infoCampanha(arquivo: string, id: string, naturezas: ("formal" | "ensaio")[] = []): InfoCampanha {
  type Doc = { title?: string; kind?: "pilot" | "formal"; fixture?: boolean; frozenAt?: string; design?: { arms?: Arm[] } };
  const docs: Doc[] = [];
  if (ID.test(id)) {
    const dir = join(arquivo, "campanhas", id);
    const candidatos = [join(dir, "campaign.json"), ...subpastas(dir).map(s => join(dir, s, "campaign.json"))];
    for (const c of candidatos) if (existsSync(c)) { const r = tentarJson<Doc>(c); if (r.ok) docs.push(r.valor); }
  }
  const d = docs.sort((a, b) => (b.frozenAt ?? "").localeCompare(a.frozenAt ?? ""))[0] ?? null;
  const ensaio = d?.fixture === true || (naturezas.length > 0 && naturezas.every(n => n === "ensaio"));
  const base = { id, titulo: d?.title ?? null, tipo: d?.kind ?? null, bracos: d?.design?.arms ?? null };
  if (ensaio) return { ...base, natureza: "ensaio", rotulo: "ensaio — não é dado científico", explicacao: "Execuções com dublê, roteiro ou fixture: provam o caminho (coleta, arquivo, análise), nunca o modelo." };
  if (d?.kind === "pilot") return { ...base, natureza: "calibracao", rotulo: "calibração (D-67) — não é resultado", explicacao: "Piloto com o modelo real para calibrar o instrumento (tempo, uso, saúde técnica). Os números daqui não são comparação de desempenho e não entram na tese como resultado." };
  if (d?.kind === "formal") return { ...base, natureza: "formal", rotulo: "campanha formal", explicacao: "Campanha cujos pares entram no resultado, cada um pela sua análise revisada." };
  return { ...base, natureza: "desconhecida", rotulo: "campanha sem documento no arquivo", explicacao: "O arquivo não traz o campaign.json desta campanha; trate os números com cautela." };
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
  if (recusadoNoPreflight(e)) return { estado: "nao-se-aplica", texto: "nada a publicar (recusado no preflight)" };
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

/** NAT-81: o que o pacote diz do registro de inspeção, sem análise. findings.v1 → indisponível, nunca zero. */
function registroDoPacote(arquivo: string, caminho: string): string {
  const fPath = join(arquivo, `${caminho}/pacote/findings.json`);
  if (!existsSync(fPath)) return "registro indisponível (sem submissão aceita)";
  const f = tentarJson<{ contract?: string; inspectionStatus?: string; inspectionErrors?: string[]; report?: { inspection?: { completion?: string } } }>(fPath);
  if (!f.ok) return "registro indisponível (findings.json ilegível)";
  if (f.valor.contract !== "findings.v2") return "registro indisponível (pacote anterior ao registro de inspeção) — não é zero cobertura";
  if (f.valor.inspectionStatus === "invalid") return `registro inválido (${f.valor.inspectionErrors?.length ?? 0} erro(s) de contrato; guardado à parte) — achados aceitos normalmente`;
  const c = f.valor.report?.inspection?.completion;
  return c ? `registro enviado (${c === "complete" ? "declarado completo" : "parcial"}); detalhes depois da análise` : "registro não enviado pelo agente — não é zero cobertura";
}

export interface LinhaExecucao {
  chave: string;
  /** Id curto (T8a.2): o slot da campanha (`p01-sem`), o mesmo em toda tabela, aviso, cartão e URL. */
  id: string;
  /** O id com a campanha entre parênteses quando o mesmo id existe em outra campanha do arquivo. */
  idQualificado: string;
  url: string;
  arquivoEntrada: string; natureza: "formal" | "ensaio"; campanha: string; par: string | null; slot: string | null;
  tentativa: number | null; repeticao: number | null;
  tela: string; braco: Arm | null; modelo: string | null; esforco: string | null; dataUtc: string; dataLocal: string;
  tecnico: Selo; causaFalha: string | null; causaCurta: string | null; achados: Achados; publicacao: Selo;
  isolamento: Selo; oraculo: Selo; envio: Selo;
  /** Do `pacote/run.json` (usage), quando medido; null = desconhecido (nunca 0). */
  duracaoS: number | null; custoUsd: number | null;
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

function lerRun(arquivo: string, e: EntradaIndice): Run | RunV2 | null {
  if (e.estado.arquivo === "sem-pacote") return null;
  const p = join(arquivo, e.caminho, "pacote", "run.json");
  if (!existsSync(p)) return null;
  const r = tentarJson<Run | RunV2>(p);
  return r.ok ? r.valor : null;
}

/**
 * Id curto de cada execução, único dentro da campanha: o slot (`p01-sem`) quando é um id legível;
 * senão `par-braço-rN` (repetição do run.json). Slot repetido (nova tentativa) ganha `-t1`, `-t2`… na
 * ordem do disparo. O runId completo continua na página da execução.
 */
export function idsCurtos(arquivo: string, entradas: EntradaIndice[]): Map<string, string> {
  const ids = new Map<string, string>();
  const porCampanha = new Map<string, EntradaIndice[]>();
  for (const e of entradas) if (e.tipo === "execucao") porCampanha.set(e.campanha, [...(porCampanha.get(e.campanha) ?? []), e]);
  for (const xs of porCampanha.values()) {
    const ordem = [...xs].sort((a, b) => a.dataUtc.localeCompare(b.dataUtc) || a.chave.localeCompare(b.chave));
    const base = (e: EntradaIndice): string => {
      if (e.slot && ID.test(e.slot) && e.slot.length <= 32) return e.slot;
      const rep = lerRun(arquivo, e)?.repetition;
      return `${e.par ?? "avulsa"}-${e.braco ?? "braco"}-r${typeof rep === "number" ? rep : 1}`;
    };
    const grupos = new Map<string, EntradaIndice[]>();
    for (const e of ordem) { const b = base(e); grupos.set(b, [...(grupos.get(b) ?? []), e]); }
    const usados = new Set<string>();
    for (const [b, gs] of grupos) {
      gs.forEach((e, i) => {
        let id = gs.length === 1 ? b : `${b}-t${i + 1}`;
        if (usados.has(id) || !ID.test(id)) id = ID.test(`${id}-${e.chave.slice(-6)}`) ? `${id}-${e.chave.slice(-6)}` : e.chave;
        usados.add(id);
        ids.set(e.chave, id);
      });
    }
  }
  return ids;
}

/** A chave (runId) do id curto `id` na campanha, ou null. */
export function chaveDoId(arquivo: string, campanha: string, id: string): string | null {
  if (!ID.test(campanha) || !ID.test(id)) return null;
  const es = lerIndice(arquivo).map(l => l.entrada).filter((e): e is EntradaIndice => Boolean(e) && e!.campanha === campanha);
  for (const [chave, i] of idsCurtos(arquivo, es)) if (i === id) return chave;
  return null;
}

const ISOLAMENTO: Record<string, Selo> = {
  passed: { estado: "ok", texto: "isolamento conferido" },
  failed: { estado: "falha", texto: "isolamento violado" },
  unverified: { estado: "aviso", texto: "isolamento não verificado" },
};
const ORACULO: Record<string, Selo> = {
  "absent-verified": { estado: "ok", texto: "sem oráculo (conferido)" },
  "used-adherent": { estado: "ok", texto: "oráculo usado" },
  "available-unused": { estado: "aviso", texto: "oráculo disponível, não usado" },
  "used-with-errors": { estado: "pendente", texto: "oráculo usado com erros" },
  unverified: { estado: "aviso", texto: "uso do oráculo não verificado" },
  "not-applicable": { estado: "nao-se-aplica", texto: "oráculo: não se aplica" },
};
const ENVIO: Record<string, Selo> = {
  accepted: { estado: "ok", texto: "relatório aceito" },
  refused: { estado: "falha", texto: "relatório recusado" },
  none: { estado: "falha", texto: "nenhum relatório enviado" },
};
const seloDe = (m: Record<string, Selo>, v: string | null, nulo: string): Selo => v ? m[v] ?? { estado: "aviso", texto: v } : { estado: "nao-se-aplica", texto: nulo };

export function linhaExecucao(arquivo: string, lida: EntradaLida & { entrada: EntradaIndice }, analises: Analise[], ids?: Map<string, string>): LinhaExecucao {
  const e = lida.entrada;
  const tec = e.estado.tecnico;
  // recusa no preflight (sem manifesto): nenhum modelo chamado, não é tentativa — não pinta o slot de falha
  const tecnico: Selo = recusadoNoPreflight(e)
    ? { estado: "nao-se-aplica", texto: "recusado no preflight (não é tentativa)" }
    : e.estado.arquivo === "sem-pacote"
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
  const run = lerRun(arquivo, e);
  const medido = (k: keyof Run["usage"]): number | null => {
    const m = run?.usage?.[k];
    return m && m.status === "measured" && typeof m.value === "number" ? m.value : null;
  };
  const id = (ids ?? idsCurtos(arquivo, [e])).get(e.chave) ?? e.chave;
  return {
    chave: e.chave, id, idQualificado: id, url: `/execucao/${encodeURIComponent(e.campanha)}/${encodeURIComponent(id)}`,
    arquivoEntrada: lida.arquivoEntrada, natureza: e.natureza, campanha: e.campanha, par: e.par, slot: e.slot,
    tentativa: typeof run?.attempt === "number" ? run.attempt : null, repeticao: typeof run?.repetition === "number" ? run.repetition : null,
    tela: e.tela, braco: e.braco, modelo: e.modelo, esforco: e.esforco, dataUtc: e.dataUtc, dataLocal: dataLocal(e.dataUtc), tecnico,
    causaFalha: e.motivo, causaCurta: e.motivo ? frase(e.motivo, 160) : null, achados, publicacao: seloPublicacao(e),
    isolamento: seloDe(ISOLAMENTO, e.estado.isolamento, "isolamento: sem registro"),
    oraculo: seloDe(ORACULO, e.estado.oraculo, "oráculo: sem registro"),
    envio: e.estado.arquivo === "sem-pacote" ? { estado: "nao-se-aplica", texto: "sem pacote" } : seloDe(ENVIO, e.estado.submissao, "envio: sem registro"),
    duracaoS: medido("wallClockSeconds"), custoUsd: medido("estimatedCostUsd"),
    pontuacao, analise: cobre?.an.id ?? null, caminho: e.caminho,
  };
}

export interface VistaExecucoes {
  fixture: boolean; execucoes: LinhaExecucao[]; linhasDeBase: EntradaIndice[]; ilegiveis: { arquivo: string; erro: string }[];
  pares: VistaParResumo[];
  /** Campanhas do arquivo, a de execução mais recente primeiro. */
  campanhas: InfoCampanha[];
  /** O Git desta máquina converteu os finais de linha do clone (ver cloneComCrlf). */
  crlf: boolean;
  /** NAT-65: campanhas com agenda congelada no arquivo → planejado × executado contado pela agenda. */
  agendas: Record<string, VistaAgenda>;
}

/** Números de um braço na revisão atual: SÓ valores de summary.json. */
export interface ResultadoBraco {
  runId: string; id: string | null; confirmadas: number | null; total: number | null; recall: number | null; precisao: number | null;
  incorretas: number | null; novas: number | null; pendentes: number | null; achados: number | null; maturidade: string;
  segundos: number | null; custoUsd: number | null;
  /** Só com referência de camada de página (D-83): sorteadas (A-*) × página (P-*), de summary.json → pontuacao.camadas. */
  camadas?: NonNullable<Resumo["execucoes"][number]["pontuacao"]["camadas"]>;
}
export interface ResultadoPar {
  revisao: string; fonte: string; geradoEm: string; estado: string | null; disponivel: boolean; motivo: string | null; nota: string;
  /** NAT-63: false = par inelegível — não conta, nunca final (comparacao.elegivel === false no summary.json). */
  elegivel: boolean;
  bracos: Partial<Record<Arm, ResultadoBraco>>; diferencaUnidades: number | null; diferencaRecall: number | null; pendentes: number;
  /**
   * D-102: as unidades da referência por desfecho do par (só com, só sem, ambos, nenhum), cada uma com a sua spec,
   * de summary.json → comparacao.unidades. Ausente quando a comparação não as traz (indisponível, resumo antigo).
   * O agregado por spec da campanha é uma conta de leitura sobre esta lista.
   */
  unidades?: NonNullable<NonNullable<Resumo["comparacao"]>["unidades"]>;
  /** NAT-61: as comparações do grupo (summary.json → comparacoes), cada uma com o seu n. Ausente no par v1. */
  comparacoes?: NonNullable<Resumo["comparacoes"]>;
}

export function resultadoDaRevisao(rv: Revisao, ids: Map<string, string> = new Map()): ResultadoPar | null {
  // NAT-61: no grupo, estado/diferenças vêm da comparação principal (ferramentas × com); as unidades por spec (D-102),
  // só da comparação sem × com do par, como antes.
  const c = comparacaoPrincipal(rv.resumo);
  if (rv.resumo.analise.estado !== "pronta") return null;
  const medido = (m: { estado: string; valor: number | null } | undefined): number | null => (m && m.estado === "medido" && typeof m.valor === "number" ? m.valor : null);
  const bracos: ResultadoPar["bracos"] = {};
  for (const e of rv.resumo.execucoes) {
    const m = e.pontuacao.metricas;
    bracos[e.braco] = { runId: e.runId, id: ids.get(e.runId) ?? null, confirmadas: m.confirmedReferenceUnits, total: m.referenceUnits, recall: m.recall,
      precisao: m.precision, incorretas: m.incorrectClaims, novas: m.newCorrect, pendentes: m.pending, achados: e.achados ? e.achados.total : null,
      maturidade: e.pontuacao.estado, segundos: medido(e.custoTempo?.wallClockSeconds), custoUsd: medido(e.custoTempo?.estimatedCostUsd),
      ...(e.pontuacao.camadas ? { camadas: e.pontuacao.camadas } : {}) };
  }
  return { revisao: rv.nome, fonte: `${rv.rel}/summary.json`, geradoEm: rv.resumo.geradoEm, estado: c?.estado ?? null, disponivel: Boolean(c?.disponivel),
    elegivel: c?.elegivel !== false, motivo: c?.motivo ?? null, nota: c?.nota ?? "análise de uma execução só: não há comparação",
    bracos, diferencaUnidades: c?.diferencaUnidadesConfirmadas ?? null, diferencaRecall: c?.diferencaRecall ?? null,
    pendentes: rv.resumo.revisaoSemantica?.pendentes ?? 0, ...(rv.resumo.comparacao?.unidades ? { unidades: rv.resumo.comparacao.unidades } : {}),
    ...(rv.resumo.comparacoes ? { comparacoes: rv.resumo.comparacoes } : {}) };
}

export interface VistaParResumo {
  campanha: string; par: string; tela: string; modelo: string | null; dataUtc: string; bracos: Arm[]; faltando: Arm[];
  /** O braço que falta não está no desenho da campanha (ex.: prova de um braço só): não é par incompleto. */
  porDesenho: boolean;
  execucoes: { id: string; chave: string; braco: Arm | null; url: string }[];
  analise: string | null; selo: Selo; avisos: string[]; resultado: ResultadoPar | null;
}

export function vistaExecucoes(arquivo: string): VistaExecucoes {
  const lidas = lerIndice(arquivo);
  const analises = listarAnalises(arquivo);
  const validas = lidas.filter((l): l is EntradaLida & { entrada: EntradaIndice } => l.entrada !== null);
  const ids = idsCurtos(arquivo, validas.map(l => l.entrada));
  const execucoes = validas.filter(l => l.entrada.tipo === "execucao").map(l => linhaExecucao(arquivo, l, analises, ids))
    .sort((a, b) => b.dataUtc.localeCompare(a.dataUtc) || a.chave.localeCompare(b.chave));
  for (const x of execucoes) if (execucoes.some(y => y.id === x.id && y.campanha !== x.campanha)) x.idQualificado = `${x.id} (${x.campanha})`;
  const linhasDeBase = validas.filter(l => l.entrada.tipo === "linha-de-base").map(l => l.entrada)
    .sort((a, b) => b.dataUtc.localeCompare(a.dataUtc));
  const ordemCampanhas = [...new Set([...execucoes.map(x => x.campanha), ...linhasDeBase.map(e => e.campanha)])];
  const campanhas = ordemCampanhas.map(c => infoCampanha(arquivo, c, execucoes.filter(x => x.campanha === c).map(x => x.natureza)));
  const porChave = new Map(validas.map(l => [l.entrada.chave, l.entrada]));
  const inicioDe = (chave: string): string | null => { const e = porChave.get(chave); return e ? lerRun(arquivo, e)?.timestamps.startedAt ?? null : null; };
  const agendas: Record<string, VistaAgenda> = {};
  for (const c of campanhas) {
    const va = vistaAgenda(arquivo, c.id, validas.map(l => l.entrada), inicioDe);
    if (va) agendas[c.id] = va;
  }
  return { fixture: ehFixture(arquivo, lidas), execucoes, linhasDeBase,
    ilegiveis: lidas.filter(l => l.erro).map(l => ({ arquivo: l.arquivoEntrada, erro: l.erro! })), pares: resumoPares(execucoes, analises, campanhas, ids),
    campanhas, crlf: cloneComCrlf(arquivo), agendas };
}

function resumoPares(execucoes: LinhaExecucao[], analises: Analise[], campanhas: InfoCampanha[], ids: Map<string, string>): VistaParResumo[] {
  const grupos = new Map<string, LinhaExecucao[]>();
  for (const x of execucoes) {
    if (!x.par) continue;
    const k = `${x.campanha}/${x.par}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x]);
  }
  return [...grupos.entries()].map(([k, xs]) => {
    const [campanha, par] = k.split("/");
    const bracos = ARMS.filter(a => xs.some(x => x.braco === a));
    const desenho = campanhas.find(c => c.id === campanha)?.bracos ?? null;
    const faltando = bracosEsperados(desenho, bracos).filter(a => !bracos.includes(a));
    const porDesenho = faltando.length > 0 && Boolean(desenho) && faltando.every(a => !desenho!.includes(a));
    const an = analises.find(a => a.campanha === campanha && a.alvo === par) ?? null;
    const comp = an?.atual ? comparacaoPrincipal(an.atual.resumo) : null;
    let selo: Selo;
    if (porDesenho) selo = { estado: "nao-se-aplica", texto: "um braço só, pelo desenho da campanha: sem comparação" };
    else if (faltando.length) selo = { estado: "par-incompleto", texto: `${bracos.length + faltando.length > 2 ? "grupo" : "par"} incompleto: falta o braço ${faltando.join(" e ")}` };
    else if (!an) selo = { estado: "sem-analise", texto: "sem análise no arquivo" };
    else if (!an.atual) selo = { estado: "falha", texto: "análise sem versão íntegra" };
    else if (an.atual.resumo.analise.estado === "bloqueada") selo = { estado: "bloqueada", texto: "análise bloqueada" };
    else if (comp && !comp.disponivel) selo = { estado: "nao-se-aplica", texto: comp.elegivel === false ? "não conta: par inelegível (comparação indisponível)" : "comparação indisponível" };
    else if (comp?.estado === "final") selo = { estado: "final", texto: "comparação final" };
    else selo = { estado: "pendente", texto: "comparação provisória (revisão aberta)" };
    const recente = [...xs].sort((a, b) => b.dataUtc.localeCompare(a.dataUtc))[0];
    const ordenadas = [...xs].sort((a, b) => ARMS.indexOf(a.braco ?? "sem") - ARMS.indexOf(b.braco ?? "sem") || a.dataUtc.localeCompare(b.dataUtc));
    return { campanha, par, tela: recente.tela, modelo: recente.modelo, dataUtc: recente.dataUtc, bracos, faltando, porDesenho,
      execucoes: ordenadas.map(x => ({ id: x.id, chave: x.chave, braco: x.braco, url: x.url })),
      analise: an?.id ?? null, selo, avisos: an?.avisos ?? [], resultado: an?.atual ? resultadoDaRevisao(an.atual, ids) : null };
  }).sort((a, b) => b.dataUtc.localeCompare(a.dataUtc) || a.par.localeCompare(b.par));
}

// ───────────────────────────────────────────────────────────────── placar por campanha (NAT-58)

/** Selo de um par no placar: só quatro, e FINAL só com a comparação fechada. */
export type SeloPlacar = "final" | "provisorio" | "indisponivel" | "sem-analise" | "um-braco";
export interface LinhaPlacar {
  par: string; tela: string; modelo: string | null; selo: SeloPlacar;
  /** Texto curto do selo, igual na página e no RESULTADOS.md. */
  seloTexto: string;
  /** Números da revisão atual (só summary.json); null = sem análise pronta. */
  resultado: ResultadoPar | null;
  /** O que falta para este par chegar ao FINAL, numa frase; null = nada. */
  falta: string | null;
}
export interface Placar {
  info: InfoCampanha; linhas: LinhaPlacar[];
  /** Pares que pedem comparação (sem os de um braço só pelo desenho). */
  total: number; finais: number;
  /** Somas de unidades confirmadas SÓ sobre os pares FINAIS (n = finais); null sem par final. */
  somaSem: number | null; somaCom: number | null; somaTotal: number | null;
  /** NAT-61: só quando algum par é trio. Soma do braço ferramentas nos pares finais. */
  somaFerramentas?: number | null;
  /**
   * NAT-61: cada comparação do trio com o SEU n (grupos em que ela está final) e a soma das diferenças nesses
   * grupos. Grupo incompleto entra só nas comparações que têm os dois braços. Nunca soma com pares v1.
   */
  comparacoes?: { id: string; bracos: [Arm, Arm]; papel: "primary" | "secondary"; n: number; disponiveis: number; somaDiferenca: number | null }[];
  /** NAT-65: campanha com agenda — planejado × executado e o desfecho principal (estatística pareada). */
  agenda?: { vista: VistaAgenda; agregado: AgregadoCampanha };
}

/**
 * O placar de uma campanha: o selo e o que falta de cada par, e as somas só dos pares finais (com n).
 * `preparo` (opcional) diz quais pares sem análise já podem ser preparados.
 */
export function placarDaCampanha(info: InfoCampanha, pares: VistaParResumo[], preparo: Record<string, { pode: boolean }> = {}, agenda: VistaAgenda | null = null): Placar {
  const linhas: LinhaPlacar[] = pares.filter(p => p.campanha === info.id).sort((a, b) => a.par.localeCompare(b.par)).map(p => {
    const r = p.resultado;
    let selo: SeloPlacar, seloTexto: string, falta: string | null = null;
    if (p.porDesenho) { selo = "um-braco"; seloTexto = "um braço só (desenho da campanha)"; }
    else if (r && r.disponivel && r.estado === "final") { selo = "final"; seloTexto = "FINAL"; }
    else if (r && r.disponivel) {
      selo = "provisorio"; seloTexto = `PROVISÓRIO com ${r.pendentes} cartõ${r.pendentes === 1 ? "ão" : "es"} pendente${r.pendentes === 1 ? "" : "s"}`;
      falta = `${r.pendentes} cartõ${r.pendentes === 1 ? "ão" : "es"} pendente${r.pendentes === 1 ? "" : "s"} — aguardando a revisão cega`;
    } else if (r && !r.elegivel) {
      // NAT-63: par inelegível nunca é FINAL nem entra na soma; o motivo vem do summary.json
      selo = "indisponivel"; seloTexto = "NÃO CONTA — par inelegível";
      falta = "par inelegível para a comparação principal (falha técnica, isolamento não comprovado ou identidade fora da campanha) — abra o par para ver o motivo";
    } else if (r) { selo = "indisponivel"; seloTexto = "comparação indisponível"; falta = "comparação indisponível — abra o par para ver por quê"; }
    else {
      selo = "sem-analise"; seloTexto = "sem análise";
      if (p.faltando.length) falta = `falta o braço ${p.faltando.join(" e ")}`;
      else if (!p.analise) falta = preparo[`${p.campanha}/${p.par}`]?.pode ? "pronto para preparar" : "sem análise — abra o par para ver por quê";
      else falta = `${p.selo.texto} — abra o par`;
    }
    return { par: p.par, tela: p.tela, modelo: p.modelo, selo, seloTexto, resultado: r, falta };
  });
  const comparaveis = linhas.filter(l => l.selo !== "um-braco");
  const finais = comparaveis.filter(l => l.selo === "final");
  const soma = (f: (l: LinhaPlacar) => number | null | undefined): number | null => {
    if (!finais.length) return null;
    const vs = finais.map(f);
    return vs.every((v): v is number => typeof v === "number") ? vs.reduce((a, b) => a + b, 0) : null;
  };
  return { info, linhas, total: comparaveis.length, finais: finais.length,
    somaSem: soma(l => l.resultado?.bracos.sem?.confirmadas), somaCom: soma(l => l.resultado?.bracos.com?.confirmadas),
    somaTotal: soma(l => l.resultado?.bracos.sem?.total ?? l.resultado?.bracos.com?.total),
    ...(linhas.some(l => l.resultado?.comparacoes) ? { somaFerramentas: soma(l => l.resultado?.bracos.ferramentas?.confirmadas), comparacoes: comparacoesDoPlacar(linhas) } : {}),
    ...(agenda ? { agenda: { vista: agenda, agregado: agregadoDaCampanha(agenda, linhas) } } : {}) };
}

/** NAT-61: cada comparação declarada do trio, agregada só sobre os grupos em que ela está final (o seu n). */
function comparacoesDoPlacar(linhas: LinhaPlacar[]): NonNullable<Placar["comparacoes"]> {
  const porId = new Map<string, NonNullable<Placar["comparacoes"]>[number]>();
  for (const l of linhas) for (const c of l.resultado?.comparacoes ?? []) {
    const x = porId.get(c.id) ?? { id: c.id, bracos: c.bracos, papel: c.papel, n: 0, disponiveis: 0, somaDiferenca: 0 as number | null };
    if (c.disponivel) x.disponiveis++;
    if (c.disponivel && c.estado === "final") {
      x.n++;
      x.somaDiferenca = x.somaDiferenca !== null && c.diferencaUnidadesConfirmadas !== null ? x.somaDiferenca + c.diferencaUnidadesConfirmadas : null;
    }
    porId.set(c.id, x);
  }
  return [...porId.values()].map(x => ({ ...x, somaDiferenca: x.n ? x.somaDiferenca : null }))
    .sort((a, b) => (a.papel === b.papel ? 0 : a.papel === "primary" ? -1 : 1));
}

/** Campanhas que entram no placar: as que não são ensaio; num arquivo só de ensaios (a fixture), todas. */
export function campanhasDoPlacar(v: VistaExecucoes): { mostradas: InfoCampanha[]; ensaios: InfoCampanha[] } {
  const reais = v.campanhas.filter(c => c.natureza !== "ensaio");
  return reais.length ? { mostradas: reais, ensaios: v.campanhas.filter(c => c.natureza === "ensaio") } : { mostradas: v.campanhas, ensaios: [] };
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
  /** NAT-61: as comparações do grupo (summary.json → comparacoes), cada uma com o seu n. Ausente no par v1. */
  comparacoes?: NonNullable<Resumo["comparacoes"]>;
  achadosPorBraco: Partial<Record<Arm, { total: number; itens: { seletor: string; regra: string | null; observado: string }[] } | null>>;
  revisaoAberta: boolean;
  campanhaInfo: InfoCampanha; porDesenho: boolean; resultado: ResultadoPar | null; avisosArquivo: { crlf: boolean };
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
    linha("Maturidade", "pontuacao.estado", e => [null, `${seloPontuacao(e.pontuacao.estado).texto}${e.elegibilidade && !e.elegibilidade.elegivel ? " — só diagnóstico" : ""}`]),
    ...(rv.resumo.execucoes.some(e => e.elegibilidade) ? [linha("Entra na comparação principal", "elegibilidade", e => [null,
      !e.elegibilidade ? "—" : e.elegibilidade.elegivel ? "sim" : `não conta — ${e.elegibilidade.motivos.join("; ")}`])] : []),
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
  const resumo = v.pares.find(p => p.campanha === campanha && p.par === par) ?? null;
  const campanhaInfo = v.campanhas.find(c => c.id === campanha) ?? infoCampanha(arquivo, campanha);
  const presentes = ARMS.filter(a => bracos[a]);
  const faltando = bracosEsperados(campanhaInfo.bracos, presentes).filter(a => !bracos[a]);
  const ids = new Map(v.execucoes.map(x => [x.chave, x.id] as [string, string]));
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
    comparacao, ...(rv?.resumo.comparacoes ? { comparacoes: rv.resumo.comparacoes } : {}), achadosPorBraco, revisaoAberta, campanhaInfo, porDesenho: resumo?.porDesenho ?? false,
    resultado: rv ? resultadoDaRevisao(rv, ids) : null, avisosArquivo: { crlf: v.crlf } };
}

// ───────────────────────────────────────────────────────────────── execução (resumo técnico)

export interface LinhaTecnica { rotulo: string; valor: Valor }
export interface VistaExecucao {
  fixture: boolean; linha: LinhaExecucao; entrada: EntradaIndice; campanhaInfo: InfoCampanha;
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
  const ids = idsCurtos(arquivo, lidas.map(l => l.entrada).filter((x): x is EntradaIndice => Boolean(x) && x!.campanha === e.campanha));
  const linha = linhaExecucao(arquivo, lida as EntradaLida & { entrada: EntradaIndice }, analises, ids);
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
    // NAT-81: só o texto do resumo; nenhum número de registro vira nota, nem conta como cobertura da página.
    tecnico.push(T("Registro de inspeção", ex.inspecao?.estado ?? null, (ex.inspecao?.texto ?? "registro indisponível (resumo anterior ao registro de inspeção)") + (ex.inspecao?.auditoria ? ` Auditoria (processo, não pontua): ${ex.inspecao.auditoria.texto}` : ""), f("inspecao")));
    for (const [k, rot] of USO_ROTULO) {
      const m = ex.custoTempo[k];
      custo.push(T(rot, m.valor, m.estado === "medido" ? `${m.valor}` : m.estado === "indisponivel" ? "desconhecido" : "não se aplica", f(`custoTempo.${k}`)));
    }
    const mi = ex.mcpIsolamento;
    isolamento.push(T("Isolamento", mi.isolamento, mi.isolamento, f("mcpIsolamento.isolamento")));
    isolamento.push(T("Uso do oráculo", mi.usoOraculo, mi.usoOraculo, f("mcpIsolamento.usoOraculo")));
    isolamento.push(T("Chamadas ao oráculo", mi.chamadasOraculo.valor, mi.chamadasOraculo.estado === "medido" ? String(mi.chamadasOraculo.valor) : "desconhecido", f("mcpIsolamento.chamadasOraculo")));
    isolamento.push(T("Erros de ferramenta", mi.errosDeFerramenta.valor, mi.errosDeFerramenta.estado === "medido" ? String(mi.errosDeFerramenta.valor) : "desconhecido", f("mcpIsolamento.errosDeFerramenta")));
    // NAT-61: run.v2 — o perfil MEDIDO do servidor e as ferramentas que a ponte expôs (nunca o rótulo do braço)
    if (mi.oraculo && "tools" in mi.oraculo) {
      isolamento.push(T("Perfil do oráculo (medido)", mi.oraculo.profile, mi.oraculo.profile, f("mcpIsolamento.oraculo.profile")));
      isolamento.push(T("Ferramentas efetivas do oráculo", mi.oraculo.tools.length, `${mi.oraculo.tools.join(", ")} (tools/list ${mi.oraculo.toolsListSha256.slice(0, 12)})`, f("mcpIsolamento.oraculo.tools")));
    }
    isolamento.push(T("Checks negativos", mi.checks?.aprovados ?? null, mi.checks ? `${mi.checks.aprovados} aprovado(s); falhos: ${mi.checks.falhos.join("; ") || "nenhum"}; não exercitados: ${mi.checks.naoExercitados.join(", ") || "nenhum"}` : "sem isolation.json", f("mcpIsolamento.checks")));
  } else {
    origem = "pacote";
    const rRel = `${e.caminho}/pacote/run.json`;
    const r = existsSync(join(arquivo, rRel)) ? tentarJson<Run | RunV2>(join(arquivo, rRel)) : null;
    const f = (campo: string): Fonte => ({ arquivo: rRel, campo, versao: r?.ok ? r.valor.contract : null, atualizadoEm: r?.ok ? r.valor.timestamps.finishedAt ?? r.valor.timestamps.plannedAt : null, pacote: e.chave });
    if (r?.ok) {
      const run = r.valor;
      tecnico.push(T("Status técnico", run.status.technical, rotuloTecnico(run.status.technical), f("status.technical")));
      tecnico.push(T("Etapa / motivo da falha", null, run.failure ? `${run.failure.stage} · ${run.failure.reason}: ${run.failure.detail}` : "—", f("failure")));
      tecnico.push(T("Submissão", run.submission.status, run.submission.status, f("submission.status")));
      tecnico.push(T("Achados enviados", linha.achados.total, linha.achados.texto, { ...f("report.findings"), arquivo: linha.achados.fonte ?? rRel }));
      tecnico.push(T("Pontuação", null, "sem análise no arquivo: os números aparecem depois que a análise (T6) roda", f("status.score")));
      tecnico.push(T("Registro de inspeção", null, registroDoPacote(arquivo, e.caminho), { ...f("report.inspection"), arquivo: linha.achados.fonte ?? rRel }));
      for (const [k, rot] of USO_ROTULO) {
        const m = run.usage[k];
        custo.push(T(rot, m.value, m.status === "measured" ? String(m.value) : m.status === "unavailable" ? "desconhecido" : "não se aplica", f(`usage.${k}`)));
      }
      isolamento.push(T("Isolamento", run.status.isolation, run.status.isolation, f("status.isolation")));
      isolamento.push(T("Uso do oráculo", run.status.oracleUsage, run.status.oracleUsage, f("status.oracleUsage")));
      if (run.contract === "run.v2" && run.intervention.oracle) {
        const o = run.intervention.oracle;
        isolamento.push(T("Perfil do oráculo (medido)", o.profile, o.profile, f("intervention.oracle.profile")));
        isolamento.push(T("Ferramentas efetivas do oráculo", o.tools.length, `${o.tools.join(", ")} (tools/list ${o.toolsListSha256.slice(0, 12)})`, f("intervention.oracle.tools")));
      }
    } else {
      tecnico.push(T("Status técnico", null, `pacote/run.json ${r ? "ilegível" : "ausente"} no arquivo`, f("—")));
    }
  }
  const naturezas = lidas.filter(l => l.entrada?.tipo === "execucao" && l.entrada.campanha === e.campanha).map(l => l.entrada!.natureza);
  return { fixture: ehFixture(arquivo, lidas), linha, entrada: e, campanhaInfo: infoCampanha(arquivo, e.campanha, naturezas), origem, tecnico, custo, isolamento, despacho, analise: cobre?.an ?? null };
}

// ───────────────────────────────────────────────────────────────── revisão atual: pacote e decisões

export function pacoteDaRevisao(rv: Revisao): SemanticPackage | null {
  const p = join(rv.dir, "revisao", "package.json");
  return existsSync(p) ? lerJson<SemanticPackage>(p) : null;
}

/**
 * As decisões em vigor, sempre com os ids de cartão do pacote da revisão atual: o último arquivo
 * salvo pelo painel quando ele é deste pacote, senão o reviews.json da revisão atual.
 *
 * Quando o último arquivo foi gravado contra o pacote de OUTRA revisão (Recalcular gerou ids novos),
 * usá-lo cru recusava toda gravação ("cartão fora das decisões deste pacote") e mostrava a fila
 * inteira pendente. Aí valem o reviews.json da revisão atual (que o Recalcular já transpôs) e as
 * decisões do último arquivo transpostas pela mesma regra (identidade-cartoes.ts: corpo idêntico),
 * para não perder o que foi salvo depois que o Recalcular leu as decisões.
 */
export function decisoesEmVigor(an: Analise): { raw: RawReviews; origem: string; versao: number } | null {
  const ultima = an.decisoes[0];
  const pkg = an.atual ? pacoteDaRevisao(an.atual) : null;
  const pRev = an.atual ? join(an.atual.dir, "revisao", "reviews.json") : null;
  const daRevisao = pRev && existsSync(pRev) ? lerJson<RawReviews>(pRev) : null;
  if (ultima) {
    const lido = lerJson<RawReviews & { _painel?: unknown }>(join(an.dir, "decisoes", ultima.nome));
    const { _painel: _m, ...limpo } = lido;
    const raw = limpo as RawReviews;
    const ids = new Set(pkg?.cards.map(c => c.id) ?? []);
    if (!pkg || (raw.decisions.length === ids.size && raw.decisions.every(d => ids.has(d.cardId)))) {
      return { raw, origem: ultima.rel, versao: ultima.numero };
    }
    const origemRev = an.revisoes.find(r => r.nome === ultima.meta?.baseadaEm.revisao) ?? null;
    const { reviews: transpostas } = mapearDecisoes(raw, pkg, origemRev ? pacoteDaRevisao(origemRev) : null, origemRev?.rel ?? "desconhecida");
    const porId = new Map(transpostas.decisions.filter(d => ids.has(d.cardId)).map(d => [d.cardId, d]));
    const daRev = new Map((daRevisao?.decisions ?? []).map(d => [d.cardId, d]));
    const decisions = pkg.cards.map(c => {
      const t = porId.get(c.id);
      return t?.status === "reviewed" ? t : daRev.get(c.id) ?? t ?? pendingDecision(c.id);
    });
    return { raw: { version: raw.version, decisions } as RawReviews,
      origem: `${an.atual!.rel}/revisao/reviews.json + ${ultima.rel} (transpostas para os ids desta revisão)`, versao: ultima.numero };
  }
  return daRevisao ? { raw: daRevisao, origem: `${an.atual!.rel}/revisao/reviews.json`, versao: 0 } : null;
}

export const existeDiretorio = (p: string): boolean => existsSync(p) && statSync(p).isDirectory();
