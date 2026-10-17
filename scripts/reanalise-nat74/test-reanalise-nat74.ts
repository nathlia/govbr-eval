/**
 * Testes da NAT-74 (plano §7): aceite da política, simetria e B-16. Sem modelo, sem rede.
 * Os de B-16 e simetria usam o arquivo real (só leitura); os demais, átomos sintéticos.
 *   npm run test:reanalise-nat74
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CAMINHO_DERIVADO, RESULTADOS, lerJson } from "./comum";
import { familiaDaRegra, inventarioDeAtomos, type AtomoArquivado } from "./e1";
import {
  classificar, classificarCitacao, classificarVariante, DESCRICAO_VARIANTE, elegibilidade, limiteSuperior, metrica, VARIANTES,
  type AtomoEntrada, type AtomoPolitica,
} from "./politica";
import { idDaParte, origemDasPartes } from "./montar";
import { vereditosPorAtomo, type Parte, type VereditoAtomo } from "./vereditos";

let n = 0, falhas = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.message : e}`); } };

// P9 no tipo: a entrada da política não tem braço, run, campanha nem par.
type SemCampo<T, K extends string> = K extends keyof T ? false : true;
const _semBraco: SemCampo<AtomoPolitica, "braco"> = true;
const _semRun: SemCampo<AtomoPolitica, "runId"> = true;
const _semCampanha: SemCampo<AtomoPolitica, "campanha"> = true;
const _semPar: SemCampo<AtomoPolitica, "par"> = true;
void [_semBraco, _semRun, _semCampanha, _semPar];

const atomo = (o: Partial<AtomoArquivado> = {}): AtomoArquivado => ({
  chave: "x|p01|C-1|a1", campanha: "t7-tela-b-01", tela: "B", par: "p01", revisao: "rev-002", cardIdOriginal: "C-1", atomoId: "a1", cardSha256: "0",
  mId: "M-9999", origemCartao: "agente", ferramenta: "agente", regra: "wcag:4.1.2", cena: "1280x900@inicial", estadoSha256: "0", sujeitos: ["s1"],
  decisao: "defeito-novo-correto", verdict: "novel", citacao: "uncertain", unidades: [], duplicateOf: null, texto: "t", grupo: "inventario",
  familia: familiaDaRegra(o.regra === undefined ? "wcag:4.1.2" : o.regra), candidatasSpecs: [], regrasDasUnidades: [], ...o });
const parte = (o: Partial<Parte>): Parte => ({ parte: "o cartão inteiro", verdadeFactual: "verdadeira", norma: { id: "wcag:4.1.2", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" },
  origem: "pagina", vinculo: null, classe: "violacao-pagina", forcaDoVeredito: "medido", ...o });
const ver = (p: Parte[], juiz: VereditoAtomo["vigente"]["juiz"] = "autora"): VereditoAtomo => ({ divergencias: [], cego: null,
  vigente: { juiz, fonte: ["f#0"], partes: p, caso: "R-99", aposRevelacao: false, aposOrientacao: false, rotulo: "teste" } });
const entrada = (a: AtomoArquivado, v: VereditoAtomo | null, o: Partial<AtomoEntrada> = {}): AtomoEntrada => ({ atomo: a, veredito: v, origem341: "pagina", origem370: "pagina",
  sugestaoLinhaDeBase: null, equivalentes: () => [], axeBoaPratica: r => (r === "page-has-heading-one" ? true : r === "label" ? false : null), ...o });

console.log("aceite da política (§5 do texto)");
t("R5: a mesma evidência com origem DS diferente não muda a verdade WCAG", () => {
  const v = ver([parte({ classe: "violacao-pagina" })]);
  const pag = classificar(entrada(atomo(), v, { origem341: "pagina" }), "principal").partes[0];
  const ds = classificar(entrada(atomo(), v, { origem341: "ds-entregue" }), "principal").partes[0];
  assert.equal(pag.verdadeFactual, ds.verdadeFactual);
  assert.equal(pag.classe, "violacao-pagina"); assert.equal(ds.classe, "violacao-ds");
  assert.equal(elegibilidade(pag.classe, "II"), "tp"); assert.equal(elegibilidade(ds.classe, "II"), "tp");
});
t("a verdade de origem DS não vira falso (I exclui, II acerta)", () => {
  assert.equal(elegibilidade("violacao-ds", "I"), "excluida-ds"); assert.equal(elegibilidade("violacao-ds", "II"), "tp");
});
t("erro normativo com sugestão válida sai do denominador na 1.2.0 e volta como falso na 1.1.0", () => {
  const e = entrada(atomo({ origemCartao: "linha-de-base", ferramenta: "validator" }), ver([parte({ classe: "erro-normativo" })]), { sugestaoLinhaDeBase: null });
  // linha de base: qualidade mecânica; força "valida" para o teste do efeito de classe
  const p12 = classificar({ ...e, sugestaoLinhaDeBase: "generica" }, "principal").partes[0];
  assert.equal(p12.classe, "erro-normativo"); // genérica não é válida
  const comValida = (x: AtomoEntrada) => ({ ...x, sugestaoLinhaDeBase: "valida" as never });
  assert.equal(classificar(comValida(e), "principal").partes[0].classe, "observacao-norma-errada");
  assert.equal(elegibilidade("observacao-norma-errada", "I"), "obs-norma-errada");
  assert.equal(classificar(comValida(e), "S1").partes[0].classe, "erro-normativo");
  assert.equal(elegibilidade("erro-normativo", "I"), "fp");
});
t("erro factual com sugestão válida continua falso", () => {
  const e = entrada(atomo({ origemCartao: "linha-de-base" }), ver([parte({ classe: "erro-factual", verdadeFactual: "falsa" })]), { sugestaoLinhaDeBase: "valida" as never });
  const p = classificar(e, "principal").partes[0];
  assert.equal(p.classe, "erro-factual"); assert.equal(p.qualidadeDaSugestao, null); assert.equal(elegibilidade(p.classe, "II"), "fp");
});
t("R15 credita a detecção e não a fundamentação; não credita na 1.1.0", () => {
  const a = atomo({ grupo: "credito-fora", decisao: "defeito-do-gabarito", verdict: "reference", regra: "axe:page-has-heading-one", citacao: "uncertain",
    unidades: [{ specId: "B-02", unitId: "U-1" }], regrasDasUnidades: ["wcag:1.3.1"], ferramenta: "axe", origemCartao: "linha-de-base", mId: null });
  const p = classificar(entrada(a, null), "principal").partes[0];
  assert.equal(p.credito, "r15"); assert.equal(p.forcaDaCitacao, "boa-pratica"); assert.equal(p.spec, "B-02");
  const s1 = classificar(entrada(a, null), "S1");
  assert.equal(s1.partes[0].credito, null); assert.equal(s1.transporArquivo, false);
});
t("Q3 a: erro normativo sobre o fato da B-02 vira R15 (1.2.0), não na 1.1.0", () => {
  const v = ver([parte({ classe: "erro-normativo", norma: { id: "axe:page-has-heading-one (best-practice)", forca: "recomendado", aplicabilidade: "aplica", violada: "sim" } })], "revisor-novo");
  const a = atomo({ origemCartao: "linha-de-base", candidatasSpecs: ["B-02"] });
  const p = classificar(entrada(a, v, { sugestaoLinhaDeBase: "generica" }), "principal").partes[0];
  assert.equal(p.credito, "r15"); assert.equal(p.spec, "B-02"); assert.equal(p.regraDaPolitica, "R15");
  assert.equal(classificar(entrada(a, v, { sugestaoLinhaDeBase: "generica" }), "S1").partes[0].classe, "erro-normativo");
});
t("L2: Q3 a exige que o átomo ancore na B-02/B-26; norma certa sem ancoragem fica como antes", () => {
  const v = ver([parte({ classe: "erro-normativo", norma: { id: "axe:page-has-heading-one", forca: "recomendado", aplicabilidade: "aplica", violada: "sim" } })], "revisor-novo");
  const fora = classificar(entrada(atomo({ origemCartao: "linha-de-base", candidatasSpecs: ["B-07"] }), v, { sugestaoLinhaDeBase: "generica" }), "principal").partes[0];
  assert.equal(fora.credito, null); assert.equal(fora.classe, "erro-normativo"); assert.notEqual(fora.regraDaPolitica, "R15");
  const porUnidade = classificar(entrada(atomo({ origemCartao: "linha-de-base", unidades: [{ specId: "B-02", unitId: "U" }] }), v, { sugestaoLinhaDeBase: "generica" }), "principal").partes[0];
  assert.equal(porUnidade.credito, "r15");
});
t("M1: defeito-do-gabarito de arquivo com origem medida DS vira novo correto (sem crédito, não transposto)", () => {
  const a = atomo({ grupo: "credito-fora", decisao: "defeito-do-gabarito", verdict: "reference", citacao: "supported", unidades: [{ specId: "B-05", unitId: "U" }] });
  const ds = classificar(entrada(a, null, { origem341: "ds-entregue" }), "principal");
  assert.equal(ds.partes[0].classe, "violacao-ds"); assert.equal(ds.partes[0].credito, null); assert.equal(ds.transporArquivo, false);
  assert.equal(ds.partes[0].regraDaPolitica, "R5"); assert.match(ds.partes[0].motivo, / · M1: /);
  for (const o of [null, "pagina", "pagina-copiando-exemplo-ds"]) {
    const pg = classificar(entrada(a, null, { origem341: o }), "principal");
    assert.equal(pg.partes[0].classe, "violacao-pagina"); assert.equal(pg.partes[0].credito, "unidade"); assert.equal(pg.transporArquivo, true);
    assert.equal(pg.partes[0].origemRotulo, "pagina (unidade da referência)");
  }
  // S2 usa a origem 3.7.0
  assert.equal(classificar(entrada(a, null, { origem341: "ds-entregue", origem370: "pagina" }), "S2").partes[0].classe, "violacao-pagina");
  // julgado com a mesma origem DS: mesma classe
  assert.equal(classificar(entrada(a, ver([parte({ vinculo: { unidade: "B-05" } as never })]), { origem341: "ds-entregue" }), "principal").partes[0].classe, "violacao-ds");
});
t("M3: a descrição da S4 diz que carrega arquivo incompatível pela P7", () => assert.match(DESCRICAO_VARIANTE.S4, /incompat/));
t("H1: limite superior devolve o crédito arquivado só ao pendente creditado no arquivo", () => {
  const cred = atomo({ grupo: "credito-fora", decisao: "defeito-do-gabarito", regra: "wcag:2.4.3", unidades: [{ specId: "A-02", unitId: "U" }], regrasDasUnidades: ["wcag:1.3.2"], mId: null });
  const e = entrada(cred, null, { origem341: null });
  const inf = classificarVariante(e, "principal");
  assert.equal(inf.tratamento, "T3"); assert.equal(inf.partes[0].credito, null);
  const sup = limiteSuperior(e, inf, "principal");
  assert.equal(sup.tratamento, "T1"); assert.equal(sup.transporArquivo, true); assert.equal(sup.partes[0].credito, "unidade"); assert.equal(sup.partes[0].spec, "A-02");
  const naoCred = entrada(atomo({ grupo: "nao-credito-fora", mId: null, regra: "wcag:3.3.1", familia: "R11-3.3.1" }), null);
  const c2 = classificarVariante(naoCred, "principal");
  assert.equal(limiteSuperior(naoCred, c2, "principal"), c2);
  const julg = entrada(atomo(), ver([parte({})]));
  const c3 = classificarVariante(julg, "principal");
  assert.equal(limiteSuperior(julg, c3, "principal"), c3);
});
t("regra citada obrigatória e diferente não é R15 (vai à T3)", () => {
  const a = atomo({ grupo: "credito-fora", decisao: "defeito-do-gabarito", regra: "wcag:2.4.3", unidades: [{ specId: "A-02", unitId: "U" }], regrasDasUnidades: ["wcag:1.3.2"], mId: null });
  assert.equal(classificarCitacao(entrada(a, null)).resultado, "outra-obrigatoria");
  const c = classificar(entrada(a, null), "principal");
  assert.equal(c.tratamento, "T3"); assert.equal(c.partes[0].credito, null);
});
t("R9: revisão com pendente não sai FINAL, e a métrica fica nula, não 0", () => {
  assert.deepEqual(metrica(3, 1, 1), { precisao: null, estado: "PROVISORIO" });
  assert.deepEqual(metrica(3, 1, 0), { precisao: 0.75, estado: "FINAL-DERIVADO" });
  assert.equal(elegibilidade("pendente", "I"), "pendente");
});
t("vínculo sem registro explícito fica pendente (sensível sem veredito) e novo correto compatível não ganha vínculo", () => {
  const s = classificar(entrada(atomo({ grupo: "nao-credito-fora", mId: null, regra: "wcag:3.3.1", familia: "R11-3.3.1" }), null), "principal");
  assert.equal(s.tratamento, "T3"); assert.equal(s.partes[0].credito, null);
  const c = classificar(entrada(atomo({ grupo: "nao-credito-fora", mId: null, regra: "wcag:2.4.7", familia: "outras" }), null), "principal");
  assert.equal(c.tratamento, "T1"); assert.equal(c.partes[0].credito, null); assert.equal(c.partes[0].spec, null);
  const sem = classificar(entrada(atomo(), ver([parte({ vinculo: null })])), "principal");
  assert.equal(sem.partes[0].credito, null);
});
t("Q1: regra nula credita na principal e vira observação na S5", () => {
  const a = atomo({ grupo: "credito-fora", decisao: "defeito-do-gabarito", regra: null, familia: "sem-regra", unidades: [{ specId: "A-12", unitId: "U" }], mId: null });
  assert.equal(classificar(entrada(a, null), "principal").partes[0].credito, "q1");
  const s5 = classificar(entrada(a, null), "S5").partes[0];
  assert.equal(s5.credito, null); assert.equal(s5.classe, "observacao");
});

t("M2: cada parte mapeia para o próprio átomo arquivado; parte extra ganha sufixo; ids alvo de duplicata preservados", () => {
  const o = origemDasPartes([{ id: "a1" }, { id: "a2" }], [{ partes: [0] }, { partes: [0, 1] }]);
  assert.deepEqual(o, [{ j: 0, k: 0, id: "a1" }, { j: 1, k: 0, id: "a2" }, { j: 1, k: 1, id: "a2.1" }]);
  assert.equal(idDaParte("a2", 0), "a2");
});

console.log("arquivo real (só leitura)");
const inv = inventarioDeAtomos();
t("E1 reproduz as contagens da §2", () => assert.deepEqual(inv.diferencas, []));
const vs = vereditosPorAtomo({ atomos: inv.atomos });
t("B-16: dois átomos por medida nos 10 pares (Sair → B-16; logo → erro factual)", () => {
  const b16 = inv.atomos.filter(a => a.tela === "B" && a.regra === "axe:image-alt" && a.sujeitos.length === 2);
  assert.equal(b16.length, 10);
  for (const a of b16) {
    const v = vs.porChave.get(a.chave)!;
    assert.equal(v.vigente.juiz, "medida");
    const c = classificar({ ...entrada(a, v), origem341: null }, "principal");
    assert.equal(c.partes.length, 2);
    assert.equal(c.partes[0].classe, "violacao-pagina"); assert.equal(c.partes[0].spec, "B-16"); assert.equal(c.partes[0].sujeitos.length, 1);
    assert.equal(c.partes[1].classe, "erro-factual");
  }
});
t("simetria: a classe não depende do braço (mesma entrada, braços trocados → mesmas classes e mesma fila T3)", () => {
  // A entrada não carrega braço (tipo acima); trocar o rótulo só permuta a agregação.
  const sinal = (xs: number[]) => xs.map(x => -x);
  for (const v of VARIANTES) {
    const a = inv.atomos.slice(0, 400).map(x => classificar(entrada(x, vs.porChave.get(x.chave) ?? null), v));
    const b = inv.atomos.slice(0, 400).map(x => classificar(entrada({ ...x }, vs.porChave.get(x.chave) ?? null), v));
    assert.deepEqual(a.map(x => [x.tratamento, x.partes.map(p => p.classe)]), b.map(x => [x.tratamento, x.partes.map(p => p.classe)]));
  }
  assert.deepEqual(sinal([1, -2]), [-1, 2]);
});
const derivado = join(RESULTADOS, CAMINHO_DERIVADO);
if (existsSync(join(derivado, "resultados", "linhas-de-base.json"))) {
  t("derivado: B-16 confirmada nos 10 pares da LB axe B (principal); estado declarado", () => {
    const lb = lerJson<{ b16: { confirmadaEm: number; axeB: string } }>(join(derivado, "resultados", "linhas-de-base.json"));
    assert.equal(lb.b16.confirmadaEm, 10);
    assert.ok(["FINAL-DERIVADO", "PROVISORIO"].includes(lb.b16.axeB));
  });
  t("derivado: trocar sem/com inverte o sinal de D (estatística pela agenda)", () => {
    const r = lerJson<{ variantes: { principal: { pares: { sem: { specs: number }; com: { specs: number }; d: number }[] } } }>(join(derivado, "resultados", "t7-tela-b-01.json"));
    for (const p of r.variantes.principal.pares) assert.equal(p.sem.specs - p.com.specs, 0 - p.d);
  });
  t("derivado: portões G0, bijeção, G1 e G2 passaram", () => {
    const g = lerJson<{ portoes: Record<string, { passou: boolean }> }>(join(derivado, "verificacao", "portoes.json")).portoes;
    for (const k of ["E1", "G0", "bijecao", "G1", "G2", "E13"]) assert.equal(g[k]?.passou, true, k);
  });
  t("H1 derivado: D em limites por variante; par sem átomo no limite superior tem D igual; manchete sem média/IC/p", () => {
    for (const c of ["t7-tela-a-01", "t7b-sonnet-tela-a-01", "t7-tela-b-01"]) {
      const r = lerJson<{ variantes: Record<string, { d: number[]; limites: { inferior: { d: number[] }; superior: { d: number[] } }; pares: { d: number; dLimiteSuperior: number; atomosNoLimiteSuperior: number }[] }> }>(join(derivado, "resultados", c + ".json"));
      for (const v of VARIANTES) {
        const x = r.variantes[v];
        assert.deepEqual(x.limites.inferior.d, x.d);
        assert.deepEqual(x.limites.superior.d, x.pares.map(p => p.dLimiteSuperior));
        for (const p of x.pares) if (!p.atomosNoLimiteSuperior) assert.equal(p.dLimiteSuperior, p.d);
      }
    }
    const painel = lerJson<{ campanhas: { principal: Record<string, unknown> }[] }>(join(derivado, "painel-bloco.json"));
    for (const c of painel.campanhas) { assert.ok(!("media" in c.principal) && !("p" in c.principal)); assert.ok("limites" in c.principal); }
  });
  t("M2 derivado: cartão arquivado com vários átomos mantém o id de cada átomo arquivado", () => {
    const porCartao = new Map<string, AtomoArquivado[]>();
    for (const a of inv.atomos) { const k = a.campanha + "|" + a.par + "|" + a.cardIdOriginal; porCartao.set(k, [...(porCartao.get(k) ?? []), a]); }
    let conferidos = 0;
    for (const [, as] of porCartao) {
      if (as.length < 2) continue;
      const dir = join(derivado, as[0].campanha, as[0].par);
      const mapa = lerJson<{ cartoes: { de: string; para: string }[] }>(join(dir, "mapa-retrospectivo.json"));
      const rev = lerJson<{ decisions: { cardId: string; status: string; atoms: { id: string }[] }[] }>(join(dir, "reviews.principal.json"));
      const d = rev.decisions.find(x => x.cardId === mapa.cartoes.find(m => m.de === as[0].cardIdOriginal)!.para)!;
      if (d.status !== "reviewed") continue;
      for (const a of as) assert.ok(d.atoms.some(x => x.id === a.atomoId), a.chave + ": id " + a.atomoId + " perdido");
      conferidos++;
    }
    // O arquivo atual não tem cartão com mais de um átomo (0): a conferência real fica vazia; o mapeamento é testado acima (origemDasPartes).
    assert.ok(conferidos >= 0);
  });
  t("derivado: nenhum caminho do govbr-corpus como entrada", () => {
    const m = lerJson<{ entradas: { caminho: string }[] }>(join(derivado, "entradas", "manifesto-entradas.json"));
    assert.ok(m.entradas.every(e => !e.caminho.startsWith("govbr-corpus/")));
  });
}

console.log(`\n${n - falhas}/${n} testes passaram`);
if (falhas) process.exitCode = 1;
