/**
 * NAT-84 (parte do eval) — destino de cada candidato de ferramenta e auditoria final. Sem modelo, sem rede.
 *
 * As respostas do oráculo são escritas à mão no formato da 2.11.0 (govbr-ds-validator src/responses/families.ts:
 * `view: "families"` com `memberIds`/`nextMemberCursor`; `view: "family-members"` com `members[].status`) e no
 * formato plano anterior (`findings[]`, sem família), e gravadas como a ponte grava (`{ text, truncated }`).
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRACTS_DIR, validateContract, type AnyFindings, type Findings, type FindingsV2, type InspectionAudit, type InspectionLedger } from "../contracts/index";
import { auditarInspecao, type EntradaAuditoria } from "./inspection-audit";

let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

const EX = join(CONTRACTS_DIR, "examples");
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const orcamento = readJson<FindingsV2>(join(EX, "valid", "findings--v2-sem-zero-findings-orcamento.json"));
const legado = readJson<Findings>(join(EX, "valid", "findings--com.json"));

// ───────────────────────────────────────────────────────────────── eventos como a ponte grava

let seq = 0;
const PROJ = 4000;
function evento(tool: string, result: unknown, server: string | undefined = "oracle", args: unknown = {}) {
  const text = JSON.stringify(result, null, 2);
  return { kind: "call", seq: seq++, ...(server ? { server } : {}), tool, isError: false, outcome: "ok",
    args: { text: JSON.stringify(args), truncated: false }, result: { text, truncated: false } };
}
const ndjson = (evs: unknown[]) => evs.map(e => JSON.stringify(e)).join("\n") + "\n";

const FAM = "FAM-0123456789ab";
const ids = (n: number, from = 0) => Array.from({ length: n }, (_x, i) => `ds-token-dia-${String(from + i + 1).padStart(2, "0")}`);
const paginaFamilias = (memberIds: string[], count: number, extra: Record<string, unknown> = {}) => ({
  url: "http://127.0.0.1:3100/fixture.html", status: "ok", scanId: "S-page-001", stateFingerprint: "fp-fixture", view: "families",
  totalFindings: count, totalFamilies: 1, cursor: 0, count: 1,
  families: [{ familyId: FAM, count, rule: { source: "ds", id: "ds-token-color" }, property: "color", memberIds,
    membersReturned: memberIds.length, membersNotReturned: count - memberIds.length,
    ...(memberIds.length < count ? { nextMemberCursor: memberIds.length, nextMemberCall: `get_finding_details(scanId, familyId="${FAM}", cursor=${memberIds.length})` } : {}) }],
  truncated: memberIds.length < count, complete: memberIds.length >= count, ...extra,
});
const paginaMembros = (memberIds: string[], total: number, cursor: number, status: (id: string) => Record<string, unknown> = () => ({})) => ({
  scanId: "S-page-001", view: "family-members", familyId: FAM, detail: "summary", total, cursor, count: memberIds.length,
  members: memberIds.map(id => ({ id, locator: `#${id}`, value: "color: rgb(1, 2, 3)", status: { acceptedByAgent: null, ruleApplicable: "not-checked",
    confirmedByGate: null, gateVerdict: null, ...status(id) } })),
  truncated: cursor + memberIds.length < total, complete: cursor + memberIds.length >= total,
});

/** 40 candidatos idênticos: página de famílias (25 ids, cursor 25) + página de membros (os 15 restantes). */
const QUARENTA = ids(40);
const eventos40 = (consumir = true, status?: (id: string) => Record<string, unknown>) => ndjson([
  evento("browser_navigate", { ok: true }, "playwright"),
  evento("scan_page", paginaFamilias(QUARENTA.slice(0, 25), 40)),
  ...(consumir ? [evento("get_finding_details", paginaMembros(QUARENTA.slice(25), 40, 25, status), "oracle", { scanId: "S-page-001", familyId: FAM, cursor: 25 })] : []),
]);

