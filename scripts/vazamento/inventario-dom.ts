/**
 * Inventário do DOM RENDERIZADO de cada tela (detector de vazamento 1.3.1, revisão adversarial de 02/11).
 *
 * O que é "fato da página" para a regra do seletor de elemento (núcleo, `inPageSelector`): o nome de tag ou de classe
 * que a tela de fato RENDERIZA, não um termo que exista em algum byte servido (os bundles do DS core e dos web
 * components trazem quase todos os nomes de componente: 124 de 126 termos `specs:*` estavam "na página" assim).
 *
 * Para cada tela do runner (solicitacao, vistorias), sobre o site congelado servido pelo `server.mjs` do govbr-telas:
 * abre a entrada da referência (`_meta.url` + `waitFor`, janela `_meta.viewport`), percorre o `_meta.setup` com o mesmo
 * executor da conferência da referência (`anchors.ts`: click, fill, wait, navigate sem recarga) e, em cada parada
 * declarada em `_meta.states` (depois do passo `afterStep`), coleta `localName` e `classList` de TODO elemento do
 * documento, atravessando shadow roots abertos. Só o setup e as paradas da referência são lidos (nenhuma spec).
 *
 * Saída: `scripts/vazamento/inventario-dom/<tela>.json` com o sha256 do site (`site-manifest.json` → item.sha256, o mesmo
 * `telas.siteSha256` que o images.lock.json fixa) e do manifesto; o detector só usa um inventário cujo siteSha256 é o do
 * site em `telasDir` (senão: sem inventário → a regra não perdoa nada, falha fechada).
 *
 *   npx tsx scripts/vazamento/inventario-dom.ts [--telas ../govbr-telas] [--tela vistorias]... [--site http://127.0.0.1:PORTA]
 *                                              [--vincular] [--saida <pasta>]
 *
 * Sem --site, sobe `node <telas>/server.mjs` numa porta livre e o encerra no fim.
 *
 * `--vincular` (detector 1.3.4): mede no site de `--telas` e compara com o arquivo existente campo a campo, fora o
 * vínculo (`site`/`sites`). Igual → acrescenta o site a `sites` (o arquivo de um site só vira `sites` com os dois, o
 * antigo primeiro); site já na lista → nada muda; diferente → lista os campos que diferem, não grava e sai com erro.
 * Sem `--vincular`, um arquivo que já tem `sites` não é sobrescrito (remedir do zero = apagá-lo antes). `--saida`
 * grava noutra pasta (lê o existente de lá também, se houver).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import type { FlowSetupStep } from "../../types";
import { openPage, runSetupSteps } from "../anchors";
import { DEFAULT_TELAS_DIR } from "../../runner/lib";
import { sitesDoInventario, type InventarioDom, type VinculoDeSite } from "./conhecimento";

export const INVENTARIO_VERSAO = "inventario-dom-1.1.0";
export const INVENTARIO_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "inventario-dom");
const ROOT_EVAL = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** Coleta no documento + shadow roots abertos. */
const COLETA = `(() => {
  const tags = new Set(), classes = new Set();
  const andar = (raiz) => {
    for (const el of raiz.querySelectorAll("*")) {
      tags.add(el.localName);
      for (const c of el.classList) classes.add(c);
      if (el.shadowRoot) andar(el.shadowRoot);
    }
  };
  andar(document);
  return { tags: [...tags].sort(), classes: [...classes].sort() };
})()`;

async function portaLivre(): Promise<number> {
  return new Promise((ok, erro) => {
    const s = createServer();
    s.once("error", erro);
    s.listen(0, "127.0.0.1", () => { const p = (s.address() as { port: number }).port; s.close(() => ok(p)); });
  });
}

