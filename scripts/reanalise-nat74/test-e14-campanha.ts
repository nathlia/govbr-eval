/**
 * Testes da primeira passada cega para campanha nova (e14-campanha.ts, NAT-78 §8.1). Sem modelo, sem rede: uma análise
 * sintética de trio (sem/ferramentas/com + linha de base) numa pasta temporária, um validador sintético (só data/) e
 * respostas SINTÉTICAS (`indeterminado`).
 *   npx tsx scripts/reanalise-nat74/test-e14-campanha.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sha256Tree } from "../collection-manifest";
import { EVAL, bracoDosCartoes, gravar, gravarJson, sha } from "./comum";
import { PROIBIDOS, proibidos } from "./e14-cegueira";
import {
  FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_1, FORMATO_RESPOSTAS, FORMATO_RESPOSTAS_CAMPANHA, FORMATO_RESPOSTAS_CAMPANHA_1_1, NAO_PERGUNTADO,
  derivarClasse, validarResposta,
  type CartaoCego, type Resposta,
} from "./e14-comum";
import { bracoDoRun, enderecoDaTela, mascararTrio, passosLegiveis, prepararCampanha } from "./e14-campanha";
import { FORCA_NO_VOCABULARIO, normasDaCampanha } from "./e14-fila";
import { argumentosIngerir, contextoDe, ingerir } from "./e14-ingerir";
import { testesReferencias } from "./test-e14-referencias";

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
  assert.deepEqual([r("none"), r("knowledge-free"), r("evaluation"), r(null, "linha-de-base", "axe-core")].map(x => bracoDoRun(x)), ["sem", "ferramentas", "com", "lb-axe"]);
  assert.throws(() => bracoDoRun(r("outro")));
});
t("receita da linha de base vira os passos da referência (K3); passos do autor ficam", () => {
  const meta = { version: "1", waitFor: "#cpf", setup: [{ action: "click", selector: ".enviar" }, { action: "wait", selector: ".msg" }, { action: "fill", selector: "#a", value: "x" }] };
  assert.deepEqual(passosLegiveis(["setup do plano de estados (2 passo(s))"], meta), ["abrir o endereço da tela e esperar `#cpf`", "clicar em `.enviar`", "esperar `.msg` aparecer"]);
  assert.deepEqual(passosLegiveis(["setup do plano de estados até apos (3 passo(s))", "Tab"], meta).slice(-2), ["preencher `#a` com \"x\"", "Tab"]);
  assert.deepEqual(passosLegiveis(["load", "Tab x8"], meta), ["load", "Tab x8"]);
  assert.throws(() => passosLegiveis(["setup do plano de estados (9 passo(s))"], meta));
});
t("endereço da tela = _meta.url da referência com a consulta (D-154); sem url, o da captura; caminho diferente para", () => {
  assert.equal(enderecoDaTela({ url: "/pnip/portal-mpa/vistorias?mock-perfil=mpa" }, "/pnip/portal-mpa/vistorias"), "/pnip/portal-mpa/vistorias?mock-perfil=mpa");
  assert.equal(enderecoDaTela({ url: "/solicitacao.html" }, "/solicitacao.html"), "/solicitacao.html");
  assert.equal(enderecoDaTela({}, "/x.html"), "/x.html");
  assert.throws(() => enderecoDaTela({ url: "/outra?mock-perfil=mpa" }, "/pnip/portal-mpa/vistorias"), /caminhos diferentes/);
});
t("CLI da ingestão: --fila explícito; argumento solto, --fila vazio ou --fila com --saida recusados (J)", () => {
  assert.deepEqual(argumentosIngerir([]), { fila: null, refazer: false, erro: null });
  assert.equal(argumentosIngerir(["--saida", "x"]).erro, null);
  assert.equal(argumentosIngerir(["--refazer"]).refazer, true);
  assert.equal(argumentosIngerir(["--fila", "pasta"]).fila, resolve("pasta"));
  assert.match(argumentosIngerir(["pasta"]).erro!, /não reconhecido/);
  assert.match(argumentosIngerir(["--fila"]).erro!, /exige/);
  assert.match(argumentosIngerir(["--fila", "--refazer"]).erro!, /exige/);
  assert.match(argumentosIngerir(["--fila", "a", "--saida", "b"]).erro!, /juntos/);
});

console.log("E14 campanha: análise sintética → lotes → ingestão");
const tmp = mkdtempSync(join(tmpdir(), "e14-campanha-"));
try {
  // Validador sintético: só data/ (base ativa literal + herdadas + ids antigos, WCAG, e-MAG). Nada de src/ nem checker-aliases.
  const valDir = join(tmp, "validador"), vData = join(valDir, "data"), vNorm = "knowledge/versions/3.7.0-literal-teste/normalized";
  gravarJson(vData, "knowledge/manifest.json", { activeVersion: "3.7.0-literal-teste" });
  const regra = (id: string, title: string, force: string) => ({ id, title, normalizedRule: `${title}.`, force });
  gravar(vData, `${vNorm}/rules.jsonl`, [regra("govbr-3.7.0-component-input-0123456789ab", "Campo de entrada deve ter rótulo visível", "required"),
    regra("govbr-3.7.0-component-message-cccccccccccc", "Botão Fechar | Componente Button | Opcional", "permitted")].map(x => JSON.stringify(x)).join("\n") + "\n");
  gravar(vData, `${vNorm}/carried-over.jsonl`, JSON.stringify(regra("govbr-3.7.0-development-global-aaaaaaaaaaaa", "Prefira npm", "recommended")) + "\n");
  gravarJson(vData, `${vNorm}/legacy-ids.json`, { entries: [{ id: "govbr-3.7.0-accessibility-global-bbbbbbbbbbbb",
    record: regra("govbr-3.7.0-accessibility-global-bbbbbbbbbbbb", "Regra antiga de rótulo", "required") }] });
  gravarJson(vData, "wcag-2.2.json", { criteria: [{ num: "1.3.1", handle: "Info and Relationships", level: "A" }] });
  gravarJson(vData, "emag.json", { sections: { s2: { title: "Comportamento", rules: [{ id: "2.2", title: "Garantir que os objetos programáveis sejam acessíveis", description: "Scripts acessíveis." }] } } });
  const dataSha = sha256Tree(vData)!.sha256;
  const aliasesAbs = join(tmp, "checker-aliases.json");
  gravarJson(tmp, "checker-aliases.json", { checks: [{ kind: "page-footer", matches: "ds:page-footer", aliases: ["govbr-3.7.0-component-input-0123456789ab"],
    generic: ["govbr-3.7.0-development-global-aaaaaaaaaaaa", "govbr-3.7.0-nao-existe-000000000000"], basis: "Rodapé obrigatório" }] });

  const dir = join(tmp, "trio-01");
  const card = (id: string, observed: string, rule: string | null) => ({ id, origin: "agente", scene: "1280x900", selector: "#nome", rule, description: observed,
    contract: "achado-2", observed, expected: "Associar o rótulo ao campo.", state: { viewport: { width: 1280, height: 900 }, steps: ["load"] }, evidence: [],
    binding: {}, flags: [], subjects: [{ id: "k1", key: "k1", label: "<input#nome>" }], relatedKeys: [], candidateUnitIds: ["U-1"], reportedEvidence: null });
  const cards = [card("C-aaaa", "Campo sem rótulo.", "wcag:1.3.1"),
    { ...card("C-bbbb", "scan_page mostrou campo sem rótulo; o axe aponta 'Form elements must have labels'.", "label"), state: { viewport: { width: 1280, height: 900 }, steps: ["setup do plano de estados (2 passo(s))"] },
      evidence: [{ ref: "FAM-26db15d366c5", status: "identificador" }, { ref: "getComputedStyle(#nome).outline = none", status: "identificador" }] },
    card("C-cccc", "Sem rótulo pela regra govbr-3.7.0-component-input-0123456789ab.", "govbr-3.7.0-component-input-0123456789ab"),
    card("C-dddd", "O campo de nome não tem rótulo.", null), card("C-eeee", "Botão do calendário sem nome acessível.", "emag-2.2"),
    card("C-ffff", "Rodapé fora do padrão.", "ds-page-footer"), card("C-gggg", "Algo fora do padrão.", "ds-inexistente"),
    card("C-hhhh", "O botão Fechar é um div.", "govbr-3.7.0-component-message-cccccccccccc"),
    card("C-iiii", "O texto não usa a fonte Rawline e a página não segue o Template Base.", null)];
  const run = (id: string, p: string, ids: string[]) => ({ id, kind: "agente", tool: null, config: { oracleProfile: p }, cardIds: ids });
  gravarJson(dir, "revisao/package.json", { units: [{ id: "U-1", specId: "A-01" }], cards,
    runs: [run("20990101-000000-x-sem-0001", "none", ["C-aaaa", "C-dddd"]), run("20990101-000000-x-ferramentas-0002", "knowledge-free", ["C-bbbb"]),
      run("20990101-000000-x-com-0003", "evaluation", ["C-cccc", "C-eeee", "C-ffff", "C-gggg", "C-hhhh", "C-iiii"])] });
  gravarJson(dir, "revisao/capture.json", { url: "/x.html" });
  const oraculo = (perfil: string) => ({ version: "9.9.9", distSha256: "d".repeat(64), dataSha256: dataSha, profile: perfil });
  gravarJson(dir, "entradas/campanha.json", { campaignId: "camp-sintetica-01", design: { screens: [{ id: "x", label: "X" }], arms: ["sem", "ferramentas", "com"],
      comparisons: [{ id: "ferramentas-x-com", arms: ["ferramentas", "com"], role: "primary" }, { id: "sem-x-com", arms: ["sem", "com"], role: "secondary" }] },
    fixed: { oracleProfiles: { com: oraculo("evaluation"), ferramentas: oraculo("knowledge-free") } } });
  gravarJson(dir, "entradas/referencia.json", { _meta: { version: "1.0.0", waitFor: "#nome", setup: [{ action: "click", selector: ".enviar" }, { action: "wait", selector: ".msg" }] },
    violations: [{ id: "A-01", state: "inicial", rules: ["wcag:1.3.1", "govbr-3.7.0-accessibility-global-bbbbbbbbbbbb"], description: "Campo sem rótulo." }] });
  gravarJson(dir, "summary.json", { execucoes: [{ identidade: { tela: { id: "x", label: "X" } } }] });

  t("data/ do validador diferente da do oráculo da campanha: para (H)", () => {
    const outro = join(tmp, "validador-outro");
    gravarJson(join(outro, "data"), "knowledge/manifest.json", { activeVersion: "3.7.0-literal-teste" });
    assert.throws(() => prepararCampanha([dir], { validador: outro }), /não é a do oráculo da campanha/);
  });
  // Passada 1.2.0 (histórico, D-156: `--politica 1.2.0`); a 1.3.0 tem bloco próprio no fim.
  const p = prepararCampanha([dir], { validador: valDir, checkerAliases: aliasesAbs, politica: "1.2.0" });
  const loteTxt = p.arquivosDoJuiz.get("lotes/lote-01.json")!;
  const lote = JSON.parse(loteTxt) as { respostaEm: string; cartoes: CartaoCego[];
    referencias: Record<string, { endereco: string; defeitos: { normas: { fonte: string; regrasDaBase?: { texto: string }[] }[] }[] }> };
  const chave = JSON.parse(p.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; braco: string; cardIdOriginal: string }[] };
  const cartao = (orig: string) => lote.cartoes.find(c => c.id === chave.itens.find(i => i.cardIdOriginal === orig)!.id)!;

  t("cegueira OK: nenhuma falha, nada separa com de ferramentas, braço e run fora dos lotes", () => {
    assert.deepEqual(p.cegueira.falhas, []); assert.deepEqual(p.falhasTrio, []);
    for (const x of ["ferramentas-0002", "evaluation", "knowledge-free", "camp-sintetica", "scan_page", "govbr-3"]) assert.ok(!loteTxt.includes(x), x);
  });
  t("chave liga id opaco a braço; MEDIDA é citável; endereço da tela no lote", () => {
    assert.deepEqual([...new Set(chave.itens.map(i => i.braco))].sort(), ["com", "ferramentas", "sem"]);
    assert.ok(lote.cartoes.every(c => c.citaveis.includes("MEDIDA"))); assert.equal(lote.referencias.x.endereco, "/x.html");
  });
  t("[B] id de achado FAM sai das evidências; axe no texto livre vira marcador, a norma axe:label fica; Template Base parafraseado; Rawline fica", () => {
    const b = cartao("C-bbbb");
    assert.deepEqual(b.alegacao.evidencias.map(e => e.ref), ["getComputedStyle(#nome).outline = none"]);
    assert.ok(!loteTxt.includes("FAM-26db"), "FAM no lote");
    assert.match(b.alegacao.observado!, /\[ferramenta citada\] aponta/); assert.ok(!/\baxe\b/.test(b.alegacao.observado!));
    assert.equal(b.normaCitada!.id, "axe:label"); assert.equal(b.alegacao.regra, "label");
    const i = cartao("C-iiii").alegacao.observado!;
    assert.ok(i.includes("Rawline") && i.includes("modelo de página do DS") && !i.includes("[termo citado]"), i);
  });
  t("[B] resíduo de braço contado por braço, categoria e comparação; emag-N.N não conta como regra do axe; falhas de máscara 0", () => {
    const r = JSON.parse(p.arquivosInternos.get("residuo-de-braco.json")!) as { formato: string; bracosDoDesenho: string[];
      porBraco: Record<string, { cartoes: number; comSinal: number; porCategoria: Record<string, number> }>;
      porComparacao: { id: string; categoriasQueDiferem: Record<string, Record<string, number>> }[]; porCartao: { id: string; braco: string; categorias: string[] }[];
      retirados: { idsDeAchadoDasEvidencias: number } };
    assert.equal(r.formato, "nat78-residuo-de-braco-1.0.0"); assert.deepEqual(r.bracosDoDesenho, ["sem", "ferramentas", "com"]);
    assert.equal(r.porCartao.length, lote.cartoes.length); assert.equal(r.retirados.idsDeAchadoDasEvidencias, 1);
    const de = (orig: string) => r.porCartao.find(x => x.id === cartao(orig).id)!.categorias;
    assert.deepEqual(de("C-eeee"), [], "emag-2.2 é norma pública, não regra do axe");
    assert.deepEqual(de("C-bbbb"), ["regra-do-axe", "evidencia-relatada", "marcador-no-texto"]);
    assert.deepEqual(de("C-cccc"), ["regra-da-base-do-ds", "marcador-no-texto"], "o id no texto livre vira [regra citada]"); assert.deepEqual(de("C-iiii"), ["vocabulario-do-ds"]);
    assert.deepEqual(de("C-aaaa"), []);
    for (const b of Object.values(r.porBraco)) for (const c of ["termo-de-ferramenta", "id-de-achado", "separa-com-de-ferramentas"]) assert.equal(b.porCategoria[c], 0, c);
    assert.deepEqual(r.porBraco.ferramentas, { cartoes: 1, comSinal: 1, porCategoria: { ...r.porBraco.ferramentas.porCategoria } });
    assert.equal(r.porBraco.com.comSinal, 5, "C-cccc, C-ffff, C-gggg, C-hhhh (base do DS), C-iiii (Rawline); C-eeee não");
    const fc = r.porComparacao.find(x => x.id === "ferramentas-x-com")!;
    assert.deepEqual(fc.categoriasQueDiferem["regra-da-base-do-ds"], { ferramentas: 0, com: 4 });
    const m = JSON.parse(p.arquivosInternos.get("lotes/manifesto.json")!) as { residuoSha256: string };
    assert.equal(m.residuoSha256, sha(p.arquivosInternos.get("residuo-de-braco.json")!));
    assert.ok(![...p.arquivosDoJuiz.keys()].some(k => k.includes("residuo")), "resíduo nunca vai ao juiz");
  });
  t("[F] braços pelo desenho: ferramentas fora do desenho para; bracoDosCartoes do par sem/com igual ao de antes; padrões da NAT-73 iguais", () => {
    const r = (p: string | undefined) => ({ id: "r", kind: "agente", tool: null, config: p === undefined ? {} : { oracleProfile: p }, cardIds: ["C-1"] }) as never;
    assert.throws(() => bracoDoRun(r("knowledge-free"), ["sem", "com"]), /fora|desconhecido/);
    assert.equal(bracoDoRun(r("evaluation"), ["sem", "com"]), "com");
    const pk = (runs: unknown[]) => ({ runs }) as never;
    assert.equal(bracoDosCartoes(pk([r(undefined)])).get("C-1")!.braco, "com", "T7: perfil ausente = com");
    assert.equal(bracoDosCartoes(pk([r("evaluation")])).get("C-1")!.braco, "com");
    assert.equal(bracoDosCartoes(pk([r("knowledge-free")]), ["sem", "ferramentas", "com"]).get("C-1")!.braco, "ferramentas");
    assert.throws(() => bracoDosCartoes(pk([r(undefined)]), ["sem", "ferramentas", "com"]), /fora dos braços/);
    assert.throws(() => bracoDosCartoes(pk([r("knowledge-free")])), /fora dos braços/);
    assert.equal(PROIBIDOS[0][1].source, String.raw`\d{8}-\d{6}-[a-z]+-(?:com|sem)-[0-9a-f]{4}`);
    assert.equal(PROIBIDOS[1][1].source, String.raw`linha-de-base[:/](?:axe|validator)|oracleProfile|com-or[aá]culo|sem-or[aá]culo|"(?:com|sem)"`);
    const trio = proibidos(["sem", "ferramentas", "com"]);
    assert.ok(trio[0][1].test("20261019-082517-solicitacao-ferramentas-14c2") && !PROIBIDOS[0][1].test("20261019-082517-solicitacao-ferramentas-14c2"));
    assert.ok(trio[1][1].test('"braco": "ferramentas"'));
  });
  t("regra literal citada pelo com: texto da base que o oráculo da campanha carrega, id mascarado (H)", () => {
    const nv = cartao("C-cccc").normaCitada!;
    assert.equal(nv.id, "[regra citada]"); assert.match(nv.fonte, /3\.7\.0 \(texto literal/);
    assert.equal(nv.regrasDaBase?.[0].texto, "Campo de entrada deve ter rótulo visível."); assert.equal(nv.regrasDaBase?.[0].forcaDeclarada, "obrigatorio");
    assert.ok(!loteTxt.includes("0123456789ab"));
  });
  t("emag-N.N (forma do validador) resolve como emag:N.N; id de verificação → checker-aliases → texto da base da campanha; referência por id antigo", () => {
    assert.equal(cartao("C-eeee").normaCitada!.fonte, "e-MAG 3.1"); assert.equal(cartao("C-eeee").normaCitada!.titulo, "Garantir que os objetos programáveis sejam acessíveis");
    const f = cartao("C-ffff").normaCitada!; assert.match(f.fonte, /base de regras do DS 3\.7\.0/); assert.equal(f.texto, "Rodapé obrigatório");
    assert.deepEqual(f.regrasDaBase?.map(r => r.texto), ["Campo de entrada deve ter rótulo visível.", "Prefira npm."]);
    const g = cartao("C-gggg").normaCitada!; assert.match(g.fonte, /texto não localizado/); assert.equal(g.regrasDaBase, undefined);
    const ref = lote.referencias.x.defeitos[0].normas.find(x => x.regrasDaBase)!;
    assert.match(ref.fonte, /id antigo/); assert.equal(ref.regrasDaBase![0].texto, "Regra antiga de rótulo.");
  });
  t("fontes do manifesto: árvore data/ = dataSha256 da campanha + arquivo da base com sha256 (H)", () => {
    const m = JSON.parse(p.arquivosInternos.get("lotes/manifesto.json")!) as { formato: string; fontes: Record<string, string> };
    assert.equal(m.formato, FORMATO_MANIFESTO_CAMPANHA);
    assert.ok(Object.values(m.fontes).includes(dataSha));
    const k = Object.keys(m.fontes).find(x => x.endsWith(`${vNorm}/rules.jsonl`))!;
    assert.equal(m.fontes[k], sha(readFileSync(join(vData, vNorm, "rules.jsonl"))));
  });
  t("receita da linha de base legível no cartão (K3); respostaEm aponta para a pasta da passada (I); LEIAME K1/K2/K4", () => {
    assert.deepEqual(cartao("C-bbbb").alegacao.estado.passos, ["abrir o endereço da tela e esperar `#nome`", "clicar em `.enviar`", "esperar `.msg` aparecer"]);
    assert.equal(lote.respostaEm, "../respostas/lote-01.json");
    const l = p.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    for (const x of ["Não abra `lotes/manifesto.json`", "`norma.forca` = `indeterminado`", `"aplicabilidade": "${NAO_PERGUNTADO}"`, "nunca dentro dela", FORMATO_RESPOSTAS_CAMPANHA]) assert.ok(l.includes(x), x);
    assert.ok(!l.includes(FORMATO_RESPOSTAS), "formato histórico no LEIAME da campanha");
  });

  // Respostas sintéticas: cartão sem regra → norma neutra (K1); os demais → indeterminado.
  const respostas = (neutra: { aplicabilidade: string; violada: string } = { aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO }) => ({
    formato: FORMATO_RESPOSTAS_CAMPANHA, lote: "lote-01", loteSha256: sha(loteTxt), juiz: "teste sintético",
    respostas: lote.cartoes.map(c => ({ id: c.id, verdadeFactual: "indeterminado",
      norma: c.alegacao.regra === null ? { id: "nenhuma", forca: "nenhuma", ...neutra } : { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
      vinculo: "indeterminado", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético.",
      estadoAlcancado: "receita" })) });
  const fila = join(tmp, "fila");
  for (const [rel, x] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(fila, rel, x);

  t("norma neutra (K1): id nenhuma exige aplicabilidade/violada nao-perguntado; o neutro com outro id é recusado; Q1 deriva igual", () => {
    const c = cartao("C-dddd");
    const ctx = { tipo: "sensivel" as const, citaRegra: false, temEsperado: true, specsDaTela: ["A-01"], citaveis: c.citaveis, origemMedida: null, classeRegistrada: null };
    const r = { id: c.id, verdadeFactual: "verdadeira", norma: { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO },
      vinculo: { spec: "A-01", relacao: "direta" }, sugestao: NAO_PERGUNTADO, forcaDoVeredito: "medido", evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o campo sem rótulo da A-01." };
    assert.deepEqual(validarResposta(r, ctx, { normaNeutra: true }), []);
    const d = derivarClasse(r as Resposta, ctx); assert.equal(d.classe, "violacao-pagina"); assert.equal(d.regraDaPolitica, "Q1");
    assert.match(validarResposta({ ...r, norma: { ...r.norma, aplicabilidade: "aplica", violada: "sim" } }, ctx, { normaNeutra: true }).join(), /nao-perguntado/);
    assert.match(validarResposta({ ...r, norma: { id: "wcag:1.3.1", forca: "obrigatorio", aplicabilidade: NAO_PERGUNTADO, violada: "sim" } }, ctx, { normaNeutra: true }).join(), /aplicabilidade fora da lista/);
    assert.match(validarResposta(r, ctx).join(), /aplicabilidade fora da lista/, "histórico (sem a opção) não muda");
  });
  t("ingestão: respostas em lotes/respostas/ recusadas (I); neutro errado e formato histórico recusados; certo aceito e congelado", () => {
    gravarJson(fila, "lotes/respostas/lote-01.json", respostas());
    assert.match(ingerir(fila).erros.join(), /lotes\/respostas/);
    rmSync(join(fila, "lotes", "respostas"), { recursive: true });
    gravarJson(fila, "respostas/lote-01.json", respostas({ aplicabilidade: "incerta", violada: "incerto" }));
    assert.match(ingerir(fila).erros.join(), /nenhuma|norma must match "then" schema/, "neutro errado: recusado pelo esquema 1.2.0 (forca nenhuma ⇔ neutro) ou pela validação");
    gravarJson(fila, "respostas/lote-01.json", { ...respostas(), formato: FORMATO_RESPOSTAS });
    assert.match(ingerir(fila).erros.join(), /formato|esquema/);
    gravarJson(fila, "respostas/lote-01.json", respostas());
    const r = ingerir(fila);
    assert.deepEqual(r.erros, []); assert.equal((r.julgamentos as { completo: boolean }).completo, true);
  });
  const cli = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", join(EVAL, "scripts", "reanalise-nat74", "e14-ingerir.ts"), ...args], { cwd: EVAL, encoding: "utf8" });
  t("CLI --fila grava julgamentos.json + sha256 na pasta da passada (L); pasta sem manifesto recusada, sem cair na fila histórica (J)", () => {
    const vazia = join(tmp, "vazia");
    const x = cli("--fila", vazia);
    assert.equal(x.status, 1, x.stderr); assert.match(x.stderr, /não tem lotes\/manifesto\.json/); assert.ok(!existsSync(join(vazia, "julgamentos.json")));
    const y = cli("--fila", fila);
    assert.equal(y.status, 0, y.stderr);
    const txt = readFileSync(join(fila, "julgamentos.json"), "utf8");
    assert.equal(readFileSync(join(fila, "julgamentos.json.sha256"), "utf8"), `${sha(txt)}  julgamentos.json\n`);
    assert.equal(cli(fila).status, 1, "pasta sem --fila é recusada");
  });

  console.log("E14 campanha 1.2.0: forças da base no vocabulário (M) e estado alcançado (N)");
  t("força da base literal já no vocabulário em cada regra da base; o texto literal fica (M)", () => {
    const h = cartao("C-hhhh").normaCitada!.regrasDaBase![0];
    assert.equal(h.forcaDeclarada, "permitido (opcional)"); assert.equal(h.forcaNoVocabulario, "nenhuma");
    assert.equal(cartao("C-cccc").normaCitada!.regrasDaBase![0].forcaNoVocabulario, "obrigatorio");
    assert.deepEqual(cartao("C-ffff").normaCitada!.regrasDaBase!.map(r => r.forcaNoVocabulario), ["obrigatorio", "recomendado"]);
    const l = p.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    for (const x of ["| permitido (opcional) | `nenhuma` |", "| obrigatorio (proibição) | `obrigatorio` |", "| recomendado (desaconselha) | `recomendado` |",
      "| informativo | `null` (sem correspondência) |", "| não declarada | `null` (sem correspondência) |", "`estadoAlcancado`", "\"estadoAlcancado\": \"receita\"", "erro normativo (R11a)"])
      assert.ok(l.includes(x), x);
    for (const x of ["passosUsados", "passos-proprios"]) assert.ok(!l.includes(x), x);
  });
  t("tabela fixa: força desconhecida na base para (nunca cai calada em sem correspondência)", () => {
    assert.deepEqual(Object.keys(FORCA_NO_VOCABULARIO).sort(), ["discouraged", "example", "informative", "optional", "permitted", "prohibited", "recommended", "required", "unclear"]);
    const v2 = join(tmp, "validador-forca"), d2 = join(v2, "data");
    gravarJson(d2, "knowledge/manifest.json", { activeVersion: "3.7.0-literal-teste" });
    gravar(d2, `${vNorm}/rules.jsonl`, JSON.stringify(regra("govbr-3.7.0-x-dddddddddddd", "X", "weird")) + "\n");
    gravarJson(d2, "wcag-2.2.json", { criteria: [] }); gravarJson(d2, "emag.json", { sections: {} });
    assert.throws(() => normasDaCampanha({ dataSha256: sha256Tree(d2)!.sha256, validador: v2, checkerAliases: aliasesAbs }), /fora da tabela/);
  });
  const ctxDe = (orig: string) => contextoDe(cartao(orig), chave.itens.find(i => i.cardIdOriginal === orig)! as never, ["A-01"]);
  const resp = (orig: string, extra: Record<string, unknown> = {}) => ({ id: cartao(orig).id, verdadeFactual: "verdadeira",
    norma: { id: "citada", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO }, vinculo: { spec: "A-01", relacao: "direta" },
    sugestao: NAO_PERGUNTADO, forcaDoVeredito: "medido", evidencias: ["MEDIDA", "NORMA"], justificativa: "MEDIDA mostra o div; a NORMA só permite.",
    estadoAlcancado: "receita", ...extra });
  const v12 = { normaNeutra: true, v12: true };
  const valida = { trataOFato: "sim", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "valida" };
  const invalida = { trataOFato: "nao", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "invalida" };
  t("regra citada que a base só permite, alegada como violada: erro normativo (R11a); com sugestão válida, observação com norma errada (R11d)", () => {
    const c = ctxDe("C-hhhh");
    assert.deepEqual(c.forcasDaCitada, ["nenhuma"]);
    assert.match(validarResposta(resp("C-hhhh"), c, v12).join(), /erro normativo: responda sugestao/, "sugestão passa a ser obrigatória");
    const ri = resp("C-hhhh", { sugestao: invalida }), rv = resp("C-hhhh", { sugestao: valida });
    assert.deepEqual(validarResposta(ri, c, v12), []); assert.deepEqual(validarResposta(rv, c, v12), []);
    const di = derivarClasse(ri as Resposta, c), dv = derivarClasse(rv as Resposta, c);
    assert.deepEqual([di.classe, di.regraDaPolitica, di.spec, di.fundamentacao], ["erro-normativo", "R11", null, null]);
    assert.deepEqual([dv.classe, dv.regraDaPolitica, dv.spec, dv.fundamentacao], ["observacao-norma-errada", "R11d", null, null]);
    assert.equal(derivarClasse(rv as Resposta, { ...c, forcasDaCitada: undefined }).classe, "observacao", "sem forcasDaCitada (histórico/1.1.0) a derivação não muda");
    assert.match(validarResposta(resp("C-hhhh", { sugestao: valida, norma: { id: "citada", forca: "nenhuma", aplicabilidade: "aplica", violada: "sim" } }), c, v12).join(), /nao-perguntado/);
    assert.match(validarResposta(resp("C-cccc"), ctxDe("C-cccc"), v12).join(), /forcaNoVocabulario/, "regra obrigatória não aceita nenhuma");
    assert.match(validarResposta(resp("C-ffff"), ctxDe("C-ffff"), v12).join(), /forcaNoVocabulario/, "forças mistas não aceitam nenhuma");
    const { estadoAlcancado: _e, ...r11 } = resp("C-hhhh");
    assert.match(validarResposta(r11, ctxDe("C-hhhh"), { normaNeutra: true }).join(), /só vale para cartão sem regra/, "1.1.0 não muda");
  });
  t("estadoAlcancado fechado (receita | nao-alcancado): sem passos próprios; nao-alcancado exige fato indisponivel (R9/R10)", () => {
    const c = ctxDe("C-cccc"), ok = { norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" } };
    assert.deepEqual(validarResposta(resp("C-cccc", ok), c, v12), []);
    assert.match(validarResposta(resp("C-cccc", { ...ok, estadoAlcancado: undefined }), c, v12).join(), /estadoAlcancado fora da lista/);
    const { estadoAlcancado: _x, ...sem } = resp("C-cccc", ok); assert.match(validarResposta(sem, c, v12).join(), /campo ausente: estadoAlcancado/);
    assert.match(validarResposta(resp("C-cccc", { ...ok, estadoAlcancado: "passos-proprios" }), c, v12).join(), /estadoAlcancado fora da lista/);
    assert.match(validarResposta(resp("C-cccc", { ...ok, passosUsados: ["clicar em #nome"] }), c, v12).join(), /campo desconhecido: passosUsados/);
    assert.match(validarResposta(resp("C-cccc", { ...ok, estadoAlcancado: "nao-alcancado" }), c, v12).join(), /indisponivel/);
    const r = resp("C-cccc", { ...ok, estadoAlcancado: "nao-alcancado", verdadeFactual: "indisponivel" });
    assert.deepEqual(validarResposta(r, c, v12), []); assert.equal(derivarClasse(r as Resposta, c).classe, "evidencia-indisponivel");
    assert.match(validarResposta(resp("C-cccc", ok), c, { normaNeutra: true }).join(), /campo desconhecido: estadoAlcancado/, "1.1.0 não conhece o campo");
  });
  t("ingestão 1.2.0 conta estadoAlcancado (nao-alcancado → evidência indisponível); manifesto 1.1.0 segue o esquema 1.1.0", () => {
    const f2 = join(tmp, "fila-12"); cpSync(fila, f2, { recursive: true }); rmSync(join(f2, "julgamentos.json"));
    const base = respostas();
    base.respostas[0] = { ...base.respostas[0], estadoAlcancado: "nao-alcancado", verdadeFactual: "indisponivel" } as never;
    gravarJson(f2, "respostas/lote-01.json", base);
    const r = ingerir(f2); assert.deepEqual(r.erros, []);
    const j = r.julgamentos as { porEstadoAlcancado: Record<string, number>; porClasse: Record<string, number> };
    assert.deepEqual(j.porEstadoAlcancado, { "nao-alcancado": 1, receita: lote.cartoes.length - 1 });
    assert.equal(j.porClasse["evidencia-indisponivel"], 1);
    const f3 = join(tmp, "fila-11"); cpSync(fila, f3, { recursive: true }); rmSync(join(f3, "julgamentos.json"));
    const mAbs = join(f3, "lotes", "manifesto.json");
    gravar(f3, "lotes/manifesto.json", readFileSync(mAbs, "utf8").replace(FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_1));
    const velho = respostas(); velho.formato = FORMATO_RESPOSTAS_CAMPANHA_1_1; velho.respostas = velho.respostas.map(({ estadoAlcancado: _e, ...x }) => x) as never;
    gravarJson(f3, "respostas/lote-01.json", velho);
    const r3 = ingerir(f3); assert.deepEqual(r3.erros, []); assert.equal((r3.julgamentos as { porEstadoAlcancado?: unknown }).porEstadoAlcancado, undefined);
  });
  await testesReferencias({ t, tmp, dir, valDir, aliasesAbs, prepararCampanha, cli });
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da E14 campanha passaram`);
if (falhas) process.exitCode = 1;
