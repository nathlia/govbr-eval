/**
 * E14 passo 1 (plano NAT-74 §6.6): extrai a fila T3 exata do derivado e monta a vista cega de cada átomo.
 *
 * Extração: a trilha da variante principal (`trilha/trilha-atomos.json`, tratamento T3) é a fonte; o total e as
 * contagens por campanha × braço e por motivo têm de bater com `fila-t3/filas-e6.json` — senão para.
 * Vista cega: o que o juiz precisa e nada mais (alegação, norma citada, defeitos candidatos, fatos já medidos na
 * página congelada, perguntas). Ficam fora: braço, runId, campanha, modelo, ids de sessão de ferramenta, notas,
 * decisão e justificativa arquivadas, o motivo da triagem (denunciaria a decisão arquivada) e o autor do cartão.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { sha256Tree } from "../collection-manifest";
import { EVAL, NAT73, TCC, lerJson, ordenar, relTcc, sha, shaArquivo, unicos, type ParLido } from "./comum";
import { inventarioDeAtomos, type AtomoArquivado, type Inventario } from "./e1";
import { normalizarRegra } from "./politica";
import {
  DERIVADO, PERGUNTAS, evidenciaOmitida, hashDaChave, idOpaco, mascarar,
  type CartaoCego, type FatoMedido, type ItemChave, type NormaVista, type TipoT3,
} from "./e14-comum";

const req = createRequire(import.meta.url);
/** Sujeitos listados por cartão na vista cega (os demais são contados em `sujeitosNaoListados`). */
export const MAX_SUJEITOS = 12;
type Card = ParLido["pkg"]["cards"][number];

export interface LinhaTrilha {
  chave: string; campanha: string; tela: "A" | "B"; par: string; braco: string; runId: string; cardIdOriginal: string; atomoId: string; cardSha256: string;
  mId: string | null; sujeitos: string; regraCitada: string | null; decisaoAntiga: string; unidadesAntigas: string; verdadeFactual: string | null;
  normaId: string | null; normaForca: string | null; normaAplicabilidade: string | null; normaViolada: string | null;
  origemMedida341: string | null; origemMedida370: string | null; qualidadeDaSugestao: string | null; juiz: string; tratamento: string; motivo: string; variante: string;
}
interface FilasE6 { porCampanhaBraco: Record<string, Record<string, { T3: number }>>; motivos: { motivo: string; n: number }[] }

const MOTIVO_QUALIDADE = "qualidadeDaSugestao a julgar (T3, P13)";
const MOTIVO_INVENTARIO = "caso material do inventário sem veredito novo (P7)";
const MOTIVOS_CITACAO = [
  "regra obrigatória diferente da da unidade: aplicabilidade a julgar (T3)",
  "a unidade não declara regra: aplicabilidade da citada não decidível por tabela",
  "regra citada fora das tabelas (v1, checker, axe): incerta (T3)",
];

/** Tipo do átomo pela linha da trilha (o motivo da triagem E6). */
export function tipoDaLinha(l: Pick<LinhaTrilha, "juiz" | "qualidadeDaSugestao" | "motivo">): { tipo: TipoT3; motivoFila: string } {
  if (l.juiz !== "pendente" && l.qualidadeDaSugestao === "pendente") return { tipo: "qualidade", motivoFila: MOTIVO_QUALIDADE };
  if (l.motivo === "inventário sem veredito novo") return { tipo: "inventario", motivoFila: MOTIVO_INVENTARIO };
  if (/^família .*a julgar \(T3\)$/.test(l.motivo)) return { tipo: "sensivel", motivoFila: l.motivo };
  // [1.1.0] T2 que a medida não fechou e T3 que o juiz deixou indeterminado: mesmas perguntas da família sensível.
  if (/^(T2: a medida não fecha|T3 indeterminado: ).*\(T3\)$/.test(l.motivo)) return { tipo: "sensivel", motivoFila: l.motivo };
  if (MOTIVOS_CITACAO.includes(l.motivo)) return { tipo: "citacao", motivoFila: l.motivo };
  throw new Error(`E14: motivo T3 desconhecido: ${l.motivo}`);
}

