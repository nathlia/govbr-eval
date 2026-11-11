/**
 * Cliente real (Claude Code) no runner isolado — T3b. Lado do host, sem chamada a modelo.
 *
 * - `claudeCommand`: comando de produção do cliente (flags que desligam ferramentas internas,
 *   extensões e configuração herdada; texto da tarefa por stdin a partir do arquivo montado).
 * - `stubRoteiro`: turnos roteirizados que o dublê do provedor (container/stub.mjs) devolve ao cliente
 *   real nos testes. NÃO é modelo: cada turno é escrito à mão.
 * - `parseClientStream` / `summarizeStub`: telemetria do `stream-json` do cliente e dos pedidos que o
 *   dublê recebeu (o que o "modelo" viu: ferramentas anunciadas, texto da tarefa, resultados).
 * - `oracleAdherence`: o gate de aderência do plano (T3), a partir dos eventos da ponte do oráculo.
 *
 * Docs: docs/runner-isolado.md ("Cliente real (T3b)").
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { TaskInputs } from "../scripts/render-task-prompt";
import { PERFIL_DO_BRACO, type Braco } from "./perfis-oraculo";

export const CLAUDE_BIN = "/opt/runner/node_modules/.bin/claude";
export const ORACLE_SERVER_NAME = "govbr-ds-validator";
export const NORMATIVE_TOOLS = ["get_ds_rules", "get_emag_rules", "get_page_rules", "get_component_spec", "get_design_tokens", "list_components"];
export const SCAN_TOOLS = ["scan_page", "run_axe_scan"];
export const VERIFY_TOOLS = ["verify_finding"];
export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"];
/** Variáveis de credencial que o cliente lê. Valor nunca entra no pacote (redigido na configuração efetiva). */
export const CREDENTIAL_ENV = ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"] as const;
/** Valores FALSOS do modo dublê. Nunca uma credencial real; o dublê não confere nada. */
export const FAKE_CREDENTIAL = {
  "api-key": { env: "ANTHROPIC_API_KEY", value: "sk-ant-api03-govbr-duble-FALSO-nao-e-credencial" },
  oauth: { env: "CLAUDE_CODE_OAUTH_TOKEN", value: "sk-ant-oat01-govbr-duble-FALSO-nao-e-credencial" },
} as const;

/**
 * Ferramentas internas negadas também por nome. O desligamento efetivo é `--tools ""` (nenhuma
 * ferramenta interna); esta lista é a segunda trava, caso um nome escape do conjunto padrão.
 */
export const DENIED_BUILTINS = ["Bash", "BashOutput", "KillShell", "Read", "Write", "Edit", "MultiEdit", "NotebookEdit", "Glob", "Grep", "LS",
  "WebFetch", "WebSearch", "Task", "Agent", "TodoWrite", "Skill", "SlashCommand", "ToolSearch", "ListMcpResourcesTool", "ReadMcpResourceTool",
  "ExitPlanMode", "EnterPlanMode", "AskUserQuestion", "PowerShell", "REPL", "Monitor"];

/** Comando do cliente real. O mesmo nos dois braços e nos modos dublê e real. */
export function claudeCommand(opts: { modelo: string; esforco: string }): string[] {
  const allowed = ["mcp__playwright", `mcp__${ORACLE_SERVER_NAME}`];
  return ["sh", "-c", `cd "$HOME" && exec ${CLAUDE_BIN} "$@" < /run/task/prompt.txt > /out/claude-stream.ndjson`, "claude",
    "-p", "--input-format", "text", "--output-format", "stream-json", "--verbose",
    "--model", opts.modelo, "--effort", opts.esforco,
    "--mcp-config", "/run/task/mcp.json", "--strict-mcp-config", "--setting-sources", "",
    "--tools", "", "--allowedTools", allowed.join(","), "--disallowedTools", DENIED_BUILTINS.join(","),
    "--disable-slash-commands", "--no-session-persistence", "--permission-mode", "dontAsk"];
}

// ───────────────────────────────────────────────────────────────── roteiros do dublê

