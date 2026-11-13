/**
 * [Protocolo NAT-78 §10 item 6 · N5 = sim (decisão da autora) · procedimento da D-169] Referência da tela D (`processos`)
 * 1.0.0 → 1.1.0: SÓ os ids de norma de `rules[]` passam da base 3.7.0 antiga (186 regras) às unidades da base literal
 * 3.7.0 que o oráculo usa. Mesmo procedimento das referências da A (2.0.0 → 2.1.0) e da B (1.0.0 → 1.1.0), eval `9b973b2`:
 *  - cada `rules[]` é migrado por `scripts/rules-legado.ts` (`migrarRules`): id público e id já literal ficam; id legado vai
 *    ao sucessor do `legacy-ids.json`, ou à unidade literal de texto normalizado igual / que começa pelo antigo / ao par
 *    consecutivo que o reparte; senão a nenhuma (`sem-unidade`). Nada é escolhido por semelhança;
 *  - o `rules[]` antigo fica em `rulesLegado[]` (só nas specs que tinham id legado); `_meta.version` 1.1.0 e
 *    `_meta.historico` (de, para, data, motivo, baseLiteral, migracao) como na 2.1.0 / 1.1.0;
 *  - nenhuma unidade, âncora, estado, contagem, categoria, descrição ou medida muda (conferido por
 *    `npm run conferir:dominio -- --referencia <nova> --base ground-truth-processos.json --validador <validador>`).
 *
 * Diferença do precedente, por instrução do coordenador: a 1.0.0 congelada NÃO é sobrescrita (fica byte a byte, e
 * `telas.json` continua apontando para ela); a 1.1.0 sai em arquivo novo na raiz, `ground-truth-processos-1.1.0.json`
 * (fora do checkout esparso do CI pelo padrão `!/ground-truth*.json`). Trocar o ponteiro é do coordenador.
 *
 *   npx tsx tela-d/migrar-ids-literal.ts --validador ../govbr-ds-validator [--data AAAA-MM-DD]
 *     → ground-truth-processos-1.1.0.json, tela-d/migracao-ids-literal-1.1.0.json (tabela id a id),
 *       tela-d/sem-correspondencia-unica-1.1.0.json (ids sem unidade literal única: para a autora), e o .sha256 de cada um em tela-d/.
 *     Recusa sobrescrever (versão nova = arquivo novo). Determinístico, sem rede, sem modelo; lê só `data/` do validador.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lerBaseLiteral, migrarRegra, migrarRules, temLegado, type Migracao } from "../scripts/rules-legado";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const rel = (p: string) => relative(RAIZ, p).replace(/\\/g, "/");
const ser = (x: unknown) => JSON.stringify(x, null, 2) + "\n";
export const DE = "1.0.0", PARA = "1.1.0";

type Json = Record<string, unknown>;
interface Spec { id: string; rules: string[]; [k: string]: unknown }
interface Ref { _meta: Json & { version: string }; violations: Spec[] }

/** A spec com `rulesLegado` logo depois de `rules` (ordem de chaves do precedente), só se havia id legado. */
function specMigrada(v: Spec, novas: string[], legado: boolean): Spec {
  const out: Json = {};
  for (const [k, x] of Object.entries(v)) { out[k] = k === "rules" ? novas : x; if (k === "rules" && legado) out.rulesLegado = v.rules; }
  return out as Spec;
}

export function migrar(refTxt: string, base: ReturnType<typeof lerBaseLiteral>, cab: { data: string; validador: string }) {
  const ref = JSON.parse(refTxt) as Ref;
  if (ser(ref) !== refTxt) throw new Error("a referência não está na serialização canônica (JSON 2 espaços + \\n): o diff restrito não valeria");
  if (ref._meta.version !== DE) throw new Error(`referência ${ref._meta.version}; esperado ${DE}`);
  if ("historico" in ref._meta) throw new Error("a 1.0.0 já tem _meta.historico");
  const tabela: (Migracao & { spec: string })[] = [];
  const violations = ref.violations.map(v => {
    for (const r of v.rules) tabela.push({ spec: v.id, ...migrarRegra(r, base) });
    const legado = temLegado(v.rules, base);
    return specMigrada(v, legado ? migrarRules(v.rules, base).rules : v.rules, legado);
  });
  const migracao = tabela.filter(m => m.como !== "publico" && m.como !== "literal").map(({ spec, de, para, como }) => ({ spec, de, para, como }));
  const historico = [{
    de: DE, para: PARA, data: cab.data,
    motivo: "Migração de ids (protocolo NAT-78 §10 item 6; N5 = sim, decisão da autora; mesmo procedimento da D-169 nas referências da A 2.1.0 e da B 1.1.0). `rules[]` de cada spec: ids da base 3.7.0 antiga (186 regras), contra a qual a 1.0.0 foi auditada, trocados pela(s) unidade(s) da base literal que carregam a mesma cláusula (scripts/rules-legado.ts: sucessor do legacy-ids.json; id descartado → unidade literal de texto normalizado igual ou que começa pelo antigo, ou o par consecutivo que reparte a mesma frase; senão nenhuma); o `rules[]` antigo fica em `rulesLegado[]`. Id sem unidade literal única fica fora de `rules` e listado para a autora em tela-d/sem-correspondencia-unica-1.1.0.json (nada adivinhado). Nenhuma unidade, âncora, estado, contagem, categoria, descrição nem medida muda; sem `dominio` (fora do escopo desta versão). A 1.0.0 (eval 7b7a9f4, sha256 " + sha(refTxt) + ") continua byte a byte em ground-truth-processos.json.",
    baseLiteral: { validador: cab.validador, fontes: base.fontes },
    migracao,
  }];
  const meta: Json = {};
  for (const [k, x] of Object.entries(ref._meta)) { meta[k] = k === "version" ? PARA : x; if (k === "version") meta.historico = historico; }
  const nova = { ...ref, _meta: meta, violations };
  const conta = (f: (m: Migracao) => boolean) => tabela.filter(f).length;
  const contagens = {
    idsCitados: tabela.length,
    inalterados: conta(m => m.como === "publico" || m.como === "literal"),
    migrados: conta(m => m.como === "legado-sucessor" || m.como === "texto-normalizado"),
    migradosParaMaisDeUma: conta(m => (m.como === "legado-sucessor" || m.como === "texto-normalizado") && m.para.length > 1),
    semCorrespondenciaUnica: conta(m => m.como === "sem-unidade"),
    porComo: Object.fromEntries(["publico", "literal", "legado-sucessor", "texto-normalizado", "sem-unidade"].map(c => [c, conta(m => m.como === c)])),
    specsComRulesLegado: violations.filter(v => "rulesLegado" in v).length,
    specsQueFicamSemRules: violations.filter(v => "rulesLegado" in v && v.rules.length === 0).length,
    specs: violations.length,
  };
  return { nova: ser(nova), tabela, contagens };
}

