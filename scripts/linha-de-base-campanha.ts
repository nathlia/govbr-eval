/**
 * Emenda (a) às regras de falha (protocolo NAT-78 § 7.2, proposta de 12/11/2026): a linha de base da campanha é medida
 * e congelada UMA vez, antes do primeiro slot, e todo trio a usa. Falha de job de infraestrutura fora do agente (linha
 * de base, arquivamento, rede do runner) deixa de derrubar o trio: a linha de base não depende mais do disparo do slot.
 *
 * Fluxo (nenhum modelo é chamado):
 *   1. um disparo `etapas: so-linha-de-base` da campanha (slot = o primeiro da agenda), ANTES de qualquer slot: o job
 *      `linhas-de-base` mede e o `arquivar` grava o registro baseline.v1 no govbr-resultados;
 *   2. `npm run campanha:linha-de-base -- --campanha ID --linha-de-base BASELINE_ID [--arquivo CLONE]` grava
 *      `campanhas/<id>/linha-de-base.json` (linha-de-base-campanha.v1) a partir do índice do arquivo: só registro
 *      `utilizavel`, conferido por sha256 contra o índice e o manifesto de coleta, e só se a campanha ainda não tem
 *      nenhuma execução iniciada;
 *   3. o arquivo é commitado ANTES do slot 1, e os slots são disparados com `etapas: so-coleta`;
 *   4. `coleta:trio` acha o arquivo e escolhe a linha de base `congelada-da-campanha` (coleta-trio.ts › planoDoTrio),
 *      conferida contra o manifesto de coleta de CADA slot com `identidadeDoEmprestimo` (identidade executável, site,
 *      oráculo, commits do govbr-ds-validator e do govbr-telas, lock de imagens) e pelo git: o commit do govbr-eval de
 *      cada slot CONTÉM este arquivo byte a byte (logo foi commitado antes do slot) e só difere do commit da linha de
 *      base por ele. A análise recebe o registro da campanha e o conjunto de snapshots da linha de base e confere os
 *      itens site, referência e plano contra os do trio (analisar-execucao.ts › linhaDeBaseDaCampanha).
 *
 * Recusa (nada é gravado/analisado): registro ausente do índice, não utilizável, de outro disparo, medido ou gerado
 * depois da primeira execução da campanha, identidade diferente em qualquer slot, slot cujo commit não contém o
 * registro, ou commit que difere em outro arquivo.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContract, type Baseline, type LinhaDeBaseCampanha } from "../contracts/index";
import { lerEntradasDoIndice } from "./agenda-campanha";
import { Recusa, resolverConjunto, sha, type EntradaIndice } from "./arquivo-resultados";
import { readIsolatedManifest, type IsolatedCollectionManifest } from "./manifesto-coleta-isolada";

export const REGRA_LINHA_DE_BASE_CONGELADA = "emenda (a) às regras de falha (§ 7.2): a linha de base da campanha é medida e congelada uma vez, antes do " +
  "primeiro slot, por um disparo so-linha-de-base, registrada em campanhas/<id>/linha-de-base.json e commitada antes do slot 1; todo trio usa este " +
  "registro, conferido contra o manifesto de coleta de cada slot (identidade executável, site, oráculo, commits do govbr-ds-validator e do " +
  "govbr-telas, lock de imagens) e pelo git (o commit do govbr-eval de cada slot contém o registro e só difere do da linha de base por ele)";

/** Caminho do registro dentro do govbr-eval (o mesmo no commit dos slots). */
export const caminhoNoEval = (campanha: string): string => `campanhas/${campanha}/linha-de-base.json`;