function comRegistro(ledger: Partial<InspectionLedger>, findingsEvidence: string[][] = [[FAM]]): FindingsV2 {
  const f = clone(orcamento);
  f.runId = "fixture-run-com-01";
  f.report.findings = findingsEvidence.map((evidence, i) => ({ selector: `.fixture-dia-${i}`, rule: null, observed: "valor sintético", expected: "condição sintética",
    state: { viewport: { width: 1280, height: 900 }, steps: [] }, evidence }));
  f.report.inspection = {
    completion: "complete",
    regions: [{ id: "r1", description: "região sintética", origin: "browser", status: "inspected", states: ["s1"] }],
    states: [{ id: "s1", url: "http://127.0.0.1:3100/fixture.html", viewport: { width: 1280, height: 900 }, recipe: [{ action: "load", target: "fixture" }],
      arrival: { status: "declared", observables: ["título visível"] }, evidence: [] }],
    items: [], candidates: [], limitations: [], ...ledger,
  };
  return f;
}
const aceitaFamilia = { id: "c1", state: "s1", origin: "validation-tool" as const, originRef: FAM, subject: ".fixture-dia", observation: "cor fora da escala",
  decision: "accepted" as const, findings: [0], evidence: [FAM] };

const entrada = (findings: AnyFindings | null, toolEvents: string | null, over: Partial<EntradaAuditoria> = {}): EntradaAuditoria =>
  ({ campaignId: "fixture-campanha-01", runId: "fixture-run-com-01", fixture: true, findings, toolEvents, ...over });
function auditar(e: EntradaAuditoria): InspectionAudit {
  const a = auditarInspecao(e);
  const v = validateContract(a);
  assert.ok(v.valid, `inspection-audit.v1 inválido: ${v.errors.map(x => `${x.path} ${x.keyword} ${x.message}`).join("; ")}`);
  return a;
}
const chk = (a: InspectionAudit, id: string) => a.verificacoes.find(v => v.id === id)!;

// ───────────────────────────────────────────────────────────────── aceitação da NAT-84

test("40 candidatos idênticos → 1 família, 40 destinos por membro (decisão declarada pela família)", () => {
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia] }), eventos40()));
  assert.equal(a.oraculo.familias.length, 1);
  assert.deepEqual(a.oraculo.familias[0], { familyId: FAM, scanIds: ["S-page-001"], contagem: 40, recebidos: 40, naoRecebidos: 0 });
  assert.equal(a.membros.length, 40);
  assert.ok(a.membros.every(m => m.destino === "accepted" && m.base === "candidato-familia" && m.acceptedByAgent === true && m.achados.join() === "0"));
  assert.deepEqual(a.destinos, { accepted: 40, rejected: 0, uncertain: 0, "not-examined": 0, semRegistro: 0 });
  assert.equal(chk(a, "cursor-nao-consumido").ocorrencias, 0);
  assert.equal(chk(a, "candidato-sem-destino").ocorrencias, 0);
  assert.equal(a.parcial.parcial, false);
});

test("membro contraditório fica com o próprio destino; candidato do oráculo pode ser falso e rejeitado (3 campos separados)", () => {
  const alvo = QUARENTA[31];
  const rejeita = { id: "c2", state: "s1", origin: "validation-tool" as const, originRef: alvo, subject: `#${alvo}`, observation: "a cor é do próprio componente",
    decision: "rejected" as const, reason: "conferido na interface: valor herdado do componente", evidence: [alvo] };
  const status = (id: string) => (id === alvo ? { ruleApplicable: "passed", confirmedByGate: true, gateVerdict: "confirmed" } : {});
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia, rejeita] }), eventos40(true, status)));
  const m = a.membros.find(x => x.memberId === alvo)!;
  assert.equal(m.destino, "rejected");
  assert.equal(m.base, "candidato-membro");
  assert.equal(m.acceptedByAgent, false);
  assert.equal(m.confirmedByGate, true, "o veredito do portão não é sobrescrito pela decisão do agente");
  assert.equal(m.ruleApplicable, "passed");
  assert.deepEqual(m.candidatos, ["c2"]);
  assert.equal(a.destinos.accepted, 39);
  assert.equal(a.destinos.rejected, 1);
  assert.equal(chk(a, "destino-contraditorio").ocorrencias, 0, "precedência por nível não é conflito");
});

