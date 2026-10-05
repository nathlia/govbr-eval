/**
 * Reparo de uma vez: conjunto de snapshots real que um ensaio gravou antes com o mesmo id.
 *
 * 2026-10-04 03:59Z: o dublê da `ensaio-agenda-01` (fixture: true) arquivou
 * `snapshots/conjuntos/snapshots-520e43f9433f78ac.json`. O par p01 REAL da `t7-tela-a-01`, disparado no
 * mesmo commit do govbr-eval, calculou os mesmos itens, e o id antigo era só o hash dos itens: o
 * arquivamento achou o arquivo, viu itens iguais e o manteve. O despacho e a linha de base dos dois
 * braços apontam esse id, e a análise recusa (“fixture misturada com dado real (snapshots × pacote)”).
 * O arquivamento novo (arquivar-execucao.ts) não deixa isso se repetir; este script conserta o que já
 * está arquivado SEM reescrever nada:
 *
 *   - grava `snapshots/conjuntos/reparados/<id>.json`: os MESMOS itens (prova: forma canônica igual),
 *     o mesmo id (é o que o despacho e a linha de base já registram) e `fixture` da natureza de quem
 *     o aponta; `createdAt` = `generatedAt` do manifesto de coleta do primeiro disparo real (o que o
 *     arquivamento teria gravado);
 *   - grava `reparos/conjuntos-de-snapshots/<id>.json`: o quê, por quê, sha256 do original e da cópia,
 *     sha256 dos itens, quem aponta o conjunto;
 *   - o original fica intocado e continua servindo ao ensaio. `resolverConjunto` (arquivo-resultados.ts)
 *     só lê a cópia quando o registro confere byte a byte.
 *
 * Só repara no sentido ensaio → real, e só se o id for exatamente o que um conjunto real com esses
 * itens teria (`idDoConjunto(items, false)`). Sem `--aplicar`, só mostra o que faria. Com `--aplicar`,
 * grava e faz um commit (sem push; quem roda decide). `--sem-commit` grava sem commitar.
 *
 *   npx tsx scripts/ci/reparar-conjunto-fixture.ts --arquivo CLONE --conjunto snapshots-<id> [--aplicar] [--sem-commit]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContract, type Baseline, type Run, type SnapshotManifest } from "../../contracts/index";
import {
  REPARO_CONJUNTO_VERSAO, caminhoConjunto, caminhoConjuntoReparado, caminhoReparoConjunto, gravarImutavel, idDoConjunto, resolverConjunto, sha,
  type EntradaIndice, type ReparoConjunto,
} from "../arquivo-resultados";
import { canonical } from "../semantic-flow";

const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const lerJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

interface Referencia { chave: string; caminho: string; tipo: EntradaIndice["tipo"]; fixture: boolean; dataUtc: string; manifesto: string | null }
export interface PlanoConjunto { id: string; original: { caminho: string; sha256: string; fixture: boolean }; reparado: SnapshotManifest; registro: ReparoConjunto; referencias: Referencia[] }

/** Quem aponta o conjunto `id`: execuções (despacho.json → snapshots) e linhas de base (links.*.snapshotSetId), com a natureza de cada um. */
function referencias(repo: string, id: string): Referencia[] {
  const dir = join(repo, "indice", "entradas");
  if (!existsSync(dir)) return [];
  const out: Referencia[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const e = lerJson<EntradaIndice>(join(dir, f));
    const base = join(repo, e.caminho);
    const manifesto = e.manifestoColeta?.caminho ?? null;
    if (e.tipo === "execucao" && existsSync(join(base, "despacho.json"))) {
      if (lerJson<{ snapshots?: unknown }>(join(base, "despacho.json")).snapshots !== id) continue;
      const run = join(base, "pacote", "run.json");
      if (!existsSync(run)) throw new Error(`${e.chave} aponta ${id}, mas não tem pacote/run.json para dizer a natureza`);
      out.push({ chave: e.chave, caminho: e.caminho, tipo: e.tipo, fixture: lerJson<Run>(run).fixture, dataUtc: e.dataUtc, manifesto });
    } else if (e.tipo === "linha-de-base" && existsSync(join(base, "baseline.json"))) {
      const b = lerJson<Baseline>(join(base, "baseline.json"));
      if (![b.links.site, b.links.reference, b.links.statePlan].some((l) => l.snapshotSetId === id)) continue;
      out.push({ chave: e.chave, caminho: e.caminho, tipo: e.tipo, fixture: b.fixture, dataUtc: e.dataUtc, manifesto });
    }
  }
  return out;
}

