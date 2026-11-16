/**
 * Tela E2 — regras que não podem ser semeadas (metodo.md § 5): (1) expostas: ids de violations[].rules das
 * referências das telas A, A2, B e D (ground-truth-*.json do checkout principal do govbr-eval; SÓ esses ids são
 * lidos); (2) tentativa-e: regras sorteadas ou postas em vigor na tentativa real (tela-e/sorteio.json › sementes[].regra
 * e tela-e/sementes-vigentes.json › vigentes[].regra; só os ids). Aliases WCAG não entram (contados).
 * Grava tela-e2/expostas.json. Uso: node tela-e2/montar-expostas.mjs [--referencias <checkout principal>]
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--referencias");
const REF = resolve(i > 0 ? process.argv[i + 1] : join(RAIZ, "../../govbr-eval"));
const sha = b => createHash("sha256").update(b).digest("hex");
const TELAS = [
  { tela: "A", arquivo: "ground-truth-solicitacao.json" },
  { tela: "A2", arquivo: "ground-truth-acompanhamento.json" },
  { tela: "B", arquivo: "ground-truth-vistorias.json" },
  { tela: "D", arquivo: "ground-truth-processos.json" },
];
const expostas = new Map(), coCita = new Map(), wcag = new Set(), lidas = [];
for (const t of TELAS) {
  const bruto = readFileSync(join(REF, t.arquivo));
  const ref = JSON.parse(bruto);
  const ids = new Set((ref.violations ?? []).flatMap(v => (Array.isArray(v.rules) ? v.rules : []).filter(r => typeof r === "string")));
  // por id: as recomendações do e-MAG citadas na MESMA spec (só ids; serve para id sem localizador no corpus)
  for (const v of ref.violations ?? []) { const rs = (Array.isArray(v.rules) ? v.rules : []).filter(r => typeof r === "string"); for (const r of rs) if (r.startsWith("govbr-")) coCita.set(r, [...new Set([...(coCita.get(r) ?? []), ...rs.filter(x => x.startsWith("emag:"))])]); }
  for (const r of ids) {
    if (/^wcag:/.test(r)) { wcag.add(r); continue; }
    if (!/^(govbr-|emag:)/.test(r)) throw new Error(`id de regra fora do formato em ${t.arquivo}`);
    expostas.set(r, [...new Set([...(expostas.get(r) ?? []), t.tela])]);
  }
  lidas.push({ tela: t.tela, arquivo: t.arquivo, sha256: sha(bruto), versao: ref._meta?.version ?? null, idsDeRegra: ids.size });
}
const sorteioE = readFileSync(join(RAIZ, "tela-e/sorteio.json"));
const vigentesE = readFileSync(join(RAIZ, "tela-e/sementes-vigentes.json"));
const tentativa = [...new Set([...JSON.parse(sorteioE).sementes.map(s => s.regra), ...JSON.parse(vigentesE).vigentes.map(v => v.regra)])].sort();
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REF, encoding: "utf8" }).trim();
const saida = {
  _meta: {
    regra: "tela-e2/metodo.md § 5: 'exposta' = id em violations[].rules de A, A2, B ou D; 'tentativa-e' = regra sorteada ou vigente na tentativa real. Só ids foram lidos.",
    origem: { checkout: "govbr-eval (principal), só leitura", head, referencias: lidas, tentativaE: { sorteio: { arquivo: "tela-e/sorteio.json", sha256: sha(sorteioE) }, vigentes: { arquivo: "tela-e/sementes-vigentes.json", sha256: sha(vigentesE) } } },
    wcagNaoUsados: wcag.size,
  },
  expostas: [...expostas.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([regra, fontes]) => ({ regra, fontes, ...(regra.startsWith("govbr-") ? { emagNaMesmaSpec: (coCita.get(regra) ?? []).sort() } : {}) })),
  tentativaE: tentativa,
};
writeFileSync(join(RAIZ, "tela-e2/expostas.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(`expostas ${saida.expostas.length} (${saida.expostas.filter(p => p.regra.startsWith("govbr-")).length} govbr, ${saida.expostas.filter(p => p.regra.startsWith("emag:")).length} e-MAG); tentativa-e ${tentativa.length}; WCAG não usados ${wcag.size}; head ${head.slice(0, 7)}`);
