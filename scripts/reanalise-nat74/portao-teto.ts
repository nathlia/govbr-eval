/**
 * Portão de teto da tela F (adendo de 26/11 ao protocolo NAT-78, §5), sem modelo: a partir de UMA passada cega JULGADA e
 * ingerida sobre as análises individuais das execuções só do braço `sem` (`npm run analisar -- --pacote … --sem-linha-de-base`,
 * uma análise por execução), conta, por execução, as specs SEMEADAS confirmadas e decide o portão.
 *
 *   npm run portao:teto -- --passada PASSADA --saida PASTA_NOVA [--analise DIR ...] [--origem PASTA_DA_ORIGEM]
 *     → PASTA_NOVA/{portao-teto.json, portao-teto.json.sha256, portao-teto.md}       (o que a sessão principal lê)
 *     → PASTA_NOVA/portao-teto-por-spec.json (+ .sha256)                               (LACRADO: ids das specs)
 *
 * Regra de crédito: a MESMA do recálculo (`recalculo-campanha.ts › creditosDoTrio`, chave `principal|1.2.0`: na passada da
 * política do juiz 1.3.0 essa chave lê o derivado 1.3.0, a coluna detecção); spec confirmada = ≥ 1 unidade confirmada
 * (D-102); conjunto = `_meta.estratos.semeado.specs` da referência das análises. n = o tamanho do estrato semeado; limiar
 * = ⌊n/2⌋ (adendo §5: 6 de 12). Cartão que os juízes deixam pendente conta como CONFIRMADO para o portão (adendo §5, a
 * leitura mais dura): o veredito sai do máximo (confirmadas + pendentes): passa se a mediana do máximo ≤ limiar; senão,
 * não passa. As duas contagens (confirmado e máximo) ficam na saída.
 *
 * O que NÃO é o recálculo: não há trio, coleta-trio, comparação, D, teste, S4' nem adjudicação. A primeira passada (ou a
 * adjudicada, se houver) é a que se dá. `--origem` (opcional) aplica a origem medida pela mesma derivação do recálculo;
 * sem ela, nenhum crédito sai por origem DS (só pode contar a mais para o `sem`, o lado conservador do portão).
 *
 * Recusa: passada fora da política 1.3.0; análise com mais de uma execução de agente ou com execução que não é do braço
 * `sem` (o `ferramentas` e o `com` não rodam no portão); número de execuções ≠ 3; referências diferentes entre as análises;
 * estrato semeado vazio, com spec fora da referência, repetida, exposta ou fora da classe ds.
 *
 * Determinístico: sem carimbo de tempo, sem rede, sem modelo. Toda entrada lida entra com sha256 em `entradas`.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { jsonTexto, ordenar, sha } from "./comum";
import { bracoDoRun } from "./e14-campanha";
import type { Derivado } from "./e14-comum";
import { classeDaSpec } from "./e14-deteccao";
import { aplicarOrigem, lerOrigem } from "./origem-campanha";
import { Entradas, creditosDoTrio, mediana, type CartaoJulgado, type Referencia } from "./recalculo-campanha";
import { gravarImutavel, lerArgs, lerPassada, pastaDaAnalise } from "./revisao-campanha";

export const PORTAO_VERSAO = "nat78-portao-teto-f-1.0.0";
export const FORMATO_PORTAO = "nat78-portao-teto-1.0.0";
export const FORMATO_PORTAO_POR_SPEC = "nat78-portao-teto-por-spec-1.0.0";
export const EXECUCOES_DO_PORTAO = 3;
export const CHAVE_DO_PORTAO = "principal|1.2.0";

/** O estrato semeado da referência, conferido como a regra de desfecho da F o confere (sem exigir a versão 1.0.0). */
export function semeadasDaReferencia(ref: Referencia): string[] {
  const sem = ref._meta.estratos?.semeado?.specs, exp = ref._meta.estratos?.exposto?.specs ?? ref._meta.exposto?.specs ?? [];
  if (!Array.isArray(sem) || !sem.length) throw new Error("referência sem _meta.estratos.semeado.specs (estrato semeado vazio)");
  if (new Set(sem).size !== sem.length) throw new Error("spec repetida no estrato semeado");
  const ids = new Set(ref.violations.map(v => v.id));
  const fora = sem.filter(s => !ids.has(s));
  if (fora.length) throw new Error(`${fora.length} spec(s) do estrato semeado fora da referência`);
  if (sem.some(s => exp.includes(s))) throw new Error("spec semeada marcada como exposta");
  const naoDs = ref.violations.filter(v => sem.includes(v.id) && classeDaSpec(v.categories ?? []) !== "ds");
  if (naoDs.length) throw new Error(`${naoDs.length} spec(s) semeada(s) fora da classe ds pela categories (D-156 3.i)`);
  return [...sem];
}

