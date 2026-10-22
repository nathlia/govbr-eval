---
name: avaliar-tela
description: Avalia a conformidade de uma tela web em execução com o padrão digital do governo federal (gov.br Design System) e a acessibilidade (e-MAG e WCAG 2.2), somente pela interface, e envia um relatório JSON ao destino indicado. Use quando a tarefa fornecer a URL, o escopo, o destino de envio e os limites da execução.
---

# Avaliar uma tela em execução

Avalie a tela descrita em **Entradas**, no fim deste texto, quanto à conformidade com o padrão
digital do governo federal (gov.br Design System) e à acessibilidade (e-MAG e WCAG 2.2). Tudo de
que a tarefa precisa está neste texto e nas ferramentas do ambiente: não há arquivo a ler nem
projeto a consultar.

## Limites

- Avalie somente a URL e o escopo das Entradas. Não procure código-fonte, documentação, relatórios
  nem avaliações anteriores, na máquina ou na rede.
- Não suponha que existam problemas, nem que não existam. Afirmação falsa e problema não relatado
  contam igualmente contra a avaliação.
- A janela do navegador começa com o tamanho que o ambiente fixou. Não altere o tamanho da janela,
  o zoom nem a emulação de dispositivo. Outras larguras do escopo só podem ser alcançadas pelo meio
  que as Entradas declaram.
- Use as ferramentas de validação disponíveis para fundamentar a avaliação. Quando elas não estiverem disponíveis, inspecione a interface com as ferramentas de navegador e declare as incertezas. Não procure substitutos externos.
- Respeite os limites da execução. Se o tempo ou as interações acabarem, envie o que já tem e
  declare o que ficou de fora.

## Procedimento

1. Abra a URL. Meça a largura e a altura reais da área visível da janela e anote: é o viewport dos
   achados feitos nela.
2. Descubra regiões, controles e estados pela própria interface. Observe a árvore de
   acessibilidade, o DOM, os textos e os estilos calculados relevantes.
3. Opere a tela: use mouse e teclado, preencha e envie formulários, abra e feche componentes,
   confira foco, nomes, papéis, mensagens e mudanças de estado. Anote cada interação, em ordem,
   desde o carregamento.
4. Mantenha o registro de inspeção (seção abaixo) enquanto percorre: regiões, estados com a receita
   desde o carregamento, itens inspecionados, candidatos com a decisão e limitações.
5. Se houver ferramentas de validação, use-as em cada estado relevante. Quando uma delas abrir o
   próprio navegador, ele não compartilha o estado do seu: reproduza nela as interações que levaram
   ao estado avaliado. Guarde os identificadores que ela devolver; são evidência. Continue uma
   resposta truncada pelo identificador recebido, sem repetir a verificação. Falha, erro, resposta
   vazia ou silêncio de uma ferramenta não é ausência de problema, e silêncio ou ausência numa
   especificação não é conformidade: registre como limitação.
6. Confronte cada candidato com a interface antes de aceitá-lo. Se uma ferramenta disponível
   permitir confirmar o candidato, confirme; senão, decida pela inspeção e declare o grau de
   certeza. Um veredito de ferramenta sobre a regra citada ou sua aplicabilidade (citação rejeitada,
   indeterminado, regra ausente) não desmente o fato que você mediu: mantenha o fato com a
   referência WCAG/e-MAG que você justifica, ou com `rule: null`. Se a ferramenta contradisser
   o fato com evidência medida, a afirmação está desmentida: não a mantenha.
7. Se o escopo listar outras larguras, alcance cada uma somente pelo meio declarado e repita os
   passos 1 a 6 nela.
8. Faça uma passada final entre regiões, para relações entre elementos que não aparecem
   isoladamente. Confira cada seletor na página e monte o relatório a partir do registro.

Orçamento: não repita uma verificação cujo resultado ainda vale para o estado atual; agrupe
consultas e peça somente as propriedades necessárias. Depois de 12 investigações detalhadas no mesmo
estado, anote por que outra é necessária antes de continuar. Encerre quando o escopo tiver sido
percorrido e cada candidato estiver aceito, rejeitado ou declarado incerto.

## Achados

Produza um achado por problema corrigível de forma independente: se corrigir uma parte não corrige
a outra, são dois achados. Cada achado é uma única afirmação, e o mesmo problema não se repete sob
outro critério.

- `selector`: seletor CSS do sujeito principal. Ele será executado com `document.querySelectorAll`
  e precisa alcançar somente os elementos afirmados; vários elementos significam a mesma afirmação
  para cada um. Não use um ancestral largo no lugar do elemento observado.
- `relatedSelectors`: quando o problema é uma relação entre elementos, os demais participantes
  efetivamente inspecionados. Omita quando não houver.
- `observed`: o valor, texto, atributo ou comportamento constatado.
- `expected`: a condição que deveria valer.
- `rule`: o identificador exato devolvido por uma ferramenta de validação, quando houver. Fora
  disso, uma referência normativa que você consiga justificar, no formato `emag:<seção>`,
  `wcag:<critério>` ou `ds:<regra>`; um critério amplo não justifica uma exigência mais
  específica. Na dúvida, `"rule": null`. Não invente um identificador plausível.
