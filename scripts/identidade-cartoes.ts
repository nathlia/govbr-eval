/**
 * Identidade dos cartões entre recálculos (piloto-01, par-01, 2026-10-03).
 *
 * O id do cartão é `C-${digest({ context, body, units })}` (semantic-flow.ts) e `context.sceneHash` é
 * um digest das cenas capturadas na página congelada. Telas reais (o `br-select` do DS) sorteiam ids
 * em tempo de execução (`aria-controls="list-4946"` ↔ `id="list-4946"`, `list-3370` na captura
 * seguinte): o PNG sai idêntico, o HTML não, e cada Recalcular mudava TODOS os ids — as decisões
 * gravadas ficavam órfãs. Este módulo NÃO está em SCORER_FILES: não muda o que um cartão diz nem
 * como ele é pontuado, só (1) o que entra no `sceneHash` e (2) a transposição auditável das decisões.
 *
 * (1) `normalizarIdsGerados`: um id é tratado como GERADO quando termina em dígitos E não aparece
 * literalmente, como token inteiro, em nenhum arquivo do site congelado (então não veio do HTML/JS servido: foi montado
 * em tempo de execução). Cada id gerado é renomeado por ordem de primeira aparição
 * (`list-4946` → `list-#g1`), e o mesmo nome é aplicado onde ele é referenciado (`for`, `aria-*`
 * de referência, `headers`, `list`, `form`, `href="#…"`). O prefixo fica: só um renumerar puro some
 * do hash; texto, estrutura, atributos, quantos ids gerados existem e quem aponta para quem continuam
 * contando. Mesmo precedente da conferência do scanner (anchors.ts `impressaoDaArvore`, "ids por
 * contador não contam"), mais estreito: lá o id sai inteiro.
 *
 * (2) `mapearDecisoes`: decisão gravada com o id de OUTRO pacote só é transposta quando o cartão de
 * lá e o daqui são iguais em tudo menos o id (corpo canônico idêntico), as unidades são idênticas e
 * só o `sceneHash` difere no contexto (mesma referência, mesmo scorer). Corpo diferente → fica
 * pendente. Cada transposição (e cada recusa) vai para `revisao/mapa-cartoes.json`.
 *
 * (3) `navegadorComRelogio` (NAT-67): a captura roda com fuso fixo e relógio da página instalado num
 * instante declarado, para que "hoje" na página (o calendário da tela A) não dependa do dia do recálculo.
 */
import type { Browser, BrowserContext, BrowserContextOptions } from "playwright";
import { canonical, type RawReviews, type SemanticPackage, type SemanticReviews } from "./semantic-flow";

export const REGRA_IDS_GERADOS = "id terminado em dígitos e ausente, como texto literal (token inteiro: sem letra, dígito, '_' ou '-' colado antes ou depois), de todos os arquivos do site congelado; " +
  "renomeado por ordem de primeira aparição (prefixo mantido), também onde é referenciado (for, aria-controls, aria-labelledby, " +
  "aria-describedby, aria-owns, aria-activedescendant, aria-flowto, aria-details, aria-errormessage, headers, list, form, href=\"#id\"); " +
  "e o APP_ID que o Angular sorteia a cada carga nos atributos de encapsulamento (_ngcontent-XXX-cN, _nghost-XXX-cN, também dentro " +
  "dos <style>): renomeado para #a1, #a2… por ordem de primeira aparição";

const ATRIBUTOS_DE_REFERENCIA = new Set(["for", "aria-controls", "aria-labelledby", "aria-describedby", "aria-owns",
  "aria-activedescendant", "aria-flowto", "aria-details", "aria-errormessage", "headers", "list", "form"]);

export interface IdGerado { id: string; como: string }

/**
 * HTML com os ids gerados em tempo de execução renomeados de forma estável. `noSite(id)` diz se o
 * texto do id aparece em algum arquivo do site congelado (então não é tratado como gerado).
 */
