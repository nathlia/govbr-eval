/**
 * Testes do derivado 1.1.0 (NAT-74): limites verdadeiros de D, medidas da T2, julgamentos da T3 na política e, de
 * ponta a ponta, o pipeline em pastas temporárias com julgamentos SINTÉTICOS (nunca lê fila-t3/respostas/ real).
 *   npm run test:reanalise-nat74-v110            (unidade + ponta a ponta: ~6 min, 5 execuções do pipeline)
 *   npm run test:reanalise-nat74-v110 -- --rapido (só os de unidade)
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CAMINHO_DERIVADO, CAMINHO_DERIVADO_110, RESULTADOS, gravar, lerJson, sha } from "./comum";
import { inventarioDeAtomos, familiaDaRegra, type AtomoArquivado } from "./e1";
import { FORMATO_RESPOSTAS, NAO_PERGUNTADO, derivarClasse, type CartaoCego, type ContextoDerivacao, type Resposta } from "./e14-comum";
import { ingerir } from "./e14-ingerir";
import { prepararFila } from "./e14-preparar";
import { contador, limitesDoPar } from "./limites";
import { compararExecucoes, executar } from "./pipeline";
import { classificar, classificarVariante, type AtomoEntrada, type JulgamentoT3 } from "./politica";
import { CAMINHO_MEDIDAS_T2, nomeUtil, vereditoT2, type MedidasT2 } from "./t2";

let n = 0, falhas = 0;
const t = async (nome: string, f: () => void | Promise<void>) => { n++; try { await f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };

// ───────────────────────────────────────────────────────────────── limites verdadeiros (revisão independente)
console.log("1.1.0: limites verdadeiros de D por par");
const specDe = new Map([["u1", "B-01"], ["u2", "B-02"], ["u3", "B-03"], ["a1", "A-01"], ["a2", "A-01"], ["p1", "P-01"]]);
const porSpec = contador("spec", u => specDe.get(u)), porUnidade = contador("unidade", u => specDe.get(u), "A-");
const S = (...xs: string[]) => new Set(xs);
await t("pendente só no sem: Dmin = com − sem_max, Dmax = com − sem_min", () => {
  const r = limitesDoPar({ sem: { confirmadas: S("u1"), admissiveis: S("u2", "u3") }, com: { confirmadas: S("u1", "u2"), admissiveis: S() } }, porSpec);
  assert.deepEqual([r.dMin, r.dMax], [2 - 3, 2 - 1]);
});
await t("pendente só no com: o intervalo cresce para cima", () => {
  const r = limitesDoPar({ sem: { confirmadas: S("u1"), admissiveis: S() }, com: { confirmadas: S("u1"), admissiveis: S("u2") } }, porSpec);
  assert.deepEqual([r.dMin, r.dMax], [0, 1]);
});
await t("pendente nos dois braços: o cenário 'arquivo restaurado nos dois' fica DENTRO dos limites, mas pode baixar D", () => {
  const sem = { confirmadas: S("u1"), admissiveis: S("u2", "u3") }, com = { confirmadas: S("u1", "u2"), admissiveis: S("u3") };
  const r = limitesDoPar({ sem, com }, porSpec);
  const dSemPendente = porSpec(com.confirmadas) - porSpec(sem.confirmadas); // 1
  const dRestaurado = porSpec([...com.confirmadas, "u3"]) - porSpec([...sem.confirmadas, "u2", "u3"]); // 0: baixou
  assert.ok(r.dMin <= dRestaurado && dRestaurado <= r.dMax && r.dMin <= dSemPendente && dSemPendente <= r.dMax);
  assert.ok(dRestaurado < dSemPendente);
  assert.deepEqual([r.dMin, r.dMax], [2 - 3, 3 - 1]);
});
await t("troca de braços inverte e espelha os limites; unidade repetida conta uma vez; modo unidade conta só A-xx", () => {
  const x = { sem: { confirmadas: S("u1"), admissiveis: S("u2") }, com: { confirmadas: S("u1", "u3"), admissiveis: S("u3", "u2") } };
  const a = limitesDoPar(x, porSpec), b = limitesDoPar({ sem: x.com, com: x.sem }, porSpec);
  assert.deepEqual([b.dMin, b.dMax], [0 - a.dMax, 0 - a.dMin].map(x => x + 0));
  assert.equal(porUnidade(["a1", "a2", "a1", "p1", "u1"]), 2);
  assert.equal(porSpec(["a1", "a2"]), 1);
  const semPendente = limitesDoPar({ sem: { confirmadas: S("u1"), admissiveis: S() }, com: { confirmadas: S("u1", "u2"), admissiveis: S() } }, porSpec);
  assert.equal(semPendente.dMin, semPendente.dMax); // sem pendente, colapsa
});

// ───────────────────────────────────────────────────────────────── T2: ligação e veredito por medida (sintético)
console.log("1.1.0: medidas da T2 (sintético)");
const nome = (n: string) => ({ papel: "button", nome: n, codigos: [], nomeUtil: nomeUtil(n), outer: "<button>" });
const estilo = (o: Partial<MedidasT2["estilos"]["sairRaio"]> = {}): MedidasT2["estilos"]["sairRaio"] => ({ receita: [], seletor: "x", propriedade: "margin-top", alcancado: true, computado: "-5px",
  atributoStyle: "margin-top: -5px;", vencedora: { seletor: "[atributo style]", valor: "-5px", origem: "inline", folha: null },
  literalNaPagina: [{ arquivo: "pnip/x.js", sha256: "0", trecho: "\"margin-top\",\"-5px\"" }], literalNoDS: 0, valorPx: -5, naEscala: false, escala: ["0px", "4px", "8px"], ...o });
const medidas = (o: { chip?: string; ds?: boolean } = {}): MedidasT2 => ({ formato: "x", ferramenta: {} as never, site: {} as never, ds: {} as never, regras: {},
  nomes: { chipFiltro: { receita: [], seletor: "", alcancado: true, elementos: [nome(o.chip ?? "")], todosSemNome: nomeUtil(o.chip ?? "") === "" },
    chipData: { receita: [], seletor: "", alcancado: true, elementos: [nome("")], todosSemNome: true },
    selectAtribuir: { receita: [], seletor: "", alcancado: true, elementos: [nome("")], todosSemNome: true } },
  estilos: { sairRaio: estilo({ propriedade: "border-radius", computado: "20px", valorPx: 20, semReceita: { presente: true, visivel: false } }),
    limparMargem: o.ds ? estilo({ vencedora: { seletor: ".br-button", valor: "-5px", origem: "regular", folha: "/core.css" }, literalNaPagina: [], literalNoDS: 1 }) : estilo(),
    buscarMargem: estilo({ valorPx: -38 }) },
  origem: { chips: { origem: "pagina", trechos: [], quemEscreve: "" }, selectAtribuir: { origem: "pagina", trechos: [], quemEscreve: "" } } });
const cartao = (o: Partial<Parameters<typeof vereditoT2>[0]>) => ({ regra: "button-name", seletor: "pnip-filter-panel .br-tag button", observado: "O botão de remover o filtro aplicado não tem nome acessível.",
  sujeitos: [], familia: "R2-nome", cenas: ["1280x900@inicial"], ...o });
const classe = (r: ReturnType<typeof vereditoT2>) => ("veredito" in r ? r.veredito.vigente.partes[0].classe ?? "null" : `pendente: ${r.pendente}`);
await t("R2: nome calculado vazio (glifo de ícone U+F00D não é nome) → violação página; nome real → erro normativo (R2)", () => {
  assert.equal(nomeUtil(""), ""); assert.equal(nomeUtil(" Remover "), "Remover");
  assert.equal(classe(vereditoT2(cartao({}), medidas(), "f")), "violacao-pagina");
  assert.equal(classe(vereditoT2(cartao({}), medidas({ chip: "Remover filtro" }), "f")), "erro-normativo");
  assert.equal(classe(vereditoT2(cartao({ seletor: "#swal2-select", regra: "select-name" }), medidas(), "f")), "violacao-pagina");
  // os dois chips juntos: verdadeiro só se os dois sem nome
  const dois = cartao({ seletor: ".br-tag button", observado: "O botão do chip \"Barra Nova\" e do chip \"Exibindo vistorias até 30/03/2026\" não tem nome acessível." });
  assert.equal(classe(vereditoT2(dois, medidas(), "f")), "violacao-pagina");
  assert.equal(classe(vereditoT2(dois, medidas({ chip: "Remover" }), "f")), "erro-normativo");
});
await t("R2 só decide alegação de nome ausente: papel/estado fica sem decisão (vai à T3)", () => {
  assert.match(classe(vereditoT2(cartao({ regra: "wcag:4.1.2", seletor: "#total, #page", observado: "Não têm role=combobox, aria-expanded nem aria-controls." }), medidas(), "f")), /^pendente: R2 restrita/);
});
await t("R4: escrito pela página fora da escala → violação; declaração do DS → erro normativo (R4); valor diferente → erro factual; Sair fora do menu aberto → evidência indisponível (R10)", () => {
  const c = cartao({ familia: "R4-token", regra: "ds:token-spacing", seletor: "pnip-filter-panel > div > button", observado: "margin: -5px 0px 0px (fora da escala: -5px)" });
  assert.equal(classe(vereditoT2(c, medidas(), "f")), "violacao-pagina");
  assert.equal(classe(vereditoT2(c, medidas({ ds: true }), "f")), "erro-normativo");
  assert.equal(classe(vereditoT2({ ...c, observado: "margin -7px" }, medidas(), "f")), "erro-factual");
  const sair = cartao({ familia: "R4-token", regra: "ds:token-radius", seletor: "#avatar-menu > button", observado: "border-radius: 20px fora da escala do DS" });
  assert.equal(classe(vereditoT2(sair, medidas(), "f")), "evidencia-indisponivel");
  assert.equal(classe(vereditoT2({ ...sair, cenas: ["1280x900@detalhe-menu"] }, medidas(), "f")), "violacao-pagina");
});

// ───────────────────────────────────────────────────────────────── julgamento T3 na política (sintético)
console.log("1.1.0: julgamento T3 na política, por variante");
const atomo = (o: Partial<AtomoArquivado> = {}): AtomoArquivado => ({ chave: "x|p01|C-1|a1", campanha: "t7-tela-b-01", tela: "B", par: "p01", revisao: "rev-002", cardIdOriginal: "C-1", atomoId: "a1",
  cardSha256: "0", mId: null, origemCartao: "agente", ferramenta: "agente", regra: "wcag:2.4.3", cena: "1280x900@inicial", estadoSha256: "0", sujeitos: ["s1"],
  decisao: "defeito-do-gabarito", verdict: "reference", citacao: "uncertain", unidades: [{ specId: "B-05", unitId: "U" }], duplicateOf: null, texto: "t", grupo: "credito-fora",
  familia: familiaDaRegra(o.regra === undefined ? "wcag:2.4.3" : o.regra), candidatasSpecs: ["B-05"], regrasDasUnidades: ["wcag:1.3.1"], ...o });
const ctxT3 = (o: Partial<ContextoDerivacao> = {}): ContextoDerivacao => ({ tipo: "citacao", citaRegra: true, temEsperado: true, specsDaTela: ["B-02", "B-05"], citaveis: ["OBS"],
  origemMedida: null, classeRegistrada: null, ...o });
const resp = (o: Partial<Resposta> = {}): Resposta => ({ id: "T3-0000000000", verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" },
  vinculo: { spec: "B-05", relacao: "direta" }, sugestao: NAO_PERGUNTADO, forcaDoVeredito: "inferido", evidencias: ["OBS"], justificativa: "OBS: sintético de teste, sem julgamento.", ...o });
const julgT3 = (r: Resposta, c = ctxT3()): JulgamentoT3 => ({ id: r.id, tipo: c.tipo, fonte: "j#0", resposta: r, derivado: derivarClasse(r, c) });
const entrada = (a: AtomoArquivado, j: JulgamentoT3 | null): AtomoEntrada => ({ atomo: a, veredito: null, origem341: null, origem370: null, sugestaoLinhaDeBase: null,
  equivalentes: () => [], axeBoaPratica: r => (r === "page-has-heading-one" ? true : null), t3: j });
await t("julgado obrigatória aplicável violada com vínculo → credita a unidade (R7), tratamento julgado; S4 volta ao arquivo", () => {
  const e = entrada(atomo(), julgT3(resp()));
  const c = classificar(e, "principal");
  assert.equal(c.tratamento, "julgado"); assert.equal(c.juiz, "llm-t3"); assert.equal(c.partes[0].credito, "unidade"); assert.equal(c.partes[0].spec, "B-05");
  const s4 = classificarVariante(e, "S4");
  assert.equal(s4.juiz, "arquivo (S4)");
});
await t("R15 credita na principal e não na S1; Q1 a credita na principal e vira observação na S5 e na S1", () => {
  const r15 = entrada(atomo(), julgT3(resp({ norma: { id: "citada", forca: "boa-pratica", aplicabilidade: "aplica", violada: "sim" } })));
  assert.equal(classificar(r15, "principal").partes[0].credito, "r15");
  assert.equal(classificar(r15, "S1").partes[0].classe, "erro-normativo");
  const q1 = entrada(atomo({ regra: null, familia: "sem-regra" }), julgT3(resp({ norma: { id: "nenhuma", forca: "nenhuma", aplicabilidade: "aplica", violada: "nao" } }), ctxT3({ citaRegra: false })));
  assert.equal(classificar(q1, "principal").partes[0].credito, "q1");
  assert.equal(classificar(q1, "S5").partes[0].classe, "observacao"); assert.equal(classificar(q1, "S5").partes[0].credito, null);
  assert.equal(classificar(q1, "S1").partes[0].classe, "observacao");
});
await t("pendente só o indeterminado: fato indeterminado ou violação com vínculo indeterminado → volta à fila (T3 indeterminado)", () => {
  const a = classificar(entrada(atomo(), julgT3(resp({ verdadeFactual: "indeterminado" }))), "principal");
  assert.equal(a.tratamento, "T3"); assert.match(a.motivoFila!, /^T3 indeterminado: .*\(T3\)$/);
  const b = classificar(entrada(atomo(), julgT3(resp({ vinculo: "indeterminado" }))), "principal");
  assert.equal(b.tratamento, "T3"); assert.equal(b.partes[0].classe, "pendente");
  const c = classificar(entrada(atomo(), julgT3(resp({ vinculo: "nenhum" }))), "principal");
  assert.equal(c.tratamento, "julgado"); assert.equal(c.partes[0].credito, null); assert.equal(c.partes[0].classe, "violacao-origem-indeterminada");
});

await t("S7 sem-evidencia → pendente: só cartão sem-evidencia com fato verdadeiro inferido; principal não muda; medido não é afetado", () => {
  const e = { ...entrada(atomo(), julgT3(resp())), semEvidencia: true };
  assert.equal(classificar(e, "principal").tratamento, "julgado");
  const s7 = classificar(e, "S7");
  assert.equal(s7.tratamento, "pendente"); assert.equal(s7.partes[0].classe, "pendente"); assert.match(s7.motivoFila!, /^S7:/); assert.equal(s7.fila, null);
  assert.equal(classificar({ ...e, t3: julgT3(resp({ forcaDoVeredito: "medido" })) }, "S7").tratamento, "julgado");
  assert.equal(classificar({ ...e, semEvidencia: false }, "S7").tratamento, "julgado");
  assert.equal(classificar({ ...e, t3: julgT3(resp({ verdadeFactual: "falsa" })) }, "S7").tratamento, "julgado");
});

if (process.argv.includes("--rapido")) { console.log(`\n${n - falhas}/${n} testes da 1.1.0 passaram (só unidade)`); process.exit(falhas ? 1 : 0); }

// ───────────────────────────────────────────────────────────────── ponta a ponta (pastas temporárias, julgamentos sintéticos)
console.log("1.1.0: ponta a ponta (pipeline em pasta temporária, julgamentos sintéticos; ~6 min)");
const tmp = mkdtempSync(join(tmpdir(), "nat74-v110-"));
const medidasReais = join(RESULTADOS, CAMINHO_DERIVADO_110, CAMINHO_MEDIDAS_T2);
const inv = inventarioDeAtomos();
/** Copia uma fila (lotes + chave, NUNCA respostas/) e responde todos os lotes com respostas sintéticas. */
function filaSintetica(origem: string, destino: string, decidido: boolean): string {
  for (const d of ["lotes", "chave"]) cpSync(join(origem, d), join(destino, d), { recursive: true });
  const m = lerJson<{ lotes: { lote: string; sha256: string }[] }>(join(destino, "lotes", "manifesto.json"));
  mkdirSync(join(destino, "respostas"), { recursive: true });
  for (const l of m.lotes) {
    const lote = lerJson<{ cartoes: CartaoCego[] }>(join(destino, "lotes", `${l.lote}.json`));
    const respostas = lote.cartoes.map((c): Resposta => {
      const base = { id: c.id, forcaDoVeredito: "inferido" as const, evidencias: ["OBS"], justificativa: "OBS: resposta sintética de teste, sem julgamento." };
      if (c.perguntas.includes("sugestao")) return { ...base, verdadeFactual: NAO_PERGUNTADO, norma: NAO_PERGUNTADO, vinculo: NAO_PERGUNTADO,
        sugestao: decidido ? { trataOFato: "sim", especificaDoSujeito: "nao", naoViolaNormaObrigatoria: "sim", qualidade: c.alegacao.esperado ? "generica" : "ausente" }
          : { trataOFato: "incerto", especificaDoSujeito: "incerto", naoViolaNormaObrigatoria: "incerto", qualidade: c.alegacao.esperado ? "indeterminada" : "ausente" } };
      if (!decidido) return { ...base, verdadeFactual: "indeterminado", norma: c.alegacao.regra ? { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" }
        : { id: "nenhuma", forca: "nenhuma", aplicabilidade: "incerta", violada: "incerto" }, vinculo: "indeterminado", sugestao: NAO_PERGUNTADO };
      const vinculo = c.candidatas.length ? { spec: c.candidatas[0], relacao: "direta" as const } : "nenhum" as const;
      return { ...base, verdadeFactual: "verdadeira", norma: c.alegacao.regra ? { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }
        : { id: "nenhuma", forca: "nenhuma", aplicabilidade: "aplica", violada: "nao" }, vinculo, sugestao: NAO_PERGUNTADO };
    });
    writeFileSync(join(destino, "respostas", `${l.lote}.json`), JSON.stringify({ formato: FORMATO_RESPOSTAS, lote: l.lote, loteSha256: l.sha256, juiz: "teste sintético", respostas }, null, 2));
  }
  const r = ingerir(destino);
  if (r.erros.length) throw new Error(`ingestão sintética recusada: ${r.erros.slice(0, 3).join(" | ")}`);
  return gravar(destino, "julgamentos.json", r.texto!);
}
type Res = { variantes: Record<string, { estado: string; d: number[]; pontual: { d: number[]; p: number | null } | null; limites: { inferior: { d: number[] }; superior: { d: number[] } };
  cenarios: { comCreditoArquivadoRestaurado: { d: number[] } } }> };
const resultado = (raiz: string, c: string) => lerJson<Res>(join(raiz, "resultados", `${c}.json`)).variantes.principal;
const CAMPS = ["t7-tela-a-01", "t7b-sonnet-tela-a-01", "t7-tela-b-01"];
const quieto = () => {};
try {
  if (!existsSync(medidasReais)) throw new Error(`rode antes: npm run reanalise:nat74:t2-medir (${medidasReais})`);
  const fila100 = join(RESULTADOS, CAMINHO_DERIVADO, "fila-t3");
  await t("sem julgamentos (só T2): roda, fica PROVISÓRIO, D dentro dos limites, cenários dentro dos limites", async () => {
    const raiz = join(tmp, "a0");
    await executar({ raiz, julgamentos: [], medidasT2: medidasReais, log: quieto });
    for (const c of CAMPS) {
      const v = resultado(raiz, c);
      assert.equal(v.estado, "PROVISORIO"); assert.equal(v.pontual, null);
      v.d.forEach((d, i) => { const [lo, hi] = [v.limites.inferior.d[i], v.limites.superior.d[i]]; assert.ok(lo <= d && d <= hi, `${c} p${i + 1}: ${lo} ≤ ${d} ≤ ${hi}`);
        const r = v.cenarios.comCreditoArquivadoRestaurado.d[i]; assert.ok(lo <= r && r <= hi, `${c} p${i + 1} cenário: ${lo} ≤ ${r} ≤ ${hi}`); });
    }
    const f = lerJson<{ porCampanhaBraco: Record<string, Record<string, { T2: number; T3: number }>> }>(join(raiz, "fila-t3", "filas-e6.json")).porCampanhaBraco;
    assert.equal(Object.values(f).flatMap(Object.values).reduce((n, x) => n + x.T2, 0), 0);
    assert.equal(Object.values(f).flatMap(Object.values).reduce((n, x) => n + x.T3, 0), 285 + 6);
  });
  await t("julgamentos sintéticos todos indeterminados: roda, PROVISÓRIO; os indeterminados voltam à fila (T3 indeterminado) e a fila residual se extrai", async () => {
    const j = filaSintetica(fila100, join(tmp, "f-ind"), false);
    const raiz = join(tmp, "a1");
    await executar({ raiz, julgamentos: [j], medidasT2: medidasReais, log: quieto });
    for (const c of CAMPS) assert.equal(resultado(raiz, c).estado, "PROVISORIO");
    const p = prepararFila({ raiz, inv });
    assert.deepEqual(p.extracao.diferencas, []);
    assert.equal(p.cartoes.length, 285 - 34 + 6); // qualidade indeterminada conta como erro normativo (não volta)
    assert.deepEqual(p.cegueira.falhas, []);
  });
  let raizC = "", jC: string[] = [];
  await t("julgamentos sintéticos completos + fila residual: tela A FINAL-DERIVADO (limites colapsam em D, D pontual com IC e p); tela B sem T2/T3, só pendentes recusados pelo scorer (P8)", async () => {
    const j1 = filaSintetica(fila100, join(tmp, "f-dec"), true);
    const raiz = join(tmp, "c");
    await executar({ raiz, julgamentos: [j1], medidasT2: medidasReais, log: quieto });
    // fila residual desta versão (os 6 da T2 que a medida não fecha), preparada e respondida
    const p = prepararFila({ raiz, inv });
    assert.equal(p.cartoes.length, 6);
    for (const [rel, txt] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(join(raiz, "fila-t3"), rel, txt);
    const j2 = filaSintetica(join(raiz, "fila-t3"), join(tmp, "f-res"), true);
    jC = [j1, j2];
    await executar({ raiz, julgamentos: jC, medidasT2: medidasReais, log: quieto });
    // Tela A: os limites colapsam em D. A Sonnet sai FINAL-DERIVADO; a A Opus guarda 1 pendente que não vem da fila
    // (evidência indisponível de um veredito da NAT-73, átomo `unresolved` no scorer, R9) e que não move D.
    for (const c of ["t7-tela-a-01", "t7b-sonnet-tela-a-01"]) {
      const v = resultado(raiz, c);
      assert.deepEqual(v.limites.inferior.d, v.d, c); assert.deepEqual(v.limites.superior.d, v.d, c);
    }
    const sonnet = resultado(raiz, "t7b-sonnet-tela-a-01");
    assert.equal(sonnet.estado, "FINAL-DERIVADO"); assert.ok(sonnet.pontual && sonnet.pontual.p !== null);
    const opus = lerJson<{ variantes: { principal: { estado: string; pontual: unknown; maturidade: { sem: { pendentes: number }; com: { pendentes: number } } } } }>(join(raiz, "resultados", "t7-tela-a-01.json")).variantes.principal;
    assert.ok(opus.estado === "FINAL-DERIVADO" || opus.maturidade.sem.pendentes + opus.maturidade.com.pendentes === 1, `A Opus: ${JSON.stringify(opus.maturidade)}`);
    // Tela B: nenhum átomo na T2/T3; o que resta pendente nos braços são vínculos que a barreira do scorer recusa
    // (sujeito numa cena, unidade "sempre" da B-01 na última: "Review link crosses scenes"), já presentes na 1.0.0.
    const f = lerJson<{ porCampanhaBraco: Record<string, Record<string, { T2: number; T3: number; pendente: number }>> }>(join(raiz, "fila-t3", "filas-e6.json")).porCampanhaBraco["t7-tela-b-01"];
    for (const b of ["sem", "com"]) assert.deepEqual([f[b].T2, f[b].T3, f[b].pendente], [0, 0, 0], b);
    const rec = lerJson<{ recusas: { campanha: string; motivo: string }[] }>(join(raiz, "trilha", "recusas-do-scorer.json")).recusas.filter(x => x.campanha === "t7-tela-b-01");
    assert.ok(rec.length > 0 && rec.every(x => /^nenhuma unidade da B-(01|25) na cena/.test(x.motivo)), rec.map(x => x.motivo).slice(0, 3).join(" | "));
    for (const c of CAMPS) { const r = lerJson<{ semEvidencia: { afetadosPorBraco: Record<string, number>; S7: { d: number[] } }; variantes: Record<string, unknown> }>(join(raiz, "resultados", `${c}.json`));
      assert.ok("S7" in r.variantes && r.semEvidencia && Array.isArray(r.semEvidencia.S7.d), `${c}: S7 publicada`); }
    const vb = resultado(raiz, "t7-tela-b-01");
    vb.d.forEach((d, i) => assert.ok(vb.limites.inferior.d[i] <= d && d <= vb.limites.superior.d[i]));
    raizC = raiz;
  });
  await t("determinismo: duas execuções com as mesmas entradas dão saídas idênticas byte a byte", async () => {
    assert.ok(raizC, "depende do teste anterior");
    const outra = join(tmp, "c2");
    await executar({ raiz: outra, julgamentos: jC, medidasT2: medidasReais, log: quieto });
    const x = compararExecucoes(raizC, outra);
    assert.deepEqual(x.diferentes, []);
    assert.ok(x.soEmUm.every(p => /^fila-t3\/(lotes|chave|cegueira)/.test(p)), x.soEmUm.slice(0, 5).join(", "));
  });
  await t("1.0.0 intocada: nenhum arquivo da 1.0.0 mudou (sha256 contra o commit, via git)", async () => {
    const { execFileSync } = await import("node:child_process");
    const d = execFileSync("git", ["-C", RESULTADOS, "diff", "--name-status", "da42f24", "--", CAMINHO_DERIVADO], { encoding: "utf8" }).split("\n").filter(Boolean)
      .filter(l => !(l.startsWith("A\t") && l.includes("/fila-t3/")));
    assert.deepEqual(d, []);
    void sha;
  });
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes da 1.1.0 passaram`);
if (falhas) process.exitCode = 1;
