/**
 * Peças comuns aos comparadores da NAT-76 (plano `plano-nat76-comparadores-2026-10-16.md`).
 *
 * Nada aqui vem do govbr-ds-validator. A resolução de elemento é a de `scripts/anchors.ts` — a mesma
 * da linha de base do axe —, importada, nunca copiada.
 */
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser, BrowserContext, Page } from "playwright";
import selectorParser from "postcss-selector-parser";

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_EVAL = resolve(AQUI, "..");
export const RAIZ_TCC = resolve(RAIZ_EVAL, "..");

export const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
export const json = (o: unknown) => JSON.stringify(o, null, 2) + "\n";
export function gravar(arquivo: string, conteudo: string | Buffer) {
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, conteudo);
}
export const barra = (p: string) => p.split("\\").join("/");
export const arg = (nome: string, padrao: string | null = null) =>
  process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : padrao;

// ------------------------------------------------------------------ divisões dos controles
export type Divisao = "desenvolvimento" | "reserva";

/**
 * A reserva (NAT-86) usa a MESMA configuração congelada; só roda com a bandeira do portão. Nesta
 * tarefa nada abre a reserva: o caminho existe para o portão, não para desenvolvimento.
 */
export function arquivoDeExpectativas(divisao: Divisao): string {
  if (divisao === "reserva") {
    if (!process.argv.includes("--portao-nat86")) throw new Error("a reserva só é medida no portão NAT-86 (--portao-nat86)");
    return join(RAIZ_EVAL, "controles", "reserva", "expectativas.json");
  }
  return join(RAIZ_EVAL, "controles", "expectativas.json");
}

export interface Celula { sujeito: string; normas: string[]; esperado: string; nota?: string }
export interface Passo { acao: string; alvo?: string; valor?: string; tecla?: string; nome?: string; margem?: number; y?: number; topo?: number; soDom?: boolean }
export interface Gemeo {
  gemeo: string;
  caso: string;
  familia: string;
  papel: string;
  celulas: Celula[];
  pagina: { id: string; caminho: string; sha256: string; js?: string; jsSha256?: string };
  viewport: { width: number; height: number };
  toque: boolean;
  receita: Passo[];
  derivacao?: { de: string; paginaDe: string; mudanca: string; trocas: [string, string][]; trocasJs: [string, string][] } | null;
}
export interface Expectativas { _meta: Record<string, unknown>; gemeos: Gemeo[] }

export function lerExpectativas(divisao: Divisao): { arquivo: string; sha256: string; exp: Expectativas } {
  const arquivo = arquivoDeExpectativas(divisao);
  const bytes = readFileSync(arquivo);
  return { arquivo, sha256: sha256(bytes), exp: JSON.parse(bytes.toString("utf8")) as Expectativas };
}

/** Papéis cujo objeto é o PACOTE de evidência, não a página: nenhum comparador os lê (plano §4). */
export const PAPEIS_DE_EVIDENCIA = new Set(["estado-diferente", "evidencia-velha", "dado-faltante"]);

/** Contagem por célula (plano §5). */
export function classeDoEsperado(esperado: string): "positivo" | "negativo" | "aparte" {
  if (esperado === "confirmed") return "positivo";
  if (esperado === "conforme" || esperado === "nao-aplicavel") return "negativo";
  return "aparte";
}

// ------------------------------------------------------------------ normas
const HASH12 = /([0-9a-f]{12})$/;
/** Duas listas de normas se cruzam por igualdade ou pelo mesmo hash de 12 dígitos (plano §5). */
export function normasCruzam(a: readonly string[], b: readonly string[]): boolean {
  for (const x of a)
    for (const y of b) {
      if (x === y) return true;
      const hx = x.match(HASH12)?.[1];
      if (hx && hx === y.match(HASH12)?.[1]) return true;
    }
  return false;
}

// ------------------------------------------------------------------ seletores
const PSEUDO_ACAO = new Set([":hover", ":focus", ":focus-visible", ":focus-within", ":active", ":visited", ":target"]);
const PSEUDO_ELEMENTO_LEGADO = new Set([":before", ":after", ":first-line", ":first-letter", ":selection", ":placeholder"]);

/**
 * Reduz um seletor ao sujeito estático (plano §5): tira pseudo-classes de ação do usuário,
 * pseudo-elementos e `:not(...)` que só continha pseudo-classes de ação; `:root` → `html`. Devolve
 * um seletor por item da lista. Seletor que não analisa volta como está (o resolvedor o reporta).
 */
export function reduzirSeletor(seletor: string): string[] {
  try {
    const saida: string[] = [];
    selectorParser((raiz) => {
      raiz.each((sel) => {
        sel.walkPseudos((p) => {
          const v = p.value.toLowerCase();
          if (v.startsWith("::") || PSEUDO_ELEMENTO_LEGADO.has(v) || PSEUDO_ACAO.has(v)) {
            p.remove();
            return;
          }
          if (v === ":root") p.replaceWith(selectorParser.tag({ value: "html" }));
        });
        sel.walkPseudos((p) => {
          if (p.value.toLowerCase() === ":not" && p.nodes.every((s) => s.nodes.length === 0)) p.remove();
        });
        let texto = sel.toString().trim();
        if (!texto) texto = "*";
        // sobra de composto vazio depois de combinador (".a > :hover" → ".a >"): o sujeito é o pai
        texto = texto.replace(/\s*[>+~]\s*$/, "").trim() || "*";
        saida.push(texto);
      });
    }).processSync(seletor);
    return [...new Set(saida)];
  } catch {
    return [seletor];
  }
}

