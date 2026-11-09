/**
 * Testes da revisão §8 (passos 2–3) para campanha nova (revisao-campanha.ts, plano de revisão 19/10, entrega 3). Sem modelo,
 * sem rede. Duas partes:
 *   1. sintética: CLI (pastas obrigatórias, nunca a fila histórica), semente, sorteio estratificado, união de gatilhos;
 *   2. formas do ensaio (D-138, fora da amostra): numa CÓPIA temporária do trio de ensaio (passadas T3/T4 + análise),
 *      o caminho inteiro — consistência → amostra → confiabilidade (juízes sintéticos j1/j2 e o substituto T3) →
 *      adjudicação A/B com respostas SINTÉTICAS → aplicar → passada adjudicada, 1ª passada preservada, contestados.
 *      Pula (com aviso) se o ensaio não estiver em govbr-resultados.
 *   3. [D-165] gatilho (d): numa CÓPIA da dev-366-b-01 (passada + análise p03), regra de teste congelada → derivação
 *      (B-23 e B-21 exatos, extras listados), recusas (sha256, rascunho, lista não derivável), rodada só do (d) sem
 *      confiabilidade, etapa A/B com leiturasDaRegra, aplicar → sensibilidade-regra.json → cenários da tabela.
 *   npx tsx scripts/reanalise-nat74/test-revisao-campanha.ts
 */
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RESULTADOS, gravar, gravarJson, jsonTexto, sha } from "./comum";
import { MOTIVO_SEM_VINCULO, NAO_PERGUNTADO, type Resposta } from "./e14-comum";
import {
  esquemaAmostra, esquemasAdjudicacao, specsDaPassada, specsDoEsquema, FORMATO_ADJ_RESP_A, FORMATO_ADJ_RESP_B, REGRAS_CAMPANHA, aplicarAdjudicacao, consistencia, executar, lerArgs, lerPassada, loteB, medirConfiabilidade,
  prepararAdjudicacao, prepararAmostra, sementeDaCampanha, sortearAmostra, unidadesDaCampanha, gravarImutavel, type Passada,
  DERIVACAO_TEMPLATE_REGISTRO, FORMATO_REGRA_MECANICA, REGRAS_GATILHO_D, contextoNaPassada, derivarAfetados, lerRegraPublicada,
} from "./revisao-campanha";
import { cenariosDaRegra, cenariosMd, conferirLeitura, derivarNaLeitura, fatoDaPassada, specDetectada, tabular, type SensibilidadeRegra } from "./e14-deteccao";

let n = 0, falhas = 0, pulados = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };
const silencioso = <T>(f: () => T): T => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return f(); } finally { console.error = e; console.log = l; } };

