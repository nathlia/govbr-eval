/**
 * Agenda congelada de slots de uma campanha (T7.2, NAT-65; protocolo da campanha §5 e §7).
 *
 * Onde mora: `campanhas/<id>/agenda.json`, ao lado do `campaign.json` — um arquivo IRMÃO, não um
 * bloco dentro da campanha. A semente é o commit que congelou o protocolo; a agenda só pode existir
 * depois dele (o hash do commit depende do conteúdo). Pôr a agenda dentro do `campaign.json` mudaria o
 * sha256 da campanha depois do congelamento e exigiria mexer no contrato `campaign.v1`. Então a
 * referência vai no sentido inverso: a agenda registra o sha256 dos bytes do `campaign.json` e o commit
 * da semente; o preflight recusa agenda que aponte outra campanha, e quem duvidar regenera a agenda
 * da semente e compara (`conferir`). Campanha sem agenda (piloto-01) segue como antes.
 *
 * Regra da ordem (protocolo §5): `chave(par) = sha256(semente + "|ordem|" + par)`; pares ordenados pela
 * chave, ascendente; os ⌊N/2⌋ primeiros começam pelo `sem`, os demais pelo `com` (N ímpar: o par a
 * mais começa pelo `com`). A sequência dos pares no tempo é a numérica (p01, p02, …); a chave só
 * decide qual braço de cada par roda primeiro. Cada par é uma repetição (p03 → repetição 3).
 *
 * Tentativas (protocolo §7), contadas no índice do arquivo (`indice/entradas` do govbr-resultados):
 *   - disparo recusado no preflight (sem manifesto de coleta) não é tentativa: nenhum modelo foi chamado;
 *   - nova tentativa só depois de falha TÉCNICA (motivo em `retryPolicy.retryOn`, nunca `timeout`),
 *     até `maxAttemptsPerSlot` por slot e até `campaignAttemptCeiling` tentativas na campanha inteira
 *     (as extras = teto − slots planejados; quem precisar primeiro leva — a ordem da agenda);
 *   - tempo esgotado conta como execução do agente: inelegível, sem nova tentativa;
 *   - entra na análise a PRIMEIRA tentativa elegível do slot.
 *
 *   npm run campanha:agenda -- --campanha ID --pares N --semente <commit 40 hex> [--janelas "rótulo:k,rótulo:k"]
 *   npm run campanha:agenda -- conferir --campanha ID
 *   npm run campanha:agenda -- comando --campanha ID --slot p03-com [--modo real] [--arquivo CLONE]
 *        imprime o `gh workflow run` do slot (só o slot + os commits; o resto vem da agenda/campanha)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Arm, Campaign } from "../contracts/index";
import type { EntradaIndice } from "./arquivo-resultados";

export const AGENDA_CONTRATO = "agenda.v1";
export const AGENDA_GERADOR = "agenda-campanha-1.0.0";
export const REGRA_ORDEM = "chave(par) = sha256(semente + \"|ordem|\" + par); pares em ordem ascendente da chave; os ⌊N/2⌋ primeiros começam pelo sem, os demais pelo com (N ímpar: o par a mais começa pelo com)";
const COMMIT = /^[0-9a-f]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const RAIZ = resolve(fileURLToPath(import.meta.url), "..", "..");

export interface SlotAgenda {
  slotId: string; pairId: string; arm: Arm;
  /** 1 = primeiro braço do par; 2 = segundo. */
  positionInPair: 1 | 2;
  repetition: number;
  /** Posição na agenda (1 = primeiro slot a rodar). */
  order: number;
  window: string | null;
}

export interface Agenda {
  contract: typeof AGENDA_CONTRATO;
  generator: typeof AGENDA_GERADOR;
  campaignId: string;
  /** Os bytes exatos do `campaign.json` a que esta agenda serve. */
  campaign: { path: string; sha256: string };
  seed: { commit: string; rule: string };
  pairs: number;
  /** Pares na ordem da chave (a ordem do sorteio), com o braço que abre cada um. */
  draw: { pairId: string; key: string; firstArm: Arm }[];
  windows: { label: string; slots: number }[] | null;
  slots: SlotAgenda[];
  retry: { maxAttemptsPerSlot: number; campaignAttemptCeiling: number; extraAttempts: number };
}

