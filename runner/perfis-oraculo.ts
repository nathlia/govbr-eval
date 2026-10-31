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
 * tools/list (cliente MCP 1.29.0, o mesmo da ponte). Os pins VIGENTES (só para campanhas NOVAS) são os do
 * validator 3.6.1 (3e0897b), medidos em 2026-10-31 contra o dist/ construído de 3e0897b com o
 * SDK 1.29.0 da ponte (stdio, GOVBR_VALIDATOR_TOOL_PROFILE=<perfil>, sem GOVBR_RETRIEVAL_MODE = busca
 * léxica padrão, sha256 de JSON.stringify(tools)) e de novo dentro da imagem do oráculo travada.
 * Da 3.6.0 para a 3.6.1 mudaram evaluation, full, normative e deterministic; knowledge-free e evidence
 * ficaram iguais (o instructionsSha256 do knowledge-free mudou — instruções do servidor, fora do tools/list).
 * Da 3.5.0 para a 3.6.0 mudaram evaluation, full e normative; knowledge-free, deterministic e evidence
 * ficaram iguais.
 * Da 3.4.x para a 3.5.0 mudaram evaluation, full e normative; knowledge-free, deterministic e evidence
 * ficaram iguais.
 * Da 3.0.0 para a 3.2.0 mudaram evaluation, full e normative (o get_ds_rules ganhou o parâmetro opcional
 * `retrieval`); knowledge-free, deterministic e evidence ficaram iguais.
 * As campanhas históricas guardam os próprios pins no campaign.json (2.14.0: evaluation 3d70162f…,
 * knowledge-free 72abd549…); a tabela da 3.0.0 fica abaixo só como registro.
 * Mudou de propósito? Mude aqui E no validator, e declare: é diferença de tratamento do braço.
 */
export const TOOLS_LIST_SHA256_3_6_1 = {
  "knowledge-free": "f358152ab77b8b6930687c1b12206f3821170600d52c0fda0a3dde8d0774bf44",
  evaluation: "3807ad9534e64155cc8d38bdcdfb16413ec195d482d119cedb16776420aa8063",
  full: "575634a0295e2a7d7c3c4e573e589a63409bcc013685695b97598694a196a2fe",
  normative: "4ad616d86c8d480cd253b13990310f1b321e817e8937ff0da9181ac7371f4645",
  deterministic: "af7f8264d063cce3f5eda0604cff5e7dfb200de3f9d848fc797e210dafebb656",
  evidence: "4b4f82499cfe923b26f178c9dff3f5dcf233512ddbee6128b5a6bd0cc7a81ba7",
} as const;

/** Registro: pins do validator 3.6.0 (ee08428, medidos em 2026-10-30), vigentes até a 3.6.1 (3e0897b). Não usados pelo runner. */
export const TOOLS_LIST_SHA256_3_6_0 = {
  "knowledge-free": "f358152ab77b8b6930687c1b12206f3821170600d52c0fda0a3dde8d0774bf44",
  evaluation: "cbfffb0deee45e1df35d2c1d44738f2a2065abd3385d467adbb252f79dc022f0",
  full: "c98487234209c3134ab93f6fa0bbc54816d72ebae550cc678624911361927fb0",
  normative: "0a0c7626866f1897d36546662a12beaa8976582a42337aad40c326721dcb4654",
  deterministic: "145b51e4da8ae7fb58a5cefc7b031352bfbf0ca1f53f983e26ac817f9a6c115a",
  evidence: "4b4f82499cfe923b26f178c9dff3f5dcf233512ddbee6128b5a6bd0cc7a81ba7",
} as const;

/** Registro: pins do validator 3.5.0 (4c3b2ab, medidos em 2026-10-30), vigentes até a 3.6.0 (ee08428). Não usados pelo runner. */
export const TOOLS_LIST_SHA256_3_5_0 = {
  "knowledge-free": "f358152ab77b8b6930687c1b12206f3821170600d52c0fda0a3dde8d0774bf44",
  evaluation: "61177aa7f89b77801e4d8236a376361ffe4c57d574e3e67bf23678174b397f38",
  full: "fde63c047a3265114ef22a19bc541375f1ae42496b3b0d82b5336cff0069ef0c",
  normative: "9028ac6d3574020532135e2e3ce34d20debaa1695dd2ef8b8fd8d3f0206f0f57",
  deterministic: "145b51e4da8ae7fb58a5cefc7b031352bfbf0ca1f53f983e26ac817f9a6c115a",
  evidence: "4b4f82499cfe923b26f178c9dff3f5dcf233512ddbee6128b5a6bd0cc7a81ba7",
} as const;

