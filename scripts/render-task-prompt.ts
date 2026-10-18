/**
 * render-task-prompt — o texto exato da tarefa entregue ao agente, a partir da skill genérica
 * `skills/avaliar-tela/SKILL.md` e das entradas da execução (T2 do plano do benchmark isolado).
 *
 * Garantia de paridade entre braços: o texto depende SOMENTE de `TaskInputs` (URL, escopo, larguras,
 * meio para outras larguras, destino de envio, limites). O braço e os demais campos técnicos que
 * podem diferir entre execuções (`ARM_DIFF_ALLOWLIST`) não têm caminho até o texto: viajam em
 * `channel.env` / `channel.config`, que o runner (T3) entrega ao processo e ao coletor, nunca ao
 * prompt. `compareArmRenders` falha em qualquer diferença fora da allowlist e em qualquer byte
 * diferente no texto. O inventário de ferramentas do oráculo é a diferença intencional e mora na
 * configuração MCP, fora deste texto.
 *
 * Também é a fonte do vocabulário proibido (`FORBIDDEN_TASK_PATTERNS`) que `lint:protocol` aplica à
 * skill e que este módulo aplica às entradas: nada de pesquisa, gabarito, contagem de problemas,
 * ids normativos concretos, valores de token, anatomia do DS ou nomes de ferramenta do oráculo. Os
 * nomes das normas-alvo e os formatos de id com marcador são escopo da tarefa e são permitidos.
 *
 * Sem dependências além de `node:` — pode ser exportado para o pacote de coleta sem o govbr-eval.
 *
 * Uso:
 *   npm run render:tarefa -- --inputs <entradas.json> [--skill <SKILL.md>] [--out <prompt.txt>]
 *                            [--arm sem|com|ferramentas] [--run-id <id>]
 *   npm run render:tarefa -- --exemplo        (entradas de exemplo embutidas)
 * Imprime JSON com promptSha256, templateSha256, bytes e as chaves do canal lateral.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RENDERER_VERSION = "render-task-prompt-1.0.0";
export const SKILL_NAME = "avaliar-tela";
export const SKILL_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", SKILL_NAME, "SKILL.md");

export const sha256 = (text: string): string => createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
/** CRLF → LF: o hash não pode depender de `core.autocrlf` da máquina que fez checkout. */
export const normalizeNewlines = (text: string): string => text.replace(/\r\n?/g, "\n");

// ───────────────────────────────────────────────────────────────── entradas

export interface Viewport { width: number; height: number }
export interface TaskInputs {
  /** URL da tela, estável e igual nos dois braços. */
  url: string;
  /** Escopo como procedimento ("a tela inteira, em todos os estados alcançáveis pela interface"), nunca pista. */
  escopo: string;
  /** Larguras a cobrir. A primeira é a janela inicial fixada pelo ambiente. */
  larguras: Viewport[];
  /** Como alcançar as larguras além da primeira; obrigatório se houver mais de uma. Preenchido pelo runner (T3). */
  meioLarguras: string | null;
  envio: { origem: string; caminho: string };
  limites: { tempoMinutos: number; maxTurnos: number | null };
}

/**
 * Campos que PODEM diferir entre os braços de um mesmo par, e por onde cada um viaja. Nenhum entra
 * no texto da tarefa.
 */
export const ARM_DIFF_ALLOWLIST = {
  arm: "config — o runner gera a configuração MCP do braço (oráculo montado ou não); nunca texto",
  runId: "env (GOVBR_RUN_ID) + armação do coletor pelo runner; o coletor nomeia o arquivo pelo run armado, não pelo texto do agente",
  collectorToken: "env (GOVBR_COLLECTOR_TOKEN) — o proxy/coletor o aplica fora do agente; nunca texto",
  oracleProfile: "config — perfil de ferramentas do servidor MCP (com: evaluation; ferramentas: knowledge-free); null no sem",
} as const;
export type ArmDiffField = keyof typeof ARM_DIFF_ALLOWLIST;

export interface RunInputs {
  task: TaskInputs;
  /** NAT-61: três braços; o texto da tarefa é o MESMO nos três (só o canal lateral difere). */
  arm: "sem" | "com" | "ferramentas";
  runId: string;
  collectorToken: string | null;
  oracleProfile: string | null;
}

export interface RenderedTask {
  prompt: string;
  promptSha256: string;
  /** sha256 do SKILL.md com fins de linha normalizados (LF). */
  templateSha256: string;
  bytes: number;
  renderer: string;
}
export interface RenderedRun extends RenderedTask {
  /** Canal lateral: tudo o que difere entre braços, fora do texto. */
  channel: { env: Record<string, string>; config: { arm: "sem" | "com" | "ferramentas"; oracleProfile: string | null } };
}