const sha256 = (s: string | Buffer): string => createHash("sha256").update(s).digest("hex");
export const caminhoAgenda = (campanha: string): string => `campanhas/${campanha}/agenda.json`;
export const documentoDaAgenda = (a: Agenda): string => JSON.stringify(a, null, 2) + "\n";
export const idDoPar = (i: number): string => `p${String(i).padStart(2, "0")}`;

export interface OpcoesAgenda {
  campanha: Campaign; campanhaSha256: string; pares: number; semente: string;
  janelas?: { label: string; slots: number }[] | null;
}

/** Por que esta campanha não aceita uma agenda de `pares` pares. [] = aceita. */
export function problemasParaAgenda(c: Campaign, pares: number, semente: string): string[] {
  const p: string[] = [];
  if (!COMMIT.test(semente)) p.push("a semente é o hash completo (40 hex) de um commit do govbr-eval");
  if (!Number.isInteger(pares) || pares < 1 || pares > 99) p.push("--pares: inteiro de 1 a 99");
  if (c.design.arms.length !== 2 || !c.design.arms.includes("sem") || !c.design.arms.includes("com")) p.push("a agenda pareia sem × com: a campanha precisa dos dois braços");
  if (c.design.screens.length !== 1 || c.design.models.length !== 1) p.push("agenda.v1 cobre uma tela e um modelo por campanha (pares não se misturam)");
  if (c.design.order !== "balanceado") p.push(`a ordem da campanha é "${c.design.order}"; a agenda sorteada exige design.order = "balanceado"`);
  if (c.design.repetitions !== pares) p.push(`design.repetitions = ${c.design.repetitions} ≠ ${pares} pares (cada par é uma repetição)`);
  if (c.retryPolicy.campaignAttemptCeiling < 2 * pares) p.push(`retryPolicy.campaignAttemptCeiling ${c.retryPolicy.campaignAttemptCeiling} < ${2 * pares} slots planejados (o teto conta todas as tentativas)`);
  return p;
}

/** A agenda, deterministicamente, da campanha + N + semente (+ rótulos de janela opcionais). */
export function gerarAgenda(o: OpcoesAgenda): Agenda {
  const { campanha: c, pares: n, semente } = o;
  const p = problemasParaAgenda(c, n, semente);
  if (p.length) throw new Error(`agenda recusada: ${p.join("; ")}`);
  const ids = Array.from({ length: n }, (_, i) => idDoPar(i + 1));
  const chave = (par: string) => sha256(`${semente}|ordem|${par}`);
  const draw = ids.map(pairId => ({ pairId, key: chave(pairId) })).sort((a, b) => a.key.localeCompare(b.key))
    .map((x, i) => ({ ...x, firstArm: (i < Math.floor(n / 2) ? "sem" : "com") as Arm }));
  const primeiro = new Map(draw.map(d => [d.pairId, d.firstArm]));
  const janelas = o.janelas?.length ? o.janelas : null;
  if (janelas) {
    const total = janelas.reduce((s, j) => s + j.slots, 0);
    if (janelas.some(j => !j.label.trim() || !Number.isInteger(j.slots) || j.slots < 1)) throw new Error("--janelas: rótulo:k com k inteiro ≥ 1");
    if (total !== 2 * n) throw new Error(`--janelas cobrem ${total} slots; a agenda tem ${2 * n}`);
  }
  const rotulos = janelas ? janelas.flatMap(j => Array<string>(j.slots).fill(j.label)) : [];
  const slots: SlotAgenda[] = ids.flatMap((pairId, i) => {
    const a = primeiro.get(pairId)!, b: Arm = a === "sem" ? "com" : "sem";
    return ([a, b] as Arm[]).map((arm, k) => ({ slotId: `${pairId}-${arm}`, pairId, arm, positionInPair: (k + 1) as 1 | 2, repetition: i + 1, order: 2 * i + k + 1,
      window: janelas ? rotulos[2 * i + k] : null }));
  });
  return {
    contract: AGENDA_CONTRATO, generator: AGENDA_GERADOR, campaignId: c.campaignId,
    campaign: { path: `campanhas/${c.campaignId}/campaign.json`, sha256: o.campanhaSha256 },
    seed: { commit: semente, rule: REGRA_ORDEM }, pairs: n, draw, windows: janelas, slots,
    retry: { maxAttemptsPerSlot: c.retryPolicy.maxAttemptsPerSlot, campaignAttemptCeiling: c.retryPolicy.campaignAttemptCeiling,
      extraAttempts: c.retryPolicy.campaignAttemptCeiling - 2 * n },
  };
}

