/**
 * NAT-81 — registro de inspeção comum aos braços. Sem modelo, sem Docker, sem rede externa.
 *
 *   1. coletor (runner/container/collector.mjs, processo local): sem COLLECTOR_FINDINGS_CONTRACT arma
 *      findings.v1 como antes e recusa o registro; armado em v2 aceita registro parcial e zero achados,
 *      e recusa id repetido, estado/achado desconhecido e `confirmed` sem origem como erro de contrato;
 *   2. harness: a escolha do envelope vem do rótulo da imagem do coletor, nunca do braço;
 *   3. leitura do pacote: um pacote v2 (manifesto v2 + findings.v2 com registro) entra no adaptador e
 *      produz para o scorer EXATAMENTE a mesma entrada que o mesmo relatório em v1 (achado-2 intacto);
 *      manifesto que declara outro envelope é recusado;
 *   4. resumo: v1 → "registro indisponível" (não zero cobertura); v2 sem registro → "não enviado";
 *      v2 com registro → declaração separada da comprovação por evento; cobertura da página desconhecida.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTRACTS_DIR, type Findings, type FindingsV2, type InspectionLedger } from "../contracts/index";
import { collectorFindingsContract } from "../runner/run-once";
import { ROOT } from "./adjudication";
import { adaptarExecucao, lerPacote, renderResumo, type Resumo } from "./analisar-execucao";
import { resumirInspecao } from "./inspection-ledger";

let tests = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> { await fn(); tests++; console.log(`ok ${name}`); }

const TMP = mkdtempSync(join(tmpdir(), "nat81-inspecao-"));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const EX = join(CONTRACTS_DIR, "examples");
const v2Ex = readJson<FindingsV2>(join(EX, "valid", "findings--v2-com-inspecao-parcial.json"));
const LEDGER: InspectionLedger = v2Ex.report.inspection!;

// ───────────────────────────────────────────────────────────────── coletor

const freePort = () => new Promise<number>((ok) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = (s.address() as { port: number }).port; s.close(() => ok(p)); }); });

async function withCollector(contract: string | null, fn: (post: (body: unknown) => Promise<{ status: number; body: { ok: boolean; errors?: string[] } }>, out: string) => Promise<void>) {
  const port = await freePort();
  const out = mkdtempSync(join(TMP, "coletor-"));
  const env: NodeJS.ProcessEnv = { ...process.env, COLLECTOR_RUN_ID: "fixture-run-01", COLLECTOR_CAMPAIGN_ID: "fixture-campanha-01", COLLECTOR_FIXTURE: "1",
    COLLECTOR_OUT: out, COLLECTOR_PORT: String(port), COLLECTOR_SCHEMAS: CONTRACTS_DIR };
  if (contract) env.COLLECTOR_FINDINGS_CONTRACT = contract; else delete env.COLLECTOR_FINDINGS_CONTRACT;
  const child: ChildProcess = spawn(process.execPath, [join(ROOT, "runner", "container", "collector.mjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
  try {
    await new Promise<void>((ok, fail) => {
      let err = "";
      child.stdout!.on("data", (d) => { if (String(d).includes("coletor armado")) ok(); });
      child.stderr!.on("data", (d) => { err += String(d); });
      child.on("exit", (c) => fail(new Error(`coletor saiu (${c}): ${err}`)));
    });
    const post = async (body: unknown) => {
      const r = await fetch(`http://127.0.0.1:${port}/api/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() as { ok: boolean; errors?: string[] } };
    };
    await fn(post, out);
  } finally { child.kill(); }
}

const report = (over: Record<string, unknown> = {}) => ({ ...clone(v2Ex.report), ...over });

await test("coletor sem escolha do harness = findings.v1 de antes: aceita relatório sem registro e recusa o registro", async () => {
  const { inspection: _i, ...semRegistro } = report();
  await withCollector(null, async (post, out) => {
    const recusado = await post(report());
    assert.equal(recusado.status, 400);
    const ok = await post(semRegistro);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const env = readJson<Findings>(join(out, "findings.json"));
    assert.equal(env.contract, "findings.v1");
    assert.ok(!("inspectionContract" in env));
  });
});

await test("coletor armado em findings.v2: registro parcial aceito; zero achados por orçamento aceito", async () => {
  await withCollector("findings.v2", async (post, out) => {
    const ok = await post(report());
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const env = readJson<FindingsV2>(join(out, "findings.json"));
    assert.equal(env.contract, "findings.v2");
    assert.equal(env.inspectionContract, "inspection.v1");
    assert.deepEqual(env.report.findings, v2Ex.report.findings);
  });
  await withCollector("findings.v2", async (post) => {
    const zero = report({ findings: [], inspection: { completion: "partial", regions: [], states: [], items: [], candidates: [], limitations: [{ kind: "budget", detail: "tempo esgotado" }] } });
    assert.equal((await post(zero)).status, 200);
  });
  await withCollector("findings.v2", async (post) => {
    const { inspection: _i, ...semRegistro } = report();
    assert.equal((await post(semRegistro)).status, 200, "registro ausente não derruba os achados");
  });
});

await test("coletor v2: registro com erro de contrato NÃO derruba os achados — aceito, registro guardado como inválido (igual nos dois braços)", async () => {
  const casos: [string, (l: InspectionLedger) => void, RegExp][] = [
    ["id repetido", (l) => { l.candidates[1].id = "c1"; }, /x-unique/],
    ["estado desconhecido", (l) => { l.items[0].state = "s9"; }, /x-unknown-state/],
    ["achado desconhecido", (l) => { l.candidates[0].findings = [7]; }, /x-unknown-finding/],
    ["confirmed sem origem", (l) => { delete l.states[0].arrival.originRef; }, /originRef/],
    ["registro malformado", (l) => { (l as unknown as Record<string, unknown>).regions = "tudo"; }, /regions/],
  ];
  // "sem": só origem de navegador; "com": candidatos de ferramenta de validação. O tratamento é o mesmo.
  const porBraco: Record<string, (l: InspectionLedger) => void> = {
    sem: (l) => { for (const x of [...l.regions, ...l.candidates]) { x.origin = "browser"; delete x.originRef; } },
    com: () => {},
  };
  for (const [braco, prep] of Object.entries(porBraco)) {
    for (const [nome, mut, re] of casos) {
      await withCollector("findings.v2", async (post, out) => {
        const l = clone(LEDGER);
        prep(l);
        mut(l);
        const r = await post(report({ inspection: l }));
        assert.equal(r.status, 200, `${braco}/${nome}: ${JSON.stringify(r.body)}`);
        assert.deepEqual(Object.keys(r.body).sort(), ["ok", "receipt"], "recibo mínimo, igual ao de um registro válido");
        const env = readJson<FindingsV2>(join(out, "findings.json"));
        assert.equal(env.inspectionStatus, "invalid", `${braco}/${nome}`);
        assert.match(env.inspectionErrors!.join("; "), re, `${braco}/${nome}`);
        assert.ok(env.inspectionRaw !== undefined && !("inspection" in env.report));
        assert.deepEqual(env.report.findings, v2Ex.report.findings, "achados intactos");
        assert.ok(!existsSync(join(out, "refused", "001.json")), "nada recusado");
        assert.match(readFileSync(join(out, "events.ndjson"), "utf8"), /"inspection":"invalid"/);
      });
    }
  }
});

await test("coletor v2: candidato rejeitado sem `findings` é registro válido; erro no ACHADO continua recusando", async () => {
  await withCollector("findings.v2", async (post, out) => {
    const l = clone(LEDGER);
    delete l.candidates[2].findings;
    delete l.candidates[1].findings;
    assert.equal((await post(report({ inspection: l }))).status, 200);
    assert.equal(readJson<FindingsV2>(join(out, "findings.json")).inspectionStatus, "valid");
  });
  await withCollector("findings.v2", async (post, out) => {
    const r = report();
    delete (r.findings[0] as Partial<typeof r.findings[0]>).observed;
    (r.inspection as InspectionLedger).candidates[1].id = "c1";
    assert.equal((await post(r)).status, 400, "achado fora do contrato recusa como antes");
    assert.ok(existsSync(join(out, "refused", "001.json")));
  });
});

await test("coletor: contrato desconhecido não arma", async () => {
  await assert.rejects(withCollector("findings.v9", async () => {}), /saiu/);
});

// ───────────────────────────────────────────────────────────────── harness

await test("harness escolhe o envelope pelo rótulo da imagem do coletor, não pelo braço", () => {
  assert.deepEqual(collectorFindingsContract(undefined).armed, "findings.v1");
  assert.deepEqual(collectorFindingsContract({ "govbr.collector.schemas": "x" }).armed, "findings.v1", "imagem anterior ao NAT-81");
  assert.deepEqual(collectorFindingsContract({ "govbr.collector.findings-contracts": "findings.v1,findings.v2" }).armed, "findings.v2");
  const lock = readJson<{ images: { collector: { labels: Record<string, string> } } }>(join(ROOT, "runner", "images.lock.json"));
  console.log(`   lock atual: coletor arma ${collectorFindingsContract(lock.images.collector.labels).armed} (reconstruir imagens antes de campanha nova)`);
  const src = readFileSync(join(ROOT, "runner", "run-once.ts"), "utf8");
  assert.ok(!/collectorFindingsContract\([^)]*braco/.test(src), "a escolha não recebe o braço");
});

// ───────────────────────────────────────────────────────────────── pacote v2 → mesma entrada do scorer

const PACOTE_V1 = join(ROOT, "scripts", "fixtures", "analise", "gerado", "pacotes", "com");

function pacoteV2(dest: string, mutManifest?: (m: Record<string, unknown>) => void): void {
  cpSync(PACOTE_V1, dest, { recursive: true });
  const f = readJson<Findings>(join(dest, "findings.json"));
  const ledger: InspectionLedger = { completion: "partial", regions: [], states: [], items: [], limitations: [{ kind: "budget", detail: "fixture" }],
    candidates: f.report.findings.map((_x, i) => ({ id: `c${i}`, state: "s1", origin: "browser" as const, subject: "#fixture", observation: "fixture",
      decision: "accepted" as const, findings: [i], evidence: [] })) };
  ledger.states = [{ id: "s1", url: "/fixture", viewport: { width: 1280, height: 900 }, recipe: [{ action: "load" }], arrival: { status: "declared", observables: ["fixture"] }, evidence: [] }];
  const v2: FindingsV2 = { ...f, contract: "findings.v2", inspectionContract: "inspection.v1", inspectionStatus: "valid", report: { ...f.report, inspection: ledger } };
  writeFileSync(join(dest, "findings.json"), JSON.stringify(v2, null, 2) + "\n");
  const m = readJson<Record<string, unknown> & { files: { path: string; bytes: number; sha256: string }[]; schemaVersions: Record<string, string> }>(join(dest, "artifact-manifest.json"));
  m.contract = "artifact-manifest.v2";
  m.schemaVersions = { ...m.schemaVersions, findings: "findings.v2", inspection: "inspection.v1" };
  m.inspectionStatus = "valid";
  for (const file of m.files) if (file.path === "findings.json") { const b = readFileSync(join(dest, "findings.json")); file.bytes = b.length; file.sha256 = sha(b); }
  mutManifest?.(m);
  writeFileSync(join(dest, "artifact-manifest.json"), JSON.stringify(m, null, 2) + "\n");
}

await test("pacote v2: lido e adaptado; o scorer recebe a MESMA entrada que o v1 (achado-2 intacto, sem o registro)", () => {
  const dest = join(TMP, "pacote-v2");
  pacoteV2(dest);
  const a1 = adaptarExecucao(lerPacote(PACOTE_V1));
  const p2 = lerPacote(dest);
  assert.equal(p2.findings!.contract, "findings.v2");
  const a2 = adaptarExecucao(p2);
  const semHash = (x: typeof a1) => ({ ...x, data: { ...x.data, config: { ...x.data.config, evidenceIndexSha256: "-" } }, evidence: { ...x.evidence, integrity: undefined } });
  assert.deepEqual(semHash(a2), semHash(a1));
  assert.ok(!("inspection" in a2.data), "o registro não vai ao scorer");
});

await test("pacote: manifesto v1 com findings.v2, ou v2 sem declarar o registro, é recusado", () => {
  const d1 = join(TMP, "pacote-v1-com-v2");
  pacoteV2(d1, (m) => { m.contract = "artifact-manifest.v1"; delete m.inspectionStatus; m.schemaVersions = { ...m.schemaVersions as object, findings: "findings.v1" }; delete (m.schemaVersions as Record<string, unknown>).inspection; });
  assert.throws(() => lerPacote(d1), /findings/);
  const d2 = join(TMP, "pacote-v2-sem-declarar");
  pacoteV2(d2, (m) => { delete (m.schemaVersions as Record<string, unknown>).inspection; });
  assert.throws(() => lerPacote(d2), /x-inspection-version/);
});

// ───────────────────────────────────────────────────────────────── resumo

await test("resumo: v1 → registro indisponível (não zero); v2 sem registro → não enviado; nenhum vira cobertura", () => {
  const v1 = readJson<Findings>(join(EX, "valid", "findings--com.json"));
  const r1 = resumirInspecao(v1, null);
  assert.equal(r1.estado, "indisponivel");
  assert.match(r1.texto, /registro indisponível/);
  assert.match(r1.texto, /não é zero cobertura/);
  assert.equal(r1.declarado, null);
  assert.equal(resumirInspecao(null, null).estado, "indisponivel");
  const { inspection: _i, ...semRegistro } = v2Ex.report;
  const r2 = resumirInspecao({ ...v2Ex, inspectionStatus: "absent", report: semRegistro }, null);
  assert.equal(r2.estado, "nao-enviado");
  assert.match(r2.texto, /não é zero cobertura/);
  const r3 = resumirInspecao(readJson<FindingsV2>(join(EX, "valid", "findings--v2-registro-invalido.json")), null);
  assert.equal(r3.estado, "invalido");
  assert.equal(r3.declarado, null, "nada é contado de registro inválido");
  assert.match(r3.texto, /registro inválido .* achados aceitos normalmente; não é zero cobertura/);
});

/**
 * Evento no formato REAL da ponte (runner/container/bridge.mjs: `cap` → `{ text, truncated }`), com a
 * estrutura de um tool-events.ndjson arquivado (ensaio-agenda-01: browser_snapshot e scan_page), lido só.
 */
