/**
 * Tela F2 — conferência de construção, sem oráculo e sem axe (adendo da F § 4 "Referência da F", mantido pelo adendo 2):
 * cada spec semeada violada no build semeado e conforme no build sem semente. Junta, por spec:
 *   - o predicado da referência medido pela conferência da bancada (scripts/check-reference.ts) nos dois builds servidos:
 *     `sustenta` no semeado (conferir-referencia-semeada.log) e `refuta` no sem semente (conferir-referencia-sem-semente.log);
 *   - a spec sem predicado (F2-01): a sonda (sonda.json) conta os filhos da lista da paginação nos dois builds;
 *   - a medida do construtor (construcao/medidas-M.json, M-… → F2-… por mapa-mudancas.json): passou.
 * Naturais: evidência do código da D idêntica entre os builds (remedida-d/evidencia-sem-semente-d14 × evidencia-semeada-d14).
 * Uso: node tela-f2/conferir-construcao.mjs → tela-f2/conferencia-construcao.json (sai ≠ 0 se algo divergir)
 */
import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const sha = b => createHash("sha256").update(b).digest("hex");
const refBuf = readFileSync(join(AQUI, "../ground-truth-processos-f2.json")), ref = JSON.parse(refBuf);
const logSem = readFileSync(join(AQUI, "conferir-referencia-sem-semente.log"), "utf8");
const logSemeada = readFileSync(join(AQUI, "conferir-referencia-semeada.log"), "utf8");
const sonda = JSON.parse(readFileSync(join(AQUI, "sonda.json"), "utf8"));
const medM = JSON.parse(readFileSync(join(AQUI, "construcao/medidas-M.json"), "utf8"));
const mapa = JSON.parse(readFileSync(join(AQUI, "mapa-mudancas.json"), "utf8")).M;
const mDe = Object.fromEntries(Object.entries(mapa).map(([m, f]) => [f, m]));
const desfecho = (log, id) => (log.match(new RegExp(`^\\s+${id}\\s+\\d+ unidade\\(s\\) · [^·]+ · (\\S+)`, "m")) ?? [])[1] ?? null;
const linhas = [];
for (const id of ref._meta.estratos.semeado.specs) {
  const v = ref.violations.find(x => x.id === id);
  const l = { spec: id, estado: v.state, mudanca: mDe[id], construtor: medM[mDe[id]]?.passou === true ? "passou" : "falhou" };
  if (v.acceptance) {
    l.semeada = desfecho(logSemeada, id); l.semSemente = desfecho(logSem, id);
    l.pega = l.semeada === "sustenta" && l.semSemente === "refuta" && l.construtor === "passou";
    l.como = "predicado da referência (check-reference) nos dois builds";
  } else if (id === "F2-01") {
    const a = sonda.semSemente.paginacao.map(b => b.aria), b = sonda.semeada.paginacao.map(b => b.aria);
    l.semSemente = `setas: ${a.join(", ")}`; l.semeada = `setas: ${b.join(", ")}`;
    l.pega = a.includes("Página anterior") && a.includes("Página seguinte") && !b.includes("Página anterior") && b.includes("Página seguinte") && l.construtor === "passou";
    l.como = "sonda.json: botões circulares de seta em nav.br-pagination nos dois builds";
  } else throw new Error(`${id}: sem predicado e sem conferência própria`);
  linhas.push(l);
}
// naturais: evidência do código da D idêntica entre os builds (com a âncora nova da D-14 nos dois)
const A = join(AQUI, "remedida-d/evidencia-sem-semente-d14"), B = join(AQUI, "remedida-d/evidencia-semeada-d14");
const naturais = existsSync(A) ? readdirSync(A).filter(f => /^D-/.test(f)).map(f => ({ spec: f.replace(".json", ""), igual: readFileSync(join(A, f)).equals(readFileSync(join(B, f))) })) : [];
const controles = existsSync(A) ? readdirSync(A).filter(f => /^K-/.test(f)).map(f => ({ par: f.replace(".json", ""), igual: readFileSync(join(A, f)).equals(readFileSync(join(B, f))) })) : [];
const out = {
  _meta: { data: "2026-11-26", regra: "cabeçalho de tela-f2/conferir-construcao.mjs; sem oráculo, sem axe, sem detector",
    referencia: { arquivo: "ground-truth-processos-f2.json", sha256: sha(refBuf), status: "rascunho" },
    builds: { semeado: ".tmp-eval/pnip-f2-semeada (lista b113879f…; = govbr-corpus tela-f2 a7d6ccd public/pnip-f2)", semSemente: ".tmp-eval/pnip-f2-sem-semente (lista 1b44c9cc…)" },
    contagens: { semeadas: linhas.length, pegam: linhas.filter(l => l.pega).length, naturaisComEvidenciaIgual: naturais.filter(n => n.igual).length, naturais: naturais.length, paresDaDComEvidenciaIgual: controles.filter(n => n.igual).length, paresDaD: controles.length } },
  semeadas: linhas, naturais, paresDaD: controles,
};
writeFileSync(join(AQUI, "conferencia-construcao.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out._meta.contagens));
process.exit(linhas.every(l => l.pega) && naturais.length === 13 && naturais.every(n => n.igual) ? 0 : 1);
