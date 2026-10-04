/**
 * Painel de resultados (T8a) — servidor local.
 *
 *   npm run painel:resultados -- --arquivo <clone do govbr-resultados> [--porta 4610] [--revisora Nome] [--telas <clone do govbr-telas>]
 *   npm run painel:resultados -- recalcular --arquivo <clone> --analise <campanha>/<par ou runId> [--telas DIR]
 *   npm run painel:resultados -- preparar --arquivo <clone> (--par <campanha>/<par> | --execucao <runId>) [--anexos DIR] [--sem-download]
 *   npm run painel:resultados -- resumo --arquivo <clone>     grava <clone>/RESULTADOS.md (NAT-58; também POST /api/resumo)
 *
 * T8a.1: "Preparar análise" (preparar.ts) cria a PRIMEIRA análise de um par/execução arquivados pelo T4,
 * restaurando os pacotes dos anexos (conferidos por sha256). O anexo que faltar em `anexos/<release>/`
 * é baixado com `gh release download` (sessão da autora), salvo `--sem-download`.
 *
 * Lê SÓ a pasta passada em --arquivo. Toda rota é resolvida por id conhecido (chave do índice, id de
 * análise, nome de revisão, token de evidência); não há rota que receba caminho de arquivo, e nada fora
 * dessas rotas é servido. Nunca serve referência/gabarito: `entradas/referencia.json` e
 * `snapshots/referencia/**` ficam fora até do download. Escuta só em 127.0.0.1. Sem rede, sem modelo.
 *
 * Método e operação: docs/painel-resultados.md.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, request as requisicao, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { criarTarGz } from "../arquivo-resultados";
import {
  ID, PAINEL_VERSAO, chaveDoId, dentroDoArquivo, ehFixture, existeDiretorio, lerAnalise, lerIndice, vistaExecucao, vistaExecucoes, vistaPar,
} from "./modelo";
import { paginaAjuda, paginaErro, paginaExecucao, paginaExecucoes, paginaFila, paginaGuia, paginaPar, type Contexto, type Diagrama } from "./paginas";
import { baixarComGh, diagnosticoPreparo, prepararAnalise, preparoDaExecucao, preparoDosPares, type Diagnostico, type OpcoesPreparo } from "./preparar";
import { gravarResultados } from "./resultados";
import { arquivoDeEvidencia, imagemDaCena, recalcular, salvarDecisao, vistaFila, type PedidoDecisao } from "./revisao";

export interface OpcoesPainel {
  arquivo: string; revisora?: string; telas?: string | null;
  /** T8a.1: pastas extras onde procurar anexos de evidências baixados (`<anexo>.tar.gz`). */
  anexos?: string[];
  /** T8a.1: baixar o anexo que faltar com `gh release download` (padrão do CLI; os testes nunca baixam). */
  baixarAnexos?: boolean;
}

