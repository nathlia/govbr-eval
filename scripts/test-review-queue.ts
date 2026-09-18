/**
 * A fila finita e o vocabulário de quem decide (fatia 5).
 *
 * Três coisas são cobradas aqui. Que a fila ATIVA seja a única que fecha a bateria, sem que a
 * dívida das outras desapareça por isso. Que a autora escreva o que viu — `decisao` — e não a
 * categoria contábil que o denominador consome. E que a renderização cega retenha exatamente o
 * texto em que o agente narra as próprias ferramentas, dizendo que reteve.
 *
 * O quarto item, a conformidade da bateria com o plano congelado, é a regra "não se roda de novo
 * para trocar uma saída": a contagem de slots já existia, e o que falta é distinguir duas execuções
 * planejadas de uma repetida.
 */

import assert from "node:assert/strict";
import type { FlowAgentResults } from "../types";
import type { Resolution } from "./anchors";
import type { FlowUnit } from "./units-flow";
import { checkPlanConformity } from "./collection-manifest";
import {
  armLeaks, historicalPending, normalizeReviews, prepareSemanticPackage, reviewEffort, reviewQueue,
  scopeReviews, scoreSemanticPackage,
  type PrepareRun, type RawReviews, type SemanticPackage, type SemanticReviews,
} from "./semantic-flow";
import { renderReview } from "./semantic-flow-render";
import { buildReport, renderReport } from "./report-flow";

let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

const element = { key: "body>input", id: "E-input", label: "CPF", hidden: null };
const resolution: Resolution = { url: "http://fixture/fluxo.html",
  byKey: new Map([[element.key, element]]),
  bySelector: new Map([["#cpf", { selector: "#cpf", ok: true, error: null, keys: [element.key] }]]) };
const units: FlowUnit[] = [{ specId: "A", element, participants: [element.key], rules: ["wcag:1.3.1"],
  categories: ["form"], description: "Help text association", state: "sempre",
  states: ["inicial"], conditional: false }];

function run(findings: FlowAgentResults["findings"], notes?: string): FlowAgentResults {
  return { model: "fixture", timestamp: "fixed", appUrl: resolution.url, findings,
    ...(notes ? { notes } as Partial<FlowAgentResults> : {}) };
}
const achado = { selector: "#cpf", rule: "wcag:1.3.1", description: "Texto de apoio não associado" };
function pacote(opts: { notes?: string; carriedOverPending?: string[]; reviewBudget?: string } = {}): SemanticPackage {
  return prepareSemanticPackage({ referenceHash: "r", sceneHash: "s", scorerHash: "h" },
    units, resolution, [{ id: "r1", data: run([achado], opts.notes) }],
    { carriedOverPending: opts.carriedOverPending, reviewBudget: opts.reviewBudget });
}
const decidido = (pkg: SemanticPackage, atoms: unknown[]): RawReviews => ({
  version: pkg.version,
  decisions: [{ cardId: pkg.cards[0].id, status: "reviewed", reviewer: "autora", rationale: "conferido",
    complete: true, evidenceRefs: ["DOM"], atoms: atoms as RawReviews["decisions"][number]["atoms"] }],
});

// ── As três filas ────────────────────────────────────────────────────────────

test("a fila ativa é a única que fecha a bateria", () => {
  const pkg = pacote();
  const fila = reviewQueue(pkg, scopeReviews(pkg));
  assert.equal(fila.fechaABateria, "ativa");
  assert.equal(fila.ativa.cartoes, 1);
  assert.equal(fila.historica.cartoes, 0);
  assert.equal(fila.proximaVersao.afirmacoes, 0);
});

