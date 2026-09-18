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
import { FLOW_SCORING_VERSION } from "./instrument";
import {
  DETERMINISTIC_FINDING_CONTRACT, normalizeFinding, resolveEvidence, reviewableFindings,
  type EvidenceIndex, type FindingContract, type NormalizedFinding, type ResolvedEvidence,
} from "./flow-contract";

export const SEMANTIC_SCORING_VERSION = FLOW_SCORING_VERSION;

/** Code, vocabulary and contract that decide what a package means; a different fingerprint refuses it. */
export const SCORER_FILES = ["scripts/semantic-flow.ts", "scripts/semantic-flow-cli.ts", "scripts/flow-contract.ts",
  "scripts/evidence-integrity.ts", "scripts/acceptance-predicates.ts",
  "scripts/units-flow.ts", "scripts/units.ts", "scripts/anchors.ts", "scripts/instrument.ts", "instrument.json",
  "types.ts", "checker-aliases.json", "kb-aliases.json"];

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
}
export interface SemanticUnit extends FlowUnit { id: string; scene: string; acceptance: PredicateResult }
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
  subjects: { id: string; key: string | null; label: string; hidden: string | null }[];
  relatedKeys: string[];
  /** Hints only. Broad normative aliases do not establish defect identity. */
  candidateUnitIds: string[];
  reportedEvidence: unknown;
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
  version: typeof SEMANTIC_SCORING_VERSION;
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
}
export interface SemanticReviews {
  version: typeof SEMANTIC_SCORING_VERSION;
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
  version: typeof SEMANTIC_SCORING_VERSION;
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

export interface SceneResolution { id: string; viewport: FlowViewport; specIds: string[]; resolution: Resolution }
export interface PrepareRun {
  id: string;
  data: FlowAgentResults;
  evidence?: EvidenceIndex | null;
  kind?: RunKind;
  tool?: string | null;
}
export const sceneIdOf = (v: FlowViewport): string => `${v.width}x${v.height}`;
const DEFAULT_VIEWPORT: FlowViewport = { width: 1280, height: 900 };

/**
 * Scene of a claim. Deterministic claims carry the pass they came from. An agent claim goes to the
 * planned scene with the same window WIDTH (layout follows width; a different height is flagged).
 * Any other window is outside the plan: its subjects are resolved in the default scene for reading,
 * but the card belongs to no planned scene and cannot anchor a reference unit.
 */
function sceneOfClaim(f: NormalizedFinding, raw: unknown, kind: RunKind, scenes: SceneResolution[]):
  { scene: string; resolution: Resolution; flags: string[] } {
  const fallback = scenes[0];
  if (kind === "linha-de-base") {
    const id = (raw as { scene?: unknown })?.scene;
    const scene = scenes.find(s => s.id === id);
    requireThat(scene, `Baseline claim outside the planned scenes: ${String(id)}`);
    return { scene: scene.id, resolution: scene.resolution, flags: [] };
  }
  if (!f.state) {
    return { scene: fallback.id, resolution: fallback.resolution,
      flags: scenes.length > 1 ? [`sem-janela-declarada: resolvido na cena ${fallback.id}`] : [] };
  }
  const { width, height } = f.state.viewport;
  const scene = scenes.find(s => s.viewport.width === width);
  if (!scene) {
    return { scene: `fora-do-plano:${width}x${height}`, resolution: fallback.resolution,
      flags: [`janela-fora-do-plano: ${width}x${height}; sujeitos lidos na cena ${fallback.id}, sem âncora em unidade`] };
  }
  return { scene: scene.id, resolution: scene.resolution,
    flags: scene.viewport.height === height ? [] : [`altura-diferente: ${width}x${height} na cena ${scene.id}`] };
}

export function prepareSemanticPackage(
  context: SemanticPackage["context"],
  units: (FlowUnit & { scene?: string })[], res: Resolution | SceneResolution[],
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
    specIds: unique(s.specIds), resolutionHash: resolutionDigest(s.resolution) }));
  const semanticUnits = units.map(u => {
    const scene = u.scene ?? scenes[0].id;
    requireThat(scenes.some(s => s.id === scene), `Unit in an undeclared scene: ${u.specId}@${scene}`);
    // `acceptance` é sempre explícito no pacote: sem predicado medido o registro diz
    // `nao-implementado`, e nunca fica um campo ausente que se leia como "passou".
    return { ...u, scene, participants: unique(u.participants), rules: unique(u.rules),
      acceptance: u.acceptance ?? NAO_IMPLEMENTADO,
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
      const sceneRes = placed.resolution;
      const resolved = sceneRes.bySelector.get(f.selector);
      const keys = resolved?.ok ? unique(resolved.keys) : [];
      const subjects: ReviewCard["subjects"] = keys.length ? keys.map(key => ({
        id: key, key, label: sceneRes.byKey.get(key)?.label ?? key, hidden: sceneRes.byKey.get(key)?.hidden ?? null,
      })) : [{ id: `unresolved:${f.selector}`, key: null, label: "Seletor não resolvido", hidden: null }];
      const relatedKeys = unique(f.relatedSelectors.flatMap(s => {
        const r = sceneRes.bySelector.get(s);
        return r?.ok ? r.keys : [];
      }));
      // Include full finding and run-supplied evidence/limitations. No fuzzy, case-folded,
      // rule-only or cross-state reuse. Grouped subjects remain individually accountable.
      const reportedEvidence = {
        finding: raw, scope: data.scope ?? [],
        notes: (data as FlowAgentResults & { notes?: string }).notes ?? null,
        ...(data.collector ? { submission: { status: data.collector.status, reason: data.collector.reason,
          rejectedFile: data.collector.rejectedFile, parseable: data.collector.parseable, filled: data.collector.filled } } : {}),
      };
      const candidates = semanticUnits.filter(u => u.scene === placed.scene && u.participants.some(k =>
        keys.includes(k) || relatedKeys.includes(k)));
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
        subjects, relatedKeys, candidateUnitIds, reportedEvidence };
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
  return structuredClone({ ...body, packageHash: digest(body) });
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
  requireThat(pkg.version === SEMANTIC_SCORING_VERSION, "Incompatible semantic scoring version");
  const { packageHash, ...body } = pkg;
  requireThat(digest(body) === packageHash, "Review package changed; prepare a new package");
  const cards = new Set(pkg.cards.map(c => c.id));
  requireThat(cards.size === pkg.cards.length, "Duplicate card id");
  requireThat(new Set(pkg.units.map(u => u.id)).size === pkg.units.length, "Duplicate unit id");
  requireThat(new Set(pkg.runs.map(r => r.id)).size === pkg.runs.length, "Duplicate run id");
  const scenes = new Set(pkg.scenes.map(s => s.id));
  requireThat(scenes.size === pkg.scenes.length && scenes.size > 0, "Missing or duplicate scene");
  for (const u of pkg.units) requireThat(scenes.has(u.scene), `Unit outside declared scenes: ${u.id}`);
  for (const r of pkg.runs) requireThat(r.kind === "agente" || r.kind === "linha-de-base", `Unknown run kind: ${r.id}`);
  for (const card of pkg.cards) {
    const { id, ...cardBody } = card;
    requireThat(id === `C-${digest({ context: pkg.context, body: cardBody, units: pkg.units })}`,
      "Card content/context changed; existing review cannot be reused");
  }
  for (const r of pkg.runs) for (const id of r.cardIds) requireThat(cards.has(id), `Unknown card ${id}`);
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
    sujeitos: pkg.cards.reduce((n, c) => n + c.subjects.length, 0),
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
  if (old) requireThat(old.version === SEMANTIC_SCORING_VERSION, "Incompatible review version");
  const byId = new Map<string, SemanticDecision>();
  for (const d of old?.decisions ?? []) {
    requireThat(!byId.has(d.cardId), `Duplicate decision ${d.cardId}`);
    byId.set(d.cardId, d);
  }
  return structuredClone({ version: SEMANTIC_SCORING_VERSION,
    decisions: pkg.cards.map(c => byId.get(c.id) ?? pendingDecision(c.id)) });
}

function anchored(subject: ReviewCard["subjects"][number], card: ReviewCard, unit: SemanticUnit): boolean {
  // An unresolved subject cannot borrow a resolved related selector to claim credit, and a claim
  // never earns a unit of another scene just because the element key is the same there.
  return subject.key !== null && card.scene === unit.scene && (unit.participants.includes(subject.key)
    || unit.participants.some(k => card.relatedKeys.includes(k)));
}

function validateDecision(d: SemanticDecision, card: ReviewCard, units: Map<string, SemanticUnit>): void {
  requireThat(d.status === "pending" || d.status === "reviewed", `Invalid status: ${card.id}`);
  if (d.status === "pending") {
    requireThat(!d.complete && d.atoms.length === 0, `Pending decision carries effects: ${card.id}`);
    return;
  }
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
      const s = card.subjects.find(s => s.id === id);
      requireThat(s, `Unknown subject: ${id}`);
      covered.add(id);
      return s;
    });
    for (const id of a.unitIds) {
      const u = units.get(id);
      requireThat(u && subjects.some(s => anchored(s, card, u)), `Unanchored/unknown unit: ${id}`);
    }
    if (a.verdict === "reference") for (const s of subjects) {
      requireThat(a.unitIds.some(id => anchored(s, card, units.get(id)!)), `Unsupported subject: ${s.id}`);
    }
  }
  requireThat(card.subjects.every(s => covered.has(s.id)), `Review omitted a subject: ${card.id}`);

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
  matched: { unitId: string; instanceId: string; cardId: string; atomId: string; citation: string }[];
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
  requireThat(reviews.version === SEMANTIC_SCORING_VERSION, "Incompatible review version");
  const units = new Map(pkg.units.map(u => [u.id, u]));
  const cards = new Map(pkg.cards.map(c => [c.id, c]));
  const decisions = new Map<string, SemanticDecision>();
  for (const d of reviews.decisions) {
    requireThat(!decisions.has(d.cardId), `Duplicate decision: ${d.cardId}`);
    const card = cards.get(d.cardId);
    requireThat(card, `Decision outside this package: ${d.cardId}; use scopeReviews for reuse`);
    validateDecision(d, card, units);
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
    const pendingCardIds: string[] = [];
    const assertions: SemanticRunScore["assertions"] = [];
    let novel = 0, incorrect = 0, unresolved = 0, citationKnown = 0, citationSupported = 0, duplicates = 0;
    for (const id of unique(run.cardIds)) {
      const card = cards.get(id)!;
      const decision = decisions.get(id);
      if (!decision || decision.status === "pending") {
        pendingCardIds.push(id);
        // A lower count of unresolved assertion instances, not an exact atom count.
        unresolved += card.subjects.length;
        for (const s of card.subjects) assertions.push({ instanceId: digest([id, null, s.id]),
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
            edges.set(instanceId, atom.unitIds.filter(uid => anchored(subject, card, units.get(uid)!)));
            assertion.eligibleUnitIds = unique(edges.get(instanceId)!);
            sources.set(instanceId, { cardId: id, atomId: atom.id, citation: atom.citation });
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
    const matched = [...matches].map(([instanceId, unitId]) => ({ unitId, instanceId, ...sources.get(instanceId)! }))
      .sort((a, b) => compare(a.unitId, b.unitId));
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
  return { version: SEMANTIC_SCORING_VERSION, packageHash: pkg.packageHash,
    reviewHash: digest([...reviews.decisions].sort((a, b) => compare(a.cardId, b.cardId))), scores,
    comparisons: compareRuns(pkg, scores) };
}
