/**
 * Arquivo de resultados SINTÉTICO para o painel (T8a). Monta, numa pasta nova, um clone falso do
 * `govbr-resultados` com o layout do T4 (D-72) e a área `analises/` do painel, usando as mesmas funções
 * de arquivo (`gravarImutavel`, `gravarEntrada`, `criarTarGz`, `restaurar`, `reconstruirIndice`) e a
 * fixture da análise T6 (`scripts/fixtures/analise/construir.ts`). Nenhum dado real, nenhum modelo.
 *
 * Cenários (mais recente primeiro):
 *   par-05  só o braço com, interrompido SEM pacote (falha + par incompleto)
 *   par-04  sem com 0 achados (lista vazia aceita) · com sem submissão (falhou) — comparação indisponível
 *   par-03  só o braço sem, anexo de evidências que falhou (publicação indisponível + par incompleto)
 *   par-02  par completo, revisão PENDENTE (alvo do teste de autonomia)
 *   par-01  par completo, revisão fechada (final) + uma tentativa de recalcular que falhou (simulada)
 *
 *   npm run painel:fixture -- <pasta-nova>
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Baseline, Campaign, Run, SnapshotManifest } from "../../contracts/index";
import { ROOT } from "../adjudication";
import { arquivarExecucao, confirmarEvidencias } from "../arquivar-execucao";
import {
  ARCHIVE_VERSION, criarTarGz, gravarEntrada, gravarImutavel, listagemDoCommit, listarArquivos, pastaDaExecucao, reconstruirIndice, registrarLinhaDeBase,
  restaurar, sha, type EntradaIndice,
} from "../arquivo-resultados";
import { statePlanSha256, type StatePlan } from "../collection-manifest";
import { CAMPANHA_ID, ORACULO, construirFixture, type OpcoesFixture } from "../fixtures/analise/construir";
import { ISOLATED_MANIFEST_VERSION, documentoDaCampanha, type IsolatedCollectionManifest } from "../manifesto-coleta-isolada";
import type { FlowBaselines } from "../run-baselines-flow";
import { resumoColeta } from "../pipeline-t4";
import type { SemanticPackage } from "../semantic-flow";
import { RECEITA_VERSAO, lerAnalise, type Receita } from "./modelo";
import { recalcular, salvarDecisao } from "./revisao";

const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const AVISO = "FIXTURE SINTÉTICA — não é resultado científico";

interface Pacote { dir: string; run: Run }

function arquivarPacote(arquivo: string, p: Pacote, entrega: "confirmado" | "falhou", restaurarAgora: boolean): string | null {
  const run = p.run;
  const pasta = pastaDaExecucao(run);
  const caminho = `ensaios/${run.campaignId}/${pasta}`;
  for (const f of listarArquivos(p.dir).filter(f => !f.startsWith("evidence/"))) gravarImutavel(join(arquivo, caminho, "pacote", f), readFileSync(join(p.dir, f)));
  const tar = criarTarGz(p.dir, pasta);
  const anexo = `${pasta}.tar.gz`;
  // O anexo de verdade fica na Release; aqui uma cópia local faz o papel dela.
  gravarImutavel(join(arquivo, "anexos-fixture", anexo), tar);
  const release = `ensaios-${run.campaignId}`;
  const amSha = sha(readFileSync(join(p.dir, "artifact-manifest.json")));
  const bytes = listarArquivos(p.dir).reduce((n, f) => n + readFileSync(join(p.dir, f)).length, 0);
  gravarImutavel(join(arquivo, caminho, "despacho.json"), json({ arquivo: ARCHIVE_VERSION, runId: run.runId, fixture: true, nota: AVISO,
    github: null, pacote: { artifactManifestSha256: amSha, arquivos: listarArquivos(p.dir).length, bytes, problemas: [] },
    evidencias: { release, anexo, sha256: sha(tar), bytes: tar.length } }));
  gravarImutavel(join(arquivo, caminho, "resumo.md"), resumoColeta(p.dir).replace(/^### /, "# ") + `\n${AVISO}.\n`);
  const e: EntradaIndice = {
    indice: ARCHIVE_VERSION, chave: run.runId, tipo: "execucao", natureza: "ensaio", campanha: run.campaignId, slot: run.slotId, par: run.pairId,
    tela: run.screen.id, braco: run.arm, modelo: run.model.requested, esforco: run.effort, modo: "fixture",
    dataUtc: run.timestamps.plannedAt, caminho,
    estado: { arquivo: "arquivado", tecnico: run.status.technical, isolamento: run.status.isolation, oraculo: run.status.oracleUsage,
      submissao: run.submission.status, pontuacao: run.status.score, linhaDeBase: null },
    motivo: run.failure ? `${run.failure.reason}: ${run.failure.detail}` : null,
    pacote: { artifactManifestSha256: amSha, arquivos: listarArquivos(p.dir).length, bytes },
    evidencias: { estado: "pendente", release, anexo, sha256: sha(tar), bytes: tar.length, url: null },
    github: null, manifestoColeta: null,
  };
  gravarEntrada(arquivo, e);
  gravarEntrada(arquivo, { ...e, evidencias: { ...e.evidencias!, estado: entrega, url: entrega === "confirmado" ? `fixture://${release}/${anexo}` : null } });
  if (!restaurarAgora) return null;
  const destino = `restauracoes/${run.runId}`;
  const r = restaurar(arquivo, run.runId, join(arquivo, "anexos-fixture", anexo), join(arquivo, destino));
  if (!r.ok) throw new Error(`restauração da fixture falhou (${run.runId}): ${r.problemas.join("; ")}`);
  return `${destino}/${pasta}`;
}

function semPacote(arquivo: string, o: { par: string; braco: "sem" | "com"; dia: string }): void {
  const chave = `sem-pacote-gh-fixture-${o.par}-${o.braco}`;
  const caminho = `ensaios/${CAMPANHA_ID}/${o.dia}__tela-fixture-analise__${o.braco}__${chave}`;
  const motivo = "execução sem pacote: jobs {\"preparar\":\"success\",\"coleta\":\"cancelled\",\"linhas-de-base\":\"success\"} (FIXTURE: VM perdida, simulada)";
  gravarImutavel(join(arquivo, caminho, "despacho.json"), json({ arquivo: ARCHIVE_VERSION, estado: "interrompida-sem-pacote", motivo, fixture: true, nota: AVISO }));
  gravarEntrada(arquivo, {
    indice: ARCHIVE_VERSION, chave, tipo: "execucao", natureza: "ensaio", campanha: CAMPANHA_ID, slot: `slot-${o.par}-${o.braco}`, par: o.par,
    tela: "tela-fixture-analise", braco: o.braco, modelo: "modelo-fixture", esforco: "medium", modo: "fixture",
    dataUtc: `${o.dia}T00:00:00Z`, caminho,
    estado: { arquivo: "sem-pacote", tecnico: "interrupted", isolamento: null, oraculo: null, submissao: null, pontuacao: null, linhaDeBase: null },
    motivo, pacote: null, evidencias: { estado: "nao-se-aplica", release: null, anexo: null, sha256: null, bytes: null, url: null },
    github: null, manifestoColeta: null,
  });
}

/** Decide todos os cartões de uma análise pela API do painel (uma gravação por cartão). */
function decidirTudo(arquivo: string, campanha: string, alvo: string): void {
  const an = lerAnalise(arquivo, campanha, alvo)!;
  const pkg = JSON.parse(readFileSync(join(an.atual!.dir, "revisao", "package.json"), "utf8")) as SemanticPackage;
  let base = 0;
  for (const c of pkg.cards) {
    const decisao = c.candidateUnitIds.length ? "defeito-do-gabarito" : /julgada incorreta/.test(c.observed ?? "") ? "incorreta" : "defeito-novo-correto";
    const r = salvarDecisao(arquivo, campanha, alvo, { cardId: c.id, decisao, unitIds: c.candidateUnitIds.slice(0, 1), citacao: "supported",
      justificativa: `decisão sintética da fixture (${decisao})`, consultado: ["cartão", "reconstrução da cena"], revisora: "revisora-fixture", base });
    if (!r.ok) throw new Error(`fixture: decisão recusada em ${c.id}: ${r.erro}`);
    base = r.versao;
  }
}