/** A agenda serve a esta campanha e é a que a semente produz? [] = sim. */
export function problemasDaAgenda(a: Agenda, c: Campaign, campanhaSha256: string): string[] {
  if (a?.contract !== AGENDA_CONTRATO) return [`agenda fora do contrato ${AGENDA_CONTRATO}`];
  const p: string[] = [];
  if (a.campaignId !== c.campaignId) p.push(`agenda da campanha ${a.campaignId} ≠ ${c.campaignId}`);
  if (a.campaign.sha256 !== campanhaSha256) p.push(`a agenda aponta o campaign.json ${a.campaign.sha256.slice(0, 12)}; o do disparo é ${campanhaSha256.slice(0, 12)} (campanha mudou depois da agenda)`);
  try {
    const de = gerarAgenda({ campanha: c, campanhaSha256: a.campaign.sha256, pares: a.pairs, semente: a.seed.commit, janelas: a.windows });
    if (documentoDaAgenda(de) !== documentoDaAgenda(a)) p.push("a agenda não é a que a semente produz (regenerada difere): editada à mão ou gerada por outra regra");
  } catch (e) { p.push((e as Error).message); }
  return p;
}

export function lerAgenda(path: string): Agenda {
  return JSON.parse(readFileSync(path, "utf8")) as Agenda;
}

// ───────────────────────────────────────────────────────────────── semente (git)

/**
 * A semente é um commit DESTE repositório, já no histórico do HEAD, que congelou a campanha (tocou
 * `campanhas/<id>/`); os arquivos daquela pasta que existiam no commit não mudaram desde então; e a
 * agenda ainda não existia nele. Igual ao sorteio da tela A: ninguém escolhe a semente depois de vê-la.
 */
