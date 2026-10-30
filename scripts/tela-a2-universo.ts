/**
 * Tela A2 — universo de obrigações e elegibilidade (NAT-110, D-141, revisão R4).
 *
 * Lê SOMENTE o corpus literal das fontes oficiais versionadas
 * (`../ds-rules/govbr-ds-3.7.0-corpus/`: texto publicado em gov.br/ds para o DS 3.7.0 nos
 * commits fixados em COLETA.json, e a página oficial do e-MAG 3.1) e confere o sha256 de cada
 * arquivo contra o MANIFEST.json do próprio corpus, cujo sha256 está em tela-a2/parametros.json.
 * Não lê a base do oráculo (`govbr-ds-validator/`, `ds-rules/govbr-ds-3.7.0-corpus/normalizacao/`,
 * `ds-rules/0*`), `checker-aliases.json`, `kb-aliases*.json`, `results/` nem `reports/`.
 *
 * Universo (mecânico, sem julgamento):
 *  - arquivos do DS: cada bloco (parágrafo, item de lista, linha de tabela) fora de blocos de
 *    código vira frases; uma frase entra no universo quando casa um marcador de força
 *    (MARCADORES). A frase é a obrigação; o bloco inteiro vai em `contexto`.
 *    Linhas de tabela sob um título que diz "obrigatóri" (ex.: "Propriedades obrigatórias")
 *    entram como obrigatórias (marcador `titulo-obrigatorio`).
 *  - e-MAG 3.1: a unidade é a recomendação (título "Recomendação X.Y"), força obrigatória por
 *    norma (Portaria SLTI/MP nº 3/2007 — fundamento declarado no plano; não está no texto coletado).
 *
 * Elegibilidade:
 *  - passo 1 (mecânico): F1 força ∈ {obrigatoria, proibida} senão `forca`;
 *    F2 componente do arquivo: fora do inventário → `componente-fora-da-tela`, andaime → `andaime`.
 *    Arquivos sem componente (fundamentos, padrões, guias, e-MAG) passam ao passo 2.
 *  - passo 2 (julgado, tela-a2/elegibilidade-passo2.json, por id): aceita, ou um dos MOTIVOS_P2.
 *    Motivo que fale de detector, busca ou suporte do oráculo é recusado pelo script.
 *  - estrato: `G` (acessibilidade geral) se a fonte é e-MAG ou guia geral de acessibilidade do DS,
 *    ou se o passo 2 anotou `equivalenteEmag` (a violação também viola uma recomendação do e-MAG);
 *    senão `DS` (precisa do texto do DS para ser reconhecida como defeito).
 *
 * Saídas: tela-a2/universo.json e tela-a2/elegibilidade.json (todas as unidades, com motivo).
 * Uso: npm run tela-a2:universo   (idempotente; não sorteia nada)
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const CORPUS = join(ROOT, "../ds-rules/govbr-ds-3.7.0-corpus");
const INVENTORY = join(ROOT, "tela-a2/inventario.json");
const PASS2 = join(ROOT, "tela-a2/elegibilidade-passo2.json");
const OUT_UNIVERSE = join(ROOT, "tela-a2/universo.json");
const OUT_ELIG = join(ROOT, "tela-a2/elegibilidade.json");

export type Forca = "obrigatoria" | "proibida" | "recomendacao" | "a-julgar";
export type Estrato = "DS" | "G";

/** Fronteira de palavra que entende acento (\b do JavaScript não trata "é" como letra). */
const W = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${body})(?![\\p{L}\\p{N}_])`, "iu");
/**
 * Imperativos que abrem prescrição no texto do DS. Lista fechada, tirada da contagem das palavras
 * iniciais de frase do corpus (2026-10-30); vale no início da frase (depois de "Atenção:" etc.)
 * ou logo depois de vírgula ("Caso X, utilize Y").
 */
export const IMPERATIVOS = ["utilize", "use", "forneça", "mantenha", "tenha", "ofereça", "lembre-se", "verifique", "opte", "garanta", "selecione",
  "organize", "dê", "deixe", "disponibilize", "escreva", "faça", "identifique", "apresente", "posicione", "crie", "adicione", "exiba", "inclua",
  "procure", "escolha", "siga", "associe", "informe", "torne", "fique", "coloque", "indique", "altere", "permita", "marque", "respeite",
  "padronize", "ordene", "relacione", "oriente", "insira", "divida", "separe", "trabalhe", "certifique-se", "considere", "aplique", "defina",
  "evite", "prefira", "assegure", "assegure-se", "priorize", "limite", "agrupe", "alinhe", "destaque", "mostre", "ofereça", "sinalize",
  "usar", "utilizar", "incluir", "fornecer", "definir", "seguir", "manter", "oferecer", "evitar", "informar", "exibir", "apresentar"];
const IMP = IMPERATIVOS.join("|");
const LABEL = "(?:(?:atenção|importante|obs|observação|nota|dica)\\s*\\d*\\s*:\\s*)?";

/**
 * Candidatos a obrigação. Ordem importa: o primeiro que casa decide a força proposta; "a-julgar" vai
 * ao passo 2, onde a força é decidida pelo contexto (recomendação sai lá, com motivo `forca`).
 */
export const MARCADORES: { forca: Forca; nome: string; re: RegExp }[] = [
  { forca: "proibida", nome: "nao-modal", re: W("(não|nunca|jamais)\\s+(se\\s+)?(deve|devem|deverá|deverão|deveria|pode|podem|poderá|poderão|precisa|precisam)") },
  { forca: "proibida", nome: "nao-imperativo", re: new RegExp(`(^|[.;:,]\\s+)${LABEL}(não|nunca|jamais)\\s+(se\\s+)?(${IMP}|\\p{L}+(?:e|a|ça|nha|ga|ja)(?:-se)?)(?![\\p{L}\\p{N}_])`, "iu") },
  { forca: "proibida", nome: "proibido", re: W("proibid[oa]s?|vedad[oa]s?|não\\s+(é|são)\\s+permitid[oa]s?|em\\s+hipótese\\s+alguma|nunca") },
  { forca: "obrigatoria", nome: "deve", re: W("deve|devem|deverá|deverão|deve-se|devem-se") },
  { forca: "obrigatoria", nome: "obrigatorio", re: W("obrigat[óo]ri[oa]s?|obrigatoriamente|obrigatoriedade") },
  { forca: "obrigatoria", nome: "necessario", re: W("(é|são|será|serão|faz-se|torna-se)\\s+(necessári[oa]s?|imprescindíve(l|is)|essencia(l|is)|indispensáve(l|is)|preciso)") },
  { forca: "obrigatoria", nome: "precisa", re: W("precisa(m)?|necessita(m)?|exige(m)?|requer(em)?|tem\\s+que|têm\\s+que") },
  { forca: "obrigatoria", nome: "assegure", re: W("certifique-se|garanta|assegure(-se)?") },
  { forca: "recomendacao", nome: "recomenda", re: W("recomenda\\p{L}*|recomendáve(l|is)|sugere\\p{L}*|sugerimos|preferencialmente|idealmente|se\\s+possível|sempre\\s+que\\s+possível|é\\s+aconselháve(l|is)") },
  { forca: "a-julgar", nome: "imperativo", re: new RegExp(`(^|,\\s+)${LABEL}(sempre\\s+|somente\\s+|só\\s+|apenas\\s+)?(${IMP})(?![\\p{L}\\p{N}_])`, "iu") },
  { forca: "a-julgar", nome: "importante", re: W("é\\s+importante|importante:|atenção:|lembre-se|cuidado") },
  { forca: "a-julgar", nome: "restritivo", re: new RegExp(`^${LABEL}(sempre|somente|só|apenas|nunca|jamais|não)(?![\\p{L}\\p{N}_])`, "iu") },
];

/** Motivos de exclusão aceitos no passo 2. Nenhum fala do oráculo. */
export const MOTIVOS_P2 = new Set([
  "nao-se-aplica",      // a obrigação trata de algo que a tela não tem (variante, densidade, tema, contexto móvel, conteúdo ausente)
  "sem-medicao",        // não é observável na página construída (processo de design, redação, decisão de produto, código-fonte)
  "nao-normativa",      // o marcador casou, mas a frase não impõe nada à página (descreve o DS, define termo, diz quando usar)
  "acoplada",           // violar exige uma segunda violação (não há mudança local isolada)
  "duplicada",          // mesma instância e mesmo observável de outra unidade (fica a de id menor), ou unidade do DS que repete uma recomendação do e-MAG; formato duplicada:<id>
  "so-andaime",         // a obrigação só se manifestaria numa instância de andaime (construída conforme, fora do sorteio)
  "conflito",           // conflito normativo explícito com outra obrigação aplicável; a decisão e o fundamento ficam na justificativa e no plano
  "forca",              // candidata "a-julgar" (imperativo, "é importante", "Atenção:") que, lida no contexto, é recomendação ou orientação de uso
  "escopo",             // recorte prévio declarado no plano (ex.: contrato de observação 1280×900, sem conclusão sobre responsividade); não é "sem medição"
]);
const MOTIVO_PROIBIDO = /detector|checker|or[áa]culo|oracle|validator|busca|suporte|kb\b/i;

interface ManifestEntry { arquivo: string; url: string; aba: string; status: string; fonte?: string; commit?: string; caminho_fonte?: string; sha256: string }
interface Inventory { sorteaveis: { componente: string; instancias: { id: string }[] }[]; andaime: { componente: string }[]; fora: { componentes: string[] }; embutidos?: Record<string, string[] | string> }

export interface Unidade {
  id: string;
  fonte: { arquivo: string; url: string; aba: string; commit: string | null; caminhoFonte: string | null; sha256: string };
  componente: string | null;
  secao: string;
  texto: string;
  contexto: string | null;
  /** Bloco anterior (para item de lista: a introdução que o precede), para não perder antecedente e condição. */
  antecedente: string | null;
  forca: Forca;
  marcador: string;
}

interface Pass2 {
  aceita: boolean;
  motivo?: string;
  justificativa: string;
  instancias?: string[];
  variantes?: { id: string; descricao: string; instancias?: string[]; clausula?: string }[];
  alternativasValidas?: { id: string; descricao: string; instancias?: string[] }[];
  equivalenteEmag?: string | null;
  tipo?: string;
  caminhoDeteccao?: string[];
}

const sha256 = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");
const norm = (t: string) => t.replace(/\s+/g, " ").trim();
/** Tira ênfase e links de markdown para o texto citável, sem mudar palavras. */
const plain = (t: string) => norm(t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""));

/** Guias gerais de acessibilidade do site do DS (estrato G). boas-praticas-de-html.md não é de acessibilidade: fica DS. */
const GUIAS_GERAIS = new Set(["acessibilidade.md", "guias/acessibilidade-html.md", "guias/wai-aria.md"]);

function componentOf(arquivo: string): string | null {
  const m = /^componentes\/([a-z]+)__/.exec(arquivo);
  return m ? m[1] : null;
}

function classify(sentence: string): { forca: Forca; nome: string } | null {
  for (const m of MARCADORES) if (m.re.test(sentence)) return { forca: m.forca, nome: m.nome };
  return null;
}

function splitSentences(block: string): string[] {
  return block.split(/(?<=[.!?;])\s+(?=[A-ZÀ-Ý*`"“(])/).map(norm).filter(s => s.length > 0);
}

