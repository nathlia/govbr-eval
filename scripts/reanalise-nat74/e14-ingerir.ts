/**
 * E14 passo 2 (plano NAT-74 §6.6): ingere as respostas dos juízes (`fila-t3/respostas/lote-NN.json`), confere cada
 * uma contra o esquema, as perguntas do cartão e os ids do lote, e junta tudo em `fila-t3/julgamentos.json` (+ sha256).
 *
 *   npm run reanalise:nat74:e14-ingerir -- [--saida PASTA_DO_DERIVADO] [--refazer]          (fila T3 da NAT-74, histórica)
 *   npx tsx scripts/reanalise-nat74/e14-ingerir.ts --fila PASTA_DA_PASSADA [--refazer]      (campanha nova, e14-campanha.ts)
 *
 * [1b, achados J/L] `--fila` é o único caminho da campanha nova: grava `julgamentos.json` + `.sha256` NA PASTA DADA e
 * nunca cai na fila histórica (pasta sem manifesto → recusa). Sem `--fila`, qualquer argumento solto é recusado (antes,
 * uma pasta passada sem flag era ignorada e a ingestão rodava calada sobre a fila T3 da NAT-74). Sem argumento algum, o
 * comportamento histórico é o mesmo, byte a byte.
 *
 * Recusa (nada é gravado, código 1) se qualquer arquivo de respostas tiver: cartão faltando (incompleto), id repetido,
 * id fora do lote, valor fora das listas fechadas, justificativa sem id citado, ou `loteSha256` diferente do lote
 * publicado. A ingestão é refeita do zero a cada execução (idempotente); com todos os lotes respondidos o arquivo sai
 * `completo: true` e fica congelado: mudar depois exige `--refazer` (e o motivo vai para o registro).
 * A classe de cada átomo é DERIVADA das respostas por regra fixa (`derivarClasse`), nunca escrita pelo juiz.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { POLITICA_PRINCIPAL, gravar, jsonTexto, ordenar, raizSaida, sha } from "./comum";
import {
  E14_VERSAO, ESQUEMA_RESPOSTAS, ESQUEMA_RESPOSTAS_CAMPANHA, ESQUEMA_RESPOSTAS_CAMPANHA_1_1, FORMATO_JULGAMENTOS, FORMATO_MANIFESTO_CAMPANHA,
  FORMATO_MANIFESTO_CAMPANHA_1_1, FORMATO_RESPOSTAS, FORMATO_RESPOSTAS_CAMPANHA, FORMATO_RESPOSTAS_CAMPANHA_1_1, derivarClasse, validarResposta,
  type ArquivoRespostas, type CartaoCego, type ContextoDerivacao, type ItemChave, type Resposta,
} from "./e14-comum";

interface Manifesto { formato?: string; lotes: { lote: string; n: number; sha256: string; ids: string[] }[]; chaveSha256: string; total: number }
interface Lote { lote: string; referencias: Record<string, { defeitos: { id: string }[] }>; cartoes: CartaoCego[] }

export interface Ingestao { erros: string[]; julgamentos: Record<string, unknown> | null; texto: string | null }

/** Contexto de derivação de um átomo: o cartão cego (o que o juiz viu) + tipo e origem medida (da chave). */
export function contextoDe(c: CartaoCego, it: ItemChave, specsDaTela: string[]): ContextoDerivacao {
  const ctx: ContextoDerivacao = { tipo: it.tipo, citaRegra: c.alegacao.regra !== null, temEsperado: !!c.alegacao.esperado?.trim(), specsDaTela, citaveis: c.citaveis,
    origemMedida: it.origemMedida341, classeRegistrada: c.vereditoRegistrado ? "erro-normativo" : null };
  // [M, 1.2.0] Forças da regra citada já no vocabulário (só cartões que as trazem; o histórico não muda).
  const rs = c.normaCitada?.regrasDaBase ?? [];
  if (rs.length && rs.every(r => r.forcaNoVocabulario !== undefined)) ctx.forcasDaCitada = rs.map(r => r.forcaNoVocabulario ?? null);
  return ctx;
}

