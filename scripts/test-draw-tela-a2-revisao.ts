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
 *    aceito; adulterações recusadas uma a uma.
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
const revisedText = readFileSync(join(ROOT, SCRIPT), "utf8");
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
check(man.scriptRevisado.sha256 === sha(readFileSync(join(ROOT, SCRIPT))), "manifesto real: sha256 do script revisado == disco", `${man.scriptRevisado.sha256} × ${sha(readFileSync(join(ROOT, SCRIPT)))}`);
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

rmSync(work, { recursive: true, force: true });
console.log(`\n${ok} ok · ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
