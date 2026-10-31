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
 * outra, ou se as duas mudam o estado da página. Remover a raiz de uma instância conta como efeito sobre todas as
 * partes dela, inclusive no próprio hospedeiro (Revisão Codex 3); --validar confere isso por um caminho independente. Chamariz é instância sem colocação e sem nó tocado ou
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
const NODE_LIMIT = 1_000_000_000;
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
//#region revisao-formal-1
/**
 * REVISÃO FORMAL 1 (NAT-110; parecer Codex a82a9728; thesis-workspace/decisoes-do-assistente.md, 2026-10-31).
 * Emenda POSTERIOR à falha preservada em 80f7863 e relatada como emenda: mesma semente, NODE_LIMIT fixo de
 * 1.000.000.000 nós, UMA execução adicional e nenhuma terceira. Se falhar de novo, a A2 encerra sem sorteio.
 *
 * Tudo o que a emenda acrescenta está entre linhas `//#region revisao-formal-1` e `//#endregion revisao-formal-1`.
 * Tirando esses blocos (marcadores inclusive) e voltando a linha do NODE_LIMIT a `const NODE_LIMIT = 5_000_000;`, o
 * texto é byte a byte o blob selado `git show <semente>:scripts/draw-tela-a2.ts` — a execução com --revisao confere
 * isso antes de qualquer outra coisa, e scripts/test-draw-tela-a2-revisao.ts confere por um caminho independente.
 * Logo solve(), ordem/keys, compatibilidade/clash, cotas, variantes, hospedeiros, alternativas/chamarizes e
 * verifySolution são os do script selado. Sem --revisao o caminho é o original (e --semente recusa: o script mudou
 * depois da semente e sorteio-falha.json existe).
 *
 * Uso: npm run tela-a2:sorteio -- --semente <40 hex> --revisao tela-a2/revisao-formal-1.json [--so-guardas]
 *   --so-guardas  confere só as guardas de identidade abaixo e sai 0: não lê insumos, não ordena nada pela semente.
 *
 * A exceção vale para UMA identidade, escrita AQUI e não no manifesto: semente, commits da autorização e da falha,
 * sha256 dos registros originais e do script selado, os dois limites. O manifesto tem de repetir exatamente esses
 * valores e acrescentar o sha256 do script revisado e o commit em que ele entrou (o manifesto vive fora do script:
 * não há circularidade). Únicas relaxações, e só com o manifesto validado: a deriva permitida dos congelados é
 * scripts/draw-tela-a2.ts (no sha256 do manifesto, num único commit depois da semente) e a única falha anterior
 * aceita é a registrada aqui. Saídas: caminhos novos (RF1_EXEC, RF1_FAIL); a solução, se houver, vai para
 * tela-a2/sorteio.json, o caminho canônico que a construção cita e que nunca existiu (a guarda confere).
 */
// identidade:início
const RF1 = {
  manifesto: "tela-a2/revisao-formal-1.json",
  semente: "876024a331d8e9cc05837554f11aeda01aa8b2ff",
  commitAutorizacao: "d7a9ddd9b434138a36715773603f93e2827dd869",
  commitFalha: "80f7863f715882c7aab8e1af0b8d3ce6012edbb5",
  limiteNosOriginal: 5_000_000,
  limiteNosNovo: 1_000_000_000,
  scriptOriginalSha256: "a0664ef9e6a29337541bcf5e03664223274f69b2252cb5188e278947bf240a00",
  registros: {
    "tela-a2/sorteio-falha.json": "fed2d90182411be7ee53c658fd490eeece93aac21bb00a642ad3ebddc3ed3b64",
    "tela-a2/sorteio-execucao.json": "f327e0f338d94b2d8315f302864913e0985410bb4abeed28a08b5288aeb2773d",
    "tela-a2/semente-autorizada.json": "bd8770c4637a6c3266d2986ca22641a488d42e87164592afbbfe54fe14ef6ff4",
  } as Record<string, string>,
};
// identidade:fim
const RF1_SCRIPT = "scripts/draw-tela-a2.ts";
const RF1_EXEC = "tela-a2/revisao-formal-1-execucao.json";
const RF1_FAIL = "tela-a2/revisao-formal-1-falha.json";
const RF1_BEGIN = "//#region revisao-formal-1";
const RF1_END = "//#endregion revisao-formal-1";
const revisaoArg = args.includes("--revisao") ? (args[args.indexOf("--revisao") + 1] ?? "") : null;
const soGuardas = args.includes("--so-guardas");
if (revisaoArg !== null && mode !== "sortear") fail("--revisao só vale com --semente");
if (revisaoArg !== null && revisaoArg !== RF1.manifesto) fail(`--revisao aceita só ${RF1.manifesto}`);
if (soGuardas && revisaoArg === null) fail("--so-guardas só vale com --revisao");
const revisao = revisaoArg !== null;
let rf1Info: { manifestoSha256: string; manifestoCommit: string; scriptRevisadoCommit: string } | null = null;

