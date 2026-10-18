/**
 * E14 passo 3 (plano NAT-74 §6.6, P5 a): depois da ingestão, lista os átomos MATERIAIS — os que decidem o crédito
 * de uma unidade (tela A) ou spec (tela B) que não está confirmada de outro jeito naquela execução — e separa os
 * que vão à autora (teto 10) dos que ficam "julgado só por LLM".
 *
 *   npm run reanalise:nat74:e14-materiais -- [--saida PASTA_DO_DERIVADO]
 *
 * [revisão independente, NAT-74 comentário 93fa1437] A unidade de materialidade segue o desfecho principal da
 * agenda: tela A conta UNIDADES (A-04 e A-08 têm 2 unidades por execução: uma U1 confirmada não esconde uma U2 em
 * disputa), tela B conta SPECS (D-102).
 * Material: algum alvo (unidade na A, spec na B) do conjunto "creditado pelo arquivo ∪ creditado pelo julgamento"
 * não está confirmado na execução pela principal sem a fila (`trilha/unidades.json`, `confirmadaDepois`).
 * Unidades: as do arquivo pelo mapa retrospectivo (antiga → 1.7.0); as do julgamento = as unidades da spec que a
 * ancoragem do cartão oferece, ou, sem oferta, todas as da spec (conservador).
 * Ordem para o teto: camada D (A-xx ou B-xx em execução de agente) → camada P (P-xx) → linha de base; empate pelo id.
 * Este arquivo NÃO vai aos juízes (tem campanha, braço e run).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CAMINHO_DERIVADO, RESULTADOS, gravar, jsonTexto, lerJson, ordenar, raizSaida, sha, shaArquivo } from "./comum";
import { TETO_AUTORA, type Derivado, type ItemChave } from "./e14-comum";

interface Julgamento { id: string; chave: string; derivado: Derivado }
interface LinhaUnidade { campanha: string; par: string; runId: string; specId: string; unitId: string; confirmadaDepois: boolean; variante: string }

/** O que se precisa saber de um par para ir da spec à unidade (pacote 1.7.0 + mapa retrospectivo da 1.0.0). */
export interface ParUnidades {
  specDe: ReadonlyMap<string, string>;
  /** unidade antiga (pacote arquivado) → unidade 1.7.0 */
  deAntiga: ReadonlyMap<string, string>;
  /** cartão antigo → unidades oferecidas pela ancoragem do cartão 1.7.0 */
  candidatas: ReadonlyMap<string, string[]>;
}

export interface Material {
  id: string; chave: string; campanha: string; par: string; braco: string; runId: string; camada: "D" | "P" | "LB";
  alvos: { alvo: string; spec: string; creditadoNoArquivo: boolean; creditadoNoJulgamento: boolean }[];
  classe: string; regraDaPolitica: string;
}

const CREDITA = new Set(["violacao-pagina", "violacao-origem-indeterminada"]);
const telaA = (c: string) => c !== "t7-tela-b-01";

export function materiais(julgamentos: Julgamento[], chave: ItemChave[], unidades: LinhaUnidade[], pares: ReadonlyMap<string, ParUnidades>) {
  const confirmadas = new Set(unidades.filter(u => u.variante === "principal" && u.confirmadaDepois)
    .flatMap(u => [`${u.campanha}|${u.par}|${u.runId}|U|${u.unitId}`, `${u.campanha}|${u.par}|${u.runId}|S|${u.specId}`]));
  const porId = new Map(chave.map(i => [i.id, i]));
  const out: Material[] = [], pendentes: { id: string; chave: string; motivo: string }[] = [];
  let naoMateriais = 0;
  for (const j of julgamentos) {
    const it = porId.get(j.id);
    if (!it) throw new Error(`E14 materiais: ${j.id} fora da chave`);
    if (j.derivado.classe === "pendente" || j.derivado.classe === "evidencia-indisponivel" || j.derivado.pendencias.length)
      pendentes.push({ id: j.id, chave: j.chave, motivo: [j.derivado.classe, ...j.derivado.pendencias].join("; ") });
    const arquivo = it.decisaoAntiga === "defeito-do-gabarito" ? it.unidadesAntigas.split(";").filter(Boolean).map(x => { const [s, u] = x.split(":"); return { spec: s, unidade: u }; }) : [];
    const julgado = CREDITA.has(j.derivado.classe) && j.derivado.spec ? j.derivado.spec : null;
    let alvos: Material["alvos"];
    if (telaA(it.campanha)) {
      const p = pares.get(`${it.campanha}|${it.par}`);
      if (!p) throw new Error(`E14 materiais: sem pacote 1.7.0/mapa para ${it.campanha}/${it.par}`);
      const daSpec = (s: string) => [...p.specDe].filter(([, x]) => x === s).map(([u]) => u);
      const doArquivo = arquivo.map(a => p.deAntiga.get(a.unidade) ?? a.unidade);
      const ofertadas = julgado ? (p.candidatas.get(it.cardIdOriginal) ?? []).filter(u => p.specDe.get(u) === julgado) : [];
      const doJulgado = julgado ? (ofertadas.length ? ofertadas : daSpec(julgado)) : [];
      alvos = [...new Set([...doArquivo, ...doJulgado])].sort().map(u => ({ alvo: u, spec: p.specDe.get(u) ?? "?", creditadoNoArquivo: doArquivo.includes(u), creditadoNoJulgamento: doJulgado.includes(u) }))
        .filter(x => !confirmadas.has(`${it.campanha}|${it.par}|${it.runId}|U|${x.alvo}`));
    } else {
      const doArquivo = [...new Set(arquivo.map(a => a.spec))];
      alvos = [...new Set([...doArquivo, ...(julgado ? [julgado] : [])])].sort().map(s => ({ alvo: s, spec: s, creditadoNoArquivo: doArquivo.includes(s), creditadoNoJulgamento: s === julgado }))
        .filter(x => !confirmadas.has(`${it.campanha}|${it.par}|${it.runId}|S|${x.alvo}`));
    }
    if (!alvos.length) { naoMateriais++; continue; }
    const agente = it.braco === "sem" || it.braco === "com";
    const camada = !agente ? "LB" : alvos.some(s => !s.spec.startsWith("P-")) ? "D" : "P";
    out.push({ id: j.id, chave: j.chave, campanha: it.campanha, par: it.par, braco: it.braco, runId: it.runId, camada, alvos,
      classe: j.derivado.classe, regraDaPolitica: j.derivado.regraDaPolitica });
  }
  const ordem = { D: 0, P: 1, LB: 2 } as const;
  const ord = ordenar(out, m => `${ordem[m.camada]}|${m.id}`);
  return { paraAutora: ord.slice(0, TETO_AUTORA), julgadoSoPorLLM: ord.slice(TETO_AUTORA), pendentesAposJulgamento: ordenar(pendentes, p => p.id), naoMateriais };
}

