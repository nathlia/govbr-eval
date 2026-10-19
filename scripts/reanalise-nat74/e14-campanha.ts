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
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { distingueComDeFerramentas, mascararComFerramentas } from "../painel/mascara";
import { POLITICA_PRINCIPAL, gravar, jsonTexto, lerJson, ordenar, sha } from "./comum";
import { verificarCegueira, type Cegueira } from "./e14-cegueira";
import { ESQUEMA_RESPOSTAS, FORMATO_LOTE, hashDaChave, idOpaco, mascarar, nomeLote, type CartaoCego, type ItemChave } from "./e14-comum";
import { cartaoCego, normas, type Extracao } from "./e14-fila";
import { leiameJuiz, tamanhosDosLotes } from "./e14-preparar";

export const E14_CAMPANHA_VERSAO = "nat78-primeira-passada-1.0.0";
type Card = SemanticPackage["cards"][number];

/** Termos que separam `sem` dos braços com ferramentas (o que `armLeaks` aponta), depois da máscara com × ferramentas. */
const TERMOS_DE_FERRAMENTA: readonly [RegExp, string][] = [
  [/\b(?:mcp__[A-Za-z0-9_-]+__)?(?:scan_page|verify_finding|get_finding_details|check_[a-z_]+|inspect_computed_styles|run_axe_scan|save_report)\b/g, "[ferramenta citada]"],
  [/\bor[aá]culos?\b|\bvalidator\b|\bvalidador\b|\bmcp\b/gi, "[termo citado]"],
];
export function mascararTrio(t: string | null): string | null {
  if (t === null) return null;
  return TERMOS_DE_FERRAMENTA.reduce((s, [re, por]) => s.replace(re, por), mascararComFerramentas(mascarar(t)));
}
const profundo = <T>(v: T): T => (typeof v === "string" ? mascararTrio(v) : Array.isArray(v) ? v.map(profundo) : v && typeof v === "object"
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, profundo(x)])) : v) as T;

const BRACO: Record<string, string> = { none: "sem", "knowledge-free": "ferramentas", evaluation: "com" };
export function bracoDoRun(r: SemanticPackage["runs"][number]): string {
  if (r.kind !== "agente") return r.tool === "axe-core" ? "lb-axe" : "lb-validator";
  const p = (r.config as { oracleProfile?: string } | null)?.oracleProfile ?? "";
  if (!BRACO[p]) throw new Error(`perfil de oráculo desconhecido no run ${r.id}: ${p}`);
  return BRACO[p];
}

interface Ref { _meta: { version: string }; violations: { id: string; state: string; expectedCount?: number; rules: string[]; description: string }[] }
export interface PreparoCampanha { arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>; cegueira: Cegueira; falhasTrio: string[] }

