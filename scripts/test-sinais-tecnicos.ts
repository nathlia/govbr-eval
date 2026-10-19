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
  console.log("3/3 testes de sinais técnicos passaram");
} finally { rmSync(tmp, { recursive: true, force: true }); }