function evento(server: "playwright" | "oracle", tool: string, args: string, result: string, opts: { isError?: boolean; truncated?: boolean } = {}): string {
  return JSON.stringify({ seq: 4, at: "2026-10-04T04:02:52.941Z", server, kind: "call", tool, argsSha256: sha(args),
    args: { text: args, truncated: false }, window: server === "playwright" ? { width: 1280, height: 900 } : null,
    isError: opts.isError ?? false, outcome: opts.isError ? "tool-error" : "ok", durationMs: 1033, resultBytes: Buffer.byteLength(result),
    resultSha256: sha(result), result: { text: result, truncated: opts.truncated ?? false }, viewportAfter: server === "playwright" ? { width: 1280, height: 900 } : null });
}
const SNAPSHOT = "### Page\n- Page URL: http://screens:3300/fixture.html\n### Snapshot\n```yaml\n- generic [ref=e3]:\n  - dialog \"Fixture\" [ref=e12]:\n    - button \"Fechar\" [ref=e123]\n```";
const SCAN = "{\n  \"url\": \"http://screens:3300/fixture.html\",\n  \"scanId\": \"S-page-001\",\n  \"stateFingerprint\": \"sha256:33e6c348\"\n}";

function ledgerCom(originRef: string, evidence: string[]): FindingsV2 {
  const f = clone(v2Ex);
  const l = f.report.inspection!;
  l.states = [{ ...l.states[0], arrival: { status: "confirmed", observables: ["diálogo aberto"], originRef }, evidence }];
  l.regions = [];
  l.items = []; l.candidates = [];
  return f;
}

