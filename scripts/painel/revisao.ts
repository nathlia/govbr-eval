/**
 * Painel de resultados (T8a) — fila de revisão cega, gravação versionada das decisões e recálculo.
 *
 * Cegueira: a vista do cartão nunca leva o braço, o id da execução, `reportedEvidence`, nem o nome do
 * arquivo de evidência (que o agente escolhe e pode nomear o braço). A evidência é servida por token
 * opaco e conferida pelo sha256 que o próprio cartão registra.
 *
 * Gravação: cada decisão salva cria `decisoes/decisoes-NNNN.json` (nunca sobrescreve), com o
 * `reviews.json` inteiro e os metadados em `_painel`. Antes de gravar, o conjunto passa pelo
 * `scoreSemanticPackage` — a mesma validação da bancada `review-ui.ts`; decisão que o scorer recusa
 * não é gravada. Gravação concorrente (versão-base diferente da última) é recusada.
 *
 * Recalcular: chama `analisar()` do T6 com as entradas da receita, o último arquivo de decisões e a
 * revisão atual como `--anterior`, numa pasta temporária ao lado; só uma saída com `summary.json` e
 * análise não recusada vira `rev-NNN`. O resto vai para `revisoes/falhas/<carimbo>/` com `erro.json`.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Arm } from "../../contracts/index";
import { analisar } from "../analisar-execucao";
import {
  DECISOES, canonical, digest, normalizeReviews, reviewQueue, scoreSemanticPackage,
  type ReviewCard, type SemanticPackage, type SemanticUnit,
} from "../semantic-flow";
import {
  ARMS, DECISOES_VERSAO, dentroDoArquivo, decisoesEmVigor, existeDiretorio, lerAnalise, pacoteDaRevisao,
  type Analise, type MetaDecisao, type Revisao,
} from "./modelo";

// ───────────────────────────────────────────────────────────────── vista cega

export interface VistaUnidade { id: string; specId: string; estado: string; descricao: string; predicado: string }
export interface VistaCartao {
  id: string; origem: "execução de agente" | "linha de base determinística"; cena: string; regra: string | null;
  observado: string | null; esperado: string | null; janela: string; sinais: string[];
  sujeitos: { id: string; rotulo: string; oculto: string | null }[];
  candidatas: VistaUnidade[];
  duplicataDe: string[];
  evidencias: { n: number; status: string; url: string | null; sha256: string | null }[];
  imagemCena: string | null;
  retido: string;
  decisao: { status: "pendente" | "decidido"; decisao: string | null; justificativa: string | null; revisora: string | null; unidades: string[] } ;
  segmentado: boolean;
}

export const tokenEvidencia = (an: Analise, rv: Revisao, cardId: string, i: number): string =>
  digest(["painel-evidencia", an.id, rv.nome, cardId, i]).slice(0, 24);

function unidade(u: SemanticUnit): VistaUnidade {
  return { id: u.id, specId: u.specId, estado: u.state, descricao: u.description,
    predicado: u.acceptance.outcome === "nao-implementado"
      ? "predicado não implementado: nada foi verificado por máquina; a decisão é sua"
      : `${u.acceptance.kind ?? ""} ${u.acceptance.outcome} — ${u.acceptance.expected}` };
}

/** Duplicata só onde o scorer a aceita: mesma execução, mesmos sujeitos, mesmo estado e build (review-ui.ts). */
function duplicataElegivel(pkg: SemanticPackage, c: ReviewCard, alvo: ReviewCard): boolean {
  const runsDe = (id: string) => pkg.runs.filter(r => r.cardIds.includes(id)).map(r => r.id);
  const runs = runsDe(c.id), runsAlvo = runsDe(alvo.id);
  return alvo.id !== c.id && runs.length > 0 && runs.every(r => runsAlvo.includes(r)) &&
    c.subjects.every(s => alvo.subjects.some(t => t.id === s.id)) &&
    canonical(c.state) === canonical(alvo.state) && canonical(c.relatedKeys) === canonical(alvo.relatedKeys) &&
    c.binding.build === alvo.binding.build;
}

export interface VistaFila {
  analise: Analise; revisao: Revisao; cartoes: VistaCartao[]; versaoDecisoes: number; origemDecisoes: string;
  pendentesAtivos: number; decididos: number; naoIncorporadas: number; vocabulario: string[];
}

