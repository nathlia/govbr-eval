/**
 * T3a/T3b — testes do runner isolado (runner/run-once.ts) com o agente roteirizado e com o cliente real
 * (Claude Code) contra o dublê roteirizado da API. Nenhuma chamada a modelo, nenhuma credencial real.
 * Exige Docker; sem Docker, pula com aviso (código 0).
 *
 *   npm run test:runner [-- --manter] [--so honesto,proibido,...]
 *
 * Cada caso roda run-once de verdade (contêineres, redes internas, sonda, agente, desmontagem) e
 * confere o PACOTE: contratos (validateContract + crossCheckRun), hashes do artifact-manifest contra
 * os bytes, estados do run e as provas do lado do harness (logs da ponte, dos proxies e do coletor),
 * não só o que o agente roteirizado diz de si.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateContract, crossCheckRun, type ArtifactManifest, type Findings, type Isolation, type Run } from "../contracts/index";
import { runOnce, type RunOptions, type RunOutcome } from "../runner/run-once";
import { DEFAULT_TELAS_DIR, DEFAULT_VALIDATOR_DIR, docker, dockerAvailable, sha256 } from "../runner/lib";
import { FAKE_CREDENTIAL, forbiddenCalls, type ClientTelemetry, type StubSummary } from "../runner/cliente-claude";

/** Modelo pedido ao dublê: um id que não existe, para nunca parecer dado. */
const STUB_MODEL = "claude-opus-duble-teste";
interface ClienteDoc { client: ClientTelemetry; stub: StubSummary | null; providerConnectsDuringAgent: { target: string; allowed: boolean; status: number | null }[] }

const args = process.argv.slice(2);
const keep = args.includes("--manter");
const only = args.includes("--so") ? args[args.indexOf("--so") + 1].split(",") : null;
const ROOT = mkdtempSync(join(tmpdir(), "govbr-test-runner-"));
const results: { name: string; ok: boolean; ms: number; detail?: string }[] = [];
const timings: { run: string; seconds: number }[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  if (only && !only.some((o) => name.startsWith(o))) return;
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - t0, detail: (error as Error).message });
    console.log(`FAIL ${name}\n     ${(error as Error).message.split("\n").join("\n     ")}`);
  }
}

let counter = 0;
async function run(partial: Partial<RunOptions> & Pick<RunOptions, "braco">, tag: string): Promise<RunOutcome> {
  const saida = join(ROOT, `${String(++counter).padStart(2, "0")}-${tag}`);
  const t0 = Date.now();
  const outcome = await runOnce({
    tela: "solicitacao", modelo: "agente-roteirizado", esforco: "nao-se-aplica", limiteSeg: 300, saida, agente: "fake", cenario: "honesto",
    permitirModelo: false, campanha: "t3a-teste", slot: `slot-${counter}`, par: "par-01", tentativa: 1, repeticao: 1, egress: "stub",
    telasDir: DEFAULT_TELAS_DIR, validatorDir: DEFAULT_VALIDATOR_DIR, log: (l) => console.log(`     · ${l}`), ...partial,
  });
  timings.push({ run: `${tag} (${partial.braco})`, seconds: Math.round((Date.now() - t0) / 1000) });
  return outcome;
}

const read = <T>(dir: string, f: string): T => JSON.parse(readFileSync(join(dir, f), "utf8")) as T;
const ndjson = (p: string): Record<string, unknown>[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []);
const fakeOut = (dir: string): { attempts: { id: string; via: string; target: string; outcome: string; detail: unknown }[]; fingerprints: Record<string, unknown>; submission: unknown; idempotent?: { status: number; body: string } } =>
  read(dir, "evidence/raw/agent/fake-agent.json");

/** Pacote inteiro: contratos, vínculos entre documentos, manifesto contra os bytes, nada fora do manifesto. */
function assertPackage(o: RunOutcome): { run: Run; isolation: Isolation | null; findings: Findings | null } {
  assert.deepEqual(o.problems, [], `run-once relatou problemas no pacote: ${o.problems.join("; ")}`);
  const run = read<Run>(o.runDir, "run.json");
  const manifest = read<ArtifactManifest>(o.runDir, "artifact-manifest.json");
  const isolation = existsSync(join(o.runDir, "isolation.json")) ? read<Isolation>(o.runDir, "isolation.json") : null;
  const findings = existsSync(join(o.runDir, "findings.json")) ? read<Findings>(o.runDir, "findings.json") : null;
  for (const doc of [run, manifest, isolation, findings]) {
    if (!doc) continue;
    const v = validateContract(doc);
    assert.ok(v.valid, `${(doc as { contract: string }).contract}: ${JSON.stringify(v.errors).slice(0, 600)}`);
  }
  assert.deepEqual(crossCheckRun(run, findings, isolation), []);
  const listed = new Set(manifest.files.map((f) => f.path));
  for (const f of manifest.files) {
    const body = readFileSync(join(o.runDir, f.path));
    assert.equal(sha256(body), f.sha256, `hash de ${f.path}`);
    assert.equal(body.length, f.bytes, `tamanho de ${f.path}`);
  }
  const walk = (d: string, p = ""): string[] => readdirSync(join(d, p), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d, p ? `${p}/${e.name}` : e.name) : [p ? `${p}/${e.name}` : e.name]);
  for (const f of walk(o.runDir)) if (f !== "artifact-manifest.json") assert.ok(listed.has(f), `arquivo fora do manifesto: ${f}`);
  assert.ok(!existsSync(join(o.runDir, ".work")), "pasta de trabalho sobrou no pacote");
  assert.equal(docker(["ps", "-aq", "--filter", `label=govbr.run=${run.runId}`]).stdout.trim(), "", "contêiner da execução sobreviveu");
  assert.equal(docker(["network", "ls", "-q", "--filter", `label=govbr.run=${run.runId}`]).stdout.trim(), "", "rede da execução sobreviveu");
  return { run, isolation, findings };
}