/** Pacote 1.7.0 e mapa retrospectivo de cada par da tela A, lidos do derivado 1.0.0. */
export function paresDaTelaA(chave: ItemChave[], derivado100 = join(RESULTADOS, CAMINHO_DERIVADO)): Map<string, ParUnidades> {
  const out = new Map<string, ParUnidades>();
  for (const k of new Set(chave.filter(i => telaA(i.campanha)).map(i => `${i.campanha}|${i.par}`))) {
    const [c, par] = k.split("|");
    const pkg = lerJson<{ units: { id: string; specId: string }[]; cards: { id: string; candidateUnitIds: string[] }[] }>(join(derivado100, c, par, "analise", "revisao", "package.json"));
    const mapa = lerJson<{ cartoes: { de: string; para: string }[]; unidades: { de: string; para: string }[] }>(join(derivado100, c, par, "mapa-retrospectivo.json"));
    const cards = new Map(pkg.cards.map(x => [x.id, x.candidateUnitIds]));
    out.set(k, { specDe: new Map(pkg.units.map(u => [u.id, u.specId])), deAntiga: new Map(mapa.unidades.map(u => [u.de, u.para])),
      candidatas: new Map(mapa.cartoes.map(x => [x.de, cards.get(x.para) ?? []])) });
  }
  return out;
}

if (process.argv[1] && /e14-materiais\.ts$/.test(process.argv[1])) {
  const raiz = raizSaida(), fila = join(raiz, "fila-t3");
  const jAbs = join(fila, "julgamentos.json");
  if (!existsSync(jAbs)) { console.error("sem fila-t3/julgamentos.json: rode reanalise:nat74:e14-ingerir antes"); process.exit(1); }
  const j = lerJson<{ completo: boolean; julgados: number; total: number; julgamentos: Julgamento[] }>(jAbs);
  const chave = lerJson<{ itens: ItemChave[] }>(join(fila, "chave", "fila-t3-chave.json")).itens;
  const uAbs = join(raiz, "trilha", "unidades.json");
  const m = materiais(j.julgamentos, chave, lerJson<{ linhas: LinhaUnidade[] }>(uAbs).linhas, paresDaTelaA(chave));
  const corpo = { formato: "nat74-t3-materiais-1.1.0", aviso: "NÃO entregar aos juízes (campanha, braço, run)",
    regra: "P5 a: material = átomo que decide o crédito de alvo não confirmado de outro jeito na execução (principal sem a fila); alvo = UNIDADE na tela A (desfecho por unidade), SPEC na tela B (D-102); teto de 10 para a autora, ordem D → P → linha de base, empate pelo id; acima do teto: julgado só por LLM",
    julgamentos: { sha256: shaArquivo(jAbs), completo: j.completo, julgados: j.julgados, total: j.total }, unidadesSha256: shaArquivo(uAbs),
    teto: TETO_AUTORA, contagem: { materiais: m.paraAutora.length + m.julgadoSoPorLLM.length, paraAutora: m.paraAutora.length, julgadoSoPorLLM: m.julgadoSoPorLLM.length,
      naoMateriais: m.naoMateriais, pendentesAposJulgamento: m.pendentesAposJulgamento.length },
    paraAutora: m.paraAutora, julgadoSoPorLLM: m.julgadoSoPorLLM.map(x => ({ ...x, rotulo: "julgado só por LLM" })), pendentesAposJulgamento: m.pendentesAposJulgamento };
  const t = jsonTexto(corpo);
  gravar(fila, "materiais.json", t);
  console.log(`E14 materiais: ${corpo.contagem.materiais} materiais → ${m.paraAutora.length} para a autora, ${m.julgadoSoPorLLM.length} julgado só por LLM; ${m.pendentesAposJulgamento.length} pendentes após o julgamento${j.completo ? "" : ` (ATENÇÃO: julgamentos incompletos, ${j.julgados}/${j.total})`}`);
  console.log(`  sha256 ${sha(t)}  fila-t3/materiais.json`);
}
