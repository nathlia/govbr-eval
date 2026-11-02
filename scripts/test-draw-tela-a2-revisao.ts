/**
 * Revisão formal 1 do sorteio da A2 (NAT-110) — testes das guardas e prova de identidade do patch.
 *
 *   npm run test:tela-a2-revisao
 *
 * NUNCA usa a semente real para ordenar nada: as guardas são exercidas em repositórios git temporários com
 * sementes sintéticas, e toda chamada que aceita roda com --so-guardas (sai antes de ler insumos e antes da busca).
 * No repositório real só há leitura (git show / git diff / sha256).
 *
 * 1. Prova no repositório real, por implementação própria (não chama normalizarRevisao do script):
 *    - o script revisado, sem os blocos `//#region revisao-formal-1` … `//#endregion revisao-formal-1` e com a linha
 *      do NODE_LIMIT de volta a 5_000_000, é byte a byte `git show 876024a:scripts/draw-tela-a2.ts`;
 *    - nenhum outro arquivo de `congelados` difere da semente (disco e HEAD);
 *    - a identidade escrita no script (semente, commits, sha256) é a do repositório real;
 *    - o manifesto tem os valores reais e o sha256 do script revisado do disco;
 *    - nos blocos da emenda só se grava em tela-a2/sorteio.json e nos dois caminhos novos, e a busca é a mesma chamada.
 * 2. Repositórios sintéticos: sem --revisao recusa como antes (falha existente; deriva do script); manifesto válido
 *    aceito; adulterações recusadas uma a uma. (Seções 1–2 rodam sobre o script SEM os blocos da revisão 2, que é o
 *    script da revisão 1.)
 *
 * Revisão formal 2 (D-160, busca podada):
 * 3. Prova no repositório real: sem os blocos `revisao-formal-2`, o script é byte a byte `git show a415e33:…`; a
 *    identidade da revisão 2 é a do repositório; o módulo scripts/tela-a2-busca-podada.ts, sem as 4 linhas de gancho,
 *    é o corpo de solve() byte a byte; os ganchos só devolvem null; o rascunho do manifesto tem os valores reais.
 * 4. Ordem neutra (insumos reais, sem semente): solve() × busca cega × busca podada — mesma solução, e cega = solve()
 *    nó a nó. Não grava nada.
 * 5. Propriedade: RF2_PROPRIEDADE (padrão 400) instâncias pequenas sorteadas; cega × podada, mesma primeira solução.
 * 6. Guardas da revisão 2 em repositórios sintéticos (histórico inteiro: semente → falha → revisão 1 → revisão 2).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = "scripts/draw-tela-a2.ts";
const UNIVERSO = "scripts/tela-a2-universo.ts";
const MANIFESTO = "tela-a2/revisao-formal-1.json";
const FAIL = "tela-a2/sorteio-falha.json", EXEC = "tela-a2/sorteio-execucao.json", AUTH = "tela-a2/semente-autorizada.json";
const RF1_EXEC = "tela-a2/revisao-formal-1-execucao.json", RF1_FAIL = "tela-a2/revisao-formal-1-falha.json", OUT = "tela-a2/sorteio.json";
const REAL = { seed: "876024a331d8e9cc05837554f11aeda01aa8b2ff", fail: "80f7863", auth: "d7a9ddd" };
const SEALED_SHA = "a0664ef9e6a29337541bcf5e03664223274f69b2252cb5188e278947bf240a00";
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const gitIn = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const gitRawIn = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, maxBuffer: 1 << 28 });
const realGit = (...a: string[]) => gitIn(ROOT, ...a);
let falhas = 0, ok = 0;
const check = (cond: boolean, nome: string, detalhe = "") => { if (cond) { ok++; console.log(`  ok   ${nome}`); } else { falhas++; console.log(`  FALHA ${nome}${detalhe ? `\n        ${detalhe}` : ""}`); } };

// ---------- 1. prova no repositório real (só leitura) ----------
console.log("1. prova de identidade no repositório real (só leitura)");
// Revisão formal 2 (D-160): o script do disco = script da revisão 1 + blocos `revisao-formal-2`. A prova da revisão 1
// roda sobre o texto sem esses blocos, que tem de ser byte a byte o blob commitado em a415e33 (seção 3 confere).
const diskText = readFileSync(join(ROOT, SCRIPT), "utf8");
const RF2_RE = /^\/\/#region revisao-formal-2\n[\s\S]*?^\/\/#endregion revisao-formal-2\n/gm;
const revisedText = diskText.replace(RF2_RE, "");
const sealed = gitRawIn(ROOT, "show", `${REAL.seed}:${SCRIPT}`);
check(sha(sealed) === SEALED_SHA, "blob selado na semente tem o sha256 a0664ef…");
// implementação própria: regex sobre o texto inteiro (o script usa varredura por linha)
const blocks = [...revisedText.matchAll(/^\/\/#region revisao-formal-1\n[\s\S]*?^\/\/#endregion revisao-formal-1\n/gm)];
const stripped = revisedText.replace(/^\/\/#region revisao-formal-1\n[\s\S]*?^\/\/#endregion revisao-formal-1\n/gm, "");
const limitLines = stripped.split("\n").filter(l => /NODE_LIMIT\s*=/.test(l));
const normalized = stripped.replace(/^const NODE_LIMIT = 1_000_000_000;$/m, "const NODE_LIMIT = 5_000_000;");
check(!revisedText.includes("\r"), "script revisado em LF");
check(blocks.length === 5, `cinco blocos (1 de definições + 2 pares que envolvem os dois trechos originais) da emenda (achados ${blocks.length})`);
check(limitLines.length === 1 && limitLines[0] === "const NODE_LIMIT = 1_000_000_000;", "fora dos blocos, uma única linha de limite: 1_000_000_000", limitLines.join(" | "));
check(!/#(end)?region/.test(stripped), "nenhum marcador sobra fora dos blocos");
check(normalized === sealed.toString("utf8"), "normalizado == git show 876024a:scripts/draw-tela-a2.ts, byte a byte");
const sealedLines = sealed.toString("utf8").split("\n").length, revisedLines = revisedText.split("\n").length;
console.log(`        selado ${sealedLines} linhas · revisado ${revisedLines} · blocos ${blocks.map(b => b[0].split("\n").length - 1).join("+")} linhas · 1 linha de limite`);
const congelados: string[] = JSON.parse(realGit("show", `${REAL.seed}:tela-a2/parametros.json`)).congelados;
const driftDisk = realGit("diff", "--name-only", REAL.seed, "--", ...congelados).split("\n").filter(Boolean);
check(driftDisk.length === 1 && driftDisk[0] === SCRIPT, "no disco, o único congelado que difere da semente é o script", driftDisk.join(", "));
const driftHead = realGit("diff", "--name-only", REAL.seed, "HEAD", "--", ...congelados).split("\n").filter(Boolean);
check(driftHead.every(f => f === SCRIPT), "no HEAD, nenhum outro congelado difere da semente", driftHead.join(", "));
const idBlock = /\/\/ identidade:início\n([\s\S]*?)\/\/ identidade:fim/.exec(revisedText)?.[1] ?? "";
const realFail = realGit("rev-parse", REAL.fail), realAuth = realGit("rev-parse", REAL.auth);
const realRec = { [FAIL]: sha(gitRawIn(ROOT, "show", `${realFail}:${FAIL}`)), [EXEC]: sha(gitRawIn(ROOT, "show", `${realFail}:${EXEC}`)), [AUTH]: sha(gitRawIn(ROOT, "show", `${realAuth}:${AUTH}`)) };
for (const [nome, v] of Object.entries({ semente: REAL.seed, commitFalha: realFail, commitAutorizacao: realAuth, scriptSelado: SEALED_SHA, ...realRec }))
  check(idBlock.includes(`"${v}"`), `identidade no script: ${nome} = ${v.slice(0, 12)}…`);
check(/limiteNosOriginal: 5_000_000,/.test(idBlock) && /limiteNosNovo: 1_000_000_000,/.test(idBlock), "identidade no script: limites 5.000.000 → 1.000.000.000");
check(realRec[FAIL] === "fed2d90182411be7ee53c658fd490eeece93aac21bb00a642ad3ebddc3ed3b64" && realRec[EXEC] === "f327e0f338d94b2d8315f302864913e0985410bb4abeed28a08b5288aeb2773d", "registros da falha no 80f7863 = fed2d901… / f327e0f3…");
const man = JSON.parse(readFileSync(join(ROOT, MANIFESTO), "utf8"));
check(man.semente === REAL.seed && man.falhaOriginal.commit === realFail && man.sementeAutorizada.commit === realAuth && man.limiteNos.original === 5_000_000 && man.limiteNos.novo === 1_000_000_000, "manifesto real: semente, commits e limites");
check(man.falhaOriginal.registros[FAIL] === realRec[FAIL] && man.falhaOriginal.registros[EXEC] === realRec[EXEC] && man.sementeAutorizada.sha256 === realRec[AUTH] && man.scriptOriginal.sha256 === SEALED_SHA, "manifesto real: sha256 dos registros e do script selado");
check(man.scriptRevisado.sha256 === sha(revisedText), "manifesto real: sha256 do script revisado == disco sem os blocos da revisão 2", `${man.scriptRevisado.sha256} × ${sha(revisedText)}`);
check(/^[0-9a-f]{40}$/.test(man.scriptRevisado.commit) || man.scriptRevisado.commit.startsWith("PREENCHER"), `manifesto real: commit do script revisado = ${String(man.scriptRevisado.commit).slice(0, 12)}…`);
const amend = blocks.map(b => b[0]).join("");
const writes = [...amend.matchAll(/writeFileSync\(join\(ROOT, (\w+)\)/g)].map(m => m[1]);
check(writes.length > 0 && writes.every(w => ["OUT", "RF1_EXEC", "RF1_FAIL"].includes(w)), `nos blocos só se grava em OUT, RF1_EXEC, RF1_FAIL (${[...new Set(writes)].join(", ")})`);
const keyLine = "const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);";
check(sealed.toString("utf8").includes(keyLine) && amend.includes(`  ${keyLine}`) && (amend.match(/=\s*solve\(/g) ?? []).length === 1 && amend.includes("const result = solve(key);"), "nos blocos, a busca é a mesma: mesma key e uma única chamada solve(key)");
check(!/function (solve|clash|canPlace|resolveFx|verifySolution|fxOf)\b|const (fxOf|byKey|params|eligible) =/.test(amend), "nos blocos não se redefine nada da busca");

// ---------- 2. repositórios sintéticos ----------
console.log("2. guardas em repositórios sintéticos (sementes falsas; --so-guardas)");
const work = mkdtempSync(join(tmpdir(), "rf1-a2-"));
const SYN_CONGELADOS = ["tela-a2/parametros.json", "tela-a2/insumo.json", UNIVERSO, SCRIPT];
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

interface Opts {
  stage?: "falha" | "completo";
  mutateRevised?: (t: string) => string;          // muda o script revisado ANTES do commit S (o manifesto leva o sha dele)
  failConstOverride?: string;                     // constante do script ≠ registro do repositório
  driftAfterS?: boolean;                          // outro congelado muda num commit depois da revisão
  failChangedAfter?: boolean;                     // registro original mexido num commit depois da falha
  manifestPatch?: (m: Record<string, any>) => void;
  manifestWithScript?: boolean;
  manifestSecondCommit?: boolean;
  manifestUncommitted?: boolean;
  after?: (dir: string, g: (...a: string[]) => string) => void;
}
let n = 0;
function buildRepo(o: Opts = {}) {
  const dir = join(work, `r${++n}`);
  mkdirSync(join(dir, "scripts"), { recursive: true }); mkdirSync(join(dir, "tela-a2"), { recursive: true });
  const g = (...a: string[]) => gitIn(dir, ...a);
  g("init", "-q", "-b", "main"); g("config", "user.name", "teste"); g("config", "user.email", "teste@exemplo"); g("config", "core.autocrlf", "false");
  const w = (rel: string, content: string | Buffer) => writeFileSync(join(dir, rel), content);
  const commit = (msg: string) => { g("add", "-A"); g("commit", "-q", "-m", msg); return g("rev-parse", "HEAD"); };
  const params = (status: string) => json({ _meta: { status }, congelados: SYN_CONGELADOS, sha256: { corpusManifest: "x", arquivos: {} } });
  w(SCRIPT, sealed); copyFileSync(join(ROOT, UNIVERSO), join(dir, UNIVERSO)); w("tela-a2/insumo.json", json({ insumo: 1 })); w("tela-a2/parametros.json", params("RASCUNHO"));
  commit("rascunho");
  w("tela-a2/parametros.json", params("CONGELADO"));
  const seed = commit("CONGELADO");
  w(AUTH, json({ semente: seed, nota: "sintética" }));
  const auth = commit("autoriza");
  w(FAIL, json({ semente: seed, erro: "limite de nós", nos: 5_000_001 }));
  w(EXEC, json({ semente: seed, script: SEALED_SHA, nos: 5_000_001, resultado: "FALHA: limite de nós" }));
  const fail = commit("falha");
  const rec = { fail: sha(readFileSync(join(dir, FAIL))), exec: sha(readFileSync(join(dir, EXEC))), auth: sha(readFileSync(join(dir, AUTH))) };
  if (o.stage === "falha") return { dir, seed, auth, fail, g };
  if (o.failChangedAfter) { w(FAIL, json({ semente: seed, erro: "limite de nós", nos: 5_000_001, mexido: true })); commit("mexe na falha"); }
  let rev = revisedText;
  for (const [from, to] of [[REAL.seed, seed], [realFail, fail], [realAuth, auth], [realRec[FAIL], o.failConstOverride ?? rec.fail], [realRec[EXEC], rec.exec], [realRec[AUTH], rec.auth]] as const) {
    if (rev.split(from).length !== 2) throw new Error(`valor real aparece ${rev.split(from).length - 1}× no script: ${from}`);
    rev = rev.replace(from, to);
  }
  if (o.mutateRevised) rev = o.mutateRevised(rev);
  w(SCRIPT, rev);
  const m = JSON.parse(JSON.stringify(man));
  m.semente = seed; m.falhaOriginal = { commit: fail, registros: { [FAIL]: rec.fail, [EXEC]: rec.exec } };
  m.sementeAutorizada = { ...m.sementeAutorizada, commit: auth, sha256: rec.auth };
  m.scriptOriginal = { ...m.scriptOriginal, commit: seed };
  m.scriptRevisado = { ...m.scriptRevisado, sha256: sha(rev) };
  let S: string;
  if (o.manifestWithScript) { m.scriptRevisado.commit = "0".repeat(40); o.manifestPatch?.(m); w(MANIFESTO, json(m)); S = commit("script + manifesto juntos"); }
  else {
    S = commit("revisão do script");
    if (o.driftAfterS) { w("tela-a2/insumo.json", json({ insumo: 2 })); commit("deriva"); }
    m.scriptRevisado.commit = S; o.manifestPatch?.(m); w(MANIFESTO, json(m));
    if (!o.manifestUncommitted) commit("manifesto");
    if (o.manifestSecondCommit) { m.motivo += " (editado)"; w(MANIFESTO, json(m)); commit("manifesto editado"); }
  }
  o.after?.(dir, g);
  return { dir, seed, auth, fail, S, g };
}
function run(dir: string, args: string[]) {
  if (args.includes(REAL.seed)) throw new Error("o teste nunca passa a semente real");
  const r = spawnSync(process.execPath, [TSX, join(dir, SCRIPT), ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const RV = ["--revisao", MANIFESTO, "--so-guardas"];
function expectRefused(nome: string, o: Opts, re: RegExp, extra?: (r: ReturnType<typeof buildRepo>) => string[]) {
  const r = buildRepo(o);
  const res = run(r.dir, extra ? extra(r) : ["--semente", r.seed, ...RV]);
  check(res.code === 1 && /RECUSADO/.test(res.out) && re.test(res.out) && !/guardas OK/.test(res.out), nome, res.out.trim().split("\n").slice(-2).join(" | "));
}

// sem --revisao: comportamento antigo
{
  const r = buildRepo({ stage: "falha" });
  const res = run(r.dir, ["--semente", r.seed]);
  check(res.code === 1 && /sorteio-falha\.json já existe: o sorteio é único/.test(res.out), "script selado, sem --revisao: recusa pela falha existente", res.out.trim());
}
expectRefused("script revisado, sem --revisao: recusa (deriva do script depois da semente)", {}, /arquivos congelados mudaram depois da semente/, r => ["--semente", r.seed]);
// aceito
{
  const r = buildRepo();
  const res = run(r.dir, ["--semente", r.seed, ...RV]);
  check(res.code === 0 && /guardas OK/.test(res.out) && /nada ordenado pela semente/.test(res.out), "manifesto válido (sintético): guardas OK, sai antes da busca", res.out.trim());
  check(!gitIn(r.dir, "status", "--porcelain"), "aceito com --so-guardas: nada gravado no repositório");
}
// adulterações
expectRefused("--revisao com --validar", {}, /--revisao só vale com --semente/, r => ["--validar", "--revisao", MANIFESTO]);
expectRefused("--revisao com outro caminho", {}, /--revisao aceita só/, r => ["--semente", r.seed, "--revisao", "tela-a2/outro.json", "--so-guardas"]);
expectRefused("outra semente (commit válido, não a da identidade)", {}, /vale só para a semente/, r => ["--semente", r.auth, ...RV]);
expectRefused("manifesto alterado no disco depois do commit", { after: d => { const p = join(d, MANIFESTO); writeFileSync(p, readFileSync(p, "utf8").replace('"execucoesAdicionais": 1', '"execucoesAdicionais": 2')); } }, /difere do commitado/);
expectRefused("manifesto não commitado", { manifestUncommitted: true }, /difere do commitado no HEAD \(ou não está commitado\)/);
expectRefused("manifesto mexido em dois commits", { manifestSecondCommit: true }, /foi mexido em 2 commits/);
expectRefused("manifesto no mesmo commit do script", { manifestWithScript: true }, /DEPOIS da revisão do script/);
expectRefused("manifesto com sha256 errado da falha", { manifestPatch: m => { m.falhaOriginal.registros[FAIL] = "0".repeat(64); } }, /falhaOriginal/);
expectRefused("manifesto com limite novo diferente", { manifestPatch: m => { m.limiteNos.novo = 2_000_000_000; } }, /limiteNos/);
expectRefused("manifesto com sha256 de outro script", { manifestPatch: m => { m.scriptRevisado.sha256 = "1".repeat(64); } }, /scriptRevisado/);
expectRefused("manifesto com commit do script por preencher", { manifestPatch: m => { m.scriptRevisado.commit = "PREENCHER"; } }, /scriptRevisado/);
expectRefused("manifesto com campo a mais", { manifestPatch: m => { m.extra = "x"; } }, /campos/);
expectRefused("manifesto sem regra de parada", { manifestPatch: m => { m.regraDeParada = " "; } }, /regraDeParada vazio/);
expectRefused("falha arbitrária: registro do repositório ≠ identidade do script (manifesto bate com o repositório)", { failConstOverride: "a".repeat(64) }, /não é o registro preservado/);
expectRefused("registro da falha mexido depois do commit da falha", { failChangedAfter: true }, /não é o registro preservado|tem de ter entrado só no commit da falha/);
expectRefused("registro da falha alterado no disco", { after: d => writeFileSync(join(d, FAIL), json({ semente: "x" })) }, /no disco não é o registro preservado/);
expectRefused("semente-autorizada alterada no disco", { after: d => writeFileSync(join(d, AUTH), json({ semente: "x" })) }, /semente diferente da autorizada|difere do commitado/);
expectRefused("deriva em outro congelado (commit depois da revisão)", { driftAfterS: true }, /única deriva permitida/);
expectRefused("deriva em outro congelado não commitada", { after: d => writeFileSync(join(d, "tela-a2/insumo.json"), json({ insumo: 3 })) }, /não commitada/);
expectRefused("script alterado no disco depois do commit", { after: d => { const p = join(d, SCRIPT); writeFileSync(p, readFileSync(p, "utf8") + "// x\n"); } }, /não commitada|difere/);
expectRefused("mudança na busca (fora dos blocos), com o sha no manifesto", { mutateRevised: t => t.replace("if (++nodes > NODE_LIMIT) throw", "if (++nodes > NODE_LIMIT + 1) throw") }, /a busca mudou/);
expectRefused("mudança na ordem (keys) fora dos blocos", { mutateRevised: t => t.replace("const key = (label: string, id: string) => sha256(`${seed}|${label}|${id}`);\nconst result", "const key = (label: string, id: string) => sha256(`${label}|${seed}|${id}`);\nconst result") }, /a busca mudou/);
expectRefused("outro limite fora dos blocos", { mutateRevised: t => t.replace("const NODE_LIMIT = 1_000_000_000;\n/**", "const NODE_LIMIT = 2_000_000_000;\n/**") }, /NODE_LIMIT|a busca mudou|exatamente uma vez/);
expectRefused("marcador de bloco deslocado (indentado)", { mutateRevised: t => t.replace("//#region revisao-formal-1\n  if (revisao) rf1Info", "  //#region revisao-formal-1\n  if (revisao) rf1Info") }, /marcador de bloco fora do formato exato/);
expectRefused("execução adicional já começada (registro no disco)", { after: d => writeFileSync(join(d, RF1_EXEC), json({ resultado: "EM EXECUÇÃO" })) }, /revisao-formal-1-execucao\.json já existe/);
expectRefused("falha adicional já no histórico (commitada e apagada)", { after: (d, g) => { writeFileSync(join(d, RF1_FAIL), json({})); g("add", "-A"); g("commit", "-q", "-m", "x"); rmSync(join(d, RF1_FAIL)); g("add", "-A"); g("commit", "-q", "-m", "y"); } }, /revisao-formal-1-falha\.json já existiu no histórico/);
expectRefused("sorteio.json já existe", { after: d => writeFileSync(join(d, OUT), json({})) }, /sorteio\.json já existe/);

// ---------- 3. revisão formal 2: prova no repositório real (só leitura) ----------
console.log("3. revisão formal 2 (D-160) — identidade do script e cópia da busca (só leitura)");
const MOD = "scripts/tela-a2-busca-podada.ts", MAN2 = "tela-a2/revisao-formal-2.json";
const RF2_OUT = "tela-a2/sorteio-2.json", RF2_EXEC = "tela-a2/sorteio-execucao-2.json", RF2_FAIL = "tela-a2/sorteio-falha-2.json";
const RF1_SCRIPT_SHA = "79ec66fa4b521c3fe3c58b7c6d0898b665e0bf3d9b1332da9a567abae406223b";
const REAL1 = { script: realGit("rev-parse", "a415e33"), manifesto: realGit("rev-parse", "d4c21b5"), marcador: realGit("rev-parse", "4ddb304"), falha: realGit("rev-parse", "5c17a96") };
const rf1Blob = gitRawIn(ROOT, "show", `${REAL1.script}:${SCRIPT}`);
const rf2Blocks = [...diskText.matchAll(RF2_RE)].map(m => m[0]);
check(!diskText.includes("\r"), "script da revisão 2 em LF");
check(sha(rf1Blob) === RF1_SCRIPT_SHA, "blob da revisão 1 (a415e33) tem o sha256 79ec66fa…");
check(revisedText === rf1Blob.toString("utf8"), `sem os ${rf2Blocks.length} blocos revisao-formal-2, o script é byte a byte git show a415e33:${SCRIPT}`);
check(!/#(end)?region\s+revisao-formal-2/.test(revisedText), "nenhum marcador da revisão 2 sobra fora dos blocos");
const rf2Amend = rf2Blocks.join("");
const idBlock2 = /\/\/ identidade-2:início\n([\s\S]*?)\/\/ identidade-2:fim/.exec(diskText)?.[1] ?? "";
const RF1_FILES = { man: "tela-a2/revisao-formal-1.json", exec: "tela-a2/revisao-formal-1-execucao.json", fail: "tela-a2/revisao-formal-1-falha.json" };
const realRec1 = { man: sha(gitRawIn(ROOT, "show", `${REAL1.manifesto}:${RF1_FILES.man}`)), exec: sha(gitRawIn(ROOT, "show", `${REAL1.falha}:${RF1_FILES.exec}`)), fail: sha(gitRawIn(ROOT, "show", `${REAL1.falha}:${RF1_FILES.fail}`)) };
for (const [nome, v] of Object.entries({ scriptRF1: REAL1.script, scriptRF1Sha: RF1_SCRIPT_SHA, manifestoRF1: REAL1.manifesto, marcadorRF1: REAL1.marcador, falhaRF1: REAL1.falha, ...realRec1 }))
  check(idBlock2.includes(`"${v}"`), `identidade da revisão 2 no script: ${nome} = ${v.slice(0, 12)}…`);
for (const [k, f] of Object.entries(RF1_FILES)) check(sha(readFileSync(join(ROOT, f))) === realRec1[k as keyof typeof realRec1], `${f} no disco = registro da revisão 1`);
check(/limiteNos: 1_000_000_000,/.test(idBlock2) && /nosFalha: 1_000_000_001,/.test(idBlock2), "identidade da revisão 2: limite 1.000.000.000 e falha da 1 em 1.000.000.001 nós");
check(JSON.parse(readFileSync(join(ROOT, RF1_FILES.fail), "utf8")).nos === 1_000_000_001, "a falha da revisão 1 é 1.000.000.001 nós");
const writes2 = [...rf2Amend.matchAll(/writeFileSync\(join\((\w+), ([^)]+?)\)/g)].map(m => `${m[1]} ${m[2]}`);
const allowed2 = new Set(["ROOT RF2_EXEC", "ROOT RF2_FAIL", "ROOT RF2_OUT", 'dir "ensaio-rf2.json"']);
check(writes2.length > 0 && writes2.every(w => allowed2.has(w)), `nos blocos da revisão 2 só se grava em RF2_EXEC, RF2_FAIL, RF2_OUT e no ensaio fora do repositório (${[...new Set(writes2)].join("; ")})`);
check(/const RF2_EXEC = "tela-a2\/sorteio-execucao-2\.json";/.test(rf2Amend) && /const RF2_FAIL = "tela-a2\/sorteio-falha-2\.json";/.test(rf2Amend) && /const RF2_OUT = "tela-a2\/sorteio-2\.json";/.test(rf2Amend), "saídas da revisão 2 em caminhos novos");
check((rf2Amend.match(/^  const key = \(label: string, id: string\) => sha256\(`\$\{seed\}\|\$\{label\}\|\$\{id\}`\);$/gm) ?? []).length === 2, "nos blocos, a key é a do script selado (ensaio e execução)");
check((rf2Amend.match(/buscar\(ctx2, key, "podada", estat\)/g) ?? []).length === 2 && !/solve\(key\)|buscar\(ctx2, key, "cega"/.test(rf2Amend), "com a semente, só a busca podada roda (ensaio e execução)");
check(!/function (solve|clash|canPlace|resolveFx|verifySolution|fxOf|related|touchedInstances)\b|const (fxOf|byKey|params|eligible|NODE_LIMIT|related|appliesTo|touchedInstances|componentOf|drawable|scaffold) =/.test(rf2Amend), "nos blocos da revisão 2 não se redefine nada do contrato nem da busca original");
// a busca do módulo: cópia literal do corpo de solve() + 4 linhas de gancho
const modText = readFileSync(join(ROOT, MOD), "utf8");
const copia = /\/\/ ===== início da cópia de solve\(\)[^\n]*\n([\s\S]*?)  \/\/ ===== fim da cópia de solve\(\) =====/.exec(modText)?.[1] ?? "";
const ganchos = copia.split("\n").filter(l => l.endsWith("// PODA"));
const solveBody = /^function solve\(keyFn[^\n]*\{\n([\s\S]*?)^  try \{ return dfs\(0\)/m.exec(rf1Blob.toString("utf8"))?.[1] ?? "x";
check(!modText.includes("\r"), "módulo em LF");
check(copia.split("\n").filter(l => !l.endsWith("// PODA")).join("\n") === solveBody, `o módulo, sem as linhas de gancho, é o corpo de solve() do script byte a byte (${solveBody.split("\n").length} linhas)`);
check(ganchos.length === 4 && ganchos[0] === '  const poda = modo === "podada" ? criarPoda() : null; // PODA' && ganchos.slice(1).every(l => /^\s+if \(poda && poda\.(morto|mortoNoFim)\([^;]*\)\) return null; \/\/ PODA$/.test(l)), "os ganchos são só `if (poda && …) return null` (3) e a criação da poda (1)", ganchos.join(" | "));
const man2 = JSON.parse(readFileSync(join(ROOT, MAN2), "utf8"));
check(!readFileSync(join(ROOT, MAN2), "utf8").includes("\r"), "manifesto da revisão 2 em LF");
check(man2.semente === REAL.seed && man2.decisao === "D-160" && man2.limiteNos === 1_000_000_000 && man2.execucoesAdicionais === 1, "manifesto 2: semente, D-160, limite, uma execução");
check(man2.revisaoFormal1.manifesto.commit === REAL1.manifesto && man2.revisaoFormal1.scriptRevisado.commit === REAL1.script && man2.revisaoFormal1.falha.commit === REAL1.falha && man2.revisaoFormal1.falha.registros[RF1_FILES.exec] === realRec1.exec && man2.revisaoFormal1.falha.registros[RF1_FILES.fail] === realRec1.fail && man2.revisaoFormal1.manifesto.sha256 === realRec1.man, "manifesto 2: registros da revisão 1 reais");
check(man2.scriptRevisado.sha256 === sha(readFileSync(join(ROOT, SCRIPT))), "manifesto 2: sha256 do script revisado == disco", `${man2.scriptRevisado.sha256} × ${sha(readFileSync(join(ROOT, SCRIPT)))}`);
check(man2.buscaPodada.sha256 === sha(readFileSync(join(ROOT, MOD))), "manifesto 2: sha256 do módulo == disco", `${man2.buscaPodada.sha256} × ${sha(readFileSync(join(ROOT, MOD)))}`);
for (const k of ["scriptRevisado", "buscaPodada"]) check(/^[0-9a-f]{40}$/.test(man2[k].commit) || String(man2[k].commit).startsWith("PREENCHER"), `manifesto 2: ${k}.commit = ${String(man2[k].commit).slice(0, 12)}…`);
check(man2.saidas.execucao === RF2_EXEC && man2.saidas.falha === RF2_FAIL && man2.saidas.sorteio === RF2_OUT, "manifesto 2: saídas nos caminhos novos");
const COMPROMISSO = "d6bf6092011026bcfd533788ce9b7f11a3fc549abcafbb6c9650a7f8adad0078";
check(idBlock2.includes(`compromissoEnsaio: "${COMPROMISSO}"`) && man2.compromissoEnsaio?.solucaoSha256 === COMPROMISSO, "compromisso do ensaio (d6bf6092…) no script e no manifesto");
check(typeof man2.ensaios === "string" && /18:50–19:11Z/.test(man2.ensaios) && /posicoes/.test(man2.ensaios) && /d6bf6092011026bcfd533788ce9b7f11a3fc549abcafbb6c9650a7f8adad0078/.test(man2.ensaios) && /hash-do-ensaio-diverge/.test(man2.ensaios), "manifesto 2: ensaios divulgados (todos, --progresso, compromisso, divergência)");
const comPreencher = Object.keys(man2).filter(k => /PREENCHER/.test(JSON.stringify(man2[k]))).sort();
check(comPreencher.every(k => ["buscaPodada", "revisaoIndependente", "scriptRevisado"].includes(k)) && (comPreencher.length === 0 || !/PREENCHER/.test(JSON.stringify({ ...man2, scriptRevisado: 0, buscaPodada: 0, revisaoIndependente: 0 }))), `PREENCHER só nos campos do orquestrador (${comPreencher.join(", ") || "nenhum"})`);
{
  const { conferirCompromisso } = await import("./tela-a2-busca-podada.js");
  check(conferirCompromisso(COMPROMISSO, COMPROMISSO) === null && conferirCompromisso("0".repeat(64), COMPROMISSO) === "hash-do-ensaio-diverge", "(a) conferirCompromisso: igual passa, diferente = hash-do-ensaio-diverge");
  const iConf = rf2Amend.indexOf("const divergencia = conferirCompromisso(solucaoSha256, RF2.compromissoEnsaio);");
  const iFalha = rf2Amend.indexOf("gravarFalha(divergencia, { solucaoSha256, esperado: RF2.compromissoEnsaio });", iConf);
  const iExit = rf2Amend.indexOf("process.exit(1);", iFalha);
  const iOut = rf2Amend.indexOf("writeFileSync(join(ROOT, RF2_OUT)");
  const iVer = rf2Amend.indexOf("verifySolution(result as unknown as Solution);\n  verificada = true;");
  check(iConf > 0 && iFalha > iConf && iExit > iFalha && iOut > iExit && iVer > 0 && iVer < iConf, "(a) na execução selada: verifySolution → compromisso → (divergiu: sorteio-falha-2 e sai 1) → só então sorteio-2.json");
  check(/semanticaNos: "nos e reparos contam só o que a busca PODADA visitou/.test(rf2Amend), "(c) registros da execução dizem que nós/reparos são só da busca podada");
  const prog = modText.split("\n").find(l => l.includes("estat.progresso({")) ?? "";
  check(prog !== "" && !/posicoes|regra|\.id\b|instancia|findIndex/.test(prog), "--progresso imprime só contagens (sem posições nem ids)", prog.trim().slice(0, 160));
}

// ---------- 4. solidez na ordem neutra (insumos reais, sem semente) ----------
console.log("4. ordem neutra do --validar: solve() × busca cega × busca podada");
{
  const antes = realGit("status", "--porcelain", "--", "tela-a2");
  const r = spawnSync(process.execPath, [TSX, join(ROOT, SCRIPT), "--validar", "--comparar-neutra"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
  const txt = r.stdout ?? "";
  let j: any = null; try { j = JSON.parse(txt.slice(txt.indexOf("{"))); } catch { /* */ }
  check(r.status === 0 && j?.mesmaSolucao === true, "mesma solução nas três buscas", `${r.status} ${txt.slice(-300)} ${r.stderr ?? ""}`);
  if (j) {
    check(j.solveOriginal.nos === j.buscaCega.nos && j.solveOriginal.reparos === j.buscaCega.reparos, `busca cega do módulo = solve() do script, nó a nó: ${j.solveOriginal.nos} nós, ${j.solveOriginal.reparos} reparos`);
    check(j.solveOriginal.solucaoSha256 === j.buscaPodada.solucaoSha256 && j.buscaPodada.nos <= j.solveOriginal.nos, `podada: mesma solução (${String(j.buscaPodada.solucaoSha256).slice(0, 12)}…) em ${j.buscaPodada.nos} nós (cega ${j.solveOriginal.nos})`);
  }
  check(realGit("status", "--porcelain", "--", "tela-a2") === antes, "--comparar-neutra não grava nada em tela-a2/");
}