export function vistaFila(arquivo: string, campanha: string, alvo: string): VistaFila | null {
  const an = lerAnalise(arquivo, campanha, alvo);
  if (!an?.atual) return null;
  const rv = an.atual;
  const pkg = pacoteDaRevisao(rv);
  const vigor = decisoesEmVigor(an);
  if (!pkg || !vigor) return null;
  const units = new Map(pkg.units.map(u => [u.id, u]));
  const capture = existsSync(join(rv.dir, "revisao", "capture.json"))
    ? JSON.parse(readFileSync(join(rv.dir, "revisao", "capture.json"), "utf8")) as { scenes: { id: string; image?: string }[] } : { scenes: [] };
  const decisoes = new Map(vigor.raw.decisions.map(d => [d.cardId, d]));
  const ordenados = [...pkg.cards].sort((a, b) => a.scene.localeCompare(b.scene) || (a.rule ?? "~").localeCompare(b.rule ?? "~") ||
    (a.subjects[0]?.key ?? "").localeCompare(b.subjects[0]?.key ?? "") || a.id.localeCompare(b.id));
  const cartoes = ordenados.map((c): VistaCartao => {
    const d = decisoes.get(c.id);
    const legado = c.contract !== "achado-2" && c.contract !== "deterministico";
    const cena = capture.scenes.findIndex(s => s.id === c.scene);
    return {
      id: c.id, origem: c.origin === "agente" ? "execução de agente" : "linha de base determinística", cena: c.scene, regra: c.rule,
      observado: legado ? null : c.observed, esperado: legado ? null : c.expected,
      janela: c.state ? `${c.state.viewport.width}×${c.state.viewport.height} · ${c.state.steps.join(" → ") || "sem interações"}` : "não declarada",
      sinais: c.flags,
      sujeitos: c.subjects.map(s => ({ id: s.id, rotulo: s.label, oculto: s.hidden })),
      candidatas: c.candidateUnitIds.map(id => unidade(units.get(id)!)),
      duplicataDe: pkg.cards.filter(alvoC => duplicataElegivel(pkg, c, alvoC)).map(x => x.id),
      evidencias: c.evidence.map((e, i) => ({ n: i + 1, status: e.status, sha256: e.sha256?.slice(0, 12) ?? null,
        url: e.path && e.sha256 ? `/evidencia/${encodeURIComponent(an.campanha)}/${encodeURIComponent(an.alvo)}/${tokenEvidencia(an, rv, c.id, i)}` : null })),
      imagemCena: cena >= 0 && capture.scenes[cena].image ? `/cena/${encodeURIComponent(an.campanha)}/${encodeURIComponent(an.alvo)}/${cena}` : null,
      retido: legado ? "cartão legado: o texto bruto foi retido porque pode nomear o braço"
        : "retidos por cegueira: a narrativa livre da execução, o nome dos arquivos de evidência e o braço",
      decisao: d && d.status === "reviewed"
        ? { status: "decidido", decisao: (d.atoms[0] as { decisao?: string })?.decisao ?? d.atoms[0]?.verdict ?? null, justificativa: d.rationale,
          revisora: d.reviewer, unidades: d.atoms.flatMap(a => a.unitIds) }
        : { status: "pendente", decisao: null, justificativa: null, revisora: null, unidades: [] },
      segmentado: Boolean(c.segmentos?.length),
    };
  });
  const fila = reviewQueue(pkg, normalizeReviews(structuredClone(vigor.raw)));
  const decididos = vigor.raw.decisions.filter(d => d.status === "reviewed" && pkg.cards.some(c => c.id === d.cardId)).length;
  // gravações feitas depois que a revisão atual foi calculada: ainda fora da pontuação até Recalcular
  const naoIncorporadas = an.decisoes.filter(v => (v.meta?.salvoEm ?? "") > rv.resumo.geradoEm).length;
  return { analise: an, revisao: rv, cartoes, versaoDecisoes: vigor.versao, origemDecisoes: vigor.origem,
    pendentesAtivos: fila.ativa.cartoes, decididos, naoIncorporadas, vocabulario: Object.keys(DECISOES) };
}

// ───────────────────────────────────────────────────────────────── arquivos servíveis (por id, nunca por caminho)

