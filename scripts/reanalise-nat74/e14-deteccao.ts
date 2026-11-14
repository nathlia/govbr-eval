/**
 * [D-156] Tabulação da leitura de campanha: specs achadas por braço em DUAS colunas, e cada uma por classe de spec.
 *
 *   npx tsx scripts/reanalise-nat74/e14-deteccao.ts --passada PASTA_DA_PASSADA [--julgamentos ARQ] --saida PASTA
 *       [--analise DIR] [--coluna-principal deteccao|fundamentada] [--sem-expostas] [--sensibilidade-regra ADJ/adjudicacao/sensibilidade-regra.json]
 *     → PASTA/deteccao.json + deteccao.md (recusa se já existirem: versão nova = arquivo novo)
 *
 * - **`--sem-expostas`** (protocolo NAT-78 §5.1, A16; tela D): a contagem fica nas specs não expostas da referência
 *   (`_meta.exposto.specs` saem das duas colunas e das classes; o JSON grava `excluidas`). Sem a opção, todas as specs
 *   (na D, a sensibilidade "com as expostas"), byte a byte como antes. A tela D roda as duas.
 *
 * - **detecção**: o crédito elegível de detecção — `derivado.spec` com `violacao-pagina`/`violacao-origem-indeterminada` e
 *   fundamentação (R7, R15, Q1), a mesma regra do recálculo. Fora: origem DS (`violacao-ds`, P3), pendente, vínculo sem
 *   crédito. Credita o fato observado mesmo sem norma (Q1) ou com norma mais fraca (R15).
 * - **detecção fundamentada**: SUBCONJUNTO da detecção (conferido em `tabular`): do crédito elegível, a norma que deu a
 *   classe — a citada, ou, na política 1.3.0, a referência secundária que deu a classe (`derivado.citacaoPor`) — julgada
 *   `aplica` + `violada: "sim"`, com o vínculo do juiz à mesma spec. Não exige força obrigatória (R15 conta, como a autora
 *   decidiu). O cartão fundamentado por referência é contado e listado à parte (`viaReferencia`).
 * - **classe da spec** (D-156 3.i, fixada pelo vocabulário de `categories` da referência, antes de ver número de braço):
 *   `ds` (específica do DS) quando TODA categoria da spec está em {`token`, `estrutura`}; `geral` (acessibilidade geral)
 *   quando ela tem `acessibilidade`, `navegacao` ou `formulario`. Categoria fora do vocabulário: para.
 * - **braços**: todos os do desenho aparecem, com o estado da coleta (`valida` — zero achados = 0 —, `ausente`,
 *   `incompleta` — sem número, nunca 0), mais os da linha de base presentes no pacote.
 * - **coluna principal**: da configuração (`--coluna-principal`, senão `design.colunaPrincipal` da campanha); sem ela, o
 *   relatório diz que ainda não foi fixada (decisão da autora).
 *
 * - **[D-165] sensibilidade da regra publicada** (só com `--sensibilidade-regra`): a detecção por braço em número, em cada
 *   cenário — 1ª passada (o `julgamentos.json` de `--passada`, quando `--julgamentos` é outro), os julgamentos dados, e cada
 *   leitura da regra (identidade demonstrada × não demonstrada). [Codex d0d554fa, P1] Cada leitura é DERIVADA: a resposta
 *   adotada do cartão (d), com SÓ o vínculo trocado pela spec da leitura, passa pela mesma `derivarClasse` da passada
 *   (contexto do cartão, política do `julgamentos.json`); uma leitura que credita sem que essa derivação credite (fato
 *   falso, estado não alcançado, norma inaplicável ou não violada, origem DS, pendente…) ou que credita spec alheia ao
 *   fato (fora das specs da unidade e das `candidatas` do cartão) para a tabulação. Sem a opção, nada muda (byte a byte).
 *
 * - **[NAT-78 §4.5, D-198] sensibilidade por protocolo** (só com `--por-protocolo`; ANÁLISE DE SENSIBILIDADE, nunca o
 *   primário): a mesma tabulação restrita aos slots cujo estado do oráculo (`run.status.oracleUsage`, lido da
 *   `summary.json` da análise) é o que o braço exige pela definição versionada `DEFINICAO_POR_PROTOCOLO` (`sem` →
 *   `absent-verified`; `ferramentas`/`com` → `used-adherent`). `used-with-errors` fica FORA e é mostrado à parte, com a
 *   contagem; os outros estados ficam fora, listados; a tabela de exclusões por braço sai sempre. Vai numa seção própria
 *   (`sensibilidadePorProtocolo`, `tipo: "sensibilidade"`, rótulo `LEITURA_POR_PROTOCOLO`), nunca em `porBraco`: ao lado
 *   do primário, nunca no lugar dele nem somada a ele. Sem a opção, nada muda (byte a byte; a `summary.json` nem é lida).
 *
 * O braço vem da chave da passada (nunca vai ao juiz). Determinístico, sem rede, sem modelo. Entradas com sha256.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { OracleUsage } from "../../contracts";
import type { SemanticPackage } from "../semantic-flow";
import { gravar, jsonTexto, sha, unicos, versaoDaPolitica } from "./comum";
import { bracoDoRun } from "./e14-campanha";
import { NAO_PERGUNTADO, derivarClasse, type CartaoCego, type ContextoDerivacao, type Derivado, type ItemChave, type Resposta } from "./e14-comum";
import { contextoDe } from "./e14-ingerir";

export const DETECCAO_VERSAO = "nat78-deteccao-1.1.0";
/** Vocabulário de `categories` das referências e a classe de spec de cada categoria (D-156 3.i). */
export const CLASSE_DA_CATEGORIA: Record<string, "ds" | "geral"> = {
  token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral",
  // Vocabulário da referência da A2 (ground-truth-acompanhamento 1.0.0; D-162): tipografia = tokens de tipografia do DS,
  // componente = anatomia do componente do DS, comportamento = comportamento do componente definido pelo DS. Fixado em
  // 04/11/2026 antes de qualquer número por braço da A2 (decisoes-do-assistente). A classe continua "ds" só quando TODA
  // categoria é do DS: acessibilidade/navegacao/formulario puxam para "geral".
  tipografia: "ds", componente: "ds", comportamento: "ds",
};
export type ClasseSpec = "ds" | "geral";
export function classeDaSpec(categorias: string[]): ClasseSpec {
  if (!categorias.length) throw new Error("spec sem categories: classe indecidível");
  for (const c of categorias) if (!(c in CLASSE_DA_CATEGORIA)) throw new Error(`categoria fora do vocabulário: ${c}`);
  return categorias.every(c => CLASSE_DA_CATEGORIA[c] === "ds") ? "ds" : "geral";
}

export interface Julgamento { id: string; chave: string; resposta: Resposta; derivado: Derivado }
const VIOLACOES = new Set(["violacao-pagina", "violacao-origem-indeterminada"]);

/**
 * A spec que a classe derivada credita, ou null: o crédito elegível de detecção, a mesma regra do recálculo
 * (`vereditoNaPolitica`): violação de origem página/indeterminada com spec e fundamentação. Fora: origem DS
 * (`violacao-ds`, P3), pendente, vínculo sem crédito.
 */
export const specDetectada = (d: Derivado): string | null => (d.spec && d.fundamentacao !== null && VIOLACOES.has(d.classe) ? d.spec : null);

/**
 * A spec fundamentada, ou null. Subconjunto da detecção por construção: parte do crédito elegível (`specDetectada`, mesmas
 * exclusões) e exige ainda, da norma que efetivamente deu a classe, `aplicabilidade: "aplica"` e `violada: "sim"`, com o
 * vínculo do juiz à MESMA spec. A norma que deu a classe é a citada, ou — só quando `derivado.citacaoPor` diz que uma
 * referência secundária deu a classe (política 1.3.0) — essa referência. Não exige força obrigatória: norma mais fraca
 * aplicável e violada com vínculo (R15) é fundamentada, como a autora decidiu. Q1 (norma `nenhuma`) não é.
 */