export const limiarDoPortao = (n: number): number => Math.floor(n / 2);

export interface ExecucaoDoPortao { analise: string; runId: string; confirmadas: string[]; maximo: string[] }
export interface Veredito { mediana: number | null; medianaMax: number | null; n: number; limiar: number; veredito: "passa" | "nao-passa" }

/** Mediana das execuções contra ⌊n/2⌋; o pendente conta como confirmado (adendo §5): o veredito sai da mediana do máximo. */
export function vereditoDoPortao(execucoes: ExecucaoDoPortao[], n: number): Veredito {
  if (execucoes.length !== EXECUCOES_DO_PORTAO) throw new Error(`o portão tem ${EXECUCOES_DO_PORTAO} execuções do sem (adendo §5); recebeu ${execucoes.length}`);
  const limiar = limiarDoPortao(n);
  const med = mediana(execucoes.map(e => e.confirmadas.length))!, medMax = mediana(execucoes.map(e => e.maximo.length))!;
  const veredito = medMax <= limiar ? "passa" : "nao-passa";
  return { mediana: med, medianaMax: medMax, n, limiar, veredito };
}

/**
 * Specs semeadas que UMA execução (uma análise, um pacote) confirma, pela regra do recálculo: `creditosDoTrio` com a
 * política 1.2.0 sobre o derivado da passada. A análise tem de ter exatamente uma execução de agente, do braço `sem`.
 */
export function contagemDaExecucao(pkg: SemanticPackage, julgados: CartaoJulgado[], semeadas: readonly string[], bracos: readonly string[], rotulo: string, fonte: string): Omit<ExecucaoDoPortao, "analise"> {
  const agentes = pkg.runs.filter(r => r.kind === "agente");
  if (agentes.length !== 1) throw new Error(`${rotulo}: ${agentes.length} execuções de agente; o portão lê uma execução por análise (analisar --pacote)`);
  const braco = bracoDoRun(agentes[0], bracos);
  if (braco !== "sem") throw new Error(`${rotulo}: execução do braço ${braco}; no portão de teto só roda o sem (adendo §5)`);
  return { runId: agentes[0].id, ...contagemDoSem(pkg, julgados, semeadas, bracos, rotulo, fonte) };
}

/**
 * O crédito do braço `sem` num pacote, restrito às semeadas: `creditosDoTrio` (a regra do recálculo, política 1.2.0 sobre o
 * derivado da passada) e as specs das unidades confirmadas (e com os pendentes). O crédito de uma execução só depende dos
 * cartões dela, então o mesmo cálculo vale para o pacote de uma execução (o portão) e para o de um trio (o teste).
 */
export function contagemDoSem(pkg: SemanticPackage, julgados: CartaoJulgado[], semeadas: readonly string[], bracos: readonly string[], rotulo: string, fonte: string): { confirmadas: string[]; maximo: string[] } {
  const cr = creditosDoTrio(pkg, julgados, { politica: "1.2.0", reviewer: `${PORTAO_VERSAO} · ${rotulo}`, fonte, bracos });
  const x = cr.porBraco.sem;
  const specDe = new Map(pkg.units.map(u => [u.id, u.specId]));
  const conj = (us: string[]) => [...new Set(us.map(u => specDe.get(u)).filter((s): s is string => !!s && semeadas.includes(s)))].sort();
  return { confirmadas: x ? conj(x.confirmadas) : [], maximo: x ? conj([...x.confirmadas, ...x.admissiveis]) : [] };
}

