/**
 * E14 · consistência entre lotes da fila T3 (plano NAT-74 §6.6) e amostra de confiabilidade. Não julga nada e não muda
 * resposta alguma.
 *
 *   npm run reanalise:nat74:e14-consistencia -- relatorio --saida PASTA [--fila PASTA_FILA_T3]
 *     → PASTA/consistencia/{relatorio.json,relatorio.md,regras.md} (+ .sha256)
 *   npm run reanalise:nat74:e14-consistencia -- amostra --saida PASTA [--fila …]
 *     → PASTA/confiabilidade/{amostra-NN.json, LEIAME-juiz.md (o original), LEIAME-amostra.md, esquema, manifesto, chave, cegueira}
 *   npm run reanalise:nat74:e14-consistencia -- confiabilidade --amostra PASTA/confiabilidade [--fila …]
 *     → PASTA/confiabilidade/relatorio-confiabilidade.{json,md} (precisa de respostas/amostra-NN-j1.json e -j2.json)
 *
 * Os grupos são TRIAGEM de possíveis inconsistências (regras em REGRAS / consistencia/regras.md): nunca propagam
 * veredito e nunca exigem unanimidade. Dois níveis, ambos calculados SÓ dos cartões cegos (lotes/) + da chave
 * (chave/ → átomo arquivado do E1), nunca das respostas:
 *   - mesma alegação (MA): mesma tela, mesmo conjunto de perguntas, mesmo sujeito (chaves de elemento resolvidas),
 *     mesma regra citada (id canônico) e mesmo estado (cena). NÃO olha observado/esperado/evidência/receita/versão:
 *     é candidata a equivalência, não equivalência;
 *   - mesma leitura da norma (LN): mesma regra citada × mesmo tipo de sujeito, entre telas.
 * Vínculo auditável de equivalência só entre cartões cegos IDÊNTICOS (mesmo conteúdo, salvo o id): `cartoesIdenticos`.
 * Concordância: DESCRITIVA (pares comparáveis, mesmo lote × entre lotes, cobertura); sem κ (um julgamento por átomo:
 * membros de um grupo não são avaliações repetidas do mesmo item). O κ só aparece na amostra de confiabilidade, onde
 * os mesmos cartões são julgados por dois juízes novos.
 *
 * Determinístico: sem carimbo de tempo, sem rede, sem modelo. Braço/campanha só em contagens agregadas.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { NAT73, POLITICA_PRINCIPAL, gravar, jsonTexto, lerJson, ordenar, sha, unicos } from "./comum";
import { inventarioDeAtomos, type AtomoArquivado, type Inventario } from "./e1";
import { janelas, verificarCegueira, type Cegueira, type Falha } from "./e14-cegueira";
import {
  E14_VERSAO, ESQUEMA_RESPOSTAS, FILA, FORMATO_LOTE, FORMATO_RESPOSTAS, NAO_PERGUNTADO, derivarClasse, validarResposta,
  type CartaoCego, type Derivado, type ItemChave, type Resposta, type TipoT3,
} from "./e14-comum";
import { cartaoDoAtomo } from "./e14-fila";
import { contextoDe, ingerir } from "./e14-ingerir";
import { normalizarRegra } from "./politica";

export const FORMATO_CONSISTENCIA = "nat74-t3-consistencia-2.0.0";
const req = createRequire(import.meta.url);
export const lerTexto = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");
const r4 = (x: number) => Math.round(x * 10000) / 10000;

// ───────────────────────────────────────────────────────────────── regras congeladas

/**
 * Regras de equivalência, seleção, adjudicação e parada. Escritas DEPOIS de ver as divergências da 1ª passada
 * (relatório de consistência de 2026-10-18 e revisão Codex da NAT-74, comentário 62b292fc). Gravadas em
 * consistencia/regras.md com sha256; o desempate e a amostra registram esse sha256.
 */
export const REGRAS = `# Fila T3 — regras de consistência, desempate e confiabilidade (congeladas)

**Quando foram escritas:** DEPOIS de ver as divergências da 1ª passada (relatório de consistência dos 9 lotes, 285
átomos) e a revisão da NAT-74 (comentário 62b292fc). Não são regras pré-registradas; são congeladas a partir daqui, e
o sha256 deste arquivo vai para a chave do desempate e para o manifesto da amostra de confiabilidade.

## 1. Equivalência

- Os grupos são **triagem** de possíveis inconsistências, nunca equivalência. Um grupo não propaga veredito de um membro
  para outro e não exige unanimidade: cada membro guarda a sua própria resposta.
- **Mesma alegação (MA)**: mesma tela, mesmo conjunto de perguntas (qualidade | completa), mesmo sujeito (conjunto das
  chaves de elemento do átomo arquivado, sem o prefixo de cena), mesma regra citada (id canônico pela chave:
  \`normalizarRegra\` + prefixo \`axe:\` no id nu; sem regra = "(sem regra)") e mesmo estado (cena nomeada; cena
  \`a-decidir\` → a cena gravada nas chaves dos sujeitos; senão a janela). Texto observado/esperado, evidência, versão e
  receita (passos) NÃO entram: dois membros de MA podem descrever situações diferentes.
- **Mesma leitura da norma (LN)**: mesma regra citada (id canônico) × mesmo tipo de sujeito (do rótulo do sujeito no
  cartão cego), entre telas; só átomos com regra citada e pergunta de norma. Mesma tag + mesma regra ≠ mesma situação
  (ex.: \`title\`/\`aria-labelledby\` podem dar nome a um botão só com ícone).
- **Vínculo auditável de equivalência** só entre cartões cegos idênticos (mesmo JSON, salvo o id). Fora disso, nenhuma
  equivalência é afirmada.
- Os grupos saem só dos cartões cegos e da chave; nenhuma resposta entra no agrupamento.

## 2. Seleção para adjudicação

Vai à adjudicação todo grupo com ≥ 2 membros em que divergem:
- MA: \`classe\` derivada (inclui verdadeiro/falso positivo, exclusões do denominador — pendente / evidência
  indisponível — e pendente × final, em qualquer braço, linhas de base incluídas), \`credito\` (defeito creditado ou
  nenhum), \`fundamentacao\` ou \`norma.id\`;
- LN: \`norma.id\`, \`norma.forca\`, \`norma.aplicabilidade\` ou \`norma.violada\`.
Grupos selecionados que compartilham membros viram uma unidade só. Divergência só de \`vinculo\`/\`credito\` em LN não
seleciona (o defeito vinculado varia legitimamente entre elementos diferentes).

## 3. Adjudicação ("adjudicação informada")

- **Um adjudicador novo por unidade**, cego para braço, modelo, campanha, run e decisão arquivada; cartões com id novo.
- **Etapa A (leitura individual):** o adjudicador lê a norma, escreve \`leituraDaNorma\` — a REGRA DE INTERPRETAÇÃO: fonte
  e versão, força, antecedente (quando se aplica), exceções, evidência necessária e o que ela permite concluir — e
  responde cada membro sem ver resposta anterior alguma. O arquivo da etapa A é congelado (sha256 gravado na etapa B).
- **Etapa B (reconciliação):** só então vê as respostas anteriores dos membros (sem lote, juiz ou braço) e responde de
  novo cada membro, com evidência, e classifica a divergência: \`diferenca-legitima-de-contexto\` ·
  \`falta-de-evidencia\` · \`interpretacao-normativa\` · \`erro-do-juiz\` (uma ou mais, com ids de evidência).
- A leitura fixa a regra de interpretação (força e norma iguais em todos os membros com pergunta de norma);
  aplicabilidade e violação ficam POR MEMBRO.
- Se leituras incompatíveis continuam plausíveis, o adjudicador as lista em \`leiturasAlternativasPlausiveis\` e os
  membros com pergunta de norma ficam \`incerta\`/\`incerto\` (classe pendente / evidência indisponível); a leitura
  alternativa entra como sensibilidade.
- A resposta da etapa B substitui a da 1ª passada; a 1ª passada fica preservada (\`julgamentos-1a-passada.json\`) e toda
  substituição é registrada (átomo, antes, depois, grupo, classificação).

## 4. Parada

- Uma rodada de adjudicação por unidade. **Nunca** se repete até haver acordo.
- Segunda leitura independente (outro adjudicador novo, mesmas etapas) só para caso **material** que a primeira não
  resolve: membro que fica pendente / evidência indisponível na etapa B quando a 1ª passada de algum membro do grupo
  creditava. O resultado da segunda leitura é final; se as duas discordam na classe, o membro fica pendente e as duas
  leituras vão como sensibilidade.

## 5. Confiabilidade

- Amostra estratificada de ~40 cartões IDÊNTICOS aos da 1ª passada (só o id muda), sorteada antes da adjudicação pela
  semente declarada, com estratos tirados dos cartões e das respostas da 1ª passada (tela × resultado × situação no
  grupo), nunca do braço.
- Cada cartão é julgado de novo por 2 juízes novos e cegos, com as instruções originais do lote, antes de qualquer
  adjudicação. Concordância: % e κ de Cohen (juiz 1 × juiz 2), e κ de Fleiss com 3 avaliações iguais por cartão
  (juiz 1, juiz 2, 1ª passada).
`;

