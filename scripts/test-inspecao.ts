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
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTRACTS_DIR, type Findings, type FindingsV2, type InspectionLedger } from "../contracts/index";
import { coletorAceitaClausulas, collectorFindingsContract, skillPedeClausulas, coletorConfereRotas } from "../runner/run-once";
import { MIXED_ROUTES_MESSAGE, mixedRouteErrors, routeKey, ROUTE_GUARD_VERSION } from "../runner/container/route-guard.mjs";
import { collectorInspectionRevisionOf } from "../runner/build-images";
import { INSPECTION_CLAUSES_REVISION } from "../contracts/index";
import { ROOT } from "./adjudication";
import { adaptarExecucao, conteudoCientifico, lerPacote, renderResumo, type Resumo } from "./analisar-execucao";
import { auditarPacote } from "./auditar-inspecao";
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

async function withCollector(contract: string | null, fn: (post: (body: unknown) => Promise<{ status: number; body: { ok: boolean; errors?: unknown[] } }>, out: string) => Promise<void>, routeContext?: string) {
  const port = await freePort();
  const out = mkdtempSync(join(TMP, "coletor-"));
  const env: NodeJS.ProcessEnv = { ...process.env, COLLECTOR_RUN_ID: "fixture-run-01", COLLECTOR_CAMPAIGN_ID: "fixture-campanha-01", COLLECTOR_FIXTURE: "1",
    COLLECTOR_OUT: out, COLLECTOR_PORT: String(port), COLLECTOR_SCHEMAS: CONTRACTS_DIR };
  if (contract) env.COLLECTOR_FINDINGS_CONTRACT = contract; else delete env.COLLECTOR_FINDINGS_CONTRACT;
  if (routeContext) env.COLLECTOR_ROUTE_CONTEXT = routeContext; else delete env.COLLECTOR_ROUTE_CONTEXT;
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

// ───────────────────────────────────────────────────────────────── estado por cláusula (lista única 3.7.2, B2)

/** O registro do exemplo com `clauses` (revisão clauses-1): uma medida, uma violada (achado 0), uma que não se aplica. */
function comClausulas(l: InspectionLedger): InspectionLedger {
  const s = l.states[0].id;
  return { ...l, clauses: [
    { ref: "cl-001", state: s, status: "medida", measurement: "posição medida: x=12 à esquerda do conteúdo" },
    { ref: "cl-002", state: s, status: "violada", measurement: "botão à esquerda (x=201), conteúdo à direita (x=241)", findings: [0] },
    { ref: "cl-003", state: s, status: "nao-se-aplica", measurement: "o estado não tem o elemento que a cláusula exige" },
  ] };
}

await test("B2: coletor v2 aceita clauses (registro válido, achados iguais); registro sem o campo continua válido", async () => {
  await withCollector("findings.v2", async (post, out) => {
    const r = await post(report({ inspection: comClausulas(clone(LEDGER)) }));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const env = readJson<FindingsV2>(join(out, "findings.json"));
    assert.equal(env.inspectionStatus, "valid");
    assert.equal(env.inspectionContract, "inspection.v1", "o envelope não muda de versão");
    assert.equal(env.report.inspection!.clauses!.length, 3);
    assert.deepEqual(env.report.findings, v2Ex.report.findings);
  });
  await withCollector("findings.v2", async (post, out) => {
    assert.equal((await post(report())).status, 200);
    assert.equal(readJson<FindingsV2>(join(out, "findings.json")).inspectionStatus, "valid", "registro anterior à revisão, válido como antes");
  });
});

await test("B2: clauses fora do contrato → registro inválido guardado à parte, achados aceitos (nunca 400)", async () => {
  type Cl = NonNullable<InspectionLedger["clauses"]>[number];
  const casos: [string, (l: InspectionLedger) => void, RegExp][] = [
    ["status fora da lista", (l) => { (l.clauses![0] as { status: string }).status = "cumprida"; }, /clauses\/0\/status/],
    ["sem medição", (l) => { delete (l.clauses![0] as Partial<Cl>).measurement; }, /measurement/],
    ["violada sem achado", (l) => { delete l.clauses![1].findings; }, /findings/],
    ["violada com lista vazia", (l) => { l.clauses![1].findings = []; }, /x-violated-without-finding/],
    ["medida com achado", (l) => { l.clauses![0].findings = [0]; }, /x-finding-without-violation/],
    ["achado inexistente", (l) => { l.clauses![1].findings = [9]; }, /x-unknown-finding/],
    ["estado desconhecido", (l) => { l.clauses![2].state = "s9"; }, /x-unknown-state/],
    ["(ref, estado) repetido", (l) => { l.clauses![2].ref = "cl-001"; }, /x-unique/],
  ];
  for (const [nome, mut, re] of casos) {
    await withCollector("findings.v2", async (post, out) => {
      const l = comClausulas(clone(LEDGER));
      mut(l);
      const r = await post(report({ inspection: l }));
      assert.equal(r.status, 200, `${nome}: ${JSON.stringify(r.body)}`);
      const env = readJson<FindingsV2>(join(out, "findings.json"));
      assert.equal(env.inspectionStatus, "invalid", nome);
      assert.match(env.inspectionErrors!.join("; "), re, nome);
      assert.deepEqual(env.report.findings, v2Ex.report.findings, "achados intactos");
    });
  }
  // A mesma cláusula em outro estado é legítima (uma medição por estado).
  await withCollector("findings.v2", async (post, out) => {
    const l = comClausulas(clone(LEDGER));
    const outro = l.states.find((s) => s.id !== l.states[0].id);
    assert.ok(outro, "o exemplo tem mais de um estado");
    l.clauses!.push({ ref: "cl-001", state: outro.id, status: "medida", measurement: "a mesma posição, no outro estado" });
    assert.equal((await post(report({ inspection: l }))).status, 200);
    assert.equal(readJson<FindingsV2>(join(out, "findings.json")).inspectionStatus, "valid");
  });
});

await test("B2: coletor de imagem anterior (schemas sem clauses) degrada com graça: registro inválido, achados aceitos", async () => {
  const antigos = mkdtempSync(join(TMP, "schemas-antes-b2-"));
  cpSync(CONTRACTS_DIR, antigos, { recursive: true });
  const insp = readJson<{ properties: Record<string, unknown> }>(join(antigos, "inspection.v1.schema.json"));
  delete insp.properties.clauses;
  writeFileSync(join(antigos, "inspection.v1.schema.json"), JSON.stringify(insp));
  const port = await freePort();
  const out = mkdtempSync(join(TMP, "coletor-antigo-"));
  const child = spawn(process.execPath, [join(ROOT, "runner", "container", "collector.mjs")], { env: { ...process.env, COLLECTOR_RUN_ID: "fixture-run-01",
    COLLECTOR_CAMPAIGN_ID: "fixture-campanha-01", COLLECTOR_FIXTURE: "1", COLLECTOR_OUT: out, COLLECTOR_PORT: String(port), COLLECTOR_SCHEMAS: antigos,
    COLLECTOR_FINDINGS_CONTRACT: "findings.v2" }, stdio: ["ignore", "pipe", "pipe"] });
  try {
    await new Promise<void>((ok, fail) => {
      child.stdout!.on("data", (d) => { if (String(d).includes("coletor armado")) ok(); });
      child.on("exit", (c) => fail(new Error(`coletor saiu (${c})`)));
    });
    const r = await fetch(`http://127.0.0.1:${port}/api/submit`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(report({ inspection: comClausulas(clone(LEDGER)) })) });
    assert.equal(r.status, 200);
    const env = readJson<FindingsV2>(join(out, "findings.json"));
    assert.equal(env.inspectionStatus, "invalid");
    assert.match(env.inspectionErrors!.join("; "), /additional|clauses/);
    assert.deepEqual(env.report.findings, v2Ex.report.findings);
  } finally { child.kill(); }
});

