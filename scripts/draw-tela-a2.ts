/**
 * Sorteio dos defeitos da tela A2 (NAT-110, D-141, revisão R4) — regra em tela-a2/parametros.json.
 *
 * Ordem por hash, sem gerador aleatório: key(L, x) = sha256(semente|L|x), crescente, do topo.
 * A semente é o hash completo do commit do govbr-eval que congela os arquivos de
 * parametros.congelados. O script lê só tela-a2/{inventario,elegibilidade,parametros}.json e,
 * para conferir, o corpus literal oficial (via scripts/tela-a2-universo.ts). Não sabe nada dos
 * checkers do oráculo.
 *
 * Uso:
 *   npm run tela-a2:sorteio -- --validar          confere entradas, sha256 e viabilidade; NÃO sorteia
 *   npm run tela-a2:sorteio -- --selar            grava os sha256 dos insumos em parametros.json (antes do commit da semente)
 *   npm run tela-a2:sorteio -- --semente <40 hex> sorteio único; grava tela-a2/sorteio.json e recusa repetir
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildUniverse, CORPUS } from "./tela-a2-universo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PARAMS = "tela-a2/parametros.json";
const OUT = join(ROOT, "tela-a2/sorteio.json");
/** Conferidos por sha256 gravado (os demais congelados só pelo git: parametros não guarda o próprio hash). */
const HASHED = ["tela-a2/inventario.json", "tela-a2/universo.json", "tela-a2/elegibilidade-passo2.json", "tela-a2/elegibilidade.json", "scripts/tela-a2-universo.ts"];

type Estrato = "DS" | "G";
interface Variante { id: string; descricao: string; instancias?: string[] }
interface Regra { id: string; passo2: string | null; estrato: Estrato | null; instancias: string[]; variantes: Variante[]; alternativasValidas: Variante[] }
interface Params {
  _meta: { status: string };
  ordemEstratos: Estrato[];
  cotas: Record<Estrato, number>;
  ordemDeficit: Estrato[];
  maxPorInstancia: number;
  compartilhadas: number;
  alternativasValidas: number;
  chamarizes: number;
  congelados: string[];
  sha256: { corpusManifest: string; arquivos: Record<string, string> };
}
interface Inventory { sorteaveis: { componente: string; instancias: { id: string }[] }[]; andaime: { componente: string; instancias: { id: string }[] }[] }
interface Spec { regra: string; estrato: Estrato; instancia: string; variante: string; compartilhadaCom: string[] }

const sha256 = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel));
const readJson = <T>(rel: string): T => JSON.parse(readRaw(rel).toString("utf8"));
const fail = (msg: string): never => { console.error(`RECUSADO: ${msg}`); process.exit(1); };

const args = process.argv.slice(2);
const mode = args.includes("--selar") ? "selar" : args.includes("--validar") ? "validar" : args.includes("--semente") ? "sortear" : null;
if (!mode) fail("uso: --validar | --selar | --semente <commit de 40 hex>");

/** Confere que o universo gravado é exatamente o que o corpus oficial produz hoje. */
function checkInputs(params: Params, strict: boolean) {
  const manifestSha = sha256(readFileSync(join(CORPUS, "MANIFEST.json")));
  if (manifestSha !== params.sha256.corpusManifest) fail(`MANIFEST do corpus diverge: ${manifestSha}`);
  const fresh = buildUniverse(); // também confere o sha256 de cada arquivo do corpus contra o MANIFEST
  const stored = readJson<{ unidades: { id: string; texto: string }[] }>("tela-a2/universo.json").unidades;
  if (JSON.stringify(fresh.unidades.map(u => [u.id, u.texto])) !== JSON.stringify(stored.map(u => [u.id, u.texto]))) fail("tela-a2/universo.json não é o que o corpus oficial produz");
  const elig = readJson<{ regras: Regra[] }>("tela-a2/elegibilidade.json").regras;
  if (elig.length !== stored.length || elig.some((r, i) => r.id !== stored[i].id)) fail("elegibilidade.json não cobre o universo na mesma ordem");
  if (elig.some(r => r.passo2 === "pendente")) fail("há unidades pendentes no passo 2");
  if (strict) {
    for (const rel of HASHED) {
      const want = params.sha256.arquivos[rel];
      if (!want) fail(`sha256 não selado para ${rel} (rode --selar antes do commit da semente)`);
      if (sha256(readRaw(rel)) !== want) fail(`${rel} difere do sha256 selado em parametros.json`);
    }
  }
  return elig;
}