// ---------- 5. propriedade: instâncias pequenas sorteadas ----------
const NPROP = Number(process.env.RF2_PROPRIEDADE ?? 400);
console.log(`5. propriedade em ${NPROP} instâncias sintéticas (gerador 20261102+i): busca cega × podada`);
{
  const { propriedadeBuscaPodada } = await import("./test-tela-a2-busca-podada.js");
  const t0 = Date.now();
  const p = propriedadeBuscaPodada(NPROP, 20261102);
  check(p.divergencias.length === 0, `mesma primeira solução em todas (${p.comSolucao} com solução, ${p.semSolucao} sem; ${p.limite} puladas no limite da cega)`, p.divergencias.slice(0, 3).join("\n        "));
  check(p.podadaComMaisNos === 0, `a podada nunca visita mais nós (cega ${p.nosCega} · podada ${p.nosPodada}; ${Date.now() - t0} ms)`);
  check(p.comSolucao > NPROP / 5 && p.semSolucao > NPROP / 5, "a amostra tem instâncias com e sem solução");
}

// ---------- 6. guardas da revisão formal 2 em repositórios sintéticos ----------
console.log("6. guardas da revisão formal 2 em repositórios sintéticos (sementes falsas; --so-guardas2)");
interface Opts2 {
  mutateRF2?: (t: string) => string;
  manifestPatch?: (m: Record<string, any>) => void;
  moduloSeparado?: boolean;
  moduloDepois?: boolean;
  manifestWithScript?: boolean;
  rf1FalhaMexida?: boolean;
  driftAfterS?: boolean;
  after?: (dir: string, g: (...a: string[]) => string) => void;
}
const subst = (text: string, pairs: [string, string][]) => { let t = text; for (const [a, b] of pairs) { if (!t.includes(a)) throw new Error(`valor real ausente do script: ${a}`); t = t.split(a).join(b); } return t; };
function buildRepo2(o: Opts2 = {}) {
  const dir = join(work, `q${++n}`);
  mkdirSync(join(dir, "scripts"), { recursive: true }); mkdirSync(join(dir, "tela-a2"), { recursive: true });
  const g = (...a: string[]) => gitIn(dir, ...a);
  g("init", "-q", "-b", "main"); g("config", "user.name", "teste"); g("config", "user.email", "teste@exemplo"); g("config", "core.autocrlf", "false");
  const w = (rel: string, content: string | Buffer) => writeFileSync(join(dir, rel), content);
  const commit = (msg: string) => { g("add", "-A"); g("commit", "-q", "-m", msg); return g("rev-parse", "HEAD"); };
  const params = (status: string) => json({ _meta: { status }, congelados: SYN_CONGELADOS, sha256: { corpusManifest: "x", arquivos: {} } });
  w(SCRIPT, sealed); copyFileSync(join(ROOT, UNIVERSO), join(dir, UNIVERSO)); w("tela-a2/insumo.json", json({ insumo: 1 })); w("tela-a2/parametros.json", params("RASCUNHO"));
  commit("rascunho");
  w("tela-a2/parametros.json", params("CONGELADO"));
  const seed = commit("CONGELADO");
  w(AUTH, json({ semente: seed, nota: "sintética" })); const auth = commit("autoriza");
  w(FAIL, json({ semente: seed, erro: "limite de nós", nos: 5_000_001 }));
  w(EXEC, json({ semente: seed, script: SEALED_SHA, nos: 5_000_001, resultado: "FALHA: limite de nós" }));
  const fail = commit("falha");
  const rec = { fail: sha(readFileSync(join(dir, FAIL))), exec: sha(readFileSync(join(dir, EXEC))), auth: sha(readFileSync(join(dir, AUTH))) };
  const pares1: [string, string][] = [[REAL.seed, seed], [realFail, fail], [realAuth, auth], [realRec[FAIL], rec.fail], [realRec[EXEC], rec.exec], [realRec[AUTH], rec.auth]];
  // revisão formal 1 sintética: script, manifesto, marcador, falha
  const rf1 = subst(revisedText, pares1); w(SCRIPT, rf1); const S1 = commit("revisão 1 do script");
  const m1 = JSON.parse(JSON.stringify(man));
  m1.semente = seed; m1.falhaOriginal = { commit: fail, registros: { [FAIL]: rec.fail, [EXEC]: rec.exec } };
  m1.sementeAutorizada = { ...m1.sementeAutorizada, commit: auth, sha256: rec.auth }; m1.scriptOriginal = { ...m1.scriptOriginal, commit: seed };
  m1.scriptRevisado = { ...m1.scriptRevisado, commit: S1, sha256: sha(rf1) };
  w(MANIFESTO, json(m1)); const M1 = commit("manifesto 1");
  w(RF1_EXEC, json({ semente: seed, script: sha(rf1), resultado: "EM EXECUÇÃO" })); const MK = commit("marcador 1");
  w(RF1_EXEC, json({ semente: seed, script: sha(rf1), nos: 1_000_000_001, resultado: "FALHA: limite de nós" }));
  w(RF1_FAIL, json({ semente: seed, erro: "limite de nós", nos: 1_000_000_001 }));
  const F1 = commit("falha 1");
  const rec1 = { man: sha(readFileSync(join(dir, MANIFESTO))), exec: sha(readFileSync(join(dir, RF1_EXEC))), fail: sha(readFileSync(join(dir, RF1_FAIL))) };
  if (o.rf1FalhaMexida) { w(RF1_FAIL, json({ semente: seed, erro: "limite de nós", nos: 1_000_000_001, mexido: true })); commit("mexe na falha 1"); }
  // revisão formal 2: script + módulo num commit, manifesto noutro
  let rf2 = subst(diskText, [...pares1, [REAL1.script, S1], [RF1_SCRIPT_SHA, sha(rf1)], [REAL1.manifesto, M1], [REAL1.marcador, MK], [REAL1.falha, F1], [realRec1.man, rec1.man], [realRec1.exec, rec1.exec], [realRec1.fail, rec1.fail]]);
  if (o.mutateRF2) rf2 = o.mutateRF2(rf2);
  if (o.moduloSeparado) { copyFileSync(join(ROOT, MOD), join(dir, MOD)); commit("módulo antes"); }
  w(SCRIPT, rf2); if (!o.moduloDepois) copyFileSync(join(ROOT, MOD), join(dir, MOD));
  const m2 = JSON.parse(JSON.stringify(man2));
  m2.semente = seed; m2.falhaOriginal = { commit: fail, registros: { [FAIL]: rec.fail, [EXEC]: rec.exec } };
  m2.sementeAutorizada = { ...m2.sementeAutorizada, commit: auth, sha256: rec.auth }; m2.scriptOriginal = { ...m2.scriptOriginal, commit: seed };
  m2.revisaoFormal1 = { manifesto: { arquivo: MANIFESTO, commit: M1, sha256: rec1.man }, scriptRevisado: { arquivo: SCRIPT, commit: S1, sha256: sha(rf1) }, falha: { commit: F1, nos: 1_000_000_001, registros: { [RF1_EXEC]: rec1.exec, [RF1_FAIL]: rec1.fail } } };
  for (const k of Object.keys(m2)) if (typeof m2[k] === "string" && /PREENCHER/.test(m2[k])) m2[k] = `${k} (sintético)`;
  let S2: string;
  if (o.manifestWithScript) { m2.scriptRevisado = { ...m2.scriptRevisado, commit: "0".repeat(40), sha256: sha(rf2) }; m2.buscaPodada = { ...m2.buscaPodada, commit: "0".repeat(40), sha256: sha(readFileSync(join(ROOT, MOD))) }; o.manifestPatch?.(m2); w(MAN2, json(m2)); S2 = commit("script + manifesto 2"); }
  else {
    S2 = commit("revisão 2 do script");
    if (o.moduloDepois) { copyFileSync(join(ROOT, MOD), join(dir, MOD)); commit("módulo depois"); }
    if (o.driftAfterS) { w("tela-a2/insumo.json", json({ insumo: 2 })); commit("deriva"); }
    m2.scriptRevisado = { ...m2.scriptRevisado, commit: S2, sha256: sha(rf2) };
    m2.buscaPodada = { ...m2.buscaPodada, commit: S2, sha256: sha(readFileSync(join(ROOT, MOD))) };
    o.manifestPatch?.(m2); w(MAN2, json(m2)); commit("manifesto 2");
  }
  o.after?.(dir, g);
  return { dir, seed, auth, S2, g };
}
const RV2 = ["--revisao2", MAN2, "--so-guardas2"];
function expectRefused2(nome: string, o: Opts2, re: RegExp, extra?: (r: ReturnType<typeof buildRepo2>) => string[]) {
  const r = buildRepo2(o);
  const res = run(r.dir, extra ? extra(r) : ["--semente", r.seed, ...RV2]);
  check(res.code === 1 && /RECUSADO/.test(res.out) && re.test(res.out) && !/guardas OK/.test(res.out), nome, res.out.trim().split("\n").slice(-2).join(" | "));
}
{
  const r = buildRepo2();
  const res = run(r.dir, ["--semente", r.seed, ...RV2]);
  check(res.code === 0 && /revisão formal 2: guardas OK/.test(res.out) && /nada ordenado pela semente/.test(res.out), "manifesto 2 válido (sintético): guardas OK, sai antes da busca", res.out.trim());
  check(!gitIn(r.dir, "status", "--porcelain"), "aceito com --so-guardas2: nada gravado no repositório");
  const plain = run(r.dir, ["--semente", r.seed]);
  check(plain.code === 1 && /arquivos congelados mudaram depois da semente/.test(plain.out), "script da revisão 2 sem --revisao2: recusa como o original", plain.out.trim());
  const viaRF1 = run(r.dir, ["--semente", r.seed, "--revisao", MANIFESTO, "--so-guardas"]);
  check(viaRF1.code === 1 && /RECUSADO/.test(viaRF1.out) && !/guardas OK/.test(viaRF1.out), "script da revisão 2 pelo caminho da revisão 1: recusa", viaRF1.out.trim().split("\n").slice(-1)[0]);
  const selado = run(r.dir, ["--semente", r.seed, "--ensaio", join(work, "ensaio-selado")]);
  check(selado.code === 1 && /já está selado: o ensaio não roda mais/.test(selado.out), "(b) --ensaio depois de selado o manifesto: recusa", selado.out.trim());
  const comoRascunho = (d: string) => { const p = join(d, MAN2); const m = JSON.parse(readFileSync(p, "utf8")); m.scriptRevisado.commit = "PREENCHER"; m.buscaPodada.commit = "PREENCHER"; writeFileSync(p, json(m)); };
  comoRascunho(r.dir);
  const fora = run(r.dir, ["--semente", r.seed, "--ensaio", join(r.dir, "tela-a2", "x")]);
  check(fora.code === 1 && /fora do repositório/.test(fora.out), "--ensaio com pasta dentro do repositório (manifesto rascunho): recusa", fora.out.trim());
  writeFileSync(join(r.dir, RF2_EXEC), json({ resultado: "EM EXECUÇÃO" }));
  const comecou = run(r.dir, ["--semente", r.seed, "--ensaio", join(work, "ensaio-y")]);
  check(comecou.code === 1 && /a execução da revisão 2 já começou, o ensaio não roda mais/.test(comecou.out), "(b) --ensaio com a execução da revisão 2 começada: recusa", comecou.out.trim());
  rmSync(join(r.dir, RF2_EXEC));
  const livre = run(r.dir, ["--semente", r.seed, "--ensaio", join(work, "ensaio-z")]);
  check(!/já está selado|já começou|fora do repositório|vale só para a semente/.test(livre.out), "(b) com manifesto rascunho e nada executado, as guardas do ensaio deixam passar (para depois nos insumos do repositório sintético)", livre.out.trim().split("\n").slice(-1)[0]);
  const outraEnsaio = run(r.dir, ["--semente", r.auth, "--ensaio", join(work, "ensaio-x")]);
  check(outraEnsaio.code === 1 && /o ensaio vale só para a semente/.test(outraEnsaio.out), "--ensaio com outra semente: recusa", outraEnsaio.out.trim());
}
expectRefused2("--revisao2 com --validar", {}, /--revisao2 só vale com --semente/, () => ["--validar", "--revisao2", MAN2]);
expectRefused2("--revisao2 com outro caminho", {}, /--revisao2 aceita só/, r => ["--semente", r.seed, "--revisao2", "tela-a2/outro.json", "--so-guardas2"]);
expectRefused2("--so-guardas2 sem --revisao2", {}, /--so-guardas2 só vale com --revisao2/, r => ["--semente", r.seed, "--so-guardas2"]);
expectRefused2("--revisao2 junto com --revisao", {}, /--revisao2 só vale com --semente e sem --revisao/, r => ["--semente", r.seed, "--revisao", MANIFESTO, ...RV2]);
expectRefused2("outra semente", {}, /a revisão formal 2 vale só para a semente/, r => ["--semente", r.auth, ...RV2]);
expectRefused2("manifesto 2 ainda por PREENCHER (prosa)", { manifestPatch: m => { m.revisaoIndependente = "PREENCHER: parecer"; } }, /ainda por PREENCHER/);
expectRefused2("manifesto 2 com commit do script por preencher", { manifestPatch: m => { m.scriptRevisado.commit = "PREENCHER"; } }, /scriptRevisado/);
expectRefused2("manifesto 2 com sha256 errado do módulo", { manifestPatch: m => { m.buscaPodada.sha256 = "1".repeat(64); } }, /buscaPodada/);
expectRefused2("manifesto 2 com registro da revisão 1 errado", { manifestPatch: m => { m.revisaoFormal1.falha.registros[RF1_FAIL] = "0".repeat(64); } }, /revisaoFormal1/);
expectRefused2("manifesto 2 com campo a mais", { manifestPatch: m => { m.extra = "x"; } }, /campos/);
expectRefused2("manifesto 2 no mesmo commit do script", { manifestWithScript: true }, /DEPOIS da revisão 2 do script|não pode mexer em tela-a2/);
expectRefused2("manifesto 2 alterado no disco", { after: d => { const p = join(d, MAN2); writeFileSync(p, readFileSync(p, "utf8").replace('"execucoesAdicionais": 1', '"execucoesAdicionais": 2')); } }, /difere do commitado/);
expectRefused2("mudança fora dos blocos da revisão 2 (na busca original)", { mutateRF2: t => t.replace("if (++nodes > NODE_LIMIT) throw", "if (++nodes > NODE_LIMIT + 1) throw") }, /algo fora dos blocos mudou/);
expectRefused2("marcador da revisão 2 indentado", { mutateRF2: t => t.replace("//#region revisao-formal-2\n  if (revisao2) rf2Info", "  //#region revisao-formal-2\n  if (revisao2) rf2Info") }, /marcador da revisão 2 fora do formato exato/);
expectRefused2("módulo commitado antes, fora do commit do script", { moduloSeparado: true }, /tem de entrar no commit da revisão 2 do script/);
expectRefused2("módulo commitado depois do script", { moduloDepois: true }, /tem de entrar no commit da revisão 2 do script/);
expectRefused2("módulo alterado no disco", { after: d => { const p = join(d, MOD); writeFileSync(p, readFileSync(p, "utf8") + "// x\n"); } }, /difere do HEAD|não commitada/);
expectRefused2("falha da revisão 1 mexida depois", { rf1FalhaMexida: true }, /revisao-formal-1-falha\.json/);
expectRefused2("falha original alterada no disco", { after: d => writeFileSync(join(d, FAIL), json({ semente: "x" })) }, /no disco não é o registro preservado/);
expectRefused2("deriva em outro congelado", { driftAfterS: true }, /única deriva permitida/);
expectRefused2("execução da revisão 2 já começada", { after: d => writeFileSync(join(d, RF2_EXEC), json({ resultado: "EM EXECUÇÃO" })) }, /sorteio-execucao-2\.json já existe/);
expectRefused2("falha da revisão 2 já no histórico", { after: (d, g) => { writeFileSync(join(d, RF2_FAIL), json({})); g("add", "-A"); g("commit", "-q", "-m", "x"); rmSync(join(d, RF2_FAIL)); g("add", "-A"); g("commit", "-q", "-m", "y"); } }, /sorteio-falha-2\.json já existiu no histórico/);
expectRefused2("sorteio.json existe", { after: d => writeFileSync(join(d, OUT), json({})) }, /sorteio\.json existe ou existiu/);

rmSync(work, { recursive: true, force: true });
console.log(`\n${ok} ok · ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
