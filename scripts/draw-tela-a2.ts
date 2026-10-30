/**
 * Sorteio dos defeitos da tela A2 (NAT-110, D-141, R4, Revisão Codex 1 item 9) — regra em
 * tela-a2/parametros.json e no plano (§ 5).
 *
 * Ordem por hash, sem gerador aleatório: key(L, x) = sha256(semente|L|x), crescente.
 *
 * Identidade da semente (item 9a): a única semente aceita é a de tela-a2/semente-autorizada.json,
 * arquivo commitado UMA vez, num commit descendente da semente, depois de a regra de identidade ter
 * sido publicada na NAT-110. A semente tem de ser o PRIMEIRO commit em que parametros.json diz
 * CONGELADO (o pai não diz). Os arquivos congelados não podem mudar entre a semente e o HEAD; o
 * sorteio recusa se sorteio.json ou sorteio-falha.json existem ou já existiram no histórico.
 *
 * Alocação (itens 9b–9d): busca em profundidade completa, em ordem lexicográfica fixa —
 *  1. specs: estratos na ordem de parametros.ordemEstratos; em cada um, regras por key('regra', id);
 *     para cada regra, primeiro "incluir" (hospedeiros por key('instancia:'+id, i), variantes válidas
 *     no hospedeiro por key('variante:'+id, v)), depois "pular";
 *  2. compartilhadas: combinações de specs na ordem key('compartilhada', regra);
 *  3. alternativas válidas: regras por key('alternativa', id), alternativas por key('alternativa:'+id, a),
 *     hospedeiros por key('alternativa-hospedeiro:'+id+':'+a, i);
 *  4. chamarizes: instâncias livres por key('chamariz', i).
 * A primeira solução completa nessa ordem é o resultado. Invariantes finais: cotas exatas por estrato
 * (nunca transfere DS↔G), compartilhadas, alternativas e chamarizes exatos. Sem solução (ou limite de
 * nós) ⇒ grava sorteio-falha.json e para; não há outra semente.
 * Contrato de compatibilidade: duas colocações no mesmo hospedeiro ou em hospedeiros aninhados
 * (parametros.aninhamento) não podem ter o mesmo `tipo`; no mesmo hospedeiro, no máximo
 * maxPorInstancia defeitos e um por estrato. `pagina` só toca nós de documento (não aninha).
 *
 * Uso:
 *   npm run tela-a2:sorteio -- --validar          entradas, sha256, universo regenerado, viabilidade independente de semente; NÃO sorteia
 *   npm run tela-a2:sorteio -- --selar            grava os sha256 dos insumos em parametros.json (antes do commit da semente)
 *   npm run tela-a2:sorteio -- --semente <40 hex> sorteio único (só a semente autorizada)
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
const OUT = "tela-a2/sorteio.json";
const FAIL = "tela-a2/sorteio-falha.json";
const EXEC = "tela-a2/sorteio-execucao.json";
const AUTH = "tela-a2/semente-autorizada.json";
const NODE_LIMIT = 5_000_000;
/** Conferidos por sha256 gravado (parametros e este script são conferidos pelo git contra a semente). */
const HASHED = ["tela-a2/inventario.json", "tela-a2/universo.json", "tela-a2/universo-auditoria.json", "tela-a2/elegibilidade-passo2.json", "tela-a2/elegibilidade.json",
  "tela-a2/fontes/PROVENIENCIA.json", "tela-a2/fontes/portaria3-2007-emag.pdf", "tela-a2/fontes/select-behavior-size.png", "scripts/tela-a2-universo.ts"];

