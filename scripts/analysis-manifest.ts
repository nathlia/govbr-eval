/**
 * Manifesto de análise — a única porta para um pacote que NÃO é "a bateria inteira, como foi coletada".
 *
 * `prepare --battery` recusa bateria com slot falho ou não tentado, e a recusa é de propósito: tirar
 * em silêncio as tentativas que deram errado e pontuar as que deram certo é escolher a amostra
 * depois de ver a coleta. Só que bateria interrompida acontece (a de 2026-10-02T03-39-50 parou no
 * slot 5 por limite de uso, 429), e repetir a bateria inteira para completar dois slots jogaria fora
 * quatro execuções válidas. O caminho honesto é este arquivo: ele DIZ, antes da preparação e num
 * lugar só, quais slots de quais baterias entram, quais ficam de fora e por quê, e o pacote leva o
 * hash dele na proveniência.
 *
 * O que o manifesto não deixa fazer:
 *   - juntar coletas de identidade diferente (oráculo, dados, página, gabarito, plano de estados):
 *     `compareIdentities` campo a campo, a mesma régua da linha de base;
 *   - juntar execuções de protocolo, modelo, esforço, cliente ou perfil de oráculo diferentes;
 *   - incluir slot que `prepare --battery` recusaria (as conferências são as MESMAS funções);
 *   - deixar slot de fora sem dizer: todo slot de toda bateria fonte está em `incluidos` ou em
 *     `excluidos` com motivo, e nunca nos dois.
 *
 * O que ele registra sem recusar: diferenças de ambiente que não fazem parte da identidade (versão do
 * cliente, Node, navegadores, commits). Elas vão para `divergenciasRegistradas`, que é o primeiro
 * campo que quem ler o pacote deve olhar.
 *
 * CLI:
 *   tsx scripts/analysis-manifest.ts build --out ARQ.json
 *       --bateria A=pipeline/logs/X-bateria.json --bateria B=pipeline/logs/Y-bateria.json
 *       --incluir A:1,2,3,4 --incluir B:1,2
 *       --excluir "A:5=429 limite de uso, sem relatório" --excluir "A:6=não tentado após o 429"
 *       --designada B --baseline pipeline/logs/Y-linha-de-base.json --baseline-motivo "..."
 *       --justificativa "..." [--site-dir DIR]
 *   tsx scripts/analysis-manifest.ts verify --manifest ARQ.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FlowAgentResults } from "../types";
import { ROOT } from "./adjudication";
import { checkPlanConformity, compareIdentities, readCollectionManifest, sha256, type CollectionManifest, type ExecutableIdentity } from "./collection-manifest";
import { loadVerifiedEvidence, type EvidenceDeclaration } from "./evidence-integrity";
import { loadSite } from "./measurement-surface";
import { TELAS, type Tela } from "./telas";

export const ANALYSIS_MANIFEST_VERSION = "manifesto-analise-1.0.0";

// ───────────────────────────────────────────────────────────────── bateria e slot

export interface BatteryEntry {
  archive: string | null; archiveDir: string; exitCode: number | null; suite: string; arm: string; slot?: number;
  repetition?: number; runId?: string;
  collectionStatus?: string; collectionManifestSha256?: string; apiErrorStatus?: number | null; motivo?: string;
  instrumentVersion?: string; protocolVersion?: string; evidence?: EvidenceDeclaration | null;
  model?: string; reasoningEffort?: string; oracleProfile?: string; client?: string; clientVersion?: string;
  scope?: string; prompt?: string;
}
export interface Battery {
  stamp?: string; clientVersion?: string; stopReason?: string;
  collectionManifest?: { path: string; sha256: string };
  surface?: { dir?: string; description?: { siteManifestSha256?: string } };
  execucoes: BatteryEntry[];
}

const portable = (path: string): string => path.replaceAll("\\", "/");
const relTo = (root: string, path: string): string => portable(relative(root, path));
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, "")) as T;

/**
 * A tela de uma bateria é a suíte das suas execuções, e é UMA: execuções de telas diferentes nunca
 * entram no mesmo pacote (D-13, D-49). Suíte que telas.json não declara não é tela deste instrumento.
 */
export function telaOfBattery(battery: Battery): Tela | null {
  const suites = [...new Set(battery.execucoes.map(entry => entry.suite))];
  if (suites.length !== 1) throw new Error(`Bateria mistura suítes (${suites.join(", ")}); prepare um pacote por tela`);
  return TELAS[suites[0]] ?? null;
}

