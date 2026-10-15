/**
 * NAT-84 — CLI da auditoria final de um pacote de execução (scripts/inspection-audit.ts).
 *
 *   npm run auditar:inspecao -- --pacote DIR [--out NOVO_ARQUIVO.json]
 *
 * Lê o pacote pelo mesmo leitor da análise (lerPacote: manifesto, hashes, contratos, payloads conferidos),
 * audita o relatório que o COLETOR gravou e escreve um documento inspection-audit.v1 validado. Sem --out,
 * imprime. Nunca altera o pacote, nunca pontua, nunca exclui.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertContract, type InspectionAudit } from "../contracts/index";
import { lerPacote } from "./analisar-execucao";
import { auditarInspecao } from "./inspection-audit";

export function auditarPacote(dir: string): InspectionAudit {
  const p = lerPacote(dir);
  const audit = auditarInspecao({ campaignId: p.run.campaignId, runId: p.run.runId, fixture: p.run.fixture, findings: p.findings,
    toolEvents: p.toolEvents, payloads: p.toolPayloads, falha: p.run.failure });
  return assertContract<InspectionAudit>(audit, "inspection-audit.v1");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const pacote = opt("--pacote");
  if (!pacote) {
    console.error("Uso: npm run auditar:inspecao -- --pacote DIR [--out NOVO_ARQUIVO.json]");
    process.exitCode = 1;
  } else {
    try {
      const audit = auditarPacote(pacote);
      const out = opt("--out");
      if (out) writeFileSync(resolve(out), JSON.stringify(audit, null, 2) + "\n", { flag: "wx" });
      else console.log(JSON.stringify(audit, null, 2));
      console.error(audit.texto);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    }
  }
}
