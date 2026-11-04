/**
 * Varredura de vazamento de conhecimento nos payloads reais do oráculo (NAT-61, plano §5.2–§5.3).
 *
 * Roda no HOST, depois da execução, sobre o que a ponte do oráculo gravou (D-118/NAT-82: projeção no
 * evento + texto integral em `payloads/` quando a projeção corta) e sobre o tools/list exposto. Nada aqui
 * chama modelo nem sobe o servidor: o dicionário é gerado do `data/` do validator TRAVADO (o mesmo
 * dist/data embutido na imagem, conferido no preflight do run-once) e o núcleo do detector é a cópia
 * texto a texto de `govbr-ds-validator/scripts/lib/vazamento.ts` (`./nucleo.ts`, guarda de deriva no
 * test:runner-unidade). Política de perdão POR CAMPO e POR PROVENIÊNCIA (nunca subtração global); 1.1.0
 * (validator 2.14.1, revisão Codex db6d022d): campos declarados por ferramenta pelo caminho inteiro e eco
 * só como valor exato; 1.2.0 (D-154): eco do seletor de ação da mesma chamada, ver ECO_SELETOR_DE_ACAO; 1.3.2: eco do
 * seletor de ação de um scan_page ANTERIOR vinculado pelo scanId pedido, e citação com aspas internas. Detector AUXILIAR,
 * não prova universal (a garantia é a trava de carregamento):
 *   - eco: o termo é o valor inteiro de um argumento declarado, no campo declarado para ecoá-lo naquela
 *     ferramenta (ou o nome da própria ferramenta no texto de erro);
 *   - pagina: campo medido da página declarado para a ferramenta E o termo existe nos bytes SERVIDOS do site congelado (govbr-telas
 *     site/). O DOM renderizado não é capturado aqui: um termo que só existisse nele fica sem explicação
 *     (falha conservadora, nunca aprovação silenciosa); 1.3.1: também o nome de componente em posição de tipo/classe
 *     de um seletor citado (folha `…locator`/`…selector` ou trecho entre aspas), com o termo nos bytes servidos;
 *   - axe: campo declarado da saída do axe-core E o termo existe no bundle do axe-core do validator;
 *   - excecao-nomeada: as duas normalizações de fingerprint e o enum RuleSource (plano §3, decisões 8–9).
 * Aceite no braço ferramentas: 0 ocorrências `sem-explicacao`, todos os payloads integrais (truncado ou
 * fora do orçamento = varredura incompleta = falha) e os canários do detector disparando.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { argValues, buildDictionary, classify, exactTokens, hitsInText, leaves, termIn, type Classification, type Dictionary, type Hit, type PageElements, type Provenance, type ScanResult } from "./nucleo";

/**
 * 1.3.1 (dev-366-b-01 p01/p02-ferramentas, oráculo 3.6.6): duas execuções falharam o isolamento só pela TAG dos web
 * components da tela B (`br-input`, `br-button` = classe raiz do componente no dicionário) em formas de resposta novas da
 * 3.6.5/3.6.6 — `checksRun.pageLevel.notMeasured[*].measured[*].locator`, `verification.binding.state.failure.selector`
 * e o seletor citado entre aspas em `verification.detail`/`reasons[*].detail`/`…failure.detail`/`…limitation.detail`.
 * O 1.3.0 perdoava a tag só nos caminhos declarados um a um (D-157). O núcleo (cópia do validator) ganha uma regra
 * ESTRUTURAL, `pagina` por seletor de elemento da página (ver o cabeçalho do núcleo): nome de componente
 * (specs:rootClass/variantClass) só em posição de tipo/classe de um seletor bem-formado — a folha inteira num campo
 * `…locator`/`…selector`, ou um trecho entre aspas COM sintaxe de seletor — e RENDERIZADO pela tela naquela posição.
 * Ids, títulos, trechos da base e tokens nunca entram por ela; o nome solto na prosa ou nu entre aspas continua sem
 * explicação; variante só em posição de classe; caminhos de receita/replay/passo/ação de qualquer ferramenta ficam fora.
 * Revisão adversarial (02/11): "fato da página" = inventário do DOM RENDERIZADO da tela (`inventario-dom/<tela>.json`,
 * gerado por `inventario-dom.ts` nas paradas declaradas da referência, preso ao siteSha256 do site), nunca os bytes
 * servidos (os bundles do DS trazem 124 dos 126 nomes de componente). Sem inventário da tela, ou com inventário de outro
 * site, a regra não perdoa nada. Dez canários novos marcam as bordas (23 no total).
 * Rechecagem offline (`scripts/portao-vazamento-reexecucao.ts --revarrer`): p01/p02 3/5 → 0 sem explicação.
 *
 * 1.3.2 (dev-371-b-01 rep-01/rep-03-ferramentas, oráculo 3.7.1): duas execuções falharam o isolamento por duas formas de
 * resposta em que o termo é um seletor que o PRÓPRIO AGENTE mandou (ele lê o DOM e compõe seletores com classes do DS),
 * nada da base `data/`:
 *   (1) `get_finding_details(scanId)` devolve o `ledger` do lote — receita, replay, cobertura e chegada de um scan_page
 *       ANTERIOR, com os seletores dos argumentos daquele scan (`.br-select.position-absolute .br-item:nth-child(2) label`).
 *       A regra 1.2.0 exige argumento da MESMA chamada. Agora a varredura guarda, na ordem dos payloads, os argumentos de
 *       cada scan_page pelo `scanId` que a RESPOSTA daquele scan devolveu; no ledger o eco vale só se a folha inteira é
 *       idêntica a um valor do scan_page cujo scanId é o `scanId` dos argumentos desta chamada E o `$.scanId` desta
 *       resposta (o servidor só manda o ledger com scanId, nunca por `ids`, e é o do lote pedido). Mesmo seletor vindo de
 *       outro scan, scanId ausente ou divergente, ou seletor reescrito pelo servidor continuam sem explicação.
 *   (2) `verify_finding` cita o seletor do passo que falhou em prosa (`reasons[*].detail`, `verification.detail`,
 *       `binding.state.failure.detail`, `binding.state.limitation.detail`), fora dos caminhos declarados, e o seletor tem
 *       aspas internas (`'br-input[formcontrolname='portoDesembarque'] >>> input'`), que a regex de citação da 1.2.0
 *       cortava. Os caminhos entram como citados, e a citação passa a ser: para cada `actions[*].selector` da chamada que
 *       contém o termo, tirar da folha as ocorrências literais do valor INTEIRO entre aspas idênticas (aspa simples, dupla
 *       ou crase); eco só se o termo sumiu da folha. Prefixo do valor entre aspas, valor de outro argumento ou termo solto
 *       na prosa continuam sem explicação.
 * O núcleo (cópia do validator) não muda. Dez canários novos marcam os dois lados das duas formas (33 no total).
 * Rechecagem offline (`--revarrer`): rep-01 10 → 0, rep-03 4 → 0 sem explicação; rep-02 segue 0.
 *
 * 1.3.3 (dev-371-a2-01 rep-01/rep-02/rep-03-ferramentas, oráculo 3.7.1, tela A2 acompanhamento): as três execuções
 * falharam o isolamento por UMA ocorrência cada, `br-button` em `verify_finding`
 * `$.verification.binding.context.trace[*].active` = `<div.br-button.circle.small> "Fechar"`: o elemento com foco no passo
 * do traço, serializado pelo `describe()` do validator (`<tag#id.classe.classe> "texto"`, até 3 classes do classList e
 * os 40 primeiros caracteres do textContent), ou seja o botão fechar da modal da PRÓPRIA página. O núcleo já lê o
 * descritor `<…>` como seletor de elemento da página (condição 2), mas só a folha INTEIRA `^<…>$`: com o texto
 * visível depois do descritor a folha não casa, e o texto entre aspas ("Fechar") não é seletor. Nas entradas do traço
 * (`step`, `url`, `active`, `nextTarget`, `subjects[*]`, `message`, `error`: `summarizeContext` do gate da 3.7.1, e
 * as respostas reais dos três pacotes) só `active` carrega essa serialização; `subjects[*].text`/`message.text` são texto.
 * Esta camada, só do eval, aplica a regra do núcleo ao DESCRITOR quando, e só quando: a ferramenta e o caminho são os
 * declarados em DESCRITOR_DO_TRACO, a folha inteira é `<composto>` ou `<composto> "texto"` (o formato do describe), o
 * termo não aparece no texto, e o núcleo, chamado com a folha `<composto>`, classifica `pagina` (nome de componente
 * em posição de tipo/classe RENDERIZADO pela tela no inventário do DOM; sem inventário, nada). Id ou título da base no
 * texto ou no id do descritor, o nome no texto visível, o mesmo descritor na prosa do veredito ou noutro campo do traço,
 * outra ferramenta, e a folha fora do formato continuam sem explicação. O núcleo (cópia do validator) não muda. Doze
 * canários novos marcam os dois lados (45 no total).
 * Rechecagem offline (`--revarrer`): rep-01/rep-02/rep-03 1 → 0 sem explicação cada.
 */