/**
 * Por que este slot não pode entrar num pacote — ou `null`. É a mesma pergunta para `prepare
 * --battery` (que recusa a bateria inteira) e para o manifesto de análise (que recusa incluir o slot).
 *
 * A mensagem nomeia o slot e a causa. A versão anterior dizia "failed/missing/unattempted" sem dizer
 * qual nem por quê, e num pacote de seis execuções isso manda procurar no escuro — foi o que o ensaio
 * de 17/09 fez perder tempo, com a causa real (nenhum relatório no coletor) a três arquivos de
 * distância. `nao-tentada` vem antes do código de saída: o runner grava o slot não tentado com
 * `exitCode: null`, e "código de saída null" esconderia a causa que a mensagem existe para dizer.
 */
export function motivoDeRecusa(entry: BatteryEntry, tela: Tela | null): string | null {
  return !tela ? `suíte "${entry.suite}" não é tela declarada em telas.json (${Object.keys(TELAS).join(", ")})`
    : entry.collectionStatus === "nao-tentada" ? "slot não tentado"
    : entry.exitCode !== 0 ? `código de saída ${entry.exitCode}${entry.apiErrorStatus ? ` (API ${entry.apiErrorStatus})` : ""}`
    : entry.collectionStatus === "sem-relatorio" ? "o coletor não recebeu relatório desta execução"
    : entry.collectionStatus && entry.collectionStatus !== "collected" ? `estado de coleta "${entry.collectionStatus}"`
    : !entry.archive ? "sem arquivo arquivado" : null;
}

export interface SelectedRun {
  id: string; data: FlowAgentResults; kind: "agente"; evidence: ReturnType<typeof loadVerifiedEvidence>;
  /** Caminho absoluto do arquivo da execução, para o manifesto registrar o hash dele. */
  path: string;
}

/**
 * Carrega um slot que já passou por `motivoDeRecusa`: arquivo na pasta do braço desta tela, contrato
 * do arquivo igual ao declarado pela bateria, e — com manifesto de coleta — o slot e o arquivo
 * nomeando ESTE manifesto. Numa análise composta cada execução é conferida contra o manifesto da
 * SUA bateria, nunca contra o da bateria designada.
 */
export function loadBatteryEntry(entry: BatteryEntry, tela: Tela, collectionSha: string | null, root = ROOT): SelectedRun {
  if (collectionSha && entry.collectionManifestSha256 !== collectionSha) throw new Error("Run was not collected under this collection manifest");
  const expectedDir = entry.arm === "com" ? tela.runs.com : entry.arm === "sem" ? tela.runs.sem : null;
  if (portable(entry.archiveDir) !== expectedDir) throw new Error("Archive arm/directory mismatch");
  const archive = entry.archive;
  if (!archive) throw new Error(`Slot ${entry.slot ?? "?"} (${entry.arm}) não entra no pacote: sem arquivo arquivado`);
  const path = resolve(root, entry.archiveDir, archive);
  const rel = relative(join(root, entry.archiveDir), path);
  if (rel.startsWith("..") || isAbsolute(rel) || rel.includes("/") || rel.includes("\\")) throw new Error("Archive must be a file in its declared run directory");
  const data = readJson<FlowAgentResults>(path);
  if (data.config?.instrumentVersion !== entry.instrumentVersion || data.config?.protocolVersion !== entry.protocolVersion) {
    throw new Error(`Manifest/archive configuration mismatch: ${path}`);
  }
  if (collectionSha && (data.config as { collectionManifestSha256?: string } | undefined)?.collectionManifestSha256 !== collectionSha) {
    throw new Error(`Archived run does not name this collection manifest: ${path}`);
  }
  return { id: relTo(root, path), data, kind: "agente", path,
    evidence: loadVerifiedEvidence(root, entry.evidence, data.config) };
}

// ───────────────────────────────────────────────────────────────── formato

