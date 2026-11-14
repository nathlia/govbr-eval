/**
 * Testes do D1 do ensaio sem modelo de 14/11/2026 (emenda (a)): o ref do slot conferido contra a linha de base congelada
 * NO DISPARO (`pipeline-t4.ts entradas` › problemasDoRefDoDisparo) e o `campanha:agenda comando` com `--ref`
 * (agenda-campanha.ts › comandoDoSlot), os dois pela mesma regra (ref-congelado.ts). Git real num repositório temporário;
 * sem rede, sem Docker, sem modelo.
 *   npx tsx scripts/test-ref-congelado.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { comandoDoSlot, type Agenda, type SlotAgenda } from "./agenda-campanha";
import { problemasDoRefDoDisparo } from "./pipeline-t4";
import { caminhoDoRegistro, conferirRefCongelado, gitDoRef } from "./ref-congelado";

let ok = 0, falhas = 0;
const t = (nome: string, f: () => void) => { try { f(); ok++; console.log(`ok   ${nome}`); } catch (e) { falhas++; console.log(`FALHA ${nome}\n     ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };

const CAMP = "ensaio-ref-01";
const tmp = mkdtempSync(join(tmpdir(), "ref-congelado-"));
const repo = join(tmp, "eval");
const git = (cwd: string, ...a: string[]): string => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...a],
  { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const escrever = (rel: string, txt: string, raiz = repo) => { mkdirSync(join(raiz, rel, ".."), { recursive: true }); writeFileSync(join(raiz, rel), txt); };
const H = (c: string) => c.repeat(64);
const registro = (evalCommit: string, campanha = CAMP) => JSON.stringify({
  contract: "linha-de-base-campanha.v1", fixture: true, campaignId: campanha, screen: { id: "solicitacao", version: "govbr-telas-site-9f4b936f2859" },
  baselineId: "lb-20261114-230157-solicitacao-ef4400",
  registro: { caminho: `linhas-de-base/${campanha}/solicitacao/lb-20261114-230157-solicitacao-ef4400/baseline.json`, sha256: H("a") },
  medidaEm: "2026-11-14T23:01:57Z", manifestoColeta: { caminho: `coletas/${campanha}/${H("b")}/manifesto-coleta.json`, sha256: H("b") },
  snapshotSetId: "snapshots-e812c58bb5115dbd", site: { siteSha256: H("c"), manifestSha256: H("d") },
  oracle: { version: "3.7.12", distSha256: H("e"), dataSha256: H("f") },
  repos: { "govbr-eval": evalCommit, "govbr-telas": "1".repeat(40), "govbr-ds-validator": "2".repeat(40) },
  imagesLockSha256: H("9"), regra: "teste", geradoEm: "2026-11-14T23:04:00Z",
}, null, 2) + "\n";

try {
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "-q", "-b", "main");
  escrever(`campanhas/${CAMP}/campaign.json`, "{}\n");
  escrever(`campanhas/${CAMP}/agenda.json`, "{}\n");
  escrever(`campanhas/outra/campaign.json`, "{}\n");
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "c0 linha de base");
  const c0 = git(repo, "rev-parse", "HEAD");
  git(repo, "branch", "base", c0);
  escrever(caminhoDoRegistro(CAMP), registro(c0));
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "c1 registro");
  const c1 = git(repo, "rev-parse", "HEAD");
  git(repo, "branch", "congelado", c1);
  git(repo, "tag", "congelado-t", c1);
  git(repo, "checkout", "-q", "-b", "extra");
  escrever("commit-a-mais.txt", "x\n");
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "c2 commit a mais");
  const c2 = git(repo, "rev-parse", "HEAD");
  git(repo, "checkout", "-q", "-b", "registro-ruim", c1);
  escrever(caminhoDoRegistro(CAMP), registro("3".repeat(40)));
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "registro aponta commit fora do histórico");
  git(repo, "checkout", "-q", "-b", "registro-invalido", c1);
  escrever(caminhoDoRegistro(CAMP), JSON.stringify({ contract: "linha-de-base-campanha.v1", campaignId: CAMP }) + "\n");
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "registro fora do contrato");
  git(repo, "checkout", "-q", "congelado");
  const G = gitDoRef(repo);

  t("regra: ref = commit da linha de base + só o registro, so-coleta → aceito; a diferença é só o registro", () => {
    for (const ref of ["congelado", "congelado-t", c1]) {
      const r = conferirRefCongelado({ campanha: CAMP, ref, etapas: "so-coleta", git: G });
      assert.deepEqual(r.problemas, []); assert.equal(r.congelada, true); assert.equal(r.commitDaLinhaDeBase, c0);
      assert.deepEqual(r.diferencas, [caminhoDoRegistro(CAMP)]);
    }
  });
  t("regra: ref com commit a mais → recusa nomeando o arquivo, o commit do ref e o da linha de base", () => {
    const r = conferirRefCongelado({ campanha: CAMP, ref: "extra", etapas: "so-coleta", git: G });
    assert.equal(r.problemas.length, 1);
    assert.match(r.problemas[0], /commit-a-mais\.txt/); assert.ok(r.problemas[0].includes(c2.slice(0, 12))); assert.ok(r.problemas[0].includes(c0.slice(0, 12)));
  });
  t("regra: etapas ≠ so-coleta com a congelada → recusa (coleta+linha-de-base, so-linha-de-base, vazio)", () => {
    for (const e of ["coleta+linha-de-base", "so-linha-de-base", ""]) {
      const r = conferirRefCongelado({ campanha: CAMP, ref: "congelado", etapas: e, git: G });
      assert.equal(r.problemas.length, 1, e); assert.match(r.problemas[0], /só com etapas = so-coleta/);
    }
  });
  t("regra: ref sem o registro (antes de congelar) → nada a conferir, quaisquer etapas", () => {
    for (const e of ["so-linha-de-base", "coleta+linha-de-base"]) {
      const r = conferirRefCongelado({ campanha: CAMP, ref: c0, etapas: e, git: G });
      assert.equal(r.congelada, false); assert.deepEqual(r.problemas, []);
    }
    assert.equal(conferirRefCongelado({ campanha: "outra", ref: "extra", etapas: "so-linha-de-base", git: G }).congelada, false);
  });
  t("regra: commit da linha de base fora do histórico, registro fora do contrato, ref que não resolve → recusa", () => {
    assert.match(conferirRefCongelado({ campanha: CAMP, ref: "registro-ruim", etapas: "so-coleta", git: G }).problemas.join(), /não está no histórico/);
    assert.match(conferirRefCongelado({ campanha: CAMP, ref: "registro-invalido", etapas: "so-coleta", git: G }).problemas.join(), /fora do contrato/);
    assert.match(conferirRefCongelado({ campanha: CAMP, ref: "nao-existe", git: G }).problemas.join(), /não resolve/);
    assert.match(conferirRefCongelado({ campanha: "outra-id", ref: "congelado", git: G }).problemas.join(), /^$/, "outra campanha sem registro");
  });

  t("disparo (entradas): HEAD congelado + so-coleta passa; HEAD com commit a mais recusa; outras etapas recusam; campanha sem registro não muda", () => {
    git(repo, "checkout", "-q", "congelado");
    assert.deepEqual(problemasDoRefDoDisparo(repo, { campanha: CAMP, etapas: "so-coleta" }), []);
    assert.match(problemasDoRefDoDisparo(repo, { campanha: CAMP, etapas: "coleta+linha-de-base" }).join(), /só com etapas = so-coleta/);
    assert.deepEqual(problemasDoRefDoDisparo(repo, { campanha: "outra", etapas: "coleta+linha-de-base" }), []);
    assert.deepEqual(problemasDoRefDoDisparo(repo, { campanha: "../x", etapas: "so-coleta" }), []);
    git(repo, "checkout", "-q", "extra");
    assert.match(problemasDoRefDoDisparo(repo, { campanha: CAMP, etapas: "so-coleta" }).join(), /commit-a-mais\.txt/);
    git(repo, "checkout", "-q", "congelado");
  });
  t("disparo (entradas): checkout raso (fetch-depth 1) não tem o commit da linha de base → recusa, nunca passa calado", () => {
    const raso = join(tmp, "raso");
    git(tmp, "clone", "-q", "--depth", "1", "--branch", "congelado", `file://${repo.replace(/\\/g, "/")}`, raso);
    assert.match(problemasDoRefDoDisparo(raso, { campanha: CAMP, etapas: "so-coleta" }).join(), /não está no histórico deste checkout/);
  });
  t("disparo (entradas): registro no disco mas não no commit (árvore suja) → recusa", () => {
    const sujo = join(tmp, "sujo");
    git(tmp, "clone", "-q", "--branch", "base", `file://${repo.replace(/\\/g, "/")}`, sujo);
    escrever(caminhoDoRegistro(CAMP), registro(c0), sujo);
    assert.match(problemasDoRefDoDisparo(sujo, { campanha: CAMP, etapas: "so-coleta" }).join(), /não no commit HEAD/);
  });

  const slot = { slotId: "p01-ferramentas", pairId: "p01", arm: "ferramentas", positionInPair: 1, repetition: 1, order: 1, window: null } as SlotAgenda;
  const a = { contract: "agenda.v2" } as Agenda;
  const camp = (kind: "pilot" | "formal") => ({ kind, design: { screens: [{ id: "solicitacao" }] } }) as never;
  const cmd = (o: { kind?: "pilot" | "formal"; ref?: string; campanha?: string }) =>
    comandoDoSlot({ raiz: repo, campanha: o.campanha ?? CAMP, c: camp(o.kind ?? "pilot"), a, slot, modo: "duble", tentativa: 1, ref: o.ref, git: G });
  t("comando: com o registro no checkout, --ref obrigatório; o comando sai com --ref, tentativa e so-coleta", () => {
    git(repo, "checkout", "-q", "congelado");
    assert.throws(() => cmd({}), /passe --ref/);
    const l = cmd({ ref: "congelado" });
    assert.match(l[0], /^gh workflow run execucao-isolada\.yml --repo nathlia\/govbr-eval --ref congelado -f modo=duble /);
    assert.match(l[0], /-f tentativa=1 -f etapas=so-coleta /);
    assert.ok(l.some(x => x.includes(c1.slice(0, 12))), "diz o sha do ref hoje");
    assert.match(cmd({ ref: "congelado-t" })[0], /--ref congelado-t /);
  });
  t("comando: --ref com commit a mais, sem o registro, com outro registro, sha ou vazio → recusa, nada impresso", () => {
    git(repo, "checkout", "-q", "congelado");
    assert.throws(() => cmd({ ref: "extra" }), /commit-a-mais\.txt/);
    assert.throws(() => cmd({ ref: "base" }), /não contém/);
    assert.throws(() => cmd({ ref: c1 }), /não sha/);
    assert.throws(() => cmd({ ref: "" }), /exige um branch ou tag/);
    escrever(caminhoDoRegistro(CAMP), registro(c0).replace("teste", "teste outro"));
    try { assert.throws(() => cmd({ ref: "congelado" }), /difere do deste checkout/); } finally { git(repo, "checkout", "--", caminhoDoRegistro(CAMP)); }
  });
  t("comando: sem registro, campanha formal exige --ref; piloto sem --ref sai como antes (sem --ref, sem so-coleta)", () => {
    git(repo, "checkout", "-q", "base");
    assert.throws(() => cmd({ kind: "formal" }), /campanha formal/);
    assert.match(cmd({ kind: "formal", ref: "base" })[0], /--ref base -f modo=duble .* -f tentativa=1 -f telas_sha/);
    const l = cmd({});
    assert.doesNotMatch(l[0], /--ref|etapas/);
    git(repo, "checkout", "-q", "congelado");
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${ok} ok, ${falhas} falha(s)`);
if (falhas) process.exitCode = 1;