export const VARREDURA_VERSAO = "vazamento-conhecimento-1.3.3";

/**
 * 1.2.0 (D-154): eco do SELETOR DE AÇÃO da mesma chamada. Desde o validator 3.4.3 a resposta encolhida do
 * scan_page mantém `state.recipe`, e a receita, o replay e a cobertura repetem os seletores que o AGENTE
 * mandou em `actions[*].selector` (ex.: `tbody tr:nth-child(1) br-button[icon="trash"]`). O núcleo (cópia
 * texto a texto do validator, guarda de deriva) só perdoa eco de valor INTEIRO igual ao termo; um seletor
 * composto que contém uma classe/elemento do DS caía em `sem-explicacao`. Esta camada, só do eval, perdoa a
 * ocorrência quando, e só quando: a ferramenta é a declarada, a folha está num dos caminhos declarados, a
 * FOLHA INTEIRA é idêntica (byte a byte) a um `actions[*].selector` dos argumentos DA MESMA chamada e o termo
 * está nela. Seletor ausente dos argumentos, presente só noutro argumento (ex.: `arrival.visible`) ou
 * reescrito pelo servidor continua `sem-explicacao`.
 *
 * 1.3.2: `vinculo: "scanId"` = os valores vêm dos argumentos do scan_page ANTERIOR da sessão que devolveu o scanId pedido
 * em `scanId` nesta chamada (igual ao `$.scanId` desta resposta), não dos argumentos desta chamada.
 */