export interface AnalysisManifest {
  manifestVersion: string;
  generatedAt: string;
  tela: string;
  /** Por que esta análise existe e não é a bateria inteira. Texto da autora (ou de quem decidiu, registrado). */
  justificativa: string;
  /** O que NÃO faz parte da identidade e mesmo assim difere entre as fontes. Leia antes dos números. */
  divergenciasRegistradas: { campo: string; valores: { fonte: string; valor: string | null }[]; nota: string }[];
  fontes: {
    fonte: string;
    stamp: string | null;
    bateria: { path: string; sha256: string };
    collectionManifest: { path: string; sha256: string };
    slotsIncluidos: number[];
    slotsExcluidos: number[];
  }[];
  incluidos: {
    fonte: string; slot: number; arm: string; repetition: number | null; runId: string | null;
    archive: { path: string; sha256: string };
    collectionManifestSha256: string;
  }[];
  excluidos: {
    fonte: string; slot: number; arm: string; collectionStatus: string | null; exitCode: number | null;
    apiErrorStatus: number | null; motivo: string;
    /**
     * `true` quando o slot passaria nas conferências e mesmo assim ficou de fora. Permitido — com
     * motivo —, mas é exatamente a escolha de amostra que este arquivo existe para deixar à vista.
     */
    elegivel: boolean;
  }[];
  /** Por braço, depois da composição. */
  execucoesPorBraco: Record<string, number>;
  /** Identidade comum a todas as coletas — igual campo a campo, ou o manifesto não existiria. */
  identidade: ExecutableIdentity;
  /**
   * A bateria cujo manifesto de coleta, site congelado e linha de base o pacote usa. As identidades
   * são iguais, então é o mesmo site byte a byte; a designação existe porque a linha de base pertence
   * a UM manifesto de coleta e o pacote confere isso.
   */
  designada: {
    fonte: string;
    collectionManifest: { path: string; sha256: string };
    siteDir: string;
    siteManifestSha256: string;
    baseline: { path: string; sha256: string; motivo: string };
  };
  /** Dimensões conferidas como iguais em todas as execuções incluídas (por braço quando indicado). */
  dimensoesConferidas: { campo: string; escopo: "todas" | "por-braco"; valores: Record<string, string> }[];
}

// ───────────────────────────────────────────────────────────────── construção

export interface BuildAnalysisOptions {
  baterias: { fonte: string; path: string }[];
  incluir: { fonte: string; slots: number[] }[];
  excluir: { fonte: string; slot: number; motivo: string }[];
  justificativa: string;
  designada: string;
  baseline: { path: string; motivo: string };
  /** Sem ele, a pasta de superfície que a bateria designada declara. */
  siteDir?: string;
  root?: string;
}

interface Fonte {
  fonte: string; path: string; sha256: string; battery: Battery; tela: Tela;
  collection: { manifest: CollectionManifest; sha256: string; path: string };
}

function lerFonte(fonte: string, path: string, root: string): Fonte {
  const bytes = readFileSync(path);
  const battery = JSON.parse(bytes.toString("utf8").replace(/^﻿/, "")) as Battery;
  if (!battery.execucoes?.length) throw new Error(`Bateria ${fonte}: vazia`);
  if (!battery.collectionManifest) throw new Error(`Bateria ${fonte}: sem manifesto de coleta; análise composta só existe sobre coletas congeladas`);
  const collectionPath = resolve(root, battery.collectionManifest.path);
  const collection = readCollectionManifest(collectionPath);
  if (collection.sha256 !== battery.collectionManifest.sha256) {
    throw new Error(`Bateria ${fonte}: o manifesto de coleta em disco não é o que a bateria nomeia (${collection.sha256.slice(0, 12)} ≠ ${battery.collectionManifest.sha256.slice(0, 12)})`);
  }
  // A bateria fonte tem de ser a planejada, slot a slot, como em `prepare --battery`: o manifesto de
  // análise escolhe entre slots planejados, nunca acrescenta um.
  checkPlanConformity(battery.execucoes, collection.manifest.plan!.slots);
  const tela = telaOfBattery(battery);
  if (!tela) throw new Error(`Bateria ${fonte}: suíte "${battery.execucoes[0].suite}" não é tela declarada em telas.json`);
  return { fonte, path, sha256: sha256(bytes), battery, tela, collection: { ...collection, path: collectionPath } };
}

/** Valor de uma dimensão na execução; ausente é ausente — dois ausentes nunca contam como iguais. */
function dimensao(entry: BatteryEntry, campo: keyof BatteryEntry): string | null {
  const v = entry[campo];
  return typeof v === "string" && v.trim() ? v : null;
}

const DIMENSOES_TODAS: (keyof BatteryEntry)[] = ["model", "reasoningEffort", "client", "protocolVersion", "instrumentVersion", "suite", "scope", "prompt"];
/** O perfil do oráculo é a própria diferença entre os braços; igual exige-se DENTRO de cada braço. */
const DIMENSOES_POR_BRACO: (keyof BatteryEntry)[] = ["oracleProfile"];

