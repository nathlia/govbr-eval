/**
 * E14 para a frente (protocolo NAT-78 §8.1, ensaio D-138): monta a primeira passada cega a partir das saídas de
 * `npm run analisar` de uma campanha nova (campaign.v2, trio sem/ferramentas/com). Não julga nada.
 *
 *   npx tsx scripts/reanalise-nat74/e14-campanha.ts --analise DIR [--analise DIR ...] --saida PASTA_NOVA
 *   npx tsx scripts/reanalise-nat74/e14-campanha.ts --servir PASTA_DO_SITE [--porta 3300]   (site congelado, só 127.0.0.1)
 *
 * Diferente da E14 retrospectiva: não há trilha nem triagem E6 (todo cartão vai ao juiz, um registro por CARTÃO, não por
 * átomo), não há fatos medidos prévios (o juiz mede a página congelada e cita `MEDIDA`) e a máscara também cobre o que
 * separa `ferramentas` de `com` (painel/mascara.ts, NAT-61) e o que separa `sem` dos dois braços com ferramentas.
 * O resto é a E14: vista cega (`cartaoCego`), normas, lotes, esquema, verificação de cegueira e a mesma ingestão
 * (`ingerir` lê lotes/manifesto.json + chave/fila-t3-chave.json desta pasta).
 *
 * 1.1.0 (1b, plano de revisão 19/10): texto das regras do DS pela base que o oráculo DA CAMPANHA carrega (`normasDaCampanha`,
 * conferida pelo dataSha256 do campaign.json; `--validador DIR`, padrão ../govbr-ds-validator); respostas só em
 * `<passada>/respostas/` (`respostaEm` = `../respostas/lote-NN.json`); `norma.id "nenhuma"` com aplicabilidade/violada
 * `nao-perguntado`; receitas da linha de base legíveis; fontes (base + sha256) no manifesto.
 * 1.2.0 (achados M, N): `forcaNoVocabulario` em cada regra da base (tabela FORCA_NO_VOCABULARIO, impressa no LEIAME) e
 * `estadoAlcancado` (`receita` | `nao-alcancado`, R10) na resposta.
 * 1.3.1 (D-154): `endereco` da tela = `_meta.url` da referência (com a consulta, ex. `?mock-perfil=mpa` da tela B), a mesma
 * entrada que a referência mediu e os runs abriram; o `capture.json` da análise guarda só o pathname, e os juízes do
 * ensaio-trio-b-03 mediram a página nua (sem a sessão fictícia; um deles notou). Ingestão:
 *   npx tsx scripts/reanalise-nat74/e14-ingerir.ts --fila PASTA_DA_PASSADA
 * 1.4.0 (D-156, política do juiz 1.3.0, padrão): o achado pode trazer `references` (até 2 referências secundárias); o cartão
 * cego as mostra em `referencias` (`REF1`, `REF2`, com o texto da norma como em `normaCitada`) e a resposta ganha
 * `referencias` (um julgamento de norma por referência), usadas só quando a primária cai por citação. Cartão sem referência
 * fica igual. `--politica 1.2.0` refaz a passada 1.3.1 byte a byte (referências ignoradas, formatos 1.2.0).
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { ID_DE_ACHADO, distingueComDeFerramentas, mascararNormaCega, mascararTextoCego } from "../painel/mascara";
import { POLITICA_PRINCIPAL, TCC, bracoDoPerfil, gravar, jsonTexto, lerJson, ordenar, rotuloPolitica, sha, versaoDaPolitica, type VersaoPolitica } from "./comum";
import { CATEGORIAS_RESIDUO, residuoDeBraco, verificarCegueira, type Cegueira, type ResiduoDoCartao } from "./e14-cegueira";
import {
  ESQUEMA_RESPOSTAS_CAMPANHA, ESQUEMA_RESPOSTAS_CAMPANHA_1_3, FORMATO_LOTE, FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_3, FORMATO_RESPOSTAS,
  FORMATO_RESPOSTAS_CAMPANHA, FORMATO_RESPOSTAS_CAMPANHA_1_3, IDS_REFERENCIA, NAO_PERGUNTADO,
  esquemaDaPassada, hashDaChave, idOpaco, mascarar, nomeLote, type CartaoCego, type ItemChave,
} from "./e14-comum";
import { TABELA_FORCAS, cartaoCego, normasDaCampanha, type Extracao } from "./e14-fila";
import { leiameJuiz, tamanhosDosLotes } from "./e14-preparar";

/**
 * 1.1.0 (1b): normas pela base do oráculo da campanha, caminho único de respostas, LEIAME corrigido, receitas legíveis.
 * 1.2.0 (M, N): força da base literal já no vocabulário do juiz (`forcaNoVocabulario`, tabela fixa impressa no LEIAME) e
 * resposta fechada `estadoAlcancado`; regra citada que só permite deriva erro normativo (R11a/R11d).
 * 1.3.0 (entrega 2, achados B e F): máscara cega do trio (`mascararNormaCega`/`mascararTextoCego`, painel/mascara.ts: o que é
 * informação de julgamento fica; ids de achado `FAM-…` saem das evidências; menções a ferramenta no texto livre viram o mesmo
 * marcador nos três braços), resíduo de braço contado por braço, categoria e comparação (`residuo-de-braco.json`, insumo do
 * S4') e braços pelo desenho da campanha (`design.arms`). Formato do lote, do manifesto e das respostas: o mesmo da 1.2.0.
 * 1.3.1 (D-154): `endereco` pela `_meta.url` da referência (`enderecoDaTela`), consulta incluída; formatos iguais aos da 1.3.0.
 * 1.4.1 (leitura dev-360-a-01 §Cuidados 1; decisão da autora de 01/11): o LEIAME passa a dizer que receita vazia = a página
 * como carrega no `endereco`, sem passo (julgar nela, `estadoAlcancado: "receita"`); até a 1.4.0 isso só ia no pedido ao juiz,
 * fora do artefato. Formatos do lote, do manifesto e das respostas iguais aos da 1.4.0.
 * 1.4.2 (lista única 3.7.2, C1–C2; juiz da passada A2 de 04/11): o LEIAME 1.3.0 ganha a regra registro × template na seção
 * `vinculo` (LEIAME_IDENTIDADE_REGISTRO) e a do cabeçalho de tabela vazio × WCAG 1.3.1 na seção `norma`
 * (LEIAME_CABECALHO_VAZIO); `--base-url` põe no LEIAME a origem da página congelada de fato servida (padrão
 * http://127.0.0.1:3300, texto igual); o esquema publicado aceita em `vinculo.spec` exatamente os ids dos defeitos das
 * referências do lote (enum, `esquemaDaPassada`; até a 1.4.1, `^[ABP]-\d{2}$`, que recusava os `U-xx` da A2), e a ingestão
 * 1.3.0 valida pelo mesmo conjunto. Corrige a 1.4.1, que tinha posto "receita vazia" também no LEIAME da 1.2.0: a
 * `--politica 1.2.0` volta a refazer as passadas 1.2.0 arquivadas byte a byte. Formatos do lote, do manifesto e das
 * respostas iguais; os bytes do lote mudam porque ele traz o sha256 do LEIAME e do esquema.
 */
