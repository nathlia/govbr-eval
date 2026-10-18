/**
 * E14 (plano NAT-74 §6.6): fila T3 — peças comuns. Caminhos, ids opacos, máscara, esquema da resposta do juiz
 * e a derivação mecânica da classe a partir das respostas (política 1.2.0, §2 e R11/R13/R15).
 *
 * Nada aqui julga átomo: o juiz responde perguntas fechadas; a classe sai das respostas por regra fixa.
 * Fora de SCORER_FILES, como o resto de scripts/reanalise-nat74/.
 */
import { join } from "node:path";
import { mascarar as mascararD87 } from "../painel/mascara";
import { CAMINHO_DERIVADO, RESULTADOS, sha } from "./comum";

export const E14_VERSAO = "nat74-fila-t3-1.0.0";
export const FORMATO_LOTE = "nat74-t3-lote-1.0.0";
export const FORMATO_RESPOSTAS = "nat74-t3-respostas-1.0.0";
export const FORMATO_JULGAMENTOS = "nat74-t3-julgamentos-1.0.0";
/** Semente da ordem e dos ids opacos (ordem pelo hash, plano §6.6). */
export const SEMENTE_T3 = "nat74-e14-fila-t3-v1|";
/** Tamanho-alvo dos lotes (pedido: ~25–35 átomos por lote). */
export const ALVO_LOTE = 32;
/** Teto de átomos materiais que vão à autora (P5 a). */
export const TETO_AUTORA = 10;

export const DERIVADO = join(RESULTADOS, CAMINHO_DERIVADO);
export const FILA = (raiz = DERIVADO): string => join(raiz, "fila-t3");

/** Id opaco do átomo na fila (nada da chave aparece nele). */
export const hashDaChave = (chave: string): string => sha(SEMENTE_T3 + chave);
export const idOpaco = (chave: string): string => `T3-${hashDaChave(chave).slice(0, 10)}`;
export const nomeLote = (i: number): string => `lote-${String(i + 1).padStart(2, "0")}`;

// ───────────────────────────────────────────────────────────────── máscara (reuso NAT-73)

/**
 * Máscara da vista cega da NAT-73: D-87 (`painel/mascara.ts`, importada) + os dois acréscimos da rodada 2
 * (`ratificacao/gerar-pacote.mjs`, mesmas expressões): `/tmp/pw-…` → `[arquivo local]` e `emag-N` → `emag:N`.
 */
