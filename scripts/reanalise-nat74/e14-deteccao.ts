/**
 * [D-156] Tabulação da leitura de campanha: specs achadas por braço em DUAS colunas, e cada uma por classe de spec.
 *
 *   npx tsx scripts/reanalise-nat74/e14-deteccao.ts --passada PASTA_DA_PASSADA [--julgamentos ARQ] --saida PASTA
 *       [--coluna-principal deteccao|fundamentada] [--sensibilidade-regra ADJ/adjudicacao/sensibilidade-regra.json]
 *     → PASTA/deteccao.json + deteccao.md (recusa se já existirem: versão nova = arquivo novo)
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
 *   leitura da regra (identidade demonstrada × não demonstrada), trocando só a spec dos cartões das unidades (d). Sem a
 *   opção, nada muda (byte a byte).
 *
 * O braço vem da chave da passada (nunca vai ao juiz). Determinístico, sem rede, sem modelo. Entradas com sha256.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { gravar, jsonTexto, sha } from "./comum";
import { bracoDoRun } from "./e14-campanha";
import type { Derivado, ItemChave, Resposta } from "./e14-comum";

export const DETECCAO_VERSAO = "nat78-deteccao-1.1.0";
/** Vocabulário de `categories` das referências e a classe de spec de cada categoria (D-156 3.i). */
export const CLASSE_DA_CATEGORIA: Record<string, "ds" | "geral"> = {
  token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral",
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
}

export function tabular(julgs: Julgamento[], bracoDe: (chave: string) => string, specs: { id: string; categories: string[] }[], politica: string,
  bracosDoDesenho: string[], o: { estado?: Record<string, EstadoBraco>; colunaPrincipal?: Coluna | null } = {}): Tabela {
  const cls = new Map(specs.map(s => [s.id, classeDaSpec(s.categories)]));
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
    const conta = (xs: Set<string>, c: ClasseSpec) => [...xs].filter(s => cls.get(s) === c).length;
    porBraco[b] = { cartoes: js.length, deteccao: [...det].sort(), fundamentada: [...fun].sort(), viaReferencia: via.sort((x, y) => x.spec.localeCompare(y.spec) || x.cartao.localeCompare(y.cartao)),
      porClasse: { ds: { deteccao: conta(det, "ds"), fundamentada: conta(fun, "ds") }, geral: { deteccao: conta(det, "geral"), fundamentada: conta(fun, "geral") } } };
  }
  const alguma = new Set(Object.values(porBraco).flatMap(x => x?.deteccao ?? []));
  return { formato: DETECCAO_VERSAO, politica, specs: specs.map(s => ({ id: s.id, classe: cls.get(s.id)!, categorias: s.categories })), bracos, estado, porBraco,
    nenhumBraco: specs.map(s => s.id).filter(s => !alguma.has(s)), colunaPrincipal };
}

// ───────────────────────────────────────────── [D-165] sensibilidade do gatilho (d): contagem por leitura da regra

/** Uma linha de `adjudicacao/sensibilidade-regra.json` (revisao-campanha aplicar): a spec creditada em cada leitura. */
export interface CartaoDaRegra { id: string; chave: string; unidade: string; leituraAdotada: string; credita: Record<string, string | null> }
export interface SensibilidadeRegra { formato: string; regra: { arquivo: string; sha256: string } | null; leituras: string[]; cartoes: CartaoDaRegra[] }
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
 * dos julgamentos dados com a spec creditada pelos cartões das unidades (d) trocada pela daquela leitura. Nada mais muda:
 * os demais cartões contam como nos julgamentos. Só detecção (a coluna fundamentada de uma leitura não adotada não existe).
 */
