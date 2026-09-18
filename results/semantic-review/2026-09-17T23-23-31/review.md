# Revisão semântica — pacote fechado

Versão: flow-semantic-1.4.0 · 21 cartões únicos · 21 pendentes

## As três filas

| Fila | Quantidade | O que ela cobra |
|---|---|---|
| **Ativa — desta bateria** | 21 cartão(ões) | **Só esta fecha a bateria.** Enquanto houver um, as métricas são provisórias. |
| Histórica — de outras baterias | 0 | Dívida declarada do projeto. Não cobra nada desta bateria, e não some por isso. |
| Descobertas para a próxima referência | 0 afirmação(ões) | Defeito correto fora do gabarito congelado. Entra na PRÓXIMA versão; não mexe no denominador desta. |

Esforço: 21 sujeitos · 21 cartão(ões) sem evidência verificada · 12 com unidade candidata · estimativa **126 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado. Declare antes de começar — depois de ver os cartões já não é orçamento.

Esta renderização NÃO é cega: 0 cartão(ões) contêm texto que nomeia o braço da execução. Para decidir sem saber o braço, gere com `--cego`.

## Como decidir

Escreva `decisao` em cada átomo, com uma destas cinco palavras:

| `decisao` | Quer dizer |
|---|---|
| `defeito-do-gabarito` | a alegação acertou um defeito que o gabarito cataloga (nomeie a unidade em `unitIds`) |
| `defeito-novo-correto` | está certa, mas o defeito não está no gabarito: vai para a próxima referência |
| `incorreta` | a alegação está errada |
| `duplicada` | é a mesma afirmação de outro átomo já decidido (aponte `duplicateOf`) |
| `evidencia-insuficiente` | não dá para decidir com o que está aqui |

A contabilidade (`reference`/`novel`/`false`/`unresolved`) é derivada disso; você não precisa escrevê-la.

Este pacote inclui todas as alegações selecionadas, inclusive as que casariam por regra.
Candidatos são sugestões de âncora, não vereditos. Você continua sendo a adjudicadora.
Edite reviews.json; depois gere uma NOVA saída com score. Não edite package.json.

Evidência da execução (achado-2) aponta para a cópia preservada do que as ferramentas gravaram durante a execução; confira-a antes das reconstruções.
As capturas scene-* são reconstruções no momento de preparar o pacote, não prova de que o agente observou o mesmo estado.
Confira também reportedEvidence, inclusive as limitações declaradas. Use unresolved quando não houver suporte.

Cartões de linha de base (origem determinística) são revisados como os do agente: é o que permite dizer o que o agente acrescenta ou perde em relação à ferramenta.
Cena = janela do plano de estados. Uma unidade só pode ser creditada por cartão da mesma cena.

Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.
Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.
Duplicatas revisadas: no átomo repetido, acrescente duplicateOf: { "cardId": "C-...", "atomId": "..." }. A citação continua avaliada separadamente.