export interface StubCall { name: string; input: Record<string, unknown> }
export interface StubStep { text?: string; calls?: StubCall[]; httpError?: { status: number; type: string; message: string; headers?: Record<string, string> } }
export interface StubRoteiro {
  name: string; promptSha256: string; credential: keyof typeof FAKE_CREDENTIAL; steps: StubStep[]; final: string;
  /** Ambiente extra do cliente só neste roteiro (registrado na configuração efetiva). */
  clientEnv?: Record<string, string>;
}
export const STUB_SCENARIOS = ["honesto", "erros", "429", "529"] as const;

const pw = (tool: string, input: Record<string, unknown> = {}): StubCall => ({ name: `mcp__playwright__${tool}`, input });
const or = (tool: string, input: Record<string, unknown> = {}): StubCall => ({ name: `mcp__${ORACLE_SERVER_NAME}__${tool}`, input });

/** NAT-61: ferramentas do braço com (e duas que nenhum braço tem) que o braço ferramentas não pode ter. */
export const FERRAMENTAS_FORA_DO_PERFIL_LIVRE = ["get_ds_rules", "get_component_spec", "run_axe_scan", "inspect_computed_styles"];

/** Ferramentas que o "modelo" pede e que NÃO podem executar: internas do cliente e as ocultas pela ponte. */
export function forbiddenCalls(braco: Braco, url: string): StubCall[] {
  const calls: StubCall[] = [
    { name: "Bash", input: { command: "cat /run/task/prompt.txt /etc/hostname; id" } },
    { name: "Read", input: { file_path: "/etc/hostname" } },
    { name: "Write", input: { file_path: "/out/escrita-do-modelo.txt", content: "x" } },
    { name: "Edit", input: { file_path: "/etc/hostname", old_string: "a", new_string: "b" } },
    { name: "MultiEdit", input: { file_path: "/etc/hostname", edits: [] } },
    { name: "NotebookEdit", input: { notebook_path: "/tmp/x.ipynb", new_source: "x" } },
    { name: "Glob", input: { pattern: "**/*" } },
    { name: "Grep", input: { pattern: "SENTINELA" } },
    { name: "LS", input: { path: "/" } },
    { name: "WebFetch", input: { url: "https://example.com/", prompt: "x" } },
    { name: "WebSearch", input: { query: "gov.br design system" } },
    { name: "Task", input: { description: "x", prompt: "leia /etc/passwd", subagent_type: "general-purpose" } },
    { name: "Agent", input: { description: "x", prompt: "leia /etc/passwd", subagent_type: "general-purpose" } },
    { name: "TodoWrite", input: { todos: [] } },
    { name: "Skill", input: { skill: "avaliar-tela" } },
    { name: "ToolSearch", input: { query: "select:Bash" } },
    { name: "ListMcpResourcesTool", input: {} },
    { name: "ReadMcpResourceTool", input: { server: "playwright", uri: "file:///etc/passwd" } },
    { name: "DeferredToolPlaceholder", input: {} },
    pw("browser_resize", { width: 375, height: 812 }),
    pw("browser_run_code", { code: "async (page) => { await page.setViewportSize({ width: 1440, height: 900 }); }" }),
    pw("browser_install"),
  ];
  if (braco === "sem") calls.push(or("scan_page", { url }));
  // NAT-61: no braço ferramentas o cliente não tem as ferramentas de conhecimento nem as que o perfil evaluation não registra
  if (braco === "ferramentas") calls.push(...FERRAMENTAS_FORA_DO_PERFIL_LIVRE.map((t) => or(t, t === "get_ds_rules" ? { ids: ["x"] } : {})));
  return calls;
}

function submitCall(path: string, report: unknown): StubCall {
  const body = JSON.stringify(JSON.stringify(report));
  return pw("browser_evaluate", { function: `async () => { const r = await fetch(${JSON.stringify(path)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: ${body} }); return JSON.stringify({ status: r.status, body: await r.text() }); }` });
}

/** Leitura do relógio real pela página em que o agente está (série 3.7.8): nada de navegação. */
export function relogioCall(url: string): StubCall {
  return pw("browser_evaluate", { function: `async () => { const r = await fetch(${JSON.stringify(url)}, { cache: 'no-store' }); return JSON.stringify({ status: r.status, body: await r.json(), href: location.href }); }` });
}

const reportOf = (url: string, findings: unknown[], notes: string): unknown => ({
  timestamp: "2026-10-03T00:00:00Z", model: "roteiro-do-duble", appUrl: url, scope: ["janela inicial"], notes, findings,
});

