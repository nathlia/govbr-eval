/**
 * Testes dos comparadores da NAT-76 (plano §9). Sem modelo; só controles de DESENVOLVIMENTO.
 *
 *   npm run test:comparadores            (unidades + determinismo em 7 gêmeos de desenvolvimento)
 *   npm run test:comparadores -- --rapido (só unidades, sem navegador)
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import stylelint from "stylelint";
import { PNG } from "pngjs";
import { config } from "./lint/config.mjs";
import { normalizarCor } from "./lint/cores.mjs";
import { lintar, origemDoAchado, chavesDoDs, normalizarValor, bibliotecaDoSeletor, alcancePorCaso, MOTIVO_SEM_MUDANCA, type Achado, type ResultadoCelula } from "./lint";
import { tabelaPorFamilia, tabelaPorGemeo, semD1 } from "./tabelas";
import { comparar } from "./visual";
import { executar } from "./executar";
import { RAIZ_TCC, normasCruzam, reduzirSeletor, traduzirSujeito, trocasTocamCss, trocasEmContextoAria, classeDoEsperado } from "./comum";

let ok = 0;
const falhas: string[] = [];
function conferir(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? " — " + detalhe : ""}`);
}
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function avisos(code: string) {
  const r = await stylelint.lint({ code, config });
  return r.results[0].warnings.map((w) => w.rule);
}

async function unidades() {
  // N1 cor pré-definida
  conferir("N1 hex fora", igual(await avisos(".a{color:#334333}"), ["govbr-eval/cor-pre-definida"]));
  conferir("N1 hex curto da paleta", igual(await avisos(".a{color:#333}"), []));
  conferir("N1 hex longo da paleta", igual(await avisos(".a{color:#333333}"), []));
  conferir("N1 maiúsculas", igual(await avisos(".a{color:#1351B4}"), []));
  conferir("N1 var", igual(await avisos(".a{color:var(--color)}"), []));
  conferir("N1 nomeada da paleta (white)", igual(await avisos(".a{background:white}"), []));
  conferir("N1 nomeada fora (red)", igual(await avisos(".a{color:red}"), ["govbr-eval/cor-pre-definida"]));
  conferir("N1 rgba literal fora", igual(await avisos(".a{box-shadow:0 0 1px rgba(0,0,0,.5)}"), ["govbr-eval/cor-pre-definida"]));
  conferir("N1 rgba com var", igual(await avisos(".a{color:rgba(var(--x-rgb),.5)}"), []));
  conferir("N1 transparent/currentColor", igual(await avisos(".a{color:currentColor;background:transparent}"), []));
  conferir("N1 propriedade customizada", igual(await avisos(":root{--x:#dee2e6}"), ["govbr-eval/cor-pre-definida"]));
  conferir("N1 palavra em font-family não é cor", igual(await avisos(".a{font-family:Tan, sans-serif}"), []));
  conferir("cor: hsl", normalizarCor("hsl(0, 100%, 50%)") === "#ff0000");
  conferir("cor: alfa ff some", normalizarCor("#ffffffff") === "#ffffff");
  // N2 escala tipográfica
  conferir("N2 15px", igual(await avisos(".a{font-size:15px}"), ["declaration-property-value-allowed-list"]));
  conferir("N2 16.8px", igual(await avisos(".a{font-size:16.8px}"), []));
  conferir("N2 token", igual(await avisos(".a{font-size:var(--font-size-scale-up-01)}"), []));
  conferir("N2 inherit", igual(await avisos(".a{font-size:inherit}"), []));
  // N3 — os casos de teste da regra original a11y/no-outline-none 1.2.3
  for (const c of [".foo { outline: 0; }", "$primary-color: #333; .bar:focus { outline: 1px solid $primary-color; }", ".baz:focus { outline: none; border-color: #333; }", ".quux:focus { outline: 0; border: 1px solid #000; }", ".quuux:focus { outline: none; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }"]) {
    const r = await avisos(c);
    conferir(`N3 aceita: ${c}`, !r.includes("govbr-eval/sem-remover-contorno-de-foco"), r.join(","));
  }
  for (const c of [".foo1:focus { outline: none; } .foo2:focus { outline: 1px solid red; }", ".bar:focus { outline: none; }", ".baz:focus { outline: none; border: transparent; }"]) {
    const r = await avisos(c);
    conferir(`N3 rejeita: ${c}`, r.filter((x) => x === "govbr-eval/sem-remover-contorno-de-foco").length === 1, r.join(","));
  }
  // H1 espaçamento (higiene)
  conferir("H1 13px", igual(await avisos(".a{padding:13px}"), ["declaration-property-value-allowed-list"]));
  conferir("H1 tokens", igual(await avisos(".a{margin:var(--spacing-scale-2x) 0 auto}"), []));
  // localização e classificação
  const html = `<html><head><style>\n.aviso { font-size: 15px; padding: 3px; }\n.b:focus { outline: none; }\n</style></head><body></body></html>`;
  const ac = await lintar(html, "x.html", true, "pagina");
  const porId = Object.fromEntries(ac.map((a) => [a.regraId, a]));
  conferir("lintar: N2 classificada", porId.N2?.propriedade === "font-size" && porId.N2?.seletor === ".aviso" && porId.N2?.perfil === "normativo");
  conferir("lintar: H1 classificada", porId.H1?.propriedade === "padding" && porId.H1?.perfil === "higiene");
  conferir("lintar: N3 no bloco", porId.N3?.seletor === ".b:focus" && porId.N3?.propriedade === null);
  // origem DS × página
  const ds = chavesDoDs(".br-button:focus{outline:none}.x .y > .z{color:#fff}");
  const a = (s: Partial<Achado>) => ({ id: "", regraId: "N1", regra: "", perfil: "normativo", normas: [], arquivo: "", linha: 1, coluna: 1, seletor: null, propriedade: null, valor: null, texto: "", origem: "pagina", ...s }) as Achado;
  conferir("origem: N3 do DS", origemDoAchado(a({ regraId: "N3", seletor: ".br-button:focus" }), ds) === "ds");
  conferir("origem: espaços de combinador", origemDoAchado(a({ seletor: ".x .y>.z", propriedade: "color" }), ds) === "ds");
  conferir("origem: página", origemDoAchado(a({ seletor: ".minha", propriedade: "color" }), ds) === "pagina");
  // seletores, normas, sujeitos
  conferir("reduzir :focus", igual(reduzirSeletor(".br-button:focus"), [".br-button"]));
  conferir("reduzir :focus:not(:focus-visible)", igual(reduzirSeletor("button:focus:not(:focus-visible)"), ["button"]));
  conferir("reduzir lista + ::before", igual(reduzirSeletor("a:hover::before, .b"), ["a", ".b"]));
  conferir("reduzir :root", igual(reduzirSeletor(":root"), ["html"]));
  conferir("reduzir :not real fica", igual(reduzirSeletor("li:not(.ativo)"), ["li:not(.ativo)"]));
  conferir("normas: hash de 12", normasCruzam(["ds:tipografia-21fb08664799"], ["govbr-3.7.0-foundation-global-21fb08664799"]));
  conferir("normas: igualdade", normasCruzam(["emag:4.4"], ["wcag:2.4.7", "emag:4.4"]));
  conferir("normas: não cruza", !normasCruzam(["emag:4.4"], ["emag:4.1"]));
  conferir("sujeito modal", igual(traduzirSujeito("modal#regras"), { seletor: "#regras" }));
  conferir("sujeito menu@estado", igual(traduzirSujeito("menu#principal@abrir"), { seletor: "#principal" }));
  conferir("sujeito título", igual(traduzirSujeito("h3 Seus empréstimos"), { tag: "h3", texto: "Seus empréstimos" }));
  conferir("sujeito documento", igual(traduzirSujeito("documento"), { seletor: "html" }));
  conferir("esperado → classe", classeDoEsperado("confirmed") === "positivo" && classeDoEsperado("nao-aplicavel") === "negativo" && classeDoEsperado("unsupported") === "aparte");
  // alcance mecânico
  const par = `<style>\n.a { padding: 13px; }\n</style><p class="a" aria-x="1">x</p>`;
  conferir("alcance: troca em <style>", trocasTocamCss(par, [["padding: 13px", "padding: var(--spacing-scale-2x)"]]));
  conferir("alcance: troca fora de CSS", !trocasTocamCss(par, [[`aria-x="1"`, `aria-x="2"`]]));
  conferir("marca: contexto ARIA", trocasEmContextoAria([["'aria-describedby', 'a'", "'aria-describedby', 'b'"]], []));
  conferir("marca: não ARIA", !trocasEmContextoAria([["<h3>", "<h2>"]], []));
  // D8: normalização de valor
  conferir("D8: transparent = #0000", normalizarValor("transparent") === normalizarValor("#0000"));
  conferir("D8: zero à esquerda e unidade de zero", normalizarValor("0 0 0 0.25rem RGBA(0,0,0,.5)") === normalizarValor("0px 0 0 .25rem #00000080"));
  conferir("D8: box-shadow sem desfoque zero", normalizarValor("1px 0 0 #e6e6e6, 0 3px 13px rgba(0,0,0,.08)", "box-shadow") === normalizarValor("1px 0 #e6e6e6,0 3px 13px #00000014", "box-shadow"));
  conferir("D8: valores diferentes não conferem", normalizarValor("#fff") !== normalizarValor("#000"));
  conferir("L7: Summernote", bibliotecaDoSeletor(".note-btn:focus") === "Summernote" && bibliotecaDoSeletor(".minha") === "aplicação/outros");
  // M4: caso sem troca declarada
  const g = (gemeo: string, caso: string, derivacao: unknown) => ({ gemeo, caso, derivacao }) as never;
  const alc = alcancePorCaso({ _meta: {}, gemeos: [g("T-01-P", "T-01", undefined), g("X-01-D", "X-01", undefined), g("X-01-C", "X-01", { paginaDe: "p", trocas: [["aria-a", "aria-b"]], trocasJs: [] })] }, () => "<p aria-a>x</p>");
  conferir("M4: sem mudança declarada", alc.get("T-01") === "sem-mudanca-declarada");
  conferir("M4: mudança que não toca CSS", alc.get("X-01") === "nao-toca-css");
  // M5 + M4 nas tabelas; H1 (sem D1)
  const cel = (resultado: ResultadoCelula["resultado"], classe: ResultadoCelula["classe"], extra: Partial<ResultadoCelula> = {}): ResultadoCelula => ({ sujeito: "s", normas: [], esperado: "", classe, resultado, sujeitoResolvido: true, atribuidos: [], creditados: [], ...extra });
  const regs = [
    { familia: "F9", papel: "defeituoso", foraDeAlcance: null, sinalizada: true, gemeo: "A", referencia: "Z", celulas: [cel("TP", "positivo", { resultadoSemD1: "FN" }), cel("FP", "negativo", { resultadoSemD1: "TN" })] },
    { familia: "F9", papel: "conforme", foraDeAlcance: null, sinalizada: false, gemeo: "B", referencia: "Z", celulas: [cel("TN", "negativo", { sujeitoResolvido: false })] },
    { familia: "F9", papel: "defeituoso", foraDeAlcance: null, sinalizada: false, gemeo: "C", referencia: "Z", celulas: [cel("FN", "positivo", { foraDeAlcance: MOTIVO_SEM_MUDANCA })] },
  ];
  const t = tabelaPorFamilia(regs).at(-1)!;
  conferir("M5: TN sujeito não resolvido", t.TN === 1 && t.TNsujeitoNaoResolvido === 1);
  conferir("M4: FN sem mudança declarada separado", t.FNsemMudancaDeclarada === 1 && t.FNforaDeAlcance === 0);
  const ts = tabelaPorFamilia(semD1(regs)).at(-1)!;
  conferir("H1: tabela sem D1 usa resultadoSemD1", ts.TP === 0 && ts.FN === 2 && ts.FP === 0 && ts.TN === 2);
  const tg = tabelaPorGemeo(regs).at(-1)!;
  conferir("M2: tabela por gêmeo", tg.defeituosos === 2 && tg.defeituososSinalizados === 1 && tg.defeituososNoSujeito === 1 && tg.defeituososTambemEmSujeitoConforme === 1 && tg.conformes === 1 && tg.conformesSinalizados === 0);
  // regressão visual com PNG sintéticos
  const png = (w: number, h: number, pinta?: [number, number]) => {
    const p = new PNG({ width: w, height: h });
    p.data.fill(255);
    if (pinta) p.data.set([0, 0, 0, 255], (pinta[1] * w + pinta[0]) * 4);
    return PNG.sync.write(p);
  };
  const c0 = comparar(png(20, 20), png(20, 20));
  conferir("visual: idênticas → 0", c0.pixelsDiferentes === 0 && c0.diffPng === null);
  const c1 = comparar(png(20, 20, [5, 5]), png(20, 20));
  conferir("visual: 1 pixel", c1.pixelsDiferentes === 1 && igual(c1.caixaDaDiferenca, { x: 5, y: 5, width: 1, height: 1 }));
  conferir("visual: no sujeito (margem 8)", c1.pixelsEm([{ x: 12, y: 12, width: 2, height: 2 }]) === 1);
  conferir("visual: fora do sujeito", c1.pixelsEm([{ x: 15, y: 15, width: 2, height: 2 }]) === 0);
  conferir("visual: união conta uma vez", c1.pixelsEm([{ x: 4, y: 4, width: 2, height: 2 }, { x: 5, y: 5, width: 1, height: 1 }]) === 1);
  const c2 = comparar(png(20, 24), png(20, 20));
  conferir("visual: tamanho diferente", c2.tamanhoDiferente && c2.pixelsDiferentes === 20 * 4);
}

async function determinismo() {
  const gemeos = ["F2-08-D", "F2-08-C", "F6-01-D", "F6-01-C", "F6-01-X", "F8-03-D", "F8-03-C"];
  const base = mkdtempSync(join(tmpdir(), "nat76-"));
  try {
    const comum = { divisao: "desenvolvimento" as const, raiz: join(RAIZ_TCC, "govbr-corpus/dist"), so: null, telas: false, gemeos, carimbo: "determinismo" };
    const a = await executar({ ...comum, saida: join(base, "a") });
    const b = await executar({ ...comum, saida: join(base, "b") });
    const ma = JSON.parse(readFileSync(join(a.pasta, "manifesto.json"), "utf8")).arquivos as Record<string, string>;
    const mb = JSON.parse(readFileSync(join(b.pasta, "manifesto.json"), "utf8")).arquivos as Record<string, string>;
    delete ma["tempos.json"];
    delete mb["tempos.json"];
    const dif = [...new Set([...Object.keys(ma), ...Object.keys(mb)])].filter((k) => ma[k] !== mb[k]);
    conferir(`determinismo: ${Object.keys(ma).length} arquivos idênticos byte a byte em duas execuções`, dif.length === 0, dif.join(", "));
    conferir("determinismo: piso de ruído 0 nas referências", b.visual.every((r) => !r.instavel));
    // H1: caixas arquivadas por sujeito (gêmeo e referência) e contagem com e sem D1
    const d = b.visual.find((r) => r.gemeo === "F2-08-D")!;
    const p = d.pontos[0];
    const cx = p.caixas[".br-breadcrumb"];
    conferir("H1: caixas do gêmeo e da referência arquivadas", !!cx && cx.gemeo.length > 0 && cx.referencia.length > 0, JSON.stringify(cx));
    conferir("H1: união ≥ só gêmeo", Object.keys(p.pixelsNoSujeito).every((k) => p.pixelsNoSujeito[k] >= p.pixelsNoSujeitoSemD1[k]));
    conferir("H1: cada célula tem resultado sem D1", d.celulas.every((c) => !!c.resultadoSemD1));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

await unidades();
if (!process.argv.includes("--rapido")) await determinismo();
console.log(`\n${ok} ok, ${falhas.length} falha(s)`);
for (const f of falhas) console.log("  FALHA " + f);
process.exitCode = falhas.length ? 1 : 0;
