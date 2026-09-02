/**
 * Captura de telas reais (aplicação PNIP) como páginas estáticas do corpus.
 *
 * Por que congelar em vez de avaliar a aplicação rodando: uma aplicação viva muda embaixo da
 * medida — o backend devolve outro dado, o time faz deploy, a sessão expira. O D-06 exige que a
 * superfície medida seja a mesma em todas as execuções, e a única forma de garantir isso com
 * código de terceiros é fotografar o estado e medir a fotografia.
 *
 * O que a fotografia preserva, e por que ela não é um `outerHTML` qualquer:
 *
 *   Os componentes do gov.br usados pela aplicação real são WEB COMPONENTS com shadow root
 *   ABERTO (`<br-input>`, `<br-header>`, …). O conteúdo renderizado mora dentro do shadow root e
 *   NÃO aparece em `outerHTML`. Copiar o HTML servido produziria uma página onde esses elementos
 *   existem e não renderizam nada.
 *
 *   A saída, então, guarda o light DOM como veio — as tags `<br-*>` com seus atributos — e recarrega
 *   o MESMO bundle de webcomponents e o MESMO core.css da aplicação de origem. Os componentes
 *   voltam a hidratar no navegador e a página estática reconstrói a árvore real, shadow DOM
 *   incluído. É a diferença entre uma foto do DOM e uma foto do documento que gera o DOM.
 *
 * O que a fotografia NÃO preserva, e deve ser declarado em qualquer resultado: os bindings do
 * Angular. Botões não navegam, formulários não submetem. Estados que dependem de interação são
 * capturados como CAPTURAS SEPARADAS (`setup` abaixo), uma por estado, e nunca simulados depois.
 */

import { chromium } from "playwright";
import { createHash } from "crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const EVAL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TCC_ROOT = resolve(EVAL_ROOT, "..");
const APP_ROOT = join(TCC_ROOT, "cliente-web");
const OUT_DIR = join(TCC_ROOT, "govbr-corpus", "public", "real");
const ASSETS_DIR = join(OUT_DIR, "assets");

interface Alvo {
  /** Nome do arquivo gerado e id da tela no gabarito. */
  slug: string;
  /** Rota na aplicação rodando localmente. */
  path: string;
  /** Espera antes de fotografar — o Angular monta depois do load. */
  waitFor: string;
  /** Estado a produzir antes da foto. Cada estado vira uma captura própria. */
  setup?: Array<{ action: "click" | "fill" | "wait"; selector: string; value?: string }>;
  descricao: string;
}

const ALVOS: Alvo[] = [
  {
    slug: "pnip-login",
    path: "/login",
    waitFor: "button.br-button",
    descricao: "Tela de acesso via gov.br (rota pública, sem guard)",
  },
  {
    slug: "pnip-privacidade",
    path: "/privacidade",
    waitFor: "h1",
    descricao: "Política de privacidade (rota pública, conteúdo estático longo)",
  },
];

const BASE = process.env.PNIP_URL ?? "http://localhost:4210";

/** Os recursos externos da aplicação original, mantidos idênticos: fonte e ícones mudam medida. */
const HEAD_EXTERNO = [
  '<link rel="stylesheet" href="https://cdngovbr-ds.estaleiro.serpro.gov.br/design-system/fonts/rawline/css/rawline.css">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Raleway:300,400,500,600,700,800,900&display=swap">',
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">',
].join("\n  ");

function versaoPacote(nome: string): string {
  const pkg = JSON.parse(readFileSync(join(APP_ROOT, "node_modules", nome, "package.json"), "utf8"));
  return pkg.version as string;
}

function commitDaApp(): string {
  try {
    return execFileSync("git", ["-C", APP_ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "desconhecido";
  }
}

function copiarAtivos(): { css: string; js: string } {
  mkdirSync(ASSETS_DIR, { recursive: true });
  const css = join(APP_ROOT, "node_modules", "@govbr-ds", "core", "dist", "core.min.css");
  const js = join(APP_ROOT, "node_modules", "@govbr-ds", "webcomponents", "dist", "webcomponents.umd.min.js");
  copyFileSync(css, join(ASSETS_DIR, "core.min.css"));
  copyFileSync(js, join(ASSETS_DIR, "webcomponents.umd.min.js"));
  return { css: "core.min.css", js: "webcomponents.umd.min.js" };
}

async function main() {
  const ativos = copiarAtivos();
  const versoes = {
    core: versaoPacote("@govbr-ds/core"),
    webcomponents: versaoPacote("@govbr-ds/webcomponents"),
  };
  const commit = commitDaApp();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const manifesto: unknown[] = [];

  for (const alvo of ALVOS) {
    const url = `${BASE}${alvo.path}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector(alvo.waitFor, { timeout: 15_000 });

    for (const passo of alvo.setup ?? []) {
      if (passo.action === "click") await page.click(passo.selector);
      if (passo.action === "fill") await page.fill(passo.selector, passo.value ?? "");
      if (passo.action === "wait") await page.waitForSelector(passo.selector, { timeout: 10_000 });
    }

    // Light DOM da raiz do Angular: as tags <br-*> vêm com seus atributos, e é delas que os
    // componentes voltam a hidratar. O conteúdo de shadow root é deliberadamente NÃO copiado —
    // copiá-lo produziria markup que a aplicação real não tem.
    const { markup, titulo, lang } = await page.evaluate(() => {
      const raiz = document.querySelector("pnip-root");
      return {
        markup: raiz ? raiz.outerHTML : document.body.innerHTML,
        titulo: document.title,
        lang: document.documentElement.lang || "pt-br",
      };
    });

    const html = `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo}</title>
  ${HEAD_EXTERNO}
  <link rel="stylesheet" href="assets/${ativos.css}">
</head>
<body>
${markup}
<script src="assets/${ativos.js}"></script>
</body>
</html>
`;

    const arquivo = join(OUT_DIR, `${alvo.slug}.html`);
    writeFileSync(arquivo, html, "utf8");

    manifesto.push({
      slug: alvo.slug,
      descricao: alvo.descricao,
      origem: { app: "pnip-clientes-web", commit, rota: alvo.path, capturadoDe: url },
      estado: alvo.setup ? alvo.setup : "inicial",
      ds: versoes,
      arquivo: `public/real/${alvo.slug}.html`,
      sha256: createHash("sha256").update(html).digest("hex"),
      capturadoEm: new Date().toISOString(),
    });

    console.log(`✓ ${alvo.slug}  ${html.length} bytes  ← ${url}`);
  }

  await browser.close();

  const manifestoPath = join(OUT_DIR, "manifesto.json");
  writeFileSync(
    manifestoPath,
    JSON.stringify(
      {
        _meta: {
          o_que_e:
            "Telas reais da aplicação PNIP, congeladas como páginas estáticas. Uso autorizado pela " +
            "equipe do projeto para execução local. Nenhum dado de produção é capturado: só rotas " +
            "públicas, sem sessão.",
          por_que_congelar: "D-06 — a superfície medida tem de ser a mesma em todas as execuções.",
          limite_declarado:
            "Bindings do Angular não sobrevivem à captura. Cada estado de interação é uma captura " +
            "própria, nunca uma simulação posterior.",
          nunca_agregar_com: "ground-truth.json (TC-*), ground-truth-fluxo.json e a ala orgânica (D-13)",
        },
        capturas: manifesto,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nmanifesto: ${manifestoPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
