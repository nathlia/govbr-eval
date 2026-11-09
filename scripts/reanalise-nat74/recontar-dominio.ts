/**
 * [D-168] Reconta MECÂNICA de uma passada julgada sob o domínio declarado na referência (`dominio: { regra, registros }`
 * nas specs de parada em rota de registro, referência 1.1.0 da tela Vistorias). Nada é julgado de novo e a passada não muda:
 * a saída é uma pasta NOVA, derivada, com `julgamentos-dominio.json`, `reconta.md` e `reconta.json`.
 *
 *   npx tsx scripts/reanalise-nat74/recontar-dominio.ts --passada PASTA --referencia ARQ --medicao ARQ --saida PASTA_NOVA
 *       [--deteccao PASTA]   (a tabela de detecção publicada da passada: confere que a coluna "julgada" é a dela)
 *
 * Para cada cartão da passada, pela resposta que o juiz JÁ deu (nunca outra):
 *
 * 1. **Registro alcançado** pela receita do cartão, sem modelo, nesta ordem: (a) o identificador de registro escrito na
 *    receita ou no `observado` (rota `…/agendar-vistoria/<uuid>`, o último da receita); (b) a receita lida contra a lista
 *    MEDIDA (`--medicao`, medir-dominio.mjs): aba, página, linha e embarcação; receita que não abre detalhe nenhum (só a
 *    lista, ou vazia) chega à lista, que não é rota de registro; receita com filtro só se resolve pela embarcação; (c) o
 *    registro que a MEDIDA do juiz da 1ª passada nomeia na justificativa (o 1º "30NN"), declarado como fonte própria.
 *    As fontes que resolvem são comparadas; divergência fica listada e o cartão não muda.
 * 2. **Crédito pelo domínio** (o único que muda a contagem): resposta com `verdadeFactual: verdadeira` e `vinculo: "nenhum"`,
 *    uma única spec de rota de registro com `dominio` nas `candidatas` do cartão E citada pelo juiz (`evidencias` ou o id na
 *    justificativa), registro alcançado ≠ o da parada da spec e DENTRO de `dominio.registros`, justificativa que recusa
 *    por registro (marcador "registro"/"template"/"parada"/"rota" ou um id 30NN). Então a MESMA resposta, com só o vínculo
 *    trocado pela spec, passa pela mesma derivação da passada (`conferirLeitura`, e14-deteccao): conta se e só se ela
 *    credita a spec (fato, estado alcançado, norma e origem continuam os do juiz).
 * 3. **Crédito fora do domínio**: cartão que a passada CREDITA numa spec de rota de registro com o registro alcançado fora
 *    de `dominio.registros` (ou na lista, ou não determinado). Só listado: a 1ª passada não muda e a coluna "com domínio"
 *    o mantém; a coluna "com domínio, estrita" o tira (sensibilidade, nunca a contagem principal).
 *
 * Specs de rota de registro = specs cujo `state` é uma parada com `path` que termina num identificador (`registroDaRota`).
 * Spec sem `dominio` cobre só o registro da sua parada. Determinístico, sem rede, sem modelo; entradas com sha256.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CASCA } from "../conferir-dominio";
import { gravar, jsonTexto, sha, unicos, versaoDaPolitica } from "./comum";
import { dominioDoDefeito, registroDaRota, type Dominio } from "./e14-campanha";
import type { CartaoCego, ContextoDerivacao, Derivado, ItemChave, Resposta } from "./e14-comum";
import { conferirLeitura, specDetectada, type Julgamento } from "./e14-deteccao";
import { contextoDe } from "./e14-ingerir";

export const RECONTA_VERSAO = "d168-reconta-dominio-1.0.0";

// ───────────────────────────────────────────── referência

interface RefSpec { id: string; state: string; anchor?: string; dominio?: unknown }
export interface RefComDominio { _meta: { version: string; suite?: string; states?: { id: string; path?: string }[] }; violations: RefSpec[] }
export interface SpecDeRegistro { id: string; estado: string; registroDaParada: string; dominio: Dominio | null }

/**
 * Specs de parada em rota de registro, com o registro da parada e o `dominio` declarado (ou null). As da casca da aplicação
 * (âncora que começa num componente de `CASCA[_meta.suite]`, D-165 § 3) ficam fora: persistem entre rotas e não são do
 * template do registro.
 */