export function specFundamentada(j: Pick<Julgamento, "resposta" | "derivado"> & { id?: string }): { spec: string; via: "primaria" | string } | null {
  const det = specDetectada(j.derivado);
  if (!det) return null;
  const r = j.resposta;
  if (r.verdadeFactual !== "verdadeira" || typeof r.vinculo !== "object" || r.vinculo.spec !== det) return null;
  const cit = j.derivado.citacaoPor;
  const ref = cit && Array.isArray(r.referencias) ? r.referencias.find(x => x.id === cit) : undefined;
  if (cit && !ref) throw new Error(`${j.id ?? "cartão"}: derivado.citacaoPor ${cit} sem o julgamento dessa referência na resposta`);
  const n = ref ?? (r.norma === "nao-perguntado" ? null : r.norma);
  if (!n || n.aplicabilidade !== "aplica" || n.violada !== "sim") return null;
  return { spec: det, via: ref ? ref.id : "primaria" };
}

/** Estado da coleta de um braço: `valida` (execução escolhida e no pacote; sem cartão = 0), `ausente`, `incompleta`. */
export type EstadoBraco = "valida" | "ausente" | "incompleta";
export type Coluna = "deteccao" | "fundamentada";
export const COLUNAS: readonly Coluna[] = ["deteccao", "fundamentada"];
export function colunaDe(x: unknown): Coluna | null {
  if (x === undefined || x === null) return null;
  if (!COLUNAS.includes(x as Coluna)) throw new Error(`coluna principal desconhecida: ${JSON.stringify(x)} (deteccao ou fundamentada)`);
  return x as Coluna;
}

export interface ContagemBraco {
  cartoes: number; deteccao: string[]; fundamentada: string[]; viaReferencia: { spec: string; cartao: string; referencia: string }[];
  porClasse: Record<ClasseSpec, { deteccao: number; fundamentada: number }>;
}
export interface Tabela {
  formato: string; politica: string; specs: { id: string; classe: ClasseSpec; categorias: string[] }[];
  /** Todos os braços do desenho (na ordem dele), depois os demais (linha de base), em ordem. Nenhum braço some. */
  bracos: string[];
  /** Estado da coleta por braço; só `valida` tem contagem (zero achados = 0). */
  estado: Record<string, EstadoBraco>;
  /** Contagem por braço; `null` quando a coleta do braço não é válida (nunca 0 no lugar de ausente/incompleta). */
  porBraco: Record<string, ContagemBraco | null>;
  nenhumBraco: string[];
  /** Coluna principal da tese, da configuração; `null` = ainda não fixada pela autora. */
  colunaPrincipal: Coluna | null;
  /** Só com `excluir` (protocolo NAT-78 §5.1, A16: primário sem as specs expostas): as specs tiradas da contagem. */
  excluidas?: string[];
}

export function tabular(julgs: Julgamento[], bracoDe: (chave: string) => string, specs0: { id: string; categories: string[] }[], politica: string,
  bracosDoDesenho: string[], o: { estado?: Record<string, EstadoBraco>; colunaPrincipal?: Coluna | null; excluir?: string[] } = {}): Tabela {
  const cls = new Map(specs0.map(s => [s.id, classeDaSpec(s.categories)]));
  const fora = new Set(o.excluir ?? []);
  for (const s of fora) if (!cls.has(s)) throw new Error(`excluir: spec ${s} fora da referência`);
  const specs = specs0.filter(s => !fora.has(s.id));
  const comCitacao = julgs.find(j => j.derivado.citacaoPor);
  if (comCitacao && !/1\.3\.0$/.test(politica)) throw new Error(`política ${politica} com citacaoPor (${comCitacao.id}): só a 1.3.0 resgata pela referência`);
  const colunaPrincipal = colunaDe(o.colunaPrincipal);
  const presentes = [...new Set(julgs.map(j => bracoDe(j.chave)))];
  const extras = [...new Set([...presentes, ...Object.keys(o.estado ?? {})].filter(b => !bracosDoDesenho.includes(b)))].sort();
  const bracos = [...bracosDoDesenho, ...extras];
  const estado: Record<string, EstadoBraco> = {};
  for (const b of bracos) {
    const e = o.estado?.[b] ?? (presentes.includes(b) ? "valida" : undefined);
    if (!e) throw new Error(`braço ${b} sem cartão e sem estado da coleta: diga se a coleta é válida (0), ausente ou incompleta`);
    if (e !== "valida" && presentes.includes(b)) throw new Error(`braço ${b} com cartões mas coleta ${e}`);
    estado[b] = e;
  }
  const porBraco: Tabela["porBraco"] = {};
  for (const b of bracos) {
    if (estado[b] !== "valida") { porBraco[b] = null; continue; }
    const js = julgs.filter(j => bracoDe(j.chave) === b);
    const det = new Set<string>(), fun = new Set<string>(), via: ContagemBraco["viaReferencia"] = [];
    for (const j of js) {
      const s = specDetectada(j.derivado); if (s) det.add(s);
      const f = specFundamentada(j);
      if (f) { fun.add(f.spec); if (f.via !== "primaria") via.push({ spec: f.spec, cartao: j.id, referencia: f.via }); }
    }
    for (const s of [...det, ...fun]) if (!cls.has(s)) throw new Error(`spec ${s} fora da referência`);
    for (const s of fun) if (!det.has(s)) throw new Error(`braço ${b}: ${s} fundamentada sem detecção (fundamentada ⊆ detecção violada)`);
    for (const s of fora) { det.delete(s); fun.delete(s); }
    for (let i = via.length - 1; i >= 0; i--) if (fora.has(via[i].spec)) via.splice(i, 1);
    const conta = (xs: Set<string>, c: ClasseSpec) => [...xs].filter(s => cls.get(s) === c).length;
    porBraco[b] = { cartoes: js.length, deteccao: [...det].sort(), fundamentada: [...fun].sort(), viaReferencia: via.sort((x, y) => x.spec.localeCompare(y.spec) || x.cartao.localeCompare(y.cartao)),
      porClasse: { ds: { deteccao: conta(det, "ds"), fundamentada: conta(fun, "ds") }, geral: { deteccao: conta(det, "geral"), fundamentada: conta(fun, "geral") } } };
  }
  const alguma = new Set(Object.values(porBraco).flatMap(x => x?.deteccao ?? []));
  return { formato: DETECCAO_VERSAO, politica, specs: specs.map(s => ({ id: s.id, classe: cls.get(s.id)!, categorias: s.categories })), bracos, estado, porBraco,
    nenhumBraco: specs.map(s => s.id).filter(s => !alguma.has(s)), colunaPrincipal, ...(fora.size ? { excluidas: [...fora].sort() } : {}) };
}

// ───────────────────────────────────────────── [D-165] sensibilidade do gatilho (d): contagem por leitura da regra

/**
 * [D-165, Codex d0d554fa P1] A resposta numa leitura da regra: a MESMA resposta, com só o vínculo trocado pela spec que a
 * leitura credita (`null` → `"nenhum"`). Fato, estado alcançado, norma, sugestão e referências ficam como estão; a relação
 * do vínculo é a da resposta (`direta` quando ela não tinha vínculo: a relação não entra na derivação). Vínculo não
 * perguntado fica como está — nenhuma leitura cria a pergunta, logo não credita.
 */
export function respostaNaLeitura(r: Resposta, spec: string | null): Resposta {
  if (r.vinculo === NAO_PERGUNTADO) return r;
  return { ...r, vinculo: spec === null ? "nenhum" : { spec, relacao: typeof r.vinculo === "object" ? r.vinculo.relacao : "direta" } };
}