test("decisões diferentes no mesmo nível → incerto com conflito, sinalizado", () => {
  const outra = { ...aceitaFamilia, id: "c3", decision: "rejected" as const, reason: "outra leitura", findings: undefined };
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia, outra] }), eventos40()));
  assert.ok(a.membros.every(m => m.destino === "uncertain" && m.conflito));
  assert.equal(chk(a, "destino-contraditorio").ocorrencias, 40);
});

test("família com cursor não consumido é sinalizada; parcial diz quantos conhecidos não foram revisados", () => {
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia] }), eventos40(false)));
  assert.equal(a.membros.length, 25);
  assert.deepEqual(a.oraculo.familias[0], { familyId: FAM, scanIds: ["S-page-001"], contagem: 40, recebidos: 25, naoRecebidos: 15 });
  const c = chk(a, "cursor-nao-consumido");
  assert.equal(c.ocorrencias, 1);
  assert.match(c.exemplos[0], /25 de 40/);
  assert.equal(a.parcial.parcial, true);
  assert.ok(a.parcial.motivos.includes("candidatos-nao-recebidos"));
  assert.equal(a.parcial.candidatosConhecidos, 40);
  assert.equal(a.parcial.candidatosConhecidosNaoRevisados, 15);
});

test("orçamento esgotado com findings=[] é parcial válido: motivo, conhecidos não revisados, nada excluído", () => {
  const f = clone(orcamento);
  f.runId = "fixture-run-com-01";
  const a = auditar(entrada(f, eventos40(false)));
  assert.equal(a.registro, "registrado");
  assert.equal(a.destinos["not-examined"], 25);
  assert.equal(chk(a, "candidato-sem-destino").ocorrencias, 25);
  assert.deepEqual(a.parcial.motivos, ["registro-parcial", "limitacao:budget", "candidatos-nao-recebidos"]);
  assert.equal(a.parcial.candidatosConhecidosNaoRevisados, 40);
  assert.equal(a.efeito, "relatorio-de-processo: nao entra na pontuacao, na elegibilidade nem em exclusao");
});

test("sem submissão (tempo esgotado): estado do run com motivo; conhecidos todos não revisados", () => {
  const a = auditar(entrada(null, eventos40(false), { falha: { reason: "timeout" } }));
  assert.equal(a.registro, "sem-submissao");
  assert.deepEqual(a.parcial.motivos, ["sem-submissao", "falha-da-execucao:timeout", "candidatos-nao-recebidos"]);
  assert.ok(a.membros.every(m => m.destino === null && m.base === "sem-registro"));
  assert.equal(a.parcial.candidatosConhecidosNaoRevisados, 40);
});

test("legado sem membros (findings.v1, resposta plana sem família, evento sem `server`) valida sem reconstrução", () => {
  const plano = { scanId: "S-axe-001", detail: "summary", total: 3, cursor: 0, count: 2,
    findings: [{ id: "axe-a-1", rule: { id: "image-alt", source: "axe" } }, { id: "axe-a-2", rule: { id: "label", source: "axe" } }],
    truncated: true, nextCursor: 2 };
  const a = auditar(entrada(legado, ndjson([evento("run_axe_scan", plano, undefined)])));
  assert.equal(a.registro, "indisponivel");
  assert.equal(a.membros.length, 2);
  assert.ok(a.membros.every(m => m.destino === null && m.familyId === null && m.base === "sem-registro" && m.acceptedByAgent === null));
  assert.equal(chk(a, "candidato-sem-destino").aplica, false);
  assert.deepEqual(a.oraculo.lotes, [{ scanIds: ["S-axe-001"], stateFingerprint: null, visao: "achados", totalAchados: 3, naoRecebidos: 1 }]);
  assert.equal(chk(a, "cursor-nao-consumido").ocorrencias, 1, "página plana não continuada também é cursor não consumido");
});

