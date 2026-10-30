/**
 * Respostas da autora ao material de ratificação (protocolo NAT-78 §8.4; plano de revisão 19/10, entrega 6): o vocabulário
 * fechado das perguntas, a leitura da linha de texto que ela manda (pelo celular, num comentário do Linear), o desfecho
 * que as respostas implicam e o desfecho da passada LLM no mesmo vocabulário. Módulo sem leitura de arquivo, usado pelo
 * `material-autora.ts` (que grava as respostas) e pelo `recalculo-campanha.ts --ratificacoes` (que as consome no S4').
 *
 * Ratificar = o desfecho das respostas dela (julgadas às cegas, sem ver o braço nem a decisão da passada) é IGUAL ao
 * desfecho da passada. Desacordo não sobrescreve nada (como na NAT-73): só deixa o cartão sem ratificação.
 */
import type { CitacaoPorReferencia, Derivado } from "./e14-comum";

export const FORMATO_RESPOSTAS_AUTORA = "nat78-respostas-autora-1.0.0";

export const FATO = ["sim", "nao", "nao-sei"] as const;
export const VIOLA = ["sim", "nao", "nao-sei"] as const;
export const ORIGEM = ["pagina", "ds", "nao-sei"] as const;
export type Fato = typeof FATO[number];
export type Viola = typeof VIOLA[number];
export type OrigemAutora = typeof ORIGEM[number];

/** Desfecho contábil comum às duas leituras (autora e passada). */
export type Desfecho = `credita:${string}` | "achado-novo" | "violacao-ds" | "sem-violacao" | "falso" | "indisponivel" | "pendente";

export interface RespostaAutora {
  caso: string;
  fato: Fato;
  /** `null` quando não se pergunta (fato ≠ sim). */
  viola: Viola | null;
  /** id do defeito da lista, `nenhum`, `nao-sei`; `null` quando não se pergunta (viola ≠ sim). */
  defeito: string | null;
  /** `null` quando não se pergunta (viola ≠ sim). */
  origem: OrigemAutora | null;
  nota: string | null;
}

/** O que as respostas dela implicam, pela política 1.2.0 (origem não sabida = indeterminada, que credita). */
export function desfechoDaAutora(r: RespostaAutora): Desfecho {
  if (r.fato === "nao") return "falso";
  if (r.fato === "nao-sei") return "pendente";
  if (r.viola === "nao") return "sem-violacao";
  if (r.viola !== "sim") return "pendente";
  if (r.origem === "ds") return "violacao-ds";
  if (r.defeito === "nenhum") return "achado-novo";
  if (!r.defeito || r.defeito === "nao-sei") return "pendente";
  return `credita:${r.defeito}`;
}

/**
 * Desfecho da passada (classe derivada, já com a origem medida quando houver) no mesmo vocabulário. `credita` é decidido
 * por quem chama, com o `vereditoNaPolitica` do recálculo (1.2.0), para não duplicar a regra de crédito.
 */
export function desfechoDaPassada(d: Pick<Derivado, "classe" | "spec">, credita: boolean): Desfecho {
  if (credita) return `credita:${d.spec}`;
  switch (d.classe) {
    case "erro-factual": return "falso";
    case "erro-normativo": case "observacao": case "observacao-norma-errada": return "sem-violacao";
    case "violacao-ds": return "violacao-ds";
    case "violacao-pagina": case "violacao-origem-indeterminada": return "achado-novo";
    case "evidencia-indisponivel": return "indisponivel";
    default: return "pendente";
  }
}

export const ratifica = (autora: Desfecho, passada: Desfecho): boolean => autora !== "pendente" && autora === passada;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Lê o texto que a autora manda: uma linha por caso, `R-01: sim sim A-04 pagina`, `R-02: nao`, `R-03: sim nao`,
 * `R-04: nao sei`. Separadores livres (espaço, vírgula, ponto e vírgula, barra); acentos e maiúsculas ignorados; "não sei"
 * vira `nao-sei`; tudo depois de `#` é nota. Linhas sem `R-NN` são ignoradas (cabeçalho do comentário, por exemplo).
 * Devolve as respostas e os erros (nada é adivinhado: valor fora da lista, pergunta a mais ou a menos → erro).
 */