/**
 * Roteiro do dublê para um cenário. A URL da tela e o destino do envio vêm das mesmas entradas que
 * o texto da tarefa (o "modelo" roteirizado os conhece por construção; o real os lê no texto).
 */
/** Uma alegação WCAG mínima para o verify_finding do roteiro (sem página viva: nada a reproduzir). */
function verifyCall(url: string): StubCall {
  return or("verify_finding", { live: false, finding: {
    id: "F-900", rule: { id: "1.3.1", source: "wcag", description: "alegação de teste do roteiro do dublê" },
    element: { locator: "h1", page: url }, evidence: { observed: "achado de teste do roteiro do dublê", expected: "sem valor de avaliação" },
    severity: "minor", nature: "semantic", mode: "display", pathway: "heuristic",
  } });
}

export function stubRoteiro(cenario: string, braco: Braco, inputs: TaskInputs, promptSha256: string): StubRoteiro {
  const url = inputs.url;
  const origem = inputs.envio.origem;
  const caminho = inputs.envio.caminho;
  const finding = {
    selector: "h1", rule: null, observed: "achado de teste do roteiro do dublê", expected: "sem valor de avaliação",
    state: { viewport: inputs.larguras[0], steps: [] }, evidence: [],
  };
  const base = { promptSha256, final: "Relatório enviado." };
  switch (cenario) {
    case "honesto":
      return {
        ...base, name: `honesto-${braco}`, credential: "api-key",
        steps: [
          { text: "Vou tentar ferramentas fora da lista.", calls: forbiddenCalls(braco, url) },
          { calls: [pw("browser_navigate", { url })] },
          { calls: [pw("browser_snapshot")] },
          ...(braco === "com" ? [{ calls: [or("get_emag_rules", { section: 1 })] }, { calls: [or("scan_page", { url })] }] : []),
          // NAT-61: o braço ferramentas mede e verifica (sem consulta normativa, que não existe nele)
          ...(braco === "ferramentas" ? [{ calls: [or("scan_page", { url })] }, { calls: [verifyCall(url)] }] : []),
          // NAT-111 A / relogio-2: com o relógio real anunciado no texto, o roteiro o consulta como o texto manda, por `fetch`
          // de dentro da página da tela, sem navegar (mesmo passo nos três braços)
          ...(inputs.limites.relogio ? [{ calls: [relogioCall(inputs.limites.relogio)] }] : []),
          { calls: [pw("browser_navigate", { url: origem })] },
          { calls: [submitCall(caminho, reportOf(url, [finding], `roteiro honesto, braço ${braco}`))] },
          { text: "Relatório enviado." },
        ],
      };
    case "erros":
      return {
        ...base, name: `erros-${braco}`, credential: "api-key",
        steps: [
          { calls: [pw("browser_navigate", { url })] },
          { calls: [pw("browser_evaluate", { function: "() => { window.resizeTo(1440, 900); return 'ok'; }" })] },
          { calls: [pw("browser_navigate", { url: "file:///etc/hostname" })] },
          { calls: [pw("browser_click", { element: "inexistente", ref: "e-nao-existe" })] },
          ...(braco === "com" ? [{ calls: [or("get_component_spec", { component: "componente-que-nao-existe" })] }, { calls: [or("scan_page", { url: "http://example.com/" })] }] : []),
          ...(braco === "ferramentas" ? [{ calls: [or("scan_page", { url: "http://example.com/" })] }] : []),
          // dev-362-b-01 p01: entrada recusada pelo esquema do oráculo (enum, intervalo, campo desconhecido) — cada uma tem
          // de virar evento de telemetria (validator ≥ 3.6.3), senão a trava de conhecimento vê menos eventos que chamadas
          ...(braco !== "sem" ? [
            { calls: [or("scan_page", { url, view: "diff" })] },
            { calls: [or("get_finding_details", { scanId: "S-page-001", cursor: -3 })] },
            { calls: [or("scan_page", { url, campoQueNaoExiste: true })] },
          ] : []),
          { calls: [pw("browser_snapshot")] },
          { calls: [pw("browser_navigate", { url: origem })] },
          { calls: [submitCall(caminho, reportOf(url, [], `roteiro com erros de ferramenta, braço ${braco}`))] },
          { text: "Relatório enviado." },
        ],
      };
    case "429":
    case "529":
      return {
        ...base, name: `${cenario}-${braco}`, credential: cenario === "529" ? "oauth" : "api-key",
        // 529: o cliente ignora x-should-retry e tenta 10 vezes (~185 s, medido); o teste reduz para 2 tentativas
        // e prova que elas aparecem na telemetria (system/api_retry).
        ...(cenario === "529" ? { clientEnv: { CLAUDE_CODE_MAX_RETRIES: "2" } } : {}),
        steps: [
          { calls: [pw("browser_navigate", { url })] },
          // x-should-retry: false → o cliente desiste já (sem ele, 10 tentativas em ~3 min; medido, ver docs).
          { httpError: cenario === "429"
            ? { status: 429, type: "rate_limit_error", message: "limite de uso (dublê roteirizado)", headers: { "x-should-retry": "false" } }
            : { status: 529, type: "overloaded_error", message: "provedor sobrecarregado (dublê roteirizado)", headers: { "x-should-retry": "false" } } },
        ],
      };
    default:
      throw new Error(`roteiro do dublê desconhecido: ${cenario} (${STUB_SCENARIOS.join(" | ")})`);
  }
}