export function normalizarIdsGerados(html: string, noSite: (id: string) => boolean): { html: string; ids: IdGerado[] } {
  const r = normalizarSoIds(html, noSite);
  const ng = normalizarAppIdAngular(r.html);
  return { html: ng.html, ids: [...r.ids, ...ng.ids] };
}

/**
 * Angular 15 (tela B, Vistorias) com encapsulamento emulado: o APP_ID é sorteado a cada carga (3 letras)
 * e entra no NOME dos atributos de escopo (`_ngcontent-baa-c16`, `_nghost-baa-c16`) e no CSS dos
 * `<style>` gerados (`.x[_ngcontent-baa-c16]`). Duas cargas da mesma página diferem só nisso (NAT-67).
 * O site traz só o molde (`_ngcontent-%COMP%`); o valor é sempre de tempo de execução, então não há
 * conferência contra o site (renomear um valor fixo também seria estável: só sai do hash o nome sorteado).
 */
function normalizarAppIdAngular(html: string): { html: string; ids: IdGerado[] } {
  const nomes = new Map<string, string>();
  for (const m of html.matchAll(/_ng(?:content|host)-([a-z0-9]+)-c\d/g)) {
    if (!nomes.has(m[1])) nomes.set(m[1], `#a${nomes.size + 1}`);
  }
  if (!nomes.size) return { html, ids: [] };
  return {
    html: html.replace(/_ng(content|host)-([a-z0-9]+)-c(?=\d)/g, (todo, tipo: string, app: string) => (nomes.has(app) ? `_ng${tipo}-${nomes.get(app)}-c` : todo)),
    ids: [...nomes].map(([app, como]) => ({ id: `_ngcontent/_nghost-${app}-c*`, como: `_ngcontent/_nghost-${como}-c*` })),
  };
}

function normalizarSoIds(html: string, noSite: (id: string) => boolean): { html: string; ids: IdGerado[] } {
  const nomes = new Map<string, string>();
  for (const m of html.matchAll(/\sid="([^"]*)"/g)) {
    const id = m[1];
    if (nomes.has(id)) continue;
    const p = /^(.*?)\d+$/.exec(id);
    if (!p || noSite(id)) continue;
    nomes.set(id, `${p[1]}#g${nomes.size + 1}`);
  }
  if (!nomes.size) return { html, ids: [] };
  const trocado = html.replace(/(\s)([a-zA-Z-]+)="([^"]*)"/g, (todo, esp: string, nome: string, valor: string) => {
    const n = nome.toLowerCase();
    if (n === "id") return nomes.has(valor) ? `${esp}${nome}="${nomes.get(valor)}"` : todo;
    if (n === "href") return valor.startsWith("#") && nomes.has(valor.slice(1)) ? `${esp}${nome}="#${nomes.get(valor.slice(1))}"` : todo;
    if (!ATRIBUTOS_DE_REFERENCIA.has(n)) return todo;
    return `${esp}${nome}="${valor.split(/(\s+)/).map(t => nomes.get(t) ?? t).join("")}"`;
  });
  return { html: trocado, ids: [...nomes].map(([id, como]) => ({ id, como })) };
}

/** Byte que, colado ao id, faz dele parte de um nome maior: letra ASCII, dígito, `_`, `-`. */
const deNome = (b: number | undefined): boolean => b !== undefined &&
  ((b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a) || b === 0x5f || b === 0x2d);

/**
 * `noSite` sobre os bytes do site congelado carregado (measurement-surface.ts `loadSite`). O id conta
 * como presente só se aparece como TOKEN INTEIRO (NAT-67): o `br-select` sorteia `list-${0..9999}`, e
 * `list-1` aparece dentro de `.fa-list-1-2` no CSS do Font Awesome da tela A — com `includes`, a carga
 * que sorteasse `list-1` deixaria o id cru no hash. Ids que o site escreve de verdade (`id="x-3"`,
 * `#x-3`, `"x-3"`) continuam presentes: aspas, `#`, `=`, espaço e `>` não são de nome.
 */