## C-0127b8fa966708b29ae8b928028f63b9afcf62bc66644f20eb68c05283e0a533

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: border-color: rgb(222, 226, 230) (#dee2e6) não corresponde a nenhum token do DS

Esperado: Valor de token do DS; mais próximo: --gray-cool-10 (#dfe1e2, distância RGB 4.24)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-color

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-0a51328ca40e840ea532a43e8ed968dab775783238f2a112d4e28f4bcc3d997e — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2)",
    "rule": "ds:token-color",
    "observed": "border-color: rgb(222, 226, 230) (#dee2e6) não corresponde a nenhum token do DS",
    "expected": "Valor de token do DS; mais próximo: --gray-cool-10 (#dfe1e2, distância RGB 4.24)",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-0127b8fa966708b29ae8b928028f63b9afcf62bc66644f20eb68c05283e0a533",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-22410dae11785fef62cfb83678e745c9901590af8e3c4e36e95d4769b998e637

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 320x720

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 320×720 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "320x720",
    "viewport": {
      "width": 320,
      "height": 720
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-22410dae11785fef62cfb83678e745c9901590af8e3c4e36e95d4769b998e637",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-226d5a302b107786379156c349aec0e68a66cda2df480997f7c6e579b1be3eb0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: border-color: rgb(222, 226, 230) (#dee2e6) não corresponde a nenhum token do DS

Esperado: Valor de token do DS; mais próximo: --gray-cool-10 (#dfe1e2, distância RGB 4.24)

Janela: 1280×720 · interações desde o carregamento: nenhuma

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 1280x720 na cena 1280x900

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-0a51328ca40e840ea532a43e8ed968dab775783238f2a112d4e28f4bcc3d997e — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-001` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2)",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "border-color: rgb(222, 226, 230) (#dee2e6) não corresponde a nenhum token do DS",
    "expected": "Valor de token do DS; mais próximo: --gray-cool-10 (#dfe1e2, distância RGB 4.24)",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "steps": []
    },
    "evidence": [
      "F-001"
    ]
  },
  "scope": [
    "http://127.0.0.1:3100/fluxo.html"
  ],
  "notes": "Varredura completa da página com tokens, estrutura e axe. Página carregada sem erros funcionais. Nenhuma interação realizada."
}
````

### Decisão

````json
{
  "cardId": "C-226d5a302b107786379156c349aec0e68a66cda2df480997f7c6e579b1be3eb0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-2bfbea93019d92c401474f83b02fedd16d970b383a252c3e12fae48396a79690

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 320x720

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 320×720 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "320x720",
    "viewport": {
      "width": 320,
      "height": 720
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-2bfbea93019d92c401474f83b02fedd16d970b383a252c3e12fae48396a79690",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5c6f8cfe8cbd08733e6f87b220063fa4b8740a61d61a5069be796a2fcf1004fe

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×720 · interações desde o carregamento: nenhuma

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 1280x720 na cena 1280x900

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"

### Unidades candidatas (não são crédito)

- U-0ceb07ddb653f8cb9fc078690580f877f9c920af1c696626700c5f784dc97c60 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-69e546ff40b7b212fc4d6b2b3cf3873c8ba13022f0993135b0d82027459f3b2e — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-004` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "steps": []
    },
    "evidence": [
      "F-004"
    ]
  },
  "scope": [
    "http://127.0.0.1:3100/fluxo.html"
  ],
  "notes": "Varredura completa da página com tokens, estrutura e axe. Página carregada sem erros funcionais. Nenhuma interação realizada."
}
````

### Decisão

````json
{
  "cardId": "C-5c6f8cfe8cbd08733e6f87b220063fa4b8740a61d61a5069be796a2fcf1004fe",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6ebdc93816c229d89585853c6f33b96bd5336c5aa84f6e5823c190e488254d49

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 320x720

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 320×720 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(4)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "320x720",
    "viewport": {
      "width": 320,
      "height": 720
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6ebdc93816c229d89585853c6f33b96bd5336c5aa84f6e5823c190e488254d49",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6fd613100b3d0666f5269a75fe1816c9b10072c84171b7d1fc021025efc52ee6

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 320x720

Observado: br-input aplicado a <input>

Esperado: Elemento <div>

Janela: 320×720 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:structure-input-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "rule": "ds:structure-input-tag",
    "observed": "br-input aplicado a <input>",
    "expected": "Elemento <div>",
    "scene": "320x720",
    "viewport": {
      "width": 320,
      "height": 720
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6fd613100b3d0666f5269a75fe1816c9b10072c84171b7d1fc021025efc52ee6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-80d8e5e6e2d19d2267193c3e5b306caa23147dc0ec770f0b0aabfea098c987eb

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"

### Unidades candidatas (não são crédito)

- U-0ceb07ddb653f8cb9fc078690580f877f9c920af1c696626700c5f784dc97c60 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-69e546ff40b7b212fc4d6b2b3cf3873c8ba13022f0993135b0d82027459f3b2e — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-80d8e5e6e2d19d2267193c3e5b306caa23147dc0ec770f0b0aabfea098c987eb",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-812ac018b42407c941333384a11ad11d566261c4ae9f7aa1f8ee06777724dc44

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: The 'Alto Contraste' toggle button changes visual state when clicked but does not expose this state change via aria-pressed attribute.

Esperado: Toggle buttons should have aria-pressed="true" or aria-pressed="false" to indicate their state to screen reader users.

Janela: 1251×1278 · interações desde o carregamento: 1. Clicked Alto Contraste button, visual appearance changed to highlighted state

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>header>div>button:nth-of-type(1)" — <button> "Alto Contraste"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `Button has textContent 'Alto Contraste', className 'br-button recurso-contraste'` → identificador devolvido por ferramenta (sem arquivo)
- `Visual state changes when clicked but no aria-pressed attribute present` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "button.recurso-contraste",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "The 'Alto Contraste' toggle button changes visual state when clicked but does not expose this state change via aria-pressed attribute.",
    "expected": "Toggle buttons should have aria-pressed=\"true\" or aria-pressed=\"false\" to indicate their state to screen reader users.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "Clicked Alto Contraste button, visual appearance changed to highlighted state"
      ]
    },
    "evidence": [
      "Button has textContent 'Alto Contraste', className 'br-button recurso-contraste'",
      "Visual state changes when clicked but no aria-pressed attribute present"
    ]
  },
  "scope": [
    "CPF input field and form validation",
    "Alto Contraste toggle button"
  ],
  "notes": "Evaluation conducted following canonical evaluation protocol. Tested form validation, keyboard navigation, focus management, accessibility tree, and ARIA attributes. Keyboard navigation working properly. Main landmark present with single H1. Language attribute correctly set to pt-BR."
}
````