export class RecusaLinhaDeBaseDaCampanha extends Error {}
const recusar = (m: string): never => { throw new RecusaLinhaDeBaseDaCampanha(m); };
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** O registro da campanha (contrato e campanha conferidos). */
export function lerRegistroDaCampanha(caminho: string, campanha: string): { doc: LinhaDeBaseCampanha; bytes: Buffer; sha256: string } {
  const bytes = readFileSync(caminho);
  let doc: unknown;
  try { doc = JSON.parse(bytes.toString("utf8")); } catch { return recusar(`linha-de-base.json ilegível: ${caminho}`); }
  const v = validateContract(doc);
  if (v.contract !== "linha-de-base-campanha.v1" || !v.valid) {
    recusar(`linha-de-base.json fora do contrato linha-de-base-campanha.v1: ${v.errors.map(e => `${e.path || "/"} ${e.keyword}: ${e.message}`).join("; ")}`);
  }
  const d = doc as LinhaDeBaseCampanha;
  if (d.campaignId !== campanha) recusar(`o linha-de-base.json em ${caminho} é da campanha ${d.campaignId}, não de ${campanha}`);
  return { doc: d, bytes, sha256: sha(bytes) };
}

/** Execuções iniciadas da campanha (com manifesto de coleta: o preflight recusado não grava manifesto e não começou). */
const iniciadas = (entradas: EntradaIndice[], campanha: string): EntradaIndice[] =>
  entradas.filter(e => e.tipo === "execucao" && e.campanha === campanha && e.manifestoColeta);

/**
 * A entrada do índice que o registro da campanha congela (puro). Recusa: ausente ou repetida, não utilizável, de outro
 * caminho ou de outro disparo (manifesto de coleta), ou medida/gerada depois da primeira execução iniciada da campanha.
 */
export function escolherLinhaDeBaseCongelada(entradas: EntradaIndice[], campanha: string, reg: LinhaDeBaseCampanha): EntradaIndice {
  if (reg.campaignId !== campanha) recusar(`o registro da linha de base é da campanha ${reg.campaignId}, não de ${campanha}`);
  const lbs = entradas.filter(e => e.tipo === "linha-de-base" && e.campanha === campanha && e.chave === reg.baselineId);
  if (lbs.length !== 1) recusar(`a linha de base congelada ${reg.baselineId} aparece ${lbs.length} vez(es) no índice de ${campanha}; precisa de exatamente uma`);
  const e = lbs[0];
  if (e.estado.linhaDeBase !== "utilizavel") recusar(`a linha de base congelada ${e.chave} não é utilizável (${e.estado.linhaDeBase ?? "sem estado"}${e.motivo ? `: ${e.motivo}` : ""})`);
  if (`${e.caminho}/baseline.json` !== reg.registro.caminho) recusar(`o registro da campanha aponta ${reg.registro.caminho}, o índice guarda ${e.caminho}/baseline.json`);
  if (e.manifestoColeta?.sha256 !== reg.manifestoColeta.sha256) recusar(`a linha de base ${e.chave} é de outro disparo: manifesto de coleta ${(e.manifestoColeta?.sha256 ?? "nenhum").slice(0, 12)}… no índice, ${reg.manifestoColeta.sha256.slice(0, 12)}… no registro da campanha`);
  const execs = iniciadas(entradas, campanha);
  if (execs.length) {
    const primeira = execs.reduce((a, b) => (Date.parse(b.dataUtc) < Date.parse(a.dataUtc) ? b : a));
    for (const [nome, quando] of [["medida", reg.medidaEm], ["registrada no índice", e.dataUtc], ["gerada no registro da campanha", reg.geradoEm]] as const) {
      if (!(Date.parse(quando) < Date.parse(primeira.dataUtc))) {
        recusar(`a linha de base da campanha foi ${nome} em ${quando}, não antes da primeira execução (${primeira.chave}, slot ${primeira.slot}, ${primeira.dataUtc}): registro posterior ao 1º slot, não é linha de base congelada`);
      }
    }
  }
  return e;
}

