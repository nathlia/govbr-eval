/**
 * Tela F3 — para cada segmento com parada, a árvore medida navegando (uma carga, o setup da referência) é a mesma da
 * entrada direta numa página nova (o que o scanner do oráculo e a linha de base fazem, D-60)? Usa só funções da
 * bancada (scripts/anchors.ts: impressaoDaArvore, entradaDireta, abrirEntradaDireta, que para se a árvore diverge).
 * Sem oráculo, sem axe. Nos dois builds.
 * Uso: npx tsx tela-f3/conferir-arvores.mts <url semeado> <url sem semente> → tela-f3/conferir-arvores.json
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { abrirEntradaDireta, entradaDireta, impressaoDaArvore, openPage, runSetupSteps, segmentoApos } from "../scripts/anchors.ts";
import { ALA, PARADAS, SETUP } from "./estados.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const urls = { semeado: process.argv[2], semSemente: process.argv[3] };
const VIEW = { width: 1280, height: 900 };
const out: Record<string, any> = {};
for (const [build, base] of Object.entries(urls)) {
  const entrada = new URL(`${ALA}?mock-perfil=mpa`, base).toString();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  await openPage(page, entrada, { waitFor: "main .br-table tbody tr" });
  const linhas: any[] = [];
  let feito = 0;
  const ultimas = PARADAS.filter((p, i) => i === PARADAS.length - 1 || segmentoApos(SETUP as any, PARADAS[i + 1].afterStep) !== segmentoApos(SETUP as any, p.afterStep));
  for (const p of PARADAS) {
    await runSetupSteps(page, SETUP.slice(feito, p.afterStep) as any); feito = p.afterStep;
    if (!ultimas.includes(p)) continue;
    const navegando = await impressaoDaArvore(page);
    const alcance = entradaDireta(entrada, SETUP as any, p.afterStep);
    let resultado: string, erro: string | null = null;
    try { const d = await abrirEntradaDireta(browser, VIEW, alcance, navegando, p.id); await d.close(); resultado = "igual"; }
    catch (e) { resultado = "diverge"; erro = e instanceof Error ? e.message.slice(0, 1500) : String(e); }
    linhas.push({ parada: p.id, segmento: segmentoApos(SETUP as any, p.afterStep), entradaDireta: { url: alcance.url, passos: alcance.passos.length, direta: alcance.direta }, elementos: navegando.length, resultado, erro });
  }
  await browser.close();
  out[build] = linhas;
}
writeFileSync(join(AQUI, "conferir-arvores.json"), JSON.stringify({ _meta: { data: "2026-11-27", regra: "cabeçalho de tela-f3/conferir-arvores.mts", urls }, ...out }, null, 1) + "\n");
for (const [b, ls] of Object.entries(out)) console.log(b, ls.map((l: any) => `${l.parada}@${l.segmento}:${l.resultado}(${l.elementos})`).join(" "));
process.exit(Object.values(out).flat().every((l: any) => l.resultado === "igual") ? 0 : 1);
