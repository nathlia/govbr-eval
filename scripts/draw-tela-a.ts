/**
 * Screen A defect draw (slice 8, decision D-49) — docs/tela-a-procedimento-sorteio.md § 4.
 *
 * Order by hash, no random-number generator: key(L, x) = sha256(seed|L|x), sort
 * ascending, take from the top. The seed is the full hash of the govbr-eval
 * commit that froze the procedure, and the script refuses to run unless every
 * file it reads is byte-identical to that commit — so nothing the draw depends
 * on can change after the seed exists.
 *
 * Reads only tela-a/{inventario,elegibilidade,parametros}.json. It knows nothing
 * about the oracle's checkers.
 *
 * Usage:
 *   npm run tela-a:sorteio -- --seed <40-hex commit>   writes tela-a/sorteio.json (refuses to overwrite)
 *   npm run tela-a:sorteio -- --ensaio <any text>      rehearsal: prints counts only, writes nothing
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FROZEN = [
  "docs/tela-a-procedimento-sorteio.md",
  "tela-a/inventario.json",
  "tela-a/elegibilidade-passo2.json",
  "tela-a/elegibilidade.json",
  "tela-a/parametros.json",
  "scripts/tela-a-elegibilidade.ts",
  "scripts/draw-tela-a.ts",
];
const OUT = join(ROOT, "tela-a/sorteio.json");
const MAX_PER_INSTANCE = 2;

type Stratum = "K" | "T" | "E" | "C" | "S";

interface Rule {
  id: string;
  pass2: string | null;
  stratum: Stratum | null;
  instancias: string[];
  variantes: { id: string; descricao: string }[];
}

interface Params {
  ordemEstratos: Stratum[];
  cotas: Record<Stratum, number>;
  ordemDeficit: Stratum[];
  compartilhadas: number;
  chamarizes: number;
}

interface Inventory {
  sorteaveis: { componente: string; instancias: { id: string }[] }[];
  andaime: { componente: string; instancias: { id: string }[] }[];
}

interface Spec {
  regra: string;
  estrato: Stratum;
  instancia: string;
  variante: string;
  compartilhadaCom: string[];
}

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
const sha256 = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");

const args = process.argv.slice(2);
const rehearsal = args.includes("--ensaio");
const seed = args[args.indexOf(rehearsal ? "--ensaio" : "--seed") + 1];
if (!seed || (!rehearsal && !args.includes("--seed"))) {
  console.error("uso: --seed <commit de 40 hex> | --ensaio <texto>");
  process.exit(1);
}

if (!rehearsal) {
  if (!/^[0-9a-f]{40}$/.test(seed)) throw new Error("a semente é o hash completo (40 hex) do commit do procedimento");
  if (existsSync(OUT)) throw new Error("tela-a/sorteio.json já existe: o sorteio é único, sem repetição");
  const git = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
  git("cat-file", "-e", `${seed}^{commit}`);
  const drift = git("diff", "--name-only", seed, "--", ...FROZEN).trim();
  if (drift) throw new Error(`arquivos diferem do commit da semente:\n${drift}`);
  if (readFileSync(join(ROOT, FROZEN[0]), "utf8").includes("**Status:** DRAFT")) throw new Error("o procedimento ainda está marcado como DRAFT");
}

const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);
const byKey = <T>(label: string, items: T[], idOf: (item: T) => string): T[] =>
  [...items].sort((a, b) => key(label, idOf(a)).localeCompare(key(label, idOf(b))));

const params = readJson<Params>("tela-a/parametros.json");
const inventory = readJson<Inventory>("tela-a/inventario.json");
const eligible = readJson<{ regras: Rule[] }>("tela-a/elegibilidade.json").regras.filter(r => r.pass2 === "aceita");

const componentOf = new Map<string, string>();
for (const c of inventory.sorteaveis) for (const i of c.instancias) if (!componentOf.has(i.id)) componentOf.set(i.id, c.componente);

// Effective quotas: a stratum gives what it has; missing slots go down ordemDeficit while room remains.
const available = (s: Stratum) => eligible.filter(r => r.stratum === s).length;
const quotas = Object.fromEntries(params.ordemEstratos.map(s => [s, Math.min(params.cotas[s], available(s))])) as Record<Stratum, number>;
let deficit = params.ordemEstratos.reduce((sum, s) => sum + params.cotas[s] - quotas[s], 0);
for (const s of params.ordemDeficit) while (deficit > 0 && quotas[s] < available(s)) { quotas[s]++; deficit--; }

// One instance carries at most MAX_PER_INSTANCE defects, never two of the same stratum.
const load = new Map<string, Stratum[]>();
const fits = (instance: string, s: Stratum) => {
  const held = load.get(instance) ?? [];
  return held.length < MAX_PER_INSTANCE && !held.includes(s);
};
const occupy = (instance: string, s: Stratum) => load.set(instance, [...(load.get(instance) ?? []), s]);

const queues = Object.fromEntries(params.ordemEstratos.map(s =>
  [s, byKey("regra", eligible.filter(r => r.stratum === s), r => r.id)])) as Record<Stratum, Rule[]>;
const order = Object.fromEntries(params.ordemEstratos.map(s => [s, queues[s].map(r => r.id)]));
const next = Object.fromEntries(params.ordemEstratos.map(s => [s, 0])) as Record<Stratum, number>;
const specs: Spec[] = [];
const discards: { regra: string; motivo: string }[] = [];

/** Walks the stratum's written order from where it stopped; returns how many of `wanted` it could not place. */
function drawFrom(s: Stratum, wanted: number): number {
  while (wanted > 0 && next[s] < queues[s].length) {
    const rule = queues[s][next[s]++];
    const host = byKey(`instancia:${rule.id}`, rule.instancias, i => i).find(i => fits(i, s));
    if (host === undefined) { discards.push({ regra: rule.id, motivo: "sem-instancia-livre" }); continue; }
    occupy(host, s);
    const variant = byKey(`variante:${rule.id}`, rule.variantes, v => v.id)[0];
    specs.push({ regra: rule.id, estrato: s, instancia: host, variante: variant.id, compartilhadaCom: [] });
    wanted--;
  }
  return wanted;
}

