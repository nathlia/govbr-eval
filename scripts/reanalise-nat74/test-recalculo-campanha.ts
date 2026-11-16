/**
 * Testes do recálculo §8.5 de campanha nova (recalculo-campanha.ts, plano de revisão 19/10, entrega 4). Sem modelo, sem rede.
 *   1. sintético: CLI (argumentos obrigatórios), regra do desfecho por tela, crédito 1.2.0 × 1.1.0, S4' nos dois braços,
 *      campanha de 2 trios (D por trio, média, trio incompleto, provisório com envoltória), leitura com δ, manifesto;
 *   2. ensaio (D-138, fora da amostra; só leitura): passada T4 e a adjudicada, contagens contra as do plano, 1.1.0 ≠ 1.2.0,
 *      S4' tirando o crédito contestado, determinismo. Pula (com aviso) se o ensaio não estiver em govbr-resultados.
 *   npx tsx scripts/reanalise-nat74/test-recalculo-campanha.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SemanticPackage, SemanticReviews } from "../semantic-flow";
import { EVAL, RESULTADOS, lerJson, sha } from "./comum";
import { mapaRetrospectivo } from "./mapa";
import { DEFINICAO_POR_PROTOCOLO, LEITURA_POR_PROTOCOLO, exclusoesPorBraco } from "./e14-deteccao";
import { montarDecisoes } from "./montar";
import type { AtomoClassificado } from "./politica";
import {
  Entradas, TRIO_COM_SLOT_FORA, chavePorProtocolo, chaveVariante, conjuntoDe, contar, executar, leituraComDelta, recalcular, regraDaTela, removidosS4, slotsPorProtocolo,
  tabelaDaComparacao, tabelaPorProtocolo, unidadesDaSpec, vereditoNaPolitica,
  type Comparacao, type Contestado, type TabelaComparacao, type TrioEntrada,
} from "./recalculo-campanha";

let n = 0, falhas = 0, pulados = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };
const silencioso = <T>(f: () => T): T => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return f(); } finally { console.error = e; console.log = l; } };

console.log("recálculo de campanha nova: sintético");
const tmp = mkdtempSync(join(tmpdir(), "recalculo-campanha-"));
try {
  t("CLI: --passada e --saida obrigatórios; opção desconhecida, argumento solto e --saida existente recusam", () => {
    assert.equal(silencioso(() => executar([])), 1);
    assert.equal(silencioso(() => executar(["--saida", join(tmp, "x")])), 1);
    assert.equal(silencioso(() => executar(["--passada", join(tmp, "p")])), 1);
    assert.equal(silencioso(() => executar(["--passada", join(tmp, "p"), "--saida", join(tmp, "x"), "--fila", "y"])), 1);
    assert.equal(silencioso(() => executar(["solto", "--passada", join(tmp, "p"), "--saida", join(tmp, "x")])), 1);
    assert.equal(silencioso(() => executar(["--passada", join(tmp, "p"), "--saida", tmp])), 1);
    assert.equal(silencioso(() => executar(["--passada", tmp, "--saida", join(tmp, "dentro")])), 1);
    assert.throws(() => recalcular({ passadas: [] }), /--passada/);
  });

  const refD = lerJson<Parameters<typeof regraDaTela>[1]>(join(EVAL, "ground-truth-processos.json"));
  // A regra de desfecho foi pré-registrada para a solicitacao 2.0.0 (commit def2125). A 2.1.0 (migração de ids, NAT-117) não
  // tem regra própria até a autora a registrar: o teste lê a 2.0.0 congelada, e a 2.1.0 do repositório tem de ser recusada.
  const refA = JSON.parse(execFileSync("git", ["show", "def2125:ground-truth-solicitacao.json"], { cwd: EVAL, encoding: "utf8", maxBuffer: 1 << 26 })) as Parameters<typeof regraDaTela>[1];
  const refAAtual = lerJson<Parameters<typeof regraDaTela>[1]>(join(EVAL, "ground-truth-solicitacao.json"));
  if (refAAtual._meta.version !== "2.0.0") t("solicitacao 2.1.0 (migração de ids) sem regra de desfecho pré-registrada: recusa", () => {
    assert.throws(() => regraDaTela("solicitacao", refAAtual), /sem regra de desfecho pré-registrada/);
  });
  t("desfecho §5.1 + D-102: primário por SPEC nas duas telas (D: 9 não expostas, 13 como sensibilidade; A: 12 A-*, unidades A-* como sensibilidade, P-* à parte); outra tela recusa", () => {
    const d = regraDaTela("processos", refD), a = regraDaTela("solicitacao", refA);
    const pd = conjuntoDe(d, "primario"), pa = conjuntoDe(a, "primario");
    assert.equal(pd.modo, "spec"); assert.equal(pd.specs.length, 9); assert.equal(conjuntoDe(d, "com-expostas").specs.length, 13);
    assert.ok(!pd.specs.some(s => ["D-11", "D-12", "D-13", "D-14"].includes(s)));
    assert.equal(pa.modo, "spec"); assert.equal(pa.specs.length, 12);
    assert.equal(conjuntoDe(a, "unidades").modo, "unidade"); assert.deepEqual(conjuntoDe(a, "pagina").specs, ["P-01", "P-02"]);
    assert.deepEqual(d.conjuntos.map(c => c.id), ["primario", "com-expostas", "unidades"]); assert.deepEqual(a.conjuntos.map(c => c.id), ["primario", "unidades", "pagina"]);
    assert.equal(conjuntoDe(d, "unidades").modo, "unidade"); assert.deepEqual(conjuntoDe(d, "unidades").specs, pd.specs);
    assert.match(conjuntoDe(d, "unidades").rotulo, /^unidades das specs não expostas \(53;/);
    assert.throws(() => conjuntoDe(d, "pagina"), /fora da regra/);
    assert.throws(() => regraDaTela("vistorias", refD), /sem regra de desfecho/);
    assert.throws(() => regraDaTela("processos", { ...refD, _meta: { ...refD._meta, version: "0.9.0" } }), /sem regra/);
  });

  // D-196 (N5): a 1.1.0 só migra ids de norma; a regra de desfecho tem de dar os MESMOS conjuntos que a 1.0.0.
  t("desfecho da tela D na referência 1.1.0 (telas.json): mesmos conjuntos e specs da 1.0.0", () => {
    const refD11 = lerJson<Parameters<typeof regraDaTela>[1]>(join(EVAL, "ground-truth-processos-1.1.0.json"));
    assert.equal(refD11._meta.version, "1.1.0");
    const d10 = regraDaTela("processos", refD), d11 = regraDaTela("processos", refD11);
    assert.equal(d11.referencia, "1.1.0");
    assert.deepEqual(d11.conjuntos, d10.conjuntos);
  });

  // Tela E (cadastro-pais 1.0.0; NAT-78 §5.1 coprimário, §3.8 limitação 3): referência SINTÉTICA, só a forma dos campos que a
  // regra lê (ids, categories, contagem, estratos, variante com U-09); nenhuma spec, âncora ou descrição real.
  type RefE = Parameters<typeof regraDaTela>[1];
  const refESint = (o: { exp?: string[]; dsSemeada?: string[]; u09?: string | null; version?: string } = {}): RefE => ({
    _meta: { version: o.version ?? "1.0.0", suite: "cadastro-pais",
      estratos: { semeada: { DS: o.dsSemeada ?? ["X-01", "X-02", "X-03"], G: ["X-04", "X-05"] }, exposto: { specs: o.exp ?? [] } },
      ...(o.u09 === null ? {} : { sensibilidades: { comU09: { spec: { id: o.u09 ?? "X-09" } } } }) },
    violations: [
      { id: "X-01", expectedCount: 1, categories: ["estrutura"] }, { id: "X-02", expectedCount: 2, categories: ["token"] },
      { id: "X-03", expectedCount: 1, categories: ["componente", "tipografia"] },
      { id: "X-04", expectedCount: 1, categories: ["token", "acessibilidade"] }, { id: "X-05", expectedCount: 1, categories: ["comportamento", "acessibilidade"] }] });
  t("[tela E] desfecho cadastro-pais 1.0.0 (sintético): primário = DS semeadas não expostas por spec; todas; unidades do primário; com U-09 no denominador sem crédito", () => {
    const e = regraDaTela("cadastro-pais", refESint());
    assert.equal(e.tela, "cadastro-pais"); assert.equal(e.referencia, "1.0.0"); assert.equal(e.unidadeDelta, "specs");
    assert.deepEqual(e.conjuntos.map(c => [c.id, c.modo, c.tipo]), [["primario", "spec", "primario"], ["todas", "spec", "sensibilidade"], ["unidades", "unidade", "sensibilidade"], ["com-u09", "spec", "sensibilidade"]]);
    assert.deepEqual(conjuntoDe(e, "primario").specs, ["X-01", "X-02", "X-03"]);
    assert.deepEqual(conjuntoDe(e, "todas").specs, ["X-01", "X-02", "X-03", "X-04", "X-05"]);
    assert.deepEqual(conjuntoDe(e, "unidades").specs, ["X-01", "X-02", "X-03"]); assert.match(conjuntoDe(e, "unidades").rotulo, /\(4;/);
    assert.deepEqual(conjuntoDe(e, "com-u09").specs, ["X-01", "X-02", "X-03", "X-04", "X-05", "X-09"]); assert.deepEqual(conjuntoDe(e, "com-u09").semCredito, ["X-09"]);
    assert.ok(e.conjuntos.filter(c => c.id !== "com-u09").every(c => c.semCredito === undefined), "só a variante com U-09 tem semCredito");
    // exposta (sintética) sai do primário e fica em todas
    const ex = regraDaTela("cadastro-pais", refESint({ exp: ["X-02"] }));
    assert.deepEqual(conjuntoDe(ex, "primario").specs, ["X-01", "X-03"]); assert.equal(conjuntoDe(ex, "todas").specs.length, 5);
  });
  t("[tela E] contagem: a spec da variante com U-09 nunca é contada, mesmo com unidade que a aponte; o resto conta como em todas", () => {
    const e = regraDaTela("cadastro-pais", refESint());
    const sp: Record<string, string> = { a: "X-01", b: "X-02", c: "X-02", d: "X-04", z: "X-09" };
    const sd = (u: string) => sp[u];
    assert.equal(contar(e, "primario", sd)(["a", "b", "c", "d", "z"]), 2);
    assert.equal(contar(e, "unidades", sd)(["a", "b", "c", "d", "z"]), 3);
    assert.equal(contar(e, "todas", sd)(["a", "b", "c", "d", "z"]), 3);
    assert.equal(contar(e, "com-u09", sd)(["a", "b", "c", "d", "z"]), 3);
    assert.equal(contar(e, "com-u09", sd)(["z"]), 0);
  });
  t("[tela E] recusas: versão sem regra, classe ds ≠ estrato DS, sem estratos, sem a variante com U-09, U-09 já na principal, exposta fora da referência", () => {
    assert.throws(() => regraDaTela("cadastro-pais", refESint({ version: "0.9.0" })), /sem regra de desfecho pré-registrada/);
    assert.throws(() => regraDaTela("cadastro-pais", refESint({ dsSemeada: ["X-01", "X-02"] })), /classe ds pela categories/);
    assert.throws(() => regraDaTela("cadastro-pais", { ...refESint(), _meta: { version: "1.0.0", suite: "cadastro-pais" } }), /estratos\.exposto/);
    assert.throws(() => regraDaTela("cadastro-pais", refESint({ u09: null })), /comU09/);
    assert.throws(() => regraDaTela("cadastro-pais", refESint({ u09: "X-04" })), /já está na referência principal/);
    assert.throws(() => regraDaTela("cadastro-pais", refESint({ exp: ["X-99"] })), /fora da referência/);
    assert.throws(() => regraDaTela("processos", refESint()), /sem _meta\.exposto/);
  });
  t("[tela E] campanha sintética: D_fc^E no primário; com U-09 dá o MESMO D que todas, com denominador +1", () => {
    const e = regraDaTela("cadastro-pais", refESint());
    const sp: Record<string, string> = { a: "X-01", b: "X-02", c: "X-03", d: "X-04", z: "X-09" };
    const br = (confirmadas: string[]) => ({ confirmadas, admissiveis: [], pendentes: 0 });
    const k = chaveVariante("principal", "1.2.0");
    const triosE: TrioEntrada[] = [
      { trio: "p01", ordem: ["sem", "ferramentas", "com"], linhaDeBase: null, creditos: { [k]: { sem: br([]), ferramentas: br(["a"]), com: br(["a", "b", "c", "d", "z"]) } } },
      { trio: "p02", ordem: ["com", "sem", "ferramentas"], linhaDeBase: null, creditos: { [k]: { sem: br(["d"]), ferramentas: br(["a", "b", "d"]), com: br(["b", "z"]) } } }];
    const c: Comparacao = { id: "ferramentas-x-com", arms: ["ferramentas", "com"], role: "primary" };
    const tab = (conjunto: string) => tabelaDaComparacao(triosE, c, { variante: "principal", politica: "1.2.0", conjunto, regra: e, specDe: u => sp[u], nPlanejado: 9, sementeBase: "sintetico" });
    assert.deepEqual(tab("primario").porTrio.map(x => x.d), [2, -1]);
    assert.deepEqual(tab("todas").porTrio.map(x => x.d), [3, -2]);
    assert.deepEqual(tab("com-u09").porTrio.map(x => x.d), tab("todas").porTrio.map(x => x.d));
    assert.deepEqual(tab("com-u09").porTrio.map(x => [x.a, x.b]), tab("todas").porTrio.map(x => [x.a, x.b]));
    assert.equal(conjuntoDe(e, "com-u09").specs.length, conjuntoDe(e, "todas").specs.length + 1);
    assert.match(tab("com-u09").conjunto, /crédito zero nos três braços/);
  });
  {
    const refEAbs = join(EVAL, "ground-truth-cadastro-pais.json");
    if (!existsSync(refEAbs)) { pulados++; console.log("  PULADO referência da E ausente"); }
    else t("[tela E] referência congelada 1.0.0 (sha256 661cc54b…): aceita; 6 no primário, 8 em todas, 6 unidades, 9 com U-09 (só contagens)", () => {
      assert.equal(sha(readFileSync(refEAbs)), "661cc54b7b291bc6e455065ecb23c08e5279bf7a0e9c7d6494afd78ae112c528");
      const e = regraDaTela("cadastro-pais", lerJson<RefE>(refEAbs));
      assert.deepEqual(e.conjuntos.map(c => [c.id, c.specs.length, c.semCredito?.length ?? 0]), [["primario", 6, 0], ["todas", 8, 0], ["unidades", 6, 0], ["com-u09", 9, 1]]);
      assert.match(conjuntoDe(e, "unidades").rotulo, /\(6;/);
    });
  }

  t("contagem: modo spec conta specs distintas; modo unidade conta unidades; só o conjunto pedido", () => {
    const d = regraDaTela("processos", refD), a = regraDaTela("solicitacao", refA);
    const spec: Record<string, string> = { u1: "D-01", u2: "D-01", u3: "D-11", u4: "A-04", u5: "A-04", u6: "P-01", u7: "A-01" };
    const sd = (u: string) => spec[u];
    assert.equal(contar(d, "primario", sd)(["u1", "u2", "u3"]), 1);
    assert.equal(contar(d, "com-expostas", sd)(["u1", "u2", "u3"]), 2);
    assert.equal(contar(a, "primario", sd)(["u4", "u5", "u6", "u4", "u7"]), 2);
    assert.equal(contar(a, "unidades", sd)(["u4", "u5", "u6", "u4", "u7"]), 3);
    assert.equal(contar(a, "pagina", sd)(["u4", "u5", "u6"]), 1);
  });

  t("política: 1.2.0 credita norma, R15 e Q1 a; 1.1.0 só norma (R15 → falso, Q1 a → nova); pendente e removido (S4')", () => {
    const d = (fundamentacao: "norma" | "mais-fraca" | "nenhuma" | null, classe = "violacao-pagina") => ({ classe: classe as never, spec: "A-01", fundamentacao });
    assert.equal(vereditoNaPolitica(d("norma"), "1.2.0").veredito, "reference");
    assert.equal(vereditoNaPolitica(d("norma"), "1.1.0").veredito, "reference");
    assert.equal(vereditoNaPolitica(d("mais-fraca"), "1.2.0").veredito, "reference");
    assert.equal(vereditoNaPolitica(d("mais-fraca"), "1.1.0").veredito, "false");
    assert.equal(vereditoNaPolitica(d("nenhuma"), "1.2.0").veredito, "reference");
    assert.equal(vereditoNaPolitica(d("nenhuma"), "1.1.0").veredito, "novel");
    assert.equal(vereditoNaPolitica(d(null, "violacao-ds"), "1.2.0").veredito, "novel");
    assert.equal(vereditoNaPolitica(d(null, "erro-factual"), "1.2.0").veredito, "false");
    assert.equal(vereditoNaPolitica(d(null, "evidencia-indisponivel"), "1.2.0").veredito, "unresolved");
    assert.equal(vereditoNaPolitica(d(null, "pendente"), "1.2.0").veredito, "pendente");
    assert.equal(vereditoNaPolitica(d("norma"), "1.2.0", true).veredito, "unresolved");
    assert.equal(vereditoNaPolitica(d(null, "erro-normativo"), "1.2.0", true).veredito, "false", "removido sem crédito não muda nada");
  });

  t("S4': contestado que credita e não foi ratificado sai, em QUALQUER braço; ratificado e contestado sem crédito ficam", () => {
    const c = (id: string, braco: string): Contestado => ({ id, chave: id, braco, motivos: ["x"], creditoFinal: "", fundamentacaoFinal: null, creditoEnvolvido: true });
    const credita = new Set(["c1", "f1", "f2"]);
    const r = removidosS4([c("c1", "com"), c("f1", "ferramentas"), c("f2", "ferramentas"), c("s1", "sem")], id => credita.has(id), new Set(["f2"]));
    assert.deepEqual([...r].sort(), ["c1", "f1"]);
  });

  t("leitura com δ: dentro, cruzando, inteiro fora e indisponível", () => {
    const ic = (inferior: number | null, superior: number | null) => ({ disponivel: inferior !== null, inferior, superior, motivo: inferior === null ? "n efetivo 1 < 5" : null }) as never;
    assert.match(leituraComDelta(ic(-1.5, 1.9), 2), /dentro da faixa pré-especificada de ±δ/);
    assert.match(leituraComDelta(ic(-1, 2.5), 2), /inconclusivo para o efeito relevante/);
    assert.match(leituraComDelta(ic(2.2, 3), 2), /inteiro fora/);
    assert.match(leituraComDelta(ic(null, null), 2), /indisponível/);
  });

  // Campanha sintética de 2 trios (tela D, modo spec) + 1 trio sem o braço com.
  const regraD = regraDaTela("processos", refD);
  const specDe: Record<string, string> = { a: "D-01", b: "D-01", c: "D-02", d: "D-03", e: "D-11", f: "D-04" };
  const br = (confirmadas: string[], admissiveis: string[] = [], pendentes = 0) => ({ confirmadas, admissiveis, pendentes });
  const trios: TrioEntrada[] = [
    { trio: "p01", ordem: ["com", "sem", "ferramentas"], linhaDeBase: null, creditos: {
      [chaveVariante("principal", "1.2.0")]: { sem: br(["a"]), ferramentas: br(["a", "c"]), com: br(["a", "b", "c", "d", "e"]) },
      [chaveVariante("principal", "1.1.0")]: { sem: br(["a"]), ferramentas: br(["a"]), com: br(["a", "b", "d"]) },
      [chaveVariante("S4'", "1.2.0")]: { sem: br(["a"]), ferramentas: br(["a"]), com: br(["a", "c"]) } } },
    { trio: "p02", ordem: ["ferramentas", "com", "sem"], linhaDeBase: null, creditos: {
      [chaveVariante("principal", "1.2.0")]: { sem: br([]), ferramentas: br(["c", "d"]), com: br(["c"], ["f"], 1) },
      [chaveVariante("principal", "1.1.0")]: { sem: br([]), ferramentas: br(["c"]), com: br(["c"], ["f"], 1) },
      [chaveVariante("S4'", "1.2.0")]: { sem: br([]), ferramentas: br(["c", "d"]), com: br(["c"], ["f"], 1) } } },
    { trio: "p03", ordem: ["sem", "ferramentas", "com"], linhaDeBase: null, creditos: {
      [chaveVariante("principal", "1.2.0")]: { sem: br(["a"]), ferramentas: br(["a"]) } } },
  ];
  const fc: Comparacao = { id: "ferramentas-x-com", arms: ["ferramentas", "com"], role: "primary" };
  const tab = (v: "principal" | "S4'", p: "1.2.0" | "1.1.0", conjunto = "primario"): TabelaComparacao =>
    tabelaDaComparacao(trios, fc, { variante: v, politica: p, conjunto, regra: regraD, specDe: u => specDe[u], nPlanejado: 3, sementeBase: "s", reamostragens: 200 });
  t("2 trios: D_fc por trio (spec, não unidade), média, n planejado × efetivo; trio sem o braço com fica incompleto", () => {
    const x = tab("principal", "1.2.0");
    assert.deepEqual(x.porTrio.map(r => r.d), [1, -1, null]);
    assert.equal(x.porTrio[0].a!.min, 2); assert.equal(x.porTrio[0].b!.min, 3, "a e b são a mesma spec D-01; D-11 é exposta");
    assert.equal(x.porTrio[2].estado, "incompleto");
    assert.equal(x.nEfetivo, 2); assert.equal(x.nPlanejado, 3);
    assert.equal(x.estatistica.media, 0);
    assert.equal(x.formula, "D_fc = com − ferramentas");
    assert.deepEqual(x.porTrio[1].posicoes, { ferramentas: 1, com: 2, sem: 3 });
  });
  t("pendente: trio provisório com envoltória [dMin, dMax]; campanha PROVISORIO", () => {
    const x = tab("principal", "1.2.0");
    assert.equal(x.porTrio[1].estado, "provisorio");
    assert.deepEqual([x.porTrio[1].dMin, x.porTrio[1].dMax], [-1, 0]);
    assert.equal(x.estado, "PROVISORIO");
    assert.equal(x.porTrio[0].estado, "final");
  });
  t("sensibilidade com as expostas conta D-11; 1.1.0 dá outro D; S4' tira dos dois braços", () => {
    assert.equal(tab("principal", "1.2.0", "com-expostas").porTrio[0].d, 2);
    assert.deepEqual(tab("principal", "1.1.0").porTrio.map(r => r.d), [1, 0, null]);
    assert.deepEqual(tab("S4'", "1.2.0").porTrio.map(r => r.d), [1, -1, null]);
    assert.notDeepEqual(tab("principal", "1.1.0").porTrio.map(r => r.d), tab("principal", "1.2.0").porTrio.map(r => r.d));
  });
  t("determinismo: a mesma entrada dá a mesma tabela (semente da campanha + comparação + variante)", () => {
    assert.deepEqual(tab("principal", "1.2.0"), tab("principal", "1.2.0"));
    assert.match(tab("principal", "1.2.0").estatistica.ic.sementeOrigem, /^s\|recalculo\|ferramentas-x-com\|principal\|1\.2\.0\|primario$/);
  });
  // [NAT-78 §4.5] sensibilidade por protocolo: os mesmos 3 trios sintéticos, com o estado do oráculo de cada slot.
  const sc = { id: "sem-x-com", arms: ["sem", "com"], role: "secondary" } as Comparacao;
  const ADERENTE: Record<string, string> = { sem: "absent-verified", ferramentas: "used-adherent", com: "used-adherent" };
  const estadosPP = (desvio: Record<string, Record<string, string>> = {}) => trios.map(tr => slotsPorProtocolo(tr.trio,
    tr.ordem.filter(b => tr.creditos[chaveVariante("principal", "1.2.0")][b]).map(b => ({ braco: b, escolhida: `${tr.trio}-${b}` })),
    tr.ordem.map(b => ({ runId: `${tr.trio}-${b}`, braco: b, mcpIsolamento: { usoOraculo: desvio[tr.trio]?.[b] ?? ADERENTE[b] } }))));
  const optsPP = { variante: "principal" as const, politica: "1.2.0" as const, conjunto: "primario", regra: regraD, specDe: (u: string) => specDe[u], nPlanejado: 3, sementeBase: "s", reamostragens: 200 };
  t("[§4.5] por protocolo, todos aderentes: mesmos D por trio e mesma estatística do primário; só a semente e o rótulo mudam", () => {
    for (const c of [fc, sc]) {
      const pri = tabelaDaComparacao(trios, c, optsPP), pp = tabelaPorProtocolo(trios, estadosPP(), c, optsPP);
      assert.deepEqual(pp.porTrio, pri.porTrio); assert.equal(pp.nEfetivo, pri.nEfetivo); assert.deepEqual(pp.estatistica.principal, pri.estatistica.principal);
      assert.equal(pp.estatistica.media, pri.estatistica.media); assert.deepEqual(pp.foraDaComparacao, []);
      assert.equal(pp.leitura, LEITURA_POR_PROTOCOLO); assert.equal(pp.trioComSlotFora, "trio-inteiro");
      assert.match(pp.estatistica.ic.sementeOrigem, /^s\|sensibilidade-por-protocolo\|recalculo\|/);
      assert.notEqual(pp.estatistica.ic.sementeOrigem, pri.estatistica.ic.sementeOrigem, "semente própria: nunca a mesma série do primário");
    }
    assert.equal(chavePorProtocolo("principal", "1.2.0", "primario"), "sensibilidade-por-protocolo|principal|1.2.0|primario");
  });
  t("[§4.5] um slot used-with-errors (ferramentas do p02): o trio sai de D_fc E de D_sc (trio inteiro, TRIO_COM_SLOT_FORA) e é listado", () => {
    assert.equal(TRIO_COM_SLOT_FORA, "trio-inteiro");
    const est = estadosPP({ p02: { ferramentas: "used-with-errors" } });
    assert.deepEqual(est.find(e => e.trio === "p02")!.slots.find(s => s.braco === "ferramentas"), { braco: "ferramentas", runId: "p02-ferramentas", estado: "used-with-errors", situacao: "fora-com-erros" });
    const f = tabelaPorProtocolo(trios, est, fc, optsPP), s = tabelaPorProtocolo(trios, est, sc, optsPP);
    assert.deepEqual(f.porTrio.map(r => [r.trio, r.d]), [["p01", 1], ["p03", null]]); assert.equal(f.nEfetivo, 1);
    assert.deepEqual(s.porTrio.map(r => r.trio), ["p01", "p03"], "D_sc não usa o ferramentas, mas o trio inteiro sai");
    assert.deepEqual(f.foraDaComparacao, [{ trio: "p02", slots: [{ braco: "ferramentas", runId: "p02-ferramentas", estado: "used-with-errors", situacao: "fora-com-erros" }] }]);
    assert.deepEqual(s.foraDaComparacao.map(x => x.trio), ["p02"]);
    // Alternativa (não adotada): sai só das comparações com o braço do slot.
    const alt = tabelaPorProtocolo(trios, est, sc, { ...optsPP, modo: "so-comparacoes-do-slot" });
    assert.deepEqual(alt.porTrio.map(r => r.trio), ["p01", "p02", "p03"]); assert.deepEqual(alt.foraDaComparacao, []);
    assert.deepEqual(tabelaPorProtocolo(trios, est, fc, { ...optsPP, modo: "so-comparacoes-do-slot" }).foraDaComparacao.map(x => x.trio), ["p02"]);
    // A primária não muda: tabelaDaComparacao não conhece o estado do oráculo.
    assert.deepEqual(tabelaDaComparacao(trios, fc, optsPP).porTrio.map(r => r.d), [1, -1, null]);
  });
  t("[§4.5] sem não absent-verified (p01 unverified): trio fora de todas as comparações por protocolo; slot perdido (p03 sem o com) segue o trio incompleto", () => {
    const est = estadosPP({ p01: { sem: "unverified" } });
    const f = tabelaPorProtocolo(trios, est, fc, optsPP);
    assert.deepEqual(f.porTrio.map(r => [r.trio, r.d, r.estado]), [["p02", -1, "provisorio"], ["p03", null, "incompleto"]]);
    assert.deepEqual(f.foraDaComparacao, [{ trio: "p01", slots: [{ braco: "sem", runId: "p01-sem", estado: "unverified", situacao: "fora" }] }]);
    assert.deepEqual(est.find(e => e.trio === "p03")!.slots.map(s => s.braco), ["sem", "ferramentas"], "slot perdido não tem estado: não é 'fora por protocolo'");
    assert.throws(() => tabelaPorProtocolo(trios, est.slice(1), fc, optsPP), /trio p01 sem o estado do oráculo/);
    assert.throws(() => estadosPP({ p01: { com: "used-nonadherent" } }), /fora do contrato/);
  });
  t("[D-198] exclusões POR BRAÇO: slots, no conjunto e excluídos com o estado que excluiu, em cada braço (nada some em silêncio)", () => {
    const est = estadosPP({ p01: { sem: "unverified", com: "used-with-errors" }, p02: { com: "available-unused" } });
    const ex = exclusoesPorBraco(est.flatMap(e => e.slots), ["sem", "ferramentas", "com"]);
    assert.deepEqual(ex, {
      sem: { slots: 3, noConjunto: 2, excluidos: 1, porEstado: { unverified: 1 } },
      ferramentas: { slots: 3, noConjunto: 3, excluidos: 0, porEstado: {} },
      com: { slots: 2, noConjunto: 0, excluidos: 2, porEstado: { "available-unused": 1, "used-with-errors": 1 } },
    }, "p03 perdeu o slot do com: não é exclusão por protocolo (2 slots, não 3)");
    for (const x of Object.values(ex)) assert.equal(x.noConjunto + x.excluidos, x.slots);
    assert.throws(() => exclusoesPorBraco(est.flatMap(e => e.slots), ["sem", "com"]), /fora dos braços do desenho/);
  });

  t("manifesto: entrada lida sem sha256 no manifesto recusa", () => {
    const E = new Entradas();
    E.texto(join(EVAL, "package.json"));
    assert.doesNotThrow(() => E.conferir(E.manifesto()));
    assert.throws(() => E.conferir({}), /sem sha256 no manifesto/);
  });

  console.log("recálculo de campanha nova: cópia da vinculação de montar.ts (deriva falha aqui)");
  /**
   * `unidadesDaSpec` é cópia da vinculação do E8 (`montarDecisoes`, montar.ts, que não se refatora). Os dois rodam sobre os
   * mesmos cartões × specs de pacotes reais — T7 tela B p01 (1.8.0: 3 cenas, domínio provado, host-interno, ausência
   * global, cartões com segmentos) e o pacote 1.8.2 do ensaio — e têm de dar as mesmas unidades, os mesmos vínculos
   * (texto inteiro) e as mesmas falhas.
   */
  const equivalencia = (rotulo: string, pkgAbs: string, todosOsRamos: boolean) => {
    if (!existsSync(pkgAbs)) { pulados++; console.log(`  PULADO ${rotulo}: pacote ausente`); return; }
    t(`${rotulo}: unidadesDaSpec ≡ montarDecisoes em todo cartão × spec`, () => {
      const pkg = lerJson<SemanticPackage>(pkgAbs);
      const mapa = mapaRetrospectivo(pkg, pkg);
      const mapeados = new Set(mapa.cartoes.filter(c => c.de === c.para).map(c => c.de));
      const cards = pkg.cards.filter(c => mapeados.has(c.id) && c.subjects.length);
      const specs = [...new Set(pkg.units.map(u => u.specId))].sort();
      const ramos = { ancorado: 0, vinculo: 0, dominio: 0, falha: 0, recusaScorer: 0, relacoes: new Set<string>() };
      for (const spec of specs) {
        const sujeitosDe = (c: SemanticPackage["cards"][number]) => (c.segmentos ? c.subjects.filter(x => x.scene === c.segmentos![0].scene) : c.subjects);
        const revAntigo: SemanticReviews = { version: pkg.version, decisions: cards.map(c => ({ cardId: c.id, status: "reviewed" as const, reviewer: "r", rationale: "r", complete: true,
          evidenceRefs: ["x"], atoms: [{ id: "a", text: "t", subjects: sujeitosDe(c).map(x => x.id), verdict: "novel" as const, unitIds: [], citation: "uncertain" as const }],
          ...(c.segmentos ? { cena: c.segmentos[0].scene } : {}) })) };
        const classificados = new Map<string, AtomoClassificado>(cards.map(c => [`${c.id}|a`, { chave: `${c.id}|a`, juiz: "j", tratamento: "julgado", transporArquivo: false,
          aposRevelacao: false, aposOrientacao: false, fontes: ["f1", "f2", "f3"], divergencias: [], fila: null, motivoFila: null,
          partes: [{ indice: 0, parte: "o cartão inteiro", sujeitos: sujeitosDe(c).map(x => x.id), verdadeFactual: "verdadeira", normaId: null, normaForca: null,
            normaAplicabilidade: null, normaViolada: null, origemJuiz: null, origem: "pagina", origemRotulo: null, regraCitada: null, forcaDaCitacao: null,
            aplicabilidadeDaCitada: null, qualidadeDaSugestao: null, classe: "violacao-pagina", spec, credito: "unidade", regraDaPolitica: "R7", motivo: `m ${spec}` }] } as AtomoClassificado]));
        const m = montarDecisoes({ novo: pkg, antigo: pkg, revAntigo, mapa, classificados, chaveDe: (id, at) => `${id}|${at}` });
        for (const c of cards) {
          const meu = unidadesDaSpec(c, pkg.units, spec, sujeitosDe(c), `m ${spec}`, "nat74-retrospectiva · j", ["f1", "f2", "f3"]);
          const rec = m.recusados.find(r => r.cardId === c.id);
          const vin = m.vinculos.filter(v => v.cardId === c.id).map(v => ({ unitId: v.unitId, subject: v.subject, relacao: v.relacao }));
          if ("falhou" in meu) { ramos.falha++; assert.equal(rec?.motivo, meu.falhou, `${c.id} × ${spec}`); continue; }
          assert.deepEqual(vin, meu.links.map(l => ({ unitId: l.unitId, subject: l.subjects[0], relacao: l.relation })), `${c.id} × ${spec}: vínculos`);
          if (rec) { ramos.recusaScorer++; assert.match(rec.motivo, /^recusado pelo scorer/, `${c.id} × ${spec}`); continue; }
          const atom = m.reviews.decisions.find(d => d.cardId === c.id)!.atoms[0];
          assert.deepEqual(atom.unitIds, meu.unitIds, `${c.id} × ${spec}: unidades`);
          assert.deepEqual(atom.links ?? [], meu.links, `${c.id} × ${spec}: vínculos (texto inteiro)`);
          if (meu.links.length) ramos.vinculo++; else ramos.ancorado++;
          for (const l of meu.links) { ramos.relacoes.add(l.relation); if (/domínio provado/.test(l.justification)) ramos.dominio++; }
        }
      }
      console.log(`       ramos: ${JSON.stringify({ ...ramos, relacoes: [...ramos.relacoes].sort() })}`);
      assert.ok(ramos.ancorado > 0 && ramos.vinculo > 0, "cobre ancoragem e vínculo");
      if (todosOsRamos) assert.ok(ramos.falha > 0 && ramos.dominio > 0 && ramos.recusaScorer > 0 && ramos.relacoes.size === 3,
        "cobre falha, domínio provado, recusa do scorer e as 3 relações");
    });
  };
  equivalencia("T7 tela B p01 (1.8.0, domínio provado)", join(RESULTADOS, "derivados", "nat74-retrospectiva", "1.2.0", "t7-tela-b-01", "p01", "package.flow-semantic-1.8.0.json"), true);
  equivalencia("ensaio tela A (1.8.2)", join(RESULTADOS, "analises", "ensaio-trio-real-01", "trio-01", "analisar-20261019T1", "revisao", "package.json"), false);

  console.log("recálculo de campanha nova: ensaio (fora da amostra, só leitura)");
  const T = join(RESULTADOS, "analises", "ensaio-trio-real-01", "trio-01");
  const T4 = join(T, "primeira-passada-20261019T4"), ADJ = join(T, "revisao-20261019T7", "adjudicada-20261020T1");
  if (!existsSync(join(T4, "julgamentos.json")) || !existsSync(join(ADJ, "julgamentos.json"))) { pulados++; console.log("  PULADO ensaio ausente"); }
  else {
    const base = { coletas: [join(T, "analisar-20261019T3", "coleta-trio.json")], residuoPassada: join(T, "primeira-passada-20261019T5"), reamostragens: 200 };
    const r4 = recalcular({ passadas: [T4], ...base });
    const tb = (r: ReturnType<typeof recalcular>, k: string) => (r.json.tabelas as Record<string, TabelaComparacao[]>)[k];
    const cred = (r: ReturnType<typeof recalcular>, k: string) => (r.json.trios as TrioEntrada[])[0].creditos[k];
    const pkg = lerJson<{ units: { id: string; specId: string }[] }>(join(T, "analisar-20261019T1", "revisao", "package.json"));
    const sp = new Map(pkg.units.map(u => [u.id, u.specId]));
    t("T4: specs distintas confirmadas = as vinculadas do plano (sem 6, ferramentas 7, com 8 de 14 com P-*); primário A-* 6/7/6; unidades A-* 7/9/7", () => {
      const c = cred(r4, "principal|1.2.0");
      const specs = (b: string) => new Set(c[b].confirmadas.map(u => sp.get(u))).size;
      assert.deepEqual([specs("sem"), specs("ferramentas"), specs("com")], [6, 7, 8]);
      assert.deepEqual(tb(r4, "principal|1.2.0|primario").map(x => [x.comparacao, x.porTrio[0].a!.min, x.porTrio[0].b!.min]),
        [["ferramentas-x-com", 7, 6], ["sem-x-ferramentas", 6, 7], ["sem-x-com", 6, 6]]);
      assert.deepEqual(tb(r4, "principal|1.2.0|primario").map(x => x.porTrio[0].d), [-1, 1, 0]);
      assert.deepEqual(tb(r4, "principal|1.2.0|unidades").map(x => x.porTrio[0].d), [-2, 2, 0]);
      assert.deepEqual(tb(r4, "principal|1.2.0|pagina").map(x => x.porTrio[0].d), [2, 0, 2]);
    });
    t("T4: 1.1.0 tira a Q1 a (A-11 em sem e ferramentas) e muda D; S4' indisponível sem adjudicação", () => {
      assert.deepEqual(tb(r4, "principal|1.1.0|primario").map(x => x.porTrio[0].d), [0, 1, 1]);
      assert.equal((r4.json.s4 as { disponivel: boolean }).disponivel, false);
      assert.ok(!tb(r4, "S4'|1.2.0|primario"));
    });
    t("T4: todas as entradas com sha256 (julgamentos, pacote, coleta, resíduo); aviso de ensaio", () => {
      const e = r4.json.entradas as Record<string, string>;
      const k = Object.keys(e);
      assert.equal(e[k.find(x => x.endsWith("primeira-passada-20261019T4/julgamentos.json"))!], sha(readFileSync(join(T4, "julgamentos.json"))));
      for (const f of ["analisar-20261019T1/revisao/package.json", "analisar-20261019T3/coleta-trio.json", "primeira-passada-20261019T5/residuo-de-braco.json", "lotes/lote-01.json"])
        assert.ok(k.some(x => x.endsWith(f)), f);
      assert.match(String(r4.json.aviso), /ENSAIO/);
    });
    t("T4: sem --coleta a análise sem coleta-trio.json é recusada", () => {
      assert.throws(() => recalcular({ passadas: [T4] }), /coleta-trio\.json/);
    });
    const ra = recalcular({ passadas: [ADJ], analises: [join(T, "analisar-20261019T1")], ...base });
    t("adjudicada: S4' tira o crédito contestado (A-04 do ferramentas) só de quem o recebeu; com intocado", () => {
      const s4 = ra.json.s4 as { disponivel: boolean; retirados: string[] };
      assert.equal(s4.disponivel, true);
      assert.ok(s4.retirados.includes("T3-3a139fd43c"));
      const p = cred(ra, "principal|1.2.0"), s = cred(ra, "S4'|1.2.0");
      assert.ok(p.ferramentas.confirmadas.some(u => sp.get(u) === "A-04"));
      assert.ok(!s.ferramentas.confirmadas.some(u => sp.get(u) === "A-04"));
      assert.deepEqual(s.com.confirmadas, p.com.confirmadas);
      assert.deepEqual(s.sem.confirmadas, p.sem.confirmadas);
      assert.equal(tb(ra, "S4'|1.2.0|primario")[0].porTrio[0].d, 0);
    });
    t("adjudicada: resíduo por braço ao lado do S4' (com 10/14, ferramentas 4/10, sem 8/8)", () => {
      assert.match(ra.md, /\| com \| 8 \| 6 \| 0 \| 0 \| 0 \| 10\/14 \|/);
      assert.match(ra.md, /\| ferramentas \| 7 \| 1 \| 1 \| 1 \| 0 \| 4\/10 \|/);
    });
    t("determinismo: duas execuções dão o mesmo recalculo.json byte a byte", () => {
      const rb = recalcular({ passadas: [ADJ], analises: [join(T, "analisar-20261019T1")], ...base });
      assert.equal(JSON.stringify(rb.json), JSON.stringify(ra.json));
      assert.equal(rb.md, ra.md);
    });
    t("[§4.5] --por-protocolo no ensaio (3 slots aderentes pela summary.json): só ACRESCENTA a chave própria e a summary.json às entradas; mesmos D", () => {
      const rp = recalcular({ passadas: [ADJ], analises: [join(T, "analisar-20261019T1")], ...base, porProtocolo: true });
      const { sensibilidadePorProtocolo: pp, entradas: ep, ...resto } = rp.json as Record<string, unknown>;
      const { entradas: e0, ...resto0 } = ra.json as Record<string, unknown>;
      assert.equal(JSON.stringify(resto), JSON.stringify(resto0), "o primário (e tudo o mais) igual byte a byte");
      const extra = Object.keys(ep as object).filter(k => !(k in (e0 as object)));
      assert.deepEqual(extra.map(k => k.split("/").slice(-2).join("/")), ["analisar-20261019T1/summary.json"]);
      assert.ok(rp.md.startsWith(ra.md)); assert.match(rp.md, /## ANÁLISE DE SENSIBILIDADE — por protocolo \(NAT-78 §4\.5\); não é o primário/);
      const x = pp as { tipo: string; definicao: { versao: string }; exclusoesPorBraco: Record<string, unknown>; trios: { slots: { situacao: string }[] }[]; tabelas: Record<string, TabelaComparacao[]> };
      assert.equal(x.tipo, "sensibilidade"); assert.equal(x.definicao.versao, DEFINICAO_POR_PROTOCOLO.versao);
      assert.deepEqual(x.exclusoesPorBraco.com, { slots: 1, noConjunto: 1, excluidos: 0, porEstado: {} });
      assert.deepEqual(x.trios[0].slots.map(s => s.situacao), ["no-conjunto", "no-conjunto", "no-conjunto"]);
      assert.deepEqual(x.tabelas[chavePorProtocolo("principal", "1.2.0", "primario")].map(t => t.porTrio.map(r => r.d)), tb(ra, "principal|1.2.0|primario").map(t => t.porTrio.map(r => r.d)));
      assert.ok(!Object.keys(rp.json.tabelas as object).some(k => k.startsWith(LEITURA_POR_PROTOCOLO)), "nunca dentro de `tabelas`");
    });
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes do recálculo passaram${pulados ? ` (${pulados} parte(s) pulada(s))` : ""}`);
if (falhas) process.exit(1);