const MIDIA: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** Evidência de um cartão: resolvida pelo token, dentro do pacote restaurado da receita, conferida por sha256. */
export function arquivoDeEvidencia(arquivo: string, campanha: string, alvo: string, token: string): { corpo: Buffer; tipo: string } | null {
  const an = lerAnalise(arquivo, campanha, alvo);
  if (!an?.atual || !an.receita || !/^[0-9a-f]{24}$/.test(token)) return null;
  const pkg = pacoteDaRevisao(an.atual);
  if (!pkg) return null;
  for (const c of pkg.cards) {
    for (const [i, e] of c.evidence.entries()) {
      if (tokenEvidencia(an, an.atual, c.id, i) !== token || !e.path || !e.sha256) continue;
      const m = /^pacote:([^/]+)\/(.+)$/.exec(e.path);
      if (!m) return null;
      const arm = ARMS.find(a => an.receita!.execucoes[a] === m[1]);
      const pac = arm ? an.receita.pacotes[arm] : undefined;
      if (!pac) return null;
      let abs: string;
      try { abs = dentroDoArquivo(arquivo, `${pac}/${m[2]}`); } catch { return null; }
      if (!existsSync(abs)) return null;
      const corpo = readFileSync(abs);
      if (createHash("sha256").update(corpo).digest("hex") !== e.sha256) return null;
      return { corpo, tipo: MIDIA[extname(abs).toLowerCase()] ?? "text/plain; charset=utf-8" };
    }
  }
  return null;
}

/** Reconstrução da cena (scene-N.png da revisão atual), pelo índice em capture.json. */
export function imagemDaCena(arquivo: string, campanha: string, alvo: string, n: string): Buffer | null {
  const an = lerAnalise(arquivo, campanha, alvo);
  if (!an?.atual || !/^\d{1,3}$/.test(n)) return null;
  const capPath = join(an.atual.dir, "revisao", "capture.json");
  if (!existsSync(capPath)) return null;
  const cap = JSON.parse(readFileSync(capPath, "utf8")) as { scenes: { image?: string }[] };
  const img = cap.scenes[Number(n)]?.image;
  if (!img || !/^scene-\d+\.png$/.test(img)) return null;
  const p = join(an.atual.dir, "revisao", img);
  return existsSync(p) ? readFileSync(p) : null;
}

// ───────────────────────────────────────────────────────────────── gravação versionada

export interface PedidoDecisao {
  cardId: string; decisao: string; unitIds?: string[]; duplicadaDe?: string | null;
  citacao?: "supported" | "unsupported" | "uncertain"; justificativa: string; consultado?: string[]; revisora: string; base: number;
}
export type ResultadoGravacao = { ok: true; versao: number; arquivo: string } | { ok: false; erro: string; conflito?: boolean };

