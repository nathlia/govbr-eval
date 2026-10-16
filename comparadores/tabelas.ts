/**
 * Tabelas reprodutíveis da NAT-76 (plano §5, §8, §10).
 *
 * - Tabela PRINCIPAL de cada comparador: por gêmeo (página), por família — quantos gêmeos
 *   defeituosos o comparador sinaliza, quantos com o sinal no sujeito do defeito, e quantas
 *   alternativas/exceções conformes ele sinaliza (M2 da revisão: as células de V não são
 *   independentes — mesmo sujeito em duas células, diferenças idênticas, sujeito `documento`).
 * - Tabela DESCRITIVA por célula do catálogo (positivos TP/FN, negativos FP/TN, à parte), com as
 *   categorias de FN/TN que não são medida (sem mudança declarada, sujeito não resolvido…).
 * - V também sai "sem D1" (caixa só do gêmeo, regra congelada no §4) para auditar o D1.
 * Pixels e linhas não são N experimental.
 */
import type { RegistroLintGemeo, RegistroLintTela, ResultadoCelula } from "./lint";
import type { RegistroVisualGemeo } from "./visual";

export const PAPEIS_DEFEITO = new Set(["defeituoso", "defeituoso-oculto"]);
export const PAPEIS_CONFORME = new Set(["conforme", "conforme-oculto", "conforme-excecao", "alternativa", "excecao"]);
const MOTIVO_SEM_MUDANCA = "sem mudança declarada no caso";

export interface Linha {
  familia: string;
  positivos: number; TP: number; FN: number;
  /** FN em gêmeo/caso que o comparador não alcança, MEDIDO (mudança não toca CSS; sem referência; papel de evidência). */
  FNforaDeAlcance: number;
  /** FN em caso sem mudança declarada (T-01 no lint): não há o que medir. */
  FNsemMudancaDeclarada: number;
  FNsujeitoNaoResolvido: number;
  FNcontextoAria: number;
  negativos: number; FP: number; TN: number;
  /** TN só porque o sujeito da célula não resolve na página (M5): não é especificidade medida. */
  TNsujeitoNaoResolvido: number;
  aparte: number; referencia: number;
}

type Registro = { familia: string; papel: string; foraDeAlcance: string | null; celulas: ResultadoCelula[]; sinalizada: boolean; referencia?: string | null; gemeo: string };

/** Troca `resultado` por `resultadoSemD1` (V), para a tabela de auditoria do D1. */
export const semD1 = <R extends Registro>(regs: R[]): R[] =>
  regs.map((r) => ({ ...r, celulas: r.celulas.map((c) => ({ ...c, resultado: c.resultadoSemD1 ?? c.resultado })) }));

export function tabelaPorFamilia(regs: Registro[]): Linha[] {
  const familias = [...new Set(regs.map((r) => r.familia))].sort();
  const linha = (fam: string, rs: Registro[]): Linha => {
    const cel = rs.flatMap((r) => r.celulas);
    const fn = cel.filter((c) => c.resultado === "FN");
    const tn = cel.filter((c) => c.resultado === "TN");
    return {
      familia: fam,
      positivos: cel.filter((c) => c.classe === "positivo" && (c.resultado === "TP" || c.resultado === "FN")).length,
      TP: cel.filter((c) => c.resultado === "TP").length,
      FN: fn.length,
      FNforaDeAlcance: fn.filter((c) => c.foraDeAlcance && c.foraDeAlcance !== MOTIVO_SEM_MUDANCA).length,
      FNsemMudancaDeclarada: fn.filter((c) => c.foraDeAlcance === MOTIVO_SEM_MUDANCA).length,
      FNsujeitoNaoResolvido: fn.filter((c) => !c.foraDeAlcance && !c.sujeitoResolvido).length,
      FNcontextoAria: fn.filter((c) => c.marca === "contexto-aria").length,
      negativos: cel.filter((c) => c.classe === "negativo" && (c.resultado === "FP" || c.resultado === "TN")).length,
      FP: cel.filter((c) => c.resultado === "FP").length,
      TN: tn.length,
      TNsujeitoNaoResolvido: tn.filter((c) => !c.sujeitoResolvido).length,
      aparte: cel.filter((c) => c.resultado === "aparte").length,
      referencia: cel.filter((c) => c.resultado === "referencia").length,
    };
  };
  const linhas = familias.map((f) => linha(f, regs.filter((r) => r.familia === f)));
  linhas.push(linha("total", regs));
  return linhas;
}

