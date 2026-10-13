/**
 * Decomposição real de uma alegação em átomos, e vínculos de revisão explícitos (NAT-72).
 *
 * Usado pela fila do painel (`painel/revisao.ts`) e pela bancada (`review-ui.ts`). Monta átomos a
 * partir do que a revisora escreveu, e NADA além disso: nenhum sujeito vai para um átomo sem ela o
 * pôr lá (a bancada antiga dava todos os sujeitos a cada átomo, e o átomo da unidade certa emprestava
 * crédito ao sujeito extra), nenhum vínculo nasce de regex, de id de regra ou da lista de candidatas.
 * A validação que decide é a do scorer (`scoreSemanticPackage`), chamada por quem grava; aqui só se
 * recusa cedo, com uma frase legível, o que o scorer recusaria.
 *
 * Este arquivo NÃO está em SCORER_FILES: não muda o que um cartão diz nem como é pontuado.
 */
import {
  DECISOES, RELACOES_VINCULO, VINCULO_CONTRATO, aceitaVinculos, cartaoDoVinculo,
  type RawReviewAtom, type ReviewCard, type ReviewLink, type SemanticPackage,
} from "./semantic-flow";

export interface PedidoVinculo {
  unitId: string;
  /** Sujeitos cobertos; ausente = os sujeitos do átomo (que a revisora escolheu). */
  sujeitos?: string[];
  /** Cena declarada; ausente = a cena do cartão (ou a escolhida, num cartão com segmentos). */
  cena?: string | null;
  estado: string;
  relacao: string;
  evidencia: string[] | string;
  justificativa: string;
}
export interface PedidoAtomo {
  texto: string;
  sujeitos: string[];
  decisao: string;
  citacao?: "supported" | "unsupported" | "uncertain";
  unitIds?: string[];
  vinculos?: PedidoVinculo[];
}
export type Montagem = { ok: true; atoms: RawReviewAtom[]; vinculos: number } | { ok: false; erro: string };

const texto = (x: unknown): string => typeof x === "string" ? x.trim() : "";
const lista = (x: unknown): string[] => (Array.isArray(x) ? x : typeof x === "string" ? x.split(";") : [])
  .map(s => String(s).trim()).filter(Boolean);

/** Vínculos de um átomo, já no contrato do scorer, assinados por quem decide e amarrados ao cartão. */
export function montarVinculos(pkg: SemanticPackage, card: ReviewCard, cena: string | null, revisora: string,
  sujeitosDoAtomo: string[], unitIds: string[], pedidos: PedidoVinculo[] | undefined): { ok: true; links: ReviewLink[] } | { ok: false; erro: string } {
  if (!pedidos?.length) return { ok: true, links: [] };
  if (!aceitaVinculos(pkg.version)) {
    return { ok: false, erro: `este pacote é ${pkg.version}: vínculo de revisão só existe a partir do scorer que o introduziu, e decisões antigas não recebem vínculo retroativo` };
  }
  const links: ReviewLink[] = [];
  for (const v of pedidos) {
    const unit = pkg.units.find(u => u.id === v.unitId);
    if (!unit) return { ok: false, erro: "o vínculo aponta uma unidade que não existe nesta referência" };
    if (!unitIds.includes(unit.id)) return { ok: false, erro: `o vínculo aponta ${unit.specId}, que esta parte não nomeia como unidade acertada` };
    const relacao = texto(v.relacao);
    if (!(RELACOES_VINCULO as readonly string[]).includes(relacao)) {
      return { ok: false, erro: `declare a relação do vínculo (${RELACOES_VINCULO.join(", ")})` };
    }
    const estado = texto(v.estado);
    if (estado !== unit.state) return { ok: false, erro: `declare o estado do vínculo: o defeito de ${unit.specId} é declarado no estado ${unit.state}` };
    const evidencia = lista(v.evidencia);
    if (!evidencia.length) return { ok: false, erro: "o vínculo precisa da evidência que mostra a relação (o que você mediu)" };
    const justificativa = texto(v.justificativa);
    if (!justificativa) return { ok: false, erro: "o vínculo precisa de justificativa própria" };
    const sujeitos = v.sujeitos?.length ? [...new Set(v.sujeitos.map(String))] : sujeitosDoAtomo;
    if (!sujeitos.every(s => sujeitosDoAtomo.includes(s))) return { ok: false, erro: "o vínculo só cobre sujeitos da própria parte" };
    links.push({ contrato: VINCULO_CONTRATO, unitId: unit.id, subjects: sujeitos, scene: texto(v.cena) || cena || card.scene,
      state: estado, relation: relacao as ReviewLink["relation"], evidence: evidencia, justification: justificativa,
      reviewer: revisora, binding: { build: card.binding.build, runScope: card.binding.runScope, card: cartaoDoVinculo(card) } });
  }
  return { ok: true, links };
}