/** Seletor normalizado para comparar origem (DS × página): espaços e pseudo-elementos legados. */
export function normalizarSeletorParaOrigem(seletor: string): string[] {
  try {
    const saida: string[] = [];
    selectorParser((raiz) => {
      raiz.each((sel) => {
        sel.walkPseudos((p) => {
          if (p.value.startsWith("::") && PSEUDO_ELEMENTO_LEGADO.has(p.value.slice(1).toLowerCase())) p.value = p.value.slice(1);
        });
        sel.walkAttributes((a) => {
          if (a.value !== undefined) a.quoteMark = null;
        });
        saida.push(sel.toString().replace(/\s*([>+~])\s*/g, "$1").replace(/\s+/g, " ").trim().toLowerCase());
      });
    }).processSync(seletor);
    return saida;
  } catch {
    return [seletor.replace(/\s+/g, " ").trim().toLowerCase()];
  }
}

// ------------------------------------------------------------------ sujeitos das células
export type SujeitoTraduzido = { seletor: string } | { tag: string; texto: string } | { naoResolvivel: string };

/** Tradução mecânica declarada (plano §5) da notação de sujeito do catálogo. */
export function traduzirSujeito(s: string): SujeitoTraduzido {
  const t = s.trim();
  if (t === "documento") return { seletor: "html" };
  const modal = t.match(/^(?:modal|menu)(#[\w-]+)(?:@[\w-]+)?$/);
  if (modal) return { seletor: modal[1] };
  const titulo = t.match(/^(h[1-6])\s+(.+)$/);
  if (titulo) return { tag: titulo[1], texto: titulo[2] };
  try {
    selectorParser().processSync(t);
    return { seletor: t };
  } catch {
    return { naoResolvivel: t };
  }
}

/**
 * Leva o sujeito a um seletor que o resolvedor entenda. Sujeito por texto (`h3 Seus empréstimos`)
 * recebe uma marca temporária no DOM, posta DEPOIS de qualquer captura de pixels.
 */
export async function seletorDoSujeito(page: Page, sujeito: string, indice: number): Promise<string | null> {
  const t = traduzirSujeito(sujeito);
  if ("seletor" in t) return t.seletor;
  if ("naoResolvivel" in t) return null;
  const marca = `comparador-sujeito-${indice}`;
  await page.evaluate(
    ({ tag, texto, marca }) => {
      document.querySelectorAll(tag).forEach((el) => {
        if ((el.textContent ?? "").trim() === texto) el.setAttribute("data-" + marca, "");
      });
    },
    { tag: t.tag, texto: t.texto, marca },
  );
  return `[data-${marca}]`;
}

// ------------------------------------------------------------------ servidor local sem rede
const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

export interface Servidor { base: string; fechar: () => Promise<void> }

/**
 * Serve `raiz` em 127.0.0.1 (porta efêmera). Com `site` (site-manifest.v1 do govbr-telas), só serve
 * os arquivos listados, confere o sha256 de cada um ANTES de subir e aplica o roteamento de SPA e os
 * aliases declarados — o mesmo contrato do `server.mjs` do pacote.
 */
export async function servir(raiz: string, site?: { files: { path: string; sha256: string }[]; routing?: { spa?: { prefix: string; index: string }; aliases?: Record<string, string> } }): Promise<Servidor> {
  const raizAbs = resolve(raiz);
  let permitidos: Set<string> | null = null;
  if (site) {
    permitidos = new Set();
    for (const f of site.files) {
      const atual = sha256(readFileSync(join(raizAbs, f.path)));
      if (atual !== f.sha256) throw new Error(`site congelado: ${f.path} difere do manifesto`);
      permitidos.add(f.path);
    }
  }
  const servidor: Server = createServer((req, res) => {
    try {
      let caminho = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      if (site?.routing?.aliases?.[caminho]) caminho = "/" + site.routing.aliases[caminho];
      else if (site?.routing?.spa && caminho.startsWith(site.routing.spa.prefix) && !extname(caminho)) caminho = "/" + site.routing.spa.index;
      const rel = caminho.replace(/^\/+/, "");
      if (permitidos && !permitidos.has(rel)) throw new Error("fora do manifesto");
      const alvo = resolve(raizAbs, rel);
      if (!alvo.startsWith(raizAbs)) throw new Error("fora da raiz");
      const corpo = readFileSync(alvo);
      res.writeHead(200, { "content-type": TIPOS[extname(alvo)] ?? "application/octet-stream", "cache-control": "no-store" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const endereco = servidor.address();
  const porta = typeof endereco === "object" && endereco ? endereco.port : 0;
  return { base: `http://127.0.0.1:${porta}`, fechar: () => new Promise((ok) => servidor.close(() => ok())) };
}

/** Contexto igual ao do `controles/medir.mjs` (plano §4), com pedidos de fora abortados. */
export async function novoContexto(navegador: Browser, base: string, viewport: { width: number; height: number }, toque = false): Promise<{ contexto: BrowserContext; externos: string[] }> {
  const contexto = await navegador.newContext({
    viewport, deviceScaleFactor: 1, hasTouch: toque, isMobile: toque, locale: "pt-BR", timezoneId: "America/Sao_Paulo",
  });
  const externos: string[] = [];
  await contexto.route("**/*", (rota) => {
    const u = new URL(rota.request().url());
    if (u.origin === base) return rota.continue();
    externos.push(rota.request().url());
    return rota.abort();
  });
  return { contexto, externos };
}

// ------------------------------------------------------------------ receita (mesmas ações do medir.mjs)
async function preencher(pagina: Page, alvo: string, valor: string) {
  if (alvo.includes(">>>")) {
    const host = pagina.locator(alvo.split(">>>")[0].trim());
    const caixa = await host.boundingBox();
    await host.click({ position: { x: 20, y: (caixa?.height ?? 28) - 14 } });
    await pagina.keyboard.press("Control+A");
    await pagina.keyboard.type(valor);
  } else await pagina.fill(alvo, valor);
}

/**
 * Executa a receita do gêmeo. Em cada ponto `capturar`/`recortar` espera 150 ms (como o medir.mjs)
 * e chama `noPonto` com o nome; as demais ações esperam 60 ms.
 */
export async function executarReceita(pagina: Page, receita: Passo[], noPonto: (nome: string, acao: string) => Promise<void>) {
  for (const passo of receita) {
    if (passo.acao === "capturar" || passo.acao === "recortar") {
      await pagina.waitForTimeout(150);
      await noPonto(chaveDoPonto(passo), passo.acao);
      continue;
    }
    if (passo.acao === "preencher") await preencher(pagina, passo.alvo!, passo.valor ?? "");
    else if (passo.acao === "clicar") await pagina.click(passo.alvo!);
    else if (passo.acao === "focar") await pagina.focus(passo.alvo!);
    else if (passo.acao === "focarSemRolar") await pagina.evaluate((s) => (document.querySelector(s) as HTMLElement).focus({ preventScroll: true }), passo.alvo!);
    else if (passo.acao === "tecla") await pagina.keyboard.press(passo.tecla!);
    else if (passo.acao === "rolar") await pagina.evaluate((y) => window.scrollTo(0, y), passo.y!);
    else if (passo.acao === "rolarAte")
      await pagina.evaluate(({ alvo, topo }) => window.scrollTo(0, window.scrollY + document.querySelector(alvo!)!.getBoundingClientRect().top - (topo ?? 0)), passo);
    else throw new Error(`ação desconhecida: ${passo.acao}`);
    await pagina.waitForTimeout(60);
  }
}

/** Pontos de captura da receita, na ordem. */
/** Recortes e capturas têm espaços de nome separados no medir.mjs (F6-01 tem os dois "com-foco"). */
export const chaveDoPonto = (p: Passo) => (p.acao === "recortar" ? `recorte:${p.nome}` : p.nome!);
export const pontosDaReceita = (r: Passo[]) => r.filter((p) => p.acao === "capturar" || p.acao === "recortar").map(chaveDoPonto);

// ------------------------------------------------------------------ alcance mecânico do lint (plano §6)
/** Intervalos [início, fim) do HTML que são CSS: conteúdo de <style> e valores de style="". */
export function intervalosDeCss(html: string): [number, number][] {
  const r: [number, number][] = [];
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) r.push([m.index! + m[0].indexOf(">") + 1, m.index! + m[0].length - "</style>".length]);
  for (const m of html.matchAll(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) r.push([m.index! + m[0].indexOf(m[1]) + 1, m.index! + m[0].length - 1]);
  return r;
}

/** Alguma troca declarada cai dentro de CSS da página-par? */
export function trocasTocamCss(htmlPar: string, trocas: [string, string][]): boolean {
  const ivs = intervalosDeCss(htmlPar);
  for (const [antigo] of trocas) {
    const i = htmlPar.indexOf(antigo);
    if (i < 0) continue;
    const f = i + antigo.length;
    if (ivs.some(([a, b]) => i < b && f > a)) return true;
  }
  return false;
}

/**
 * Marca mecânica dos FN visuais (plano §6, refinada no §10): toda troca declarada acontece em
 * contexto ARIA — o trecho antigo ou o novo cita `aria-` ou `role` (atributo na marcação ou
 * `setAttribute` no script da página). É marca, não veredito de alcance.
 */
export function trocasEmContextoAria(trocas: [string, string][], trocasJs: [string, string][]): boolean {
  const todas = [...trocas, ...trocasJs];
  if (todas.length === 0) return false;
  return todas.every(([a, n]) => /aria-[a-z]|\brole\b/i.test(a + "\n" + n));
}

export function existe(p: string) {
  return existsSync(p);
}
