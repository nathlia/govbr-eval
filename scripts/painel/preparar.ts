/**
 * Painel de resultados (T8a.1) — "Preparar análise": a PRIMEIRA análise de uma execução ou de um par
 * arquivado pelo T4, sem ninguém escrever `receita.json` nem restaurar pacote à mão.
 *
 * A partir só do arquivo (clone do govbr-resultados):
 *   1. escolhe as entradas do índice (um braço por lado; tentativa repetida = recusa com motivo);
 *   2. lê o manifesto de coleta de cada uma, conferido pelo sha256 do índice — dele saem a campanha
 *      (manifesto 1.1.0), a referência, o plano de estados e o site, todos por conteúdo;
 *   3. confere cada entrada da análise no arquivo pelo sha256 que o manifesto registrou: campanha,
 *      conjunto de snapshots, referência (lida só para o hash; nunca servida), site congelado;
 *   4. escolhe a linha de base arquivada dos mesmos disparos (utilizável primeiro);
 *   5. restaura cada pacote INTEIRO (com evidence/) do anexo da Release com `restaurar()` do T4, que
 *      confere o sha256 do anexo, do manifesto de artefatos e de cada arquivo; o anexo vem de
 *      `anexos/` no arquivo, de uma pasta indicada (`--anexos`) ou, se permitido, de `gh release download`;
 *   6. só então grava a receita e chama o mesmo `recalcular()` do botão Recalcular → `rev-001`.
 *
 * Qualquer falta para a preparação ANTES da receita, com etapa e motivo em
 * `analises/<campanha>/<alvo>/preparacao/falhas/<carimbo>/erro.json`; nada parcial vira análise.
 * Referência que navega (tela B, D-60) segue o mesmo caminho desde o D-98: a análise monta uma cena por
 * segmento (scripts/preparo-cenas.ts).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { validateContract, type Arm, type Campaign, type SnapshotManifest } from "../../contracts/index";
import {
  REPOS, Recusa, caminhoCampanha, caminhoReferencia, caminhoSite, problemasDoPacote, resolverConjunto, restaurar, sha, type EntradaIndice,
} from "../arquivo-resultados";
import { readIsolatedManifest, type IsolatedCollectionManifest } from "../manifesto-coleta-isolada";
import { loadSite } from "../measurement-surface";
import { ARMS, ID, RECEITA_VERSAO, cloneComCrlf, dentroDoArquivo, lerAnalise, lerIndice, relArquivo, type Receita, type Selo } from "./modelo";
import { recalcular } from "./revisao";
import { lerAgendaDoArquivo } from "./agenda-painel";
import { tentativaSelecionada, tentativasDoSlot } from "../agenda-campanha";

export type AlvoPreparo = { tipo: "par"; campanha: string; par: string } | { tipo: "individual"; runId: string };

/** Como o painel consegue o anexo de evidências que não está na máquina. */
export type Baixador = (e: EntradaIndice, destinoDir: string) => { ok: true } | { ok: false; erro: string };
export interface OpcoesPreparo {
  /** Pastas extras onde procurar `<anexo>.tar.gz` (além de `anexos/<release>/` dentro do arquivo). */
  anexos?: string[];
  /** null = não baixa nada (padrão nos testes); `baixarComGh` = `gh release download` com a sessão da autora. */
  baixar?: Baixador | null;
}

export interface FalhaPreparo { em: string; etapa: string; motivo: string; rel: string }

export interface Diagnostico {
  /** campanha/alvo da pasta da análise (alvo = id do par ou runId). */
  campanha: string | null; alvo: string | null; tipo: "par" | "individual";
  /** O botão aparece? (sem análise ainda, entradas arquivadas, manifesto 1.1.0) */
  pode: boolean;
  selo: Selo;
  motivo: string | null;
  ultimaFalha: FalhaPreparo | null;
  execucoes: Partial<Record<Arm, string>>;
}

export type ResultadoPreparo =
  | { ok: true; analise: string; revisao: string; estado: string }
  | { ok: false; etapa: string; erro: string; falha: string | null };