const params = readJson<Params>(PARAMS);

if (mode === "selar") {
  checkInputs(params, false);
  params.sha256.arquivos = Object.fromEntries(HASHED.map(rel => [rel, sha256(readRaw(rel))]));
  writeFileSync(join(ROOT, PARAMS), JSON.stringify(params, null, 2) + "\n");
  console.log("sha256 selados em tela-a2/parametros.json:", params.sha256.arquivos);
  process.exit(0);
}

let seed = "validacao";
if (mode === "sortear") {
  seed = args[args.indexOf("--semente") + 1] ?? "";
  if (!/^[0-9a-f]{40}$/.test(seed)) fail("a semente é o hash completo (40 hex) do commit que congela a regra");
  if (existsSync(OUT)) fail("tela-a2/sorteio.json já existe: o sorteio é único, sem repetição");
  if (params._meta.status !== "CONGELADO") fail(`parametros.json está com status ${params._meta.status}, não CONGELADO`);
  const git = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
  try { git("cat-file", "-e", `${seed}^{commit}`); } catch { fail(`${seed} não é commit deste repositório`); }
  const drift = git("diff", "--name-only", seed, "--", ...params.congelados).trim();
  if (drift) fail(`arquivos diferem do commit da semente:\n${drift}`);
  const untracked = params.congelados.filter(f => { try { git("cat-file", "-e", `${seed}:${f}`); return false; } catch { return true; } });
  if (untracked.length) fail(`arquivos congelados ausentes do commit da semente: ${untracked.join(", ")}`);
}

const all = checkInputs(params, mode === "sortear");
const eligible = all.filter(r => r.passo2 === "aceita");
const inventory = readJson<Inventory>("tela-a2/inventario.json");

const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);
const byKey = <T>(label: string, items: T[], idOf: (x: T) => string): T[] => [...items].sort((a, b) => key(label, idOf(a)).localeCompare(key(label, idOf(b))));
const appliesTo = (v: Variante, inst: string) => !v.instancias || v.instancias.includes(inst);

const componentOf = new Map<string, string>();
for (const c of inventory.sorteaveis) for (const i of c.instancias) componentOf.set(i.id, c.componente);

// Viabilidade (vale para --validar): cada estrato tem regras e instâncias suficientes para a cota.
const available = (s: Estrato) => eligible.filter(r => r.estrato === s).length;
for (const s of params.ordemEstratos) if (!(s in params.cotas)) fail(`estrato sem cota: ${s}`);
const quotas = Object.fromEntries(params.ordemEstratos.map(s => [s, Math.min(params.cotas[s], available(s))])) as Record<Estrato, number>;
let deficit = params.ordemEstratos.reduce((sum, s) => sum + params.cotas[s] - quotas[s], 0);
for (const s of params.ordemDeficit) while (deficit > 0 && quotas[s] < available(s)) { quotas[s]++; deficit--; }
const hostsOf = (s: Estrato) => new Set(eligible.filter(r => r.estrato === s).flatMap(r => r.instancias)).size;
for (const s of params.ordemEstratos) if (hostsOf(s) < quotas[s]) fail(`estrato ${s}: ${hostsOf(s)} instâncias para ${quotas[s]} defeitos (um por instância por estrato)`);

if (mode === "validar") {
  const motivos: Record<string, number> = {};
  for (const r of all as (Regra & { motivo: string | null })[]) if (r.passo2 !== "aceita") { const k = (r.motivo ?? "").split(":")[0]; motivos[k] = (motivos[k] ?? 0) + 1; }
  console.log("VALIDAÇÃO — nada sorteado, nada gravado.");
  console.log(`universo ${all.length} · elegíveis ${eligible.length} (DS ${available("DS")} · G ${available("G")}) · instâncias candidatas DS ${hostsOf("DS")} · G ${hostsOf("G")}`);
  console.log("exclusões por motivo:", motivos);
  console.log("cotas efetivas:", quotas, "· déficit:", deficit, `· status: ${params._meta.status}`);
  const unsealed = HASHED.filter(rel => !params.sha256.arquivos[rel]);
  if (unsealed.length) console.log(`aviso: sha256 ainda não selados (${unsealed.length}); rode --selar antes do commit da semente.`);
  process.exit(0);
}