export interface LinhaGemeo {
  familia: string;
  defeituosos: number; defeituososSinalizados: number; defeituososNoSujeito: number; defeituososTambemEmSujeitoConforme: number;
  conformes: number; conformesSinalizados: number;
  outros: number; outrosSinalizados: number;
  referencias: number; foraDeAlcance: number;
}

/**
 * Tabela principal (M2): uma linha por família, unidade = gêmeo (página). "Conformes" = gêmeos de
 * papel conforme que o comparador AVALIA (em V, a referência -C não entra: é a própria régua).
 */
export function tabelaPorGemeo(regs: Registro[]): LinhaGemeo[] {
  const familias = [...new Set(regs.map((r) => r.familia))].sort();
  const linha = (fam: string, rs: Registro[]): LinhaGemeo => {
    const av = rs.filter((r) => !r.foraDeAlcance && r.referencia !== r.gemeo);
    const d = av.filter((r) => PAPEIS_DEFEITO.has(r.papel));
    const c = av.filter((r) => PAPEIS_CONFORME.has(r.papel));
    const o = av.filter((r) => !PAPEIS_DEFEITO.has(r.papel) && !PAPEIS_CONFORME.has(r.papel));
    return {
      familia: fam,
      defeituosos: d.length,
      defeituososSinalizados: d.filter((r) => r.sinalizada).length,
      defeituososNoSujeito: d.filter((r) => r.celulas.some((x) => x.resultado === "TP")).length,
      defeituososTambemEmSujeitoConforme: d.filter((r) => r.celulas.some((x) => x.resultado === "FP")).length,
      conformes: c.length,
      conformesSinalizados: c.filter((r) => r.sinalizada).length,
      outros: o.length,
      outrosSinalizados: o.filter((r) => r.sinalizada).length,
      referencias: rs.filter((r) => r.referencia === r.gemeo).length,
      foraDeAlcance: rs.filter((r) => r.foraDeAlcance).length,
    };
  };
  const linhas = familias.map((f) => linha(f, regs.filter((r) => r.familia === f)));
  linhas.push(linha("total", regs));
  return linhas;
}

export function tabelaDeTela(t: RegistroLintTela) {
  return t.specs.map((s) => ({ spec: s.id, estado: s.estado, atribuidos: s.atribuidos.length, creditados: s.creditados.length, regrasDoLint: [...new Set(t.achados.filter((a) => s.creditados.includes(a.id)).map((a) => a.regraId))] }));
}

const mdCelulas = (linhas: Linha[], rotuloNeg: string) =>
  [
    `| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | ${rotuloNeg} | FP | TN | (TN sujeito não resolvido) | À parte | Referência |`,
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...linhas.map((l) => `| ${l.familia} | ${l.positivos} | ${l.TP} | ${l.FN} | ${l.FNforaDeAlcance} | ${l.FNsemMudancaDeclarada} | ${l.FNsujeitoNaoResolvido} | ${l.FNcontextoAria} | ${l.negativos} | ${l.FP} | ${l.TN} | ${l.TNsujeitoNaoResolvido} | ${l.aparte} | ${l.referencia} |`),
  ].join("\n");