test("pendência de outra bateria não entra na fila ativa, e não some por isso", () => {
  const antiga = pacote({ notes: "execução anterior" });
  const anteriores: SemanticReviews = scopeReviews(antiga);
  const nova = pacote();
  // O cartão da bateria antiga não é cartão desta: sai da fila ativa...
  const herdadas = historicalPending(nova, anteriores);
  assert.deepEqual(herdadas, [antiga.cards[0].id]);
  assert.equal(scopeReviews(nova, anteriores).decisions.length, 1, "só o cartão desta bateria");
  // ...e continua contado, à parte, como dívida declarada do projeto.
  const comHerança = pacote({ carriedOverPending: herdadas });
  const fila = reviewQueue(comHerança, scopeReviews(comHerança));
  assert.equal(fila.historica.cartoes, 1);
  assert.equal(fila.ativa.cartoes, 1);
});

test("descoberta correta fora do gabarito conta para a PRÓXIMA referência, não para esta", () => {
  const pkg = pacote();
  const reviews = normalizeReviews(decidido(pkg, [{ id: "a", text: "defeito real fora do gabarito",
    subjects: [element.key], decisao: "defeito-novo-correto", unitIds: [], citation: "uncertain" }]));
  const fila = reviewQueue(pkg, reviews);
  assert.equal(fila.proximaVersao.afirmacoes, 1);
  assert.equal(fila.ativa.cartoes, 0, "decidida: não prende mais a bateria");
  const score = scoreSemanticPackage(pkg, reviews).scores[0];
  assert.equal(score.counts.referenceUnits, 1, "o denominador desta bateria não se mexe");
  assert.equal(score.counts.detectedUnits, 0);
});

// ── O vocabulário de quem decide ─────────────────────────────────────────────

test("as cinco palavras da autora viram as categorias contábeis", () => {
  const pkg = pacote();
  const caso = (decisao: string, extra: Record<string, unknown> = {}) => normalizeReviews(decidido(pkg,
    [{ id: "a", text: "t", subjects: [element.key], decisao, unitIds: [], citation: "uncertain", ...extra }]))
    .decisions[0].atoms[0].verdict;
  assert.equal(caso("defeito-do-gabarito", { unitIds: [pkg.units[0].id] }), "reference");
  assert.equal(caso("defeito-novo-correto"), "novel");
  assert.equal(caso("incorreta"), "false");
  assert.equal(caso("evidencia-insuficiente"), "unresolved");
});

test("duplicada herda o veredito do átomo apontado, e nunca o adivinha", () => {
  const pkg = pacote();
  const reviews = normalizeReviews(decidido(pkg, [
    { id: "original", text: "defeito", subjects: [element.key], decisao: "incorreta", unitIds: [], citation: "unsupported" },
    { id: "repetida", text: "o mesmo dito outra vez", subjects: [element.key], decisao: "duplicada",
      duplicateOf: { cardId: pkg.cards[0].id, atomId: "original" }, unitIds: [], citation: "unsupported" },
  ]));
  assert.equal(reviews.decisions[0].atoms[1].verdict, "false", "copiado do original");
  assert.equal(reviews.decisions[0].atoms[1].decisao, "duplicada", "e o que ela escreveu fica registrado");
});

test("o vocabulário falha fechado: desconhecido, ausente, em desacordo ou em ciclo", () => {
  const pkg = pacote();
  const bruto = (atoms: unknown[]) => () => normalizeReviews(decidido(pkg, atoms));
  assert.throws(bruto([{ id: "a", text: "t", subjects: [element.key], decisao: "talvez", unitIds: [], citation: "uncertain" }]),
    /Decisão desconhecida/);
  assert.throws(bruto([{ id: "a", text: "t", subjects: [element.key], unitIds: [], citation: "uncertain" }]),
    /sem decisao nem verdict/);
  assert.throws(bruto([{ id: "a", text: "t", subjects: [element.key], decisao: "incorreta", verdict: "novel",
    unitIds: [], citation: "uncertain" }]), /discordam/);
  assert.throws(bruto([{ id: "a", text: "t", subjects: [element.key], decisao: "duplicada",
    duplicateOf: { cardId: pkg.cards[0].id, atomId: "a" }, unitIds: [], citation: "uncertain" }]), /Ciclo/);
  assert.throws(bruto([{ id: "a", text: "t", subjects: [element.key], decisao: "duplicada", unitIds: [], citation: "uncertain" }]),
    /exige duplicateOf/);
});

