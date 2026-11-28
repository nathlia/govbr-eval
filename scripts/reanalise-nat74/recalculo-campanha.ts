/**
 * Revisão §8, passo 5 (+ §6.3), para campanha v2 NOVA (protocolo NAT-78; plano de revisão 19/10, entrega 4): a partir das
 * respostas CONGELADAS (1ª passada ou passada adjudicada), D por trio e por campanha para cada comparação do desenho
 * (primária `ferramentas × com` = D_fc; secundárias `sem × com` = D_sc e `sem × ferramentas` = D_sf), sob a política
 * 1.2.0 (principal) e a 1.1.0 (ao lado), mais o S4' (crédito só de LLM contestado e não ratificado tirado dos dois braços)
 * e o sinal residual de braço por braço (`residuo-de-braco.json`, entrega 2) ao lado dele.
 *
 *   npm run revisao:recalculo -- --passada PASSADA [--passada OUTRA ...] --saida PASTA_NOVA
 *       [--analise DIR ...] [--coleta coleta-trio.json ...] [--residuo-passada PASSADA_COM_RESIDUO]
 *       [--ratificacoes ratificacoes.json] [--origem PASTA_DA_ORIGEM ...]
 *     → PASTA_NOVA/{recalculo.json, recalculo.json.sha256, tabela.md}
 *
 * `--ratificacoes` (S4'): ou a lista `nat78-ratificacoes-autora-1.0.0` ({ ratificados: [{ id, chave }] }), ou — entrega 6 — as
 * respostas cegas da autora `nat78-respostas-autora-1.0.0` gravadas por `material-autora.ts responder` (+ `.sha256`): o
 * material é conferido pelo sha256 (manifesto, chave), o desfecho da passada é recalculado aqui pela mesma política e tem de
 * ser o que o material mostrou, e ratifica o cartão cujo desfecho das respostas dela é igual ao da passada. Crédito
 * ratificado não sai no S4'; desacordo não sobrescreve nada.
 *
 * `--origem` (entrega 5, D-129): origem medida (`npm run revisao:origem -- medir`) de uma passada, conferida pelo sha256 e
 * pelo sha256 dos julgamentos. A classe de cada violação sai da MESMA derivação da ingestão com a origem medida
 * (`aplicarOrigem`): `violacao-origem-indeterminada` vira página/DS/indeterminada medida, e origem DS tira o crédito do
 * vínculo (P3/R5 da política 1.2.0: a referência só tem unidades de origem página). Sem `--origem`, nada muda (saída
 * byte a byte igual à de antes desta opção).
 *
 * Crédito por unidade: cada cartão julgado vira uma decisão do scorer (um átomo, todos os sujeitos; o vínculo do juiz diz a
 * spec e as unidades saem da ancoragem estrita, com vínculo de revisão pela árvore medida onde ela não chega — a mesma
 * regra do E8 retrospectivo, montar.ts) e o `scoreSemanticPackage` do pacote (flow-semantic-1.8.2: domínio em todos os
 * caminhos de crédito) decide quais unidades cada execução confirma (casamento máximo: um sujeito credita no máximo uma
 * unidade). Decisão que o scorer recusa fica pendente e listada, nunca forçada.
 *
 * Desfecho por tela (protocolo §5.1 + D-102: desfecho por spec, não por instância; fixo aqui): tela D (`processos`,
 * referência 1.0.0 ou 1.1.0) por SPEC, primário = as specs não expostas (`_meta.exposto`), sensibilidade = todas e as unidades
 * das não expostas (por unidade); tela A
 * (`solicitacao`, 2.0.0) por SPEC, primário = as specs sorteadas A-*, sensibilidade = as unidades A-* (por instância),
 * camada de página P-* à parte (nunca somada); tela E (`cadastro-pais`, 1.0.0; NAT-78 §5.1 coprimário) por SPEC, primário =
 * as specs do DS semeadas não expostas, sensibilidade = todas as specs, as unidades do primário e "com U-09" (a spec retirada
 * no denominador, crédito zero nos três braços); e, só na coluna fundamentada (descritiva, sem teste), "sem ids expostos"
 * (`fundamentadaDoTrio`: crédito fundamentado só por id exposto da spec sai, pela citação gravada no próprio achado; mesma
 * passada, nenhum juiz de novo); tela F (`processos-f`, 1.0.0; estudo de seguimento, adendo de 26/11) por SPEC, primário = o
 * estrato semeado (defeitos do DS injetados, todos da classe ds, nenhum exposto), sensibilidade = todas (semeadas + naturais
 * não expostas), as unidades do primário e, como na D, com as expostas; tela F2 (`processos-f2`, 1.0.0; segundo seguimento,
 * adendo 2 de 26/11) pela mesma regra da F, com as tabelas descritivas por tipo de defeito e por nível lidas do arquivo de
 * estratos declarado em `telas.json › processos-f2.estratos`; tela F3 (`processos-f3`, 1.0.0; terceiro seguimento, adendo 3
 * de 27/11) pela mesma regra da F2, com o arquivo de estratos no formato da F3 (mais origem e controle da varredura por spec),
 * a tabela descritiva por origem e a sensibilidade pré-declarada sem os controles da varredura (as três comparações, pelo
 * mesmo método do primário, nas semeadas que não são controle). δ = 2 specs. Outra tela: recusa.
 *
 * `--por-protocolo` (NAT-78 §4.5): sensibilidade por protocolo AO LADO do primário. O estado do oráculo de cada slot vem da
 * `summary.json` da análise (`mcpIsolamento.usoOraculo` = `run.status.oracleUsage`); o slot conta quando o estado é o que o
 * braço exige (`ESTADO_POR_PROTOCOLO`, e14-deteccao.ts: `sem` → `absent-verified`; `ferramentas`/`com` → `used-adherent`).
 * Trio com slot fora sai da comparação pareada pela regra `TRIO_COM_SLOT_FORA` e é listado; `used-with-errors` é mostrado à
 * parte com a contagem do slot. Tudo numa chave própria (`sensibilidadePorProtocolo`, tabelas `sensibilidade-por-protocolo|…`,
 * semente própria), nunca em `tabelas`. Sem a opção, nada muda (saída byte a byte igual; a `summary.json` nem é lida).
 *
 * O caminho T7 (`pipeline.ts`, `montar.ts`) não muda: daqui só se importam funções puras dele. Determinístico: sem
 * carimbo de tempo, sem rede, sem modelo. Toda entrada lida entra com sha256 no manifesto da saída, senão nada é gravado.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  analisePareada, type AnalisePareada,
} from "../estatistica-pareada";
import {
  cartaoDoVinculo, scoreSemanticPackage, tocaParticipante, VINCULO_CONTRATO,
  type ReviewAtom, type ReviewLink, type SemanticDecision, type SemanticPackage, type SemanticReviews,
} from "../semantic-flow";
import {
  FORMATO_CHAVE_AUTORA, FORMATO_RESPOSTAS_AUTORA, desfechoDaAutora, desfechoDaPassada, ratifica, type ChaveAutora, type DocRespostasAutora,
} from "./autora-respostas";
import { EVAL, POLITICA_SENSIBILIDADE, TCC, jsonTexto, ordenar, posix, rotuloPolitica, sha, type VersaoPolitica } from "./comum";
import type { OracleUsage } from "../../contracts";
import { bracoDoRun, referenciasDoAchado } from "./e14-campanha";
import { IDS_REFERENCIA, type Derivado, type Resposta } from "./e14-comum";
import {
  AVISO_POR_PROTOCOLO, FORMATO_POR_PROTOCOLO, LEITURA_POR_PROTOCOLO, TIPO_POR_PROTOCOLO, classeDaSpec, definicaoPorProtocolo, estadosDoOraculo, exclusoesMd,
  exclusoesPorBraco, situacaoPorProtocolo, specFundamentada, type ExclusaoDoBraco, type ExecucaoDoResumo, type PorProtocolo, type SituacaoProtocolo,
} from "./e14-deteccao";
import { normalizarRegra } from "./politica";
import { relacaoMedida, relacaoNoDominioMedido } from "./montar";
import { aplicarOrigem, lerOrigem, type AplicacaoOrigem } from "./origem-campanha";
import { gravarImutavel, lerArgs, lerPassada, pastaDaAnalise, type Passada } from "./revisao-campanha";

export const RECALCULO_VERSAO = "nat78-recalculo-campanha-1.0.0";
export const FORMATO_RECALCULO = "nat78-recalculo-1.0.0";
export const FORMATO_RATIFICACOES = "nat78-ratificacoes-autora-1.0.0";
export const DELTA = 2;
export type Politica = "1.2.0" | "1.1.0";
export const POLITICAS: readonly Politica[] = ["1.2.0", "1.1.0"];
export type Variante = "principal" | "S4'";

type Card = SemanticPackage["cards"][number];
type Unit = SemanticPackage["units"][number];
type Subject = Card["subjects"][number];
const lerTexto = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");
const r4 = (x: number | null) => (x === null ? null : Math.round(x * 10000) / 10000);

// ───────────────────────────────────────────────────────────────── desfecho por tela (§5.1)

/**
 * Conjunto de desfecho: o `primario` (sempre por spec, D-102) e os de sensibilidade / à parte. `semCredito` (só a tela E,
 * variante "com U-09"): specs que entram no denominador (`specs`) mas nunca são contadas como confirmadas, em braço nenhum.
 */
export interface Conjunto { id: string; rotulo: string; specs: string[]; modo: "spec" | "unidade"; tipo: "primario" | "sensibilidade" | "a-parte"; semCredito?: string[] }
/**
 * Sensibilidade da coluna fundamentada (só a tela E, variante "sem ids expostos" da referência): `expostos` = por spec que
 * muda, os ids que a variante retira de `rules` (forma canônica, `idCanonico`). Rederivada da MESMA passada: um cartão
 * fundamentado (`specFundamentada`) cuja norma que deu a classe — a regra que o achado cita, ou a referência secundária
 * do achado que deu a classe (`citacaoPor`) — é um id exposto da spec creditada sai da coluna fundamentada nesta
 * variante ("fundamentada por norma exposta"); a detecção (e todo D das `tabelas`) não muda.
 */
export interface SensibilidadeFundamentada { id: string; rotulo: string; coluna: "fundamentada"; tipo: "sensibilidade"; expostos: Record<string, string[]> }
export interface RegraDesfecho { tela: string; referencia: string; unidadeDelta: "specs"; conjuntos: Conjunto[]; fundamentada?: SensibilidadeFundamentada[] }
export const conjuntoDe = (r: RegraDesfecho, id: string): Conjunto => { const c = r.conjuntos.find(x => x.id === id); if (!c) throw new Error(`conjunto ${id} fora da regra da tela ${r.tela}`); return c; };

export interface Referencia {
  _meta: { version: string; suite?: string; exposto?: { specs: string[] };
    /**
     * Tela E (cadastro-pais): estratos da página construída (semeadas por classe selada; expostas). Tela F (processos-f):
     * `semeado` (os defeitos do DS injetados, o primário), `natural` (os da rota, da referência da D reconferidos na cópia) e
     * `exposto` (os do casco, dentro do natural).
     */
    estratos?: { semeada?: { DS?: string[]; G?: string[] }; semeado?: { specs?: string[] }; natural?: { specs?: string[] }; exposto?: { specs: string[] } };
    /**
     * Tela E: variantes de sensibilidade declaradas antes da coleta; a "com U-09" traz a spec retirada pelo desvio; a "sem
     * ids expostos", o `rules` de cada spec que muda (os ids expostos retirados).
     */
    sensibilidades?: { comU09?: { spec?: { id: string } }; semIdsExpostos?: { rules?: Record<string, string[]> } };
    /** Tela E: por spec, os ids de `rules` não expostos e os expostos (conferidos contra a variante "sem ids expostos"). */
    fundamentacao?: { porSpec?: Record<string, { expostos?: { id: string }[] }> } };
  /**
   * `nivel` (tela F, F2): o nível de dificuldade da spec semeada, se a referência o repete; tem de ser o do arquivo de níveis
   * (F) ou de estratos (F2). `tipo` (tela F2): o tipo de defeito, se a referência o repete; tem de ser o do arquivo de estratos.
   * `origem` e `controleDaVarredura` (tela F3): idem, se a referência os repete.
   */
  violations: { id: string; expectedCount?: number; categories?: string[]; rules?: string[]; nivel?: string; tipo?: string; origem?: string; controleDaVarredura?: boolean }[];
}

/**
 * Id de norma na forma canônica para comparar a citação do achado com os ids da referência: a mesma normalização que a
 * passada cega aplica antes de resolver a norma (`normalizarRegra`, `emag-N.N` → `emag:N.N`, `ds:govbr-…` → `govbr-…`;
 * e14-fila.ts › normasDaCampanha). Id de verificação (`ds:page-*`, alias de várias regras) fica como está: não é o id
 * literal de nenhuma regra da referência; a passada o resolve pelo `checker-aliases.json` e pela base do validador da
 * campanha, que o recálculo não lê (ver `ehIdDeVerificacao` e `porAlias`).
 */
export const idCanonico = (bruto: string): string => normalizarRegra(bruto).replace(/^emag-(\d+\.\d+)$/, "emag:$1").replace(/^ds:(?=govbr-)/, "");
/**
 * Id canônico que a passada resolve pelo caminho das verificações (`ds:<verificação>`, ex. `ds:page-footer`: um id que vale
 * por várias regras; e14-fila.ts › normasDaCampanha, `checker-aliases.json` + base do validador). As regras que ele traz
 * dependem dessas duas entradas, que não estão na análise nem na passada: o recálculo não as adivinha (nenhum segundo
 * mapeamento) e lista o cartão em `porAlias`.
 */
export const ehIdDeVerificacao = (canon: string): boolean => /^ds:/.test(canon);

/**
 * [tela E] A variante "sem ids expostos" como sensibilidade da coluna fundamentada: por spec que ela muda, os ids retirados
 * de `rules` (principal − variante). Para se a variante cita spec fora da referência, traz id que a principal não tem, não
 * retira nada, ou se os retirados não são os expostos que `_meta.fundamentacao.porSpec` declara.
 */
export function sensibilidadeSemIdsExpostos(ref: Referencia): SensibilidadeFundamentada {
  const v = ref._meta.sensibilidades?.semIdsExpostos?.rules;
  if (!v || typeof v !== "object" || !Object.keys(v).length) throw new Error(`referência ${ref._meta.suite ?? "?"} ${ref._meta.version} sem _meta.sensibilidades.semIdsExpostos.rules`);
  const expostos: Record<string, string[]> = {};
  for (const s of Object.keys(v).sort()) {
    const spec = ref.violations.find(x => x.id === s);
    if (!spec) throw new Error(`variante sem ids expostos: spec ${s} fora da referência`);
    const principal = spec.rules ?? [], variante = v[s];
    const alheios = variante.filter(r => !principal.includes(r));
    if (alheios.length) throw new Error(`variante sem ids expostos: ${s} traz ids que a principal não tem em rules (${alheios.length})`);
    const ret = [...new Set(principal.filter(r => !variante.includes(r)).map(idCanonico))].sort();
    if (!ret.length) throw new Error(`variante sem ids expostos: ${s} não retira id nenhum de rules`);
    const decl = ref._meta.fundamentacao?.porSpec?.[s]?.expostos;
    if (decl && JSON.stringify([...new Set(decl.map(e => idCanonico(e.id)))].sort()) !== JSON.stringify(ret))
      throw new Error(`variante sem ids expostos: os ids retirados de ${s} não são os expostos de _meta.fundamentacao.porSpec.${s}`);
    expostos[s] = ret;
  }
  const n = Object.keys(expostos).length;
  return { id: "sem-ids-expostos", coluna: "fundamentada", tipo: "sensibilidade", expostos,
    rotulo: `sem ids expostos (${n} spec(s) mudam; só a coluna fundamentada: crédito fundamentado só por id exposto da spec sai da coluna; a detecção não muda; sensibilidade)` };
}

