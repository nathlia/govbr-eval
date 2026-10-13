/**
 * NAT-81 — leitura do registro de inspeção (inspection.v1) de um pacote, feita pelo HARNESS depois da
 * coleta. Separa o que o agente DECLAROU do que um evento de ferramenta COMPROVA, sem pontuar nada.
 *
 *   - Pacote com findings.v1 (histórico) → `indisponivel`: o registro não existia. Nunca "zero cobertura".
 *   - findings.v2 sem `report.inspection` → `nao-enviado`: o agente não mandou; também não é zero.
 *   - findings.v2 com `inspectionStatus: invalid` → `invalido`: o coletor guardou o registro e os erros à
 *     parte; os achados foram aceitos normalmente. Nada é contado de um registro inválido.
 *   - findings.v2 com registro válido → contagens por situação/origem/decisão + comprovação por evento.
 *
 * Cobertura aqui é sempre do inventário que o PRÓPRIO agente montou (regiões que ele descobriu):
 * `universo: "regioes-declaradas-pelo-agente"`, e `coberturaDaPagina` é sempre `desconhecida`. Nenhum
 * número daqui entra no scorer, na elegibilidade nem em critério de exclusão. São medidas de PROCESSO:
 * `porOrigem.validation-tool` é 0 no braço sem por construção, e o custo de escrever o registro cresce
 * com o número de candidatos — contagens do registro não são desfecho para comparar braços.
 *
 * Comprovação: um identificador que o agente cita (`originRef` de chegada confirmada, evidências,
 * `originRef` de região/candidato) conta como comprovado quando aparece como TOKEN INTEIRO no texto de
 * entrada ou de resultado de alguma chamada sem erro em tool-events.ndjson, no formato que a ponte grava
 * (`args`/`result` = `{ text, truncated }`, bridge.mjs `cap`). Token inteiro, sem tamanho mínimo: um ref
 * curto do navegador (`e12`) e um id do validador valem igual, nos dois braços; `e12` não casa dentro de
 * `e123`. A projeção do evento guarda até 4.000 caracteres de cada lado. Desde o NAT-82, quando a ponte
 * gravou o payload integral (`payload.status: "complete"`) e o leitor do pacote o conferiu
 * (evidence-integrity `verifyToolPayloads`), a busca usa o texto inteiro e o lado deixa de contar como
 * cortado. Payload `truncated` (acima do limite declarado) dá um prefixo maior, mas continua cortado;
 * `over-budget`/`failed`, evento antigo sem payload, ou payload não fornecido pelo leitor ficam na projeção.
 * Identificador não achado quando ALGUM lado ficou cortado é `nao-verificavel`, nunca "não encontrado";
 * `nao-encontrado` só quando todo texto lido estava inteiro.
 */
import type { AnyFindings, InspectionLedger } from "../contracts/index";

export const INSPECTION_SUMMARY_VERSION = "resumo-inspecao-1.0.0";

export type EstadoRegistro = "indisponivel" | "nao-enviado" | "invalido" | "registrado";
export type Verificacao = "comprovado" | "nao-verificavel" | "nao-encontrado";

export interface ResumoInspecao {
  formato: typeof INSPECTION_SUMMARY_VERSION;
  estado: EstadoRegistro;
  /** Frase pronta para summary.md e painel. */
  texto: string;
  /** Contrato de onde o registro veio (null quando indisponível). */
  contrato: "inspection.v1" | null;
  /** Só quando `invalido`: os erros de contrato que o coletor registrou. */
  erros?: string[];
  /** Só quando `registrado`. */
  declarado: {
    completude: InspectionLedger["completion"];
    universo: "regioes-declaradas-pelo-agente";
    coberturaDaPagina: "desconhecida";
    regioes: { total: number; inspecionadas: number; parciais: number; naoInspecionadas: number; porOrigem: Record<"browser" | "validation-tool", number> };
    estados: { total: number; confirmados: number; declarados: number; naoAlcancados: number };
    itens: { total: number; concluidos: number; falhos: number; indisponiveis: number; omitidos: number };
    candidatos: { total: number; aceitos: number; rejeitados: number; incertos: number; porOrigem: Record<"browser" | "validation-tool", number> };
    achadosSemCandidato: number;
    limitacoes: { total: number; porTipo: Record<string, number> };
  } | null;
  comprovacao: {
    estado: "medido" | "sem-eventos";
    fonte: string;
    /** Chegadas `confirmed` cujo `originRef` aparece como token num evento de ferramenta. */
    chegadasComprovadas: number | null;
    /** Chegadas `confirmed` por verificação (ids dos estados). */
    chegadas: Record<Verificacao, string[]> | null;
    /** Referências citadas (evidência de estados, itens e candidatos; originRef), por verificação. */
    referencias: { citadas: number; comprovadas: number | null; naoVerificaveis: number | null; naoEncontradas: number | null };
    limite: string;
  } | null;
}

