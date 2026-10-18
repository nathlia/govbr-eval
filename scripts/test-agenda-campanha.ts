/**
 * NAT-65 (T7.2) — agenda congelada de slots, resolução do slot no disparo, política de tentativas,
 * planejado × executado e desfecho principal no painel. Tudo com fixture (nada é gravado no
 * govbr-resultados; a semente é conferida no histórico deste repositório, só leitura).
 *
 *   npm run test:agenda
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateContract, type Arm, type ArmV2, type Campaign, type CampaignV2 } from "../contracts/index";
import { ROOT } from "./adjudication";
import {
  classificarTentativa, documentoDaAgenda, gerarAgenda, problemasDaAgenda, problemasDaSemente, problemasParaAgenda, proximaTentativa,
  quadradoLatino, situacaoDaAgenda, tentativaSelecionada, tentativasDoSlot, type Agenda,
} from "./agenda-campanha";
import type { EntradaIndice } from "./arquivo-resultados";
import { agendaDoDisparo, buildIsolatedManifest, documentoDaCampanha, isolatedManifestProblems, type CampaignRecord } from "./manifesto-coleta-isolada";
import { conferirEntradas } from "./pipeline-t4";
import {
  agregadoDaCampanha, CAMPANHAS_D_POR_SPEC, colunaD, detalheD, linhasDoDesfecho, linhasSecundarias, modoDoDesfecho, vistaAgenda,
} from "./painel/agenda-painel";
import { analisePareada } from "./estatistica-pareada";
import { placarDaCampanha, vistaExecucoes, type LinhaPlacar, type ResultadoBraco, type ResultadoPar } from "./painel/modelo";
import { gerarResultados } from "./painel/resultados";
import { paginaExecucoes } from "./painel/paginas";
import { DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR } from "../runner/lib";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const work = mkdtempSync(join(tmpdir(), "teste-agenda-"));
let ok = 0, falhas = 0;
async function teste(nome: string, f: () => void | Promise<void>): Promise<void> {
  try { await f(); ok++; console.log(`ok   ${nome}`); } catch (e) {
    falhas++; console.log(`FAIL ${nome}\n     ${(e instanceof Error ? e.stack ?? e.message : String(e)).split("\n").slice(0, 6).join("\n     ")}`);
  }
}

const SEMENTE = "0d30fbc15e18f8672d84a3d5cffb9c0aa8a9239a"; // o commit que congelou o protocolo de t7-tela-a-01 (D-89)
const N = 10;

/** Campanha mínima válida para a agenda: os campos que a agenda e a política leem. */
function campanha(delta: Partial<Campaign["design"]> = {}, retry: Partial<Campaign["retryPolicy"]> = {}): Campaign {
  const piloto = JSON.parse(readFileSync(join(ROOT, "campanhas", "piloto-01", "campaign.json"), "utf8")) as Campaign;
  return {
    ...piloto, campaignId: "agenda-teste", kind: "pilot", fixture: true,
    design: { ...piloto.design, repetitions: N, order: "balanceado", seed: null, ...delta },
    retryPolicy: { ...piloto.retryPolicy, maxAttemptsPerSlot: 2, campaignAttemptCeiling: 2 * N + 4, ...retry },
  };
}

let seq = 0;
function entrada(slot: string, o: Partial<EntradaIndice["estado"]> & { motivo?: string | null; semPacote?: boolean; semManifesto?: boolean; campanha?: string } = {}): EntradaIndice {
  seq++;
  const chave = `run-${String(seq).padStart(3, "0")}-${slot}`;
  return {
    indice: "arquivo-resultados-1.0.0", chave, tipo: "execucao", natureza: "ensaio", campanha: o.campanha ?? "agenda-teste", slot, par: slot.split("-")[0], tela: "solicitacao",
    braco: slot.endsWith("-com") ? "com" : "sem", modelo: "m", esforco: "high", modo: "roteirizado",
    dataUtc: `2026-10-04T${String(10 + Math.floor(seq / 60)).padStart(2, "0")}:${String(seq % 60).padStart(2, "0")}:00Z`, caminho: `ensaios/x/${chave}`,
    estado: { arquivo: o.semPacote ? "sem-pacote" : "arquivado", tecnico: o.tecnico ?? "passed", isolamento: o.isolamento ?? "passed", oraculo: null,
      submissao: o.submissao ?? "accepted", pontuacao: "not-prepared", linhaDeBase: null },
    motivo: o.motivo ?? null, pacote: null, evidencias: null, github: null,
    manifestoColeta: o.semManifesto ? null : { sha256: "f".repeat(64), caminho: "coletas/x/m.json" },
  };
}
const tecnica = (slot: string, razao = "rate-limited") => entrada(slot, { tecnico: "failed", isolamento: "unverified", submissao: "absent", motivo: `${razao}: 429 do provedor` });

// ───────────────────────────────────────────────────────────────── agenda

await teste("agenda determinística: mesma semente → mesmos bytes; regra sha256(semente|ordem|par), ⌊N/2⌋ primeiros abrem com sem", () => {
  const c = campanha();
  const a = gerarAgenda({ campanha: c, campanhaSha256: "a".repeat(64), pares: N, semente: SEMENTE });
  const b = gerarAgenda({ campanha: c, campanhaSha256: "a".repeat(64), pares: N, semente: SEMENTE });
  assert.equal(documentoDaAgenda(a), documentoDaAgenda(b));
  const esperado = Array.from({ length: N }, (_, i) => `p${String(i + 1).padStart(2, "0")}`)
    .map(p => ({ p, k: sha(`${SEMENTE}|ordem|${p}`) })).sort((x, y) => x.k.localeCompare(y.k));
  assert.deepEqual(a.draw.map(d => d.pairId), esperado.map(e => e.p));
  assert.deepEqual(a.draw.map(d => d.firstArm), [...Array(5).fill("sem"), ...Array(5).fill("com")]);
  assert.equal(a.slots.length, 2 * N);
  for (const [i, s] of a.slots.entries()) {
    assert.equal(s.order, i + 1);
    assert.equal(s.slotId, `${s.pairId}-${s.arm}`);
    assert.equal(s.repetition, Number(s.pairId.slice(1)), "cada par é uma repetição");
  }
  assert.deepEqual(a.slots.slice(0, 2).map(s => s.pairId), ["p01", "p01"], "os pares rodam na ordem numérica; a chave só decide o braço que abre");
  assert.equal(a.slots[0].arm, a.draw.find(d => d.pairId === "p01")!.firstArm);
  assert.equal(a.retry.extraAttempts, 4);
  const outra = gerarAgenda({ campanha: c, campanhaSha256: "a".repeat(64), pares: N, semente: "1".repeat(40) });
  assert.notDeepEqual(outra.draw.map(d => d.pairId), a.draw.map(d => d.pairId), "outra semente, outro sorteio");
});