// ───────────────────────────────────────────────────────────────── vocabulário proibido

export interface ForbiddenPattern { id: string; why: string; test: RegExp }

/** Nomes de ferramenta do oráculo (govbr-ds-validator/src/server.ts) e campos próprios dele. */
export const ORACLE_TOOL_NAMES = [
  "check_component_structure", "check_token_compliance", "get_component_spec", "get_design_tokens",
  "get_ds_rules", "get_emag_rules", "get_finding_details", "get_page_rules", "inspect_computed_styles",
  "list_components", "run_axe_scan", "save_report", "scan_page", "verify_finding", "scanId", "compareToScanId",
] as const;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Padrões que o texto da tarefa (skill + entradas) não pode conter. Valem também dentro de blocos de
 * código: o exemplo JSON faz parte do texto entregue.
 */
export const FORBIDDEN_TASK_PATTERNS: ForbiddenPattern[] = [
  { id: "contexto-de-pesquisa", why: "revela que a execução é parte de um estudo",
    test: /\b(tcc|benchmark|pesquisa|experiment\w*|abla[cç][aã]o|bra[cç]os?|tese|disserta[cç][aã]o|bateria)\b/i },
  { id: "gabarito", why: "menciona a referência de avaliação ou problemas plantados",
    test: /gabarito|ground[-_ ]?truth|answer[-_ ]?key|injetad[oa]s?|plantad[oa]s?|semead[oa]s?/i },
  { id: "contagem-de-problemas", why: "antecipa quantos problemas existem",
    test: /\b\d+\s+(problemas?|achados?|falhas?|erros?|n[ãa]o[- ]conformidades?)\b/i },
  // Os NOMES das normas-alvo (gov.br Design System, e-MAG, WCAG 2.2) e os formatos `emag:<seção>`,
  // `wcag:<critério>`, `ds:<regra>` são escopo da tarefa, iguais nos dois braços, e são permitidos.
  // Proibido é o identificador concreto: `wcag:4.1.2`, `emag:6.2`, `ds:botao-primario`, "e-MAG 6.2", "4.1.2".
  { id: "id-normativo", why: "traz um identificador normativo concreto (o formato com <marcador> é permitido)",
    test: /\b(wcag|e-?mag|aria|govbr)\s*[:.-]\s*\d|\be-?mag\s+\d+\.\d+|\bds\s*:\s*[\p{L}\d]|(?<![\d.])\d\.\d{1,2}\.\d{1,2}(?![\d.])/iu },
  { id: "anatomia-do-ds", why: "cita a anatomia do sistema de design (classes br-*)",
    test: /\bbr-[a-z]/i },
  { id: "valor-de-token", why: "traz um valor visual concreto (cor, medida) — norma escrita à mão",
    test: /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b\d+(\.\d+)?(px|rem|em|pt)\b/i },
  { id: "oraculo", why: "nomeia o oráculo ou uma ferramenta dele; os passos dependentes são condicionais e genéricos",
    test: new RegExp(`\\b(or[áa]culo|oracle|mcp|axe|${ORACLE_TOOL_NAMES.map(escapeRegExp).join("|")})\\b`, "i") },
];

export interface VocabularyHit { id: string; why: string; line: number; text: string }

export function scanForbidden(text: string): VocabularyHit[] {
  const hits: VocabularyHit[] = [];
  normalizeNewlines(text).split("\n").forEach((line, i) => {
    for (const p of FORBIDDEN_TASK_PATTERNS) if (p.test.test(line)) hits.push({ id: p.id, why: p.why, line: i + 1, text: line.trim() });
  });
  return hits;
}

// ───────────────────────────────────────────────────────────────── template

export const PLACEHOLDERS = ["URL", "ESCOPO", "LARGURAS", "MEIO_LARGURAS", "ORIGEM_ENVIO", "CAMINHO_ENVIO", "LIMITES"] as const;
const PLACEHOLDER = /\{\{([A-Z_]+)\}\}/g;

/** Retira o frontmatter (metadado de carregador de skill, não instrução). */
export function stripFrontmatter(text: string): string {
  const t = normalizeNewlines(text);
  if (!t.startsWith("---\n")) return t;
  const end = t.indexOf("\n---\n", 4);
  if (end < 0) throw new Error("frontmatter sem fechamento");
  return t.slice(end + 5).replace(/^\n+/, "");
}

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const TASK_KEYS = ["url", "escopo", "larguras", "meioLarguras", "envio", "limites"];

