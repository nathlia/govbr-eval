/**
 * Testes da primeira passada cega para campanha nova (e14-campanha.ts, NAT-78 §8.1). Sem modelo, sem rede: uma análise
 * sintética de trio (sem/ferramentas/com + linha de base) numa pasta temporária, respostas SINTÉTICAS (`indeterminado`).
 *   npx tsx scripts/reanalise-nat74/test-e14-campanha.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gravar, gravarJson, sha } from "./comum";
import { FORMATO_RESPOSTAS, NAO_PERGUNTADO, type CartaoCego } from "./e14-comum";
import { bracoDoRun, mascararTrio, prepararCampanha } from "./e14-campanha";
import { ingerir } from "./e14-ingerir";

let n = 0, falhas = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.message : e}`); } };

console.log("E14 campanha: máscara e braço");
t("máscara do trio tira ids da base, ferramentas e termos do oráculo; deixa a norma pública", () => {
  const m = mascararTrio("scan_page e get_ds_rules acharam govbr-3.7.0-component-message-001a7ba0b67f e ds-page-footer; o oráculo (validator) e wcag:1.3.1")!;
  for (const x of ["scan_page", "get_ds_rules", "govbr-3", "ds-page", "oráculo", "validator"]) assert.ok(!m.includes(x), `${x} em: ${m}`);
  assert.ok(m.includes("wcag:1.3.1"));
});
t("braço pelo perfil do oráculo; perfil desconhecido para", () => {
  const r = (p: string | null, kind = "agente", tool: string | null = null) => ({ id: "r", kind, tool, config: { oracleProfile: p }, cardIds: [] }) as never;
  assert.deepEqual([r("none"), r("knowledge-free"), r("evaluation"), r(null, "linha-de-base", "axe-core")].map(bracoDoRun), ["sem", "ferramentas", "com", "lb-axe"]);
  assert.throws(() => bracoDoRun(r("outro")));
});

console.log("E14 campanha: análise sintética → lotes → ingestão");
const tmp = mkdtempSync(join(tmpdir(), "e14-campanha-"));
try {
  const dir = join(tmp, "trio-01");
  const card = (id: string, observed: string, rule: string | null) => ({ id, origin: "agente", scene: "1280x900", selector: "#nome", rule, description: observed,
    contract: "achado-2", observed, expected: "Associar o rótulo ao campo.", state: { viewport: { width: 1280, height: 900 }, steps: ["load"] }, evidence: [],
    binding: {}, flags: [], subjects: [{ id: "k1", key: "k1", label: "<input#nome>" }], relatedKeys: [], candidateUnitIds: ["U-1"], reportedEvidence: null });
  const cards = [card("C-aaaa", "Campo sem rótulo.", "wcag:1.3.1"), card("C-bbbb", "scan_page mostrou campo sem rótulo.", "label"),
    card("C-cccc", "Sem rótulo pela regra govbr-3.7.0-component-input-0123456789ab.", "govbr-3.7.0-component-input-0123456789ab")];
  const run = (id: string, p: string, ids: string[]) => ({ id, kind: "agente", tool: null, config: { oracleProfile: p }, cardIds: ids });
  gravarJson(dir, "revisao/package.json", { units: [{ id: "U-1", specId: "A-01" }], cards,
    runs: [run("20990101-000000-x-sem-0001", "none", ["C-aaaa"]), run("20990101-000000-x-ferramentas-0002", "knowledge-free", ["C-bbbb"]), run("20990101-000000-x-com-0003", "evaluation", ["C-cccc"])] });
  gravarJson(dir, "revisao/capture.json", { url: "/x.html" });
  gravarJson(dir, "entradas/campanha.json", { campaignId: "camp-sintetica-01", design: { screens: [{ id: "x", label: "X" }] } });
  gravarJson(dir, "entradas/referencia.json", { _meta: { version: "1.0.0" }, violations: [{ id: "A-01", state: "inicial", rules: ["wcag:1.3.1"], description: "Campo sem rótulo." }] });
  gravarJson(dir, "summary.json", { execucoes: [{ identidade: { tela: { id: "x", label: "X" } } }] });
  const p = prepararCampanha([dir]);
  t("cegueira OK: nenhuma falha, nada separa com de ferramentas, braço e run fora dos lotes", () => {
    assert.deepEqual(p.cegueira.falhas, []); assert.deepEqual(p.falhasTrio, []);
    const lote = p.arquivosDoJuiz.get("lotes/lote-01.json")!;
    for (const x of ["ferramentas-0002", "evaluation", "knowledge-free", "camp-sintetica", "scan_page", "govbr-3"]) assert.ok(!lote.includes(x), x);
  });
  t("chave liga id opaco a braço; MEDIDA é citável; endereço da tela no lote", () => {
    const k = JSON.parse(p.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { braco: string }[] };
    assert.deepEqual(k.itens.map(i => i.braco).sort(), ["com", "ferramentas", "sem"]);
    const l = JSON.parse(p.arquivosDoJuiz.get("lotes/lote-01.json")!) as { cartoes: CartaoCego[]; referencias: Record<string, { endereco: string }> };
    assert.ok(l.cartoes.every(c => c.citaveis.includes("MEDIDA"))); assert.equal(l.referencias.x.endereco, "/x.html");
  });
  t("a ingestão da E14 aceita a pasta (respostas sintéticas) e congela", () => {
    const fila = join(tmp, "fila");
    for (const [rel, x] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(fila, rel, x);
    const txt = p.arquivosDoJuiz.get("lotes/lote-01.json")!, l = JSON.parse(txt) as { cartoes: CartaoCego[] };
    gravarJson(fila, "respostas/lote-01.json", { formato: FORMATO_RESPOSTAS, lote: "lote-01", loteSha256: sha(txt), juiz: "teste sintético",
      respostas: l.cartoes.map(c => ({ id: c.id, verdadeFactual: "indeterminado", norma: { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
        vinculo: "indeterminado", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético." })) });
    const r = ingerir(fila);
    assert.deepEqual(r.erros, []); assert.equal((r.julgamentos as { completo: boolean }).completo, true);
  });
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da E14 campanha passaram`);
if (falhas) process.exitCode = 1;
