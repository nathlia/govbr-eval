/**
 * E14: verificação de cegueira da fila T3. Porta, para os lotes da T3, a conferência da NAT-73
 * (`ratificacao/verificar-cegueira.mjs`): os mesmos padrões proibidos (FALHA) e o mesmo relato dos sinais que
 * ainda denunciam o braço apesar da máscara (RELATA, por cartão; plano §6.6, risco 4).
 *
 * FALHA se um arquivo entregue ao juiz contém: runId, braço, campanha, modelo, M-xxxx, cardId/unitId, vocabulário
 * de decisão arquivada, id do oráculo sem máscara, id de sessão de ferramenta, termo de ferramenta do oráculo, o
 * runId/cardId/M-xxxx exatos de qualquer átomo da fila, ou trecho (40 caracteres) da justificativa arquivada ou das
 * notas do revisor novo do próprio átomo. Única exceção (e só para os padrões de vocabulário): a palavra já está no
 * texto do próprio cartão (o que o autor escreveu), e então é relatada como coincidência, não falha.
 */
import { armLeaks, type SemanticPackage } from "../semantic-flow";
import type { ParLido } from "./comum";
import { CONTEM_ID_DE_FERRAMENTA, ID_DE_FERRAMENTA, mascarar, type CartaoCego, type ItemChave } from "./e14-comum";

type Card = ParLido["pkg"]["cards"][number];

/** Padrões da NAT-73 (verificar-cegueira.mjs), na mesma ordem. */
export const PROIBIDOS: readonly [string, RegExp][] = [
  ["runId (formato)", /\d{8}-\d{6}-[a-z]+-(?:com|sem)-[0-9a-f]{4}/i],
  ["valor de braço", /linha-de-base[:/](?:axe|validator)|oracleProfile|com-or[aá]culo|sem-or[aá]culo|"(?:com|sem)"/i],
  ["palavra braço", /\bbra[çc]os?\b|\barm\b/i],
  ["campanha", /\bt7[bc]?-|t7b|t7c|tela-[ab]-01/i],
  ["modelo", /\b(?:sonnet|opus|haiku|claude-|gpt|gemini)/i],
  ["id interno M-xxxx", /\bM-\d{4}\b/],
  ["cardId/unitId/amostra", /\b[CU]-[0-9a-f]{12,}|\bS-[0-9a-f]{10}\b/],
  ["decisão arquivada", /defeito-novo-correto|defeito-do-gabarito|\bincorreta\b|\bduplicada\b|evidencia-insuficiente|\bnovel\b|agente-revisor/i],
  ["id do oráculo sem máscara", /\bds[-:](?!entregue\b)[a-z][a-z0-9]*(?:-[a-z0-9]+)*|\bgovbr-\d+(?:\.\d+)*-/],
  ["id de sessão de ferramenta", /\bS-page-\d+\b|\b[FV]-\d{3}\b/],
  ["termo de ferramenta do oráculo", /or[aá]culo|scan_page|get_ds_rules|get_component_spec|verify_finding|get_design_tokens|check_token_compliance|\bmcp\b|validator/i],
];
/** Padrões em que a palavra pode ser do próprio cartão (o autor a escreveu); aí é coincidência relatada. */
const VOCABULARIO = new Set(["palavra braço", "decisão arquivada"]);

const escRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const norm = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").toLowerCase();
export const janelas = (t: string | null | undefined): string[] => {
  const n = norm(t), out: string[] = [];
  for (let i = 0; i + 40 <= n.length; i += 20) out.push(n.slice(i, i + 40));
  return out;
};

export interface EntradaCegueira {
  /** Arquivos que o juiz recebe (lotes, LEIAME, esquema). */
  arquivos: { rel: string; texto: string }[];
  /** Cada cartão cego com o cartão arquivado de origem e a linha da chave. */
  cartoes: { cartao: CartaoCego; card: Card; item: ItemChave; justificativas: string[] }[];
}
export interface Falha { arquivo: string; cartao: string | null; regra: string; trecho: string }
export interface SinaisDoCartao { id: string; sinais: string[]; retirados: { idsDeFerramenta: number; caminhosLocais: number; emagHifen: number; notasEEscopo: boolean };
  coincidencias: string[] }
export interface Cegueira { falhas: Falha[]; porCartao: SinaisDoCartao[]; padroes: number; janelas: number }

/** Texto original do cartão que o juiz vê (mascarado), para a exceção de vocabulário. */
const textoDoCartao = (c: Card): string => [c.observed, c.description, c.expected, c.rule, c.selector, ...(c.evidence ?? []).map(e => e.ref), ...(c.flags ?? []),
  ...c.subjects.map(s => s.label), ...(c.state?.steps ?? [])].map(x => mascarar(x ?? "")).join("\n");

/**
 * Texto que não vem do arquivo da análise: o do próprio cartão, os fatos medidos na página congelada e a norma citada.
 * Uma janela da justificativa que também está aqui é citação da página ou do cartão (coincidência), não vazamento.
 */
const publico = (x: { cartao: CartaoCego; card: Card }): string =>
  norm([textoDoCartao(x.card), JSON.stringify(x.cartao.fatosMedidos), JSON.stringify(x.cartao.normaCitada)].join("\n"));

