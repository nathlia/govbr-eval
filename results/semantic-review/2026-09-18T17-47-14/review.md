# Revisão semântica — pacote fechado

Versão: flow-semantic-1.4.0 · 54 cartões únicos · 54 pendentes

## As três filas

| Fila | Quantidade | O que ela cobra |
|---|---|---|
| **Ativa — desta bateria** | 54 cartão(ões) | **Só esta fecha a bateria.** Enquanto houver um, as métricas são provisórias. |
| Histórica — de outras baterias | 0 | Dívida declarada do projeto. Não cobra nada desta bateria, e não some por isso. |
| Descobertas para a próxima referência | 0 afirmação(ões) | Defeito correto fora do gabarito congelado. Entra na PRÓXIMA versão; não mexe no denominador desta. |

Esforço: 83 sujeitos · 39 cartão(ões) sem evidência verificada · 46 com unidade candidata · estimativa **279 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado. Declare antes de começar — depois de ver os cartões já não é orçamento.

Esta renderização NÃO é cega: 42 cartão(ões) contêm texto que nomeia o braço da execução. Para decidir sem saber o braço, gere com `--cego`.

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

## C-07f597873ef8996021c386640593c3e45a915930c49b0717855be76dcf798b30

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
  "cardId": "C-07f597873ef8996021c386640593c3e45a915930c49b0717855be76dcf798b30",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-084f1c2be4c5e395df2e6a3de3ebd718e7e70553cddd54454e87fb4d2b6856f3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A pagina nao oferece nenhuma ancora de salto: document.querySelectorAll('.br-skiplink, a[href^="#"]') retorna 0 elementos, e a ordem de tabulacao comeca em a.marca-govbr, seguida dos botoes Alto Contraste e VLibras da barra de recursos, antes de qualquer conteudo de main.

Esperado: Link de salto para o conteudo principal como primeiro elemento focalizavel da barra de acessibilidade, apontando para o bloco main .area-identificacao.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. listar a ordem de tabulacao dos elementos focalizaveis 3. pressionar Tab a partir do inicio do documento

Regra declarada: emag:1.5

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>header" — <header> "gov.br Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8d75247c6537260aa78cf1da64001c666887b7ece0eb3d0e3e1799b6bbeaf07c — V-06 · sempre · cena 1280x900 · <header> "gov.br Alto Contraste VLibras": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `V-004 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate)` → identificador devolvido por ferramenta (sem arquivo)
- `emag-1.5 via get_emag_rules(section=1)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-superior",
    "relatedSelectors": [
      ".area-identificacao"
    ],
    "rule": "emag:1.5",
    "observed": "A pagina nao oferece nenhuma ancora de salto: document.querySelectorAll('.br-skiplink, a[href^=\"#\"]') retorna 0 elementos, e a ordem de tabulacao comeca em a.marca-govbr, seguida dos botoes Alto Contraste e VLibras da barra de recursos, antes de qualquer conteudo de main.",
    "expected": "Link de salto para o conteudo principal como primeiro elemento focalizavel da barra de acessibilidade, apontando para o bloco main .area-identificacao.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "listar a ordem de tabulacao dos elementos focalizaveis",
        "pressionar Tab a partir do inicio do documento"
      ]
    },
    "evidence": [
      "S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "V-004 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate)",
      "emag-1.5 via get_emag_rules(section=1)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-084f1c2be4c5e395df2e6a3de3ebd718e7e70553cddd54454e87fb4d2b6856f3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-10dc2de4a4616ffc9183389028f9fb5d59b27f1ab5277878c6fd4bf0717581fa

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: padding computado de 13px nos quatro itens da lista de opcoes, vindo da regra '.opcao-identificacao { ... padding: 13px; ... }', fora da escala de espacamento do DS.

Esperado: Espacamento em multiplos de 4px da escala do gov.br DS (por exemplo 12px ou 16px).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0ceb07ddb653f8cb9fc078690580f877f9c920af1c696626700c5f784dc97c60 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-18e34f11569ef33ae87295505711425b5f2b7db9de61c35c6f792699b68fdb2c — V-01 · sempre · cena 1280x900 · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-5f1050f826ead59f54ec7744c5c79bff70b6a54028694b03e2e87161eb5a34bf — V-06 · sempre · cena 1280x900 · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-69e546ff40b7b212fc4d6b2b3cf3873c8ba13022f0993135b0d82027459f3b2e — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
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
- U-ad7de00f96c7c421d72917b032b505a62f2aa89f3cd335725acf24230e2b3351 — V-01 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e46030c2db24cf84b0c41b535a62f53bb350e341f3c4f412c5d2be26bad001c0 — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-002..F-005 / F-008..F-011 (ds-token-spacing, severity minor, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução
- `S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes .opcao-identificacao",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "padding computado de 13px nos quatro itens da lista de opcoes, vindo da regra '.opcao-identificacao { ... padding: 13px; ... }', fora da escala de espacamento do DS.",
    "expected": "Espacamento em multiplos de 4px da escala do gov.br DS (por exemplo 12px ou 16px).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "F-002..F-005 / F-008..F-011 (ds-token-spacing, severity minor, confidence 1, pathway deterministic)",
      "S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-10dc2de4a4616ffc9183389028f9fb5d59b27f1ab5277878c6fd4bf0717581fa",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-15e68865066cd8e54436548c058ff5e2b4724360250d90f15d56c6a091b93b23

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após submeter o formulário com o campo vazio, aparece <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>, mas o campo mantém apenas id, class, inputmode, placeholder, aria-required e type — sem aria-invalid e sem aria-describedby. A mensagem não tem id, role='alert' nem aria-live (document.querySelectorAll('[role="alert"],[aria-live],[role="status"]') devolve 0 elementos) e o foco permanece no botão 'Continuar'.

Esperado: Campo com aria-invalid='true' e aria-describedby apontando para a mensagem de erro, de modo que o erro seja identificado e anunciado por tecnologia assistiva.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: emag:6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `V-002 — verify_finding emag-6.6 live=true com actions [click .acao-continuar] e stateFingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate` → identificador devolvido por ferramenta (sem arquivo)
- `S-page-002 — varredura do estado de erro, fingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4` → identificador devolvido por ferramenta (sem arquivo)
- `Leitura direta dos atributos do #cpf no estado de erro: aria-describedby null, aria-invalid null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "emag:6.6",
    "observed": "Após submeter o formulário com o campo vazio, aparece <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p>, mas o campo mantém apenas id, class, inputmode, placeholder, aria-required e type — sem aria-invalid e sem aria-describedby. A mensagem não tem id, role='alert' nem aria-live (document.querySelectorAll('[role=\"alert\"],[aria-live],[role=\"status\"]') devolve 0 elementos) e o foco permanece no botão 'Continuar'.",
    "expected": "Campo com aria-invalid='true' e aria-describedby apontando para a mensagem de erro, de modo que o erro seja identificado e anunciado por tecnologia assistiva.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "V-002 — verify_finding emag-6.6 live=true com actions [click .acao-continuar] e stateFingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate",
      "S-page-002 — varredura do estado de erro, fingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4",
      "Leitura direta dos atributos do #cpf no estado de erro: aria-describedby null, aria-invalid null"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-15e68865066cd8e54436548c058ff5e2b4724360250d90f15d56c6a091b93b23",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1661c698d3378b38581bf59e38246f7a7ac9b21f374db8e607a50ce4cec375e3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Apos submeter o formulario vazio, a tela entra em estado de erro e exibe 'Informe um CPF para continuar.', mas o campo continua sem qualquer marcacao programatica de invalidez: getAttribute('aria-invalid') e null e a borda computada permanece '0.666667px solid rgb(136, 136, 136)', identica a do estado valido. Na arvore de acessibilidade o campo segue anunciado apenas como textbox 'CPF', sem estado invalido. O mesmo ocorre submetendo por clique em Continuar e por Enter dentro do campo.

Esperado: Enquanto o campo estiver em erro, seu estado de invalidez deve ser programaticamente determinavel, por exemplo com aria-invalid="true" em #cpf, removido quando o valor voltar a ser aceito.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. deixar o campo CPF vazio 3. acionar o botao Continuar (e, em repeticao independente, pressionar Enter com o foco em #cpf)

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `#cpf.getAttribute('aria-invalid') === null no estado de erro` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML do form no estado de erro: <input id="cpf" class="br-input" inputmode="numeric" placeholder="Digite seu CPF" aria-required="true" type="text" value="">` → identificador devolvido por ferramenta (sem arquivo)
- `getComputedStyle(#cpf).border === '0.666667px solid rgb(136, 136, 136)' antes e depois do erro` → identificador devolvido por ferramenta (sem arquivo)
- `snapshot de acessibilidade do estado de erro: textbox "CPF" [ref=e26] sem estado invalid` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:4.1.2",
    "observed": "Apos submeter o formulario vazio, a tela entra em estado de erro e exibe 'Informe um CPF para continuar.', mas o campo continua sem qualquer marcacao programatica de invalidez: getAttribute('aria-invalid') e null e a borda computada permanece '0.666667px solid rgb(136, 136, 136)', identica a do estado valido. Na arvore de acessibilidade o campo segue anunciado apenas como textbox 'CPF', sem estado invalido. O mesmo ocorre submetendo por clique em Continuar e por Enter dentro do campo.",
    "expected": "Enquanto o campo estiver em erro, seu estado de invalidez deve ser programaticamente determinavel, por exemplo com aria-invalid=\"true\" em #cpf, removido quando o valor voltar a ser aceito.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "deixar o campo CPF vazio",
        "acionar o botao Continuar (e, em repeticao independente, pressionar Enter com o foco em #cpf)"
      ]
    },
    "evidence": [
      "#cpf.getAttribute('aria-invalid') === null no estado de erro",
      "outerHTML do form no estado de erro: <input id=\"cpf\" class=\"br-input\" inputmode=\"numeric\" placeholder=\"Digite seu CPF\" aria-required=\"true\" type=\"text\" value=\"\">",
      "getComputedStyle(#cpf).border === '0.666667px solid rgb(136, 136, 136)' antes e depois do erro",
      "snapshot de acessibilidade do estado de erro: textbox \"CPF\" [ref=e26] sem estado invalid"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartao de identificacao (titulo, cabecalho do metodo CPF, formulario CPF, estado de erro do formulario, lista de outras opcoes de identificacao, selo da conta, links de ajuda e termo)"
  ],
  "notes": "Ferramentas disponiveis nesta execucao: apenas navegador (Playwright MCP). Nao havia oraculo de regras nem scan_page, portanto nenhuma varredura heuristica foi executada e nenhum achado pode ser verificado por ferramenta de verificacao; as atribuicoes de regra abaixo sao normativas WCAG 2.2 justificadas na propria observacao, sem ids de design system (nenhum id de ds foi inventado). Interacoes realizadas: carga em 1280x900; snapshot da arvore de acessibilidade; dump do DOM com atributos; calculo de contraste de todos os nos de texto e das bordas de componentes (todos aprovados: menor valor 4.59 no selo .selo-conta e 4.81 na mensagem de erro; borda do input 3.54 e outline de foco 3.16 contra branco, ambos acima de 3:1); submissao do formulario vazio por clique em Continuar e por Enter no campo CPF (mesma mensagem 'Informe um CPF para continuar.', foco permanece no botao ou no campo, sem live region); digitacao de '111' e nova submissao; cliques em 'Alto Contraste' e 'VLibras'; travessia real por Tab pelos 11 focaveis em ordem de DOM, sem armadilha de teclado, comparando estilos computados antes/depois do foco em cada um; redimensionamento para 320x800 e retorno a 1280x900; teste de espacamento de texto 1.4.12 (line-height 1.5, letter-spacing .12em, word-spacing .16em, margin 2em) sem recorte nem sobreposicao. Console limpo exceto 404 de /favicon.ico. Itens deixados explicitamente como INCERTOS, sem achado, por nao haver referencia normativa que eu consiga justificar sem o oraculo: (1) os botoes .recurso-contraste e .recurso-libras nao alteram classe, atributo nem estilo algum ao serem clicados (o realce azul observado e apenas :hover) - controles inertes nesta build, mas nao consigo decidir se e defeito da tela ou limite do mock; (2) submeter '111' limpa a mensagem de erro e nao produz navegacao, mensagem de sucesso ou qualquer outro estado - beco sem saida, sem comportamento esperado conhecido; (3) .lista-opcoes/.br-item usam div com classes de lista do design system mas sem semantica de lista (nenhum role=list); (4) ausencia de link de pular para o conteudo - so ha 3 focaveis antes de <main> e uma unica pagina, entao nao afirmo 2.4.1; (5) o selo .selo-conta ('SUA CONTA SERA PRATA') nao esta programaticamente vinculado ao link 'Login com seu banco', apenas adjacente no DOM. Limitacao de cobertura: nao foi possivel avaliar estados posteriores do fluxo (nenhuma submissao avanca de tela) nem o modo de alto contraste (o botao nao o ativa)."
}
````

### Decisão