export const E14_CAMPANHA_VERSAO = "nat78-primeira-passada-1.3.1";
/** [D-156] Versão da passada preparada na política 1.3.0 (referências secundárias). A 1.2.0 continua 1.3.1. */
export const E14_CAMPANHA_VERSAO_1_4 = "nat78-primeira-passada-1.4.2";
/** Política das campanhas novas (D-156). `--politica 1.2.0` reproduz o histórico. */
export const POLITICA_CAMPANHA_PADRAO: VersaoPolitica = "1.3.0";

/**
 * [D-156] Referências secundárias do achado do agente (`references`, findings.v1 + D-156), lidas do achado bruto que o
 * pacote guarda em `reportedEvidence.finding`: só textos não vazios, sem repetir a `rule` nem entre si, até 2. Cartão
 * da linha de base, achado sem o campo ou campo fora do formato → lista vazia (o cartão fica como sempre).
 */
export function referenciasDoAchado(card: Pick<Card, "origin" | "rule" | "reportedEvidence">): string[] {
  if (card.origin !== "agente") return [];
  const raw = (card.reportedEvidence as { finding?: { references?: unknown } } | null)?.finding?.references;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) if (typeof x === "string" && x.trim() && x.trim() !== card.rule?.trim() && !out.includes(x.trim())) out.push(x.trim());
  return out.slice(0, IDS_REFERENCIA.length);
}
export const FORMATO_RESIDUO = "nat78-residuo-de-braco-1.0.0";
/** Validador cuja `data/` é conferida contra o `dataSha256` da campanha (pode ser outro checkout: `--validador`). */
export const VALIDADOR_PADRAO = join(TCC, "govbr-ds-validator");
type Card = SemanticPackage["cards"][number];

/**
 * Máscara do trio. Até a 1.2.0: D-87 + NAT-73 + com × ferramentas + termos de ferramenta em todo o cartão. Na 1.3.0: a norma
 * (id, fonte, texto da regra, defeitos da referência) passa por `mascararNormaCega`; o texto livre da alegação, por
 * `mascararTextoCego` (painel/mascara.ts). `mascararTrio` = a do texto livre (a mais forte).
 */
export function mascararTrio(t: string | null): string | null { return mascararTextoCego(t); }
const profundo = <T>(v: T): T => (typeof v === "string" ? mascararNormaCega(v) : Array.isArray(v) ? v.map(profundo) : v && typeof v === "object"
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, profundo(x)])) : v) as T;
/** Texto livre da alegação (o que o autor escreveu): aqui também saem as menções a ferramenta. A norma não passa por aqui. */
function textoLivreCego(c: CartaoCego): CartaoCego {
  const a = c.alegacao, m = (x: string) => mascararTextoCego(x);
  return { ...c, alegacao: { ...a, observado: mascararTextoCego(a.observado), esperado: mascararTextoCego(a.esperado),
    estado: { ...a.estado, passos: a.estado.passos.map(m) }, sinais: a.sinais.map(m),
    evidencias: a.evidencias.map(e => ({ ...e, ref: m(e.ref) })), sujeitos: a.sujeitos.map(s => ({ ...s, rotulo: m(s.rotulo) })) } };
}

/** Braço do run pelo perfil do oráculo, dentro dos braços do desenho da campanha (`design.arms`); fora dele, para. */
export function bracoDoRun(r: SemanticPackage["runs"][number], bracos: readonly string[] = ["sem", "ferramentas", "com"]): string {
  if (r.kind !== "agente") return r.tool === "axe-core" ? "lb-axe" : "lb-validator";
  const p = (r.config as { oracleProfile?: string } | null)?.oracleProfile ?? "";
  const b = bracoDoPerfil(p, bracos);
  if (!b) throw new Error(`perfil de oráculo desconhecido no run ${r.id}: ${p} (braços do desenho: ${bracos.join(", ")})`);
  return b;
}

interface Passo { action: string; selector?: string; value?: string; path?: string; waitFor?: string }
interface Ref { _meta: { version: string; url?: string; waitFor?: string; setup?: Passo[] }; violations: { id: string; state: string; expectedCount?: number; rules: string[]; description: string }[] }
export interface PreparoCampanha { arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>; cegueira: Cegueira; falhasTrio: string[]; fontes: Record<string, string> }

/** `dataSha256` do oráculo fixado na campanha (campaign.v2: perfis com/ferramentas; v1: `fixed.oracle`). Um só, senão para. */
export function dataDoOraculo(camp: { fixed?: { oracle?: { dataSha256?: string }; oracleProfiles?: Record<string, { dataSha256?: string } | undefined> } }): string[] {
  const f = camp.fixed ?? {};
  return [...new Set([f.oracle?.dataSha256, ...Object.values(f.oracleProfiles ?? {}).map(o => o?.dataSha256)].filter((x): x is string => !!x))].sort();
}

/**
 * [1b, achado K3] A linha de base registra a receita como "setup do plano de estados (N passo(s))" (ou "… até ESTADO
 * (N passo(s))"): o juiz não sabe refazer isso. Aqui ela vira os passos da referência, legíveis: abrir o endereço da tela,
 * esperar o `waitFor`, e os N primeiros passos de `_meta.setup`. Os demais passos (escritos pelo autor do cartão) ficam.
 */
