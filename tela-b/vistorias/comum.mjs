/**
 * Condições de medida da tela B = Vistorias (tela-b/metodo-auditoria.md § 1, como trocado pelo
 * adendo tela-b/metodo-auditoria-adendo-vistorias.md § A). Sem modelo e sem oráculo: nada aqui
 * importa do govbr-ds-validator nem do axe.
 *
 * - confere o sha256 de CADA arquivo de `pnip/manifesto.json`, em `public/` e em `dist/`, e recusa
 *   se algum divergir ou se houver arquivo fora do manifesto;
 * - serve o `dist/` do corpus como a superfície serve a árvore (`telas.json › vistorias.isolamento.site`):
 *   só a árvore `pnip/` menos o manifesto, índice para GET sem extensão sob `/pnip/` e o único alias
 *   do ícone "Sair"; porta efêmera de 127.0.0.1 (nunca 3100/4100-4102);
 * - janela 1280×900, fuso America/Sao_Paulo, Chromium do Playwright do govbr-eval, headless por
 *   padrão (`--headed` mostra a janela);
 * - `externos: []`: toda requisição fora da origem é ABORTADA e registrada (falha de medida);
 * - registra método e caminho de toda requisição à origem, para que uma escrita no mock
 *   (POST/PUT/PATCH/DELETE a `/api/`) apareça.
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { readFileSync, readdirSync } from "fs";
import { createHash } from "crypto";
import { join, extname, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

export const RAIZ_EVAL = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const CORPUS = join(RAIZ_EVAL, "../govbr-corpus");
export const DIST = join(CORPUS, "dist");
export const ENTRADA = "/pnip/portal-mpa/vistorias?mock-perfil=mpa";
export const VIEWPORT = { width: 1280, height: 900 };
export const FUSO = "America/Sao_Paulo";
/** Espera da rota da lista: a primeira linha da tabela da aba padrão (vira `_meta.waitFor`). */
export const WAIT_FOR = "main tbody tr";
export const HEADLESS = !process.argv.includes("--headed");

const telas = JSON.parse(readFileSync(join(RAIZ_EVAL, "telas.json"), "utf8"));
export const SITE = telas.vistorias.isolamento.site;

const listar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]);
const sha = caminho => createHash("sha256").update(readFileSync(caminho)).digest("hex");

/**
 * Confere a árvore `pnip/` contra o manifesto, em `public/` e em `dist/`. Devolve
 * `{ manifestoSha, n, divergentes, fora, ausentes }`; qualquer lista não vazia recusa a medida.
 */
export function conferirManifesto() {
  const manifestoCaminho = join(CORPUS, "public/pnip/manifesto.json");
  const manifesto = JSON.parse(readFileSync(manifestoCaminho, "utf8"));
  const divergentes = [], fora = [], ausentes = [];
  for (const raiz of ["public", "dist"]) {
    const base = join(CORPUS, raiz, "pnip");
    const presentes = new Set(listar(base).map(p => relative(base, p).split(sep).join("/")).filter(p => p !== "manifesto.json"));
    for (const [rel, esperado] of Object.entries(manifesto.arquivos)) {
      if (!presentes.has(rel)) { ausentes.push(`${raiz}/pnip/${rel}`); continue; }
      if (sha(join(base, rel)) !== esperado) divergentes.push(`${raiz}/pnip/${rel}`);
      presentes.delete(rel);
    }
    for (const p of presentes) fora.push(`${raiz}/pnip/${p}`);
  }
  const manifestoDist = sha(join(CORPUS, "dist/pnip/manifesto.json"));
  const manifestoSha = sha(manifestoCaminho);
  if (manifestoDist !== manifestoSha) divergentes.push("dist/pnip/manifesto.json (≠ public)");
  return { manifestoSha, n: Object.keys(manifesto.arquivos).length, divergentes, fora, ausentes, ds: manifesto.ds, hoje: manifesto.hojeCongelado };
}

