/**
 * NAT-84 (parte do eval) — destino de cada candidato de ferramenta e auditoria final de consistência.
 *
 * Feito pelo HARNESS depois da coleta, a partir de três coisas que o pacote já tem: o relatório que o COLETOR
 * gravou (findings.json; nunca `save_report`, que não é anunciado no perfil `evaluation`), o tool-events.ndjson
 * das pontes e os payloads integrais conferidos (NAT-82, D-118). Nada aqui é escrito pelo agente nem volta para ele.
 *
 * 1. Livro de destinos. Todo candidato que a ferramenta de validação ENTREGOU ao agente (cada membro de cada
 *    família da 2.11.0, cada item de página plana das versões anteriores) recebe um destino:
 *      accepted | rejected | uncertain | not-examined
 *    tirado do que o agente declarou no registro de inspeção (inspection.v1), por ordem de precedência:
 *      a. candidato do registro que cita o id do MEMBRO (originRef ou evidence, token inteiro);
 *      b. candidato do registro que cita o id da FAMÍLIA — vale para cada membro recebido dela;
 *      c. achado enviado que cita o id do membro ou da família na evidência — conta como aceito por achado;
 *      d. nenhum → not-examined.
 *    O nível mais específico vence: um membro com candidato próprio fica com o próprio destino mesmo quando a
 *    família inteira foi declarada de outro jeito. Decisões diferentes no MESMO nível → `uncertain` com
 *    `conflito: true` (não se escolhe uma). `acceptedByAgent` (este livro), `ruleApplicable` e `confirmedByGate`
 *    (o que o oráculo devolveu na página de membros) ficam em campos separados; nenhum é derivado do outro, e um
 *    candidato do oráculo pode ser falso e rejeitado.
 * 2. Auditoria final: verificações que viram RELATÓRIO, nunca exclusão silenciosa nem nota. Cada verificação diz o
 *    escopo (`ambos` os braços, ou `oraculo`, que só existe onde houve ferramenta de validação) e se se aplica
 *    ao pacote. No braço sem não há candidato de ferramenta: as verificações de escopo `oraculo` saem
 *    `aplica: false`, sem ocorrência — não há exigência que só um braço possa cumprir.
 * 3. Parcial. Tempo, orçamento ou corte → `parcial.parcial: true` com motivos e o número de candidatos conhecidos
 *    não revisados. Relatório parcial com `findings: []` é válido; a submissão continua obrigatória (sem
 *    submissão = estado do run, registrado como tal). Nada daqui entra na pontuação, na elegibilidade ou em
 *    critério de exclusão: `efeito` é constante.
 *
 * Legado: pacote findings.v1, registro ausente ou inválido → os candidatos recebidos são listados com
 * `destino: null` (registro indisponível) — nada é reconstruído. Respostas sem famílias (validador < 2.11.0)
 * entram pelo adaptador da página plana: cada item é um candidato sem família.
 */
import type { AnyFindings, InspectionAudit, InspectionAuditCheck, InspectionAuditMember, InspectionLedger } from "../contracts/index";
import { eventos, lado, token, verificadorDeReferencias, type ToolEvent } from "./inspection-ledger";

export const INSPECTION_AUDIT_VERSION = "auditoria-inspecao-1.0.0";
export const INSPECTION_AUDIT_EFFECT = "relatorio-de-processo: nao entra na pontuacao, na elegibilidade nem em exclusao" as const;

/** Ferramentas do oráculo que devolvem candidatos (scanners e continuação). Eventos antigos sem `server` usam o nome. */
const ORACLE_CANDIDATE_TOOLS = new Set(["scan_page", "check_token_compliance", "check_component_structure", "run_axe_scan", "get_finding_details"]);
const MAX_EXEMPLOS = 10;

type Destino = "accepted" | "rejected" | "uncertain" | "not-examined";
/** Uma entrega concreta: o id que a ferramenta deu NESTE lote (os ids F-NNN são sequenciais por processo). */
interface Copia {
  id: string; scanId: string | null; familyId: string | null; ordinal: number | null; identity: string | null;
  ruleApplicable: string | null; confirmedByGate: boolean | null; gateVerdict: string | null; temStatus: boolean;
}
/**
 * Um candidato equivalente: as cópias do mesmo achado em lotes diferentes (reescaneamento). A equivalência é a
 * identidade do achado (`identity`, devolvida na página de membros) dentro da família; sem ela, a posição do
 * membro na família (a família é a mesma chave de conteúdo e estado, e a ordem dos membros é a do lote);
 * fora de família (página plana), o próprio id.
 */
