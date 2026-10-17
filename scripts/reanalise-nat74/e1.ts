/**
 * E1 (plano §5): inventário de átomos arquivados — uma linha por átomo (2.291), chave
 * `campanha|par|cardIdOriginal|atomId`, e conferência das contagens da §2 do plano. Divergência para.
 *
 * O braço fica FORA da linha (P9): `bracoPorChave` é um mapa à parte, que só a agregação lê.
 */
import { join } from "node:path";
import { digest, type SemanticPackage } from "../semantic-flow";
import {
  CAMPANHAS, NAT73, TELA, bracoDosCartoes, chaveAtomo, lerJson, lerPar, paresDaCampanha,
  type Braco, type Campanha, type ParLido,
} from "./comum";

/** Família da regra citada que a política 1.2.0 mudou (plano §2, P7). `outras` = compatível. */
export type Familia = "R2-nome" | "R4-token" | "R11-3.3.1" | "R13/R15-boa-pratica" | "sem-regra" | "outras";
/** Classificação por id de regra (tabela fixa, a mesma das contagens da §2). */
export function familiaDaRegra(r: string | null): Familia {
  if (!r) return "sem-regra";
  if (/3\.3\.1|emag:6\.6/.test(r)) return "R11-3.3.1";
  if (/emag:2\.2|4\.1\.2|button-name|select-name|link-name|^label$|axe:label/.test(r)) return "R2-nome";
  if (/token/.test(r)) return "R4-token";
  if (/region|page-has-heading-one|heading-order|empty-table-header|landmark|scrollable-region/.test(r)) return "R13/R15-boa-pratica";
  return "outras";
}

export type Grupo = "credito-fora" | "inventario" | "nao-credito-fora";

/** Átomo arquivado, sem braço, run, campanha-modelo (P9: o classificador lê só isto). */
export interface AtomoArquivado {
  chave: string;
  campanha: Campanha; tela: "A" | "B"; par: string; revisao: string;
  cardIdOriginal: string; atomoId: string; cardSha256: string;
  mId: string | null;
  origemCartao: "agente" | "linha-de-base";
  ferramenta: "agente" | "axe" | "validator";
  regra: string | null; cena: string; estadoSha256: string;
  sujeitos: string[];
  decisao: string; verdict: string; citacao: string;
  unidades: { specId: string; unitId: string }[];
  duplicateOf: { cardId: string; atomId: string } | null;
  texto: string;
  grupo: Grupo; familia: Familia;
  /** Candidatas oferecidas pela ancoragem, por spec (para a tradução do vínculo). */
  candidatasSpecs: string[];
  /** Regras das unidades creditadas (vocabulário v1 do pacote arquivado). */
  regrasDasUnidades: string[];
}

export interface Inventario {
  atomos: AtomoArquivado[];
  bracoPorChave: Map<string, { braco: Braco; runId: string }>;
  pares: ParLido[];
  contagens: Record<string, Record<string, number>>;
  diferencas: string[];
}

interface CasoInventario { id: string; campanha: string; par: string; cardId: string }

/** Valores medidos da §2 (A Opus, A Sonnet, B). */
export const ESPERADO_E1: Record<string, [number, number, number]> = {
  cartoes: [293, 250, 1748], sem: [98, 73, 333], com: [115, 97, 325], lbAxe: [20, 20, 480], lbValidator: [60, 60, 610],
  sujeitosSem: [186, 89, 944], sujeitosCom: [315, 241, 1002],
  creditoFora: [179, 106, 698], creditadosIncerta: [79, 56, 133], creditoForaRegraNula: [7, 18, 1],
  inventario: [113, 110, 607], inventarioComVeredito: [99, 105, 595], inventarioSemVeredito: [14, 5, 12],
  naoCreditoFora: [1, 34, 443], naoCreditoForaSensiveis: [1, 21, 198], naoCreditoForaCompativeis: [0, 13, 245],
};