export interface EcoDeSeletorDeclarado { arg: string; paths: string[]; lista?: boolean; citado?: boolean; vinculo?: "scanId" }
export const ECO_SELETOR_DE_ACAO: Record<string, EcoDeSeletorDeclarado[]> = {
  scan_page: [
    { arg: "actions[*].selector", paths: ["$.state.recipe.actions[*].selector", "$.state.replay.steps[*].selector", "$.state.replay.failure.selector", "$.coverage.actionsApplied[*].selector"] },
    // 1.3.1 (revisão de 02/11): com `exactTokens` separando compostos com ponto, `.br-tag.interaction` passou a ser
    // ocorrência; os mesmos seletores do AGENTE voltam na condição de chegada e no escopo do scan. Mesma regra: a folha
    // inteira é idêntica ao argumento da mesma chamada (o escopo é `selectors.join(", ")`, como o validator o monta).
    { arg: "arrival.visible", paths: ["$.state.recipe.arrival.visible", "$.state.arrival.conditions[*].expected"] },
    { arg: "selectors[*]", paths: ["$.state.recipe.selectors[*]", "$.coverage.selectors[*]"] },
    { arg: "selectors[*]", paths: ["$.coverage.axeScope", "$.checksRun.executed[*].scope"], lista: true },
    // o texto da falha do replay CITA entre aspas o seletor do passo que falhou ("'.br-tag.interaction:first-of-type'
    // resolveu 4 elementos…"): eco só se TODA ocorrência do termo está entre aspas idênticas a um seletor do agente
    { arg: "actions[*].selector", paths: ["$.state.replay.failure.detail", "$.state.replay.steps[*].detail"], citado: true },
  ],
  verify_finding: [
    // 1.3.2: na 3.7.1 a falha do replay vem em `binding.state.failure` (sem o nível `replay`)
    { arg: "actions[*].selector", paths: ["$.verification.binding.state.recipe.actions[*].selector", "$.verification.binding.state.replay.steps[*].selector", "$.verification.binding.state.replay.failure.selector", "$.verification.binding.state.failure.selector"] },
    { arg: "arrival.visible", paths: ["$.verification.binding.state.recipe.arrival.visible", "$.verification.binding.state.arrival.conditions[*].expected"] },
    { arg: "actions[*].selector", paths: ["$.verification.binding.state.replay.failure.detail", "$.verification.binding.state.replay.steps[*].detail"], citado: true },
    // 1.3.2 (dev-371-b-01 rep-03): a prosa do veredito e da limitação cita o seletor do passo que falhou
    { arg: "actions[*].selector", paths: ["$.reasons[*].detail", "$.verification.detail", "$.verification.binding.state.failure.detail", "$.verification.binding.state.limitation.detail"], citado: true },
  ],
  // 1.3.2 (dev-371-b-01 rep-01): o ledger do lote pedido repete os argumentos do scan_page que o criou (as mesmas formas do
  // scan_page acima, sob `$.ledger`), vinculado pelo scanId
  get_finding_details: [
    { arg: "actions[*].selector", vinculo: "scanId", paths: ["$.ledger.state.recipe.actions[*].selector", "$.ledger.state.replay.steps[*].selector", "$.ledger.state.replay.failure.selector", "$.ledger.coverage.actionsApplied[*].selector"] },
    { arg: "arrival.visible", vinculo: "scanId", paths: ["$.ledger.state.recipe.arrival.visible", "$.ledger.state.arrival.conditions[*].expected"] },
    { arg: "selectors[*]", vinculo: "scanId", paths: ["$.ledger.state.recipe.selectors[*]", "$.ledger.coverage.selectors[*]"] },
    { arg: "selectors[*]", vinculo: "scanId", paths: ["$.ledger.coverage.axeScope"], lista: true },
    { arg: "actions[*].selector", vinculo: "scanId", paths: ["$.ledger.state.replay.failure.detail", "$.ledger.state.replay.steps[*].detail"], citado: true },
  ],
};

/** 1.3.2: argumentos de cada scan_page da sessão, pelo scanId que a RESPOSTA daquele scan devolveu (na ordem dos payloads). */
export interface SessaoDeScans { argsDoScan: ReadonlyMap<string, unknown> }

const ASPAS = ["'", "\"", "`"];

function ecoDeSeletor(hit: Hit, folha: string, prov: Provenance, sessao: SessaoDeScans | undefined, respostaScanId: string | null): { class: Classification; why: string } | null {
  for (const decl of ECO_SELETOR_DE_ACAO[prov.tool] ?? []) {
    if (!decl.paths.includes(hit.path) || !termIn(folha, hit)) continue;
    let fonte: unknown = prov.args;
    let origem = `desta chamada de ${prov.tool}`;
    if (decl.vinculo === "scanId") {
      // 1.3.2: o scan_page anterior que devolveu o scanId pedido; a resposta tem de ser a do mesmo lote
      const pedidos = argValues(prov.args, "scanId");
      const pedido = pedidos.length === 1 ? pedidos[0] : null;
      if (!pedido || respostaScanId !== pedido || !sessao?.argsDoScan.has(pedido)) continue;
      fonte = sessao.argsDoScan.get(pedido);
      origem = `do scan_page que devolveu ${pedido}, o scanId pedido nesta chamada de ${prov.tool}`;
    }
    const valores = argValues(fonte, decl.arg);
    if (decl.citado) {
      if (hit.kind !== "exact") continue;
      // 1.3.2: tira da folha o valor INTEIRO entre aspas idênticas (cobre aspas internas: 'a[x='y'] >>> b'); os mais longos
      // primeiro, para um valor curto não partir a citação de um longo que o contém. Só valores que contêm o termo.
      let resto = folha;
      let citou = false;
      for (const v of [...new Set(valores)].filter((x) => x.length > 0 && termIn(x, hit)).sort((a, b) => b.length - a.length)) {
        for (const q of ASPAS) {
          const citacao = `${q}${v}${q}`;
          if (!resto.includes(citacao)) continue;
          resto = resto.split(citacao).join(" ");
          citou = true;
        }
      }
      if (citou && !exactTokens(resto).includes(hit.term)) {
        return { class: "eco", why: `seletor do agente citado: toda ocorrência em ${hit.path} é um ${decl.arg} inteiro ${origem}, entre aspas idênticas (D-154, 1.3.2)` };
      }
      continue;
    }
    if (decl.lista ? valores.length > 0 && valores.join(", ") === folha : valores.includes(folha)) {
      return { class: "eco", why: `seletor do agente ecoado: a folha ${hit.path} é idêntica a ${decl.lista ? `${decl.arg} unidos por ", "` : `um ${decl.arg}`} dos argumentos ${origem} (D-154${decl.vinculo ? ", 1.3.2" : ""})` };
    }
  }
  return null;
}

/**
 * 1.3.3: caminhos em que a folha é o DESCRITOR do elemento com foco no traço do verify (`describe()` do validator:
 * `<tag#id.classe…>` seguido, se o elemento tem texto, de ` "texto"`). Só `active` traz essa forma nas entradas do traço.
 */
export const DESCRITOR_DO_TRACO: Record<string, string[]> = {
  verify_finding: ["$.verification.binding.context.trace[*].active"],
};
/** O formato do describe(): um composto entre <> (como o ELEMENT_DESCRIPTOR do núcleo) e, opcional, espaço + texto entre aspas duplas. */
const DESCRITOR_COM_TEXTO = /^<([^<>\s]+)>(?: "([^\n]*)")?$/;