export function passosLegiveis(passos: string[], ref: Ref["_meta"]): string[] {
  const setup = ref.setup ?? [];
  const um = (p: Passo): string => {
    if (p.action === "click" && p.selector) return `clicar em \`${p.selector}\``;
    if (p.action === "wait" && p.selector) return `esperar \`${p.selector}\` aparecer`;
    if (p.action === "fill" && p.selector) return `preencher \`${p.selector}\` com "${p.value ?? ""}"`;
    if (p.action === "navigate") return `${p.selector ? `navegar clicando em \`${p.selector}\`` : `navegar para \`${p.path}\` (mesma página, sem recarregar)`}${p.waitFor ? ` e esperar \`${p.waitFor}\`` : ""}`;
    return JSON.stringify(p);
  };
  return passos.flatMap(s => {
    const m = /^setup do plano de estados(?: até (\S+))? \((\d+) passo\(s\)\)$/.exec(s);
    if (!m) return [s];
    const n = Number(m[2]);
    if (n > setup.length) throw new Error(`receita "${s}" pede ${n} passos; a referência tem ${setup.length}`);
    return [`abrir o endereço da tela${ref.waitFor ? ` e esperar \`${ref.waitFor}\`` : ""}`, ...setup.slice(0, n).map(um)];
  });
}

/**
 * [D-154] Endereço da tela para o juiz: a entrada que a referência mediu (`_meta.url`, com a consulta), a mesma que os runs
 * abriram. O `capture.json` da análise guarda só o pathname; ele confere o caminho e só vale sozinho quando a referência não
 * declara `url`. Caminhos diferentes param.
 */
export function enderecoDaTela(meta: { url?: string }, urlDaCaptura: string): string {
  if (!meta.url) return urlDaCaptura;
  const caminho = (u: string) => new URL(u, "http://x").pathname;
  if (caminho(meta.url) !== caminho(urlDaCaptura)) throw new Error(`E14 campanha: _meta.url da referência (${meta.url}) e capture.json (${urlDaCaptura}) apontam caminhos diferentes`);
  return meta.url;
}

export function prepararCampanha(analises: string[], o: { validador?: string; checkerAliases?: string; politica?: VersaoPolitica; baseUrl?: string } = {}): PreparoCampanha {
  const politica = o.politica ?? POLITICA_CAMPANHA_PADRAO, v13 = politica === "1.3.0";
  // [1.4.2] --base-url só na 1.3.0: a 1.2.0 refaz o histórico, com o endereço de sempre.
  if (o.baseUrl !== undefined && !v13) throw new Error("--base-url só na política 1.3.0 (a 1.2.0 refaz o histórico byte a byte)");
  const baseUrl = o.baseUrl === undefined ? BASE_URL_PADRAO : baseUrlValida(o.baseUrl);
  const datas = [...new Set(analises.flatMap(d => dataDoOraculo(lerJson(join(d, "entradas", "campanha.json")))))];
  if (datas.length !== 1) throw new Error(`E14 campanha: esperado 1 dataSha256 de oráculo nas campanhas das análises, achei ${datas.length} (${datas.map(x => x.slice(0, 12)).join(", ")})`);
  const nr = normasDaCampanha({ dataSha256: datas[0], validador: resolve(o.validador ?? VALIDADOR_PADRAO), checkerAliases: o.checkerAliases });
  const itens: { item: ItemChave; card: Card; cartao: CartaoCego }[] = [];
  const telas: Record<string, { nome: string; versao: string; endereco: string; defeitos: unknown[] }> = {};
  const fontes: Record<string, string> = { ...nr.fontes };
  let desenho: { arms: string[]; comparisons: { id: string; arms: string[]; role?: string }[] } | null = null;
  let idsDeAchado = 0;
  // Rótulo da análise na chave: o nome da pasta, como sempre; se duas análises têm o mesmo nome (os trios de uma
  // campanha saem todos `analisar-<carimbo>`), entra a pasta do trio. Sem isso, os cartões da linha de base, iguais
  // nos três trios, colidiam no mesmo id opaco (dev-350-a-01, 2026-10-30). Nomes únicos: byte a byte como antes.
  const nomesRepetidos = new Set(analises.map(d => basename(d)).filter((n, i, a) => a.indexOf(n) !== i));
  const rotuloDe = (dir: string) => nomesRepetidos.has(basename(dir)) ? `${basename(dirname(dir))}/${basename(dir)}` : basename(dir);
  const rotulos = analises.map(rotuloDe);
  if (new Set(rotulos).size !== rotulos.length) throw new Error(`E14 campanha: análises com o mesmo rótulo (${rotulos.join(", ")})`);
  for (const dir of analises) {
    const pkg = lerJson<SemanticPackage>(join(dir, "revisao", "package.json"));
    const camp = lerJson<{ campaignId: string; design: { screens: { id: string; label: string }[]; arms?: string[]; comparisons?: { id: string; arms: string[]; role?: string }[] } }>(join(dir, "entradas", "campanha.json"));
    // [F] Braços pelo desenho da campanha (campaign.v2 `design.arms`; sem ele, o par histórico sem/com).
    const arms = camp.design.arms ?? ["sem", "com"];
    if (desenho && desenho.arms.join() !== arms.join()) throw new Error(`E14 campanha: análises com desenhos de braço diferentes (${desenho.arms.join(", ")} × ${arms.join(", ")})`);
    desenho ??= { arms, comparisons: camp.design.comparisons ?? [] };
    const ref = lerJson<Ref>(join(dir, "entradas", "referencia.json"));
    const resumo = lerJson<{ execucoes: { identidade: { tela: { id: string; label: string } } }[] }>(join(dir, "summary.json"));
    const { id: telaId, label } = resumo.execucoes[0].identidade.tela;
    const nome = `Tela ${label}`;
    const specs = ref.violations.map(v => ({ id: v.id, estado: v.state, unidades: v.expectedCount ?? 1, descricao: mascararNormaCega(v.description),
      normas: v.rules.map(nr.resolver).filter(Boolean) }));
    const endereco = enderecoDaTela(ref._meta, lerJson<{ url: string }>(join(dir, "revisao", "capture.json")).url);
    const refAbs = join(dir, "entradas", "referencia.json");
    fontes[`${rotuloDe(dir)}/entradas/referencia.json`] = sha(readFileSync(refAbs));
    telas[telaId] ??= { nome, versao: ref._meta.version, endereco, defeitos: specs };
    const specDe = new Map(pkg.units.map(u => [u.id, u.specId]));
    const runDe = new Map(pkg.runs.flatMap(r => r.cardIds.map(id => [id, r] as const)));
    for (const card of pkg.cards) {
      const run = runDe.get(card.id);
      if (!run) throw new Error(`cartão sem run: ${card.id}`);
      const chave = `${camp.campaignId}|${rotuloDe(dir)}|${card.id}`;
      const item: ItemChave = { id: idOpaco(chave), hash: hashDaChave(chave), chave, campanha: camp.campaignId, tela: telaId as "A", par: rotuloDe(dir),
        braco: bracoDoRun(run, arms), runId: run.id, cardIdOriginal: card.id, atomoId: "cartao", cardSha256: sha(JSON.stringify(card)), mId: null,
        tipo: "sensivel", motivoFila: "primeira passada cega (§8.1)", decisaoAntiga: "", unidadesAntigas: "", origemMedida341: null, origemMedida370: null, lote: null };
      const atomo = { sujeitos: card.subjects.map(s => s.key ?? s.id), candidatasSpecs: [...new Set(card.candidateUnitIds.map(u => specDe.get(u)!))].sort() };
      const ex = { ...item, linha: {}, atomo } as unknown as Extracao["itens"][number];
      // [B] Id de achado da ferramenta de varredura (`FAM-…`) sai da lista de evidências, como os ids de sessão (só o
      // `ferramentas` os deixava visíveis: os do `com` já saíam pelo padrão S-/F-/V-).
      const semAchado = (card.evidence ?? []).filter(e => !ID_DE_ACHADO.test(e.ref));
      idsDeAchado += (card.evidence ?? []).length - semAchado.length;
      const cego = cartaoCego(ex, { ...card, evidence: semAchado } as never, nr.resolver, [], specs.map(s => s.id));
      cego.alegacao.estado.passos = passosLegiveis(cego.alegacao.estado.passos, ref._meta).map(s => mascarar(s)!);
      // [D-156] Referências secundárias (só na 1.3.0 e só se o achado as traz): REF1/REF2, com o texto da norma.
      const refs = v13 ? referenciasDoAchado(card) : [];
      if (refs.length) {
        cego.referencias = refs.map((r, k) => ({ id: IDS_REFERENCIA[k], regra: mascarar(r), norma: nr.resolver(r) }));
        cego.citaveis = [...cego.citaveis, ...cego.referencias.map(x => x.id)];
      }
      const c = textoLivreCego(profundo(cego));
      c.telaNome = nome; c.citaveis = [...c.citaveis, "MEDIDA"];
      itens.push({ item, card, cartao: c });
    }
  }
  const repetidos = itens.map(x => x.item.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (repetidos.length) throw new Error(`E14 campanha: id opaco repetido (${[...new Set(repetidos)].join(", ")})`);
  const ord = ordenar(itens, x => x.item.hash);
  const lotes: { lote: string; ids: string[] }[] = [];
  let i = 0;
  tamanhosDosLotes(ord.length).forEach((t, k) => { lotes.push({ lote: nomeLote(k), ids: ord.slice(i, i + t).map(x => x.item.id) }); i += t; });
  for (const l of lotes) for (const id of l.ids) ord.find(x => x.item.id === id)!.item.lote = l.lote;
  const nomes = Object.values(telas).map(t => t.nome).join(", ");
  const leiame = v13 ? leiameCampanha13(ord.length, lotes.length, nomes, baseUrl) : leiameCampanha(ord.length, lotes.length, nomes);
  // [1.4.2] Na 1.3.0, `vinculo.spec` = os ids dos defeitos das telas da passada (os mesmos que os lotes publicam em
  // `referencias`); a 1.2.0 publica o esquema histórico, byte a byte.
  const esquema = jsonTexto(v13 ? esquemaDaPassada(ESQUEMA_RESPOSTAS_CAMPANHA_1_3, Object.values(telas).flatMap(t => (t.defeitos as { id: string }[]).map(d => d.id)))
    : ESQUEMA_RESPOSTAS_CAMPANHA);
  const rotulo = v13 ? rotuloPolitica(politica) : POLITICA_PRINCIPAL, versao = v13 ? E14_CAMPANHA_VERSAO_1_4 : E14_CAMPANHA_VERSAO;
  const juiz = new Map<string, string>([["lotes/LEIAME-juiz.md", leiame], ["lotes/esquema-respostas.schema.json", esquema]]);
  for (const l of lotes) {
    const cs = l.ids.map(id => ord.find(x => x.item.id === id)!.cartao);
    juiz.set(`lotes/${l.lote}.json`, jsonTexto({ formato: FORMATO_LOTE, lote: l.lote, politica: rotulo,
      instrucoes: { arquivo: "LEIAME-juiz.md", sha256: sha(leiame) }, esquema: { arquivo: "esquema-respostas.schema.json", sha256: sha(esquema) },
      respostaEm: `../respostas/${l.lote}.json`, n: cs.length,
      referencias: Object.fromEntries([...new Set(cs.map(c => c.tela))].map(t => [t, telas[t]])), cartoes: cs }));
  }
  const cegueira = verificarCegueira({ arquivos: [...juiz].map(([rel, texto]) => ({ rel, texto })),
    cartoes: ord.map(x => ({ cartao: x.cartao, card: x.card as never, item: x.item, justificativas: [] })), bracos: desenho?.arms });
  // "Rawline" fica de propósito (informação de julgamento: a fonte que o juiz mede) e é contado no resíduo, não é falha.
  const falhasTrio = ord.filter(x => distingueComDeFerramentas(JSON.stringify(x.cartao).replace(/\bRawline\b/gi, ""))).map(x => `${x.item.id}: texto ainda separa com de ferramentas`);
  const residuo = ord.map(x => residuoDeBraco(x.cartao, x.item.braco));
  // Relato até a 1.2.0 (`sinais` de verificarCegueira, inalterado), ao lado, para comparar passadas.
  const relato12: Record<string, { cartoes: number; comSinal: number }> = {};
  ord.forEach((x, k) => { const b = (relato12[x.item.braco] ??= { cartoes: 0, comSinal: 0 }); b.cartoes++; if (cegueira.porCartao[k].sinais.length) b.comSinal++; });
  const porBraco = residuoPorBraco(ord.map(x => x.item.braco), residuo);
  const residuoTxt = jsonTexto(residuoDaPassada(desenho ?? { arms: ["sem", "com"], comparisons: [] }, ord.map(x => x.item), residuo, porBraco, idsDeAchado, versao));
  const chaveTxt = jsonTexto({ formato: "nat78-primeira-passada-chave-1.0.0", aviso: "NÃO entregar aos juízes: liga o id opaco ao braço, ao run e ao cartão",
    versao, total: ord.length, porBraco, itens: ord.map(x => x.item) });
  const internos = new Map<string, string>([["chave/fila-t3-chave.json", chaveTxt],
    ["cegueira.json", jsonTexto({ resultado: cegueira.falhas.length || falhasTrio.length ? "FALHOU" : "OK", falhas: cegueira.falhas, falhasTrio,
      porBraco, relato12: { nota: "sinais de verificarCegueira (relato até a 1.2.0), para comparar com passadas anteriores", porBraco: relato12 },
      residuo: { arquivo: "residuo-de-braco.json", sha256: sha(residuoTxt) }, porCartao: cegueira.porCartao })],
    ["residuo-de-braco.json", residuoTxt],
    ["lotes/manifesto.json", jsonTexto({ formato: v13 ? FORMATO_MANIFESTO_CAMPANHA_1_3 : FORMATO_MANIFESTO_CAMPANHA, versao, politica: rotulo, total: ord.length,
      ...(v13 ? { cartoesComReferencias: ord.filter(x => x.cartao.referencias?.length).length } : {}),
      respostas: { pasta: "respostas/", formato: v13 ? FORMATO_RESPOSTAS_CAMPANHA_1_3 : FORMATO_RESPOSTAS_CAMPANHA, nota: "pasta da passada, ao lado de lotes/ (nunca lotes/respostas/)" },
      analises: analises.map(d => ({ dir: rotuloDe(d), packageSha256: sha(readFileSync(join(d, "revisao", "package.json"))) })),
      arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
      lotes: lotes.map(l => ({ lote: l.lote, n: l.ids.length, sha256: sha(juiz.get(`lotes/${l.lote}.json`)!), ids: l.ids })), chaveSha256: sha(chaveTxt), residuoSha256: sha(residuoTxt), fontes })]]);
  return { arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, falhasTrio, fontes };
}

type PorBraco = Record<string, { cartoes: number; comSinal: number; porCategoria: Record<string, number> }>;
/** Cartões com resíduo, por braço e por categoria (todas as categorias aparecem, com 0). */
export function residuoPorBraco(bracos: string[], r: ResiduoDoCartao[]): PorBraco {
  const out: PorBraco = {};
  bracos.forEach((b, k) => {
    const x = (out[b] ??= { cartoes: 0, comSinal: 0, porCategoria: Object.fromEntries(Object.keys(CATEGORIAS_RESIDUO).map(c => [c, 0])) });
    x.cartoes++; if (r[k].categorias.length) x.comSinal++;
    for (const c of r[k].categorias) x.porCategoria[c]++;
  });
  return out;
}

/**
 * [B] Resíduo de braço da passada (insumo do S4'): o que, depois da máscara, ainda pode dizer ao juiz de que braço veio o
 * cartão. Nada é descartado: cada cartão com a sua lista de categorias, as contagens por braço e, por comparação do desenho,
 * as categorias em que os dois braços diferem. Arquivo interno (liga o id opaco ao braço): nunca vai ao juiz.
 */
export function residuoDaPassada(desenho: { arms: string[]; comparisons: { id: string; arms: string[]; role?: string }[] }, itens: ItemChave[],
  r: ResiduoDoCartao[], porBraco: PorBraco, idsDeAchado: number, versao = E14_CAMPANHA_VERSAO): Record<string, unknown> {
  const porComparacao = desenho.comparisons.map(c => {
    const [a, b] = c.arms, pa = porBraco[a], pb = porBraco[b];
    const cats = Object.keys(CATEGORIAS_RESIDUO).filter(k => (pa?.porCategoria[k] ?? 0) !== (pb?.porCategoria[k] ?? 0));
    return { id: c.id, papel: c.role ?? null, bracos: c.arms,
      comSinal: { [a]: `${pa?.comSinal ?? 0}/${pa?.cartoes ?? 0}`, [b]: `${pb?.comSinal ?? 0}/${pb?.cartoes ?? 0}` },
      categoriasQueDiferem: Object.fromEntries(cats.map(k => [k, { [a]: pa?.porCategoria[k] ?? 0, [b]: pb?.porCategoria[k] ?? 0 }])) };
  });
  return { formato: FORMATO_RESIDUO, versao, aviso: "NÃO entregar aos juízes: liga o id opaco ao braço",
    nota: "Resíduo de braço depois da máscara, medido no que o juiz vê (o cartão cego do lote). Categoria com fica=true é informação de julgamento (mascará-la tiraria do juiz o que ele precisa para julgar o fato ou a norma) e fica visível de propósito; as demais são falha de máscara e devem ser 0. Insumo do S4' (sensibilidade sem os cartões com resíduo).",
    bracosDoDesenho: desenho.arms, categorias: CATEGORIAS_RESIDUO, retirados: { idsDeAchadoDasEvidencias: idsDeAchado },
    porBraco, porComparacao, porCartao: itens.map((it, k) => ({ id: it.id, braco: it.braco, categorias: r[k].categorias, detalhe: r[k].detalhe })) };
}

/** Troca exata: o trecho tem de existir uma vez no LEIAME histórico (senão o texto mudou e a troca falharia calada). */
function trocar(t: string, de: string | RegExp, para: string): string {
  const n = typeof de === "string" ? t.split(de).length - 1 : (t.match(new RegExp(de.source, de.flags.includes("g") ? de.flags : de.flags + "g")) ?? []).length;
  if (n !== 1) throw new Error(`LEIAME da campanha: trecho achado ${n} vez(es): ${String(de).slice(0, 80)}`);
  return t.replace(de, para);
}

/**
 * LEIAME do juiz da primeira passada (1.2.0): o histórico (`leiameJuiz`, que não muda) com as trocas da campanha nova —
 * página congelada medida (D-138), caminho único de respostas (I), norma neutra para `id: "nenhuma"` (K1), `norma.forca`
 * explícito (K2), receitas (K3) e o que não abrir (K4).
 */
export function leiameCampanha(total: number, nLotes: number, nomes: string): string {
  let t = leiameJuiz(total, nLotes);
  t = trocar(t, "# Fila T3 — instruções do juiz", "# Primeira passada cega — instruções do juiz");
  t = trocar(t, "(Tela A · Solicitar serviço, ou Tela B · Vistorias)", `(${nomes})`);
  t = trocar(t, /\*\*Use só o lote\.\*\*[^]*?quem o escreveu: isso não entra no julgamento\./, LEIAME_MEDIDA);
  t = trocar(t, "`estado` (tamanho da janela e passos até o estado)",
    "`estado` (tamanho da janela e passos até o estado: a receita escrita pelo autor do cartão, ou os passos da referência da tela quando o cartão veio da linha de base; refaça-a na página congelada e responda `estadoAlcancado`, em \"Em todo cartão\")");
  t = trocar(t, "  coubesse melhor (R11, R15). Se o cartão não cita regra (`regra: null`): a norma pública que a alegação implica\n  (`wcag:x.y.z` ou `emag:x.y`), ou `\"nenhuma\"` se ela não implica norma.",
    "  coubesse melhor (R11, R15). Se o cartão não cita regra (`regra: null`): a norma pública que a alegação implica\n  (`wcag:x.y.z` ou `emag:x.y`), ou `\"nenhuma\"` se ela não implica norma. **Com `id: \"nenhuma\"`** a norma inteira é\n  `{ \"id\": \"nenhuma\", \"forca\": \"nenhuma\", \"aplicabilidade\": \"" + NAO_PERGUNTADO + "\", \"violada\": \"" + NAO_PERGUNTADO + "\" }`: não há norma a\n  aplicar, e a ingestão recusa outro valor nesses dois campos (e recusa `" + NAO_PERGUNTADO + "` neles com qualquer outro `id`).");
  t = trocar(t, "| fato `indeterminado`, ou força `indeterminado` | pendente |",
    "| fato `indeterminado`, ou `norma.forca` = `indeterminado` (o campo `forca` dentro de `norma`; o `forcaDoVeredito` não entra nesta tabela) | pendente |");
  t = trocar(t, "| fato `verdadeira` + norma `nenhuma` (cartão sem regra citada) + vínculo a um defeito |",
    "| fato `verdadeira` + norma `nenhuma` (cartão sem regra citada; `aplicabilidade`/`violada` = `" + NAO_PERGUNTADO + "`) + vínculo a um defeito |");
  t = trocar(t, "| fato `verdadeira` + aplicabilidade `incerta` ou violada `incerto` |", "| fato `verdadeira` + norma com `id` ≠ `nenhuma` + aplicabilidade `incerta` ou violada `incerto` |");
  t = trocar(t, "| fato `verdadeira` + `nao-aplica` ou violada `nao` |", "| fato `verdadeira` + norma com `id` ≠ `nenhuma` + `nao-aplica` ou violada `nao` |");
  t = trocar(t, "  `incerto`.\n- `evidencias`:", "  `incerto`. Diz como você decidiu; não muda a classe.\n- `evidencias`:");
  t = trocar(t, "Grave `respostas/lote-NN.json` (o caminho está em `respostaEm` no lote) com exatamente um registro por cartão do lote,",
    "Grave `respostas/lote-NN.json` **na pasta da passada**: a pasta `respostas/` fica ao lado de `lotes/`, nunca dentro dela\n(`respostaEm` no lote dá o caminho relativo ao próprio lote: `../respostas/lote-NN.json`; a ingestão recusa arquivos em\n`lotes/respostas/`). Exatamente um registro por cartão do lote,");
  t = trocar(t, `"formato": "${FORMATO_RESPOSTAS}"`, `"formato": "${FORMATO_RESPOSTAS_CAMPANHA}"`);
  // ── 1.2.0 (achados M e N)
  t = trocar(t, "(estado que a receita não alcança, elemento ausente,\n  medida impossível) (R9, R10).",
    "(estado que a receita não alcança — `estadoAlcancado: \"nao-alcancado\"` —, elemento ausente,\n  medida impossível) (R9, R10).");
  t = trocar(t, "`nenhuma` (só com `id: \"nenhuma\"`) ·\n  `indeterminado`.",
    "`nenhuma` (com `id: \"nenhuma\"`; ou com regra citada quando **toda** regra da base que ela traz tem\n  `forcaNoVocabulario: \"nenhuma\"`) · `indeterminado`.");
  t = trocar(t, "não para o que o DS entrega (R4).\n", `não para o que o DS entrega (R4).\n${LEIAME_FORCAS}\n`);
  t = trocar(t, "### Em todo cartão\n", `### Em todo cartão\n${LEIAME_ESTADO}\n`);
  t = trocar(t, "| fato `indisponivel` | evidência indisponível (pendente, R9) |",
    "| fato `indisponivel` (também o que `estadoAlcancado: \"nao-alcancado\"` exige) | evidência indisponível (pendente, R9/R10) |");
  t = trocar(t, "| fato `verdadeira` + norma `nenhuma` sem vínculo | observação (R11b) |",
    "| fato `verdadeira` + norma `nenhuma` sem vínculo | observação (R11b) |\n| fato `verdadeira` + regra citada com `forca: \"nenhuma\"` (a base só permite; `aplicabilidade`/`violada` = `" + NAO_PERGUNTADO + "`), com ou sem vínculo | erro normativo (R11a); com sugestão `valida`: observação com norma errada (R11d) |");
  t = trocar(t, "\"forcaDoVeredito\": \"inferido\",\n", "\"forcaDoVeredito\": \"inferido\",\n      \"estadoAlcancado\": \"receita\",\n");
  return t;
}

