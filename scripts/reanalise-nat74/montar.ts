/**
 * E8 (plano §5, P3, P8): monta as decisões (1.7.0; 1.8.0 com domínio provado no derivado 1.2.0) de um par a partir dos átomos classificados e pontua
 * com o `scoreSemanticPackage` vigente. Vínculos traduzidos mecanicamente pela árvore medida (P8);
 * decisão recusada pelas barreiras do scorer fica PENDENTE e listada — nunca forçada.
 */
import {
  cartaoDoVinculo, participanteDePagina, scoreSemanticPackage, tocaParticipante, VINCULO_CONTRATO,
  type ReviewAtom, type ReviewLink, type SemanticDecision, type SemanticPackage, type SemanticReviews,
} from "../semantic-flow";
import { tradutor, type MapaRetrospectivo } from "./mapa";
import type { AtomoClassificado, ParteClassificada } from "./politica";

type Card = SemanticPackage["cards"][number];
type Unit = SemanticPackage["units"][number];
type Subject = Card["subjects"][number];

/** Réplica da ancoragem estrita do scorer (só para escolher a unidade; quem decide é o scorer). */
function ancorado(s: Subject, card: Card, u: Unit): boolean {
  const scene = s.scene ?? card.scene;
  const related = s.scene ? card.segmentos?.find(o => o.scene === s.scene)?.relatedKeys ?? [] : card.relatedKeys;
  return s.key !== null && scene === u.scene && (u.participants.some(p => tocaParticipante(s.key!, p)) || u.participants.some(p => related.some(k => tocaParticipante(k, p))));
}
const prefixoComum = (a: string, b: string): number => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

export interface VinculoTraduzido { subject: string; unitId: string; relacao: ReviewLink["relation"]; participante: string }

/** P8: relação pela árvore medida. */
export function relacaoMedida(key: string, u: Unit): { relacao: ReviewLink["relation"]; participante: string } {
  for (const p of u.participants) if (participanteDePagina(p) && (key === "" || tocaParticipante(p, key))) return { relacao: "ausencia-global", participante: p };
  for (const p of u.participants) {
    const [hk, hp] = [key.split(" >>> ")[0], p.split(" >>> ")[0]];
    if ((key.includes(" >>> ") || p.includes(" >>> ")) && (tocaParticipante(key, hp) || tocaParticipante(p, hk) || hk === hp)) return { relacao: "host-interno", participante: p };
  }
  const p = [...u.participants].sort((a, b) => prefixoComum(b, key) - prefixoComum(a, key) || (a < b ? -1 : 1))[0] ?? "";
  return { relacao: "participante-relacionado", participante: p };
}

/** [1.2.0] Relação pelo predicado medido na cena do domínio: a do próprio defeito, com o participante medido NESTA cena. */
export function relacaoNoDominioMedido(key: string, e: NonNullable<Unit["domain"]>[number]): { relacao: ReviewLink["relation"]; participante: string } {
  if (e.kind === "ausencia-global") return { relacao: "ausencia-global", participante: e.participants.find(p => participanteDePagina(p) && (key === "" || tocaParticipante(p, key))) ?? e.participants[0] };
  return { relacao: "participante-relacionado", participante: e.participants.find(p => p !== "" && (tocaParticipante(key, p) || (e.kind === "documento" && key === ""))) ?? e.participants[0] };
}

/** Id do átomo montado para a parte `k` do átomo arquivado `id` (a parte 0 mantém o id arquivado). */
export const idDaParte = (id: string, k: number): string => (k === 0 ? id : `${id}.${k}`);

/** M2: para cada parte (na ordem achatada), o átomo arquivado de onde veio (j), a posição nele (k) e o id montado. */
export function origemDasPartes(atoms: readonly { id: string }[], cls: readonly { partes: readonly unknown[] }[]): { j: number; k: number; id: string }[] {
  return cls.flatMap((c, j) => c.partes.map((_, k) => ({ j, k, id: idDaParte(atoms[j].id, k) })));
}

export interface Montagem {
  reviews: SemanticReviews;
  recusados: { cardId: string; cardIdOriginal: string; motivo: string }[];
  vinculos: { cardIdOriginal: string; cardId: string; atomoId: string; parte: number; spec: string; unitId: string; subject: string; relacao: string; aceito: boolean }[];
  pendentes: string[];
}

/** Átomo do scorer para uma parte classificada; `null` = parte pendente (o cartão fica pendente). */
function veredictoDaParte(p: ParteClassificada): ReviewAtom["verdict"] | "duplicata" | null {
  if (p.credito && p.spec && (p.classe === "violacao-pagina" || p.classe === "violacao-origem-indeterminada")) return "reference";
  switch (p.classe) {
    case "violacao-pagina": case "violacao-ds": case "violacao-origem-indeterminada": case "observacao": case "observacao-norma-errada": return "novel";
    case "erro-factual": case "erro-normativo": case "erro-arquivo": return "false";
    case "evidencia-indisponivel": return "unresolved";
    case "duplicata": return "duplicata";
    default: return null;
  }
}