/** Lado de um evento como a ponte grava: `{ text, truncated }`. Texto puro também é lido, por robustez. */
type Lado = { text?: unknown; truncated?: unknown; payload?: { status?: unknown; path?: unknown } | null } | string | undefined | null;
interface ToolEvent { kind?: string; isError?: boolean; args?: Lado; result?: Lado }
/** `payloads` = textos já conferidos (path → texto). Sem payload conferido, vale a projeção do evento. */
const lado = (x: Lado, payloads?: ReadonlyMap<string, string>): { text: string; truncated: boolean } => {
  if (typeof x === "string") return { text: x, truncated: false };
  if (!x || typeof x !== "object") return { text: "", truncated: false };
  const p = x.payload;
  const integral = p && typeof p.path === "string" ? payloads?.get(p.path) : undefined;
  if (integral !== undefined) return { text: integral, truncated: p!.status !== "complete" };
  return { text: typeof x.text === "string" ? x.text : "", truncated: x.truncated === true };
};
const escapar = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** O identificador como token inteiro: nada de letra, dígito, `_` ou `-` colado antes ou depois. */
const token = (ref: string): RegExp => new RegExp(`(?<![A-Za-z0-9_-])${escapar(ref)}(?![A-Za-z0-9_-])`);

function eventos(text: string | null): ToolEvent[] | null {
  if (text === null) return null;
  const out: ToolEvent[] = [];
  for (const line of text.split(/\r?\n/).filter(l => l.trim())) {
    try { out.push(JSON.parse(line) as ToolEvent); } catch { return null; }
  }
  return out;
}