````json
{
  "cardId": "C-1661c698d3378b38581bf59e38246f7a7ac9b21f374db8e607a50ce4cec375e3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-18d90404c461259b5aed7fe7dae145247ba8b6311f5f0bf0893e88b7309647a6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A classe br-input está aplicada ao próprio <input>, além de estar no <div class="br-input campo-cpf-fluxo"> que envolve rótulo e campo; a raiz do componente br-input passa a existir duas vezes na mesma anatomia.

Esperado: br-input apenas no <div> contêiner do componente, com o <input> nativo dentro dele.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-structure-input-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `F-006 (scan S-page-001) e F-012 (scan S-page-002) — ds-structure-input-tag, severidade serious, confiança 1` → identificador devolvido por ferramenta (sem arquivo)
- `V-009 — verify_finding ds-structure-input-tag live=true: verdict confirmed, predicado structure-tag, 1 de 1 elemento` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "input#cpf.br-input",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "ds-structure-input-tag",
    "observed": "A classe br-input está aplicada ao próprio <input>, além de estar no <div class=\"br-input campo-cpf-fluxo\"> que envolve rótulo e campo; a raiz do componente br-input passa a existir duas vezes na mesma anatomia.",
    "expected": "br-input apenas no <div> contêiner do componente, com o <input> nativo dentro dele.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "F-006 (scan S-page-001) e F-012 (scan S-page-002) — ds-structure-input-tag, severidade serious, confiança 1",
      "V-009 — verify_finding ds-structure-input-tag live=true: verdict confirmed, predicado structure-tag, 1 de 1 elemento"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-18d90404c461259b5aed7fe7dae145247ba8b6311f5f0bf0893e88b7309647a6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1b0d5d6890c6e3aa5b10357bac95a49dd8d2487cdd5aeebd01ccc010b5e5d03c

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: border-color computado rgb(222, 226, 230) (#dee2e6), com border 0.666667px solid, nao corresponde a nenhum token de cor do gov.br DS.

Esperado: Valor vindo do registro de tokens do DS; o token mais proximo apontado pelo oraculo e --gray-cool-10 (#dfe1e2), a uma distancia RGB de 4.24.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. executar scan_page com check tokens/color

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `F-001 / F-007 (scan_page, severidade moderate, pathway deterministic, confidence 1)` → não encontrado na evidência preservada da execução
- `S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `getComputedStyle('.lista-opcoes').borderColor => rgb(222, 226, 230)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "border-color computado rgb(222, 226, 230) (#dee2e6), com border 0.666667px solid, nao corresponde a nenhum token de cor do gov.br DS.",
    "expected": "Valor vindo do registro de tokens do DS; o token mais proximo apontado pelo oraculo e --gray-cool-10 (#dfe1e2), a uma distancia RGB de 4.24.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "executar scan_page com check tokens/color"
      ]
    },
    "evidence": [
      "F-001 / F-007 (scan_page, severidade moderate, pathway deterministic, confidence 1)",
      "S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "getComputedStyle('.lista-opcoes').borderColor => rgb(222, 226, 230)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-1b0d5d6890c6e3aa5b10357bac95a49dd8d2487cdd5aeebd01ccc010b5e5d03c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1f7c5cf86e952e7651041fa325a5b76508930554540aa8a29eb0c6b074e06125

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A barra de acessibilidade do cabeçalho traz apenas os botões 'Alto Contraste' e 'VLibras'. Não há nenhum link de atalho: document.querySelectorAll('a[href^="#"]') devolve 0 elementos, o primeiro item da ordem de tabulação é a marca gov.br e o <main class="area-identificacao"> não possui id que sirva de destino.

Esperado: Link de atalho para o conteúdo principal (por exemplo 'Ir para o conteúdo') como primeiro item da barra de acessibilidade, apontando para o <main>.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. percorrer a ordem de tabulação com Tab a partir do início do documento

Regra declarada: emag:1.5

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-0a80b239f1ed8212724b644c0f4e86085bccfb2d09e50741ac440a272df14daf — V-10 · sempre · cena 1280x900 · <div> "Alto Contraste VLibras": a barra de acessibilidade não traz âncora de salto para o conteúdo principal: dos 7 links da página nenhum aponta para fragmento (todos href="/fluxo"), o <main> não tem id que sirva de destino, e o primeiro ponto de tabulação é a marca gov.br. As duas verificações da recomendação 1.5 falham. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:74ed1b06.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `V-004 — verify_finding emag-1.5 live=true: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate` → identificador devolvido por ferramenta (sem arquivo)
- `Primeiro Tab após a carga leva ao <a class="marca-govbr">; nenhuma âncora interna existe no documento` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      "main"
    ],
    "rule": "emag:1.5",
    "observed": "A barra de acessibilidade do cabeçalho traz apenas os botões 'Alto Contraste' e 'VLibras'. Não há nenhum link de atalho: document.querySelectorAll('a[href^=\"#\"]') devolve 0 elementos, o primeiro item da ordem de tabulação é a marca gov.br e o <main class=\"area-identificacao\"> não possui id que sirva de destino.",
    "expected": "Link de atalho para o conteúdo principal (por exemplo 'Ir para o conteúdo') como primeiro item da barra de acessibilidade, apontando para o <main>.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "percorrer a ordem de tabulação com Tab a partir do início do documento"
      ]
    },
    "evidence": [
      "V-004 — verify_finding emag-1.5 live=true: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate",
      "Primeiro Tab após a carga leva ao <a class=\"marca-govbr\">; nenhuma âncora interna existe no documento"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-1f7c5cf86e952e7651041fa325a5b76508930554540aa8a29eb0c6b074e06125",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-209e581c99f2c1ded15dfc6adce51afe2f4d9be1f21403f910f50807af180bbb

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A barra de acessibilidade do cabecalho contem apenas os botoes Alto Contraste e VLibras. document.querySelectorAll('a[href^="#"], .br-skiplink') retorna 0 elementos, e o primeiro focavel do documento e <a href="/fluxo" class="marca-govbr">, um link de marca, nao um salto para o conteudo.

Esperado: Ancora de salto para o conteudo principal disponivel na barra de acessibilidade e sendo o primeiro link focavel da pagina.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. tabular do inicio do documento e enumerar os 11 focaveis em ordem 3. consultar a[href^='#'] e .br-skiplink no DOM

Regra declarada: govbr-3.7.0-accessibility-global-7d2b85f81c52

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-0a80b239f1ed8212724b644c0f4e86085bccfb2d09e50741ac440a272df14daf — V-10 · sempre · cena 1280x900 · <div> "Alto Contraste VLibras": a barra de acessibilidade não traz âncora de salto para o conteúdo principal: dos 7 links da página nenhum aponta para fragmento (todos href="/fluxo"), o <main> não tem id que sirva de destino, e o primeiro ponto de tabulação é a marca gov.br. As duas verificações da recomendação 1.5 falham. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:74ed1b06.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `V-002` → identificador devolvido por ferramenta (sem arquivo)
- `S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `document.querySelectorAll('a[href^="#"], .br-skiplink').length => 0` → identificador devolvido por ferramenta (sem arquivo)
- `ordem de foco observada: .marca-govbr, .recurso-contraste, .recurso-libras, #cpf, .acao-continuar, 4x .link-opcao, .link-ajuda, .link-termo` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".marca-govbr"
    ],
    "rule": "govbr-3.7.0-accessibility-global-7d2b85f81c52",
    "observed": "A barra de acessibilidade do cabecalho contem apenas os botoes Alto Contraste e VLibras. document.querySelectorAll('a[href^=\"#\"], .br-skiplink') retorna 0 elementos, e o primeiro focavel do documento e <a href=\"/fluxo\" class=\"marca-govbr\">, um link de marca, nao um salto para o conteudo.",
    "expected": "Ancora de salto para o conteudo principal disponivel na barra de acessibilidade e sendo o primeiro link focavel da pagina.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "tabular do inicio do documento e enumerar os 11 focaveis em ordem",
        "consultar a[href^='#'] e .br-skiplink no DOM"
      ]
    },
    "evidence": [
      "V-002",
      "S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "document.querySelectorAll('a[href^=\"#\"], .br-skiplink').length => 0",
      "ordem de foco observada: .marca-govbr, .recurso-contraste, .recurso-libras, #cpf, .acao-continuar, 4x .link-opcao, .link-ajuda, .link-termo"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-209e581c99f2c1ded15dfc6adce51afe2f4d9be1f21403f910f50807af180bbb",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-22adcdd41efdeb1906715ca992fafa919b8fa796cffc3515355682ee0914ed73

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botao 'VLibras' nao produz nenhum efeito ao ser acionado: outerHTML do documento identico antes e depois do clique, nenhum widget VLibras injetado (seletor '[vw],[vw-access-button],div[vw]' nao encontra nada) e body continua com 1 filho.

Esperado: Acionar o controle deve ativar o tradutor de Libras ou, na impossibilidade, o controle nao deveria ser oferecido. Nao localizei no oraculo uma regra que sustente esta exigencia, por isso rule fica null.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em VLibras 3. comparar outerHTML e procurar o widget VLibras no DOM

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta

### Sujeitos

- "body>div>header>div>button:nth-of-type(2)" — <button> "VLibras"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `comparacao outerHTML antes/depois => librasChanged: false` → não encontrado na evidência preservada da execução
- `document.querySelector('[vw],[vw-access-button],div[vw]') => null` → identificador devolvido por ferramenta (sem arquivo)
- `document.body.children.length => 1 apos o clique` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".recurso-libras",
    "relatedSelectors": [],
    "rule": null,
    "observed": "O botao 'VLibras' nao produz nenhum efeito ao ser acionado: outerHTML do documento identico antes e depois do clique, nenhum widget VLibras injetado (seletor '[vw],[vw-access-button],div[vw]' nao encontra nada) e body continua com 1 filho.",
    "expected": "Acionar o controle deve ativar o tradutor de Libras ou, na impossibilidade, o controle nao deveria ser oferecido. Nao localizei no oraculo uma regra que sustente esta exigencia, por isso rule fica null.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em VLibras",
        "comparar outerHTML e procurar o widget VLibras no DOM"
      ]
    },
    "evidence": [
      "comparacao outerHTML antes/depois => librasChanged: false",
      "document.querySelector('[vw],[vw-access-button],div[vw]') => null",
      "document.body.children.length => 1 apos o clique"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-22adcdd41efdeb1906715ca992fafa919b8fa796cffc3515355682ee0914ed73",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-2de54dec46f98bd0cd9c58b0c190b55c70d588e547d4936e49224554f1894826

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Com a janela em 320x800, .barra-recursos tem flex-wrap: nowrap e largura 353.4px dentro de .barra-superior, que mede 304.7px. O botao VLibras fica com left 305.1px e right 446.7px, inteiramente fora da viewport, e document.documentElement.scrollWidth = 447 contra clientWidth = 305, produzindo barra de rolagem horizontal em toda a pagina (confirmado no screenshot).

Esperado: Sem rolagem horizontal a 320px de largura e sem perda de funcionalidade: a barra de recursos deve quebrar linha, encolher ou colapsar para caber na largura disponivel.

Janela: 320×800 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. redimensionar a janela para 320x800 3. medir scrollWidth/clientWidth e os bounding boxes de .barra-recursos e .recurso-libras

Regra declarada: emag:4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x800 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `fluxo-320.png` → `pipeline/logs/2026-09-18T17-47-14-com-run1-e4e67d13-evidencia/fluxo-320.png` (sha256 0a02da4e25f6)
- `V-003 (ruleExists=pass, applicability=pass, violation=no-predicate, live=false)` → identificador devolvido por ferramenta (sem arquivo)
- `emag-4.3 via get_emag_rules(section=4)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".recurso-libras"
    ],
    "rule": "emag:4.3",
    "observed": "Com a janela em 320x800, .barra-recursos tem flex-wrap: nowrap e largura 353.4px dentro de .barra-superior, que mede 304.7px. O botao VLibras fica com left 305.1px e right 446.7px, inteiramente fora da viewport, e document.documentElement.scrollWidth = 447 contra clientWidth = 305, produzindo barra de rolagem horizontal em toda a pagina (confirmado no screenshot).",
    "expected": "Sem rolagem horizontal a 320px de largura e sem perda de funcionalidade: a barra de recursos deve quebrar linha, encolher ou colapsar para caber na largura disponivel.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 800
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "redimensionar a janela para 320x800",
        "medir scrollWidth/clientWidth e os bounding boxes de .barra-recursos e .recurso-libras"
      ]
    },
    "evidence": [
      "fluxo-320.png",
      "V-003 (ruleExists=pass, applicability=pass, violation=no-predicate, live=false)",
      "emag-4.3 via get_emag_rules(section=4)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-2de54dec46f98bd0cd9c58b0c190b55c70d588e547d4936e49224554f1894826",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3093602c18447cab904649a9f7d7ef133cc1bf5578c10aae837125729542474e

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Com a janela em 320x640, a barra de recursos (display:flex, flex-wrap:nowrap, gap 16px) ocupa de x=93 a x=447 enquanto o documento tem clientWidth 305; document.documentElement.scrollWidth é 447 contra clientWidth 305 e o botão 'VLibras' começa em x=305, inteiramente fora da área visível, obrigando a rolagem horizontal. O mesmo ocorre em 360x720 (scrollWidth 447 contra clientWidth 345).

Esperado: Conteúdo apresentável sem rolagem horizontal em largura equivalente a 320px CSS, com a barra de recursos quebrando linha ou reduzindo os botões.

Janela: 320×640 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. redimensionar a janela para 360x720 3. redimensionar a janela para 320x640

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

- `V-010 — verify_finding wcag 1.4.10: ruleExists pass, applicability pass, violation no-predicate` → identificador devolvido por ferramenta (sem arquivo)
- `overflow-320.png — captura com barra de rolagem horizontal e o botão VLibras cortado` → identificador devolvido por ferramenta (sem arquivo)
- `Medição no navegador: scrollWidth 447, clientWidth 305, getBoundingClientRect de .barra-recursos {left:93, right:447} e de .recurso-libras {left:305, right:447}` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".recurso-libras"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com a janela em 320x640, a barra de recursos (display:flex, flex-wrap:nowrap, gap 16px) ocupa de x=93 a x=447 enquanto o documento tem clientWidth 305; document.documentElement.scrollWidth é 447 contra clientWidth 305 e o botão 'VLibras' começa em x=305, inteiramente fora da área visível, obrigando a rolagem horizontal. O mesmo ocorre em 360x720 (scrollWidth 447 contra clientWidth 345).",
    "expected": "Conteúdo apresentável sem rolagem horizontal em largura equivalente a 320px CSS, com a barra de recursos quebrando linha ou reduzindo os botões.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 640
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "redimensionar a janela para 360x720",
        "redimensionar a janela para 320x640"
      ]
    },
    "evidence": [
      "V-010 — verify_finding wcag 1.4.10: ruleExists pass, applicability pass, violation no-predicate",
      "overflow-320.png — captura com barra de rolagem horizontal e o botão VLibras cortado",
      "Medição no navegador: scrollWidth 447, clientWidth 305, getBoundingClientRect de .barra-recursos {left:93, right:447} e de .recurso-libras {left:305, right:447}"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-3093602c18447cab904649a9f7d7ef133cc1bf5578c10aae837125729542474e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-323513c449beb5a8b088589ce0d46fcc141d36964019c9522d37a8e077205e0d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Com viewport de 320px de largura, .barra-recursos tem display flex com flex-wrap 'nowrap' e largura de 353px dentro de um header de 320px; a borda direita chega a 447px contra clientWidth de 305px, e documentElement.scrollWidth passa a 447px, exigindo rolagem horizontal da página inteira (o botão 'VLibras' fica fora da área visível).

Esperado: Em largura equivalente a 320px CSS o conteúdo deve fluir sem exigir rolagem em duas dimensões; a barra de recursos do cabeçalho deve quebrar linha ou reduzir para caber na viewport.

Janela: 320×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. redimensionar a janela para 320x900 3. medir scrollWidth/clientWidth e os retângulos dos elementos que ultrapassam a viewport 4. capturar screenshot de página inteira

Regra declarada: wcag:1.4.10

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

Sinalizações: altura-diferente: 320x900 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `reflow-320.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/reflow-320.png` (sha256 b50281fe2b30)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      "header.barra-superior",
      ".recurso-libras"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com viewport de 320px de largura, .barra-recursos tem display flex com flex-wrap 'nowrap' e largura de 353px dentro de um header de 320px; a borda direita chega a 447px contra clientWidth de 305px, e documentElement.scrollWidth passa a 447px, exigindo rolagem horizontal da página inteira (o botão 'VLibras' fica fora da área visível).",
    "expected": "Em largura equivalente a 320px CSS o conteúdo deve fluir sem exigir rolagem em duas dimensões; a barra de recursos do cabeçalho deve quebrar linha ou reduzir para caber na viewport.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "redimensionar a janela para 320x900",
        "medir scrollWidth/clientWidth e os retângulos dos elementos que ultrapassam a viewport",
        "capturar screenshot de página inteira"
      ]
    },
    "evidence": [
      "reflow-320.png"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação, links de ajuda e termo; estados: carregamento inicial, erro de CPF vazio, CPF inválido ('123'), CPF válido ('52998224725'), viewport 320px"
  ],
  "notes": "Oráculo de regras e scan_page indisponíveis nesta execução (nenhuma ferramenta de regras/varredura exposta); portanto não há ids de regra do oráculo e as atribuições usam apenas WCAG 2.2 e eMAG 3.1 que consigo justificar. Interações executadas: snapshot da árvore de acessibilidade; tabulação completa com Tab/Shift+Tab pelas 11 paradas, registrando estilos computados em focusin (foco real de teclado, :focus-visible confirmado); envio do formulário com campo vazio (erro exibido), com '123' e com '52998224725'; clique em 'Alto Contraste'; redimensionamento para 320x900 e volta para 1280x900; verificação de contraste por luminância relativa em todos os pares texto/fundo; conferência de todos os seletores com querySelectorAll no estado final. Limitações: (a) o botão 'Alto Contraste' não altera classe, atributo nem estilo computado algum e 'VLibras' não expõe estado — são stubs inertes no protótipo, sem estado a avaliar, por isso não gerei achado; (b) o envio com CPF inválido ('123') apenas remove a mensagem de erro, sem validar, sem navegar e sem qualquer retorno ao usuário — comportamento de protótipo cujo defeito não consigo atribuir a uma referência normativa, registrado como incerto e não reportado; (c) não avaliei estados posteriores do fluxo porque nenhum envio produz transição de tela; (d) único erro de console é 404 de /favicon.ico, irrelevante para conformidade; (e) ausência de aria-invalid no campo em erro foi considerada e rejeitada como achado por ser prática recomendada, não exigência normativa que eu possa fundamentar."
}
````

### Decisão

````json
{
  "cardId": "C-323513c449beb5a8b088589ce0d46fcc141d36964019c9522d37a8e077205e0d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-34894a6a7809b577a6711078c7435254e345ddc8d5b3fde6d0ad4d01e6bb18c6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Com a janela em 320x800 (clientWidth 305 CSS px), .barra-recursos tem display:flex e flex-wrap:nowrap sem nenhuma media query, ocupando 353.4px de largura (left 93.3, right 446.7). Isso faz document.scrollWidth valer 447 contra clientWidth 305, gerando barra de rolagem horizontal do documento inteiro, e deixa o botao .recurso-libras ('VLibras') integralmente fora da viewport (left 305.1, right 446.7). Nenhum outro elemento da tela transborda; o conteudo de <main> empilha corretamente.

Esperado: Em 320 CSS px de largura o conteudo deve ser apresentado sem exigir rolagem horizontal, com os controles da barra superior quebrando linha ou colapsando em vez de estourarem a viewport.

Janela: 320×800 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. redimensionar a janela para 320x800

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x800 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `reflow-320.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run3-d1c7fee5-evidencia/reflow-320.png` (sha256 85e3a4e27dd5)
- `document.documentElement: clientWidth 305, scrollWidth 447` → identificador devolvido por ferramenta (sem arquivo)
- `getBoundingClientRect de .recurso-libras: {left: 305.1, right: 446.7, width: 141.6}` → identificador devolvido por ferramenta (sem arquivo)
- `regra CSS '.barra-recursos { align-items: center; gap: 16px; display: flex; }' em /assets/fluxo-BKj2uGAR.css, sem regra correspondente em @media` → não encontrado na evidência preservada da execução

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
    "observed": "Com a janela em 320x800 (clientWidth 305 CSS px), .barra-recursos tem display:flex e flex-wrap:nowrap sem nenhuma media query, ocupando 353.4px de largura (left 93.3, right 446.7). Isso faz document.scrollWidth valer 447 contra clientWidth 305, gerando barra de rolagem horizontal do documento inteiro, e deixa o botao .recurso-libras ('VLibras') integralmente fora da viewport (left 305.1, right 446.7). Nenhum outro elemento da tela transborda; o conteudo de <main> empilha corretamente.",
    "expected": "Em 320 CSS px de largura o conteudo deve ser apresentado sem exigir rolagem horizontal, com os controles da barra superior quebrando linha ou colapsando em vez de estourarem a viewport.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 800
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "redimensionar a janela para 320x800"
      ]
    },
    "evidence": [
      "reflow-320.png",
      "document.documentElement: clientWidth 305, scrollWidth 447",
      "getBoundingClientRect de .recurso-libras: {left: 305.1, right: 446.7, width: 141.6}",
      "regra CSS '.barra-recursos { align-items: center; gap: 16px; display: flex; }' em /assets/fluxo-BKj2uGAR.css, sem regra correspondente em @media"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartao de identificacao (titulo, cabecalho do metodo CPF, formulario CPF, estado de erro do formulario, lista de outras opcoes de identificacao, selo da conta, links de ajuda e termo)"
  ],
  "notes": "Ferramentas disponiveis nesta execucao: apenas navegador (Playwright MCP). Nao havia oraculo de regras nem scan_page, portanto nenhuma varredura heuristica foi executada e nenhum achado pode ser verificado por ferramenta de verificacao; as atribuicoes de regra abaixo sao normativas WCAG 2.2 justificadas na propria observacao, sem ids de design system (nenhum id de ds foi inventado). Interacoes realizadas: carga em 1280x900; snapshot da arvore de acessibilidade; dump do DOM com atributos; calculo de contraste de todos os nos de texto e das bordas de componentes (todos aprovados: menor valor 4.59 no selo .selo-conta e 4.81 na mensagem de erro; borda do input 3.54 e outline de foco 3.16 contra branco, ambos acima de 3:1); submissao do formulario vazio por clique em Continuar e por Enter no campo CPF (mesma mensagem 'Informe um CPF para continuar.', foco permanece no botao ou no campo, sem live region); digitacao de '111' e nova submissao; cliques em 'Alto Contraste' e 'VLibras'; travessia real por Tab pelos 11 focaveis em ordem de DOM, sem armadilha de teclado, comparando estilos computados antes/depois do foco em cada um; redimensionamento para 320x800 e retorno a 1280x900; teste de espacamento de texto 1.4.12 (line-height 1.5, letter-spacing .12em, word-spacing .16em, margin 2em) sem recorte nem sobreposicao. Console limpo exceto 404 de /favicon.ico. Itens deixados explicitamente como INCERTOS, sem achado, por nao haver referencia normativa que eu consiga justificar sem o oraculo: (1) os botoes .recurso-contraste e .recurso-libras nao alteram classe, atributo nem estilo algum ao serem clicados (o realce azul observado e apenas :hover) - controles inertes nesta build, mas nao consigo decidir se e defeito da tela ou limite do mock; (2) submeter '111' limpa a mensagem de erro e nao produz navegacao, mensagem de sucesso ou qualquer outro estado - beco sem saida, sem comportamento esperado conhecido; (3) .lista-opcoes/.br-item usam div com classes de lista do design system mas sem semantica de lista (nenhum role=list); (4) ausencia de link de pular para o conteudo - so ha 3 focaveis antes de <main> e uma unica pagina, entao nao afirmo 2.4.1; (5) o selo .selo-conta ('SUA CONTA SERA PRATA') nao esta programaticamente vinculado ao link 'Login com seu banco', apenas adjacente no DOM. Limitacao de cobertura: nao foi possivel avaliar estados posteriores do fluxo (nenhuma submissao avanca de tela) nem o modo de alto contraste (o botao nao o ativa)."
}
````

### Decisão

````json
{
  "cardId": "C-34894a6a7809b577a6711078c7435254e345ddc8d5b3fde6d0ad4d01e6bb18c6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-361de6ba82dc5cd0ea89600ffdbb9b81da0443e20b125dc9d4a39c2eb428403c

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
  "cardId": "C-361de6ba82dc5cd0ea89600ffdbb9b81da0443e20b125dc9d4a39c2eb428403c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-366a5c42c5bd1a67e52d21ac0b96422e4d78e46e2afbaf41b4e1ca83be311e90

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
  "cardId": "C-366a5c42c5bd1a67e52d21ac0b96422e4d78e46e2afbaf41b4e1ca83be311e90",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3a4b2c0e5747a756a67eaf14cdc104e0d88e806ce72140c6707ba1bf23679327

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
  "cardId": "C-3a4b2c0e5747a756a67eaf14cdc104e0d88e806ce72140c6707ba1bf23679327",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4191886ce8e3e083645c877075abefe79f7a0e6b68f4391e2d63b300d52a6906

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O campo de CPF nao traz instrucao de formato. O rotulo e apenas 'CPF', o texto de apoio anterior diz 'Digite seu CPF para criar ou acessar sua conta gov.br' e a unica pista de preenchimento e o placeholder 'Digite seu CPF', que nao informa formato e desaparece ao digitar. Nao ha nenhum <small>, elemento de dica ou [aria-describedby] na pagina (contagem 0). Na pratica a tela aceita '123' sem qualquer critica.

Esperado: Instrucao de preenchimento visivel junto ao rotulo, antes do campo, indicando o formato esperado do CPF (por exemplo '000.000.000-00, somente numeros'), associada ao campo via aria-describedby e nao apenas como placeholder.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. inspecionar label, placeholder e vizinhanca do campo CPF 3. preencher '123' e clicar em Continuar para checar se ha critica de formato

Regra declarada: govbr-3.7.0-accessibility-global-01b1806c30e9

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `document.querySelectorAll('small, .help, .feedback, [aria-describedby]').length => 0` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML: <label for="cpf">CPF</label><input id="cpf" ... placeholder="Digite seu CPF" aria-required="true">` → não encontrado na evidência preservada da execução
- `submit com value='123' nao produz mensagem: o form volta ao outerHTML sem .mensagem-erro-cpf` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      "label[for=\"cpf\"]",
      ".apoio-metodo"
    ],
    "rule": "govbr-3.7.0-accessibility-global-01b1806c30e9",
    "observed": "O campo de CPF nao traz instrucao de formato. O rotulo e apenas 'CPF', o texto de apoio anterior diz 'Digite seu CPF para criar ou acessar sua conta gov.br' e a unica pista de preenchimento e o placeholder 'Digite seu CPF', que nao informa formato e desaparece ao digitar. Nao ha nenhum <small>, elemento de dica ou [aria-describedby] na pagina (contagem 0). Na pratica a tela aceita '123' sem qualquer critica.",
    "expected": "Instrucao de preenchimento visivel junto ao rotulo, antes do campo, indicando o formato esperado do CPF (por exemplo '000.000.000-00, somente numeros'), associada ao campo via aria-describedby e nao apenas como placeholder.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "inspecionar label, placeholder e vizinhanca do campo CPF",
        "preencher '123' e clicar em Continuar para checar se ha critica de formato"
      ]
    },
    "evidence": [
      "S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "document.querySelectorAll('small, .help, .feedback, [aria-describedby]').length => 0",
      "outerHTML: <label for=\"cpf\">CPF</label><input id=\"cpf\" ... placeholder=\"Digite seu CPF\" aria-required=\"true\">",
      "submit com value='123' nao produz mensagem: o form volta ao outerHTML sem .mensagem-erro-cpf"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-4191886ce8e3e083645c877075abefe79f7a0e6b68f4391e2d63b300d52a6906",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4715af037e7886bbda13c257c48bb9e31bd62ac727c021d197459ec7f3eab6f1

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A mensagem de erro e inserida como '<p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>', sem atributo id, e o campo #cpf permanece sem aria-describedby (valor null), de modo que nenhuma relacao programatica liga a mensagem ao campo que ela descreve.

Esperado: A mensagem deve ter id e ser referenciada por aria-describedby em #cpf (ou equivalente), para que a descricao do erro seja determinavel programaticamente e anunciada ao usuario que foca o campo.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar no botao 'Continuar' com o campo CPF vazio

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-2b97350dd48bdc2e2123c5b7e989f27a09014984d7868d467a4895a12e4dea2d — V-03a · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-invalid, aria-describedby. Medido: ausentes: aria-invalid, aria-describedby | ausentes: aria-invalid, aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-7ecabf109195fc5e6715f764e5ebfe10dd9272a8c70a4f18f29177e5575677f0 — V-02 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `.playwright-mcp/page-2026-09-18T21-06-21-720Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run2-c904c3aa-evidencia/.playwright-mcp/page-2026-09-18T21-06-21-720Z.yml` (sha256 684610f6f02c)
- `DOM do formulario apos submissao vazia: <p class="mensagem-erro-cpf"> sem id; #cpf.getAttribute('aria-describedby') === null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:1.3.1",
    "observed": "A mensagem de erro e inserida como '<p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p>', sem atributo id, e o campo #cpf permanece sem aria-describedby (valor null), de modo que nenhuma relacao programatica liga a mensagem ao campo que ela descreve.",
    "expected": "A mensagem deve ter id e ser referenciada por aria-describedby em #cpf (ou equivalente), para que a descricao do erro seja determinavel programaticamente e anunciada ao usuario que foca o campo.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar no botao 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-18T21-06-21-720Z.yml",
      "DOM do formulario apos submissao vazia: <p class=\"mensagem-erro-cpf\"> sem id; #cpf.getAttribute('aria-describedby') === null"
    ]
  },
  "scope": [
    "tela inteira de identificacao gov.br: cabecalho (marca, Alto Contraste, VLibras), painel institucional e cartao de identificacao (formulario de CPF, outras opcoes de identificacao, ajuda e termo de uso)",
    "estados observados: inicial (1280x900), erro de CPF vazio (1280x900), viewport estreita 320x800"
  ],
  "notes": "Oraculo indisponivel nesta execucao: nao houve scan_page nem consulta de regras/tokens; as regras citadas sao atribuicoes proprias justificadas por WCAG 2.1/2.2 e a evidencia vem de snapshots de acessibilidade, CSSOM, estilos computados, MutationObserver e captura de tela. Interacoes realizadas: carregamento da tela; snapshot da arvore de acessibilidade; tabulacao completa a partir do inicio do documento (11 Tabs) registrando o elemento focado e outline/box-shadow computados; foco programatico comparativo em .link-opcao e .link-ajuda; clique em Continuar com o campo CPF vazio (erro exibido); preenchimento com '123' e submissao; preenchimento com '52998224725' (CPF valido) e submissao; clique em Alto Contraste; clique em VLibras; redimensionamento para 320x800 com captura de tela e medicao de scrollWidth/clientWidth; retorno a 1280x900 e nova reproducao do estado de erro com MutationObserver ativo. Limitacoes e itens deixados como incertos: (a) a tela e estatica - submeter CPF valido ou invalido ('123') nao produz navegacao, mensagem nem qualquer mutacao no DOM, e os botoes Alto Contraste e VLibras nao alteram nada (nenhuma mutacao registrada), portanto a ausencia de validacao de formato do CPF e a inercia desses controles nao foram reportadas como defeitos, por nao ser possivel distinguir falha de conformidade de funcionalidade nao implementada no prototipo; (b) a lista de opcoes usa div.br-list/div.br-item sem role=list/listitem - possivel perda de semantica de lista (WCAG 1.3.1), mantido como incerto por nao haver evidencia de que o componente exija esses papeis e por os links permanecerem alcancaveis e descritos; (c) contrastes medidos passam (texto #555 e #333 sobre branco, #1351B4 sobre branco 7.1:1, branco sobre #1688 21 4.6:1 no selo, mensagem de erro #E60000 sobre branco 4.8:1), sem achado de contraste; (d) unico erro de console e 404 de /favicon.ico, sem relacao com acessibilidade."
}
````

### Decisão

````json
{
  "cardId": "C-4715af037e7886bbda13c257c48bb9e31bd62ac727c021d197459ec7f3eab6f1",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4b4116515c2c9ff8362c501df497c40e15a90fb4bd7db45d2ccf00e75c7e8ff2

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O campo de CPF tem apenas o rótulo 'CPF' e o placeholder 'Digite seu CPF'; não há texto de apoio, <small> ou elemento ligado por aria-describedby indicando o formato esperado (11 dígitos, com ou sem pontuação). Enviar '123' também não gera erro nem avanço, de modo que o formato exigido não é revelado nem pela validação.

Esperado: Instrução de formato visível antes do campo e associada a ele por aria-describedby, conforme exigido para entradas complexas como CPF.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. digitar '123' no campo CPF e clicar em 'Continuar' 3. digitar '11144477735' no campo CPF e pressionar Enter

Regra declarada: emag:6.5

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `V-003 — verify_finding emag-6.5 live=true: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate` → identificador devolvido por ferramenta (sem arquivo)
- `DOM do formulário: <div class="br-input campo-cpf-fluxo"><label for="cpf">CPF</label><input id="cpf" … placeholder="Digite seu CPF" aria-required="true"></div>, sem irmão de instrução` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "rule": "emag:6.5",
    "observed": "O campo de CPF tem apenas o rótulo 'CPF' e o placeholder 'Digite seu CPF'; não há texto de apoio, <small> ou elemento ligado por aria-describedby indicando o formato esperado (11 dígitos, com ou sem pontuação). Enviar '123' também não gera erro nem avanço, de modo que o formato exigido não é revelado nem pela validação.",
    "expected": "Instrução de formato visível antes do campo e associada a ele por aria-describedby, conforme exigido para entradas complexas como CPF.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "digitar '123' no campo CPF e clicar em 'Continuar'",
        "digitar '11144477735' no campo CPF e pressionar Enter"
      ]
    },
    "evidence": [
      "V-003 — verify_finding emag-6.5 live=true: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate",
      "DOM do formulário: <div class=\"br-input campo-cpf-fluxo\"><label for=\"cpf\">CPF</label><input id=\"cpf\" … placeholder=\"Digite seu CPF\" aria-required=\"true\"></div>, sem irmão de instrução"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-4b4116515c2c9ff8362c501df497c40e15a90fb4bd7db45d2ccf00e75c7e8ff2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4ccf679c8c9f814f84ee2e7668e8fc7ef55e1232fe7eb952f6bb43604b968cf0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Os 4 links de outras opcoes de identificacao nao apresentam nenhuma alteracao visual ao receberem foco de teclado. Apos 6 Tab a partir da carga, document.activeElement e o link 'Login com seu banco' com :focus-visible verdadeiro, e outline permanece 'rgb(19, 81, 180) none 2.66667px' e box-shadow 'none' - estilo computado identico ao do estado sem foco (comparacao de outline, outlineWidth, outlineStyle, outlineColor, boxShadow, backgroundColor, color, textDecorationLine, border, filter, transform e opacity nao acusou nenhuma diferenca, e o retangulo do elemento nao muda). A folha da propria tela traz '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }'. Uma varredura de todos os a[href], button e input da pagina mostrou que esses 4 links sao os unicos focaveis sem mudanca de estilo no foco: todos os demais recebem outline 4px dashed rgb(194,133,12) (ou box-shadow equivalente, no caso de #cpf).

Esperado: Todo elemento operavel por teclado deve ter um indicador de foco visivel, como o outline 4px dashed rgb(194,133,12) ja aplicado aos demais focaveis da tela.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab 6 vezes ate o link 'Login com seu banco'

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6f500b010496782197294e0284a8a83c4744f7cfa0108cfb2c093eb3b4075d84 — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-8f4eeb852c5f6370a3955186bb22d852a930b5051882665a546baeebd8374f5f — V-05 · sempre · cena 1280x900 · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-95f7a2df7fb9482cf1c476a27b6e4764440a9c08db3d897dce68a4b7261a6c84 — V-05 · sempre · cena 1280x900 · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-9b33cf49af16046d2de9e4fb977300e60b3a30b07697b1b08c08a47372ad6d9d — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `foco-link-opcao-invisivel.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run3-d1c7fee5-evidencia/foco-link-opcao-invisivel.png` (sha256 909be80eca54)
- `regra CSS '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }' em /assets/fluxo-BKj2uGAR.css` → não encontrado na evidência preservada da execução
- `getComputedStyle antes/depois de focus() nos 4 .link-opcao: nenhuma propriedade alterada` → não encontrado na evidência preservada da execução
- `document.activeElement apos 6 Tab: A.link-opcao 'Login com seu banco', matches(':focus-visible') === true` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [
      ".link-ajuda",
      ".acao-continuar"
    ],
    "rule": "wcag:2.4.7",
    "observed": "Os 4 links de outras opcoes de identificacao nao apresentam nenhuma alteracao visual ao receberem foco de teclado. Apos 6 Tab a partir da carga, document.activeElement e o link 'Login com seu banco' com :focus-visible verdadeiro, e outline permanece 'rgb(19, 81, 180) none 2.66667px' e box-shadow 'none' - estilo computado identico ao do estado sem foco (comparacao de outline, outlineWidth, outlineStyle, outlineColor, boxShadow, backgroundColor, color, textDecorationLine, border, filter, transform e opacity nao acusou nenhuma diferenca, e o retangulo do elemento nao muda). A folha da propria tela traz '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }'. Uma varredura de todos os a[href], button e input da pagina mostrou que esses 4 links sao os unicos focaveis sem mudanca de estilo no foco: todos os demais recebem outline 4px dashed rgb(194,133,12) (ou box-shadow equivalente, no caso de #cpf).",
    "expected": "Todo elemento operavel por teclado deve ter um indicador de foco visivel, como o outline 4px dashed rgb(194,133,12) ja aplicado aos demais focaveis da tela.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab 6 vezes ate o link 'Login com seu banco'"
      ]
    },
    "evidence": [
      "foco-link-opcao-invisivel.png",
      "regra CSS '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }' em /assets/fluxo-BKj2uGAR.css",
      "getComputedStyle antes/depois de focus() nos 4 .link-opcao: nenhuma propriedade alterada",
      "document.activeElement apos 6 Tab: A.link-opcao 'Login com seu banco', matches(':focus-visible') === true"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartao de identificacao (titulo, cabecalho do metodo CPF, formulario CPF, estado de erro do formulario, lista de outras opcoes de identificacao, selo da conta, links de ajuda e termo)"
  ],
  "notes": "Ferramentas disponiveis nesta execucao: apenas navegador (Playwright MCP). Nao havia oraculo de regras nem scan_page, portanto nenhuma varredura heuristica foi executada e nenhum achado pode ser verificado por ferramenta de verificacao; as atribuicoes de regra abaixo sao normativas WCAG 2.2 justificadas na propria observacao, sem ids de design system (nenhum id de ds foi inventado). Interacoes realizadas: carga em 1280x900; snapshot da arvore de acessibilidade; dump do DOM com atributos; calculo de contraste de todos os nos de texto e das bordas de componentes (todos aprovados: menor valor 4.59 no selo .selo-conta e 4.81 na mensagem de erro; borda do input 3.54 e outline de foco 3.16 contra branco, ambos acima de 3:1); submissao do formulario vazio por clique em Continuar e por Enter no campo CPF (mesma mensagem 'Informe um CPF para continuar.', foco permanece no botao ou no campo, sem live region); digitacao de '111' e nova submissao; cliques em 'Alto Contraste' e 'VLibras'; travessia real por Tab pelos 11 focaveis em ordem de DOM, sem armadilha de teclado, comparando estilos computados antes/depois do foco em cada um; redimensionamento para 320x800 e retorno a 1280x900; teste de espacamento de texto 1.4.12 (line-height 1.5, letter-spacing .12em, word-spacing .16em, margin 2em) sem recorte nem sobreposicao. Console limpo exceto 404 de /favicon.ico. Itens deixados explicitamente como INCERTOS, sem achado, por nao haver referencia normativa que eu consiga justificar sem o oraculo: (1) os botoes .recurso-contraste e .recurso-libras nao alteram classe, atributo nem estilo algum ao serem clicados (o realce azul observado e apenas :hover) - controles inertes nesta build, mas nao consigo decidir se e defeito da tela ou limite do mock; (2) submeter '111' limpa a mensagem de erro e nao produz navegacao, mensagem de sucesso ou qualquer outro estado - beco sem saida, sem comportamento esperado conhecido; (3) .lista-opcoes/.br-item usam div com classes de lista do design system mas sem semantica de lista (nenhum role=list); (4) ausencia de link de pular para o conteudo - so ha 3 focaveis antes de <main> e uma unica pagina, entao nao afirmo 2.4.1; (5) o selo .selo-conta ('SUA CONTA SERA PRATA') nao esta programaticamente vinculado ao link 'Login com seu banco', apenas adjacente no DOM. Limitacao de cobertura: nao foi possivel avaliar estados posteriores do fluxo (nenhuma submissao avanca de tela) nem o modo de alto contraste (o botao nao o ativa)."
}
````

### Decisão

````json
{
  "cardId": "C-4ccf679c8c9f814f84ee2e7668e8fc7ef55e1232fe7eb952f6bb43604b968cf0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4d92522266be9eaa4336cb3c8a88757cb829470f781866d33b680c87069c138a

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Apos o clique em 'Continuar' com o campo vazio, o MutationObserver registra apenas a insercao de '+P.mensagem-erro-cpf'; o paragrafo nao tem role="alert" nem aria-live (a pagina inteira tem 0 elementos com [aria-live], [role=alert] ou [role=status]) e o foco permanece no botao .acao-continuar, sem mudanca de contexto ou de foco.

Esperado: A mensagem de status de erro, exibida sem receber foco, deve ser anunciada por tecnologia assistiva - por exemplo com role="alert"/aria-live em uma regiao presente no DOM - ou o foco deve ser movido para o campo em erro.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar no botao 'Continuar' com o campo CPF vazio

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-18T21-06-21-720Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run2-c904c3aa-evidencia/.playwright-mcp/page-2026-09-18T21-06-21-720Z.yml` (sha256 684610f6f02c)
- `MutationObserver: ['+P.mensagem-erro-cpf']; querySelectorAll('[aria-live],[role=alert],[role=status]').length === 0; document.activeElement.className === 'br-button primary acao-continuar'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "rule": "wcag:4.1.3",
    "observed": "Apos o clique em 'Continuar' com o campo vazio, o MutationObserver registra apenas a insercao de '+P.mensagem-erro-cpf'; o paragrafo nao tem role=\"alert\" nem aria-live (a pagina inteira tem 0 elementos com [aria-live], [role=alert] ou [role=status]) e o foco permanece no botao .acao-continuar, sem mudanca de contexto ou de foco.",
    "expected": "A mensagem de status de erro, exibida sem receber foco, deve ser anunciada por tecnologia assistiva - por exemplo com role=\"alert\"/aria-live em uma regiao presente no DOM - ou o foco deve ser movido para o campo em erro.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar no botao 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-18T21-06-21-720Z.yml",
      "MutationObserver: ['+P.mensagem-erro-cpf']; querySelectorAll('[aria-live],[role=alert],[role=status]').length === 0; document.activeElement.className === 'br-button primary acao-continuar'"
    ]
  },
  "scope": [
    "tela inteira de identificacao gov.br: cabecalho (marca, Alto Contraste, VLibras), painel institucional e cartao de identificacao (formulario de CPF, outras opcoes de identificacao, ajuda e termo de uso)",
    "estados observados: inicial (1280x900), erro de CPF vazio (1280x900), viewport estreita 320x800"
  ],
  "notes": "Oraculo indisponivel nesta execucao: nao houve scan_page nem consulta de regras/tokens; as regras citadas sao atribuicoes proprias justificadas por WCAG 2.1/2.2 e a evidencia vem de snapshots de acessibilidade, CSSOM, estilos computados, MutationObserver e captura de tela. Interacoes realizadas: carregamento da tela; snapshot da arvore de acessibilidade; tabulacao completa a partir do inicio do documento (11 Tabs) registrando o elemento focado e outline/box-shadow computados; foco programatico comparativo em .link-opcao e .link-ajuda; clique em Continuar com o campo CPF vazio (erro exibido); preenchimento com '123' e submissao; preenchimento com '52998224725' (CPF valido) e submissao; clique em Alto Contraste; clique em VLibras; redimensionamento para 320x800 com captura de tela e medicao de scrollWidth/clientWidth; retorno a 1280x900 e nova reproducao do estado de erro com MutationObserver ativo. Limitacoes e itens deixados como incertos: (a) a tela e estatica - submeter CPF valido ou invalido ('123') nao produz navegacao, mensagem nem qualquer mutacao no DOM, e os botoes Alto Contraste e VLibras nao alteram nada (nenhuma mutacao registrada), portanto a ausencia de validacao de formato do CPF e a inercia desses controles nao foram reportadas como defeitos, por nao ser possivel distinguir falha de conformidade de funcionalidade nao implementada no prototipo; (b) a lista de opcoes usa div.br-list/div.br-item sem role=list/listitem - possivel perda de semantica de lista (WCAG 1.3.1), mantido como incerto por nao haver evidencia de que o componente exija esses papeis e por os links permanecerem alcancaveis e descritos; (c) contrastes medidos passam (texto #555 e #333 sobre branco, #1351B4 sobre branco 7.1:1, branco sobre #1688 21 4.6:1 no selo, mensagem de erro #E60000 sobre branco 4.8:1), sem achado de contraste; (d) unico erro de console e 404 de /favicon.ico, sem relacao com acessibilidade."
}
````

### Decisão

````json
{
  "cardId": "C-4d92522266be9eaa4336cb3c8a88757cb829470f781866d33b680c87069c138a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5023c3e77b0a8886f8846f44df2a9dc4a0130da2444985e0427eef153fcb7004

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
  "cardId": "C-5023c3e77b0a8886f8846f44df2a9dc4a0130da2444985e0427eef153fcb7004",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-56b05a047418b3853f8786ebffadf932a07f32bf6d770ffe1ef54ccc460692c5

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Ao receber foco por teclado (6o ao 9o Tab a partir do inicio do documento), os quatro links de 'Outras opcoes de identificacao' ficam com outline-style: none e box-shadow: none, por causa da regra '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }' da folha /assets/fluxo-BKj2uGAR.css; nenhuma outra propriedade (cor, fundo, sublinhado) muda no foco.

Esperado: Cada um dos links deve apresentar indicador de foco visivel quando focado pelo teclado, como o 'dashed 4px rgb(194, 133, 12)' que os demais links e botoes da mesma tela (.link-ajuda, .link-termo, .marca-govbr, .acao-continuar) recebem do design system.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab a partir do inicio do documento ate focar 'Login com seu banco' (6o Tab) e seguir ate 'Seu certificado digital em nuvem' (9o Tab)

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6f500b010496782197294e0284a8a83c4744f7cfa0108cfb2c093eb3b4075d84 — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-8f4eeb852c5f6370a3955186bb22d852a930b5051882665a546baeebd8374f5f — V-05 · sempre · cena 1280x900 · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-95f7a2df7fb9482cf1c476a27b6e4764440a9c08db3d897dce68a4b7261a6c84 — V-05 · sempre · cena 1280x900 · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-9b33cf49af16046d2de9e4fb977300e60b3a30b07697b1b08c08a47372ad6d9d — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-18T21-03-14-454Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run2-c904c3aa-evidencia/.playwright-mcp/page-2026-09-18T21-03-14-454Z.yml` (sha256 de2d9596840e)
- `CSSOM /assets/fluxo-BKj2uGAR.css: .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }` → não encontrado na evidência preservada da execução
- `focusin log: .link-opcao -> outline 'none 2.66667px rgb(19, 81, 180)', box-shadow 'none'; .link-ajuda -> outline 'dashed 4px rgb(194, 133, 12)'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [
      ".link-ajuda"
    ],
    "rule": "wcag:2.4.7",
    "observed": "Ao receber foco por teclado (6o ao 9o Tab a partir do inicio do documento), os quatro links de 'Outras opcoes de identificacao' ficam com outline-style: none e box-shadow: none, por causa da regra '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }' da folha /assets/fluxo-BKj2uGAR.css; nenhuma outra propriedade (cor, fundo, sublinhado) muda no foco.",
    "expected": "Cada um dos links deve apresentar indicador de foco visivel quando focado pelo teclado, como o 'dashed 4px rgb(194, 133, 12)' que os demais links e botoes da mesma tela (.link-ajuda, .link-termo, .marca-govbr, .acao-continuar) recebem do design system.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab a partir do inicio do documento ate focar 'Login com seu banco' (6o Tab) e seguir ate 'Seu certificado digital em nuvem' (9o Tab)"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-18T21-03-14-454Z.yml",
      "CSSOM /assets/fluxo-BKj2uGAR.css: .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }",
      "focusin log: .link-opcao -> outline 'none 2.66667px rgb(19, 81, 180)', box-shadow 'none'; .link-ajuda -> outline 'dashed 4px rgb(194, 133, 12)'"
    ]
  },
  "scope": [
    "tela inteira de identificacao gov.br: cabecalho (marca, Alto Contraste, VLibras), painel institucional e cartao de identificacao (formulario de CPF, outras opcoes de identificacao, ajuda e termo de uso)",
    "estados observados: inicial (1280x900), erro de CPF vazio (1280x900), viewport estreita 320x800"
  ],
  "notes": "Oraculo indisponivel nesta execucao: nao houve scan_page nem consulta de regras/tokens; as regras citadas sao atribuicoes proprias justificadas por WCAG 2.1/2.2 e a evidencia vem de snapshots de acessibilidade, CSSOM, estilos computados, MutationObserver e captura de tela. Interacoes realizadas: carregamento da tela; snapshot da arvore de acessibilidade; tabulacao completa a partir do inicio do documento (11 Tabs) registrando o elemento focado e outline/box-shadow computados; foco programatico comparativo em .link-opcao e .link-ajuda; clique em Continuar com o campo CPF vazio (erro exibido); preenchimento com '123' e submissao; preenchimento com '52998224725' (CPF valido) e submissao; clique em Alto Contraste; clique em VLibras; redimensionamento para 320x800 com captura de tela e medicao de scrollWidth/clientWidth; retorno a 1280x900 e nova reproducao do estado de erro com MutationObserver ativo. Limitacoes e itens deixados como incertos: (a) a tela e estatica - submeter CPF valido ou invalido ('123') nao produz navegacao, mensagem nem qualquer mutacao no DOM, e os botoes Alto Contraste e VLibras nao alteram nada (nenhuma mutacao registrada), portanto a ausencia de validacao de formato do CPF e a inercia desses controles nao foram reportadas como defeitos, por nao ser possivel distinguir falha de conformidade de funcionalidade nao implementada no prototipo; (b) a lista de opcoes usa div.br-list/div.br-item sem role=list/listitem - possivel perda de semantica de lista (WCAG 1.3.1), mantido como incerto por nao haver evidencia de que o componente exija esses papeis e por os links permanecerem alcancaveis e descritos; (c) contrastes medidos passam (texto #555 e #333 sobre branco, #1351B4 sobre branco 7.1:1, branco sobre #1688 21 4.6:1 no selo, mensagem de erro #E60000 sobre branco 4.8:1), sem achado de contraste; (d) unico erro de console e 404 de /favicon.ico, sem relacao com acessibilidade."
}
````

### Decisão

````json
{
  "cardId": "C-56b05a047418b3853f8786ebffadf932a07f32bf6d770ffe1ef54ccc460692c5",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6391746de406fc0c467bbe454a4d99ac7dcabf11526c2ea3a384ab70ad374446

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
  "cardId": "C-6391746de406fc0c467bbe454a4d99ac7dcabf11526c2ea3a384ab70ad374446",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-690388d34e47db6af4614e63afc0c510a8f316629b3910f98d9912a96ca54996

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: border-color computado rgb(222, 226, 230) (#dee2e6) nos três elementos, vindo da variável --tela-borda declarada em :root no CSS da tela; o valor não consta do registro de tokens do DS.

Esperado: Cor pertencente ao registro de tokens do gov.br DS; o token mais próximo é --gray-cool-10 (#dfe1e2), a uma distância RGB de 4,24.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(1)" — <section> "Uma conta gov.br garante a identificação de cada"
- "body>div>main>section:nth-of-type(2)" — <section> "Identifique-se no gov.br com: Número do CPF Digi"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-0a51328ca40e840ea532a43e8ed968dab775783238f2a112d4e28f4bcc3d997e — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-493a4235788645600a690fb4fa55c227e2b65125d54527e82ab9467945ce4557 — V-06 · sempre · cena 1280x900 · <section> "Identifique-se no gov.br com: Número do CPF Digi": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-85f3bc1896bc84e70cb26c2500193ce3f39716396e9a20283300fb13d1557486 — V-04 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-d6920a39349d56f3b6ed7006e648c72e86f2931d89edb1d0e19bbc8abfa36cce — V-06 · sempre · cena 1280x900 · <section> "Uma conta gov.br garante a identificação de cada": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-001 (scan S-page-001) e F-022/F-023 (scan S-page-003) — ds-token-color, severidade moderate, confiança 1` → não encontrado na evidência preservada da execução
- `V-006 — verify_finding ds-token-color live=true: verdict confirmed, predicado token-color, violação recalculada em 3 de 3 elementos` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".painel-institucional, .cartao-identificacao, .lista-opcoes",
    "rule": "ds-token-color",
    "observed": "border-color computado rgb(222, 226, 230) (#dee2e6) nos três elementos, vindo da variável --tela-borda declarada em :root no CSS da tela; o valor não consta do registro de tokens do DS.",
    "expected": "Cor pertencente ao registro de tokens do gov.br DS; o token mais próximo é --gray-cool-10 (#dfe1e2), a uma distância RGB de 4,24.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "F-001 (scan S-page-001) e F-022/F-023 (scan S-page-003) — ds-token-color, severidade moderate, confiança 1",
      "V-006 — verify_finding ds-token-color live=true: verdict confirmed, predicado token-color, violação recalculada em 3 de 3 elementos"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-690388d34e47db6af4614e63afc0c510a8f316629b3910f98d9912a96ca54996",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6b481b3d0d7c441567524a255bbdd1891e4c387a4918297205262838de5483db

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O CSS da tela aplica '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }'. Com o link 'Login com seu banco' focado por Tab (element.matches(':focus-visible') === true), o estilo computado permanece outline-style 'none' e box-shadow 'none', idêntico ao estado não focado — nenhum dos quatro links da lista de opções mostra indicador de foco.

Esperado: Indicador de foco visível quando o controle recebe foco por teclado, como o anel 'dashed 4px rgb(194, 133, 12)' que os demais controles da mesma tela (marca gov.br, botões br-button, link de ajuda e link do termo) exibem.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab seis vezes, até o foco chegar ao link 'Login com seu banco'

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6f500b010496782197294e0284a8a83c4744f7cfa0108cfb2c093eb3b4075d84 — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-8f4eeb852c5f6370a3955186bb22d852a930b5051882665a546baeebd8374f5f — V-05 · sempre · cena 1280x900 · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-95f7a2df7fb9482cf1c476a27b6e4764440a9c08db3d897dce68a4b7261a6c84 — V-05 · sempre · cena 1280x900 · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-9b33cf49af16046d2de9e4fb977300e60b3a30b07697b1b08c08a47372ad6d9d — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `V-001 — verify_finding wcag 2.4.7 live=true: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate, localizador resolveu 4 elementos` → identificador devolvido por ferramenta (sem arquivo)
- `foco-link-opcao.png — captura com o link focado e sem qualquer indicação visual` → identificador devolvido por ferramenta (sem arquivo)
- `getComputedStyle do activeElement: outline 'none 2.66667px rgb(19, 81, 180)', boxShadow 'none', matches(':focus-visible') true` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "rule": "wcag:2.4.7",
    "observed": "O CSS da tela aplica '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }'. Com o link 'Login com seu banco' focado por Tab (element.matches(':focus-visible') === true), o estilo computado permanece outline-style 'none' e box-shadow 'none', idêntico ao estado não focado — nenhum dos quatro links da lista de opções mostra indicador de foco.",
    "expected": "Indicador de foco visível quando o controle recebe foco por teclado, como o anel 'dashed 4px rgb(194, 133, 12)' que os demais controles da mesma tela (marca gov.br, botões br-button, link de ajuda e link do termo) exibem.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab seis vezes, até o foco chegar ao link 'Login com seu banco'"
      ]
    },
    "evidence": [
      "V-001 — verify_finding wcag 2.4.7 live=true: ruleExists pass, applicability pass, evidenceConsistent pass, violation no-predicate, localizador resolveu 4 elementos",
      "foco-link-opcao.png — captura com o link focado e sem qualquer indicação visual",
      "getComputedStyle do activeElement: outline 'none 2.66667px rgb(19, 81, 180)', boxShadow 'none', matches(':focus-visible') true"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-6b481b3d0d7c441567524a255bbdd1891e4c387a4918297205262838de5483db",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6c22473cc1c077b4c6ba3b749c47fc4a2c7d90b70d4dc740bf47e1c33a1c3a37

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O campo de CPF nao traz instrucao de formato em lugar nenhum: o rotulo e apenas 'CPF', o texto de apoio anterior e 'Digite seu CPF para criar ou acessar sua conta gov.br' e a unica pista de preenchimento e o placeholder 'Digite seu CPF', que desaparece ao digitar. Nao ha <small>, hint nem aria-describedby, e o campo aceita tanto '111.444.777-35' quanto '123' sem esclarecer quantidade de digitos ou uso de pontuacao.

Esperado: Instrucao de formato visivel antes do campo (por exemplo 'Digite os 11 digitos, somente numeros'), ligada ao campo por aria-describedby, e nao apenas como placeholder, conforme e-MAG 6.5 para entradas complexas como CPF.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. inspecionar atributos e texto de apoio de #cpf 3. digitar '111.444.777-35' e enviar 4. digitar '123' e enviar

Regra declarada: emag:6.5

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `emag-6.5 via get_emag_rules(section=6)` → identificador devolvido por ferramenta (sem arquivo)
- `.playwright-mcp/page-2026-09-18T20-48-26-776Z.yml` → `pipeline/logs/2026-09-18T17-47-14-com-run1-e4e67d13-evidencia/.playwright-mcp/page-2026-09-18T20-48-26-776Z.yml` (sha256 de2d9596840e)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".apoio-metodo"
    ],
    "rule": "emag:6.5",
    "observed": "O campo de CPF nao traz instrucao de formato em lugar nenhum: o rotulo e apenas 'CPF', o texto de apoio anterior e 'Digite seu CPF para criar ou acessar sua conta gov.br' e a unica pista de preenchimento e o placeholder 'Digite seu CPF', que desaparece ao digitar. Nao ha <small>, hint nem aria-describedby, e o campo aceita tanto '111.444.777-35' quanto '123' sem esclarecer quantidade de digitos ou uso de pontuacao.",
    "expected": "Instrucao de formato visivel antes do campo (por exemplo 'Digite os 11 digitos, somente numeros'), ligada ao campo por aria-describedby, e nao apenas como placeholder, conforme e-MAG 6.5 para entradas complexas como CPF.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "inspecionar atributos e texto de apoio de #cpf",
        "digitar '111.444.777-35' e enviar",
        "digitar '123' e enviar"
      ]
    },
    "evidence": [
      "S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "emag-6.5 via get_emag_rules(section=6)",
      ".playwright-mcp/page-2026-09-18T20-48-26-776Z.yml"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-6c22473cc1c077b4c6ba3b749c47fc4a2c7d90b70d4dc740bf47e1c33a1c3a37",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6d5f559b8461061a8dd17eb2d00e2f18486cccc10c02ea404aced025d814f1d2

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Com a janela em 320x800 (clientWidth 305px) a pagina passa a ter rolagem horizontal: documentElement.scrollWidth = 447 contra clientWidth = 305. A barra .barra-recursos nao quebra linha e mantem 353px de largura, comecando em x=93 e terminando em x=447; o botao .recurso-libras fica inteiramente fora da viewport (left=305, right=447) e so e alcancavel rolando na horizontal.

Esperado: Sem rolagem horizontal a 320px de largura: a barra de acessibilidade deve quebrar linha ou reduzir para manter Alto Contraste e VLibras dentro da viewport.

Janela: 320×800 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. redimensionar a janela para 320x800 3. medir documentElement.scrollWidth/clientWidth e os retangulos de .barra-recursos e .recurso-libras 4. capturar screenshot da viewport

Regra declarada: emag-4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x800 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `fluxo-320px.png (screenshot com a barra de rolagem horizontal e o botao VLibras cortado)` → identificador devolvido por ferramenta (sem arquivo)
- `documentElement.scrollWidth=447, clientWidth=305` → identificador devolvido por ferramenta (sem arquivo)
- `.barra-recursos getBoundingClientRect => left 93, right 447, width 353` → identificador devolvido por ferramenta (sem arquivo)
- `.recurso-libras getBoundingClientRect => left 305, right 447` → identificador devolvido por ferramenta (sem arquivo)
- `controle: em 640x450 (~zoom 200%) scrollWidth=clientWidth=625, sem rolagem horizontal` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".recurso-libras"
    ],
    "rule": "emag-4.3",
    "observed": "Com a janela em 320x800 (clientWidth 305px) a pagina passa a ter rolagem horizontal: documentElement.scrollWidth = 447 contra clientWidth = 305. A barra .barra-recursos nao quebra linha e mantem 353px de largura, comecando em x=93 e terminando em x=447; o botao .recurso-libras fica inteiramente fora da viewport (left=305, right=447) e so e alcancavel rolando na horizontal.",
    "expected": "Sem rolagem horizontal a 320px de largura: a barra de acessibilidade deve quebrar linha ou reduzir para manter Alto Contraste e VLibras dentro da viewport.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 800
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "redimensionar a janela para 320x800",
        "medir documentElement.scrollWidth/clientWidth e os retangulos de .barra-recursos e .recurso-libras",
        "capturar screenshot da viewport"
      ]
    },
    "evidence": [
      "fluxo-320px.png (screenshot com a barra de rolagem horizontal e o botao VLibras cortado)",
      "documentElement.scrollWidth=447, clientWidth=305",
      ".barra-recursos getBoundingClientRect => left 93, right 447, width 353",
      ".recurso-libras getBoundingClientRect => left 305, right 447",
      "controle: em 640x450 (~zoom 200%) scrollWidth=clientWidth=625, sem rolagem horizontal"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-6d5f559b8461061a8dd17eb2d00e2f18486cccc10c02ea404aced025d814f1d2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6fe9cf6687597753fbfa6444b301ea04e3982a5601dff71b698d660aeed73182

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
  "cardId": "C-6fe9cf6687597753fbfa6444b301ea04e3982a5601dff71b698d660aeed73182",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7353781751f263d2c50da23cab6a0031b3485599d1583f58a46c225cfdafe1e4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A classe br-input esta aplicada ao proprio <input id="cpf" class="br-input">, alem de ja estar no contêiner <div class="br-input campo-cpf-fluxo"> que envolve o rotulo e o campo.

Esperado: br-input aplicado somente ao <div> que envolve label e input, conforme a anatomia do componente input no gov.br DS; o <input> nao deve carregar a classe do componente.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-structure-input-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `F-006 / F-012 (ds-structure-input-tag, severity serious, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução
- `S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "ds-structure-input-tag",
    "observed": "A classe br-input esta aplicada ao proprio <input id=\"cpf\" class=\"br-input\">, alem de ja estar no contêiner <div class=\"br-input campo-cpf-fluxo\"> que envolve o rotulo e o campo.",
    "expected": "br-input aplicado somente ao <div> que envolve label e input, conforme a anatomia do componente input no gov.br DS; o <input> nao deve carregar a classe do componente.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "F-006 / F-012 (ds-structure-input-tag, severity serious, confidence 1, pathway deterministic)",
      "S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-7353781751f263d2c50da23cab6a0031b3485599d1583f58a46c225cfdafe1e4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-79e11ff1a7c19f1849b08bd55faa773a62fcc4d8385a27626acb1a3ac85c3844

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Ao enviar o formulario vazio surge <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>, mas #cpf permanece com aria-invalid=null e aria-describedby=null, e o paragrafo nao tem id, role="alert" nem aria-live (document.querySelectorAll('[role=alert],[aria-live],[role=status]') retorna 0 elementos). O foco continua no botao .acao-continuar, de modo que o erro nao e associado nem anunciado a tecnologia assistiva.

Esperado: \#cpf com aria-invalid="true" e aria-describedby apontando para o id da mensagem de erro, e a mensagem exposta em regiao ao vivo (role="alert"/aria-live) ou com o foco movido para o campo invalido, conforme e-MAG 6.6 (a)(b)(c).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar no botao Continuar com o campo CPF vazio

Regra declarada: emag:6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `S-page-002 (stateFingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4)` → identificador devolvido por ferramenta (sem arquivo)
- `V-001 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate)` → identificador devolvido por ferramenta (sem arquivo)
- `emag-6.6 via get_emag_rules(section=6)` → identificador devolvido por ferramenta (sem arquivo)
- `.playwright-mcp/page-2026-09-18T20-49-00-731Z.yml` → `pipeline/logs/2026-09-18T17-47-14-com-run1-e4e67d13-evidencia/.playwright-mcp/page-2026-09-18T20-49-00-731Z.yml` (sha256 684610f6f02c)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "emag:6.6",
    "observed": "Ao enviar o formulario vazio surge <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p>, mas #cpf permanece com aria-invalid=null e aria-describedby=null, e o paragrafo nao tem id, role=\"alert\" nem aria-live (document.querySelectorAll('[role=alert],[aria-live],[role=status]') retorna 0 elementos). O foco continua no botao .acao-continuar, de modo que o erro nao e associado nem anunciado a tecnologia assistiva.",
    "expected": "#cpf com aria-invalid=\"true\" e aria-describedby apontando para o id da mensagem de erro, e a mensagem exposta em regiao ao vivo (role=\"alert\"/aria-live) ou com o foco movido para o campo invalido, conforme e-MAG 6.6 (a)(b)(c).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar no botao Continuar com o campo CPF vazio"
      ]
    },
    "evidence": [
      "S-page-002 (stateFingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4)",
      "V-001 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate)",
      "emag-6.6 via get_emag_rules(section=6)",
      ".playwright-mcp/page-2026-09-18T20-49-00-731Z.yml"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-79e11ff1a7c19f1849b08bd55faa773a62fcc4d8385a27626acb1a3ac85c3844",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7a7542dd4dd4423c9c305d942e80ce409ad0ff595dd265fb2cb67f1dbb0c1916

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botao 'Alto Contraste' da barra de acessibilidade nao produz nenhum efeito ao ser acionado: comparando documentElement.outerHTML antes e depois do clique nao ha diferenca alguma; html e body continuam sem classe ou atributo de tema (html so tem lang=pt-BR, body nao tem atributos), o background computado de body permanece rgb(248,248,248) e o proprio botao nao expoe estado (sem aria-pressed).

Esperado: Acionar o controle deve alternar o modo de alto contraste e refletir o estado no proprio botao; um controle que anuncia a funcao no rotulo nao pode ser inerte. Nao localizei no oraculo uma regra que sustente esta exigencia, por isso rule fica null.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. capturar documentElement.outerHTML 3. clicar em Alto Contraste (mouse e via .click()) 4. recapturar outerHTML, atributos de html/body e background computado

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta

### Sujeitos

- "body>div>header>div>button:nth-of-type(1)" — <button> "Alto Contraste"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `comparacao outerHTML antes/depois => contrasteChanged: false` → não encontrado na evidência preservada da execução
- `[...document.documentElement.attributes] => ['lang=pt-BR']; [...document.body.attributes] => []` → identificador devolvido por ferramenta (sem arquivo)
- `getComputedStyle(document.body).backgroundColor => rgb(248, 248, 248) antes e depois` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML do botao apos o clique: <button class="br-button recurso-contraste" type="button">... sem aria-pressed` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".recurso-contraste",
    "relatedSelectors": [],
    "rule": null,
    "observed": "O botao 'Alto Contraste' da barra de acessibilidade nao produz nenhum efeito ao ser acionado: comparando documentElement.outerHTML antes e depois do clique nao ha diferenca alguma; html e body continuam sem classe ou atributo de tema (html so tem lang=pt-BR, body nao tem atributos), o background computado de body permanece rgb(248,248,248) e o proprio botao nao expoe estado (sem aria-pressed).",
    "expected": "Acionar o controle deve alternar o modo de alto contraste e refletir o estado no proprio botao; um controle que anuncia a funcao no rotulo nao pode ser inerte. Nao localizei no oraculo uma regra que sustente esta exigencia, por isso rule fica null.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "capturar documentElement.outerHTML",
        "clicar em Alto Contraste (mouse e via .click())",
        "recapturar outerHTML, atributos de html/body e background computado"
      ]
    },
    "evidence": [
      "comparacao outerHTML antes/depois => contrasteChanged: false",
      "[...document.documentElement.attributes] => ['lang=pt-BR']; [...document.body.attributes] => []",
      "getComputedStyle(document.body).backgroundColor => rgb(248, 248, 248) antes e depois",
      "outerHTML do botao apos o clique: <button class=\"br-button recurso-contraste\" type=\"button\">... sem aria-pressed"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-7a7542dd4dd4423c9c305d942e80ce409ad0ff595dd265fb2cb67f1dbb0c1916",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7dc67b7c15464c7c92e6414712d72405e0479800565bf721a0e6dc6a6261fb0f

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
  "cardId": "C-7dc67b7c15464c7c92e6414712d72405e0479800565bf721a0e6dc6a6261fb0f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7e07a27cb6ce5686f2427637d8d34a8882aff9234d3c55abe1250449e6ab00f1

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Os 4 itens da lista de opcoes tem padding computado de 13px, valor fora da escala de espacamento do DS. Verificado item a item: ['13px','13px','13px','13px'].

Esperado: Espacamento na escala do DS, em multiplos de 4px (12px ou 16px seriam os passos vizinhos).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. executar scan_page com check tokens/spacing 3. ler o padding computado dos 4 .opcao-identificacao

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0ceb07ddb653f8cb9fc078690580f877f9c920af1c696626700c5f784dc97c60 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-18e34f11569ef33ae87295505711425b5f2b7db9de61c35c6f792699b68fdb2c — V-01 · sempre · cena 1280x900 · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-5f1050f826ead59f54ec7744c5c79bff70b6a54028694b03e2e87161eb5a34bf — V-06 · sempre · cena 1280x900 · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-69e546ff40b7b212fc4d6b2b3cf3873c8ba13022f0993135b0d82027459f3b2e — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
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
- U-ad7de00f96c7c421d72917b032b505a62f2aa89f3cd335725acf24230e2b3351 — V-01 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e46030c2db24cf84b0c41b535a62f53bb350e341f3c4f412c5d2be26bad001c0 — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-002, F-003, F-004, F-005 (scan_page, um por item, pathway deterministic, confidence 1)` → identificador devolvido por ferramenta (sem arquivo)
- `S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `[...document.querySelectorAll('.opcao-identificacao')].map(e=>getComputedStyle(e).padding) => ['13px','13px','13px','13px']` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "relatedSelectors": [],
    "rule": "ds-token-spacing",
    "observed": "Os 4 itens da lista de opcoes tem padding computado de 13px, valor fora da escala de espacamento do DS. Verificado item a item: ['13px','13px','13px','13px'].",
    "expected": "Espacamento na escala do DS, em multiplos de 4px (12px ou 16px seriam os passos vizinhos).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "executar scan_page com check tokens/spacing",
        "ler o padding computado dos 4 .opcao-identificacao"
      ]
    },
    "evidence": [
      "F-002, F-003, F-004, F-005 (scan_page, um por item, pathway deterministic, confidence 1)",
      "S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "[...document.querySelectorAll('.opcao-identificacao')].map(e=>getComputedStyle(e).padding) => ['13px','13px','13px','13px']"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-7e07a27cb6ce5686f2427637d8d34a8882aff9234d3c55abe1250449e6ab00f1",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7fb26903b4b489cd66272f053966ec43f393102f16f02acd729bd233bb5bfbbe

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
  "cardId": "C-7fb26903b4b489cd66272f053966ec43f393102f16f02acd729bd233bb5bfbbe",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-88c9378dd7a2f48aaeb391737dc0b2a9158bb37094b20a40dad6a22463aefaef

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A folha de estilo da pagina declara '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }', que vence em especificidade a regra do DS 'a.focus-visible, a:focus-visible { outline-color: var(--focus); ... }'. Com foco real de teclado no primeiro item (e.matches(':focus-visible') === true), o computed style traz outline-style: none, box-shadow: none, border-width: 0px, text-decoration-line: none e cor inalterada rgb(19,81,180): nenhum indicador visivel. Os quatro links da lista sao atingidos pela mesma regra.

Esperado: Indicador de foco visivel em cada .link-opcao, como o outline tracejado de 4px em var(--focus) #c2850c com offset que a propria pagina aplica a a.marca-govbr sob :focus-visible.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab 6 vezes ate o link 'Login com seu banco' 3. ler getComputedStyle(document.activeElement)

Regra declarada: emag:4.4

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6f500b010496782197294e0284a8a83c4744f7cfa0108cfb2c093eb3b4075d84 — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-8f4eeb852c5f6370a3955186bb22d852a930b5051882665a546baeebd8374f5f — V-05 · sempre · cena 1280x900 · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-95f7a2df7fb9482cf1c476a27b6e4764440a9c08db3d897dce68a4b7261a6c84 — V-05 · sempre · cena 1280x900 · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-9b33cf49af16046d2de9e4fb977300e60b3a30b07697b1b08c08a47372ad6d9d — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `V-002 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate, elements=4)` → identificador devolvido por ferramenta (sem arquivo)
- `emag-4.4 via get_emag_rules(section=4)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "emag:4.4",
    "observed": "A folha de estilo da pagina declara '.link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }', que vence em especificidade a regra do DS 'a.focus-visible, a:focus-visible { outline-color: var(--focus); ... }'. Com foco real de teclado no primeiro item (e.matches(':focus-visible') === true), o computed style traz outline-style: none, box-shadow: none, border-width: 0px, text-decoration-line: none e cor inalterada rgb(19,81,180): nenhum indicador visivel. Os quatro links da lista sao atingidos pela mesma regra.",
    "expected": "Indicador de foco visivel em cada .link-opcao, como o outline tracejado de 4px em var(--focus) #c2850c com offset que a propria pagina aplica a a.marca-govbr sob :focus-visible.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab 6 vezes ate o link 'Login com seu banco'",
        "ler getComputedStyle(document.activeElement)"
      ]
    },
    "evidence": [
      "S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "V-002 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate, elements=4)",
      "emag-4.4 via get_emag_rules(section=4)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-88c9378dd7a2f48aaeb391737dc0b2a9158bb37094b20a40dad6a22463aefaef",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-954f7ac26724be614236bdf30fc3eb9e8e15990907b31dda85c2fd7ca93332a6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A folha de estilo declara .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }. Com o navegador em modalidade de teclado, os 4 links casam :focus-visible e apresentam outline-style: none, box-shadow: none, text-decoration-line: none, background-color: rgba(0,0,0,0) e color inalterado (rgb(19,81,180)): nao ha nenhuma diferenca visual entre o estado focado e o nao focado.