/** Validação estrita: chave desconhecida também é erro — um campo novo não entra no texto por acidente. */
export function validateTaskInputs(value: unknown): string[] {
  if (!isRecord(value)) return ["entradas: objeto"];
  const errors: string[] = [];
  for (const k of Object.keys(value)) if (!TASK_KEYS.includes(k)) errors.push(`entradas.${k}: campo desconhecido (o braço e campos técnicos viajam fora do texto)`);
  const v = value as Partial<TaskInputs>;
  for (const [k, u] of [["url", v.url], ["envio.origem", v.envio?.origem]] as const) {
    if (!isText(u) || !/^https?:\/\/[^\s]+$/.test(u)) errors.push(`entradas.${k}: URL http(s)`);
  }
  if (!isText(v.escopo)) errors.push("entradas.escopo: texto");
  if (!isRecord(v.envio) || !isText(v.envio.caminho) || !v.envio.caminho.startsWith("/")) errors.push("entradas.envio.caminho: caminho absoluto");
  if (isRecord(v.envio)) for (const k of Object.keys(v.envio)) if (!["origem", "caminho"].includes(k)) errors.push(`entradas.envio.${k}: campo desconhecido`);
  const okViewport = (w: unknown): boolean => isRecord(w) && Object.keys(w).length === 2 &&
    Number.isInteger(w.width) && Number.isInteger(w.height) && (w.width as number) > 0 && (w.height as number) > 0;
  if (!Array.isArray(v.larguras) || v.larguras.length === 0 || !v.larguras.every(okViewport)) {
    errors.push("entradas.larguras: lista não vazia de {width, height} inteiros positivos; a primeira é a janela inicial");
  } else if (v.larguras.length > 1 && !isText(v.meioLarguras)) {
    errors.push("entradas.meioLarguras: obrigatório quando há mais de uma largura (preenchido pelo runner)");
  }
  if (v.meioLarguras !== null && v.meioLarguras !== undefined && !isText(v.meioLarguras)) errors.push("entradas.meioLarguras: texto ou null");
  if (!("meioLarguras" in value)) errors.push("entradas.meioLarguras: obrigatório (null quando há uma largura)");
  const lim = v.limites;
  if (!isRecord(lim) || !Number.isInteger(lim.tempoMinutos) || (lim.tempoMinutos as number) <= 0 ||
    !(lim.maxTurnos === null || (Number.isInteger(lim.maxTurnos) && (lim.maxTurnos as number) > 0)) ||
    Object.keys(lim).some((k) => !["tempoMinutos", "maxTurnos"].includes(k))) {
    errors.push("entradas.limites: { tempoMinutos: inteiro > 0, maxTurnos: inteiro > 0 | null }");
  }
  return errors;
}

function formatInputs(t: TaskInputs): Record<(typeof PLACEHOLDERS)[number], string> {
  const fmt = (w: Viewport): string => `${w.width}×${w.height}`;
  const [first, ...rest] = t.larguras;
  return {
    URL: t.url,
    ESCOPO: t.escopo,
    LARGURAS: rest.length === 0
      ? `somente a janela inicial (${fmt(first)}).`
      : `a janela inicial (${fmt(first)}) e ${rest.map(fmt).join(", ")}.`,
    MEIO_LARGURAS: t.larguras.length > 1 ? t.meioLarguras! : "não há; o escopo cobre somente a janela inicial.",
    ORIGEM_ENVIO: t.envio.origem,
    CAMINHO_ENVIO: `\`${t.envio.caminho}\``,
    LIMITES: `até ${t.limites.tempoMinutos} minutos${t.limites.maxTurnos === null ? "" : ` e ${t.limites.maxTurnos} turnos`}.`,
  };
}

/** Função pura: template + entradas → texto exato da tarefa. Nunca recebe o braço. */
export function renderTaskPrompt(template: string, inputs: TaskInputs): RenderedTask {
  const errors = validateTaskInputs(inputs);
  if (errors.length) throw new Error(`entradas inválidas:\n  ${errors.join("\n  ")}`);
  const normalized = normalizeNewlines(template);
  const body = stripFrontmatter(normalized);
  const found = new Set([...body.matchAll(PLACEHOLDER)].map((m) => m[1]));
  const unknown = [...found].filter((p) => !(PLACEHOLDERS as readonly string[]).includes(p));
  const missing = PLACEHOLDERS.filter((p) => !found.has(p));
  if (unknown.length || missing.length) throw new Error(`template: marcadores desconhecidos ${JSON.stringify(unknown)}, ausentes ${JSON.stringify(missing)}`);
  const values = formatInputs(inputs);
  const valueHits = Object.entries(values).flatMap(([k, v]) => scanForbidden(v).map((h) => `${k}: [${h.id}] ${h.text}`));
  if (valueHits.length) throw new Error(`entradas com vocabulário proibido:\n  ${valueHits.join("\n  ")}`);
  const prompt = body.replace(PLACEHOLDER, (_, name: (typeof PLACEHOLDERS)[number]) => values[name]);
  if (PLACEHOLDER.test(prompt)) throw new Error("marcador restante depois da substituição");
  return {
    prompt,
    promptSha256: sha256(prompt),
    templateSha256: sha256(normalized),
    bytes: Buffer.byteLength(prompt, "utf8"),
    renderer: RENDERER_VERSION,
  };
}

