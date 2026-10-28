# Benchmark de recuperação do oráculo — 1.0.0 (RASCUNHO, não congelado)

Conjunto de desenvolvimento para medir a busca do oráculo (NAT-95; avaliador em NAT-94).
Plano: `thesis-workspace/planejamento/atual/plano-implementacao-busca-oraculo-2026-10-22.md` §1.
Método aceito pela autora: `thesis-workspace/decisoes-do-assistente.md`, linhas de 2026-10-23.

- **Base:** KB literal `3.7.0-literal-2026-10-15` do validator (`normalized/rules.jsonl`); ids citáveis.
  Ferramenta avaliada: `get_ds_rules`.
- **Estratos:** `respondivel` · `sem_resposta`, `ambigua`, `fora_escopo`, `negativa_dificil`.
- **Relevância:** 2 = a cláusula sustenta a resposta · 1 = aceitável/contexto · -1 = enganosa (parece
  pertinente mas leva a conclusão errada). Rótulo de assunto não basta.
- **Origem:** `observacao-real` = consulta nascida de uma observação real (achados e chamadas do
  oráculo dos agentes nas telas A, B e de fluxo; defeitos das referências ditos como o agente os veria;
  medições das páginas de controle do catálogo NAT-85), rotulada lendo a **lista inteira** de regras
  do(s) componente(s) e as listas globais (e-MAG, acessibilidade do DS, fundamentos, padrões), nunca
  por busca de palavra. `busca-lexical` = as 17 primeiras (q001–q017), achadas por busca de palavra;
  reportadas à parte.
- **Proveniência:** `provenance.jsonl`, uma linha por consulta `observacao-real` (arquivo de origem,
  observação ou chamada citada, data). Texto das observações sem dados pessoais (tela B é real; nomes
  omitidos). Nada das telas C/D.
- **Família:** cópias literais da mesma cláusula (texto sem acento, sem `* _ \``, espaços
  normalizados) recebem o mesmo rótulo e `familia` = o menor id do grupo, inclusive entre componentes.
- **Sem resposta honesta:** quando a base não tem cláusula que sustente (ex.: Template Base, raio,
  foco encoberto, aria-controls), a consulta vai para `sem_resposta`; nenhum suporte é inventado.

## Estado (28/10/2026)

Desenvolvimento: 72 consultas (17 `busca-lexical` + 55 `observacao-real`), 232 rótulos.
Por estrato: 56 respondíveis, 5 sem resposta, 5 ambíguas, 2 fora de escopo, 4 negativas difíceis.
Cobre 22 componentes e regras globais.

**Reserva:** 20 consultas `observacao-real`, sorteadas do mesmo conjunto de observações por sorteio
estratificado com semente registrada. Ficam **fora do repositório** e só são avaliadas com manifesto
externo (`--reserva --manifesto`). Manifesto externo: sha256 `7c51e3475b86f7c81ff3a2ce7724f1c285b8fe036d75743130ce332e0128a724`.
O Codex nunca vê a reserva.

**Rotulagem cega:** 15 consultas deste conjunto, sem rótulos, em
`thesis-workspace/planejamento/atual/nat95-rotulagem-cega/`; a concordância será publicada.

**Congelamento:** `manifest.json` (com sha256 dos bytes LF) só depois da rotulagem cega e da
revisão das divergências. O conjunto `../auxiliar-lexical-2026-10-22/` (45 consultas) está fora do
benchmark — ver o README dele.
