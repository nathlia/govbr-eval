/**
 * E14 · adjudicação informada dos grupos divergentes da fila T3 (plano NAT-74 §6.6; regras: e14-consistencia REGRAS,
 * gravadas em consistencia/regras.md). Nenhum passo aqui julga nada.
 *
 *   npm run reanalise:nat74:e14-desempate -- preparar --saida PASTA [--fila PASTA_FILA_T3]
 *     Recalcula a consistência e monta UMA unidade por grupo selecionado (REGRAS §2; grupos que compartilham membros se
 *     juntam). Cada unidade = um lote para UM adjudicador novo: PASTA/desempate/lote-dNN.json (etapa A: só os cartões
 *     cegos, com id novo; nenhuma resposta anterior). Também LEIAME-desempate.md e os esquemas (vão ao adjudicador),
 *     manifesto.json, chave/desempate-chave.json e cegueira.json (não vão). Cegueira com falha → nada é gravado.
 *
 *   npm run reanalise:nat74:e14-desempate -- revelar --desempate PASTA/desempate --lote lote-dNN [--fila …]
 *     Exige respostas/lote-dNN-a.json válido (a leitura individual), congela-o (sha256 no lote B) e grava
 *     lote-dNN-b.json: os mesmos cartões + as respostas anteriores de cada membro (sem lote, juiz, braço).
 *
 *   npm run reanalise:nat74:e14-desempate -- aplicar --desempate PASTA/desempate --saida SAIDA [--fila …]
 *     Exige A e B de toda unidade, valida (esquema, membros exatos, perguntas de cada cartão, norma/força da leitura,
 *     leituras alternativas → incerta, A congelado), e grava SAIDA/fila-t3/: 1ª passada preservada
 *     (julgamentos-1a-passada.json + sha256), respostas/ com a resposta B no lugar da dos membros, lotes/ e chave/
 *     copiados, desempate/sobrescritas.{json,md}. Nunca escreve na fila de entrada. Depois:
 *       npm run reanalise:nat74:e14-ingerir -- --saida SAIDA   → SAIDA/fila-t3/julgamentos.json
 *
 * Determinístico: sem carimbo de tempo, sem rede, sem modelo.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { POLITICA_PRINCIPAL, gravar, jsonTexto, ordenar, sha, unicos } from "./comum";
import { inventarioDeAtomos, type Inventario } from "./e1";
import type { Cegueira, Falha } from "./e14-cegueira";
import {
  E14_VERSAO, ESQUEMA_RESPOSTAS, FILA, NAO_PERGUNTADO, NORMA_PUBLICA, VAL, derivarClasse, validarResposta,
  type CartaoCego, type Derivado, type ItemChave, type Resposta,
} from "./e14-comum";
import {
  CLASSIFICACOES, REGRAS, analisarFila, argumento, conferirCegueira, creditoDe, lerTexto,
  type Analise, type GrupoAnalisado, type Referencias,
} from "./e14-consistencia";
import { contextoDe, ingerir } from "./e14-ingerir";
import { leiameJuiz } from "./e14-preparar";

export const FORMATO_LOTE_A = "nat74-t3-adjudicacao-lote-a-1.0.0";
export const FORMATO_LOTE_B = "nat74-t3-adjudicacao-lote-b-1.0.0";
export const FORMATO_RESP_A = "nat74-t3-adjudicacao-respostas-a-1.0.0";
export const FORMATO_RESP_B = "nat74-t3-adjudicacao-respostas-b-1.0.0";
export const FORMATO_SOBRESCRITAS = "nat74-t3-sobrescritas-1.0.0";
/** Semente dos ids da adjudicação (unidade e membro): nada da 1ª passada aparece neles. */
export const SEMENTE_D = "nat74-e14-desempate-v1|";
export const nomeLoteD = (i: number): string => `lote-d${String(i + 1).padStart(2, "0")}`;
export const idDoMembro = (chave: string): string => `T3-${sha(SEMENTE_D + "membro|" + chave).slice(0, 10)}`;

// ───────────────────────────────────────────────────────────────── seleção (unidades)

export interface Unidade {
  id: string;
  /** Pede `leituraDaNorma` (algum membro tem pergunta de norma). */
  leitura: boolean;
  /** Todos os membros citam a mesma regra. */
  mesmaRegra: boolean;
  origens: { id: string; nivel: string; divergencias: string[]; mudaCredito: boolean }[];
  membros: string[];
  tipoDeSujeito: string[];
}

/** Grupos selecionados (REGRAS §2); os que compartilham membros se juntam (união). Ordem pelo id. */
export function unidadesDeDesempate(a: Analise): Unidade[] {
  const sel = [...a.mesmaLeitura, ...a.mesmaAlegacao].filter(g => g.desempate);
  const pai = sel.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const dono = new Map<string, number>();
  sel.forEach((g, i) => { for (const m of g.membros) { const j = dono.get(m); if (j === undefined) dono.set(m, i); else pai[raiz(i)] = raiz(j); } });
  const blocos = new Map<number, GrupoAnalisado[]>();
  sel.forEach((g, i) => blocos.set(raiz(i), [...(blocos.get(raiz(i)) ?? []), g]));
  const porId = new Map(a.membros.map(m => [m.id, m]));
  return ordenar([...blocos.values()].map(gs => {
    const membros = unicos(gs.flatMap(g => g.membros));
    const regras = unicos(membros.map(id => porId.get(id)!.regra ?? "(sem regra)"));
    return { id: `D-${sha(SEMENTE_D + "grupo|" + membros.map(id => porId.get(id)!.chave).sort().join("|")).slice(0, 10)}`,
      leitura: membros.some(id => porId.get(id)!.perguntaNorma), mesmaRegra: regras.length === 1 && regras[0] !== "(sem regra)",
      origens: ordenar(gs.map(g => ({ id: g.id, nivel: g.nivel, divergencias: g.divergencias, mudaCredito: g.mudaCredito })), o => o.id), membros,
      tipoDeSujeito: unicos(membros.map(id => porId.get(id)!.tipoDeSujeito)) };
  }), u => u.id);
}

// ───────────────────────────────────────────────────────────────── esquemas