export interface Extracao {
  itens: (ItemChave & { linha: LinhaTrilha; atomo: AtomoArquivado })[];
  porCampanhaBraco: Record<string, Record<string, number>>;
  porMotivo: Record<string, number>;
  diferencas: string[];
  fontes: Record<string, string>;
  inv: Inventario;
}

/** Extrai a fila T3 da trilha principal e confere contra filas-e6.json. `diferencas` não vazia = parar. */
export function extrairFila(raiz = DERIVADO, inv: Inventario = inventarioDeAtomos()): Extracao {
  const trilhaAbs = join(raiz, "trilha", "trilha-atomos.json"), filasAbs = join(raiz, "fila-t3", "filas-e6.json");
  const trilha = lerJson<{ variante: string; linhas: LinhaTrilha[] }>(trilhaAbs);
  const filas = lerJson<FilasE6>(filasAbs);
  const diferencas: string[] = [];
  if (inv.diferencas.length) diferencas.push(...inv.diferencas.map(d => `E1: ${d}`));
  if (trilha.variante !== "principal") diferencas.push(`trilha-atomos.json não é a variante principal (${trilha.variante})`);
  const linhas = trilha.linhas.filter(l => l.variante === "principal" && l.tratamento === "T3");
  const porChave = new Map<string, LinhaTrilha>();
  for (const l of linhas) { if (porChave.has(l.chave)) diferencas.push(`átomo T3 com mais de uma parte na trilha: ${l.chave}`); porChave.set(l.chave, l); }
  const atomos = new Map(inv.atomos.map(a => [a.chave, a]));
  const itens: Extracao["itens"] = [];
  const porCampanhaBraco: Record<string, Record<string, number>> = {};
  const porMotivo: Record<string, number> = {};
  for (const l of porChave.values()) {
    const a = atomos.get(l.chave);
    if (!a) { diferencas.push(`chave da trilha sem átomo arquivado: ${l.chave}`); continue; }
    if (a.cardSha256 !== l.cardSha256) diferencas.push(`cardSha256 diverge: ${l.chave}`);
    const { tipo, motivoFila } = tipoDaLinha(l);
    const b = (porCampanhaBraco[l.campanha] ??= {}); b[l.braco] = (b[l.braco] ?? 0) + 1;
    porMotivo[motivoFila] = (porMotivo[motivoFila] ?? 0) + 1;
    itens.push({ id: idOpaco(l.chave), hash: hashDaChave(l.chave), chave: l.chave, campanha: l.campanha, tela: l.tela, par: l.par, braco: l.braco, runId: l.runId,
      cardIdOriginal: l.cardIdOriginal, atomoId: l.atomoId, cardSha256: l.cardSha256, mId: l.mId, tipo, motivoFila, decisaoAntiga: l.decisaoAntiga,
      unidadesAntigas: l.unidadesAntigas, origemMedida341: l.origemMedida341, origemMedida370: l.origemMedida370, lote: null, linha: l, atomo: a });
  }
  // Conferência contra a saída intermediária do E6.
  let esperado = 0;
  for (const [c, bs] of Object.entries(filas.porCampanhaBraco)) for (const [b, f] of Object.entries(bs)) {
    esperado += f.T3;
    if ((porCampanhaBraco[c]?.[b] ?? 0) !== f.T3) diferencas.push(`T3 ${c}/${b}: trilha ${porCampanhaBraco[c]?.[b] ?? 0} ≠ filas-e6 ${f.T3}`);
  }
  for (const [c, bs] of Object.entries(porCampanhaBraco)) for (const b of Object.keys(bs)) if (!filas.porCampanhaBraco[c]?.[b]) diferencas.push(`T3 ${c}/${b} fora de filas-e6`);
  if (itens.length !== esperado) diferencas.push(`T3: ${itens.length} átomos na trilha ≠ ${esperado} em filas-e6`);
  const motivosE6 = Object.fromEntries(filas.motivos.filter(m => m.motivo.startsWith("T3: ")).map(m => [m.motivo.slice(4), m.n]));
  for (const k of unicos([...Object.keys(motivosE6), ...Object.keys(porMotivo)])) if ((motivosE6[k] ?? 0) !== (porMotivo[k] ?? 0)) diferencas.push(`motivo "${k}": trilha ${porMotivo[k] ?? 0} ≠ filas-e6 ${motivosE6[k] ?? 0}`);
  const ids = new Set(itens.map(i => i.id));
  if (ids.size !== itens.length) diferencas.push("colisão de id opaco (prefixo de 10 hex)");
  return { itens: ordenar(itens, i => i.hash), porCampanhaBraco, porMotivo, diferencas, inv,
    fontes: { [relTcc(trilhaAbs)]: shaArquivo(trilhaAbs), [relTcc(filasAbs)]: shaArquivo(filasAbs) } };
}