/**
 * [D-156] LEIAME da política 1.3.0: o da 1.2.0 (`leiameCampanha`, que não muda) com o título, o formato das respostas,
 * a seção das referências secundárias e as linhas da tabela de classes. Só procedimento de julgamento: nenhuma regra.
 */
export function leiameCampanha13(total: number, nLotes: number, nomes: string, baseUrl = BASE_URL_PADRAO): string {
  const NL = "\n";
  let t = leiameCampanha(total, nLotes, nomes);
  // [1.4.2] Endereço da página congelada (--base-url); com o padrão, nada muda.
  if (baseUrl !== BASE_URL_PADRAO) t = trocar(t, "`" + BASE_URL_PADRAO + "`", "`" + baseUrlValida(baseUrl) + "`");
  // [1.4.2, C2] Cabeçalho vazio × WCAG 1.3.1, logo depois do vocabulário de `violada`.
  t = trocar(t, "- `violada`: `sim` · `nao` · `incerto`." + NL, "- `violada`: `sim` · `nao` · `incerto`." + NL + LEIAME_CABECALHO_VAZIO + NL);
  // [1.4.2, C1] Registro × template, no fim da seção `vinculo`.
  t = trocar(t, "- Nunca pelo id da regra nem por semelhança de texto (R7): só pelo fato." + NL,
    "- Nunca pelo id da regra nem por semelhança de texto (R7): só pelo fato." + NL + LEIAME_IDENTIDADE_REGISTRO + NL);
  t = t.split("política normativa 1.2.0").join("política normativa 1.3.0");
  t = t.split("política 1.2.0").join("política 1.3.0");
  t = trocar(t, `"formato": "${FORMATO_RESPOSTAS_CAMPANHA}"`, `"formato": "${FORMATO_RESPOSTAS_CAMPANHA_1_3}"`);
  t = trocar(t, "- `perguntas`: o que responder neste cartão (abaixo).", [
    "- `referencias` (ids `REF1`, `REF2`, só em alguns cartões): outras normas que o autor do cartão citou para o mesmo fato,",
    "  além da `regra` (que continua a principal). Cada uma traz `regra` e `norma` (o texto, como em `normaCitada`).",
    "- `perguntas`: o que responder neste cartão (abaixo)."].join(NL));
  t = trocar(t, "### Em todo cartão" + NL, LEIAME_REFERENCIAS + NL + NL + "### Em todo cartão" + NL);
  t = trocar(t, LEIAME_ESTADO + NL, LEIAME_ESTADO + NL + LEIAME_RECEITA_VAZIA + NL);
  const r15 = "| fato `verdadeira` + norma mais fraca (`recomendado`, `boa-pratica`, `exemplo`) + `aplica` + `sim` | com vínculo: credita a detecção do defeito, sem crédito de fundamentação (R15); sem vínculo: erro normativo (R13) |";
  t = trocar(t, r15, [r15,
    "| (só cartão com `referencias`) fato `verdadeira` + as respostas da `norma` dão erro normativo + uma referência, na ordem `REF1`, `REF2`, julgada como se fosse a citada, dá violação | a classe dessa violação, como se a referência fosse a norma citada; a citação fica registrada como vinda da referência (R16) |",
    "| (só cartão com `referencias`) fato `falsa`, `indisponivel` ou `indeterminado` | as referências não mudam nada: a classe é a do fato (R16) |"].join(NL));
  return t;
}

