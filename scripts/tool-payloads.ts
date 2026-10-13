/**
 * NAT-82 — verificador de integridade dos payloads integrais da ponte MCP (runner/container/bridge.mjs).
 * Mora fora de scripts/evidence-integrity.ts de propósito: aquele arquivo está em SCORER_FILES
 * (semantic-flow.ts), e mudá-lo invalidaria todo pacote de revisão já preparado. Os payloads não entram
 * no scorer; só no leitor do pacote (analisar-execucao `lerPacote`), no runner e na comprovação do registro.
 */
import { createHash } from "node:crypto";

const hash = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const isHash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
/** Caminho relativo portátil (mesma regra de evidence-integrity: sem raiz, unidade, `.`/`..` ou segmento vazio). */
function portable(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes(":") ||
      normalized.split("/").some(p => !p || p === "." || p === "..")) {
    throw new Error(`Invalid payload relative path: ${path}`);
  }
  return normalized;
}
/**
 * A ponte (runner/container/bridge.mjs, `tool-payload-1.0.0`) projeta `{ text, truncated }` em cada lado
 * (`args`/`result`) do evento e, quando a projeção corta, grava o texto inteiro num arquivo e anota
 * `payload` = { status, path, mediaType, bytes, sha256, totalBytes, limitBytes } no mesmo lado.
 *   - `complete`: o arquivo é o texto inteiro; o sha256 dele é o `argsSha256`/`resultSha256` do evento.
 *   - `truncated`: o arquivo é o prefixo de `limitBytes` bytes; o resto não existe em lugar nenhum.
 *   - `over-budget` / `failed`: nenhum arquivo; vale só a projeção.
 * Evento sem `payload` (pacotes anteriores ao NAT-82, ou projeção inteira) é lido como antes: nada é reconstruído.
 */
export const TOOL_PAYLOAD_POLICY = "tool-payload-1.0.0";
export const TOOL_PAYLOAD_STATUSES = ["complete", "truncated", "over-budget", "failed"] as const;
export type ToolPayloadStatus = typeof TOOL_PAYLOAD_STATUSES[number];
export interface ToolPayloadRef {
  status: ToolPayloadStatus; path: string | null; mediaType?: string; bytes?: number; sha256?: string;
  totalBytes: number; limitBytes: number; budgetBytes?: number; detail?: string;
}
type Side = { text?: unknown; truncated?: unknown; payload?: unknown } | null | undefined;
type EventLike = Record<string, unknown> & { args?: Side; result?: Side; argsSha256?: unknown; resultSha256?: unknown; server?: unknown; seq?: unknown };

/** Pasta do pacote onde cada ponte guarda os payloads, por papel do contêiner (evidence/raw/<papel>/payloads/). */
export const TOOL_PAYLOAD_PATH = /^evidence\/raw\/(browser|oracle)\/payloads\/[^/]+$/;

/**
 * A ponte grava `path` relativo ao próprio /out (`payloads/...`). Ao juntar os eventos no tool-events.ndjson
 * do pacote, o runner troca pelo caminho no pacote (`evidence/raw/<papel>/payloads/...`). Puro; não lê disco.
 */
export function rebaseToolPayloads<T extends Record<string, unknown>>(event: T, prefix: string): T {
  const fix = (s: Side): Side => {
    const p = s && typeof s === "object" ? s.payload as ToolPayloadRef | undefined : undefined;
    if (!p || typeof p !== "object" || typeof p.path !== "string") return s;
    return { ...s, payload: { ...p, path: `${prefix.replace(/\/+$/, "")}/${portable(p.path)}` } };
  };
  const e = event as EventLike;
  if (!e.args && !e.result) return event;
  return { ...event, ...(e.args ? { args: fix(e.args) } : {}), ...(e.result ? { result: fix(e.result) } : {}) } as T;
}

export interface VerifiedToolPayloads {
  /** Texto conferido de cada payload gravado, por caminho no pacote. */
  texts: Map<string, string>;
  counts: Record<ToolPayloadStatus, number>;
}

