/**
 * T8a — testes do painel de resultados. Sem modelo, sem rede (só 127.0.0.1), sem gabarito real.
 *
 *   npm run test:painel [-- --manter]
 *
 * Monta o arquivo sintético (`npm run painel:fixture`), sobe o painel numa porta livre e confere: estados
 * próprios (pendente, falha, findings vazio ≠ sem submissão, par incompleto, publicação indisponível,
 * recálculo falho mantendo a última versão íntegra); números iguais aos de summary.json e score.json;
 * cegueira da fila; gravação versionada e recusa de concorrência; recálculo gerando rev nova; isolamento
 * de caminhos (404 para tudo fora das rotas, inclusive gabarito e /@fs); download sem a referência e
 * vista reconstruída a partir dele; hash do scorer intacto.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lerTarGz } from "./arquivo-resultados";
import { analysisIdentity } from "./collection-manifest";
import { CAMPANHA_ID } from "./fixtures/analise/construir";
import { construirArquivoFixture } from "./painel/fixture";
import { lerAnalise, lerRevisao, metricasDaRevisao } from "./painel/modelo";
import { recalcular } from "./painel/revisao";
import { criarPainel, escutar } from "./painel/servidor";
import type { SemanticPackage } from "./semantic-flow";

const SCORER_SHA = "ae135c34ceeb3aa03942d90623a39bc609a0ea2d89822bb7d5938ca1c04132df";
const manter = process.argv.includes("--manter");
const TMP = mkdtempSync(join(tmpdir(), "painel-teste-"));
const resultados: { nome: string; ok: boolean }[] = [];
async function teste(nome: string, fn: () => void | Promise<void>): Promise<void> {
  try { await fn(); resultados.push({ nome, ok: true }); console.log(`ok   ${nome}`); } catch (e) {
    resultados.push({ nome, ok: false });
    console.log(`FAIL ${nome}\n     ${(e as Error).stack?.split("\n").slice(0, 4).join("\n     ")}`);
  }
}

const C = CAMPANHA_ID;
const arquivo = join(TMP, "arquivo");
await construirArquivoFixture(arquivo);
const servidor: Server = criarPainel({ arquivo, revisora: "" });
const porta = await escutar(servidor, 0);

/** Requisição crua (sem normalizar o caminho, como um cliente malicioso faria). */
function req(caminho: string, o: { metodo?: string; corpo?: string; cab?: Record<string, string> } = {}): Promise<{ status: number; corpo: Buffer; tipo: string }> {
  return new Promise((ok, falha) => {
    const r = request({ host: "127.0.0.1", port: porta, path: caminho, method: o.metodo ?? "GET",
      headers: { host: `127.0.0.1:${porta}`, ...(o.corpo ? { "content-type": "application/json" } : {}), ...o.cab } }, (res) => {
      const partes: Buffer[] = [];
      res.on("data", (c: Buffer) => partes.push(c));
      res.on("end", () => ok({ status: res.statusCode ?? 0, corpo: Buffer.concat(partes), tipo: String(res.headers["content-type"] ?? "") }));
    });
    r.on("error", falha);
    if (o.corpo) r.write(o.corpo);
    r.end();
  });
}
const getJson = async <T = any>(p: string): Promise<T> => { const r = await req(p); assert.equal(r.status, 200, `${p} → ${r.status}`); return JSON.parse(r.corpo.toString("utf8")) as T; };
const postJson = async <T = any>(p: string, corpo: unknown): Promise<T> => JSON.parse((await req(p, { metodo: "POST", corpo: JSON.stringify(corpo) })).corpo.toString("utf8")) as T;
const ler = (rel: string): any => JSON.parse(readFileSync(join(arquivo, rel), "utf8"));
const revDir = (par: string, rev: string) => `analises/${C}/${par}/revisoes/${rev}`;

// ───────────────────────────────────────────────────────────────── páginas e estados