// A stratum emptied by discards hands its missing slots down ordemDeficit, like any other shortfall.
let unplaced = 0;
for (const s of params.ordemEstratos) unplaced += drawFrom(s, quotas[s]);
for (const s of params.ordemDeficit) unplaced = drawFrom(s, unplaced);
deficit += unplaced;

// Shared: the spec spreads to the other instances of its host's component that the rule can also manifest on.
let shared = 0;
for (const spec of byKey("compartilhada", specs, s => s.regra)) {
  if (shared === params.compartilhadas) break;
  const rule = eligible.find(r => r.id === spec.regra) as Rule;
  const siblings = rule.instancias.filter(i => i !== spec.instancia && componentOf.get(i) === componentOf.get(spec.instancia));
  if (siblings.length === 0 || !siblings.every(i => fits(i, spec.estrato))) continue;
  for (const i of siblings) occupy(i, spec.estrato);
  spec.compartilhadaCom = siblings;
  shared++;
}

const allInstances = [...new Set([...inventory.sorteaveis, ...inventory.andaime].flatMap(c => c.instancias.map(i => i.id)))];
const decoys = byKey("chamariz", allInstances.filter(i => !load.has(i)), i => i).slice(0, params.chamarizes);

const result = {
  _meta: {
    procedimento: FROZEN[0],
    semente: seed,
    ensaio: rehearsal,
    sha256: Object.fromEntries(FROZEN.map(f => [f, sha256(readFileSync(join(ROOT, f)))])),
  },
  cotasEfetivas: quotas,
  deficitNaoAlocado: deficit,
  ordemPorEstrato: order,
  specs,
  compartilhadas: shared,
  chamarizes: decoys,
  descartes: discards,
};

if (rehearsal) {
  console.log("ENSAIO — nada gravado; este resultado não é o sorteio.");
  console.log("cotas efetivas:", quotas, "· déficit não alocado:", deficit);
  console.log(`specs: ${specs.length} · compartilhadas: ${shared} · chamarizes: ${decoys.length} · descartes: ${discards.length}`);
} else {
  writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
  console.log(`tela-a/sorteio.json gravado — specs: ${specs.length} · compartilhadas: ${shared} · chamarizes: ${decoys.length} · descartes: ${discards.length}`);
}