/** Regra fixa do protocolo §5.1 para as duas telas da coleta; qualquer outra tela (ou versão de referência) é recusada. */
export function regraDaTela(tela: string, ref: Referencia): RegraDesfecho {
  const ids = ref.violations.map(v => v.id);
  // processos 1.1.0 (D-196, N5): só os ids de norma migram para a base literal; specs, unidades e `_meta.exposto` iguais aos da
  // 1.0.0, então a regra é a mesma. Unidades das não expostas como sensibilidade (§5.1, "a mesma comparação contada por unidade").
  if (tela === "processos" && (ref._meta.version === "1.0.0" || ref._meta.version === "1.1.0")) {
    const exp = ref._meta.exposto?.specs ?? [];
    if (!exp.length) throw new Error(`referência processos ${ref._meta.version} sem _meta.exposto.specs`);
    const nao = ref.violations.filter(v => !exp.includes(v.id));
    const nu = nao.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
    return { tela, referencia: ref._meta.version, unidadeDelta: "specs", conjuntos: [
      { id: "primario", rotulo: `specs não expostas (${ids.length - exp.length})`, specs: nao.map(v => v.id), modo: "spec", tipo: "primario" },
      { id: "com-expostas", rotulo: `com as expostas (${ids.length} specs; sensibilidade)`, specs: ids, modo: "spec", tipo: "sensibilidade" },
      { id: "unidades", rotulo: `unidades das specs não expostas (${nu}; por unidade, sensibilidade)`, specs: nao.map(v => v.id), modo: "unidade", tipo: "sensibilidade" }] };
  }
  if (tela === "solicitacao" && ref._meta.version === "2.0.0") {
    const a = ref.violations.filter(v => v.id.startsWith("A-")), pp = ref.violations.filter(v => v.id.startsWith("P-"));
    const nu = (vs: typeof a) => vs.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
    return { tela, referencia: ref._meta.version, unidadeDelta: "specs", conjuntos: [
      { id: "primario", rotulo: `specs sorteadas A-* (${a.length})`, specs: a.map(v => v.id), modo: "spec", tipo: "primario" },
      { id: "unidades", rotulo: `unidades sorteadas A-* (${nu(a)}; por instância, sensibilidade)`, specs: a.map(v => v.id), modo: "unidade", tipo: "sensibilidade" },
      { id: "pagina", rotulo: `camada de página P-* (${pp.length} specs; à parte, nunca somada)`, specs: pp.map(v => v.id), modo: "spec", tipo: "a-parte" }] };
  }
  // cadastro-pais 1.0.0 (tela E, NAT-78 §5.1 coprimário, §3.8): primário = specs do DS semeadas que pegaram e entraram na
  // referência congelada, não expostas, por spec. Classe DS pela regra da D-156 3.i (`classeDaSpec`, a mesma do arquivo de
  // classes da E), conferida contra o estrato semeado DS que a própria referência declara: divergência recusa. Sensibilidades
  // (§5.1): todas as specs da E; a mesma comparação por unidade. Variante "com U-09" (§3.8, limitação 3; decisão do assistente
  // de 16/11): a spec retirada da principal entra no denominador com crédito zero nos três braços (`semCredito`), então o D é
  // o de "todas" e só a proporção muda. Variante "sem ids expostos" (pré-registrada: "só muda a coluna fundamentada"): em
  // `fundamentada`, rederivada da mesma passada pela citação do próprio achado (sem segunda passada de juiz).
  if (tela === "cadastro-pais" && ref._meta.version === "1.0.0") {
    const est = ref._meta.estratos;
    const exp = est?.exposto?.specs, semeadasDs = est?.semeada?.DS;
    if (!exp) throw new Error("referência cadastro-pais 1.0.0 sem _meta.estratos.exposto.specs");
    if (!semeadasDs?.length) throw new Error("referência cadastro-pais 1.0.0 sem _meta.estratos.semeada.DS");
    const ds = ref.violations.filter(v => classeDaSpec(v.categories ?? []) === "ds").map(v => v.id);
    const iguais = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    if (!iguais(ds, semeadasDs)) throw new Error(`cadastro-pais 1.0.0: classe ds pela categories (${[...ds].sort().join(", ")}) ≠ estrato semeado DS da referência (${[...semeadasDs].sort().join(", ")})`);
    for (const s of exp) if (!ids.includes(s)) throw new Error(`cadastro-pais 1.0.0: spec exposta ${s} fora da referência`);
    const prim = ref.violations.filter(v => ds.includes(v.id) && !exp.includes(v.id));
    if (!prim.length) throw new Error("cadastro-pais 1.0.0: primário vazio");
    const u09 = ref._meta.sensibilidades?.comU09?.spec?.id;
    if (!u09) throw new Error("referência cadastro-pais 1.0.0 sem _meta.sensibilidades.comU09.spec.id");
    if (ids.includes(u09)) throw new Error(`cadastro-pais 1.0.0: a spec da variante com U-09 (${u09}) já está na referência principal`);
    const nu = prim.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
    // Variante "sem ids expostos" (§5.1, analise-preregistrada › sensibilidades): só a coluna fundamentada, rederivada da
    // mesma passada pela citação do próprio achado (`fundamentadaDoTrio`); nenhum conjunto de detecção novo.
    const semIds = sensibilidadeSemIdsExpostos(ref);
    return { tela, referencia: ref._meta.version, unidadeDelta: "specs", conjuntos: [
      { id: "primario", rotulo: `specs do DS semeadas, não expostas (${prim.length})`, specs: prim.map(v => v.id), modo: "spec", tipo: "primario" },
      { id: "todas", rotulo: `todas as specs da E (${ids.length}; sensibilidade)`, specs: ids, modo: "spec", tipo: "sensibilidade" },
      { id: "unidades", rotulo: `unidades das specs do primário (${nu}; por unidade, sensibilidade)`, specs: prim.map(v => v.id), modo: "unidade", tipo: "sensibilidade" },
      { id: "com-u09", rotulo: `com a ${u09} (${ids.length + 1} specs; a ${u09} no denominador com crédito zero nos três braços; sensibilidade)`, specs: [...ids, u09], modo: "spec", tipo: "sensibilidade", semCredito: [u09] }],
      fundamentada: [semIds] };
  }
  // processos-f 1.0.0 (tela F, estudo de seguimento; adendo de 26/11 §2, §4 "Referência da F", §9): primário = o estrato
  // semeado (os defeitos do DS injetados), por spec (D-102). Toda spec semeada tem de ser da classe ds pela D-156 3.i
  // (`classeDaSpec`) e nenhuma pode ser exposta; o estrato semeado e o natural repartem a referência (nada fora, nada nos
  // dois); as expostas (casco) ficam dentro do natural e, se a referência também traz `_meta.exposto.specs` (a forma da D, que
  // o e14-deteccao --sem-expostas lê), as duas listas são iguais. Sensibilidades (adendo §2): "todas" = semeadas + naturais
  // não expostas; a mesma comparação do primário por unidade; e, como na D, "com as expostas" (todas as specs), só quando
  // há exposta. A coluna fundamentada é a de sempre (sem sensibilidade própria, como na D).
  //
  // processos-f2 1.0.0 (tela F2, segundo seguimento; adendo 2 de 26/11 §6, §7): a MESMA regra da F (primário = estrato
  // semeado, mesmas sensibilidades e recusas). O que muda fica fora da regra: as tabelas descritivas por tipo e por nível
  // saem do arquivo de estratos (`telas.json › processos-f2.estratos`, `lerEstratos`), não do arquivo de níveis.
  //
  // processos-f3 1.0.0 (tela F3, terceiro seguimento; adendo 3 de 27/11 §6, §7): a MESMA regra da F2. O que muda fica de
  // novo fora da regra, no arquivo de estratos (formato `tela-f3-estratos-1.0.0`: mais `origem` e `controleDaVarredura`
  // por spec semeada), com as saídas `porOrigem` e `semControles` (a sensibilidade pré-declarada sem os controles).
  if ((tela === "processos-f" || tela === "processos-f2" || tela === "processos-f3") && ref._meta.version === "1.0.0") {
    const est = ref._meta.estratos;
    const sem = est?.semeado?.specs, nat = est?.natural?.specs, exp = est?.exposto?.specs;
    const rot = `${tela} ${ref._meta.version}`;
    if (!Array.isArray(sem) || !sem.length) throw new Error(`referência ${rot} sem _meta.estratos.semeado.specs (estrato semeado vazio)`);
    if (!Array.isArray(nat)) throw new Error(`referência ${rot} sem _meta.estratos.natural.specs`);
    if (!Array.isArray(exp)) throw new Error(`referência ${rot} sem _meta.estratos.exposto.specs`);
    for (const [nome, xs] of [["semeado", sem], ["natural", nat], ["exposto", exp]] as const) {
      if (new Set(xs).size !== xs.length) throw new Error(`${rot}: spec repetida no estrato ${nome}`);
      for (const s of xs) if (!ids.includes(s)) throw new Error(`${rot}: spec ${s} do estrato ${nome} fora da referência`);
    }
    const nosDois = sem.filter(s => nat.includes(s));
    if (nosDois.length) throw new Error(`${rot}: spec(s) nos estratos semeado e natural ao mesmo tempo (${nosDois.join(", ")})`);
    const semEstrato = ids.filter(s => !sem.includes(s) && !nat.includes(s));
    if (semEstrato.length) throw new Error(`${rot}: spec(s) fora dos estratos semeado e natural (${semEstrato.join(", ")})`);
    const semeadaExposta = sem.filter(s => exp.includes(s));
    if (semeadaExposta.length) throw new Error(`${rot}: spec semeada marcada como exposta (${semeadaExposta.join(", ")}): o primário não tem exposta`);
    const naoDs = ref.violations.filter(v => sem.includes(v.id) && classeDaSpec(v.categories ?? []) !== "ds").map(v => v.id);
    if (naoDs.length) throw new Error(`${rot}: spec(s) semeada(s) fora da classe ds pela categories (D-156 3.i): ${naoDs.join(", ")}`);
    const iguais = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    const expD = ref._meta.exposto?.specs;
    if (expD !== undefined && !iguais(expD, exp)) throw new Error(`${rot}: _meta.exposto.specs ≠ _meta.estratos.exposto.specs`);
    const prim = ref.violations.filter(v => sem.includes(v.id));
    const todas = ref.violations.filter(v => sem.includes(v.id) || !exp.includes(v.id));
    const nu = prim.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
    return { tela, referencia: ref._meta.version, unidadeDelta: "specs", conjuntos: [
      { id: "primario", rotulo: `specs do DS semeadas (${prim.length})`, specs: prim.map(v => v.id), modo: "spec", tipo: "primario" },
      { id: "todas", rotulo: `todas: as semeadas e as naturais não expostas (${todas.length}; sensibilidade)`, specs: todas.map(v => v.id), modo: "spec", tipo: "sensibilidade" },
      { id: "unidades", rotulo: `unidades das specs semeadas (${nu}; por unidade, sensibilidade)`, specs: prim.map(v => v.id), modo: "unidade", tipo: "sensibilidade" },
      ...(exp.length ? [{ id: "com-expostas", rotulo: `com as expostas (${ids.length} specs; sensibilidade)`, specs: ids, modo: "spec" as const, tipo: "sensibilidade" as const }] : [])] };
  }
  throw new Error(`tela ${tela} (referência ${ref._meta.version}) sem regra de desfecho pré-registrada (só processos 1.0.0/1.1.0, solicitacao 2.0.0, cadastro-pais 1.0.0, processos-f 1.0.0, processos-f2 1.0.0 e processos-f3 1.0.0)`);
}

/** Conta o conjunto de unidades confirmadas no modo da tela, restrito às specs do conjunto. */
export function contar(regra: RegraDesfecho, conjunto: string, specDe: (u: string) => string | undefined): (us: Iterable<string>) => number {
  const c = conjuntoDe(regra, conjunto), specs = new Set(c.specs.filter(s => !c.semCredito?.includes(s)));
  return us => {
    const xs = [...new Set(us)].filter(u => { const s = specDe(u); return !!s && specs.has(s); });
    return c.modo === "spec" ? new Set(xs.map(specDe)).size : xs.length;
  };
}

// ───────────────────────────────────────────────────────────────── crédito do cartão por política

export type VereditoCartao = ReviewAtom["verdict"] | "pendente";
/**
 * Veredito contábil de um cartão julgado sob a política. 1.2.0 = o `derivado` da ingestão (crédito quando há
 * fundamentação e spec numa violação de origem página/indeterminada). 1.1.0 (S1 da retrospectiva, politica.ts): sem o
 * crédito da R15 (fundamentação `mais-fraca` → erro normativo, falso) nem o da Q1 a (`nenhuma` → observação, nova);
 * observação com norma errada já não credita. `removido` (S4'): o crédito sai (fica sem resolver, nunca falso).
 */
export function vereditoNaPolitica(d: Pick<Derivado, "classe" | "spec" | "fundamentacao">, politica: Politica, removido = false): { veredito: VereditoCartao; spec: string | null; motivo: string } {
  if (d.classe === "pendente") return { veredito: "pendente", spec: null, motivo: "pendente na passada" };
  const credita = d.fundamentacao !== null && !!d.spec && (d.classe === "violacao-pagina" || d.classe === "violacao-origem-indeterminada");
  if (credita) {
    if (removido) return { veredito: "unresolved", spec: null, motivo: `S4': crédito de ${d.spec} só de LLM, contestado e não ratificado: retirado` };
    if (politica === "1.1.0" && d.fundamentacao === "mais-fraca") return { veredito: "false", spec: null, motivo: "1.1.0: sem o crédito da R15 (R13)" };
    if (politica === "1.1.0" && d.fundamentacao === "nenhuma") return { veredito: "novel", spec: null, motivo: "1.1.0: sem o crédito da Q1 a (R11b)" };
    return { veredito: "reference", spec: d.spec, motivo: `credita ${d.spec} (fundamentação ${d.fundamentacao}, política ${politica})` };
  }
  switch (d.classe) {
    case "erro-factual": case "erro-normativo": return { veredito: "false", spec: null, motivo: d.classe };
    case "evidencia-indisponivel": return { veredito: "unresolved", spec: null, motivo: d.classe };
    default: return { veredito: "novel", spec: null, motivo: `${d.classe} sem crédito` };
  }
}

// ───────────────────────────────────────────────────────────────── decisões do scorer (mesma regra do E8, montar.ts)

/** Réplica da ancoragem estrita do scorer (só para escolher a unidade; quem decide é o scorer). Igual a montar.ts. */
function ancorado(s: Subject, card: Card, u: Unit): boolean {
  const scene = s.scene ?? card.scene;
  const related = s.scene ? card.segmentos?.find(o => o.scene === s.scene)?.relatedKeys ?? [] : card.relatedKeys;
  return s.key !== null && scene === u.scene && (u.participants.some(p => tocaParticipante(s.key!, p)) || u.participants.some(p => related.some(k => tocaParticipante(k, p))));
}
const prefixoComum = (a: string, b: string): number => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

/**
 * Unidades da spec para os sujeitos do cartão: ancoragem estrita; sujeito que ela não alcança ganha vínculo de revisão
 * pela árvore medida (na cena do sujeito; fora dela, só pelo domínio provado). Mesma regra do E8 (montar.ts), copiada
 * para não tocar o caminho T7.
 */
export function unidadesDaSpec(card: Card, units: Unit[], spec: string, sujeitos: Subject[], motivo: string, reviewer: string, fontes: string[]):
  { unitIds: string[]; links: ReviewLink[] } | { falhou: string } {
  const daSpec = units.filter(u => u.specId === spec);
  const anc = [...new Set(sujeitos.flatMap(s => daSpec.filter(u => ancorado(s, card, u)).map(u => u.id)))].sort();
  const links: ReviewLink[] = [];
  for (const s of sujeitos) {
    if (anc.some(id => ancorado(s, card, units.find(u => u.id === id)!))) continue;
    if (s.key === null) return { falhou: `sujeito sem chave medida: ${s.id}` };
    const cena = s.scene ?? card.scene;
    const naCena = daSpec.filter(u => u.scene === cena);
    const prefer = naCena.filter(u => anc.includes(u.id));
    const noDominio = naCena.length ? [] : daSpec.filter(u => u.domain?.some(e => e.scene === cena));
    if (noDominio.length > 1) return { falhou: `${noDominio.length} unidades da ${spec} com a cena ${cena} no domínio provado: ambíguo` };
    const pool = prefer.length ? prefer : naCena.length ? naCena : noDominio;
    if (!pool.length) return { falhou: `nenhuma unidade da ${spec} na cena ${cena} nem com ela no domínio provado` };
    const u = [...pool].sort((x, y) => {
      const px = Math.max(...x.participants.map(q => prefixoComum(q, s.key!)), 0), py = Math.max(...y.participants.map(q => prefixoComum(q, s.key!)), 0);
      return py - px || (x.id < y.id ? -1 : 1);
    })[0];
    const entrada = u.scene === cena ? null : u.domain!.find(e => e.scene === cena)!;
    const r = entrada ? relacaoNoDominioMedido(s.key, entrada) : relacaoMedida(s.key, u);
    links.push({ contrato: VINCULO_CONTRATO, unitId: u.id, subjects: [s.id], scene: cena, state: u.state, relation: r.relacao,
      evidence: [`chave medida do sujeito: ${s.key}`, `participante da unidade ${u.specId}${entrada ? ` medido em ${cena}` : ""}: ${r.participante}`,
        ...(entrada ? entrada.evidence.map(e => `${e.source} sha256:${e.sha256}`) : []), ...fontes.slice(0, 2)],
      justification: `${motivo} (P8: relação ${r.relacao} pela árvore medida${entrada ? `; domínio provado ${entrada.kind}: ${entrada.predicate} em ${cena}` : ""})`, reviewer,
      binding: { build: card.binding.build, runScope: card.binding.runScope, card: cartaoDoVinculo(card) } });
  }
  return { unitIds: [...new Set([...anc, ...links.map(l => l.unitId)])].sort(), links };
}

export interface CartaoJulgado { id: string; cardId: string; braco: string; runId: string; derivado: Derivado; resposta: Resposta }

/**
 * [D-156] Proveniência de um crédito resgatado pela referência secundária, em texto (vai ao `rationale` da decisão do
 * scorer): a referência usada (id, regra pública, força/aplicabilidade/violação julgadas dela) separada da regra citada que
 * caiu (e o julgamento dela). Vazio quando a primária deu a classe.
 */
export function proveniencia(d: Derivado): string {
  const c = d.citacao;
  if (!c) return d.citacaoPor ? ` · citação pela referência secundária ${d.citacaoPor} (sem proveniência gravada)` : "";
  const r = c.referencia, p = c.primaria;
  return ` · citação pela referência secundária ${r.id} (regra ${r.regra ?? "?"}: força ${r.forca}, ${r.aplicabilidade}, violada ${r.violada}); a regra citada ${c.regraCitada ?? "(nenhuma)"} caiu (força ${p.forca}, ${p.aplicabilidade}, violada ${p.violada})`;
}
export interface BracoCredito { runId: string; confirmadas: string[]; admissiveis: string[]; pendentes: string[]; recusados: { id: string; motivo: string }[];
  creditados: string[] }
export interface CreditosDoTrio { porBraco: Record<string, BracoCredito>; recusados: { id: string; cardId: string; motivo: string }[];
  /** Só com `cenaPelaSpec`: o que a regra fez com os cartões com segmentos, por braço (contagem; a regra não lê o braço). */
  cenaPelaSpec?: Record<string, ContagemCena> }

const pendente = (cardId: string): SemanticDecision => ({ cardId, status: "pending", reviewer: "", rationale: "", complete: false, evidenceRefs: [], atoms: [] });

/**
 * Regra de cena para cartão com segmentos (D-60), declarada DEPOIS da coleta da F3 (desvio declarado; opção, padrão
 * desligada). A passada cega não pergunta a cena; sem a regra, todo cartão com segmentos fica pendente.
 */
export const REGRA_CENA_PELA_SPEC = "cena-pela-spec-1.0.0";
export const DEFINICAO_CENA_PELA_SPEC = "cartão com segmentos: veredito reference da spec S → a cena é o segmento onde o pacote construiu as unidades de S (o do state de S; sempre → o último), se for um dos segmentos do cartão, e o crédito segue pelo caminho de sempre nessa cena (senão, pendente); veredito sem crédito → o primeiro segmento do cartão na ordem do plano; não lê braço, execução nem trio";
export interface ContagemCena { segmentados: number; referencia: number; naoReferencia: number; pendentes: Record<string, number> }

/** A cena que a regra escolhe, ou por que o cartão fica pendente. Lê só o cartão, as unidades e as cenas do pacote. */
export function cenaPelaSpec(card: Card, pkg: Pick<SemanticPackage, "units" | "scenes">, v: { veredito: VereditoCartao; spec: string | null }):
  { cena: string; como: "referencia" | "nao-referencia"; nota: string } | { pendente: string; tipo: string } {
  const doCartao = card.segmentos!.map(o => o.scene);
  if (v.veredito === "reference") {
    const daSpec = [...new Set(pkg.units.filter(u => u.specId === v.spec).map(u => u.scene))].sort();
    if (!daSpec.length) return { tipo: "spec-sem-unidade", pendente: `${REGRA_CENA_PELA_SPEC}: a ${v.spec} não tem unidade no pacote` };
    const comuns = daSpec.filter(c => doCartao.includes(c));
    if (!comuns.length) return { tipo: "segmento-da-spec-fora-do-cartao", pendente: `${REGRA_CENA_PELA_SPEC}: o segmento da ${v.spec} (${daSpec.join(", ")}) não está entre os do cartão (${doCartao.join(", ")})` };
    if (comuns.length > 1) return { tipo: "spec-em-mais-de-um-segmento-do-cartao", pendente: `${REGRA_CENA_PELA_SPEC}: unidades da ${v.spec} em ${comuns.length} segmentos do cartão (${comuns.join(", ")}): ambíguo` };
    return { cena: comuns[0], como: "referencia", nota: `cena ${comuns[0]} = segmento das unidades da ${v.spec} (${REGRA_CENA_PELA_SPEC})` };
  }
  const ordem = (s: string) => pkg.scenes.find(x => x.id === s)?.segmento?.numero ?? Number.MAX_SAFE_INTEGER;
  const primeira = doCartao.map((s, i) => ({ s, i })).sort((x, y) => ordem(x.s) - ordem(y.s) || x.i - y.i)[0].s;
  return { cena: primeira, como: "nao-referencia", nota: `cena ${primeira} = primeiro segmento do cartão na ordem do plano; veredito sem crédito (${REGRA_CENA_PELA_SPEC})` };
}

