/**
 * Tela F — arquivo de níveis (adendo de 26/11 § 4: id da spec semeada → nível), no formato que
 * `conferirNiveis` (scripts/reanalise-nat74/recalculo-campanha.ts, ramo bancada-f) cobra:
 *   { formato: "tela-f-niveis-1.0.0", referencia: { arquivo, versao, sha256 }, niveis: { "F-xx": nivel } }
 * Os ids têm de ser exatamente `_meta.estratos.semeado.specs` da referência; níveis em facil|medio|dificil|muito-dificil.
 *
 *   node tela-f/niveis.mjs            → tela-f/niveis-1.0.0.json com sha256 "PENDENTE-CONGELAMENTO"
 *   node tela-f/niveis.mjs --selar    → grava o sha256 da referência congelada (rodar só depois do congelamento)
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const REF = "ground-truth-processos-f.json";
const comp = JSON.parse(readFileSync(join(AQUI, "composicao.json"), "utf8"));
const refBuf = readFileSync(join(RAIZ, REF));
const ref = JSON.parse(refBuf);
const NIVEIS = ["facil", "medio", "dificil", "muito-dificil"];
const niveis = Object.fromEntries(comp.semeadas.map(s => [s.id, s.nivel]));
const sem = ref._meta.estratos?.semeado?.specs ?? [];
if (JSON.stringify(Object.keys(niveis).sort()) !== JSON.stringify([...sem].sort())) throw new Error("ids do arquivo de níveis ≠ estrato semeado da referência");
for (const [s, n] of Object.entries(niveis)) if (!NIVEIS.includes(n)) throw new Error(`${s}: nível ${n}`);
for (const v of ref.violations) if (v.nivel !== undefined && v.nivel !== niveis[v.id]) throw new Error(`${v.id}: nível diverge da referência`);
const selar = process.argv.includes("--selar");
if (selar && /RASCUNHO/.test(String(ref._meta.status))) throw new Error("a referência ainda é rascunho: --selar só depois do congelamento");
const doc = { formato: "tela-f-niveis-1.0.0", referencia: { arquivo: REF, versao: ref._meta.version, sha256: selar ? createHash("sha256").update(refBuf).digest("hex") : "PENDENTE-CONGELAMENTO" }, niveis };
writeFileSync(join(AQUI, "niveis-1.0.0.json"), JSON.stringify(doc, null, 2) + "\n");
console.log(`niveis-1.0.0.json: ${Object.keys(niveis).length} specs; sha256 da referência ${doc.referencia.sha256}`);