/** A classe da resposta numa leitura, pela MESMA derivação da passada (`derivarClasse`, contexto e política do cartão). */
export const derivarNaLeitura = (r: Resposta, ctx: ContextoDerivacao, spec: string | null): Derivado => derivarClasse(respostaNaLeitura(r, spec), ctx);

/**
 * Confere o crédito que uma leitura atribui a um cartão: a spec tem de ser do fato do cartão (`specsDoFato` = specs da
 * unidade (d) ∪ `candidatas` do cartão) e tem de ser exatamente o que a derivação dá à resposta com só o vínculo trocado.
 * Uma leitura nunca resgata fato falso, estado não alcançado, norma inaplicável ou não violada, origem DS, pendência nem
 * outra exclusão de crédito. Devolve os erros (vazio = compatível) e a classe derivada.
 */
export function conferirLeitura(r: Resposta, ctx: ContextoDerivacao, spec: string | null, specsDoFato: string[]): { erros: string[]; derivado: Derivado } {
  const erros: string[] = [];
  if (spec !== null && !specsDoFato.includes(spec))
    erros.push(`spec ${spec} alheia ao fato do cartão (só uma spec da unidade ou das candidatas do cartão: ${specsDoFato.join(", ") || "nenhuma"})`);
  const derivado = derivarNaLeitura(r, ctx, spec);
  const det = specDetectada(derivado);
  if (det !== spec) erros.push(`credita ${spec ?? "null"}, mas a mesma resposta com só o vínculo trocado deriva ${derivado.classe} (${derivado.regraDaPolitica})${det ? `, creditando ${det}` : ", sem crédito"}`);
  return { erros, derivado };
}

/** Comparação de respostas independente da ordem das chaves. */
const canonica = (x: unknown): string => JSON.stringify(x, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));
export const mesmaResposta = (a: Resposta, b: Resposta): boolean => canonica(a) === canonica(b);

export const FORMATO_SENSIBILIDADE_REGRA = "nat78-sensibilidade-regra-1.1.0";
/**
 * Uma linha de `adjudicacao/sensibilidade-regra.json` (revisao-campanha aplicar): a resposta adotada (B, id original), as
 * specs da unidade (d) e a spec que cada leitura atribui. Insumo, nunca contagem: a tabulação re-deriva cada leitura.
 */
export interface CartaoDaRegra { id: string; chave: string; unidade: string; leituraAdotada: string; credita: Record<string, string | null>;
  specsDaRegra: string[]; respostaAdotada: Resposta }
export interface SensibilidadeRegra { formato: string; regra: { arquivo: string; sha256: string } | null; leituras: string[]; cartoes: CartaoDaRegra[] }
/** O que a re-derivação precisa de um cartão, pela chave: contexto de derivação da passada e as `candidatas` do cartão. */
export type FatoDoCartao = (chave: string) => { contexto: ContextoDerivacao; candidatas: string[] };
export interface Cenarios {
  formato: string; regra: SensibilidadeRegra["regra"]; leituras: string[];
  /** Por cenário (`1a-passada` quando dado, `julgamentos` = a entrada, e cada leitura da regra), detecção por braço; null = coleta não válida. */
  porCenario: Record<string, Record<string, { deteccao: number; specs: string[] } | null>>;
  /** Cartões das unidades (d) desta tabela, com a spec que cada cenário lhes atribui. */
  cartoes: { id: string; braco: string; unidade: string; leituraAdotada: string; porCenario: Record<string, string | null> }[];
  regraDaContagem: string;
}
export const FORMATO_CENARIOS = "nat78-deteccao-cenarios-regra-1.0.0";

/**
 * Detecção por braço em cada cenário: a dos julgamentos dados; a da 1ª passada (se dada); e, para cada leitura da regra, a
 * dos julgamentos dados com os cartões das unidades (d) RE-DERIVADOS: a resposta do julgamento, com só o vínculo trocado
 * pela spec da leitura, pela mesma `derivarClasse` (contexto do cartão e política da passada, `fato`). A spec da leitura
 * nunca é contada direto: ela só entra como vínculo, e a contagem é a da classe derivada. Para (nada sai) se a leitura
 * credita o que a derivação não credita, se credita spec alheia ao fato, se a resposta do julgamento não é a adotada na
 * adjudicação, ou se a leitura adotada não reproduz o julgamento. Os demais cartões contam como nos julgamentos. Só
 * detecção (a coluna fundamentada de uma leitura não adotada não existe).
 */
export function cenariosDaRegra(julgs: Julgamento[], bracoDe: (chave: string) => string, t: Tabela, sens: SensibilidadeRegra,
  o: { primeira?: Julgamento[] | null; fato: FatoDoCartao }): Cenarios {
  const primeira = o.primeira ?? null;
  const porChave = new Map(sens.cartoes.map(c => [c.chave, c]));
  const nossos = julgs.filter(j => porChave.has(j.chave));
  for (const c of sens.cartoes) for (const l of sens.leituras) if (!(l in c.credita)) throw new Error(`sensibilidade: ${c.id} sem a leitura ${l}`);
  // Cada cartão (d), em cada leitura: a classe derivada com só o vínculo trocado (conferida contra a leitura).
  const naLeitura = new Map<string, Record<string, string | null>>();
  for (const j of nossos) {
    const c = porChave.get(j.chave)!;
    if (!c.respostaAdotada || !Array.isArray(c.specsDaRegra)) throw new Error(`sensibilidade: ${c.id} sem respostaAdotada/specsDaRegra (formato ${sens.formato}; a tabulação re-deriva cada leitura)`);
    if (!mesmaResposta(j.resposta, c.respostaAdotada)) throw new Error(`sensibilidade: ${j.id}: a resposta dos julgamentos dados não é a adotada na adjudicação (dê os julgamentos da passada adjudicada)`);
    const f = o.fato(j.chave), specsDoFato = unicos([...c.specsDaRegra, ...f.candidatas]);
    const porL: Record<string, string | null> = {};
    for (const l of sens.leituras) {
      const x = conferirLeitura(j.resposta, f.contexto, c.credita[l], specsDoFato);
      if (x.erros.length) throw new Error(`sensibilidade: ${j.id}: leitura ${l}: ${x.erros.join("; ")}`);
      porL[l] = specDetectada(x.derivado);
    }
    if (porL[c.leituraAdotada] !== specDetectada(j.derivado)) throw new Error(`sensibilidade: ${j.id}: a leitura adotada (${c.leituraAdotada}) re-derivada credita ${porL[c.leituraAdotada] ?? "nada"}, o julgamento ${specDetectada(j.derivado) ?? "nada"}`);
    naLeitura.set(j.chave, porL);
  }
  const conta = (f: (j: Julgamento) => string | null, js: Julgamento[]) => Object.fromEntries(t.bracos.map(b => {
    if (t.estado[b] !== "valida") return [b, null];
    const specs = [...new Set(js.filter(j => bracoDe(j.chave) === b).map(f).filter((x): x is string => !!x))].sort();
    return [b, { deteccao: specs.length, specs }];
  }));
  const porCenario: Cenarios["porCenario"] = {};
  if (primeira) porCenario["1a-passada"] = conta(j => specDetectada(j.derivado), primeira);
  porCenario.julgamentos = conta(j => specDetectada(j.derivado), julgs);
  for (const l of sens.leituras) porCenario[l] = conta(j => { const x = naLeitura.get(j.chave); return x ? x[l] : specDetectada(j.derivado); }, julgs);
  const p1 = primeira ? new Map(primeira.map(j => [j.chave, j])) : null;
  const cartoes = nossos.map(j => { const c = porChave.get(j.chave)!, x = naLeitura.get(j.chave)!;
    return { id: j.id, braco: bracoDe(j.chave), unidade: c.unidade, leituraAdotada: c.leituraAdotada,
      porCenario: { ...(p1 ? { "1a-passada": p1.get(j.chave) ? specDetectada(p1.get(j.chave)!.derivado) : null } : {}), julgamentos: specDetectada(j.derivado),
        ...Object.fromEntries(sens.leituras.map(l => [l, x[l]])) } }; }).sort((x, y) => x.id.localeCompare(y.id));
  return { formato: FORMATO_CENARIOS, regra: sens.regra, leituras: sens.leituras, porCenario, cartoes,
    regraDaContagem: "detecção (specDetectada) por braço; em cada leitura da regra, cada cartão das unidades (d) é re-derivado pela mesma política (a resposta adotada com só o vínculo trocado pela spec da leitura); os demais contam como nos julgamentos" };
}

