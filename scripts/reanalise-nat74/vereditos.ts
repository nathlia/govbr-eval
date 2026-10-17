/**
 * E5 (plano §5, P6): vereditos novos por átomo arquivado, com a precedência das fontes.
 *
 * 1. autora (caso R-xx/N-xx): o julgamento cego é o primeiro completo; a resposta vigente aplica as
 *    correções (`*-correcao.json`, vale a última) e as revisitas (`*-revisao-pos.json`, em ordem;
 *    `pergunta: fato` troca os átomos, `pergunta: vinculo` troca o vínculo);
 * 2. propagação da autora (nível 1, equivalência conferida por LLM);
 * 3. revisor novo (LLM): exceções do nível 1, representantes e membros do nível 2, amostra do nível 3;
 *    os 18 da paginação (nível 1, propagação parcial) recebem fato + norma do representante R-11 e a
 *    origem medida (D-129);
 * 4. medida: B-16 (P10), átomos pelo `medidas-runtime.json` da NAT-73;
 * 5./6. arquivo compatível ou pendente: decididos na triagem (politica.ts), não aqui.
 *
 * Nada aqui lê braço: os arquivos de entrada têm o campo `braco` em alguns registros e ele é ignorado.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { NAT73, lerJson, relTcc, shaArquivo } from "./comum";
import type { AtomoArquivado } from "./e1";

export interface Norma { id: string; titulo?: string; forca: string; aplicabilidade: string; violada: string }
export interface VinculoJuiz { unidade: string; relacao: string; evidencia: string }
export interface Parte {
  parte: string; verdadeFactual: string | null; norma: Norma | null; origem: string | null;
  vinculo: VinculoJuiz | null; classe: string | null; forcaDoVeredito: string | null;
  /** Sujeitos (ids do cartão) a que a parte se refere; preenchido pela divisão (E8). */
  sujeitos?: string[];
}
export type Juiz = "autora" | "autora-propagada" | "revisor-novo" | "medida";
export interface Veredito {
  juiz: Juiz; fonte: string[]; partes: Parte[]; caso: string | null;
  aposRevelacao: boolean; aposOrientacao: boolean; rotulo: string;
}
export interface VereditoAtomo { vigente: Veredito; cego: Veredito | null; divergencias: string[] }

/** Corte conservador da orientação (E5): depois do último julgamento cego da rodada 2, nos casos citados. */
export const CORTE_ORIENTACAO = "2026-10-16T10:04:48.951Z";
export const CASOS_ORIENTADOS = ["N-07", "R-02", "R-03", "R-05", "R-08"];

const JDIR = join(NAT73, "ratificacao", "julgamentos");
const fonte = (abs: string): string => `${relTcc(abs)}#${shaArquivo(abs)}`;
const parteDe = (a: Record<string, unknown>): Parte => ({
  parte: String(a.parte ?? "o cartão inteiro"), verdadeFactual: (a.verdadeFactual as string) ?? null, norma: (a.norma as Norma) ?? null,
  origem: (a.origem as string) ?? null, vinculo: a.vinculo && typeof a.vinculo === "object" ? a.vinculo as VinculoJuiz : null,
  classe: (a.classe as string) ?? null, forcaDoVeredito: (a.forcaDoVeredito as string) ?? null });

interface ArquivoAutora { nome: string; abs: string; tipo: string; caso: string; status?: string; pulou?: boolean; atomos?: Record<string, unknown>[];
  pergunta?: string; vinculo?: VinculoJuiz; gravadoEm: string; aposRevelacao?: boolean }

