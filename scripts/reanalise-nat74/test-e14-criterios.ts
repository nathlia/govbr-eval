/**
 * Testes dos critérios de julgamento declarados pela tela na passada cega (e14-campanha.ts 1.4.8). Sem modelo, sem rede:
 * análise, validador, telas.json e arquivo de critérios SINTÉTICOS numa pasta temporária (nenhum texto da referência real);
 * ao fim, conferências só de contagem e de sha256 sobre o arquivo real da tela E e sobre a declaração da tela D.
 *   npx tsx scripts/reanalise-nat74/test-e14-criterios.ts
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256Tree } from "../collection-manifest";
import { EVAL, gravar, gravarJson, sha } from "./comum";
import { proibidos } from "./e14-cegueira";
import { FORMATO_RESPOSTAS_CAMPANHA_1_3_1, NAO_PERGUNTADO, type CartaoCego } from "./e14-comum";
import {
  BASE_URL_PADRAO, E14_CAMPANHA_VERSAO_1_4, E14_CAMPANHA_VERSAO_CRITERIOS, LEIAME_CRITERIOS, LEIAME_MOTIVO_SEM_VINCULO, LEIAME_VERSAO_CRITERIOS, TELAS_PADRAO,
  criteriosDeclarados, criteriosParaOJuiz, leiameCampanha13, prepararCampanha,
} from "./e14-campanha";
import { ingerir } from "./e14-ingerir";

let n = 0, falhas = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.message : e}`); } };

const tmp = mkdtempSync(join(tmpdir(), "e14-criterios-"));
try {
  // ── validador sintético (só data/), como em test-e14-campanha.ts
  const valDir = join(tmp, "validador"), vData = join(valDir, "data"), vNorm = "knowledge/versions/3.7.0-literal-teste/normalized";
  gravarJson(vData, "knowledge/manifest.json", { activeVersion: "3.7.0-literal-teste" });
  gravar(vData, `${vNorm}/rules.jsonl`, JSON.stringify({ id: "govbr-3.7.0-component-input-0123456789ab", title: "Campo de entrada deve ter rótulo visível", normalizedRule: "x.", force: "required" }) + "\n");
  gravarJson(vData, "wcag-2.2.json", { criteria: [{ num: "1.3.1", handle: "Info and Relationships", level: "A" }] });
  gravarJson(vData, "emag.json", { sections: { s2: { title: "Comportamento", rules: [{ id: "2.2", title: "Objetos programáveis acessíveis", description: "Scripts acessíveis." }] } } });
  const dataSha = sha256Tree(vData)!.sha256;
  gravarJson(tmp, "checker-aliases.json", { checks: [] });
  const opts = { validador: valDir, checkerAliases: join(tmp, "checker-aliases.json") };

  // ── análise sintética de um trio na tela `cad-sint` (3 defeitos U-01…U-03)
  const dir = join(tmp, "trio-01");
  const card = (id: string, observed: string, rule: string | null, cand: string[]) => ({ id, origin: "agente", scene: "1280x900", selector: "#nome", rule, description: observed,
    contract: "achado-2", observed, expected: "Corrigir.", state: { viewport: { width: 1280, height: 900 }, steps: ["load"] }, evidence: [],
    binding: {}, flags: [], subjects: [{ id: "k1", key: "k1", label: "<input#nome>" }], relatedKeys: [], candidateUnitIds: cand, reportedEvidence: null });
  const run = (id: string, p: string, ids: string[]) => ({ id, kind: "agente", tool: null, config: { oracleProfile: p }, cardIds: ids });
  gravarJson(dir, "revisao/package.json", { units: [{ id: "u1", specId: "U-01" }, { id: "u2", specId: "U-02" }, { id: "u3", specId: "U-03" }],
    cards: [card("C-aaaa", "Campo sem rótulo.", "wcag:1.3.1", ["u1"]), card("C-bbbb", "Mensagem confusa.", null, ["u2"]), card("C-cccc", "Botão sem ícone.", "emag:2.2", [])],
    runs: [run("20990101-000000-x-sem-0001", "none", ["C-aaaa"]), run("20990101-000000-x-ferramentas-0002", "knowledge-free", ["C-bbbb"]), run("20990101-000000-x-com-0003", "evaluation", ["C-cccc"])] });
  gravarJson(dir, "revisao/capture.json", { url: "/cad.html" });
  const oraculo = (perfil: string) => ({ version: "9.9.9", distSha256: "d".repeat(64), dataSha256: dataSha, profile: perfil });
  gravarJson(dir, "entradas/campanha.json", { campaignId: "camp-criterios-01", design: { screens: [{ id: "cad-sint", label: "Cad" }], arms: ["sem", "ferramentas", "com"],
    comparisons: [{ id: "ferramentas-x-com", arms: ["ferramentas", "com"], role: "primary" }] }, fixed: { oracleProfiles: { com: oraculo("evaluation"), ferramentas: oraculo("knowledge-free") } } });
  gravarJson(dir, "entradas/referencia.json", { _meta: { version: "1.0.0", waitFor: "#nome", setup: [] },
    violations: [{ id: "U-01", state: "sempre", rules: ["wcag:1.3.1"], description: "Campo sem rótulo." }, { id: "U-02", state: "sempre", rules: ["emag:2.2"], description: "Mensagem com jargão." },
      { id: "U-03", state: "sempre", rules: ["wcag:1.3.1"], description: "Botão sem ícone." }] });
  gravarJson(dir, "summary.json", { execucoes: [{ identidade: { tela: { id: "cad-sint", label: "Cad" } } }] });
  const refSha = sha(readFileSync(join(dir, "entradas", "referencia.json")));

  // ── arquivo de critérios sintético: U-02 estruturado numa seção, U-01/U-03 em texto noutra, uma variante (U-09) e contagens
  const doc = {
    _meta: { referencia: { sha256: refSha }, fontes: { "x.json": "f".repeat(64) },
      criteriosComuns: [{ id: "C-1", texto: "Acerto = afirmar o defeito no elemento.", fonte: "y" }, { id: "C-2", texto: "Com evidência faltando, `evidencia-insuficiente`.", fonte: "z" }] },
  } as Record<string, unknown>;
  doc.secaoUm = { "U-02": { classe: "DS", aceitacaoNaReferencia: "PISTA-DA-SECAO-UM",
    observavel: { situacao: "fixado", elemento: "corpo da mensagem", localizador: "#msg .corpo", oQueSeOlha: "o texto do corpo", fontes: ["PISTA-FONTE"] },
    estado: { situacao: "fixado", declarado: "sempre", comoSeAlcanca: "carga da página", medidoEm: "PISTA-MEDIDO", fontes: [] },
    criterio: { situacao: "fixado", acerto: "afirmar o jargão no corpo", naoConta: ["citar a norma sem o jargão;", "apontar outra mensagem."], fontes: [] } } };
  doc.secaoDois = { nota: "PISTA-NOTA", precisaram: 2,
    "U-01": { porQueOPredicadoNaoFixa: "PISTA-SECAO-DOIS", observavel: "#nome sem rótulo.", estado: "sempre.", criterio: "Acerto = afirmar o rótulo ausente; não conta: só citar a norma." },
    "U-03": { porQueOPredicadoNaoFixa: "PISTA-SECAO-DOIS", observavel: "#btn sem ícone.", estado: "sempre.", criterio: "Acerto = afirmar o ícone ausente." } };
  doc.variantes = { comU09: { "U-09": { observavel: { situacao: "nao-fixavel-sem-decisao" }, estado: { situacao: "nao-fixavel-sem-decisao" }, criterio: { situacao: "nao-fixavel-sem-decisao" } } } };
  doc.contagens = { naoFixavelSemDecisao: { "U-09": ["observavel"] } };
  const critRel = "criterios/criterios-sinteticos.json";
  gravarJson(tmp, critRel, doc);
  const critSha = sha(readFileSync(join(tmp, critRel)));
  const telasCom = (extra: Record<string, unknown> = {}) => { gravarJson(tmp, "telas.json", { "cad-sint": { criteriosDeJulgamento: { arquivo: critRel, sha256: critSha, ...extra } } }); return join(tmp, "telas.json"); };
  const telasSem = join(tmp, "sem", "telas.json");
  gravarJson(join(tmp, "sem"), "telas.json", { "cad-sint": { titulo: "sem declaração" } });

  console.log("critérios de julgamento: lote, LEIAME e manifesto (1.4.8)");
  const pC = prepararCampanha([dir], { ...opts, telas: telasCom() });
  const loteTxt = pC.arquivosDoJuiz.get("lotes/lote-01.json")!;
  const lote = JSON.parse(loteTxt) as { cartoes: CartaoCego[]; referencias: Record<string, { criteriosComuns?: { id: string; texto: string }[]; defeitos: { id: string; criterio?: Record<string, string> }[] }> };
  const juizTxt = [...pC.arquivosDoJuiz.values()].join("\n");
  t("todo defeito da tela traz `criterio` com as MESMAS três chaves (observavel, estado, decisao); a tela traz os critérios comuns (id + texto)", () => {
    const r = lote.referencias["cad-sint"];
    assert.deepEqual(r.defeitos.map(d => [d.id, Object.keys(d.criterio ?? {})]), [["U-01", ["observavel", "estado", "decisao"]], ["U-02", ["observavel", "estado", "decisao"]], ["U-03", ["observavel", "estado", "decisao"]]]);
    assert.deepEqual(r.criteriosComuns!.map(c => Object.keys(c)), [["id", "texto"], ["id", "texto"]]);
    assert.deepEqual(r.defeitos.find(d => d.id === "U-01")!.criterio, { observavel: "#nome sem rótulo.", estado: "sempre.", decisao: "Acerto = afirmar o rótulo ausente; não conta: só citar a norma." }, "texto vai como está");
    assert.deepEqual(r.defeitos.find(d => d.id === "U-02")!.criterio, { observavel: "corpo da mensagem. Localizador: #msg .corpo. O que se olha: o texto do corpo", estado: "sempre. carga da página",
      decisao: "Acerto = afirmar o jargão no corpo Não conta: citar a norma sem o jargão; apontar outra mensagem." }, "registro estruturado vira texto pelos campos");
    assert.ok(Object.keys(r).indexOf("criteriosComuns") < Object.keys(r).indexOf("defeitos"), "critérios comuns antes dos defeitos");
  });
  t("nada que diga como cada defeito é medido nem de onde veio o critério chega ao juiz (seções, fontes, classe, predicado, nome do arquivo, variante)", () => {
    for (const x of ["PISTA", "secaoUm", "secaoDois", "porQueOPredicadoNaoFixa", "aceitacaoNaReferencia", "predicado", "fontes", "\"classe\"", "criterios-sinteticos", critSha, "U-09", "situacao", "medidoEm"])
      assert.ok(!juizTxt.includes(x), `${x} em arquivo do juiz`);
    assert.ok(!juizTxt.includes("evidencia-insuficiente") && lote.referencias["cad-sint"].criteriosComuns![1].texto.includes("evidência insuficiente"), "código de decisão vira a palavra");
  });
  t("cegueira OK com os critérios (nenhuma falha, nada separa com de ferramentas)", () => {
    assert.deepEqual(pC.cegueira.falhas, []); assert.deepEqual(pC.falhasTrio, []);
  });
  t("LEIAME 1.4.8: o bloco dos critérios uma vez, no fim da seção vinculo (depois do motivo do sem vínculo); sem ele, o LEIAME 1.4.7 byte a byte", () => {
    const l = pC.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    assert.equal(l.split(LEIAME_CRITERIOS).length - 1, 1);
    assert.ok(l.includes(LEIAME_MOTIVO_SEM_VINCULO + "\n" + LEIAME_CRITERIOS + "\n"));
    assert.ok(l.indexOf(LEIAME_CRITERIOS) > l.indexOf("### `vinculo`") && l.indexOf(LEIAME_CRITERIOS) < l.indexOf("### `sugestao`"), "na seção vinculo");
    const m = JSON.parse(pC.arquivosInternos.get("lotes/manifesto.json")!) as { total: number; lotes: unknown[] };
    assert.equal(l, leiameCampanha13(m.total, m.lotes.length, "Tela Cad", BASE_URL_PADRAO, [], false, true, true));
    assert.equal(l.replace(LEIAME_CRITERIOS + "\n", ""), leiameCampanha13(m.total, m.lotes.length, "Tela Cad", BASE_URL_PADRAO, [], false, true), "sem o bloco, o 1.4.7");
  });
  t("bloco do LEIAME uniforme: nenhum id de defeito, nada de predicado ou fonte, nenhuma palavra ou valor de braço", () => {
    for (const [nome, re] of proibidos(["sem", "ferramentas", "com"])) assert.ok(!re.test(LEIAME_CRITERIOS), `${nome} no bloco`);
    assert.ok(!/\b[ABDPU]-\d{2}\b|[0-9a-f]{12}|predicado|aceita[cç][aã]o|semPredicado|comPredicado|fonte/i.test(LEIAME_CRITERIOS), "nada que separe um defeito dos outros");
    for (const x of ["`criteriosComuns`", "`criterio`", "`observavel`", "`estado`", "`decisao`", "`motivoSemVinculo`", "`MEDIDA`", "qualquer que seja a origem do cartão"]) assert.ok(LEIAME_CRITERIOS.includes(x), x);
  });
  t("manifesto: versão 1.4.8, versão e sha256 do LEIAME, arquivo de critérios com o sha256 conferido e a referência; fontes com a declaração", () => {
    const m = JSON.parse(pC.arquivosInternos.get("lotes/manifesto.json")!) as { versao: string; leiame: { versao: string; sha256: string }; criterios: { tela: string; arquivo: string; sha256: string; referenciaSha256: string; defeitos: number; criteriosComuns: number }[]; fontes: Record<string, string> };
    assert.equal(m.versao, E14_CAMPANHA_VERSAO_CRITERIOS);
    assert.deepEqual(m.leiame, { versao: LEIAME_VERSAO_CRITERIOS, arquivo: "LEIAME-juiz.md", sha256: sha(pC.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!) });
    assert.deepEqual(m.criterios, [{ tela: "cad-sint", declaradoEm: "telas.json › cad-sint.criteriosDeJulgamento", arquivo: critRel, sha256: critSha, referenciaSha256: refSha, defeitos: 3, criteriosComuns: 2 }]);
    assert.equal(m.fontes[`telas.json › cad-sint.criteriosDeJulgamento: ${critRel}`], critSha);
    assert.equal((JSON.parse(loteTxt) as { instrucoes: { sha256: string } }).instrucoes.sha256, m.leiame.sha256, "o lote aponta este LEIAME");
  });
  t("recusas: sha256 do arquivo ≠ declarado; referência do arquivo ≠ a da análise; defeito sem critério; item fora da referência; registro não fixado; dois critérios; declaração fora do formato; política 1.2.0", () => {
    gravarJson(tmp, "telas-errado.json", { "cad-sint": { criteriosDeJulgamento: { arquivo: critRel, sha256: "0".repeat(64) } } });
    assert.throws(() => prepararCampanha([dir], { ...opts, telas: join(tmp, "telas-errado.json") }), /sha256 de .* ≠ o declarado em telas\.json/);
    assert.throws(() => prepararCampanha([dir], { ...opts, telas: telasCom({ nota: "x" }) }), /fora do formato/);
    const outro = (mut: (d: Record<string, any>) => void) => { const d = JSON.parse(JSON.stringify(doc)); mut(d); gravarJson(tmp, "criterios/outro.json", d);
      gravarJson(tmp, "telas-outro.json", { "cad-sint": { criteriosDeJulgamento: { arquivo: "criterios/outro.json", sha256: sha(readFileSync(join(tmp, "criterios", "outro.json"))) } } });
      return () => prepararCampanha([dir], { ...opts, telas: join(tmp, "telas-outro.json") }); };
    assert.throws(outro(d => { d._meta.referencia.sha256 = "e".repeat(64); }), /o arquivo é da referência/);
    assert.throws(outro(d => { delete d.secaoDois["U-03"]; }), /defeito U-03 da referência sem critério/);
    assert.throws(outro(d => { d.secaoDois["U-07"] = d.secaoDois["U-01"]; }), /item U-07 .* não é defeito da referência/);
    assert.throws(outro(d => { d.secaoUm["U-02"].estado.situacao = "nao-fixavel-sem-decisao"; }), /U-02\.estado não está fixado/);
    assert.throws(outro(d => { d.secaoUm["U-01"] = d.secaoDois["U-01"]; }), /defeito U-01 com dois critérios/);
    assert.throws(outro(d => { d._meta.criteriosComuns = []; }), /sem _meta\.criteriosComuns/);
    assert.throws(() => prepararCampanha([dir], { ...opts, telas: telasCom(), politica: "1.2.0" }), /só a política 1\.3\.0/);
  });
  t("ingestão 1.4.8: o mesmo esquema e a mesma ingestão; vínculo a U-01 entra e credita U-01", () => {
    const fila = join(tmp, "fila");
    for (const [rel, x] of [...pC.arquivosDoJuiz, ...pC.arquivosInternos]) gravar(fila, rel, x);
    const ch = JSON.parse(pC.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; cardIdOriginal: string }[] };
    const alvo = ch.itens.find(i => i.cardIdOriginal === "C-aaaa")!.id;
    const respostas = lote.cartoes.map(c => c.id === alvo
      ? { id: c.id, verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, vinculo: { spec: "U-01", relacao: "direta" },
        sugestao: c.perguntas.includes("sugestao") ? { trataOFato: "sim", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "valida" } : NAO_PERGUNTADO,
        forcaDoVeredito: "medido", evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o campo sem rótulo.", estadoAlcancado: "receita" }
      : { id: c.id, verdadeFactual: "indeterminado",
        norma: c.alegacao.regra === null ? { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } : { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
        vinculo: "indeterminado", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético.", estadoAlcancado: "receita" });
    gravarJson(fila, "respostas/lote-01.json", { formato: FORMATO_RESPOSTAS_CAMPANHA_1_3_1, lote: "lote-01", loteSha256: sha(loteTxt), juiz: "teste sintético", respostas });
    const r = ingerir(fila); assert.deepEqual(r.erros, []);
    assert.equal((r.julgamentos as { julgamentos: { id: string; derivado: { spec: string | null } }[] }).julgamentos.find(x => x.id === alvo)!.derivado.spec, "U-01");
  });

  console.log("critérios de julgamento: sem declaração, nada muda (o caminho da tela D)");
  t("tela sem a declaração (telas.json sem o campo, ou tela ausente do arquivo): todos os arquivos byte a byte iguais entre si e iguais aos da 1.4.7; versão 1.4.7; manifesto sem leiame/criterios", () => {
    const pSem = prepararCampanha([dir], { ...opts, telas: telasSem }), pPadrao = prepararCampanha([dir], opts);
    const todos = (p: typeof pSem) => [...p.arquivosDoJuiz, ...p.arquivosInternos].map(([k, v]) => `${k} ${sha(v)}`).sort();
    assert.deepEqual(todos(pSem), todos(pPadrao), "telas.json real (sem a tela sintética) = telas.json sem o campo");
    const m = JSON.parse(pSem.arquivosInternos.get("lotes/manifesto.json")!) as Record<string, unknown> & { total: number; lotes: unknown[]; versao: string };
    assert.equal(m.versao, E14_CAMPANHA_VERSAO_1_4);
    assert.ok(!("leiame" in m) && !("criterios" in m));
    assert.equal(pSem.arquivosDoJuiz.get("lotes/LEIAME-juiz.md"), leiameCampanha13(m.total, m.lotes.length, "Tela Cad", BASE_URL_PADRAO, [], false, true));
    const l = JSON.parse(pSem.arquivosDoJuiz.get("lotes/lote-01.json")!) as { referencias: Record<string, Record<string, unknown> & { defeitos: Record<string, unknown>[] }> };
    assert.ok(!("criteriosComuns" in l.referencias["cad-sint"]) && l.referencias["cad-sint"].defeitos.every(d => !("criterio" in d)));
    // Com a declaração, só mudam: o bloco do LEIAME, `criteriosComuns`/`criterio` no lote, o sha do LEIAME no lote e a versão.
    const lc = JSON.parse(loteTxt) as typeof l & { instrucoes: unknown };
    const sem = (x: typeof lc) => JSON.stringify({ ...x, instrucoes: null, referencias: Object.fromEntries(Object.entries(x.referencias).map(([k, r]) => {
      const { criteriosComuns: _c, ...resto } = r; void _c; return [k, { ...resto, defeitos: r.defeitos.map(({ criterio: _d, ...d }) => { void _d; return d; }) }]; })) });
    assert.equal(sem(lc), sem({ ...l, instrucoes: null } as typeof lc), "o resto do lote igual");
  });
  t("telas.json do repositório: só a tela E declara critérios; a D (processos) não declara (lote, LEIAME e manifesto da D seguem os da 1.4.7)", () => {
    const telas = JSON.parse(readFileSync(TELAS_PADRAO, "utf8")) as Record<string, { criteriosDeJulgamento?: unknown }>;
    assert.deepEqual(Object.keys(telas).filter(k => telas[k]?.criteriosDeJulgamento !== undefined), ["cadastro-pais", "processos-f"]);
    assert.equal(criteriosDeclarados("processos"), null);
    assert.equal(criteriosDeclarados("tela-inexistente"), null);
  });

  console.log("critérios de julgamento: arquivo real da tela E (só contagens e sha256)");
  const realAbs = join(EVAL, "tela-e2", "criterios-de-julgamento-sem-predicado.json"), refEAbs = join(EVAL, "ground-truth-cadastro-pais.json");
  if (!existsSync(realAbs) || !existsSync(refEAbs)) console.log("  PULADO arquivo real ausente");
  else t("tela E: o arquivo tem o sha256 declarado (ceb60518…); a referência que ele cita é a congelada; 8 defeitos com critério, 7 critérios comuns; texto do juiz sem padrão proibido", () => {
    const decl = criteriosDeclarados("cadastro-pais")!;
    assert.equal(decl.sha256, "ceb60518905b04366652f5680e90506f00fad25541f2de767a92c619a3deb992");
    assert.equal(sha(readFileSync(realAbs)), decl.sha256);
    assert.equal(decl.arquivo, "tela-e2/criterios-de-julgamento-sem-predicado.json");
    const doc = JSON.parse(readFileSync(realAbs, "utf8")) as { _meta: { referencia: { sha256: string } } };
    assert.equal(doc._meta.referencia.sha256, sha(readFileSync(refEAbs)));
    const ref = JSON.parse(readFileSync(refEAbs, "utf8")) as { violations: { id: string }[] };
    const c = criteriosParaOJuiz(doc, ref.violations.map(v => v.id));
    assert.equal(Object.keys(c.porDefeito).length, 8); assert.equal(c.comuns.length, 7);
    assert.ok(Object.values(c.porDefeito).every(x => Object.keys(x).join() === "observavel,estado,decisao" && x.observavel && x.estado && x.decisao));
    const txt = JSON.stringify(c);
    for (const [nome, re] of proibidos(["sem", "ferramentas", "com"])) assert.ok(!re.test(txt), `${nome} no texto do juiz`);
    for (const x of ["semPredicado", "comPredicado", "porQueOPredicadoNaoFixa", "aceitacaoNaReferencia", "naoFixavelSemDecisao", "criterios-de-julgamento"]) assert.ok(!txt.includes(x), x);
  });
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes dos critérios de julgamento passaram`);
if (falhas) process.exitCode = 1;