type Estrato = "DS" | "G";
interface Variante { id: string; descricao: string; instancias?: string[] }
interface Regra { id: string; componente: string | null; passo2: string | null; estrato: Estrato | null; tipo: string | null; instancias: string[]; variantes: Variante[]; alternativasValidas: Variante[]; motivo?: string | null }
interface Params {
  _meta: { status: string };
  ordemEstratos: Estrato[];
  cotas: Record<Estrato, number>;
  maxPorInstancia: number;
  compartilhadas: number;
  alternativasValidas: number;
  chamarizes: number;
  aninhamento: Record<string, string[]>;
  congelados: string[];
  sha256: { corpusManifest: string; arquivos: Record<string, string> };
}
interface Inventory { sorteaveis: { componente: string; instancias: { id: string }[] }[]; andaime: { componente: string; instancias: { id: string }[] }[] }
interface Spec { regra: string; estrato: Estrato; tipo: string; instancia: string; variante: string; compartilhadaCom: string[] }

const sha256 = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel));
const readJson = <T>(rel: string): T => JSON.parse(readRaw(rel).toString("utf8"));
function fail(msg: string): never { console.error(`RECUSADO: ${msg}`); process.exit(1); }
const git = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const gitOk = (...a: string[]) => { try { git(...a); return true; } catch { return false; } };

const args = process.argv.slice(2);
const mode = args.includes("--selar") ? "selar" : args.includes("--validar") ? "validar" : args.includes("--semente") ? "sortear" : null;
if (!mode) fail("uso: --validar | --selar | --semente <commit de 40 hex>");

