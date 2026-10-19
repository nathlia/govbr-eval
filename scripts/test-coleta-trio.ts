/**
 * Testes de scripts/coleta-trio.ts (plano de revisão da campanha nova, 19/10/2026, entrega 1). Sem modelo e sem
 * rede: o download é trocado por uma cópia local dos anexos (`Baixador` de teste), e o arquivo é o sintético do
 * T4 (`construirArquivoT4`, o mesmo código do job arquivar). Navegador headless real (a captura do analisar).
 *
 *   npm run test:coleta-trio
 *
 * Confere: (1) o CLI imprime SÓ as linhas dos sinais técnicos — nenhum texto de achado, nenhuma pontuação —,
 * grava a análise em `analises/<campanha>/<grupo>/analisar-<carimbo>/` com sinais-tecnicos.json e coleta-trio.json
 * (linha de base do primeiro slot); (2) com download (de teste), o anexo é baixado, conferido e restaurado, e a
 * segunda coleta reaproveita o cache numa pasta nova; (3) anexo baixado com sha256 diferente do índice = recusa,
 * nenhuma pasta de análise; anexo já presente e divergente = recusa sem baixar nem tocar nele; (4) regra fixa da
 * linha de base (achado E) e escolha da tentativa, sobre entradas sintéticas: a do PRIMEIRO slot na ordem da
 * agenda, nunca a de outro slot; ausência planejada; slot sem tentativa elegível; preflight recusado não conta.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AnyCampaign } from "../contracts/index";
import { ROOT } from "./adjudication";
import type { Agenda } from "./agenda-campanha";
import type { EntradaIndice } from "./arquivo-resultados";
import { RecusaColeta, coletarTrio, planoDoTrio, proximoCarimbo, type Baixador } from "./coleta-trio";
import { construirArquivoT4 } from "./painel/fixture";
import { linhasDosSinais, type Sinais } from "./sinais-tecnicos";

const TMP = mkdtempSync(join(tmpdir(), "teste-coleta-trio-"));
const resultados: { nome: string; ok: boolean }[] = [];
async function teste(nome: string, fn: () => void | Promise<void>): Promise<void> {
  try { await fn(); resultados.push({ nome, ok: true }); console.log(`ok   ${nome}`); } catch (e) {
    resultados.push({ nome, ok: false });
    console.log(`FAIL ${nome}\n     ${(e as Error).stack?.split("\n").slice(0, 4).join("\n     ")}`);
  }
}
const lerJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const semEval = join(TMP, "eval-vazio"); // raiz do govbr-eval sem campanhas/: a campanha sai só do arquivo
mkdirSync(semEval);

/** Textos que o agente escreveu nos achados (observed/expected), para provar que nada disso sai no terminal. */
function textosDeAchado(dir: string): string[] {
  const out: string[] = [];
  const andar = (v: unknown, k = ""): void => {
    if (typeof v === "string") { if (/^(observed|expected|observado|esperado)$/.test(k) && v.length >= 8) out.push(v); return; }
    if (Array.isArray(v)) v.forEach(x => andar(x, k));
    else if (v && typeof v === "object") for (const [kk, x] of Object.entries(v)) andar(x, kk);
  };
  andar(lerJson(join(dir, "findings.json")));
  return out;
}

/** Download de teste: copia o anexo da "Release" local (nunca a rede); `estragar` grava bytes trocados. */
function baixadorLocal(origem: string, chamadas: string[], estragar = false): Baixador {
  return (e, destino) => {
    chamadas.push(e.chave);
    mkdirSync(destino, { recursive: true });
    const src = join(origem, e.evidencias!.anexo!);
    if (!existsSync(src)) return { ok: false, erro: "anexo ausente da Release de teste" };
    const bytes = readFileSync(src);
    writeFileSync(join(destino, e.evidencias!.anexo!), estragar ? Buffer.concat([bytes, Buffer.from("x")]) : bytes);
    return { ok: true };
  };
}

const t4 = construirArquivoT4(join(TMP, "arquivo-t4"));
const C = t4.campanha;
const copia = (nome: string): string => {
  const d = join(TMP, nome);
  cpSync(t4.arquivo, d, { recursive: true });
  return d;
};