/**
 * Confere cada payload citado em tool-events.ndjson contra o arquivo do pacote (tamanho e sha256) e, quando
 * `complete`, contra o hash que a ponte registrou do texto inteiro no momento da chamada. `files` = entradas do
 * manifesto (já conferidas por hash pelo leitor do pacote); com `requireRole`, todo arquivo `tool-payload` tem
 * de ser citado por algum evento e todo payload citado tem de estar no manifesto com esse papel.
 * Qualquer divergência lança: payload adulterado nunca vira texto de comprovação.
 */
export function verifyToolPayloads(toolEvents: string | null, read: (path: string) => Buffer | null,
  files?: { path: string; role: string; bytes: number; sha256: string; mediaType: string }[], requireRole = false): VerifiedToolPayloads {
  const texts = new Map<string, string>();
  const counts: Record<ToolPayloadStatus, number> = { complete: 0, truncated: 0, "over-budget": 0, failed: 0 };
  const declared = new Map((files ?? []).map(f => [f.path, f]));
  const cited = new Set<string>();
  const lines = (toolEvents ?? "").split(/\r?\n/).filter(l => l.trim());
  for (const [n, line] of lines.entries()) {
    let e: EventLike;
    try { e = JSON.parse(line) as EventLike; } catch { throw new Error(`tool-events.ndjson linha ${n + 1} ilegível`); }
    for (const [lado, fullHash] of [["args", e.argsSha256], ["result", e.resultSha256]] as const) {
      const s = e[lado];
      if (!s || typeof s !== "object" || !("payload" in s)) continue;
      const p = s.payload as ToolPayloadRef;
      const where = `evento ${String(e.server)}#${String(e.seq)} ${lado}`;
      if (!p || typeof p !== "object" || !TOOL_PAYLOAD_STATUSES.includes(p.status)) throw new Error(`Payload com status inválido: ${where}`);
      if (s.truncated !== true) throw new Error(`Payload anotado em projeção não cortada: ${where}`);
      if (!Number.isSafeInteger(p.totalBytes) || !Number.isSafeInteger(p.limitBytes)) throw new Error(`Payload sem tamanho declarado: ${where}`);
      counts[p.status]++;
      if (p.status === "over-budget" || p.status === "failed") {
        if (p.path !== null) throw new Error(`Payload ${p.status} não pode citar arquivo: ${where}`);
        continue;
      }
      if (typeof p.path !== "string" || !isHash(p.sha256) || !Number.isSafeInteger(p.bytes)) throw new Error(`Payload sem arquivo/hash: ${where}`);
      const path = portable(p.path);
      if (cited.has(path)) throw new Error(`Payload citado duas vezes: ${path}`);
      cited.add(path);
      if (files) {
        const f = declared.get(path);
        if (!f) throw new Error(`Payload fora do manifesto: ${path}`);
        if (requireRole && f.role !== "tool-payload") throw new Error(`Payload com papel ${f.role} no manifesto: ${path}`);
        if (f.bytes !== p.bytes || f.sha256 !== p.sha256 || (p.mediaType !== undefined && f.mediaType !== p.mediaType)) {
          throw new Error(`Payload diverge do manifesto: ${path}`);
        }
      }
      const body = read(path);
      if (!body) throw new Error(`Payload ausente: ${path}`);
      if (body.length !== p.bytes || hash(body) !== p.sha256) throw new Error(`Payload alterado: ${path}`);
      if (p.status === "complete") {
        if (p.bytes !== p.totalBytes || p.sha256 !== fullHash) throw new Error(`Payload completo não confere com o hash da chamada: ${path}`);
      } else if (!(p.bytes === p.limitBytes && p.totalBytes > p.limitBytes)) {
        throw new Error(`Payload truncado com tamanhos incoerentes: ${path}`);
      }
      texts.set(path, body.toString("utf8"));
    }
  }
  if (requireRole) {
    for (const f of files ?? []) {
      if (f.role === "tool-payload" && !cited.has(f.path)) throw new Error(`Payload no manifesto sem evento que o cite: ${f.path}`);
    }
  }
  return { texts, counts };
}