test("o verdict interno continua aceito: o vocabulário simples é uma via, não um muro", () => {
  const pkg = pacote();
  const reviews = normalizeReviews(decidido(pkg, [{ id: "a", text: "t", subjects: [element.key],
    verdict: "reference", unitIds: [pkg.units[0].id], citation: "supported" }]));
  assert.equal(scoreSemanticPackage(pkg, reviews).scores[0].counts.detectedUnits, 1);
});

// ── Cegueira ─────────────────────────────────────────────────────────────────

const NOTA_QUE_DENUNCIA = "Sem oráculo nem scan_page; ids WCAG atribuídos manualmente.";

test("a renderização cega retém o texto que nomeia o braço, e diz que reteve", () => {
  const pkg = pacote({ notes: NOTA_QUE_DENUNCIA });
  assert.deepEqual(armLeaks(pkg).map(v => v.cardId), [pkg.cards[0].id]);
  assert.ok(armLeaks(pkg)[0].termos.includes("oráculo"));

  const aberta = renderReview(pkg, scopeReviews(pkg));
  assert.ok(aberta.includes(NOTA_QUE_DENUNCIA), "sem --cego o texto aparece inteiro");

  const cega = renderReview(pkg, scopeReviews(pkg), { cego: true });
  assert.ok(!cega.includes("scan_page"), "cega: o texto do agente não aparece");
  assert.ok(cega.includes("retido na renderização cega"), "e a retenção é declarada");
  assert.match(cega, /Não abra `package\.json` enquanto decide/,
    "avisa do arquivo que guarda config.arm ao lado do review.md");
});

test("cegar não esconde o que sustenta a decisão", () => {
  const pkg = pacote({ notes: NOTA_QUE_DENUNCIA });
  const cega = renderReview(pkg, scopeReviews(pkg), { cego: true });
  for (const necessario of [pkg.cards[0].id, element.key, "Unidades candidatas", "Sujeitos", "Regra declarada"]) {
    assert.ok(cega.includes(necessario), `a cegueira não pode remover: ${necessario}`);
  }
});

// ── Esforço e orçamento ──────────────────────────────────────────────────────

test("o esforço conta o que dá para contar, e diz que a taxa é declarada", () => {
  const pkg = pacote({ reviewBudget: "2 sessões de 45 min" });
  const e = reviewEffort(pkg);
  assert.equal(e.cartoes, 1);
  assert.equal(e.sujeitos, 1);
  assert.equal(e.semEvidenciaVerificada, 1, "a fixture não tem evidência preservada");
  assert.equal(e.orcamentoDeclarado, "2 sessões de 45 min");
  assert.match(e.taxa, /DECLARADA, não medida/);
  assert.ok(e.estimativaMinutos > 0);
});

test("sem orçamento declarado o pacote diz isso, em vez de inventar um", () => {
  const pkg = pacote();
  assert.equal(reviewEffort(pkg).orcamentoDeclarado, null);
  assert.match(renderReview(pkg, scopeReviews(pkg)), /Nenhum orçamento de revisão foi declarado/);
});

// ── A bateria entregue é a planejada ─────────────────────────────────────────

