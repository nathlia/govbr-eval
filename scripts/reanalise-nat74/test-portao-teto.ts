/**
 * Testes do portão de teto da tela F (portao-teto.ts; adendo de 26/11 §5). Sem modelo, sem rede.
 *   1. sintético: estrato semeado, limiar ⌊n/2⌋, veredito (passa / não passa / indeterminado por pendentes), recusas de
 *      execução que não é do sem ou de análise com mais de uma execução, CLI;
 *   2. dados arquivados da D (fechada; só leitura): a contagem por execução é a MESMA do recálculo arquivado de 26/11 (a
 *      coluna `sem` do primário, por trio), com a referência F sintética (semeado = as 9 não expostas da D); e o caminho de
 *      arquivo (passada → análises → referência) chega até a recusa de análise com três execuções de agente.
 *   npx tsx scripts/reanalise-nat74/test-portao-teto.ts
 */
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { EVAL, RESULTADOS, lerJson } from "./comum";
import { EXECUCOES_DO_PORTAO, avaliarPortao, contagemDaExecucao, contagemDoSem, executar, limiarDoPortao, semeadasDaReferencia, vereditoDoPortao, type ExecucaoDoPortao } from "./portao-teto";
import { Entradas, carregarCampanha, julgadosDoTrio, type Referencia, type TabelaComparacao } from "./recalculo-campanha";