/** `idsGerados`: a página de todos os pares sorteia um id a cada carga (ver OpcoesFixture.idsGerados). */
export async function construirArquivoFixture(out: string, opcoes: { idsGerados?: boolean; camadaPagina?: boolean } = {}): Promise<{ arquivo: string }> {
  const arquivo = resolve(out);
  if (existsSync(arquivo)) throw new Error(`Pasta já existe: ${out}. A fixture é montada sempre numa pasta nova.`);
  mkdirSync(arquivo, { recursive: true });
  const trabalho = mkdtempSync(join(tmpdir(), "painel-fixture-"));
  try {
    writeFileSync(join(arquivo, "FIXTURE-SINTETICA.md"), `# ${AVISO}\n\nEste "arquivo de resultados" foi montado por \`npm run painel:fixture\` (govbr-eval, scripts/painel/fixture.ts)\n` +
      "para testar o painel de resultados. Telas, campanha, execuções, achados e decisões são inventados.\n" +
      "`anexos-fixture/` faz o papel dos anexos da Release; `restauracoes/` é o cache local dos pacotes restaurados.\n");
    const pares: { nome: string; o: OpcoesFixture }[] = [
      { nome: "p1", o: { identidade: { par: "par-01", sufixo: "01", dia: "2026-01-03" } } },
      { nome: "p2", o: { identidade: { par: "par-02", sufixo: "02", dia: "2026-01-05", slots: { sem: "slot-04", com: "slot-03" } } } },
      { nome: "p3", o: { identidade: { par: "par-03", sufixo: "03", dia: "2026-01-07", slots: { sem: "slot-06", com: "slot-05" } } } },
      { nome: "p4", o: { identidade: { par: "par-04", sufixo: "04", dia: "2026-01-09", slots: { sem: "slot-08", com: "slot-07" } },
        sem: { findings: [] }, com: { submissao: "nenhuma" } } },
    ];
    const fx = Object.fromEntries(pares.map(p => [p.nome, construirFixture(join(trabalho, p.nome), { ...p.o, idsGerados: opcoes.idsGerados, ...(opcoes.camadaPagina ? { camadaPagina: true } : {}) })]));
    const base = fx.p1;

    // ── entradas compartilhadas (por conteúdo, como no T4)
    const campanhaRel = `campanhas/${CAMPANHA_ID}/campaign.json`;
    gravarImutavel(join(arquivo, campanhaRel), readFileSync(base.campanha));
    const snaps = JSON.parse(readFileSync(base.snapshots, "utf8")) as SnapshotManifest;
    const snapsRel = `snapshots/conjuntos/${snaps.snapshotSetId}.json`;
    gravarImutavel(join(arquivo, snapsRel), readFileSync(base.snapshots));
    const refBytes = readFileSync(base.referencia);
    const refRel = `snapshots/referencia/${sha(refBytes)}/referencia.json`;
    gravarImutavel(join(arquivo, refRel), refBytes);
    const planoBytes = readFileSync(join(base.dir, "plano-estados.json"));
    gravarImutavel(join(arquivo, `snapshots/plano-de-estados/${snaps.items.find(i => i.kind === "state-plan")!.sha256}/plano-estados.json`), planoBytes);
    const siteSha = sha(readFileSync(join(base.site, "site-manifest.json")));
    const siteRel = `sites/${siteSha}`;
    cpSync(base.site, join(arquivo, siteRel), { recursive: true });
    const registro = JSON.parse(readFileSync(base.linhaDeBase, "utf8")) as Baseline;
    const lbDir = `linhas-de-base/${CAMPANHA_ID}/${registro.screen.id}/${registro.baselineId}`;
    for (const f of ["registro.json", "bruta.json", "manifesto-coleta.json"]) {
      gravarImutavel(join(arquivo, lbDir, f === "registro.json" ? "baseline.json" : f), readFileSync(join(base.dir, "linha-de-base", f)));
    }
    gravarEntrada(arquivo, {
      indice: ARCHIVE_VERSION, chave: registro.baselineId, tipo: "linha-de-base", natureza: "ensaio", campanha: CAMPANHA_ID, slot: null, par: null,
      tela: registro.screen.id, braco: null, modelo: null, esforco: null, modo: "fixture", dataUtc: registro.timestamps.startedAt, caminho: lbDir,
      estado: { arquivo: "arquivado", tecnico: registro.status, isolamento: null, oraculo: null, submissao: null, pontuacao: null, linhaDeBase: "utilizavel" },
      motivo: null, pacote: null, evidencias: null, github: null, manifestoColeta: null,
    });

    // ── execuções
    const ler = (dir: string): Pacote => ({ dir, run: JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) as Run });
    const restaurados: Record<string, Partial<Record<"sem" | "com", string>>> = {};
    for (const p of ["p1", "p2", "p4"]) {
      restaurados[p] = {};
      for (const arm of ["sem", "com"] as const) restaurados[p][arm] = arquivarPacote(arquivo, ler(fx[p][arm]), "confirmado", true)!;
    }
    arquivarPacote(arquivo, ler(fx.p3.sem), "falhou", false);
    semPacote(arquivo, { par: "par-05", braco: "com", dia: "2026-01-11" });
    reconstruirIndice(arquivo);

    // ── análises (receita + primeira versão calculada pelo mesmo caminho do botão Recalcular)
    const receita = (p: string, par: string): Receita => ({
      formato: RECEITA_VERSAO, fixture: true, campanha: CAMPANHA_ID, tipo: "par", alvo: par,
      execucoes: { sem: ler(fx[p].sem).run.runId, com: ler(fx[p].com).run.runId }, pacotes: restaurados[p],
      entradas: { campanha: campanhaRel, snapshots: snapsRel, referencia: refRel, site: siteRel, linhaDeBase: `${lbDir}/baseline.json`, semLinhaDeBase: false },
      criadaEm: "2026-01-12T00:00:00Z", nota: AVISO,
    });
    for (const [p, par] of [["p1", "par-01"], ["p2", "par-02"], ["p4", "par-04"]] as const) {
      gravarImutavel(join(arquivo, "analises", CAMPANHA_ID, par, "receita.json"), json(receita(p, par)));
      const r = await recalcular(arquivo, CAMPANHA_ID, par);
      if (!r.ok) throw new Error(`fixture: análise de ${par} falhou: ${r.erro}`);
    }
    // par-01: revisão fechada e recalculada; depois uma tentativa de recalcular que falhou (registrada, simulada)
    decidirTudo(arquivo, CAMPANHA_ID, "par-01");
    const r2 = await recalcular(arquivo, CAMPANHA_ID, "par-01");
    if (!r2.ok) throw new Error(`fixture: recálculo de par-01 falhou: ${r2.erro}`);
    const quando = new Date(Date.now() + 1000).toISOString();
    const falha = join(arquivo, "analises", CAMPANHA_ID, "par-01", "revisoes", "falhas", quando.replace(/[:.]/g, "-"));
    mkdirSync(falha, { recursive: true });
    writeFileSync(join(falha, "erro.json"), json({ em: quando, motivo: "FIXTURE: falha simulada do recálculo (o site congelado não estava disponível nesta máquina)",
      decisoes: null, anterior: "rev-002", simulada: true }));
    return { arquivo };
  } finally {
    rmSync(trabalho, { recursive: true, force: true });
  }
}