/** Tira os blocos da emenda e volta o limite: tem de dar o texto do script selado. */
function normalizarRevisao(text: string): string {
  if (text.includes("\r")) fail(`${RF1_SCRIPT} tem CR (o arquivo é eol=lf)`);
  const out: string[] = [];
  let inside = false, limite = 0;
  for (const l of text.split("\n")) {
    if (l === RF1_BEGIN) { if (inside) fail("bloco da emenda aninhado"); inside = true; continue; }
    if (l === RF1_END) { if (!inside) fail("fim de bloco da emenda sem início"); inside = false; continue; }
    if (/^\s*\/\/#(end)?region\b/.test(l)) fail(`marcador de bloco fora do formato exato: ${l}`);
    if (inside) continue;
    if (l === "const NODE_LIMIT = 1_000_000_000;") { limite++; out.push("const NODE_LIMIT = 5_000_000;"); continue; }
    out.push(l);
  }
  if (inside) fail("bloco da emenda sem fim");
  if (limite !== 1) fail("a linha do NODE_LIMIT revisado tem de aparecer exatamente uma vez, fora dos blocos");
  return out.join("\n");
}

/** Chave canônica (ordem de chaves irrelevante) para comparar os campos estruturais do manifesto. */
const canon = (v: unknown): string => Array.isArray(v) ? `[${v.map(canon).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v as object).sort().map(k => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
  : JSON.stringify(v);

/** Guardas da execução adicional: identidade da semente (as do caminho original), da falha, do script e do manifesto. */
function identidadeRevisao(seed: string) {
  const gitRaw = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, maxBuffer: 1 << 28 });
  const blobSha = (rev: string, f: string) => { try { return sha256(gitRaw("show", `${rev}:${f}`)); } catch { return null; } };
  const ancestor = (a: string, b: string) => gitOk("merge-base", "--is-ancestor", a, b);
  const lines = (s: string) => s.split("\n").filter(Boolean);
  if (seed !== RF1.semente) fail(`a revisão formal 1 vale só para a semente ${RF1.semente}`);
  if (NODE_LIMIT !== RF1.limiteNosNovo) fail(`NODE_LIMIT (${NODE_LIMIT}) não é o limite da revisão (${RF1.limiteNosNovo})`);

  // (a) identidade da semente: as mesmas conferências do caminho original
  if (!existsSync(join(ROOT, AUTH))) fail(`${AUTH} não existe`);
  const auth = readJson<{ semente: string }>(AUTH);
  if (auth.semente !== seed) fail(`semente diferente da autorizada (${auth.semente})`);
  if (!gitOk("cat-file", "-e", `HEAD:${AUTH}`)) fail(`${AUTH} não está commitado`);
  if (git("show", `HEAD:${AUTH}`) !== readRaw(AUTH).toString("utf8").trim()) fail(`${AUTH} difere do commitado`);
  const authCommits = lines(git("log", "--format=%H", "--", AUTH));
  if (authCommits.length !== 1) fail(`${AUTH} foi mexido em ${authCommits.length} commits; tem de ser adicionado uma vez e nunca alterado`);
  if (authCommits[0] !== RF1.commitAutorizacao) fail(`${AUTH} entrou em ${authCommits[0]}, não em ${RF1.commitAutorizacao}`);
  if (!gitOk("cat-file", "-e", `${seed}^{commit}`)) fail(`${seed} não é commit deste repositório`);
  if (!ancestor(seed, authCommits[0])) fail("o commit que autoriza a semente não descende dela");
  if (seed === authCommits[0]) fail("a semente não pode ser o próprio commit de autorização");
  if (!ancestor(seed, "HEAD")) fail("a semente não é ancestral do HEAD");
  const statusAt = (rev: string) => { try { return JSON.parse(git("show", `${rev}:${PARAMS}`))._meta?.status; } catch { return null; } };
  if (statusAt(seed) !== "CONGELADO") fail("parametros.json não está CONGELADO no commit da semente");
  if (statusAt(`${seed}^`) === "CONGELADO") fail("a semente não é o primeiro commit de congelamento (o pai já estava CONGELADO)");
  const firstFreeze = lines(git("log", "--reverse", "--format=%H", "-S", '"status": "CONGELADO"', "--", PARAMS))[0];
  if (firstFreeze !== seed) fail(`o primeiro congelamento no histórico é ${firstFreeze}, não a semente`);
  for (const f of params.congelados) if (!gitOk("cat-file", "-e", `${seed}:${f}`)) fail(`arquivo congelado ausente do commit da semente: ${f}`);

  // (b) a falha original: exatamente a registrada aqui, preservada byte a byte (disco, HEAD e commit da falha)
  if (!gitOk("cat-file", "-e", `${RF1.commitFalha}^{commit}`)) fail(`${RF1.commitFalha} não é commit deste repositório`);
  if (!ancestor(RF1.commitAutorizacao, RF1.commitFalha) || !ancestor(RF1.commitFalha, "HEAD")) fail("o commit da falha não está entre a autorização e o HEAD");
  for (const [f, want] of Object.entries(RF1.registros)) {
    if (!existsSync(join(ROOT, f)) || sha256(readRaw(f)) !== want) fail(`${f} no disco não é o registro preservado (sha256 ${want})`);
    if (blobSha("HEAD", f) !== want) fail(`${f} no HEAD não é o registro preservado`);
    if (blobSha(RF1.commitFalha, f) !== want) fail(`${f} no commit da falha não é o registro preservado`);
  }
  for (const f of [FAIL, EXEC]) {
    const cs = lines(git("log", "--all", "--format=%H", "--", f));
    if (cs.length !== 1 || cs[0] !== RF1.commitFalha) fail(`${f} tem de ter entrado só no commit da falha ${RF1.commitFalha} e nunca mudado (achados: ${cs.join(", ")})`);
  }
  const falha = readJson<{ semente: string; erro: string; nos: number }>(FAIL);
  if (falha.semente !== seed || falha.erro !== "limite de nós" || falha.nos !== RF1.limiteNosOriginal + 1) fail(`${FAIL} não é a falha por limite de nós desta semente`);
  const exec0 = readJson<{ semente: string; script: string; resultado: string }>(EXEC);
  if (exec0.semente !== seed || exec0.script !== RF1.scriptOriginalSha256 || exec0.resultado !== "FALHA: limite de nós") fail(`${EXEC} não é a execução original do script selado`);

  // (c) o script: só os blocos da emenda e o limite mudaram em relação ao selado
  const sealed = gitRaw("show", `${seed}:${RF1_SCRIPT}`);
  if (sha256(sealed) !== RF1.scriptOriginalSha256) fail(`${RF1_SCRIPT} na semente não tem o sha256 selado`);
  const current = readRaw(RF1_SCRIPT);
  if (normalizarRevisao(current.toString("utf8")) !== sealed.toString("utf8")) fail(`${RF1_SCRIPT}, sem os blocos da emenda e com o limite original, difere do blob selado: a busca mudou`);
  const scriptSha = sha256(current);
  const scriptCommits = lines(git("log", "--format=%H", `${seed}..HEAD`, "--", RF1_SCRIPT));
  if (scriptCommits.length !== 1) fail(`${RF1_SCRIPT} tem de mudar num único commit depois da semente (achados: ${scriptCommits.length})`);
  const S = scriptCommits[0];
  if (S === RF1.commitFalha || !ancestor(RF1.commitFalha, S)) fail("o commit da revisão do script não descende do commit da falha");
  if (blobSha(S, RF1_SCRIPT) !== scriptSha || blobSha("HEAD", RF1_SCRIPT) !== scriptSha) fail(`${RF1_SCRIPT} no disco difere do commit da revisão`);

  // (d) deriva dos congelados: a única permitida é o script
  const drift = lines(git("diff", "--name-only", seed, "HEAD", "--", ...params.congelados));
  if (drift.length !== 1 || drift[0] !== RF1_SCRIPT) fail(`a única deriva permitida é ${RF1_SCRIPT}; mudaram:\n${drift.join("\n")}`);
  const dirty = git("status", "--porcelain", "--", ...params.congelados);
  if (dirty) fail(`arquivos congelados com mudança não commitada:\n${dirty}`);

  // (e) o manifesto: commitado uma vez, num commit só dele, depois da revisão do script; igual ao commitado
  const M = RF1.manifesto;
  if (!existsSync(join(ROOT, M))) fail(`${M} não existe`);
  const manifestoSha = sha256(readRaw(M));
  if (blobSha("HEAD", M) !== manifestoSha) fail(`${M} difere do commitado no HEAD (ou não está commitado)`);
  if (git("status", "--porcelain", "--", M)) fail(`${M} com mudança não commitada`);
  const mCommits = lines(git("log", "--all", "--format=%H", "--", M));
  if (mCommits.length !== 1) fail(`${M} foi mexido em ${mCommits.length} commits; tem de ser adicionado uma vez e nunca alterado`);
  const MC = mCommits[0];
  if (!ancestor(MC, "HEAD")) fail(`o commit de ${M} não é ancestral do HEAD`);
  if (MC === S || !ancestor(S, MC)) fail(`${M} tem de ser commitado DEPOIS da revisão do script, em commit próprio`);
  if (!ancestor(RF1.commitFalha, MC)) fail(`${M} não descende do commit da falha`);
  const mFiles = git("diff-tree", "--no-commit-id", "--name-status", "-r", MC);
  if (mFiles !== `A\t${M}`) fail(`o commit de ${M} tem de só adicioná-lo:\n${mFiles}`);
  const man = readJson<Record<string, unknown>>(M);
  const prosa = ["tela", "motivo", "provaDeIdentidade", "ratificacao", "regraDeParada", "revisaoIndependente"];
  const esperado: Record<string, unknown> = {
    revisao: "revisao-formal-1",
    semente: RF1.semente,
    limiteNos: { original: RF1.limiteNosOriginal, novo: RF1.limiteNosNovo },
    execucoesAdicionais: 1,
    falhaOriginal: { commit: RF1.commitFalha, registros: { [FAIL]: RF1.registros[FAIL], [EXEC]: RF1.registros[EXEC] } },
    sementeAutorizada: { arquivo: AUTH, commit: RF1.commitAutorizacao, sha256: RF1.registros[AUTH] },
    scriptOriginal: { arquivo: RF1_SCRIPT, commit: RF1.semente, sha256: RF1.scriptOriginalSha256 },
    scriptRevisado: { arquivo: RF1_SCRIPT, commit: S, sha256: scriptSha },
    saidas: { execucao: RF1_EXEC, falha: RF1_FAIL, sorteio: OUT },
  };
  const keys = Object.keys(man).sort();
  const want = [...Object.keys(esperado), ...prosa].sort();
  if (canon(keys) !== canon(want)) fail(`${M}: campos ${keys.join(", ")}; esperados ${want.join(", ")}`);
  for (const k of prosa) if (typeof man[k] !== "string" || !(man[k] as string).trim()) fail(`${M}: ${k} vazio`);
  for (const [k, v] of Object.entries(esperado)) if (canon(man[k]) !== canon(v)) fail(`${M}: ${k} = ${canon(man[k])}; esperado ${canon(v)}`);

  // (f) execução adicional única: nada dela no disco nem no histórico
  for (const f of [OUT, RF1_EXEC, RF1_FAIL]) {
    if (existsSync(join(ROOT, f))) fail(`${f} já existe: a execução adicional é única`);
    if (git("log", "--all", "--format=%H", "--", f)) fail(`${f} já existiu no histórico: a execução adicional é única`);
  }
  console.log(`revisão formal 1: guardas OK — semente ${seed}, falha ${RF1.commitFalha}, script revisado ${S} (${scriptSha}), manifesto ${MC} (${manifestoSha}), limite ${NODE_LIMIT}`);
  if (soGuardas) { console.log("--so-guardas: nada lido além das guardas, nada ordenado pela semente."); process.exit(0); }
  return { manifestoSha256: manifestoSha, manifestoCommit: MC, scriptRevisadoCommit: S };
}
//#endregion revisao-formal-1

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
//#region revisao-formal-1
  if (revisao) rf1Info = identidadeRevisao(seed); else {
//#endregion revisao-formal-1
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
//#region revisao-formal-1
  }
//#endregion revisao-formal-1
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
  // Remoção (ou ocultação declarada como remoção) da raiz de uma instância atinge TODOS os seus descendentes
  // (Revisão Codex 3, P2): as partes da instância entram como nós tocados — inclusive quando a instância é o
  // próprio hospedeiro — e as instâncias contidas na raiz entram como atingidas. Sem modelo de janela temporal.
  for (const n of (ef.remove ?? []).map(abs)) {
    const [inst, part] = n.split(":");
    if (part === "raiz") {
      for (const p of vocab.partes[vocab.instancias[inst]]) nodes.add(`${inst}:${p}`);
      if (inst !== host) hit.add(inst);
    }
    for (const i of vocab.contem[n] ?? []) { if (i === "*") ALL_INST.forEach(x => hit.add(x)); else hit.add(i); }
  }
  hit.delete(host); // a própria instância já é o hospedeiro; os descendentes dela estão em `nodes`
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
    _meta: { geradoPor: "scripts/draw-tela-a2.ts --validar", derivadoDe: [EFEITOS, VOCAB, "tela-a2/elegibilidade.json"], regra: "incompatíveis se tocam nó em comum (remover a raiz de uma instância toca todas as partes dela); se cascata ou remoção da raiz de uma atinge a instância de um nó da outra; ou se as duas mudam o estado da página. Independente de semente.", colocacoes: triples.length, paresMesmoHospedeiro: sameHostPairs, paresMesmoHospedeiroIncompativeis: sameHostClash, paresEntreHospedeirosIncompativeis: crossHost.length },
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

/**
 * Conferência NEGATIVA da remoção de raiz (Revisão Codex 3, P2), sem usar a lógica de clash(): a expectativa é
 * derivada direto das declarações brutas (efeitos.json + vocabulário) e só então comparada ao que o contrato diz.
 * Toda colocação que remove a raiz de uma instância X tem de ser incompatível com toda outra colocação (de outra
 * regra) hospedada em X, que toque qualquer nó de X, ou hospedada numa instância contida na raiz de X. Inclui o par
 * concreto apontado pelo Codex (erro-some-sozinho × prefixo-textual-visivel em msg-retorno).
 */
function checkRootRemoval() {
  type Raw = { regra: string; kind: "variantes" | "alternativas"; id: string; host: string; toca: string[]; remove: string[] };
  const raws: Raw[] = [];
  for (const r of eligible) {
    const add = (kind: "variantes" | "alternativas", id: string, host: string) => {
      const d = efeitos[r.id][kind]![id]; const ef = "porHospedeiro" in d ? d.porHospedeiro[host] : d;
      const abs = (n: string) => (n.startsWith("$:") ? `${host}:${n.slice(2)}` : n);
      raws.push({ regra: r.id, kind, id, host, toca: ef.toca.map(abs), remove: (ef.remove ?? []).map(abs) });
    };
    for (const v of r.variantes) for (const h of r.instancias.filter(i => appliesTo(v, i))) add("variantes", v.id, h);
    for (const a of r.alternativasValidas) for (const h of a.instancias ?? r.instancias) add("alternativas", a.id, h);
  }
  const fx = (w: Raw) => fxOf(eligible.find(r => r.id === w.regra)!, w.kind, w.id, w.host);
  let expected = 0;
  for (const t of raws) for (const root of t.remove.filter(n => n.endsWith(":raiz"))) {
    const X = root.split(":")[0];
    const inside = new Set(vocab.contem[root] ?? []);
    for (const u of raws) {
      if (u.regra === t.regra) continue;
      const hits = u.host === X || inside.has(u.host) || [...u.toca, ...u.remove].some(n => n.split(":")[0] === X);
      if (!hits) continue;
      expected++;
      if (!clash({ inst: t.host, fx: fx(t) }, { inst: u.host, fx: fx(u) })) fail(`remoção de raiz sem incompatibilidade: ${t.regra}/${t.id}@${t.host} × ${u.regra}/${u.kind === "alternativas" ? "alt:" : ""}${u.id}@${u.host}`);
    }
  }
  const par = raws.filter(w => (w.regra === "a2-46523775b9da" && w.id === "erro-some-sozinho" && w.host === "msg-retorno") || (w.regra === "a2-e5b4728ca51e" && w.id === "prefixo-textual-visivel" && w.host === "msg-retorno"));
  if (par.length === 2 && !clash({ inst: par[0].host, fx: fx(par[0]) }, { inst: par[1].host, fx: fx(par[1]) })) fail("par concreto da Revisão Codex 3 compatível: erro-some-sozinho × prefixo-textual-visivel @msg-retorno");
  return { paresConferidos: expected, parConcretoPresente: par.length === 2 };
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
  console.log("remoção de raiz × descendentes (conferência negativa, sem clash()):", checkRootRemoval());
  console.log("matriz de incompatibilidade:", matrix(), `→ ${MATRIZ}`);
  console.log("viabilidade independente de semente:", feasibility());
  console.log(`status: ${params._meta.status}`);
  const unsealed = HASHED.filter(rel => !params.sha256.arquivos[rel]);
  if (unsealed.length) console.log(`aviso: sha256 ainda não selados (${unsealed.length}); rode --selar antes do commit da semente.`);
  process.exit(0);
}

//#region revisao-formal-1
if (revisao) {
  // Execução adicional única da revisão formal 1: a MESMA key e a MESMA chamada solve(key) do caminho original
  // (só NODE_LIMIT mudou); os registros vão para caminhos novos e apontam os originais pelo sha256.
  const info = rf1Info!;
  const started = new Date().toISOString();
  const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);
  const ligacao = {
    manifesto: RF1.manifesto, manifestoSha256: info.manifestoSha256, manifestoCommit: info.manifestoCommit,
    scriptRevisadoCommit: info.scriptRevisadoCommit, limiteNos: NODE_LIMIT, limiteNosOriginal: RF1.limiteNosOriginal,
    falhaOriginal: { commit: RF1.commitFalha, registros: RF1.registros },
  };
  const base = {
    semente: seed, head: git("rev-parse", "HEAD"), inicio: started,
    node: process.version, plataforma: `${process.platform} ${process.arch}`,
    script: sha256(readRaw(RF1_SCRIPT)), insumos: Object.fromEntries(params.congelados.map(f => [f, sha256(readRaw(f))])),
    revisaoFormal: ligacao,
  };
  // A tentativa é marcada ANTES da busca: uma execução interrompida deixa este arquivo e a próxima chamada recusa.
  writeFileSync(join(ROOT, RF1_EXEC), JSON.stringify({ ...base, resultado: "EM EXECUÇÃO — se ficou assim, a execução adicional foi interrompida e não há outra" }, null, 2) + "\n");
  const result = solve(key);
  const nota = "Execução adicional única da revisão formal 1 (NAT-110). Não há terceira: se falhou, a A2 encerra sem sorteio; os registros originais ficam como estão.";
  const execRecord = { ...base, fim: new Date().toISOString(), nos: result.nodes, resultado: "erro" in result ? `FALHA: ${result.erro}` : OUT, nota };
  if ("erro" in result) {
    writeFileSync(join(ROOT, RF1_FAIL), JSON.stringify({ semente: seed, erro: result.erro, nos: result.nodes, revisaoFormal: ligacao }, null, 2) + "\n");
    writeFileSync(join(ROOT, RF1_EXEC), JSON.stringify(execRecord, null, 2) + "\n");
    console.error(`FALHA gravada em ${RF1_FAIL}; revisão formal 1 esgotada: a A2 encerra sem sorteio.`);
    process.exit(1);
  }
  const byKeyQ = (s: Estrato) => [...eligible.filter(r => r.estrato === s)].sort((a, b) => key("regra", a.id).localeCompare(key("regra", b.id))).map(r => r.id);
  const out = {
    _meta: { regra: PARAMS, semente: seed, sha256: execRecord.insumos, corpusManifest: params.sha256.corpusManifest, revisaoFormal: ligacao },
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
  if (inv.some(x => !x)) {
    writeFileSync(join(ROOT, RF1_FAIL), JSON.stringify({ semente: seed, erro: "invariante final violada", inv, nos: result.nodes, revisaoFormal: ligacao }, null, 2) + "\n");
    writeFileSync(join(ROOT, RF1_EXEC), JSON.stringify({ ...execRecord, resultado: "FALHA: invariante final violada" }, null, 2) + "\n");
    process.exit(1);
  }
  writeFileSync(join(ROOT, OUT), JSON.stringify(out, null, 2) + "\n");
  writeFileSync(join(ROOT, RF1_EXEC), JSON.stringify({ ...execRecord, sorteioSha256: sha256(readRaw(OUT)) }, null, 2) + "\n");
  console.log(`${OUT} gravado (revisão formal 1) — specs ${result.specs.length} · compartilhadas ${params.compartilhadas} · alternativas ${result.alternatives.length} · chamarizes ${result.decoys.length} · reparos ${result.repairs} · nós ${result.nodes}`);
  process.exit(0);
} else {
//#endregion revisao-formal-1
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
//#region revisao-formal-1
}
//#endregion revisao-formal-1
