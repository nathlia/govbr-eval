/**
 * Painel de resultados × agenda congelada (T7.2, NAT-65). Para uma campanha que tem agenda no arquivo
 * (`campanhas/<id>/agendas/<sha>/agenda.json`, gravada pelo job arquivar a partir do manifesto 1.3.0):
 *
 *   - planejado × executado, contado CONTRA A AGENDA — não a partir dos pares encontrados: slots não
 *     iniciados, válidos, perdidos, à espera de nova tentativa; tentativas extras usadas; perdas e tempo
 *     esgotado por braço, com o aviso de risco de seleção; intervalo entre os inícios dos dois braços;
 *   - o desfecho principal sobre os pares FINAIS e elegíveis: D = confirmadas_com − confirmadas_sem só nas
 *     unidades sorteadas (A-*; a camada de página P-* é secundária, D-85), com a estatística pareada
 *     (`estatistica-pareada.ts`) e os secundários por braço. "provisório" até cada par planejado estar
 *     final ou declaradamente perdido. Achados e unidades nunca viram repetições: a unidade é o par.
 *
 * Só leitura; nenhum número novo de pontuação é calculado aqui (as confirmadas vêm de summary.json via
 * `resultadoDaRevisao`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Arm, Campaign } from "../../contracts/index";
import { problemasDaAgenda, situacaoDaAgenda, type Agenda, type SituacaoAgenda } from "../agenda-campanha";
import type { EntradaIndice } from "../arquivo-resultados";
import { analisePareada, type AnalisePareada } from "../estatistica-pareada";
import type { LinhaPlacar, ResultadoBraco } from "./modelo";

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const subpastas = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter(d => statSync(join(dir, d)).isDirectory()).sort() : []);
const lerJson = <T>(p: string): T | null => { try { return JSON.parse(readFileSync(p, "utf8")) as T; } catch { return null; } };

export interface VistaAgenda {
  agenda: Agenda; campanha: Campaign; situacao: SituacaoAgenda;
  /** Problemas da agenda arquivada (mais de uma, não regenera da semente…): mostrados, e os números ficam provisórios. */
  problemas: string[];
}

/** A agenda arquivada da campanha e a campanha congelada que ela serve; null = campanha sem agenda. */
export function lerAgendaDoArquivo(arquivo: string, campanha: string): { agenda: Agenda; campanha: Campaign; problemas: string[] } | null {
  if (!ID.test(campanha)) return null;
  const dir = join(arquivo, "campanhas", campanha);
  const agendas = subpastas(join(dir, "agendas")).map(s => lerJson<Agenda>(join(dir, "agendas", s, "agenda.json"))).filter((a): a is Agenda => a !== null);
  if (!agendas.length) return null;
  const problemas: string[] = [];
  if (agendas.length > 1) problemas.push(`${agendas.length} agendas diferentes arquivadas para ${campanha}: a primeira é mostrada, e nenhuma conta é final`);
  const agenda = agendas[0];
  const docs = [join(dir, "campaign.json"), ...subpastas(dir).map(s => join(dir, s, "campaign.json"))].filter(existsSync)
    .map(p => lerJson<Campaign>(p)).filter((c): c is Campaign => c !== null && c.campaignId === campanha)
    .sort((a, b) => (b.frozenAt ?? "").localeCompare(a.frozenAt ?? ""));
  if (!docs.length) return null;
  // a ligação por bytes (agenda × campaign.json commitado) foi conferida no preparar; aqui, que a agenda regenera da semente
  problemas.push(...problemasDaAgenda(agenda, docs[0], agenda.campaign.sha256));
  return { agenda, campanha: docs[0], problemas };
}

export function vistaAgenda(arquivo: string, campanha: string, entradas: EntradaIndice[], inicioDe: (chave: string) => string | null): VistaAgenda | null {
  const a = lerAgendaDoArquivo(arquivo, campanha);
  if (!a) return null;
  return { ...a, situacao: situacaoDaAgenda(a.agenda, a.campanha, entradas, inicioDe) };
}

// ───────────────────────────────────────────────────────────────── desfecho principal

export interface ParAgregado {
  pairId: string; sem: number; com: number; d: number;
  /** Camada de página (P-*), secundária; null sem camada na referência. */
  paginaSem: number | null; paginaCom: number | null; intervaloMin: number | null;
}
export interface SecundarioBraco {
  n: number; precisoes: (number | null)[]; precisaoMedia: number | null; incorretas: number | null; novas: number | null;
  pagina: { confirmadas: number; total: number } | null;
}
export interface AgregadoCampanha {
  estado: "provisorio" | "final"; motivoProvisorio: string | null;
  nPlanejado: number; nEfetivo: number;
  /** true = D só nas sorteadas (A-*); false = a referência não separa camadas e D usa todas as unidades. */
  soSorteadas: boolean;
  pares: ParAgregado[];
  foraDaAnalise: { pairId: string; motivo: string }[];
  estatistica: AnalisePareada;
  sementeOrigem: string;
  secundarios: Record<Arm, SecundarioBraco>;
}