const contar = <T extends string>(xs: T[]): Record<string, number> => xs.reduce<Record<string, number>>((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {});

const LIMITE = "a projeção do evento guarda até 4.000 caracteres de entrada e de resultado por chamada; quando a ponte gravou o payload integral conferido, a busca usa o texto inteiro (NAT-82). Com algum lado ainda cortado (acima do limite declarado, sem orçamento, falha de escrita ou pacote anterior), identificador não achado é não verificável, não falso";

/**
 * Resumo do registro de inspeção de um pacote. `toolEvents` = conteúdo de tool-events.ndjson (ou null).
 * `payloads` = payloads integrais JÁ CONFERIDOS pelo leitor do pacote (verifyToolPayloads), por caminho.
 */
export function resumirInspecao(findings: AnyFindings | null, toolEvents: string | null, payloads?: ReadonlyMap<string, string>): ResumoInspecao {
  const vazio = { formato: INSPECTION_SUMMARY_VERSION, contrato: null, declarado: null, comprovacao: null } as const;
  if (!findings) return { ...vazio, estado: "indisponivel", texto: "registro indisponível (sem submissão aceita)" };
  if (findings.contract === "findings.v1") {
    return { ...vazio, estado: "indisponivel", texto: "registro indisponível (pacote findings.v1, anterior ao registro de inspeção) — não é zero cobertura" };
  }
  if (findings.inspectionStatus === "invalid") {
    const erros = findings.inspectionErrors ?? [];
    return { ...vazio, estado: "invalido", contrato: findings.inspectionContract, erros,
      texto: `registro inválido (${erros.length} erro(s) de contrato; guardado à parte) — achados aceitos normalmente; não é zero cobertura` };
  }
  const l = findings.report.inspection;
  if (!l) return { ...vazio, estado: "nao-enviado", texto: "registro não enviado pelo agente (findings.v2 sem inspection) — não é zero cobertura" };

  const origem = (xs: { origin: "browser" | "validation-tool" }[]) =>
    ({ browser: xs.filter(x => x.origin === "browser").length, "validation-tool": xs.filter(x => x.origin === "validation-tool").length });
  const linked = new Set(l.candidates.flatMap(c => c.findings ?? []));
  const declarado: NonNullable<ResumoInspecao["declarado"]> = {
    completude: l.completion, universo: "regioes-declaradas-pelo-agente", coberturaDaPagina: "desconhecida",
    regioes: { total: l.regions.length, inspecionadas: l.regions.filter(r => r.status === "inspected").length,
      parciais: l.regions.filter(r => r.status === "partial").length, naoInspecionadas: l.regions.filter(r => r.status === "not-inspected").length,
      porOrigem: origem(l.regions) },
    estados: { total: l.states.length, confirmados: l.states.filter(s => s.arrival.status === "confirmed").length,
      declarados: l.states.filter(s => s.arrival.status === "declared").length, naoAlcancados: l.states.filter(s => s.arrival.status === "not-reached").length },
    itens: { total: l.items.length, concluidos: l.items.filter(i => i.status === "completed").length, falhos: l.items.filter(i => i.status === "failed").length,
      indisponiveis: l.items.filter(i => i.status === "not-available").length, omitidos: l.items.filter(i => i.status === "omitted").length },
    candidatos: { total: l.candidates.length, aceitos: l.candidates.filter(c => c.decision === "accepted").length,
      rejeitados: l.candidates.filter(c => c.decision === "rejected").length, incertos: l.candidates.filter(c => c.decision === "uncertain").length,
      porOrigem: origem(l.candidates) },
    achadosSemCandidato: findings.report.findings.filter((_f, i) => !linked.has(i)).length,
    limitacoes: { total: l.limitations.length, porTipo: contar(l.limitations.map(x => x.kind)) },
  };

  const evs = eventos(toolEvents);
  let comprovacao: NonNullable<ResumoInspecao["comprovacao"]>;
  if (evs === null) {
    comprovacao = { estado: "sem-eventos", fonte: toolEvents === null ? "sem tool-events no pacote" : "tool-events.ndjson em formato não reconhecido",
      chegadasComprovadas: null, chegadas: null, referencias: { citadas: 0, comprovadas: null, naoVerificaveis: null, naoEncontradas: null }, limite: LIMITE };
  } else {
    const lados = evs.filter(e => e.kind === "call" && e.isError !== true).flatMap(e => [lado(e.args, payloads), lado(e.result, payloads)]);
    const algumCortado = lados.some(x => x.truncated);
    const verificar = (ref: string): Verificacao => {
      const r = ref.trim();
      if (r && lados.some(x => token(r).test(x.text))) return "comprovado";
      return algumCortado ? "nao-verificavel" : "nao-encontrado";
    };
    const chegadas: Record<Verificacao, string[]> = { comprovado: [], "nao-verificavel": [], "nao-encontrado": [] };
    for (const s of l.states.filter(x => x.arrival.status === "confirmed")) chegadas[verificar(s.arrival.originRef ?? "")].push(s.id);
    const refs = [...new Set([
      ...l.states.flatMap(s => [...s.evidence, ...(s.arrival.originRef ? [s.arrival.originRef] : [])]),
      ...l.items.flatMap(i => i.evidence), ...l.candidates.flatMap(c => [...c.evidence, ...(c.originRef ? [c.originRef] : [])]),
      ...l.regions.flatMap(r => r.originRef ? [r.originRef] : []),
    ].map(r => r.trim()).filter(Boolean))];
    const v = refs.map(verificar);
    comprovacao = { estado: "medido", fonte: `tool-events.ndjson (chamadas sem erro: args e result, token inteiro; ${payloads?.size ?? 0} payload(s) integral(is) conferido(s))`,
      chegadasComprovadas: chegadas.comprovado.length, chegadas,
      referencias: { citadas: refs.length, comprovadas: v.filter(x => x === "comprovado").length,
        naoVerificaveis: v.filter(x => x === "nao-verificavel").length, naoEncontradas: v.filter(x => x === "nao-encontrado").length },
      limite: LIMITE };
  }
  const d = declarado;
  const nv = comprovacao.chegadas?.["nao-verificavel"].length ?? 0;
  const texto = `registro ${d.completude === "complete" ? "declarado completo" : "parcial"} pelo agente: ` +
    `${d.regioes.inspecionadas} de ${d.regioes.total} região(ões) que ele mesmo descobriu inspecionadas; ` +
    `${d.estados.total} estado(s) (${d.estados.confirmados} confirmado(s) por ele` +
    `${comprovacao.chegadasComprovadas === null ? "" : `, ${comprovacao.chegadasComprovadas} com evento de ferramenta${nv ? `, ${nv} não verificável(is)` : ""}`}); ` +
    `${d.candidatos.total} candidato(s); ${d.limitacoes.total} limitação(ões). Cobertura da página: desconhecida.`;
  return { formato: INSPECTION_SUMMARY_VERSION, estado: "registrado", texto, contrato: findings.inspectionContract, declarado, comprovacao };
}
