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

`indeterminado` existe para que a indecisão nunca melhore o número. Se não dá para decidir, o
achado continua contra o agente — a assimetria é deliberada: o custo da dúvida recai sobre a tese,
não sobre o instrumento.

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