Esperado: Todo elemento focado por teclado deve ter indicacao visual clara. Os demais 7 focaveis da pagina recebem outline rgb(194,133,12) dashed 4px; estes 4 links deveriam manter esse indicador ou um substituto visivel equivalente.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab (coloca o navegador em modalidade de teclado) 3. focar cada .link-opcao e ler :focus-visible e estilo computado 4. enumerar as regras CSS que casam /focus/ nas folhas de estilo

Regra declarada: govbr-3.7.0-accessibility-global-21fbcc2fe37b

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6f500b010496782197294e0284a8a83c4744f7cfa0108cfb2c093eb3b4075d84 — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-8f4eeb852c5f6370a3955186bb22d852a930b5051882665a546baeebd8374f5f — V-05 · sempre · cena 1280x900 · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-95f7a2df7fb9482cf1c476a27b6e4764440a9c08db3d897dce68a4b7261a6c84 — V-05 · sempre · cena 1280x900 · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-9b33cf49af16046d2de9e4fb977300e60b3a30b07697b1b08c08a47372ad6d9d — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `V-001` → identificador devolvido por ferramenta (sem arquivo)
- `CSS: .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }` → identificador devolvido por ferramenta (sem arquivo)
- `getComputedStyle(.link-opcao:focus-visible) => outline: rgb(19,81,180) none 2.66667px; box-shadow: none` → identificador devolvido por ferramenta (sem arquivo)
- `comparacao: .marca-govbr/.recurso-contraste/.recurso-libras/.acao-continuar/.link-ajuda/.link-termo => outline: rgb(194,133,12) dashed 4px` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-accessibility-global-21fbcc2fe37b",
    "observed": "A folha de estilo declara .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }. Com o navegador em modalidade de teclado, os 4 links casam :focus-visible e apresentam outline-style: none, box-shadow: none, text-decoration-line: none, background-color: rgba(0,0,0,0) e color inalterado (rgb(19,81,180)): nao ha nenhuma diferenca visual entre o estado focado e o nao focado.",
    "expected": "Todo elemento focado por teclado deve ter indicacao visual clara. Os demais 7 focaveis da pagina recebem outline rgb(194,133,12) dashed 4px; estes 4 links deveriam manter esse indicador ou um substituto visivel equivalente.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab (coloca o navegador em modalidade de teclado)",
        "focar cada .link-opcao e ler :focus-visible e estilo computado",
        "enumerar as regras CSS que casam /focus/ nas folhas de estilo"
      ]
    },
    "evidence": [
      "V-001",
      "CSS: .link-opcao:focus, .link-opcao:focus-visible { box-shadow: none; outline: none; }",
      "getComputedStyle(.link-opcao:focus-visible) => outline: rgb(19,81,180) none 2.66667px; box-shadow: none",
      "comparacao: .marca-govbr/.recurso-contraste/.recurso-libras/.acao-continuar/.link-ajuda/.link-termo => outline: rgb(194,133,12) dashed 4px"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-954f7ac26724be614236bdf30fc3eb9e8e15990907b31dda85c2fd7ca93332a6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a40a7e985f121b4b7381fc93d95c580928491de72e886a0cb34e450a8b0e2507

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: No estado de erro, com a mensagem 'Informe um CPF para continuar.' visivel, o input nao tem aria-invalid: a lista completa de atributos e id=cpf, class=br-input, inputmode=numeric, placeholder=Digite seu CPF, aria-required=true, type=text, value=.

Esperado: aria-invalid="true" no campo enquanto o erro estiver ativo, removido quando o valor for corrigido (item (c) da recomendacao 6.6).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em Continuar com o campo CPF vazio 3. ler [...document.getElementById('cpf').attributes]

Regra declarada: emag-6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `V-003` → identificador devolvido por ferramenta (sem arquivo)
- `S-page-002 (fingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4)` → identificador devolvido por ferramenta (sem arquivo)
- `[...#cpf.attributes] => ['id=cpf','class=br-input','inputmode=numeric','placeholder=Digite seu CPF','aria-required=true','type=text','value=']` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "emag-6.6",
    "observed": "No estado de erro, com a mensagem 'Informe um CPF para continuar.' visivel, o input nao tem aria-invalid: a lista completa de atributos e id=cpf, class=br-input, inputmode=numeric, placeholder=Digite seu CPF, aria-required=true, type=text, value=.",
    "expected": "aria-invalid=\"true\" no campo enquanto o erro estiver ativo, removido quando o valor for corrigido (item (c) da recomendacao 6.6).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em Continuar com o campo CPF vazio",
        "ler [...document.getElementById('cpf').attributes]"
      ]
    },
    "evidence": [
      "V-003",
      "S-page-002 (fingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4)",
      "[...#cpf.attributes] => ['id=cpf','class=br-input','inputmode=numeric','placeholder=Digite seu CPF','aria-required=true','type=text','value=']"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-a40a7e985f121b4b7381fc93d95c580928491de72e886a0cb34e450a8b0e2507",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a5d9b763ace76b4c2bc14f12d6640f1dae736fdabc95b6cb9026bf01fe2ba087

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Ao submeter o formulario vazio o DOM recebe <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p> como irmao do wrapper .br-input, mas o campo nao ganha aria-describedby (getAttribute retorna null) e a mensagem nao tem id. Os atributos do input permanecem id, class, inputmode, placeholder, aria-required, type, value. Nao existe nenhum [aria-describedby] na pagina.

Esperado: A mensagem de erro deve estar programaticamente associada ao campo que a originou, por exemplo com id na mensagem e aria-describedby no input apontando para ela.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em Continuar com o campo CPF vazio 3. ler os atributos de #cpf e de .mensagem-erro-cpf

Regra declarada: govbr-3.7.0-accessibility-global-cc837bbaf713

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `V-003` → identificador devolvido por ferramenta (sem arquivo)
- `S-page-002 (fingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4)` → identificador devolvido por ferramenta (sem arquivo)
- `#cpf.getAttribute('aria-describedby') => null` → identificador devolvido por ferramenta (sem arquivo)
- `document.querySelectorAll('[aria-describedby]').length => 0` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML do form no estado de erro contendo .mensagem-erro-cpf sem id` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "govbr-3.7.0-accessibility-global-cc837bbaf713",
    "observed": "Ao submeter o formulario vazio o DOM recebe <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p> como irmao do wrapper .br-input, mas o campo nao ganha aria-describedby (getAttribute retorna null) e a mensagem nao tem id. Os atributos do input permanecem id, class, inputmode, placeholder, aria-required, type, value. Nao existe nenhum [aria-describedby] na pagina.",
    "expected": "A mensagem de erro deve estar programaticamente associada ao campo que a originou, por exemplo com id na mensagem e aria-describedby no input apontando para ela.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em Continuar com o campo CPF vazio",
        "ler os atributos de #cpf e de .mensagem-erro-cpf"
      ]
    },
    "evidence": [
      "V-003",
      "S-page-002 (fingerprint sha256:bbbb343cb51382b02b7bd8990b702a9d578a9673150d20d1d54a3478a086fef4)",
      "#cpf.getAttribute('aria-describedby') => null",
      "document.querySelectorAll('[aria-describedby]').length => 0",
      "outerHTML do form no estado de erro contendo .mensagem-erro-cpf sem id"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-a5d9b763ace76b4c2bc14f12d6640f1dae736fdabc95b6cb9026bf01fe2ba087",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-aa6b023ec3817ad14c73dd492cb907e235da2c74cc36dbbc22489b6cfdbedb93

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Não existe nenhuma âncora de salto na página (0 elementos a[href^='#']) e o primeiro elemento focável por teclado é o link da marca .marca-govbr; para alcançar o conteúdo principal o usuário de teclado atravessa obrigatoriamente os 3 controles do cabeçalho (marca, 'Alto Contraste' e 'VLibras'), repetidos em todas as telas do fluxo.

Esperado: A página deve oferecer, como primeiro link, âncora que leve diretamente ao bloco de conteúdo principal, permitindo saltar o cabeçalho repetido.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab a partir do início do documento e registrar a ordem de tabulação 3. consultar a[href^='#'] em todo o documento

Regra declarada: emag:1.5

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>header" — <header> "gov.br Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8d75247c6537260aa78cf1da64001c666887b7ece0eb3d0e3e1799b6bbeaf07c — V-06 · sempre · cena 1280x900 · <header> "gov.br Alto Contraste VLibras": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp\page-2026-09-18T20-55-48-820Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/.playwright-mcp/page-2026-09-18T20-55-48-820Z.yml` (sha256 de2d9596840e)
- `foco-link-opcao.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/foco-link-opcao.png` (sha256 a891e1331b25)

### Evidência declarada

````json
{
  "finding": {
    "selector": "header.barra-superior",
    "relatedSelectors": [
      "main.area-identificacao",
      ".marca-govbr"
    ],
    "rule": "emag:1.5",
    "observed": "Não existe nenhuma âncora de salto na página (0 elementos a[href^='#']) e o primeiro elemento focável por teclado é o link da marca .marca-govbr; para alcançar o conteúdo principal o usuário de teclado atravessa obrigatoriamente os 3 controles do cabeçalho (marca, 'Alto Contraste' e 'VLibras'), repetidos em todas as telas do fluxo.",
    "expected": "A página deve oferecer, como primeiro link, âncora que leve diretamente ao bloco de conteúdo principal, permitindo saltar o cabeçalho repetido.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab a partir do início do documento e registrar a ordem de tabulação",
        "consultar a[href^='#'] em todo o documento"
      ]
    },
    "evidence": [
      ".playwright-mcp\\page-2026-09-18T20-55-48-820Z.yml",
      "foco-link-opcao.png"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação, links de ajuda e termo; estados: carregamento inicial, erro de CPF vazio, CPF inválido ('123'), CPF válido ('52998224725'), viewport 320px"
  ],
  "notes": "Oráculo de regras e scan_page indisponíveis nesta execução (nenhuma ferramenta de regras/varredura exposta); portanto não há ids de regra do oráculo e as atribuições usam apenas WCAG 2.2 e eMAG 3.1 que consigo justificar. Interações executadas: snapshot da árvore de acessibilidade; tabulação completa com Tab/Shift+Tab pelas 11 paradas, registrando estilos computados em focusin (foco real de teclado, :focus-visible confirmado); envio do formulário com campo vazio (erro exibido), com '123' e com '52998224725'; clique em 'Alto Contraste'; redimensionamento para 320x900 e volta para 1280x900; verificação de contraste por luminância relativa em todos os pares texto/fundo; conferência de todos os seletores com querySelectorAll no estado final. Limitações: (a) o botão 'Alto Contraste' não altera classe, atributo nem estilo computado algum e 'VLibras' não expõe estado — são stubs inertes no protótipo, sem estado a avaliar, por isso não gerei achado; (b) o envio com CPF inválido ('123') apenas remove a mensagem de erro, sem validar, sem navegar e sem qualquer retorno ao usuário — comportamento de protótipo cujo defeito não consigo atribuir a uma referência normativa, registrado como incerto e não reportado; (c) não avaliei estados posteriores do fluxo porque nenhum envio produz transição de tela; (d) único erro de console é 404 de /favicon.ico, irrelevante para conformidade; (e) ausência de aria-invalid no campo em erro foi considerada e rejeitada como achado por ser prática recomendada, não exigência normativa que eu possa fundamentar."
}
````

