/**
 * Vocabulário de aliases da KB: construção (pura, testável) e carga por versão de pontuação.
 *
 * Duas gerações, cada uma num arquivo próprio e nunca reescrita depois de usada:
 *
 *   kb-aliases.json     — kb-aliases-1 (Fase 3.1): só a KB 3.7.0 (186 regras). CONGELADO: foi com
 *                         ele que todas as campanhas arquivadas foram preparadas e pontuadas, e o
 *                         sha256 dele está nos manifestos de coleta. Serve a pontuação por citação
 *                         (TC-*, score:fluxo:legacy, adjudicação) e as versões semânticas legadas.
 *   kb-aliases-v2.json  — kb-aliases-2.0.0: KB 3.7.0 + versão ATIVA do validator (manifest
 *                         `activeVersion`, hoje a literal 3.7.0-literal-2026-10-15). Serve a versão
 *                         semântica vigente (instrument.json → scoring.kbAliases).
 *
 * Quem escolhe o arquivo é a versão de pontuação (instrument.json), nunca o caminho do código: o
 * defeito que o log acompanha desde o D-13 é exatamente uma dimensão (aqui, o vocabulário) que uma
 * parte do código conhece e a outra não. O arquivo aplicado entra na identidade da análise
 * (`analysisIdentity().kbAliasesApplied`) e na chave de configuração do score TC-*.
 *
 * Semântica v2 (um salto, aplicado dos dois lados como sempre): um id da KB expande para
 *   (a) as chaves de norma que o PRÓPRIO registro declara — `emagReferences` → emag:X.Y,
 *       `wcagReferences` → wcag:X.Y.Z; num registro do e-MAG sem `emagReferences`, o número da
 *       recomendação no título da seção da fonte (`source.section`, "Recomendação 6.2 – …"). Nada
 *       é inferido de texto livre;
 *   (b) os ids ligados por substituição DECLARADA na KB (`supersededBy` em legacy-ids.json, ou
 *       `supersedes`/`supersededBy`/`legacy.supersededBy` no próprio registro), nos dois sentidos,
 *       só quando antigo e novo são do MESMO componente e da MESMA família de norma. Ligação que
 *       cruza componente ou família é recusada e listada em `_meta.recusadas`.
 * Um id presente nas duas versões recebe a união das chaves das duas (o alias antigo não some).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RuleId } from "../types";

export const KB_ALIASES_V2_VERSION = "kb-aliases-2.0.0";
/** Rótulo do arquivo congelado (ele mesmo não traz versão no _meta; não pode ser reescrito). */
export const KB_ALIASES_V1_VERSION = "kb-aliases-1";

/** Registro de regra como os dois formatos da KB o gravam; campos ausentes são tolerados. */
export interface KbRuleRecord {
  id: string;
  force?: string;
  standard?: string | null;
  component?: string | null;
  wcagReferences?: string[];
  emagReferences?: string[];
  source?: { section?: string | null } | null;
  supersedes?: string[];
  supersededBy?: string[];
  legacy?: { supersededBy?: string[] } | null;
}
export interface LegacyIdEntry { id: string; class?: string; supersededBy?: string[]; record?: KbRuleRecord }

export interface KbAliasInputs {
  /** Versão da qual kb-aliases-1 foi gerado (3.7.0). */
  base: { version: string; rules: KbRuleRecord[] };
  /** Versão ativa do validator: regras (literais + transportadas) e ids legados. */
  active: { version: string; rules: KbRuleRecord[]; legacy: LegacyIdEntry[] };
}

export interface KbAliasRefusal { from: string; to: string; motivo: string }
export interface KbAliasBuild {
  aliases: Record<string, string[]>;
  supersession: { links: number; recusadas: KbAliasRefusal[]; semDestino: string[] };
  counts: { ids: number; comChaveDeNorma: number; chaveDaSecao: number };
}

/** Família de norma: e-MAG ou o próprio DS. Grafias "eMAG"/"e-MAG" são a mesma. */
export function familiaDaNorma(r: KbRuleRecord): "emag" | "ds" {
  if (r.standard && /e-?mag/i.test(r.standard)) return "emag";
  return "ds";
}

function chavesDeNorma(r: KbRuleRecord): { keys: Set<string>; daSecao: boolean } {
  const keys = new Set<string>();
  for (const ref of r.emagReferences ?? []) {
    const m = ref.match(/(\d+\.\d+)/);
    if (m) keys.add(`emag:${m[1]}`);
  }
  for (const ref of r.wcagReferences ?? []) {
    const m = ref.match(/(\d+\.\d+\.\d+)/);
    if (m) keys.add(`wcag:${m[1]}`);
  }
  let daSecao = false;
  if (familiaDaNorma(r) === "emag" && !(r.emagReferences ?? []).length) {
    const m = r.source?.section?.match(/Recomenda[çc][ãa]o\s+(\d+\.\d+)/i);
    if (m) { keys.add(`emag:${m[1]}`); daSecao = true; }
  }
  return { keys, daSecao };
}

const normativa = (r: KbRuleRecord): boolean => r.force !== "example"; // evidência nunca é norma citável (D-10)