/** Arquivos de uma revisão que nunca saem do painel, nem no download. */
export const NUNCA_SERVIR = ["entradas/referencia.json"];

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..", "..");
/** A folha única do painel (tokens de cor, claro e escuro). */
const ESTILO = join(AQUI, "painel.css");
/** reveal.js servido de node_modules (versão fixada no package.json; sem CDN: o painel funciona offline). Só estes arquivos. */
const REVEAL: Record<string, { arquivo: string; tipo: string }> = {
  "reveal.js": { arquivo: "dist/reveal.js", tipo: "text/javascript; charset=utf-8" },
  "reveal.css": { arquivo: "dist/reveal.css", tipo: "text/css; charset=utf-8" },
  "reset.css": { arquivo: "dist/reset.css", tipo: "text/css; charset=utf-8" },
};
/** Os diagramas do /guia: arquivos próprios em docs/diagramas/ (o deck da defesa reaproveita os mesmos .svg). */
export const DIAGRAMAS: { arquivo: string; titulo: string; texto: string[] }[] = [
  { arquivo: "1-como-um-disparo-anda.svg", titulo: "Como um disparo anda", texto: [
    "No GitHub, cada disparo é uma execução. Coleta e linhas de base rodam ao mesmo tempo, sobre a mesma tela congelada; o arquivar grava tudo, até as falhas.",
    "No seu computador, o painel lê o clone do govbr-resultados: prepara a análise, abre a revisão cega, recalcula e mostra a comparação."] },
  { arquivo: "2-paredes-da-execucao.svg", titulo: "As paredes da execução", texto: [
    "O agente só alcança as próprias ferramentas — o navegador e, no braço com, o oráculo — e o provedor do modelo, por um proxy que só deixa passar esse endereço. É o navegador que abre a tela e entrega o relatório ao coletor.",
    "Tudo o mais fica do lado de fora, e cada execução prova isso com testes negativos que entram no pacote."] },
  { arquivo: "3-de-um-achado-ao-numero.svg", titulo: "De um achado ao número", texto: [
    "Nenhuma alegação vira crédito sozinha: cada uma vira um cartão, e a revisora decide sem saber o braço. Só depois o recálculo conta os defeitos confirmados.",
    "A comparação é por par, com n dito. Enquanto houver cartão pendente, o número é provisório e recall fica indisponível — nunca zero."] },
];
function diagramas(): Diagrama[] {
  return DIAGRAMAS.map((d, i) => ({ id: `d${i + 1}`, titulo: d.titulo, texto: d.texto,
    svg: readFileSync(join(RAIZ, "docs", "diagramas", d.arquivo), "utf8").replace(/^<\?xml[^>]*>\s*/, "") }));
}

const CABECALHOS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
};
/** O /guia carrega o reveal.js do próprio painel ('self'); o reveal.css usa ícones em data:. Nada de rede. */
const CSP_GUIA = "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";

