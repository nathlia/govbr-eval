/**
 * Testes da revisão §8 (passos 2–3) para campanha nova (revisao-campanha.ts, plano de revisão 19/10, entrega 3). Sem modelo,
 * sem rede. Duas partes:
 *   1. sintética: CLI (pastas obrigatórias, nunca a fila histórica), semente, sorteio estratificado, união de gatilhos;
 *   2. formas do ensaio (D-138, fora da amostra): numa CÓPIA temporária do trio de ensaio (passadas T3/T4 + análise),
 *      o caminho inteiro — consistência → amostra → confiabilidade (juízes sintéticos j1/j2 e o substituto T3) →
 *      adjudicação A/B com respostas SINTÉTICAS → aplicar → passada adjudicada, 1ª passada preservada, contestados.
 *      Pula (com aviso) se o ensaio não estiver em govbr-resultados.
 *   npx tsx scripts/reanalise-nat74/test-revisao-campanha.ts
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RESULTADOS, gravar, gravarJson, jsonTexto, sha } from "./comum";
import { NAO_PERGUNTADO, type Resposta } from "./e14-comum";
import {
  FORMATO_ADJ_RESP_A, FORMATO_ADJ_RESP_B, REGRAS_CAMPANHA, aplicarAdjudicacao, consistencia, executar, lerArgs, lerPassada, loteB, medirConfiabilidade,
  prepararAdjudicacao, prepararAmostra, sementeDaCampanha, sortearAmostra, unidadesDaCampanha, gravarImutavel, type Passada,
} from "./revisao-campanha";

let n = 0, falhas = 0, pulados = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };
const silencioso = <T>(f: () => T): T => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return f(); } finally { console.error = e; console.log = l; } };

console.log("revisão de campanha nova: sintético");
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
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da revisão de campanha nova passaram${pulados ? ` (${pulados} bloco pulado)` : ""}`);
if (falhas) process.exit(1);