const sorteadas = (b: ResultadoBraco | undefined): number | null => (b ? (b.camadas ? b.camadas.sorteadas.confirmadas : b.confirmadas) : null);
const pagina = (b: ResultadoBraco | undefined): number | null => (b?.camadas ? b.camadas.pagina.confirmadas : null);

/** O desfecho principal da campanha sobre os pares finais e elegíveis da agenda. */
export function agregadoDaCampanha(va: VistaAgenda, linhas: LinhaPlacar[]): AgregadoCampanha {
  const { situacao: s } = va;
  const pares: ParAgregado[] = [], fora: AgregadoCampanha["foraDaAnalise"] = [], usados: { pairId: string; r: NonNullable<LinhaPlacar["resultado"]> }[] = [];
  let pendentes = 0;
  let soSorteadas = true;
  for (const p of s.pares) {
    const l = linhas.find(x => x.par === p.pairId);
    const r = l?.resultado ?? null;
    const sel = { sem: p.slots.sem.selecionada, com: p.slots.com.selecionada };
    let motivo: string | null = null, perdido = false;
    if (p.estado === "incompleto") {
      perdido = true;
      motivo = `par perdido — ${(["sem", "com"] as Arm[]).filter(a => p.slots[a].estado === "perdido").map(a => `${a}: ${p.slots[a].motivo ?? "slot perdido"}`).join("; ")}`;
    } else if (p.estado !== "completo") motivo = p.estado === "nao-iniciado" ? "não iniciado" : "coleta em andamento";
    else if (!l || !r) motivo = "sem análise preparada";
    else if (l.selo !== "final") motivo = r.disponivel ? `revisão aberta (${r.pendentes} cartões pendentes)` : `comparação indisponível${r.elegivel ? "" : " — par inelegível"}: ${r.motivo ?? "ver o par"}`;
    else if (r.bracos.sem?.runId !== sel.sem || r.bracos.com?.runId !== sel.com) motivo = "a análise não usa a tentativa selecionada pela agenda (primeira elegível): prepare de novo";
    if (motivo) {
      fora.push({ pairId: p.pairId, motivo });
      if (!perdido) pendentes++;
      continue;
    }
    const [x, y] = [sorteadas(r!.bracos.sem), sorteadas(r!.bracos.com)];
    if (x === null || y === null) { fora.push({ pairId: p.pairId, motivo: "summary.json sem as confirmadas de um braço" }); pendentes++; continue; }
    if (!r!.bracos.sem?.camadas || !r!.bracos.com?.camadas) soSorteadas = false;
    pares.push({ pairId: p.pairId, sem: x, com: y, d: y - x, paginaSem: pagina(r!.bracos.sem), paginaCom: pagina(r!.bracos.com), intervaloMin: p.intervaloMin });
    usados.push({ pairId: p.pairId, r: r! });
  }
  const sec = (arm: Arm): SecundarioBraco => {
    const bs = usados.map(u => u.r.bracos[arm]).filter((b): b is ResultadoBraco => Boolean(b));
    const soma = (f: (b: ResultadoBraco) => number | null): number | null => (bs.length && bs.every(b => typeof f(b) === "number") ? bs.reduce((a, b) => a + f(b)!, 0) : null);
    const precisoes = bs.map(b => b.precisao);
    const validas = precisoes.filter((v): v is number => typeof v === "number");
    const comPagina = bs.filter(b => b.camadas && b.camadas.pagina.confirmadas !== null && b.camadas.pagina.total !== null);
    return { n: bs.length, precisoes, precisaoMedia: validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : null,
      incorretas: soma(b => b.incorretas), novas: soma(b => b.novas),
      pagina: comPagina.length && comPagina.length === bs.length ? { confirmadas: comPagina.reduce((a, b) => a + b.camadas!.pagina.confirmadas!, 0), total: comPagina.reduce((a, b) => a + b.camadas!.pagina.total!, 0) } : null };
  };
  const motivos: string[] = [];
  if (pendentes) motivos.push(`${pendentes} par(es) planejado(s) ainda não final(is) nem perdido(s)`);
  if (va.problemas.length) motivos.push(`agenda com problema: ${va.problemas.join("; ")}`);
  const sementeOrigem = va.agenda.seed.commit;
  return {
    estado: motivos.length ? "provisorio" : "final", motivoProvisorio: motivos.length ? motivos.join("; ") : null,
    nPlanejado: va.agenda.pairs, nEfetivo: pares.length, soSorteadas, pares, foraDaAnalise: fora,
    estatistica: analisePareada(pares.map(p => p.d), sementeOrigem), sementeOrigem, secundarios: { sem: sec("sem"), com: sec("com") },
  };
}

// ───────────────────────────────────────────────────────────────── textos comuns (página e RESULTADOS.md)