class ErroPreparo extends Error {
  constructor(public etapa: string, message: string) { super(message); this.name = "ErroPreparo"; }
}
const falhar = (etapa: string, motivo: string): never => { throw new ErroPreparo(etapa, motivo); };
const carimbo = (): string => new Date().toISOString().replace(/[:.]/g, "-");
const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";
const curto = (s: string | null | undefined): string => (s ?? "").slice(0, 12);

// ───────────────────────────────────────────────────────────────── alvo → entradas do índice

interface AlvoResolvido {
  campanha: string; alvo: string; tipo: "par" | "individual";
  entradas: Partial<Record<Arm, EntradaIndice>>;
  selecao?: NonNullable<Receita["preparo"]>["selecaoTentativas"];
}

/** Um braço: a única tentativa arquivada. Repetição, pacote inválido ou interrompido dão motivo próprio. */
function escolherBraco(arm: Arm, xs: EntradaIndice[]): EntradaIndice {
  if (!xs.length) falhar("entradas", `par incompleto: falta o braço ${arm} no arquivo`);
  const arquivadas = xs.filter(e => e.estado.arquivo === "arquivado");
  if (arquivadas.length > 1) {
    falhar("entradas", `o braço ${arm} tem ${arquivadas.length} tentativas arquivadas (${arquivadas.map(e => e.chave).join(", ")}); escolher a tentativa pela política da campanha ainda não é feito pelo painel`);
  }
  if (arquivadas.length === 1) return arquivadas[0];
  const e = xs[0];
  const por: Record<string, string> = {
    "sem-pacote": "foi interrompido sem pacote: não há o que analisar",
    "pacote-invalido": `foi arquivado com o pacote inválido (${e.motivo ?? "motivo não registrado"})`,
    "retido-segredo": "foi retido (credencial no pacote): nada foi publicado",
  };
  return falhar("entradas", `o braço ${arm} ${por[e.estado.arquivo] ?? `está no estado ${e.estado.arquivo}`}`);
}

function resolverAlvo(arquivo: string, alvo: AlvoPreparo): AlvoResolvido {
  const execucoes = lerIndice(arquivo).map(l => l.entrada).filter((e): e is EntradaIndice => Boolean(e && e.tipo === "execucao"));
  if (alvo.tipo === "par") {
    if (!ID.test(alvo.campanha) || !ID.test(alvo.par)) falhar("entradas", "id de campanha ou par inválido");
    const xs = execucoes.filter(e => e.campanha === alvo.campanha && e.par === alvo.par);
    if (!xs.length) falhar("entradas", `o par ${alvo.par} não está no índice`);
    const ag = lerAgendaDoArquivo(arquivo, alvo.campanha);
    if (ag) {
      // NAT-65: com agenda, cada braço é o slot dele, e entra a PRIMEIRA tentativa elegível (protocolo §7)
      const entradas: AlvoResolvido["entradas"] = {};
      const slots: NonNullable<AlvoResolvido["selecao"]>["slots"] = {};
      for (const arm of ARMS) {
        const slot = ag.agenda.slots.find(s => s.pairId === alvo.par && s.arm === arm);
        if (!slot) falhar("entradas", `o par ${alvo.par} não está na agenda da campanha`);
        const ts = tentativasDoSlot(execucoes, ag.campanha, slot!.slotId);
        const sel = tentativaSelecionada(ts);
        if (!sel) falhar("entradas", `o slot ${slot!.slotId} não tem tentativa elegível${ts.length ? `: ${ts.map(t => `${t.chave} — ${t.motivo}`).join("; ")}` : " (não iniciado)"}`);
        entradas[arm] = execucoes.find(e => e.chave === sel!.chave)!;
        slots[arm] = { slot: slot!.slotId, escolhida: sel!.chave, tentativas: ts.map(t => ({ chave: t.chave, classe: t.classe, motivo: t.motivo })) };
      }
      return { campanha: alvo.campanha, alvo: alvo.par, tipo: "par", entradas,
        selecao: { regra: `${ag.campanha.retryPolicy.attemptSelection} (NAT-65: a primeira tentativa elegível do slot, na ordem do disparo)`, agendaSemente: ag.agenda.seed.commit, slots } };
    }
    const entradas: AlvoResolvido["entradas"] = {};
    for (const arm of ARMS) entradas[arm] = escolherBraco(arm, xs.filter(e => e.braco === arm));
    return { campanha: alvo.campanha, alvo: alvo.par, tipo: "par", entradas };
  }
  if (!ID.test(alvo.runId)) falhar("entradas", "id de execução inválido");
  const e = execucoes.find(x => x.chave === alvo.runId) ?? falhar("entradas", `a execução ${alvo.runId} não está no índice`);
  if (!e.braco) falhar("entradas", "a entrada não diz o braço");
  const escolhida = escolherBraco(e.braco!, [e]);
  return { campanha: e.campanha, alvo: e.chave, tipo: "individual", entradas: { [e.braco!]: escolhida } };
}