export function mascarar(t: string): string;
export function mascarar(t: string | null | undefined): string | null;
export function mascarar(t: string | null | undefined): string | null {
  if (t === null || t === undefined) return null;
  return mascararD87(String(t)).replace(/\/tmp\/pw-[^\s"'),;]*/g, "[arquivo local]").replace(/\bemag-(\d+(?:\.\d+)?)/g, "emag:$1");
}
/** Entrada de evidência que é caminho local do Playwright (sai da lista; gerar-pacote.mjs). */
export const ARQUIVO_LOCAL = /^\/tmp\/pw-/;
/** Id de sessão de ferramenta (S-page-003, F-178, V-008): sai da lista de evidências (gerar-pacote.mjs). */
export const ID_DE_FERRAMENTA = /^(?:S-[a-z]+-\d+|[FV]-\d{1,4})$/;
/**
 * [E14] Entrada de evidência que CONTÉM id de sessão de ferramenta ("S-page-002 F-014 a F-038+", "S-page-001:F-004"):
 * também sai da lista. A NAT-73 só tirava a entrada que era exatamente um id; aqui há referências compostas, que só
 * apontam para a saída da ferramenta e nada dão a conferir ao juiz.
 */
export const CONTEM_ID_DE_FERRAMENTA = /\bS-[a-z]+-\d+\b|\b[FV]-\d{1,4}\b/;
export const evidenciaOmitida = (ref: string): boolean => ID_DE_FERRAMENTA.test(ref) || CONTEM_ID_DE_FERRAMENTA.test(ref) || ARQUIVO_LOCAL.test(ref);

// ───────────────────────────────────────────────────────────────── tipos da fila

/** Por que o átomo está na T3 (motivo da triagem E6). NUNCA vai ao juiz: alguns denunciam a decisão arquivada. */
export type TipoT3 = "qualidade" | "citacao" | "inventario" | "sensivel";
export const PERGUNTAS: Record<TipoT3, Pergunta[]> = {
  qualidade: ["sugestao"],
  citacao: ["fato", "norma", "vinculo", "sugestao-se-erro-normativo"],
  inventario: ["fato", "norma", "vinculo", "sugestao-se-erro-normativo"],
  sensivel: ["fato", "norma", "vinculo", "sugestao-se-erro-normativo"],
};
export type Pergunta = "fato" | "norma" | "vinculo" | "sugestao" | "sugestao-se-erro-normativo";

/** Linha da chave (não cega): só o pipeline e o relato leem. */
export interface ItemChave {
  id: string; hash: string; chave: string;
  campanha: string; tela: "A" | "B"; par: string; braco: string; runId: string;
  cardIdOriginal: string; atomoId: string; cardSha256: string; mId: string | null;
  tipo: TipoT3; motivoFila: string;
  decisaoAntiga: string; unidadesAntigas: string; origemMedida341: string | null; origemMedida370: string | null;
  lote: string | null;
}

export interface NormaVista {
  id: string; fonte: string; titulo: string | null; texto: string | null;
  nivel?: string | null; etiquetas?: string[]; forcaDeclarada?: string | null;
  regrasDaBase?: { titulo: string; texto: string; forcaDeclarada: string }[];
}
export interface FatoMedido {
  id: string; relacao: "deste-caso" | "mesmo-elemento"; fonte: string;
  descricao: string; estadoDoDefeito: string | null; origemMedida: string; quemEscreve: string | null;
  medidoNaPagina: string[]; exemploOficial: { mesmoDefeito: boolean | null; medido: string | null } | null;
  trechos: { arquivo: string; trecho: string }[];
}
/** O cartão cego (o que o juiz vê). */
export interface CartaoCego {
  id: string; tela: "A" | "B"; telaNome: string;
  alegacao: {
    regra: string | null; seletor: string | null; observado: string | null; esperado: string | null;
    estado: { viewport: { width: number; height: number } | null; passos: string[] };
    cena: string; sinais: string[];
    evidencias: { id: string; ref: string; status: string }[];
    sujeitos: { id: string; chave: string | null; rotulo: string; cena: string | null }[];
    sujeitosNaoListados: number;
  };
  normaCitada: NormaVista | null;
  candidatas: string[];
  fatosMedidos: FatoMedido[];
  vereditoRegistrado: { verdadeFactual: string | null; norma: { id: string | null; forca: string | null; aplicabilidade: string | null; violada: string | null }; leitura: string } | null;
  perguntas: Pergunta[];
  /** Ids que a justificativa pode citar. */
  citaveis: string[];
}

// ───────────────────────────────────────────────────────────────── esquema da resposta (listas fechadas)

export const VAL = {
  verdadeFactual: ["verdadeira", "falsa", "indisponivel", "indeterminado"] as const,
  forca: ["obrigatorio", "recomendado", "boa-pratica", "exemplo", "nenhuma", "indeterminado"] as const,
  aplicabilidade: ["aplica", "nao-aplica", "incerta"] as const,
  violada: ["sim", "nao", "incerto"] as const,
  relacao: ["direta", "ausencia-global", "host-interno", "participante-relacionado"] as const,
  condicao: ["sim", "nao", "incerto"] as const,
  qualidade: ["valida", "invalida", "generica", "ausente", "indeterminada"] as const,
  forcaDoVeredito: ["medido", "inferido", "incerto"] as const,
};
export const NAO_PERGUNTADO = "nao-perguntado";
/** Norma que o juiz nomeia quando o cartão não cita regra (só ids públicos). */
export const NORMA_PUBLICA = /^(?:wcag:\d+\.\d+\.\d+|emag:\d+\.\d+)$/;

export interface Resposta {
  id: string;
  verdadeFactual: typeof VAL.verdadeFactual[number] | typeof NAO_PERGUNTADO;
  norma: { id: string; forca: typeof VAL.forca[number]; aplicabilidade: typeof VAL.aplicabilidade[number]; violada: typeof VAL.violada[number] } | typeof NAO_PERGUNTADO;
  vinculo: { spec: string; relacao: typeof VAL.relacao[number] } | "nenhum" | "indeterminado" | typeof NAO_PERGUNTADO;
  sugestao: { trataOFato: typeof VAL.condicao[number]; especificaDoSujeito: typeof VAL.condicao[number]; naoViolaNormaObrigatoria: typeof VAL.condicao[number];
    qualidade: typeof VAL.qualidade[number] } | typeof NAO_PERGUNTADO;
  forcaDoVeredito: typeof VAL.forcaDoVeredito[number];
  evidencias: string[];
  justificativa: string;
}
export interface ArquivoRespostas { formato: string; lote: string; loteSha256: string; juiz: string; respostas: Resposta[] }

/** O que a derivação precisa saber de cada átomo, além da resposta (nada de braço). */
export interface ContextoDerivacao {
  tipo: TipoT3; citaRegra: boolean; temEsperado: boolean; specsDaTela: string[]; citaveis: string[];
  origemMedida: string | null;
  /** Só para `qualidade`: a classe do veredito já registrado (é sempre erro normativo). */
  classeRegistrada: string | null;
}
export interface Derivado {
  classe: "violacao-pagina" | "violacao-ds" | "violacao-origem-indeterminada" | "erro-factual" | "erro-normativo" | "observacao"
    | "observacao-norma-errada" | "evidencia-indisponivel" | "pendente";
  regraDaPolitica: string; spec: string | null; qualidadeDaSugestao: string | null; pendencias: string[];
  /**
   * Fundamentação do crédito de detecção (D-130): `norma` (obrigatória aplicável e violada), `mais-fraca` (R15),
   * `nenhuma` (Q1 a: cartão sem regra citada, fato de uma unidade); `null` sem crédito.
   */
  fundamentacao: "norma" | "mais-fraca" | "nenhuma" | null;
  /** Mesmo átomo na sensibilidade S5 (Q1 b: regra nula não credita). Igual à principal fora do caminho Q1. */
  s5: { classe: Derivado["classe"]; regraDaPolitica: string; spec: string | null };
}

/**
 * Esquema JSON do arquivo de respostas (o que se publica ao juiz). As condições cruzadas (pergunta feita ao
 * cartão, ids citáveis, coerência da sugestão) ficam em `validarResposta`, que a ingestão aplica depois do esquema.
 */
export const ESQUEMA_RESPOSTAS = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: FORMATO_RESPOSTAS,
  type: "object", additionalProperties: false,
  required: ["formato", "lote", "loteSha256", "juiz", "respostas"],
  properties: {
    formato: { const: FORMATO_RESPOSTAS },
    lote: { type: "string", pattern: "^lote-\\d{2}$" },
    loteSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    juiz: { type: "string", minLength: 3 },
    respostas: { type: "array", minItems: 1, items: {
      type: "object", additionalProperties: false,
      required: ["id", "verdadeFactual", "norma", "vinculo", "sugestao", "forcaDoVeredito", "evidencias", "justificativa"],
      properties: {
        id: { type: "string", pattern: "^T3-[0-9a-f]{10}$" },
        verdadeFactual: { enum: [...VAL.verdadeFactual, NAO_PERGUNTADO] },
        norma: { oneOf: [{ const: NAO_PERGUNTADO }, { type: "object", additionalProperties: false, required: ["id", "forca", "aplicabilidade", "violada"], properties: {
          id: { type: "string", pattern: "^(citada|nenhuma|wcag:\\d+\\.\\d+\\.\\d+|emag:\\d+\\.\\d+)$" }, forca: { enum: [...VAL.forca] },
          aplicabilidade: { enum: [...VAL.aplicabilidade] }, violada: { enum: [...VAL.violada] } } }] },
        vinculo: { oneOf: [{ enum: ["nenhum", "indeterminado", NAO_PERGUNTADO] }, { type: "object", additionalProperties: false, required: ["spec", "relacao"], properties: {
          spec: { type: "string", pattern: "^[ABP]-\\d{2}$" }, relacao: { enum: [...VAL.relacao] } } }] },
        sugestao: { oneOf: [{ const: NAO_PERGUNTADO }, { type: "object", additionalProperties: false, required: ["trataOFato", "especificaDoSujeito", "naoViolaNormaObrigatoria", "qualidade"],
          properties: { trataOFato: { enum: [...VAL.condicao] }, especificaDoSujeito: { enum: [...VAL.condicao] }, naoViolaNormaObrigatoria: { enum: [...VAL.condicao] },
            qualidade: { enum: [...VAL.qualidade] } } }] },
        forcaDoVeredito: { enum: [...VAL.forcaDoVeredito] },
        evidencias: { type: "array", minItems: 1, items: { type: "string" } },
        justificativa: { type: "string", minLength: 30 },
      } } },
  },
} as const;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const em = <T extends readonly string[]>(xs: T, v: unknown): v is T[number] => typeof v === "string" && (xs as readonly string[]).includes(v);

/** Sugestão exigida? (para `sugestao-se-erro-normativo`: só quando as respostas dão erro normativo). */
export function preClasse(r: Resposta, c: ContextoDerivacao): Derivado["classe"] {
  if (c.tipo === "qualidade") return "erro-normativo";
  if (r.verdadeFactual === "falsa") return "erro-factual";
  if (r.verdadeFactual === "indisponivel") return "evidencia-indisponivel";
  if (r.verdadeFactual !== "verdadeira" || r.norma === NAO_PERGUNTADO) return "pendente";
  const n = r.norma;
  // Q1 a: cartão sem regra citada, fato verdadeiro de um defeito da referência → credita a detecção (sem fundamentação).
  if (n.forca === "nenhuma") return !c.citaRegra && typeof r.vinculo === "object" ? "violacao-pagina" : "observacao";
  if (n.forca === "indeterminado") return "pendente";
  if (n.aplicabilidade === "incerta" || n.violada === "incerto") return "evidencia-indisponivel";
  if (n.aplicabilidade === "nao-aplica" || n.violada === "nao") return "erro-normativo";
  if (n.forca === "obrigatorio") return "violacao-pagina";
  // norma mais fraca (recomendado, boa prática, exemplo), aplicável e violada: R15 só com vínculo; senão R13.
  return typeof r.vinculo === "object" ? "violacao-pagina" : "erro-normativo";
}

/**
 * Classe pela política 1.2.0 a partir das respostas (derivação mecânica, §2):
 * fato primeiro (R1/R9); norma `nenhuma` → observação (R11b); aplicabilidade/violação incerta → evidência
 * indisponível (R13); não se aplica ou não violada → erro normativo (R11a), ou observação com norma errada se a
 * sugestão é válida (R11d); obrigatória aplicável e violada → violação; mais fraca aplicável e violada → R15 com
 * vínculo, senão erro normativo (R13). A origem da violação vem só da medida (P11); sem medida, a unidade da
 * referência é de origem página (§3) e o resto é `indeterminada (não medida)`.
 */
export function derivarClasse(r: Resposta, c: ContextoDerivacao): Derivado {
  const d = derivarPrincipal(r, c);
  // S5 (Q1 b): o crédito de detecção sem regra citada vira observação, sem crédito; o resto não muda.
  const s5 = d.regraDaPolitica === "Q1" ? { classe: "observacao" as const, regraDaPolitica: "R11b", spec: null } : { classe: d.classe, regraDaPolitica: d.regraDaPolitica, spec: d.spec };
  return { ...d, s5 };
}

function derivarPrincipal(r: Resposta, c: ContextoDerivacao): Omit<Derivado, "s5"> {
  const pend: string[] = [];
  const qualidade = r.sugestao === NAO_PERGUNTADO ? null : r.sugestao.qualidade;
  const spec = typeof r.vinculo === "object" ? r.vinculo.spec : null;
  if (r.vinculo === "indeterminado") pend.push("vínculo indeterminado");
  if (qualidade === "indeterminada") pend.push("qualidade da sugestão indeterminada (conta como erro normativo)");
  if (c.tipo === "qualidade") {
    return { classe: qualidade === "valida" ? "observacao-norma-errada" : "erro-normativo", regraDaPolitica: qualidade === "valida" ? "R11d" : "R11",
      spec: null, qualidadeDaSugestao: qualidade, pendencias: pend, fundamentacao: null };
  }
  const pre = preClasse(r, c);
  if (r.verdadeFactual === "indeterminado") pend.push("fato indeterminado");
  if (r.norma !== NAO_PERGUNTADO && r.norma.forca === "indeterminado") pend.push("força da norma indeterminada");
  const origem = (o: string | null) => (o === "pagina" || o === "pagina-copiando-exemplo-ds" ? "pagina" : o === "ds-entregue" ? "ds" : "indeterminada");
  switch (pre) {
    case "erro-factual": return { classe: pre, regraDaPolitica: "R1", spec: null, qualidadeDaSugestao: null, pendencias: pend, fundamentacao: null };
    case "evidencia-indisponivel": return { classe: pre, regraDaPolitica: r.verdadeFactual === "indisponivel" ? "R9" : "R13", spec: null, qualidadeDaSugestao: null, pendencias: pend, fundamentacao: null };
    case "pendente": return { classe: pre, regraDaPolitica: "pendente", spec: null, qualidadeDaSugestao: null, pendencias: pend, fundamentacao: null };
    case "observacao": return { classe: pre, regraDaPolitica: "R11b", spec, qualidadeDaSugestao: null, pendencias: pend, fundamentacao: null };
    case "erro-normativo": {
      const fraca = r.norma !== NAO_PERGUNTADO && r.norma.aplicabilidade === "aplica" && r.norma.violada === "sim";
      return { classe: qualidade === "valida" ? "observacao-norma-errada" : "erro-normativo", regraDaPolitica: qualidade === "valida" ? "R11d" : fraca ? "R13" : "R11",
        spec: null, qualidadeDaSugestao: qualidade, pendencias: pend, fundamentacao: null };
    }
    default: {
      const q1 = r.norma !== NAO_PERGUNTADO && r.norma.forca === "nenhuma";
      const r15 = !q1 && r.norma !== NAO_PERGUNTADO && r.norma.forca !== "obrigatorio";
      const o = c.origemMedida ? origem(c.origemMedida) : spec ? "pagina" : "indeterminada";
      const classe = o === "pagina" ? "violacao-pagina" : o === "ds" ? "violacao-ds" : "violacao-origem-indeterminada";
      // Origem DS: vínculo não credita (P3); a fundamentação só se registra quando há crédito.
      const credita = !!spec && classe !== "violacao-ds";
      return { classe, regraDaPolitica: classe === "violacao-ds" ? "R5" : q1 ? "Q1" : r15 ? "R15" : spec ? "R7" : "R2-classes", spec, qualidadeDaSugestao: null, pendencias: pend,
        fundamentacao: credita ? (q1 ? "nenhuma" : r15 ? "mais-fraca" : "norma") : null };
    }
  }
}

/** Valida uma resposta contra o esquema, as perguntas do átomo e os ids citáveis. Devolve a lista de erros (vazia = ok). */
export function validarResposta(x: unknown, c: ContextoDerivacao): string[] {
  const e: string[] = [];
  if (!isObj(x)) return ["resposta não é objeto"];
  const permitidos = ["id", "verdadeFactual", "norma", "vinculo", "sugestao", "forcaDoVeredito", "evidencias", "justificativa"];
  for (const k of Object.keys(x)) if (!permitidos.includes(k)) e.push(`campo desconhecido: ${k}`);
  for (const k of permitidos) if (!(k in x)) e.push(`campo ausente: ${k}`);
  if (e.length) return e;
  const perg = PERGUNTAS[c.tipo];
  const pede = (p: Pergunta) => perg.includes(p);
  // fato
  if (pede("fato")) { if (!em(VAL.verdadeFactual, x.verdadeFactual)) e.push(`verdadeFactual fora da lista: ${JSON.stringify(x.verdadeFactual)}`); }
  else if (x.verdadeFactual !== NAO_PERGUNTADO) e.push(`verdadeFactual não foi perguntado: use "${NAO_PERGUNTADO}"`);
  // norma
  if (pede("norma")) {
    const n = x.norma;
    if (!isObj(n)) e.push("norma deve ser objeto {id, forca, aplicabilidade, violada}");
    else {
      for (const k of Object.keys(n)) if (!["id", "forca", "aplicabilidade", "violada"].includes(k)) e.push(`norma: campo desconhecido ${k}`);
      if (!em(VAL.forca, n.forca)) e.push(`norma.forca fora da lista: ${JSON.stringify(n.forca)}`);
      if (!em(VAL.aplicabilidade, n.aplicabilidade)) e.push(`norma.aplicabilidade fora da lista: ${JSON.stringify(n.aplicabilidade)}`);
      if (!em(VAL.violada, n.violada)) e.push(`norma.violada fora da lista: ${JSON.stringify(n.violada)}`);
      if (c.citaRegra) { if (n.id !== "citada") e.push(`norma.id: o cartão cita regra, use "citada" (é ela que se julga)`); if (n.forca === "nenhuma") e.push("norma.forca \"nenhuma\" só vale para cartão sem regra citada"); }
      else if (!(n.id === "nenhuma" || (typeof n.id === "string" && NORMA_PUBLICA.test(n.id)))) e.push(`norma.id: cartão sem regra citada, use "nenhuma" ou um id público (wcag:x.y.z, emag:x.y): ${JSON.stringify(n.id)}`);
      if (!c.citaRegra && (n.id === "nenhuma") !== (n.forca === "nenhuma")) e.push("norma.id \"nenhuma\" exige norma.forca \"nenhuma\" (e vice-versa)");
    }
  } else if (x.norma !== NAO_PERGUNTADO) e.push(`norma não foi perguntada: use "${NAO_PERGUNTADO}"`);
  // vínculo
  if (pede("vinculo")) {
    const v = x.vinculo;
    if (v === "nenhum" || v === "indeterminado") { /* ok */ }
    else if (!isObj(v)) e.push(`vinculo: objeto {spec, relacao}, "nenhum" ou "indeterminado": ${JSON.stringify(v)}`);
    else {
      for (const k of Object.keys(v)) if (!["spec", "relacao"].includes(k)) e.push(`vinculo: campo desconhecido ${k}`);
      if (!c.specsDaTela.includes(v.spec as string)) e.push(`vinculo.spec não é defeito da referência desta tela: ${JSON.stringify(v.spec)}`);
      if (!em(VAL.relacao, v.relacao)) e.push(`vinculo.relacao fora da lista: ${JSON.stringify(v.relacao)}`);
    }
  } else if (x.vinculo !== NAO_PERGUNTADO) e.push(`vinculo não foi perguntado: use "${NAO_PERGUNTADO}"`);
  // sugestão
  const s = x.sugestao;
  if (s !== NAO_PERGUNTADO) {
    if (!isObj(s)) e.push(`sugestao: objeto {trataOFato, especificaDoSujeito, naoViolaNormaObrigatoria, qualidade} ou "${NAO_PERGUNTADO}"`);
    else {
      for (const k of Object.keys(s)) if (!["trataOFato", "especificaDoSujeito", "naoViolaNormaObrigatoria", "qualidade"].includes(k)) e.push(`sugestao: campo desconhecido ${k}`);
      const conds = [s.trataOFato, s.especificaDoSujeito, s.naoViolaNormaObrigatoria];
      for (const [k, v] of [["trataOFato", s.trataOFato], ["especificaDoSujeito", s.especificaDoSujeito], ["naoViolaNormaObrigatoria", s.naoViolaNormaObrigatoria]] as const)
        if (!em(VAL.condicao, v)) e.push(`sugestao.${k} fora da lista: ${JSON.stringify(v)}`);
      if (!em(VAL.qualidade, s.qualidade)) e.push(`sugestao.qualidade fora da lista: ${JSON.stringify(s.qualidade)}`);
      else if (s.qualidade === "ausente") { if (c.temEsperado) e.push("sugestao.qualidade \"ausente\": o cartão tem texto esperado"); }
      else if (!c.temEsperado) e.push("o cartão não tem texto esperado: sugestao.qualidade deve ser \"ausente\"");
      else if (s.qualidade === "valida" && !conds.every(v => v === "sim")) e.push("\"valida\" exige as três condições = \"sim\"");
      else if (s.qualidade !== "valida" && conds.every(v => v === "sim")) e.push("as três condições = \"sim\": a qualidade é \"valida\"");
      else if (s.qualidade === "generica" && s.especificaDoSujeito !== "nao") e.push("\"generica\" exige especificaDoSujeito = \"nao\"");
      else if (s.qualidade === "invalida" && !conds.includes("nao")) e.push("\"invalida\" exige ao menos uma condição = \"nao\"");
      else if (s.qualidade === "indeterminada" && !conds.includes("incerto")) e.push("\"indeterminada\" exige ao menos uma condição = \"incerto\"");
    }
  }
  if (pede("sugestao") && s === NAO_PERGUNTADO) e.push("sugestao é obrigatória neste cartão");
  // força do veredito, evidências, justificativa
  if (!em(VAL.forcaDoVeredito, x.forcaDoVeredito)) e.push(`forcaDoVeredito fora da lista: ${JSON.stringify(x.forcaDoVeredito)}`);
  if (!Array.isArray(x.evidencias) || !x.evidencias.length) e.push("evidencias: lista não vazia de ids do cartão");
  else for (const id of x.evidencias) if (!c.citaveis.includes(id as string)) e.push(`evidencias: id inexistente no cartão: ${JSON.stringify(id)}`);
  if (typeof x.justificativa !== "string" || x.justificativa.trim().length < 30) e.push("justificativa: texto com pelo menos 30 caracteres");
  else if (Array.isArray(x.evidencias) && !x.evidencias.some(id => typeof id === "string" && x.justificativa!.toString().includes(id))) e.push("justificativa deve citar pelo menos um dos ids listados em evidencias");
  if (e.length) return e;
  // sugestão condicional: exigida se as respostas dão erro normativo
  if (pede("sugestao-se-erro-normativo") && s === NAO_PERGUNTADO && preClasse(x as unknown as Resposta, c) === "erro-normativo")
    e.push("as respostas dão erro normativo: responda sugestao (P13 / R11d)");
  return e;
}
