/**
 * NAT-118 — inventário do DOM em dois passos: extrator do manifesto de navegação (lista fechada) e gerador que só lê o
 * manifesto e o site congelado. Sem modelo e sem oráculo; a parte do gerador abre um Chromium headless num site de
 * brinquedo servido aqui.
 *
 *   npm run test:inventario
 *
 * A prova de que o gerador não abre referência é de construção: ele roda numa CÓPIA mínima do govbr-eval (os módulos
 * que importa, mais node_modules por junção) onde não existe nenhum `ground-truth-*` nem `telas.json`; a referência do
 * teste só existe em memória. As referências reais lidas aqui são só as das telas de desenvolvimento A, A2 e B.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { conferirInventario } from "./vazamento/conferir-inventario";
import {
  CAMPOS_DOCUMENTAIS, CAMPOS_OPERACIONAIS, MANIFESTO_VERSAO, extrairManifesto, sha256DoConteudo, validarManifesto, type ManifestoNavegacao,
} from "./vazamento/manifesto-navegacao";

const ROOT_EVAL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ROOT = mkdtempSync(join(tmpdir(), "govbr-test-inventario-"));
const manter = process.argv.includes("--manter");
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");
let tests = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  tests += 1;
  console.log(`ok ${name}`);
}

const SEGREDO = "SEGREDO-DA-REFERENCIA-7f3a";
/** Referência de brinquedo: operacional + documental + specs com texto que nunca pode chegar ao manifesto. */
function referencia(meta: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({
    _meta: {
      version: "1.0.0", page: `pagina ${SEGREDO}`, setup_rationale: SEGREDO, auditoria: { nota: SEGREDO }, escaladas: [SEGREDO],
      url: "/pagina.html", waitFor: "main .pronto", viewport: { width: 1024, height: 700 },
      setup: [{ action: "click", selector: ".abrir" }, { action: "wait", selector: ".caixa-aberta" }],
      states: [{ id: "inicial", afterStep: 0, note: SEGREDO }, { id: "aberta", afterStep: 2, note: SEGREDO }],
      ...meta,
    },
    violations: [{ id: "X-01", description: SEGREDO, rules: [SEGREDO], anchors: [{ selector: ".abrir" }] }],
  }));
}
const ORIGEM = { tela: "brinquedo", arquivo: "ground-truth-brinquedo.json" };