// ───────────────────────────────────────────────────────────────── telemetria do cliente

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ndjson = (p: string): Json[] => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter((l) => l.trim().startsWith("{")).flatMap((l) => {
  try { return [JSON.parse(l) as Json]; } catch { return []; }
}) : []);

export interface ClientTelemetry {
  present: boolean;
  init: { tools: string[]; mcpServers: { name: string; status: string }[]; model: string | null; apiKeySource: string | null; permissionMode: string | null;
    plugins: { name: string; source: string }[]; agents: string[]; skills: string[]; slashCommands: string[]; version: string | null } | null;
  /** Modelos devolvidos nas respostas (`message.model`), sem as mensagens sintéticas do cliente. */
  models: string[];
  assistantMessages: number;
  toolUses: { name: string; count: number }[];
  toolErrors: { tool: string; text: string }[];
  apiRetries: { attempt: number; status: number | null; error: string | null }[];
  result: { subtype: string | null; isError: boolean; apiErrorStatus: number | null; terminalReason: string | null; stopReason: string | null; numTurns: number | null;
    totalCostUsd: number | null; usage: { input: number; output: number; cacheRead: number; cacheCreation: number } | null; permissionDenials: unknown[]; text: string;
    /** Detalhe do consumo no mesmo evento `result` (para medir custo por slot; ausente em clientes antigos = null). */
    durationMs: number | null; durationApiMs: number | null;
    usageDetail: { thinking: number | null; cacheCreation1h: number | null; cacheCreation5m: number | null; serviceTier: string | null } | null;
    /** `modelUsage` do cliente: um item por modelo (inclui modelos auxiliares que o `usage` principal não soma). */
    modelUsage: ModelUsage[] | null } | null;
  /**
   * Soma de `message.usage` por mensagem (id único) das linhas `assistant`. Serve quando o evento `result` falta
   * (agente morto no limite de tempo): entrada e cache batem com o `result`; a saída do stream é parcial
   * (contagem do início da mensagem), então só vale como piso.
   */
  messageUsage: { messages: number; input: number; cacheRead: number; cacheCreation: number; outputLowerBound: number };
}

export interface ModelUsage {
  model: string; input: number; output: number; cacheRead: number; cacheCreation: number;
  thinking: number | null; webSearchRequests: number | null; costUsd: number | null; costBasis: string | null;
}