export function problemasDaSemente(semente: string, campanha: string, raiz = RAIZ): string[] {
  if (!COMMIT.test(semente)) return ["a semente é o hash completo (40 hex) do commit que congelou o protocolo"];
  if (!ID.test(campanha)) return [`campanha inválida: ${campanha}`];
  const git = (...a: string[]): string => execFileSync("git", a, { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try { git("cat-file", "-e", `${semente}^{commit}`); } catch { return [`a semente ${semente.slice(0, 12)} não é um commit deste repositório`]; }
  try { git("merge-base", "--is-ancestor", semente, "HEAD"); } catch { return [`a semente ${semente.slice(0, 12)} não está no histórico do HEAD`]; }
  const pasta = `campanhas/${campanha}/`;
  const tocados = git("diff-tree", "--no-commit-id", "--name-only", "-r", "--root", semente).split("\n").filter(Boolean);
  if (!tocados.some(f => f.startsWith(pasta))) return [`o commit ${semente.slice(0, 12)} não congelou a campanha: não toca ${pasta}`];
  const naSemente = git("ls-tree", "-r", "--name-only", semente, "--", pasta).split("\n").filter(Boolean);
  if (naSemente.includes(caminhoAgenda(campanha))) return ["a agenda já existia no commit da semente: a semente tem de vir antes dela"];
  const p: string[] = [];
  const mudou = git("diff", "--name-only", semente, "--", ...naSemente).trim();
  if (mudou) p.push(`arquivos congelados no commit da semente mudaram desde então:\n${mudou}`);
  return p;
}

// ───────────────────────────────────────────────────────────────── tentativas (índice do arquivo)

export type ClasseTentativa = "valida" | "tecnica" | "tempo-esgotado" | "inelegivel" | "nao-conta";
export interface Tentativa { chave: string; dataUtc: string; classe: ClasseTentativa; razao: string | null; motivo: string }

const RAZOES: readonly string[] = ["preflight-failed", "isolation-failed", "rate-limited", "auth-failed", "model-unavailable", "timeout", "cancelled",
  "output-empty", "output-malformed", "output-refused", "no-submission", "vm-lost", "archive-unavailable", "harness-error"];

/** Lê as entradas do índice de um clone do arquivo (só `indice/entradas`, o que o `preparar` recebe). */
export function lerEntradasDoIndice(arquivo: string): EntradaIndice[] {
  const dir = join(arquivo, "indice", "entradas");
  if (!existsSync(dir)) throw new Error(`índice do arquivo ausente: ${dir} (sem ele não se sabe quantas tentativas o slot já teve)`);
  return readdirSync(dir).filter(f => f.endsWith(".json")).sort().map(f => JSON.parse(readFileSync(join(dir, f), "utf8")) as EntradaIndice);
}

/** Classe de uma entrada do índice para a política de tentativas. */
export function classificarTentativa(e: EntradaIndice, c: Campaign): Tentativa {
  const base = { chave: e.chave, dataUtc: e.dataUtc };
  const prefixo = (e.motivo ?? "").split(":")[0].trim();
  const razao = RAZOES.includes(prefixo) ? prefixo : null;
  const pode = (r: string): boolean => r !== "timeout" && (c.retryPolicy.retryOn as string[]).includes(r);
  if (e.estado.arquivo === "sem-pacote" && !e.manifestoColeta) {
    return { ...base, classe: "nao-conta", razao: null, motivo: "disparo recusado antes do manifesto de coleta: nenhum modelo chamado, não é tentativa" };
  }
  if (e.estado.arquivo === "sem-pacote") {
    const r = (c.retryPolicy.retryOn as string[]).includes("vm-lost") ? "vm-lost" : "harness-error";
    return pode(r) ? { ...base, classe: "tecnica", razao: r, motivo: "execução sem pacote depois do preflight (VM, harness ou cancelamento)" }
      : { ...base, classe: "inelegivel", razao: r, motivo: "execução sem pacote; a política da campanha não repete esta falha" };
  }
  if (e.estado.arquivo !== "arquivado") return { ...base, classe: "inelegivel", razao, motivo: `pacote ${e.estado.arquivo}: investigar, não repetir` };
  if (razao === "timeout") return { ...base, classe: "tempo-esgotado", razao, motivo: "tempo esgotado: conta como execução do agente, inelegível, sem nova tentativa" };
  if (e.estado.isolamento === "failed") return { ...base, classe: "inelegivel", razao, motivo: "isolamento falhou (quarentena): não se repete sem entender a causa" };
  if (e.estado.tecnico !== "passed") {
    if (razao && pode(razao)) return { ...base, classe: "tecnica", razao, motivo: `falha técnica ${razao}` };
    return { ...base, classe: "inelegivel", razao, motivo: `técnico ${e.estado.tecnico ?? "?"}${razao ? ` (${razao})` : ""}: resultado do agente ou falha fora da política, sem nova tentativa` };
  }
  if (e.estado.isolamento !== "passed") return { ...base, classe: "inelegivel", razao, motivo: `isolamento ${e.estado.isolamento ?? "?"}, não comprovado` };
  if (e.estado.submissao !== "accepted") return { ...base, classe: "inelegivel", razao, motivo: `submissão ${e.estado.submissao ?? "?"}: resultado do agente, sem nova tentativa` };
  return { ...base, classe: "valida", razao: null, motivo: "técnico, isolamento e submissão ok (a identidade é conferida na análise)" };
}

/** Tentativas de um slot, na ordem do disparo (as `nao-conta` ficam de fora). */
export function tentativasDoSlot(entradas: EntradaIndice[], c: Campaign, slotId: string): Tentativa[] {
  return entradas.filter(e => e.tipo === "execucao" && e.campanha === c.campaignId && e.slot === slotId)
    .sort((a, b) => a.dataUtc.localeCompare(b.dataUtc) || a.chave.localeCompare(b.chave))
    .map(e => classificarTentativa(e, c)).filter(t => t.classe !== "nao-conta");
}

/** Tentativas extras já usadas na campanha (cada tentativa além da primeira de um slot). */
export function extrasUsadas(a: Agenda, entradas: EntradaIndice[], c: Campaign): number {
  return a.slots.reduce((s, x) => s + Math.max(0, tentativasDoSlot(entradas, c, x.slotId).length - 1), 0);
}

export type DecisaoTentativa = { ok: true; tentativa: number; anteriores: Tentativa[]; extrasUsadas: number; extrasLimite: number } | { ok: false; motivo: string };

/** Que tentativa este disparo do slot é — ou por que não pode haver outra. */
export function proximaTentativa(a: Agenda, c: Campaign, entradas: EntradaIndice[], slotId: string): DecisaoTentativa {
  if (!a.slots.some(s => s.slotId === slotId)) return { ok: false, motivo: `o slot ${slotId} não está na agenda de ${a.campaignId}` };
  const ts = tentativasDoSlot(entradas, c, slotId);
  const usadas = extrasUsadas(a, entradas, c), limite = c.retryPolicy.campaignAttemptCeiling - a.slots.length;
  const base = { anteriores: ts, extrasUsadas: usadas, extrasLimite: limite };
  if (!ts.length) return { ok: true, tentativa: 1, ...base };
  const ultima = ts[ts.length - 1];
  if (ts.some(t => t.classe === "valida")) return { ok: false, motivo: `o slot ${slotId} já tem tentativa válida (${ts.find(t => t.classe === "valida")!.chave}); não há repetição por resultado` };
  if (ultima.classe !== "tecnica") return { ok: false, motivo: `a última tentativa do slot ${slotId} (${ultima.chave}) não é falha técnica — ${ultima.motivo}` };
  if (ts.length >= c.retryPolicy.maxAttemptsPerSlot) return { ok: false, motivo: `o slot ${slotId} já teve ${ts.length} tentativa(s), o máximo por slot (${c.retryPolicy.maxAttemptsPerSlot}): slot perdido` };
  if (usadas >= limite) return { ok: false, motivo: `teto da campanha esgotado: ${usadas} de ${limite} tentativas extras já usadas (${c.retryPolicy.campaignAttemptCeiling} no total): slot perdido` };
  return { ok: true, tentativa: ts.length + 1, ...base };
}

/** A tentativa que entra na análise: a primeira válida, na ordem do disparo. */
export function tentativaSelecionada(ts: Tentativa[]): Tentativa | null {
  return ts.find(t => t.classe === "valida") ?? null;
}

// ───────────────────────────────────────────────────────────────── planejado × executado

export type EstadoSlot = "nao-iniciado" | "valido" | "aguarda-nova-tentativa" | "perdido";
export interface SituacaoSlot {
  slot: SlotAgenda; estado: EstadoSlot; tentativas: Tentativa[]; selecionada: string | null; motivo: string | null;
  novasTentativas: number; tempoEsgotado: boolean; inicioUtc: string | null;
}
export interface SituacaoPar {
  pairId: string; firstArm: Arm; window: (string | null)[]; slots: Record<Arm, SituacaoSlot>;
  estado: "completo" | "incompleto" | "em-andamento" | "nao-iniciado";
  /** Minutos entre os inícios das tentativas selecionadas dos dois braços (null = falta um). */
  intervaloMin: number | null;
}
export interface PerdaBraco { planejados: number; tentados: number; validos: number; perdidos: number; tempoEsgotado: number; taxaPerda: number | null; taxaTempoEsgotado: number | null }
export interface SituacaoAgenda {
  campanha: string; planejados: number; naoIniciados: number; validos: number; aguardando: number; perdidos: number;
  tentativas: number; novasTentativas: number; extrasUsadas: number; extrasLimite: number;
  pares: SituacaoPar[]; paresCompletos: number; paresPerdidos: number;
  porBraco: Record<Arm, PerdaBraco>;
  /** Protocolo §7: perdas diferentes entre braços → risco de seleção. */
  riscoDeSelecao: string | null;
  /** Execuções da campanha com slot fora da agenda (nunca entram na análise). */
  foraDaAgenda: string[];
}

export function situacaoDaAgenda(a: Agenda, c: Campaign, entradas: EntradaIndice[], inicioDe: (chave: string) => string | null = () => null): SituacaoAgenda {
  const usadas = extrasUsadas(a, entradas, c), limite = c.retryPolicy.campaignAttemptCeiling - a.slots.length;
  const porChave = new Map(entradas.map(e => [e.chave, e]));
  const situ = (s: SlotAgenda): SituacaoSlot => {
    const ts = tentativasDoSlot(entradas, c, s.slotId);
    const sel = tentativaSelecionada(ts);
    const tempoEsgotado = ts.some(t => t.classe === "tempo-esgotado");
    const inicio = (t: Tentativa | undefined) => (t ? inicioDe(t.chave) ?? porChave.get(t.chave)?.dataUtc ?? null : null);
    const base = { slot: s, tentativas: ts, novasTentativas: Math.max(0, ts.length - 1), tempoEsgotado };
    if (sel) return { ...base, estado: "valido", selecionada: sel.chave, motivo: ts.length > 1 ? `tentativa ${ts.indexOf(sel) + 1} (primeira elegível)` : null, inicioUtc: inicio(sel) };
    if (!ts.length) return { ...base, estado: "nao-iniciado", selecionada: null, motivo: null, inicioUtc: null };
    const d = proximaTentativa(a, c, entradas, s.slotId);
    const ultima = ts[ts.length - 1];
    return d.ok ? { ...base, estado: "aguarda-nova-tentativa", selecionada: null, motivo: `falha técnica (${ultima.razao ?? "?"}): cabe a tentativa ${d.tentativa}`, inicioUtc: inicio(ultima) }
      : { ...base, estado: "perdido", selecionada: null, motivo: d.motivo.replace(/^.*?— /, ""), inicioUtc: inicio(ultima) };
  };
  const slots = a.slots.map(situ);
  const pares: SituacaoPar[] = a.draw.map(d => d.pairId).sort().map(pairId => {
    const xs = slots.filter(s => s.slot.pairId === pairId);
    const por = Object.fromEntries(xs.map(s => [s.slot.arm, s])) as Record<Arm, SituacaoSlot>;
    const estados = xs.map(s => s.estado);
    const estado = estados.includes("perdido") ? "incompleto" : estados.every(e => e === "valido") ? "completo"
      : estados.every(e => e === "nao-iniciado") ? "nao-iniciado" : "em-andamento";
    const [i1, i2] = [por.sem.inicioUtc, por.com.inicioUtc];
    const intervaloMin = por.sem.estado === "valido" && por.com.estado === "valido" && i1 && i2 ? Math.abs(Date.parse(i2) - Date.parse(i1)) / 60000 : null;
    return { pairId, firstArm: xs.find(s => s.slot.positionInPair === 1)!.slot.arm, window: xs.sort((p, q) => p.slot.order - q.slot.order).map(s => s.slot.window), slots: por, estado, intervaloMin };
  });
  const braco = (arm: Arm): PerdaBraco => {
    const xs = slots.filter(s => s.slot.arm === arm), tentados = xs.filter(s => s.tentativas.length > 0).length;
    const perdidos = xs.filter(s => s.estado === "perdido").length, tempoEsgotado = xs.filter(s => s.tempoEsgotado).length;
    return { planejados: xs.length, tentados, validos: xs.filter(s => s.estado === "valido").length, perdidos, tempoEsgotado,
      taxaPerda: tentados ? perdidos / tentados : null, taxaTempoEsgotado: tentados ? tempoEsgotado / tentados : null };
  };
  const porBraco = { sem: braco("sem"), com: braco("com") };
  const riscoDeSelecao = porBraco.sem.perdidos !== porBraco.com.perdidos
    ? `perdas diferentes entre braços (sem ${porBraco.sem.perdidos}, com ${porBraco.com.perdidos}${porBraco.sem.tempoEsgotado + porBraco.com.tempoEsgotado ? `; tempo esgotado sem ${porBraco.sem.tempoEsgotado}, com ${porBraco.com.tempoEsgotado}` : ""}): risco de seleção — excluir os pares perdidos pode deixar só as execuções que conseguiram terminar (limitação, protocolo §7)`
    : null;
  const ids = new Set(a.slots.map(s => s.slotId));
  const conta = (e: EstadoSlot) => slots.filter(s => s.estado === e).length;
  return {
    campanha: a.campaignId, planejados: a.slots.length, naoIniciados: conta("nao-iniciado"), validos: conta("valido"), aguardando: conta("aguarda-nova-tentativa"),
    perdidos: conta("perdido"), tentativas: slots.reduce((s, x) => s + x.tentativas.length, 0), novasTentativas: usadas, extrasUsadas: usadas, extrasLimite: limite,
    pares, paresCompletos: pares.filter(p => p.estado === "completo").length, paresPerdidos: pares.filter(p => p.estado === "incompleto").length,
    porBraco, riscoDeSelecao,
    foraDaAgenda: entradas.filter(e => e.tipo === "execucao" && e.campanha === a.campaignId && !(e.slot && ids.has(e.slot)) && classificarTentativa(e, c).classe !== "nao-conta").map(e => e.chave),
  };
}

// ───────────────────────────────────────────────────────────────── CLI

function main(): void {
  const argv = process.argv.slice(2);
  const comando = argv[0] && !argv[0].startsWith("--") ? argv[0] : "gerar";
  const args = comando === "gerar" && argv[0] !== "gerar" ? argv : argv.slice(1);
  const val = (n: string): string | undefined => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const need = (n: string): string => { const v = val(n); if (!v || v.startsWith("--")) throw new Error(`falta ${n}`); return v; };
  const campanha = need("--campanha");
  if (!ID.test(campanha)) throw new Error(`campanha inválida: ${campanha}`);
  const campPath = join(RAIZ, "campanhas", campanha, "campaign.json");
  if (!existsSync(campPath)) throw new Error(`falta campanhas/${campanha}/campaign.json`);
  const bytes = readFileSync(campPath);
  const c = JSON.parse(bytes.toString("utf8")) as Campaign;
  const agPath = join(RAIZ, caminhoAgenda(campanha));
  if (comando === "gerar") {
    if (existsSync(agPath)) throw new Error(`${caminhoAgenda(campanha)} já existe: a agenda é gerada uma vez, sem repetição`);
    const semente = need("--semente");
    const ps = problemasDaSemente(semente, campanha);
    if (ps.length) throw new Error(`semente recusada: ${ps.join("; ")}`);
    const janelas = val("--janelas")?.split(",").map(s => { const i = s.lastIndexOf(":"); return { label: s.slice(0, i).trim(), slots: Number(s.slice(i + 1)) }; }) ?? null;
    const a = gerarAgenda({ campanha: c, campanhaSha256: sha256(bytes), pares: Number(need("--pares")), semente, janelas });
    writeFileSync(agPath, documentoDaAgenda(a), { flag: "wx" });
    console.log(`${caminhoAgenda(campanha)} gravada — ${a.pairs} pares, ${a.slots.length} slots, semente ${semente.slice(0, 12)}, campanha ${sha256(bytes).slice(0, 12)}`);
    for (const s of a.slots) console.log(`  ${String(s.order).padStart(2)}. ${s.slotId}${s.window ? `  [${s.window}]` : ""}`);
    return;
  }
  const a = lerAgenda(agPath);
  if (comando === "conferir") {
    const p = [...problemasDaAgenda(a, c, sha256(bytes)), ...problemasDaSemente(a.seed.commit, campanha)];
    if (p.length) throw new Error(`agenda NÃO confere: ${p.join("; ")}`);
    console.log(`agenda de ${campanha} confere: regenerada da semente ${a.seed.commit.slice(0, 12)}, campanha ${a.campaign.sha256.slice(0, 12)}`);
    return;
  }
  if (comando === "comando") {
    const slot = a.slots.find(s => s.slotId === need("--slot"));
    if (!slot) throw new Error(`slot fora da agenda; slots: ${a.slots.map(s => s.slotId).join(", ")}`);
    const modo = val("--modo") ?? "real";
    let tentativa = "";
    if (val("--arquivo")) {
      const d = proximaTentativa(a, c, lerEntradasDoIndice(resolve(need("--arquivo"))), slot.slotId);
      if (!d.ok) throw new Error(d.motivo);
      tentativa = ` -f tentativa=${d.tentativa}`;
    }
    console.log(`gh workflow run execucao-isolada.yml --repo nathlia/govbr-eval -f modo=${modo} -f tela=${c.design.screens[0].id} -f campanha=${campanha} -f slot=${slot.slotId}${tentativa} -f telas_sha=<40 hex> -f validator_sha=<40 hex>`);
    console.log(`# o preparar resolve da agenda: par ${slot.pairId}, braço ${slot.arm}, repetição ${slot.repetition}; da campanha: modelo, esforço, tempo limite; do índice: a tentativa`);
    return;
  }
  throw new Error("uso: campanha:agenda [gerar] --campanha ID --pares N --semente HEX | conferir --campanha ID | comando --campanha ID --slot S");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error((e as Error).message); process.exit(1); }
}