/** Unidades confirmadas por braço num trio (um pacote), sob a política e com os cartões `removidos` (S4') sem crédito. */
export function creditosDoTrio(pkg: SemanticPackage, julgados: CartaoJulgado[], o: { politica: Politica; removidos?: ReadonlySet<string>; reviewer: string; fonte: string; bracos: readonly string[];
  /** Regra `cena-pela-spec-1.0.0` (declarada depois da coleta da F3). Sem ela, cartão com segmentos fica pendente, como sempre. */
  cenaPelaSpec?: boolean }): CreditosDoTrio {
  const cards = new Map(pkg.cards.map(c => [c.id, c]));
  const decisoes = new Map<string, SemanticDecision>();
  const recusados: CreditosDoTrio["recusados"] = [];
  const idDe = new Map<string, CartaoJulgado>();
  const pend = new Set<string>();
  const pelaRegra = new Map<string, "referencia" | "nao-referencia">();
  for (const j of ordenar(julgados, x => x.cardId)) {
    const card = cards.get(j.cardId);
    if (!card) throw new Error(`${j.id}: cartão ${j.cardId} fora do pacote`);
    if (decisoes.has(j.cardId)) throw new Error(`${j.id}: cartão ${j.cardId} julgado duas vezes`);
    idDe.set(j.cardId, j);
    const v = vereditoNaPolitica(j.derivado, o.politica, o.removidos?.has(j.id) ?? false);
    if (v.veredito === "pendente") { decisoes.set(j.cardId, pendente(j.cardId)); pend.add(j.cardId); continue; }
    let cena: { cena: string; nota: string } | null = null;
    if (card.segmentos) {
      if (!o.cenaPelaSpec) { decisoes.set(j.cardId, pendente(j.cardId)); pend.add(j.cardId); recusados.push({ id: j.id, cardId: j.cardId, motivo: "cartão com segmentos: a passada não decide a cena" }); continue; }
      const c = cenaPelaSpec(card, pkg, v);
      if ("pendente" in c) { decisoes.set(j.cardId, pendente(j.cardId)); pend.add(j.cardId); recusados.push({ id: j.id, cardId: j.cardId, motivo: c.pendente }); continue; }
      cena = c; pelaRegra.set(j.cardId, c.como);
    }
    const subs = cena ? card.subjects.filter(s => s.scene === cena!.cena) : card.subjects;
    if (cena && !subs.length) { decisoes.set(j.cardId, pendente(j.cardId)); pend.add(j.cardId); pelaRegra.delete(j.cardId); recusados.push({ id: j.id, cardId: j.cardId, motivo: `${REGRA_CENA_PELA_SPEC}: nenhum sujeito do cartão na cena ${cena!.cena}` }); continue; }
    const nota = cena ? ` · ${cena.nota}` : "";
    const base = { id: "cartao", text: (card.observed ?? card.description ?? "").trim() || card.id, subjects: subs.map(s => s.id) };
    let atom: ReviewAtom;
    if (v.veredito === "reference") {
      const r = unidadesDaSpec(card, pkg.units, v.spec!, subs, `${j.id}: ${v.motivo}${proveniencia(j.derivado)}${nota}`, o.reviewer, [o.fonte]);
      if ("falhou" in r) { decisoes.set(j.cardId, pendente(j.cardId)); pend.add(j.cardId); pelaRegra.delete(j.cardId); recusados.push({ id: j.id, cardId: j.cardId, motivo: r.falhou }); continue; }
      atom = { ...base, verdict: "reference", unitIds: r.unitIds, citation: j.derivado.fundamentacao === "norma" ? "supported" : "uncertain", ...(r.links.length ? { links: r.links } : {}) };
    } else atom = { ...base, verdict: v.veredito, unitIds: [], citation: "uncertain" };
    decisoes.set(j.cardId, { cardId: j.cardId, status: "reviewed", reviewer: o.reviewer, rationale: `${j.id}: ${v.motivo}${proveniencia(j.derivado)}${nota}`, complete: true,
      evidenceRefs: [o.fonte, j.id], atoms: [atom], ...(cena ? { cena: cena.cena } : {}) });
  }
  const montadas = (): SemanticReviews => ({ version: pkg.version, decisions: [...decisoes.values()] });
  let score: ReturnType<typeof scoreSemanticPackage>;
  try { score = scoreSemanticPackage(pkg, montadas()); }
  catch {
    for (const [cardId, d] of [...decisoes]) {
      if (d.status !== "reviewed") continue;
      try { scoreSemanticPackage(pkg, { version: pkg.version, decisions: [d] }); }
      catch (e) { decisoes.set(cardId, pendente(cardId)); pend.add(cardId); recusados.push({ id: idDe.get(cardId)!.id, cardId, motivo: `recusado pelo scorer: ${e instanceof Error ? e.message : String(e)}` }); }
    }
    score = scoreSemanticPackage(pkg, montadas());
  }
  const porBraco: Record<string, BracoCredito> = {};
  for (const run of pkg.runs) {
    const braco = bracoDoRun(run, o.bracos);
    if (!o.bracos.includes(braco)) continue;
    if (porBraco[braco]) throw new Error(`pacote com dois runs do braço ${braco}: um trio tem uma execução por braço`);
    const s = score.scores.find(x => x.runId === run.id)!;
    const meus = julgados.filter(j => j.runId === run.id);
    const admissiveis = new Set<string>();
    for (const j of meus) if (pend.has(j.cardId)) {
      const card = cards.get(j.cardId)!;
      const spec = typeof j.resposta.vinculo === "object" ? j.resposta.vinculo.spec : null;
      const us = spec ? pkg.units.filter(u => u.specId === spec).map(u => u.id) : card.candidateUnitIds;
      for (const u of us) admissiveis.add(u);
    }
    const creditados = meus.filter(j => decisoes.get(j.cardId)?.atoms.some(a => a.verdict === "reference")).map(j => j.id).sort();
    porBraco[braco] = { runId: run.id, confirmadas: [...new Set(s.matched.map(m => m.unitId))].sort(), admissiveis: [...admissiveis].sort(),
      pendentes: meus.filter(j => pend.has(j.cardId)).map(j => j.id).sort(), recusados: recusados.filter(r => meus.some(j => j.id === r.id)).map(r => ({ id: r.id, motivo: r.motivo })),
      creditados };
  }
  if (!o.cenaPelaSpec) return { porBraco, recusados };
  // Contagem por braço (só relatório): a regra já decidiu sem ler o braço. Recusa posterior (vínculo, scorer) = pendente.
  const motivoDe = new Map(recusados.map(r => [r.cardId, r.motivo]));
  const cenaPorBraco: Record<string, ContagemCena> = {};
  for (const j of julgados) {
    if (!cards.get(j.cardId)!.segmentos) continue;
    const c = (cenaPorBraco[j.braco] ??= { segmentados: 0, referencia: 0, naoReferencia: 0, pendentes: {} });
    c.segmentados++;
    const como = pelaRegra.get(j.cardId);
    if (como && decisoes.get(j.cardId)?.status === "reviewed") { if (como === "referencia") c.referencia++; else c.naoReferencia++; continue; }
    const m = motivoDe.get(j.cardId);
    const tipo = !m ? "pendente na passada" : m.startsWith(`${REGRA_CENA_PELA_SPEC}: `) ? m.slice(REGRA_CENA_PELA_SPEC.length + 2).replace(/ \(.*$/, "").replace(/\b[A-Z][A-Z0-9]*-\d+\b/g, "S").replace(/cena \S+/, "cena C")
      : m.startsWith("recusado pelo scorer") ? "recusado pelo scorer" : m.replace(/\b[A-Z][A-Z0-9]*-\d+\b/g, "S").replace(/cena \S+/, "cena C");
    c.pendentes[tipo] = (c.pendentes[tipo] ?? 0) + 1;
  }
  return { porBraco, recusados, cenaPelaSpec: cenaPorBraco };
}

// ───────────────────────────────────────────────────────────────── coluna fundamentada e a variante "sem ids expostos" (tela E)

/**
 * A norma que fundamentou o crédito, como o AGENTE a escreveu no achado (nada do juiz): a regra citada (`card.rule`) ou,
 * quando a classe veio de uma referência secundária (`derivado.citacaoPor`, política 1.3.0), essa referência do achado
 * (`referenciasDoAchado`, a mesma lista que a passada publicou como REF1/REF2). Cartão sem regra citada → null.
 */
export function normaDaFundamentacao(card: Card, d: Pick<Derivado, "citacaoPor">, id = card.id): string | null {
  if (d.citacaoPor) {
    const r = referenciasDoAchado(card)[IDS_REFERENCIA.indexOf(d.citacaoPor)];
    if (!r) throw new Error(`${id}: citacaoPor ${d.citacaoPor} sem essa referência no achado`);
    return r;
  }
  return card.rule ?? null;
}

export interface FundamentadaBraco {
  /** Specs fundamentadas na leitura principal (`specFundamentada`, a mesma coluna de e14-deteccao.ts). */
  principal: string[];
  /** Por sensibilidade da coluna (`RegraDesfecho.fundamentada`): as specs que continuam fundamentadas. */
  variantes: Record<string, string[]>;
  /** Cartões fundamentados cuja norma é id exposto da spec creditada, por sensibilidade ("fundamentada por norma exposta"). */
  porNormaExposta: Record<string, { id: string; spec: string; norma: string }[]>;
  /**
   * Cartões fundamentados, numa spec que a sensibilidade muda, cuja norma é id de verificação (`ehIdDeVerificacao`): a
   * passada resolve esse id pelo `checker-aliases.json` + base do validador, entradas que o recálculo não lê. Ficam
   * contados como na principal e listados aqui, por sensibilidade, para ninguém os perder de vista.
   */
  porAlias: Record<string, { id: string; spec: string; norma: string }[]>;
}

/**
 * Coluna fundamentada de um trio por braço do desenho, na leitura principal e em cada sensibilidade da coluna. Mesma
 * passada, mesmo derivado: na sensibilidade, o cartão fundamentado cuja norma (`normaDaFundamentacao`, forma canônica)
 * é um id exposto da spec creditada deixa de fundamentar; os outros cartões contam como na principal (a spec fica
 * fundamentada se outro cartão a fundamenta por norma não exposta). Cartão sem regra citada nunca é "por norma exposta".
 * Cartão cuja norma é id de verificação (alias de várias regras) numa spec com ids expostos: contado como na principal e
 * listado em `porAlias` (as regras do alias não se resolvem aqui sem as entradas do validador; nenhum segundo mapeamento).
 */
export function fundamentadaDoTrio(pkg: SemanticPackage, julgados: CartaoJulgado[], bracos: readonly string[], sens: readonly SensibilidadeFundamentada[]): Record<string, FundamentadaBraco> {
  const cards = new Map(pkg.cards.map(c => [c.id, c]));
  const out: Record<string, FundamentadaBraco> = {};
  for (const run of pkg.runs) {
    const b = bracoDoRun(run, bracos);
    if (bracos.includes(b)) out[b] ??= { principal: [], variantes: Object.fromEntries(sens.map(s => [s.id, []])), porNormaExposta: Object.fromEntries(sens.map(s => [s.id, []])),
      porAlias: Object.fromEntries(sens.map(s => [s.id, []])) };
  }
  for (const j of ordenar(julgados, x => x.id)) {
    const x = out[j.braco];
    if (!x) continue;
    const f = specFundamentada({ id: j.id, resposta: j.resposta, derivado: j.derivado });
    if (!f) continue;
    const card = cards.get(j.cardId);
    if (!card) throw new Error(`${j.id}: cartão ${j.cardId} fora do pacote`);
    const norma = normaDaFundamentacao(card, j.derivado, j.id), canon = norma === null ? null : idCanonico(norma);
    if (!x.principal.includes(f.spec)) x.principal.push(f.spec);
    for (const s of sens) {
      const exp = s.expostos[f.spec] ?? [];
      if (canon !== null && exp.includes(canon)) { x.porNormaExposta[s.id].push({ id: j.id, spec: f.spec, norma: norma! }); continue; }
      if (canon !== null && exp.length && ehIdDeVerificacao(canon)) x.porAlias[s.id].push({ id: j.id, spec: f.spec, norma: norma! });
      if (!x.variantes[s.id].includes(f.spec)) x.variantes[s.id].push(f.spec);
    }
  }
  for (const x of Object.values(out)) { x.principal.sort(); for (const k of Object.keys(x.variantes)) x.variantes[k].sort(); }
  return out;
}

/** Specs de um conjunto (modo spec) que a coluna conta: as do conjunto menos as `semCredito`. */
export function contarFundamentada(regra: RegraDesfecho, conjunto: string, specs: readonly string[]): number {
  const c = conjuntoDe(regra, conjunto);
  if (c.modo !== "spec") throw new Error(`coluna fundamentada: conjunto ${conjunto} não é por spec`);
  return specs.filter(s => c.specs.includes(s) && !c.semCredito?.includes(s)).length;
}

export interface ColunaFundamentada {
  coluna: "fundamentada"; tipo: string; regra: string; sensibilidades: SensibilidadeFundamentada[];
  porTrio: { trio: string; porBraco: Record<string, FundamentadaBraco> }[];
  /** Por conjunto (modo spec) × leitura (`principal` e cada sensibilidade) × braço: contagem por trio (null = braço ausente no trio). */
  contagens: Record<string, Record<string, Record<string, (number | null)[]>>>;
}

/** A coluna fundamentada da campanha, descritiva (sem D nem teste: analise-preregistrada › colunas.testeNaFundamentada = false). */
export function colunaFundamentada(regra: RegraDesfecho, bracos: readonly string[], porTrio: ColunaFundamentada["porTrio"]): ColunaFundamentada {
  const sens = regra.fundamentada ?? [];
  const leituras = ["principal", ...sens.map(s => s.id)];
  const contagens: ColunaFundamentada["contagens"] = {};
  for (const c of regra.conjuntos.filter(x => x.modo === "spec")) {
    contagens[c.id] = Object.fromEntries(leituras.map(l => [l, Object.fromEntries(bracos.map(b => [b, porTrio.map(t => {
      const x = t.porBraco[b];
      return x ? contarFundamentada(regra, c.id, l === "principal" ? x.principal : x.variantes[l]) : null;
    })]))]));
  }
  return { coluna: "fundamentada", tipo: "descritiva (sem teste; ao lado da detecção)",
    regra: "fundamentada = specFundamentada (e14-deteccao.ts) sobre o derivado da passada (com a origem medida, se dada); sensibilidade \"sem ids expostos\": o cartão cuja norma que deu a classe (a regra do achado, ou a referência secundária do achado em citacaoPor), na forma canônica, é id exposto da spec creditada sai da coluna (\"fundamentada por norma exposta\"); o cartão cuja norma é id de verificação (ds:<verificação>, alias de várias regras) numa spec com ids expostos fica contado como na principal e listado em porAlias, porque a passada resolve esse id pelo checker-aliases.json e pela base do validador, que o recálculo não lê; a mesma passada, sem juiz novo; a detecção e as tabelas não mudam",
    sensibilidades: [...sens], porTrio, contagens };
}

// ───────────────────────────────────────────────────────────────── specs semeadas por nível (tela F, descritivo)

/**
 * [tela F] Arquivo de níveis (adendo de 26/11 §4: id da spec semeada → nível de dificuldade), congelado com a referência e
 * declarado pela tela em `telas.json › <tela>.niveis { arquivo, sha256 }` (o mesmo padrão de `criteriosDeJulgamento`).
 */
export const FORMATO_NIVEIS = "tela-f-niveis-1.0.0";
export const NIVEIS = ["facil", "medio", "dificil", "muito-dificil"] as const;
export type Nivel = typeof NIVEIS[number];
export interface DeclaracaoNiveis { arquivo: string; sha256: string }
export interface ArquivoNiveis { formato: typeof FORMATO_NIVEIS; referencia: { arquivo: string; versao: string; sha256: string }; niveis: Record<string, Nivel> }
/** Telas do instrumento (padrão: `telas.json` deste repositório). */
export const TELAS_JSON = join(EVAL, "telas.json");

/**
 * `niveis` da tela em `telas.json`, ou `null` (tela sem a declaração, ou fora do arquivo). Fora do formato
 * `{ arquivo: texto, sha256: 64 hex }`, para. Lido sem registro em `Entradas`: só a tela que declara entra no manifesto
 * (`lerNiveis`), para que as telas sem a declaração saiam byte a byte como antes.
 */
export function niveisDeclarados(telaId: string, telasAbs: string = TELAS_JSON): DeclaracaoNiveis | null {
  return arquivoDeclarado(telaId, "niveis", telasAbs);
}

/** `telas.json › <tela>.<campo> { arquivo, sha256 }` (níveis da F, estratos da F2), ou `null`; fora do formato, para. */
function arquivoDeclarado(telaId: string, campo: "niveis" | "estratos", telasAbs: string): DeclaracaoNiveis | null {
  const d = (JSON.parse(lerTexto(telasAbs)) as Record<string, Record<string, unknown> | undefined>)[telaId]?.[campo];
  if (d === undefined) return null;
  const x = d as Partial<DeclaracaoNiveis> | null;
  if (!x || typeof x !== "object" || Array.isArray(x) || typeof x.arquivo !== "string" || !x.arquivo.trim() || typeof x.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(x.sha256)
    || Object.keys(x).some(k => k !== "arquivo" && k !== "sha256"))
    throw new Error(`telas.json › ${telaId}.${campo} fora do formato { arquivo, sha256 }`);
  return { arquivo: x.arquivo, sha256: x.sha256 };
}

/** Lê (registrado em `E`) o arquivo declarado em `telas.json › <tela>.<campo>` e confere o sha256; `null` se a tela não declara. */
function lerArquivoDeclarado(telaId: string, campo: "niveis" | "estratos", E: Entradas, telasAbs: string): { declaracao: DeclaracaoNiveis; doc: unknown; refArquivo: string | null } | null {
  const decl = arquivoDeclarado(telaId, campo, telasAbs);
  if (!decl) return null;
  const telas = JSON.parse(E.texto(telasAbs)) as Record<string, { reference?: string | null }>;
  const abs = join(dirname(telasAbs), decl.arquivo);
  if (!existsSync(abs)) throw new Error(`telas.json › ${telaId}.${campo}: ${decl.arquivo} não existe`);
  const txt = E.texto(abs);
  if (sha(readFileSync(abs)) !== decl.sha256) throw new Error(`telas.json › ${telaId}.${campo}: sha256 de ${decl.arquivo} ≠ o declarado (${decl.sha256.slice(0, 8)}…)`);
  return { declaracao: decl, doc: JSON.parse(txt), refArquivo: telas[telaId]?.reference ?? null };
}

/** A referência que um arquivo descritivo (níveis, estratos) cita: versão, sha256 do arquivo das análises e o de telas.json. */
function conferirReferenciaCitada(nome: string, r: unknown, ref: Referencia, refSha256: string, refArquivo: string | null): ArquivoNiveis["referencia"] {
  const x = r as Partial<ArquivoNiveis["referencia"]> | null | undefined;
  if (!x || typeof x.arquivo !== "string" || typeof x.versao !== "string" || typeof x.sha256 !== "string") throw new Error(`${nome} sem referencia { arquivo, versao, sha256 }`);
  if (x.versao !== ref._meta.version) throw new Error(`${nome}: referência ${x.versao} ≠ a da campanha (${ref._meta.version})`);
  if (x.sha256 !== refSha256) throw new Error(`${nome}: sha256 da referência ${x.sha256.slice(0, 8)}… ≠ o da referência das análises (${refSha256.slice(0, 8)}…)`);
  if (refArquivo !== null && x.arquivo !== refArquivo) throw new Error(`${nome}: referência ${x.arquivo} ≠ a de telas.json (${refArquivo})`);
  return { arquivo: x.arquivo, versao: x.versao, sha256: x.sha256 };
}

/** Os ids de um arquivo descritivo têm de ser exatamente o estrato semeado da referência. */
function conferirIdsDoSemeado(nome: string, campo: string, ids: string[], ref: Referencia): void {
  const sem = ref._meta.estratos?.semeado?.specs;
  if (!sem?.length) throw new Error(`${nome} declarado para referência sem _meta.estratos.semeado.specs`);
  if (JSON.stringify([...ids].sort()) !== JSON.stringify([...sem].sort()))
    throw new Error(`${nome}: specs${campo} (${[...ids].sort().join(", ")}) ≠ estrato semeado da referência (${[...sem].sort().join(", ")})`);
}

/**
 * Confere o arquivo de níveis contra a referência da campanha: formato, referência citada (arquivo = o de `telas.json`,
 * versão, sha256 do arquivo da referência que as análises leram), ids exatamente o estrato semeado
 * (`_meta.estratos.semeado.specs`), nível no vocabulário, e o `nivel` que a referência repetir numa spec igual ao do arquivo.
 */
export function conferirNiveis(doc: unknown, ref: Referencia, refSha256: string, refArquivo: string | null): ArquivoNiveis {
  const d = doc as Partial<ArquivoNiveis> | null;
  if (!d || typeof d !== "object" || d.formato !== FORMATO_NIVEIS) throw new Error(`arquivo de níveis: formato ${JSON.stringify(d?.formato)} ≠ ${FORMATO_NIVEIS}`);
  const referencia = conferirReferenciaCitada("arquivo de níveis", d.referencia, ref, refSha256, refArquivo);
  const niveis = d.niveis;
  if (!niveis || typeof niveis !== "object" || Array.isArray(niveis)) throw new Error("arquivo de níveis sem niveis { spec: nível }");
  conferirIdsDoSemeado("arquivo de níveis", "", Object.keys(niveis), ref);
  for (const [s, n] of Object.entries(niveis)) {
    if (!(NIVEIS as readonly string[]).includes(n)) throw new Error(`arquivo de níveis: ${s} com nível ${JSON.stringify(n)} fora de ${NIVEIS.join(" | ")}`);
    const naRef = ref.violations.find(v => v.id === s)?.nivel;
    if (naRef !== undefined && naRef !== n) throw new Error(`arquivo de níveis: ${s} é ${n} no arquivo e ${naRef} na referência`);
  }
  return { formato: FORMATO_NIVEIS, referencia, niveis: niveis as Record<string, Nivel> };
}

/** O arquivo de níveis da tela, lido (registrado em `E`) e conferido; `null` se a tela não o declara. */
export function lerNiveis(telaId: string, ref: Referencia, refSha256: string, E: Entradas, telasAbs: string = TELAS_JSON): { declaracao: DeclaracaoNiveis; doc: ArquivoNiveis } | null {
  const a = lerArquivoDeclarado(telaId, "niveis", E, telasAbs);
  return a && { declaracao: a.declaracao, doc: conferirNiveis(a.doc, ref, refSha256, a.refArquivo) };
}

// ───────────────────────────────────────────────────────────────── specs semeadas por tipo, nível e interação (tela F2, descritivo)

/**
 * [tela F2] Arquivo de estratos (adendo 2 de 26/11, congelado, §3, §4 item 2, §6, §7): para cada spec semeada, o `tipo` de
 * defeito, o `subtipo` (só nos tipos que declaram subtipos: T1 anatomia/marcação), o `nivel` de dificuldade e se o defeito
 * `exigeInteracao` para ser visto; mais a lista dos tipos que o próprio arquivo declara (id, rótulo, definição opcional,
 * subtipos opcionais). Congelado com a referência e declarado em `telas.json › <tela>.estratos { arquivo, sha256 }`. Os tipos
 * e subtipos NÃO estão no código: valem pelo arquivo.
 */
export const FORMATO_ESTRATOS = "tela-f2-estratos-1.0.0";
/**
 * [tela F3] O formato da F3 (adendo 3 de 27/11, §2.3, §3, §6, §7): o da F2 com dois campos a mais, obrigatórios em toda spec
 * semeada: `origem` (de onde veio o defeito em relação à lista da F2: `mantido`, `trocado` ou `novo`) e `controleDaVarredura`
 * (booleano: o defeito foi escolhido porque se espera que a varredura sem guia o marque). Tipos e subtipos continuam dados
 * do arquivo; nenhuma cota por tipo (a F3 tem contagens desiguais).
 */
export const FORMATO_ESTRATOS_F3 = "tela-f3-estratos-1.0.0";
export const FORMATOS_ESTRATOS = [FORMATO_ESTRATOS, FORMATO_ESTRATOS_F3] as const;
export type FormatoEstratos = typeof FORMATOS_ESTRATOS[number];
/** O formato de estratos que cada tela tem de declarar (tela fora daqui: qualquer um dos formatos). */
export const FORMATO_ESTRATOS_DA_TELA: Readonly<Record<string, FormatoEstratos>> = { "processos-f2": FORMATO_ESTRATOS, "processos-f3": FORMATO_ESTRATOS_F3 };
/** [tela F3] Vocabulário de `origem` (adendo 3 §3, coluna "Origem"); é também a ordem das linhas da tabela por origem. */
export const ORIGENS = ["mantido", "trocado", "novo"] as const;
export type Origem = typeof ORIGENS[number];
export interface TipoDeclarado { id: string; rotulo: string; definicao?: string; subtipos?: string[] }
export interface EstratoDaSpec { tipo: string; subtipo?: string; nivel: Nivel; exigeInteracao: boolean; origem?: Origem; controleDaVarredura?: boolean }
export interface ArquivoEstratos {
  formato: FormatoEstratos; referencia: ArquivoNiveis["referencia"]; tipos: TipoDeclarado[];
  specs: Record<string, EstratoDaSpec>;
}
/** Linhas da tabela por exigência de interação (na ordem). */
export const INTERACAO = ["exige-interacao", "sem-interacao"] as const;
/** O `tipo` (rótulo) de cada tabela descritiva dos estratos, pelo formato do arquivo: o texto da F2 fica byte a byte o de antes. */
function rotuloDescritivo(formato: FormatoEstratos, tabela: "tipo" | "nivel" | "interacao" | "origem"): string {
  if (formato === FORMATO_ESTRATOS) return { tipo: "descritiva pré-declarada (sem D, sem teste; adendo 2 da tela F2 §6)",
    nivel: "descritiva pré-declarada (sem D, sem teste; adendo 2 da tela F2 §4 item 6 e §6)", interacao: "descritiva pré-declarada (sem D, sem teste; adendo 2 da tela F2 §3 e §6)",
    origem: "descritiva pré-declarada (sem D, sem teste)" }[tabela];
  return "descritiva pré-declarada (sem D, sem teste; adendo 3 da tela F3 §6)";
}

/** `estratos` da tela em `telas.json`, ou `null`. Mesmo formato e mesmas recusas da declaração de níveis. */
export function estratosDeclarados(telaId: string, telasAbs: string = TELAS_JSON): DeclaracaoNiveis | null {
  return arquivoDeclarado(telaId, "estratos", telasAbs);
}

/**
 * Confere o arquivo de estratos contra a referência: formato; referência citada (como o de níveis); `tipos` = lista não vazia
 * de { id, rotulo[, definicao][, subtipos] } com ids distintos (e subtipos distintos, não vazios); `specs` com exatamente o
 * estrato semeado (n qualquer, nunca fixado aqui); cada spec com exatamente um `tipo` (um dos declarados), um `nivel` (do
 * vocabulário de níveis) e `exigeInteracao` booleano, mais `subtipo` se e só se o tipo declara subtipos (e então um deles),
 * e nada mais; todo tipo declarado com ao menos uma spec (os tipos presentes são exatamente os declarados); e o
 * `tipo`/`nivel` que a referência repetir numa spec igual ao do arquivo. No formato da F3, cada spec tem ainda exatamente
 * `origem` (um de `ORIGENS`) e `controleDaVarredura` (booleano), e o que a referência repetir deles tem de ser igual.
 */
export function conferirEstratos(doc: unknown, ref: Referencia, refSha256: string, refArquivo: string | null): ArquivoEstratos {
  const N = "arquivo de estratos";
  const d = doc as Partial<Record<keyof ArquivoEstratos, unknown>> | null;
  if (!d || typeof d !== "object" || !(FORMATOS_ESTRATOS as readonly unknown[]).includes(d.formato)) throw new Error(`${N}: formato ${JSON.stringify(d?.formato)} ≠ ${FORMATOS_ESTRATOS.join(" nem ")}`);
  const formato = d.formato as FormatoEstratos, f3 = formato === FORMATO_ESTRATOS_F3;
  const referencia = conferirReferenciaCitada(N, d.referencia, ref, refSha256, refArquivo);
  if (!Array.isArray(d.tipos) || !d.tipos.length) throw new Error(`${N} sem tipos [{ id, rotulo }] (lista não vazia)`);
  const tipos: TipoDeclarado[] = d.tipos.map((t: unknown, i: number) => {
    const x = t as Partial<TipoDeclarado> | null;
    const sub = x?.subtipos;
    if (!x || typeof x !== "object" || Array.isArray(x) || typeof x.id !== "string" || !x.id.trim() || typeof x.rotulo !== "string" || !x.rotulo.trim()
      || (x.definicao !== undefined && typeof x.definicao !== "string")
      || (sub !== undefined && (!Array.isArray(sub) || !sub.length || sub.some(s => typeof s !== "string" || !s.trim()) || new Set(sub).size !== sub.length))
      || Object.keys(x).some(k => !["id", "rotulo", "definicao", "subtipos"].includes(k)))
      throw new Error(`${N}: tipos[${i}] fora do formato { id, rotulo[, definicao][, subtipos: [texto, …] distintos] }`);
    return { id: x.id, rotulo: x.rotulo, ...(x.definicao !== undefined ? { definicao: x.definicao } : {}), ...(sub !== undefined ? { subtipos: [...sub] } : {}) };
  });
  const idsTipo = tipos.map(t => t.id);
  if (new Set(idsTipo).size !== idsTipo.length) throw new Error(`${N}: tipo repetido em tipos (${idsTipo.join(", ")})`);
  if (idsTipo.includes("total")) throw new Error(`${N}: "total" não pode ser id de tipo (é a linha do primário)`);
  const specs = d.specs;
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) throw new Error(`${N} sem specs { spec: { tipo, nivel, exigeInteracao[, subtipo] } }`);
  conferirIdsDoSemeado(N, "", Object.keys(specs), ref);
  const saida: ArquivoEstratos["specs"] = {};
  for (const [s, e] of Object.entries(specs as Record<string, unknown>)) {
    const x = e as Record<string, unknown> | null;
    if (!x || typeof x !== "object" || Array.isArray(x) || typeof x.tipo !== "string" || typeof x.nivel !== "string")
      throw new Error(`${N}: ${s} tem de ter exatamente um tipo e um nível (tipo: texto, nivel: texto)`);
    const t = tipos.find(y => y.id === x.tipo);
    if (!t) throw new Error(`${N}: ${s} com tipo ${JSON.stringify(x.tipo)} fora dos tipos declarados no próprio arquivo (${idsTipo.join(" | ")})`);
    const chaves = [...(f3 ? ["controleDaVarredura"] : []), "exigeInteracao", "nivel", ...(f3 ? ["origem"] : []), ...(t.subtipos ? ["subtipo"] : []), "tipo"];
    if (JSON.stringify(Object.keys(x).sort()) !== JSON.stringify(chaves))
      throw new Error(`${N}: ${s} tem de ter exatamente { ${chaves.join(", ")} } (subtipo só nos tipos que declaram subtipos), nada mais`);
    if (typeof x.exigeInteracao !== "boolean") throw new Error(`${N}: ${s} com exigeInteracao ${JSON.stringify(x.exigeInteracao)} (tem de ser true ou false)`);
    if (f3 && typeof x.controleDaVarredura !== "boolean") throw new Error(`${N}: ${s} com controleDaVarredura ${JSON.stringify(x.controleDaVarredura)} (tem de ser true ou false)`);
    if (f3 && !(ORIGENS as readonly unknown[]).includes(x.origem)) throw new Error(`${N}: ${s} com origem ${JSON.stringify(x.origem)} fora de ${ORIGENS.join(" | ")}`);
    if (t.subtipos && (typeof x.subtipo !== "string" || !t.subtipos.includes(x.subtipo)))
      throw new Error(`${N}: ${s} com subtipo ${JSON.stringify(x.subtipo)} fora dos subtipos de ${t.id} (${t.subtipos.join(" | ")})`);
    if (!(NIVEIS as readonly string[]).includes(x.nivel)) throw new Error(`${N}: ${s} com nível ${JSON.stringify(x.nivel)} fora de ${NIVEIS.join(" | ")}`);
    const v = ref.violations.find(y => y.id === s);
    if (v?.tipo !== undefined && v.tipo !== x.tipo) throw new Error(`${N}: ${s} é do tipo ${x.tipo} no arquivo e ${v.tipo} na referência`);
    if (v?.nivel !== undefined && v.nivel !== x.nivel) throw new Error(`${N}: ${s} é ${x.nivel} no arquivo e ${v.nivel} na referência`);
    if (f3 && v?.origem !== undefined && v.origem !== x.origem) throw new Error(`${N}: ${s} tem origem ${x.origem} no arquivo e ${v.origem} na referência`);
    if (f3 && v?.controleDaVarredura !== undefined && v.controleDaVarredura !== x.controleDaVarredura)
      throw new Error(`${N}: ${s} tem controleDaVarredura ${x.controleDaVarredura} no arquivo e ${v.controleDaVarredura} na referência`);
    saida[s] = { tipo: x.tipo, ...(t.subtipos ? { subtipo: x.subtipo as string } : {}), nivel: x.nivel as Nivel, exigeInteracao: x.exigeInteracao,
      ...(f3 ? { origem: x.origem as Origem, controleDaVarredura: x.controleDaVarredura as boolean } : {}) };
  }
  const usados = new Set(Object.values(saida).map(x => x.tipo));
  const vazios = idsTipo.filter(t => !usados.has(t));
  if (vazios.length) throw new Error(`${N}: tipo(s) declarado(s) sem nenhuma spec semeada (${vazios.join(", ")}): os tipos presentes têm de ser exatamente os declarados`);
  return { formato, referencia, tipos, specs: saida };
}