await teste("páginas respondem 200 em HTML, com aviso de fixture", async () => {
  for (const p of ["/", "/ajuda", `/par/${C}/par-01`, `/par/${C}/par-03`, `/revisao/${C}/par-02`, "/execucao/fixture-analise-run-sem-03"]) {
    const r = await req(p);
    assert.equal(r.status, 200, p);
    assert.match(r.tipo, /text\/html/);
    assert.match(r.corpo.toString("utf8"), /FIXTURE SINTÉTICA/, `${p} sem aviso de fixture`);
  }
});

await teste("Execuções: mais recente primeiro, com identidade completa", async () => {
  const v = await getJson("/api/execucoes");
  const datas = v.execucoes.map((x: any) => x.dataUtc);
  assert.deepEqual(datas, [...datas].sort().reverse());
  assert.equal(v.execucoes.length, 8);
  for (const x of v.execucoes) for (const k of ["tela", "modelo", "esforco", "braco", "dataUtc", "tecnico", "pontuacao", "publicacao"]) assert.ok(x[k] !== undefined && x[k] !== null, `${x.chave}.${k}`);
  assert.equal(v.fixture, true);
  assert.equal(v.linhasDeBase.length, 1);
});

await teste("estados próprios: falha, findings vazio ≠ sem submissão, publicação indisponível", async () => {
  const v = await getJson("/api/execucoes");
  const de = (k: string) => v.execucoes.find((x: any) => x.chave === k);
  const semPacote = v.execucoes.find((x: any) => x.chave.startsWith("sem-pacote-"));
  assert.equal(semPacote.tecnico.estado, "falha");
  assert.equal(semPacote.achados.estado, "sem-pacote");
  assert.match(semPacote.causaFalha, /sem pacote/);
  assert.equal(de("fixture-analise-run-sem-04").achados.estado, "vazia");
  assert.equal(de("fixture-analise-run-sem-04").achados.total, 0);
  assert.equal(de("fixture-analise-run-com-04").achados.estado, "nenhuma");
  assert.equal(de("fixture-analise-run-com-04").achados.total, null, "sem submissão nunca vira 0");
  assert.equal(de("fixture-analise-run-com-04").tecnico.estado, "falha");
  assert.match(de("fixture-analise-run-com-04").causaFalha, /no-submission/);
  assert.equal(de("fixture-analise-run-sem-03").publicacao.estado, "publicacao-indisponivel");
  assert.equal(de("fixture-analise-run-sem-03").pontuacao.estado, "sem-analise");
  assert.equal(de("fixture-analise-run-sem-02").pontuacao.estado, "pendente");
  assert.equal(de("fixture-analise-run-sem-01").pontuacao.estado, "final");
});

await teste("pares: incompleto diz qual braço falta; estados distintos por par", async () => {
  const v = await getJson("/api/execucoes");
  const par = (p: string) => v.pares.find((x: any) => x.par === p);
  assert.deepEqual(par("par-03").faltando, ["com"]);
  assert.equal(par("par-03").selo.estado, "par-incompleto");
  assert.deepEqual(par("par-05").faltando, ["sem"]);
  assert.equal(par("par-01").selo.estado, "final");
  assert.equal(par("par-02").selo.estado, "pendente");
  assert.equal(par("par-04").selo.estado, "nao-se-aplica");
  const html = (await req(`/par/${C}/par-03`)).corpo.toString("utf8");
  assert.match(html, /falta o braço com oráculo/);
  const p3 = await getJson(`/api/par/${C}/par-03`);
  assert.equal(p3.comparacao, null, "par incompleto não tem comparação inventada");
});