/** O registro da campanha diz o mesmo que o manifesto de coleta do disparo da linha de base. */
export function conferirRegistroContraManifesto(reg: LinhaDeBaseCampanha, m: IsolatedCollectionManifest): void {
  const campos: [string, unknown, unknown][] = [
    ["site.siteSha256", reg.site.siteSha256, m.site.siteSha256], ["site.manifestSha256", reg.site.manifestSha256, m.site.manifestSha256],
    ["oracle.version", reg.oracle.version, m.oracle.version], ["oracle.distSha256", reg.oracle.distSha256, m.oracle.distSha256],
    ["oracle.dataSha256", reg.oracle.dataSha256, m.oracle.dataSha256],
    ["repos.govbr-eval", reg.repos["govbr-eval"], m.repos["govbr-eval"]?.commit], ["repos.govbr-telas", reg.repos["govbr-telas"], m.repos["govbr-telas"]?.commit],
    ["repos.govbr-ds-validator", reg.repos["govbr-ds-validator"], m.repos["govbr-ds-validator"]?.commit], ["imagesLockSha256", reg.imagesLockSha256, m.imagesLock.sha256],
    ["campaignId", reg.campaignId, m.dispatch.campaignId], ["screen.id", reg.screen.id, m.dispatch.screenId],
  ];
  const dif = campos.filter(([, a, b]) => JSON.stringify(a) !== JSON.stringify(b)).map(([k]) => k);
  if (dif.length) recusar(`o registro da campanha não é o do manifesto de coleta do disparo da linha de base: diverge em ${dif.join(", ")}`);
}

/** Leitura do git do govbr-eval (os testes trocam por uma de mentira; nunca rede). */
export interface LeitorGit {
  /** Bytes de `caminho` no commit, ou null se o commit não tem o arquivo. Commit desconhecido lança. */
  blob(commit: string, caminho: string): Buffer | null;
  /** Arquivos que diferem entre os dois commits (git diff --name-only). */
  diferenca(a: string, b: string): string[];
}