/** O arquivo de estratos da tela, lido (registrado em `E`) e conferido; `null` se a tela não o declara. */
export function lerEstratos(telaId: string, ref: Referencia, refSha256: string, E: Entradas, telasAbs: string = TELAS_JSON): { declaracao: DeclaracaoNiveis; doc: ArquivoEstratos } | null {
  const a = lerArquivoDeclarado(telaId, "estratos", E, telasAbs);
  return a && { declaracao: a.declaracao, doc: conferirEstratos(a.doc, ref, refSha256, a.refArquivo) };
}

export interface PorNivel {
  tipo: string; regra: string; declaradoEm: string; arquivo: string; sha256: string; formato: string; referencia: ArquivoNiveis["referencia"];
  /** A chave das tabelas lida (detecção): variante principal, política principal. */
  chave: string; bracos: string[]; trios: string[];
  /** Por nível (na ordem de `NIVEIS`), as specs semeadas dele. */
  specs: Record<string, string[]>;
  /** Por linha (cada nível e `total`) × braço: confirmadas [máximo com os pendentes] por trio (null = braço ausente) e medianas. */
  deteccao: Record<string, Record<string, { porTrio: ({ min: number; max: number } | null)[]; mediana: number | null; medianaMax: number | null }>>;
  /** Por linha × braço: specs fundamentadas (`specFundamentada`) por trio (null = braço ausente) e a mediana. */
  fundamentada: Record<string, Record<string, { porTrio: (number | null)[]; mediana: number | null }>>;
}

export const mediana = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Specs semeadas confirmadas por nível e por braço, por trio e mediana (adendo §2, "descritivo pré-declarado, sem teste"):
 * coluna detecção (chave `principal|1.2.0`, a mesma das tabelas principais; spec confirmada = ≥ 1 unidade confirmada, D-102)
 * e, ao lado, a fundamentada da leitura principal. `total` = o primário. Sem D, sem teste.
 */
export function tabelaPorNivel(niveis: { declaracao: DeclaracaoNiveis; doc: ArquivoNiveis }, telaId: string, trios: TrioEntrada[],
  fund: FundamentadaPorTrio[], bracos: readonly string[], specDe: (u: string) => string | undefined): PorNivel {
  return montarPorNivel(niveis.doc.niveis, {
    tipo: "descritiva pré-declarada (sem D, sem teste; adendo da tela F §2)", fonte: "arquivo de níveis",
    declaradoEm: `telas.json › ${telaId}.niveis`, arquivo: niveis.declaracao.arquivo, sha256: niveis.declaracao.sha256, formato: niveis.doc.formato, referencia: niveis.doc.referencia,
  }, trios, fund, bracos, specDe);
}

/** [tela F2] A mesma tabela por nível, com os níveis tirados do arquivo de estratos (adendo 2 §4 item 6: nível só como rótulo). */
export function tabelaPorNivelDosEstratos(estratos: { declaracao: DeclaracaoNiveis; doc: ArquivoEstratos }, telaId: string, trios: TrioEntrada[],
  fund: FundamentadaPorTrio[], bracos: readonly string[], specDe: (u: string) => string | undefined): PorNivel {
  return montarPorNivel(Object.fromEntries(Object.entries(estratos.doc.specs).map(([s, x]) => [s, x.nivel])), {
    tipo: rotuloDescritivo(estratos.doc.formato, "nivel"), fonte: "arquivo de estratos",
    declaradoEm: `telas.json › ${telaId}.estratos`, arquivo: estratos.declaracao.arquivo, sha256: estratos.declaracao.sha256, formato: estratos.doc.formato, referencia: estratos.doc.referencia,
  }, trios, fund, bracos, specDe);
}

export type FundamentadaPorTrio = { trio: string; porBraco: Record<string, { principal: string[] }> };
interface FonteDescritiva { tipo: string; fonte: string; declaradoEm: string; arquivo: string; sha256: string; formato: string; referencia: ArquivoNiveis["referencia"] }

function montarPorNivel(niveis: Record<string, Nivel>, f: FonteDescritiva, trios: TrioEntrada[], fund: FundamentadaPorTrio[], bracos: readonly string[], specDe: (u: string) => string | undefined): PorNivel {
  const chave = chaveVariante("principal", "1.2.0");
  const specs: Record<string, string[]> = Object.fromEntries(NIVEIS.map(n => [n, Object.keys(niveis).filter(s => niveis[s] === n).sort()]));
  const linhas: [string, Set<string>][] = [...NIVEIS.map(n => [n, new Set(specs[n])] as [string, Set<string>]), ["total", new Set(Object.keys(niveis))]];
  const { deteccao, fundamentada } = contagemPorLinha(linhas, chave, trios, fund, bracos, specDe);
  return { tipo: f.tipo,
    regra: `por nível do ${f.fonte}: specs semeadas do nível com ≥ 1 unidade confirmada (detecção, chave principal|1.2.0, D-102; [máximo] com os pendentes) e specs semeadas do nível fundamentadas (specFundamentada, leitura principal), por braço e trio, com a mediana entre os trios com o braço; total = o primário`,
    declaradoEm: f.declaradoEm, arquivo: f.arquivo, sha256: f.sha256, formato: f.formato, referencia: f.referencia,
    chave, bracos: [...bracos], trios: trios.map(t => t.trio), specs, deteccao, fundamentada };
}

/** Por linha (um conjunto de specs) × braço: detecção da chave dada por trio ({min, max}) e fundamentada por trio, com medianas. */
function contagemPorLinha(linhas: [string, Set<string>][], chave: string, trios: TrioEntrada[], fund: FundamentadaPorTrio[], bracos: readonly string[],
  specDe: (u: string) => string | undefined): Pick<PorNivel, "deteccao" | "fundamentada"> {
  const conta = (us: string[], alvo: Set<string>) => new Set(us.map(specDe).filter((s): s is string => !!s && alvo.has(s))).size;
  const deteccao: PorNivel["deteccao"] = {}, fundamentada: PorNivel["fundamentada"] = {};
  for (const [linha, alvo] of linhas) {
    deteccao[linha] = {}; fundamentada[linha] = {};
    for (const b of bracos) {
      const porTrio = trios.map(t => { const x = t.creditos[chave]?.[b]; return x ? { min: conta(x.confirmadas, alvo), max: conta([...x.confirmadas, ...x.admissiveis], alvo) } : null; });
      const ok = porTrio.filter((x): x is { min: number; max: number } => x !== null);
      deteccao[linha][b] = { porTrio, mediana: mediana(ok.map(x => x.min)), medianaMax: mediana(ok.map(x => x.max)) };
      const fPorTrio = trios.map(t => { const x = fund.find(g => g.trio === t.trio)?.porBraco[b]; return x ? x.principal.filter(s => alvo.has(s)).length : null; });
      fundamentada[linha][b] = { porTrio: fPorTrio, mediana: mediana(fPorTrio.filter((x): x is number => x !== null)) };
    }
  }
  return { deteccao, fundamentada };
}

export interface PorTipo extends Omit<PorNivel, "specs"> {
  /** Os tipos na ordem do arquivo de estratos (é a ordem das linhas). */
  tipos: TipoDeclarado[];
  /** Por tipo (id), as specs semeadas dele. */
  specs: Record<string, string[]>;
  /** Denominador efetivo (adendo 2 §6): por tipo e `total`, quantas specs semeadas a referência congelada tem (2 ou 3 por tipo; n no total). */
  denominador: Record<string, number>;
  /** Nos tipos com subtipos (T1), as specs semeadas de cada subtipo (registro; sem contagem própria). */
  subtipos: Record<string, Record<string, string[]>>;
}

/** [tela F2] Tabela por exigência de interação (adendo 2 §3, §6): linhas `exige-interacao`, `sem-interacao` e `total`. */
export interface PorInteracao extends Omit<PorNivel, "specs"> { specs: Record<string, string[]> }

/**
 * [tela F2] Specs semeadas confirmadas por TIPO de defeito e por braço, por trio e mediana (adendo 2 §6: "a tabela que responde
 * ao motivo da F2"): mesma contagem da tabela por nível, com as linhas = os tipos do arquivo de estratos, na ordem dele, e
 * `total` = o primário. Sem D, sem teste.
 */
export function tabelaPorTipo(estratos: { declaracao: DeclaracaoNiveis; doc: ArquivoEstratos }, telaId: string, trios: TrioEntrada[],
  fund: FundamentadaPorTrio[], bracos: readonly string[], specDe: (u: string) => string | undefined): PorTipo {
  const chave = chaveVariante("principal", "1.2.0");
  const doc = estratos.doc;
  const specs: Record<string, string[]> = Object.fromEntries(doc.tipos.map(t => [t.id, Object.keys(doc.specs).filter(s => doc.specs[s].tipo === t.id).sort()]));
  const linhas: [string, Set<string>][] = [...doc.tipos.map(t => [t.id, new Set(specs[t.id])] as [string, Set<string>]), ["total", new Set(Object.keys(doc.specs))]];
  const { deteccao, fundamentada } = contagemPorLinha(linhas, chave, trios, fund, bracos, specDe);
  return { tipo: rotuloDescritivo(doc.formato, "tipo"),
    regra: "por tipo do arquivo de estratos (na ordem de tipos): specs semeadas do tipo com ≥ 1 unidade confirmada (detecção, chave principal|1.2.0, D-102; [máximo] com os pendentes) e specs semeadas do tipo fundamentadas (specFundamentada, leitura principal), por braço e trio, com a mediana entre os trios com o braço; total = o primário",
    declaradoEm: `telas.json › ${telaId}.estratos`, arquivo: estratos.declaracao.arquivo, sha256: estratos.declaracao.sha256, formato: doc.formato, referencia: doc.referencia,
    chave, bracos: [...bracos], trios: trios.map(t => t.trio), tipos: doc.tipos.map(t => ({ ...t })), specs,
    denominador: Object.fromEntries([...doc.tipos.map(t => [t.id, specs[t.id].length] as [string, number]), ["total", Object.keys(doc.specs).length]]),
    subtipos: Object.fromEntries(doc.tipos.filter(t => t.subtipos).map(t => [t.id, Object.fromEntries(t.subtipos!.map(st => [st, specs[t.id].filter(s => doc.specs[s].subtipo === st)]))])),
    deteccao, fundamentada };
}

/** [tela F2] Specs semeadas confirmadas por exigência de interação (atributo do arquivo de estratos), como as por nível. */
export function tabelaPorInteracao(estratos: { declaracao: DeclaracaoNiveis; doc: ArquivoEstratos }, telaId: string, trios: TrioEntrada[],
  fund: FundamentadaPorTrio[], bracos: readonly string[], specDe: (u: string) => string | undefined): PorInteracao {
  const chave = chaveVariante("principal", "1.2.0");
  const doc = estratos.doc;
  const specs: Record<string, string[]> = Object.fromEntries(INTERACAO.map(k => [k, Object.keys(doc.specs).filter(s => doc.specs[s].exigeInteracao === (k === "exige-interacao")).sort()]));
  const linhas: [string, Set<string>][] = [...INTERACAO.map(k => [k, new Set(specs[k])] as [string, Set<string>]), ["total", new Set(Object.keys(doc.specs))]];
  const { deteccao, fundamentada } = contagemPorLinha(linhas, chave, trios, fund, bracos, specDe);
  return { tipo: rotuloDescritivo(doc.formato, "interacao"),
    regra: "por exigência de interação do arquivo de estratos (exigeInteracao true → exige-interacao, false → sem-interacao): specs semeadas da linha com ≥ 1 unidade confirmada (detecção, chave principal|1.2.0, D-102; [máximo] com os pendentes) e specs semeadas da linha fundamentadas (specFundamentada, leitura principal), por braço e trio, com a mediana entre os trios com o braço; total = o primário",
    declaradoEm: `telas.json › ${telaId}.estratos`, arquivo: estratos.declaracao.arquivo, sha256: estratos.declaracao.sha256, formato: doc.formato, referencia: doc.referencia,
    chave, bracos: [...bracos], trios: trios.map(t => t.trio), specs, deteccao, fundamentada };
}

/** Seção da tabela por exigência de interação no tabela.md (depois da por nível). */
export function porInteracaoMd(p: PorInteracao): string {
  return secaoDescritivaMd("## Specs semeadas confirmadas por exigência de interação (descritivo pré-declarado; sem D, sem teste)", "Interação", "interação (specs)",
    p, [...INTERACAO, "total"].map(k => [k, k, k === "total" ? Object.values(p.specs).flat().length : p.specs[k].length]));
}

/** [tela F3] Tabela por origem (adendo 3 §6): linhas = `ORIGENS` na ordem e `total`, com o denominador de cada linha. */
export interface PorOrigem extends Omit<PorNivel, "specs"> { specs: Record<string, string[]>; denominador: Record<string, number> }

/**
 * [tela F3] Specs semeadas confirmadas por ORIGEM do defeito (mantido, trocado, novo; atributo do arquivo de estratos da F3),
 * como as por nível e por interação: detecção da chave principal|1.2.0 e fundamentada ao lado; `total` = o primário. Linha
 * sem spec fica com denominador 0 (nenhuma cota por origem). Só para o formato da F3 (o da F2 não tem `origem`).
 */
