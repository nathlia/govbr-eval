/**
 * Testes da seleção para a autora (§8.4, material-autora.ts + autora-respostas.ts; plano de revisão 19/10, entrega 6) e do
 * consumo das respostas dela no S4' (recalculo-campanha.ts --ratificacoes). Sem modelo, sem rede.
 *   1. sintético: CLI, cotas 10/15, repasse ao estrato 1 (vazio e com poucos cartões), sobra sem uso, balanceamento
 *      com/ferramentas, determinismo e efeito da semente, precedência dos estratos, leitura das linhas da autora, desfechos;
 *   2. ensaio (D-138, fora da amostra; só leitura): seleção na passada adjudicada com a origem medida, estrato 1 medido pelo
 *      recálculo, material cego (sem vazamento de braço; vazamento injetado é pego), máscara 1.3.0 regenerada igual à da
 *      passada T5, determinismo, e o S4' consumindo respostas SINTÉTICAS (pasta temporária). Pula se o ensaio não existir.
 *   npx tsx scripts/reanalise-nat74/test-material-autora.ts
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { desfechoDaAutora, desfechoDaPassada, lerTextoDaAutora, ratifica, type RespostaAutora } from "./autora-respostas";
import { RESULTADOS, lerJson, sha } from "./comum";
import { prepararCampanha } from "./e14-campanha";
import { COTAS, estratoDe, executar, gravarArquivos, ordemDoEstrato, prepararMaterial, responder, selecionar, type Candidato } from "./material-autora";
import { recalcular, type TabelaComparacao } from "./recalculo-campanha";
import { gravarImutavel } from "./revisao-campanha";

let n = 0, falhas = 0, pulados = 0;
const t = async (nome: string, f: () => void | Promise<void>) => { n++; try { await f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };
const silencioso = async <T>(f: () => T | Promise<T>): Promise<T> => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return await f(); } finally { console.error = e; console.log = l; } };

const PAR: [string, string] = ["ferramentas", "com"];
let k = 0;
const cand = (estrato: number | null, braco: string): Candidato => { k++; return { id: `T3-${String(k).padStart(10, "0")}`, chave: `c|p|C-${k}`, braco, trio: "trio-01", classe: "x", estrato, motivo: "" }; };
const muitos = (estrato: number, m: number, bracos = ["com", "ferramentas", "sem"]) => Array.from({ length: m }, (_, i) => cand(estrato, bracos[i % bracos.length]));

console.log("material da autora: sintético");
const tmp = mkdtempSync(join(tmpdir(), "material-autora-"));
try {
  await t("CLI: modo, --saida e --passada obrigatórios; teto fora de 10/15 recusa; --saida existente recusa", async () => {
    assert.equal(await silencioso(() => executar([])), 1);
    assert.equal(await silencioso(() => executar(["preparar", "--saida", join(tmp, "x")])), 1);
    assert.equal(await silencioso(() => executar(["preparar", "--passada", join(tmp, "p")])), 1);
    assert.equal(await silencioso(() => executar(["preparar", "--passada", join(tmp, "p"), "--saida", tmp])), 1);
    assert.equal(await silencioso(() => executar(["preparar", "--passada", join(tmp, "p"), "--saida", join(tmp, "y"), "--fila", "z"])), 1);
    assert.equal(await silencioso(() => executar(["responder", "--material", join(tmp, "m"), "--saida", join(tmp, "y")])), 1);
    assert.throws(() => selecionar([], { teto: 12, semente: "s", par: PAR }), /teto 12/);
  });

  await t("cotas pré-registradas: 10 = 3/2/2/2/1, 15 = 5/3/3/2/2; estratos cheios dão exatamente as cotas", async () => {
    assert.deepEqual(COTAS[10], [3, 2, 2, 2, 1]); assert.deepEqual(COTAS[15], [5, 3, 3, 2, 2]);
    const cs = [1, 2, 3, 4, 5].flatMap(e => muitos(e, 8));
    for (const teto of [10, 15]) {
      const s = selecionar(cs, { teto, semente: "s", par: PAR });
      assert.deepEqual(s.estratos.map(e => e.selecionados.length), COTAS[teto]);
      assert.equal(s.selecionados.length, teto); assert.equal(s.semUso, 0);
      assert.equal(new Set(s.selecionados).size, teto);
    }
  });

  await t("repasse: estrato vazio e estrato com menos cartões que a cota passam a sobra ao estrato 1; o que o 1 não usa fica sem uso", async () => {
    const cs = [...muitos(1, 10), ...muitos(3, 1), ...muitos(4, 2), ...muitos(5, 3)]; // 2 vazio (2), 3 com 1 de 2 (1)
    const s = selecionar(cs, { teto: 10, semente: "s", par: PAR });
    const e = (x: number) => s.estratos[x - 1];
    assert.equal(e(2).repassadoAo1, 2); assert.equal(e(3).repassadoAo1, 1); assert.equal(e(1).recebido, 3);
    assert.equal(e(1).cotaEfetiva, 6); assert.equal(e(1).selecionados.length, 6); assert.equal(s.selecionados.length, 10);
    const pouco = selecionar([...muitos(1, 2), ...muitos(4, 2)], { teto: 10, semente: "s", par: PAR });
    assert.equal(pouco.estratos[0].cotaEfetiva, 3 + 2 + 2 + 1); assert.equal(pouco.estratos[0].selecionados.length, 2);
    assert.equal(pouco.semUso, 6); assert.equal(pouco.selecionados.length, 4);
    const nada = selecionar([], { teto: 15, semente: "s", par: PAR });
    assert.equal(nada.semUso, 15); assert.equal(nada.selecionados.length, 0);
  });

  await t("balanceamento: com e ferramentas alternados quando os dois existem; os outros braços só depois; um só braço → ele primeiro", async () => {
    const cs = [...muitos(1, 6, ["com"]), ...muitos(1, 6, ["ferramentas"]), ...muitos(1, 6, ["sem"])];
    for (const q of [2, 4, 6]) {
      const s = selecionar(cs, { teto: 15, semente: `q${q}`, par: PAR });
      void s;
      const { ordem } = ordemDoEstrato(cs, 1, `q${q}`, PAR);
      const top = ordem.slice(0, q);
      assert.equal(top.filter(c => c.braco === "com").length, q / 2); assert.equal(top.filter(c => c.braco === "ferramentas").length, q / 2);
    }
    const { ordem } = ordemDoEstrato(cs, 1, "x", PAR);
    assert.ok(ordem.slice(0, 12).every(c => c.braco !== "sem"), "sem só depois de com e ferramentas");
    const s3 = ordemDoEstrato([...muitos(3, 1, ["com"]), ...muitos(3, 3, ["ferramentas"]), ...muitos(3, 2, ["sem"])], 3, "y", PAR).ordem;
    assert.deepEqual(s3.slice(0, 4).map(c => c.braco).sort(), ["com", "ferramentas", "ferramentas", "ferramentas"]);
    const so = ordemDoEstrato([...muitos(4, 3, ["sem"]), ...muitos(4, 2, ["com"])], 4, "z", PAR);
    assert.equal(so.inicio, null); assert.deepEqual(so.ordem.slice(0, 2).map(c => c.braco), ["com", "com"]);
  });

  await t("semente: mesma semente → mesma seleção; semente diferente muda a ordem (e o braço de início varia com ela)", async () => {
    const cs = [1, 2, 3, 4, 5].flatMap(e => muitos(e, 9));
    const a = selecionar(cs, { teto: 10, semente: "campanha.design.seed=1", par: PAR }), b = selecionar(cs, { teto: 10, semente: "campanha.design.seed=1", par: PAR });
    assert.deepEqual(a, b);
    const outras = Array.from({ length: 8 }, (_, i) => selecionar(cs, { teto: 10, semente: `campanha.design.seed=${i + 2}`, par: PAR }));
    assert.ok(outras.some(o => JSON.stringify(o.selecionados) !== JSON.stringify(a.selecionados)));
    assert.ok(new Set(outras.map(o => o.estratos[0].inicio)).size === 2, "início com/ferramentas depende da semente");
  });

  await t("precedência: estrato 1 (|ΔD_fc| ≥ 1) antes de tudo; depois FP, novo, DS, linha de base; resto fora", async () => {
    const d = (classe: string, spec: string | null = null, fundamentacao: "norma" | null = null) => ({ classe: classe as never, spec, fundamentacao });
    const ef = (delta: number) => ({ id: "x", trio: "t", braco: "com", inversao: "tira-credito" as const, spec: "A-01", dBase: 0, dInvertido: delta, delta });
    assert.equal(estratoDe({ braco: "com", derivado: d("violacao-pagina", "A-01", "norma"), efeito: ef(1) }).estrato, 1);
    assert.equal(estratoDe({ braco: "com", derivado: d("violacao-pagina", "A-01", "norma"), efeito: ef(0) }).estrato, null);
    assert.equal(estratoDe({ braco: "com", derivado: d("erro-factual"), efeito: ef(-1) }).estrato, 1);
    assert.equal(estratoDe({ braco: "lb-axe", derivado: d("erro-factual"), efeito: null }).estrato, 2);
    assert.equal(estratoDe({ braco: "sem", derivado: d("erro-normativo"), efeito: null }).estrato, 2);
    assert.equal(estratoDe({ braco: "com", derivado: d("violacao-origem-indeterminada"), efeito: null }).estrato, 3);
    assert.equal(estratoDe({ braco: "lb-validator", derivado: d("violacao-ds", "A-01"), efeito: null }).estrato, 4);
    assert.equal(estratoDe({ braco: "lb-validator", derivado: d("violacao-pagina", "A-06", "norma"), efeito: null }).estrato, 5);
    assert.equal(estratoDe({ braco: "com", derivado: d("evidencia-indisponivel"), efeito: null }).estrato, null);
  });

  await t("linhas da autora: acentos, vírgulas, 'não sei', nota; erros por caso faltando, duplicado, valor fora da lista, resposta a mais", async () => {
    const o = { casos: ["R-01", "R-02", "R-03", "R-04", "R-05"], defeitos: ["A-01", "A-04", "P-02"] };
    const ok = lerTextoDaAutora("Respostas:\nR-01: Sim, sim, a-04, Página\nR-02: não\n- R-03: sim nao\nR-04: sim sim nenhum ds # parece do DS\nR-05: Não sei", o);
    assert.deepEqual(ok.erros, []);
    assert.deepEqual(ok.respostas.map(r => desfechoDaAutora(r)), ["credita:A-04", "falso", "sem-violacao", "violacao-ds", "pendente"]);
    assert.equal(ok.respostas[3].nota, "parece do DS");
    const ruim = lerTextoDaAutora("R-01: sim sim A-99 pagina\nR-02: nao sim\nR-02: nao\nR-03: talvez\nR-07: sim", o);
    assert.ok(ruim.erros.some(e => /a-99/i.test(e))); assert.ok(ruim.erros.some(e => /a mais/.test(e))); assert.ok(ruim.erros.some(e => /duas vezes/.test(e)));
    assert.ok(ruim.erros.some(e => /talvez/.test(e))); assert.ok(ruim.erros.some(e => /fora do material/.test(e))); assert.ok(ruim.erros.some(e => /sem resposta: R-04, R-05/.test(e)));
  });

  await t("desfechos: passada e autora no mesmo vocabulário; 'não sei' nunca ratifica", async () => {
    assert.equal(desfechoDaPassada({ classe: "violacao-pagina", spec: "A-04" }, true), "credita:A-04");
    assert.equal(desfechoDaPassada({ classe: "violacao-pagina", spec: null }, false), "achado-novo");
    assert.equal(desfechoDaPassada({ classe: "violacao-ds", spec: "A-04" }, false), "violacao-ds");
    assert.equal(desfechoDaPassada({ classe: "erro-factual", spec: null }, false), "falso");
    assert.equal(desfechoDaPassada({ classe: "observacao-norma-errada", spec: null }, false), "sem-violacao");
    assert.equal(desfechoDaPassada({ classe: "evidencia-indisponivel", spec: null }, false), "indisponivel");
    const r = (x: Partial<RespostaAutora>): RespostaAutora => ({ caso: "R-01", fato: "sim", viola: "sim", defeito: "A-04", origem: "nao-sei", nota: null, ...x });
    assert.equal(desfechoDaAutora(r({})), "credita:A-04", "origem não sabida = indeterminada, credita");
    assert.equal(desfechoDaAutora(r({ defeito: "nao-sei" })), "pendente");
    assert.ok(ratifica("credita:A-04", "credita:A-04")); assert.ok(!ratifica("credita:A-04", "credita:A-08")); assert.ok(!ratifica("pendente", "pendente"));
  });

  console.log("material da autora: ensaio (fora da amostra, só leitura; saídas em pasta temporária)");
  const T = join(RESULTADOS, "analises", "ensaio-trio-real-01", "trio-01");
  const ADJ = join(T, "revisao-20261019T7", "adjudicada-20261020T1"), T5 = join(T, "primeira-passada-20261019T5"), ORIG = join(T, "origem-20261020T2");
  if (![ADJ, T5, ORIG].every(d => existsSync(d))) { pulados++; console.log("  PULADO ensaio ausente"); }
  else {
    const base = { analises: [join(T, "analisar-20261019T1")], coletas: [join(T, "analisar-20261019T3", "coleta-trio.json")] };
    const m = await prepararMaterial({ passadas: [ADJ], origens: [ORIG], ...base });
    const sel = m.selecao as { estratos: { n: number; candidatos: number; porBraco: Record<string, number>; selecionados: string[]; repassadoAo1: number; recebido: number }[];
      paraAutora: { caso: string; id: string; braco: string; estrato: number }[]; julgadoSoPorLLM: { id: string; rotulo: string }[]; efeitosNoDfc: { id: string; delta: number }[] };
    await t("ensaio: 10 casos; estrato 1 medido (15 = todos os créditos A-* de com/ferramentas mudam o D_fc), 2 vazio repassa 2 ao 1; resto 'julgado só por LLM'", async () => {
      assert.equal(sel.paraAutora.length, 10);
      assert.deepEqual(sel.estratos.map(e => e.candidatos), [15, 0, 4, 6, 6]);
      assert.deepEqual(sel.estratos.map(e => e.selecionados.length), [5, 0, 2, 2, 1]);
      assert.equal(sel.estratos[1].repassadoAo1, 2); assert.equal(sel.estratos[0].recebido, 2);
      assert.equal(sel.julgadoSoPorLLM.length, 30); assert.ok(sel.julgadoSoPorLLM.every(x => x.rotulo === "julgado só por LLM"));
      assert.equal(sel.efeitosNoDfc.find(e => e.id === "T3-3a139fd43c")!.delta, 1, "tirar o A-04 do ferramentas: D_fc −1 → 0");
      assert.equal(sel.efeitosNoDfc.find(e => e.id === "T3-2423c7309f")!.delta, 0, "P-02 não entra no primário");
    });
    await t("ensaio: balanceado no estrato 1 (com 3, ferramentas 2) e no 3/4 (um de cada quando há os dois)", async () => {
      const br = (e: number) => sel.paraAutora.filter(c => c.estrato === e).map(c => c.braco).sort();
      assert.deepEqual(br(1), ["com", "com", "com", "ferramentas", "ferramentas"]);
      assert.deepEqual(br(3), ["com", "ferramentas"]); assert.deepEqual(br(4), ["com", "ferramentas"]);
    });
    const casos = String(m.arquivos.find(([r]) => r === "autora/casos.md")![1]), leiame = String(m.arquivos.find(([r]) => r === "autora/LEIAME.md")![1]);
    await t("cegueira: material OK; nenhum id da passada, braço, runId, estrato nem decisão no texto da autora; vazamento injetado é pego", async () => {
      assert.equal(m.cegueira.resultado, "OK");
      for (const x of [casos, leiame]) {
        assert.ok(!/T3-[0-9a-f]{10}/.test(x)); assert.ok(!/\bbra[çc]o/i.test(x)); assert.ok(!/\d{8}-\d{6}-solicitacao/.test(x));
        assert.ok(!/\bestrato [1-5]\b|julgado só por LLM|violacao-|erro-factual/.test(x));
      }
      assert.ok(m.arquivos.filter(([r]) => r.startsWith("autora/")).length === 2);
      for (const vaz of ["\nveio do braço com\n", "\nT3-3a139fd43c\n", "\n20261019-084110-solicitacao-com-c219\n", "\nestrato 1\n", "\n\"ferramentas\"\n"])
        assert.equal(m.conferir([["autora/casos.md", casos + vaz]]).resultado, "FALHOU", vaz.trim());
    });
    await t("chave e respostas: a chave liga caso → braço/estrato; responder grava o formato que o recálculo lê; S4' consome (ratificado não sai)", async () => {
      const mat = join(tmp, "material");
      gravarArquivos(mat, m.arquivos);
      const txt = join(tmp, "SINTETICO-nao-e-da-autora.txt");
      // Sintético: concorda com a passada em todo caso (a chave é lida só pelo teste).
      const chave = JSON.parse(String(m.arquivos.find(([r]) => r === "chave/chave-autora.json")![1])) as { casos: { caso: string; id: string; braco: string; desfechoPassada: string }[] };
      assert.ok(chave.casos.every(c => ["com", "ferramentas", "sem", "lb-axe", "lb-validator"].includes(c.braco)));
      const linha = (c: { caso: string; desfechoPassada: string }) => {
        const d = c.desfechoPassada;
        return `${c.caso}: ${d.startsWith("credita:") ? `sim sim ${d.slice(8)} pagina` : d === "achado-novo" ? "sim sim nenhum pagina" : d === "violacao-ds" ? "sim sim nenhum ds" : d === "falso" ? "nao" : d === "sem-violacao" ? "sim nao" : "nao sei"}`;
      };
      writeFileSync(txt, chave.casos.map(linha).join("\n"));
      const r = responder({ material: mat, texto: txt });
      assert.deepEqual(r.erros, []);
      const rd = join(tmp, "respostas"); gravarImutavel(rd, r.arquivos);
      const rec0 = recalcular({ passadas: [ADJ], origens: [ORIG], ...base, reamostragens: 200 });
      const rec = recalcular({ passadas: [ADJ], origens: [ORIG], ...base, reamostragens: 200, ratificacoes: join(rd, "respostas-autora.json") });
      const s0 = rec0.json.s4 as { retirados: string[] }, s1 = rec.json.s4 as { retirados: string[]; autora: { ratificam: number; casos: { id: string; ratifica: boolean }[] } };
      assert.deepEqual(s0.retirados, ["T3-3a139fd43c", "T3-a33fbfae10"]);
      assert.ok(s1.autora.casos.find(c => c.id === "T3-3a139fd43c")!.ratifica);
      assert.deepEqual(s1.retirados, [], "contestados ratificados não saem no S4'");
      const dfc = (x: typeof rec) => (x.json.tabelas as Record<string, TabelaComparacao[]>)["S4'|1.2.0|primario"][0].porTrio[0].d;
      assert.equal(dfc(rec0), 0); assert.equal(dfc(rec), -1);
      // Respostas adulteradas (desfecho trocado e .sha256 refeito) recusam; material de outra passada recusa.
      const doc = JSON.parse(r.arquivos[0][1]) as { respostas: { desfecho: string }[] };
      doc.respostas[0].desfecho = "falso";
      const ad = join(tmp, "adulterada"); const tx = JSON.stringify(doc);
      gravarImutavel(ad, [["respostas-autora.json", tx], ["respostas-autora.json.sha256", `${sha(tx)}  respostas-autora.json\n`]]);
      assert.throws(() => recalcular({ passadas: [ADJ], origens: [ORIG], ...base, reamostragens: 200, ratificacoes: join(ad, "respostas-autora.json") }), /desfecho gravado/);
      assert.throws(() => recalcular({ passadas: [ADJ], ...base, reamostragens: 200, ratificacoes: join(rd, "respostas-autora.json") }), /outra origem medida|nada usado/);
    });
    await t("máscara 1.3.0: o preparo das análises regenera os 40 cartões iguais aos do lote da passada T5 (1.3.0); determinismo", async () => {
      const prep = prepararCampanha([join(T, "analisar-20261019T3")]); // a análise sobre a qual a T5 foi preparada (mesmo pacote)
      const reg = new Map<string, string>();
      for (const [rel, x] of prep.arquivosDoJuiz) if (/^lotes\/lote-\d+\.json$/.test(rel)) for (const c of (JSON.parse(x) as { cartoes: { id: string }[] }).cartoes) reg.set(c.id, JSON.stringify(c));
      const l5 = lerJson<{ cartoes: { id: string }[] }>(join(T5, "lotes", "lote-01.json")).cartoes;
      assert.equal(l5.length, 40);
      for (const c of l5) assert.equal(reg.get(c.id), JSON.stringify(c), c.id);
      const m2 = await prepararMaterial({ passadas: [ADJ], origens: [ORIG], ...base });
      assert.deepEqual(m2.arquivos, m.arquivos);
    });
    const SITE = join(RESULTADOS, "sites", "c3846c433f5d3cc6d6a54036aebdf8c39c9899e7f2b083a12bd4843305bb24db");
    if (!existsSync(SITE)) { pulados++; console.log("  PULADO imagens: site congelado ausente"); }
    else await t("imagens: Playwright na página congelada, receita como escrita; 3 imagens por caso citadas no casos.md; medida literal; receita que não chega é dita; nome de imagem com braço é pego; site errado recusa", async () => {
      const mi = await prepararMaterial({ passadas: [ADJ], origens: [ORIG], ...base, site: SITE });
      assert.equal(mi.cegueira.resultado, "OK");
      const md = String(mi.arquivos.find(([r]) => r === "autora/casos.md")![1]);
      const imgs = mi.arquivos.filter(([r]) => r.startsWith("autora/img/"));
      assert.ok(imgs.length >= 20 && imgs.every(([r, b]) => /^autora\/img\/R-\d{2}-(?:tela|tela-sem-marca|recorte)\.png$/.test(r) && Buffer.isBuffer(b) && (b as Buffer).subarray(1, 4).toString() === "PNG"));
      for (const [r] of imgs) assert.ok(md.includes(`(${r.replace("autora/", "")})`), r);
      const com = imgs.find(([r]) => r.endsWith("R-01-tela.png"))![1] as Buffer, sem = imgs.find(([r]) => r.endsWith("R-01-tela-sem-marca.png"))![1] as Buffer;
      assert.ok(!com.equals(sem), "a marca aparece só na imagem com contorno");
      // R-03 = o achado P ("Tab x8 até #servico"): 8 Tabs param no #cpf, e o caso diz isso.
      const r03 = md.slice(md.indexOf("## R-03"), md.indexOf("## R-04"));
      assert.match(r03, /termina com o foco em &lt;input#cpf&gt;.*não em #servico/);
      assert.match(r03, /não chegam ao estado que o cartão descreve/);
      assert.match(r03, /outline-style/);
      assert.match(md, /foco depois dos passos: /);
      assert.ok(!/Estrato [A-Z] · variante|conferir-construcao.mjs|Sem predicado na referência/.test(md), "jargão interno retirado das descrições");
      const autora = mi.arquivos.filter(([r]) => r.endsWith(".md")) as [string, string][];
      assert.equal(mi.conferir(autora, ["autora/img/R-01-com.png"]).resultado, "FALHOU");
      assert.equal(mi.conferir(autora, ["autora/img/R-99-tela.png"]).resultado, "FALHOU", "imagem não citada");
      await assert.rejects(() => prepararMaterial({ passadas: [ADJ], origens: [ORIG], ...base, site: join(RESULTADOS, "sites", "nao-existe") }));
    });
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes do material da autora passaram${pulados ? ` (${pulados} parte(s) pulada(s))` : ""}`);
if (falhas) process.exit(1);