// ───────────────────────────────────────────────────────────────── manifesto de coleta (por sha256)

interface ManifestoLido { manifest: IsolatedCollectionManifest; sha256: string }

function lerManifesto(arquivo: string, e: EntradaIndice): ManifestoLido {
  const mc = e.manifestoColeta ?? falhar("manifesto", `a entrada ${e.chave} não registra manifesto de coleta (o job preparar não concluiu?)`);
  let abs: string;
  try { abs = dentroDoArquivo(arquivo, mc.caminho); } catch { return falhar("manifesto", `caminho inválido do manifesto de coleta: ${mc.caminho}`); }
  if (!existsSync(abs)) falhar("manifesto", `manifesto de coleta ausente do arquivo: ${mc.caminho}`);
  const bytes = readFileSync(abs);
  if (sha(bytes) !== mc.sha256) falhar("manifesto", `hash divergente: o manifesto de coleta em ${mc.caminho} não tem o sha256 que o índice registra (${curto(mc.sha256)}…)`);
  let lido: ReturnType<typeof readIsolatedManifest>;
  try { lido = readIsolatedManifest(abs); } catch (err) { return falhar("manifesto", (err as Error).message); }
  if (!lido.manifest.campaign) {
    falhar("manifesto", `o manifesto de coleta de ${e.chave} é ${lido.manifest.manifestVersion} (arquivado antes do T8a.1) e não traz a campanha; esta execução não pode ser preparada pelo painel`);
  }
  return { manifest: lido.manifest, sha256: lido.sha256 };
}

/**
 * Hash divergente num clone cujo Git converteu os finais de linha (core.autocrlf=true): a causa não é
 * adulteração, e a correção é uma vez só, no clone. A conferência continua byte a byte (nada é aceito).
 */
export const DICA_CRLF = "Causa provável: o Git desta máquina trocou os finais de linha do clone (core.autocrlf); corrija o clone uma vez com os comandos de “Finais de linha” em Como usar e tente de novo.";
export function comDicaCrlf(arquivo: string, motivo: string): string {
  return /hash divergente/.test(motivo) && !motivo.includes(DICA_CRLF) && cloneComCrlf(arquivo) ? `${motivo.replace(/\s*$/, "")} ${DICA_CRLF}` : motivo;
}

// ───────────────────────────────────────────────────────────────── falhas de preparo

const dirAnalise = (arquivo: string, campanha: string, alvo: string): string => join(arquivo, "analises", campanha, alvo);

export function ultimaFalhaDePreparo(arquivo: string, campanha: string, alvo: string): FalhaPreparo | null {
  if (!ID.test(campanha) || !ID.test(alvo)) return null;
  const dir = join(dirAnalise(arquivo, campanha, alvo), "preparacao", "falhas");
  if (!existsSync(dir)) return null;
  const fs = readdirSync(dir).sort().reverse();
  for (const c of fs) {
    try {
      const e = JSON.parse(readFileSync(join(dir, c, "erro.json"), "utf8")) as { em: string; etapa: string; motivo: string };
      return { em: e.em, etapa: e.etapa, motivo: e.motivo, rel: relArquivo(arquivo, join(dir, c)) };
    } catch { /* erro.json ilegível: tenta a anterior */ }
  }
  return null;
}