// ───────────────────────────────────────────────────────────────── normas (texto para o juiz)

interface Kb { id: string; title: string; normalizedRule: string; force: string }
const FORCA_KB: Record<string, string> = { required: "obrigatorio", recommended: "recomendado", optional: "opcional", example: "exemplo" };

export interface Normas { resolver: (id: string | null) => NormaVista | null; fontes: Record<string, string> }

export function normas(): Normas {
  const val = join(TCC, "govbr-ds-validator", "data");
  const wcagAbs = join(val, "wcag-2.2.json"), emagAbs = join(val, "emag.json");
  const kbAbs = join(val, "knowledge", "versions", "3.7.0", "normalized", "rules.jsonl");
  const chkAbs = join(EVAL, "checker-aliases.json");
  const wcag = new Map(lerJson<{ criteria: { num: string; handle: string; level: string }[] }>(wcagAbs).criteria.map(c => [c.num, c]));
  const emag = new Map(Object.values(lerJson<{ sections: Record<string, { title: string; rules: { id: string; title: string; description: string }[] }> }>(emagAbs).sections)
    .flatMap(s => s.rules.map(r => [r.id, { ...r, secao: s.title }] as const)));
  const kb = new Map(readFileSync(kbAbs, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l) as Kb).map(k => [k.id, k]));
  const checks = lerJson<{ checks: { matches: string; aliases: string[]; generic: string[]; basis: string }[] }>(chkAbs).checks;
  const axe = req("axe-core") as { version: string; getRules: () => { ruleId: string; description: string; help: string; tags: string[] }[] };
  const axeRegras = new Map(axe.getRules().map(r => [r.ruleId, r]));
  const glob = (m: string) => new RegExp("^" + m.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+") + "$");
  const daBase = (id: string) => { const k = kb.get(id); return k ? { titulo: mascarar(k.title), texto: mascarar(k.normalizedRule), forcaDeclarada: FORCA_KB[k.force] ?? k.force } : null; };
  const resolver = (bruto: string | null): NormaVista | null => {
    if (bruto === null) return null;
    const n = normalizarRegra(bruto);
    let m = /^wcag:(\d+\.\d+\.\d+)$/.exec(n);
    if (m) { const c = wcag.get(m[1]); return { id: `wcag:${m[1]}`, fonte: "WCAG 2.2", titulo: c?.handle ?? null, texto: null, nivel: c?.level ?? null }; }
    m = /^emag:(\d+\.\d+)$/.exec(n);
    if (m) { const r = emag.get(m[1]); return { id: `emag:${m[1]}`, fonte: "e-MAG 3.1", titulo: r?.title ?? null, texto: r?.description ?? null }; }
    const axeId = n.replace(/^axe:/, "");
    if (axeRegras.has(axeId) && (n.startsWith("axe:") || !/:/.test(n))) {
      const r = axeRegras.get(axeId)!;
      return { id: `axe:${axeId}`, fonte: `axe-core ${axe.version}`, titulo: r.help, texto: r.description, etiquetas: [...r.tags].sort(),
        forcaDeclarada: r.tags.includes("best-practice") && !r.tags.some(t => /^wcag\d{3,}$/.test(t)) ? "boa-pratica" : null };
    }
    const kbId = n.replace(/^ds:(?=govbr-)/, "");
    if (kb.has(kbId)) return { id: mascarar(kbId), fonte: "base de regras do DS (id mascarado, D-87)", titulo: null, texto: null, regrasDaBase: [daBase(kbId)!] };
    const chk = checks.find(c => n === c.matches || glob(c.matches).test(n));
    if (chk) return { id: mascarar(n), fonte: "base de regras do DS (id mascarado, D-87)", titulo: null, texto: mascarar(chk.basis),
      regrasDaBase: [...chk.aliases, ...chk.generic].map(daBase).filter((x): x is NonNullable<typeof x> => !!x) };
    return { id: mascarar(n), fonte: /^ds:/.test(n) ? "base de regras do DS (id mascarado, D-87); texto não localizado" : "não localizada", titulo: null, texto: null };
  };
  return { resolver, fontes: { [relTcc(wcagAbs)]: shaArquivo(wcagAbs), [relTcc(emagAbs)]: shaArquivo(emagAbs), [relTcc(kbAbs)]: shaArquivo(kbAbs),
    [relTcc(chkAbs)]: shaArquivo(chkAbs), [`axe-core@${axe.version}`]: sha(JSON.stringify([...axeRegras.keys()].sort())) } };
}