let n = 0, falhas = 0, pulados = 0;
const t = (nome: string, f: () => void) => { n++; try { f(); console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : e}`); } };
const silencioso = <T>(f: () => T): T => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return f(); } finally { console.error = e; console.log = l; } };

const tmp = mkdtempSync(join(tmpdir(), "portao-teto-"));
try {
  console.log("portão de teto: sintético");
  const refSint = (o: { sem?: string[]; exp?: string[]; cat?: string[] } = {}): Referencia => ({
    _meta: { version: "0.9.0", suite: "processos-f", estratos: { semeado: { specs: o.sem ?? ["F-01", "F-02", "F-03"] }, natural: { specs: ["D-01"] }, exposto: { specs: o.exp ?? [] } } },
    violations: [{ id: "F-01", categories: o.cat ?? ["componente"] }, { id: "F-02", categories: ["token"] }, { id: "F-03", categories: ["estrutura", "tipografia"] }, { id: "D-01", categories: ["navegacao", "acessibilidade"] }] });
  t("estrato semeado: aceito em qualquer versão da referência candidata; recusa vazio, repetido, fora da referência, exposto, fora da classe ds", () => {
    assert.deepEqual(semeadasDaReferencia(refSint()), ["F-01", "F-02", "F-03"]);
    assert.throws(() => semeadasDaReferencia(refSint({ sem: [] })), /estrato semeado vazio/);
    assert.throws(() => semeadasDaReferencia(refSint({ sem: ["F-01", "F-01"] })), /repetida/);
    assert.throws(() => semeadasDaReferencia(refSint({ sem: ["F-01", "F-99"] })), /fora da referência/);
    assert.throws(() => semeadasDaReferencia(refSint({ exp: ["F-02"] })), /exposta/);
    assert.throws(() => semeadasDaReferencia(refSint({ cat: ["componente", "acessibilidade"] })), /fora da classe ds/);
  });
  const ex = (c: number, m = c): ExecucaoDoPortao => ({ analise: `a${c}${m}`, runId: `r${c}${m}`, confirmadas: Array.from({ length: c }, (_, i) => `S${i}`), maximo: Array.from({ length: m }, (_, i) => `S${i}`) });
  t("limiar ⌊n/2⌋ (6 de 12, 5 de 11 e de 10) e veredito pela mediana das 3 execuções", () => {
    assert.deepEqual([limiarDoPortao(12), limiarDoPortao(11), limiarDoPortao(10)], [6, 5, 5]);
    assert.equal(EXECUCOES_DO_PORTAO, 3);
    assert.deepEqual(vereditoDoPortao([ex(6), ex(7), ex(2)], 12), { mediana: 6, medianaMax: 6, n: 12, limiar: 6, veredito: "passa" });
    assert.equal(vereditoDoPortao([ex(7), ex(9), ex(1)], 12).veredito, "nao-passa");
    assert.equal(vereditoDoPortao([ex(6), ex(6), ex(6)], 11).veredito, "nao-passa", "n = 11: limiar 5");
    assert.equal(vereditoDoPortao([ex(0), ex(0), ex(0)], 12).veredito, "passa");
  });
  t("pendentes: só no máximo; lados diferentes do limiar → indeterminado (nunca resolvido em silêncio)", () => {
    assert.deepEqual(vereditoDoPortao([ex(6, 7), ex(6, 7), ex(3)], 12), { mediana: 6, medianaMax: 7, n: 12, limiar: 6, veredito: "indeterminado (pendentes)" });
    assert.equal(vereditoDoPortao([ex(5, 6), ex(4), ex(6)], 12).veredito, "passa", "máximo ainda ≤ limiar");
    assert.equal(vereditoDoPortao([ex(7, 8), ex(7), ex(1)], 12).veredito, "nao-passa", "confirmado já > limiar");
  });
  t("número de execuções ≠ 3 recusa", () => {
    assert.throws(() => vereditoDoPortao([ex(1), ex(2)], 12), /3 execuções do sem/);
    assert.throws(() => vereditoDoPortao([ex(1), ex(2), ex(3), ex(4)], 12), /recebeu 4/);
  });
  t("execução que não é do sem, ou análise com mais de uma execução de agente: recusa (o ferramentas e o com não rodam no portão)", () => {
    const run = (id: string, perfil: string) => ({ id, kind: "agente", tool: null, config: { oracleProfile: perfil }, cardIds: [] });
    const pkg = (runs: unknown[]) => ({ cards: [], units: [], runs }) as unknown as SemanticPackage;
    const B = ["sem", "ferramentas", "com"];
    assert.throws(() => contagemDaExecucao(pkg([run("r1", "knowledge-free")]), [], ["F-01"], B, "p01", "f"), /braço ferramentas; no portão de teto só roda o sem/);
    assert.throws(() => contagemDaExecucao(pkg([run("r1", "evaluation")]), [], ["F-01"], B, "p01", "f"), /braço com/);
    assert.throws(() => contagemDaExecucao(pkg([run("r1", "none"), run("r2", "none")]), [], ["F-01"], B, "p01", "f"), /2 execuções de agente/);
    assert.throws(() => contagemDaExecucao(pkg([run("r1", "knowledge-free"), { id: "lb", kind: "linha-de-base", tool: "axe-core", cardIds: [] }]), [], ["F-01"], B, "p01", "f"), /braço ferramentas/,
      "linha de base não conta como execução de agente");
  });
  t("CLI: --passada e --saida obrigatórios; opção desconhecida e argumento solto recusam", () => {
    assert.equal(silencioso(() => executar([])), 1);
    assert.equal(silencioso(() => executar(["--passada", join(tmp, "p")])), 1);
    assert.equal(silencioso(() => executar(["--passada", join(tmp, "p"), "--saida", join(tmp, "x"), "--braco", "sem"])), 1);
    assert.equal(silencioso(() => executar(["solto", "--passada", join(tmp, "p"), "--saida", join(tmp, "x")])), 1);
    assert.equal(silencioso(() => executar(["--passada", tmp, "--saida", join(tmp, "dentro")])), 1);
  });

  console.log("portão de teto: dados arquivados da D (fechada; só leitura)");
  const DD = join(RESULTADOS, "analises", "nat78-tela-d-01"), PD = join(DD, "passada-adjudicada-20261118T1"), ARQ = join(DD, "recalculo-20261126T1", "recalculo.json");
  if (!existsSync(join(PD, "julgamentos.json")) || !existsSync(ARQ)) { pulados++; console.log("  PULADO passada ou recálculo arquivado da D ausente"); }
  else {
    const refD11 = lerJson<Referencia>(join(EVAL, "ground-truth-processos-1.1.0.json"));
    const EXP = refD11._meta.exposto!.specs, NAO = refD11.violations.map(v => v.id).filter(s => !EXP.includes(s));
    // Referência F sintética: semeado = as 9 não expostas da D (categories trocadas para "componente", só para a classe ds).
    const refFD: Referencia = { ...refD11, _meta: { ...refD11._meta, suite: "processos-f", estratos: { semeado: { specs: NAO }, natural: { specs: EXP }, exposto: { specs: [] } }, exposto: { specs: [] } },
      violations: refD11.violations.map(v => (NAO.includes(v.id) ? { ...v, categories: ["componente"] } : v)) };
    const semeadas = semeadasDaReferencia(refFD);
    t("contagem por execução = a coluna sem do primário do recálculo arquivado (mesma regra de crédito, com a origem medida), trio a trio", () => {
      const c = carregarCampanha({ passadas: [PD], origens: [join(DD, "origem-20261118T1")] }, new Entradas());
      const arq = lerJson<{ tabelas: Record<string, TabelaComparacao[]> }>(ARQ).tabelas["principal|1.2.0|primario"].find(x => x.comparacao === "sem-x-com")!;
      // o pacote do trio inteiro (recortar o pacote quebraria a conferência de integridade do scorer); o crédito do sem só
      // depende dos cartões dele, então é o mesmo cálculo que o portão faz no pacote de uma execução
      const contagens = [...c.analises].sort((x, y) => (x.coleta.trio < y.coleta.trio ? -1 : 1)).map(a => {
        const r = contagemDoSem(a.pkg, julgadosDoTrio(a, c.derivadoNa), semeadas, c.bracos, a.nome, "teste");
        return { min: r.confirmadas.length, max: r.maximo.length };
      });
      assert.deepEqual(contagens, arq.porTrio.map(x => x.a));
      assert.equal(contagens.length, 9);
    });
    t("caminho de arquivo: passada → análises → referência → recusa a análise com três execuções de agente (nunca conta um trio)", () => {
      const camp = join(tmp, "d"); mkdirSync(camp);
      symlinkSync(PD, join(camp, "passada-adjudicada-20261118T1"), "junction");
      for (let i = 1; i <= 9; i++) {
        const de = join(DD, `p0${i}`, "analisar-20261118T1"), para = join(camp, `p0${i}`, "analisar-20261118T1");
        for (const f of ["revisao/package.json", "entradas/campanha.json"]) { mkdirSync(dirname(join(para, f)), { recursive: true }); copyFileSync(join(de, f), join(para, f)); }
        writeFileSync(join(para, "entradas", "referencia.json"), JSON.stringify(refFD));
      }
      assert.throws(() => avaliarPortao({ passada: join(camp, "passada-adjudicada-20261118T1") }), /p01\/analisar-20261118T1: 3 execuções de agente/);
    });
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${n - falhas}/${n} testes do portão de teto passaram${pulados ? ` (${pulados} parte(s) pulada(s))` : ""}`);
if (falhas) process.exit(1);
