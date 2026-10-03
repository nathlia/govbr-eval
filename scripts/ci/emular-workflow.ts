/**
 * Emulador local do workflow `execucao-isolada` (T4) — só para a prova "roda a partir de checkout
 * limpo em Linux", sem GitHub e sem modelo. Lê o PRÓPRIO YAML e executa, na ordem dele, cada job numa
 * pasta nova (VM nova) e cada passo como o runner faria:
 *
 *   run:                         bash --noprofile --norc -eo pipefail, env do passo avaliado
 *   actions/checkout             git clone da fonte local + checkout do `ref` (SHA) + sparse-checkout
 *   actions/setup-node           confere que o Node do ambiente é a versão pedida
 *   actions/upload|download-artifact   cópia para/de um depósito local
 *   gh (release)                 substituído por um dublê local (pasta por repositório/tag)
 *
 * Avalia as expressões `${{ }}` e `if:` do YAML num subconjunto da linguagem do GitHub (contextos
 * inputs, secrets, github, runner, needs, steps; ==, !=, &&, ||, !, always(), success(), failure(),
 * cancelled(), toJSON()). Expressão fora do subconjunto é erro, nunca silêncio.
 *
 *   tsx scripts/ci/emular-workflow.ts --config CONFIG.json
 *
 * CONFIG: { workflow, raiz, fontes: { "<owner/repo>": dirGit, ... }, self: "<owner/repo>", sha,
 *           inputs: {...}, secrets: {...}, saida: relatorio.json }
 */
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// js-yaml vem travado no package-lock (dependência do eslint 9); só o emulador e o teste o usam.
import yaml from "js-yaml";

type Valor = unknown;
interface Passo { id?: string; name?: string; uses?: string; run?: string; with?: Record<string, Valor>; env?: Record<string, Valor>; if?: string; "continue-on-error"?: boolean }
interface Job { name?: string; needs?: string | string[]; if?: string; "runs-on"?: string; outputs?: Record<string, string>; steps: Passo[]; permissions?: unknown; "timeout-minutes"?: number }
export interface Workflow { name: string; on: Record<string, unknown>; permissions?: unknown; concurrency?: unknown; jobs: Record<string, Job> }

// ───────────────────────────────────────────────────────────────── expressões

