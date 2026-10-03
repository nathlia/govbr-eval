/**
 * T1 — auditoria e testes do exportador das telas (scripts/export-telas.ts). Sem modelo; navegador
 * headless, um só.
 *
 *   1. exporta num diretório temporário e audita: allowlist, ocultos, source maps, caminhos absolutos
 *      e nome da usuária, hashes do manifesto; a auditoria pega cada violação plantada numa cópia;
 *   2. manifesto: forma de site-manifest.v1, e o `item` encaixa num snapshot-manifest.v1 válido
 *      (validateContract);
 *   3. paridade byte a byte: tela B = manifesto do congelamento do corpus; telas A e B = os sites que
 *      a superfície de medida congelou na última coleta de cada uma (pipeline/logs/*-superficie);
 *   4. vazamento do gabarito: ids, regras e frases de 6+ palavras de todo ground-truth-*.json,
 *      organic-ground-truth.json e adjudications.json não podem aparecer em nenhum arquivo de texto
 *      exportado; vocabulário que descreveria uma violação plantada é RELATADO (não falha, salvo nos
 *      arquivos que o exportador escreve);
 *   5. pasta limpa: cópia do pacote num diretório novo, `server.mjs` numa porta livre com ambiente
 *      mínimo; bytes servidos = manifesto; travessia de caminho → 400/404; Playwright abre A e B,
 *      executa os passos `setup` das referências (lidos aqui, nunca copiados para o pacote) e a
 *      interação de `telas.json`; nenhum pedido sai da origem; console comparado com o do mesmo site
 *      servido pela superfície de medida.
 */
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { validateContract } from "../contracts/index";
import { ROOT } from "./adjudication";
import {
  PACKAGE_NODE_VERSION, ROOT_FILES, machineText, SCREEN_A, SCREEN_B, SITE_DIR, TEXT_EXTENSIONS, auditPackage, exportTelas, listTree,
  type SiteManifestDoc,
} from "./export-telas";
import { createSiteServer, loadSite } from "./measurement-surface";
import { telaOf, type Tela } from "./telas";

let tests = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  tests++;
  console.log(`ok ${name}`);
}

const CORPUS = resolve(ROOT, "..", "govbr-corpus");
const WORK = mkdtempSync(join(tmpdir(), "test-export-telas-"));
const OUT = join(WORK, "pacote");
const cleanups: (() => void | Promise<void>)[] = [];

// ───────────────────────────────────────────────────────────────── trechos proibidos

// ───────────────────────────────────────────────────────────────── gabarito → trechos

interface AnswerKeyNeedles { ids: Set<string>; rules: Set<string>; shingles: Map<string, string>; files: string[] }

const ID_TOKEN = /(?<![A-Za-z0-9-])[A-Za-z]{1,4}(?:-[A-Za-z]{1,2})?-\d{1,3}[a-z]?(?![A-Za-z0-9-])/g;
const ID_EXACT = /^[A-Z]{1,4}(?:-[A-Z]{1,2})?-\d{1,3}[a-z]?$/;
const RULE_EXACT = /^(govbr-\d+\.\d+\.\d+-[a-z0-9-]+-[0-9a-f]{12}|(?:emag|wcag):\d+(?:\.\d+)*)$/i;
const RULE_TOKEN = /govbr-\d+\.\d+\.\d+-[a-z0-9-]+-[0-9a-f]{12}|(?:emag|wcag):\d+(?:\.\d+)*/gi;
const SHINGLE = 6;

const words = (text: string): string[] => text.normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function answerKeyFiles(): string[] {
  return readdirSync(ROOT)
    .filter((f) => /^ground-truth.*\.json$/.test(f) || f === "organic-ground-truth.json" || f === "adjudications.json")
    .sort();
}