async function main(): Promise<void> {
  await test("extrator: só os campos operacionais, nenhum texto de spec/descrição/nota; sha256 da referência e do conteúdo", () => {
    const texto = referencia();
    const m = extrairManifesto(texto, ORIGEM);
    const s = JSON.stringify(m);
    assert.ok(!s.includes(SEGREDO), "texto documental ou de spec vazou para o manifesto");
    assert.ok(!s.includes("X-01") && !s.includes("violations") && !s.includes("note"), "spec ou nota no manifesto");
    assert.deepEqual(Object.keys(m).sort(), ["contrato", "entrada", "paradas", "referencia", "setup", "sha256", "tela", "viewport"]);
    assert.equal(m.contrato, MANIFESTO_VERSAO);
    assert.deepEqual(m.entrada, { url: "/pagina.html", waitFor: "main .pronto" });
    assert.deepEqual(m.paradas, [{ id: "inicial", afterStep: 0 }, { id: "aberta", afterStep: 2 }]);
    assert.equal(m.referencia.sha256, sha256(texto));
    assert.equal(m.sha256, sha256DoConteudo(m));
    assert.deepEqual(extrairManifesto(texto, ORIGEM), m, "determinístico");
    assert.doesNotThrow(() => validarManifesto(JSON.parse(JSON.stringify(m))));
    // sem states nem viewport: a parada inicial e a janela padrão ficam explícitas
    const semStates = JSON.parse(referencia().toString());
    delete semStates._meta.states; delete semStates._meta.viewport;
    const m2 = extrairManifesto(Buffer.from(JSON.stringify(semStates)), ORIGEM);
    assert.deepEqual(m2.paradas, [{ id: "inicial", afterStep: 0 }]);
    assert.deepEqual(m2.viewport, { width: 1280, height: 900 });
  });

  await test("extrator: campo fora da lista fechada PARA a extração (em _meta, passo, parada, janela); relata o nome, nunca o valor", () => {
    const casos: [string, Buffer, RegExp][] = [
      ["_meta", referencia({ cookies: SEGREDO }), /_meta tem campo\(s\) fora da lista fechada: cookies/],
      ["_meta (dois)", referencia({ headers: SEGREDO, lingua: SEGREDO }), /headers, lingua/],
      ["passo", referencia({ setup: [{ action: "click", selector: ".abrir", nota: SEGREDO }] }), /setup\[0\]: campo fora da lista: nota/],
      ["parada", referencia({ states: [{ id: "inicial", afterStep: 0, descricao: SEGREDO }] }), /states\[0\] tem campo\(s\) fora da lista fechada: descricao/],
      ["janela", referencia({ viewport: { width: 1, height: 1, deviceScaleFactor: 2 } }), /viewport: só width e height/],
      ["ação desconhecida", referencia({ setup: [{ action: "hover", selector: ".abrir" }] }), /setup\[0\]: passo inválido/],
      ["afterStep fora", referencia({ states: [{ id: "inicial", afterStep: 9 }] }), /afterStep fora de 0\.\.2/],
    ];
    for (const [nome, texto, re] of casos) {
      let msg = "";
      assert.throws(() => extrairManifesto(texto, ORIGEM), (e: Error) => { msg = e.message; return re.test(e.message); }, nome);
      assert.ok(!msg.includes(SEGREDO), `${nome}: o valor do campo apareceu na mensagem`);
    }
    // a lista fechada separa as duas classes, sem sobreposição
    assert.equal(CAMPOS_OPERACIONAIS.filter((c) => (CAMPOS_DOCUMENTAIS as readonly string[]).includes(c)).length, 0);
  });

  await test("manifesto: quem o lê confere esquema fechado e sha256 do conteúdo (alterado depois da extração = recusado)", () => {
    const m = extrairManifesto(referencia(), ORIGEM);
    const copia = () => JSON.parse(JSON.stringify(m)) as ManifestoNavegacao & Record<string, unknown>;
    const alterado = copia(); alterado.setup[0].selector = ".outro";
    assert.throws(() => validarManifesto(alterado), /sha256 do conteúdo não confere/);
    const extra = copia(); extra.specs = [];
    assert.throws(() => validarManifesto(extra), /campo fora do esquema: specs/);
    const semParadas = copia(); semParadas.paradas = []; semParadas.sha256 = sha256DoConteudo(semParadas);
    assert.throws(() => validarManifesto(semParadas), /paradas: lista vazia/);
    const passoExtra = copia(); (passoExtra.setup[0] as unknown as Record<string, unknown>).nota = "x"; passoExtra.sha256 = sha256DoConteudo(passoExtra);
    assert.throws(() => validarManifesto(passoExtra), /setup\[0\]: campo fora da lista: nota/);
  });

  await test("extrator nas referências das telas de desenvolvimento A, A2 e B: passa pela lista fechada, nada além da navegação", () => {
    for (const [tela, arquivo] of [["solicitacao", "ground-truth-solicitacao.json"], ["acompanhamento", "ground-truth-acompanhamento.json"], ["vistorias", "ground-truth-vistorias.json"]]) {
      const texto = readFileSync(join(ROOT_EVAL, arquivo));
      const m = extrairManifesto(texto, { tela, arquivo });
      const ref = JSON.parse(texto.toString("utf8")) as { _meta: Record<string, unknown>; violations: { id: string }[] };
      assert.deepEqual(m.setup, ref._meta.setup, `${tela}: setup copiado como está`);
      assert.deepEqual(m.paradas.map((p) => p.id), (ref._meta.states as { id: string }[]).map((s) => s.id));
      const s = JSON.stringify(m);
      for (const v of ref.violations) assert.ok(!s.includes(`"${v.id}"`), `${tela}: id de spec no manifesto`);
      for (const k of CAMPOS_DOCUMENTAIS) if (typeof ref._meta[k] === "string" && (ref._meta[k] as string).length > 20) assert.ok(!s.includes(ref._meta[k] as string), `${tela}: ${k} no manifesto`);
    }
  });

  // ── gerador numa cópia mínima do govbr-eval, sem nenhuma referência ─────────────────────────────────────────────
  const T = join(ROOT, "isolado");
  const EVAL = join(T, "eval");
  const MODULOS = ["scripts/vazamento/inventario-dom.ts", "scripts/vazamento/manifesto-navegacao.ts", "scripts/vazamento/conhecimento.ts",
    "scripts/vazamento/nucleo.ts", "scripts/anchors.ts", "runner/lib.ts", "types.ts", "package.json"];
  for (const rel of MODULOS) { mkdirSync(dirname(join(EVAL, rel)), { recursive: true }); copyFileSync(join(ROOT_EVAL, rel), join(EVAL, rel)); }
  symlinkSync(join(ROOT_EVAL, "node_modules"), join(EVAL, "node_modules"), "junction");
  const SITE = "ab".repeat(32);
  mkdirSync(join(T, "telas"), { recursive: true });
  writeFileSync(join(T, "telas", "site-manifest.json"), JSON.stringify({ item: { sha256: SITE } }));
  const siteManifestSha = sha256(readFileSync(join(T, "telas", "site-manifest.json")));
  const manifesto = extrairManifesto(referencia({ viewport: { width: 1024, height: 700 } }), ORIGEM);
  writeFileSync(join(T, "manifesto.json"), JSON.stringify(manifesto, null, 1));
  const PAGINA = `<!doctype html><html><head><title>t</title></head><body><main><p class="pronto">ok</p>
    <button class="abrir" onclick="const d=document.createElement('section');d.className='caixa-aberta';d.innerHTML='<span class=\\'x-dentro\\'>a</span>';document.querySelector('main').append(d)">abrir</button>
    <a href="#" class="ligacao">l</a></main></body></html>`;
  const servidor: Server = createServer((req, res) => {
    if ((req.url ?? "").split("?")[0] === "/pagina.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGINA); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${(servidor.address() as { port: number }).port}`;
  const tsx = join(ROOT_EVAL, "node_modules", "tsx", "dist", "cli.mjs");
  // assíncrono: o site de brinquedo é servido por ESTE processo
  const gerar = (...args: string[]) => new Promise<{ status: number | null; stdout: string; stderr: string }>((ok) => {
    const filho = spawn(process.execPath, [tsx, join(EVAL, "scripts", "vazamento", "inventario-dom.ts"), ...args], { cwd: T });
    let stdout = "", stderr = "";
    filho.stdout.on("data", (d) => { stdout += d; });
    filho.stderr.on("data", (d) => { stderr += d; });
    const relogio = setTimeout(() => filho.kill(), 180_000);
    filho.on("close", (status) => { clearTimeout(relogio); ok({ status, stdout, stderr }); });
  });

  /** Todo arquivo da árvore isolada (sem seguir a junção do node_modules). */
  const arvore = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    if (n === "node_modules") return [];
    return statSync(p).isDirectory() ? arvore(p) : [p];
  });

  try {
    await test("gerador: roda numa cópia do govbr-eval SEM nenhuma referência nem telas.json, só com o manifesto e o site", async () => {
      const nomes = arvore(T).map((p) => p.split(/[\\/]/).pop()!);
      assert.ok(!nomes.some((n) => n.startsWith("ground-truth") || n === "telas.json"), "a árvore isolada tem referência");
      const r = await gerar("--manifesto", join(T, "manifesto.json"), "--telas", join(T, "telas"), "--site", base, "--saida", join(T, "saida"));
      assert.equal(r.status, 0, `gerador falhou:\n${r.stdout}\n${r.stderr}`);
      assert.match(r.stdout, /brinquedo: 2 paradas; \d+ tags, \d+ classes/);
      assert.ok(!arvore(T).some((p) => /ground-truth/.test(p)), "nenhuma referência apareceu na árvore");
      const texto = readFileSync(join(T, "saida", "brinquedo.json"));
      const inv = JSON.parse(texto.toString("utf8"));
      assert.equal(inv.contrato, "inventario-dom-1.2.0");
      assert.equal(inv.referencia, undefined, "o inventário 1.2.0 não carrega hash nem nome de referência");
      assert.deepEqual(inv.site, { siteSha256: SITE, manifestSha256: siteManifestSha });
      assert.deepEqual(inv.manifestoNavegacao, { sha256: manifesto.sha256, paradas: ["inicial", "aberta"] });
      assert.deepEqual(inv.viewport, { width: 1024, height: 700 });
      for (const t of ["main", "button", "section", "span", "a"]) assert.ok(inv.tags.includes(t), `tag ${t}`);
      for (const c of ["pronto", "abrir", "caixa-aberta", "x-dentro", "ligacao"]) assert.ok(inv.classes.includes(c), `classe ${c}`);
      assert.equal(inv.estados[0].classes < inv.estados[1].classes, true, "a parada depois do setup tem a caixa aberta");
      const { problemas, resumo } = conferirInventario(texto, manifesto, { siteSha256: SITE, manifestSha256: siteManifestSha });
      assert.deepEqual(problemas, []);
      assert.equal(resumo.paradas, 2);
    });

    await test("conferência do contrato: vínculo a outro site/manifesto, parada faltando e esquema quebrado falham; só contagens", () => {
      const texto = readFileSync(join(T, "saida", "brinquedo.json"), "utf8");
      const inv = JSON.parse(texto);
      const conf = (o: unknown, m: ManifestoNavegacao = manifesto, site = { siteSha256: SITE }) => conferirInventario(JSON.stringify(o), m, site).problemas.join(" | ");
      assert.match(conf(inv, manifesto, { siteSha256: "cd".repeat(32) }), /siteSha256 dado não está no inventário/);
      const outro = extrairManifesto(referencia({ waitFor: "main" }), ORIGEM);
      assert.match(conf(inv, outro), /manifestoNavegacao\.sha256 ≠/);
      const curto = structuredClone(inv); curto.estados.pop(); curto.manifestoNavegacao.paradas.pop();
      assert.match(conf(curto), /cobertura: 1 parada\(s\) do manifesto sem estado/);
      const caminho = structuredClone(inv); caminho.estados[1].afterStep = 1;
      assert.match(conf(caminho), /afterStep ou path diferente/);
      const desordenado = structuredClone(inv); desordenado.tags.reverse();
      assert.match(conf(desordenado), /tags não é lista/);
      const extra = structuredClone(inv); extra.referencia = { sha256: "x" };
      assert.match(conf(extra), /campo\(s\) fora do contrato/);
      const semVinculo = structuredClone(inv); delete semVinculo.site;
      assert.match(conf(semVinculo), /site\/sites fora do formato/);
      for (const p of [conf(curto), conf(desordenado), conf(extra)]) for (const t of [...inv.tags, ...inv.classes]) assert.ok(!new RegExp(`\\b${t}\\b`).test(p.replace(/site|sites|tags|classes/g, "")), `conteúdo "${t}" na mensagem`);
    });

    await test("detector lê o inventário 1.2.0 como antes (tags, classes, dinâmicas, vínculo ao site; outro site = nada)", async () => {
      mkdirSync(join(EVAL, "scripts", "vazamento", "inventario-dom"), { recursive: true });
      copyFileSync(join(T, "saida", "brinquedo.json"), join(EVAL, "scripts", "vazamento", "inventario-dom", "brinquedo.json"));
      const { inventarioDaTela } = await import(pathToFileURL(join(EVAL, "scripts", "vazamento", "conhecimento.ts")).href) as typeof import("./vazamento/conhecimento");
      const ok = inventarioDaTela("brinquedo", join(T, "telas"));
      assert.equal(ok.estado.status, "ok", JSON.stringify(ok.estado));
      assert.ok(ok.elements!.classes.has("caixa-aberta") && ok.elements!.tags.has("section"));
      const outro = join(T, "telas-outro");
      mkdirSync(outro, { recursive: true });
      writeFileSync(join(outro, "site-manifest.json"), JSON.stringify({ item: { sha256: "cd".repeat(32) } }));
      const fora = inventarioDaTela("brinquedo", outro);
      assert.equal(fora.estado.status, "site-diverge");
      assert.equal(fora.elements, null);
    });

    await test("gerador: recusa --tela, manifesto alterado e nenhum manifesto, antes de abrir o navegador", async () => {
      const tela = await gerar("--tela", "solicitacao", "--telas", join(T, "telas"), "--site", base);
      assert.notEqual(tela.status, 0);
      assert.match(tela.stderr, /--tela não existe desde o inventário 1\.2\.0/);
      const alterado = JSON.parse(JSON.stringify(manifesto)); alterado.entrada.waitFor = "body";
      writeFileSync(join(T, "alterado.json"), JSON.stringify(alterado));
      const r = await gerar("--manifesto", join(T, "alterado.json"), "--telas", join(T, "telas"), "--site", base, "--saida", join(T, "saida-alterado"));
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /sha256 do conteúdo não confere/);
      assert.ok(!existsSync(join(T, "saida-alterado")), "nada gravado");
      const nada = await gerar("--telas", join(T, "telas"), "--site", base);
      assert.notEqual(nada.status, 0);
      assert.match(nada.stderr, /uso: inventario-dom\.ts --manifesto/);
    });
  } finally {
    servidor.close();
    if (!manter) rmSync(ROOT, { recursive: true, force: true });
  }
  console.log(`${tests} testes do inventário em dois passos passaram.${manter ? ` Árvore em ${ROOT}` : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