export interface OpcoesPortao { passada: string; analises?: string[]; origem?: string | null }
export interface SaidaPortao { json: Record<string, unknown>; md: string; porSpec: Record<string, unknown> }

export function avaliarPortao(o: OpcoesPortao): SaidaPortao {
  const E = new Entradas();
  const p = lerPassada(o.passada, { analises: o.analises });
  E.arvore(join(p.dir, "lotes")); E.arvore(join(p.dir, "chave"));
  for (const f of ["julgamentos.json", "julgamentos.json.sha256"]) E.texto(join(p.dir, f));
  if (p.politica !== "1.3.0") throw new Error(`passada na política do juiz ${p.politica}; o portão usa a 1.3.0 (a da coleta da F)`);
  let derivados: Map<string, Derivado> | null = null, origemInfo: Record<string, unknown> | null = null;
  if (o.origem) {
    const lo = lerOrigem(o.origem);
    E.texto(lo.arquivo); E.texto(join(dirname(lo.arquivo), "origem.json.sha256"));
    if (lo.doc.passada?.julgamentosSha256 !== p.julgSha) throw new Error(`--origem ${o.origem}: medida sobre outra passada`);
    derivados = aplicarOrigem(p, lo.doc).derivados;
    origemInfo = { arquivo: E.rel(lo.arquivo), sha256: lo.sha256, versao: lo.doc.versao };
  }
  const derivadoNa = (id: string): Derivado => derivados?.get(id) ?? p.julgados.get(id)!.derivado;
  const man = JSON.parse(p.manifestoTxt) as { analises: { dir: string; packageSha256: string }[] };
  const execucoes: ExecucaoDoPortao[] = [];
  let semeadas: string[] | null = null, refSha: string | null = null, refInfo: Record<string, unknown> | null = null;
  const fonte = `${p.nome}/julgamentos.json sha256:${p.julgSha}`;
  for (const a of man.analises) {
    const dada = (o.analises ?? []).map(x => resolve(x)).find(x => basename(x) === a.dir);
    const abs = dada ?? pastaDaAnalise(p.dir, a.dir);
    const pTxt = E.texto(join(abs, "revisao", "package.json"));
    if (sha(pTxt) !== a.packageSha256) throw new Error(`análise ${a.dir}: package.json difere do manifesto da passada`);
    const pkg = JSON.parse(pTxt) as SemanticPackage;
    const camp = JSON.parse(E.texto(join(abs, "entradas", "campanha.json"))) as { campaignId: string; design: { arms?: string[] } };
    const refAbs = join(abs, "entradas", "referencia.json");
    const refTxt = E.texto(refAbs), s = sha(readFileSync(refAbs));
    if (refSha !== null && s !== refSha) throw new Error("referências diferentes entre as análises do portão");
    if (refSha === null) {
      const ref = JSON.parse(refTxt) as Referencia;
      semeadas = semeadasDaReferencia(ref); refSha = s;
      refInfo = { suite: ref._meta.suite ?? null, versao: ref._meta.version, sha256: s };
    }
    const julgados: CartaoJulgado[] = p.itens.filter(i => i.par === a.dir).map(i => ({ id: i.id, cardId: i.cardIdOriginal, braco: i.braco, runId: i.runId,
      derivado: derivadoNa(i.id), resposta: p.julgados.get(i.id)!.resposta }));
    execucoes.push({ analise: a.dir, ...contagemDaExecucao(pkg, julgados, semeadas!, camp.design.arms ?? ["sem", "com"], a.dir, fonte) });
  }
  const ex = ordenar(execucoes, x => x.analise);
  const v = vereditoDoPortao(ex, semeadas!.length);
  const entradas = E.manifesto();
  E.conferir(entradas);
  const json: Record<string, unknown> = {
    formato: FORMATO_PORTAO, versao: PORTAO_VERSAO,
    regra: `adendo da F §5: ${EXECUCOES_DO_PORTAO} execuções só do sem, julgadas às cegas; por execução, specs do estrato semeado com ≥ 1 unidade confirmada (creditosDoTrio, chave ${CHAVE_DO_PORTAO}: o derivado da passada 1.3.0, coluna detecção, D-102); cartão pendente conta como confirmado (máximo = confirmadas + pendentes); passa se a mediana do máximo ≤ ⌊n/2⌋, senão não passa`,
    passada: { nome: p.nome, versao: p.versao, politica: p.politica, julgamentosSha256: p.julgSha, adjudicada: false },
    origem: origemInfo ?? "sem origem medida: nenhum crédito sai por origem DS (lado conservador do portão)",
    referencia: refInfo,
    execucoes: ex.map(e => ({ analise: e.analise, runId: e.runId, confirmadas: e.confirmadas.length, maximo: e.maximo.length })),
    ...v, entradas,
  };
  const lim = (e: ExecucaoDoPortao) => (e.confirmadas.length === e.maximo.length ? String(e.confirmadas.length) : `${e.confirmadas.length} [≤${e.maximo.length}]`);
  const fmt = (x: number | null) => (x === null ? "n/d" : String(x).replace(".", ","));
  const md = [
    `- execuções: ${ex.map(e => e.runId).join(", ")}`,
    `- specs semeadas confirmadas por execução: ${ex.map(lim).join(", ")}`,
    `- mediana: ${fmt(v.mediana)}${v.mediana === v.medianaMax ? "" : ` [com os pendentes: ${fmt(v.medianaMax)}; o portão lê esta]`}`,
    `- n: ${v.n}`,
    `- limiar: ${v.limiar} (⌊n/2⌋)`,
    `- veredito: ${v.veredito}`,
  ].join("\n") + "\n";
  const porSpec = { formato: FORMATO_PORTAO_POR_SPEC, aviso: "LACRADO: ids das specs semeadas achadas por execução. A sessão principal não abre (adendo §5: só a contagem por execução); nenhum resultado por defeito é usado no portão",
    passada: { nome: p.nome, julgamentosSha256: p.julgSha }, portaoSha256: sha(jsonTexto(json)),
    execucoes: ex.map(e => ({ analise: e.analise, runId: e.runId, confirmadas: e.confirmadas, maximo: e.maximo })) };
  return { json, md, porSpec };
}