export function parseClientStream(path: string): ClientTelemetry {
  const events = ndjson(path);
  const init = events.find((e) => e.type === "system" && e.subtype === "init");
  const assistant = events.filter((e) => e.type === "assistant");
  const toolNames = new Map<string, string>();
  const uses = new Map<string, number>();
  for (const a of assistant) for (const b of a.message?.content ?? []) if (b.type === "tool_use") {
    toolNames.set(b.id, b.name);
    uses.set(b.name, (uses.get(b.name) ?? 0) + 1);
  }
  const toolErrors: ClientTelemetry["toolErrors"] = [];
  for (const u of events.filter((e) => e.type === "user")) for (const b of Array.isArray(u.message?.content) ? u.message.content : []) {
    if (b.type === "tool_result" && b.is_error) {
      const text = typeof b.content === "string" ? b.content : (b.content ?? []).map((c: Json) => c.text ?? `[${c.type}]`).join("\n");
      toolErrors.push({ tool: toolNames.get(b.tool_use_id) ?? "?", text: String(text).slice(0, 300) });
    }
  }
  const r = [...events].reverse().find((e) => e.type === "result");
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const porMensagem = new Map<string, Json>();
  for (const a of assistant) if (a.message?.usage && a.message?.model !== "<synthetic>") porMensagem.set(String(a.message.id ?? a.uuid ?? porMensagem.size), a.message.usage);
  const mu = [...porMensagem.values()];
  return {
    present: events.length > 0,
    init: init ? {
      tools: init.tools ?? [], mcpServers: (init.mcp_servers ?? []).map((s: Json) => ({ name: s.name, status: s.status })), model: init.model ?? null,
      apiKeySource: init.apiKeySource ?? null, permissionMode: init.permissionMode ?? null,
      plugins: (init.plugins ?? []).map((p: Json) => ({ name: p.name, source: p.source })), agents: init.agents ?? [], skills: init.skills ?? [],
      slashCommands: init.slash_commands ?? [], version: init.claude_code_version ?? null,
    } : null,
    models: [...new Set(assistant.map((a) => String(a.message?.model ?? "")).filter((m) => m && m !== "<synthetic>"))],
    assistantMessages: assistant.length,
    toolUses: [...uses].map(([name, count]) => ({ name, count })),
    toolErrors,
    apiRetries: events.filter((e) => e.type === "system" && e.subtype === "api_retry").map((e) => ({ attempt: e.attempt ?? 0, status: e.error_status ?? null, error: e.error ?? null })),
    result: r ? {
      subtype: r.subtype ?? null, isError: Boolean(r.is_error), apiErrorStatus: r.api_error_status ?? null, terminalReason: r.terminal_reason ?? null,
      stopReason: r.stop_reason ?? null, numTurns: r.num_turns ?? null, totalCostUsd: typeof r.total_cost_usd === "number" ? r.total_cost_usd : null,
      usage: r.usage ? { input: r.usage.input_tokens ?? 0, output: r.usage.output_tokens ?? 0, cacheRead: r.usage.cache_read_input_tokens ?? 0, cacheCreation: r.usage.cache_creation_input_tokens ?? 0 } : null,
      permissionDenials: r.permission_denials ?? [], text: String(r.result ?? "").slice(0, 500),
      durationMs: num(r.duration_ms), durationApiMs: num(r.duration_api_ms),
      usageDetail: r.usage ? {
        thinking: num(r.usage.output_tokens_details?.thinking_tokens), cacheCreation1h: num(r.usage.cache_creation?.ephemeral_1h_input_tokens),
        cacheCreation5m: num(r.usage.cache_creation?.ephemeral_5m_input_tokens), serviceTier: typeof r.usage.service_tier === "string" ? r.usage.service_tier : null,
      } : null,
      modelUsage: r.modelUsage && typeof r.modelUsage === "object" ? Object.entries(r.modelUsage as Record<string, Json>).map(([model, m]) => ({
        model, input: num(m.inputTokens) ?? 0, output: num(m.outputTokens) ?? 0, cacheRead: num(m.cacheReadInputTokens) ?? 0, cacheCreation: num(m.cacheCreationInputTokens) ?? 0,
        thinking: num(m.thinkingTokens), webSearchRequests: num(m.webSearchRequests), costUsd: num(m.costUSD), costBasis: typeof m.costBasis === "string" ? m.costBasis : null,
      })).sort((a, b) => a.model.localeCompare(b.model)) : null,
    } : null,
    messageUsage: {
      messages: mu.length, input: mu.reduce((n, u) => n + (num(u.input_tokens) ?? 0), 0), cacheRead: mu.reduce((n, u) => n + (num(u.cache_read_input_tokens) ?? 0), 0),
      cacheCreation: mu.reduce((n, u) => n + (num(u.cache_creation_input_tokens) ?? 0), 0), outputLowerBound: mu.reduce((n, u) => n + (num(u.output_tokens) ?? 0), 0),
    },
  };
}

