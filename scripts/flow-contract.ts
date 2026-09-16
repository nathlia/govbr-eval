/**
 * Contrato do achado da suíte de fluxo — fluxo-1.3.0, fatia 2 do v02.
 *
 * Até fluxo-1.2.0 um achado era seletor + regra + `description`: observação, expectativa e
 * justificativa num texto só, sem dizer em que estado nem com que evidência. O contrato novo separa
 * `observed` de `expected`, aceita `rule: null` quando a atribuição é incerta, e pede `state` (janela
 * e interações desde o carregamento) e `evidence` (caminhos ou identificadores que as ferramentas
 * devolveram). Nada aqui nomeia estado ou unidade do gabarito: o agente descreve o que fez.
 *
 * Quatro rótulos, e nenhum é promovido a outro:
 *   achado-2         o contrato novo;
 *   achado-1-legado  execuções até fluxo-1.2.0 — sem estado nem evidência, e assim ficam;
 *   recusado         o coletor recusou todo relatório da execução e a última tentativa foi arquivada
 *                    como relatório dela (surface-1.2.0): revisável, nunca contado como achado-2;
 *   malformado       o que não cabe em nenhum dos outros: preservado como veio e sinalizado para
 *                    revisão, nunca descartado nem dividido por inferência.
 */
import type { FlowCollectorRecord, FlowFindingState } from "../types";

export const FINDING_CONTRACT = "achado-2" as const;
export const LEGACY_FINDING_CONTRACT = "achado-1-legado" as const;
export const REFUSED_FINDING_CONTRACT = "recusado" as const;
export type FindingContract =
  | typeof FINDING_CONTRACT | typeof LEGACY_FINDING_CONTRACT | typeof REFUSED_FINDING_CONTRACT | "malformado";
/** Situação do relatório de uma execução que nunca teve relatório aceito pelo coletor. */
export const REFUSED_SUBMISSION = "recusa-arquivada" as const;

export interface NormalizedFinding {
  contract: FindingContract;
  selector: string;
  relatedSelectors: string[];
  rule: string | null;
  /** Texto do legado; observado + esperado no contrato novo; o corpo bruto quando malformado. */
  description: string;
  observed: string | null;
  expected: string | null;
  state: FlowFindingState | null;
  evidence: string[];
  flags: string[];
}