// ───────────────────────────────────────────────────────────────── arquivo no layout do T4 (T8a.1)

const COMMIT_FIXTURE = { telas: "e".repeat(40), validator: "d".repeat(40) };

/**
 * Manifesto de coleta 1.1.0 SINTÉTICO para um braço da fixture da análise, como o `preparar` do T4
 * gravaria (modo roteirizado). A referência é a fixture versionada dentro do govbr-eval, como no T4.
 */
function manifestoDaFixture(fx: ReturnType<typeof construirFixture>, run: Run, opcoes: { navega?: boolean } = {}): IsolatedCollectionManifest {
  const registro = JSON.parse(readFileSync(fx.linhaDeBase, "utf8")) as Baseline;
  const refRel = "scripts/fixtures/analise/referencia-fixture.json";
  const refBytes = readFileSync(join(ROOT, refRel));
  if (sha(refBytes) !== registro.identity.referenceSha256) throw new Error("fixture: referência versionada ≠ a da fixture construída");
  let statePlan = JSON.parse(readFileSync(join(fx.dir, "plano-estados.json"), "utf8")) as StatePlan;
  // tela que navega (D-60), só para o estado "fora do alcance": paradas no plano, hash do plano recalculado
  if (opcoes.navega) statePlan = { ...statePlan, paradas: [{ id: "lista", afterStep: 0, path: "/fixture-analise.html" }, { id: "detalhe", afterStep: 1, path: "/fixture-detalhe" }] };
  const siteText = readFileSync(join(fx.site, "site-manifest.json"));
  const head = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const base: Omit<IsolatedCollectionManifest, "campaign"> = {
    manifestVersion: ISOLATED_MANIFEST_VERSION, generatedAt: run.timestamps.plannedAt, fixture: true,
    dispatch: { campaignId: run.campaignId, slotId: run.slotId, pairId: run.pairId, screenId: run.screen.id, arm: run.arm, mode: "roteirizado",
      attempt: 1, repetition: 1, model: run.model.requested, effort: run.effort, limitMinutes: 30, github: null },
    identity: { ...registro.identity, statePlanSha256: statePlanSha256(statePlan) },
    reference: { path: refRel, sha256: sha(refBytes), bytes: refBytes.length, version: run.screen.version },
    statePlan,
    site: { manifestSha256: sha(siteText), manifestBytes: siteText.length, siteSha256: sha(siteText), packageVersion: "fixture", corpusCommit: null, screenVersion: run.screen.version },
    oracle: { package: ORACULO.package, version: ORACULO.version, distSha256: ORACULO.distSha256, dataSha256: ORACULO.dataSha256 },
    repos: { "govbr-eval": { commit: head, dirty: true }, "govbr-telas": { commit: COMMIT_FIXTURE.telas, dirty: false }, "govbr-ds-validator": { commit: COMMIT_FIXTURE.validator, dirty: false } },
    imagesLock: { sha256: "c".repeat(64), versions: { fixture: true } },
  };
  const campanha = JSON.parse(readFileSync(fx.campanha, "utf8")) as Campaign;
  return { ...base, campaign: { sha256: sha(documentoDaCampanha(campanha)), origin: "commitada", sourcePath: "fixture", sourceSha256: fx.campanhaSha256, document: campanha } };
}

