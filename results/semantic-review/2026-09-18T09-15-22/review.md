# Revisão semântica — pacote fechado

Versão: flow-semantic-1.4.0 · 44 cartões únicos · 44 pendentes

## As três filas

| Fila | Quantidade | O que ela cobra |
|---|---|---|
| **Ativa — desta bateria** | 44 cartão(ões) | **Só esta fecha a bateria.** Enquanto houver um, as métricas são provisórias. |
| Histórica — de outras baterias | 0 | Dívida declarada do projeto. Não cobra nada desta bateria, e não some por isso. |
| Descobertas para a próxima referência | 0 afirmação(ões) | Defeito correto fora do gabarito congelado. Entra na PRÓXIMA versão; não mexe no denominador desta. |

Esforço: 71 sujeitos · 44 cartão(ões) sem evidência verificada · 9 com unidade candidata · estimativa **264 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Orçamento de revisão declarado: **5 sessoes de 50 min (~4h10), declarado na especificacao v02 de 17/09**. Esgotá-lo NÃO é permissão para derrubar alegação difícil ou demorada: o não resolvido continua visível e as métricas, provisórias.

Esta renderização NÃO é cega: 32 cartão(ões) contêm texto que nomeia o braço da execução. Para decidir sem saber o braço, gere com `--cego`.

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

## C-0dbfa687ad825b474e50aa4592115ca5e912951628877fdf17c78dced3f8bfc8

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Após enviar o formulário vazio surge <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p> sem id; #cpf não recebe aria-invalid nem aria-describedby/aria-errormessage apontando para a mensagem.

Esperado: O campo em erro deve ser identificado programaticamente e a descrição do erro associada a ele (aria-invalid=true e aria-describedby para a mensagem).

Janela: 1251×1278 · interações desde o carregamento: 1. clicar em Continuar com CPF vazio