/** null = nada a reparar (nenhum disparo real aponta um conjunto de ensaio com este id). */
export function planejarReparoConjunto(repo: string, id: string, agora = new Date()): PlanoConjunto | null {
  const rel = caminhoConjunto(id);
  if (!existsSync(join(repo, rel))) throw new Error(`${rel} não existe no arquivo`);
  const bytes = readFileSync(join(repo, rel));
  const doc = JSON.parse(bytes.toString("utf8")) as SnapshotManifest;
  const refs = referencias(repo, id);
  const divergentes = refs.filter((r) => r.fixture !== doc.fixture);
  if (!divergentes.length) return null;
  if (doc.fixture !== true) throw new Error(`${rel} é real e há ensaios apontando-o: este reparo só cobre ensaio → real`);
  if (doc.snapshotSetId !== id || idDoConjunto(doc.items, false) !== id) throw new Error(`o id ${id} não é o de um conjunto real com estes itens: não é a colisão que este reparo cobre`);
  // createdAt = o que o arquivamento teria gravado: generatedAt do manifesto do primeiro disparo real
  const primeiro = [...divergentes].filter((r) => r.manifesto).sort((a, b) => a.dataUtc.localeCompare(b.dataUtc))[0];
  if (!primeiro || !existsSync(join(repo, primeiro.manifesto!))) throw new Error("nenhum disparo real com manifesto de coleta arquivado: sem data de origem para a cópia");
  const m = lerJson<{ generatedAt: string; identity: { siteManifestSha256: string; statePlanSha256: string }; reference: { sha256: string }; repos: Record<string, { commit: string | null }> }>(join(repo, primeiro.manifesto!));
  const item = (k: string) => doc.items.find((i) => i.kind === k);
  const instr = item("instrument")?.location as { commit?: string } | undefined;
  if (item("site")?.sha256 !== m.identity.siteManifestSha256 || item("reference")?.sha256 !== m.reference.sha256 || item("state-plan")?.sha256 !== m.identity.statePlanSha256
    || instr?.commit !== m.repos["govbr-eval"]?.commit) {
    throw new Error(`o manifesto de ${primeiro.chave} não descreve os itens do conjunto (site, referência, plano ou commit do instrumento divergem)`);
  }
  const reparado: SnapshotManifest = { contract: "snapshot-manifest.v1", fixture: false, snapshotSetId: id, createdAt: m.generatedAt, items: doc.items };
  const v = validateContract(reparado);
  if (!v.valid) throw new Error(`cópia fora do contrato: ${JSON.stringify(v.errors)}`);
  const repBytes = json(reparado);
  const registro: ReparoConjunto = {
    formato: REPARO_CONJUNTO_VERSAO, snapshotSetId: id,
    motivo: `${rel} foi gravado por um ensaio (fixture: true) e depois apontado por disparos reais com os mesmos itens (o id era só o hash dos itens). ` +
      "A análise recusa misturar natureza. Cópia real, mesmos itens e mesmo id, gravada ao lado; o original fica intocado e continua sendo o do ensaio.",
    original: { caminho: rel, sha256: sha(bytes), fixture: doc.fixture },
    reparado: { caminho: caminhoConjuntoReparado(id), sha256: sha(repBytes), fixture: false },
    itensSha256: sha(canonical(doc.items)),
    referenciadoPor: refs.map((r) => ({ chave: r.chave, caminho: r.caminho, tipo: r.tipo, fixture: r.fixture })),
    feitoEm: agora.toISOString().replace(/\.\d+Z$/, "Z"),
    script: "govbr-eval/scripts/ci/reparar-conjunto-fixture.ts",
  };
  return { id, original: registro.original, reparado, registro, referencias: refs };
}

export function aplicarReparoConjunto(repo: string, plano: PlanoConjunto, commit = true): void {
  gravarImutavel(join(repo, plano.registro.reparado.caminho), json(plano.reparado));
  gravarImutavel(join(repo, caminhoReparoConjunto(plano.id)), json(plano.registro));
  // confere pelo mesmo caminho que o painel e o arquivamento usam
  const r = resolverConjunto(repo, plano.id, false);
  if (r.caminho !== plano.registro.reparado.caminho) throw new Error(`a resolução não chegou à cópia reparada (${r.caminho})`);
  if (resolverConjunto(repo, plano.id, true).caminho !== plano.original.caminho) throw new Error("o ensaio deixou de resolver o original");
  if (!commit) return;
  const git = (...a: string[]) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("add", "--", plano.registro.reparado.caminho, caminhoReparoConjunto(plano.id));
  git("commit", "-q", "-m", `reparo: conjunto de snapshots ${plano.id} real × ensaio (cópia real ao lado, original intocado)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const val = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
    const arquivo = val("--arquivo"), id = val("--conjunto");
    if (!arquivo || !id) throw new Error("uso: reparar-conjunto-fixture.ts --arquivo CLONE --conjunto snapshots-<id> [--aplicar] [--sem-commit]");
    const repo = resolve(arquivo);
    if (existsSync(join(repo, caminhoReparoConjunto(id)))) {
      // já reparado: só confere (resolverConjunto lança se algo não bater)
      console.log(`${id}: já reparado; a cópia real ${resolverConjunto(repo, id, false).caminho} confere com o registro`);
      process.exit(0);
    }
    const plano = planejarReparoConjunto(repo, id);
    if (!plano) { console.log(`${id}: nenhum disparo de outra natureza aponta este conjunto; nada a reparar`); process.exit(0); }
    console.log(`original  ${plano.original.caminho} (fixture: ${plano.original.fixture}, sha256 ${plano.original.sha256})`);
    for (const r of plano.referencias) console.log(`  apontado por ${r.tipo} ${r.chave} (fixture: ${r.fixture})`);
    console.log(`cópia     ${plano.registro.reparado.caminho} (fixture: false, sha256 ${plano.registro.reparado.sha256})`);
    console.log(`registro  ${caminhoReparoConjunto(plano.id)} (itens sha256 ${plano.registro.itensSha256}, iguais nos dois)`);
    if (!args.includes("--aplicar")) { console.log("(seco: nada mudou; repita com --aplicar para gravar e commitar, sem push)"); process.exit(0); }
    aplicarReparoConjunto(repo, plano, !args.includes("--sem-commit"));
    console.log(args.includes("--sem-commit") ? "reparado (sem commit)" : "reparado e commitado (sem push)");
  } catch (e) { console.error((e as Error).message); process.exit(1); }
}