export function tabelaPorOrigem(estratos: { declaracao: DeclaracaoNiveis; doc: ArquivoEstratos }, telaId: string, trios: TrioEntrada[],
  fund: FundamentadaPorTrio[], bracos: readonly string[], specDe: (u: string) => string | undefined): PorOrigem {
  const doc = estratos.doc;
  if (doc.formato !== FORMATO_ESTRATOS_F3) throw new Error(`tabela por origem: arquivo de estratos no formato ${doc.formato} (só ${FORMATO_ESTRATOS_F3} traz origem)`);
  const chave = chaveVariante("principal", "1.2.0");
  const specs: Record<string, string[]> = Object.fromEntries(ORIGENS.map(k => [k, Object.keys(doc.specs).filter(s => doc.specs[s].origem === k).sort()]));
  const linhas: [string, Set<string>][] = [...ORIGENS.map(k => [k, new Set(specs[k])] as [string, Set<string>]), ["total", new Set(Object.keys(doc.specs))]];
  const { deteccao, fundamentada } = contagemPorLinha(linhas, chave, trios, fund, bracos, specDe);
  return { tipo: rotuloDescritivo(doc.formato, "origem"),
    regra: "por origem do arquivo de estratos (na ordem mantido, trocado, novo): specs semeadas da origem com ≥ 1 unidade confirmada (detecção, chave principal|1.2.0, D-102; [máximo] com os pendentes) e specs semeadas da origem fundamentadas (specFundamentada, leitura principal), por braço e trio, com a mediana entre os trios com o braço; total = o primário",
    declaradoEm: `telas.json › ${telaId}.estratos`, arquivo: estratos.declaracao.arquivo, sha256: estratos.declaracao.sha256, formato: doc.formato, referencia: doc.referencia,
    chave, bracos: [...bracos], trios: trios.map(t => t.trio), specs,
    denominador: Object.fromEntries([...ORIGENS.map(k => [k, specs[k].length] as [string, number]), ["total", Object.keys(doc.specs).length]]), deteccao, fundamentada };
}

/** Seção da tabela por origem no tabela.md (depois da por interação). */
export function porOrigemMd(p: PorOrigem): string {
  return secaoDescritivaMd("## Specs semeadas confirmadas por origem do defeito (descritivo pré-declarado; sem D, sem teste)", "Origens", "origem (denominador)",
    p, [...ORIGENS, "total"].map(k => [k, k, p.denominador[k]]));
}

/** Rótulo pré-declarado da sensibilidade sem os controles da varredura (adendo 3 §2.5, §6). */
export const ROTULO_SEM_CONTROLES = "sensibilidade pré-declarada, sem os controles da varredura";
/** Id do conjunto da sensibilidade sem os controles (entra na semente: `…|recalculo|<comparação>|principal|1.2.0|sem-controles`). */
export const CONJUNTO_SEM_CONTROLES = "sem-controles";

/** [tela F3] A sensibilidade sem os controles da varredura: as comparações do desenho nas semeadas com `controleDaVarredura: false`. */
export interface SemControles {
  tipo: string; rotulo: typeof ROTULO_SEM_CONTROLES; regra: string;
  declaradoEm: string; arquivo: string; sha256: string; formato: string; referencia: ArquivoNiveis["referencia"];
  /** Contagens do arquivo de estratos: semeadas (o primário), controles da varredura e as que ficam nesta sensibilidade. */
  contagem: { semeadas: number; controles: number; semControles: number };
  /** As semeadas com `controleDaVarredura: true` (fora desta sensibilidade) e as com `false` (o conjunto daqui), ordenadas. */
  controles: string[]; specs: string[];
  /** A chave lida (variante principal, política principal) e o conjunto usado (por spec, D-102). */
  chave: string; conjunto: Conjunto;
  /** Uma tabela por comparação do desenho (primária primeiro), pela MESMA `tabelaDaComparacao` do primário. */
  tabelas: TabelaComparacao[];
}

/**
 * [tela F3] Sensibilidade pré-declarada ao lado do primário (adendo 3 §2.5, §6): D_fc, D_sc e D_sf recalculados nas specs
 * semeadas com `controleDaVarredura: false`, pela MESMA `tabelaDaComparacao` (mesmo crédito por spec, mesma permutação
 * exata por troca de sinais, mesmo IC e mesma leitura com δ), variante principal, política 1.2.0, semente própria (o id do
 * conjunto entra nela). Não decide nada sobre a quantidade de controles: com 0 controles o conjunto é o primário, com todos
 * controles o conjunto é vazio (D = 0 em todo trio); as contagens vão na saída.
 */
export function sensibilidadeSemControles(estratos: { declaracao: DeclaracaoNiveis; doc: ArquivoEstratos }, telaId: string, regra: RegraDesfecho,
  trios: TrioEntrada[], comps: Comparacao[], o: { specDe: (u: string) => string | undefined; nPlanejado: number | null; sementeBase: string; reamostragens?: number }): SemControles {
  const doc = estratos.doc;
  if (doc.formato !== FORMATO_ESTRATOS_F3) throw new Error(`sensibilidade sem os controles: arquivo de estratos no formato ${doc.formato} (só ${FORMATO_ESTRATOS_F3} traz controleDaVarredura)`);
  const ids = Object.keys(doc.specs).sort();
  for (const s of ids) if (typeof doc.specs[s].controleDaVarredura !== "boolean") throw new Error(`sensibilidade sem os controles: ${s} sem controleDaVarredura booleano`);
  const prim = conjuntoDe(regra, "primario");
  if (JSON.stringify([...prim.specs].sort()) !== JSON.stringify(ids)) throw new Error("sensibilidade sem os controles: as specs do arquivo de estratos não são o primário da regra");
  const controles = ids.filter(s => doc.specs[s].controleDaVarredura), specs = ids.filter(s => !doc.specs[s].controleDaVarredura);
  const conjunto: Conjunto = { id: CONJUNTO_SEM_CONTROLES, rotulo: `specs semeadas que não são controle da varredura (${specs.length} de ${ids.length}; ${controles.length} controle(s) fora; ${ROTULO_SEM_CONTROLES})`,
    specs, modo: "spec", tipo: "sensibilidade" };
  const regraSC: RegraDesfecho = { ...regra, conjuntos: [...regra.conjuntos, conjunto] };
  const tabelas = comps.map(c => tabelaDaComparacao(trios, c, { variante: "principal", politica: "1.2.0", conjunto: CONJUNTO_SEM_CONTROLES, regra: regraSC, specDe: o.specDe,
    nPlanejado: o.nPlanejado, sementeBase: o.sementeBase, reamostragens: o.reamostragens }));
  return { tipo: "sensibilidade pré-declarada ao lado do primário (adendo 3 da tela F3 §2.5 e §6)", rotulo: ROTULO_SEM_CONTROLES,
    regra: "as comparações do desenho (primária e secundárias) recalculadas nas specs semeadas com controleDaVarredura false do arquivo de estratos, pelo mesmo método do primário (spec confirmada = ≥ 1 unidade confirmada, chave principal|1.2.0; permutação exata por troca de sinais; IC bootstrap; leitura com δ), semente própria (…|recalculo|<comparação>|principal|1.2.0|sem-controles)",
    declaradoEm: `telas.json › ${telaId}.estratos`, arquivo: estratos.declaracao.arquivo, sha256: estratos.declaracao.sha256, formato: doc.formato, referencia: doc.referencia,
    contagem: { semeadas: ids.length, controles: controles.length, semControles: specs.length }, controles, specs,
    chave: chaveVariante("principal", "1.2.0"), conjunto, tabelas };
}

/** Uma seção descritiva (tipo, nível, interação) no tabela.md: cabeçalho, nota da fonte e uma linha por (linha × braço). */
function secaoDescritivaMd(titulo: string, fonte: string, coluna: string, p: Pick<PorNivel, "arquivo" | "formato" | "sha256" | "declaradoEm" | "referencia" | "chave" | "trios" | "bracos" | "deteccao" | "fundamentada">,
  linhas: [string, string, number][]): string {
  const L = ["", titulo, "",
    `${fonte}: \`${p.arquivo}\` (${p.formato}, sha256 ${p.sha256.slice(0, 8)}…, declarado em \`${p.declaradoEm}\`; referência ${p.referencia.arquivo} ${p.referencia.versao}). ` +
    `Detecção = chave \`${p.chave}\` (spec confirmada = ≥ 1 unidade confirmada; "x [≤y]" = confirmado [máximo com os pendentes]); fundamentada ao lado (leitura principal). ` +
    `Por trio na ordem ${p.trios.join(", ")}; — = braço ausente no trio; mediana entre os trios com o braço. \`total\` = o primário.`, "",
    `| ${coluna} | braço | detecção por trio | mediana | fundamentada por trio | mediana |`, "|---|---|---|---|---|---|"];
  for (const [chaveLinha, rotulo, n] of linhas) for (const b of p.bracos) {
    const d = p.deteccao[chaveLinha][b], f = p.fundamentada[chaveLinha][b];
    const med = d.mediana === null ? "n/d" : d.mediana === d.medianaMax ? fmt(d.mediana) : `${fmt(d.mediana)} [≤${fmt(d.medianaMax)}]`;
    L.push(`| ${rotulo} (${n}) | ${b} | ${d.porTrio.map(lim).join(", ")} | ${med} | ${f.porTrio.map(x => x ?? "—").join(", ")} | ${fmt(f.mediana)} |`);
  }
  L.push("");
  return L.join("\n");
}

/** Seção da tabela por tipo no tabela.md (vem antes da por nível). */
export function porTipoMd(p: PorTipo): string {
  return secaoDescritivaMd("## Specs semeadas confirmadas por tipo de defeito (descritivo pré-declarado; sem D, sem teste)", "Tipos", "tipo (denominador)",
    p, [...p.tipos.map(t => [t.id, `${t.id} ${t.rotulo}`, p.denominador[t.id]] as [string, string, number]), ["total", "total", p.denominador.total]]);
}

/** Seção da tabela por nível no tabela.md. */
export function porNivelMd(p: PorNivel): string {
  return secaoDescritivaMd("## Specs semeadas confirmadas por nível de dificuldade (descritivo pré-declarado; sem D, sem teste)", "Níveis", "nível (specs)",
    p, [...NIVEIS, "total"].map(k => [k, k, k === "total" ? Object.values(p.specs).flat().length : p.specs[k].length]));
}

// ───────────────────────────────────────────────────────────────── D por comparação (parte pura)

export interface Comparacao { id: string; arms: [string, string]; role: string | null }
export interface TrioEntrada {
  trio: string; ordem: string[]; linhaDeBase: unknown;
  /** Por variante × política: unidades confirmadas e admissíveis de cada braço; braço ausente = slot perdido. */
  creditos: Record<string, Record<string, { confirmadas: string[]; admissiveis: string[]; pendentes: number }>>;
}
export const chaveVariante = (v: Variante, p: Politica): string => `${v}|${p}`;
export const nomeD = (id: string): string => ({ "ferramentas-x-com": "D_fc", "sem-x-com": "D_sc", "sem-x-ferramentas": "D_sf" } as Record<string, string>)[id] ?? `D(${id})`;

export interface LinhaTrio { trio: string; posicoes: Record<string, number>; a: { min: number; max: number } | null; b: { min: number; max: number } | null;
  d: number | null; dMin: number | null; dMax: number | null; estado: "final" | "provisorio" | "incompleto" }
export interface TabelaComparacao {
  comparacao: string; nome: string; papel: string | null; bracos: [string, string]; formula: string; conjunto: string; delta: number; unidadeDelta: string;
  porTrio: LinhaTrio[]; nPlanejado: number | null; nEfetivo: number; estado: "FINAL" | "PROVISORIO";
  estatistica: Omit<AnalisePareada, "leitura"> & { leitura: string }; leituraDelta: string; envoltoriaMedia: { min: number | null; max: number | null };
}

/** Leitura com δ (§6.3): IC inteiro em [−δ, +δ] → dentro; cruzando ±δ → inconclusivo; inteiro fora → dito como tal; IC indisponível → motivo. */
export function leituraComDelta(ic: AnalisePareada["ic"], delta: number): string {
  if (!ic.disponivel || ic.inferior === null || ic.superior === null) return `leitura com δ indisponível (${ic.motivo})`;
  if (ic.inferior >= -delta && ic.superior <= delta) return `o IC estimado caiu dentro da faixa pré-especificada de ±δ (±${delta})`;
  if (ic.superior < -delta || ic.inferior > delta) return `IC inteiro fora da faixa de ±δ (±${delta}); a direção é a da leitura congelada`;
  return `inconclusivo para o efeito relevante (o IC cruza ±${delta})`;
}

export function tabelaDaComparacao(trios: TrioEntrada[], c: Comparacao, o: { variante: Variante; politica: Politica; conjunto: string;
  regra: RegraDesfecho; specDe: (u: string) => string | undefined; nPlanejado: number | null; sementeBase: string; reamostragens?: number }): TabelaComparacao {
  const cnt = contar(o.regra, o.conjunto, o.specDe);
  const [a, b] = c.arms;
  const porTrio: LinhaTrio[] = trios.map(t => {
    const cr = t.creditos[chaveVariante(o.variante, o.politica)] ?? {};
    const posicoes = Object.fromEntries(t.ordem.map((x, i) => [x, i + 1]));
    const lim = (x: string) => (cr[x] ? { min: cnt(cr[x].confirmadas), max: cnt([...cr[x].confirmadas, ...cr[x].admissiveis]) } : null);
    const la = lim(a), lb = lim(b);
    if (!la || !lb) return { trio: t.trio, posicoes, a: la, b: lb, d: null, dMin: null, dMax: null, estado: "incompleto" };
    const prov = cr[a].pendentes + cr[b].pendentes > 0;
    return { trio: t.trio, posicoes, a: la, b: lb, d: lb.min - la.min, dMin: lb.min - la.max, dMax: lb.max - la.min, estado: prov ? "provisorio" : "final" };
  });
  const ef = porTrio.filter(x => x.d !== null);
  const d = ef.map(x => x.d!);
  const semente = `${o.sementeBase}|recalculo|${c.id}|${o.variante}|${o.politica}|${o.conjunto}`;
  const est = analisePareada(d, semente, { reamostragens: o.reamostragens });
  const leitura = est.leitura === "vantagem-com" ? `vantagem do ${b}` : est.leitura === "vantagem-sem" ? `vantagem do ${a}`
    : est.leitura === "sem-diferenca-detectavel" ? "nenhuma diferença detectável" : "indisponível";
  const mediaDe = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return { comparacao: c.id, nome: nomeD(c.id), papel: c.role, bracos: [a, b], formula: `${nomeD(c.id)} = ${b} − ${a}`,
    conjunto: conjuntoDe(o.regra, o.conjunto).rotulo, delta: DELTA, unidadeDelta: o.regra.unidadeDelta, porTrio, nPlanejado: o.nPlanejado, nEfetivo: ef.length,
    estado: ef.some(x => x.estado === "provisorio") ? "PROVISORIO" : "FINAL", estatistica: { ...est, leitura }, leituraDelta: leituraComDelta(est.ic, DELTA),
    envoltoriaMedia: { min: r4(mediaDe(ef.map(x => x.dMin!))), max: r4(mediaDe(ef.map(x => x.dMax!))) } };
}

// ───────────────────────────────────────────────────────────────── sensibilidade por protocolo (NAT-78 §4.5)

/**
 * Como um trio com UM slot fora do conjunto por protocolo entra na estatística pareada desta leitura.
 *
 * - `trio-inteiro` (ADOTADO): o trio sai de TODAS as comparações por protocolo (D_fc, D_sc, D_sf) e é listado em cada uma.
 *   Por quê: a unidade pareada é o trio (trocabilidade dentro do trio, §6.3), e o conjunto por protocolo é então um conjunto
 *   de trios — as três comparações desta leitura falam dos MESMOS trios, e um `sem` sem ausência comprovada (ou um braço com
 *   oráculo fora do protocolo) não deixa o trio "meio aderente" numa comparação e fora de outra. É a escolha mais
 *   conservadora para uma sensibilidade; o custo é n menor.
 * - `so-comparacoes-do-slot` (alternativa, não adotada; testada): o trio sai só das comparações que têm o braço do slot fora,
 *   como a regra do trio incompleto do §6.3 para slot perdido.
 *
 * Slot PERDIDO (sem execução escolhida) não é "fora por protocolo": não tem estado do oráculo, e segue a regra do trio
 * incompleto do primário (§6.3: entra só nas comparações que têm os dois braços).
 */
export type ModoTrioForaProtocolo = "trio-inteiro" | "so-comparacoes-do-slot";
export const TRIO_COM_SLOT_FORA: ModoTrioForaProtocolo = "trio-inteiro";

export interface SlotProtocolo { braco: string; runId: string; estado: OracleUsage; situacao: SituacaoProtocolo }
export interface TrioProtocolo { trio: string; slots: SlotProtocolo[] }
export interface TabelaPorProtocolo extends TabelaComparacao {
  leitura: typeof LEITURA_POR_PROTOCOLO; trioComSlotFora: ModoTrioForaProtocolo;
  /** Trios que saíram desta comparação por protocolo, com os slots fora que os tiraram. */
  foraDaComparacao: { trio: string; slots: SlotProtocolo[] }[];
}
export const chavePorProtocolo = (v: Variante, p: Politica, conjunto: string): string => `${LEITURA_POR_PROTOCOLO}|${v}|${p}|${conjunto}`;

/** O estado do oráculo e a situação por protocolo de cada slot com execução escolhida de um trio. */
export function slotsPorProtocolo(trio: string, slots: { braco: string; escolhida: string | null }[], execucoes: ExecucaoDoResumo[]): TrioProtocolo {
  const runs = slots.filter(s => s.escolhida).map(s => ({ id: s.escolhida!, braco: s.braco }));
  const est = estadosDoOraculo(execucoes, runs);
  return { trio, slots: runs.map(r => ({ braco: r.braco, runId: r.id, estado: est[r.braco], situacao: situacaoPorProtocolo(r.braco, est[r.braco]) })) };
}

/**
 * A comparação pareada na leitura por protocolo: a MESMA `tabelaDaComparacao`, sobre os trios que ficam pela regra
 * `modo` (padrão `TRIO_COM_SLOT_FORA`), com semente própria (`<base>|sensibilidade-por-protocolo|recalculo|…`). Todos
 * os slots no conjunto → mesmos D por trio e mesma estatística do primário.
 */
export function tabelaPorProtocolo(trios: TrioEntrada[], estados: TrioProtocolo[], c: Comparacao, o: Parameters<typeof tabelaDaComparacao>[2] & { modo?: ModoTrioForaProtocolo }): TabelaPorProtocolo {
  const modo = o.modo ?? TRIO_COM_SLOT_FORA;
  const de = new Map(estados.map(e => [e.trio, e]));
  const dentro: TrioEntrada[] = [], fora: TabelaPorProtocolo["foraDaComparacao"] = [];
  for (const t of trios) {
    const e = de.get(t.trio);
    if (!e) throw new Error(`por protocolo: trio ${t.trio} sem o estado do oráculo dos slots`);
    const foraDoConjunto = e.slots.filter(s => s.situacao !== "no-conjunto");
    const tiram = modo === "trio-inteiro" ? foraDoConjunto : foraDoConjunto.filter(s => c.arms.includes(s.braco));
    if (tiram.length) fora.push({ trio: t.trio, slots: tiram }); else dentro.push(t);
  }
  const { modo: _m, ...resto } = o;
  void _m;
  return { ...tabelaDaComparacao(dentro, c, { ...resto, sementeBase: `${o.sementeBase}|${LEITURA_POR_PROTOCOLO}` }), leitura: LEITURA_POR_PROTOCOLO, trioComSlotFora: modo, foraDaComparacao: fora };
}

// ───────────────────────────────────────────────────────────────── S4'

export interface Contestado { id: string; chave: string; braco: string; motivos: string[]; creditoFinal: string; fundamentacaoFinal: string | null; creditoEnvolvido: boolean }
/**
 * Cartões cujo crédito sai no S4' (§8.5): contestados (1ª passada ≠ adjudicação, ou desacordo na amostra; `contestados.json`)
 * que creditam na passada lida e que a autora não ratificou. Tirar "de ambos os braços" = a mesma regra nos dois braços de
 * cada comparação (o crédito sai do braço de quem o recebeu), nunca só do `com`.
 */
export function removidosS4(contestados: Contestado[], creditaNaPassada: (id: string) => boolean, ratificados: ReadonlySet<string>): Set<string> {
  return new Set(contestados.filter(c => creditaNaPassada(c.id) && !ratificados.has(c.id)).map(c => c.id));
}

/**
 * Ratificações a partir das respostas cegas da autora (entrega 6, §8.4): o material é conferido pelo sha256 (respostas,
 * chave), cada caso tem de cair num cartão das passadas lidas (mesma passada pelo sha256 dos julgamentos, mesma chave), e o
 * desfecho da passada é recalculado aqui pela MESMA política (vereditoNaPolitica 1.2.0 + origem medida aplicada) e tem de
 * ser o da chave — senão o material foi preparado sobre outras decisões e nada é usado. Ratifica = desfecho da autora igual
 * ao da passada; desacordo e "não sei" não ratificam e não sobrescrevem nada.
 */