export interface Equivalente {
  chave: string; equivalencia: "identidade" | "posicao-na-familia" | "id"; familyId: string | null; identity: string | null;
  copias: Copia[];
}
interface LoteBruto { scanId: string; fp: string | null; visao: "familias" | "achados"; totalAchados: number | null; familias: Set<string>; recebidos: Set<string> }

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);

export interface EntradaAuditoria {
  campaignId: string;
  runId: string;
  fixture: boolean;
  /** Envelope aceito pelo coletor, ou null quando não houve submissão aceita. */
  findings: AnyFindings | null;
  /** Conteúdo de tool-events.ndjson (ou null). */
  toolEvents: string | null;
  /** Payloads integrais JÁ conferidos (verifyToolPayloads), por caminho no pacote. */
  payloads?: ReadonlyMap<string, string>;
  /** Falha registrada no run (run.failure), quando houve. */
  falha?: { reason: string; detail?: string } | null;
}

/** Lê os candidatos que o oráculo entregou, a partir das respostas (payload integral quando conferido). */
export function candidatosRecebidos(evs: ToolEvent[], payloads?: ReadonlyMap<string, string>) {
  const copias: Copia[] = [];
  const contagem = new Map<string, number>();
  const familiaScans = new Map<string, Set<string>>();
  const lotes = new Map<string, LoteBruto>();
  const fpDe = new Map<string, string>();
  let respostas = 0;
  const ilegiveis: string[] = [];
  let saveReport = 0;

  const familia = (familyId: string, scanId: string | null, n: number | null) => {
    if (n !== null) contagem.set(familyId, Math.max(contagem.get(familyId) ?? 0, n));
    else if (!contagem.has(familyId)) contagem.set(familyId, 0);
    const ss = familiaScans.get(familyId) ?? new Set<string>();
    if (scanId) ss.add(scanId);
    familiaScans.set(familyId, ss);
  };
  const lote = (scanId: string, visao: LoteBruto["visao"], total: number | null): LoteBruto => {
    let l = lotes.get(scanId);
    if (!l) { l = { scanId, fp: null, visao, totalAchados: total, familias: new Set(), recebidos: new Set() }; lotes.set(scanId, l); }
    if (total !== null) l.totalAchados = Math.max(l.totalAchados ?? 0, total);
    return l;
  };
  const copia = (c: Partial<Copia> & { id: string }) => copias.push({ scanId: null, familyId: null, ordinal: null, identity: null,
    ruleApplicable: null, confirmedByGate: null, gateVerdict: null, temStatus: false, ...c });

  for (const e of evs) {
    if (e.kind !== "call" || e.isError === true) continue;
    const tool = typeof e.tool === "string" ? e.tool : "";
    if (tool === "save_report") saveReport++;
    const doOraculo = e.server === "oracle" || (e.server === undefined && ORACLE_CANDIDATE_TOOLS.has(tool));
    if (!doOraculo || !ORACLE_CANDIDATE_TOOLS.has(tool)) continue;
    respostas++;
    const { text } = lado(e.result, payloads);
    let r: unknown;
    try { r = JSON.parse(text); } catch { ilegiveis.push(`${String(e.server ?? "?")}#${String(e.seq ?? "?")} ${tool}`); continue; }
    if (!isRecord(r)) continue;
    const scanId = str(r.scanId);
    const fp = str(r.stateFingerprint) ?? (isRecord(r.ledger) ? str(r.ledger.stateFingerprint) : null);
    if (scanId && fp) fpDe.set(scanId, fp);

    if (r.view === "families" && Array.isArray(r.families)) {
      const l = scanId ? lote(scanId, "familias", num(r.totalFindings)) : null;
      for (const f of r.families) {
        if (!isRecord(f) || !str(f.familyId)) continue;
        const familyId = f.familyId as string;
        familia(familyId, scanId, num(f.count));
        l?.familias.add(familyId);
        (Array.isArray(f.memberIds) ? f.memberIds : []).forEach((id: unknown, i: number) => {
          if (!str(id)) return;
          copia({ id: id as string, scanId, familyId, ordinal: i });
          l?.recebidos.add(id as string);
        });
      }
    } else if (r.view === "family-members" && str(r.familyId) && Array.isArray(r.members)) {
      const familyId = r.familyId as string;
      familia(familyId, scanId, num(r.total));
      const base = num(r.cursor) ?? 0;
      r.members.forEach((x: unknown, i: number) => {
        if (!isRecord(x) || !str(x.id)) return;
        const st = isRecord(x.status) ? x.status : null;
        copia({ id: x.id as string, scanId, familyId, ordinal: base + i, identity: str(x.identity),
          ...(st ? { temStatus: true, ruleApplicable: str(st.ruleApplicable), confirmedByGate: typeof st.confirmedByGate === "boolean" ? st.confirmedByGate : null,
            gateVerdict: str(st.gateVerdict) } : {}) });
        if (scanId) lotes.get(scanId)?.recebidos.add(x.id as string);
      });
    } else if (Array.isArray(r.findings)) {
      // Página plana: a visão `findings` da 2.11.0 e TODA resposta das versões anteriores (adaptador de legado).
      const l = scanId ? lote(scanId, "achados", num(r.total)) : null;
      for (const x of r.findings) {
        if (!isRecord(x) || !str(x.id)) continue;
        copia({ id: x.id as string, scanId });
        l?.recebidos.add(x.id as string);
      }
    }
  }
  for (const l of lotes.values()) l.fp = fpDe.get(l.scanId) ?? null;

  // Equivalência entre reescaneamentos: posição → identidade quando alguma página de membros a deu.
  const identidadeDaPosicao = new Map<string, string>();
  for (const c of copias) if (c.familyId && c.ordinal !== null && c.identity) identidadeDaPosicao.set(`${c.familyId}#${c.ordinal}`, c.identity);
  const equivalentes = new Map<string, Equivalente>();
  for (const c of copias) {
    let chave: string; let equivalencia: Equivalente["equivalencia"]; let identity: string | null = null;
    if (c.familyId) {
      identity = c.identity ?? (c.ordinal !== null ? identidadeDaPosicao.get(`${c.familyId}#${c.ordinal}`) ?? null : null);
      if (identity) { chave = `${c.familyId}|${identity}`; equivalencia = "identidade"; }
      else { chave = `${c.familyId}#${c.ordinal}`; equivalencia = "posicao-na-familia"; }
    } else { chave = `id:${c.id}`; equivalencia = "id"; }
    const q = equivalentes.get(chave) ?? { chave, equivalencia, familyId: c.familyId, identity, copias: [] };
    q.copias.push(c);
    equivalentes.set(chave, q);
  }
  return { equivalentes, contagem, familiaScans, lotes, respostas, ilegiveis, saveReport };
}