### Decisão

````json
{
  "cardId": "C-aa6b023ec3817ad14c73dd492cb907e235da2c74cc36dbbc22489b6cfdbedb93",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ba4c6d45665531afc60bc1b972911aba8c2354d16719392c48f0b8b65dcef322

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 320x720

Observado: Com a janela em 320x800, document.documentElement.scrollWidth = 447 contra clientWidth = 305, e .barra-recursos (flex sem flex-wrap) junto com o botao .recurso-libras terminam em x = 447; a captura mostra barra de rolagem horizontal no documento e o rotulo 'VLibras' fora da area visivel.

Esperado: A 320 CSS px de largura o conteudo deve caber sem exigir rolagem horizontal do documento: a barra de recursos deve quebrar linha ou reorganizar seus controles.

Janela: 320×800 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. redimensionar a janela para 320x800

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: altura-diferente: 320x800 na cena 320x720

### Sujeitos

- "body>div>header>div" — <div> "Alto Contraste VLibras"

### Unidades candidatas (não são crédito)

- U-8fbb6d761cd306096c1f8605d410f5deacae4ace5bfc306b01f9cde53ec21a25 — V-12 · sempre · cena 320x720 · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `estado-320.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run2-c904c3aa-evidencia/estado-320.png` (sha256 169ce1b752ab)
- `medicao em pagina: {scrollW:447, clientW:305, hScroll:true, overflow:['DIV.barra-recursos right=447','BUTTON.br-button recurso-libras right=447']}` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".barra-recursos",
    "relatedSelectors": [
      ".barra-superior",
      ".recurso-libras"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com a janela em 320x800, document.documentElement.scrollWidth = 447 contra clientWidth = 305, e .barra-recursos (flex sem flex-wrap) junto com o botao .recurso-libras terminam em x = 447; a captura mostra barra de rolagem horizontal no documento e o rotulo 'VLibras' fora da area visivel.",
    "expected": "A 320 CSS px de largura o conteudo deve caber sem exigir rolagem horizontal do documento: a barra de recursos deve quebrar linha ou reorganizar seus controles.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 800
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "redimensionar a janela para 320x800"
      ]
    },
    "evidence": [
      "estado-320.png",
      "medicao em pagina: {scrollW:447, clientW:305, hScroll:true, overflow:['DIV.barra-recursos right=447','BUTTON.br-button recurso-libras right=447']}"
    ]
  },
  "scope": [
    "tela inteira de identificacao gov.br: cabecalho (marca, Alto Contraste, VLibras), painel institucional e cartao de identificacao (formulario de CPF, outras opcoes de identificacao, ajuda e termo de uso)",
    "estados observados: inicial (1280x900), erro de CPF vazio (1280x900), viewport estreita 320x800"
  ],
  "notes": "Oraculo indisponivel nesta execucao: nao houve scan_page nem consulta de regras/tokens; as regras citadas sao atribuicoes proprias justificadas por WCAG 2.1/2.2 e a evidencia vem de snapshots de acessibilidade, CSSOM, estilos computados, MutationObserver e captura de tela. Interacoes realizadas: carregamento da tela; snapshot da arvore de acessibilidade; tabulacao completa a partir do inicio do documento (11 Tabs) registrando o elemento focado e outline/box-shadow computados; foco programatico comparativo em .link-opcao e .link-ajuda; clique em Continuar com o campo CPF vazio (erro exibido); preenchimento com '123' e submissao; preenchimento com '52998224725' (CPF valido) e submissao; clique em Alto Contraste; clique em VLibras; redimensionamento para 320x800 com captura de tela e medicao de scrollWidth/clientWidth; retorno a 1280x900 e nova reproducao do estado de erro com MutationObserver ativo. Limitacoes e itens deixados como incertos: (a) a tela e estatica - submeter CPF valido ou invalido ('123') nao produz navegacao, mensagem nem qualquer mutacao no DOM, e os botoes Alto Contraste e VLibras nao alteram nada (nenhuma mutacao registrada), portanto a ausencia de validacao de formato do CPF e a inercia desses controles nao foram reportadas como defeitos, por nao ser possivel distinguir falha de conformidade de funcionalidade nao implementada no prototipo; (b) a lista de opcoes usa div.br-list/div.br-item sem role=list/listitem - possivel perda de semantica de lista (WCAG 1.3.1), mantido como incerto por nao haver evidencia de que o componente exija esses papeis e por os links permanecerem alcancaveis e descritos; (c) contrastes medidos passam (texto #555 e #333 sobre branco, #1351B4 sobre branco 7.1:1, branco sobre #1688 21 4.6:1 no selo, mensagem de erro #E60000 sobre branco 4.8:1), sem achado de contraste; (d) unico erro de console e 404 de /favicon.ico, sem relacao com acessibilidade."
}
````

