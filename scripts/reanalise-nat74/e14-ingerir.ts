/**
 * E14 passo 2 (plano NAT-74 §6.6): ingere as respostas dos juízes (`fila-t3/respostas/lote-NN.json`), confere cada
 * uma contra o esquema, as perguntas do cartão e os ids do lote, e junta tudo em `fila-t3/julgamentos.json` (+ sha256).
 *
 *   npm run reanalise:nat74:e14-ingerir -- [--saida PASTA_DO_DERIVADO] [--refazer]
 *
 * Recusa (nada é gravado, código 1) se qualquer arquivo de respostas tiver: cartão faltando (incompleto), id repetido,
 * id fora do lote, valor fora das listas fechadas, justificativa sem id citado, ou `loteSha256` diferente do lote
 * publicado. A ingestão é refeita do zero a cada execução (idempotente); com todos os lotes respondidos o arquivo sai
 * `completo: true` e fica congelado: mudar depois exige `--refazer` (e o motivo vai para o registro).
 * A classe de cada átomo é DERIVADA das respostas por regra fixa (`derivarClasse`), nunca escrita pelo juiz.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { POLITICA_PRINCIPAL, gravar, jsonTexto, ordenar, raizSaida, sha } from "./comum";
import {
  E14_VERSAO, ESQUEMA_RESPOSTAS, FORMATO_JULGAMENTOS, FORMATO_RESPOSTAS, derivarClasse, validarResposta,
  type ArquivoRespostas, type CartaoCego, type ContextoDerivacao, type ItemChave, type Resposta,
} from "./e14-comum";

interface Manifesto { lotes: { lote: string; n: number; sha256: string; ids: string[] }[]; chaveSha256: string; total: number }
interface Lote { lote: string; referencias: Record<string, { defeitos: { id: string }[] }>; cartoes: CartaoCego[] }

export interface Ingestao { erros: string[]; julgamentos: Record<string, unknown> | null; texto: string | null }

/** Contexto de derivação de um átomo: o cartão cego (o que o juiz viu) + tipo e origem medida (da chave). */
export function contextoDe(c: CartaoCego, it: ItemChave, specsDaTela: string[]): ContextoDerivacao {
  return { tipo: it.tipo, citaRegra: c.alegacao.regra !== null, temEsperado: !!c.alegacao.esperado?.trim(), specsDaTela, citaveis: c.citaveis,
    origemMedida: it.origemMedida341, classeRegistrada: c.vereditoRegistrado ? "erro-normativo" : null };
}