export function salvarDecisao(arquivo: string, campanha: string, alvo: string, p: PedidoDecisao): ResultadoGravacao {
  const an = lerAnalise(arquivo, campanha, alvo);
  if (!an?.atual) return { ok: false, erro: "análise sem versão íntegra: nada para revisar" };
  const pkg = pacoteDaRevisao(an.atual);
  const vigor = decisoesEmVigor(an);
  if (!pkg || !vigor) return { ok: false, erro: "a revisão atual não tem pacote de revisão (nada foi pontuado)" };
  if (p.base !== vigor.versao) {
    return { ok: false, conflito: true, erro: `outra gravação aconteceu enquanto esta página estava aberta (versão ${vigor.versao}, a página tinha ${p.base}). Recarregue a página: nada foi perdido, mas confira o cartão antes de salvar de novo.` };
  }
  const revisora = String(p.revisora ?? "").trim();
  const justificativa = String(p.justificativa ?? "").trim();
  const consultado = (p.consultado ?? []).map(s => String(s).trim()).filter(Boolean);
  if (!revisora) return { ok: false, erro: "informe o nome da revisora: a decisão é assinada por quem a tomou" };
  if (!(p.decisao in DECISOES)) return { ok: false, erro: `decisão desconhecida; use uma destas: ${Object.keys(DECISOES).join(", ")}` };
  if (!justificativa) return { ok: false, erro: "a justificativa é obrigatória" };
  if (!consultado.length) return { ok: false, erro: "diga o que você consultou (por exemplo: cartão; reconstrução da cena)" };
  const card = pkg.cards.find(c => c.id === p.cardId);
  if (!card) return { ok: false, erro: "cartão desconhecido nesta revisão" };
  if (card.segmentos?.length) return { ok: false, erro: "cartão com cenas por segmento: esta versão do painel não decide esse caso (a análise T6 ainda recusa referência que navega)" };
  const raw = structuredClone(vigor.raw);
  const dec = raw.decisions.find(d => d.cardId === card.id);
  if (!dec) return { ok: false, erro: "cartão fora das decisões deste pacote" };
  let unitIds: string[] = [];
  let duplicateOf: { cardId: string; atomId: string } | undefined;
  if (p.decisao === "defeito-do-gabarito") {
    unitIds = [...new Set(p.unitIds ?? [])];
    if (!unitIds.length) return { ok: false, erro: "escolha qual unidade a alegação acertou" };
    if (!unitIds.every(u => card.candidateUnitIds.includes(u))) return { ok: false, erro: "só unidades candidatas deste cartão podem ser escolhidas" };
  } else if (p.decisao === "duplicada") {
    const alvoC = pkg.cards.find(c => c.id === p.duplicadaDe);
    if (!alvoC || !duplicataElegivel(pkg, card, alvoC)) return { ok: false, erro: "“duplicada” só vale para outro cartão da MESMA execução, com os mesmos elementos e o mesmo estado" };
    const dAlvo = raw.decisions.find(d => d.cardId === alvoC.id);
    if (dAlvo?.status !== "reviewed") return { ok: false, erro: "decida primeiro o cartão do qual esta é duplicata" };
    unitIds = [...(dAlvo.atoms[0]?.unitIds ?? [])];
    duplicateOf = { cardId: alvoC.id, atomId: dAlvo.atoms[0]?.id ?? "a1" };
  }
  Object.assign(dec, {
    status: "reviewed", reviewer: revisora, rationale: justificativa, complete: true, evidenceRefs: consultado,
    atoms: [{ id: "a1", text: card.observed ?? card.description, subjects: card.subjects.map(s => s.id), unitIds,
      citation: p.citacao ?? "uncertain", decisao: p.decisao as keyof typeof DECISOES, ...(duplicateOf ? { duplicateOf } : {}) }],
  });
  try {
    scoreSemanticPackage(pkg, normalizeReviews(structuredClone(raw)));
  } catch (e) {
    return { ok: false, erro: `o scorer recusou esta decisão (nada foi gravado): ${e instanceof Error ? e.message : String(e)}` };
  }
  const versao = vigor.versao + 1;
  const nome = `decisoes-${String(versao).padStart(4, "0")}.json`;
  const meta: MetaDecisao = { formato: DECISOES_VERSAO, versao, salvoEm: new Date().toISOString(), revisora, cartao: card.id, decisao: p.decisao,
    justificativa, baseadaEm: { revisao: an.atual.nome, decisoes: an.decisoes[0]?.nome ?? null } };
  mkdirSync(join(an.dir, "decisoes"), { recursive: true });
  try {
    writeFileSync(join(an.dir, "decisoes", nome), JSON.stringify({ ...raw, _painel: meta }, null, 2) + "\n", { flag: "wx" });
  } catch {
    return { ok: false, conflito: true, erro: `a versão ${versao} já foi gravada por outra janela. Recarregue a página.` };
  }
  return { ok: true, versao, arquivo: `${an.rel}/decisoes/${nome}` };
}

// ───────────────────────────────────────────────────────────────── recálculo

export interface OpcoesRecalculo { telas?: string | null }
export type ResultadoRecalculo = { ok: true; revisao: string; estado: string } | { ok: false; erro: string; falha: string | null };

const emAndamento = new Set<string>();
const carimbo = (): string => new Date().toISOString().replace(/[:.]/g, "-");

function siteDaReceita(arquivo: string, an: Analise, o: OpcoesRecalculo): string {
  const rc = an.receita!;
  if (rc.entradas.site) return dentroDoArquivo(arquivo, rc.entradas.site);
  if (o.telas && existeDiretorio(o.telas)) return o.telas;
  throw new Error("o site congelado não está no arquivo e o painel foi aberto sem --telas <clone do govbr-telas>");
}

/**
 * Exceção → uma frase legível para o painel + o texto cru (que fica só no erro.json).
 * O caso que motivou: o Chromium headless do Playwright não abre nesta máquina (ex.: Windows
 * 0xC0000142 = STATUS_DLL_INIT_FAILED, falha ambiental do processo do navegador, não da análise).
 * O log do Playwright tem dezenas de linhas; despejá-lo na tela não diz à autora o que fazer.
 */
export function explicarExcecao(e: unknown): { motivo: string; detalhe: string | null } {
  const cru = e instanceof Error ? (e.stack && e.stack.includes(e.message) ? e.stack : `${e.message}\n${e.stack ?? ""}`) : String(e);
  const msg = e instanceof Error ? e.message : String(e);
  if (/browserType\.launch/.test(msg)) {
    if (/Executable doesn't exist/i.test(msg)) {
      return { motivo: "O navegador headless do Playwright não está instalado nesta máquina: rode `npx playwright install chromium` dentro do govbr-eval e clique em Recalcular de novo.", detalhe: cru };
    }
    const m = /exitCode=(-?\d+)/.exec(msg);
    const codigo = m ? ` (o processo saiu com o código ${m[1]}${Number(m[1]) > 0xffff ? ` = 0x${Number(m[1]).toString(16).toUpperCase()}` : ""})` : "";
    return { motivo: `O navegador headless que recalcula a página congelada não conseguiu abrir nesta máquina${codigo}; isso é do ambiente, não da análise: feche programas pesados (ou reinicie o Windows) e clique em Recalcular de novo, e se repetir rode \`npx playwright install chromium\` dentro do govbr-eval.`, detalhe: cru };
  }
  const primeira = msg.split(/\r?\n/)[0].trim() || "erro sem mensagem";
  return { motivo: primeira, detalhe: cru };
}