function extractDs(entry: ManifestEntry, text: string): Unidade[] {
  const body = text.replace(/^<!--[\s\S]*?-->/, "");
  const lines = body.split(/\r?\n/);
  const out: Unidade[] = [];
  const headings: string[] = [];
  let fence = false;
  let para: string[] = [];
  let isItem = false;
  let tableHeader: string[] | null = null;
  /** Linhas da tabela de especificação em curso: a tabela inteira é UMA unidade (valores de token). */
  let specRows: string[] = [];
  const flushSpec = () => {
    if (!specRows.length) return;
    out.push({ id: "", fonte, componente: comp, secao: secao(), texto: `Tabela de especificação — ${secao()}`, contexto: `${(tableHeader ?? []).join(" · ")} || ${specRows.join(" || ")}`, antecedente: prevBlock, forca: "a-julgar", marcador: "tabela-especificacao" });
    specRows = [];
  };
  /** Último parágrafo que não é item de lista, na mesma seção: o antecedente dos itens que o seguem. */
  let leadIn: string | null = null;
  let prevBlock: string | null = null;
  const fonte = { arquivo: entry.arquivo, url: entry.url, aba: entry.aba, commit: entry.commit ?? null, caminhoFonte: entry.caminho_fonte ?? null, sha256: entry.sha256 };
  const comp = componentOf(entry.arquivo);
  const secao = () => headings.filter(Boolean).join(" › ");
  const headingForce = () => {
    const h = headings[headings.length - 1] ?? "";
    return /obrigat[óo]ri/i.test(h) ? classify("obrigatório") : classify(h);
  };
  const emit = (block: string, kind: "para" | "item" | "row", classifyText?: string) => {
    const ctx = plain(block);
    if (!ctx) return;
    const antecedente = kind === "item" ? leadIn : prevBlock;
    const sentences = kind === "row" ? [ctx] : splitSentences(ctx);
    let any = false;
    for (const s of sentences) {
      const c = classify(kind === "row" && classifyText ? classifyText : s);
      if (!c) continue;
      any = true;
      out.push({ id: "", fonte, componente: comp, secao: secao(), texto: s, contexto: sentences.length > 1 ? ctx : null, antecedente, forca: c.forca, marcador: c.nome });
    }
    if (!any) {
      // Requisito herdado: item sob introdução prescritiva ("Não utilize Steps:"), linha de tabela ou
      // item sob título prescritivo ("Propriedades obrigatórias", "Não faça").
      const lead = kind === "item" && leadIn && /:\s*$/.test(leadIn) ? classify(leadIn) : null;
      const head = kind !== "para" ? headingForce() : null;
      const inh = lead ?? head;
      if (inh) out.push({ id: "", fonte, componente: comp, secao: secao(), texto: ctx, contexto: null, antecedente, forca: inh.forca, marcador: lead ? "herdado-antecedente" : kind === "row" && /obrigat[óo]ri/i.test(headings[headings.length - 1] ?? "") ? "titulo-obrigatorio" : "herdado-titulo" });
    }
    if (kind === "para") leadIn = ctx;
    prevBlock = ctx;
  };
  const flush = () => { if (para.length) emit(para.join(" "), isItem ? "item" : "para"); para = []; isItem = false; };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*(```|~~~)/.test(line)) { flush(); fence = !fence; continue; }
    if (fence) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { flush(); flushSpec(); tableHeader = null; leadIn = null; prevBlock = null; const lvl = h[1].length; headings.length = lvl - 1; headings[lvl - 1] = plain(h[2]); continue; }
    if (/^\s*$/.test(line)) { flush(); flushSpec(); tableHeader = null; continue; }
    if (/^\s*<[^>]+>\s*$/.test(line)) { flush(); continue; }
    if (/^\s*\|/.test(line)) {
      flush();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;
      const cells = line.split("|").slice(1, -1).map(c => plain(c));
      if (tableHeader === null) { tableHeader = cells; continue; }
      if (/especifica/i.test(headings.join(" "))) { specRows.push(cells.join(" · ")); continue; }
      // A coluna conta: "Uso: Obrigatório", "Não faça: ...". O texto citável continua sendo a linha.
      const annotated = cells.map((c, i) => (tableHeader![i] ? `${tableHeader![i]}: ${c}` : c)).join(" · ");
      emit(cells.join(" · "), "row", annotated);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) { flush(); isItem = true; para.push(line.replace(/^\s*([-*+]|\d+[.)])\s+/, "")); continue; }
    para.push(line);
  }
  flush();
  flushSpec();
  return out;
}

/** Linha literal da fonte, com a mesma limpeza de markdown do texto citável. */
function sourceLineText(line: string): string { return plain(line.replace(/^\s*([-*+]|\d+[.)])\s+/, "").replace(/^#{1,6}\s+/, "").replace(/\|/g, " · ")); }

/** Seção (títulos acima) de uma linha do arquivo. */
function secaoAt(text: string, lineNo: number): string {
  const lines = text.replace(/^<!--[\s\S]*?-->/, (m) => m.replace(/[^\n]/g, "")).split(/\r?\n/);
  const heads: string[] = []; let fence = false;
  for (let i = 0; i < Math.min(lineNo - 1, lines.length); i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(lines[i]);
    if (h) { heads.length = h[1].length - 1; heads[h[1].length - 1] = plain(h[2]); }
  }
  return heads.filter(Boolean).join(" › ");
}

/**
 * Auditoria de leitura (Revisão Codex 1, item 2): frases normativas que o extrator deixou de fora,
 * achadas lendo os arquivos inteiros. Cada uma é conferida literalmente na linha indicada.
 */
function extractAudit(manifest: ManifestEntry[], already: Unidade[]): Unidade[] {
  const AUDIT = join(ROOT, "tela-a2/universo-auditoria.json");
  if (!existsSync(AUDIT)) return [];
  const entries = JSON.parse(readFileSync(AUDIT, "utf8")).itens as { arquivo: string; linha: number; texto: string; forcaProposta: Forca; porque: string }[];
  const out: Unidade[] = [];
  const seen = new Set(already.map(u => `${u.fonte.arquivo}|${u.texto}`));
  const tables = new Map<string, { entry: ManifestEntry; arquivo: string; sec: string; start: number; rows: string[]; forcas: Forca[] }>();
  for (const a of entries) {
    const e = manifest.find(m => m.arquivo === a.arquivo);
    if (!e) throw new Error(`auditoria: arquivo fora do MANIFEST: ${a.arquivo}`);
    const text = readFileSync(join(CORPUS, a.arquivo), "utf8");
    const line = text.split(/\r?\n/)[a.linha - 1] ?? "";
    const texto = norm(a.texto);
    if (!sourceLineText(line).includes(texto) && !plain(line).includes(texto)) throw new Error(`auditoria: texto não está na linha ${a.arquivo}:${a.linha}: ${texto.slice(0, 60)}`);
    const lines = text.split(/\r?\n/);
    if (/^\s*\|/.test(line)) {
      // Linha de tabela: a tabela inteira é UMA unidade (mesma granularidade das tabelas de especificação).
      let start = a.linha - 1; while (start > 0 && /^\s*\|/.test(lines[start - 1])) start--;
      const sec = secaoAt(text, start + 1);
      if (/especifica/i.test(sec)) continue; // já é unidade tabela-especificacao
      const k = `${a.arquivo}#${start + 1}`;
      const g = tables.get(k) ?? { entry: e, arquivo: a.arquivo, sec, start: start + 1, rows: [] as string[], forcas: [] as Forca[] };
      g.rows.push(`l.${a.linha}: ${texto}`); g.forcas.push(a.forcaProposta); tables.set(k, g);
      continue;
    }
    if (seen.has(`${a.arquivo}|${texto}`)) continue;
    seen.add(`${a.arquivo}|${texto}`);
    const fonte = { arquivo: e.arquivo, url: e.url, aba: e.aba, commit: e.commit ?? null, caminhoFonte: e.caminho_fonte ?? null, sha256: e.sha256 };
    out.push({ id: "", fonte, componente: componentOf(a.arquivo), secao: secaoAt(text, a.linha), texto, contexto: plain(line), antecedente: null, forca: a.forcaProposta, marcador: "auditoria-leitura" });
  }
  for (const g of tables.values()) {
    const e = g.entry;
    const fonte = { arquivo: e.arquivo, url: e.url, aba: e.aba, commit: e.commit ?? null, caminhoFonte: e.caminho_fonte ?? null, sha256: e.sha256 };
    const forca: Forca = g.forcas.includes("proibida") ? "proibida" : g.forcas.includes("obrigatoria") ? "obrigatoria" : "a-julgar";
    out.push({ id: "", fonte, componente: componentOf(g.arquivo), secao: g.sec, texto: `Tabela normativa — ${g.sec} (a partir da linha ${g.start})`, contexto: g.rows.join(" || "), antecedente: null, forca, marcador: "auditoria-tabela" });
  }
  return out;
}