type Validador = ((x: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
let validarEsquema: Validador | null = null;
function esquema(): Validador {
  if (!validarEsquema) validarEsquema = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(ESQUEMA_RESPOSTAS as object) as Validador;
  return validarEsquema;
}

const lerTexto = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");

export function ingerir(fila: string, o: { refazer?: boolean } = {}): Ingestao {
  const erros: string[] = [];
  const mAbs = join(fila, "lotes", "manifesto.json"), cAbs = join(fila, "chave", "fila-t3-chave.json");
  if (!existsSync(mAbs) || !existsSync(cAbs)) return { erros: ["fila não preparada: rode reanalise:nat74:e14-preparar"], julgamentos: null, texto: null };
  const mTxt = lerTexto(mAbs), cTxt = lerTexto(cAbs);
  const manifesto = JSON.parse(mTxt) as Manifesto;
  if (sha(cTxt) !== manifesto.chaveSha256) erros.push("chave/fila-t3-chave.json difere do manifesto");
  const chave = new Map((JSON.parse(cTxt) as { itens: ItemChave[] }).itens.map(i => [i.id, i]));
  const lotes = new Map<string, { m: Manifesto["lotes"][number]; l: Lote }>();
  for (const m of manifesto.lotes) {
    const t = lerTexto(join(fila, "lotes", `${m.lote}.json`));
    if (sha(t) !== m.sha256) erros.push(`${m.lote}.json difere do manifesto (sha256)`);
    lotes.set(m.lote, { m, l: JSON.parse(t) as Lote });
  }
  const dir = join(fila, "respostas");
  const arquivos = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).sort() : [];
  if (!arquivos.length) erros.push("nenhum arquivo em respostas/: nada a ingerir");
  const julg: Record<string, unknown>[] = [];
  const vistos = new Map<string, string>();
  const resumoLotes: Record<string, unknown>[] = [];
  for (const f of arquivos) {
    const nome = f.replace(/\.json$/, "");
    const lote = lotes.get(nome);
    if (!lote) { erros.push(`respostas/${f}: não é um lote da fila`); continue; }
    const bruto = lerTexto(join(dir, f));
    let doc: ArquivoRespostas;
    try { doc = JSON.parse(bruto); } catch (e) { erros.push(`respostas/${f}: JSON inválido (${(e as Error).message})`); continue; }
    const v = esquema();
    if (!v(doc)) { for (const x of v.errors ?? []) erros.push(`respostas/${f}: esquema ${x.instancePath || "/"} ${x.message}`); continue; }
    if (doc.formato !== FORMATO_RESPOSTAS) erros.push(`respostas/${f}: formato ${doc.formato}`);
    if (doc.lote !== nome) erros.push(`respostas/${f}: lote "${doc.lote}" ≠ nome do arquivo`);
    if (doc.loteSha256 !== lote.m.sha256) erros.push(`respostas/${f}: loteSha256 não é o do lote publicado`);
    const ids = doc.respostas.map(r => r.id);
    const doLote = new Set(lote.m.ids);
    for (const id of unicosRepetidos(ids)) erros.push(`respostas/${f}: id repetido ${id}`);
    for (const id of ids) if (!doLote.has(id)) erros.push(`respostas/${f}: id fora do lote ${id}`);
    for (const id of lote.m.ids) if (!ids.includes(id)) erros.push(`respostas/${f}: incompleto — falta ${id}`);
    const cartoes = new Map(lote.l.cartoes.map(c => [c.id, c]));
    for (const r of doc.respostas) {
      const c = cartoes.get(r.id), it = chave.get(r.id);
      if (!c || !it) continue;
      if (vistos.has(r.id)) { erros.push(`respostas/${f}: ${r.id} já respondido em ${vistos.get(r.id)}`); continue; }
      vistos.set(r.id, f);
      const ctx = contextoDe(c, it, lote.l.referencias[c.tela].defeitos.map(d => d.id));
      const e = validarResposta(r, ctx);
      if (e.length) { for (const x of e) erros.push(`respostas/${f}: ${r.id}: ${x}`); continue; }
      julg.push({ id: r.id, chave: it.chave, tipo: it.tipo, lote: nome, juiz: doc.juiz, resposta: r, derivado: derivarClasse(r as Resposta, ctx) });
    }
    resumoLotes.push({ lote: nome, arquivo: `respostas/${f}`, sha256: sha(bruto), juiz: doc.juiz, n: doc.respostas.length });
  }
  if (erros.length) return { erros, julgamentos: null, texto: null };
  const ordenados = ordenar(julg, j => j.id as string);
  const porClasse: Record<string, number> = {};
  for (const j of ordenados) { const k = (j.derivado as { classe: string }).classe; porClasse[k] = (porClasse[k] ?? 0) + 1; }
  const julgamentos = { formato: FORMATO_JULGAMENTOS, versao: E14_VERSAO, politica: POLITICA_PRINCIPAL,
    juizRotulo: "julgado só por LLM (assistente, subagente cego por lote; D-130), salvo os materiais revistos pela autora (P5 a, materiais.json)",
    fila: { manifestoSha256: sha(mTxt), chaveSha256: manifesto.chaveSha256 },
    total: manifesto.total, julgados: ordenados.length, completo: ordenados.length === manifesto.total,
    lotes: resumoLotes, porClasse, conteudoSha256: sha(JSON.stringify(ordenados)), julgamentos: ordenados };
  const texto = jsonTexto(julgamentos);
  const atual = join(fila, "julgamentos.json");
  if (existsSync(atual) && !o.refazer) {
    const velho = JSON.parse(lerTexto(atual)) as { completo?: boolean };
    if (velho.completo && lerTexto(atual) !== texto) return { erros: ["julgamentos.json está completo e congelado; mudar exige --refazer (registre o motivo)"], julgamentos: null, texto: null };
  }
  return { erros, julgamentos, texto };
}

function unicosRepetidos(xs: string[]): string[] {
  const vistos = new Set<string>(), rep = new Set<string>();
  for (const x of xs) (vistos.has(x) ? rep : vistos).add(x);
  return [...rep].sort();
}

if (process.argv[1] && /e14-ingerir\.ts$/.test(process.argv[1])) {
  const fila = join(raizSaida(), "fila-t3");
  const r = ingerir(fila, { refazer: process.argv.includes("--refazer") });
  if (r.erros.length) {
    console.error(`INGESTÃO RECUSADA (${r.erros.length}); nada gravado.`);
    for (const e of r.erros.slice(0, 80)) console.error(`  ${e}`);
    process.exit(1);
  }
  gravar(fila, "julgamentos.json", r.texto!);
  gravar(fila, "julgamentos.json.sha256", `${sha(r.texto!)}  julgamentos.json\n`);
  const j = r.julgamentos as { julgados: number; total: number; completo: boolean; porClasse: Record<string, number> };
  console.log(`E14 ingerir ok: ${j.julgados}/${j.total} átomos julgados${j.completo ? " (COMPLETO, congelado)" : ""}; classes ${JSON.stringify(j.porClasse)}`);
  console.log(`  sha256 ${sha(r.texto!)}  fila-t3/julgamentos.json`);
}