// ---- sorteio ----
const load = new Map<string, Estrato[]>();
const fits = (inst: string, s: Estrato) => { const h = load.get(inst) ?? []; return h.length < params.maxPorInstancia && !h.includes(s); };
const occupy = (inst: string, s: Estrato) => load.set(inst, [...(load.get(inst) ?? []), s]);
const queues = Object.fromEntries(params.ordemEstratos.map(s => [s, byKey("regra", eligible.filter(r => r.estrato === s), r => r.id)])) as Record<Estrato, Regra[]>;
const next = Object.fromEntries(params.ordemEstratos.map(s => [s, 0])) as Record<Estrato, number>;
const specs: Spec[] = [];
const discards: { regra: string; motivo: string }[] = [];

function drawFrom(s: Estrato, wanted: number): number {
  while (wanted > 0 && next[s] < queues[s].length) {
    const rule = queues[s][next[s]++];
    const host = byKey(`instancia:${rule.id}`, rule.instancias, i => i).find(i => fits(i, s));
    if (host === undefined) { discards.push({ regra: rule.id, motivo: "sem-instancia-livre" }); continue; }
    const variant = byKey(`variante:${rule.id}`, rule.variantes.filter(v => appliesTo(v, host)), v => v.id)[0];
    occupy(host, s);
    specs.push({ regra: rule.id, estrato: s, instancia: host, variante: variant.id, compartilhadaCom: [] });
    wanted--;
  }
  return wanted;
}
let unplaced = 0;
for (const s of params.ordemEstratos) unplaced += drawFrom(s, quotas[s]);
for (const s of params.ordemDeficit) unplaced = drawFrom(s, unplaced);
deficit += unplaced;

let shared = 0;
for (const spec of byKey("compartilhada", specs, s => s.regra)) {
  if (shared === params.compartilhadas) break;
  const rule = eligible.find(r => r.id === spec.regra) as Regra;
  const variant = rule.variantes.find(v => v.id === spec.variante) as Variante;
  const siblings = rule.instancias.filter(i => i !== spec.instancia && componentOf.get(i) === componentOf.get(spec.instancia) && appliesTo(variant, i));
  if (siblings.length === 0 || !siblings.every(i => fits(i, spec.estrato))) continue;
  for (const i of siblings) occupy(i, spec.estrato);
  spec.compartilhadaCom = siblings;
  shared++;
}

const alternatives: { regra: string; alternativa: string; instancia: string }[] = [];
const altUsed = new Set<string>();
for (const rule of byKey("alternativa", eligible.filter(r => r.alternativasValidas.length > 0), r => r.id)) {
  if (alternatives.length === params.alternativasValidas) break;
  for (const alt of byKey(`alternativa:${rule.id}`, rule.alternativasValidas, a => a.id)) {
    const inst = (alt.instancias ?? rule.instancias).find(i => !(load.get(i) ?? []).includes(rule.estrato as Estrato) && !altUsed.has(i));
    if (!inst) continue;
    alternatives.push({ regra: rule.id, alternativa: alt.id, instancia: inst });
    altUsed.add(inst);
    break;
  }
}

const allInstances = [...new Set([...inventory.sorteaveis, ...inventory.andaime].flatMap(c => c.instancias.map(i => i.id)))].filter(i => i !== "pagina");
const decoys = byKey("chamariz", allInstances.filter(i => !load.has(i) && !altUsed.has(i)), i => i).slice(0, params.chamarizes);

const result = {
  _meta: {
    regra: PARAMS,
    semente: seed,
    sha256: Object.fromEntries(params.congelados.map(f => [f, sha256(readRaw(f))])),
    corpusManifest: params.sha256.corpusManifest,
  },
  cotasEfetivas: quotas,
  deficitNaoAlocado: deficit,
  ordemPorEstrato: Object.fromEntries(params.ordemEstratos.map(s => [s, queues[s].map(r => r.id)])),
  specs,
  compartilhadas: shared,
  alternativasValidas: alternatives,
  chamarizes: decoys,
  descartes: discards,
};
writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`tela-a2/sorteio.json gravado — specs ${specs.length} · compartilhadas ${shared} · alternativas ${alternatives.length} · chamarizes ${decoys.length} · descartes ${discards.length}`);