### Decisão

````json
{
  "cardId": "C-812ac018b42407c941333384a11ad11d566261c4ae9f7aa1f8ee06777724dc44",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-817e077b7291b3a9bf3c5152c52cedf7a6245c5cc0a169201ce8722e85455b81

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"

### Unidades candidatas (não são crédito)

- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-ad7de00f96c7c421d72917b032b505a62f2aa89f3cd335725acf24230e2b3351 — V-01 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e46030c2db24cf84b0c41b535a62f53bb350e341f3c4f412c5d2be26bad001c0 — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-817e077b7291b3a9bf3c5152c52cedf7a6245c5cc0a169201ce8722e85455b81",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-98966a24a3872704f704fa414ef4cee6dc0f207e8fdc50f33ba09eb7f119990c

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: br-input aplicado a <input>

Esperado: Elemento <div>

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:structure-input-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-2b97350dd48bdc2e2123c5b7e989f27a09014984d7868d467a4895a12e4dea2d — V-03a · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-invalid, aria-describedby. Medido: ausentes: aria-invalid, aria-describedby | ausentes: aria-invalid, aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-7ecabf109195fc5e6715f764e5ebfe10dd9272a8c70a4f18f29177e5575677f0 — V-02 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-bd00752ba8ab900e2aef1f068b33649568c487d6d6f679e3574f4f014485bbde — V-11 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e0f1ff4add37d6520b5be9c512f51335f4dee5a2b3061d548444fb10e1b6f2df — V-08 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: classe-no-elemento sustenta em inicial, apos-submit-vazio — o próprio <input> carrega a classe .br-input. Medido: <input class="br-input"> | <input class="br-input">
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "rule": "ds:structure-input-tag",
    "observed": "br-input aplicado a <input>",
    "expected": "Elemento <div>",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-98966a24a3872704f704fa414ef4cee6dc0f207e8fdc50f33ba09eb7f119990c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a7b79075347de3afe435f3a77d8457ebf5af7d10e8394afdbad9d396df16cafc

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×720 · interações desde o carregamento: nenhuma

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 1280x720 na cena 1280x900

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"

### Unidades candidatas (não são crédito)

- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-ad7de00f96c7c421d72917b032b505a62f2aa89f3cd335725acf24230e2b3351 — V-01 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e46030c2db24cf84b0c41b535a62f53bb350e341f3c4f412c5d2be26bad001c0 — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-002` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1)",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "steps": []
    },
    "evidence": [
      "F-002"
    ]
  },
  "scope": [
    "http://127.0.0.1:3100/fluxo.html"
  ],
  "notes": "Varredura completa da página com tokens, estrutura e axe. Página carregada sem erros funcionais. Nenhuma interação realizada."
}
````

### Decisão

````json
{
  "cardId": "C-a7b79075347de3afe435f3a77d8457ebf5af7d10e8394afdbad9d396df16cafc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a86ea738c82c967c0c92d562532690e9edf85048cf59f098793f856b50607198

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×720 · interações desde o carregamento: nenhuma

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 1280x720 na cena 1280x900

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6a72109ec02bee7fc2f8ce1a1858c714569ac0c943be26bfdf46a273ad4c98d0 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital em nuvem": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-760e021578295ce102827e97e15b97ca5667b8f1f27708cbcfd0ec7f283b7b52 — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital em nuvem": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-005` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(4)",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "steps": []
    },
    "evidence": [
      "F-005"
    ]
  },
  "scope": [
    "http://127.0.0.1:3100/fluxo.html"
  ],
  "notes": "Varredura completa da página com tokens, estrutura e axe. Página carregada sem erros funcionais. Nenhuma interação realizada."
}
````

### Decisão

