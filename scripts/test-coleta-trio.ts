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
 * agenda, nunca a de outro slot; ausência planejada; slot sem tentativa elegível; preflight recusado não conta;
 * (5) emenda (a): a linha de base congelada da campanha — aceita com identidade igual e registro anterior ao 1º slot;
 * recusada com outro distSha256, outro site, registro posterior, ou slot cujo commit não contém o registro; de ponta a
 * ponta sobre o arquivo T4 (registro gerado, 1º slot sem linha de base do disparo, análise com o registro conferido).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateContract, type AnyCampaign, type LinhaDeBaseCampanha } from "../contracts/index";
import { ROOT } from "./adjudication";
import type { Agenda } from "./agenda-campanha";
import { sha, type EntradaIndice } from "./arquivo-resultados";
import { conferirCongelamentoNoGit, conferirRegistroContraManifesto, gerarRegistroDaCampanha, leitorGit, type LeitorGit } from "./linha-de-base-campanha";
import { conferirLinhaDeBaseDaCampanhaNoCli, type OpcoesAnalise } from "./analisar-execucao";
import { RecusaColeta, coletarTrio, identidadeDoEmprestimo, planoDoTrio, proximoCarimbo, type Baixador } from "./coleta-trio";
import type { IsolatedCollectionManifest } from "./manifesto-coleta-isolada";
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

