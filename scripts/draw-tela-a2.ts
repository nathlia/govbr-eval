/**
 * Sorteio dos defeitos da tela A2 (NAT-110, D-141, R4, Revisões Codex 1 e 2) — regra em
 * tela-a2/parametros.json e no plano (§§ 5, 13 e 14; a § 14 manda onde diverge).
 *
 * Ordem por hash, sem gerador aleatório: key(L, x) = sha256(semente|L|x), crescente.
 *
 * Identidade da semente (Revisão 1, item 9a): a única semente aceita é a de tela-a2/semente-autorizada.json,
 * arquivo commitado UMA vez, num commit descendente da semente, depois de a regra de identidade ter
 * sido publicada na NAT-110. A semente tem de ser o PRIMEIRO commit em que parametros.json diz
 * CONGELADO (o pai não diz). Os arquivos congelados não podem mudar entre a semente e o HEAD; o
 * sorteio recusa se sorteio.json ou sorteio-falha.json existem ou já existiram no histórico.
 *
 * Alocação: busca em profundidade em ordem lexicográfica fixa —
 *  1. specs: estratos na ordem de parametros.ordemEstratos; em cada um, regras por key('regra', id);
 *     para cada regra, primeiro "incluir" (hospedeiros por key('instancia:'+id, i); TODAS as variantes
 *     válidas no hospedeiro, por key('variante:'+id, v), porque variantes diferem nos efeitos e,
 *     portanto, na compatibilidade — Revisão 2), depois "pular";
 *  2. compartilhadas: combinações de specs na ordem key('compartilhada', regra);
 *  3. alternativas válidas: regras por key('alternativa', id), alternativas por key('alternativa:'+id, a),
 *     hospedeiros por key('alternativa-hospedeiro:'+id+':'+a, i);
 *  4. chamarizes: instâncias livres e não atingidas por key('chamariz', i).
 * A primeira solução completa nessa ordem é o resultado. Invariantes finais: cotas exatas por estrato
 * (nunca transfere DS↔G), compartilhadas, alternativas e chamarizes exatos.
 * Término: a existência de solução não depende da ordem (o espaço de busca é o mesmo), mas NÃO há
 * garantia de que a busca termine antes de NODE_LIMIT para toda ordem. Sem solução ou limite de nós ⇒
 * grava sorteio-falha.json e para; nenhuma outra semente, nunca.
 *
 * Contrato de compatibilidade (Revisão 2, bloqueio 3): cada variante e cada alternativa declaram os
 * EFEITOS da mutação em tela-a2/efeitos.json (nós tocados, nós removidos, instâncias atingidas em cascata,
 * mudança de estado), no vocabulário fechado tela-a2/efeitos-lotes/VOCABULARIO.json. Duas colocações são
 * incompatíveis se tocam um nó em comum, se uma atinge (cascata ou remoção da raiz) a instância de um nó da
 * outra, ou se as duas mudam o estado da página. Chamariz é instância sem colocação e sem nó tocado ou
 * cascata vinda de qualquer colocação. Ficam ainda as regras da Revisão 1: no mesmo hospedeiro, no máximo
 * maxPorInstancia defeitos e um por estrato; mesmo hospedeiro ou aninhados não repetem `tipo`.
 * Variante declarada com acoplamento confirmado não chega aqui: sai na elegibilidade (passo 2, revisão 2).
 *
 * Reposição: NÃO existe. Descarte na construção escala como revisão formal do protocolo na NAT-110 (plano
 * § 14); o sorteio original fica preservado e nenhum modo deste script refaz a busca.
 *
 * Uso:
 *   npm run tela-a2:sorteio -- --validar          entradas, sha256, universo regenerado, cadeias de duplicata,
 *                                                  efeitos, matriz de incompatibilidade (grava tela-a2/compatibilidade.json)
 *                                                  e viabilidade independente de semente; NÃO sorteia
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
const EFEITOS = "tela-a2/efeitos.json";
const VOCAB = "tela-a2/efeitos-lotes/VOCABULARIO.json";
const DUPS = "tela-a2/auditoria-duplicatas.json";
const MATRIZ = "tela-a2/compatibilidade.json";
const NODE_LIMIT = 5_000_000;
/** Conferidos por sha256 gravado (parametros e este script são conferidos pelo git contra a semente). */
const HASHED = ["tela-a2/inventario.json", "tela-a2/universo.json", "tela-a2/universo-auditoria.json", "tela-a2/elegibilidade-passo2.json", "tela-a2/elegibilidade.json",
  EFEITOS, VOCAB, DUPS,
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
interface Efeito { toca: string[]; remove?: string[]; cascata?: string[]; estado?: string | null; nota: string }
type Decl = Efeito | { porHospedeiro: Record<string, Efeito> };
interface EfeitosRegra { variantes: Record<string, Decl>; alternativas?: Record<string, Decl> }
interface Vocab { partes: Record<string, string[]>; instancias: Record<string, string>; contem: Record<string, string[]> }

const sha256 = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel));
const readJson = <T>(rel: string): T => JSON.parse(readRaw(rel).toString("utf8"));
function fail(msg: string): never { console.error(`RECUSADO: ${msg}`); process.exit(1); }
const git = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const gitOk = (...a: string[]) => { try { git(...a); return true; } catch { return false; } };