export function lerTextoDaAutora(texto: string, o: { casos: string[]; defeitos: string[] }): { respostas: RespostaAutora[]; erros: string[] } {
  const erros: string[] = [], respostas: RespostaAutora[] = [];
  const defeitos = new Map(o.defeitos.map(d => [d.toLowerCase(), d]));
  for (const [k, linha0] of texto.split(/\r?\n/).entries()) {
    const m = /^\s*[-*>]*\s*\**\s*(R-\d{2})\**\s*[:=—–-]?\s*(.*)$/i.exec(linha0);
    if (!m) continue;
    const caso = m[1].toUpperCase();
    const [corpo, ...nota] = m[2].split("#");
    const toks = semAcento(corpo).replace(/nao\s+sei/g, "nao-sei").split(/[\s,;/|]+/).filter(Boolean);
    const onde = `linha ${k + 1} (${caso})`;
    if (!o.casos.includes(caso)) { erros.push(`${onde}: caso fora do material`); continue; }
    if (respostas.some(r => r.caso === caso)) { erros.push(`${onde}: caso respondido duas vezes`); continue; }
    const r: RespostaAutora = { caso, fato: "nao-sei", viola: null, defeito: null, origem: null, nota: nota.join("#").trim() || null };
    const [f, v, d, og, ...resto] = toks;
    if (!FATO.includes(f as Fato)) { erros.push(`${onde}: 1ª resposta (fato) "${f ?? ""}" fora de sim/nao/nao-sei`); continue; }
    r.fato = f as Fato;
    const fim = (n: number) => { if (toks.length > n) erros.push(`${onde}: respostas a mais (${toks.slice(n).join(" ")}): depois de "${toks[n - 1]}" não se pergunta mais nada`); };
    if (r.fato !== "sim") { fim(1); respostas.push(r); continue; }
    if (!VIOLA.includes(v as Viola)) { erros.push(`${onde}: 2ª resposta (descumpre) "${v ?? ""}" fora de sim/nao/nao-sei`); continue; }
    r.viola = v as Viola;
    if (r.viola !== "sim") { fim(2); respostas.push(r); continue; }
    if (d === "nenhum" || d === "nao-sei") r.defeito = d;
    else if (d && defeitos.has(d)) r.defeito = defeitos.get(d)!;
    else { erros.push(`${onde}: 3ª resposta (defeito) "${d ?? ""}" não é id da lista, nenhum nem nao-sei`); continue; }
    if (!ORIGEM.includes(og as OrigemAutora)) { erros.push(`${onde}: 4ª resposta (quem escreveu) "${og ?? ""}" fora de pagina/ds/nao-sei`); continue; }
    r.origem = og as OrigemAutora;
    if (resto.length) fim(4);
    respostas.push(r);
  }
  const faltam = o.casos.filter(c => !respostas.some(r => r.caso === c) && !erros.some(e => e.includes(`(${c})`)));
  if (faltam.length) erros.push(`casos sem resposta: ${faltam.join(", ")} (responda "nao-sei" para pular)`);
  return { respostas: respostas.sort((a, b) => (a.caso < b.caso ? -1 : 1)), erros };
}

// ───────────────────────────────────────────────────────────────── arquivos (formatos)

export const FORMATO_CHAVE_AUTORA = "nat78-material-autora-chave-1.0.0";

/** Um caso da chave do material (NÃO vai à autora: liga o caso ao cartão, ao braço e ao estrato). */
export interface CasoChave {
  caso: string; id: string; chave: string; braco: string; estrato: number; passada: string; julgamentosSha256: string;
  /** Desfecho da passada (1.2.0, com a origem medida quando dada) no vocabulário da autora. */
  desfechoPassada: Desfecho;
  /** [D-156] Só quando uma referência secundária deu a classe: regra citada que caiu × referência usada (campos distintos). */
  citacao?: CitacaoPorReferencia;
}
export interface ChaveAutora { formato: string; aviso: string; selecaoSha256: string; casos: CasoChave[] }

/** Respostas da autora gravadas pelo `material-autora.ts responder` (o que o `recalculo --ratificacoes` lê). */
export interface DocRespostasAutora {
  formato: string; aviso: string; juiz: "autora";
  material: { dir: string; manifestoSha256: string; chaveSha256: string };
  textoSha256: string;
  respostas: (RespostaAutora & { desfecho: Desfecho })[];
}
