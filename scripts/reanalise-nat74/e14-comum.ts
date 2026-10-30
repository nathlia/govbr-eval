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
/**
 * [1b, plano de revisão 19/10] Primeira passada de campanha nova (e14-campanha.ts) a partir da 1.1.0: manifesto e
 * respostas com formato próprio. A ingestão escolhe o esquema e a validação pelo formato do manifesto; a 1.0.0 (ensaio
 * 20261019T1) e a fila T3 retrospectiva seguem o esquema histórico, sem mudança.
 */
export const FORMATO_MANIFESTO_CAMPANHA_1_1 = "nat78-primeira-passada-manifesto-1.1.0";
export const FORMATO_RESPOSTAS_CAMPANHA_1_1 = "nat78-primeira-passada-respostas-1.1.0";
/**
 * [M/N, plano de revisão 19/10] 1.2.0: força da base literal já posta no vocabulário do juiz (`forcaNoVocabulario`,
 * tabela fixa em e14-fila.ts) e campo fechado `estadoAlcancado`. Passadas 1.1.0 (ensaio 20261019T3)
 * continuam ingeridas pelo esquema 1.1.0, sem mudança.
 */
export const FORMATO_MANIFESTO_CAMPANHA = "nat78-primeira-passada-manifesto-1.2.0";
export const FORMATO_RESPOSTAS_CAMPANHA = "nat78-primeira-passada-respostas-1.2.0";
/**
 * [D-156] 1.3.0: o cartão pode trazer `referencias` (até 2, as referências secundárias do achado: `REF1`, `REF2`) e a
 * resposta ganha o campo `referencias` (um julgamento de norma por referência). Política do juiz 1.3.0: as referências
 * só contam quando a primária cai por citação, nunca por fato. Passadas 1.2.0 seguem o esquema 1.2.0, sem mudança.
 */
export const FORMATO_MANIFESTO_CAMPANHA_1_3 = "nat78-primeira-passada-manifesto-1.3.0";
export const FORMATO_RESPOSTAS_CAMPANHA_1_3 = "nat78-primeira-passada-respostas-1.3.0";
/** Ids das referências secundárias no cartão cego (na ordem do achado). */
export const IDS_REFERENCIA = ["REF1", "REF2"] as const;
/** [N] O juiz refez a receita do cartão: ela chega ao estado que ele descreve, ou não (R10: julga-se só no estado da receita). */
export const ESTADO_ALCANCADO = ["receita", "nao-alcancado"] as const;
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
  /** `forcaNoVocabulario` só na campanha nova 1.2.0 (achado M): a força declarada já no vocabulário de `norma.forca`, ou null (sem correspondência). */
  regrasDaBase?: { titulo: string; texto: string; forcaDeclarada: string; forcaNoVocabulario?: string | null }[];
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
  /**
   * [D-156, 1.3.0] Referências secundárias do achado (`references`, até 2), na ordem dele. Só existe quando o achado as
   * traz e a passada foi preparada na política 1.3.0: cartão sem referência fica exatamente como antes.
   */
  referencias?: { id: typeof IDS_REFERENCIA[number]; regra: string | null; norma: NormaVista | null }[];
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
  /** `aplicabilidade`/`violada` = `nao-perguntado` só na campanha nova (1.1.0), e só com `id: "nenhuma"` (norma neutra). */
  norma: { id: string; forca: typeof VAL.forca[number]; aplicabilidade: typeof VAL.aplicabilidade[number] | typeof NAO_PERGUNTADO;
    violada: typeof VAL.violada[number] | typeof NAO_PERGUNTADO } | typeof NAO_PERGUNTADO;
  vinculo: { spec: string; relacao: typeof VAL.relacao[number] } | "nenhum" | "indeterminado" | typeof NAO_PERGUNTADO;
  sugestao: { trataOFato: typeof VAL.condicao[number]; especificaDoSujeito: typeof VAL.condicao[number]; naoViolaNormaObrigatoria: typeof VAL.condicao[number];
    qualidade: typeof VAL.qualidade[number] } | typeof NAO_PERGUNTADO;
  forcaDoVeredito: typeof VAL.forcaDoVeredito[number];
  evidencias: string[];
  justificativa: string;
  /** Só campanha nova 1.2.0 (achado N). */
  estadoAlcancado?: typeof ESTADO_ALCANCADO[number];
  /**
   * [D-156, 1.3.0] Só em cartão com `referencias`: um julgamento de norma por referência (mesmo vocabulário de `norma`),
   * ou `nao-perguntado`. Obrigatório (lista) quando a primária cai por citação (fato verdadeiro + erro normativo).
   */
  referencias?: ReferenciaJulgada[] | typeof NAO_PERGUNTADO;
}
export interface ReferenciaJulgada {
  id: typeof IDS_REFERENCIA[number];
  forca: typeof VAL.forca[number];
  aplicabilidade: typeof VAL.aplicabilidade[number] | typeof NAO_PERGUNTADO;
  violada: typeof VAL.violada[number] | typeof NAO_PERGUNTADO;
}
export interface ArquivoRespostas { formato: string; lote: string; loteSha256: string; juiz: string; respostas: Resposta[] }

