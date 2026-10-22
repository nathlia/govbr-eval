/**
 * Coleta automática LACRADA de um trio (plano de revisão da campanha nova, 19/10/2026, entrega 1; achados A e E).
 *
 * Depois de cada trio de uma campanha v2, sem ninguém montar a análise à mão e sem abrir nada que mostre achado:
 *   1. lê o índice do arquivo (clone do govbr-resultados) e escolhe, para cada slot do trio, a PRIMEIRA tentativa
 *      elegível (protocolo §7; `tentativasDoSlot`/`tentativaSelecionada`, as mesmas da agenda e do painel);
 *   2. baixa o anexo de evidências de cada execução da Release (`gh release download`, sessão da autora), confere o
 *      sha256 contra o índice (D-67) e recusa a divergência; o anexo fica em `anexos/<release>/` do arquivo (fora do
 *      Git) e é restaurado por `restaurar()` do T4 (cada arquivo contra o artifact-manifest.json) em
 *      `restauracoes/<runId>/` — o mesmo lugar do painel;
 *   3. confere campanha, conjunto de snapshots, referência e site congelado pelo sha256 que o manifesto de coleta
 *      registrou, e roda o `analisar` (scripts/analisar-execucao.ts) numa pasta NOVA da campanha:
 *      `analises/<campanha>/<trio>/analisar-<carimbo>/`;
 *   4. imprime SÓ os sinais técnicos lacrados (scripts/sinais-tecnicos.ts) e os grava em `sinais-tecnicos.json`.
 *      Achados, summary.md, contagens por braço e pontuação ficam nos arquivos e nunca saem no terminal.
 *
 * Regra fixa da linha de base (achado E): a do PRIMEIRO slot do trio na ordem da agenda — a linha de base que o
 * mesmo disparo da tentativa escolhida gravou (vínculo pelo sha256 do manifesto de coleta). Campanha sem agenda
 * (ordem `sequencial`): a ordem de `design.arms`. Nunca se troca pela de outro slot; sem ela, só a ausência
 * planejada que a campanha declara para a tela; senão a coleta recusa. A escolha fica gravada em `coleta-trio.json`.
 *
 *   npm run coleta:trio -- --campanha ID --trio GRUPO [--arquivo CLONE] [--carimbo AAAAMMDDTn] [--anexos DIR] [--sem-download]
 *
 * GRUPO = o `par` do índice (ex.: trio-01) ou o id do grupo na agenda (p01). Código 0 = análise pronta e sinais ok;
 * 2 = defeito técnico nos sinais; 1 = recusa (nada analisado) ou erro. Nenhum modelo é chamado.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContract, type AnyCampaign, type ArmV2, type SnapshotManifest } from "../contracts/index";
import { analisar } from "./analisar-execucao";
import { bytesDaCampanha, lerAgenda, lerEntradasDoIndice, tentativaSelecionada, tentativasDoSlot, type Agenda, type Tentativa } from "./agenda-campanha";
import {
  REPOS, Recusa, caminhoCampanha, caminhoReferencia, caminhoSite, problemasDoPacote, resolverConjunto, restaurar, sha, type EntradaIndice,
} from "./arquivo-resultados";
import { readIsolatedManifest, type IsolatedCollectionManifest } from "./manifesto-coleta-isolada";
import { loadSite } from "./measurement-surface";
import { lerAgendaDoArquivo } from "./painel/agenda-painel";
import { linhasDosSinais, sinaisTecnicos, type Sinais } from "./sinais-tecnicos";

export const COLETA_TRIO_VERSAO = "coleta-trio-1.0.0";
export const REGRA_LINHA_DE_BASE = "linha de base do PRIMEIRO slot do trio na ordem da agenda (sem agenda: a ordem de design.arms, campanha sequencial), " +
  "gravada pelo mesmo disparo da tentativa escolhida desse slot (vínculo pelo sha256 do manifesto de coleta); nunca a de outro slot; " +
  "sem ela, só a ausência planejada que a campanha declara para a tela (plano de revisão 19/10, achado E)";

const RAIZ = resolve(fileURLToPath(import.meta.url), "..", "..");
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const curto = (s: string | null | undefined): string => (s ?? "").slice(0, 12);

/** Recusa: nada é analisado (e nenhuma pasta de análise é criada). */
export class RecusaColeta extends Error {}
const recusar = (m: string): never => { throw new RecusaColeta(m); };