await teste("números do Par = summary.json = score.json (sem fórmula paralela)", async () => {
  const p = await getJson(`/api/par/${C}/par-01`);
  assert.equal(p.analise.atual, "rev-002");
  const s = ler(`${revDir("par-01", "rev-002")}/summary.json`);
  const score = ler(`${revDir("par-01", "rev-002")}/score.json`);
  assert.equal(p.comparacao.diferencaUnidades.valor, s.comparacao.diferencaUnidadesConfirmadas);
  assert.equal(p.comparacao.diferencaRecall.valor, s.comparacao.diferencaRecall);
  assert.equal(p.comparacao.nota, s.comparacao.nota);
  assert.match(p.comparacao.nota, /n = 1 par, sem inferência/);
  const linha = (r: string) => p.metricas.find((l: any) => l.rotulo === r);
  for (const e of s.execucoes) {
    const sc = score.scores.find((x: any) => x.runId === e.runId);
    const m = e.pontuacao.metricas;
    assert.equal(linha("Defeitos da referência confirmados").valores[e.braco].valor, m.confirmedReferenceUnits);
    assert.equal(linha("Recall (cobertura da referência)").valores[e.braco].valor, m.recall);
    assert.equal(linha("Precisão sobre a referência").valores[e.braco].valor, m.precision);
    assert.equal(linha("Afirmações incorretas").valores[e.braco].valor, m.incorrectClaims);
    assert.equal(linha("Defeitos novos corretos").valores[e.braco].valor, m.newCorrect);
    // e o summary bate com o scorer
    assert.equal(m.confirmedReferenceUnits, sc.counts.detectedUnits);
    assert.equal(m.recall, sc.metrics.referenceRecall);
    assert.equal(m.precision, sc.metrics.referencePrecision);
    assert.equal(m.incorrectClaims, sc.counts.falseAssertions);
    // cada valor carrega a fonte: arquivo, versão, data e pacote
    const f = linha("Recall (cobertura da referência)").valores[e.braco].fonte;
    assert.equal(f.arquivo, `${revDir("par-01", "rev-002")}/summary.json`);
    assert.match(f.versao, /resumo-analise-1\.0\.0 · scorer flow-semantic/);
    assert.equal(f.atualizadoEm, s.geradoEm);
    assert.equal(f.pacote, e.runId);
  }
});

await teste("pendente mostra “indisponível”, nunca 0", async () => {
  const p = await getJson(`/api/par/${C}/par-02`);
  const recall = p.metricas.find((l: any) => l.rotulo.startsWith("Recall"));
  for (const a of ["sem", "com"]) { assert.equal(recall.valores[a].valor, null); assert.equal(recall.valores[a].texto, "indisponível"); }
  assert.equal(p.comparacao.diferencaRecall.valor, null);
  assert.equal(p.revisaoAberta, true);
});

await teste("comparação indisponível quando um braço não tem submissão (par-04)", async () => {
  const p = await getJson(`/api/par/${C}/par-04`);
  assert.equal(p.comparacao.disponivel, false);
  assert.match(p.comparacao.motivo, /braço sem pontuação: com/);
});

await teste("resumo técnico sem análise vem do run.json; sem pacote não inventa nada", async () => {
  const v = await getJson("/api/execucao/fixture-analise-run-sem-03");
  assert.equal(v.origem, "pacote");
  const st = v.tecnico.find((l: any) => l.rotulo === "Status técnico");
  assert.equal(st.valor.fonte.arquivo.endsWith("/pacote/run.json"), true);
  assert.equal(st.valor.fonte.pacote, "fixture-analise-run-sem-03");
  const run = ler(`${v.entrada.caminho}/pacote/run.json`);
  const t = v.custo.find((l: any) => l.rotulo === "Tempo de relógio (s)");
  assert.equal(t.valor.valor, run.usage.wallClockSeconds.value);
  const tokens = v.custo.find((l: any) => l.rotulo === "Tokens de entrada");
  assert.equal(tokens.valor.valor, null);
  assert.equal(tokens.valor.texto, "desconhecido");
  const lista = await getJson("/api/execucoes");
  const k = lista.execucoes.find((x: any) => x.chave.startsWith("sem-pacote-")).chave;
  const sp = await getJson(`/api/execucao/${k}`);
  assert.equal(sp.origem, "sem-pacote");
  assert.equal(sp.custo.length, 0);
  const comAnalise = await getJson("/api/execucao/fixture-analise-run-com-01");
  assert.equal(comAnalise.origem, "analise");
});

