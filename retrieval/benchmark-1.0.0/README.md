# Benchmark de recuperação do oráculo — 1.0.0, rótulos 1.0.2 (CONGELADO em 2026-10-28)

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

## qrels 1.0.1 — pool da baseline 2.15.0 (28/10/2026, D-143)

- **Build:** validator 2.15.0, commit `ad10c0e`, KB `3.7.0-literal-2026-10-15`, só desenvolvimento
  (72 consultas; reserva fora). Pool exportado por `--pool` (top-5 inicial, ids ordenados, sem posição):
  sha256 `6276f641a5ccc8bb4597914cf943b717122731fe7a11467b98c91cf72282cd01`.
- **Tamanho:** 16 ids em 4 consultas (q067, q069, q070, q071). Na 2.15.0 `query` é substring literal
  sobre o texto da regra; as 68 outras consultas (todas as 56 respondíveis) não devolveram nada.
  1 id já estava rotulado (q067); **15 julgados**, lendo a cláusula, uma vez, antes de qualquer ajuste
  de ranking. Não serão rejulgados por causa do ranking.
- **Rótulo 0 (novo):** 0 = julgado e não relevante. Conta como julgado (sai de `unjudged`), nunca como
  acerto; avaliador `retrieval-evaluator-1.3.0`.
- **Adicionados:** 17 linhas (15 do pool + 2 cópias literais pela regra de família, com `familia`):
  2 → 0 · 1 → 8 · 0 → 9 · -1 → 0. Cada linha leva `nota: "pool 2.15.0 (D-143); …"`. Nenhum rótulo
  anterior mudou.
- **qrels.jsonl 1.0.1:** 249 linhas, sha256 `0d8558e63481c1bdfec58467247d057b474d2d1f7d0cfa6fbde07f476fe2d4de`.

## qrels 1.0.2 — pool de referência BM25 e congelamento (2026-10-28)

A baseline 2.15.0 não devolve nada nas 56 respondíveis, então o pool dela (1.0.1) cobriu só 4 consultas.
Complemento do D-143 (decisoes-do-assistente, 28/10): um sistema de referência fixo,
`scripts/pool-referencia-bm25.ts` (`27d3087`; BM25 sem acento, k1=1,2, b=0,75, top-10 em duas corridas,
todas as regras e componente+globais), escrito e congelado **antes** do NAT-97. Os 896 ids sem rótulo foram
julgados uma vez, lendo a cláusula (2: 4 · 1: 46 · 0: 831 · -1: 15), em quatro lotes por consulta; nota
`pool BM25 1.0 (D-143)`. Total: 1.145 rótulos. Daqui em diante os rótulos não mudam por causa do ranking;
resultados fora do pool continuam `unjudged` e são publicados ao lado de P@5.

Congelamento: `manifest.json` com sha256 dos bytes LF de `queries.jsonl` e `qrels.jsonl`.
Baseline no congelado: `../baselines/2.16.1-bbc9d56-qrels-1.0.2/` (ranking igual ao do 2.15.0):
respondíveis recall@5 0% (nada devolvido); geral 4,2%, P@5 3,3%, 1.192 caracteres. Referência BM25 sozinha
(sanidade, com os rótulos 1.0.1): 58,9% das respondíveis com ao menos um relevante no top-5.
A concordância com a rotulagem cega do Codex (15 consultas) será publicada contra este 1.0.2.

## Avaliador 1.4.0 e respostas 3.0.0 (2026-10-28)

O `retrieval-evaluator-1.4.0` lê as duas formas de resposta do `get_ds_rules`. A forma antiga
(`units`/`rules`/`candidates`/`items`) é reconhecida primeiro e pontuada exatamente como na 1.3.0. A
forma do validator 3.0.0 (contrato `oraculo-resposta/1.0.0`) traz cartões em `results`:

- **Relevância = rótulo do `citeAs`** do cartão. Os outros ids do cartão (título da seção, cláusulas
  da mesma unidade) são contexto: não somam relevância nem entram em conflito com ela. `citeAs` sem
  rótulo = `unjudged`, como antes. O cartão breve da consulta ambígua não tem `citeAs`; vale o
  `ids[0]` (a cláusula principal).
- **Família:** a regra desta página continua valendo, aplicada aos ids citados: cartões cujo `citeAs`
  é da mesma `familia` contam como uma unidade.
- **Conflito de rótulo:** `DATASET_LABEL_CONFLICT` deixa de disparar por causa dos ids de contexto de
  um cartão 3.0.0. Continua disparando na forma antiga e quando ids citados da mesma família têm
  rótulos opostos.