export function buildAnalysisManifest(o: BuildAnalysisOptions): AnalysisManifest {
  const root = o.root ?? ROOT;
  if (!o.justificativa?.trim()) throw new Error("Falta --justificativa: um manifesto de análise sem motivo é seleção sem registro");
  if (!o.baseline?.path) throw new Error("Falta --baseline: o pacote composto confronta a linha de base da bateria designada");
  if (!o.baseline.motivo?.trim()) throw new Error("Falta --baseline-motivo: diga por que esta linha de base, e não a da outra bateria");
  if (!o.baterias.length) throw new Error("Nenhuma --bateria");

  const rotulos = o.baterias.map(b => b.fonte);
  if (rotulos.some(r => !/^[A-Za-z0-9_-]+$/.test(r))) throw new Error(`Rótulo de bateria inválido (use letras, números, - ou _): ${rotulos.join(", ")}`);
  if (new Set(rotulos).size !== rotulos.length) throw new Error(`Rótulo de bateria repetido: ${rotulos.join(", ")}`);
  const fontes = o.baterias.map(b => lerFonte(b.fonte, resolve(root, b.path), root));
  const shas = fontes.map(f => f.sha256);
  if (new Set(shas).size !== shas.length) throw new Error("A mesma bateria aparece sob dois rótulos");
  const fonteDe = (rotulo: string): Fonte => {
    const f = fontes.find(x => x.fonte === rotulo);
    if (!f) throw new Error(`"${rotulo}" não é rótulo de nenhuma --bateria (${rotulos.join(", ")})`);
    return f;
  };

  // ── uma tela, uma identidade de coleta ───────────────────────────────────────
  const telas = [...new Set(fontes.map(f => f.tela.nome))];
  if (telas.length !== 1) throw new Error(`Baterias de telas diferentes (${telas.join(", ")}) nunca entram no mesmo pacote (D-13, D-49)`);
  const [primeira, ...demais] = fontes;
  for (const f of demais) {
    const diferencas = compareIdentities(primeira.collection.manifest.identity, f.collection.manifest.identity,
      { expected: `coleta ${primeira.fonte}`, actual: `coleta ${f.fonte}` });
    if (diferencas.length) throw new Error(`Identidades de coleta diferentes; não é a mesma medida: ${diferencas.join("; ")}`);
  }
  const identidade = primeira.collection.manifest.identity;
  // A superfície de cada bateria tem de ter servido o site que a identidade nomeia. Redundante com a
  // identidade enquanto o runner gravar as duas a partir do mesmo arquivo — e é por isso que se confere.
  for (const f of fontes) {
    const declarado = f.battery.surface?.description?.siteManifestSha256;
    if (declarado !== undefined && declarado !== identidade.siteManifestSha256) {
      throw new Error(`Bateria ${f.fonte}: a superfície serviu outro site (${String(declarado).slice(0, 12)}) que o da identidade`);
    }
  }

  // ── contabilidade de slots: tudo incluído ou excluído com motivo, nada nos dois ─
  const incluidosPorFonte = new Map<string, Set<number>>();
  for (const inc of o.incluir) {
    fonteDe(inc.fonte);
    const set = incluidosPorFonte.get(inc.fonte) ?? new Set<number>();
    for (const s of inc.slots) {
      if (set.has(s)) throw new Error(`Slot ${inc.fonte}:${s} incluído duas vezes`);
      set.add(s);
    }
    incluidosPorFonte.set(inc.fonte, set);
  }
  const excluidosPorFonte = new Map<string, Map<number, string>>();
  for (const exc of o.excluir) {
    fonteDe(exc.fonte);
    if (!exc.motivo?.trim()) throw new Error(`Slot ${exc.fonte}:${exc.slot} excluído sem motivo`);
    const map = excluidosPorFonte.get(exc.fonte) ?? new Map<number, string>();
    if (map.has(exc.slot)) throw new Error(`Slot ${exc.fonte}:${exc.slot} excluído duas vezes`);
    map.set(exc.slot, exc.motivo.trim());
    excluidosPorFonte.set(exc.fonte, map);
  }
  for (const f of fontes) {
    const inc = incluidosPorFonte.get(f.fonte) ?? new Set<number>();
    const exc = excluidosPorFonte.get(f.fonte) ?? new Map<number, string>();
    const existentes = new Set(f.battery.execucoes.map(e => e.slot!));
    for (const s of [...inc, ...exc.keys()]) {
      if (!existentes.has(s)) throw new Error(`Slot ${f.fonte}:${s} não existe na bateria (slots ${[...existentes].join(", ")})`);
    }
    for (const s of inc) if (exc.has(s)) throw new Error(`Slot ${f.fonte}:${s} está incluído e excluído ao mesmo tempo`);
    const semConta = [...existentes].filter(s => !inc.has(s) && !exc.has(s));
    if (semConta.length) {
      throw new Error(`Slot(s) ${semConta.map(s => `${f.fonte}:${s}`).join(", ")} sem destino: inclua ou exclua com motivo. ` +
        "Nenhum slot sai da análise em silêncio.");
    }
  }

  // ── cada slot incluído passa pelas mesmas conferências de `prepare --battery` ──
  const incluidos: AnalysisManifest["incluidos"] = [];
  const entradas: { fonte: string; entry: BatteryEntry }[] = [];
  for (const f of fontes) {
    const inc = incluidosPorFonte.get(f.fonte) ?? new Set<number>();
    for (const entry of f.battery.execucoes.filter(e => inc.has(e.slot!)).sort((a, b) => a.slot! - b.slot!)) {
      const motivo = motivoDeRecusa(entry, f.tela);
      if (motivo) throw new Error(`Slot ${f.fonte}:${entry.slot} (${entry.arm}) não pode ser incluído: ${motivo}`);
      const run = loadBatteryEntry(entry, f.tela, f.collection.sha256, root);
      incluidos.push({ fonte: f.fonte, slot: entry.slot!, arm: entry.arm, repetition: entry.repetition ?? null, runId: entry.runId ?? null,
        archive: { path: run.id, sha256: sha256(readFileSync(run.path)) }, collectionManifestSha256: f.collection.sha256 });
      entradas.push({ fonte: f.fonte, entry });
    }
  }
  if (!incluidos.length) throw new Error("Nenhum slot incluído");

  // ── dimensões do que foi pedido ao agente: iguais, ou não é a mesma condição ─
  const dimensoesConferidas: AnalysisManifest["dimensoesConferidas"] = [];
  const conferir = (campo: keyof BatteryEntry, grupo: { fonte: string; entry: BatteryEntry }[], rotulo: string): string => {
    const ausentes = grupo.filter(g => dimensao(g.entry, campo) === null);
    if (ausentes.length) {
      throw new Error(`${String(campo)} ausente em ${ausentes.map(g => `${g.fonte}:${g.entry.slot}`).join(", ")}; dimensão ausente não é igual a nada`);
    }
    const valores = [...new Set(grupo.map(g => dimensao(g.entry, campo)!))];
    if (valores.length > 1) {
      throw new Error(`${String(campo)} difere entre as execuções incluídas${rotulo}: ` +
        grupo.map(g => `${g.fonte}:${g.entry.slot}=${dimensao(g.entry, campo)}`).join(", "));
    }
    return valores[0];
  };
  for (const campo of DIMENSOES_TODAS) {
    dimensoesConferidas.push({ campo, escopo: "todas", valores: { todas: conferir(campo, entradas, "") } });
  }
  const bracos = [...new Set(entradas.map(e => e.entry.arm))].sort();
  for (const campo of DIMENSOES_POR_BRACO) {
    dimensoesConferidas.push({ campo, escopo: "por-braco", valores: Object.fromEntries(bracos.map(b =>
      [b, conferir(campo, entradas.filter(e => e.entry.arm === b), ` do braço ${b}`)])) });
  }

  // ── o que não é identidade e difere: registrado, não recusado ──────────────
  const divergenciasRegistradas: AnalysisManifest["divergenciasRegistradas"] = [];
  const registrar = (campo: string, nota: string, valores: { fonte: string; valor: string | null }[]): void => {
    if (new Set(valores.map(v => v.valor)).size > 1) divergenciasRegistradas.push({ campo, valores, nota });
  };
  registrar("clientVersion", "versão do cliente que executou o agente; não faz parte da identidade de coleta, mas pode mudar o comportamento do agente",
    entradas.map(e => ({ fonte: `${e.fonte}:${e.entry.slot}`, valor: e.entry.clientVersion ?? fonteDe(e.fonte).battery.clientVersion ?? null })));
  const doManifesto: [string, string, (m: CollectionManifest) => unknown][] = [
    ["runtime.node", "Node do preflight da coleta", m => m.runtime.node],
    ["runtime.client", "cliente declarado no manifesto de coleta", m => m.runtime.client],
    ["runtime.playwright", "Playwright do govbr-eval, do oráculo e o fixado do MCP", m => m.runtime.playwright],
    ["runtime.browsers", "navegadores do govbr-eval e do oráculo", m => m.runtime.browsers],
    ["repos", "commits e árvore suja dos três repositórios no preflight; o que identifica é o hash, mas a diferença fica à vista", m => m.repos],
    ["analysisAtCollection", "código de análise instalado na coleta; o pacote confere o seu próprio na preparação", m => m.analysisAtCollection],
    ["surfaceSha256", "descrição da superfície (portas, pid, horário); o site servido já está na identidade", m => m.surfaceSha256],
  ];
  for (const [campo, nota, ler] of doManifesto) {
    registrar(campo, nota, fontes.map(f => ({ fonte: f.fonte, valor: JSON.stringify(ler(f.collection.manifest) ?? null) })));
  }

  // ── bateria designada: manifesto de coleta, site congelado e linha de base ─
  const designada = fonteDe(o.designada);
  const siteDirArg = o.siteDir ?? designada.battery.surface?.dir;
  if (!siteDirArg) throw new Error(`Bateria ${designada.fonte} não declara surface.dir; passe --site-dir`);
  const siteDir = resolve(root, siteDirArg);
  const site = loadSite(siteDir);
  if (site.manifestSha256 !== identidade.siteManifestSha256) throw new Error("O site congelado da bateria designada difere da identidade das coletas");
  const baselinePath = resolve(root, o.baseline.path);
  const baselineBytes = readFileSync(baselinePath);
  const baseline = JSON.parse(baselineBytes.toString("utf8")) as {
    status?: string; scope?: string; provenance?: { collectionManifest?: { sha256?: string } };
  };
  if (baseline.status !== "complete") throw new Error("A linha de base não completou");
  if (baseline.scope !== "bateria") throw new Error("Linha de base dev-global não se compara com bateria");
  if (baseline.provenance?.collectionManifest?.sha256 !== designada.collection.sha256) {
    throw new Error(`A linha de base pertence a outro manifesto de coleta que o da bateria designada (${designada.fonte})`);
  }

  const execucoesPorBraco: Record<string, number> = {};
  for (const i of incluidos) execucoesPorBraco[i.arm] = (execucoesPorBraco[i.arm] ?? 0) + 1;
  return {
    manifestVersion: ANALYSIS_MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    tela: telas[0],
    justificativa: o.justificativa.trim(),
    divergenciasRegistradas,
    fontes: fontes.map(f => ({
      fonte: f.fonte, stamp: f.battery.stamp ?? null,
      bateria: { path: relTo(root, f.path), sha256: f.sha256 },
      collectionManifest: { path: relTo(root, f.collection.path), sha256: f.collection.sha256 },
      slotsIncluidos: [...(incluidosPorFonte.get(f.fonte) ?? [])].sort((a, b) => a - b),
      slotsExcluidos: [...(excluidosPorFonte.get(f.fonte)?.keys() ?? [])].sort((a, b) => a - b),
    })),
    incluidos,
    excluidos: fontes.flatMap(f => [...(excluidosPorFonte.get(f.fonte) ?? new Map<number, string>())]
      .sort(([a], [b]) => a - b)
      .map(([slot, motivo]) => {
        const e = f.battery.execucoes.find(x => x.slot === slot)!;
        return { fonte: f.fonte, slot, arm: e.arm, collectionStatus: e.collectionStatus ?? null, exitCode: e.exitCode,
          apiErrorStatus: e.apiErrorStatus ?? null, motivo, elegivel: motivoDeRecusa(e, f.tela) === null };
      })),
    execucoesPorBraco,
    identidade,
    designada: {
      fonte: designada.fonte,
      collectionManifest: { path: relTo(root, designada.collection.path), sha256: designada.collection.sha256 },
      siteDir: relTo(root, siteDir),
      siteManifestSha256: site.manifestSha256,
      baseline: { path: relTo(root, baselinePath), sha256: sha256(baselineBytes), motivo: o.baseline.motivo.trim() },
    },
    dimensoesConferidas,
  };
}