await teste("recálculo falho fica registrado e a última versão íntegra continua valendo (par-01)", async () => {
  const p = await getJson(`/api/par/${C}/par-01`);
  assert.equal(p.analise.atual, "rev-002");
  assert.ok(p.analise.avisos.some((a: string) => /falhou/.test(a) && /rev-002/.test(a)));
  assert.equal(p.analise.falhas.length, 1);
});

// ───────────────────────────────────────────────────────────────── fila de revisão

let filaInicial: any;
await teste("fila cega: sem braço, sem id da execução, sem nome de arquivo de evidência", async () => {
  filaInicial = await getJson(`/api/fila/${C}/par-02`);
  assert.equal(filaInicial.cartoes.length, 7);
  assert.ok(filaInicial.cartoes.every((c: any) => c.decisao.status === "pendente"));
  const texto = JSON.stringify(filaInicial) + (await req(`/revisao/${C}/par-02`)).corpo.toString("utf8");
  for (const proibido of ["fixture-analise-run-", "sem-02.png", "com-02.png", "reportedEvidence", "\"sem\"", "\"com\"", "pacote:"]) {
    assert.ok(!texto.includes(proibido), `vazou ${proibido}`);
  }
});

await teste("evidência por token opaco, conferida pelo sha256; cena reconstruída", async () => {
  const c = filaInicial.cartoes.find((x: any) => x.evidencias.some((e: any) => e.url));
  const r = await req(c.evidencias[0].url);
  assert.equal(r.status, 200);
  assert.equal(r.tipo, "image/png");
  assert.equal(r.corpo.subarray(1, 4).toString(), "PNG");
  const cena = await req(c.imagemCena);
  assert.equal(cena.status, 200);
  assert.equal(cena.tipo, "image/png");
});

const decDir = join(arquivo, "analises", C, "par-02", "decisoes");
await teste("gravação recusada não cria arquivo (justificativa, nome, unidade, vocabulário)", async () => {
  const c = filaInicial.cartoes[0];
  const base = { cardId: c.id, decisao: "incorreta", justificativa: "x", consultado: ["cartão"], revisora: "R", base: 0 };
  for (const [mudar, re] of [
    [{ justificativa: " " }, /justificativa/], [{ revisora: "" }, /nome da revisora/], [{ decisao: "acertou" }, /decisão desconhecida/],
    [{ consultado: [] }, /consultou/], [{ cardId: "C-nao-existe" }, /cartão desconhecido/],
  ] as const) {
    const r = await postJson(`/api/decisao/${C}/par-02`, { ...base, ...mudar });
    assert.equal(r.ok, false); assert.match(r.erro, re);
  }
  const semCandidata = filaInicial.cartoes.find((x: any) => x.candidatas.length === 0);
  const r = await postJson(`/api/decisao/${C}/par-02`, { ...base, cardId: semCandidata.id, decisao: "defeito-do-gabarito", unitIds: [] });
  assert.equal(r.ok, false);
  assert.ok(!existsSync(decDir), "nada pode ter sido gravado");
});