/**
 * Átomos escritos pela revisora. Cada parte diz os seus sujeitos; todo sujeito do cartão (da cena
 * escolhida) tem de estar em alguma parte, e nenhum é atribuído por omissão.
 */
export function montarAtomos(pkg: SemanticPackage, card: ReviewCard, cena: string | null, revisora: string,
  sujeitosDoCartao: string[], candidatas: string[], pedidos: PedidoAtomo[]): Montagem {
  if (!Array.isArray(pedidos) || !pedidos.length) return { ok: false, erro: "a decomposição precisa de ao menos uma parte" };
  const cobertos = new Set<string>();
  const atoms: RawReviewAtom[] = [];
  let vinculos = 0;
  for (const [n, p] of pedidos.entries()) {
    const rot = `parte ${n + 1}`;
    const t = texto(p?.texto);
    if (!t) return { ok: false, erro: `${rot}: escreva o que esta parte afirma` };
    const sujeitos = [...new Set((p.sujeitos ?? []).map(String))];
    if (!sujeitos.length) return { ok: false, erro: `${rot}: escolha os elementos de que esta parte fala (nenhum é atribuído por omissão)` };
    const fora = sujeitos.find(s => !sujeitosDoCartao.includes(s));
    if (fora !== undefined) return { ok: false, erro: `${rot}: elemento que não é deste cartão${cena ? " nesta cena" : ""}` };
    if (!(p.decisao in DECISOES)) return { ok: false, erro: `${rot}: decisão desconhecida; use uma destas: ${Object.keys(DECISOES).join(", ")}` };
    if (p.decisao === "duplicada") return { ok: false, erro: `${rot}: “duplicada” vale para o cartão inteiro, não para uma parte` };
    const unitIds = p.decisao === "defeito-do-gabarito" ? [...new Set((p.unitIds ?? []).map(String))] : [];
    if (p.decisao === "defeito-do-gabarito" && !unitIds.length) return { ok: false, erro: `${rot}: escolha qual unidade esta parte acertou` };
    if (p.decisao !== "defeito-do-gabarito" && (p.vinculos?.length || p.unitIds?.length)) {
      return { ok: false, erro: `${rot}: só uma parte “defeito do gabarito” nomeia unidade ou vínculo` };
    }
    const v = montarVinculos(pkg, card, cena, revisora, sujeitos, unitIds, p.vinculos);
    if (!v.ok) return { ok: false, erro: `${rot}: ${v.erro}` };
    const semAncora = unitIds.filter(u => !candidatas.includes(u) && !v.links.some(l => l.unitId === u));
    if (semAncora.length) {
      return { ok: false, erro: `${rot}: unidade fora das candidatas sem vínculo de revisão (declare relação, estado, evidência e justificativa)` };
    }
    for (const s of sujeitos) cobertos.add(s);
    vinculos += v.links.length;
    atoms.push({ id: `a${n + 1}`, text: t, subjects: sujeitos, unitIds, citation: p.citacao ?? "uncertain",
      decisao: p.decisao as keyof typeof DECISOES, ...(v.links.length ? { links: v.links } : {}) });
  }
  // Um elemento vinculado não reaparece noutra parte “defeito do gabarito” (vínculo não multiplica crédito).
  const refs = atoms.filter(a => a.decisao === "defeito-do-gabarito");
  const repetido = sujeitosDoCartao.find(s => refs.filter(a => a.subjects.includes(s)).length > 1 && refs.some(a => a.subjects.includes(s) && a.links?.length));
  if (repetido !== undefined) return { ok: false, erro: "um elemento com vínculo de revisão só pode estar em uma parte “defeito do gabarito”" };
  const faltam = sujeitosDoCartao.filter(s => !cobertos.has(s));
  if (faltam.length) return { ok: false, erro: `${faltam.length} elemento(s) do cartão não estão em nenhuma parte: cada elemento alegado precisa de um julgamento` };
  return { ok: true, atoms, vinculos };
}