/** Como o anexo que falta chega a `destinoDir` (os testes trocam por uma cópia local; nunca a rede). */
export type Baixador = (e: EntradaIndice, destinoDir: string) => { ok: true } | { ok: false; erro: string };

/** `gh release download` com a sessão da autora. No Windows, acrescenta a pasta padrão do GitHub CLI ao PATH. */
export const baixarComGh: Baixador = (e, destinoDir) => {
  const ev = e.evidencias;
  if (!ev?.release || !ev.anexo) return { ok: false, erro: "a entrada não diz a Release nem o nome do anexo" };
  const repo = /github\.com\/([^/]+\/[^/]+)\/releases\//.exec(ev.url ?? "")?.[1] ?? REPOS.resultados;
  mkdirSync(destinoDir, { recursive: true });
  const env = { ...process.env };
  const chavePath = Object.keys(env).find(k => k.toUpperCase() === "PATH") ?? "PATH";
  if (process.platform === "win32") env[chavePath] = ["C:\\Program Files\\GitHub CLI", env[chavePath]].filter(Boolean).join(delimiter);
  const r = spawnSync("gh", ["release", "download", ev.release, "--repo", repo, "--pattern", ev.anexo, "--dir", destinoDir],
    { encoding: "utf8", timeout: 300_000, windowsHide: true, env });
  if (r.error) return { ok: false, erro: `gh indisponível (${(r.error as NodeJS.ErrnoException).code ?? r.error.message})` };
  if (r.status !== 0) return { ok: false, erro: `gh release download falhou: ${(r.stderr || r.stdout || "").trim().slice(0, 300)}` };
  return { ok: true };
};

// ───────────────────────────────────────────────────────────────── plano do trio (puro)

export interface SlotDoTrio { slot: string; braco: ArmV2; posicao: number; escolhida: EntradaIndice; tentativas: Tentativa[] }
export type EscolhaLinhaDeBase =
  | { slot: string; tipo: "registro"; entrada: EntradaIndice }
  | { slot: string; tipo: "ausencia-planejada"; justificativa: string; declaradaEm: string };
export interface PlanoTrio {
  campanha: string;
  /** O id do grupo como o índice o grava (`par`), que nomeia a pasta da análise. */
  trio: string;
  ordem: "agenda" | "design.arms";
  slots: SlotDoTrio[];
  linhaDeBase: EscolhaLinhaDeBase;
}

/**
 * Slots do trio na ordem da agenda, a tentativa que entra de cada um e a linha de base pela regra fixa.
 * Puro: só lê as entradas do índice, a campanha e a agenda (ou a falta dela).
 */