type Tok = { t: "op" | "str" | "num" | "id" | "bool" | "null"; v: string };
function tokens(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const two = src.slice(i, i + 2);
    if (["==", "!=", "&&", "||"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("!().,[]".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    if (c === "'") {
      let s = "";
      i++;
      while (i < src.length) {
        if (src[i] === "'" && src[i + 1] === "'") { s += "'"; i += 2; continue; }
        if (src[i] === "'") break;
        s += src[i++];
      }
      i++;
      out.push({ t: "str", v: s });
      continue;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i)) ?? /^\d+(\.\d+)?/.exec(src.slice(i));
    if (!m) throw new Error(`expressão fora do subconjunto: ${src}`);
    const w = m[0];
    out.push(/^\d/.test(w) ? { t: "num", v: w } : w === "true" || w === "false" ? { t: "bool", v: w } : w === "null" ? { t: "null", v: w } : { t: "id", v: w });
    i += w.length;
  }
  return out;
}

export interface Contexto { [k: string]: Valor; _status?: { falhou: boolean } }

export function avaliar(src: string, ctx: Contexto): Valor {
  const tk = tokens(src);
  let p = 0;
  const peek = (): Tok | undefined => tk[p];
  const eat = (v?: string): Tok => {
    const t = tk[p++];
    if (!t || (v !== undefined && t.v !== v)) throw new Error(`esperava ${v ?? "token"} em: ${src}`);
    return t;
  };
  const eq = (a: Valor, b: Valor): boolean => typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b;
  const truthy = (v: Valor): boolean => !(v === false || v === null || v === undefined || v === "" || v === 0);
  const funcs: Record<string, (...a: Valor[]) => Valor> = {
    always: () => true, cancelled: () => false,
    success: () => !ctx._status?.falhou, failure: () => Boolean(ctx._status?.falhou),
    toJSON: (v) => JSON.stringify(v, null, 2),
  };
  function primary(): Valor {
    const t = eat();
    if (t.t === "str") return t.v;
    if (t.t === "num") return Number(t.v);
    if (t.t === "bool") return t.v === "true";
    if (t.t === "null") return null;
    if (t.v === "(") { const v = or(); eat(")"); return v; }
    if (t.t !== "id") throw new Error(`token inesperado ${t.v} em: ${src}`);
    if (peek()?.v === "(") {
      eat("(");
      const args: Valor[] = [];
      while (peek()?.v !== ")") { args.push(or()); if (peek()?.v === ",") eat(","); }
      eat(")");
      const f = funcs[t.v];
      if (!f) throw new Error(`função fora do subconjunto: ${t.v}`);
      return f(...args);
    }
    if (!(t.v in ctx)) throw new Error(`contexto fora do subconjunto: ${t.v}`);
    let v: Valor = ctx[t.v];
    while (peek()?.v === "." || peek()?.v === "[") {
      if (eat().v === ".") { const k = eat().v; v = v == null ? undefined : (v as Record<string, Valor>)[k]; }
      else { const k = or(); eat("]"); v = v == null ? undefined : (v as Record<string, Valor>)[String(k)]; }
    }
    return v;
  }
  function unary(): Valor { if (peek()?.v === "!") { eat("!"); return !truthy(unary()); } return primary(); }
  function cmp(): Valor {
    let a = unary();
    while (peek()?.v === "==" || peek()?.v === "!=") { const op = eat().v; const b = unary(); a = op === "==" ? eq(a, b) : !eq(a, b); }
    return a;
  }
  function and(): Valor { let a = cmp(); while (peek()?.v === "&&") { eat(); const b = cmp(); a = truthy(a) ? b : a; } return a; }
  function or(): Valor { let a = and(); while (peek()?.v === "||") { eat(); const b = and(); a = truthy(a) ? a : b; } return a; }
  const v = or();
  if (p !== tk.length) throw new Error(`sobra na expressão: ${src}`);
  return v;
}

export function interpolar(texto: Valor, ctx: Contexto): string {
  if (typeof texto !== "string") return texto == null ? "" : String(texto);
  return texto.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, e: string) => {
    const v = avaliar(e.trim(), ctx);
    return v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

const condicao = (expr: string | undefined, ctx: Contexto, padrao = "success()"): boolean => {
  const e = (expr ?? padrao).replace(/^\$\{\{([\s\S]*)\}\}$/, "$1").trim();
  const temStatus = /\b(always|success|failure|cancelled)\(/.test(e);
  const v = avaliar(temStatus ? e : `success() && (${e})`, ctx);
  return !(v === false || v === null || v === undefined || v === "" || v === 0);
};

// ───────────────────────────────────────────────────────────────── execução

interface Config {
  workflow: string; raiz: string; fontes: Record<string, string>; self: string; sha: string;
  inputs: Record<string, string>; secrets: Record<string, string>; saida: string; jobs?: string[];
}
interface ResultadoPasso { job: string; passo: string; resultado: "success" | "failure" | "skipped"; segundos: number; detalhe?: string }

function sh(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): { code: number; out: string } {
  const r = spawnSync(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** Dublê local do `gh release …`: uma pasta por repositório/tag. Só o necessário para a fase `anexar`. */
const GH_DUBLE = `#!/usr/bin/env node
const fs=require("fs"),path=require("path");const a=process.argv.slice(2);const v=(n)=>a.includes(n)?a[a.indexOf(n)+1]:undefined;
const base=process.env.FAKE_GH_DIR;if(!base){console.error("FAKE_GH_DIR");process.exit(2)}
if(!process.env.GH_TOKEN){console.error("gh: sem GH_TOKEN");process.exit(4)}
if(a[0]!=="release"){console.error("dublê: só release");process.exit(2)}
const repo=v("--repo"),tag=a[2],dir=path.join(base,repo.replace("/","__"),tag);
switch(a[1]){
 case "view": process.exit(fs.existsSync(dir)?0:1);
 case "create": if(fs.existsSync(dir)){console.error("já existe");process.exit(1)} fs.mkdirSync(dir,{recursive:true});process.exit(0);
 case "upload": { const f=a[3];const d=path.join(dir,path.basename(f)); if(!fs.existsSync(dir)){console.error("release inexistente");process.exit(1)} if(fs.existsSync(d)){console.error("anexo já existe");process.exit(1)} fs.copyFileSync(f,d);process.exit(0);}
 case "download": { const p=v("--pattern"),o=v("--dir");const s=path.join(dir,p); if(!fs.existsSync(s))process.exit(1); fs.mkdirSync(o,{recursive:true});fs.copyFileSync(s,path.join(o,p));process.exit(0);}
}
process.exit(2);
`;

export function executar(cfg: Config): { jobs: Record<string, { result: string; outputs: Record<string, string> }>; passos: ResultadoPasso[] } {
  const wf = yaml.load(readFileSync(cfg.workflow, "utf8")) as Workflow;
  const raiz = resolve(cfg.raiz);
  mkdirSync(raiz, { recursive: true });
  const deposito = join(raiz, "artefatos");
  const ghDir = join(raiz, "gh-releases");
  const bin = join(raiz, "bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, "gh"), GH_DUBLE);
  chmodSync(join(bin, "gh"), 0o755);
  const needs: Record<string, { result: string; outputs: Record<string, string> }> = {};
  const passos: ResultadoPasso[] = [];
  const pendentes = Object.keys(wf.jobs).filter((j) => !cfg.jobs || cfg.jobs.includes(j));
  const runId = String(Date.now());
  while (pendentes.length) {
    const prontoIdx = pendentes.findIndex((j) => [wf.jobs[j].needs ?? []].flat().every((n) => needs[n]));
    if (prontoIdx < 0) throw new Error(`dependência circular ou ausente: ${pendentes.join(", ")}`);
    const jid = pendentes.splice(prontoIdx, 1)[0];
    const job = wf.jobs[jid];
    const jobNeeds = Object.fromEntries([job.needs ?? []].flat().map((n) => [n, needs[n]]));
    const ws = join(raiz, "jobs", jid, "ws"), tmp = join(raiz, "jobs", jid, "tmp");
    mkdirSync(ws, { recursive: true });
    mkdirSync(tmp, { recursive: true });
    const github = { sha: cfg.sha, workspace: ws, repository: cfg.self, run_id: runId, run_attempt: "1", server_url: "https://github.com" };
    const steps: Record<string, { outputs: Record<string, string>; outcome: string }> = {};
    const status = { falhou: [job.needs ?? []].flat().some((n) => needs[n].result !== "success") };
    const ctx: Contexto = { inputs: cfg.inputs, secrets: cfg.secrets, github, runner: { temp: tmp, os: "Linux" }, needs: jobNeeds, steps, _status: status };
    if (!condicao(job.if, ctx)) {
      needs[jid] = { result: "skipped", outputs: {} };
      passos.push({ job: jid, passo: "(job)", resultado: "skipped", segundos: 0 });
      console.log(`== job ${jid}: pulado`);
      continue;
    }
    console.log(`== job ${jid}`);
    status.falhou = false;
    for (const [i, passo] of job.steps.entries()) {
      const nome = passo.name ?? passo.uses ?? `passo ${i + 1}`;
      if (!condicao(passo.if, ctx)) { passos.push({ job: jid, passo: nome, resultado: "skipped", segundos: 0 }); continue; }
      const t0 = Date.now();
      const env: NodeJS.ProcessEnv = {
        PATH: `${bin}:${process.env.PATH}`, HOME: process.env.HOME, LANG: "C.UTF-8", DOCKER_HOST: process.env.DOCKER_HOST,
        GITHUB_WORKSPACE: ws, RUNNER_TEMP: tmp, GITHUB_SHA: cfg.sha, GITHUB_REPOSITORY: cfg.self, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: "1",
        GITHUB_SERVER_URL: "https://github.com", FAKE_GH_DIR: ghDir, CI: "true",
      };
      for (const [k, v] of Object.entries(passo.env ?? {})) env[k] = interpolar(v, ctx);
      const w = Object.fromEntries(Object.entries(passo.with ?? {}).map(([k, v]) => [k, interpolar(v, ctx)]));
      let ok = true, detalhe = "";
      const saidaPath = join(tmp, `_saida_${i}`);
      writeFileSync(saidaPath, "");
      env.GITHUB_OUTPUT = saidaPath;
      env.GITHUB_STEP_SUMMARY = join(tmp, "_resumo.md");
      if (passo.run) {
        const r = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", passo.run], { cwd: ws, env, stdio: "inherit" });
        ok = r.status === 0;
        detalhe = `código ${r.status}`;
      } else if (passo.uses?.startsWith("actions/checkout@")) {
        const repo = w.repository || cfg.self;
        const fonte = cfg.fontes[repo];
        if (!fonte) throw new Error(`fonte local ausente para ${repo}`);
        const dest = join(ws, w.path || ".");
        if (w.repository && !w.token) { ok = false; detalhe = "checkout de outro repositório sem token"; }
        else {
          const cmds: string[][] = [["clone", "-q", "--no-checkout", fonte, dest]];
          if (w["sparse-checkout"]) {
            const pats = w["sparse-checkout"].split("\n").map((l) => l.trim()).filter(Boolean);
            cmds.push(["-C", dest, "sparse-checkout", "set", ...(w["sparse-checkout-cone-mode"] === "false" ? ["--no-cone"] : []), ...pats]);
          }
          cmds.push(["-C", dest, "-c", "advice.detachedHead=false", "checkout", "-q", w.ref || cfg.sha]);
          for (const c of cmds) {
            const r = sh("git", c);
            if (r.code !== 0) { ok = false; detalhe = r.out.slice(0, 400); break; }
          }
          // persist-credentials: false — no runner, sem token gravado; aqui o remoto local não tem credencial nenhuma
        }
      } else if (passo.uses?.startsWith("actions/setup-node@")) {
        const v = sh("node", ["--version"]).out.trim();
        ok = v === `v${w["node-version"]}`;
        detalhe = `${v} (pedido v${w["node-version"]})`;
      } else if (passo.uses?.startsWith("actions/upload-artifact@")) {
        const src = w.path;
        if (existsSync(src)) { mkdirSync(join(deposito, w.name), { recursive: true }); cpSync(src, join(deposito, w.name), { recursive: true }); }
        else if (w["if-no-files-found"] === "error") { ok = false; detalhe = `${src} vazio`; }
      } else if (passo.uses?.startsWith("actions/download-artifact@")) {
        if (existsSync(join(deposito, w.name))) cpSync(join(deposito, w.name), w.path, { recursive: true });
        else { ok = false; detalhe = `artefato ${w.name} inexistente`; }
      } else throw new Error(`ação fora do emulador: ${passo.uses}`);
      const outputs = Object.fromEntries(readFileSync(saidaPath, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
      if (passo.id) steps[passo.id] = { outputs, outcome: ok ? "success" : "failure" };
      const resultado = ok || passo["continue-on-error"] ? "success" : "failure";
      if (resultado === "failure") status.falhou = true;
      passos.push({ job: jid, passo: nome, resultado: ok ? "success" : "failure", segundos: Math.round((Date.now() - t0) / 1000), ...(detalhe ? { detalhe } : {}) });
      console.log(`   ${ok ? "ok  " : passo["continue-on-error"] ? "erro (continue-on-error)" : "FALHA"} ${nome} (${Math.round((Date.now() - t0) / 1000)} s)${ok ? "" : ` — ${detalhe}`}`);
    }
    const outputs = Object.fromEntries(Object.entries(job.outputs ?? {}).map(([k, v]) => [k, interpolar(v, ctx)]));
    needs[jid] = { result: status.falhou ? "failure" : "success", outputs };
    console.log(`== job ${jid}: ${needs[jid].result}`);
  }
  const rel = { jobs: needs, passos };
  writeFileSync(cfg.saida, JSON.stringify(rel, null, 2) + "\n");
  return rel;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const cfgPath = args[args.indexOf("--config") + 1];
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as Config;
  const r = executar(cfg);
  const falhos = Object.entries(r.jobs).filter(([, j]) => j.result === "failure").map(([k]) => k);
  console.log(falhos.length ? `jobs com falha: ${falhos.join(", ")}` : "todos os jobs executados terminaram em sucesso");
  process.exitCode = falhos.length ? 1 : 0;
}