export function ratificacoesDaAutora(abs: string, doc: DocRespostasAutora, E: Entradas, passadas: Passada[], derivadoNa: CargaCampanha["derivadoNa"]):
  { ratificados: Set<string>; info: string; detalhe: Record<string, unknown> } {
  const sTxt = E.texto(`${abs}.sha256`), txt = readFileSync(abs, "utf8").replace(/^﻿/, "");
  if (sTxt.trim().split(/\s+/)[0] !== sha(txt)) throw new Error(`--ratificacoes ${abs}: não confere com o .sha256 ao lado`);
  if (doc.juiz !== "autora") throw new Error(`--ratificacoes: juiz ${doc.juiz} ≠ autora`);
  const mat = isAbsolute(doc.material.dir) ? doc.material.dir : join(TCC, doc.material.dir);
  const cTxt = E.texto(join(mat, "chave", "chave-autora.json"));
  if (sha(cTxt) !== doc.material.chaveSha256) throw new Error(`--ratificacoes: a chave do material ${doc.material.dir} não confere com a das respostas`);
  const mTxt = E.texto(join(mat, "manifesto.json"));
  if (sha(mTxt) !== doc.material.manifestoSha256) throw new Error(`--ratificacoes: o manifesto do material ${doc.material.dir} não confere com o das respostas`);
  const chave = JSON.parse(cTxt) as ChaveAutora;
  if (chave.formato !== FORMATO_CHAVE_AUTORA) throw new Error(`chave do material: formato ${chave.formato}`);
  const ratificados = new Set<string>();
  const casos: Record<string, unknown>[] = [];
  const conta = { respondidos: 0, ratificam: 0, discordam: 0, pendentes: 0 };
  for (const r of doc.respostas) {
    const c = chave.casos.find(x => x.caso === r.caso);
    if (!c) throw new Error(`--ratificacoes: caso ${r.caso} fora da chave do material`);
    if (desfechoDaAutora(r) !== r.desfecho) throw new Error(`--ratificacoes: ${r.caso}: desfecho gravado ${r.desfecho} ≠ o das respostas (${desfechoDaAutora(r)})`);
    const p = passadas.find(x => x.nome === c.passada && x.julgSha === c.julgamentosSha256);
    if (!p) throw new Error(`--ratificacoes: ${r.caso} veio da passada ${c.passada} (julgamentos ${c.julgamentosSha256.slice(0, 8)}…), que não está entre as --passada`);
    if (p.item.get(c.id)?.chave !== c.chave) throw new Error(`--ratificacoes: ${r.caso} → ${c.id} não confere com a chave da passada`);
    const d = derivadoNa(p, c.id);
    const agora = desfechoDaPassada(d, vereditoNaPolitica(d, "1.2.0").veredito === "reference");
    if (agora !== c.desfechoPassada) throw new Error(`--ratificacoes: ${r.caso}: o material mostrou a passada como ${c.desfechoPassada}, e aqui ela dá ${agora} (outra origem medida ou outra passada?): nada usado`);
    const ok = ratifica(r.desfecho, c.desfechoPassada);
    conta.respondidos++;
    if (r.desfecho === "pendente") conta.pendentes++; else if (ok) conta.ratificam++; else conta.discordam++;
    if (ok) ratificados.add(c.id);
    casos.push({ caso: r.caso, id: c.id, braco: c.braco, estrato: c.estrato, desfechoPassada: c.desfechoPassada, desfechoAutora: r.desfecho, ratifica: ok });
  }
  return { ratificados,
    info: `${ratificados.size} cartão(ões) ratificado(s) pela autora (respostas cegas ${E.rel(abs)}: ${conta.respondidos} respondidos, ${conta.ratificam} concordam com a passada, ${conta.discordam} discordam, ${conta.pendentes} "não sei"; desacordo não sobrescreve nada)`,
    detalhe: { respostas: E.rel(abs), material: doc.material.dir, regra: "ratifica = desfecho das respostas da autora (cegas) igual ao da passada (1.2.0, origem medida); só a ratificação muda o S4' (crédito ratificado não sai)", ...conta, casos } };
}

// ───────────────────────────────────────────────────────────────── leitura das entradas

export interface ColetaTrio { formato: string; campanha: { id: string }; trio: string; linhaDeBase: unknown; slots: { slot: string; braco: string; posicao: number; escolhida: string | null }[] }
export interface CampanhaJson { campaignId: string; design: { arms?: string[]; seed?: string | number | null; repetitions?: number; comparisons?: { id: string; arms: string[]; role?: string }[]; screens?: { id: string }[] } }

/** Registro de leitura: toda entrada passa por aqui, e só o que passou por aqui pode entrar no manifesto. */
export class Entradas {
  private m = new Map<string, string>();
  private lidos = new Set<string>();
  rel(abs: string): string { const r = relative(TCC, abs); return r.startsWith("..") || isAbsolute(r) ? posix(abs) : posix(r); }
  texto(abs: string): string { const b = readFileSync(abs); this.registrar(abs, sha(b)); return b.toString("utf8").replace(/^﻿/, ""); }
  registrar(abs: string, s: string): void { const k = this.rel(abs); this.lidos.add(k); const v = this.m.get(k); if (v && v !== s) throw new Error(`${k}: lido duas vezes com sha256 diferente`); this.m.set(k, s); }
  /** Árvore inteira (a passada lida por `lerPassada`: lotes, chave, respostas e o resto) com o sha256 de cada arquivo. */
  arvore(dir: string): void {
    for (const f of readdirSync(dir)) { const abs = join(dir, f); if (statSync(abs).isDirectory()) this.arvore(abs); else this.registrar(abs, sha(readFileSync(abs))); }
  }
  manifesto(): Record<string, string> { return Object.fromEntries([...this.m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))); }
  /** Recusa se alguma entrada lida não tem sha256 no manifesto. */
  conferir(man: Record<string, string>): void { const faltam = [...this.lidos].filter(k => !/^[0-9a-f]{64}$/.test(man[k] ?? "")); if (faltam.length) throw new Error(`entradas sem sha256 no manifesto: ${faltam.join(", ")}`); }
}

export interface OpcoesRecalculo { passadas: string[]; analises?: string[]; coletas?: string[]; residuoPassada?: string | null; ratificacoes?: string | null; reamostragens?: number; origens?: string[];
  /** NAT-78 §4.5: sensibilidade por protocolo ao lado (lê a `summary.json` de cada análise). Sem ela, saída byte a byte a de antes. */
  porProtocolo?: boolean;
  /** Regra `cena-pela-spec-1.0.0` para cartão com segmentos (declarada depois da coleta da F3). Sem ela, saída byte a byte a de antes. */
  cenaPelaSpec?: boolean;
  /** `telas.json` lido para a declaração de níveis (F) ou de estratos (F2) (padrão: o deste repositório; os testes passam um sintético). */
  telas?: string }

export interface Recalculo { json: Record<string, unknown>; md: string }

/** Uma análise (= um trio) lida, com o pacote, a campanha, a referência e a coleta do trio. */
export interface AnaliseLida { dir: string; nome: string; pkg: SemanticPackage; camp: CampanhaJson; ref: Referencia; coleta: ColetaTrio; coletaArq: string; passada: Passada }
export type OrigemInfo = { passada: string; arquivo: string; sha256: string; versao: string; aplicacao: AplicacaoOrigem[] };
/** O que o recálculo (e a seleção da autora, entrega 6) lê: passadas, origem aplicada, trios, regra do desfecho e comparações. */
export interface CargaCampanha {
  passadas: Passada[]; derivadoNa: (p: Passada, id: string) => Derivado; origemInfo: OrigemInfo[];
  analises: AnaliseLida[]; camp: CampanhaJson; regra: RegraDesfecho; bracos: string[]; comps: Comparacao[];
  /** [D-156] Política do juiz das passadas (a mesma em todas, senão para): a do derivado que o recálculo lê. */
  politicaDoJuiz: VersaoPolitica;
}

/**
 * Lê e confere as entradas comuns (passadas congeladas, origem medida, análises/coletas), registrando cada uma em `E`.
 * Usada pelo `recalcular` e pela seleção do material da autora (`material-autora.ts`), para que os dois leiam as MESMAS
 * decisões pelo mesmo caminho.
 */
export function carregarCampanha(o: Pick<OpcoesRecalculo, "passadas" | "analises" | "coletas" | "origens">, E: Entradas): CargaCampanha {
  if (!o.passadas.length) throw new Error("--passada obrigatório (uma ou mais)");
  const passadas: Passada[] = [];
  for (const dir of o.passadas) {
    const p = lerPassada(dir, { analises: o.analises });
    E.arvore(join(p.dir, "lotes")); E.arvore(join(p.dir, "chave"));
    if (existsSync(join(p.dir, "respostas"))) E.arvore(join(p.dir, "respostas"));
    for (const f of ["julgamentos.json", "julgamentos.json.sha256"]) E.texto(join(p.dir, f));
    passadas.push(p);
  }
  const campanha = passadas[0].campanha;
  if (passadas.some(p => JSON.stringify(p.campanha) !== JSON.stringify(campanha))) throw new Error("passadas de campanhas diferentes");
  const politicaDoJuiz = passadas[0].politica;
  if (passadas.some(p => p.politica !== politicaDoJuiz)) throw new Error(`passadas em políticas do juiz diferentes (${passadas.map(p => `${p.nome}: ${p.politica}`).join(", ")}): um recálculo, uma política`);
  // Origem medida (entrega 5): uma pasta por passada, casada pelo sha256 dos julgamentos; derivados pela própria ingestão.
  const derivadoDe = new Map<string, Map<string, Derivado>>();
  const origemInfo: OrigemInfo[] = [];
  for (const d of o.origens ?? []) {
    const lo = lerOrigem(d);
    E.texto(lo.arquivo); E.texto(join(dirname(lo.arquivo), "origem.json.sha256"));
    const p = passadas.find(x => x.julgSha === lo.doc.passada?.julgamentosSha256);
    if (!p) throw new Error(`--origem ${d}: medida sobre a passada ${lo.doc.passada?.nome ?? "(nenhuma)"} (julgamentos ${String(lo.doc.passada?.julgamentosSha256).slice(0, 8)}…), que não está entre as --passada`);
    if (derivadoDe.has(p.nome)) throw new Error(`--origem: duas pastas de origem para a passada ${p.nome}`);
    const ap = aplicarOrigem(p, lo.doc);
    derivadoDe.set(p.nome, ap.derivados);
    origemInfo.push({ passada: p.nome, arquivo: E.rel(lo.arquivo), sha256: lo.sha256, versao: lo.doc.versao, aplicacao: ap.aplicacao });
  }
  const derivadoNa = (p: Passada, id: string): Derivado => derivadoDe.get(p.nome)?.get(id) ?? p.julgados.get(id)!.derivado;
  // Análises (= trios), com o pacote, a campanha, a referência e a coleta do trio.
  const analises: AnaliseLida[] = [];
  const coletasDadas = (o.coletas ?? []).map(c => resolve(c));
  for (const p of passadas) {
    const man = JSON.parse(p.manifestoTxt) as { analises: { dir: string; packageSha256: string }[] };
    for (const a of man.analises) {
      const dada = (o.analises ?? []).map(x => resolve(x)).find(x => basename(x) === a.dir);
      const abs = dada ?? pastaDaAnalise(p.dir, a.dir);
      const pTxt = E.texto(join(abs, "revisao", "package.json"));
      if (sha(readFileSync(join(abs, "revisao", "package.json"))) !== a.packageSha256) throw new Error(`análise ${a.dir}: package.json difere do manifesto da passada`);
      const pkg = JSON.parse(pTxt) as SemanticPackage;
      const camp = JSON.parse(E.texto(join(abs, "entradas", "campanha.json"))) as CampanhaJson;
      const ref = JSON.parse(E.texto(join(abs, "entradas", "referencia.json"))) as Referencia;
      const agentes = pkg.runs.filter(r => r.kind === "agente").map(r => r.id).sort();
      const casa = (c: ColetaTrio) => JSON.stringify(c.slots.map(s => s.escolhida).filter(Boolean).sort()) === JSON.stringify(agentes);
      let coletaArq = join(abs, "coleta-trio.json");
      if (!existsSync(coletaArq)) {
        const cands = coletasDadas.filter(f => casa(JSON.parse(lerTexto(f)) as ColetaTrio));
        if (cands.length !== 1) throw new Error(`análise ${a.dir}: sem coleta-trio.json na pasta e ${cands.length} --coleta com as mesmas execuções escolhidas (passe exatamente um)`);
        coletaArq = cands[0];
      }
      const coleta = JSON.parse(E.texto(coletaArq)) as ColetaTrio;
      if (coleta.campanha.id !== camp.campaignId) throw new Error(`${coletaArq}: campanha ${coleta.campanha.id} ≠ ${camp.campaignId}`);
      if (!casa(coleta)) throw new Error(`${coletaArq}: execuções escolhidas ≠ execuções de agente do pacote de ${a.dir}`);
      analises.push({ dir: abs, nome: a.dir, pkg, camp, ref, coleta, coletaArq, passada: p });
    }
  }
  const trioIds = analises.map(a => a.coleta.trio);
  if (new Set(trioIds).size !== trioIds.length) throw new Error(`trio repetido entre as análises: ${trioIds.join(", ")}`);
  const camp = analises[0].camp;
  if (analises.some(a => a.camp.campaignId !== camp.campaignId)) throw new Error("análises de campanhas diferentes");
  const telas = [...new Set(analises.map(a => a.ref._meta.suite ?? camp.design.screens?.[0]?.id ?? "?"))];
  if (telas.length !== 1) throw new Error(`uma campanha por tela: ${telas.join(", ")}`);
  const regra = regraDaTela(telas[0], analises[0].ref);
  if (analises.some(a => sha(JSON.stringify(a.ref)) !== sha(JSON.stringify(analises[0].ref)))) throw new Error("referências diferentes entre os trios");
  const bracos = camp.design.arms ?? ["sem", "com"];
  const comps: Comparacao[] = (camp.design.comparisons ?? []).map(c => {
    if (c.arms.length !== 2 || !c.arms.every(x => bracos.includes(x))) throw new Error(`comparação ${c.id} com braços fora do desenho`);
    return { id: c.id, arms: [c.arms[0], c.arms[1]] as [string, string], role: c.role ?? null };
  });
  if (!comps.length) throw new Error("campanha sem design.comparisons");
  comps.sort((x, y) => (x.role === "primary" ? 0 : 1) - (y.role === "primary" ? 0 : 1));
  return { passadas, derivadoNa, origemInfo, analises, camp, regra, bracos, comps, politicaDoJuiz };
}

/** Cartões julgados de um trio, com o derivado da passada (com a origem medida aplicada, se houver). */
export function julgadosDoTrio(a: AnaliseLida, derivadoNa: CargaCampanha["derivadoNa"]): CartaoJulgado[] {
  const p = a.passada;
  return p.itens.filter(i => i.par === a.nome).map(i => ({ id: i.id, cardId: i.cardIdOriginal, braco: i.braco, runId: i.runId,
    derivado: derivadoNa(p, i.id), resposta: p.julgados.get(i.id)!.resposta }));
}