export function prepararCampanha(analises: string[]): PreparoCampanha {
  const nr = normas();
  const itens: { item: ItemChave; card: Card; cartao: CartaoCego }[] = [];
  const telas: Record<string, { nome: string; versao: string; endereco: string; defeitos: unknown[] }> = {};
  for (const dir of analises) {
    const pkg = lerJson<SemanticPackage>(join(dir, "revisao", "package.json"));
    const camp = lerJson<{ campaignId: string; design: { screens: { id: string; label: string }[] } }>(join(dir, "entradas", "campanha.json"));
    const ref = lerJson<Ref>(join(dir, "entradas", "referencia.json"));
    const resumo = lerJson<{ execucoes: { identidade: { tela: { id: string; label: string } } }[] }>(join(dir, "summary.json"));
    const { id: telaId, label } = resumo.execucoes[0].identidade.tela;
    const nome = `Tela ${label}`;
    const specs = ref.violations.map(v => ({ id: v.id, estado: v.state, unidades: v.expectedCount ?? 1, descricao: mascararTrio(v.description),
      normas: v.rules.map(nr.resolver).filter(Boolean) }));
    const endereco = lerJson<{ url: string }>(join(dir, "revisao", "capture.json")).url;
    telas[telaId] ??= { nome, versao: ref._meta.version, endereco, defeitos: specs };
    const specDe = new Map(pkg.units.map(u => [u.id, u.specId]));
    const runDe = new Map(pkg.runs.flatMap(r => r.cardIds.map(id => [id, r] as const)));
    for (const card of pkg.cards) {
      const run = runDe.get(card.id);
      if (!run) throw new Error(`cartão sem run: ${card.id}`);
      const chave = `${camp.campaignId}|${basename(dir)}|${card.id}`;
      const item: ItemChave = { id: idOpaco(chave), hash: hashDaChave(chave), chave, campanha: camp.campaignId, tela: telaId as "A", par: basename(dir),
        braco: bracoDoRun(run), runId: run.id, cardIdOriginal: card.id, atomoId: "cartao", cardSha256: sha(JSON.stringify(card)), mId: null,
        tipo: "sensivel", motivoFila: "primeira passada cega (§8.1)", decisaoAntiga: "", unidadesAntigas: "", origemMedida341: null, origemMedida370: null, lote: null };
      const atomo = { sujeitos: card.subjects.map(s => s.key ?? s.id), candidatasSpecs: [...new Set(card.candidateUnitIds.map(u => specDe.get(u)!))].sort() };
      const ex = { ...item, linha: {}, atomo } as unknown as Extracao["itens"][number];
      const c = profundo(cartaoCego(ex, card as never, nr.resolver, [], specs.map(s => s.id)));
      c.telaNome = nome; c.citaveis = [...c.citaveis, "MEDIDA"];
      itens.push({ item, card, cartao: c });
    }
  }
  const ord = ordenar(itens, x => x.item.hash);
  const lotes: { lote: string; ids: string[] }[] = [];
  let i = 0;
  tamanhosDosLotes(ord.length).forEach((t, k) => { lotes.push({ lote: nomeLote(k), ids: ord.slice(i, i + t).map(x => x.item.id) }); i += t; });
  for (const l of lotes) for (const id of l.ids) ord.find(x => x.item.id === id)!.item.lote = l.lote;
  const nomes = Object.values(telas).map(t => t.nome).join(", ");
  const leiame = leiameJuiz(ord.length, lotes.length)
    .replace("# Fila T3 — instruções do juiz", "# Primeira passada cega — instruções do juiz")
    .replace("(Tela A · Solicitar serviço, ou Tela B · Vistorias)", `(${nomes})`)
    .replace(/\*\*Use só o lote\.\*\*[^]*?quem o escreveu: isso não entra no julgamento\./, LEIAME_MEDIDA);
  const esquema = jsonTexto(ESQUEMA_RESPOSTAS);
  const juiz = new Map<string, string>([["lotes/LEIAME-juiz.md", leiame], ["lotes/esquema-respostas.schema.json", esquema]]);
  for (const l of lotes) {
    const cs = l.ids.map(id => ord.find(x => x.item.id === id)!.cartao);
    juiz.set(`lotes/${l.lote}.json`, jsonTexto({ formato: FORMATO_LOTE, lote: l.lote, politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-juiz.md", sha256: sha(leiame) }, esquema: { arquivo: "esquema-respostas.schema.json", sha256: sha(esquema) },
      respostaEm: `respostas/${l.lote}.json`, n: cs.length,
      referencias: Object.fromEntries([...new Set(cs.map(c => c.tela))].map(t => [t, telas[t]])), cartoes: cs }));
  }
  const cegueira = verificarCegueira({ arquivos: [...juiz].map(([rel, texto]) => ({ rel, texto })),
    cartoes: ord.map(x => ({ cartao: x.cartao, card: x.card as never, item: x.item, justificativas: [] })) });
  const falhasTrio = ord.filter(x => distingueComDeFerramentas(JSON.stringify(x.cartao))).map(x => `${x.item.id}: texto ainda separa com de ferramentas`);
  const porBraco: Record<string, { cartoes: number; comSinal: number }> = {};
  ord.forEach((x, k) => { const b = (porBraco[x.item.braco] ??= { cartoes: 0, comSinal: 0 }); b.cartoes++; if (cegueira.porCartao[k].sinais.length) b.comSinal++; });
  const chaveTxt = jsonTexto({ formato: "nat78-primeira-passada-chave-1.0.0", aviso: "NÃO entregar aos juízes: liga o id opaco ao braço, ao run e ao cartão",
    versao: E14_CAMPANHA_VERSAO, total: ord.length, porBraco, itens: ord.map(x => x.item) });
  const internos = new Map<string, string>([["chave/fila-t3-chave.json", chaveTxt],
    ["cegueira.json", jsonTexto({ resultado: cegueira.falhas.length || falhasTrio.length ? "FALHOU" : "OK", falhas: cegueira.falhas, falhasTrio, porBraco, porCartao: cegueira.porCartao })],
    ["lotes/manifesto.json", jsonTexto({ formato: "nat78-primeira-passada-manifesto-1.0.0", versao: E14_CAMPANHA_VERSAO, politica: POLITICA_PRINCIPAL, total: ord.length,
      analises: analises.map(d => ({ dir: basename(d), packageSha256: sha(readFileSync(join(d, "revisao", "package.json"))) })),
      arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
      lotes: lotes.map(l => ({ lote: l.lote, n: l.ids.length, sha256: sha(juiz.get(`lotes/${l.lote}.json`)!), ids: l.ids })), chaveSha256: sha(chaveTxt) })]]);
  return { arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, falhasTrio };
}

const LEIAME_MEDIDA = `**Use o lote e a página congelada.** O lote traz o texto do cartão, a norma citada e os defeitos da referência da tela.
O fato alegado se confere **medindo a página congelada** servida em \`http://127.0.0.1:3300\` + o \`endereco\` da tela (seção
\`referencias\` do lote), com Playwright headless e janela 1280×900, refazendo os passos do \`estado\`. Cite a medida com o id
\`MEDIDA\` e use \`forcaDoVeredito: "medido"\` só quando a medida decidiu. Não abra nenhum outro arquivo nem outra página e não
tente descobrir de onde o cartão veio nem quem o escreveu: isso não entra no julgamento.`;

if (process.argv[1] && /(?:^|[\\/])e14-campanha\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => a[a.indexOf(k) + 1];
  if (a.includes("--servir")) {
    const { createSiteServer, loadSite } = await import("../measurement-surface");
    const porta = Number(a.includes("--porta") ? val("--porta") : 3300);
    createSiteServer(loadSite(val("--servir"))).listen(porta, "127.0.0.1", () => console.log(`site congelado em http://127.0.0.1:${porta}/`));
  } else {
    const analises = a.flatMap((x, k) => (x === "--analise" ? [a[k + 1]] : [])), saida = val("--saida");
    if (!analises.length || !a.includes("--saida")) { console.error("Uso: --analise DIR [--analise DIR ...] --saida PASTA_NOVA | --servir SITE [--porta N]"); process.exit(1); }
    if (existsSync(saida)) { console.error(`--saida já existe: ${saida} (versão nova = pasta nova)`); process.exit(1); }
    const p = prepararCampanha(analises);
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
