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

export type Forca = "obrigatoria" | "proibida" | "recomendacao";
export type Estrato = "DS" | "G";

/** Ordem importa: proibição antes de obrigação antes de recomendação; o primeiro que casa decide. */
export const MARCADORES: { forca: Forca; nome: string; re: RegExp }[] = [
  { forca: "proibida", nome: "nao-modal", re: /\b(não|nunca|jamais)\s+(se\s+)?(deve|devem|deverá|deverão|deveria|pode|podem|poderá|poderão)\b/i },
  { forca: "proibida", nome: "nao-imperativo", re: /(^|[.;:]\s+|^[-*]\s*)(não|nunca)\s+(use|utilize|usar|utilizar|aplique|coloque|insira|crie|altere|remova|misture|omita|esconda|oculte)\b/i },
  { forca: "proibida", nome: "proibido", re: /\b(proibid[oa]s?|vedad[oa]s?|não\s+é\s+permitid[oa]|não\s+são\s+permitid[oa]s)\b/i },
  { forca: "obrigatoria", nome: "deve", re: /\b(deve|devem|deverá|deverão)\b/i },
  { forca: "obrigatoria", nome: "obrigatorio", re: /\bobrigat[óo]ri[oa]s?\b|\bobrigatoriamente\b/i },
  { forca: "obrigatoria", nome: "necessario", re: /\b(é|são|será|serão)\s+(necessári[oa]s?|imprescindíve(l|is)|essencia(l|is)|indispensáve(l|is))\b/i },
  { forca: "obrigatoria", nome: "precisa", re: /\bprecisa(m)?\s+(ser|ter|estar|conter|possuir|receber)\b/i },
  { forca: "obrigatoria", nome: "assegure", re: /\b(certifique-se|garanta|assegure(-se)?)\b/i },
  { forca: "obrigatoria", nome: "sempre", re: /\b(use|utilize|mantenha|forneça|aplique)\s+sempre\b|\bsempre\s+(use|utilize|mantenha|forneça|aplique)\b/i },
  { forca: "recomendacao", nome: "recomenda", re: /\brecomend|\bevite\b|\bevitar\b|\bprefira\b|\bsugere|\bsugerimos\b|\bpreferencialmente\b|\bidealmente\b|\bse\s+possível\b|\bé\s+importante\b|\bé\s+aconselháve/i },
];

/** Motivos de exclusão aceitos no passo 2. Nenhum fala do oráculo. */
export const MOTIVOS_P2 = new Set([
  "nao-se-aplica",      // a obrigação trata de algo que a tela não tem (variante, densidade, tema, contexto móvel, conteúdo ausente)
  "sem-medicao",        // não é observável na página construída (processo de design, redação, decisão de produto, código-fonte)
  "nao-normativa",      // o marcador casou, mas a frase não impõe nada à página (descreve o DS, define termo, diz quando usar)
  "acoplada",           // violar exige uma segunda violação (não há mudança local isolada)
  "duplicada",          // mesma instância e mesmo observável de outra unidade (fica a de id menor), ou unidade do DS que repete uma recomendação do e-MAG; formato duplicada:<id>
  "so-andaime",         // a obrigação só se manifestaria numa instância de andaime (construída conforme, fora do sorteio)
  "conflito",           // cumprir esta obrigação violaria outra obrigação aplicável; a página conforme escolhe a outra e o conflito fica registrado
]);
const MOTIVO_PROIBIDO = /detector|checker|or[áa]culo|oracle|validator|busca|suporte|kb\b/i;

interface ManifestEntry { arquivo: string; url: string; aba: string; status: string; fonte?: string; commit?: string; caminho_fonte?: string; sha256: string }
interface Inventory { sorteaveis: { componente: string; instancias: { id: string }[] }[]; andaime: { componente: string }[]; fora: { componentes: string[] } }

export interface Unidade {
  id: string;
  fonte: { arquivo: string; url: string; aba: string; commit: string | null; caminhoFonte: string | null; sha256: string };
  componente: string | null;
  secao: string;
  texto: string;
  contexto: string | null;
  forca: Forca;
  marcador: string;
}

interface Pass2 {
  aceita: boolean;
  motivo?: string;
  justificativa: string;
  instancias?: string[];
  variantes?: { id: string; descricao: string; instancias?: string[] }[];
  alternativasValidas?: { id: string; descricao: string; instancias?: string[] }[];
  equivalenteEmag?: string | null;
}

const sha256 = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");
const norm = (t: string) => t.replace(/\s+/g, " ").trim();
/** Tira ênfase e links de markdown para o texto citável, sem mudar palavras. */
const plain = (t: string) => norm(t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""));

