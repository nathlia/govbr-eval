# Skill: evaluate-screen

Protocolo de avaliação de **uma tela qualquer** construída com o Design System do gov.br. Diz
**onde olhar**, **como capturar evidência** e **como reportar** &mdash; e nada sobre o que é certo
ou errado no DS, nem sobre a tela específica que você vai avaliar.

## As duas regras que governam este arquivo

**1. Procedimento apenas (requisito A6).** Conhecimento de domínio &mdash; regras, tokens, specs
&mdash; mora no oráculo, nunca aqui. Um protocolo que diz qual é a escala de espaçamento **é um
segundo oráculo**, e aí nenhum experimento consegue medir o que o oráculo MCP contribui: a
comparação vira "receber a regra por MCP" contra "receber a mesma regra por texto".

**2. Nada sobre a tela avaliada.** Este arquivo não sabe quantas telas existem, que abas elas têm,
que rotas o site serve, nem o que há dentro delas. Tudo isso chega pela **invocação**, não pelo
protocolo.

A segunda regra é nova e existe por dois motivos. O primeiro é prático: um protocolo que enumera
as abas do corpus só funciona naquele corpus. O segundo é de validade: descrever a topografia da
tela é dizer ao agente onde procurar, e uma tela de portal real não vem acompanhada desse mapa. Se
a afirmação da pesquisa é que o método serve a portais reais, o procedimento tem de funcionar sem
o mapa.

## Ao editar

Pergunte de cada frase nova:

- **"isto diria a um agente sem oráculo algo que ele não teria como saber sozinho?"** &rarr; se sim,
  vai para o oráculo;
- **"isto vale para qualquer tela, ou só para a que estou pensando agora?"** &rarr; se só para uma,
  vai para a invocação.

Proibidos aqui: valores de token, nomes de fonte do DS, nomes de classe do DS, escalas numéricas,
listas de valores permitidos, tabelas que mapeiem observação → veredito, e qualquer descrição da
estrutura de uma tela concreta.

`npm run lint:protocol` verifica a primeira regra automaticamente e roda no preflight da bateria.

---

## Sua tarefa

A invocação nomeia **o que avaliar**: uma ou mais URLs, e possivelmente instruções de percurso
(abrir algo, percorrer partes, restringir o escopo). Se nada mais for dito, avalie a tela inteira.

Alguns elementos da tela contêm defeitos de conformidade ou de acessibilidade; outros estão
corretos. Você não sabe quais são quais, quantos são, nem em que proporção &mdash; e não deve supor
que haja algum.

Decida, **elemento a elemento**, se há violação e qual norma foi violada, com base no que você
observar na página e no que você souber sobre acessibilidade e sobre design systems. Se você tiver
acesso a ferramentas de consulta a normas, use-as. Se não tiver, julgue com o seu próprio
conhecimento e diga em que norma se baseia.

Julgue com o mesmo rigor os elementos que parecerem corretos: apontar um elemento conforme é um
falso positivo e conta contra você tanto quanto deixar passar uma violação.

## Contrato de saída

Um achado por elemento e por regra, localizado por um seletor CSS:

```json
{
  "selector": "#exemplo .algum-elemento",
  "rule": "wcag:4.1.2",
  "description": "o que você observou e por que isso viola a norma citada"
}
```

Sobre o `selector`:

- tem de resolver na página em execução &mdash; ele será avaliado com `document.querySelectorAll`.
  Um seletor que não alcança elemento nenhum conta como achado errado;
- **um seletor que alcança k elementos são k afirmações da mesma regra.** Se a mesma violação vale
  para vários elementos, um seletor que alcance todos eles é a forma correta de reportar, e você
  não precisa repetir o achado;
- pela mesma razão, um seletor mais largo do que a sua afirmação custa caro: os elementos
  alcançados a mais entram como falsos positivos, um por um. Escolha o seletor mais estreito que
  cubra exatamente o que você está afirmando;
- confira cada seletor na própria página antes de fechar o relatório.

O campo `rule` deve usar o vocabulário de identificadores:

- `govbr-<versão>-…` &mdash; identificador determinístico vindo de uma ferramenta de consulta a
  regras, **quando você tiver acesso a uma**;
- `emag:<seção>` &mdash; recomendação do e-MAG 3.1, e.g. `emag:6.5`; <!-- lint-protocol: ok --> versão da norma no contrato de saída, não critério de violação; idêntico nos dois braços
- `wcag:<critério>` &mdash; critério de sucesso da WCAG, e.g. `wcag:3.3.2`;
- `ds:<regra>` &mdash; regra específica de design system, quando nenhuma das anteriores couber.