export const num = (v: number | null | undefined, casas = 2): string => (v === null || v === undefined ? "indisponível" : Number.isInteger(v) ? String(v) : v.toFixed(casas).replace(".", ","));
export const sinal = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");
export const pValor = (p: number | null): string => (p === null ? "indisponível" : p < 0.0001 ? "< 0,0001" : p.toFixed(4).replace(".", ","));
export const pctTxt = (v: number | null): string => (v === null ? "indisponível" : `${(v * 100).toFixed(1).replace(".", ",")}%`);
export const minTxt = (v: number | null): string => (v === null ? "—" : v < 60 ? `${Math.round(v)} min` : `${Math.floor(v / 60)} h ${Math.round(v % 60)} min`);

export const LEITURA_TXT: Record<AnalisePareada["leitura"], string> = {
  "vantagem-com": "vantagem do com (p < 0,05 e média de D > 0)",
  "vantagem-sem": "vantagem do sem (p < 0,05 e média de D < 0)",
  "sem-diferenca-detectavel": "sem diferença detectável (não estabelece equivalência)",
  indisponivel: "indisponível (nenhum par final)",
};

export const ESTADO_SLOT_TXT: Record<string, string> = {
  "nao-iniciado": "não iniciado", valido: "válido", "aguarda-nova-tentativa": "aguarda nova tentativa", perdido: "perdido",
};

/** Linhas de texto (sem HTML nem Markdown) do desfecho: as mesmas na página e no RESULTADOS.md. */
export function linhasDoDesfecho(g: AgregadoCampanha): { titulo: string; itens: string[] } {
  const e = g.estatistica, ic = e.ic, w = e.robustez.wilcoxon, sg = e.robustez.sinal;
  const titulo = `${g.estado === "final" ? "FINAL" : "PROVISÓRIO"} — D = confirmadas com − sem${g.soSorteadas ? " nas unidades sorteadas (A-*)" : " (referência sem camada de página: todas as unidades)"}; n efetivo ${g.nEfetivo} de ${g.nPlanejado} pares planejados`;
  const itens = [
    `D por par: ${g.pares.length ? g.pares.map(p => `${p.pairId} ${sinal(p.d)}`).join(" · ") : "nenhum par final ainda"}`,
    `média ${num(e.media)} · mediana ${num(e.mediana)} · desvio-padrão ${num(e.desvioPadrao)}`,
    `IC 95% da média: ${ic.disponivel ? `${num(ic.inferior)} a ${num(ic.superior)}` : ic.motivo} (bootstrap percentil sobre pares, ${ic.reamostragens} reamostragens, gerador ${ic.gerador}, semente ${ic.semente} de sha256(${ic.sementeOrigem.slice(0, 12)}…|bootstrap))`,
    `teste principal — permutação exata por troca de sinal sobre a média, bicaudal: p = ${pValor(e.principal.p)}${e.principal.nota ? ` (${e.principal.nota})` : ""}`,
    `leitura: ${LEITURA_TXT[e.leitura]}`,
    `robustez — Wilcoxon de postos sinalizados (Pratt, postos médios, exato): p = ${pValor(w.p)}; zeros ${w.zeros}`,
    `robustez — teste do sinal exato: ${sg.positivos} a favor do com, ${sg.negativos} do sem, ${sg.zeros} empates (fora); p = ${pValor(sg.p)}`,
  ];
  if (g.motivoProvisorio) itens.unshift(`provisório: ${g.motivoProvisorio}`);
  return { titulo, itens };
}

/** Os secundários por braço, como texto: nunca somados ao principal. */
export function linhasSecundarias(g: AgregadoCampanha): string[] {
  return (["sem", "com"] as Arm[]).map(a => {
    const s = g.secundarios[a];
    return `${a}: precisão média das afirmações ${pctTxt(s.precisaoMedia)} · incorretas ${num(s.incorretas)} · defeitos novos corretos ${num(s.novas)} · página (P-*) ${s.pagina ? `${s.pagina.confirmadas}/${s.pagina.total}` : "indisponível"} (n = ${s.n})`;
  });
}

/** O planejado × executado, como texto. */
export function linhasDaAgenda(va: VistaAgenda): string[] {
  const s = va.situacao, b = s.porBraco;
  const L = [
    `slots planejados ${s.planejados} · não iniciados ${s.naoIniciados} · válidos ${s.validos} · aguardam nova tentativa ${s.aguardando} · perdidos ${s.perdidos}`,
    `tentativas ${s.tentativas} (extras usadas ${s.extrasUsadas} de ${s.extrasLimite}) · pares completos ${s.paresCompletos} de ${va.agenda.pairs} · pares perdidos ${s.paresPerdidos}`,
    `perdas por braço: sem ${b.sem.perdidos} de ${b.sem.tentados} tentados (tempo esgotado ${b.sem.tempoEsgotado}) · com ${b.com.perdidos} de ${b.com.tentados} tentados (tempo esgotado ${b.com.tempoEsgotado})`,
  ];
  if (s.riscoDeSelecao) L.push(`ATENÇÃO — ${s.riscoDeSelecao}`);
  if (s.foraDaAgenda.length) L.push(`execuções com slot fora da agenda (nunca entram): ${s.foraDaAgenda.join(", ")}`);
  for (const p of va.problemas) L.push(`problema na agenda: ${p}`);
  return L;
}
