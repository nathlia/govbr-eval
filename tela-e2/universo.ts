/**
 * Tela E2 — universo de obrigações (método tela-e2/metodo.md § 4.1).
 *
 * Reusa a extração da A2 (scripts/tela-a2-universo.ts › buildUniverse) sem mudança: lê SÓ o corpus literal
 * ds-rules/govbr-ds-3.7.0-corpus (sha256 de cada arquivo conferido contra o MANIFEST.json) e a auditoria de leitura
 * da A2 (tela-a2/universo-auditoria.json). Não lê a base do oráculo nem nada do govbr-ds-validator.
 * Confere que o universo sai igual ao da A2, unidade a unidade (ids e conteúdo), e grava tela-e2/universo.json.
 *
 * Uso: npx tsx tela-e2/universo.ts
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildUniverse, CORPUS } from "../scripts/tela-a2-universo";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");

const { unidades, meta } = buildUniverse();
const a2 = JSON.parse(readFileSync(join(ROOT, "tela-a2/universo.json"), "utf8"));
const igual = JSON.stringify(a2.unidades) === JSON.stringify(unidades);
if (!igual) throw new Error("universo difere do da A2: a extração ou o corpus mudou");
const manifest = JSON.parse(readFileSync(join(CORPUS, "MANIFEST.json"), "utf8")) as { arquivo: string; sha256: string; status: string }[];
const out = {
  _meta: {
    ...meta,
    geradoPor: "tela-e2/universo.ts (extração de scripts/tela-a2-universo.ts, sem mudança)",
    igualAoDaA2: { arquivo: "tela-a2/universo.json", sha256: sha256(readFileSync(join(ROOT, "tela-a2/universo.json"))), unidades: a2.unidades.length },
    auditoriaDeLeitura: { arquivo: "tela-a2/universo-auditoria.json", sha256: sha256(readFileSync(join(ROOT, "tela-a2/universo-auditoria.json"))) },
    fontesSha256: Object.fromEntries(manifest.filter(m => m.status === "ok").map(m => [m.arquivo, m.sha256])),
  },
  unidades,
};
writeFileSync(join(ROOT, "tela-e2/universo.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ total: unidades.length, porForca: meta.porForca, arquivosLidos: meta.arquivosLidos, manifestSha256: meta.manifestSha256, igualAoDaA2: igual }));
