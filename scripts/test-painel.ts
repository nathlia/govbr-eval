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
 *
 * T8a.1: num arquivo montado pelo código do job arquivar do T4 (sem análise), "Preparar análise" pela
 * API: estado pronto para preparar, tela que navega fora do alcance, anexo ausente e hash divergente
 * (anexo e referência) como falhas com etapa, de ponta a ponta até "aguardando revisão", isolamento
 * (404) e cache de restauração adulterado refeito do anexo.
 *
 * T8a.2: id curto (slot) visível em toda página e na URL, fila cega sem ids, avisos de uma frase sem
 * stack, porta ocupada (outro painel recusa; outro programa → porta ao lado com aviso), /guia servido
 * sem rede (reveal.js de node_modules, SVG de docs/diagramas), ensaio ≠ fixture, clone com CRLF.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lerTarGz, sha as sha256 } from "./arquivo-resultados";
import { analysisIdentity } from "./collection-manifest";
import { CAMPANHA_ID } from "./fixtures/analise/construir";
import { ROOT } from "./adjudication";
import { construirArquivoFixture, construirArquivoT4 } from "./painel/fixture";
import { lerAnalise, lerRevisao, metricasDaRevisao } from "./painel/modelo";
import { chromium } from "playwright";
import { explicarExcecao, recalcular, salvarDecisao, vistaFila } from "./painel/revisao";
import { criarPainel, escutar } from "./painel/servidor";
import { cartaoDoVinculo, digest, type SemanticPackage } from "./semantic-flow";