await teste("gravações versionadas: arquivo novo a cada salvar, histórico visível, concorrência recusada", async () => {
  const [c1, c2] = filaInicial.cartoes;
  const r1 = await postJson(`/api/decisao/${C}/par-02`, { cardId: c1.id, decisao: "evidencia-insuficiente", justificativa: "primeira", consultado: ["cartão"], revisora: "Revisora Teste", base: 0 });
  assert.equal(r1.ok, true, r1.erro); assert.equal(r1.versao, 1);
  const bytes1 = readFileSync(join(decDir, "decisoes-0001.json"));
  const stale = await postJson(`/api/decisao/${C}/par-02`, { cardId: c2.id, decisao: "incorreta", justificativa: "janela velha", consultado: ["cartão"], revisora: "R", base: 0 });
  assert.equal(stale.ok, false); assert.equal(stale.conflito, true);
  const r2 = await postJson(`/api/decisao/${C}/par-02`, { cardId: c1.id, decisao: "incorreta", justificativa: "mudei de ideia", consultado: ["cartão"], revisora: "Revisora Teste", base: 1 });
  assert.equal(r2.ok, true); assert.equal(r2.versao, 2);
  assert.deepEqual(readdirSync(decDir).sort(), ["decisoes-0001.json", "decisoes-0002.json"]);
  assert.deepEqual(readFileSync(join(decDir, "decisoes-0001.json")), bytes1, "versão anterior nunca é reescrita");
  const d2 = JSON.parse(readFileSync(join(decDir, "decisoes-0002.json"), "utf8"));
  assert.equal(d2._painel.baseadaEm.decisoes, "decisoes-0001.json");
  assert.equal(d2._painel.revisora, "Revisora Teste");
  const f = await getJson(`/api/fila/${C}/par-02`);
  assert.equal(f.versaoDecisoes, 2);
  assert.equal(f.naoIncorporadas, 2);
  assert.equal(f.cartoes.find((x: any) => x.id === c1.id).decisao.decisao, "incorreta");
  const html = (await req(`/revisao/${C}/par-02`)).corpo.toString("utf8");
  assert.match(html, /Histórico das gravações \(2\)/);
  assert.match(html, /mudei de ideia/);
});

await teste("Recalcular (sem credencial de LLM, sem rede) cria rev-002 final; rev-001 intacta", async () => {
  for (const k of Object.keys(process.env)) if (/ANTHROPIC|CLAUDE|OPENAI/i.test(k)) delete process.env[k];
  const pkg = ler(`${revDir("par-02", "rev-001")}/revisao/package.json`) as SemanticPackage;
  let f = await getJson(`/api/fila/${C}/par-02`);
  for (const c of pkg.cards) {
    const decisao = c.candidateUnitIds.length ? "defeito-do-gabarito" : /julgada incorreta/.test(c.observed ?? "") ? "incorreta" : "defeito-novo-correto";
    const r = await postJson(`/api/decisao/${C}/par-02`, { cardId: c.id, decisao, unitIds: c.candidateUnitIds.slice(0, 1), citacao: "supported",
      justificativa: "teste", consultado: ["cartão"], revisora: "Revisora Teste", base: f.versaoDecisoes });
    assert.equal(r.ok, true, r.erro);
    f = { versaoDecisoes: r.versao };
  }
  const antes = readFileSync(join(arquivo, revDir("par-02", "rev-001"), "summary.json"));
  const r = await postJson(`/api/recalcular/${C}/par-02`, {});
  assert.equal(r.ok, true, r.erro);
  assert.match(r.revisao, /rev-002$/);
  assert.deepEqual(readFileSync(join(arquivo, revDir("par-02", "rev-001"), "summary.json")), antes);
  const p = await getJson(`/api/par/${C}/par-02`);
  assert.equal(p.analise.atual, "rev-002");
  const s = ler(`${revDir("par-02", "rev-002")}/summary.json`);
  assert.equal(s.revisao.numero, 2);
  assert.equal(s.comparacao.estado, "final");
  assert.equal(p.comparacao.diferencaRecall.valor, s.comparacao.diferencaRecall);
  assert.notEqual(p.comparacao.diferencaRecall.valor, null);
  const fila = await getJson(`/api/fila/${C}/par-02`);
  assert.equal(fila.naoIncorporadas, 0);
  assert.equal(fila.pendentesAtivos, 0);
});