Regra declarada: wcag:3.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `outerHTML do form após envio vazio` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:3.3.1",
    "observed": "Após enviar o formulário vazio surge <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p> sem id; #cpf não recebe aria-invalid nem aria-describedby/aria-errormessage apontando para a mensagem.",
    "expected": "O campo em erro deve ser identificado programaticamente e a descrição do erro associada a ele (aria-invalid=true e aria-describedby para a mensagem).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "clicar em Continuar com CPF vazio"
      ]
    },
    "evidence": [
      "outerHTML do form após envio vazio"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: envio do formulário vazio (mensagem de erro aparece), envio com '123' (mensagem some, nenhuma validação/feedback — registrado como incerto, não reportado), foco programático e Tab real em todos os controles, clique em Alto Contraste (sem efeito observável no DOM/estilos — incerto, possivelmente simulado), redimensionamento para 320x640. Contraste de textos verificado (todos >= 4.5:1). Ausência de links de salto (eMAG 1.5) e placeholder com mesma cor do valor digitado considerados incertos e não reportados. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-0dbfa687ad825b474e50aa4592115ca5e912951628877fdf17c78dced3f8bfc8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1c91687d69870786d1d5fbacb7cb1001352a3dc9a19a761a4884a094d16f68a4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: color: #e60000 (rgb(230,0,0))

Esperado: Cor de um token registrado do gov.br DS (ex.: token de feedback danger)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `verify_finding V-001 (confirmed)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "color: #e60000 (rgb(230,0,0))",
    "expected": "Cor de um token registrado do gov.br DS (ex.: token de feedback danger)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "verify_finding V-001 (confirmed)"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-1c91687d69870786d1d5fbacb7cb1001352a3dc9a19a761a4884a094d16f68a4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1e29b38f4c30824157a92d177150fefdd114e4ffc082fa81c91a80e7f8ba601c

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Ao receber foco por teclado (:focus-visible verdadeiro após Tab a partir de 'Continuar'), os links das outras opções ficam com outline-style none, box-shadow none e nenhuma mudança de cor, sublinhado, fundo ou no item pai.

Esperado: Todo componente focalizável por teclado deve ter indicador de foco visível, como os demais controles da página (outline tracejado 4px).

Janela: 1251×1278 · interações desde o carregamento: 1. focar botão Continuar 2. pressionar Tab

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `getComputedStyle(.link-opcao:focus) outlineStyle=none boxShadow=none; estilos idênticos antes/depois do foco` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "observed": "Ao receber foco por teclado (:focus-visible verdadeiro após Tab a partir de 'Continuar'), os links das outras opções ficam com outline-style none, box-shadow none e nenhuma mudança de cor, sublinhado, fundo ou no item pai.",
    "expected": "Todo componente focalizável por teclado deve ter indicador de foco visível, como os demais controles da página (outline tracejado 4px).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "focar botão Continuar",
        "pressionar Tab"
      ]
    },
    "evidence": [
      "getComputedStyle(.link-opcao:focus) outlineStyle=none boxShadow=none; estilos idênticos antes/depois do foco"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: envio do formulário vazio (mensagem de erro aparece), envio com '123' (mensagem some, nenhuma validação/feedback — registrado como incerto, não reportado), foco programático e Tab real em todos os controles, clique em Alto Contraste (sem efeito observável no DOM/estilos — incerto, possivelmente simulado), redimensionamento para 320x640. Contraste de textos verificado (todos >= 4.5:1). Ausência de links de salto (eMAG 1.5) e placeholder com mesma cor do valor digitado considerados incertos e não reportados. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-1e29b38f4c30824157a92d177150fefdd114e4ffc082fa81c91a80e7f8ba601c",
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

## C-2c5f63c84ad148c920667dcba01fb069a9f57b1cdc772a97ed3c8b3418274745

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Após envio vazio aparece <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p> fora do .br-input, sem id; o input não tem aria-describedby nem aria-invalid

Esperado: Mensagem de erro associada programaticamente ao campo (aria-describedby) e campo marcado como inválido (aria-invalid), como o feedback do componente br-input

Janela: 1251×1278 · interações desde o carregamento: 1. carregar página 2. clicar em Continuar com CPF vazio

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-002` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: outerHTML do form após envio` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:1.3.1",
    "observed": "Após envio vazio aparece <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p> fora do .br-input, sem id; o input não tem aria-describedby nem aria-invalid",
    "expected": "Mensagem de erro associada programaticamente ao campo (aria-describedby) e campo marcado como inválido (aria-invalid), como o feedback do componente br-input",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar página",
        "clicar em Continuar com CPF vazio"
      ]
    },
    "evidence": [
      "S-page-002",
      "browser_evaluate: outerHTML do form após envio"
    ]
  },
  "scope": [
    "tela inteira: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, lista de outras opções, links de ajuda e termo)"
  ],
  "notes": "Estados: inicial (scan S-page-001) e após envio vazio do formulário (scan S-page-002, compareToScanId). Interações: snapshot da árvore de acessibilidade; clique em Continuar com CPF vazio (aparece p.mensagem-erro-cpf, foco permanece no botão); CPF '123' + Enter (nenhuma mensagem, nenhuma navegação — comportamento de validação incompleto, registrado como incerto e não reportado); clique em Alto Contraste (nenhuma mudança observável — incerto, não reportado); foco por teclado em todos os links/botões/campo comparando estilos antes/depois. Observações do oráculo não convertidas em achado: font-size 11px no br-tag (sem norma), classes utilitárias extras, br-divider em <hr>. Contraste de texto (tag branca/verde ~4.6:1, erro #e60000 ~4.8:1) passou; axe sem violações nos dois estados. Erro de console presente no carregamento, não investigado. Achados de token vêm do checker determinístico do oráculo."
}
````

### Decisão

````json
{
  "cardId": "C-2c5f63c84ad148c920667dcba01fb069a9f57b1cdc772a97ed3c8b3418274745",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-31570275892bf9972957cc487a400e4ff8e943d409531851abeb97f71c9b2730

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Ao receber foco por teclado (:focus-visible), outline:none e box-shadow:none (regra .link-opcao:focus, .link-opcao:focus-visible); nenhum estilo do link ou do item pai muda

Esperado: Indicador de foco visível em todo componente operável por teclado, como os demais links da página (outline tracejado 4px)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar página 2. Tab/foco em cada link .link-opcao

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: estilos computados antes/depois do foco` → não encontrado na evidência preservada da execução
- `CSSOM: .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [
      ".opcao-identificacao"
    ],
    "rule": "wcag:2.4.7",
    "observed": "Ao receber foco por teclado (:focus-visible), outline:none e box-shadow:none (regra .link-opcao:focus, .link-opcao:focus-visible); nenhum estilo do link ou do item pai muda",
    "expected": "Indicador de foco visível em todo componente operável por teclado, como os demais links da página (outline tracejado 4px)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar página",
        "Tab/foco em cada link .link-opcao"
      ]
    },
    "evidence": [
      "browser_evaluate: estilos computados antes/depois do foco",
      "CSSOM: .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }"
    ]
  },
  "scope": [
    "tela inteira: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, lista de outras opções, links de ajuda e termo)"
  ],
  "notes": "Estados: inicial (scan S-page-001) e após envio vazio do formulário (scan S-page-002, compareToScanId). Interações: snapshot da árvore de acessibilidade; clique em Continuar com CPF vazio (aparece p.mensagem-erro-cpf, foco permanece no botão); CPF '123' + Enter (nenhuma mensagem, nenhuma navegação — comportamento de validação incompleto, registrado como incerto e não reportado); clique em Alto Contraste (nenhuma mudança observável — incerto, não reportado); foco por teclado em todos os links/botões/campo comparando estilos antes/depois. Observações do oráculo não convertidas em achado: font-size 11px no br-tag (sem norma), classes utilitárias extras, br-divider em <hr>. Contraste de texto (tag branca/verde ~4.6:1, erro #e60000 ~4.8:1) passou; axe sem violações nos dois estados. Erro de console presente no carregamento, não investigado. Achados de token vêm do checker determinístico do oráculo."
}
````

### Decisão

````json
{
  "cardId": "C-31570275892bf9972957cc487a400e4ff8e943d409531851abeb97f71c9b2730",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3522e44ca2a312e39ae5572d9a4e24b524f041a924840e27e0bc9ff8601cb814

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: A classe br-input está aplicada ao próprio <input id="cpf">, além do wrapper <div class="br-input">.

Esperado: br-input aplicado somente ao <div> contêiner; o <input> interno sem a classe do componente.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página

Regra declarada: ds-structure-input-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan_page S-page-001 F-006` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "ds-structure-input-tag",
    "observed": "A classe br-input está aplicada ao próprio <input id=\"cpf\">, além do wrapper <div class=\"br-input\">.",
    "expected": "br-input aplicado somente ao <div> contêiner; o <input> interno sem a classe do componente.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página"
      ]
    },
    "evidence": [
      "scan_page S-page-001 F-006"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-3522e44ca2a312e39ae5572d9a4e24b524f041a924840e27e0bc9ff8601cb814",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3830c8469b5599547a08b83b91153178caf10e305137aa03cd5ff30125d9ccf1

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Após enviar vazio surge <p class='mensagem-erro-cpf'>Informe um CPF para continuar.</p>, mas o input #cpf não tem aria-describedby nem aria-invalid; a relação campo–erro é apenas visual.

Esperado: O campo inválido deve ser marcado (aria-invalid='true') e associado programaticamente à mensagem de erro (aria-describedby).

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em Continuar com CPF vazio

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: form.outerHTML após envio vazio` → identificador devolvido por ferramenta (sem arquivo)
- `aria-invalid=null, aria-describedby=null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:1.3.1",
    "observed": "Após enviar vazio surge <p class='mensagem-erro-cpf'>Informe um CPF para continuar.</p>, mas o input #cpf não tem aria-describedby nem aria-invalid; a relação campo–erro é apenas visual.",
    "expected": "O campo inválido deve ser marcado (aria-invalid='true') e associado programaticamente à mensagem de erro (aria-describedby).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em Continuar com CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: form.outerHTML após envio vazio",
      "aria-invalid=null, aria-describedby=null"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda, termo de uso"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual com Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab e foco programático em todos os controles (comparação de estilos com/sem foco); envio do formulário vazio (clique em Continuar), com '123' (Enter) e com '52998224725' (Enter); clique em Alto Contraste; redimensionamento para 320x640. Contraste de texto verificado (todos >= 4,5:1, incl. selo verde 4,59:1 e erro vermelho 4,81:1); rótulos, landmarks, headings e lang=pt-BR adequados. Incertos, não reportados: botão Alto Contraste não produz mudança observável (pode ser stub do protótipo); CPF '123' é aceito sem mensagem de erro e, nessa tentativa, o foco ficou no body (não reproduzido com CPF válido); ausência de link de salto para o conteúdo (eMAG 1.5) em página curta. Console: apenas 404 do favicon."
}
````

### Decisão