export function planoDoTrio(entradas: EntradaIndice[], campanha: AnyCampaign, agenda: Agenda | null, trio: string): PlanoTrio {
  const c = campanha.campaignId;
  const execs = entradas.filter(e => e.tipo === "execucao" && e.campanha === c);
  let slots: { slot: string; braco: ArmV2; posicao: number }[];
  let ordem: PlanoTrio["ordem"];
  if (agenda) {
    if (agenda.campaignId !== c) recusar(`a agenda é da campanha ${agenda.campaignId}, não de ${c}`);
    const doGrupo = agenda.slots.filter(s => s.pairId === trio || execs.some(e => e.par === trio && e.slot === s.slotId));
    if (!doGrupo.length) recusar(`o grupo ${trio} não está na agenda de ${c}`);
    const grupos = new Set(doGrupo.map(s => s.pairId));
    if (grupos.size !== 1) recusar(`${trio} cai em mais de um grupo da agenda (${[...grupos].join(", ")})`);
    slots = [...doGrupo].sort((a, b) => a.order - b.order).map((s, i) => ({ slot: s.slotId, braco: s.arm, posicao: i + 1 }));
    ordem = "agenda";
  } else {
    if (campanha.design.order === "quadrado-latino") recusar(`a campanha ${c} sorteia a ordem (quadrado latino) e não há agenda arquivada: sem ela não se sabe o primeiro slot`);
    const doGrupo = execs.filter(e => e.par === trio || (e.slot ?? "").startsWith(`${trio}-`));
    if (!doGrupo.length) recusar(`o grupo ${trio} não está no índice da campanha ${c}`);
    const arms = campanha.design.arms as readonly ArmV2[];
    const porBraco = new Map<ArmV2, Set<string>>();
    for (const e of doGrupo) {
      if (!e.braco || !e.slot) recusar(`a entrada ${e.chave} não diz o braço ou o slot`);
      if (!arms.includes(e.braco!)) recusar(`a entrada ${e.chave} é do braço ${e.braco}, fora do desenho de ${c}`);
      porBraco.set(e.braco!, (porBraco.get(e.braco!) ?? new Set()).add(e.slot!));
    }
    for (const a of arms) {
      const s = porBraco.get(a);
      if (!s) recusar(`trio incompleto: falta o braço ${a} de ${trio} no índice`);
      if (s!.size > 1) recusar(`o braço ${a} de ${trio} aparece em mais de um slot (${[...s!].join(", ")})`);
    }
    slots = arms.map((a, i) => ({ slot: [...porBraco.get(a)!][0], braco: a, posicao: i + 1 }));
    ordem = "design.arms";
  }

  const escolhidos: SlotDoTrio[] = slots.map(s => {
    const ts = tentativasDoSlot(entradas, campanha, s.slot);
    const sel = tentativaSelecionada(ts);
    if (!sel) recusar(`o slot ${s.slot} não tem tentativa elegível${ts.length ? `: ${ts.map(t => `${t.chave} — ${t.motivo}`).join("; ")}` : " (não iniciado)"}`);
    const e = execs.find(x => x.chave === sel!.chave)!;
    if (e.braco !== s.braco) recusar(`a tentativa ${e.chave} do slot ${s.slot} é do braço ${e.braco}, não ${s.braco}`);
    return { ...s, escolhida: e, tentativas: ts };
  });
  const pares = new Set(escolhidos.map(s => s.escolhida.par));
  if (pares.size !== 1 || !escolhidos[0].escolhida.par) recusar(`as tentativas escolhidas não registram o mesmo grupo no índice (${[...pares].join(", ")})`);
  const nome = escolhidos[0].escolhida.par!;
  if (!ID.test(nome)) recusar(`id de grupo inválido no índice: ${nome}`);

  // regra fixa (achado E): a linha de base do PRIMEIRO slot, do mesmo disparo
  const primeiro = escolhidos[0];
  const mc = primeiro.escolhida.manifestoColeta?.sha256 ?? recusar(`a tentativa ${primeiro.escolhida.chave} não registra manifesto de coleta`);
  const lbs = entradas.filter(e => e.tipo === "linha-de-base" && e.campanha === c && e.slot === primeiro.slot && e.manifestoColeta?.sha256 === mc);
  if (lbs.length > 1) recusar(`o slot ${primeiro.slot} tem ${lbs.length} linhas de base do mesmo disparo (${lbs.map(e => e.chave).join(", ")}): ambíguo, nada analisado`);
  let linhaDeBase: EscolhaLinhaDeBase;
  if (lbs.length === 1) linhaDeBase = { slot: primeiro.slot, tipo: "registro", entrada: lbs[0] };
  else {
    const aus = campanha.baselinePolicy.plannedAbsences.find(a => a.screenId === primeiro.escolhida.tela);
    if (!aus) recusar(`linha de base ausente: o disparo ${primeiro.escolhida.chave} do primeiro slot (${primeiro.slot}) não arquivou linha de base, e a campanha não declara ausência planejada para a tela; a regra não aceita a de outro slot`);
    linhaDeBase = { slot: primeiro.slot, tipo: "ausencia-planejada", justificativa: aus!.justification, declaradaEm: aus!.declaredAt };
  }
  return { campanha: c, trio: nome, ordem, slots: escolhidos, linhaDeBase };
}

// ───────────────────────────────────────────────────────────────── arquivo: campanha, manifestos, anexos

function dentro(arquivo: string, rel: string): string {
  const abs = resolve(arquivo, rel);
  if (!abs.startsWith(resolve(arquivo))) recusar(`caminho escapa do arquivo: ${rel}`);
  return abs;
}

