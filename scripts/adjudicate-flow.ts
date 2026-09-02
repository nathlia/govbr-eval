/**
 * Workbench cego para achados sem unidade da suíte de fluxo (D-28 / Phase 10.3).
 * Usa o MESMO hash e o MESMO adjudications.json da suíte TC, mas unidades E-* deixam explícito
 * que a identidade aqui é o elemento canônico, não um caso TC-*.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AdjudicationRecord, Adjudications, FlowAgentResults, FlowGroundTruth } from "../types";
import { ADJUDICATIONS_FILE, ROOT, loadAdjudications, recordDefect } from "./adjudication";
import { resolveSelectors } from "./anchors";
import {
  buildFlowUnits, scoreFlow, selectorsOfGroundTruth, selectorsOfRuns,
} from "./units-flow";

const VERBOSE = process.argv.includes("--verbose");
const EMIT = process.argv.includes("--emit");
const BLIND = process.argv.includes("--blind");
const RUN_FILTER = (process.argv.find(a => a.startsWith("--run=")) ?? "")
  .slice("--run=".length).split(",").map(s => s.trim()).filter(Boolean);
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const FLOW_DIRS = [
  { dir: "runs-fluxo", arm: "com-oraculo" },
  { dir: "runs-fluxo-ablacao", arm: "sem-oraculo" },
];

interface LoadedRun { file: string; dir: string; arm: string; data: FlowAgentResults }
interface Claim {
  id: string;
  caseId: string;
  elementLabel: string;
  selector: string;
  description: string;
  rules: string[];
  categories: string[];
  seenIn: { run: string; arm: string }[];
}

function loadRuns(): LoadedRun[] {
  const runs: LoadedRun[] = [];
  for (const { dir, arm } of FLOW_DIRS) {
    const abs = join(ROOT, "results", dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs).filter(f => f.startsWith("agent-") && f.endsWith(".json")).sort()) {
      if (RUN_FILTER.length && !RUN_FILTER.some(p => file.includes(p) || dir.includes(p))) continue;
      try {
        runs.push({ file, dir, arm, data: JSON.parse(readFileSync(join(abs, file), "utf8")) as FlowAgentResults });
      } catch { /* arquivo inválido é reportado pelo scorer; não vira alegação */ }
    }
  }
  return runs;
}

function armsOf(claim: Claim): string[] {
  return [...new Set(claim.seenIn.map(s => s.arm))].sort();
}

async function main(): Promise<void> {
  const gt = JSON.parse(readFileSync(join(ROOT, "ground-truth-fluxo.json"), "utf8")) as FlowGroundTruth;
  const runs = loadRuns();
  const url = new URL(gt._meta.url, APP_URL).toString();
  const res = await resolveSelectors(
    url,
    [...selectorsOfGroundTruth(gt), ...selectorsOfRuns(runs.map(r => r.data))],
    { waitFor: gt._meta.waitFor, setup: gt._meta.setup },
  );
  const { units, defects } = buildFlowUnits(gt, res);
  if (defects.length) throw new Error(`Gabarito de fluxo inválido: ${defects.map(d => `${d.specId}: ${d.problem}`).join("; ")}`);

  const claims = new Map<string, Claim>();
  for (const run of runs) {
    const score = scoreFlow(run.data, units, res);
    for (const finding of score.leftovers) {
      const existing = claims.get(finding.id);
      if (existing) existing.seenIn.push({ run: run.file, arm: run.arm });
      else claims.set(finding.id, {
        id: finding.id,
        caseId: finding.elementId,
        elementLabel: finding.elementLabel,
        selector: finding.selector,
        description: finding.description,
        rules: finding.rules,
        categories: finding.categories,
        seenIn: [{ run: run.file, arm: run.arm }],
      });
    }
  }

  const adj = loadAdjudications();
  const flowRecords = adj.records.filter(record => record.caseId.startsWith("E-"));
  const decided = [...claims.values()].filter(claim => {
    const record = adj.byId.get(claim.id);
    return record && record.verdict !== null && !recordDefect(record);
  });
  const pending = [...claims.values()].filter(claim => !decided.includes(claim));

  if (EMIT) {
    const parsed = adj.present
      ? JSON.parse(readFileSync(join(ROOT, ADJUDICATIONS_FILE), "utf8")) as Adjudications
      : { _meta: {}, adjudications: [] as AdjudicationRecord[] };
    const byId = new Map(parsed.adjudications.map(record => [record.id, record]));
    let added = 0;
    for (const claim of claims.values()) {
      const existing = byId.get(claim.id);
      if (existing) {
        existing.finding = claim.description;
        existing.seenIn = claim.seenIn;
      } else {
        byId.set(claim.id, {
          id: claim.id,
          caseId: claim.caseId,
          finding: claim.description,
          seenIn: claim.seenIn,
          verdict: null,
          rationale: "",
        });
        added++;
      }
    }
    const out: Adjudications = {
      _meta: {
        ...parsed._meta,
        atualizado: new Date().toISOString().slice(0, 10),
        adjudicacoes: [...byId.values()].filter(r => r.verdict !== null).length,
        pendentes: [...byId.values()].filter(r => r.verdict === null).length,
      },
      adjudications: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
    writeFileSync(join(ROOT, ADJUDICATIONS_FILE), JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`adjudications.json (fluxo): +${added} stub(s), ${claims.size} alegação(ões) de fluxo.`);
    return;
  }

  console.log("\n=== Adjudicação de fluxo — achados sem unidade (D-28) ===\n");
  console.log(`Execuções varridas: ${FLOW_DIRS.map(d => d.dir).join(", ")} (smoke fora, por desenho)`);
  console.log(`Alegações distintas sem unidade: ${claims.size} · julgadas: ${decided.length} · pendentes: ${pending.length}`);

  const recordDefects = flowRecords.flatMap(record => {
    const defect = recordDefect(record);
    if (defect) return [`${record.id}: ${defect}`];
    if (!claims.has(record.id)) return [`${record.id}: nenhum achado de fluxo arquivado corresponde ao registro`];
    return [];
  });
  if (recordDefects.length) {
    console.log(`\n!! ${recordDefects.length} registro(s) de fluxo não aplicável(is):`);
    for (const defect of recordDefects) console.log(`   - ${defect}`);
  }

  if (!pending.length) return;
  console.log(`\n── Pendentes (${pending.length}) — contadas como FP até julgamento independente`);
  if (BLIND) console.log("   modo cego: braço e execução omitidos; ordem pelo hash do achado.\n");
  else console.log("   proveniência visível; use --blind para formar o veredito sem conhecer o braço.\n");

  const listing = BLIND
    ? [...pending].sort((a, b) => a.id.slice(-8).localeCompare(b.id.slice(-8)))
    : [...pending].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.id.localeCompare(b.id));
  for (const claim of listing) {
    const provenance = BLIND ? "" : ` [${armsOf(claim).join(" + ")}] ×${claim.seenIn.length}`;
    console.log(`  ${claim.id}${provenance}`);
    console.log(`    ${claim.elementLabel} · ${claim.selector}`);
    const text = VERBOSE || BLIND ? claim.description : claim.description.slice(0, 110) + (claim.description.length > 110 ? "…" : "");
    console.log(`    ${text}`);
    console.log(`    regras citadas: ${claim.rules.join(", ") || "(nenhuma reconhecida)"} · categorias: ${claim.categories.join(", ")}`);
  }
  console.log("\nProcedimento: docs/adjudicacao.md");
}

main().catch(error => { console.error(error); process.exit(1); });
