/**
 * Testes da E14 (fila T3, plano NAT-74 §6.6): extração, vista cega e cegueira, derivação da classe, ingestão e
 * materiais. Sem modelo, sem rede. A extração e a vista usam o derivado real (só leitura); a ingestão roda numa cópia
 * temporária da fila com respostas SINTÉTICAS (`indeterminado` em tudo) — não são julgamentos.
 *   npm run test:reanalise-nat74-e14   (também roda dentro de npm run test:reanalise-nat74)
 */
import Ajv2020 from "ajv/dist/2020.js";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gravar, lerJson, sha } from "./comum";
import { inventarioDeAtomos } from "./e1";
import { verificarCegueira } from "./e14-cegueira";
import {
  ESQUEMA_RESPOSTAS, FORMATO_RESPOSTAS, NAO_PERGUNTADO, derivarClasse, evidenciaOmitida, idOpaco, mascarar, validarResposta,
  type CartaoCego, type ContextoDerivacao, type ItemChave, type Resposta,
} from "./e14-comum";
import { cartaoCego, cartaoDoAtomo, fatosMedidos, normas, referencias } from "./e14-fila";
import { ingerir } from "./e14-ingerir";
import { materiais } from "./e14-materiais";
import { prepararFila } from "./e14-preparar";
import { DERIVADO } from "./e14-comum";
import { FORMATO_SENSIBILIDADE_REGRA, cenariosDaRegra, cenariosMd, derivarNaLeitura, tabular, type Julgamento, type SensibilidadeRegra } from "./e14-deteccao";