export function recalcular(o: OpcoesRecalculo): Recalculo {
  if (!o.passadas.length) throw new Error("--passada obrigatório (uma ou mais)");
  const E = new Entradas();
  const { passadas, derivadoNa, origemInfo, analises, camp, regra, bracos, comps, politicaDoJuiz } = carregarCampanha(o, E);
  // [tela F] Arquivo de níveis, só para a tela que o declara em telas.json (a F tem de declarar), conferido antes de qualquer
  // conta; sem a declaração, nada muda (telas.json nem entra no manifesto). A tabela por nível sai depois dos créditos.
  const refSha = E.manifesto()[E.rel(join(analises[0].dir, "entradas", "referencia.json"))];
  const niveis = lerNiveis(regra.tela, analises[0].ref, refSha, E, o.telas ?? TELAS_JSON);
  if (!niveis && regra.tela === "processos-f") throw new Error("tela processos-f sem telas.json › processos-f.niveis: a tabela por nível é pré-declarada (adendo da F §2)");
  // [tela F2] Arquivo de estratos (tipo e nível por spec semeada), pelo mesmo caminho; a F2 tem de declarar, e nenhuma tela
  // declara os dois (os níveis teriam duas fontes). Sem a declaração, nada muda (nada lido para o manifesto).
  const estratos = lerEstratos(regra.tela, analises[0].ref, refSha, E, o.telas ?? TELAS_JSON);
  if (estratos && niveis) throw new Error(`tela ${regra.tela} declara telas.json › ${regra.tela}.niveis e .estratos: os níveis teriam duas fontes (declare só um)`);
  if (!estratos && regra.tela === "processos-f2") throw new Error("tela processos-f2 sem telas.json › processos-f2.estratos: as tabelas por tipo e por nível são pré-declaradas (adendo 2 da F2 §6)");
  // [tela F3] Mesmo caminho, com o formato da F3 (origem e controle da varredura): sem ele não há a sensibilidade pré-declarada.
  if (!estratos && regra.tela === "processos-f3") throw new Error("tela processos-f3 sem telas.json › processos-f3.estratos: a sensibilidade sem os controles da varredura e as tabelas por tipo, origem, nível e interação são pré-declaradas (adendo 3 da F3 §6)");
  const formatoExigido = FORMATO_ESTRATOS_DA_TELA[regra.tela];
  if (estratos && formatoExigido && estratos.doc.formato !== formatoExigido) throw new Error(`tela ${regra.tela}: arquivo de estratos no formato ${estratos.doc.formato} ≠ ${formatoExigido} (o formato é o da tela)`);

  // Contestados (S4'), ratificações, resíduo.
  const contestados: (Contestado & { passada: string })[] = [];
  const s4: { disponivel: boolean; motivo: string | null; arquivos: string[] } = { disponivel: true, motivo: null, arquivos: [] };
  for (const p of passadas) {
    const cAbs = join(p.dir, "contestados.json");
    if (!existsSync(cAbs)) { s4.disponivel = false; s4.motivo = `${p.nome}: sem contestados.json (passada sem adjudicação aplicada); S4' indisponível`; continue; }
    const cTxt = E.texto(cAbs), sTxt = E.texto(join(p.dir, "contestados.json.sha256"));
    if (sTxt.trim().split(/\s+/)[0] !== sha(cTxt)) throw new Error(`${cAbs}: não confere com contestados.json.sha256`);
    const doc = JSON.parse(cTxt) as { formato: string; passada: { julgamentosSha256: string }; cartoes: Contestado[] };
    if (doc.formato !== "nat78-revisao-contestados-1.0.0") throw new Error(`${cAbs}: formato ${doc.formato}`);
    const prim = join(p.dir, "julgamentos-1a-passada.json");
    if (!existsSync(prim) || sha(E.texto(prim)) !== doc.passada.julgamentosSha256) throw new Error(`${cAbs}: a 1ª passada citada não confere com julgamentos-1a-passada.json`);
    for (const c of doc.cartoes) { const it = p.item.get(c.id); if (!it || it.chave !== c.chave || it.braco !== c.braco) throw new Error(`${cAbs}: ${c.id} não confere com a chave da passada`); contestados.push({ ...c, passada: p.nome }); }
    s4.arquivos.push(E.rel(cAbs));
  }
  const ratificados = new Set<string>();
  let ratInfo = "nenhuma ratificação da autora dada (--ratificacoes ausente): nenhum crédito ratificado";
  let autoraInfo: Record<string, unknown> | null = null;
  if (o.ratificacoes) {
    const rAbs = resolve(o.ratificacoes);
    const doc = JSON.parse(E.texto(rAbs)) as { formato: string; ratificados: { id: string; chave: string }[] };
    if (doc.formato === FORMATO_RESPOSTAS_AUTORA) {
      // Entrega 6: respostas cegas da autora ao material (`material-autora.ts responder`); ratifica quem concorda com a passada.
      const r = ratificacoesDaAutora(rAbs, doc as unknown as DocRespostasAutora, E, passadas, derivadoNa);
      for (const id of r.ratificados) ratificados.add(id);
      ratInfo = r.info; autoraInfo = r.detalhe;
    } else {
      if (doc.formato !== FORMATO_RATIFICACOES) throw new Error(`--ratificacoes: formato ${doc.formato} ≠ ${FORMATO_RATIFICACOES} nem ${FORMATO_RESPOSTAS_AUTORA}`);
      for (const r of doc.ratificados) {
        if (!passadas.some(p => p.item.get(r.id)?.chave === r.chave)) throw new Error(`--ratificacoes: ${r.id} não é cartão das passadas`);
        ratificados.add(r.id);
      }
      ratInfo = `${ratificados.size} cartão(ões) ratificado(s) pela autora (${E.rel(rAbs)})`;
    }
  }
  // Resíduo por cartão, da própria passada ou de outra passada sobre os MESMOS cartões: casados pela identidade do cartão
  // (id original + sha256 do cartão no pacote), porque outra passada pode ter sido preparada sobre outra análise do mesmo
  // pacote (outra pasta, outra chave textual).
  const idCartao = (i: { cardIdOriginal: string; cardSha256: string }) => `${i.cardIdOriginal}|${i.cardSha256}`;
  const residuo = new Map<string, string[]>();
  let residuoInfo: Record<string, unknown> = { disponivel: false, motivo: "sem residuo-de-braco.json na passada e sem --residuo-passada" };
  {
    const fontesRes = o.residuoPassada ? [resolve(o.residuoPassada)] : passadas.map(p => p.dir).filter(d => existsSync(join(d, "residuo-de-braco.json")));
    if (fontesRes.length) {
      const porBraco: Record<string, unknown>[] = [];
      for (const d of fontesRes) {
        const rAbs = join(d, "residuo-de-braco.json");
        if (!existsSync(rAbs)) throw new Error(`--residuo-passada ${d}: sem residuo-de-braco.json`);
        const r = JSON.parse(E.texto(rAbs)) as { formato: string; versao: string; porCartao: { id: string; braco: string; categorias: string[] }[]; porBraco: Record<string, unknown> };
        const ch = JSON.parse(E.texto(join(d, "chave", "fila-t3-chave.json"))) as { itens: { id: string; braco: string; cardIdOriginal: string; cardSha256: string }[] };
        const chaveDe = new Map(ch.itens.map(i => [i.id, i]));
        for (const c of r.porCartao) { const i = chaveDe.get(c.id); if (!i || i.braco !== c.braco) throw new Error(`${rAbs}: ${c.id} sem item na chave da passada do resíduo`); residuo.set(idCartao(i), c.categorias); }
        porBraco.push({ arquivo: E.rel(rAbs), versao: r.versao, porBraco: r.porBraco });
      }
      const faltam = passadas.flatMap(p => p.itens.filter(i => !residuo.has(idCartao(i))).map(i => i.id));
      if (faltam.length) throw new Error(`resíduo sem ${faltam.length} cartão(ões) das passadas (ex.: ${faltam.slice(0, 3).join(", ")}): o resíduo tem de cobrir os mesmos cartões`);
      residuoInfo = { disponivel: true, origem: porBraco, nota: o.residuoPassada ? "resíduo medido em outra passada sobre os mesmos cartões (casados pelo id original + sha256 do cartão): mede o que o juiz DAQUELA passada viu (a máscara dela), não necessariamente o desta" : "resíduo da própria passada" };
    }
  }

  // Créditos por trio × variante × política.
  const trios: TrioEntrada[] = [];
  const s4PorBraco: Record<string, { creditosSoLLM: number; comResiduo: number | null; contestadosComCredito: number; retiradosS4: number; ratificados: number }> = {};
  const recusas: Record<string, unknown>[] = [];
  const removidosTodos = new Set<string>();
  const specDeTodos = new Map<string, string>();
  const cenaTotal: Record<string, ContagemCena> | null = o.cenaPelaSpec ? {} : null;
  for (const a of ordenar(analises, x => x.coleta.trio)) {
    for (const u of a.pkg.units) specDeTodos.set(u.id, u.specId);
    const p = a.passada;
    const julgados = julgadosDoTrio(a, derivadoNa);
    const credita12 = (id: string) => vereditoNaPolitica(derivadoNa(p, id), "1.2.0").veredito === "reference";
    const removidos = removidosS4(contestados.filter(c => c.passada === p.nome && julgados.some(j => j.id === c.id)), credita12, ratificados);
    for (const r of removidos) removidosTodos.add(r);
    const creditos: TrioEntrada["creditos"] = {};
    const fonte = `${p.nome}/julgamentos.json sha256:${p.julgSha}`;
    for (const v of ["principal", "S4'"] as Variante[]) for (const pol of POLITICAS) {
      if (v === "S4'" && !s4.disponivel) continue;
      const cr = creditosDoTrio(a.pkg, julgados, { politica: pol, removidos: v === "S4'" ? removidos : undefined, reviewer: `${RECALCULO_VERSAO} · ${p.nome}`, fonte, bracos,
        ...(o.cenaPelaSpec ? { cenaPelaSpec: true } : {}) });
      if (cenaTotal && v === "principal" && pol === "1.2.0") for (const [b, x] of Object.entries(cr.cenaPelaSpec ?? {})) {
        const t = (cenaTotal[b] ??= { segmentados: 0, referencia: 0, naoReferencia: 0, pendentes: {} });
        t.segmentados += x.segmentados; t.referencia += x.referencia; t.naoReferencia += x.naoReferencia;
        for (const [k, n] of Object.entries(x.pendentes)) t.pendentes[k] = (t.pendentes[k] ?? 0) + n;
      }
      creditos[chaveVariante(v, pol)] = Object.fromEntries(Object.entries(cr.porBraco).map(([b, x]) => [b, { confirmadas: x.confirmadas, admissiveis: x.admissiveis, pendentes: x.pendentes.length }]));
      if (cr.recusados.length) recusas.push({ trio: a.coleta.trio, variante: v, politica: pol, recusados: cr.recusados });
      if (v === "principal" && pol === "1.2.0") for (const [b, x] of Object.entries(cr.porBraco)) {
        const s = (s4PorBraco[b] ??= { creditosSoLLM: 0, comResiduo: residuo.size ? 0 : null, contestadosComCredito: 0, retiradosS4: 0, ratificados: 0 });
        for (const id of x.creditados) {
          if (ratificados.has(id)) { s.ratificados++; continue; }
          s.creditosSoLLM++;
          if (residuo.size && (residuo.get(idCartao(p.item.get(id)!)) ?? []).length) s.comResiduo!++;
          if (contestados.some(c => c.id === id)) s.contestadosComCredito++;
          if (removidos.has(id)) s.retiradosS4++;
        }
      }
    }
    const ordem = [...a.coleta.slots].sort((x, y) => x.posicao - y.posicao).map(s => s.braco);
    trios.push({ trio: a.coleta.trio, ordem, linhaDeBase: a.coleta.linhaDeBase, creditos });
  }
  const specDe = (u: string) => specDeTodos.get(u);
  const nPlanejado = typeof camp.design.repetitions === "number" ? camp.design.repetitions : null;
  const sementeBase = camp.design.seed !== null && camp.design.seed !== undefined ? `campanha.design.seed=${camp.design.seed}` : `sem-semente-declarada|${camp.campaignId}`;
  const tabelas: Record<string, TabelaComparacao[]> = {};
  for (const v of ["principal", "S4'"] as Variante[]) for (const pol of POLITICAS) for (const conj of regra.conjuntos.map(x => x.id)) {
    if (v === "S4'" && !s4.disponivel) continue;
    tabelas[`${v}|${pol}|${conj}`] = comps.map(c => tabelaDaComparacao(trios, c, { variante: v, politica: pol, conjunto: conj, regra, specDe, nPlanejado, sementeBase, reamostragens: o.reamostragens }));
  }
  const ensaio = /^ensaio/.test(camp.campaignId);
  const json: Record<string, unknown> = {
    formato: FORMATO_RECALCULO, versao: RECALCULO_VERSAO, campanha: camp.campaignId, tela: regra.tela, referencia: regra.referencia,
    aviso: ensaio ? "ENSAIO fora da amostra (§7.4): nenhum número daqui é resultado; prova só que o caminho produz a tabela" : null,
    politicas: { principal: rotuloPolitica(politicaDoJuiz), aoLado: POLITICA_SENSIBILIDADE },
    ...(politicaDoJuiz === "1.3.0" ? { notaPolitica: NOTA_POLITICA_13, citacoesPorReferencia: citacoesPorReferencia(analises, derivadoNa) } : {}),
    regraDoDesfecho: regra, delta: { valor: DELTA, unidade: regra.unidadeDelta },
    passadas: passadas.map(p => ({ nome: p.nome, dir: E.rel(p.dir), versao: p.versao, julgamentosSha256: p.julgSha, adjudicada: existsSync(join(p.dir, "contestados.json")) })),
    sementes: { base: sementeBase, regra: "sementeOrigem = base|recalculo|<comparação>|<variante>|<política>|<conjunto> (mulberry32 via sementeDoTexto, estatistica-pareada)" },
    trios: trios.map(t => ({ trio: t.trio, ordem: t.ordem, linhaDeBase: t.linhaDeBase, creditos: t.creditos })),
    s4: { ...s4, ratificacoes: ratInfo, regra: "S4' = recalculado tirando, nos dois braços, todo crédito (1.2.0) de cartão contestado (contestados.json: 1ª passada ≠ adjudicação ou desacordo na amostra) que a autora não ratificou; o crédito sai do braço que o recebeu; a mesma lista vale para a 1.1.0",
      retirados: [...removidosTodos].sort(), contestados: contestados.map(c => ({ id: c.id, braco: c.braco, motivos: c.motivos, creditoFinal: c.creditoFinal, retirado: removidosTodos.has(c.id) })),
      porBraco: s4PorBraco, ...(autoraInfo ? { autora: autoraInfo } : {}) },
    residuoDeBraco: residuoInfo, recusasDoScorer: recusas, tabelas,
  };
  if (cenaTotal) json.cenaPelaSpec = { regra: REGRA_CENA_PELA_SPEC, definicao: DEFINICAO_CENA_PELA_SPEC,
    declarada: "depois da coleta (desvio declarado): a passada cega não pergunta a cena; sem a regra, todo cartão com segmentos fica pendente",
    contagem: "política 1.2.0, leitura principal, somada nos trios", porBraco: Object.fromEntries(Object.entries(cenaTotal).sort(([x], [y]) => (x < y ? -1 : 1))) };
  if (o.origens?.length) json.origem = resumoDaOrigem(passadas, origemInfo, derivadoNa);
  // Coluna fundamentada com as suas sensibilidades, só quando a regra da tela as declara (tela E): mesma passada, mesmo
  // derivado; sem a declaração (D, A), nada muda.
  const fund = regra.fundamentada?.length ? colunaFundamentada(regra, bracos, ordenar(analises, x => x.coleta.trio).map(a =>
    ({ trio: a.coleta.trio, porBraco: fundamentadaDoTrio(a.pkg, julgadosDoTrio(a, derivadoNa), bracos, regra.fundamentada!) }))) : null;
  if (fund) json.fundamentada = fund;
  const fundDesc: FundamentadaPorTrio[] = !niveis && !estratos ? [] : ordenar(analises, x => x.coleta.trio).map(a =>
    ({ trio: a.coleta.trio, porBraco: fundamentadaDoTrio(a.pkg, julgadosDoTrio(a, derivadoNa), bracos, []) }));
  const porTipo = estratos ? tabelaPorTipo(estratos, regra.tela, trios, fundDesc, bracos, specDe) : null;
  if (porTipo) json.porTipo = porTipo;
  const porNivel = niveis ? tabelaPorNivel(niveis, regra.tela, trios, fundDesc, bracos, specDe)
    : estratos ? tabelaPorNivelDosEstratos(estratos, regra.tela, trios, fundDesc, bracos, specDe) : null;
  if (porNivel) json.porNivel = porNivel;
  const porInteracao = estratos ? tabelaPorInteracao(estratos, regra.tela, trios, fundDesc, bracos, specDe) : null;
  if (porInteracao) json.porInteracao = porInteracao;
  // [tela F3] Por origem (descritiva) e a sensibilidade sem os controles da varredura, só no formato da F3.
  const f3 = estratos?.doc.formato === FORMATO_ESTRATOS_F3 ? estratos : null;
  const porOrigem = f3 ? tabelaPorOrigem(f3, regra.tela, trios, fundDesc, bracos, specDe) : null;
  if (porOrigem) json.porOrigem = porOrigem;
  const semControles = f3 ? sensibilidadeSemControles(f3, regra.tela, regra, trios, comps, { specDe, nPlanejado, sementeBase, reamostragens: o.reamostragens }) : null;
  if (semControles) json.semControles = semControles;
  const pp = o.porProtocolo ? sensibilidadePorProtocolo(analises, trios, E, { regra, specDe, comps, nPlanejado, sementeBase, reamostragens: o.reamostragens }) : null;
  if (pp) json.sensibilidadePorProtocolo = pp;
  json.entradas = E.manifesto();
  E.conferir(json.entradas as Record<string, string>);
  return { json, md: tabelaMd(json, tabelas, regra, comps, s4.disponivel, semControles) + (fund ? fundamentadaMd(fund, regra, bracos) : "") + (porTipo ? porTipoMd(porTipo) : "") + (porNivel ? porNivelMd(porNivel) : "") + (porInteracao ? porInteracaoMd(porInteracao) : "") + (porOrigem ? porOrigemMd(porOrigem) : "") + (pp ? porProtocoloMd(pp, regra) : "") };
}

export interface SensibilidadePorProtocolo {
  formato: typeof FORMATO_POR_PROTOCOLO; leitura: typeof LEITURA_POR_PROTOCOLO; tipo: typeof TIPO_POR_PROTOCOLO; aviso: string;
  /** A definição de aderência aplicada (versão + estado exigido por braço), de `DEFINICAO_POR_PROTOCOLO` (e14-deteccao.ts). */
  definicao: PorProtocolo["definicao"];
  trioComSlotFora: ModoTrioForaProtocolo; regra: string;
  /** [D-198] Por braço: slots com estado do oráculo, no conjunto por protocolo, excluídos por estado que os tirou. */
  exclusoesPorBraco: Record<string, ExclusaoDoBraco>;
  /** Estado do oráculo e situação de cada slot, por trio. */
  trios: TrioProtocolo[];
  /** Slots `used-with-errors`, à parte: a contagem do slot no primário (política 1.2.0, conjunto primário), nunca somada ao conjunto. */
  comErros: { trio: string; braco: string; runId: string; contagem: { min: number; max: number } | null }[];
  /** Só a variante principal, a política principal e o conjunto primário; chave `sensibilidade-por-protocolo|principal|1.2.0|primario`. */
  tabelas: Record<string, TabelaPorProtocolo[]>;
}

/** A leitura por protocolo do recálculo: estado do oráculo de cada slot (summary.json, registrada em `E`) e as comparações. */
export function sensibilidadePorProtocolo(analises: AnaliseLida[], trios: TrioEntrada[], E: Entradas,
  o: { regra: RegraDesfecho; specDe: (u: string) => string | undefined; comps: Comparacao[]; nPlanejado: number | null; sementeBase: string; reamostragens?: number }): SensibilidadePorProtocolo {
  const estados: TrioProtocolo[] = ordenar(analises, x => x.coleta.trio).map(a => {
    const resumo = JSON.parse(E.texto(join(a.dir, "summary.json"))) as { execucoes?: ExecucaoDoResumo[] };
    if (!Array.isArray(resumo.execucoes)) throw new Error(`por protocolo: ${a.nome}/summary.json sem execucoes`);
    return slotsPorProtocolo(a.coleta.trio, a.coleta.slots, resumo.execucoes);
  });
  const comErros: SensibilidadePorProtocolo["comErros"] = [];
  const cnt = contar(o.regra, "primario", o.specDe);
  for (const e of estados) for (const s of e.slots) {
    if (s.situacao === "fora-com-erros") {
      const cr = trios.find(t => t.trio === e.trio)?.creditos[chaveVariante("principal", "1.2.0")]?.[s.braco];
      comErros.push({ trio: e.trio, braco: s.braco, runId: s.runId, contagem: cr ? { min: cnt(cr.confirmadas), max: cnt([...cr.confirmadas, ...cr.admissiveis]) } : null });
    }
  }
  const tabelas = { [chavePorProtocolo("principal", "1.2.0", "primario")]: o.comps.map(c => tabelaPorProtocolo(trios, estados, c,
    { variante: "principal", politica: "1.2.0", conjunto: "primario", regra: o.regra, specDe: o.specDe, nPlanejado: o.nPlanejado, sementeBase: o.sementeBase, reamostragens: o.reamostragens })) };
  const bracos = [...new Set([...o.comps.flatMap(c => c.arms), ...estados.flatMap(e => e.slots.map(s => s.braco))])];
  return { formato: FORMATO_POR_PROTOCOLO, leitura: LEITURA_POR_PROTOCOLO, tipo: TIPO_POR_PROTOCOLO, aviso: AVISO_POR_PROTOCOLO, definicao: definicaoPorProtocolo(), trioComSlotFora: TRIO_COM_SLOT_FORA,
    regra: `slot no conjunto quando o estado do oráculo (summary.json › mcpIsolamento.usoOraculo = run.status.oracleUsage) é o exigido pelo braço; trio com slot fora: ${TRIO_COM_SLOT_FORA === "trio-inteiro" ? "sai de todas as comparações por protocolo" : "sai só das comparações com o braço do slot"} e é listado; slot perdido segue a regra do trio incompleto (§6.3); used-with-errors fora, à parte com a contagem do slot`,
    exclusoesPorBraco: exclusoesPorBraco(estados.flatMap(e => e.slots), bracos), trios: estados, comErros: ordenar(comErros, x => `${x.trio}|${x.braco}`), tabelas };
}

/** Seção da coluna fundamentada (descritiva) e das suas sensibilidades no tabela.md. */
export function fundamentadaMd(f: ColunaFundamentada, regra: RegraDesfecho, bracos: readonly string[]): string {
  const L = ["", "## Coluna fundamentada (descritiva, sem teste) e a sensibilidade \"sem ids expostos\"", "",
    `Regra: ${f.regra}.`, ""];
  for (const s of f.sensibilidades) L.push(`- \`${s.id}\`: ${s.rotulo}.`);
  L.push("");
  for (const [conj, porLeitura] of Object.entries(f.contagens)) {
    L.push(`### ${conjuntoDe(regra, conj).rotulo}`, "", `| leitura | ${bracos.map(b => `${b} (por trio)`).join(" | ")} |`, `|---|${bracos.map(() => "---").join("|")}|`);
    for (const [l, porBraco] of Object.entries(porLeitura)) L.push(`| ${l} | ${bracos.map(b => porBraco[b].map(x => x ?? "—").join(", ")).join(" | ")} |`);
    L.push("");
  }
  const expostos = f.porTrio.flatMap(t => Object.entries(t.porBraco).flatMap(([b, x]) => Object.entries(x.porNormaExposta).flatMap(([s, cs]) => cs.map(c => `${c.id} (${t.trio}, ${b}, ${c.spec}; ${s})`))));
  const alias = f.porTrio.flatMap(t => Object.entries(t.porBraco).flatMap(([b, x]) => Object.entries(x.porAlias).flatMap(([s, cs]) => cs.map(c => `${c.id} (${t.trio}, ${b}, ${c.spec}, ${c.norma}; ${s})`))));
  L.push(`Fundamentados só por norma exposta: ${expostos.length ? expostos.join("; ") : "nenhum"}.`, "",
    `Por id de verificação (alias; contados como na principal, não resolvidos aqui): ${alias.length ? alias.join("; ") : "nenhum"}.`, "");
  return L.join("\n");
}

function porProtocoloMd(pp: SensibilidadePorProtocolo, regra: RegraDesfecho): string {
  const bs = [...new Set(pp.trios.flatMap(t => t.slots.map(s => s.braco)))];
  const L = ["", "## ANÁLISE DE SENSIBILIDADE — por protocolo (NAT-78 §4.5); não é o primário, nunca no lugar dele", "",
    `Leitura \`${pp.leitura}\` (tipo \`${pp.tipo}\`, \`${pp.formato}\`, definição \`${pp.definicao.versao}\`): ${pp.aviso}. Conjunto por protocolo: ${Object.entries(pp.definicao.estadoExigido).map(([b, e]) => `\`${b}\` com \`${e}\``).join("; ")}. ` +
      `Trio com slot fora: **${pp.trioComSlotFora === "trio-inteiro" ? "sai de todas as comparações desta leitura" : "sai só das comparações com o braço do slot"}** (listado). ` +
      `Desfecho: ${conjuntoDe(regra, "primario").rotulo}, política 1.2.0 (a chave do principal). Semente própria (\`…|${pp.leitura}|recalculo|…\`).`, "",
    "### Exclusões por braço", "", ...exclusoesMd(pp.exclusoesPorBraco), "",
    "### Estado do oráculo por trio e slot", "",
    `| trio | ${bs.join(" | ")} |`, `|---|${bs.map(() => "---").join("|")}|`];
  for (const t of pp.trios) L.push(`| ${t.trio} | ${bs.map(b => { const s = t.slots.find(x => x.braco === b); return !s ? "slot perdido" : s.situacao === "no-conjunto" ? `\`${s.estado}\`` : `**fora: \`${s.estado}\`**`; }).join(" | ")} |`);
  L.push("");
  for (const t of pp.tabelas[chavePorProtocolo("principal", "1.2.0", "primario")]) {
    L.push(...blocoComparacao(t).map(x => x.replace(/^### (.*)$/, `### $1 — ${pp.leitura}`)));
    L.push(`- Fora desta comparação por protocolo: ${t.foraDaComparacao.length ? t.foraDaComparacao.map(f => `${f.trio} (${f.slots.map(s => `${s.braco} \`${s.estado}\``).join(", ")})`).join("; ") : "nenhum trio"}.`, "");
  }
  L.push("### Usado com erros (`used-with-errors`): fora do conjunto por protocolo, à parte", "");
  if (pp.comErros.length) {
    L.push("| trio | braço | execução | contagem no primário (1.2.0) |", "|---|---|---|---|");
    for (const x of pp.comErros) L.push(`| ${x.trio} | ${x.braco} | ${x.runId} | ${lim(x.contagem)} |`);
  } else L.push("Nenhum slot com `used-with-errors`.");
  L.push("");
  return L.join("\n");
}

/** [D-156] As chaves `principal|1.2.0|…` continuam as de sempre; na política do juiz 1.3.0 elas leem o derivado 1.3.0. */
export const NOTA_POLITICA_13 = "política do juiz 1.3.0 (R16: a referência secundária só resgata a citação, nunca o fato): as tabelas 'principal|1.2.0|…' usam o derivado da passada (1.3.0, crédito da 1.2.0 + R16) e as '…|1.1.0|…' tiram desse mesmo derivado o crédito da R15 e da Q1 a";

/**
 * [D-156] Cartões cuja classe veio de uma referência secundária, com a proveniência em campos distintos: a regra
 * originalmente citada (no cartão cego e no achado) e o julgamento dela, e a referência efetivamente usada (id no cartão,
 * regra pública, regra como o agente a escreveu, força/aplicabilidade/violação julgadas dela).
 */
export function citacoesPorReferencia(analises: AnaliseLida[], derivadoNa: CargaCampanha["derivadoNa"]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const a of ordenar(analises, x => x.coleta.trio)) {
    const cards = new Map(a.pkg.cards.map(c => [c.id, c]));
    for (const j of julgadosDoTrio(a, derivadoNa)) {
      const d = j.derivado;
      if (!d.citacaoPor) continue;
      const card = cards.get(j.cardId)!, k = ["REF1", "REF2"].indexOf(d.citacaoPor);
      const c = d.citacao ?? null;
      out.push({ id: j.id, trio: a.coleta.trio, braco: j.braco, passada: a.passada.nome, classe: d.classe, spec: d.spec, fundamentacao: d.fundamentacao,
        regraCitada: { cartao: c?.regraCitada ?? null, achado: card.rule ?? null, julgada: c?.primaria ?? null },
        referenciaUsada: { id: d.citacaoPor, regra: c?.referencia.regra ?? null, achado: referenciasDoAchado(card)[k] ?? null,
          forca: c?.referencia.forca ?? null, aplicabilidade: c?.referencia.aplicabilidade ?? null, violada: c?.referencia.violada ?? null },
        credita: vereditoNaPolitica(d, "1.2.0").veredito === "reference" });
    }
  }
  return ordenar(out, x => x.id as string);
}

