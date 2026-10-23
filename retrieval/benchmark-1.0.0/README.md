# Benchmark de recuperação do oráculo — 1.0.0 (RASCUNHO, não congelado)

Conjunto de desenvolvimento para medir a busca do oráculo (NAT-95; avaliador em NAT-94).
Plano: `thesis-workspace/planejamento/atual/plano-implementacao-busca-oraculo-2026-10-22.md` §1.
Método aceito pela autora: `thesis-workspace/decisoes-do-assistente.md`, linha de 2026-10-23.

- **Base:** KB literal `3.7.0-literal-2026-10-15` do validator (`normalized/rules.jsonl`); ids citáveis.
  Ferramenta avaliada: `get_ds_rules`.
- **Estratos:** `respondivel` (meta 40) · `sem_resposta`, `ambigua`, `fora_escopo`, `negativa_dificil` (meta 20).
- **Relevância:** 2 = a cláusula sustenta a resposta · 1 = aceitável/contexto · -1 = enganosa (parece
  pertinente mas leva a conclusão errada). Rótulo de assunto não basta.
- **Origem:** consultas novas nascem de observações reais (achados dos ensaios A/B, medições dos
  controles) e são rotuladas lendo a lista inteira de regras do componente, nunca por busca de
  palavra. As 17 atuais saíram de busca de palavra: `origem: busca-lexical`, reportadas à parte.
- **Família:** cópias literais da mesma cláusula (texto sem acento, sem `* _ \``, espaços
  normalizados) recebem o mesmo rótulo e `familia` = o menor id do grupo.
- **Divisão:** 40 desenvolvimento / 20 reserva; o Codex nunca vê a reserva (fica fora do repositório,
  avaliada com manifesto externo). O Codex rotula ~15 consultas às cegas e a concordância é publicada.
- **Limites:** só fontes públicas versionadas; nada das telas C/D; é teste de desenvolvimento.
- **Congelamento:** `manifest.json` (com sha256 dos bytes LF) só no congelamento.

Estado: 17 consultas (15 respondíveis, 1 negativa difícil, 1 fora de escopo), todas `busca-lexical`.
O conjunto `../auxiliar-lexical-2026-10-22/` (45 consultas) está fora do benchmark — ver o README dele.