export async function recalcular(arquivo: string, campanha: string, alvo: string, o: OpcoesRecalculo = {}): Promise<ResultadoRecalculo> {
  const an = lerAnalise(arquivo, campanha, alvo);
  if (!an) return { ok: false, erro: "análise desconhecida", falha: null };
  if (!an.receita) return { ok: false, erro: `receita.json ilegível: ${an.erroReceita}`, falha: null };
  if (emAndamento.has(an.id)) return { ok: false, erro: "já existe um recálculo desta análise em andamento", falha: null };
  emAndamento.add(an.id);
  const c = carimbo();
  const revDir = join(an.dir, "revisoes");
  const tmp = join(revDir, `.em-andamento-${c}`);
  const decisoes = an.decisoes[0] ? join(an.dir, "decisoes", an.decisoes[0].nome) : undefined;
  const registrarFalha = (motivo: string, detalhe: string | null = null): ResultadoRecalculo => {
    const fdir = join(revDir, "falhas", c);
    mkdirSync(fdir, { recursive: true });
    if (existsSync(tmp)) renameSync(tmp, join(fdir, "saida-parcial"));
    writeFileSync(join(fdir, "erro.json"), JSON.stringify({ em: new Date().toISOString(), motivo,
      decisoes: an.decisoes[0]?.nome ?? null, anterior: an.atual?.nome ?? null, ...(detalhe ? { detalhe } : {}) }, null, 2) + "\n", { flag: "wx" });
    return { ok: false, erro: motivo, falha: `${an.rel}/revisoes/falhas/${c}` };
  };
  try {
    const rc = an.receita;
    const A = (rel: string) => dentroDoArquivo(arquivo, rel);
    const pac = (arm: Arm) => (rc.pacotes[arm] ? A(rc.pacotes[arm]!) : undefined);
    for (const arm of ARMS) {
      if (rc.pacotes[arm] && !existsSync(join(pac(arm)!, "artifact-manifest.json"))) {
        return registrarFalha(`o pacote inteiro do braço ${arm} não está restaurado em ${rc.pacotes[arm]} (baixe o anexo da Release e rode restaurar-execucao)`);
      }
    }
    mkdirSync(revDir, { recursive: true });
    const r = await analisar({
      ...(rc.tipo === "par" ? { sem: pac("sem"), com: pac("com") } : { pacote: pac((ARMS.find(a => rc.pacotes[a]) ?? "sem") as Arm) }),
      campanha: A(rc.entradas.campanha), snapshots: A(rc.entradas.snapshots), referencia: A(rc.entradas.referencia),
      site: siteDaReceita(arquivo, an, o),
      ...(rc.entradas.semLinhaDeBase ? { semLinhaDeBase: true } : { linhaDeBase: rc.entradas.linhaDeBase ? A(rc.entradas.linhaDeBase) : undefined }),
      arquivo, decisoes, anterior: an.atual?.dir, saida: tmp,
    });
    if (r.estado === "recusada") return registrarFalha(`a análise recusou as entradas: ${r.motivo}`);
    if (!existsSync(join(tmp, "summary.json"))) return registrarFalha("a análise terminou sem summary.json");
    const proximo = Math.max(0, ...an.revisoes.map(x => x.numero), ...existentes(revDir)) + 1;
    const nome = `rev-${String(proximo).padStart(3, "0")}`;
    renameSync(tmp, join(revDir, nome));
    return { ok: true, revisao: `${an.rel}/revisoes/${nome}`, estado: r.estado };
  } catch (e) {
    const { motivo, detalhe } = explicarExcecao(e);
    return registrarFalha(motivo, detalhe);
  } finally {
    emAndamento.delete(an.id);
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  }
}

/** Números de rev-NNN já ocupados, inclusive pastas incompletas (nunca reaproveitados). */
function existentes(revDir: string): number[] {
  return existsSync(revDir) ? readdirSync(revDir).map(n => /^rev-(\d{3,})$/.exec(n)).filter(Boolean).map(m => Number(m![1])) : [];
}