await teste("CLI: stdout = só as linhas dos sinais técnicos; análise na pasta da campanha; linha de base do primeiro slot gravada", () => {
  const arquivo = copia("cli");
  const r = spawnSync(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), join(ROOT, "scripts", "coleta-trio.ts"),
    "--arquivo", arquivo, "--campanha", C, "--trio", "par-t4", "--anexos", t4.anexos, "--sem-download"], { encoding: "utf8", cwd: ROOT, timeout: 300_000 });
  assert.ok(r.status === 0 || r.status === 2, `código ${r.status}: ${r.stderr}`);
  const dirTrio = join(arquivo, "analises", C, "par-t4");
  const pastas = readdirSync(dirTrio).filter(n => n.startsWith("analisar-"));
  assert.equal(pastas.length, 1);
  const saida = join(dirTrio, pastas[0]);
  assert.match(pastas[0], /^analisar-\d{8}T1$/);
  for (const f of ["summary.json", "summary.md", "score.json", "analysis-binding.sem.json", "analysis-binding.com.json", "sinais-tecnicos.json", "coleta-trio.json"]) {
    assert.ok(existsSync(join(saida, f)), `falta ${f}`);
  }
  const sinais = lerJson<Sinais>(join(saida, "sinais-tecnicos.json"));
  assert.equal(r.stdout, linhasDosSinais(sinais).join("\n") + "\n", "o stdout é exatamente o dos sinais técnicos");
  assert.equal(r.status, sinais.defeitos.length ? 2 : 0);
  const textos = readdirSync(join(arquivo, "restauracoes")).flatMap(run => readdirSync(join(arquivo, "restauracoes", run))
    .filter(p => !p.startsWith(".")).flatMap(p => textosDeAchado(join(arquivo, "restauracoes", run, p))));
  assert.ok(textos.length > 0, "a fixture tem achados com texto");
  for (const t of textos) assert.ok(!r.stdout.includes(t) && !r.stderr.includes(t), `texto de achado no terminal: ${t.slice(0, 40)}`);
  assert.ok(!/recall|precis|confirmad|summary\.md|D_fc/i.test(r.stdout), "nenhuma pontuação no stdout");
  const reg = lerJson<{ linhaDeBase: { slot: string; tipo: string; baselineId: string }; slots: { slot: string; braco: string; escolhida: string }[]; ordem: string }>(join(saida, "coleta-trio.json"));
  assert.equal(reg.ordem, "design.arms");
  assert.deepEqual(reg.slots.map(s => s.braco), ["sem", "com"]);
  assert.equal(reg.linhaDeBase.slot, reg.slots[0].slot, "linha de base do primeiro slot");
  const idx = readdirSync(join(arquivo, "indice", "entradas")).map(f => lerJson<EntradaIndice>(join(arquivo, "indice", "entradas", f)));
  const doSem = idx.find(e => e.chave === reg.slots[0].escolhida)!;
  const lb = idx.find(e => e.tipo === "linha-de-base" && e.manifestoColeta?.sha256 === doSem.manifestoColeta?.sha256)!;
  assert.equal(reg.linhaDeBase.baselineId, lb.chave);
  assert.equal(lerJson<{ linhaDeBase: { baselineId: string } }>(join(saida, "summary.json")).linhaDeBase.baselineId, lb.chave, "o analisar usou essa linha de base");
});

await teste("download (de teste): baixa, confere sha256, restaura; a segunda coleta reaproveita o cache numa pasta nova", async () => {
  const arquivo = copia("download");
  const chamadas: string[] = [];
  const r1 = await coletarTrio({ arquivo, campanha: C, trio: "par-t4", baixar: baixadorLocal(t4.anexos, chamadas), raizEval: semEval });
  assert.equal(chamadas.length, 2, "um download por slot");
  assert.ok(r1.saida.endsWith("T1"));
  const r2 = await coletarTrio({ arquivo, campanha: C, trio: "par-t4", baixar: baixadorLocal(t4.anexos, chamadas), raizEval: semEval });
  assert.equal(chamadas.length, 2, "anexos já conferidos na máquina: nenhum download novo");
  assert.ok(r2.saida.endsWith("T2"), r2.saida);
  assert.equal(lerJson<{ hashes: { conteudoCientificoSha256: string } }>(join(r1.saida, "summary.json")).hashes.conteudoCientificoSha256,
    lerJson<{ hashes: { conteudoCientificoSha256: string } }>(join(r2.saida, "summary.json")).hashes.conteudoCientificoSha256, "mesma análise");
  await assert.rejects(coletarTrio({ arquivo, campanha: C, trio: "par-t4", carimbo: r1.saida.split("analisar-").pop()!, baixar: null, raizEval: semEval }),
    (e: Error) => e instanceof RecusaColeta && /já existe/.test(e.message), "pasta existente nunca é sobrescrita");
});