const ITEM_RESPOSTA = ESQUEMA_RESPOSTAS.properties.respostas.items;
const TEXTO = { type: "string", minLength: 10 } as const;
const LEITURA = { oneOf: [{ const: NAO_PERGUNTADO }, { type: "object", additionalProperties: false,
  required: ["norma", "fonteEVersao", "forca", "antecedente", "excecoes", "evidenciaNecessaria", "permiteConcluir"],
  properties: { norma: { type: "string", pattern: "^(citada|nenhuma|wcag:\\d+\\.\\d+\\.\\d+|emag:\\d+\\.\\d+)$" }, fonteEVersao: TEXTO, forca: { enum: [...VAL.forca] },
    antecedente: TEXTO, excecoes: TEXTO, evidenciaNecessaria: TEXTO, permiteConcluir: TEXTO } }] } as const;
const base = (formato: string, lote: string, etapa: "a" | "b") => ({
  formato: { const: formato }, lote: { type: "string", pattern: lote }, loteSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
  juiz: { type: "string", minLength: 3 }, etapa: { const: etapa }, grupo: { type: "string", pattern: "^D-[0-9a-f]{10}$" },
  leituraDaNorma: LEITURA, respostas: { type: "array", minItems: 1, items: ITEM_RESPOSTA } });
export const ESQUEMA_A = { $schema: "https://json-schema.org/draft/2020-12/schema", title: FORMATO_RESP_A, type: "object", additionalProperties: false,
  required: ["formato", "lote", "loteSha256", "juiz", "etapa", "grupo", "leituraDaNorma", "respostas"], properties: base(FORMATO_RESP_A, "^lote-d\\d{2}$", "a") } as const;
export const ESQUEMA_B = { $schema: "https://json-schema.org/draft/2020-12/schema", title: FORMATO_RESP_B, type: "object", additionalProperties: false,
  required: ["formato", "lote", "loteSha256", "juiz", "etapa", "grupo", "leituraDaNorma", "leiturasAlternativasPlausiveis", "classificacaoDaDivergencia", "respostas"],
  properties: { ...base(FORMATO_RESP_B, "^lote-d\\d{2}-b$", "b"),
    leiturasAlternativasPlausiveis: { type: "array", items: { type: "string", minLength: 30 } },
    classificacaoDaDivergencia: { type: "object", additionalProperties: false, required: ["tipos", "evidencias", "justificativa"],
      properties: { tipos: { type: "array", minItems: 1, uniqueItems: true, items: { enum: [...CLASSIFICACOES] } },
        evidencias: { type: "array", minItems: 1, items: { type: "string", pattern: "^T3-[0-9a-f]{10}(:[A-Za-z0-9-]+)?$" } }, justificativa: { type: "string", minLength: 30 } } } } } as const;

type Leitura = { norma: string; fonteEVersao: string; forca: string; antecedente: string; excecoes: string; evidenciaNecessaria: string; permiteConcluir: string } | typeof NAO_PERGUNTADO;
interface RespA { formato: string; lote: string; loteSha256: string; juiz: string; etapa: "a"; grupo: string; leituraDaNorma: Leitura; respostas: Resposta[] }
interface RespB extends Omit<RespA, "etapa"> { etapa: "b"; leiturasAlternativasPlausiveis: string[]; classificacaoDaDivergencia: { tipos: string[]; evidencias: string[]; justificativa: string } }

// ───────────────────────────────────────────────────────────────── LEIAME

function secoesDoLeiame(): string {
  const t = leiameJuiz(0, 0);
  const i = t.indexOf("## O que cada cartão traz"), f = t.indexOf("## O arquivo de resposta");
  if (i < 0 || f < 0) throw new Error("E14 desempate: o LEIAME do juiz mudou de forma (seções não achadas)");
  return t.slice(i, f).trimEnd();
}