/** O que a derivação precisa saber de cada átomo, além da resposta (nada de braço). */
export interface ContextoDerivacao {
  tipo: TipoT3; citaRegra: boolean; temEsperado: boolean; specsDaTela: string[]; citaveis: string[];
  origemMedida: string | null;
  /** Só para `qualidade`: a classe do veredito já registrado (é sempre erro normativo). */
  classeRegistrada: string | null;
  /**
   * [M, campanha 1.2.0] Forças da regra citada já no vocabulário (`forcaNoVocabulario` de cada regra da base). Com todas
   * = `nenhuma` (a base só permite), `norma.forca: "nenhuma"` é aceita também para regra citada, e deriva erro normativo
   * (R11 a; R11d com sugestão válida). Ausente no histórico e na 1.1.0.
   */
  forcasDaCitada?: (string | null)[];
  /** [D-156] Ids das referências secundárias do cartão (`REF1`…); ausente em cartão sem referência. */
  referencias?: string[];
  /** [D-156, proveniência] Regra pública de cada referência do cartão, como o juiz a viu (`referencias[k].regra`). */
  regrasDasReferencias?: Record<string, string | null>;
  /** [D-156, proveniência] A regra que o cartão cita (a principal, `alegacao.regra`), só em cartão com referências. */
  regraCitada?: string | null;
  /**
   * [D-156] Política do juiz. Obrigatória em cartão com referências (`derivarClasse` para se faltar: nenhum caminho decide
   * a política por omissão). `1.3.0`: referência julgada aplicável e violada resgata a citação que caiu. `1.2.0`: as
   * referências são ignoradas (histórico byte a byte).
   */
  politica?: "1.2.0" | "1.3.0";
}
/**
 * [D-156, proveniência] Quando uma referência secundária deu a classe: a regra originalmente citada e o julgamento dela
 * (que caiu), e — em campos próprios — a referência efetivamente usada (id no cartão, regra pública, força, aplicabilidade
 * e violação julgadas DELA). Nada aqui se confunde com a primária.
 */
