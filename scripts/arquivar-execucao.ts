/**
 * Arquivamento do benchmark isolado (T4, D-67). Chamado pelo workflow `execucao-isolada`; roda igual
 * na máquina local contra um clone qualquer do govbr-resultados (os testes usam um repositório git
 * temporário). Nunca faz push nem fala com o GitHub: o workflow faz isso em passos finos depois.
 *
 *   registrar-linha-de-base --bruta ARQ --manifesto ARQ --saida DIR_NOVO [--rerun-of ID --motivo TXT --tentativa N]
 *       (job linhas-de-base) envelope baseline.v1 + cópia do bruto em DIR; problemas.json se não utilizável.
 *       Código 0 = utilizável; 3 = registrado, mas não utilizável pela análise (motivo em problemas.json).
 *
 *   execucao --arquivo CLONE --evidencias-saida DIR [--pacote DIR] [--manifesto ARQ] [--linha-de-base DIR]
 *       [--telas DIR] [--segredos NOME,NOME] [--saida-json ARQ]
 *       (job arquivar) grava no clone: pacote (JSONs), despacho, resumo, linha de base, manifesto,
 *       snapshots, campanha e site congelado (T8a.1, por conteúdo; o site vem de --telas, o checkout do
 *       govbr-telas no SHA do disparo) e entradas do índice; gera o tar.gz de evidências em DIR para o
 *       anexo da Release.
 *       Lê ENTRADAS (toJSON(inputs)) e JOBS (toJSON(needs)) do ambiente.
 *       Código 0 = arquivado; 4 = recusado (sobrescrita, segredo no pacote); 1 = erro.
 *
 *   confirmar-evidencias --arquivo CLONE --chave K (--baixado ARQ --url URL | --falhou MOTIVO)
 *       Depois do `gh release upload`: confere o sha256 do anexo baixado de volta e marca a entrega.
 *
 *   indice --arquivo CLONE      reconstrói indice/indice.json e INDICE.md (depois de um rebase)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./adjudication";
import { documentoDaCampanha, readIsolatedManifest, type IsolatedCollectionManifest } from "./manifesto-coleta-isolada";
import { caminhoAgenda, documentoDaAgenda, lerAgenda } from "./agenda-campanha";
import {
  ARCHIVE_VERSION, Recusa, arquivarSite, caminhoAgendaArquivada, caminhoCampanha, caminhoConjunto, entradaExistente, caminhoLinhaDeBase, caminhoManifesto, caminhoPlano, caminhoReferencia, conjuntoDeSnapshots, criarTarGz,
  garantirGitattributes, gravarEntrada, gravarImutavel, listagemDoCommit, listarArquivos, pastaDaExecucao, segmentoSeguro, problemasDaLinhaDeBase, problemasDeVinculo, problemasDoPacote,
  reconstruirIndice, registrarLinhaDeBase, resolverConjunto, segredosNoPacote, sha, type EntradaIndice,
} from "./arquivo-resultados";
import { canonical } from "./semantic-flow";
import type { Baseline, Run, SnapshotManifest } from "../contracts/index";
import { resumoColeta } from "./pipeline-t4";

const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

interface Gravacao { chave: string; tipo: EntradaIndice["tipo"]; caminho: string; estado: string; evidencias?: EntradaIndice["evidencias"]; anexoLocal?: string | null; release?: string | null }

/**
 * Execução do workflow que arquivou. Sem o número da tentativa: repetir só o job arquivar (nova
 * tentativa da mesma execução) tem de reproduzir os mesmos bytes, e então é reenvio idempotente.
 */
function github(): EntradaIndice["github"] {
  const repo = process.env.GITHUB_REPOSITORY, id = process.env.GITHUB_RUN_ID;
  if (!repo || !id) return null;
  return { repositorio: repo, execucao: id, url: `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repo}/actions/runs/${id}` };
}