### Decisão

````json
{
  "cardId": "C-ba4c6d45665531afc60bc1b972911aba8c2354d16719392c48f0b8b65dcef322",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-be711830cd4a3f2c5216793a079e5285d8fdf2394b8d7b2e4d5762c05579f877

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
  "cardId": "C-be711830cd4a3f2c5216793a079e5285d8fdf2394b8d7b2e4d5762c05579f877",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d55b43e2052fdf5078382ec9f3b59ab526827d52ecd04836f8f220fe3804484a

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: padding computado de 13px nos quatro itens da lista de opções, declarado como '.opcao-identificacao { … padding: 13px; … }' no CSS da tela; 13px está fora da escala de espaçamento do DS.

Esperado: Espaçamento na escala do DS (múltiplos de 4px, base 8px).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0ceb07ddb653f8cb9fc078690580f877f9c920af1c696626700c5f784dc97c60 — V-01 · sempre · cena 1280x900 · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-18e34f11569ef33ae87295505711425b5f2b7db9de61c35c6f792699b68fdb2c — V-01 · sempre · cena 1280x900 · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-5f1050f826ead59f54ec7744c5c79bff70b6a54028694b03e2e87161eb5a34bf — V-06 · sempre · cena 1280x900 · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-69e546ff40b7b212fc4d6b2b3cf3873c8ba13022f0993135b0d82027459f3b2e — V-06 · sempre · cena 1280x900 · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
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
- U-ad7de00f96c7c421d72917b032b505a62f2aa89f3cd335725acf24230e2b3351 — V-01 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em inicial, apos-submit-vazio — alguma propriedade de [padding-top, padding-right, padding-bottom, padding-left] fora de {0px, 4px, 8px, 16px}. Medido: padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px | padding-top=13px, padding-right=13px, padding-bottom=13px, padding-left=13px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e46030c2db24cf84b0c41b535a62f53bb350e341f3c4f412c5d2be26bad001c0 — V-06 · sempre · cena 1280x900 · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: cor-de-borda-pintada sustenta em inicial, apos-submit-vazio — alguma borda PINTADA (largura > 0) na cor {rgb(222, 226, 230)}. Medido: bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | top: rgb(222, 226, 230) em 1px; right: rgb(222, 226, 230) em 1px; bottom: rgb(222, 226, 230) em 1px; left: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px | bottom: rgb(222, 226, 230) em 1px
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-002, F-003, F-004 e F-005 (scan S-page-001) — ds-token-spacing, severidade minor, confiança 1` → identificador devolvido por ferramenta (sem arquivo)
- `V-007 — verify_finding ds-token-spacing live=true: verdict confirmed, predicado token-spacing, violação recalculada em 4 de 4 elementos` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "rule": "ds-token-spacing",
    "observed": "padding computado de 13px nos quatro itens da lista de opções, declarado como '.opcao-identificacao { … padding: 13px; … }' no CSS da tela; 13px está fora da escala de espaçamento do DS.",
    "expected": "Espaçamento na escala do DS (múltiplos de 4px, base 8px).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "F-002, F-003, F-004 e F-005 (scan S-page-001) — ds-token-spacing, severidade minor, confiança 1",
      "V-007 — verify_finding ds-token-spacing live=true: verdict confirmed, predicado token-spacing, violação recalculada em 4 de 4 elementos"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-d55b43e2052fdf5078382ec9f3b59ab526827d52ecd04836f8f220fe3804484a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d7364f0430a1e6de41089925f7c98123e460b4e14ceeb0af7a36c9482afaa854

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Com o erro visivel apos submissao vazia, o campo continua com os atributos id, class, inputmode, placeholder, aria-required e type, sem aria-invalid (getAttribute('aria-invalid') === null) e sem nenhuma alteracao de atributo registrada pelo MutationObserver; a borda permanece rgb(136, 136, 136), igual ao estado valido.

Esperado: Enquanto o valor estiver rejeitado, o estado invalido do campo deve ser exposto programaticamente, com aria-invalid="true" (removido quando o erro deixar de existir).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar no botao 'Continuar' com o campo CPF vazio

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `.playwright-mcp/page-2026-09-18T21-06-21-720Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run2-c904c3aa-evidencia/.playwright-mcp/page-2026-09-18T21-06-21-720Z.yml` (sha256 684610f6f02c)
- `atributos de #cpf apos erro: ['id=cpf','class=br-input','inputmode=numeric','placeholder=Digite seu CPF','aria-required=true','type=text','value='] ; aria-invalid === null ; borderColor 'rgb(136, 136, 136)'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:4.1.2",
    "observed": "Com o erro visivel apos submissao vazia, o campo continua com os atributos id, class, inputmode, placeholder, aria-required e type, sem aria-invalid (getAttribute('aria-invalid') === null) e sem nenhuma alteracao de atributo registrada pelo MutationObserver; a borda permanece rgb(136, 136, 136), igual ao estado valido.",
    "expected": "Enquanto o valor estiver rejeitado, o estado invalido do campo deve ser exposto programaticamente, com aria-invalid=\"true\" (removido quando o erro deixar de existir).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar no botao 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-18T21-06-21-720Z.yml",
      "atributos de #cpf apos erro: ['id=cpf','class=br-input','inputmode=numeric','placeholder=Digite seu CPF','aria-required=true','type=text','value='] ; aria-invalid === null ; borderColor 'rgb(136, 136, 136)'"
    ]
  },
  "scope": [
    "tela inteira de identificacao gov.br: cabecalho (marca, Alto Contraste, VLibras), painel institucional e cartao de identificacao (formulario de CPF, outras opcoes de identificacao, ajuda e termo de uso)",
    "estados observados: inicial (1280x900), erro de CPF vazio (1280x900), viewport estreita 320x800"
  ],
  "notes": "Oraculo indisponivel nesta execucao: nao houve scan_page nem consulta de regras/tokens; as regras citadas sao atribuicoes proprias justificadas por WCAG 2.1/2.2 e a evidencia vem de snapshots de acessibilidade, CSSOM, estilos computados, MutationObserver e captura de tela. Interacoes realizadas: carregamento da tela; snapshot da arvore de acessibilidade; tabulacao completa a partir do inicio do documento (11 Tabs) registrando o elemento focado e outline/box-shadow computados; foco programatico comparativo em .link-opcao e .link-ajuda; clique em Continuar com o campo CPF vazio (erro exibido); preenchimento com '123' e submissao; preenchimento com '52998224725' (CPF valido) e submissao; clique em Alto Contraste; clique em VLibras; redimensionamento para 320x800 com captura de tela e medicao de scrollWidth/clientWidth; retorno a 1280x900 e nova reproducao do estado de erro com MutationObserver ativo. Limitacoes e itens deixados como incertos: (a) a tela e estatica - submeter CPF valido ou invalido ('123') nao produz navegacao, mensagem nem qualquer mutacao no DOM, e os botoes Alto Contraste e VLibras nao alteram nada (nenhuma mutacao registrada), portanto a ausencia de validacao de formato do CPF e a inercia desses controles nao foram reportadas como defeitos, por nao ser possivel distinguir falha de conformidade de funcionalidade nao implementada no prototipo; (b) a lista de opcoes usa div.br-list/div.br-item sem role=list/listitem - possivel perda de semantica de lista (WCAG 1.3.1), mantido como incerto por nao haver evidencia de que o componente exija esses papeis e por os links permanecerem alcancaveis e descritos; (c) contrastes medidos passam (texto #555 e #333 sobre branco, #1351B4 sobre branco 7.1:1, branco sobre #1688 21 4.6:1 no selo, mensagem de erro #E60000 sobre branco 4.8:1), sem achado de contraste; (d) unico erro de console e 404 de /favicon.ico, sem relacao com acessibilidade."
}
````