````json
{
  "cardId": "C-3830c8469b5599547a08b83b91153178caf10e305137aa03cd5ff30125d9ccf1",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-48e3a492760806f175160cadd582cb011e1e2395da4af2fccfb307326e476d0f

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Com foco de teclado (:focus-visible verdadeiro após Tab), os links têm outline-style none, sem box-shadow, sublinhado, mudança de cor ou de fundo no item

Esperado: Indicador de foco visível ao navegar por teclado, como nos demais controles (outline tracejado)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. focar #cpf 3. Tab 4. Tab (foco em 'Login com seu banco')

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: computed style do activeElement a.link-opcao em :focus-visible` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "observed": "Com foco de teclado (:focus-visible verdadeiro após Tab), os links têm outline-style none, sem box-shadow, sublinhado, mudança de cor ou de fundo no item",
    "expected": "Indicador de foco visível ao navegar por teclado, como nos demais controles (outline tracejado)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "focar #cpf",
        "Tab",
        "Tab (foco em 'Login com seu banco')"
      ]
    },
    "evidence": [
      "browser_evaluate: computed style do activeElement a.link-opcao em :focus-visible"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-48e3a492760806f175160cadd582cb011e1e2395da4af2fccfb307326e476d0f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-48f4b6a96eddf7bf27f5fe70be549cc175cfccaa1fd0980e3bc646b7e2b95298

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: A mensagem de erro é inserida sem role=alert/aria-live e o foco permanece no botão Continuar; nenhuma região viva existe na página

Esperado: Mensagem de status/erro anunciada a tecnologias assistivas sem receber foco (role=alert ou aria-live)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar página 2. clicar em Continuar com CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-002` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: activeElement=button; nenhum [aria-live],[role=alert],[role=status]` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "button[type=submit]"
    ],
    "rule": "wcag:4.1.3",
    "observed": "A mensagem de erro é inserida sem role=alert/aria-live e o foco permanece no botão Continuar; nenhuma região viva existe na página",
    "expected": "Mensagem de status/erro anunciada a tecnologias assistivas sem receber foco (role=alert ou aria-live)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar página",
        "clicar em Continuar com CPF vazio"
      ]
    },
    "evidence": [
      "S-page-002",
      "browser_evaluate: activeElement=button; nenhum [aria-live],[role=alert],[role=status]"
    ]
  },
  "scope": [
    "tela inteira: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, lista de outras opções, links de ajuda e termo)"
  ],
  "notes": "Estados: inicial (scan S-page-001) e após envio vazio do formulário (scan S-page-002, compareToScanId). Interações: snapshot da árvore de acessibilidade; clique em Continuar com CPF vazio (aparece p.mensagem-erro-cpf, foco permanece no botão); CPF '123' + Enter (nenhuma mensagem, nenhuma navegação — comportamento de validação incompleto, registrado como incerto e não reportado); clique em Alto Contraste (nenhuma mudança observável — incerto, não reportado); foco por teclado em todos os links/botões/campo comparando estilos antes/depois. Observações do oráculo não convertidas em achado: font-size 11px no br-tag (sem norma), classes utilitárias extras, br-divider em <hr>. Contraste de texto (tag branca/verde ~4.6:1, erro #e60000 ~4.8:1) passou; axe sem violações nos dois estados. Erro de console presente no carregamento, não investigado. Achados de token vêm do checker determinístico do oráculo."
}
````

### Decisão

````json
{
  "cardId": "C-48f4b6a96eddf7bf27f5fe70be549cc175cfccaa1fd0980e3bc646b7e2b95298",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4bc29d8fc0b7be6d7e50911827af9cc12de5a8e18461fd31382d80dddad8b741

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Ao receber foco por teclado, os 4 links 'Login com seu banco', 'Login com QR code', 'Seu certificado digital' e 'Seu certificado digital em nuvem' ficam com outline-style none, box-shadow none e sem mudança de cor, fundo, sublinhado ou no item pai; os demais controles exibem outline tracejado 4px rgb(194,133,12).

Esperado: Todo componente operável por teclado deve ter indicador de foco visível.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. Tab até os links de outras opções de identificação

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: getComputedStyle(.link-opcao) antes/depois de focus() idênticos` → não encontrado na evidência preservada da execução
- `browser_evaluate: :focus-visible=true com outline none` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "observed": "Ao receber foco por teclado, os 4 links 'Login com seu banco', 'Login com QR code', 'Seu certificado digital' e 'Seu certificado digital em nuvem' ficam com outline-style none, box-shadow none e sem mudança de cor, fundo, sublinhado ou no item pai; os demais controles exibem outline tracejado 4px rgb(194,133,12).",
    "expected": "Todo componente operável por teclado deve ter indicador de foco visível.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "Tab até os links de outras opções de identificação"
      ]
    },
    "evidence": [
      "browser_evaluate: getComputedStyle(.link-opcao) antes/depois de focus() idênticos",
      "browser_evaluate: :focus-visible=true com outline none"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda, termo de uso"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual com Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab e foco programático em todos os controles (comparação de estilos com/sem foco); envio do formulário vazio (clique em Continuar), com '123' (Enter) e com '52998224725' (Enter); clique em Alto Contraste; redimensionamento para 320x640. Contraste de texto verificado (todos >= 4,5:1, incl. selo verde 4,59:1 e erro vermelho 4,81:1); rótulos, landmarks, headings e lang=pt-BR adequados. Incertos, não reportados: botão Alto Contraste não produz mudança observável (pode ser stub do protótipo); CPF '123' é aceito sem mensagem de erro e, nessa tentativa, o foco ficou no body (não reproduzido com CPF válido); ausência de link de salto para o conteúdo (eMAG 1.5) em página curta. Console: apenas 404 do favicon."
}
````

### Decisão