function tarDaRevisao(arquivo: string, campanha: string, alvo: string, rev: string): { corpo: Buffer; nome: string } | null {
  const an = lerAnalise(arquivo, campanha, alvo);
  const rv = an?.revisoes.find(r => r.nome === rev);
  if (!an || !rv) return null;
  const tmp = mkdtempSync(join(tmpdir(), "painel-baixar-"));
  try {
    const copia = join(tmp, "rev");
    cpSync(rv.dir, copia, { recursive: true, filter: (src) => !NUNCA_SERVIR.some(n => resolve(src) === resolve(rv.dir, n)) });
    writeFileSync(join(copia, "LEIA-ME-PAINEL.txt"), [
      `Revisão ${rv.nome} da análise ${an.id}, baixada do painel de resultados (${PAINEL_VERSAO}).`,
      `Origem no arquivo: ${rv.rel}`,
      "Ficou de fora: entradas/referencia.json (a referência congelada). Ela está no arquivo de resultados por",
      `conteúdo, com o sha256 ${rv.resumo.versoes?.referencia.sha256 ?? "?"}; summary.json e score.json não dependem dela para serem lidos.`,
      "A vista do painel (Par, Resultado por braço) é reconstruída só com summary.json, analysis-binding.*.json e score.json.",
      "",
    ].join("\n"));
    const raiz = `${alvo}-${rv.nome}`;
    return { corpo: criarTarGz(copia, raiz), nome: `${campanha}__${raiz}.tar.gz` };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function tarDaExecucao(arquivo: string, chave: string): { corpo: Buffer; nome: string } | null {
  const e = lerIndice(arquivo).find(l => l.entrada?.chave === chave && l.entrada.tipo === "execucao")?.entrada;
  if (!e || e.estado.arquivo === "sem-pacote") return null;
  let dir: string;
  try { dir = dentroDoArquivo(arquivo, e.caminho); } catch { return null; }
  if (!existeDiretorio(dir)) return null;
  return { corpo: criarTarGz(dir, basename(dir)), nome: `${basename(dir)}.tar.gz` };
}

const lerCorpo = (req: IncomingMessage): Promise<string> => new Promise((ok, falha) => {
  let n = 0; const partes: Buffer[] = [];
  req.on("data", (c: Buffer) => { n += c.length; if (n > 65536) { falha(new Error("corpo grande demais")); req.destroy(); } else partes.push(c); });
  req.on("end", () => ok(Buffer.concat(partes).toString("utf8")));
  req.on("error", falha);
});

export function criarPainel(o: OpcoesPainel): Server {
  const arquivo = resolve(o.arquivo);
  if (!existeDiretorio(arquivo)) throw new Error(`--arquivo não é uma pasta: ${o.arquivo}`);
  const fixture = () => ehFixture(arquivo, lerIndice(arquivo));
  const preparo: OpcoesPreparo = { anexos: (o.anexos ?? []).map(d => resolve(d)), baixar: o.baixarAnexos ? baixarComGh : null };
  const diagPar = (v: NonNullable<ReturnType<typeof vistaPar>>): Diagnostico | null =>
    !v.analise && !v.faltando.length ? diagnosticoPreparo(arquivo, { tipo: "par", campanha: v.campanha, par: v.par }) : null;
  const diagExecucao = (v: NonNullable<ReturnType<typeof vistaExecucao>>): Diagnostico | null => {
    if (v.entrada.estado.arquivo === "sem-pacote") return null;
    const parCompleto = Boolean(v.linha.par) && vistaExecucoes(arquivo).pares.some(p => p.campanha === v.linha.campanha && p.par === v.linha.par && !p.faltando.length);
    return preparoDaExecucao(arquivo, v.linha, parCompleto);
  };

  const ctx = (): Contexto => ({ arquivo, fixture: fixture() });

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const enviar = (codigo: number, tipo: string, corpo: string | Buffer, extra: Record<string, string> = {}) => {
      res.writeHead(codigo, { ...CABECALHOS, "content-type": tipo, ...extra });
      res.end(corpo);
    };
    const html = (codigo: number, corpo: string) => enviar(codigo, "text/html; charset=utf-8", corpo);
    const json = (codigo: number, corpo: unknown) => enviar(codigo, "application/json; charset=utf-8", JSON.stringify(corpo));
    const nao = (api: boolean) => api ? json(404, { ok: false, erro: "não encontrado" }) : html(404, paginaErro(404, "Este endereço não existe no painel.", ctx()));
    try {
      const host = (req.headers.host ?? "").replace(/:\d+$/, "");
      if (!["127.0.0.1", "localhost"].includes(host)) return json(421, { ok: false, erro: "o painel só atende 127.0.0.1/localhost" });
      // O caminho cru é conferido antes de qualquer decodificação: nada de `..`, `@fs`, barra invertida ou nulo.
      const cru = (req.url ?? "/").split("?")[0];
      if (/%2e|%2f|%5c|%00|\\|\/\.\.?(\/|$)|@fs|\/\//i.test(cru)) return nao(cru.startsWith("/api/"));
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const seg = url.pathname.split("/").filter(Boolean).map(s => decodeURIComponent(s));
      const ids = (xs: string[]) => xs.every(x => ID.test(x));

      if (req.method === "POST") {
        if (!(req.headers["content-type"] ?? "").startsWith("application/json")) return json(415, { ok: false, erro: "só JSON" });
        const origem = req.headers.origin;
        if (origem && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origem)) return json(403, { ok: false, erro: "origem recusada" });
        let corpo: unknown;
        try { corpo = JSON.parse((await lerCorpo(req)) || "{}"); } catch { return json(400, { ok: false, erro: "JSON inválido" }); }
        if (seg[0] === "api" && seg[1] === "decisao" && seg.length === 4 && ids(seg.slice(2))) {
          return json(200, salvarDecisao(arquivo, seg[2], seg[3], corpo as PedidoDecisao));
        }
        if (seg[0] === "api" && seg[1] === "recalcular" && seg.length === 4 && ids(seg.slice(2))) {
          if (!lerAnalise(arquivo, seg[2], seg[3])) return nao(true);
          return json(200, await recalcular(arquivo, seg[2], seg[3], { telas: o.telas ?? null }));
        }
        // NAT-58: RESULTADOS.md na raiz do clone (só números de summary.json; nunca a referência)
        if (seg[0] === "api" && seg[1] === "resumo" && seg.length === 2) {
          const r = gravarResultados(arquivo);
          return json(200, { ok: true, arquivo: "RESULTADOS.md", campanhas: r.campanhas });
        }
        // T8a.1: primeira análise de um par ou de uma execução arquivados pelo T4
        if (seg[0] === "api" && seg[1] === "preparar" && seg[2] === "par" && seg.length === 5 && ids(seg.slice(3))) {
          return json(200, await prepararAnalise(arquivo, { tipo: "par", campanha: seg[3], par: seg[4] }, preparo));
        }
        if (seg[0] === "api" && seg[1] === "preparar" && seg[2] === "execucao" && seg.length === 4 && ids(seg.slice(3))) {
          return json(200, await prepararAnalise(arquivo, { tipo: "individual", runId: seg[3] }, preparo));
        }
        return nao(true);
      }
      if (req.method !== "GET" && req.method !== "HEAD") return json(405, { ok: false, erro: "método não aceito" });

      // páginas
      if (seg.length === 0) { const v = vistaExecucoes(arquivo); return html(200, paginaExecucoes(v, preparoDosPares(arquivo, v.pares), ctx())); }
      if (seg.length === 1 && seg[0] === "ajuda") return html(200, paginaAjuda(ctx()));
      if (seg.length === 1 && seg[0] === "estilo.css") return enviar(200, "text/css; charset=utf-8", readFileSync(ESTILO));
      // T8a.2: guia em diagramas (reveal.js de node_modules, SVG dos arquivos de docs/diagramas/)
      if (seg.length === 1 && seg[0] === "guia") return enviar(200, "text/html; charset=utf-8", paginaGuia(ctx(), diagramas()), { "content-security-policy": CSP_GUIA });
      if (seg[0] === "guia" && seg[1] === "reveal" && seg.length === 3 && Object.hasOwn(REVEAL, seg[2])) {
        const r = REVEAL[seg[2]];
        return enviar(200, r.tipo, readFileSync(join(RAIZ, "node_modules", "reveal.js", r.arquivo)));
      }
      if (seg[0] === "execucao" && seg.length === 3 && ids(seg.slice(1))) {
        const chave = chaveDoId(arquivo, seg[1], seg[2]);
        const v = chave ? vistaExecucao(arquivo, chave) : null;
        return v ? html(200, paginaExecucao(v, diagExecucao(v), ctx())) : nao(false);
      }
      if (seg[0] === "par" && seg.length === 3 && ids(seg.slice(1))) {
        const v = vistaPar(arquivo, seg[1], seg[2]);
        return v ? html(200, paginaPar(v, diagPar(v), ctx())) : nao(false);
      }
      if (seg[0] === "execucao" && seg.length === 2 && ids(seg.slice(1))) {
        const v = vistaExecucao(arquivo, seg[1]);
        return v ? html(200, paginaExecucao(v, diagExecucao(v), ctx())) : nao(false);
      }
      if (seg[0] === "revisao" && seg.length === 3 && ids(seg.slice(1))) {
        const f = vistaFila(arquivo, seg[1], seg[2]);
        return f ? html(200, paginaFila(f, ctx(), o.revisora ?? "")) : nao(false);
      }
      // arquivos por id
      if (seg[0] === "evidencia" && seg.length === 4 && ids(seg.slice(1, 3))) {
        const a = arquivoDeEvidencia(arquivo, seg[1], seg[2], seg[3]);
        return a ? enviar(200, a.tipo, a.corpo) : nao(false);
      }
      if (seg[0] === "cena" && seg.length === 4 && ids(seg.slice(1, 3))) {
        const b = imagemDaCena(arquivo, seg[1], seg[2], seg[3]);
        return b ? enviar(200, "image/png", b) : nao(false);
      }
      if (seg[0] === "baixar" && seg[1] === "analise" && seg.length === 5 && ids(seg.slice(2, 4)) && /^rev-\d{3,}\.tar\.gz$/.test(seg[4])) {
        const t = tarDaRevisao(arquivo, seg[2], seg[3], seg[4].replace(/\.tar\.gz$/, ""));
        return t ? enviar(200, "application/gzip", t.corpo, { "content-disposition": `attachment; filename="${t.nome}"` }) : nao(false);
      }
      if (seg[0] === "baixar" && seg[1] === "execucao" && seg.length === 3 && /\.tar\.gz$/.test(seg[2]) && ID.test(seg[2].replace(/\.tar\.gz$/, ""))) {
        const t = tarDaExecucao(arquivo, seg[2].replace(/\.tar\.gz$/, ""));
        return t ? enviar(200, "application/gzip", t.corpo, { "content-disposition": `attachment; filename="${t.nome}"` }) : nao(false);
      }
      // API de leitura (as mesmas vistas das páginas)
      if (seg[0] === "api") {
        // T8a.2: quem é este painel (a CLI de outro painel pergunta antes de subir na mesma porta)
        if (seg[1] === "painel" && seg.length === 2) return json(200, { painel: PAINEL_VERSAO, arquivo, fixture: fixture() });
        if (seg[1] === "execucoes" && seg.length === 2) { const v = vistaExecucoes(arquivo); return json(200, { ...v, preparo: preparoDosPares(arquivo, v.pares) }); }
        if (seg[1] === "par" && seg.length === 4 && ids(seg.slice(2))) {
          const v = vistaPar(arquivo, seg[2], seg[3]);
          if (!v) return nao(true);
          const { analise, ...resto } = v;
          return json(200, { ...resto, preparo: diagPar(v), analise: analise ? { id: analise.id, atual: analise.atual?.nome ?? null, revisoes: analise.revisoes.map(r => r.nome),
            falhas: analise.falhas, avisos: analise.avisos, decisoes: analise.decisoes.map(d => d.nome) } : null });
        }
        if (seg[1] === "execucao" && seg.length === 3 && ids(seg.slice(2))) {
          const v = vistaExecucao(arquivo, seg[2]);
          return v ? json(200, { ...v, analise: v.analise?.id ?? null, preparo: diagExecucao(v) }) : nao(true);
        }
        if (seg[1] === "fila" && seg.length === 4 && ids(seg.slice(2))) {
          const f = vistaFila(arquivo, seg[2], seg[3]);
          return f ? json(200, { analise: f.analise.id, revisao: f.revisao.nome, cartoes: f.cartoes, versaoDecisoes: f.versaoDecisoes,
            pendentesAtivos: f.pendentesAtivos, decididos: f.decididos, naoIncorporadas: f.naoIncorporadas, mascara: f.mascara }) : nao(true);
        }
      }
      return nao(seg[0] === "api");
    } catch (e) {
      return json(500, { ok: false, erro: e instanceof Error ? e.message : String(e) });
    }
  });
}

