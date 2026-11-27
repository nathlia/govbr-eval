/**
 * Tela F3 — arquivo de estratos (adendo 3 § 3, § 2.3 e § 7; bancada-tela-f3 § 3: formato `tela-f3-estratos-1.0.0`), no
 * formato que `conferirEstratos` (scripts/reanalise-nat74/recalculo-campanha.ts, ramo bancada-f3) cobra:
 *   { formato, referencia: { arquivo, versao, sha256 }, tipos: [...], specs: { "F3-xx": { tipo, subtipo?, nivel,
 *     exigeInteracao, origem, controleDaVarredura } } }
 * `subtipo` só nos tipos que declaram subtipos (T1). Os ids têm de ser exatamente `_meta.estratos.semeado.specs` da
 * referência. Valores de tela-f3/semeadas.mjs (tipo, subtipo e origem do adendo 3 § 3; controle = 05, 06, 07; nível e
 * interação atribuídos na montagem, com justificativa em semeadas.mjs). Molde: tela-f2/estratos.mjs.
 *   npx tsx tela-f3/estratos.mjs          → tela-f3/estratos-1.0.0.json com sha256 "PENDENTE-CONGELAMENTO" e confere o
 *                                           resto pelo próprio `conferirEstratos` e `regraDaTela` da bancada
 *   npx tsx tela-f3/estratos.mjs --selar  → grava o sha256 da referência congelada (só depois do congelamento)
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { SEMEADAS } from "./semeadas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const REF = "ground-truth-processos-f3.json";
const refBuf = readFileSync(join(RAIZ, REF)), ref = JSON.parse(refBuf);
const TIPOS = [
  { id: "T1", rotulo: "Estrutura", subtipos: ["anatomia", "marcacao"] },
  { id: "T2", rotulo: "Valor fora do sistema" },
  { id: "T3", rotulo: "Valor do sistema no lugar errado" },
  { id: "T4", rotulo: "Estado e comportamento" },
  { id: "R", rotulo: "Redação" },
];
const sem = ref._meta.estratos?.semeado?.specs ?? [];
const comSub = new Set(TIPOS.filter(t => t.subtipos).map(t => t.id));
const specs = Object.fromEntries(SEMEADAS.map(s => [s.id, { tipo: s.tipo, ...(comSub.has(s.tipo) ? { subtipo: s.subtipo } : {}), nivel: s.nivel, exigeInteracao: s.exigeInteracao, origem: s.origem, controleDaVarredura: s.controleDaVarredura }]));
if (JSON.stringify(Object.keys(specs).sort()) !== JSON.stringify([...sem].sort())) throw new Error("ids do arquivo de estratos ≠ estrato semeado da referência");
// o que o adendo 3 § 3 declara
const conta = k => Object.values(specs).reduce((o, s) => ((o[s[k]] = (o[s[k]] ?? 0) + 1), o), {});
const esperado = { tipo: { T1: 3, T2: 2, T3: 1, T4: 5, R: 1 }, origem: { mantido: 5, trocado: 6, novo: 1 } };
for (const k of ["tipo", "origem"]) for (const [v, n] of Object.entries(esperado[k])) if ((conta(k)[v] ?? 0) !== n) throw new Error(`${k} ${v}: ${conta(k)[v]} ≠ ${n} (adendo 3 § 3)`);
const controles = Object.entries(specs).filter(([, s]) => s.controleDaVarredura).map(([id]) => id);
if (JSON.stringify(controles) !== JSON.stringify(["F3-05", "F3-06", "F3-07"])) throw new Error(`controles ${controles}`);
const selar = process.argv.includes("--selar");
if (selar && /RASCUNHO/.test(String(ref._meta.status))) throw new Error("a referência ainda é rascunho: --selar só depois do congelamento");
const shaRef = createHash("sha256").update(refBuf).digest("hex");
const doc = { formato: "tela-f3-estratos-1.0.0", referencia: { arquivo: REF, versao: ref._meta.version, sha256: selar ? shaRef : "PENDENTE-CONGELAMENTO" }, tipos: TIPOS, specs };
writeFileSync(join(AQUI, "estratos-1.0.0.json"), JSON.stringify(doc, null, 2) + "\n");
// conferência pela própria bancada (com o sha256 da referência atual no lugar do pendente)
const { conferirEstratos, regraDaTela } = await import("../scripts/reanalise-nat74/recalculo-campanha.ts");
conferirEstratos({ ...doc, referencia: { ...doc.referencia, sha256: shaRef } }, ref, shaRef, REF);
const regra = regraDaTela("processos-f3", ref);
console.log(`estratos-1.0.0.json: ${Object.keys(specs).length} specs; tipos ${JSON.stringify(conta("tipo"))}; origem ${JSON.stringify(conta("origem"))}; nível ${JSON.stringify(conta("nivel"))}; interação ${JSON.stringify(conta("exigeInteracao"))}; controles ${controles.join(",")}; sha256 da referência ${doc.referencia.sha256}; conferirEstratos ok; regraDaTela ${regra.conjuntos.map(x => `${x.id}=${x.specs.length}`).join(" ")}`);
