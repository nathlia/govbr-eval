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
  DECISOES, aceitaVinculos, armLeaks, estadosDaUnidade, canonical, digest, normalizeReviews, reviewQueue, scoreSemanticPackage,
  type RawReviewAtom, type ReviewCard, type SemanticPackage, type SemanticUnit,
} from "../semantic-flow";
import { montarAtomos, montarVinculos, type PedidoAtomo, type PedidoVinculo } from "../decisao-atomos";
import {
  ARMS, DECISOES_VERSAO, dentroDoArquivo, decisoesEmVigor, existeDiretorio, lerAnalise, pacoteDaRevisao,
  type Analise, type MetaDecisao, type Revisao,
} from "./modelo";
import { contarMascara, mascarar, type TextoVisivel } from "./mascara";

// ───────────────────────────────────────────────────────────────── vista cega

export interface VistaUnidade { id: string; specId: string; estado: string; estados: string[]; cena: string; descricao: string; predicado: string }
export interface VistaCartao {
  id: string; origem: "execução de agente" | "linha de base determinística"; cena: string; regra: string | null;
  observado: string | null; esperado: string | null; janela: string; sinais: string[];
  sujeitos: { id: string; rotulo: string; oculto: string | null }[];
  candidatas: VistaUnidade[];
  /**
   * NAT-72: as OUTRAS unidades da mesma cena (das cenas do cartão, se segmentado), para a revisora
   * pesquisar quando a alegação está certa e a ancoragem automática não a ofereceu. Escolher uma delas
   * exige vínculo de revisão (relação, estado, evidência, justificativa). Vazio em pacote que não
   * aceita vínculo: decisões antigas não recebem vínculo retroativo.
   */
  unidadesDaCena: VistaUnidade[];
  /** O pacote aceita vínculo de revisão (NAT-72)? */
  aceitaVinculo: boolean;
  duplicataDe: string[];
  evidencias: { n: number; status: string; url: string | null; sha256: string | null }[];
  imagemCena: string | null;
  retido: string;
  decisao: { status: "pendente" | "decidido"; decisao: string | null; justificativa: string | null; revisora: string | null; unidades: string[]; cena: string | null;
    /** Uma linha por átomo gravado: decisão, quantos elementos, unidades (specId) e relações de vínculo. */
    partes: { decisao: string | null; sujeitos: number; unidades: string[]; vinculos: string[] }[] };
  segmentado: boolean;
  /**
   * Só em cartão com cenas por segmento (D-60, tela B): o seletor resolve em mais de um segmento e a
   * revisora diz de qual a alegação fala. Cada opção traz os sujeitos e as unidades candidatas DAQUELA
   * cena; só elas contam (a validação é a do scorer).
   */
  cenas: { id: string; estado: string; caminho: string | null; sujeitos: string[]; candidatas: string[] }[] | null;
}

export const tokenEvidencia = (an: Analise, rv: Revisao, cardId: string, i: number): string =>
  digest(["painel-evidencia", an.id, rv.nome, cardId, i]).slice(0, 24);