function extractEmag(entry: ManifestEntry, text: string): Unidade[] {
  const out: Unidade[] = [];
  const fonte = { arquivo: entry.arquivo, url: entry.url, aba: entry.aba, commit: entry.commit ?? null, caminhoFonte: entry.caminho_fonte ?? null, sha256: entry.sha256 };
  const parts = text.split(/^#### /m).slice(1);
  for (const p of parts) {
    const [title, ...rest] = p.split(/\r?\n/);
    if (!/^Recomenda/.test(title)) continue;
    // Texto integral da recomendação (sem corte), até a próxima seção; código preservado entre crases.
    const body = rest.join("\n").split(/^### /m)[0];
    out.push({ id: "", fonte, componente: null, secao: "e-MAG 3.1", texto: plain(title), contexto: norm(body.replace(/\[Voltar ao sumário\]\(#sumario\)/g, "")), antecedente: null, forca: "obrigatoria", marcador: "emag-recomendacao" });
  }
  return out;
}

export function buildUniverse(): { unidades: Unidade[]; meta: Record<string, unknown> } {
  const manifestRaw = readFileSync(join(CORPUS, "MANIFEST.json"));
  const manifest = JSON.parse(manifestRaw.toString("utf8")) as ManifestEntry[];
  const coleta = JSON.parse(readFileSync(join(CORPUS, "COLETA.json"), "utf8"));
  const unidades: Unidade[] = [];
  const pulados: { arquivo: string; motivo: string }[] = [];
  for (const e of manifest) {
    const buf = readFileSync(join(CORPUS, e.arquivo));
    if (sha256(buf) !== e.sha256) throw new Error(`sha256 diverge do MANIFEST: ${e.arquivo}`);
    if (e.status !== "ok") { pulados.push({ arquivo: e.arquivo, motivo: e.status }); continue; }
    const text = buf.toString("utf8");
    unidades.push(...(e.arquivo.startsWith("emag/") ? extractEmag(e, text) : extractDs(e, text)));
  }
  unidades.push(...extractAudit(manifest, unidades));
  const seen = new Map<string, number>();
  for (const u of unidades) {
    const base = "a2-" + sha256(`${u.fonte.arquivo}|${u.secao}|${u.texto}`).slice(0, 12);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    u.id = n === 1 ? base : `${base}-${n}`;
  }
  const porForca: Record<string, number> = {};
  for (const u of unidades) porForca[u.forca] = (porForca[u.forca] ?? 0) + 1;
  return {
    unidades,
    meta: {
      fonte: "ds-rules/govbr-ds-3.7.0-corpus (texto publicado em gov.br/ds, DS 3.7.0; e-MAG 3.1), acesso 2026-10-15",
      refs: coleta.refs,
      manifestSha256: sha256(manifestRaw),
      arquivosLidos: manifest.length - pulados.length,
      arquivosPulados: pulados,
      marcadores: MARCADORES.map(m => ({ forca: m.forca, nome: m.nome, re: m.re.source })),
      total: unidades.length,
      porForca,
    },
  };
}

function main() {
  const { unidades, meta } = buildUniverse();
  writeFileSync(OUT_UNIVERSE, JSON.stringify({ _meta: { ...meta, geradoPor: "scripts/tela-a2-universo.ts" }, unidades }, null, 2) + "\n");

  const inv = JSON.parse(readFileSync(INVENTORY, "utf8")) as Inventory;
  const drawable = new Set(inv.sorteaveis.map(c => c.componente));
  const scaffold = new Set(inv.andaime.map(c => c.componente));
  const out = new Set(inv.fora.componentes);
  const instanceIds = new Set(inv.sorteaveis.flatMap(c => c.instancias.map(i => i.id)));
  /** Componente de andaime embutido em instância sorteável: só essas instâncias podem hospedar. */
  const embedded = new Map(Object.entries(inv.embutidos ?? {}).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, v as string[]]));
  const pass2: Record<string, Pass2> = existsSync(PASS2) ? JSON.parse(readFileSync(PASS2, "utf8")).regras : {};

  const regras = unidades.map(u => {
    let p1: string | null = null;
    if (u.forca === "recomendacao") p1 = "forca";
    else if (u.componente && out.has(u.componente)) p1 = "componente-fora-da-tela";
    else if (u.componente && scaffold.has(u.componente) && !embedded.has(u.componente)) p1 = "andaime";
    else if (u.componente && !drawable.has(u.componente) && !embedded.has(u.componente)) throw new Error(`componente sem lugar no inventário: ${u.componente}`);
    const j = p1 ? undefined : pass2[u.id];
    if (j) {
      if (j.motivo?.startsWith("duplicada:") && !unidades.some(x => x.id === j.motivo!.slice(10))) throw new Error(`duplicada de id inexistente em ${u.id}: ${j.motivo}`);
      if (!j.aceita) {
        const base = (j.motivo ?? "").split(":")[0];
        if (!MOTIVOS_P2.has(base)) throw new Error(`motivo inválido em ${u.id}: ${j.motivo}`);
        if (MOTIVO_PROIBIDO.test(`${j.motivo} ${j.justificativa}`)) throw new Error(`exclusão por detector/oráculo é proibida (R4): ${u.id}`);
      } else {
        if (!j.instancias?.length || !j.variantes?.length) throw new Error(`aceita sem instância ou variante: ${u.id}`);
        if (!["estrutura-classe", "visual-token", "comportamento"].includes(j.tipo ?? "")) throw new Error(`aceita sem tipo válido: ${u.id}`);
        if (!j.caminhoDeteccao?.length || j.caminhoDeteccao.some(c => !["axe", "medicao", "leitura-da-regra", "interacao"].includes(c))) throw new Error(`aceita sem caminhoDeteccao válido: ${u.id}`);
        for (const i of j.instancias) if (!instanceIds.has(i)) throw new Error(`instância desconhecida em ${u.id}: ${i}`);
        for (const v of j.alternativasValidas ?? []) for (const i of v.instancias ?? []) if (!instanceIds.has(i)) throw new Error(`alternativa ${v.id} de ${u.id}: instância desconhecida ${i}`);
        const allowed = u.componente ? embedded.get(u.componente) : undefined;
        if (allowed && scaffold.has(u.componente!)) for (const i of j.instancias) if (!allowed.includes(i)) throw new Error(`${u.id}: ${u.componente} não está embutido em ${i}`);
        for (const v of j.variantes) for (const i of v.instancias ?? []) if (!j.instancias.includes(i)) throw new Error(`variante ${v.id} de ${u.id} fora dos hospedeiros: ${i}`);
        for (const i of j.instancias) if (!j.variantes.some(v => !v.instancias || v.instancias.includes(i))) throw new Error(`hospedeiro sem variante em ${u.id}: ${i}`);
      }
    }
    const geral = u.fonte.arquivo.startsWith("emag/") || GUIAS_GERAIS.has(u.fonte.arquivo) || Boolean(j?.equivalenteEmag);
    return {
      id: u.id,
      componente: u.componente,
      arquivo: u.fonte.arquivo,
      texto: u.texto,
      forca: u.forca,
      passo1: p1 ? "rejeitada" : "aceita",
      passo2: p1 ? null : j ? (j.aceita ? "aceita" : "rejeitada") : "pendente",
      motivo: p1 ?? (j && !j.aceita ? j.motivo ?? null : null),
      justificativa: j?.justificativa ?? null,
      instancias: j?.aceita ? j.instancias ?? [] : [],
      variantes: j?.aceita ? (j.variantes ?? []).map(v => ({ ...v, clausula: v.clausula ?? u.texto })) : [],
      tipo: j?.aceita ? j.tipo ?? null : null,
      caminhoDeteccao: j?.aceita ? j.caminhoDeteccao ?? null : null,
      alternativasValidas: j?.aceita ? j.alternativasValidas ?? [] : [],
      equivalenteEmag: j?.equivalenteEmag ?? null,
      estrato: j?.aceita ? (geral ? "G" : "DS") : null,
    };
  });

  const count = (f: (r: (typeof regras)[number]) => string | null) => {
    const c: Record<string, number> = {};
    for (const r of regras) { const k = f(r); if (k) c[k] = (c[k] ?? 0) + 1; }
    return c;
  };
  const elig = regras.filter(r => r.passo2 === "aceita");
  const resumo = {
    universo: regras.length,
    rejeitadasPasso1: count(r => (r.passo1 === "rejeitada" ? r.motivo : null)),
    chegaramPasso2: regras.filter(r => r.passo1 === "aceita").length,
    pendentesPasso2: regras.filter(r => r.passo2 === "pendente").length,
    rejeitadasPasso2: count(r => (r.passo2 === "rejeitada" ? (r.motivo ?? "").split(":")[0] : null)),
    elegiveis: elig.length,
    elegiveisPorEstrato: count(r => (r.passo2 === "aceita" ? r.estrato : null)),
  };
  writeFileSync(OUT_ELIG, JSON.stringify({
    _meta: { geradoPor: "scripts/tela-a2-universo.ts", arquivoUniverso: "tela-a2/universo.json", universoSha256: sha256(readFileSync(OUT_UNIVERSE)), passo2: "tela-a2/elegibilidade-passo2.json", ...resumo },
    regras,
  }, null, 2) + "\n");
  console.log(JSON.stringify(resumo, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