/** A campanha congelada: a cópia arquivada; se o govbr-eval tem `campanhas/<id>/campaign.json`, os bytes (do blob commitado, `bytesDaCampanha`) têm de ser os mesmos. */
function lerCampanha(arquivo: string, id: string, raizEval: string): { campanha: AnyCampaign; rel: string; sha256: string } {
  const repo = join(raizEval, "campanhas", id, "campaign.json");
  let shaCampanha: string;
  if (existsSync(repo)) {
    let b: Buffer;
    try { b = bytesDaCampanha(raizEval, id); } catch (e) { recusar(e instanceof Error ? e.message : String(e)); }
    shaCampanha = sha(b!);
  }
  else {
    const dir = join(arquivo, "campanhas", id);
    const subs = existsSync(dir) ? readdirSync(dir).filter(s => /^[0-9a-f]{64}$/.test(s)) : [];
    if (subs.length !== 1) recusar(`campanha ${id}: ${subs.length} cópias arquivadas e nenhuma em campanhas/${id}/campaign.json do govbr-eval; não se sabe qual vale`);
    shaCampanha = subs[0];
  }
  const rel = caminhoCampanha(id, shaCampanha);
  const abs = dentro(arquivo, rel);
  if (!existsSync(abs)) recusar(`a campanha ${id} (sha256 ${curto(shaCampanha)}…) não está arquivada em ${rel}`);
  if (sha(readFileSync(abs)) !== shaCampanha) recusar(`hash divergente: ${rel} não tem o sha256 do nome da pasta`);
  const campanha = JSON.parse(readFileSync(abs, "utf8")) as AnyCampaign;
  if (campanha.campaignId !== id) recusar(`${rel} é da campanha ${campanha.campaignId}`);
  return { campanha, rel, sha256: shaCampanha };
}

function lerManifesto(arquivo: string, e: EntradaIndice): { manifest: IsolatedCollectionManifest; sha256: string } {
  const mc = e.manifestoColeta ?? recusar(`a entrada ${e.chave} não registra manifesto de coleta`);
  const abs = dentro(arquivo, mc.caminho);
  if (!existsSync(abs)) recusar(`manifesto de coleta ausente do arquivo: ${mc.caminho}`);
  if (sha(readFileSync(abs)) !== mc.sha256) recusar(`hash divergente: o manifesto de coleta ${mc.caminho} não tem o sha256 do índice (${curto(mc.sha256)}…)`);
  const lido = readIsolatedManifest(abs);
  return { manifest: lido.manifest, sha256: lido.sha256 };
}

function conjuntoDoDespacho(arquivo: string, e: EntradaIndice): string {
  let id: unknown = null;
  try { id = (JSON.parse(readFileSync(join(dentro(arquivo, e.caminho), "despacho.json"), "utf8")) as { snapshots?: unknown }).snapshots; } catch { /* abaixo */ }
  if (typeof id !== "string" || !ID.test(id)) recusar(`o despacho de ${e.chave} não registra o conjunto de snapshots`);
  return id as string;
}

/** O anexo de evidências conferido pelo sha256 do índice: o que já está na máquina, ou baixado. Divergência = recusa. */
export function anexoConferido(arquivo: string, e: EntradaIndice, anexos: string[], baixar: Baixador | null): string {
  const ev = e.evidencias;
  if (!ev?.sha256 || !ev.anexo || !ev.release) recusar(`a entrada ${e.chave} não registra o anexo de evidências (nome, Release e sha256)`);
  if (!ID.test(ev!.release!) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.tar\.gz$/.test(ev!.anexo!)) recusar(`nome de Release ou de anexo fora do formato em ${e.chave}`);
  const local = join(arquivo, "anexos", ev!.release!);
  const alvo = join(local, ev!.anexo!);
  const candidatos = [alvo, ...anexos.flatMap(d => [join(d, ev!.anexo!), join(d, ev!.release!, ev!.anexo!)])];
  for (const p of candidatos) {
    if (!existsSync(p)) continue;
    const h = sha(readFileSync(p));
    if (h !== ev!.sha256) recusar(`hash divergente: ${p} tem sha256 ${curto(h)}…, o índice registra ${curto(ev!.sha256)}… para ${ev!.anexo}; nada foi analisado (o arquivo não foi tocado)`);
    return p;
  }
  if (!baixar) recusar(`anexo ausente: ${ev!.anexo} (Release ${ev!.release}) não está em anexos/${ev!.release}/ e o download está desligado`);
  const r = baixar!(e, local);
  if (!r.ok) recusar(`download do anexo ${ev!.anexo} falhou: ${r.erro}`);
  if (!existsSync(alvo)) recusar(`o download não deixou ${ev!.anexo} em anexos/${ev!.release}/`);
  const h = sha(readFileSync(alvo));
  if (h !== ev!.sha256) recusar(`hash divergente: o anexo baixado ${ev!.anexo} tem sha256 ${curto(h)}…, o índice registra ${curto(ev!.sha256)}…; nada foi analisado (o arquivo baixado fica em anexos/${ev!.release}/ para inspeção)`);
  return alvo;
}