function registrarFalha(arquivo: string, campanha: string, alvo: string, etapa: string, motivo: string): string {
  const c = carimbo();
  const dir = join(dirAnalise(arquivo, campanha, alvo), "preparacao", "falhas", c);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "erro.json"), json({ em: new Date().toISOString(), etapa, motivo }), { flag: "wx" });
  return relArquivo(arquivo, dir);
}

// ───────────────────────────────────────────────────────────────── diagnóstico (barato: só lê índice e manifestos)

const ROTULO_ETAPA: Record<string, string> = {
  entradas: "entradas do índice", manifesto: "manifesto de coleta", campanha: "campanha", snapshots: "snapshots", referencia: "referência",
  site: "site congelado", "linha-de-base": "linha de base", anexo: "anexo de evidências", restauracao: "restauração do pacote", receita: "receita",
};
export const rotuloEtapa = (e: string): string => ROTULO_ETAPA[e] ?? e;

export function diagnosticoPreparo(arquivo: string, alvo: AlvoPreparo): Diagnostico {
  const base = alvo.tipo === "par" ? { campanha: alvo.campanha, alvo: alvo.par } : { campanha: null as string | null, alvo: alvo.runId };
  const vazio: Diagnostico = { ...base, tipo: alvo.tipo, pode: false, selo: { estado: "nao-se-aplica", texto: "" }, motivo: null, ultimaFalha: null, execucoes: {} };
  let r: AlvoResolvido;
  try { r = resolverAlvo(arquivo, alvo); } catch (e) {
    const motivo = (e as Error).message;
    const incompleto = /par incompleto/.test(motivo);
    return { ...vazio, motivo, selo: incompleto ? { estado: "par-incompleto", texto: "par incompleto: a análise de par espera os dois braços" } : { estado: "nao-se-aplica", texto: "não dá para preparar a análise" } };
  }
  const execucoes = Object.fromEntries(ARMS.filter(a => r.entradas[a]).map(a => [a, r.entradas[a]!.chave])) as Diagnostico["execucoes"];
  const d: Diagnostico = { ...vazio, campanha: r.campanha, alvo: r.alvo, execucoes, ultimaFalha: ultimaFalhaDePreparo(arquivo, r.campanha, r.alvo) };
  if (lerAnalise(arquivo, r.campanha, r.alvo)?.revisoes.length) return { ...d, selo: { estado: "ok", texto: "análise já preparada" }, motivo: "já existe análise para este alvo" };
  try {
    // cada manifesto de coleta legível e conferido pelo sha256 do índice; senão não há o que preparar
    for (const arm of ARMS) {
      const e = r.entradas[arm];
      if (!e) continue;
      lerManifesto(arquivo, e);
    }
  } catch (e) {
    return { ...d, motivo: comDicaCrlf(arquivo, (e as Error).message), selo: { estado: "nao-se-aplica", texto: "não dá para preparar a análise" } };
  }
  if (d.ultimaFalha) return { ...d, pode: true, motivo: d.ultimaFalha.motivo, selo: { estado: "falha", texto: `preparação falhou (${rotuloEtapa(d.ultimaFalha.etapa)})` } };
  return { ...d, pode: true, selo: { estado: "sem-analise", texto: "sem análise: pronta para preparar" } };
}

/** Diagnóstico de cada par completo SEM análise (chave `campanha/par`), para a lista e a página do par. */
export function preparoDosPares(arquivo: string, pares: { campanha: string; par: string; faltando: Arm[]; analise: string | null }[]): Record<string, Diagnostico> {
  return Object.fromEntries(pares.filter(p => !p.analise && !p.faltando.length)
    .map(p => [`${p.campanha}/${p.par}`, diagnosticoPreparo(arquivo, { tipo: "par", campanha: p.campanha, par: p.par })]));
}

/**
 * Análise individual oferecida na página da execução só quando ela não está coberta por análise e não
 * tem par completo (num par completo, o caminho é a análise do par).
 */
export function preparoDaExecucao(arquivo: string, x: { chave: string; par: string | null; campanha: string; analise: string | null; caminho: string },
  parCompleto: boolean): Diagnostico | null {
  if (x.analise || parCompleto) return null;
  return diagnosticoPreparo(arquivo, { tipo: "individual", runId: x.chave });
}