await test("comprovação: formato real da ponte; ref curto do navegador (sem) e id do validador (com) comprovados igual", () => {
  const sem = resumirInspecao(ledgerCom("e12", ["e12"]), evento("playwright", "browser_snapshot", "{}", SNAPSHOT));
  assert.equal(sem.comprovacao!.chegadasComprovadas, 1, "ref de 3 caracteres do navegador é comprovado");
  assert.deepEqual(sem.comprovacao!.referencias, { citadas: 1, comprovadas: 1, naoVerificaveis: 0, naoEncontradas: 0 });
  const com = resumirInspecao(ledgerCom("S-page-001", ["S-page-001"]),
    [evento("playwright", "browser_snapshot", "{}", SNAPSHOT), evento("oracle", "scan_page", "{\"url\":\"http://screens:3300/fixture.html\"}", SCAN)].join("\n"));
  assert.equal(com.comprovacao!.chegadasComprovadas, 1);
  assert.deepEqual(com.comprovacao!.referencias, { citadas: 1, comprovadas: 1, naoVerificaveis: 0, naoEncontradas: 0 });
  // token inteiro: `e12` não casa dentro de `e123`; `S-page-00` não casa dentro de `S-page-001`
  const so123 = SNAPSHOT.replace("[ref=e12]", "[ref=e99]");
  assert.equal(resumirInspecao(ledgerCom("e12", []), evento("playwright", "browser_snapshot", "{}", so123)).comprovacao!.chegadas!["nao-encontrado"].length, 1);
  assert.equal(resumirInspecao(ledgerCom("S-page-00", []), evento("oracle", "scan_page", "{}", SCAN)).comprovacao!.chegadasComprovadas, 0);
  // chamada com erro não comprova
  assert.equal(resumirInspecao(ledgerCom("e12", []), evento("playwright", "browser_snapshot", "{}", SNAPSHOT, { isError: true })).comprovacao!.chegadasComprovadas, 0);
});