await teste("anexo baixado com sha256 diferente do índice = recusa, nenhuma pasta de análise; anexo local divergente = recusa sem baixar", async () => {
  const arquivo = copia("divergente");
  const chamadas: string[] = [];
  await assert.rejects(coletarTrio({ arquivo, campanha: C, trio: "par-t4", baixar: baixadorLocal(t4.anexos, chamadas, true), raizEval: semEval }),
    (e: Error) => e instanceof RecusaColeta && /hash divergente: o anexo baixado/.test(e.message));
  assert.equal(chamadas.length, 1, "para no primeiro anexo divergente");
  assert.ok(!existsSync(join(arquivo, "analises", C, "par-t4")), "nada analisado");
  // o arquivo estragado ficou em anexos/: a próxima coleta recusa sem baixar de novo e sem tocar nele
  const outra: string[] = [];
  await assert.rejects(coletarTrio({ arquivo, campanha: C, trio: "par-t4", baixar: baixadorLocal(t4.anexos, outra), raizEval: semEval }),
    (e: Error) => e instanceof RecusaColeta && /hash divergente: .* tem sha256/.test(e.message));
  assert.equal(outra.length, 0);
});

// ── regra fixa da linha de base e escolha da tentativa (puro) ───────────────────────────────

const campanha = (o: Partial<{ arms: string[]; order: string; ausencia: boolean }> = {}): AnyCampaign => ({
  campaignId: "camp-x", fixture: false,
  design: { arms: o.arms ?? ["sem", "ferramentas", "com"], order: o.order ?? "sequencial" },
  retryPolicy: { maxAttemptsPerSlot: 2, campaignAttemptCeiling: 9, retryOn: ["rate-limited", "harness-error"] },
  baselinePolicy: { plannedAbsences: o.ausencia ? [{ screenId: "tela", justification: "sem linha de base nesta tela", declaredAt: "2026-01-01T00:00:00Z", analysisPath: "individual" }] : [] },
} as unknown as AnyCampaign);
let seq = 0;
const exec = (slot: string, braco: string, o: Partial<EntradaIndice> & { mc?: string | null } = {}): EntradaIndice => {
  const n = ++seq;
  return { indice: "arquivo-resultados-1.0.0", chave: o.chave ?? `run-${n}`, tipo: "execucao", natureza: "formal", campanha: "camp-x", slot, par: o.par ?? "trio-01",
    tela: "tela", braco: braco as EntradaIndice["braco"], modelo: "m", esforco: "high", modo: "real", dataUtc: o.dataUtc ?? `2026-01-01T00:${String(n).padStart(2, "0")}:00Z`,
    caminho: `execucoes/camp-x/run-${n}`, estado: { arquivo: "arquivado", tecnico: "passed", isolamento: "passed", oraculo: null, submissao: "accepted", pontuacao: null, linhaDeBase: null, ...(o.estado ?? {}) },
    motivo: o.motivo ?? null, pacote: null, evidencias: null, github: null,
    manifestoColeta: o.mc === null ? null : { sha256: o.mc ?? `mc-${n}`, caminho: `coletas/camp-x/mc-${n}/manifesto-coleta.json` } } as EntradaIndice;
};
const lbDe = (e: EntradaIndice, chave = `lb-${e.chave}`): EntradaIndice => ({ ...e, chave, tipo: "linha-de-base", braco: null,
  estado: { ...e.estado, linhaDeBase: "utilizavel" }, caminho: `linhas-de-base/camp-x/tela/${chave}` });
const agendaCom = (ordem: [string, string][]): Agenda => ({ campaignId: "camp-x",
  slots: ordem.map(([slotId, arm], i) => ({ slotId, pairId: "p01", arm, positionInPair: i + 1, repetition: 1, order: i + 1, window: null })) } as unknown as Agenda);