await teste("agenda: N ímpar dá ⌊N/2⌋ abrindo com sem; janelas rotulam os slots na ordem e precisam cobrir todos", () => {
  const a = gerarAgenda({ campanha: campanha({ repetitions: 5 }, { campaignAttemptCeiling: 12 }), campanhaSha256: "a".repeat(64), pares: 5, semente: SEMENTE,
    janelas: [{ label: "dom-A", slots: 4 }, { label: "dom-B", slots: 6 }] });
  assert.equal(a.draw.filter(d => d.firstArm === "sem").length, 2);
  assert.equal(a.draw.filter(d => d.firstArm === "com").length, 3);
  assert.deepEqual(a.slots.map(s => s.window), [...Array(4).fill("dom-A"), ...Array(6).fill("dom-B")]);
  assert.throws(() => gerarAgenda({ campanha: campanha({ repetitions: 5 }, { campaignAttemptCeiling: 12 }), campanhaSha256: "a".repeat(64), pares: 5, semente: SEMENTE,
    janelas: [{ label: "x", slots: 3 }] }), /cobrem 3 slots/);
});

await teste("agenda recusa campanha incompatível: repetições ≠ N, ordem não balanceada, teto < slots, um braço só, semente que não é commit hex", () => {
  assert.match(problemasParaAgenda(campanha({ repetitions: 2 }), N, SEMENTE).join(), /repetitions = 2/);
  assert.match(problemasParaAgenda(campanha({ order: "sequencial" }), N, SEMENTE).join(), /balanceado/);
  assert.match(problemasParaAgenda(campanha({}, { campaignAttemptCeiling: 19 }), N, SEMENTE).join(), /campaignAttemptCeiling 19/);
  assert.match(problemasParaAgenda(campanha({ arms: ["com"] }), N, SEMENTE).join(), /dois braços/);
  assert.match(problemasParaAgenda(campanha(), N, "main").join(), /40 hex/);
  assert.match(problemasParaAgenda(campanha(), N, SEMENTE.toUpperCase()).join(), /40 hex/);
});