test("o mesmo slot rodado duas vezes é recusado, mesmo com a contagem certa", () => {
  const plano = [{ slot: 1, arm: "com" }, { slot: 2, arm: "sem" }];
  assert.throws(() => checkPlanConformity([{ slot: 1, arm: "com" }, { slot: 1, arm: "com" }], plano),
    /collected more than once/);
  assert.throws(() => checkPlanConformity([{ slot: 1, arm: "com" }], plano), /accounts for 1 of 2/);
  assert.throws(() => checkPlanConformity([{ slot: 1, arm: "com" }, { slot: 9, arm: "sem" }], plano),
    /outside the frozen plan/);
  assert.throws(() => checkPlanConformity([{ slot: 1, arm: "sem" }, { slot: 2, arm: "com" }], plano),
    /was planned for arm/);
  assert.throws(() => checkPlanConformity([{ arm: "com" }, { slot: 2, arm: "sem" }], plano), /without a slot/);
  checkPlanConformity([{ slot: 2, arm: "sem" }, { slot: 1, arm: "com" }], plano); // ordem não importa
});

// ── Relatório: uma pontuação, nenhuma fórmula paralela ───────────────────────

function pacoteDeDoisBracos(): SemanticPackage {
  const execucao = (id: string, arm: string, custo: number, segundos: number, turnos: number): PrepareRun => ({
    id, kind: "agente",
    data: { model: "fixture", timestamp: "fixed", appUrl: resolution.url, findings: [achado],
      config: { arm, instrumentVersion: "fluxo-1.3.0" } as FlowAgentResults["config"],
      cost: { totalCostUsd: custo, wallClockSeconds: segundos, turns: turnos } as unknown as FlowAgentResults["cost"] },
  });
  return prepareSemanticPackage({ referenceHash: "r", sceneHash: "s", scorerHash: "h" }, units, resolution,
    [execucao("results/runs-fluxo/a.json", "com-oraculo", 1.5, 200, 30),
     execucao("results/runs-fluxo-ablacao/b.json", "sem-oraculo", 1.0, 150, 20)],
    { reviewBudget: "2 sessões de 45 min" });
}

test("o relatório diz PROVISÓRIO enquanto houver cartão sem decisão", () => {
  const pkg = pacoteDeDoisBracos();
  const md = renderReport(pkg, buildReport(pkg, scopeReviews(pkg)));
  assert.match(md, /PROVISÓRIO/);
  assert.match(md, /Bateria aberta/);
  assert.ok(!md.includes("Bateria fechada"));
});

test("o relatório separa braços, cita custo por execução e nunca recalcula métrica", () => {
  const pkg = pacoteDeDoisBracos();
  const decisoes: RawReviews = { version: pkg.version, decisions: pkg.cards.map(c => ({
    cardId: c.id, status: "reviewed" as const, reviewer: "autora", rationale: "conferido",
    complete: true, evidenceRefs: ["DOM"],
    atoms: [{ id: "a", text: "defeito do gabarito", subjects: [element.key], decisao: "defeito-do-gabarito" as const,
      unitIds: [pkg.units[0].id], citation: "supported" as const }],
  })) };
  const d = buildReport(pkg, decisoes);
  const md = renderReport(pkg, d);

  assert.deepEqual(d.bracos, ["com-oraculo", "sem-oraculo"]);
  const com = d.porBraco.find(b => b.arm === "com-oraculo")!;
  assert.equal(com.execucoes, 1);
  assert.equal(com.custoUsd, 1.5);
  // A métrica vem do scorer, não de conta refeita aqui.
  assert.equal(com.revocacao.media, d.result.scores.find(s => s.runId.includes("runs-fluxo/"))!.metrics.referenceRecall);
  assert.match(md, /Bateria fechada/);
  assert.match(md, /US\$ 1\.5000/);
  assert.match(md, /Esforço de avaliação — não é custo de operação/);
  assert.match(md, /2 sessões de 45 min/);
  assert.match(md, /Nenhum teste/);
});

test("desvio-padrão é amostral e some quando há uma observação só", () => {
  const pkg = pacoteDeDoisBracos();
  const d = buildReport(pkg, scopeReviews(pkg));
  for (const b of d.porBraco) assert.equal(b.revocacao.desvio, null, "uma execução por braço: não há dispersão a relatar");
});

console.log(`${tests} review-queue tests passed.`);