/**
 * [1.4.2, lista única 3.7.2 C1] Registro × template, na seção `vinculo`: a regra congelada em
 * govbr-resultados/analises/dev-366-b-01/revisao-b23-20261104T1/regra-identidade-registro.md (§ 2, itens 1–6, e § 3),
 * reescrita para o juiz. Neutra quanto à origem do cartão. Não cria crédito: torna explícito o "mesmo sujeito, mesmo
 * estado, mesma evidência" que a pergunta já pede.
 */
export const LEIAME_IDENTIDADE_REGISTRO = [
  "- **Registro × template.** Uma rota de registro é uma rota cujo caminho termina no identificador de um registro de",
  "  dados (um número ou um código, ex.: `…/detalhe/<id>`); o **registro** é esse identificador. Duas paradas na mesma",
  "  rota com identificadores diferentes são registros diferentes, mesmo com o mesmo componente e o mesmo template.",
  "  Refaça a receita e meça a que rota e a que registro ela chega. Então:",
  "  1. O vínculo a um defeito exige o observável do defeito (o elemento, o conteúdo que o identifica — texto, valor,",
  "     indicador — e a medida que o defeito descreve) **no sujeito e no estado a que a receita chega**, medidos por você",
  "     na página congelada, nunca supostos pelo texto do cartão. Fato verdadeiro em outro sujeito ou em outro estado não",
  "     vincula o defeito.",
  "  2. Outro registro só representa o mesmo defeito se o lote trouxer a prova: o texto do defeito em `referencias`",
  "     declara a unidade de template, quais registros ela cobre e o que tem de ser igual para contar como o mesmo",
  "     defeito. A sua leitura e a semelhança de texto ou de regra não provam essa identidade.",
  "  3. Reaproveitar o template, sozinho, não atravessa registros: mesmo componente, mesma rota com outro identificador,",
  "     mesmo seletor, mesmas classes ou mesmas cores não bastam. Defeito que descreve conteúdo de um registro (texto,",
  "     valor, indicador, situação de um dado) fica preso ao registro em que a referência o mediu, salvo o item 2.",
  "  4. Receita que chega a uma rota não vincula o que o cartão alega em outra: se os sujeitos ou o `observado` cobrem",
  "     mais de uma rota, só a parte da rota a que a receita chega pode ter vínculo.",
  "  5. Sem identidade provada, o fato verdadeiro continua verdadeiro: `vinculo` fica sem aquele defeito (`\"nenhum\"`, ou",
  "     outro defeito que o fato satisfaça por estas mesmas regras), nunca `verdadeFactual: \"falsa\"`. Com a identidade",
  "     provada, o vínculo vale como o de qualquer outro cartão.",
  "  6. O critério é o mesmo para todo cartão, qualquer que seja a origem do cartão: decidido cartão a cartão, sem saber",
  "     de onde ele veio, e nunca pelo efeito no total.",
  "  Valem para os defeitos da referência cujo estado é uma parada em rota de registro e para todo cartão que tenha um",
  "  deles em `candidatas`, que o vincularia, ou cujo `observado` descreve conteúdo de rota de registro. Ficam fora os",
  "  componentes da casca da aplicação (cabeçalho, menu do avatar) que persistem entre rotas: não pertencem ao template",
  "  do registro.",
].join("\n");