````json
{
  "cardId": "C-4bc29d8fc0b7be6d7e50911827af9cc12de5a8e18461fd31382d80dddad8b741",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-588ce86623927a8b491718049043b236cfc458f460c072036cf01d8c7e9135f5

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: border-color: #dee2e6 (rgb(222,226,230))

Esperado: Token de cor do DS; mais próximo --gray-cool-10 (#dfe1e2)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan S-page-001 F-001` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "border-color: #dee2e6 (rgb(222,226,230))",
    "expected": "Token de cor do DS; mais próximo --gray-cool-10 (#dfe1e2)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "scan S-page-001 F-001"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-588ce86623927a8b491718049043b236cfc458f460c072036cf01d8c7e9135f5",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-68e429e3f3e42594a65a338d94316d121b6209ca1bb62583ce7cd8f3d8e149eb

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Em viewport de 320px, .barra-recursos (flex, nowrap) tem 353px de largura e termina em x=447; o botão VLibras fica em x 305–447, gerando rolagem horizontal (scrollWidth 447 > 320).

Esperado: Conteúdo se reorganiza em 320px de largura sem rolagem horizontal nem corte dos botões da barra.

Janela: 320×640 · interações desde o carregamento: 1. carregar a página 2. redimensionar a janela para 320x640

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x640 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: scrollWidth 447, getBoundingClientRect .barra-recursos right 446.7, .recurso-libras right 446.7` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".recurso-libras",
      ".barra-superior"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Em viewport de 320px, .barra-recursos (flex, nowrap) tem 353px de largura e termina em x=447; o botão VLibras fica em x 305–447, gerando rolagem horizontal (scrollWidth 447 > 320).",
    "expected": "Conteúdo se reorganiza em 320px de largura sem rolagem horizontal nem corte dos botões da barra.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 640
      },
      "steps": [
        "carregar a página",
        "redimensionar a janela para 320x640"
      ]
    },
    "evidence": [
      "browser_evaluate: scrollWidth 447, getBoundingClientRect .barra-recursos right 446.7, .recurso-libras right 446.7"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Sem oráculo nem scan_page; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab por todos os 11 focáveis registrando outline/box-shadow; envio com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece sem aria-live/role=alert, sem aria-invalid/aria-describedby, foco permanece no botão); envio com '123' e com '52998224725' (mensagem de erro some, sem outra resposta visível — comportamento pós-envio não avaliável, incerto); clique em Alto Contraste (nenhuma mudança observável de classe/estilo; registrado como incerto, não reportado); viewport 320x640 para reflow. Contraste de todos os textos ≥4,5:1 (menor: selo 'SUA CONTA SERÁ PRATA' 4,59:1; erro rgb(230,0,0) ≈4,8:1). Alvos .link-opcao têm 20px de altura mas espaçamento ≥24px entre itens (exceção de 2.5.8). Console: apenas 404 de favicon.ico. VLibras não testado além do DOM."
}
````

### Decisão

````json
{
  "cardId": "C-68e429e3f3e42594a65a338d94316d121b6209ca1bb62583ce7cd8f3d8e149eb",
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

## C-7212eb60bc3a6b6979e722de077d3ae39aed2ef8b2f556a3fdbdd75f549ffc79

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: A mensagem de erro é inserida dinamicamente sem role=alert/status nem aria-live, e o foco permanece no botão Continuar; leitores de tela não anunciam o erro.

Esperado: Mensagem de status/erro inserida dinamicamente deve ser anunciada por tecnologia assistiva (região viva ou role=alert) sem exigir mudança de foco.

Janela: 1251×1278 · interações desde o carregamento: 1. clicar em Continuar com CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `outerHTML do form após envio vazio; document.activeElement = button.acao-continuar` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "wcag:4.1.3",
    "observed": "A mensagem de erro é inserida dinamicamente sem role=alert/status nem aria-live, e o foco permanece no botão Continuar; leitores de tela não anunciam o erro.",
    "expected": "Mensagem de status/erro inserida dinamicamente deve ser anunciada por tecnologia assistiva (região viva ou role=alert) sem exigir mudança de foco.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "clicar em Continuar com CPF vazio"
      ]
    },
    "evidence": [
      "outerHTML do form após envio vazio; document.activeElement = button.acao-continuar"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: envio do formulário vazio (mensagem de erro aparece), envio com '123' (mensagem some, nenhuma validação/feedback — registrado como incerto, não reportado), foco programático e Tab real em todos os controles, clique em Alto Contraste (sem efeito observável no DOM/estilos — incerto, possivelmente simulado), redimensionamento para 320x640. Contraste de textos verificado (todos >= 4.5:1). Ausência de links de salto (eMAG 1.5) e placeholder com mesma cor do valor digitado considerados incertos e não reportados. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-7212eb60bc3a6b6979e722de077d3ae39aed2ef8b2f556a3fdbdd75f549ffc79",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-79f97e0c6434be2706501b9becb59ffa6a3fbf31650f9cb55c06bc4dc7cf41ac

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: A mensagem de erro é inserida no DOM sem role=alert/aria-live e o foco permanece no botão Continuar; não há região viva na página, logo a mensagem não é anunciada.

Esperado: Mensagem de erro inserida dinamicamente deve ser anunciada por tecnologia assistiva sem mover o foco (role='alert' ou aria-live) ou o foco deve ser levado ao campo com erro.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em Continuar com CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: querySelectorAll('[role=alert],[aria-live]') vazio` → identificador devolvido por ferramenta (sem arquivo)
- `activeElement = button.acao-continuar` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      ".acao-continuar"
    ],
    "rule": "wcag:4.1.3",
    "observed": "A mensagem de erro é inserida no DOM sem role=alert/aria-live e o foco permanece no botão Continuar; não há região viva na página, logo a mensagem não é anunciada.",
    "expected": "Mensagem de erro inserida dinamicamente deve ser anunciada por tecnologia assistiva sem mover o foco (role='alert' ou aria-live) ou o foco deve ser levado ao campo com erro.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em Continuar com CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: querySelectorAll('[role=alert],[aria-live]') vazio",
      "activeElement = button.acao-continuar"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda, termo de uso"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual com Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab e foco programático em todos os controles (comparação de estilos com/sem foco); envio do formulário vazio (clique em Continuar), com '123' (Enter) e com '52998224725' (Enter); clique em Alto Contraste; redimensionamento para 320x640. Contraste de texto verificado (todos >= 4,5:1, incl. selo verde 4,59:1 e erro vermelho 4,81:1); rótulos, landmarks, headings e lang=pt-BR adequados. Incertos, não reportados: botão Alto Contraste não produz mudança observável (pode ser stub do protótipo); CPF '123' é aceito sem mensagem de erro e, nessa tentativa, o foco ficou no body (não reproduzido com CPF válido); ausência de link de salto para o conteúdo (eMAG 1.5) em página curta. Console: apenas 404 do favicon."
}
````

### Decisão

