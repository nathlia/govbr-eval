/**
 * Camada de política (P3, P7, P13, E6, E9): fora de SCORER_FILES. Recebe átomos SEM braço, run,
 * campanha-modelo (P9: o tipo `AtomoEntrada` não tem esses campos; conferido no tsc pelo teste) e
 * devolve, por variante, as partes classificadas e o tratamento (julgado | T1 | T2 | T3 | pendente).
 *
 * O scorer decide só crédito em unidade; a tradução para o vocabulário dele está em `decisaoDoScorer`.
 */
import type { AtomoArquivado } from "./e1";
import type { Parte, Veredito, VereditoAtomo } from "./vereditos";
import type { Derivado, Resposta } from "./e14-comum";

/** Julgamento da fila T3 (E14) de um átomo: o que a ingestão gravou em julgamentos.json (sem braço). */
export interface JulgamentoT3 { id: string; tipo: string; fonte: string; resposta: Resposta; derivado: Derivado }

export type Variante = "principal" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7";
export const VARIANTES: readonly Variante[] = ["principal", "S1", "S2", "S3", "S4", "S5", "S6", "S7"];
export const DESCRICAO_VARIANTE: Record<Variante, string> = {
  principal: "política 1.2.0, origem medida com o DS 3.4.1 (tela B), todos os juízes, resposta vigente da autora, Q1 a, Q3 a",
  S1: "política 1.1.0: observação com norma errada como falso, sem o crédito da R15 (nem o da Q1 a)",
  S2: "origem com o exemplo do DS 3.7.0 (22 casos da tela B passam a pagina; só a análise I)",
  S3: "só julgamentos cegos da autora: revisitas e correções após a orientação revertidas ao cego",
  S4: "só humano: classe ou vínculo decididos só por LLM (revisor novo, Q3) revertidos ao arquivo — ATENÇÃO: o arquivo é carregado mesmo quando a P7 o julga incompatível com a 1.2.0 (citação incerta, família sensível); a S4 mistura vereditos que a principal não aceitaria do arquivo",
  S5: "Q1 b: átomo creditado com regra nula vira observação e não credita",
  S6: "indeterminada conta como pagina na análise I",
  S7: "sem-evidencia → pendente: átomo julgado na T3 cujo cartão traz a sinalização sem-evidencia (nenhuma evidência resolvida) e nenhum fato medido, com fato verdadeiro só inferido, fica pendente (R9)",
};

export type Tratamento = "julgado" | "T1" | "T2" | "T3" | "pendente";
export type Classe = "violacao-pagina" | "violacao-ds" | "violacao-origem-indeterminada" | "erro-factual" | "erro-normativo"
  | "erro-arquivo" | "observacao" | "observacao-norma-errada" | "duplicata" | "evidencia-indisponivel" | "pendente";
export type Qualidade = "valida" | "invalida" | "generica" | "ausente" | "indeterminada" | "pendente" | null;

/** Entrada da política: o átomo arquivado sem braço + o que os juízes e as medidas disseram. */
/** O átomo como a política o vê: sem campanha, par nem revisão; a chave é opaca (P9). Braço e run nunca chegam aqui. */
export type AtomoPolitica = Omit<AtomoArquivado, "campanha" | "par" | "revisao">;
export interface AtomoEntrada {
  atomo: AtomoPolitica;
  veredito: VereditoAtomo | null;
  /** Origem medida (D-129) do caso, com o DS da versão usada (3.4.1 na B) e com o 3.7.0. */
  origem341: string | null; origem370: string | null;
  /** Sugestão da linha de base por regra mecânica (P13); `null` para cartão de agente. */
  sugestaoLinhaDeBase: "generica" | "ausente" | "indeterminada" | null;
  /** Vocabulário da classificação da citação (P5): regra citada → ids equivalentes. */
  equivalentes: (regra: string) => string[];
  /** A regra do axe é só boa prática (sem etiqueta WCAG)? `null` se não é regra do axe. */
  axeBoaPratica: (regra: string) => boolean | null;
  /** [1.1.0] Julgamento da fila T3 (LLM cego, D-130), quando houver. */
  t3?: JulgamentoT3 | null;
  /** [1.1.0] Átomo da família T2 que a medida não fechou: o motivo (vai à T3). */
  t2Pendente?: string | null;
  /** [1.1.0, S7] Cartão com a sinalização `sem-evidencia` (contrato do achado) e sem fato medido do próprio caso. */
  semEvidencia?: boolean;
}