function descritorDoTraco(hit: Hit, folha: string, prov: Provenance, cache: Map<string, string>): { class: Classification; why: string } | null {
  if (!(DESCRITOR_DO_TRACO[prov.tool] ?? []).includes(hit.path) || hit.kind !== "exact") return null;
  const m = DESCRITOR_COM_TEXTO.exec(folha);
  if (!m) return null;
  // o nome no texto visível do elemento não é posição de tipo/classe: fica sem explicação (como a prosa fora do seletor)
  if (exactTokens(m[2] ?? "").includes(hit.term)) return null;
  const c = classify(hit, prov, cache, `<${m[1]}>`);
  if (c.class !== "pagina") return null;
  return { class: "pagina", why: `${c.why}; descritor do elemento com foco no traço (<composto> "texto" do describe), termo só no composto (1.3.3)` };
}

/** scanId de topo de uma resposta JSON (o do lote: scan_page devolve o novo, get_finding_details o pedido), ou null. */
export function scanIdDaResposta(text: string): string | null {
  try {
    const r = JSON.parse(text) as unknown;
    if (!r || typeof r !== "object" || Array.isArray(r)) return null;
    const id = (r as Record<string, unknown>).scanId;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

/**
 * A varredura do núcleo (mesmas folhas, mesma classificação) + a camada de eco do seletor de ação (1.2.0; 1.3.2: também
 * com os argumentos dos scan_page anteriores da sessão, pelo scanId).
 */
export function varrerResposta(dict: Dictionary, text: string, prov: Provenance, sessao?: SessaoDeScans): { hits: Array<ScanResult["hits"][number] & { folha: string }> } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  const respostaScanId = scanIdDaResposta(text);
  const cache = new Map<string, string>();
  const hits: Array<ScanResult["hits"][number] & { folha: string }> = [];
  for (const leaf of leaves(parsed)) {
    for (const hit of hitsInText(dict, leaf.text, leaf.path)) {
      // ordem do 1.3.0 intacta (núcleo sem a folha → eco do seletor de ação); só o que ficaria sem explicação passa pela
      // regra do seletor de elemento da página (1.3.1), que precisa do texto da folha e do inventário do DOM da tela. Os
      // caminhos de receita/replay/passo/ação ficam fora dela no próprio núcleo (qualquer ferramenta).
      let c = classify(hit, prov, cache);
      if (c.class === "sem-explicacao") c = ecoDeSeletor(hit, leaf.text, prov, sessao, respostaScanId) ?? c;
      if (c.class === "sem-explicacao") c = classify(hit, prov, cache, leaf.text);
      // 1.3.3: o descritor do elemento com foco no traço do verify, com o texto visível depois dele
      if (c.class === "sem-explicacao") c = descritorDoTraco(hit, leaf.text, prov, cache) ?? c;
      hits.push({ ...hit, ...c, folha: leaf.text });
    }
  }
  return { hits };
}

const cacheDicionario = new Map<string, Promise<Dictionary>>();

/** Ids publicados das checagens que aplicam a base (ds-token-*, ds-structure-*, ds-page-*), lidos do dist/ travado. */
async function idsPublicados(validatorDir: string): Promise<string[]> {
  const dist = pathToFileURL(join(validatorDir, "dist") + "/").href;
  const { CHECK_GROUNDING } = await import(dist + "checkers/grounding.js") as { CHECK_GROUNDING: Record<string, unknown> };
  const { pageConstraints } = await import(dist + "checkers/pageStructure.js") as { pageConstraints: () => { id: string }[] };
  const { constraintsForComponent, getComponentSpecs } = await import(dist + "data/load.js") as {
    constraintsForComponent: (s: unknown) => { id: string }[]; getComponentSpecs: () => { components: Record<string, unknown> };
  };
  return [
    ...Object.keys(CHECK_GROUNDING).map((k) => `ds-${k}`),
    ...Object.values(getComponentSpecs().components).flatMap((spec) => constraintsForComponent(spec).map((c) => c.id)),
    ...pageConstraints().map((c) => c.id),
  ];
}

/** Dicionário proibido gerado do `data/` + dist do validator (uma vez por processo e por pasta). */
export function dicionarioDoValidator(validatorDir: string): Promise<Dictionary> {
  let d = cacheDicionario.get(validatorDir);
  if (!d) {
    d = idsPublicados(validatorDir).then((checkIds) => buildDictionary(validatorDir, { checkIds }));
    cacheDicionario.set(validatorDir, d);
  }
  return d;
}

/** Bundle do axe-core que o oráculo usa (o do validator; o do eval só se o validator não tiver node_modules). */
export function bundleDoAxe(validatorDir: string): { texto: string; origem: string } {
  const doValidator = join(validatorDir, "node_modules", "axe-core", "axe.min.js");
  if (existsSync(doValidator)) return { texto: readFileSync(doValidator, "utf8"), origem: "govbr-ds-validator/node_modules/axe-core/axe.min.js" };
  const require = createRequire(import.meta.url);
  return { texto: readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"), origem: "govbr-eval/node_modules/axe-core/axe.min.js (o validator não tem node_modules)" };
}

const TEXTO = new Set([".html", ".htm", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".map", ".xml", ".webmanifest"]);
const cacheSite = new Map<string, string>();
/** Bytes de texto servidos pelo site congelado (govbr-telas/site), concatenados. */
export function textoDoSite(telasDir: string): string {
  const raiz = join(telasDir, "site");
  const hit = cacheSite.get(raiz);
  if (hit !== undefined) return hit;
  const partes: string[] = [];
  const andar = (d: string): void => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) andar(p);
      else if (TEXTO.has(extname(n).toLowerCase())) partes.push(readFileSync(p, "utf8"));
    }
  };
  if (existsSync(raiz)) andar(raiz);
  const texto = partes.join("\n");
  cacheSite.set(raiz, texto);
  return texto;
}

export interface EstadoInventario {
  tela: string | null;
  status: "ok" | "sem-tela" | "ausente" | "site-diverge";
  arquivo: string | null;
  siteSha256: string | null;
  tags: number;
  classes: number;
  /** Classes vistas só em tempo de execução (foco por teclado, hover, transições do setup), aceitas em posição de classe. */
  classesDinamicas: number;
}

