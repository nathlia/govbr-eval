/**
 * Tela F — lacunas declaradas pela construção, onde tocam uma spec semeada (sem oráculo, sem axe, sem modelo).
 * A construção atribuiu a um id só as diferenças de largura das mesmas células (coluna do solicitante: F-01 e F-09) e
 * não comparou pseudo-elementos. Nenhuma spec semeada tem pseudo-elemento como observável; as duas que dividem células
 * são medidas aqui nos dois builds: largura útil, rolagem, quebra, corte e title das células do solicitante (F-01) e
 * padding vertical de todas as células do corpo (F-09), separando o que muda em cada propriedade.
 * Uso: node tela-f/medir-lacunas.mjs <url semeada> <url sem semente> → tela-f/lacunas-construcao.json
 */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire("F:/Dev Nath/TCC/govbr-eval/package.json")("playwright");
const [semeada, semSemente] = process.argv.slice(2);
const ENTRADA = "/pnip-f/portal-mpa/processos?mock-perfil=mpa";
const browser = await chromium.launch();
const medir = async base => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
  const pg = await ctx.newPage();
  await pg.goto(base + ENTRADA, { waitUntil: "networkidle" });
  await pg.waitForSelector("main .br-table tbody tr");
  await pg.waitForTimeout(600);
  const r = await pg.evaluate(() => {
    const cs = e => getComputedStyle(e);
    const sol = [...document.querySelectorAll("pnip-mpa-processos table tbody td:nth-of-type(5)")].map(td => ({
      texto: td.textContent.trim().replace(/\s+/g, " "), clientWidth: td.clientWidth, scrollWidth: td.scrollWidth, larguraCaixa: Math.round(td.getBoundingClientRect().width * 10) / 10,
      maxWidth: cs(td).maxWidth, whiteSpace: cs(td).whiteSpace, overflowX: cs(td).overflowX, textOverflow: cs(td).textOverflow, title: td.getAttribute("title"),
      paddingTop: cs(td).paddingTop, paddingBottom: cs(td).paddingBottom, paddingLeft: cs(td).paddingLeft, paddingRight: cs(td).paddingRight }));
    const tds = [...document.querySelectorAll("pnip-mpa-processos table tbody td")];
    const pads = [...new Set(tds.map(td => `${cs(td).paddingTop}/${cs(td).paddingBottom}/${cs(td).paddingLeft}/${cs(td).paddingRight}`))];
    const ths = [...new Set([...document.querySelectorAll("pnip-mpa-processos table thead th")].map(th => `${cs(th).paddingTop}/${cs(th).paddingBottom}`))];
    return { solicitante: sol, corpo: { celulas: tds.length, paddings: pads }, cabecalho: { paddings: ths } };
  });
  await ctx.close();
  return r;
};
const S = await medir(semeada), N = await medir(semSemente);
await browser.close();
const out = {
  _meta: { semeada, semSemente, entrada: ENTRADA, viewport: "1280x900", semOraculo: true, semAxe: true },
  pseudoElementos: "nenhuma spec semeada tem pseudo-elemento como observável (F-01…F-12: estilo computado de elemento, posição de elementos ou texto renderizado)",
  "F-01": {
    semeada: S.solicitante, semSemente: N.solicitante,
    resumo: {
      semeadaCortadas: S.solicitante.filter(c => c.scrollWidth > c.clientWidth).length, semeadaSemReticencias: S.solicitante.filter(c => c.textOverflow === "clip" && c.overflowX === "hidden" && c.whiteSpace === "nowrap").length,
      semeadaComTitle: S.solicitante.filter(c => c.title).length, semSementeCortadas: N.solicitante.filter(c => c.scrollWidth > c.clientWidth).length,
      larguraUtilSemeada: [...new Set(S.solicitante.map(c => c.clientWidth))], larguraUtilSemSemente: [...new Set(N.solicitante.map(c => c.clientWidth))],
    },
  },
  "F-09": { semeada: S.corpo, semSemente: N.corpo, cabecalhoSemeada: S.cabecalho, cabecalhoSemSemente: N.cabecalho },
};
writeFileSync(join(AQUI, "lacunas-construcao.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ F01: out["F-01"].resumo, F09: { semeada: S.corpo.paddings, sem: N.corpo.paddings, cab: [S.cabecalho.paddings, N.cabecalho.paddings] } }, null, 1));