// ───────────────────────────────────────────────────────────────── normas da campanha nova (1b, achado H)

/** Força declarada na base literal (validator ≥ 2.12.0, D-124) → rótulo da vista cega. Informativo: o juiz decide `norma.forca`. */
const FORCA_LITERAL: Record<string, string> = { required: "obrigatorio", prohibited: "obrigatorio (proibição)", recommended: "recomendado",
  discouraged: "recomendado (desaconselha)", permitted: "permitido (opcional)", optional: "opcional", example: "exemplo", informative: "informativo",
  unclear: "não declarada" };

/**
 * [M, 1.2.0; decisão do assistente com registro] Correspondência FIXA força da base literal → vocabulário de `norma.forca`
 * do juiz, feita só pelas palavras da própria base (e pela faixa de obrigação do validador, `obligationOf`:
 * required/prohibited = mandatory, recommended/discouraged = advisory, permitted = permissive). Não cria regra de crédito:
 * o juiz continua respondendo `norma.forca`, e a classe sai pela mesma derivação. `null` = sem correspondência (o juiz
 * decide pela leitura do texto; não se adivinha): `informative` (texto descritivo, não é regra) e `unclear` (a base não
 * declara força).
 */
export const FORCA_NO_VOCABULARIO: Readonly<Record<string, string | null>> = {
  required: "obrigatorio", prohibited: "obrigatorio", recommended: "recomendado", discouraged: "recomendado",
  permitted: "nenhuma", optional: "nenhuma", example: "exemplo", informative: null, unclear: null,
};
/** Linhas da tabela (rótulo que o cartão mostra → valor no vocabulário), na ordem acima: o LEIAME imprime esta lista. */
export const TABELA_FORCAS: readonly { literal: string; rotulo: string; vocabulario: string | null }[] =
  Object.entries(FORCA_NO_VOCABULARIO).map(([literal, vocabulario]) => ({ literal, rotulo: FORCA_LITERAL[literal] ?? literal, vocabulario }));
const regraVista = (k: Kb) => ({ titulo: mascarar(k.title), texto: mascarar(k.normalizedRule), forcaDeclarada: FORCA_LITERAL[k.force] ?? k.force,
  forcaNoVocabulario: FORCA_NO_VOCABULARIO[k.force] ?? null });