export function leiameDesempate(): string {
  return `# Fila T3 · adjudicação de um grupo — instruções (política normativa 1.2.0)

Você recebe **um grupo** de cartões (\`grupo\`, \`cartoes\`). Os cartões de um grupo foram reunidos porque falam do mesmo
elemento no mesmo estado, ou citam a mesma norma sobre o mesmo tipo de elemento. Reunir é só triagem: **não** quer dizer
que sejam a mesma situação nem que devam ter a mesma resposta. Cada cartão tem a sua resposta. **Você não escreve a
classe final**: ela sai das suas respostas por regra fixa (tabela abaixo).

**Use só os arquivos que recebeu.** Não procure outros arquivos, não abra páginas e não tente descobrir de onde um cartão
veio nem quem o escreveu. Quando o material não basta, a resposta certa é \`indeterminado\` / \`incerta\` / \`incerto\` /
\`indisponivel\` — nunca um palpite "por precaução".

São **duas etapas**, nesta ordem:

## Etapa A — leitura individual (\`lote-dNN.json\` → \`respostas/lote-dNN-a.json\`)

1. **Leia a norma uma vez** (\`grupo.norma\`, ou o \`normaCitada\` dos cartões) e escreva em \`leituraDaNorma\` a **regra de
   interpretação** que vai aplicar (quando \`grupo.pedeLeituraDaNorma\` é \`true\`; senão \`"${NAO_PERGUNTADO}"\`):
   - \`norma\`: \`"citada"\` se os cartões citam regra; senão a norma pública que a alegação implica (\`wcag:x.y.z\`,
     \`emag:x.y\`) ou \`"nenhuma"\`;
   - \`fonteEVersao\`: de onde vem o texto e de que versão (ex.: "WCAG 2.2, critério …");
   - \`forca\`: a força da norma (\`obrigatorio\` · \`recomendado\` · \`boa-pratica\` · \`exemplo\` · \`nenhuma\` · \`indeterminado\`);
   - \`antecedente\`: quando ela se aplica (a que elemento/situação);
   - \`excecoes\`: o que a afasta ou a satisfaz por outro meio;
   - \`evidenciaNecessaria\`: o que precisa estar no cartão para concluir;
   - \`permiteConcluir\`: o que essa evidência permite (e não permite) concluir.
2. Responda **cada cartão** do grupo, um por um. A leitura fixa a norma e a força (iguais em todos os cartões com
   pergunta de norma); **aplicabilidade e violação são de cada cartão**: mesma tag e mesma regra não fazem a mesma
   situação (ex.: \`title\` ou \`aria-labelledby\` podem dar nome a um botão só com ícone). Se um cartão difere, diga na
   justificativa qual fato difere.

## Etapa B — reconciliação (\`lote-dNN-b.json\` → \`respostas/lote-dNN-b.json\`)

Depois que a etapa A estiver gravada, você recebe \`lote-dNN-b.json\`: os mesmos cartões e as respostas que cada cartão
já recebeu antes (\`respostasAnteriores\`; sem dizer de quem). A sua etapa A fica congelada (o sha256 dela vai no lote B).

1. Compare as respostas anteriores com a sua leitura. Mantenha ou mude a leitura e as respostas **só com evidência** do
   cartão; nunca para chegar a acordo.
2. Classifique a divergência em \`classificacaoDaDivergencia\`: \`tipos\` (um ou mais de
   \`diferenca-legitima-de-contexto\` · \`falta-de-evidencia\` · \`interpretacao-normativa\` · \`erro-do-juiz\`),
   \`evidencias\` (ids \`T3-…\` do cartão, ou \`T3-…:OBS\`, \`T3-…:F1\`… para o item do cartão) e \`justificativa\`.
3. Se leituras incompatíveis da norma continuam plausíveis, liste-as em \`leiturasAlternativasPlausiveis\` (uma frase
   cada) e deixe os cartões com pergunta de norma como \`incerta\` / \`incerto\` (ou fato não verdadeiro): o caso fica
   pendente e a alternativa entra como sensibilidade. Se não há, \`[]\`.
4. Responda de novo **cada cartão** (a resposta B é a que vale).

${secoesDoLeiame()}

## Os arquivos de resposta

Etapa A (esquema \`esquema-desempate-a.schema.json\`):

\`\`\`json
{
  "formato": "${FORMATO_RESP_A}", "lote": "lote-d01", "loteSha256": "<sha256 do lote-d01.json>",
  "juiz": "<quem julgou>", "etapa": "a", "grupo": "D-0123456789",
  "leituraDaNorma": { "norma": "citada", "fonteEVersao": "e-MAG 3.1, recomendação …", "forca": "obrigatorio",
    "antecedente": "…", "excecoes": "…", "evidenciaNecessaria": "…", "permiteConcluir": "…" },
  "respostas": [ { "id": "T3-0123456789", "verdadeFactual": "verdadeira", "norma": { "id": "citada", "forca": "obrigatorio",
    "aplicabilidade": "aplica", "violada": "sim" }, "vinculo": "nenhum", "sugestao": "${NAO_PERGUNTADO}", "forcaDoVeredito": "inferido",
    "evidencias": ["OBS", "S1"], "justificativa": "OBS e S1 mostram o botão sem nome calculado; pela leitura, a norma se aplica e foi violada." } ]
}
\`\`\`

Etapa B (esquema \`esquema-desempate-b.schema.json\`): os mesmos campos, com \`"lote": "lote-d01-b"\`, \`"etapa": "b"\`,
\`loteSha256\` do \`lote-d01-b.json\`, mais \`leiturasAlternativasPlausiveis\` e \`classificacaoDaDivergencia\`.
A ingestão recusa o arquivo se faltar um cartão, se um id se repetir ou for de fora do grupo, se um valor estiver fora das
listas, se a justificativa não citar um id do próprio cartão, se norma ou força de um cartão diferirem da leitura, se
houver leitura alternativa e um cartão com pergunta de norma sair com classe final, ou se \`loteSha256\` não conferir.
`;
}

// ───────────────────────────────────────────────────────────────── preparar (etapa A)

interface ChaveFila { itens: ItemChave[] }
export interface MembroChaveD { id: string; idOriginal: string; chave: string; loteOriginal: string }
export interface UnidadeChaveD { id: string; lote: string; leitura: boolean; mesmaRegra: boolean; origens: Unidade["origens"]; membros: MembroChaveD[] }
interface GrupoLote { id: string; pedeLeituraDaNorma: boolean; normaUnica: boolean; descricao: string; norma: CartaoCego["normaCitada"]; membros: string[] }
interface LoteA { formato: string; lote: string; grupo: GrupoLote; referencias: Referencias; cartoes: (CartaoCego & { grupo: string })[] }

export interface PreparoD {
  analise: Analise; unidades: Unidade[];
  arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>;
  cegueira: Cegueira & { falhasExtras: Falha[] };
  lotes: { lote: string; grupo: string; ids: string[] }[];
}