Escolha o identificador mais específico que você puder justificar. Se não conseguir atribuir um
identificador com honestidade, descreva a violação mesmo assim e deixe claro na descrição que a
atribuição normativa é incerta &mdash; **não invente um identificador plausível.**

---

## Passos

### 1. Registre o horário de início

Você não tem acesso a shell nesta execução &mdash; é deliberado, e vale para os dois braços. Tire
o horário do navegador:

```js
new Date().toISOString()
```

Guarde o valor: ele vira `cost.startedAt`. A partir daqui, conte todas as chamadas de ferramenta
que você fizer.

Se você tiver ferramentas de consulta a normas disponíveis, carregue agora as referências que
julgar necessárias &mdash; a escolha de o quê carregar é sua e faz parte do que está sendo medido.

Quando uma ferramenta devolver findings compactos, registre os ids e decida primeiro pela versão
resumida. Busque evidência detalhada somente para os candidatos relevantes e peça o objeto completo
apenas quando outra ferramenta exigir esse contrato. Se houver `truncated`/`nextCursor`, continue
pelo `scanId` até fechar o escopo, sem repetir o scanner; não refaça evidência válida enquanto o
estado não mudar.

Agrupe seletores independentes no mesmo pedido quando a ferramenta aceitar `selectors`. Em leitura
de estilos, peça apenas as `properties` necessárias à decisão. Consulte vários ids de regra juntos
quando houver suporte a `ids`; chamadas unitárias repetidas para o mesmo estado são desperdício.

### 2. Leitura

Para cada URL que a invocação nomear:

- navegue até ela;
- tire um snapshot da árvore de acessibilidade completa (nomes, papéis, atributos ARIA, associações
  de rótulo);
- leia os estilos computados dos elementos, pelos meios que você tiver disponíveis. Leia a página
  **como ela está**; ferramentas que recarregam desfazem o estado que você alcançou.

### 3. Operação

Snapshot não basta: uma tela existe para ser usada, e parte do que ela faz só aparece quando você a
usa. Acione os controles, preencha e submeta o que houver para submeter, tente percorrer por
teclado, tente sair do que abrir, e observe se o que a interface comunica corresponde ao que ela
faz.

O que aparecer depois de uma interação é parte da tela e se avalia como o resto.

### 4. Varredura entre elementos

Depois das verificações elemento a elemento, olhe a página como um todo: há relações entre
elementos distantes que só aparecem quando você os compara. Faça essa passada antes de fechar o
relatório.

### 5. Monte e salve o relatório

```json
{
  "timestamp": "<ISO>",
  "model": "<modelo>",
  "appUrl": "<a URL que a invocação nomeou>",
  "config": { "arm": "<com-oraculo|sem-oraculo>", "label": "protocolo neutro" },
  "cost": {
    "startedAt": "<ISO do passo 1>",
    "finishedAt": "<ISO agora>",
    "wallClockSeconds": 0,
    "toolCalls": 0
  },
  "scope": ["o que você inspecionou, em palavras suas"],
  "notes": "o que você tentou na operação da tela",
  "findings": [
    { "selector": "...", "rule": "...", "description": "..." }
  ]
}
```

O bloco `cost` é obrigatório (F4). O bloco `config` rotula a execução para o scorer, que agrupa por
configuração e nunca agrega grupos diferentes.

A invocação nomeia **a origem e o caminho** para salvar. Navegue primeiro para essa origem e faça o
`POST` de lá, na mesma origem &mdash; o endpoint não envia cabeçalhos CORS, então um `fetch` a
partir da origem avaliada seria barrado pelo navegador:

```js
fetch("<caminho que a invocação nomeou>", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(RELATORIO)
}).then(r => r.json())
```

Faça isso **depois** de fechar todos os achados: sair da página avaliada a descarrega.

### 6. Imprima um resumo

Uma linha por achado: seletor, regra e a violação em poucas palavras.

---

## Validade

- **Não leia** nenhum gabarito, nada em `results/` ou `docs/`, nem o fonte da aplicação avaliada.
  Os achados têm de vir do que você observou na página em execução. O harness bloqueia esses
  caminhos; se algo passar, a regra continua valendo.
- **Não recupere versões anteriores deste protocolo** (histórico do repositório, cópias de
  rascunho).
- Se você não tiver acesso a ferramentas de consulta a normas, isso é **deliberado** e faz parte da
  condição sendo medida. Não é um defeito de configuração a ser contornado: siga em frente e julgue
  com o que você sabe.