function checkInputs(params: Params, strict: boolean) {
  const manifestSha = sha256(readFileSync(join(CORPUS, "MANIFEST.json")));
  if (manifestSha !== params.sha256.corpusManifest) fail(`MANIFEST do corpus diverge: ${manifestSha}`);
  const fresh = buildUniverse(); // confere também o sha256 de cada arquivo do corpus contra o MANIFEST
  const stored = readJson<{ unidades: { id: string; texto: string }[] }>("tela-a2/universo.json").unidades;
  if (JSON.stringify(fresh.unidades.map(u => [u.id, u.texto])) !== JSON.stringify(stored.map(u => [u.id, u.texto]))) fail("tela-a2/universo.json não é o que o corpus oficial (+ auditoria de leitura) produz");
  const prov = readJson<{ arquivos: { arquivo: string; sha256: string }[] }>("tela-a2/fontes/PROVENIENCIA.json").arquivos;
  for (const f of prov) if (sha256(readRaw(f.arquivo)) !== f.sha256) fail(`fonte arquivada diverge de PROVENIENCIA: ${f.arquivo}`);
  const elig = readJson<{ regras: Regra[] }>("tela-a2/elegibilidade.json").regras;
  if (elig.length !== stored.length || elig.some((r, i) => r.id !== stored[i].id)) fail("elegibilidade.json não cobre o universo na mesma ordem");
  if (elig.some(r => r.passo2 === "pendente")) fail("há unidades pendentes no passo 2");
  for (const r of elig.filter(x => x.passo2 === "aceita")) if (!r.tipo) fail(`aceita sem tipo (contrato de compatibilidade): ${r.id}`);
  if (strict) for (const rel of HASHED) {
    const want = params.sha256.arquivos[rel];
    if (!want) fail(`sha256 não selado para ${rel} (rode --selar antes do commit da semente)`);
    if (sha256(readRaw(rel)) !== want) fail(`${rel} difere do sha256 selado em parametros.json`);
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

let seed = "";
if (mode === "sortear") {
  seed = args[args.indexOf("--semente") + 1] ?? "";
  if (!/^[0-9a-f]{40}$/.test(seed)) fail("a semente é o hash completo (40 hex) do commit que congela a regra");
  // --- identidade da semente (item 9a) ---
  if (!existsSync(join(ROOT, AUTH))) fail(`${AUTH} não existe: a semente só é autorizada depois de publicada na NAT-110 e commitada`);
  const auth = readJson<{ semente: string }>(AUTH);
  if (auth.semente !== seed) fail(`semente diferente da autorizada (${auth.semente})`);
  if (!gitOk("cat-file", "-e", `HEAD:${AUTH}`)) fail(`${AUTH} não está commitado`);
  if (git("show", `HEAD:${AUTH}`) !== readRaw(AUTH).toString("utf8").trim()) fail(`${AUTH} difere do commitado`);
  const authCommits = git("log", "--format=%H", "--", AUTH).split("\n").filter(Boolean);
  if (authCommits.length !== 1) fail(`${AUTH} foi mexido em ${authCommits.length} commits; tem de ser adicionado uma vez e nunca alterado`);
  if (!gitOk("cat-file", "-e", `${seed}^{commit}`)) fail(`${seed} não é commit deste repositório`);
  if (!gitOk("merge-base", "--is-ancestor", seed, authCommits[0])) fail("o commit que autoriza a semente não descende dela");
  if (seed === authCommits[0]) fail("a semente não pode ser o próprio commit de autorização");
  if (!gitOk("merge-base", "--is-ancestor", seed, "HEAD")) fail("a semente não é ancestral do HEAD");
  const statusAt = (rev: string) => { try { return JSON.parse(git("show", `${rev}:${PARAMS}`))._meta?.status; } catch { return null; } };
  if (statusAt(seed) !== "CONGELADO") fail("parametros.json não está CONGELADO no commit da semente");
  if (statusAt(`${seed}^`) === "CONGELADO") fail("a semente não é o primeiro commit de congelamento (o pai já estava CONGELADO)");
  const firstFreeze = git("log", "--reverse", "--format=%H", "-S", '"status": "CONGELADO"', "--", PARAMS).split("\n").filter(Boolean)[0];
  if (firstFreeze !== seed) fail(`o primeiro congelamento no histórico é ${firstFreeze}, não a semente`);
  const drift = git("diff", "--name-only", seed, "HEAD", "--", ...params.congelados);
  if (drift) fail(`arquivos congelados mudaram depois da semente:\n${drift}`);
  const dirty = git("status", "--porcelain", "--", ...params.congelados);
  if (dirty) fail(`arquivos congelados com mudança não commitada:\n${dirty}`);
  for (const f of params.congelados) if (!gitOk("cat-file", "-e", `${seed}:${f}`)) fail(`arquivo congelado ausente do commit da semente: ${f}`);
  for (const f of [OUT, FAIL]) {
    if (existsSync(join(ROOT, f))) fail(`${f} já existe: o sorteio é único`);
    if (git("log", "--all", "--format=%H", "--", f)) fail(`${f} já existiu no histórico: o sorteio é único`);
  }
}

const all = checkInputs(params, mode === "sortear");
const eligible = all.filter(r => r.passo2 === "aceita");
const inventory = readJson<Inventory>("tela-a2/inventario.json");
const componentOf = new Map<string, string>();
for (const c of inventory.sorteaveis) for (const i of c.instancias) componentOf.set(i.id, c.componente);
const drawable = inventory.sorteaveis.flatMap(c => c.instancias.map(i => i.id));
const scaffold = inventory.andaime.flatMap(c => c.instancias.map(i => i.id));

// Aninhamento: related(a, b) se iguais ou um contém o outro (transitivo).
const parents = new Map<string, string[]>();
for (const [p, kids] of Object.entries(params.aninhamento)) for (const k of kids) parents.set(k, [...(parents.get(k) ?? []), p]);
const ancestors = (i: string): Set<string> => { const out = new Set<string>(); const st = [...(parents.get(i) ?? [])]; while (st.length) { const p = st.pop()!; if (!out.has(p)) { out.add(p); st.push(...(parents.get(p) ?? [])); } } return out; };
const anc = new Map(drawable.map(i => [i, ancestors(i)]));
const related = (a: string, b: string) => a === b || anc.get(a)!.has(b) || anc.get(b)!.has(a);
const appliesTo = (v: Variante, inst: string) => !v.instancias || v.instancias.includes(inst);

interface Placement { inst: string; estrato: Estrato; tipo: string }
function canPlace(placed: Placement[], p: Placement): boolean {
  const same = placed.filter(x => x.inst === p.inst);
  if (same.length >= params.maxPorInstancia || same.some(x => x.estrato === p.estrato)) return false;
  return !placed.some(x => x.tipo === p.tipo && related(x.inst, p.inst));
}

interface Solution { specs: Spec[]; alternatives: { regra: string; alternativa: string; instancia: string }[]; decoys: string[]; nodes: number; repairs: number }

/** Busca completa em ordem lexicográfica fixa. `keyFn` define a ordem (semente ou ordem neutra). */
function solve(keyFn: (label: string, id: string) => string): Solution | { erro: string; nodes: number } {
  const byKey = <T>(label: string, items: T[], idOf: (x: T) => string) => [...items].sort((a, b) => keyFn(label, idOf(a)).localeCompare(keyFn(label, idOf(b))) || idOf(a).localeCompare(idOf(b)));
  const queue = params.ordemEstratos.flatMap(s => byKey("regra", eligible.filter(r => r.estrato === s), r => r.id));
  const remaining = params.ordemEstratos.map(s => queue.map(r => (r.estrato === s ? 1 : 0)));
  const suffix = params.ordemEstratos.map((_, si) => { const a = new Array(queue.length + 1).fill(0); for (let k = queue.length - 1; k >= 0; k--) a[k] = a[k + 1] + remaining[si][k]; return a; });
  let nodes = 0; let leaves = 0;
  const specs: Spec[] = []; const placed: Placement[] = [];
  const count = (s: Estrato) => specs.filter(x => x.estrato === s).length;

  function finish(): Solution | null {
    // 2. compartilhadas: combinações na ordem fixa
    const ordered = byKey("compartilhada", specs, s => s.regra);
    const options = ordered.map(spec => {
      const rule = eligible.find(r => r.id === spec.regra)!;
      const variant = rule.variantes.find(v => v.id === spec.variante)!;
      return { spec, sibs: rule.instancias.filter(i => i !== spec.instancia && componentOf.get(i) === componentOf.get(spec.instancia) && appliesTo(variant, i)) };
    }).filter(o => o.sibs.length > 0);
    const pick: typeof options = [];
    const extra: Placement[] = [];
    const tryShared = (from: number): Solution | null => {
      if (pick.length === params.compartilhadas) return afterShared();
      for (let k = from; k < options.length; k++) {
        const o = options[k]; const add: Placement[] = [];
        let ok = true;
        for (const s of o.sibs) { const p = { inst: s, estrato: o.spec.estrato, tipo: o.spec.tipo }; if (!canPlace([...placed, ...extra, ...add], p)) { ok = false; break; } add.push(p); }
        if (!ok) continue;
        pick.push(o); extra.push(...add);
        const r = tryShared(k + 1); if (r) return r;
        pick.pop(); extra.splice(extra.length - add.length, add.length);
      }
      return null;
    };
    const afterShared = (): Solution | null => {
      const all = [...placed, ...extra];
      const busy = new Set(all.map(p => p.inst));
      // 3. alternativas válidas
      const rulesAlt = byKey("alternativa", eligible.filter(r => r.alternativasValidas.length > 0), r => r.id);
      const chosen: { regra: string; alternativa: string; instancia: string; tipo: string }[] = [];
      const tryAlt = (from: number): Solution | null => {
        if (chosen.length === params.alternativasValidas) {
          // 4. chamarizes
          const used = new Set([...busy, ...chosen.map(c => c.instancia)]);
          const free = byKey("chamariz", [...drawable, ...scaffold].filter(i => i !== "pagina" && !used.has(i)), i => i);
          if (free.length < params.chamarizes) return null;
          const finalSpecs = specs.map(s => ({ ...s, compartilhadaCom: pick.find(p => p.spec === s)?.sibs ?? [] }));
          return { specs: finalSpecs, alternatives: chosen.map(({ tipo, ...c }) => c), decoys: free.slice(0, params.chamarizes), nodes, repairs: leaves - 1 };
        }
        for (let k = from; k < rulesAlt.length; k++) {
          const rule = rulesAlt[k];
          for (const alt of byKey(`alternativa:${rule.id}`, rule.alternativasValidas, a => a.id)) {
            const hosts = byKey(`alternativa-hospedeiro:${rule.id}:${alt.id}`, alt.instancias ?? rule.instancias, i => i);
            for (const inst of hosts) {
              if (chosen.some(c => c.instancia === inst)) continue;
              if (specs.some(s => s.regra === rule.id && (s.instancia === inst || pick.find(p => p.spec === s)?.sibs.includes(inst)))) continue;
              if (all.some(p => p.tipo === rule.tipo && related(p.inst, inst))) continue;
              chosen.push({ regra: rule.id, alternativa: alt.id, instancia: inst, tipo: rule.tipo! });
              const r = tryAlt(k + 1); if (r) return r;
              chosen.pop();
            }
          }
        }
        return null;
      };
      return tryAlt(0);
    };
    return tryShared(0);
  }

  function dfs(k: number): Solution | null {
    if (++nodes > NODE_LIMIT) throw new Error("limite de nós");
    if (params.ordemEstratos.every(s => count(s) === params.cotas[s])) { leaves++; return finish(); }
    if (k >= queue.length) return null;
    for (let si = 0; si < params.ordemEstratos.length; si++) if (count(params.ordemEstratos[si]) + suffix[si][k] < params.cotas[params.ordemEstratos[si]]) return null;
    const rule = queue[k];
    const s = rule.estrato as Estrato;
    if (count(s) < params.cotas[s]) {
      for (const host of byKey(`instancia:${rule.id}`, rule.instancias, i => i)) {
        const p = { inst: host, estrato: s, tipo: rule.tipo! };
        if (!canPlace(placed, p)) continue;
        for (const v of byKey(`variante:${rule.id}`, rule.variantes.filter(x => appliesTo(x, host)), x => x.id)) {
          placed.push(p); specs.push({ regra: rule.id, estrato: s, tipo: rule.tipo!, instancia: host, variante: v.id, compartilhadaCom: [] });
          const r = dfs(k + 1); if (r) return r;
          placed.pop(); specs.pop();
          break; // variantes não mudam a viabilidade: a 1ª que vale no hospedeiro é a escolhida
        }
      }
    }
    return dfs(k + 1); // pular
  }
  try { return dfs(0) ?? { erro: "sem solução que cumpra cotas, compartilhadas, alternativas e chamarizes", nodes }; }
  catch (e) { return { erro: (e as Error).message, nodes }; }
}

// ---- viabilidade independente de semente (item 9b) ----
function feasibility() {
  const report: Record<string, unknown> = {};
  // (i) condição suficiente das cotas: para todo conjunto B de instâncias já tomadas (|B| ≤ cota−1),
  // sobram regras com hospedeiro fora de B em número ≥ cota−|B|; vale para qualquer ordem.
  for (const s of params.ordemEstratos) {
    const rules = eligible.filter(r => r.estrato === s);
    const hosts = [...new Set(rules.flatMap(r => r.instancias))];
    let worst = Infinity;
    const q = params.cotas[s];
    const rec = (start: number, chosen: string[]) => {
      if (chosen.length >= q) return;
      const avail = rules.filter(r => r.instancias.some(i => !chosen.includes(i))).length;
      worst = Math.min(worst, avail - (q - chosen.length));
      for (let i = start; i < hosts.length; i++) rec(i + 1, [...chosen, hosts[i]]);
    };
    rec(0, []);
    report[`folgaMinima_${s}`] = worst;
    if (worst < 0) fail(`estrato ${s}: existe conjunto de instâncias ocupadas que deixa menos regras que a cota`);
  }
  // (ii) existência de solução completa: a busca é completa, então existe para uma ordem ⇔ existe para todas.
  const neutral = solve((label, id) => `${label}|${id}`);
  if ("erro" in neutral) fail(`viabilidade: ${neutral.erro} (nós: ${neutral.nodes})`);
  report.solucaoOrdemNeutra = { specs: neutral.specs.length, compartilhadas: neutral.specs.filter(s => s.compartilhadaCom.length).length, alternativas: neutral.alternatives.length, chamarizes: neutral.decoys.length, nos: neutral.nodes };
  return report;
}

if (mode === "validar") {
  const motivos: Record<string, number> = {};
  for (const r of all) if (r.passo2 !== "aceita") { const k = (r.motivo ?? "").split(":")[0]; motivos[k] = (motivos[k] ?? 0) + 1; }
  const tipos: Record<string, number> = {};
  for (const r of eligible) { const k = `${r.estrato} ${r.tipo}`; tipos[k] = (tipos[k] ?? 0) + 1; }
  console.log("VALIDAÇÃO — nada sorteado, nada gravado.");
  console.log(`universo ${all.length} · elegíveis ${eligible.length} (DS ${eligible.filter(r => r.estrato === "DS").length} · G ${eligible.filter(r => r.estrato === "G").length})`);
  console.log("exclusões por motivo:", motivos);
  console.log("elegíveis por estrato e tipo:", tipos);
  console.log("viabilidade independente de semente:", feasibility());
  console.log(`status: ${params._meta.status}`);
  const unsealed = HASHED.filter(rel => !params.sha256.arquivos[rel]);
  if (unsealed.length) console.log(`aviso: sha256 ainda não selados (${unsealed.length}); rode --selar antes do commit da semente.`);
  process.exit(0);
}

// ---- sorteio único ----
const started = new Date().toISOString();
const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);
const result = solve(key);
const execRecord = {
  semente: seed, head: git("rev-parse", "HEAD"), inicio: started, fim: new Date().toISOString(),
  node: process.version, plataforma: `${process.platform} ${process.arch}`,
  script: sha256(readRaw("scripts/draw-tela-a2.ts")), insumos: Object.fromEntries(params.congelados.map(f => [f, sha256(readRaw(f))])),
  nos: result.nodes, resultado: "erro" in result ? `FALHA: ${result.erro}` : OUT,
  nota: "Artefato para preservação externa (anexar à NAT-110). Falha não autoriza outra semente.",
};
if ("erro" in result) {
  writeFileSync(join(ROOT, FAIL), JSON.stringify({ semente: seed, erro: result.erro, nos: result.nodes }, null, 2) + "\n");
  writeFileSync(join(ROOT, EXEC), JSON.stringify(execRecord, null, 2) + "\n");
  console.error(`FALHA gravada em ${FAIL}; nenhuma outra semente é autorizada (escalar na NAT-110).`);
  process.exit(1);
}
const byKeyQ = (s: Estrato) => [...eligible.filter(r => r.estrato === s)].sort((a, b) => key("regra", a.id).localeCompare(key("regra", b.id))).map(r => r.id);
const out = {
  _meta: { regra: PARAMS, semente: seed, sha256: execRecord.insumos, corpusManifest: params.sha256.corpusManifest },
  ordemPorEstrato: Object.fromEntries(params.ordemEstratos.map(s => [s, byKeyQ(s)])),
  specs: result.specs,
  alternativasValidas: result.alternatives,
  chamarizes: result.decoys,
  reparos: result.repairs,
  nos: result.nodes,
};
const inv = [params.ordemEstratos.every(s => result.specs.filter(x => x.estrato === s).length === params.cotas[s]),
  result.specs.filter(s => s.compartilhadaCom.length).length === params.compartilhadas,
  result.alternatives.length === params.alternativasValidas, result.decoys.length === params.chamarizes];
if (inv.some(x => !x)) { writeFileSync(join(ROOT, FAIL), JSON.stringify({ semente: seed, erro: "invariante final violada", inv }, null, 2) + "\n"); process.exit(1); }
writeFileSync(join(ROOT, OUT), JSON.stringify(out, null, 2) + "\n");
writeFileSync(join(ROOT, EXEC), JSON.stringify({ ...execRecord, sorteioSha256: sha256(readRaw(OUT)) }, null, 2) + "\n");
console.log(`${OUT} gravado — specs ${result.specs.length} · compartilhadas ${params.compartilhadas} · alternativas ${result.alternatives.length} · chamarizes ${result.decoys.length} · reparos ${result.repairs}`);