function unidade(u: SemanticUnit): VistaUnidade {
  return { id: u.id, specId: u.specId, estado: u.state, estados: estadosDaUnidade(u), cena: u.scene, descricao: u.description,
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
  /**
   * NAT-60. `citavam`: cartões cujo texto visível citava um id de regra do oráculo (mascarados como
   * "[regra citada]", ver mascara.ts). `vazamentosDeBraco`: o número publicado pela análise
   * (`armLeaks` sobre o texto inteiro do pacote). `aposMascara`: cartões cujo texto que a fila
   * mostra ainda denuncia o braço depois da máscara.
   */
  mascara: { citavam: number; vazamentosDeBraco: number; aposMascara: number };
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
      id: c.id, origem: c.origin === "agente" ? "execução de agente" : "linha de base determinística", cena: c.scene, regra: mascarar(c.rule),
      observado: legado ? null : mascarar(c.observed), esperado: legado ? null : mascarar(c.expected),
      janela: c.state ? `${c.state.viewport.width}×${c.state.viewport.height} · ${c.state.steps.join(" → ") || "sem interações"}` : "não declarada",
      sinais: c.flags.map(f => mascarar(f)),
      sujeitos: c.subjects.map(s => ({ id: s.id, rotulo: mascarar(s.label), oculto: mascarar(s.hidden) })),
      candidatas: c.candidateUnitIds.map(id => unidade(units.get(id)!)),
      unidadesDaCena: aceitaVinculos(pkg.version) ? pkg.units.filter(u => !c.candidateUnitIds.includes(u.id) &&
        (c.segmentos ? c.segmentos.some(o => o.scene === u.scene) : u.scene === c.scene)).map(unidade) : [],
      aceitaVinculo: aceitaVinculos(pkg.version),
      duplicataDe: pkg.cards.filter(alvoC => duplicataElegivel(pkg, c, alvoC)).map(x => x.id),
      evidencias: c.evidence.map((e, i) => ({ n: i + 1, status: e.status, sha256: e.sha256?.slice(0, 12) ?? null,
        url: e.path && e.sha256 ? `/evidencia/${encodeURIComponent(an.campanha)}/${encodeURIComponent(an.alvo)}/${tokenEvidencia(an, rv, c.id, i)}` : null })),
      imagemCena: cena >= 0 && capture.scenes[cena].image ? `/cena/${encodeURIComponent(an.campanha)}/${encodeURIComponent(an.alvo)}/${cena}` : null,
      retido: legado ? "cartão legado: o texto bruto foi retido porque pode nomear o braço"
        : "retidos por cegueira: a narrativa livre da execução, o nome dos arquivos de evidência e o braço",
      decisao: d && d.status === "reviewed"
        ? { status: "decidido", decisao: (d.atoms[0] as { decisao?: string })?.decisao ?? d.atoms[0]?.verdict ?? null, justificativa: d.rationale,
          revisora: d.reviewer, unidades: d.atoms.flatMap(a => a.unitIds), cena: d.cena ?? null,
          partes: d.atoms.map(a => ({ decisao: (a as { decisao?: string }).decisao ?? a.verdict ?? null, sujeitos: a.subjects.length,
            unidades: a.unitIds.map(id => units.get(id)?.specId ?? "?"), vinculos: (a.links ?? []).map(l => l.relation) })) }
        : { status: "pendente", decisao: null, justificativa: null, revisora: null, unidades: [], cena: null, partes: [] },
      segmentado: Boolean(c.segmentos?.length),
      cenas: c.segmentos?.length ? c.segmentos.map(o => ({ id: o.scene, estado: o.estado, caminho: o.path,
        sujeitos: c.subjects.filter(s => s.scene === o.scene).map(s => mascarar(s.label)), candidatas: o.candidateUnitIds })) : null,
    };
  });
  // Máscara só na vista (NAT-60): o pacote não é tocado. Contagem antes/depois sobre o mesmo recorte de texto.
  const visivel = (id: string, regra: string | null, obs: string | null, esp: string | null, extras: (string | null)[]): TextoVisivel =>
    ({ id, regra, observado: obs, esperado: esp, extras: extras.filter((x): x is string => x !== null) });
  const antes = ordenados.map(c => { const leg = c.contract !== "achado-2" && c.contract !== "deterministico";
    return visivel(c.id, c.rule, leg ? null : c.observed, leg ? null : c.expected, [...c.flags, ...c.subjects.flatMap(s => [s.label, s.hidden])]); });
  const depois = cartoes.map(c => visivel(c.id, c.regra, c.observado, c.esperado, [...c.sinais, ...c.sujeitos.flatMap(s => [s.rotulo, s.oculto])]));
  const mascara = { ...contarMascara(antes, depois), vazamentosDeBraco: armLeaks(pkg).length };
  const fila = reviewQueue(pkg, normalizeReviews(structuredClone(vigor.raw)));
  const decididos = vigor.raw.decisions.filter(d => d.status === "reviewed" && pkg.cards.some(c => c.id === d.cardId)).length;
  // gravações feitas depois que a revisão atual foi calculada: ainda fora da pontuação até Recalcular
  const naoIncorporadas = an.decisoes.filter(v => (v.meta?.salvoEm ?? "") > rv.resumo.geradoEm).length;
  return { analise: an, revisao: rv, cartoes, versaoDecisoes: vigor.versao, origemDecisoes: vigor.origem,
    pendentesAtivos: fila.ativa.cartoes, decididos, naoIncorporadas, vocabulario: Object.keys(DECISOES), mascara };
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
  /**
   * Decisão do cartão inteiro (`decisao`) OU decomposição em partes (`atomos`, NAT-72): cada parte diz
   * os seus elementos, a sua decisão, as unidades e os vínculos; nada é atribuído por omissão.
   * `vinculos` (só com `decisao`): vínculo de revisão para unidade que não está entre as candidatas.
   */
  cardId: string; decisao?: string; unitIds?: string[]; duplicadaDe?: string | null;
  atomos?: PedidoAtomo[]; vinculos?: PedidoVinculo[];
  /** Cartão com cenas por segmento (D-60): de qual cena a alegação fala. Obrigatório nele, proibido nos outros. */
  cena?: string | null;
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
  const decompoe = Array.isArray(p.atomos);
  if (decompoe && p.decisao) return { ok: false, erro: "envie a decisão do cartão inteiro OU as partes, não as duas" };
  if (!decompoe && !(String(p.decisao) in DECISOES)) return { ok: false, erro: `decisão desconhecida; use uma destas: ${Object.keys(DECISOES).join(", ")}` };
  if (!justificativa) return { ok: false, erro: "a justificativa é obrigatória" };
  if (!consultado.length) return { ok: false, erro: "diga o que você consultou (por exemplo: cartão; reconstrução da cena)" };
  const card = pkg.cards.find(c => c.id === p.cardId);
  if (!card) return { ok: false, erro: "cartão desconhecido nesta revisão" };
  // Cena por segmento (D-60): a alegação diz a janela e os passos em texto livre, nunca a rota; quem
  // decide diz de qual segmento ela fala, e só os sujeitos e as candidatas dessa cena contam.
  const cena = p.cena ? String(p.cena) : null;
  const segmento = card.segmentos?.length ? card.segmentos.find(o => o.scene === cena) : undefined;
  if (card.segmentos?.length && !segmento) return { ok: false, erro: `escolha de qual cena a alegação fala: o elemento existe em mais de um segmento (${card.segmentos.map(o => o.estado).join(", ")})` };
  if (!card.segmentos?.length && cena) return { ok: false, erro: "este cartão não tem cenas por segmento para escolher" };
  const candidatas = segmento ? segmento.candidateUnitIds : card.candidateUnitIds;
  const sujeitos = (segmento ? card.subjects.filter(s => s.scene === segmento.scene) : card.subjects).map(s => s.id);
  const raw = structuredClone(vigor.raw);
  const dec = raw.decisions.find(d => d.cardId === card.id);
  if (!dec) return { ok: false, erro: "cartão fora das decisões deste pacote" };
  let atoms: RawReviewAtom[];
  let vinculos = 0;
  if (decompoe) {
    // NAT-72: decomposição real. Cada parte traz os próprios elementos; a unidade fora das candidatas
    // só entra com vínculo explícito. A validação final é a do scorer, logo abaixo.
    const m = montarAtomos(pkg, card, segmento?.scene ?? null, revisora, sujeitos, candidatas, p.atomos!);
    if (!m.ok) return { ok: false, erro: m.erro };
    atoms = m.atoms;
    vinculos = m.vinculos;
  } else {
    let unitIds: string[] = [];
    let duplicateOf: { cardId: string; atomId: string } | undefined;
    let links: RawReviewAtom["links"];
    if (p.decisao === "defeito-do-gabarito") {
      unitIds = [...new Set(p.unitIds ?? [])];
      if (!unitIds.length) return { ok: false, erro: "escolha qual unidade a alegação acertou" };
      const v = montarVinculos(pkg, card, segmento?.scene ?? null, revisora, sujeitos, unitIds, p.vinculos);
      if (!v.ok) return { ok: false, erro: v.erro };
      if (!unitIds.every(u => candidatas.includes(u) || v.links.some(l => l.unitId === u))) {
        return { ok: false, erro: (segmento ? "só unidades candidatas da cena escolhida podem ser escolhidas" : "só unidades candidatas deste cartão podem ser escolhidas") +
          (aceitaVinculos(pkg.version) ? ", ou outra unidade da mesma cena COM vínculo de revisão (relação, estado, evidência e justificativa)" : "") };
      }
      if (v.links.length) { links = v.links; vinculos = v.links.length; }
    } else if (p.vinculos?.length) {
      return { ok: false, erro: "vínculo de revisão só acompanha “defeito do gabarito”" };
    } else if (p.decisao === "duplicada") {
      const alvoC = pkg.cards.find(c => c.id === p.duplicadaDe);
      if (!alvoC || !duplicataElegivel(pkg, card, alvoC)) return { ok: false, erro: "“duplicada” só vale para outro cartão da MESMA execução, com os mesmos elementos e o mesmo estado" };
      const dAlvo = raw.decisions.find(d => d.cardId === alvoC.id);
      if (dAlvo?.status !== "reviewed") return { ok: false, erro: "decida primeiro o cartão do qual esta é duplicata" };
      if (dAlvo.atoms.length !== 1 || dAlvo.atoms[0].links?.length) {
        return { ok: false, erro: "o cartão apontado foi decomposto em partes ou tem vínculo de revisão: decida este cartão diretamente" };
      }
      unitIds = [...(dAlvo.atoms[0]?.unitIds ?? [])];
      duplicateOf = { cardId: alvoC.id, atomId: dAlvo.atoms[0]?.id ?? "a1" };
    }
    // Decisão do cartão inteiro: um átomo com todos os elementos, por escolha explícita da revisora.
    atoms = [{ id: "a1", text: card.observed ?? card.description, subjects: sujeitos, unitIds,
      citation: p.citacao ?? "uncertain", decisao: p.decisao as keyof typeof DECISOES, ...(duplicateOf ? { duplicateOf } : {}),
      ...(links ? { links } : {}) }];
  }
  Object.assign(dec, {
    status: "reviewed", reviewer: revisora, rationale: justificativa, complete: true, evidenceRefs: consultado, ...(segmento ? { cena: segmento.scene } : {}),
    atoms,
  });
  try {
    scoreSemanticPackage(pkg, normalizeReviews(structuredClone(raw)));
  } catch (e) {
    return { ok: false, erro: `o scorer recusou esta decisão (nada foi gravado): ${e instanceof Error ? e.message : String(e)}` };
  }
  const versao = vigor.versao + 1;
  const nome = `decisoes-${String(versao).padStart(4, "0")}.json`;
  const meta: MetaDecisao = { formato: DECISOES_VERSAO, versao, salvoEm: new Date().toISOString(), revisora, cartao: card.id,
    decisao: decompoe ? `partes: ${atoms.map(a => a.decisao).join(" + ")}` : String(p.decisao),
    justificativa, baseadaEm: { revisao: an.atual.nome, decisoes: an.decisoes[0]?.nome ?? null }, partes: atoms.length, vinculos };
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
  // O pacote contra o qual essas decisões foram gravadas: é contra ele que um id antigo é transposto
  // para o id novo (corpo idêntico; revisao/mapa-cartoes.json). Sem ele, o padrão é o da revisão atual.
  const revDasDecisoes = an.revisoes.find(x => x.nome === an.decisoes[0]?.meta?.baseadaEm.revisao);
  const pacoteDecisoes = revDasDecisoes && existsSync(join(revDasDecisoes.dir, "revisao", "package.json"))
    ? join(revDasDecisoes.dir, "revisao", "package.json") : undefined;
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
      arquivo, decisoes, pacoteDecisoes, anterior: an.atual?.dir, saida: tmp,
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

