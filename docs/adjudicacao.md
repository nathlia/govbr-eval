# Adjudicação de achados sem unidade

> Procedimento humano. Ferramentas: `npm run adjudicate`, arquivo `adjudications.json`.
> Decisão de referência: **D-21** em `thesis-workspace/tcc2-decisions-log.md`.

## O problema

O scorer casa cada achado do agente com uma unidade esperada do gabarito (caso × regra
normativa). O que não casa com nada vira falso positivo. Mas **"não casou" e "o agente errou"
não são a mesma afirmação**, e o scorer não tem como distinguir: ele conhece o gabarito, não a
página. Enquanto os achados sem unidade não forem julgados um a um, a precisão dos dois braços é
**piso**, não medida (D-19) — e como o piso é assimétrico entre braços (17 contra 20 achados em
opus), a própria diferença de F1 entre eles é provisória.

Regra do D-17: **adjudicar antes de atribuir erro ao agente.**

## Os vereditos

| veredito | significado | efeito na métrica |
|---|---|---|
| `falso-positivo` | o agente errou | cobrado da precisão (FP) |
| `lacuna-gabarito` | violação real que o gabarito nunca catalogou | sai do FP, entra na dívida de gabarito |
| `vocabulario` | o defeito certo com nome que o scorer não conhece | vira casamento adjudicado da unidade em `unit` |
| `deteccao-correta` | conteúdo correto, mas citação ou âncora não foi mecanicamente válida | credita detecção na unidade, sem aumentar `ruleVerifiedTP` |
| `duplicado` | reformulação de outro achado já casado no mesmo caso | sai do FP |
| `indeterminado` | revisado e indecidível | **segue cobrado como FP** |
| `composto` | a alegação afirma **mais de um defeito**, e as partes não compartilham veredito | decidido por parte em `components` (D-30) |

`indeterminado` existe para que a indecisão nunca melhore o número. Se não dá para decidir, o
achado continua contra o agente — a assimetria é deliberada: o custo da dúvida recai sobre a tese,
não sobre o instrumento.

## Alegações compostas (`composto`, D-30)

Um achado pode afirmar dois defeitos de uma vez: metade descreve uma unidade que o gabarito já
cataloga, metade descreve uma violação que ele nunca teve. Antes do D-30 era preciso escolher, e
as duas escolhas mentiam em direções opostas — `vocabulario` creditava a unidade e **apagava a
lacuna**; `lacuna-gabarito` registrava a lacuna e **descartava o crédito**, mantendo o achado
cobrado como FP.

O veredito `composto` decide **parte por parte**. Cada componente carrega seu próprio `verdict`,
sua própria `rationale` e, quando for `vocabulario` ou `deteccao-correta`, sua própria `unit`:

```json
{
  "id": "E-7a5432:0918f5ad",
  "verdict": "composto",
  "rationale": "A alegação afirma dois defeitos que não se resolvem com a mesma correção.",
  "components": [
    { "verdict": "vocabulario", "unit": { "caseId": "E-7a5432", "rule": "wcag:3.3.2" },
      "rationale": "..." },
    { "verdict": "lacuna-gabarito", "gabaritoStatus": "pendente",
      "rationale": "..." }
  ]
}
```

Três regras que a implementação impõe:

1. **Mínimo de dois componentes.** Um só componente é registro simples usando rótulo composto, e
   `npm run adjudicate` o reporta como defeituoso.
2. **`composto` não aninha,** e `components` não é aceito com nenhum outro veredito.
3. **A cobrança é por alegação, não por parte.** Se qualquer componente resolver em cobrança —
   `falso-positivo`, `indeterminado`, ou um `vocabulario` cuja unidade não existe ou já foi casada
   — a alegação é cobrada **uma vez**. Uma alegação que contém afirmação falsa não é detecção
   limpa, mesmo que outra parte dela esteja certa; e cobrar por componente inflaria o FP de um
   achado só porque quem o escreveu foi prolixo.

**O teste para decidir se é composta:** *consertar um defeito consertaria o outro?* Se a resposta
é não, são duas unidades e o veredito é `composto`. Se é sim, é um defeito só e basta um dos
vereditos simples.

O equilíbrio de descoberta lê as lacunas dos **efeitos**, não do veredito de topo: uma lacuna
dentro de um `composto` conta no viés de pooling como qualquer outra.

## Quem pode julgar

O princípio é que **quem escreveu a tela ou o gabarito não escreve o veredito sobre eles** — quem
sabe onde o defeito foi plantado não está julgando a alegação, está conferindo um gabarito que já
tem na cabeça.