await teste("recálculo que falha: registro em falhas/, versão anterior continua, aviso aparece", async () => {
  const rc = ler(`analises/${C}/par-04/receita.json`);
  const pac = join(arquivo, rc.pacotes.sem);
  renameSync(pac, `${pac}.fora`);
  try {
    const r = await postJson(`/api/recalcular/${C}/par-04`, {});
    assert.equal(r.ok, false);
    assert.match(r.erro, /não está restaurado/);
    const p = await getJson(`/api/par/${C}/par-04`);
    assert.equal(p.analise.atual, "rev-001");
    assert.equal(p.analise.revisoes.length, 1);
    assert.ok(p.analise.avisos.some((a: string) => /falhou/.test(a) && /rev-001/.test(a)));
  } finally { renameSync(`${pac}.fora`, pac); }
});

await teste("pasta de revisão incompleta é ignorada com aviso, nunca mostrada como nova", async () => {
  mkdirSync(join(arquivo, revDir("par-02", "rev-009")), { recursive: true });
  writeFileSync(join(arquivo, revDir("par-02", "rev-009"), "score.json"), "{}");
  try {
    const p = await getJson(`/api/par/${C}/par-02`);
    assert.equal(p.analise.atual, "rev-002");
    assert.ok(p.analise.avisos.some((a: string) => /rev-009 está incompleta/.test(a)));
  } finally { rmSync(join(arquivo, revDir("par-02", "rev-009")), { recursive: true }); }
});

await teste("recálculo direto pela biblioteca (tarefa automatizada) dá o mesmo conteúdo científico", async () => {
  const r = await recalcular(arquivo, C, "par-01");
  assert.equal(r.ok, true);
  const an = lerAnalise(arquivo, C, "par-01")!;
  assert.equal(an.atual!.nome, "rev-003");
  const [a, b] = ["rev-002", "rev-003"].map(n => ler(`${revDir("par-01", n)}/summary.json`));
  assert.deepEqual(b.comparacao, a.comparacao);
  assert.deepEqual(b.execucoes.map((e: any) => e.pontuacao), a.execucoes.map((e: any) => e.pontuacao));
});

// ───────────────────────────────────────────────────────────────── download e reconstrução

await teste("download da revisão: sem referência; vista reconstruída do .tar.gz é a mesma", async () => {
  const r = await req(`/baixar/analise/${C}/par-01/rev-002.tar.gz`);
  assert.equal(r.status, 200);
  assert.equal(r.tipo, "application/gzip");
  const arqs = lerTarGz(r.corpo);
  const raiz = "par-01-rev-002";
  assert.ok(arqs.every(f => f.path.startsWith(`${raiz}/`)));
  assert.ok(!arqs.some(f => /referencia\.json$/.test(f.path)), "a referência não pode sair no download");
  assert.ok(arqs.some(f => f.path === `${raiz}/LEIA-ME-PAINEL.txt`));
  const sumOriginal = readFileSync(join(arquivo, revDir("par-01", "rev-002"), "summary.json"));
  assert.deepEqual(arqs.find(f => f.path === `${raiz}/summary.json`)!.body, sumOriginal);
  const ext = join(TMP, "extraido");
  for (const f of arqs) { mkdirSync(join(ext, f.path, ".."), { recursive: true }); writeFileSync(join(ext, f.path), f.body); }
  const doDownload = lerRevisao(join(ext, raiz), "rev-002", raiz);
  const doArquivo = lerAnalise(arquivo, C, "par-01")!.revisoes.find(x => x.nome === "rev-002")!;
  assert.ok(typeof doDownload !== "string");
  const semFonte = (ls: ReturnType<typeof metricasDaRevisao>) => ls.map(l => ({ r: l.rotulo, v: Object.fromEntries(Object.entries(l.valores).map(([k, x]) => [k, [x!.valor, x!.texto, x!.fonte.campo]])) }));
  assert.deepEqual(semFonte(metricasDaRevisao(doDownload)), semFonte(metricasDaRevisao(doArquivo)));
});