/** Escuta na porta pedida; se ocupada, tenta as 20 seguintes. Porta 0 = qualquer livre (testes). */
export async function escutar(s: Server, porta: number): Promise<number> {
  for (let p = porta, n = 0; n <= (porta === 0 ? 0 : 20); p++, n++) {
    const ok = await new Promise<boolean>((done, fail) => {
      const erro = (e: NodeJS.ErrnoException) => { s.off("listening", ouvindo); if (e.code === "EADDRINUSE") done(false); else fail(e); };
      const ouvindo = () => { s.off("error", erro); done(true); };
      s.once("error", erro);
      s.once("listening", ouvindo);
      s.listen(p, "127.0.0.1");
    });
    if (ok) return (s.address() as AddressInfo).port;
  }
  throw new Error(`nenhuma porta livre entre ${porta} e ${porta + 20}`);
}

// ───────────────────────────────────────────────────────────────── porta ocupada (T8a.2)

export type Ocupante = { painel: true; arquivo: string | null; versao: string | null } | { painel: false };

function pedir(porta: number, caminho: string): Promise<{ status: number; corpo: string } | null> {
  return new Promise((ok) => {
    const r = requisicao({ host: "127.0.0.1", port: porta, path: caminho, method: "GET", headers: { host: `127.0.0.1:${porta}` }, timeout: 1500 }, (res) => {
      const partes: Buffer[] = [];
      res.on("data", (c: Buffer) => partes.push(c));
      res.on("end", () => ok({ status: res.statusCode ?? 0, corpo: Buffer.concat(partes).toString("utf8").slice(0, 20000) }));
    });
    r.on("timeout", () => { r.destroy(); ok({ status: 0, corpo: "" }); });
    r.on("error", (e: NodeJS.ErrnoException) => ok(e.code === "ECONNREFUSED" ? null : { status: 0, corpo: "" }));
    r.end();
  });
}

