/**
 * Painel de resultados (T8a) — servidor local.
 *
 *   npm run painel:resultados -- --arquivo <clone do govbr-resultados> [--porta 4610] [--revisora Nome] [--telas <clone do govbr-telas>]
 *   npm run painel:resultados -- recalcular --arquivo <clone> --analise <campanha>/<par ou runId> [--telas DIR]
 *
 * Lê SÓ a pasta passada em --arquivo. Toda rota é resolvida por id conhecido (chave do índice, id de
 * análise, nome de revisão, token de evidência); não há rota que receba caminho de arquivo, e nada fora
 * dessas rotas é servido. Nunca serve referência/gabarito: `entradas/referencia.json` e
 * `snapshots/referencia/**` ficam fora até do download. Escuta só em 127.0.0.1. Sem rede, sem modelo.
 *
 * Método e operação: docs/painel-resultados.md.
 */
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { criarTarGz } from "../arquivo-resultados";
import {
  ID, PAINEL_VERSAO, dentroDoArquivo, ehFixture, existeDiretorio, lerAnalise, lerIndice, vistaExecucao, vistaExecucoes, vistaPar,
} from "./modelo";
import { paginaAjuda, paginaErro, paginaExecucao, paginaExecucoes, paginaFila, paginaPar } from "./paginas";
import { arquivoDeEvidencia, imagemDaCena, recalcular, salvarDecisao, vistaFila, type PedidoDecisao } from "./revisao";

export interface OpcoesPainel { arquivo: string; revisora?: string; telas?: string | null }

/** Arquivos de uma revisão que nunca saem do painel, nem no download. */
export const NUNCA_SERVIR = ["entradas/referencia.json"];

const CABECALHOS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
};

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

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const enviar = (codigo: number, tipo: string, corpo: string | Buffer, extra: Record<string, string> = {}) => {
      res.writeHead(codigo, { ...CABECALHOS, "content-type": tipo, ...extra });
      res.end(corpo);
    };
    const html = (codigo: number, corpo: string) => enviar(codigo, "text/html; charset=utf-8", corpo);
    const json = (codigo: number, corpo: unknown) => enviar(codigo, "application/json; charset=utf-8", JSON.stringify(corpo));
    const nao = (api: boolean) => api ? json(404, { ok: false, erro: "não encontrado" }) : html(404, paginaErro(404, "Este endereço não existe no painel.", fixture()));
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
        return nao(true);
      }
      if (req.method !== "GET" && req.method !== "HEAD") return json(405, { ok: false, erro: "método não aceito" });

      // páginas
      if (seg.length === 0) return html(200, paginaExecucoes(vistaExecucoes(arquivo)));
      if (seg.length === 1 && seg[0] === "ajuda") return html(200, paginaAjuda(fixture(), basename(arquivo)));
      if (seg[0] === "par" && seg.length === 3 && ids(seg.slice(1))) {
        const v = vistaPar(arquivo, seg[1], seg[2]);
        return v ? html(200, paginaPar(v)) : nao(false);
      }
      if (seg[0] === "execucao" && seg.length === 2 && ids(seg.slice(1))) {
        const v = vistaExecucao(arquivo, seg[1]);
        return v ? html(200, paginaExecucao(v)) : nao(false);
      }
      if (seg[0] === "revisao" && seg.length === 3 && ids(seg.slice(1))) {
        const f = vistaFila(arquivo, seg[1], seg[2]);
        return f ? html(200, paginaFila(f, fixture(), o.revisora ?? "")) : nao(false);
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
        if (seg[1] === "execucoes" && seg.length === 2) return json(200, vistaExecucoes(arquivo));
        if (seg[1] === "par" && seg.length === 4 && ids(seg.slice(2))) {
          const v = vistaPar(arquivo, seg[2], seg[3]);
          if (!v) return nao(true);
          const { analise, ...resto } = v;
          return json(200, { ...resto, analise: analise ? { id: analise.id, atual: analise.atual?.nome ?? null, revisoes: analise.revisoes.map(r => r.nome),
            falhas: analise.falhas, avisos: analise.avisos, decisoes: analise.decisoes.map(d => d.nome) } : null });
        }
        if (seg[1] === "execucao" && seg.length === 3 && ids(seg.slice(2))) {
          const v = vistaExecucao(arquivo, seg[2]);
          return v ? json(200, { ...v, analise: v.analise?.id ?? null }) : nao(true);
        }
        if (seg[1] === "fila" && seg.length === 4 && ids(seg.slice(2))) {
          const f = vistaFila(arquivo, seg[2], seg[3]);
          return f ? json(200, { analise: f.analise.id, revisao: f.revisao.nome, cartoes: f.cartoes, versaoDecisoes: f.versaoDecisoes,
            pendentesAtivos: f.pendentesAtivos, decididos: f.decididos, naoIncorporadas: f.naoIncorporadas }) : nao(true);
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

// ───────────────────────────────────────────────────────────────── CLI

const PORTAS_PROIBIDAS = new Set([3000, 3100, 3217, 3300, 4000, 4100, 4101, 4102]);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined; };
  const arquivo = val("arquivo");
  const uso = "Uso: npm run painel:resultados -- --arquivo <clone do govbr-resultados> [--porta 4610] [--revisora Nome] [--telas <clone do govbr-telas>]\n" +
    "     npm run painel:resultados -- recalcular --arquivo <clone> --analise <campanha>/<par ou runId> [--telas DIR]";
  if (!arquivo || !existsSync(arquivo)) { console.error(uso); process.exitCode = 1; }
  else if (args[0] === "recalcular") {
    const [c, a] = (val("analise") ?? "").split("/");
    recalcular(resolve(arquivo), c ?? "", a ?? "", { telas: val("telas") ?? null }).then(r => {
      console.log(r.ok ? `nova versão: ${r.revisao} (${r.estado})` : `falhou: ${r.erro}${r.falha ? `\nregistro: ${r.falha}` : ""}`);
      process.exitCode = r.ok ? 0 : 1;
    });
  } else {
    const porta = Number(val("porta") ?? 4610);
    if (PORTAS_PROIBIDAS.has(porta)) { console.error(`A porta ${porta} é usada por outra peça do instrumento; escolha outra.`); process.exitCode = 1; }
    else {
      const s = criarPainel({ arquivo, revisora: val("revisora"), telas: val("telas") ?? null });
      escutar(s, porta).then(p => {
        console.log(`Painel de resultados em http://127.0.0.1:${p}/`);
        console.log(`Arquivo: ${resolve(arquivo)}${ehFixture(resolve(arquivo), lerIndice(resolve(arquivo))) ? "  (FIXTURE SINTÉTICA)" : ""}`);
        console.log("Ctrl+C encerra. Nada sai desta máquina: sem rede, sem modelo.");
      }).catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
    }
  }
}