/**
 * T8a.1: o que a análise (T6) precisa e o T4 não guardava — a campanha (do manifesto 1.1.0) e o site
 * congelado (do checkout do govbr-telas no SHA do disparo), os dois por conteúdo. Devolve os problemas
 * (avisos do job): o resto do arquivamento segue, e o painel mostra a falta como motivo.
 */
function arquivarEntradasDaAnalise(arquivo: string, m: IsolatedCollectionManifest, telas: string | null): string[] {
  const p: string[] = [];
  if (!m.campaign) p.push("manifesto de coleta 1.0.0, sem campanha: a análise deste disparo não pode ser preparada pelo painel");
  else {
    const bytes = documentoDaCampanha(m.campaign.document);
    if (sha(bytes) !== m.campaign.sha256) throw new Recusa("a campanha do manifesto não bate com o sha256 registrado");
    gravarImutavel(join(arquivo, caminhoCampanha(m.dispatch.campaignId, m.campaign.sha256)), bytes);
  }
  if (m.agenda) {
    // NAT-65: a agenda congelada vai junto, por conteúdo — o painel conta planejado × executado por ela
    const bytes = documentoDaAgenda(m.agenda.document);
    if (sha(bytes) !== m.agenda.sha256) throw new Recusa("a agenda do manifesto não bate com o sha256 registrado");
    gravarImutavel(join(arquivo, caminhoAgendaArquivada(m.dispatch.campaignId, m.agenda.sha256)), bytes);
  }
  if (!telas) p.push("site congelado não arquivado (sem --telas): a análise precisará de um clone do govbr-telas no mesmo commit");
  else {
    // site errado não derruba o arquivamento da execução: fica como aviso, e o painel recusa preparar
    try { arquivarSite(arquivo, telas, m.identity.siteManifestSha256!); } catch (e) { p.push(`site congelado não arquivado: ${(e as Error).message}`); }
  }
  return p;
}

/** Grava manifesto de coleta e snapshots (por conteúdo). Devolve onde o manifesto ficou. */
export function arquivarManifestoESnapshots(arquivo: string, manifestoPath: string, m: IsolatedCollectionManifest, msha: string): { caminho: string; conjunto: SnapshotManifest } {
  const bytes = readFileSync(manifestoPath);
  const caminho = caminhoManifesto(m.dispatch.campaignId, msha);
  gravarImutavel(join(arquivo, caminho), bytes);
  // a referência vem do checkout do govbr-eval no MESMO commit do disparo; conferida pelo sha256 do manifesto
  const evalCommit = m.repos["govbr-eval"].commit!;
  const refBytes = readFileSync(join(ROOT, m.reference.path));
  if (sha(refBytes) !== m.reference.sha256) throw new Recusa(`a referência no checkout (${m.reference.path}) não é a do manifesto: o arquivamento roda no commit ${evalCommit.slice(0, 12)}?`);
  gravarImutavel(join(arquivo, caminhoReferencia(m.reference.sha256)), refBytes);
  gravarImutavel(join(arquivo, caminhoPlano(m.identity.statePlanSha256!)), json(m.statePlan));
  const conjunto = conjuntoDeSnapshots(m, listagemDoCommit(ROOT, evalCommit));
  const cpath = join(arquivo, caminhoConjunto(conjunto.snapshotSetId));
  if (existsSync(cpath)) {
    // mesmo id = mesmos itens e mesma natureza (o id de um ensaio inclui `fixture`); só a data da
    // primeira gravação difere. Natureza divergente só passa por um reparo registrado (o de 2026-10-04),
    // nunca reaproveitando o arquivo do outro lado.
    const { caminho: existente } = resolverConjunto(arquivo, conjunto.snapshotSetId, conjunto.fixture);
    const antes = JSON.parse(readFileSync(join(arquivo, existente), "utf8")) as SnapshotManifest;
    if (canonical(antes.items) !== canonical(conjunto.items)) throw new Recusa(`${existente} diverge do conteúdo calculado`);
  } else gravarImutavel(cpath, json(conjunto));
  return { caminho, conjunto };
}

type Jobs = Record<string, { result?: string; outputs?: Record<string, string> } | undefined>;