let n = 0, falhas = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.message : e}`); } };

// ───────────────────────────────────────────────────────────────── derivação da classe (sintético)
console.log("E14: derivação da classe a partir das respostas");
const ctx = (o: Partial<ContextoDerivacao> = {}): ContextoDerivacao => ({ tipo: "citacao", citaRegra: true, temEsperado: true, specsDaTela: ["B-02", "B-05"],
  citaveis: ["OBS", "ESP", "S1", "B-05", "B-02", "F1"], origemMedida: null, classeRegistrada: null, ...o });
const resp = (o: Partial<Resposta> = {}): Resposta => ({ id: "T3-0000000000", verdadeFactual: "verdadeira",
  norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" }, vinculo: { spec: "B-05", relacao: "direta" },
  sugestao: NAO_PERGUNTADO, forcaDoVeredito: "inferido", evidencias: ["OBS", "S1"], justificativa: "OBS e S1 mostram o campo sem rótulo da B-05.", ...o });
const sugestao = (q: "valida" | "invalida" | "generica" | "ausente" | "indeterminada") => ({ trataOFato: q === "invalida" ? "nao" : q === "indeterminada" ? "incerto" : "sim",
  especificaDoSujeito: q === "generica" ? "nao" : "sim", naoViolaNormaObrigatoria: "sim", qualidade: q }) as Exclude<Resposta["sugestao"], string>;
t("fato falso → erro factual (R1); indisponível → evidência indisponível (R9); indeterminado → pendente", () => {
  assert.equal(derivarClasse(resp({ verdadeFactual: "falsa" }), ctx()).classe, "erro-factual");
  assert.equal(derivarClasse(resp({ verdadeFactual: "indisponivel" }), ctx()).classe, "evidencia-indisponivel");
  const p = derivarClasse(resp({ verdadeFactual: "indeterminado" }), ctx());
  assert.equal(p.classe, "pendente"); assert.ok(p.pendencias.includes("fato indeterminado"));
});
t("obrigatória aplicável violada com vínculo → violação página (R7); origem medida DS → violação DS (R5); sem vínculo e sem medida → indeterminada", () => {
  const v = derivarClasse(resp(), ctx()); assert.equal(v.classe, "violacao-pagina"); assert.equal(v.spec, "B-05"); assert.equal(v.regraDaPolitica, "R7");
  assert.equal(derivarClasse(resp(), ctx({ origemMedida: "ds-entregue" })).classe, "violacao-ds");
  assert.equal(derivarClasse(resp({ vinculo: "nenhum" }), ctx()).classe, "violacao-origem-indeterminada");
  assert.equal(derivarClasse(resp({ vinculo: "nenhum" }), ctx({ origemMedida: "pagina-copiando-exemplo-ds" })).classe, "violacao-pagina");
});
t("não se aplica → erro normativo (R11a); com sugestão válida → observação com norma errada (R11d)", () => {
  const nao = { id: "citada", forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" } as const;
  assert.equal(derivarClasse(resp({ norma: nao, sugestao: sugestao("invalida") }), ctx()).classe, "erro-normativo");
  const ok = derivarClasse(resp({ norma: nao, sugestao: sugestao("valida") }), ctx());
  assert.equal(ok.classe, "observacao-norma-errada"); assert.equal(ok.regraDaPolitica, "R11d"); assert.equal(ok.spec, null);
  assert.equal(derivarClasse(resp({ norma: nao, sugestao: sugestao("indeterminada") }), ctx()).classe, "pendente"); // L3: qualidade indeterminada → pendente (R9)
});
t("norma mais fraca aplicável e violada: com vínculo credita (R15); sem vínculo é erro normativo (R13)", () => {
  const fraca = { id: "citada", forca: "boa-pratica", aplicabilidade: "aplica", violada: "sim" } as const;
  const r15 = derivarClasse(resp({ norma: fraca, vinculo: { spec: "B-02", relacao: "ausencia-global" } }), ctx());
  assert.equal(r15.classe, "violacao-pagina"); assert.equal(r15.regraDaPolitica, "R15"); assert.equal(r15.spec, "B-02");
  const r13 = derivarClasse(resp({ norma: fraca, vinculo: "nenhum", sugestao: sugestao("generica") }), ctx());
  assert.equal(r13.classe, "erro-normativo"); assert.equal(r13.regraDaPolitica, "R13");
});
t("aplicabilidade incerta → evidência indisponível (R13, nunca violação por precaução); norma nenhuma → observação (R11b)", () => {
  assert.equal(derivarClasse(resp({ norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "incerta", violada: "sim" } }), ctx()).classe, "evidencia-indisponivel");
  assert.equal(derivarClasse(resp({ norma: { id: "nenhuma", forca: "nenhuma", aplicabilidade: "aplica", violada: "nao" }, vinculo: "nenhum" }), ctx({ citaRegra: false })).classe, "observacao");
});
t("Q1 a: cartão sem regra citada + fato verdadeiro + vínculo credita a detecção (fundamentação nenhuma); sem vínculo é observação; S5 não credita", () => {
  const nula = { id: "nenhuma", forca: "nenhuma", aplicabilidade: "aplica", violada: "nao" } as const;
  const semRegra = ctx({ citaRegra: false });
  const q1 = derivarClasse(resp({ norma: nula, vinculo: { spec: "B-05", relacao: "direta" } }), semRegra);
  assert.equal(q1.classe, "violacao-pagina"); assert.equal(q1.spec, "B-05"); assert.equal(q1.regraDaPolitica, "Q1"); assert.equal(q1.fundamentacao, "nenhuma");
  assert.deepEqual(q1.s5, { classe: "observacao", regraDaPolitica: "R11b", spec: null });
  assert.deepEqual(validarResposta(resp({ norma: nula, vinculo: { spec: "B-05", relacao: "direta" } }), semRegra), []); // sugestão não exigida
  const obs = derivarClasse(resp({ norma: nula, vinculo: "nenhum" }), semRegra);
  assert.equal(obs.classe, "observacao"); assert.equal(obs.fundamentacao, null); assert.equal(obs.s5.classe, "observacao");
  // origem medida DS: vínculo não credita (P3), nem na principal nem na S5
  const ds = derivarClasse(resp({ norma: nula, vinculo: { spec: "B-05", relacao: "direta" } }), ctx({ citaRegra: false, origemMedida: "ds-entregue" }));
  assert.equal(ds.classe, "violacao-ds"); assert.equal(ds.fundamentacao, null);
  // norma pública nomeada pelo juiz, aplicável e violada: caminho normal (R7), S5 igual à principal
  const pub = derivarClasse(resp({ norma: { id: "wcag:1.3.1", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" } }), semRegra);
  assert.equal(pub.regraDaPolitica, "R7"); assert.equal(pub.fundamentacao, "norma"); assert.deepEqual(pub.s5, { classe: pub.classe, regraDaPolitica: "R7", spec: "B-05" });
  // cartão que cita regra: não pode responder "nenhuma" (validação) e não muda
  assert.ok(validarResposta(resp({ norma: nula }), ctx()).some(e => /nenhuma/.test(e)));
  assert.equal(derivarClasse(resp(), ctx()).fundamentacao, "norma");
  assert.equal(derivarClasse(resp({ norma: { id: "citada", forca: "boa-pratica", aplicabilidade: "aplica", violada: "sim" }, vinculo: { spec: "B-02", relacao: "ausencia-global" } }), ctx()).fundamentacao, "mais-fraca");
});
t("qualidade (veredito já registrado): só a sugestão decide entre erro normativo e observação com norma errada", () => {
  const q = ctx({ tipo: "qualidade", classeRegistrada: "erro-normativo" });
  const base = { verdadeFactual: NAO_PERGUNTADO, norma: NAO_PERGUNTADO, vinculo: NAO_PERGUNTADO } as const;
  assert.equal(derivarClasse(resp({ ...base, sugestao: sugestao("valida") }), q).classe, "observacao-norma-errada");
  assert.equal(derivarClasse(resp({ ...base, sugestao: sugestao("generica") }), q).classe, "erro-normativo");
  assert.deepEqual(validarResposta(resp({ ...base, sugestao: sugestao("valida") }), q), []);
  assert.ok(validarResposta(resp({ ...base, sugestao: NAO_PERGUNTADO }), q).some(e => /obrigatória/.test(e)));
  assert.ok(validarResposta(resp({ sugestao: sugestao("valida") }), q).some(e => /não foi perguntad/.test(e)));
});
t("validação: listas fechadas, ids citáveis, justificativa, coerência da sugestão, spec da tela, regra citada", () => {
  assert.deepEqual(validarResposta(resp(), ctx()), []);
  assert.ok(validarResposta({ ...resp(), verdadeFactual: "talvez" }, ctx()).some(e => /fora da lista/.test(e)));
  assert.ok(validarResposta(resp({ evidencias: ["E9"] }), ctx()).some(e => /inexistente/.test(e)));
  assert.ok(validarResposta(resp({ justificativa: "texto longo o bastante, mas sem citar id algum." }), ctx()).some(e => /citar/.test(e)));
  assert.ok(validarResposta(resp({ vinculo: { spec: "B-99", relacao: "direta" } }), ctx()).some(e => /referência/.test(e)));
  assert.ok(validarResposta(resp({ norma: { id: "wcag:1.1.1", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" } }), ctx()).some(e => /citada/.test(e)));
  assert.ok(validarResposta(resp({ sugestao: { ...sugestao("valida"), especificaDoSujeito: "nao" } }), ctx()).some(e => /três condições/.test(e)));
  assert.ok(validarResposta(resp({ sugestao: sugestao("ausente") }), ctx()).some(e => /tem texto esperado/.test(e)));
  assert.ok(validarResposta(resp({ sugestao: sugestao("valida") }), ctx({ temEsperado: false })).some(e => /ausente/.test(e)));
  assert.ok(validarResposta({ ...resp(), extra: 1 }, ctx()).some(e => /desconhecido/.test(e)));
  // sugestão condicional: as respostas dão erro normativo → exigida
  assert.ok(validarResposta(resp({ norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "nao-aplica", violada: "nao" } }), ctx()).some(e => /erro normativo/.test(e)));
});
t("esquema JSON (Ajv 2020-12) aceita uma resposta válida e recusa valor fora da lista", () => {
  const v = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(ESQUEMA_RESPOSTAS as object);
  const doc = { formato: FORMATO_RESPOSTAS, lote: "lote-01", loteSha256: "0".repeat(64), juiz: "teste", respostas: [resp()] };
  assert.ok(v(doc), JSON.stringify(v.errors));
  assert.ok(!v({ ...doc, respostas: [{ ...resp(), forcaDoVeredito: "certo" }] }));
});

// ───────────────────────────────────────────────────────────────── máscara e cegueira (sintético)
console.log("E14: máscara e cegueira");
t("máscara: D-87 + /tmp/pw → [arquivo local] + emag-N → emag:N; evidência com id de ferramenta sai", () => {
  assert.equal(mascarar("ds-page-header e govbr-3.7.0-component-input-3788829b08fe"), "[regra citada] e [regra citada]");
  assert.equal(mascarar("ver /tmp/pw-3/page.png e emag-2.2"), "ver [arquivo local] e emag:2.2");
  assert.equal(mascarar("wcag:2.4.3 axe:label emag:1.5"), "wcag:2.4.3 axe:label emag:1.5");
  for (const r of ["S-page-003", "F-178", "S-page-002 F-014 a F-038+", "S-page-001:F-004", "/tmp/pw-0/x.png"]) assert.ok(evidenciaOmitida(r), r);
  for (const r of ["snapshot de acessibilidade: button \"Avatar\"", "document.activeElement = BODY"]) assert.ok(!evidenciaOmitida(r), r);
});

// ───────────────────────────────────────────────────────────────── derivado real (só leitura)
console.log("E14: extração e vista cega sobre o derivado real (só leitura)");
const inv = inventarioDeAtomos();
const p = prepararFila({ raiz: DERIVADO, inv });
const filas = lerJson<{ porCampanhaBraco: Record<string, Record<string, { T3: number }>> }>(join(DERIVADO, "fila-t3", "filas-e6.json"));
t("extração: 285 átomos T3, = filas-e6 por campanha × braço e por motivo, sem diferenças", () => {
  assert.deepEqual(p.extracao.diferencas, []);
  assert.equal(p.cartoes.length, 285);
  for (const [c, bs] of Object.entries(filas.porCampanhaBraco)) for (const [b, f] of Object.entries(bs)) assert.equal(p.extracao.porCampanhaBraco[c]?.[b] ?? 0, f.T3, `${c}/${b}`);
  const tipos: Record<string, number> = {};
  for (const i of p.extracao.itens) tipos[i.tipo] = (tipos[i.tipo] ?? 0) + 1;
  assert.deepEqual(tipos, { citacao: 125, inventario: 30, qualidade: 34, sensivel: 96 });
});
t("ordem pelo hash, ids opacos únicos, lotes de 25–35 cobrindo todos os átomos uma vez", () => {
  const hs = p.extracao.itens.map(i => i.hash);
  assert.deepEqual(hs, [...hs].sort());
  assert.equal(new Set(p.cartoes.map(c => c.id)).size, 285);
  for (const i of p.extracao.itens) assert.equal(i.id, idOpaco(i.chave));
  assert.ok(p.lotes.every(l => l.ids.length >= 25 && l.ids.length <= 35));
  assert.deepEqual(p.lotes.flatMap(l => l.ids), p.cartoes.map(c => c.id));
});
t("determinismo: preparar duas vezes dá os mesmos arquivos byte a byte", () => {
  const q = prepararFila({ raiz: DERIVADO, inv });
  for (const [k, v] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) assert.equal(sha(v), sha((q.arquivosDoJuiz.get(k) ?? q.arquivosInternos.get(k))!), k);
});
t("cegueira: 0 falhas em tudo o que o juiz recebe; todo cartão tem relato de sinais", () => {
  assert.deepEqual(p.cegueira.falhas, []);
  assert.equal(p.cegueira.porCartao.length, 285);
});
t("cartão cego não tem braço, run, campanha, par, cardId, M-xxxx, decisão nem motivo da triagem", () => {
  const chavesPermitidas = ["id", "tela", "telaNome", "alegacao", "normaCitada", "candidatas", "fatosMedidos", "vereditoRegistrado", "perguntas", "citaveis"].sort();
  for (const [k, c] of p.cartoes.entries()) {
    assert.deepEqual(Object.keys(c).sort(), chavesPermitidas);
    const it = p.extracao.itens[k], txt = JSON.stringify(c);
    for (const v of [it.runId, it.campanha, it.cardIdOriginal, it.mId, it.braco === "sem" || it.braco === "com" ? `"${it.braco}"` : it.braco, it.decisaoAntiga, it.motivoFila].filter(Boolean))
      assert.ok(!txt.includes(v as string), `${c.id} contém ${v}`);
  }
});
t("simetria: trocar o braço do item não muda o cartão cego (a fila T3 é a mesma com os braços trocados)", () => {
  const nr = normas(), refs = referencias(inv.pares, nr.resolver), fm = fatosMedidos();
  const troca: Record<string, string> = { sem: "com", com: "sem", "lb-axe": "lb-validator", "lb-validator": "lb-axe" };
  for (const it of p.extracao.itens.slice(0, 60)) {
    const card = cartaoDoAtomo(inv, it.atomo), specs = refs.porTela[it.tela].specs.map(s => s.id);
    assert.deepEqual(cartaoCego({ ...it, braco: troca[it.braco], runId: "x" }, card, nr.resolver, fm.de(it.atomo), specs), cartaoCego(it, card, nr.resolver, fm.de(it.atomo), specs));
  }
});
t("cegueira pega vazamento injetado (runId, decisão arquivada, id do DS sem máscara, trecho de justificativa)", () => {
  const it = p.extracao.itens[0], card = cartaoDoAtomo(inv, it.atomo), c0 = p.cartoes[0];
  const vaza = (alt: Partial<CartaoCego["alegacao"]>, just: string[] = []) => verificarCegueira({
    arquivos: [{ rel: "lotes/x.json", texto: JSON.stringify({ cartoes: [{ ...c0, alegacao: { ...c0.alegacao, ...alt } }] }) }],
    cartoes: [{ cartao: c0, card, item: it, justificativas: just }] }).falhas.map(f => f.regra);
  assert.deepEqual(vaza({}), []);
  assert.ok(vaza({ observado: `rodado em ${it.runId}` }).some(r => /runId/.test(r)));
  assert.ok(vaza({ observado: "o revisor marcou defeito-novo-correto" }).some(r => /decisão/.test(r)));
  assert.ok(vaza({ regra: "ds:token-color" }).some(r => /oráculo sem máscara/.test(r)));
  const j = "Medido: o botão tem nome calculado não vazio na árvore do Chromium e a regra não se aplica aqui.";
  assert.ok(vaza({ observado: j }, [j]).some(r => /justificativa/.test(r)));
});

// ───────────────────────────────────────────────────────────────── ingestão (cópia temporária, respostas sintéticas)
console.log("E14: ingestão numa cópia temporária (respostas sintéticas, não são julgamentos)");
const tmp = mkdtempSync(join(tmpdir(), "nat74-e14-"));
for (const [rel, txt] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(tmp, rel, txt);
const loteJson = (nome: string) => JSON.parse(p.arquivosDoJuiz.get(`lotes/${nome}.json`)!) as { cartoes: CartaoCego[] };
const sintetica = (c: CartaoCego): Resposta => c.perguntas.includes("sugestao")
  ? { id: c.id, verdadeFactual: NAO_PERGUNTADO, norma: NAO_PERGUNTADO, vinculo: NAO_PERGUNTADO,
    sugestao: { trataOFato: "incerto", especificaDoSujeito: "incerto", naoViolaNormaObrigatoria: "incerto", qualidade: c.alegacao.esperado ? "indeterminada" : "ausente" },
    forcaDoVeredito: "incerto", evidencias: ["OBS"], justificativa: "OBS: resposta sintética de teste, sem julgamento." }
  : { id: c.id, verdadeFactual: "indeterminado", norma: c.alegacao.regra ? { id: "citada", forca: "indeterminado", aplicabilidade: "incerta", violada: "incerto" }
    : { id: "nenhuma", forca: "nenhuma", aplicabilidade: "incerta", violada: "incerto" }, vinculo: "indeterminado", sugestao: NAO_PERGUNTADO,
    forcaDoVeredito: "incerto", evidencias: ["OBS"], justificativa: "OBS: resposta sintética de teste, sem julgamento." };
const arquivo = (nome: string, mexe: (rs: Resposta[]) => Resposta[] = x => x, o: { sha?: string } = {}) => {
  const rs = mexe(loteJson(nome).cartoes.map(sintetica));
  mkdirSync(join(tmp, "respostas"), { recursive: true });
  writeFileSync(join(tmp, "respostas", `${nome}.json`), JSON.stringify({ formato: FORMATO_RESPOSTAS, lote: nome, loteSha256: o.sha ?? sha(p.arquivosDoJuiz.get(`lotes/${nome}.json`)!),
    juiz: "teste sintético", respostas: rs }, null, 2));
};
const limpa = () => rmSync(join(tmp, "respostas"), { recursive: true, force: true });
try {
  t("lote completo e válido entra; julgamentos parciais saem completo:false, com classe derivada e sha256 do arquivo de respostas", () => {
    limpa(); arquivo("lote-01");
    const r = ingerir(tmp);
    assert.deepEqual(r.erros, []);
    const j = r.julgamentos as { julgados: number; completo: boolean; lotes: { sha256: string }[]; julgamentos: { derivado: { classe: string } }[] };
    assert.equal(j.julgados, p.lotes[0].ids.length); assert.equal(j.completo, false); assert.match(j.lotes[0].sha256, /^[0-9a-f]{64}$/);
    assert.ok(j.julgamentos.every(x => ["pendente", "erro-normativo", "observacao"].includes(x.derivado.classe)));
  });
  t("recusa incompleto", () => { limpa(); arquivo("lote-01", rs => rs.slice(1)); assert.ok(ingerir(tmp).erros.some(e => /incompleto/.test(e))); });
  t("recusa id repetido", () => { limpa(); arquivo("lote-01", rs => [...rs, rs[0]]); assert.ok(ingerir(tmp).erros.some(e => /repetido/.test(e))); });
  t("recusa id fora do lote", () => { limpa(); arquivo("lote-01", rs => [...rs.slice(1), { ...rs[0], id: loteJson("lote-02").cartoes[0].id }]); assert.ok(ingerir(tmp).erros.some(e => /fora do lote/.test(e))); });
  t("recusa valor fora da lista fechada (esquema)", () => { limpa(); arquivo("lote-01", rs => [{ ...rs[0], forcaDoVeredito: "certeza" as never }, ...rs.slice(1)]); assert.ok(ingerir(tmp).erros.some(e => /esquema/.test(e))); });
  t("recusa justificativa sem id citado", () => { limpa(); arquivo("lote-01", rs => [{ ...rs[0], justificativa: "uma justificativa longa sem nenhum identificador" }, ...rs.slice(1)]); assert.ok(ingerir(tmp).erros.some(e => /citar/.test(e))); });
  t("recusa loteSha256 diferente do lote publicado", () => { limpa(); arquivo("lote-01", x => x, { sha: "a".repeat(64) }); assert.ok(ingerir(tmp).erros.some(e => /loteSha256/.test(e))); });
  t("recusa arquivo de respostas que não é lote da fila", () => {
    limpa(); mkdirSync(join(tmp, "respostas"), { recursive: true }); writeFileSync(join(tmp, "respostas", "lote-99.json"), "{}");
    assert.ok(ingerir(tmp).erros.some(e => /não é um lote/.test(e)));
  });
  t("todos os lotes → completo:true; depois de gravado, congela (mudança exige --refazer)", () => {
    limpa(); for (const l of p.lotes) arquivo(l.lote);
    const r = ingerir(tmp);
    assert.deepEqual(r.erros, []); assert.equal((r.julgamentos as { completo: boolean; julgados: number }).julgados, 285);
    gravar(tmp, "julgamentos.json", r.texto!);
    assert.deepEqual(ingerir(tmp).erros, []); // mesmo conteúdo: idempotente
    arquivo("lote-01", rs => [{ ...rs[0], justificativa: "OBS: outra resposta sintética de teste, sem julgamento." }, ...rs.slice(1)]);
    assert.ok(ingerir(tmp).erros.some(e => /congelado/.test(e)));
    assert.deepEqual(ingerir(tmp, { refazer: true }).erros, []);
  });
} finally { rmSync(tmp, { recursive: true, force: true }); }

// ───────────────────────────────────────────────────────────────── materiais (sintético)
console.log("E14: materiais (P5 a)");
t("material = spec creditada (arquivo ou julgamento) não confirmada de outro jeito na execução; teto 10, D antes de LB", () => {
  const item = (id: string, o: Partial<ItemChave>): ItemChave => ({ id, hash: id, chave: id, campanha: "t7-tela-b-01", tela: "B", par: "p01", braco: "com", runId: "r1", cardIdOriginal: "C",
    atomoId: "a1", cardSha256: "0", mId: null, tipo: "citacao", motivoFila: "", decisaoAntiga: "defeito-do-gabarito", unidadesAntigas: "B-05:U1", origemMedida341: null,
    origemMedida370: null, lote: "lote-01", ...o });
  const der = (classe: string, spec: string | null) => ({ classe, regraDaPolitica: "R7", spec, qualidadeDaSugestao: null, pendencias: [] }) as never;
  const chave = [item("T3-a", {}), item("T3-b", { runId: "r2" }), item("T3-c", { braco: "lb-axe", decisaoAntiga: "defeito-novo-correto", unidadesAntigas: "" }),
    item("T3-d", { decisaoAntiga: "incorreta", unidadesAntigas: "" }),
    ...Array.from({ length: 12 }, (_, i) => item(`T3-z${String(i).padStart(2, "0")}`, { runId: `rz${i}` }))];
  const unidades = [{ campanha: "t7-tela-b-01", par: "p01", runId: "r2", specId: "B-05", unitId: "U-x", confirmadaDepois: true, variante: "principal" }];
  const js = [{ id: "T3-a", chave: "T3-a", derivado: der("erro-normativo", null) }, { id: "T3-b", chave: "T3-b", derivado: der("violacao-pagina", "B-05") },
    { id: "T3-c", chave: "T3-c", derivado: der("violacao-pagina", "B-26") }, { id: "T3-d", chave: "T3-d", derivado: der("erro-factual", null) },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `T3-z${String(i).padStart(2, "0")}`, chave: "z", derivado: der("violacao-pagina", "B-05") }))];
  const m = materiais(js, chave, unidades, new Map());
  const todos = [...m.paraAutora, ...m.julgadoSoPorLLM];
  assert.ok(todos.some(x => x.id === "T3-a" && x.alvos[0].creditadoNoArquivo && !x.alvos[0].creditadoNoJulgamento)); // perde o crédito arquivado
  assert.ok(!todos.some(x => x.id === "T3-b")); // B-05 já confirmada em r2
  assert.ok(!todos.some(x => x.id === "T3-d")); // nada creditado nos dois lados
  assert.equal(m.paraAutora.length, 10); assert.equal(todos.length, 14);
  assert.equal(todos.find(x => x.id === "T3-c")!.camada, "LB");
  assert.ok(m.julgadoSoPorLLM.some(x => x.id === "T3-c")); // LB vai para o fim da ordem
});
t("tela A: materialidade por UNIDADE — U1 confirmada não esconde U2 da mesma spec em disputa; tela B segue por spec", () => {
  const item = (id: string, o: Partial<ItemChave>): ItemChave => ({ id, hash: id, chave: id, campanha: "t7-tela-a-01", tela: "A", par: "p01", braco: "com", runId: "r1", cardIdOriginal: "C-old",
    atomoId: "a1", cardSha256: "0", mId: null, tipo: "citacao", motivoFila: "", decisaoAntiga: "defeito-do-gabarito", unidadesAntigas: "A-04:U2-old", origemMedida341: null,
    origemMedida370: null, lote: "lote-01", ...o });
  const pares = new Map([["t7-tela-a-01|p01", { specDe: new Map([["U1", "A-04"], ["U2", "A-04"], ["U3", "A-08"]]), deAntiga: new Map([["U2-old", "U2"]]),
    candidatas: new Map([["C-old", ["U1", "U2"]]]) }]]);
  const der = (classe: string, spec: string | null) => ({ classe, regraDaPolitica: "R7", spec, qualidadeDaSugestao: null, pendencias: [] }) as never;
  // U1 (A-04) confirmada por outro átomo; o átomo disputa U2 (A-04): material na tela A
  const conf = [{ campanha: "t7-tela-a-01", par: "p01", runId: "r1", specId: "A-04", unitId: "U1", confirmadaDepois: true, variante: "principal" }];
  const m = materiais([{ id: "T3-u", chave: "T3-u", derivado: der("erro-normativo", null) }], [item("T3-u", {})], conf, pares);
  assert.equal(m.paraAutora.length, 1); assert.deepEqual(m.paraAutora[0].alvos.map(x => x.alvo), ["U2"]); assert.equal(m.paraAutora[0].camada, "D");
  // as duas unidades confirmadas: não material
  const ambas = [...conf, { ...conf[0], unitId: "U2" }];
  assert.equal(materiais([{ id: "T3-u", chave: "T3-u", derivado: der("erro-normativo", null) }], [item("T3-u", {})], ambas, pares).naoMateriais, 1);
  // julgado credita A-04: só as unidades oferecidas pela ancoragem do cartão (U1, U2); U1 confirmada → alvo U2
  const j = materiais([{ id: "T3-v", chave: "T3-v", derivado: der("violacao-pagina", "A-04") }], [item("T3-v", { decisaoAntiga: "defeito-novo-correto", unidadesAntigas: "" })], conf, pares);
  assert.deepEqual(j.paraAutora[0].alvos.map(x => [x.alvo, x.creditadoNoJulgamento]), [["U2", true]]);
  // na tela B, a mesma situação por spec: B-05 confirmada → não material
  const b = materiais([{ id: "T3-b", chave: "T3-b", derivado: der("erro-normativo", null) }], [item("T3-b", { campanha: "t7-tela-b-01", tela: "B", unidadesAntigas: "B-05:Uold" })],
    [{ campanha: "t7-tela-b-01", par: "p01", runId: "r1", specId: "B-05", unitId: "Ux", confirmadaDepois: true, variante: "principal" }], new Map());
  assert.equal(b.naoMateriais, 1);
});

// [D-165, Codex d0d554fa P1] Respostas e contextos de verdade: a leitura só entra como vínculo, e a contagem é a da classe
// re-derivada pela mesma política. Fixture comum aos testes dos cenários.
const fixD165 = () => {
  const SPECS = ["B-01", "B-02", "B-03"];
  const ctxBase: ContextoDerivacao = { tipo: "citacao", citaRegra: true, temEsperado: true, specsDaTela: SPECS, citaveis: ["F1"], origemMedida: null, classeRegistrada: null };
  const resp = (id: string, o: { fato?: string; aplic?: string; viol?: string; forca?: string; spec?: string | null; estado?: string } = {}): Resposta => ({
    id, verdadeFactual: (o.fato ?? "verdadeira") as never, estadoAlcancado: (o.estado ?? "receita") as never,
    norma: { id: "citada", forca: (o.forca ?? "obrigatorio") as never, aplicabilidade: (o.aplic ?? "aplica") as never, violada: (o.viol ?? "sim") as never },
    vinculo: o.spec ? { spec: o.spec, relacao: "direta" } : "nenhum", sugestao: NAO_PERGUNTADO, forcaDoVeredito: "medido", evidencias: ["F1"], justificativa: "sintético F1" });
  const ctxs: Record<string, ContextoDerivacao> = {};
  const cands: Record<string, string[]> = {};
  const j = (id: string, chave: string, r: Resposta, ctx: Partial<ContextoDerivacao> = {}, cand: string[] = ["B-02"]): Julgamento => {
    ctxs[chave] = { ...ctxBase, ...ctx }; cands[chave] = cand;
    return { id, chave, resposta: r, derivado: derivarClasse(r, ctxs[chave]) };
  };
  const fato = (k: string) => ({ contexto: ctxs[k], candidatas: cands[k] });
  const braco: Record<string, string> = { k1: "com", k2: "com", k3: "sem", k4: "com" };
  const specs = SPECS.map(id => ({ id, categories: ["acessibilidade"] }));
  const tab = (js: Julgamento[]) => tabular(js, k => braco[k], specs, "politica-normativa-1.3.0", ["sem", "com", "ferramentas"], { estado: { sem: "valida", com: "valida", ferramentas: "ausente" } });
  const cart = (id: string, chave: string, r: Resposta, dem: string | null, nao: string | null, adot = "identidade-nao-demonstrada") =>
    ({ id, chave, unidade: "D-x", leituraAdotada: adot, credita: { "identidade-demonstrada": dem, "identidade-nao-demonstrada": nao }, specsDaRegra: ["B-02"], respostaAdotada: r });
  const sens = (cartoes: ReturnType<typeof cart>[]): SensibilidadeRegra => ({ formato: FORMATO_SENSIBILIDADE_REGRA, regra: { arquivo: "r.md", sha256: "0".repeat(64) },
    leituras: ["identidade-demonstrada", "identidade-nao-demonstrada"], cartoes });
  return { resp, j, fato, braco, tab, cart, sens };
};

t("[D-165] cenários da regra publicada: número por braço em cada leitura, re-derivado; coleta não válida = sem número", () => {
  const { resp, j, fato, braco, tab, cart, sens } = fixD165();
  // T3-2 e T3-3: violação verdadeira (obrigatória, aplica, violada) sem vínculo na leitura adotada; T3-4 já credita B-02.
  const r2 = resp("T3-2"), r3 = resp("T3-3");
  const js = [j("T3-1", "k1", resp("T3-1", { spec: "B-01" })), j("T3-2", "k2", r2), j("T3-3", "k3", r3), j("T3-4", "k4", resp("T3-4", { spec: "B-02" }))];
  const s = sens([cart("T3-2", "k2", r2, "B-02", null), cart("T3-3", "k3", r3, "B-02", null)]);
  const c = cenariosDaRegra(js, k => braco[k], tab(js), s, { primeira: js, fato });
  assert.deepEqual(Object.keys(c.porCenario), ["1a-passada", "julgamentos", "identidade-demonstrada", "identidade-nao-demonstrada"]);
  assert.equal(c.porCenario.julgamentos.com!.deteccao, 2); assert.equal(c.porCenario.julgamentos.sem!.deteccao, 0);
  assert.equal(c.porCenario["identidade-demonstrada"].com!.deteccao, 2, "B-02 já estava pelo T3-4: não soma duas vezes");
  assert.equal(c.porCenario["identidade-demonstrada"].sem!.deteccao, 1, "violação verdadeira: o crédito muda só pelo vínculo");
  assert.equal(c.porCenario["identidade-nao-demonstrada"].sem!.deteccao, 0);
  assert.equal(c.porCenario.julgamentos.ferramentas, null);
  assert.deepEqual(c.cartoes.map(x => [x.id, x.braco, x.porCenario["identidade-demonstrada"]]), [["T3-2", "com", "B-02"], ["T3-3", "sem", "B-02"]]);
  assert.match(cenariosMd(c, tab(js).bracos), /\| identidade-nao-demonstrada \| 0 \| 2 \| — \|/);
  assert.throws(() => cenariosDaRegra(js, k => braco[k], tab(js), { ...s, cartoes: [{ ...s.cartoes[0], credita: { "identidade-demonstrada": null } as never }] }, { fato }), /sem a leitura/);
  // Positivo: com R15 (norma mais fraca, aplica, violada) o vínculo da leitura muda a classe (erro normativo → violação), e é só ele.
  const rf = resp("T3-3", { forca: "recomendado" }), jf = [j("T3-3", "k3", rf)];
  assert.equal(jf[0].derivado.classe, "erro-normativo");
  const cf = cenariosDaRegra(jf, k => braco[k], tab(jf), sens([cart("T3-3", "k3", rf, "B-02", null)]), { fato });
  assert.equal(cf.porCenario["identidade-demonstrada"].sem!.deteccao, 1); assert.equal(cf.porCenario["identidade-nao-demonstrada"].sem!.deteccao, 0);
});

t("[Codex d0d554fa P1] cenários: a leitura nunca resgata exclusão de crédito nem credita spec alheia ao fato (recusa, nada sai)", () => {
  const { resp, j, fato, braco, tab, cart, sens } = fixD165();
  const casos: [string, Resposta, Partial<ContextoDerivacao>, RegExp][] = [
    ["fato falso", resp("T3-3", { fato: "falsa" }), {}, /deriva erro-factual \(R1\), sem crédito/],
    ["estado não alcançado", resp("T3-3", { fato: "indisponivel", estado: "nao-alcancado" }), {}, /deriva evidencia-indisponivel \(R9\), sem crédito/],
    ["norma não se aplica", resp("T3-3", { aplic: "nao-aplica", viol: "nao" }), {}, /deriva erro-normativo \(R11\), sem crédito/],
    ["norma não violada", resp("T3-3", { viol: "nao" }), {}, /deriva erro-normativo \(R11\), sem crédito/],
    ["origem DS", resp("T3-3"), { origemMedida: "ds-entregue" }, /deriva violacao-ds \(R5\), sem crédito/],
    ["força indeterminada (pendente)", resp("T3-3", { forca: "indeterminado" }), {}, /deriva pendente/],
  ];
  for (const [nome, r, ctx, re] of casos) {
    const js = [j("T3-3", "k3", r, ctx)];
    assert.equal(js[0].derivado.fundamentacao, null, nome);
    assert.throws(() => cenariosDaRegra(js, k => braco[k], tab(js), sens([cart("T3-3", "k3", r, "B-02", null)]), { fato }), re, nome);
    // A mesma resposta com as duas leituras null passa e conta 0: a exclusão fica nas duas leituras.
    const ok = cenariosDaRegra(js, k => braco[k], tab(js), sens([cart("T3-3", "k3", r, null, null)]), { fato });
    assert.equal(ok.porCenario["identidade-demonstrada"].sem!.deteccao, 0, nome);
  }
  // Spec alheia ao fato: B-03 não é da unidade (B-02) nem das candidatas do cartão, ainda que a derivação a creditasse.
  const r = resp("T3-3"), js = [j("T3-3", "k3", r)];
  assert.throws(() => cenariosDaRegra(js, k => braco[k], tab(js), sens([cart("T3-3", "k3", r, "B-03", null)]), { fato }), /spec B-03 alheia ao fato/);
  // Julgamentos que não são os da adjudicação; leitura adotada que não reproduz o julgamento.
  assert.throws(() => cenariosDaRegra(js, k => braco[k], tab(js), sens([cart("T3-3", "k3", resp("T3-3", { viol: "nao" }), null, null)]), { fato }), /não é a adotada na adjudicação/);
  const jv = [j("T3-3", "k3", resp("T3-3", { spec: "B-02" }))];
  assert.throws(() => cenariosDaRegra(jv, k => braco[k], tab(jv), sens([cart("T3-3", "k3", jv[0].resposta, "B-02", null)]), { fato }), /a leitura adotada \(identidade-nao-demonstrada\) re-derivada credita nada, o julgamento B-02/);
  // Vínculo não perguntado: nenhuma leitura cria a pergunta.
  const rn = { ...resp("T3-3"), vinculo: NAO_PERGUNTADO } as Resposta;
  assert.equal(derivarNaLeitura(rn, { tipo: "citacao", citaRegra: true, temEsperado: true, specsDaTela: ["B-02"], citaveis: [], origemMedida: null, classeRegistrada: null }, "B-02").spec, null);
});

console.log(`\n${n - falhas}/${n} testes da E14 passaram`);
if (falhas) process.exitCode = 1;