/** Registro: pins do validator 3.4.0 (994dec6, medidos em 2026-10-28), vigentes até a 3.4.4 (b6e0663). Não usados pelo runner. */
export const TOOLS_LIST_SHA256_3_4_0 = {
  "knowledge-free": "f358152ab77b8b6930687c1b12206f3821170600d52c0fda0a3dde8d0774bf44",
  evaluation: "adc4266162781cb6239ee4e84ae852889ceeb209556bf7270c267b015884c6b2",
  full: "dfa9553efd67b16e524c9ce6c6388b07b39852e4ecc5405c98a6633ab8d2857b",
  normative: "bb51f7017192343e6e858330264614485c0658e811e1f4021aee9c1272c2ecad",
  deterministic: "145b51e4da8ae7fb58a5cefc7b031352bfbf0ca1f53f983e26ac817f9a6c115a",
  evidence: "4b4f82499cfe923b26f178c9dff3f5dcf233512ddbee6128b5a6bd0cc7a81ba7",
} as const;

/** Registro: pins do validator 3.2.0 (4067591, NAT-107), vigentes até a 3.4.0 (994dec6). Não usados pelo runner. */
export const TOOLS_LIST_SHA256_3_2_0 = {
  "knowledge-free": "8bdb5e35ed3346a91b227b45034d64c849f1d21baeb6d5affc995a4ea02c7dee",
  evaluation: "f15292681d18f1f516373e741e3e03911b32acc207ba6813cde046a1d33ebf60",
  full: "418d605411284eb26df518633c0bc17366ce7ec1917efde9d1bc6145cbc5996e",
  normative: "1642af4bda46eaf7f88a19f2d860e12417f947186417a52900ce158d40bc3ba0",
  deterministic: "7e3feff342cacf5d921beb7633dea098ef956f41ceb49326f6523e20d6a7f838",
  evidence: "9a7ec0b3b05785fdd3e542f907fccb1d501226c101cb32cb6477c12f6eee87d0",
} as const;

/** Registro: pins do validator 3.0.0 (0234867, NAT-99), vigentes até a 3.2.0. Não usados pelo runner. */
export const TOOLS_LIST_SHA256_3_0_0 = {
  "knowledge-free": "8bdb5e35ed3346a91b227b45034d64c849f1d21baeb6d5affc995a4ea02c7dee",
  evaluation: "9b32f185cd7d2c436fb7c3c59800b5a87e6b7c3c59db00715c1f3532044d20bc",
  full: "919784c92d9cf434f7fb27619055e0812a046a6158442601627fd581e887d9f2",
  normative: "54cee921ae98b241cead17c8e0cdf03cc9ec0bb562a78d81fa0461320150b732",
  deterministic: "7e3feff342cacf5d921beb7633dea098ef956f41ceb49326f6523e20d6a7f838",
  evidence: "9a7ec0b3b05785fdd3e542f907fccb1d501226c101cb32cb6477c12f6eee87d0",
} as const;

export const PERFIS: Readonly<Record<PerfilOraculo, { tools: readonly string[]; toolsListSha256: string }>> = {
  evaluation: {
    tools: ["get_component_spec", "get_design_tokens", "get_ds_rules", "get_emag_rules", "get_finding_details", "get_page_rules", "scan_page", "verify_finding"],
    toolsListSha256: TOOLS_LIST_SHA256_3_6_1.evaluation,
  },
  "knowledge-free": {
    tools: ["get_finding_details", "scan_page", "verify_finding"],
    toolsListSha256: TOOLS_LIST_SHA256_3_6_1["knowledge-free"],
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
  serverInfo?: { name?: string; version?: string; description?: string | null } | null;
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
  // Segunda medida do servidor (validator ≥ 2.17.1): serverInfo.description = "toolProfile=<perfil>". Ausente ou
  // diferente do perfil do tools/list = falha fechada (o validator 3.6.1 que as campanhas novas fixam sempre a anuncia).
  const declarado = /(?:^|\s)toolProfile=(\S+)/.exec(inv.serverInfo?.description ?? "")?.[1] ?? null;
  if (!declarado) { problemas.push(`serverInfo.description sem toolProfile=<perfil> (${JSON.stringify(inv.serverInfo?.description ?? null)})`); perfil = null; }
  else if (perfil && declarado !== perfil) { problemas.push(`serverInfo diz toolProfile=${declarado}, tools/list diz ${perfil}`); perfil = null; }
  const comMarca = telemetria.filter((e) => "knowledgeLockAttempts" in e).length;
  if (telemetria.length) {
    const marcado = comMarca === telemetria.length ? "knowledge-free" : comMarca === 0 ? "evaluation" : null;
    if (marcado === null) { problemas.push(`telemetria mista: ${comMarca}/${telemetria.length} eventos com a marca do perfil knowledge-free`); perfil = null; }
    else if (perfil && marcado !== perfil) { problemas.push(`telemetria diz ${marcado}, tools/list diz ${perfil}`); perfil = null; }
  }
  return { perfil, fonte: `tools/list do servidor na ponte (nomes + sha256 fixado) + serverInfo.description (toolProfile=)${telemetria.length ? ` + telemetria (${telemetria.length} eventos, ${comMarca} com a marca knowledge-free)` : "; telemetria sem eventos"}`, problemas };
}