/**
 * Par e braço do slot quando não há manifesto (disparo recusado no preflight): da agenda commitada
 * neste checkout (o mesmo commit do disparo), senão do que o job preparar já resolveu, senão do
 * digitado (sem/com). Nunca um marcador: desconhecido fica null.
 */
export function slotSemManifesto(campanha: string, slot: string, ent: Record<string, string>, jobs: Jobs, raiz = ROOT): { par: string | null; braco: "sem" | "com" | null } {
  const arm = (v: unknown): "sem" | "com" | null => (v === "sem" || v === "com" ? v : null);
  const par = (v: unknown): string | null => (typeof v === "string" && ID.test(v) ? v : null);
  if (ID.test(campanha) && ID.test(slot)) {
    try {
      const path = join(raiz, caminhoAgenda(campanha));
      if (existsSync(path)) {
        const s = lerAgenda(path).slots.find((x) => x.slotId === slot);
        if (s && arm(s.arm)) return { par: par(s.pairId), braco: arm(s.arm) };
      }
    } catch { /* agenda ilegível: segue para o que o preparar resolveu */ }
  }
  const out = jobs.preparar?.outputs ?? {};
  return { par: par(out.par) ?? par(ent.par), braco: arm(out.braco) ?? arm(ent.braco) };
}

function entradaBase(m: IsolatedCollectionManifest | null, ent: Record<string, string>, jobs: Jobs = {}): Pick<EntradaIndice, "campanha" | "slot" | "par" | "tela" | "braco" | "modelo" | "esforco" | "modo" | "natureza"> {
  const modo = m?.dispatch.mode ?? ent.modo ?? null;
  const id = (v: string | undefined, f: string): string => (v && ID.test(v) ? v : f);
  const campanha = m?.dispatch.campaignId ?? id(ent.campanha, "campanha-invalida"), slot = m?.dispatch.slotId ?? id(ent.slot, "slot-invalido");
  // NAT-65: sem manifesto, par e braço vêm da agenda (o digitado pode ser "da-agenda" ou vazio)
  const sm = m ? null : slotSemManifesto(campanha, slot, ent, jobs);
  return {
    campanha, slot,
    // par desconhecido (campanha com agenda, recusada antes do manifesto): sem par, nunca um "par-invalido" no painel
    par: m?.dispatch.pairId ?? sm!.par, tela: m?.dispatch.screenId ?? id(ent.tela, "tela-invalida"),
    braco: (m?.dispatch.arm ?? sm!.braco) as "sem" | "com" | null,
    modelo: m?.dispatch.model ?? (ent.modelo || null), esforco: m?.dispatch.effort ?? (ent.esforco || null), modo,
    natureza: modo === "real" ? "formal" : "ensaio",
  };
}

