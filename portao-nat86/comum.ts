/**
 * NAT-86 — peças comuns do portão sem modelo (plano
 * `thesis-workspace/planejamento/atual/plano-nat86-portao-sem-modelo-2026-10-18.md`).
 *
 * Aqui ficam: o servidor local da raiz do corpus (sem rede; a pasta da reserva só abre com a bandeira
 * do portão), o executor das receitas do catálogo em Playwright puro (mesma semântica de
 * `controles/medir.mjs`), a tradução declarada da receita para as ações do oráculo e a derivação
 * declarada do localizador do sujeito. Nada aqui chama detector.
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { Page } from "playwright";
import { RAIZ_EVAL, RAIZ_TCC } from "../comparadores/comum";

export { RAIZ_EVAL, RAIZ_TCC };
export const PASTA_PORTAO = join(RAIZ_EVAL, "portao-nat86");
export const RAIZ_CORPUS_DIST = join(RAIZ_TCC, "govbr-corpus", "dist");
/** NAT-61: `GOVBR_VALIDATOR_DIR` aponta outro checkout do validator (o mesmo do runner/lib.ts). */
export const VALIDATOR_DIR = process.env.GOVBR_VALIDATOR_DIR ? resolve(process.env.GOVBR_VALIDATOR_DIR) : join(RAIZ_TCC, "govbr-ds-validator");

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png",
};

/** Servidor local da raiz. `/controles/b/` responde 403 a menos que `reservaAberta`. */
export async function servirRaiz(raiz: string, reservaAberta: boolean): Promise<{ base: string; servidor: Server }> {
  const servidor = createServer((req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      if (!reservaAberta && caminho.includes("/controles/b/")) {
        res.writeHead(403).end();
        return;
      }
      const alvo = resolve(raiz, "." + caminho);
      if (!alvo.startsWith(resolve(raiz))) throw new Error("fora da raiz");
      res.writeHead(200, { "content-type": TIPOS[extname(alvo)] ?? "application/octet-stream", "cache-control": "no-store" }).end(readFileSync(alvo));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", () => ok()));
  const endereco = servidor.address() as { port: number };
  return { base: `http://127.0.0.1:${endereco.port}`, servidor };
}

export interface Passo { acao: string; alvo?: string; valor?: string; tecla?: string; nome?: string; margem?: number; y?: number; topo?: number }

/** Passos que agem na página (capturar/recortar só observam). */
export const agePassos = (receita: Passo[]) => receita.filter((p) => p.acao !== "capturar" && p.acao !== "recortar");

/** Executa um passo do catálogo com Playwright puro (mesma semântica de controles/medir.mjs). */
export async function executarPasso(pagina: Page, passo: Passo): Promise<void> {
  switch (passo.acao) {
    case "preencher":
      if (passo.alvo!.includes(">>>")) {
        const host = pagina.locator(passo.alvo!.split(">>>")[0].trim());
        const caixa = await host.boundingBox();
        await host.click({ position: { x: 20, y: (caixa?.height ?? 28) - 14 } });
        await pagina.keyboard.press("Control+A");
        await pagina.keyboard.type(passo.valor ?? "");
      } else await pagina.fill(passo.alvo!, passo.valor ?? "");
      return;
    case "clicar": await pagina.click(passo.alvo!); return;
    case "focar": await pagina.focus(passo.alvo!); return;
    case "focarSemRolar": await pagina.evaluate((s) => (document.querySelector(s) as HTMLElement).focus({ preventScroll: true }), passo.alvo!); return;
    case "tecla": await pagina.keyboard.press(passo.tecla!); return;
    case "rolar": await pagina.evaluate((y) => window.scrollTo(0, y), passo.y ?? 0); return;
    case "rolarAte":
      await pagina.evaluate(({ alvo, topo }) => window.scrollTo(0, window.scrollY + document.querySelector(alvo!)!.getBoundingClientRect().top - (topo ?? 0)), passo);
      return;
    case "capturar":
    case "recortar":
      return;
    default:
      throw new Error(`ação desconhecida: ${passo.acao}`);
  }
}

/** Ação do oráculo (PageActionSchema do validator 2.13.0: click, fill, press, wait). */
export type AcaoOraculo = { action: "click"; selector: string } | { action: "fill"; selector: string; value: string } | { action: "press"; key: string; selector?: string };

/**
 * Tradução DECLARADA da receita do catálogo para as ações do oráculo (plano §3.3):
 *   preencher → fill (`a >>> b` vira `a b`: o CSS do Playwright atravessa raiz aberta; raiz fechada
 *   não é alcançável, e isso é o que o caso mede); clicar → click; focar X seguido de tecla K (ignorando
 *   capturar/recortar no meio) → press K com selector X; tecla sem foco pendente → press K.
 *   focar sem tecla em seguida, focarSemRolar, rolar e rolarAte não têm ação no oráculo: a receita fica
 *   `traduzivel: false` e a alegação vai com as ações traduzíveis (o estado pode não ser o da expectativa).
 */
export function traduzirReceita(receita: Passo[]): { acoes: AcaoOraculo[]; traduzivel: boolean; motivo: string | null } {
  const acoes: AcaoOraculo[] = [];
  let foco: string | null = null;
  const sem: string[] = [];
  for (const p of receita) {
    if (p.acao === "capturar" || p.acao === "recortar") continue;
    if (p.acao === "tecla") {
      acoes.push(foco ? { action: "press", selector: foco, key: p.tecla! } : { action: "press", key: p.tecla! });
      foco = null;
      continue;
    }
    if (foco) { sem.push(`focar ${foco} sem tecla em seguida`); foco = null; }
    if (p.acao === "preencher") acoes.push({ action: "fill", selector: p.alvo!.replace(/\s*>>>\s*/g, " "), value: p.valor ?? "" });
    else if (p.acao === "clicar") acoes.push({ action: "click", selector: p.alvo! });
    else if (p.acao === "focar") foco = p.alvo!;
    else sem.push(p.acao);
  }
  if (foco) sem.push(`focar ${foco} sem tecla em seguida`);
  return { acoes, traduzivel: sem.length === 0, motivo: sem.length ? sem.join("; ") : null };
}

/**
 * Localizador DERIVADO do sujeito da célula (plano §3.2), sem olhar o detector:
 *   1. tira o sufixo `@estado`;  2. `documento` → `html`;  3. `hN texto` → `hN:has-text("texto")`;
 *   4. `host::parte` (parte interna de raiz) → `host parte`;  5. seletor composto sem espaço que termina
 *   em `#id` (`input#cartao`, `modal#regras`, `.br-message#aviso`) → `#id`;  6. senão, o próprio texto.
 */
export function derivarLocalizador(sujeito: string): string {
  let s = sujeito.replace(/@.*$/, "").trim();
  if (s === "documento") return "html";
  const titulo = /^(h[1-6]) (.+)$/.exec(s);
  if (titulo) return `${titulo[1]}:has-text(${JSON.stringify(titulo[2])})`;
  if (s.includes("::")) s = s.replace(/::/g, " ");
  const id = /^[^\s]*#([\w-]+)$/.exec(s);
  if (id) return `#${id[1]}`;
  return s;
}

export const sha256Texto = async (b: Buffer | string) => (await import("node:crypto")).createHash("sha256").update(b).digest("hex");
