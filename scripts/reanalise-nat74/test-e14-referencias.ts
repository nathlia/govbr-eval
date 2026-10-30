/**
 * [D-156] Testes da política do juiz 1.3.0 (referência secundária do achado) e da tabulação em duas colunas. Chamado de
 * dentro de test-e14-campanha.ts (reusa a análise sintética e o validador sintético de lá). Sem modelo, sem rede.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { gravar, gravarJson, lerJson, sha } from "./comum";
import {
  ESQUEMA_RESPOSTAS_CAMPANHA_1_3, FORMATO_MANIFESTO_CAMPANHA_1_3, FORMATO_RESPOSTAS_CAMPANHA, FORMATO_RESPOSTAS_CAMPANHA_1_3, NAO_PERGUNTADO,
  derivarClasse, validarResposta, type CartaoCego, type ContextoDerivacao, type Resposta,
} from "./e14-comum";
import type { prepararCampanha as Preparar } from "./e14-campanha";
import { referenciasDoAchado } from "./e14-campanha";
import { classeDaSpec, estadoDosBracos, specDetectada, specFundamentada, tabelaMd, tabular, type Coluna, type Julgamento } from "./e14-deteccao";
import { argumentosIngerir, ingerir } from "./e14-ingerir";
import { classificar } from "./politica";
import { proveniencia } from "./recalculo-campanha";

type T = (nome: string, f: () => void) => void;
interface Ctx { t: T; tmp: string; dir: string; valDir: string; aliasesAbs: string; prepararCampanha: typeof Preparar;
  cli: (...a: string[]) => { status: number | null; stderr: string } }

const sug = { trataOFato: "nao", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "invalida" } as const;
const ctxBase = (x: Partial<ContextoDerivacao> = {}): ContextoDerivacao => ({ tipo: "sensivel", citaRegra: true, temEsperado: true, specsDaTela: ["A-01", "A-02"],
  citaveis: ["OBS", "ESP", "REGRA", "NORMA", "REF1", "REF2", "MEDIDA", "A-01", "A-02"], origemMedida: null, classeRegistrada: null, referencias: ["REF1", "REF2"], politica: "1.3.0", ...x });
const ref = (id: "REF1" | "REF2", forca = "obrigatorio", aplicabilidade = "aplica", violada = "sim") => ({ id, forca, aplicabilidade, violada });
const resp = (x: Record<string, unknown> = {}): Resposta => ({ id: "T3-0000000000", verdadeFactual: "verdadeira",
  norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" }, vinculo: { spec: "A-01", relacao: "direta" },
  sugestao: sug, forcaDoVeredito: "medido", evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o fato; a NORMA citada não se aplica a ele.",
  estadoAlcancado: "receita", referencias: [ref("REF1")], ...x }) as unknown as Resposta;
const semRefs = ({ referencias: _r, politica: _p, ...c }: ContextoDerivacao): ContextoDerivacao => c;
const semCampo = ({ referencias: _r, ...r }: Resposta): Resposta => r as Resposta;

export async function testesReferencias(o: Ctx): Promise<void> {
  const { t } = o;
  console.log("E14 campanha 1.3.0 (D-156): referência secundária e política do juiz 1.3.0");

  t("referência julgada aplicável e violada resgata a citação que caiu (não se aplica / não violada): classe e crédito da primária correta, citacaoPor", () => {
    const d = derivarClasse(resp(), ctxBase());
    assert.deepEqual([d.classe, d.spec, d.regraDaPolitica, d.fundamentacao, d.citacaoPor], ["violacao-pagina", "A-01", "R7", "norma", "REF1"]);
    const d2 = derivarClasse(resp({ referencias: [ref("REF1", "obrigatorio", "nao-aplica", "nao"), ref("REF2")] }), ctxBase());
    assert.equal(d2.citacaoPor, "REF2", "na ordem do achado; a primeira que dá violação decide");
    const fraca = derivarClasse(resp({ referencias: [ref("REF1", "recomendado")] }), ctxBase());
    assert.deepEqual([fraca.classe, fraca.regraDaPolitica, fraca.fundamentacao, fraca.citacaoPor], ["violacao-pagina", "R15", "mais-fraca", "REF1"]);
    const so = derivarClasse(resp({ norma: { id: "citada", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } }), ctxBase({ forcasDaCitada: ["nenhuma"] }));
    assert.equal(so.citacaoPor, "REF1", "regra citada que só permite (R11a) também cai por citação");
    const semVinc = derivarClasse(resp({ vinculo: "nenhum" }), ctxBase());
    assert.deepEqual([semVinc.classe, semVinc.spec, semVinc.citacaoPor], ["violacao-origem-indeterminada", null, "REF1"], "sem vínculo: violação sem crédito");
  });
  t("referência nunca resgata fato: fato falso, indisponível ou indeterminado ignora as referências", () => {
    for (const [v, classe] of [["falsa", "erro-factual"], ["indisponivel", "evidencia-indisponivel"], ["indeterminado", "pendente"]] as const) {
      const d = derivarClasse(resp({ verdadeFactual: v }), ctxBase());
      assert.equal(d.classe, classe, v); assert.equal(d.citacaoPor, undefined, v); assert.equal(d.spec, null, v);
    }
  });
  t("referência não sobrepõe primária válida nem incerta; referência que não vale deixa a classe da primária", () => {
    const ok = resp({ norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, referencias: [ref("REF1", "recomendado")] });
    assert.deepEqual(derivarClasse(ok, ctxBase()), derivarClasse(semCampo(ok), semRefs(ctxBase())));
    const inc = resp({ norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "incerta", violada: "incerto" } });
    assert.equal(derivarClasse(inc, ctxBase()).classe, "evidencia-indisponivel");
    for (const rs of [[ref("REF1", "obrigatorio", "nao-aplica", "nao")], [ref("REF1", "obrigatorio", "incerta", "incerto")], [ref("REF1", "indeterminado")],
      [ref("REF1", "nenhuma", NAO_PERGUNTADO, NAO_PERGUNTADO)], [ref("REF1", "recomendado")]]) {
      const r = resp({ referencias: rs, ...(rs[0].forca === "recomendado" ? { vinculo: "nenhum" } : {}) });
      assert.deepEqual(derivarClasse(r, ctxBase()), derivarClasse(semCampo(r), semRefs(ctxBase())), JSON.stringify(rs));
    }
    assert.deepEqual(derivarClasse(resp({ referencias: NAO_PERGUNTADO }), ctxBase()).classe, "erro-normativo");
  });
  t("política 1.2.0 ignora as referências (mesma derivação que sem elas); cartão sem referência: derivação idêntica, sem citacaoPor", () => {
    for (const r of [resp(), resp({ referencias: [ref("REF1", "recomendado")] }), resp({ verdadeFactual: "falsa" })])
      assert.deepEqual(derivarClasse(r, ctxBase({ politica: "1.2.0" })), derivarClasse(semCampo(r), semRefs(ctxBase())));
    const r0 = semCampo(resp());
    const d0 = derivarClasse(r0, semRefs(ctxBase())), d13 = derivarClasse(r0, { ...semRefs(ctxBase()), politica: "1.3.0" });
    assert.deepEqual(d13, d0); assert.ok(!("citacaoPor" in d0) && !JSON.stringify(d0).includes("citacaoPor"));
  });
  t("validação 1.3.0: lista exigida quando a primária cai por citação; um item por referência; neutro só com forca nenhuma; campo só onde há referência", () => {
    const v13 = { normaNeutra: true, v12: true, v13: true };
    assert.deepEqual(validarResposta(resp(), ctxBase({ referencias: ["REF1"] }), v13), []);
    assert.match(validarResposta(resp({ referencias: NAO_PERGUNTADO }), ctxBase({ referencias: ["REF1"] }), v13).join(), /julgue cada referência/);
    assert.match(validarResposta(resp(), ctxBase(), v13).join(), /julgue REF2 exatamente uma vez/);
    assert.match(validarResposta(resp({ referencias: [ref("REF1"), ref("REF1")] }), ctxBase({ referencias: ["REF1"] }), v13).join(), /exatamente uma vez/);
    assert.match(validarResposta(resp({ referencias: [ref("REF1", "nenhuma")] }), ctxBase({ referencias: ["REF1"] }), v13).join(), /nao-perguntado/);
    assert.match(validarResposta(resp({ referencias: [ref("REF1", "obrigatorio", NAO_PERGUNTADO, NAO_PERGUNTADO)] }), ctxBase({ referencias: ["REF1"] }), v13).join(), /fora da lista/);
    const okPrim = resp({ norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, sugestao: NAO_PERGUNTADO, referencias: NAO_PERGUNTADO });
    assert.deepEqual(validarResposta(okPrim, ctxBase({ referencias: ["REF1"] }), v13), [], "primária válida: nao-perguntado basta");
    assert.match(validarResposta(resp(), ctxBase({ referencias: ["REF1"] }), { normaNeutra: true, v12: true }).join(), /campo desconhecido: referencias/, "1.2.0 não conhece o campo");
    assert.match(validarResposta(resp(), semRefs(ctxBase()), v13).join(), /campo desconhecido: referencias/, "cartão sem referência não tem o campo");
    assert.deepEqual(validarResposta(semCampo(resp()), semRefs(ctxBase()), v13), [], "cartão sem referência: resposta igual à 1.2.0");
    const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(ESQUEMA_RESPOSTAS_CAMPANHA_1_3);
    const doc = (r: unknown) => ({ formato: FORMATO_RESPOSTAS_CAMPANHA_1_3, lote: "lote-01", loteSha256: "a".repeat(64), juiz: "teste", respostas: [r] });
    assert.ok(ajv(doc({ ...resp(), id: "T3-0123456789" })), JSON.stringify(ajv.errors));
    assert.ok(!ajv(doc({ ...resp({ referencias: [ref("REF1", "nenhuma")] }), id: "T3-0123456789" })), "esquema: forca nenhuma exige o neutro");
    assert.ok(ajv(doc({ ...semCampo(resp()), id: "T3-0123456789" })), "esquema: campo opcional");
  });
  t("referências do achado: só agente, só textos, sem repetir a rule, até 2", () => {
    const c = (references: unknown, origin = "agente", rule: string | null = "wcag:1.3.1") => ({ origin, rule, reportedEvidence: { finding: { references } } }) as never;
    assert.deepEqual(referenciasDoAchado(c(["emag:6.2", "wcag:1.3.1", "emag:6.2", " ds:x ", "wcag:4.1.2"])), ["emag:6.2", "ds:x"]);
    assert.deepEqual(referenciasDoAchado(c(["emag:6.2"], "linha-de-base")), []);
    assert.deepEqual(referenciasDoAchado(c("emag:6.2")), []); assert.deepEqual(referenciasDoAchado(c([1, ""])), []);
    assert.deepEqual(referenciasDoAchado({ origin: "agente", rule: null, reportedEvidence: null } as never), []);
  });
  t("classe da spec pela categories (vocabulário fixo): DS só com token/estrutura; categoria desconhecida para", () => {
    assert.equal(classeDaSpec(["token"]), "ds"); assert.equal(classeDaSpec(["estrutura", "token"]), "ds");
    assert.equal(classeDaSpec(["token", "acessibilidade"]), "geral"); assert.equal(classeDaSpec(["navegacao"]), "geral");
    assert.throws(() => classeDaSpec(["outra"]), /vocabulário/); assert.throws(() => classeDaSpec([]), /sem categories/);
  });

  // ── preparação 1.3.0 + ingestão + tabulação, sobre a análise sintética
  const raiz13 = join(o.tmp, "d13"), dir13 = join(raiz13, "trio-01");
  mkdirSync(raiz13, { recursive: true }); cpSync(o.dir, dir13, { recursive: true });
  const pkg = lerJson<{ cards: { id: string; reportedEvidence: unknown }[] }>(join(dir13, "revisao", "package.json"));
  for (const c of pkg.cards) if (c.id === "C-aaaa") c.reportedEvidence = { finding: { references: ["emag-2.2", "wcag:1.3.1"] } };
  gravarJson(dir13, "revisao/package.json", pkg);
  const opts = { validador: o.valDir, checkerAliases: o.aliasesAbs };
  const p12o = o.prepararCampanha([o.dir], { ...opts, politica: "1.2.0" }), p12 = o.prepararCampanha([dir13], { ...opts, politica: "1.2.0" });
  const p13 = o.prepararCampanha([dir13], opts);
  const lote = (p: ReturnType<typeof Preparar>) => JSON.parse(p.arquivosDoJuiz.get("lotes/lote-01.json")!) as { politica: string; cartoes: CartaoCego[] };
  const chave = JSON.parse(p13.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: { id: string; chave: string; braco: string; cardIdOriginal: string; tipo: string }[] };
  const idDe = (orig: string) => chave.itens.find(i => i.cardIdOriginal === orig)!.id;

  t("preparação 1.3.0 (padrão): cartão com referências mostra REF1 (rule repetida sai), citável; os demais cartões iguais aos da 1.2.0; formatos e LEIAME 1.3.0", () => {
    const l13 = lote(p13), l12 = lote(p12o);
    const a = l13.cartoes.find(c => c.id === idDe("C-aaaa"))!;
    assert.equal(a.referencias?.length, 1); assert.equal(a.referencias![0].id, "REF1"); assert.equal(a.referencias![0].regra, "emag:2.2");
    assert.equal(a.referencias![0].norma?.fonte, "e-MAG 3.1"); assert.ok(a.citaveis.includes("REF1"));
    for (const c of l13.cartoes.filter(x => x.id !== a.id)) assert.deepEqual(c, l12.cartoes.find(x => x.id === c.id), `cartão sem referência mudou: ${c.id}`);
    assert.ok(l13.cartoes.filter(x => x.id !== a.id).every(c => !("referencias" in c)));
    assert.equal(l13.politica, "politica-normativa-1.3.0");
    const m = JSON.parse(p13.arquivosInternos.get("lotes/manifesto.json")!) as { formato: string; versao: string; politica: string; cartoesComReferencias: number; respostas: { formato: string } };
    assert.deepEqual([m.formato, m.versao, m.politica, m.cartoesComReferencias, m.respostas.formato],
      [FORMATO_MANIFESTO_CAMPANHA_1_3, "nat78-primeira-passada-1.4.0", "politica-normativa-1.3.0", 1, FORMATO_RESPOSTAS_CAMPANHA_1_3]);
    const le = p13.arquivosDoJuiz.get("lotes/LEIAME-juiz.md")!;
    for (const x of ["### `referencias`", "política normativa 1.3.0", FORMATO_RESPOSTAS_CAMPANHA_1_3, "(R16)"]) assert.ok(le.includes(x), x);
    assert.ok(!le.includes("política normativa 1.2.0") && !le.includes(`"${FORMATO_RESPOSTAS_CAMPANHA}"`));
    assert.deepEqual(p13.cegueira.falhas, []); assert.deepEqual(p13.falhasTrio, []);
  });
  t("preparação 1.2.0 é a de sempre: referências do achado ignoradas, lotes e LEIAME byte a byte iguais aos de um pacote sem referências", () => {
    for (const k of ["lotes/lote-01.json", "lotes/LEIAME-juiz.md", "lotes/esquema-respostas.schema.json"]) assert.equal(p12.arquivosDoJuiz.get(k), p12o.arquivosDoJuiz.get(k), k);
  });

  const fila13 = join(o.tmp, "fila-13");
  for (const [rel, x] of [...p13.arquivosDoJuiz, ...p13.arquivosInternos]) gravar(fila13, rel, x);
  const l13 = lote(p13), loteTxt = p13.arquivosDoJuiz.get("lotes/lote-01.json")!;
  const respostas = l13.cartoes.map(c => c.id === idDe("C-aaaa")
    ? { ...resp(), id: c.id, evidencias: ["MEDIDA", "REF1"], justificativa: "MEDIDA confirma o fato; a REF1 vale onde a NORMA citada não se aplica." }
    : { id: c.id, verdadeFactual: "indeterminado",
      norma: c.alegacao.regra === null ? { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } : { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" },
      vinculo: "indeterminado", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "incerto", evidencias: ["MEDIDA"], justificativa: "MEDIDA não decidiu o fato neste teste sintético.", estadoAlcancado: "receita" });
  gravarJson(fila13, "respostas/lote-01.json", { formato: FORMATO_RESPOSTAS_CAMPANHA_1_3, lote: "lote-01", loteSha256: sha(loteTxt), juiz: "teste sintético", respostas });

  t("ingestão 1.3.0: a referência resgata o cartão (citacaoPor), contado em citacaoPor; --politica 1.2.0 sobre a mesma passada deixa erro normativo", () => {
    const r = ingerir(fila13); assert.deepEqual(r.erros, []);
    const j = r.julgamentos as { politica: string; citacaoPor: Record<string, number>; julgamentos: Julgamento[] };
    assert.equal(j.politica, "politica-normativa-1.3.0"); assert.deepEqual(j.citacaoPor, { primaria: l13.cartoes.length - 1, REF1: 1 });
    const a = j.julgamentos.find(x => x.id === idDe("C-aaaa"))!;
    assert.deepEqual([a.derivado.classe, a.derivado.spec, a.derivado.citacaoPor], ["violacao-pagina", "A-01", "REF1"]);
    const r12 = ingerir(fila13, { politica: "1.2.0" }); assert.deepEqual(r12.erros, []);
    const j12 = r12.julgamentos as { politica: string; citacaoPor?: unknown; julgamentos: Julgamento[] };
    assert.equal(j12.politica, "politica-normativa-1.2.0"); assert.equal(j12.citacaoPor, undefined);
    assert.equal(j12.julgamentos.find(x => x.id === idDe("C-aaaa"))!.derivado.classe, "erro-normativo");
    // tabulação: detecção e fundamentada pela referência (braço do C-aaaa: sem)
    const braco = new Map(chave.itens.map(i => [i.chave, i.braco]));
    const tab = tabular(j.julgamentos, k => braco.get(k)!, [{ id: "A-01", categories: ["formulario", "acessibilidade"] }], j.politica, ["sem", "ferramentas", "com"]);
    assert.deepEqual(tab.porBraco.sem!.deteccao, ["A-01"]); assert.deepEqual(tab.porBraco.sem!.fundamentada, ["A-01"]);
    assert.deepEqual(tab.porBraco.sem!.viaReferencia.map(v => v.referencia), ["REF1"]); assert.equal(tab.porBraco.sem!.porClasse.geral.deteccao, 1);
    const tab12 = tabular(j12.julgamentos, k => braco.get(k)!, [{ id: "A-01", categories: ["formulario", "acessibilidade"] }], j12.politica, ["sem", "ferramentas", "com"]);
    assert.deepEqual([tab12.porBraco.sem!.deteccao, tab12.porBraco.sem!.fundamentada], [[], []]);
    assert.deepEqual(specFundamentada(a), { spec: "A-01", via: "REF1" });
  });
  t("ingestão: --politica 1.3.0 sobre passada 1.2.0 sem referências deriva igual; --politica 1.2.0 = saída padrão byte a byte", () => {
    const f = join(o.tmp, "fila"); // a passada 1.2.0 que test-e14-campanha já ingeriu
    const pad = ingerir(f, { refazer: true }), r12 = ingerir(f, { refazer: true, politica: "1.2.0" }), r13 = ingerir(f, { refazer: true, politica: "1.3.0" });
    assert.equal(r12.texto, pad.texto);
    const d = (x: typeof pad) => (x.julgamentos as { julgamentos: Julgamento[] }).julgamentos.map(j => j.derivado);
    assert.deepEqual(d(r13), d(pad)); assert.equal((r13.julgamentos as { politica: string }).politica, "politica-normativa-1.3.0");
  });
  t("CLI --gravar-em grava julgamentos + origem.json numa pasta NOVA sem tocar na passada; pasta existente e --politica sem --fila recusados", () => {
    const novo = join(o.tmp, "reingestao-13");
    const antes = existsSync(join(fila13, "julgamentos.json"));
    const x = o.cli("--fila", fila13, "--politica", "1.3.0", "--gravar-em", novo);
    assert.equal(x.status, 0, x.stderr);
    assert.equal(existsSync(join(fila13, "julgamentos.json")), antes, "a passada não foi tocada");
    const txt = readFileSync(join(novo, "julgamentos.json"), "utf8");
    assert.equal(readFileSync(join(novo, "julgamentos.json.sha256"), "utf8"), `${sha(txt)}  julgamentos.json\n`);
    const og = lerJson<{ politica: string; julgamentosSha256: string }>(join(novo, "origem.json"));
    assert.deepEqual([og.politica, og.julgamentosSha256], ["politica-normativa-1.3.0", sha(txt)]);
    assert.equal(o.cli("--fila", fila13, "--gravar-em", novo).status, 1, "pasta existente recusada");
    assert.match(argumentosIngerir(["--politica", "1.3.0"]).erro!, /só com --fila/);
    assert.match(argumentosIngerir(["--fila", "a", "--politica", "9.9.9"]).erro!, /desconhecida/);
    assert.deepEqual(argumentosIngerir(["--fila", "a"]), { fila: argumentosIngerir(["--fila", "a"]).fila, refazer: false, erro: null });
  });

  // ── revisão Codex (NAT-112): fundamentada ⊆ detecção, política explícita, proveniência, braços sem achado
  const jul = (r: Resposta, c: ContextoDerivacao, id = "T3-0000000001"): Julgamento => ({ id, chave: `k|${id}`, resposta: r, derivado: derivarClasse(r, c) });
  const prim = (forca: string, aplicabilidade: string, violada: string) => ({ id: "citada", forca, aplicabilidade, violada });
  const c0 = semRefs(ctxBase()), r0 = (x: Record<string, unknown> = {}) => semCampo(resp(x));
  t("fundamentada: negativos — norma inaplicável (Codex: nao-aplica + violada sim), incerta, origem DS, pendente, vínculo sem crédito, Q1; e R15 conta (sem exigir força obrigatória)", () => {
    const ambos = (j: Julgamento) => [specDetectada(j.derivado), specFundamentada(j)?.spec ?? null];
    assert.deepEqual(ambos(jul(r0({ norma: prim("obrigatorio", "nao-aplica", "sim") }), c0)), [null, null], "inaplicável");
    assert.deepEqual(ambos(jul(r0({ norma: prim("obrigatorio", "incerta", "sim") }), c0)), [null, null], "aplicabilidade incerta");
    assert.deepEqual(ambos(jul(r0({ norma: prim("obrigatorio", "aplica", "incerto") }), c0)), [null, null], "violação incerta");
    const ds = jul(r0({ norma: prim("obrigatorio", "aplica", "sim") }), { ...c0, origemMedida: "ds-entregue" });
    assert.equal(ds.derivado.classe, "violacao-ds"); assert.deepEqual(ambos(ds), [null, null], "origem DS (P3)");
    assert.deepEqual(ambos(jul(r0({ norma: prim("obrigatorio", "aplica", "sim"), vinculo: "indeterminado" }), c0)), [null, null], "vínculo indeterminado (pendente)");
    assert.deepEqual(ambos(jul(r0({ verdadeFactual: "indeterminado", norma: prim("obrigatorio", "aplica", "sim") }), c0)), [null, null], "fato indeterminado (pendente)");
    assert.deepEqual(ambos(jul(r0({ norma: prim("recomendado", "aplica", "sim"), vinculo: "nenhum" }), c0)), [null, null], "R15 sem vínculo = erro normativo");
    const forjado: Julgamento = { id: "T3-x", chave: "k", resposta: r0({ norma: prim("obrigatorio", "aplica", "sim") }),
      derivado: { classe: "violacao-pagina", regraDaPolitica: "R7", spec: "A-01", qualidadeDaSugestao: null, pendencias: [], fundamentacao: null, s5: { classe: "violacao-pagina", regraDaPolitica: "R7", spec: "A-01" } } };
    assert.deepEqual(ambos(forjado), [null, null], "vínculo sem crédito (fundamentação nula)");
    assert.equal(specFundamentada({ ...jul(r0({ norma: prim("obrigatorio", "aplica", "sim") }), c0), resposta: r0({ norma: prim("obrigatorio", "aplica", "sim"), vinculo: { spec: "A-02", relacao: "direta" } }) }), null, "vínculo a outra spec");
    const q1 = jul(r0({ norma: { id: "nenhuma", forca: "nenhuma", aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } }), { ...c0, citaRegra: false });
    assert.deepEqual(ambos(q1), ["A-01", null], "Q1: detecção sem fundamentação");
    assert.deepEqual(ambos(jul(r0({ norma: prim("recomendado", "aplica", "sim") }), c0)), ["A-01", "A-01"], "R15 com vínculo é fundamentada (decisão da autora; sem força obrigatória)");
    assert.deepEqual(ambos(jul(r0({ norma: prim("obrigatorio", "aplica", "sim") }), c0)), ["A-01", "A-01"]);
    // referência: só quando deu a classe
    assert.deepEqual(specFundamentada(jul(resp(), ctxBase())), { spec: "A-01", via: "REF1" });
    assert.deepEqual(specFundamentada(jul(resp({ norma: prim("obrigatorio", "aplica", "sim"), referencias: [ref("REF1", "obrigatorio", "nao-aplica", "nao")] }), ctxBase())), { spec: "A-01", via: "primaria" });
    const semRef = jul(resp(), ctxBase());
    assert.throws(() => specFundamentada({ ...semRef, resposta: semCampo(semRef.resposta) }), /citacaoPor REF1 sem o julgamento/);
  });
  t("propriedade fundamentada ⊆ detecção: varredura exaustiva das respostas (fato × força × aplicabilidade × violação × vínculo × origem × referências × política × regra citada)", () => {
    let total = 0, fund = 0;
    const refsOps: unknown[] = [NAO_PERGUNTADO, [ref("REF1")], [ref("REF1", "obrigatorio", "nao-aplica", "nao"), ref("REF2", "recomendado")], [ref("REF1", "obrigatorio", "incerta", "incerto"), ref("REF2", "obrigatorio", "aplica", "nao")]];
    for (const vf of ["verdadeira", "falsa", "indisponivel", "indeterminado"]) for (const forca of ["obrigatorio", "recomendado", "nenhuma", "indeterminado"])
    for (const ap of ["aplica", "nao-aplica", "incerta"]) for (const vi of ["sim", "nao", "incerto"]) for (const vinculo of [{ spec: "A-01", relacao: "direta" }, "nenhum", "indeterminado"])
    for (const origemMedida of [null, "pagina", "ds-entregue", "indeterminada"]) for (const refs of refsOps) for (const politica of ["1.2.0", "1.3.0"] as const) for (const citaRegra of [true, false]) {
      if (forca === "nenhuma" && (ap !== "aplica" || vi !== "sim")) continue;
      const norma = forca === "nenhuma" ? { id: citaRegra ? "citada" : "nenhuma", forca, aplicabilidade: NAO_PERGUNTADO, violada: NAO_PERGUNTADO } : prim(forca, ap, vi);
      const j = jul(resp({ verdadeFactual: vf, norma, vinculo, referencias: refs }), ctxBase({ origemMedida, politica, citaRegra }));
      const d = specDetectada(j.derivado), f = specFundamentada(j);
      total++; if (f) { fund++; assert.equal(f.spec, d, JSON.stringify({ vf, norma, vinculo, origemMedida, refs, politica })); }
      if (politica === "1.2.0") assert.equal(j.derivado.citacaoPor, undefined);
    }
    assert.ok(total > 10000 && fund > 0, `${total} combinações, ${fund} fundamentadas`);
  });
  t("política do juiz explícita: cartão com referências sem política para a derivação; sem referências, nada muda", () => {
    const { politica: _p, ...semPol } = ctxBase();
    assert.throws(() => derivarClasse(resp(), semPol as ContextoDerivacao), /sem a política do juiz declarada/);
    assert.deepEqual(derivarClasse(semCampo(resp()), semRefs(ctxBase())), derivarClasse(semCampo(resp()), { ...semRefs(ctxBase()), politica: "1.2.0" }));
  });
  t("proveniência do resgate: regra citada e julgamento dela × referência usada (id, regra pública, força/aplicabilidade/violação dela), no derivado, na classificação e no texto do recálculo", () => {
    const c = ctxBase({ regraCitada: "wcag:1.3.1", regrasDasReferencias: { REF1: "emag:2.2", REF2: "emag:6.2" } });
    const d = derivarClasse(resp({ referencias: [ref("REF1", "obrigatorio", "nao-aplica", "nao"), ref("REF2", "recomendado")] }), c);
    assert.deepEqual(d.citacao, { regraCitada: "wcag:1.3.1", primaria: { forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" },
      referencia: { id: "REF2", regra: "emag:6.2", forca: "recomendado", aplicabilidade: "aplica", violada: "sim" } });
    assert.equal(derivarClasse(semCampo(resp()), semRefs(ctxBase())).citacao, undefined);
    // politica.ts (classificarT3): normaId = regra da referência, nunca "citada" nem a regra citada; a citada segue a primária
    const r = resp({ referencias: [ref("REF1")] }), dd = derivarClasse(r, ctxBase({ regraCitada: "wcag:1.3.1", regrasDasReferencias: { REF1: "emag:2.2" } }));
    const entrada = (j: { resposta: Resposta; derivado: typeof dd }) => ({ atomo: { chave: "k", sujeitos: ["s1"], regra: "wcag:1.3.1", tela: "A" }, veredito: null, origem341: null, origem370: null,
      sugestaoLinhaDeBase: null, equivalentes: () => [], axeBoaPratica: () => null, t3: { id: "T3-0000000009", tipo: "sensivel", fonte: "teste", ...j } }) as never;
    const p = classificar(entrada({ resposta: r, derivado: dd }), "principal").partes[0];
    assert.deepEqual([p.normaId, p.normaForca, p.normaAplicabilidade, p.normaViolada, p.regraCitada, p.aplicabilidadeDaCitada, p.credito, p.spec],
      ["emag:2.2", "obrigatorio", "aplica", "sim", "wcag:1.3.1", "nao-aplica", "unidade", "A-01"]);
    assert.deepEqual(p.referenciaUsada, { id: "REF1", regra: "emag:2.2", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" });
    const rp = semCampo(resp({ norma: prim("obrigatorio", "aplica", "sim") })), dp = derivarClasse(rp, semRefs(ctxBase()));
    const pp = classificar(entrada({ resposta: rp, derivado: dp }), "principal").partes[0];
    assert.deepEqual([pp.normaId, pp.aplicabilidadeDaCitada, "referenciaUsada" in pp], ["wcag:1.3.1", "aplica", false]);
    assert.match(proveniencia(dd), /referência secundária REF1 \(regra emag:2\.2: força obrigatorio, aplica, violada sim\); a regra citada wcag:1\.3\.1 caiu \(força obrigatorio, nao-aplica, violada nao\)/);
    assert.equal(proveniencia(dp), "");
  });
  t("tabular: todo braço do desenho aparece; coleta válida sem achado = 0; ausente/incompleta como tal (sem número); sem estado para braço vazio, para", () => {
    const js = [jul(r0({ norma: prim("obrigatorio", "aplica", "sim") }), c0, "T3-a"), jul(r0({ norma: prim("obrigatorio", "nao-aplica", "sim") }), c0, "T3-b")];
    const specs = [{ id: "A-01", categories: ["formulario"] }], b = () => "sem", des = ["sem", "ferramentas", "com"];
    assert.throws(() => tabular(js, b, specs, "politica-normativa-1.2.0", des), /sem cartão e sem estado/);
    const tb = tabular(js, b, specs, "politica-normativa-1.2.0", des, { estado: { ferramentas: "valida", com: "ausente" } });
    assert.deepEqual(tb.bracos, des); assert.deepEqual(tb.estado, { sem: "valida", ferramentas: "valida", com: "ausente" });
    assert.deepEqual([tb.porBraco.ferramentas!.cartoes, tb.porBraco.ferramentas!.deteccao, tb.porBraco.ferramentas!.fundamentada], [0, [], []]);
    assert.equal(tb.porBraco.com, null); assert.deepEqual(tb.porBraco.sem!.deteccao, ["A-01"]);
    const md = tabelaMd(tb, "teste");
    assert.ok(md.includes("| **detecção** | **1** | **0** | coleta ausente |"), md);
    assert.ok(md.includes("| coleta | válida | válida | **ausente** |"));
    assert.ok(md.includes("- **com** — coleta ausente: sem contagem (não é zero)"));
    const ti = tabular(js, b, specs, "politica-normativa-1.2.0", des, { estado: { ferramentas: "incompleta", com: "valida" } });
    assert.equal(ti.porBraco.ferramentas, null); assert.equal(ti.porBraco.com!.deteccao.length, 0);
    assert.ok(tabelaMd(ti, "t").includes("| **detecção** | **1** | coleta incompleta | **0** |"));
    assert.throws(() => tabular(js, b, specs, "x", des, { estado: { sem: "ausente", ferramentas: "valida", com: "valida" } }), /com cartões mas coleta ausente/);
    assert.deepEqual(estadoDosBracos([{ id: "r-sem", braco: "sem" }, { id: "r-f", braco: "ferramentas" }, { id: "lb", braco: "lb-axe" }],
      [{ braco: "sem", escolhida: "r-sem" }, { braco: "ferramentas", escolhida: "outra" }, { braco: "com", escolhida: null }], ["sem", "ferramentas", "com", "x"]),
      { sem: "valida", ferramentas: "incompleta", com: "incompleta", x: "ausente", "lb-axe": "valida" });
  });
  t("coluna principal vem da configuração (qualquer das duas); sem ela, o relatório diz que não foi fixada; valor fora da lista para; 1.2.0 com citacaoPor para", () => {
    const js = [jul(r0({ norma: prim("obrigatorio", "aplica", "sim") }), c0, "T3-a")], specs = [{ id: "A-01", categories: ["token"] }];
    const md = (x: Coluna | null) => tabelaMd(tabular(js, () => "sem", specs, "p", ["sem"], { colunaPrincipal: x }), "t");
    assert.match(md(null), /Coluna principal: \*\*ainda não fixada\*\*/);
    assert.ok(md("deteccao").includes("| **detecção** (principal) |") && !md("deteccao").includes("fundamentada** (principal)"));
    assert.ok(md("fundamentada").includes("| **detecção fundamentada** (principal) |"));
    assert.throws(() => tabular(js, () => "sem", specs, "p", ["sem"], { colunaPrincipal: "outra" as Coluna }), /desconhecida/);
    assert.throws(() => tabular([jul(resp(), ctxBase(), "T3-r")], () => "sem", [{ id: "A-01", categories: ["token"] }], "politica-normativa-1.2.0", ["sem"]), /só a 1\.3\.0/);
  });
}