````json
{
  "cardId": "C-a86ea738c82c967c0c92d562532690e9edf85048cf59f098793f856b50607198",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-af8185afc6cc7140b2ef95559457b407c8c91ee26e60b3c178e88c76f87b25a2

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Error message 'Informe um CPF para continuar.' is displayed but the input field is not programmatically marked as invalid. The input lacks aria-invalid, aria-describedby, and the error message lacks aria-live.

Esperado: When validation fails, the input should have aria-invalid="true" and aria-describedby pointing to the error message id. Error message should have aria-live="polite" to notify screen reader users.

Janela: 1251×1278 · interações desde o carregamento: 1. clicked Continue button without entering CPF

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `Error message element has className 'mensagem-erro-cpf' but lacks id and aria-live` → identificador devolvido por ferramenta (sem arquivo)
- `Input element has id 'cpf' but lacks aria-invalid and aria-describedby attributes` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "input#cpf",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "Error message 'Informe um CPF para continuar.' is displayed but the input field is not programmatically marked as invalid. The input lacks aria-invalid, aria-describedby, and the error message lacks aria-live.",
    "expected": "When validation fails, the input should have aria-invalid=\"true\" and aria-describedby pointing to the error message id. Error message should have aria-live=\"polite\" to notify screen reader users.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "clicked Continue button without entering CPF"
      ]
    },
    "evidence": [
      "Error message element has className 'mensagem-erro-cpf' but lacks id and aria-live",
      "Input element has id 'cpf' but lacks aria-invalid and aria-describedby attributes"
    ]
  },
  "scope": [
    "CPF input field and form validation",
    "Alto Contraste toggle button"
  ],
  "notes": "Evaluation conducted following canonical evaluation protocol. Tested form validation, keyboard navigation, focus management, accessibility tree, and ARIA attributes. Keyboard navigation working properly. Main landmark present with single H1. Language attribute correctly set to pt-BR."
}
````

### Decisão