export function exigirManifesto() {
  const m = conferirManifesto();
  if (m.divergentes.length || m.fora.length || m.ausentes.length) {
    console.error("árvore pnip/ diverge do manifesto — a medida é recusada:\n" +
      [...m.divergentes.map(x => `  divergente ${x}`), ...m.fora.map(x => `  fora do manifesto ${x}`), ...m.ausentes.map(x => `  ausente ${x}`)].join("\n"));
    process.exit(2);
  }
  return m;
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject", ".txt": "text/plain" };

/** Servidor próprio com as regras da superfície para a árvore `pnip/`. */
export async function servir() {
  const prefixo = "/" + SITE.arvore.replace(/\/+$/, "") + "/";
  const excluir = new Set((SITE.excluir ?? []).map(x => "/" + x));
  const servidor = createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (SITE.aliases?.[caminho]) caminho = "/" + SITE.aliases[caminho];
      else if (caminho.startsWith(prefixo) && !extname(caminho)) caminho = "/" + SITE.indice;
      if (!caminho.startsWith(prefixo) || excluir.has(caminho)) throw new Error("fora do site");
      const corpo = await readFile(join(DIST, caminho));
      res.writeHead(200, { "content-type": TIPOS[extname(caminho).toLowerCase()] ?? "application/octet-stream" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(ok => servidor.listen(0, "127.0.0.1", ok));
  return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

export async function abrirNavegador() { return chromium.launch({ headless: HEADLESS }); }

/**
 * Contexto novo (carga nova: recarregar zera a loja do mock). Registra toda requisição; aborta as
 * que saem da origem. `escritas()` devolve as requisições de método ≠ GET/HEAD/OPTIONS à origem.
 */
export async function novaPagina(navegador) {
  const contexto = await navegador.newContext({ viewport: VIEWPORT, timezoneId: FUSO, locale: "pt-BR" });
  const pagina = await contexto.newPage();
  const pedidos = [];
  await pagina.route("**/*", rota => {
    const r = rota.request();
    const u = new URL(r.url());
    const externo = !/^(data|blob|about):/.test(r.url()) && u.hostname !== "127.0.0.1";
    pedidos.push({ metodo: r.method(), host: u.hostname, caminho: u.pathname, externo });
    return externo ? rota.abort() : rota.continue();
  });
  const erros = [];
  pagina.on("pageerror", e => erros.push(String(e.message).split("\n")[0]));
  const escritas = () => pedidos.filter(p => !p.externo && !["GET", "HEAD", "OPTIONS"].includes(p.metodo));
  const externos = () => pedidos.filter(p => p.externo);
  return { contexto, pagina, pedidos, erros, escritas, externos };
}

/** Espera a hidratação dos `br-*` presentes (whenDefined) — passo 1 do § 2. */
export async function hidratar(pagina) {
  await pagina.evaluate(async () => {
    const tags = new Set();
    const visitar = raiz => { for (const el of raiz.querySelectorAll("*")) { const t = el.tagName.toLowerCase(); if (t.startsWith("br-") && t.includes("-")) tags.add(t); if (el.shadowRoot) visitar(el.shadowRoot); } };
    visitar(document);
    await Promise.all([...tags].map(t => Promise.race([customElements.whenDefined(t), new Promise(r => setTimeout(r, 3000))])));
  });
}

/** Carga nova da entrada até a rota da lista hidratada. */
export async function carregar(pagina, base) {
  await pagina.goto(base + ENTRADA, { waitUntil: "networkidle" });
  await pagina.waitForSelector(WAIT_FOR, { timeout: 15_000 });
  await hidratar(pagina);
  await pagina.waitForTimeout(300);
}

/** Executa passos de setup com a mesma semântica de scripts/anchors.ts › runSetupSteps. */
export async function executarPassos(pagina, passos) {
  for (const p of passos) {
    if (p.action === "click") await pagina.click(p.selector, { timeout: 10_000 });
    else if (p.action === "fill") await pagina.fill(p.selector, p.value ?? "");
    else if (p.action === "wait") { if (p.selector) await pagina.waitForSelector(p.selector, { timeout: 10_000 }); else await pagina.waitForTimeout(p.ms ?? 250); }
    else if (p.action === "navigate") {
      const antes = pagina.url();
      const doc = await pagina.evaluate(() => window.__auditoriaDoc || (window.__auditoriaDoc = Math.random().toString(36).slice(2)));
      if (p.selector) { await pagina.click(p.selector, { timeout: 10_000 }); await pagina.waitForURL(u => u.href !== antes, { timeout: 10_000, waitUntil: "commit" }); }
      else await pagina.evaluate(c => { history.pushState(null, "", c); dispatchEvent(new PopStateEvent("popstate", { state: null })); }, p.path);
      await pagina.waitForSelector(p.waitFor, { timeout: 10_000 });
      const depois = await pagina.evaluate(() => window.__auditoriaDoc || null);
      if (depois !== doc) throw new Error(`navigate ${JSON.stringify(p)}: documento recarregado`);
      await hidratar(pagina);
    } else throw new Error(`passo desconhecido ${JSON.stringify(p)}`);
  }
  await pagina.waitForTimeout(passos.length ? 1200 : 0);
}

export { chromium };

/**
 * Prelúdio executado DENTRO da página (texto): caminhada por light DOM + shadow roots abertas,
 * chave estrutural (`tag:nth-of-type` com ` >>> ` na fronteira de shadow, a mesma forma de
 * scripts/anchors.ts › keyOf) e visibilidade medida. Igual ao de tela-b/comum.mjs, repetido aqui
 * para que a auditoria da privacidade continue intocada.
 */
export const PRELUDIO = `
  const SOMBRA = " >>> ";
  const raizDe = el => el.getRootNode();
  const ehSombra = r => !!(r && r.host);
  const seg = el => {
    const tag = el.tagName.toLowerCase();
    const pai = el.parentElement || (ehSombra(raizDe(el)) ? raizDe(el) : null);
    const mesmas = pai ? Array.from(pai.children).filter(c => c.tagName === el.tagName) : [el];
    return mesmas.length > 1 ? tag + ":nth-of-type(" + (mesmas.indexOf(el) + 1) + ")" : tag;
  };
  const chave = inicio => {
    const arvores = []; let partes = []; let el = inicio;
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      partes.unshift(seg(el));
      if (el.parentElement) { el = el.parentElement; continue; }
      const r = raizDe(el);
      if (ehSombra(r)) { arvores.unshift(partes.join(">")); partes = []; el = r.host; continue; }
      break;
    }
    arvores.unshift(partes.join(">"));
    return arvores.filter(Boolean).join(SOMBRA);
  };
  const todos = () => {
    const out = [];
    const visitar = raiz => { for (const el of raiz.querySelectorAll("*")) { out.push(el); if (el.shadowRoot) visitar(el.shadowRoot); } };
    visitar(document);
    return out;
  };
  const visivel = el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" &&
      (typeof el.checkVisibility !== "function" || el.checkVisibility({ checkVisibilityCSS: true }));
  };
  const ativoProfundo = () => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a; };
  const queryAll = (selector) => {
    if (selector.indexOf(">>>") !== -1) {
      const hops = selector.split(">>>").map(s => s.trim()).filter(Boolean);
      let roots = [document]; let found = [];
      for (let i = 0; i < hops.length; i++) {
        found = [];
        for (const r of roots) found.push.apply(found, Array.from(r.querySelectorAll(hops[i])));
        if (i < hops.length - 1) roots = found.map(e => e.shadowRoot).filter(Boolean);
      }
      return found;
    }
    const out = [];
    const visit = (root) => { out.push.apply(out, Array.from(root.querySelectorAll(selector))); for (const el of Array.from(root.querySelectorAll("*"))) if (el.shadowRoot) visit(el.shadowRoot); };
    visit(document);
    return out;
  };
`;