/** O pacote INTEIRO em `restauracoes/<runId>/<pasta>/`: o cache íntegro é reaproveitado; cache divergente = recusa. */
function pacoteRestaurado(arquivo: string, e: EntradaIndice, anexo: string): string {
  const pasta = basename(e.caminho);
  const destino = join(arquivo, "restauracoes", e.chave, pasta);
  if (existsSync(destino)) {
    const pac = problemasDoPacote(destino);
    const manifesto = join(destino, "artifact-manifest.json");
    if (!pac.problemas.length && existsSync(manifesto) && sha(readFileSync(manifesto)) === e.pacote?.artifactManifestSha256) return destino;
    recusar(`cache de restauração divergente em ${destino}${pac.problemas.length ? ` (${pac.problemas.slice(0, 3).join("; ")})` : ""}: mova-o para fora e rode de novo`);
  }
  const tmp = join(arquivo, "restauracoes", `.em-andamento-${e.chave}-${Date.now()}`);
  try {
    const r = restaurar(arquivo, e.chave, anexo, tmp);
    if (!r.ok) recusar(`a restauração de ${e.chave} não conferiu: ${r.problemas.join("; ")}`);
    mkdirSync(join(arquivo, "restauracoes", e.chave), { recursive: true });
    renameSync(join(tmp, pasta), destino);
    return destino;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Próximo carimbo do dia (UTC): `AAAAMMDDT<n>`, n = 1 + o maior já usado na pasta do trio. */
export function proximoCarimbo(dirTrio: string, agora = new Date()): string {
  const dia = agora.toISOString().slice(0, 10).replace(/-/g, "");
  const usados = existsSync(dirTrio) ? readdirSync(dirTrio).map(n => new RegExp(`^analisar-${dia}T(\\d+)$`).exec(n)?.[1]).filter(Boolean).map(Number) : [];
  return `${dia}T${Math.max(0, ...usados) + 1}`;
}

// ───────────────────────────────────────────────────────────────── coleta

export interface OpcoesColeta {
  /** Clone do govbr-resultados. */
  arquivo: string;
  campanha: string;
  trio: string;
  carimbo?: string;
  /** Pastas extras onde procurar `<anexo>.tar.gz`. */
  anexos?: string[];
  /** null = não baixa (o anexo tem de estar na máquina). */
  baixar: Baixador | null;
  /** Raiz do govbr-eval (onde está `campanhas/<id>/`); padrão: este repositório. */
  raizEval?: string;
}

export interface ResultadoColeta { saida: string; estado: string; sinais: Sinais; registro: string }

export async function coletarTrio(o: OpcoesColeta): Promise<ResultadoColeta> {
  const arquivo = resolve(o.arquivo);
  if (!ID.test(o.campanha) || !ID.test(o.trio)) recusar("id de campanha ou de trio inválido");
  const raizEval = resolve(o.raizEval ?? RAIZ);
  const camp = lerCampanha(arquivo, o.campanha, raizEval);
  const entradas = lerEntradasDoIndice(arquivo);

  // agenda: a arquivada (a que o disparo usou); senão a do govbr-eval; campanha sem agenda segue a ordem do desenho
  let agenda: Agenda | null = null;
  const arq = lerAgendaDoArquivo(arquivo, o.campanha);
  if (arq) {
    if (arq.problemas.length) recusar(`agenda arquivada de ${o.campanha} com problemas: ${arq.problemas.join("; ")}`);
    agenda = arq.agenda;
  } else if (existsSync(join(raizEval, "campanhas", o.campanha, "agenda.json"))) agenda = lerAgenda(join(raizEval, "campanhas", o.campanha, "agenda.json"));
  if (agenda && agenda.campaign.sha256 !== camp.sha256) recusar(`a agenda serve à campanha de sha256 ${curto(agenda.campaign.sha256)}…, não à arquivada ${curto(camp.sha256)}…`);

  const plano = planoDoTrio(entradas, camp.campanha, agenda, o.trio);

  // manifestos de coleta: mesma campanha, referência, plano e site em todos os slots
  const manifestos = plano.slots.map(s => lerManifesto(arquivo, s.escolhida));
  const m0 = manifestos[0].manifest;
  for (const [i, { manifest: m }] of manifestos.entries()) {
    if (m.campaign && m.campaign.sha256 !== camp.sha256) recusar(`${plano.slots[i].escolhida.chave} foi coletada com outra campanha (sha256 ${curto(m.campaign.sha256)}…)`);
    for (const k of ["referenceSha256", "statePlanSha256", "siteManifestSha256"] as const) {
      if (m.identity[k] !== m0.identity[k]) recusar(`os slots do trio divergem em ${k}: não formam grupo`);
    }
  }

  // conjunto de snapshots, referência, site — cada um pelo sha256 registrado
  const conjuntos = [...new Set(plano.slots.map(s => conjuntoDoDespacho(arquivo, s.escolhida)))];
  if (conjuntos.length !== 1) recusar(`os slots apontam conjuntos de snapshots diferentes: ${conjuntos.join(", ")}`);
  let snapsRel = "";
  try { snapsRel = resolverConjunto(arquivo, conjuntos[0], camp.campanha.fixture).caminho; } catch (e) {
    if (e instanceof Recusa) recusar(e.message);
    throw e;
  }
  const snaps = JSON.parse(readFileSync(dentro(arquivo, snapsRel), "utf8")) as SnapshotManifest;
  if (!validateContract(snaps).valid) recusar(`${snapsRel} fora do contrato snapshot-manifest.v1`);
  const item = (kind: string) => snaps.items.find(i => i.kind === kind);
  if (item("site")?.sha256 !== m0.identity.siteManifestSha256 || item("reference")?.sha256 !== m0.reference.sha256 || item("state-plan")?.sha256 !== m0.identity.statePlanSha256) {
    recusar("hash divergente: o conjunto de snapshots não aponta o site, a referência e o plano do manifesto de coleta");
  }
  const refRel = caminhoReferencia(m0.reference.sha256);
  if (!existsSync(dentro(arquivo, refRel)) || sha(readFileSync(dentro(arquivo, refRel))) !== m0.reference.sha256) recusar(`referência congelada ausente ou divergente: ${refRel}`);
  const siteRel = caminhoSite(m0.identity.siteManifestSha256!);
  let siteOk = false;
  try { siteOk = loadSite(dentro(arquivo, siteRel)).manifestSha256 === m0.identity.siteManifestSha256; } catch { siteOk = false; }
  if (!siteOk) recusar(`site congelado ausente ou divergente: ${siteRel}`);

  // linha de base pela regra fixa: o registro do primeiro slot, conferido contra o bruto
  let linhaDeBase: string | undefined;
  let registroLb: Record<string, unknown>;
  if (plano.linhaDeBase.tipo === "registro") {
    const e = plano.linhaDeBase.entrada;
    const reg = join(dentro(arquivo, e.caminho), "baseline.json");
    if (!existsSync(reg)) recusar(`registro da linha de base ausente: ${e.caminho}/baseline.json`);
    linhaDeBase = reg;
    registroLb = { slot: plano.linhaDeBase.slot, tipo: "registro", baselineId: e.chave, estado: e.estado.linhaDeBase, caminho: `${e.caminho}/baseline.json`,
      registroSha256: sha(readFileSync(reg)), manifestoColeta: e.manifestoColeta?.sha256 ?? null, dataUtc: e.dataUtc };
  } else {
    registroLb = { slot: plano.linhaDeBase.slot, tipo: "ausencia-planejada", justificativa: plano.linhaDeBase.justificativa, declaradaEm: plano.linhaDeBase.declaradaEm };
  }

  // anexos (sha256 do índice) e pacotes restaurados
  const pacotes: Partial<Record<ArmV2, string>> = {};
  const anexosUsados: Record<string, unknown>[] = [];
  for (const s of plano.slots) {
    const anexo = anexoConferido(arquivo, s.escolhida, (o.anexos ?? []).map(d => resolve(d)), o.baixar);
    pacotes[s.braco] = pacoteRestaurado(arquivo, s.escolhida, anexo);
    anexosUsados.push({ slot: s.slot, release: s.escolhida.evidencias!.release, anexo: s.escolhida.evidencias!.anexo, sha256: s.escolhida.evidencias!.sha256 });
  }

  const dirTrio = join(arquivo, "analises", plano.campanha, plano.trio);
  const carimbo = o.carimbo ?? proximoCarimbo(dirTrio);
  if (!/^[0-9A-Za-z][0-9A-Za-z-]{0,63}$/.test(carimbo)) recusar(`carimbo fora do formato: ${carimbo}`);
  const saida = join(dirTrio, `analisar-${carimbo}`);
  if (existsSync(saida)) recusar(`a pasta de análise já existe: ${saida}; cada coleta grava numa pasta nova`);

  const r = await analisar({
    ...pacotes, campanha: dentro(arquivo, camp.rel), snapshots: dentro(arquivo, snapsRel), referencia: dentro(arquivo, refRel), site: dentro(arquivo, siteRel),
    ...(linhaDeBase ? { linhaDeBase } : { semLinhaDeBase: true }), arquivo, saida,
  });
  const sinais = sinaisTecnicos(saida);
  writeFileSync(join(saida, "sinais-tecnicos.json"), json(sinais), { flag: "wx" });
  const registro = join(saida, "coleta-trio.json");
  writeFileSync(registro, json({
    formato: COLETA_TRIO_VERSAO, geradoEm: new Date().toISOString(), campanha: { id: plano.campanha, sha256: camp.sha256, caminho: camp.rel },
    trio: plano.trio, ordem: plano.ordem, regraLinhaDeBase: REGRA_LINHA_DE_BASE, linhaDeBase: registroLb,
    slots: plano.slots.map(s => ({ slot: s.slot, braco: s.braco, posicao: s.posicao, escolhida: s.escolhida.chave,
      tentativas: s.tentativas.map(t => ({ chave: t.chave, classe: t.classe, motivo: t.motivo })), manifestoColeta: s.escolhida.manifestoColeta?.sha256 ?? null })),
    anexos: anexosUsados, entradas: { snapshots: snapsRel, referencia: refRel, site: siteRel },
    analise: { estado: r.estado },
  }), { flag: "wx" });
  return { saida, estado: r.estado, sinais, registro };
}

// ───────────────────────────────────────────────────────────────── CLI (stdout = só os sinais técnicos)

const USO = "Uso: npm run coleta:trio -- --campanha ID --trio GRUPO [--arquivo CLONE_GOVBR_RESULTADOS] [--carimbo AAAAMMDDTn] [--anexos DIR] [--sem-download]";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const campanha = val("campanha"), trio = val("trio");
  if (!campanha || !trio) { console.error(USO); process.exitCode = 1; }
  else {
    // nada da análise sai no stdout: qualquer log durante a coleta vai para o stderr
    const log = console.log, info = console.info, warn = console.warn;
    console.log = console.info = console.warn = (...a: unknown[]) => console.error(...a);
    coletarTrio({ arquivo: val("arquivo") ?? join(RAIZ, "..", "govbr-resultados"), campanha, trio, carimbo: val("carimbo"),
      anexos: argv.flatMap((a, i) => (a === "--anexos" && argv[i + 1] ? [argv[i + 1]] : [])), baixar: argv.includes("--sem-download") ? null : baixarComGh })
      .then(r => {
        console.log = log; console.info = info; console.warn = warn;
        for (const l of linhasDosSinais(r.sinais)) console.log(l);
        console.error(`pasta: ${r.saida} (achados só nos arquivos; escolha da linha de base em coleta-trio.json)`);
        process.exitCode = r.sinais.defeitos.length ? 2 : 0;
      })
      .catch(e => {
        console.log = log; console.info = info; console.warn = warn;
        console.error(e instanceof RecusaColeta ? `RECUSADA: ${e.message}` : e instanceof Error ? e.message : e);
        process.exitCode = 1;
      });
  }
}