/** Uma execução: o texto vem só de `run.task`; o resto vai para o canal lateral. */
export function renderRun(template: string, run: RunInputs): RenderedRun {
  const rendered = renderTaskPrompt(template, run.task);
  const env: Record<string, string> = { GOVBR_RUN_ID: run.runId };
  if (run.collectorToken !== null) env.GOVBR_COLLECTOR_TOKEN = run.collectorToken;
  return { ...rendered, channel: { env, config: { arm: run.arm, oracleProfile: run.oracleProfile } } };
}

/** Compara dois runs de um par: entradas fora da allowlist idênticas e texto idêntico byte a byte. */
export function compareArmRenders(a: { run: RunInputs; rendered: RenderedRun }, b: { run: RunInputs; rendered: RenderedRun }): string[] {
  const errors: string[] = [];
  const allowed = new Set<string>(Object.keys(ARM_DIFF_ALLOWLIST));
  const keys = new Set([...Object.keys(a.run), ...Object.keys(b.run)]);
  for (const k of keys) {
    if (allowed.has(k)) continue;
    const va = JSON.stringify((a.run as unknown as Record<string, unknown>)[k]);
    const vb = JSON.stringify((b.run as unknown as Record<string, unknown>)[k]);
    if (va !== vb) errors.push(`campo fora da allowlist difere entre os braços: ${k}`);
  }
  if (a.rendered.templateSha256 !== b.rendered.templateSha256) errors.push("templateSha256 difere");
  if (a.rendered.prompt !== b.rendered.prompt || a.rendered.promptSha256 !== b.rendered.promptSha256) {
    const pa = a.rendered.prompt, pb = b.rendered.prompt;
    let i = 0;
    while (i < pa.length && pa[i] === pb[i]) i++;
    errors.push(`texto da tarefa difere a partir do caractere ${i}: ${JSON.stringify(pa.slice(i, i + 40))} × ${JSON.stringify(pb.slice(i, i + 40))}`);
  }
  return errors;
}

/** Entradas de exemplo (portas da superfície local de medida; nenhuma pista sobre a tela). */
export const EXAMPLE_INPUTS: TaskInputs = {
  url: "http://127.0.0.1:3100/solicitacao.html",
  escopo: "a tela inteira, em todos os estados alcançáveis pela interface",
  larguras: [{ width: 1280, height: 900 }],
  meioLarguras: null,
  envio: { origem: "http://127.0.0.1:4100/", caminho: "/api/submit" },
  limites: { tempoMinutos: 30, maxTurnos: null },
};

// ───────────────────────────────────────────────────────────────── CLI

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const inputsPath = argValue(args, "--inputs");
  if (!inputsPath && !args.includes("--exemplo")) {
    console.error("Uso: npm run render:tarefa -- (--inputs <entradas.json> | --exemplo) [--skill <SKILL.md>] [--out <prompt.txt>] [--arm sem|com|ferramentas] [--run-id <id>]");
    process.exit(1);
  }
  const task = inputsPath ? JSON.parse(readFileSync(resolve(inputsPath), "utf8")) as TaskInputs : EXAMPLE_INPUTS;
  const template = readFileSync(resolve(argValue(args, "--skill") ?? SKILL_PATH), "utf8");
  const arm = (argValue(args, "--arm") ?? "sem") as "sem" | "com" | "ferramentas";
  if (arm !== "sem" && arm !== "com" && arm !== "ferramentas") throw new Error("--arm: sem | com | ferramentas");
  const rendered = renderRun(template, { task, arm, runId: argValue(args, "--run-id") ?? "sem-run-id", collectorToken: null, oracleProfile: null });
  const out = argValue(args, "--out");
  if (out) writeFileSync(resolve(out), rendered.prompt, "utf8");
  console.log(JSON.stringify({
    renderer: rendered.renderer, promptSha256: rendered.promptSha256, templateSha256: rendered.templateSha256,
    bytes: rendered.bytes, out: out ?? null, channel: { env: Object.keys(rendered.channel.env), config: rendered.channel.config },
  }, null, 2));
  if (!out) process.stdout.write(`\n${rendered.prompt}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