export function cenariosDaRegra(julgs: Julgamento[], bracoDe: (chave: string) => string, t: Tabela, sens: SensibilidadeRegra,
  primeira: Julgamento[] | null = null): Cenarios {
  const porChave = new Map(sens.cartoes.map(c => [c.chave, c]));
  const nossos = julgs.filter(j => porChave.has(j.chave));
  for (const c of sens.cartoes) for (const l of sens.leituras) if (!(l in c.credita)) throw new Error(`sensibilidade: ${c.id} sem a leitura ${l}`);
  const conta = (f: (j: Julgamento) => string | null, js: Julgamento[]) => Object.fromEntries(t.bracos.map(b => {
    if (t.estado[b] !== "valida") return [b, null];
    const specs = [...new Set(js.filter(j => bracoDe(j.chave) === b).map(f).filter((x): x is string => !!x))].sort();
    return [b, { deteccao: specs.length, specs }];
  }));
  const porCenario: Cenarios["porCenario"] = {};
  if (primeira) porCenario["1a-passada"] = conta(j => specDetectada(j.derivado), primeira);
  porCenario.julgamentos = conta(j => specDetectada(j.derivado), julgs);
  for (const l of sens.leituras) porCenario[l] = conta(j => { const c = porChave.get(j.chave); return c ? c.credita[l] : specDetectada(j.derivado); }, julgs);
  const p1 = primeira ? new Map(primeira.map(j => [j.chave, j])) : null;
  const cartoes = nossos.map(j => { const c = porChave.get(j.chave)!;
    return { id: j.id, braco: bracoDe(j.chave), unidade: c.unidade, leituraAdotada: c.leituraAdotada,
      porCenario: { ...(p1 ? { "1a-passada": p1.get(j.chave) ? specDetectada(p1.get(j.chave)!.derivado) : null } : {}), julgamentos: specDetectada(j.derivado),
        ...Object.fromEntries(sens.leituras.map(l => [l, c.credita[l]])) } }; }).sort((x, y) => x.id.localeCompare(y.id));
  return { formato: FORMATO_CENARIOS, regra: sens.regra, leituras: sens.leituras, porCenario, cartoes,
    regraDaContagem: "detecção (specDetectada) por braço; em cada leitura da regra, só os cartões das unidades (d) trocam de spec (a da leitura); os demais contam como nos julgamentos" };
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

if (process.argv[1] && /(?:^|[\\/])e14-deteccao\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const passada = val("--passada"), saida = val("--saida");
  if (!passada || !saida) { console.error("Uso: --passada PASTA [--julgamentos ARQ] --saida PASTA [--coluna-principal deteccao|fundamentada]"); process.exit(1); }
  const jAbs = resolve(val("--julgamentos") ?? join(passada, "julgamentos.json"));
  for (const f of ["deteccao.json", "deteccao.md"]) if (existsSync(join(saida, f))) { console.error(`${join(saida, f)} já existe (versão nova = pasta nova)`); process.exit(1); }
  const ler = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;
  const jTxt = readFileSync(jAbs, "utf8");
  const sAbs = val("--sensibilidade-regra") ? resolve(val("--sensibilidade-regra")!) : null;
  const sens = sAbs ? ler<SensibilidadeRegra>(sAbs) : null;
  if (sens && sens.formato !== "nat78-sensibilidade-regra-1.0.0") { console.error(`${sAbs}: não é sensibilidade-regra (${sens.formato})`); process.exit(1); }
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
  let refSha: string | null = null;
  for (const a0 of m.analises) {
  // O rótulo da análise no manifesto é o nome da pasta (`analisar-<carimbo>`) e só ganha a pasta do trio quando os nomes
  // se repetem (e14-campanha). Com UM trio na passada (dev-366-b-01: p01/p02 fora por isolamento), o rótulo não traz
  // `pNN/`: procura-se a pasta única com esse nome um nível abaixo da campanha; mais de uma ou nenhuma → recusa.
  let anal = join(dirname(resolve(passada)), a0.dir);
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
  const ref = ler<{ violations: { id: string; categories: string[] }[] }>(refAbs);
  const camp = ler<{ design: { arms?: string[]; colunaPrincipal?: string } }>(campAbs);
  const arms = camp.design.arms ?? ["sem", "com"];
  const pkg = ler<SemanticPackage>(pkgAbs);
  const slots = existsSync(coletaAbs) ? ler<{ slots: { braco: string; escolhida: string | null }[] }>(coletaAbs).slots : null;
  const estado = estadoDosBracos(pkg.runs.map(r => ({ id: r.id, braco: bracoDoRun(r, arms) })), slots, arms);
  let colunaPrincipal: Coluna | null;
  try { colunaPrincipal = colunaDe(cli ?? camp.design.colunaPrincipal); } catch (e) { console.error((e as Error).message); process.exit(1); }
  const js = multi ? j.julgamentos.filter(x => x.chave.split("|")[1] === a0.dir) : j.julgamentos;
  const t = tabular(js, k => { const b = chave.get(k); if (!b) throw new Error(`cartão fora da chave: ${k}`); return b; }, ref.violations, j.politica, arms,
    { estado, colunaPrincipal });
  const lidos = [jAbs, cAbs, mAbs, refAbs, campAbs, pkgAbs, ...(slots ? [coletaAbs] : []), ...(sAbs ? [sAbs] : []), ...(primeira ? [p1Abs] : [])];
  const entradas = Object.fromEntries(lidos.map(p => [p.replace(/\\/g, "/"), sha(readFileSync(p))]));
  const bracoDe = (k: string) => { const b = chave.get(k); if (!b) throw new Error(`cartão fora da chave: ${k}`); return b; };
  const cen = sens ? cenariosDaRegra(js, bracoDe, t, sens, primeira ? (multi ? primeira.filter(x => x.chave.split("|")[1] === a0.dir) : primeira) : null) : null;
  const doc = { ...t, ...(multi ? { analise: a0.dir, cartoesDaAnalise: js.length } : {}), colunaPrincipalOrigem: cli ? "--coluna-principal" : camp.design.colunaPrincipal ? "campanha.design.colunaPrincipal" : null, entradas,
    ...(cen ? { sensibilidadeDaRegra: cen } : {}) };
  const dest = multi ? join(saida, a0.dir.split("/")[0]) : saida;
  const titulo = `Specs achadas por braço — ${basename(dirname(dirname(resolve(passada))))}/${basename(dirname(resolve(passada)))}/${basename(resolve(passada))}${multi ? ` · ${a0.dir}` : ""}`;
  gravar(dest, "deteccao.json", jsonTexto(doc));
  gravar(dest, "deteccao.md", tabelaMd(t, titulo) + (cen ? cenariosMd(cen, t.bracos) : ""));
  if (cen) for (const [n, x] of Object.entries(cen.porCenario)) console.log(`cenário ${n}: ${t.bracos.map(b => `${b} ${x[b]?.deteccao ?? "—"}`).join(" · ")}`);
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
    gravar(saida, "resumo.json", jsonTexto({ politica: j.politica, nota: "mediana por braço sobre as análises com coleta válida; braço sem contagem fica fora da mediana e aparece com null na análise", porAnalise: resumo, mediana: med }));
    for (const b of bracos) console.log(`mediana ${b}: detecção ${med[b].deteccao} · fundamentada ${med[b].fundamentada} · DS ${med[b].ds} · geral ${med[b].geral} (${med[b].trios} trios)`);
  }
}