export interface OraculoDaCampanha { dataSha256: string; validador: string; /** só testes; padrão govbr-eval/checker-aliases.json */ checkerAliases?: string }

/**
 * [1b, achado H] Normas para a primeira passada de campanha nova: o texto das regras do DS vem da base que o oráculo DA
 * CAMPANHA carrega, não da base antiga (186 regras) da reanálise T7. A base é identificada pela árvore `data/` do
 * validador, conferida contra o `dataSha256` fixado na campanha (diverge → para), e pela `activeVersion` de
 * `data/knowledge/manifest.json`. Do validador só se leem arquivos de `data/` (nunca `src/`). Id de verificação
 * automática (ds:token-*, ds:page-*) passa por `govbr-eval/checker-aliases.json` (como no histórico) até os ids de regra,
 * e o texto deles sai da mesma base da campanha (decisão do coordenador, 19/10). `emag-N.N` (forma em que o validador cita o e-MAG) é lido como `emag:N.N`. Máscara D-87 igual.
 */
export function normasDaCampanha(o: OraculoDaCampanha): Normas {
  const val = join(o.validador, "data");
  const arvore = sha256Tree(val)?.sha256 ?? null;
  if (arvore !== o.dataSha256) throw new Error(`E14 campanha: data/ do validador em ${o.validador} (${arvore?.slice(0, 12) ?? "ausente"}) não é a do oráculo da campanha (${o.dataSha256.slice(0, 12)}); aponte --validador para um checkout com essa data/`);
  const wcagAbs = join(val, "wcag-2.2.json"), emagAbs = join(val, "emag.json"), manAbs = join(val, "knowledge", "manifest.json");
  const versao = lerJson<{ activeVersion?: string }>(manAbs).activeVersion;
  if (!versao) throw new Error(`E14 campanha: ${relTcc(manAbs)} sem activeVersion`);
  const norm = join(val, "knowledge", "versions", versao, "normalized");
  const regrasAbs = join(norm, "rules.jsonl"), herdadasAbs = join(norm, "carried-over.jsonl"), legadoAbs = join(norm, "legacy-ids.json");
  if (!existsSync(regrasAbs)) throw new Error(`E14 campanha: base ativa sem ${relTcc(regrasAbs)}`);
  const jsonl = (p: string) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(l => l.trim()).map(l => JSON.parse(l) as Kb) : []);
  const kb = new Map<string, { k: Kb; tipo: string }>();
  for (const k of jsonl(regrasAbs)) kb.set(k.id, { k, tipo: "texto literal" });
  for (const k of jsonl(herdadasAbs)) if (!kb.has(k.id)) kb.set(k.id, { k, tipo: "excerto herdado da base anterior" });
  if (existsSync(legadoAbs)) for (const e of lerJson<{ entries: { id: string; record?: Kb }[] }>(legadoAbs).entries)
    if (e.record && !kb.has(e.id)) kb.set(e.id, { k: e.record, tipo: "id antigo, fora do contexto normativo da base" });
  // [M] Força que a tabela fixa não conhece → para (nunca cai calada em "sem correspondência").
  const novas = [...new Set([...kb.values()].map(x => x.k.force))].filter(f => !(f in FORCA_NO_VOCABULARIO));
  if (novas.length) throw new Error(`E14 campanha: força(s) da base fora da tabela FORCA_NO_VOCABULARIO: ${novas.join(", ")}`);
  const wcag = new Map(lerJson<{ criteria: { num: string; handle: string; level: string }[] }>(wcagAbs).criteria.map(c => [c.num, c]));
  const emag = new Map(Object.values(lerJson<{ sections: Record<string, { title: string; rules: { id: string; title: string; description: string }[] }> }>(emagAbs).sections)
    .flatMap(s => s.rules.map(r => [r.id, { ...r, secao: s.title }] as const)));
  const axe = req("axe-core") as { version: string; getRules: () => { ruleId: string; description: string; help: string; tags: string[] }[] };
  const axeRegras = new Map(axe.getRules().map(r => [r.ruleId, r]));
  const dsVersao = versao.replace(/-literal.*$/, "");
  const chkAbs = o.checkerAliases ?? join(EVAL, "checker-aliases.json");
  const checks = lerJson<{ checks: { matches: string; aliases: string[]; generic: string[]; basis: string }[] }>(chkAbs).checks;
  const glob = (m: string) => new RegExp("^" + m.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+") + "$");
  const resolver = (bruto: string | null): NormaVista | null => {
    if (bruto === null) return null;
    const n = normalizarRegra(bruto).replace(/^emag-(\d+\.\d+)$/, "emag:$1");
    let m = /^wcag:(\d+\.\d+\.\d+)$/.exec(n);
    if (m) { const c = wcag.get(m[1]); return { id: `wcag:${m[1]}`, fonte: "WCAG 2.2", titulo: c?.handle ?? null, texto: null, nivel: c?.level ?? null }; }
    m = /^emag:(\d+\.\d+)$/.exec(n);
    if (m) { const r = emag.get(m[1]); return { id: `emag:${m[1]}`, fonte: "e-MAG 3.1", titulo: r?.title ?? null, texto: r?.description ?? null }; }
    const axeId = n.replace(/^axe:/, "");
    if (axeRegras.has(axeId) && (n.startsWith("axe:") || !/:/.test(n))) {
      const r = axeRegras.get(axeId)!;
      return { id: `axe:${axeId}`, fonte: `axe-core ${axe.version}`, titulo: r.help, texto: r.description, etiquetas: [...r.tags].sort(),
        forcaDeclarada: r.tags.includes("best-practice") && !r.tags.some(t => /^wcag\d{3,}$/.test(t)) ? "boa-pratica" : null };
    }
    const kbId = n.replace(/^ds:(?=govbr-)/, "");
    const x = kb.get(kbId);
    if (x) return { id: mascarar(kbId), fonte: `base de regras do DS ${dsVersao} (${x.tipo}; id mascarado, D-87)`, titulo: null, texto: null,
      regrasDaBase: [regraVista(x.k)] };
    // [1b, decisão do coordenador] Id de verificação (ds:token-*, ds:page-*): checker-aliases.json (do govbr-eval, como no
    // histórico) dá os ids de regra; o texto vem da base que o oráculo da campanha carrega (literal, herdada ou id antigo).
    const chk = checks.find(c => n === c.matches || glob(c.matches).test(n));
    if (chk) {
      const rs = [...chk.aliases, ...chk.generic].map(id => kb.get(id)).filter((y): y is NonNullable<typeof y> => !!y);
      return { id: mascarar(n), fonte: `base de regras do DS ${dsVersao} (id mascarado, D-87)`, titulo: null, texto: mascarar(chk.basis),
        regrasDaBase: rs.map(y => regraVista(y.k)) };
    }
    return { id: mascarar(n), fonte: /^ds:/.test(n) ? "base de regras do DS (id mascarado, D-87); texto não localizado" : "não localizada", titulo: null, texto: null };
  };
  const fontes: Record<string, string> = { [`${relTcc(val)} (árvore; = dataSha256 do oráculo da campanha)`]: arvore,
    [relTcc(manAbs)]: shaArquivo(manAbs), [relTcc(regrasAbs)]: shaArquivo(regrasAbs) };
  if (existsSync(herdadasAbs)) fontes[relTcc(herdadasAbs)] = shaArquivo(herdadasAbs);
  if (existsSync(legadoAbs)) fontes[relTcc(legadoAbs)] = shaArquivo(legadoAbs);
  Object.assign(fontes, { [relTcc(chkAbs)]: shaArquivo(chkAbs), [relTcc(wcagAbs)]: shaArquivo(wcagAbs), [relTcc(emagAbs)]: shaArquivo(emagAbs),
    [`axe-core@${axe.version}`]: sha(JSON.stringify([...axeRegras.keys()].sort())) });
  return { resolver, fontes };
}