### Decisão

````json
{
  "cardId": "C-d7364f0430a1e6de41089925f7c98123e460b4e14ceeb0af7a36c9482afaa854",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d7e25381d5da848007a21e7c0292a4086e30f1edec00595bc3e235dd9c5103c8

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
  "cardId": "C-d7e25381d5da848007a21e7c0292a4086e30f1edec00595bc3e235dd9c5103c8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dc74a1adb13d8226ee994bba1d4625b440b09669baa768d7061a88324d6faadc

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: color computado rgb(230, 0, 0) (#e60000) no texto da mensagem de erro, declarado em '.mensagem-erro-cpf { color: rgb(230, 0, 0); … }'; o valor não consta do registro de tokens do DS.

Esperado: Cor pertencente ao registro de tokens do gov.br DS; o token mais próximo é --red-vivid-50 (#e52207), a uma distância RGB de 34,73.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `F-021 (scan S-page-003, estado de erro) — ds-token-color, severidade moderate, confiança 1` → identificador devolvido por ferramenta (sem arquivo)
- `V-008 — verify_finding ds-token-color live=true com actions [click .acao-continuar] e stateFingerprint sha256:bbbb343c…: verdict confirmed, predicado token-color, 1 de 1 elemento` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "rule": "ds-token-color",
    "observed": "color computado rgb(230, 0, 0) (#e60000) no texto da mensagem de erro, declarado em '.mensagem-erro-cpf { color: rgb(230, 0, 0); … }'; o valor não consta do registro de tokens do DS.",
    "expected": "Cor pertencente ao registro de tokens do gov.br DS; o token mais próximo é --red-vivid-50 (#e52207), a uma distância RGB de 34,73.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      "F-021 (scan S-page-003, estado de erro) — ds-token-color, severidade moderate, confiança 1",
      "V-008 — verify_finding ds-token-color live=true com actions [click .acao-continuar] e stateFingerprint sha256:bbbb343c…: verdict confirmed, predicado token-color, 1 de 1 elemento"
    ]
  },
  "scope": [
    "tela inteira de identificação gov.br: barra superior (marca e barra de acessibilidade), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação e rodapé do cartão",
    "estados: carga inicial, estado de erro após submeter o formulário vazio, e viewport reduzido a 320x640"
  ],
  "notes": "Ferramentas: playwright (navigate, snapshot, evaluate, click, type, press_key, resize, screenshot, console_messages) e oráculo govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_design_tokens, get_finding_details, verify_finding). Interações executadas: carregar a página e tirar snapshot da árvore de acessibilidade; submeter o formulário com o campo CPF vazio (surge a mensagem 'Informe um CPF para continuar.'); digitar '123' e submeter (a mensagem some, nada avança); digitar '11144477735' e pressionar Enter (nada avança — a tela não tem etapa seguinte, apesar do nome fluxo.html); percorrer toda a ordem de tabulação com Tab a partir do início do documento, medindo outline/box-shadow computados em cada controle focado; focar programaticamente cada controle para comparar com o estado não focado; clicar em 'Alto Contraste'; redimensionar para 360x720 e 320x640 e medir scrollWidth/clientWidth e as caixas dos elementos. Varreduras: S-page-001 (estado inicial, fingerprint sha256:417014ea…), S-page-002 (estado de erro, fingerprint sha256:bbbb343c…, compareToScanId=S-page-001, sem findings novos) e S-page-003 (mesmo estado de erro, escopo ampliado a body/header/main/section/p/h1/h2/label/hr/i, só tokens, compareToScanId=S-page-002). axe-core 4.12.1 rodou nos dois estados com 36 passes, 0 violações e 0 incompletos; nenhum problema de contraste foi encontrado (a tag branca sobre #168821 fica em ~4,6:1). Candidatos rejeitados: font-family 'Font Awesome 6 Free' nos <i> (F-013..F-020) — Font Awesome é a biblioteca de ícones do próprio DS, não desvio tipográfico; classes fora do vocabulário canônico, font-size 11px/16px fora da escala e br-divider em <hr> — o próprio oráculo registrou os três como observações sem norma; 404 de /favicon.ico no console — não é defeito de conformidade da interface. Candidato incerto, não reportado: os botões 'Alto Contraste' e 'VLibras' não produzem nenhuma mudança de DOM, classe, estilo ou atributo ao serem clicados e não expõem aria-pressed; não consegui sustentar em norma se são controles de alternância quebrados ou apenas não implementados nesta tela estática. Limitações: os achados semânticos (wcag:2.4.7, wcag:1.4.10, emag:1.5, emag:6.5, emag:6.6) foram submetidos a verify_finding com live=true e voltaram 'unverifiable' por 'no-predicate' — em todos, ruleExists e applicability passaram e a evidência foi julgada consistente, e a constatação se apoia na medição direta registrada em evidence; os quatro achados de token/estrutura voltaram 'confirmed' por predicado em todos os elementos do localizador. O fluxo não avança além da etapa de CPF com nenhuma entrada testada, então etapas posteriores (senha, cadastro) não puderam ser avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-dc74a1adb13d8226ee994bba1d4625b440b09669baa768d7061a88324d6faadc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-de9912bcbba63ea4e0c68546efddf8d44ee7dd3804fbb0360c08af3de040f6c6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após envio com o campo vazio surge <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>, mas o input mantém apenas os atributos id, class, inputmode, placeholder, aria-required, type e value: não há aria-describedby nem aria-errormessage apontando para a mensagem, e a mensagem não tem id.

Esperado: A mensagem de erro deve estar programaticamente associada ao campo que a originou (por exemplo aria-describedby no input referenciando o id da mensagem), para que a relação percebida visualmente esteja disponível por software.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio

Regra declarada: wcag:1.3.1

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
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `.playwright-mcp\page-2026-09-18T20-57-35-202Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/.playwright-mcp/page-2026-09-18T20-57-35-202Z.yml` (sha256 684610f6f02c)
- `foco-link-opcao.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/foco-link-opcao.png` (sha256 a891e1331b25)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:1.3.1",
    "observed": "Após envio com o campo vazio surge <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p>, mas o input mantém apenas os atributos id, class, inputmode, placeholder, aria-required, type e value: não há aria-describedby nem aria-errormessage apontando para a mensagem, e a mensagem não tem id.",
    "expected": "A mensagem de erro deve estar programaticamente associada ao campo que a originou (por exemplo aria-describedby no input referenciando o id da mensagem), para que a relação percebida visualmente esteja disponível por software.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio"
      ]
    },
    "evidence": [
      ".playwright-mcp\\page-2026-09-18T20-57-35-202Z.yml",
      "foco-link-opcao.png"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação, links de ajuda e termo; estados: carregamento inicial, erro de CPF vazio, CPF inválido ('123'), CPF válido ('52998224725'), viewport 320px"
  ],
  "notes": "Oráculo de regras e scan_page indisponíveis nesta execução (nenhuma ferramenta de regras/varredura exposta); portanto não há ids de regra do oráculo e as atribuições usam apenas WCAG 2.2 e eMAG 3.1 que consigo justificar. Interações executadas: snapshot da árvore de acessibilidade; tabulação completa com Tab/Shift+Tab pelas 11 paradas, registrando estilos computados em focusin (foco real de teclado, :focus-visible confirmado); envio do formulário com campo vazio (erro exibido), com '123' e com '52998224725'; clique em 'Alto Contraste'; redimensionamento para 320x900 e volta para 1280x900; verificação de contraste por luminância relativa em todos os pares texto/fundo; conferência de todos os seletores com querySelectorAll no estado final. Limitações: (a) o botão 'Alto Contraste' não altera classe, atributo nem estilo computado algum e 'VLibras' não expõe estado — são stubs inertes no protótipo, sem estado a avaliar, por isso não gerei achado; (b) o envio com CPF inválido ('123') apenas remove a mensagem de erro, sem validar, sem navegar e sem qualquer retorno ao usuário — comportamento de protótipo cujo defeito não consigo atribuir a uma referência normativa, registrado como incerto e não reportado; (c) não avaliei estados posteriores do fluxo porque nenhum envio produz transição de tela; (d) único erro de console é 404 de /favicon.ico, irrelevante para conformidade; (e) ausência de aria-invalid no campo em erro foi considerada e rejeitada como achado por ser prática recomendada, não exigência normativa que eu possa fundamentar."
}
````