const args = process.argv.slice(2);
const mode = args.includes("--selar") ? "selar" : args.includes("--validar") ? "validar" : args.includes("--semente") ? "sortear" : null;
if (!mode) fail("uso: --validar | --selar | --semente <commit de 40 hex>");

interface RegraCompleta extends Regra { texto?: string }
/** Cadeias de duplicata (Revisão 2, bloqueio 1): toda cadeia termina numa aceita ou está auditada com o mesmo destino e motivo. */
function checkDuplicateChains(all: RegraCompleta[]) {
  const by = new Map(all.map(r => [r.id, r]));
  const audit = readJson<{ cadeias: { unidade: string; destino: string; motivoDestino: string; decisao: string; porque: string }[] }>(DUPS).cadeias;
  const audited = new Map(audit.map(a => [a.unidade, a]));
  let open = 0;
  for (const r of all) {
    if (!(r.motivo ?? "").startsWith("duplicada:")) continue;
    let cur = r; const seen = new Set([r.id]);
    while ((cur.motivo ?? "").startsWith("duplicada:")) {
      const t = cur.motivo!.slice(10);
      if (seen.has(t)) fail(`ciclo de duplicata a partir de ${r.id}`);
      seen.add(t);
      const nx = by.get(t); if (!nx) fail(`duplicada de id inexistente: ${cur.id} → ${t}`);
      cur = nx;
    }
    if (cur.passo2 === "aceita") continue;
    open++;
    const a = audited.get(r.id);
    if (!a) fail(`cadeia de duplicata sem destino aceito e sem auditoria: ${r.id} → ${cur.id} (${cur.motivo})`);
    if (a.destino !== cur.id || a.motivoDestino !== cur.motivo) fail(`auditoria de duplicata desatualizada em ${r.id}: destino ${cur.id} (${cur.motivo})`);
    if (a.decisao !== "herda" || !a.porque?.trim()) fail(`cadeia ${r.id} não herda com justificativa`);
  }
  for (const a of audit) { const r = by.get(a.unidade); if (!r || !(r.motivo ?? "").startsWith("duplicada:")) fail(`auditoria de duplicata cita unidade que não é duplicata: ${a.unidade}`); }
  return open;
}

