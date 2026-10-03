/**
 * Restauração (T4/M3): recupera uma execução ou linha de base SÓ pelo arquivo (clone do
 * govbr-resultados) e, para execução, pelo anexo de evidências baixado da Release. Confere o sha256 do
 * anexo contra o índice, cada arquivo do pacote contra o artifact-manifest.json, as cópias navegáveis
 * do repositório contra o anexo, o manifesto de coleta, a referência e o plano de estados arquivados.
 * Não lê nada do workspace original.
 *
 *   npx tsx scripts/restaurar-execucao.ts --arquivo CLONE --chave RUN_ID|BASELINE_ID [--anexo ARQ.tar.gz] --saida DIR_NOVO
 *
 * Anexo de uma Release privada: `gh release download <tag> --repo nathlia/govbr-resultados --pattern <anexo>`
 * (tag e nome do anexo estão na entrada do índice). Código 0 = tudo conferido; 1 = algo divergiu.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { restaurar } from "./arquivo-resultados";

function main(): number {
  const args = process.argv.slice(2);
  const val = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const arquivo = val("--arquivo"), chave = val("--chave"), saida = val("--saida");
  if (!arquivo || !chave || !saida) throw new Error("uso: restaurar-execucao.ts --arquivo CLONE --chave ID [--anexo ARQ] --saida DIR_NOVO");
  const r = restaurar(resolve(arquivo), chave, val("--anexo") ? resolve(val("--anexo")!) : null, resolve(saida));
  for (const c of r.conferidos) console.log(`ok   ${c}`);
  for (const p of r.problemas) console.log(`FALHA ${p}`);
  console.log(r.ok ? `restaurado em ${resolve(saida)}` : "restauração com divergências");
  return r.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