export interface ArquivoT4 {
  arquivo: string;
  /** O que o job arquivar subiria como anexos da Release (fica FORA do arquivo, como na Release). */
  anexos: string;
  campanha: string;
  pares: { par: string; sem: string; com: string; navega: boolean }[];
}

/**
 * Arquivo SINTÉTICO montado pelo MESMO caminho do job arquivar do T4 (`arquivarExecucao`, linha de
 * base por `registrarLinhaDeBase`, entrega por `confirmarEvidencias`), sem nenhuma análise: o ponto de
 * partida do botão "Preparar análise". Pares: `par-t4` (tela que não navega) e, com `navega`, `par-nav`
 * (o plano de estados declara paradas: fora do alcance do T6).
 */
export function construirArquivoT4(out: string, o: { navega?: boolean } = {}): ArquivoT4 {
  const arquivo = resolve(out);
  if (existsSync(arquivo)) throw new Error(`Pasta já existe: ${out}. O arquivo é montado sempre numa pasta nova.`);
  mkdirSync(arquivo, { recursive: true });
  const trabalho = mkdtempSync(join(tmpdir(), "painel-t4-"));
  const anexos = `${arquivo}-anexos-release`;
  mkdirSync(anexos, { recursive: true });
  const instrumento = listagemDoCommit(ROOT, execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim());
  const pares: ArquivoT4["pares"] = [];
  try {
    writeFileSync(join(arquivo, "FIXTURE-SINTETICA.md"), `# ${AVISO}\n\nArquivo no layout do T4 montado por \`construirArquivoT4\` (govbr-eval, scripts/painel/fixture.ts),\n` +
      "pelo mesmo código do job arquivar, para testar \"Preparar análise\". Nada aqui é resultado científico.\n");
    const casos = [{ par: "par-t4", sufixo: "t4", dia: "2026-02-01", navega: false }, ...(o.navega ? [{ par: "par-nav", sufixo: "nav", dia: "2026-02-03", navega: true }] : [])];
    for (const c of casos) {
      const fx = construirFixture(join(trabalho, c.par), { identidade: { par: c.par, sufixo: c.sufixo, dia: c.dia, slots: { sem: `slot-${c.sufixo}-sem`, com: `slot-${c.sufixo}-com` } } });
      const runs: Partial<Record<"sem" | "com", string>> = {};
      for (const arm of ["sem", "com"] as const) {
        const dir = fx[arm];
        const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) as Run;
        const m = manifestoDaFixture(fx, run, { navega: c.navega });
        const mPath = join(trabalho, `${c.par}-${arm}-manifesto-coleta.json`);
        writeFileSync(mPath, JSON.stringify(m, null, 2) + "\n");
        const mBytes = readFileSync(mPath);
        // job linhas-de-base: o bruto mede ESTE disparo (vínculo pelo sha256 do manifesto)
        let lbDir: string | null = null;
        if (!c.navega) {
          lbDir = join(trabalho, `${c.par}-${arm}-linha-de-base`);
          mkdirSync(lbDir, { recursive: true });
          const bruto = JSON.parse(readFileSync(join(fx.dir, "linha-de-base", "bruta.json"), "utf8")) as FlowBaselines;
          bruto.provenance = { ...bruto.provenance, collectionManifest: { path: mPath, sha256: sha(mBytes) } };
          bruto.timestamp = `${c.dia}T01:00:0${arm === "sem" ? 0 : 5}Z`;
          writeFileSync(join(lbDir, "bruta.json"), JSON.stringify(bruto, null, 2) + "\n");
          const reg = registrarLinhaDeBase({ bruta: join(lbDir, "bruta.json"), manifest: m, manifestSha256: sha(mBytes), manifestBytes: mBytes.length, instrumento });
          if (reg.problemas.length) throw new Error(`fixture T4: linha de base não utilizável: ${reg.problemas.join("; ")}`);
          writeFileSync(join(lbDir, "baseline.json"), JSON.stringify(reg.registro, null, 2) + "\n");
        }
        const r = arquivarExecucao({ arquivo, evidenciasSaida: anexos, pacote: dir, manifesto: mPath, linhaDeBase: lbDir, segredos: [], telas: fx.site,
          entradas: { modo: "roteirizado", etapas: lbDir ? "coleta+linha-de-base" : "so-coleta", campanha: run.campaignId, slot: run.slotId, par: run.pairId, tela: run.screen.id, braco: arm },
          jobs: { preparar: { result: "success" }, coleta: { result: "success" }, "linhas-de-base": { result: lbDir ? "success" : "skipped" } } });
        const g = r.gravacoes.find(x => x.tipo === "execucao");
        if (!g?.anexoLocal || g.estado !== "arquivado") throw new Error(`fixture T4: ${run.runId} não foi arquivado: ${JSON.stringify(r)}`);
        confirmarEvidencias(arquivo, run.runId, { baixado: g.anexoLocal, url: `fixture://${g.release}/${basename(g.anexoLocal)}` });
        runs[arm] = run.runId;
      }
      pares.push({ par: c.par, sem: runs.sem!, com: runs.com!, navega: c.navega });
    }
    return { arquivo, anexos, campanha: CAMPANHA_ID, pares };
  } finally {
    rmSync(trabalho, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t4 = process.argv[2] === "--t4";
  const out = process.argv[t4 ? 3 : 2];
  if (!out) { console.error("Uso: npm run painel:fixture -- [--t4] <pasta-nova>"); process.exitCode = 1; }
  else if (t4) {
    const r = construirArquivoT4(out, { navega: true });
    console.log(`Arquivo sintético no layout do T4 em ${relative(process.cwd(), r.arquivo) || "."} (${AVISO}); nenhuma análise ainda.`);
    console.log(`Anexos da "Release" em ${relative(process.cwd(), r.anexos)}.`);
    console.log(`Abra com: npm run painel:resultados -- --arquivo ${out} --anexos ${relative(process.cwd(), r.anexos)} --sem-download`);
  } else construirArquivoFixture(out).then(r => {
    console.log(`Arquivo sintético montado em ${relative(process.cwd(), r.arquivo) || "."} (${AVISO}).`);
    console.log(`Abra com: npm run painel:resultados -- --arquivo ${out}`);
  }).catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
}
