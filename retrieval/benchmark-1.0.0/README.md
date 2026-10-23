# Benchmark de recuperação do oráculo — 1.0.0 (RASCUNHO, não congelado)

Conjunto de desenvolvimento para medir a busca do oráculo (NAT-95; avaliador em NAT-94).
Plano: `thesis-workspace/planejamento/atual/plano-implementacao-busca-oraculo-2026-10-22.md` §1.

- **Base:** KB literal `3.7.0-literal-2026-10-15` do validator (`normalized/rules.jsonl`); ids citáveis.
- **Estratos:** `respondivel` (meta 40) · `sem_resposta`, `ambigua`, `fora_escopo`, `negativa_dificil` (meta 20).
- **Relevância:** 2 = a cláusula sustenta a resposta · 1 = aceitável/contexto · -1 = enganosa (parece
  pertinente mas leva a conclusão errada). Rótulo de assunto não basta.
- **Limites:** só fontes públicas versionadas; nada das telas C/D; é teste de desenvolvimento, não
  validação independente. Consulta sem qrel positivo = a resposta honesta é "não há regra na base".
- **Congelamento:** só depois de 60+ consultas e revisão dos rótulos pelo Codex; a partir daí o
  conjunto não muda por causa do ranking.

Estado: 12 consultas (10 respondíveis, 1 negativa difícil, 1 fora de escopo). `manifest.json` vem no
congelamento.