/**
 * Inventário do DOM renderizado da tela (`inventario-dom/<tela>.json`), aceito só se foi medido sobre ESTE site
 * (siteSha256 = item.sha256 do site-manifest.json em telasDir, o mesmo que o images.lock fixa). Falha fechada: tela não
 * informada, arquivo ausente ou site diferente → `elements` null e a regra do seletor de elemento não perdoa nada.
 */
export function inventarioDaTela(tela: string | null | undefined, telasDir: string): { elements: PageElements | null; estado: EstadoInventario } {
  const vazio = (status: EstadoInventario["status"], arquivo: string | null = null, siteSha256: string | null = null) =>
    ({ elements: null, estado: { tela: tela ?? null, status, arquivo, siteSha256, tags: 0, classes: 0, classesDinamicas: 0 } });
  if (!tela) return vazio("sem-tela");
  const arquivo = fileURLToPath(new URL(`./inventario-dom/${tela}.json`, import.meta.url));
  if (!existsSync(arquivo)) return vazio("ausente", arquivo);
  const inv = JSON.parse(readFileSync(arquivo, "utf8")) as { site: { siteSha256: string }; tags: string[]; classes: string[]; classesDinamicas?: Record<string, string> };
  const dinamicas = Object.keys(inv.classesDinamicas ?? {});
  const manifesto = join(telasDir, "site-manifest.json");
  const site = existsSync(manifesto) ? (JSON.parse(readFileSync(manifesto, "utf8")) as { item?: { sha256?: string } }).item?.sha256 ?? null : null;
  if (!site || site !== inv.site.siteSha256) return vazio("site-diverge", arquivo, inv.site.siteSha256);
  return { elements: { tags: new Set(inv.tags), classes: new Set([...inv.classes, ...dinamicas]) },
    estado: { tela, status: "ok", arquivo, siteSha256: site, tags: inv.tags.length, classes: inv.classes.length, classesDinamicas: dinamicas.length } };
}