export interface CitacaoPorReferencia {
  regraCitada: string | null;
  primaria: { forca: string; aplicabilidade: string; violada: string };
  referencia: { id: typeof IDS_REFERENCIA[number]; regra: string | null; forca: string; aplicabilidade: string; violada: string };
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
  /**
   * [D-156, 1.3.0] Só quando a primária caiu por citação e uma referência secundária, julgada aplicável e violada, deu a
   * classe: o id dela (`REF1`/`REF2`). Ausente em todo outro caso (cartão sem referência fica como antes).
   */
  citacaoPor?: typeof IDS_REFERENCIA[number];
  /** [D-156] Proveniência do resgate (só junto de `citacaoPor`): regra citada que caiu × referência usada. */
  citacao?: CitacaoPorReferencia;
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

/**
 * [1b, achado K1] Esquema da campanha nova (1.1.0): igual ao histórico, com formato próprio e com `nao-perguntado`
 * admitido em `norma.aplicabilidade`/`norma.violada` — o valor neutro de `id: "nenhuma"` (não há norma a aplicar). A
 * exigência cruzada (neutro ⇔ `nenhuma`) fica em `validarResposta(…, { normaNeutra: true })`. O histórico não muda.
 */
function esquemaCampanha(formato: string, estado: boolean) {
  const e = JSON.parse(JSON.stringify(ESQUEMA_RESPOSTAS)) as {
    title: string; properties: { formato: { const: string }; respostas: { items: { required: string[]; properties: Record<string, unknown> & { norma: { oneOf: [unknown, { properties: Record<string, { enum: string[] }> }] } };
    } } } };
  e.title = formato;
  e.properties.formato.const = formato;
  const it = e.properties.respostas.items;
  const norma = it.properties.norma.oneOf[1] as { properties: Record<string, { enum: string[] }>; allOf?: unknown[] };
  const n = norma.properties;
  n.aplicabilidade.enum = [...VAL.aplicabilidade, NAO_PERGUNTADO];
  n.violada.enum = [...VAL.violada, NAO_PERGUNTADO];
  // [ensaio-trio-real-02] O neutro só com `forca: "nenhuma"` (e sempre com ela), já no esquema: o juiz que valida o próprio
  // arquivo pega o erro antes da ingestão. É condição necessária da regra de validarResposta, que continua a decidir.
  const np = { const: NAO_PERGUNTADO }, ambos = (s: unknown) => ({ properties: { aplicabilidade: s, violada: s } });
  if (estado) {
    norma.allOf = [{ if: { properties: { forca: { const: "nenhuma" } }, required: ["forca"] }, then: ambos(np), else: ambos({ not: np }) }];
    // [N, 1.2.0] estadoAlcancado fechado. A condição cruzada ("nao-alcancado" ⇒ fato indisponivel) fica em validarResposta.
    it.required.push("estadoAlcancado");
    it.properties.estadoAlcancado = { enum: [...ESTADO_ALCANCADO] };
  }
  return e;
}
/** Esquema 1.1.0 (passadas já preparadas nessa versão, ex.: ensaio 20261019T3): igual ao que foi publicado. */
export const ESQUEMA_RESPOSTAS_CAMPANHA_1_1 = esquemaCampanha(FORMATO_RESPOSTAS_CAMPANHA_1_1, false);
/** Esquema 1.2.0 (achado N): 1.1.0 + `estadoAlcancado`. */
export const ESQUEMA_RESPOSTAS_CAMPANHA = esquemaCampanha(FORMATO_RESPOSTAS_CAMPANHA, true);
/**
 * [D-156] Esquema 1.3.0: 1.2.0 + `referencias` opcional (só em cartão com referências; a exigência cruzada — lista
 * quando a primária cai por citação, um item por referência do cartão — fica em `validarResposta(…, { v13: true })`).
 */
export const ESQUEMA_RESPOSTAS_CAMPANHA_1_3 = (() => {
  const e = esquemaCampanha(FORMATO_RESPOSTAS_CAMPANHA_1_3, true) as unknown as { properties: { respostas: { items: { properties: Record<string, unknown> } } } };
  const np = { const: NAO_PERGUNTADO };
  e.properties.respostas.items.properties.referencias = { oneOf: [np, { type: "array", minItems: 1, maxItems: IDS_REFERENCIA.length, items: {
    type: "object", additionalProperties: false, required: ["id", "forca", "aplicabilidade", "violada"], properties: {
      id: { enum: [...IDS_REFERENCIA] }, forca: { enum: [...VAL.forca] },
      aplicabilidade: { enum: [...VAL.aplicabilidade, NAO_PERGUNTADO] }, violada: { enum: [...VAL.violada, NAO_PERGUNTADO] } },
    if: { properties: { forca: { const: "nenhuma" } }, required: ["forca"] },
    then: { properties: { aplicabilidade: np, violada: np } }, else: { properties: { aplicabilidade: { not: np }, violada: { not: np } } } } }] };
  return e;
})();

const isObj =(x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const em = <T extends readonly string[]>(xs: T, v: unknown): v is T[number] => typeof v === "string" && (xs as readonly string[]).includes(v);

/** [M, 1.2.0] A regra citada só permite: toda regra da base dela tem `forcaNoVocabulario: "nenhuma"`. */
export const soPermite = (c: ContextoDerivacao): boolean => c.citaRegra && !!c.forcasDaCitada?.length && c.forcasDaCitada.every(f => f === "nenhuma");

/** Sugestão exigida? (para `sugestao-se-erro-normativo`: só quando as respostas dão erro normativo). */
export function preClasse(r: Resposta, c: ContextoDerivacao): Derivado["classe"] {
  if (c.tipo === "qualidade") return "erro-normativo";
  if (r.verdadeFactual === "falsa") return "erro-factual";
  if (r.verdadeFactual === "indisponivel") return "evidencia-indisponivel";
  if (r.verdadeFactual !== "verdadeira" || r.norma === NAO_PERGUNTADO) return "pendente";
  const n = r.norma;
  // Q1 a: cartão sem regra citada, fato verdadeiro de um defeito da referência → credita a detecção (sem fundamentação).
  // [M, 1.2.0; R11 a] Regra citada que a base só permite (todas as forças no vocabulário = `nenhuma`): o cartão alega
  // violação de uma obrigação que não existe → erro normativo (com sugestão válida, R11d). Só cartões 1.2.0 trazem
  // `forcasDaCitada`; histórico e 1.1.0 não passam aqui.
  if (n.forca === "nenhuma" && soPermite(c)) return "erro-normativo";
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
  // [D-156] Cartão com referências: a política do juiz tem de vir declarada por quem deriva (manifesto/passada), nunca por
  // omissão — senão uma revisão podia desfazer um resgate válido, ou criar um sob a 1.2.0.
  if (c.referencias?.length && c.politica !== "1.2.0" && c.politica !== "1.3.0")
    throw new Error("derivarClasse: cartão com referências sem a política do juiz declarada (1.2.0 ou 1.3.0)");
  const d = resgatePorReferencia(r, c) ?? derivarPrincipal(r, c);
  // S5 (Q1 b): o crédito de detecção sem regra citada vira observação, sem crédito; o resto não muda.
  const s5 = d.regraDaPolitica === "Q1" ? { classe: "observacao" as const, regraDaPolitica: "R11b", spec: null } : { classe: d.classe, regraDaPolitica: d.regraDaPolitica, spec: d.spec };
  return { ...d, s5 };
}

/** A primária caiu por citação: fato verdadeiro e as respostas de norma dão erro normativo (R11a/R11d/R13). */
export const caiPorCitacao = (r: Resposta, c: ContextoDerivacao): boolean =>
  c.tipo !== "qualidade" && r.verdadeFactual === "verdadeira" && preClasse(r, c) === "erro-normativo";

/**
 * [D-156, política 1.3.0] Referência secundária. Só quando o cartão tem referências, a política é a 1.3.0 e a primária
 * caiu por citação (nunca por fato: fato falso, indisponível ou indeterminado nunca chega aqui). As referências são lidas
 * na ordem do achado; a primeira cuja norma, julgada como se fosse a citada, dá violação (obrigatória aplicável e violada;
 * ou mais fraca aplicável e violada com vínculo, R15) decide a classe — a mesma derivação da primária correta — e o
 * `citacaoPor` registra que a citação veio dela. Qualquer outra resposta (não se aplica, não violada, incerta,
 * indeterminada, só permite) deixa a classe da primária. `null` = sem resgate (a derivação da primária vale).
 */
function resgatePorReferencia(r: Resposta, c: ContextoDerivacao): Omit<Derivado, "s5"> | null {
  if (!c.referencias?.length || c.politica !== "1.3.0" || !Array.isArray(r.referencias) || !caiPorCitacao(r, c)) return null;
  const prim = r.norma as Exclude<Resposta["norma"], typeof NAO_PERGUNTADO>;
  for (const id of c.referencias) {
    const ref = r.referencias.find(x => x.id === id);
    if (!ref || ref.forca === "nenhuma" || ref.forca === "indeterminado") continue;
    const rr: Resposta = { ...r, norma: { id: "citada", forca: ref.forca, aplicabilidade: ref.aplicabilidade, violada: ref.violada } as Resposta["norma"] };
    const cc: ContextoDerivacao = { ...c, forcasDaCitada: undefined };
    if (preClasse(rr, cc) !== "violacao-pagina") continue;
    const rid = id as typeof IDS_REFERENCIA[number];
    return { ...derivarPrincipal(rr, cc), citacaoPor: rid, citacao: {
      regraCitada: c.regraCitada ?? null, primaria: { forca: prim.forca, aplicabilidade: prim.aplicabilidade, violada: prim.violada },
      referencia: { id: rid, regra: c.regrasDasReferencias?.[id] ?? null, forca: ref.forca, aplicabilidade: ref.aplicabilidade, violada: ref.violada } } };
  }
  return null;
}

function derivarPrincipal(r: Resposta, c: ContextoDerivacao): Omit<Derivado, "s5"> {
  const pend: string[] = [];
  const qualidade = r.sugestao === NAO_PERGUNTADO ? null : r.sugestao.qualidade;
  const spec = typeof r.vinculo === "object" ? r.vinculo.spec : null;
  if (r.vinculo === "indeterminado") pend.push("vínculo indeterminado");
  // [revisão independente L3] qualidade indeterminada → pendente (R9), como já se faz na linha de base (politica.ts).
  if (qualidade === "indeterminada") pend.push("qualidade da sugestão indeterminada: pendente (R9)");
  if (c.tipo === "qualidade") {
    if (qualidade === "indeterminada") return { classe: "pendente", regraDaPolitica: "R9", spec: null, qualidadeDaSugestao: qualidade, pendencias: pend, fundamentacao: null };
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
      if (qualidade === "indeterminada") return { classe: "pendente", regraDaPolitica: "R9", spec: null, qualidadeDaSugestao: qualidade, pendencias: pend, fundamentacao: null };
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
export function validarResposta(x: unknown, c: ContextoDerivacao, o: { normaNeutra?: boolean; v12?: boolean; v13?: boolean } = {}): string[] {
  const e: string[] = [];
  if (!isObj(x)) return ["resposta não é objeto"];
  // [D-156] `referencias` só é campo da resposta na 1.3.0 e só em cartão que traz referências.
  const comRef = !!o.v13 && !!c.referencias?.length;
  const permitidos = ["id", "verdadeFactual", "norma", "vinculo", "sugestao", "forcaDoVeredito", "evidencias", "justificativa", ...(o.v12 ? ["estadoAlcancado"] : []), ...(comRef ? ["referencias"] : [])];
  for (const k of Object.keys(x)) if (!permitidos.includes(k)) e.push(`campo desconhecido: ${k}`);
  for (const k of permitidos) if (!(k in x)) e.push(`campo ausente: ${k}`);
  if (e.length) return e;
  // [N, 1.2.0] estado: a receita alcança o estado do cartão, ou não (= evidência indisponível, R9/R10). Julga-se só no
  // estado da receita (R10); o que o juiz viu noutro estado pode ir à justificativa, mas não muda resposta.
  if (o.v12) {
    if (!em(ESTADO_ALCANCADO, x.estadoAlcancado)) e.push(`estadoAlcancado fora da lista: ${JSON.stringify(x.estadoAlcancado)}`);
    if (x.estadoAlcancado === "nao-alcancado" && x.verdadeFactual !== "indisponivel") e.push("estadoAlcancado \"nao-alcancado\" exige verdadeFactual \"indisponivel\" (estado não alcançado: evidência indisponível, R9/R10)");
  }
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
      // [1b, K1] Campanha nova: `id: "nenhuma"` ⇔ aplicabilidade e violada = "nao-perguntado" (valor neutro; a classe sai
      // só de fato + vínculo, linhas Q1/R11b). Sem a opção (fila T3 histórica), nada muda.
      // [M, 1.2.0] Regra citada cuja base só PERMITE (todas as forças no vocabulário = `nenhuma`): `forca: "nenhuma"` aceita,
      // com o mesmo neutro de K1 (não há obrigação a aplicar). A derivação não muda (preClasse já trata `nenhuma` com regra).
      const sp = !!o.v12 && soPermite(c);
      const neutra = o.normaNeutra && ((!c.citaRegra && n.id === "nenhuma") || (sp && n.forca === "nenhuma"));
      if (neutra) {
        if (n.aplicabilidade !== NAO_PERGUNTADO || n.violada !== NAO_PERGUNTADO) e.push(`norma ${c.citaRegra ? "com forca \"nenhuma\"" : "id \"nenhuma\""}: aplicabilidade e violada = "${NAO_PERGUNTADO}" (não há norma a aplicar)`);
      } else {
        if (!em(VAL.aplicabilidade, n.aplicabilidade)) e.push(`norma.aplicabilidade fora da lista: ${JSON.stringify(n.aplicabilidade)}`);
        if (!em(VAL.violada, n.violada)) e.push(`norma.violada fora da lista: ${JSON.stringify(n.violada)}`);
      }
      if (c.citaRegra) { if (n.id !== "citada") e.push(`norma.id: o cartão cita regra, use "citada" (é ela que se julga)`); if (n.forca === "nenhuma" && !sp) e.push(!o.v12 ? "norma.forca \"nenhuma\" só vale para cartão sem regra citada" : "norma.forca \"nenhuma\" com regra citada só quando toda força da base da regra corresponde a \"nenhuma\" (forcaNoVocabulario)"); }
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
  // [D-156] referências: uma resposta por referência do cartão, na lista; exigida quando a primária cai por citação.
  if (comRef) {
    const rs = x.referencias;
    if (rs === NAO_PERGUNTADO) {
      if (caiPorCitacao(x as unknown as Resposta, c)) e.push("fato verdadeiro e a norma citada não vale (erro normativo): julgue cada referência em `referencias` (D-156)");
    } else if (!Array.isArray(rs)) e.push(`referencias: lista de {id, forca, aplicabilidade, violada} ou "${NAO_PERGUNTADO}"`);
    else {
      const ids = rs.map(r => (isObj(r) ? r.id : null));
      for (const id of c.referencias!) if (ids.filter(i => i === id).length !== 1) e.push(`referencias: julgue ${id} exatamente uma vez`);
      for (const id of ids) if (!c.referencias!.includes(id as string)) e.push(`referencias: id que o cartão não traz: ${JSON.stringify(id)}`);
      for (const r of rs) {
        if (!isObj(r)) { e.push("referencias: item não é objeto"); continue; }
        if (!em(VAL.forca, r.forca)) e.push(`referencias.${r.id}.forca fora da lista: ${JSON.stringify(r.forca)}`);
        const neutra = r.forca === "nenhuma";
        for (const [k, lista] of [["aplicabilidade", VAL.aplicabilidade], ["violada", VAL.violada]] as const) {
          if (neutra ? r[k] !== NAO_PERGUNTADO : !em(lista, r[k])) e.push(`referencias.${r.id}.${k}: ${neutra ? `"${NAO_PERGUNTADO}" com forca "nenhuma"` : "fora da lista"}`);
        }
      }
    }
  }
  return e;
}