await teste("linha de base: a do PRIMEIRO slot na ordem da agenda (com primeiro → a do com), nunca a de outro slot", () => {
  const sem = exec("p01-sem", "sem", { par: "p01" }), fe = exec("p01-ferramentas", "ferramentas", { par: "p01" }), com = exec("p01-com", "com", { par: "p01" });
  const entradas = [sem, lbDe(sem), fe, lbDe(fe), com, lbDe(com)];
  const ag = agendaCom([["p01-com", "com"], ["p01-sem", "sem"], ["p01-ferramentas", "ferramentas"]]);
  const p = planoDoTrio(entradas, campanha({ order: "quadrado-latino" }), ag, "p01");
  assert.equal(p.ordem, "agenda");
  assert.deepEqual(p.slots.map(s => s.slot), ["p01-com", "p01-sem", "p01-ferramentas"]);
  assert.equal(p.linhaDeBase.tipo === "registro" && p.linhaDeBase.entrada.chave, `lb-${com.chave}`);
  // sem a linha de base do primeiro slot: recusa, mesmo havendo as dos outros
  assert.throws(() => planoDoTrio([sem, lbDe(sem), fe, lbDe(fe), com], campanha({ order: "quadrado-latino" }), ag, "p01"),
    (e: Error) => e instanceof RecusaColeta && /primeiro slot \(p01-com\)/.test(e.message));
  // ... a não ser pela ausência planejada que a campanha declara
  const aus = planoDoTrio([sem, fe, com], campanha({ order: "quadrado-latino", ausencia: true }), ag, "p01");
  assert.equal(aus.linhaDeBase.tipo, "ausencia-planejada");
  // quadrado latino sem agenda: não se sabe o primeiro slot
  assert.throws(() => planoDoTrio(entradas, campanha({ order: "quadrado-latino" }), null, "p01"), /quadrado latino/);
});

await teste("sem agenda (sequencial): ordem de design.arms; preflight recusado não conta; slot sem tentativa elegível = recusa", () => {
  const preflight = exec("p01-sem", "sem", { estado: { arquivo: "sem-pacote", tecnico: "interrupted" } as EntradaIndice["estado"], mc: null });
  const sem = exec("p01-sem", "sem"), fe = exec("p01-ferramentas", "ferramentas"), com = exec("p01-com", "com");
  const p = planoDoTrio([com, lbDe(com), preflight, fe, sem, lbDe(sem)], campanha(), null, "trio-01");
  assert.equal(p.ordem, "design.arms");
  assert.deepEqual(p.slots.map(s => s.braco), ["sem", "ferramentas", "com"]);
  assert.equal(p.slots[0].escolhida.chave, sem.chave, "a tentativa do preflight recusado não é tentativa");
  assert.equal(p.linhaDeBase.tipo === "registro" && p.linhaDeBase.entrada.chave, `lb-${sem.chave}`);
  assert.equal(planoDoTrio([sem, lbDe(sem), fe, com], campanha(), null, "p01").trio, "trio-01", "o grupo também é achado pelo prefixo do slot; a pasta usa o nome do índice");
  const falha = exec("p01-com", "com", { estado: { tecnico: "failed" } as EntradaIndice["estado"], motivo: "rate-limited: 429" });
  assert.throws(() => planoDoTrio([sem, lbDe(sem), fe, falha], campanha(), null, "trio-01"),
    (e: Error) => e instanceof RecusaColeta && /p01-com não tem tentativa elegível/.test(e.message));
  assert.throws(() => planoDoTrio([sem, lbDe(sem), fe], campanha(), null, "trio-01"), /falta o braço com/);
  // duas linhas de base do mesmo disparo: ambíguo
  assert.throws(() => planoDoTrio([sem, lbDe(sem), lbDe(sem, "lb-outra"), fe, com], campanha(), null, "trio-01"), /ambíguo/);
});

await teste("carimbo: AAAAMMDDT<n>, n = 1 + o maior do dia", () => {
  const d = join(TMP, "carimbos");
  mkdirSync(join(d, "analisar-20261019T1"), { recursive: true });
  mkdirSync(join(d, "analisar-20261019T3"));
  mkdirSync(join(d, "primeira-passada-20261019T7"));
  assert.equal(proximoCarimbo(d, new Date("2026-10-19T12:00:00Z")), "20261019T4");
  assert.equal(proximoCarimbo(d, new Date("2026-10-20T12:00:00Z")), "20261020T1");
  assert.equal(proximoCarimbo(join(TMP, "nao-existe"), new Date("2026-10-19T12:00:00Z")), "20261019T1");
});

rmSync(TMP, { recursive: true, force: true });
const falhas = resultados.filter(r => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} testes de coleta:trio passaram`);
if (falhas) process.exitCode = 1;
