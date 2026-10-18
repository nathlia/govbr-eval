/**
 * Reviewed semantic scoring, independent of the legacy citation matcher.
 * An anchor/rule overlap is a suggestion, never an acceptance decision.
 * Input packages are immutable; author decisions are separate, context-bound data.
 */
import { createHash } from "node:crypto";
import type { FlowAgentResults, FlowFindingState, FlowViewport } from "../types";
import type { Resolution } from "./anchors";
import type { FlowUnit } from "./units-flow";
import { NAO_IMPLEMENTADO, type PredicateResult } from "./acceptance-predicates";
import { FLOW_SCORING_LEGACY_VERSIONS, FLOW_SCORING_VERSION } from "./instrument";
import {
  DETERMINISTIC_FINDING_CONTRACT, normalizeFinding, resolveEvidence, reviewableFindings,
  type EvidenceIndex, type FindingContract, type NormalizedFinding, type ResolvedEvidence,
} from "./flow-contract";

export const SEMANTIC_SCORING_VERSION = FLOW_SCORING_VERSION;
/**
 * Versões anteriores que continuam pontuáveis pelo caminho delas (NAT-72): o pacote e as decisões
 * dizem a versão, e o resultado sai com ela. Nenhum contrato novo (vínculo de revisão) vale ali.
 */
export const SEMANTIC_LEGACY_VERSIONS = FLOW_SCORING_LEGACY_VERSIONS;
export const versaoPontuavel = (version: unknown): boolean =>
  version === SEMANTIC_SCORING_VERSION || (typeof version === "string" && SEMANTIC_LEGACY_VERSIONS.includes(version));

/** Code, vocabulary and contract that decide what a package means; a different fingerprint refuses it. */
export const SCORER_FILES = ["scripts/semantic-flow.ts", "scripts/semantic-flow-cli.ts", "scripts/flow-contract.ts",
  "scripts/evidence-integrity.ts", "scripts/acceptance-predicates.ts",
  "scripts/units-flow.ts", "scripts/units.ts", "scripts/anchors.ts", "scripts/instrument.ts", "instrument.json",
  "types.ts", "checker-aliases.json", "kb-aliases.json", "scripts/kb-aliases.ts", "kb-aliases-v2.json"];