/**
 * O fato de cada cartão da passada, pela chave, para a re-derivação: o cartão cego e a referência da tela (lotes conferidos
 * pelo sha256 do manifesto), o item da chave e a política dos julgamentos — o mesmo `contextoDe` da ingestão e da revisão.
 */
export function fatoDaPassada(passada: string, politica: string): FatoDoCartao {
  const ler = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;
  const man = ler<{ lotes: { lote: string; sha256: string }[] }>(join(passada, "lotes", "manifesto.json"));
  const itens = new Map(ler<{ itens: ItemChave[] }>(join(passada, "chave", "fila-t3-chave.json")).itens.map(i => [i.chave, i]));
  const cartoes = new Map<string, { c: CartaoCego; specs: string[] }>();
  for (const ml of man.lotes) {
    const txt = readFileSync(join(passada, "lotes", `${ml.lote}.json`), "utf8").replace(/^﻿/, "");
    if (sha(txt) !== ml.sha256) throw new Error(`${passada}: lotes/${ml.lote}.json difere do manifesto (sha256)`);
    const l = JSON.parse(txt) as { referencias: Record<string, { defeitos: { id: string }[] }>; cartoes: CartaoCego[] };
    for (const c of l.cartoes) cartoes.set(c.id, { c, specs: l.referencias[c.tela].defeitos.map(d => d.id) });
  }
  const v = versaoDaPolitica(politica);
  return (chave: string) => {
    const it = itens.get(chave), x = it ? cartoes.get(it.id) : undefined;
    if (!it || !x) throw new Error(`sensibilidade: cartão ${chave} fora da passada ${passada}`);
    return { contexto: contextoDe(x.c, it, x.specs, v), candidatas: x.c.candidatas ?? [] };
  };
}

export function cenariosMd(c: Cenarios, bracos: string[]): string {
  const nomes = Object.keys(c.porCenario);
  return ["", "## Sensibilidade da regra publicada (gatilho d)", "",
    `Regra \`${c.regra?.arquivo ?? "?"}\` (sha256 \`${c.regra?.sha256 ?? "?"}\`). ${c.regraDaContagem}.`, "",
    `| cenário | ${bracos.join(" | ")} |`, `|---|${bracos.map(() => "---").join("|")}|`,
    ...nomes.map(n => `| ${n} | ${bracos.map(b => { const x = c.porCenario[n][b]; return x ? String(x.deteccao) : "—"; }).join(" | ")} |`), "",
    "| cartão | braço | unidade | leitura adotada | " + nomes.join(" | ") + " |", `|---|---|---|---|${nomes.map(() => "---").join("|")}|`,
    ...c.cartoes.map(x => `| ${x.id} | ${x.braco} | ${x.unidade} | ${x.leituraAdotada} | ${nomes.map(n => x.porCenario[n] ?? "—").join(" | ")} |`), ""].join("\n");
}

const ROTULO_ESTADO: Record<EstadoBraco, string> = { valida: "válida", ausente: "**ausente**", incompleta: "**incompleta**" };

export function tabelaMd(t: Tabela, titulo: string): string {
  const n = { ds: t.specs.filter(s => s.classe === "ds").length, geral: t.specs.filter(s => s.classe === "geral").length };
  const pb = t.porBraco;
  const linha = (rot: string, f: (c: ContagemBraco) => string) =>
    `| ${rot} | ${t.bracos.map(b => { const c = pb[b]; return c ? f(c) : `coleta ${t.estado[b]}`; }).join(" | ")} |`;
  const pri = (c: Coluna) => (t.colunaPrincipal === c ? " (principal)" : "");
  return [
    `# ${titulo}`, "",
    `Política do juiz: \`${t.politica}\`. Specs da referência: ${t.specs.length} (específicas do DS ${n.ds} · acessibilidade geral ${n.geral}).`,
    ...(t.excluidas ? [`Conjunto: sem as specs expostas (\`_meta.exposto\`; fora da contagem: ${t.excluidas.join(", ")}).`] : []),
    `Coluna principal: ${t.colunaPrincipal === null ? "**ainda não fixada** (decisão da autora: `--coluna-principal` ou `design.colunaPrincipal` na campanha)" : `**${t.colunaPrincipal === "deteccao" ? "detecção" : "detecção fundamentada"}**`}.`, "",
    "**Detecção** = a classe derivada credita a spec (crédito elegível: violação de origem página ou indeterminada, com vínculo e fundamentação; R7, R15, Q1). Origem DS (P3), pendente e vínculo sem crédito ficam fora.",
    "**Fundamentada** = subconjunto da detecção: do crédito elegível, só o cartão em que a norma que deu a classe (a citada, ou, na 1.3.0, a referência secundária que deu a classe) foi julgada aplicável (`aplica`) e violada (`sim`), com o vínculo à mesma spec. Não exige força obrigatória: norma mais fraca aplicável e violada com vínculo (R15) conta como fundamentada, como a autora decidiu; Q1 (sem norma aplicada) não conta.",
    "Braço com coleta válida e nenhum achado mostra 0; coleta ausente ou incompleta aparece como tal, sem número.", "",
    `| | ${t.bracos.join(" | ")} |`, `|---|${t.bracos.map(() => "---").join("|")}|`,
    `| coleta | ${t.bracos.map(b => ROTULO_ESTADO[t.estado[b]]).join(" | ")} |`,
    linha("cartões", c => String(c.cartoes)),
    linha(`**detecção**${pri("deteccao")}`, c => `**${c.deteccao.length}**`),
    linha(`detecção · específica do DS (de ${n.ds})`, c => String(c.porClasse.ds.deteccao)),
    linha(`detecção · acessibilidade geral (de ${n.geral})`, c => String(c.porClasse.geral.deteccao)),
    linha(`**detecção fundamentada**${pri("fundamentada")}`, c => `**${c.fundamentada.length}**`),
    linha(`fundamentada · específica do DS (de ${n.ds})`, c => String(c.porClasse.ds.fundamentada)),
    linha(`fundamentada · acessibilidade geral (de ${n.geral})`, c => String(c.porClasse.geral.fundamentada)),
    linha("fundamentada pela referência secundária", c => String(c.viaReferencia.length)), "",
    "## Specs por braço", "",
    ...t.bracos.map(b => {
      const c = pb[b];
      if (!c) return `- **${b}** — coleta ${t.estado[b]}: sem contagem (não é zero)`;
      return `- **${b}** — detecção: ${c.deteccao.join(", ") || "—"}; fundamentada: ${c.fundamentada.join(", ") || "—"}` +
        (c.viaReferencia.length ? `; pela referência: ${c.viaReferencia.map(v => `${v.spec} (${v.referencia})`).join(", ")}` : "");
    }),
    `- nenhum braço detectou: ${t.nenhumBraco.join(", ") || "—"}`, "",
    "## Classe de cada spec (pela `categories` da referência)", "",
    "| categorias | classe |", "|---|---|",
    "| todas em {`token`, `estrutura`} | específica do DS |", "| alguma de {`acessibilidade`, `navegacao`, `formulario`} | acessibilidade geral |", "",
    t.specs.map(s => `${s.id} ${s.classe === "ds" ? "DS" : "geral"}`).join(" · "), "",
  ].join("\n");
}

