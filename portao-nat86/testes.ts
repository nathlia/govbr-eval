/**
 * NAT-86 — testes do portão sem modelo (`npm run test:portao`). Sem modelo; os testes de CLI abrem o
 * navegador só em controles de DESENVOLVIMENTO (gêmeo F1-01-C) e nunca na reserva.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decidir, julgarD1, julgarD2 } from "./oraculo";
import { derivarLocalizador, traduzirReceita, PASTA_PORTAO, RAIZ_EVAL } from "./comum";
import { sha256 } from "../comparadores/comum";

let ok = 0;
const testes: [string, () => void][] = [];
const t = (n: string, f: () => void) => testes.push([n, f]);
const v = (verdict: string) => ({ tipo: "condicao", localizador: "#x", verdict, detalhe: "" });

t("julgarD1: sem alegação é não exercitado, nunca aprovado", () => {
  assert.equal(julgarD1("so-unverifiable", []), "nao-exercitado");
  assert.equal(julgarD1("nao-confirmar", []), "nao-exercitado");
  assert.equal(julgarD1("confirmar", []), "FN");
});
t("julgarD1: FP, FN, desconhecido decidido", () => {
  assert.equal(julgarD1("nao-confirmar", [v("unverifiable"), v("confirmed")]), "FP");
  assert.equal(julgarD1("so-unverifiable", [v("confirmed")]), "FP");
  assert.equal(julgarD1("so-unverifiable", [v("unverifiable"), v("rejected")]), "decidido");
  assert.equal(julgarD1("so-unverifiable", [v("unverifiable")]), "preservado");
  assert.equal(julgarD1("confirmar", [v("rejected"), v("unverifiable")]), "FN");
  assert.equal(julgarD1("confirmar", [v("rejected"), v("confirmed")]), "TP");
  assert.equal(julgarD2("detectar", 0), "FN");
  assert.equal(julgarD2("nao-sinalizar", 1), "FP");
});
const linha = (id: string, esperadoD1: string, julg: string, n = 1, d2: string | null = null) =>
  ({ id, esperadoD1: esperadoD1 as never, d1: { veredictos: Array(n).fill(v("x")), julgamento: julg }, d2: d2 ? { julgamento: d2 } : null });
t("decidir: qualquer falha de aceite vira no-go", () => {
  const base = [linha("a", "confirmar", "TP"), linha("b", "nao-confirmar", "TN"), linha("c", "so-unverifiable", "preservado")];
  assert.equal(decidir(base).resultado, "go");
  assert.equal(decidir([...base, linha("d", "confirmar", "FN")]).resultado, "no-go");
  assert.equal(decidir([...base, linha("d", "so-unverifiable", "decidido")]).resultado, "no-go");
  assert.equal(decidir([...base, linha("d", "nao-confirmar", "TN", 1, "FP")]).resultado, "no-go");
  assert.equal(decidir([...base, linha("d", "confirmar", "TP", 1, "FN")]).resultado, "no-go");
});
t("decidir: classe exigida sem nenhuma linha exercitada vira no-go", () => {
  const r = decidir([linha("a", "confirmar", "TP"), linha("b", "nao-confirmar", "TN"), linha("c", "so-unverifiable", "nao-exercitado", 0)]);
  assert.equal(r.resultado, "no-go");
  assert.deepEqual(r.exercitadas["so-unverifiable"], { exercitadas: 0, total: 1 });
});
t("localizador e receita: regras declaradas", () => {
  assert.equal(derivarLocalizador("input#cartao@apos-enviar"), "#cartao");
  assert.equal(derivarLocalizador("documento"), "html");
  assert.equal(derivarLocalizador("h3 Seus empréstimos"), 'h3:has-text("Seus empréstimos")');
  assert.equal(derivarLocalizador("bib-campo::input"), "bib-campo input");
  assert.equal(derivarLocalizador(".br-breadcrumb li:last-child"), ".br-breadcrumb li:last-child");
  const r = traduzirReceita([{ acao: "focar", alvo: "#a" }, { acao: "capturar", nome: "x" }, { acao: "tecla", tecla: "Enter" }, { acao: "preencher", alvo: "h >>> #c", valor: "1" }]);
  assert.deepEqual(r.acoes, [{ action: "press", selector: "#a", key: "Enter" }, { action: "fill", selector: "h #c", value: "1" }]);
  assert.equal(r.traduzivel, true);
  assert.equal(traduzirReceita([{ acao: "rolarAte", alvo: "#a" }]).traduzivel, false);
});

// ------------------------------------------------------------------ CLI (navegador, só desenvolvimento)
const tmp = mkdtempSync(join(tmpdir(), "portao-nat86-teste-"));
const cli = (args: string[]) => spawnSync(process.execPath, [join(RAIZ_EVAL, "node_modules/tsx/dist/cli.mjs"), join(PASTA_PORTAO, "oraculo.ts"), ...args],
  { cwd: RAIZ_EVAL, encoding: "utf8", timeout: 300_000 });
t("CLI: reserva sem a bandeira do portão é recusada antes de abrir qualquer página", () => {
  const r = cli(["--divisao", "reserva", "--saida", tmp]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /só é medida no portão NAT-86/);
});
t("CLI: reserva com matriz de outro sha256 é recusada", () => {
  const r = cli(["--divisao", "reserva", "--portao-nat86", "--matriz-sha256", "0".repeat(64), "--saida", tmp]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /só roda contra a matriz congelada/);
});
t("CLI: falha de aceite (FN forçado num gêmeo dev) sai com código ≠ 0 e no-go explícito", () => {
  const m = JSON.parse(readFileSync(join(PASTA_PORTAO, "matriz.json"), "utf8")) as { linhas: { gemeo: string; esperadoD1: string; classe: string }[] };
  // a célula conforme do F1-01-C passa a "confirmar": o portão (corretamente) não confirma → FN → no-go
  for (const l of m.linhas) if (l.gemeo === "F1-01-C" && l.esperadoD1 === "nao-confirmar") l.esperadoD1 = "confirmar";
  const arq = join(tmp, "matriz-fn.json");
  writeFileSync(arq, JSON.stringify(m));
  const r = cli(["--matriz", arq, "--gemeos", "F1-01-C", "--saida", tmp, "--carimbo", "fn"]);
  assert.equal(r.status, 3, r.stdout.slice(-600) + r.stderr.slice(-600));
  assert.match(r.stdout, /\*\*NO-GO\*\*/);
  const resumo = JSON.parse(readFileSync(join(tmp, "fn", "desenvolvimento", "resumo.json"), "utf8"));
  assert.equal(resumo.decisao.resultado, "no-go");
  assert.ok(resumo.falhas.aceite.length > 0);
  void sha256;
});

try {
  for (const [n, f] of testes) {
    try { f(); ok++; console.log(`ok   ${n}`); } catch (e) { console.log(`FAIL ${n}\n     ${(e as Error).message.split("\n").slice(0, 6).join("\n     ")}`); process.exitCode = 1; }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${ok}/${testes.length} testes do portão ok`);