await test("comprovação: texto cortado pela ponte e ref ausente → não verificável, nunca não encontrado", () => {
  const cortado = evento("playwright", "browser_snapshot", "{}", SNAPSHOT.slice(0, 40), { truncated: true });
  const r = resumirInspecao(ledgerCom("e77", ["e77"]), cortado);
  assert.deepEqual(r.comprovacao!.chegadas, { comprovado: [], "nao-verificavel": ["s1"], "nao-encontrado": [] });
  assert.deepEqual(r.comprovacao!.referencias, { citadas: 1, comprovadas: 0, naoVerificaveis: 1, naoEncontradas: 0 });
  assert.match(r.texto, /não verificável/);
  const inteiro = resumirInspecao(ledgerCom("e77", ["e77"]), evento("playwright", "browser_snapshot", "{}", SNAPSHOT));
  assert.deepEqual(inteiro.comprovacao!.referencias, { citadas: 1, comprovadas: 0, naoVerificaveis: 0, naoEncontradas: 1 });
});

await test("resumo: declaração separada da comprovação por evento; cobertura da página sempre desconhecida", () => {
  const r = resumirInspecao(v2Ex, evento("playwright", "browser_snapshot", "{}", "salvo em fixture-instantaneo-01.yml"));
  assert.equal(r.estado, "registrado");
  assert.equal(r.declarado!.coberturaDaPagina, "desconhecida");
  assert.equal(r.declarado!.universo, "regioes-declaradas-pelo-agente");
  assert.deepEqual(r.declarado!.regioes, { total: 2, inspecionadas: 1, parciais: 0, naoInspecionadas: 1, porOrigem: { browser: 1, "validation-tool": 1 } });
  assert.deepEqual(r.declarado!.estados, { total: 3, confirmados: 1, declarados: 1, naoAlcancados: 1 });
  assert.deepEqual(r.declarado!.candidatos.aceitos, 1);
  assert.equal(r.declarado!.achadosSemCandidato, 0);
  assert.equal(r.comprovacao!.chegadasComprovadas, 1);
  assert.doesNotMatch(r.texto, /100\s*%|página inteira/);
  assert.match(r.texto, /Cobertura da página: desconhecida/);
  const semEv = resumirInspecao(v2Ex, null);
  assert.equal(semEv.comprovacao!.estado, "sem-eventos");
  assert.equal(semEv.comprovacao!.chegadasComprovadas, null, "sem eventos: desconhecido, nunca 0");
});

