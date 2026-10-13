/** Tipos de inspection-ledger.mjs (regras do registro de inspeção que o schema não expressa). */
export function inspectionLedgerErrors(report: unknown, base?: string): { path: string; keyword: string; message: string }[];
