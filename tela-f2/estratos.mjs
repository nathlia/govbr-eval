/**
 * Tela F2 — arquivo de estratos (adendo 2 § 3, § 4 item 6, § 7: id da spec semeada → tipo, subtipo, nível, interação), no
 * formato que `conferirEstratos` (scripts/reanalise-nat74/recalculo-campanha.ts, ramo bancada-f2) cobra:
 *   { formato: "tela-f2-estratos-1.0.0", referencia: { arquivo, versao, sha256 }, tipos: [...], specs: { "F2-xx": {...} } }
 * Os ids têm de ser exatamente `_meta.estratos.semeado.specs` da referência. Molde: tela-f/niveis.mjs.
 *   node tela-f2/estratos.mjs           → tela-f2/estratos-1.0.0.json com sha256 "PENDENTE-CONGELAMENTO" e confere o resto
 *                                         pelo próprio `conferirEstratos` da bancada (com a referência atual)
 *   node tela-f2/estratos.mjs --selar   → grava o sha256 da referência congelada (só depois do congelamento)
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const REF = "ground-truth-processos-f2.json";
const comp = JSON.parse(readFileSync(join(AQUI, "composicao.json"), "utf8"));
const refBuf = readFileSync(join(RAIZ, REF)), ref = JSON.parse(refBuf);
const ROTULO = { T1: "Estrutura", T2: "Valor fora do sistema", T3: "Valor do sistema no lugar errado", T4: "Estado e comportamento" };
const sem = ref._meta.estratos?.semeado?.specs ?? [];
const specs = Object.fromEntries(comp.semeadas.map(s => [s.id, { tipo: s.tipo, ...(s.tipo === "T1" ? { subtipo: s.subtipo } : {}), nivel: s.nivel, exigeInteracao: s.exigeInteracao }]));
if (JSON.stringify(Object.keys(specs).sort()) !== JSON.stringify([...sem].sort())) throw new Error("ids do arquivo de estratos ≠ estrato semeado da referência");
const selar = process.argv.includes("--selar");
if (selar && /RASCUNHO/.test(String(ref._meta.status))) throw new Error("a referência ainda é rascunho: --selar só depois do congelamento");
const shaRef = createHash("sha256").update(refBuf).digest("hex");
const doc = {
  formato: "tela-f2-estratos-1.0.0",
  referencia: { arquivo: REF, versao: ref._meta.version, sha256: selar ? shaRef : "PENDENTE-CONGELAMENTO" },
  tipos: ["T1", "T2", "T3", "T4"].map(t => ({ id: t, rotulo: ROTULO[t], ...(t === "T1" ? { subtipos: ["anatomia", "marcacao"] } : {}) })),
  specs,
};
writeFileSync(join(AQUI, "estratos-1.0.0.json"), JSON.stringify(doc, null, 2) + "\n");
// conferência pela própria bancada (com o sha256 da referência atual no lugar do pendente)
const { conferirEstratos } = await import("../scripts/reanalise-nat74/recalculo-campanha.ts");
conferirEstratos({ ...doc, referencia: { ...doc.referencia, sha256: shaRef } }, ref, shaRef, REF);
console.log(`estratos-1.0.0.json: ${Object.keys(specs).length} specs; sha256 da referência ${doc.referencia.sha256}; conferirEstratos ok`);