export function inventarioDeAtomos(): Inventario {
  const inv = lerJson<{ casos: CasoInventario[] }>(join(NAT73, "inventario-casos-materiais.json")).casos;
  const mPorCartao = new Map(inv.map(c => [`${c.campanha}|${c.par}|${c.cardId}`, c.id]));
  const rat = lerJson<{ itens: { id: string }[] }>(join(NAT73, "equivalencia", "ratificacao-resultado.json")).itens;
  const comVeredito = new Set(rat.map(x => x.id).filter(id => id.startsWith("M-")));
  const atomos: AtomoArquivado[] = [];
  const bracoPorChave = new Map<string, { braco: Braco; runId: string }>();
  const pares: ParLido[] = [];
  const cont: Record<string, Record<string, number>> = {};
  const inc = (k: string, c: Campanha, n = 1) => { (cont[k] ??= { "t7-tela-a-01": 0, "t7b-sonnet-tela-a-01": 0, "t7-tela-b-01": 0 })[c] += n; };
  for (const c of CAMPANHAS) for (const par of paresDaCampanha(c)) {
    const p = lerPar(par);
    pares.push(p);
    const bracos = bracoDosCartoes(p.pkg);
    const cards = new Map(p.pkg.cards.map(x => [x.id, x]));
    const units = new Map(p.pkg.units.map(u => [u.id, u]));
    inc("cartoes", c, p.pkg.cards.length);
    for (const card of p.pkg.cards) {
      const b = bracos.get(card.id)!.braco;
      inc(b === "sem" ? "sem" : b === "com" ? "com" : b === "lb-axe" ? "lbAxe" : "lbValidator", c);
    }
    for (const d of p.reviews.decisions) {
      const card = cards.get(d.cardId)!;
      const br = bracos.get(d.cardId)!;
      const mId = mPorCartao.get(`${c}|${p.par}|${d.cardId}`) ?? null;
      for (const a of d.atoms) {
        const decisao = a.decisao ?? "";
        const grupo: Grupo = mId ? "inventario" : decisao === "defeito-do-gabarito" ? "credito-fora" : "nao-credito-fora";
        const chave = chaveAtomo(c, p.par, d.cardId, a.id);
        const unidades = a.unitIds.map(id => ({ specId: units.get(id)!.specId, unitId: id }));
        atomos.push({
          chave, campanha: c, tela: TELA[c], par: p.par, revisao: p.revisao, cardIdOriginal: d.cardId, atomoId: a.id,
          cardSha256: digest(card), mId, origemCartao: card.origin === "agente" ? "agente" : "linha-de-base",
          ferramenta: card.origin === "agente" ? "agente" : br.braco === "lb-axe" ? "axe" : "validator",
          regra: card.rule, cena: card.scene, estadoSha256: digest(card.state), sujeitos: [...a.subjects],
          decisao, verdict: a.verdict, citacao: a.citation, unidades, duplicateOf: a.duplicateOf ?? null, texto: a.text,
          grupo, familia: familiaDaRegra(card.rule),
          candidatasSpecs: [...new Set(card.candidateUnitIds.map(id => units.get(id)!.specId))].sort(),
          regrasDasUnidades: [...new Set(a.unitIds.flatMap(id => units.get(id)!.rules))].sort(),
        });
        bracoPorChave.set(chave, br);
        // Sujeitos devidos (os da cena escolhida, D-60), contados pelos átomos.
        if (br.braco === "sem") inc("sujeitosSem", c, a.subjects.length);
        if (br.braco === "com") inc("sujeitosCom", c, a.subjects.length);
        // §2: "com citação uncertain" conta os creditados de todos os grupos (2 da A Sonnet estão no inventário).
        if (decisao === "defeito-do-gabarito" && a.citation === "uncertain") inc("creditadosIncerta", c);
        if (grupo === "credito-fora") {
          inc("creditoFora", c);
          if (!card.rule) inc("creditoForaRegraNula", c);
        } else if (grupo === "inventario") {
          inc("inventario", c);
          inc(comVeredito.has(mId!) ? "inventarioComVeredito" : "inventarioSemVeredito", c);
        } else {
          inc("naoCreditoFora", c);
          inc(familiaDaRegra(card.rule) === "outras" ? "naoCreditoForaCompativeis" : "naoCreditoForaSensiveis", c);
        }
      }
    }
  }
  const diferencas: string[] = [];
  if (atomos.length !== 2291) diferencas.push(`átomos ${atomos.length} ≠ 2291`);
  for (const [k, esp] of Object.entries(ESPERADO_E1)) CAMPANHAS.forEach((c, i) => {
    const v = cont[k]?.[c] ?? 0;
    if (v !== esp[i]) diferencas.push(`${k} ${c}: ${v} ≠ ${esp[i]} (§2)`);
  });
  return { atomos, bracoPorChave, pares, contagens: cont, diferencas };
}

export type { SemanticPackage };
