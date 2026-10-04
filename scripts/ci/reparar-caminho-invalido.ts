/**
 * Reparo de uma vez: caminhos do govbr-resultados que o Windows (NTFS) não aceita (2026-10-04: o
 * registro sem pacote `…__?__sem-pacote-gh-…` fez o `git pull` do clone da autora falhar).
 *
 * Roda num clone do arquivo onde esses caminhos existem (Linux, ou só no índice do git). Para cada
 * arquivo rastreado com segmento inválido:
 *   - calcula o nome seguro: `__?__` vira `__<braço>__` quando a agenda arquivada da campanha diz o braço
 *     do slot da entrada, senão `__sem-braco__`; o resto passa por `segmentoSeguro` (proibido → `x`,
 *     sem ponto/espaço no fim, nome reservado ganha `_`);
 *   - move no índice do git pelo mesmo blob (`update-index --index-info`, funciona sem o arquivo no disco)
 *     e, se o arquivo existir no disco, move-o também;
 *   - corrige as referências: `caminho` (e braço/par, se eram nulos e a agenda os diz) em
 *     `indice/entradas/*.json`, e o texto de `indice/indice.json` e `INDICE.md`.
 * Recusa se um destino já existir. Sem `--aplicar`, só lista o que faria. Com `--aplicar`, faz um commit
 * (sem push; quem roda decide).
 *
 *   npx tsx scripts/ci/reparar-caminho-invalido.ts --arquivo CLONE [--aplicar]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { problemasDeCaminhoWindows, segmentoSeguro, type EntradaIndice } from "../arquivo-resultados";

interface Movimento { de: string; para: string }
export interface PlanoReparo { movimentos: Movimento[]; pastas: Movimento[]; entradas: { chave: string; de: string; para: string; braco: string | null; par: string | null }[] }

const git = (repo: string, args: string[], input?: string): string =>
  execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", input, maxBuffer: 256 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });

function lerEntradas(repo: string): { arquivo: string; e: EntradaIndice }[] {
  const dir = join(repo, "indice", "entradas");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ arquivo: `indice/entradas/${f}`, e: JSON.parse(readFileSync(join(dir, f), "utf8")) as EntradaIndice }));
}

/** Braço e par do slot pela agenda arquivada da campanha (`campanhas/<id>/agendas/<sha>/agenda.json`), se uma só resposta. */
function slotNaAgenda(repo: string, campanha: string, slot: string | null): { arm: string; pairId: string } | null {
  if (!slot) return null;
  const dir = join(repo, "campanhas", campanha, "agendas");
  if (!existsSync(dir)) return null;
  const achados = new Set<string>();
  for (const sha of readdirSync(dir)) {
    try {
      const a = JSON.parse(readFileSync(join(dir, sha, "agenda.json"), "utf8")) as { slots: { slotId: string; arm: string; pairId: string }[] };
      const s = a.slots.find((x) => x.slotId === slot);
      if (s && (s.arm === "sem" || s.arm === "com")) achados.add(JSON.stringify({ arm: s.arm, pairId: s.pairId }));
    } catch { /* agenda ilegível: não decide nada */ }
  }
  return achados.size === 1 ? JSON.parse([...achados][0]) as { arm: string; pairId: string } : null;
}

export function planejarReparo(repo: string): PlanoReparo {
  const arquivos = git(repo, ["ls-files", "-z"]).split("\0").filter(Boolean);
  const entradas = lerEntradas(repo);
  // pasta inválida (o prefixo até o primeiro segmento inválido) → pasta segura
  const pastas = new Map<string, string>();
  for (const f of arquivos) {
    const segs = f.split("/");
    const i = segs.findIndex((s) => problemasDeCaminhoWindows(s).length > 0);
    if (i < 0) continue;
    const prefixo = segs.slice(0, i + 1).join("/");
    if (pastas.has(prefixo)) continue;
    const dona = entradas.find((x) => x.e.caminho === prefixo || prefixo.startsWith(`${x.e.caminho}/`));
    const ag = dona ? slotNaAgenda(repo, dona.e.campanha, dona.e.slot) : null;
    const braco = dona?.e.braco ?? ag?.arm ?? "sem-braco";
    const seguro = segmentoSeguro(segs[i].replace(/__\?__/g, `__${braco}__`));
    pastas.set(prefixo, [...segs.slice(0, i), seguro].join("/"));
  }
  const movimentos: Movimento[] = [];
  for (const f of arquivos) {
    let para = f;
    for (const [de, novo] of pastas) if (para === de || para.startsWith(`${de}/`)) para = novo + para.slice(de.length);
    // segmentos inválidos mais fundos (dentro de uma pasta já trocada): um a um
    para = para.split("/").map((s) => (problemasDeCaminhoWindows(s).length ? segmentoSeguro(s) : s)).join("/");
    if (para !== f) movimentos.push({ de: f, para });
  }
  const destinos = new Set<string>();
  for (const m of movimentos) {
    if (arquivos.includes(m.para) || existsSync(join(repo, m.para)) || destinos.has(m.para)) throw new Error(`destino já existe, nada foi feito: ${m.para} (de ${m.de})`);
    destinos.add(m.para);
  }
  const plano: PlanoReparo = { movimentos, pastas: [...pastas].map(([de, para]) => ({ de, para })), entradas: [] };
  for (const { e } of entradas) {
    const p = plano.pastas.find((x) => e.caminho === x.de || e.caminho.startsWith(`${x.de}/`));
    if (!p) continue;
    const ag = slotNaAgenda(repo, e.campanha, e.slot);
    plano.entradas.push({ chave: e.chave, de: e.caminho, para: p.para + e.caminho.slice(p.de.length), braco: e.braco ?? ag?.arm ?? null, par: e.par ?? ag?.pairId ?? null });
  }
  return plano;
}