export function arquivarExecucao(o: {
  arquivo: string; evidenciasSaida: string; pacote: string | null; manifesto: string | null; linhaDeBase: string | null;
  segredos: string[]; entradas: Record<string, string>; jobs: Jobs;
  /** Checkout do govbr-telas no SHA do disparo (site-manifest.json + site/), para arquivar o site (T8a.1). */
  telas?: string | null;
}): { gravacoes: Gravacao[]; problemas: string[] } {
  const gravacoes: Gravacao[] = [];
  const problemas: string[] = [];
  garantirGitattributes(o.arquivo); // * -text: o checkout nunca converte finais de linha dos arquivos com sha256
  const gh = github();
  let m: IsolatedCollectionManifest | null = null, msha: string | null = null, mcaminho: string | null = null, conjunto: SnapshotManifest | null = null;
  if (o.manifesto && existsSync(o.manifesto)) {
    const lido = readIsolatedManifest(o.manifesto);
    m = lido.manifest; msha = lido.sha256;
    const r = arquivarManifestoESnapshots(o.arquivo, o.manifesto, m, msha);
    mcaminho = r.caminho; conjunto = r.conjunto;
    problemas.push(...arquivarEntradasDaAnalise(o.arquivo, m, o.telas ?? null));
  } else problemas.push("manifesto de coleta ausente: o job preparar não concluiu");
  const base = entradaBase(m, o.entradas, o.jobs);
  const raiz = base.natureza === "formal" ? "execucoes" : "ensaios";
  const releaseTag = `${base.natureza === "formal" ? "campanha" : "ensaios"}-${base.campanha}`;
  const jobsResumo = Object.fromEntries(Object.entries(o.jobs).map(([k, v]) => [k, v?.result ?? "desconhecido"]));

  // ── linha de base
  if (o.linhaDeBase && existsSync(join(o.linhaDeBase, "baseline.json"))) {
    const registroBytes = readFileSync(join(o.linhaDeBase, "baseline.json"));
    const registro = JSON.parse(registroBytes.toString("utf8")) as Baseline;
    const brutoBytes = readFileSync(join(o.linhaDeBase, "bruta.json"));
    const p = m && msha ? problemasDaLinhaDeBase(registro, brutoBytes, m, msha) : ["sem manifesto de coleta para conferir a identidade"];
    if (conjunto && registro.links.site.snapshotSetId !== conjunto.snapshotSetId) p.push(`vínculos apontam outro conjunto de snapshots (${registro.links.site.snapshotSetId} ≠ ${conjunto.snapshotSetId})`);
    const dir = caminhoLinhaDeBase(registro.campaignId, registro.screen.id, registro.baselineId);
    if (registro.raw.location.kind !== "archive-repo" || registro.raw.location.path !== `${dir}/bruta.json`) p.push("o registro aponta o bruto para fora do caminho de arquivo");
    gravarImutavel(join(o.arquivo, dir, "baseline.json"), registroBytes);
    gravarImutavel(join(o.arquivo, dir, "bruta.json"), brutoBytes);
    const e: EntradaIndice = {
      indice: ARCHIVE_VERSION, chave: registro.baselineId, tipo: "linha-de-base", ...base, braco: null, modelo: null, esforco: null,
      dataUtc: registro.timestamps.startedAt, caminho: dir,
      estado: { arquivo: "arquivado", tecnico: registro.status, isolamento: null, oraculo: null, submissao: null, pontuacao: null, linhaDeBase: p.length ? "nao-utilizavel" : "utilizavel" },
      motivo: p.length ? p.join("; ").slice(0, 2000) : null,
      pacote: null, evidencias: null, github: gh, manifestoColeta: msha && mcaminho ? { sha256: msha, caminho: mcaminho } : null,
    };
    gravarEntrada(o.arquivo, e);
    gravacoes.push({ chave: e.chave, tipo: "linha-de-base", caminho: dir, estado: e.estado.linhaDeBase! });
  } else if (o.entradas.etapas !== "so-coleta") {
    problemas.push(`linha de base sem registro (job linhas-de-base: ${jobsResumo["linhas-de-base"] ?? "?"})`);
  }

  // ── execução
  if (o.entradas.etapas === "so-linha-de-base") {
    reconstruirIndice(o.arquivo);
    return { gravacoes, problemas };
  }
  const runPath = o.pacote ? join(o.pacote, "run.json") : null;
  if (!o.pacote || !runPath || !existsSync(runPath)) {
    // Interrompida sem pacote (VM perdida, preflight do workflow, cancelamento): o slot fica visível, nada é inventado.
    const chave = `sem-pacote-gh-${gh?.execucao ?? `local-${Date.now()}`}`;
    const ja = entradaExistente(o.arquivo, chave);
    if (ja) {
      // nova tentativa do job arquivar da mesma execução do workflow: o slot já está registrado
      gravacoes.push({ chave, tipo: "execucao", caminho: ja.caminho, estado: "sem-pacote" });
      reconstruirIndice(o.arquivo);
      return { gravacoes, problemas };
    }
    const quando = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    // cada segmento válido no Windows (o clone da autora): braço desconhecido é "sem-braco", nunca "?"
    const caminho = [raiz, base.campanha, `${quando.slice(0, 10)}__${base.tela}__${base.braco ?? "sem-braco"}__${chave}`].map((x) => segmentoSeguro(x)).join("/");
    // sem manifesto = recusado no preflight: nenhum modelo chamado, não é tentativa (agenda-campanha.ts, protocolo §7)
    const motivo = m ? `execução sem pacote: jobs ${JSON.stringify(jobsResumo)}`
      : `disparo recusado no preflight (sem manifesto de coleta; nenhum modelo chamado, não é tentativa do slot): jobs ${JSON.stringify(jobsResumo)}`;
    gravarImutavel(join(o.arquivo, caminho, "despacho.json"), json({ arquivo: ARCHIVE_VERSION, estado: "interrompida-sem-pacote", motivo, github: gh, entradas: o.entradas, jobs: jobsResumo, manifestoColeta: msha }));
    const e: EntradaIndice = {
      indice: ARCHIVE_VERSION, chave, tipo: "execucao", ...base, dataUtc: quando, caminho,
      estado: { arquivo: "sem-pacote", tecnico: "interrupted", isolamento: null, oraculo: null, submissao: null, pontuacao: null, linhaDeBase: null },
      motivo, pacote: null, evidencias: { estado: "nao-se-aplica", release: null, anexo: null, sha256: null, bytes: null, url: null },
      github: gh, manifestoColeta: msha && mcaminho ? { sha256: msha, caminho: mcaminho } : null,
    };
    gravarEntrada(o.arquivo, e);
    gravacoes.push({ chave, tipo: "execucao", caminho, estado: "sem-pacote" });
    reconstruirIndice(o.arquivo);
    return { gravacoes, problemas };
  }

  const pac = problemasDoPacote(o.pacote);
  const run = pac.run as Run;
  const vinculo = m ? problemasDeVinculo(run, m) : ["sem manifesto de coleta para conferir o vínculo"];
  const vazados = segredosNoPacote(o.pacote, o.segredos.map((n) => process.env[n] ?? ""));
  const pasta = pastaDaExecucao(run);
  const caminho = `${raiz}/${run.campaignId}/${pasta}`;
  if (vazados.length) {
    // Não publica um byte do pacote: registra a retenção e falha o job (a autora decide o que fazer com a cópia do Actions).
    const e: EntradaIndice = {
      indice: ARCHIVE_VERSION, chave: run.runId, tipo: "execucao", ...base, dataUtc: run.timestamps.plannedAt, caminho,
      estado: { arquivo: "retido-segredo", tecnico: run.status.technical, isolamento: run.status.isolation, oraculo: run.status.oracleUsage, submissao: run.submission.status, pontuacao: run.status.score, linhaDeBase: null },
      motivo: `valor de credencial encontrado em ${vazados.length} arquivo(s) do pacote; nada publicado`, pacote: null,
      evidencias: { estado: "nao-se-aplica", release: null, anexo: null, sha256: null, bytes: null, url: null }, github: gh,
      manifestoColeta: msha && mcaminho ? { sha256: msha, caminho: mcaminho } : null,
    };
    gravarEntrada(o.arquivo, e);
    reconstruirIndice(o.arquivo);
    throw new Recusa(`credencial no pacote (${vazados.join(", ")}): retido, nada publicado`);
  }
  // pacote navegável: tudo menos evidence/ (que vai inteiro no anexo, junto com estes mesmos arquivos)
  const navegaveis = listarArquivos(o.pacote).filter((f) => !f.startsWith("evidence/"));
  for (const f of navegaveis) gravarImutavel(join(o.arquivo, caminho, "pacote", f), readFileSync(join(o.pacote, f)));
  mkdirSync(o.evidenciasSaida, { recursive: true });
  const tar = criarTarGz(o.pacote, pasta);
  const anexo = `${pasta}.tar.gz`;
  writeFileSync(join(o.evidenciasSaida, anexo), tar);
  const amSha = sha(readFileSync(join(o.pacote, "artifact-manifest.json")));
  const totalBytes = listarArquivos(o.pacote).reduce((n, f) => n + readFileSync(join(o.pacote!, f)).length, 0);
  const invalido = [...pac.problemas, ...vinculo];
  // reenvio do mesmo pacote: a entrega já registrada (falhou/confirmado) não volta para pendente
  const anterior = entradaExistente(o.arquivo, run.runId)?.evidencias;
  const evid: NonNullable<EntradaIndice["evidencias"]> = anterior && anterior.sha256 === sha(tar)
    ? { ...anterior } : { estado: "pendente", release: releaseTag, anexo, sha256: sha(tar), bytes: tar.length, url: null };
  gravarImutavel(join(o.arquivo, caminho, "despacho.json"), json({
    arquivo: ARCHIVE_VERSION, runId: run.runId, github: gh, entradas: o.entradas, jobs: jobsResumo,
    manifestoColeta: msha ? { sha256: msha, caminho: mcaminho } : null, snapshots: conjunto?.snapshotSetId ?? null,
    pacote: { artifactManifestSha256: amSha, arquivos: listarArquivos(o.pacote).length, bytes: totalBytes, problemas: invalido },
    evidencias: { release: releaseTag, anexo, sha256: evid.sha256, bytes: evid.bytes, nota: "o anexo traz o pacote INTEIRO (inclusive estes JSONs); a entrega confirmada fica em indice/entradas" },
  }));
  gravarImutavel(join(o.arquivo, caminho, "resumo.md"), resumoColeta(o.pacote).replace(/^### /, "# ") +
    `\nPacote ${invalido.length ? `**com problemas**: ${invalido.join("; ").replace(/\n/g, " ")}` : "conferido (contratos, hashes, vínculo com o disparo)"}.\n` +
    `Evidências: anexo \`${anexo}\` da Release \`${releaseTag}\`, sha256 \`${evid.sha256}\`.\n`);
  const e: EntradaIndice = {
    indice: ARCHIVE_VERSION, chave: run.runId, tipo: "execucao", ...base, dataUtc: run.timestamps.plannedAt, caminho,
    estado: { arquivo: invalido.length ? "pacote-invalido" : "arquivado", tecnico: run.status.technical, isolamento: run.status.isolation, oraculo: run.status.oracleUsage,
      submissao: run.submission.status, pontuacao: run.status.score, linhaDeBase: null },
    motivo: invalido.length ? invalido.join("; ").slice(0, 2000) : run.failure ? `${run.failure.reason}: ${run.failure.detail}`.slice(0, 2000) : null,
    pacote: { artifactManifestSha256: amSha, arquivos: listarArquivos(o.pacote).length, bytes: totalBytes },
    evidencias: evid, github: gh, manifestoColeta: msha && mcaminho ? { sha256: msha, caminho: mcaminho } : null,
  };
  gravarEntrada(o.arquivo, e);
  gravacoes.push({ chave: e.chave, tipo: "execucao", caminho, estado: e.estado.arquivo, evidencias: evid, anexoLocal: join(o.evidenciasSaida, anexo), release: releaseTag });
  if (invalido.length) problemas.push(`pacote arquivado com problemas: ${invalido.join("; ")}`);
  reconstruirIndice(o.arquivo);
  return { gravacoes, problemas };
}

export function confirmarEvidencias(arquivo: string, chave: string, r: { baixado: string; url: string } | { falhou: string }): EntradaIndice {
  const path = join(arquivo, "indice", "entradas", `${chave}.json`);
  const e = JSON.parse(readFileSync(path, "utf8")) as EntradaIndice;
  if (!e.evidencias?.sha256) throw new Error(`${chave}: entrada sem anexo de evidências`);
  if (e.evidencias.estado === "confirmado") return e; // já conferido no destino; falha posterior de download não desfaz isso
  const novo: EntradaIndice = JSON.parse(JSON.stringify(e));
  if ("falhou" in r) novo.evidencias!.estado = "falhou";
  else {
    const ok = existsSync(r.baixado) && sha(readFileSync(r.baixado)) === e.evidencias.sha256;
    novo.evidencias!.estado = ok ? "confirmado" : "falhou";
    novo.evidencias!.url = ok ? r.url : null;
  }
  if (novo.evidencias!.estado !== e.evidencias.estado) gravarEntrada(arquivo, novo);
  reconstruirIndice(arquivo);
  return novo;
}

function main(): number {
  const [cmd, ...args] = process.argv.slice(2);
  const val = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const need = (n: string): string => {
    const v = val(n);
    if (!v || v.startsWith("--")) throw new Error(`falta ${n}`);
    return v;
  };
  if (cmd === "registrar-linha-de-base") {
    const saida = resolve(need("--saida"));
    if (existsSync(join(saida, "baseline.json"))) throw new Recusa(`${saida}/baseline.json já existe`);
    const lido = readIsolatedManifest(resolve(need("--manifesto")));
    const { registro, problemas } = registrarLinhaDeBase({
      bruta: resolve(need("--bruta")), manifest: lido.manifest, manifestSha256: lido.sha256, manifestBytes: lido.bytes,
      instrumento: listagemDoCommit(ROOT, lido.manifest.repos["govbr-eval"].commit!),
      rerunOf: val("--rerun-of") ?? null, motivo: val("--motivo") ?? null, tentativa: val("--tentativa") ? Number(val("--tentativa")) : undefined,
    });
    mkdirSync(saida, { recursive: true });
    writeFileSync(join(saida, "baseline.json"), json(registro), { flag: "wx" });
    writeFileSync(join(saida, "bruta.json"), readFileSync(resolve(need("--bruta"))), { flag: "wx" });
    if (problemas.length) writeFileSync(join(saida, "problemas.json"), json(problemas), { flag: "wx" });
    console.log(`linha de base ${registro.baselineId}: ${registro.status}${problemas.length ? ` — NÃO utilizável: ${problemas.join("; ")}` : " — utilizável (identidade e completude conferidas)"}`);
    return problemas.length ? 3 : 0;
  }
  if (cmd === "execucao") {
    const r = arquivarExecucao({
      arquivo: resolve(need("--arquivo")), evidenciasSaida: resolve(need("--evidencias-saida")),
      pacote: val("--pacote") ? resolve(val("--pacote")!) : null, manifesto: val("--manifesto") ? resolve(val("--manifesto")!) : null,
      linhaDeBase: val("--linha-de-base") ? resolve(val("--linha-de-base")!) : null,
      telas: val("--telas") ? resolve(val("--telas")!) : null,
      segredos: (val("--segredos") ?? "").split(",").filter(Boolean),
      entradas: JSON.parse(process.env.ENTRADAS ?? "{}") as Record<string, string>, jobs: JSON.parse(process.env.JOBS ?? "{}") as Jobs,
    });
    const out = val("--saida-json");
    if (out) writeFileSync(resolve(out), json(r));
    for (const g of r.gravacoes) console.log(`${g.tipo} ${g.chave}: ${g.estado} → ${g.caminho}${g.anexoLocal ? ` (anexo ${basename(g.anexoLocal)}, release ${g.release})` : ""}`);
    for (const p of r.problemas) console.log(`aviso: ${p}`);
    return 0;
  }
  if (cmd === "confirmar-evidencias") {
    const falhou = val("--falhou");
    const e = confirmarEvidencias(resolve(need("--arquivo")), need("--chave"), falhou ? { falhou } : { baixado: resolve(need("--baixado")), url: need("--url") });
    console.log(`${e.chave}: evidências ${e.evidencias?.estado}`);
    return e.evidencias?.estado === "confirmado" ? 0 : 5;
  }
  if (cmd === "indice") {
    const r = reconstruirIndice(resolve(need("--arquivo")));
    console.log(`índice reconstruído: ${r.entradas} entradas`);
    return 0;
  }
  throw new Error("uso: arquivar-execucao.ts registrar-linha-de-base | execucao | confirmar-evidencias | indice");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = error instanceof Recusa ? 4 : 1;
  }
}