- `state.viewport`: largura e altura reais da área visível, inteiros em pixels, medidas no passo 1
  ou na largura alcançada pelo meio declarado.
- `state.steps`: as interações desde o carregamento, em ordem; lista vazia se não houve interação.
- `evidence`: caminhos ou identificadores devolvidos pelas ferramentas que sustentam a observação.

## Registro de inspeção

O campo `inspection` do relatório registra o percurso. Ele descreve só o que você descobriu: não
afirme ter coberto o que não chegou a descobrir. Ids são curtos e únicos em cada lista.

- `completion`: `complete` só se toda região registrada foi inspecionada e todo estado registrado
  foi alcançado; senão `partial`.
- `regions`: `id`, `description`, `origin` (`browser` se você a encontrou inspecionando;
  `validation-tool` se uma ferramenta a apontou, com `originRef`), `status` (`inspected`, `partial`
  ou `not-inspected`, os dois últimos com `reason`) e os `states` em que apareceu.
- `states`: `id`, `url`, `viewport` medido, `recipe` (passos `action`, `target`, `value`, o
  primeiro `load`), `arrival` e `evidence`. Em `arrival`, `observables` diz o que mostra o estado;
  `status` é `confirmed` somente com `originRef` devolvido por uma ferramenta, `declared` sem ele e
  `not-reached` com `reason`.
- `items`: `state`, `region` quando houver, `subject`, `check`, `status` (`completed`, `failed`,
  `not-available` ou `omitted`, com `reason` fora de `completed`) e `evidence`.
- `candidates`: `state`, `origin` (com `originRef` quando `validation-tool`: o identificador que a
  ferramenta devolveu), `subject`, `observation`, `decision` (`accepted`, `rejected` ou
  `uncertain`, os dois últimos com `reason`), `evidence` e `findings`: as posições, a partir de 0,
  dos achados enviados que o candidato originou; obrigatório quando `accepted`. Quando uma
  ferramenta agrupar candidatos idênticos, um candidato com o identificador do grupo vale para cada
  membro recebido; um membro com decisão diferente ganha candidato próprio, com o identificador
  dele. Membros anunciados e não recebidos entram em `limitations`.
- `limitations`: `kind` (`budget`, `tool-failure`, `unreachable`, `truncated`, `out-of-scope` ou
  `other`) e `detail`.

O relatório tem este formato. Os valores do exemplo são marcadores: substitua todos pelo que você
observou e mediu.

```json
{"timestamp":"momento do envio, ISO 8601","model":"seu modelo","appUrl":"URL avaliada","scope":["o que foi percorrido"],"notes":"interações, limitações e incertezas","findings":[{"selector":"#sujeito","relatedSelectors":["#participante"],"rule":null,"observed":"o que foi constatado","expected":"a condição que deveria valer","state":{"viewport":{"width":1,"height":1},"steps":["interação"]},"evidence":["identificador devolvido por uma ferramenta"]}],"inspection":{"completion":"partial","regions":[{"id":"r1","description":"região observada","origin":"browser","status":"inspected","states":["s1"]}],"states":[{"id":"s1","url":"URL do estado","viewport":{"width":1,"height":1},"recipe":[{"action":"load","target":"URL avaliada"},{"action":"click","target":"#controle"}],"arrival":{"status":"declared","observables":["o que mostra o estado"]},"evidence":[]}],"items":[{"id":"i1","state":"s1","region":"r1","subject":"#sujeito","check":"o que foi conferido","status":"completed","evidence":[]}],"candidates":[{"id":"c1","state":"s1","origin":"browser","subject":"#sujeito","observation":"o que foi constatado","decision":"accepted","findings":[0],"evidence":[]}],"limitations":[{"kind":"budget","detail":"o que ficou de fora e por quê"}]}}
```

## Envio

`notes` registra as interações tentadas, as ferramentas que falharam ou não estavam disponíveis, o
que ficou fora do escopo e as incertezas.

O envio é obrigatório e é o último passo, inclusive sem achados: nesse caso o corpo leva
`"findings": []`, e o escopo limpo é o resultado. Se o tempo acabar, envie o que tem com
`"completion": "partial"` e a limitação `budget`, mesmo com `"findings": []`. Terminar sem enviar é execução perdida. Envie
conforme as Entradas, com `Content-Type: application/json` e o relatório como corpo. Depois
imprima uma linha por achado, com seletor, critério e resumo.

## Entradas

- URL da tela: {{URL}}
- Escopo: {{ESCOPO}}
- Larguras a cobrir: {{LARGURAS}}
- Meio para alcançar outras larguras: {{MEIO_LARGURAS}}
- Envio: navegue até {{ORIGEM_ENVIO}} e, a partir dessa página, faça `POST` em {{CAMINHO_ENVIO}}.
- Limites da execução: {{LIMITES}}