await teste("download do pacote arquivado de uma execução", async () => {
  const r = await req("/baixar/execucao/fixture-analise-run-sem-03.tar.gz");
  assert.equal(r.status, 200);
  const arqs = lerTarGz(r.corpo);
  assert.ok(arqs.some(f => f.path.endsWith("/pacote/run.json")));
  assert.ok(arqs.some(f => f.path.endsWith("/despacho.json")));
});

// ───────────────────────────────────────────────────────────────── isolamento

await teste("isolamento: nada fora das rotas; gabarito, /@fs e travessia → 404", async () => {
  const refSha = readdirSync(join(arquivo, "snapshots", "referencia"))[0];
  const caminhos = [
    "/ground-truth.json", "/ground-truth-solicitacao.json", "/checker-aliases.json", "/adjudications.json", "/package.json",
    "/../ground-truth.json", "/%2e%2e/ground-truth.json", "/%2E%2E%2Fground-truth.json", "/..%2fground-truth.json", "/..%5cground-truth.json",
    "/@fs/F:/Dev Nath/TCC/govbr-eval/ground-truth.json".replace(/ /g, "%20"), "/@fs/etc/passwd", "//ground-truth.json",
    `/snapshots/referencia/${refSha}/referencia.json`, `/analises/${C}/par-01/revisoes/rev-002/entradas/referencia.json`,
    `/analises/${C}/par-01/revisoes/rev-002/summary.json`, `/campanhas/${C}/campaign.json`, "/INDICE.md", "/scripts/painel/servidor.ts",
    `/baixar/analise/${C}/par-01/..%2f..%2freceita.json`, `/baixar/analise/${C}/par-01/rev-002.json`, `/baixar/analise/${C}/../rev-002.tar.gz`,
    `/baixar/execucao/..%2f..%2fground-truth.json.tar.gz`, `/evidencia/${C}/par-02/${"0".repeat(24)}`, `/evidencia/${C}/par-02/../../ground-truth.json`,
    `/cena/${C}/par-02/99`, `/cena/${C}/par-02/..%2f..%2freceita.json`, "/api/../ground-truth.json", "/api/ground-truth", `/api/fila/${C}/par-02/package.json`,
    `/par/${C}/par-01/entradas/referencia.json`, "/execucao/ground-truth.json", `/revisao/${C}/..`, "/node_modules/playwright/package.json",
  ];
  for (const p of caminhos) {
    const r = await req(p);
    assert.equal(r.status, 404, `${p} → ${r.status}`);
    const t = r.corpo.toString("utf8");
    assert.ok(!/"_meta"|"violations"|FX-0\d/.test(t), `${p} devolveu conteúdo de referência`);
  }
});

await teste("só 127.0.0.1: Host estranho recusado; POST só JSON e da mesma origem", async () => {
  assert.equal((await req("/", { cab: { host: "evil.example" } })).status, 421);
  assert.equal((await req(`/api/recalcular/${C}/par-02`, { metodo: "POST", cab: { "content-type": "text/plain" }, corpo: undefined })).status, 415);
  assert.equal((await req(`/api/recalcular/${C}/par-02`, { metodo: "POST", corpo: "{}", cab: { origin: "http://evil.example" } })).status, 403);
  assert.equal((await req("/", { metodo: "DELETE" })).status, 405);
});

await teste("hash de SCORER_FILES intacto", () => {
  assert.equal(analysisIdentity().scorerSha256, SCORER_SHA);
});

servidor.close();
if (!manter) rmSync(TMP, { recursive: true, force: true }); else console.log(`(mantido: ${TMP})`);
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} testes do painel passaram`);
process.exitCode = falhas ? 1 : 0;