export interface ParteClassificada {
  indice: number; parte: string; sujeitos: string[];
  verdadeFactual: string | null; normaId: string | null; normaForca: string | null; normaAplicabilidade: string | null; normaViolada: string | null;
  origemJuiz: string | null; origem: "pagina" | "ds" | "indeterminada" | null; origemRotulo: string | null;
  regraCitada: string | null; forcaDaCitacao: string | null; aplicabilidadeDaCitada: string | null;
  qualidadeDaSugestao: Qualidade;
  classe: Classe;
  /** Spec a creditar (vínculo do juiz, R15, Q1, T1) ou null. */
  spec: string | null;
  /** Crédito vem da R15/Q1 (detecção sem fundamentação)? */
  credito: "unidade" | "r15" | "q1" | null;
  regraDaPolitica: string; motivo: string;
}
export interface AtomoClassificado {
  chave: string; juiz: string; tratamento: Tratamento; partes: ParteClassificada[];
  /** T1 / arquivo: transpõe o átomo arquivado como está (pelo mapa). */
  transporArquivo: boolean;
  aposRevelacao: boolean; aposOrientacao: boolean; fontes: string[]; divergencias: string[];
  fila: "T2" | "T3" | null; motivoFila: string | null;
}

// ───────────────────────────────────────────────────────────────── tabelas fixas

const FAMILIAS_SENSIVEIS = new Set(["R2-nome", "R4-token", "R11-3.3.1", "R13/R15-boa-pratica", "sem-regra"]);
/** T2 = família com medida mecânica prevista (R2 nome calculado, R4 folha do DS). */
const FAMILIAS_T2 = new Set(["R2-nome", "R4-token"]);
/** Q3 a (decisões do assistente, 16/10): vínculo da R15 gravado pelo assistente, tela B. */
export const Q3_R15: Record<string, string> = { "axe:page-has-heading-one": "B-02", "axe:empty-table-header": "B-26" };

/** Normaliza o id citado: `ds-token-color` → `ds:token-color`; `axe:label` e `label` comparam iguais. */
export const normalizarRegra = (r: string): string => r.trim().replace(/\s*\(.*\)$/, "").replace(/^ds-(?!:)/, "ds:");

export function classeDaOrigem(o: string | null): "pagina" | "ds" | "indeterminada" {
  if (o === "pagina" || o === "pagina-copiando-exemplo-ds") return "pagina";
  if (o === "ds-entregue") return "ds";
  return "indeterminada";
}

function forcaDaCitada(regra: string | null, e: AtomoEntrada): string | null {
  if (!regra) return "nenhuma";
  const bp = e.axeBoaPratica(normalizarRegra(regra).replace(/^axe:/, ""));
  if (bp === true) return "boa-pratica";
  if (bp === false || /^wcag:|^emag:/.test(regra)) return "obrigatorio";
  return null;
}

/** Classificador de citação (E6) para átomo creditado com citação `uncertain` ou regra nula. */
export function classificarCitacao(e: AtomoEntrada): { resultado: "equivalente" | "r15" | "q1" | "outra-obrigatoria" | "incerta"; forca: string | null; motivo: string } {
  const a = e.atomo;
  if (!a.regra) return { resultado: "q1", forca: "nenhuma", motivo: "regra nula (fluxo-1.3.0 permite): Q1" };
  const cit = normalizarRegra(a.regra);
  const unid = new Set(a.regrasDasUnidades.flatMap(r => [r, ...e.equivalentes(r)]).map(normalizarRegra));
  const cand = new Set([cit, cit.replace(/^axe:/, ""), `axe:${cit.replace(/^axe:/, "")}`, ...e.equivalentes(cit), ...e.equivalentes(a.regra)].map(normalizarRegra));
  if ([...cand].some(x => unid.has(x))) return { resultado: "equivalente", forca: forcaDaCitada(a.regra, e), motivo: "regra citada = regra da unidade ou equivalente (v1 / etiquetas WCAG do axe-core)" };
  const bp = e.axeBoaPratica(cit.replace(/^axe:/, ""));
  if (bp === true) return { resultado: "r15", forca: "boa-pratica", motivo: "regra do axe só best-practice, verdadeira e mais fraca que a da unidade: R15" };
  if (!a.regrasDasUnidades.length) return { resultado: "incerta", forca: forcaDaCitada(a.regra, e), motivo: "a unidade não declara regra: aplicabilidade da citada não decidível por tabela" };
  if (bp === false || /^wcag:|^emag:/.test(cit)) return { resultado: "outra-obrigatoria", forca: "obrigatorio", motivo: "regra obrigatória diferente da da unidade: aplicabilidade a julgar (T3)" };
  return { resultado: "incerta", forca: forcaDaCitada(a.regra, e), motivo: "regra citada fora das tabelas (v1, checker, axe): incerta (T3)" };
}

