/**
 * Tela F3 — roda a conferência da bancada (`scripts/check-reference.ts --tela processos-f3`, sem modelo, sem oráculo,
 * sem axe) contra um build servido, ANTES do commit pequeno da bancada em telas.json.
 *
 * `check-reference` lê a referência por `telas.json › processos-f3.reference`, que ainda é null (a bancada faz esse
 * commit). Para medir o rascunho, este script troca SÓ esse campo no telas.json do worktree, roda a conferência e
 * devolve os bytes originais (try/finally), conferindo o sha256 depois. Nada é commitado com a troca.
 * Uso: node tela-f3/conferir-referencia.mjs <APP_URL> <arquivo de log>
 */
import { createHash } from "crypto";
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const [APP_URL, LOG] = process.argv.slice(2);
if (!APP_URL || !LOG) throw new Error("uso: conferir-referencia.mjs <APP_URL> <log>");
const sha = b => createHash("sha256").update(b).digest("hex");
const TELAS = join(RAIZ, "telas.json");
const original = readFileSync(TELAS);
const shaOriginal = sha(original);
const refSha = sha(readFileSync(join(RAIZ, "ground-truth-processos-f3.json")));
let r;
try {
  const t = JSON.parse(original.toString("utf8"));
  if (t["processos-f3"].reference !== null) throw new Error("telas.json já aponta processos-f3 para uma referência: nada a trocar");
  t["processos-f3"].reference = "ground-truth-processos-f3.json";
  writeFileSync(TELAS, JSON.stringify(t, null, 2) + "\n");
  r = spawnSync(process.execPath, [join(RAIZ, "node_modules/tsx/dist/cli.mjs"), "scripts/check-reference.ts", "--tela", "processos-f3"], { cwd: RAIZ, env: { ...process.env, APP_URL }, encoding: "utf8", maxBuffer: 1 << 28 });
} finally {
  writeFileSync(TELAS, original);
}
if (sha(readFileSync(TELAS)) !== shaOriginal) throw new Error("telas.json não voltou aos bytes originais");
writeFileSync(LOG, `${refSha} *ground-truth-processos-f3.json\n${r.stdout}${r.stderr}`);
console.log(`${r.stdout}${r.stderr}`.trim().split("\n").slice(-30).join("\n"));
console.log(`saída ${r.status}; telas.json restaurado (${shaOriginal.slice(0, 12)}…)`);
process.exit(r.status ?? 1);