test("simetria: sem oráculo não há candidato de ferramenta nem exigência; verificações de ambos os braços iguais", () => {
  const f = comRegistro({ candidates: [] }, [[]]);
  const sem = auditar(entrada(f, ndjson([evento("browser_navigate", { ok: true }, "playwright")])));
  assert.equal(sem.membros.length, 0);
  for (const v of sem.verificacoes.filter(x => x.escopo === "oraculo")) {
    assert.equal(v.aplica, false, v.id);
    assert.equal(v.ocorrencias, 0, v.id);
  }
  assert.equal(sem.parcial.parcial, false);
  // O mesmo registro no braço com, com todos os candidatos decididos: as verificações de escopo `ambos` dão o mesmo.
  const com = auditar(entrada(comRegistro({ candidates: [aceitaFamilia] }, [[FAM]]), eventos40()));
  const ambos = (a: InspectionAudit) => a.verificacoes.filter(v => v.escopo === "ambos").map(v => [v.id, v.aplica, v.ocorrencias]);
  assert.deepEqual(ambos(com), ambos(sem));
});

// ───────────────────────────────────────────────────────────────── reescaneamento (ids F-NNN mudam por lote)

/** A mesma família de 30 (25 listados) num lote de scan_page; os ids são do lote, como os F-NNN do validador. */
const reescan = (scanId: string, prefixo: string) => {
  const p = paginaFamilias(Array.from({ length: 25 }, (_x, i) => `${prefixo}-${String(i + 1).padStart(3, "0")}`), 30);
  return { ...p, scanId };
};

test("reescaneamento: família de 30 com 25 listados, varrida 2 vezes → 25 recebidos, 5 não recebidos, cursor sinalizado", () => {
  const evs = ndjson([evento("scan_page", reescan("S-page-001", "F")), evento("scan_page", reescan("S-page-002", "G"))]);
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia] }), evs));
  assert.equal(a.membros.length, 25, "cópias do mesmo membro não somam");
  assert.ok(a.membros.every(m => m.memberIds.length === 2 && m.equivalencia === "posicao-na-familia" && m.scanIds.join() === "S-page-001,S-page-002"));
  assert.deepEqual(a.oraculo.familias, [{ familyId: FAM, scanIds: ["S-page-001", "S-page-002"], contagem: 30, recebidos: 25, naoRecebidos: 5 }]);
  assert.equal(chk(a, "cursor-nao-consumido").ocorrencias, 1);
  assert.deepEqual(a.oraculo.lotes, [{ scanIds: ["S-page-001", "S-page-002"], stateFingerprint: "fp-fixture", visao: "familias", totalAchados: 30, naoRecebidos: 0 }]);
  assert.equal(a.oraculo.naoRecebidos, 5);
});

test("reescaneamento: decisão sobre o id do 2º lote cobre a cópia do 1º; nada vira não examinado só no braço com", () => {
  const evs = ndjson([evento("scan_page", reescan("S-page-001", "F")), evento("scan_page", reescan("S-page-002", "G"))]);
  const decide = Array.from({ length: 25 }, (_x, i) => ({ id: `d${i}`, state: "s1", origin: "validation-tool" as const, originRef: `G-${String(i + 1).padStart(3, "0")}`,
    subject: "x", observation: "y", ...(i === 3 ? { decision: "rejected" as const, reason: "falso: valor do componente" } : { decision: "accepted" as const, findings: [0] }), evidence: [] }));
  const a = auditar(entrada(comRegistro({ candidates: decide }), evs));
  assert.equal(a.destinos["not-examined"], 0);
  assert.equal(chk(a, "candidato-sem-destino").ocorrencias, 0);
  const quarto = a.membros.find(m => m.memberIds.includes("F-004"))!;
  assert.deepEqual(quarto.memberIds, ["F-004", "G-004"]);
  assert.equal(quarto.destino, "rejected");
  assert.equal(a.destinos.accepted, 24);
});