// ───────────────────────────────────────────────────────────────── referências e fatos medidos

export interface SpecVista { id: string; estado: string; unidades: number; descricao: string | null; normas: NormaVista[] }
export interface Referencias { porTela: Record<"A" | "B", { versao: string; sha256: string; specs: SpecVista[] }>; fontes: Record<string, string> }

export function referencias(pares: ParLido[], nr: Normas["resolver"]): Referencias {
  const porTela = {} as Referencias["porTela"];
  const fontes: Record<string, string> = {};
  for (const p of pares) {
    const tela = p.campanha === "t7-tela-b-01" ? "B" : "A";
    const abs = join(p.dir, "entradas", "referencia.json");
    const h = shaArquivo(abs);
    if (porTela[tela]) { if (porTela[tela].sha256 !== h) throw new Error(`E14: referência da tela ${tela} difere entre pares (${p.campanha}/${p.par})`); continue; }
    const r = lerJson<{ _meta: { version: string }; violations: { id: string; state: string; expectedCount?: number; rules: string[]; description: string }[] }>(abs);
    fontes[`referencia tela ${tela} (cópia congelada no par)`] = h;
    porTela[tela] = { versao: r._meta.version, sha256: h, specs: ordenar(r.violations.map(v => ({ id: v.id, estado: v.state, unidades: v.expectedCount ?? 1,
      descricao: mascarar(v.description), normas: v.rules.map(nr).filter((x): x is NormaVista => !!x) })), s => s.id.replace(/\d+/, d => d.padStart(3, "0"))) };
  }
  return { porTela, fontes };
}