/** Vereditos da autora por caso: cego e vigente. */
export function vereditosDaAutora(): Map<string, { cego: Veredito; vigente: Veredito; correcoes: string[]; revisitas: string[] }> {
  const arqs: ArquivoAutora[] = readdirSync(JDIR).filter(f => /-(julgamento|correcao|revisao-pos)\.json$/.test(f)).sort()
    .map(f => ({ nome: f, abs: join(JDIR, f), ...lerJson<Omit<ArquivoAutora, "nome" | "abs">>(join(JDIR, f)) }));
  const casos = [...new Set(arqs.map(a => a.caso))].sort();
  const out = new Map<string, { cego: Veredito; vigente: Veredito; correcoes: string[]; revisitas: string[] }>();
  for (const caso of casos) {
    const doCaso = arqs.filter(a => a.caso === caso).sort((a, b) => (a.gravadoEm < b.gravadoEm ? -1 : 1));
    const cegoArq = doCaso.find(a => a.tipo === "julgamento" && a.status === "completo" && !a.pulou);
    if (!cegoArq) continue;
    const cego: Veredito = { juiz: "autora", fonte: [fonte(cegoArq.abs)], partes: cegoArq.atomos!.map(parteDe), caso,
      aposRevelacao: false, aposOrientacao: false, rotulo: "autora, julgamento cego" };
    let partes = cego.partes.map(p => ({ ...p }));
    const fontes = [...cego.fonte];
    let aposRev = false, aposOri = false;
    const correcoes: string[] = [], revisitas: string[] = [];
    const orientado = (a: ArquivoAutora) => CASOS_ORIENTADOS.includes(caso) && a.gravadoEm > CORTE_ORIENTACAO;
    const ultimaCorrecao = doCaso.filter(a => a.tipo === "correcao").at(-1);
    if (ultimaCorrecao) {
      partes = ultimaCorrecao.atomos!.map(parteDe); fontes.push(fonte(ultimaCorrecao.abs)); aposRev = true; aposOri ||= orientado(ultimaCorrecao);
      correcoes.push(ultimaCorrecao.nome);
    }
    for (const r of doCaso.filter(a => a.tipo === "revisao-pos" && a.status === "completo")) {
      if (r.pergunta === "vinculo" && r.vinculo) partes = partes.map(p => ({ ...p, vinculo: r.vinculo! }));
      else if (r.atomos?.length) partes = r.atomos.map(parteDe);
      else continue;
      fontes.push(fonte(r.abs)); aposRev = true; aposOri ||= orientado(r); revisitas.push(r.nome);
    }
    const vigente: Veredito = { juiz: "autora", fonte: fontes, partes, caso, aposRevelacao: aposRev, aposOrientacao: aposOri,
      rotulo: aposOri ? "autora, resposta vigente — após orientação do assistente" : aposRev ? "autora, resposta vigente — correção pós-revelação" : "autora, julgamento cego" };
    out.set(caso, { cego, vigente, correcoes, revisitas });
  }
  return out;
}

interface JulgRevisor {
  nivel1: { julgamentosAutora: Record<string, { caso: string }>; membros: Record<string, { status: string; representante: string | null; julgamento: Record<string, unknown>[] | null }> };
  nivel2: { representantes: Record<string, { atomos: Record<string, unknown>[] }>; membros: Record<string, { status: string; julgamento: Record<string, unknown>[] | null }> };
  nivel3: Record<string, { atomos: Record<string, unknown>[] }>;
}

/** Átomos da B-16 (P10): dois sujeitos, medidos no `medidas-runtime.json` (NAT-73). */
export const B16 = { regra: "axe:image-alt", logo: " >>> ", sair: "button>img" };

export interface EntradaVereditos { atomos: AtomoArquivado[] }
export interface SaidaVereditos {
  porChave: Map<string, VereditoAtomo>;
  autora: ReturnType<typeof vereditosDaAutora>;
  casoPorChave: Map<string, string>;
  fontes: string[];
}

