/**
 * Versão do instrumento de medida, separada da versão do gabarito (D-31).
 *
 * Antes do D-31 o scorer derivava a versão do instrumento de `ground-truth-fluxo._meta.version`,
 * de modo que corrigir o gabarito renomeava o instrumento e órfãs todas as execuções arquivadas —
 * embora nada no contrato sob o qual elas foram coletadas tivesse mudado. Duas dimensões num
 * campo só: a décima ocorrência do defeito estrutural que o log acompanha desde o D-13.
 *
 * O contrato mora em `instrument.json`, lido também pelo runner em PowerShell. Fonte única de
 * propósito: derivar a mesma versão em dois lugares foi exatamente o que produziu a conflação.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { ROOT } from "./adjudication";

interface InstrumentFile {
  _meta: Record<string, unknown>;
  fluxo: string;
  scoring: { fluxo: string; legacy: string; legacyCollection: string; note: string };
}

const file = JSON.parse(readFileSync(join(ROOT, "instrument.json"), "utf8")) as InstrumentFile;

/** Contrato de medida da suíte de fluxo, ex.: `fluxo-1.1.0`. Gate de compatibilidade. */
export const FLOW_INSTRUMENT_VERSION = file.fluxo;

/** Scoring semantics can change without pretending an archived collection was rerun. */
export const FLOW_SCORING_VERSION = file.scoring.fluxo;

/** Coleta que o scorer legado de citação sabe pontuar; ela não sobe junto com a coleta vigente. */
export const FLOW_LEGACY_COLLECTION_VERSION = file.scoring.legacyCollection;