export function aplicarReparo(repo: string, plano: PlanoReparo, commit = true): void {
  if (!plano.movimentos.length) return;
  // índice do git: remove o velho e adiciona o novo com o mesmo blob e modo (não depende do disco)
  const info = plano.movimentos.map((m) => {
    const [meta] = git(repo, ["ls-files", "-s", "-z", "--", m.de]).split("\0");
    const [modo, blob] = meta.split(/\s+/);
    return `0 ${"0".repeat(blob.length)}\t${m.de}\0${modo} ${blob}\t${m.para}\0`;
  }).join("");
  git(repo, ["update-index", "-z", "--index-info"], info);
  for (const m of plano.movimentos) {
    if (existsSync(join(repo, m.de))) { mkdirSync(dirname(join(repo, m.para)), { recursive: true }); renameSync(join(repo, m.de), join(repo, m.para)); }
    // o caminho velho só existia no índice do git (clone no Windows): o novo, válido, vai para o disco
    else git(repo, ["checkout-index", "-f", "--", m.para]);
  }
  const tocados: string[] = [];
  for (const x of plano.entradas) {
    const rel = `indice/entradas/${x.chave}.json`, path = join(repo, rel);
    const e = JSON.parse(readFileSync(path, "utf8")) as EntradaIndice;
    writeFileSync(path, JSON.stringify({ ...e, caminho: x.para, braco: x.braco, par: x.par }, null, 2) + "\n");
    tocados.push(rel);
  }
  for (const rel of ["indice/indice.json", "INDICE.md"]) {
    const path = join(repo, rel);
    if (!existsSync(path)) continue;
    let t = readFileSync(path, "utf8");
    for (const p of plano.pastas) t = t.split(p.de).join(p.para);
    if (rel === "indice/indice.json") {
      const j = JSON.parse(t) as { entradas: EntradaIndice[] };
      for (const e of j.entradas) { const x = plano.entradas.find((y) => y.chave === e.chave); if (x) { e.braco = x.braco as EntradaIndice["braco"]; e.par = x.par; } }
      t = JSON.stringify(j, null, 2) + "\n";
    }
    writeFileSync(path, t);
    tocados.push(rel);
  }
  if (tocados.length) git(repo, ["add", "--", ...tocados]);
  const sobra = git(repo, ["ls-files", "-z"]).split("\0").filter((f) => f && problemasDeCaminhoWindows(f).length);
  if (sobra.length) throw new Error(`ainda há caminhos inválidos no índice do git: ${sobra.join(", ")}`);
  if (commit) git(repo, ["commit", "-q", "-m", `reparo: caminhos inválidos no Windows → ${plano.pastas.map((p) => p.para.split("/").pop()).join(" ")}`]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const i = args.indexOf("--arquivo");
    if (i < 0 || !args[i + 1]) throw new Error("uso: reparar-caminho-invalido.ts --arquivo CLONE [--aplicar]");
    const repo = resolve(args[i + 1]);
    const plano = planejarReparo(repo);
    if (!plano.movimentos.length) { console.log("nenhum caminho inválido no Windows: nada a reparar"); process.exit(0); }
    for (const p of plano.pastas) console.log(`${p.de}\n  → ${p.para}`);
    for (const e of plano.entradas) console.log(`entrada ${e.chave}: caminho, braço ${e.braco ?? "—"}, par ${e.par ?? "—"}`);
    console.log(`${plano.movimentos.length} arquivo(s) a mover`);
    if (!args.includes("--aplicar")) { console.log("(seco: nada mudou; repita com --aplicar para mover e commitar, sem push)"); process.exit(0); }
    aplicarReparo(repo, plano);
    console.log("reparado e commitado (sem push)");
  } catch (e) { console.error((e as Error).message); process.exit(1); }
}
