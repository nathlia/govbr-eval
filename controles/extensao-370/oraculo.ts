/**
 * Validator 3.7.0 (C01; C20 se ligado) nos controles de DESENVOLVIMENTO, sem modelo — complementa o portão NAT-86
 * (`npm run portao:oraculo`, matriz congelada), que não tem linha para as normas novas.
 *
 *   npx tsx controles/extensao-370/oraculo.ts [--raiz ../govbr-corpus/dist] [--saida ../.tmp-eval/portao-370/extensao]
 *
 * 1. Extensão F5-06 (controles/extensao-370/expectativas.json): por gêmeo, o scanPage (o mesmo do scan_page, janela do
 *    oráculo) no estado da receita e o verifyFinding live da alegação C01 no sujeito. Esperado: achado C01 no sujeito e
 *    `confirmed` só nos gêmeos `confirmed`; nos `conforme`, nenhum achado C01 e nada confirmado. E o par: fora do C01, os
 *    achados do gêmeo defeituoso e do seu par conforme são os mesmos (só o C01 muda).
 * 2. Varredura da ala A (controles/expectativas.json, 80 páginas, cada gêmeo na sua receita): TODO achado das regras
 *    novas, com localizador e trecho, para julgar falso positivo um a um. A reserva (ala B) nunca é aberta: o servidor
 *    local a recusa (servirRaiz) e nada aqui lê controles/reserva/.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { arg } from "../../comparadores/comum";
import { RAIZ_CORPUS_DIST, VALIDATOR_DIR, servirRaiz, traduzirReceita, type Passo } from "../../portao-nat86/comum";

const NOVAS = ["govbr-3.7.0-component-button-7ef75d42ac65", "target-size"];
const C01 = NOVAS[0];
const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(arg("--raiz") ?? RAIZ_CORPUS_DIST);
const saida = resolve(arg("--saida") ?? join(AQUI, "../../../.tmp-eval/portao-370/extensao"));

type Gemeo = { gemeo: string; papel: string; celulas: Array<{ sujeito: string; normas: string[]; esperado: string }>; pagina: { caminho: string }; receita: Passo[]; derivacao?: { de: string } };
type Achado = { id: string; rule: { id: string; source: string }; element: { locator: string; snippet?: string }; evidence: { observed: string; data?: Record<string, unknown> } };

async function main() {
  process.env.GOVBR_VALIDATOR_VIEWPORT = "1280x900";
  const dist = pathToFileURL(join(VALIDATOR_DIR, "dist") + "/").href;
  const { verifyFinding } = await import(dist + "verify/gate.js");
  const { scanPage, PageScanCache } = await import(dist + "scan/pageScan.js");
  const { closeBrowser } = await import(dist + "evidence/browser.js");
  const versao = (JSON.parse(readFileSync(join(VALIDATOR_DIR, "package.json"), "utf8")) as { version: string }).version;
  const { base, servidor } = await servirRaiz(raiz, false);
  const relatorio: Record<string, unknown> = { validator: versao, raiz, janela: "1280x900" };
  const falhas: string[] = [];
  const scan = async (url: string, receita: Passo[]) => {
    const { acoes } = traduzirReceita(receita);
    const r = await scanPage({ url, actions: acoes }, new PageScanCache(1));
    return { acoes, status: r.status as string, achados: ((r as { findings?: Achado[] }).findings ?? []) as Achado[] };
  };
  try {
    // ---------------------------------------------------------------- 1. extensão F5-06
    const ext = JSON.parse(readFileSync(join(AQUI, "expectativas.json"), "utf8")) as { gemeos: Gemeo[] };
    const porGemeo: Record<string, { achados: Achado[] }> = {};
    const linhas: unknown[] = [];
    for (const g of ext.gemeos) {
      const url = base + g.pagina.caminho;
      const s = await scan(url, g.receita);
      porGemeo[g.gemeo] = s;
      for (const c of g.celulas) {
        const loc = c.sujeito.replace(/^button(?=#)/, "");
        const c01 = s.achados.filter((f) => f.rule.id === C01);
        const noSujeito = c01.filter((f) => f.element.locator === loc);
        const v = await verifyFinding({
          finding: {
            id: "F-900", rule: { id: C01, source: "govbr-ds-kb", description: "alegação de controle (extensão 3.7.0)" },
            element: { locator: loc, page: url },
            evidence: { observed: "alegação de controle", expected: "alegação de controle", data: { expectedCondition: "icon-only-br-button-is-circle" } },
            severity: "moderate", nature: "syntactic", mode: "display", pathway: "heuristic",
          },
          live: true, actions: s.acoes,
        });
        const positivo = c.esperado === "confirmed";
        const ok = positivo ? noSujeito.length === 1 && c01.length === 1 && v.verdict === "confirmed" : c01.length === 0 && v.verdict !== "confirmed";
        if (!ok) falhas.push(`${g.gemeo}: esperado ${c.esperado}, C01 ${c01.map((f) => f.element.locator).join(",") || "-"}, verify ${v.verdict}`);
        linhas.push({ gemeo: g.gemeo, papel: g.papel, esperado: c.esperado, c01: c01.map((f) => f.element.locator), verify: v.verdict, violation: v.checks?.violation, ok });
        console.log(`${ok ? "ok  " : "FALHA"} ${g.gemeo.padEnd(9)} esperado ${c.esperado.padEnd(9)} C01 [${c01.map((f) => f.element.locator).join(",")}] verify ${v.verdict}`);
      }
    }
    // só o C01 muda entre o defeituoso e o par conforme (mesmos achados fora dele, por regra × localizador)
    const chave = (f: Achado) => `${f.rule.id}@${f.element.locator}`;
    const pares: unknown[] = [];
    for (const g of ext.gemeos.filter((x) => x.derivacao)) {
      const a = new Set(porGemeo[g.derivacao!.de].achados.filter((f) => f.rule.id !== C01).map(chave));
      const b = new Set(porGemeo[g.gemeo].achados.filter((f) => f.rule.id !== C01).map(chave));
      const so = (x: Set<string>, y: Set<string>) => [...x].filter((k) => !y.has(k));
      const diff = { gemeo: g.gemeo, de: g.derivacao!.de, soNoPar: so(a, b), soNoGemeo: so(b, a) };
      pares.push(diff);
      console.log(`par ${g.derivacao!.de} → ${g.gemeo}: fora do C01, só no par ${JSON.stringify(diff.soNoPar)}, só no gêmeo ${JSON.stringify(diff.soNoGemeo)}`);
    }
    relatorio.extensao = { linhas, pares, achadosPorGemeo: Object.fromEntries(Object.entries(porGemeo).map(([k, v]) => [k, v.achados.map(chave)])) };

    // ---------------------------------------------------------------- 2. varredura da ala A
    const dev = JSON.parse(readFileSync(join(AQUI, "../expectativas.json"), "utf8")) as { gemeos: Gemeo[] };
    const vistos = new Set<string>();
    const novos: unknown[] = [];
    let paginas = 0;
    for (const g of dev.gemeos) {
      const chaveEstado = `${g.pagina.caminho}|${JSON.stringify(traduzirReceita(g.receita).acoes)}`;
      if (vistos.has(chaveEstado)) continue;
      vistos.add(chaveEstado);
      const url = base + g.pagina.caminho;
      const s = await scan(url, g.receita);
      paginas += 1;
      for (const f of s.achados.filter((x) => NOVAS.includes(x.rule.id))) {
        novos.push({ gemeo: g.gemeo, papel: g.papel, pagina: g.pagina.caminho, regra: f.rule.id, localizador: f.element.locator, trecho: (f.element.snippet ?? "").slice(0, 220), observado: f.evidence.observed.slice(0, 200) });
        console.log(`ala A ${g.gemeo.padEnd(9)} ${f.rule.id} ${f.element.locator}`);
      }
    }
    relatorio.alaA = { estados: paginas, gemeos: dev.gemeos.length, achadosNovos: novos };
    console.log(`ala A: ${paginas} estados (${dev.gemeos.length} gêmeos), ${novos.length} achado(s) das regras novas`);
  } finally {
    await closeBrowser().catch(() => {});
    servidor.close();
  }
  relatorio.falhas = falhas;
  mkdirSync(saida, { recursive: true });
  writeFileSync(join(saida, "relatorio.json"), JSON.stringify(relatorio, null, 2) + "\n");
  console.log(falhas.length ? `FALHAS: ${falhas.length}` : "extensão: sem falha");
  if (falhas.length) process.exitCode = 3;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