/**
 * Origem medida por braço (§8.6, estrato 4 do §8.4): classes das violações com a origem medida, o que mudou, o crédito que
 * saiu (vínculo de cartão cuja origem medida é DS) e os candidatos do estrato 4 (violações atribuídas ao DS).
 */
export function resumoDaOrigem(passadas: Passada[], info: { passada: string; arquivo: string; sha256: string; versao: string; aplicacao: AplicacaoOrigem[] }[], derivadoNa: (p: Passada, id: string) => Derivado): Record<string, unknown> {
  const porBraco: Record<string, Record<string, number>> = {};
  const estrato4: { id: string; braco: string; passada: string }[] = [], mudancas: Record<string, unknown>[] = [], semOrigem: string[] = [];
  for (const p of passadas) {
    const inf = info.find(x => x.passada === p.nome);
    if (!inf) { semOrigem.push(p.nome); continue; }
    for (const it of p.itens) {
      const d = derivadoNa(p, it.id);
      if (!d.classe.startsWith("violacao")) continue;
      const b = (porBraco[it.braco] ??= { "violacao-pagina": 0, "violacao-ds": 0, "violacao-origem-indeterminada": 0, creditadas: 0 });
      b[d.classe]++;
      if (vereditoNaPolitica(d, "1.2.0").veredito === "reference") b.creditadas++;
      if (d.classe === "violacao-ds") estrato4.push({ id: it.id, braco: it.braco, passada: p.nome });
    }
    for (const a of inf.aplicacao) if (a.classeAntes !== a.classeDepois || a.creditoAntes !== a.creditoDepois)
      mudancas.push({ id: a.id, braco: p.item.get(a.id)!.braco, passada: p.nome, origemMedida: a.origemMedida, classeAntes: a.classeAntes, classeDepois: a.classeDepois, specAntes: a.specAntes, creditoAntes: a.creditoAntes, creditoDepois: a.creditoDepois });
  }
  return {
    regra: "origem medida (D-129, origem-campanha.ts) aplicada pela derivação da ingestão: violação → violacao-pagina (pagina, pagina-copiando-exemplo-ds) / violacao-ds (ds-entregue) / violacao-origem-indeterminada (indeterminada); origem DS tira o crédito do vínculo (P3/R5 da política 1.2.0)",
    arquivos: info.map(i => ({ passada: i.passada, arquivo: i.arquivo, sha256: i.sha256, versao: i.versao })),
    passadasSemOrigem: semOrigem, porBraco, mudancas, creditoRetirado: mudancas.filter(m => m.creditoAntes && !m.creditoDepois).map(m => m.id),
    estrato4: { nota: "candidatos do estrato 4 do §8.4 (origem DS, D-129): violações com origem medida ds-entregue; a seleção (≤ 2, semente da campanha) é a entrega 6", cartoes: ordenar(estrato4, x => x.id) },
  };
}

// ───────────────────────────────────────────────────────────────── tabela.md

const fmt = (x: number | null | undefined, d = 2): string => (x === null || x === undefined ? "n/d" : Number.isInteger(x) ? String(x) : x.toFixed(d).replace(".", ","));
const lim = (x: { min: number; max: number } | null) => (!x ? "—" : x.min === x.max ? String(x.min) : `${x.min} [≤${x.max}]`);

function blocoComparacao(t: TabelaComparacao): string[] {
  const [a, b] = t.bracos, e = t.estatistica;
  const L = [`### ${t.nome} — ${a} × ${b}${t.papel === "primary" ? " (primária)" : " (secundária)"}`, "",
    `${t.formula} · desfecho: ${t.conjunto} · δ = ${t.delta} ${t.unidadeDelta}`, "",
    `| trio | posição ${a}/${b} | ${a} | ${b} | ${t.nome} | estado |`, "|---|---|---|---|---|---|"];
  for (const r of t.porTrio) L.push(`| ${r.trio} | ${r.posicoes[a] ?? "—"}/${r.posicoes[b] ?? "—"} | ${lim(r.a)} | ${lim(r.b)} | ${r.d === null ? "—" : r.dMin === r.dMax ? r.d : `${r.d} [${r.dMin}, ${r.dMax}]`} | ${r.estado} |`);
  L.push("", `- Campanha (${t.estado}): média ${fmt(e.media)}, mediana ${fmt(e.mediana)}, DP ${fmt(e.desvioPadrao)}; n efetivo ${t.nEfetivo}, planejado ${t.nPlanejado ?? "n/d"}` +
    (t.estado === "PROVISORIO" ? `; envoltória da média [${fmt(t.envoltoriaMedia.min)}, ${fmt(t.envoltoriaMedia.max)}]` : ""),
    `- Permutação exata por troca de sinais: p ${fmt(e.principal.p, 4)}${e.principal.nota ? ` (${e.principal.nota})` : ""}; Wilcoxon-Pratt p ${fmt(e.robustez.wilcoxon.p, 4)}; sinal p ${fmt(e.robustez.sinal.p, 4)}`,
    `- IC 95% bootstrap: ${e.ic.disponivel ? `[${fmt(e.ic.inferior)}, ${fmt(e.ic.superior)}]` : e.ic.motivo}`,
    `- **Leitura congelada (§6.3):** ${e.leitura}. **Leitura com δ:** ${t.leituraDelta}.`, "");
  return L;
}

function linhaCompacta(t: TabelaComparacao): string {
  return `| ${t.nome} | ${t.porTrio.map(r => `${r.trio}: ${r.d ?? "—"}`).join("; ")} | ${fmt(t.estatistica.media)} | ${t.nEfetivo} | ${t.estatistica.leitura} | ${t.leituraDelta} |`;
}

/**
 * [tela F3] Seção da sensibilidade sem os controles da varredura, logo depois dos blocos do primário: as comparações lado a
 * lado (primário × sem os controles) e o bloco completo de cada uma.
 */
export function semControlesMd(sc: SemControles, primario: TabelaComparacao[]): string {
  const L = [`### ${ROTULO_SEM_CONTROLES[0].toUpperCase()}${ROTULO_SEM_CONTROLES.slice(1)} — ${sc.conjunto.rotulo}`, "",
    `Arquivo de estratos: \`${sc.arquivo}\` (${sc.formato}, sha256 ${sc.sha256.slice(0, 8)}…, declarado em \`${sc.declaradoEm}\`). ` +
    `Semeadas: ${sc.contagem.semeadas}; controles da varredura (\`controleDaVarredura: true\`, fora daqui): ${sc.contagem.controles}; nesta sensibilidade: ${sc.contagem.semControles}. ` +
    `Mesmo método do primário (chave \`${sc.chave}\`, por spec, permutação exata por troca de sinais), semente própria (\`…|${sc.conjunto.id}\`).`, "",
    "| comparação | primário: D por trio | média | p | leitura | sem os controles: D por trio | média | p | leitura | leitura com δ |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const t of sc.tabelas) {
    const p = primario.find(x => x.comparacao === t.comparacao);
    const d = (x: TabelaComparacao) => x.porTrio.map(r => `${r.trio}: ${r.d ?? "—"}`).join("; ");
    L.push(`| ${t.nome} | ${p ? d(p) : "n/d"} | ${p ? fmt(p.estatistica.media) : "n/d"} | ${p ? fmt(p.estatistica.principal.p, 4) : "n/d"} | ${p ? p.estatistica.leitura : "n/d"} | ${d(t)} | ${fmt(t.estatistica.media)} | ${fmt(t.estatistica.principal.p, 4)} | ${t.estatistica.leitura} | ${t.leituraDelta} |`);
  }
  L.push("");
  for (const t of sc.tabelas) L.push(...blocoComparacao(t).map(x => x.replace(/^### (.*)$/, `#### $1 — sem os controles da varredura`)));
  return L.join("\n");
}

export function tabelaMd(j: Record<string, unknown>, tab: Record<string, TabelaComparacao[]>, regra: RegraDesfecho, comps: Comparacao[], temS4: boolean, semControles: SemControles | null = null): string {
  const L: string[] = [`# Recálculo §8.5 — campanha \`${j.campanha}\` (tela ${regra.tela}, referência ${regra.referencia})`, ""];
  if (j.aviso) L.push(`> **${j.aviso}.**`, "");
  const cs = j.cenaPelaSpec as { regra: string; definicao: string; porBraco: Record<string, ContagemCena> } | undefined;
  if (cs) {
    L.push(`> **Regra de cena \`${cs.regra}\` aplicada, declarada DEPOIS da coleta (desvio declarado).** ${cs.definicao}.`, "",
      "| braço | cartões com segmentos | decididos pela regra: reference | decididos: sem crédito | pendentes (motivo: n) |", "|---|---|---|---|---|");
    for (const [b, x] of Object.entries(cs.porBraco)) L.push(`| ${b} | ${x.segmentados} | ${x.referencia} | ${x.naoReferencia} | ${Object.entries(x.pendentes).sort(([, m], [, n]) => n - m).map(([k, n]) => `${k}: ${n}`).join("; ") || "—"} |`);
    L.push("", "Contagem na política 1.2.0, leitura principal, somada nos trios (`recalculo.json › cenaPelaSpec`).", "");
  }
  const ps = j.passadas as { nome: string; julgamentosSha256: string; adjudicada: boolean }[];
  L.push(`Respostas congeladas: ${ps.map(p => `\`${p.nome}\` (${p.adjudicada ? "adjudicada" : "1ª passada"}, julgamentos ${p.julgamentosSha256.slice(0, 8)}…)`).join("; ")}. ` +
    `Crédito por unidade pelo scorer do pacote; no desfecho por spec (D-102), uma spec conta quando ao menos uma unidade dela é confirmada. ` +
    `Valores "x [≤y]" = confirmado [máximo com os pendentes]. Todas as entradas com sha256 em \`recalculo.json › entradas\`.`, "");
  const tr = j.trios as { trio: string; ordem: string[]; linhaDeBase: { baselineId?: string; slot?: string } | null }[];
  L.push("Trios: " + tr.map(t => `${t.trio} (ordem ${t.ordem.join(" → ")}; linha de base ${t.linhaDeBase?.baselineId ?? "n/d"} do slot ${t.linhaDeBase?.slot ?? "n/d"})`).join("; ") + ".", "");
  if (j.notaPolitica) {
    const cr = j.citacoesPorReferencia as { id: string; braco: string; spec: string | null; referenciaUsada: { id: string; regra: string | null }; regraCitada: { cartao: string | null }; credita: boolean }[];
    L.push(`> **Política do juiz: \`${(j.politicas as { principal: string }).principal}\`.** ${j.notaPolitica}.`, "",
      `Citações pela referência secundária: ${cr.length}${cr.length ? ` — ${cr.map(c => `${c.id} (${c.braco}${c.credita ? `, credita ${c.spec}` : ""}): ${c.referenciaUsada.id} ${c.referenciaUsada.regra ?? "?"} no lugar de ${c.regraCitada.cartao ?? "(nenhuma)"}`).join("; ")}` : ""} (proveniência em \`recalculo.json › citacoesPorReferencia\`).`, "");
  }
  L.push(j.notaPolitica ? "## Política 1.3.0 do juiz (principal; crédito da 1.2.0 + R16)" : "## Política 1.2.0 (principal)", "");
  for (const t of tab["principal|1.2.0|primario"]) L.push(...blocoComparacao(t));
  if (semControles) L.push(semControlesMd(semControles, tab["principal|1.2.0|primario"]));
  for (const c of regra.conjuntos.filter(x => x.tipo !== "primario")) {
    L.push(`### ${c.tipo === "a-parte" ? "À parte (nunca somada)" : "Sensibilidade"} — ${c.rotulo}`, "",
      "| comparação | D por trio | média | n | leitura | leitura com δ |", "|---|---|---|---|---|---|");
    for (const t of tab[`principal|1.2.0|${c.id}`]) L.push(linhaCompacta(t));
    L.push("");
  }
  L.push("## Política 1.1.0 (ao lado; sem R15 nem Q1 a)", "", `Desfecho: ${conjuntoDe(regra, "primario").rotulo}.`, "",
    "| comparação | D por trio | média | n | leitura | leitura com δ |", "|---|---|---|---|---|---|");
  for (const t of tab["principal|1.1.0|primario"]) L.push(linhaCompacta(t));
  L.push("", "## S4' (crédito só de LLM contestado e não ratificado, tirado dos dois braços)", "");
  const s4 = j.s4 as { disponivel: boolean; motivo: string | null; ratificacoes: string; retirados: string[]; contestados: { id: string; braco: string; motivos: string[]; creditoFinal: string; retirado: boolean }[];
    porBraco: Record<string, { creditosSoLLM: number; comResiduo: number | null; contestadosComCredito: number; retiradosS4: number; ratificados: number }> };
  if (!temS4) L.push(`Indisponível: ${s4.motivo}`, "");
  else {
    L.push(`${s4.ratificacoes}. Contestados: ${s4.contestados.length}; créditos retirados: ${s4.retirados.length}${s4.retirados.length ? ` (${s4.contestados.filter(c => c.retirado).map(c => `${c.id} ${c.braco} ${c.creditoFinal}`).join("; ")})` : ""}.`, "",
      "| comparação | D por trio (S4', 1.2.0) | média | leitura | leitura com δ | muda a leitura? |", "|---|---|---|---|---|---|");
    tab["S4'|1.2.0|primario"].forEach((t, i) => {
      const p = tab["principal|1.2.0|primario"][i];
      const muda = t.estatistica.leitura !== p.estatistica.leitura || t.leituraDelta !== p.leituraDelta;
      L.push(`| ${t.nome} | ${t.porTrio.map(r => `${r.trio}: ${r.d ?? "—"}`).join("; ")} | ${fmt(t.estatistica.media)} | ${t.estatistica.leitura} | ${t.leituraDelta} | ${muda ? "**sim**" : "não"} |`);
    });
    L.push("");
  }
  const res = j.residuoDeBraco as { disponivel: boolean; motivo?: string; nota?: string; origem?: { porBraco: Record<string, { cartoes: number; comSinal: number }> }[] };
  L.push("### Checagem S4: créditos só de LLM e sinal residual de braço, por braço (1.2.0)", "",
    "| braço | créditos só de LLM | em cartão com sinal residual | contestados com crédito | retirados no S4' | ratificados | cartões com sinal / cartões (resíduo) |", "|---|---|---|---|---|---|---|");
  for (const [b, x] of Object.entries(s4.porBraco).sort()) {
    const rb = res.disponivel ? res.origem!.map(o => o.porBraco[b]).filter(Boolean).reduce((s, y) => ({ c: s.c + y.cartoes, k: s.k + y.comSinal }), { c: 0, k: 0 }) : null;
    L.push(`| ${b} | ${x.creditosSoLLM} | ${x.comResiduo ?? "n/d"} | ${x.contestadosComCredito} | ${x.retiradosS4} | ${x.ratificados} | ${rb ? `${rb.k}/${rb.c}` : "n/d"} |`);
  }
  L.push("", res.disponivel ? `Resíduo: ${res.nota}.` : `Resíduo indisponível: ${res.motivo}.`, "");
  const og = j.origem as { arquivos: { passada: string; sha256: string }[]; passadasSemOrigem: string[]; porBraco: Record<string, Record<string, number>>; mudancas: { id: string; braco: string; origemMedida: string; classeAntes: string; classeDepois: string; creditoAntes: boolean; creditoDepois: boolean }[]; creditoRetirado: string[]; estrato4: { cartoes: { id: string; braco: string }[] } } | undefined;
  if (og) {
    L.push("## Origem medida (D-129, §8.6)", "", `Origem: ${og.arquivos.map(a => `\`${a.passada}\` (origem.json ${a.sha256.slice(0, 8)}…)`).join("; ")}${og.passadasSemOrigem.length ? `; sem origem medida: ${og.passadasSemOrigem.join(", ")}` : ""}. As tabelas acima já usam a classe com a origem medida.`, "",
      "| braço | violação página | violação DS | origem indeterminada | creditadas (1.2.0) |", "|---|---|---|---|---|");
    for (const [b, x] of Object.entries(og.porBraco).sort()) L.push(`| ${b} | ${x["violacao-pagina"]} | ${x["violacao-ds"]} | ${x["violacao-origem-indeterminada"]} | ${x.creditadas} |`);
    L.push("", og.mudancas.length ? `Mudanças pela origem medida (${og.mudancas.length}): ${og.mudancas.map(m => `${m.id} ${m.braco} ${m.classeAntes} → ${m.classeDepois}${m.creditoAntes !== m.creditoDepois ? (m.creditoDepois ? " (crédito entra)" : " (**crédito sai**)") : ""}`).join("; ")}.` : "Nenhuma classe mudou pela origem medida.",
      `Crédito retirado por origem DS: ${og.creditoRetirado.length ? og.creditoRetirado.join(", ") : "nenhum"}. Candidatos do estrato 4 (origem DS): ${og.estrato4.cartoes.length ? og.estrato4.cartoes.map(c => `${c.id} (${c.braco})`).join(", ") : "nenhum"}.`, "");
  }
  const rec = j.recusasDoScorer as unknown[];
  if (rec.length) L.push(`Decisões recusadas pelo scorer (ficaram pendentes): ${rec.length} grupo(s); ver \`recalculo.json › recusasDoScorer\`.`, "");
  void comps;
  return L.join("\n");
}

// ───────────────────────────────────────────────────────────────── CLI

const USO = `uso:
  recalculo-campanha.ts --passada PASSADA [--passada OUTRA ...] --saida PASTA_NOVA
      [--analise DIR ...] [--coleta coleta-trio.json ...] [--residuo-passada PASSADA] [--ratificacoes ARQ] [--reamostragens N] [--origem PASTA ...]
      [--por-protocolo] [--cena-pela-spec]`;

export function executar(argv: string[]): number {
  const a = lerArgs(argv, ["--passada", "--saida", "--analise", "--coleta", "--residuo-passada", "--ratificacoes", "--reamostragens", "--origem"], ["--por-protocolo", "--cena-pela-spec"]);
  if ("erro" in a) { console.error(`RECUSADO: ${a.erro}\n${USO}`); return 1; }
  try {
    if (a.modo.length) throw new Error(`argumento solto: ${a.modo.join(" ")}`);
    const passadas = (a.opts.get("--passada") ?? []).map(x => resolve(x));
    if (!passadas.length) throw new Error("falta --passada (obrigatório; nunca há pasta padrão)");
    const s = a.opts.get("--saida");
    if (!s?.length) throw new Error("falta --saida (obrigatório; pasta NOVA)");
    if (s.length > 1) throw new Error("--saida mais de uma vez");
    const saida = resolve(s[0]);
    if (existsSync(saida)) throw new Error(`--saida ${saida} já existe (o recálculo vai para uma pasta NOVA)`);
    for (const p of passadas) { const r = relative(p, saida); if (r === "" || (!r.startsWith("..") && !isAbsolute(r))) throw new Error(`--saida não pode ficar dentro da passada ${p}`); }
    const um = (k: string) => { const v = a.opts.get(k); if (v && v.length > 1) throw new Error(`${k} mais de uma vez`); return v?.[0] ?? null; };
    const ream = um("--reamostragens");
    const r = recalcular({ passadas, analises: a.opts.get("--analise"), coletas: a.opts.get("--coleta"), residuoPassada: um("--residuo-passada"),
      ratificacoes: um("--ratificacoes"), reamostragens: ream ? Number(ream) : undefined, origens: (a.opts.get("--origem") ?? []).map(x => resolve(x)),
      ...(a.flags.has("--por-protocolo") ? { porProtocolo: true } : {}), ...(a.flags.has("--cena-pela-spec") ? { cenaPelaSpec: true } : {}) });
    const jTxt = jsonTexto(r.json);
    gravarImutavel(saida, [["recalculo.json", jTxt], ["recalculo.json.sha256", `${sha(jTxt)}  recalculo.json\n`], ["tabela.md", r.md]]);
    const tab = (r.json.tabelas as Record<string, TabelaComparacao[]>)["principal|1.2.0|primario"];
    for (const t of tab) console.log(`${t.nome} (${t.bracos.join(" × ")}): ${t.porTrio.map(x => `${x.trio} ${x.d ?? "—"}`).join(", ")}; leitura: ${t.estatistica.leitura}; δ: ${t.leituraDelta}`);
    const pp = r.json.sensibilidadePorProtocolo as SensibilidadePorProtocolo | undefined;
    if (pp) for (const t of pp.tabelas[chavePorProtocolo("principal", "1.2.0", "primario")])
      console.log(`[${pp.leitura}] ${t.nome}: ${t.porTrio.map(x => `${x.trio} ${x.d ?? "—"}`).join(", ") || "nenhum trio"}; fora: ${t.foraDaComparacao.map(f => f.trio).join(", ") || "nenhum"}; leitura: ${t.estatistica.leitura}`);
    console.log(`gravado em ${saida} (recalculo.json sha256 ${sha(jTxt)})`);
    return 0;
  } catch (e) { console.error(e instanceof Error ? e.message : e); return 1; }
}

if (process.argv[1] && /(?:^|[\\/])recalculo-campanha\.ts$/.test(process.argv[1])) process.exit(executar(process.argv.slice(2)));
