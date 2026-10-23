# Benchmark de recuperação do oráculo — 1.0.0 (CANDIDATO, não congelado)

Conjunto de desenvolvimento para medir a busca do oráculo (NAT-95; avaliador em NAT-94).
Plano: `thesis-workspace/planejamento/atual/plano-implementacao-busca-oraculo-2026-10-22.md` §1.

- **Base:** KB literal `3.7.0-literal-2026-10-15` do validator (`normalized/rules.jsonl`); ids citáveis.
  A ferramenta avaliada é `get_ds_rules`. Unidades de `carried-over.jsonl` não têm rótulo: se
  voltarem, contam como não julgadas.
- **Estado:** 62 consultas, 102 rótulos, 26 componentes + regras globais (e-MAG via gov.br DS).
  `respondivel` 42 · `sem_resposta` 6 · `ambigua` 4 · `fora_escopo` 4 · `negativa_dificil` 6.
- **Relevância:** 2 = a cláusula sustenta a resposta · 1 = aceitável/contexto · -1 = enganosa (parece
  pertinente mas leva a conclusão errada). Rótulo de assunto não basta.
- **Família:** a base tem cópias literais da mesma cláusula com ids diferentes (às vezes em
  componentes diferentes, p.ex. checkbox/radio). Cópias são agrupadas pelo texto sem acento,
  sem marcação markdown (`* _ \``) e com espaços normalizados; toda cópia de uma cláusula rotulada
  recebe o mesmo rótulo e `familia` = o menor id do grupo. 7 cláusulas rotuladas têm cópias.
- **`sem_resposta`:** cada tema foi procurado na base inteira (texto, título, seção e página) e no
  `data/emag.json` em 2026-10-22 antes de ser marcado. Ausência não se presume: os cinco temas que a
  primeira busca não achou (busca no header, teclado no select, pausa no carrossel, título da
  página, erro de entrada) estavam na base e viraram `respondivel` (exceto a busca do header, que
  só tem anatomia e ficou `ambigua`). Rótulos -1 em `sem_resposta` marcam o falso amigo mais
  provável.
- **`negativa_dificil`:** a observação parece violação, mas a fonte permite ou a regra não se aplica;
  a permissão entra com 1 e a proibição fora de condição com -1.
- **`origem`:** todas `busca-lexical` — quem escreveu as consultas consultou a base antes. Nenhuma
  saiu de observação real de bateria; isso favorece o vocabulário da fonte e é limite do conjunto.
- **Limites:** só fontes públicas versionadas; nada das telas C/D; é teste de desenvolvimento, não
  validação independente.
- **Congelamento:** depois da revisão dos rótulos pelo Codex; o `manifest.json` já traz o sha256 dos
  bytes (LF, fixado em `.gitattributes`) e muda junto com qualquer correção da revisão. Congelado,
  o conjunto não muda por causa do ranking.
