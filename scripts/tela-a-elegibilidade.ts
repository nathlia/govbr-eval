/**
 * Screen A eligibility, pass 1 (slice 8, decision D-49).
 *
 * Applies the mechanical criteria E1–E4 of docs/tela-a-procedimento-sorteio.md to
 * every KB rule, reading rule *fields* only, and assigns the stratum of § 3. It
 * never reads checker-aliases.json, the validator's src/, results/ or reports/
 * (blindness rule): whether the oracle has a checker for a rule is annotated
 * later, after this file is frozen.
 *
 * Pass 2 (E5–E7) is judged and lives in tela-a/elegibilidade-passo2.json, keyed
 * by rule id. When that file exists it is merged in; a rule that passed pass 1
 * and has no pass-2 entry stays `pendente`, so the output says how much is left.
 *
 * Output: tela-a/elegibilidade.json (all rules, accepted or rejected, with the
 * reason) and per-criterion / per-stratum counts on stdout.
 *
 * Usage: npm run tela-a:elegibilidade
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const KB_RULES = join(ROOT, "../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl");
const INVENTORY = join(ROOT, "tela-a/inventario.json");
const PASS2 = join(ROOT, "tela-a/elegibilidade-passo2.json");
const OUT = join(ROOT, "tela-a/elegibilidade.json");

interface KbRule {
  id: string;
  status: string;
  category: string;
  component: string | null;
  force: string;
  validationStrategy: string;
  standard?: string;
}

interface Inventory {
  sorteaveis: { componente: string }[];
  andaime: { componente: string }[];
}

interface Pass2Entry {
  aceita: boolean;
  /** `nao-manifesta` · `acoplada` · `sem-medicao` · `duplicada:<id>`; absent when accepted. */
  motivo?: string;
  /** One line: why it manifests and how it is measured, or why not. */
  justificativa: string;
  /** Inventory instance ids that can host the violation (E5); empty when rejected. */
  instancias: string[];
  /** Manifestations the rule admits, fixed before the draw (§ 4.5); absent when rejected. */
  variantes?: { id: string; descricao: string }[];
}

type Stratum = "K" | "T" | "E" | "C" | "S";

const FORCES = new Set(["required", "prohibited"]);
const STRATEGIES = new Set(["dom", "computed-style", "accessibility-tree", "keyboard-interaction", "semantic"]);
const COMPOSITION = new Set(["pattern", "page", "template", "foundation"]);

function pass1(rule: KbRule, drawable: Set<string>, scaffold: Set<string>): string | null {
  if (!FORCES.has(rule.force)) return "force";
  if (rule.status !== "stable") return "status";
  if (rule.component !== null && scaffold.has(rule.component)) return "scaffold";
  if (rule.component !== null && !drawable.has(rule.component)) return "component";
  if (!STRATEGIES.has(rule.validationStrategy)) return "strategy";
  return null;
}

/** First match wins (§ 3): K, T, E, C, then S. */
function stratum(rule: KbRule): Stratum {
  if (rule.validationStrategy === "keyboard-interaction") return "K";
  if (rule.validationStrategy === "computed-style") return "T";
  if (rule.standard === "eMAG") return "E";
  if (COMPOSITION.has(rule.category)) return "C";
  return "S";
}

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

const rulesText = readFileSync(KB_RULES, "utf8");
const rules: KbRule[] = rulesText.trim().split("\n").map(line => JSON.parse(line));
const inventory: Inventory = JSON.parse(readFileSync(INVENTORY, "utf8"));
const drawable = new Set(inventory.sorteaveis.map(c => c.componente));
const scaffold = new Set(inventory.andaime.map(c => c.componente));
const pass2: Record<string, Pass2Entry> = existsSync(PASS2) ? JSON.parse(readFileSync(PASS2, "utf8")).regras : {};

const entries = rules.map(rule => {
  const rejected = pass1(rule, drawable, scaffold);
  const judged = rejected === null ? pass2[rule.id] : undefined;
  return {
    id: rule.id,
    component: rule.component,
    pass1: rejected === null ? "aceita" : "rejeitada",
    pass2: rejected !== null ? null : judged === undefined ? "pendente" : judged.aceita ? "aceita" : "rejeitada",
    reason: rejected ?? judged?.motivo ?? null,
    justificativa: judged?.justificativa ?? null,
    instancias: judged?.instancias ?? [],
    variantes: judged?.variantes ?? [],
    stratum: rejected === null ? stratum(rule) : null,
  };
});

const orphans = Object.keys(pass2).filter(id => !entries.some(e => e.id === id && e.pass1 === "aceita"));
if (orphans.length > 0) {
  console.error(`elegibilidade-passo2.json julga regras que não passaram no passo 1: ${orphans.join(", ")}`);
  process.exit(1);
}

const survivors = entries.filter(e => e.pass1 === "aceita");
const eligible = survivors.filter(e => e.pass2 === "aceita");

writeFileSync(OUT, JSON.stringify({
  _meta: {
    procedimento: "docs/tela-a-procedimento-sorteio.md",
    kbRules: "govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl",
    kbRulesSha256: createHash("sha256").update(rulesText).digest("hex"),
    total: rules.length,
    passo1Aceitas: survivors.length,
    passo2Pendentes: survivors.filter(e => e.pass2 === "pendente").length,
    elegiveis: eligible.length,
    elegiveisPorEstrato: tally(eligible.map(e => e.stratum as string)),
  },
  regras: entries,
}, null, 2) + "\n");

console.log(`regras: ${rules.length}`);
console.log("passo 1 — rejeições:", tally(entries.filter(e => e.pass1 === "rejeitada").map(e => e.reason as string)));
console.log(`passo 1 — aceitas: ${survivors.length}`, tally(survivors.map(e => e.stratum as string)));
console.log(`passo 2 — pendentes: ${survivors.filter(e => e.pass2 === "pendente").length} · elegíveis: ${eligible.length}`,
  tally(eligible.map(e => e.stratum as string)));