type Validador = ((x: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
type Versao = "historica" | "campanha-1.1" | "campanha-1.2";
const ESQUEMAS: Record<Versao, object> = { historica: ESQUEMA_RESPOSTAS, "campanha-1.1": ESQUEMA_RESPOSTAS_CAMPANHA_1_1, "campanha-1.2": ESQUEMA_RESPOSTAS_CAMPANHA };
const validadores = new Map<Versao, Validador>();
function esquema(v: Versao): Validador {
  if (!validadores.has(v)) validadores.set(v, new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(ESQUEMAS[v]) as Validador);
  return validadores.get(v)!;
}

const lerTexto = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");

export function ingerir(fila: string, o: { refazer?: boolean } = {}): Ingestao {
  const erros: string[] = [];
  const mAbs = join(fila, "lotes", "manifesto.json"), cAbs = join(fila, "chave", "fila-t3-chave.json");
  if (!existsSync(mAbs) || !existsSync(cAbs)) return { erros: ["fila não preparada: rode reanalise:nat74:e14-preparar"], julgamentos: null, texto: null };
  const mTxt = lerTexto(mAbs), cTxt = lerTexto(cAbs);
  const manifesto = JSON.parse(mTxt) as Manifesto;
  // [1b] Primeira passada de campanha nova 1.1.0: esquema/formato próprios, norma neutra, caminho único de respostas.
  // [M/N] 1.2.0: + estadoAlcancado e força da base já mapeada; a 1.1.0 segue o esquema dela, sem mudança.
  const versao: Versao = manifesto.formato === FORMATO_MANIFESTO_CAMPANHA ? "campanha-1.2" : manifesto.formato === FORMATO_MANIFESTO_CAMPANHA_1_1 ? "campanha-1.1" : "historica";
  const campanha = versao !== "historica", v12 = versao === "campanha-1.2";
  const formatoResp = v12 ? FORMATO_RESPOSTAS_CAMPANHA : campanha ? FORMATO_RESPOSTAS_CAMPANHA_1_1 : FORMATO_RESPOSTAS;
  if (campanha) {
    const errado = join(fila, "lotes", "respostas");
    if (existsSync(errado) && readdirSync(errado).some(f => f.endsWith(".json"))) erros.push("há respostas em lotes/respostas/: o caminho único é respostas/ na pasta da passada (ao lado de lotes/); mova-as e ingira de novo");
  }
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
    const v = esquema(versao);
    if (!v(doc)) { for (const x of v.errors ?? []) erros.push(`respostas/${f}: esquema ${x.instancePath || "/"} ${x.message}`); continue; }
    if (doc.formato !== formatoResp) erros.push(`respostas/${f}: formato ${doc.formato}`);
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
      const e = validarResposta(r, ctx, v12 ? { normaNeutra: true, v12: true } : campanha ? { normaNeutra: true } : {});
      if (e.length) { for (const x of e) erros.push(`respostas/${f}: ${r.id}: ${x}`); continue; }
      julg.push({ id: r.id, chave: it.chave, tipo: it.tipo, lote: nome, juiz: doc.juiz, resposta: r, derivado: derivarClasse(r as Resposta, ctx) });
    }
    resumoLotes.push({ lote: nome, arquivo: `respostas/${f}`, sha256: sha(bruto), juiz: doc.juiz, n: doc.respostas.length });
  }
  if (erros.length) return { erros, julgamentos: null, texto: null };
  const ordenados = ordenar(julg, j => j.id as string);
  const porClasse: Record<string, number> = {};
  for (const j of ordenados) { const k = (j.derivado as { classe: string }).classe; porClasse[k] = (porClasse[k] ?? 0) + 1; }
  // [N, 1.2.0] Quantos cartões a receita levou ao estado descrito, e quantos não (evidência indisponível, R9/R10).
  const porEstadoAlcancado: Record<string, number> = {};
  if (v12) for (const j of ordenados) { const k = (j.resposta as Resposta).estadoAlcancado!; porEstadoAlcancado[k] = (porEstadoAlcancado[k] ?? 0) + 1; }
  const julgamentos = { formato: FORMATO_JULGAMENTOS, versao: E14_VERSAO, politica: POLITICA_PRINCIPAL,
    juizRotulo: campanha ? "julgado só por LLM (juiz cego por lote, primeira passada §8.1 do protocolo NAT-78)"
      : "julgado só por LLM (assistente, subagente cego por lote; D-130), salvo os materiais revistos pela autora (P5 a, materiais.json)",
    fila: { manifestoSha256: sha(mTxt), chaveSha256: manifesto.chaveSha256 },
    total: manifesto.total, julgados: ordenados.length, completo: ordenados.length === manifesto.total,
    lotes: resumoLotes, porClasse, ...(v12 ? { porEstadoAlcancado } : {}), conteudoSha256: sha(JSON.stringify(ordenados)), julgamentos: ordenados };
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

/**
 * Argumentos da CLI. `--fila PASTA` → campanha nova (a pasta é a da passada, nunca a fila histórica). Sem `--fila`, só
 * `--saida PASTA` e `--refazer` são aceitos (caminho histórico); argumento solto ou desconhecido é recusado.
 */
export function argumentosIngerir(argv: string[]): { fila: string | null; refazer: boolean; erro: string | null } {
  const refazer = argv.includes("--refazer");
  const iF = argv.indexOf("--fila"), iS = argv.indexOf("--saida");
  const valor = (i: number) => (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null);
  const usados = new Set<number>([iF, iF >= 0 ? iF + 1 : -1, iS, iS >= 0 ? iS + 1 : -1, ...argv.flatMap((x, i) => (x === "--refazer" ? [i] : []))]);
  const soltos = argv.filter((_, i) => !usados.has(i));
  if (soltos.length) return { fila: null, refazer, erro: `argumento não reconhecido: ${soltos.join(" ")} (campanha nova: --fila PASTA_DA_PASSADA; fila histórica: sem argumento ou --saida)` };
  if (argv.filter(x => x === "--fila").length > 1) return { fila: null, refazer, erro: "--fila mais de uma vez" };
  if (iF >= 0) {
    if (!valor(iF)) return { fila: null, refazer, erro: "--fila exige a pasta da passada" };
    if (iS >= 0) return { fila: null, refazer, erro: "--fila e --saida juntos: use só --fila (campanha nova) ou só --saida (fila histórica)" };
    return { fila: resolve(valor(iF)!), refazer, erro: null };
  }
  if (iS >= 0 && !valor(iS)) return { fila: null, refazer, erro: "--saida exige a pasta do derivado" };
  return { fila: null, refazer, erro: null };
}

if (process.argv[1] && /e14-ingerir\.ts$/.test(process.argv[1])) {
  const args = argumentosIngerir(process.argv.slice(2));
  if (args.erro) { console.error(`INGESTÃO RECUSADA: ${args.erro}; nada gravado.`); process.exit(1); }
  if (args.fila) {
    // Campanha nova: só a pasta dada; sem manifesto dela, recusa (nunca a fila histórica).
    const fila = args.fila;
    if (!existsSync(join(fila, "lotes", "manifesto.json"))) { console.error(`INGESTÃO RECUSADA: ${fila} não tem lotes/manifesto.json (não é uma passada preparada); nada gravado.`); process.exit(1); }
    const r = ingerir(fila, { refazer: args.refazer });
    if (r.erros.length) {
      console.error(`INGESTÃO RECUSADA (${r.erros.length}); nada gravado.`);
      for (const e of r.erros.slice(0, 80)) console.error(`  ${e}`);
      process.exit(1);
    }
    gravar(fila, "julgamentos.json", r.texto!);
    gravar(fila, "julgamentos.json.sha256", `${sha(r.texto!)}  julgamentos.json\n`);
    const j = r.julgamentos as { julgados: number; total: number; completo: boolean; porClasse: Record<string, number>; porEstadoAlcancado?: Record<string, number> };
    console.log(`E14 ingerir (--fila) ok: ${j.julgados}/${j.total} julgados${j.completo ? " (COMPLETO, congelado)" : ""}; classes ${JSON.stringify(j.porClasse)}`);
    if (j.porEstadoAlcancado) console.log(`  estado alcançado: ${JSON.stringify(j.porEstadoAlcancado)}`);
    console.log(`  sha256 ${sha(r.texto!)}  ${join(fila, "julgamentos.json")}`);
    process.exit(0);
  }
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