````json
{
  "cardId": "C-79f97e0c6434be2706501b9becb59ffa6a3fbf31650f9cb55c06bc4dc7cf41ac",
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

## C-839a51b3dc7811ff733dc9051d5a421641019a24c25004c69b89692c20e93af4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: padding: 13px nos 4 itens

Esperado: Espaçamento da escala do DS (múltiplos de 4px)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan S-page-001 F-002` → identificador devolvido por ferramenta (sem arquivo)
- `F-003` → identificador devolvido por ferramenta (sem arquivo)
- `F-004` → identificador devolvido por ferramenta (sem arquivo)
- `F-005` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px nos 4 itens",
    "expected": "Espaçamento da escala do DS (múltiplos de 4px)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "scan S-page-001 F-002",
      "F-003",
      "F-004",
      "F-005"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-839a51b3dc7811ff733dc9051d5a421641019a24c25004c69b89692c20e93af4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-83e8453024627301691e2571d27117797a7c3625de5034388b38bd3fe7ececf5

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Após enviar vazio surge <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p> sem id; #cpf não tem aria-describedby/aria-errormessage apontando para ela.

Esperado: A mensagem de erro deve ser associada programaticamente ao campo CPF (ex.: aria-describedby).

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: govbr-3.7.0-accessibility-global-cc837bbaf713

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: outerHTML do form no estado de erro` → identificador devolvido por ferramenta (sem arquivo)
- `scan_page S-page-002 fingerprint sha256:bbbb343c…` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "govbr-3.7.0-accessibility-global-cc837bbaf713",
    "observed": "Após enviar vazio surge <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p> sem id; #cpf não tem aria-describedby/aria-errormessage apontando para ela.",
    "expected": "A mensagem de erro deve ser associada programaticamente ao campo CPF (ex.: aria-describedby).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: outerHTML do form no estado de erro",
      "scan_page S-page-002 fingerprint sha256:bbbb343c…"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-83e8453024627301691e2571d27117797a7c3625de5034388b38bd3fe7ececf5",
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

## C-991ae44eced45bc3438bb4f41400dfe7fc319539bb5096994bee59a05efdd1a1

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Mensagem 'Informe um CPF para continuar.' é inserida como <p> sem role=alert/status nem aria-live, e o foco permanece no botão Continuar; não há região viva na página.

Esperado: Mensagem de erro anunciada a tecnologias assistivas sem exigir foco (role='alert' ou região aria-live) ou foco movido para o campo em erro.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: querySelectorAll('[role=alert],[aria-live]') vazio; activeElement = button.acao-continuar` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:4.1.3",
    "observed": "Mensagem 'Informe um CPF para continuar.' é inserida como <p> sem role=alert/status nem aria-live, e o foco permanece no botão Continuar; não há região viva na página.",
    "expected": "Mensagem de erro anunciada a tecnologias assistivas sem exigir foco (role='alert' ou região aria-live) ou foco movido para o campo em erro.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: querySelectorAll('[role=alert],[aria-live]') vazio; activeElement = button.acao-continuar"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Sem oráculo nem scan_page; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab por todos os 11 focáveis registrando outline/box-shadow; envio com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece sem aria-live/role=alert, sem aria-invalid/aria-describedby, foco permanece no botão); envio com '123' e com '52998224725' (mensagem de erro some, sem outra resposta visível — comportamento pós-envio não avaliável, incerto); clique em Alto Contraste (nenhuma mudança observável de classe/estilo; registrado como incerto, não reportado); viewport 320x640 para reflow. Contraste de todos os textos ≥4,5:1 (menor: selo 'SUA CONTA SERÁ PRATA' 4,59:1; erro rgb(230,0,0) ≈4,8:1). Alvos .link-opcao têm 20px de altura mas espaçamento ≥24px entre itens (exceção de 2.5.8). Console: apenas 404 de favicon.ico. VLibras não testado além do DOM."
}
````

### Decisão

````json
{
  "cardId": "C-991ae44eced45bc3438bb4f41400dfe7fc319539bb5096994bee59a05efdd1a1",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a2e34e62cec01d1120655193f79124121f7ba27f23e44f95af22f8a790bcc2d5

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Após envio vazio, o input #cpf não recebe aria-invalid nem aria-describedby apontando para p.mensagem-erro-cpf (que não tem id); a borda do campo não muda (rgb(136,136,136)).

Esperado: Campo em erro identificado programaticamente (aria-invalid='true') e associado à mensagem de erro via aria-describedby.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: wcag:3.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate form.outerHTML após envio vazio` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:3.3.1",
    "observed": "Após envio vazio, o input #cpf não recebe aria-invalid nem aria-describedby apontando para p.mensagem-erro-cpf (que não tem id); a borda do campo não muda (rgb(136,136,136)).",
    "expected": "Campo em erro identificado programaticamente (aria-invalid='true') e associado à mensagem de erro via aria-describedby.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate form.outerHTML após envio vazio"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Sem oráculo nem scan_page; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab por todos os 11 focáveis registrando outline/box-shadow; envio com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece sem aria-live/role=alert, sem aria-invalid/aria-describedby, foco permanece no botão); envio com '123' e com '52998224725' (mensagem de erro some, sem outra resposta visível — comportamento pós-envio não avaliável, incerto); clique em Alto Contraste (nenhuma mudança observável de classe/estilo; registrado como incerto, não reportado); viewport 320x640 para reflow. Contraste de todos os textos ≥4,5:1 (menor: selo 'SUA CONTA SERÁ PRATA' 4,59:1; erro rgb(230,0,0) ≈4,8:1). Alvos .link-opcao têm 20px de altura mas espaçamento ≥24px entre itens (exceção de 2.5.8). Console: apenas 404 de favicon.ico. VLibras não testado além do DOM."
}
````

### Decisão