function collectNeedles(): AnswerKeyNeedles {
  const needles: AnswerKeyNeedles = { ids: new Set(), rules: new Set(), shingles: new Map(), files: answerKeyFiles() };
  const visitString = (s: string): void => {
    const trimmed = s.trim();
    if (ID_EXACT.test(trimmed)) needles.ids.add(trimmed.toUpperCase());
    if (RULE_EXACT.test(trimmed)) needles.rules.add(trimmed.toLowerCase());
    for (const m of trimmed.match(RULE_TOKEN) ?? []) needles.rules.add(m.toLowerCase());
    const w = words(trimmed);
    for (let i = 0; i + SHINGLE <= w.length; i++) {
      const key = w.slice(i, i + SHINGLE).join(" ");
      if (!needles.shingles.has(key)) needles.shingles.set(key, trimmed.slice(0, 160));
    }
  };
  const visit = (value: unknown): void => {
    if (typeof value === "string") visitString(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        // Chaves também carregam identidade (adjudications: `<caseId>:<hash>`; casos por id).
        const caseKey = k.split(":")[0];
        if (ID_EXACT.test(caseKey)) needles.ids.add(caseKey.toUpperCase());
        visit(v);
      }
    }
  };
  for (const f of needles.files) visit(JSON.parse(readFileSync(join(ROOT, f), "utf8")));
  return needles;
}

/**
 * Ocorrências conhecidas que são CONTEÚDO REAL da página (texto visível do gov.br, nome de biblioteca)
 * e não derivam do gabarito: { trecho normalizado, arquivo (regex), motivo }. Cada entrada precisa de
 * motivo e é listada no relatório; não há curinga.
 */
const KNOWN_PAGE_CONTENT: { needle: string; file: RegExp; reason: string }[] = [];

interface LeakHit { file: string; kind: "id" | "regra" | "frase"; needle: string; context: string; found?: string }

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Como as seis palavras aparecem no arquivo exportado. `prosa`: ao menos uma ocorrência com espaço em
 * TODOS os separadores — texto corrido, como uma descrição ou justificativa vazada apareceria.
 * `codigo`: só aparecem coladas por hífen, barra, dois-pontos etc. — classe CSS, seletor, URL, valor
 * de estilo: a referência CITA a página (`bg-orange-vivid-30 text-pure-0`), a página não cita a
 * referência. Código é relatado, não falha; prosa falha.
 */
