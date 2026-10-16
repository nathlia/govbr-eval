/**
 * Executa os comparadores da NAT-76 (plano `thesis-workspace/planejamento/atual/plano-nat76-comparadores-2026-10-16.md`).
 *
 *   npm run comparadores -- [--divisao desenvolvimento] [--raiz ../govbr-corpus/dist] [--saida comparadores/medicoes]
 *                           [--so lint|visual] [--sem-telas] [--gemeos F6-01-D,F6-01-C] [--carimbo X]
 *
 * Sem modelo e sem oráculo. A reserva (`--divisao reserva`) usa a mesma configuração e só roda com
 * `--portao-nat86`. Grava em <saida>/<carimbo>/: lint/, visual/, tabelas.{json,md}, resumo.json,
 * tempos.json (à parte: o resto é idêntico byte a byte entre execuções) e manifesto.json (sha256).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright";
import { RAIZ_EVAL, RAIZ_TCC, arg, gravar, json, sha256, barra, lerExpectativas, type Divisao, type Expectativas } from "./comum";
import { lintControles, lintTela, VERSOES_LINT, type RegistroLintGemeo, type RegistroLintTela } from "./lint";
import { visualControles, VERSOES_VISUAL, PARAMETROS_VISUAL, type RegistroVisualGemeo } from "./visual";
import { montarTabelas } from "./tabelas";
import { hashDaConfiguracao } from "./lint/config.mjs";

export async function executar(opcoes: {
  divisao: Divisao; raiz: string; saida: string; so: "lint" | "visual" | null; telas: boolean; gemeos: string[] | null; carimbo: string;
}) {
  const pasta = join(opcoes.saida, opcoes.carimbo);
  const { arquivo, sha256: expSha, exp: expTudo } = lerExpectativas(opcoes.divisao);
  const exp: Expectativas = opcoes.gemeos ? { ...expTudo, gemeos: expTudo.gemeos.filter((g) => opcoes.gemeos!.includes(g.gemeo)) } : expTudo;
  const tempos: Record<string, number> = {};
  const t0 = Date.now();
  const sub = opcoes.divisao;

  let lint: RegistroLintGemeo[] = [];
  let visual: RegistroVisualGemeo[] = [];
  const telas: RegistroLintTela[] = [];
  if (opcoes.so !== "visual") {
    lint = await lintControles(exp, opcoes.raiz, tempos);
    for (const r of lint) gravar(join(pasta, "lint", sub, `${r.gemeo}.json`), json(r));
    if (opcoes.telas) {
      for (const t of ["solicitacao", "vistorias"]) {
        const r = await lintTela(t, tempos);
        telas.push(r);
        gravar(join(pasta, "lint", "telas", `${t}.json`), json(r));
        console.log(`lint  tela ${t}: ${r.contagem.normativoPagina} normativo(s) da página, ${r.contagem.normativoDs} do DS · specs creditadas: ${r.specs.filter((s) => s.creditados.length).map((s) => s.id).join(",") || "nenhuma"}`);
      }
    }
  }
  if (opcoes.so !== "lint") {
    visual = await visualControles(exp, opcoes.raiz, join(pasta, "visual", sub, "capturas"), tempos);
    for (const r of visual) gravar(join(pasta, "visual", sub, `${r.gemeo}.json`), json(r));
  }
  const tabelas = montarTabelas(lint, visual, telas);
  gravar(join(pasta, "tabelas.json"), json(tabelas.json));
  gravar(join(pasta, "tabelas.md"), tabelas.md);

  const navegador = await chromium.launch({ headless: true });
  const chromiumVersao = navegador.version();
  await navegador.close();
  gravar(join(pasta, "resumo.json"), json({
    o_que_e: "NAT-76: comparadores determinísticos do OE5 (Stylelint normativo e regressão visual), sem modelo.",
    plano: "thesis-workspace/planejamento/atual/plano-nat76-comparadores-2026-10-16.md",
    comando: `npm run comparadores -- --divisao ${opcoes.divisao}${opcoes.so ? " --so " + opcoes.so : ""}${opcoes.telas ? "" : " --sem-telas"}${opcoes.gemeos ? " --gemeos " + opcoes.gemeos.join(",") : ""}`,
    divisao: opcoes.divisao,
    expectativas: { arquivo: barra(relative(RAIZ_EVAL, arquivo)), sha256: expSha, gemeos: exp.gemeos.length },
    raizServida: barra(relative(RAIZ_TCC, opcoes.raiz)),
    lint: { configSha256: hashDaConfiguracao(), versoes: VERSOES_LINT },
    visual: { versoes: VERSOES_VISUAL, chromium: chromiumVersao, parametros: PARAMETROS_VISUAL },
    node: process.version,
  }));
  tempos.total = (Date.now() - t0) / 1000;
  gravar(join(pasta, "tempos.json"), json({ carimbo: opcoes.carimbo, segundos: tempos }));

  const arquivos: Record<string, string> = {};
  const andar = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (e.name !== "manifesto.json") arquivos[barra(relative(pasta, p))] = sha256(readFileSync(p));
    }
  };
  andar(pasta);
  gravar(join(pasta, "manifesto.json"), json({ carimbo: opcoes.carimbo, arquivos: Object.fromEntries(Object.entries(arquivos).sort()) }));
  console.log(`\n${tabelas.md.split("## Telas")[0]}`);
  console.log(`arquivado em ${barra(relative(process.cwd(), pasta))}`);
  return { pasta, lint, visual, telas, tabelas };
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("executar.ts")) {
  const divisao = (arg("--divisao", "desenvolvimento") as Divisao);
  if (divisao !== "desenvolvimento" && divisao !== "reserva") throw new Error(`divisão desconhecida: ${divisao}`);
  executar({
    divisao,
    raiz: resolve(arg("--raiz", join(RAIZ_TCC, "govbr-corpus/dist"))!),
    saida: resolve(arg("--saida", join(RAIZ_EVAL, "comparadores/medicoes"))!),
    so: (arg("--so") as "lint" | "visual" | null),
    telas: !process.argv.includes("--sem-telas") && divisao === "desenvolvimento",
    gemeos: arg("--gemeos")?.split(",") ?? null,
    carimbo: arg("--carimbo", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z")!,
  }).catch((e) => {
    console.error(e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  });
}
