/**
 * Condições de medida da tela C = cadastrar empresa (plano thesis-workspace/planejamento/atual/
 * plano-tela-c-2026-10-18.md; método da tela B, tela-b/metodo-auditoria.md, como trocado pelo adendo
 * tela-c/metodo-auditoria-adendo-cadastrar-empresa.md). Sem modelo e sem detector: nada aqui importa
 * do govbr-ds-validator nem do axe.
 *
 * O que é genérico (prelúdio de caminhada com shadow roots, página nova com saída abortada, hidratação,
 * passos de setup com a semântica de scripts/anchors.ts) vem de tela-b/vistorias/comum.mjs, congelado
 * com a referência da B (D-61): as duas telas são medidas pelo MESMO código. Aqui fica só o que muda:
 *
 * - os BYTES medidos: `--candidato` mede o build ainda não congelado em ../pnip-mock/dist/pnip-c/
 *   (fase 1, antes do aceite e do commit; grava o sha256 de cada arquivo e o da lista); sem a opção,
 *   a árvore congelada govbr-corpus/{public,dist}/pnip-c/ conferida contra pnip-c/manifesto.json;
 * - o site: `telas.json › cadastrar-empresa.isolamento.site` (árvore pnip-c/, índice para GET sem
 *   extensão, o único alias do "Sair"), porta efêmera de 127.0.0.1 (nunca 3100/4100-4102);
 * - a entrada, a espera e a hidratação desta tela.
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { readFileSync, readdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join, extname, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { abrirNavegador, novaPagina, hidratar, executarPassos, PRELUDIO, VIEWPORT, FUSO } from "../tela-b/vistorias/comum.mjs";

export { abrirNavegador, novaPagina, hidratar, executarPassos, PRELUDIO, VIEWPORT, FUSO };

export const RAIZ_EVAL = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CORPUS = join(RAIZ_EVAL, "../govbr-corpus");
export const PNIP_MOCK = join(RAIZ_EVAL, "../pnip-mock");
export const NOME_TELA = "cadastrar-empresa";

const telas = JSON.parse(readFileSync(join(RAIZ_EVAL, "telas.json"), "utf8"));
export const TELA = telas[NOME_TELA];
export const SITE = TELA.isolamento.site;
export const ALA = SITE.arvore.replace(/\/+$/, "");
export const ENTRADA = "/" + TELA.entry;
/**
 * Espera da rota: o `br-checkbox` do módulo só existe depois que as três listas do carregamento
 * (módulos, permissões, usuários) chegam — o forkJoin do componente. Vira `_meta.waitFor`.
 */
export const WAIT_FOR = "main br-checkbox";

export const CANDIDATO = process.argv.includes("--candidato");
/** Raiz cujo `<ALA>/` é servido: o dist/ do corpus (congelado) ou o dist/ do pnip-mock (candidato). */
export const RAIZ_BYTES = CANDIDATO ? join(PNIP_MOCK, "dist") : join(CORPUS, "dist");

const listar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]);
const sha = caminho => createHash("sha256").update(readFileSync(caminho)).digest("hex");

/**
 * Identidade dos bytes medidos. Congelado: confere `<ALA>/manifesto.json` em public/ e dist/ (como
 * a tela B). Candidato: sha256 de cada arquivo e da lista ordenada "caminho\tsha256\n" — a mesma lista
 * que o manifesto do congelamento vai gravar, para provar depois que o inventário foi medido nos
 * bytes que congelaram.
 */
