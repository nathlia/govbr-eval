/**
 * Testes da primeira passada cega para campanha nova (e14-campanha.ts, NAT-78 §8.1). Sem modelo, sem rede: uma análise
 * sintética de trio (sem/ferramentas/com + linha de base) numa pasta temporária, um validador sintético (só data/) e
 * respostas SINTÉTICAS (`indeterminado`).
 *   npx tsx scripts/reanalise-nat74/test-e14-campanha.ts
 */
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sha256Tree } from "../collection-manifest";
import { EVAL, bracoDosCartoes, gravar, gravarJson, jsonTexto, sha } from "./comum";
import { PROIBIDOS, proibidos } from "./e14-cegueira";
import {
  FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_1, FORMATO_RESPOSTAS, FORMATO_RESPOSTAS_CAMPANHA, FORMATO_RESPOSTAS_CAMPANHA_1_1, NAO_PERGUNTADO,
  ESQUEMA_RESPOSTAS_CAMPANHA, ESQUEMA_RESPOSTAS_CAMPANHA_1_3, ESQUEMA_RESPOSTAS_CAMPANHA_1_3_1, FORMATO_MANIFESTO_CAMPANHA_1_3, FORMATO_MANIFESTO_CAMPANHA_1_3_1,
  FORMATO_RESPOSTAS_CAMPANHA_1_3, FORMATO_RESPOSTAS_CAMPANHA_1_3_1, MOTIVO_SEM_VINCULO, derivarClasse, validarResposta,
  type CartaoCego, type Resposta,
} from "./e14-comum";
import {
  BASE_URL_PADRAO, LEIAME_ARIA_ESTADO, LEIAME_ARVORE_PAPEIS, LEIAME_CABECALHO_VAZIO, LEIAME_EMAG, LEIAME_IDENTIDADE_REGISTRO, LEIAME_MOTIVO_SEM_VINCULO, LEIAME_PARADAS, baseUrlValida, bracoDoRun, dominioDoDefeito, enderecoDaTela, leiameCampanha,
  leiameCampanha13, mascararTrio, paradasDaReferencia, passosLegiveis, prepararCampanha, registroDaRota,
} from "./e14-campanha";
import { FORCAS_SO_COM_A_BASE, FORCA_NO_VOCABULARIO, normasDaCampanha } from "./e14-fila";
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
  t("trios com a mesma pasta de análise (p01/analisar-X, p02/analisar-X): ids distintos, rótulo com o trio; mesma análise duas vezes para", () => {
    const d1 = join(tmp, "multi", "p01", "analisar-X"), d2 = join(tmp, "multi", "p02", "analisar-X");
    cpSync(dir, d1, { recursive: true }); cpSync(dir, d2, { recursive: true });
    const pm = prepararCampanha([d1, d2], { validador: valDir, checkerAliases: aliasesAbs });
    const ch = JSON.parse(pm.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; par: string }[] };
    assert.equal(ch.itens.length, 2 * cards.length);
    assert.equal(new Set(ch.itens.map(i => i.id)).size, ch.itens.length);
    assert.deepEqual([...new Set(ch.itens.map(i => i.par))].sort(), ["p01/analisar-X", "p02/analisar-X"]);
    assert.throws(() => prepararCampanha([d1, d1], { validador: valDir, checkerAliases: aliasesAbs }), /mesmo rótulo/);
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
  t("[B] ids de sessão de ferramenta no texto livre viram marcador (dev-362-b-01: 'F-081..F-090', 'V-001 unverifiable', 'S-page-001')", () => {
    const m = mascararTrio("O mesmo ocorre na aba Concluídos (F-081..F-090); o termo não tem predicado (V-001 unverifiable); ver S-page-001.")!;
    assert.ok(!/\bS-[a-z]+-\d+\b|\b[FV]-\d{1,4}\b/.test(m), m);
    assert.equal((m.match(/\[ferramenta citada\]/g) ?? []).length, 4, m);
    assert.equal(mascararTrio("Campo CPF-1 e F1 ficam; WCAG 2.4.3 fica."), "Campo CPF-1 e F1 ficam; WCAG 2.4.3 fica.");
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
    assert.deepEqual(Object.keys(FORCA_NO_VOCABULARIO).sort(), ["discouraged", "especificacao", "example", "informative", "optional", "permitted", "prohibited", "recommended", "required", "unclear"]);
    assert.equal(FORCA_NO_VOCABULARIO.especificacao, null, "[1.4.5, D-167] especificação: sem correspondência, como informative");
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
  // ── passada 1.4.2 (lista única 3.7.2, C1–C2; juiz da A2 de 04/11): LEIAME, --base-url, esquema derivado das referências
  console.log("E14 campanha 1.4.2: registro × template, cabeçalho vazio, --base-url, esquema pelas referências");
  /** sha256 do LEIAME 1.3.0 da 1.4.1 (leiameCampanha13(10, 2, "Tela X") no commit 3750faa), antes da 1.4.2. */
  const LEIAME13_1_4_1 = "84a05a9b69f3380a5726480df33dfd91489eb5c3d65eb46973d611fae94c0069";
  /** sha256 do LEIAME 1.2.0 histórico com os mesmos argumentos (sem "receita vazia": as passadas 1.2.0 arquivadas). */
  const LEIAME12_HISTORICO = "15672b0c594955cce77a845243d8b1513a1b4e69cb9274be0baf8c5cad6cd74d";
  t("LEIAME 1.3.0 = o da 1.4.1 + registro × template, paradas (1.4.3) e motivo sem vínculo (1.4.4) no vinculo + cabeçalho vazio e ARIA × estado nativo (1.4.4) na norma + formato 1.3.1, e nada mais", () => {
    const l = leiameCampanha13(10, 2, "Tela X");
    for (const b of [LEIAME_IDENTIDADE_REGISTRO, LEIAME_PARADAS, LEIAME_CABECALHO_VAZIO, LEIAME_ARIA_ESTADO, LEIAME_MOTIVO_SEM_VINCULO]) assert.equal(l.split(b + "\n").length - 1, 1, b.slice(0, 40));
    assert.ok(l.indexOf(LEIAME_IDENTIDADE_REGISTRO) > l.indexOf("### `vinculo`") && l.indexOf(LEIAME_IDENTIDADE_REGISTRO) < l.indexOf("### `sugestao`"), "na seção vinculo");
    assert.ok(l.includes(LEIAME_IDENTIDADE_REGISTRO + "\n" + LEIAME_PARADAS + "\n"), "paradas logo depois da regra registro × template");
    assert.ok(l.indexOf(LEIAME_CABECALHO_VAZIO) > l.indexOf("### `norma`") && l.indexOf(LEIAME_CABECALHO_VAZIO) < l.indexOf("### `vinculo`"), "na seção norma");
    const sem = [LEIAME_IDENTIDADE_REGISTRO, LEIAME_PARADAS, LEIAME_CABECALHO_VAZIO, LEIAME_ARIA_ESTADO, LEIAME_MOTIVO_SEM_VINCULO].reduce((x, b) => x.replace(b + "\n", ""), l);
    assert.equal(l.split(FORMATO_RESPOSTAS_CAMPANHA_1_3_1).length - 1, 1, "o formato 1.3.1 no exemplo, uma vez");
    assert.equal(sha(sem.replace(FORMATO_RESPOSTAS_CAMPANHA_1_3_1, FORMATO_RESPOSTAS_CAMPANHA_1_3)), LEIAME13_1_4_1);
    for (const x of ["`paradas`", "`registro`", "`dominio`", "{ regra, registros }", "nunca o deduza", "só o registro listado na sua parada"]) assert.ok(LEIAME_PARADAS.includes(x), x);
    // Neutro: nenhum padrão da verificação de cegueira, nenhuma spec citada, "origem do cartão" e nunca a palavra do desenho.
    for (const b of [LEIAME_IDENTIDADE_REGISTRO, LEIAME_PARADAS, LEIAME_CABECALHO_VAZIO, LEIAME_ARIA_ESTADO, LEIAME_MOTIVO_SEM_VINCULO]) {
      for (const [nome, re] of proibidos(["sem", "ferramentas", "com"])) assert.ok(!re.test(b), `${nome} no bloco novo`);
      assert.ok(!/\b[ABPU]-\d{2}\b/.test(b), "o bloco novo não cita spec");
    }
    assert.ok(LEIAME_IDENTIDADE_REGISTRO.includes("qualquer que seja a origem do cartão"));
    for (const x of ["1. O vínculo a um defeito exige", "2. Outro registro só representa", "3. Reaproveitar o template", "4. Receita que chega a uma rota",
      "5. Sem identidade provada", "6. O critério é o mesmo", "casca da aplicação"]) assert.ok(LEIAME_IDENTIDADE_REGISTRO.includes(x), x);
    for (const x of ["WCAG 1.3.1", "`aplica` e violada `sim`", "`best-practice`", "`nao-aplica`", "`boa-pratica`"]) assert.ok(LEIAME_CABECALHO_VAZIO.includes(x), x);
  });
  t("LEIAME 1.2.0 é o histórico byte a byte (a 1.4.1 tinha posto \"receita vazia\" nele; corrigido); passadas 1.2.0 arquivadas refeitas iguais", () => {
    const l = leiameCampanha(10, 2, "Tela X");
    assert.equal(sha(l), LEIAME12_HISTORICO);
    for (const x of ["**Receita vazia**", LEIAME_IDENTIDADE_REGISTRO, LEIAME_CABECALHO_VAZIO, LEIAME_ARIA_ESTADO, LEIAME_MOTIVO_SEM_VINCULO, "motivoSemVinculo", "aria-checked",
      FORMATO_RESPOSTAS_CAMPANHA_1_3_1]) assert.ok(!l.includes(x), x.slice(0, 30));
    assert.ok(leiameCampanha13(10, 2, "Tela X").includes("**Receita vazia**"), "a 1.3.0 continua com a receita vazia");
    // Arquivo real (govbr-resultados), quando presente: a passada 1.2.0 do ensaio-trio-real-05 (gerador 1.3.x) sai igual.
    const arq = join(EVAL, "..", "govbr-resultados", "analises", "ensaio-trio-real-05", "p01", "primeira-passada-20261029T1", "lotes", "LEIAME-juiz.md");
    if (existsSync(arq)) {
      const a = readFileSync(arq, "utf8"), m = /fila de (\d+) alegações, dividida em (\d+) lotes?\.[^]*?congelada \(([^)]*)\)\. Você/.exec(a)!;
      assert.equal(leiameCampanha(Number(m[1]), Number(m[2]), m[3]), a, "LEIAME 1.2.0 arquivado");
      console.log("     (conferido contra o LEIAME 1.2.0 arquivado de ensaio-trio-real-05)");
    }
  });
  t("--base-url: padrão = texto de sempre; outra origem troca só o endereço; caminho, consulta ou esquema estranho param; 1.2.0 recusa", () => {
    const pad = leiameCampanha13(10, 2, "Tela X");
    assert.equal(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO), pad);
    const outra = leiameCampanha13(10, 2, "Tela X", "http://127.0.0.1:3317/");
    assert.ok(outra.includes("`http://127.0.0.1:3317`") && !outra.includes(BASE_URL_PADRAO));
    assert.equal(outra.replace("http://127.0.0.1:3317", BASE_URL_PADRAO), pad, "só o endereço muda");
    for (const x of ["127.0.0.1:3300", "ftp://127.0.0.1:3300", "http://127.0.0.1:3300/site", "http://127.0.0.1:3300/?a=1", "http://u:p@127.0.0.1:3300"]) assert.throws(() => baseUrlValida(x), /base-url/, x);
    assert.throws(() => prepararCampanha([dir], { validador: valDir, checkerAliases: aliasesAbs, politica: "1.2.0", baseUrl: "http://127.0.0.1:3317" }), /só na política 1\.3\.0/);
  });

  // Tela com ids de outro prefixo (A2: U-01…): a mesma análise sintética, com a referência renumerada.
  const dirU = join(tmp, "trio-u");
  cpSync(dir, dirU, { recursive: true });
  gravarJson(dirU, "revisao/package.json", { ...JSON.parse(readFileSync(join(dir, "revisao", "package.json"), "utf8")), units: [{ id: "U-1", specId: "U-01" }] });
  gravarJson(dirU, "entradas/referencia.json", { _meta: { version: "1.0.0", waitFor: "#nome", setup: [{ action: "click", selector: ".enviar" }, { action: "wait", selector: ".msg" }] },
    violations: [{ id: "U-01", state: "inicial", rules: ["wcag:1.3.1"], description: "Campo sem rótulo." }, { id: "U-02", state: "inicial", rules: ["wcag:1.3.1"], description: "Outro campo sem rótulo." }] });
  const opts13 = { validador: valDir, checkerAliases: aliasesAbs };
  const pU = prepararCampanha([dirU], opts13), pA = prepararCampanha([dir], opts13);
  t("esquema 1.3.0: vinculo.spec = enum dos ids das referências do lote (U-xx aceito); 1.2.0 publica o esquema histórico byte a byte", () => {
    const spec = (p: typeof pU) => (JSON.parse(p.arquivosDoJuiz.get("lotes/esquema-respostas.schema.json")!) as { properties: { respostas: { items: { properties: { vinculo: { oneOf: [unknown, { properties: { spec: unknown } }] } } } } } })
      .properties.respostas.items.properties.vinculo.oneOf[1].properties.spec;
    assert.deepEqual(spec(pU), { enum: ["U-01", "U-02"] });
    assert.deepEqual(spec(pA), { enum: ["A-01"] });
    const loteU = JSON.parse(pU.arquivosDoJuiz.get("lotes/lote-01.json")!) as { referencias: Record<string, { defeitos: { id: string }[] }> };
    assert.deepEqual(Object.values(loteU.referencias).flatMap(r => r.defeitos.map(d => d.id)).sort(), ["U-01", "U-02"], "o mesmo conjunto que o lote publica");
    assert.equal(p.arquivosDoJuiz.get("lotes/esquema-respostas.schema.json"), jsonTexto(ESQUEMA_RESPOSTAS_CAMPANHA), "1.2.0: esquema constante");
    assert.equal((ESQUEMA_RESPOSTAS_CAMPANHA_1_3 as unknown as { properties: { respostas: { items: { properties: { vinculo: { oneOf: [unknown, { properties: { spec: { pattern: string } } }] } } } } } })
      .properties.respostas.items.properties.vinculo.oneOf[1].properties.spec.pattern, "^[ABP]-\\d{2}$", "a constante não muda (passadas antigas)");
    assert.deepEqual(pU.cegueira.falhas, []); assert.deepEqual(pU.falhasTrio, []);
  });
  t("ingestão 1.3.0 pela mesma lista: vinculo U-01 entra e credita U-01; id fora das referências recusado pelo esquema (A-01, U-03)", () => {
    const filaU = join(tmp, "fila-u");
    for (const [rel, x] of [...pU.arquivosDoJuiz, ...pU.arquivosInternos]) gravar(filaU, rel, x);
    const loteTxt = pU.arquivosDoJuiz.get("lotes/lote-01.json")!, l = JSON.parse(loteTxt) as { cartoes: CartaoCego[] };
    const chU = JSON.parse(pU.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; cardIdOriginal: string }[] };
    const alvo = chU.itens.find(i => i.cardIdOriginal === "C-aaaa")!.id;
    const resposta = (spec: string) => l.cartoes.map(c => c.id === alvo
      ? { id: c.id, verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, vinculo: { spec, relacao: "direta" },
        sugestao: c.perguntas.includes("sugestao") ? { trataOFato: "sim", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "valida" } : NAO_PERGUNTADO,
        forcaDoVeredito: "medido", evidencias: ["MEDIDA", "OBS"], justificativa: "MEDIDA mostra o campo sem rótulo que o OBS descreve.", estadoAlcancado: "receita" }
      : { id: c.id, verdadeFactual: "indeterminado",
        norma: c.alegacao.regra === null ? { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } : { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
        vinculo: "indeterminado", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético.", estadoAlcancado: "receita" });
    const grava = (spec: string) => gravarJson(filaU, "respostas/lote-01.json", { formato: FORMATO_RESPOSTAS_CAMPANHA_1_3_1, lote: "lote-01", loteSha256: sha(loteTxt), juiz: "teste sintético", respostas: resposta(spec) });
    grava("U-01");
    const r = ingerir(filaU); assert.deepEqual(r.erros, []);
    const j = (r.julgamentos as { julgamentos: { id: string; derivado: { spec: string | null } }[] }).julgamentos.find(x => x.id === alvo)!;
    assert.equal(j.derivado.spec, "U-01");
    for (const fora of ["A-01", "U-03"]) {
      grava(fora);
      assert.match(ingerir(filaU, { refazer: true }).erros.join(), /esquema \/respostas\/\d+\/vinculo/, fora);
    }
  });
  t("bytes do lote: o lote traz o sha256 do LEIAME e do esquema — mudar só um deles muda o lote (loteSha256 antigo deixa de valer); cartões iguais", () => {
    const pB = prepararCampanha([dir], { ...opts13, baseUrl: "http://127.0.0.1:3317" });
    const la = JSON.parse(pA.arquivosDoJuiz.get("lotes/lote-01.json")!) as Record<string, unknown> & { instrucoes: { sha256: string }; esquema: { sha256: string } };
    const lb = JSON.parse(pB.arquivosDoJuiz.get("lotes/lote-01.json")!) as typeof la;
    assert.notEqual(pA.arquivosDoJuiz.get("lotes/lote-01.json"), pB.arquivosDoJuiz.get("lotes/lote-01.json"));
    assert.notEqual(la.instrucoes.sha256, lb.instrucoes.sha256);
    assert.deepEqual({ ...la, instrucoes: null }, { ...lb, instrucoes: null }, "fora do sha256 do LEIAME, o lote é o mesmo");
    assert.equal(la.esquema.sha256, sha(pA.arquivosDoJuiz.get("lotes/esquema-respostas.schema.json")!));
    assert.equal(la.instrucoes.sha256, sha(pA.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!));
  });
  // ── passada 1.4.3 (passada cega dev-372-b-01): paradas da referência, registro de cada defeito, dominio opcional
  console.log("E14 campanha 1.4.3: paradas da referência (rota + registro), registro do defeito, dominio declarado");
  // [D-168] A referência real a partir da 1.1.0 declara `dominio` em B-20…B-24 e B-27: estes testes usam a forma sem o campo
  // (a 1.0.0, salvo version/historico) e o teste "referência 1.1.0 real" abaixo confere o campo declarado.
  const refReal = JSON.parse(readFileSync(join(EVAL, "ground-truth-vistorias.json"), "utf8")) as {
    _meta: Parameters<typeof paradasDaReferencia>[0] & { url: string; states: { id: string; afterStep: number; path: string; note: string }[] };
    violations: { id: string; state: string; dominio?: unknown }[] };
  const refV: typeof refReal = { ...refReal, violations: refReal.violations.map(({ dominio: _d, ...v }) => v) };
  const UUID_3046 = "00000000-0000-4000-8a01-000000003046", UUID_3038 = "00000000-0000-4000-8a01-000000003038";
  t("registroDaRota: UUID, número ou código no fim do caminho; rota de lista, arquivo ou nome comum → null; consulta não conta", () => {
    assert.equal(registroDaRota(`/pnip/portal-mpa/vistorias/agendar-vistoria/${UUID_3038}`), UUID_3038);
    assert.equal(registroDaRota("/processos/123"), "123");
    assert.equal(registroDaRota("/processos/42/?aba=docs#x"), "42");
    assert.equal(registroDaRota("/vistorias/VST-3038"), "VST-3038");
    for (const x of ["/pnip/portal-mpa/vistorias", "/solicitacao.html", "/pnip-c/portal-admin/empresas/cadastrar-empresa", "/tela-a2", "/", "", null, undefined])
      assert.equal(registroDaRota(x), null, String(x));
  });
  t("paradas da referência real (ground-truth-vistorias.json): rota e registro de cada parada, receita = passos da referência até ela, nota", () => {
    const pr = paradasDaReferencia(refV._meta)!;
    assert.deepEqual(Object.keys(pr), refV._meta.states.map(s => s.id));
    assert.deepEqual(Object.keys(pr), ["inicial", "detalhe-menu", "detalhe", "modal"]);
    assert.deepEqual(Object.values(pr).map(p => p.registro), [null, UUID_3046, UUID_3038, UUID_3038]);
    for (const s of refV._meta.states) {
      assert.equal(pr[s.id].path, s.path);
      assert.deepEqual(pr[s.id].receita, passosLegiveis([`setup do plano de estados (${s.afterStep} passo(s))`], refV._meta), s.id);
      assert.equal(pr[s.id].nota, s.note, "nota da referência sem mudança (nada a mascarar nela)");
    }
    assert.equal(pr.inicial.receita!.length, 1); assert.match(pr.inicial.receita![0], /^abrir o endereço da tela e esperar/);
    assert.ok(pr.detalhe.receita!.some(x => x.includes(UUID_3038)) && !pr["detalhe-menu"].receita!.some(x => x.includes(UUID_3038)));
    assert.equal(paradasDaReferencia({ version: "1" }), null, "referência sem states: sem bloco");
    assert.deepEqual(paradasDaReferencia({ version: "1", states: [{ id: "inicial" }] } as never), { inicial: { path: null, registro: null } }, "sem path nem afterStep nem nota");
    assert.throws(() => paradasDaReferencia({ version: "1", states: [{ id: "a" }, { id: "a" }] } as never), /repetido/);
  });
  // A análise sintética com a referência real da tela B (os cartões e o validador sintéticos de sempre).
  const dirV = join(tmp, "trio-vistorias");
  cpSync(dir, dirV, { recursive: true });
  gravarJson(dirV, "revisao/package.json", { ...JSON.parse(readFileSync(join(dir, "revisao", "package.json"), "utf8")), units: [{ id: "U-1", specId: "B-21" }] });
  gravarJson(dirV, "revisao/capture.json", { url: "/pnip/portal-mpa/vistorias" });
  gravarJson(dirV, "summary.json", { execucoes: [{ identidade: { tela: { id: "vistorias", label: "Vistorias" } } }] });
  gravarJson(dirV, "entradas/referencia.json", refV);
  type RefLote = { endereco: string; paradas?: Record<string, { path: string | null; registro: string | null }>; defeitos: ({ id: string; estado: string; registro?: string | null; dominio?: unknown } & Record<string, unknown>)[] };
  const refDoLote = (pp: ReturnType<typeof prepararCampanha>) => (JSON.parse(pp.arquivosDoJuiz.get("lotes/lote-01.json")!) as { referencias: Record<string, RefLote> }).referencias.vistorias;
  const pV = prepararCampanha([dirV], opts13), pV12 = prepararCampanha([dirV], { ...opts13, politica: "1.2.0" });
  t("lote 1.3.0 com a referência real: referencias.vistorias.paradas = paradasDaReferencia; cada defeito com estado + registro da sua parada (sempre → null)", () => {
    const r = refDoLote(pV);
    assert.deepEqual(Object.keys(r), ["nome", "versao", "endereco", "paradas", "defeitos"]);
    assert.equal(r.endereco, "/pnip/portal-mpa/vistorias?mock-perfil=mpa");
    assert.deepEqual(r.paradas, paradasDaReferencia(refV._meta));
    const de = (id: string) => r.defeitos.find(d => d.id === id)!;
    assert.deepEqual([de("B-21").estado, de("B-21").registro], ["detalhe", UUID_3038]);
    assert.deepEqual([de("B-24").estado, de("B-24").registro], ["modal", UUID_3038]);
    assert.deepEqual([de("B-15").estado, de("B-15").registro], ["detalhe-menu", UUID_3046]);
    assert.deepEqual([de("B-01").estado, de("B-01").registro], ["sempre", null]);
    assert.deepEqual([de("B-02").estado, de("B-02").registro], ["inicial", null]);
    for (const d of r.defeitos) {
      assert.deepEqual(Object.keys(d), ["id", "estado", "registro", "unidades", "descricao", "normas"], d.id);
      assert.equal(d.registro, d.estado === "sempre" ? null : r.paradas![d.estado].registro, d.id);
    }
  });
  t("cegueira com paradas e registros: OK (rota e registro são fatos da página, não sinal de braço); nenhum resíduo novo", () => {
    assert.deepEqual(pV.cegueira.falhas, []); assert.deepEqual(pV.falhasTrio, []);
    const res = (pp: typeof pV) => (JSON.parse(pp.arquivosInternos.get("residuo-de-braco.json")!) as { porBraco: unknown }).porBraco;
    assert.deepEqual(res(pV), res(pV12), "o resíduo é medido nos cartões, que não mudam");
    const lt = pV.arquivosDoJuiz.get("lotes/lote-01.json")!;
    for (const [nome, re] of proibidos(["sem", "ferramentas", "com"])) assert.ok(!re.test(JSON.stringify(refDoLote(pV).paradas)), `${nome} nas paradas`);
    assert.ok(lt.includes(UUID_3038));
    const l13 = JSON.parse(lt) as { cartoes: unknown[] }, l12 = JSON.parse(pV12.arquivosDoJuiz.get("lotes/lote-01.json")!) as { cartoes: unknown[] };
    assert.deepEqual(l13.cartoes, l12.cartoes, "cartões iguais aos da 1.2.0 (sem referências secundárias no pacote sintético)");
  });
  t("1.2.0 com a mesma referência: sem paradas nem registro (defeitos como sempre); _meta.states não muda um byte da 1.2.0", () => {
    const r = refDoLote(pV12);
    assert.deepEqual(Object.keys(r), ["nome", "versao", "endereco", "defeitos"]);
    for (const d of r.defeitos) assert.deepEqual(Object.keys(d), ["id", "estado", "unidades", "descricao", "normas"], d.id);
    const dirS = join(tmp, "sem-states", "trio-vistorias"); // mesmo nome de pasta: o rótulo entra no id opaco
    cpSync(dirV, dirS, { recursive: true });
    const semStates = { ...refV, _meta: { ...refV._meta, states: undefined }, violations: refV.violations.map(v => ({ ...v, dominio: { regra: "x", registros: ["1"] } })) };
    gravarJson(dirS, "entradas/referencia.json", semStates);
    const pS = prepararCampanha([dirS], { ...opts13, politica: "1.2.0" });
    for (const [rel, x] of pV12.arquivosDoJuiz) assert.equal(pS.arquivosDoJuiz.get(rel), x, rel);
  });
  t("[D-168] referência 1.1.0 real: o dominio de cada defeito que o declara chega ao lote sem mudança; cegueira OK", () => {
    const declarados = refReal.violations.filter(v => v.dominio !== undefined);
    if (!declarados.length) return; // referência ainda sem domínio (1.0.0)
    const dirReal = join(tmp, "trio-vistorias-1.1.0");
    cpSync(dirV, dirReal, { recursive: true });
    gravar(dirReal, "entradas/referencia.json", readFileSync(join(EVAL, "ground-truth-vistorias.json"), "utf8"));
    const pR = prepararCampanha([dirReal], opts13), r = refDoLote(pR);
    for (const v of refReal.violations) assert.deepEqual(r.defeitos.find(d => d.id === v.id)!.dominio, v.dominio, v.id);
    assert.deepEqual(pR.cegueira.falhas, []); assert.deepEqual(pR.falhasTrio, []);
  });
  // Referência com `dominio` declarado num defeito (a forma de uma futura referência 1.1.0; nenhuma o declara hoje).
  const DOMINIO = { regra: "mesmo indicador de progresso no cabeçalho do detalhe, com o mesmo texto", registros: [UUID_3038, UUID_3046] };
  const dirD = join(tmp, "trio-vistorias-dominio");
  cpSync(dirV, dirD, { recursive: true });
  gravarJson(dirD, "entradas/referencia.json", { ...refV, violations: refV.violations.map(v => v.id === "B-21" ? { ...v, dominio: DOMINIO } : v) });
  const pD = prepararCampanha([dirD], opts13);
  t("dominio declarado no defeito passa sem mudança para o lote (só nele); fora do formato para; a 1.2.0 o ignora", () => {
    const r = refDoLote(pD);
    assert.deepEqual(r.defeitos.find(d => d.id === "B-21")!.dominio, DOMINIO);
    assert.deepEqual(Object.keys(r.defeitos.find(d => d.id === "B-21")!), ["id", "estado", "registro", "unidades", "descricao", "normas", "dominio"]);
    assert.ok(r.defeitos.filter(d => d.id !== "B-21").every(d => !("dominio" in d)));
    assert.deepEqual(pD.cegueira.falhas, []); assert.deepEqual(pD.falhasTrio, []);
    assert.equal(dominioDoDefeito({ id: "X" }), undefined);
    for (const ruim of [null, "texto", [], { regra: "" , registros: ["1"] }, { regra: "r" }, { regra: "r", registros: [] }, { regra: "r", registros: [1] }, { registros: ["1"] }])
      assert.throws(() => dominioDoDefeito({ id: "X", dominio: ruim }), /fora do formato/, JSON.stringify(ruim));
    const dirR = join(tmp, "trio-vistorias-dominio-ruim");
    cpSync(dirV, dirR, { recursive: true });
    gravarJson(dirR, "entradas/referencia.json", { ...refV, violations: refV.violations.map(v => v.id === "B-21" ? { ...v, dominio: { regra: "r" } } : v) });
    assert.throws(() => prepararCampanha([dirR], opts13), /dominio do defeito B-21/);
    assert.ok(!("dominio" in refDoLote(prepararCampanha([dirD], { ...opts13, politica: "1.2.0" })).defeitos.find(d => d.id === "B-21")!));
    const dirE = join(tmp, "trio-vistorias-estado-ruim");
    cpSync(dirV, dirE, { recursive: true });
    gravarJson(dirE, "entradas/referencia.json", { ...refV, violations: refV.violations.map(v => v.id === "B-21" ? { ...v, state: "nao-declarado" } : v) });
    assert.throws(() => prepararCampanha([dirE], opts13), /B-21 no estado nao-declarado/);
  });
  t("ingestão 1.3.0 da passada com paradas, registro e dominio: aceita sem mudança; vinculo B-21 credita B-21 (derivarClasse igual)", () => {
    const filaD = join(tmp, "fila-dominio");
    for (const [rel, x] of [...pD.arquivosDoJuiz, ...pD.arquivosInternos]) gravar(filaD, rel, x);
    const loteTxt = pD.arquivosDoJuiz.get("lotes/lote-01.json")!, l = JSON.parse(loteTxt) as { cartoes: CartaoCego[] };
    const chD = JSON.parse(pD.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; cardIdOriginal: string }[] };
    const alvo = chD.itens.find(i => i.cardIdOriginal === "C-aaaa")!.id;
    const respostas = l.cartoes.map(c => c.id === alvo
      ? { id: c.id, verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, vinculo: { spec: "B-21", relacao: "direta" },
        sugestao: c.perguntas.includes("sugestao") ? { trataOFato: "sim", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "valida" } : NAO_PERGUNTADO,
        forcaDoVeredito: "medido", evidencias: ["MEDIDA", "OBS"], justificativa: "MEDIDA mostra o campo sem rótulo que o OBS descreve.", estadoAlcancado: "receita" }
      : { id: c.id, verdadeFactual: "indeterminado",
        norma: c.alegacao.regra === null ? { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } : { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
        vinculo: "indeterminado", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético.", estadoAlcancado: "receita" });
    gravarJson(filaD, "respostas/lote-01.json", { formato: FORMATO_RESPOSTAS_CAMPANHA_1_3_1, lote: "lote-01", loteSha256: sha(loteTxt), juiz: "teste sintético", respostas });
    const r = ingerir(filaD); assert.deepEqual(r.erros, []);
    const j = (r.julgamentos as { julgamentos: { id: string; derivado: { spec: string | null; classe: string } }[] }).julgamentos.find(x => x.id === alvo)!;
    assert.equal(j.derivado.spec, "B-21");
    const c = l.cartoes.find(x => x.id === alvo)!, it = chD.itens.find(i => i.id === alvo)!;
    const resp = respostas.find(x => x.id === alvo)! as unknown as Resposta;
    const d = derivarClasse(resp, contextoDe(c, it as never, refDoLote(pD).defeitos.map(x => x.id), "1.3.0"));
    assert.deepEqual([j.derivado.classe, j.derivado.spec], [d.classe, d.spec], "a derivação é a de sempre");
  });
  // ── passada 1.4.4 (lista única 3.7.3, C3–C4): ARIA preso × estado nativo; motivo estruturado do "sem vínculo"
  console.log("E14 campanha 1.4.4: ARIA preso × estado nativo (norma) e motivoSemVinculo (vinculo, respostas 1.3.1)");
  const compilar = (e: object) => new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(e);
  t("LEIAME 1.3.0: ARIA × estado nativo na seção norma, logo depois do cabeçalho vazio; motivo no fim da seção vinculo, uma linha por valor; 1.2.0 sem os dois", () => {
    const l = pA.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    assert.ok(l.includes(LEIAME_CABECALHO_VAZIO + "\n" + LEIAME_ARIA_ESTADO + "\n"), "logo depois do cabeçalho vazio");
    assert.ok(l.indexOf(LEIAME_ARIA_ESTADO) > l.indexOf("### `norma`") && l.indexOf(LEIAME_ARIA_ESTADO) < l.indexOf("### `vinculo`"), "na seção norma");
    assert.ok(l.includes(LEIAME_PARADAS + "\n" + LEIAME_MOTIVO_SEM_VINCULO + "\n"), "logo depois das paradas");
    assert.ok(l.indexOf(LEIAME_MOTIVO_SEM_VINCULO) > l.indexOf("### `vinculo`") && l.indexOf(LEIAME_MOTIVO_SEM_VINCULO) < l.indexOf("### `sugestao`"), "na seção vinculo");
    for (const x of ["`aria-checked`", "estado nativo", "regra do DS citada", "WCAG 4.1.2", "`wcag:4.1.2`", "`aplica` e violada `sim`", "não torna o fato",
      "`verdadeira`, nunca `falsa`", "atributo ausente", "igual ao estado nativo", "`nao-aplica`", "`nao-alcancado`", "`MEDIDA`", "receita"])
      assert.ok(LEIAME_ARIA_ESTADO.includes(x), x);
    assert.deepEqual([...MOTIVO_SEM_VINCULO], ["registro", "estado", "sujeito", "fato", "fora-da-lista", "incerto"]);
    for (const k of MOTIVO_SEM_VINCULO) assert.equal(LEIAME_MOTIVO_SEM_VINCULO.split(`\n  - \`${k}\`: `).length - 1, 1, k);
    assert.equal(LEIAME_MOTIVO_SEM_VINCULO.split("\n  - `").length - 1, MOTIVO_SEM_VINCULO.length, "uma linha por valor, nada mais");
    for (const x of ["`vinculo: \"nenhum\"`", "obrigatório quando o cartão tem `candidatas`", "Não muda a classe"]) assert.ok(LEIAME_MOTIVO_SEM_VINCULO.includes(x), x);
    assert.ok(!/\bswitch\b|accessibility-|[0-9a-f]{12}/.test(LEIAME_ARIA_ESTADO), "nenhum componente nem id da base no bloco");
    const l12 = p.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    for (const x of [LEIAME_ARIA_ESTADO, LEIAME_MOTIVO_SEM_VINCULO, "motivoSemVinculo", "aria-checked"]) assert.ok(!l12.includes(x), x.slice(0, 30));
  });
  t("esquema publicado na 1.3.0 = respostas 1.3.1: motivoSemVinculo na lista e só com vinculo \"nenhum\"; manifesto 1.3.1; a constante 1.3.0 não muda (recusa o campo)", () => {
    const esq = JSON.parse(pA.arquivosDoJuiz.get("lotes/esquema-respostas.schema.json")!) as { properties: { formato: { const: string }; respostas: { items: { properties: Record<string, unknown> } } } };
    assert.deepEqual(esq.properties.respostas.items.properties.motivoSemVinculo, { enum: [...MOTIVO_SEM_VINCULO] });
    assert.equal(esq.properties.formato.const, FORMATO_RESPOSTAS_CAMPANHA_1_3_1);
    const m = JSON.parse(pA.arquivosInternos.get("lotes/manifesto.json")!) as { formato: string; versao: string; respostas: { formato: string } };
    assert.deepEqual([m.formato, m.versao, m.respostas.formato], [FORMATO_MANIFESTO_CAMPANHA_1_3_1, "nat78-primeira-passada-1.4.7", FORMATO_RESPOSTAS_CAMPANHA_1_3_1]);
    const ajv = compilar(esq);
    const base = { id: "T3-0123456789", verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" },
      vinculo: "nenhum", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "medido", evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o fato fora dos defeitos da tela.", estadoAlcancado: "receita" };
    const doc = (r: unknown, formato = FORMATO_RESPOSTAS_CAMPANHA_1_3_1) => ({ formato, lote: "lote-01", loteSha256: "a".repeat(64), juiz: "teste", respostas: [r] });
    for (const k of MOTIVO_SEM_VINCULO) assert.ok(ajv(doc({ ...base, motivoSemVinculo: k })), `${k}: ${JSON.stringify(ajv.errors)}`);
    assert.ok(ajv(doc(base)), "ausente: o esquema não vê as candidatas (a ingestão decide)");
    assert.ok(!ajv(doc({ ...base, motivoSemVinculo: "outro" })), "fora da lista");
    for (const v of [{ spec: "A-01", relacao: "direta" }, "indeterminado", NAO_PERGUNTADO]) {
      assert.ok(ajv(doc({ ...base, vinculo: v })), JSON.stringify(v));
      assert.ok(!ajv(doc({ ...base, vinculo: v, motivoSemVinculo: "fato" })), `motivo com vinculo ${JSON.stringify(v)}`);
    }
    const a13 = compilar(ESQUEMA_RESPOSTAS_CAMPANHA_1_3);
    assert.ok(a13(doc(base, FORMATO_RESPOSTAS_CAMPANHA_1_3)) && !a13(doc({ ...base, motivoSemVinculo: "fato" }, FORMATO_RESPOSTAS_CAMPANHA_1_3)), "1.3.0: sem o campo");
    assert.ok(!("motivoSemVinculo" in ESQUEMA_RESPOSTAS_CAMPANHA_1_3.properties.respostas.items.properties));
    assert.equal(ESQUEMA_RESPOSTAS_CAMPANHA_1_3_1.title, FORMATO_RESPOSTAS_CAMPANHA_1_3_1);
  });
  t("validação 1.3.1: motivo obrigatório com vinculo \"nenhum\" e candidatas, opcional sem candidatas, recusado com outro vínculo ou fora da lista; 1.3.0 não conhece o campo; derivação igual", () => {
    const ctx = ctxDe("C-cccc"), cand = cartao("C-cccc").candidatas;
    assert.deepEqual(cand, ["A-01"]);
    const o131 = { normaNeutra: true, v12: true, v13: true, v131: true, candidatas: cand }, o13 = { normaNeutra: true, v12: true, v13: true };
    const r = resp("C-cccc", { norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, vinculo: "nenhum" });
    assert.match(validarResposta(r, ctx, o131).join(), /responda motivoSemVinculo/);
    for (const k of MOTIVO_SEM_VINCULO) assert.deepEqual(validarResposta({ ...r, motivoSemVinculo: k }, ctx, o131), [], k);
    assert.deepEqual(validarResposta(r, ctx, { ...o131, candidatas: [] }), [], "sem candidatas: opcional");
    assert.deepEqual(validarResposta({ ...r, motivoSemVinculo: "fora-da-lista" }, ctx, { ...o131, candidatas: [] }), []);
    assert.match(validarResposta({ ...r, motivoSemVinculo: "outro" }, ctx, o131).join(), /motivoSemVinculo fora da lista/);
    for (const v of [{ spec: "A-01", relacao: "direta" }, "indeterminado"]) {
      assert.deepEqual(validarResposta({ ...r, vinculo: v }, ctx, o131), [], JSON.stringify(v));
      assert.match(validarResposta({ ...r, vinculo: v, motivoSemVinculo: "fato" }, ctx, o131).join(), /só com vinculo "nenhum"/, JSON.stringify(v));
    }
    assert.match(validarResposta({ ...r, motivoSemVinculo: "fato" }, ctx, o13).join(), /campo desconhecido: motivoSemVinculo/, "1.3.0 não conhece o campo");
    assert.deepEqual(validarResposta(r, ctx, o13), [], "1.3.0: sem motivo, como sempre");
    assert.throws(() => validarResposta(r, ctx, { ...o13, v131: true }), /candidatas/);
    assert.deepEqual(derivarClasse({ ...r, motivoSemVinculo: "estado" } as Resposta, ctx), derivarClasse(r as Resposta, ctx), "o motivo não entra na derivação");
  });
  const filaDe = (nome: string, troca: (rel: string, x: string) => string = (_r, x) => x) => {
    const f = join(tmp, nome);
    for (const [rel, x] of [...pA.arquivosDoJuiz, ...pA.arquivosInternos]) gravar(f, rel, troca(rel, x));
    return f;
  };
  const loteA = pA.arquivosDoJuiz.get("lotes/lote-01.json")!, cartoesA = (JSON.parse(loteA) as { cartoes: CartaoCego[] }).cartoes;
  const semVinc = (c: CartaoCego, motivo?: string) => ({ id: c.id, verdadeFactual: "indeterminado",
    norma: c.alegacao.regra === null ? { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } : { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
    vinculo: "nenhum", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético.", estadoAlcancado: "receita",
    ...(motivo ? { motivoSemVinculo: motivo } : {}) });
  const motivoDe = (k: number) => MOTIVO_SEM_VINCULO[k % MOTIVO_SEM_VINCULO.length];
  const gravaResp = (f: string, rs: unknown[], formato: string) => gravarJson(f, "respostas/lote-01.json", { formato, lote: "lote-01", loteSha256: sha(loteA), juiz: "teste sintético", respostas: rs });
  t("ingestão 1.3.1: sem motivo com candidatas recusa; com motivo, ele vai na resposta de julgamentos.json e em porMotivoSemVinculo; classe igual à sem o campo", () => {
    const f = filaDe("fila-131");
    assert.ok(cartoesA.every(c => c.candidatas.length), "todo cartão sintético tem candidatas");
    gravaResp(f, cartoesA.map(c => semVinc(c)), FORMATO_RESPOSTAS_CAMPANHA_1_3_1);
    const e = ingerir(f).erros; assert.equal(e.filter(x => /responda motivoSemVinculo/.test(x)).length, cartoesA.length, e.join("\n"));
    gravaResp(f, cartoesA.map((c, k) => semVinc(c, motivoDe(k))), FORMATO_RESPOSTAS_CAMPANHA_1_3_1);
    const r = ingerir(f); assert.deepEqual(r.erros, []);
    const j = r.julgamentos as { porMotivoSemVinculo: Record<string, number>; julgamentos: { id: string; resposta: Resposta; derivado: unknown }[] };
    const esperado: Record<string, number> = {};
    cartoesA.forEach((_c, k) => { esperado[motivoDe(k)] = (esperado[motivoDe(k)] ?? 0) + 1; });
    assert.deepEqual(j.porMotivoSemVinculo, Object.fromEntries(Object.entries(esperado).sort()));
    assert.deepEqual(Object.keys(j.porMotivoSemVinculo), Object.keys(j.porMotivoSemVinculo).sort());
    const ch = JSON.parse(pA.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string }[] };
    for (const x of j.julgamentos) {
      const k = cartoesA.findIndex(c => c.id === x.id);
      assert.equal(x.resposta.motivoSemVinculo, motivoDe(k), x.id);
      const { motivoSemVinculo: _m, ...sem } = x.resposta;
      assert.deepEqual(x.derivado, derivarClasse(sem as Resposta, contextoDe(cartoesA[k], ch.itens.find(i => i.id === x.id)! as never, ["A-01"], "1.3.0")), x.id);
    }
    gravaResp(f, cartoesA.map(c => ({ ...semVinc(c, "fato"), vinculo: "indeterminado" })), FORMATO_RESPOSTAS_CAMPANHA_1_3_1);
    assert.match(ingerir(f).erros.join(), /esquema \/respostas\/\d+/, "motivo com outro vínculo: recusado pelo esquema");
    gravaResp(f, cartoesA.map((c, k) => semVinc(c, motivoDe(k))), FORMATO_RESPOSTAS_CAMPANHA_1_3);
    assert.match(ingerir(f).erros.join(), /formato|esquema/, "formato 1.3.0 numa passada 1.3.1: recusado");
  });
  t("passada 1.3.0 congelada (manifesto 1.3.0): ingerida pelo esquema 1.3.0 de sempre — sem motivo aceita, com motivo recusada; julgamentos sem porMotivoSemVinculo", () => {
    const f = filaDe("fila-130", (rel, x) => (rel === "lotes/manifesto.json" ? x.replace(FORMATO_MANIFESTO_CAMPANHA_1_3_1, FORMATO_MANIFESTO_CAMPANHA_1_3).replace(FORMATO_RESPOSTAS_CAMPANHA_1_3_1, FORMATO_RESPOSTAS_CAMPANHA_1_3) : x));
    gravaResp(f, cartoesA.map(c => semVinc(c)), FORMATO_RESPOSTAS_CAMPANHA_1_3);
    const r = ingerir(f); assert.deepEqual(r.erros, []);
    assert.ok(!("porMotivoSemVinculo" in (r.julgamentos as object)) && !r.texto!.includes("motivoSemVinculo"));
    gravaResp(f, cartoesA.map((c, k) => semVinc(c, motivoDe(k))), FORMATO_RESPOSTAS_CAMPANHA_1_3);
    assert.match(ingerir(f).erros.join(), /esquema/, "1.3.0: campo recusado pelo esquema");
  });
  // ── passada 1.4.5 (D-167, validator 3.7.3): força `especificacao` na base
  console.log("E14 campanha 1.4.5: força especificacao (D-167) — null no vocabulário, linha do LEIAME só com a base que a traz");
  /** sha256 de leiameCampanha13(10, 2, "Tela X") no gerador 1.4.4 (commit ac32e1f), antes da 1.4.5. */
  const LEIAME13_1_4_4 = "916f302ef0196c021447a7246451e776188ddcd6221d7fb0347264d516cf7307";
  const LINHA_ESP = "  | especificação (descreve o componente) | `null` (sem correspondência) |";
  // Validador sintético com uma unidade de especificação (o mesmo data/ + uma linha) e a análise apontando para essa data/.
  const valE = join(tmp, "validador-esp"), dE = join(valE, "data");
  cpSync(vData, dE, { recursive: true });
  gravar(dE, `${vNorm}/rules.jsonl`, readFileSync(join(vData, vNorm, "rules.jsonl"), "utf8")
    + JSON.stringify(regra("govbr-3.7.0-component-input-eeeeeeeeeeee", "Rótulo | Componente Input | Texto", "especificacao")) + "\n");
  const dataE = sha256Tree(dE)!.sha256, dirE = join(tmp, "trio-esp");
  cpSync(dir, dirE, { recursive: true });
  gravar(dirE, "entradas/campanha.json", readFileSync(join(dir, "entradas", "campanha.json"), "utf8").split(dataSha).join(dataE));
  const pk = JSON.parse(readFileSync(join(dir, "revisao", "package.json"), "utf8")) as { cards: { id: string; rule: string | null }[]; runs: { cardIds: string[] }[] };
  pk.cards.push({ ...pk.cards.find(c => c.id === "C-cccc")!, id: "C-jjjj", rule: "govbr-3.7.0-component-input-eeeeeeeeeeee" });
  pk.runs[2].cardIds.push("C-jjjj");
  gravarJson(dirE, "revisao/package.json", pk);
  const optsE = { validador: valE, checkerAliases: aliasesAbs };
  const pE = prepararCampanha([dirE], optsE), pE12 = prepararCampanha([dirE], { ...optsE, politica: "1.2.0" });
  const totalDe = (p_: typeof pE) => JSON.parse(p_.arquivosInternos.get("lotes/manifesto.json")!) as { total: number; versao: string; formato: string; lotes: unknown[] };
  t("base com especificacao prepara: forcaNoVocabulario null no cartão, linha na tabela do LEIAME (1.3.0 e 1.2.0) e nada mais, versão da 1.3.0 (1.4.7), cegueira OK", () => {
    assert.ok(FORCAS_SO_COM_A_BASE.has("especificacao"));
    assert.deepEqual(normasDaCampanha({ dataSha256: dataE, validador: valE, checkerAliases: aliasesAbs }).forcas, ["especificacao", "permitted", "recommended", "required"]);
    const lE = JSON.parse(pE.arquivosDoJuiz.get("lotes/lote-01.json")!) as { cartoes: CartaoCego[] };
    const chE = JSON.parse(pE.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; cardIdOriginal: string }[] };
    const j = lE.cartoes.find(c => c.id === chE.itens.find(i => i.cardIdOriginal === "C-jjjj")!.id)!;
    assert.deepEqual(j.normaCitada!.regrasDaBase!.map(r => [r.forcaDeclarada, r.forcaNoVocabulario]), [["especificação (descreve o componente)", null]]);
    assert.ok(!pE.arquivosDoJuiz.get("lotes/lote-01.json")!.includes("eeeeeeeeeeee"), "id da base mascarado");
    for (const p_ of [pE, pE12]) {
      const l = p_.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
      assert.equal(l.split(LINHA_ESP).length - 1, 1, "uma linha");
      assert.ok(l.includes("  | não declarada | `null` (sem correspondência) |\n" + LINHA_ESP + "\n"), "logo depois da última linha fixa");
    }
    // O LEIAME com a linha = o de sempre + a linha, e nada mais (nas duas políticas).
    const m = totalDe(pE);
    assert.equal(pE.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!.replace(LINHA_ESP + "\n", ""), leiameCampanha13(m.total, m.lotes.length, "Tela X", BASE_URL_PADRAO, [], false, true));
    assert.equal(pE12.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!.replace(LINHA_ESP + "\n", ""), leiameCampanha(m.total, m.lotes.length, "Tela X"));
    assert.deepEqual([m.versao, m.formato], ["nat78-primeira-passada-1.4.7", FORMATO_MANIFESTO_CAMPANHA_1_3_1]);
    assert.equal(totalDe(pE12).versao, "nat78-primeira-passada-1.3.1", "a 1.2.0 não muda de versão");
    assert.deepEqual(pE.cegueira.falhas, []); assert.deepEqual(pE.falhasTrio, []);
  });
  t("cartão que cita unidade de especificação: forcasDaCitada [null], derivação igual à de regra informativa; \"nenhuma\" com essa regra recusado (não é \"só permite\")", () => {
    const lE = JSON.parse(pE.arquivosDoJuiz.get("lotes/lote-01.json")!) as { cartoes: CartaoCego[] };
    const chE = JSON.parse(pE.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; cardIdOriginal: string }[] };
    const it = (o: string) => chE.itens.find(i => i.cardIdOriginal === o)!, c = (o: string) => lE.cartoes.find(x => x.id === it(o).id)!;
    const ctx = contextoDe(c("C-jjjj"), it("C-jjjj") as never, ["A-01"], "1.3.0");
    assert.deepEqual(ctx.forcasDaCitada, [null]);
    const o131 = { normaNeutra: true, v12: true, v13: true, v131: true, candidatas: c("C-jjjj").candidatas };
    const r = { id: c("C-jjjj").id, verdadeFactual: "verdadeira", norma: { id: "citada", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO },
      vinculo: { spec: "A-01", relacao: "direta" }, sugestao: NAO_PERGUNTADO, forcaDoVeredito: "medido", evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o fato.", estadoAlcancado: "receita" };
    assert.match(validarResposta(r, ctx, o131).join(), /só quando toda força da base da regra corresponde a "nenhuma"/);
    for (const forca of ["obrigatorio", "recomendado", "indeterminado"]) for (const violada of ["sim", "nao"]) {
      const rr = { ...r, norma: { id: "citada", forca, aplicabilidade: "aplica", violada } } as unknown as Resposta;
      assert.deepEqual(derivarClasse(rr, ctx), derivarClasse(rr, { ...ctx, forcasDaCitada: [FORCA_NO_VOCABULARIO.informative] }), `${forca}/${violada}`);
    }
  });
  t("base sem especificacao: LEIAME byte a byte o da 1.4.4 (1.3.0) e o histórico (1.2.0), sem a linha; com ela, só a linha a mais", () => {
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X")), LEIAME13_1_4_4);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["informative", "required", "unclear"])), LEIAME13_1_4_4, "forças fixas não mudam nada");
    assert.equal(sha(leiameCampanha(10, 2, "Tela X", ["required"])), LEIAME12_HISTORICO);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"]).replace(LINHA_ESP + "\n", "")), LEIAME13_1_4_4);
    for (const p_ of [p, pA]) assert.ok(!p_.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!.includes("especificação"), "base sem a força: sem a linha");
    const m = totalDe(pA);
    assert.equal(pA.arquivosDoJuiz.get("lotes/LEIAME-juiz.md"), leiameCampanha13(m.total, m.lotes.length, "Tela X", BASE_URL_PADRAO, [], false, true));
  });
  // ── passada 1.4.6 (passada dev-374-b-01): força da recomendação e-MAG citada direto, pela base
  console.log("E14 campanha 1.4.6: emag:N.N com a força que a base declara para o título da recomendação (só 1.3.0)");
  /** sha256 de leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"]) no gerador 1.4.5 (commit 9f615c1). */
  const LEIAME13_1_4_5_ESP = "b58a4212ac0d75847003ab72d62517d7689a247ba33ba4ebe29163145896b4bb";
  // Validador sintético com o título da recomendação 2.2 (recommended), uma frase do corpo dela (required: não entra) e o
  // título de uma recomendação escrita como proibição (prohibited); a análise com C-aaaa → REF1 emag-2.2 e o defeito com emag:2.2.
  const regraEmag = (id: string, title: string, force: string, refs: string[]) => ({ ...regra(id, title, force), standard: "e-MAG", emagReferences: refs });
  const valM = join(tmp, "validador-emag"), dM = join(valM, "data");
  cpSync(vData, dM, { recursive: true });
  gravar(dM, `${vNorm}/rules.jsonl`, readFileSync(join(vData, vNorm, "rules.jsonl"), "utf8") + [
    regraEmag("govbr-3.7.0-accessibility-global-e22e22e22e22", "Recomendação 2.2 – Garantir que os objetos programáveis sejam acessíveis", "recommended", ["2.2"]),
    regraEmag("govbr-3.7.0-accessibility-global-e22c0c0c0c0c", "Os scripts devem ser acessíveis", "required", ["2.2"]),
    regraEmag("govbr-3.7.0-accessibility-global-e16e16e16e16", "Recomendação 1.6 – Não utilizar tabelas para diagramação", "prohibited", ["1.6"]),
  ].map(x => JSON.stringify(x)).join("\n") + "\n");
  gravarJson(dM, "emag.json", { sections: { s1: { title: "Marcação", rules: [{ id: "1.6", title: "Não utilizar tabelas para diagramação", description: "Tables must not be used for layout." }] },
    s2: { title: "Comportamento", rules: [{ id: "2.2", title: "Garantir que os objetos programáveis sejam acessíveis", description: "Scripts must be accessible." }] } } });
  const dataM = sha256Tree(dM)!.sha256, dirM = join(tmp, "trio-emag");
  cpSync(dir, dirM, { recursive: true });
  gravar(dirM, "entradas/campanha.json", readFileSync(join(dir, "entradas", "campanha.json"), "utf8").split(dataSha).join(dataM));
  const pkM = JSON.parse(readFileSync(join(dir, "revisao", "package.json"), "utf8")) as { cards: { id: string; rule: string | null; reportedEvidence: unknown }[]; runs: { cardIds: string[] }[] };
  pkM.cards.find(c => c.id === "C-aaaa")!.reportedEvidence = { finding: { references: ["emag-2.2"] } };
  pkM.cards.push({ ...pkM.cards.find(c => c.id === "C-eeee")!, id: "C-kkkk", rule: "emag-1.6" });
  pkM.runs[2].cardIds.push("C-kkkk");
  gravarJson(dirM, "revisao/package.json", pkM);
  const refM = JSON.parse(readFileSync(join(dir, "entradas", "referencia.json"), "utf8")) as { violations: { rules: string[] }[] };
  refM.violations[0].rules.push("emag:2.2");
  gravarJson(dirM, "entradas/referencia.json", refM);
  const optsM = { validador: valM, checkerAliases: aliasesAbs };
  const pM = prepararCampanha([dirM], optsM), pM12 = prepararCampanha([dirM], { ...optsM, politica: "1.2.0" });
  const vistaM = (p_: typeof pM) => {
    const l = JSON.parse(p_.arquivosDoJuiz.get("lotes/lote-01.json")!) as { cartoes: CartaoCego[]; referencias: Record<string, { defeitos: { normas: CartaoCego["normaCitada"][] }[] }> };
    const ch = JSON.parse(p_.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; cardIdOriginal: string }[] };
    const it = (o: string) => ch.itens.find(i => i.cardIdOriginal === o)!;
    return { l, it, c: (o: string) => l.cartoes.find(x => x.id === it(o).id)! };
  };
  const RECOMENDADO = { titulo: "Recomendação 2.2 – Garantir que os objetos programáveis sejam acessíveis",
    texto: "Recomendação 2.2 – Garantir que os objetos programáveis sejam acessíveis.", forcaDeclarada: "recomendado", forcaNoVocabulario: "recomendado" };
  t("1.3.0: emag:N.N citado (regra, REF1, defeito) traz em regrasDaBase o título da recomendação com a força da base (recomendado; prohibited → obrigatorio); frase do corpo não entra", () => {
    const { l, c } = vistaM(pM);
    const e = c("C-eeee").normaCitada!;
    assert.deepEqual([e.id, e.fonte, e.titulo, e.texto], ["emag:2.2", "e-MAG 3.1", "Garantir que os objetos programáveis sejam acessíveis", "Scripts must be accessible."], "o resto da norma igual");
    assert.deepEqual(e.regrasDaBase, [RECOMENDADO]);
    assert.deepEqual(c("C-aaaa").referencias!.map(r => [r.id, r.regra, r.norma!.regrasDaBase]), [["REF1", "emag:2.2", [RECOMENDADO]]]);
    assert.deepEqual(l.referencias.x.defeitos[0].normas.find(n => n!.id === "emag:2.2")!.regrasDaBase, [RECOMENDADO]);
    assert.deepEqual(c("C-kkkk").normaCitada!.regrasDaBase!.map(r => [r.forcaDeclarada, r.forcaNoVocabulario]), [["obrigatorio (proibição)", "obrigatorio"]]);
    assert.ok(!pM.arquivosDoJuiz.get("lotes/lote-01.json")!.includes("Os scripts devem ser acessíveis"), "frase do corpo da recomendação fora");
    assert.ok(!pM.arquivosDoJuiz.get("lotes/lote-01.json")!.includes("e22e22e22e22"), "id da base fora do lote");
    assert.deepEqual(normasDaCampanha({ dataSha256: dataM, validador: valM, checkerAliases: aliasesAbs, emagPelaBase: true }).emagComForca, 2);
    assert.equal(normasDaCampanha({ dataSha256: dataM, validador: valM, checkerAliases: aliasesAbs }).emagComForca, undefined, "sem a opção, nada");
  });
  t("1.3.0: cegueira e máscara iguais (falhas 0, resíduo do cartão e-MAG vazio); versão 1.4.7; formatos iguais", () => {
    assert.deepEqual(pM.cegueira.falhas, []); assert.deepEqual(pM.falhasTrio, []);
    const { it } = vistaM(pM);
    const r = JSON.parse(pM.arquivosInternos.get("residuo-de-braco.json")!) as { porCartao: { id: string; categorias: string[] }[] };
    for (const o of ["C-eeee", "C-kkkk", "C-aaaa"]) assert.deepEqual(r.porCartao.find(x => x.id === it(o).id)!.categorias, [], o);
    const m = JSON.parse(pM.arquivosInternos.get("lotes/manifesto.json")!) as { versao: string; formato: string; respostas: { formato: string } };
    assert.deepEqual([m.versao, m.formato, m.respostas.formato], ["nat78-primeira-passada-1.4.7", FORMATO_MANIFESTO_CAMPANHA_1_3_1, FORMATO_RESPOSTAS_CAMPANHA_1_3_1]);
  });
  t("LEIAME 1.4.6 (1.3.0, base com títulos e-MAG): a frase do e-MAG uma vez, logo depois da tabela de forças, e nada mais; padrão = 1.4.5 byte a byte", () => {
    const l = pM.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    assert.equal(l.split(LEIAME_EMAG).length - 1, 1);
    assert.ok(l.includes("  | não declarada | `null` (sem correspondência) |\n" + LEIAME_EMAG + "\n- `aplicabilidade`: `aplica`"), "logo depois da última linha da tabela");
    assert.ok(l.indexOf(LEIAME_EMAG) > l.indexOf("### `norma`") && l.indexOf(LEIAME_EMAG) < l.indexOf("### `vinculo`"), "na seção norma");
    for (const x of ["`emag:N.N`", "`regrasDaBase`", "\"Recomendação N.N – …\"", "`forcaNoVocabulario`", "`recomendado`, como a base a declara", "\"deve\"", "\"must\"", "não a sobe a `obrigatorio`"])
      assert.ok(LEIAME_EMAG.includes(x), x);
    for (const [nome, re] of proibidos(["sem", "ferramentas", "com"])) assert.ok(!re.test(LEIAME_EMAG), `${nome} no bloco novo`);
    assert.ok(!/\b[ABPU]-\d{2}\b|[0-9a-f]{12}/.test(LEIAME_EMAG), "nenhuma spec nem id da base no bloco");
    const m = totalDe(pM);
    assert.equal(l, leiameCampanha13(m.total, m.lotes.length, "Tela X", BASE_URL_PADRAO, [], true, true));
    assert.equal(l.replace(LEIAME_EMAG + "\n", ""), leiameCampanha13(m.total, m.lotes.length, "Tela X", BASE_URL_PADRAO, [], false, true), "sem a frase, o LEIAME de antes");
    // Gerador com o padrão (emagPelaBase = false) = o da 1.4.5, byte a byte: base sem e com `especificacao`.
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X")), LEIAME13_1_4_4);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"])), LEIAME13_1_4_5_ESP);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"], false)), LEIAME13_1_4_5_ESP);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"], true).replace(LEIAME_EMAG + "\n", "")), LEIAME13_1_4_5_ESP);
    // Base sem título e-MAG (a sintética de sempre): 1.3.0 sem a frase.
    assert.ok(!pA.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!.includes(LEIAME_EMAG));
    // Arquivo real (govbr-resultados), quando presente: a passada 1.4.5 da dev-374-b-01 sai igual pelo gerador com o padrão.
    const arq = join(EVAL, "..", "govbr-resultados", "analises", "dev-374-b-01", "primeira-passada-20261109T1", "lotes", "LEIAME-juiz.md");
    if (existsSync(arq)) {
      const a = readFileSync(arq, "utf8"), mm = /fila de (\d+) alegações, dividida em (\d+) lotes?\.[^]*?congelada \(([^)]*)\)\. Você/.exec(a)!;
      const url = /servida em `(http:\/\/127\.0\.0\.1:\d+)`/.exec(a)![1];
      assert.equal(leiameCampanha13(Number(mm[1]), Number(mm[2]), mm[3], url, ["especificacao"]), a, "LEIAME 1.4.5 arquivado");
      console.log("     (conferido contra o LEIAME 1.4.5 arquivado de dev-374-b-01)");
    }
  });
  t("1.2.0 não muda: emag:N.N sem regrasDaBase (regra, defeito), LEIAME sem a frase, versão 1.3.1", () => {
    const { l, c } = vistaM(pM12);
    for (const o of ["C-eeee", "C-kkkk"]) assert.equal(c(o).normaCitada!.regrasDaBase, undefined, o);
    assert.equal(l.referencias.x.defeitos[0].normas.find(n => n!.id === "emag:2.2")!.regrasDaBase, undefined);
    const m = totalDe(pM12);
    assert.equal(pM12.arquivosDoJuiz.get("lotes/LEIAME-juiz.md"), leiameCampanha(m.total, m.lotes.length, "Tela X"));
    assert.equal(m.versao, "nat78-primeira-passada-1.3.1");
    // O lote 1.2.0 é o da base sem os títulos, a menos das somas das fontes (a data/ é outra) e dos cartões novos.
    assert.deepEqual(pM12.cegueira.falhas, []);
  });
  t("ingestão 1.4.6: cartão emag:N.N tem forcasDaCitada = [recomendado]; validação e derivação iguais às do cartão sem a força (nunca \"só permite\")", () => {
    const { c, it } = vistaM(pM);
    const ctx = contextoDe(c("C-eeee"), it("C-eeee") as never, ["A-01"], "1.3.0");
    assert.deepEqual(ctx.forcasDaCitada, ["recomendado"]);
    const sem = { ...ctx, forcasDaCitada: undefined };
    const o131 = { normaNeutra: true, v12: true, v13: true, v131: true, candidatas: c("C-eeee").candidatas };
    const base = { id: c("C-eeee").id, verdadeFactual: "verdadeira", vinculo: { spec: "A-01", relacao: "direta" }, sugestao: NAO_PERGUNTADO, forcaDoVeredito: "medido",
      evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o fato.", estadoAlcancado: "receita" };
    const nenhuma = { ...base, norma: { id: "citada", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } };
    assert.deepEqual(validarResposta(nenhuma, ctx, o131), validarResposta(nenhuma, sem, o131), "\"nenhuma\" recusado como antes");
    for (const forca of ["obrigatorio", "recomendado", "indeterminado"]) for (const violada of ["sim", "nao"]) {
      const rr = { ...base, norma: { id: "citada", forca, aplicabilidade: "aplica", violada } } as unknown as Resposta;
      assert.deepEqual(validarResposta(rr, ctx, o131), validarResposta(rr, sem, o131), `${forca}/${violada}`);
      assert.deepEqual(derivarClasse(rr, ctx), derivarClasse(rr, sem), `${forca}/${violada}`);
    }
  });
  t("dois títulos para a mesma recomendação e-MAG na base: para (nunca se escolhe um)", () => {
    const v3 = join(tmp, "validador-emag-dup"), d3 = join(v3, "data");
    cpSync(dM, d3, { recursive: true });
    gravar(d3, `${vNorm}/rules.jsonl`, readFileSync(join(dM, vNorm, "rules.jsonl"), "utf8")
      + JSON.stringify(regraEmag("govbr-3.7.0-accessibility-global-e22d0d0d0d0d", "Recomendação 2.2 - Garantir de novo", "required", ["2.2"])) + "\n");
    const o3 = { dataSha256: sha256Tree(d3)!.sha256, validador: v3, checkerAliases: aliasesAbs };
    assert.throws(() => normasDaCampanha({ ...o3, emagPelaBase: true }), /dois registros de título para a recomendação e-MAG 2\.2/);
    assert.doesNotThrow(() => normasDaCampanha(o3), "a 1.2.0 não lê os títulos");
  });
  // ── passada 1.4.7 (leitura dev-374-a2-01 §5 item 6): de qual árvore se mede a estrutura de papéis
  console.log("E14 campanha 1.4.7: estrutura de papéis medida na árvore da marcação (li em tablist), só 1.3.0, passadas 1.4.6 iguais");
  t("LEIAME 1.4.7 (1.3.0): o bloco da árvore de papéis uma vez, logo depois do atributo ARIA preso, na seção norma; sem ele, o LEIAME 1.4.6 byte a byte", () => {
    for (const p_ of [pA, pM, pE]) {
      const l = p_.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
      assert.equal(l.split(LEIAME_ARVORE_PAPEIS).length - 1, 1);
      assert.ok(l.includes(LEIAME_ARIA_ESTADO + "\n" + LEIAME_ARVORE_PAPEIS + "\n"), "logo depois do atributo ARIA preso");
      assert.ok(l.indexOf(LEIAME_ARVORE_PAPEIS) > l.indexOf("### `norma`") && l.indexOf(LEIAME_ARVORE_PAPEIS) < l.indexOf("### `vinculo`"), "na seção norma");
      const m = totalDe(p_);
      assert.equal(m.versao, "nat78-primeira-passada-1.4.7");
      const forcas = l.includes("especificação") ? ["especificacao"] : [], emag = l.includes(LEIAME_EMAG);
      assert.equal(l.replace(LEIAME_ARVORE_PAPEIS + "\n", ""), leiameCampanha13(m.total, m.lotes.length, "Tela X", BASE_URL_PADRAO, forcas, emag), "sem o bloco, o gerador 1.4.6");
      assert.equal(l, leiameCampanha13(m.total, m.lotes.length, "Tela X", BASE_URL_PADRAO, forcas, emag, true));
    }
    // Padrão do gerador (arvorePapeis = false) = 1.4.6 byte a byte: os sha fixados das versões anteriores continuam valendo.
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X")), LEIAME13_1_4_4);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, [], false, false)), LEIAME13_1_4_4);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"], false, false)), LEIAME13_1_4_5_ESP);
    assert.equal(sha(leiameCampanha13(10, 2, "Tela X", BASE_URL_PADRAO, ["especificacao"], false, true).replace(LEIAME_ARVORE_PAPEIS + "\n", "")), LEIAME13_1_4_5_ESP);
  });
  t("bloco 1.4.7: fonte fixada (marcação, axe-core, snapshot ARIA), reparo do navegador não decide, veredito do li em tablist, exclusões; sem braço, spec nem id da base", () => {
    for (const x of ["árvore de papéis da **marcação**", "`li` → `listitem`", "axe-core", "`locator.ariaSnapshot()`", "`MEDIDA`", "`Accessibility.getFullAXTree`",
      "o reparo é do navegador", "`ul role=\"tablist\"` > `li` sem `role` > elemento `role=\"tab\"`", "é `verdadeira`, nunca `falsa` nem `indeterminado`",
      "`listitem`, `aria-required-children`", "WCAG 1.3.1", "`aplica` e violada `sim`", "`role=\"none\"`", "`role=\"presentation\"`", "`nao-aplica`"])
      assert.ok(LEIAME_ARVORE_PAPEIS.includes(x), x);
    for (const [nome, re] of proibidos(["sem", "ferramentas", "com"])) assert.ok(!re.test(LEIAME_ARVORE_PAPEIS), `${nome} no bloco novo`);
    assert.ok(!/\b[ABPU]-\d{2}\b|[0-9a-f]{12}|\bbr-[a-z]/.test(LEIAME_ARVORE_PAPEIS), "nenhuma spec, id da base ou componente no bloco");
  });
  t("1.2.0 não muda com a 1.4.7: LEIAME histórico sem o bloco, versão 1.3.1", () => {
    for (const p_ of [pM12, pE12]) {
      assert.ok(!p_.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!.includes(LEIAME_ARVORE_PAPEIS));
      assert.equal(totalDe(p_).versao, "nat78-primeira-passada-1.3.1");
    }
    assert.ok(!leiameCampanha(10, 2, "Tela X").includes("Estrutura de papéis"));
  });
  t("passadas 1.4.6 arquivadas (govbr-resultados): o gerador padrão refaz o LEIAME byte a byte; com a 1.4.7, só o bloco a mais", () => {
    let conferidas = 0;
    for (const rel of [["dev-374-a-01", "primeira-passada-20261110T1"], ["dev-374-a2-01", "primeira-passada-20261110T1"]]) {
      const dirP = join(EVAL, "..", "govbr-resultados", "analises", ...rel, "lotes");
      if (!existsSync(join(dirP, "LEIAME-juiz.md"))) continue;
      assert.equal((JSON.parse(readFileSync(join(dirP, "manifesto.json"), "utf8")) as { versao: string }).versao, "nat78-primeira-passada-1.4.6", rel.join("/"));
      const a = readFileSync(join(dirP, "LEIAME-juiz.md"), "utf8");
      const mm = /fila de (\d+) alegações, dividida em (\d+) lotes?\.[^]*?congelada \(([^)]*)\)\. Você/.exec(a)!;
      const url = /servida em `(http:\/\/127\.0\.0\.1:\d+)`/.exec(a)![1];
      const forcas = a.includes("especificação") ? ["especificacao"] : [], emag = a.includes(LEIAME_EMAG);
      assert.ok(!a.includes(LEIAME_ARVORE_PAPEIS), `${rel.join("/")}: a 1.4.6 não tem o bloco`);
      assert.equal(leiameCampanha13(Number(mm[1]), Number(mm[2]), mm[3], url, forcas, emag), a, `LEIAME 1.4.6 arquivado de ${rel.join("/")}`);
      const novo = leiameCampanha13(Number(mm[1]), Number(mm[2]), mm[3], url, forcas, emag, true);
      assert.equal(novo.replace(LEIAME_ARVORE_PAPEIS + "\n", ""), a, `${rel.join("/")}: a 1.4.7 é a 1.4.6 mais o bloco`);
      // o sha que os lotes arquivados registram é o deste LEIAME
      const lote = JSON.parse(readFileSync(join(dirP, "lote-01.json"), "utf8")) as { instrucoes: { sha256: string } };
      assert.equal(lote.instrucoes.sha256, sha(a), `${rel.join("/")}: lote-01 aponta este LEIAME`);
      conferidas += 1;
    }
    console.log(`     (conferidas ${conferidas} passada(s) 1.4.6 arquivada(s))`);
  });
  await testesReferencias({ t, tmp, dir, valDir, aliasesAbs, prepararCampanha, cli });
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da E14 campanha passaram`);
if (falhas) process.exitCode = 1;
