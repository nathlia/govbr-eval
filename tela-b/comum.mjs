/**
 * Condições de medida da tela B (tela-b/metodo-auditoria.md § 1) — compartilhadas pelos scripts da
 * auditoria. Sem modelo e sem oráculo: nada aqui importa do govbr-ds-validator nem do axe.
 *
 * - confere os quatro sha256 do § 1 antes de medir (recusa se qualquer um divergir);
 * - serve o `dist/` do corpus num servidor próprio (porta efêmera, nunca 3100/4100-4102);
 * - janela 1280×900, Chromium do Playwright do govbr-eval;
 * - aborta por `page.route` os três hosts externos da captura (EXTERNOS, abaixo) e registra
 *   todo pedido, para que um pedido a host não declarado apareça.
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

export const RAIZ_EVAL = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DIST = join(RAIZ_EVAL, "../govbr-corpus/dist");
export const URL_TELA = "/real/pnip-privacidade.html";
export const VIEWPORT = { width: 1280, height: 900 };
export const WAIT_FOR = "br-header header.br-header .header-title";

export const HASHES = {
  "real/pnip-privacidade.html": "83d8e1973235dd08d2d14417c4764f78a566209c228a8af51211873a258f71a7",
  "real/manifesto.json": "d03efe953d7bcc4fbf23e0270eaeee3af0e2f824a3f196bc155d3658c4f60227",
  "real/assets/core.min.css": "cf176bd46bb3f8032991ef5c79ffe05997cd72d21951f287a6270fd05ed266aa",
  "real/assets/webcomponents.umd.min.js": "c196dbc1a8f5af079bb4c8c50bedb883872b2fa3f0e86d3451182072b77ae478",
};

/**
 * Recuo do § 9: a mesma auditoria em real/pnip-login.html. A tela de login NÃO está declarada em
 * telas.json (declarar é decisão da autora); seus hosts externos são os mesmos três que o <head> da
 * captura referencia, e os ausentes são medidos pela auditoria (tela-b/login/auditoria.md § 1).
 */
export const HASHES_LOGIN = {
  "real/pnip-login.html": "badd4707f5b59522a779143dc98b1bf68dd95cb938155d9118f0caaa48387c4f",
  "real/manifesto.json": HASHES["real/manifesto.json"],
  "real/assets/core.min.css": HASHES["real/assets/core.min.css"],
  "real/assets/webcomponents.umd.min.js": HASHES["real/assets/webcomponents.umd.min.js"],
};
export const PAGINAS = {
  privacidade: { url: URL_TELA, hashes: HASHES, raiz: "privacidade", inventario: "tela-b/inventario.json" },
  login: { url: "/real/pnip-login.html", hashes: HASHES_LOGIN, raiz: "pnip-login", inventario: "tela-b/login/inventario.json" },
};
/** `--pagina login` escolhe o recuo; sem a opção, a tela B como sempre. */
export function paginaDeArgs(args) {
  const i = args.indexOf("--pagina");
  const nome = i >= 0 ? args[i + 1] : "privacidade";
  if (!PAGINAS[nome]) throw new Error(`página desconhecida: ${nome}`);
  return { nome, ...PAGINAS[nome] };
}

// A captura de /privacidade saiu de telas.json quando a tela B passou a ser a de Vistorias (D-57).
// Estes são os valores que telas.json › privacidade.isolamento declarava (govbr-eval a493164), sob
// os quais estas auditorias foram medidas; ficam aqui para que o registro continue reproduzível.
export const EXTERNOS = ["cdngovbr-ds.estaleiro.serpro.gov.br", "fonts.googleapis.com", "cdnjs.cloudflare.com"];
export const AUSENTES = ["/real/assets/images/govbr-logo.png", "/assets/images/exit-icon.png"];

/** Confere os quatro arquivos em `public/` e em `dist/`. Devolve a lista de divergências. */
export function conferirHashes(hashes = HASHES) {
  const medidos = [];
  for (const [rel, esperado] of Object.entries(hashes)) {
    for (const raiz of ["public", "dist"]) {
      const caminho = join(RAIZ_EVAL, "../govbr-corpus", raiz, rel);
      let obtido;
      try { obtido = createHash("sha256").update(readFileSync(caminho)).digest("hex"); } catch { obtido = "ausente"; }
      medidos.push({ arquivo: `${raiz}/${rel}`, esperado, obtido, ok: obtido === esperado });
    }
  }
  return medidos;
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

export async function servir() {
  const servidor = createServer(async (req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const corpo = await readFile(join(DIST, caminho));
      res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(ok => servidor.listen(0, "127.0.0.1", ok));
  return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

/** Abre um contexto novo com a política de saída da bateria reproduzida por `page.route`. */
export async function novaPagina(navegador) {
  const contexto = await navegador.newContext({ viewport: VIEWPORT });
  const pagina = await contexto.newPage();
  const pedidos = [];
  await pagina.route("**/*", rota => {
    const u = new URL(rota.request().url());
    const externo = u.hostname !== "127.0.0.1";
    const abortado = EXTERNOS.includes(u.hostname);
    pedidos.push({ host: u.hostname, caminho: u.pathname, externo, abortado });
    return abortado || externo ? rota.abort() : rota.continue();
  });
  return { contexto, pagina, pedidos };
}

/** Carrega a tela e espera a hidratação (§ 2, passo 1). */
export async function carregar(pagina, base, url = URL_TELA) {
  await pagina.goto(base + url, { waitUntil: "networkidle" });
  await pagina.evaluate(async () => {
    const tags = new Set();
    const visitar = raiz => { for (const el of raiz.querySelectorAll("*")) { if (el.tagName.toLowerCase().startsWith("br-")) tags.add(el.tagName.toLowerCase()); if (el.shadowRoot) visitar(el.shadowRoot); } };
    visitar(document);
    await Promise.all([...tags].map(t => customElements.whenDefined(t)));
  });
  await pagina.waitForSelector(WAIT_FOR, { timeout: 10_000 });
}

export { chromium };

/**
 * Prelúdio executado DENTRO da página (texto): caminhada por light DOM + shadow roots abertas,
 * chave estrutural (`tag:nth-of-type` com ` >>> ` na fronteira de shadow, a mesma forma de
 * scripts/anchors.ts) e visibilidade medida.
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
`;