/**
 * [1.4.2, lista única 3.7.2 C2] Cabeçalho de tabela vazio × WCAG 1.3.1, na seção `norma`. Regra geral de aplicabilidade
 * (o lote-13 da dev-371-b-01 negou a violação que os lotes 01, 03 e 11 aceitaram sobre o mesmo `th`); nenhuma spec citada.
 */
export const LEIAME_CABECALHO_VAZIO = [
  "- **Cabeçalho de tabela vazio.** Um cabeçalho (`th`) sem texto e sem nome acessível, numa coluna (ou linha) que tem",
  "  células de dados com conteúdo, deixa essas células sem o cabeçalho que as relaciona: é falha da WCAG 1.3.1",
  "  (informações e relações), que é obrigatória. Com a WCAG 1.3.1 citada, ou implicada num cartão sem regra, responda",
  "  `aplica` e violada `sim`, mesmo que a regra do axe-core que aponta o cabeçalho vazio seja só `best-practice`; a",
  "  referência da tela pode descrever esse defeito pela WCAG 1.3.1. Se nenhuma célula de dados daquela coluna (ou",
  "  linha) tem conteúdo, não há relação a transmitir: `nao-aplica`. O cartão que cita só a regra do axe-core continua",
  "  com a força dela (`boa-pratica`).",
].join("\n");