- **Contexto suficiente:** `requirement.complete: true` com `source` = contexto na 1ª chamada; senão o
  avaliador segue o `more.next` do cartão (chamada por `id`), contada como a 2ª.
- **Candidatas:** `page.matched` (não há `total`). **Erros:** `isError` = `TOOL_CALL_FAILED`; só o
  `errorCode` estático é guardado, em `errorCodes`, sem texto. **Caracteres:** o tamanho bruto de cada
  chamada, como antes.

Nenhum rótulo, consulta ou o manifesto mudou; o sha256 do manifesto cobre só `queries.jsonl` e
`qrels.jsonl`.

## Avaliador 1.5.0: nDCG@5, bpref@5, Hole@5 e `--furos` (D-148, 2026-10-28)

O `retrieval-evaluator-1.5.0` mantém todas as métricas da 1.4.0 com os mesmos valores (teste de
snapshot no fixture) e acrescenta três, calculadas sobre o top-5 devolvido depois do agrupamento por
família. O ideal e os denominadores usam os rótulos julgados da consulta, também com famílias colapsadas
(`familia` ou `unit_id`, rótulo = o maior do grupo):

- **nDCG@5** (Manning, Raghavan & Schütze 2008, §8.4, pp. 162–163): ganho 2 → 2, 1 → 1, e 0, -1 ou
  não julgado → 0; desconto log2(posição+1); DCG ideal com os rótulos positivos julgados. Consulta sem
  rótulo positivo fica de fora (`ndcgExcluded`).
- **bpref@5** (Buckley & Voorhees 2004, §2.1, p. 26): só documentos julgados. R = relevantes (>0),
  N = não relevantes (0 ou -1); bpref = (1/R) Σ_r (1 − min(n_r, R)/min(R, N)), n_r = não relevantes
  julgados acima de r, sobre a lista devolvida (top-5). Não julgados são ignorados. R = 0 fica de fora
  (`bprefExcluded`); N = 0 faz cada termo valer 1.
- **Hole@5** (Thakur et al. 2021, Tabela 4, p. 9): fração das unidades devolvidas no top-5 sem rótulo.
  No resumo, `holeAt5` = não julgadas / devolvidas (somadas) e `meanHoleAt5` = média por consulta.

As três aparecem no resumo geral, por estrato e por origem. `--furos <arquivo-novo>` (só
desenvolvimento, proibido com `--reserva`, gravado só se a execução termina sem erro) exporta, por
consulta pseudonimizada, os ids não julgados do top-5, ordenados, sem posição, texto ou rótulo. É a
entrada da rotulagem cega dos furos (D-148), em que os furos de várias versões são juntados e
embaralhados. Nenhum rótulo, consulta ou o manifesto mudou.

## qrels 1.0.3 — rotulagem cega dos furos (2026-10-28, D-148)

Os pools anteriores vieram só de sistemas léxicos. Antes de comparar a busca léxica (3.1.0) com a híbrida
e a vetorial (3.2.0, NAT-107), os ids do top-5 **não julgados** das três versões (saída `--furos` do
avaliador 1.5.0) foram unidos e embaralhados, sem indicar a versão de origem: 355 pares, 72 consultas.
Foram julgados uma vez, lendo a cláusula, em quatro lotes (2: 1 · 1: 29 · 0: 314 · -1: 11), com a nota
`furos 1.0.3 (D-148)`. Só acréscimo: nenhum rótulo existente mudou. Total: 1.500 rótulos. sha256 no
`manifest.json` (o 1.0.2 fica em `historico`). Remédio de Thakur et al. (BEIR), pp. 8–9.

## avaliador 1.6.0 — modo de busca e furos da reserva (2026-10-28)

O `retrieval-evaluator-1.6.0` não muda nenhuma métrica nem nenhum byte de saída quando as opções novas
não são usadas. `--modo-busca lexical|hybrid|dense` envia `retrieval: <modo>` em toda chamada a
`get_ds_rules` (validador 3.2.0), inclusive nas chamadas de seguimento; sem a opção, nada é enviado e vale
o padrão do servidor. O modo fica registrado como `retrieval` no `inputs.json` e no `manifest.json`
(também na reserva). Valor desconhecido é recusado antes de ler qualquer entrada.

`--furos` passa a ser aceito com `--reserva` só quando o caminho canônico (links e ancestrais existentes
resolvidos) fica fora de todo repositório git — nenhum diretório ancestral contém `.git` — e fora das
pastas do conjunto e do validador. O conteúdo é o mesmo dos furos de desenvolvimento (consulta
pseudonimizada + ids não julgados, ordenados, sem texto, posição ou rótulo). As demais regras da reserva
não mudaram (`--pool` continua proibido; erros continuam como `RESERVE_RUN_FAILED`).