### Decisão

````json
{
  "cardId": "C-de9912bcbba63ea4e0c68546efddf8d44ee7dd3804fbb0360c08af3de040f6c6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e1bbee4846f791022556aef95ff09a4a6fcf1c2dbf40a4c243e30691cd1e6ed4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: border-color computado rgb(222, 226, 230) (#dee2e6), vindo da custom property --tela-borda declarada em :root, nao corresponde a nenhum token de cor do gov.br DS; o token mais proximo e --gray-cool-10 (#dfe1e2), a distancia RGB 4.24.

Esperado: Valor de cor proveniente do registro de tokens do gov.br DS.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html

Regra declarada: ds-token-color

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `F-001 / F-007 (ds-token-color, severity moderate, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução
- `S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "ds-token-color",
    "observed": "border-color computado rgb(222, 226, 230) (#dee2e6), vindo da custom property --tela-borda declarada em :root, nao corresponde a nenhum token de cor do gov.br DS; o token mais proximo e --gray-cool-10 (#dfe1e2), a distancia RGB 4.24.",
    "expected": "Valor de cor proveniente do registro de tokens do gov.br DS.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html"
      ]
    },
    "evidence": [
      "F-001 / F-007 (ds-token-color, severity moderate, confidence 1, pathway deterministic)",
      "S-page-001 (stateFingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: header .barra-superior (marca gov.br, Alto Contraste, VLibras), main .area-identificacao, section .painel-institucional, section .cartao-identificacao (form CPF, lista de outras opcoes de identificacao, links de ajuda e termo)",
    "estados observados: carga inicial (1280x900); apos submeter o formulario vazio (mensagem de erro visivel); apos submeter com CPF preenchido (erro limpo); viewport reduzida a 320x800"
  ],
  "notes": "Interacoes realizadas: snapshot da arvore de acessibilidade na carga; clique em Continuar com o campo vazio (surge <p class='mensagem-erro-cpf'>); preenchimento de '111.444.777-35' e novo envio (erro some, nenhuma etapa seguinte aparece); preenchimento de '123' e novo envio (aceito sem erro - a validacao so verifica campo nao vazio; registrado como observacao de comportamento, nao como achado, por nao haver norma no oraculo que o sustente); navegacao por Tab do inicio ate .link-opcao com leitura do computed style em :focus-visible; foco programatico em #cpf, .acao-continuar, .recurso-contraste, .marca-govbr, .link-termo; clique em 'Alto Contraste' (nenhuma mudanca de tema, classe, atributo ou cor - controle inerte; por nao alterar estado nao ha estado a expor, entao nao gerou achado de aria-pressed); redimensionamento para 320x800 com medicao de scrollWidth/clientWidth e bounding boxes, e screenshot; retorno a 1280x900. Varreduras do oraculo: S-page-001 (carga, fingerprint sha256:417014ea...) e S-page-002 (apos clique em Continuar, fingerprint sha256:bbbb343c...), ambas com axe/structure/tokens; axe-core 4.12.1 nao retornou violacoes em nenhum dos dois estados (36 passes, 0 incomplete). Limitacoes: (a) os quatro achados e-MAG foram submetidos a verify_finding (V-001..V-004) e voltaram 'unverifiable' com ruleExists=pass e applicability=pass, porque o oraculo nao implementa predicado mecanico para regras e-MAG - a violacao esta sustentada por evidencia direta de DOM, CSSOM, computed style e geometria coletada ao vivo, nao por veredito do oraculo; (b) o achado de 320px foi verificado com live=false porque verify_finding nao reproduz viewport, logo evidenceConsistent ficou 'unknown'; (c) as observacoes 'structure-unknown-classes' e 'token-font-size-off-scale' devolvidas pelo scanner foram explicitamente rejeitadas pelo proprio oraculo como sem norma, e nao viraram achados; (d) a cor #dee2e6 vem da custom property --tela-borda no :root e alcanca tambem .barra-superior e .opcao-identificacao, mas o achado foi mantido em .lista-opcoes, unico elemento que o scanner de tokens inspecionou e reportou; (e) os botoes Alto Contraste e VLibras e todos os links apontam para /fluxo ou nao fazem nada, entao nao ha estados alem dos listados para percorrer; (f) o console registra um 404 de /favicon.ico, sem relacao com as regioes avaliadas."
}
````

### Decisão

````json
{
  "cardId": "C-e1bbee4846f791022556aef95ff09a4a6fcf1c2dbf40a4c243e30691cd1e6ed4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e61ae05729fec621c6f4aaac0d483adf65faa247a17a69779f9dd0e00d85aa7e

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
  "cardId": "C-e61ae05729fec621c6f4aaac0d483adf65faa247a17a69779f9dd0e00d85aa7e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e8d4f80f27a3b0392400450c6e995f4035f6cad057416d3f5e9b80d644a79655

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A mensagem de erro e inserida como <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p>, sem id, sem role e sem aria-live, e o campo nao a referencia: #cpf.getAttribute('aria-describedby') e null e aria-errormessage tambem e null. A pagina inteira nao possui nenhum elemento com aria-live, role=alert ou role=status (document.querySelectorAll('[aria-live],[role=alert],[role=status]').length === 0), e o foco nao se move para a mensagem: permanece no botao Continuar quando o envio e por clique, e em #cpf quando e por Enter. Assim o texto do erro nao e anunciado ao surgir nem exposto ao usuario posicionado no campo.

Esperado: A mensagem de erro deve estar programaticamente ligada ao campo que a originou e ser exposta a tecnologia assistiva, por exemplo dando um id ao paragrafo e referenciando-o em aria-describedby (ou aria-errormessage) de #cpf, e/ou anunciando-o via role="alert".

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. deixar o campo CPF vazio 3. acionar o botao Continuar (e, em repeticao independente, pressionar Enter com o foco em #cpf)

Regra declarada: wcag:3.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-2b97350dd48bdc2e2123c5b7e989f27a09014984d7868d467a4895a12e4dea2d — V-03a · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-invalid, aria-describedby. Medido: ausentes: aria-invalid, aria-describedby | ausentes: aria-invalid, aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-7ecabf109195fc5e6715f764e5ebfe10dd9272a8c70a4f18f29177e5575677f0 — V-02 · sempre · cena 1280x900 · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-submit-vazio — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
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

- `outerHTML do estado de erro: <p class="mensagem-erro-cpf">Informe um CPF para continuar.</p> - unico atributo e class` → não encontrado na evidência preservada da execução
- `#cpf.getAttribute('aria-describedby') === null e getAttribute('aria-errormessage') === null` → identificador devolvido por ferramenta (sem arquivo)
- `document.querySelectorAll('[aria-live],[role=alert],[role=status]').length === 0` → identificador devolvido por ferramenta (sem arquivo)
- `document.activeElement apos submissao por clique: button.br-button.primary.acao-continuar; apos submissao por Enter: input.br-input#cpf` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:3.3.1",
    "observed": "A mensagem de erro e inserida como <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p>, sem id, sem role e sem aria-live, e o campo nao a referencia: #cpf.getAttribute('aria-describedby') e null e aria-errormessage tambem e null. A pagina inteira nao possui nenhum elemento com aria-live, role=alert ou role=status (document.querySelectorAll('[aria-live],[role=alert],[role=status]').length === 0), e o foco nao se move para a mensagem: permanece no botao Continuar quando o envio e por clique, e em #cpf quando e por Enter. Assim o texto do erro nao e anunciado ao surgir nem exposto ao usuario posicionado no campo.",
    "expected": "A mensagem de erro deve estar programaticamente ligada ao campo que a originou e ser exposta a tecnologia assistiva, por exemplo dando um id ao paragrafo e referenciando-o em aria-describedby (ou aria-errormessage) de #cpf, e/ou anunciando-o via role=\"alert\".",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "deixar o campo CPF vazio",
        "acionar o botao Continuar (e, em repeticao independente, pressionar Enter com o foco em #cpf)"
      ]
    },
    "evidence": [
      "outerHTML do estado de erro: <p class=\"mensagem-erro-cpf\">Informe um CPF para continuar.</p> - unico atributo e class",
      "#cpf.getAttribute('aria-describedby') === null e getAttribute('aria-errormessage') === null",
      "document.querySelectorAll('[aria-live],[role=alert],[role=status]').length === 0",
      "document.activeElement apos submissao por clique: button.br-button.primary.acao-continuar; apos submissao por Enter: input.br-input#cpf"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartao de identificacao (titulo, cabecalho do metodo CPF, formulario CPF, estado de erro do formulario, lista de outras opcoes de identificacao, selo da conta, links de ajuda e termo)"
  ],
  "notes": "Ferramentas disponiveis nesta execucao: apenas navegador (Playwright MCP). Nao havia oraculo de regras nem scan_page, portanto nenhuma varredura heuristica foi executada e nenhum achado pode ser verificado por ferramenta de verificacao; as atribuicoes de regra abaixo sao normativas WCAG 2.2 justificadas na propria observacao, sem ids de design system (nenhum id de ds foi inventado). Interacoes realizadas: carga em 1280x900; snapshot da arvore de acessibilidade; dump do DOM com atributos; calculo de contraste de todos os nos de texto e das bordas de componentes (todos aprovados: menor valor 4.59 no selo .selo-conta e 4.81 na mensagem de erro; borda do input 3.54 e outline de foco 3.16 contra branco, ambos acima de 3:1); submissao do formulario vazio por clique em Continuar e por Enter no campo CPF (mesma mensagem 'Informe um CPF para continuar.', foco permanece no botao ou no campo, sem live region); digitacao de '111' e nova submissao; cliques em 'Alto Contraste' e 'VLibras'; travessia real por Tab pelos 11 focaveis em ordem de DOM, sem armadilha de teclado, comparando estilos computados antes/depois do foco em cada um; redimensionamento para 320x800 e retorno a 1280x900; teste de espacamento de texto 1.4.12 (line-height 1.5, letter-spacing .12em, word-spacing .16em, margin 2em) sem recorte nem sobreposicao. Console limpo exceto 404 de /favicon.ico. Itens deixados explicitamente como INCERTOS, sem achado, por nao haver referencia normativa que eu consiga justificar sem o oraculo: (1) os botoes .recurso-contraste e .recurso-libras nao alteram classe, atributo nem estilo algum ao serem clicados (o realce azul observado e apenas :hover) - controles inertes nesta build, mas nao consigo decidir se e defeito da tela ou limite do mock; (2) submeter '111' limpa a mensagem de erro e nao produz navegacao, mensagem de sucesso ou qualquer outro estado - beco sem saida, sem comportamento esperado conhecido; (3) .lista-opcoes/.br-item usam div com classes de lista do design system mas sem semantica de lista (nenhum role=list); (4) ausencia de link de pular para o conteudo - so ha 3 focaveis antes de <main> e uma unica pagina, entao nao afirmo 2.4.1; (5) o selo .selo-conta ('SUA CONTA SERA PRATA') nao esta programaticamente vinculado ao link 'Login com seu banco', apenas adjacente no DOM. Limitacao de cobertura: nao foi possivel avaliar estados posteriores do fluxo (nenhuma submissao avanca de tela) nem o modo de alto contraste (o botao nao o ativa)."
}
````