// ───────────────────────────────────────────────────────────────── leitura (prepare)

export interface LoadedAnalysis {
  manifest: AnalysisManifest;
  sha256: string;
  path: string;
  /** Execuções incluídas, na ordem do manifesto, cada uma conferida contra o manifesto de coleta da SUA bateria. */
  runs: SelectedRun[];
  batteries: { fonte: string; path: string; bytes: Buffer }[];
  collectionManifestPath: string;
  baselinePath: string;
  siteDir: string;
}

/**
 * Lê o manifesto e confere que o mundo ainda é o que ele descreve: hash de cada bateria, de cada
 * manifesto de coleta, de cada arquivo de execução e da linha de base. Depois refaz a construção
 * inteira a partir das mesmas fontes e exige o mesmo resultado — assim as recusas da construção
 * (identidade, dimensões, contabilidade de slots) valem também para um manifesto editado à mão.
 */
export function readAnalysisManifest(path: string, root = ROOT): LoadedAnalysis {
  const bytes = readFileSync(path);
  const manifest = JSON.parse(bytes.toString("utf8")) as AnalysisManifest;
  if (manifest.manifestVersion !== ANALYSIS_MANIFEST_VERSION) throw new Error(`Manifesto de análise de versão desconhecida: ${manifest.manifestVersion}`);
  const hashDe = (rel: string): string => {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) throw new Error(`Manifesto de análise: ${rel} não existe`);
    return sha256(readFileSync(abs));
  };
  for (const f of manifest.fontes) {
    if (hashDe(f.bateria.path) !== f.bateria.sha256) throw new Error(`Manifesto de análise: a bateria ${f.fonte} mudou desde o manifesto (${f.bateria.path})`);
    if (hashDe(f.collectionManifest.path) !== f.collectionManifest.sha256) throw new Error(`Manifesto de análise: o manifesto de coleta de ${f.fonte} mudou`);
  }
  for (const i of manifest.incluidos) {
    if (hashDe(i.archive.path) !== i.archive.sha256) throw new Error(`Manifesto de análise: a execução ${i.fonte}:${i.slot} mudou (${i.archive.path})`);
  }
  if (hashDe(manifest.designada.baseline.path) !== manifest.designada.baseline.sha256) throw new Error("Manifesto de análise: a linha de base mudou");

  const refeito = buildAnalysisManifest({
    root,
    baterias: manifest.fontes.map(f => ({ fonte: f.fonte, path: f.bateria.path })),
    incluir: manifest.fontes.map(f => ({ fonte: f.fonte, slots: f.slotsIncluidos })),
    excluir: manifest.excluidos.map(e => ({ fonte: e.fonte, slot: e.slot, motivo: e.motivo })),
    justificativa: manifest.justificativa,
    designada: manifest.designada.fonte,
    baseline: { path: manifest.designada.baseline.path, motivo: manifest.designada.baseline.motivo },
    siteDir: manifest.designada.siteDir,
  });
  const semData = (m: AnalysisManifest) => JSON.stringify({ ...m, generatedAt: null });
  if (semData(refeito) !== semData(manifest)) {
    throw new Error("Manifesto de análise não confere com as fontes: refeito a partir delas, sai diferente do gravado (editado à mão?)");
  }

  const batteries = manifest.fontes.map(f => ({ fonte: f.fonte, path: resolve(root, f.bateria.path), bytes: readFileSync(resolve(root, f.bateria.path)) }));
  const runs = manifest.incluidos.map(i => {
    const f = batteries.find(b => b.fonte === i.fonte)!;
    const battery = JSON.parse(f.bytes.toString("utf8").replace(/^﻿/, "")) as Battery;
    const entry = battery.execucoes.find(e => e.slot === i.slot)!;
    return loadBatteryEntry(entry, telaOfBattery(battery)!, i.collectionManifestSha256, root);
  });
  return {
    manifest, sha256: sha256(bytes), path, runs, batteries,
    collectionManifestPath: resolve(root, manifest.designada.collectionManifest.path),
    baselinePath: resolve(root, manifest.designada.baseline.path),
    siteDir: resolve(root, manifest.designada.siteDir),
  };
}