export function leitorGit(repo: string): LeitorGit {
  const git = (args: string[]): Buffer => execFileSync("git", ["-C", repo, ...args], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const existe = (c: string): void => {
    try { git(["cat-file", "-e", `${c}^{commit}`]); } catch { recusar(`o commit ${c.slice(0, 12)} não está no govbr-eval em ${repo} (git fetch?)`); }
  };
  return {
    blob(commit, caminho) {
      existe(commit);
      try { return git(["show", `${commit}:${caminho}`]); } catch { return null; }
    },
    diferenca(a, b) {
      existe(a); existe(b);
      return git(["diff", "--name-only", a, b]).toString("utf8").split("\n").map(s => s.trim()).filter(Boolean);
    },
  };
}

/**
 * O congelamento provado pelo git: o commit do govbr-eval de cada slot contém o registro da campanha byte a byte (então
 * foi commitado antes do disparo do slot) e só difere do commit do disparo da linha de base pelo próprio registro.
 * Devolve o que foi conferido (gravado em coleta-trio.json).
 */
export function conferirCongelamentoNoGit(campanha: string, registroSha256: string, commitDaLinhaDeBase: string, commitsDosSlots: string[], git: LeitorGit):
  { caminho: string; commitDaLinhaDeBase: string; commitsDosSlots: string[]; diferencas: Record<string, string[]> } {
  const caminho = caminhoNoEval(campanha);
  const diferencas: Record<string, string[]> = {};
  for (const c of [...new Set(commitsDosSlots)]) {
    const b = git.blob(c, caminho);
    if (!b) recusar(`o commit ${c.slice(0, 12)} do govbr-eval (de um slot do trio) não contém ${caminho}: o slot foi disparado antes de o registro da linha de base ser commitado`);
    if (sha(b!) !== registroSha256) recusar(`o ${caminho} no commit ${c.slice(0, 12)} (de um slot do trio) não é o registro conferido (sha256 ${sha(b!).slice(0, 12)}… × ${registroSha256.slice(0, 12)}…)`);
    const dif = git.diferenca(commitDaLinhaDeBase, c);
    const fora = dif.filter(f => f !== caminho);
    if (fora.length) recusar(`o commit ${c.slice(0, 12)} de um slot difere do commit da linha de base (${commitDaLinhaDeBase.slice(0, 12)}) fora do registro da campanha: ${fora.slice(0, 5).join(", ")}${fora.length > 5 ? ` (+${fora.length - 5})` : ""}`);
    diferencas[c] = dif;
  }
  return { caminho, commitDaLinhaDeBase, commitsDosSlots: [...new Set(commitsDosSlots)], diferencas };
}

export function identidadeIgual(a: IsolatedCollectionManifest, b: IsolatedCollectionManifest,
  /**
   * Emenda (a), linha de base congelada da campanha: `semEval` não compara o commit do govbr-eval (o registro da campanha é
   * commitado depois da medição; o git confere que só ele difere) e exige árvore limpa nos DOIS manifestos.
   */
  opcoes: { semEval?: boolean; rotulo?: string } = {}): Record<string, unknown> {
  const rotulo = opcoes.rotulo ?? "empréstimo de linha de base";
  const campos: [string, unknown, unknown][] = [
    ["identity", a.identity, b.identity],
    ["site.siteSha256", a.site.siteSha256, b.site.siteSha256],
    ["site.manifestSha256", a.site.manifestSha256, b.site.manifestSha256],
    ["oracle", a.oracle, b.oracle],
    ["repos.govbr-ds-validator", a.repos["govbr-ds-validator"], b.repos["govbr-ds-validator"]],
    ...(opcoes.semEval ? [] : [["repos.govbr-eval", a.repos["govbr-eval"], b.repos["govbr-eval"]] as [string, unknown, unknown]]),
    ["repos.govbr-telas", a.repos["govbr-telas"], b.repos["govbr-telas"]],
    ["imagesLock.sha256", a.imagesLock.sha256, b.imagesLock.sha256],
  ];
  const dif = campos.filter(([, x, y]) => JSON.stringify(x) !== JSON.stringify(y)).map(([k]) => k);
  if (dif.length) {
    recusar(opcoes.semEval ? `${rotulo} recusada: o manifesto de coleta da linha de base e o do slot divergem em ${dif.join(", ")}`
      : `${rotulo} recusado: os manifestos de coleta do primeiro slot e do doador divergem em ${dif.join(", ")}`);
  }
  const sujo = (["govbr-ds-validator", "govbr-eval", "govbr-telas"] as const).filter(r => [a, ...(opcoes.semEval ? [b] : [])].some(m => m.repos[r]?.dirty !== false || !m.repos[r]?.commit));
  if (sujo.length) recusar(`${rotulo} ${opcoes.semEval ? "recusada" : "recusado"}: commit ausente ou árvore suja em ${sujo.join(", ")}`);
  return { siteSha256: a.site.siteSha256, siteManifestSha256: a.site.manifestSha256, oracle: a.oracle, validatorCommit: a.repos["govbr-ds-validator"].commit,
    evalCommit: a.repos["govbr-eval"].commit, telasCommit: a.repos["govbr-telas"].commit, imagesLockSha256: a.imagesLock.sha256, identity: a.identity };
}

/**
 * Toda a conferência da linha de base congelada contra um trio, num lugar só (coleta:trio e o CLI analisar com
 * --linha-de-base-da-campanha): a entrada do índice que o registro congela (escolherLinhaDeBaseCongelada, inclusive o
 * "antes do 1º slot"), o manifesto de coleta do disparo dela por sha256, o registro contra esse manifesto, a identidade
 * contra o manifesto de CADA slot (identidadeIgual sem o govbr-eval), o git (conferirCongelamentoNoGit), o baseline.json
 * pelo sha256 congelado e o conjunto de snapshots da linha de base no arquivo.
 */
export function conferirLinhaDeBaseCongelada(o: {
  arquivo: string; campanha: string; registro: { doc: LinhaDeBaseCampanha; sha256: string }; entradas: EntradaIndice[]; fixture: boolean;
  slots: { slot: string; manifest: IsolatedCollectionManifest }[]; git: LeitorGit;
}): { entrada: EntradaIndice; registroPath: string; registroSha256: string; snapshotsRel: string; snapshotsPath: string;
  identidadeConferida: Record<string, unknown>; git: ReturnType<typeof conferirCongelamentoNoGit> } {
  const arquivo = resolve(o.arquivo);
  const dentro = (rel: string): string => {
    const abs = resolve(arquivo, rel);
    if (!abs.startsWith(arquivo)) recusar(`caminho escapa do arquivo: ${rel}`);
    return abs;
  };
  if (!o.slots.length) recusar("nenhum slot para conferir contra a linha de base congelada");
  const e = escolherLinhaDeBaseCongelada(o.entradas, o.campanha, o.registro.doc);
  const mc = e.manifestoColeta ?? recusar(`a linha de base ${e.chave} não registra manifesto de coleta`);
  const mPath = dentro(mc.caminho);
  if (!existsSync(mPath) || sha(readFileSync(mPath)) !== mc.sha256) recusar(`manifesto de coleta da linha de base ausente ou divergente: ${mc.caminho}`);
  const mLb = readIsolatedManifest(mPath).manifest;
  conferirRegistroContraManifesto(o.registro.doc, mLb);
  const identidadeConferida = Object.fromEntries(o.slots.map(s => [s.slot, identidadeIgual(mLb, s.manifest, { semEval: true, rotulo: "linha de base congelada da campanha" })]));
  const git = conferirCongelamentoNoGit(o.campanha, o.registro.sha256, mLb.repos["govbr-eval"].commit!, o.slots.map(s => s.manifest.repos["govbr-eval"].commit!), o.git);
  const registroPath = join(dentro(e.caminho), "baseline.json");
  if (!existsSync(registroPath)) recusar(`registro da linha de base ausente: ${e.caminho}/baseline.json`);
  const registroSha256 = sha(readFileSync(registroPath));
  if (registroSha256 !== o.registro.doc.registro.sha256) {
    recusar(`hash divergente: ${e.caminho}/baseline.json tem sha256 ${registroSha256.slice(0, 12)}…, o registro da campanha congelou ${o.registro.doc.registro.sha256.slice(0, 12)}…`);
  }
  let snapshotsRel = "";
  try { snapshotsRel = resolverConjunto(arquivo, o.registro.doc.snapshotSetId, o.fixture).caminho; } catch (err) {
    if (err instanceof Recusa) recusar(err.message);
    throw err;
  }
  return { entrada: e, registroPath, registroSha256, snapshotsRel, snapshotsPath: dentro(snapshotsRel), identidadeConferida, git };
}

/** Gera o registro da campanha a partir do índice e do arquivo (só antes da primeira execução). */
export function gerarRegistroDaCampanha(o: { arquivo: string; campanha: string; baselineId: string; agora?: Date }): LinhaDeBaseCampanha {
  if (!ID.test(o.campanha) || !ID.test(o.baselineId)) recusar("id de campanha ou de linha de base inválido");
  const arquivo = resolve(o.arquivo);
  const entradas = lerEntradasDoIndice(arquivo);
  const execs = iniciadas(entradas, o.campanha);
  if (execs.length) recusar(`a campanha ${o.campanha} já tem ${execs.length} execução(ões) iniciada(s) (a primeira: ${execs[0].chave}); a linha de base só se congela antes do 1º slot`);
  const lbs = entradas.filter(e => e.tipo === "linha-de-base" && e.campanha === o.campanha && e.chave === o.baselineId);
  if (lbs.length !== 1) recusar(`a linha de base ${o.baselineId} aparece ${lbs.length} vez(es) no índice de ${o.campanha}`);
  const e = lbs[0];
  if (e.estado.linhaDeBase !== "utilizavel") recusar(`a linha de base ${e.chave} não é utilizável (${e.estado.linhaDeBase ?? "sem estado"}${e.motivo ? `: ${e.motivo}` : ""})`);
  const mc = e.manifestoColeta ?? recusar(`a linha de base ${e.chave} não registra manifesto de coleta`);
  const mPath = join(arquivo, mc.caminho);
  if (!existsSync(mPath) || sha(readFileSync(mPath)) !== mc.sha256) recusar(`manifesto de coleta ausente ou divergente: ${mc.caminho}`);
  const m = readIsolatedManifest(mPath).manifest;
  const regPath = join(arquivo, e.caminho, "baseline.json");
  if (!existsSync(regPath)) recusar(`registro ausente: ${e.caminho}/baseline.json`);
  const regBytes = readFileSync(regPath);
  const registro = JSON.parse(regBytes.toString("utf8")) as Baseline;
  const v = validateContract(registro);
  if (v.contract !== "baseline.v1" || !v.valid) recusar(`${e.caminho}/baseline.json fora do contrato baseline.v1`);
  if (registro.baselineId !== e.chave || registro.campaignId !== o.campanha) recusar(`${e.caminho}/baseline.json é de ${registro.campaignId}/${registro.baselineId}`);
  if (registro.status !== "complete") recusar(`a linha de base ${e.chave} não completou (${registro.status})`);
  if (registro.links.collectionManifest.sha256 !== mc.sha256) recusar("o registro aponta outro manifesto de coleta que o índice");
  const sujo = (["govbr-ds-validator", "govbr-eval", "govbr-telas"] as const).filter(r => m.repos[r]?.dirty !== false || !m.repos[r]?.commit);
  if (sujo.length) recusar(`commit ausente ou árvore suja no disparo da linha de base: ${sujo.join(", ")}`);
  const doc: LinhaDeBaseCampanha = {
    contract: "linha-de-base-campanha.v1", fixture: m.fixture, campaignId: o.campanha, screen: { id: registro.screen.id, version: registro.screen.version },
    baselineId: e.chave, registro: { caminho: `${e.caminho}/baseline.json`, sha256: sha(regBytes) }, medidaEm: registro.timestamps.startedAt,
    manifestoColeta: { caminho: mc.caminho, sha256: mc.sha256 }, snapshotSetId: registro.links.site.snapshotSetId,
    site: { siteSha256: m.site.siteSha256, manifestSha256: m.site.manifestSha256 },
    oracle: { version: m.oracle.version ?? recusar(`o manifesto do disparo da linha de base não registra a versão do oráculo`), distSha256: m.oracle.distSha256, dataSha256: m.oracle.dataSha256 },
    repos: { "govbr-eval": m.repos["govbr-eval"].commit!, "govbr-telas": m.repos["govbr-telas"].commit!, "govbr-ds-validator": m.repos["govbr-ds-validator"].commit! },
    imagesLockSha256: m.imagesLock.sha256, regra: REGRA_LINHA_DE_BASE_CONGELADA,
    geradoEm: (o.agora ?? new Date()).toISOString().replace(/\.\d+Z$/, "Z"),
  };
  const val = validateContract(doc);
  if (!val.valid) recusar(`registro gerado fora do contrato: ${val.errors.map(x => `${x.path || "/"} ${x.keyword}: ${x.message}`).join("; ")}`);
  conferirRegistroContraManifesto(doc, m);
  return doc;
}

// ───────────────────────────────────────────────────────────────── CLI

const RAIZ = resolve(fileURLToPath(import.meta.url), "..", "..");
const USO = "Uso: npm run campanha:linha-de-base -- --campanha ID --linha-de-base BASELINE_ID [--arquivo CLONE_GOVBR_RESULTADOS] [--saida campanhas/<id>/linha-de-base.json]";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const campanha = val("campanha"), baselineId = val("linha-de-base");
  if (!campanha || !baselineId) { console.error(USO); process.exitCode = 1; }
  else {
    try {
      const doc = gerarRegistroDaCampanha({ arquivo: val("arquivo") ?? join(RAIZ, "..", "govbr-resultados"), campanha, baselineId });
      const saida = resolve(val("saida") ?? join(RAIZ, caminhoNoEval(campanha)));
      mkdirSync(dirname(saida), { recursive: true });
      writeFileSync(saida, JSON.stringify(doc, null, 2) + "\n", { flag: "wx" });
      console.log(`gravado ${saida}: linha de base ${doc.baselineId} (medida ${doc.medidaEm}, site ${doc.site.siteSha256.slice(0, 12)}, oráculo ${doc.oracle.version}). Commite ANTES do slot 1 e dispare os slots com etapas = so-coleta.`);
    } catch (e) {
      console.error(e instanceof RecusaLinhaDeBaseDaCampanha ? `RECUSADA: ${e.message}` : e instanceof Error ? e.message : e);
      process.exitCode = 1;
    }
  }
}
