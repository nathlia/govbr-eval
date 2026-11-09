/**
 * Testes da reconta sob domínio declarado (recontar-dominio.ts, D-168) e da conferência do `dominio` da referência
 * (scripts/conferir-dominio.ts). Sem modelo, sem rede, sem navegador: passada, referência e medição sintéticas.
 *   npx tsx scripts/reanalise-nat74/test-recontar-dominio.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conferir, diffRestrito, registrosComObservavel, type DetalheMedido, type Medicao, type ModalMedido } from "../conferir-dominio";
import { lerBaseLiteral, migrarRegra, migrarRules, normalizar, type BaseLiteral } from "../rules-legado";
import { EVAL } from "./comum";
import type { CartaoCego, ContextoDerivacao, ItemChave, Resposta } from "./e14-comum";
import { derivarClasse } from "./e14-comum";
import type { Julgamento } from "./e14-deteccao";
import {
  classificar, recontaMd, recontar, registroAlcancado, registroDaMedidaDoJuiz, registroNaReceita, registroPelaLista, specsDeRegistro,
  type LinhaMedida, type Passada, type RefComDominio,
} from "./recontar-dominio";

let n = 0, falhas = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.message : e}`); } };

const P = "00000000-0000-4000-8a01-00000000";
const R = (x: number) => P + x;
const REF = (dominio: Record<string, string[] | undefined>): RefComDominio => ({
  _meta: { version: "1.1.0", states: [{ id: "inicial", path: "/app/vistorias" }, { id: "det", path: `/app/vistorias/agendar-vistoria/${R(3038)}` },
    { id: "nc", path: `/app/vistorias/agendar-vistoria/${R(3046)}` }] },
  violations: [
    { id: "B-02", state: "inicial" },
    { id: "B-20", state: "nc", ...(dominio["B-20"] ? { dominio: { regra: "textarea do motivo", registros: dominio["B-20"] } } : {}) },
    { id: "B-22", state: "det", ...(dominio["B-22"] ? { dominio: { regra: "tabela da notificação", registros: dominio["B-22"] } } : {}) },
    { id: "B-25", state: "sempre" },
  ],
});
const LISTA: LinhaMedida[] = [
  { aba: "Tramitando", pagina: 1, linha: 1, celulas: ["1", "", "Coral Mansa IV", "RS1", "", "", "", "Vistoria agendada"], botao: "eye", registro: R(3028) },
  { aba: "Tramitando", pagina: 2, linha: 8, celulas: ["18", "", "Aurora do Norte III", "", "", "", "", "Vistoria preenchida"], botao: "eye", registro: R(3038) },
  { aba: "Concluídos", pagina: 1, linha: 1, celulas: ["1", "Pérola Veloz II", "BA1", "", "", "", "NAO COMPARECIMENTO", "Concluído"], botao: "eye", registro: R(3069) },
  { aba: "Concluídos", pagina: 1, linha: 2, celulas: ["2", "Pérola Veloz", "BA2", "", "", "", "ADEQUADA", "Concluído"], botao: "eye", registro: R(3068) },
  { aba: "Agendar", pagina: 1, linha: 1, celulas: ["1", "Aurora Dourada V", "", "", "", "", "Vistoria pré agendada", ""], botao: "calendar", registro: R(3012) },
];
const CTX: ContextoDerivacao = { tipo: "sensivel", citaRegra: true, temEsperado: true, specsDaTela: ["B-02", "B-20", "B-22", "B-25"],
  citaveis: ["OBS", "ESP", "REGRA", "NORMA", "MEDIDA", "B-02", "B-20", "B-22", "B-25"], origemMedida: null, classeRegistrada: null, forcasDaCitada: ["obrigatorio"] };
const resposta = (o: Partial<Resposta> = {}): Resposta => ({ id: "T3-x", verdadeFactual: "verdadeira", norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" },
  vinculo: "nenhum", sugestao: "nao-perguntado", forcaDoVeredito: "medido", estadoAlcancado: "receita", evidencias: ["MEDIDA", "B-22"],
  justificativa: "MEDIDA: a receita chega ao detalhe 3069; a B-22 foi medida noutro registro (3038): sem vínculo.", ...o });
const cartao = (passos: string[], candidatas = ["B-02", "B-22"], observado = "tabela sem caption"): CartaoCego =>
  ({ id: "T3-x", tela: "vistorias", alegacao: { observado, estado: { passos } }, candidatas } as unknown as CartaoCego);
const item = (braco = "com", par = "p01/analisar-x"): ItemChave => ({ id: "T3-x", chave: `c|${par}|C-1`, par, braco, tipo: "sensivel" } as unknown as ItemChave);
const julg = (r: Resposta, ctx = CTX): Julgamento => ({ id: r.id, chave: `c|p01/analisar-x|${r.id}`, resposta: r, derivado: derivarClasse(r, ctx) });
const RECEITA_3069 = ["load ENTRY", "click aba \"Concluídos\" (#HISTORICO)", "click botão olho da linha 1 (Pérola Veloz II, NAO COMPARECIMENTO)"];

console.log("reconta: registro alcançado");
t("rota na receita (o último uuid) vence; sem ela, o observado", () => {
  assert.equal(registroNaReceita([`navegar para /x/agendar-vistoria/${R(3046)}`, `navegar para /x/agendar-vistoria/${R(3038)}`], null), R(3038));
  assert.equal(registroNaReceita(["load"], `visto em /pnip/x/agendar-vistoria/${R(3043)}`), R(3043));
  assert.equal(registroNaReceita(["load"], "nada"), null);
});
t("lista medida: aba + embarcação (nome mais longo), aba + posição, receita sem detalhe, filtro sem nome", () => {
  assert.equal(registroPelaLista(RECEITA_3069, LISTA).registro, R(3069));
  assert.equal(registroPelaLista(["clicar no olho da linha 1 da aba Tramitando"], LISTA).registro, R(3028));
  assert.equal(registroPelaLista(["click a.page \"2\"", "click olho da linha 8"], LISTA).registro, R(3038));
  assert.equal(registroPelaLista(["clicar na aba Agendar (#AGENDAR)", "clicar em Agendar na linha 1 (br-button[icon=calendar])"], LISTA).registro, R(3012));
  assert.equal(registroPelaLista(["load ENTRY", "click #AGENDAR (aba Agendar)"], LISTA).registro, null);
  assert.equal(registroPelaLista([], LISTA).registro, null);
  assert.equal(registroPelaLista(["clicar no filtro Cidade > Barra Nova", "clicar no olho da linha 5"], LISTA).registro, undefined);
});
t("medida do juiz só como última fonte; fontes da receita divergentes não resolvem", () => {
  assert.equal(registroDaMedidaDoJuiz("MEDIDA: leva ao …3034; a B-22 é do 3038", P), R(3034));
  const a = registroAlcancado(cartao(["filtro Cidade", "olho da linha 5"]), resposta({ justificativa: "MEDIDA: detalhe …3034" }), LISTA, P);
  assert.equal(a.registro, R(3034)); assert.equal(a.fonte, "medida-do-juiz");
  const d = registroAlcancado(cartao([...RECEITA_3069, `→ /x/agendar-vistoria/${R(3068)}`]), resposta(), LISTA, P);
  assert.equal(d.divergencia, true); assert.equal(d.registro, null);
});

console.log("reconta: classificação");
const um = (ref: RefComDominio, r: Resposta, c: CartaoCego, ctx = CTX) => classificar(julg(r, ctx), item(), c, ctx, specsDeRegistro(ref), LISTA, P);
t("domínio cobre o registro alcançado: credita pela mesma derivação", () => {
  const x = um(REF({ "B-22": [R(3038), R(3069)] }), resposta(), cartao(RECEITA_3069));
  assert.equal(x.afetado?.categoria, "credito-pelo-dominio"); assert.equal(x.afetado?.comDominio, "B-22"); assert.equal(x.afetado?.registro, R(3069));
  assert.equal(x.derivadoDominio?.classe, "violacao-pagina");
});
t("registro fora do domínio: recusa mantida e listada", () => {
  const x = um(REF({ "B-22": [R(3038), R(3034)] }), resposta(), cartao(RECEITA_3069));
  assert.equal(x.afetado?.categoria, "fora-do-dominio"); assert.equal(x.afetado?.comDominio, null);
});
t("spec sem domínio cobre só o registro da parada", () => {
  const x = um(REF({}), resposta(), cartao(RECEITA_3069));
  assert.equal(x.afetado?.categoria, "fora-do-dominio");
});
t("domínio não resgata norma não violada (a derivação manda)", () => {
  const r = resposta({ norma: { id: "citada", forca: "obrigatorio", aplicabilidade: "aplica", violada: "nao" } });
  const x = um(REF({ "B-22": [R(3038), R(3069)] }), r, cartao(RECEITA_3069));
  assert.equal(x.afetado?.categoria, "dominio-nao-credita"); assert.equal(x.afetado?.comDominio, null);
});
t("spec fora de rota de registro, recusa pelo fato (spec não citada) e fato falso: não afetados", () => {
  const ref = REF({ "B-22": [R(3038), R(3069)] });
  assert.equal(um(ref, resposta({ evidencias: ["MEDIDA", "B-02"], justificativa: "a B-02 é da lista" }), cartao(RECEITA_3069, ["B-02"])).afetado, null);
  assert.equal(um(ref, resposta({ evidencias: ["MEDIDA", "OBS"], justificativa: "nenhum defeito trata desses ícones" }), cartao(RECEITA_3069)).afetado, null);
  assert.equal(um(ref, resposta({ verdadeFactual: "falsa" }), cartao(RECEITA_3069)).afetado, null);
});
t("recusa no próprio registro da parada não é identidade; receita que fica na lista não chega a registro", () => {
  const ref = REF({ "B-22": [R(3038), R(3069)] });
  assert.equal(um(ref, resposta({ justificativa: "MEDIDA: 3038, a tabela tem caption" }), cartao(["click a.page \"2\"", "click olho da linha 8"])).afetado, null);
  assert.equal(um(ref, resposta(), cartao(["load ENTRY"])).afetado, null);
});
t("crédito da passada em registro fora do domínio: listado, a passada não muda", () => {
  const r = resposta({ vinculo: { spec: "B-22", relacao: "direta" } });
  const x = um(REF({ "B-22": [R(3038), R(3034)] }), r, cartao(RECEITA_3069));
  assert.equal(x.afetado?.categoria, "credito-fora-do-dominio"); assert.equal(x.afetado?.julgada, "B-22"); assert.equal(x.afetado?.comDominio, "B-22");
  const y = um(REF({ "B-22": [R(3038), R(3069)] }), r, cartao(RECEITA_3069));
  assert.equal(y.afetado?.categoria, "credito-dentro-do-dominio");
});
t("domínio fora de rota de registro ou sem o registro da parada para", () => {
  const ref = REF({ "B-22": [R(3069)] });
  assert.throws(() => specsDeRegistro(ref), /não inclui o registro da própria parada/);
  const r2 = REF({}); (r2.violations[0] as { dominio?: unknown }).dominio = { regra: "x", registros: [R(1)] };
  assert.throws(() => specsDeRegistro(r2), /fora de rota de registro/);
});

t("receita que sai do detalhe para a rota de edição não chega ao registro do detalhe", () => {
  const ref = REF({ "B-22": [R(3038), R(3069)] });
  assert.equal(um(ref, resposta(), cartao([...RECEITA_3069, "clicar em Editar"])).afetado, null);
  assert.equal(registroAlcancado(cartao(RECEITA_3069), resposta({ justificativa: "MEDIDA: a receita chega a editar-dados-vistoria/…3069" }), LISTA, P).fonte, "rota-fora-do-detalhe");
  const x = um(ref, resposta({ vinculo: { spec: "B-22", relacao: "direta" } }), cartao([...RECEITA_3069, "clicar em Editar"]));
  assert.equal(x.afetado?.categoria, "credito-fora-do-dominio");
});
t("casca da aplicação (D-165 § 3) fica fora das specs de registro; domínio nela para", () => {
  const ref = REF({ "B-22": [R(3038)] }); ref._meta.suite = "vistorias";
  ref.violations.push({ id: "B-17", state: "nc", anchor: "pnip-header #avatar-menu" });
  assert.deepEqual([...specsDeRegistro(ref).keys()].sort(), ["B-20", "B-22"]);
  (ref.violations.at(-1) as { dominio?: unknown }).dominio = { regra: "x", registros: [R(3046)] };
  assert.throws(() => specsDeRegistro(ref), /casca/);
});
t("filtro Cidade medido: opção + linha resolvem; outro filtro ou opção ausente não", () => {
  const filtros = [{ aba: "Tramitando", filtro: "Cidade", opcao: "Barra Nova", pagina: 1, linha: 5, celulas: [], registro: R(3043) },
    { aba: "Tramitando", filtro: "Cidade", opcao: "Barra Nova", pagina: 1, linha: 1, celulas: [], registro: R(3025) }];
  assert.equal(registroPelaLista(["clicar no filtro Cidade > Barra Nova", "clicar em visualizar (olho) da linha 5"], LISTA, filtros).registro, R(3043));
  assert.equal(registroPelaLista(["click chip Cidade", "click opção 'Barra Nova'", "click tbody tr:nth-child(1) br-button[icon=eye]"], LISTA, filtros).registro, R(3025));
  assert.equal(registroPelaLista(["clicar no filtro Cidade > Enseada Clara", "olho da linha 5"], LISTA, filtros).registro, undefined);
  assert.equal(registroPelaLista(["filtro Status: 'Agendada'", "filtro Cidade > Barra Nova", "olho da linha 5"], LISTA, filtros).registro, undefined);
});
t("duas specs de registro citadas no registro da parada de uma delas: só a outra conta; as duas fora → ambíguo", () => {
  const ref: RefComDominio = { _meta: { version: "1.1.0", states: [{ id: "modal", path: `/x/agendar-vistoria/${R(3038)}` }] },
    violations: [{ id: "B-24", state: "modal", dominio: { regra: "m", registros: [R(3037), R(3038)] } }, { id: "B-27", state: "modal", dominio: { regra: "m", registros: [R(3037), R(3038)] } }] };
  const c = cartao([`navegar para /x/agendar-vistoria/${R(3038)}`, "clicar em Trocar"], ["B-24", "B-27"]);
  assert.equal(um(ref, resposta({ evidencias: ["B-24", "B-27"] }), c).afetado, null);
  const c2 = cartao([`navegar para /x/agendar-vistoria/${R(3037)}`, "clicar em Trocar"], ["B-24", "B-27"]);
  assert.equal(um(ref, resposta({ evidencias: ["B-24", "B-27"] }), c2).afetado?.categoria, "ambiguo");
});

console.log("reconta: passada inteira");
t("contagem julgada × com domínio × estrita, por trio e braço; a passada fica igual", () => {
  const ref = REF({ "B-22": [R(3038), R(3069)], "B-20": [R(3046)] });
  const cs: { r: Resposta; c: CartaoCego; braco: string }[] = [
    { r: resposta({ id: "T3-a" }), c: cartao(RECEITA_3069), braco: "com" },                                                         // ganha B-22
    { r: resposta({ id: "T3-b", vinculo: { spec: "B-02", relacao: "direta" }, evidencias: ["B-02"] }), c: cartao(["load"]), braco: "com" },  // B-02 já creditada
    { r: resposta({ id: "T3-c", vinculo: { spec: "B-22", relacao: "direta" } }), c: cartao(["clicar no olho da linha 1 da aba Tramitando"]), braco: "sem" }, // crédito fora (3028)
  ];
  const itens = new Map<string, ItemChave>(), cartoes = new Map<string, { c: CartaoCego; specs: string[] }>(), js: Julgamento[] = [];
  for (const x of cs) {
    const chave = `c|p01/analisar-x|${x.r.id}`;
    itens.set(chave, { id: x.r.id, chave, par: "p01/analisar-x", braco: x.braco, tipo: "sensivel" } as unknown as ItemChave);
    cartoes.set(x.r.id, { c: { ...x.c, id: x.r.id, normaCitada: null, citaveis: CTX.citaveis, vereditoRegistrado: null } as unknown as CartaoCego, specs: CTX.specsDaTela });
    js.push({ id: x.r.id, chave, resposta: x.r, derivado: derivarClasse(x.r, { ...CTX, forcasDaCitada: undefined }) });
  }
  const antes = JSON.stringify(js);
  const p: Passada = { dir: "x", julgamentos: { politica: "politica-normativa-1.3.0", completo: true, julgamentos: js }, itens, cartoes, entradas: {} };
  const { reconta } = recontar(p, ref, LISTA, { refSha: "0".repeat(64), medicaoSha: null });
  assert.equal(JSON.stringify(js), antes);
  const com = reconta.contagens.find(c => c.braco === "com")!, sem = reconta.contagens.find(c => c.braco === "sem")!;
  assert.deepEqual([com.julgada, com.comDominio, com.comDominioEstrita], [["B-02"], ["B-02", "B-22"], ["B-02", "B-22"]]);
  assert.deepEqual([sem.julgada, sem.comDominio, sem.comDominioEstrita], [["B-22"], ["B-22"], []]);
  assert.deepEqual(reconta.afetados.map(a => `${a.id}:${a.categoria}`).sort(), ["T3-a:credito-pelo-dominio", "T3-c:credito-fora-do-dominio"]);
  assert.match(recontaMd(reconta, "x"), /\| com \| p01 \| 1 \| \*\*2\*\* \| 2 \| B-22 \|/);
});

console.log("referência 1.1.0: conferência do domínio");
/** A 1.0.0 congelada (D-61, commit 0364ebb): a base de toda 1.1.0, sintética ou a do repositório. */
const baseTxt = execFileSync("git", ["show", "0364ebb:ground-truth-vistorias.json"], { cwd: EVAL, encoding: "utf8", maxBuffer: 1 << 26 });
const det = (registro: string, o: Partial<DetalheMedido> = {}): DetalheMedido => ({ registro, path: "/x/" + registro, componente: true,
  titulos: [{ nivel: 3, texto: "Programa Nacional de Regularização de Embarcação de Pesca", noDetalhe: true }, { nivel: 4, texto: "Dados", noDetalhe: true }],
  textareas: [], tabelas: [], seletorB23: [], trocarEmbarcacao: 0, ...o });