// ───────────────────────────────────────────────────────────────── CLI

function valores(args: string[], name: string): string[] {
  const out: string[] = [];
  args.forEach((a, i) => {
    if (a !== name) return;
    const v = args[i + 1];
    if (!v || v.startsWith("--")) throw new Error(`Falta valor para ${name}`);
    out.push(v);
  });
  return out;
}
function unico(args: string[], name: string, required = true): string | undefined {
  const v = valores(args, name);
  if (v.length > 1) throw new Error(`${name} repetido`);
  if (!v.length && required) throw new Error(`Falta ${name}`);
  return v[0];
}

/** "A=caminho" */
export function parseBateria(value: string): { fonte: string; path: string } {
  const i = value.indexOf("=");
  if (i <= 0) throw new Error(`--bateria espera RÓTULO=ARQUIVO, recebeu "${value}"`);
  return { fonte: value.slice(0, i), path: value.slice(i + 1) };
}
/** "A:1,2,3" */
export function parseIncluir(value: string): { fonte: string; slots: number[] } {
  const m = /^([A-Za-z0-9_-]+):(\d+(?:,\d+)*)$/.exec(value);
  if (!m) throw new Error(`--incluir espera RÓTULO:SLOT[,SLOT...], recebeu "${value}"`);
  return { fonte: m[1], slots: m[2].split(",").map(Number) };
}
/** "A:5=motivo" */
export function parseExcluir(value: string): { fonte: string; slot: number; motivo: string } {
  const m = /^([A-Za-z0-9_-]+):(\d+)=([\s\S]+)$/.exec(value);
  if (!m) throw new Error(`--excluir espera RÓTULO:SLOT=MOTIVO, recebeu "${value}"`);
  return { fonte: m[1], slot: Number(m[2]), motivo: m[3] };
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "verify") {
    const loaded = readAnalysisManifest(resolve(unico(args, "--manifest")!));
    console.log(`Manifesto de análise conferido: ${loaded.runs.length} execução(ões) de ${loaded.manifest.fontes.length} bateria(s) · sha256 ${loaded.sha256}`);
    return;
  }
  if (command !== "build") {
    throw new Error("Uso: analysis-manifest.ts build --out ARQ.json --bateria RÓTULO=ARQ [--bateria ...] --incluir RÓTULO:1,2 [...]\n" +
      "         [--excluir \"RÓTULO:SLOT=MOTIVO\" ...] --designada RÓTULO --baseline ARQ --baseline-motivo TEXTO\n" +
      "         --justificativa TEXTO [--site-dir DIR]\n" +
      "       analysis-manifest.ts verify --manifest ARQ.json");
  }
  const out = resolve(unico(args, "--out")!);
  if (existsSync(out)) throw new Error(`${out} já existe: manifesto de análise nunca é reescrito; grave outro.`);
  const manifest = buildAnalysisManifest({
    baterias: valores(args, "--bateria").map(parseBateria),
    incluir: valores(args, "--incluir").map(parseIncluir),
    excluir: valores(args, "--excluir").map(parseExcluir),
    justificativa: unico(args, "--justificativa")!,
    designada: unico(args, "--designada")!,
    baseline: { path: unico(args, "--baseline")!, motivo: unico(args, "--baseline-motivo")! },
    siteDir: unico(args, "--site-dir", false),
  });
  mkdirSync(dirname(out), { recursive: true });
  const text = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(out, text, { flag: "wx" });
  console.log(`Manifesto de análise: ${out}`);
  console.log(`  tela ${manifest.tela} · ${Object.entries(manifest.execucoesPorBraco).map(([b, n]) => `${n} ${b}`).join(" + ")}`);
  for (const f of manifest.fontes) {
    console.log(`  ${f.fonte} ${f.stamp ?? f.bateria.path}: inclui ${f.slotsIncluidos.join(",") || "—"} · exclui ${f.slotsExcluidos.join(",") || "—"}`);
  }
  for (const e of manifest.excluidos) {
    console.log(`  fora ${e.fonte}:${e.slot} (${e.arm}): ${e.motivo}${e.elegivel ? "  ← ATENÇÃO: execução válida deixada de fora" : ""}`);
  }
  console.log(`  designada ${manifest.designada.fonte}: coleta ${manifest.designada.collectionManifest.sha256.slice(0, 12)} · linha de base ${manifest.designada.baseline.sha256.slice(0, 12)}`);
  if (manifest.divergenciasRegistradas.length) {
    console.log(`  ATENÇÃO — ${manifest.divergenciasRegistradas.length} divergência(s) fora da identidade, registradas no manifesto:`);
    for (const d of manifest.divergenciasRegistradas) {
      console.log(`    ${d.campo}: ${d.valores.map(v => `${v.fonte}=${v.valor}`).join(" · ").slice(0, 400)}`);
    }
  }
  console.log(`ANALYSIS_MANIFEST_SHA256=${sha256(text)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