/** Stable across object insertion order; array order is retained deliberately. */
export function canonical(value: unknown): string {
  if (value === undefined) throw new Error("Undefined cannot be hashed");
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => compare(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}
export function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const unique = (xs: string[]): string[] => [...new Set(xs)].sort(compare);
const requireThat: (ok: unknown, message: string) => asserts ok = (ok, message) => {
  if (!ok) throw new Error(message);
};

/**
 * A scene is one declared observation opportunity: the reference setup at one planned window.
 * Units and cards are resolved inside a scene, and credit never crosses scenes: two scenes can
 * share an element key while the defect exists in only one of them.
 */
export interface SemanticScene {
  id: string;
  viewport: FlowViewport;
  /** Specs this window exists to measure; the default scene holds the specs without a window. */
  specIds: string[];
  resolutionHash: string;
  /**
   * Só quando o setup navega (D-60): a cena é um SEGMENTO da janela, capturado na última parada dele.
   * Ausente sem navegação — e aí a cena é a janela inteira, no fim do setup, como sempre foi.
   */
  segmento?: CenaSegmento;
}
/** Onde, na sequência de setup, uma cena por segmento foi capturada. */
export interface CenaSegmento { numero: number; estado: string; path: string | null; estados: string[] }
export interface SemanticUnit extends FlowUnit {
  id: string;
  /** Cena CANÔNICA: onde a unidade foi construída e onde a ancoragem estrita vale (uma unidade, um denominador). */
  scene: string;
  acceptance: PredicateResult;
  /**
   * Domínio de aplicabilidade PROVADO (flow-semantic-1.8.0): cenas do plano em que o defeito desta
   * unidade foi MEDIDO, cada uma com referência, build e hash da evidência. Ausente = só a cena
   * canônica (o comportamento de sempre). Nunca cria unidade por cena: o crédito continua sendo um.
   */
  domain?: DominioCena[];
}
/**
 * Uma cena do domínio provado de uma unidade (flow-semantic-1.8.0).
 *
 * `kind` é o predicado PRÓPRIO do defeito naquela cena, e decide que vínculo atravessa para cá:
 * - `ausencia-global`: falta uma parte da página; só a relação `ausencia-global`, com sujeito no
 *   documento ou num ancestral (ou o próprio) do participante de página MEDIDO nesta cena;
 * - `elemento`: o defeito é propriedade de um elemento; só `participante-relacionado`, com sujeito igual
 *   ou dentro de um participante MEDIDO nesta cena e evidência citando a chave dele;
 * - `documento`: propriedade do DOCUMENTO medida num elemento dele (o `<title>`, o esboço de títulos);
 *   como `elemento`, e o sujeito pode também ser o próprio documento (`""`) — nunca `body`, um contêiner
 *   ou um irmão qualquer.
 * `participants` são as chaves resolvidas NESTA cena: uma chave nunca é transportada de uma rota a outra.
 */
export interface DominioCena {
  scene: string;
  /** Paradas desta cena em que o defeito foi medido (subconjunto das paradas do segmento). */
  states: string[];
  kind: "ausencia-global" | "elemento" | "documento";
  /** Rótulo do predicado medido (ex.: `sem-salto-para-conteudo`, `titulo-inadequado`). */
  predicate: string;
  participants: string[];
  /** sha256 da referência e do manifesto do site (build) em que a medida foi feita. */
  reference: string;
  build: string;
  evidence: { source: string; sha256: string }[];
}
export const TIPOS_DOMINIO = ["ausencia-global", "elemento", "documento"] as const;
/** Domínio provado existe de flow-semantic-1.8.0 em diante (semver); antes, o crédito nunca atravessa cena. */
export const aceitaDominio = (version: string): boolean => {
  const m = /^flow-semantic-(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return false;
  const [ma, mi] = [Number(m[1]), Number(m[2])];
  return ma > 1 || (ma === 1 && mi >= 8);
};
/**
 * Domínio AMARRADO (flow-semantic-1.8.1, revisão Codex da NAT-91). Em 1.8.0 o domínio provado não
 * prendia (a) a alegação à parada efetivamente medida — `sempre` no vínculo bastava, mesmo com a cena
 * capturada numa parada que o domínio não comprova — nem (b) a referência do domínio à do pacote.
 * De 1.8.1 em diante:
 * - a referência de cada entrada é `context.referenceHash` do pacote (a identidade CANÔNICA: digest
 *   do gabarito analisado, a mesma que entra no id de todo cartão). O sha256 dos BYTES do arquivo
 *   (`provenance.reference.sha256`, quando existe) é proveniência: diz de que arquivo o gabarito saiu,
 *   não é a identidade que o scorer amarra;
 * - toda cena do domínio é cena por segmento (traz a parada em que foi capturada), e um vínculo de
 *   uma unidade com domínio — na cena canônica ou fora dela — só passa se a parada da CAPTURA dessa
 *   cena (`segmento.estado`, a única que o cartão identifica) está entre as paradas comprovadas
 *   (`states`) da entrada. `state: "sempre"` no vínculo nunca substitui essa prova;
 * - `documento` não é classe genérica de "defeito do documento": só título (`<title>`) e esboço de
 *   títulos (`h1`–`h6`) medidos, e a evidência com hash nomeia o predicado específico.
 * Pacotes 1.8.0 seguem pontuáveis pelo caminho deles (legado), byte a byte.
 */
export const aceitaDominioAmarrado = (version: string): boolean => {
  const m = /^flow-semantic-(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return false;
  const [ma, mi, pa] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return ma > 1 || (ma === 1 && (mi > 8 || (mi === 8 && pa >= 1)));
};
/**
 * Parada provada em TODO crédito (flow-semantic-1.8.2, achado Codex na NAT-91, comentário 74577dd9). Em 1.8.1
 * `paradaComprovada` só valia dentro de `validateLinks`: o caminho comum — sujeito ancorado exatamente na cena
 * canônica, `unitIds`, sem `links` — creditava a unidade com domínio sem conferir a parada (cena canônica
 * capturada em `after`, domínio provando só `before`, `state: "sempre"` → crédito). De 1.8.2 em diante, toda
 * atribuição de crédito a uma unidade que declara domínio — ancoragem direta ou vínculo, decisão manual ou
 * automática, cartão de braço ou de linha de base — exige que a parada da captura da cena em que o sujeito
 * chega à unidade esteja entre as paradas comprovadas da entrada daquela cena.
 * Escolha documentada: o PACOTE continua sendo preparado (a captura canônica sem prova não o recusa — o
 * domínio pode provar outras paradas e outras cenas); o que se recusa é o CRÉDITO: a decisão que o atribui é
 * recusada pelo scorer e o cartão fica pendente, como as demais recusas da barreira do domínio.
 * Pacotes 1.8.0 e 1.8.1 seguem pelo caminho deles, byte a byte.
 */
export const exigeParadaEmTodoCredito = (version: string): boolean => {
  const m = /^flow-semantic-(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return false;
  const [ma, mi, pa] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return ma > 1 || (ma === 1 && (mi > 8 || (mi === 8 && pa >= 2)));
};
/** Participante de um predicado `documento` (1.8.1): o `<title>` ou um título `h1`–`h6`, nunca outro elemento. */
export function participanteDeDocumento(p: string): boolean {
  if (p === "" || p.includes(" >>> ")) return false;
  const partes = p.split(">");
  const tag = partes[partes.length - 1].replace(/:nth-of-type\(\d+\)$/, "");
  return p === "head>title" || /^h[1-6]$/.test(tag);
}
/** Where the claims of a run come from. Baseline runs are deterministic tools, reviewed the same way. */
export type RunKind = "agente" | "linha-de-base";
export interface ReviewCard {
  id: string;
  origin: RunKind;
  /** Scene the subjects were resolved in; decided by the declared window, never by text. */
  scene: string;
  selector: string;
  /** Null: the agent declared the attribution uncertain (achado-2). */
  rule: string | null;
  /** Legacy text; observed + expected for achado-2; raw JSON for a malformed finding. */
  description: string;
  /** Never promoted: a legacy finding stays legacy inside a current package. */
  contract: FindingContract;
  observed: string | null;
  expected: string | null;
  state: FlowFindingState | null;
  /** Reported references resolved against the run's preserved evidence archive. */
  evidence: ResolvedEvidence[];
  /** Unknown/opaque evidence cannot transfer approval to another execution. */
  binding: { collection: string | null; build: string | null; protocol: string | null; runScope: string | null };
  flags: string[];
  /**
   * Null key is an unresolved selector, not a real element. `hidden` carries why the element is
   * not visible, measured with the key: the canonical key alone cannot tell them apart, and a
   * claim about something nobody can see should reach review saying so.
   */
  subjects: { id: string; key: string | null; label: string; hidden: string | null; scene?: string }[];
  relatedKeys: string[];
  /** Hints only. Broad normative aliases do not establish defect identity. */
  candidateUnitIds: string[];
  reportedEvidence: unknown;
  /**
   * Só em pacote com cenas por segmento (D-60), e só quando o seletor da alegação resolve em MAIS de
   * um segmento da janela: a alegação do agente diz a janela e os passos em texto livre, nunca a
   * rota, e casar esse texto com um segmento seria a inferência que o D-39 proíbe. Então o cartão
   * traz os sujeitos resolvidos em cada segmento (em `subjects`, com `scene`), e a revisora diz em
   * `cena` de qual segmento a alegação fala. Só os sujeitos dessa cena são contabilizados.
   */
  segmentos?: { scene: string; estado: string; path: string | null; relatedKeys: string[]; candidateUnitIds: string[] }[];
}
export interface SemanticRun {
  id: string;
  kind: RunKind;
  /** Baseline tool and scan mode; null for agent runs. */
  tool: string | null;
  sourceHash: string;
  model: string;
  /** Collection contract the run was gathered under (config.instrumentVersion). */
  collection: string | null;
  config: unknown;
  cost: unknown;
  cardIds: string[];
  evidenceIndex: EvidenceIndex | null;
}
export interface SemanticPackage {
  version: string;
  context: { referenceHash: string; sceneHash: string; scorerHash: string };
  /**
   * Collection, baseline and analysis identities this package was prepared from. Part of the
   * package hash, not of card identity: the same claim on the same frozen scene is the same card.
   */
  provenance: unknown;
  scenes: SemanticScene[];
  units: SemanticUnit[];
  cards: ReviewCard[];
  runs: SemanticRun[];
  /**
   * O que a fila desta bateria herdou, e o que ela declaradamente NÃO cobra (fatia 5).
   *
   * `carriedOverPending` são decisões que vieram no arquivo de reuso, continuavam pendentes e não
   * pertencem a esta bateria. Elas não entram na fila ativa — é isso que impede a fila global de
   * ressuscitar — mas some-las em silêncio seria fingir que não existem. Ficam contadas à parte.
   *
   * `reviewBudget` é o orçamento de trabalho declarado ANTES da revisão. Esgotá-lo nunca derruba
   * alegação: deixa o não resolvido visível e as métricas provisórias.
   */
  queue: { carriedOverPending: string[]; reviewBudget: string | null };
  packageHash: string;
}
/**
 * Vínculo de revisão (NAT-72): a revisora liga, por escrito e assinado, sujeitos do cartão a uma
 * unidade que a ancoragem automática não oferece — a ausência global ancorada em `<html>`/`body`, o
 * host no lugar do controle interno do shadow root, o participante relacionado, a transição de foco.
 *
 * Nada no código cria um vínculo: nem regex de justificativa, nem id de regra, nem a lista de
 * candidatas. As candidatas automáticas continuam sendo só sugestão (`candidateUnitIds`), e a
 * ancoragem estrita (`anchored`) continua sendo o caminho normal. O vínculo é a exceção declarada,
 * e só vale se a unidade existir, estiver na cena e no estado declarados, a relação for uma das
 * previstas e compatível com a estrutura medida, houver evidência e justificativa, a assinatura for
 * a de quem decidiu e a amarração (build/execução) for a do próprio cartão.
 */
export const VINCULO_CONTRATO = "vinculo-revisao-1.0.0";
export const RELACOES_VINCULO = ["ausencia-global", "host-interno", "participante-relacionado", "transicao"] as const;
export type RelacaoVinculo = typeof RELACOES_VINCULO[number];
/** O pacote (e as decisões dele) aceita vínculo de revisão? Só na versão que o introduziu em diante. */
/** Vínculo de revisão existe de flow-semantic-1.6.0 em diante (comparação semver, não igualdade). */
export const aceitaVinculos = (version: string): boolean => {
  const m = /^flow-semantic-(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return false;
  const [ma, mi] = [Number(m[1]), Number(m[2])];
  return ma > 1 || (ma === 1 && mi >= 6);
};
export interface ReviewLink {
  contrato: typeof VINCULO_CONTRATO;
  unitId: string;
  /** Ids dos sujeitos do cartão que este vínculo cobre (subconjunto dos sujeitos do átomo). */
  subjects: string[];
  /** Cena declarada; tem de ser a da unidade e a de cada sujeito. */
  scene: string;
  /** Estado declarado; tem de estar entre os estados MEDIDOS da unidade. */
  state: string;
  relation: RelacaoVinculo;
  /** O que a revisora consultou e que mostra a relação (não vazio). */
  evidence: string[];
  justification: string;
  /** Assinatura: tem de ser a mesma revisora da decisão. */
  reviewer: string;
  /** Amarração ao build e à execução do cartão; um vínculo copiado de outro cartão não pega carona. */
  binding: { build: string | null; runScope: string | null; card: string };
}
export interface ReviewAtom {
  id: string;
  /** Author's decomposition of the original claim; never inferred by rule regex. */
  text: string;
  subjects: string[];
  verdict: "reference" | "novel" | "false" | "unresolved";
  /** Semantically approved alternatives. One instance can earn at most one unit. */
  unitIds: string[];
  citation: "supported" | "unsupported" | "uncertain";
  /** Explicit reviewer equivalence, never inferred from similar text or rule aliases. */
  duplicateOf?: { cardId: string; atomId: string };
  /** O que a autora escreveu, preservado ao lado do veredito contábil que dele resultou. */
  decisao?: DecisaoSimples;
  /** Vínculos de revisão explícitos (NAT-72); só em átomo `reference`, só em pacote que os aceita. */
  links?: ReviewLink[];
}
export interface SemanticDecision {
  cardId: string;
  status: "pending" | "reviewed";
  reviewer: string;
  rationale: string;
  /** Explicit assertion that every substantive clause/subject was accounted for. */
  complete: boolean;
  evidenceRefs: string[];
  atoms: ReviewAtom[];
  /**
   * Decisão produzida SEM a autora, pelo caminho automático (fatia 3).
   *
   * Hoje nada a emite: toda alegação de uma bateria v02 passa pela revisora (D-39). O campo existe
   * para que a regra que autoriza esse caminho seja código, e não intenção — se algum dia houver
   * aceitação automática, ela só vale onde um predicado IMPLEMENTADO sustenta na página, com
   * evidência reexecutável. Predicado ausente ou não implementado deixa a alegação SEM RESOLVER;
   * em nenhuma hipótese ela recai em "casou por elemento, logo está certa".
   */
  automatic?: { predicate: string };
  /**
   * Cena (segmento) de que a alegação fala, escolhida pela revisora. Obrigatória num cartão com
   * `segmentos` revisado, proibida em qualquer outro (D-60).
   */
  cena?: string;
}
export interface SemanticReviews {
  version: string;
  decisions: SemanticDecision[];
}

/**
 * O vocabulário que a autora escreve (fatia 5).
 *
 * Antes ela digitava a categoria contábil — `reference`, `novel`, `false`, `unresolved` — que é o
 * nome do EFEITO no denominador, não o nome do que ela viu. Memorizar contabilidade para revisar é
 * exatamente o que o plano pede para não exigir. Aqui ela diz o que viu; o mapeamento é mecânico e
 * fica registrado no próprio átomo.
 *
 * `duplicada` não é veredito: é a mesma afirmação já decidida noutro cartão. O veredito vem do
 * átomo apontado por `duplicateOf`, copiado por esta normalização — nunca adivinhado.
 */
export const DECISOES = {
  "defeito-do-gabarito": "reference",
  "defeito-novo-correto": "novel",
  "incorreta": "false",
  "evidencia-insuficiente": "unresolved",
  "duplicada": null,
} as const;
export type DecisaoSimples = keyof typeof DECISOES;

/** Um átomo como ele chega do `reviews.json`: com `decisao`, com `verdict`, ou com os dois. */
export interface RawReviewAtom extends Omit<ReviewAtom, "verdict"> {
  decisao?: DecisaoSimples;
  verdict?: ReviewAtom["verdict"];
}
export interface RawReviews {
  version: string;
  decisions: (Omit<SemanticDecision, "atoms"> & { atoms: RawReviewAtom[] })[];
}

/**
 * Resolve `decisao` em `verdict`. Falha fechado: vocabulário desconhecido, ausência dos dois, ou
 * desacordo entre eles param a pontuação em vez de escolher um.
 */
export function normalizeReviews(raw: RawReviews | SemanticReviews): SemanticReviews {
  const porAtomo = new Map<string, RawReviewAtom>();
  const chaveDe = (cardId: string, atomId: string): string => JSON.stringify([cardId, atomId]);
  for (const d of raw.decisions) for (const a of d.atoms as RawReviewAtom[]) porAtomo.set(chaveDe(d.cardId, a.id), a);

  const resolve = (a: RawReviewAtom, trilha: string[]): ReviewAtom["verdict"] => {
    if (a.decisao !== undefined) {
      requireThat(a.decisao in DECISOES, `Decisão desconhecida "${a.decisao}" em ${a.id}; use: ${Object.keys(DECISOES).join(", ")}`);
      const mapeado = DECISOES[a.decisao];
      if (mapeado !== null) {
        requireThat(a.verdict === undefined || a.verdict === mapeado,
          `Decisão "${a.decisao}" e verdict "${a.verdict}" discordam em ${a.id}`);
        return mapeado;
      }
      // duplicada: o veredito é o do átomo original, copiado e nunca inferido.
      requireThat(a.duplicateOf, `Decisão "duplicada" exige duplicateOf em ${a.id}`);
      const chave = chaveDe(a.duplicateOf!.cardId, a.duplicateOf!.atomId);
      requireThat(!trilha.includes(chave), `Ciclo de duplicata em ${a.id}`);
      const alvo = porAtomo.get(chave);
      requireThat(alvo, `duplicateOf aponta para átomo inexistente em ${a.id}`);
      return resolve(alvo!, [...trilha, chave]);
    }
    requireThat(a.verdict, `Átomo sem decisao nem verdict: ${a.id}`);
    return a.verdict!;
  };

  return structuredClone({
    version: raw.version,
    decisions: raw.decisions.map(d => ({ ...d, atoms: (d.atoms as RawReviewAtom[]).map(a => {
      const verdict = d.status === "pending" ? undefined : resolve(a, [chaveDe(d.cardId, a.id)]);
      return { ...a, ...(verdict ? { verdict } : {}) } as ReviewAtom;
    }) })),
  });
}

export interface SceneResolution { id: string; viewport: FlowViewport; specIds: string[]; resolution: Resolution; segmento?: CenaSegmento }
export interface PrepareRun {
  id: string;
  data: FlowAgentResults;
  evidence?: EvidenceIndex | null;
  kind?: RunKind;
  tool?: string | null;
}
export const sceneIdOf = (v: FlowViewport): string => `${v.width}x${v.height}`;
/** Cena de um segmento (D-60): a janela e a última parada do segmento. */
export const sceneIdOfSegment = (v: FlowViewport, estado: string): string => `${sceneIdOf(v)}@${estado}`;
const DEFAULT_VIEWPORT: FlowViewport = { width: 1280, height: 900 };

/**
 * Scene of a claim. Deterministic claims carry the pass they came from. An agent claim goes to the
 * planned scene with the same window WIDTH (layout follows width; a different height is flagged).
 * Any other window is outside the plan: its subjects are resolved in the default scene for reading,
 * but the card belongs to no planned scene and cannot anchor a reference unit.
 *
 * Com cenas por segmento (D-60) a janela de um cartão do agente tem várias cenas, e o texto livre
 * dos passos não diz qual: `segmentos` devolve todas as cenas da janela, e o cartão é montado sobre
 * aquelas em que o seletor resolve.
 */
function sceneOfClaim(f: NormalizedFinding, raw: unknown, kind: RunKind, scenes: SceneResolution[]):
  { scene: string; resolution: Resolution; flags: string[]; segmentos?: SceneResolution[] } {
  const fallback = scenes[0];
  const segmentada = scenes.some(s => s.segmento);
  const daJanela = (v: FlowViewport) => scenes.filter(s => s.viewport.width === v.width && s.viewport.height === v.height);
  if (kind === "linha-de-base") {
    const id = (raw as { scene?: unknown })?.scene;
    const scene = scenes.find(s => s.id === id);
    requireThat(scene, `Baseline claim outside the planned scenes: ${String(id)}`);
    return { scene: scene.id, resolution: scene.resolution, flags: [] };
  }
  if (!f.state) {
    const janelas = new Set(scenes.map(s => sceneIdOf(s.viewport))).size;
    return { scene: fallback.id, resolution: fallback.resolution,
      flags: janelas > 1 ? [`sem-janela-declarada: resolvido na cena ${fallback.id}`] : [],
      ...(segmentada ? { segmentos: daJanela(fallback.viewport) } : {}) };
  }
  const { width, height } = f.state.viewport;
  const scene = scenes.find(s => s.viewport.width === width);
  if (!scene) {
    return { scene: `fora-do-plano:${width}x${height}`, resolution: fallback.resolution,
      flags: [`janela-fora-do-plano: ${width}x${height}; sujeitos lidos na cena ${fallback.id}, sem âncora em unidade`] };
  }
  return { scene: scene.id, resolution: scene.resolution,
    flags: scene.viewport.height === height ? [] : [`altura-diferente: ${width}x${height} na cena ${scene.id}`],
    ...(segmentada ? { segmentos: daJanela(scene.viewport) } : {}) };
}

/**
 * A chave `key` toca a unidade cujo participante é `participant`: é o mesmo elemento ou um
 * DESCENDENTE dele (flow-semantic-1.5.0). As chaves são canônicas (anchors.ts `keyOf`): a cadeia
 * `tag[:nth-of-type(n)]` desde `body`, `>` entre pai e filho e ` >>> ` ao entrar no shadow root
 * aberto de um host. Ser descendente é, então, ter o participante como prefixo seguido de um
 * desses dois separadores — o separador explícito impede que `div:nth-of-type(1)` case com
 * `div:nth-of-type(10)`, ou `br-button` com `br-button-x`. O conteúdo do shadow root de um host
 * conta como dentro dele (é o que a página desenha dentro do host). O inverso — a chave ser
 * ANCESTRAL do participante (um `body`) — não toca: largo demais. Tocar só OFERECE a unidade como
 * candidata e permite que a revisora a nomeie; nada é creditado sem decisão.
 */
export function tocaParticipante(key: string, participant: string): boolean {
  return key === participant || key.startsWith(`${participant}>`) || key.startsWith(`${participant} >>> `);
}
const tocaAlguma = (keys: readonly string[], participant: string): boolean => keys.some(k => tocaParticipante(k, participant));

/** Sujeitos e relacionados de um seletor numa cena. */
function subjectsIn(res: Resolution, selector: string, relatedSelectors: string[]) {
  const resolved = res.bySelector.get(selector);
  const keys = resolved?.ok ? unique(resolved.keys) : [];
  const relatedKeys = unique(relatedSelectors.flatMap(s => {
    const r = res.bySelector.get(s);
    return r?.ok ? r.keys : [];
  }));
  return { keys, relatedKeys };
}

/**
 * Sujeitos que uma decisão pendente deve, no mínimo. Num cartão com `segmentos` a revisora escolhe
 * UMA cena, então o piso é o menor grupo; sem segmentos, todos os sujeitos, como sempre.
 */
function sujeitosDevidos(card: ReviewCard): ReviewCard["subjects"] {
  if (!card.segmentos) return card.subjects;
  const grupos = card.segmentos.map(o => card.subjects.filter(s => s.scene === o.scene));
  return grupos.reduce((menor, g) => g.length < menor.length ? g : menor, grupos[0]);
}

export function prepareSemanticPackage(
  context: SemanticPackage["context"],
  units: (FlowUnit & { scene?: string; domain?: DominioCena[] })[], res: Resolution | SceneResolution[],
  runs: PrepareRun[],
  options: { provenance?: unknown; stateOrder?: string[]; carriedOverPending?: string[]; reviewBudget?: string } = {},
): SemanticPackage {
  // Ordem declarada dos estados, do primeiro paint em diante. Vem de fora porque é o gabarito que a
  // declara: deduzi-la das unidades erraria justamente nas que só existem depois de uma interação.
  const stateOrder = options.stateOrder ?? [];
  const scenes: SceneResolution[] = Array.isArray(res) ? res
    : [{ id: sceneIdOf(DEFAULT_VIEWPORT), viewport: DEFAULT_VIEWPORT, specIds: unique(units.map(u => u.specId)), resolution: res }];
  requireThat(scenes.length > 0 && new Set(scenes.map(s => s.id)).size === scenes.length, "Scenes must be unique and nonempty");
  const semanticScenes: SemanticScene[] = scenes.map(s => ({ id: s.id, viewport: { width: s.viewport.width, height: s.viewport.height },
    specIds: unique(s.specIds), resolutionHash: resolutionDigest(s.resolution), ...(s.segmento ? { segmento: s.segmento } : {}) }));
  const semanticUnits = units.map(u => {
    const scene = u.scene ?? scenes[0].id;
    requireThat(scenes.some(s => s.id === scene), `Unit in an undeclared scene: ${u.specId}@${scene}`);
    // Domínio provado (1.8.0): cada participante declarado tem de RESOLVER na cena da entrada — a
    // página daquela rota responde, nunca a chave medida noutra.
    const domain = u.domain === undefined ? undefined : [...u.domain].map(e => {
      const cena = scenes.find(s => s.id === e.scene);
      requireThat(cena, `Unit domain names an undeclared scene: ${u.specId}@${e.scene}`);
      for (const p of e.participants) requireThat(p === "" || cena.resolution.byKey.has(p),
        `Unit domain participant does not resolve in scene ${e.scene}: ${u.specId} ${p}`);
      return { ...e, states: unique(e.states), participants: unique(e.participants),
        evidence: [...e.evidence].sort((a, b) => compare(a.source + a.sha256, b.source + b.sha256)) };
    }).sort((a, b) => compare(a.scene, b.scene));
    // `acceptance` é sempre explícito no pacote: sem predicado medido o registro diz
    // `nao-implementado`, e nunca fica um campo ausente que se leia como "passou".
    const { domain: _semDominio, ...resto } = u;
    return { ...resto, scene, participants: unique(u.participants), rules: unique(u.rules),
      acceptance: u.acceptance ?? NAO_IMPLEMENTADO, ...(domain ? { domain } : {}),
      id: `U-${digest([u.specId, u.element.key, u.state, scene])}` };
  }).sort((a, b) => compare(a.id, b.id));
  requireThat(new Set(semanticUnits.map(u => u.id)).size === units.length, "Duplicate reference unit identity");
  const cardMap = new Map<string, ReviewCard>();
  const semanticRuns = runs.map(({ id, data, evidence, kind = "agente", tool = null }) => {
    requireThat(Array.isArray(data.findings), `Missing findings: ${id}`);
    const cardIds = reviewableFindings(data).map(({ raw, refusal }) => {
      // A malformed finding becomes a flagged card: never an exception that drops the run, never a
      // split inferred here. Contract labels are data; nothing upgrades a legacy claim. A report the
      // collector refused and archived yields `recusado`/`malformado` cards, never `achado-2`.
      const f = kind === "linha-de-base" ? deterministicFinding(raw) : normalizeFinding(raw, refusal);
      const placed = sceneOfClaim(f, raw, kind, scenes);
      // Cenas por segmento (D-60): o seletor é resolvido em cada segmento da janela. Resolvendo em
      // UM só, o cartão fica nele (é a página que responde onde o elemento existe). Em nenhum, fica
      // no primeiro, não resolvido. Em mais de um, a revisora escolhe a cena na decisão.
      const porSegmento = (placed.segmentos ?? []).map(s => ({ s, ...subjectsIn(s.resolution, f.selector, f.relatedSelectors) }));
      const resolvem = porSegmento.filter(x => x.keys.length > 0);
      const aDecidir = resolvem.length > 1 ? resolvem : null;
      if (placed.segmentos && resolvem.length === 1) {
        const s = resolvem[0].s;
        placed.scene = s.id;
        placed.resolution = s.resolution;
        placed.flags.push(`segmento-pela-resolucao: o seletor só resolve em ${s.id} (${s.segmento?.path ?? "?"})`);
      } else if (placed.segmentos && resolvem.length === 0) {
        placed.flags.push(`segmento-nao-resolvido: o seletor não resolve em nenhuma cena da janela (${placed.segmentos.map(s => s.id).join(", ")})`);
      } else if (aDecidir) {
        placed.scene = `a-decidir:${sceneIdOf(aDecidir[0].s.viewport)}`;
        placed.flags.push(`segmento-a-decidir: o seletor resolve em ${aDecidir.map(x => x.s.id).join(", ")}; ` +
          "escolha em \"cena\" de qual a alegação fala — só os sujeitos dela contam");
      }
      const sceneRes = placed.resolution;
      const { keys, relatedKeys: relatedHere } = subjectsIn(sceneRes, f.selector, f.relatedSelectors);
      const subjects: ReviewCard["subjects"] = aDecidir
        ? aDecidir.flatMap(({ s, keys: ks }) => ks.map(key => ({ id: `${s.id}|${key}`, key,
          label: s.resolution.byKey.get(key)?.label ?? key, hidden: s.resolution.byKey.get(key)?.hidden ?? null, scene: s.id })))
        : keys.length ? keys.map(key => ({
          id: key, key, label: sceneRes.byKey.get(key)?.label ?? key, hidden: sceneRes.byKey.get(key)?.hidden ?? null,
        })) : [{ id: `unresolved:${f.selector}`, key: null, label: "Seletor não resolvido", hidden: null }];
      const relatedKeys = aDecidir ? [] : relatedHere;
      // Include full finding and run-supplied evidence/limitations. No fuzzy, case-folded,
      // rule-only or cross-state reuse. Grouped subjects remain individually accountable.
      const reportedEvidence = {
        finding: raw, scope: data.scope ?? [],
        notes: (data as FlowAgentResults & { notes?: string }).notes ?? null,
        ...(data.collector ? { submission: { status: data.collector.status, reason: data.collector.reason,
          rejectedFile: data.collector.rejectedFile, parseable: data.collector.parseable, filled: data.collector.filled } } : {}),
      };
      const candidatesIn = (scene: string, ks: string[], rel: string[]) => semanticUnits.filter(u => u.scene === scene &&
        u.participants.some(p => tocaAlguma(ks, p) || tocaAlguma(rel, p)));
      const segmentos = aDecidir?.map(({ s, keys: ks, relatedKeys: rel }) => ({
        scene: s.id, estado: s.segmento?.estado ?? s.id, path: s.segmento?.path ?? null, relatedKeys: rel,
        candidateUnitIds: candidatesIn(s.id, ks, rel).map(u => u.id) }));
      const candidates = aDecidir
        ? semanticUnits.filter(u => segmentos!.some(o => o.candidateUnitIds.includes(u.id)))
        : candidatesIn(placed.scene, keys, relatedKeys);
      const candidateUnitIds = candidates.map(u => u.id);
      // Estado declarado × estado medido (fatia 3). A unidade que só existe depois de uma interação
      // foi MEDIDA assim; uma alegação que não declara passo nenhum pode estar falando de outra
      // tela. O cartão diz isso à revisora e ela decide — o texto de `steps` é livre, e casá-lo com
      // um estado nomeado seria inferência semântica, que é exatamente o que o D-39 proíbe.
      const exigemInteracao = stateOrder.length === 0 ? []
        : candidates.filter(u => u.states.length > 0 && !u.states.includes(stateOrder[0]));
      const estadoFlags = exigemInteracao.length > 0 && kind === "agente" && !(f.state?.steps ?? []).length
        ? [`estado-nao-declarado: ${unique(exigemInteracao.map(u => u.specId)).join(", ")} só existe(m) em ` +
           `${unique(exigemInteracao.flatMap(u => u.states)).join(", ")}, e a alegação não declara passo nenhum`]
        : [];
      const resolvedEvidence = resolveEvidence(f.evidence, evidence ?? null);
      const build = data.config?.siteManifestSha256 ?? null;
      const pinned = Boolean(build && /^[a-f0-9]{64}$/.test(build) && data.config?.instrumentVersion && data.config?.protocolVersion);
      // A deterministic claim is a function of the frozen build, the scene and the tool policy.
      const reusable = kind === "linha-de-base" ? pinned : Boolean(pinned && evidence?.integrity && f.state &&
        f.contract === "achado-2" && resolvedEvidence.length &&
        resolvedEvidence.every(e => e.status === "encontrado" && e.sha256));
      const binding = { collection: data.config?.instrumentVersion ?? null, build,
        protocol: data.config?.protocolVersion ?? null,
        runScope: reusable ? null : digest({ id, timestamp: data.timestamp, page: data.appUrl,
          evidence: evidence ?? null, indexHash: data.config?.evidenceIndexSha256 ?? null }) };
      const body = { origin: kind, scene: placed.scene, selector: f.selector, rule: f.rule, description: f.description,
        contract: f.contract, observed: f.observed, expected: f.expected, state: f.state,
        evidence: resolvedEvidence, binding, flags: [...f.flags, ...placed.flags, ...estadoFlags],
        subjects, relatedKeys, candidateUnitIds, reportedEvidence, ...(segmentos ? { segmentos } : {}) };
      const cardId = `C-${digest({ context, body, units: semanticUnits })}`;
      cardMap.set(cardId, { id: cardId, ...body });
      return cardId;
    });
    return { id, kind, tool, sourceHash: digest(data), model: data.model, collection: data.config?.instrumentVersion ?? null,
      config: data.config ?? null, cost: data.cost ?? null, cardIds: unique(cardIds), evidenceIndex: evidence ?? null };
  }).sort((a, b) => compare(a.id, b.id));
  requireThat(new Set(semanticRuns.map(r => r.id)).size === runs.length, "Duplicate run id");
  const body: Omit<SemanticPackage, "packageHash"> = { version: SEMANTIC_SCORING_VERSION, context,
    provenance: options.provenance ?? null, scenes: semanticScenes, units: semanticUnits,
    cards: [...cardMap.values()].sort((a, b) => compare(a.id, b.id)), runs: semanticRuns,
    queue: { carriedOverPending: unique(options.carriedOverPending ?? []).sort(compare),
      reviewBudget: options.reviewBudget ?? null } };
  // O domínio provado é conferido já na preparação: um pacote com domínio inválido não chega a existir.
  for (const u of body.units) if (u.domain !== undefined) validateDomain(body as SemanticPackage, u);
  return structuredClone({ ...body, packageHash: digest(body) });
}

/**
 * Pacote da versão vigente a partir de um pacote anterior já preparado, com o domínio PROVADO de
 * algumas unidades (reanálise, NAT-74). Nada é repreparado: cenas, cartões e execuções são os mesmos;
 * só entram `domain` nas unidades nomeadas e os ids de cartão (que dependem das unidades) e o hash do
 * pacote são recalculados. A origem fica no próprio pacote (`provenance.derivadoDe`). Os participantes
 * de cada entrada têm de ser conferidos pelo chamador contra a resolução arquivada daquela cena — o
 * pacote só guarda o hash dela.
 */
export function aplicarDominio(pkg: SemanticPackage, porUnidade: Record<string, DominioCena[]>, nota: string): SemanticPackage {
  validatePackage(pkg);
  requireThat(pkg.version !== SEMANTIC_SCORING_VERSION && aceitaVinculos(pkg.version) && !aceitaDominio(pkg.version),
    `Only a pre-domain package with review links can be lifted to ${SEMANTIC_SCORING_VERSION}: ${pkg.version}`);
  for (const id of Object.keys(porUnidade)) requireThat(pkg.units.some(u => u.id === id), `Domain for an unknown unit: ${id}`);
  const units: SemanticUnit[] = pkg.units.map(u => porUnidade[u.id] ? { ...u, domain: [...porUnidade[u.id]].map(e => ({ ...e,
    states: unique(e.states), participants: unique(e.participants),
    evidence: [...e.evidence].sort((a, b) => compare(a.source + a.sha256, b.source + b.sha256)) })).sort((a, b) => compare(a.scene, b.scene)) } : u);
  const novoId = new Map<string, string>();
  const cards = pkg.cards.map(c => {
    const { id, ...body } = c;
    const novo = `C-${digest({ context: pkg.context, body, units })}`;
    novoId.set(id, novo);
    return { id: novo, ...body };
  }).sort((a, b) => compare(a.id, b.id));
  const body: Omit<SemanticPackage, "packageHash"> = { ...pkg, version: SEMANTIC_SCORING_VERSION,
    provenance: { ...(pkg.provenance as object ?? {}), derivadoDe: { version: pkg.version, packageHash: pkg.packageHash, nota } },
    units, cards, runs: pkg.runs.map(r => ({ ...r, cardIds: unique(r.cardIds.map(i => novoId.get(i)!)) })),
    queue: { ...pkg.queue, carriedOverPending: pkg.queue.carriedOverPending.map(i => novoId.get(i) ?? i).sort(compare) } };
  delete (body as Partial<SemanticPackage>).packageHash;
  const out = structuredClone({ ...body, packageHash: digest(body) }) as SemanticPackage;
  validatePackage(out);
  return out;
}

/**
 * Stable identity of one scene's selector resolution; persisted next to the package. Only the page
 * path enters: the preparation serves the frozen site on an ephemeral port.
 */
export function resolutionDigest(res: Resolution): string {
  return digest({ page: new URL(res.url).pathname,
    bySelector: [...res.bySelector].sort(([a], [b]) => compare(a, b)).map(([s, r]) => [s, { ok: r.ok, error: r.error, keys: r.keys }]),
    byKey: [...res.byKey].sort(([a], [b]) => compare(a, b)).map(([k, e]) => [k, { key: e.key, id: e.id, label: e.label }]) });
}

/** A baseline finding as the CLI hands it over: tool text, rule, target and the pass it came from. */
function deterministicFinding(raw: unknown): NormalizedFinding {
  const f = (raw ?? {}) as { selector?: unknown; rule?: unknown; observed?: unknown; expected?: unknown;
    viewport?: FlowViewport; steps?: unknown };
  requireThat(typeof f.selector === "string" && f.selector && typeof f.rule === "string" && typeof f.observed === "string",
    "Invalid deterministic finding");
  const expected = typeof f.expected === "string" && f.expected.trim() ? f.expected : null;
  return {
    contract: DETERMINISTIC_FINDING_CONTRACT, selector: f.selector, relatedSelectors: [], rule: f.rule,
    description: [`Observado: ${f.observed}`, expected ? `Esperado: ${expected}` : null].filter(Boolean).join("\n"),
    observed: f.observed, expected,
    state: f.viewport ? { viewport: { width: f.viewport.width, height: f.viewport.height },
      steps: Array.isArray(f.steps) ? f.steps.map(String) : [] } : null,
    evidence: [], flags: [],
  };
}

export function validatePackage(pkg: SemanticPackage): void {
  requireThat(versaoPontuavel(pkg.version), `Incompatible semantic scoring version: ${String(pkg.version)}`);
  const { packageHash, ...body } = pkg;
  requireThat(digest(body) === packageHash, "Review package changed; prepare a new package");
  const cards = new Set(pkg.cards.map(c => c.id));
  requireThat(cards.size === pkg.cards.length, "Duplicate card id");
  requireThat(new Set(pkg.units.map(u => u.id)).size === pkg.units.length, "Duplicate unit id");
  requireThat(new Set(pkg.runs.map(r => r.id)).size === pkg.runs.length, "Duplicate run id");
  const scenes = new Set(pkg.scenes.map(s => s.id));
  requireThat(scenes.size === pkg.scenes.length && scenes.size > 0, "Missing or duplicate scene");
  for (const u of pkg.units) requireThat(scenes.has(u.scene), `Unit outside declared scenes: ${u.id}`);
  for (const u of pkg.units) if (u.domain !== undefined) validateDomain(pkg, u);
  for (const r of pkg.runs) requireThat(r.kind === "agente" || r.kind === "linha-de-base", `Unknown run kind: ${r.id}`);
  for (const card of pkg.cards) {
    const { id, ...cardBody } = card;
    requireThat(id === `C-${digest({ context: pkg.context, body: cardBody, units: pkg.units })}`,
      "Card content/context changed; existing review cannot be reused");
  }
  for (const r of pkg.runs) for (const id of r.cardIds) requireThat(cards.has(id), `Unknown card ${id}`);
}

const SHA256 = /^[a-f0-9]{64}$/;
/**
 * O domínio provado de uma unidade (1.8.0) é dado do pacote e entra no hash dele. Falha fechado:
 * versão que não o conhece, cena fora do plano, cena canônica ausente, estado fora do segmento,
 * participante de página exigido pela ausência global, referência/build/evidência sem sha256.
 */
function validateDomain(pkg: SemanticPackage, u: SemanticUnit): void {
  requireThat(aceitaDominio(pkg.version), `Unit domain is not part of package version ${pkg.version}: ${u.id}`);
  const d = u.domain!;
  requireThat(Array.isArray(d) && d.length > 0, `Empty unit domain: ${u.id}`);
  requireThat(new Set(d.map(e => e.scene)).size === d.length, `Repeated scene in unit domain: ${u.id}`);
  requireThat(d.some(e => e.scene === u.scene), `Unit domain must contain its canonical scene ${u.scene}: ${u.id}`);
  requireThat(new Set(d.map(e => e.kind)).size === 1, `A unit has one defect predicate across its domain: ${u.id}`);
  requireThat(new Set(d.map(e => `${e.reference}|${e.build}`)).size === 1, `Unit domain mixes references or builds: ${u.id}`);
  for (const e of d) {
    const scene = pkg.scenes.find(s => s.id === e.scene);
    requireThat(scene, `Unit domain scene outside the plan: ${e.scene} (${u.id})`);
    requireThat((TIPOS_DOMINIO as readonly string[]).includes(e.kind), `Unknown unit domain kind ${String(e.kind)}: ${u.id}`);
    requireThat(typeof e.predicate === "string" && e.predicate.trim(), `Unit domain without its measured predicate: ${u.id}@${e.scene}`);
    requireThat(SHA256.test(e.reference) && SHA256.test(e.build), `Unit domain without reference/build sha256: ${u.id}@${e.scene}`);
    requireThat(Array.isArray(e.evidence) && e.evidence.length > 0 && e.evidence.every(x => x && typeof x.source === "string" && x.source.trim() && SHA256.test(x.sha256)),
      `Unit domain without hashed evidence: ${u.id}@${e.scene}`);
    requireThat(Array.isArray(e.states) && e.states.length > 0 && unique(e.states).length === e.states.length,
      `Unit domain without measured states: ${u.id}@${e.scene}`);
    if (scene.segmento) requireThat(e.states.every(x => scene.segmento!.estados.includes(x)),
      `Unit domain state outside segment ${e.scene}: ${u.id}`);
    requireThat(Array.isArray(e.participants) && e.participants.length > 0 && e.participants.every(p => typeof p === "string")
      && unique(e.participants).length === e.participants.length, `Unit domain without measured participants: ${u.id}@${e.scene}`);
    if (e.kind === "ausencia-global") requireThat(e.participants.every(participanteDePagina),
      `Global absence domain needs page-level participants: ${u.id}@${e.scene}`);
    else requireThat(e.participants.every(p => p !== ""), `An element/document predicate is measured on an element, not on the document key: ${u.id}@${e.scene}`);
    if (e.scene === u.scene) requireThat(canonical(e.participants) === canonical(u.participants),
      `Canonical domain entry must carry the unit's participants: ${u.id}`);
    if (aceitaDominioAmarrado(pkg.version)) {
      requireThat(e.reference === pkg.context.referenceHash,
        `Unit domain measured against another reference (${e.reference.slice(0, 12)}…, package ${String(pkg.context.referenceHash).slice(0, 12)}…): ${u.id}@${e.scene}`);
      requireThat(scene.segmento && typeof scene.segmento.estado === "string" && scene.segmento.estados.includes(scene.segmento.estado),
        `Unit domain scene without a recorded capture stop; the claim cannot be bound to a measured stop: ${u.id}@${e.scene}`);
      if (e.kind === "documento") {
        requireThat(e.participants.every(participanteDeDocumento),
          `A document predicate is the title or the heading outline, measured on <title> or h1–h6, never a generic document defect: ${u.id}@${e.scene}`);
        requireThat(e.evidence.some(x => x.source.includes(e.predicate)),
          `A document predicate must be named by its hashed evidence (${e.predicate}): ${u.id}@${e.scene}`);
      }
    }
  }
}

export function pendingDecision(cardId: string): SemanticDecision {
  return { cardId, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [] };
}

/**
 * Decisões que vieram no arquivo de reuso, continuavam PENDENTES e não são cartão desta bateria.
 *
 * `scopeReviews` as descarta, e é assim que a fila global não ressuscita. Mas descartar em silêncio
 * faria a fila parecer menor do que a dívida real do projeto. Aqui elas são contadas — à parte, sem
 * cobrar nada desta bateria (a regra do 5: só a fila ativa fecha a bateria).
 */
export function historicalPending(pkg: SemanticPackage, old?: SemanticReviews): string[] {
  if (!old) return [];
  const desta = new Set(pkg.cards.map(c => c.id));
  return old.decisions.filter(d => d.status === "pending" && !desta.has(d.cardId)).map(d => d.cardId).sort(compare);
}

/**
 * As três filas, lado a lado (fatia 5).
 *
 * Só `ativa` fecha a bateria. `historica` é dívida declarada de outras baterias, e `proximaVersao`
 * são descobertas corretas fora da referência congelada: elas entram na PRÓXIMA versão do gabarito
 * e não mexem no denominador desta — é a regra que impede o laço sem fim de reabrir o corpus a cada
 * defeito novo encontrado.
 */
export interface ReviewQueue {
  ativa: { cartoes: number; cardIds: string[] };
  historica: { cartoes: number; cardIds: string[] };
  proximaVersao: { afirmacoes: number; cardIds: string[] };
  fechaABateria: "ativa";
}

export function reviewQueue(pkg: SemanticPackage, reviews: SemanticReviews): ReviewQueue {
  const byCard = new Map(reviews.decisions.map(d => [d.cardId, d]));
  const ativa = pkg.cards.filter(c => (byCard.get(c.id)?.status ?? "pending") === "pending").map(c => c.id);
  const novos = reviews.decisions.filter(d => d.status === "reviewed" && d.atoms.some(a => a.verdict === "novel"));
  return {
    ativa: { cartoes: ativa.length, cardIds: ativa },
    historica: { cartoes: pkg.queue.carriedOverPending.length, cardIds: [...pkg.queue.carriedOverPending] },
    proximaVersao: { afirmacoes: novos.reduce((n, d) => n + d.atoms.filter(a => a.verdict === "novel").length, 0),
      cardIds: novos.map(d => d.cardId).sort(compare) },
    fechaABateria: "ativa",
  };
}

/**
 * Quanto trabalho a fila representa, e quanto dele é declarado em vez de medido (fatia 5).
 *
 * Os quatro primeiros campos são CONTAGENS — cartões, sujeitos, cartões sem evidência verificada
 * (que custam mais porque obrigam a voltar à transcrição) e cartões com unidade candidata. A
 * estimativa em minutos é o único número derivado, e a taxa que a produz é DECLARADA, nunca
 * medida: ninguém cronometrou ainda uma sessão de revisão deste instrumento. Fica dito no próprio
 * objeto para que o número não seja lido como medida — quando houver uma sessão cronometrada, a
 * taxa é substituída por ela e isto vira medida de verdade (D-06).
 */
export const TAXA_REVISAO = {
  minutosPorCartao: 3,
  minutosExtraSemEvidencia: 3,
  procedencia: "DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui",
} as const;

export interface ReviewEffort {
  cartoes: number;
  sujeitos: number;
  semEvidenciaVerificada: number;
  comCandidatos: number;
  estimativaMinutos: number;
  taxa: string;
  orcamentoDeclarado: string | null;
}

export function reviewEffort(pkg: SemanticPackage): ReviewEffort {
  const semEvidencia = pkg.cards.filter(c => !c.evidence.some(e => e.status === "encontrado"));
  const estimativa = pkg.cards.length * TAXA_REVISAO.minutosPorCartao
    + semEvidencia.length * TAXA_REVISAO.minutosExtraSemEvidencia;
  return {
    cartoes: pkg.cards.length,
    sujeitos: pkg.cards.reduce((n, c) => n + sujeitosDevidos(c).length, 0),
    semEvidenciaVerificada: semEvidencia.length,
    comCandidatos: pkg.cards.filter(c => c.candidateUnitIds.length > 0).length,
    estimativaMinutos: estimativa,
    taxa: `${TAXA_REVISAO.minutosPorCartao} min/cartão +${TAXA_REVISAO.minutosExtraSemEvidencia} sem evidência — ${TAXA_REVISAO.procedencia}`,
    orcamentoDeclarado: pkg.queue.reviewBudget,
  };
}

/**
 * Termos que denunciam o braço no texto livre de um cartão.
 *
 * O agente narra as próprias ferramentas — "Sem oráculo nem scan_page", "o oráculo indica como mais
 * próximo --gray-cool-10" —, e esse texto é dele, não do instrumento: não dá para proibi-lo sem
 * perder a limitação declarada que a revisão precisa ler. O que dá é DIZER onde ele está. A
 * renderização cega retém esse texto; esta função conta o que foi retido, para que o grau de cegueira
 * do pacote seja um número publicado e não uma promessa.
 */
const TERMOS_DO_BRACO = [
  "oráculo", "oraculo", "scan_page", "get_ds_rules", "get_component_spec", "verify_finding",
  "get_design_tokens", "check_token_compliance", "mcp", "com-oraculo", "sem-oraculo", "validator",
];

export function armLeaks(pkg: SemanticPackage): { cardId: string; termos: string[] }[] {
  const out: { cardId: string; termos: string[] }[] = [];
  for (const c of pkg.cards) {
    const texto = canonical({ d: c.description, r: c.reportedEvidence, o: c.observed, e: c.expected }).toLowerCase();
    const termos = TERMOS_DO_BRACO.filter(t => texto.includes(t));
    if (termos.length) out.push({ cardId: c.id, termos });
  }
  return out;
}

/** Reuses only content/context-addressed cards. Other batteries never create work here. */
export function scopeReviews(pkg: SemanticPackage, old?: SemanticReviews): SemanticReviews {
  validatePackage(pkg);
  // Decisões de outra versão não migram em silêncio: um pacote novo começa pendente (NAT-72: sem vínculo retroativo).
  if (old) requireThat(old.version === pkg.version, "Incompatible review version");
  const byId = new Map<string, SemanticDecision>();
  for (const d of old?.decisions ?? []) {
    requireThat(!byId.has(d.cardId), `Duplicate decision ${d.cardId}`);
    byId.set(d.cardId, d);
  }
  return structuredClone({ version: pkg.version,
    decisions: pkg.cards.map(c => byId.get(c.id) ?? pendingDecision(c.id)) });
}

function anchored(subject: ReviewCard["subjects"][number], card: ReviewCard, unit: SemanticUnit): boolean {
  // An unresolved subject cannot borrow a resolved related selector to claim credit, and a claim
  // never earns a unit of another scene just because the element key is the same there.
  // Num cartão com `segmentos` (D-60) cada sujeito diz a sua cena, e os relacionados são os dela.
  const scene = subject.scene ?? card.scene;
  const related = subject.scene ? card.segmentos?.find(o => o.scene === subject.scene)?.relatedKeys ?? [] : card.relatedKeys;
  const key = subject.key;
  return key !== null && scene === unit.scene && (unit.participants.some(p => tocaParticipante(key, p))
    || unit.participants.some(p => tocaAlguma(related, p)));
}

/** `inner` está dentro de `outer` atravessando ao menos uma fronteira de shadow root aberto. */
const atravessaSombra = (outer: string, inner: string): boolean =>
  inner !== outer && tocaParticipante(inner, outer) && inner.slice(outer.length).includes(" >>> ");

/**
 * Participante "de página": o documento (`""`), o `body`, um filho direto do `body` (o contêiner raiz
 * da aplicação, como `pnip-root` da B-01) ou um marco de região (`header`, `footer`, `main`, `nav`).
 * As referências NÃO codificam um campo "defeito de ausência" (só `description` em texto livre, que
 * não se lê por regex); a ausência de uma parte obrigatória (P-01/P-02, B-01) é, por construção,
 * ancorada nesses elementos de página. Unidade de controle (campo, botão, diálogo) não é ausência global.
 */
export function participanteDePagina(p: string): boolean {
  if (p === "" || p === "body") return true;
  if (p.includes(" >>> ")) return false;
  const partes = p.split(">");
  const tag = partes[partes.length - 1].replace(/:nth-of-type\(\d+\)$/, "");
  return (partes.length === 2 && partes[0] === "body") || ["header", "footer", "main", "nav"].includes(tag);
}

/** A evidência cita, por extenso, a chave canônica medida de um participante da unidade. */
const evidenciaCitaParticipante = (evidence: string[], unit: SemanticUnit): boolean =>
  unit.participants.some(p => p !== "" && evidence.some(e => e.includes(p)));

/**
 * Compatibilidade ESTRUTURAL de uma relação declarada com as chaves medidas. É piso, não prova.
 * - `ausencia-global`: unidade com participante de página, e o sujeito é o documento ou um ancestral
 *   (ou o próprio) desse participante.
 * - `host-interno`: sujeito e participante separados por uma fronteira de shadow root aberto.
 * - `participante-relacionado` / `transicao`: as referências não codificam elementos relacionados nem
 *   de transição (só `participants`), então não há árvore conferível; exige-se que a evidência cite
 *   por extenso a chave medida de um participante da unidade (além de cena e estado iguais).
 */
function relacaoCompativel(relation: RelacaoVinculo, key: string, unit: SemanticUnit, evidence: string[]): boolean {
  switch (relation) {
    case "ausencia-global": return unit.participants.some(p => participanteDePagina(p) && (key === "" || tocaParticipante(p, key)));
    case "host-interno": return unit.participants.some(p => atravessaSombra(key, p) || atravessaSombra(p, key));
    case "participante-relacionado":
    case "transicao": return evidenciaCitaParticipante(evidence, unit);
  }
}

/** Identidade do CONTEÚDO do cartão (sem o id, que muda com o contexto): um vínculo copiado de outro cartão não confere. */
export const cartaoDoVinculo = (card: ReviewCard): string => { const { id: _id, ...body } = card; return digest(body); };

/**
 * Estados em que a unidade foi MEDIDA. Referência sem plano de estados (`_meta.states` ausente) não
 * mede nenhum: aí o único estado é o rótulo declarado da unidade.
 */
export const estadosDaUnidade = (u: Pick<SemanticUnit, "state" | "states">): string[] => u.states.length ? u.states : [u.state];

/** O sujeito chega à unidade pela ancoragem estrita OU por um vínculo explícito do próprio átomo. */
function viaVinculo(atom: ReviewAtom, subjectId: string, unitId: string): ReviewLink | undefined {
  return atom.links?.find(l => l.unitId === unitId && l.subjects.includes(subjectId));
}
function sustenta(atom: ReviewAtom, subject: ReviewCard["subjects"][number], card: ReviewCard, unit: SemanticUnit): boolean {
  return anchored(subject, card, unit) || viaVinculo(atom, subject.id, unit.id) !== undefined;
}

/**
 * Vínculo que atravessa cena (flow-semantic-1.8.0): a cena do vínculo é a cena em que o cartão foi
 * julgado e não é a canônica da unidade. Só passa se essa cena está no domínio PROVADO da unidade e no
 * plano, se a medida do domínio foi feita no build do cartão, e se a relação declarada é a do
 * predicado próprio do defeito, conferida contra os participantes MEDIDOS nessa cena.
 */
function entradaDoDominio(unit: SemanticUnit, l: ReviewLink, card: ReviewCard, scenes: Map<string, SemanticScene> | undefined,
  domainAllowed: boolean, atomId: string): DominioCena {
  const e = domainAllowed ? unit.domain?.find(x => x.scene === l.scene) : undefined;
  requireThat(e && scenes?.has(l.scene),
    `Review link scene ${l.scene} is not the unit's scene ${unit.scene} and is outside its proven domain: ${atomId}`);
  requireThat(e.build === card.binding.build, `Review link scene ${l.scene}: the unit domain was measured on another build: ${atomId}`);
  return e;
}
/**
 * 1.8.1: a parada da alegação é a da CAPTURA da cena do vínculo (`segmento.estado`) — a única que o
 * cartão identifica (os sujeitos foram resolvidos nessa captura). Ela tem de estar entre as paradas
 * comprovadas da entrada do domínio; `sempre` no vínculo não substitui a prova, e estar no mesmo
 * segmento/rota também não.
 */
function paradaComprovada(e: DominioCena, l: ReviewLink, scenes: Map<string, SemanticScene> | undefined, unit: SemanticUnit, atomId: string): void {
  const seg = scenes?.get(l.scene)?.segmento;
  requireThat(seg, `Review link scene ${l.scene} has no recorded capture stop; the domain of ${unit.specId} cannot prove it: ${atomId}`);
  requireThat(e.states.includes(seg.estado),
    `Review link scene ${l.scene} was captured at stop ${seg.estado}, but the domain of ${unit.specId} there only proves ${e.states.join(", ")}: ${atomId}`);
}
/**
 * 1.8.2: o sujeito ancorado diretamente (sem vínculo) chega à unidade na cena canônica dela (`anchored` exige
 * cena igual). A parada da captura dessa cena tem de estar entre as paradas comprovadas da entrada canônica do
 * domínio — a mesma prova que `paradaComprovada` cobra do vínculo. Sem ela o crédito é recusado (cartão pendente).
 */
function paradaDaAncoragem(unit: SemanticUnit, scenes: Map<string, SemanticScene> | undefined, atomId: string): void {
  const e = unit.domain!.find(x => x.scene === unit.scene);
  const seg = scenes?.get(unit.scene)?.segmento;
  requireThat(e && seg, `Unit ${unit.specId} declares a domain, but its canonical scene ${unit.scene} has no proven entry with a recorded capture stop: ${atomId}`);
  requireThat(e.states.includes(seg.estado),
    `Anchored subject in scene ${unit.scene}, captured at stop ${seg.estado}, but the domain of ${unit.specId} there only proves ${e.states.join(", ")}: ${atomId}`);
}
function relacaoNoDominio(e: DominioCena, relation: RelacaoVinculo, key: string, evidence: string[]): boolean {
  if (e.kind === "ausencia-global") return relation === "ausencia-global"
    && e.participants.some(p => participanteDePagina(p) && (key === "" || tocaParticipante(p, key)));
  return relation === "participante-relacionado"
    && e.participants.some(p => p !== "" && (tocaParticipante(key, p) || (e.kind === "documento" && key === "")) && evidence.some(x => x.includes(p)));
}

function validateLinks(d: SemanticDecision, a: ReviewAtom, card: ReviewCard, units: Map<string, SemanticUnit>, linksAllowed: boolean,
  devidos: ReviewCard["subjects"], scenes?: Map<string, SemanticScene>, domainAllowed = false, domainBound = false): void {
  if (a.links === undefined) return;
  requireThat(linksAllowed, `Review links are not part of this package version; a legacy decision gets no retroactive link: ${a.id}`);
  requireThat(Array.isArray(a.links) && a.links.length > 0, `Empty review link list: ${a.id}`);
  requireThat(a.verdict === "reference", `Review link on a non-reference atom earns nothing and is refused: ${a.id}`);
  for (const l of a.links) {
    requireThat(l && l.contrato === VINCULO_CONTRATO, `Unknown review link contract in ${a.id}: ${String(l?.contrato)}`);
    requireThat((RELACOES_VINCULO as readonly string[]).includes(l.relation),
      `Review link without a declared relation (${RELACOES_VINCULO.join(" | ")}): ${a.id}`);
    const unit = units.get(l.unitId);
    requireThat(unit, `Review link to an unknown unit: ${l.unitId}`);
    requireThat(a.unitIds.includes(l.unitId), `Review link to a unit the atom does not name: ${l.unitId}`);
    requireThat(Array.isArray(l.evidence) && l.evidence.length > 0 && l.evidence.every(e => typeof e === "string" && e.trim()),
      `Review link without evidence: ${a.id}`);
    requireThat(typeof l.justification === "string" && l.justification.trim(), `Review link without justification: ${a.id}`);
    requireThat(typeof l.reviewer === "string" && l.reviewer.trim() && l.reviewer.trim() === d.reviewer.trim(),
      `Review link not signed by the deciding reviewer: ${a.id}`);
    requireThat(l.binding && l.binding.build === card.binding.build && l.binding.runScope === card.binding.runScope,
      `Review link bound to another build/execution: ${a.id}`);
    requireThat(l.binding.card === cartaoDoVinculo(card), `Review link bound to another card: ${a.id}`);
    // 1.8.0: fora da cena canônica, só no domínio provado (e a relação é a do predicado medido ali).
    const dominio = l.scene !== unit.scene && domainAllowed && unit.domain ? entradaDoDominio(unit, l, card, scenes, domainAllowed, a.id) : null;
    requireThat(dominio || l.scene === unit.scene, `Review link scene ${l.scene} is not the unit's scene ${unit.scene}: ${a.id}`);
    // 1.8.1: unidade com domínio — na cena canônica ou fora dela — só pelo que a entrada daquela cena prova.
    if (domainBound && unit.domain) paradaComprovada(dominio ?? unit.domain.find(x => x.scene === l.scene)!, l, scenes, unit, a.id);
    // O estado do vínculo é o estado DECLARADO do defeito na unidade (não qualquer estado em que ela foi
    // medida), e numa cena por segmento a unidade tem de existir no estado daquele segmento — ou, fora da
    // cena canônica, o domínio provado diz em que paradas do segmento o defeito foi medido.
    requireThat(typeof l.state === "string" && l.state === unit.state,
      `Review link state ${String(l.state)} is not the declared state of unit ${unit.specId} (${unit.state}): ${a.id}`);
    const seg = scenes?.get(l.scene)?.segmento;
    requireThat(dominio || !seg || unit.state === "sempre" || seg.estados.includes(unit.state),
      `Review link state ${unit.state} is not a state of segment ${l.scene}: ${a.id}`);
    requireThat(Array.isArray(l.subjects) && l.subjects.length > 0 && unique(l.subjects).length === l.subjects.length,
      `Review link without subjects: ${a.id}`);
    for (const id of l.subjects) {
      requireThat(a.subjects.includes(id), `Review link subject outside its atom: ${id}`);
      const s = devidos.find(x => x.id === id)!;
      requireThat(s.key !== null, `Unresolved subject cannot be linked: ${id}`);
      requireThat((s.scene ?? card.scene) === l.scene, `Review link crosses scenes (${s.scene ?? card.scene} → ${l.scene}): ${id}`);
      requireThat(dominio ? relacaoNoDominio(dominio, l.relation, s.key!, l.evidence) : relacaoCompativel(l.relation, s.key!, unit, l.evidence),
        dominio ? `Relation ${l.relation} does not fit the predicate (${dominio.kind}: ${dominio.predicate}) measured in ${l.scene} for ${id} and unit ${unit.specId}`
          : `Relation ${l.relation} does not fit the measured structure of ${id} and unit ${unit.specId}`);
    }
  }
}

function validateDecision(d: SemanticDecision, card: ReviewCard, units: Map<string, SemanticUnit>, linksAllowed: boolean,
  scenes?: Map<string, SemanticScene>, domainAllowed = false, domainBound = false, stopEveryCredit = false): void {
  requireThat(d.status === "pending" || d.status === "reviewed", `Invalid status: ${card.id}`);
  if (d.status === "pending") {
    requireThat(!d.complete && d.atoms.length === 0 && d.cena === undefined, `Pending decision carries effects: ${card.id}`);
    return;
  }
  // Cena escolhida pela revisora (D-60): obrigatória onde o seletor resolve em mais de um segmento,
  // e só ali. Os sujeitos que contam são os dela; os dos outros segmentos não são alegação.
  if (card.segmentos) {
    requireThat(typeof d.cena === "string" && card.segmentos.some(o => o.scene === d.cena),
      `Card resolves in several segments; the decision must name "cena" (${card.segmentos.map(o => o.scene).join(" | ")}): ${card.id}`);
  } else {
    requireThat(d.cena === undefined, `"cena" only applies to a card with segments to choose from: ${card.id}`);
  }
  const devidos = card.segmentos ? card.subjects.filter(s => s.scene === d.cena) : card.subjects;
  requireThat(d.complete && d.reviewer.trim() && d.rationale.trim() && d.evidenceRefs.length > 0
    && d.evidenceRefs.every(ref => typeof ref === "string" && ref.trim()), `Incomplete review: ${card.id}`);
  requireThat(d.atoms.length > 0, `Reviewed card without atoms: ${card.id}`);
  requireThat(new Set(d.atoms.map(a => a.id)).size === d.atoms.length, `Duplicate atom id: ${card.id}`);
  const covered = new Set<string>();
  for (const a of d.atoms) {
    requireThat(a.id.trim() && a.text.trim() && a.subjects.length > 0, `Incomplete atom: ${card.id}`);
    requireThat(["reference", "novel", "false", "unresolved"].includes(a.verdict), `Invalid verdict: ${a.id}`);
    requireThat(["supported", "unsupported", "uncertain"].includes(a.citation), `Invalid citation: ${a.id}`);
    if (a.duplicateOf !== undefined) requireThat(a.duplicateOf && typeof a.duplicateOf.cardId === "string" &&
      typeof a.duplicateOf.atomId === "string" && a.verdict !== "unresolved", `Invalid duplicate link: ${a.id}`);
    requireThat(unique(a.subjects).length === a.subjects.length, `Repeated subject: ${a.id}`);
    requireThat(unique(a.unitIds).length === a.unitIds.length, `Repeated unit: ${a.id}`);
    requireThat(a.verdict === "reference" ? a.unitIds.length > 0 : a.unitIds.length === 0,
      `Only reference atoms declare nonempty unitIds: ${a.id}`);
    const subjects = a.subjects.map(id => {
      const s = devidos.find(s => s.id === id);
      requireThat(s, card.subjects.some(s => s.id === id) ? `Subject outside the chosen scene ${d.cena}: ${id}` : `Unknown subject: ${id}`);
      covered.add(id);
      return s;
    });
    validateLinks(d, a, card, units, linksAllowed, devidos, scenes, domainAllowed, domainBound);
    for (const id of a.unitIds) {
      const u = units.get(id);
      requireThat(u && subjects.some(s => sustenta(a, s, card, u)), `Unanchored/unknown unit: ${id}`);
      // 1.8.2: a ancoragem direta numa unidade com domínio também só credita pela parada provada (o vínculo já
      // passou por `paradaComprovada` em validateLinks; a ancoragem direta é sempre na cena canônica da unidade).
      if (stopEveryCredit && u.domain) for (const s of subjects) if (anchored(s, card, u)) paradaDaAncoragem(u, scenes, a.id);
    }
    if (a.verdict === "reference") for (const s of subjects) {
      requireThat(a.unitIds.some(id => sustenta(a, s, card, units.get(id)!)), `Unsupported subject: ${s.id}`);
    }
  }
  requireThat(devidos.every(s => covered.has(s.id)), `Review omitted a subject: ${card.id}`);

  // Vínculo não multiplica crédito (NAT-72, revisão do diff): um sujeito que só chega a uma unidade por
  // vínculo chega a NO MÁXIMO uma unidade no cartão, e um sujeito vinculado não pode reaparecer em outro
  // átomo `reference` (dividir "<html> sem lang" em N átomos, cada um vinculado a uma unidade, daria N).
  const refs = d.atoms.filter(a => a.verdict === "reference");
  for (const s of devidos) {
    const comS = refs.filter(a => a.subjects.includes(s.id));
    if (comS.length > 1) requireThat(!comS.some(a => a.links?.length),
      `Linked subject in more than one reference atom: ${s.id}`);
    const soPorVinculo = new Set(comS.flatMap(a => a.unitIds.filter(uid => !anchored(s, card, units.get(uid)!) && viaVinculo(a, s.id, uid))));
    requireThat(soPorVinculo.size <= 1, `A subject reaches at most one unit only through review links: ${s.id}`);
  }

  // O caminho automático só existe onde a máquina de fato verificou alguma coisa. Um predicado que
  // este avaliador não implementa não vira crédito nem recusa: a alegação fica sem resolver, e a
  // revisora decide. É a única leitura compatível com o D-39 — coincidência de seletor e norma gera
  // candidato, nunca crédito — e impede que "não sei verificar" se disfarce de "verifiquei".
  if (d.automatic !== undefined) {
    requireThat(d.automatic && typeof d.automatic.predicate === "string" && d.automatic.predicate.trim(),
      `Automatic decision without a named predicate: ${card.id}`);
    for (const a of d.atoms) {
      requireThat(a.verdict !== "reference" || a.unitIds.every(id => {
        const u = units.get(id)!;
        return u.acceptance.outcome === "sustenta" && u.acceptance.kind === d.automatic!.predicate;
      }), `Automatic credit without a sustaining implemented predicate, claim stays unresolved: ${a.id}`);
    }
  }
}

/** Maximum-cardinality bipartite assignment with stable iteration/tie-breaking. */
export function maximumMatching(edges: Map<string, string[]>): Map<string, string> {
  const owner = new Map<string, string>();
  const visit = (left: string, seen: Set<string>): boolean => {
    for (const right of unique(edges.get(left) ?? [])) {
      if (seen.has(right)) continue;
      seen.add(right);
      const previous = owner.get(right);
      if (previous === undefined || visit(previous, seen)) {
        owner.set(right, left);
        return true;
      }
    }
    return false;
  };
  for (const left of [...edges.keys()].sort(compare)) visit(left, new Set());
  return new Map([...owner].map(([right, left]): [string, string] => [left, right]).sort(([a], [b]) => compare(a, b)));
}

export interface SemanticRunScore {
  runId: string;
  status: "complete" | "provisional";
  /** `vinculo`: só quando a aresta creditada existe apenas pelo vínculo de revisão (NAT-72). */
  matched: { unitId: string; instanceId: string; cardId: string; atomId: string; citation: string; vinculo?: RelacaoVinculo }[];
  missedUnitIds: string[];
  pendingCardIds: string[];
  assertions: { instanceId: string; cardId: string; atomId: string | null; subjectId: string;
    verdict: ReviewAtom["verdict"] | "pending" | "redundant-reference" | "duplicate";
    duplicateOf?: string;
    eligibleUnitIds: string[]; matchedUnitId: string | null }[];
  counts: { referenceUnits: number; detectedUnits: number; novelAssertions: number; falseAssertions: number;
    unresolvedAssertions: number; redundantReferenceAssertions: number; duplicateAssertions: number };
  /** Reference F1 excludes correct novel discoveries; full-report precision is separate. */
  metrics: { confirmedReferenceRecall: number | null; referenceRecall: number | null;
    referencePrecision: number | null; referenceF1: number | null;
    assertionPrecision: number | null; citationSupport: number | null };
  families: { specId: string; detected: number; total: number }[];
}

/**
 * Incremental coverage from the same reviewed output: per unit, which side has a confirmed
 * detection. Final only when both runs are complete; otherwise it lists confirmed detections and
 * stays provisional. `uniao-deterministica` merges every baseline run of the package.
 */
export interface BaselineComparison {
  agentRunId: string;
  baseline: string;
  status: "complete" | "provisional";
  units: { both: string[]; agentOnly: string[]; baselineOnly: string[]; neither: string[] };
  counts: { referenceUnits: number; both: number; agentOnly: number; baselineOnly: number; neither: number };
  /** Reviewed claims outside the reference, kept apart from detection. */
  agent: { novel: number; false: number; unresolved: number };
  baselineClaims: { novel: number; false: number; unresolved: number };
}

function compareRuns(pkg: SemanticPackage, scores: SemanticRunScore[]): BaselineComparison[] {
  const kind = new Map(pkg.runs.map(r => [r.id, r.kind]));
  const baselines = scores.filter(s => kind.get(s.runId) === "linha-de-base");
  if (!baselines.length) return [];
  const union: SemanticRunScore = { ...baselines[0], runId: "uniao-deterministica",
    status: baselines.every(b => b.status === "complete") ? "complete" : "provisional",
    matched: baselines.flatMap(b => b.matched),
    counts: { ...baselines[0].counts,
      novelAssertions: baselines.reduce((n, b) => n + b.counts.novelAssertions, 0),
      falseAssertions: baselines.reduce((n, b) => n + b.counts.falseAssertions, 0),
      unresolvedAssertions: baselines.reduce((n, b) => n + b.counts.unresolvedAssertions, 0) } };
  const units = pkg.units.map(u => u.id);
  return scores.filter(s => kind.get(s.runId) === "agente").flatMap(agent => [...baselines, union].map(base => {
    const a = new Set(agent.matched.map(m => m.unitId));
    const b = new Set(base.matched.map(m => m.unitId));
    const split = {
      both: units.filter(u => a.has(u) && b.has(u)), agentOnly: units.filter(u => a.has(u) && !b.has(u)),
      baselineOnly: units.filter(u => !a.has(u) && b.has(u)), neither: units.filter(u => !a.has(u) && !b.has(u)),
    };
    return {
      agentRunId: agent.runId, baseline: base.runId,
      status: agent.status === "complete" && base.status === "complete" ? "complete" as const : "provisional" as const,
      units: split,
      counts: { referenceUnits: units.length, both: split.both.length, agentOnly: split.agentOnly.length,
        baselineOnly: split.baselineOnly.length, neither: split.neither.length },
      agent: { novel: agent.counts.novelAssertions, false: agent.counts.falseAssertions, unresolved: agent.counts.unresolvedAssertions },
      baselineClaims: { novel: base.counts.novelAssertions, false: base.counts.falseAssertions, unresolved: base.counts.unresolvedAssertions },
    };
  }));
}

export function scoreSemanticPackage(pkg: SemanticPackage, reviews: SemanticReviews): {
  version: string; packageHash: string; reviewHash: string; scores: SemanticRunScore[];
  comparisons: BaselineComparison[];
} {
  validatePackage(pkg);
  requireThat(reviews.version === pkg.version, "Incompatible review version");
  const linksAllowed = aceitaVinculos(pkg.version);
  const domainAllowed = aceitaDominio(pkg.version);
  const domainBound = aceitaDominioAmarrado(pkg.version);
  const stopEveryCredit = exigeParadaEmTodoCredito(pkg.version);
  const scenes = new Map(pkg.scenes.map(s => [s.id, s]));
  const units = new Map(pkg.units.map(u => [u.id, u]));
  const cards = new Map(pkg.cards.map(c => [c.id, c]));
  const decisions = new Map<string, SemanticDecision>();
  for (const d of reviews.decisions) {
    requireThat(!decisions.has(d.cardId), `Duplicate decision: ${d.cardId}`);
    const card = cards.get(d.cardId);
    requireThat(card, `Decision outside this package: ${d.cardId}; use scopeReviews for reuse`);
    validateDecision(d, card, units, linksAllowed, scenes, domainAllowed, domainBound, stopEveryCredit);
    decisions.set(d.cardId, d);
  }
  const scores = pkg.runs.map(run => {
    // Resolve duplicate chains inside EACH run. A decision from another run cannot erase a claim.
    const canonicalAtom = (cardId: string, atom: ReviewAtom, seen = new Set<string>()): { cardId: string; atom: ReviewAtom } => {
      const key = canonical([cardId, atom.id]);
      requireThat(!seen.has(key), `Cyclic duplicate link: ${cardId}/${atom.id}`);
      seen.add(key);
      if (!atom.duplicateOf) return { cardId, atom };
      const targetCard = cards.get(atom.duplicateOf.cardId);
      const targetDecision = decisions.get(atom.duplicateOf.cardId);
      const target = targetDecision?.atoms.find(a => a.id === atom.duplicateOf!.atomId);
      requireThat(run.cardIds.includes(atom.duplicateOf.cardId) && targetCard && target && targetDecision?.status === "reviewed",
        `Duplicate target is not reviewed in this run: ${key}`);
      const sourceCard = cards.get(cardId)!;
      requireThat(atom.verdict === target.verdict && canonical(unique(atom.unitIds)) === canonical(unique(target.unitIds)) &&
        atom.subjects.every(s => target.subjects.includes(s)) &&
        canonical(sourceCard.state) === canonical(targetCard.state) &&
        canonical(sourceCard.relatedKeys) === canonical(targetCard.relatedKeys) &&
        sourceCard.binding.build === targetCard.binding.build,
        `Incompatible duplicate target (truth/subjects/state/units): ${key}`);
      return canonicalAtom(atom.duplicateOf.cardId, target, seen);
    };
    const edges = new Map<string, string[]>();
    const sources = new Map<string, { cardId: string; atomId: string; citation: string }>();
    const linkedEdges = new Map<string, RelacaoVinculo>();
    const pendingCardIds: string[] = [];
    const assertions: SemanticRunScore["assertions"] = [];
    let novel = 0, incorrect = 0, unresolved = 0, citationKnown = 0, citationSupported = 0, duplicates = 0;
    for (const id of unique(run.cardIds)) {
      const card = cards.get(id)!;
      const decision = decisions.get(id);
      if (!decision || decision.status === "pending") {
        pendingCardIds.push(id);
        // A lower count of unresolved assertion instances, not an exact atom count.
        const devidos = sujeitosDevidos(card);
        unresolved += devidos.length;
        for (const s of devidos) assertions.push({ instanceId: digest([id, null, s.id]),
          cardId: id, atomId: null, subjectId: s.id, verdict: "pending", eligibleUnitIds: [], matchedUnitId: null });
        continue;
      }
      for (const atom of [...decision.atoms].sort((a, b) => compare(a.id, b.id))) {
        const original = canonicalAtom(id, atom);
        for (const subjectId of unique(atom.subjects)) {
          const instanceId = digest([id, atom.id, subjectId]);
          const assertion: SemanticRunScore["assertions"][number] = { instanceId, cardId: id,
            atomId: atom.id, subjectId, verdict: atom.verdict, eligibleUnitIds: [], matchedUnitId: null };
          assertions.push(assertion);
          if (atom.duplicateOf) {
            assertion.verdict = "duplicate";
            assertion.duplicateOf = digest([original.cardId, original.atom.id, subjectId]);
            duplicates++;
          } else if (atom.verdict === "reference") {
            const subject = card.subjects.find(s => s.id === subjectId)!;
            edges.set(instanceId, atom.unitIds.filter(uid => sustenta(atom, subject, card, units.get(uid)!)));
            assertion.eligibleUnitIds = unique(edges.get(instanceId)!);
            sources.set(instanceId, { cardId: id, atomId: atom.id, citation: atom.citation });
            // Aresta que só existe pelo vínculo explícito: o crédito diz por qual relação veio (NAT-72).
            for (const uid of edges.get(instanceId)!) {
              const l = anchored(subject, card, units.get(uid)!) ? undefined : viaVinculo(atom, subjectId, uid);
              if (l) linkedEdges.set(canonical([instanceId, uid]), l.relation);
            }
          } else if (atom.verdict === "novel") novel++;
          else if (atom.verdict === "false") incorrect++;
          else { unresolved++; if (!pendingCardIds.includes(id)) pendingCardIds.push(id); }
          // Citation accuracy is assessed on reviewed assertions, separately from detection.
          if (atom.verdict !== "unresolved") {
            citationKnown++;
            if (atom.citation === "supported") citationSupported++;
          }
        }
      }
    }
    const matches = maximumMatching(edges);
    for (const a of assertions) if (a.verdict === "reference") {
      a.matchedUnitId = matches.get(a.instanceId) ?? null;
      if (a.matchedUnitId === null) a.verdict = "redundant-reference";
    }
    const detected = new Set(matches.values());
    const matched = [...matches].map(([instanceId, unitId]) => {
      // Só presente quando o crédito veio por vínculo: pontuações sem vínculo saem byte a byte iguais.
      const vinculo = linkedEdges.get(canonical([instanceId, unitId]));
      return { unitId, instanceId, ...sources.get(instanceId)!, ...(vinculo ? { vinculo } : {}) };
    }).sort((a, b) => compare(a.unitId, b.unitId));
    const families = unique(pkg.units.map(u => u.specId)).map(specId => {
      const us = pkg.units.filter(u => u.specId === specId);
      return { specId, detected: us.filter(u => detected.has(u.id)).length, total: us.length };
    });
    const complete = unresolved === 0;
    const referenceRecall = pkg.units.length ? matched.length / pkg.units.length : null;
    const precisionDenominator = matched.length + novel + incorrect;
    const referencePrecisionDenominator = matched.length + incorrect;
    const f1Denominator = matched.length + pkg.units.length + incorrect;
    return {
      runId: run.id, status: complete ? "complete" as const : "provisional" as const,
      matched, missedUnitIds: pkg.units.filter(u => !detected.has(u.id)).map(u => u.id),
      pendingCardIds: unique(pendingCardIds),
      assertions: assertions.sort((a, b) => compare(a.instanceId, b.instanceId)),
      counts: { referenceUnits: pkg.units.length, detectedUnits: matched.length,
        novelAssertions: novel, falseAssertions: incorrect, unresolvedAssertions: unresolved,
        redundantReferenceAssertions: edges.size - matched.length, duplicateAssertions: duplicates },
      metrics: { confirmedReferenceRecall: referenceRecall, referenceRecall: complete ? referenceRecall : null,
        referencePrecision: complete && referencePrecisionDenominator ? matched.length / referencePrecisionDenominator : null,
        referenceF1: complete && f1Denominator ? 2 * matched.length / f1Denominator : null,
        assertionPrecision: complete && precisionDenominator ? (matched.length + novel) / precisionDenominator : null,
        citationSupport: complete && citationKnown ? citationSupported / citationKnown : null },
      families,
    };
  });
  // A versão do resultado é a do pacote: um pacote legado sai pelo caminho dele, byte a byte igual.
  return { version: pkg.version, packageHash: pkg.packageHash,
    reviewHash: digest([...reviews.decisions].sort((a, b) => compare(a.cardId, b.cardId))), scores,
    comparisons: compareRuns(pkg, scores) };
}