/** null = porta livre. Um painel (desta versão ou anterior) é reconhecido; o resto é "outro programa". */
export async function quemOcupa(porta: number): Promise<Ocupante | null> {
  const a = await pedir(porta, "/api/painel");
  if (a === null) return null;
  try { const j = JSON.parse(a.corpo) as { painel?: string; arquivo?: string }; if (j.painel) return { painel: true, arquivo: j.arquivo ?? null, versao: j.painel }; } catch { /* abaixo */ }
  const b = await pedir(porta, "/");
  return b && /<title>[^<]*Painel de resultados<\/title>/.test(b.corpo) ? { painel: true, arquivo: null, versao: null } : { painel: false };
}

export class PortaRecusada extends Error {}

/**
 * Sobe o painel. Porta pedida ocupada por OUTRO PAINEL: recusa (foi assim que a autora acabou olhando
 * um painel órfão de outro arquivo), salvo `--porta` explícita. Ocupada por outro programa (ou com
 * `--porta`): usa a próxima livre e devolve um aviso para imprimir em destaque.
 */
export async function abrirPainel(o: OpcoesPainel & { porta: number; portaExplicita: boolean }): Promise<{ servidor: Server; porta: number; aviso: string[] | null }> {
  const ocupante = o.porta === 0 ? null : await quemOcupa(o.porta);
  if (ocupante?.painel && !o.portaExplicita) {
    throw new PortaRecusada([
      `Já existe um painel de resultados na porta ${o.porta}${ocupante.arquivo ? `, servindo:` : " (de uma versão anterior, que não diz o arquivo)."}`,
      ...(ocupante.arquivo ? [`    ${ocupante.arquivo}`] : []),
      `Este painel NÃO foi aberto. Se é esse o arquivo que você quer, use http://127.0.0.1:${o.porta}/ .`,
      "Senão, feche o outro painel (Ctrl+C no terminal dele) e rode de novo,",
      `ou abra este ao lado, numa porta escolhida: --porta ${o.porta + 1}`,
    ].join("\n"));
  }
  const servidor = criarPainel(o);
  const porta = await escutar(servidor, o.porta);
  const aviso = porta !== o.porta && o.porta !== 0 ? [
    `ATENÇÃO: a porta ${o.porta} está ocupada ${ocupante?.painel ? "por outro painel" : "por outro programa"}.`,
    `Este painel está em  http://127.0.0.1:${porta}/   <- use ESTE endereço.`,
    `O que responde na ${o.porta} NÃO é este arquivo.`,
  ] : null;
  return { servidor, porta, aviso };
}