const pkgs: Record<string, RunOutcome> = {};

/**
 * Paridade entre braços: texto da tarefa byte a byte; configuração efetiva de todos os contêineres igual
 * (o com só acrescenta o oráculo); configuração MCP difere só na entrada do oráculo; run.json só na allowlist.
 */
function assertParity(a: RunOutcome | undefined, b: RunOutcome | undefined): void {
  assert.ok(a && b, "precisa dos dois pacotes (sem e com)");
  assert.equal(readFileSync(join(a.runDir, "evidence/prompt.txt"), "utf8"), readFileSync(join(b.runDir, "evidence/prompt.txt"), "utf8"));
  const ca = read<Record<string, unknown>>(a.runDir, "evidence/container-config.json");
  const cb = read<Record<string, unknown>>(b.runDir, "evidence/container-config.json");
  assert.deepEqual(Object.keys(cb).filter((k) => !(k in ca)), ["oracle"], "contêiner extra do braço com");
  assert.deepEqual(Object.keys(ca).filter((k) => !(k in cb)), []);
  for (const role of Object.keys(ca)) {
    const strip = (c: unknown, r: string): unknown => {
      const x = JSON.parse(JSON.stringify(c)) as { env: string[] };
      // PROBE_CONFIG é configuração do harness (diz à sonda se o oráculo deve existir), não do agente.
      if (r === "probe") x.env = x.env.filter((e) => !e.startsWith("PROBE_CONFIG="));
      return x;
    };
    assert.deepEqual(strip(cb[role], role), strip(ca[role], role), `configuração de ${role} difere entre braços`);
  }
  const ma = read<{ mcpServers: Record<string, unknown> }>(a.runDir, "evidence/mcp-config.json").mcpServers;
  const mb = read<{ mcpServers: Record<string, unknown> }>(b.runDir, "evidence/mcp-config.json").mcpServers;
  assert.deepEqual(Object.keys(mb).filter((k) => !(k in ma)), ["govbr-ds-validator"]);
  assert.deepEqual(mb.playwright, ma.playwright);
  const flat = (o: unknown, p = ""): Record<string, string> => (o && typeof o === "object" && !Array.isArray(o))
    ? Object.assign({}, ...Object.entries(o as Record<string, unknown>).map(([k, v]) => flat(v, p ? `${p}.${k}` : k))) : { [p]: JSON.stringify(o) };
  const fa = flat(read(a.runDir, "run.json"));
  const fb = flat(read(b.runDir, "run.json"));
  const ALLOW = [/^runId$/, /^slotId$/, /^idempotencyKey$/, /^arm$/, /^intervention\.oracle/, /^timestamps\./, /^status\.oracleUsage$/, /^usage\./];
  const diff = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => fa[k] !== fb[k]);
  const unexpected = diff.filter((k) => !ALLOW.some((re) => re.test(k)));
  assert.deepEqual(unexpected, [], `campos de run.json fora da allowlist diferem: ${unexpected.join(", ")}`);
  console.log(`     · diferenças permitidas em run.json: ${diff.join(", ")}`);
}