````json
{
  "cardId": "C-a2e34e62cec01d1120655193f79124121f7ba27f23e44f95af22f8a790bcc2d5",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-aba6549e352d6a466341bff14dd56f06f7a49f5c11155fa2a939aa2ae746b9c0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Ao receber foco (:focus-visible verdadeiro) os 4 links de 'Outras opções' ficam com outline-style none e box-shadow none; regra '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }' e nenhum outro indicador (sublinhado, fundo, borda do item) muda.

Esperado: Todo elemento focado por teclado deve ter indicação visual clara do foco (e-MAG 4.4 / WCAG 2.4.7), como os demais links da página (outline tracejado 4px).

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. focar cada link .link-opcao via teclado/foco

Regra declarada: govbr-3.7.0-accessibility-global-21fbcc2fe37b

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: estilos computados em foco` → identificador devolvido por ferramenta (sem arquivo)
- `CSSOM: .link-opcao:focus, .link-opcao:focus-visible { outline: none; box-shadow: none }` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-accessibility-global-21fbcc2fe37b",
    "observed": "Ao receber foco (:focus-visible verdadeiro) os 4 links de 'Outras opções' ficam com outline-style none e box-shadow none; regra '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }' e nenhum outro indicador (sublinhado, fundo, borda do item) muda.",
    "expected": "Todo elemento focado por teclado deve ter indicação visual clara do foco (e-MAG 4.4 / WCAG 2.4.7), como os demais links da página (outline tracejado 4px).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "focar cada link .link-opcao via teclado/foco"
      ]
    },
    "evidence": [
      "browser_evaluate: estilos computados em foco",
      "CSSOM: .link-opcao:focus, .link-opcao:focus-visible { outline: none; box-shadow: none }"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-aba6549e352d6a466341bff14dd56f06f7a49f5c11155fa2a939aa2ae746b9c0",
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

## C-baef738f9cbee721b02fc773b75ceec594dd71400c333662eee36205cffce1e0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Mensagem de erro inserida como <p class='mensagem-erro-cpf'> sem role=alert/status nem aria-live; foco permanece no botão Continuar

Esperado: Mensagem de status/erro anunciada a tecnologias assistivas sem receber foco (role='alert' ou região aria-live)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: nenhum [role=alert],[aria-live] no documento após o envio` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:4.1.3",
    "observed": "Mensagem de erro inserida como <p class='mensagem-erro-cpf'> sem role=alert/status nem aria-live; foco permanece no botão Continuar",
    "expected": "Mensagem de status/erro anunciada a tecnologias assistivas sem receber foco (role='alert' ou região aria-live)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: nenhum [role=alert],[aria-live] no documento após o envio"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-baef738f9cbee721b02fc773b75ceec594dd71400c333662eee36205cffce1e0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-bb8033bb74340c61d8a2834f23f79837a54c77ac40b596898e7ed06d1f8e402c

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: padding: 13px nos quatro itens de opção

Esperado: Espaçamento da escala do DS (múltiplos de 4px, ex. --spacing-scale-2x 16px / 12px)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar página

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-001/F-002` → não encontrado na evidência preservada da execução
- `F-003` → identificador devolvido por ferramenta (sem arquivo)
- `F-004` → identificador devolvido por ferramenta (sem arquivo)
- `F-005` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px nos quatro itens de opção",
    "expected": "Espaçamento da escala do DS (múltiplos de 4px, ex. --spacing-scale-2x 16px / 12px)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar página"
      ]
    },
    "evidence": [
      "S-page-001/F-002",
      "F-003",
      "F-004",
      "F-005"
    ]
  },
  "scope": [
    "tela inteira: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, lista de outras opções, links de ajuda e termo)"
  ],
  "notes": "Estados: inicial (scan S-page-001) e após envio vazio do formulário (scan S-page-002, compareToScanId). Interações: snapshot da árvore de acessibilidade; clique em Continuar com CPF vazio (aparece p.mensagem-erro-cpf, foco permanece no botão); CPF '123' + Enter (nenhuma mensagem, nenhuma navegação — comportamento de validação incompleto, registrado como incerto e não reportado); clique em Alto Contraste (nenhuma mudança observável — incerto, não reportado); foco por teclado em todos os links/botões/campo comparando estilos antes/depois. Observações do oráculo não convertidas em achado: font-size 11px no br-tag (sem norma), classes utilitárias extras, br-divider em <hr>. Contraste de texto (tag branca/verde ~4.6:1, erro #e60000 ~4.8:1) passou; axe sem violações nos dois estados. Erro de console presente no carregamento, não investigado. Achados de token vêm do checker determinístico do oráculo."
}
````

### Decisão

````json
{
  "cardId": "C-bb8033bb74340c61d8a2834f23f79837a54c77ac40b596898e7ed06d1f8e402c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-bf1680e5eb62dbdc3a366e98c1dc686ad4921a7287d3389e82c237a75c0a0bc9

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: A mensagem de erro é inserida no DOM sem role=alert/status nem região aria-live; o foco vai para <body>, então nada é anunciado a leitores de tela.

Esperado: Mensagem de status/erro inserida dinamicamente deve ser anunciada por tecnologia assistiva (role=alert ou aria-live) sem exigir mudança de foco.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: nenhuma [role=alert],[aria-live],[role=status] após envio; activeElement=BODY` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "wcag:4.1.3",
    "observed": "A mensagem de erro é inserida no DOM sem role=alert/status nem região aria-live; o foco vai para <body>, então nada é anunciado a leitores de tela.",
    "expected": "Mensagem de status/erro inserida dinamicamente deve ser anunciada por tecnologia assistiva (role=alert ou aria-live) sem exigir mudança de foco.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: nenhuma [role=alert],[aria-live],[role=status] após envio; activeElement=BODY"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-bf1680e5eb62dbdc3a366e98c1dc686ad4921a7287d3389e82c237a75c0a0bc9",
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

## C-c65f1ae0e966661094be8ffcf68b7661e0d9d7035a86097a32520e1d07169ef0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: border-color rgb(222,226,230) #dee2e6 (variável local --tela-borda), não pertence ao registro de tokens

Esperado: Cor de token do DS (mais próxima: --gray-cool-10 #dfe1e2)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar página

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-001/F-001` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "border-color rgb(222,226,230) #dee2e6 (variável local --tela-borda), não pertence ao registro de tokens",
    "expected": "Cor de token do DS (mais próxima: --gray-cool-10 #dfe1e2)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar página"
      ]
    },
    "evidence": [
      "S-page-001/F-001"
    ]
  },
  "scope": [
    "tela inteira: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, lista de outras opções, links de ajuda e termo)"
  ],
  "notes": "Estados: inicial (scan S-page-001) e após envio vazio do formulário (scan S-page-002, compareToScanId). Interações: snapshot da árvore de acessibilidade; clique em Continuar com CPF vazio (aparece p.mensagem-erro-cpf, foco permanece no botão); CPF '123' + Enter (nenhuma mensagem, nenhuma navegação — comportamento de validação incompleto, registrado como incerto e não reportado); clique em Alto Contraste (nenhuma mudança observável — incerto, não reportado); foco por teclado em todos os links/botões/campo comparando estilos antes/depois. Observações do oráculo não convertidas em achado: font-size 11px no br-tag (sem norma), classes utilitárias extras, br-divider em <hr>. Contraste de texto (tag branca/verde ~4.6:1, erro #e60000 ~4.8:1) passou; axe sem violações nos dois estados. Erro de console presente no carregamento, não investigado. Achados de token vêm do checker determinístico do oráculo."
}
````

### Decisão

````json
{
  "cardId": "C-c65f1ae0e966661094be8ffcf68b7661e0d9d7035a86097a32520e1d07169ef0",
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

## C-cf55f80aae026464f7ce201693e58385785795abdf710c5518ed6e002ab1882d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: div.br-list com div.br-item filhos, sem role='list'/'listitem' nem ul/li; a árvore de acessibilidade expõe apenas 'generic'

Esperado: Conjunto de opções exposto como lista (ul/li ou role list/listitem), conforme relação estrutural visual (WCAG 1.3.1 — atribuição não confirmada pelo oráculo)

Janela: 1251×1278 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta · janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_snapshot: generic ref=e29 com filhos generic` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [
      ".opcao-identificacao"
    ],
    "rule": null,
    "observed": "div.br-list com div.br-item filhos, sem role='list'/'listitem' nem ul/li; a árvore de acessibilidade expõe apenas 'generic'",
    "expected": "Conjunto de opções exposto como lista (ul/li ou role list/listitem), conforme relação estrutural visual (WCAG 1.3.1 — atribuição não confirmada pelo oráculo)",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "browser_snapshot: generic ref=e29 com filhos generic"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-cf55f80aae026464f7ce201693e58385785795abdf710c5518ed6e002ab1882d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-cfe3ad595186b12c621cb9a22ef146952aa0432fa88e7dffaa9b7f2c0c6aee33

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Em viewport de 320x640 px, a barra de recursos (Alto Contraste, VLibras) se estende até x=447 px; documentElement.scrollWidth=447 > 320, gerando rolagem horizontal e cortando o botão VLibras.

Esperado: Com 320 px CSS de largura o conteúdo deve refluir sem rolagem horizontal.

Janela: 320×640 · interações desde o carregamento: 1. carregar a página 2. redimensionar janela para 320x640

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x640 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: scrollWidth 447, elementos fora da viewport DIV.barra-recursos:447, BUTTON.recurso-libras:447` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".recurso-libras"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Em viewport de 320x640 px, a barra de recursos (Alto Contraste, VLibras) se estende até x=447 px; documentElement.scrollWidth=447 > 320, gerando rolagem horizontal e cortando o botão VLibras.",
    "expected": "Com 320 px CSS de largura o conteúdo deve refluir sem rolagem horizontal.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 640
      },
      "steps": [
        "carregar a página",
        "redimensionar janela para 320x640"
      ]
    },
    "evidence": [
      "browser_evaluate: scrollWidth 447, elementos fora da viewport DIV.barra-recursos:447, BUTTON.recurso-libras:447"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda, termo de uso"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual com Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab e foco programático em todos os controles (comparação de estilos com/sem foco); envio do formulário vazio (clique em Continuar), com '123' (Enter) e com '52998224725' (Enter); clique em Alto Contraste; redimensionamento para 320x640. Contraste de texto verificado (todos >= 4,5:1, incl. selo verde 4,59:1 e erro vermelho 4,81:1); rótulos, landmarks, headings e lang=pt-BR adequados. Incertos, não reportados: botão Alto Contraste não produz mudança observável (pode ser stub do protótipo); CPF '123' é aceito sem mensagem de erro e, nessa tentativa, o foco ficou no body (não reproduzido com CPF válido); ausência de link de salto para o conteúdo (eMAG 1.5) em página curta. Console: apenas 404 do favicon."
}
````

### Decisão

````json
{
  "cardId": "C-cfe3ad595186b12c621cb9a22ef146952aa0432fa88e7dffaa9b7f2c0c6aee33",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d4755e43fbded23466424556b06fe32d9b277fbb829a56368f66f7d31f5b1e13

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: color: rgb(230, 0, 0) (#e60000)

Esperado: Cor de token do gov.br DS (ex.: token de feedback danger).

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `verify_finding V-001 confirmed (predicate:token-color, live)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "color: rgb(230, 0, 0) (#e60000)",
    "expected": "Cor de token do gov.br DS (ex.: token de feedback danger).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "verify_finding V-001 confirmed (predicate:token-color, live)"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-d4755e43fbded23466424556b06fe32d9b277fbb829a56368f66f7d31f5b1e13",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dcbdd74b3ddedb23d46c1a25ad1008352c883ffad63d6a5dd14b3eefe21218ad

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Ao receber foco por teclado (:focus-visible verdadeiro), outline-style permanece 'none', box-shadow 'none', sem mudança de fundo, sublinhado ou cor no link nem no .br-item pai; demais controles exibem outline tracejado 4px rgb(194,133,12).

Esperado: Indicador de foco visível ao focar cada link de opção de identificação por teclado.

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página 2. pressionar Tab 6 a 9 vezes até os links 'Login com seu banco', 'Login com QR code', 'Seu certificado digital', 'Seu certificado digital em nuvem'

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate focusin log: A.link-opcao outlineStyle none, boxShadow none` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate estilos antes/depois de focus() idênticos` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "observed": "Ao receber foco por teclado (:focus-visible verdadeiro), outline-style permanece 'none', box-shadow 'none', sem mudança de fundo, sublinhado ou cor no link nem no .br-item pai; demais controles exibem outline tracejado 4px rgb(194,133,12).",
    "expected": "Indicador de foco visível ao focar cada link de opção de identificação por teclado.",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página",
        "pressionar Tab 6 a 9 vezes até os links 'Login com seu banco', 'Login com QR code', 'Seu certificado digital', 'Seu certificado digital em nuvem'"
      ]
    },
    "evidence": [
      "browser_evaluate focusin log: A.link-opcao outlineStyle none, boxShadow none",
      "browser_evaluate estilos antes/depois de focus() idênticos"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Sem oráculo nem scan_page; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: Tab por todos os 11 focáveis registrando outline/box-shadow; envio com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece sem aria-live/role=alert, sem aria-invalid/aria-describedby, foco permanece no botão); envio com '123' e com '52998224725' (mensagem de erro some, sem outra resposta visível — comportamento pós-envio não avaliável, incerto); clique em Alto Contraste (nenhuma mudança observável de classe/estilo; registrado como incerto, não reportado); viewport 320x640 para reflow. Contraste de todos os textos ≥4,5:1 (menor: selo 'SUA CONTA SERÁ PRATA' 4,59:1; erro rgb(230,0,0) ≈4,8:1). Alvos .link-opcao têm 20px de altura mas espaçamento ≥24px entre itens (exceção de 2.5.8). Console: apenas 404 de favicon.ico. VLibras não testado além do DOM."
}
````

