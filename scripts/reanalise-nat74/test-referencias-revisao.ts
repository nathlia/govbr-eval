/**
 * [D-156, revisão Codex NAT-112] Política do juiz 1.3.0 de ponta a ponta sobre uma CÓPIA temporária do ensaio de 29/10
 * (`ensaio-trio-real-05`, tela A, fora da amostra): o achado de um cartão ganha duas referências (`references`), a passada é
 * preparada na 1.3.0 e as respostas congeladas da 1ª passada são reaproveitadas (só esse cartão muda: a primária cai e a
 * REF2 vale). Daí o caminho inteiro com o MESMO mecanismo R16:
 *   preparação → esquema → validação → derivação (ingestão) → consistência → amostra/confiabilidade → adjudicação A/B →
 *   aplicar (ingestão da adjudicada na política da passada) → recálculo → material da autora;
 * e o controle: a mesma passada lida na política 1.2.0 nunca cria resgate.
 * Sem modelo, sem rede, sem coleta. Nada é gravado em govbr-resultados.
 *
 * Precisa de um validador cuja `data/` seja a do oráculo da campanha (dataSha256 d99bdb48…, validador e15b1b1):
 *   VALIDADOR_ENSAIO=<checkout com essa data/> npx tsx scripts/reanalise-nat74/test-referencias-revisao.ts
 * (ex.: `git -C govbr-ds-validator archive e15b1b1 data | tar -x -C <pasta>`). Sem ele, ou com outra data/, PULA e diz.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sha256Tree } from "../collection-manifest";
import { digest } from "../semantic-flow";
import { RESULTADOS, gravar, gravarJson, jsonTexto, lerJson, sha } from "./comum";
import { prepararCampanha, VALIDADOR_PADRAO } from "./e14-campanha";
import { FORMATO_RESPOSTAS_CAMPANHA_1_3, NAO_PERGUNTADO, type CartaoCego, type Derivado, type ItemChave, type Resposta } from "./e14-comum";
import { ingerir } from "./e14-ingerir";
import { casoMd, leiameAutora, prepararMaterial, type Tela } from "./material-autora";
import { Entradas, carregarCampanha, creditosDoTrio, julgadosDoTrio, recalcular } from "./recalculo-campanha";
import {
  FORMATO_ADJ_RESP_A, FORMATO_ADJ_RESP_B, aplicarAdjudicacao, consistencia, executar, gravarImutavel, lerPassada, loteB, medirConfiabilidade,
  prepararAdjudicacao, prepararAmostra, type Passada,
} from "./revisao-campanha";

let n = 0, falhas = 0, pulados = 0;
const t = async (nome: string, f: () => void | Promise<void>) => { n++; try { await f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 4).join(" | ") : e}`); } };
const silencioso = <T>(f: () => T): T => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return f(); } finally { console.error = e; console.log = l; } };

const ORIG = join(RESULTADOS, "analises", "ensaio-trio-real-05", "p01");
const ANALISE = "analisar-20261029T1", PASSADA = "primeira-passada-20261029T1";
const X0 = "T3-0d69d4829c"; // cartão do braço sem, creditado A-01 pela primária na 1ª passada congelada (id na passada congelada)
const REFS = ["emag:6.2", "wcag:4.1.2"]; // REF1, REF2 (nenhuma repete a rule do achado, wcag:2.4.3)

console.log("política do juiz 1.3.0 de ponta a ponta (cópia do ensaio-trio-real-05; respostas congeladas + 1 cartão sintético)");
const val = resolve(process.env.VALIDADOR_ENSAIO ?? VALIDADOR_PADRAO);
const campOrig = existsSync(join(ORIG, ANALISE)) ? lerJson<{ fixed?: { oracleProfiles?: Record<string, { dataSha256: string }> } }>(join(ORIG, ANALISE, "entradas", "campanha.json")) : null;
const dataCamp = campOrig ? Object.values(campOrig.fixed?.oracleProfiles ?? {})[0]?.dataSha256 : null;
const dataVal = sha256Tree(join(val, "data"))?.sha256 ?? null;
if (!campOrig || !existsSync(join(ORIG, PASSADA, "julgamentos.json"))) { pulados++; console.log("  PULADO: ensaio-trio-real-05 ausente em govbr-resultados"); }
else if (dataVal !== dataCamp) { pulados++; console.log(`  PULADO: data/ do validador em ${val} (${dataVal?.slice(0, 12) ?? "ausente"}) ≠ a do oráculo da campanha (${dataCamp?.slice(0, 12)}); passe VALIDADOR_ENSAIO`); }
else {
  const tmp = mkdtempSync(join(tmpdir(), "referencias-revisao-"));
  try {
    const raiz = join(tmp, "p01"), A = join(raiz, ANALISE), P13 = join(raiz, "passada-13");
    cpSync(join(ORIG, ANALISE), A, { recursive: true });
    // A passada congelada foi preparada com o checker-aliases.json de 6a6ef6a (sha nas fontes do manifesto dos lotes); o
    // regerado contra o validator 3.6.1 muda o `basis` de ds:page-header/footer, que vai ao texto da norma no cartão.
    // Reproduzir a passada é usar a entrada dela: o arquivo daquele commit, conferido pelo sha que a passada gravou.
    const chkCongelado = execFileSync("git", ["show", "6a6ef6a:checker-aliases.json"], { cwd: resolve(RESULTADOS, "..", "govbr-eval") });
    const chkFonte = lerJson<{ fontes: Record<string, string> }>(join(ORIG, PASSADA, "lotes", "manifesto.json")).fontes["govbr-eval/checker-aliases.json"];
    assert.equal(sha(chkCongelado), chkFonte, "checker-aliases.json de 6a6ef6a não é o que a passada congelada gravou");
    const chkAbs = join(tmp, "checker-aliases.json");
    writeFileSync(chkAbs, chkCongelado);
    // O achado do cartão X ganha duas referências (o resto do pacote fica igual).
    // O id do cartão é derivado do conteúdo (semantic-flow): o cartão com `references` ganha id novo (trocado em todo o
    // pacote) e o pacote, packageHash novo — como se o agente tivesse escrito o achado assim.
    type Pkg = { context: unknown; units: unknown; packageHash: string; cards: { id: string; rule: string | null; reportedEvidence: { finding?: Record<string, unknown> } | null }[] };
    const pkg0 = lerJson<Pkg>(join(A, "revisao", "package.json"));
    const chaveOrig = lerJson<{ itens: ItemChave[] }>(join(ORIG, PASSADA, "chave", "fila-t3-chave.json")).itens;
    const cardX0 = chaveOrig.find(i => i.id === X0)!.cardIdOriginal;
    const cx = pkg0.cards.find(c => c.id === cardX0)!;
    cx.reportedEvidence = { ...(cx.reportedEvidence ?? {}), finding: { ...(cx.reportedEvidence?.finding ?? {}), references: REFS } };
    const { id: _id, ...corpoX } = cx;
    const cardX = `C-${digest({ context: pkg0.context, body: corpoX, units: pkg0.units })}`;
    const pkg = JSON.parse(JSON.stringify(pkg0).split(cardX0).join(cardX)) as Pkg;
    { const { packageHash: _h, ...corpo } = pkg; pkg.packageHash = digest(corpo); }
    gravarJson(A, "revisao/package.json", pkg);
    const prep = prepararCampanha([A], { validador: val, politica: "1.3.0", checkerAliases: chkAbs });
    for (const [rel, x] of [...prep.arquivosDoJuiz, ...prep.arquivosInternos]) gravar(P13, rel, x);
    const X = lerJson<{ itens: ItemChave[] }>(join(P13, "chave", "fila-t3-chave.json")).itens.find(i => i.cardIdOriginal === cardX)!.id;
    const lote = lerJson<{ cartoes: CartaoCego[] }>(join(P13, "lotes", "lote-01.json"));
    const cartaoX = lote.cartoes.find(c => c.id === X)!;
    // Respostas: as congeladas da 1ª passada (mesmo id: a chave não depende do sha do cartão), salvo X.
    const congeladas = new Map(lerJson<{ respostas: Resposta[] }>(join(ORIG, PASSADA, "respostas", "lote-01.json")).respostas.map(r => [r.id, r]));
    const sug = { trataOFato: "sim", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "nao", qualidade: "invalida" };
    const ref = (id: string, aplicabilidade: string, violada: string, extra: Record<string, unknown> = {}) => ({ id, forca: "obrigatorio", aplicabilidade, violada, ...extra });
    /** X com a primária caindo por citação (não se aplica) e as referências dadas. */
    const rX = (refs: unknown, x: Record<string, unknown> = {}): Resposta => ({ ...congeladas.get(X0)!, norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" },
      sugestao: sug, referencias: refs, ...x }) as unknown as Resposta;
    const resgateREF2 = () => rX([ref("REF1", "nao-aplica", "nao"), ref("REF2", "aplica", "sim")]);
    const semResgate = () => rX([ref("REF1", "nao-aplica", "nao"), ref("REF2", "nao-aplica", "nao")]);
    const primeira = (id: string): Resposta => (id === X ? resgateREF2() : congeladas.get(id)!);
    const manP = lerJson<{ lotes: { lote: string; sha256: string; ids: string[] }[] }>(join(P13, "lotes", "manifesto.json"));
    for (const l of manP.lotes) gravarJson(P13, `respostas/${l.lote}.json`, { formato: FORMATO_RESPOSTAS_CAMPANHA_1_3, lote: l.lote, loteSha256: l.sha256, juiz: "1ª passada congelada (ensaio) + X sintético",
      respostas: l.ids.map(id => ({ ...primeira(id), id })) });
    const gravarIngestao = (dir: string, politica?: "1.2.0" | "1.3.0") => { const r = ingerir(dir, politica ? { politica } : {}); assert.deepEqual(r.erros, []);
      gravar(dir, "julgamentos.json", r.texto!); gravar(dir, "julgamentos.json.sha256", `${sha(r.texto!)}  julgamentos.json\n`); return r; };

    await t("preparação 1.3.0: X mostra REF1/REF2 (citáveis), o resto dos cartões igual ao da passada congelada; manifesto/LEIAME 1.3.0", () => {
      assert.deepEqual(cartaoX.referencias!.map(r => [r.id, r.regra]), [["REF1", "emag:6.2"], ["REF2", "wcag:4.1.2"]]);
      assert.ok(cartaoX.citaveis.includes("REF2"));
      const velhos = new Map(lerJson<{ cartoes: CartaoCego[] }>(join(ORIG, PASSADA, "lotes", "lote-01.json")).cartoes.map(c => [c.id, c]));
      for (const c of lote.cartoes.filter(c => c.id !== X)) assert.equal(JSON.stringify(c), JSON.stringify(velhos.get(c.id)), c.id);
      assert.ok(prep.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!.includes("### `referencias`"));
    });
    let p!: Passada;
    await t("ingestão 1.3.0: X resgatado pela REF2 (credita A-01) com proveniência; os demais derivados iguais aos da passada congelada; lerPassada lê 1.3.0", () => {
      const r = gravarIngestao(P13);
      const js = (r.julgamentos as { julgamentos: { id: string; derivado: Derivado }[] }).julgamentos;
      const dX = js.find(j => j.id === X)!.derivado;
      assert.deepEqual([dX.classe, dX.spec, dX.fundamentacao, dX.citacaoPor], ["violacao-pagina", "A-01", "norma", "REF2"]);
      assert.deepEqual(dX.citacao, { regraCitada: "wcag:2.4.3", primaria: { forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" },
        referencia: { id: "REF2", regra: "wcag:4.1.2", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" } });
      const velhos = new Map(lerJson<{ julgamentos: { id: string; derivado: Derivado }[] }>(join(ORIG, PASSADA, "julgamentos.json")).julgamentos.map(j => [j.id, j.derivado]));
      for (const j of js.filter(j => j.id !== X)) assert.deepEqual(j.derivado, velhos.get(j.id), j.id);
      p = lerPassada(P13, { analises: [A] });
      assert.deepEqual([p.politica, p.v13, p.mascara13], ["1.3.0", true, true]);
    });
    await t("consistência roda na passada 1.3.0", () => { assert.ok(consistencia(p).relatorio); });

    // ── confiabilidade: j1 = 1ª passada; j2 = sem resgate em X (REF2 julgada não aplicável)
    const R = join(raiz, "revisao-13"), am = join(R, "confiabilidade");
    const respostasJuiz = (amDir: string, j: string, f: (idOriginal: string) => Resposta) => {
      const man = lerJson<{ formatoRespostas: string; amostras: { amostra: string; sha256: string; ids: string[] }[] }>(join(amDir, "manifesto.json"));
      const chave = lerJson<{ itens: { id: string; idOriginal: string }[] }>(join(amDir, "chave", "amostra-chave.json"));
      for (const a of man.amostras) gravarJson(amDir, `respostas/${a.amostra}-${j}.json`, { formato: man.formatoRespostas, lote: a.amostra, loteSha256: a.sha256, juiz: `sintético ${j}`,
        respostas: a.ids.map(id => ({ ...f(chave.itens.find(i => i.id === id)!.idOriginal), id })) });
    };
    let med!: ReturnType<typeof medirConfiabilidade>;
    await t("amostra 1.3.0: o juiz recebe o cartão com as referências, o esquema com `referencias` e o formato 1.3.0", () => {
      const pr = prepararAmostra(p, { n: p.membros.length });
      gravarImutavel(am, [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      const esq = readFileSync(join(am, "lotes", "esquema-respostas-amostra.schema.json"), "utf8");
      assert.ok(esq.includes('"referencias"') && esq.includes('"REF2"'));
      const m = lerJson<{ formatoRespostas: string; politica: string }>(join(am, "manifesto.json"));
      assert.deepEqual([m.formatoRespostas, m.politica], [FORMATO_RESPOSTAS_CAMPANHA_1_3, "politica-normativa-1.3.0"]);
      const lotes = readdirSync(join(am, "lotes")).filter(f => /^amostra-\d{2}\.json$/.test(f)).map(f => lerJson<{ politica: string; cartoes: CartaoCego[] }>(join(am, "lotes", f)));
      assert.ok(lotes.every(l => l.politica === "politica-normativa-1.3.0"));
      assert.equal(lotes.flatMap(l => l.cartoes).filter(c => c.referencias?.length).length, 1);
    });
    await t("medir: j1 (resgate REF2) e j2 (sem resgate) validados e derivados na 1.3.0 — a revisão não ignora REF1/REF2; X vai ao desacordo (classe/crédito)", () => {
      respostasJuiz(am, "j1", primeira);
      respostasJuiz(am, "j2", id => (id === X ? semResgate() : primeira(id)));
      med = medirConfiabilidade(p, am);
      assert.deepEqual(med.erros, []);
      const j1 = med.julgamentos.find(j => j.juiz === "j1" && j.idOriginal === X)!, j2 = med.julgamentos.find(j => j.juiz === "j2" && j.idOriginal === X)!;
      assert.deepEqual([j1.derivado.classe, j1.derivado.citacaoPor], ["violacao-pagina", "REF2"]);
      assert.deepEqual([j2.derivado.classe, j2.derivado.citacaoPor], ["erro-normativo", undefined]);
      const d = med.desacordos.find(x => x.id === X) as { desacordos: { juiz: string; campos: string[] }[] };
      assert.ok(d && d.desacordos[0].juiz === "j2" && d.desacordos[0].campos.includes("credito"));
    });
    await t("medir: resposta de juiz da revisão sem julgar as referências quando a primária cai é recusada (mesma pergunta da 1ª passada)", () => {
      const am2 = join(R, "confiabilidade-recusa");
      cpSync(am, am2, { recursive: true });
      respostasJuiz(am2, "j2", id => (id === X ? rX(NAO_PERGUNTADO) : primeira(id)));
      assert.match(medirConfiabilidade(p, am2).erros.join(), /julgue cada referência/);
    });

    // ── adjudicação
    const congelar = () => {
      const jTxt = jsonTexto({ formato: "x", julgamentos: med.julgamentos }), dTxt = jsonTexto({ formato: "x", cartoes: med.desacordos });
      gravarImutavel(am, [["julgamentos-confiabilidade.json", jTxt], ["desacordos.json", dTxt],
        ["relatorio-confiabilidade.json", jsonTexto({ ...med.relatorio!, congelados: { "julgamentos-confiabilidade.json": sha(jTxt), "desacordos.json": sha(dTxt) } })]]);
    };
    const dd = join(R, "adjudicacao");
    const chaveAdj = () => lerJson<{ unidades: { id: string; lote: string; membros: { id: string; idOriginal: string }[] }[] }>(join(dd, "chave", "adjudicacao-chave.json"));
    const manAdj = () => lerJson<{ lotes: { lote: string }[] }>(join(dd, "manifesto.json"));
    const etapa = (lote: string, e: "a" | "b", f: (idO: string) => unknown) => {
      const u = chaveAdj().unidades.find(x => x.lote === lote)!;
      const loteTxt = readFileSync(join(dd, "lotes", e === "a" ? `${lote}.json` : `${lote}-b.json`), "utf8");
      const rs = u.membros.map(m => ({ ...(f(m.idOriginal) as Resposta), id: m.id }));
      const n0 = rs[0].norma === NAO_PERGUNTADO ? null : rs[0].norma;
      const leitura = n0 ? { norma: n0.id, fonteEVersao: "WCAG 2.2 / e-MAG 3.1", forca: n0.forca, antecedente: "quando o elemento existe", excecoes: "nenhuma conhecida",
        evidenciaNecessaria: "medida da página congelada", permiteConcluir: "a violação no estado da receita" } : NAO_PERGUNTADO;
      gravar(dd, `respostas/${lote}-${e}.json`, jsonTexto({ formato: e === "a" ? FORMATO_ADJ_RESP_A : FORMATO_ADJ_RESP_B, lote: e === "a" ? lote : `${lote}-b`, loteSha256: sha(loteTxt),
        juiz: "adjudicador sintético", etapa: e, grupo: u.id, leituraDaNorma: leitura, respostas: rs,
        ...(e === "b" ? { leiturasAlternativasPlausiveis: [], classificacaoDaDivergencia: { tipos: ["interpretacao-normativa"], evidencias: [rs[0].id], justificativa: "sintético: a REF2 vale para o fato do cartão; a regra citada não se aplica." } } : {}) }));
    };
    const loteX = () => chaveAdj().unidades.find(u => u.membros.some(m => m.idOriginal === X))!.lote;
    const idAdjX = () => chaveAdj().unidades.flatMap(u => u.membros).find(m => m.idOriginal === X)!.id;
    await t("adjudicação 1.3.0: X é unidade (gatilho b); lote com as referências, esquemas A/B com `referencias`, LEIAME com a seção R16", () => {
      congelar();
      const pr = prepararAdjudicacao(p, { confiabilidade: am });
      gravarImutavel(dd, [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      assert.ok(pr.unidades.some(u => u.membros.includes(X) && u.gatilhos.includes("b")));
      const le = readFileSync(join(dd, "lotes", "LEIAME-adjudicacao.md"), "utf8");
      assert.ok(le.includes("(política normativa 1.3.0)") && le.includes("Cartões com `referencias`") && le.includes("nunca outra norma"));
      for (const e of ["a", "b"]) assert.ok(readFileSync(join(dd, "lotes", `esquema-adjudicacao-${e}.schema.json`), "utf8").includes('"REF2"'));
      const l = lerJson<{ politica: string; cartoes: CartaoCego[] }>(join(dd, "lotes", `${loteX()}.json`));
      assert.equal(l.politica, "politica-normativa-1.3.0");
      assert.deepEqual(l.cartoes.find(c => c.id === idAdjX())!.referencias!.map(r => r.id), ["REF1", "REF2"]);
      assert.ok(l.cartoes.filter(c => c.id !== idAdjX()).every(c => !c.referencias));
    });
    await t("etapa A + revelar: as leituras anteriores trazem as referências julgadas (resgate da 1ª passada e a recusa do j2), anônimas", () => {
      for (const x of manAdj().lotes) etapa(x.lote, "a", id => (id === X ? semResgate() : primeira(id)));
      for (const x of manAdj().lotes) {
        const r = loteB(p, dd, x.lote);
        assert.deepEqual(r.erros, []);
        gravarImutavel(dd, [[`lotes/${x.lote}-b.json`, r.texto!], [`chave/revelacao-${x.lote}.json`, r.revelacao!]]);
      }
      const b = lerJson<{ leiturasAnteriores: { cartao: string; leituras: { resposta: Resposta }[] }[] }>(join(dd, "lotes", `${loteX()}-b.json`));
      const refs = b.leiturasAnteriores.find(x => x.cartao === idAdjX())!.leituras.map(l => JSON.stringify(l.resposta.referencias)).sort();
      assert.ok(refs.some(x => x.includes('"REF2","forca":"obrigatorio","aplicabilidade":"aplica"')) && refs.some(x => x.includes('"REF2","forca":"obrigatorio","aplicabilidade":"nao-aplica"')));
    });
    const bTodos = (fX: () => unknown) => { for (const x of manAdj().lotes) etapa(x.lote, "b", id => (id === X ? fX() : primeira(id))); };
    const sobX = () => { const r = aplicarAdjudicacao(p, dd); assert.deepEqual(r.erros, []);
      return (JSON.parse(r.arquivos.get("adjudicacao/sobrescritas.json")!) as { sobrescritas: { id: string; depois: { classe: string; credito: string } }[] }).sobrescritas.find(s => s.id === X)!.depois; };
    await t("adjudicação sem fato novo: referência com campo a mais (regra nova) ou id fora do cartão é recusada; primária caindo sem julgar as referências é recusada", () => {
      bTodos(() => rX([ref("REF1", "nao-aplica", "nao"), ref("REF2", "aplica", "sim", { regra: "wcag:1.3.1" })]));
      assert.match(aplicarAdjudicacao(p, dd).erros.join(), /esquema/);
      bTodos(() => rX([ref("REF1", "nao-aplica", "nao"), ref("REF3", "aplica", "sim")]));
      assert.match(aplicarAdjudicacao(p, dd).erros.join(), /esquema/);
      bTodos(() => rX(NAO_PERGUNTADO));
      assert.match(aplicarAdjudicacao(p, dd).erros.join(), /julgue cada referência/);
    });
    await t("referência presa ao mesmo fato, estado e vínculo: estado não alcançado (fato indisponível) ou sem vínculo não ganham crédito pela REF2", () => {
      bTodos(() => rX([ref("REF1", "nao-aplica", "nao"), ref("REF2", "aplica", "sim")], { verdadeFactual: "indisponivel", estadoAlcancado: "nao-alcancado" }));
      assert.equal(sobX().classe, "evidencia-indisponivel");
      bTodos(() => rX([ref("REF1", "nao-aplica", "nao"), ref("REF2", "aplica", "sim")], { vinculo: "nenhum" }));
      const d = sobX();
      assert.equal(d.classe, "violacao-origem-indeterminada"); assert.doesNotMatch(d.credito, /credita/);
    });
    const NOVA = join(raiz, "adjudicada-13");
    await t("aplicar (CLI): a resposta B com a REF2 valendo mantém o resgate; a passada adjudicada é ingerida e relida na 1.3.0, com a proveniência", () => {
      bTodos(resgateREF2);
      assert.equal(silencioso(() => executar(["adjudicacao", "aplicar", "--passada", P13, "--adjudicacao", dd, "--saida", NOVA, "--analise", A])), 0);
      const pa = lerPassada(NOVA, { analises: [A] });
      assert.equal(pa.politica, "1.3.0");
      const d = pa.julgados.get(X)!.derivado;
      assert.deepEqual([d.classe, d.spec, d.citacaoPor, d.citacao?.referencia.regra, d.citacao?.regraCitada], ["violacao-pagina", "A-01", "REF2", "wcag:4.1.2", "wcag:2.4.3"]);
    });

    // ── recálculo e material da autora (proveniência fora do derivado)
    await t("recálculo 1.3.0: rótulo da política, nota das chaves, crédito resgatado chega ao scorer e a proveniência (citada × referência) sai em campos distintos", () => {
      const r = recalcular({ passadas: [NOVA], analises: [A], reamostragens: 200 });
      const j = r.json as { politicas: { principal: string }; notaPolitica?: string; citacoesPorReferencia?: Record<string, unknown>[] };
      assert.equal(j.politicas.principal, "politica-normativa-1.3.0"); assert.ok(j.notaPolitica);
      const c = j.citacoesPorReferencia!.find(x => x.id === X)!;
      assert.deepEqual(c.regraCitada, { cartao: "wcag:2.4.3", achado: "wcag:2.4.3", julgada: { forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" } });
      assert.deepEqual(c.referenciaUsada, { id: "REF2", regra: "wcag:4.1.2", achado: "wcag:4.1.2", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" });
      assert.equal(c.credita, true);
      assert.equal(j.citacoesPorReferencia!.length, 1);
      assert.ok(r.md.includes("## Política 1.3.0 do juiz") && r.md.includes("REF2 wcag:4.1.2 no lugar de wcag:2.4.3"));
      const carga = carregarCampanha({ passadas: [NOVA], analises: [A] }, new Entradas());
      const a = carga.analises[0];
      const cr = creditosDoTrio(a.pkg, julgadosDoTrio(a, carga.derivadoNa), { politica: "1.2.0", reviewer: "teste", fonte: "teste", bracos: carga.bracos });
      assert.ok(cr.porBraco.sem.creditados.includes(X), "o crédito resgatado vira decisão do scorer");
    });
    await t("material da autora 1.3.0: a seleção (e a chave, se X for sorteado) traz a proveniência do resgate; o caso mostra as outras normas; cegueira OK", async () => {
      const m = await prepararMaterial({ passadas: [NOVA], analises: [A], validador: val });
      assert.equal(m.cegueira.resultado, "OK", JSON.stringify(m.cegueira.falhas.slice(0, 3)));
      const s = m.selecao as { paraAutora: { id: string; caso: string; citacao?: unknown }[]; julgadoSoPorLLM: { id: string; citacao?: unknown }[] };
      const esperado = { regraCitada: "wcag:2.4.3", primaria: { forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" },
        referencia: { id: "REF2", regra: "wcag:4.1.2", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" } };
      const sel = s.paraAutora.find(x => x.id === X), so = s.julgadoSoPorLLM.find(x => x.id === X);
      console.log(`       (X ${sel ? `sorteado para a autora: ${sel.caso}` : "julgado só por LLM"})`);
      assert.ok(!!sel !== !!so);
      assert.deepEqual((sel ?? so)!.citacao, esperado);
      assert.ok([...s.paraAutora, ...s.julgadoSoPorLLM].filter(x => x.id !== X).every(x => !("citacao" in x)));
      const arq = new Map(m.arquivos.map(([r, x]) => [r, String(x)]));
      const chave = JSON.parse(arq.get("chave/chave-autora.json")!) as { casos: { id: string; citacao?: unknown }[] };
      if (sel) {
        assert.deepEqual(chave.casos.find(c => c.id === X)!.citacao, esperado);
        assert.ok(arq.get("autora/casos.md")!.includes("Outras normas que o cartão cita para o mesmo fato"));
        assert.ok(arq.get("autora/LEIAME.md")!.includes("outras normas que o cartão cita para o mesmo fato"));
      } else assert.ok(chave.casos.every(c => !("citacao" in c)) && !arq.get("autora/casos.md")!.includes("Outras normas"));
      // O caso de X como a autora o leria (mesma função do material), e a conferência de cegueira sobre ele.
      const tela = lerJson<{ referencias: Record<string, Tela> }>(join(P13, "lotes", "lote-01.json")).referencias[cartaoX.tela];
      const caso = casoMd("R-01", { ...cartaoX, id: "R-01" }, tela);
      assert.ok(caso.includes("**Outras normas que o cartão cita para o mesmo fato**") && caso.includes("- REF1: ") && caso.includes("- REF2: ") && caso.includes("wcag:4.1.2"));
      const le = leiameAutora({ n: 1, tela, servir: null, referencias: true });
      assert.ok(le.includes("outras normas que o cartão cita para o mesmo fato") && !leiameAutora({ n: 1, tela, servir: null }).includes("outras normas que o cartão cita"));
      const cg = m.conferir([["autora/LEIAME.md", le], ["autora/casos.md", caso]], []);
      assert.equal(cg.resultado, "OK", JSON.stringify(cg.falhas.slice(0, 3)));
    });

    // ── controle: a mesma passada lida na política 1.2.0
    await t("controle 1.2.0: a mesma passada reingerida na 1.2.0 nunca cria resgate — nem na ingestão, nem na revisão (juiz com a REF2 valendo)", () => {
      const P12 = join(raiz, "passada-13-lida-1.2.0");
      cpSync(P13, P12, { recursive: true, filter: s => !/julgamentos\.json/.test(s) });
      const r = gravarIngestao(P12, "1.2.0");
      const dX = (r.julgamentos as { julgamentos: { id: string; derivado: Derivado }[] }).julgamentos.find(j => j.id === X)!.derivado;
      assert.deepEqual([dX.classe, dX.citacaoPor, dX.spec], ["erro-normativo", undefined, null]);
      const p12 = lerPassada(P12, { analises: [A] });
      assert.equal(p12.politica, "1.2.0");
      const am12 = join(raiz, "revisao-12", "confiabilidade");
      const pr = prepararAmostra(p12, { n: p12.membros.length });
      gravarImutavel(am12, [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      respostasJuiz(am12, "j1", primeira); respostasJuiz(am12, "j2", primeira);
      const m = medirConfiabilidade(p12, am12);
      assert.deepEqual(m.erros, []);
      for (const j of m.julgamentos.filter(x => x.idOriginal === X)) assert.deepEqual([j.derivado.classe, j.derivado.citacaoPor], ["erro-normativo", undefined]);
      assert.equal(lerJson<{ politica: string }>(join(am12, "manifesto.json")).politica, "politica-normativa-1.2.0");
      assert.throws(() => recalcular({ passadas: [NOVA, P12], analises: [A], reamostragens: 50 }), /políticas do juiz diferentes/);
    });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

console.log(`\n${n - falhas}/${n} testes da política 1.3.0 de ponta a ponta passaram${pulados ? ` (${pulados} bloco pulado)` : ""}`);
if (falhas) process.exit(1);