function phraseForm(text: string, shingle: string): { form: "prosa" | "codigo"; sample: string } {
  const parts = shingle.split(" ");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${parts.map(escapeRegExp).join("([^\\p{L}\\p{N}]+)")}(?![\\p{L}\\p{N}])`, "giu");
  let sample = "";
  for (const m of text.normalize("NFC").matchAll(re)) {
    sample ||= m[0];
    if (m.slice(1).every((sep) => /\s/.test(sep))) return { form: "prosa", sample: m[0] };
  }
  return { form: "codigo", sample };
}

function scanLeaks(dir: string, needles: AnswerKeyNeedles): { hits: LeakHit[]; known: LeakHit[]; code: LeakHit[]; scanned: number } {
  const hits: LeakHit[] = [];
  const known: LeakHit[] = [];
  const code: LeakHit[] = [];
  let scanned = 0;
  for (const f of listTree(dir).files) {
    if (!TEXT_EXTENSIONS.has(extname(f).toLowerCase())) continue;
    scanned++;
    const text = readFileSync(join(dir, f), "utf8");
    const found: LeakHit[] = [];
    for (const m of text.matchAll(ID_TOKEN)) {
      if (needles.ids.has(m[0].toUpperCase())) found.push({ file: f, kind: "id", needle: m[0], context: text.slice(Math.max(0, m.index! - 40), m.index! + 40) });
    }
    for (const m of text.matchAll(RULE_TOKEN)) {
      if (needles.rules.has(m[0].toLowerCase())) found.push({ file: f, kind: "regra", needle: m[0], context: text.slice(Math.max(0, m.index! - 40), m.index! + 40) });
    }
    const w = words(text);
    const seen = new Set<string>();
    for (let i = 0; i + SHINGLE <= w.length; i++) {
      const key = w.slice(i, i + SHINGLE).join(" ");
      if (seen.has(key) || !needles.shingles.has(key)) continue;
      seen.add(key);
      const { form, sample } = phraseForm(text, key);
      const hit: LeakHit = { file: f, kind: "frase", needle: key, context: needles.shingles.get(key)!, found: sample };
      if (form === "codigo") code.push(hit);
      else found.push(hit);
    }
    for (const hit of found) {
      const isKnown = KNOWN_PAGE_CONTENT.some((k) => k.needle === hit.needle.toLowerCase() && k.file.test(hit.file));
      (isKnown ? known : hits).push(hit);
    }
  }
  return { hits, known, code, scanned };
}

const VOCABULARY = /violation|viola[cç](?:[aã]o|[oõ]es)|defeito|injected|injetad[oa]|plantad[oa]|gabarito|ground[-_ ]?truth|\bwcag\b|\be-?mag\b|benchmark|\btcc\b/gi;

function scanVocabulary(dir: string): { file: string; word: string; count: number; sample: string }[] {
  const out: { file: string; word: string; count: number; sample: string }[] = [];
  for (const f of listTree(dir).files) {
    if (!TEXT_EXTENSIONS.has(extname(f).toLowerCase())) continue;
    const text = readFileSync(join(dir, f), "utf8");
    const byWord = new Map<string, { count: number; sample: string }>();
    for (const m of text.matchAll(VOCABULARY)) {
      const word = m[0].toLowerCase();
      const entry = byWord.get(word) ?? { count: 0, sample: text.slice(Math.max(0, m.index! - 50), m.index! + 50).replace(/\s+/g, " ") };
      entry.count++;
      byWord.set(word, entry);
    }
    for (const [word, e] of byWord) out.push({ file: f, word, ...e });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────── servidores

function rawStatus(origin: string, path: string, method = "GET"): Promise<number> {
  const url = new URL(origin);
  return new Promise((done, fail) => {
    const req = httpRequest({ host: url.hostname, port: url.port, path, method }, (res) => { res.resume(); done(res.statusCode ?? 0); });
    req.on("error", fail);
    req.end();
  });
}

async function startPackageServer(dir: string): Promise<{ origin: string; child: ChildProcess; output: () => string }> {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" };
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  const child = spawn(process.execPath, ["server.mjs", "--port", "0"], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout!.on("data", (d: Buffer) => { out += d.toString("utf8"); });
  child.stderr!.on("data", (d: Buffer) => { out += d.toString("utf8"); });
  const origin = await new Promise<string>((done, fail) => {
    const timer = setTimeout(() => fail(new Error(`server.mjs não subiu em 15 s:\n${out}`)), 15_000);
    const check = (): void => {
      const m = /Vistorias: http/.test(out) ? out.match(/em (http:\/\/127\.0\.0\.1:\d+)/) : null;
      if (m) { clearTimeout(timer); done(m[1]); }
    };
    child.stdout!.on("data", check);
    child.on("exit", (code) => { clearTimeout(timer); fail(new Error(`server.mjs saiu (${code}):\n${out}`)); });
  });
  return { origin, child, output: () => out };
}

function listen(server: Server): Promise<string> {
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

/** Última superfície de medida congelada para esta entrada (pipeline/logs/*-superficie), se houver. */
function latestSurface(entry: string): string | null {
  const logs = join(ROOT, "pipeline", "logs");
  if (!existsSync(logs)) return null;
  for (const d of readdirSync(logs).filter((n) => n.endsWith("-superficie")).sort().reverse()) {
    const manifestPath = join(logs, d, "site-manifest.json");
    if (!existsSync(manifestPath) || !existsSync(join(logs, d, "site"))) continue;
    if ((JSON.parse(readFileSync(manifestPath, "utf8")) as { entry: string }).entry === `/${entry}`) return join(logs, d);
  }
  return null;
}

// ───────────────────────────────────────────────────────────────── navegador

interface SetupStep { action: "click" | "wait" | "navigate"; selector?: string; path?: string; waitFor?: string }
interface Visit { outside: string[]; nonNetwork: number; console: string[]; failed: string[] }

function referenceOf(tela: Tela): { waitFor: string; setup: SetupStep[] } {
  const gt = JSON.parse(readFileSync(join(ROOT, tela.reference!), "utf8")) as { _meta: { waitFor: string; setup: SetupStep[] } };
  return { waitFor: gt._meta.waitFor, setup: gt._meta.setup };
}

async function runStep(page: Page, step: SetupStep): Promise<void> {
  if (step.action === "click") await page.click(step.selector!, { timeout: 10_000 });
  else if (step.action === "wait") await page.waitForSelector(step.selector!, { timeout: 10_000 });
  else if (step.action === "navigate") {
    if (step.selector) await page.click(step.selector, { timeout: 10_000 });
    else {
      await page.evaluate((p) => {
        history.pushState(null, "", p);
        dispatchEvent(new PopStateEvent("popstate", { state: null }));
      }, step.path!);
    }
    await page.waitForSelector(step.waitFor!, { timeout: 10_000 });
  }
}

async function visitScreen(browser: Browser, origin: string, tela: Tela): Promise<Visit> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const visit: Visit = { outside: [], nonNetwork: 0, console: [], failed: [] };
  const norm = (s: string): string => s.split(origin).join("<origem>");
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol === "data:" || u.protocol === "blob:") { visit.nonNetwork++; return; }
    if (u.origin !== origin) visit.outside.push(r.url());
  });
  page.on("requestfailed", (r) => visit.failed.push(`${norm(r.url())} ${r.failure()?.errorText ?? ""}`));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") visit.console.push(`${m.type()}: ${norm(m.text())}`); });
  page.on("pageerror", (e) => visit.console.push(`pageerror: ${norm(e.message)}`));
  try {
    const ref = referenceOf(tela);
    await page.goto(origin + "/" + tela.entry, { waitUntil: "load" });
    await page.waitForSelector(ref.waitFor, { timeout: 15_000 });
    const body = await page.textContent("body");
    assert.ok(body?.includes(tela.isolamento.texto), `${tela.nome}: página sem "${tela.isolamento.texto}"`);
    const inter = tela.isolamento.interacao;
    if (inter) {
      await page.click(inter.clicar, { timeout: 10_000 });
      await page.waitForSelector(inter.esperar, { timeout: 10_000 });
    }
    // Recarregar volta ao estado inicial; os passos da referência partem dele.
    await page.goto(origin + "/" + tela.entry, { waitUntil: "load" });
    await page.waitForSelector(ref.waitFor, { timeout: 15_000 });
    for (const step of ref.setup) await runStep(page, step);
  } finally {
    await context.close();
  }
  return visit;
}

// ───────────────────────────────────────────────────────────────── testes

async function main(): Promise<void> {
  const forbidden = machineText();
  let manifest!: SiteManifestDoc;

  await test("exporta para diretório temporário", () => {
    const result = exportTelas({ out: OUT, allowDirty: true, log: () => {} });
    manifest = result.manifest;
    assert.equal(result.files, manifest.files.length);
    assert.ok(manifest.files.some((f) => f.path === "solicitacao.html"));
    assert.ok(manifest.files.some((f) => f.path === "pnip/index.html"));
    console.log(`   ${result.files} arquivos servidos, ${result.bytes} bytes; corpus ${manifest.origin.corpus.commit}${manifest.origin.corpus.dirty ? " (sujo)" : ""}`);
  });

  await test("auditoria: allowlist, ocultos, source maps, caminhos absolutos/nome, hashes", () => {
    const audit = auditPackage(OUT, { forbiddenText: forbidden });
    assert.deepEqual(audit.errors, []);
    const all = listTree(OUT).files;
    assert.deepEqual(all.filter((f) => !f.startsWith(`${SITE_DIR}/`)).sort(), [...ROOT_FILES].sort());
    assert.ok(!all.some((f) => /(^|\/)(\.git|node_modules|src|real|static)(\/|$)/.test(f) || /ground-truth|manifesto\.json$/.test(f)));
    console.log(`   pacote: ${audit.files} arquivos, ${audit.bytes} bytes; ${forbidden.length} trechos proibidos conferidos`);
    // A palavra pode existir como CÓDIGO de biblioteca (gera mapa em tempo de execução para CSS
    // injetado), sem ser diretiva de arquivo: relatada, não falha.
    for (const f of all.filter((p) => TEXT_EXTENSIONS.has(extname(p).toLowerCase()))) {
      const n = readFileSync(join(OUT, f), "utf8").split("sourceMappingURL").length - 1;
      if (n) console.log(`   relatado: "sourceMappingURL" ×${n} em ${f} (não é diretiva: está dentro de código)`);
    }
  });

  await test("auditoria pega cada violação plantada numa cópia", () => {
    const copy = join(WORK, "adulterado");
    cpSync(OUT, copy, { recursive: true });
    writeFileSync(join(copy, SITE_DIR, "assets", "x.js.map"), "{}");
    writeFileSync(join(copy, ".escondido"), "x");
    writeFileSync(join(copy, "notas.txt"), "x");
    const js = manifest.files.find((f) => f.path.startsWith("assets/") && f.path.endsWith(".js"))!.path;
    appendFileSync(join(copy, SITE_DIR, js), "\n//# sourceMappingURL=" + js.split("/").pop() + ".map\n");
    const html = join(copy, SITE_DIR, "solicitacao.html");
    writeFileSync(html, readFileSync(html, "utf8") + `<!-- ${resolve(ROOT, "..")} -->`);
    const errors = auditPackage(copy, { forbiddenText: forbidden }).errors.join("\n");
    for (const expected of [
      `fora da allowlist: ${SITE_DIR}/assets/x.js.map`, `source map: ${SITE_DIR}/assets/x.js.map`, "arquivo oculto: .escondido",
      "fora da allowlist: notas.txt", `diretiva sourceMappingURL: ${SITE_DIR}/${js}`, `sha256 difere do manifesto: ${SITE_DIR}/${js}`,
      `trecho proibido "${resolve(ROOT, "..")}" em ${SITE_DIR}/solicitacao.html`,
    ]) assert.ok(errors.includes(expected), `esperava "${expected}" em:\n${errors}`);
    rmSync(copy, { recursive: true, force: true });
  });

  await test("manifesto: site-manifest.v1 e item encaixa em snapshot-manifest.v1 (validateContract)", () => {
    assert.equal(manifest.contract, "site-manifest.v1");
    assert.equal(manifest.subsetOf, "snapshot-manifest.v1");
    assert.equal(manifest.fixture, false);
    assert.deepEqual(manifest.screens.map((s) => s.id), [SCREEN_A, SCREEN_B]);
    assert.equal(manifest.screens[0].entry, `/${telaOf(SCREEN_A).entry}`);
    assert.equal(manifest.screens[1].entry, `/${telaOf(SCREEN_B).entry}`);
    assert.deepEqual(manifest.routing.aliases, telaOf(SCREEN_B).isolamento.site!.aliases);
    // Os outros três itens obrigatórios (referência, plano, instrumento) não pertencem ao site: aqui são
    // marcadores sintéticos, e o documento composto é fixture.
    const placeholder = (kind: string) => ({
      id: `marcador-${kind}`, kind, description: `marcador sintético (${kind}) — fora do pacote de telas`,
      sha256: "0".repeat(64), bytes: 0, location: { kind: "external-store", uri: "https://example.invalid/marcador" },
      immutable: true, exposedToAgent: false,
    });
    const composed = {
      contract: "snapshot-manifest.v1", fixture: true, snapshotSetId: "teste-export-telas", createdAt: manifest.createdAt,
      items: [manifest.item, placeholder("reference"), placeholder("state-plan"), placeholder("instrument")],
    };
    const result = validateContract(composed);
    assert.ok(result.valid, JSON.stringify(result.errors, null, 2));
    const bad = validateContract({ ...composed, items: [{ ...manifest.item, location: { kind: "package-path", path: "../fora" } }, ...composed.items.slice(1)] });
    assert.ok(!bad.valid, "local com '..' tinha de ser recusado");
  });

  await test("Node do pacote cabe no intervalo do Vite do corpus", () => {
    assert.equal(readFileSync(join(OUT, ".node-version"), "utf8").trim(), PACKAGE_NODE_VERSION);
    const engines = (JSON.parse(readFileSync(join(CORPUS, "node_modules", "vite", "package.json"), "utf8")) as { engines: { node: string } }).engines.node;
    assert.equal(engines, "^20.19.0 || >=22.12.0", `intervalo do Vite mudou (${engines}): revise PACKAGE_NODE_VERSION`);
    const [major, minor] = PACKAGE_NODE_VERSION.split(".").map(Number);
    assert.ok((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22);
    const pkg = JSON.parse(readFileSync(join(OUT, "package.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("dependencies" in pkg) && !("devDependencies" in pkg), "o pacote não tem dependências");
  });

  await test("paridade: tela B = manifesto do congelamento; A e B = última superfície de medida", () => {
    const freeze = JSON.parse(readFileSync(join(CORPUS, "public", "pnip", "manifesto.json"), "utf8")) as { arquivos: Record<string, string> };
    const exportedB = Object.fromEntries(manifest.files.filter((f) => f.path.startsWith("pnip/")).map((f) => [f.path.slice(5), f.sha256]));
    assert.deepEqual(exportedB, freeze.arquivos);
    for (const nome of [SCREEN_A, SCREEN_B]) {
      const tela = telaOf(nome);
      const surface = latestSurface(tela.entry);
      if (!surface) { console.log(`   ${nome}: sem superfície anterior em pipeline/logs para comparar`); continue; }
      const measured = (JSON.parse(readFileSync(join(surface, "site-manifest.json"), "utf8")) as { files: Record<string, string> }).files;
      const mine = Object.fromEntries(manifest.files.filter((f) => (nome === SCREEN_B) === f.path.startsWith("pnip/")).map((f) => [`/${f.path}`, f.sha256]));
      assert.deepEqual(mine, measured, `${nome}: arquivos/bytes diferem da superfície ${surface}`);
      console.log(`   ${nome}: ${Object.keys(mine).length} arquivos idênticos a ${surface.split(/[\\/]/).pop()}`);
    }
  });

  const needles = collectNeedles();
  await test("vazamento do gabarito: nenhum id, regra ou frase de 6+ palavras no pacote", () => {
    const { hits, known, code, scanned } = scanLeaks(OUT, needles);
    console.log(`   ${needles.files.length} arquivos de gabarito (${needles.files.join(", ")}): ${needles.ids.size} ids, ${needles.rules.size} regras, ${needles.shingles.size} frases de ${SHINGLE} palavras; ${scanned} arquivos de texto varridos`);
    for (const k of known) console.log(`   conhecido (conteúdo da página): ${k.kind} "${k.needle}" em ${k.file}`);
    for (const c of code) console.log(`   relatado (código da página citado pela referência, não prosa): ${c.file}: ${JSON.stringify(c.found)}`);
    assert.equal(hits.length, 0, "vazamento:\n" + hits.slice(0, 40).map((h) => `  ${h.file}: ${h.kind} "${h.needle}" ← ${JSON.stringify(h.context)}`).join("\n"));
  });

  await test("a varredura acharia um trecho do gabarito plantado", () => {
    const copy = join(WORK, "plantado");
    cpSync(OUT, copy, { recursive: true });
    const gt = JSON.parse(readFileSync(join(ROOT, "ground-truth-solicitacao.json"), "utf8")) as { violations: { id: string; description: string }[] };
    const v = gt.violations[0];
    const target = join(copy, SITE_DIR, "solicitacao.html");
    writeFileSync(target, readFileSync(target, "utf8") + `<!-- ${v.id} ${v.description.toUpperCase()} -->`);
    const { hits } = scanLeaks(copy, needles);
    assert.ok(hits.some((h) => h.kind === "id" && h.needle === v.id), "id plantado não achado");
    assert.ok(hits.some((h) => h.kind === "frase"), "frase plantada não achada");
    rmSync(copy, { recursive: true, force: true });
  });

  await test("vocabulário de violação: relatório (falha só nos arquivos do exportador)", () => {
    const hits = scanVocabulary(OUT);
    const own = hits.filter((h) => !h.file.startsWith(`${SITE_DIR}/`));
    assert.deepEqual(own, [], "arquivos escritos pelo exportador têm de ser neutros");
    if (hits.length === 0) console.log("   nenhuma ocorrência");
    for (const h of hits) console.log(`   ${h.file}: "${h.word}" ×${h.count} ← ${JSON.stringify(h.sample)}`);
  });

  // ─── pasta limpa: o pacote vai por git (commit num repositório TEMPORÁRIO, com core.autocrlf=true, o
  // padrão do Windows) e volta por clone; é o clone que roda.
  const clean = join(WORK, "clone");
  await test("clone por git com core.autocrlf=true preserva os bytes do manifesto", () => {
    const repo = join(WORK, "repo");
    cpSync(OUT, repo, { recursive: true });
    const git = (cwd: string, ...args: string[]): void => {
      execFileSync("git", ["-c", "core.autocrlf=true", "-c", "user.name=export", "-c", "user.email=export@example.invalid", ...args], { cwd, stdio: "pipe" });
    };
    git(repo, "init", "-q");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "pacote");
    git(WORK, "clone", "-q", repo, clean);
    rmSync(join(clean, ".git"), { recursive: true, force: true });
    const audit = auditPackage(clean, { forbiddenText: forbidden });
    assert.deepEqual(audit.errors, []);
  });
  const server = await startPackageServer(clean);
  cleanups.push(async () => {
    const exited = new Promise<void>((done) => server.child.once("exit", () => done()));
    server.child.kill();
    await Promise.race([exited, new Promise<void>((done) => setTimeout(done, 3000))]);
    rmSync(clean, { recursive: true, force: true });
  });

  await test("pasta limpa: servidor sobe sem instalar nada e serve exatamente os bytes do manifesto", async () => {
    assert.ok(!existsSync(join(clean, "node_modules")));
    assert.match(server.output(), /Solicitar serviço: http:\/\/127\.0\.0\.1:\d+\/solicitacao\.html/);
    const { createHash } = await import("node:crypto");
    for (const f of manifest.files) {
      const res = await fetch(`${server.origin}/${f.path.split("/").map(encodeURIComponent).join("/")}`);
      assert.equal(res.status, 200, f.path);
      assert.equal(createHash("sha256").update(Buffer.from(await res.arrayBuffer())).digest("hex"), f.sha256, f.path);
    }
    const index = manifest.files.find((f) => f.path === "pnip/index.html")!;
    for (const route of ["/pnip/portal-mpa/vistorias", "/pnip/portal-mpa/vistorias/agendar-vistoria/x", "/pnip/"]) {
      const res = await fetch(server.origin + route);
      assert.equal(res.status, 200, route);
      assert.equal(createHash("sha256").update(Buffer.from(await res.arrayBuffer())).digest("hex"), index.sha256, route);
    }
    const alias = await fetch(server.origin + "/assets/images/exit-icon.png");
    assert.equal(alias.status, 200);
  });

  await test("pasta limpa: travessia de caminho e o que não é do site → 400/404/405", async () => {
    const cases: [string, number[], string?][] = [
      ["/../server.mjs", [400]], ["/%2e%2e/server.mjs", [400]], ["/%2E%2E/%2E%2E/etc/passwd", [400]],
      ["/pnip/../../etc", [400]], ["/pnip/%2e%2e/%2e%2e/server.mjs", [400]], ["/..%2fserver.mjs", [400]],
      ["/%2e%2e%5cserver.mjs", [400]], ["/..\\server.mjs", [400]], ["/C:/Windows/win.ini", [400]], ["/%00", [400]],
      ["/pnip/./index.html", [400]], ["//etc/passwd", [404]], ["/server.mjs", [404]], ["/site-manifest.json", [404]],
      ["/README.md", [404]], ["/package.json", [404]], ["/.node-version", [404]], ["/site/solicitacao.html", [404]],
      ["/", [404]], ["/assets/", [404]], ["/assets", [404]], ["/pnip/manifesto.json", [404]], ["/fluxo.html", [404]],
      ["/index.html", [404]], ["/src/solicitacao.tsx", [404]], ["/@fs/etc/passwd", [404]], ["/solicitacao.html", [405], "POST"],
    ];
    for (const [path, expected, method] of cases) {
      const status = await rawStatus(server.origin, path, method);
      assert.ok(expected.includes(status), `${method ?? "GET"} ${path} → ${status}, esperado ${expected.join("/")}`);
    }
  });

  const browser = await chromium.launch({ headless: true });
  cleanups.push(() => browser.close());
  const references = new Map<string, string>();
  for (const nome of [SCREEN_A, SCREEN_B]) {
    const surface = latestSurface(telaOf(nome).entry);
    if (!surface) continue;
    const refServer = createSiteServer(loadSite(surface));
    references.set(nome, await listen(refServer));
    cleanups.push(() => new Promise<void>((done) => { refServer.closeAllConnections(); refServer.close(() => done()); }));
  }

  for (const nome of [SCREEN_A, SCREEN_B]) {
    await test(`pasta limpa: ${nome} carrega, interações do setup respondem, nada sai da origem, console sem novidade`, async () => {
      const tela = telaOf(nome);
      const mine = await visitScreen(browser, server.origin, tela);
      assert.deepEqual(mine.outside, [], `${nome}: pedidos fora da origem`);
      assert.deepEqual(mine.failed, [], `${nome}: pedidos que falharam`);
      const refOrigin = references.get(nome);
      if (refOrigin) {
        const ref = await visitScreen(browser, refOrigin, tela);
        const novel = mine.console.filter((m) => !ref.console.includes(m));
        assert.deepEqual(novel, [], `${nome}: console com mensagens que a superfície de medida não tem`);
        console.log(`   ${nome}: ${mine.console.length} mensagem(ns) de console, as mesmas da superfície de medida (${ref.console.length})`);
      } else {
        console.log(`   ${nome}: sem superfície de comparação; console:`);
      }
      for (const m of mine.console) console.log(`     ${m.slice(0, 200)}`);
      if (mine.nonNetwork) console.log(`   ${nome}: ${mine.nonNetwork} recurso(s) data:/blob: (não são rede)`);
    });
  }

  console.log(`\n${tests} testes ok`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const c of cleanups.reverse()) {
      try { await c(); } catch { /* encerramento */ }
    }
    rmSync(WORK, { recursive: true, force: true });
  });
