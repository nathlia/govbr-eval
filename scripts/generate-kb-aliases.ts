/**
 * Gera kb-aliases-v2.json (kb-aliases-2.0.0) a partir da KB do validator: a versão 3.7.0, da qual
 * o kb-aliases.json congelado saiu, MAIS a versão ativa (data/knowledge/manifest.json →
 * activeVersion, lida do manifesto dela: ruleFiles e legacyIds). Semântica em scripts/kb-aliases.ts.
 *
 * kb-aliases.json (kb-aliases-1, Fase 3.1) NÃO é mais escrito por este script: é o vocabulário com
 * que as campanhas arquivadas foram preparadas e pontuadas, e o sha256 dele está nos manifestos de
 * coleta. Reescrevê-lo mudaria números arquivados. ARQUIVO GERADO — nunca editar kb-aliases-v2.json
 * à mão; rodar `npm run kb:aliases` depois de uma atualização da KB. A saída é determinística (sem
 * carimbo de hora): o sha256 dela só muda quando a entrada muda, e é esse sha256 que entra na
 * identidade da análise.
 *
 * Uso: npm run kb:aliases [-- --validator <raiz do govbr-ds-validator>] [--check]
 *   --check  não grava; sai com código 1 se o arquivo gravado difere do que seria gerado.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KB_ALIASES_V2_VERSION, buildKbAliases, type KbRuleRecord, type LegacyIdEntry } from "./kb-aliases";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const VALIDATOR = resolve(opt("validator") ?? join(ROOT, "../govbr-ds-validator"));
const KNOWLEDGE = join(VALIDATOR, "data/knowledge");
export const KB_ALIASES_V2_FILE = "kb-aliases-v2.json";
const OUT = join(ROOT, KB_ALIASES_V2_FILE);
/** A versão de que o kb-aliases.json congelado saiu. Fixa: é a origem dele, não uma escolha. */
const BASE_VERSION = "3.7.0";

const sha = (b: Buffer | string): string => createHash("sha256").update(b).digest("hex");
const rel = (p: string): string => `govbr-ds-validator/${p.slice(VALIDATOR.length + 1).replace(/\\/g, "/")}`;
function jsonl(path: string): { rules: KbRuleRecord[]; sha256: string } {
  const bytes = readFileSync(path);
  return { rules: bytes.toString("utf8").split("\n").filter(l => l.trim()).map(l => JSON.parse(l) as KbRuleRecord), sha256: sha(bytes) };
}

const topManifest = JSON.parse(readFileSync(join(KNOWLEDGE, "manifest.json"), "utf8")) as { activeVersion?: string };
const activeVersion = topManifest.activeVersion ?? BASE_VERSION;
const activeDir = join(KNOWLEDGE, "versions", activeVersion);
const activeManifestPath = join(activeDir, "manifest.json");
const activeManifest = existsSync(activeManifestPath)
  ? JSON.parse(readFileSync(activeManifestPath, "utf8")) as { ruleFiles?: string[]; legacyIds?: string }
  : {};
const ruleFiles = activeManifest.ruleFiles ?? ["normalized/rules.jsonl"];

const fontes: { path: string; sha256: string }[] = [];
const base = jsonl(join(KNOWLEDGE, "versions", BASE_VERSION, "normalized/rules.jsonl"));
fontes.push({ path: rel(join(KNOWLEDGE, "versions", BASE_VERSION, "normalized/rules.jsonl")), sha256: base.sha256 });

const activeRules: KbRuleRecord[] = [];
for (const f of ruleFiles) {
  const p = join(activeDir, f);
  const r = jsonl(p);
  activeRules.push(...r.rules);
  fontes.push({ path: rel(p), sha256: r.sha256 });
}
let legacy: LegacyIdEntry[] = [];
if (activeManifest.legacyIds) {
  const p = join(activeDir, activeManifest.legacyIds);
  const bytes = readFileSync(p);
  legacy = (JSON.parse(bytes.toString("utf8")) as { entries: LegacyIdEntry[] }).entries;
  fontes.push({ path: rel(p), sha256: sha(bytes) });
}

const built = buildKbAliases({
  base: { version: BASE_VERSION, rules: base.rules },
  active: { version: activeVersion, rules: activeRules, legacy },
});

const out = {
  _meta: {
    version: KB_ALIASES_V2_VERSION,
    generatedBy: "scripts/generate-kb-aliases.ts — não editar à mão (npm run kb:aliases)",
    kbVersions: { base: BASE_VERSION, active: activeVersion },
    sources: fontes,
    semantica: "um id da KB expande para as chaves emag:/wcag: que o próprio registro declara (emagReferences/wcagReferences; no e-MAG sem emagReferences, o número da recomendação em source.section) e para os ids ligados por substituição declarada (legacy-ids supersededBy, supersedes/supersededBy/legacy no registro), nos dois sentidos, só dentro do mesmo componente e da mesma família de norma. Id presente nas duas versões: união das chaves. Um salto, aplicado aos dois lados.",
    ids: built.counts.ids,
    idsComChaveDeNorma: built.counts.comChaveDeNorma,
    chavesDaSecaoDaFonte: built.counts.chaveDaSecao,
    substituicoes: { ligadas: built.supersession.links, recusadas: built.supersession.recusadas, semDestino: built.supersession.semDestino },
  },
  aliases: built.aliases,
};
const text = JSON.stringify(out, null, 2) + "\n";

if (args.includes("--check")) {
  const atual = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
  if (atual !== text) { console.error(`${KB_ALIASES_V2_FILE} difere do que a KB ativa (${activeVersion}) gera — rode npm run kb:aliases`); process.exit(1); }
  console.log(`${KB_ALIASES_V2_FILE} confere com a KB ativa (${activeVersion})`);
} else {
  writeFileSync(OUT, text, "utf8");
  console.log(`${KB_ALIASES_V2_FILE} (${KB_ALIASES_V2_VERSION}, sha256 ${sha(text).slice(0, 12)}): base ${BASE_VERSION} + ativa ${activeVersion}`);
  console.log(`  ${built.counts.ids} ids, ${built.counts.comChaveDeNorma} com chave emag:/wcag:, ${built.counts.chaveDaSecao} com chave lida de source.section`);
  console.log(`  substituições ligadas ${built.supersession.links}, recusadas ${built.supersession.recusadas.length}, sem destino ${built.supersession.semDestino.length}`);
  for (const r of built.supersession.recusadas) console.log(`    recusada ${r.from} → ${r.to}: ${r.motivo}`);
  for (const s of built.supersession.semDestino) console.log(`    sem destino ${s}`);
}