/** [1.4.2] Endereço da página congelada no LEIAME (`--base-url`); o padrão é o de sempre. */
export const BASE_URL_PADRAO = "http://127.0.0.1:3300";
/** Origem http(s) sem caminho, consulta nem fragmento; sem barra final. Fora disso, para. */
export function baseUrlValida(u: string): string {
  let x: URL;
  try { x = new URL(u); } catch { throw new Error(`--base-url inválida: ${u}`); }
  if (!/^https?:$/.test(x.protocol) || (x.pathname !== "/" && x.pathname !== "") || x.search || x.hash || x.username || x.password)
    throw new Error(`--base-url tem de ser só a origem http(s) da página congelada (ex.: ${BASE_URL_PADRAO}): ${u}`);
  return x.origin;
}

/** [D-156] Seção das referências secundárias no LEIAME 1.3.0. */
const LEIAME_REFERENCIAS = [
  "### `referencias` → campo `referencias` (só em cartão com `referencias`)",
  "\"As outras normas que o cartão cita são obrigatórias, aplicam-se ao fato e foram violadas?\" A `norma` continua a julgar",
  "**só** a regra principal (`regra`), como sempre. As referências entram só quando a principal cai por citação (R16).",
  "- Quando o fato é `verdadeira` e as suas respostas da `norma` dão erro normativo (não se aplica, não violada, mais fraca",
  "  sem vínculo, ou só permite), `referencias` é **obrigatório**: uma lista com um item por referência do cartão,",
  "  `{ \"id\": \"REF1\", \"forca\": …, \"aplicabilidade\": …, \"violada\": … }`, com o mesmo vocabulário e as mesmas regras de",
  "  `norma` (`forca: \"nenhuma\"` só quando a referência só permite, e então `aplicabilidade`/`violada` = `" + NAO_PERGUNTADO + "`).",
  "- Nos outros casos use `\"" + NAO_PERGUNTADO + "\"` (ou julgue, se quiser registrar: não muda a classe). Em cartão sem `referencias`",
  "  o campo não existe: não o escreva.",
  "- Uma referência nunca muda o fato: com fato `falsa`, `indisponivel` ou `indeterminado` ela não é usada.",
].join("\n");