/** Constrói o mapa v2. Determinístico: mesma entrada, mesmos bytes. */
export function buildKbAliases(input: KbAliasInputs): KbAliasBuild {
  const sets = new Map<string, Set<string>>();
  const records = new Map<string, KbRuleRecord>();
  let chaveDaSecao = 0;
  const add = (r: KbRuleRecord): void => {
    if (!normativa(r)) return;
    const { keys, daSecao } = chavesDeNorma(r);
    if (daSecao) chaveDaSecao++;
    const set = sets.get(r.id) ?? new Set<string>();
    for (const k of keys) set.add(k);
    sets.set(r.id, set);
    // O registro da versão ativa prevalece para componente/família (é a leitura vigente da regra).
    records.set(r.id, r);
  };
  for (const r of input.base.rules) add(r);
  // Registros legados (antigos ausentes da versão ativa) mantêm as próprias chaves.
  for (const e of input.active.legacy) if (e.record) add({ ...e.record, id: e.id });
  for (const r of input.active.rules) add(r);

  // Ligações de substituição declaradas, de qualquer um dos lugares onde a KB as grava.
  const pares: [string, string][] = [];
  for (const e of input.active.legacy) for (const to of e.supersededBy ?? []) pares.push([e.id, to]);
  for (const r of input.active.rules) {
    for (const to of r.supersededBy ?? []) pares.push([r.id, to]);
    for (const to of r.legacy?.supersededBy ?? []) pares.push([r.id, to]);
    for (const from of r.supersedes ?? []) pares.push([from, r.id]);
  }
  const vistos = new Set<string>();
  const recusadas: KbAliasRefusal[] = [];
  const semDestino: string[] = [];
  let links = 0;
  for (const [from, to] of pares) {
    const chave = `${from}\u0000${to}`;
    if (vistos.has(chave) || from === to) continue;
    vistos.add(chave);
    const a = records.get(from);
    const b = records.get(to);
    if (!a || !b) { semDestino.push(`${from} → ${to}`); continue; }
    if ((a.component ?? null) !== (b.component ?? null)) {
      recusadas.push({ from, to, motivo: `componente diferente (${a.component ?? "global"} → ${b.component ?? "global"})` });
      continue;
    }
    if (familiaDaNorma(a) !== familiaDaNorma(b)) {
      recusadas.push({ from, to, motivo: `família de norma diferente (${familiaDaNorma(a)} → ${familiaDaNorma(b)})` });
      continue;
    }
    if (!normativa(a) || !normativa(b)) { recusadas.push({ from, to, motivo: "registro de evidência (force example)" }); continue; }
    sets.get(from)!.add(to);
    sets.get(to)!.add(from);
    links++;
  }

  const aliases: Record<string, string[]> = {};
  for (const id of [...sets.keys()].sort()) aliases[id] = [...sets.get(id)!].sort();
  const comChaveDeNorma = Object.values(aliases).filter(v => v.some(k => !k.startsWith("govbr-"))).length;
  return { aliases, supersession: { links, recusadas, semDestino: semDestino.sort() }, counts: { ids: Object.keys(aliases).length, comChaveDeNorma, chaveDaSecao } };
}

// ── carga ──────────────────────────────────────────────────────────────────────

export interface KbAliasVocabulary {
  /** Rótulo da geração do arquivo (kb-aliases-1, kb-aliases-2.0.0). */
  version: string;
  /** Caminho relativo à raiz do govbr-eval. */
  file: string;
  /** sha256 dos BYTES do arquivo: é o que entra na identidade e na chave de configuração. */
  sha256: string;
  aliases: Record<string, string[]>;
}

/** Carrega um arquivo de aliases; ausente é erro (vocabulário vazio mudaria números em silêncio). */
export function loadKbAliasVocabulary(root: string, file: string): KbAliasVocabulary {
  const abs = join(root, file);
  if (!existsSync(abs)) throw new Error(`Arquivo de aliases da KB ausente: ${file} (npm run kb:aliases)`);
  const bytes = readFileSync(abs);
  const parsed = JSON.parse(bytes.toString("utf8")) as { _meta?: { version?: string }; aliases: Record<string, string[]> };
  return {
    version: parsed._meta?.version ?? KB_ALIASES_V1_VERSION,
    file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    aliases: parsed.aliases,
  };
}

/** Vocabulário em memória (testes). */
export function vocabularyOf(aliases: Record<string, string[]>, version = "teste", file = "(memória)"): KbAliasVocabulary {
  return { version, file, sha256: createHash("sha256").update(JSON.stringify(aliases)).digest("hex"), aliases };
}

/** Rótulo curto para chaves de configuração: `kb-aliases-2.0.0@1a2b3c4d`. */
export const rotuloDoVocabulario = (v: KbAliasVocabulary): string => `${v.version}@${v.sha256.slice(0, 12)}`;

export function expandWith(vocab: KbAliasVocabulary, rules: RuleId[]): RuleId[] {
  const out = new Set(rules);
  for (const r of rules) for (const alias of vocab.aliases[r] ?? []) out.add(alias);
  return [...out];
}