// ───────────────────────────────────────────────────────────────── classificação

const ehViolacao = (c: string | null) => c === "violacao-pagina" || c === "violacao-ds" || c === "violacao-origem-indeterminada";

function classeDaParte(p: Parte, origem: "pagina" | "ds" | "indeterminada" | null, qualidade: Qualidade, politica: "1.2.0" | "1.1.0"): Classe {
  const c = p.classe;
  if (!c) return "pendente";
  if (ehViolacao(c)) return origem === "pagina" ? "violacao-pagina" : origem === "ds" ? "violacao-ds" : "violacao-origem-indeterminada";
  if (c === "erro-normativo") {
    if (politica === "1.1.0") return "erro-normativo";
    if (qualidade === "pendente") return "pendente";
    return qualidade === "valida" ? "observacao-norma-errada" : "erro-normativo";
  }
  if (c === "erro-factual" || c === "observacao" || c === "duplicata" || c === "evidencia-indisponivel") return c;
  return "pendente";
}

/** Classe equivalente da decisão arquivada (P7 "arquivo", G2 "política identidade"). */
export function classeDoArquivo(decisao: string): Classe {
  switch (decisao) {
    case "defeito-do-gabarito": return "violacao-pagina";
    case "defeito-novo-correto": return "violacao-origem-indeterminada";
    case "incorreta": return "erro-arquivo";
    case "duplicada": return "duplicata";
    default: return "pendente";
  }
}

function parteDoArquivo(e: AtomoEntrada, variante: Variante, regraDaPolitica: string, motivo: string, credito: ParteClassificada["credito"] = null): ParteClassificada {
  const a = e.atomo;
  let classe = classeDoArquivo(a.decisao);
  const origemM = variante === "S2" ? e.origem370 : e.origem341;
  // [mudança revisão M1] defeito-do-gabarito: 'pagina (unidade da referência)' só sem origem medida ou com origem pagina/copiando;
  // origem medida DS ou indeterminada segue a regra do átomo julgado (DS: novo correto, vínculo não credita — P3).
  const medidaNaoPagina = a.decisao === "defeito-do-gabarito" && origemM !== null && classeDaOrigem(origemM) !== "pagina";
  const origem = classe === "violacao-pagina" ? (medidaNaoPagina ? classeDaOrigem(origemM) : "pagina") : classe === "violacao-origem-indeterminada" ? classeDaOrigem(origemM) : null;
  if (ehViolacao(classe) && origem) classe = origem === "pagina" ? "violacao-pagina" : origem === "ds" ? "violacao-ds" : "violacao-origem-indeterminada";
  const m1 = medidaNaoPagina ? ` · M1: origem medida ${origemM} (${classe})${classe === "violacao-ds" ? ": vínculo à unidade não credita (P3)" : ""}` : "";
  return { indice: 0, parte: "o cartão inteiro", sujeitos: [...a.sujeitos], verdadeFactual: null, normaId: null, normaForca: null, normaAplicabilidade: null, normaViolada: null,
    origemJuiz: null, origem, origemRotulo: a.decisao === "defeito-do-gabarito" && !medidaNaoPagina ? "pagina (unidade da referência)" : origemM ?? "indeterminada (não medida)",
    regraCitada: a.regra, forcaDaCitacao: forcaDaCitada(a.regra, e), aplicabilidadeDaCitada: null, qualidadeDaSugestao: null, classe,
    spec: a.unidades[0]?.specId ?? null, credito: a.decisao === "defeito-do-gabarito" && classe !== "violacao-ds" ? (credito ?? "unidade") : null,
    regraDaPolitica: classe === "violacao-ds" && medidaNaoPagina ? "R5" : regraDaPolitica, motivo: motivo + m1 };
}