// ───────────────────────────────────────────────────────────────── anexo e restauração

/** `gh release download` com a sessão da autora (só fora dos testes; nunca grava credencial). */
export const baixarComGh: Baixador = (e, destinoDir) => {
  const ev = e.evidencias;
  if (!ev?.release || !ev.anexo) return { ok: false, erro: "a entrada não diz a Release nem o nome do anexo" };
  const repo = /github\.com\/([^/]+\/[^/]+)\/releases\//.exec(ev.url ?? "")?.[1] ?? REPOS.resultados;
  mkdirSync(destinoDir, { recursive: true });
  const r = spawnSync("gh", ["release", "download", ev.release, "--repo", repo, "--pattern", ev.anexo, "--dir", destinoDir, "--skip-existing"],
    { encoding: "utf8", timeout: 180_000, windowsHide: true });
  if (r.error) return { ok: false, erro: `gh indisponível (${(r.error as NodeJS.ErrnoException).code ?? r.error.message}); instale e faça gh auth login, ou baixe o anexo à mão para anexos/${ev.release}/` };
  if (r.status !== 0) return { ok: false, erro: `gh release download falhou: ${(r.stderr || r.stdout || "").trim().slice(0, 300)}` };
  return { ok: true };
};

function localizarAnexo(arquivo: string, e: EntradaIndice, o: OpcoesPreparo): string {
  const ev = e.evidencias;
  if (!ev?.sha256 || !ev.anexo || !ev.release) return falhar("anexo", `a entrada ${e.chave} não registra o anexo de evidências (nome, Release e sha256)`);
  if (!ID.test(ev.release) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.tar\.gz$/.test(ev.anexo)) return falhar("anexo", "nome de Release ou de anexo fora do formato");
  const local = join(arquivo, "anexos", ev.release);
  const candidatos = [join(local, ev.anexo), ...(o.anexos ?? []).flatMap(d => [join(d, ev.anexo!), join(d, ev.release!, ev.anexo!)])];
  const divergentes: string[] = [];
  const conferir = (p: string): boolean => {
    if (!existsSync(p)) return false;
    const h = sha(readFileSync(p));
    if (h === ev.sha256) return true;
    divergentes.push(`${p} tem sha256 ${curto(h)}…`);
    return false;
  };
  for (const p of candidatos) if (conferir(p)) return p;
  let baixado: string | null = null;
  if (o.baixar && !existsSync(join(local, ev.anexo))) {
    const r = o.baixar(e, local);
    if (r.ok) { if (conferir(join(local, ev.anexo))) return join(local, ev.anexo); }
    else baixado = r.erro;
  }
  if (divergentes.length) {
    return falhar("anexo", `hash divergente: o anexo ${ev.anexo} encontrado não é o que o índice registra (sha256 ${curto(ev.sha256)}…): ${divergentes.join("; ")}. Nada foi restaurado.`);
  }
  return falhar("anexo", `anexo ausente: ${ev.anexo} (Release ${ev.release}, entrega ${ev.estado}) não está em anexos/${ev.release}/ no arquivo` +
    `${o.anexos?.length ? " nem nas pastas indicadas" : ""}${baixado ? `; download: ${baixado}` : o.baixar ? "" : "; o painel foi aberto sem download"}.`);
}