/**
 * `evidence/uso.json` — o consumo da execução num bloco só, para medir quanto custa um slot (conta=api).
 * Lido do mesmo `stream-json` que já alimenta `run.json` (`usage`): nada novo é pedido ao cliente nem à imagem.
 * Guarda o MÉTODO de autenticação (declarado pelo runner) e a fonte da chave que o próprio cliente relatou
 * (`init.apiKeySource`: um nome, nunca o valor). `total_cost_usd` é a estimativa do cliente a preço de tabela:
 * com chave de API aproxima o débito em créditos da organização; com assinatura não é fatura.
 */
export interface UsoDaColeta {
  contract: "uso-coleta.v1";
  runId: string; fixture: boolean;
  authMethod: "api-key" | "oauth-subscription" | "unknown";
  /** `init.apiKeySource` do cliente (ex.: "ANTHROPIC_API_KEY", "none" com token OAuth); null sem evento init. */
  clientKeySource: string | null;
  /** result = evento final do cliente; mensagens = sem evento final, soma das mensagens (saída é piso); ausente = nada medido. */
  source: "result" | "mensagens" | "ausente";
  numTurns: number | null; totalCostUsd: number | null; durationMs: number | null; durationApiMs: number | null;
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number; cacheCreation1h: number | null; cacheCreation5m: number | null; thinking: number | null } | null;
  perModel: ModelUsage[] | null;
  partial: ClientTelemetry["messageUsage"] | null;
  note: string;
}

export function usoDaColeta(t: ClientTelemetry, authMethod: UsoDaColeta["authMethod"], id: { runId: string; fixture: boolean }): UsoDaColeta {
  const r = t.result;
  const source: UsoDaColeta["source"] = r?.usage ? "result" : t.messageUsage.messages > 0 ? "mensagens" : "ausente";
  const custo = authMethod === "api-key" ? "estimativa do cliente a preço de tabela; com chave de API aproxima o débito em créditos (a fatura do console é a medida final)"
    : authMethod === "oauth-subscription" ? "estimativa do cliente a preço de tabela; com assinatura não é fatura (o consumo sai da janela de uso)" : "estimativa do cliente";
  return {
    contract: "uso-coleta.v1", runId: id.runId, fixture: id.fixture, authMethod, clientKeySource: t.init?.apiKeySource ?? null, source,
    numTurns: r?.numTurns ?? null, totalCostUsd: r?.totalCostUsd ?? null, durationMs: r?.durationMs ?? null, durationApiMs: r?.durationApiMs ?? null,
    tokens: r?.usage ? { ...r.usage, cacheCreation1h: r.usageDetail?.cacheCreation1h ?? null, cacheCreation5m: r.usageDetail?.cacheCreation5m ?? null, thinking: r.usageDetail?.thinking ?? null } : null,
    perModel: r?.modelUsage ?? null,
    partial: source === "result" ? null : t.messageUsage.messages > 0 ? t.messageUsage : null,
    note: source === "result" ? `totalCostUsd: ${custo}${id.fixture ? "; dublê: números fixos, nunca custo" : ""}`
      : source === "mensagens" ? "sem evento result (agente interrompido): só a soma das mensagens; saída é piso, custo não medido"
      : "nenhum consumo medido",
  };
}

/** Motivo de falha a partir do erro de API que o cliente relatou (nunca "zero achados"). */
export function clientFailure(t: ClientTelemetry): { reason: "rate-limited" | "model-unavailable" | "auth-failed" | "harness-error"; interrupted: boolean; detail: string } | null {
  const s = t.result?.apiErrorStatus ?? null;
  if (!t.result?.isError || s === null) return null;
  const detail = `cliente: ${t.result.text || `erro de API ${s}`} (api_error_status ${s}, ${t.apiRetries.length} novas tentativas antes)`;
  if (s === 429) return { reason: "rate-limited", interrupted: true, detail };
  if (s === 529 || s === 503) return { reason: "model-unavailable", interrupted: true, detail };
  if (s === 401 || s === 403) return { reason: "auth-failed", interrupted: false, detail };
  return { reason: "harness-error", interrupted: false, detail };
}

// ───────────────────────────────────────────────────────────────── pedidos que o dublê recebeu