export function presenteNoSite(arquivos: Iterable<{ body: Buffer }>): (id: string) => boolean {
  const corpos = [...arquivos].map(f => f.body);
  const memo = new Map<string, boolean>();
  const token = (b: Buffer, id: string): boolean => {
    for (let i = b.indexOf(id); i >= 0; i = b.indexOf(id, i + 1)) {
      if (!deNome(i > 0 ? b[i - 1] : undefined) && !deNome(b[i + Buffer.byteLength(id)])) return true;
    }
    return false;
  };
  return id => {
    if (!memo.has(id)) memo.set(id, corpos.some(b => token(b, id)));
    return memo.get(id)!;
  };
}

// ───────────────────────────────────────────────────────────────── relógio da captura

/**
 * Relógio da captura (NAT-67). A página congelada pode depender da data: o calendário (flatpickr) da
 * tela A marca o dia de hoje (`class="flatpickr-day today"`, `aria-current="date"`) e mostra o mês
 * corrente. Sem relógio fixo, recapturar noutro dia mudava o HTML → o `sceneHash` → todos os ids de
 * cartão, e o cartão cujo seletor é `.flatpickr-day.today` passava a resolver outro dia (corpo
 * diferente → pendente). Toda captura do pacote abre o contexto com o fuso fixo e o relógio da página
 * começando no instante declarado — `createdAt` do conjunto de snapshots, uma entrada da análise com
 * hash — e correndo em tempo real a partir dali (`clock.install`: temporizadores, `debounceTime` etc.
 * continuam funcionando; `setFixedTime` pararia `Date.now()` e travaria quem mede tempo decorrido).
 */
export const FUSO_DA_CAPTURA = "America/Sao_Paulo";
export interface RelogioDaCaptura { instante: string; fuso: string; origem: string }
export const REGRA_RELOGIO = `contexto do navegador com timezoneId ${FUSO_DA_CAPTURA} e relógio da página instalado no createdAt do ` +
  "conjunto de snapshots (corre em tempo real a partir dali): a data de hoje da página não depende do dia do recálculo";

/** O navegador com `newContext` trocado: fuso fixo e relógio instalado antes de qualquer página. */
export function navegadorComRelogio(browser: Browser, relogio: RelogioDaCaptura): Browser {
  return new Proxy(browser, {
    get(alvo, prop) {
      if (prop === "newContext") {
        return async (opcoes: BrowserContextOptions = {}): Promise<BrowserContext> => {
          const contexto = await alvo.newContext({ ...opcoes, timezoneId: relogio.fuso });
          await contexto.clock.install({ time: relogio.instante });
          return contexto;
        };
      }
      const v = Reflect.get(alvo, prop, alvo);
      return typeof v === "function" ? v.bind(alvo) : v;
    },
  });
}

// ───────────────────────────────────────────────────────────────── transposição das decisões

export const MAPA_VERSAO = "mapa-cartoes-1.0.0";
export interface MapaCartoes {
  formato: typeof MAPA_VERSAO;
  regra: string;
  pacoteDasDecisoes: { origem: string; packageHash: string; context: SemanticPackage["context"] } | null;
  contextoNovo: SemanticPackage["context"];
  mapeados: { de: string; para: string; motivo: string }[];
  naoMapeados: { de: string; status: string; motivo: string }[];
}

const REGRA_MAPA = "decisão com id de outro pacote é transposta só se o cartão de lá e o daqui têm o corpo canônico idêntico " +
  "(tudo menos o id), as unidades são idênticas e o contexto difere só no sceneHash; senão fica pendente";

const corpo = (c: SemanticPackage["cards"][number]): string => { const { id: _id, ...resto } = c; return canonical(resto); };