await teste("semente (git, só leitura): o commit que congelou o protocolo passa; não-commit, commit que não toca a campanha e texto livre são recusados", () => {
  assert.deepEqual(problemasDaSemente(SEMENTE, "t7-tela-a-01"), []);
  assert.match(problemasDaSemente("e".repeat(40), "t7-tela-a-01").join(), /não é um commit/);
  const anterior = execFileSync("git", ["rev-parse", `${SEMENTE}~1`], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.match(problemasDaSemente(anterior, "t7-tela-a-01").join(), /não congelou a campanha/);
  assert.match(problemasDaSemente(SEMENTE, "piloto-01").join(), /não congelou a campanha/);
  assert.match(problemasDaSemente("abc", "t7-tela-a-01").join(), /40 hex/);
});

await teste("agenda adulterada ou de outra campanha é recusada (regenerada da semente difere)", () => {
  const c = campanha();
  const a = gerarAgenda({ campanha: c, campanhaSha256: "a".repeat(64), pares: N, semente: SEMENTE });
  assert.deepEqual(problemasDaAgenda(a, c, "a".repeat(64)), []);
  assert.match(problemasDaAgenda(a, c, "b".repeat(64)).join(), /campanha mudou depois da agenda/);
  const trocada = structuredClone(a) as Agenda;
  [trocada.slots[0].arm, trocada.slots[1].arm] = [trocada.slots[1].arm, trocada.slots[0].arm];
  assert.match(problemasDaAgenda(trocada, c, "a".repeat(64)).join(), /não é a que a semente produz/);
});

// ───────────────────────────────────────────────────────────────── tentativas

const C = campanha();
const A = gerarAgenda({ campanha: C, campanhaSha256: "a".repeat(64), pares: N, semente: SEMENTE });
const s1 = A.slots[0].slotId, s2 = A.slots[1].slotId, s3 = A.slots[2].slotId;

await teste("tentativas: recusa no preflight não conta; falha técnica abre a 2ª; a 3ª, tempo esgotado, resultado do agente e válida são recusadas", () => {
  assert.equal((proximaTentativa(A, C, [], s1) as { tentativa: number }).tentativa, 1);
  assert.equal((proximaTentativa(A, C, [entrada(s1, { semPacote: true, semManifesto: true })], s1) as { tentativa: number }).tentativa, 1, "preflight recusado não é tentativa");
  const t1 = tecnica(s1);
  const d2 = proximaTentativa(A, C, [t1], s1);
  assert.ok(d2.ok && d2.tentativa === 2 && d2.extrasUsadas === 0 && d2.extrasLimite === 4);
  assert.match((proximaTentativa(A, C, [t1, tecnica(s1)], s1) as { motivo: string }).motivo, /máximo por slot/);
  assert.match((proximaTentativa(A, C, [entrada(s1, { tecnico: "interrupted", submissao: "absent", motivo: "timeout: 1800 s" })], s1) as { motivo: string }).motivo, /tempo esgotado/);
  assert.match((proximaTentativa(A, C, [entrada(s1)], s1) as { motivo: string }).motivo, /já tem tentativa válida/);
  assert.match((proximaTentativa(A, C, [entrada(s1, { tecnico: "passed", submissao: "absent", motivo: "no-submission: nada enviado" })], s1) as { motivo: string }).motivo, /não é falha técnica/);
  assert.match((proximaTentativa(A, C, [entrada(s1, { isolamento: "failed" })], s1) as { motivo: string }).motivo, /quarentena/);
  assert.match((proximaTentativa(A, C, [], "p99-sem") as { motivo: string }).motivo, /não está na agenda/);
  // timeout nunca é técnico, mesmo se a campanha o listasse em retryOn
  const comTimeout = campanha({}, { retryOn: [...C.retryPolicy.retryOn, "timeout"] });
  assert.equal(classificarTentativa(entrada(s1, { tecnico: "interrupted", motivo: "timeout: x" }), comTimeout).classe, "tempo-esgotado");
});

await teste("teto global: as extras vão para quem precisa primeiro; esgotado → slot perdido; entra a primeira tentativa elegível", () => {
  const c = campanha({}, { campaignAttemptCeiling: 2 * N + 1 });
  const ent = [tecnica(s1), entrada(s1), tecnica(s2)];
  assert.match((proximaTentativa(A, c, ent, s2) as { motivo: string }).motivo, /teto da campanha esgotado: 1 de 1/);
  const ts = tentativasDoSlot(ent, c, s1);
  assert.deepEqual(ts.map(t => t.classe), ["tecnica", "valida"]);
  assert.equal(tentativaSelecionada(ts)!.chave, ent[1].chave, "a primeira elegível, não a primeira tentativa");
});

await teste("recusa no preflight (sem pacote, sem manifesto) nunca é tentativa: não abre a 2ª, não consome o teto, não pinta o slot de falha", () => {
  const recusa = (slot: string) => entrada(slot, { semPacote: true, semManifesto: true, tecnico: "interrupted", isolamento: null, submissao: null,
    motivo: "disparo recusado no preflight (sem manifesto de coleta; nenhum modelo chamado, não é tentativa do slot): jobs {}" });
  // várias recusas antes do primeiro disparo legítimo: ainda é a tentativa 1
  const d1 = proximaTentativa(A, C, [recusa(s1), recusa(s1), recusa(s1)], s1);
  assert.ok(d1.ok && d1.tentativa === 1 && d1.anteriores.length === 0);
  // falha técnica real depois de recusas: a 2ª cabe, e só a técnica conta como extra
  const d2 = proximaTentativa(A, C, [recusa(s1), tecnica(s1), recusa(s1)], s1);
  assert.ok(d2.ok && d2.tentativa === 2 && d2.extrasUsadas === 0, JSON.stringify(d2));
  // teto: campanha com 1 extra; recusas em todos os slots não o consomem, uma falha técnica real sim
  const c = campanha({}, { campaignAttemptCeiling: 2 * N + 1 });
  const recusas = A.slots.flatMap(x => [recusa(x.slotId), recusa(x.slotId)]);
  const d3 = proximaTentativa(A, c, [...recusas, tecnica(s2)], s2);
  assert.ok(d3.ok && d3.tentativa === 2 && d3.extrasUsadas === 0 && d3.extrasLimite === 1, JSON.stringify(d3));
  assert.match((proximaTentativa(A, c, [...recusas, tecnica(s1), tecnica(s1), tecnica(s2)], s2) as { motivo: string }).motivo, /teto da campanha esgotado: 1 de 1/,
    "só a tentativa técnica real consome a extra");
  // situação: o slot só com recusas segue "nao-iniciado", nunca "perdido" nem "aguarda"
  const sit = situacaoDaAgenda(A, C, recusas, () => null);
  assert.equal(sit.naoIniciados, 2 * N);
  assert.equal(sit.tentativas, 0);
  assert.equal(sit.extrasUsadas, 0);
  assert.deepEqual(sit.foraDaAgenda, []);
  // sem pacote COM manifesto = o preparar concluiu e a execução se perdeu depois: é tentativa técnica
  assert.equal(classificarTentativa(entrada(s1, { semPacote: true, tecnico: "interrupted" }), C).classe, "tecnica");
});

await teste("planejado × executado: contado pela agenda (não iniciados visíveis), perdas por braço, risco de seleção, intervalo entre inícios", () => {
  const ent = [entrada(s1), entrada(s2), tecnica(s3), entrada(A.slots[3].slotId, { tecnico: "interrupted", submissao: "absent", motivo: "timeout: 1800 s" }),
    entrada("fora-01"), entrada(s1, { semPacote: true, semManifesto: true })];
  const inicios: Record<string, string> = { [ent[0].chave]: "2026-10-04T10:00:00Z", [ent[1].chave]: "2026-10-04T10:25:00Z" };
  const s = situacaoDaAgenda(A, C, ent, k => inicios[k] ?? null);
  assert.equal(s.planejados, 20);
  assert.equal(s.validos, 2);
  assert.equal(s.aguardando, 1);
  assert.equal(s.perdidos, 1);
  assert.equal(s.naoIniciados, 16);
  assert.equal(s.tentativas, 4, "fora da agenda e recusa no preflight não contam");
  assert.deepEqual(s.foraDaAgenda, [ent[4].chave]);
  assert.equal(s.pares[0].estado, "completo");
  assert.equal(s.pares[0].intervaloMin, 25);
  assert.equal(s.pares[1].estado, "incompleto", "o slot com tempo esgotado perde o par");
  const perdeu = A.slots[3].arm;
  assert.equal(s.porBraco[perdeu]!.tempoEsgotado, 1);
  assert.match(s.riscoDeSelecao!, /risco de seleção/);
});

// ───────────────────────────────────────────────────────────────── disparo: entradas e manifesto

await teste("entradas do workflow: com agenda basta o slot; digitado divergente é recusado antes de qualquer gasto; sem agenda, como antes", () => {
  const base = { tela: "solicitacao", modo: "real", campanha: "agenda-teste", slot: s1, telas_sha: "a".repeat(40), validator_sha: "b".repeat(40), etapas: "coleta+linha-de-base",
    braco: "da-agenda", par: "", repeticao: "", tentativa: "", modelo: "", esforco: "da-campanha", limite_min: "" };
  const ag = { agenda: A, campanha: C };
  const r = conferirEntradas(base, ag);
  assert.deepEqual(r.problemas, []);
  assert.equal(r.saidas.braco, A.slots[0].arm);
  assert.equal(r.saidas.par, "p01");
  assert.equal(r.saidas.repeticao, "1");
  assert.equal(r.saidas.tentativa, "auto");
  assert.equal(r.saidas.modelo, C.design.models[0].requested);
  assert.equal(r.saidas.limite_seg, String(C.limits.timeoutSeconds));
  assert.equal(r.saidas.agenda, "true");
  const outro: Arm = A.slots[0].arm === "sem" ? "com" : "sem";
  assert.match(conferirEntradas({ ...base, braco: outro }, ag).problemas.join(), /braco .* ≠/);
  assert.match(conferirEntradas({ ...base, par: "p02" }, ag).problemas.join(), /par p02 ≠ p01/);
  assert.match(conferirEntradas({ ...base, repeticao: "2" }, ag).problemas.join(), /repeticao 2 ≠ 1/);
  assert.match(conferirEntradas({ ...base, limite_min: "30" }, ag).problemas.join(), /limite_min 30 ≠ 90/);
  assert.match(conferirEntradas({ ...base, modelo: "claude-outro" }, ag).problemas.join(), /modelo claude-outro ≠/);
  assert.match(conferirEntradas({ ...base, slot: "p99-sem" }, ag).problemas.join(), /fora da agenda/);
  assert.deepEqual(conferirEntradas({ ...base, braco: A.slots[0].arm, par: "p01", repeticao: "1" }, ag).problemas, [], "igual à agenda também passa");
  const semAgenda = conferirEntradas({ ...base, modelo: "claude-opus-5-5" }, null);
  assert.match(semAgenda.problemas.join(), /não tem agenda/);
  const antigo = conferirEntradas({ ...base, braco: "sem", modelo: "claude-opus-5-5" }, null);
  assert.deepEqual(antigo.problemas, []);
  assert.deepEqual([antigo.saidas.par, antigo.saidas.tentativa, antigo.saidas.repeticao, antigo.saidas.limite_seg, antigo.saidas.esforco], ["par-01", "1", "1", "5400", "high"]);
});

// fixture: a campanha de ensaio que o próprio manifesto gera, commitada numa pasta temporária com agenda
const comum = { tela: "solicitacao", telasDir: DEFAULT_TELAS_DIR, validatorDir: DEFAULT_VALIDATOR_DIR, campanha: "agenda-teste", modo: "roteirizado" as const,
  modelo: null, esforco: null, limiteMin: 5, repeticao: 1 };
const gerada = buildIsolatedManifest({ ...comum, slot: "x", par: "x", braco: "sem", tentativa: 1, campanhaPath: join(work, "nao-existe", "campaign.json") }).campaign!.document as Campaign;
const dirCamp = join(work, "campanhas", "agenda-teste");
mkdirSync(dirCamp, { recursive: true });
const campFix: Campaign = { ...gerada, design: { ...gerada.design, repetitions: N, order: "balanceado" }, retryPolicy: { ...C.retryPolicy } };
writeFileSync(join(dirCamp, "campaign.json"), documentoDaCampanha(campFix));
const campSha = sha(readFileSync(join(dirCamp, "campaign.json")));
const agFix = gerarAgenda({ campanha: campFix, campanhaSha256: campSha, pares: N, semente: SEMENTE });
writeFileSync(join(dirCamp, "agenda.json"), documentoDaAgenda(agFix));
const arq = join(work, "arquivo");
mkdirSync(join(arq, "indice", "entradas"), { recursive: true });
const p1 = agFix.slots[0];
const disparo = { ...comum, campanhaPath: join(dirCamp, "campaign.json"), arquivoIndice: arq, slot: p1.slotId, par: p1.pairId, braco: p1.arm, repeticao: p1.repetition, tentativa: "auto" as const };

await teste("manifesto 1.3.0: slot resolvido na agenda, tentativa contada no índice; o registro confere e adulteração é recusada", () => {
  const m = buildIsolatedManifest(disparo);
  assert.equal(m.manifestVersion, "manifesto-coleta-isolada-1.3.0");
  assert.equal(m.dispatch.attempt, 1);
  assert.deepEqual(m.agenda!.slot, p1);
  assert.equal(m.agenda!.sha256, sha(readFileSync(join(dirCamp, "agenda.json"))));
  assert.deepEqual(isolatedManifestProblems(m), []);
  const t = structuredClone(m);
  t.dispatch.attempt = 2;
  assert.match(isolatedManifestProblems(t).join(), /tentativa do despacho/);
  const u = structuredClone(m);
  u.agenda!.document.slots[0].arm = u.agenda!.document.slots[0].arm === "sem" ? "com" : "sem";
  assert.match(isolatedManifestProblems(u).join(), /agenda × sha256/);
});

await teste("manifesto recusa antes de gravar: braço/par/repetição fora do slot, slot fora da agenda, tentativa digitada errada, sem índice, agenda adulterada", () => {
  const outro: Arm = p1.arm === "sem" ? "com" : "sem";
  assert.throws(() => buildIsolatedManifest({ ...disparo, braco: outro }), /diverge da agenda .*braço/);
  assert.throws(() => buildIsolatedManifest({ ...disparo, par: "p02" }), /diverge da agenda .*par p02/);
  assert.throws(() => buildIsolatedManifest({ ...disparo, repeticao: 2 }), /diverge da agenda .*repetição 2/);
  assert.throws(() => buildIsolatedManifest({ ...disparo, slot: "p77-sem", tentativa: 1 }), /não está na agenda/);
  assert.throws(() => buildIsolatedManifest({ ...disparo, tentativa: 2 }), /tentativa 2 ≠ 1/);
  assert.throws(() => buildIsolatedManifest({ ...disparo, arquivoIndice: null, tentativa: 1 }), /índice do arquivo/);
  const dir2 = join(work, "adulterada");
  cpSync(dirCamp, dir2, { recursive: true });
  const a2 = JSON.parse(readFileSync(join(dir2, "agenda.json"), "utf8")) as Agenda;
  a2.slots[0].window = "editada";
  writeFileSync(join(dir2, "agenda.json"), documentoDaAgenda(a2));
  assert.throws(() => buildIsolatedManifest({ ...disparo, campanhaPath: join(dir2, "campaign.json"), tentativa: 1 }), /não é a que a semente produz/);
  // a campanha mudou depois da agenda
  const dir3 = join(work, "campanha-mudou");
  cpSync(dirCamp, dir3, { recursive: true });
  writeFileSync(join(dir3, "campaign.json"), documentoDaCampanha({ ...campFix, title: "outra" }));
  assert.throws(() => buildIsolatedManifest({ ...disparo, campanhaPath: join(dir3, "campaign.json"), tentativa: 1 }), /campanha mudou depois da agenda/);
});

await teste("manifesto: nova tentativa só depois de falha técnica (auto = 2); depois de tentativa válida, recusa; formal real sem agenda, recusa", () => {
  const gravar = (e: EntradaIndice) => writeFileSync(join(arq, "indice", "entradas", `${e.chave}.json`), JSON.stringify({ ...e, campanha: "agenda-teste" }));
  const t = tecnica(p1.slotId);
  gravar(t);
  assert.equal(buildIsolatedManifest(disparo).dispatch.attempt, 2);
  const v = entrada(p1.slotId);
  v.dataUtc = "2026-10-04T23:00:00Z";
  gravar(v);
  assert.throws(() => buildIsolatedManifest(disparo), /já tem tentativa válida/);
  const rec: CampaignRecord = { sha256: "x", origin: "commitada", sourcePath: null, sourceSha256: "y", document: { ...campFix, kind: "formal" } };
  assert.throws(() => agendaDoDisparo({ ...disparo, tentativa: 1, modo: "real" }, rec, join(work, "nao-ha", "agenda.json")), /campanha formal sem agenda/);
  assert.equal(agendaDoDisparo({ ...disparo, tentativa: 1, modo: "real" }, { ...rec, document: campFix }, join(work, "nao-ha", "agenda.json")), undefined, "piloto sem agenda: como antes");
});

// ───────────────────────────────────────────────────────────────── painel: planejado × executado e desfecho

/** Arquivo sintético: campanha + agenda arquivadas por conteúdo, e entradas do índice. */
const arqPainel = join(work, "arquivo-painel");
{
  const cdir = join(arqPainel, "campanhas", "agenda-teste");
  mkdirSync(join(cdir, sha(documentoDaCampanha(campFix))), { recursive: true });
  writeFileSync(join(cdir, sha(documentoDaCampanha(campFix)), "campaign.json"), documentoDaCampanha(campFix));
  const asha = sha(documentoDaAgenda(agFix));
  mkdirSync(join(cdir, "agendas", asha), { recursive: true });
  writeFileSync(join(cdir, "agendas", asha, "agenda.json"), documentoDaAgenda(agFix));
  mkdirSync(join(arqPainel, "indice", "entradas"), { recursive: true });
}
const entradasPainel: EntradaIndice[] = [];
for (const s of agFix.slots.slice(0, 12)) entradasPainel.push(entrada(s.slotId));
entradasPainel.push(entrada(agFix.slots[12].slotId, { tecnico: "interrupted", submissao: "absent", motivo: "timeout: 1800 s" }));
for (const e of entradasPainel) writeFileSync(join(arqPainel, "indice", "entradas", `${e.chave}.json`), JSON.stringify(e, null, 2));

const braco = (runId: string, a: number, p: number, extra: Partial<ResultadoBraco> = {}): ResultadoBraco => ({
  runId, id: null, confirmadas: a + p, total: 16, recall: (a + p) / 16, precisao: 0.8, incorretas: 1, novas: 0, pendentes: 0, achados: 5, maturidade: "final",
  segundos: 300, custoUsd: null, camadas: { sorteadas: { prefixo: "A-", confirmadas: a, total: 14, recall: a / 14 }, pagina: { prefixo: "P-", confirmadas: p, total: 2, recall: p / 2 } }, ...extra,
});
function linhaFinal(pairId: string, sem: number, com: number, o: { semRun?: string } = {}): LinhaPlacar {
  const sel = (arm: Arm) => entradasPainel.find(e => e.slot === `${pairId}-${arm}`)!.chave;
  const r: ResultadoPar = { revisao: "rev-001", fonte: "x", geradoEm: "", estado: "final", disponivel: true, motivo: null, nota: "", elegivel: true,
    bracos: { sem: braco(o.semRun ?? sel("sem"), sem, 1), com: braco(sel("com"), com, 2) }, diferencaUnidades: com - sem, diferencaRecall: null, pendentes: 0 };
  return { par: pairId, tela: "solicitacao", modelo: "m", selo: "final", seloTexto: "FINAL", resultado: r, falta: null };
}

await teste("painel: a agenda arquivada é lida e conta planejado × executado; par perdido (tempo esgotado) e não iniciados aparecem", () => {
  const va = vistaAgenda(arqPainel, "agenda-teste", entradasPainel, () => null)!;
  assert.ok(va, "agenda lida do arquivo");
  assert.deepEqual(va.problemas, []);
  assert.equal(va.situacao.validos, 12);
  assert.equal(va.situacao.perdidos, 1);
  assert.equal(va.situacao.naoIniciados, 7);
  const v = vistaExecucoes(arqPainel);
  assert.ok(v.agendas["agenda-teste"]);
});

await teste("desfecho: D só nas sorteadas (A-*), sobre os pares FINAIS da agenda; estatística pareada; provisório até todo par final ou perdido", () => {
  const va = vistaAgenda(arqPainel, "agenda-teste", entradasPainel, () => null)!;
  const ds = [2, 1, 0, 3, 1, -1];
  const linhas = ds.map((d, i) => linhaFinal(`p0${i + 1}`, 7, 7 + d));
  const g = agregadoDaCampanha(va, linhas);
  assert.equal(g.estado, "provisorio");
  assert.match(g.motivoProvisorio!, /não final/);
  assert.equal(g.nPlanejado, 10);
  assert.equal(g.nEfetivo, 6);
  assert.deepEqual(g.pares.map(p => p.d), ds);
  assert.ok(g.soSorteadas);
  assert.equal(g.estatistica.media, 1);
  assert.equal(g.estatistica.ic.reamostragens, 10_000);
  assert.equal(g.estatistica.ic.sementeOrigem, SEMENTE);
  assert.equal(g.secundarios.com.pagina!.confirmadas, 12, "camada de página secundária, à parte");
  assert.match(g.foraDaAnalise.find(f => f.pairId === "p07")!.motivo, /par perdido/);
  // análise que não usa a tentativa selecionada não entra
  const errada = agregadoDaCampanha(va, [linhaFinal("p01", 7, 9, { semRun: "outra-tentativa" })]);
  assert.equal(errada.nEfetivo, 0);
  assert.match(errada.foraDaAnalise.find(f => f.pairId === "p01")!.motivo, /tentativa selecionada/);
});

await teste("desfecho FINAL quando todo par planejado está final ou perdido; página e RESULTADOS.md mostram o desfecho e a agenda", () => {
  // todos os slots com tentativa: 9 pares válidos + 1 perdido
  const arq2 = join(work, "arquivo-final");
  cpSync(arqPainel, arq2, { recursive: true });
  const extra: EntradaIndice[] = agFix.slots.slice(13).map(s => entrada(s.slotId));
  for (const e of extra) writeFileSync(join(arq2, "indice", "entradas", `${e.chave}.json`), JSON.stringify(e, null, 2));
  entradasPainel.push(...extra);
  const todas = [...entradasPainel];
  const va = vistaAgenda(arq2, "agenda-teste", todas, () => null)!;
  const perdido = va.situacao.pares.find(p => p.estado === "incompleto")!.pairId;
  const linhas = va.situacao.pares.filter(p => p.pairId !== perdido).map(p => linhaFinal(p.pairId, 6, 8));
  const g = agregadoDaCampanha(va, linhas);
  assert.equal(g.estado, "final", g.motivoProvisorio ?? "");
  assert.equal(g.nEfetivo, 9);
  assert.equal(g.estatistica.principal.p, 2 / 512, "9 pares de D = +2: só os dois extremos");
  assert.equal(g.estatistica.leitura, "vantagem-com");
  assert.equal(g.estatistica.ic.disponivel, false, "todos os D iguais → IC indisponível");
  // as páginas: sem análise no arquivo, o placar mostra a agenda e o desfecho provisório
  const md = gerarResultados(arq2, new Date("2026-10-04T12:00:00Z"));
  assert.match(md, /### Desfecho principal — \*\*PROVISÓRIO/);
  assert.match(md, /### Planejado × executado \(pela agenda\)/);
  assert.match(md, /slots planejados 20 · não iniciados 0/);
  assert.match(md, /\| p01 \| (sem|com) \|/);
  const v = vistaExecucoes(arq2);
  const html = paginaExecucoes(v, {}, { arquivo: arq2, fixture: false });
  assert.match(html, /class="placar-agenda"/);
  assert.match(html, /Planejado × executado \(pela agenda\)/);
  const pl = placarDaCampanha(v.campanhas.find(c => c.id === "agenda-teste")!, v.pares, {}, v.agendas["agenda-teste"]);
  assert.equal(pl.agenda!.agregado.nPlanejado, 10);
});

// ───────────────────────────────────────────────────────────────── D-102: desfecho por spec (tela B)

const campanhaReal = (id: string): Campaign => JSON.parse(readFileSync(join(ROOT, "campanhas", id, "campaign.json"), "utf8")) as Campaign;

await teste("D-102: o modo do desfecho vem da lista declarada, conferida contra o campaign.json congelado", () => {
  const b = modoDoDesfecho(campanhaReal("t7-tela-b-01"));
  assert.equal(b.modo, "spec");
  assert.match(b.decisao!, /D-102/);
  assert.equal(b.problema, null, "o campaign.json da tela B declara specs_confirmadas_com − specs_confirmadas_sem");
  for (const id of ["t7-tela-a-01", "t7b-sonnet-tela-a-01", "piloto-01"]) {
    assert.deepEqual(modoDoDesfecho(campanhaReal(id)), { modo: "unidade", decisao: null, problema: null }, id);
  }
  // lista e texto discordam → problema (o agregado fica provisório)
  assert.match(modoDoDesfecho({ ...campanhaReal("t7-tela-b-01"), campaignId: "outra-tela-b" }).problema!, /declara D por spec, mas a campanha não está na lista/);
  const semTexto = { ...campanhaReal("t7-tela-b-01"), analysisPlan: campanhaReal("t7-tela-a-01").analysisPlan };
  assert.match(modoDoDesfecho(semTexto).problema!, /não declara specs_confirmadas/);
});

/**
 * Referência sintética: S-1 `todos` com 5 unidades, S-2 e S-3 `unico`, S-4 `todos` com 2 → 4 specs, 10 unidades.
 * `confirmadas[arm]` = ids das unidades confirmadas naquele braço.
 */
const REF_UNIDADES = ["S-1#1", "S-1#2", "S-1#3", "S-1#4", "S-1#5", "S-2#1", "S-3#1", "S-4#1", "S-4#2", "S-4#3"].map(unitId => ({ unitId, specId: unitId.split("#")[0], elemento: `#${unitId}` }));
function linhaSpec(pairId: string, sem: string[], com: string[], o: { semUnidades?: boolean; confirmadasSem?: number } = {}): LinhaPlacar {
  const sel = (arm: Arm) => entradasPainel.find(e => e.slot === `${pairId}-${arm}`)!.chave;
  const b = (runId: string, n: number): ResultadoBraco => ({ runId, id: null, confirmadas: n, total: REF_UNIDADES.length, recall: n / REF_UNIDADES.length, precisao: 0.5,
    incorretas: 2, novas: 1, pendentes: 0, achados: 6, maturidade: "final", segundos: 600, custoUsd: null });
  const pega = (f: (u: string) => boolean) => REF_UNIDADES.filter(u => f(u.unitId));
  const r: ResultadoPar = { revisao: "rev-001", fonte: "x", geradoEm: "", estado: "final", disponivel: true, motivo: null, nota: "", elegivel: true,
    bracos: { sem: b(sel("sem"), o.confirmadasSem ?? sem.length), com: b(sel("com"), com.length) }, diferencaUnidades: com.length - sem.length, diferencaRecall: null, pendentes: 0,
    ...(o.semUnidades ? {} : { unidades: { soCom: pega(u => com.includes(u) && !sem.includes(u)), soSem: pega(u => sem.includes(u) && !com.includes(u)),
      ambos: pega(u => sem.includes(u) && com.includes(u)), nenhum: pega(u => !sem.includes(u) && !com.includes(u)) } }) };
  return { par: pairId, tela: "vistorias", modelo: "m", selo: "final", seloTexto: "FINAL", resultado: r, falta: null };
}

await teste("D-102: D por spec — uma alegação que confirma 3 unidades de uma spec `todos` conta 1 spec; D por unidade e por spec divergem", () => {
  const vaA = vistaAgenda(arqPainel, "agenda-teste", entradasPainel, () => null)!;
  const vaB: typeof vaA = { ...vaA, campanha: { ...campanhaReal("t7-tela-b-01") } };
  const linhas = [
    // p01: sem acha S-2 e S-3 (2 unidades, 2 specs); com acha S-1#1..#3 numa alegação só (3 unidades, 1 spec) → D unidade +1, D spec −1
    linhaSpec("p01", ["S-2#1", "S-3#1"], ["S-1#1", "S-1#2", "S-1#3"]),
    // p02: sem S-1 inteira (5 unidades, 1 spec); com S-1#1 + S-2 + S-4#1 (3 unidades, 3 specs) → unidade −2, spec +2
    linhaSpec("p02", ["S-1#1", "S-1#2", "S-1#3", "S-1#4", "S-1#5"], ["S-1#1", "S-2#1", "S-4#1"]),
    // p03: iguais → 0 nos dois
    linhaSpec("p03", ["S-2#1"], ["S-2#1"]),
    // p04: sem nada; com S-4 inteira (3 unidades, 1 spec) → unidade +3, spec +1
    linhaSpec("p04", [], ["S-4#1", "S-4#2", "S-4#3"]),
    // p05: com perde uma spec → −1 nos dois
    linhaSpec("p05", ["S-2#1", "S-3#1"], ["S-3#1"]),
  ];
  const g = agregadoDaCampanha(vaB, linhas);
  assert.deepEqual(g.pares.map(p => p.d), [-1, 2, 0, 1, -1], "D em specs");
  assert.deepEqual(g.pares.map(p => [p.sem, p.com]), [[2, 1], [1, 3], [1, 1], [0, 1], [2, 1]]);
  assert.deepEqual(g.pares.map(p => p.unidadesCom! - p.unidadesSem!), [1, -2, 0, 3, -1], "D em unidades, secundário");
  assert.deepEqual(g.porSpec, { decisao: CAMPANHAS_D_POR_SPEC["t7-tela-b-01"], specs: 4, unidades: 10 });
  // mesma estatística do módulo (nada reimplementado), sobre os D por spec, com a semente da agenda
  assert.deepEqual(g.estatistica, analisePareada([-1, 2, 0, 1, -1], SEMENTE));
  assert.equal(g.estatistica.ic.reamostragens, 10_000);
  assert.deepEqual(g.secundarios.sem.unidades, { confirmadas: 2 + 5 + 1 + 0 + 2, total: 50 });
  assert.deepEqual(g.secundarios.com.unidades, { confirmadas: 3 + 3 + 1 + 3 + 1, total: 50 });
  assert.equal(g.estado, "provisorio", "5 pares planejados ainda não finais");
  assert.doesNotMatch(g.motivoProvisorio!, /modo do desfecho/);
  // os mesmos pares numa campanha por unidade: D por unidade, sem porSpec
  const u = agregadoDaCampanha(vaA, linhas);
  assert.deepEqual(u.pares.map(p => p.d), [1, -2, 0, 3, -1]);
  assert.equal(u.porSpec, undefined);
  assert.equal(u.secundarios.sem.unidades, undefined);
  // textos: o título diz que D conta specs; secundário traz as unidades
  const d = linhasDoDesfecho(g);
  assert.match(d.titulo, /^PROVISÓRIO — D = specs confirmadas com − sem, nas 4 specs da referência \(spec confirmada = pelo menos 1 unidade confirmada; D-102/);
  assert.match(d.itens.find(i => i.startsWith("D por par"))!, /^D por par \(em specs\): p01 −1 · p02 \+2 · p03 0 · p04 \+1 · p05 −1$/);
  const sec = linhasSecundarias(g);
  assert.equal(sec[0], "unidades confirmadas por par (das 10), sem → com: p01 2 → 3 (+1) · p02 5 → 3 (−2) · p03 1 → 1 (0) · p04 0 → 3 (+3) · p05 2 → 1 (−1)");
  assert.match(sec[1], /^sem: unidades confirmadas 10\/50 · precisão média/);
  assert.equal(colunaD(g), "D (specs)");
  assert.equal(detalheD(g, g.pares[0]), "(specs 2 → 1; unidades 2 → 3)");
  assert.equal(colunaD(u), "D (sorteadas)");
  assert.equal(detalheD(u, u.pares[0]), "(2 → 3)");
  assert.doesNotMatch(linhasDoDesfecho(u).titulo, /specs/);
});

await teste("D-102: sem as unidades do par, ou com unidades que não batem com as confirmadas, o par fica fora com motivo", () => {
  const vaA = vistaAgenda(arqPainel, "agenda-teste", entradasPainel, () => null)!;
  const vaB: typeof vaA = { ...vaA, campanha: campanhaReal("t7-tela-b-01") };
  const g = agregadoDaCampanha(vaB, [linhaSpec("p01", ["S-2#1"], ["S-1#1"], { semUnidades: true }), linhaSpec("p02", ["S-2#1"], ["S-1#1"], { confirmadasSem: 4 }), linhaSpec("p03", ["S-2#1"], ["S-1#1"])]);
  assert.equal(g.nEfetivo, 1);
  assert.match(g.foraDaAnalise.find(f => f.pairId === "p01")!.motivo, /sem as unidades do par/);
  assert.match(g.foraDaAnalise.find(f => f.pairId === "p02")!.motivo, /não batem com as confirmadas do braço sem \(1 listadas, 4 no summary\.json\)/);
  // a campanha listada sem o texto do D por spec no campaign.json: provisório, e diz por quê
  const errada = agregadoDaCampanha({ ...vaB, campanha: { ...vaB.campanha, analysisPlan: campanhaReal("t7-tela-a-01").analysisPlan } }, [linhaSpec("p03", ["S-2#1"], ["S-1#1"])]);
  assert.match(errada.motivoProvisorio!, /modo do desfecho: .*não declara specs_confirmadas/);
});

// ───────────────────────────────────────────────────────────────── NAT-61: trios em quadrado latino (agenda.v2)

/** Campanha v2 de trio mínima, derivada da v1 do teste (os campos que a agenda e a política leem). */
function campanhaTrio(grupos: number, delta: Partial<CampaignV2["design"]> = {}): CampaignV2 {
  const v1 = campanha({ repetitions: grupos }, { campaignAttemptCeiling: 3 * grupos + 3 });
  const { oracle, ...fixos } = v1.fixed;
  const ident = (profile: "evaluation" | "knowledge-free", tools: string[], toolsListSha256: string) => ({ ...oracle, profile, tools, toolsListSha256 });
  return {
    ...v1, contract: "campaign.v2", campaignId: "agenda-trio-teste",
    design: { ...v1.design, arms: ["sem", "ferramentas", "com"], order: "quadrado-latino", seed: 61, repetitions: grupos, comparisons: [
      { id: "ferramentas-x-com", arms: ["ferramentas", "com"], role: "primary", question: "q" },
      { id: "sem-x-ferramentas", arms: ["sem", "ferramentas"], role: "secondary", question: "q" },
      { id: "sem-x-com", arms: ["sem", "com"], role: "secondary", question: "q" }], ...delta },
    fixed: { ...fixos, oracleProfiles: {
      com: ident("evaluation", ["get_component_spec", "get_design_tokens", "get_ds_rules", "get_emag_rules", "get_finding_details", "get_page_rules", "scan_page", "verify_finding"], "3d70162f5fed0ec8614d9dcbc18a69a00b4819ad56df1ed1c5bf95213eed0b3b"),
      ferramentas: ident("knowledge-free", ["get_finding_details", "scan_page", "verify_finding"], "72abd54968cbe3173fce5dd3b4bba7aff563b37ca11b8a9ec0f25a91a104d39c") } },
  };
}

await teste("trio (agenda.v2): quadrado latino com semente declarada — determinístico, cada braço em cada posição o mesmo número de vezes", () => {
  const G = 6;
  const c = campanhaTrio(G);
  assert.ok(validateContract(c).valid, JSON.stringify(validateContract(c).errors));
  const a = gerarAgenda({ campanha: c, campanhaSha256: "b".repeat(64), pares: G, semente: SEMENTE });
  assert.equal(documentoDaAgenda(a), documentoDaAgenda(gerarAgenda({ campanha: c, campanhaSha256: "b".repeat(64), pares: G, semente: SEMENTE })));
  assert.equal(a.contract, "agenda.v2");
  assert.deepEqual(a.square, quadradoLatino(["sem", "ferramentas", "com"]));
  assert.deepEqual(a.square, [["sem", "ferramentas", "com"], ["ferramentas", "com", "sem"], ["com", "sem", "ferramentas"]]);
  assert.equal(a.slots.length, 3 * G);
  // a regra: chave = sha256(commit|seed|quadrado|grupo); o i-ésimo grupo na ordem da chave usa a linha i mod 3
  const esperado = Array.from({ length: G }, (_, i) => `p${String(i + 1).padStart(2, "0")}`).map(p => ({ p, k: sha(`${SEMENTE}|61|quadrado|${p}`) })).sort((x, y) => x.k.localeCompare(y.k));
  assert.deepEqual(a.draw.map(d => [d.pairId, d.row]), esperado.map((x, i) => [x.p, i % 3]));
  const posicoes: Record<string, number[]> = { sem: [0, 0, 0], ferramentas: [0, 0, 0], com: [0, 0, 0] };
  for (const sl of a.slots) posicoes[sl.arm][sl.positionInPair - 1]++;
  assert.deepEqual(posicoes, { sem: [2, 2, 2], ferramentas: [2, 2, 2], com: [2, 2, 2] }, "balanceado: N múltiplo de 3");
  assert.deepEqual(a.slots.slice(0, 3).map(sl => sl.pairId), ["p01", "p01", "p01"], "os grupos rodam na ordem numérica; o quadrado só decide a ordem dentro do grupo");
  assert.deepEqual(a.slots.map(sl => sl.order), Array.from({ length: 3 * G }, (_, i) => i + 1));
  // outra semente declarada → outra ordem (a semente inteira entra na chave)
  const outra = gerarAgenda({ campanha: campanhaTrio(G, { seed: 62 }), campanhaSha256: "b".repeat(64), pares: G, semente: SEMENTE });
  assert.notDeepEqual(outra.draw.map(d => d.pairId), a.draw.map(d => d.pairId));
  // conferência: a mesma regra regenera os mesmos bytes; editada à mão ou de outra campanha é recusada
  assert.deepEqual(problemasDaAgenda(a, c, "b".repeat(64)), []);
  const trocada = JSON.parse(JSON.stringify(a)) as Agenda;
  [trocada.slots[0].arm, trocada.slots[1].arm] = [trocada.slots[1].arm, trocada.slots[0].arm];
  assert.match(problemasDaAgenda(trocada, c, "b".repeat(64)).join(), /regenerada difere/);
  assert.match(problemasDaAgenda(a, campanha(), "b".repeat(64)).join(), /agenda fora do contrato agenda\.v1/, "agenda de trio numa campanha v1");
});

await teste("trio (agenda.v2): campanha fora do desenho recusada; tentativas e situação valem para os três braços", () => {
  const G = 3;
  assert.match(problemasParaAgenda(campanhaTrio(G, { order: "balanceado" }), G, SEMENTE).join(), /quadrado-latino/);
  assert.match(problemasParaAgenda(campanhaTrio(G, { seed: null }), G, SEMENTE).join(), /design\.seed/);
  assert.match(problemasParaAgenda(campanhaTrio(G), G + 1, SEMENTE).join(), /repetitions/);
  const c = campanhaTrio(G);
  const a = gerarAgenda({ campanha: c, campanhaSha256: "b".repeat(64), pares: G, semente: SEMENTE });
  const ent = (slot: string, o: Parameters<typeof entrada>[1] = {}) => {
    const e = entrada(slot, { ...o, campanha: c.campaignId });
    e.braco = slot.split("-")[1] as ArmV2;
    return e;
  };
  const p1 = a.slots.filter(sl => sl.pairId === "p01");
  const es = [ent(p1[0].slotId), ent(p1[1].slotId), ent(p1[2].slotId), ent(`p02-ferramentas`, { tecnico: "failed", isolamento: "unverified", submissao: "absent", motivo: "rate-limited: 429" })];
  const d = proximaTentativa(a, c, es, "p02-ferramentas");
  assert.ok(d.ok && d.tentativa === 2 && d.extrasLimite === c.retryPolicy.campaignAttemptCeiling - 3 * G, JSON.stringify(d));
  assert.equal(tentativasDoSlot(es, c, "p02-ferramentas")[0].classe, "tecnica");
  const s = situacaoDaAgenda(a, c, es);
  assert.equal(s.planejados, 9);
  assert.equal(s.pares[0].estado, "completo");
  assert.ok(s.pares[0].slots.ferramentas, "o grupo traz o slot do terceiro braço");
  assert.deepEqual(Object.keys(s.porBraco).sort(), ["com", "ferramentas", "sem"]);
  assert.equal(s.porBraco.ferramentas!.tentados, 2, "p01 (válido) e p02 (falha técnica)");
  assert.equal(s.riscoDeSelecao, null, "nenhum slot perdido");
});

await teste("trio (agenda.v2) no disparo: o manifesto resolve braço, grupo e repetição do slot; o terceiro braço passa pelas entradas", () => {
  const G = 3;
  const gerada = buildIsolatedManifest({ ...comum, campanha: "agenda-trio", slot: "x", par: "x", braco: "ferramentas", tentativa: 1, campanhaPath: join(work, "nao-existe", "campaign.json") }).campaign!.document as CampaignV2;
  const c: CampaignV2 = { ...gerada, design: { ...gerada.design, repetitions: G, order: "quadrado-latino", seed: 61 }, retryPolicy: { ...gerada.retryPolicy, maxAttemptsPerSlot: 2, campaignAttemptCeiling: 3 * G + 3 } };
  const dir = join(work, "campanhas", "agenda-trio");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "campaign.json"), documentoDaCampanha(c));
  const a = gerarAgenda({ campanha: c, campanhaSha256: sha(readFileSync(join(dir, "campaign.json"))), pares: G, semente: SEMENTE });
  writeFileSync(join(dir, "agenda.json"), documentoDaAgenda(a));
  const arqT = join(work, "arquivo-trio");
  mkdirSync(join(arqT, "indice", "entradas"), { recursive: true });
  for (const sl of a.slots.filter(x => x.arm === "ferramentas" || x.positionInPair === 1).slice(0, 2)) {
    const m = buildIsolatedManifest({ ...comum, campanha: "agenda-trio", campanhaPath: join(dir, "campaign.json"), arquivoIndice: arqT, slot: sl.slotId, par: sl.pairId,
      braco: sl.arm as ArmV2 as never, repeticao: sl.repetition, tentativa: "auto" });
    assert.equal(m.agenda!.document.contract, "agenda.v2");
    assert.deepEqual(m.agenda!.slot, sl);
    assert.deepEqual(isolatedManifestProblems(m), []);
  }
  const ag = { agenda: a, campanha: c };
  const sl = a.slots.find(x => x.arm === "ferramentas")!;
  const r = conferirEntradas({ tela: "solicitacao", braco: "da-agenda", modo: "roteirizado", modelo: "", esforco: "da-campanha", limite_min: "", campanha: "agenda-trio", slot: sl.slotId, par: "",
    tentativa: "", repeticao: "", telas_sha: "a".repeat(40), validator_sha: "b".repeat(40), etapas: "coleta+linha-de-base" }, ag);
  assert.deepEqual(r.problemas, []);
  assert.equal(r.saidas.braco, "ferramentas");
  assert.equal(r.saidas.par, sl.pairId);
  assert.equal(r.saidas.imagens, "agent,screens,collector,egress,oracle");
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exitCode = falhas ? 1 : 0;