export function emDestaque(linhas: string[]): string {
  const w = Math.max(...linhas.map(l => l.length)) + 4;
  const barra = "=".repeat(w);
  return ["", barra, ...linhas.map(l => `  ${l}`), barra, ""].join("\n");
}

// ───────────────────────────────────────────────────────────────── CLI

const PORTAS_PROIBIDAS = new Set([3000, 3100, 3217, 3300, 4000, 4100, 4101, 4102]);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined; };
  const arquivo = val("arquivo");
  const uso = "Uso: npm run painel:resultados -- --arquivo <clone do govbr-resultados> [--porta 4610] [--revisora Nome] [--telas <clone do govbr-telas>]\n" +
    "                                       [--anexos <pasta com anexos baixados>] [--sem-download]\n" +
    "     npm run painel:resultados -- recalcular --arquivo <clone> --analise <campanha>/<par ou runId> [--telas DIR]\n" +
    "     npm run painel:resultados -- preparar --arquivo <clone> (--par <campanha>/<par> | --execucao <runId>) [--anexos DIR] [--sem-download]\n" +
    "     npm run painel:resultados -- resumo --arquivo <clone>   (grava <clone>/RESULTADOS.md)";
  const anexos = val("anexos") ? [resolve(val("anexos")!)] : [];
  const baixarAnexos = !args.includes("--sem-download");
  if (!arquivo || !existsSync(arquivo)) { console.error(uso); process.exitCode = 1; }
  else if (args[0] === "resumo") {
    const r = gravarResultados(resolve(arquivo));
    console.log(`RESULTADOS.md gravado: ${r.caminho} (${r.campanhas} campanha${r.campanhas === 1 ? "" : "s"}). Confira e faça o commit no clone quando quiser.`);
  } else if (args[0] === "preparar") {
    const [c, p] = (val("par") ?? "").split("/");
    const alvo = val("execucao") ? { tipo: "individual" as const, runId: val("execucao")! } : { tipo: "par" as const, campanha: c ?? "", par: p ?? "" };
    prepararAnalise(resolve(arquivo), alvo, { anexos, baixar: baixarAnexos ? baixarComGh : null }).then(r => {
      console.log(r.ok ? `análise ${r.analise}: ${r.revisao} (${r.estado})` : `não preparada (${r.etapa}): ${r.erro}${r.falha ? `\nregistro: ${r.falha}` : ""}`);
      process.exitCode = r.ok ? 0 : 1;
    });
  } else if (args[0] === "recalcular") {
    const [c, a] = (val("analise") ?? "").split("/");
    recalcular(resolve(arquivo), c ?? "", a ?? "", { telas: val("telas") ?? null }).then(r => {
      console.log(r.ok ? `nova versão: ${r.revisao} (${r.estado})` : `falhou: ${r.erro}${r.falha ? `\nregistro: ${r.falha}` : ""}`);
      process.exitCode = r.ok ? 0 : 1;
    });
  } else {
    const porta = Number(val("porta") ?? 4610);
    if (PORTAS_PROIBIDAS.has(porta)) { console.error(`A porta ${porta} é usada por outra peça do instrumento; escolha outra.`); process.exitCode = 1; }
    else {
      abrirPainel({ arquivo, revisora: val("revisora"), telas: val("telas") ?? null, anexos, baixarAnexos, porta, portaExplicita: val("porta") !== undefined }).then(({ porta: p, aviso }) => {
        if (aviso) console.log(emDestaque(aviso));
        console.log(`Painel de resultados em http://127.0.0.1:${p}/`);
        console.log(`Arquivo: ${resolve(arquivo)}${ehFixture(resolve(arquivo), lerIndice(resolve(arquivo))) ? "  (FIXTURE SINTÉTICA)" : ""}`);
        console.log("Ctrl+C encerra. Sem modelo; a rede só é usada para baixar um anexo de evidências que falte (gh).");
      }).catch(e => { console.error(e instanceof PortaRecusada ? emDestaque(e.message.split("\n")) : e instanceof Error ? e.message : e); process.exitCode = 1; });
    }
  }
}
