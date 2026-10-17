/**
 * E3 (plano §5): repreparar os 30 pares sob o scorer vigente (flow-semantic-1.7.0), a partir da
 * `receita.json` de cada par (mesmos pacotes brutos, campanha, snapshots, referência, site e linha de
 * base, conferidos por hash pelo próprio `analisar`), pelo modo `--derivado-retrospectivo`.
 * Sem decisões: o pacote sai todo pendente; as decisões entram pelo mapa retrospectivo (P4).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { analisar, DERIVADO_RETROSPECTIVO_VERSAO, type ManifestoDerivado } from "../analisar-execucao";
import { DERIVADO_VERSAO, RESULTADOS, gravarJson, lerJson, type Par, type Receita } from "./comum";

/** Instante fixo dos carimbos do derivado (determinismo, D-99): o dia do plano. */
export const INSTANTE_DERIVADO = "2026-10-16T00:00:00Z";
export const MANIFESTO_DERIVADO: ManifestoDerivado = { formato: DERIVADO_RETROSPECTIVO_VERSAO, derivado: DERIVADO_VERSAO, instante: INSTANTE_DERIVADO,
  motivo: "NAT-74: reanálise retrospectiva e exploratória sob a política normativa 1.2.0; não substitui D-97/D-111/D-112" };

export const dirParDerivado = (raiz: string, p: Pick<Par, "campanha" | "par">): string => join(raiz, p.campanha, p.par);

export async function prepararPar(raiz: string, p: Par): Promise<{ estado: string; motivo: string | null; saida: string }> {
  const manifesto = join(raiz, "entradas", "derivado-retrospectivo.json");
  if (!existsSync(manifesto)) gravarJson(raiz, "entradas/derivado-retrospectivo.json", MANIFESTO_DERIVADO);
  const r = lerJson<Receita>(join(RESULTADOS, "analises", p.campanha, p.par, "receita.json"));
  const e = r.entradas, a = (x: string) => join(RESULTADOS, x);
  const saida = join(dirParDerivado(raiz, p), "analise");
  const res = await analisar({ sem: a(r.pacotes.sem), com: a(r.pacotes.com), campanha: a(e.campanha), snapshots: a(e.snapshots),
    referencia: a(e.referencia), site: a(e.site), ...(e.semLinhaDeBase ? { semLinhaDeBase: true } : { linhaDeBase: a(e.linhaDeBase) }),
    arquivo: RESULTADOS, saida, derivadoRetrospectivo: manifesto });
  return { estado: res.estado, motivo: res.motivo, saida };
}