if (process.argv[1] && /(?:^|[\\/])migrar-ids-literal\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const valDir = val("--validador");
  if (!valDir) { console.error("--validador DIR (o checkout do govbr-ds-validator cuja data/ dá a base literal)"); process.exit(1); }
  const v = resolve(valDir);
  const git = (...x: string[]) => execFileSync("git", x, { cwd: v, encoding: "utf8" }).trim();
  const commit = git("rev-parse", "--short", "HEAD"), sujo = git("status", "--porcelain", "--", "data/knowledge");
  if (sujo) { console.error(`${v}: data/knowledge com mudança não commitada; a base literal tem de ser a de um commit`); process.exit(1); }
  const versao = (JSON.parse(readFileSync(join(v, "package.json"), "utf8")) as { version: string }).version;
  const refArq = join(RAIZ, "ground-truth-processos.json");
  const saidas = { ref: join(RAIZ, `ground-truth-processos-${PARA}.json`), tabela: join(RAIZ, "tela-d", `migracao-ids-literal-${PARA}.json`),
    sem: join(RAIZ, "tela-d", `sem-correspondencia-unica-${PARA}.json`) };
  const shaDe = (f: string) => join(RAIZ, "tela-d", basename(f).replace(/\.json$/, ".sha256"));
  for (const f of Object.values(saidas)) for (const g of [f, shaDe(f)]) if (existsSync(g)) { console.error(`${rel(g)} já existe: versão nova = arquivo novo`); process.exit(1); }
  const refTxt = readFileSync(refArq, "utf8");
  const base = lerBaseLiteral(v);
  const r = migrar(refTxt, base, { data: val("--data") ?? new Date().toISOString().slice(0, 10), validador: `govbr-ds-validator ${versao} (${commit})` });
  const cab = { referenciaBase: { arquivo: "ground-truth-processos.json", version: DE, sha256: sha(refTxt) },
    referenciaNova: { arquivo: rel(saidas.ref), version: PARA, sha256: sha(r.nova) },
    validador: { versao, commit, fontes: base.fontes }, gerador: { script: "tela-d/migrar-ids-literal.ts", sha256: sha(readFileSync(fileURLToPath(import.meta.url))),
      biblioteca: { script: "scripts/rules-legado.ts", sha256: sha(readFileSync(join(RAIZ, "scripts", "rules-legado.ts"))) } } };
  const tabelaTxt = ser({ formato: "d169-migracao-ids-1.0.0", ...cab, contagens: r.contagens, tabela: r.tabela });
  const sem = r.tabela.filter(m => m.como === "sem-unidade");
  const semTxt = ser({ formato: "d169-sem-correspondencia-1.0.0", titulo: "sem correspondência única", ...cab,
    nota: "Ids legados da 1.0.0 para os quais a base literal não tem exatamente uma unidade (ou um par consecutivo) com a mesma cláusula. Saem de `rules` na 1.1.0 e ficam em `rulesLegado`; NADA foi escolhido por semelhança. Decisão pendente da autora: deixar sem id (como A-06/A-09 na A 2.1.0 e B-04/B-05/B-06/B-24 na B 1.1.0) ou indicar a unidade, em versão nova.",
    decisao: "pendente (autora)", total: sem.length, itens: sem.map(({ spec, de, nota }) => ({ spec, de, motivo: nota })) });
  for (const [k, txt] of [["ref", r.nova], ["tabela", tabelaTxt], ["sem", semTxt]] as const) {
    writeFileSync(saidas[k], txt);
    writeFileSync(shaDe(saidas[k]),`${sha(txt)}  ${rel(saidas[k])}\n`);
    console.log(`${rel(saidas[k])}  ${sha(txt)}`);
  }
  console.log(JSON.stringify(r.contagens));
}