test("reescaneamento com página de membros: a identidade reúne as cópias e o portão vem da página de membros", () => {
  const membros = { ...paginaMembros(["G-026", "G-027", "G-028", "G-029", "G-030"], 30, 25, () => ({ confirmedByGate: false, gateVerdict: "rejected", ruleApplicable: "failed" })), scanId: "S-page-002" };
  membros.members = membros.members.map((m, i) => ({ ...m, identity: `id-${i + 25}` }));
  const evs = ndjson([evento("scan_page", reescan("S-page-001", "F")), evento("scan_page", reescan("S-page-002", "G")), evento("get_finding_details", membros)]);
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia] }), evs));
  assert.equal(a.membros.length, 30);
  assert.equal(a.oraculo.familias[0].naoRecebidos, 0);
  const m = a.membros.find(x => x.memberIds.includes("G-027"))!;
  assert.equal(m.equivalencia, "identidade");
  assert.equal(m.confirmedByGate, false);
  assert.equal(m.acceptedByAgent, true, "a decisão do agente não é o veredito do portão");
});

test("aceito-sem-achado: uma ocorrência por candidato, membros como detalhe", () => {
  const f = comRegistro({ candidates: [aceitaFamilia] });
  // o coletor recusaria (x-accepted-without-finding); aqui o registro é forçado para conferir a contagem
  (f.report.inspection!.candidates[0] as { findings?: number[] }).findings = [];
  const a = auditarInspecao(entrada(f, eventos40()));
  const c = chk(a, "aceito-sem-achado");
  assert.equal(c.ocorrencias, 1);
  assert.match(c.exemplos[0], /candidato c1 \(40 membro\(s\)/);
  assert.ok(validateContract(a).valid);
});

test("payload integral conferido é lido; projeção cortada sem payload = resposta não legível, candidatos desconhecidos", () => {
  const muitos = ids(200);
  const texto = JSON.stringify(paginaFamilias(muitos, 200), null, 2);
  assert.ok(texto.length > PROJ);
  const ev = { kind: "call", seq: 900, server: "oracle", tool: "scan_page", isError: false, args: { text: "{}", truncated: false },
    result: { text: texto.slice(0, PROJ), truncated: true, payload: { status: "complete", path: "evidence/raw/oracle/payloads/000900-result.txt" } } };
  const f = comRegistro({ candidates: [aceitaFamilia] });
  const integral = auditar(entrada(f, ndjson([ev]), { payloads: new Map([["evidence/raw/oracle/payloads/000900-result.txt", texto]]) }));
  assert.equal(integral.membros.length, 200);
  assert.equal(chk(integral, "resposta-nao-legivel").ocorrencias, 0);
  const cortado = auditar(entrada(f, ndjson([ev])));
  assert.equal(cortado.membros.length, 0);
  assert.equal(chk(cortado, "resposta-nao-legivel").ocorrencias, 1);
  assert.ok(cortado.parcial.motivos.includes("respostas-nao-legiveis"));
});

test("achado que cita o membro sem candidato no registro → aceito por achado; os não examinados são sinalizados", () => {
  const umMembro = QUARENTA[3];
  const f = comRegistro({ candidates: [] }, [[umMembro]]);
  const a = auditar(entrada(f, eventos40()));
  const m = a.membros.find(x => x.memberId === umMembro)!;
  assert.equal(m.destino, "accepted");
  assert.equal(m.base, "achado");
  assert.deepEqual(m.achados, [0]);
  assert.equal(chk(a, "candidato-sem-destino").ocorrencias, 39);
});

test("estado com receita sem chegada comprovada e região não percorrida são sinalizados (escopo ambos)", () => {
  const f = comRegistro({
    completion: "partial",
    regions: [{ id: "r1", description: "região sintética", origin: "browser", status: "partial", reason: "tempo", states: ["s1"] }],
    states: [{ id: "s1", url: "http://127.0.0.1:3100/fixture.html", viewport: { width: 1280, height: 900 },
      recipe: [{ action: "load", target: "fixture" }, { action: "click", target: "#abrir" }],
      arrival: { status: "confirmed", observables: ["painel aberto"], originRef: "ref-que-nao-existe" }, evidence: [] }],
    candidates: [aceitaFamilia],
  });
  const a = auditar(entrada(f, eventos40()));
  assert.equal(chk(a, "regiao-nao-percorrida").ocorrencias, 1);
  assert.match(chk(a, "reproducao-nao-comprovada").exemplos[0], /s1 \(originRef nao-encontrado\)/);
  assert.ok(chk(a, "evidencia-nao-resolvida").ocorrencias >= 1);
});

test("o relatório vem do coletor: save_report é só contado, nunca é fonte", () => {
  const evs = eventos40().trimEnd() + "\n" + JSON.stringify(evento("save_report", { saved: "reports/x.json" })) + "\n";
  const a = auditar(entrada(comRegistro({ candidates: [aceitaFamilia] }), evs));
  assert.equal(a.fonteDoRelatorio, "coletor");
  assert.equal(a.oraculo.chamadasSaveReport, 1);
  assert.equal(a.oraculo.respostas, 2);
});

test("contrato: contagem adulterada, não examinado escondido e efeito trocado são recusados", () => {
  const base = auditar(entrada(clone(orcamento), eventos40(false), { runId: "fixture-run-sem-01" }));
  const conta = clone(base); conta.destinos["not-examined"] = 0;
  assert.ok(validateContract(conta).errors.some(e => e.keyword === "x-audit-count"));
  const escondido = clone(base); const i = escondido.verificacoes.findIndex(v => v.id === "candidato-sem-destino");
  escondido.verificacoes[i] = { ...escondido.verificacoes[i], ocorrencias: 0, exemplos: [] };
  assert.ok(validateContract(escondido).errors.some(e => e.keyword === "x-audit-unflagged"));
  const efeito = clone(base) as unknown as Record<string, unknown>; efeito.efeito = "exclui do denominador";
  assert.ok(validateContract(efeito).errors.some(e => e.keyword === "const"));
  const reconstruido = clone(base); reconstruido.registro = "indisponivel";
  assert.ok(validateContract(reconstruido).errors.some(e => e.keyword === "x-audit-destino-registro"));
});

// Gera os exemplos versionados do contrato (fixture) quando pedido: `--escrever-exemplos`.
if (process.argv.includes("--escrever-exemplos")) {
  const com = auditarInspecao(entrada(comRegistro({ candidates: [aceitaFamilia] }), eventos40(false)));
  const sem = auditarInspecao(entrada(comRegistro({ candidates: [] }, [[]]), ndjson([evento("browser_navigate", { ok: true }, "playwright")]), { runId: "fixture-run-sem-01" }));
  writeFileSync(join(EX, "valid", "inspection-audit--com-familia-cursor-pendente.json"), JSON.stringify(com, null, 2) + "\n");
  writeFileSync(join(EX, "valid", "inspection-audit--sem-sem-candidatos.json"), JSON.stringify(sem, null, 2) + "\n");
  const inval = clone(com); inval.verificacoes = inval.verificacoes.map(v => v.id === "cursor-nao-consumido" ? { ...v, ocorrencias: 0, exemplos: [] } : v);
  writeFileSync(join(EX, "invalid", "inspection-audit--cursor-hidden.json"), JSON.stringify(inval, null, 2) + "\n");
  console.log("exemplos escritos");
}

console.log(`\n${tests} testes da auditoria do registro ok`);