````json
{
  "cardId": "C-af8185afc6cc7140b2ef95559457b407c8c91ee26e60b3c178e88c76f87b25a2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b3a47c29b762fbe41dc819837f8e1a0548427f05c9379266aa03c61015569b86

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 320x720

Observado: border-color: rgb(222, 226, 230) (#dee2e6) não corresponde a nenhum token do DS

Esperado: Valor de token do DS; mais próximo: --gray-cool-10 (#dfe1e2, distância RGB 4.24)

Janela: 320×720 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-color

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2)",
    "rule": "ds:token-color",
    "observed": "border-color: rgb(222, 226, 230) (#dee2e6) não corresponde a nenhum token do DS",
    "expected": "Valor de token do DS; mais próximo: --gray-cool-10 (#dfe1e2, distância RGB 4.24)",
    "scene": "320x720",
    "viewport": {
      "width": 320,
      "height": 720
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-b3a47c29b762fbe41dc819837f8e1a0548427f05c9379266aa03c61015569b86",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c01127f2d728f47ed5c07f2292e080c92056ca3c0fdc817d508570eafd16811d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: br-input aplicado a <input>

Esperado: Elemento <div>

Janela: 1280×720 · interações desde o carregamento: nenhuma

Regra declarada: ds-structure-input-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 1280x720 na cena 1280x900

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-2b97350dd48bdc2e2123c5b7e989f27a09014984d7868d467a4895a12e4dea2d — V-03a · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-invalid, aria-describedby. Medido: ausentes: aria-invalid, aria-describedby | ausentes: aria-invalid, aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-7ecabf109195fc5e6715f764e5ebfe10dd9272a8c70a4f18f29177e5575677f0 — V-02 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-bd00752ba8ab900e2aef1f068b33649568c487d6d6f679e3574f4f014485bbde — V-11 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e0f1ff4add37d6520b5be9c512f51335f4dee5a2b3061d548444fb10e1b6f2df — V-08 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: classe-no-elemento sustenta em inicial, apos-submit-vazio — o próprio <input> carrega a classe .br-input. Medido: <input class="br-input"> | <input class="br-input">
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-006` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [],
    "rule": "ds-structure-input-tag",
    "observed": "br-input aplicado a <input>",
    "expected": "Elemento <div>",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "steps": []
    },
    "evidence": [
      "F-006"
    ]
  },
  "scope": [
    "http://127.0.0.1:3100/fluxo.html"
  ],
  "notes": "Varredura completa da página com tokens, estrutura e axe. Página carregada sem erros funcionais. Nenhuma interação realizada."
}
````

### Decisão

````json
{
  "cardId": "C-c01127f2d728f47ed5c07f2292e080c92056ca3c0fdc817d508570eafd16811d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c2da596312e0a8780e295b5c63af3a07c230007dc52dabbc04acbe3e0b7cee9e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"

### Unidades candidatas (não são crédito)

- U-18e34f11569ef33ae87295505711425b5f2b7db9de61c35c6f792699b68fdb2c — V-01 · sempre · cena 1280x900 · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-5f1050f826ead59f54ec7744c5c79bff70b6a54028694b03e2e87161eb5a34bf — V-06 · sempre · cena 1280x900 · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-c2da596312e0a8780e295b5c63af3a07c230007dc52dabbc04acbe3e0b7cee9e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-cdda960838d2ce07636f48d2bfa97e4d5f6487a6360bef53a501103871e60a08

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6a72109ec02bee7fc2f8ce1a1858c714569ac0c943be26bfdf46a273ad4c98d0 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital em nuvem": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-760e021578295ce102827e97e15b97ca5667b8f1f27708cbcfd0ec7f283b7b52 — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital em nuvem": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(4)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-cdda960838d2ce07636f48d2bfa97e4d5f6487a6360bef53a501103871e60a08",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-eb23eb3ea337d6158cf7c1a8543f81bbc097673669facc53c5d19728cab58792

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 320x720

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 320×720 · interações desde o carregamento: 1. setup do plano de estados (2 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1)",
    "rule": "ds:token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "scene": "320x720",
    "viewport": {
      "width": 320,
      "height": 720
    },
    "steps": [
      "setup do plano de estados (2 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-eb23eb3ea337d6158cf7c1a8543f81bbc097673669facc53c5d19728cab58792",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f3aa128a3016eb5114e76a7e1cd10f3e98232bb8bf08af3a00ee327b50dcd7d3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: The CPF input field has aria-required="true" but the HTML required attribute is false. This creates an inconsistency in how assistive technologies interpret the field's requirements.

Esperado: Either the aria-required attribute should match the HTML required attribute, or if the field is required via JavaScript validation, both should be consistently set.

Janela: 1251×1278 · interações desde o carregamento: 1. Inspected CPF input attributes

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `Input element has aria-required='true' but required attribute is false` → identificador devolvido por ferramenta (sem arquivo)
- `Form validation shows the field is required when attempting to submit empty` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "input#cpf",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "The CPF input field has aria-required=\"true\" but the HTML required attribute is false. This creates an inconsistency in how assistive technologies interpret the field's requirements.",
    "expected": "Either the aria-required attribute should match the HTML required attribute, or if the field is required via JavaScript validation, both should be consistently set.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "Inspected CPF input attributes"
      ]
    },
    "evidence": [
      "Input element has aria-required='true' but required attribute is false",
      "Form validation shows the field is required when attempting to submit empty"
    ]
  },
  "scope": [
    "CPF input field and form validation",
    "Alto Contraste toggle button"
  ],
  "notes": "Evaluation conducted following canonical evaluation protocol. Tested form validation, keyboard navigation, focus management, accessibility tree, and ARIA attributes. Keyboard navigation working properly. Main landmark present with single H1. Language attribute correctly set to pt-BR."
}
````

### Decisão

````json
{
  "cardId": "C-f3aa128a3016eb5114e76a7e1cd10f3e98232bb8bf08af3a00ee327b50dcd7d3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f7d69be2a4c1aaaecab357ae9166c08019aab2900915b6c288450a58ca9a253a

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: padding: 13px (fora da escala: 13px)

Esperado: Múltiplos de 4px

Janela: 1280×720 · interações desde o carregamento: nenhuma

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 1280x720 na cena 1280x900

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"

### Unidades candidatas (não são crédito)

- U-18e34f11569ef33ae87295505711425b5f2b7db9de61c35c6f792699b68fdb2c — V-01 · sempre · cena 1280x900 · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-5f1050f826ead59f54ec7744c5c79bff70b6a54028694b03e2e87161eb5a34bf — V-06 · sempre · cena 1280x900 · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-003` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > main > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2)",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px (fora da escala: 13px)",
    "expected": "Múltiplos de 4px",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "steps": []
    },
    "evidence": [
      "F-003"
    ]
  },
  "scope": [
    "http://127.0.0.1:3100/fluxo.html"
  ],
  "notes": "Varredura completa da página com tokens, estrutura e axe. Página carregada sem erros funcionais. Nenhuma interação realizada."
}
````

### Decisão

````json
{
  "cardId": "C-f7d69be2a4c1aaaecab357ae9166c08019aab2900915b6c288450a58ca9a253a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````