interface Decl { id: string; decision: "accepted" | "rejected" | "uncertain"; reason?: string; findings: number[]; evidence: string[] }

function refsDe(c: InspectionLedger["candidates"][number]): string[] {
  return [...(c.originRef ? [c.originRef] : []), ...c.evidence];
}
const cita = (refs: string[], id: string): boolean => { const re = token(id); return refs.some(r => re.test(r)); };

/** Auditoria final de um pacote. Pura: não lê disco. */
export function auditarInspecao(input: EntradaAuditoria): InspectionAudit {
  const { findings } = input;
  const evs = eventos(input.toolEvents) ?? [];
  const recebidos = candidatosRecebidos(evs, input.payloads);
  const ledger: InspectionLedger | null = findings && findings.contract === "findings.v2" && findings.inspectionStatus === "valid"
    ? findings.report.inspection ?? null : null;
  const registro: InspectionAudit["registro"] = !findings ? "sem-submissao"
    : findings.contract === "findings.v1" ? "indisponivel"
    : findings.inspectionStatus === "invalid" ? "invalido"
    : ledger ? "registrado" : "nao-enviado";
  const relatorio = findings?.report ?? null;

  // ── destinos por membro
  const decls = (ledger?.candidates ?? []).map(c => ({ c, refs: refsDe(c) }));
  const membros: InspectionAuditMember[] = [];
  for (const q of recebidos.equivalentes.values()) {
    const ids = [...new Set(q.copias.map(c => c.id))];
    const st = [...q.copias].reverse().find(c => c.temStatus) ?? null;
    const base = { memberId: ids[0], memberIds: ids, familyId: q.familyId, identity: q.identity, equivalencia: q.equivalencia,
      scanIds: [...new Set(q.copias.flatMap(c => (c.scanId ? [c.scanId] : [])))].sort(),
      acceptedByAgent: null as boolean | null, ruleApplicable: st?.ruleApplicable ?? null, confirmedByGate: st?.confirmedByGate ?? null, gateVerdict: st?.gateVerdict ?? null };
    if (!ledger) {
      membros.push({ ...base, destino: null, base: "sem-registro", conflito: false, candidatos: [], achados: [], motivo: null, evidencia: [] });
      continue;
    }
    // Uma decisão sobre QUALQUER cópia (qualquer reescaneamento) vale para o candidato equivalente.
    const citaAlguma = (refs: string[]) => ids.some(id => cita(refs, id));
    let nivel: "candidato-membro" | "candidato-familia" | "achado" | "nenhum" = "nenhum";
    let escolhidos: Decl[] = decls.filter(d => citaAlguma(d.refs)).map(({ c }) => ({ ...c, findings: c.findings ?? [] }));
    if (escolhidos.length) nivel = "candidato-membro";
    else if (q.familyId) {
      escolhidos = decls.filter(d => cita(d.refs, q.familyId!)).map(({ c }) => ({ ...c, findings: c.findings ?? [] }));
      if (escolhidos.length) nivel = "candidato-familia";
    }
    let achados: number[] = [];
    let destino: Destino;
    let conflito = false;
    let motivo: string | null = null;
    let evidencia: string[] = [];
    if (escolhidos.length) {
      const ds = [...new Set(escolhidos.map(d => d.decision))];
      conflito = ds.length > 1;
      destino = conflito ? "uncertain" : ds[0];
      achados = [...new Set(escolhidos.flatMap(d => d.decision === "rejected" ? [] : d.findings))].sort((a, b) => a - b);
      motivo = conflito ? `decisões diferentes no mesmo nível: ${escolhidos.map(d => `${d.id}=${d.decision}`).join(", ")}`
        : escolhidos.map(d => d.reason).filter((x): x is string => Boolean(x)).join(" | ") || null;
      evidencia = [...new Set(escolhidos.flatMap(d => d.evidence))].slice(0, 5);
    } else {
      const alvos = [...ids, ...(q.familyId ? [q.familyId] : [])];
      achados = (relatorio?.findings ?? []).flatMap((f, i) => (alvos.some(id => cita([...f.evidence, ...(f.rule ? [f.rule] : [])], id)) ? [i] : []));
      if (achados.length) { nivel = "achado"; destino = "accepted"; motivo = "achado enviado cita o candidato sem decisão no registro"; }
      else destino = "not-examined";
    }
    membros.push({ ...base, acceptedByAgent: destino === "accepted" ? true : destino === "rejected" ? false : null,
      destino, base: nivel, conflito, candidatos: escolhidos.map(d => d.id), achados, motivo, evidencia });
  }

  // ── famílias e lotes: o que se sabe que existe e não chegou ao agente. Recebido = candidato equivalente
  // (não a cópia): reescanear a mesma família não soma membros.
  const equivPorFamilia = new Map<string, number>();
  for (const q of recebidos.equivalentes.values()) if (q.familyId) equivPorFamilia.set(q.familyId, (equivPorFamilia.get(q.familyId) ?? 0) + 1);
  const familias = [...recebidos.contagem.entries()].map(([familyId, n]) => {
    const rec = equivPorFamilia.get(familyId) ?? 0;
    return { familyId, scanIds: [...(recebidos.familiaScans.get(familyId) ?? [])].sort(), contagem: Math.max(n, rec), recebidos: rec,
      naoRecebidos: Math.max(0, n - rec) };
  });
  // Lotes agrupados pelo estado (fingerprint): famílias nunca vistas em NENHUM lote do mesmo estado.
  const grupos = new Map<string, { scanIds: string[]; fp: string | null; visao: "familias" | "achados"; total: number | null; familias: Set<string>; maxRecebidos: number }>();
  for (const l of recebidos.lotes.values()) {
    const k = `${l.visao}|${l.fp ?? `scan:${l.scanId}`}`;
    const g = grupos.get(k) ?? { scanIds: [], fp: l.fp, visao: l.visao, total: null, familias: new Set<string>(), maxRecebidos: 0 };
    g.scanIds.push(l.scanId);
    if (l.totalAchados !== null) g.total = Math.max(g.total ?? 0, l.totalAchados);
    for (const f of l.familias) g.familias.add(f);
    g.maxRecebidos = Math.max(g.maxRecebidos, l.recebidos.size);
    grupos.set(k, g);
  }
  const contagemDe = new Map(familias.map(f => [f.familyId, f.contagem]));
  const lotes = [...grupos.values()].map(g => {
    const conhecidos = g.visao === "familias" ? [...g.familias].reduce((s, id) => s + (contagemDe.get(id) ?? 0), 0) : g.maxRecebidos;
    return { scanIds: g.scanIds.sort(), stateFingerprint: g.fp, visao: g.visao, totalAchados: g.total,
      naoRecebidos: g.total === null ? null : Math.max(0, g.total - conhecidos) };
  });
  const naoRecebidos = familias.reduce((s, f) => s + f.naoRecebidos, 0) + lotes.reduce((s, l) => s + (l.naoRecebidos ?? 0), 0);

  // ── verificações
  const ha = membros.length > 0 || recebidos.respostas > 0;
  const semOraculo = "nenhum candidato de ferramenta de validação recebido neste pacote";
  const semRegistro = registro === "sem-submissao" ? "sem submissão aceita" : `registro ${registro}`;
  const check = (id: InspectionAuditCheck["id"], escopo: InspectionAuditCheck["escopo"], aplica: boolean, motivoNaoAplica: string | null,
    ocorrencias: string[], descricao: string): InspectionAuditCheck =>
    ({ id, escopo, descricao, aplica, ...(aplica ? {} : { motivoNaoAplica: motivoNaoAplica ?? "não se aplica" }),
      ocorrencias: aplica ? ocorrencias.length : 0, exemplos: aplica ? ocorrencias.slice(0, MAX_EXEMPLOS) : [] });

  const verificar = input.toolEvents === null ? null : verificadorDeReferencias(evs, input.payloads);
  const verificacoes: InspectionAuditCheck[] = [
    check("regiao-nao-percorrida", "ambos", Boolean(ledger), semRegistro,
      (ledger?.regions ?? []).filter(r => r.status !== "inspected").map(r => `${r.id} (${r.status})`),
      "região que o próprio agente declarou e não percorreu inteira (status partial/not-inspected)"),
    check("reproducao-nao-comprovada", "ambos", Boolean(ledger), semRegistro,
      (ledger?.states ?? []).flatMap(s => {
        if (s.arrival.status === "not-reached") return [`${s.id} (não alcançado)`];
        if (s.recipe.length <= 1) return [];
        if (s.arrival.status !== "confirmed") return [`${s.id} (chegada declarada, sem identificador de ferramenta)`];
        const v = verificar ? verificar(s.arrival.originRef ?? "") : "nao-verificavel";
        return v === "comprovado" ? [] : [`${s.id} (originRef ${v})`];
      }),
      "estado com receita além do carregamento cuja chegada não foi comprovada por evento de ferramenta — limitação de estado, não erro"),
    check("candidato-sem-destino", "oraculo", Boolean(ledger) && ha, ledger ? semOraculo : semRegistro,
      membros.filter(m => m.destino === "not-examined").map(m => `${m.memberId}${m.familyId ? ` (${m.familyId})` : ""}`),
      "candidato entregue pela ferramenta de validação sem decisão do agente (nem por membro, nem pela família, nem por achado)"),
    check("aceito-sem-achado", "ambos", Boolean(ledger), semRegistro,
      (() => {
        // Uma ocorrência por candidato do registro; os membros que ele cobre vão como detalhe.
        const semAchado = membros.filter(m => m.destino === "accepted" && m.achados.length === 0);
        const porCandidato = (ledger?.candidates ?? []).filter(c => c.decision === "accepted" && !(c.findings ?? []).length).map(c => {
          const ms = semAchado.filter(m => m.candidatos.includes(c.id));
          return `candidato ${c.id}${ms.length ? ` (${ms.length} membro(s): ${ms.slice(0, 3).map(m => m.memberId).join(", ")}${ms.length > 3 ? ", …" : ""})` : ""}`;
        });
        const cobertos = new Set((ledger?.candidates ?? []).filter(c => c.decision === "accepted" && !(c.findings ?? []).length).map(c => c.id));
        return [...porCandidato, ...semAchado.filter(m => !m.candidatos.some(id => cobertos.has(id))).map(m => `membro ${m.memberId}`)];
      })(),
      "aceito sem achado enviado que o carregue"),
    check("evidencia-nao-resolvida", "ambos", Boolean(ledger) && verificar !== null, ledger ? "sem tool-events no pacote" : semRegistro,
      ledger && verificar ? [...new Set([
        ...ledger.states.flatMap(s => [...s.evidence, ...(s.arrival.originRef ? [s.arrival.originRef] : [])]),
        ...ledger.items.flatMap(i => i.evidence), ...ledger.candidates.flatMap(refsDe),
        ...ledger.regions.flatMap(r => (r.originRef ? [r.originRef] : [])),
      ].map(r => r.trim()).filter(Boolean))].flatMap(r => { const v = verificar(r); return v === "comprovado" ? [] : [`${r} (${v})`]; }) : [],
      "identificador citado no registro que não aparece em nenhuma chamada sem erro (não encontrado, ou não verificável por corte)"),
    check("cursor-nao-consumido", "oraculo", ha, semOraculo,
      [...familias.filter(f => f.naoRecebidos > 0).map(f => `${f.familyId}: ${f.recebidos} de ${f.contagem} membros recebidos`),
        ...lotes.filter(l => (l.naoRecebidos ?? 0) > 0).map(l => `${l.scanIds.join("+")}: ${l.naoRecebidos} candidato(s) de ${l.visao === "familias" ? "famílias" : "páginas"} não recebidas`)],
      "a ferramenta anunciou mais candidatos do que o agente chegou a receber (cursor de membros ou de página não percorrido)"),
    check("resposta-nao-legivel", "oraculo", recebidos.respostas > 0, semOraculo, recebidos.ilegiveis,
      "resposta da ferramenta de validação que não pôde ser lida inteira (projeção cortada sem payload integral): os candidatos dela são desconhecidos"),
    check("destino-contraditorio", "oraculo", Boolean(ledger) && ha, ledger ? semOraculo : semRegistro,
      membros.filter(m => m.conflito).map(m => `${m.memberId}: ${m.motivo}`),
      "o mesmo candidato recebeu decisões diferentes no mesmo nível do registro"),
  ];

  // ── parcial
  const motivos: string[] = [];
  if (!findings) motivos.push("sem-submissao");
  if (input.falha) motivos.push(`falha-da-execucao:${input.falha.reason}`);
  if (ledger?.completion === "partial") motivos.push("registro-parcial");
  for (const k of [...new Set((ledger?.limitations ?? []).map(l => l.kind))].filter(k => k === "budget" || k === "truncated" || k === "tool-failure")) motivos.push(`limitacao:${k}`);
  if (naoRecebidos > 0) motivos.push("candidatos-nao-recebidos");
  if (recebidos.ilegiveis.length) motivos.push("respostas-nao-legiveis");
  const naoExaminados = membros.filter(m => m.destino === "not-examined" || m.destino === null).length;
  const parcial = { parcial: motivos.length > 0, motivos, candidatosRecebidos: membros.length, candidatosConhecidos: membros.length + naoRecebidos,
    candidatosConhecidosNaoRevisados: naoExaminados + naoRecebidos };

  const contar = (d: Destino) => membros.filter(m => m.destino === d).length;
  const destinos = { accepted: contar("accepted"), rejected: contar("rejected"), uncertain: contar("uncertain"), "not-examined": contar("not-examined"),
    semRegistro: membros.filter(m => m.destino === null).length };
  const sinalizadas = verificacoes.filter(v => v.aplica && v.ocorrencias > 0);
  const texto = (registro === "sem-submissao" ? "sem submissão aceita (estado do run; a submissão é obrigatória)"
    : `registro ${registro}`) +
    `; ${membros.length} candidato(s) de ferramenta recebido(s)` +
    (membros.length ? ` — aceitos ${destinos.accepted}, rejeitados ${destinos.rejected}, incertos ${destinos.uncertain}, não examinados ${destinos["not-examined"]}` +
      (destinos.semRegistro ? `, sem registro ${destinos.semRegistro}` : "") : "") +
    (naoRecebidos ? `; ${naoRecebidos} anunciado(s) e não recebido(s)` : "") +
    `; auditoria: ${sinalizadas.length ? sinalizadas.map(v => `${v.id} ${v.ocorrencias}`).join(", ") : "nada sinalizado"}` +
    (parcial.parcial ? ` · parcial (${motivos.join(", ")}; ${parcial.candidatosConhecidosNaoRevisados} conhecido(s) não revisado(s))` : "") +
    ". Relatório de processo: não pontua nem exclui.";

  return {
    contract: "inspection-audit.v1", fixture: input.fixture, campaignId: input.campaignId, runId: input.runId,
    producedBy: "harness", auditVersion: INSPECTION_AUDIT_VERSION, efeito: INSPECTION_AUDIT_EFFECT,
    fonteDoRelatorio: "coletor", registro, texto,
    oraculo: { respostas: recebidos.respostas, respostasNaoLegiveis: recebidos.ilegiveis.length, chamadasSaveReport: recebidos.saveReport,
      familias, lotes, naoRecebidos },
    destinos, membros, verificacoes, parcial,
  };
}