### Decisão

````json
{
  "cardId": "C-dcbdd74b3ddedb23d46c1a25ad1008352c883ffad63d6a5dd14b3eefe21218ad",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e008030641d8ec9ca1fe9ac2819c620fa9e2ab70dfa9f46e30af0a19044bbe5b

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Após envio vazio, o campo não tem aria-invalid nem aria-describedby apontando para a mensagem 'Informe um CPF para continuar.' (<p> sem id); a borda do campo continua cinza

Esperado: Erro associado programaticamente ao campo (aria-describedby para a mensagem e aria-invalid='true')

Janela: 1251×1278 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: govbr-3.7.0-accessibility-global-cc837bbaf713

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: ariaInvalid=null, describedby=null` → identificador devolvido por ferramenta (sem arquivo)
- `scan S-page-002` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "govbr-3.7.0-accessibility-global-cc837bbaf713",
    "observed": "Após envio vazio, o campo não tem aria-invalid nem aria-describedby apontando para a mensagem 'Informe um CPF para continuar.' (<p> sem id); a borda do campo continua cinza",
    "expected": "Erro associado programaticamente ao campo (aria-describedby para a mensagem e aria-invalid='true')",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "browser_evaluate: ariaInvalid=null, describedby=null",
      "scan S-page-002"
    ]
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda e termo)"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece como <p> solto, sem aria-describedby/aria-invalid, sem live region, foco permanece no botão, borda do campo continua cinza); envio com '123' (mensagem some, nenhuma validação nem feedback, página não muda — registrado como incerto, pode ser comportamento simulado); navegação por Tab em todos os controles (os 4 links .link-opcao ficam sem outline/indicador de foco; demais controles têm outline tracejado); clique em 'Alto Contraste' não alterou nada visível (incerto, não reportado). Varreduras: S-page-001 (estado inicial, 6 findings) e S-page-002 (estado de erro, escopo form, 0 findings axe). F-006 (br-input em <input>) rejeitado pelo verify_finding (V-002, sem norma). Cor da mensagem de erro confirmada via V-001. Observações de classes não canônicas e font-size 11px da tag não são achados (sem norma). Único erro de console: 404 de favicon.ico. Contraste da tag (branco sobre #168821, ~4.6:1) e da mensagem (#e60000 sobre branco, ~4.8:1) passam. Ausência de skip link não reportada (incerto)."
}
````

### Decisão

````json
{
  "cardId": "C-e008030641d8ec9ca1fe9ac2819c620fa9e2ab70dfa9f46e30af0a19044bbe5b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e6a85e83c07bf846e3576bfc141c95a15c1614ed1ecd069a0652f0e6be05d0e6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: border-color: rgb(222, 226, 230) (#dee2e6), via var(--tela-borda), não é token do DS

Esperado: Valor de token de cor do DS (mais próximo: --gray-cool-10 #dfe1e2).

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan_page S-page-001 F-001` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "border-color: rgb(222, 226, 230) (#dee2e6), via var(--tela-borda), não é token do DS",
    "expected": "Valor de token de cor do DS (mais próximo: --gray-cool-10 #dfe1e2).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página"
      ]
    },
    "evidence": [
      "scan_page S-page-001 F-001"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-e6a85e83c07bf846e3576bfc141c95a15c1614ed1ecd069a0652f0e6be05d0e6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e70fd8b8d7463fa5cc41452b2cba317d70f5b2d3793e873a108013a82ad066bd

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: padding: 13px nos 4 itens de 'Outras opções'

Esperado: Espaçamento da escala do DS (múltiplos de 4px, base 8px).

Janela: 1251×1278 · interações desde o carregamento: 1. carregar a página

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan_page S-page-001 F-002` → identificador devolvido por ferramenta (sem arquivo)
- `F-003` → identificador devolvido por ferramenta (sem arquivo)
- `F-004` → identificador devolvido por ferramenta (sem arquivo)
- `F-005` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding: 13px nos 4 itens de 'Outras opções'",
    "expected": "Espaçamento da escala do DS (múltiplos de 4px, base 8px).",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar a página"
      ]
    },
    "evidence": [
      "scan_page S-page-001 F-002",
      "F-003",
      "F-004",
      "F-005"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, links de ajuda/termo)",
    "estado inicial",
    "estado de erro após envio vazio",
    "envio com CPF '123'"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; foco programático e por teclado em todos os links/botões/campo com leitura de estilos computados; envio do formulário vazio (clique e Enter) e com '123'. scan_page no estado inicial (S-page-001) e no estado de erro (S-page-002, compareToScanId); axe sem violações nos dois estados. Cor da mensagem de erro confirmada por verify_finding (V-001, live). Observações do oráculo sem norma (classes extras, font-size 11px da tag, br-divider em <hr> com role=presentation) não foram tratadas como achados. Incertos/não reportados: CPF '123' é aceito sem mensagem de validação e sem navegação (comportamento de protótipo, sem destino observável); ausência de aria-invalid no campo em erro (técnica, não exigência isolada); links de opção sem sublinhado fora de bloco de texto; botões Alto Contraste/VLibras não testados quanto ao efeito. Não foi avaliada viewport estreita/reflow. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-e70fd8b8d7463fa5cc41452b2cba317d70f5b2d3793e873a108013a82ad066bd",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e97b29d39f08c68fc0d9af3334baafa2e93b12ea47f05dc5c186d164e13c45f8

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1251x1278

Observado: Classe br-input aplicada ao próprio <input> (além do wrapper div.br-input)

Esperado: br-input aplicado somente ao <div> contêiner

Janela: 1251×1278 · interações desde o carregamento: 1. carregar página

Regra declarada: ds-structure-input-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1251x1278; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-001/F-006` → não encontrado na evidência preservada da execução
- `get_component_spec input: constraint ds-structure-input-tag` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "ds-structure-input-tag",
    "observed": "Classe br-input aplicada ao próprio <input> (além do wrapper div.br-input)",
    "expected": "br-input aplicado somente ao <div> contêiner",
    "state": {
      "viewport": {
        "width": 1251,
        "height": 1278
      },
      "steps": [
        "carregar página"
      ]
    },
    "evidence": [
      "S-page-001/F-006",
      "get_component_spec input: constraint ds-structure-input-tag"
    ]
  },
  "scope": [
    "tela inteira: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, lista de outras opções, links de ajuda e termo)"
  ],
  "notes": "Estados: inicial (scan S-page-001) e após envio vazio do formulário (scan S-page-002, compareToScanId). Interações: snapshot da árvore de acessibilidade; clique em Continuar com CPF vazio (aparece p.mensagem-erro-cpf, foco permanece no botão); CPF '123' + Enter (nenhuma mensagem, nenhuma navegação — comportamento de validação incompleto, registrado como incerto e não reportado); clique em Alto Contraste (nenhuma mudança observável — incerto, não reportado); foco por teclado em todos os links/botões/campo comparando estilos antes/depois. Observações do oráculo não convertidas em achado: font-size 11px no br-tag (sem norma), classes utilitárias extras, br-divider em <hr>. Contraste de texto (tag branca/verde ~4.6:1, erro #e60000 ~4.8:1) passou; axe sem violações nos dois estados. Erro de console presente no carregamento, não investigado. Achados de token vêm do checker determinístico do oráculo."
}
````

