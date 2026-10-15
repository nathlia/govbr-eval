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
  scoring: {
    fluxo: string;
    legacy: string;
    legacyCollection: string;
    semanticLegacy: string[];
    kbAliases: { vigente: string; legado: string; nota: string };
    note: string;
    provenance: { acceptancePolicy: string; nota: string };
  };
  reference: { file: string; nota: string };
}

const file = JSON.parse(readFileSync(join(ROOT, "instrument.json"), "utf8")) as InstrumentFile;
// Sem valor padrão: uma política ou referência ausente é erro de configuração, não "a de sempre".
if (!file.scoring.provenance?.acceptancePolicy || !file.reference?.file || !file.scoring.kbAliases?.vigente || !file.scoring.kbAliases?.legado) {
  throw new Error("instrument.json precisa declarar scoring.provenance.acceptancePolicy, scoring.kbAliases.{vigente,legado} e reference.file");
}

/** Contrato de medida da suíte de fluxo, ex.: `fluxo-1.1.0`. Gate de compatibilidade. */
export const FLOW_INSTRUMENT_VERSION = file.fluxo;

/** Scoring semantics can change without pretending an archived collection was rerun. */
export const FLOW_SCORING_VERSION = file.scoring.fluxo;

/**
 * Versões ANTERIORES da pontuação semântica cujos pacotes e decisões continuam pontuáveis pelo
 * caminho delas (NAT-72): o resultado reproduz o arquivado byte a byte, e nada do contrato novo
 * (vínculo de revisão) se aplica retroativamente a elas.
 */
export const FLOW_SCORING_LEGACY_VERSIONS: readonly string[] = Object.freeze([...(file.scoring.semanticLegacy ?? [])]);

/** Coleta que o scorer legado de citação sabe pontuar; ela não sobe junto com a coleta vigente. */
export const FLOW_LEGACY_COLLECTION_VERSION = file.scoring.legacyCollection;

/**
 * Política de aceitação semântica (fatia 6). Versionada à parte do engine: o engine pode ser o
 * mesmo código e ainda assim creditar coisas diferentes se a política de aceitação mudar.
 */
export const FLOW_ACCEPTANCE_POLICY_VERSION = file.scoring.provenance.acceptancePolicy;

/** Arquivo do gabarito vigente. A VERSÃO mora nele (`_meta.version`), nunca aqui (D-31). */
export const FLOW_REFERENCE_FILE = file.reference.file;

/**
 * Arquivo de aliases da KB por versão de pontuação (kb-aliases-2.0.0). A versão vigente
 * (`FLOW_SCORING_VERSION`) usa `vigente`; toda outra versão — semântica legada e a pontuação por
 * citação (`scoring.legacy`) — usa o arquivo congelado `legado`, com que as campanhas arquivadas
 * foram preparadas e pontuadas.
 */
export const FLOW_KB_ALIASES_FILE = file.scoring.kbAliases.vigente;
export const LEGACY_KB_ALIASES_FILE = file.scoring.kbAliases.legado;
export function kbAliasesFileFor(scoringVersion: string): string {
  return scoringVersion === FLOW_SCORING_VERSION ? FLOW_KB_ALIASES_FILE : LEGACY_KB_ALIASES_FILE;
}
