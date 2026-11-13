/**
 * NAT-65 (T7.2) — estatística pareada: valores conhecidos, à mão.
 *
 *   npm run test:estatistica
 */
import assert from "node:assert/strict";
import {
  analisePareada, desvioPadrao, holmTelas, icBootstrapMedia, leituraSobHolm, mediana, mulberry32, postosMedios, quantil, testePermutacaoSinal, testeSinal, testeWilcoxon,
} from "./estatistica-pareada";

let ok = 0, falhas = 0;
function teste(nome: string, f: () => void): void {
  try { f(); ok++; console.log(`ok   ${nome}`); } catch (e) { falhas++; console.log(`FAIL ${nome}\n     ${(e as Error).stack?.split("\n").slice(0, 5).join("\n     ")}`); }
}
const perto = (a: number | null, b: number, msg?: string) => assert.ok(a !== null && Math.abs(a - b) < 1e-12, `${msg ?? ""} ${a} ≠ ${b}`);

teste("Wilcoxon exato: n = 10 todos positivos → p = 2/1024 = 0,001953", () => {
  const r = testeWilcoxon([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  perto(r.p, 2 / 1024);
  assert.equal(r.wMais, 55);
  assert.equal(r.wMenos, 0);
});

teste("Wilcoxon exato: 9+/1− com o MENOR posto negativo → p = 4/1024 = 0,003906", () => {
  perto(testeWilcoxon([-1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).p, 4 / 1024);
});

teste("Wilcoxon exato: D = [1..9, −10] (MAIOR posto negativo) → p = 86/1024 = 0,083984375", () => {
  const r = testeWilcoxon([1, 2, 3, 4, 5, 6, 7, 8, 9, -10]);
  perto(r.p, 0.083984375);
  assert.equal(r.wMenos, 10);
});

teste("Wilcoxon à Pratt com empates: [0,1,1,2] → postos 1/2,5/2,5/4, zero fora da estatística, p = 2/8", () => {
  assert.deepEqual(postosMedios([0, 1, 1, 2]), [1, 2.5, 2.5, 4]);
  const r = testeWilcoxon([0, 1, 1, 2]);
  assert.equal(r.zeros, 1);
  assert.equal(r.wMais, 9);
  perto(r.p, 0.25);
});

teste("Wilcoxon: todos zero → p = 1, sem diferença", () => {
  const r = testeWilcoxon([0, 0, 0]);
  assert.equal(r.p, 1);
  assert.match(r.nota!, /sem diferença/);
});

teste("permutação por troca de sinal: n = 10 positivos de |D| iguais → p = 2/1024", () => {
  perto(testePermutacaoSinal(Array(10).fill(1)).p, 2 / 1024);
  perto(testePermutacaoSinal(Array(10).fill(-3)).p, 2 / 1024, "simétrico");
});

teste("permutação: zeros entram nas atribuições e valem 0; [0,1,1,2] → p = 4/16", () => {
  const r = testePermutacaoSinal([0, 1, 1, 2]);
  assert.equal(r.atribuicoes, 16);
  perto(r.p, 0.25);
});

teste("permutação: todos D = 0 → p = 1, 'sem diferença'; n > 20 é erro (nunca aproximação)", () => {
  const r = testePermutacaoSinal([0, 0, 0, 0, 0]);
  assert.equal(r.p, 1);
  assert.match(r.nota!, /sem diferença/);
  assert.throws(() => testePermutacaoSinal(Array(21).fill(1)), /só até n = 20/);
  assert.equal(testePermutacaoSinal([]).p, null);
});

teste("permutação: D = [1..9, −10] → 86/1024 = 0,083984375 (D iguais aos postos: coincide com o Wilcoxon); [1,1,2,3] → 2/16", () => {
  perto(testePermutacaoSinal([1, 2, 3, 4, 5, 6, 7, 8, 9, -10]).p, 0.083984375);
  // soma 7: só os dois extremos (todos + / todos −) têm |soma| ≥ 7; o Wilcoxon (postos 1,5/1,5/3/4) dá o mesmo aqui
  perto(testePermutacaoSinal([1, 1, 2, 3]).p, 2 / 16);
  perto(testePermutacaoSinal([1, 1, 1, -10]).p, 1, "|−10| domina: toda atribuição tem |soma| ≥ 7");
});

teste("teste do sinal exato: 10+ → 2/1024; 9+/1− → 22/1024; zeros fora e contados", () => {
  perto(testeSinal(Array(10).fill(2)).p, 2 / 1024);
  perto(testeSinal([1, 1, 1, 1, 1, 1, 1, 1, 1, -1]).p, 22 / 1024);
  const z = testeSinal([1, 0, 0, 1, -1]);
  assert.equal(z.zeros, 2);
  perto(z.p, 1);
  assert.equal(testeSinal([0, 0]).p, 1);
});

teste("descritivas: média, mediana (par e ímpar), desvio-padrão amostral", () => {
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
  perto(desvioPadrao([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7));
  assert.equal(desvioPadrao([1]), null);
  assert.equal(quantil([1, 2, 3, 4], 0.5), 2.5);
});

teste("bootstrap: mulberry32 determinístico; mesma semente → mesmo IC; outra origem → outra semente; IC cobre a média", () => {
  const g = mulberry32(42), h = mulberry32(42);
  for (let i = 0; i < 5; i++) assert.equal(g(), h());
  const d = [0, 2, -1, 3, 1, 2, 0, 4, 1, 2];
  const a = icBootstrapMedia(d, "a".repeat(40)), b = icBootstrapMedia(d, "a".repeat(40)), c = icBootstrapMedia(d, "b".repeat(40));
  assert.deepEqual(a, b);
  assert.ok(a.disponivel && a.inferior! <= 1.4 && a.superior! >= 1.4, `${a.inferior}–${a.superior}`);
  assert.notEqual(a.semente, c.semente, "outra semente-origem, outro fluxo do gerador");
  assert.equal(a.reamostragens, 10_000);
  assert.equal(a.gerador, "mulberry32");
  assert.equal(a.metodo, "bootstrap-percentil-pares");
});

teste("bootstrap indisponível com motivo: n < 5, ou todos os D iguais", () => {
  const p = icBootstrapMedia([1, 2, 3, 4], "x");
  assert.ok(!p.disponivel && /n efetivo 4 < 5/.test(p.motivo!));
  const q = icBootstrapMedia([2, 2, 2, 2, 2, 2], "x");
  assert.ok(!q.disponivel && /todos os D iguais/.test(q.motivo!));
});

teste("leitura do protocolo congelado §4: p < 0,05 e MÉDIA de D > 0 → vantagem do com; simétrico; senão sem diferença detectável", () => {
  assert.equal(analisePareada(Array(10).fill(1), "s").leitura, "vantagem-com");
  assert.equal(analisePareada(Array(10).fill(-1), "s").leitura, "vantagem-sem");
  assert.equal(analisePareada([1, -1, 0, 2, -2, 1], "s").leitura, "sem-diferenca-detectavel");
  assert.equal(analisePareada([], "s").leitura, "indisponivel");
});

teste("Holm D × E (§6.3): menor p contra 0,025; só se passar, o outro contra 0,05; senão nenhuma é declarada", () => {
  const a = holmTelas(0.004, 0.03);
  assert.deepEqual(a.ordem, ["D", "E"]);
  assert.deepEqual(a.D, { p: 0.004, limiar: 0.025, declarada: true });
  assert.deepEqual(a.E, { p: 0.03, limiar: 0.05, declarada: true });
  const b = holmTelas(0.2, 0.01);
  assert.deepEqual(b.ordem, ["E", "D"]);
  assert.deepEqual(b.E, { p: 0.01, limiar: 0.025, declarada: true });
  assert.deepEqual(b.D, { p: 0.2, limiar: 0.05, declarada: false });
  // o menor não passa (0,03 ≥ 0,025): nenhuma declarada, nem a que ficaria abaixo de 0,05 sozinha
  const c = holmTelas(0.03, 0.04);
  assert.equal(c.D.declarada, false); assert.equal(c.E!.declarada, false); assert.equal(c.E!.limiar, null);
  // estrito: p igual ao limiar não passa
  assert.equal(holmTelas(0.025, 0.5).D.declarada, false);
  assert.equal(holmTelas(0.01, 0.05).E!.declarada, false);
  // empate: a D primeiro, o resultado é o mesmo
  const e = holmTelas(0.02, 0.02);
  assert.deepEqual(e.ordem, ["D", "E"]); assert.ok(e.D.declarada && e.E!.declarada);
});

teste("Holm D × E (§6.3): E fora antes de qualquer coleta → família só com a D, limiar 0,05; p indisponível recusa", () => {
  const s = holmTelas(0.03, "fora-antes-da-coleta");
  assert.deepEqual(s.familia, ["D"]); assert.equal(s.E, null);
  assert.deepEqual(s.D, { p: 0.03, limiar: 0.05, declarada: true });
  assert.equal(holmTelas(0.05, "fora-antes-da-coleta").D.declarada, false);
  assert.throws(() => holmTelas(null, 0.01), /tela D indisponível/);
  assert.throws(() => holmTelas(0.01, null), /tela E indisponível/);
  assert.throws(() => holmTelas(1.2, 0.01), /inválido/);
});

teste("leitura sob Holm: vantagem só se declarada, na direção da média; p trocado recusa", () => {
  const com = analisePareada(Array(9).fill(1), "s"), semD = analisePareada(Array(9).fill(-1), "s");
  perto(com.principal.p, 2 / 512);
  const h = holmTelas(com.principal.p, 0.5);
  assert.equal(leituraSobHolm(com, h.D), "vantagem-com");
  assert.equal(leituraSobHolm(semD, holmTelas(semD.principal.p, 0.5).D), "vantagem-sem");
  assert.equal(leituraSobHolm(com, holmTelas(com.principal.p, 0.001).D), "vantagem-com", "a D passa em 0,05 depois da E passar em 0,025");
  const nula = analisePareada([1, -1, 0, 2, -2, 1], "s");
  assert.equal(leituraSobHolm(nula, holmTelas(nula.principal.p, 0.001).D), "sem-diferenca-detectavel");
  assert.throws(() => leituraSobHolm(com, { p: 0.5, limiar: 0.05, declarada: false }), /não é o p dado ao Holm/);
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exitCode = falhas ? 1 : 0;