/** O átomo arquivado só é transposto como está se a parte mantém o crédito arquivado (M1: origem DS tira o crédito). */
const transpoe = (e: AtomoEntrada, p: ParteClassificada): boolean => e.atomo.decisao !== "defeito-do-gabarito" || p.credito !== null;

/** Escolhe o veredito do juiz para a variante (S3 reverte o pós-orientação ao cego; S4 tira o LLM). */
export function vereditoDaVariante(v: VereditoAtomo | null, variante: Variante): Veredito | null {
  if (!v) return null;
  if (variante === "S3" && v.vigente.aposOrientacao && v.cego) return v.cego;
  if (variante === "S4" && v.vigente.juiz === "revisor-novo") return null;
  return v.vigente;
}

export function classificar(e: AtomoEntrada, variante: Variante): AtomoClassificado {
  const a = e.atomo;
  const politica = variante === "S1" ? "1.1.0" : "1.2.0";
  const v = vereditoDaVariante(e.veredito, variante);
  const base = { chave: a.chave, aposRevelacao: v?.aposRevelacao ?? false, aposOrientacao: v?.aposOrientacao ?? false,
    fontes: v?.fonte ?? [], divergencias: e.veredito?.divergencias ?? [] };

  // ── julgado (fontes 1–4 da P6)
  if (v) {
    const origemM = variante === "S2" ? e.origem370 : e.origem341;
    const partes = v.partes.map((p, i): ParteClassificada => {
      const sujeitos = p.sujeitos ?? (v.partes.length === 1 || a.sujeitos.length === 1 ? [...a.sujeitos] : []);
      const fato = p.verdadeFactual === "verdadeira";
      // Origem: a medida decide (P11); a parte da medida (P10) traz a própria.
      const origemFonte = v.juiz === "medida" ? p.origem : origemM;
      const origem = ehViolacao(p.classe) ? (origemFonte ? classeDaOrigem(origemFonte) : "indeterminada") : null;
      const qualidade: Qualidade = p.classe === "erro-normativo"
        ? (a.origemCartao === "linha-de-base" ? (e.sugestaoLinhaDeBase === "indeterminada" ? "pendente" : e.sugestaoLinhaDeBase)
          // [L3] qualidade indeterminada do agente → pendente (R9), como na linha de base.
          : (variante !== "S4" && e.t3?.derivado.qualidadeDaSugestao && e.t3.derivado.qualidadeDaSugestao !== "indeterminada" ? e.t3.derivado.qualidadeDaSugestao as Qualidade : "pendente")) : null;
      let classe = classeDaParte(p, origem, qualidade, politica);
      let spec = ehViolacao(p.classe) ? p.vinculo?.unidade ?? null : null;
      let credito: ParteClassificada["credito"] = spec && classe !== "violacao-ds" ? "unidade" : null;
      let regraDaPolitica = classe === "violacao-ds" ? "R5" : classe === "erro-factual" ? "R1" : classe === "erro-normativo" ? "R11" : classe === "duplicata" ? "R12"
        : classe === "evidencia-indisponivel" ? "R9" : classe === "observacao-norma-errada" ? "R11d" : spec ? "R7" : "R2-classes";
      let motivo = v.rotulo;
      // Q3 a: R15 para o erro normativo que descreve o fato da B-02/B-26 (tela B), vínculo gravado pelo assistente.
      // [mudança revisão L2] a norma sozinha não basta: o átomo tem de ancorar no elemento da B-02/B-26 (ancoragem medida do cartão).
      const q3Cand = a.tela === "B" && p.classe === "erro-normativo" && fato && p.norma ? Q3_R15[normalizarRegra(p.norma.id)] : undefined;
      const q3 = q3Cand && (a.candidatasSpecs.includes(q3Cand) || a.unidades.some(u => u.specId === q3Cand)) ? q3Cand : undefined;
      if (q3 && !(variante === "S4")) {
        if (politica === "1.2.0") { classe = "violacao-pagina"; spec = q3; credito = "r15"; regraDaPolitica = "R15"; motivo = `${v.rotulo} · Q3 a: vínculo R15 à ${q3} gravado pelo assistente`; }
        else { classe = "erro-normativo"; spec = null; credito = null; regraDaPolitica = "R13"; motivo = `${v.rotulo} · 1.1.0: sem R15`; }
      }
      if (spec && classe === "violacao-ds") motivo += " · origem medida DS: vínculo à unidade não credita (P3)";
      return { indice: i, parte: p.parte, sujeitos, verdadeFactual: p.verdadeFactual, normaId: p.norma?.id ?? null, normaForca: p.norma?.forca ?? null,
        normaAplicabilidade: p.norma?.aplicabilidade ?? null, normaViolada: p.norma?.violada ?? null, origemJuiz: p.origem, origem,
        origemRotulo: v.juiz === "medida" ? p.origem : origemM ?? (ehViolacao(p.classe) ? "indeterminada (não medida)" : null),
        regraCitada: a.regra, forcaDaCitacao: forcaDaCitada(a.regra, e), aplicabilidadeDaCitada: p.norma?.aplicabilidade ?? null,
        qualidadeDaSugestao: qualidade, classe, spec, credito, regraDaPolitica, motivo };
    });
    // [1.1.0] qualidade da sugestão julgada na T3: registrada no motivo e na fonte.
    const qT3 = variante !== "S4" ? e.t3?.derivado.qualidadeDaSugestao ?? null : null;
    if (qT3 && partes.some(p => p.qualidadeDaSugestao === qT3)) {
      for (const p of partes) if (p.qualidadeDaSugestao === qT3) p.motivo += ` · qualidade da sugestão: T3 (LLM cego), ${qT3}`;
      base.fontes = [...base.fontes, e.t3!.fonte];
    }
    const semSujeito = partes.some(p => !p.sujeitos.length);
    const pendente = semSujeito || partes.some(p => p.classe === "pendente");
    const filaT3 = partes.some(p => p.qualidadeDaSugestao === "pendente") ? "qualidadeDaSugestao a julgar (T3, P13)" : null;
    return { ...base, juiz: v.juiz, tratamento: pendente ? (filaT3 ? "T3" : "pendente") : "julgado", partes,
      transporArquivo: false, fila: filaT3 ? "T3" : null,
      motivoFila: semSujeito ? "divisão em partes sem mapa parte→sujeito" : filaT3 ?? (pendente ? "classe pendente no veredito" : null) };
  }

  // ── [1.1.0] julgado na fila T3 (LLM cego): a classe derivada das respostas; a S4 (só humano) volta ao arquivo em classificarVariante.
  if (e.t3 && e.t3.tipo !== "qualidade") return classificarT3(e, variante, base);

  // ── sem veredito novo: triagem de compatibilidade (P7, E6)
  if (a.grupo === "credito-fora") {
    if (a.citacao === "supported") { const p = parteDoArquivo(e, variante, "P7", "defeito-do-gabarito com citação supported: violação de origem página, crédito mantido");
      return { ...base, juiz: "arquivo", tratamento: "T1", transporArquivo: transpoe(e, p), fila: null, motivoFila: null, partes: [p] }; }
    const c = classificarCitacao(e);
    if (c.resultado === "equivalente") { const p: ParteClassificada = { ...parteDoArquivo(e, variante, "P7", c.motivo), forcaDaCitacao: c.forca, aplicabilidadeDaCitada: "aplica" };
      return { ...base, juiz: "arquivo", tratamento: "T1", transporArquivo: transpoe(e, p), fila: null, motivoFila: null, partes: [p] }; }
    if (c.resultado === "r15" || c.resultado === "q1") {
      const semCredito = politica === "1.1.0" || (c.resultado === "q1" && variante === "S5");
      const p = parteDoArquivo(e, variante, c.resultado === "r15" ? "R15" : "Q1", c.motivo, c.resultado);
      const parte: ParteClassificada = semCredito
        ? { ...p, classe: c.resultado === "r15" ? "erro-normativo" : "observacao", credito: null, spec: null, origem: null,
          regraDaPolitica: c.resultado === "r15" ? "R13" : "R11b", motivo: `${c.motivo} · ${variante === "S5" ? "Q1 b" : "1.1.0"}: sem crédito` }
        : { ...p, forcaDaCitacao: c.forca, aplicabilidadeDaCitada: "aplica" };
      return { ...base, juiz: "arquivo", tratamento: "T1", transporArquivo: !semCredito && transpoe(e, parte), fila: null, motivoFila: null, partes: [parte] };
    }
    return { ...base, juiz: "pendente", tratamento: "T3", transporArquivo: false, fila: "T3", motivoFila: c.motivo,
      partes: [{ ...parteDoArquivo(e, variante, "P7", c.motivo), classe: "pendente", credito: null, forcaDaCitacao: c.forca, aplicabilidadeDaCitada: "incerta" }] };
  }
  if (a.grupo === "inventario") {
    // Inventário sem veredito novo (proveniência DS do agente; novos corretos da LB B): nunca transposto.
    return { ...base, juiz: "pendente", tratamento: "T3", transporArquivo: false, fila: "T3", motivoFila: "caso material do inventário sem veredito novo (P7)",
      partes: [{ ...parteDoArquivo(e, variante, "P7", "inventário sem veredito novo"), classe: "pendente", credito: null }] };
  }
  // não creditados fora do inventário
  if (FAMILIAS_SENSIVEIS.has(a.familia) || a.decisao === "evidencia-insuficiente") {
    // [1.1.0] T2 que a medida não fechou vai à T3.
    if (e.t2Pendente) { const motivo = `T2: a medida não fecha (${e.t2Pendente}): a julgar (T3)`;
      return { ...base, juiz: "pendente", tratamento: "T3", transporArquivo: false, fila: "T3", motivoFila: motivo,
        partes: [{ ...parteDoArquivo(e, variante, "P7", motivo), classe: "pendente", credito: null }] }; }
    const t2 = FAMILIAS_T2.has(a.familia);
    const motivo = t2 ? `família ${a.familia}: medida mecânica (E7) — não coberta pelas medidas congeladas desta versão; pendente, sem palpite`
      : `família ${a.familia}: aplicabilidade/força da norma a julgar (T3)`;
    return { ...base, juiz: "pendente", tratamento: t2 ? "T2" : "T3", transporArquivo: false, fila: t2 ? "T2" : "T3", motivoFila: motivo,
      partes: [{ ...parteDoArquivo(e, variante, "P7", motivo), classe: "pendente", credito: null }] };
  }
  if (a.decisao === "duplicada" && !a.duplicateOf) return { ...base, juiz: "pendente", tratamento: "T3", transporArquivo: false, fila: "T3",
    motivoFila: "duplicata sem alvo", partes: [{ ...parteDoArquivo(e, variante, "R12", "duplicata sem alvo"), classe: "pendente" }] };
  const pf = parteDoArquivo(e, variante, "P7", "regra fora das famílias que a política mudou: arquivo (revisor original LLM, cego), não reconferido sob 1.2.0");
  return { ...base, juiz: "arquivo", tratamento: "T1", transporArquivo: transpoe(e, pf), fila: null, motivoFila: null, partes: [pf] };
}