// ───────────────────────────────────────────────────────────────── chaves de agrupamento

let axeIds: Set<string> | null = null;
const axe = (): Set<string> => (axeIds ??= new Set((req("axe-core") as { getRules: () => { ruleId: string }[] }).getRules().map(r => r.ruleId)));

/** Id canônico da regra citada: `normalizarRegra` + prefixo `axe:` no id nu de regra do axe (`label` ≡ `axe:label`). */
export function regraCanonica(r: string | null | undefined): string | null {
  if (!r || !r.trim()) return null;
  const n = normalizarRegra(r);
  if (!n.includes(":") && axe().has(n)) return `axe:${n}`;
  return n;
}

const PREFIXO_CENA = /^(\d+x\d+@[^|]*)\|/;
/** Chave de elemento sem o prefixo de cena (`1280x900@inicial|body>…` → `body>…`); vazia → `(raiz)`. */
export const chaveDeElemento = (k: string): string => k.replace(PREFIXO_CENA, "").trim() || "(raiz)";
/** Sujeito do átomo: o conjunto das chaves de elemento resolvidas (ordenado). Sem sujeito → `(raiz)`. */
export const sujeitoDe = (a: Pick<AtomoArquivado, "sujeitos">): string => unicos(a.sujeitos.map(chaveDeElemento)).join(" ; ") || "(raiz)";
/** Estado: cena nomeada; cena `a-decidir` → a cena gravada nas chaves dos sujeitos; senão a janela. */
export function estadoDe(a: Pick<AtomoArquivado, "sujeitos" | "cena">): string {
  if (/@/.test(a.cena)) return a.cena;
  const cenas = unicos(a.sujeitos.map(k => PREFIXO_CENA.exec(k)?.[1]).filter((x): x is string => !!x));
  return cenas.length ? cenas.join("+") : a.cena.replace(/^a-decidir:/, "");
}

/**
 * Tipo de sujeito (para a leitura da norma), do rótulo do sujeito no cartão cego (`<tag#id> "texto"`):
 * `raiz` · `botão com texto` · `botão sem texto visível` · `campo de formulário` · `componente <br-x>` ·
 * `não resolvido` · senão a tag. Vários sujeitos de tipos diferentes → tipos ordenados unidos por `+`.
 */