async function main(): Promise<void> {
  const d = dockerAvailable();
  if (!d.ok) {
    console.log(`PULADO: Docker indisponível (${d.detail}). O test:runner precisa do Docker Desktop/daemon em execução.`);
    process.exit(0);
  }
  console.log(`Docker ${d.detail}; pacotes em ${ROOT}`);

  for (const braco of ["sem", "com"] as const) {
    await test(`honesto ${braco}: 1 achado aceito, isolamento comprovado, pacote válido`, async () => {
      const o = await run({ braco, cenario: "honesto" }, `honesto-${braco}`);
      pkgs[`honesto-${braco}`] = o;
      const { run: r, isolation, findings } = assertPackage(o);
      assert.equal(r.status.technical, "passed");
      assert.equal(r.status.isolation, "passed");
      assert.equal(r.submission.status, "accepted");
      assert.equal(findings?.report.findings.length, 1);
      assert.deepEqual(findings?.report.findings[0].state.viewport, { width: 1280, height: 900 }, "viewport medido na janela fixa");
      assert.equal(r.status.oracleUsage, braco === "sem" ? "absent-verified" : "used-adherent");
      assert.equal(isolation?.toolInventory.oracleAnnounced, braco === "com");
      assert.ok(!isolation?.toolInventory.announced.includes("browser_resize") && !isolation?.toolInventory.announced.includes("browser_run_code"));
      if (braco === "com") assert.ok(isolation?.toolInventory.observed.includes("scan_page"), "chamada ao oráculo registrada pela ponte");
      assert.equal(r.usage.oracleCalls.value, braco === "sem" ? 0 : 2);
      assert.equal(r.fixture, true, "execução do agente roteirizado é fixture, nunca dado científico");
    });
  }

  await test("paridade entre braços: só o oráculo e identificadores técnicos diferem", async () => {
    assertParity(pkgs["honesto-sem"], pkgs["honesto-com"]);
  });

  await test("vazio: findings: [] aceito é resultado válido, distinto de ausência", async () => {
    const o = await run({ braco: "sem", cenario: "vazio" }, "vazio");
    const { run: r, findings } = assertPackage(o);
    assert.equal(r.status.technical, "passed");
    assert.equal(r.submission.status, "accepted");
    assert.deepEqual(findings?.report.findings, []);
  });

  await test("sem envio: estado none, falha no-submission, nunca zero achados", async () => {
    const o = await run({ braco: "sem", cenario: "sem-envio" }, "sem-envio");
    const { run: r, findings } = assertPackage(o);
    assert.equal(findings, null);
    assert.equal(r.submission.status, "none");
    assert.equal(r.status.technical, "failed");
    assert.equal(r.failure?.reason, "no-submission");
    assert.equal(r.status.score, "not-applicable");
  });

  await test("malformado: recusado, corpo arquivado, output-malformed", async () => {
    const o = await run({ braco: "com", cenario: "malformado" }, "malformado");
    const { run: r, findings } = assertPackage(o);
    assert.equal(findings, null);
    assert.equal(r.submission.status, "refused");
    assert.equal(r.failure?.reason, "output-malformed");
    const archived = read<{ body: string }>(o.runDir, r.submission.refusal!.archivedBody);
    assert.equal(archived.body, '{"timestamp": "x", "findings": [', "corpo original byte a byte");
  });

  for (const braco of ["sem", "com"] as const) {
    await test(`proibido ${braco}: cada tentativa recusada pelo sistema e registrada pelo harness`, async () => {
      const o = await run({ braco, cenario: "proibido" }, `proibido-${braco}`);
      pkgs[`proibido-${braco}`] = o;
      const { run: r, isolation } = assertPackage(o);
      assert.equal(r.status.technical, "passed");
      assert.equal(r.status.isolation, "passed");
      const f = fakeOut(o.runDir);
      const reached = f.attempts.filter((a) => a.outcome !== "refused");
      assert.deepEqual(reached.map((a) => `${a.id} ${a.target}`), [], "tentativas que alcançaram o alvo");
      const ids = new Set(f.attempts.map((a) => a.id));
      for (const id of ["ler-sentinela", "ler-outra-execucao", "escrever-fora-da-saida", "tcp-direto", "dns-externo", "egress-fora-da-allowlist", "navegar",
        "fetch-na-pagina", "resize-direto", "resize-por-codigo", "resize-pela-pagina", "zoom-pela-pagina", "janela-inalterada", "coletor-listar",
        "coletor-ler", "coletor-travessia", "coletor-run-id-errado", "coletor-tamanho", "coletor-sobrescrita"]) assert.ok(ids.has(id), `tentativa ausente: ${id}`);
      assert.ok(ids.has(braco === "sem" ? "oraculo-direto" : "oraculo-fora-da-tela"));
      // idempotência: o mesmo relatório de novo devolve o mesmo recibo
      assert.equal(f.idempotent?.status, 200);
      assert.match(f.idempotent!.body, /"duplicate":true/);
      // lado do harness: a ponte registrou as recusas da janela e do file://
      const events = ndjson(join(o.runDir, "tool-events.ndjson"));
      const refused = events.filter((e) => e.kind === "refused").map((e) => `${String(e.tool)}:${String(e.reason)}`);
      for (const want of ["browser_resize:ferramenta-oculta", "browser_run_code:ferramenta-oculta", "browser_evaluate:janela-fixa", "browser_navigate:esquema-recusado"]) {
        assert.ok(refused.includes(want), `ponte não registrou ${want}`);
      }
      if (braco === "sem") assert.ok(refused.includes("scan_page:ferramenta-oculta"));
      assert.equal(events.filter((e) => e.kind === "drift").length, 0, "janela derivou");
      // proxies: as navegações http proibidas morreram no proxy do navegador; o processo, no do provedor
      const site = ndjson(join(o.runDir, "evidence/raw/egress-site/egress.ndjson"));
      for (const t of ["http://example.com:80/", "http://host.docker.internal:", "http://127.0.0.1:8931/health", "http://screens:3000/", "http://collector:4000/"]) {
        assert.ok(site.some((e) => e.allowed === false && String(e.target).startsWith(t)), `proxy do navegador não registrou recusa para ${t}`);
      }
      assert.ok(site.every((e) => e.allowed === false || /^http:\/\/(screens:3300|collector:8080)\//.test(String(e.target)) || e.kind === "start"), "proxy do navegador deixou passar outro destino");
      const prov = ndjson(join(o.runDir, "evidence/raw/egress-provider/egress.ndjson"));
      assert.ok(prov.some((e) => e.allowed === false && e.target === "example.com:443"));
      // coletor: listagem/leitura 404, travessia 400, run id errado e sobrescrita 409, tamanho 413
      const coll = ndjson(join(o.runDir, "evidence/raw/collector/events.ndjson")).map((e) => `${String(e.status)}:${String(e.reason ?? "")}`);
      for (const want of ["404:sem-rota", "400:caminho-recusado", "409:run-id-errado", "409:sobrescrita", "413:tamanho", "200:duplicado"]) assert.ok(coll.includes(want), `coletor sem ${want}`);
      // isolation.json traz o inventário efetivo e as capacidades recusadas observadas
      assert.ok(isolation!.capabilitiesObserved.some((c) => c.includes("browser_resize")));
      assert.ok(isolation!.capabilitiesObserved.some((c) => c.includes("egress-site")));
      assert.ok(isolation!.capabilitiesObserved.some((c) => c.includes("coletor")));
      // controle positivo: o alvo existia (sentinelas no host, host alcançável por contêiner comum, outras saídas)
      for (const id of ["sentinelas-no-host", "host-alcancavel-fora-da-politica", "arquivo-local-do-navegador", "outras-saidas-existem", "egress-allowlist"]) {
        assert.equal(isolation!.positiveControls.find((p) => p.id === id)?.outcome, "passed", `controle positivo ${id}`);
      }
    });
  }

  await test("estado entre execuções: marcador da 1ª não aparece na 2ª; estado inicial igual", async () => {
    const o1 = await run({ braco: "sem", cenario: "marcador" }, "marcador");
    assertPackage(o1);
    const o2 = await run({ braco: "sem", cenario: "conferir-marcador", outrasSaidas: [o1.runDir] }, "conferir-marcador");
    const { isolation } = assertPackage(o2);
    const f1 = fakeOut(o1.runDir).fingerprints as { initial: Record<string, unknown>; afterMarking: Record<string, unknown>; tmpMarker: string; homeMarker: string };
    const f2 = fakeOut(o2.runDir).fingerprints as { initial: Record<string, unknown>; tmpMarker: string; homeMarker: string };
    assert.equal(f1.afterMarking.marker, "run-1", "o marcador foi de fato gravado na 1ª execução");
    assert.match(String(f1.afterMarking.cookie), /govbr-marcador=run-1/);
    assert.equal(f2.initial.marker, null, "marcador de localStorage sobreviveu");
    assert.doesNotMatch(String(f2.initial.cookie), /govbr-marcador/, "cookie sobreviveu");
    assert.equal(f2.tmpMarker, "absent", "/tmp sobreviveu");
    assert.equal(f2.homeMarker, "absent", "HOME sobreviveu");
    assert.deepEqual(f2.initial, f1.initial, "impressão digital do estado inicial difere");
    // a 2ª tentou ler a saída da 1ª (que existe no host) e não conseguiu
    assert.equal(isolation!.positiveControls.find((p) => p.id === "outras-saidas-existem")?.outcome, "passed");
    assert.equal(isolation!.checks.find((c) => c.id === "saida-de-outra-execucao-1")?.outcome, "passed");
  });

  await test("limite de tempo: grupo morto, interrupted/timeout, evidência preservada", async () => {
    const o = await run({ braco: "com", cenario: "travar", limiteSeg: 25 }, "travar");
    const { run: r } = assertPackage(o);
    assert.equal(r.status.technical, "interrupted");
    assert.equal(r.lifecycle.state, "interrupted");
    assert.equal(r.failure?.reason, "timeout");
    assert.equal(r.submission.status, "none");
    assert.ok(ndjson(join(o.runDir, "tool-events.ndjson")).some((e) => e.kind === "call" && e.tool === "browser_navigate"), "eventos de ferramenta preservados");
    assert.ok(existsSync(join(o.runDir, "evidence/raw/agent/fake-agent.json")) && existsSync(join(o.runDir, "evidence/logs/agent.log")), "saída e log do agente preservados");
    assert.ok(r.usage.wallClockSeconds.value !== null && r.usage.wallClockSeconds.value >= 25 && r.usage.wallClockSeconds.value < 60);
  });

  await test("larguras declaradas: um navegador por largura, cada um no tamanho fixo", async () => {
    const o = await run({ braco: "sem", cenario: "larguras", larguras: ["1280x900", "390x844"] }, "larguras");
    const { run: r } = assertPackage(o);
    assert.equal(r.status.technical, "passed");
    const prompt = readFileSync(join(o.runDir, "evidence/prompt.txt"), "utf8");
    assert.match(prompt, /a janela inicial \(1280×900\) e 390×844/);
    assert.match(prompt, /browser_select_window/);
    const f = fakeOut(o.runDir).fingerprints as { windows: { width: number; height: number }[] };
    assert.deepEqual(f.windows, [{ width: 1280, height: 900 }, { width: 390, height: 844 }]);
    assert.equal(ndjson(join(o.runDir, "tool-events.ndjson")).filter((e) => e.kind === "drift").length, 0);
  });

  await test("preflight falho: site alterado → not-run, nenhum contêiner criado", async () => {
    const fake = join(ROOT, "telas-alteradas");
    mkdirSync(fake, { recursive: true });
    cpSync(join(DEFAULT_TELAS_DIR, "skills"), join(fake, "skills"), { recursive: true });
    const manifest = readFileSync(join(DEFAULT_TELAS_DIR, "site-manifest.json"), "utf8");
    writeFileSync(join(fake, "site-manifest.json"), manifest.replace('"fixture": false', '"fixture": false ').trimEnd() + "\n");
    const o = await run({ braco: "sem", telasDir: fake }, "preflight-falho");
    const { run: r } = assertPackage(o);
    assert.equal(r.status.technical, "not-run");
    assert.equal(r.lifecycle.stage, "preflight");
    assert.equal(r.failure?.reason, "preflight-failed");
    assert.equal(r.timestamps.startedAt, null);
    assert.ok(!existsSync(join(o.runDir, "evidence/logs")), "nenhum contêiner devia ter sido criado");
  });

  await test("cliente real (provedor real) recusa partir sem --permitir-modelo e credencial", async () => {
    const saved = Object.fromEntries(["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"].map((k) => [k, process.env[k]]));
    for (const k of Object.keys(saved)) delete process.env[k];
    try {
      const o = await run({ braco: "sem", agente: "claude", egress: "real", modelo: "claude-opus-teste", esforco: "high" }, "claude-recusado");
      const { run: r } = assertPackage(o);
      assert.equal(r.status.technical, "not-run");
      assert.match(r.failure!.detail, /cliente-real-autorizado/);
      assert.ok(!existsSync(join(o.runDir, "evidence/logs")));
      const o2 = await run({ braco: "sem", agente: "claude", egress: "real", modelo: "claude-opus-teste", esforco: "high", permitirModelo: true }, "claude-sem-credencial");
      assert.equal(assertPackage(o2).run.status.technical, "not-run", "--permitir-modelo sozinho não basta");
    } finally {
      for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
    }
  });

  await test("saída real do proxy do provedor: recusas valem com internet do lado de fora", async () => {
    const o = await run({ braco: "sem", cenario: "vazio", egress: "real" }, "egress-real");
    const { run: r, isolation } = assertPackage(o);
    assert.equal(r.status.isolation, "passed");
    for (const id of ["internet-direta", "dns-externo", "egress-fora-da-allowlist", "host-e-gateway"]) assert.equal(isolation!.checks.find((c) => c.id === id)?.outcome, "passed", id);
    assert.ok(!isolation!.positiveControls.some((p) => p.id === "egress-allowlist"), "o túnel permitido ao provedor real não é aberto no T3a");
  });

  // ── T3b: o cliente real (Claude Code 2.1.288) dentro das paredes, contra o dublê roteirizado da API.
  // Nenhum modelo, nenhuma credencial real: o dublê devolve turnos escritos à mão e grava cada pedido.
  const claude = (cenario: string): Partial<RunOptions> => ({ agente: "claude", egress: "stub", cenario, modelo: STUB_MODEL, esforco: "high" });
  const cliente = (dir: string): ClienteDoc => read<ClienteDoc>(dir, "evidence/cliente.json");
  const checkOf = (iso: Isolation | null, id: string): string | undefined => iso?.checks.find((c) => c.id === id)?.outcome;

  for (const braco of ["sem", "com"] as const) {
    await test(`cliente real ${braco}: só ferramentas MCP, chamadas pela ponte, texto íntegro, telemetria e isolamento`, async () => {
      // uma "credencial real" (sentinela) no ambiente do runner NÃO pode chegar ao contêiner no modo dublê
      const saved = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "sk-ant-api03-SENTINELA-DO-RUNNER-nao-pode-vazar";
      let o: RunOutcome;
      try {
        o = await run({ braco, ...claude("honesto") }, `cliente-honesto-${braco}`);
      } finally {
        if (saved === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = saved;
      }
      pkgs[`cliente-${braco}`] = o;
      const { run: r, isolation, findings } = assertPackage(o);
      // modo dublê: impossível de confundir com dado
      assert.equal(r.fixture, true);
      assert.equal(r.provider.name, "stub");
      assert.equal(r.client.name, "claude-code");
      assert.equal(r.status.technical, "passed");
      assert.equal(r.submission.status, "accepted");
      assert.equal(findings?.report.findings.length, 1);
      // 7. paredes: a sonda rodou antes, com a mesma configuração, e o isolamento passou com o cliente real
      assert.equal(r.status.isolation, "passed");
      for (const id of ["internet-direta", "dns-externo", "egress-fora-da-allowlist", "host-e-gateway", "config-pessoal", "credenciais-no-ambiente", "ferramentas-do-cliente", "extensoes-do-cliente", "texto-da-tarefa-entregue", "hosts-do-cliente", "egress-provedor-durante-a-execucao"]) {
        assert.equal(checkOf(isolation, id), "passed", `check ${id}`);
      }
      const c = cliente(o.runDir);
      const browser = read<{ exposed: string[] }>(o.runDir, "evidence/raw/browser/inventory.json").exposed;
      const oracle = braco === "com" ? read<{ exposed: string[] }>(o.runDir, "evidence/raw/oracle/inventory.json").exposed : [];
      const expected = [...browser.map((t) => `mcp__playwright__${t}`), ...oracle.map((t) => `mcp__govbr-ds-validator__${t}`)].sort();
      // 1. capacidades efetivas: o cliente só tem (init) e só anuncia ao "modelo" (pedido) as ferramentas MCP das pontes
      assert.deepEqual([...c.client.init!.tools].sort(), expected, "init.tools do cliente");
      assert.deepEqual(c.stub!.advertisedTools.filter((t) => !c.stub!.deferredTools.includes(t)), expected, "campo tools dos pedidos ao modelo");
      assert.deepEqual(c.stub!.deferredTools, ["DeferredToolPlaceholder"], "só o marcador adiado do cliente");
      assert.equal(expected.some((t) => t.startsWith("mcp__govbr-ds-validator__")), braco === "com", "oráculo anunciado só no com");
      assert.deepEqual(c.client.init!.skills, []);
      assert.deepEqual(c.client.init!.slashCommands, []);
      assert.ok(c.client.init!.plugins.every((p) => p.source.endsWith("@builtin")), "nenhum plugin instalado");
      assert.deepEqual(c.client.init!.mcpServers.map((m) => `${m.name}:${m.status}`).sort(), (braco === "com" ? ["govbr-ds-validator:connected", "playwright:connected"] : ["playwright:connected"]));
      // cada ferramenta proibida pedida pelo roteiro voltou como erro ao "modelo" e nunca chegou à ponte
      const forbidden = forbiddenCalls(braco, "x").map((f) => f.name);
      const errored = new Set(c.client.toolErrors.map((t) => t.tool));
      for (const name of forbidden) assert.ok(errored.has(name), `ferramenta proibida sem erro devolvido: ${name}`);
      assert.ok(c.client.toolErrors.filter((t) => forbidden.includes(t.tool)).every((t) => /No such tool available/.test(t.text)), "recusa pelo cliente: ferramenta inexistente");
      assert.equal(c.stub!.toolResults.filter((t) => t.isError).length, forbidden.length, "o dublê recebeu um erro por ferramenta proibida");
      assert.equal(c.client.result!.permissionDenials.length, 0);
      const events = ndjson(join(o.runDir, "tool-events.ndjson"));
      assert.ok(!events.some((e) => ["browser_resize", "browser_run_code", "browser_install"].includes(String(e.tool))), "ferramenta oculta não deve nem chegar à ponte");
      // 2. o cliente MCP HTTP do Claude Code fala com a ponte: cada chamada MCP do cliente aparece nos eventos da ponte
      for (const u of c.client.toolUses.filter((t) => t.name.startsWith("mcp__") && !forbidden.includes(t.name))) {
        const [, server, tool] = /^mcp__(playwright|govbr-ds-validator)__(.+)$/.exec(u.name)!;
        const seen = events.filter((e) => e.kind === "call" && e.tool === tool && e.server === (server === "playwright" ? "playwright" : "oracle") && e.outcome === "ok").length;
        assert.equal(seen, u.count, `${u.name}: ${u.count} chamadas no cliente, ${seen} registradas pela ponte`);
      }
      assert.ok(events.some((e) => e.kind === "call" && e.tool === "browser_evaluate"), "envio pelo navegador");
      // 3. hosts: só api.anthropic.com, com chave de API falsa; platform.claude.com nunca tentado
      assert.deepEqual(c.stub!.hosts, ["api.anthropic.com"]);
      assert.deepEqual(c.stub!.credentialKinds, ["x-api-key"]);
      assert.ok(c.providerConnectsDuringAgent.length > 0 && c.providerConnectsDuringAgent.every((x) => x.target === "api.anthropic.com:443" && x.allowed));
      // credencial: só a falsa chegou ao dublê (o valor do ambiente do runner não); valor redigido no pacote
      const fakeSha = sha256(FAKE_CREDENTIAL["api-key"].value).slice(0, 12);
      const stubRows = ndjson(join(o.runDir, "evidence/raw/provider-stub/requests.ndjson"));
      assert.ok(stubRows.every((x) => (x.credential as { sha256Prefix: string }).sha256Prefix === fakeSha), "credencial falsa fixa em todos os pedidos");
      const agentCfg = read<Record<string, { env: string[]; cmd: string[] }>>(o.runDir, "evidence/container-config.json").agent;
      assert.ok(agentCfg.env.includes("ANTHROPIC_API_KEY=<redigido>"));
      assert.ok(agentCfg.env.includes("NODE_EXTRA_CA_CERTS=/run/task/provider-ca.pem"));
      for (const flag of ["--tools", "--strict-mcp-config", "--setting-sources", "--disable-slash-commands", "--no-session-persistence", "--effort"]) assert.ok(agentCfg.cmd.includes(flag), `flag ${flag}`);
      const manifest = read<ArtifactManifest>(o.runDir, "artifact-manifest.json");
      for (const f of manifest.files) {
        const body = readFileSync(join(o.runDir, f.path), "utf8");
        assert.ok(!body.includes("SENTINELA-DO-RUNNER") && !body.includes(FAKE_CREDENTIAL["api-key"].value), `credencial no pacote: ${f.path}`);
        assert.ok(!/BEGIN PRIVATE KEY/.test(body), `chave privada no pacote: ${f.path}`);
      }
      // 4. telemetria: modelo ecoado, tokens = soma do que o dublê declarou, turnos e custo estimado medidos
      assert.equal(r.model.resolved, STUB_MODEL);
      assert.equal(r.model.resolvedSource, "client-log");
      assert.equal(r.usage.inputTokens.value, c.stub!.usageSumMain.input);
      assert.equal(r.usage.outputTokens.value, c.stub!.usageSumMain.output);
      assert.equal(r.usage.cacheReadTokens.value, c.stub!.usageSumMain.cacheRead);
      assert.equal(r.usage.cacheCreationTokens.value, c.stub!.usageSumMain.cacheCreation);
      assert.equal(r.usage.turns.status, "measured");
      assert.equal(r.usage.estimatedCostUsd.status, "measured");
      assert.equal(r.usage.billedCostUsd.status, "unavailable");
      // 5. texto da tarefa: a mensagem do usuário no 1º pedido é o texto renderizado, byte a byte
      assert.equal(c.stub!.promptDelivered, true);
      assert.equal(sha256(readFileSync(join(o.runDir, "evidence/prompt.txt"))), r.versions.promptSha256);
      // 6. gate de aderência com chamadas reais do cliente
      const ad = read<{ usage: string; gate: { met: boolean } }>(o.runDir, "evidence/aderencia-oraculo.json");
      assert.equal(r.status.oracleUsage, braco === "sem" ? "absent-verified" : "used-adherent");
      assert.equal(ad.usage, r.status.oracleUsage);
      if (braco === "com") assert.equal(ad.gate.met, true);
      console.log(`     · ${expected.length} ferramentas anunciadas; ${forbidden.length} proibidas recusadas; ${c.stub!.mainRequests} pedidos ao dublê; tokens ${r.usage.inputTokens.value}/${r.usage.outputTokens.value}`);
    });
  }

  await test("cliente real: paridade entre braços (texto, 1º pedido ao modelo, configuração efetiva)", async () => {
    const [a, b] = [pkgs["cliente-sem"], pkgs["cliente-com"]];
    assertParity(a, b);
    // o que o "modelo" recebe no 1º turno (mensagens: texto da tarefa + contexto do cliente) é igual nos dois braços
    assert.equal(cliente(a!.runDir).stub!.firstTurnMessagesSha256, cliente(b!.runDir).stub!.firstTurnMessagesSha256, "mensagens do 1º pedido diferem entre braços");
    // e o prompt de sistema do cliente também (o oráculo não injeta instruções; só o campo tools difere)
    assert.ok(cliente(a!.runDir).stub!.firstTurnSystemSha256, "prompt de sistema registrado");
    assert.equal(cliente(a!.runDir).stub!.firstTurnSystemSha256, cliente(b!.runDir).stub!.firstTurnSystemSha256, "prompt de sistema do 1º pedido difere entre braços");
  });

  await test("cliente real erros com: recusa da ponte, isError e erro do oráculo visíveis → used-with-errors", async () => {
    const o = await run({ braco: "com", ...claude("erros") }, "cliente-erros-com");
    const { run: r } = assertPackage(o);
    assert.equal(r.status.technical, "passed");
    assert.equal(r.status.isolation, "passed");
    assert.equal(r.submission.status, "accepted");
    assert.equal(r.status.oracleUsage, "used-with-errors");
    const ad = read<{ errors: { tool: string; outcome: string }[] }>(o.runDir, "evidence/aderencia-oraculo.json");
    assert.ok(ad.errors.some((e) => e.tool === "scan_page" && e.outcome === "tool-error"));
    const events = ndjson(join(o.runDir, "tool-events.ndjson"));
    const refused = events.filter((e) => e.kind === "refused").map((e) => `${String(e.tool)}:${String(e.reason)}`);
    assert.ok(refused.includes("browser_evaluate:janela-fixa") && refused.includes("browser_navigate:esquema-recusado"), "recusas da ponte");
    assert.ok(events.some((e) => e.kind === "call" && e.tool === "browser_click" && e.outcome === "tool-error"), "isError do Playwright registrado pela ponte");
    assert.ok(events.some((e) => e.kind === "call" && (e.result as { truncated?: boolean } | undefined)?.truncated === true), "truncamento do registro marcado");
    assert.equal(events.filter((e) => e.kind === "drift").length, 0);
    const errs = cliente(o.runDir).client.toolErrors.map((t) => t.tool);
    for (const t of ["mcp__playwright__browser_evaluate", "mcp__playwright__browser_navigate", "mcp__playwright__browser_click", "mcp__govbr-ds-validator__scan_page"]) assert.ok(errs.includes(t), `erro devolvido ao modelo: ${t}`);
  });

  await test("cliente real 429: interrupted/rate-limited, artefatos preservados, nunca zero achados", async () => {
    const o = await run({ braco: "sem", ...claude("429") }, "cliente-429");
    const { run: r, findings } = assertPackage(o);
    assert.equal(findings, null);
    assert.equal(r.submission.status, "none");
    assert.equal(r.status.technical, "interrupted");
    assert.equal(r.failure?.reason, "rate-limited");
    assert.match(r.failure!.detail, /429/);
    assert.equal(r.status.score, "not-applicable");
    assert.equal(r.status.isolation, "passed");
    assert.ok(existsSync(join(o.runDir, "evidence/raw/agent/claude-stream.ndjson")) && ndjson(join(o.runDir, "tool-events.ndjson")).some((e) => e.tool === "browser_navigate"), "artefatos preservados");
    assert.deepEqual(cliente(o.runDir).stub!.httpErrors, [{ status: 429, count: 1 }]);
    assert.equal(r.usage.inputTokens.status, "measured", "tokens do turno anterior ao erro");
  });

  await test("cliente real 529 com token OAuth falso: model-unavailable, novas tentativas na telemetria, só api.anthropic.com", async () => {
    const o = await run({ braco: "sem", ...claude("529") }, "cliente-529");
    const { run: r, findings } = assertPackage(o);
    assert.equal(findings, null);
    assert.equal(r.status.technical, "interrupted");
    assert.equal(r.failure?.reason, "model-unavailable");
    assert.equal(r.provider.authMethod, "oauth-subscription");
    const c = cliente(o.runDir);
    assert.equal(c.client.apiRetries.length, 2, "CLAUDE_CODE_MAX_RETRIES=2 do roteiro");
    assert.match(r.failure!.detail, /2 novas tentativas/);
    assert.deepEqual(c.stub!.httpErrors, [{ status: 529, count: 3 }]);
    // com token OAuth por ambiente, o cliente também só fala com api.anthropic.com (Bearer)
    assert.deepEqual(c.stub!.hosts, ["api.anthropic.com"]);
    assert.deepEqual(c.stub!.credentialKinds, ["bearer"]);
    assert.ok(c.providerConnectsDuringAgent.every((x) => x.target === "api.anthropic.com:443"), "platform.claude.com não tentado");
    assert.ok(read<Record<string, { env: string[] }>>(o.runDir, "evidence/container-config.json").agent.env.includes("CLAUDE_CODE_OAUTH_TOKEN=<redigido>"));
  });

  await test("modo dublê recusa --permitir-modelo e roteiro desconhecido (nenhum contêiner)", async () => {
    const o = await run({ braco: "sem", ...claude("honesto"), permitirModelo: true }, "duble-com-permissao");
    const { run: r } = assertPackage(o);
    assert.equal(r.status.technical, "not-run");
    assert.match(r.failure!.detail, /duble-sem-modelo-real/);
    assert.ok(!existsSync(join(o.runDir, "evidence/logs")));
    const o2 = await run({ braco: "sem", ...claude("inventado") }, "duble-roteiro-inexistente");
    assert.match(assertPackage(o2).run.failure!.detail, /roteiro-do-duble/);
  });

  // ── resumo
  const left = docker(["ps", "-aq", "--filter", "label=govbr.run"]).stdout.trim();
  const nets = docker(["network", "ls", "-q", "--filter", "label=govbr.run"]).stdout.trim();
  if (left || nets) results.push({ name: "limpeza final", ok: false, ms: 0, detail: `sobraram contêineres/redes: ${left} ${nets}` });
  console.log("\nTempo por execução (run-once inteiro, s):");
  for (const t of timings) console.log(`  ${t.run.padEnd(28)} ${t.seconds}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} testes ok`);
  if (!keep) rmSync(ROOT, { recursive: true, force: true });
  else console.log(`pacotes mantidos em ${ROOT}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
