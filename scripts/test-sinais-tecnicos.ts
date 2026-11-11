/** Testes de scripts/sinais-tecnicos.ts (D-138 §2), com análises sintéticas. npx tsx scripts/test-sinais-tecnicos.ts */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sinaisTecnicos } from "./sinais-tecnicos";

const tmp = mkdtempSync(join(tmpdir(), "sinais-"));
const montar = (nome: string, larguraCom: number) => {
  const dir = join(tmp, nome);
  mkdirSync(join(dir, "revisao"), { recursive: true });
  const exec = (braco: string) => ({ braco, tecnico: { status: "passed", submissao: "accepted" }, mcpIsolamento: { isolamento: "passed", usoOraculo: "x" }, pontuacao: { estado: "pending-review" } });
  writeFileSync(join(dir, "summary.json"), JSON.stringify({ analise: { estado: "pronta" }, execucoes: [exec("sem"), exec("com")] }));
  const card = (id: string, w: number) => ({ id, origin: "agente", scene: `${w}x900`, state: { viewport: { width: w, height: 900 } }, observed: "SEGREDO-DO-ACHADO" });
  writeFileSync(join(dir, "revisao", "package.json"), JSON.stringify({ scenes: [{ id: "1280x900" }], units: [{ id: "U1", scene: "1280x900" }],
    runs: [{ kind: "agente", config: { oracleProfile: "none" }, cardIds: ["C1"] }, { kind: "agente", config: { oracleProfile: "evaluation" }, cardIds: ["C2"] }],
    cards: [card("C1", larguraCom === 1280 ? 1280 : 1440), card("C2", larguraCom)] }));
  return dir;
};
try {
  const ok = sinaisTecnicos(montar("ok", 1280));
  assert.deepEqual(ok.defeitos, []); assert.equal(ok.unidadesZeroPorConstrucao, 0);
  assert.ok(!JSON.stringify(ok).includes("SEGREDO"), "texto de achado nunca sai");
  const ruim = sinaisTecnicos(montar("ruim", 1440));
  assert.equal(ruim.unidadesZeroPorConstrucao, 1);
  assert.ok(ruim.defeitos.some(d => /janela 1440x900/.test(d)) && ruim.defeitos.some(d => /0 por construção/.test(d)));
  assert.equal(ruim.unidadesSoComCartaoADecidir, 0, "o caso da 1440 continua defeito, nunca a-decidir");

  // dev-375-b-01 p01 (cena detalhe-menu): a cena da parada não tem cartão resolvido, mas tem cartão a-decidir cujo
  // seletor resolve nela (casca) → sai à parte, sem defeito; unidade numa cena sem nenhum dos dois continua defeito
  const cenas = (nome: string, segmentosDoADecidir: string[]) => {
    const dir = join(tmp, nome);
    mkdirSync(join(dir, "revisao"), { recursive: true });
    const exec = (braco: string) => ({ braco, tecnico: { status: "passed", submissao: "accepted" }, mcpIsolamento: { isolamento: "passed", usoOraculo: "x" }, pontuacao: { estado: "pending-review" } });
    writeFileSync(join(dir, "summary.json"), JSON.stringify({ analise: { estado: "pronta" }, execucoes: [exec("sem")] }));
    const vp = { viewport: { width: 1280, height: 900 } };
    writeFileSync(join(dir, "revisao", "package.json"), JSON.stringify({
      scenes: [{ id: "1280x900@inicial" }, { id: "1280x900@parada" }, { id: "1280x900@outra" }],
      units: [{ id: "U1", scene: "1280x900@inicial" }, { id: "U2", scene: "1280x900@parada" }, { id: "U3", scene: "1280x900@parada" }],
      runs: [{ kind: "agente", config: { oracleProfile: "none" }, cardIds: ["C1", "C2"] }],
      cards: [{ id: "C1", origin: "agente", scene: "1280x900@inicial", state: vp, observed: "SEGREDO-DO-ACHADO" },
        { id: "C2", origin: "agente", scene: "a-decidir:1280x900", state: vp, segmentos: segmentosDoADecidir.map(scene => ({ scene })), observed: "SEGREDO-DO-ACHADO" }] }));
    return dir;
  };
  const casca = sinaisTecnicos(cenas("a-decidir-ligavel", ["1280x900@inicial", "1280x900@parada"]));
  assert.deepEqual(casca.defeitos, [], "a-decidir ligável à cena não é defeito técnico");
  assert.equal(casca.unidadesZeroPorConstrucao, 0);
  assert.equal(casca.unidadesSoComCartaoADecidir, 2);
  assert.deepEqual(casca.cenasSoComCartaoADecidir, ["1280x900@parada"]);
  assert.ok(!JSON.stringify(casca).includes("SEGREDO"), "texto de achado nunca sai");
  const longe = sinaisTecnicos(cenas("a-decidir-outra-cena", ["1280x900@inicial", "1280x900@outra"]));
  assert.equal(longe.unidadesZeroPorConstrucao, 2, "a-decidir que não resolve na cena da unidade não a salva");
  assert.equal(longe.unidadesSoComCartaoADecidir, 0);
  assert.ok(longe.defeitos.some(d => /2 unidade\(s\) sem nenhum cartão de agente na cena delas/.test(d)));
  console.log("5/5 testes de sinais técnicos passaram");
} finally { rmSync(tmp, { recursive: true, force: true }); }