function checkInputs(params: Params, strict: boolean) {
  const manifestSha = sha256(readFileSync(join(CORPUS, "MANIFEST.json")));
  if (manifestSha !== params.sha256.corpusManifest) fail(`MANIFEST do corpus diverge: ${manifestSha}`);
  const fresh = buildUniverse(); // confere também o sha256 de cada arquivo do corpus contra o MANIFEST
  const stored = readJson<{ unidades: { id: string; texto: string }[] }>("tela-a2/universo.json").unidades;
  if (JSON.stringify(fresh.unidades.map(u => [u.id, u.texto])) !== JSON.stringify(stored.map(u => [u.id, u.texto]))) fail("tela-a2/universo.json não é o que o corpus oficial (+ auditoria de leitura) produz");
  const prov = readJson<{ arquivos: { arquivo: string; sha256: string }[] }>("tela-a2/fontes/PROVENIENCIA.json").arquivos;
  for (const f of prov) if (sha256(readRaw(f.arquivo)) !== f.sha256) fail(`fonte arquivada diverge de PROVENIENCIA: ${f.arquivo}`);
  const elig = readJson<{ regras: RegraCompleta[] }>("tela-a2/elegibilidade.json").regras;
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
  // --- identidade da semente (Revisão 1, item 9a) ---
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
const openChains = checkDuplicateChains(all);
const eligible = all.filter(r => r.passo2 === "aceita");
const inventory = readJson<Inventory>("tela-a2/inventario.json");
const componentOf = new Map<string, string>();
for (const c of inventory.sorteaveis) for (const i of c.instancias) componentOf.set(i.id, c.componente);
const drawable = inventory.sorteaveis.flatMap(c => c.instancias.map(i => i.id));
const scaffold = inventory.andaime.flatMap(c => c.instancias.map(i => i.id));

// Aninhamento (Revisão 1): related(a, b) se iguais ou um contém o outro (transitivo). Só para a regra do `tipo`.
const parents = new Map<string, string[]>();
for (const [p, kids] of Object.entries(params.aninhamento)) for (const k of kids) parents.set(k, [...(parents.get(k) ?? []), p]);
const ancestors = (i: string): Set<string> => { const out = new Set<string>(); const st = [...(parents.get(i) ?? [])]; while (st.length) { const p = st.pop()!; if (!out.has(p)) { out.add(p); st.push(...(parents.get(p) ?? [])); } } return out; };
const anc = new Map(drawable.map(i => [i, ancestors(i)]));
const related = (a: string, b: string) => a === b || anc.get(a)!.has(b) || anc.get(b)!.has(a);
const appliesTo = (v: Variante, inst: string) => !v.instancias || v.instancias.includes(inst);

// ---- efeitos declarados (Revisão 2, bloqueio 3) ----
const vocab = readJson<Vocab>(VOCAB);
const efeitos = readJson<{ regras: Record<string, EfeitosRegra> }>(EFEITOS).regras;
const ALL_INST = [...drawable, ...scaffold];
interface Fx { nodes: Set<string>; hit: Set<string>; estado: boolean }
/** Resolve a declaração de uma variante/alternativa num hospedeiro: nós tocados (absolutos) e instâncias atingidas. */
function resolveFx(where: string, decl: Decl | undefined, host: string): Fx {
  if (!decl) fail(`efeito não declarado: ${where}@${host}`);
  const ef = "porHospedeiro" in decl ? decl.porHospedeiro[host] : decl;
  if (!ef) fail(`efeito não declarado para o hospedeiro: ${where}@${host}`);
  const abs = (n: string) => n.replace(/^\$:/, `${host}:`);
  const nodes = new Set<string>();
  for (const n of [...ef.toca, ...(ef.remove ?? [])].map(abs)) {
    const [inst, part] = n.split(":");
    const comp = vocab.instancias[inst];
    if (!comp || !vocab.partes[comp]?.includes(part)) fail(`nó fora do vocabulário: ${n} em ${where}@${host}`);
    nodes.add(n);
  }
  const estado = ef.estado === "recarga" || ef.estado === "navegacao";
  const hit = new Set<string>();
  // Recarga/navegação: o efeito é sobre tempo e estado, coberto pelo protocolo de isolamento (plano § 14.5), não sobre nós.
  if (!estado) for (const c of ef.cascata ?? []) { if (c === "*") ALL_INST.forEach(i => hit.add(i)); else hit.add(c); }
  for (const n of (ef.remove ?? []).map(abs)) if (n.endsWith(":raiz")) hit.add(n.split(":")[0]);
  for (const n of nodes) for (const i of vocab.contem[n] ?? []) if ((ef.remove ?? []).map(abs).includes(n)) { if (i === "*") ALL_INST.forEach(x => hit.add(x)); else hit.add(i); }
  hit.delete(host); // a própria instância já é o hospedeiro
  return { nodes, hit, estado };
}
const instOfNode = (n: string) => n.split(":")[0];
/** Incompatibilidade semântica entre duas colocações (spec, cópia compartilhada ou alternativa). */
function clash(a: { inst: string; fx: Fx }, b: { inst: string; fx: Fx }): string | null {
  for (const n of a.fx.nodes) if (b.fx.nodes.has(n)) return `nó ${n}`;
  if (a.fx.hit.has(b.inst) || [...b.fx.nodes].some(n => a.fx.hit.has(instOfNode(n)))) return `cascata/remoção de ${a.inst} atinge ${b.inst}`;
  if (b.fx.hit.has(a.inst) || [...a.fx.nodes].some(n => b.fx.hit.has(instOfNode(n)))) return `cascata/remoção de ${b.inst} atinge ${a.inst}`;
  if (a.fx.estado && b.fx.estado) return "duas mudanças de estado da página";
  return null;
}
/** Instâncias que uma colocação contamina (não podem ser chamariz). */
const touchedInstances = (p: { inst: string; fx: Fx }) => new Set([p.inst, ...[...p.fx.nodes].map(instOfNode), ...p.fx.hit]);

const fxCache = new Map<string, Fx>();
const fxOf = (rule: Regra, kind: "variantes" | "alternativas", id: string, host: string) => {
  const k = `${rule.id}|${kind}|${id}|${host}`;
  let fx = fxCache.get(k);
  if (!fx) { fx = resolveFx(`${rule.id}/${kind === "alternativas" ? "alt:" : ""}${id}`, efeitos[rule.id]?.[kind]?.[id], host); fxCache.set(k, fx); }
  return fx;
};
// Toda aceita declara efeito de toda variante e alternativa em todo hospedeiro em que vale.
for (const r of eligible) {
  if (!efeitos[r.id]) fail(`aceita sem efeitos declarados: ${r.id}`);
  for (const v of r.variantes) for (const h of r.instancias.filter(i => appliesTo(v, i))) fxOf(r, "variantes", v.id, h);
  for (const a of r.alternativasValidas) for (const h of a.instancias ?? r.instancias) fxOf(r, "alternativas", a.id, h);
}

interface Placement { inst: string; estrato: Estrato; tipo: string; fx: Fx }
function canPlace(placed: Placement[], p: Placement): boolean {
  const same = placed.filter(x => x.inst === p.inst);
  if (same.length >= params.maxPorInstancia || same.some(x => x.estrato === p.estrato)) return false;
  if (placed.some(x => x.tipo === p.tipo && related(x.inst, p.inst))) return false;
  return !placed.some(x => clash(x, p));
}

interface Solution { specs: Spec[]; alternatives: { regra: string; alternativa: string; instancia: string }[]; decoys: string[]; nodes: number; repairs: number }

/** Busca em ordem lexicográfica fixa. `keyFn` define a ordem (semente ou ordem neutra). */
function solve(keyFn: (label: string, id: string) => string): Solution | { erro: string; nodes: number } {
  const byKey = <T>(label: string, items: T[], idOf: (x: T) => string) => [...items].sort((a, b) => keyFn(label, idOf(a)).localeCompare(keyFn(label, idOf(b))) || idOf(a).localeCompare(idOf(b)));
  const queue = params.ordemEstratos.flatMap(s => byKey("regra", eligible.filter(r => r.estrato === s), r => r.id));
  const remaining = params.ordemEstratos.map(s => queue.map(r => (r.estrato === s ? 1 : 0)));
  const suffix = params.ordemEstratos.map((_, si) => { const a = new Array(queue.length + 1).fill(0); for (let k = queue.length - 1; k >= 0; k--) a[k] = a[k + 1] + remaining[si][k]; return a; });
  let nodes = 0; let leaves = 0;
  const specs: Spec[] = []; const placed: Placement[] = [];
  const count = (s: Estrato) => specs.filter(x => x.estrato === s).length;

  function finish(): Solution | null {
    // 2. compartilhadas: combinações na ordem fixa; a cópia leva a mesma variante, com os efeitos no hospedeiro irmão
    const ordered = byKey("compartilhada", specs, s => s.regra);
    const options = ordered.map(spec => {
      const rule = eligible.find(r => r.id === spec.regra)!;
      const variant = rule.variantes.find(v => v.id === spec.variante)!;
      return { spec, rule, sibs: rule.instancias.filter(i => i !== spec.instancia && componentOf.get(i) === componentOf.get(spec.instancia) && appliesTo(variant, i)) };
    }).filter(o => o.sibs.length > 0);
    const pick: typeof options = [];
    const extra: Placement[] = [];
    const tryShared = (from: number): Solution | null => {
      if (pick.length === params.compartilhadas) return afterShared();
      for (let k = from; k < options.length; k++) {
        const o = options[k]; const add: Placement[] = [];
        let ok = true;
        const origin = placed[specs.indexOf(o.spec)];
        for (const s of o.sibs) {
          const p = { inst: s, estrato: o.spec.estrato, tipo: o.spec.tipo, fx: fxOf(o.rule, "variantes", o.spec.variante, s) };
          // a cópia é a mesma mutação no irmão: contra a origem só vale a incompatibilidade semântica (nó comum,
          // cascata cruzada), não a regra do `tipo`; contra todo o resto vale o contrato inteiro
          if (!canPlace([...placed, ...extra, ...add].filter(x => x !== origin), p) || clash(origin, p)) { ok = false; break; }
          add.push(p);
        }
        if (!ok) continue;
        pick.push(o); extra.push(...add);
        const r = tryShared(k + 1); if (r) return r;
        pick.pop(); extra.splice(extra.length - add.length, add.length);
      }
      return null;
    };
    const afterShared = (): Solution | null => {
      const all = [...placed, ...extra];
      // 3. alternativas válidas
      const rulesAlt = byKey("alternativa", eligible.filter(r => r.alternativasValidas.length > 0), r => r.id);
      const chosen: { regra: string; alternativa: string; instancia: string; p: Placement }[] = [];
      const tryAlt = (from: number): Solution | null => {
        if (chosen.length === params.alternativasValidas) {
          // 4. chamarizes: instância sem colocação e não atingida por nenhuma colocação (nós, cascata, remoção)
          const contaminated = new Set<string>();
          for (const p of [...all, ...chosen.map(c => c.p)]) for (const i of touchedInstances(p)) contaminated.add(i);
          const free = byKey("chamariz", [...drawable, ...scaffold].filter(i => i !== "pagina" && !contaminated.has(i)), i => i);
          if (free.length < params.chamarizes) return null;
          const finalSpecs = specs.map(s => ({ ...s, compartilhadaCom: pick.find(p => p.spec === s)?.sibs ?? [] }));
          return { specs: finalSpecs, alternatives: chosen.map(({ p, ...c }) => c), decoys: free.slice(0, params.chamarizes), nodes, repairs: leaves - 1 };
        }
        for (let k = from; k < rulesAlt.length; k++) {
          const rule = rulesAlt[k];
          for (const alt of byKey(`alternativa:${rule.id}`, rule.alternativasValidas, a => a.id)) {
            const hosts = byKey(`alternativa-hospedeiro:${rule.id}:${alt.id}`, alt.instancias ?? rule.instancias, i => i);
            for (const inst of hosts) {
              if (chosen.some(c => c.instancia === inst)) continue;
              if (specs.some(s => s.regra === rule.id && (s.instancia === inst || pick.find(p => p.spec === s)?.sibs.includes(inst)))) continue;
              if (all.some(p => p.tipo === rule.tipo && related(p.inst, inst))) continue;
              const p: Placement = { inst, estrato: rule.estrato!, tipo: rule.tipo!, fx: fxOf(rule, "alternativas", alt.id, inst) };
              if ([...all, ...chosen.map(c => c.p)].some(x => clash(x, p))) continue;
              chosen.push({ regra: rule.id, alternativa: alt.id, instancia: inst, p });
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
        for (const v of byKey(`variante:${rule.id}`, rule.variantes.filter(x => appliesTo(x, host)), x => x.id)) {
          const p = { inst: host, estrato: s, tipo: rule.tipo!, fx: fxOf(rule, "variantes", v.id, host) };
          if (!canPlace(placed, p)) continue;
          placed.push(p); specs.push({ regra: rule.id, estrato: s, tipo: rule.tipo!, instancia: host, variante: v.id, compartilhadaCom: [] });
          const r = dfs(k + 1); if (r) return r;
          placed.pop(); specs.pop();
        }
      }
    }
    return dfs(k + 1); // pular
  }
  try { return dfs(0) ?? { erro: "sem solução que cumpra cotas, compartilhadas, alternativas e chamarizes", nodes }; }
  catch (e) { return { erro: (e as Error).message, nodes }; }
}

// ---- matriz de incompatibilidade derivada dos efeitos (Revisão 2, bloqueio 3); independente de semente ----
function matrix() {
  type T = { regra: string; estrato: Estrato; tipo: string; kind: "variante" | "alternativa"; id: string; inst: string; fx: Fx };
  const triples: T[] = [];
  for (const r of eligible) {
    for (const v of r.variantes) for (const h of r.instancias.filter(i => appliesTo(v, i))) triples.push({ regra: r.id, estrato: r.estrato!, tipo: r.tipo!, kind: "variante", id: v.id, inst: h, fx: fxOf(r, "variantes", v.id, h) });
    for (const a of r.alternativasValidas) for (const h of a.instancias ?? r.instancias) triples.push({ regra: r.id, estrato: r.estrato!, tipo: r.tipo!, kind: "alternativa", id: a.id, inst: h, fx: fxOf(r, "alternativas", a.id, h) });
  }
  const label = (t: T) => `${t.regra}/${t.kind === "alternativa" ? "alt:" : ""}${t.id}@${t.inst}`;
  const crossHost: { a: string; b: string; motivo: string }[] = [];
  let sameHostPairs = 0, sameHostClash = 0;
  for (let i = 0; i < triples.length; i++) for (let j = i + 1; j < triples.length; j++) {
    const a = triples[i], b = triples[j];
    if (a.regra === b.regra) continue;
    const why = clash(a, b);
    if (a.inst === b.inst) { sameHostPairs++; if (why) sameHostClash++; continue; }
    if (why) crossHost.push({ a: label(a), b: label(b), motivo: why });
  }
  const contaminates = triples.filter(t => touchedInstances(t).size > 1).map(t => ({ colocacao: label(t), instanciasAtingidas: [...touchedInstances(t)].filter(i => i !== t.inst).sort(), nota: (() => { const d = efeitos[t.regra][t.kind === "variante" ? "variantes" : "alternativas"]![t.id]; return ("porHospedeiro" in d ? d.porHospedeiro[t.inst] : d).nota; })() }));
  const estado = triples.filter(t => t.fx.estado).map(label);
  const out = {
    _meta: { geradoPor: "scripts/draw-tela-a2.ts --validar", derivadoDe: [EFEITOS, VOCAB, "tela-a2/elegibilidade.json"], regra: "incompatíveis se tocam nó em comum; se cascata ou remoção da raiz de uma atinge a instância de um nó da outra; ou se as duas mudam o estado da página. Independente de semente.", colocacoes: triples.length, paresMesmoHospedeiro: sameHostPairs, paresMesmoHospedeiroIncompativeis: sameHostClash, paresEntreHospedeirosIncompativeis: crossHost.length },
    mudamEstadoDaPagina: estado,
    contaminamOutrasInstancias: contaminates,
    incompatibilidadesEntreHospedeiros: crossHost,
  };
  writeFileSync(join(ROOT, MATRIZ), JSON.stringify(out, null, 1) + "\n");
  return out._meta;
}

/** Conferência independente da busca: refaz as colocações da solução e cobra o contrato inteiro par a par. */
function verifySolution(sol: Solution) {
  const rule = (id: string) => eligible.find(r => r.id === id)!;
  const ps: { inst: string; estrato: Estrato; tipo: string; fx: Fx; what: string }[] = [];
  for (const s of sol.specs) for (const h of [s.instancia, ...s.compartilhadaCom]) ps.push({ inst: h, estrato: s.estrato, tipo: s.tipo, fx: fxOf(rule(s.regra), "variantes", s.variante, h), what: `${s.regra}/${s.variante}@${h}` });
  const nSpecs = ps.length;
  for (const a of sol.alternatives) ps.push({ inst: a.instancia, estrato: rule(a.regra).estrato!, tipo: rule(a.regra).tipo!, fx: fxOf(rule(a.regra), "alternativas", a.alternativa, a.instancia), what: `${a.regra}/alt:${a.alternativa}@${a.instancia}` });
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const why = clash(ps[i], ps[j]); if (why) fail(`solução viola o contrato: ${ps[i].what} × ${ps[j].what} (${why})`); }
  for (const i of new Set(ps.slice(0, nSpecs).map(p => p.inst))) { const here = ps.slice(0, nSpecs).filter(p => p.inst === i); if (here.length > params.maxPorInstancia || new Set(here.map(p => p.estrato)).size !== here.length) fail(`solução viola maxPorInstancia/estrato em ${i}`); }
  const contaminated = new Set(ps.flatMap(p => [...touchedInstances(p)]));
  for (const d of sol.decoys) if (contaminated.has(d)) fail(`chamariz atingido por colocação: ${d}`);
  if (sol.specs.some(s => !rule(s.regra).variantes.some(v => v.id === s.variante && appliesTo(v, s.instancia)))) fail("solução usa variante fora do hospedeiro");
}

// ---- viabilidade independente de semente ----
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
  // (ii) existência de solução completa numa ordem neutra. A existência não depende da ordem; o término antes
  // de NODE_LIMIT não é garantido para toda ordem (falha é preservada, sem nova semente).
  const neutral = solve((label, id) => `${label}|${id}`);
  if ("erro" in neutral) fail(`viabilidade: ${neutral.erro} (nós: ${neutral.nodes})`);
  verifySolution(neutral);
  report.solucaoOrdemNeutra = { specs: neutral.specs.length, compartilhadas: neutral.specs.filter(s => s.compartilhadaCom.length).length, alternativas: neutral.alternatives.length, chamarizes: neutral.decoys.length, nos: neutral.nodes, reparos: neutral.repairs };
  return report;
}

if (mode === "validar") {
  const motivos: Record<string, number> = {};
  for (const r of all) if (r.passo2 !== "aceita") { const k = (r.motivo ?? "").split(":")[0]; motivos[k] = (motivos[k] ?? 0) + 1; }
  const tipos: Record<string, number> = {};
  for (const r of eligible) { const k = `${r.estrato} ${r.tipo}`; tipos[k] = (tipos[k] ?? 0) + 1; }
  console.log("VALIDAÇÃO — nada sorteado.");
  console.log(`universo ${all.length} · elegíveis ${eligible.length} (DS ${eligible.filter(r => r.estrato === "DS").length} · G ${eligible.filter(r => r.estrato === "G").length})`);
  console.log("exclusões por motivo:", motivos);
  console.log("elegíveis por estrato e tipo:", tipos);
  console.log(`cadeias de duplicata sem destino aceito: ${openChains}, todas auditadas (${DUPS})`);
  console.log("matriz de incompatibilidade:", matrix(), `→ ${MATRIZ}`);
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
  nota: "Artefato para preservação externa (anexar à NAT-110). Falha não autoriza outra semente; descarte posterior escala como revisão formal do protocolo (sem reposição).",
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