export function prepararDesempate(o: { fila?: string; inv?: Inventario } = {}): PreparoD {
  const fila = o.fila ?? FILA();
  const inv = o.inv ?? inventarioDeAtomos();
  const analise = analisarFila(fila, inv);
  const unidades = unidadesDeDesempate(analise);
  const mTxt = lerTexto(join(fila, "lotes", "manifesto.json"));
  const porId = new Map(analise.membros.map(m => [m.id, m]));
  const novo = new Map(analise.membros.map(m => [m.id, idDoMembro(m.chave)]));
  if (new Set(novo.values()).size !== novo.size) throw new Error("E14 desempate: colisão de id novo de membro");
  for (const v of novo.values()) if (porId.has(v)) throw new Error(`E14 desempate: id novo coincide com id da 1ª passada: ${v}`);

  const leiame = leiameDesempate();
  const esqA = jsonTexto(ESQUEMA_A), esqB = jsonTexto(ESQUEMA_B);
  const juiz = new Map<string, string>([["LEIAME-desempate.md", leiame], ["esquema-desempate-a.schema.json", esqA], ["esquema-desempate-b.schema.json", esqB]]);
  const cartaoNovo = new Map<string, CartaoCego>();
  const unidadesChave: UnidadeChaveD[] = [];
  const lotes: PreparoD["lotes"] = [];
  unidades.forEach((u, k) => {
    const lote = nomeLoteD(k);
    const membros = u.membros.map(id => ({ id: novo.get(id)!, idOriginal: id, chave: porId.get(id)!.chave, loteOriginal: porId.get(id)!.lote }))
      .sort((x, y) => (x.id < y.id ? -1 : 1));
    unidadesChave.push({ id: u.id, lote, leitura: u.leitura, mesmaRegra: u.mesmaRegra, origens: u.origens, membros });
    const cs = membros.map(m => { const c = { ...porId.get(m.idOriginal)!.cartao, id: m.id, grupo: u.id }; cartaoNovo.set(m.idOriginal, c); return c; });
    const normas = unicos(cs.map(c => JSON.stringify(c.normaCitada)));
    const telas = unicos(cs.map(c => c.tela));
    const grupo: GrupoLote = { id: u.id, pedeLeituraDaNorma: u.leitura, normaUnica: u.leitura,
      descricao: u.mesmaRegra
        ? `Os ${cs.length} cartões citam a mesma regra (tipo de elemento: ${u.tipoDeSujeito.join(", ")}). Reunidos só para a mesma regra ser lida do mesmo jeito; cada cartão tem a sua resposta.`
        : `Os ${cs.length} cartões falam do mesmo elemento, no mesmo estado (tipo: ${u.tipoDeSujeito.join(", ")}). Reunidos só por isso; cada cartão tem a sua resposta.`,
      norma: normas.length === 1 ? cs[0].normaCitada : null, membros: cs.map(c => c.id) };
    juiz.set(`${lote}.json`, jsonTexto({ formato: FORMATO_LOTE_A, lote, etapa: "a", politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-desempate.md", sha256: sha(leiame) }, esquema: { arquivo: "esquema-desempate-a.schema.json", sha256: sha(esqA) },
      respostaEm: `respostas/${lote}-a.json`, n: cs.length, grupo, referencias: Object.fromEntries(telas.map(t => [t, analise.referencias[t]])), cartoes: cs }));
    lotes.push({ lote, grupo: u.id, ids: cs.map(c => c.id) });
  });
  const cegueira = conferirCegueira({ fila, analise, inv, arquivos: [...juiz].filter(([rel]) => !/schema/.test(rel)).map(([rel, texto]) => ({ rel, texto })), cartaoNovo });

  const respostas1: Record<string, string> = {};
  const rdir = join(fila, "respostas");
  for (const f of readdirSync(rdir).filter(f => f.endsWith(".json")).sort()) respostas1[`respostas/${f}`] = sha(lerTexto(join(rdir, f)));
  const internos = new Map<string, string>();
  internos.set("chave/desempate-chave.json", jsonTexto({ formato: "nat74-t3-desempate-chave-2.0.0",
    aviso: "NÃO entregar aos adjudicadores: liga o id da adjudicação ao átomo e à 1ª passada", versao: E14_VERSAO, semente: SEMENTE_D,
    regrasSha256: sha(REGRAS), primeiraPassada: { manifestoSha256: sha(mTxt), respostas: respostas1 }, consistenciaSha256: sha(jsonTexto(analise.relatorio)),
    unidades: unidadesChave }));
  internos.set("cegueira.json", jsonTexto({ formato: "nat74-t3-desempate-cegueira-2.0.0",
    regra: "porta da NAT-73 (e14-cegueira) sobre os arquivos do adjudicador (etapa A), cartões pelo id novo; mais: nenhum id da 1ª passada, nenhum trecho de justificativa da 1ª passada fora do material publicado, nenhum campo de resposta nos lotes",
    resultado: cegueira.falhas.length + cegueira.falhasExtras.length ? "FALHOU" : "OK", falhas: cegueira.falhas, falhasExtras: cegueira.falhasExtras, padroes: cegueira.padroes,
    resumo: { cartoes: cegueira.porCartao.length, comSinalResidual: cegueira.porCartao.filter(c => c.sinais.length).length }, porCartao: cegueira.porCartao }));
  internos.set("manifesto.json", jsonTexto({ formato: "nat74-t3-desempate-manifesto-2.0.0", versao: E14_VERSAO, politica: POLITICA_PRINCIPAL, regrasSha256: sha(REGRAS),
    unidades: unidades.length, total: cartaoNovo.size, umAdjudicadorPorLote: true,
    arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
    lotes: lotes.map(l => ({ ...l, n: l.ids.length, sha256: sha(juiz.get(`${l.lote}.json`)!) })),
    chaveSha256: sha(internos.get("chave/desempate-chave.json")!) }));
  return { analise, unidades, arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, lotes };
}

// ───────────────────────────────────────────────────────────────── validação de uma etapa

interface ContextoD { fila: string; dd: string; itens: Map<string, ItemChave>; unidades: Map<string, UnidadeChaveD>; manifesto: { lotes: { lote: string; grupo: string; sha256: string; ids: string[] }[]; chaveSha256: string } }