/** Canários: o detector precisa disparar onde deve e perdoar só onde a proveniência sustenta (os do inventário do validator). */
export function canarios(dict: Dictionary, axe: string): { nome: string; ok: boolean; detalhe: string }[] {
  const kbId = [...dict.exact.values()].find((t) => t.source === "kb:id")?.term;
  const kbTitle = [...dict.phrases.values()].find((t) => t.source === "kb:title")?.term;
  const token = [...dict.exact.values()].find((t) => t.source === "tokens:name")?.term;
  const emagTitle = [...dict.phrases.values()].find((t) => t.source === "emag:title")?.term;
  const rootClass = [...dict.exact.values()].find((t) => t.source === "specs:rootClass")?.term;
  if (!kbId || !kbTitle || !token || !emagTitle || !rootClass) return [{ nome: "dicionário com as cinco fontes", ok: false, detalhe: "dicionário sem id/título da base, token, título e-MAG ou classe raiz" }];
  // 1.2.0 (D-154): seletor de ação com a classe raiz do DS, como o agente o escreve.
  const seletor = `tbody tr:nth-child(1) ${rootClass}[icon="trash"]`;
  const receita = JSON.stringify({ state: { recipe: { actions: [{ action: "click", selector: seletor }] } } });
  const page = `<html><body><div style="color: var(${token})">x</div></body></html>`;
  // 1.3.1: inventário sintético do DOM renderizado (a 1ª classe raiz e a 1ª variante renderizadas; a 2ª classe raiz
  // existe nos "bytes" da página, como nos bundles do DS, mas a tela não a renderiza)
  const roots = [...dict.exact.values()].filter((t) => t.source === "specs:rootClass").map((t) => t.term);
  const variante = [...dict.exact.values()].find((t) => t.source === "specs:variantClass")?.term ?? "is-primary";
  const naoRenderizado = roots.find((r) => r !== rootClass) ?? `${rootClass}-x`;
  const pageComTag = `<html><body><${rootClass} label="Editar" class="${variante}"></${rootClass}><script>customElements.define("${naoRenderizado}", class {})</script></body></html>`;
  const elements: PageElements = { tags: new Set(["html", "body", rootClass]), classes: new Set([variante]) };
  // 1.1.0: casos por ferramenta, campo declarado e eco exato (os mesmos do inventário do validator 2.14.1).
  // 1.3.2: ledger de um scan_page anterior (vínculo por scanId) e seletor do agente com aspas internas citado na prosa
  const ledger = (scanId: string, sel: string) => JSON.stringify({ scanId, ledger: { coverage: { actionsApplied: [{ action: "click", selector: sel }] }, state: { recipe: { actions: [{ action: "click", selector: sel }] }, replay: { steps: [{ index: 0, selector: sel }] } } } });
  const doScan = (sel: string) => ({ url: "http://x/", actions: [{ action: "click", selector: sel }] });
  const scans = (...pares: [string, unknown][]) => new Map<string, unknown>(pares);
  const selInterno = `${rootClass}[formcontrolname='porto'] >>> input`;
  const falhou = `Nenhum elemento para '${selInterno}' no passo 4.`;
  // 1.3.3: entrada do traço do verify com o descritor do elemento com foco; inventário com a classe raiz em posição de classe
  const traco = (active: string) => JSON.stringify({ verification: { binding: { context: { trace: [{ step: 1, url: "http://x/", active, nextTarget: null }] } } } });
  const doTraco: PageElements = { tags: new Set(["html", "body", "div", "button", rootClass]), classes: new Set([rootClass, "circle", "small"]) };
  const prosa = JSON.stringify({ reasons: [{ detail: `Limitação: ${falhou}` }], verification: { detail: `Limitação: ${falhou}`, binding: { state: { failure: { detail: falhou }, limitation: { detail: `Passo 4 (fill) falhou. ${falhou}` } } } } });
  const casos: { nome: string; tool: string; texto: string; args: unknown; page: string | null; espera: Classification; elements?: PageElements | null; scans?: Map<string, unknown> }[] = [
    { nome: "título da base numa nota do servidor", tool: "verify_finding", texto: JSON.stringify({ note: `Veja ${kbTitle}.` }), args: {}, page, espera: "sem-explicacao" },
    { nome: "id da base enriquecido pelo servidor", tool: "verify_finding", texto: JSON.stringify({ next: { ruleId: kbId } }), args: {}, page, espera: "sem-explicacao" },
    { nome: "título e-MAG anexado à descrição", tool: "scan_page", texto: JSON.stringify({ findings: [{ rule: { description: `x (e-MAG 1.1: ${emagTitle})` } }] }), args: {}, page, espera: "sem-explicacao" },
    { nome: "token num snippet SEM o token na página", tool: "scan_page", texto: JSON.stringify({ findings: [{ element: { snippet: `<i style="color:var(${token})">` } }] }), args: {}, page: "<html></html>", espera: "sem-explicacao" },
    { nome: "token num campo do servidor COM o token na página", tool: "scan_page", texto: JSON.stringify({ note: `use ${token}` }), args: {}, page, espera: "sem-explicacao" },
    { nome: "token num campo genérico 'detail' COM o token na página", tool: "scan_page", texto: JSON.stringify({ limitation: { detail: `use ${token}` } }), args: {}, page, espera: "sem-explicacao" },
    { nome: "token num snippet COM o token na página", tool: "scan_page", texto: JSON.stringify({ findings: [{ element: { snippet: `<div style="color: var(${token})">` } }] }), args: {}, page, espera: "pagina" },
    { nome: "id da base ecoado do argumento", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum predicado para govbr-ds-kb '${kbId}'.` } }), args: { finding: { rule: { id: kbId } } }, page, espera: "eco" },
    { nome: "id citado ecoado FORA do campo declarado", tool: "verify_finding", texto: JSON.stringify({ verification: { next: { ruleId: kbId } } }), args: { finding: { rule: { id: kbId } } }, page, espera: "sem-explicacao" },
    { nome: "título da base no campo de eco, com o título só dentro de outro argumento", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Regra: ${kbTitle}.` } }), args: { finding: { rule: { id: kbId }, evidence: { observed: `nota do agente: ${kbTitle}` } } }, page, espera: "sem-explicacao" },
    { nome: "classe raiz na receita ecoada dos actions da mesma chamada", tool: "scan_page", texto: receita, args: { actions: [{ action: "click", selector: seletor }] }, page, espera: "eco" },
    { nome: "classe raiz na receita SEM o seletor nos argumentos da chamada", tool: "scan_page", texto: receita, args: { actions: [{ action: "click", selector: "#outro" }] }, page, espera: "sem-explicacao" },
    { nome: "classe raiz na receita com o seletor só noutro argumento (arrival)", tool: "scan_page", texto: receita, args: { actions: [{ action: "click", selector: "#outro" }], arrival: { visible: seletor } }, page, espera: "sem-explicacao" },
    // 1.3.1: seletor de elemento da página (regra estrutural do núcleo; prova = inventário do DOM renderizado).
    { nome: "tag renderizada num seletor citado no detalhe do verify", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum elemento para '${rootClass}[label="Editar"]' no passo 2.` } }), args: {}, page: pageComTag, elements, espera: "pagina" },
    { nome: "variante renderizada em posição de classe num seletor citado", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum elemento para '${rootClass}.${variante}'.` } }), args: {}, page: pageComTag, elements, espera: "pagina" },
    { nome: "componente nos bytes da página (bundle) mas NÃO renderizado pela tela", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum elemento para '${naoRenderizado}[label="Editar"]'.` } }), args: {}, page: pageComTag, elements, espera: "sem-explicacao" },
    { nome: "seletor citado sem inventário da tela (falha fechada)", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum elemento para '${rootClass}[label="Editar"]'.` } }), args: {}, page: pageComTag, elements: null, espera: "sem-explicacao" },
    { nome: "nome renderizado nu entre aspas (sem sintaxe de seletor)", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Esperado '${rootClass}' antes do cabeçalho.` } }), args: {}, page: pageComTag, elements, espera: "sem-explicacao" },
    { nome: "variante usada como tag num seletor citado", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Use '${variante}[x]'.` } }), args: {}, page: pageComTag, elements: { tags: new Set([...elements.tags, variante]), classes: elements.classes }, espera: "sem-explicacao" },
    { nome: "tag renderizada solta na prosa do detalhe (fora de seletor)", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `O ${rootClass} exige rótulo: '${rootClass}[label="x"]'.` } }), args: {}, page: pageComTag, elements, espera: "sem-explicacao" },
    { nome: "classe raiz na receita SEM o seletor nos argumentos, tag renderizada (eco D-154 não vira página)", tool: "scan_page", texto: receita, args: { actions: [{ action: "click", selector: "#outro" }] }, page: pageComTag, elements, espera: "sem-explicacao" },
    { nome: "seletor reescrito numa receita fora do scan_page (verify binding.state.recipe), tag renderizada", tool: "verify_finding", texto: JSON.stringify({ verification: { binding: { state: { recipe: { actions: [{ selector: `${rootClass}[label="x"]` }] } } } } }), args: {}, page: pageComTag, elements, espera: "sem-explicacao" },
    { nome: "id da base citado entre aspas como se fosse seletor, com o id na página", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum elemento para '${kbId}'.` } }), args: {}, page: `${pageComTag}<!-- ${kbId} -->`, elements, espera: "sem-explicacao" },
    // 1.3.2 (dev-371-b-01): ledger do get_finding_details vinculado pelo scanId ao scan_page que o criou
    { nome: "classe raiz no ledger, ecoada do scan_page cujo scanId é o pedido", tool: "get_finding_details", texto: ledger("S-page-002", seletor), args: { scanId: "S-page-002" }, page: pageComTag, elements, scans: scans(["S-page-002", doScan(seletor)]), espera: "eco" },
    { nome: "chegada do scan no ledger vinculado (arrival.visible)", tool: "get_finding_details", texto: JSON.stringify({ scanId: "S-page-002", ledger: { state: { recipe: { arrival: { visible: `button.${rootClass}.inverted` } }, arrival: { conditions: [{ expected: `button.${rootClass}.inverted` }] } } } }), args: { scanId: "S-page-002" }, page: pageComTag, elements, scans: scans(["S-page-002", { url: "http://x/", arrival: { visible: `button.${rootClass}.inverted` } }]), espera: "eco" },
    { nome: "mesmo seletor no ledger, mas ele veio de OUTRO scan_page (não o do scanId pedido)", tool: "get_finding_details", texto: ledger("S-page-002", seletor), args: { scanId: "S-page-002" }, page: pageComTag, elements, scans: scans(["S-page-001", doScan(seletor)], ["S-page-002", doScan("#outro")]), espera: "sem-explicacao" },
    { nome: "ledger pedido sem scanId nos argumentos (só ids)", tool: "get_finding_details", texto: ledger("S-page-002", seletor), args: { ids: ["F-001"] }, page: pageComTag, elements, scans: scans(["S-page-002", doScan(seletor)]), espera: "sem-explicacao" },
    { nome: "ledger com scanId da resposta diferente do pedido", tool: "get_finding_details", texto: ledger("S-page-002", seletor), args: { scanId: "S-page-001" }, page: pageComTag, elements, scans: scans(["S-page-001", doScan(seletor)], ["S-page-002", doScan(seletor)]), espera: "sem-explicacao" },
    { nome: "seletor do scan reescrito pelo servidor no ledger", tool: "get_finding_details", texto: ledger("S-page-002", `${seletor} >>> button`), args: { scanId: "S-page-002" }, page: pageComTag, elements, scans: scans(["S-page-002", doScan(seletor)]), espera: "sem-explicacao" },
    // 1.3.2: seletor do agente com aspas internas citado na prosa do verify (valor inteiro entre aspas idênticas)
    { nome: "seletor com aspa interna citado na prosa do verify (reasons, detail, failure, limitation)", tool: "verify_finding", texto: prosa, args: { actions: [{ action: "fill", selector: selInterno, value: "" }] }, page: pageComTag, elements: null, espera: "eco" },
    { nome: "classe raiz solta na prosa além da citação do seletor do agente", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `O ${rootClass} falhou: '${selInterno}'.` } }), args: { actions: [{ action: "fill", selector: selInterno }] }, page: pageComTag, elements: null, espera: "sem-explicacao" },
    { nome: "só um prefixo do seletor do agente entre aspas (não é o valor inteiro)", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `Nenhum elemento para '${rootClass}[formcontrolname='porto']'.` } }), args: { actions: [{ action: "fill", selector: selInterno }] }, page: pageComTag, elements: null, espera: "sem-explicacao" },
    { nome: "seletor com aspa interna citado, mas só em finding.element.locator (não em actions)", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: falhou } }), args: { finding: { element: { locator: selInterno } } }, page: pageComTag, elements: null, espera: "sem-explicacao" },
    // 1.3.3 (dev-371-a2-01): descritor do elemento com foco no traço do verify, com o texto visível depois dele
    { nome: "classe raiz renderizada no descritor do traço com texto (trace.active)", tool: "verify_finding", texto: traco(`<div.${rootClass}.circle.small> "Fechar"`), args: {}, page: pageComTag, elements: doTraco, espera: "pagina" },
    { nome: "tag renderizada no descritor do traço com texto (trace.active)", tool: "verify_finding", texto: traco(`<${rootClass}#fechar> "Fechar"`), args: {}, page: pageComTag, elements: doTraco, espera: "pagina" },
    { nome: "descritor do traço com classe raiz que a tela NÃO renderiza", tool: "verify_finding", texto: traco(`<div.${rootClass}.circle.small> "Fechar"`), args: {}, page: pageComTag, elements: { tags: doTraco.tags, classes: new Set(["circle", "small"]) }, espera: "sem-explicacao" },
    { nome: "descritor do traço sem inventário da tela (falha fechada)", tool: "verify_finding", texto: traco(`<div.${rootClass}.circle.small> "Fechar"`), args: {}, page: pageComTag, elements: null, espera: "sem-explicacao" },
    { nome: "classe raiz também no texto visível do descritor do traço", tool: "verify_finding", texto: traco(`<div.${rootClass}> "Fechar ${rootClass}"`), args: {}, page: pageComTag, elements: doTraco, espera: "sem-explicacao" },
    { nome: "id da base plantado no texto do descritor do traço", tool: "verify_finding", texto: traco(`<button#aba-documentos> "${kbId}"`), args: {}, page: `${pageComTag}<!-- ${kbId} -->`, elements: doTraco, espera: "sem-explicacao" },
    { nome: "id da base plantado como id do descritor do traço", tool: "verify_finding", texto: traco(`<div#${kbId}> "Fechar"`), args: {}, page: `${pageComTag}<!-- ${kbId} -->`, elements: doTraco, espera: "sem-explicacao" },
    { nome: "título da base (frase normativa) no texto do descritor do traço", tool: "verify_finding", texto: traco(`<button#aba-documentos> "${kbTitle}"`), args: {}, page, elements: doTraco, espera: "sem-explicacao" },
    { nome: "descritor com texto citado na prosa do veredito (verification.detail), não no traço", tool: "verify_finding", texto: JSON.stringify({ verification: { detail: `ao fechar (passo 1), o foco foi para <div.${rootClass}.circle.small> "Fechar", não para o invocador.` } }), args: {}, page: pageComTag, elements: doTraco, espera: "sem-explicacao" },
    { nome: "descritor com texto noutro campo da entrada do traço (trace.error, não declarado)", tool: "verify_finding", texto: JSON.stringify({ verification: { binding: { context: { trace: [{ step: 1, error: `<div.${rootClass}> "Fechar"` }] } } } }), args: {}, page: pageComTag, elements: doTraco, espera: "sem-explicacao" },
    { nome: "descritor com texto no mesmo caminho, mas noutra ferramenta (scan_page)", tool: "scan_page", texto: traco(`<div.${rootClass}.circle.small> "Fechar"`), args: {}, page: pageComTag, elements: doTraco, espera: "sem-explicacao" },
    { nome: "descritor do traço fora do formato do describe (texto sem aspas)", tool: "verify_finding", texto: traco(`<div.${rootClass}.circle.small> Fechar`), args: {}, page: pageComTag, elements: doTraco, espera: "sem-explicacao" },
  ];
  return casos.map((c) => {
    const { hits } = varrerResposta(dict, c.texto, { tool: c.tool, args: c.args, page: c.page, axe, elements: c.elements ?? null }, { argsDoScan: c.scans ?? new Map() });
    const got = hits.map((h) => h.class);
    return { nome: c.nome, ok: got.length > 0 && got.every((g) => g === c.espera), detalhe: `esperado ${c.espera}, obtido [${got.join(", ") || "nenhuma ocorrência"}]` };
  });
}