export interface EvidenceFile { path: string; bytes: number; sha256: string }
/** Índice que o runner grava ao preservar a raiz temporária de uma execução. */
export interface EvidenceIndex {
  dir: string;
  files: EvidenceFile[];
  /** Set only by the filesystem boundary after verifying index and file bytes. */
  integrity?: { indexSha256: string };
}
export interface ResolvedEvidence {
  ref: string;
  status: "encontrado" | "ausente" | "ambiguo" | "identificador" | "sem-arquivo";
  /** Caminho relativo ao govbr-eval, somente quando exatamente um arquivo preservado corresponde. */
  path: string | null;
  sha256: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const positiveInteger = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

function readState(value: unknown): FlowFindingState | null {
  if (!isRecord(value) || !isRecord(value.viewport)) return null;
  const { width, height } = value.viewport;
  if (!positiveInteger(width) || !positiveInteger(height)) return null;
  if (!Array.isArray(value.steps) || !value.steps.every(isText)) return null;
  return { viewport: { width, height }, steps: [...value.steps] };
}

export function validateFlowFinding(value: unknown, at: string): string[] {
  if (!isRecord(value)) return [`${at}: objeto`];
  const errors: string[] = [];
  if (!isText(value.selector)) errors.push(`${at}.selector: texto obrigatório`);
  if (value.relatedSelectors !== undefined &&
    (!Array.isArray(value.relatedSelectors) || !value.relatedSelectors.every(isText))) {
    errors.push(`${at}.relatedSelectors: lista de textos`);
  }
  if (!("rule" in value) || !(value.rule === null || isText(value.rule))) {
    errors.push(`${at}.rule: id da regra, ou null quando a atribuição for incerta`);
  }
  for (const field of ["observed", "expected"]) {
    if (!isText(value[field])) errors.push(`${at}.${field}: texto obrigatório`);
  }
  if (value.description !== undefined && typeof value.description !== "string") errors.push(`${at}.description: texto`);
  if (!isRecord(value.state)) {
    errors.push(`${at}.state: objeto com viewport e steps`);
  } else {
    const { viewport, steps } = value.state;
    if (!isRecord(viewport) || !positiveInteger(viewport.width) || !positiveInteger(viewport.height)) {
      errors.push(`${at}.state.viewport: largura e altura reais da janela, inteiros positivos em pixels`);
    }
    if (!Array.isArray(steps) || !steps.every(isText)) {
      errors.push(`${at}.state.steps: lista de textos (vazia se não houve interação)`);
    }
  }
  if (!Array.isArray(value.evidence) || !value.evidence.every(isText)) {
    errors.push(`${at}.evidence: lista de caminhos ou identificadores devolvidos pelas ferramentas`);
  }
  return errors;
}

/** Contrato que o coletor exige de um relatório de fluxo (surface-1.1.0 em diante). */
export function validateFlowReport(value: unknown): string[] {
  if (!isRecord(value)) return ["o corpo precisa ser um objeto JSON"];
  const errors: string[] = [];
  for (const field of ["timestamp", "model", "appUrl"]) {
    if (!isText(value[field])) errors.push(`${field}: texto obrigatório`);
  }
  if (value.scope !== undefined && (!Array.isArray(value.scope) || value.scope.some((s) => typeof s !== "string"))) {
    errors.push("scope: lista de textos");
  }
  if (value.notes !== undefined && typeof value.notes !== "string") errors.push("notes: texto");
  if (!Array.isArray(value.findings)) return [...errors, "findings: lista obrigatória"];
  value.findings.forEach((finding, index) => errors.push(...validateFlowFinding(finding, `findings[${index}]`)));
  return errors;
}

const RULE_ID = /\b(?:wcag|emag|ds|govbr)[:.-][\w.-]+/gi;
/** Uma regra que lista vários ids sugere alegação composta: sinaliza, não divide. */
function citesSeveralRules(rule: string | null): boolean {
  return rule !== null && (rule.match(RULE_ID)?.length ?? 0) > 1;
}

function normalizeShape(raw: unknown): NormalizedFinding {
  const f = isRecord(raw) ? raw : {};
  const selector = typeof f.selector === "string" ? f.selector : "";
  const relatedSelectors = Array.isArray(f.relatedSelectors)
    ? f.relatedSelectors.filter((s): s is string => typeof s === "string")
    : [];
  const note = typeof f.description === "string" ? f.description : null;
  const currentShape = ["observed", "expected", "state", "evidence"].some((key) => key in f);

  if (currentShape && isText(selector)) {
    const observed = isText(f.observed) ? f.observed : null;
    const expected = isText(f.expected) ? f.expected : null;
    if (observed !== null || expected !== null) {
      const errors = validateFlowFinding(raw, "achado");
      const rule = isText(f.rule) ? f.rule : null;
      const evidence = Array.isArray(f.evidence) ? f.evidence.filter(isText) : [];
      const flags = [
        ...(errors.length ? [`contrato-incompleto: ${errors.join("; ")}`] : []),
        ...(rule === null ? ["regra-incerta"] : []),
        ...(citesSeveralRules(rule) ? ["varias-regras"] : []),
        ...(evidence.length === 0 ? ["sem-evidencia"] : []),
      ];
      const description = [
        observed !== null ? `Observado: ${observed}` : null,
        expected !== null ? `Esperado: ${expected}` : null,
        isText(note) ? `Nota: ${note}` : null,
      ].filter((line): line is string => line !== null).join("\n");
      return {
        contract: FINDING_CONTRACT, selector, relatedSelectors, rule, description,
        observed, expected, state: readState(f.state), evidence, flags,
      };
    }
  }

  if (!currentShape && isText(selector) && typeof f.rule === "string" && isText(note)) {
    return {
      contract: LEGACY_FINDING_CONTRACT, selector, relatedSelectors, rule: f.rule, description: note,
      observed: null, expected: null, state: null, evidence: [],
      flags: ["legado-sem-estado-nem-evidencia", ...(citesSeveralRules(f.rule) ? ["varias-regras"] : [])],
    };
  }

  const verbatim = typeof raw === "string" ? raw : JSON.stringify(raw) ?? String(raw);
  return {
    contract: "malformado", selector, relatedSelectors, rule: typeof f.rule === "string" ? f.rule : null,
    description: `Achado malformado, preservado como veio: ${verbatim}`,
    observed: null, expected: null, state: null, evidence: [], flags: ["malformado"],
  };
}

/**
 * `refusal` é o motivo quando o achado vem de um relatório que o coletor recusou e arquivou na
 * última tentativa. Um achado desses nunca sai como achado-2, mesmo que ele sozinho esteja completo:
 * o relatório de onde veio não cumpriu o contrato de coleta.
 */
export function normalizeFinding(raw: unknown, refusal: string | null = null): NormalizedFinding {
  const base = normalizeShape(raw);
  if (refusal === null) return base;
  const flag = `contrato-incompleto: relatório recusado pelo coletor e arquivado na última tentativa — ${refusal}`;
  if (base.contract === "malformado") return { ...base, flags: [...base.flags, flag] };
  return { ...base, contract: REFUSED_FINDING_CONTRACT, flags: [flag, ...base.flags] };
}

export interface ReviewableFinding {
  raw: unknown;
  /** Motivo da recusa quando o relatório da execução foi arquivado pelo coletor (recusa-arquivada). */
  refusal: string | null;
}

/**
 * O que vai à revisão de uma execução. Relatório aceito: os achados como vieram. Relatório recusado e
 * arquivado: os achados sinalizados; e, quando não há achado a revisar (corpo que não é JSON, sem
 * lista `findings`, ou lista vazia), o corpo recusado inteiro vira um item malformado — a recusa
 * aparece no pacote em vez de sumir.
 */
export function reviewableFindings(data: { findings?: unknown; collector?: FlowCollectorRecord }): ReviewableFinding[] {
  const findings = Array.isArray(data.findings) ? data.findings : [];
  const record = data.collector;
  if (!record || record.status !== REFUSED_SUBMISSION) return findings.map((raw) => ({ raw, refusal: null }));
  if (!record.parseable || findings.length === 0) return [{ raw: record.rawBody, refusal: record.reason }];
  return findings.map((raw) => ({ raw, refusal: record.reason }));
}

/**
 * Resolve cada referência contra a evidência preservada da execução. Aceita o caminho como a
 * ferramenta o devolveu (link markdown, barras invertidas, caminho absoluto da raiz temporária) ou
 * só o nome do arquivo, mas credita um arquivo somente quando exatamente um corresponde.
 */
export function resolveEvidence(refs: string[], index: EvidenceIndex | null): ResolvedEvidence[] {
  return refs.map((ref) => {
    const link = /\]\(([^)]+)\)/.exec(ref);
    const normalized = (link ? link[1] : ref).trim().replace(/\\/g, "/").replace(/^\.\//, "");
    const looksLikeFile = normalized.includes("/") || /\.[a-z0-9]{2,5}$/i.test(normalized);
    if (!looksLikeFile) return { ref, status: "identificador", path: null, sha256: null };
    if (!index) return { ref, status: "sem-arquivo", path: null, sha256: null };
    const wanted = normalized.toLowerCase();
    const hits = index.files.filter((file) => {
      const path = file.path.toLowerCase();
      return wanted === path || wanted.endsWith(`/${path}`) || path.endsWith(`/${wanted}`);
    });
    if (hits.length !== 1) return { ref, status: hits.length ? "ambiguo" : "ausente", path: null, sha256: null };
    return { ref, status: "encontrado", path: `${index.dir}/${hits[0].path}`, sha256: hits[0].sha256 };
  });
}