const mdGemeos = (linhas: LinhaGemeo[], sinal: string, rotuloConf: string) =>
  [
    `| Família | Defeituosos avaliados | com ${sinal} | com ${sinal} no sujeito do defeito | com ${sinal} também em sujeito conforme | ${rotuloConf} | com ${sinal} | Outros papéis avaliados | com ${sinal} | Referências | Fora de alcance |`,
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...linhas.map((l) => `| ${l.familia} | ${l.defeituosos} | ${l.defeituososSinalizados} | ${l.defeituososNoSujeito} | ${l.defeituososTambemEmSujeitoConforme} | ${l.conformes} | ${l.conformesSinalizados} | ${l.outros} | ${l.outrosSinalizados} | ${l.referencias} | ${l.foraDeAlcance} |`),
  ].join("\n");

export function deltaD1(visual: RegistroVisualGemeo[]) {
  const com = tabelaPorFamilia(visual).at(-1)!;
  const sem = tabelaPorFamilia(semD1(visual)).at(-1)!;
  const mudaram = visual.flatMap((r) => r.celulas.filter((c) => c.resultadoSemD1 && c.resultadoSemD1 !== c.resultado).map((c) => ({ gemeo: r.gemeo, sujeito: c.sujeito, semD1: c.resultadoSemD1!, comD1: c.resultado })));
  return { TP: com.TP - sem.TP, FP: com.FP - sem.FP, FN: com.FN - sem.FN, TN: com.TN - sem.TN, celulas: mudaram };
}