export function specsDeRegistro(ref: RefComDominio): Map<string, SpecDeRegistro> {
  const parada = new Map((ref._meta.states ?? []).map(s => [s.id, registroDaRota(s.path)]));
  const casca = CASCA[ref._meta.suite ?? ""] ?? [];
  const out = new Map<string, SpecDeRegistro>();
  for (const v of ref.violations) {
    if (casca.includes((v.anchor ?? "").trim().split(/\s+/)[0])) { if (v.dominio !== undefined) throw new Error(`${v.id}: dominio em spec da casca da aplicação`); continue; }
    const reg = v.state === "sempre" ? null : parada.get(v.state) ?? null;
    if (!reg) { if (v.dominio !== undefined) throw new Error(`${v.id}: dominio declarado em spec fora de rota de registro (${v.state})`); continue; }
    const d = dominioDoDefeito(v) ?? null;
    if (d && !d.registros.includes(reg)) throw new Error(`${v.id}: dominio.registros não inclui o registro da própria parada (${reg})`);
    out.set(v.id, { id: v.id, estado: v.state, registroDaParada: reg, dominio: d });
  }
  return out;
}
/** Registros que a unidade cobre: os do domínio declarado, senão só o da parada. */
export const registrosCobertos = (s: SpecDeRegistro): string[] => s.dominio?.registros ?? [s.registroDaParada];

// ───────────────────────────────────────────── registro alcançado

export interface LinhaMedida { aba: string; pagina: number; linha: number; celulas: string[]; botao: string | null; registro: string | null }
/** Linha da lista com o filtro Cidade aplicado (medir-dominio.mjs § 4), ligada ao registro pela linha igual sem filtro. */
export interface LinhaFiltrada { aba: string; filtro: string; opcao: string; pagina: number; linha: number; celulas: string[]; registro: string | null }
/** Coluna da embarcação em cada aba da lista medida (Tramitando tem a caixa de seleção antes). */
const COLUNA_NOME: Record<string, number> = { Tramitando: 2, Agendar: 1, "Concluídos": 1 };
export const nomeDaLinha = (l: LinhaMedida): string => l.celulas[COLUNA_NOME[l.aba] ?? 1] ?? "";