// flow-semantic-1.8.2 (parada provada em todo crédito, não só no vínculo; NAT-91, Codex 74577dd9): instrument.*, semantic-flow.ts
// mudaram de propósito; antes dece16eb…9a91 (1.8.1, domínio amarrado), 96677601…d990 (1.8.0, NAT-74), 82c9b2ef…c84c (1.7.0, kb-aliases-2.0.0), 0006158c…e4fd (1.6.0, NAT-72)
// e 7ceb07e3…d146 (1.5.0). Medido em árvore LF. Muda de novo se kb-aliases-v2.json for regenerado.
const SCORER_SHA = "ec3b0b6fa256cfa637193783ea4d95f6648097cfa6be1bad23f31bf20328ec7f";
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
  for (const p of ["/", "/ajuda", "/guia", `/execucao/${C}/slot-04`, `/par/${C}/par-01`, `/par/${C}/par-03`, `/revisao/${C}/par-02`, "/execucao/fixture-analise-run-sem-03"]) {
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

await teste("campanha congelada com outro scorer: Recalcular recusa em uma frase, nenhuma revisão nova, a atual continua", async () => {
  const rc = ler(`analises/${C}/par-04/receita.json`);
  const campPath = join(arquivo, rc.entradas.campanha);
  const original = readFileSync(campPath);
  const camp = JSON.parse(original.toString("utf8"));
  camp.fixed.scorerVersion = "flow-semantic-1.4.0";
  writeFileSync(campPath, JSON.stringify(camp, null, 2));
  try {
    const antes = await getJson(`/api/par/${C}/par-04`);
    const r = await postJson(`/api/recalcular/${C}/par-04`, {});
    assert.equal(r.ok, false);
    assert.ok(r.erro.includes(`a campanha ${camp.campaignId} foi congelada com flow-semantic-1.4.0; o scorer atual é ${analysisIdentity().scoringVersion} — análise recusada para não misturar versões`), r.erro);
    assert.match(r.falha, /revisoes\/falhas\//);
    const p = await getJson(`/api/par/${C}/par-04`);
    assert.equal(p.analise.atual, antes.analise.atual);
    assert.equal(p.analise.revisoes.length, antes.analise.revisoes.length);
    assert.ok(p.analise.avisos.some((a: string) => /falhou/.test(a)));
  } finally { writeFileSync(campPath, original); }
});

await teste("botão Recalcular com navegador que não abre (NAT-52): frase legível na resposta, log cru só no erro.json", async () => {
  // Mesmo caminho do botão (POST /api/recalcular no servidor). O navegador real é trocado por um
  // executável que sai na hora — reproduz o "browserType.launch: Target page, context or browser has
  // been closed … <process did exit: exitCode=…>" que a autora viu (lá, 0xC0000142 do Windows).
  const original = chromium.launch;
  chromium.launch = ((o?: Parameters<typeof original>[0]) => original.call(chromium, { ...o, executablePath: process.execPath })) as typeof original;
  // T6: o servidor do site congelado que `analisar` sobe antes do launch tem de fechar quando o launch
  // falha — nenhum servidor TCP a mais depois da falha (e o processo de teste termina sem process.exit).
  const servidoresTcp = () => process.getActiveResourcesInfo().filter(t => t === "TCPServerWrap").length;
  const antes = servidoresTcp();
  try {
    const r = await postJson(`/api/recalcular/${C}/par-02`, {});
    assert.equal(r.ok, false);
    // o handle do libuv some um giro do laço depois do callback de close(): espera curta, nunca infinita
    for (let i = 0; i < 20 && servidoresTcp() > antes; i++) await new Promise(r => setTimeout(r, 50));
    assert.equal(servidoresTcp(), antes, "servidor do site congelado ficou aberto depois do launch falho");
    assert.match(r.erro, /^O navegador headless .* não conseguiu abrir nesta máquina/);
    assert.match(r.erro, /clique em Recalcular de novo/);
    assert.doesNotMatch(r.erro, /\n|<launching>|browserType\.launch|--headless/, "log do Playwright vazou para a tela");
    const erro = ler(`${r.falha}/erro.json`);
    assert.equal(erro.motivo, r.erro);
    assert.match(erro.detalhe, /browserType\.launch/);
    assert.match(erro.detalhe, /exitCode=/);
    const p = await getJson(`/api/par/${C}/par-02`);
    assert.equal(p.analise.atual, "rev-002", "a versão anterior continua valendo");
    const html = (await req(`/par/${C}/par-02`)).corpo.toString("utf8");
    assert.doesNotMatch(html, /&lt;launching&gt;|browserType\.launch/);
  } finally { chromium.launch = original; }
  assert.equal(explicarExcecao(new Error("browserType.launch: Target page, context or browser has been closed\nBrowser logs:\n<process did exit: exitCode=3221225794, signal=null>")).motivo
    .includes("0xC0000142"), true);
  assert.match(explicarExcecao(new Error("browserType.launch: Executable doesn't exist at C:\\x.exe\n╔═══")).motivo, /npx playwright install chromium/);
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


// ───────────────────────────────────────────────────────────────── T8a.2: ids, avisos, porta, /guia

await teste("T8a.2: id curto (slot) visível em toda página e na URL; runId só no detalhe; fila cega sem ids", async () => {
  const v = await getJson("/api/execucoes");
  const home = (await req("/")).corpo.toString("utf8");
  for (const x of v.execucoes) {
    assert.ok(x.id && x.id.length < x.chave.length, `${x.chave} sem id curto`);
    assert.equal(x.id, x.slot, "o id curto é o slot quando o slot é legível");
    assert.ok(home.includes(`>${x.id}</a>`), `id ${x.id} fora da página inicial`);
    const r = await req(x.url);
    assert.equal(r.status, 200, x.url);
    const html = r.corpo.toString("utf8");
    assert.match(html, new RegExp(`<h1><span class="id">${x.id}</span></h1>`), `${x.url} sem o id no título`);
    assert.ok(html.includes(x.chave), "o runId completo continua na página da execução (detalhe)");
  }
  assert.equal((await req(`/execucao/fixture-analise-run-sem-02`)).status, 200, "a URL antiga (runId) continua valendo");
  assert.equal((await req(`/execucao/${C}/slot-99`)).status, 404);
  const par = (await req(`/par/${C}/par-02`)).corpo.toString("utf8");
  for (const id of ["slot-04", "slot-03"]) assert.ok(par.includes(`>${id}</a>`), `par-02 sem ${id}`);
  const fila = (await req(`/revisao/${C}/par-02`)).corpo.toString("utf8");
  for (const x of v.execucoes) assert.ok(!fila.includes(x.id), `a fila cega mostrou o id ${x.id}`);
  // o resumo do topo responde às perguntas da autora pelos ids
  assert.match(home, /Falharam<\/div>\s*<div class="valor">2<\/div>[\s\S]*?slot-07[\s\S]*?0 achados \(lista vazia\)<\/div>\s*<div class="valor">1<\/div><div class="ids"><a href="[^"]+">slot-08</);
  assert.match(home, /Pares incompletos<\/div>\s*<div class="valor">2<\/div>/);
});

await teste("T8a.2: avisos são uma frase “<id>: o que aconteceu — o que fazer”, nunca stack nem log", async () => {
  // erro.json no formato antigo (antes do D-78): o motivo trazia o log do Playwright inteiro
  const quando = new Date(Date.now() + 5000).toISOString();
  const dir = join(arquivo, "analises", C, "par-04", "revisoes", "falhas", quando.replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "erro.json"), JSON.stringify({ em: quando, motivo: "browserType.launch: Target page, context or browser has been closed\nBrowser logs:\n<launching> C:\\x\\chrome.exe --headless\n    at Object.launch (C:\\x\\index.js:1:1)\n    at async analisar (x.ts:2:2)" }));
  const p = await getJson(`/api/par/${C}/par-04`);
  const a = p.analise.avisos.find((s: string) => /browserType/.test(s));
  assert.ok(a, "aviso do recálculo falho");
  assert.match(a, /^par-04: a última tentativa de recalcular, em .+, falhou — browserType\.launch: Target page, context or browser has been closed\. Os números continuam os da rev-001/);
  assert.doesNotMatch(a, /\n|<launching>|\bat Object\.|Browser logs/);
  for (const pg of ["/", `/par/${C}/par-04`, `/revisao/${C}/par-04`]) {
    const html = (await req(pg)).corpo.toString("utf8");
    assert.doesNotMatch(html, /&lt;launching&gt;|at Object\.launch|Browser logs/, `${pg} despejou log`);
  }
  const home = (await req("/")).corpo.toString("utf8");
  for (const [alvo, re] of [["slot-par-05-com", /interrompida sem pacote/], ["slot-07", /a execução falhou/], ["slot-06", /anexo de evidências não publicado/], ["par-03", /par incompleto, falta o braço com oráculo/]] as const) {
    assert.match(home, new RegExp(`<li class="[a-z]+"><b class="alvo">${alvo}</b>: [^<]*${re.source}[^<]* — `), `aviso de ${alvo}`);
  }
  rmSync(dir, { recursive: true });
});

await teste("T8a.2: porta ocupada — outro painel recusa (diz o arquivo); com --porta ou outro programa, sobe ao lado com aviso", async () => {
  const { abrirPainel, quemOcupa, PortaRecusada } = await import("./painel/servidor");
  const ocupante = await quemOcupa(porta);
  assert.deepEqual(ocupante && ocupante.painel && ocupante.arquivo, arquivo);
  await assert.rejects(abrirPainel({ arquivo, porta, portaExplicita: false }), (e: Error) => e instanceof PortaRecusada && e.message.includes(arquivo) && /--porta/.test(e.message));
  const lado = await abrirPainel({ arquivo, porta, portaExplicita: true });
  try {
    assert.notEqual(lado.porta, porta);
    assert.match(lado.aviso!.join("\n"), new RegExp(`porta ${porta} está ocupada por outro painel[\\s\\S]*http://127\\.0\\.0\\.1:${lado.porta}/`));
  } finally { lado.servidor.close(); }
  const { createServer } = await import("node:http");
  const outro = createServer((_q, s) => { s.end("outra coisa"); });
  const pOutro = await escutar(outro, 0);
  try {
    const r = await abrirPainel({ arquivo, porta: pOutro, portaExplicita: false });
    r.servidor.close();
    assert.notEqual(r.porta, pOutro);
    assert.match(r.aviso!.join("\n"), /ocupada por outro programa/);
  } finally { outro.close(); }
  const vazio = createServer();
  const livre = await escutar(vazio, 0);
  vazio.close();
  assert.equal(await quemOcupa(livre), null, "porta livre não tem ocupante");
});

await teste("T8a.2: /guia servido sem rede — reveal.js de node_modules (versão fixada), 3 diagramas SVG dos arquivos de docs/diagramas", async () => {
  const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
  assert.match(pkg.dependencies["reveal.js"] ?? pkg.devDependencies?.["reveal.js"], /^\d+\.\d+\.\d+$/, "reveal.js com versão exata");
  const r = await req("/guia");
  assert.equal(r.status, 200);
  const html = r.corpo.toString("utf8");
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]*)"/g)].map(m => m[1]);
  assert.ok(refs.length > 3);
  for (const ref of refs) assert.match(ref, /^(\/(?!\/)|#)/, `referência externa no /guia: ${ref}`);
  assert.doesNotMatch(html, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/, "nenhum endereço de rede no /guia");
  const { DIAGRAMAS } = await import("./painel/servidor");
  assert.equal(DIAGRAMAS.length, 3);
  for (const d of DIAGRAMAS) {
    const svg = readFileSync(join(import.meta.dirname, "..", "docs", "diagramas", d.arquivo), "utf8");
    assert.ok(html.includes(svg.trim().slice(0, 120)), `${d.arquivo} não está inline no /guia`);
  }
  const js = await req("/guia/reveal/reveal.js");
  assert.equal(js.status, 200);
  assert.match(js.tipo, /javascript/);
  assert.match(js.corpo.toString("utf8", 0, 400), /reveal\.js/);
  assert.equal((await req("/guia/reveal/reveal.css")).status, 200);
  for (const p of ["/guia/reveal/package.json", "/guia/reveal/plugin/notes.js", "/guia/reveal/..%2fpackage.json", "/guia/diagramas/x.svg", "/guia/reveal/dist/reveal.js"]) {
    assert.equal((await req(p)).status, 404, p);
  }
  const css = await req("/estilo.css");
  assert.equal(css.status, 200);
  assert.match(css.tipo, /text\/css/);
});

await teste("T8a.2: entradas de ensaio não fazem o arquivo inteiro virar FIXTURE; campanha piloto é rotulada calibração", async () => {
  const { ehFixture, infoCampanha } = await import("./painel/modelo");
  const sem = join(TMP, "sem-marcador");
  mkdirSync(join(sem, "campanhas", "piloto-x"), { recursive: true });
  assert.equal(ehFixture(sem, [{ entrada: { natureza: "ensaio" } as never, arquivoEntrada: "x", erro: null }]), false);
  writeFileSync(join(sem, "campanhas", "piloto-x", "campaign.json"), JSON.stringify({ kind: "pilot", fixture: false, title: "t", design: { arms: ["com"] } }));
  const c = infoCampanha(sem, "piloto-x", ["formal"]);
  assert.equal(c.natureza, "calibracao");
  assert.match(c.rotulo, /calibração \(D-67\).*não é resultado/);
  assert.deepEqual(c.bracos, ["com"]);
});

// ───────────────────────────────────────────────────────────────── T8a.1: primeira análise de um arquivo do T4

// Arquivo montado pelo MESMO código do job arquivar (arquivarExecucao), sem análise nenhuma; os anexos
// da "Release" ficam fora dele. O painel procura anexos numa pasta que começa vazia.
// Vistorias (tela B, referência que navega) entra quando o clone do govbr-telas está ao lado (só lido).
const TELAS_CLONE = join(ROOT, "..", "govbr-telas");
const VISTORIAS = existsSync(join(TELAS_CLONE, "site-manifest.json"));
if (!VISTORIAS) console.log(`PULADO par Vistorias: ${TELAS_CLONE} ausente (clone o govbr-telas ao lado do govbr-eval)`);
const t4 = construirArquivoT4(join(TMP, "arquivo-t4"), { vistorias: VISTORIAS ? TELAS_CLONE : null });
const anexosPainel = join(TMP, "anexos-baixados");
mkdirSync(anexosPainel, { recursive: true });
const servidorT4: Server = criarPainel({ arquivo: t4.arquivo, revisora: "", anexos: [anexosPainel], baixarAnexos: false });
const portaT4 = await escutar(servidorT4, 0);
const reqT4 = (caminho: string, o: { metodo?: string; corpo?: string } = {}): Promise<{ status: number; corpo: Buffer; tipo: string }> => new Promise((ok, falha) => {
  const r = request({ host: "127.0.0.1", port: portaT4, path: caminho, method: o.metodo ?? "GET",
    headers: { host: `127.0.0.1:${portaT4}`, ...(o.corpo ? { "content-type": "application/json" } : {}) } }, (res) => {
    const partes: Buffer[] = [];
    res.on("data", (c: Buffer) => partes.push(c));
    res.on("end", () => ok({ status: res.statusCode ?? 0, corpo: Buffer.concat(partes), tipo: String(res.headers["content-type"] ?? "") }));
  });
  r.on("error", falha);
  if (o.corpo) r.write(o.corpo);
  r.end();
});
const getT4 = async <T = any>(p: string): Promise<T> => { const r = await reqT4(p); assert.equal(r.status, 200, `${p} → ${r.status}`); return JSON.parse(r.corpo.toString("utf8")) as T; };
const prepararT4 = async (par: string): Promise<any> => JSON.parse((await reqT4(`/api/preparar/par/${C}/${par}`, { metodo: "POST", corpo: "{}" })).corpo.toString("utf8"));
const analiseT4 = (par: string) => join(t4.arquivo, "analises", C, par);
const anexoDe = (runId: string): string => readdirSync(t4.anexos).find(f => f.endsWith(`__${runId}.tar.gz`))!;

await teste("T8a.1: par do T4 sem análise aparece pronto para preparar; a tela que navega (Vistorias) também (D-98)", async () => {
  const v = await getT4("/api/execucoes");
  assert.equal(v.execucoes.length, 2 * t4.pares.length);
  assert.ok(v.execucoes.every((x: any) => x.pontuacao.estado === "sem-analise"));
  const d = v.preparo[`${C}/par-t4`];
  assert.equal(d.pode, true);
  assert.equal(d.selo.estado, "sem-analise");
  assert.deepEqual(d.execucoes, { sem: t4.pares[0].sem, com: t4.pares[0].com });
  assert.ok(!("foraDeAlcance" in d), "o estado “fora do alcance” não existe mais");
  const html = (await reqT4(`/par/${C}/par-t4`)).corpo.toString("utf8");
  assert.match(html, new RegExp(`data-preparar="/api/preparar/par/${C}/par-t4"`));
  assert.match(html, />Preparar análise</);
  assert.match((await reqT4("/")).corpo.toString("utf8"), /sem análise: pronta para preparar/);
  if (!VISTORIAS) return;
  const vist = v.preparo[`${C}/par-vist`];
  assert.equal(vist.pode, true, vist.motivo ?? "");
  assert.equal(vist.selo.estado, "sem-analise");
  const htmlVist = (await reqT4(`/par/${C}/par-vist`)).corpo.toString("utf8");
  assert.ok(!/Fora do alcance da análise/.test(htmlVist));
  assert.match(htmlVist, new RegExp(`data-preparar="/api/preparar/par/${C}/par-vist"`));
});

await teste("T8a.1: anexo ausente → falha com etapa e motivo; nada vira análise nem pacote restaurado", async () => {
  const r = await prepararT4("par-t4");
  assert.equal(r.ok, false);
  assert.equal(r.etapa, "anexo");
  assert.match(r.erro, /anexo ausente/);
  assert.ok(existsSync(join(t4.arquivo, r.falha, "erro.json")), "falha registrada no arquivo");
  assert.ok(!existsSync(join(analiseT4("par-t4"), "receita.json")), "sem receita");
  assert.ok(!existsSync(join(analiseT4("par-t4"), "revisoes")), "sem revisão");
  assert.ok(!existsSync(join(t4.arquivo, "restauracoes")) || readdirSync(join(t4.arquivo, "restauracoes")).filter(n => !n.startsWith(".")).length === 0, "nada restaurado pela metade");
  const p = await getT4(`/api/par/${C}/par-t4`);
  assert.equal(p.analise, null);
  assert.equal(p.preparo.selo.estado, "falha");
  assert.equal(p.preparo.ultimaFalha.etapa, "anexo");
  const html = (await reqT4(`/par/${C}/par-t4`)).corpo.toString("utf8");
  assert.match(html, /parou na etapa “anexo de evidências”/);
  assert.match(html, />Tentar de novo</);
  assert.ok(!/Resultado por braço/.test(html), "nada de números");
});

await teste("T8a.1: hash divergente — anexo adulterado e referência adulterada são recusados antes de qualquer número", async () => {
  // anexo com um byte trocado, no lugar onde o painel procura
  const nome = anexoDe(t4.pares[0].sem);
  const b = Buffer.from(readFileSync(join(t4.anexos, nome)));
  b[b.length - 30] ^= 0xff;
  writeFileSync(join(anexosPainel, nome), b);
  const r = await prepararT4("par-t4");
  assert.equal(r.ok, false);
  assert.equal(r.etapa, "anexo");
  assert.match(r.erro, /hash divergente/);
  rmSync(join(anexosPainel, nome));
  // referência arquivada adulterada (a da fixture sintética): para na etapa referência
  const refDir = join(t4.arquivo, "snapshots", "referencia");
  const refPath = join(refDir, readdirSync(refDir)[0], "referencia.json");
  const original = readFileSync(refPath);
  writeFileSync(refPath, Buffer.concat([original, Buffer.from(" ")]));
  try {
    const r2 = await prepararT4("par-t4");
    assert.equal(r2.ok, false);
    assert.equal(r2.etapa, "referencia");
    assert.match(r2.erro, /hash divergente/);
  } finally { writeFileSync(refPath, original); }
  assert.ok(!existsSync(join(analiseT4("par-t4"), "receita.json")));
});

await teste("T8a.1: de ponta a ponta — Preparar análise restaura, confere e cai em “aguardando revisão”", async () => {
  for (const run of [t4.pares[0].sem, t4.pares[0].com]) cpSync(join(t4.anexos, anexoDe(run)), join(anexosPainel, anexoDe(run)));
  // receita de uma preparação cujo primeiro cálculo falhou (nenhuma revisão): não bloqueia; é guardada, não apagada
  mkdirSync(analiseT4("par-t4"), { recursive: true });
  writeFileSync(join(analiseT4("par-t4"), "receita.json"), "{\"formato\":\"receita-que-nao-calculou\"}\n");
  const r = await prepararT4("par-t4");
  assert.equal(r.ok, true, r.erro);
  const guardadas = readdirSync(join(analiseT4("par-t4"), "preparacao", "receitas-sem-calculo"));
  assert.equal(guardadas.length, 1, "a receita sem cálculo vai para preparacao/receitas-sem-calculo/");
  assert.match(readFileSync(join(analiseT4("par-t4"), "preparacao", "receitas-sem-calculo", guardadas[0]), "utf8"), /receita-que-nao-calculou/);
  assert.equal(r.estado, "pronta");
  assert.match(r.revisao, /par-t4\/revisoes\/rev-001$/);
  const rc = JSON.parse(readFileSync(join(analiseT4("par-t4"), "receita.json"), "utf8"));
  assert.equal(rc.tipo, "par");
  assert.match(rc.entradas.campanha, /^campanhas\/.+\/[0-9a-f]{64}\/campaign\.json$/);
  assert.match(rc.entradas.site, /^sites\/[0-9a-f]{64}$/);
  assert.match(rc.entradas.linhaDeBase, /^linhas-de-base\/.+\/baseline\.json$/);
  for (const arm of ["sem", "com"]) {
    const pac = join(t4.arquivo, rc.pacotes[arm]);
    assert.ok(existsSync(join(pac, "evidence")), `pacote ${arm} restaurado inteiro, com evidence/`);
    const e = JSON.parse(readFileSync(join(t4.arquivo, "indice", "entradas", `${rc.execucoes[arm]}.json`), "utf8"));
    assert.equal(sha256(readFileSync(join(pac, "artifact-manifest.json"))), e.pacote.artifactManifestSha256);
  }
  const v = await getT4("/api/execucoes");
  for (const run of [t4.pares[0].sem, t4.pares[0].com]) {
    const x = v.execucoes.find((y: any) => y.chave === run);
    assert.equal(x.pontuacao.estado, "pendente");
    assert.equal(x.pontuacao.texto, "aguardando revisão");
  }
  assert.equal(v.pares.find((p: any) => p.par === "par-t4").selo.estado, "pendente");
  assert.equal(v.preparo[`${C}/par-t4`], undefined, "com análise, o botão sai");
  const fila = await getT4(`/api/fila/${C}/par-t4`);
  assert.ok(fila.cartoes.length > 0);
  assert.ok(fila.cartoes.every((c: any) => c.decisao.status === "pendente"));
  const c = fila.cartoes.find((x: any) => x.evidencias.some((ev: any) => ev.url));
  const ev = await reqT4(c.evidencias.find((x: any) => x.url).url);
  assert.equal(ev.status, 200, "evidência restaurada do anexo, servida por token");
  const p = await getT4(`/api/par/${C}/par-t4`);
  assert.equal(p.analise.atual, "rev-001");
  assert.equal(p.metricas.find((l: any) => l.rotulo.startsWith("Recall")).valores.sem.texto, "indisponível");
  const de2 = await prepararT4("par-t4");
  assert.equal(de2.ok, false, "a segunda preparação não sobrescreve a análise");
  assert.match(de2.erro, /já existe análise/);
});

await teste("T8a.1: o arquivo do T4 continua fechado — referência, site, campanha, restaurações e anexos → 404; download sem a referência", async () => {
  const rc = JSON.parse(readFileSync(join(analiseT4("par-t4"), "receita.json"), "utf8"));
  for (const p of [`/${rc.entradas.referencia}`, `/${rc.entradas.campanha}`, `/${rc.entradas.site}/site-manifest.json`, `/${rc.pacotes.sem}/run.json`,
    `/${rc.entradas.linhaDeBase}`, `/analises/${C}/par-t4/receita.json`, `/api/preparar/par/${C}/par-t4`, `/anexos/x.tar.gz`, `/coletas/${C}`]) {
    const r = await reqT4(p.replace(/ /g, "%20"));
    assert.equal(r.status, 404, `${p} → ${r.status}`);
    assert.ok(!/"_meta"|"violations"|FX-0\d/.test(r.corpo.toString("utf8")), `${p} devolveu conteúdo de referência`);
  }
  const t = await reqT4(`/baixar/analise/${C}/par-t4/rev-001.tar.gz`);
  assert.equal(t.status, 200);
  assert.ok(!lerTarGz(t.corpo).some(f => /referencia\.json$/.test(f.path)), "a referência não sai no download");
});

await teste("T8a.1: cache de restauração adulterado é refeito do anexo, nunca usado", async () => {
  // usa a lib direto sobre o par-t4 já restaurado
  const rc = JSON.parse(readFileSync(join(analiseT4("par-t4"), "receita.json"), "utf8"));
  const pac = join(t4.arquivo, rc.pacotes.sem);
  writeFileSync(join(pac, "run.json"), "{}\n");
  const { prepararAnalise } = await import("./painel/preparar");
  rmSync(analiseT4("par-t4"), { recursive: true });
  const r = await prepararAnalise(t4.arquivo, { tipo: "par", campanha: C, par: "par-t4" }, { anexos: [anexosPainel], baixar: null });
  assert.equal(r.ok, true, r.ok ? "" : r.erro);
  assert.notEqual(readFileSync(join(pac, "run.json"), "utf8"), "{}\n", "restaurado de novo do anexo");
  assert.ok(readdirSync(join(t4.arquivo, "restauracoes", rc.execucoes.sem)).some(n => n.includes(".invalido-")), "a cópia ruim fica ao lado, para inspeção");
});

await teste("T8a.1 + D-98: par Vistorias (referência que navega) — Preparar análise, fila com cenas por segmento, decisão com cena; alvo do axe em shadow root oferece B-07 (NAT-34)", async () => {
  if (!VISTORIAS) { console.log("   (pulado: sem govbr-telas)"); return; }
  const par = t4.pares.find(p => p.vistorias)!;
  for (const run of [par.sem, par.com]) cpSync(join(t4.anexos, anexoDe(run)), join(anexosPainel, anexoDe(run)));
  const r = await prepararT4("par-vist");
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.estado, "pronta");
  const pkg = JSON.parse(readFileSync(join(analiseT4("par-vist"), "revisoes", "rev-001", "revisao", "package.json"), "utf8")) as SemanticPackage;
  assert.ok(pkg.scenes.length > 1 && pkg.scenes.every(x => x.segmento), "uma cena por segmento");
  assert.equal(pkg.units.length, 102, "Vistorias 1.0.0: 102 unidades");
  const fila = await getT4(`/api/fila/${C}/par-vist`);
  assert.ok(fila.cartoes.length > 0);
  const htmlFila = (await reqT4(`/revisao/${C}/par-vist`)).corpo.toString("utf8");
  // cartão segmentado (o cabeçalho existe em todos os segmentos): sem cena é recusado; com cena, gravado
  const seg = fila.cartoes.find((c: any) => c.cenas && c.cenas.length > 1);
  assert.ok(seg, "algum cartão resolve em mais de um segmento");
  assert.match(htmlFila, /De qual cena a alegação fala/);
  const corpo = { cardId: seg.id, decisao: "incorreta", justificativa: "teste (fixture)", consultado: ["cartão"], revisora: "Revisora Teste", base: fila.versaoDecisoes };
  const semCena = JSON.parse((await reqT4(`/api/decisao/${C}/par-vist`, { metodo: "POST", corpo: JSON.stringify(corpo) })).corpo.toString("utf8"));
  assert.equal(semCena.ok, false);
  assert.match(semCena.erro, /escolha de qual cena/);
  const comCena = JSON.parse((await reqT4(`/api/decisao/${C}/par-vist`, { metodo: "POST", corpo: JSON.stringify({ ...corpo, cena: seg.cenas[0].id }) })).corpo.toString("utf8"));
  assert.equal(comCena.ok, true, comCena.erro);
  // linha de base 2.2.0: o nó do axe dentro do shadow root do br-button resolve e oferece B-07; a decisão credita
  const olho = fila.cartoes.find((c: any) => c.origem === "linha de base determinística" && c.candidatas.some((u: any) => u.specId === "B-07"));
  assert.ok(olho, "cartão do axe (button-name em shadow root) com B-07 candidata");
  const b07 = olho.candidatas.find((u: any) => u.specId === "B-07").id;
  const dec = JSON.parse((await reqT4(`/api/decisao/${C}/par-vist`, { metodo: "POST", corpo: JSON.stringify({ cardId: olho.id, decisao: "defeito-do-gabarito",
    unitIds: [b07], ...(olho.cenas ? { cena: olho.cenas.find((o: any) => o.candidatas.includes(b07)).id } : {}),
    justificativa: "teste (fixture)", consultado: ["cartão"], revisora: "Revisora Teste", base: comCena.versao }) })).corpo.toString("utf8"));
  assert.equal(dec.ok, true, dec.erro);
  const depois = await getT4(`/api/fila/${C}/par-vist`);
  assert.equal(depois.cartoes.find((c: any) => c.id === seg.id).decisao.cena, seg.cenas[0].id);
  const re = await recalcular(t4.arquivo, C, "par-vist");
  assert.equal(re.ok, true, re.ok ? "" : re.erro);
  console.log(`   Vistorias no painel: ${pkg.scenes.length} cenas, ${fila.cartoes.length} cartões, ${fila.cartoes.filter((c: any) => c.cenas).length} segmentado(s)`);
});

await teste("T8a.1: análise individual de uma execução (mesmo caminho, alvo = runId)", async () => {
  const run = t4.pares[0].com;
  const r = JSON.parse((await reqT4(`/api/preparar/execucao/${run}`, { metodo: "POST", corpo: "{}" })).corpo.toString("utf8"));
  assert.equal(r.ok, true, r.erro);
  assert.equal(r.analise, `${C}/${run}`);
  const rc = JSON.parse(readFileSync(join(t4.arquivo, "analises", C, run, "receita.json"), "utf8"));
  assert.equal(rc.tipo, "individual");
  assert.deepEqual(Object.keys(rc.pacotes), ["com"]);
  const s = JSON.parse(readFileSync(join(t4.arquivo, "analises", C, run, "revisoes", "rev-001", "summary.json"), "utf8"));
  assert.equal(s.execucoes.length, 1);
  assert.equal(s.execucoes[0].pontuacao.estado, "pending-review");
});


await teste("T8a.2: clone com finais de linha convertidos (core.autocrlf) — a preparação recusa com a causa e o painel avisa no topo", async () => {
  const copia = join(TMP, "arquivo-t4-crlf");
  cpSync(t4.arquivo, copia, { recursive: true, filter: (s) => !/[\\/](analises|restauracoes)([\\/]|$)/.test(s) });
  // o que o Git do Windows faz no checkout: LF → CRLF em todo arquivo de texto
  const entradas = join(copia, "indice", "entradas");
  for (const f of readdirSync(entradas)) writeFileSync(join(entradas, f), readFileSync(join(entradas, f), "utf8").replace(/\r?\n/g, "\r\n"));
  const e = JSON.parse(readFileSync(join(entradas, `${t4.pares[0].sem}.json`), "utf8"));
  const m = join(copia, e.manifestoColeta.caminho);
  writeFileSync(m, readFileSync(m, "utf8").replace(/\r?\n/g, "\r\n"));
  const { prepararAnalise, DICA_CRLF } = await import("./painel/preparar");
  const r = await prepararAnalise(copia, { tipo: "par", campanha: C, par: "par-t4" }, { anexos: [anexosPainel], baixar: null });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.etapa, "manifesto");
  assert.ok(!r.ok && r.erro.includes("hash divergente") && r.erro.includes(DICA_CRLF), !r.ok ? r.erro : "");
  const s = criarPainel({ arquivo: copia, revisora: "", baixarAnexos: false });
  const p = await escutar(s, 0);
  try {
    const html = await new Promise<string>((ok, falha) => {
      const q = request({ host: "127.0.0.1", port: p, path: "/", headers: { host: `127.0.0.1:${p}` } }, (res) => { const b: Buffer[] = []; res.on("data", (c: Buffer) => b.push(c)); res.on("end", () => ok(Buffer.concat(b).toString("utf8"))); });
      q.on("error", falha); q.end();
    });
    assert.match(html, /<b class="alvo">arquivo<\/b>: o Git desta máquina trocou os finais de linha do clone/);
    assert.match(html, /href="\/ajuda#finais-de-linha"/);
  } finally { s.close(); }
});

servidorT4.close();

// ───────────────────────────────────────────────────────────────── ids sorteados pela página (piloto-01, par-01)
// A tela real (br-select do DS) sorteia ids a cada carga; o sceneHash cru mudava todos os ids de cartão
// a cada Recalcular e as decisões gravadas ficavam órfãs. Arquivo separado: a página sorteia um id.

const arquivoIds = join(TMP, "arquivo-ids");
await construirArquivoFixture(arquivoIds, { idsGerados: true });
const lerIds = (rel: string): any => JSON.parse(readFileSync(join(arquivoIds, rel), "utf8"));
const idsDe = (par: string, rev: string): string[] => (lerIds(`${revDir(par, rev)}/revisao/package.json`) as SemanticPackage).cards.map(c => c.id).sort();
const decidir = (par: string, c: SemanticPackage["cards"][number], base: number) => salvarDecisao(arquivoIds, C, par, {
  cardId: c.id, decisao: c.candidateUnitIds.length ? "defeito-do-gabarito" : /julgada incorreta/.test(c.observed ?? "") ? "incorreta" : "defeito-novo-correto",
  unitIds: c.candidateUnitIds.slice(0, 1), citacao: "supported", justificativa: "teste ids sorteados", consultado: ["cartão"], revisora: "Revisora Teste", base });

await teste("página que sorteia ids a cada carga: dois recálculos dão os mesmos cartões e as decisões sobrevivem", async () => {
  // a fixture já fez rev-001, decidiu tudo pelo painel e recalculou (rev-002); aqui, mais um Recalcular
  const r = await recalcular(arquivoIds, C, "par-01");
  assert.equal(r.ok, true, r.ok ? "" : r.erro);
  const sorteado = (rev: string) => /id="(fx-lista-\d+)"/.exec(readFileSync(join(arquivoIds, revDir("par-01", rev), "revisao", "scene-0.html"), "utf8"))?.[1];
  const ids = ["rev-001", "rev-002", "rev-003"].map(sorteado);
  assert.ok(ids.every(Boolean), "a cena capturada tem o id sorteado");
  assert.ok(new Set(ids).size > 1, `a página tem de sortear ids diferentes entre cargas (${ids.join(", ")})`);
  assert.deepEqual(idsDe("par-01", "rev-002"), idsDe("par-01", "rev-001"));
  assert.deepEqual(idsDe("par-01", "rev-003"), idsDe("par-01", "rev-001"));
  const cap = lerIds(`${revDir("par-01", "rev-003")}/revisao/capture.json`);
  assert.deepEqual(cap.scenes[0].idsGerados, [{ id: ids[2], como: "fx-lista-#g1" }]);
  assert.match(cap.sceneHashIgnora, /ausente, como texto literal/);
  assert.equal(lerIds(`${revDir("par-01", "rev-003")}/summary.json`).revisaoSemantica.pendentes, 0);
  for (const rev of ["rev-002", "rev-003"]) assert.ok(!existsSync(join(arquivoIds, revDir("par-01", rev), "revisao", "mapa-cartoes.json")), "ids iguais: nada a transpor");
  const f = vistaFila(arquivoIds, C, "par-01")!;
  assert.equal(f.pendentesAtivos, 0);
  assert.equal(f.decididos, idsDe("par-01", "rev-003").length);
});

await teste("decisões gravadas com ids do HTML cru (adaptador 1.0.0) são transpostas por corpo idêntico; corpo diferente fica pendente; gravar no pacote novo funciona", async () => {
  // rev-001 do par-02 reescrita como o adaptador 1.0.0 a gravaria: sceneHash sobre o HTML cru, ids derivados dele
  const dir = join(arquivoIds, revDir("par-02", "rev-001"), "revisao");
  const atual = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as SemanticPackage;
  const legado = structuredClone(atual);
  legado.context.sceneHash = digest({ htmlCru: readFileSync(join(dir, "scene-0.html"), "utf8") });
  legado.cards[0].description = `${legado.cards[0].description} (o que o cartão diz mudou)`;
  const novoId = new Map<string, string>();
  for (const c of legado.cards) {
    const { id, ...body } = c;
    novoId.set(id, `C-${digest({ context: legado.context, body, units: legado.units })}`);
    c.id = novoId.get(id)!;
  }
  for (const r of legado.runs) r.cardIds = r.cardIds.map(i => novoId.get(i)!);
  legado.cards.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const { packageHash: _h, ...corpo } = legado;
  legado.packageHash = digest(corpo);
  writeFileSync(join(dir, "package.json"), JSON.stringify(legado, null, 2));
  const rv = JSON.parse(readFileSync(join(dir, "reviews.json"), "utf8"));
  for (const d of rv.decisions) d.cardId = novoId.get(d.cardId);
  writeFileSync(join(dir, "reviews.json"), JSON.stringify(rv, null, 2));
  let base = 0;
  for (const c of legado.cards) {
    const r = decidir("par-02", c, base);
    assert.equal(r.ok, true, r.ok ? "" : r.erro);
    base = (r as { versao: number }).versao;
  }
  const r = await recalcular(arquivoIds, C, "par-02");
  assert.equal(r.ok, true, r.ok ? "" : r.erro);
  assert.deepEqual(idsDe("par-02", "rev-002"), atual.cards.map(c => c.id).sort(), "o pacote novo tem os ids normalizados");
  const mapa = lerIds(`${revDir("par-02", "rev-002")}/revisao/mapa-cartoes.json`);
  assert.equal(mapa.mapeados.length, legado.cards.length - 1);
  assert.ok(mapa.mapeados.every((m: any) => idsDe("par-02", "rev-002").includes(m.para) && novoId.get(atual.cards.find(c => c.id === m.para)!.id) === m.de));
  assert.deepEqual(mapa.naoMapeados.map((m: any) => m.de), [novoId.get(atual.cards[0].id)]);
  assert.match(mapa.naoMapeados[0].motivo, /mesmo corpo/);
  let f = vistaFila(arquivoIds, C, "par-02")!;
  assert.equal(f.pendentesAtivos, 1);
  assert.equal(f.decididos, legado.cards.length - 1);
  const pendente = atual.cards[0];
  assert.equal(f.cartoes.find(c => c.id === pendente.id)!.decisao.status, "pendente");
  // antes: "cartão fora das decisões deste pacote" (o último arquivo de decisões era do pacote legado)
  const g = decidir("par-02", pendente, f.versaoDecisoes);
  assert.equal(g.ok, true, g.ok ? "" : g.erro);
  f = vistaFila(arquivoIds, C, "par-02")!;
  assert.equal(f.pendentesAtivos, 0);
  const r3 = await recalcular(arquivoIds, C, "par-02");
  assert.equal(r3.ok, true, r3.ok ? "" : r3.erro);
  assert.deepEqual(idsDe("par-02", "rev-003"), idsDe("par-02", "rev-002"));
  assert.ok(!existsSync(join(arquivoIds, revDir("par-02", "rev-003"), "revisao", "mapa-cartoes.json")));
  assert.equal(lerIds(`${revDir("par-02", "rev-003")}/summary.json`).revisaoSemantica.pendentes, 0);
  assert.equal(lerIds(`${revDir("par-02", "rev-003")}/summary.json`).comparacao.estado, "final");
});

// ───────────────────────────────────────────────────────────────── NAT-58: resultados de relance

await teste("NAT-58: RESULTADOS.md (POST /api/resumo e CLI) — números só do summary.json atual, selos, fontes, nada da referência, determinístico", async () => {
  // mesmas regras dos outros POSTs
  assert.equal((await req("/api/resumo", { metodo: "POST", corpo: "{}", cab: { origin: "http://evil.example" } })).status, 403);
  assert.equal((await req("/api/resumo", { metodo: "POST", corpo: "x", cab: { "content-type": "text/plain" } })).status, 415);
  assert.ok(!existsSync(join(arquivo, "RESULTADOS.md")), "POST recusado não grava");
  const r = await postJson<{ ok: boolean; arquivo: string; campanhas: number }>("/api/resumo", {});
  assert.ok(r.ok && r.arquivo === "RESULTADOS.md" && r.campanhas === 1, JSON.stringify(r));
  const md = readFileSync(join(arquivo, "RESULTADOS.md"), "utf8");
  assert.match(md, /^# Resultados de relance\n/);
  assert.match(md, /FIXTURE SINTÉTICA/);
  assert.match(md, new RegExp(`## ${C} — ensaio — não é dado científico`));
  // cada par com análise: a linha usa a revisão ATUAL e os números são os do summary.json dela
  const pares = ["par-01", "par-02", "par-03", "par-04", "par-05"];
  for (const par of pares) {
    const linha = md.split("\n").find(l => l.startsWith(`| ${par} |`));
    assert.ok(linha, `linha do ${par}`);
    const an = lerAnalise(arquivo, C, par);
    if (!an?.atual || an.atual.resumo.analise.estado !== "pronta") { assert.match(linha!, /\*\*(sem análise|um braço só)/, `${par} sem análise`); continue; }
    const s = ler(`${an.atual.rel}/summary.json`);
    assert.ok(md.includes(`- ${par}: \`${an.atual.rel}/summary.json\``), `fonte do ${par} = revisão atual ${an.atual.nome}`);
    for (const e of s.execucoes) {
      const m = e.pontuacao.metricas;
      if (m.confirmedReferenceUnits !== null) assert.ok(linha!.includes(`${m.confirmedReferenceUnits}/${m.referenceUnits}`), `${par} ${e.braco}: ${linha}`);
    }
    const c = s.comparacao;
    if (c?.disponivel && c.estado === "final") assert.match(linha!, /\*\*FINAL\*\* \|$/);
    else if (c?.disponivel) assert.match(linha!, new RegExp(`\\*\\*PROVISÓRIO com ${s.revisaoSemantica.pendentes} cart`));
  }
  // linha da campanha: soma só dos FINAIS, com n
  const finais = pares.map(p => lerAnalise(arquivo, C, p)?.atual).filter(rv => rv && rv.resumo.comparacao?.disponivel && rv.resumo.comparacao.estado === "final");
  assert.ok(md.includes(`Pares finais: **${finais.length} de 5**`), md.split("\n").find(l => l.startsWith("Pares finais")));
  if (finais.length) {
    const soma = (arm: string) => finais.reduce((n, rv) => n + rv!.resumo.execucoes.find(e => e.braco === arm)!.pontuacao.metricas.confirmedReferenceUnits!, 0);
    assert.ok(md.includes(`(n = ${finais.length}): **sem ${soma("sem")} · com ${soma("com")}**`));
  }
  // nada da referência, de cartão ou de seletor
  const ref = JSON.parse(readFileSync(join(process.cwd(), "scripts", "fixtures", "analise", "referencia-fixture.json"), "utf8"));
  for (const v of ref.violations) for (const t of [v.description, v.anchor, ...v.rules]) assert.ok(!md.includes(t), `texto da referência no RESULTADOS.md: ${t}`);
  assert.ok(!/#fx-|selector|seletor:|fixture:campo/.test(md));
  const pkg = JSON.parse(readFileSync(join(arquivo, revDir("par-02", lerAnalise(arquivo, C, "par-02")!.atual!.nome), "revisao", "package.json"), "utf8")) as SemanticPackage;
  for (const card of pkg.cards) for (const t of [card.selector, card.description, card.observed]) if (t && t.length > 8) assert.ok(!md.includes(t), `texto ou seletor de cartão no RESULTADOS.md: ${t}`);
  // determinístico: mesma entrada → mesmos bytes, menos a linha da data; a CLI grava o mesmo
  const { gerarResultados, LINHA_DATA } = await import("./painel/resultados");
  const semData = (t: string) => t.replace(LINHA_DATA, "Gerado em: —");
  assert.equal(semData(gerarResultados(arquivo, new Date("2020-01-01T00:00:00Z"))), semData(md));
  assert.equal(gerarResultados(arquivo, new Date("2020-01-01T00:00:00Z")), gerarResultados(arquivo, new Date("2020-01-01T00:00:00Z")));
  const { execFileSync } = await import("node:child_process");
  rmSync(join(arquivo, "RESULTADOS.md"));
  execFileSync(process.execPath, ["--import", "tsx", join("scripts", "painel", "servidor.ts"), "resumo", "--arquivo", arquivo], { cwd: process.cwd(), stdio: "pipe" });
  assert.equal(semData(readFileSync(join(arquivo, "RESULTADOS.md"), "utf8")), semData(md), "CLI = botão");
});

await teste("NAT-58: placar no topo da página inicial — com × sem dos finais (n dito), selos por par, o que falta, botão", async () => {
  const html = (await req("/")).corpo.toString("utf8");
  const i = html.indexOf('id="t-placar"');
  assert.ok(i > 0 && i < html.indexOf('class="tiles"'), "o placar vem antes dos quadros");
  const placar = html.slice(i, html.indexOf("</section>", i));
  assert.match(placar, /unidades da referência confirmadas · <strong>pares finais: \d+ de 5<\/strong>/);
  assert.match(placar, /class="n com">com <b>\d+<\/b>[\s\S]*class="n sem">sem <b>\d+<\/b>/);
  assert.match(placar, /O que falta/);
  assert.match(placar, /par-03<\/a>: falta o braço com/);
  assert.match(placar, /par-05<\/a>: falta o braço sem/);
  assert.match(placar, /par-04<\/a>: comparação indisponível/);
  assert.match(placar, /data-resumo>Atualizar RESULTADOS.md<\/button>/);
  assert.ok(!/#fx-|Defeito sintético/.test(placar), "nada da referência no placar");
});

await teste("camada de página (D-83): par e RESULTADOS.md mostram sorteadas × página só quando a referência tem P-*", async () => {
  // referência sem P-* (o arquivo principal): nada muda
  assert.doesNotMatch((await req(`/par/${C}/par-01`)).corpo.toString("utf8"), /Sorteadas × página/);
  assert.doesNotMatch(readFileSync(join(arquivo, "RESULTADOS.md"), "utf8"), /sorteadas × página/);
  // referência com P-01: FX-01/02 → A-01/02, FX-03 → P-01
  const arqCamada = join(TMP, "arquivo-camada");
  await construirArquivoFixture(arqCamada, { camadaPagina: true });
  const rv = lerAnalise(arqCamada, C, "par-01")!.atual!;
  const camadas = Object.fromEntries(rv.resumo.execucoes.map(e => [e.braco, e.pontuacao.camadas!]));
  for (const c of Object.values(camadas)) { assert.equal(c.sorteadas.total, 2); assert.equal(c.pagina.total, 1); }
  const srv: Server = criarPainel({ arquivo: arqCamada, revisora: "" });
  const pt = await escutar(srv, 0);
  try {
    const html = await (await fetch(`http://127.0.0.1:${pt}/par/${C}/par-01`)).text();
    const final = rv.resumo.comparacao?.estado === "final";
    for (const c of Object.values(camadas)) {
      const t = (x: typeof c.sorteadas) => `${x.prefixo}*: ${x.confirmadas} de ${x.total}${final ? "" : " até agora"} · recall `;
      assert.ok(html.includes(`Sorteadas × página: ${t(c.sorteadas)}`), "camada sorteada no cartão do braço");
      assert.ok(html.includes(` × ${t(c.pagina)}`), "camada de página no cartão do braço");
    }
  } finally { srv.close(); }
  const { gerarResultados } = await import("./painel/resultados");
  const md = gerarResultados(arqCamada, new Date("2020-01-01T00:00:00Z"));
  const linha = md.split("\n").find(l => l.startsWith("| par-01 |"))!;
  for (const c of Object.values(camadas)) assert.ok(linha.includes(`sorteadas × página: A-\\* ${c.sorteadas.confirmadas}/2`) && linha.includes(` × P-\\* ${c.pagina.confirmadas}/1`), linha);
  assert.ok(!/#fx-|Defeito sintético/.test(md), "nada além de números e prefixos");
});

// ───────────────────────────────────────────────────────────────── NAT-60: ids de regra do oráculo mascarados na fila

await teste("fila cega mascara ids de regra do oráculo (ds-*, ds:*, govbr-<versão>-*) só na vista; wcag fica; pacote e .tar.gz intactos", async () => {
  const arqM = join(TMP, "arquivo-mascara");
  cpSync(arquivo, arqM, { recursive: true });
  const rv = lerAnalise(arqM, C, "par-02")!.atual!;
  const pkgPath = join(rv.dir, "revisao", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as SemanticPackage;
  const alvo = pkg.cards.find(c => c.contract === "achado-2")!;
  alvo.rule = "ds-page-footer";
  alvo.observed = "Rodapé fora do padrão (govbr-3.7.0-x); ver também ds:page-header.";
  alvo.expected = "Rodapé conforme wcag:2.4.3 e WCAG 2.4.3.";
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  const bytes = readFileSync(pkgPath);
  const s = criarPainel({ arquivo: arqM, revisora: "" });
  const pM = await escutar(s, 0);
  const get = (caminho: string): Promise<{ status: number; corpo: Buffer }> => new Promise((ok, falha) => {
    request({ host: "127.0.0.1", port: pM, path: caminho }, r => { const b: Buffer[] = []; r.on("data", d => b.push(d)); r.on("end", () => ok({ status: r.statusCode!, corpo: Buffer.concat(b) })); }).on("error", falha).end();
  });
  try {
    const html = (await get(`/revisao/${C}/par-02`)).corpo.toString("utf8");
    const api = (await get(`/api/fila/${C}/par-02`)).corpo.toString("utf8");
    for (const t of [html, api]) {
      for (const proibido of ["ds-page-footer", "govbr-3.7.0", "ds:page-header"]) assert.ok(!t.includes(proibido), `vazou ${proibido}`);
      assert.ok(t.includes("wcag:2.4.3") && t.includes("WCAG 2.4.3"), "referência pública fica visível");
    }
    assert.match(html, /<pre>\[regra citada\]<\/pre>/, "coluna da regra mascarada");
    assert.match(html, /Rodapé fora do padrão \(\[regra citada\]\); ver também \[regra citada\]\./);
    const f = JSON.parse(api);
    assert.equal(f.mascara.citavam, 1);
    assert.equal(f.mascara.aposMascara, 0);
    assert.match(html, /1 cartão\(ões\) citavam ids de regra do oráculo; mascarados/);
    assert.deepEqual(readFileSync(pkgPath), bytes, "o pacote não é tocado pela vista");
    // o .tar.gz é o registro (fica na página do par, fora da fila cega): leva o texto original
    const tar = await get(`/baixar/analise/${C}/par-02/${rv.nome}.tar.gz`);
    assert.equal(tar.status, 200);
    const noTar = lerTarGz(tar.corpo).find(x => x.path.endsWith("/revisao/package.json"))!;
    assert.deepEqual(noTar.body, bytes);
    assert.ok(!/\/baixar\//.test(html), "a fila não linka o download");
  } finally { s.close(); }
});

// ───────────────────────────────────────────────────────────────── NAT-61: trio sem/ferramentas/com

await teste("NAT-61: trio — três colunas, as três comparações com o seu n, grupo incompleto só na principal, perfil medido no cartão de saúde, máscara com × ferramentas", async () => {
  const arqT = join(TMP, "arquivo-trio");
  await construirArquivoFixture(arqT, { trio: true });
  const { vistaExecucoes, vistaPar, vistaExecucao, placarDaCampanha } = await import("./painel/modelo");
  const v = vistaExecucoes(arqT);
  const p1 = v.pares.find(p => p.par === "par-01")!, p2 = v.pares.find(p => p.par === "par-02")!;
  assert.deepEqual(p1.bracos, ["sem", "ferramentas", "com"]);
  assert.deepEqual(p1.faltando, []);
  assert.equal(p1.selo.estado, "final", p1.selo.texto);
  assert.deepEqual(p2.faltando, ["sem"]);
  assert.equal(p2.porDesenho, false);
  assert.match(p2.selo.texto, /grupo incompleto: falta o braço sem/);
  // par-01 decidido (final): as três comparações com n = 1; par-02 (sem o sem) só a principal
  const cs1 = new Map(p1.resultado!.comparacoes!.map(c => [c.id, c]));
  assert.ok(["ferramentas-com", "sem-ferramentas", "sem-com"].every(id => cs1.get(id)!.n === 1 && cs1.get(id)!.estado === "final"));
  const an2 = lerAnalise(arqT, C, "par-02")!.atual!;
  const cs2 = new Map(an2.resumo.comparacoes!.map(c => [c.id, c]));
  assert.equal(cs2.get("ferramentas-com")!.n, 1);
  assert.equal(cs2.get("sem-com")!.n, 0);
  assert.equal(an2.resumo.comparacao, null);
  // placar: cada comparação com o SEU n (grupos em que está final)
  const pl = placarDaCampanha(v.campanhas.find(c => c.id === C)!, v.pares);
  const n = Object.fromEntries(pl.comparacoes!.map(c => [c.id, c.n]));
  assert.equal(pl.comparacoes![0].id, "ferramentas-com", "a principal primeiro");
  assert.equal(n["sem-com"], 1);
  assert.ok(n["ferramentas-com"] >= 1);
  assert.equal(typeof pl.somaFerramentas, "number");
  // página do par: três colunas e a tabela de comparações
  const vp = vistaPar(arqT, C, "par-01")!;
  assert.equal(vp.comparacoes!.length, 3);
  const srv: Server = criarPainel({ arquivo: arqT, revisora: "" });
  const pt = await escutar(srv, 0);
  try {
    const html = await (await fetch(`http://127.0.0.1:${pt}/par/${C}/par-01`)).text();
    assert.ok(html.includes("<h2>Comparações do grupo</h2>"));
    for (const rot of ["Sem oráculo", "Com oráculo", "Ferramentas (sem conhecimento)"]) assert.ok(html.includes(rot), rot);
    assert.ok(html.includes("<strong>principal</strong>"));
    const html2 = await (await fetch(`http://127.0.0.1:${pt}/par/${C}/par-02`)).text();
    assert.ok(html2.includes("falta o braço sem oráculo") || html2.includes("falta o braço sem"), "grupo incompleto declarado");
    // cartão de saúde: perfil MEDIDO e ferramentas efetivas (run.v2), nunca o rótulo do braço
    const runF = vp.bracos.ferramentas![0].chave;
    const ve = vistaExecucao(arqT, runF)!;
    const perfil = ve.isolamento.find(l => l.rotulo === "Perfil do oráculo (medido)")!;
    assert.equal(perfil.valor.texto, "knowledge-free");
    assert.equal(ve.isolamento.find(l => l.rotulo === "Ferramentas efetivas do oráculo")!.valor.texto, "get_finding_details, scan_page, verify_finding (tools/list 72abd54968cb)");
    // fila cega do trio: o que só o com tem (get_ds_rules, id da base) é mascarado e contado
    const fila = vistaFila(arqT, C, "par-01")!;
    assert.equal(fila.mascara.comFerramentas!.citavam, 1);
    assert.equal(fila.mascara.comFerramentas!.aposMascara, 0);
    assert.ok(!JSON.stringify(fila.cartoes).includes("get_ds_rules"), "ferramenta retirada mascarada na vista");
  } finally { srv.close(); }
  const { gerarResultados } = await import("./painel/resultados");
  const mdT = gerarResultados(arqT, new Date("2020-01-01T00:00:00Z"));
  assert.ok(mdT.includes("com − ferramentas (principal): n = "), "RESULTADOS.md com cada comparação e o seu n");
  assert.ok(!/get_ds_rules|#fx-/.test(mdT), "só números");
  // par v1 do arquivo principal: nada disso aparece
  const v1 = vistaFila(arquivo, C, "par-02")!;
  assert.equal("comFerramentas" in v1.mascara, false);
});

// ───────────────────────────────────────────────────────────────── NAT-72: partes e vínculo de revisão pela API
const arquivoNat72 = join(TMP, "arquivo-nat72");
await construirArquivoFixture(arquivoNat72);
await teste("NAT-72: fila cega oferece as outras unidades da cena; API grava partes e vínculo assinados, numa decisão versionada", async () => {
  const f0 = vistaFila(arquivoNat72, C, "par-02")!;
  const pkg = JSON.parse(readFileSync(join(arquivoNat72, revDir("par-02", "rev-001"), "revisao", "package.json"), "utf8")) as SemanticPackage;
  const unidade = (spec: string) => pkg.units.find(u => u.specId === spec)!;
  // Card about <p>: correct claim with no candidate. The other units of the scene are searchable, not credited.
  // Escolhido pelo sujeito, não pela posição: os ids dos cartões são hashes (mudam com o scorer), e o cartão
  // do <h1> fica para o teste da página abaixo — decidido aqui, ele sairia da fila visível.
  const p = pkg.cards.find(c => c.origin === "agente" && c.candidateUnitIds.length === 0 && !/h1/.test(c.subjects[0].key ?? ""))!;
  const vp = f0.cartoes.find(c => c.id === p.id)!;
  assert.equal(vp.aceitaVinculo, true);
  assert.deepEqual(vp.unidadesDaCena.map(u => u.specId).sort(), pkg.units.map(u => u.specId).sort());
  // Blind: the view still carries no arm, run id or evidence path, and the order does not follow the arm.
  const texto = JSON.stringify(f0.cartoes);
  for (const proibido of ["fixture-analise-run-", "sem-01.png", "com-01.png", "reportedEvidence", "\"sem\"", "\"com\"", "pacote:", "runScope"]) {
    assert.ok(!texto.includes(proibido), `vazou ${proibido}`);
  }
  const ordem = [...pkg.cards].sort((a, b) => a.scene.localeCompare(b.scene) || (a.rule ?? "~").localeCompare(b.rule ?? "~") ||
    (a.subjects[0]?.key ?? "").localeCompare(b.subjects[0]?.key ?? "") || a.id.localeCompare(b.id)).map(c => c.id);
  assert.deepEqual(f0.cartoes.map(c => c.id), ordem, "ordem por cena/regra/elemento/id, nunca por braço");

  const fx03 = unidade("FX-03");
  const base = { cardId: p.id, justificativa: "o parágrafo é a instrução do link FX-03", consultado: ["cartão", "medição"], revisora: "Revisora Teste" };
  const semVinculo = salvarDecisao(arquivoNat72, C, "par-02", { ...base, decisao: "defeito-do-gabarito", unitIds: [fx03.id], base: 0 });
  assert.equal(semVinculo.ok, false);
  assert.match((semVinculo as { erro: string }).erro, /COM vínculo de revisão/);
  const vinculo = { unitId: fx03.id, relacao: "participante-relacionado", estado: fx03.state, evidencia: `DOM: p descreve o link ${fx03.participants[0]}; aria-describedby ausente`,
    justificativa: "o parágrafo é o texto que o link deveria referenciar" };
  for (const [mudar, re] of [[{ relacao: "" }, /relação/], [{ evidencia: " " }, /evidência/], [{ justificativa: "" }, /justificativa/],
    [{ estado: "outro-estado" }, /estado/], [{ unitId: "U-inventada" }, /não existe/]] as const) {
    const r = salvarDecisao(arquivoNat72, C, "par-02", { ...base, decisao: "defeito-do-gabarito", unitIds: [fx03.id], vinculos: [{ ...vinculo, ...mudar }], base: 0 });
    assert.equal(r.ok, false); assert.match((r as { erro: string }).erro, re);
  }
  const decDir72 = join(arquivoNat72, "analises", C, "par-02", "decisoes");
  assert.ok(!existsSync(decDir72), "nada gravado nas recusas");
  const ok = salvarDecisao(arquivoNat72, C, "par-02", { ...base, decisao: "defeito-do-gabarito", unitIds: [fx03.id], vinculos: [vinculo], base: 0 });
  assert.equal(ok.ok, true, (ok as { erro?: string }).erro);
  const d1 = JSON.parse(readFileSync(join(decDir72, "decisoes-0001.json"), "utf8"));
  assert.equal(d1._painel.formato, "decisoes-painel-1.1.0");
  assert.equal(d1._painel.vinculos, 1);
  const link = d1.decisions.find((d: any) => d.cardId === p.id).atoms[0].links[0];
  assert.deepEqual({ ...link, evidence: undefined }, { contrato: "vinculo-revisao-1.0.0", unitId: fx03.id, subjects: [p.subjects[0].id], scene: p.scene,
    state: fx03.state, relation: "participante-relacionado", evidence: undefined, justification: vinculo.justificativa, reviewer: "Revisora Teste",
    binding: { build: p.binding.build, runScope: p.binding.runScope, card: cartaoDoVinculo(p) } });

  // One linked element cannot be split into several reference parts to reach several units.
  const fx02 = unidade("FX-02");
  const multi = salvarDecisao(arquivoNat72, C, "par-02", { ...base, base: 1, atomos: [
    { texto: "a", sujeitos: [p.subjects[0].id], decisao: "defeito-do-gabarito", unitIds: [fx03.id], vinculos: [vinculo] },
    { texto: "b", sujeitos: [p.subjects[0].id], decisao: "defeito-do-gabarito", unitIds: [fx02.id],
      vinculos: [{ ...vinculo, unitId: fx02.id, evidencia: `cita ${fx02.participants[0]}` }] }] });
  assert.equal(multi.ok, false); assert.match((multi as { erro: string }).erro, /só pode estar em uma parte/);
  // Decomposition: no subject is assigned by omission; each part names its own elements.
  const campo = pkg.cards.find(c => c.origin === "agente" && c.candidateUnitIds.length === 1)!;
  const sujeito = campo.subjects[0].id;
  const fx01 = campo.candidateUnitIds[0];
  const pb = { cardId: campo.id, justificativa: "campo sem rótulo; a parte do aviso é falsa", consultado: ["cartão"], revisora: "Revisora Teste" };
  const semSujeito = salvarDecisao(arquivoNat72, C, "par-02", { ...pb, atomos: [{ texto: "sem rótulo", sujeitos: [], decisao: "defeito-do-gabarito", unitIds: [fx01] }], base: 1 });
  assert.equal(semSujeito.ok, false); assert.match((semSujeito as { erro: string }).erro, /nenhum é atribuído por omissão/);
  const ambos = salvarDecisao(arquivoNat72, C, "par-02", { ...pb, decisao: "incorreta", atomos: [], base: 1 });
  assert.equal(ambos.ok, false); assert.match((ambos as { erro: string }).erro, /OU as partes/);
  const partes = salvarDecisao(arquivoNat72, C, "par-02", { ...pb, base: 1, atomos: [
    { texto: "o campo não tem rótulo", sujeitos: [sujeito], decisao: "defeito-do-gabarito", unitIds: [fx01], citacao: "supported" },
    { texto: "e toca música", sujeitos: [sujeito], decisao: "incorreta", citacao: "unsupported" }] });
  assert.equal(partes.ok, true, (partes as { erro?: string }).erro);
  const d2 = JSON.parse(readFileSync(join(decDir72, "decisoes-0002.json"), "utf8"));
  assert.equal(d2._painel.partes, 2);
  assert.match(d2._painel.decisao, /^partes: defeito-do-gabarito \+ incorreta$/);
  assert.deepEqual(d2.decisions.find((d: any) => d.cardId === campo.id).atoms.map((a: any) => [a.id, a.subjects, a.decisao]),
    [["a1", [sujeito], "defeito-do-gabarito"], ["a2", [sujeito], "incorreta"]]);
  const f2 = vistaFila(arquivoNat72, C, "par-02")!;
  assert.deepEqual(f2.cartoes.find(c => c.id === campo.id)!.decisao.partes.map(x => [x.decisao, x.unidades]), // A spec vem da unidade escolhida acima (o primeiro cartão de 1 candidata depende da ordem dos ids-hash).
    [["defeito-do-gabarito", [pkg.units.find(u => u.id === fx01)!.specId]], ["incorreta", []]]);
  assert.deepEqual(f2.cartoes.find(c => c.id === p.id)!.decisao.partes[0].vinculos, ["participante-relacionado"]);
  // The page offers the decomposition and the link form.
  const html = (await req(`/revisao/${C}/par-02`)).corpo.toString("utf8");
  assert.match(html, /Decidir por partes/);
  assert.match(html, /Vínculo de revisão/);
});

await teste("NAT-72: a página (navegador headless) decide por partes e grava vínculo pelo formulário, sem erro de script", async () => {
  const s72 = criarPainel({ arquivo: arquivoNat72, revisora: "Revisora UI" });
  const p72 = await escutar(s72, 0);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const erros: string[] = [];
    page.on("pageerror", e => erros.push(String(e)));
    await page.goto(`http://127.0.0.1:${p72}/revisao/${C}/par-02`);
    const pkg = JSON.parse(readFileSync(join(arquivoNat72, revDir("par-02", "rev-001"), "revisao", "package.json"), "utf8")) as SemanticPackage;
    // h1 card: no candidate, decided by the whole-card form with another unit of the scene + link.
    const h1 = pkg.cards.find(c => c.origin === "agente" && c.candidateUnitIds.length === 0 && /h1/.test(c.subjects[0].key ?? ""))!;
    const f = page.locator(`form.decidir[data-card="${h1.id}"]`);
    await f.locator("input[value=defeito-do-gabarito]").check();
    await f.locator("details.outras summary").click();
    const fx02 = pkg.units.find(u => u.specId === "FX-02")!;
    await f.locator(`.so-gabarito input[data-vinculo][value="${fx02.id}"]`).check();
    await f.locator(".so-gabarito .vinculo [data-v=relacao]").selectOption("participante-relacionado");
    await f.locator(".so-gabarito .vinculo [data-v=estado]").selectOption(fx02.state);
    await f.locator(".so-gabarito .vinculo [data-v=evidencia]").fill(`medição: h1 rotula o botão ${fx02.participants[0]}`);
    await f.locator(".so-gabarito .vinculo [data-v=justificativa]").fill("o título é o nome que falta ao botão");
    await f.locator("textarea[name=j]").fill("correta, FX-02 por vínculo");
    await Promise.all([page.waitForEvent("load"), f.locator("button[type=submit]").click()]);
    // Composite card through the parts form.
    const campo = pkg.cards.find(c => c.origin === "agente" && c.candidateUnitIds.length === 1)!;
    const g = page.locator(`form.decidir[data-card="${campo.id}"]`);
    await page.locator("summary", { hasText: /^Já decididos/ }).click();
    await g.locator("details.decompor summary").click();
    await g.locator("[data-modo-partes]").check();
    const p1 = g.locator(".parte[data-parte='1']"), p2 = g.locator(".parte[data-parte='2']");
    await p1.locator("[data-p=texto]").fill("o campo não tem rótulo");
    await p1.locator("[data-p=sujeito]").check();
    await p1.locator("[data-p=decisao]").selectOption("defeito-do-gabarito");
    await p1.locator("[data-p=unidade]").selectOption(campo.candidateUnitIds[0]);
    await p2.locator("[data-p=texto]").fill("e o aviso some");
    await p2.locator("[data-p=sujeito]").check();
    await p2.locator("[data-p=decisao]").selectOption("incorreta");
    await g.locator("textarea[name=j]").fill("parte certa e parte falsa");
    await Promise.all([page.waitForEvent("load"), g.locator("button[type=submit]").click()]);
    assert.deepEqual(erros, []);
    const dir = join(arquivoNat72, "analises", C, "par-02", "decisoes");
    const ultimo = readdirSync(dir).sort().pop()!;
    const d = JSON.parse(readFileSync(join(dir, ultimo), "utf8"));
    const dh1 = d.decisions.find((x: any) => x.cardId === h1.id);
    assert.equal(dh1.atoms[0].links[0].relation, "participante-relacionado");
    assert.equal(dh1.atoms[0].links[0].reviewer, "Revisora UI");
    const dc = d.decisions.find((x: any) => x.cardId === campo.id);
    assert.deepEqual(dc.atoms.map((a: any) => a.decisao), ["defeito-do-gabarito", "incorreta"]);
  } finally {
    await browser.close();
    s72.close();
  }
});

await teste("hash de SCORER_FILES intacto", () => {
  assert.equal(analysisIdentity().scorerSha256, SCORER_SHA);
});

servidor.close();
if (!manter) rmSync(TMP, { recursive: true, force: true }); else console.log(`(mantido: ${TMP})`);
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} testes do painel passaram`);
process.exitCode = falhas ? 1 : 0;