async function servir(telasDir: string): Promise<{ url: string; filho: ChildProcess }> {
  const porta = await portaLivre();
  const filho = spawn(process.execPath, [join(telasDir, "server.mjs"), "--port", String(porta)], { cwd: telasDir, stdio: "ignore" });
  const url = `http://127.0.0.1:${porta}`;
  for (let i = 0; i < 100; i += 1) {
    if (await fetch(url + "/solicitacao.html").then((r) => r.ok).catch(() => false)) return { url, filho };
    await new Promise((r) => setTimeout(r, 100));
  }
  filho.kill();
  throw new Error(`server.mjs de ${telasDir} não respondeu em ${url}`);
}

interface Meta { url: string; waitFor?: string; viewport?: { width: number; height: number }; setup?: FlowSetupStep[]; states?: { id: string; afterStep: number; path?: string }[] }

type Fase = "setup" | "foco" | "hover";

/**
 * 1.1.0 (revisão de delta, 02/11): classes que o DS acrescenta em tempo de execução (`focus-visible` no foco por teclado,
 * classes de hover, estados transitórios do setup) não estão no retrato estático das paradas. Um MutationObserver posto
 * ANTES do primeiro script da página (documento e todo shadow root criado, por `attachShadow`) registra cada classe que
 * aparece num atributo `class` ou num nó inserido, com a fase em que apareceu primeiro.
 */
const OBSERVADOR = `(() => {
  window.__govbrFase = "setup";
  window.__govbrVistas = {};
  const reg = (el) => { if (el && el.classList) for (const c of el.classList) if (!(c in window.__govbrVistas)) window.__govbrVistas[c] = window.__govbrFase; };
  const obs = new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "attributes") reg(m.target);
      for (const n of m.addedNodes || []) if (n.nodeType === 1) { reg(n); if (n.querySelectorAll) n.querySelectorAll("*").forEach(reg); }
    }
  });
  const observar = (raiz) => obs.observe(raiz, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  observar(document);
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) { const r = original.call(this, init); observar(r); return r; };
})()`;

/** Elementos interativos visíveis (documento + shadow roots abertos): centro de cada um, para o hover. */
const INTERATIVOS = `(() => {
  const sel = "a[href], button, input, select, textarea, summary, label, [role=button], [role=link], [role=tab], [role=menuitem], [tabindex]";
  const out = []; const focaveis = { n: 0 };
  const andar = (raiz) => {
    for (const el of raiz.querySelectorAll("*")) {
      if (el.matches(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push([r.left + r.width / 2, r.top + r.height / 2, window.scrollY + r.top + r.height / 2]);
        if (el.tabIndex >= 0 && !el.disabled) focaveis.n += 1;
      }
      if (el.shadowRoot) andar(el.shadowRoot);
    }
  };
  andar(document);
  return { pontos: out.slice(0, 300), focaveis: focaveis.n };
})()`;