await test("B2: harness — revisão medida no schema do coletor; skill que pede clauses exige o rótulo; skill sem o campo não exige nada", () => {
  assert.equal(collectorInspectionRevisionOf(), INSPECTION_CLAUSES_REVISION, "o schema do working tree tem clauses");
  assert.equal(coletorAceitaClausulas(undefined), false);
  assert.equal(coletorAceitaClausulas({ "govbr.collector.findings-contracts": "findings.v1,findings.v2" }), false, "imagem anterior à revisão");
  assert.equal(coletorAceitaClausulas({ "govbr.collector.inspection-revision": INSPECTION_CLAUSES_REVISION }), true);
  const skill = readFileSync(join(ROOT, "skills", "avaliar-tela", "SKILL.md"), "utf8");
  assert.equal(skillPedeClausulas(skill), true, "a skill vigente pede clauses");
  assert.equal(skillPedeClausulas(skill.split("`clauses`").join("`outro`")), false, "skill das campanhas coletadas: nada exigido");
  const lock = readJson<{ images: { collector: { labels: Record<string, string> } } }>(join(ROOT, "runner", "images.lock.json"));
  console.log(`   lock atual: coletor ${coletorAceitaClausulas(lock.images.collector.labels) ? "valida" : "NÃO valida"} ${INSPECTION_CLAUSES_REVISION} (reconstruir imagens antes da 1ª campanha com a skill nova)`);
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

await test("B2: pacote v2 com clauses → o scorer recebe a MESMA entrada que o v1 (nada do estado por cláusula vai ao scorer)", () => {
  const dest = join(TMP, "pacote-v2-clausulas");
  pacoteV2(dest);
  const f = readJson<FindingsV2>(join(dest, "findings.json"));
  f.report.inspection!.clauses = [{ ref: "cl-001", state: "s1", status: "medida", measurement: "medido" },
    { ref: "cl-002", state: "s1", status: "violada", measurement: "medido", findings: [0] }];
  writeFileSync(join(dest, "findings.json"), JSON.stringify(f, null, 2) + "\n");
  const m = readJson<{ files: { path: string; bytes: number; sha256: string }[] }>(join(dest, "artifact-manifest.json"));
  for (const file of m.files) if (file.path === "findings.json") { const b = readFileSync(join(dest, "findings.json")); file.bytes = b.length; file.sha256 = sha(b); }
  writeFileSync(join(dest, "artifact-manifest.json"), JSON.stringify(m, null, 2) + "\n");
  const a1 = adaptarExecucao(lerPacote(PACOTE_V1));
  const a2 = adaptarExecucao(lerPacote(dest));
  const semHash = (x: typeof a1) => ({ ...x, data: { ...x.data, config: { ...x.data.config, evidenceIndexSha256: "-" } }, evidence: { ...x.evidence, integrity: undefined } });
  assert.deepEqual(semHash(a2), semHash(a1));
  assert.equal(auditarPacote(dest).registro, "registrado", "a auditoria lê o registro com clauses");
});

await test("NAT-84: auditoria do pacote lê o relatório do coletor; v2 auditado, v1 legado sem reconstrução; scorer intocado", () => {
  const dest = join(TMP, "pacote-v2-auditoria");
  pacoteV2(dest);
  const a2 = auditarPacote(dest);
  assert.equal(a2.registro, "registrado");
  assert.equal(a2.fonteDoRelatorio, "coletor");
  assert.ok(a2.parcial.motivos.includes("limitacao:budget"));
  const a1 = auditarPacote(PACOTE_V1);
  assert.equal(a1.registro, "indisponivel");
  assert.ok(a1.membros.every(m => m.destino === null));
  assert.ok(!("inspection" in adaptarExecucao(lerPacote(dest)).data), "a auditoria não vai ao scorer");
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

function routeContext(events: string[]): string {
  const dir = mkdtempSync(join(TMP, "rotas-"));
  writeFileSync(join(dir, "tool-events.ndjson"), events.join("\n") + "\n");
  return dir;
}
const scanEvent = (scan: string, url: string, extra: Record<string, unknown> = {}, args: Record<string, unknown> = {}) =>
  evento("oracle", "scan_page", JSON.stringify(args), JSON.stringify({ kind: "scan", scanId: scan, url, state: { observed: { url } }, ...extra }));
const routeReport = (...refs: string[]) => ({ findings: [{ evidence: refs }] });

await test("B1: rota segue sessão do oráculo: query/filtro não muda rota, fragmento SPA muda", () => {
  assert.equal(routeKey("HTTP://SCREENS:3300/a?q=1#tab"), "http://screens:3300/a");
  assert.equal(routeKey("http://screens:3300/a?q=1"), routeKey("http://screens:3300/a?q=2"));
  assert.equal(routeKey("http://screens:3300/a"), routeKey("http://screens:3300/a/"));
  assert.notEqual(routeKey("http://screens:3300/#/a"), routeKey("http://screens:3300/#/b"));
  assert.equal(routeKey("http://screens:3300/#!/a?filter=x"), "http://screens:3300/#!/a");
  assert.equal(routeKey("file:///out/findings.json"), null);
});

await test("B1: coletor recusa mistura antes de aceitar, preserva recusa e aceita reenvio corrigido", async () => {
  const dir = routeContext([scanEvent("S-one", "http://screens:3300/a"), scanEvent("S-two", "http://screens:3300/b")]);
  await withCollector("findings.v2", async (post, out) => {
    const r = report();
    r.findings = [{ ...clone(v2Ex.report.findings[0]), evidence: ["S-one", "S-two"] }];
    const refused = await post(r);
    assert.equal(refused.status, 400);
    assert.ok(JSON.stringify(refused.body).includes("mixed-routes"));
    // 1.0.1: a recusa diz o que fazer com o fato da outra rota (achado próprio, enviado à parte), não só "separe"
    const msg = (refused.body as { errors: { message: string }[] }).errors[0].message;
    assert.equal(msg, MIXED_ROUTES_MESSAGE);
    assert.match(msg, /outra rota ou estado é um achado próprio dessa rota ou estado/);
    assert.match(msg, /envie-o como achado separado/);
    assert.match(msg, /em vez de juntá-lo ao texto de um achado de outra rota/);
    assert.equal(ROUTE_GUARD_VERSION, "collector-route-guard-1.0.1");
    assert.equal(existsSync(join(out, "findings.json")), false);
    assert.ok(readFileSync(join(out, "refused/001.json"), "utf8").includes("S-two"));
    r.findings[0].evidence = ["S-one"];
    assert.equal((await post(r)).status, 200);
    assert.deepEqual(readJson<FindingsV2>(join(out, "findings.json")).report.findings[0].evidence, ["S-one"]);
  }, dir);
});

await test("B1: estados/filtros da mesma rota passam; rota SPA diferente conflita; norma não vincula rota", () => {
  const dir = routeContext([
    scanEvent("S-one", "http://screens:3300/a?q=1#one"), scanEvent("S-two", "http://screens:3300/a?q=1#two"),
    scanEvent("S-three", "http://screens:3300/a?q=2"), scanEvent("S-spa", "http://screens:3300/a#/other"),
    evento("oracle", "get_ds_rules", "{}", JSON.stringify({ scanId: "normative-ref", url: "http://screens:3300/other" })),
  ]);
  assert.deepEqual(mixedRouteErrors(routeReport("S-one", "S-two", "normative-ref"), dir).errors, []);
  assert.deepEqual(mixedRouteErrors(routeReport("S-one", "S-three"), dir).errors, []);
  assert.equal(mixedRouteErrors(routeReport("S-one", "S-spa"), dir).errors.length, 1);
  assert.deepEqual(mixedRouteErrors(routeReport("S-one-extended", "S-three"), dir).errors, []);
});

await test("B1: só ids estruturados próprios são vinculados; colisão fica ambígua", () => {
  const dir = routeContext([
    scanEvent("S-one", "http://screens:3300/a", { findings: [{ id: "F-one", element: { page: "http://screens:3300/a" } }],
      observations: [{ pendingId: "P-one" }], families: [{ familyId: "G-shared", memberIds: ["F-member"] }],
      alsoIn: [{ scanId: "S-two", route: "http://screens:3300/b" }] }),
    scanEvent("S-two", "http://screens:3300/b", { families: [{ familyId: "G-shared", memberIds: ["F-two"] }] }),
  ]);
  for (const first of ["F-one", "P-one", "F-member"]) assert.equal(mixedRouteErrors(routeReport(first, "F-two"), dir).errors.length, 1);
  assert.deepEqual(mixedRouteErrors(routeReport("G-shared", "S-one", "unknown"), dir).errors, []);
  assert.equal(mixedRouteErrors(routeReport("S-one", "S-two"), dir).errors.length, 1, "alsoIn não contamina S-two");
});

await test("B1: payload completo exige hash/tamanho e caminho contido, sem ler caminho externo", () => {
  const original = JSON.parse(scanEvent("S-one", "http://screens:3300/a"));
  const bytes = Buffer.from(original.result.text);
  original.result = { text: "{", truncated: true, payload: { status: "complete", path: "payloads/full.txt", bytes: bytes.length, sha256: sha(bytes) } };
  const other = scanEvent("S-two", "http://screens:3300/b");
  const dir = routeContext([JSON.stringify(original), other]);
  mkdirSync(join(dir, "payloads")); writeFileSync(join(dir, "payloads/full.txt"), bytes);
  assert.equal(mixedRouteErrors(routeReport("S-one", "S-two"), dir).errors.length, 1);
  writeFileSync(join(dir, "payloads/full.txt"), "alterado");
  assert.deepEqual(mixedRouteErrors(routeReport("S-one", "S-two"), dir).errors, []);
  original.result.payload.path = "../outside.txt";
  writeFileSync(join(dir, "tool-events.ndjson"), [JSON.stringify(original), other].join("\n"));
  assert.deepEqual(mixedRouteErrors(routeReport("S-one", "S-two"), dir).errors, []);
});

await test("B1: navegação usa URL final medida; URL inicial sem observação não decide rota", () => {
  const args = { actions: [{ action: "navigate", url: "http://screens:3300/b" }] };
  const dir = routeContext([
    scanEvent("S-final", "http://screens:3300/a", { state: { observed: { url: "http://screens:3300/b" } } }, args),
    scanEvent("S-incomplete", "http://screens:3300/a", { state: undefined }, args),
    scanEvent("S-one", "http://screens:3300/a"),
  ]);
  assert.equal(mixedRouteErrors(routeReport("S-one", "S-final"), dir).errors.length, 1);
  assert.deepEqual(mixedRouteErrors(routeReport("S-one", "S-incomplete"), dir).errors, []);
});

await test("B1: contexto ausente, erro e payload incompleto não inventam conflito; capacidade antiga não afirma gate", () => {
  assert.equal(mixedRouteErrors(routeReport("S-one", "S-two")).checked, false);
  const bad = JSON.parse(scanEvent("S-two", "http://screens:3300/b")); bad.result.truncated = true;
  const dir = routeContext([scanEvent("S-one", "http://screens:3300/a"), JSON.stringify(bad),
    evento("oracle", "scan_page", "{}", JSON.stringify({ scanId: "S-error", url: "http://screens:3300/b" }), { isError: true })]);
  const result = mixedRouteErrors(routeReport("S-one", "S-two", "S-error"), dir);
  assert.deepEqual(result.errors, []); assert.ok(result.unavailable > 0);
  assert.equal(coletorConfereRotas(undefined), false);
  assert.equal(coletorConfereRotas({ "govbr.collector.route-guard": "old" }), false);
  assert.equal(coletorConfereRotas({ "govbr.collector.route-guard": ROUTE_GUARD_VERSION }), true);
});

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

await test("NAT-82: com o payload integral conferido, ref depois dos 4.000 caracteres é comprovado; sem ele, continua não verificável", () => {
  const longo = `${"- generic [ref=e1]\n".repeat(400)}  - dialog "Fixture" [ref=e777]\n`;
  assert.ok(longo.indexOf("e777") > 4000);
  const payload = { status: "complete", path: "evidence/raw/browser/payloads/playwright-000000-result.txt", mediaType: "text/plain",
    bytes: Buffer.byteLength(longo), sha256: sha(longo), totalBytes: Buffer.byteLength(longo), limitBytes: 2 * 1024 * 1024 };
  const ev = JSON.parse(evento("playwright", "browser_snapshot", "{}", longo.slice(0, 4000), { truncated: true })) as Record<string, { payload?: unknown }>;
  ev.resultSha256 = sha(longo) as never;
  ev.resultBytes = Buffer.byteLength(longo) as never;
  ev.result.payload = payload;
  const linha = JSON.stringify(ev);
  // leitor sem payload (pacote antigo ou payload não fornecido) → igual ao D-116
  assert.deepEqual(resumirInspecao(ledgerCom("e777", []), linha).comprovacao!.chegadas!["nao-verificavel"], ["s1"]);
  // com o payload conferido → comprovado; ref inexistente agora é não encontrado (nada mais está cortado)
  const integral = new Map([[payload.path, longo]]);
  assert.equal(resumirInspecao(ledgerCom("e777", []), linha, integral).comprovacao!.chegadasComprovadas, 1);
  assert.deepEqual(resumirInspecao(ledgerCom("e778", []), linha, integral).comprovacao!.chegadas!["nao-encontrado"], ["s1"]);
  // payload truncado (acima do limite declarado) continua cortado: ref ausente segue não verificável
  const trunc = JSON.stringify({ ...ev, result: { ...ev.result, payload: { ...payload, status: "truncated" } } });
  assert.deepEqual(resumirInspecao(ledgerCom("e778", []), trunc, integral).comprovacao!.chegadas!["nao-verificavel"], ["s1"]);

  // pacote: lerPacote confere o payload e o entrega ao resumo; adulteração recusa o pacote
  const dest = join(TMP, "pacote-v2-payload");
  pacoteV2(dest, (m) => {
    const files = m.files as { path: string; bytes: number; sha256: string; mediaType: string; role: string }[];
    const te = files.find(f => f.role === "tool-events")!;
    const body = readFileSync(join(dest, te.path), "utf8") + linha + "\n";
    writeFileSync(join(dest, te.path), body);
    te.bytes = Buffer.byteLength(body); te.sha256 = sha(body);
    mkdirSync(join(dest, "evidence/raw/browser/payloads"), { recursive: true });
    writeFileSync(join(dest, payload.path), longo);
    files.push({ path: payload.path, bytes: payload.bytes, sha256: payload.sha256, mediaType: "text/plain", role: "tool-payload" });
  });
  const lido = lerPacote(dest);
  assert.equal(lido.toolPayloads.get(payload.path), longo);
  writeFileSync(join(dest, payload.path), longo.replace("e777", "e778"));
  assert.throws(() => lerPacote(dest), /hash ou tamanho diverge do manifesto/);
  // manifesto "consertado" para o arquivo adulterado: o evento ainda cita o hash original → recusado
  const mPath = join(dest, "artifact-manifest.json");
  const m = readJson<{ files: { path: string; sha256: string }[] }>(mPath);
  m.files.find(f => f.path === payload.path)!.sha256 = sha(longo.replace("e777", "e778"));
  writeFileSync(mPath, JSON.stringify(m, null, 2) + "\n");
  assert.throws(() => lerPacote(dest), /payloads da ponte.*diverge do manifesto/);
  // pacote legado (sem payload) continua lido, sem nada reconstruído
  assert.equal(lerPacote(PACOTE_V1).toolPayloads.size, 0);
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

await test("NAT-84: a auditoria (texto, versão, contagens) fica fora do hash científico; o registro continua dentro", () => {
  const dest = join(TMP, "pacote-v2-hash");
  pacoteV2(dest);
  const base = resumirInspecao(lerPacote(dest).findings, null);
  const auditoria = { versao: "auditoria-inspecao-1.0.0", texto: "a", destinos: { accepted: 0, rejected: 0, uncertain: 0, "not-examined": 0, semRegistro: 0 },
    naoRecebidos: 0, parcial: { parcial: false, motivos: [], candidatosRecebidos: 0, candidatosConhecidos: 0, candidatosConhecidosNaoRevisados: 0 }, sinalizadas: {} };
  const resumo = (inspecao: unknown) => ({ formato: "f", fixture: true, analise: null, linhaDeBase: null, comparacao: null, versoes: null, revisaoSemantica: null,
    execucoes: [{ runId: "r", links: {}, inspecao }] }) as unknown as Resumo;
  const h = (x: unknown) => sha(JSON.stringify(conteudoCientifico(resumo(x))));
  const h1 = h({ ...base, auditoria });
  assert.equal(h({ ...base, auditoria: { ...auditoria, versao: "auditoria-inspecao-9.9.9", texto: "outro texto", naoRecebidos: 7, sinalizadas: { x: 1 } } }), h1);
  assert.equal(h(base), h1, "sem auditoria = mesmo hash");
  assert.notEqual(h({ ...base, texto: "registro diferente", auditoria }), h1, "o registro em si continua no hash");
});

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${tests} testes do registro de inspeção ok`);