/**
 * Estado da coleta de cada braço: execução no pacote (e, havendo coleta-trio, a escolhida do slot) → `valida`, com ou sem
 * cartão; slot sem execução escolhida, ou execução que não é a escolhida → `incompleta`; braço do desenho sem slot nem
 * execução → `ausente`. Linha de base: `valida` quando o run está no pacote.
 */
export function estadoDosBracos(runs: { id: string; braco: string }[], slots: { braco: string; escolhida: string | null }[] | null, bracosDoDesenho: string[]): Record<string, EstadoBraco> {
  const e: Record<string, EstadoBraco> = {};
  for (const b of bracosDoDesenho) {
    const slot = slots?.find(s => s.braco === b), run = runs.find(r => r.braco === b);
    e[b] = run && (!slot || slot.escolhida === run.id) ? "valida" : slot || run ? "incompleta" : "ausente";
  }
  for (const r of runs) if (!bracosDoDesenho.includes(r.braco)) e[r.braco] = "valida";
  return e;
}

// ───────────────────────────────────────────── [NAT-78 §4.5] sensibilidade por protocolo (aderência ao oráculo por slot)

/** Os estados de uso do oráculo do contrato (`OracleUsage`, contracts/index.ts; `run.status.oracleUsage`), nenhum inventado. */
export const ESTADOS_DO_ORACULO = ["absent-verified", "used-adherent", "available-unused", "used-with-errors", "unverified", "not-applicable"] as const satisfies readonly OracleUsage[];
// Se o contrato ganhar um estado, isto deixa de compilar: a leitura por protocolo tem de decidir onde ele fica.
const _todosOsEstados: [Exclude<OracleUsage, (typeof ESTADOS_DO_ORACULO)[number]>] extends [never] ? true : never = true;
void _todosOsEstados;

/**
 * Padrão adotado (decisoes-do-assistente, 13/11/2026, preparo da campanha D item 5; protocolo NAT-78 §4.5): o slot conta
 * no conjunto por protocolo quando o estado do oráculo é o que o braço exige. `sem` → `absent-verified` (ausência
 * comprovada); `ferramentas` e `com` → `used-adherent` (usado conforme o protocolo). Qualquer outro estado fica fora.
 * `used-with-errors` não é perda de slot (§4.5: a execução fica no primário), mas fica fora DESTA leitura e é mostrado à
 * parte, com a contagem, nunca descartado em silêncio. Braço do desenho fora deste mapa: a leitura para.
 */
export const DEFINICAO_POR_PROTOCOLO = Object.freeze({
  /** Versão da definição de aderência (D-198: fixada antes da coleta; mudar qualquer campo = versão nova). Vai em toda saída. */
  versao: "nat78-aderencia-por-protocolo-1.0.0",
  estadoExigido: Object.freeze({ sem: "absent-verified", ferramentas: "used-adherent", com: "used-adherent" }) as Readonly<Record<string, OracleUsage>>,
  /** `used-with-errors`: fora do conjunto, mostrado à parte com a contagem; qualquer outro estado não exigido: fora, listado. */
  comErros: "fora-a-parte-com-contagem" as const,
});
/** O estado exigido por braço, da definição versionada acima (única fonte; nunca redefinido em outro lugar). */
export const ESTADO_POR_PROTOCOLO: Readonly<Record<string, OracleUsage>> = DEFINICAO_POR_PROTOCOLO.estadoExigido;
/** Rótulo da dimensão de análise: toda saída desta leitura o carrega, para nunca ser somada nem confundida com o primário. */
export const LEITURA_POR_PROTOCOLO = "sensibilidade-por-protocolo";
/** O papel desta leitura, no vocabulário dos conjuntos do recálculo (`Conjunto.tipo`): sensibilidade, nunca `primario`. */
export const TIPO_POR_PROTOCOLO = "sensibilidade" as const;
export const FORMATO_POR_PROTOCOLO = "nat78-deteccao-por-protocolo-1.0.0";
export const AVISO_POR_PROTOCOLO = "ANÁLISE DE SENSIBILIDADE (por protocolo, NAT-78 §4.5), não o primário: ao lado do primário (intenção de tratar), nunca no lugar dele nem somada a ele";

/**
 * [D-198] Exclusões POR BRAÇO: para cada braço, slots com estado do oráculo, quantos ficam no conjunto por protocolo e
 * quantos saem, por estado que os tirou. Publicada sempre, para que a leitura não selecione em silêncio as execuções mais
 * bem-comportadas de um braço. Slot sem coleta válida (ou perdido) não entra aqui: não tem estado do oráculo.
 */
export interface ExclusaoDoBraco { slots: number; noConjunto: number; excluidos: number; porEstado: Record<string, number> }
export function exclusoesPorBraco(slots: { braco: string; estado: OracleUsage; situacao: SituacaoProtocolo }[], bracos: string[]): Record<string, ExclusaoDoBraco> {
  const out: Record<string, ExclusaoDoBraco> = Object.fromEntries(bracos.map(b => [b, { slots: 0, noConjunto: 0, excluidos: 0, porEstado: {} }]));
  for (const s of slots) {
    const x = out[s.braco];
    if (!x) throw new Error(`por protocolo: slot do braço ${s.braco} fora dos braços do desenho (${bracos.join(", ")})`);
    x.slots++;
    if (s.situacao === "no-conjunto") { x.noConjunto++; continue; }
    x.excluidos++; x.porEstado[s.estado] = (x.porEstado[s.estado] ?? 0) + 1;
  }
  for (const x of Object.values(out)) x.porEstado = Object.fromEntries(Object.entries(x.porEstado).sort(([a], [b]) => (a < b ? -1 : 1)));
  return out;
}

