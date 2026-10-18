/**
 * Testes da consistência, da adjudicação informada e da amostra de confiabilidade da E14 (fila T3). Sem modelo, sem
 * rede. Leem a fila real (só leitura) FIXADA NA 1ª PASSADA: desde a adjudicação (govbr-resultados 1af1c41),
 * `fila-t3/respostas/` guarda as respostas finais e a 1ª passada fica em `respostas-1a-passada/` (com
 * `julgamentos-1a-passada.json`). As unidades de adjudicação, a amostra e a segunda leitura foram congeladas sobre a
 * 1ª passada; com as respostas finais o agrupamento muda e a unidade lote-d05 deixa de existir. Por isso o teste monta
 * uma cópia temporária com `lotes/`, `chave/` e `respostas-1a-passada/` → `respostas/` e confere que ela reproduz o
 * sha256 gravado da 1ª passada. Preparo, revelação e aplicação rodam numa segunda cópia com respostas de adjudicação
 * SINTÉTICAS (não são julgamentos).
 *   npm run test:reanalise-nat74-e14-consistencia
 */
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gravar, sha } from "./comum";
import { inventarioDeAtomos } from "./e1";
import { FILA, NAO_PERGUNTADO, type CartaoCego, type Resposta } from "./e14-comum";
import {
  REGRAS, agrupar, analisar, analisarFila, chaveDeElemento, cohen, concordancia, estadoDe, fleiss, membrosDaFila, julgadosDaFila,
  confiabilidade, prepararAmostra, regraCanonica, sortearAmostra, tipoDeSujeito, type Julgado,
} from "./e14-consistencia";
import { FORMATO_RESP_A, FORMATO_RESP_B, aplicarDesempate, loteB, prepararDesempate, unidadesDeDesempate } from "./e14-desempate";
import { ingerir } from "./e14-ingerir";
import { CORPUS, FORMATO_RESP_2, aplicarComSegunda, prepararSegunda } from "./e14-segunda-leitura";