await test("summary.md: execução legada mostra “registro indisponível”", () => {
  const exec = { braco: "sem", runId: "r", inspecao: resumirInspecao(readJson<Findings>(join(EX, "valid", "findings--com.json")), null) };
  const resumo = { formato: "resumo-analise-1.0.0", fixture: true, geradoEm: "-", revisao: { numero: 1, anterior: null },
    analise: { estado: "bloqueada", motivo: "fixture", tipo: "individual", avisos: [] }, linhaDeBase: null, comparacao: null, revisaoSemantica: null, versoes: null,
    hashes: { conteudoCientificoSha256: "-", pacoteRevisao: null, decisoes: null, entradas: {} }, arquivos: {},
    execucoes: [{ ...exec, tecnico: { status: "passed", ciclo: "collected", etapa: null, falha: null, submissao: "accepted", motivoRecusa: null },
      identidade: { tela: { id: "t", label: "t", version: "1" }, modelo: { familia: "f", pedido: "p", resolvido: "unknown", fonte: "unknown" }, esforco: "-", cliente: "-",
        inicioUtc: null, inicioLocal: null, commit: "-", repeticao: 1, tentativa: 1, campanha: "c", slot: "s", par: "p", fixture: true },
      pontuacao: { estado: "not-prepared", motivo: "-", metricas: {}, detalhe: null, linhaDeBase: null },
      mcpIsolamento: { isolamento: "passed", protocolo: "adherent", usoOraculo: "not-applicable", oraculoAnunciado: false, oraculo: null,
        chamadasOraculo: { valor: null, estado: "nao-se-aplica", fonte: null }, ferramentasAnunciadas: [], ferramentasObservadas: [],
        errosDeFerramenta: { valor: 0, estado: "medido", fonte: "-" }, checks: null, controlesPositivos: null, limitacoes: [] },
      custoTempo: Object.fromEntries(["wallClockSeconds", "inputTokens", "outputTokens", "cacheReadTokens", "cacheCreationTokens", "turns", "toolCalls",
        "oracleCalls", "estimatedCostUsd", "billedCostUsd"].map((k) => [k, { valor: null, estado: "indisponivel", fonte: null }])), achados: null, links: { pacote: ".", evidencias: [], logs: [] }, binding: "b" }],
  } as unknown as Resumo;
  const md = renderResumo(resumo);
  assert.match(md, /\| Registro de inspeção \| registro indisponível/);
  assert.doesNotMatch(md, /cobertura: 0/);
});

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${tests} testes do registro de inspeção ok`);