export function conferirBytes() {
  if (CANDIDATO) {
    const base = join(RAIZ_BYTES, ALA);
    if (!existsSync(join(base, "index.html"))) throw new Error(`build candidato ausente em ${base} (pnip-mock: node mock-tools/build-mock.mjs --base-href /${ALA}/ --output-path dist/${ALA})`);
    const arquivos = Object.fromEntries(listar(base).map(p => [relative(base, p).split(sep).join("/"), sha(p)]).sort(([a], [b]) => a < b ? -1 : 1));
    const lista = Object.entries(arquivos).map(([k, v]) => `${k}\t${v}\n`).join("");
    return { modo: "candidato", raiz: base, n: Object.keys(arquivos).length, sha256Lista: createHash("sha256").update(lista).digest("hex"), arquivos };
  }
  const manifestoCaminho = join(CORPUS, "public", ALA, "manifesto.json");
  if (!existsSync(manifestoCaminho)) throw new Error(`${ALA}/ ainda não está congelada no corpus; meça o candidato com --candidato`);
  const manifesto = JSON.parse(readFileSync(manifestoCaminho, "utf8"));
  const divergentes = [], fora = [], ausentes = [];
  for (const raiz of ["public", "dist"]) {
    const base = join(CORPUS, raiz, ALA);
    const presentes = new Set(listar(base).map(p => relative(base, p).split(sep).join("/")).filter(p => p !== "manifesto.json"));
    for (const [rel, esperado] of Object.entries(manifesto.arquivos)) {
      if (!presentes.has(rel)) { ausentes.push(`${raiz}/${ALA}/${rel}`); continue; }
      if (sha(join(base, rel)) !== esperado) divergentes.push(`${raiz}/${ALA}/${rel}`);
      presentes.delete(rel);
    }
    for (const p of presentes) fora.push(`${raiz}/${ALA}/${p}`);
  }
  const lista = Object.entries(manifesto.arquivos).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}\t${v}\n`).join("");
  return { modo: "congelado", manifestoSha: sha(manifestoCaminho), n: Object.keys(manifesto.arquivos).length,
    sha256Lista: createHash("sha256").update(lista).digest("hex"), divergentes, fora, ausentes };
}

export function exigirBytes() {
  const m = conferirBytes();
  if (m.modo === "congelado" && (m.divergentes.length || m.fora.length || m.ausentes.length)) {
    console.error(`árvore ${ALA}/ diverge do manifesto — a medida é recusada:\n` +
      [...m.divergentes.map(x => `  divergente ${x}`), ...m.fora.map(x => `  fora do manifesto ${x}`), ...m.ausentes.map(x => `  ausente ${x}`)].join("\n"));
    process.exit(2);
  }
  const { arquivos, ...resumo } = m;
  return resumo;
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject", ".txt": "text/plain" };

/** Servidor próprio com as regras da superfície para a árvore desta tela. */
export async function servir() {
  const prefixo = "/" + ALA + "/";
  const excluir = new Set((SITE.excluir ?? []).map(x => "/" + x));
  const servidor = createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (SITE.aliases?.[caminho]) caminho = "/" + SITE.aliases[caminho];
      else if (caminho.startsWith(prefixo) && !extname(caminho)) caminho = "/" + SITE.indice;
      if (!caminho.startsWith(prefixo) || excluir.has(caminho)) throw new Error("fora do site");
      const corpo = await readFile(join(RAIZ_BYTES, caminho));
      res.writeHead(200, { "content-type": TIPOS[extname(caminho).toLowerCase()] ?? "application/octet-stream" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(ok => servidor.listen(0, "127.0.0.1", ok));
  return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

/** Carga nova da entrada até a rota hidratada com as listas do carregamento. */
export async function carregar(pagina, base) {
  await pagina.goto(base + ENTRADA, { waitUntil: "networkidle" });
  await pagina.waitForSelector(WAIT_FOR, { timeout: 15_000 });
  await hidratar(pagina);
  await pagina.waitForTimeout(300);
}

/** Chamadas que o mock atendeu e as que ele NÃO tinha (registro do próprio mock, no navegador). */
export const registroDoMock = pagina => pagina.evaluate(() => ({
  atendidos: Object.keys(window.__pnipMock?.atendidos?.() ?? {}),
  naoMockados: window.__pnipMock?.naoMockados?.() ?? [],
}));