await teste("D-164: slot sem tentativa válida entra com a quarentena de isolamento resgatada; válida sempre ganha; resgate de outra coisa = recusa", () => {
  const sem = exec("p01-sem", "sem", { par: "p01" });
  const fe = exec("p01-ferramentas", "ferramentas", { par: "p01", estado: { isolamento: "failed" } as EntradaIndice["estado"] });
  const com = exec("p01-com", "com", { par: "p01" });
  const entradas = [sem, lbDe(sem), fe, com];
  const ag = agendaCom([["p01-sem", "sem"], ["p01-ferramentas", "ferramentas"], ["p01-com", "com"]]);
  const camp = campanha({ order: "quadrado-latino" });
  // sem resgate: a quarentena não entra (o caminho de sempre)
  assert.throws(() => planoDoTrio(entradas, camp, ag, "p01"), (e: Error) => e instanceof RecusaColeta && /p01-ferramentas não tem tentativa elegível/.test(e.message));
  const p = planoDoTrio(entradas, camp, ag, "p01", new Map([["p01-ferramentas", fe.chave]]));
  const s = p.slots.find(x => x.slot === "p01-ferramentas")!;
  assert.equal(s.escolhida.chave, fe.chave);
  assert.equal(s.resgatada, true);
  assert.ok(p.slots.filter(x => x.slot !== "p01-ferramentas").every(x => !("resgatada" in x)), "só o slot resgatado é anotado");
  // tentativa válida no slot: o resgate não troca nada
  const valido = planoDoTrio(entradas, camp, ag, "p01", new Map([["p01-sem", "outra-chave"], ["p01-ferramentas", fe.chave]]));
  assert.equal(valido.slots[0].escolhida.chave, sem.chave);
  assert.equal("resgatada" in valido.slots[0], false);
  // resgate de execução fora do índice do slot, ou de algo que não é quarentena de isolamento
  assert.throws(() => planoDoTrio(entradas, camp, ag, "p01", new Map([["p01-ferramentas", "nao-existe"]])),
    (e: Error) => e instanceof RecusaColeta && /não está no índice do slot/.test(e.message));
  const tec = exec("p01-ferramentas", "ferramentas", { par: "p01", estado: { tecnico: "failed", isolamento: "passed" } as EntradaIndice["estado"], motivo: "timeout" });
  assert.throws(() => planoDoTrio([sem, lbDe(sem), tec, com], camp, ag, "p01", new Map([["p01-ferramentas", tec.chave]])),
    (e: Error) => e instanceof RecusaColeta && /não é uma quarentena de isolamento/.test(e.message));
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

await teste("empréstimo de linha de base do trio (dev-*, declarado): sem a do primeiro slot, a de outro slot do MESMO trio; fora de dev-*, com a do primeiro, de fora do trio ou ambíguo: recusa", () => {
  const dev = (e: EntradaIndice): EntradaIndice => ({ ...e, campanha: "dev-x" });
  const camp = { ...campanha({ order: "quadrado-latino" }), campaignId: "dev-x" } as AnyCampaign;
  const sem = dev(exec("p02-sem", "sem", { par: "p02" })), fe = dev(exec("p02-ferramentas", "ferramentas", { par: "p02" })), com = dev(exec("p02-com", "com", { par: "p02" }));
  const ag = { ...agendaCom([["p02-com", "com"], ["p02-sem", "sem"], ["p02-ferramentas", "ferramentas"]]), campaignId: "dev-x" } as Agenda;
  ag.slots.forEach(s => { (s as { pairId: string }).pairId = "p02"; });
  const entradas = [com, sem, dev(lbDe(sem)), fe, dev(lbDe(fe))];
  // sem a opção: a regra fixa recusa (como na dev-3710-b-01 p02)
  assert.throws(() => planoDoTrio(entradas, camp, ag, "p02"), (e: Error) => e instanceof RecusaColeta && /primeiro slot \(p02-com\)/.test(e.message));
  const p = planoDoTrio(entradas, camp, ag, "p02", new Map(), "p02-sem");
  assert.equal(p.linhaDeBase.tipo, "emprestada-do-trio");
  assert.equal(p.linhaDeBase.slot, "p02-com", "a linha de base continua sendo a do primeiro slot do trio, emprestada");
  assert.equal(p.linhaDeBase.tipo === "emprestada-do-trio" && p.linhaDeBase.doador, "p02-sem");
  assert.equal(p.linhaDeBase.tipo === "emprestada-do-trio" && p.linhaDeBase.entrada.chave, `lb-${sem.chave}`);
  // campanha que não é de desenvolvimento: nunca
  const naoDev = (e: EntradaIndice): EntradaIndice => ({ ...e, campanha: "camp-x" });
  assert.throws(() => planoDoTrio(entradas.map(naoDev), campanha({ order: "quadrado-latino" }), { ...ag, campaignId: "camp-x" } as Agenda, "p02", new Map(), "p02-sem"),
    (e: Error) => e instanceof RecusaColeta && /só vale em campanha de desenvolvimento/.test(e.message));
  // o primeiro slot tem a sua: nada a emprestar
  assert.throws(() => planoDoTrio([...entradas, dev(lbDe(com))], camp, ag, "p02", new Map(), "p02-sem"), (e: Error) => e instanceof RecusaColeta && /não há o que emprestar/.test(e.message));
  // doador de fora do trio, o próprio primeiro, ou sem linha de base do disparo da tentativa escolhida
  assert.throws(() => planoDoTrio(entradas, camp, ag, "p02", new Map(), "p03-sem"), (e: Error) => e instanceof RecusaColeta && /não é do trio/.test(e.message));
  assert.throws(() => planoDoTrio(entradas, camp, ag, "p02", new Map(), "p02-com"), (e: Error) => e instanceof RecusaColeta && /próprio primeiro slot/.test(e.message));
  const outroDisparo = { ...dev(lbDe(sem)), manifestoColeta: { sha256: "mc-outro", caminho: "x" } } as EntradaIndice;
  assert.throws(() => planoDoTrio([com, sem, outroDisparo, fe], camp, ag, "p02", new Map(), "p02-sem"), (e: Error) => e instanceof RecusaColeta && /precisa de exatamente uma/.test(e.message));
});

await teste("empréstimo de linha de base: identidade dos manifestos de coleta igual (site, build do validator, commits, lock) ou recusa", () => {
  const m = (o: Record<string, unknown> = {}): IsolatedCollectionManifest => ({
    identity: { collection: "fluxo-1.3.0", referenceSha256: "r", siteManifestSha256: "s", oracleDistSha256: "d", oracleDataSha256: "a", statePlanSha256: "p" },
    site: { manifestSha256: "s", manifestBytes: 1, siteSha256: "site", packageVersion: "1.0.0", corpusCommit: null, screenVersion: "v" },
    oracle: { package: "govbr-ds-validator-server", version: "3.7.10", distSha256: "d", dataSha256: "a" },
    repos: { "govbr-eval": { commit: "e", dirty: false }, "govbr-telas": { commit: "t", dirty: false }, "govbr-ds-validator": { commit: "v", dirty: false } },
    imagesLock: { sha256: "l", versions: {} }, ...o,
  } as unknown as IsolatedCollectionManifest);
  const ok = identidadeDoEmprestimo(m(), m());
  assert.equal(ok.validatorCommit, "v");
  assert.equal(ok.evalCommit, "e");
  for (const [nome, dif] of [
    ["oracle", { oracle: { package: "govbr-ds-validator-server", version: "3.7.10", distSha256: "outro", dataSha256: "a" } }],
    ["repos.govbr-eval", { repos: { "govbr-eval": { commit: "e2", dirty: false }, "govbr-telas": { commit: "t", dirty: false }, "govbr-ds-validator": { commit: "v", dirty: false } } }],
    ["site.siteSha256", { site: { manifestSha256: "s", manifestBytes: 1, siteSha256: "outro", packageVersion: "1.0.0", corpusCommit: null, screenVersion: "v" } }],
    ["imagesLock.sha256", { imagesLock: { sha256: "l2", versions: {} } }],
  ] as const) {
    assert.throws(() => identidadeDoEmprestimo(m(), m(dif as Record<string, unknown>)), (e: Error) => e instanceof RecusaColeta && e.message.includes(nome), nome);
  }
  const sujo = { repos: { "govbr-eval": { commit: "e", dirty: true }, "govbr-telas": { commit: "t", dirty: false }, "govbr-ds-validator": { commit: "v", dirty: false } } };
  assert.throws(() => identidadeDoEmprestimo(m(sujo), m(sujo)), (e: Error) => e instanceof RecusaColeta && /árvore suja em govbr-eval/.test(e.message));
});

// ── emenda (a): linha de base congelada da campanha ─────────────────────────────────────────

const registroCampanha = (lb: EntradaIndice, o: Partial<LinhaDeBaseCampanha> = {}): LinhaDeBaseCampanha => ({
  contract: "linha-de-base-campanha.v1", fixture: true, campaignId: lb.campanha, screen: { id: "tela", version: "v" }, baselineId: lb.chave,
  registro: { caminho: `${lb.caminho}/baseline.json`, sha256: "1".repeat(64) }, medidaEm: lb.dataUtc,
  manifestoColeta: { caminho: lb.manifestoColeta!.caminho, sha256: lb.manifestoColeta!.sha256 }, snapshotSetId: "snapshots-0123456789abcdef",
  site: { siteSha256: "2".repeat(64), manifestSha256: "3".repeat(64) }, oracle: { version: "x", distSha256: "4".repeat(64), dataSha256: "5".repeat(64) },
  repos: { "govbr-eval": "6".repeat(40), "govbr-telas": "7".repeat(40), "govbr-ds-validator": "8".repeat(40) }, imagesLockSha256: "9".repeat(64),
  regra: "teste", geradoEm: lb.dataUtc, ...o,
});

await teste("emenda (a): trio sem linha de base do disparo + registro da campanha anterior ao 1º slot = aceito; posterior, não utilizável, de outro disparo ou com empréstimo = recusa", () => {
  // disparo so-linha-de-base ANTES de qualquer slot (00:00); slots depois (exec gera 00:NN com NN ≥ 1)
  const lbCamp: EntradaIndice = { ...lbDe(exec("p01-sem", "sem", { par: "p01", dataUtc: "2025-12-31T23:00:00Z" }), "lb-campanha"), dataUtc: "2025-12-31T23:00:00Z" };
  const sem = exec("p01-sem", "sem", { par: "p01" }), fe = exec("p01-ferramentas", "ferramentas", { par: "p01" }), com = exec("p01-com", "com", { par: "p01" });
  const ag = agendaCom([["p01-sem", "sem"], ["p01-ferramentas", "ferramentas"], ["p01-com", "com"]]);
  const camp = campanha({ order: "quadrado-latino" });
  const reg = registroCampanha(lbCamp);
  // sem o registro: a regra fixa recusa (o disparo do 1º slot não tem linha de base)
  assert.throws(() => planoDoTrio([lbCamp, sem, fe, com], camp, ag, "p01"), (e: Error) => e instanceof RecusaColeta && /primeiro slot \(p01-sem\)/.test(e.message));
  const p = planoDoTrio([lbCamp, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: reg });
  assert.equal(p.linhaDeBase.tipo, "congelada-da-campanha");
  assert.equal(p.linhaDeBase.tipo === "congelada-da-campanha" && p.linhaDeBase.entrada.chave, "lb-campanha");
  assert.equal(p.linhaDeBase.slot, "p01-sem");
  // a do disparo do 1º slot, se existir, é ignorada (e listada); vale a da campanha
  const comA = planoDoTrio([lbCamp, sem, lbDe(sem), fe, com], camp, ag, "p01", new Map(), undefined, { congelada: reg });
  assert.equal(comA.linhaDeBase.tipo === "congelada-da-campanha" && comA.linhaDeBase.entrada.chave, "lb-campanha");
  assert.deepEqual(comA.linhaDeBase.tipo === "congelada-da-campanha" && comA.linhaDeBase.ignoradas, [`lb-${sem.chave}`]);
  // vale fora de dev-* (é a regra da campanha formal) e também numa dev-*
  const dev = (e: EntradaIndice): EntradaIndice => ({ ...e, campanha: "dev-x" });
  const pDev = planoDoTrio([lbCamp, sem, fe, com].map(dev), { ...camp, campaignId: "dev-x" } as AnyCampaign, { ...ag, campaignId: "dev-x" } as Agenda, "p01", new Map(), undefined,
    { congelada: { ...reg, campaignId: "dev-x" } });
  assert.equal(pDev.linhaDeBase.tipo, "congelada-da-campanha");
  // registro posterior ao 1º slot: medida, registrada no índice ou gerada depois da primeira execução iniciada
  const tarde = { ...lbCamp, dataUtc: "2026-01-02T00:00:00Z" };
  assert.throws(() => planoDoTrio([tarde, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: registroCampanha(tarde) }),
    (e: Error) => e instanceof RecusaColeta && /registro posterior ao 1º slot/.test(e.message));
  assert.throws(() => planoDoTrio([lbCamp, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: { ...reg, geradoEm: "2026-01-03T00:00:00Z" } }),
    (e: Error) => e instanceof RecusaColeta && /gerada no registro da campanha .* registro posterior/.test(e.message));
  // a execução que conta é qualquer tentativa iniciada da campanha (também de outro trio, também falha técnica)
  const outraAntes = exec("p09-com", "com", { par: "p09", dataUtc: "2025-12-31T22:00:00Z", estado: { tecnico: "failed" } as EntradaIndice["estado"] });
  assert.throws(() => planoDoTrio([lbCamp, outraAntes, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: reg }), /p09-com/);
  // preflight recusado (sem manifesto) não começou: não conta
  const preflight = exec("p09-com", "com", { par: "p09", dataUtc: "2025-12-31T22:00:00Z", mc: null, estado: { arquivo: "sem-pacote", tecnico: "interrupted" } as EntradaIndice["estado"] });
  assert.equal(planoDoTrio([lbCamp, preflight, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: reg }).linhaDeBase.tipo, "congelada-da-campanha");
  // não utilizável, ausente, de outro disparo, outro caminho
  const ruim = { ...lbCamp, estado: { ...lbCamp.estado, linhaDeBase: "nao-utilizavel" as const }, motivo: "identidade divergente" };
  assert.throws(() => planoDoTrio([ruim, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: reg }), /não é utilizável/);
  assert.throws(() => planoDoTrio([sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: reg }), /aparece 0 vez/);
  assert.throws(() => planoDoTrio([lbCamp, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: { ...reg, manifestoColeta: { ...reg.manifestoColeta, sha256: "f".repeat(64) } } }), /de outro disparo/);
  assert.throws(() => planoDoTrio([lbCamp, sem, fe, com], camp, ag, "p01", new Map(), undefined, { congelada: { ...reg, registro: { ...reg.registro, caminho: "linhas-de-base/camp-x/tela/outra/baseline.json" } } }), /aponta linhas-de-base/);
  // não combina com o empréstimo dev-*
  assert.throws(() => planoDoTrio([lbCamp, sem, fe, com], camp, ag, "p01", new Map(), "p01-com", { congelada: reg }), /não vale com a linha de base congelada/);
});

const manifesto = (o: Record<string, unknown> = {}): IsolatedCollectionManifest => ({
  identity: { collection: "fluxo-1.3.0", referenceSha256: "r", siteManifestSha256: "s", oracleDistSha256: "d", oracleDataSha256: "a", statePlanSha256: "p" },
  site: { manifestSha256: "s", manifestBytes: 1, siteSha256: "site", packageVersion: "1.0.0", corpusCommit: null, screenVersion: "v" },
  oracle: { package: "govbr-ds-validator-server", version: "3.7.10", distSha256: "d", dataSha256: "a" },
  repos: { "govbr-eval": { commit: "e", dirty: false }, "govbr-telas": { commit: "t", dirty: false }, "govbr-ds-validator": { commit: "v", dirty: false } },
  imagesLock: { sha256: "l", versions: {} }, ...o,
} as unknown as IsolatedCollectionManifest);

await teste("emenda (a): identidade do registro da campanha contra o manifesto do slot (identidadeDoEmprestimo sem o govbr-eval): outro distSha256, outro site, lock ou árvore suja = recusa", () => {
  const opc = { semEval: true, rotulo: "linha de base congelada da campanha" };
  const outroEval = manifesto({ repos: { "govbr-eval": { commit: "e2", dirty: false }, "govbr-telas": { commit: "t", dirty: false }, "govbr-ds-validator": { commit: "v", dirty: false } } });
  assert.equal(identidadeDoEmprestimo(manifesto(), outroEval, opc).validatorCommit, "v", "o commit do govbr-eval pode diferir (o git confere o quê)");
  assert.throws(() => identidadeDoEmprestimo(manifesto(), outroEval), /repos\.govbr-eval/, "o empréstimo dev-* continua exigindo o mesmo commit");
  for (const [nome, dif] of [
    ["oracle", { oracle: { package: "govbr-ds-validator-server", version: "3.7.10", distSha256: "outro", dataSha256: "a" } }],
    ["site.siteSha256", { site: { manifestSha256: "s", manifestBytes: 1, siteSha256: "outro", packageVersion: "1.0.0", corpusCommit: null, screenVersion: "v" } }],
    ["imagesLock.sha256", { imagesLock: { sha256: "l2", versions: {} } }],
  ] as const) {
    assert.throws(() => identidadeDoEmprestimo(manifesto(), manifesto(dif as Record<string, unknown>), opc),
      (e: Error) => e instanceof RecusaColeta && e.message.includes(nome) && /linha de base congelada da campanha recusada/.test(e.message), nome);
  }
  const sujoNoSlot = manifesto({ repos: { "govbr-eval": { commit: "e", dirty: true }, "govbr-telas": { commit: "t", dirty: false }, "govbr-ds-validator": { commit: "v", dirty: false } } });
  assert.throws(() => identidadeDoEmprestimo(manifesto(), sujoNoSlot, opc), /árvore suja em govbr-eval/, "árvore suja no slot também recusa");
  // o registro tem de dizer o mesmo que o manifesto do disparo da linha de base
  const m = { ...manifesto({ site: { manifestSha256: "3".repeat(64), siteSha256: "2".repeat(64) }, oracle: { version: "x", distSha256: "4".repeat(64), dataSha256: "5".repeat(64) },
    repos: { "govbr-eval": { commit: "6".repeat(40) }, "govbr-telas": { commit: "7".repeat(40) }, "govbr-ds-validator": { commit: "8".repeat(40) } }, imagesLock: { sha256: "9".repeat(64) } }),
    dispatch: { campaignId: "camp-x", screenId: "tela" } } as unknown as IsolatedCollectionManifest;
  const lb = lbDe(exec("p01-sem", "sem"));
  conferirRegistroContraManifesto(registroCampanha(lb), m);
  assert.throws(() => conferirRegistroContraManifesto(registroCampanha(lb, { oracle: { version: "x", distSha256: "0".repeat(64), dataSha256: "5".repeat(64) } }), m), /oracle\.distSha256/);
});

await teste("emenda (a): o git prova o congelamento — o commit de cada slot contém o registro e só difere do da linha de base por ele", () => {
  const caminho = "campanhas/camp-x/linha-de-base.json";
  const bytes = Buffer.from("{\"registro\":1}\n");
  const git = (o: { blob?: Record<string, Buffer | null>; dif?: Record<string, string[]> } = {}): LeitorGit => ({
    blob: (c, p) => (p !== caminho ? null : c in (o.blob ?? {}) ? o.blob![c] : bytes),
    diferenca: (_a, b) => o.dif?.[b] ?? [caminho],
  });
  const ok = conferirCongelamentoNoGit("camp-x", sha(bytes), "lb", ["s1", "s1", "s2"], git());
  assert.deepEqual(ok.commitsDosSlots, ["s1", "s2"]);
  assert.throws(() => conferirCongelamentoNoGit("camp-x", sha(bytes), "lb", ["s1"], git({ blob: { s1: null } })), /não contém campanhas\/camp-x\/linha-de-base\.json: o slot foi disparado antes/);
  assert.throws(() => conferirCongelamentoNoGit("camp-x", sha(bytes), "lb", ["s1"], git({ blob: { s1: Buffer.from("outro") } })), /não é o registro conferido/);
  assert.throws(() => conferirCongelamentoNoGit("camp-x", sha(bytes), "lb", ["s1"], git({ dif: { s1: [caminho, "scripts/vazamento/conhecimento.ts"] } })), /fora do registro da campanha: scripts\/vazamento\/conhecimento\.ts/);
  // o leitor de verdade, sobre este repositório: commit desconhecido = recusa
  assert.throws(() => conferirCongelamentoNoGit("camp-x", sha(bytes), "0".repeat(40), ["0".repeat(40)], leitorGit(ROOT)), /não está no govbr-eval/);
});

await teste("emenda (a), de ponta a ponta (arquivo T4): registro gerado, 1º slot sem linha de base do disparo, o trio fecha com a congelada; análise usa o registro conferido", async () => {
  // arquivo T4 com o govbr-eval limpo nos manifestos; a linha de base do com é a "da campanha", a do sem (1º slot) some
  const base = join(TMP, "arquivo-congelada");
  const t4c = construirArquivoT4(base, { evalLimpo: true });
  const arquivo = join(TMP, "congelada");
  cpSync(t4c.arquivo, arquivo, { recursive: true });
  const dirE = join(arquivo, "indice", "entradas");
  const idx = readdirSync(dirE).map(f => ({ f, e: lerJson<EntradaIndice>(join(dirE, f)) }));
  const lbSem = idx.find(x => x.e.tipo === "linha-de-base" && (x.e.slot ?? "").endsWith("-sem"))!;
  const lbCom = idx.find(x => x.e.tipo === "linha-de-base" && (x.e.slot ?? "").endsWith("-com"))!;
  rmSync(join(dirE, lbSem.f));
  // as execuções da fixture começam às 00:00 do dia e as linhas de base às 01:00: aqui as execuções vêm depois (02:00)
  const execs = idx.filter(x => x.e.tipo === "execucao");
  for (const x of execs) writeFileSync(join(dirE, x.f), JSON.stringify({ ...x.e, dataUtc: x.e.dataUtc.replace("T00:00:00Z", "T02:00:00Z") }, null, 2) + "\n");
  // o gerador recusa com execução iniciada; num arquivo ainda sem execuções, grava
  assert.throws(() => gerarRegistroDaCampanha({ arquivo, campanha: t4c.campanha, baselineId: lbCom.e.chave }), /já tem 2 execução\(ões\) iniciada/);
  const semExec = join(TMP, "congelada-antes-do-slot-1");
  cpSync(arquivo, semExec, { recursive: true });
  for (const x of execs) rmSync(join(semExec, "indice", "entradas", x.f));
  const reg = gerarRegistroDaCampanha({ arquivo: semExec, campanha: t4c.campanha, baselineId: lbCom.e.chave, agora: new Date("2026-02-01T01:30:00Z") });
  assert.ok(validateContract(reg).valid);
  assert.equal(reg.registro.sha256, sha(readFileSync(join(arquivo, lbCom.e.caminho, "baseline.json"))));
  const raizEval = join(TMP, "eval-congelada");
  mkdirSync(join(raizEval, "campanhas", t4c.campanha), { recursive: true });
  const regPath = join(raizEval, "campanhas", t4c.campanha, "linha-de-base.json");
  writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");
  const regBytes = readFileSync(regPath);
  const gitOk: LeitorGit = { blob: (_c, p) => (p === `campanhas/${t4c.campanha}/linha-de-base.json` ? regBytes : null), diferenca: () => [`campanhas/${t4c.campanha}/linha-de-base.json`] };
  // sem o registro, a regra fixa recusa (o disparo do 1º slot não arquivou linha de base)
  await assert.rejects(coletarTrio({ arquivo, campanha: t4c.campanha, trio: "par-t4", anexos: [t4c.anexos], baixar: null, raizEval: semEval }),
    (e: Error) => e instanceof RecusaColeta && /linha de base ausente/.test(e.message));
  // o slot cujo commit não contém o registro: recusa sem analisar
  await assert.rejects(coletarTrio({ arquivo, campanha: t4c.campanha, trio: "par-t4", anexos: [t4c.anexos], baixar: null, raizEval, git: { ...gitOk, blob: () => null } }),
    (e: Error) => e instanceof RecusaColeta && /disparado antes de o registro da linha de base ser commitado/.test(e.message));
  assert.ok(!existsSync(join(arquivo, "analises", t4c.campanha, "par-t4")), "nada analisado");
  const r = await coletarTrio({ arquivo, campanha: t4c.campanha, trio: "par-t4", anexos: [t4c.anexos], baixar: null, raizEval, git: gitOk });
  const ct = lerJson<{ linhaDeBase: { tipo: string; baselineId: string; registroDaCampanha: { sha256: string }; identidadeConferida: Record<string, unknown> } }>(r.registro);
  assert.equal(ct.linhaDeBase.tipo, "congelada-da-campanha");
  assert.equal(ct.linhaDeBase.baselineId, lbCom.e.chave);
  assert.equal(ct.linhaDeBase.registroDaCampanha.sha256, sha(regBytes));
  assert.equal(Object.keys(ct.linhaDeBase.identidadeConferida).length, 2, "conferida contra o manifesto de cada slot");
  const s = lerJson<{ linhaDeBase: { modo: string; baselineId: string }; hashes: { entradas: Record<string, string> } }>(join(r.saida, "summary.json"));
  assert.equal(s.linhaDeBase.modo, "used", JSON.stringify(s.linhaDeBase));
  assert.equal(s.linhaDeBase.baselineId, lbCom.e.chave);
  assert.equal(s.hashes.entradas.linhaDeBaseDaCampanha, sha(regBytes));
  assert.equal(sha(readFileSync(join(r.saida, "entradas", "linha-de-base-da-campanha.json"))), sha(regBytes));
  // revisão LOW 3: o CLI analisar com --linha-de-base-da-campanha faz a MESMA conferência (manifestos, identidade, git)
  const reg2 = lerJson<{ campanha: { caminho: string }; slots: { braco: string; escolhida: string }[]; linhaDeBase: { caminho: string; snapshotsDaLinhaDeBase: string } }>(r.registro);
  const pacoteDe = (runId: string) => { const d = join(arquivo, "restauracoes", runId); return join(d, readdirSync(d).filter(n => !n.startsWith("."))[0]); };
  const cli = (o: Partial<OpcoesAnalise> = {}): OpcoesAnalise => ({
    sem: pacoteDe(reg2.slots.find(x => x.braco === "sem")!.escolhida), com: pacoteDe(reg2.slots.find(x => x.braco === "com")!.escolhida),
    campanha: join(arquivo, reg2.campanha.caminho), snapshots: "x", referencia: "x", site: "x", saida: "x", arquivo,
    linhaDeBase: join(arquivo, reg2.linhaDeBase.caminho), linhaDeBaseDaCampanha: { registro: regPath, snapshots: join(arquivo, reg2.linhaDeBase.snapshotsDaLinhaDeBase) }, ...o,
  });
  conferirLinhaDeBaseDaCampanhaNoCli(cli(), raizEval, gitOk);
  assert.throws(() => conferirLinhaDeBaseDaCampanhaNoCli(cli(), raizEval, { ...gitOk, blob: () => null }), /disparado antes de o registro da linha de base ser commitado/);
  assert.throws(() => conferirLinhaDeBaseDaCampanhaNoCli(cli(), raizEval, { ...gitOk, diferenca: () => ["scripts/vazamento/conhecimento.ts"] }), /fora do registro da campanha/);
  assert.throws(() => conferirLinhaDeBaseDaCampanhaNoCli(cli({ arquivo: undefined }), raizEval, gitOk), /exige --arquivo/);
  assert.throws(() => conferirLinhaDeBaseDaCampanhaNoCli(cli({ linhaDeBase: regPath }), raizEval, gitOk), /não é o baseline\.json congelado/);
  assert.throws(() => conferirLinhaDeBaseDaCampanhaNoCli(cli({ linhaDeBaseDaCampanha: { registro: regPath, snapshots: regPath } }), raizEval, gitOk), /não é o conjunto da linha de base/);
  // registro estragado (outro sha256 do baseline.json): recusa
  writeFileSync(regPath, JSON.stringify({ ...reg, registro: { ...reg.registro, sha256: "0".repeat(64) } }, null, 2) + "\n");
  const regRuim = readFileSync(regPath);
  await assert.rejects(coletarTrio({ arquivo, campanha: t4c.campanha, trio: "par-t4", anexos: [t4c.anexos], baixar: null, raizEval,
    git: { blob: () => regRuim, diferenca: () => [] } }), (e: Error) => e instanceof RecusaColeta && /o registro da campanha congelou/.test(e.message));
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