/** S4: classe/vínculo do LLM revertidos ao arquivo (classificado como T1 de arquivo, compatível ou não). */
export function classificarVariante(e: AtomoEntrada, variante: Variante): AtomoClassificado {
  const c = classificar(e, variante);
  if (variante === "S4" && (e.veredito?.vigente.juiz === "revisor-novo" || (e.t3 && e.t3.tipo !== "qualidade" && !e.veredito))) {
    const p = parteDoArquivo(e, variante, "S4", "S4: veredito só do LLM revertido ao arquivo (carregado mesmo se a P7 o julgar incompatível)");
    return { ...c, juiz: "arquivo (S4)", tratamento: "T1", transporArquivo: transpoe(e, p), fila: null, motivoFila: null, partes: [p] };
  }
  return c;
}

/** Classe por variante de um átomo julgado na T3 (a partir de `derivado`, que segue a 1.2.0 com a origem 3.4.1). */
function classificarT3(e: AtomoEntrada, variante: Variante, base: Pick<AtomoClassificado, "chave" | "aposRevelacao" | "aposOrientacao" | "fontes" | "divergencias">): AtomoClassificado {
  const a = e.atomo, j = e.t3!, d = j.derivado, r = j.resposta;
  let classe = (variante === "S5" ? d.s5.classe : d.classe) as Classe;
  // [L3] julgamentos ingeridos antes da regra: erro normativo com qualidade indeterminada → pendente (R9).
  if (d.qualidadeDaSugestao === "indeterminada" && (classe === "erro-normativo" || classe === "observacao-norma-errada")) classe = "pendente";
  let spec = variante === "S5" ? d.s5.spec : d.spec;
  // [D-156, política 1.3.0] Classe resgatada por referência secundária: a norma que vale (força, crédito Q1/R15) é a da
  // referência; sem `citacaoPor` (todo julgamento até aqui), nada muda.
  const refUsada = d.citacaoPor && Array.isArray(r.referencias) ? r.referencias.find(x => x.id === d.citacaoPor) ?? null : null;
  const norma = refUsada ? { id: "citada", forca: refUsada.forca, aplicabilidade: refUsada.aplicabilidade, violada: refUsada.violada }
    : r.norma === "nao-perguntado" ? null : r.norma;
  const q1 = norma?.forca === "nenhuma", r15 = !!norma && !q1 && norma.forca !== "obrigatorio";
  let origem: ParteClassificada["origem"] = null;
  if (ehViolacao(classe)) {
    const om = variante === "S2" ? e.origem370 : e.origem341;
    origem = om ? classeDaOrigem(om) : spec ? "pagina" : "indeterminada";
    classe = origem === "pagina" ? "violacao-pagina" : origem === "ds" ? "violacao-ds" : "violacao-origem-indeterminada";
  }
  let credito: ParteClassificada["credito"] = ehViolacao(classe) && spec && classe !== "violacao-ds" ? (q1 ? "q1" : r15 ? "r15" : "unidade") : null;
  let regra = !ehViolacao(classe) ? (variante === "S5" ? d.s5.regraDaPolitica : d.regraDaPolitica)
    : classe === "violacao-ds" ? "R5" : credito === "q1" ? "Q1" : credito === "r15" ? "R15" : credito ? "R7" : "R2-classes";
  if (!credito && ehViolacao(classe)) spec = null;
  // S1 (1.1.0): sem observação com norma errada, sem o crédito da R15 nem o da Q1 a.
  if (variante === "S1") {
    if (classe === "observacao-norma-errada") { classe = "erro-normativo"; regra = "R11"; }
    if (credito === "r15") { classe = "erro-normativo"; credito = null; spec = null; origem = null; regra = "R13"; }
    if (credito === "q1") { classe = "observacao"; credito = null; spec = null; origem = null; regra = "R11b"; }
  }
  // Pendente só o que o juiz deixou indeterminado: classe pendente, ou violação com vínculo indeterminado.
  // S7: fato só de texto (cartão sem evidência resolvida, sem fato medido) julgado verdadeiro por inferência → pendente (R9).
  const s7 = variante === "S7" && !!e.semEvidencia && r.verdadeFactual === "verdadeira" && r.forcaDoVeredito === "inferido";
  const pendente = s7 || classe === "pendente" || (ehViolacao(classe) && r.vinculo === "indeterminado");
  const motivoFila = s7 ? "S7: sem-evidencia, fato verdadeiro só inferido → pendente (R9)"
    : pendente ? `T3 indeterminado: ${[d.classe, ...d.pendencias].join("; ")}: a julgar de novo (T3)` : null;
  const om = variante === "S2" ? e.origem370 : e.origem341;
  const parte: ParteClassificada = { indice: 0, parte: "o cartão inteiro", sujeitos: [...a.sujeitos],
    verdadeFactual: r.verdadeFactual === "nao-perguntado" ? null : r.verdadeFactual, normaId: norma ? (norma.id === "citada" ? a.regra : norma.id) : null,
    normaForca: norma?.forca ?? null, normaAplicabilidade: norma?.aplicabilidade ?? null, normaViolada: norma?.violada ?? null,
    origemJuiz: null, origem, origemRotulo: ehViolacao(classe) ? om ?? (spec ? "pagina (unidade da referência)" : "indeterminada (não medida)") : null,
    regraCitada: a.regra, forcaDaCitacao: forcaDaCitada(a.regra, e), aplicabilidadeDaCitada: norma && norma.id === "citada" ? norma.aplicabilidade : null,
    qualidadeDaSugestao: (d.qualidadeDaSugestao as Qualidade) ?? null, classe: pendente ? "pendente" : classe, spec, credito, regraDaPolitica: regra,
    motivo: motivoFila ?? `T3 (LLM cego, D-130), ${j.id}: ${regra}${d.fundamentacao ? `, fundamentação ${d.fundamentacao}` : ""}${d.citacaoPor ? `, citação pela referência secundária ${d.citacaoPor} (política 1.3.0)` : ""}` };
  return { ...base, fontes: [...base.fontes, j.fonte], juiz: "llm-t3", tratamento: s7 ? "pendente" : pendente ? "T3" : "julgado", transporArquivo: false, partes: [parte],
    fila: pendente && !s7 ? "T3" : null, motivoFila };
}