function contextoD(fila: string, dd: string): ContextoD {
  const man = JSON.parse(lerTexto(join(dd, "manifesto.json"))) as ContextoD["manifesto"];
  const cTxt = lerTexto(join(dd, "chave", "desempate-chave.json"));
  if (sha(cTxt) !== man.chaveSha256) throw new Error("desempate/chave/desempate-chave.json difere do manifesto");
  const chave = JSON.parse(cTxt) as { unidades: UnidadeChaveD[]; primeiraPassada: { manifestoSha256: string; respostas: Record<string, string> } };
  const rdir = join(fila, "respostas");
  const r1 = Object.fromEntries(readdirSync(rdir).filter(f => f.endsWith(".json")).sort().map(f => [`respostas/${f}`, sha(lerTexto(join(rdir, f)))]));
  if (JSON.stringify(r1) !== JSON.stringify(chave.primeiraPassada.respostas)) throw new Error("a 1ª passada (respostas/) mudou depois do preparo da adjudicação: prepare de novo");
  if (sha(lerTexto(join(fila, "lotes", "manifesto.json"))) !== chave.primeiraPassada.manifestoSha256) throw new Error("lotes/manifesto.json da fila difere do usado no preparo");
  return { fila, dd, manifesto: man, unidades: new Map(chave.unidades.map(u => [u.lote, u])),
    itens: new Map((JSON.parse(lerTexto(join(fila, "chave", "fila-t3-chave.json"))) as ChaveFila).itens.map(i => [i.id, i])) };
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
let vA: ReturnType<typeof ajv.compile> | null = null, vB: ReturnType<typeof ajv.compile> | null = null;

/** Valida uma etapa (A ou B) de uma unidade. Devolve erros e, sem erros, as respostas com a classe derivada. */
function validarEtapa(cx: ContextoD, lote: string, etapa: "a" | "b", loteTexto: string, docTexto: string):
  { erros: string[]; doc: RespA | RespB | null; derivadas: Map<string, { resposta: Resposta; derivado: Derivado }> } {
  const erros: string[] = [];
  const derivadas = new Map<string, { resposta: Resposta; derivado: Derivado }>();
  const pre = `respostas/${lote}-${etapa}.json`;
  let doc: RespA | RespB;
  try { doc = JSON.parse(docTexto); } catch (e) { return { erros: [`${pre}: JSON inválido (${(e as Error).message})`], doc: null, derivadas }; }
  const v = etapa === "a" ? (vA ??= ajv.compile(ESQUEMA_A as object)) : (vB ??= ajv.compile(ESQUEMA_B as object));
  if (!v(doc)) return { erros: (v.errors ?? []).map(x => `${pre}: esquema ${x.instancePath || "/"} ${x.message}`), doc: null, derivadas };
  const l = JSON.parse(loteTexto) as LoteA;
  const u = cx.unidades.get(lote)!;
  if (doc.lote !== (etapa === "a" ? lote : `${lote}-b`)) erros.push(`${pre}: lote "${doc.lote}" não confere`);
  if (doc.loteSha256 !== sha(loteTexto)) erros.push(`${pre}: loteSha256 não é o do lote recebido`);
  if (doc.grupo !== u.id) erros.push(`${pre}: grupo ${doc.grupo} ≠ ${u.id}`);
  const leitura = doc.leituraDaNorma;
  if (l.grupo.pedeLeituraDaNorma && leitura === NAO_PERGUNTADO) erros.push(`${pre}: leituraDaNorma é pedida neste grupo`);
  const citam = l.cartoes.some(c => c.alegacao.regra !== null);
  if (leitura !== NAO_PERGUNTADO) {
    if (citam && leitura.norma !== "citada") erros.push(`${pre}: os cartões citam regra: leituraDaNorma.norma = "citada"`);
    if (!citam && !(leitura.norma === "nenhuma" || NORMA_PUBLICA.test(leitura.norma))) erros.push(`${pre}: cartões sem regra: leituraDaNorma.norma = id público ou "nenhuma"`);
    if (!citam && (leitura.norma === "nenhuma") !== (leitura.forca === "nenhuma")) erros.push(`${pre}: leituraDaNorma: norma "nenhuma" ⇔ força "nenhuma"`);
  }
  const ids = doc.respostas.map(r => r.id);
  for (const x of unicos(ids.filter((x, i) => ids.indexOf(x) !== i))) erros.push(`${pre}: id repetido ${x}`);
  for (const x of ids) if (!l.grupo.membros.includes(x)) erros.push(`${pre}: id fora do grupo ${x}`);
  for (const x of l.grupo.membros) if (!ids.includes(x)) erros.push(`${pre}: incompleto — falta ${x}`);
  const cartoes = new Map(l.cartoes.map(c => [c.id, c]));
  const alternativas = etapa === "b" ? (doc as RespB).leiturasAlternativasPlausiveis : [];
  for (const r of doc.respostas) {
    const c = cartoes.get(r.id), m = u.membros.find(x => x.id === r.id);
    if (!c || !m) continue;
    const ctx = contextoDe(c, cx.itens.get(m.idOriginal)!, l.referencias[c.tela].defeitos.map(x => x.id));
    const e = validarResposta(r, ctx);
    if (e.length) { for (const x of e) erros.push(`${pre}: ${r.id}: ${x}`); continue; }
    if (leitura !== NAO_PERGUNTADO && r.norma !== NAO_PERGUNTADO) {
      if (r.norma.id !== leitura.norma) erros.push(`${pre}: ${r.id}: norma.id ${r.norma.id} ≠ leitura (${leitura.norma})`);
      if (r.norma.forca !== leitura.forca) erros.push(`${pre}: ${r.id}: norma.forca ${r.norma.forca} ≠ leitura (${leitura.forca}): a força é da norma`);
    }
    const d = derivarClasse(r, ctx);
    if (alternativas.length && r.norma !== NAO_PERGUNTADO && !["pendente", "evidencia-indisponivel", "erro-factual"].includes(d.classe))
      erros.push(`${pre}: ${r.id}: há leitura alternativa plausível: o cartão fica incerta/incerto (classe ${d.classe})`);
    derivadas.set(m.idOriginal, { resposta: r, derivado: d });
  }
  if (etapa === "b") for (const ev of (doc as RespB).classificacaoDaDivergencia.evidencias) {
    const [id, item] = ev.split(":");
    const c = cartoes.get(id);
    if (!c) erros.push(`${pre}: classificacaoDaDivergencia.evidencias: cartão fora do grupo ${id}`);
    else if (item && !c.citaveis.includes(item)) erros.push(`${pre}: classificacaoDaDivergencia.evidencias: ${item} não é citável em ${id}`);
  }
  return { erros, doc: erros.length ? null : doc, derivadas };
}

// ───────────────────────────────────────────────────────────────── revelar (etapa B)

/** Monta o lote B de uma unidade a partir do lote A e da resposta A (que fica congelada pelo sha256). */
export function loteB(o: { fila?: string; desempate: string; lote: string; inv?: Inventario }): { erros: string[]; texto: string | null; cegueira: (Cegueira & { falhasExtras: Falha[] }) | null } {
  const fila = o.fila ?? FILA();
  let cx: ContextoD;
  try { cx = contextoD(fila, o.desempate); } catch (e) { return { erros: [(e as Error).message], texto: null, cegueira: null }; }
  const ml = cx.manifesto.lotes.find(x => x.lote === o.lote);
  if (!ml) return { erros: [`lote desconhecido: ${o.lote}`], texto: null, cegueira: null };
  const lTxt = lerTexto(join(o.desempate, `${o.lote}.json`));
  if (sha(lTxt) !== ml.sha256) return { erros: [`${o.lote}.json difere do manifesto`], texto: null, cegueira: null };
  const aAbs = join(o.desempate, "respostas", `${o.lote}-a.json`);
  if (!existsSync(aAbs)) return { erros: [`respostas/${o.lote}-a.json ausente: a etapa A vem antes`], texto: null, cegueira: null };
  const aTxt = lerTexto(aAbs);
  const va = validarEtapa(cx, o.lote, "a", lTxt, aTxt);
  if (va.erros.length) return { erros: va.erros, texto: null, cegueira: null };
  const la = JSON.parse(lTxt) as LoteA & Record<string, unknown>;
  const u = cx.unidades.get(o.lote)!;
  const inv = o.inv ?? inventarioDeAtomos();
  const analise = analisarFila(fila, inv);
  const anteriores = u.membros.map(m => ({ cartao: m.id, respostaAnterior: { ...analise.julgados.get(m.idOriginal)!.resposta, id: m.id } }));
  const texto = jsonTexto({ formato: FORMATO_LOTE_B, lote: `${o.lote}-b`, etapa: "b", politica: POLITICA_PRINCIPAL,
    instrucoes: la.instrucoes, esquema: { arquivo: "esquema-desempate-b.schema.json", sha256: sha(jsonTexto(ESQUEMA_B)) },
    respostaEm: `respostas/${o.lote}-b.json`, etapaA: { lote: { arquivo: `${o.lote}.json`, sha256: ml.sha256 }, respostas: { arquivo: `respostas/${o.lote}-a.json`, sha256: sha(aTxt), congelada: true } },
    n: la.cartoes.length, grupo: la.grupo, referencias: la.referencias, cartoes: la.cartoes,
    respostasAnteriores: anteriores });
  const cartaoNovo = new Map(u.membros.map(m => [m.idOriginal, la.cartoes.find(c => c.id === m.id)!]));
  const cegueira = conferirCegueira({ fila, analise, inv, arquivos: [{ rel: `${o.lote}-b.json`, texto }], cartaoNovo, informado: true });
  const nf = cegueira.falhas.length + cegueira.falhasExtras.length;
  return { erros: nf ? [...cegueira.falhas, ...cegueira.falhasExtras].map(f => `cegueira: ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`) : [], texto: nf ? null : texto, cegueira };
}

// ───────────────────────────────────────────────────────────────── aplicar

export interface Sobrescrita {
  id: string; idAdjudicacao: string; grupo: string; origens: string[]; loteOriginal: string; loteAdjudicacao: string; juiz: string;
  antes: { resposta: Resposta; classe: string; credito: string; fundamentacao: string | null };
  etapaA: { classe: string; credito: string };
  depois: { resposta: Resposta; classe: string; credito: string; fundamentacao: string | null };
  mudouResposta: boolean; mudouClasse: boolean; mudouCredito: boolean; mudouEntreAeB: boolean;
}
export interface Aplicacao { erros: string[]; arquivos: Map<string, string>; sobrescritas: Sobrescrita[]; resumo: Record<string, unknown> | null }

const resumoD = (d: Derivado) => ({ classe: d.classe, credito: creditoDe(d), fundamentacao: d.fundamentacao });

export function aplicarDesempate(o: { fila?: string; desempate: string; inv?: Inventario }): Aplicacao {
  const fila = o.fila ?? FILA(), dd = o.desempate;
  const vazio = (e: string[]): Aplicacao => ({ erros: e, arquivos: new Map(), sobrescritas: [], resumo: null });
  const ing1 = ingerir(fila);
  if (ing1.erros.length || !ing1.texto) return vazio(["a 1ª passada não ingere:", ...ing1.erros]);
  const julg1 = new Map((ing1.julgamentos as { julgamentos: { id: string; resposta: Resposta; derivado: Derivado }[] }).julgamentos.map(j => [j.id, j]));
  let cx: ContextoD;
  try { cx = contextoD(fila, dd); } catch (e) { return vazio([(e as Error).message]); }
  const erros: string[] = [];
  const sobrescritas: Sobrescrita[] = [];
  const unidadesOut: Record<string, unknown>[] = [];
  const novas = new Map<string, Resposta>();
  const inv = o.inv ?? inventarioDeAtomos();
  for (const ml of cx.manifesto.lotes) {
    const lAbs = join(dd, `${ml.lote}.json`);
    if (!existsSync(lAbs)) { erros.push(`${ml.lote}.json ausente`); continue; }
    const lTxt = lerTexto(lAbs);
    if (sha(lTxt) !== ml.sha256) { erros.push(`${ml.lote}.json difere do manifesto (sha256)`); continue; }
    const aAbs = join(dd, "respostas", `${ml.lote}-a.json`), bAbs = join(dd, "respostas", `${ml.lote}-b.json`), lbAbs = join(dd, `${ml.lote}-b.json`);
    if (!existsSync(aAbs)) { erros.push(`respostas/${ml.lote}-a.json ausente (etapa A)`); continue; }
    if (!existsSync(lbAbs)) { erros.push(`${ml.lote}-b.json ausente (rode revelar)`); continue; }
    if (!existsSync(bAbs)) { erros.push(`respostas/${ml.lote}-b.json ausente (etapa B)`); continue; }
    const va = validarEtapa(cx, ml.lote, "a", lTxt, lerTexto(aAbs));
    if (va.erros.length) { erros.push(...va.erros); continue; }
    const rb = loteB({ fila, desempate: dd, lote: ml.lote, inv });
    const lbTxt = lerTexto(lbAbs);
    if (rb.erros.length || rb.texto !== lbTxt) { erros.push(...rb.erros, ...(rb.texto !== null && rb.texto !== lbTxt ? [`${ml.lote}-b.json não confere com a etapa A gravada (A mudou depois de revelada?)`] : [])); continue; }
    const vb = validarEtapa(cx, ml.lote, "b", lbTxt, lerTexto(bAbs));
    if (vb.erros.length) { erros.push(...vb.erros); continue; }
    const docB = vb.doc as RespB;
    const u = cx.unidades.get(ml.lote)!;
    const creditava = u.membros.some(m => julg1.get(m.idOriginal)!.derivado.fundamentacao !== null);
    const materialPendente = u.membros.filter(m => ["pendente", "evidencia-indisponivel"].includes(vb.derivadas.get(m.idOriginal)!.derivado.classe)).map(m => m.idOriginal);
    unidadesOut.push({ grupo: u.id, lote: ml.lote, origens: u.origens.map(x => x.id), juiz: docB.juiz, leituraA: (va.doc as RespA).leituraDaNorma, leituraB: docB.leituraDaNorma,
      leiturasAlternativasPlausiveis: docB.leiturasAlternativasPlausiveis, classificacaoDaDivergencia: docB.classificacaoDaDivergencia,
      segundaLeituraIndicada: creditava && materialPendente.length > 0, membrosPendentesMateriais: creditava ? materialPendente : [] });
    for (const m of u.membros) {
      const a1 = julg1.get(m.idOriginal)!, A = va.derivadas.get(m.idOriginal)!, B = vb.derivadas.get(m.idOriginal)!;
      const depoisR: Resposta = { ...B.resposta, id: m.idOriginal };
      const x = resumoD(a1.derivado), y = resumoD(B.derivado);
      sobrescritas.push({ id: m.idOriginal, idAdjudicacao: m.id, grupo: u.id, origens: u.origens.map(z => z.id), loteOriginal: m.loteOriginal, loteAdjudicacao: ml.lote, juiz: docB.juiz,
        antes: { resposta: a1.resposta, ...x }, etapaA: { classe: A.derivado.classe, credito: creditoDe(A.derivado) }, depois: { resposta: depoisR, ...y },
        mudouResposta: JSON.stringify(a1.resposta) !== JSON.stringify(depoisR), mudouClasse: x.classe !== y.classe,
        mudouCredito: x.credito !== y.credito || x.fundamentacao !== y.fundamentacao, mudouEntreAeB: A.derivado.classe !== B.derivado.classe || creditoDe(A.derivado) !== y.credito });
      novas.set(m.idOriginal, depoisR);
    }
  }
  const preparados = new Set([...cx.unidades.values()].flatMap(u => u.membros.map(m => m.idOriginal)));
  for (const id of novas.keys()) if (!preparados.has(id)) erros.push(`sobrescrita fora das unidades preparadas: ${id}`);
  if (!erros.length) for (const id of preparados) if (!novas.has(id)) erros.push(`membro preparado sem resposta B: ${id}`);
  if (erros.length) return vazio(erros);

  const arquivos = new Map<string, string>();
  for (const f of readdirSync(join(fila, "lotes")).sort()) arquivos.set(`lotes/${f}`, readFileSync(join(fila, "lotes", f), "utf8"));
  arquivos.set("chave/fila-t3-chave.json", readFileSync(join(fila, "chave", "fila-t3-chave.json"), "utf8"));
  const rdir = join(fila, "respostas");
  for (const f of readdirSync(rdir).filter(f => f.endsWith(".json")).sort()) {
    const doc = JSON.parse(lerTexto(join(rdir, f))) as { juiz: string; respostas: Resposta[] } & Record<string, unknown>;
    const k = doc.respostas.filter(r => novas.has(r.id)).length;
    arquivos.set(`respostas/${f}`, k ? jsonTexto({ ...doc, juiz: `${doc.juiz} · adjudicação informada E14 (${k} resposta(s) substituída(s); ver desempate/sobrescritas.json)`,
      respostas: doc.respostas.map(r => novas.get(r.id) ?? r) }) : readFileSync(join(rdir, f), "utf8"));
  }
  arquivos.set("julgamentos-1a-passada.json", ing1.texto);
  arquivos.set("julgamentos-1a-passada.json.sha256", `${sha(ing1.texto)}  julgamentos-1a-passada.json\n`);
  const ord = ordenar(sobrescritas, s => s.id);
  const porCampanhaBraco: Record<string, Record<string, { sobrescritos: number; mudouResposta: number; mudouClasse: number; mudouCredito: number }>> = {};
  for (const s of ord) {
    const it = cx.itens.get(s.id)!;
    const x = ((porCampanhaBraco[it.campanha] ??= {})[it.braco] ??= { sobrescritos: 0, mudouResposta: 0, mudouClasse: 0, mudouCredito: 0 });
    x.sobrescritos++; if (s.mudouResposta) x.mudouResposta++; if (s.mudouClasse) x.mudouClasse++; if (s.mudouCredito) x.mudouCredito++;
  }
  const resumo = { formato: FORMATO_SOBRESCRITAS, versao: E14_VERSAO, rotulo: "adjudicação informada (etapa A individual congelada; etapa B vê as respostas anteriores)",
    regrasSha256: sha(REGRAS), primeiraPassada: { arquivo: "julgamentos-1a-passada.json", sha256: sha(ing1.texto) },
    totais: { unidades: cx.unidades.size, sobrescritos: ord.length, mudouResposta: ord.filter(s => s.mudouResposta).length, mudouClasse: ord.filter(s => s.mudouClasse).length,
      mudouCredito: ord.filter(s => s.mudouCredito).length, mudouEntreAeB: ord.filter(s => s.mudouEntreAeB).length,
      segundaLeituraIndicada: unidadesOut.filter(u => u.segundaLeituraIndicada).length },
    porCampanhaBraco: Object.fromEntries(Object.entries(porCampanhaBraco).sort().map(([c, b]) => [c, Object.fromEntries(Object.entries(b).sort())])),
    unidades: unidadesOut, sobrescritas: ord };
  arquivos.set("desempate/sobrescritas.json", jsonTexto(resumo));
  arquivos.set("desempate/sobrescritas.md", sobrescritasMd(resumo));
  return { erros: [], arquivos, sobrescritas: ord, resumo };
}

export function sobrescritasMd(r: { totais: Record<string, number>; porCampanhaBraco: Record<string, Record<string, Record<string, number>>>; unidades: Record<string, unknown>[]; sobrescritas: Sobrescrita[] }): string {
  const t = r.totais;
  const L = ["# Fila T3 — adjudicação informada aplicada", "", `Membros sobrescritos: ${t.sobrescritos} em ${t.unidades} unidades; resposta mudou em ${t.mudouResposta}, classe em ${t.mudouClasse}, crédito em ${t.mudouCredito}; classe/crédito mudou entre a etapa A e a B em ${t.mudouEntreAeB}; segunda leitura indicada em ${t.segundaLeituraIndicada} unidade(s).`, "",
    "## Por campanha × braço (contagens)", "", "| campanha | braço | sobrescritos | resposta mudou | classe mudou | crédito mudou |", "|---|---|---:|---:|---:|---:|"];
  for (const [c, bs] of Object.entries(r.porCampanhaBraco)) for (const [b, x] of Object.entries(bs)) L.push(`| ${c} | ${b} | ${x.sobrescritos} | ${x.mudouResposta} | ${x.mudouClasse} | ${x.mudouCredito} |`);
  L.push("", "## Unidades", "");
  for (const u of r.unidades) L.push(`- ${u.grupo} (${u.lote}): ${JSON.stringify((u.classificacaoDaDivergencia as { tipos: string[] }).tipos)}; alternativas plausíveis: ${(u.leiturasAlternativasPlausiveis as string[]).length}; segunda leitura indicada: ${u.segundaLeituraIndicada ? "sim" : "não"}`);
  L.push("", "## Sobrescritas que mudaram a classe", "", "| átomo | grupo | antes | etapa A | depois (B) | crédito antes → depois |", "|---|---|---|---|---|---|");
  for (const s of r.sobrescritas.filter(s => s.mudouClasse)) L.push(`| ${s.id} | ${s.grupo} | ${s.antes.classe} | ${s.etapaA.classe} | ${s.depois.classe} | ${s.antes.credito} → ${s.depois.credito} |`);
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── CLI

if (process.argv[1] && /(?:^|[\\/])e14-desempate\.ts$/.test(process.argv[1])) {
  const modo = process.argv[2];
  const fila = argumento("--fila") ?? FILA();
  const saida = argumento("--saida");
  try {
    if (modo === "preparar") {
      if (!saida) throw new Error("uso: e14-desempate preparar --saida PASTA [--fila PASTA_FILA_T3]");
      if (resolve(saida) === resolve(fila)) throw new Error("--saida não pode ser a própria fila");
      const p = prepararDesempate({ fila });
      gravar(saida, "desempate/cegueira.json", p.arquivosInternos.get("cegueira.json")!);
      const nf = p.cegueira.falhas.length + p.cegueira.falhasExtras.length;
      if (nf) {
        console.error(`CEGUEIRA FALHOU (${nf}); nada mais gravado. Ver ${join(saida, "desempate", "cegueira.json")}`);
        for (const f of [...p.cegueira.falhas, ...p.cegueira.falhasExtras].slice(0, 30)) console.error(`  ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`);
        process.exit(3);
      }
      const resp = join(saida, "desempate", "respostas");
      if (existsSync(resp) && readdirSync(resp).some(f => f.endsWith(".json")))
        for (const [rel, t] of p.arquivosDoJuiz) { const abs = join(saida, "desempate", rel); if (existsSync(abs) && readFileSync(abs, "utf8") !== t) {
          console.error(`PARADO: desempate/${rel} mudaria, e já há respostas. Versão nova = pasta nova.`); process.exit(4); } }
      for (const [rel, t] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(saida, `desempate/${rel}`, t);
      gravar(saida, "consistencia/regras.md", REGRAS);
      gravar(saida, "consistencia/regras.md.sha256", `${sha(REGRAS)}  regras.md\n`);
      console.log(`E14 adjudicação preparar ok: ${p.unidades.length} unidades (1 adjudicador cada), ${p.lotes.reduce((s, l) => s + l.ids.length, 0)} cartões-membro`);
      for (const l of p.lotes) console.log(`  ${l.lote}: ${l.grupo}, ${l.ids.length} cartões`);
      console.log(`  cegueira: OK (0 falhas); ${p.cegueira.porCartao.filter(c => c.sinais.length).length}/${p.cegueira.porCartao.length} cartões com sinal residual`);
      console.log(`  dê ao adjudicador só lote-dNN.json + LEIAME-desempate.md + esquema-desempate-a/b.schema.json (chave/ e manifesto.json NÃO)`);
    } else if (modo === "revelar") {
      const dd = argumento("--desempate"), i = process.argv.indexOf("--lote"), lote = i > 0 ? process.argv[i + 1] : null;
      if (!dd || !lote) throw new Error("uso: e14-desempate revelar --desempate PASTA/desempate --lote lote-dNN [--fila …]");
      const r = loteB({ fila, desempate: dd, lote });
      if (r.erros.length || !r.texto) { console.error(`REVELAÇÃO RECUSADA (${r.erros.length}):`); for (const e of r.erros.slice(0, 60)) console.error(`  ${e}`); process.exit(1); }
      const abs = join(dd, `${lote}-b.json`);
      if (existsSync(abs) && readFileSync(abs, "utf8") !== r.texto) { console.error(`PARADO: ${lote}-b.json já existe com outro conteúdo (a etapa A mudou depois de revelada?)`); process.exit(4); }
      gravar(dd, `${lote}-b.json`, r.texto);
      gravar(dd, `cegueira-${lote}-b.json`, jsonTexto({ resultado: "OK", falhas: [], porCartao: r.cegueira!.porCartao }));
      console.log(`E14 revelar ok: ${abs} (etapa A congelada: sha256 no lote B)`);
    } else if (modo === "aplicar") {
      const dd = argumento("--desempate");
      if (!dd || !saida) throw new Error("uso: e14-desempate aplicar --desempate PASTA/desempate --saida SAIDA [--fila PASTA_FILA_T3]");
      if (resolve(saida) === resolve(fila) || resolve(join(saida, "fila-t3")) === resolve(fila)) throw new Error("--saida não pode conter a fila de entrada (a 1ª passada não se reescreve)");
      const r = aplicarDesempate({ fila, desempate: dd });
      if (r.erros.length) { console.error(`ADJUDICAÇÃO RECUSADA (${r.erros.length}); nada gravado.`); for (const e of r.erros.slice(0, 80)) console.error(`  ${e}`); process.exit(1); }
      const destino = join(saida, "fila-t3");
      for (const [rel, t] of r.arquivos) gravar(destino, rel, t);
      const ing = ingerir(destino);
      if (ing.erros.length) { console.error("A ingestão recusou a saída:"); for (const e of ing.erros.slice(0, 40)) console.error(`  ${e}`); process.exit(1); }
      const t = (r.resumo as { totais: Record<string, number> }).totais;
      console.log(`E14 aplicar ok: ${t.sobrescritos} sobrescritos em ${t.unidades} unidades; classe mudou ${t.mudouClasse}, crédito ${t.mudouCredito}; segunda leitura indicada ${t.segundaLeituraIndicada}`);
      console.log(`  próximo: npm run reanalise:nat74:e14-ingerir -- --saida ${saida}`);
    } else throw new Error("uso: e14-desempate preparar|revelar|aplicar …");
  } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
}
