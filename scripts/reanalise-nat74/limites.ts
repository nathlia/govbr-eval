/**
 * [revisão independente, NAT-74 comentário 93fa1437] Limites VERDADEIROS de D por par enquanto houver pendentes.
 *
 * Os antigos "limite inferior/superior" (1.0.0) eram cenários: o superior devolvia o crédito arquivado nos DOIS
 * braços ao mesmo tempo, e como D = com − sem, isso podia baixar D (A Opus p10: +1 / 0; A Sonnet p07: 0 / −1).
 * Eles continuam publicados, com os nomes certos: "sem crédito pendente" e "com crédito arquivado restaurado".
 *
 * Aqui, por braço: mínimo = o confirmado sem nenhum pendente; máximo = o confirmado mais TUDO o que os átomos
 * pendentes do braço podem creditar (unidades oferecidas pela ancoragem do cartão ∪ unidades que o arquivo creditou ∪
 * unidades da spec que o juiz indicou). A contagem segue a agenda (A: unidades A-xx; B: specs), cada unidade/spec uma
 * vez só (exclusividade). Dmin = com_min − sem_max; Dmax = com_max − sem_min.
 */
export interface BracoLimite { confirmadas: ReadonlySet<string>; admissiveis: ReadonlySet<string> }
export interface LimitesDoPar { sem: { min: number; max: number }; com: { min: number; max: number }; dMin: number; dMax: number }

/** Conta unidades pela agenda: modo `unidade` = unidades cuja spec casa `prefixo` (A-); modo `spec` = specs distintas. */
export function contador(modo: "unidade" | "spec", specDe: (unitId: string) => string | undefined, prefixo = "A-"): (us: Iterable<string>) => number {
  return us => {
    const xs = [...new Set(us)];
    if (modo === "spec") return new Set(xs.map(specDe).filter((s): s is string => !!s)).size;
    return xs.filter(u => specDe(u)?.startsWith(prefixo)).length;
  };
}

export function limitesDoPar(x: { sem: BracoLimite; com: BracoLimite }, contar: (us: Iterable<string>) => number): LimitesDoPar {
  const lim = (b: BracoLimite) => ({ min: contar(b.confirmadas), max: contar([...b.confirmadas, ...b.admissiveis]) });
  const sem = lim(x.sem), com = lim(x.com);
  return { sem, com, dMin: com.min - sem.max, dMax: com.max - sem.min };
}