/** Átomo pendente (T2, T3 ou pendente) que o arquivo creditou (defeito-do-gabarito): entra nos limites de D (H1). */
export const pendenteCreditadoNoArquivo = (a: { decisao: string }, c: AtomoClassificado): boolean =>
  a.decisao === "defeito-do-gabarito" && c.tratamento !== "julgado" && c.tratamento !== "T1";

/** M1: átomo de arquivo creditado (P7/S4) cuja origem medida não-página mudou a classe arquivada. */
export const mudouPorM1 = (a: { decisao: string }, c: AtomoClassificado): boolean =>
  a.decisao === "defeito-do-gabarito" && c.juiz.startsWith("arquivo") && c.partes.some(p => p.motivo.includes(" · M1: "));

/**
 * [mudança revisão H1] Limite superior de D: o átomo pendente que o arquivo creditou mantém o crédito arquivado
 * (classe do arquivo pela mesma regra da P7 compatível, inclusive M1). Os demais átomos não mudam.
 * O limite inferior é a própria classificação da variante (pendente não credita).
 */
export function limiteSuperior(e: AtomoEntrada, c: AtomoClassificado, variante: Variante): AtomoClassificado {
  if (!pendenteCreditadoNoArquivo(e.atomo, c)) return c;
  const p = parteDoArquivo(e, variante, "H1-sup", "limite superior (H1): pendente mantém o crédito do arquivo");
  return { ...c, juiz: "arquivo (limite superior)", tratamento: "T1", transporArquivo: transpoe(e, p), fila: null, motivoFila: null, partes: [p] };
}