Só que o princípio estava sendo lido ao contrário, e vale escrever quem é quem. A tela
`/fluxo.html` e o `ground-truth-fluxo.json` **foram redigidos pelo assistente**, sob direção da
autora. A autora **não enumerou os defeitos injetados** e não tem a lista: pela regra, a parte
desqualificada é o assistente, não ela.

O que ela tem é **exposição pontual**, spec a spec, pelas decisões que discutiu — V-06 (D-31),
V-07 e os dois `<h2>` de 16px (D-32), V-04 (D-33). Exposição não é contaminação geral, e tratá-la
como se fosse custaria a única revisora disponível. A regra prática:

| situação | quem julga |
|---|---|
| alegação sobre elemento **sem spec** e fora das decisões discutidas | a autora, como revisora independente |
| alegação sobre spec que ela **discutiu** (V-04, V-06, V-07, V-12) | a autora, com `exposicao` declarada no registro |
| alegação sobre a tela ou o gabarito **como um todo** | nunca o assistente que os redigiu |

Não há outra pessoa disponível para revisar (registrado em 14/09), então a coluna "outra pessoa"
deixou de existir: toda alegação sobre spec discutida é julgada pela autora com a exposição
declarada. Declarar a exposição é o que torna o veredito legível para a banca: um julgamento
marcado "exposta a esta spec" vale mais que um julgamento silencioso de origem incerta.

### O que o assistente pode fazer — e o que não pode

O assistente redigiu a tela e o gabarito e **conhece o braço** de cada alegação. Isso não o
impede de ajudar; impede que ele decida o que move número. A divisão segue o **efeito** do
veredito, porque é o efeito que muda a métrica:

| etapa | quem | registro |
|---|---|---|
| **1. Pacote de evidência** — texto da alegação, medida na página viva, spec relacionada, texto da regra citada, por que o scorer não casou, tabela de vereditos. Neutro: sem braço, sem execução, sem recomendação. | assistente | — |
| **2. Classe de efeito** — cobrar (`falso-positivo`, `indeterminado`), dívida (`lacuna-gabarito`), crédito (`vocabulario`/`deteccao-correta`), `duplicado` ou `composto`. | **só a autora**, depois de ler o pacote | `verdict`, `rationale` |
| **3. Rótulo dentro do crédito e `unit`** — `vocabulario` ou `deteccao-correta`, e qual unidade. Não muda número no scorer de fluxo (os dois creditam sem `ruleVerifiedTP`). | assistente **propõe**, autora aprova ou troca | `proposta` |
| **4. Redação da razão** a partir das palavras da autora | assistente pode redigir; autora confere | `apoio` |

Três regras que fazem a divisão valer alguma coisa:

1. **A autora lê a evidência antes de ver qualquer proposta.** Aprovar o que se viu primeiro é
   ancoragem, não revisão.
2. **A proposta fica gravada separada da decisão.** `proposta` guarda o que o assistente sugeriu;
   `verdict` guarda o que a autora decidiu. Quando diferem, a diferença fica visível — e a taxa
   de concordância vira dado relatável, não impressão.
3. **Toda ajuda que possa ter moldado o veredito é declarada em `apoio`**, mesmo quando não houve
   proposta formal (ex.: o assistente explicou as definições, ou confirmou uma leitura que a autora
   já tinha nomeado). Um registro sem `apoio` e sem `proposta` afirma que não houve ajuda.

```json
{
  "verdict": "vocabulario",
  "unit": { "caseId": "E-890b25", "rule": "ds:token-spacing" },
  "rationale": "…",
  "proposta": { "por": "assistente", "verdict": "vocabulario", "unit": { "caseId": "E-890b25", "rule": "ds:token-spacing" }, "em": "2026-09-14" },
  "apoio": "razão redigida pelo assistente a partir das palavras da autora",
  "adjudicatedBy": "NF — autora do trabalho; não autora da tela nem do gabarito"
}
```

O que o assistente **nunca** faz: escolher a classe de efeito, sugerir qual braço "deveria" ter
acertado, ou redigir uma razão que a autora não tenha dado.

## O procedimento

1. **Semeie os stubs.** `npm run adjudicate -- --emit` escreve um registro com `verdict: null`
   para cada achado sem unidade em `adjudications.json`. Registros já decididos são preservados;
   só o texto do achado e a proveniência (`seenIn`) são reescritos, porque são derivados.