export function verificarCegueira(e: EntradaCegueira): Cegueira {
  const falhas: Falha[] = [];
  const exatos: [string, RegExp][] = [];
  for (const { item } of e.cartoes) {
    exatos.push([`runId exato (${item.id})`, new RegExp(escRe(item.runId))]);
    exatos.push([`cardId exato (${item.id})`, new RegExp(escRe(item.cardIdOriginal.slice(2, 26)))]);
    if (item.mId) exatos.push([`id exato (${item.id})`, new RegExp("\\b" + escRe(item.mId) + "\\b")]);
  }
  for (const c of new Set(e.cartoes.map(x => x.item.campanha))) exatos.push([`campanha exata`, new RegExp(escRe(c))]);
  const porId = new Map(e.cartoes.map(x => [x.cartao.id, x]));
  let nJanelas = 0;
  for (const f of e.arquivos) {
    // Os lotes são varridos cartão a cartão (para a exceção de vocabulário e as janelas do próprio átomo); o resto, inteiro.
    let blocos: { cartao: string | null; texto: string }[] = [{ cartao: null, texto: f.texto }];
    let corpo: { cartoes?: CartaoCego[] } | null = null;
    if (f.rel.endsWith(".json")) { try { corpo = JSON.parse(f.texto); } catch { corpo = null; } }
    if (corpo?.cartoes) blocos = [{ cartao: null, texto: JSON.stringify({ ...corpo, cartoes: [] }) }, ...corpo.cartoes.map(c => ({ cartao: c.id, texto: JSON.stringify(c) }))];
    for (const b of blocos) {
      const origem = b.cartao ? porId.get(b.cartao) : undefined;
      const original = origem ? textoDoCartao(origem.card) : "";
      for (const [nome, re] of [...PROIBIDOS, ...exatos]) {
        const m = b.texto.match(re);
        if (!m) continue;
        if (VOCABULARIO.has(nome) && origem && new RegExp(re.source, re.flags).test(original)) continue; // coincidência: relatada abaixo
        falhas.push({ arquivo: f.rel, cartao: b.cartao, regra: nome, trecho: b.texto.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\s+/g, " ") });
      }
      const n = norm(b.texto);
      const proprias = origem ? origem.justificativas : b.cartao === null && !corpo?.cartoes ? e.cartoes.flatMap(x => x.justificativas) : [];
      for (const j of proprias) for (const w of janelas(j)) {
        nJanelas++;
        if (n.includes(w) && !(origem && publico(origem).includes(w))) { falhas.push({ arquivo: f.rel, cartao: b.cartao, regra: "trecho da justificativa arquivada ou nota do revisor", trecho: w }); break; }
      }
    }
  }
  // ── Relato: o que ainda denuncia o braço depois da máscara (por cartão; nada disto falha).
  const porCartao: SinaisDoCartao[] = e.cartoes.map(({ cartao, card }) => {
    const visivel = JSON.stringify(cartao);
    const sinais: string[] = [];
    if (/\[regra citada\]/.test(JSON.stringify(cartao.alegacao)) || cartao.normaCitada?.fonte.startsWith("base de regras do DS")) sinais.push("regra da base do DS citada pelo cartão (id mascarado, [regra citada])");
    const regra = card.rule ?? "";
    if (card.origin === "agente" && regra && !/^(?:wcag|emag):/.test(regra) && !/^ds[-:]|^govbr-/.test(regra)) sinais.push(`id de regra do axe no cartão do agente (${regra}); não se mascara: é a norma`);
    if (card.origin !== "agente") sinais.push("texto fixo de ferramenta automática (reconhecível pela forma)");
    const pseudo = { cards: [{ id: cartao.id, description: [cartao.alegacao.regra, ...cartao.alegacao.sinais].filter(Boolean).join(" "), reportedEvidence: [],
      observed: cartao.alegacao.observado, expected: cartao.alegacao.esperado }] } as unknown as SemanticPackage;
    const termos = armLeaks(pseudo).flatMap(l => l.termos);
    if (termos.length) sinais.push(`termo de ferramenta no texto após a máscara: ${termos.join(", ")}`);
    const bruto = JSON.stringify({ o: card.observed, e: card.expected, d: card.description, r: card.rule, ev: card.evidence, st: card.state });
    const coincidencias = PROIBIDOS.filter(([n]) => VOCABULARIO.has(n)).filter(([, re]) => re.test(visivel)).map(([n]) => `${n} no texto do próprio cartão`);
    return { id: cartao.id, sinais, coincidencias,
      retirados: { idsDeFerramenta: (card.evidence ?? []).filter(x => ID_DE_FERRAMENTA.test(x.ref) || CONTEM_ID_DE_FERRAMENTA.test(x.ref)).length, caminhosLocais: (bruto.match(/\/tmp\/pw-/g) ?? []).length, emagHifen: (bruto.match(/\bemag-\d/g) ?? []).length,
        notasEEscopo: !!(card.reportedEvidence as { notes?: unknown; scope?: unknown } | null)?.notes || !!(card.reportedEvidence as { scope?: unknown[] } | null)?.scope?.length } };
  });
  return { falhas, porCartao, padroes: PROIBIDOS.length + exatos.length, janelas: nJanelas };
}