const GUIAS_GERAIS = new Set(["acessibilidade.md", "guias/acessibilidade-html.md", "guias/wai-aria.md", "guias/boas-praticas-de-html.md"]);

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
  let tableHeader: string | null = null;
  const fonte = { arquivo: entry.arquivo, url: entry.url, aba: entry.aba, commit: entry.commit ?? null, caminhoFonte: entry.caminho_fonte ?? null, sha256: entry.sha256 };
  const comp = componentOf(entry.arquivo);
  const secao = () => headings.filter(Boolean).join(" › ");
  const emit = (block: string, forcedByHeading: boolean) => {
    const ctx = plain(block);
    if (!ctx) return;
    const sentences = splitSentences(ctx);
    let any = false;
    for (const s of sentences) {
      const c = classify(s);
      if (!c) continue;
      any = true;
      out.push({ id: "", fonte, componente: comp, secao: secao(), texto: s, contexto: sentences.length > 1 ? ctx : null, forca: c.forca, marcador: c.nome });
    }
    if (!any && forcedByHeading) out.push({ id: "", fonte, componente: comp, secao: secao(), texto: ctx, contexto: null, forca: "obrigatoria", marcador: "titulo-obrigatorio" });
  };
  const flush = () => { if (para.length) emit(para.join(" "), false); para = []; };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*(```|~~~)/.test(line)) { flush(); fence = !fence; continue; }
    if (fence) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { flush(); tableHeader = null; const lvl = h[1].length; headings.length = lvl - 1; headings[lvl - 1] = plain(h[2]); continue; }
    if (/^\s*$/.test(line)) { flush(); tableHeader = null; continue; }
    if (/^\s*<[^>]+>\s*$/.test(line)) { flush(); continue; }
    if (/^\s*\|/.test(line)) {
      flush();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;
      const cells = line.split("|").slice(1, -1).map(c => plain(c));
      if (tableHeader === null) { tableHeader = cells.join(" · "); continue; }
      const underObrig = /obrigat[óo]ri/i.test(headings[headings.length - 1] ?? "");
      emit(`${cells.join(" · ")}`, underObrig);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) { flush(); para.push(line.replace(/^\s*([-*+]|\d+[.)])\s+/, "")); continue; }
    para.push(line);
  }
  flush();
  return out;
}

function extractEmag(entry: ManifestEntry, text: string): Unidade[] {
  const out: Unidade[] = [];
  const fonte = { arquivo: entry.arquivo, url: entry.url, aba: entry.aba, commit: entry.commit ?? null, caminhoFonte: entry.caminho_fonte ?? null, sha256: entry.sha256 };
  const parts = text.split(/^#### /m).slice(1);
  for (const p of parts) {
    const [title, ...rest] = p.split(/\r?\n/);
    if (!/^Recomenda/.test(title)) continue;
    const ctx = plain(rest.join(" ").replace(/```[\s\S]*?```/g, "")).slice(0, 1200);
    out.push({ id: "", fonte, componente: null, secao: "e-MAG 3.1", texto: plain(title), contexto: ctx, forca: "obrigatoria", marcador: "emag-recomendacao" });
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
  const pass2: Record<string, Pass2> = existsSync(PASS2) ? JSON.parse(readFileSync(PASS2, "utf8")).regras : {};

  const regras = unidades.map(u => {
    let p1: string | null = null;
    if (u.forca === "recomendacao") p1 = "forca";
    else if (u.componente && out.has(u.componente)) p1 = "componente-fora-da-tela";
    else if (u.componente && scaffold.has(u.componente)) p1 = "andaime";
    else if (u.componente && !drawable.has(u.componente)) throw new Error(`componente sem lugar no inventário: ${u.componente}`);
    const j = p1 ? undefined : pass2[u.id];
    if (j) {
      if (j.motivo?.startsWith("duplicada:") && !unidades.some(x => x.id === j.motivo!.slice(10))) throw new Error(`duplicada de id inexistente em ${u.id}: ${j.motivo}`);
      if (!j.aceita) {
        const base = (j.motivo ?? "").split(":")[0];
        if (!MOTIVOS_P2.has(base)) throw new Error(`motivo inválido em ${u.id}: ${j.motivo}`);
        if (MOTIVO_PROIBIDO.test(`${j.motivo} ${j.justificativa}`)) throw new Error(`exclusão por detector/oráculo é proibida (R4): ${u.id}`);
      } else {
        if (!j.instancias?.length || !j.variantes?.length) throw new Error(`aceita sem instância ou variante: ${u.id}`);
        for (const i of j.instancias) if (!instanceIds.has(i)) throw new Error(`instância desconhecida em ${u.id}: ${i}`);
        for (const v of [...j.variantes, ...(j.alternativasValidas ?? [])]) for (const i of v.instancias ?? []) if (!j.instancias.includes(i)) throw new Error(`variante ${v.id} de ${u.id} fora dos hospedeiros: ${i}`);
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
      variantes: j?.aceita ? j.variantes ?? [] : [],
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