interface Grupo { id: string; tela: string; subject: string; state: string; estadoDoDefeito?: string | null; descricao: string; origem: string; quemEscreve: string | null;
  regraDecisao: string; evidence: { arquivo: string; trecho?: string }[]; runtime?: { ok: boolean; medido: string }[];
  officialExample?: { sameDefect: boolean | null; medido: string | null } | null; members?: string[] }

/** Fatos já medidos na página congelada (origem D-129, NAT-73): do próprio caso (M-xxxx) ou do mesmo elemento. */
export function fatosMedidos(): { de: (a: AtomoArquivado) => FatoMedido[]; fontes: Record<string, string> } {
  const abs = join(NAT73, "origem", "origem-medida.json");
  const o = lerJson<{ grupos: Grupo[]; porCaso: Record<string, string> }>(abs);
  const corta = (s: string, n = 700) => (s.length > n ? s.slice(0, n) + "…" : s);
  const vista = (g: Grupo, relacao: FatoMedido["relacao"]): Omit<FatoMedido, "id"> => ({ relacao, fonte: "origem medida (D-129, NAT-73), site congelado",
    descricao: mascarar(g.descricao)!, estadoDoDefeito: mascarar(g.estadoDoDefeito ?? null), origemMedida: g.origem, quemEscreve: mascarar(g.quemEscreve),
    medidoNaPagina: (g.runtime ?? []).filter(r => r.ok).map(r => corta(mascarar(r.medido)!)),
    exemploOficial: g.officialExample ? { mesmoDefeito: g.officialExample.sameDefect ?? null, medido: g.officialExample.medido ? corta(mascarar(g.officialExample.medido)!) : null } : null,
    trechos: g.evidence.filter(e => e.trecho).map(e => ({ arquivo: e.arquivo, trecho: corta(mascarar(e.trecho!)!) })) });
  const de = (a: AtomoArquivado): FatoMedido[] => {
    const out: Omit<FatoMedido, "id">[] = [];
    const proprios = a.mId ? o.grupos.filter(g => g.members?.includes(a.mId!)) : [];
    for (const g of proprios) out.push(vista(g, "deste-caso"));
    const chaves = new Set(a.sujeitos);
    for (const g of o.grupos) if (!proprios.includes(g) && g.tela === a.tela && chaves.has(g.subject)) out.push(vista(g, "mesmo-elemento"));
    return out.map((f, i) => ({ id: `F${i + 1}`, ...f }));
  };
  return { de, fontes: { [relTcc(abs)]: shaArquivo(abs) } };
}