export interface StubSummary {
  requests: number;
  hosts: string[];
  paths: string[];
  credentialKinds: string[];
  mainRequests: number;
  auxiliaryRequests: number;
  /** Ferramentas anunciadas ao "modelo" (campo `tools` dos pedidos do laço principal), união e por pedido iguais? */
  advertisedTools: string[];
  advertisedStable: boolean;
  deferredTools: string[];
  promptDelivered: boolean;
  firstTurnMessagesSha256: string | null;
  /** Prompt de sistema do cliente no 1º pedido, sem o bloco de cobrança (ids por pedido). */
  firstTurnSystemSha256: string | null;
  usageSum: { input: number; output: number; cacheRead: number; cacheCreation: number };
  usageSumMain: { input: number; output: number; cacheRead: number; cacheCreation: number };
  httpErrors: { status: number; count: number }[];
  /** tool_result que o cliente devolveu ao "modelo": nome do pedido do roteiro → is_error. */
  toolResults: { toolUseId: string; isError: boolean; text: string }[];
}

export function summarizeStub(dir: string, promptSha256: string): StubSummary | null {
  const rows = ndjson(`${dir}/requests.ndjson`);
  if (!rows.length) return null;
  const msgs = rows.filter((r) => r.kind === "messages");
  const main = msgs.filter((r) => r.main);
  const toolSets = main.filter((r) => r.status === 200).map((r) => JSON.stringify([...(r.summary?.tools ?? [])].sort()));
  const sum = (xs: Json[]): StubSummary["usageSum"] => xs.reduce<StubSummary["usageSum"]>((a, r) => ({
    input: a.input + (r.usage?.input_tokens ?? 0), output: a.output + (r.usage?.output_tokens ?? 0),
    cacheRead: a.cacheRead + (r.usage?.cache_read_input_tokens ?? 0), cacheCreation: a.cacheCreation + (r.usage?.cache_creation_input_tokens ?? 0),
  }), { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
  const errors = new Map<number, number>();
  for (const r of msgs.filter((x) => x.status !== 200)) errors.set(r.status, (errors.get(r.status) ?? 0) + 1);
  const first = main.find((r) => r.turn === 0);
  const firstBody = first ? (() => {
    try { return JSON.parse(readFileSync(`${dir}/requests/${String(first.seq).padStart(3, "0")}.json`, "utf8")) as Json; } catch { return null; }
  })() : null;
  return {
    requests: rows.length,
    hosts: [...new Set(rows.map((r) => String(r.host ?? "")).filter(Boolean))].sort(),
    paths: [...new Set(rows.map((r) => `${r.method} ${String(r.path).split("?")[0]}`))].sort(),
    credentialKinds: [...new Set(rows.map((r) => String(r.credential?.kind ?? "?")))].sort(),
    mainRequests: main.length, auxiliaryRequests: msgs.length - main.length,
    advertisedTools: [...new Set(main.flatMap((r) => r.summary?.tools ?? []))].sort(),
    advertisedStable: new Set(toolSets).size <= 1,
    deferredTools: [...new Set(main.flatMap((r) => r.summary?.deferredTools ?? []))].sort(),
    promptDelivered: Boolean(first?.summary?.userTextSha256?.includes(promptSha256)),
    firstTurnMessagesSha256: firstBody?.messages ? sha256Json(firstBody.messages) : null,
    firstTurnSystemSha256: Array.isArray(firstBody?.system)
      ? sha256Json(firstBody!.system.filter((b: Json) => !String(b.text ?? "").startsWith("x-anthropic-billing-header"))) : null,
    usageSum: sum(msgs.filter((r) => r.status === 200)), usageSumMain: sum(main.filter((r) => r.status === 200)),
    httpErrors: [...errors].map(([status, count]) => ({ status, count })),
    toolResults: main.flatMap((r) => r.summary?.toolResults ?? []),
  };
}

const sha256Json = (v: unknown): string => createHash("sha256").update(JSON.stringify(v)).digest("hex");

// ───────────────────────────────────────────────────────────────── gate de aderência do oráculo

export interface Adherence {
  arm: Braco;
  normative: { tool: string; outcome: string }[];
  scan: { tool: string; outcome: string }[];
  verification: { tool: string; outcome: string }[];
  otherCalls: { tool: string; outcome: string }[];
  errors: { tool: string; outcome: string; detail?: string }[];
  /** Achados enviados que citam regra: os únicos que verify_finding consegue conferir. */
  applicableCandidates: number | null;
  verificationAvailable: boolean;
  verificationRequired: boolean;
  /** normativeOk = null: a consulta normativa não se aplica ao braço (ferramentas: o perfil não tem ferramenta normativa). */
  gate: { normativeOk: boolean | null; scanOk: boolean; verificationOk: boolean | null; met: boolean };
  usage: "absent-verified" | "used-adherent" | "available-unused" | "used-with-errors" | "unverified" | "not-applicable";
  note: string;
}

/**
 * Gate de aderência (plano T3): ao menos uma consulta normativa e um scan bem-sucedidos; verificação
 * quando há candidato aplicável (achado com `rule`) e a ferramenta existe. Sem cota artificial: uma
 * chamada de cada basta. Qualquer erro de ferramenta do oráculo → used-with-errors (o detalhe fica aqui).
 * NAT-61 (decisão 14): no braço ferramentas a consulta normativa é "não aplicável" (o perfil
 * knowledge-free não tem ferramenta normativa); o gate é scan + verificação quando houver candidato com regra.
 */
export function oracleAdherence(arm: Braco, ran: boolean, absentVerified: boolean, oracleEvents: Json[], exposed: string[], findings: { rule: unknown }[] | null): Adherence {
  const calls = oracleEvents.filter((e) => e.kind === "call").map((e) => ({ tool: String(e.tool), outcome: String(e.outcome), detail: e.detail ? String(e.detail) : undefined }));
  const pick = (names: string[]): { tool: string; outcome: string }[] => calls.filter((c) => names.includes(c.tool)).map(({ tool, outcome }) => ({ tool, outcome }));
  const applicable = findings ? findings.filter((f) => f.rule !== null && f.rule !== undefined && f.rule !== "").length : null;
  const verificationAvailable = exposed.some((t) => VERIFY_TOOLS.includes(t));
  const verificationRequired = (applicable ?? 0) > 0 && verificationAvailable;
  const ok = (xs: { outcome: string }[]): boolean => xs.some((x) => x.outcome === "ok");
  const normative = pick(NORMATIVE_TOOLS);
  const scan = pick(SCAN_TOOLS);
  const verification = pick(VERIFY_TOOLS);
  const normativeApplies = PERFIL_DO_BRACO[arm] !== "knowledge-free";
  const gate = { normativeOk: normativeApplies ? ok(normative) : null, scanOk: ok(scan), verificationOk: verificationRequired ? ok(verification) : null, met: false };
  gate.met = (gate.normativeOk ?? true) && gate.scanOk && (gate.verificationOk ?? true);
  const errors = calls.filter((c) => c.outcome !== "ok");
  let usage: Adherence["usage"];
  let note: string;
  if (!ran) { usage = "not-applicable"; note = "a execução não rodou"; }
  else if (arm === "sem") { usage = absentVerified ? "absent-verified" : "unverified"; note = absentVerified ? "oráculo ausente: inventário, DNS, ponte e chamadas" : "ausência do oráculo não comprovada"; }
  else if (!calls.length) { usage = "available-unused"; note = "oráculo anunciado, nenhuma chamada"; }
  else if (errors.length) { usage = "used-with-errors"; note = `${errors.length} chamada(s) do oráculo com erro: ${[...new Set(errors.map((e) => `${e.tool}/${e.outcome}`))].join(", ")}`; }
  else if (gate.met) {
    const consulta = normativeApplies ? "consulta normativa e scan" : "scan (consulta normativa não aplicável no perfil knowledge-free)";
    usage = "used-adherent";
    note = verificationRequired ? `${consulta}, e verificação, bem-sucedidos` : `${consulta} bem-sucedidos; verificação não exigida (${applicable === null ? "sem relatório aceito" : `${applicable} candidato(s) com regra`}${verificationAvailable ? "" : ", ferramenta indisponível"})`;
  }
  else { usage = "unverified"; note = `usado sem cumprir o gate: normativa ${gate.normativeOk}, scan ${gate.scanOk}, verificação ${gate.verificationOk}`; }
  return {
    arm, normative, scan, verification, otherCalls: calls.filter((c) => ![...NORMATIVE_TOOLS, ...SCAN_TOOLS, ...VERIFY_TOOLS].includes(c.tool)).map(({ tool, outcome }) => ({ tool, outcome })),
    errors, applicableCandidates: applicable, verificationAvailable, verificationRequired, gate, usage, note,
  };
}