let n = 0, falhas = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.message : e}`); } };

console.log("E14 consistência: peças");
t("regra canônica, chave de elemento, estado, tipo de sujeito", () => {
  assert.equal(regraCanonica("label"), "axe:label"); assert.equal(regraCanonica("axe:label"), "axe:label");
  assert.equal(regraCanonica("ds-page-header"), "ds:page-header"); assert.equal(regraCanonica(null), null);
  assert.equal(chaveDeElemento("1280x900@inicial|body>main"), "body>main"); assert.equal(chaveDeElemento("1280x900@inicial|"), "(raiz)");
  assert.equal(estadoDe({ cena: "a-decidir:1280x900", sujeitos: ["1280x900@detalhe-menu|body>x"] }), "1280x900@detalhe-menu");
  assert.equal(estadoDe({ cena: "1280x900", sujeitos: ["body>x"] }), "1280x900");
  const c = (rotulo: string, chave = "body>x") => ({ alegacao: { sujeitos: [{ id: "S1", chave, rotulo, cena: null }] } }) as unknown as CartaoCego;
  assert.equal(tipoDeSujeito(c("<button> [shadow]")), "botão sem texto visível");
  assert.equal(tipoDeSujeito(c('<button> "Buscar"')), "botão com texto");
  assert.equal(tipoDeSujeito(c("<input#cpf>")), "campo de formulário");
  assert.equal(tipoDeSujeito(c("<br-header>")), "componente <br-header>");
  assert.equal(tipoDeSujeito(c("<html>", "")), "raiz");
});
t("κ de Cohen e de Fleiss em exemplos feitos à mão", () => {
  assert.equal(cohen(["a", "a", "b", "b"], ["a", "b", "b", "b"]), 0.5);
  assert.equal(fleiss([["a", "a", "a"], ["a", "a", "b"], ["b", "b", "b"]]), 0.55);
  assert.equal(cohen(["a", "a"], ["a", "a"]), null);
  assert.throws(() => fleiss([["a", "b"], ["a"]]));
});
t("concordância descritiva: par com campo nulo sai do denominador; mesmo lote e entre lotes separados", () => {
  const j = (id: string, lote: string, f: string | null) => ({ id, lote, resposta: { verdadeFactual: f ?? NAO_PERGUNTADO } as unknown as Resposta, derivado: {} as never }) as Julgado;
  const js = new Map([["x", j("x", "L1", "verdadeira")], ["y", j("y", "L1", "falsa")], ["z", j("z", "L2", "verdadeira")], ["w", j("w", "L2", null)]]);
  const r = concordancia([{ id: "G", nivel: "mesma-alegacao", chave: "", descricao: {} as never, membros: ["x", "y", "z", "w"] }], js, x => [x.resposta.verdadeFactual === NAO_PERGUNTADO ? null : x.resposta.verdadeFactual]);
  assert.equal(r.pares, 6); assert.equal(r.comparaveis, 3); assert.equal(r.todos.concordantes, 1);
  assert.deepEqual([r.mesmoLote.comparaveis, r.mesmoLote.concordantes, r.entreLotes.comparaveis, r.entreLotes.concordantes], [1, 0, 2, 1]);
  assert.equal(r.cobertura, 0.5);
});

console.log("E14 consistência: fila real (só leitura)");
const inv = inventarioDeAtomos();
// Fila fixada na 1ª passada (ver cabeçalho): nunca as respostas finais da adjudicação.
const filaReal = FILA();
const tmp1 = mkdtempSync(join(tmpdir(), "nat74-e14-1a-"));
const fila = join(tmp1, "fila-t3");
for (const d of ["lotes", "chave"]) cpSync(join(filaReal, d), join(fila, d), { recursive: true });
cpSync(join(filaReal, "respostas-1a-passada"), join(fila, "respostas"), { recursive: true });
t("a cópia fixada reproduz a 1ª passada gravada (sha256 de julgamentos-1a-passada.json)", () => {
  const ing = ingerir(fila);
  assert.deepEqual(ing.erros, []);
  assert.equal(`${sha(ing.texto!)}  julgamentos-1a-passada.json\n`, readFileSync(join(filaReal, "julgamentos-1a-passada.json.sha256"), "utf8"));
});
const dados = membrosDaFila(fila, inv);
const julg = julgadosDaFila(fila);
const a = analisar(dados, julg);
t("agrupamento determinístico, independente da ordem e das respostas", () => {
  const g1 = agrupar(dados.membros), g2 = agrupar([...dados.membros].reverse());
  assert.deepEqual(g1, g2);
  // Respostas embaralhadas entre átomos: os grupos não mudam (o agrupamento não lê resposta).
  const ids = [...julg.keys()], vals = [...julg.values()];
  const trocado = new Map(ids.map((id, i) => [id, { ...vals[(i + 7) % vals.length], id }]));
  const b = analisar(dados, trocado);
  assert.deepEqual(b.mesmaAlegacao.map(g => [g.id, g.membros]), a.mesmaAlegacao.map(g => [g.id, g.membros]));
  assert.deepEqual(b.mesmaLeitura.map(g => [g.id, g.membros]), a.mesmaLeitura.map(g => [g.id, g.membros]));
  assert.equal(JSON.stringify(analisar(dados, julg).relatorio), JSON.stringify(a.relatorio));
});
t("todo átomo está em exatamente um grupo MA; LN só com regra e pergunta de norma; relatório sem κ", () => {
  const ma = a.mesmaAlegacao.flatMap(g => g.membros);
  assert.equal(ma.length, 285); assert.equal(new Set(ma).size, 285);
  for (const g of a.mesmaLeitura) for (const id of g.membros) { const m = dados.membros.find(x => x.id === id)!; assert.ok(m.regra && m.perguntaNorma); }
  assert.ok(!/kappa/i.test(JSON.stringify(a.relatorio)));
});
t("seleção segue as regras §2 (classe/crédito/fundamentação/norma.id em MA; norma em LN)", () => {
  for (const g of a.mesmaAlegacao.filter(g => g.n >= 2)) assert.equal(g.desempate, g.divergencias.some(c => ["classe", "credito", "fundamentacao", "norma.id"].includes(c)));
  for (const g of a.mesmaLeitura.filter(g => g.n >= 2)) assert.equal(g.desempate, g.divergencias.some(c => c.startsWith("norma.")));
  const us = unidadesDeDesempate(a);
  const todos = us.flatMap(u => u.membros);
  assert.equal(new Set(todos).size, todos.length, "unidades disjuntas");
  const sel = new Set([...a.mesmaAlegacao, ...a.mesmaLeitura].filter(g => g.desempate).flatMap(g => g.membros));
  assert.deepEqual([...sel].sort(), [...todos].sort());
});
t("amostra de confiabilidade: 40 cartões, determinística, todo estrato representado, estrato sem braço; cegueira 0 falhas", () => {
  const s1 = sortearAmostra(a), s2 = sortearAmostra(a);
  assert.deepEqual(s1, s2); assert.equal(s1.ids.length, 40); assert.equal(new Set(s1.ids).size, 40);
  for (const [e, x] of Object.entries(s1.estratos)) { assert.ok(x.sorteados >= 1, e); assert.ok(!/sem|com|lb-|opus|sonnet|t7/i.test(e), e); }
  const p = prepararAmostra({ fila, inv });
  assert.deepEqual(p.cegueira.falhas, []); assert.deepEqual(p.cegueira.falhasExtras, []);
  assert.equal(p.arquivosDoJuiz.get("LEIAME-juiz.md"), readFileSync(join(fila, "lotes", "LEIAME-juiz.md"), "utf8").replace(/^﻿/, ""));
  const cs = ["amostra-01.json", "amostra-02.json"].flatMap(f => (JSON.parse(p.arquivosDoJuiz.get(f)!) as { cartoes: CartaoCego[] }).cartoes);
  assert.equal(cs.length, 40);
  // Cartões idênticos aos da 1ª passada, salvo o id.
  const chave = JSON.parse(p.arquivosInternos.get("chave/amostra-chave.json")!) as { itens: { id: string; idOriginal: string }[] };
  for (const c of cs) { const o = chave.itens.find(i => i.id === c.id)!; assert.deepEqual({ ...c, id: "" }, { ...dados.membros.find(m => m.id === o.idOriginal)!.cartao, id: "" }); assert.notEqual(c.id, o.idOriginal); }
});

console.log("E14 adjudicação informada: cópia temporária, respostas sintéticas");
const tmp = mkdtempSync(join(tmpdir(), "nat74-e14-adj-"));
const filaT = join(tmp, "fila-t3");
for (const d of ["lotes", "chave", "respostas"]) cpSync(join(fila, d), join(filaT, d), { recursive: true });
const dd = join(tmp, "out", "desempate");
const shaDir = (d: string) => Object.fromEntries(readdirSync(d).sort().map(f => [f, sha(readFileSync(join(d, f)))]));
const respostas1 = shaDir(join(filaT, "respostas"));
type Lote = { lote: string; grupo: { id: string; pedeLeituraDaNorma: boolean; membros: string[] }; cartoes: CartaoCego[] };
const sintetica = (c: CartaoCego, forca = "indeterminado"): Resposta => c.perguntas.includes("sugestao")
  ? { id: c.id, verdadeFactual: NAO_PERGUNTADO, norma: NAO_PERGUNTADO, vinculo: NAO_PERGUNTADO,
    sugestao: { trataOFato: "incerto", especificaDoSujeito: "incerto", naoViolaNormaObrigatoria: "incerto", qualidade: c.alegacao.esperado ? "indeterminada" : "ausente" },
    forcaDoVeredito: "incerto", evidencias: ["OBS"], justificativa: "OBS: resposta sintética de teste, sem julgamento." }
  : { id: c.id, verdadeFactual: "indeterminado", norma: c.alegacao.regra ? { id: "citada", forca: forca as never, aplicabilidade: "incerta", violada: "incerto" }
    : { id: "nenhuma", forca: "nenhuma", aplicabilidade: "incerta", violada: "incerto" }, vinculo: "indeterminado", sugestao: NAO_PERGUNTADO,
    forcaDoVeredito: "incerto", evidencias: ["OBS"], justificativa: "OBS: resposta sintética de teste, sem julgamento." };
const leitura = (l: Lote) => !l.grupo.pedeLeituraDaNorma ? NAO_PERGUNTADO : { norma: l.cartoes.some(c => c.alegacao.regra) ? "citada" : "nenhuma",
  fonteEVersao: "texto sintético de teste", forca: l.cartoes.some(c => c.alegacao.regra) ? "indeterminado" : "nenhuma", antecedente: "texto sintético de teste",
  excecoes: "texto sintético de teste", evidenciaNecessaria: "texto sintético de teste", permiteConcluir: "texto sintético de teste" };
const escreveA = (lote: string, mexe: (d: Record<string, unknown>) => Record<string, unknown> = x => x) => {
  const txt = readFileSync(join(dd, `${lote}.json`), "utf8"); const l = JSON.parse(txt) as Lote;
  gravar(dd, `respostas/${lote}-a.json`, JSON.stringify(mexe({ formato: FORMATO_RESP_A, lote, loteSha256: sha(txt), juiz: "teste sintético", etapa: "a", grupo: l.grupo.id,
    leituraDaNorma: leitura(l), respostas: l.cartoes.map(c => sintetica(c)) }), null, 2));
};
const escreveB = (lote: string, mexe: (d: Record<string, unknown>) => Record<string, unknown> = x => x) => {
  const txt = readFileSync(join(dd, `${lote}-b.json`), "utf8"); const l = JSON.parse(txt) as Lote;
  gravar(dd, `respostas/${lote}-b.json`, JSON.stringify(mexe({ formato: FORMATO_RESP_B, lote: `${lote}-b`, loteSha256: sha(txt), juiz: "teste sintético", etapa: "b", grupo: l.grupo.id,
    leituraDaNorma: leitura(l), leiturasAlternativasPlausiveis: [], classificacaoDaDivergencia: { tipos: ["falta-de-evidencia"], evidencias: [`${l.cartoes[0].id}:OBS`], justificativa: "texto sintético de teste, sem julgamento algum." },
    respostas: l.cartoes.map(c => sintetica(c)) }), null, 2));
};
try {
  const p = prepararDesempate({ fila: filaT, inv });
  t("preparo: cegueira 0 falhas; nenhum id da 1ª passada; um grupo por lote; cartões iguais aos da 1ª passada salvo id e grupo", () => {
    assert.deepEqual(p.cegueira.falhas, []); assert.deepEqual(p.cegueira.falhasExtras, []);
    for (const [, txt] of p.arquivosDoJuiz) for (const m of dados.membros) assert.ok(!txt.includes(m.id));
    const chave = JSON.parse(p.arquivosInternos.get("chave/desempate-chave.json")!) as { regrasSha256: string; unidades: { lote: string; membros: { id: string; idOriginal: string }[] }[] };
    assert.equal(chave.regrasSha256, sha(REGRAS));
    for (const l of p.lotes) {
      const lj = JSON.parse(p.arquivosDoJuiz.get(`${l.lote}.json`)!) as Lote & { cartoes: (CartaoCego & { grupo: string })[] };
      assert.ok(!/"respostas"|"justificativa"|"forcaDoVeredito"/.test(p.arquivosDoJuiz.get(`${l.lote}.json`)!));
      for (const c of lj.cartoes) { const o = chave.unidades.find(u => u.lote === l.lote)!.membros.find(m => m.id === c.id)!;
        const { grupo: _g, ...resto } = c; assert.deepEqual({ ...resto, id: "" }, { ...dados.membros.find(m => m.id === o.idOriginal)!.cartao, id: "" }); }
    }
  });
  for (const [rel, txt] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(dd, rel, txt);
  const lotes = p.lotes.map(l => l.lote);
  t("revelar exige a etapa A; o lote B traz as respostas anteriores com id novo e passa na cegueira", () => {
    assert.ok(loteB({ fila: filaT, desempate: dd, lote: lotes[0], inv }).erros.some(e => /etapa A vem antes/.test(e)));
    for (const l of lotes) escreveA(l);
    for (const l of lotes) {
      const r = loteB({ fila: filaT, desempate: dd, lote: l, inv });
      assert.deepEqual(r.erros, []); gravar(dd, `${l}-b.json`, r.texto!);
      const b = JSON.parse(r.texto!) as { respostasAnteriores: { cartao: string; respostaAnterior: Resposta }[]; etapaA: { respostas: { sha256: string } } };
      assert.equal(b.etapaA.respostas.sha256, sha(readFileSync(join(dd, "respostas", `${l}-a.json`), "utf8")));
      for (const x of b.respostasAnteriores) assert.equal(x.cartao, x.respostaAnterior.id);
      for (const m of dados.membros) assert.ok(!r.texto!.includes(m.id));
    }
  });
  t("revelar recusa etapa A com força diferente da leitura", () => {
    const l = p.lotes.find(x => (JSON.parse(p.arquivosDoJuiz.get(`${x.lote}.json`)!) as Lote).cartoes.some(c => c.alegacao.regra && c.perguntas.includes("norma")))!.lote;
    const bom = readFileSync(join(dd, "respostas", `${l}-a.json`), "utf8");
    escreveA(l, d => ({ ...d, respostas: (d.respostas as Resposta[]).map((r, i) => (i === 0 && r.norma !== NAO_PERGUNTADO ? { ...r, norma: { ...r.norma, forca: "obrigatorio" } } : r)) }));
    assert.ok(loteB({ fila: filaT, desempate: dd, lote: l, inv }).erros.some(e => /a força é da norma/.test(e)));
    writeFileSync(join(dd, "respostas", `${l}-a.json`), bom);
  });
  t("aplicar recusa: etapa B ausente", () => {
    const r = aplicarDesempate({ fila: filaT, desempate: dd, inv });
    assert.ok(r.erros.some(e => /-b\.json ausente \(etapa B\)/.test(e)));
  });
  for (const l of lotes) escreveB(l);
  let r = aplicarDesempate({ fila: filaT, desempate: dd, inv });
  t("aplicar: preserva a 1ª passada (texto da ingestão + sha256) e não toca na fila de entrada", () => {
    assert.deepEqual(r.erros, []);
    assert.equal(r.arquivos.get("julgamentos-1a-passada.json"), ingerir(filaT).texto);
    assert.equal(r.arquivos.get("julgamentos-1a-passada.json.sha256"), `${sha(ingerir(filaT).texto!)}  julgamentos-1a-passada.json\n`);
    assert.deepEqual(shaDir(join(filaT, "respostas")), respostas1);
  });
  t("aplicar: sobrescritas só dentro dos grupos selecionados, todas registradas (antes/depois/grupo)", () => {
    const sel = new Set(unidadesDeDesempate(a).flatMap(u => u.membros));
    assert.equal(r.sobrescritas.length, sel.size);
    for (const s of r.sobrescritas) { assert.ok(sel.has(s.id)); assert.ok(s.grupo && s.antes && s.depois); }
    for (const f of readdirSync(join(filaT, "respostas"))) {
      const antes = JSON.parse(readFileSync(join(filaT, "respostas", f), "utf8")) as { respostas: Resposta[] };
      const depois = JSON.parse(r.arquivos.get(`respostas/${f}`)!) as { respostas: Resposta[] };
      antes.respostas.forEach((x, i) => { if (!sel.has(x.id)) assert.deepEqual(depois.respostas[i], x); else assert.equal(depois.respostas[i].id, x.id); });
    }
  });
  const saida = join(tmp, "saida", "fila-t3");
  for (const [rel, txt] of r.arquivos) gravar(saida, rel, txt);
  t("a saída passa na ingestão (285 julgados, completo); membros sobrescritos com classe da resposta sintética", () => {
    const ing = ingerir(saida); assert.deepEqual(ing.erros, []);
    const j = ing.julgamentos as { julgados: number; completo: boolean; julgamentos: { id: string; derivado: { classe: string } }[] };
    assert.equal(j.julgados, 285); assert.equal(j.completo, true);
    for (const s of r.sobrescritas) assert.ok(["pendente", "erro-normativo"].includes(j.julgamentos.find(x => x.id === s.id)!.derivado.classe));
  });
  t("a ingestão continua recusando entrada ruim (valor fora da lista na saída)", () => {
    const f = readdirSync(join(saida, "respostas"))[0];
    const d = JSON.parse(readFileSync(join(saida, "respostas", f), "utf8")) as { respostas: Resposta[] };
    d.respostas[0] = { ...d.respostas[0], forcaDoVeredito: "certeza" as never };
    writeFileSync(join(saida, "respostas", f), JSON.stringify(d));
    assert.ok(ingerir(saida).erros.some(e => /esquema/.test(e)));
  });
  t("aplicar recusa: leitura alternativa plausível com cartão de classe final", () => {
    const l = lotes[0];
    const bom = readFileSync(join(dd, "respostas", `${l}-b.json`), "utf8");
    escreveB(l, d => ({ ...d, leiturasAlternativasPlausiveis: ["outra leitura plausível, só para o teste sintético"],
      respostas: (d.respostas as Resposta[]).map(x => (x.norma !== NAO_PERGUNTADO ? { ...x, verdadeFactual: "verdadeira", norma: { ...x.norma, aplicabilidade: "nao-aplica", violada: "nao" },
        sugestao: { trataOFato: "nao", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "invalida" } } : x)) }));
    const rr = aplicarDesempate({ fila: filaT, desempate: dd, inv });
    assert.ok(rr.erros.some(e => /leitura alternativa plausível/.test(e)) || rr.erros.length > 0, rr.erros.join("\n"));
    writeFileSync(join(dd, "respostas", `${l}-b.json`), bom);
  });
  t("aplicar recusa: id fora do grupo, cartão faltando, etapa A mudada depois da revelação, 1ª passada mudada", () => {
    const l = lotes[0];
    const bomB = readFileSync(join(dd, "respostas", `${l}-b.json`), "utf8"), bomA = readFileSync(join(dd, "respostas", `${l}-a.json`), "utf8");
    escreveB(l, d => ({ ...d, respostas: (d.respostas as Resposta[]).slice(1) }));
    assert.ok(aplicarDesempate({ fila: filaT, desempate: dd, inv }).erros.some(e => /incompleto/.test(e)));
    escreveB(l, d => ({ ...d, respostas: [...(d.respostas as Resposta[]), { ...(d.respostas as Resposta[])[0], id: "T3-0000000000" }] }));
    assert.ok(aplicarDesempate({ fila: filaT, desempate: dd, inv }).erros.some(e => /fora do grupo/.test(e)));
    writeFileSync(join(dd, "respostas", `${l}-b.json`), bomB);
    writeFileSync(join(dd, "respostas", `${l}-a.json`), bomA.replace("teste sintético", "teste sintético mudado"));
    assert.ok(aplicarDesempate({ fila: filaT, desempate: dd, inv }).erros.some(e => /não confere com a etapa A/.test(e)));
    writeFileSync(join(dd, "respostas", `${l}-a.json`), bomA);
    const f1 = join(filaT, "respostas", readdirSync(join(filaT, "respostas"))[0]);
    const orig = readFileSync(f1, "utf8");
    writeFileSync(f1, orig + "\n");
    assert.ok(aplicarDesempate({ fila: filaT, desempate: dd, inv }).erros.some(e => /1ª passada/.test(e)));
    writeFileSync(f1, orig);
    assert.deepEqual(aplicarDesempate({ fila: filaT, desempate: dd, inv }).erros, []);
  });
  t("confiabilidade: recusa resposta ausente; com j1 e j2 sintéticos dá % e κ por campo (Cohen j1×j2, Fleiss com 3)", () => {
    const am = join(tmp, "out", "confiabilidade");
    const pa = prepararAmostra({ fila: filaT, inv });
    for (const [rel, txt] of [...pa.arquivosDoJuiz, ...pa.arquivosInternos]) gravar(am, rel, txt);
    assert.ok(confiabilidade({ fila: filaT, amostra: am }).erros.some(e => /ausente/.test(e)));
    for (const nome of ["amostra-01", "amostra-02"]) for (const j of ["j1", "j2"]) {
      const txt = pa.arquivosDoJuiz.get(`${nome}.json`)!;
      gravar(am, `respostas/${nome}-${j}.json`, JSON.stringify({ formato: "nat74-t3-respostas-1.0.0", lote: nome, loteSha256: sha(txt), juiz: `teste ${j}`,
        respostas: (JSON.parse(txt) as { cartoes: CartaoCego[] }).cartoes.map(c => sintetica(c)) }));
    }
    const rc = confiabilidade({ fila: filaT, amostra: am });
    assert.deepEqual(rc.erros, []);
    const c = (rc.relatorio as { cartoes: number; campos: Record<string, { j1xj2: { n: number; pct: number }; tres: { n: number } }> });
    assert.equal(c.cartoes, 40); assert.equal(c.campos.classe.j1xj2.n, 40); assert.equal(c.campos.classe.j1xj2.pct, 1); assert.equal(c.campos.classe.tres.n, 40);
  });
  r = aplicarDesempate({ fila: filaT, desempate: dd, inv });
  t("aplicar é determinístico", () => {
    const r2 = aplicarDesempate({ fila: filaT, desempate: dd, inv });
    assert.deepEqual([...r2.arquivos], [...r.arquivos]);
  });

  console.log("E14 segunda leitura (regras §4): cópia temporária, respostas sintéticas");
  const indicada = (r.resumo!.unidades as { lote: string; segundaLeituraIndicada: boolean }[]).filter(u => u.segundaLeituraIndicada).map(u => u.lote);
  t("a unidade da regra de anatomia (lote-d05) tem segunda leitura indicada com as respostas sintéticas; outra unidade é recusada", () => {
    assert.ok(indicada.includes("lote-d05"), indicada.join(","));
    assert.throws(() => prepararSegunda({ fila: filaT, desempate: dd, lote: "lote-d01", inv }), /evidência oficial|não tem segunda leitura/);
  });
  const p2 = prepararSegunda({ fila: filaT, desempate: dd, lote: "lote-d05", inv });
  const sl = join(dd, "segunda-leitura");
  for (const [rel, txt] of [...p2.arquivosDoJuiz, ...p2.arquivosInternos]) gravar(sl, rel, txt);
  const l2Txt = p2.arquivosDoJuiz.get("lote-d05-2.json")!;
  type L2 = { grupo: { id: string }; textosOficiais: { itens: { id: string; arquivo?: string; trecho?: string }[] }; cartoes: (CartaoCego & { grupo: string })[] };
  const l2 = JSON.parse(l2Txt) as L2;
  t("preparo: cegueira 0 falhas; trechos oficiais literais do corpus; nada da 1ª passada nem da 1ª adjudicação; cartões iguais salvo id/grupo/citáveis", () => {
    assert.deepEqual(p2.falhas, []);
    for (const x of l2.textosOficiais.itens.filter(x => x.arquivo)) assert.ok(readFileSync(join(CORPUS, x.arquivo!), "utf8").replace(/\r\n/g, "\n").includes(x.trecho!), x.id);
    assert.ok(!/basis|a tag raiz é anatomia"\s*,\s*"origem/.test(JSON.stringify(l2.textosOficiais)));
    const lA = JSON.parse(readFileSync(join(dd, "lote-d05.json"), "utf8")) as L2;
    for (const c of lA.cartoes) assert.ok(!l2Txt.includes(c.id));
    for (const f of ["a", "b"]) for (const x of (JSON.parse(readFileSync(join(dd, "respostas", `lote-d05-${f}.json`), "utf8")) as { respostas: Resposta[] }).respostas) assert.ok(!l2Txt.includes(x.id));
    for (const m of dados.membros) assert.ok(!l2Txt.includes(m.id));
    const ch = JSON.parse(p2.arquivosInternos.get("chave/lote-d05-chave.json")!) as { membros: { id: string; idAdjudicacao: string }[] };
    for (const c of l2.cartoes) {
      const o = lA.cartoes.find(x => x.id === ch.membros.find(m => m.id === c.id)!.idAdjudicacao)!;
      const { grupo: _a, citaveis: ca, ...r1 } = c, { grupo: _b, citaveis: cb, ...r0 } = o;
      assert.deepEqual({ ...r1, id: "" }, { ...r0, id: "" }); assert.deepEqual(ca.slice(0, cb.length), cb);
    }
  });
  const leitura2 = (forca: string) => ({ norma: "citada", fonteEVersao: "texto sintético de teste", forca, antecedente: "texto sintético de teste", excecoes: "texto sintético de teste",
    evidenciaNecessaria: "texto sintético de teste", permiteConcluir: "texto sintético de teste" });
  const escreve2 = (alternativas: string[], resp: (c: CartaoCego) => Resposta, extra: (rs: Resposta[]) => Resposta[] = x => x) =>
    gravar(sl, "respostas/lote-d05-2.json", JSON.stringify({ formato: FORMATO_RESP_2, lote: "lote-d05-2", loteSha256: sha(l2Txt), juiz: "teste sintético", etapa: "segunda-leitura", grupo: l2.grupo.id,
      leituraDaNorma: leitura2("obrigatorio"), leiturasAlternativasPlausiveis: alternativas,
      classificacaoDaDivergencia: { tipos: ["interpretacao-normativa"], evidencias: [`${l2.cartoes[0].id}:OF1`], justificativa: "texto sintético de teste, sem julgamento algum." },
      respostas: extra(l2.cartoes.map(resp)) }, null, 2));
  const aplica = (c: CartaoCego): Resposta => ({ id: c.id, verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" },
    vinculo: { spec: "A-06", relacao: "direta" }, sugestao: NAO_PERGUNTADO, forcaDoVeredito: "inferido", evidencias: ["OBS", "OF1"], justificativa: "OBS e OF1: resposta sintética de teste, sem julgamento." });
  const incerta = (c: CartaoCego): Resposta => ({ ...aplica(c), norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "incerta", violada: "incerto" }, forcaDoVeredito: "incerto" });
  t("aplicar recusa: segunda leitura ausente; id fora do grupo; alternativa plausível com classe final", () => {
    assert.ok(aplicarComSegunda({ fila: filaT, desempate: dd, inv }).erros.some(e => /ausente/.test(e)));
    escreve2([], aplica, rs => [...rs, { ...rs[0], id: "T3-0000000000" }]);
    assert.ok(aplicarComSegunda({ fila: filaT, desempate: dd, inv }).erros.some(e => /fora do grupo/.test(e)));
    escreve2(["uma leitura alternativa plausível, só para o teste sintético"], aplica);
    assert.ok(aplicarComSegunda({ fila: filaT, desempate: dd, inv }).erros.some(e => /leitura alternativa plausível/.test(e)));
  });
  t("com alternativa plausível: membros ficam como na adjudicação (incerta) e a sensibilidade registra aplica × não aplica", () => {
    escreve2(["uma leitura alternativa plausível, só para o teste sintético"], incerta);
    const rs = aplicarComSegunda({ fila: filaT, desempate: dd, inv });
    assert.deepEqual(rs.erros, []);
    for (const [rel, txt] of r.arquivos) if (rel.startsWith("respostas/")) assert.equal(rs.arquivos.get(rel), txt);
    const sg = (rs.resumo as { segundasLeituras: { resolvida: boolean; sensibilidade: { membrosQueCreditam: { seAplica: number; seNaoAplica: number }; total: number } }[] }).segundasLeituras[0];
    assert.equal(sg.resolvida, false); assert.equal(sg.sensibilidade.total, 21);
    assert.ok(sg.sensibilidade.membrosQueCreditam.seAplica >= 0 && sg.sensibilidade.membrosQueCreditam.seNaoAplica === 0);
    assert.equal(rs.sobrescritas.filter(s => (s as { segundaLeitura?: unknown }).segundaLeitura).length, 21);
  });
  t("sem alternativa: as respostas da segunda leitura substituem as da unidade; registradas; a saída ingere", () => {
    escreve2([], aplica);
    const rs = aplicarComSegunda({ fila: filaT, desempate: dd, inv });
    assert.deepEqual(rs.erros, []);
    const ch = JSON.parse(p2.arquivosInternos.get("chave/lote-d05-chave.json")!) as { membros: { idOriginal: string }[] };
    const ids = new Set(ch.membros.map(m => m.idOriginal));
    for (const s of rs.sobrescritas) if (ids.has(s.id)) { assert.equal(s.depois.classe, "violacao-pagina"); assert.equal(s.depois.credito, "credita A-06"); assert.ok((s as { segundaLeitura?: unknown }).segundaLeitura); }
    const out = join(tmp, "saida2", "fila-t3");
    for (const [rel, txt] of rs.arquivos) gravar(out, rel, txt);
    const ing = ingerir(out); assert.deepEqual(ing.erros, []);
    const js = (ing.julgamentos as { julgamentos: { id: string; derivado: { classe: string } }[] }).julgamentos;
    for (const id of ids) assert.equal(js.find(j => j.id === id)!.derivado.classe, "violacao-pagina");
    // fora da unidade nada muda em relação à adjudicação
    for (const s of rs.sobrescritas) if (!ids.has(s.id)) assert.deepEqual(s.depois, r.sobrescritas.find(x => x.id === s.id)!.depois);
  });
} finally { rmSync(tmp, { recursive: true, force: true }); }

t("analisarFila real = analisar(membros, julgados) (mesmo relatório)", () => {
  assert.equal(JSON.stringify(analisarFila(fila, inv).relatorio.resumo), JSON.stringify(a.relatorio.resumo));
});

rmSync(tmp1, { recursive: true, force: true });
console.log(`\n${n - falhas}/${n} ok${falhas ? `, ${falhas} FALHA(S)` : ""}`);
if (falhas) process.exit(1);