async function inventariar(browser: Browser, base: string, meta: Meta) {
  const setup = meta.setup ?? [];
  const estados = [...(meta.states ?? [{ id: "inicial", afterStep: 0 }])].sort((a, b) => a.afterStep - b.afterStep);
  const out: { id: string; afterStep: number; path: string; tags: string[]; classes: string[]; vistas: Record<string, Fase>; focados: number; sobrevoados: number }[] = [];
  for (const e of estados) {
    // uma página nova por parada: o Tab e o hover da parada não contaminam o setup da seguinte
    const ctx = await browser.newContext({ viewport: meta.viewport ?? { width: 1280, height: 900 } });
    await ctx.addInitScript(OBSERVADOR);
    const page = await ctx.newPage();
    await openPage(page, base + meta.url, { waitFor: meta.waitFor });
    await runSetupSteps(page, setup.slice(0, e.afterStep));
    await page.waitForTimeout(500);
    const c = await page.evaluate(COLETA) as { tags: string[]; classes: string[] };
    const path = new URL(page.url()).pathname;
    const { pontos, focaveis } = await page.evaluate(INTERATIVOS) as { pontos: [number, number, number][]; focaveis: number };
    // (a) foco por teclado: Tab por todos os focáveis da parada (limite 300)
    await page.evaluate(`window.__govbrFase = "foco"`);
    const tabs = Math.min(focaveis + 5, 300);
    for (let i = 0; i < tabs; i += 1) { await page.keyboard.press("Tab"); await page.waitForTimeout(20); }
    // (b) hover sobre cada elemento interativo visível (sem clicar)
    await page.evaluate(`window.__govbrFase = "hover"; document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
    let sobrevoados = 0;
    for (const [x, , yAbs] of pontos) {
      await page.evaluate(`window.scrollTo(0, ${Math.max(0, yAbs - 200)})`);
      const y = await page.evaluate(`${yAbs} - window.scrollY + 0`) as number;
      if (y < 0 || y > (meta.viewport?.height ?? 900)) continue;
      await page.mouse.move(x, y);
      await page.waitForTimeout(20);
      sobrevoados += 1;
    }
    const vistas = await page.evaluate(`window.__govbrVistas`) as Record<string, Fase>;
    await ctx.close();
    out.push({ id: e.id, afterStep: e.afterStep, path, ...c, vistas, focados: tabs, sobrevoados });
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const muitos = (k: string) => argv.flatMap((a, i) => (a === `--${k}` && argv[i + 1] ? [argv[i + 1]] : []));
  const telasDir = resolve(muitos("telas")[0] ?? DEFAULT_TELAS_DIR);
  const telas = muitos("tela").length ? muitos("tela") : ["solicitacao", "vistorias"];
  const vincular = argv.includes("--vincular");
  const saida = muitos("saida")[0] ? resolve(muitos("saida")[0]) : INVENTARIO_DIR;
  const manifestoTexto = readFileSync(join(telasDir, "site-manifest.json"));
  const manifesto = JSON.parse(manifestoTexto.toString("utf8")) as { item: { sha256: string } };
  const telasJson = JSON.parse(readFileSync(join(ROOT_EVAL, "telas.json"), "utf8")) as Record<string, { reference?: string | null }>;
  const servido = muitos("site")[0] ? { url: muitos("site")[0].replace(/\/+$/, ""), filho: null } : await servir(telasDir);
  const browser = await chromium.launch({ headless: true });
  mkdirSync(saida, { recursive: true });
  let divergentes = 0;
  try {
    for (const tela of telas) {
      const ref = telasJson[tela]?.reference;
      if (!ref) throw new Error(`telas.json: ${tela} sem referência (o setup e as paradas vêm dela)`);
      const refTexto = readFileSync(join(ROOT_EVAL, ref));
      const meta = (JSON.parse(refTexto.toString("utf8")) as { _meta: Meta })._meta;
      const url = meta.url.startsWith("/") ? meta.url : `/${meta.url}`;
      const estados = await inventariar(browser, servido.url, { ...meta, url });
      const tags = [...new Set(estados.flatMap((e) => e.tags))].sort();
      const classes = [...new Set(estados.flatMap((e) => e.classes))].sort();
      // dinâmicas: vistas pelo MutationObserver e fora do retrato estático de todas as paradas; guarda a 1ª fase
      const dinamicas: Record<string, Fase> = {};
      for (const e of estados) for (const [c, f] of Object.entries(e.vistas)) if (!classes.includes(c) && !(c in dinamicas)) dinamicas[c] = f;
      const classesDinamicas = Object.fromEntries(Object.entries(dinamicas).sort(([x], [y]) => x.localeCompare(y)));
      const doc = {
        contrato: INVENTARIO_VERSAO, tela,
        site: { siteSha256: manifesto.item.sha256, manifestSha256: sha256(manifestoTexto) },
        referencia: { arquivo: ref, sha256: sha256(refTexto), paradas: estados.map((e) => e.id) },
        viewport: meta.viewport ?? { width: 1280, height: 900 },
        nota: "nomes de tag (localName) e de classe (classList) presentes no DOM renderizado nas paradas declaradas da referência, shadow roots abertos atravessados; o detector de vazamento só perdoa nome de componente que esteja aqui, na posição certa",
        tags, classes,
        notaDinamicas: "classes que o DOM ganhou em tempo de execução e que não estão no retrato estático das paradas, com a fase em que o MutationObserver (documento + shadow roots) as viu primeiro: setup = durante a carga e o setup da referência; foco = Tab por todos os focáveis da parada; hover = mouse sobre cada elemento interativo da parada. O detector aceita classe em posição de classe de qualquer dos dois conjuntos; tags só do retrato estático",
        classesDinamicas,
        estados: estados.map((e) => ({ id: e.id, afterStep: e.afterStep, path: e.path, tags: e.tags.length, classes: e.classes.length, focados: e.focados, sobrevoados: e.sobrevoados })),
      };
      const destino = join(saida, `${tela}.json`);
      const resumo = `${estados.length} paradas; ${tags.length} tags, ${classes.length} classes, ${Object.keys(classesDinamicas).length} dinâmicas ${JSON.stringify(Object.values(classesDinamicas).reduce((n: Record<string, number>, f) => ((n[f] = (n[f] ?? 0) + 1), n), {}))}`;
      const existente = existsSync(destino) ? JSON.parse(readFileSync(destino, "utf8")) as InventarioDom & Record<string, unknown> : null;
      if (!vincular) {
        if (existente?.sites !== undefined) throw new Error(`${destino} tem vários sites: use --vincular (ou apague o arquivo para remedir do zero)`);
        writeFileSync(destino, JSON.stringify(doc, null, 1) + "\n");
        console.log(`${tela}: ${resumo} → ${destino}`);
        continue;
      }
      if (!existente) throw new Error(`--vincular: ${destino} não existe (meça sem --vincular primeiro)`);
      const vinculos: VinculoDeSite[] = existente.sites ?? (existente.site ? [existente.site] : []);
      sitesDoInventario(existente, destino);
      const { site: _medidoSite, ...medido } = doc as Record<string, unknown>;
      const { site: _site, sites: _sites, ...anterior } = existente;
      const campos = [...new Set([...Object.keys(medido), ...Object.keys(anterior)])];
      const diferem = campos.filter((k) => JSON.stringify(medido[k]) !== JSON.stringify(anterior[k]));
      if (diferem.length) {
        divergentes += 1;
        console.error(`${tela}: medição no site ${doc.site.siteSha256.slice(0, 12)} DIFERE do arquivo em ${diferem.join(", ")}; nada gravado`);
        for (const k of diferem) console.error(`   ${k}: arquivo ${JSON.stringify(anterior[k])?.slice(0, 300)}\n   ${k}: medido  ${JSON.stringify(medido[k])?.slice(0, 300)}`);
        continue;
      }
      if (vinculos.some((v) => v.siteSha256 === doc.site.siteSha256)) {
        console.log(`${tela}: ${resumo}; conteúdo idêntico e site ${doc.site.siteSha256.slice(0, 12)} já vinculado → ${destino} intocado`);
        continue;
      }
      const { contrato, tela: nomeTela, ...resto } = medido;
      const novo = { contrato, tela: nomeTela, sites: [...vinculos, doc.site], ...resto };
      sitesDoInventario(novo as unknown as InventarioDom, destino);
      writeFileSync(destino, JSON.stringify(novo, null, 1) + "\n");
      console.log(`${tela}: ${resumo}; conteúdo idêntico → site ${doc.site.siteSha256.slice(0, 12)} acrescentado (${novo.sites.length} sites) → ${destino}`);
    }
  } finally {
    await browser.close();
    servido.filho?.kill();
  }
  if (divergentes) throw new Error(`${divergentes} tela(s) com medição diferente do arquivo: vínculo não acrescentado`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