export function montarDecisoes(a: {
  novo: SemanticPackage; antigo: SemanticPackage; revAntigo: SemanticReviews; mapa: MapaRetrospectivo;
  classificados: Map<string, AtomoClassificado>; chaveDe: (cardIdOriginal: string, atomId: string) => string;
}): Montagem {
  const t = tradutor(a.mapa);
  const cards = new Map(a.novo.cards.map(c => [c.id, c]));
  const units = a.novo.units;
  const recusados: Montagem["recusados"] = [], vinculos: Montagem["vinculos"] = [], pendentes: string[] = [];
  const decisoes = new Map<string, SemanticDecision>();
  const origDe = new Map<string, string>();
  for (const dOld of a.revAntigo.decisions) {
    const cardId = t.cartao(dOld.cardId);
    origDe.set(cardId, dOld.cardId);
    const card = cards.get(cardId)!;
    const transposta = (): SemanticDecision => ({ ...structuredClone(dOld), cardId, atoms: dOld.atoms.map(x => ({ ...structuredClone(x), unitIds: x.unitIds.map(t.unidade),
      ...(x.duplicateOf ? { duplicateOf: { cardId: t.cartao(x.duplicateOf.cardId), atomId: x.duplicateOf.atomId } } : {}) })) });
    const pend = (): SemanticDecision => ({ cardId, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [] });
    const cls = dOld.atoms.map(x => a.classificados.get(a.chaveDe(dOld.cardId, x.id))!);
    if (cls.some(c => !c)) throw new Error(`E8: átomo sem classificação em ${dOld.cardId}`);
    if (cls.every(c => c.transporArquivo)) { decisoes.set(cardId, transposta()); continue; }
    // [mudança revisão M2] cada parte sabe de que átomo arquivado veio (j) e sua posição nele (k).
    const origemParte = origemDasPartes(dOld.atoms, cls);
    const partes = cls.flatMap(c => c.partes);
    const vs = partes.map(veredictoDaParte);
    if (vs.some(v => v === null)) { decisoes.set(cardId, pend()); pendentes.push(cardId); continue; }
    const reviewer = `nat74-retrospectiva · ${cls.map(c => c.juiz).join("+")}`;
    const atoms: ReviewAtom[] = [];
    let falhou: string | null = null;
    partes.forEach((p, i) => {
      if (falhou) return;
      const v = vs[i]!;
      // A primeira parte de cada átomo arquivado mantém o id dele (alvos de duplicata apontam para ele); partes extras ganham sufixo.
      const { j, k } = origemParte[i];
      const old = dOld.atoms[j];
      const base = { id: idDaParte(old.id, k), text: p.parte === "o cartão inteiro" ? old.text : p.parte, subjects: [...p.sujeitos] };
      if (v === "duplicata") {
        const alvo = old.duplicateOf;
        if (!alvo) { falhou = "duplicata sem alvo no arquivo"; return; }
        // A duplicata carrega o veredito e as unidades do átomo-alvo (normalizeReviews), pelo mapa.
        atoms.push({ ...base, verdict: old.verdict, unitIds: old.unitIds.map(t.unidade), citation: old.citation,
          duplicateOf: { cardId: t.cartao(alvo.cardId), atomId: alvo.atomId } });
        return;
      }
      if (v !== "reference") { atoms.push({ ...base, verdict: v, unitIds: [], citation: "uncertain" }); return; }
      const daSpec = units.filter(u => u.specId === p.spec);
      const subjs = p.sujeitos.map(id => card.subjects.find(s => s.id === id)!);
      const anc = [...new Set(subjs.flatMap(s => daSpec.filter(u => ancorado(s, card, u)).map(u => u.id)))].sort();
      const links: ReviewLink[] = [];
      for (const s of subjs) {
        if (anc.some(id => ancorado(s, card, units.find(u => u.id === id)!))) continue;
        if (s.key === null) { falhou = `sujeito sem chave medida: ${s.id}`; return; }
        const cena = s.scene ?? card.scene;
        const naCena = daSpec.filter(u => u.scene === cena);
        const prefer = naCena.filter(u => anc.includes(u.id));
        // [1.2.0] Fora da cena canônica, só a unidade da spec decidida (p.spec) cujo domínio PROVADO contém
        // a cena em que o cartão foi julgado; nunca a de prefixo mais longo noutra rota.
        const noDominio = naCena.length ? [] : daSpec.filter(u => u.domain?.some(e => e.scene === cena));
        if (noDominio.length > 1) { falhou = `${noDominio.length} unidades da ${p.spec} com a cena ${cena} no domínio provado: ambíguo`; return; }
        const pool = prefer.length ? prefer : naCena.length ? naCena : noDominio;
        if (!pool.length) { falhou = `nenhuma unidade da ${p.spec} na cena ${cena} nem com ela no domínio provado`; return; }
        // Prefixo comum só desempata unidades da MESMA cena (spec `todos`), nunca através de rotas.
        const u = [...pool].sort((x, y) => {
          const px = Math.max(...x.participants.map(q => prefixoComum(q, s.key!)), 0), py = Math.max(...y.participants.map(q => prefixoComum(q, s.key!)), 0);
          return py - px || (x.id < y.id ? -1 : 1);
        })[0];
        const entrada = u.scene === cena ? null : u.domain!.find(e => e.scene === cena)!;
        const r = entrada ? relacaoNoDominioMedido(s.key, entrada) : relacaoMedida(s.key, u);
        links.push({ contrato: VINCULO_CONTRATO, unitId: u.id, subjects: [s.id], scene: cena, state: u.state, relation: r.relacao,
          evidence: [`chave medida do sujeito: ${s.key}`, `participante da unidade ${u.specId}${entrada ? ` medido em ${cena}` : ""}: ${r.participante}`,
            ...(entrada ? entrada.evidence.map(e => `${e.source} sha256:${e.sha256}`) : []), ...cls.flatMap(c => c.fontes).slice(0, 2)],
          justification: `${p.motivo} (P8: relação ${r.relacao} pela árvore medida${entrada ? `; domínio provado ${entrada.kind}: ${entrada.predicate} em ${cena}` : ""})`, reviewer,
          binding: { build: card.binding.build, runScope: card.binding.runScope, card: cartaoDoVinculo(card) } });
        vinculos.push({ cardIdOriginal: dOld.cardId, cardId, atomoId: old.id, parte: k, spec: p.spec!, unitId: u.id, subject: s.id, relacao: r.relacao, aceito: true });
      }
      const unitIds = [...new Set([...anc, ...links.map(l => l.unitId)])].sort();
      atoms.push({ ...base, verdict: "reference", unitIds, citation: p.credito === "unidade" ? "supported" : "uncertain", ...(links.length ? { links } : {}) });
    });
    if (falhou) { decisoes.set(cardId, pend()); pendentes.push(cardId); recusados.push({ cardId, cardIdOriginal: dOld.cardId, motivo: falhou }); continue; }
    decisoes.set(cardId, { cardId, status: "reviewed", reviewer, rationale: cls.map(c => c.partes.map(p => p.motivo).join("; ")).join(" | "), complete: true,
      evidenceRefs: [...new Set(cls.flatMap(c => c.fontes))].length ? [...new Set(cls.flatMap(c => c.fontes))] : ["arquivo"], atoms,
      ...(dOld.cena !== undefined ? { cena: dOld.cena } : {}) });
  }
  // Barreiras do scorer: valida o conjunto; se recusar, isola cartão a cartão (o recusado fica pendente).
  const montadas = (): SemanticReviews => ({ version: a.novo.version, decisions: [...decisoes.values()] });
  try { scoreSemanticPackage(a.novo, montadas()); }
  catch {
    for (const [cardId, d] of [...decisoes]) {
      if (d.status !== "reviewed") continue;
      const alvos = [...new Set(d.atoms.flatMap(x => x.duplicateOf ? [x.duplicateOf.cardId] : []))].filter(id => id !== cardId).map(id => decisoes.get(id)!).filter(Boolean);
      try { scoreSemanticPackage(a.novo, { version: a.novo.version, decisions: [d, ...alvos] }); }
      catch (e) {
        decisoes.set(cardId, { cardId, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [] });
        pendentes.push(cardId); recusados.push({ cardId, cardIdOriginal: origDe.get(cardId)!, motivo: `recusado pelo scorer: ${e instanceof Error ? e.message : String(e)}` });
        for (const v of vinculos) if (v.cardId === cardId) v.aceito = false;
      }
    }
    // Duplicata cujo alvo ficou pendente pode cair junto: repete até estabilizar.
    for (let i = 0; i < 5; i++) {
      try { scoreSemanticPackage(a.novo, montadas()); break; }
      catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const alvo = [...decisoes.values()].find(d => d.status === "reviewed" && msg.includes(d.cardId));
        if (!alvo || i === 4) throw new Error(`E8: o scorer recusa o conjunto montado: ${msg}`);
        decisoes.set(alvo.cardId, { cardId: alvo.cardId, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [] });
        pendentes.push(alvo.cardId); recusados.push({ cardId: alvo.cardId, cardIdOriginal: origDe.get(alvo.cardId)!, motivo: `recusado pelo scorer: ${msg}` });
      }
    }
  }
  return { reviews: montadas(), recusados, vinculos, pendentes: [...new Set(pendentes)].sort() };
}