/** A tabela de exclusões por braço em markdown (mesma forma nas duas saídas). */
export function exclusoesMd(ex: Record<string, ExclusaoDoBraco>): string[] {
  return ["| braço | slots com estado do oráculo | no conjunto por protocolo | excluídos | estado que excluiu |", "|---|---|---|---|---|",
    ...Object.entries(ex).map(([b, x]) => `| ${b} | ${x.slots} | ${x.noConjunto} | ${x.excluidos} | ${Object.entries(x.porEstado).map(([e, n]) => `\`${e}\` ${n}`).join(", ") || "—"} |`)];
}
/** `no-conjunto`: estado exigido; `fora-com-erros`: `used-with-errors` (à parte, com contagem); `fora`: qualquer outro estado. */
export type SituacaoProtocolo = "no-conjunto" | "fora-com-erros" | "fora";

export function situacaoPorProtocolo(braco: string, estado: string): SituacaoProtocolo {
  const exigido = ESTADO_POR_PROTOCOLO[braco];
  if (!exigido) throw new Error(`por protocolo: braço ${braco} sem estado exigido (só ${Object.keys(ESTADO_POR_PROTOCOLO).join(", ")})`);
  if (!(ESTADOS_DO_ORACULO as readonly string[]).includes(estado)) throw new Error(`por protocolo: estado do oráculo fora do contrato: ${JSON.stringify(estado)}`);
  return estado === exigido ? "no-conjunto" : estado === "used-with-errors" ? "fora-com-erros" : "fora";
}

/** Uma execução da `summary.json` da análise (`analisar-execucao.ts`): `mcpIsolamento.usoOraculo` = `run.status.oracleUsage`. */
export interface ExecucaoDoResumo { runId: string; braco: string; mcpIsolamento?: { usoOraculo?: string } | null }

/**
 * O estado do oráculo de cada execução do desenho, pela `summary.json` da análise, casado pelo runId. O braço do resumo
 * (`run.arm`) tem de ser o do run (perfil do oráculo); execução ausente do resumo, sem estado, com estado fora do contrato
 * ou braço repetido: para.
 */
export function estadosDoOraculo(execucoes: ExecucaoDoResumo[], runs: { id: string; braco: string }[]): Record<string, OracleUsage> {
  const out: Record<string, OracleUsage> = {};
  for (const r of runs) {
    const e = execucoes.find(x => x.runId === r.id);
    if (!e) throw new Error(`por protocolo: run ${r.id} (${r.braco}) fora da summary.json da análise: sem o estado do oráculo`);
    if (e.braco !== r.braco) throw new Error(`por protocolo: run ${r.id}: braço ${e.braco} na summary.json, ${r.braco} pelo perfil do oráculo`);
    const u = e.mcpIsolamento?.usoOraculo;
    if (u === undefined || u === null) throw new Error(`por protocolo: run ${r.id} sem mcpIsolamento.usoOraculo na summary.json`);
    if (!(ESTADOS_DO_ORACULO as readonly string[]).includes(u)) throw new Error(`por protocolo: run ${r.id}: estado do oráculo fora do contrato: ${JSON.stringify(u)}`);
    if (out[r.braco]) throw new Error(`por protocolo: dois runs do braço ${r.braco}`);
    out[r.braco] = u as OracleUsage;
  }
  return out;
}

export interface LinhaProtocolo { braco: string; coleta: EstadoBraco; estadoDoOraculo: OracleUsage | null; exigido: OracleUsage; situacao: SituacaoProtocolo | "sem-coleta" }
export interface PorProtocolo {
  formato: typeof FORMATO_POR_PROTOCOLO; leitura: typeof LEITURA_POR_PROTOCOLO; tipo: typeof TIPO_POR_PROTOCOLO; aviso: string;
  /** A definição de aderência aplicada (versão + estado exigido por braço), copiada de `DEFINICAO_POR_PROTOCOLO`. */
  definicao: { versao: string; estadoExigido: Record<string, OracleUsage>; comErros: string };
  /** [D-198] Slots, no conjunto e excluídos (por estado), por braço do desenho. */
  exclusoesPorBraco: Record<string, ExclusaoDoBraco>;
  /** Um por braço do desenho (linha de base não tem oráculo e fica fora desta leitura). */
  bracos: LinhaProtocolo[];
  /** Contagem dos braços NO conjunto por protocolo (a mesma do primário); `null` = fora dele ou sem coleta válida. */
  porBraco: Record<string, ContagemBraco | null>;
  /** Braços `used-with-errors`: fora do conjunto, com a contagem à parte (nunca somada ao conjunto). */
  comErros: Record<string, ContagemBraco>;
  /** Specs que nenhum braço do conjunto por protocolo detectou. */
  nenhumBraco: string[];
}

/**
 * A tabulação na leitura por protocolo: a contagem de cada braço é a do primário (`t.porBraco`, a mesma tabela, as mesmas
 * exclusões de spec); muda só QUEM entra. Braço de coleta válida sem estado do oráculo: para (o estado é medido por
 * execução, nunca suposto). Todos aderentes → `porBraco` igual ao do primário nos braços do desenho.
 */
export function porProtocolo(t: Tabela, bracosDoDesenho: string[], estados: Record<string, OracleUsage>): PorProtocolo {
  const bracos: LinhaProtocolo[] = [], porBraco: PorProtocolo["porBraco"] = {}, comErros: PorProtocolo["comErros"] = {};
  for (const b of bracosDoDesenho) {
    const exigido = ESTADO_POR_PROTOCOLO[b];
    if (!exigido) throw new Error(`por protocolo: braço ${b} sem estado exigido (só ${Object.keys(ESTADO_POR_PROTOCOLO).join(", ")})`);
    const coleta = t.estado[b], c = t.porBraco[b] ?? null, e = estados[b] ?? null;
    if (c && e === null) throw new Error(`por protocolo: braço ${b} com coleta válida e sem estado do oráculo`);
    const situacao = !c ? "sem-coleta" : situacaoPorProtocolo(b, e!);
    bracos.push({ braco: b, coleta, estadoDoOraculo: e, exigido, situacao });
    porBraco[b] = situacao === "no-conjunto" ? c : null;
    if (situacao === "fora-com-erros") comErros[b] = c!;
  }
  const alguma = new Set(Object.values(porBraco).flatMap(x => x?.deteccao ?? []));
  const comEstado = bracos.filter(x => x.situacao !== "sem-coleta").map(x => ({ braco: x.braco, estado: x.estadoDoOraculo!, situacao: x.situacao as SituacaoProtocolo }));
  return { formato: FORMATO_POR_PROTOCOLO, leitura: LEITURA_POR_PROTOCOLO, tipo: TIPO_POR_PROTOCOLO, aviso: AVISO_POR_PROTOCOLO, definicao: definicaoPorProtocolo(),
    exclusoesPorBraco: exclusoesPorBraco(comEstado, bracosDoDesenho), bracos, porBraco, comErros, nenhumBraco: t.specs.map(s => s.id).filter(s => !alguma.has(s)) };
}

/** Cópia simples (JSON) da definição versionada, para gravar em cada saída. */
export function definicaoPorProtocolo(): PorProtocolo["definicao"] {
  return { versao: DEFINICAO_POR_PROTOCOLO.versao, estadoExigido: { ...DEFINICAO_POR_PROTOCOLO.estadoExigido }, comErros: DEFINICAO_POR_PROTOCOLO.comErros };
}

const ROTULO_SITUACAO: Record<LinhaProtocolo["situacao"], string> = { "no-conjunto": "no conjunto", "fora-com-erros": "**fora — usado com erros** (à parte)", fora: "**fora**", "sem-coleta": "sem coleta válida" };

export function porProtocoloMd(p: PorProtocolo): string {
  const bs = p.bracos.map(x => x.braco);
  const linha = (rot: string, f: (c: ContagemBraco) => string) => `| ${rot} | ${p.bracos.map(x => { const c = p.porBraco[x.braco]; return c ? f(c) : "—"; }).join(" | ")} |`;
  const ce = Object.entries(p.comErros);
  return ["", "## ANÁLISE DE SENSIBILIDADE — por protocolo (NAT-78 §4.5); não é o primário, nunca no lugar da tabela acima", "",
    `Leitura \`${p.leitura}\` (tipo \`${p.tipo}\`, \`${p.formato}\`, definição \`${p.definicao.versao}\`): ${p.aviso}. Conjunto por protocolo: ${Object.entries(p.definicao.estadoExigido).map(([b, e]) => `\`${b}\` com \`${e}\``).join("; ")} (estado do oráculo da execução, \`summary.json\` › \`mcpIsolamento.usoOraculo\`). ` +
      "Braço fora do conjunto não tem número nesta leitura; `used-with-errors` fica fora e é contado à parte, abaixo. A contagem de quem entra é a mesma do primário.", "",
    "### Exclusões por braço", "", ...exclusoesMd(p.exclusoesPorBraco), "",
    `| | ${bs.join(" | ")} |`, `|---|${bs.map(() => "---").join("|")}|`,
    `| estado do oráculo | ${p.bracos.map(x => x.estadoDoOraculo ? `\`${x.estadoDoOraculo}\`` : "—").join(" | ")} |`,
    `| exigido | ${p.bracos.map(x => `\`${x.exigido}\``).join(" | ")} |`,
    `| situação | ${p.bracos.map(x => ROTULO_SITUACAO[x.situacao]).join(" | ")} |`,
    linha("**detecção** (por protocolo)", c => `**${c.deteccao.length}**`),
    linha("detecção · específica do DS", c => String(c.porClasse.ds.deteccao)),
    linha("detecção · acessibilidade geral", c => String(c.porClasse.geral.deteccao)),
    linha("**detecção fundamentada** (por protocolo)", c => `**${c.fundamentada.length}**`), "",
    `- nenhum braço do conjunto por protocolo detectou: ${p.nenhumBraco.join(", ") || "—"}`, "",
    "### Usado com erros (`used-with-errors`): fora do conjunto por protocolo, à parte", "",
    ...(ce.length ? ["| braço | detecção | DS | geral | fundamentada | specs |", "|---|---|---|---|---|---|",
      ...ce.map(([b, c]) => `| ${b} | ${c.deteccao.length} | ${c.porClasse.ds.deteccao} | ${c.porClasse.geral.deteccao} | ${c.fundamentada.length} | ${c.deteccao.join(", ") || "—"} |`)]
      : ["Nenhum braço com `used-with-errors` nesta análise."]), ""].join("\n");
}

if (process.argv[1] && /(?:^|[\\/])e14-deteccao\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const passada = val("--passada"), saida = val("--saida");
  if (!passada || !saida) { console.error("Uso: --passada PASTA [--julgamentos ARQ] [--analise DIR] --saida PASTA [--coluna-principal deteccao|fundamentada] [--sem-expostas] [--sensibilidade-regra ARQ] [--por-protocolo]"); process.exit(1); }
  const comProtocolo = a.includes("--por-protocolo");
  const jAbs = resolve(val("--julgamentos") ?? join(passada, "julgamentos.json"));
  for (const f of ["deteccao.json", "deteccao.md"]) if (existsSync(join(saida, f))) { console.error(`${join(saida, f)} já existe (versão nova = pasta nova)`); process.exit(1); }
  const ler = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;
  const jTxt = readFileSync(jAbs, "utf8");
  const sAbs = val("--sensibilidade-regra") ? resolve(val("--sensibilidade-regra")!) : null;
  const sens = sAbs ? ler<SensibilidadeRegra>(sAbs) : null;
  if (sens && sens.formato !== FORMATO_SENSIBILIDADE_REGRA) { console.error(`${sAbs}: não é sensibilidade-regra ${FORMATO_SENSIBILIDADE_REGRA} (${sens.formato}; a 1.0.0 não traz a resposta adotada para re-derivar as leituras)`); process.exit(1); }
  const p1Abs = resolve(join(passada, "julgamentos.json"));
  const primeira = sens && p1Abs !== jAbs ? (JSON.parse(readFileSync(p1Abs, "utf8").replace(/^﻿/, "")) as { julgamentos: Julgamento[] }).julgamentos : null;
  const j = JSON.parse(jTxt.replace(/^﻿/, "")) as { politica: string; completo: boolean; julgamentos: Julgamento[] };
  if (!j.completo) { console.error("julgamentos.json incompleto: a tabulação só lê passada completa"); process.exit(1); }
  const cAbs = join(passada, "chave", "fila-t3-chave.json"), mAbs = join(passada, "lotes", "manifesto.json");
  const chave = new Map(ler<{ itens: ItemChave[] }>(cAbs).itens.map(i => [i.chave, i.braco]));
  const m = ler<{ analises: { dir: string }[] }>(mAbs);
  // Várias análises (os trios de uma campanha numa passada só): uma tabela por análise, filtrando os julgamentos pelo
  // rótulo da análise na chave (`campanha|rótulo|cartão`), e um resumo com a mediana por braço. Todas da mesma tela.
  const multi = m.analises.length > 1;
  const cli = val("--coluna-principal");
  const resumo: { analise: string; porBraco: Record<string, { deteccao: number; fundamentada: number; ds: number; geral: number } | null> }[] = [];
  const resumoPP: { analise: string; bracos: LinhaProtocolo[]; porBraco: Record<string, { deteccao: number; fundamentada: number; ds: number; geral: number } | null>;
    comErros: Record<string, { deteccao: number; fundamentada: number; ds: number; geral: number }> }[] = [];
  const numeros = (c: ContagemBraco) => ({ deteccao: c.deteccao.length, fundamentada: c.fundamentada.length, ds: c.porClasse.ds.deteccao, geral: c.porClasse.geral.deteccao });
  let refSha: string | null = null;
  for (const a0 of m.analises) {
  // O rótulo da análise no manifesto é o nome da pasta (`analisar-<carimbo>`) e só ganha a pasta do trio quando os nomes
  // se repetem (e14-campanha). Com UM trio na passada (dev-366-b-01: p01/p02 fora por isolamento), o rótulo não traz
  // `pNN/`: procura-se a pasta única com esse nome um nível abaixo da campanha; mais de uma ou nenhuma → recusa.
  // `--analise DIR` (passada com UMA análise): a pasta da análise, quando o nome se repete em vários trios da campanha
  // (p01/p02/p03 com o mesmo carimbo) e a busca abaixo acharia mais de uma; tem de terminar no rótulo do manifesto.
  const analCli = val("--analise");
  if (analCli && m.analises.length > 1) { console.error("--analise só vale para passada com uma análise"); process.exit(1); }
  if (analCli && !resolve(analCli).replace(/[\/]+$/, "").endsWith(a0.dir)) { console.error(`--analise ${analCli} não é a análise do manifesto (${a0.dir})`); process.exit(1); }
  let anal = analCli ? resolve(analCli) : join(dirname(resolve(passada)), a0.dir);
  if (!existsSync(anal)) {
    const base = dirname(resolve(passada));
    const achadas = readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory() && existsSync(join(base, e.name, a0.dir))).map(e => join(base, e.name, a0.dir));
    if (achadas.length !== 1) throw new Error(`E14 detecção: análise ${a0.dir} não achada em ${base} (candidatas: ${achadas.length})`);
    anal = achadas[0];
  }
  const refAbs = join(anal, "entradas", "referencia.json"), campAbs = join(anal, "entradas", "campanha.json"), pkgAbs = join(anal, "revisao", "package.json");
  const coletaAbs = join(anal, "coleta-trio.json");
  if (refSha && sha(readFileSync(refAbs)) !== refSha) { console.error("análises de telas/referências diferentes: uma tela por tabulação"); process.exit(1); }
  refSha = sha(readFileSync(refAbs));
  const ref = ler<{ _meta?: { exposto?: { specs?: string[] } }; violations: { id: string; categories: string[] }[] }>(refAbs);
  const excluir = a.includes("--sem-expostas") ? ref._meta?.exposto?.specs ?? [] : undefined;
  if (excluir && !excluir.length) { console.error("--sem-expostas: a referência não declara _meta.exposto.specs"); process.exit(1); }
  const camp = ler<{ design: { arms?: string[]; colunaPrincipal?: string } }>(campAbs);
  const arms = camp.design.arms ?? ["sem", "com"];
  const pkg = ler<SemanticPackage>(pkgAbs);
  const slots = existsSync(coletaAbs) ? ler<{ slots: { braco: string; escolhida: string | null }[] }>(coletaAbs).slots : null;
  const estado = estadoDosBracos(pkg.runs.map(r => ({ id: r.id, braco: bracoDoRun(r, arms) })), slots, arms);
  let colunaPrincipal: Coluna | null;
  try { colunaPrincipal = colunaDe(cli ?? camp.design.colunaPrincipal); } catch (e) { console.error((e as Error).message); process.exit(1); }
  const js = multi ? j.julgamentos.filter(x => x.chave.split("|")[1] === a0.dir) : j.julgamentos;
  const t = tabular(js, k => { const b = chave.get(k); if (!b) throw new Error(`cartão fora da chave: ${k}`); return b; }, ref.violations, j.politica, arms,
    { estado, colunaPrincipal, ...(excluir ? { excluir } : {}) });
  // [NAT-78 §4.5] Só com --por-protocolo: o estado do oráculo de cada execução do desenho, da summary.json da análise.
  const resumoAbs = join(anal, "summary.json");
  const pp = comProtocolo ? porProtocolo(t, arms, estadosDoOraculo(ler<{ execucoes: ExecucaoDoResumo[] }>(resumoAbs).execucoes,
    pkg.runs.map(r => ({ id: r.id, braco: bracoDoRun(r, arms) })).filter(r => arms.includes(r.braco)))) : null;
  const lidos = [jAbs, cAbs, mAbs, refAbs, campAbs, pkgAbs, ...(slots ? [coletaAbs] : []), ...(sAbs ? [sAbs] : []), ...(primeira ? [p1Abs] : []), ...(pp ? [resumoAbs] : [])];
  const entradas = Object.fromEntries(lidos.map(p => [p.replace(/\\/g, "/"), sha(readFileSync(p))]));
  const bracoDe = (k: string) => { const b = chave.get(k); if (!b) throw new Error(`cartão fora da chave: ${k}`); return b; };
  const cen = sens ? cenariosDaRegra(js, bracoDe, t, sens, { primeira: primeira ? (multi ? primeira.filter(x => x.chave.split("|")[1] === a0.dir) : primeira) : null,
    fato: fatoDaPassada(resolve(passada), j.politica) }) : null;
  const doc = { ...t, ...(multi ? { analise: a0.dir, cartoesDaAnalise: js.length } : {}), colunaPrincipalOrigem: cli ? "--coluna-principal" : camp.design.colunaPrincipal ? "campanha.design.colunaPrincipal" : null, entradas,
    ...(cen ? { sensibilidadeDaRegra: cen } : {}), ...(pp ? { sensibilidadePorProtocolo: pp } : {}) };
  const dest = multi ? join(saida, a0.dir.split("/")[0]) : saida;
  const titulo = `Specs achadas por braço — ${basename(dirname(dirname(resolve(passada))))}/${basename(dirname(resolve(passada)))}/${basename(resolve(passada))}${multi ? ` · ${a0.dir}` : ""}`;
  gravar(dest, "deteccao.json", jsonTexto(doc));
  gravar(dest, "deteccao.md", tabelaMd(t, titulo) + (cen ? cenariosMd(cen, t.bracos) : "") + (pp ? porProtocoloMd(pp) : ""));
  if (cen) for (const [n, x] of Object.entries(cen.porCenario)) console.log(`cenário ${n}: ${t.bracos.map(b => `${b} ${x[b]?.deteccao ?? "—"}`).join(" · ")}`);
  if (pp) {
    console.log(`${LEITURA_POR_PROTOCOLO} (sensibilidade): ${pp.bracos.map(x => `${x.braco} ${x.estadoDoOraculo ?? "—"} → ${x.situacao}${pp.porBraco[x.braco] ? ` (detecção ${pp.porBraco[x.braco]!.deteccao.length})` : ""}`).join(" · ")}`);
    resumoPP.push({ analise: a0.dir, bracos: pp.bracos, porBraco: Object.fromEntries(pp.bracos.map(x => { const c = pp.porBraco[x.braco]; return [x.braco, c ? numeros(c) : null]; })),
      comErros: Object.fromEntries(Object.entries(pp.comErros).map(([b, c]) => [b, numeros(c)])) });
  }
  if (multi) console.log(`— ${a0.dir} (${js.length} cartões)`);
  for (const b of t.bracos) {
    const c = t.porBraco[b];
    console.log(c ? `${b}: detecção ${c.deteccao.length} (DS ${c.porClasse.ds.deteccao} · geral ${c.porClasse.geral.deteccao}) · fundamentada ${c.fundamentada.length} (DS ${c.porClasse.ds.fundamentada} · geral ${c.porClasse.geral.fundamentada})`
      : `${b}: coleta ${t.estado[b]} (sem contagem)`);
  }
  resumo.push({ analise: a0.dir, porBraco: Object.fromEntries(t.bracos.map(b => { const c = t.porBraco[b];
    return [b, c ? { deteccao: c.deteccao.length, fundamentada: c.fundamentada.length, ds: c.porClasse.ds.deteccao, geral: c.porClasse.geral.deteccao } : null]; })) });
  }
  if (multi) {
    const mediana = (xs: number[]) => { const o = [...xs].sort((x, y) => x - y), n = o.length; return n ? (n % 2 ? o[(n - 1) / 2] : (o[n / 2 - 1] + o[n / 2]) / 2) : null; };
    const bracos = [...new Set(resumo.flatMap(r => Object.keys(r.porBraco)))];
    const med = Object.fromEntries(bracos.map(b => { const v = resumo.map(r => r.porBraco[b]).filter((x): x is NonNullable<typeof x> => !!x);
      return [b, { trios: v.length, deteccao: mediana(v.map(x => x.deteccao)), fundamentada: mediana(v.map(x => x.fundamentada)), ds: mediana(v.map(x => x.ds)), geral: mediana(v.map(x => x.geral)) }]; }));
    // [NAT-78 §4.5] Só com --por-protocolo: mediana por braço sobre as análises em que o slot está no conjunto por protocolo,
    // numa chave própria (nunca em `mediana`); `used-with-errors` à parte, com os números de cada análise; os outros estados
    // fora, contados por braço × estado.
    const sensPP = comProtocolo ? (() => {
      const bs = [...new Set(resumoPP.flatMap(r => r.bracos.map(x => x.braco)))];
      // [D-198] exclusões por braço sobre todas as análises: slots, no conjunto, excluídos por estado.
      const exclusoes = exclusoesPorBraco(resumoPP.flatMap(r => r.bracos.filter(x => x.situacao !== "sem-coleta")
        .map(x => ({ braco: x.braco, estado: x.estadoDoOraculo!, situacao: x.situacao as SituacaoProtocolo }))), bs);
      return { leitura: LEITURA_POR_PROTOCOLO, tipo: TIPO_POR_PROTOCOLO, formato: FORMATO_POR_PROTOCOLO, aviso: AVISO_POR_PROTOCOLO, definicao: definicaoPorProtocolo(),
        exclusoesPorBraco: exclusoes,
        nota: "mediana por braço sobre as análises em que o slot está no conjunto por protocolo; fora dele (ou sem coleta válida) o braço não entra na mediana; used-with-errors listado à parte com os próprios números, nunca somado",
        porAnalise: resumoPP.map(r => ({ analise: r.analise, situacao: Object.fromEntries(r.bracos.map(x => [x.braco, { estadoDoOraculo: x.estadoDoOraculo, situacao: x.situacao }])), porBraco: r.porBraco })),
        mediana: Object.fromEntries(bs.map(b => { const v = resumoPP.map(r => r.porBraco[b]).filter((x): x is NonNullable<typeof x> => !!x);
          return [b, { trios: v.length, deteccao: mediana(v.map(x => x.deteccao)), fundamentada: mediana(v.map(x => x.fundamentada)), ds: mediana(v.map(x => x.ds)), geral: mediana(v.map(x => x.geral)) }]; })),
        comErros: resumoPP.flatMap(r => Object.entries(r.comErros).map(([b, x]) => ({ analise: r.analise, braco: b, ...x }))) };
    })() : null;
    gravar(saida, "resumo.json", jsonTexto({ politica: j.politica, nota: "mediana por braço sobre as análises com coleta válida; braço sem contagem fica fora da mediana e aparece com null na análise", porAnalise: resumo, mediana: med,
      ...(sensPP ? { sensibilidadePorProtocolo: sensPP } : {}) }));
    for (const b of bracos) console.log(`mediana ${b}: detecção ${med[b].deteccao} · fundamentada ${med[b].fundamentada} · DS ${med[b].ds} · geral ${med[b].geral} (${med[b].trios} trios)`);
    if (sensPP) for (const [b, x] of Object.entries(sensPP.mediana)) { const e = sensPP.exclusoesPorBraco[b];
      console.log(`${LEITURA_POR_PROTOCOLO} (sensibilidade) · mediana ${b}: detecção ${x.deteccao} · fundamentada ${x.fundamentada} (${x.trios} trios no conjunto; slots ${e.slots}, excluídos ${e.excluidos}${e.excluidos ? `: ${Object.entries(e.porEstado).map(([s, n]) => `${s} ${n}`).join(", ")}` : ""})`); }
  }
}