t("observáveis: B-21 sem h1/h2 e h3 do programa; B-22 só a tabela da notificação; B-23 só o \"0%\" da Conclusão", () => {
  const tabela = { visivel: true, caption: null, ariaLabel: null, ariaLabelledby: null, cabecalhos: ["Status", "Data", "Hora"], h4Antes: "Dados da Notificação", ax: { nome: "" } };
  const zero = { texto: "0%", visivel: true, secao: "Conclusão", cor: "#ffffff", fundo: "#888888", contraste: 3.54, fonte: "14px / 400" };
  const med: Medicao = { formato: "d168-medicao-dominio-1.0.0", modais: {}, detalhes: [
    det(R(3038), { tabelas: [tabela], seletorB23: [zero] }),
    det(R(3028), { seletorB23: [{ ...zero, texto: "Aguarda preenchimento", secao: "Vistoria" }] }),
    det(R(3069), { tabelas: [{ ...tabela, caption: "Notificações" }] }),
    det(R(3001), { titulos: [{ nivel: 2, texto: "x", noDetalhe: false }, ...det("").titulos] }),
  ] };
  assert.deepEqual(registrosComObservavel(med, "B-21"), [R(3028), R(3038), R(3069)]);
  assert.deepEqual(registrosComObservavel(med, "B-22"), [R(3038)]);
  assert.deepEqual(registrosComObservavel(med, "B-23"), [R(3038)]);
});
{
  // Referência 1.1.0 sintética a partir da 1.0.0 do repositório: só version, historico e dominio.
  const nova = (mexer: (r: { _meta: Record<string, unknown>; violations: Record<string, unknown>[] }) => void = () => {}) => {
    const r = JSON.parse(baseTxt);
    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r._meta)) { meta[k] = k === "version" ? "1.1.0" : v; if (k === "version") meta.historico = [{ de: "1.0.0", para: "1.1.0", data: "2026-11-04", motivo: "D-168" }]; }
    r._meta = meta;
    const reg = (st: string) => (r._meta.states as { id: string; path: string }[]).find(s => s.id === st)!.path.split("/").pop()!;
    for (const v of r.violations) if (["B-20", "B-21", "B-22", "B-23", "B-24", "B-27"].includes(v.id)) v.dominio = { regra: "r", registros: [reg(v.state)] };
    mexer(r);
    return JSON.stringify(r, null, 2) + "\n";
  };
  t("1.1.0 sintética passa (forma + diff); sem medição não cobra evidência", () => assert.deepEqual(conferir(nova(), baseTxt, null), []));
  t("mudança fora dos campos permitidos, domínio na casca, spec de registro sem domínio e historico errado param", () => {
    assert.ok(conferir(nova(r => { r.violations[0].description = "x"; }), baseTxt, null).some(e => /difere da base/.test(e)));
    assert.ok(conferir(nova(r => { r.violations.find(v => v.id === "B-15")!.dominio = { regra: "r", registros: [P + "3046"] }; }), baseTxt, null).some(e => /casca/.test(e)));
    assert.ok(conferir(nova(r => { delete r.violations.find(v => v.id === "B-22")!.dominio; }), baseTxt, null).some(e => /B-22: .*sem dominio/.test(e)));
    assert.ok(conferir(nova(r => { (r._meta.historico as { de: string }[])[0].de = "0.9.0"; }), baseTxt, null).some(e => /historico/.test(e)));
    assert.ok(conferir(nova(r => { r.violations.find(v => v.id === "B-02")!.dominio = { regra: "r", registros: [P + "3046"] }; }), baseTxt, null).some(e => /fora de rota de registro/.test(e)));
  });
  t("com medição: registro do domínio sem o observável e registro com o observável fora do domínio param", () => {
    const tabela = { visivel: true, caption: null, ariaLabel: null, ariaLabelledby: null, cabecalhos: ["Status", "Data", "Hora"], h4Antes: "Dados da Notificação", ax: { nome: "" } };
    const modal: ModalMedido = { modais: [{ noComponente: true, visivel: true, role: null, ariaModal: null, ariaLabel: null, ariaLabelledby: null }], dialogosNaArvore: 0, tab: { teclas: 30, dentro: 3, fora: 27 } };
    const ta = { seletorB20: true, visivel: true, id: null, labels: 0, attrs: {}, labelIrmao: [{ texto: "Descrever o motivo do não comparecimento", for: null }], ax: { nome: "" } };
    const zero = { texto: "0%", visivel: true, secao: "Conclusão", cor: "#ffffff", fundo: "#888888", contraste: 3.54, fonte: "14px / 400" };
    const med: Medicao = { formato: "d168-medicao-dominio-1.0.0", modais: { [R(3038)]: modal }, detalhes: [
      det(R(3038), { tabelas: [tabela], seletorB23: [zero] }), det(R(3046), { textareas: [ta] }) ] };
    // B-21 também vale no 3046: fora do domínio sintético → para; B-22 com 3069 não medido → para
    const e1 = conferir(nova(), baseTxt, med);
    assert.ok(e1.some(e => /B-21: registro .*3046 mostra o observável/.test(e)), e1.join("; "));
    const ok = nova(r => { r.violations.find(v => v.id === "B-21")!.dominio = { regra: "r", registros: [P + "3038", P + "3046"] }; });
    assert.deepEqual(conferir(ok, baseTxt, med), []);
    const e2 = conferir(nova(r => { r.violations.find(v => v.id === "B-21")!.dominio = { regra: "r", registros: [P + "3038", P + "3046"] };
      r.violations.find(v => v.id === "B-22")!.dominio = { regra: "r", registros: [P + "3038", P + "3069"] }; }), baseTxt, med);
    assert.ok(e2.some(e => /B-22: registro .*3069 do domínio não foi medido/.test(e)), e2.join("; "));
  });
}
console.log("migração de ids (rules → base literal, rulesLegado)");
{
  const bl: BaseLiteral = {
    literais: new Map([
      ["govbr-3.7.0-accessibility-global-novo", { id: "govbr-3.7.0-accessibility-global-novo", originalText: "Recomendação 6.2 - Associar etiquetas aos seus campos" }],
      ["govbr-3.7.0-accessibility-modal-lit", { id: "govbr-3.7.0-accessibility-modal-lit", originalText: "Os usuários devem navegar pela janela *modal* com a tecla `Tab` ou `Shift + Tab`, e mais;" }],
      ["govbr-3.7.0-foundation-global-ja", { id: "govbr-3.7.0-foundation-global-ja", originalText: "Use as cores." }],
    ]),
    legado: new Map([
      ["govbr-3.7.0-x-velho", { id: "govbr-3.7.0-x-velho", class: "superseded", supersededBy: ["govbr-3.7.0-accessibility-global-novo"], reason: "texto idêntico", record: { id: "govbr-3.7.0-x-velho", originalText: "Recomendação 6.2 – Associar etiquetas aos seus campos" } }],
      ["govbr-3.7.0-x-excerto", { id: "govbr-3.7.0-x-excerto", class: "dropped", supersededBy: [], reason: "excerto", record: { id: "govbr-3.7.0-x-excerto", originalText: "Os usuários devem navegar pela janela modal com a tecla Tab ou Shift + Tab" } }],
      ["govbr-3.7.0-x-sem", { id: "govbr-3.7.0-x-sem", class: "dropped", supersededBy: [], reason: "descritivo", record: { id: "govbr-3.7.0-x-sem", originalText: "Os leitores de tela usam os labels." } }],
    ]),
    fontes: {},
  };
  t("sucessor do legado, texto normalizado (prefixo), sem unidade, público e literal ficam", () => {
    const m = migrarRules(["govbr-3.7.0-x-velho", "emag:6.2", "govbr-3.7.0-x-sem", "govbr-3.7.0-foundation-global-ja", "govbr-3.7.0-x-excerto"], bl);
    assert.deepEqual(m.rules, ["govbr-3.7.0-accessibility-global-novo", "emag:6.2", "govbr-3.7.0-foundation-global-ja", "govbr-3.7.0-accessibility-modal-lit"]);
    assert.deepEqual(m.tabela.map(x => x.como), ["legado-sucessor", "publico", "sem-unidade", "literal", "texto-normalizado"]);
    assert.match(m.tabela[0].nota, /texto igual/);
    assert.equal(migrarRules(["govbr-3.7.0-x-sem"], bl).rules.length, 0);
    assert.throws(() => migrarRegra("govbr-3.7.0-inexistente", bl), /nem na base literal/);
    assert.equal(normalizar("A *b* `c` – d;"), "a b c - d");
    // frase antiga partida em duas unidades consecutivas da base literal → as duas
    const bl2: BaseLiteral = { ...bl, literais: new Map([...bl.literais, ["govbr-3.7.0-component-message-p1", { id: "govbr-3.7.0-component-message-p1", originalText: "Os ícones ficam à esquerda na *Superfície*" }],
      ["govbr-3.7.0-component-message-p2", { id: "govbr-3.7.0-component-message-p2", originalText: "enquanto o *Botão Fechar*, fica à direita." }]]),
      legado: new Map([...bl.legado, ["govbr-3.7.0-x-partido", { id: "govbr-3.7.0-x-partido", class: "dropped", supersededBy: [], reason: "excerto", record: { id: "govbr-3.7.0-x-partido", originalText: "Os ícones ficam à esquerda na Superfície, enquanto o Botão Fechar, fica à direita." } }]]) };
    assert.deepEqual(migrarRegra("govbr-3.7.0-x-partido", bl2).para, ["govbr-3.7.0-component-message-p1", "govbr-3.7.0-component-message-p2"]);
  });
  t("diff restrito: só version/historico/rules/rulesLegado/dominio (e a vírgula ao lado); qualquer outra linha para", () => {
    const base = `{\n  "_meta": {\n    "version": "1.0.0",\n    "page": "x"\n  },\n  "violations": [\n    {\n      "id": "A-01",\n      "rules": ["a"],\n      "description": "d"\n    }\n  ]\n}\n`;
    const ok = base.replace(`"version": "1.0.0",`, `"version": "1.1.0",\n    "historico": [\n      { "de": "1.0.0" }\n    ],`).replace(`"rules": ["a"],`, `"rules": ["b"],\n      "rulesLegado": ["a"],`)
      .replace(`"description": "d"\n`, `"description": "d",\n      "dominio": {\n        "regra": "r"\n      }\n`);
    assert.deepEqual(diffRestrito(base, ok), []);
    assert.ok(diffRestrito(base, ok.replace(`"page": "x"`, `"page": "y"`)).some(e => /fora dos campos permitidos/.test(e)));
    assert.ok(diffRestrito(base, ok.replace(`"description": "d",`, `"description": "e",`)).length > 0);
  });
}
{
  const atual = readFileSync(join(EVAL, "ground-truth-vistorias.json"), "utf8");
  const medArq = join(EVAL, "tela-b/vistorias/medicao-dominio-2026-11-04.json");
  // a base literal do validador 3.7.2 (a da migração); sem ela, a migração só é conferida contra a base
  const valDir = join(EVAL, "..", ".tmp-eval", "validator-372");
  const bl372 = existsSync(join(valDir, "data")) ? lerBaseLiteral(valDir) : null;
  if (JSON.parse(atual)._meta.version !== "1.0.0") t("referência B do repositório passa contra a 1.0.0 (forma + diff + medição arquivada + migração)", () => {
    assert.ok(existsSync(medArq), "medição arquivada ausente");
    assert.deepEqual(conferir(atual, baseTxt, JSON.parse(readFileSync(medArq, "utf8")) as Medicao, bl372), []);
  });
  const atualA = readFileSync(join(EVAL, "ground-truth-solicitacao.json"), "utf8");
  if (JSON.parse(atualA)._meta.version !== "2.0.0") t("referência A do repositório passa contra a 2.0.0 (diff + migração; sem domínio)", () => {
    const baseA = execFileSync("git", ["show", "def2125:ground-truth-solicitacao.json"], { cwd: EVAL, encoding: "utf8", maxBuffer: 1 << 26 });
    assert.deepEqual(conferir(atualA, baseA, null, bl372), []);
    assert.ok(!JSON.parse(atualA).violations.some((v: { dominio?: unknown }) => v.dominio));
  });
}

console.log(`\n${n - falhas}/${n}`);
process.exit(falhas ? 1 : 0);