/** [M] Tabela fixa das forças da base literal, impressa a partir de TABELA_FORCAS (e14-fila.ts). */
const LEIAME_FORCAS = [
  "- **Força declarada da base do DS → `forca`.** Cada regra da base em `normaCitada.regrasDaBase` (e nas normas dos",
  "  defeitos) traz `forcaDeclarada` (a palavra da própria base) e `forcaNoVocabulario` (a mesma força já posta nesta lista,",
  "  por uma tabela fixa, feita antes de qualquer julgamento e só pelas palavras da base). Use `forcaNoVocabulario` como",
  "  `forca` da regra; com várias regras, a força da norma citada é a da regra que trata o fato. `null` = a base não dá",
  "  correspondência: decida pela leitura do texto (ou `indeterminado`). Com `nenhuma` a regra **permite**, não obriga:",
  "  responda `forca: \"nenhuma\"` com `aplicabilidade`/`violada` = `" + NAO_PERGUNTADO + "` (não há obrigação a aplicar).",
  "  Se o cartão cita essa regra como violada, ele alega uma obrigação que não existe: erro normativo (R11a), e a",
  "  `sugestao` passa a ser obrigatória (com sugestão `valida`: observação com norma errada, R11d).",
  "",
  "  | `forcaDeclarada` (base) | `forcaNoVocabulario` |",
  "  |---|---|",
  ...TABELA_FORCAS.map(f => `  | ${f.rotulo} | ${f.vocabulario === null ? "`null` (sem correspondência)" : `\`${f.vocabulario}\``} |`),
].join("\n");

/** [N] Estado alcançado: resposta fechada, não só a justificativa. */
const LEIAME_ESTADO = [
  "- `estadoAlcancado` (sempre): refaça a receita do `estado` e julgue **só no estado a que ela chega** (R10). `receita` =",
  "  ela chega ao estado que o cartão descreve (o que o `observado` pressupõe: diálogo aberto, calendário aberto, foco em",
  "  tal campo…). `nao-alcancado` = ela não chega a esse estado: então `verdadeFactual` = `indisponivel` (evidência",
  "  indisponível, R9/R10), mesmo que, com outros passos, você veja o fato. O que viu noutro estado pode ir à",
  "  `justificativa`, mas nunca muda a resposta.",
].join("\n");

/**
 * [1.4.1] Receita vazia. Só no LEIAME da política 1.3.0: a 1.4.1 a pôs em LEIAME_ESTADO, que a 1.2.0 também usa, e com isso
 * `--politica 1.2.0` deixou de refazer o LEIAME histórico byte a byte (as 22 passadas 1.2.0 arquivadas não têm o trecho).
 * Corrigido na 1.4.2: a 1.2.0 volta a ser a histórica; a 1.3.0 fica com o trecho, no mesmo lugar.
 */
const LEIAME_RECEITA_VAZIA = [
  "- **Receita vazia** (lista de passos vazia): o estado é a página tal como carrega no `endereco`, janela 1280×900, sem",
  "  nenhum passo. Julgue nela e responda `estadoAlcancado: \"receita\"`; receita vazia nunca é `nao-alcancado`.",
].join("\n");

const LEIAME_MEDIDA = `**Use o lote e a página congelada.** O lote traz o texto do cartão, a norma citada e os defeitos da referência da tela.
O fato alegado se confere **medindo a página congelada** servida em \`http://127.0.0.1:3300\` + o \`endereco\` da tela (seção
\`referencias\` do lote), com Playwright headless e janela 1280×900, refazendo os passos do \`estado\`. Cite a medida com o id
\`MEDIDA\` e use \`forcaDoVeredito: "medido"\` só quando a medida decidiu. Abra só este LEIAME, o seu \`lote-NN.json\` e o
\`esquema-respostas.schema.json\`. **Não abra \`lotes/manifesto.json\`**: é da ingestão (somas de conferência), não do
julgamento, e nada nele ajuda a julgar. Não abra nenhum outro arquivo nem outra página e não tente descobrir de onde o
cartão veio nem quem o escreveu: isso não entra no julgamento.`;

if (process.argv[1] && /(?:^|[\\/])e14-campanha\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => a[a.indexOf(k) + 1];
  if (a.includes("--servir")) {
    const { createSiteServer, loadSite } = await import("../measurement-surface");
    const porta = Number(a.includes("--porta") ? val("--porta") : 3300);
    createSiteServer(loadSite(val("--servir"))).listen(porta, "127.0.0.1", () => console.log(`site congelado em http://127.0.0.1:${porta}/`));
  } else {
    const analises = a.flatMap((x, k) => (x === "--analise" ? [a[k + 1]] : [])), saida = val("--saida");
    if (!analises.length || !a.includes("--saida")) { console.error("Uso: --analise DIR [--analise DIR ...] --saida PASTA_NOVA [--validador DIR] [--politica 1.3.0|1.2.0] [--base-url http://127.0.0.1:PORTA] | --servir SITE [--porta N]"); process.exit(1); }
    if (existsSync(saida)) { console.error(`--saida já existe: ${saida} (versão nova = pasta nova)`); process.exit(1); }
    const politica = a.includes("--politica") ? versaoDaPolitica(val("--politica")) : POLITICA_CAMPANHA_PADRAO;
    const p = prepararCampanha(analises, { validador: a.includes("--validador") ? val("--validador") : undefined, politica,
      ...(a.includes("--base-url") ? { baseUrl: val("--base-url") } : {}) });
    for (const [rel, t] of p.arquivosInternos) if (rel === "cegueira.json") gravar(saida, rel, t);
    if (p.cegueira.falhas.length || p.falhasTrio.length) {
      console.error(`CEGUEIRA FALHOU (${p.cegueira.falhas.length} + ${p.falhasTrio.length} com×ferramentas); nada gravado em lotes/. Ver ${saida}/cegueira.json`);
      for (const f of p.cegueira.falhas.slice(0, 30)) console.error(`  ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`);
      process.exit(3);
    }
    for (const [rel, t] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(saida, rel, t);
    const m = JSON.parse(p.arquivosInternos.get("lotes/manifesto.json")!) as { total: number; lotes: { lote: string; n: number }[] };
    const c = JSON.parse(p.arquivosInternos.get("chave/fila-t3-chave.json")!) as { porBraco: unknown };
    console.log(`primeira passada ok: ${m.total} cartões, ${m.lotes.length} lote(s) (${m.lotes.map(l => l.n).join(", ")}); por braço ${JSON.stringify(c.porBraco)}`);
  }
}
