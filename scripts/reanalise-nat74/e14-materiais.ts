/**
 * E14 passo 3 (plano NAT-74 §6.6, P5 a): depois da ingestão, lista os átomos MATERIAIS — os que decidem o crédito
 * de uma spec que não está confirmada de outro jeito naquela execução — e separa os que vão à autora (teto 10) dos
 * que ficam "julgado só por LLM".
 *
 *   npm run reanalise:nat74:e14-materiais -- [--saida PASTA_DO_DERIVADO]
 *
 * Material (regra fixa, nível de spec): S ∈ (spec creditada pelo julgamento ∪ spec creditada pelo arquivo) e S não
 * está confirmada na execução pela variante principal sem a fila (`trilha/unidades.json`, `confirmadaDepois`).
 * Na principal, esses átomos estão pendentes e não creditam; o crédito de S depende só do veredito deles.
 * Ordem para o teto: camada D (spec A-xx ou B-xx em execução de agente) → camada P (P-xx) → linha de base; empate pelo id.
 * Este arquivo NÃO vai aos juízes (tem campanha, braço e run).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { gravar, jsonTexto, lerJson, ordenar, raizSaida, sha, shaArquivo } from "./comum";
import { TETO_AUTORA, type Derivado, type ItemChave } from "./e14-comum";

interface Julgamento { id: string; chave: string; derivado: Derivado }
interface LinhaUnidade { campanha: string; par: string; runId: string; specId: string; confirmadaDepois: boolean; variante: string }

export interface Material {
  id: string; chave: string; campanha: string; par: string; braco: string; runId: string; camada: "D" | "P" | "LB";
  specs: { spec: string; creditadaNoArquivo: boolean; creditadaNoJulgamento: boolean }[];
  classe: string; regraDaPolitica: string;
}

const CREDITA = new Set(["violacao-pagina", "violacao-origem-indeterminada"]);

export function materiais(julgamentos: Julgamento[], chave: ItemChave[], unidades: LinhaUnidade[]) {
  const confirmadas = new Set(unidades.filter(u => u.variante === "principal" && u.confirmadaDepois).map(u => `${u.campanha}|${u.par}|${u.runId}|${u.specId}`));
  const porId = new Map(chave.map(i => [i.id, i]));
  const out: Material[] = [], pendentes: { id: string; chave: string; motivo: string }[] = [];
  let naoMateriais = 0;
  for (const j of julgamentos) {
    const it = porId.get(j.id);
    if (!it) throw new Error(`E14 materiais: ${j.id} fora da chave`);
    const arquivo = it.decisaoAntiga === "defeito-do-gabarito" ? [...new Set(it.unidadesAntigas.split(";").filter(Boolean).map(u => u.split(":")[0]))] : [];
    const julgado = CREDITA.has(j.derivado.classe) && j.derivado.spec ? [j.derivado.spec] : [];
    if (j.derivado.classe === "pendente" || j.derivado.classe === "evidencia-indisponivel" || j.derivado.pendencias.length)
      pendentes.push({ id: j.id, chave: j.chave, motivo: [j.derivado.classe, ...j.derivado.pendencias].join("; ") });
    const specs = [...new Set([...arquivo, ...julgado])].sort()
      .filter(s => !confirmadas.has(`${it.campanha}|${it.par}|${it.runId}|${s}`))
      .map(s => ({ spec: s, creditadaNoArquivo: arquivo.includes(s), creditadaNoJulgamento: julgado.includes(s) }));
    if (!specs.length) { naoMateriais++; continue; }
    const agente = it.braco === "sem" || it.braco === "com";
    const camada = !agente ? "LB" : specs.some(s => !s.spec.startsWith("P-")) ? "D" : "P";
    out.push({ id: j.id, chave: j.chave, campanha: it.campanha, par: it.par, braco: it.braco, runId: it.runId, camada, specs,
      classe: j.derivado.classe, regraDaPolitica: j.derivado.regraDaPolitica });
  }
  const ordem = { D: 0, P: 1, LB: 2 } as const;
  const ord = ordenar(out, m => `${ordem[m.camada]}|${m.id}`);
  return { paraAutora: ord.slice(0, TETO_AUTORA), julgadoSoPorLLM: ord.slice(TETO_AUTORA), pendentesAposJulgamento: ordenar(pendentes, p => p.id), naoMateriais };
}

if (process.argv[1] && /e14-materiais\.ts$/.test(process.argv[1])) {
  const raiz = raizSaida(), fila = join(raiz, "fila-t3");
  const jAbs = join(fila, "julgamentos.json");
  if (!existsSync(jAbs)) { console.error("sem fila-t3/julgamentos.json: rode reanalise:nat74:e14-ingerir antes"); process.exit(1); }
  const j = lerJson<{ completo: boolean; julgados: number; total: number; julgamentos: Julgamento[] }>(jAbs);
  const chave = lerJson<{ itens: ItemChave[] }>(join(fila, "chave", "fila-t3-chave.json")).itens;
  const uAbs = join(raiz, "trilha", "unidades.json");
  const m = materiais(j.julgamentos, chave, lerJson<{ linhas: LinhaUnidade[] }>(uAbs).linhas);
  const corpo = { formato: "nat74-t3-materiais-1.0.0", aviso: "NÃO entregar aos juízes (campanha, braço, run)",
    regra: "P5 a: material = átomo que decide o crédito de spec não confirmada de outro jeito na execução (principal sem a fila); teto de 10 para a autora, ordem D → P → linha de base, empate pelo id; acima do teto: julgado só por LLM",
    julgamentos: { sha256: shaArquivo(jAbs), completo: j.completo, julgados: j.julgados, total: j.total }, unidadesSha256: shaArquivo(uAbs),
    teto: TETO_AUTORA, contagem: { materiais: m.paraAutora.length + m.julgadoSoPorLLM.length, paraAutora: m.paraAutora.length, julgadoSoPorLLM: m.julgadoSoPorLLM.length,
      naoMateriais: m.naoMateriais, pendentesAposJulgamento: m.pendentesAposJulgamento.length },
    paraAutora: m.paraAutora, julgadoSoPorLLM: m.julgadoSoPorLLM.map(x => ({ ...x, rotulo: "julgado só por LLM" })), pendentesAposJulgamento: m.pendentesAposJulgamento };
  const t = jsonTexto(corpo);
  gravar(fila, "materiais.json", t);
  console.log(`E14 materiais: ${corpo.contagem.materiais} materiais → ${m.paraAutora.length} para a autora, ${m.julgadoSoPorLLM.length} julgado só por LLM; ${m.pendentesAposJulgamento.length} pendentes após o julgamento${j.completo ? "" : ` (ATENÇÃO: julgamentos incompletos, ${j.julgados}/${j.total})`}`);
  console.log(`  sha256 ${sha(t)}  fila-t3/materiais.json`);
}
