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
 * só como valor exato; 1.2.0 (D-154): eco do seletor de ação da mesma chamada, ver ECO_SELETOR_DE_ACAO. Detector AUXILIAR, não prova universal (a garantia é a trava de carregamento):
 *   - eco: o termo é o valor inteiro de um argumento declarado, no campo declarado para ecoá-lo naquela
 *     ferramenta (ou o nome da própria ferramenta no texto de erro);
 *   - pagina: campo medido da página declarado para a ferramenta E o termo existe nos bytes SERVIDOS do site congelado (govbr-telas
 *     site/). O DOM renderizado não é capturado aqui: um termo que só existisse nele fica sem explicação
 *     (falha conservadora, nunca aprovação silenciosa);
 *   - axe: campo declarado da saída do axe-core E o termo existe no bundle do axe-core do validator;
 *   - excecao-nomeada: as duas normalizações de fingerprint e o enum RuleSource (plano §3, decisões 8–9).
 * Aceite no braço ferramentas: 0 ocorrências `sem-explicacao`, todos os payloads integrais (truncado ou
 * fora do orçamento = varredura incompleta = falha) e os canários do detector disparando.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { argValues, buildDictionary, classify, hitsInText, leaves, termIn, type Classification, type Dictionary, type Hit, type Provenance, type ScanResult } from "./nucleo";

export const VARREDURA_VERSAO = "vazamento-conhecimento-1.2.0";

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
 */
export const ECO_SELETOR_DE_ACAO: Record<string, { arg: string; paths: string[] }> = {
  scan_page: {
    arg: "actions[*].selector",
    paths: ["$.state.recipe.actions[*].selector", "$.state.replay.steps[*].selector", "$.state.replay.failure.selector", "$.coverage.actionsApplied[*].selector"],
  },
};

function ecoDeSeletor(hit: Hit, folha: string, prov: Provenance): { class: Classification; why: string } | null {
  const decl = ECO_SELETOR_DE_ACAO[prov.tool];
  if (!decl || !decl.paths.includes(hit.path)) return null;
  if (!argValues(prov.args, decl.arg).includes(folha) || !termIn(folha, hit)) return null;
  return { class: "eco", why: `seletor de ação ecoado: a folha ${hit.path} é idêntica a um ${decl.arg} dos argumentos desta chamada de ${prov.tool} (D-154)` };
}

/** A varredura do núcleo (mesmas folhas, mesma classificação) + a camada de eco do seletor de ação (1.2.0). */
export function varrerResposta(dict: Dictionary, text: string, prov: Provenance): ScanResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  const cache = new Map<string, string>();
  const hits: ScanResult["hits"] = [];
  for (const leaf of leaves(parsed)) {
    for (const hit of hitsInText(dict, leaf.text, leaf.path)) {
      let c = classify(hit, prov, cache);
      if (c.class === "sem-explicacao") c = ecoDeSeletor(hit, leaf.text, prov) ?? c;
      hits.push({ ...hit, ...c });
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
  // 1.1.0: casos por ferramenta, campo declarado e eco exato (os mesmos do inventário do validator 2.14.1).
  const casos: { nome: string; tool: string; texto: string; args: unknown; page: string | null; espera: Classification }[] = [
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
  ];
  return casos.map((c) => {
    const { hits } = varrerResposta(dict, c.texto, { tool: c.tool, args: c.args, page: c.page, axe });
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
  canarios: { nome: string; ok: boolean; detalhe: string }[];
  respostas: number;
  /** Respostas que não puderam ser lidas inteiras (projeção cortada sem payload completo). */
  incompletas: { seq: unknown; tool: string; lado: "args" | "result"; motivo: string }[];
  porClasse: Record<string, number>;
  semExplicacao: { term: string; source: string; path: string; tool: string; count: number }[];
  perdoadas: { class: string; why: string; term: string; path: string; tool: string; count: number }[];
}

/**
 * Varre as chamadas do oráculo (eventos `call` da ponte, com o texto integral quando a projeção cortou) e o
 * tools/list exposto. `ler(caminho)` lê um arquivo do pacote (caminhos `evidence/raw/oracle/payloads/...`).
 */
export async function varrerPayloadsDoOraculo(o: {
  validatorDir: string; telasDir: string; eventos: Evento[]; toolsList: unknown[] | null; ler: (path: string) => string | null;
}): Promise<RelatorioVazamento> {
  const dict = await dicionarioDoValidator(o.validatorDir);
  const axe = bundleDoAxe(o.validatorDir);
  const pagina = textoDoSite(o.telasDir);
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
  const varrer = (texto: string, args: unknown, pg: string | null, tool: string): void => {
    for (const h of varrerResposta(dict, texto, { tool, args, page: pg, axe: axe.texto }).hits) {
      porClasse[h.class] = (porClasse[h.class] ?? 0) + 1;
      const k = `${h.class}|${h.term}|${h.path}|${tool}`;
      if (h.class === "sem-explicacao") {
        const u = sem.get(k) ?? { term: h.term, source: h.source, path: h.path, tool, count: 0 };
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
  }
  const nucleo = readFileSync(new URL("./nucleo.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  return {
    versao: VARREDURA_VERSAO,
    nucleo: (await import("node:crypto")).createHash("sha256").update(nucleo).digest("hex"),
    dicionario: dict.counts, axe: axe.origem, pagina: `govbr-telas/site (${pagina.length} caracteres de texto servido)`,
    canarios: canarios(dict, axe.texto), respostas, incompletas, porClasse,
    semExplicacao: [...sem.values()], perdoadas: [...perd.values()],
  };
}