console.log("revisão de campanha nova: sintético");
t("[C4, passada 1.4.4] adjudicação de passada 1.3.1: o item de resposta é o 1.3.1 (motivoSemVinculo); 1.3.0 e 1.2.0 sem o campo", () => {
  const item = (e: { a: object }) => (e.a as { properties: { respostas: { items: { properties: Record<string, unknown> } } } }).properties.respostas.items.properties;
  assert.deepEqual(item(esquemasAdjudicacao(true, true, { v131: true })).motivoSemVinculo, { enum: [...MOTIVO_SEM_VINCULO] });
  assert.deepEqual(item(esquemasAdjudicacao(true, true, { v131: true, regra: true })).motivoSemVinculo, { enum: [...MOTIVO_SEM_VINCULO] });
  for (const e of [esquemasAdjudicacao(true, true), esquemasAdjudicacao(true, false), esquemasAdjudicacao(true, true, { regra: true })]) assert.ok(!("motivoSemVinculo" in item(e)));
  assert.equal(JSON.stringify(esquemasAdjudicacao(true, true, {})), JSON.stringify(esquemasAdjudicacao(true, true)), "sem v131: o esquema de sempre");
});
t("[1.4.2 na revisão] amostra e adjudicação de passada 1.3.0/1.3.1: vinculo.spec = enum dos ids da passada (U-07 aceito, id fora recusado); 1.2.0 sem mudança", () => {
  const ajv = (e: object) => new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(e);
  const resp = (spec: string, extra: Record<string, unknown> = {}) => ({ id: "T3-0123456789", verdadeFactual: "verdadeira",
    norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, vinculo: { spec, relacao: "direta" }, sugestao: NAO_PERGUNTADO,
    forcaDoVeredito: "medido", evidencias: ["MEDIDA"], justificativa: "MEDIDA mostra o switch ligado com aria-checked preso.", estadoAlcancado: "receita", ...extra });
  const pass = (v131: boolean, versao = "nat78-primeira-passada-1.4.1") => ({ v12: true, v13: true, versao, ...(v131 ? { v131: true } : {}), referencias: { "tela-a2": { defeitos: [{ id: "U-01" }, { id: "U-07" }] } } }) as unknown as Passada;
  const itemDe = (e: object) => (e as { properties: { respostas: { items: object } } }).properties.respostas.items;
  for (const v131 of [false, true]) {
    const p = pass(v131);
    assert.deepEqual(specsDaPassada(p), ["U-01", "U-07"]);
    const am = ajv(esquemaAmostra(p)), doc = (spec: string) => ({ formato: v131 ? "nat78-primeira-passada-respostas-1.3.1" : "nat78-primeira-passada-respostas-1.3.0",
      lote: "amostra-01", loteSha256: "a".repeat(64), juiz: "juiz j1", respostas: [resp(spec)] });
    assert.ok(am(doc("U-07")), `amostra ${v131}: ${JSON.stringify(am.errors)}`);
    for (const fora of ["U-08", "A-01"]) assert.ok(!am(doc(fora)), `amostra ${v131}: ${fora} fora da passada`);
    for (const regra of [false, true]) {
      const e = esquemasAdjudicacao(true, true, { ...(v131 ? { v131: true } : {}), ...(regra ? { regra: true } : {}), specs: specsDoEsquema(p) });
      const it = ajv(itemDe(e.a)), itB = ajv(itemDe(e.b));
      assert.ok(it(resp("U-07")) && itB(resp("U-07")), `adjudicação ${v131}/${regra}: ${JSON.stringify(it.errors)}`);
      assert.ok(!it(resp("U-08")) && !itB(resp("U-08")), `adjudicação ${v131}/${regra}: U-08 fora da passada`);
    }
  }
  assert.ok(!ajv(itemDe(esquemasAdjudicacao(true, true).a))(resp("U-07")), "sem specs: a constante de sempre (recusa U-07)");
  const e12 = esquemasAdjudicacao(true, false, { specs: ["U-07"] });
  assert.equal(JSON.stringify(e12), JSON.stringify(esquemasAdjudicacao(true, false)), "1.2.0: specs ignorados, esquema de sempre");
  // Passada anterior à 1.4.2 só com ids que a constante aceita (dev-366-b-01, revisao-b23-*): a constante, byte a byte; da 1.4.2 em diante, o enum.
  const pB = (versao: string) => ({ v12: true, v13: true, versao, referencias: { vistorias: { defeitos: [{ id: "B-21" }, { id: "B-23" }] } } }) as unknown as Passada;
  assert.equal(specsDoEsquema(pB("nat78-primeira-passada-1.4.1")), undefined);
  assert.equal(JSON.stringify(esquemaAmostra(pB("nat78-primeira-passada-1.4.1"))), JSON.stringify(esquemaAmostra({ ...pB("x"), referencias: {} } as unknown as Passada)));
  assert.deepEqual(specsDoEsquema(pB("nat78-primeira-passada-1.4.2")), ["B-21", "B-23"]);
  assert.deepEqual(specsDoEsquema(pass(false)), ["U-01", "U-07"], "1.4.1 com U-xx: o enum (a constante recusaria toda resposta)");
  assert.deepEqual(specsDoEsquema(pass(true, "nat78-primeira-passada-1.4.4")), ["U-01", "U-07"]);
  const p12 = { v12: true, v13: false, versao: "nat78-primeira-passada-1.3.1", referencias: { x: { defeitos: [{ id: "U-07" }] } } } as unknown as Passada;
  assert.ok(JSON.stringify(esquemaAmostra(p12)).includes("^[ABP]-\\\\d{2}$"), "amostra 1.2.0: padrão de sempre");
  assert.equal(specsDoEsquema(p12), undefined);
});
t("CLI: toda pasta é obrigatória; sem --passada recusa; opção desconhecida recusa", () => {
  assert.equal(silencioso(() => executar(["consistencia"])), 1);
  assert.equal(silencioso(() => executar(["consistencia", "--saida", "x"])), 1);
  assert.equal(silencioso(() => executar(["confiabilidade", "medir", "--passada"])), 1);
  assert.equal(silencioso(() => executar(["adjudicacao", "aplicar", "--fila", "x"])), 1);
  assert.equal(silencioso(() => executar([])), 1);
  assert.deepEqual((lerArgs(["a", "--n", "3"], ["--n"], []) as { modo: string[] }).modo, ["a"]);
  assert.ok("erro" in lerArgs(["--n"], ["--n"], []));
});
const tmp = mkdtempSync(join(tmpdir(), "revisao-campanha-"));
try {
  t("fila histórica (manifesto que não é de campanha nova) é recusada", () => {
    gravarJson(join(tmp, "hist"), "lotes/manifesto.json", { formato: "nat74-t3-manifesto", lotes: [] });
    assert.throws(() => lerPassada(join(tmp, "hist")), /não é de primeira passada de campanha nova/);
    assert.throws(() => lerPassada(join(tmp, "nada")), /sem lotes\/manifesto\.json/);
  });
  t("semente: a da campanha; sem ela a declarada; --semente diferente da campanha recusa", () => {
    assert.deepEqual(sementeDaCampanha({ campaignId: "c", arms: [], seed: 7 }, null), { semente: "7", origem: "campanha.design.seed" });
    assert.throws(() => sementeDaCampanha({ campaignId: "c", arms: [], seed: 7 }, "8"));
    assert.equal(sementeDaCampanha({ campaignId: "c", arms: [], seed: null }, "x").semente, "x");
    assert.match(sementeDaCampanha({ campaignId: "c", arms: [], seed: null }, null).semente, /confiabilidade\|c$/);
  });
  t("gravação imutável: mesmo conteúdo passa, conteúdo diferente para sem gravar nada", () => {
    gravarImutavel(join(tmp, "im"), [["a.txt", "1"]]);
    gravarImutavel(join(tmp, "im"), [["a.txt", "1"], ["b.txt", "2"]]);
    assert.throws(() => gravarImutavel(join(tmp, "im"), [["c.txt", "3"], ["a.txt", "9"]]), /PARADO/);
    assert.ok(!existsSync(join(tmp, "im", "c.txt")));
  });
  // Passada falsa mínima (só o que o sorteio e a união leem).
  const falsa = (cls: [string, string][]): Passada => {
    const membros = cls.map(([braco], i) => ({ id: `T3-${String(i).padStart(10, "0")}`, chave: `k${i}`, braco, perguntaNorma: true,
      cartao: { alegacao: { regra: null }, normaCitada: null }, tipoDeSujeito: "raiz" }));
    return { membros, item: new Map(membros.map(m => [m.id, { id: m.id, chave: m.chave, braco: m.braco }])),
      julgados: new Map(membros.map((m, i) => [m.id, { id: m.id, lote: "lote-01", resposta: { estadoAlcancado: i === 0 ? "nao-alcancado" : "receita" }, derivado: { classe: cls[i][1] } }])) } as unknown as Passada;
  };
  t("sorteio: estratos braço × classe, 1 por estrato + proporcional, n ≥ total → todos, determinístico", () => {
    const p = falsa([...Array(10)].map((_, i) => [i < 6 ? "com" : "sem", i % 3 ? "violacao-pagina" : "erro-factual"] as [string, string]));
    const a = sortearAmostra(p, 5, "s"), b = sortearAmostra(p, 5, "s");
    assert.deepEqual(a, b);
    assert.equal(a.ids.length, 5);
    assert.equal(Object.keys(a.estratos).length, 4);
    for (const e of Object.values(a.estratos)) assert.ok(e.sorteados >= 1);
    assert.equal(sortearAmostra(p, 99, "s").ids.length, 10);
    assert.throws(() => sortearAmostra(p, 3, "s"), /estratos/);
  });
  t("unidades: (a) grupo divergente, (b) desacordo na amostra, (c) nao-alcancado; origens que compartilham cartão se juntam", () => {
    const p = falsa([["com", "violacao-pagina"], ["sem", "violacao-pagina"], ["com", "erro-factual"], ["sem", "observacao"]]);
    const ids = p.membros.map(m => m.id);
    const an = { mesmaAlegacao: [{ id: "MA-1", nivel: "mesma-alegacao", desempate: true, divergencias: ["classe"], membros: [ids[0], ids[1]] }], mesmaLeitura: [] } as never;
    const us = unidadesDaCampanha(p, an, [{ id: ids[1], desacordos: [{ juiz: "j1", campos: ["classe"] }] }, { id: ids[3], desacordos: [{ juiz: "j2", campos: ["fato"] }] }]);
    assert.equal(us.length, 2);
    const u0 = us.find(u => u.membros.includes(ids[0]))!;
    assert.deepEqual(u0.gatilhos, ["a", "b", "c"]);
    assert.deepEqual(u0.membros, [ids[0], ids[1]].sort());
    assert.deepEqual(us.find(u => u.membros.includes(ids[3]))!.gatilhos, ["b"]);
    assert.ok(!us.some(u => u.membros.includes(ids[2])));
  });

  // ─────────────────────────────────────────────────────────── formas do ensaio
  const TRIO = join(RESULTADOS, "analises", "ensaio-trio-real-01", "trio-01");
  const ok = ["analisar-20261019T1", "primeira-passada-20261019T3", "primeira-passada-20261019T4"].every(d => existsSync(join(TRIO, d)));
  if (!ok) { pulados++; console.log("  (pulado) formas do ensaio: trio ensaio-trio-real-01 ausente em govbr-resultados"); }
  else {
    console.log("revisão de campanha nova: formas do ensaio (cópia temporária; respostas sintéticas)");
    const trio = join(tmp, "trio-01");
    for (const d of ["analisar-20261019T1", "primeira-passada-20261019T3", "primeira-passada-20261019T4", "primeira-passada-20261019T5"]) if (existsSync(join(TRIO, d))) cpSync(join(TRIO, d), join(trio, d), { recursive: true });
    const shaArvore = (d: string): string => sha(readdirSync(d, { recursive: true, withFileTypes: true }).filter(e => e.isFile())
      .map(e => join(e.parentPath, e.name)).sort().map(f => `${f.slice(d.length)}:${sha(readFileSync(f))}`).join("\n"));
    const antes = { t3: shaArvore(join(TRIO, "primeira-passada-20261019T3")), t4: shaArvore(join(TRIO, "primeira-passada-20261019T4")) };
    const P4 = join(trio, "primeira-passada-20261019T4"), P3 = join(trio, "primeira-passada-20261019T3");
    let p!: Passada;
    t("lê a passada congelada T4 sem o inventário E1 (julgamentos ac524fc0…, 40 cartões, cartões do pacote conferidos)", () => {
      p = lerPassada(P4);
      assert.equal(p.julgSha.slice(0, 8), "ac524fc0");
      assert.equal(p.membros.length, 40);
      assert.equal(p.mascara13, false);
    });
    t("T5 (lote 1.3.0, ainda sem julgamentos) é recusada: só passada congelada", () => {
      if (!existsSync(join(trio, "primeira-passada-20261019T5"))) return;
      assert.throws(() => lerPassada(join(trio, "primeira-passada-20261019T5")), /sem julgamentos\.json/);
    });
    t("consistência: o grupo de foco (wcag:2.4.7, #servico/#unidade) diverge em crédito e vai à adjudicação", () => {
      const a = consistencia(p);
      const g = a.mesmaAlegacao.find(x => x.desempate)!;
      assert.ok(g.membros.includes("T3-f0d1b88ac3") && g.divergencias.includes("credito"));
    });
    const R = join(trio, "revisao-teste");
    const am = join(R, "confiabilidade");
    t("amostra: 40 = todos (n ≥ total), ids novos, cartões idênticos salvo o id, cegueira OK", () => {
      const pr = prepararAmostra(p);
      assert.equal(pr.cegueira.resultado, "OK", JSON.stringify(pr.cegueira.falhas.slice(0, 3)));
      assert.equal(pr.sorteio.ids.length, 40);
      gravarImutavel(am, [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      const l = JSON.parse(readFileSync(join(am, "lotes", "amostra-01.json"), "utf8")) as { cartoes: { id: string }[] };
      const chave = JSON.parse(readFileSync(join(am, "chave", "amostra-chave.json"), "utf8")) as { itens: { id: string; idOriginal: string }[] };
      for (const c of l.cartoes) { const o = chave.itens.find(i => i.id === c.id)!.idOriginal; assert.ok(!p.item.has(c.id));
        assert.equal(JSON.stringify({ ...c, id: "" }), JSON.stringify({ ...p.cartao.get(o)!, id: "" })); }
    });
    // Juízes sintéticos: j1 = a 1ª passada; j2 = as respostas da T3 (com estadoAlcancado "receita", que a 1.1.0 não tinha).
    const t3 = JSON.parse(readFileSync(join(P3, "julgamentos.json"), "utf8")) as { julgamentos: { id: string; resposta: Resposta }[] };
    const respostasJuiz = (j: string, f: (idOriginal: string) => Resposta) => {
      const man = JSON.parse(readFileSync(join(am, "manifesto.json"), "utf8")) as { formatoRespostas: string; amostras: { amostra: string; sha256: string; ids: string[] }[] };
      const chave = JSON.parse(readFileSync(join(am, "chave", "amostra-chave.json"), "utf8")) as { itens: { id: string; idOriginal: string }[] };
      for (const a of man.amostras) gravarJson(am, `respostas/${a.amostra}-${j}.json`, { formato: man.formatoRespostas, lote: a.amostra, loteSha256: a.sha256, juiz: `sintético ${j}`,
        respostas: a.ids.map(id => ({ ...f(chave.itens.find(i => i.id === id)!.idOriginal), id })) });
    };
    t("medir sem respostas recusa; com j1 só (incompleto num lote) recusa", () => {
      assert.match(medirConfiabilidade(p, am).erros.join(), /nenhum juiz/);
      respostasJuiz("j1", id => p.julgados.get(id)!.resposta);
      rmSync(join(am, "respostas", "amostra-02-j1.json"));
      assert.match(medirConfiabilidade(p, am).erros.join(), /faltam/);
    });
    let med!: ReturnType<typeof medirConfiabilidade>;
    t("medir: j1 (= 1ª passada) e j2 (= T3) → κ por campo com denominadores; achado Q (T3-a33fbfae10, aplicabilidade) e P em desacordo", () => {
      respostasJuiz("j1", id => p.julgados.get(id)!.resposta);
      respostasJuiz("j2", id => ({ ...t3.julgamentos.find(j => j.id === id)!.resposta, estadoAlcancado: "receita" }));
      med = medirConfiabilidade(p, am);
      assert.deepEqual(med.erros, []);
      const c = med.relatorio!.campos as Record<string, { pares: Record<string, { n: number; concordantes: number }>; fleissTodos: { n: number; avaliadores: string[] }; fleissSoJuizes: { n: number } }>;
      assert.equal(c.classe.fleissTodos.n, 40);
      assert.deepEqual(c.classe.fleissTodos.avaliadores, ["1a", "j1", "j2"]);
      assert.equal(c.classe.pares["1a×j1"].concordantes, 40);
      assert.equal(c.classe.fleissSoJuizes.n, 40);
      const q = med.desacordos.find(d => d.id === "T3-a33fbfae10") as { desacordos: { juiz: string; campos: string[] }[] };
      assert.ok(q && q.desacordos[0].juiz === "j2" && q.desacordos[0].campos.includes("norma.aplicabilidade"));
      assert.ok(med.desacordos.some(d => d.id === "T3-f0d1b88ac3"));
      assert.equal(med.relatorio!.atendeProtocolo, true);
    });
    t("medir com o substituto T3 (--juiz-passada): casa 40/40 pela chave e pelo cartão original; estadoAlcancado fora; atendeProtocolo false", () => {
      const r = medirConfiabilidade(p, am, { juizesPassada: [P3] });
      assert.deepEqual(r.erros, []);
      const s = (r.relatorio!.juizesSubstitutos as { mesmaChave: number; mesmoCartaoOriginal: number; camposNaoComparaveis: { campo: string }[] }[])[0];
      assert.equal(s.mesmaChave, 40); assert.equal(s.mesmoCartaoOriginal, 40);
      assert.equal(s.camposNaoComparaveis[0].campo, "estadoAlcancado");
      assert.equal(r.relatorio!.atendeProtocolo, false);
    });
    // Grava a confiabilidade (como a CLI) e prepara a adjudicação.
    const congelar = () => {
      const jTxt = jsonTexto({ formato: "x", julgamentos: med.julgamentos }), dTxt = jsonTexto({ formato: "x", cartoes: med.desacordos });
      const rel = { ...med.relatorio!, congelados: { "julgamentos-confiabilidade.json": sha(jTxt), "desacordos.json": sha(dTxt) } };
      gravarImutavel(am, [["julgamentos-confiabilidade.json", jTxt], ["desacordos.json", dTxt], ["relatorio-confiabilidade.json", jsonTexto(rel)]]);
    };
    const dd = join(R, "adjudicacao");
    let unidades: ReturnType<typeof prepararAdjudicacao>["unidades"] = [];
    t("adjudicação: passada 1.2.0 sem --aceitar-mascara-anterior recusa; com ele, P sai pelo gatilho (c) e Q pelo (b); etapa A cega", () => {
      congelar();
      assert.throws(() => prepararAdjudicacao(p, { confiabilidade: am }), /1\.3\.0/);
      const pr = prepararAdjudicacao(p, { confiabilidade: am, aceitarMascaraAnterior: true });
      assert.equal(pr.cegueira.resultado, "OK", JSON.stringify(pr.cegueira.falhas.slice(0, 3)));
      unidades = pr.unidades;
      const uP = unidades.find(u => u.membros.includes("T3-f0d1b88ac3"))!, uQ = unidades.find(u => u.membros.includes("T3-a33fbfae10"))!;
      assert.ok(uP.gatilhos.includes("c") && uP.origens.some(o => o.gatilho === "c" && o.membros.includes("T3-f0d1b88ac3")));
      assert.ok(uQ.gatilhos.includes("b"));
      gravarImutavel(dd, [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      for (const f of readdirSync(join(dd, "lotes")).filter(f => /^lote-d\d{2}\.json$/.test(f))) {
        const txt = readFileSync(join(dd, "lotes", f), "utf8");
        assert.ok(!/"justificativa"|"forcaDoVeredito"|estadoAlcancado/.test(txt), `${f} traz campo de resposta`);
        for (const id of p.item.keys()) assert.ok(!txt.includes(id), `${f} traz id da 1ª passada ${id}`);
      }
    });
    const chaveAdj = () => JSON.parse(readFileSync(join(dd, "chave", "adjudicacao-chave.json"), "utf8")) as { unidades: { id: string; lote: string; membros: { id: string; idOriginal: string }[] }[] };
    const manAdj = () => JSON.parse(readFileSync(join(dd, "manifesto.json"), "utf8")) as { lotes: { lote: string; sha256: string }[] };
    const etapa = (lote: string, e: "a" | "b", f: (idO: string) => Resposta, extra: Record<string, unknown> = {}) => {
      const u = chaveAdj().unidades.find(x => x.lote === lote)!;
      const loteTxt = readFileSync(join(dd, "lotes", e === "a" ? `${lote}.json` : `${lote}-b.json`), "utf8");
      const rs = u.membros.map(m => ({ ...f(m.idOriginal), id: m.id }));
      const n0 = rs[0].norma === NAO_PERGUNTADO ? null : rs[0].norma;
      const leitura = n0 ? { norma: n0.id, fonteEVersao: "WCAG 2.2 / base do DS", forca: n0.forca, antecedente: "quando o elemento existe", excecoes: "nenhuma conhecida",
        evidenciaNecessaria: "medida da página congelada", permiteConcluir: "a violação no estado da receita" } : NAO_PERGUNTADO;
      gravar(dd, `respostas/${lote}-${e}.json`, jsonTexto({ formato: e === "a" ? FORMATO_ADJ_RESP_A : FORMATO_ADJ_RESP_B, lote: e === "a" ? lote : `${lote}-b`, loteSha256: sha(loteTxt),
        juiz: "adjudicador sintético", etapa: e, grupo: u.id, leituraDaNorma: leitura, respostas: rs,
        ...(e === "b" ? { leiturasAlternativasPlausiveis: [], classificacaoDaDivergencia: { tipos: ["erro-do-juiz"], evidencias: [rs[0].id], justificativa: "sintético: a resposta B repete a leitura anterior do cartão." } } : {}), ...extra }));
    };
    t("revelar exige a etapa A; B traz leituras anteriores anônimas (1ª passada + j1 + j2), sem id antigo nem nome de juiz", () => {
      const l = manAdj().lotes[0].lote;
      assert.match(loteB(p, dd, l).erros.join(), /etapa A vem antes/);
      for (const x of manAdj().lotes) etapa(x.lote, "a", id => p.julgados.get(id)!.resposta);
      for (const x of manAdj().lotes) {
        const r = loteB(p, dd, x.lote);
        assert.deepEqual(r.erros, []);
        gravarImutavel(dd, [[`lotes/${x.lote}-b.json`, r.texto!], [`chave/revelacao-${x.lote}.json`, r.revelacao!]]);
        const b = JSON.parse(r.texto!) as { leiturasAnteriores: { leituras: { leitura: string; resposta: { juiz?: string } }[] }[]; etapaA: { respostas: { congelada: boolean } } };
        assert.ok(b.etapaA.respostas.congelada);
        assert.deepEqual(b.leiturasAnteriores[0].leituras.map(x => x.leitura), ["leitura 1", "leitura 2", "leitura 3"]);
        for (const id of p.item.keys()) assert.ok(!r.texto!.includes(id));
        assert.ok(!/sintético|Opus|passada T4/i.test(r.texto!));
      }
    });
    const uP = () => chaveAdj().unidades.find(u => u.membros.some(m => m.idOriginal === "T3-f0d1b88ac3"))!;
    t("leitura alternativa plausível com cartão de classe final é recusada (incompatível → incerta)", () => {
      for (const x of manAdj().lotes) etapa(x.lote, "b", id => p.julgados.get(id)!.resposta);
      etapa(uP().lote, "b", id => (id === "T3-f0d1b88ac3" ? { ...p.julgados.get("T3-3a139fd43c")!.resposta } : p.julgados.get(id)!.resposta),
        { leiturasAlternativasPlausiveis: ["A receita traz contagem (Tab x8) e alvo (#servico) que não coincidem; as duas leituras são defensáveis."] });
      assert.match(aplicarAdjudicacao(p, dd).erros.join(), /leitura alternativa plausível/);
    });
    t("aplicar: P incerta com a alternativa como sensibilidade; passada nova; 1ª passada preservada (sha ac524fc0); contestados traz P", () => {
      const inc = (id: string): Resposta => { const r = p.julgados.get(id === "T3-f0d1b88ac3" ? "T3-3a139fd43c" : id)!.resposta;
        return { ...r, verdadeFactual: "verdadeira", estadoAlcancado: "receita", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "incerta", violada: "incerto" } } as Resposta; };
      etapa(uP().lote, "b", inc, { leiturasAlternativasPlausiveis: ["A receita traz contagem (Tab x8) e alvo (#servico) que não coincidem; as duas leituras são defensáveis."] });
      const r = aplicarAdjudicacao(p, dd);
      assert.deepEqual(r.erros, []);
      const nova = join(trio, "adjudicada-teste");
      gravarImutavel(nova, [...r.arquivos]);
      assert.equal(sha(readFileSync(join(nova, "julgamentos-1a-passada.json"))), p.julgSha);
      const cont = JSON.parse(r.arquivos.get("contestados.json")!) as { cartoes: { id: string; motivos: string[]; creditoEnvolvido: boolean; credito1a: string }[] };
      const cP = cont.cartoes.find(c => c.id === "T3-f0d1b88ac3")!;
      assert.ok(cP.motivos.includes("primeira-passada≠adjudicacao") && cP.motivos.includes("desacordo-na-confiabilidade"));
      const cF = cont.cartoes.find(c => c.id === "T3-3a139fd43c")!;
      assert.ok(cF.creditoEnvolvido && cF.credito1a === "credita A-04");
      const s = JSON.parse(r.arquivos.get("adjudicacao/sobrescritas.json")!) as { totais: { comLeituraAlternativa: number; mudouCredito: number } };
      assert.equal(s.totais.comLeituraAlternativa, 1);
      assert.ok(s.totais.mudouCredito >= 1);
      assert.equal(silencioso(() => executar(["adjudicacao", "aplicar", "--passada", P4, "--adjudicacao", dd, "--saida", join(P4, "x")])), 1, "saída dentro da passada");
      assert.equal(silencioso(() => executar(["adjudicacao", "aplicar", "--passada", P4, "--adjudicacao", dd, "--saida", join(trio, "adjudicada-cli")])), 0);
      const j = JSON.parse(readFileSync(join(trio, "adjudicada-cli", "julgamentos.json"), "utf8")) as { completo: boolean; julgamentos: { id: string; derivado: { classe: string; fundamentacao: string | null } }[] };
      assert.ok(j.completo);
      assert.equal(j.julgamentos.find(x => x.id === "T3-3a139fd43c")!.derivado.fundamentacao, null, "o cartão do ferramentas também ficou sem crédito (incerta)");
      assert.equal(sha(readFileSync(join(P4, "julgamentos.json"))), p.julgSha, "a passada de entrada não mudou");
    });
    t("as passadas congeladas reais (T3, T4) não mudaram", () => {
      assert.equal(shaArvore(join(TRIO, "primeira-passada-20261019T3")), antes.t3);
      assert.equal(shaArvore(join(TRIO, "primeira-passada-20261019T4")), antes.t4);
    });
    t("regras fixas: os três gatilhos estão escritos", () => { for (const g of ["**(a)**", "**(b)**", "**(c)**", "nao-alcancado"]) assert.ok(REGRAS_CAMPANHA.includes(g)); });
  }
  // ─────────────────────────────────────────────────────────── [D-165] gatilho (d): unidade por regra publicada
  const D366 = join(RESULTADOS, "analises", "dev-366-b-01");
  const okD = ["primeira-passada-20261103T1", "p03/analisar-20261103T1"].every(d => existsSync(join(D366, d)));
  if (!okD) { pulados++; console.log("  (pulado) gatilho (d): dev-366-b-01 ausente em govbr-resultados"); }
  else {
    console.log("revisão de campanha nova: gatilho (d) (cópia temporária da dev-366-b-01; regra de teste; respostas = as da 1ª passada)");
    const raiz = join(tmp, "d366"), PD = join(raiz, "primeira-passada-20261103T1"), AD = join(raiz, "p03", "analisar-20261103T1");
    cpSync(join(D366, "primeira-passada-20261103T1"), PD, { recursive: true });
    cpSync(join(D366, "p03", "analisar-20261103T1"), AD, { recursive: true });
    const julgAntes = sha(readFileSync(join(D366, "primeira-passada-20261103T1", "julgamentos.json")));
    const bloco = (casca: Record<string, string[]>) => "```json regra-mecanica\n" + JSON.stringify({ formato: FORMATO_REGRA_MECANICA, derivacao: DERIVACAO_TEMPLATE_REGISTRO,
      identificadorDeRegistro: "^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\\d+)$", casca }, null, 2) + "\n```\n";
    const regraTxt = "# Regra de teste (template × registro)\n\nTexto da regra para o teste: crédito só no sujeito e no estado alcançados.\n\n" + bloco({ vistorias: ["pnip-header"] });
    const regraArq = join(raiz, "regra-teste.md");
    gravar(raiz, "regra-teste.md", regraTxt);
    const regraSha = sha(regraTxt);
    let pd!: Passada;
    t("(d) regra: sha256 diferente recusa; RASCUNHO recusa; sem bloco ou derivação desconhecida = lista não derivável", () => {
      pd = lerPassada(PD, { analises: [AD] });
      assert.throws(() => lerRegraPublicada(regraArq, "0".repeat(64)), /sha256 .* ≠ --regra-sha256/);
      gravar(raiz, "r-rasc.md", "# RASCUNHO\n" + bloco({ vistorias: [] }));
      assert.throws(() => lerRegraPublicada(join(raiz, "r-rasc.md"), sha(readFileSync(join(raiz, "r-rasc.md")))), /RASCUNHO/);
      gravar(raiz, "r-sem.md", "# regra sem bloco\n");
      assert.throws(() => lerRegraPublicada(join(raiz, "r-sem.md"), sha(readFileSync(join(raiz, "r-sem.md")))), /não é derivável/);
      const outra = regraTxt.replace(DERIVACAO_TEMPLATE_REGISTRO, "outra-1.0.0");
      gravar(raiz, "r-outra.md", outra);
      assert.throws(() => lerRegraPublicada(join(raiz, "r-outra.md"), sha(outra)), /derivação desconhecida/);
      assert.equal(lerRegraPublicada(regraArq, regraSha).sha256, regraSha);
    });
    t("(d) derivação: só cartões + chave + referência + 1ª passada; B-23 e B-21 exatamente; extras listados, nada escolhido à mão", () => {
      const af = derivarAfetados(pd, lerRegraPublicada(regraArq, regraSha));
      const tela = af.telas.find(x => x.tela === "vistorias")!;
      assert.deepEqual(tela.specsAbrangidas, ["B-20", "B-21", "B-22", "B-23", "B-24", "B-27"]);
      assert.deepEqual(tela.specsDaCasca, ["B-15", "B-16", "B-17", "B-18", "B-19"]);
      const u = (s: string) => af.unidades.find(x => x.specs.includes(s))!.membros;
      assert.deepEqual(u("B-23"), ["T3-6e9d59e4a4", "T3-7cfe341162", "T3-8fcadb0eda", "T3-c8eaa55823"]);
      assert.deepEqual(u("B-21"), ["T3-6616e32cb7", "T3-8a51b4042a", "T3-fe4106e116"]);
      assert.equal(af.total, 14); assert.equal(af.unidades.length, 7);
      assert.deepEqual(af.cartoes.find(c => c.id === "T3-8a51b4042a")!.criterios, ["credita-na-1a-passada:B-21"]);
      assert.deepEqual(derivarAfetados(pd, lerRegraPublicada(regraArq, regraSha)), af, "determinística");
    });
    t("(d) lista não derivável: tela com rota de registro sem casca declarada; passada sem parada de registro (tela A)", () => {
      const sem = regraTxt.replace('"vistorias": [\n      "pnip-header"\n    ]', '"outra": []');
      gravar(raiz, "r-casca.md", sem);
      assert.notEqual(sem, regraTxt);
      assert.throws(() => derivarAfetados(pd, lerRegraPublicada(join(raiz, "r-casca.md"), sha(sem))), /não declara a casca da tela vistorias.*não é derivável/);
      const P4e = join(tmp, "trio-01", "primeira-passada-20261019T4");
      if (existsSync(P4e)) assert.throws(() => derivarAfetados(lerPassada(P4e), lerRegraPublicada(regraArq, regraSha)), /nenhuma referência .* parada em rota de registro.*não é derivável/);
    });
    const RD = join(raiz, "revisao-d"), ddD = join(RD, "adjudicacao");
    let prD!: ReturnType<typeof prepararAdjudicacao>;
    t("(d) só, sem confiabilidade: manifesto com confiabilidade null + motivo, regra e afetados com sha256; lote (d) traz a regra como 3º arquivo", () => {
      assert.throws(() => prepararAdjudicacao(pd, {}), /falta --confiabilidade/);
      prD = prepararAdjudicacao(pd, { regra: { arquivo: regraArq, sha256: regraSha } });
      assert.equal(prD.cegueira.resultado, "OK", JSON.stringify(prD.cegueira.falhas.slice(0, 3)));
      assert.equal(prD.unidades.length, 7);
      assert.ok(prD.unidades.every(u => u.gatilhos.join() === "d"));
      const man = JSON.parse(prD.arquivosInternos.get("manifesto.json")!) as Record<string, any>;
      assert.equal(man.confiabilidade, null);
      assert.match(man.semConfiabilidade.motivo, /só do gatilho \(d\)/);
      assert.equal(man.regraPublicada.sha256, regraSha);
      assert.equal(man.afetados.sha256, sha(prD.arquivosInternos.get("chave/afetados.json")!));
      assert.equal(man.regraPublicada.regrasGatilhoDSha256, sha(REGRAS_GATILHO_D));
      assert.equal(man.arquivos["lotes/regra-teste.md"], regraSha);
      assert.equal(man.regrasSha256, sha(REGRAS_CAMPANHA), "o regras.md da revisão não muda");
      const l = JSON.parse(prD.arquivosDoJuiz.get("lotes/lote-d01.json")!) as Record<string, any>;
      assert.deepEqual(l.instrucoesDaRegra, { arquivo: "regra-teste.md", sha256: regraSha });
      assert.equal(l.esquema.arquivo, "esquema-adjudicacao-regra-a.schema.json");
      for (const [rel, txt] of prD.arquivosDoJuiz) if (rel.startsWith("lotes/lote-d")) for (const id of pd.item.keys()) assert.ok(!txt.includes(id), `${rel} traz id da 1ª passada`);
      gravarImutavel(ddD, [...prD.arquivosDoJuiz, ...prD.arquivosInternos]);
    });
    t("(d) a regra entregue com a palavra do desenho experimental falha na cegueira (o texto da regra também é conferido)", () => {
      const comBraco = regraTxt.replace("Texto da regra", "Vale igual em todo braço. Texto da regra");
      gravar(raiz, "r-braco.md", comBraco);
      const r = prepararAdjudicacao(pd, { regra: { arquivo: join(raiz, "r-braco.md"), sha256: sha(comBraco) } });
      assert.equal(r.cegueira.resultado, "FALHOU");
      assert.ok(r.cegueira.falhas.some(f => f.arquivo === "lotes/r-braco.md" && f.regra === "palavra braço"));
    });
    const chD = () => JSON.parse(readFileSync(join(ddD, "chave", "adjudicacao-chave.json"), "utf8")) as { unidades: { id: string; lote: string; specsDaRegra?: string[]; membros: { id: string; idOriginal: string }[] }[] };
    const manD = () => JSON.parse(readFileSync(join(ddD, "manifesto.json"), "utf8")) as { lotes: { lote: string }[] };
    // Leitura sintética: adotada = não demonstrada (credita o que a 1ª passada creditou); demonstrada = toda a unidade B-23 credita B-23.
    const leit = (lote: string, ajuste?: (x: Record<string, unknown>) => void) => { const u = chD().unidades.find(x => x.lote === lote)!;
      const porCartao = u.membros.map(m => ({ id: m.id, registroAlcancado: "rota de detalhe medida pela receita do cartão",
        creditaSeIdentidadeDemonstrada: (u.specsDaRegra ?? []).includes("B-23") ? "B-23" : specDetectada(pd.julgados.get(m.idOriginal)!.derivado),
        creditaSeIdentidadeNaoDemonstrada: specDetectada(pd.julgados.get(m.idOriginal)!.derivado) }));
      const x = { regraSha256: regraSha, leituraAdotada: "identidade-nao-demonstrada", evidenciaDeIdentidade: "sintético: nenhuma evidência arquivada de identidade entre os registros", porCartao };
      ajuste?.(x); return x; };
    const etapaD = (lote: string, e: "a" | "b", extra: Record<string, unknown> = {}) => {
      const u = chD().unidades.find(x => x.lote === lote)!;
      const loteTxt = readFileSync(join(ddD, "lotes", e === "a" ? `${lote}.json` : `${lote}-b.json`), "utf8");
      const lj = JSON.parse(loteTxt) as { grupo: { pedeLeituraDaNorma: boolean } };
      const rs = u.membros.map(m => ({ ...pd.julgados.get(m.idOriginal)!.resposta, id: m.id }));
      const n0 = rs.map(r => r.norma).find(n => n !== NAO_PERGUNTADO) as { id: string; forca: string } | undefined;
      const leitura = lj.grupo.pedeLeituraDaNorma && n0 ? { norma: n0.id, fonteEVersao: "WCAG 2.2 / base do DS", forca: n0.forca, antecedente: "quando o elemento existe", excecoes: "nenhuma conhecida",
        evidenciaNecessaria: "medida da página congelada", permiteConcluir: "a violação no estado da receita" } : NAO_PERGUNTADO;
      gravar(ddD, `respostas/${lote}-${e}.json`, jsonTexto({ formato: e === "a" ? FORMATO_ADJ_RESP_A : FORMATO_ADJ_RESP_B, lote: e === "a" ? lote : `${lote}-b`, loteSha256: sha(loteTxt),
        juiz: "adjudicador sintético", etapa: e, grupo: u.id, leituraDaNorma: leitura, respostas: rs, leiturasDaRegra: leit(lote),
        ...(e === "b" ? { leiturasAlternativasPlausiveis: [], classificacaoDaDivergencia: { tipos: ["falta-de-evidencia"], evidencias: [rs[0].id], justificativa: "sintético: a resposta B repete a leitura anterior do cartão." } } : {}), ...extra }));
    };
    const loteB23 = () => chD().unidades.find(u => (u.specsDaRegra ?? []).includes("B-23"))!.lote;
    t("(d) etapa A: sem leiturasDaRegra recusa (esquema); crédito fora da leitura adotada recusa; regra adulterada no lote recusa", () => {
      for (const x of manD().lotes) etapaD(x.lote, "a");
      const l = loteB23();
      assert.deepEqual(loteB(pd, ddD, l).erros, []);
      etapaD(l, "a", { leiturasDaRegra: undefined });
      assert.match(loteB(pd, ddD, l).erros.join(), /esquema .*leiturasDaRegra/);
      etapaD(l, "a", { leiturasDaRegra: leit(l, x => { x.leituraAdotada = "identidade-demonstrada"; }) });
      assert.match(loteB(pd, ddD, l).erros.join(), /mas leiturasDaRegra \(identidade-demonstrada\) diz B-23/);
      etapaD(l, "a", { leiturasDaRegra: leit(l, x => { (x.porCartao as unknown[]).pop(); }) });
      assert.match(loteB(pd, ddD, l).erros.join(), /porCartao: falta/);
      etapaD(l, "a", { leiturasDaRegra: leit(l, x => { x.regraSha256 = "1".repeat(64); }) });
      assert.match(loteB(pd, ddD, l).erros.join(), /regraSha256 não é o da regra/);
      etapaD(l, "a");
      const orig = readFileSync(join(ddD, "lotes", "regra-teste.md"), "utf8");
      gravar(ddD, "lotes/regra-teste.md", orig + "x");
      assert.match(loteB(pd, ddD, l).erros.join(), /difere do sha256 da regra/);
      gravar(ddD, "lotes/regra-teste.md", orig);
    });
    t("[Codex d0d554fa P1] (d) etapa A: a leitura alternativa só varia o vínculo — fato falso, estado não alcançado, norma não aplicável ou não violada, origem DS e spec alheia ao fato são recusados; violação verdadeira credita só pelo vínculo", () => {
      const l = loteB23();
      const u = chD().unidades.find(x => x.lote === l)!;
      const m = u.membros.find(x => x.idOriginal === "T3-8fcadb0eda")!;
      // Positivo (o caso da sensibilidade): violação verdadeira sem vínculo na leitura adotada (null) credita B-23 na
      // leitura 'demonstrada' só pelo vínculo, pela mesma derivação.
      etapaD(l, "a");
      assert.deepEqual(loteB(pd, ddD, l).erros, []);
      const r0 = pd.julgados.get(m.idOriginal)!.resposta;
      assert.equal(specDetectada(pd.julgados.get(m.idOriginal)!.derivado), null);
      const ctx = contextoNaPassada(pd, pd.cartao.get(m.idOriginal)!, pd.item.get(m.idOriginal)!);
      assert.equal(specDetectada(derivarNaLeitura(r0, ctx, "B-23")), "B-23");
      // Negativos: só a resposta desse cartão muda; a leitura adotada continua null (sem crédito) e a alternativa credita B-23.
      const respostas = (f: (r: Resposta) => Resposta) => u.membros.map(x => { const r = { ...pd.julgados.get(x.idOriginal)!.resposta, id: x.id }; return x.id === m.id ? f(r) : r; });
      const n = r0.norma as Exclude<Resposta["norma"], typeof NAO_PERGUNTADO>;
      // Norma que não vale: a sugestão (R11d) e a referência do cartão (REF1, 1.3.0) também têm de ser respondidas, e a
      // referência também não vale (nenhum resgate): a classe fica erro normativo.
      const semNorma = (r: Resposta, aplicabilidade: "aplica" | "nao-aplica"): Resposta => ({ ...r, norma: { ...n, aplicabilidade, violada: "nao" },
        sugestao: { trataOFato: "nao", especificaDoSujeito: "sim", naoViolaNormaObrigatoria: "sim", qualidade: "invalida" },
        referencias: [{ id: "REF1", forca: "obrigatorio", aplicabilidade, violada: "nao" }] });
      const casos: [string, (r: Resposta) => Resposta, RegExp][] = [
        ["fato falso (o caso do Codex)", r => ({ ...r, verdadeFactual: "falsa" }), /\(identidade-demonstrada\): credita B-23, mas .* deriva erro-factual \(R1\), sem crédito/],
        ["estado não alcançado", r => ({ ...r, verdadeFactual: "indisponivel", estadoAlcancado: "nao-alcancado" }), /\(identidade-demonstrada\): credita B-23, mas .* deriva evidencia-indisponivel \(R9\), sem crédito/],
        ["norma não se aplica", r => semNorma(r, "nao-aplica"), /\(identidade-demonstrada\): credita B-23, mas .* deriva erro-normativo \(R11\), sem crédito/],
        ["norma não violada", r => semNorma(r, "aplica"), /\(identidade-demonstrada\): credita B-23, mas .* deriva erro-normativo \(R11\), sem crédito/],
      ];
      for (const [nome, f, re] of casos) {
        etapaD(l, "a", { respostas: respostas(f) });
        const e = loteB(pd, ddD, l).erros;
        assert.ok(e.some(x => re.test(x) && x.includes(m.id)), `${nome}: ${JSON.stringify(e)}`);
        // Com as duas leituras null, a mesma resposta passa: a exclusão vale nas duas leituras.
        etapaD(l, "a", { respostas: respostas(f), leiturasDaRegra: leit(l, x => { for (const y of x.porCartao as { id: string; creditaSeIdentidadeDemonstrada: string | null }[]) if (y.id === m.id) y.creditaSeIdentidadeDemonstrada = null; }) });
        assert.deepEqual(loteB(pd, ddD, l).erros, [], nome);
      }
      // Origem DS: a origem vem da medida (chave), não da resposta; a mesma conferência que validarEtapa usa recusa.
      assert.match(conferirLeitura(r0, { ...ctx, origemMedida: "ds-entregue" }, "B-23", ["B-23"]).erros.join(), /deriva violacao-ds \(R5\), sem crédito/);
      // Spec alheia ao fato: B-10 não é da unidade (B-23) nem das candidatas do cartão.
      assert.ok(!pd.cartao.get(m.idOriginal)!.candidatas.includes("B-10"));
      etapaD(l, "a", { leiturasDaRegra: leit(l, x => { for (const y of x.porCartao as { id: string; creditaSeIdentidadeDemonstrada: string | null }[]) if (y.id === m.id) y.creditaSeIdentidadeDemonstrada = "B-10"; }) });
      assert.ok(loteB(pd, ddD, l).erros.some(x => x.includes(m.id) && /spec B-10 alheia ao fato do cartão \(só uma spec da unidade ou das candidatas do cartão: B-01, B-23\)/.test(x)), JSON.stringify(loteB(pd, ddD, l).erros));
      etapaD(l, "a");
      assert.deepEqual(loteB(pd, ddD, l).erros, []);
    });
    t("(d) revelar → B → aplicar sem confiabilidade: sensibilidade-regra.json; 1ª passada intacta; tabela: com 18 → 19 na leitura 'demonstrada'", () => {
      for (const x of manD().lotes) {
        const r = loteB(pd, ddD, x.lote);
        assert.deepEqual(r.erros, []);
        const b = JSON.parse(r.texto!) as Record<string, any>;
        assert.equal(b.instrucoesDaRegra.sha256, regraSha); assert.equal(b.esquema.arquivo, "esquema-adjudicacao-regra-b.schema.json");
        assert.deepEqual(b.leiturasAnteriores[0].leituras.map((y: { leitura: string }) => y.leitura), ["leitura 1"], "sem amostra: só a 1ª passada");
        gravarImutavel(ddD, [[`lotes/${x.lote}-b.json`, r.texto!], [`chave/revelacao-${x.lote}.json`, r.revelacao!]]);
      }
      for (const x of manD().lotes) etapaD(x.lote, "b");
      const ap = aplicarAdjudicacao(pd, ddD);
      assert.deepEqual(ap.erros, []);
      const sens = JSON.parse(ap.arquivos.get("adjudicacao/sensibilidade-regra.json")!) as SensibilidadeRegra;
      assert.equal(sens.cartoes.length, 14);
      assert.equal(sens.regra!.sha256, regraSha);
      assert.equal(sha(readFileSync(join(PD, "julgamentos.json"))), pd.julgSha);
      assert.equal((JSON.parse(ap.arquivos.get("contestados.json")!) as { confiabilidade: unknown }).confiabilidade, null);
      const ch = new Map(pd.itens.map(i => [i.chave, i.braco]));
      const js = [...pd.julgados.values()].map(j => ({ ...j, chave: pd.item.get(j.id)!.chave })) as never[];
      const ref = JSON.parse(readFileSync(join(AD, "entradas", "referencia.json"), "utf8")) as { violations: { id: string; categories: string[] }[] };
      const tab = tabular(js, k => ch.get(k)!, ref.violations, "politica-normativa-1.3.0", ["sem", "ferramentas", "com"]);
      const cen = cenariosDaRegra(js, k => ch.get(k)!, tab, sens, { primeira: js, fato: fatoDaPassada(PD, "politica-normativa-1.3.0") });
      assert.equal(cen.porCenario["1a-passada"].com!.deteccao, 18);
      assert.equal(cen.porCenario["identidade-nao-demonstrada"].com!.deteccao, 18);
      assert.equal(cen.porCenario["identidade-demonstrada"].com!.deteccao, 19);
      assert.equal(cen.porCenario["identidade-demonstrada"].sem!.deteccao, cen.porCenario["1a-passada"].sem!.deteccao);
      assert.match(cenariosMd(cen, tab.bracos), /\| identidade-demonstrada \| 15 \| 14 \| 19 \|/);
    });
    t("(d) CLI: --regra-publicada sem --regra-sha256 recusa; --evidencia sem regra recusa; a fonte real da passada não mudou", () => {
      assert.equal(silencioso(() => executar(["adjudicacao", "preparar", "--passada", PD, "--analise", AD, "--saida", join(raiz, "x"), "--regra-publicada", regraArq])), 1);
      assert.equal(silencioso(() => executar(["adjudicacao", "preparar", "--passada", PD, "--analise", AD, "--saida", join(raiz, "x"), "--evidencia", regraArq])), 1);
      assert.equal(silencioso(() => executar(["adjudicacao", "preparar", "--passada", PD, "--analise", AD, "--saida", join(raiz, "y"), "--regra-publicada", regraArq, "--regra-sha256", regraSha])), 0);
      assert.equal(readFileSync(join(raiz, "y", "adjudicacao", "manifesto.json"), "utf8"), readFileSync(join(ddD, "manifesto.json"), "utf8"));
      assert.equal(sha(readFileSync(join(D366, "primeira-passada-20261103T1", "julgamentos.json"))), julgAntes);
    });
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da revisão de campanha nova passaram${pulados ? ` (${pulados} bloco pulado)` : ""}`);
if (falhas) process.exit(1);
