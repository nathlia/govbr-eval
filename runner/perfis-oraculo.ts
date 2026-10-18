/**
 * Braço × perfil do servidor do oráculo (NAT-61, plano 2026-10-18 §5.3/§7.3; D-131 (b) da NAT-86).
 *
 * O BRAÇO é o rótulo do desenho experimental (sem | com | ferramentas). O PERFIL é o que o servidor do
 * oráculo de fato registrou (GOVBR_VALIDATOR_TOOL_PROFILE). Os dois nunca se confundem: esta tabela é a
 * única fonte do perfil que o runner PEDE para cada braço, e o perfil que vai para o run.json é o
 * MEDIDO — pelo tools/list que a ponte recebeu do servidor (nomes exatos + sha256 fixado) e pela marca
 * de telemetria do perfil knowledge-free (`knowledgeLockAttempts`). Pedido ≠ medido = isolamento falho.
 *
 * Por que medir: o validator cai em `full` em silêncio com um perfil desconhecido; um rótulo constante
 * ("combined", como o runner v1 gravava) continuaria dizendo a mesma coisa se o perfil do contêiner mudasse.
 */
import { createHash } from "node:crypto";

export type Braco = "sem" | "com" | "ferramentas";
export const BRACOS: readonly Braco[] = ["sem", "com", "ferramentas"];
export type PerfilOraculo = "evaluation" | "knowledge-free";

/** Perfil que o runner pede ao servidor do oráculo em cada braço (null = sem oráculo). */
export const PERFIL_DO_BRACO: Readonly<Record<Braco, PerfilOraculo | null>> = { sem: null, com: "evaluation", ferramentas: "knowledge-free" };

export const temOraculo = (b: Braco): boolean => PERFIL_DO_BRACO[b] !== null;

/**
 * Ferramentas que cada perfil registra, em ordem alfabética, e o sha256 de `JSON.stringify(tools)` do
 * tools/list (cliente MCP 1.29.0, o mesmo da ponte). Valores fixados no validator 2.14.0:
 *   - knowledge-free: test/integration/knowledge-free.test.ts (KNOWLEDGE_FREE_TOOLS_SHA256);
 *   - evaluation: o mesmo teste (EVALUATION_TOOLS_SHA256_2_13_0, invariância 2.13.0 → 2.14.0).
 * Medidos de novo em 2026-10-18 contra o dist/ do validator f97aa7d com o SDK 1.29.0 da ponte.
 * Mudou de propósito? Mude aqui E no validator, e declare: é diferença de tratamento do braço.
 */
export const PERFIS: Readonly<Record<PerfilOraculo, { tools: readonly string[]; toolsListSha256: string }>> = {
  evaluation: {
    tools: ["get_component_spec", "get_design_tokens", "get_ds_rules", "get_emag_rules", "get_finding_details", "get_page_rules", "scan_page", "verify_finding"],
    toolsListSha256: "3d70162f5fed0ec8614d9dcbc18a69a00b4819ad56df1ed1c5bf95213eed0b3b",
  },
  "knowledge-free": {
    tools: ["get_finding_details", "scan_page", "verify_finding"],
    toolsListSha256: "72abd54968cbe3173fce5dd3b4bba7aff563b37ca11b8a9ec0f25a91a104d39c",
  },
};

/** Ferramentas que a ponte do oráculo deixa passar em cada braço (`--allow`): exatamente as do perfil pedido. */
export function allowDoBraco(b: Braco): readonly string[] {
  const p = PERFIL_DO_BRACO[b];
  return p ? PERFIS[p].tools : [];
}

export const toolsListSha256 = (tools: unknown[]): string => createHash("sha256").update(JSON.stringify(tools)).digest("hex");

/** O que a ponte do oráculo gravou no inventário (bridge.mjs, bridge-1.1.0). */
export interface InventarioOraculo {
  childTools: string[]; exposed: string[]; hidden: string[]; allow?: string[] | null;
  childToolsSha256?: string; exposedToolsSha256?: string;
  /** O tools/list exposto, integral (o hash é conferido de novo aqui, sobre estes bytes). */
  toolsList?: unknown[];
  serverInfo?: { name?: string; version?: string } | null;
}

/**
 * Perfil medido: o perfil cujo tools/list fixado (nomes exatos + sha256) é o que o SERVIDOR anunciou à
 * ponte (childTools, antes de qualquer filtro) — o servidor é quem diz o perfil, não a ponte. A
 * telemetria entra como segunda medida: o perfil knowledge-free marca todo evento com
 * `knowledgeLockAttempts`; o evaluation nunca. null = não bate com nenhum perfil conhecido.
 */
export function perfilMedido(inv: InventarioOraculo | null, telemetria: Record<string, unknown>[] = []): {
  perfil: PerfilOraculo | null; fonte: string; problemas: string[];
} {
  if (!inv) return { perfil: null, fonte: "sem inventário da ponte do oráculo", problemas: ["a ponte do oráculo não gravou inventory.json"] };
  const problemas: string[] = [];
  const nomes = [...inv.childTools].sort();
  const porNomes = (Object.keys(PERFIS) as PerfilOraculo[]).filter((p) => JSON.stringify(PERFIS[p].tools) === JSON.stringify(nomes));
  const porHash = (Object.keys(PERFIS) as PerfilOraculo[]).filter((p) => PERFIS[p].toolsListSha256 === inv.childToolsSha256);
  let perfil: PerfilOraculo | null = porNomes.length === 1 && porHash.length === 1 && porNomes[0] === porHash[0] ? porNomes[0] : null;
  if (!perfil) problemas.push(`tools/list do servidor (${nomes.join(", ")}; sha256 ${String(inv.childToolsSha256 ?? "ausente").slice(0, 12)}) não é o de nenhum perfil fixado`);
  const comMarca = telemetria.filter((e) => "knowledgeLockAttempts" in e).length;
  if (telemetria.length) {
    const marcado = comMarca === telemetria.length ? "knowledge-free" : comMarca === 0 ? "evaluation" : null;
    if (marcado === null) { problemas.push(`telemetria mista: ${comMarca}/${telemetria.length} eventos com a marca do perfil knowledge-free`); perfil = null; }
    else if (perfil && marcado !== perfil) { problemas.push(`telemetria diz ${marcado}, tools/list diz ${perfil}`); perfil = null; }
  }
  return { perfil, fonte: `tools/list do servidor na ponte (nomes + sha256 fixado)${telemetria.length ? ` + telemetria (${telemetria.length} eventos, ${comMarca} com a marca knowledge-free)` : "; telemetria sem eventos"}`, problemas };
}