export function vereditosPorAtomo(e: EntradaVereditos): SaidaVereditos {
  const autora = vereditosDaAutora();
  const revAbs = join(NAT73, "equivalencia", "julgamentos-revisor-novo.json");
  const rev = lerJson<JulgRevisor>(revAbs);
  const revF = fonte(revAbs);
  const chaveAbs = join(NAT73, "ratificacao", "chave", "revelacao.json");
  const chaveCasos = lerJson<{ casos: Record<string, { id: string }> }>(chaveAbs).casos;
  const selAbs = join(NAT73, "selecao-ratificacao.json");
  const amostra = lerJson<{ amostra: { chave: string; campanha: string; par: string; cardId: string }[] }>(selAbs).amostra;
  const medAbs = join(NAT73, "origem", "medidas-runtime.json");
  const medF = fonte(medAbs);
  const med = lerJson<{ telaB: { lista: { header: { logo: { alt: string } }; imgsSemAlt: { src: string; pai: string }[] }; detalhe: { imgsSemAlt: string[] } } }>(medAbs);

  // id do caso (M-xxxx ou S-xxxx) → chave do átomo
  const porM = new Map(e.atomos.filter(a => a.mId).map(a => [a.mId!, a]));
  const porCartao = new Map(e.atomos.map(a => [`${a.campanha}|${a.par}|${a.cardIdOriginal}`, a]));
  const porS = new Map(amostra.map(s => [s.chave, porCartao.get(`${s.campanha}|${s.par}|${s.cardId}`)!]));
  const atomoDe = (id: string): AtomoArquivado | undefined => id.startsWith("S-") ? porS.get(id) : porM.get(id);
  const casoDoId = new Map(Object.entries(chaveCasos).map(([caso, v]) => [v.id, caso]));

  const porChave = new Map<string, VereditoAtomo>();
  const casoPorChave = new Map<string, string>();
  const por = (id: string, v: VereditoAtomo) => { const a = atomoDe(id); if (!a) throw new Error(`E5: caso ${id} sem átomo arquivado`); if (!porChave.has(a.chave)) porChave.set(a.chave, v); };
  const revisor = (partes: Record<string, unknown>[], rotulo: string): VereditoAtomo => ({ vigente: { juiz: "revisor-novo", fonte: [revF], partes: partes.map(parteDe),
    caso: null, aposRevelacao: false, aposOrientacao: false, rotulo }, cego: null, divergencias: [] });

  // 1. autora (representantes R-xx/N-xx)
  for (const [caso, v] of autora) {
    const id = chaveCasos[caso]?.id;
    if (!id) throw new Error(`E5: caso ${caso} sem id na chave`);
    por(id, { vigente: v.vigente, cego: v.cego, divergencias: [] });
    casoPorChave.set(atomoDe(id)!.chave, caso);
  }
  // 2. propagação da autora (nível 1)
  const vDoRep = (rep: string) => { const caso = casoDoId.get(rep); return caso ? autora.get(caso) : undefined; };
  for (const [m, x] of Object.entries(rev.nivel1.membros).sort()) {
    if (x.status === "propagado") {
      // Representante pode ser duplo ("M-a|M-b"): vale o primeiro com julgamento da autora; diferença de classe é registrada.
      const reps = x.representante!.split("|").map(vDoRep).filter(Boolean);
      const a = reps[0];
      const difRep = reps.length > 1 && JSON.stringify(reps.map(r => r!.vigente.partes.map(q => q.classe))) !== JSON.stringify(reps.map(() => a!.vigente.partes.map(q => q.classe)));
      if (!a) throw new Error(`E5: ${m} propagado de ${x.representante} sem julgamento da autora`);
      const prop = (v: Veredito): Veredito => ({ ...v, juiz: "autora-propagada", fonte: [...v.fonte, revF], rotulo: `${v.rotulo} · propagado (equivalência conferida por LLM)` });
      por(m, { vigente: prop(a.vigente), cego: prop(a.cego), divergencias: difRep ? [`representantes ${x.representante} com classes diferentes: vale o primeiro`] : [] });
    } else if (x.status === "propagacao-parcial-pendente-autora") {
      // Fato + norma do representante R-11 (M-0287); a classe sai da origem medida (D-129), na política.
      const a = vDoRep(x.representante!.split("|")[0]);
      if (!a) throw new Error(`E5: ${m} sem representante da autora`);
      const parc = (v: Veredito): Veredito => ({ ...v, juiz: "autora-propagada", fonte: [...v.fonte, revF], partes: v.partes.map(p => ({ ...p, origem: null })),
        rotulo: "autora (R-11), propagação parcial · origem pela medida (D-129)" });
      por(m, { vigente: parc(a.vigente), cego: parc(a.cego), divergencias: ["origem divergente entre os representantes R-11 e R-15: decide a medida (D-129)"] });
    } else if (x.julgamento?.length) por(m, revisor(x.julgamento, "revisor novo (LLM), exceção do nível 1"));
  }
  // 3. revisor novo
  for (const [m, x] of Object.entries(rev.nivel2.representantes).sort()) por(m, revisor(x.atomos, "revisor novo (LLM), representante do nível 2"));
  for (const [m, x] of Object.entries(rev.nivel2.membros).sort()) if (x.julgamento?.length)
    por(m, revisor(x.julgamento, x.status === "propagado" ? "revisor novo (LLM), propagado do representante" : "revisor novo (LLM), individual com medida"));
  for (const [s, x] of Object.entries(rev.nivel3).sort()) por(s, revisor(x.atomos, "revisor novo (LLM), amostra do nível 3"));

  // 4. medida: B-16 (P10). Os dois sujeitos de cada cartão axe image-alt da tela B, medidos.
  // O br-header é o mesmo componente nas duas rotas; o alt do logo foi medido na lista (telaB.lista.header).
  const logoAlt = med.telaB.lista.header.logo.alt;
  // Ícone do Sair sem alt dentro de BUTTON (lista, com o pai medido) e também na rota de detalhe (cena da B-16).
  const sairSemAlt = med.telaB.lista.imgsSemAlt.some(i => /exit-icon/.test(i.src) && /BUTTON/.test(i.pai)) && med.telaB.detalhe.imgsSemAlt.some(i => /exit-icon/.test(i));
  for (const a of e.atomos) {
    if (a.tela !== "B" || a.regra !== B16.regra || a.sujeitos.length !== 2) continue;
    const logo = a.sujeitos.find(s => s.includes(B16.logo)), sair = a.sujeitos.find(s => s.endsWith(B16.sair));
    if (!logo || !sair || !sairSemAlt || !logoAlt) throw new Error(`P10: B-16 sem medida (${a.chave})`);
    const ant = porChave.get(a.chave);
    const div = ant && ant.vigente.juiz === "autora" ? [`autora (${ant.vigente.caso}, ${ant.vigente.rotulo}) ligou o cartão inteiro à ${ant.vigente.partes[0]?.vinculo?.unidade ?? "nenhuma"} sem dividir; vale a divisão medida (P10)`] : [];
    const norma: Norma = { id: "axe:image-alt", forca: "obrigatorio", aplicabilidade: "aplica", violada: "sim" };
    porChave.set(a.chave, { cego: null, divergencias: div, vigente: { juiz: "medida", fonte: [medF], caso: ant?.vigente.caso ?? null, aposRevelacao: false, aposOrientacao: false,
      rotulo: "medida (R1/R8, P10) — concorda com o revisor novo", partes: [
        { parte: "ícone do Sair (button>img sem alt)", sujeitos: [sair], verdadeFactual: "verdadeira", norma, origem: "pagina",
          vinculo: { unidade: "B-16", relacao: "direta", evidencia: `medidas-runtime telaB.lista/detalhe.imgsSemAlt: exit-icon.png em BUTTON, sem alt (${medF})` },
          classe: "violacao-pagina", forcaDoVeredito: "medido" },
        { parte: "logo do br-header (shadow)", sujeitos: [logo], verdadeFactual: "falsa", norma: null, origem: null, vinculo: null,
          classe: "erro-factual", forcaDoVeredito: "medido" },
      ] } });
  }
  return { porChave, autora, casoPorChave, fontes: [revF, fonte(chaveAbs), fonte(selAbs), medF] };
}