// ───────────────────────────────────────────────────────────────── análises I e II (§3 da política)

/** R9/P16: com pendente a métrica é nula (nunca 0) e o estado é PROVISÓRIO. */
export function metrica(tp: number, fp: number, pendentes: number): { precisao: number | null; estado: "FINAL-DERIVADO" | "PROVISORIO" } {
  return { precisao: pendentes ? null : tp + fp ? Math.round((tp / (tp + fp)) * 1e4) / 1e4 : null, estado: pendentes ? "PROVISORIO" : "FINAL-DERIVADO" };
}

export type Elegibilidade = "tp" | "fp" | "excluida-ds" | "excluida-indeterminada" | "observacao" | "obs-norma-errada" | "duplicata" | "pendente";
export function elegibilidade(c: Classe, analise: "I" | "II", indeterminadaComoPagina = false): Elegibilidade {
  switch (c) {
    case "violacao-pagina": return "tp";
    case "violacao-ds": return analise === "II" ? "tp" : "excluida-ds";
    case "violacao-origem-indeterminada": return analise === "II" || indeterminadaComoPagina ? "tp" : "excluida-indeterminada";
    case "erro-factual": case "erro-normativo": case "erro-arquivo": return "fp";
    case "observacao": return "observacao";
    case "observacao-norma-errada": return "obs-norma-errada";
    case "duplicata": return "duplicata";
    default: return "pendente";
  }
}
