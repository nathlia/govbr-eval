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
 * `nao-perguntado`; receitas da linha de base legíveis; fontes (base + sha256) no manifesto. Ingestão:
 *   npx tsx scripts/reanalise-nat74/e14-ingerir.ts --fila PASTA_DA_PASSADA
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { distingueComDeFerramentas, mascararComFerramentas } from "../painel/mascara";
import { POLITICA_PRINCIPAL, TCC, gravar, jsonTexto, lerJson, ordenar, sha } from "./comum";
import { verificarCegueira, type Cegueira } from "./e14-cegueira";
import {
  ESQUEMA_RESPOSTAS_CAMPANHA, FORMATO_LOTE, FORMATO_MANIFESTO_CAMPANHA, FORMATO_RESPOSTAS, FORMATO_RESPOSTAS_CAMPANHA, NAO_PERGUNTADO,
  hashDaChave, idOpaco, mascarar, nomeLote, type CartaoCego, type ItemChave,
} from "./e14-comum";
import { cartaoCego, normasDaCampanha, type Extracao } from "./e14-fila";
import { leiameJuiz, tamanhosDosLotes } from "./e14-preparar";

/** 1.1.0 (1b): normas pela base do oráculo da campanha, caminho único de respostas, LEIAME corrigido, receitas legíveis. */
export const E14_CAMPANHA_VERSAO = "nat78-primeira-passada-1.1.0";
/** Validador cuja `data/` é conferida contra o `dataSha256` da campanha (pode ser outro checkout: `--validador`). */
export const VALIDADOR_PADRAO = join(TCC, "govbr-ds-validator");
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

export function prepararCampanha(analises: string[], o: { validador?: string; checkerAliases?: string } = {}): PreparoCampanha {
  const datas = [...new Set(analises.flatMap(d => dataDoOraculo(lerJson(join(d, "entradas", "campanha.json")))))];
  if (datas.length !== 1) throw new Error(`E14 campanha: esperado 1 dataSha256 de oráculo nas campanhas das análises, achei ${datas.length} (${datas.map(x => x.slice(0, 12)).join(", ")})`);
  const nr = normasDaCampanha({ dataSha256: datas[0], validador: resolve(o.validador ?? VALIDADOR_PADRAO), checkerAliases: o.checkerAliases });
  const itens: { item: ItemChave; card: Card; cartao: CartaoCego }[] = [];
  const telas: Record<string, { nome: string; versao: string; endereco: string; defeitos: unknown[] }> = {};
  const fontes: Record<string, string> = { ...nr.fontes };
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
    const refAbs = join(dir, "entradas", "referencia.json");
    fontes[`${basename(dir)}/entradas/referencia.json`] = sha(readFileSync(refAbs));
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
      const cego = cartaoCego(ex, card as never, nr.resolver, [], specs.map(s => s.id));
      cego.alegacao.estado.passos = passosLegiveis(cego.alegacao.estado.passos, ref._meta).map(s => mascarar(s)!);
      const c = profundo(cego);
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
  const leiame = leiameCampanha(ord.length, lotes.length, nomes);
  const esquema = jsonTexto(ESQUEMA_RESPOSTAS_CAMPANHA);
  const juiz = new Map<string, string>([["lotes/LEIAME-juiz.md", leiame], ["lotes/esquema-respostas.schema.json", esquema]]);
  for (const l of lotes) {
    const cs = l.ids.map(id => ord.find(x => x.item.id === id)!.cartao);
    juiz.set(`lotes/${l.lote}.json`, jsonTexto({ formato: FORMATO_LOTE, lote: l.lote, politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-juiz.md", sha256: sha(leiame) }, esquema: { arquivo: "esquema-respostas.schema.json", sha256: sha(esquema) },
      respostaEm: `../respostas/${l.lote}.json`, n: cs.length,
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
    ["lotes/manifesto.json", jsonTexto({ formato: FORMATO_MANIFESTO_CAMPANHA, versao: E14_CAMPANHA_VERSAO, politica: POLITICA_PRINCIPAL, total: ord.length,
      respostas: { pasta: "respostas/", formato: FORMATO_RESPOSTAS_CAMPANHA, nota: "pasta da passada, ao lado de lotes/ (nunca lotes/respostas/)" },
      analises: analises.map(d => ({ dir: basename(d), packageSha256: sha(readFileSync(join(d, "revisao", "package.json"))) })),
      arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
      lotes: lotes.map(l => ({ lote: l.lote, n: l.ids.length, sha256: sha(juiz.get(`lotes/${l.lote}.json`)!), ids: l.ids })), chaveSha256: sha(chaveTxt), fontes })]]);
  return { arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, falhasTrio, fontes };
}

/** Troca exata: o trecho tem de existir uma vez no LEIAME histórico (senão o texto mudou e a troca falharia calada). */
function trocar(t: string, de: string | RegExp, para: string): string {
  const n = typeof de === "string" ? t.split(de).length - 1 : (t.match(new RegExp(de.source, de.flags.includes("g") ? de.flags : de.flags + "g")) ?? []).length;
  if (n !== 1) throw new Error(`LEIAME da campanha: trecho achado ${n} vez(es): ${String(de).slice(0, 80)}`);
  return t.replace(de, para);
}

/**
 * LEIAME do juiz da primeira passada (1.1.0): o histórico (`leiameJuiz`, que não muda) com as trocas da campanha nova —
 * página congelada medida (D-138), caminho único de respostas (I), norma neutra para `id: "nenhuma"` (K1), `norma.forca`
 * explícito (K2), receitas (K3) e o que não abrir (K4).
 */
export function leiameCampanha(total: number, nLotes: number, nomes: string): string {
  let t = leiameJuiz(total, nLotes);
  t = trocar(t, "# Fila T3 — instruções do juiz", "# Primeira passada cega — instruções do juiz");
  t = trocar(t, "(Tela A · Solicitar serviço, ou Tela B · Vistorias)", `(${nomes})`);
  t = trocar(t, /\*\*Use só o lote\.\*\*[^]*?quem o escreveu: isso não entra no julgamento\./, LEIAME_MEDIDA);
  t = trocar(t, "`estado` (tamanho da janela e passos até o estado)",
    "`estado` (tamanho da janela e passos até o estado: a receita escrita pelo autor do cartão, ou os passos da referência da tela quando o cartão veio da linha de base; refaça-a na página congelada e, se ela não alcança o estado que o cartão descreve, diga isso na justificativa)");
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
  return t;
}

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
    if (!analises.length || !a.includes("--saida")) { console.error("Uso: --analise DIR [--analise DIR ...] --saida PASTA_NOVA [--validador DIR] | --servir SITE [--porta N]"); process.exit(1); }
    if (existsSync(saida)) { console.error(`--saida já existe: ${saida} (versão nova = pasta nova)`); process.exit(1); }
    const p = prepararCampanha(analises, { validador: a.includes("--validador") ? val("--validador") : undefined });
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