/**
 * Transpõe para os ids de `novo` as decisões de `reviews` cujo cartão não existe em `novo`, segundo
 * a regra acima. Devolve as decisões transpostas (as que não puderam ser ficam como estavam — o
 * `scopeReviews` as deixa de fora e o cartão novo fica pendente) e o mapa, ou `null` quando todas
 * as decisões já são deste pacote.
 */
export function mapearDecisoes<R extends RawReviews | SemanticReviews>(reviews: R, novo: SemanticPackage,
  antigo: SemanticPackage | null, origem: string): { reviews: R; mapa: MapaCartoes | null } {
  const desta = new Set(novo.cards.map(c => c.id));
  const fora = reviews.decisions.filter(d => !desta.has(d.cardId));
  if (!fora.length) return { reviews, mapa: null };
  const mapa: MapaCartoes = { formato: MAPA_VERSAO, regra: REGRA_MAPA,
    pacoteDasDecisoes: antigo ? { origem, packageHash: antigo.packageHash, context: antigo.context } : null,
    contextoNovo: novo.context, mapeados: [], naoMapeados: [] };
  const recusa = (motivo: string) => {
    mapa.naoMapeados = fora.map(d => ({ de: d.cardId, status: d.status, motivo }));
    return { reviews, mapa };
  };
  if (!antigo) return recusa(`não há pacote de origem para estas decisões (${origem}); sem ele não há corpo para comparar`);
  if (antigo.context.referenceHash !== novo.context.referenceHash) return recusa("referência diferente (referenceHash)");
  if (antigo.context.scorerHash !== novo.context.scorerHash) return recusa("scorer diferente (scorerHash)");
  if (canonical(antigo.units) !== canonical(novo.units)) return recusa("unidades diferentes");
  const porCorpo = new Map(novo.cards.map(c => [corpo(c), c.id]));
  const cartaoAntigo = new Map(antigo.cards.map(c => [c.id, c]));
  const decididos = new Set(reviews.decisions.map(d => d.cardId).filter(id => desta.has(id)));
  const para = new Map<string, string>();
  const motivoDe = new Map<string, string>();
  for (const d of fora) {
    const velho = cartaoAntigo.get(d.cardId);
    if (!velho) { motivoDe.set(d.cardId, "o cartão não existe no pacote de origem"); continue; }
    const alvo = porCorpo.get(corpo(velho));
    if (!alvo) { motivoDe.set(d.cardId, "nenhum cartão deste pacote tem o mesmo corpo (o que o cartão diz mudou): fica pendente"); continue; }
    if (decididos.has(alvo) || [...para.values()].includes(alvo)) { motivoDe.set(d.cardId, `o cartão ${alvo} já tem decisão própria`); continue; }
    para.set(d.cardId, alvo);
  }
  // Duplicata só vai junto se o cartão de que ela é duplicata também foi (ou já é deste pacote).
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const d of fora) {
      if (!para.has(d.cardId)) continue;
      const orfa = d.atoms.some(a => a.duplicateOf && !desta.has(a.duplicateOf.cardId) && !para.has(a.duplicateOf.cardId));
      if (orfa) { para.delete(d.cardId); motivoDe.set(d.cardId, "é duplicata de um cartão que não foi transposto"); mudou = true; }
    }
  }
  const out = structuredClone(reviews);
  for (const d of out.decisions) {
    const novoId = para.get(d.cardId);
    if (novoId) d.cardId = novoId;
    for (const a of d.atoms) if (a.duplicateOf && para.has(a.duplicateOf.cardId)) a.duplicateOf = { ...a.duplicateOf, cardId: para.get(a.duplicateOf.cardId)! };
  }
  for (const d of fora) {
    if (para.has(d.cardId)) mapa.mapeados.push({ de: d.cardId, para: para.get(d.cardId)!, motivo: "corpo e unidades idênticos; só o sceneHash difere" });
    else mapa.naoMapeados.push({ de: d.cardId, status: d.status, motivo: motivoDe.get(d.cardId)! });
  }
  return { reviews: out, mapa };
}