/** Pacote inteiro em `restauracoes/<runId>/<pasta>/`: reaproveita o cache íntegro, senão restaura do anexo. */
function pacoteRestaurado(arquivo: string, e: EntradaIndice, o: OpcoesPreparo): string {
  const pasta = basename(e.caminho);
  const rel = `restauracoes/${e.chave}/${pasta}`;
  const destino = join(arquivo, rel);
  if (existsSync(join(destino, "artifact-manifest.json"))) {
    const pac = problemasDoPacote(destino);
    if (!pac.problemas.length && sha(readFileSync(join(destino, "artifact-manifest.json"))) === e.pacote?.artifactManifestSha256) return rel;
    // cache adulterado ou parcial: sai do caminho (fica ao lado, para inspeção) e é restaurado de novo
    renameSync(destino, `${destino}.invalido-${carimbo()}`);
  }
  const anexo = localizarAnexo(arquivo, e, o);
  const tmp = join(arquivo, "restauracoes", `.em-andamento-${e.chave}-${carimbo()}`);
  try {
    const r = restaurar(arquivo, e.chave, anexo, tmp);
    if (!r.ok) falhar("restauracao", `a restauração de ${e.chave} não conferiu: ${r.problemas.join("; ")}`);
    mkdirSync(join(arquivo, "restauracoes", e.chave), { recursive: true });
    renameSync(join(tmp, pasta), destino);
    return rel;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ───────────────────────────────────────────────────────────────── entradas da análise (cada uma por sha256)

function arquivoConferido(arquivo: string, rel: string, esperado: string, etapa: string, rotulo: string): void {
  const abs = dentroDoArquivo(arquivo, rel);
  if (!existsSync(abs)) falhar(etapa, `${rotulo} ausente do arquivo: ${rel}`);
  if (sha(readFileSync(abs)) !== esperado) falhar(etapa, `hash divergente: ${rotulo} em ${rel} não tem o sha256 que o manifesto de coleta registrou (${curto(esperado)}…)`);
}

function conjuntoDoDespacho(arquivo: string, e: EntradaIndice): string {
  const d = join(dentroDoArquivo(arquivo, e.caminho), "despacho.json");
  let id: unknown = null;
  try { id = (JSON.parse(readFileSync(d, "utf8")) as { snapshots?: unknown }).snapshots; } catch { /* abaixo */ }
  if (typeof id !== "string" || !ID.test(id)) return falhar("snapshots", `o despacho de ${e.chave} não registra o conjunto de snapshots`);
  return id;
}

interface Escolha { linhaDeBase: string | null; semLinhaDeBase: boolean; nota: string }

/**
 * Linha de base dos MESMOS disparos (vínculo pelo sha256 do manifesto de coleta), da mesma campanha e
 * tela: a utilizável primeiro, na ordem dos braços coletados, a mais recente de cada disparo. Sem
 * utilizável: ausência planejada na campanha, se houver; senão o registro não utilizável (o T6 bloqueia
 * com o motivo dele); senão nada se prepara.
 */
function escolherLinhaDeBase(arquivo: string, r: AlvoResolvido, shas: string[], campanha: Campaign, tela: string): Escolha {
  const lbs = lerIndice(arquivo).map(l => l.entrada).filter((e): e is EntradaIndice => Boolean(e && e.tipo === "linha-de-base" &&
    e.campanha === r.campanha && e.tela === tela && e.manifestoColeta && shas.includes(e.manifestoColeta.sha256)));
  const ordem = (e: EntradaIndice) => [e.estado.linhaDeBase === "utilizavel" ? 0 : 1, shas.indexOf(e.manifestoColeta!.sha256)];
  lbs.sort((a, b) => ordem(a)[0] - ordem(b)[0] || ordem(a)[1] - ordem(b)[1] || b.dataUtc.localeCompare(a.dataUtc));
  const util = lbs.find(e => e.estado.linhaDeBase === "utilizavel");
  if (util) return { linhaDeBase: `${util.caminho}/baseline.json`, semLinhaDeBase: false, nota: `linha de base ${util.chave} (utilizável, do disparo ${curto(util.manifestoColeta!.sha256)}…)` };
  const ausencia = campanha.baselinePolicy.plannedAbsences.find(a => a.screenId === tela);
  if (ausencia) return { linhaDeBase: null, semLinhaDeBase: true, nota: `ausência planejada na campanha (${ausencia.declaredAt})` };
  if (lbs[0]) return { linhaDeBase: `${lbs[0].caminho}/baseline.json`, semLinhaDeBase: false, nota: `linha de base ${lbs[0].chave} NÃO utilizável (${lbs[0].motivo ?? "sem motivo"}): a análise fica bloqueada com esse motivo` };
  return falhar("linha-de-base", "linha de base ausente: nenhum registro arquivado para os disparos deste alvo, e a campanha não declara ausência planejada para a tela");
}

// ───────────────────────────────────────────────────────────────── preparar

const emAndamento = new Set<string>();

export async function prepararAnalise(arquivo: string, alvo: AlvoPreparo, o: OpcoesPreparo = {}): Promise<ResultadoPreparo> {
  let r: AlvoResolvido;
  try { r = resolverAlvo(arquivo, alvo); } catch (e) {
    return { ok: false, etapa: e instanceof ErroPreparo ? e.etapa : "entradas", erro: (e as Error).message, falha: null };
  }
  const chave = `${r.campanha}/${r.alvo}`;
  const existente = lerAnalise(arquivo, r.campanha, r.alvo);
  if (existente && existente.revisoes.length) return { ok: false, etapa: "receita", erro: "já existe análise para este alvo: use Recalcular", falha: null };
  if (emAndamento.has(chave)) return { ok: false, etapa: "receita", erro: "já existe uma preparação deste alvo em andamento", falha: null };
  emAndamento.add(chave);
  try {
    // receita gravada cujo primeiro cálculo falhou (nenhuma revisão): não é análise. Ela vai para
    // preparacao/receitas-sem-calculo/ (registro, nada apagado) e a preparação refaz tudo do arquivo —
    // recalcular repetiria as entradas que ela congelou, inclusive a que causou a falha.
    if (existente) {
      const dir = dirAnalise(arquivo, r.campanha, r.alvo), guarda = join(dir, "preparacao", "receitas-sem-calculo");
      mkdirSync(guarda, { recursive: true });
      renameSync(join(dir, "receita.json"), join(guarda, `${carimbo()}.json`));
    }
    const arms = ARMS.filter(a => r.entradas[a]);
    const lidos = Object.fromEntries(arms.map(a => [a, lerManifesto(arquivo, r.entradas[a]!)])) as Partial<Record<Arm, ManifestoLido>>;
    const m0 = lidos[arms[0]]!.manifest;
    // os dois braços de um par vêm da MESMA campanha, referência, plano e site (a análise recusa o resto, aqui com motivo claro)
    for (const a of arms.slice(1)) {
      const m = lidos[a]!.manifest;
      if (m.campaign!.sha256 !== m0.campaign!.sha256) falhar("campanha", "os dois braços foram coletados com campanhas diferentes (sha256 da campanha diverge)");
      for (const k of ["referenceSha256", "statePlanSha256", "siteManifestSha256"] as const) {
        if (m.identity[k] !== m0.identity[k]) falhar("snapshots", `os dois braços divergem em ${k}: não formam par`);
      }
    }
    const campanha = m0.campaign!.document;
    const campanhaRel = caminhoCampanha(m0.dispatch.campaignId, m0.campaign!.sha256);
    arquivoConferido(arquivo, campanhaRel, m0.campaign!.sha256, "campanha", "a campanha");

    const conjuntos = [...new Set(arms.map(a => conjuntoDoDespacho(arquivo, r.entradas[a]!)))];
    if (conjuntos.length !== 1) falhar("snapshots", `os braços apontam conjuntos de snapshots diferentes: ${conjuntos.join(", ")}`);
    // o conjunto da natureza da campanha: o arquivo principal, ou a cópia real autorizada por um reparo
    // registrado (reparos/conjuntos-de-snapshots/), quando um ensaio gravou antes o mesmo id
    let snapsRel = "", reparoSnaps: string | null = null;
    try { ({ caminho: snapsRel, reparo: reparoSnaps } = resolverConjunto(arquivo, conjuntos[0], campanha.fixture)); } catch (e) {
      if (e instanceof Recusa) falhar("snapshots", e.message);
      throw e;
    }
    const snapsAbs = dentroDoArquivo(arquivo, snapsRel);
    const snaps = JSON.parse(readFileSync(snapsAbs, "utf8")) as SnapshotManifest;
    if (!validateContract(snaps).valid) falhar("snapshots", `${snapsRel} fora do contrato snapshot-manifest.v1`);
    const item = (kind: string) => snaps.items.find(i => i.kind === kind);
    if (item("site")?.sha256 !== m0.identity.siteManifestSha256 || item("reference")?.sha256 !== m0.reference.sha256 || item("state-plan")?.sha256 !== m0.identity.statePlanSha256) {
      falhar("snapshots", "hash divergente: o conjunto de snapshots não aponta o site, a referência e o plano que o manifesto de coleta registrou");
    }

    // a referência: só o caminho e o hash passam pelo painel (a leitura é do analisar; nada é servido)
    const refRel = caminhoReferencia(m0.reference.sha256);
    arquivoConferido(arquivo, refRel, m0.reference.sha256, "referencia", "a referência congelada");

    const siteRel = caminhoSite(m0.identity.siteManifestSha256!);
    if (!existsSync(join(arquivo, siteRel, "site-manifest.json"))) falhar("site", `site congelado ausente do arquivo: ${siteRel} (o job arquivar não recebeu o checkout do govbr-telas?)`);
    try {
      if (loadSite(join(arquivo, siteRel)).manifestSha256 !== m0.identity.siteManifestSha256) falhar("site", `hash divergente: o site em ${siteRel} não é o do manifesto de coleta`);
    } catch (e) { if (e instanceof ErroPreparo) throw e; falhar("site", `hash divergente no site congelado arquivado: ${(e as Error).message}`); }

    // ordem dos disparos = ordem da coleta (o primeiro braço coletado primeiro)
    const porData = [...arms].sort((a, b) => r.entradas[a]!.dataUtc.localeCompare(r.entradas[b]!.dataUtc));
    const lb = escolherLinhaDeBase(arquivo, r, porData.map(a => lidos[a]!.sha256), campanha, m0.dispatch.screenId);

    const pacotes: Receita["pacotes"] = {};
    for (const a of arms) pacotes[a] = pacoteRestaurado(arquivo, r.entradas[a]!, o);

    const receita: Receita = {
      formato: RECEITA_VERSAO, fixture: campanha.fixture, campanha: r.campanha, tipo: r.tipo, alvo: r.alvo,
      execucoes: Object.fromEntries(arms.map(a => [a, r.entradas[a]!.chave])), pacotes,
      entradas: { campanha: campanhaRel, snapshots: snapsRel, referencia: refRel, site: siteRel, linhaDeBase: lb.linhaDeBase, semLinhaDeBase: lb.semLinhaDeBase },
      criadaEm: new Date().toISOString(),
      nota: `preparada pelo painel a partir do arquivo T4 (T8a.1); ${lb.nota}${reparoSnaps ? `; conjunto de snapshots pela cópia reparada (${reparoSnaps})` : ""}`,
      preparo: {
        por: "painel (Preparar análise)",
        manifestosColeta: Object.fromEntries(arms.map(a => [a, lidos[a]!.sha256])),
        anexos: Object.fromEntries(arms.map(a => [a, r.entradas[a]!.evidencias?.sha256 ?? null])),
        campanha: { sha256: m0.campaign!.sha256, origem: m0.campaign!.origin },
        ...(r.selecao ? { selecaoTentativas: r.selecao } : {}),
      },
    };
    const dir = dirAnalise(arquivo, r.campanha, r.alvo);
    mkdirSync(dir, { recursive: true });
    try { writeFileSync(join(dir, "receita.json"), json(receita), { flag: "wx" }); } catch { falhar("receita", "outra janela preparou esta análise ao mesmo tempo; recarregue a página"); }
    const calc = await recalcular(arquivo, r.campanha, r.alvo);
    if (!calc.ok) return { ok: false, etapa: "analise", erro: `a receita foi gravada, mas o primeiro cálculo falhou: ${calc.erro}`, falha: calc.falha };
    return { ok: true, analise: chave, revisao: calc.revisao, estado: calc.estado };
  } catch (e) {
    const etapa = e instanceof ErroPreparo ? e.etapa : "inesperado";
    const motivo = comDicaCrlf(arquivo, (e as Error).message);
    return { ok: false, etapa, erro: motivo, falha: registrarFalha(arquivo, r.campanha, r.alvo, etapa, motivo) };
  } finally {
    emAndamento.delete(chave);
  }
}