type Evento = Record<string, unknown>;
interface Lado { text?: string; truncated?: boolean; payload?: { status?: string; path?: string | null } }

export interface RelatorioVazamento {
  versao: typeof VARREDURA_VERSAO;
  nucleo: string;
  dicionario: Record<string, number>;
  axe: string;
  pagina: string;
  /** Inventário do DOM renderizado usado pela regra do seletor de elemento da página (1.3.1). */
  inventario: EstadoInventario;
  canarios: { nome: string; ok: boolean; detalhe: string }[];
  respostas: number;
  /** Respostas que não puderam ser lidas inteiras (projeção cortada sem payload completo). */
  incompletas: { seq: unknown; tool: string; lado: "args" | "result"; motivo: string }[];
  porClasse: Record<string, number>;
  /** `exemplo`: começo da 1ª folha em que o termo ficou sem explicação (diagnóstico). */
  semExplicacao: { term: string; source: string; path: string; tool: string; count: number; exemplo: string }[];
  perdoadas: { class: string; why: string; term: string; path: string; tool: string; count: number }[];
}

/**
 * Varre as chamadas do oráculo (eventos `call` da ponte, com o texto integral quando a projeção cortou) e o
 * tools/list exposto. `ler(caminho)` lê um arquivo do pacote (caminhos `evidence/raw/oracle/payloads/...`).
 */