export function montarTabelas(lint: RegistroLintGemeo[], visual: RegistroVisualGemeo[], telas: RegistroLintTela[]) {
  const tl = tabelaPorFamilia(lint);
  const tv = tabelaPorFamilia(visual);
  const tvSemD1 = tabelaPorFamilia(semD1(visual));
  const gl = tabelaPorGemeo(lint);
  const gv = tabelaPorGemeo(visual);
  const gvSemD1 = tabelaPorGemeo(semD1(visual));
  const d1 = deltaD1(visual);
  const telasT = telas.map((t) => ({ tela: t.tela, contagem: t.contagem, foraDeAlcance: t.foraDeAlcance, specs: tabelaDeTela(t) }));
  const detalhes = (regs: Registro[]) =>
    regs.flatMap((r) => r.celulas.filter((c) => ["TP", "FP", "FN"].includes(c.resultado) || (c.resultado === "TN" && !c.sujeitoResolvido)).map((c) => `| ${r.gemeo} | ${r.papel} | \`${c.sujeito}\` | ${c.normas.join(", ")} | ${c.esperado} | **${c.resultado}** | ${[c.foraDeAlcance, c.marca, c.sujeitoResolvido || c.foraDeAlcance ? "" : "sujeito não resolvido", c.sujeito === "documento" ? "sujeito = página inteira" : ""].filter(Boolean).join("; ")} |`));
  const texto = [
    "# NAT-76 — tabelas dos comparadores (controles de desenvolvimento)",
    "",
    "**Como ler.** Achado de lint ≠ diferença visual ≠ violação normativa. Uma diferença de pixels não nomeia norma: diz só que a página mudou em relação ao gêmeo conforme aprovado. Pixels e linhas não são N experimental.",
    "",
    "A tabela **principal** de cada comparador conta **gêmeos (páginas)**. A tabela **por célula** é descritiva: as células não são independentes — duas células podem ter o mesmo sujeito (o mesmo sinal vira TP numa e FP na outra), gêmeos com a mesma diferença contam duas vezes (F4-05-D e F4-05-X: 417 501 px idênticos), e o sujeito `documento` é a página inteira (qualquer diferença o atinge). Atribuição do lint é um-para-muitos: o seletor de uma regra credita todo elemento que ele casa (nenhum caso nesta execução).",
    "",
    "Negativos **não são comparáveis entre L e V**: L avalia todos os gêmeos conformes, inclusive os `-C`; V não avalia os `-C` (são a referência) — então a coluna de negativos de V tem menos células e não mede a mesma especificidade.",
    "",
    "## L — Stylelint normativo (N1–N3; higiene não conta)",
    "",
    "### Principal: por gêmeo (sinal = ≥ 1 achado normativo; no sujeito = achado atribuído e com norma cruzada)",
    "",
    mdGemeos(gl, "achado", "Conformes avaliados (inclui -C)"),
    "",
    "### Descritiva: por célula",
    "",
    mdCelulas(tl, "Negativos avaliados (inclui -C)"),
    "",
    "## V — regressão visual contra o gêmeo -C",
    "",
    "### Principal: por gêmeo (sinal = ≥ 1 pixel diferente; no sujeito = diferença dentro da caixa do sujeito, regra vigente D1)",
    "",
    mdGemeos(gv, "diferença", "Conformes avaliados (sem os -C)"),
    "",
    "### Descritiva: por célula (regra vigente, D1: caixa gêmeo ∪ referência)",
    "",
    mdCelulas(tv, "Negativos avaliados (sem os -C)"),
    "",
    "### Auditoria do D1: as mesmas tabelas com a caixa congelada no §4 (só a do gêmeo)",
    "",
    mdGemeos(gvSemD1, "diferença", "Conformes avaliados (sem os -C)"),
    "",
    mdCelulas(tvSemD1, "Negativos avaliados (sem os -C)"),
    "",
    `Efeito líquido do D1 (vigente − sem D1): TP ${d1.TP >= 0 ? "+" : ""}${d1.TP}, FP ${d1.FP >= 0 ? "+" : ""}${d1.FP}, FN ${d1.FN >= 0 ? "+" : ""}${d1.FN}, TN ${d1.TN >= 0 ? "+" : ""}${d1.TN}. Células que mudaram: ${d1.celulas.map((c) => `${c.gemeo} \`${c.sujeito}\` ${c.semD1}→${c.comD1}`).join("; ") || "nenhuma"}.`,
    "",
    "## Telas (lint; regressão visual = lacuna, sem gêmeo conforme)",
    "",
    ...telasT.flatMap((t) => [
      `### ${t.tela}`,
      "",
      `Achados normativos de origem página: ${t.contagem.normativoPagina} (por biblioteca embutida, heurística de seletor: ${Object.entries(t.contagem.normativoPaginaPorBiblioteca).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}) · de origem DS (não cobrados): ${t.contagem.normativoDs}, dos quais ${t.contagem.normativoDsValorDiferente} com valor normalizado diferente do DS e ${t.contagem.normativoDsSemValor} sem valor (N3, bloco) · higiene página/DS: ${t.contagem.higienePagina}/${t.contagem.higieneDs}`,
      "",
      `Fora de alcance: ${t.foraDeAlcance.join("; ")}`,
      "",
      "| Spec | Estado | Achados atribuídos | Creditados | Regras |",
      "|---|---|---|---|---|",
      ...t.specs.map((s) => `| ${s.spec} | ${s.estado} | ${s.atribuidos} | ${s.creditados} | ${s.regrasDoLint.join(", ")} |`),
      "",
    ]),
    "## Células TP / FP / FN e TN sem sujeito resolvido, uma a uma",
    "",
    "### L",
    "",
    "| Gêmeo | Papel | Sujeito | Normas | Esperado | Resultado | Observação |",
    "|---|---|---|---|---|---|---|",
    ...detalhes(lint),
    "",
    "### V (regra vigente)",
    "",
    "| Gêmeo | Papel | Sujeito | Normas | Esperado | Resultado | Observação |",
    "|---|---|---|---|---|---|---|",
    ...detalhes(visual),
    "",
  ].join("\n");
  return { json: { lint: { porGemeo: gl, porCelula: tl }, visual: { porGemeo: gv, porCelula: tv, semD1: { porGemeo: gvSemD1, porCelula: tvSemD1 }, deltaD1: d1 }, telas: telasT }, md: texto };
}
