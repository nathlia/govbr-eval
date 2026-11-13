/**
 * [D-156 3.i · protocolo NAT-78 §5.2 item 5 e §10 item 5 (`CONG-14`)] Arquivo de classes da tela D (`processos`):
 * a classe de cada spec (`ds` × `geral`) derivada MECANICAMENTE da `categories` da referência congelada, pela mesma
 * função que a tabulação da leitura usa (`classeDaSpec` / `CLASSE_DA_CATEGORIA` de scripts/reanalise-nat74/e14-deteccao.ts).
 *
 *   npx tsx tela-d/classes-d156.ts [--referencia ground-truth-processos.json] [--saida tela-d/classes-d156.json]
 *     → classes-d156.json + classes-d156.sha256 (recusa se já existirem: versão nova = arquivo novo)
 *
 * Regra (D-156; vocabulário ampliado em 04/11/2026, decisoes-do-assistente): `ds` só quando TODA categoria da spec é do
 * DS (token, estrutura, tipografia, componente, comportamento); `acessibilidade`, `navegacao` e `formulario` puxam para
 * `geral`. Categoria fora do vocabulário PARA (nenhum mapeamento é inventado aqui). As specs expostas (`_meta.exposto`)
 * recebem classe como as outras, mas a contagem primária é a das não expostas (protocolo A16).
 *
 * Determinístico, sem rede, sem modelo, sem navegador. Não lê nada do oráculo. Não escreve na referência.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSE_DA_CATEGORIA, DETECCAO_VERSAO, classeDaSpec } from "../scripts/reanalise-nat74/e14-deteccao";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FORMATO = "d156-classes-1.0.0";
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const rel = (p: string) => relative(RAIZ, p).replace(/\\/g, "/");

interface Ref { _meta: { version: string; suite?: string; exposto?: { specs: string[] } }; violations: { id: string; categories: string[] }[] }

export function classes(refTxt: string) {
  const ref = JSON.parse(refTxt) as Ref;
  const expostas = new Set(ref._meta.exposto?.specs ?? []);
  for (const e of expostas) if (!ref.violations.some(v => v.id === e)) throw new Error(`_meta.exposto cita spec que não existe: ${e}`);
  const fora = [...new Set(ref.violations.flatMap(v => v.categories))].filter(c => !(c in CLASSE_DA_CATEGORIA));
  if (fora.length) throw new Error(`${fora.length} categoria(s) fora do vocabulário da D-156: ${fora.join(", ")} — decidir a tabela antes (nenhum mapeamento inventado)`);
  const specs = ref.violations.map(v => ({ id: v.id, categories: v.categories, classe: classeDaSpec(v.categories), exposta: expostas.has(v.id) }));
  const conta = (xs: typeof specs) => ({ total: xs.length, ds: xs.filter(s => s.classe === "ds").length, geral: xs.filter(s => s.classe === "geral").length });
  return { ref, specs, contagens: { naoExpostas: conta(specs.filter(s => !s.exposta)), expostas: conta(specs.filter(s => s.exposta)), todas: conta(specs) } };
}

if (process.argv[1] && /(?:^|[\\/])classes-d156\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const refArq = resolve(val("--referencia") ?? join(RAIZ, "ground-truth-processos.json"));
  const saida = resolve(val("--saida") ?? join(RAIZ, "tela-d", "classes-d156.json"));
  const shaArq = saida.replace(/\.json$/, ".sha256");
  for (const f of [saida, shaArq]) if (existsSync(f)) { console.error(`${rel(f)} já existe: versão nova = arquivo novo`); process.exit(1); }
  const refTxt = readFileSync(refArq);
  let r;
  try { r = classes(refTxt.toString("utf8")); } catch (e) { console.error((e as Error).message); process.exit(1); }
  const doc = {
    formato: FORMATO,
    item: "CONG-14 (protocolo NAT-78 §5.2 item 5, §10 item 5); classe de spec da D-156 3.i",
    referencia: { arquivo: rel(refArq), version: r.ref._meta.version, sha256: sha(refTxt) },
    regra: {
      fonte: `scripts/reanalise-nat74/e14-deteccao.ts (CLASSE_DA_CATEGORIA, classeDaSpec; tabulação ${DETECCAO_VERSAO})`,
      texto: "ds só quando TODA categoria da spec é do DS; uma categoria geral (acessibilidade, navegacao, formulario) puxa a spec para geral; categoria fora do vocabulário para a derivação",
      vocabulario: CLASSE_DA_CATEGORIA,
      decisoes: ["D-156 3.i", "decisoes-do-assistente 2026-11-04 (tipografia/componente/comportamento = DS)"],
    },
    gerador: { script: "tela-d/classes-d156.ts", sha256: sha(readFileSync(fileURLToPath(import.meta.url))) },
    contagens: r.contagens,
    specs: r.specs,
  };
  const txt = JSON.stringify(doc, null, 2) + "\n";
  writeFileSync(saida, txt);
  writeFileSync(shaArq, `${sha(txt)}  ${rel(saida)}\n`);
  const c = r.contagens;
  console.log(`ok: ${rel(saida)} (sha256 ${sha(txt)}) — referência ${r.ref._meta.version} ${sha(refTxt).slice(0, 8)}…`);
  console.log(`não expostas: ${c.naoExpostas.total} = ds ${c.naoExpostas.ds} · geral ${c.naoExpostas.geral}; expostas: ${c.expostas.total} = ds ${c.expostas.ds} · geral ${c.expostas.geral}`);
}