export async function varrerPayloadsDoOraculo(o: {
  validatorDir: string; telasDir: string; eventos: Evento[]; toolsList: unknown[] | null; ler: (path: string) => string | null;
  /** Tela da execução (solicitacao | vistorias): escolhe o inventário do DOM renderizado; ausente = regra do seletor fechada. */
  tela?: string | null;
}): Promise<RelatorioVazamento> {
  const dict = await dicionarioDoValidator(o.validatorDir);
  const axe = bundleDoAxe(o.validatorDir);
  const pagina = textoDoSite(o.telasDir);
  const inventario = inventarioDaTela(o.tela, o.telasDir);
  const incompletas: RelatorioVazamento["incompletas"] = [];
  const integral = (e: Evento, lado: "args" | "result"): string | null => {
    const s = e[lado] as Lado | undefined;
    if (!s || typeof s.text !== "string") return null;
    if (!s.truncated) return s.text;
    if (s.payload?.status === "complete" && s.payload.path) {
      const t = o.ler(s.payload.path);
      if (t !== null) return t;
    }
    incompletas.push({ seq: e.seq, tool: String(e.tool), lado, motivo: `projeção cortada e payload ${s.payload?.status ?? "ausente"}` });
    return null;
  };
  const porClasse: Record<string, number> = {};
  const sem = new Map<string, RelatorioVazamento["semExplicacao"][number]>();
  const perd = new Map<string, RelatorioVazamento["perdoadas"][number]>();
  // 1.3.2: argumentos de cada scan_page pelo scanId que a resposta dele devolveu (só scans JÁ vistos; o 1º fica com o id)
  const argsDoScan = new Map<string, unknown>();
  const varrer = (texto: string, args: unknown, pg: string | null, tool: string): void => {
    for (const h of varrerResposta(dict, texto, { tool, args, page: pg, axe: axe.texto, elements: pg === null ? null : inventario.elements }, { argsDoScan }).hits) {
      porClasse[h.class] = (porClasse[h.class] ?? 0) + 1;
      const k = `${h.class}|${h.term}|${h.path}|${tool}`;
      if (h.class === "sem-explicacao") {
        const u = sem.get(k) ?? { term: h.term, source: h.source, path: h.path, tool, count: 0, exemplo: h.folha.slice(0, 240) };
        u.count += 1; sem.set(k, u);
      } else {
        const p = perd.get(k) ?? { class: h.class, why: h.why, term: h.term, path: h.path, tool, count: 0 };
        p.count += 1; perd.set(k, p);
      }
    }
  };
  let respostas = 0;
  if (o.toolsList) { varrer(JSON.stringify(o.toolsList), {}, null, "tools/list"); respostas += 1; }
  for (const e of o.eventos.filter((x) => x.kind === "call")) {
    const tool = String(e.tool);
    const argsTexto = integral(e, "args") ?? "";
    let args: unknown = {};
    try { args = JSON.parse(argsTexto || "{}"); } catch { args = argsTexto; }
    const res = integral(e, "result");
    if (res === null) continue;
    respostas += 1;
    // proveniência por ferramenta: eco só como valor exato no campo declarado; o nome da ferramenta pode
    // voltar no texto de erro (ex.: "get_ds_rules não está disponível")
    varrer(res, args, pagina, tool);
    if (tool === "scan_page") {
      const id = scanIdDaResposta(res);
      if (id !== null && !argsDoScan.has(id)) argsDoScan.set(id, args);
    }
  }
  const nucleo = readFileSync(new URL("./nucleo.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  return {
    versao: VARREDURA_VERSAO,
    nucleo: (await import("node:crypto")).createHash("sha256").update(nucleo).digest("hex"),
    dicionario: dict.counts, axe: axe.origem, pagina: `govbr-telas/site (${pagina.length} caracteres de texto servido)`, inventario: inventario.estado,
    canarios: canarios(dict, axe.texto), respostas, incompletas, porClasse,
    semExplicacao: [...sem.values()], perdoadas: [...perd.values()],
  };
}