### Decisão

````json
{
  "cardId": "C-e8d4f80f27a3b0392400450c6e995f4035f6cad057416d3f5e9b80d644a79655",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f19de467cf6e71bf3fef63d34fdab93ce8e2a992833131a1b9b61c3cc511cc7b

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A classe br-input esta aplicada ao proprio <input id="cpf">, alem de ja estar no wrapper <div class="br-input campo-cpf-fluxo"> que contem o label e o campo. Isso duplica o componente e faz o elemento interno herdar regras de container do DS (por exemplo .br-input input:focus, que aplica box-shadow em vez do outline dourado padrao).

Esperado: br-input aplicado apenas ao <div> wrapper; o <input> interno nao deve carregar a classe do componente.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. executar scan_page com check structure sobre o componente input

Regra declarada: ds-structure-input-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

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

- `F-006 / F-012 (scan_page, severidade serious, pathway deterministic)` → não encontrado na evidência preservada da execução
- `S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)` → identificador devolvido por ferramenta (sem arquivo)
- `oraculo: observed 'br-input aplicado a <input>' / expected 'Elemento <div>'` → não encontrado na evidência preservada da execução
- `outerHTML: <div class="br-input campo-cpf-fluxo"><label for="cpf">CPF</label><input id="cpf" class="br-input" ...></div>` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "ds-structure-input-tag",
    "observed": "A classe br-input esta aplicada ao proprio <input id=\"cpf\">, alem de ja estar no wrapper <div class=\"br-input campo-cpf-fluxo\"> que contem o label e o campo. Isso duplica o componente e faz o elemento interno herdar regras de container do DS (por exemplo .br-input input:focus, que aplica box-shadow em vez do outline dourado padrao).",
    "expected": "br-input aplicado apenas ao <div> wrapper; o <input> interno nao deve carregar a classe do componente.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "executar scan_page com check structure sobre o componente input"
      ]
    },
    "evidence": [
      "F-006 / F-012 (scan_page, severidade serious, pathway deterministic)",
      "S-page-001 (fingerprint sha256:417014ead4438cfd441e066b03fd07517be3898024c9a3e1a5b093f0518e7d82)",
      "oraculo: observed 'br-input aplicado a <input>' / expected 'Elemento <div>'",
      "outerHTML: <div class=\"br-input campo-cpf-fluxo\"><label for=\"cpf\">CPF</label><input id=\"cpf\" class=\"br-input\" ...></div>"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: barra superior/barra de acessibilidade, painel institucional, cartao de identificacao (formulario CPF), lista de outras opcoes de identificacao, rodape do cartao",
    "estados observados: carga inicial (1280x900), erro de CPF vazio apos submit, CPF preenchido (11 digitos e 3 digitos), foco de teclado, viewport 640x450 (~zoom 200%) e 320x800"
  ],
  "notes": "Ferramentas: playwright (navegacao, teclado, mouse, avaliacao de DOM/estilo computado, screenshot) e govbr-ds-validator (scan_page, get_ds_rules, get_emag_rules, get_page_rules, get_finding_details, verify_finding). Interacoes executadas: Tab sequencial pelos 11 focaveis; submit do formulario vazio (erro aparece); preenchimento com 11122233344 e submit (erro some, nenhuma etapa seguinte); preenchimento com 123 e submit (nenhum erro, nenhuma etapa seguinte - a unica validacao e a de campo vazio); clique em Alto Contraste e em VLibras; resize para 640x450 e 320x800. Varreduras: S-page-001 (carga inicial, fingerprint 417014ea...) e S-page-002 (apos submit vazio, fingerprint bbbb343c..., comparada a S-page-001 via compareToScanId). axe-core 4.12.1 rodou nos dois estados: 36 passes, 0 violacoes, 0 incomplete. Verificacoes: V-001 (.link-opcao), V-002 (.barra-recursos), V-003 (#cpf) - as tres deram ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate, ou seja, o oraculo confirma que a regra existe e se aplica mas nao decide mecanicamente esta classe de violacao; a constatacao e sustentada pela inspecao ao vivo registrada em cada achado. Candidatos rejeitados, com evidencia: contraste de todos os 16 textos medidos fica entre 4,59:1 (.selo-conta, 11px branco sobre #168821) e 12,63:1, acima do minimo de 4,5:1 - rejeitado; hierarquia de cabecalhos h1 > h2 > h2 sem salto, lang=pt-BR, title preenchido, label[for=cpf] associado ao input, ordem de DOM igual a ordem visual e de tabulacao, nenhum tabindex positivo - conformes; em 640x450 (equivalente a zoom de 200% sobre 1280) nao ha rolagem horizontal, portanto o achado 4.3 se apoia exclusivamente no criterio de 320px do registro e-MAG; classes utilitarias fora do vocabulario canonico (recurso-contraste, acao-continuar, opcao-identificacao, lista-opcoes, selo-conta, campo-cpf-fluxo, divisor-rodape), <hr class=br-divider> e font-size 11px em .selo-conta foram devolvidos pelo oraculo como observacoes explicitamente marcadas NAO HA NORMA / conflito especificacao x semantica, e por isso nao viraram achados; padrao do title segundo e-MAG 3.3 ([topico] - [nome do sitio]) ficou incerto e nao foi afirmado; ausencia de breadcrumb (3.4) considerada nao aplicavel a uma pagina de entrada unica. Limitacoes: o fluxo nao avanca alem da tela de CPF em nenhuma entrada testada, entao etapas posteriores do fluxo nao foram avaliadas; os dois controles inertes da barra de acessibilidade sao defeitos observaveis para os quais nao encontrei regra no oraculo que eu conseguisse justificar, e por isso vao com rule null; nenhuma varredura falhou, expirou ou foi truncada."
}
````

### Decisão

````json
{
  "cardId": "C-f19de467cf6e71bf3fef63d34fdab93ce8e2a992833131a1b9b61c3cc511cc7b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f6415bcd9b2e43d07aeaf915a2150a47f4b12fbcf4d589d99fdb7560941184ea

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Os 4 links de outras opções de identificação recebem foco de teclado (confirmado por Tab e por :focus-visible verdadeiro) com outline-style 'none' (outline computado 'rgb(19, 81, 180) none 2.66667px'), box-shadow 'none', text-decoration 'none' e background inalterado: nenhum indicador visual de foco. Os demais focáveis da tela recebem outline tracejado de 4px rgb(194, 133, 12) com offset de 4px.

Esperado: Todo componente operável por teclado deve ter indicador de foco visível quando recebe foco, como o outline tracejado aplicado aos demais controles da mesma tela.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. pressionar Tab da 1ª à 11ª parada registrando estilos computados no evento focusin 3. pressionar Shift+Tab até 'Seu certificado digital em nuvem' e capturar screenshot

Regra declarada: wcag:2.4.7

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-6f500b010496782197294e0284a8a83c4744f7cfa0108cfb2c093eb3b4075d84 — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-8f4eeb852c5f6370a3955186bb22d852a930b5051882665a546baeebd8374f5f — V-05 · sempre · cena 1280x900 · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-95f7a2df7fb9482cf1c476a27b6e4764440a9c08db3d897dce68a4b7261a6c84 — V-05 · sempre · cena 1280x900 · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-9b33cf49af16046d2de9e4fb977300e60b3a30b07697b1b08c08a47372ad6d9d — V-05 · sempre · cena 1280x900 · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
  - estados em que a unidade existe: inicial, apos-submit-vazio
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `foco-link-opcao.png` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/foco-link-opcao.png` (sha256 a891e1331b25)
- `.playwright-mcp\page-2026-09-18T20-55-48-820Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/.playwright-mcp/page-2026-09-18T20-55-48-820Z.yml` (sha256 de2d9596840e)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [
      ".acao-continuar",
      ".link-ajuda"
    ],
    "rule": "wcag:2.4.7",
    "observed": "Os 4 links de outras opções de identificação recebem foco de teclado (confirmado por Tab e por :focus-visible verdadeiro) com outline-style 'none' (outline computado 'rgb(19, 81, 180) none 2.66667px'), box-shadow 'none', text-decoration 'none' e background inalterado: nenhum indicador visual de foco. Os demais focáveis da tela recebem outline tracejado de 4px rgb(194, 133, 12) com offset de 4px.",
    "expected": "Todo componente operável por teclado deve ter indicador de foco visível quando recebe foco, como o outline tracejado aplicado aos demais controles da mesma tela.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "pressionar Tab da 1ª à 11ª parada registrando estilos computados no evento focusin",
        "pressionar Shift+Tab até 'Seu certificado digital em nuvem' e capturar screenshot"
      ]
    },
    "evidence": [
      "foco-link-opcao.png",
      ".playwright-mcp\\page-2026-09-18T20-55-48-820Z.yml"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação, links de ajuda e termo; estados: carregamento inicial, erro de CPF vazio, CPF inválido ('123'), CPF válido ('52998224725'), viewport 320px"
  ],
  "notes": "Oráculo de regras e scan_page indisponíveis nesta execução (nenhuma ferramenta de regras/varredura exposta); portanto não há ids de regra do oráculo e as atribuições usam apenas WCAG 2.2 e eMAG 3.1 que consigo justificar. Interações executadas: snapshot da árvore de acessibilidade; tabulação completa com Tab/Shift+Tab pelas 11 paradas, registrando estilos computados em focusin (foco real de teclado, :focus-visible confirmado); envio do formulário com campo vazio (erro exibido), com '123' e com '52998224725'; clique em 'Alto Contraste'; redimensionamento para 320x900 e volta para 1280x900; verificação de contraste por luminância relativa em todos os pares texto/fundo; conferência de todos os seletores com querySelectorAll no estado final. Limitações: (a) o botão 'Alto Contraste' não altera classe, atributo nem estilo computado algum e 'VLibras' não expõe estado — são stubs inertes no protótipo, sem estado a avaliar, por isso não gerei achado; (b) o envio com CPF inválido ('123') apenas remove a mensagem de erro, sem validar, sem navegar e sem qualquer retorno ao usuário — comportamento de protótipo cujo defeito não consigo atribuir a uma referência normativa, registrado como incerto e não reportado; (c) não avaliei estados posteriores do fluxo porque nenhum envio produz transição de tela; (d) único erro de console é 404 de /favicon.ico, irrelevante para conformidade; (e) ausência de aria-invalid no campo em erro foi considerada e rejeitada como achado por ser prática recomendada, não exigência normativa que eu possa fundamentar."
}
````

### Decisão

````json
{
  "cardId": "C-f6415bcd9b2e43d07aeaf915a2150a47f4b12fbcf4d589d99fdb7560941184ea",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-fb64273c2e3a4f41d6727260590b4030051947bbe8e817fd49c6870700a5fe03

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A mensagem de erro é inserida no DOM sem role='alert', sem role='status' e sem aria-live (a página inteira tem 0 elementos com essas marcações), e o foco permanece no botão 'Continuar' (document.activeElement continua sendo .acao-continuar após o envio): a mudança não é anunciada por tecnologia assistiva.

Esperado: Mensagem de status/erro que aparece sem receber foco deve ser exposta por região viva (role='alert' ou aria-live) — ou o foco deve ser movido para ela ou para o campo em erro — de modo que seja anunciada sem mudança de contexto.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/fluxo.html 2. clicar em 'Continuar' com o campo CPF vazio 3. consultar document.activeElement e elementos [role=alert],[role=status],[aria-live]

Regra declarada: wcag:4.1.3

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-a4f7d16a2d1b297b25bf5689c2e6ef03b192e709f19bcbefced872bf901d7177 — V-09 · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: estilo-computado sustenta em apos-submit-vazio — alguma propriedade de [color] em {rgb(230, 0, 0)}. Medido: color=rgb(230, 0, 0)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-aaf11a1a916804159b833f3f7a09d0fb84dba5eea673182a8eb76b227587013a — V-03b · apos-submit-vazio · cena 1280x900 · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
  - estados em que a unidade existe: apos-submit-vazio
  - predicado de aceitação: atributos-ausentes sustenta em apos-submit-vazio — nenhum destes atributos presente: role, aria-live. Medido: ausentes: role, aria-live
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp\page-2026-09-18T20-57-35-202Z.yml` → `pipeline/logs/2026-09-18T17-47-14-sem-run1-2c98a15f-evidencia/.playwright-mcp/page-2026-09-18T20-57-35-202Z.yml` (sha256 684610f6f02c)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      ".acao-continuar",
      ".formulario-cpf"
    ],
    "rule": "wcag:4.1.3",
    "observed": "A mensagem de erro é inserida no DOM sem role='alert', sem role='status' e sem aria-live (a página inteira tem 0 elementos com essas marcações), e o foco permanece no botão 'Continuar' (document.activeElement continua sendo .acao-continuar após o envio): a mudança não é anunciada por tecnologia assistiva.",
    "expected": "Mensagem de status/erro que aparece sem receber foco deve ser exposta por região viva (role='alert' ou aria-live) — ou o foco deve ser movido para ela ou para o campo em erro — de modo que seja anunciada sem mudança de contexto.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/fluxo.html",
        "clicar em 'Continuar' com o campo CPF vazio",
        "consultar document.activeElement e elementos [role=alert],[role=status],[aria-live]"
      ]
    },
    "evidence": [
      ".playwright-mcp\\page-2026-09-18T20-57-35-202Z.yml"
    ]
  },
  "scope": [
    "tela inteira de fluxo.html: cabeçalho (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação com formulário de CPF, lista de outras opções de identificação, links de ajuda e termo; estados: carregamento inicial, erro de CPF vazio, CPF inválido ('123'), CPF válido ('52998224725'), viewport 320px"
  ],
  "notes": "Oráculo de regras e scan_page indisponíveis nesta execução (nenhuma ferramenta de regras/varredura exposta); portanto não há ids de regra do oráculo e as atribuições usam apenas WCAG 2.2 e eMAG 3.1 que consigo justificar. Interações executadas: snapshot da árvore de acessibilidade; tabulação completa com Tab/Shift+Tab pelas 11 paradas, registrando estilos computados em focusin (foco real de teclado, :focus-visible confirmado); envio do formulário com campo vazio (erro exibido), com '123' e com '52998224725'; clique em 'Alto Contraste'; redimensionamento para 320x900 e volta para 1280x900; verificação de contraste por luminância relativa em todos os pares texto/fundo; conferência de todos os seletores com querySelectorAll no estado final. Limitações: (a) o botão 'Alto Contraste' não altera classe, atributo nem estilo computado algum e 'VLibras' não expõe estado — são stubs inertes no protótipo, sem estado a avaliar, por isso não gerei achado; (b) o envio com CPF inválido ('123') apenas remove a mensagem de erro, sem validar, sem navegar e sem qualquer retorno ao usuário — comportamento de protótipo cujo defeito não consigo atribuir a uma referência normativa, registrado como incerto e não reportado; (c) não avaliei estados posteriores do fluxo porque nenhum envio produz transição de tela; (d) único erro de console é 404 de /favicon.ico, irrelevante para conformidade; (e) ausência de aria-invalid no campo em erro foi considerada e rejeitada como achado por ser prática recomendada, não exigência normativa que eu possa fundamentar."
}
````

### Decisão

````json
{
  "cardId": "C-fb64273c2e3a4f41d6727260590b4030051947bbe8e817fd49c6870700a5fe03",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````