export function tipoDeSujeito(c: Pick<CartaoCego, "alegacao">): string {
  const tipos = c.alegacao.sujeitos.map(s => {
    if (!s.chave || chaveDeElemento(s.chave) === "(raiz)") return "raiz";
    if (/^seletor não resolvido/i.test(s.rotulo) || /^unresolved:/.test(s.chave)) return "não resolvido";
    const m = /^<([a-z][a-z0-9-]*)/i.exec(s.rotulo);
    const tag = (m?.[1] ?? chaveDeElemento(s.chave).split(">").pop()!.replace(/[:#.[].*$/, "")).toLowerCase();
    const texto = /"(.*)"/.exec(s.rotulo)?.[1]?.trim() ?? "";
    if (tag === "html" || tag === "body") return "raiz";
    if (tag === "button") return texto ? "botão com texto" : "botão sem texto visível";
    if (tag === "input" || tag === "select" || tag === "textarea") return "campo de formulário";
    if (tag.startsWith("br-")) return `componente <${tag}>`;
    return tag;
  });
  return unicos(tipos).join("+") || "raiz";
}

// ───────────────────────────────────────────────────────────────── membros (cartão cego + chave)

export interface Membro {
  id: string; chave: string; tela: "A" | "B"; tipo: TipoT3; lote: string; campanha: string; braco: string;
  regra: string | null; sujeito: string; estado: string; tipoDeSujeito: string; perguntaNorma: boolean;
  cartao: CartaoCego;
}
interface Manifesto { lotes: { lote: string; n: number; sha256: string; ids: string[] }[]; chaveSha256: string; total: number }
export type Referencias = Record<string, { nome: string; versao: string; defeitos: { id: string }[] }>;

/** Lê os cartões publicados (lotes/), a chave e o átomo arquivado de cada um. Confere sha256 contra o manifesto. */
export function membrosDaFila(fila: string, inv: Inventario = inventarioDeAtomos()): { membros: Membro[]; itens: ItemChave[]; referencias: Referencias; fontes: Record<string, string> } {
  const mTxt = lerTexto(join(fila, "lotes", "manifesto.json")), cTxt = lerTexto(join(fila, "chave", "fila-t3-chave.json"));
  const manifesto = JSON.parse(mTxt) as Manifesto;
  if (sha(cTxt) !== manifesto.chaveSha256) throw new Error("E14 consistência: chave difere do manifesto");
  const itens = (JSON.parse(cTxt) as { itens: ItemChave[] }).itens;
  const chave = new Map(itens.map(i => [i.id, i]));
  const atomos = new Map(inv.atomos.map(a => [a.chave, a]));
  const fontes: Record<string, string> = { "lotes/manifesto.json": sha(mTxt), "chave/fila-t3-chave.json": sha(cTxt) };
  const membros: Membro[] = [];
  const referencias: Referencias = {};
  for (const m of manifesto.lotes) {
    const t = lerTexto(join(fila, "lotes", `${m.lote}.json`));
    if (sha(t) !== m.sha256) throw new Error(`E14 consistência: lotes/${m.lote}.json difere do manifesto`);
    const l = JSON.parse(t) as { cartoes: CartaoCego[]; referencias: Referencias };
    Object.assign(referencias, l.referencias);
    for (const c of l.cartoes) {
      const it = chave.get(c.id);
      if (!it) throw new Error(`E14 consistência: ${c.id} fora da chave`);
      const a = atomos.get(it.chave);
      if (!a) throw new Error(`E14 consistência: átomo arquivado não achado para ${c.id}`);
      if (a.cardSha256 !== it.cardSha256) throw new Error(`E14 consistência: cardSha256 diverge em ${c.id}`);
      membros.push({ id: c.id, chave: it.chave, tela: it.tela, tipo: it.tipo, lote: m.lote, campanha: it.campanha, braco: it.braco,
        regra: regraCanonica(a.regra), sujeito: sujeitoDe(a), estado: estadoDe(a), tipoDeSujeito: tipoDeSujeito(c),
        perguntaNorma: c.perguntas.includes("norma"), cartao: c });
    }
  }
  if (membros.length !== manifesto.total) throw new Error(`E14 consistência: ${membros.length} cartões ≠ ${manifesto.total} no manifesto`);
  return { membros: ordenar(membros, x => x.id), itens, referencias, fontes };
}

// ───────────────────────────────────────────────────────────────── grupos

export type Nivel = "mesma-alegacao" | "mesma-leitura";
export interface Grupo {
  id: string; nivel: Nivel; chave: string;
  descricao: { tela: string | null; perguntas: string | null; regra: string | null; sujeito: string | null; estado: string | null; tipoDeSujeito: string | null };
  membros: string[];
}
const SEM_REGRA = "(sem regra)";

/** Agrupa (determinístico: chaves textuais; ids = prefixo do sha256 da chave; ordem pelo id). Inclui singletons. */
export function agrupar(membros: Membro[]): { mesmaAlegacao: Grupo[]; mesmaLeitura: Grupo[] } {
  const junta = (nivel: Nivel, prefixo: string, sel: Membro[], k: (m: Membro) => string, d: (m: Membro) => Grupo["descricao"]): Grupo[] => {
    const por = new Map<string, Membro[]>();
    for (const m of sel) { const c = k(m); por.set(c, [...(por.get(c) ?? []), m]); }
    return ordenar([...por].map(([c, ms]) => ({ id: `${prefixo}-${sha(`${nivel}|${c}`).slice(0, 8)}`, nivel, chave: c, descricao: d(ms[0]),
      membros: ms.map(m => m.id).sort() })), g => g.id);
  };
  const perg = (m: Membro) => (m.tipo === "qualidade" ? "qualidade" : "completa");
  return {
    mesmaAlegacao: junta("mesma-alegacao", "MA", membros, m => [m.tela, perg(m), m.sujeito, m.regra ?? SEM_REGRA, m.estado].join(" ‖ "),
      m => ({ tela: m.tela, perguntas: perg(m), regra: m.regra, sujeito: m.sujeito, estado: m.estado, tipoDeSujeito: m.tipoDeSujeito })),
    mesmaLeitura: junta("mesma-leitura", "LN", membros.filter(m => m.regra && m.perguntaNorma), m => [m.regra, m.tipoDeSujeito].join(" ‖ "),
      m => ({ tela: null, perguntas: null, regra: m.regra, sujeito: null, estado: null, tipoDeSujeito: m.tipoDeSujeito })),
  };
}

/** Vínculo auditável de equivalência: átomos cujos cartões cegos são idênticos (mesmo JSON, salvo o id). */
export function cartoesIdenticos(membros: Membro[]): string[][] {
  const por = new Map<string, string[]>();
  for (const m of membros) { const k = sha(JSON.stringify({ ...m.cartao, id: "" })); por.set(k, [...(por.get(k) ?? []), m.id]); }
  return ordenar([...por.values()].filter(x => x.length > 1).map(x => x.sort()), x => x[0]);
}

// ───────────────────────────────────────────────────────────────── campos comparados

export interface Julgado { id: string; lote: string; resposta: Resposta; derivado: Derivado }
/** Campo comparado; `null` = não perguntado / não respondido (fica fora do denominador). */
export interface Campo { nome: string; valor: (j: Pick<Julgado, "resposta" | "derivado">) => string | null }
const norma = (j: Pick<Julgado, "resposta">) => (j.resposta.norma === NAO_PERGUNTADO ? null : j.resposta.norma);
export const creditoDe = (d: Pick<Derivado, "fundamentacao" | "spec">): string => (d.fundamentacao !== null ? `credita ${d.spec}` : "sem-credito");
export const CAMPOS: Campo[] = [
  { nome: "fato", valor: j => (j.resposta.verdadeFactual === NAO_PERGUNTADO ? null : j.resposta.verdadeFactual) },
  { nome: "norma.id", valor: j => norma(j)?.id ?? null },
  { nome: "norma.forca", valor: j => norma(j)?.forca ?? null },
  { nome: "norma.aplicabilidade", valor: j => norma(j)?.aplicabilidade ?? null },
  { nome: "norma.violada", valor: j => norma(j)?.violada ?? null },
  { nome: "vinculo", valor: j => (typeof j.resposta.vinculo === "object" ? j.resposta.vinculo.spec : j.resposta.vinculo === NAO_PERGUNTADO ? null : j.resposta.vinculo) },
  { nome: "vinculo.relacao", valor: j => (typeof j.resposta.vinculo === "object" ? j.resposta.vinculo.relacao : null) },
  { nome: "sugestao", valor: j => (j.resposta.sugestao === NAO_PERGUNTADO ? null : j.resposta.sugestao.qualidade) },
  { nome: "classe", valor: j => j.derivado.classe },
  /** Credita a detecção de algum defeito? (D-130: `fundamentacao` não nula = credita). */
  { nome: "credita", valor: j => (j.derivado.fundamentacao !== null ? "sim" : "nao") },
  { nome: "credito", valor: j => creditoDe(j.derivado) },
  { nome: "fundamentacao", valor: j => j.derivado.fundamentacao ?? "sem-credito" },
];
export const CAMPOS_DA_NORMA = ["norma.id", "norma.forca", "norma.aplicabilidade", "norma.violada"];
/** Divergência que seleciona o grupo para a adjudicação (REGRAS §2). */
export const SELECIONA: Record<Nivel, string[]> = { "mesma-alegacao": ["classe", "credito", "fundamentacao", "norma.id"], "mesma-leitura": CAMPOS_DA_NORMA };
/** Campos cuja divergência muda o crédito (MA: defeito creditado; LN: credita sim/não — o defeito varia entre elementos). */
export const CAMPOS_DE_CREDITO: Record<Nivel, string[]> = { "mesma-alegacao": ["credito", "fundamentacao"], "mesma-leitura": ["credita", "fundamentacao"] };
/** Campos da concordância geral de pares (LN: só a resposta de norma; o resto varia legitimamente entre elementos). */
export const CAMPOS_GERAIS: Record<Nivel, string[]> = { "mesma-alegacao": CAMPOS.map(c => c.nome), "mesma-leitura": CAMPOS_DA_NORMA };
export const CLASSIFICACOES = ["diferenca-legitima-de-contexto", "falta-de-evidencia", "interpretacao-normativa", "erro-do-juiz"] as const;

// ───────────────────────────────────────────────────────────────── concordância descritiva

export interface Taxa { comparaveis: number; concordantes: number; pct: number | null }
export interface Concordancia {
  /** Todos os pares de membros dentro dos grupos (≥ 2 membros). */
  pares: number;
  /** Pares em que os dois responderam o campo (o denominador). */
  comparaveis: number; cobertura: number | null;
  todos: Taxa; mesmoLote: Taxa; entreLotes: Taxa;
  gruposComparaveis: number; gruposUnanimes: number;
}
const taxa = (c: number, k: number): Taxa => ({ comparaveis: c, concordantes: k, pct: c ? r4(k / c) : null });

/**
 * Concordância descritiva de pares dentro dos grupos. Para um campo, o par só conta se os dois responderam (valor não
 * nulo); senão sai do denominador e só entra na cobertura. Pares do mesmo lote (mesmo juiz) e de lotes diferentes ficam
 * separados. Para vários campos (`concordanciaGeral`), o par só é comparável se em CADA campo os dois responderam ou
 * os dois não responderam; concorda se todos os campos respondidos são iguais.
 */
export function concordancia(grupos: Grupo[], julg: Map<string, Julgado>, valores: (j: Julgado) => (string | null)[]): Concordancia {
  let pares = 0, comp = 0, conc = 0, cm = 0, km = 0, ce = 0, ke = 0, gc = 0, gu = 0;
  for (const g of grupos) {
    const js = g.membros.map(id => julg.get(id)!);
    let algum = false, todosIguais = true;
    for (let i = 0; i < js.length; i++) for (let k = i + 1; k < js.length; k++) {
      pares++;
      const a = valores(js[i]), b = valores(js[k]);
      if (!a.every((x, n) => (x === null) === (b[n] === null)) || a.every(x => x === null)) continue;
      const ok = a.every((x, n) => x === b[n]);
      algum = true; if (!ok) todosIguais = false;
      comp++; if (ok) conc++;
      if (js[i].lote === js[k].lote) { cm++; if (ok) km++; } else { ce++; if (ok) ke++; }
    }
    if (algum) { gc++; if (todosIguais) gu++; }
  }
  return { pares, comparaveis: comp, cobertura: pares ? r4(comp / pares) : null, todos: taxa(comp, conc), mesmoLote: taxa(cm, km), entreLotes: taxa(ce, ke),
    gruposComparaveis: gc, gruposUnanimes: gu };
}
const valoresDe = (nomes: string[]) => (j: Julgado) => CAMPOS.filter(c => nomes.includes(c.nome)).map(c => c.valor(j));

// ───────────────────────────────────────────────────────────────── análise

export interface GrupoAnalisado extends Grupo {
  n: number; lotes: string[];
  valores: { id: string; lote: string; tipo: TipoT3; valores: Record<string, string | null> }[];
  distribuicao: Record<string, Record<string, number>>;
  divergencias: string[]; divergente: boolean; mudaCredito: boolean; normaDiverge: boolean;
  /** Vai à adjudicação (REGRAS §2). */
  desempate: boolean;
  /** Preenchido pelo adjudicador (etapa B), com evidência; aqui sempre null. */
  classificacaoDaDivergencia: null;
  observados: { id: string; texto: string }[];
}
export interface Analise {
  membros: Membro[]; itens: ItemChave[]; referencias: Referencias; julgados: Map<string, Julgado>;
  mesmaAlegacao: GrupoAnalisado[]; mesmaLeitura: GrupoAnalisado[]; identicos: string[][];
  relatorio: Record<string, unknown>;
}

/** Respostas da 1ª passada com a classe derivada, pela própria ingestão (mesma validação e derivação). */
export function julgadosDaFila(fila: string): Map<string, Julgado> {
  const r = ingerir(fila);
  if (r.erros.length || !r.julgamentos) throw new Error(`E14 consistência: a ingestão recusou as respostas:\n  ${r.erros.slice(0, 20).join("\n  ")}`);
  const js = (r.julgamentos as { julgamentos: Julgado[] }).julgamentos;
  return new Map(js.map(j => [j.id, { id: j.id, lote: j.lote, resposta: j.resposta, derivado: j.derivado }]));
}

export function analisar(dados: { membros: Membro[]; itens?: ItemChave[]; referencias?: Referencias }, julgados: Map<string, Julgado>, fontes: Record<string, string> = {}): Analise {
  const { membros } = dados;
  for (const m of membros) if (!julgados.has(m.id)) throw new Error(`E14 consistência: ${m.id} sem resposta`);
  const porId = new Map(membros.map(m => [m.id, m]));
  const g = agrupar(membros);
  const analisa = (gr: Grupo): GrupoAnalisado => {
    const js = gr.membros.map(id => julgados.get(id)!);
    const valores = js.map(j => ({ id: j.id, lote: j.lote, tipo: porId.get(j.id)!.tipo, valores: Object.fromEntries(CAMPOS.map(c => [c.nome, c.valor(j)])) }));
    const distribuicao: Record<string, Record<string, number>> = {};
    const divergencias: string[] = [];
    for (const c of CAMPOS) {
      const vs = valores.map(v => v.valores[c.nome]).filter((x): x is string => x !== null);
      const d: Record<string, number> = {};
      for (const v of vs) d[v] = (d[v] ?? 0) + 1;
      distribuicao[c.nome] = Object.fromEntries(Object.entries(d).sort());
      if (vs.length >= 2 && Object.keys(d).length > 1) divergencias.push(c.nome);
    }
    const mudaCredito = divergencias.some(c => CAMPOS_DE_CREDITO[gr.nivel].includes(c));
    const normaDiverge = divergencias.some(c => CAMPOS_DA_NORMA.includes(c));
    const desempate = gr.membros.length >= 2 && divergencias.some(c => SELECIONA[gr.nivel].includes(c));
    const observados = gr.membros.map(id => ({ id, texto: (porId.get(id)!.cartao.alegacao.observado ?? "").replace(/\s+/g, " ").slice(0, 140) }));
    return { ...gr, n: gr.membros.length, lotes: unicos(js.map(j => j.lote)), valores, distribuicao, divergencias, divergente: divergencias.length > 0,
      mudaCredito, normaDiverge, desempate, classificacaoDaDivergencia: null, observados };
  };
  const ma = g.mesmaAlegacao.map(analisa), ln = g.mesmaLeitura.map(analisa);
  const identicos = cartoesIdenticos(membros);
  // Cartões idênticos: a mesma pergunta feita duas vezes — a medida mais limpa de consistência entre lotes.
  const idAn = identicos.map(ms => analisa({ id: `ID-${sha(ms.join("|")).slice(0, 8)}`, nivel: "mesma-alegacao", chave: "cartão cego idêntico",
    descricao: { tela: porId.get(ms[0])!.tela, perguntas: null, regra: porId.get(ms[0])!.regra, sujeito: porId.get(ms[0])!.sujeito, estado: porId.get(ms[0])!.estado, tipoDeSujeito: porId.get(ms[0])!.tipoDeSujeito }, membros: ms }));

  const nivel = (gs: GrupoAnalisado[], nv: Nivel) => {
    const multi = gs.filter(x => x.n >= 2);
    return {
      grupos: gs.length, singletons: gs.filter(x => x.n === 1).length, gruposComDoisOuMais: multi.length, atomosEmGruposComDoisOuMais: multi.reduce((s, x) => s + x.n, 0),
      gruposEntreLotes: multi.filter(x => x.lotes.length >= 2).length,
      divergentes: multi.filter(x => x.divergente).length, mudamCredito: multi.filter(x => x.mudaCredito).length, normaDiverge: multi.filter(x => x.normaDiverge).length,
      classeDiverge: multi.filter(x => x.divergencias.includes("classe")).length,
      vaoAAdjudicacao: multi.filter(x => x.desempate).length, atomosAAdjudicacao: multi.filter(x => x.desempate).reduce((s, x) => s + x.n, 0),
      divergenciasPorCampo: Object.fromEntries(CAMPOS.map(c => [c.nome, multi.filter(x => x.divergencias.includes(c.nome)).length])),
      concordanciaGeral: { campos: CAMPOS_GERAIS[nv], ...concordancia(multi, julgados, valoresDe(CAMPOS_GERAIS[nv])) },
      concordancia: Object.fromEntries(CAMPOS.map(c => [c.nome, concordancia(multi, julgados, valoresDe([c.nome]))])),
    };
  };
  const porCampanhaBraco: Record<string, Record<string, { atomos: number; emGrupoDivergenteMA: number; emGrupoQueMudaCreditoMA: number; emGrupoNormaDivergeLN: number; aAdjudicacao: number }>> = {};
  const emMA = new Map(ma.filter(x => x.n >= 2).flatMap(x => x.membros.map(id => [id, x] as const)));
  const emLN = new Map(ln.filter(x => x.n >= 2).flatMap(x => x.membros.map(id => [id, x] as const)));
  for (const m of membros) {
    const x = ((porCampanhaBraco[m.campanha] ??= {})[m.braco] ??= { atomos: 0, emGrupoDivergenteMA: 0, emGrupoQueMudaCreditoMA: 0, emGrupoNormaDivergeLN: 0, aAdjudicacao: 0 });
    x.atomos++;
    const a = emMA.get(m.id), l = emLN.get(m.id);
    if (a?.divergente) x.emGrupoDivergenteMA++;
    if (a?.mudaCredito) x.emGrupoQueMudaCreditoMA++;
    if (l?.normaDiverge) x.emGrupoNormaDivergeLN++;
    if (a?.desempate || l?.desempate) x.aAdjudicacao++;
  }
  const relatorio = {
    formato: FORMATO_CONSISTENCIA, versao: E14_VERSAO,
    aviso: "Relatório interno (não vai aos juízes): mostra a regra citada sem máscara e as respostas da 1ª passada. Grupos = triagem, não equivalência.",
    fontes, regrasSha256: sha(REGRAS), atomos: membros.length,
    metodo: "Concordância descritiva: pares de membros dentro dos grupos com ≥ 2 membros; denominador = pares comparáveis (os dois responderam o campo; para vários campos, mesma forma de resposta em cada campo); cobertura = comparáveis / pares; mesmo lote (mesmo juiz) e entre lotes separados. Sem κ: cada átomo tem um julgamento só, e membros de um grupo não são avaliações repetidas do mesmo item.",
    resumo: { mesmaAlegacao: nivel(ma, "mesma-alegacao"), mesmaLeitura: nivel(ln, "mesma-leitura") },
    cartoesIdenticos: { grupos: identicos.length, atomos: identicos.reduce((s, x) => s + x.length, 0), gruposEntreLotes: idAn.filter(x => x.lotes.length >= 2).length,
      divergentes: idAn.filter(x => x.divergente).length, classeDiverge: idAn.filter(x => x.divergencias.includes("classe")).length,
      mudamCredito: idAn.filter(x => x.divergencias.some(c => ["credito", "fundamentacao"].includes(c))).length,
      concordanciaGeral: concordancia(idAn, julgados, valoresDe(CAMPOS.map(c => c.nome))),
      concordanciaClasse: concordancia(idAn, julgados, valoresDe(["classe"])),
      lista: idAn.map(x => ({ id: x.id, membros: x.membros, lotes: x.lotes, divergencias: x.divergencias })) },
    porCampanhaBraco: Object.fromEntries(Object.entries(porCampanhaBraco).sort().map(([c, b]) => [c, Object.fromEntries(Object.entries(b).sort())])),
    grupos: { mesmaAlegacao: ma.filter(x => x.n >= 2), mesmaLeitura: ln.filter(x => x.n >= 2) },
    singletons: { mesmaAlegacao: ma.filter(x => x.n === 1).map(x => x.membros[0]), mesmaLeitura: ln.filter(x => x.n === 1).map(x => x.membros[0]) },
  };
  return { membros, itens: dados.itens ?? [], referencias: dados.referencias ?? {}, julgados, mesmaAlegacao: ma, mesmaLeitura: ln, identicos, relatorio };
}

/** Lê fila + respostas e analisa (o que a CLI, o desempate e a amostra usam). */
export function analisarFila(fila: string, inv?: Inventario): Analise {
  const d = membrosDaFila(fila, inv);
  const dir = join(fila, "respostas");
  for (const f of existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).sort() : []) d.fontes[`respostas/${f}`] = sha(lerTexto(join(dir, f)));
  return analisar(d, julgadosDaFila(fila), d.fontes);
}

// ───────────────────────────────────────────────────────────────── relatório md

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const tx = (t: Taxa) => `${pct(t.pct)} (${t.concordantes}/${t.comparaveis})`;
const cel = (s: string | null | undefined) => (s ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function relatorioMd(a: Analise): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = a.relatorio as any;
  const L: string[] = [];
  L.push("# Fila T3 — consistência entre lotes (1ª passada)", "");
  L.push(`${a.membros.length} átomos, um juiz por lote. Relatório interno: não vai aos juízes. Os grupos são **triagem** de possíveis inconsistências, não equivalência (regras: \`regras.md\`, sha256 \`${r.regrasSha256}\`).`, "");
  L.push("## Resumo", "", "| | mesma alegação (MA) | mesma leitura da norma (LN) |", "|---|---:|---:|");
  const rs = r.resumo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linha = (rot: string, f: (x: any) => string | number) => L.push(`| ${rot} | ${f(rs.mesmaAlegacao)} | ${f(rs.mesmaLeitura)} |`);
  linha("grupos (todos)", x => x.grupos);
  linha("grupos com ≥ 2 membros", x => x.gruposComDoisOuMais);
  linha("átomos nesses grupos", x => x.atomosEmGruposComDoisOuMais);
  linha("grupos com membros de lotes diferentes", x => x.gruposEntreLotes);
  linha("grupos divergentes (algum campo)", x => x.divergentes);
  linha("grupos em que a classe diverge", x => x.classeDiverge);
  linha("grupos em que o crédito muda", x => x.mudamCredito);
  linha("grupos com resposta de norma divergente", x => x.normaDiverge);
  linha("grupos à adjudicação (regras §2)", x => `${x.vaoAAdjudicacao} (${x.atomosAAdjudicacao} átomos)`);
  linha("pares concordantes — campos gerais¹, todos", x => tx(x.concordanciaGeral.todos));
  linha("idem, mesmo lote", x => tx(x.concordanciaGeral.mesmoLote));
  linha("idem, entre lotes", x => tx(x.concordanciaGeral.entreLotes));
  linha("cobertura (pares comparáveis / pares)", x => `${pct(x.concordanciaGeral.cobertura)} (${x.concordanciaGeral.comparaveis}/${x.concordanciaGeral.pares})`);
  L.push("", "¹ MA: todos os campos; LN: só a resposta de norma (id, força, aplicabilidade, violada).", "");
  const ci = r.cartoesIdenticos;
  L.push(`**Cartões cegos idênticos** (único vínculo auditável de equivalência): ${ci.grupos} grupos, ${ci.atomos} átomos (${ci.gruposEntreLotes} grupos com lotes diferentes); divergem ${ci.divergentes} (classe ${ci.classeDiverge}, crédito ${ci.mudamCredito}). Pares concordantes em todos os campos: ${tx(ci.concordanciaGeral.todos)} (mesmo lote ${tx(ci.concordanciaGeral.mesmoLote)}, entre lotes ${tx(ci.concordanciaGeral.entreLotes)}); na classe: ${tx(ci.concordanciaClasse.todos)} (entre lotes ${tx(ci.concordanciaClasse.entreLotes)}).`, "");
  for (const [nome, k] of [["mesma alegação", "mesmaAlegacao"], ["mesma leitura da norma", "mesmaLeitura"]] as const) {
    L.push(`## Concordância por campo — ${nome}`, "");
    L.push("| campo | pares comparáveis / pares (cobertura) | todos | mesmo lote | entre lotes | grupos unânimes | grupos divergentes |", "|---|---|---:|---:|---:|---:|---:|");
    for (const c of CAMPOS) {
      const x = rs[k].concordancia[c.nome] as Concordancia;
      L.push(`| ${c.nome} | ${x.comparaveis}/${x.pares} (${pct(x.cobertura)}) | ${tx(x.todos)} | ${tx(x.mesmoLote)} | ${tx(x.entreLotes)} | ${x.gruposUnanimes}/${x.gruposComparaveis} | ${rs[k].divergenciasPorCampo[c.nome]} |`);
    }
    L.push("");
  }
  L.push("## Método", "", r.metodo, "", "Equivalência, seleção, adjudicação e parada: `regras.md`.", "");
  L.push("## Por campanha × braço (contagens)", "");
  L.push("| campanha | braço | átomos | em grupo MA divergente | em grupo MA que muda crédito | em grupo LN com norma divergente | à adjudicação |", "|---|---|---:|---:|---:|---:|---:|");
  for (const [c, bs] of Object.entries(r.porCampanhaBraco as Record<string, Record<string, Record<string, number>>>)) for (const [b, x] of Object.entries(bs))
    L.push(`| ${c} | ${b} | ${x.atomos} | ${x.emGrupoDivergenteMA} | ${x.emGrupoQueMudaCreditoMA} | ${x.emGrupoNormaDivergeLN} | ${x.aAdjudicacao} |`);
  L.push("");
  const grupoMd = (g: GrupoAnalisado) => {
    const d = g.descricao;
    L.push(`### ${g.id} · ${g.n} membros · lotes ${g.lotes.join(", ")}${g.mudaCredito ? " · **muda crédito**" : ""}${g.desempate ? " · → adjudicação" : ""}`, "");
    L.push(g.nivel === "mesma-alegacao"
      ? `Tela ${d.tela} · ${d.perguntas} · regra \`${d.regra ?? SEM_REGRA}\` · estado \`${d.estado}\` · tipo ${d.tipoDeSujeito}  \nSujeito: \`${cel(d.sujeito).slice(0, 220)}\``
      : `Regra \`${d.regra}\` × ${d.tipoDeSujeito}`);
    L.push("", `Divergem: ${g.divergencias.join(", ") || "—"} · classificação da divergência: (a preencher pelo adjudicador)`, "");
    const cols = CAMPOS.filter(c => g.valores.some(v => v.valores[c.nome] !== null)).map(c => c.nome);
    L.push(`| átomo | lote | ${cols.join(" | ")} |`, `|---|---|${cols.map(() => "---").join("|")}|`);
    for (const v of g.valores) L.push(`| ${v.id} | ${v.lote.replace("lote-", "")} | ${cols.map(c => cel(v.valores[c])).join(" | ")} |`);
    L.push("", "Textos observados (conferência do agrupamento):");
    for (const o of g.observados) L.push(`- ${o.id}: ${cel(o.texto)}`);
    L.push("");
  };
  for (const [nome, gs] of [["mesma alegação", a.mesmaAlegacao], ["mesma leitura da norma", a.mesmaLeitura]] as const) {
    const div = gs.filter(g => g.n >= 2 && g.divergente);
    L.push(`## Grupos divergentes — ${nome} (${div.length}; ${div.filter(g => g.desempate).length} à adjudicação; ${div.filter(g => g.mudaCredito).length} mudam o crédito)`, "");
    for (const g of [...div.filter(g => g.desempate), ...div.filter(g => !g.desempate)]) grupoMd(g);
  }
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── cegueira: peças comuns (desempate e amostra)

/**
 * Justificativas arquivadas e notas de juízes anteriores de cada átomo — a mesma coleta de `justificativasDe` do
 * e14-preparar (não exportada lá; repetida aqui para não mexer no arquivo) — mais a justificativa da 1ª passada da T3.
 */
export function justificativasPorChave(itens: ItemChave[], inv: Inventario, julgados: Map<string, Julgado>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (chave: string, t: unknown) => { if (typeof t === "string" && t.trim()) out.set(chave, [...(out.get(chave) ?? []), t]); };
  for (const it of itens) {
    const p = inv.pares.find(x => x.campanha === it.campanha && x.par === it.par)!;
    add(it.chave, p.reviews.decisions.find(d => d.cardId === it.cardIdOriginal)?.rationale);
    add(it.chave, julgados.get(it.id)?.resposta.justificativa);
  }
  const porM = new Map(itens.filter(i => i.mId).map(i => [i.mId!, i.chave]));
  const rev = lerJson<Record<string, Record<string, Record<string, unknown>>>>(join(NAT73, "equivalencia", "julgamentos-revisor-novo.json"));
  const notas = (id: string, v: unknown) => { const c = porM.get(id); if (!c || !v || typeof v !== "object") return;
    const x = v as { julgamento?: { nota?: string }[]; atomos?: { nota?: string }[]; motivoExcecao?: string };
    for (const a of [...(x.julgamento ?? []), ...(x.atomos ?? [])]) add(c, a.nota); add(c, x.motivoExcecao); };
  for (const [id, v] of Object.entries(rev.nivel1?.membros ?? {})) notas(id, v);
  for (const [id, v] of Object.entries(rev.nivel2?.representantes ?? {})) notas(id, v);
  for (const [id, v] of Object.entries(rev.nivel2?.membros ?? {})) notas(id, v);
  const sel = lerJson<{ amostra: { chave: string; campanha: string; par: string; cardId: string }[] }>(join(NAT73, "selecao-ratificacao.json")).amostra;
  for (const [s, v] of Object.entries(rev.nivel3 ?? {})) {
    const a = sel.find(x => x.chave === s);
    const it = a && itens.find(i => i.campanha === a.campanha && i.par === a.par && i.cardIdOriginal === a.cardId);
    if (it) for (const x of (v as { atomos?: { nota?: string }[] }).atomos ?? []) add(it.chave, x.nota);
  }
  const casos = lerJson<{ casos: Record<string, { id: string }> }>(join(NAT73, "ratificacao", "chave", "revelacao.json")).casos;
  const jdir = join(NAT73, "ratificacao", "julgamentos");
  for (const f of readdirSync(jdir).filter(f => f.endsWith(".json")).sort()) {
    const j = lerJson<{ caso?: string; nota?: string; atomos?: { nota?: string }[] }>(join(jdir, f));
    const c = j.caso ? porM.get(casos[j.caso]?.id ?? "") : undefined;
    if (c) { add(c, j.nota); for (const a of j.atomos ?? []) add(c, a.nota); }
  }
  return out;
}

/**
 * Cegueira de um conjunto de arquivos ao juiz: a porta da NAT-73 (`verificarCegueira`, cartões pelo id novo) +
 * conferências do E14 fresco: (a) nenhum id da 1ª passada; (b) nenhum trecho (40 car.) de justificativa da 1ª passada
 * que não seja texto do material publicado aos juízes da 1ª passada (citação de cartão/referência/norma);
 * (c) nenhum campo de resposta nos lotes. `informado: true` (etapa B) dispensa (b) e (c): ali as respostas anteriores
 * são mostradas de propósito.
 */
export function conferirCegueira(o: { fila: string; analise: Analise; inv: Inventario; arquivos: { rel: string; texto: string }[];
  cartaoNovo: Map<string, CartaoCego>; informado?: boolean }): Cegueira & { falhasExtras: Falha[] } {
  const { analise, inv } = o;
  const just = justificativasPorChave(analise.itens, inv, analise.julgados);
  const itemPorId = new Map(analise.itens.map(i => [i.id, i]));
  const atomos = new Map(inv.atomos.map(a => [a.chave, a]));
  const entradas = analise.membros.map(m => ({ cartao: o.cartaoNovo.get(m.id) ?? m.cartao, card: cartaoDoAtomo(inv, atomos.get(m.chave)!), item: itemPorId.get(m.id)!,
    justificativas: o.informado ? (just.get(m.chave) ?? []).filter(t => t !== analise.julgados.get(m.id)?.resposta.justificativa) : just.get(m.chave) ?? [] }));
  const ceg = verificarCegueira({ arquivos: o.arquivos, cartoes: entradas });
  const extras: Falha[] = [];
  for (const f of o.arquivos) for (const m of analise.membros) if (f.texto.includes(m.id)) extras.push({ arquivo: f.rel, cartao: null, regra: "id da 1ª passada", trecho: m.id });
  if (!o.informado) {
    const comoLido = (t: string) => t.replace(/\\"/g, '"').replace(/\s+/g, " ").toLowerCase();
    const manifesto = JSON.parse(lerTexto(join(o.fila, "lotes", "manifesto.json"))) as Manifesto;
    const publico = comoLido([...manifesto.lotes.map(m => lerTexto(join(o.fila, "lotes", `${m.lote}.json`))), lerTexto(join(o.fila, "lotes", "LEIAME-juiz.md"))].join("\n"));
    const ws = unicos([...analise.julgados.values()].flatMap(j => janelas(j.resposta.justificativa))).filter(w => !publico.includes(w));
    for (const f of o.arquivos) { const n = comoLido(f.texto); const w = ws.find(x => n.includes(x)); if (w) extras.push({ arquivo: f.rel, cartao: null, regra: "trecho de justificativa da 1ª passada", trecho: w }); }
    for (const f of o.arquivos.filter(x => x.rel.endsWith(".json") && !/schema/.test(x.rel)))
      if (/"(?:forcaDoVeredito|justificativa|respostas|leituraDaNorma|desempates)"\s*:/.test(f.texto)) extras.push({ arquivo: f.rel, cartao: null, regra: "campo de resposta no lote", trecho: "forcaDoVeredito/justificativa/respostas/leituraDaNorma" });
  }
  const novos = new Set([...o.cartaoNovo.values()].map(c => c.id));
  return { ...ceg, porCartao: ceg.porCartao.filter(c => novos.has(c.id)), falhasExtras: extras };
}

// ───────────────────────────────────────────────────────────────── amostra de confiabilidade

export const SEMENTE_AMOSTRA = "nat74-e14-confiabilidade-v1|";
export const TAMANHO_AMOSTRA = 40;
export const POR_ARQUIVO_AMOSTRA = 20;
export const JUIZES_AMOSTRA = ["j1", "j2"] as const;
export const nomeAmostra = (i: number): string => `amostra-${String(i + 1).padStart(2, "0")}`;
export const idDaAmostra = (chave: string): string => `T3-${sha(SEMENTE_AMOSTRA + "membro|" + chave).slice(0, 10)}`;

/** Resultado da 1ª passada em três: positivo (alguma violação), negativo (erro/observação), incerto (pendente/evidência). */
export function resultadoDe(d: Pick<Derivado, "classe">): "positivo" | "negativo" | "incerto" {
  if (d.classe.startsWith("violacao")) return "positivo";
  if (d.classe === "pendente" || d.classe === "evidencia-indisponivel") return "incerto";
  return "negativo";
}

export interface SorteioAmostra { estratos: Record<string, { tamanho: number; sorteados: number }>; ids: string[] }

/**
 * Sorteio estratificado (sem braço): estrato = tela × resultado da 1ª passada × situação no grupo MA (concordante,
 * divergente, isolado). Alocação: 1 por estrato não vazio + o resto proporcional ao tamanho (maiores restos; empate pelo
 * nome). Dentro do estrato, rodízio entre grupos MA (ordem pelo sha256(semente + chave)), para não tirar várias
 * cópias da mesma alegação.
 */
export function sortearAmostra(a: Analise, n = TAMANHO_AMOSTRA, semente = SEMENTE_AMOSTRA): SorteioAmostra {
  const grupoMA = new Map(a.mesmaAlegacao.flatMap(g => g.membros.map(id => [id, g] as const)));
  const h = (m: Membro) => sha(semente + m.chave);
  const estratoDe = (m: Membro) => {
    const g = grupoMA.get(m.id)!;
    const sit = g.n < 2 ? "isolado" : g.divergente ? "divergente" : "concordante";
    return `${m.tela} · ${resultadoDe(a.julgados.get(m.id)!.derivado)} · ${sit}`;
  };
  const por = new Map<string, Membro[]>();
  for (const m of a.membros) { const e = estratoDe(m); por.set(e, [...(por.get(e) ?? []), m]); }
  const nomes = [...por.keys()].sort();
  if (nomes.length > n) throw new Error(`amostra: ${nomes.length} estratos > ${n}`);
  const aloc = new Map(nomes.map(e => [e, 1]));
  const resto = n - nomes.length, total = a.membros.length;
  const quotas = nomes.map(e => ({ e, q: (resto * por.get(e)!.length) / total }));
  for (const x of quotas) aloc.set(x.e, Math.min(por.get(x.e)!.length, aloc.get(x.e)! + Math.floor(x.q)));
  let falta = n - [...aloc.values()].reduce((s, x) => s + x, 0);
  const ordemResto = [...quotas].sort((x, y) => (y.q - Math.floor(y.q)) - (x.q - Math.floor(x.q)) || (x.e < y.e ? -1 : 1));
  while (falta > 0) {
    let mudou = false;
    for (const x of ordemResto) { if (falta <= 0) break; if (aloc.get(x.e)! < por.get(x.e)!.length) { aloc.set(x.e, aloc.get(x.e)! + 1); falta--; mudou = true; } }
    if (!mudou) break;
  }
  const ids: string[] = [];
  const estratos: SorteioAmostra["estratos"] = {};
  for (const e of nomes) {
    const ms = por.get(e)!;
    const porGrupo = new Map<string, Membro[]>();
    for (const m of ms) { const g = grupoMA.get(m.id)!.id; porGrupo.set(g, [...(porGrupo.get(g) ?? []), m]); }
    const filas = [...porGrupo.values()].map(x => x.sort((p, q) => (h(p) < h(q) ? -1 : 1))).sort((p, q) => (h(p[0]) < h(q[0]) ? -1 : 1));
    const escolhidos: Membro[] = [];
    for (let r = 0; escolhidos.length < aloc.get(e)!; r++) for (const f of filas) { if (escolhidos.length >= aloc.get(e)!) break; if (f[r]) escolhidos.push(f[r]); }
    ids.push(...escolhidos.map(m => m.id));
    estratos[e] = { tamanho: ms.length, sorteados: escolhidos.length };
  }
  return { estratos, ids: ids.sort((p, q) => { const a1 = h(a.membros.find(m => m.id === p)!), b1 = h(a.membros.find(m => m.id === q)!); return a1 < b1 ? -1 : 1; }) };
}

export const ESQUEMA_RESPOSTAS_AMOSTRA = { ...ESQUEMA_RESPOSTAS, properties: { ...ESQUEMA_RESPOSTAS.properties, lote: { type: "string", pattern: "^amostra-\\d{2}$" } } };

export function leiameAmostra(arquivos: string[]): string {
  return `# Amostra de confiabilidade — como responder

As instruções são as do arquivo \`LEIAME-juiz.md\` (o original da fila, sem mudança). Só muda o nome dos arquivos:

- o lote que você recebeu chama-se \`amostra-NN.json\` (${arquivos.join(", ")}); responda todos os cartões dele;
- grave a resposta em \`respostas/amostra-NN-<juiz>.json\` (o caminho exato vem de quem lhe passou o lote: \`-j1\` ou \`-j2\`);
- no arquivo de resposta, \`lote\` é \`"amostra-NN"\` e \`loteSha256\` é o sha256 do \`amostra-NN.json\` recebido;
- o esquema é \`esquema-respostas-amostra.schema.json\` (igual ao original, salvo o nome do lote).
`;
}

export interface PreparoAmostra { sorteio: SorteioAmostra; arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>; cegueira: Cegueira & { falhasExtras: Falha[] } }

export function prepararAmostra(o: { fila?: string; inv?: Inventario } = {}): PreparoAmostra {
  const fila = o.fila ?? FILA();
  const inv = o.inv ?? inventarioDeAtomos();
  const a = analisarFila(fila, inv);
  const sorteio = sortearAmostra(a);
  const porId = new Map(a.membros.map(m => [m.id, m]));
  const novo = new Map(sorteio.ids.map(id => [id, idDaAmostra(porId.get(id)!.chave)]));
  for (const v of novo.values()) if (porId.has(v)) throw new Error(`amostra: id novo coincide com id da 1ª passada: ${v}`);
  const leiameJ = lerTexto(join(fila, "lotes", "LEIAME-juiz.md"));
  const esquema = jsonTexto(ESQUEMA_RESPOSTAS_AMOSTRA);
  const nomes = Array.from({ length: Math.ceil(sorteio.ids.length / POR_ARQUIVO_AMOSTRA) }, (_, i) => nomeAmostra(i));
  const leiameA = leiameAmostra(nomes.map(n => `${n}.json`));
  const juiz = new Map<string, string>([["LEIAME-juiz.md", leiameJ], ["LEIAME-amostra.md", leiameA], ["esquema-respostas-amostra.schema.json", esquema]]);
  const cartaoNovo = new Map<string, CartaoCego>();
  const arquivosLista: { amostra: string; ids: string[]; idsOriginais: string[] }[] = [];
  nomes.forEach((nome, i) => {
    const idsO = sorteio.ids.slice(i * POR_ARQUIVO_AMOSTRA, (i + 1) * POR_ARQUIVO_AMOSTRA);
    const cs = idsO.map(id => { const c = { ...porId.get(id)!.cartao, id: novo.get(id)! }; cartaoNovo.set(id, c); return c; });
    const telas = unicos(cs.map(c => c.tela));
    juiz.set(`${nome}.json`, jsonTexto({ formato: FORMATO_LOTE, lote: nome, politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-juiz.md", sha256: sha(leiameJ) }, esquema: { arquivo: "esquema-respostas-amostra.schema.json", sha256: sha(esquema) },
      respostaEm: `respostas/${nome}-<juiz>.json`, n: cs.length, referencias: Object.fromEntries(telas.map(t => [t, a.referencias[t]])), cartoes: cs }));
    arquivosLista.push({ amostra: nome, ids: cs.map(c => c.id), idsOriginais: idsO });
  });
  const cegueira = conferirCegueira({ fila, analise: a, inv, arquivos: [...juiz].filter(([rel]) => !/schema/.test(rel)).map(([rel, texto]) => ({ rel, texto })), cartaoNovo });
  const regrasSha = sha(REGRAS);
  // Composição (contagens; sem braço por cartão).
  const comp = (f: (m: Membro) => string) => { const r: Record<string, number> = {}; for (const id of sorteio.ids) { const k = f(porId.get(id)!); r[k] = (r[k] ?? 0) + 1; } return Object.fromEntries(Object.entries(r).sort()); };
  const composicao = { porEstrato: sorteio.estratos, porTela: comp(m => m.tela), porPerguntas: comp(m => (m.tipo === "qualidade" ? "qualidade" : "completa")),
    porResultado: comp(m => resultadoDe(a.julgados.get(m.id)!.derivado)), porClasse: comp(m => a.julgados.get(m.id)!.derivado.classe),
    porRegraCitada: comp(m => (m.regra ? "com regra" : "sem regra")), porTipoDeSujeito: comp(m => m.tipoDeSujeito),
    porCampanhaBraco_soContagem: comp(m => `${m.campanha}/${m.braco}`) };
  const internos = new Map<string, string>();
  internos.set("chave/amostra-chave.json", jsonTexto({ formato: "nat74-t3-amostra-chave-1.0.0", aviso: "NÃO entregar aos juízes", semente: SEMENTE_AMOSTRA, regrasSha256: regrasSha,
    itens: arquivosLista.flatMap(l => l.ids.map((id, k) => ({ id, idOriginal: l.idsOriginais[k], amostra: l.amostra, chave: porId.get(l.idsOriginais[k])!.chave }))) }));
  internos.set("cegueira.json", jsonTexto({ formato: "nat74-t3-amostra-cegueira-1.0.0", resultado: cegueira.falhas.length + cegueira.falhasExtras.length ? "FALHOU" : "OK",
    falhas: cegueira.falhas, falhasExtras: cegueira.falhasExtras, padroes: cegueira.padroes, porCartao: cegueira.porCartao }));
  internos.set("manifesto.json", jsonTexto({ formato: "nat74-t3-amostra-manifesto-1.0.0", versao: E14_VERSAO, politica: POLITICA_PRINCIPAL, regrasSha256: regrasSha,
    semente: SEMENTE_AMOSTRA, tamanho: sorteio.ids.length, juizesPorCartao: JUIZES_AMOSTRA.length, juizes: JUIZES_AMOSTRA,
    regraDoSorteio: "estrato = tela × resultado da 1ª passada (positivo/negativo/incerto) × situação no grupo MA (concordante/divergente/isolado); 1 por estrato + resto proporcional (maiores restos); dentro do estrato, rodízio entre grupos MA pela ordem de sha256(semente + chave); nunca o braço",
    instrucoesOriginais: { arquivo: "LEIAME-juiz.md", sha256: sha(leiameJ), igualAoDaFila: true }, composicao,
    arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
    amostras: arquivosLista.map(l => ({ amostra: l.amostra, n: l.ids.length, sha256: sha(juiz.get(`${l.amostra}.json`)!), ids: l.ids,
      respostas: JUIZES_AMOSTRA.map(j => `respostas/${l.amostra}-${j}.json`) })),
    chaveSha256: sha(internos.get("chave/amostra-chave.json")!) }));
  return { sorteio, arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira };
}

// ───────────────────────────────────────────────────────────────── confiabilidade (depois dos juízes)

/** κ de Cohen para dois avaliadores (categorias nominais). null se P_e = 1. */
export function cohen(a: string[], b: string[]): number | null {
  const n = a.length; if (!n) return null;
  const po = a.filter((x, i) => x === b[i]).length / n;
  const cats = unicos([...a, ...b]);
  const pe = cats.reduce((s, c) => s + (a.filter(x => x === c).length / n) * (b.filter(x => x === c).length / n), 0);
  return pe < 1 ? r4((po - pe) / (1 - pe)) : null;
}
/** κ de Fleiss com o mesmo número m de avaliações por item (Fleiss 1971). null se P_e = 1. */
export function fleiss(itens: string[][]): number | null {
  const N = itens.length; if (!N) return null;
  const m = itens[0].length; if (m < 2 || itens.some(x => x.length !== m)) throw new Error("fleiss: avaliações por item têm de ser iguais e ≥ 2");
  const cats = unicos(itens.flat());
  const pbar = itens.reduce((s, x) => s + cats.reduce((t, c) => { const k = x.filter(v => v === c).length; return t + k * (k - 1); }, 0) / (m * (m - 1)), 0) / N;
  const pe = cats.reduce((s, c) => s + (itens.flat().filter(v => v === c).length / (N * m)) ** 2, 0);
  return pe < 1 ? r4((pbar - pe) / (1 - pe)) : null;
}

export function confiabilidade(o: { fila?: string; amostra: string }): { erros: string[]; relatorio: Record<string, unknown> | null } {
  const fila = o.fila ?? FILA();
  const erros: string[] = [];
  const man = JSON.parse(lerTexto(join(o.amostra, "manifesto.json"))) as { amostras: { amostra: string; sha256: string; ids: string[] }[]; chaveSha256: string; regrasSha256: string };
  const cTxt = lerTexto(join(o.amostra, "chave", "amostra-chave.json"));
  if (sha(cTxt) !== man.chaveSha256) erros.push("chave da amostra difere do manifesto");
  const itensA = new Map((JSON.parse(cTxt) as { itens: { id: string; idOriginal: string; amostra: string }[] }).itens.map(i => [i.id, i]));
  const d = membrosDaFila(fila);
  const julg1 = julgadosDaFila(fila);
  const itemPorId = new Map(d.itens.map(i => [i.id, i]));
  const v = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(ESQUEMA_RESPOSTAS_AMOSTRA as object);
  const porJuiz: Record<string, Map<string, { resposta: Resposta; derivado: Derivado }>> = { j1: new Map(), j2: new Map() };
  for (const am of man.amostras) {
    const lTxt = lerTexto(join(o.amostra, `${am.amostra}.json`));
    if (sha(lTxt) !== am.sha256) { erros.push(`${am.amostra}.json difere do manifesto`); continue; }
    const lote = JSON.parse(lTxt) as { cartoes: CartaoCego[]; referencias: Referencias };
    const cartoes = new Map(lote.cartoes.map(c => [c.id, c]));
    for (const j of JUIZES_AMOSTRA) {
      const rel = `respostas/${am.amostra}-${j}.json`, abs = join(o.amostra, rel);
      if (!existsSync(abs)) { erros.push(`${rel} ausente`); continue; }
      const doc = JSON.parse(lerTexto(abs)) as { formato: string; lote: string; loteSha256: string; respostas: Resposta[] };
      if (!v(doc)) { for (const x of v.errors ?? []) erros.push(`${rel}: esquema ${x.instancePath || "/"} ${x.message}`); continue; }
      if (doc.formato !== FORMATO_RESPOSTAS || doc.lote !== am.amostra || doc.loteSha256 !== am.sha256) erros.push(`${rel}: formato/lote/loteSha256 não conferem`);
      const ids = doc.respostas.map(r => r.id);
      for (const id of am.ids) if (!ids.includes(id)) erros.push(`${rel}: incompleto — falta ${id}`);
      for (const id of ids) if (!am.ids.includes(id) || ids.indexOf(id) !== ids.lastIndexOf(id)) erros.push(`${rel}: id fora da amostra ou repetido ${id}`);
      for (const r of doc.respostas) {
        const c = cartoes.get(r.id), ia = itensA.get(r.id);
        if (!c || !ia) continue;
        const ctx = contextoDe(c, itemPorId.get(ia.idOriginal)!, lote.referencias[c.tela].defeitos.map(x => x.id));
        const e = validarResposta(r, ctx);
        if (e.length) { for (const x of e) erros.push(`${rel}: ${r.id}: ${x}`); continue; }
        porJuiz[j].set(ia.idOriginal, { resposta: r, derivado: derivarClasse(r, ctx) });
      }
    }
  }
  if (erros.length) return { erros, relatorio: null };
  const ids = [...itensA.values()].map(i => i.idOriginal).sort();
  const campos: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    const trios = ids.map(id => [c.valor(porJuiz.j1.get(id)!), c.valor(porJuiz.j2.get(id)!), c.valor(julg1.get(id)!)]);
    const par = (i: number, k: number) => { const x = trios.filter(t => t[i] !== null && t[k] !== null); const a1 = x.map(t => t[i]!), b1 = x.map(t => t[k]!);
      return { n: x.length, concordantes: a1.filter((y, n) => y === b1[n]).length, pct: x.length ? r4(a1.filter((y, n) => y === b1[n]).length / x.length) : null, kappaCohen: cohen(a1, b1) }; };
    const completos = trios.filter(t => t.every(x => x !== null)) as string[][];
    campos[c.nome] = { j1xj2: par(0, 1), j1x1a: par(0, 2), j2x1a: par(1, 2),
      tres: { n: completos.length, unanimes: completos.filter(t => t[0] === t[1] && t[1] === t[2]).length, kappaFleiss: completos.length ? fleiss(completos) : null } };
  }
  const relatorio = { formato: "nat74-t3-confiabilidade-1.0.0", regrasSha256: man.regrasSha256, cartoes: ids.length,
    metodo: "Mesmos cartões (idênticos aos da 1ª passada, id novo) julgados por 2 juízes novos e cegos com as instruções originais. Por campo, só cartões em que os avaliadores comparados responderam o campo. % de concordância e κ de Cohen para cada par (j1×j2, j1×1ª, j2×1ª); κ de Fleiss com 3 avaliações iguais por cartão (j1, j2, 1ª passada) nos cartões em que as três responderam. κ null quando a concordância esperada é 1 (uma categoria só).",
    campos };
  return { erros: [], relatorio };
}

function confiabilidadeMd(r: { cartoes: number; metodo: string; campos: Record<string, { j1xj2: { n: number; pct: number | null; kappaCohen: number | null }; j1x1a: { pct: number | null; kappaCohen: number | null }; j2x1a: { pct: number | null; kappaCohen: number | null }; tres: { n: number; unanimes: number; kappaFleiss: number | null } }> }): string {
  const k = (x: number | null) => (x === null ? "n/d" : x.toFixed(3));
  const L = ["# Fila T3 — amostra de confiabilidade", "", `${r.cartoes} cartões. ${r.metodo}`, "",
    "| campo | n (j1×j2) | % j1×j2 | κ Cohen j1×j2 | % j1×1ª | κ j1×1ª | % j2×1ª | κ j2×1ª | n (3) | unânimes | κ Fleiss (3) |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"];
  for (const [c, x] of Object.entries(r.campos)) L.push(`| ${c} | ${x.j1xj2.n} | ${pct(x.j1xj2.pct)} | ${k(x.j1xj2.kappaCohen)} | ${pct(x.j1x1a.pct)} | ${k(x.j1x1a.kappaCohen)} | ${pct(x.j2x1a.pct)} | ${k(x.j2x1a.kappaCohen)} | ${x.tres.n} | ${x.tres.unanimes} | ${k(x.tres.kappaFleiss)} |`);
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── CLI

export function argumento(nome: string): string | null {
  const i = process.argv.indexOf(nome);
  return i > 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : null;
}

export function gravarRegras(saida: string): string {
  gravar(saida, "consistencia/regras.md", REGRAS);
  gravar(saida, "consistencia/regras.md.sha256", `${sha(REGRAS)}  regras.md\n`);
  return sha(REGRAS);
}

if (process.argv[1] && /(?:^|[\\/])e14-consistencia\.ts$/.test(process.argv[1])) {
  const modo = process.argv[2];
  const fila = argumento("--fila") ?? FILA();
  const saida = argumento("--saida");
  try {
    if (modo === "relatorio") {
      if (!saida) throw new Error("uso: e14-consistencia relatorio --saida PASTA [--fila PASTA_FILA_T3]");
      const a = analisarFila(fila);
      const json = jsonTexto(a.relatorio);
      gravar(saida, "consistencia/relatorio.json", json);
      gravar(saida, "consistencia/relatorio.json.sha256", `${sha(json)}  relatorio.json\n`);
      gravar(saida, "consistencia/relatorio.md", relatorioMd(a));
      const rs = gravarRegras(saida);
      const r = a.relatorio as { resumo: Record<string, { gruposComDoisOuMais: number; divergentes: number; mudamCredito: number; classeDiverge: number; vaoAAdjudicacao: number }> };
      for (const [k, x] of Object.entries(r.resumo)) console.log(`${k}: ${x.gruposComDoisOuMais} grupos ≥2; ${x.divergentes} divergentes; classe diverge ${x.classeDiverge}; mudam crédito ${x.mudamCredito}; ${x.vaoAAdjudicacao} à adjudicação`);
      console.log(`regras.md sha256 ${rs}\ngravado em ${join(saida, "consistencia")}`);
    } else if (modo === "amostra") {
      if (!saida) throw new Error("uso: e14-consistencia amostra --saida PASTA [--fila PASTA_FILA_T3]");
      const p = prepararAmostra({ fila });
      gravar(saida, "confiabilidade/cegueira.json", p.arquivosInternos.get("cegueira.json")!);
      const nf = p.cegueira.falhas.length + p.cegueira.falhasExtras.length;
      if (nf) { console.error(`CEGUEIRA FALHOU (${nf}); nada mais gravado.`); for (const f of [...p.cegueira.falhas, ...p.cegueira.falhasExtras].slice(0, 30)) console.error(`  ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`); process.exit(3); }
      const resp = join(saida, "confiabilidade", "respostas");
      if (existsSync(resp) && readdirSync(resp).some(f => f.endsWith(".json"))) {
        for (const [rel, t] of p.arquivosDoJuiz) { const abs = join(saida, "confiabilidade", rel); if (existsSync(abs) && readFileSync(abs, "utf8") !== t) { console.error(`PARADO: confiabilidade/${rel} mudaria, e já há respostas.`); process.exit(4); } }
      }
      for (const [rel, t] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(saida, `confiabilidade/${rel}`, t);
      gravarRegras(saida);
      console.log(`E14 amostra ok: ${p.sorteio.ids.length} cartões em ${Math.ceil(p.sorteio.ids.length / POR_ARQUIVO_AMOSTRA)} arquivo(s); cegueira OK (0 falhas)`);
      console.log(`  estratos: ${JSON.stringify(p.sorteio.estratos)}`);
    } else if (modo === "confiabilidade") {
      const am = argumento("--amostra");
      if (!am) throw new Error("uso: e14-consistencia confiabilidade --amostra PASTA/confiabilidade [--fila PASTA_FILA_T3]");
      const r = confiabilidade({ fila, amostra: am });
      if (r.erros.length) { console.error(`RECUSADO (${r.erros.length}):`); for (const e of r.erros.slice(0, 60)) console.error(`  ${e}`); process.exit(1); }
      gravar(am, "relatorio-confiabilidade.json", jsonTexto(r.relatorio));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gravar(am, "relatorio-confiabilidade.md", confiabilidadeMd(r.relatorio as any));
      console.log(`gravado em ${join(am, "relatorio-confiabilidade.md")}`);
    } else throw new Error("uso: e14-consistencia relatorio|amostra|confiabilidade …");
  } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
}