// ───────────────────────────────────────────────────────────────── cartão cego

export function cartaoCego(item: Extracao["itens"][number], card: Card, nr: Normas["resolver"], fatos: FatoMedido[], specsDaTela: string[]): CartaoCego {
  const a = item.atomo, l = item.linha;
  const evid = (card.evidence ?? []).filter(e => !evidenciaOmitida(e.ref)).map((e, i) => ({ id: `E${i + 1}`, ref: mascarar(e.ref)!, status: e.status }));
  // Sujeitos do átomo (as chaves que ele alega), com o rótulo e as cenas em que o cartão os resolve.
  // [E14] Até MAX_SUJEITOS na vista (o cartão de 42 dias do calendário repete o mesmo elemento); o resto é contado.
  const todas = unicos(a.sujeitos);
  const chaves = todas.slice(0, MAX_SUJEITOS);
  const sujeitos = chaves.map((k, i) => {
    const ss = card.subjects.filter(s => s.key === k || s.id === k);
    return { id: `S${i + 1}`, chave: k, rotulo: mascarar(ss[0]?.label ?? "(sem rótulo)")!, cena: unicos(ss.map(s => s.scene ?? card.scene)).join(" · ") || null };
  });
  const observado = mascarar(card.observed ?? card.description);
  const esperado = mascarar(card.expected);
  const regra = mascarar(card.rule);
  const normaCitada = nr(card.rule);
  const qualidade = item.tipo === "qualidade";
  const idNorma = (id: string | null) => {
    if (!id) return null;
    const n = normalizarRegra(id);
    return card.rule && n === normalizarRegra(card.rule) ? "a regra citada pelo cartão" : mascarar(n);
  };
  const vereditoRegistrado = qualidade ? { verdadeFactual: l.verdadeFactual,
    norma: { id: idNorma(l.normaId), forca: l.normaForca, aplicabilidade: l.normaAplicabilidade, violada: l.normaViolada },
    leitura: "Já julgado: o fato é verdadeiro, e a norma que o cartão invoca não se aplica, não é obrigatória ou não foi violada (erro normativo). Falta só a qualidade da sugestão (texto esperado)." } : null;
  const citaveis = ["OBS", ...(esperado ? ["ESP"] : []), ...(regra ? ["REGRA"] : []), ...(normaCitada ? ["NORMA"] : []), ...(vereditoRegistrado ? ["VR"] : []),
    ...evid.map(e => e.id), ...sujeitos.map(s => s.id), ...fatos.map(f => f.id), ...specsDaTela];
  return {
    id: item.id, tela: item.tela, telaNome: item.tela === "A" ? "Tela A · Solicitar serviço" : "Tela B · Vistorias",
    alegacao: { regra, seletor: mascarar(card.selector), observado, esperado,
      estado: { viewport: card.state?.viewport ?? null, passos: (card.state?.steps ?? []).map(s => mascarar(s)!) },
      cena: card.scene, sinais: (card.flags ?? []).map(f => mascarar(f)!), evidencias: evid, sujeitos, sujeitosNaoListados: todas.length - chaves.length },
    normaCitada, candidatas: a.candidatasSpecs, fatosMedidos: fatos, vereditoRegistrado,
    perguntas: PERGUNTAS[item.tipo], citaveis,
  };
}

/** Cartão arquivado do átomo (pelo par lido no E1). */
export function cartaoDoAtomo(inv: Inventario, a: AtomoArquivado): Card {
  const p = inv.pares.find(x => x.campanha === a.campanha && x.par === a.par)!;
  const c = p.pkg.cards.find(x => x.id === a.cardIdOriginal);
  if (!c) throw new Error(`E14: cartão ${a.cardIdOriginal} não achado em ${a.campanha}/${a.par}`);
  return c;
}