const UUID_NA_ROTA = /agendar-vistoria\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ABRE_DETALHE = /olho|\beye\b|visualizar|calend|agendar-vistoria\/|bot[aã]o\s+["“']?agendar|agendar["”']?\s+(?:da|na)\s+linha/i;
const ROTA_DE_EDICAO = /editar-dados-vistoria|\bEditar\b/;
const CALENDARIO = /calend|bot[aã]o\s+["“']?agendar|agendar["”']?\s+(?:da|na)\s+linha/i;
const FILTRO = /filtro|\bchip\b|tag de filtro|\.br-tag|busca|pesquis|Exibir/i;

export type FonteRegistro = "receita-url" | "lista-medida" | "medida-do-juiz";
export interface RegistroAlcancado {
  /** null = a receita chega à lista (rota sem registro) ou não se determinou (`fonte` null). */
  registro: string | null;
  fonte: FonteRegistro | "receita-sem-detalhe" | "rota-fora-do-detalhe" | null;
  porFonte: Partial<Record<FonteRegistro, string | null>>;
  divergencia: boolean;
  nota?: string;
}

/** (a) Identificador de registro escrito na receita (o último) ou, sem nenhum, no `observado`. */
export function registroNaReceita(passos: string[], observado: string | null): string | null {
  const ult = (t: string) => { const m = [...t.matchAll(UUID_NA_ROTA)]; return m.length ? m[m.length - 1][1].toLowerCase() : null; };
  return ult(passos.join("\n")) ?? (observado ? ult(observado) : null);
}

/** (b) A receita contra a lista medida. `undefined` = não se resolve por aqui; `null` = não abre detalhe (chega à lista). */
export function registroPelaLista(passos: string[], lista: LinhaMedida[], filtros: LinhaFiltrada[] = []): { registro: string | null | undefined; nota: string } {
  const texto = passos.join("\n");
  if (!ABRE_DETALHE.test(texto)) return { registro: null, nota: passos.length ? "a receita não abre detalhe (fica na lista)" : "receita vazia (a lista como carrega)" };
  const aba = /conclu[ií]d|#HISTORICO|hist[oó]rico/i.test(texto) ? "Concluídos" : /aba\s+["“']?agendar|#AGENDAR/i.test(texto) ? "Agendar" : "Tramitando";
  const botao = CALENDARIO.test(texto) ? "calendar" : "eye";
  const pag = /(?:a\.page|p[aá]gina)\s*["“']?(\d+)/i.exec(texto);
  const pagina = pag ? Number(pag[1]) : null;
  const daAba = lista.filter(l => l.aba === aba && l.botao === botao && l.registro);
  const porNome = daAba.filter(l => { const n = nomeDaLinha(l); return n && new RegExp(`${escapar(n)}(?![\\p{L}])`, "u").test(texto); })
    .filter(l => pagina === null || l.pagina === pagina);
  // o nome mais longo vence ("Pérola Veloz II" não casa "Pérola Veloz"), e tem de ser um registro só
  const maior = Math.max(0, ...porNome.map(l => nomeDaLinha(l).length));
  const nomes = [...new Set(porNome.filter(l => nomeDaLinha(l).length === maior).map(l => l.registro))];
  if (nomes.length === 1) return { registro: nomes[0], nota: `aba ${aba}, embarcação "${nomeDaLinha(porNome.find(l => l.registro === nomes[0])!)}"` };
  if (nomes.length > 1) return { registro: undefined, nota: `aba ${aba}: embarcação em ${nomes.length} registros` };
  const lin = /linha\s*(\d+)|tr:nth-child\((\d+)\)|(tr:first-child|primeira linha|1ª linha)/i.exec(texto);
  const linha = lin ? (lin[3] ? 1 : Number(lin[1] ?? lin[2])) : null;
  if (FILTRO.test(texto)) {
    // só o filtro Cidade foi medido: a opção tem de estar escrita na receita (a mais longa vence) e nenhum outro filtro
    const doFiltro = filtros.filter(f => f.aba === aba && /cidade/i.test(texto) && new RegExp(`${escapar(f.opcao)}(?![\\p{L}])`, "u").test(texto));
    const maiorOp = Math.max(0, ...doFiltro.map(f => f.opcao.length));
    const ops = [...new Set(doFiltro.filter(f => f.opcao.length === maiorOp).map(f => f.opcao))];
    if (ops.length !== 1 || /\b(?:Porto|Vistoriador|Status)\b\s*(?:>|:|['"“])/i.test(texto) || /busca|pesquis/i.test(texto) || linha === null)
      return { registro: undefined, nota: `aba ${aba} com filtro${ops.length === 1 ? ` Cidade=${ops[0]}` : ""}: não se resolve pela lista filtrada medida` };
    const f = doFiltro.find(x => x.opcao === ops[0] && x.pagina === (pagina ?? 1) && x.linha === linha);
    return f?.registro ? { registro: f.registro, nota: `aba ${aba}, filtro Cidade=${ops[0]}, página ${pagina ?? 1}, linha ${linha}` }
      : { registro: undefined, nota: `aba ${aba}, filtro Cidade=${ops[0]}: linha ${linha} fora da lista filtrada medida` };
  }
  if (linha === null) return { registro: undefined, nota: `aba ${aba}: linha não reconhecida` };
  const l = daAba.find(x => x.pagina === (pagina ?? 1) && x.linha === linha);
  return l ? { registro: l.registro, nota: `aba ${aba}, página ${pagina ?? 1}, linha ${linha}` } : { registro: undefined, nota: `aba ${aba}: página ${pagina ?? 1} linha ${linha} fora da lista medida` };
}

/** (c) O registro que a MEDIDA do juiz nomeia (o 1º 30NN da justificativa), no formato da rota. */
export function registroDaMedidaDoJuiz(justificativa: string, prefixo: string): string | null {
  const m = /\b(3\d{3})\b/.exec(justificativa);
  return m ? (prefixo + m[1]).toLowerCase() : null;
}

export function registroAlcancado(c: Pick<CartaoCego, "alegacao">, r: Pick<Resposta, "justificativa">, lista: LinhaMedida[], prefixo: string, filtros: LinhaFiltrada[] = []): RegistroAlcancado {
  const passos = c.alegacao.estado.passos, porFonte: RegistroAlcancado["porFonte"] = {};
  // A receita sai do detalhe para a rota de edição (botão "Editar" → editar-dados-vistoria/<registro>, outro componente):
  // o registro pode ser o mesmo, a rota não. Também quando a MEDIDA do juiz diz que a receita chegou à rota de edição.
  if (ROTA_DE_EDICAO.test(passos.join(" | ")) || /editar-dados-vistoria|rota de edi[cç][aã]o/i.test(r.justificativa))
    return { registro: null, fonte: "rota-fora-do-detalhe", porFonte, divergencia: false, nota: "a receita chega à rota de edição (editar-dados-vistoria), não ao detalhe" };
  const url = registroNaReceita(passos, c.alegacao.observado);
  if (url) porFonte["receita-url"] = url;
  const pl = registroPelaLista(passos, lista, filtros);
  if (pl.registro !== undefined && !url) {
    if (pl.registro === null) return { registro: null, fonte: "receita-sem-detalhe", porFonte, divergencia: false, nota: pl.nota };
    porFonte["lista-medida"] = pl.registro;
  } else if (pl.registro) porFonte["lista-medida"] = pl.registro;
  const juiz = registroDaMedidaDoJuiz(r.justificativa, prefixo);
  if (juiz) porFonte["medida-do-juiz"] = juiz;
  const fonte: FonteRegistro | null = url ? "receita-url" : porFonte["lista-medida"] ? "lista-medida" : juiz ? "medida-do-juiz" : null;
  const registro = fonte ? porFonte[fonte]! : null;
  // divergência só entre fontes da receita (a e b); a do juiz é conferência, e diverge só se a receita não resolveu
  const daReceita = [porFonte["receita-url"], porFonte["lista-medida"]].filter(Boolean);
  const divergencia = new Set(daReceita).size > 1;
  return { registro: divergencia ? null : registro, fonte: divergencia ? null : fonte, porFonte, divergencia, nota: pl.nota };
}

// ───────────────────────────────────────────── classificação de um cartão

export type Categoria =
  | "credito-pelo-dominio" | "dominio-nao-credita" | "fora-do-dominio" | "registro-nao-determinado" | "ambiguo" | "sem-marcador-de-registro"
  | "credito-fora-do-dominio" | "credito-dentro-do-dominio";
export interface Afetado {
  id: string; chave: string; trio: string; braco: string; categoria: Categoria; spec: string; registro: string | null; fonteRegistro: string | null;
  porFonte: RegistroAlcancado["porFonte"]; julgada: string | null; comDominio: string | null; motivo: string;
}
const MARCADOR_REGISTRO = /registro|template|parada|\brota\b|\b3\d{3}\b/i;

export function classificar(j: Julgamento, it: ItemChave, cartao: CartaoCego, ctx: ContextoDerivacao, specs: Map<string, SpecDeRegistro>,
  lista: LinhaMedida[], prefixo: string, filtros: LinhaFiltrada[] = []): { afetado: Afetado | null; derivadoDominio: Derivado | null } {
  const r = j.resposta, julgada = specDetectada(j.derivado);
  const trio = it.par.split("/")[0], base = { id: j.id, chave: j.chave, trio, braco: it.braco, julgada };
  const reg = () => registroAlcancado(cartao, r, lista, prefixo, filtros);
  const curto = (x: string | null) => (x ? x.slice(-4) : "—");
  // 3. crédito da passada numa spec de rota de registro: dentro ou fora do domínio (só listado)
  if (julgada && specs.has(julgada)) {
    const s = specs.get(julgada)!, a = reg(), cobre = registrosCobertos(s);
    const dentro = a.registro !== null && cobre.includes(a.registro);
    const motivo = a.fonte === "receita-sem-detalhe" || a.fonte === "rota-fora-do-detalhe" ? `credita ${julgada}, mas ${a.nota}`
      : a.registro === null ? `credita ${julgada}; registro alcançado não determinado${a.divergencia ? " (fontes divergem)" : ""}`
      : dentro ? `credita ${julgada} no registro ${curto(a.registro)}, dentro do domínio` : `credita ${julgada} no registro ${curto(a.registro)}, fora de ${cobre.map(curto).join(", ")}`;
    if (dentro && a.registro === s.registroDaParada) return { afetado: null, derivadoDominio: null };
    return { afetado: { ...base, categoria: dentro ? "credito-dentro-do-dominio" : "credito-fora-do-dominio", spec: julgada, registro: a.registro, fonteRegistro: a.fonte, porFonte: a.porFonte, comDominio: julgada, motivo }, derivadoDominio: null };
  }
  if (julgada || r.verdadeFactual !== "verdadeira" || r.vinculo !== "nenhum") return { afetado: null, derivadoDominio: null };
  // 2. recusa: spec de rota de registro nas candidatas e citada pelo juiz
  const citadas = new Set([...(r.evidencias ?? []), ...(r.justificativa.match(/\b[A-Z]-\d{2}\b/g) ?? [])]);
  const citadasDeRegistro = (cartao.candidatas ?? []).filter(s => specs.has(s) && citadas.has(s));
  if (!citadasDeRegistro.length) return { afetado: null, derivadoDominio: null };
  const a = reg();
  // receita que fica na lista não chega a registro; recusa no próprio registro da parada não é de identidade
  if (a.fonte === "receita-sem-detalhe" || a.fonte === "rota-fora-do-detalhe") return { afetado: null, derivadoDominio: null };
  const alvo = a.registro === null ? citadasDeRegistro : citadasDeRegistro.filter(s => specs.get(s)!.registroDaParada !== a.registro);
  if (!alvo.length) return { afetado: null, derivadoDominio: null };
  if (alvo.length > 1)
    return { afetado: { ...base, categoria: "ambiguo", spec: alvo.join("+"), registro: a.registro, fonteRegistro: a.fonte, porFonte: a.porFonte, comDominio: null, motivo: `mais de uma spec de rota de registro citada (${alvo.join(", ")})` }, derivadoDominio: null };
  const s = specs.get(alvo[0])!, cobre = registrosCobertos(s);
  const com = (categoria: Categoria, motivo: string, comDominio: string | null = null) =>
    ({ ...base, categoria, spec: s.id, registro: a.registro, fonteRegistro: a.fonte, porFonte: a.porFonte, comDominio, motivo });
  if (a.registro === null) return { afetado: com("registro-nao-determinado", a.divergencia ? `fontes da receita divergem (${JSON.stringify(a.porFonte)})` : `registro não determinado (${a.nota ?? "—"})`), derivadoDominio: null };
  if (a.registro === s.registroDaParada) return { afetado: null, derivadoDominio: null };
  if (!cobre.includes(a.registro)) return { afetado: com("fora-do-dominio", `registro ${curto(a.registro)} fora de ${s.id}.dominio (${cobre.map(curto).join(", ")}): recusa mantida`), derivadoDominio: null };
  if (!MARCADOR_REGISTRO.test(r.justificativa)) return { afetado: com("sem-marcador-de-registro", "a justificativa não recusa por registro (sem marcador): não muda"), derivadoDominio: null };
  const x = conferirLeitura(r, ctx, s.id, cartao.candidatas ?? []);
  if (x.erros.length) return { afetado: com("dominio-nao-credita", `com o vínculo ${s.id} a mesma resposta deriva ${x.derivado.classe} (${x.derivado.regraDaPolitica}): ${x.erros.join("; ")}`), derivadoDominio: x.derivado };
  return { afetado: com("credito-pelo-dominio", `registro ${curto(a.registro)} ∈ ${s.id}.dominio; a mesma resposta com o vínculo ${s.id} deriva ${x.derivado.classe} (${x.derivado.regraDaPolitica})`, s.id), derivadoDominio: x.derivado };
}

// ───────────────────────────────────────────── passada inteira

export interface Passada { dir: string; julgamentos: { politica: string; completo: boolean; julgamentos: Julgamento[] }; itens: Map<string, ItemChave>;
  cartoes: Map<string, { c: CartaoCego; specs: string[] }>; entradas: Record<string, string> }

export function lerPassada(dir: string): Passada {
  const ler = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");
  const entradas: Record<string, string> = {};
  const jAbs = join(dir, "julgamentos.json"), cAbs = join(dir, "chave", "fila-t3-chave.json"), mAbs = join(dir, "lotes", "manifesto.json");
  for (const p of [jAbs, cAbs, mAbs]) entradas[basename(dir) + "/" + p.slice(dir.length + 1).replace(/\\/g, "/")] = sha(readFileSync(p));
  const julgamentos = JSON.parse(ler(jAbs));
  if (!julgamentos.completo) throw new Error(`${dir}: julgamentos.json incompleto`);
  const itens = new Map((JSON.parse(ler(cAbs)) as { itens: ItemChave[] }).itens.map(i => [i.chave, i]));
  const man = JSON.parse(ler(mAbs)) as { lotes: { lote: string; sha256: string }[] };
  const cartoes = new Map<string, { c: CartaoCego; specs: string[] }>();
  for (const ml of man.lotes) {
    const txt = ler(join(dir, "lotes", `${ml.lote}.json`));
    if (sha(txt) !== ml.sha256) throw new Error(`${dir}: lotes/${ml.lote}.json difere do manifesto (sha256)`);
    const l = JSON.parse(txt) as { referencias: Record<string, { defeitos: { id: string }[] }>; cartoes: CartaoCego[] };
    for (const c of l.cartoes) cartoes.set(c.id, { c, specs: l.referencias[c.tela].defeitos.map(d => d.id) });
  }
  return { dir, julgamentos, itens, cartoes, entradas };
}

export interface Contagem { trio: string; braco: string; julgada: string[]; comDominio: string[]; comDominioEstrita: string[] }
export interface Reconta {
  formato: string; aviso: string; politica: string; referencia: { versao: string; sha256: string }; medicao: { sha256: string } | null;
  specsDeRegistro: { id: string; estado: string; registroDaParada: string; registros: string[]; dominioDeclarado: boolean }[];
  contagens: Contagem[]; afetados: Afetado[]; entradas: Record<string, string>;
}

export function recontar(p: Passada, ref: RefComDominio, lista: LinhaMedida[], o: { refSha: string; medicaoSha: string | null; filtros?: LinhaFiltrada[] }): { reconta: Reconta; julgamentosDominio: unknown } {
  const specs = specsDeRegistro(ref);
  const politica = versaoDaPolitica(p.julgamentos.politica);
  const prefixo = (() => { const r = [...specs.values()][0]?.registroDaParada; return r ? r.replace(/\d{4}$/, "") : ""; })();
  const afetados: Afetado[] = [];
  const saida: unknown[] = [];
  const porCartao = new Map<string, { julgada: string | null; comDominio: string | null; estrita: string | null }>();
  for (const j of p.julgamentos.julgamentos) {
    const it = p.itens.get(j.chave), x = it ? p.cartoes.get(it.id) : undefined;
    if (!it || !x) throw new Error(`cartão ${j.chave} fora da chave ou dos lotes`);
    const ctx = contextoDe(x.c, it, x.specs, politica);
    const { afetado, derivadoDominio } = classificar(j, it, x.c, ctx, specs, lista, prefixo, o.filtros ?? []);
    const julgada = specDetectada(j.derivado);
    const comDominio = afetado?.categoria === "credito-pelo-dominio" ? afetado.comDominio : julgada;
    const estrita = afetado?.categoria === "credito-fora-do-dominio" ? null : comDominio;
    porCartao.set(j.chave, { julgada, comDominio, estrita });
    if (afetado) afetados.push(afetado);
    saida.push({ id: j.id, chave: j.chave, resposta: j.resposta, derivado: j.derivado,
      ...(afetado ? { dominio: { categoria: afetado.categoria, spec: afetado.spec, registro: afetado.registro, fonteRegistro: afetado.fonteRegistro, motivo: afetado.motivo,
        ...(derivadoDominio ? { derivadoComOVinculo: derivadoDominio } : {}) } } : {}),
      creditoJulgado: julgada, creditoComDominio: comDominio });
  }
  const grupos = new Map<string, Contagem>();
  for (const j of p.julgamentos.julgamentos) {
    const it = p.itens.get(j.chave)!, k = `${it.par.split("/")[0]}|${it.braco}`, c = porCartao.get(j.chave)!;
    const g = grupos.get(k) ?? { trio: it.par.split("/")[0], braco: it.braco, julgada: [], comDominio: [], comDominioEstrita: [] };
    if (c.julgada) g.julgada.push(c.julgada);
    if (c.comDominio) g.comDominio.push(c.comDominio);
    if (c.estrita) g.comDominioEstrita.push(c.estrita);
    grupos.set(k, g);
  }
  const contagens = [...grupos.values()].map(g => ({ ...g, julgada: unicos(g.julgada), comDominio: unicos(g.comDominio), comDominioEstrita: unicos(g.comDominioEstrita) }))
    .sort((a, b) => a.trio.localeCompare(b.trio) || ORDEM(a.braco) - ORDEM(b.braco));
  const reconta: Reconta = {
    formato: RECONTA_VERSAO,
    aviso: "reconta mecânica, sem novo julgamento: as respostas são as da 1ª passada; só o vínculo de cartões recusados por registro dentro do domínio declarado é trocado e re-derivado pela mesma política",
    politica: p.julgamentos.politica, referencia: { versao: ref._meta.version, sha256: o.refSha }, medicao: o.medicaoSha ? { sha256: o.medicaoSha } : null,
    specsDeRegistro: [...specs.values()].map(s => ({ id: s.id, estado: s.estado, registroDaParada: s.registroDaParada, registros: registrosCobertos(s), dominioDeclarado: !!s.dominio })),
    contagens, afetados: afetados.sort((a, b) => a.trio.localeCompare(b.trio) || ORDEM(a.braco) - ORDEM(b.braco) || a.spec.localeCompare(b.spec) || a.id.localeCompare(b.id)), entradas: p.entradas,
  };
  return { reconta, julgamentosDominio: { formato: RECONTA_VERSAO + "/julgamentos", politica: p.julgamentos.politica, passada: basename(p.dir), julgamentos: saida } };
}
const BRACOS = ["sem", "ferramentas", "com", "lb-axe", "lb-validator"];
const ORDEM = (b: string) => { const i = BRACOS.indexOf(b); return i < 0 ? 99 : i; };
const mediana = (xs: number[]) => { const o = [...xs].sort((x, y) => x - y), n = o.length; return n ? (n % 2 ? o[(n - 1) / 2] : (o[n / 2 - 1] + o[n / 2]) / 2) : null; };

export function recontaMd(r: Reconta, titulo: string): string {
  const bracos = [...new Set(r.contagens.map(c => c.braco))].sort((a, b) => ORDEM(a) - ORDEM(b));
  const trios = [...new Set(r.contagens.map(c => c.trio))].sort();
  const g = (t: string, b: string) => r.contagens.find(c => c.trio === t && c.braco === b);
  const dif = (a: string[], b: string[]) => b.filter(x => !a.includes(x));
  const cats: Categoria[] = ["credito-pelo-dominio", "dominio-nao-credita", "fora-do-dominio", "registro-nao-determinado", "ambiguo", "sem-marcador-de-registro", "credito-fora-do-dominio", "credito-dentro-do-dominio"];
  return [
    `# ${titulo}`, "",
    `Reconta mecânica (D-168), sem novo julgamento. Política \`${r.politica}\`; referência ${r.referencia.versao} (sha256 \`${r.referencia.sha256.slice(0, 12)}…\`)${r.medicao ? `; medição \`${r.medicao.sha256.slice(0, 12)}…\`` : ""}.`,
    "**julgada** = a detecção da 1ª passada (`specDetectada`). **com domínio** = a julgada mais os cartões recusados só pelo registro cujo registro alcançado está no `dominio` declarado da spec, re-derivados pela mesma política com só o vínculo trocado. **estrita** (sensibilidade) = com domínio sem os créditos da passada em registro fora do domínio.", "",
    "## Specs de rota de registro e domínio", "",
    "| spec | parada | registro da parada | registros cobertos | domínio declarado |", "|---|---|---|---|---|",
    ...r.specsDeRegistro.map(s => `| ${s.id} | ${s.estado} | ${s.registroDaParada.slice(-4)} | ${s.registros.map(x => x.slice(-4)).join(", ")} | ${s.dominioDeclarado ? "sim" : "não (só a parada)"} |`), "",
    "## Detecção por braço e trio", "",
    "| braço | trio | julgada | com domínio | estrita | specs a mais (domínio) | fora do domínio (estrita tira) |", "|---|---|---|---|---|---|---|",
    ...bracos.flatMap(b => trios.map(t => { const c = g(t, b); if (!c) return `| ${b} | ${t} | — | — | — | | |`;
      return `| ${b} | ${t} | ${c.julgada.length} | **${c.comDominio.length}** | ${c.comDominioEstrita.length} | ${dif(c.julgada, c.comDominio).join(", ") || "—"} | ${dif(c.comDominioEstrita, c.comDominio).join(", ") || "—"} |`; })),
    ...bracos.map(b => { const cs = trios.map(t => g(t, b)).filter((x): x is Contagem => !!x);
      return `| **${b}** | mediana | ${mediana(cs.map(c => c.julgada.length))} | **${mediana(cs.map(c => c.comDominio.length))}** | ${mediana(cs.map(c => c.comDominioEstrita.length))} | | |`; }), "",
    "## Cartões afetados", "",
    ...cats.map(k => `- ${k}: ${r.afetados.filter(a => a.categoria === k).length}`), "",
    "| cartão | trio | braço | categoria | spec | registro | fonte do registro | julgada | com domínio | motivo |", "|---|---|---|---|---|---|---|---|---|---|",
    ...r.afetados.map(a => `| ${a.id} | ${a.trio} | ${a.braco} | ${a.categoria} | ${a.spec} | ${a.registro?.slice(-4) ?? "—"} | ${a.fonteRegistro ?? "—"}${Object.keys(a.porFonte).length > 1 ? ` (${Object.entries(a.porFonte).map(([f, v]) => `${f}=${v?.slice(-4)}`).join(", ")})` : ""} | ${a.julgada ?? "—"} | ${a.comDominio ?? "—"} | ${a.motivo.replace(/\|/g, "/")} |`), "",
  ].join("\n");
}

/** Confere a coluna julgada contra a tabela de detecção publicada da passada (`resumo.json` da pasta de detecção). */
export function conferirJulgada(r: Reconta, deteccaoDir: string): string[] {
  const resumo = JSON.parse(readFileSync(join(deteccaoDir, "resumo.json"), "utf8")) as { porAnalise: { analise: string; porBraco: Record<string, { deteccao: number } | null> }[] };
  const erros: string[] = [];
  for (const a of resumo.porAnalise) for (const [b, x] of Object.entries(a.porBraco)) {
    const c = r.contagens.find(k => k.trio === a.analise.split("/")[0] && k.braco === b);
    if (x && (c?.julgada.length ?? 0) !== x.deteccao) erros.push(`${a.analise} ${b}: publicada ${x.deteccao}, recontada ${c?.julgada.length ?? 0}`);
  }
  return erros;
}

if (process.argv[1] && /(?:^|[\\/])recontar-dominio\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const passada = val("--passada"), refArq = val("--referencia"), med = val("--medicao"), saida = val("--saida"), det = val("--deteccao");
  if (!passada || !refArq || !med || !saida) { console.error("Uso: --passada PASTA --referencia ARQ --medicao ARQ --saida PASTA_NOVA [--deteccao PASTA]"); process.exit(1); }
  if (existsSync(saida) && readdirSync(saida).length) { console.error(`${saida} já existe e não está vazia (derivado novo = pasta nova; a passada nunca é sobrescrita)`); process.exit(1); }
  if (resolve(saida).startsWith(resolve(passada))) { console.error("--saida não pode ficar dentro da passada"); process.exit(1); }
  const refTxt = readFileSync(refArq), medTxt = readFileSync(med);
  const ref = JSON.parse(refTxt.toString("utf8")) as RefComDominio;
  const medicao = JSON.parse(medTxt.toString("utf8")) as { formato: string; lista: LinhaMedida[]; filtros?: LinhaFiltrada[] };
  if (!/^d168-medicao-dominio-/.test(medicao.formato)) { console.error(`${med}: não é medição de domínio (${medicao.formato})`); process.exit(1); }
  const p = lerPassada(resolve(passada));
  const { reconta, julgamentosDominio } = recontar(p, ref, medicao.lista, { refSha: sha(refTxt), medicaoSha: sha(medTxt), filtros: medicao.filtros ?? [] });
  reconta.entradas[`referencia:${basename(refArq)}`] = sha(refTxt);
  reconta.entradas[`medicao:${basename(med)}`] = sha(medTxt);
  if (det) {
    const erros = conferirJulgada(reconta, det);
    if (erros.length) { console.error(`a coluna julgada não reproduz a detecção publicada:\n  ${erros.join("\n  ")}`); process.exit(1); }
    reconta.entradas[`deteccao:${basename(det)}/resumo.json`] = sha(readFileSync(join(det, "resumo.json")));
  }
  const titulo = `Reconta sob o domínio declarado — ${basename(resolve(passada, ".."))}/${basename(resolve(passada))}`;
  gravar(saida, "julgamentos-dominio.json", jsonTexto(julgamentosDominio));
  gravar(saida, "reconta.json", jsonTexto(reconta));
  gravar(saida, "reconta.md", recontaMd(reconta, titulo));
  for (const c of reconta.contagens) console.log(`${c.trio} ${c.braco}: julgada ${c.julgada.length} · com domínio ${c.comDominio.length} · estrita ${c.comDominioEstrita.length}`);
  console.log(`afetados ${reconta.afetados.length}: ${[...new Set(reconta.afetados.map(x => x.categoria))].map(k => `${k} ${reconta.afetados.filter(x => x.categoria === k).length}`).join(" · ")}`);
}