2. **Julgue no modo cego.** `npm run adjudicate -- --blind` lista os pendentes **sem** o braço e
   sem a execução, ordenados pelo hash do achado. Julgue nessa ordem, com a página aberta em
   `:3000` e o gabarito do caso à vista. Não é cerimônia: a alternativa é decidir se um achado é
   "plausível" já sabendo que ele vem do braço que a tese espera que ganhe.

3. **Escreva o veredito e a razão.** Em `adjudications.json`, preencha `verdict` e `rationale`.
   **Um veredito sem `rationale` não é aplicado** — o scorer o ignora e segue cobrando o FP, e
   `npm run adjudicate` o lista como registro defeituoso. Um veredito sem razão é uma afirmação,
   não uma adjudicação, e é exatamente o que um leitor cético da banca vai querer inspecionar.

   Para `vocabulario` ou `deteccao-correta`, preencha também `unit`: `{ "caseId": "...", "rule": "..." }` — a unidade
   que o achado de fato reportou. Se ela não existir no gabarito, ou já estiver casada por outro
   achado, o registro não é aplicável e o achado continua cobrado.

4. **Confira.** `npm run adjudicate` mostra julgados, pendentes, registros defeituosos e o
   equilíbrio de descoberta. `npm run score` passa a imprimir duas linhas — **piso** e
   **adjudicado** — lado a lado, nunca uma no lugar da outra.

5. **Pague a dívida de gabarito.** Cada `lacuna-gabarito` é uma unidade que ainda não existe.
   Escrevê-la em `ground-truth.json` exige, por D-06, rodar de novo `npm run axe` e
   `npm run eslint` para preencher a detecção medida das linhas de base — nunca por intuição.
   Feito isso, marque `gabaritoStatus: "incorporada"`.

## Aposentadoria de registro (`retirada`)

Nem todo registro pendente ainda é julgável. Uma alegação pode deixar de ser **sobra** por dois
caminhos, e nenhum dos dois é um veredito sobre ela:

| o que aconteceu | exemplo |
|---|---|
| a execução de origem saiu do instrumento vigente | as 4 execuções legado/não rotuladas que o scorer recusa sob `fluxo-1.1.0` (D-29) |
| o gabarito passou a casar a alegação | as bordas `#dee2e6`, absorvidas quando a V-06 foi a `todos` (D-31) |

Nesses casos o registro ganha `retirada: { em, porque, decisao }`, **sai da contagem de
pendentes e nunca do arquivo**. Aposentadoria não é julgamento: um registro aposentado não
carrega `verdict`, e `recordDefect` recusa a combinação. É reversível por construção — se a
execução voltar a ser pontuável ou o gabarito recuar, remover `retirada` devolve o registro à
fila.

O que impede a aposentadoria de virar um jeito de melhorar a precisão: o scorer não lê `retirada`.
Ele lê `verdict`, que num registro aposentado continua nulo — então uma sobra viva indevidamente
aposentada **seguiria cobrada como falso positivo**. A aposentadoria muda o que se pede a um
humano, não o que se cobra de uma execução.

## O viés que isto pode introduzir

Uma lacuna descoberta olhando só os achados de um braço aumenta o gabarito **na direção do que
aquele braço reporta**, e toda unidade acrescentada assim vira um FN para o outro braço, que
nunca teve chance de encontrá-la. É o viés de pooling da literatura de recuperação de informação,
e ele não se resolve com cuidado — se resolve com relato.

Por isso `npm run adjudicate` imprime o equilíbrio de descoberta: quantas lacunas apareceram só no
braço com oráculo, só no sem, e nas duas. **Assimetria grande ali é achado a relatar na
Discussão, não defeito a corrigir.** O número honesto acompanha a assimetria que o produziu.

## O que a adjudicação não é

Não é revisão do gabarito à luz do que o agente encontrou. A pergunta de cada achado é
"**isto é verdade na página?**" — não "isto seria conveniente?". Um achado plausível, bem escrito
e falso é falso positivo, e é justamente o tipo de erro que interessa medir num agente que produz
prosa convincente por construção.

Casos de referência merecem atenção redobrada: um achado sobre TC-S-03 significa ou que o caso
não é tão conforme quanto o gabarito afirma (lacuna, e o caso deixa de ser referência), ou que o
agente alucinou sobre uma página limpa (falso positivo legítimo, e dos mais informativos). As duas
leituras têm consequência — a primeira mexe no corpus, a segunda entra na Discussão.