### Decisão

````json
{
  "cardId": "C-e97b29d39f08c68fc0d9af3334baafa2e93b12ea47f05dc5c186d164e13c45f8",
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

## C-eee39c3334cb31dbd22f1d5aedbffec3b59653089b57af166bca275d76ef915e

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Em 320 px de largura a barra de recursos (flex-wrap: nowrap, botões white-space: nowrap) ocupa de x=93 a x=447; o botão VLibras fica fora da tela e a página ganha rolagem horizontal (scrollWidth 447 > 320).

Esperado: Conteúdo deve refluir em 320 px CSS sem rolagem horizontal nem perda de conteúdo.

Janela: 320×640 · interações desde o carregamento: 1. redimensionar janela para 320x640

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x640 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `document.documentElement.scrollWidth=447; getBoundingClientRect .recurso-libras right=447` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".recurso-contraste",
      ".recurso-libras"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Em 320 px de largura a barra de recursos (flex-wrap: nowrap, botões white-space: nowrap) ocupa de x=93 a x=447; o botão VLibras fica fora da tela e a página ganha rolagem horizontal (scrollWidth 447 > 320).",
    "expected": "Conteúdo deve refluir em 320 px CSS sem rolagem horizontal nem perda de conteúdo.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 640
      },
      "steps": [
        "redimensionar janela para 320x640"
      ]
    },
    "evidence": [
      "document.documentElement.scrollWidth=447; getBoundingClientRect .recurso-libras right=447"
    ]
  },
  "scope": [
    "tela inteira: barra superior, painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Oráculo/scan_page indisponíveis; avaliação manual via Playwright (snapshot de acessibilidade, DOM, estilos computados). Interações: envio do formulário vazio (mensagem de erro aparece), envio com '123' (mensagem some, nenhuma validação/feedback — registrado como incerto, não reportado), foco programático e Tab real em todos os controles, clique em Alto Contraste (sem efeito observável no DOM/estilos — incerto, possivelmente simulado), redimensionamento para 320x640. Contraste de textos verificado (todos >= 4.5:1). Ausência de links de salto (eMAG 1.5) e placeholder com mesma cor do valor digitado considerados incertos e não reportados. Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-eee39c3334cb31dbd22f1d5aedbffec3b59653089b57af166bca275d76ef915e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````