const USO = "uso: portao-teto.ts --passada PASSADA --saida PASTA_NOVA [--analise DIR ...] [--origem PASTA_DA_ORIGEM]";

export function executar(argv: string[]): number {
  const a = lerArgs(argv, ["--passada", "--saida", "--analise", "--origem"], []);
  if ("erro" in a) { console.error(`RECUSADO: ${a.erro}\n${USO}`); return 1; }
  try {
    if (a.modo.length) throw new Error(`argumento solto: ${a.modo.join(" ")}`);
    const um = (k: string, obrig: boolean) => { const v = a.opts.get(k); if (v && v.length > 1) throw new Error(`${k} mais de uma vez`); if (obrig && !v?.length) throw new Error(`falta ${k}`); return v?.[0] ?? null; };
    const passada = resolve(um("--passada", true)!), saida = resolve(um("--saida", true)!);
    const r = relative(passada, saida);
    if (r === "" || (!r.startsWith("..") && !isAbsolute(r))) throw new Error("--saida não pode ficar dentro da passada");
    if (existsSync(saida)) throw new Error(`--saida ${saida} já existe (pasta NOVA)`);
    const origem = um("--origem", false);
    const s = avaliarPortao({ passada, analises: a.opts.get("--analise"), origem: origem ? resolve(origem) : null });
    const jTxt = jsonTexto(s.json), pTxt = jsonTexto(s.porSpec);
    gravarImutavel(saida, [["portao-teto.json", jTxt], ["portao-teto.json.sha256", `${sha(jTxt)}  portao-teto.json\n`], ["portao-teto.md", s.md],
      ["portao-teto-por-spec.json", pTxt], ["portao-teto-por-spec.json.sha256", `${sha(pTxt)}  portao-teto-por-spec.json\n`]]);
    process.stdout.write(s.md);
    console.log(`gravado em ${saida} (portao-teto.json sha256 ${sha(jTxt)}); portao-teto-por-spec.json é LACRADO`);
    return 0;
  } catch (e) { console.error(e instanceof Error ? e.message : e); return 1; }
}

if (process.argv[1] && /(?:^|[\\/])portao-teto\.ts$/.test(process.argv[1])) process.exit(executar(process.argv.slice(2)));
