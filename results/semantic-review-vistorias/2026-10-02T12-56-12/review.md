# Revisão semântica — pacote fechado

Versão: flow-semantic-1.4.0 · 161 cartões únicos · 161 pendentes

## As três filas

| Fila | Quantidade | O que ela cobra |
|---|---|---|
| **Ativa — desta bateria** | 161 cartão(ões) | **Só esta fecha a bateria.** Enquanto houver um, as métricas são provisórias. |
| Histórica — de outras baterias | 0 | Dívida declarada do projeto. Não cobra nada desta bateria, e não some por isso. |
| Descobertas para a próxima referência | 0 afirmação(ões) | Defeito correto fora do gabarito congelado. Entra na PRÓXIMA versão; não mexe no denominador desta. |

Esforço: 251 sujeitos · 153 cartão(ões) sem evidência verificada · 71 com unidade candidata · estimativa **942 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado. Declare antes de começar — depois de ver os cartões já não é orçamento.

Esta renderização NÃO é cega: 52 cartão(ões) contêm texto que nomeia o braço da execução. Para decidir sem saber o braço, gere com `--cego`.

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

**Este plano navega (D-60):** cada janela tem uma cena por SEGMENTO, capturada na última parada dele (1280x900@inicial = /pnip/portal-mpa/vistorias · 1280x900@detalhe-menu = /pnip/portal-mpa/vistorias/agendar-vistoria/00000000-0000-4000-8a01-000000003046 · 1280x900@modal = /pnip/portal-mpa/vistorias/agendar-vistoria/00000000-0000-4000-8a01-000000003038). Quando o seletor de uma alegação resolve em mais de um segmento, o cartão lista os sujeitos de cada um e a decisão precisa dizer em `"cena"` de qual segmento a alegação fala (pelos passos declarados e pela evidência). Só os sujeitos dessa cena contam; os dos outros segmentos não são alegação.

Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.
Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.
Duplicatas revisadas: no átomo repetido, acrescente duplicateOf: { "cardId": "C-...", "atomId": "..." }. A citação continua avaliada separadamente.

## C-06f833e031ad27d23ec2fca62064ae98077743c8b1b2529783ace9477b20cfe9

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: br-breadcrumb aplicado a <div>

Esperado: Elemento <nav>

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:structure-breadcrumb-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>br-breadcrumb >>> div" — <div> "Home Vistorias Agendar vistoria" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-agendar-vistoria > br-breadcrumb >>> div",
    "rule": "ds:structure-breadcrumb-tag",
    "observed": "br-breadcrumb aplicado a <div>",
    "expected": "Elemento <nav>",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-06f833e031ad27d23ec2fca62064ae98077743c8b1b2529783ace9477b20cfe9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-074ef2b97fd6aa4e4ef6f0ae6b07f8b46bd08fc09dbf9a542820a206ba402b7e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-3fe5e8cc28ad339c48044f5f6514da4499172e643dc7133757f61235be604ffb — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(8) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-074ef2b97fd6aa4e4ef6f0ae6b07f8b46bd08fc09dbf9a542820a206ba402b7e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-08c4fb6a3186af1635afeca26b94fe844f178e06c6929a91a3ae00ae8944840b

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-6c245502c15b87a2a3da34719c7b1d1f47aadd9a7ab7ca55ebbdfa117ae64ba8 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(9) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-08c4fb6a3186af1635afeca26b94fe844f178e06c6929a91a3ae00ae8944840b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0b1ebbd98d7a33b1ef26a25f46886b74a0aa83930b2a11debc09b4f7aaffdd23

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O selo informativo 'Nenhum filtro de data aplicado', ao lado do filtro de data, tem contraste de 1,5:1 (primeiro plano #ffffff sobre fundo #c5d4eb, 14px, peso normal).

Esperado: Texto deve ter contraste minimo de 4,5:1 em relacao ao fundo; a combinacao de texto branco sobre o pastel claro precisa ser substituida por par de cores conforme.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-cb09bc0c77c0

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>span" — <span> "Nenhum filtro de data aplicado"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-223 (axe-core, regra color-contrast, severidade serious, razao medida 1.5)` → não encontrado na evidência preservada da execução
- `DOM: span.br-tag.primary-pastel-01.small com texto 'Nenhum filtro de data aplicado'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "span.br-tag.primary-pastel-01",
    "rule": "govbr-3.7.0-accessibility-global-cb09bc0c77c0",
    "observed": "O selo informativo 'Nenhum filtro de data aplicado', ao lado do filtro de data, tem contraste de 1,5:1 (primeiro plano #ffffff sobre fundo #c5d4eb, 14px, peso normal).",
    "expected": "Texto deve ter contraste minimo de 4,5:1 em relacao ao fundo; a combinacao de texto branco sobre o pastel claro precisa ser substituida por par de cores conforme.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-223 (axe-core, regra color-contrast, severidade serious, razao medida 1.5)",
      "DOM: span.br-tag.primary-pastel-01.small com texto 'Nenhum filtro de data aplicado'"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-0b1ebbd98d7a33b1ef26a25f46886b74a0aa83930b2a11debc09b4f7aaffdd23",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0ca1599d954c3460c74a9d9defe6ccef0333a170f2f8544fb0d10abad14a150e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-0307b9397f820c4ffbf876ccaea7aa7d9ce4580f2b54b683cc87e86fe5edabf4 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(3) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-0ca1599d954c3460c74a9d9defe6ccef0333a170f2f8544fb0d10abad14a150e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0d86f59a6a5cba3257166c04b858a7692ca8bf69f1fdb16fdb96851ea2da50f3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Na aba "Agendar", o botão de ação com ícone "calendar" de cada linha não tem title nem aria-label, enquanto o botão irmão expõe "Excluir vistoria". 10 ocorrências, todas sem nome.

Esperado: O botão deve ter nome acessível descrevendo a ação de agendamento (ex.: title/aria-label "Agendar vistoria").

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar na aba "Agendar"

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:table tbody br-button[icon=\"calendar\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `consulta por ícone na aba Agendar: {"calendar -> (SEM NOME)": 10, "trash -> Excluir vistoria": 10}` → identificador devolvido por ferramenta (sem arquivo)
- `validação de seletor: table tbody br-button[icon="calendar"] = 10, todos sem title e sem aria-label` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody br-button[icon=\"calendar\"]",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "Na aba \"Agendar\", o botão de ação com ícone \"calendar\" de cada linha não tem title nem aria-label, enquanto o botão irmão expõe \"Excluir vistoria\". 10 ocorrências, todas sem nome.",
    "expected": "O botão deve ter nome acessível descrevendo a ação de agendamento (ex.: title/aria-label \"Agendar vistoria\").",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar na aba \"Agendar\""
      ]
    },
    "evidence": [
      "consulta por ícone na aba Agendar: {\"calendar -> (SEM NOME)\": 10, \"trash -> Excluir vistoria\": 10}",
      "validação de seletor: table tbody br-button[icon=\"calendar\"] = 10, todos sem title e sem aria-label"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-0d86f59a6a5cba3257166c04b858a7692ca8bf69f1fdb16fdb96851ea2da50f3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0db7f78b92564ae9264800f681bc9ab89f295051bda40b42c0cacccc75de8ae7

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os quatro itens numerados da paginacao estao em <li> aninhados dentro de outros <li> (<li><li><a class="page">1</a></li></li>), ou seja, <li> cujo pai e um <li> e nao um <ul>/<ol>. A arvore de acessibilidade reflete o aninhamento indevido (listitem dentro de listitem nos nodes e492/e493, e495/e496, e498/e499, e501/e502).

Esperado: Cada <li> deve ser filho direto de um <ul> ou <ol>; os itens de pagina devem ser um unico nivel de <li> sob o <ul> da paginacao, sem aninhamento duplicado.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-1cb2c878824b

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>li" — <li> "1"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(3)>li" — <li> "2"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(4)>li" — <li> "3"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(5)>li" — <li> "4"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-249..F-252 (axe-core, regra listitem, severidade serious, 4 elementos: 'List item does not have a <ul>, <ol> parent element')` → não encontrado na evidência preservada da execução
- `DOM da nav.br-pagination confirmando <li><li><a class='page'>` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".br-pagination li > li",
    "rule": "govbr-3.7.0-accessibility-global-1cb2c878824b",
    "observed": "Os quatro itens numerados da paginacao estao em <li> aninhados dentro de outros <li> (<li><li><a class=\"page\">1</a></li></li>), ou seja, <li> cujo pai e um <li> e nao um <ul>/<ol>. A arvore de acessibilidade reflete o aninhamento indevido (listitem dentro de listitem nos nodes e492/e493, e495/e496, e498/e499, e501/e502).",
    "expected": "Cada <li> deve ser filho direto de um <ul> ou <ol>; os itens de pagina devem ser um unico nivel de <li> sob o <ul> da paginacao, sem aninhamento duplicado.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-249..F-252 (axe-core, regra listitem, severidade serious, 4 elementos: 'List item does not have a <ul>, <ol> parent element')",
      "DOM da nav.br-pagination confirmando <li><li><a class='page'>"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-0db7f78b92564ae9264800f681bc9ab89f295051bda40b42c0cacccc75de8ae7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0ee3321869936663c3e51b22e547de6ee2b23f7f579f61fde37d0a8a57ad6eae

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-47b56f8da889530a10d5db47459e51252e664d92a5cadf585b1a90afb15ed1c1 — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(9) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-0ee3321869936663c3e51b22e547de6ee2b23f7f579f61fde37d0a8a57ad6eae",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0f30441bd064733e3e7b93f31c0e83eb0e614a47896b357adb6988a3f3dda489

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-82a357f4dc0d11ac01d09f3785422081482a834ab5bd069e99d1823aec324264 — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(1) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-0f30441bd064733e3e7b93f31c0e83eb0e614a47896b357adb6988a3f3dda489",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0f59b1cad08ff0bf70ae287ad270498e737b6d2c806e9c37bdb8611b372053cb

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: padding: 0px 6px (fora da escala: 6px, 6px, 6px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>br-breadcrumb >>> div>ul>li:nth-of-type(2)>a" — <a> "Vistorias" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-agendar-vistoria > br-breadcrumb >>> div > ul > li:nth-of-type(2) > a",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 6px (fora da escala: 6px, 6px, 6px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-0f59b1cad08ff0bf70ae287ad270498e737b6d2c806e9c37bdb8611b372053cb",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-10061ade1103f18ea556aaaf8cf7df15d85c0fc35e5f3acb5a33d47727d8026b

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: padding: 0px 6px (fora da escala: 6px, 6px, 6px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>br-breadcrumb >>> div>ul>li:nth-of-type(1)>a" — <a> "Home" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-vistorias > br-breadcrumb >>> div > ul > li:nth-of-type(1) > a",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 6px (fora da escala: 6px, 6px, 6px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-10061ade1103f18ea556aaaf8cf7df15d85c0fc35e5f3acb5a33d47727d8026b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-118ba5104a2904dcd083d17895e6354fe00ad7edf6d11cab7026ba12bd802ccb

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Table header text should not be empty

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:empty-table-header

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(2)" — <th>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "th:nth-child(2)",
    "rule": "axe:empty-table-header",
    "observed": "Table header text should not be empty",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-118ba5104a2904dcd083d17895e6354fe00ad7edf6d11cab7026ba12bd802ccb",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-12d3e903259d5e781d7f7483c37f07f44ec0984c08e38bcb4a15d78366e88a79

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-bc94b709a32b5dc36e82b199cb34b306729bc6a42eada6adcc6c404ae056735d — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(4) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-12d3e903259d5e781d7f7483c37f07f44ec0984c08e38bcb4a15d78366e88a79",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1b5f23df7e9f747316035e2f905e9aa5980e28e3137e11e7ec0e7b74d0a3fdf2

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: Nenhum elemento .br-footer nem web component <br-footer> no documento (DOM claro e shadow roots abertos).

Esperado: Uma Área de Rodapé com o componente Footer (.br-footer ou <br-footer>), como o Template Base exige.

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:page-footer

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Programa Nac"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds:page-footer",
    "observed": "Nenhum elemento .br-footer nem web component <br-footer> no documento (DOM claro e shadow roots abertos).",
    "expected": "Uma Área de Rodapé com o componente Footer (.br-footer ou <br-footer>), como o Template Base exige.",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-1b5f23df7e9f747316035e2f905e9aa5980e28e3137e11e7ec0e7b74d0a3fdf2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1b94495112a7082be9f5fd1342b7add69b459a273182d3fa55215cb3aeb0b630

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A caixa "selecionar todos" no cabeçalho não tem nome acessível (sem aria-label, title ou label); clicá-la marca as 10 caixas de linha, mas a árvore de acessibilidade a expõe apenas como "checkbox" sem nome.

Esperado: A caixa de seleção global deve ter nome acessível descrevendo sua função (ex.: aria-label="Selecionar todas as vistorias da página").

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar na caixa de seleção do cabeçalho da tabela

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `selecao-todos.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/selecao-todos.png` (sha256 73cbcfc3dcec)
- `snapshot a11y ref e115 — columnheader contendo "checkbox" sem nome` → identificador devolvido por ferramenta (sem arquivo)
- `após clique: headerChecked=true e 10/10 caixas de linha marcadas` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "table thead input[type=\"checkbox\"]",
    "relatedSelectors": [
      "table tbody input[type=\"checkbox\"]"
    ],
    "rule": "wcag:4.1.2",
    "observed": "A caixa \"selecionar todos\" no cabeçalho não tem nome acessível (sem aria-label, title ou label); clicá-la marca as 10 caixas de linha, mas a árvore de acessibilidade a expõe apenas como \"checkbox\" sem nome.",
    "expected": "A caixa de seleção global deve ter nome acessível descrevendo sua função (ex.: aria-label=\"Selecionar todas as vistorias da página\").",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar na caixa de seleção do cabeçalho da tabela"
      ]
    },
    "evidence": [
      "selecao-todos.png",
      "snapshot a11y ref e115 — columnheader contendo \"checkbox\" sem nome",
      "após clique: headerChecked=true e 10/10 caixas de linha marcadas"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-1b94495112a7082be9f5fd1342b7add69b459a273182d3fa55215cb3aeb0b630",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1bd2c61eb4ba2439cca332cbe5ad5b3b0a1396392d7186643dded14dbbdb3a52

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(1) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(1) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-1bd2c61eb4ba2439cca332cbe5ad5b3b0a1396392d7186643dded14dbbdb3a52",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1c11c521c97fe31185e1f6d7c8276d2aa60a9c4ad5c3f45519d5aafac224af6d

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-7dbabbfc203702ec5d6e398b0a04a8cc04ee87295ca955abff49ba0d95c4ffd1 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-e3a9d62c1adea42986e20e735443ee7e824a8d1ada3b0c9f2c2320bc0834bce5 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(4) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-1c11c521c97fe31185e1f6d7c8276d2aa60a9c4ad5c3f45519d5aafac224af6d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1ef647e14ac586e947bd076ac268fde8c57c5674da5bfb39aba330fc25863dd7

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-4f081c926e22051c0886a1266c2cedaef9f77dc4fcd663cbe7a2deb4e5217557 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a2a0cc2aaaa329c1ee52c5e557a86f1e37849ffca60ba55cebf674a57ca12786 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(1) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-1ef647e14ac586e947bd076ac268fde8c57c5674da5bfb39aba330fc25863dd7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-20ad56e433f2134e86e88bad27146315da93d331b007c5eaff77441bbb7480ca

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: No shadow root do breadcrumb, o item 'Home' aninha um <button> dentro de um <a>: <a href="/portal-mpa"><button class="br-button small circle" aria-label=""><span class="sr-only">Home</span><i class="fas fa-home"></i></button></a>. A arvore de acessibilidade expoe dois controles encaixados (link 'Home' contendo button 'Home', nodes e34 e e35). O seletor aponta o host, pois o elemento infrator esta no shadow root.

Esperado: Conteudo interativo nao pode conter outro conteudo interativo: o item 'Home' deve ser um unico controle — um <a> com o icone e o texto acessivel, ou um <button> — expondo um unico no na arvore de acessibilidade.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-1cb2c878824b

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>br-breadcrumb" — <br-breadcrumb>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM do shadow root de br-breadcrumb: <a href='/portal-mpa'><button class='br-button small circle' aria-label=''>` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: node e34 link 'Home' contendo node e35 button 'Home'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-breadcrumb",
    "rule": "govbr-3.7.0-accessibility-global-1cb2c878824b",
    "observed": "No shadow root do breadcrumb, o item 'Home' aninha um <button> dentro de um <a>: <a href=\"/portal-mpa\"><button class=\"br-button small circle\" aria-label=\"\"><span class=\"sr-only\">Home</span><i class=\"fas fa-home\"></i></button></a>. A arvore de acessibilidade expoe dois controles encaixados (link 'Home' contendo button 'Home', nodes e34 e e35). O seletor aponta o host, pois o elemento infrator esta no shadow root.",
    "expected": "Conteudo interativo nao pode conter outro conteudo interativo: o item 'Home' deve ser um unico controle — um <a> com o icone e o texto acessivel, ou um <button> — expondo um unico no na arvore de acessibilidade.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "DOM do shadow root de br-breadcrumb: <a href='/portal-mpa'><button class='br-button small circle' aria-label=''>",
      "arvore de acessibilidade: node e34 link 'Home' contendo node e35 button 'Home'"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-20ad56e433f2134e86e88bad27146315da93d331b007c5eaff77441bbb7480ca",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-217311b5f4c07fc084262c08d236698de138733ffce202bed7105b540915c82c

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O botão de ação com ícone "eye" de cada linha não tem title nem aria-label (os botões irmãos têm: "Atribuir vistoriador", "Excluir vistoria", "Notificar solicitante da vistoria"); a árvore de acessibilidade o expõe como button sem nome. Ocorre nas abas Tramitando e Concluídos, 10 por página.

Esperado: O botão deve ter nome acessível descrevendo a ação (ex.: title/aria-label "Visualizar vistoria"), como os demais botões da mesma célula.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y refs e147/e183/e219 — "button [ref=...]" sem nome, ao lado de button "Excluir vistoria"` → não encontrado na evidência preservada da execução
- `outerHTML: <br-button icon="eye" type="secondary"></br-button> sem title` → não encontrado na evidência preservada da execução
- `verificação por aba: Tramitando 10/10 sem nome, Concluídos 10/10 sem nome` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody br-button[icon=\"eye\"]",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "O botão de ação com ícone \"eye\" de cada linha não tem title nem aria-label (os botões irmãos têm: \"Atribuir vistoriador\", \"Excluir vistoria\", \"Notificar solicitante da vistoria\"); a árvore de acessibilidade o expõe como button sem nome. Ocorre nas abas Tramitando e Concluídos, 10 por página.",
    "expected": "O botão deve ter nome acessível descrevendo a ação (ex.: title/aria-label \"Visualizar vistoria\"), como os demais botões da mesma célula.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "snapshot a11y refs e147/e183/e219 — \"button [ref=...]\" sem nome, ao lado de button \"Excluir vistoria\"",
      "outerHTML: <br-button icon=\"eye\" type=\"secondary\"></br-button> sem title",
      "verificação por aba: Tramitando 10/10 sem nome, Concluídos 10/10 sem nome"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-217311b5f4c07fc084262c08d236698de138733ffce202bed7105b540915c82c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-230245421707fb04cdcaa95c61d513087ae1374357969e410939e0d6f42afd0d

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-31b4d9ec28350f49ebccde7fa4125d03c35bef0f8509b31c305a4335353bcd3a — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(4) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-230245421707fb04cdcaa95c61d513087ae1374357969e410939e0d6f42afd0d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-245f62bf96d3c3d77128ad6faaaeb6495c8960a08b30f54338fd2d1378dcbcb0

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: <li> elements must be contained in a <ul> or <ol>

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:listitem

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(4)>li" — <li> "3"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "li:nth-child(4) > li",
    "rule": "axe:listitem",
    "observed": "<li> elements must be contained in a <ul> or <ol>",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-245f62bf96d3c3d77128ad6faaaeb6495c8960a08b30f54338fd2d1378dcbcb0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-246c49188545a82a70ac129dc8bb0a9cb5db4be0c277ba3a06456192f9d5399a

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A etiqueta de estado "Nenhum filtro de data aplicado" é rgb(255,255,255) sobre rgb(197,212,235), 14px peso 500: razão de contraste 1.5:1 — praticamente ilegível.

Esperado: Texto normal precisa de razão de contraste mínima de 4.5:1 com o fundo.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:1.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>span" — <span> "Nenhum filtro de data aplicado"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `cálculo de contraste: fg rgb(255,255,255) / bg rgb(197,212,235) = 1.5:1` → não encontrado na evidência preservada da execução
- `filtro-cidade-aberto.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/filtro-cidade-aberto.png` (sha256 41445e56f6e6)
- `foco-data-fim.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/foco-data-fim.png` (sha256 3c930f035ead)
- `snapshot a11y ref e106` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "span.br-tag.primary-pastel-01",
    "relatedSelectors": [],
    "rule": "wcag:1.4.3",
    "observed": "A etiqueta de estado \"Nenhum filtro de data aplicado\" é rgb(255,255,255) sobre rgb(197,212,235), 14px peso 500: razão de contraste 1.5:1 — praticamente ilegível.",
    "expected": "Texto normal precisa de razão de contraste mínima de 4.5:1 com o fundo.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "cálculo de contraste: fg rgb(255,255,255) / bg rgb(197,212,235) = 1.5:1",
      "filtro-cidade-aberto.png",
      "foco-data-fim.png",
      "snapshot a11y ref e106"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-246c49188545a82a70ac129dc8bb0a9cb5db4be0c277ba3a06456192f9d5399a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-25cd263cc63ad88a2f8ec2f9cc3e84d70a3ac62d71cc0188fbf9f1d1a80d9815

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: padding: 0px 6px (fora da escala: 6px, 6px, 6px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>br-breadcrumb >>> div>ul>li:nth-of-type(2)>a" — <a> "Vistorias" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-agendar-vistoria > br-breadcrumb >>> div > ul > li:nth-of-type(2) > a",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 6px (fora da escala: 6px, 6px, 6px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-25cd263cc63ad88a2f8ec2f9cc3e84d70a3ac62d71cc0188fbf9f1d1a80d9815",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-2737965d1674a1e67421e42746a96714de6e3df112af115b94d68eea892da05e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: border-radius: 6px fora da escala do DS

Esperado: Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:token-radius

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>div>div:nth-of-type(2)>form>pnip-propesc-nao-comparecimento>div>div:nth-of-type(2)>div>div>textarea" — <textarea>

### Unidades candidatas (não são crédito)

- U-238f9e8879e41566f840160f72c03e67a02b73d7a42128f02a5935cc250e0e6f — B-20 · detalhe-menu · cena 1280x900@detalhe-menu · <textarea>: Detalhe da vistoria de não comparecimento: a <textarea> do motivo tem um <label> "Descrever o motivo do não comparecimento" como irmão, mas sem for (e a textarea sem id): o rótulo não está associado; nome acessível vazio. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: detalhe-menu
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "div > div:nth-of-type(2) > div > div > textarea",
    "rule": "ds:token-radius",
    "observed": "border-radius: 6px fora da escala do DS",
    "expected": "Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-2737965d1674a1e67421e42746a96714de6e3df112af115b94d68eea892da05e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-2ba516bf5c38f80fdad8f1fade214158203c33b49f5e4fcca8193717b8209cbf

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O botao 'Limpar Filtro' do painel de filtros tem margin: -5px 0px 0px, com -5px fora da escala de espacamento do DS.

Esperado: Valores de margem devem pertencer a escala de espacamento do gov.br DS (tokens --spacing-scale-*), sem deslocamentos negativos arbitrarios.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(5)>button" — <button> "Limpar Filtro"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-010/F-255 (govbr-ds-token, regra ds-token-spacing, severidade minor, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel div:nth-of-type(5) > button",
    "rule": "ds-token-spacing",
    "observed": "O botao 'Limpar Filtro' do painel de filtros tem margin: -5px 0px 0px, com -5px fora da escala de espacamento do DS.",
    "expected": "Valores de margem devem pertencer a escala de espacamento do gov.br DS (tokens --spacing-scale-*), sem deslocamentos negativos arbitrarios.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-010/F-255 (govbr-ds-token, regra ds-token-spacing, severidade minor, confidence 1, pathway deterministic)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-2ba516bf5c38f80fdad8f1fade214158203c33b49f5e4fcca8193717b8209cbf",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-2bf3e96e8b1d407e3fa9ea213ef8aec6dc41fcca238f8f05dc180c6adbdfd583

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-a940b158ce742af299cd0ad0f8ba65e2f23c6fd95f48e6da4753c1c601d7d960 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(1) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-2bf3e96e8b1d407e3fa9ea213ef8aec6dc41fcca238f8f05dc180c6adbdfd583",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-2df023adc45237084c09d11c6cc81f2756ec5b9a3a8a080c4f7feeaaf34d8d0e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: <li> elements must be contained in a <ul> or <ol>

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:listitem

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>li" — <li> "1"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "li:nth-child(2) > li",
    "rule": "axe:listitem",
    "observed": "<li> elements must be contained in a <ul> or <ol>",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-2df023adc45237084c09d11c6cc81f2756ec5b9a3a8a080c4f7feeaaf34d8d0e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-301734116616a4b8751826faf9382a5db9e215b7cce0c751b91e79458d12ff21

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Na paginacao de resultados, a pagina corrente ('1' de 4) e distinguida apenas pela classe CSS 'active' no <a class="page active">, sem aria-current; a arvore de acessibilidade expoe os quatro itens como 'link' equivalentes ('1', '2', '3', '4'), sem indicar qual esta em uso.

Esperado: O item da pagina corrente deve expor seu estado programaticamente, com aria-current="page" (ou equivalente), para que a posicao atual na paginacao nao dependa apenas de estilo visual.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-e038367bd7d6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>li>a" — <a> "1"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM: <a href="javascript:void(0)" class="page active"> 1 </a> sem aria-current; nav.br-pagination[data-current='1'][data-total='4']` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: nodes e494, e497, e500, e503 expostos como 'link' sem estado de atual` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".br-pagination a.page.active",
    "rule": "govbr-3.7.0-accessibility-global-e038367bd7d6",
    "relatedSelectors": [
      ".br-pagination a.page"
    ],
    "observed": "Na paginacao de resultados, a pagina corrente ('1' de 4) e distinguida apenas pela classe CSS 'active' no <a class=\"page active\">, sem aria-current; a arvore de acessibilidade expoe os quatro itens como 'link' equivalentes ('1', '2', '3', '4'), sem indicar qual esta em uso.",
    "expected": "O item da pagina corrente deve expor seu estado programaticamente, com aria-current=\"page\" (ou equivalente), para que a posicao atual na paginacao nao dependa apenas de estilo visual.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "DOM: <a href=\"javascript:void(0)\" class=\"page active\"> 1 </a> sem aria-current; nav.br-pagination[data-current='1'][data-total='4']",
      "arvore de acessibilidade: nodes e494, e497, e500, e503 expostos como 'link' sem estado de atual"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-301734116616a4b8751826faf9382a5db9e215b7cce0c751b91e79458d12ff21",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-315596bfa3bbd7009d46988070689905dc9e2df0bde131857fe5db18800f0d4c

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os dois campos de data não têm label, aria-label nem aria-labelledby: o input interno (ids br-input-8 e br-input-9) não é referenciado por nenhum <label for>, e a árvore de acessibilidade mostra "textbox" sem nome. O texto visível "Data da vistoria:" e "até" são <span> sem associação programática.

Esperado: Cada campo deve ter nome acessível distinto que identifique seu papel no intervalo (ex.: "Data da vistoria — início" e "Data da vistoria — fim"), associado via label/for ou aria-label.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. tabular até os campos de data

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>div>br-input:nth-of-type(1)" — <br-input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>div>br-input:nth-of-type(2)" — <br-input>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y refs e101/e105 — "textbox [ref=...]" sem nome` → não encontrado na evidência preservada da execução
- `varredura em shadow DOM: {id:"br-input-8", al:null, alb:null, labelFor:false} e {id:"br-input-9", al:null, alb:null, labelFor:false}` → identificador devolvido por ferramenta (sem arquivo)
- `foco-data-fim.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/foco-data-fim.png` (sha256 3c930f035ead)

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-input[type=\"date\"]",
    "relatedSelectors": [
      "pnip-propesc-vistorias div.col-auto.d-flex.align-items-center.align-self-end span.text-bold"
    ],
    "rule": "wcag:4.1.2",
    "observed": "Os dois campos de data não têm label, aria-label nem aria-labelledby: o input interno (ids br-input-8 e br-input-9) não é referenciado por nenhum <label for>, e a árvore de acessibilidade mostra \"textbox\" sem nome. O texto visível \"Data da vistoria:\" e \"até\" são <span> sem associação programática.",
    "expected": "Cada campo deve ter nome acessível distinto que identifique seu papel no intervalo (ex.: \"Data da vistoria — início\" e \"Data da vistoria — fim\"), associado via label/for ou aria-label.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "tabular até os campos de data"
      ]
    },
    "evidence": [
      "snapshot a11y refs e101/e105 — \"textbox [ref=...]\" sem nome",
      "varredura em shadow DOM: {id:\"br-input-8\", al:null, alb:null, labelFor:false} e {id:\"br-input-9\", al:null, alb:null, labelFor:false}",
      "foco-data-fim.png"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-315596bfa3bbd7009d46988070689905dc9e2df0bde131857fe5db18800f0d4c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-31a223179af06c3e6e9e1f8af6cff1de2ff5bb73a139e6843c76bf63f9f85145

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: As 11 caixas de selecao da tabela (1 no cabecalho, para selecionar todas, e 1 por linha) nao possuem label implicito nem explicito, nem aria-label ou aria-labelledby; a arvore de acessibilidade expoe 'checkbox' sem nome em todas.

Esperado: Cada campo de formulario deve ter etiqueta programaticamente associada: <label for> correspondente ao id do input, ou aria-label/aria-labelledby, identificando a selecao do cabecalho ('Selecionar todas as vistorias') e a de cada linha (a embarcacao correspondente).

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-b95c42b61ed3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-238..F-248 (axe-core, regra label, severidade critical, 11 elementos)` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: nodes e115, e127, e163, e199, e235, e271, e307, e343, e379, e415, e451` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "table input[type=\"checkbox\"]",
    "rule": "govbr-3.7.0-accessibility-global-b95c42b61ed3",
    "relatedSelectors": [
      "table thead th:nth-child(2)"
    ],
    "observed": "As 11 caixas de selecao da tabela (1 no cabecalho, para selecionar todas, e 1 por linha) nao possuem label implicito nem explicito, nem aria-label ou aria-labelledby; a arvore de acessibilidade expoe 'checkbox' sem nome em todas.",
    "expected": "Cada campo de formulario deve ter etiqueta programaticamente associada: <label for> correspondente ao id do input, ou aria-label/aria-labelledby, identificando a selecao do cabecalho ('Selecionar todas as vistorias') e a de cada linha (a embarcacao correspondente).",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-238..F-248 (axe-core, regra label, severidade critical, 11 elementos)",
      "arvore de acessibilidade: nodes e115, e127, e163, e199, e235, e271, e307, e343, e379, e415, e451"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-31a223179af06c3e6e9e1f8af6cff1de2ff5bb73a139e6843c76bf63f9f85145",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-33b0407541d72e6aaf25c4b99c2666da88e30e99ce61b79057c7fb0246a095f7

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-c94d9504d7c2bb1c534d9c85744bbbbe2810353f383044b076a2d9255c2b7e75 — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(10) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-33b0407541d72e6aaf25c4b99c2666da88e30e99ce61b79057c7fb0246a095f7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-36a94e0279ddca25f8d15afd2234188571d702f86dc363b25ef07afcc1a91a88

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Nao existe nenhum elemento .br-footer nem web component <br-footer> no documento, considerando DOM claro e shadow roots abertos; a tela termina no botao 'Voltar', sem rodape.

Esperado: A pagina deve conter a regiao de rodape do Template Base do gov.br DS (.br-footer ou <br-footer>).

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: ds-page-footer

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-002/F-089 (govbr-ds-page, restricao ds-page-footer, severidade serious, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds-page-footer",
    "observed": "Nao existe nenhum elemento .br-footer nem web component <br-footer> no documento, considerando DOM claro e shadow roots abertos; a tela termina no botao 'Voltar', sem rodape.",
    "expected": "A pagina deve conter a regiao de rodape do Template Base do gov.br DS (.br-footer ou <br-footer>).",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-002/F-089 (govbr-ds-page, restricao ds-page-footer, severidade serious, confidence 1, pathway deterministic)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-36a94e0279ddca25f8d15afd2234188571d702f86dc363b25ef07afcc1a91a88",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3939a56d8f7e286a37f2ccd4d5fd73eef6076c81dc83a55de7157933ef508101

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: padding: 0px 6px (fora da escala: 6px, 6px, 6px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>br-breadcrumb >>> div>ul>li:nth-of-type(1)>a" — <a> "Home" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-agendar-vistoria > br-breadcrumb >>> div > ul > li:nth-of-type(1) > a",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 6px (fora da escala: 6px, 6px, 6px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-3939a56d8f7e286a37f2ccd4d5fd73eef6076c81dc83a55de7157933ef508101",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3b2d5a96e68e4251678ac52866da04381d8349c960e7212f2f62fe3cec5bb79d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O botão "Limpar Filtro" inicia desabilitado (nenhum filtro aplicado), é habilitado ao aplicar um filtro de data e permanece habilitado depois que todos os filtros são removidos — estado final com 0 chips aplicados, etiqueta de volta a "Nenhum filtro de data aplicado" e contador em "1– 10 de 34 itens".

Esperado: O botão deve voltar ao estado desabilitado quando não houver nenhum filtro aplicado, como no carregamento inicial.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. preencher data inicial 25/03/2026 e data final 31/03/2026 3. limpar os dois campos de data

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta · janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(5)>button" — <button> "Limpar Filtro"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `ciclo medido: inicial disabled=true → com filtro de data disabled=false → após limpar as datas disabled=false` → identificador devolvido por ferramenta (sem arquivo)
- `estado final: chipsAplicados=0, etiqueta "Nenhum filtro de data aplicado", itens "1– 10 de 34 itens"` → identificador devolvido por ferramenta (sem arquivo)
- `selecao-todos.png (botão "Limpar Filtro" habilitado sem filtros ativos)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel button.br-button",
    "relatedSelectors": [
      "span.br-tag.primary-pastel-01"
    ],
    "rule": null,
    "observed": "O botão \"Limpar Filtro\" inicia desabilitado (nenhum filtro aplicado), é habilitado ao aplicar um filtro de data e permanece habilitado depois que todos os filtros são removidos — estado final com 0 chips aplicados, etiqueta de volta a \"Nenhum filtro de data aplicado\" e contador em \"1– 10 de 34 itens\".",
    "expected": "O botão deve voltar ao estado desabilitado quando não houver nenhum filtro aplicado, como no carregamento inicial.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "preencher data inicial 25/03/2026 e data final 31/03/2026",
        "limpar os dois campos de data"
      ]
    },
    "evidence": [
      "ciclo medido: inicial disabled=true → com filtro de data disabled=false → após limpar as datas disabled=false",
      "estado final: chipsAplicados=0, etiqueta \"Nenhum filtro de data aplicado\", itens \"1– 10 de 34 itens\"",
      "selecao-todos.png (botão \"Limpar Filtro\" habilitado sem filtros ativos)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-3b2d5a96e68e4251678ac52866da04381d8349c960e7212f2f62fe3cec5bb79d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3c8436d3bc0689109159e91cc80067bd6253956639ab5cc40027bd25bad8b229

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Cada link numérico da paginação está dentro de um <li> aninhado diretamente em outro <li>, sem lista intermediária: <ul><li><li><a class="page">1</a></li></li>...</ul>. A árvore de acessibilidade reflete a estrutura inválida, expondo "listitem" dentro de "listitem" (refs e492 > e493).

Esperado: Itens de lista devem ser filhos diretos de um <ul>/<ol>; cada link de página deve ficar em um único <li> irmão dos demais.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>li" — <li> "1"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(3)>li" — <li> "2"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(4)>li" — <li> "3"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(5)>li" — <li> "4"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `outerHTML de govbr-custom-pagination: <li _ngcontent><!----><li _ngcontent><a class="page active"> 1 </a></li><!----><!----></li>` → não encontrado na evidência preservada da execução
- `snapshot a11y: listitem [ref=e492] contendo listitem [ref=e493]` → identificador devolvido por ferramenta (sem arquivo)
- `validação de seletor: 4 ocorrências de li > li` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "govbr-custom-pagination nav.br-pagination li > li",
    "relatedSelectors": [
      "govbr-custom-pagination nav.br-pagination ul"
    ],
    "rule": "wcag:1.3.1",
    "observed": "Cada link numérico da paginação está dentro de um <li> aninhado diretamente em outro <li>, sem lista intermediária: <ul><li><li><a class=\"page\">1</a></li></li>...</ul>. A árvore de acessibilidade reflete a estrutura inválida, expondo \"listitem\" dentro de \"listitem\" (refs e492 > e493).",
    "expected": "Itens de lista devem ser filhos diretos de um <ul>/<ol>; cada link de página deve ficar em um único <li> irmão dos demais.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "outerHTML de govbr-custom-pagination: <li _ngcontent><!----><li _ngcontent><a class=\"page active\"> 1 </a></li><!----><!----></li>",
      "snapshot a11y: listitem [ref=e492] contendo listitem [ref=e493]",
      "validação de seletor: 4 ocorrências de li > li"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-3c8436d3bc0689109159e91cc80067bd6253956639ab5cc40027bd25bad8b229",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3d09c45f2c03975094c596bfc44135c00fdc8f3c49dc0c7071ccef75dac63769

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(9) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(9) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-3d09c45f2c03975094c596bfc44135c00fdc8f3c49dc0c7071ccef75dac63769",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3e88937bab0c6843bf514609650431cda8e41994cea0b3cde4208bce7929aad3

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-c107963b013ece13fc69392f42f23faf374a86814164af59c37a7353b97fd898 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(1) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-3e88937bab0c6843bf514609650431cda8e41994cea0b3cde4208bce7929aad3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3f9ff752527aea492f0c5bec053a349ae9b61794e211d3c2dbeb26937207cfab

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-02eacb6cd7eb8dedefea92feb5039dd63e1b11239e1984b948668c20a2629c38 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-4e50ada7ea0559d48e3cbb150ecbb78d2afbb5cec4cbd286c632cc311c6895cb — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(6) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-3f9ff752527aea492f0c5bec053a349ae9b61794e211d3c2dbeb26937207cfab",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-411c56a2f8feb551ecf1d4bb177385cb2240479c3979804f13a3864f0949a8ed

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-fa4d8e390509b90a7ed8f88a4689048ece8c78b098632c14b12bea93b2ed45c7 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(10) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-411c56a2f8feb551ecf1d4bb177385cb2240479c3979804f13a3864f0949a8ed",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-41dae7a5ca3c6abcd400fc986882ef882c1a0c9decd3caa3b8260cb597840a10

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-f723c3af7f206deab86d98a6537a4b8d0edbbcada8c6ef2af6c8570d58c6ea99 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(9) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-41dae7a5ca3c6abcd400fc986882ef882c1a0c9decd3caa3b8260cb597840a10",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4401a05c7eec887f1b9e546de8ccf536bab1cefbce4d8ffcac62d305f49e26c9

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-d32966d9163ab3f1dd27e4670fae6cb1b4a4c1d16cd90f4f97a7e5aabc5e31d0 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-d9869f3ea32b35bb4fa9584d5e128f1578dfee7ed4a5f37b8dad906257ebc811 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(8) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-4401a05c7eec887f1b9e546de8ccf536bab1cefbce4d8ffcac62d305f49e26c9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-45de3ddd5dfabe40c08a7ef80b1c66c411d5ec0771a640e06cc12344855402ba

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: br-breadcrumb aplicado a <div>

Esperado: Elemento <nav>

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:structure-breadcrumb-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>br-breadcrumb >>> div" — <div> "Home Vistorias Agendar vistoria" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-agendar-vistoria > br-breadcrumb >>> div",
    "rule": "ds:structure-breadcrumb-tag",
    "observed": "br-breadcrumb aplicado a <div>",
    "expected": "Elemento <nav>",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-45de3ddd5dfabe40c08a7ef80b1c66c411d5ec0771a640e06cc12344855402ba",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4607e141babf223ef2617aa42859c2ef7ef0f93954005f7101618360cc612fc3

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-e8a833be6f8e67c0174db0b62af794a56b992fcb720b940ff7e1902b393b2536 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(3) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-4607e141babf223ef2617aa42859c2ef7ef0f93954005f7101618360cc612fc3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-462d58b99dda22e4d70ff221c1e5398478c5d10d7e97583b58a946de59578b7f

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(8) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(8) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-462d58b99dda22e4d70ff221c1e5398478c5d10d7e97583b58a946de59578b7f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-473a91aca9f2f4250d022249f5b921b594f84d7f779c728f21713a4d7ea63bae

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(5) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(5) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-473a91aca9f2f4250d022249f5b921b594f84d7f779c728f21713a4d7ea63bae",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-47592e575f0a47cae46216f634cc82d990f2a7709043e4d9bd865554dcaf6f04

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O contêrner div.br-table tem overflow-x: visible e largura útil de 1096 px, enquanto a tabela interna mede 1269 px: a tabela transborda o contêiner e empurra o documento inteiro, que passa a rolar horizontalmente já em 1440x900 (scrollWidth 1433 vs clientWidth 1425, tabela chegando a x=1434).

Esperado: A tabela deve rolar horizontalmente dentro do próprio contêiner (overflow-x: auto em div.br-table), sem gerar rolagem horizontal no documento.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. medir larguras de rolagem do documento e do contêiner da tabela

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta · janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)" — <div> "# Nome da embarcação RAEP Data/Hora Vistoria Loc"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `medição: {tabelaScrollW:1269, tabelaClientW:1096, tabelaOverflowX:"visible"}` → identificador devolvido por ferramenta (sem arquivo)
- `documento: scrollWidth=1433, clientWidth=1425; elementos excedentes: TABLE.table right=1434` → identificador devolvido por ferramenta (sem arquivo)
- `filtro-cidade-aberto.png e selecao-todos.png mostram a barra de rolagem horizontal do documento` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "div.br-table",
    "relatedSelectors": [
      "div.br-table table.table"
    ],
    "rule": null,
    "observed": "O contêrner div.br-table tem overflow-x: visible e largura útil de 1096 px, enquanto a tabela interna mede 1269 px: a tabela transborda o contêiner e empurra o documento inteiro, que passa a rolar horizontalmente já em 1440x900 (scrollWidth 1433 vs clientWidth 1425, tabela chegando a x=1434).",
    "expected": "A tabela deve rolar horizontalmente dentro do próprio contêiner (overflow-x: auto em div.br-table), sem gerar rolagem horizontal no documento.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "medir larguras de rolagem do documento e do contêiner da tabela"
      ]
    },
    "evidence": [
      "medição: {tabelaScrollW:1269, tabelaClientW:1096, tabelaOverflowX:\"visible\"}",
      "documento: scrollWidth=1433, clientWidth=1425; elementos excedentes: TABLE.table right=1434",
      "filtro-cidade-aberto.png e selecao-todos.png mostram a barra de rolagem horizontal do documento"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-47592e575f0a47cae46216f634cc82d990f2a7709043e4d9bd865554dcaf6f04",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-47e34ba1c84ae2e323d7b4a4be4751d593b008efc09ae988727d0a0f4205bca1

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-8188a105d675aa0dc47295d0aa263c5574ae6994c59e058e2a0f7b8c4ed890e2 — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(5) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-47e34ba1c84ae2e323d7b4a4be4751d593b008efc09ae988727d0a0f4205bca1",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-47f6fabddeac38fe1dabf808e61a7d294c3e7f3d3bdb99acfcd59525cd64ba8b

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: border-radius: 20px fora da escala do DS

Esperado: Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:token-radius

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>pnip-header>div>div>div>button" — <button> "Sair"

### Unidades candidatas (não são crédito)

- U-9c7e2ca111d2c9a7961c1ee8e3072a064ed3c2f32391f51ce2f7fc92f0cbd327 — B-18 · detalhe-menu · cena 1280x900@detalhe-menu · <button> "Sair": Botão "Sair" do menu do avatar fora do padrão HTML: tem atributo href (inexistente em <button>) e contém um <p>, conteúdo de fluxo que o modelo de conteúdo de <button> não admite. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: detalhe-menu
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-menu > button",
    "rule": "ds:token-radius",
    "observed": "border-radius: 20px fora da escala do DS",
    "expected": "Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-47f6fabddeac38fe1dabf808e61a7d294c3e7f3d3bdb99acfcd59525cd64ba8b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4a26c2280656117489cd3a2c4c75e779e0038316fd552de19953787b3cc007c7

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O <title> do documento e apenas 'PNIP', a sigla do sistema; nao identifica o conteudo principal desta tela (Vistorias). O mesmo titulo e servido para as demais rotas da aplicacao, de modo que abas, historico e favoritos nao distinguem a pagina.

Esperado: O title deve ser descritivo e informativo, representando o conteudo principal da pagina e identificando o sistema (por exemplo 'Vistorias - PNIP').

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-5d5a5f21d94b

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM: document.title = 'PNIP'; titulo principal do conteudo = 'Vistorias' (h2)` → identificador devolvido por ferramenta (sem arquivo)
- `navegacoes repetidas para /pnip/portal-mpa/vistorias retornaram sempre 'Page Title: PNIP'` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "govbr-3.7.0-accessibility-global-5d5a5f21d94b",
    "observed": "O <title> do documento e apenas 'PNIP', a sigla do sistema; nao identifica o conteudo principal desta tela (Vistorias). O mesmo titulo e servido para as demais rotas da aplicacao, de modo que abas, historico e favoritos nao distinguem a pagina.",
    "expected": "O title deve ser descritivo e informativo, representando o conteudo principal da pagina e identificando o sistema (por exemplo 'Vistorias - PNIP').",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "DOM: document.title = 'PNIP'; titulo principal do conteudo = 'Vistorias' (h2)",
      "navegacoes repetidas para /pnip/portal-mpa/vistorias retornaram sempre 'Page Title: PNIP'"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-4a26c2280656117489cd3a2c4c75e779e0038316fd552de19953787b3cc007c7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4b0a8e022b10dea215474a2dcb9f7a1083e51f266aec8a1848ab2c11350e6a60

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-f07a8ab3363a61b30ea8baef943842cb2689f88dfed8b214272ef7c0fe9ad32e — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(9) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-4b0a8e022b10dea215474a2dcb9f7a1083e51f266aec8a1848ab2c11350e6a60",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4c7c18d69b3632d6518c25754d9fed660819555a0acae8d30dacf77af1019b08

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: Certain ARIA roles must contain particular children

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: axe:aria-required-children

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>pnip-header>div>div>div" — <div#avatar-menu> "Usuária de Teste usuaria.teste@exemplo.invalid S"

### Unidades candidatas (não são crédito)

- U-060619c23f438737b6ceda1f36f200d1431c490df3fd7941c57b2f4a1a8679bc — B-17 · detalhe-menu · cena 1280x900@detalhe-menu · <div#avatar-menu> "Usuária de Teste usuaria.teste@exemplo.invalid S": Menu do avatar (div#avatar-menu.br-list) declara role="menu" e não tem nenhum descendente com papel menuitem: o "Sair" é um <button> sem papel e "Trocar unidade" um <span>. O papel declarado não corresponde ao conteúdo. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: detalhe-menu
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-menu",
    "rule": "axe:aria-required-children",
    "observed": "Certain ARIA roles must contain particular children",
    "expected": null,
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-4c7c18d69b3632d6518c25754d9fed660819555a0acae8d30dacf77af1019b08",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4ff9a0ab9d50a5d6b20352501632fa2f0dd9a3be6ebb84cee687e854750d4641

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os quatro acionadores de filtro (Cidade, Porto, Vistoriador, Status) sao <span class="br-tag interaction" style="cursor:pointer"> com handler de clique, sem role, sem atributo tabindex e com tabIndex computado -1. O levantamento da ordem de foco sequencial (84 elementos focaveis em light DOM e shadow roots abertos) nao inclui nenhum dos quatro; o clique do mouse em 'Cidade' abre a lista de opcoes, comprovando que ha funcao associada.

Esperado: Toda funcao da pagina deve ser operavel por teclado: cada acionador de filtro deve ser um <button> nativo (ou expor role e tabindex equivalentes), alcancavel por Tab, acionavel por Enter/Space e com aria-expanded refletindo abertura e fechamento da lista.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa) 2. percorrer a ordem de foco sequencial 3. clicar com o mouse em 'Cidade' para confirmar que existe funcao associada ao span

Regra declarada: govbr-3.7.0-accessibility-global-e6fd5e1247de

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(1)>span" — <span> "Cidade"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(2)>span" — <span> "Porto"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(3)>span" — <span> "Vistoriador"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(4)>span" — <span> "Status"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `V-001 (verify_finding, live=true, 4 elementos: ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate; stateFingerprint sha256:b60751a09cf9fe1177e030cb97b9bced8f166410fa5f454d25076605af2a590a)` → identificador devolvido por ferramenta (sem arquivo)
- `DOM: role=null, tabindex=null, tabIndex=-1, aria-expanded=null nos 4 elementos` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel .br-tag.interaction",
    "rule": "govbr-3.7.0-accessibility-global-e6fd5e1247de",
    "observed": "Os quatro acionadores de filtro (Cidade, Porto, Vistoriador, Status) sao <span class=\"br-tag interaction\" style=\"cursor:pointer\"> com handler de clique, sem role, sem atributo tabindex e com tabIndex computado -1. O levantamento da ordem de foco sequencial (84 elementos focaveis em light DOM e shadow roots abertos) nao inclui nenhum dos quatro; o clique do mouse em 'Cidade' abre a lista de opcoes, comprovando que ha funcao associada.",
    "expected": "Toda funcao da pagina deve ser operavel por teclado: cada acionador de filtro deve ser um <button> nativo (ou expor role e tabindex equivalentes), alcancavel por Tab, acionavel por Enter/Space e com aria-expanded refletindo abertura e fechamento da lista.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)",
        "percorrer a ordem de foco sequencial",
        "clicar com o mouse em 'Cidade' para confirmar que existe funcao associada ao span"
      ]
    },
    "evidence": [
      "V-001 (verify_finding, live=true, 4 elementos: ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate; stateFingerprint sha256:b60751a09cf9fe1177e030cb97b9bced8f166410fa5f454d25076605af2a590a)",
      "DOM: role=null, tabindex=null, tabIndex=-1, aria-expanded=null nos 4 elementos"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-4ff9a0ab9d50a5d6b20352501632fa2f0dd9a3be6ebb84cee687e854750d4641",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-51e6e9844ef312fb3ee90a377fa0ffb868a7b9f55db9f76e6e9577e5bb07fbc2

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-9a56858ccf8efa67d6cb2c9c8a8aaf3c02ab1069eece36e12a20fd44ae311f7a — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(4) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-51e6e9844ef312fb3ee90a377fa0ffb868a7b9f55db9f76e6e9577e5bb07fbc2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5279e8fb0b1311cbc85241b6b61716e60963432573c1a41287ce97b65d99cb5d

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Table header text should not be empty

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:empty-table-header

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(9)" — <th>

### Unidades candidatas (não são crédito)

- U-b7e530416a4355be7bcf78d035eaf9bd1ffb67d4420e5cb566793a700e04d842 — B-26 · inicial · cena 1280x900@inicial · <th>: Escalada E-04, origem: "autora" (decisão da escalada, 2026-10-01, D-61). O <th scope=col> da coluna de ações (9ª) não tem texto, aria-label nem filhos: as células de ação ficam associadas a um cabeçalho sem nome. O <th> da coluna de caixas (2ª) fica fora: contém um controle, e o defeito dele já é a B-06. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "th:nth-child(9)",
    "rule": "axe:empty-table-header",
    "observed": "Table header text should not be empty",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-5279e8fb0b1311cbc85241b6b61716e60963432573c1a41287ce97b65d99cb5d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-528518027718492f44a1a05267842fe71da690544f5496d2b38b624dbddd41cd

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: br-breadcrumb aplicado a <div>

Esperado: Elemento <nav>

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:structure-breadcrumb-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>br-breadcrumb >>> div" — <div> "Home Vistorias" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-vistorias > br-breadcrumb >>> div",
    "rule": "ds:structure-breadcrumb-tag",
    "observed": "br-breadcrumb aplicado a <div>",
    "expected": "Elemento <nav>",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-528518027718492f44a1a05267842fe71da690544f5496d2b38b624dbddd41cd",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-536886ee8889e60d5ad5607aa108767d51c342dbc956794fc7f0dcfde5374aa3

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-f9f3d45544d87746e9a1c7094a4cc62f5d90ef5f8242736a83ca2bd7164880a8 — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(4) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-536886ee8889e60d5ad5607aa108767d51c342dbc956794fc7f0dcfde5374aa3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5633da366c3894675dd0e596db78d426680da3b730a6091b03b4a4328bf7c588

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(4) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(4) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-5633da366c3894675dd0e596db78d426680da3b730a6091b03b4a4328bf7c588",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-60cabcb73f40cf45d7fe9cb4afb9a4abd843e9ad730b7ca4fb8313878bcd3b55

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-9cb4d2d7fcd6a67dd6eb7d11ce81a26f74e902e4fe0e3e5a4bff10bc1bb57456 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(1) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-60cabcb73f40cf45d7fe9cb4afb9a4abd843e9ad730b7ca4fb8313878bcd3b55",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-61a6736ddb534da3cec4f2c494351279adda45fb53794b8853b6e114fab47fa3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:320x640

Observado: Com a janela em 320 px de largura (clientWidth 305 px), a linha do filtro de data ("Data da vistoria:" + dois campos + "até") ocupa 580 px e se estende até x=612, quase o dobro da viewport, exigindo rolagem horizontal. O conteúdo não é tabular e não requer layout bidimensional.

Esperado: Em 320 px de largura o conteúdo deve refluir sem exigir rolagem horizontal; a linha de filtro de data deve quebrar em várias linhas.

Janela: 320×640 · interações desde o carregamento: 1. carregar a tela 2. redimensionar a janela para 320x640

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 320x640; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>div" — <div> "Data da vistoria: até"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `medição em 320x640: clientWidth=305, scrollWidth=1309, excesso=1004 px` → identificador devolvido por ferramenta (sem arquivo)
- `elemento infrator fora da tabela: {sel:"div.col-auto.d-flex.align-items-center", right:612, w:580, txt:"Data da vistoria: até"}` → identificador devolvido por ferramenta (sem arquivo)
- `validação de seletor em 1440x900: 1 ocorrência` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-propesc-vistorias div.col-auto.d-flex.align-items-center.align-self-end",
    "relatedSelectors": [
      "br-input[type=\"date\"]"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com a janela em 320 px de largura (clientWidth 305 px), a linha do filtro de data (\"Data da vistoria:\" + dois campos + \"até\") ocupa 580 px e se estende até x=612, quase o dobro da viewport, exigindo rolagem horizontal. O conteúdo não é tabular e não requer layout bidimensional.",
    "expected": "Em 320 px de largura o conteúdo deve refluir sem exigir rolagem horizontal; a linha de filtro de data deve quebrar em várias linhas.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 640
      },
      "steps": [
        "carregar a tela",
        "redimensionar a janela para 320x640"
      ]
    },
    "evidence": [
      "medição em 320x640: clientWidth=305, scrollWidth=1309, excesso=1004 px",
      "elemento infrator fora da tabela: {sel:\"div.col-auto.d-flex.align-items-center\", right:612, w:580, txt:\"Data da vistoria: até\"}",
      "validação de seletor em 1440x900: 1 ocorrência"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-61a6736ddb534da3cec4f2c494351279adda45fb53794b8853b6e114fab47fa3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-61aa67988c37dc9a1dd908995e56910aa74b87ed9bdf4d9775ed55ee5cd5d91c

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-16826af28e0996f408c83115a4435f7af40ac4cc53bf08f36e9dbbac871436f1 — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(2) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-61aa67988c37dc9a1dd908995e56910aa74b87ed9bdf4d9775ed55ee5cd5d91c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-622e1e9d43dd99e99bae2fd82e4bf8b565f6d7c1a967c4bf92e05b5388b4b021

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-45c20706f1d48bc1746de862e07a2bebfa8d36d3c0e635f9b31e3bf29f73ac52 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(10) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-622e1e9d43dd99e99bae2fd82e4bf8b565f6d7c1a967c4bf92e05b5388b4b021",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-62b7427e5ff68d2ecd4e3e108b26e580e12b2319b47549a1f04891445db0d352

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-f4c4b8d4dce8ec5c0563c669076815a62a663913fd2dc5d9f0800feb47660c62 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(6) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-62b7427e5ff68d2ecd4e3e108b26e580e12b2319b47549a1f04891445db0d352",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-634d2b99991ce45254b8669f4a006ea3d72fe554d528f6b807e58faf5f5588c8

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>div>div:nth-of-type(2)>form>div:nth-of-type(4)>div:nth-of-type(1)>div:nth-of-type(2)>div>div>div" — <div> "0%"

### Unidades candidatas (não são crédito)

- U-47e455721d9db772bfcf9d81fb3760168dc6269c6849d5348ccb5207c5570bb1 — B-23 · detalhe · cena 1280x900@modal · <div> "0%": Indicador "0%" do detalhe: texto branco (text-secondary-01) sobre #888 (bg-secondary-06), 14 px peso 400 — contraste 3,54:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: detalhe, modal
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".bg-secondary-06 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-634d2b99991ce45254b8669f4a006ea3d72fe554d528f6b807e58faf5f5588c8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-64b63b21f73d4a359f96ab72a795e5a8f3b440361b6eb62867e1a16e4a5e5ba5

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-86758a4dd2aff0cfdd75f4a93d7d0bed35bbca8d150354009a7c12ca64d19a6c — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(2) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-64b63b21f73d4a359f96ab72a795e5a8f3b440361b6eb62867e1a16e4a5e5ba5",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-64bb6bc0659da46a74577af05a3e5361851b5d8d47434e4bdde6d172b9f81507

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Na aba "Agendar", o texto "Vistoria pré agendada" é branco sobre bg-secondary-06, 14px peso 500: razão de contraste 3.54:1. Atinge 10 elementos.

Esperado: Texto normal precisa de razão de contraste mínima de 4.5:1 com o fundo.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar na aba "Agendar"

Regra declarada: wcag:1.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:.br-table .bg-secondary-06 .text-secondary-01" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `cálculo de contraste sobre getComputedStyle na aba Agendar = 3.54:1` → identificador devolvido por ferramenta (sem arquivo)
- `contagem validada: 10 elementos para .br-table .bg-secondary-06 .text-secondary-01` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".br-table .bg-secondary-06 .text-secondary-01",
    "relatedSelectors": [],
    "rule": "wcag:1.4.3",
    "observed": "Na aba \"Agendar\", o texto \"Vistoria pré agendada\" é branco sobre bg-secondary-06, 14px peso 500: razão de contraste 3.54:1. Atinge 10 elementos.",
    "expected": "Texto normal precisa de razão de contraste mínima de 4.5:1 com o fundo.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar na aba \"Agendar\""
      ]
    },
    "evidence": [
      "cálculo de contraste sobre getComputedStyle na aba Agendar = 3.54:1",
      "contagem validada: 10 elementos para .br-table .bg-secondary-06 .text-secondary-01"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-64bb6bc0659da46a74577af05a3e5361851b5d8d47434e4bdde6d172b9f81507",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6601a895fb93da028c2fb2ccd39bc9c276545001579c48361a6073afec3ee04d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: 10 ícones decorativos do FontAwesome (8 no painel de filtros, 1 de prédio no cabeçalho do menu, 1 de relógio em "Última atualização") não têm aria-hidden="true". O glifo de ::before é exposto na árvore de acessibilidade como texto — ex.: generic [ref=e66]: "", generic [ref=e68]: "". Os demais ícones da mesma tela (paginação, selects, botão Limpar) já usam aria-hidden="true".

Esperado: Ícones puramente decorativos devem ser ignorados pela tecnologia assistiva, com aria-hidden="true", como já feito no restante da tela.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:1.1.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(1)>span>i" — <i>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(1)>span>span:nth-of-type(2)" — <span>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(2)>span>i" — <i>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(2)>span>span:nth-of-type(2)" — <span>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(3)>span>i" — <i>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(3)>span>span:nth-of-type(2)" — <span>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(4)>span>i" — <i>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(4)>span>span:nth-of-type(2)" — <span>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(3)>i" — <i>
- "body>pnip-root>pnip-header>div>div>div>div:nth-of-type(2)>div:nth-of-type(2)>span>i" — <i> · **oculto**: nao-renderizado, aria-hidden

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y inicial: generics contendo caracteres de área privada do FontAwesome (refs e66, e68, e71, e73, e76, e78, e81, e83, e108)` → identificador devolvido por ferramenta (sem arquivo)
- `agrupamento por componente: PNIP-FILTER-PANEL aria-hidden=null ×8, PNIP-HEADER aria-hidden=null ×1, relógio ×1; GOVBR-CUSTOM-PAGINATION e BR-SELECT-PNIP aria-hidden=true` → identificador devolvido por ferramenta (sem arquivo)
- `getComputedStyle(el, "::before").content retorna o glifo` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "i.fas:not([aria-hidden]), span.fas:not([aria-hidden]), i.far:not([aria-hidden])",
    "relatedSelectors": [],
    "rule": "wcag:1.1.1",
    "observed": "10 ícones decorativos do FontAwesome (8 no painel de filtros, 1 de prédio no cabeçalho do menu, 1 de relógio em \"Última atualização\") não têm aria-hidden=\"true\". O glifo de ::before é exposto na árvore de acessibilidade como texto — ex.: generic [ref=e66]: \"\", generic [ref=e68]: \"\". Os demais ícones da mesma tela (paginação, selects, botão Limpar) já usam aria-hidden=\"true\".",
    "expected": "Ícones puramente decorativos devem ser ignorados pela tecnologia assistiva, com aria-hidden=\"true\", como já feito no restante da tela.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "snapshot a11y inicial: generics contendo caracteres de área privada do FontAwesome (refs e66, e68, e71, e73, e76, e78, e81, e83, e108)",
      "agrupamento por componente: PNIP-FILTER-PANEL aria-hidden=null ×8, PNIP-HEADER aria-hidden=null ×1, relógio ×1; GOVBR-CUSTOM-PAGINATION e BR-SELECT-PNIP aria-hidden=true",
      "getComputedStyle(el, \"::before\").content retorna o glifo"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-6601a895fb93da028c2fb2ccd39bc9c276545001579c48361a6073afec3ee04d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6bc386b125e8c1ed92c2107838e617f3c49042ce4cab1e647e350c81fd9731aa

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-07d2b621292b581da4954c5639be7a8609cf001aa47f0b34539dc3947e0274dc — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(2) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6bc386b125e8c1ed92c2107838e617f3c49042ce4cab1e647e350c81fd9731aa",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6cf0d48d96b2984f9960dd65839d80c670e3a154bc9f5dcd7da4effa9e1142da

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A inicial "U" do avatar é rgb(255,255,255) sobre bg-orange-vivid-30 rgb(255,140,0), 24.19px peso 700: razão de contraste 2.33:1.

Esperado: Texto de grande porte (>=24px, ou >=18.66px em negrito) precisa de razão de contraste mínima de 3:1 com o fundo.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:1.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>pnip-header>div>div>button>span:nth-of-type(1)>span" — <span> "U"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `cálculo de contraste: fg rgb(255,255,255) / bg rgb(255,140,0) = 2.33:1, fontSize 24.192px, fontWeight 700` → não encontrado na evidência preservada da execução
- `filtro-cidade-aberto.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/filtro-cidade-aberto.png` (sha256 41445e56f6e6)
- `snapshot a11y ref e23/e24` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-dropdown-trigger .br-avatar .content",
    "relatedSelectors": [],
    "rule": "wcag:1.4.3",
    "observed": "A inicial \"U\" do avatar é rgb(255,255,255) sobre bg-orange-vivid-30 rgb(255,140,0), 24.19px peso 700: razão de contraste 2.33:1.",
    "expected": "Texto de grande porte (>=24px, ou >=18.66px em negrito) precisa de razão de contraste mínima de 3:1 com o fundo.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "cálculo de contraste: fg rgb(255,255,255) / bg rgb(255,140,0) = 2.33:1, fontSize 24.192px, fontWeight 700",
      "filtro-cidade-aberto.png",
      "snapshot a11y ref e23/e24"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-6cf0d48d96b2984f9960dd65839d80c670e3a154bc9f5dcd7da4effa9e1142da",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6d2e4ba74d01efc38d9dbee02e41c94085cd8c0e3540f4b04628461dc442e7d3

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-3709122ef551796d381883922a2608a3e1e33f879789e165d56b6c8d43a7d2b5 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(7) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6d2e4ba74d01efc38d9dbee02e41c94085cd8c0e3540f4b04628461dc442e7d3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6d9287b331b2cb78a9c3d510066358a65f91e21ecf857dd453660456e597996d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A pagina nao possui nenhum cabecalho de nivel 1: o titulo principal da tela, 'Vistorias', e marcado como <h2> (node e45), e nao existe <h1> no documento.

Esperado: A hierarquia de titulos deve comecar em H1, preferencialmente um unico H1 identificando o conteudo principal da pagina — aqui, 'Vistorias'.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-3ac0aaa53900

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-253 (axe-core, regra page-has-heading-one, severidade moderate: 'Page must have a level-one heading')` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: heading 'Vistorias' com level=2` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "govbr-3.7.0-accessibility-global-3ac0aaa53900",
    "relatedSelectors": [
      "pnip-propesc-vistorias h2"
    ],
    "observed": "A pagina nao possui nenhum cabecalho de nivel 1: o titulo principal da tela, 'Vistorias', e marcado como <h2> (node e45), e nao existe <h1> no documento.",
    "expected": "A hierarquia de titulos deve comecar em H1, preferencialmente um unico H1 identificando o conteudo principal da pagina — aqui, 'Vistorias'.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-253 (axe-core, regra page-has-heading-one, severidade moderate: 'Page must have a level-one heading')",
      "arvore de acessibilidade: heading 'Vistorias' com level=2"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-6d9287b331b2cb78a9c3d510066358a65f91e21ecf857dd453660456e597996d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6ee0d5e357bd514e182941d4a6f82c6b3e69a9da4822eeb873435140456c4847

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: Images must have alternative text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: axe:image-alt

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>pnip-header>br-header >>> header>div>div:nth-of-type(1)>div>img" — <img> [shadow]
- "body>pnip-root>pnip-header>div>div>div>button>img" — <img>

### Unidades candidatas (não são crédito)

- U-9bc6e7a1ad04bfa95826d4923672ddd61d6dec27b94086ecea975dbb3ea09d60 — B-16 · detalhe-menu · cena 1280x900@detalhe-menu · <img>: Ícone do botão "Sair" do menu do avatar (<img src="../../../assets/images/exit-icon.png">) sem atributo alt — nem texto alternativo nem alt vazio de imagem decorativa.
  - estados em que a unidade existe: detalhe-menu
  - predicado de aceitação: atributos-ausentes sustenta em detalhe-menu — nenhum destes atributos presente: alt. Medido: ausentes: alt
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "img",
    "rule": "axe:image-alt",
    "observed": "Images must have alternative text",
    "expected": null,
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6ee0d5e357bd514e182941d4a6f82c6b3e69a9da4822eeb873435140456c4847",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6f8df8967c07617b356518dd3fa821f6da2a2b641d0ce6c48182149ea9dc168d

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-0110934d42ae3ae66442d691b2b20b23d9d07ce6f4c4c8aa8480df203d202125 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-13a157c9b6a196ee3914cb6bc301202d68f0f7a52f693739e9bc9a8f1789cfcc — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(10) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6f8df8967c07617b356518dd3fa821f6da2a2b641d0ce6c48182149ea9dc168d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6fbbb55bc8c963fa8ca02d65403d2708d90c4d571acf13e556c5957e0abd565e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-4947f781cee61c8d4e34f8fd68e6068c6ba9186a16939eaf9993f0dab21ea6cc — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(3) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-6fbbb55bc8c963fa8ca02d65403d2708d90c4d571acf13e556c5957e0abd565e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-70adc2370b8cdf03d332edb69b5e966813821c9857d37ac4a862fae7204c9d6f

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O item 'Sair' do menu do usuario (botao dentro de #avatar-menu) tem border-radius: 20px, valor fora da escala de raio do DS. O elemento esta no DOM desde o carregamento e torna-se visivel ao abrir o menu do avatar.

Esperado: O raio de borda deve pertencer a escala de raio do gov.br DS (tokens --surface-rounder-*/--radius), sem valores arbitrarios.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa) 2. abrir o menu do avatar para visualizar o item 'Sair'

Regra declarada: ds-token-radius

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>pnip-header>div>div>div>button" — <button> "Sair" · **oculto**: nao-renderizado, aria-hidden

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-010/F-254 (govbr-ds-token, regra ds-token-radius, severidade minor, confidence 1, locator '#avatar-menu > button')` → não encontrado na evidência preservada da execução
- `estilo computado: border-radius 20px no botao 'Sair'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-menu > button",
    "rule": "ds-token-radius",
    "observed": "O item 'Sair' do menu do usuario (botao dentro de #avatar-menu) tem border-radius: 20px, valor fora da escala de raio do DS. O elemento esta no DOM desde o carregamento e torna-se visivel ao abrir o menu do avatar.",
    "expected": "O raio de borda deve pertencer a escala de raio do gov.br DS (tokens --surface-rounder-*/--radius), sem valores arbitrarios.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)",
        "abrir o menu do avatar para visualizar o item 'Sair'"
      ]
    },
    "evidence": [
      "S-page-010/F-254 (govbr-ds-token, regra ds-token-radius, severidade minor, confidence 1, locator '#avatar-menu > button')",
      "estilo computado: border-radius 20px no botao 'Sair'"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-70adc2370b8cdf03d332edb69b5e966813821c9857d37ac4a862fae7204c9d6f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-733cb178b329343fd7ba51119e4784729ff6b138047ce35e19c100d27fd8ac58

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(7) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(7) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-733cb178b329343fd7ba51119e4784729ff6b138047ce35e19c100d27fd8ac58",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-746c399ae904ba4f3dc5a8d414180a11a8c6af613a32804fe1705535c31897b0

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-35a1f7371e59f01053d63393c5ee402d75453afba1a50119725e8b0ef7b7ffc5 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(3) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-746c399ae904ba4f3dc5a8d414180a11a8c6af613a32804fe1705535c31897b0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-750fd883dbf88d43bfb0cbaa7ec0b82ae703fd9ec10a67ce293a329c5a583618

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: <li> elements must be contained in a <ul> or <ol>

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:listitem

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(3)>li" — <li> "2"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "li:nth-child(3) > li",
    "rule": "axe:listitem",
    "observed": "<li> elements must be contained in a <ul> or <ol>",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-750fd883dbf88d43bfb0cbaa7ec0b82ae703fd9ec10a67ce293a329c5a583618",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7685c62e41fe0729dcca2ada3c904aa611a4eabcdebf1f5ebad3977d2eef22b4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: As opções da lista de filtro são <label> soltos dentro de div.br-radio, sem input associado (0 inputs na lista), sem role, sem tabindex e sem estado de seleção; clicar no label aplica o filtro, mas nenhum papel ou valor é exposto. Medido com a lista "Cidade" aberta: 6 labels, 0 inputs, 0 elementos focáveis.

Esperado: Cada opção deve expor papel e estado programaticamente (ex.: input[type=radio] com label associado, ou role="option"/"menuitemradio" com aria-checked) e ser alcançável pelo teclado.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar no acionador "Cidade" 3. inspecionar a lista aberta

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:pnip-filter-panel .br-list.d-block .br-item label" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snap-filtro-aberto.md` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/snap-filtro-aberto.md` (sha256 a0fff67126ec)
- `filtro-cidade-aberto.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/filtro-cidade-aberto.png` (sha256 41445e56f6e6)
- `outerHTML: <div class="br-radio py-2 px-3"><label>Areia Branca do Leste</label></div>` → não encontrado na evidência preservada da execução
- `contagem: labels=6, inputs=0, focáveis=0` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel .br-list.d-block .br-item label",
    "relatedSelectors": [
      "pnip-filter-panel span.br-tag.interaction.small.bg-pure-0"
    ],
    "rule": "wcag:4.1.2",
    "observed": "As opções da lista de filtro são <label> soltos dentro de div.br-radio, sem input associado (0 inputs na lista), sem role, sem tabindex e sem estado de seleção; clicar no label aplica o filtro, mas nenhum papel ou valor é exposto. Medido com a lista \"Cidade\" aberta: 6 labels, 0 inputs, 0 elementos focáveis.",
    "expected": "Cada opção deve expor papel e estado programaticamente (ex.: input[type=radio] com label associado, ou role=\"option\"/\"menuitemradio\" com aria-checked) e ser alcançável pelo teclado.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar no acionador \"Cidade\"",
        "inspecionar a lista aberta"
      ]
    },
    "evidence": [
      "snap-filtro-aberto.md",
      "filtro-cidade-aberto.png",
      "outerHTML: <div class=\"br-radio py-2 px-3\"><label>Areia Branca do Leste</label></div>",
      "contagem: labels=6, inputs=0, focáveis=0"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-7685c62e41fe0729dcca2ada3c904aa611a4eabcdebf1f5ebad3977d2eef22b4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7977526de5dd6eb14e014c92ec151c2374d689acd64d8a0bfea530117e552188

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-3049775918cf20de601f3ade85d8fdbdb3805ce950056f454a06a7409f6cf244 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-c1a9610f089cbeee868f23860b3d533f7c2b696814cd4ac8c5af2d9a7039917f — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(3) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-7977526de5dd6eb14e014c92ec151c2374d689acd64d8a0bfea530117e552188",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7a5811f7e32dfdd81e6f96577681a5bf1b71d04a2c4c082e813ec654fd36632d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: "Vistorias" — único cabeçalho da tela — está marcado como <h2>, e a página não possui nenhum <h1> (document.querySelectorAll("h1").length = 0). A lista completa de cabeçalhos do documento é ["H2: Vistorias"].

Esperado: O cabeçalho principal da tela deve ser o nível mais alto da hierarquia (h1), para que a navegação por cabeçalhos tenha um ponto de entrada de primeiro nível.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta · janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(1)>h2" — <h2> "Vistorias"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `consulta de cabeçalhos: headings=["H2: Vistorias"], h1=0` → identificador devolvido por ferramenta (sem arquivo)
- `snapshot a11y ref e45: heading "Vistorias" [level=2]` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-propesc-vistorias h2",
    "relatedSelectors": [],
    "rule": null,
    "observed": "\"Vistorias\" — único cabeçalho da tela — está marcado como <h2>, e a página não possui nenhum <h1> (document.querySelectorAll(\"h1\").length = 0). A lista completa de cabeçalhos do documento é [\"H2: Vistorias\"].",
    "expected": "O cabeçalho principal da tela deve ser o nível mais alto da hierarquia (h1), para que a navegação por cabeçalhos tenha um ponto de entrada de primeiro nível.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "consulta de cabeçalhos: headings=[\"H2: Vistorias\"], h1=0",
      "snapshot a11y ref e45: heading \"Vistorias\" [level=2]"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-7a5811f7e32dfdd81e6f96577681a5bf1b71d04a2c4c082e813ec654fd36632d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7a660545f5f219b1d039fdb77357bdaafd60f14871aec26e811f5f7ae5c268e0

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: margin: -5px 0px 0px (fora da escala: -5px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(5)>button" — <button> "Limpar Filtro"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "div:nth-of-type(1) > pnip-filter-panel > div > div:nth-of-type(5) > button",
    "rule": "ds:token-spacing",
    "observed": "margin: -5px 0px 0px (fora da escala: -5px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-7a660545f5f219b1d039fdb77357bdaafd60f14871aec26e811f5f7ae5c268e0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-852ffcc53c0e44eabac41d1a2f08da3f6a30421bb6cfab31d4cae381e0fcedce

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Page should contain a level-one heading

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:page-has-heading-one

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "axe:page-has-heading-one",
    "observed": "Page should contain a level-one heading",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-852ffcc53c0e44eabac41d1a2f08da3f6a30421bb6cfab31d4cae381e0fcedce",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-85ff1869c491e648eab364e41d07871441b0c233dd2258ce74b21aa270485ae6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Duas colunas da tabela tem <th> sem nenhum texto acessivel a leitores de tela: a 2a coluna (caixa de selecao da linha) e a 9a coluna (botoes de acao). Nao ha texto visivel, texto em classe de leitura exclusiva nem aria-label.

Esperado: Cada cabecalho de coluna deve transmitir programaticamente o proposito da coluna, por texto visivel ou alternativa para leitores de tela (por exemplo 'Selecao' e 'Acoes').

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(2)" — <th>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(9)" — <th>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-234 e S-page-008/F-235 (axe-core, regra empty-table-header, severidade minor: 'Element does not have text that is visible to screen readers')` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: nodes e114 e e122 expostos como 'columnheader' sem nome` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "table thead th:nth-child(2), table thead th:nth-child(9)",
    "rule": "wcag:1.3.1",
    "observed": "Duas colunas da tabela tem <th> sem nenhum texto acessivel a leitores de tela: a 2a coluna (caixa de selecao da linha) e a 9a coluna (botoes de acao). Nao ha texto visivel, texto em classe de leitura exclusiva nem aria-label.",
    "expected": "Cada cabecalho de coluna deve transmitir programaticamente o proposito da coluna, por texto visivel ou alternativa para leitores de tela (por exemplo 'Selecao' e 'Acoes').",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-234 e S-page-008/F-235 (axe-core, regra empty-table-header, severidade minor: 'Element does not have text that is visible to screen readers')",
      "arvore de acessibilidade: nodes e114 e e122 expostos como 'columnheader' sem nome"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-85ff1869c491e648eab364e41d07871441b0c233dd2258ce74b21aa270485ae6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8614b9568c71ff810a6a36034c1c644de32e6e33d74ae81fafa111ff0c4b6110

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: As 10 caixas de seleção de linha não têm id, name, aria-label, aria-labelledby, title nem <label> associado; a árvore de acessibilidade as expõe como "checkbox" sem nome, sem indicar a qual vistoria pertencem.

Esperado: Cada caixa de seleção de linha deve ter nome acessível que identifique a linha (ex.: aria-label="Selecionar vistoria Coral Mansa IV" ou aria-labelledby apontando para a célula do nome da embarcação).

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(2)>input" — <input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y refs e127/e163/e199 — "checkbox" sem nome` → não encontrado na evidência preservada da execução
- `consulta de atributos: id="", aria-label=null, aria-labelledby=null, title=null, label[for]=false, closest(label)=false` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody input[type=\"checkbox\"]",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "As 10 caixas de seleção de linha não têm id, name, aria-label, aria-labelledby, title nem <label> associado; a árvore de acessibilidade as expõe como \"checkbox\" sem nome, sem indicar a qual vistoria pertencem.",
    "expected": "Cada caixa de seleção de linha deve ter nome acessível que identifique a linha (ex.: aria-label=\"Selecionar vistoria Coral Mansa IV\" ou aria-labelledby apontando para a célula do nome da embarcação).",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "snapshot a11y refs e127/e163/e199 — \"checkbox\" sem nome",
      "consulta de atributos: id=\"\", aria-label=null, aria-labelledby=null, title=null, label[for]=false, closest(label)=false"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-8614b9568c71ff810a6a36034c1c644de32e6e33d74ae81fafa111ff0c4b6110",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-864d1681830183b6cf5fd696cdd0f60be43af1c179bcfb7aa1b466ef403c0ca0

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-28dabc8a49f3528f77fddf8a2abab3ce60b6f30b3339050c6377bd1baa2c1e7d — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(6) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-864d1681830183b6cf5fd696cdd0f60be43af1c179bcfb7aa1b466ef403c0ca0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-889906e4c840fc787a1295b629ab26c8b906ae08e7aaf40a08b109fbdd487c32

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os campos #total ("Exibir") e #page ("Página") abrem uma lista de opções ao receber foco (.br-list passa de display:none para block), mas não têm role="combobox", aria-expanded, aria-haspopup nem aria-controls; o botão acionador tem tabindex="-1". A abertura e o fechamento da lista não são expostos à tecnologia assistiva.

Esperado: O campo deve expor seu papel de combobox e o estado da lista (aria-expanded true/false), referenciando a lista via aria-controls.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. focar o campo "Exibir" da paginação

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(3)>nav>div:nth-of-type(1)>br-select-pnip>div>div:nth-of-type(1)>div>input" — <input#total> "Selecione"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(3)>nav>div:nth-of-type(3)>br-select-pnip>div>div:nth-of-type(1)>div>input" — <input#page> "Selecione"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `consulta nos dois selects: {inputRole:null, ariaExpanded:null, ariaHaspopup:null}` → identificador devolvido por ferramenta (sem arquivo)
- `ao focar #total: listaVisivel="block" e ariaExpanded continua null` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML: <button type="button" aria-label="Exibir lista" tabindex="-1" data-trigger="data-trigger">` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-select-pnip input[type=\"text\"]",
    "relatedSelectors": [
      "br-select-pnip .br-list",
      "br-select-pnip button[data-trigger]"
    ],
    "rule": "wcag:4.1.2",
    "observed": "Os campos #total (\"Exibir\") e #page (\"Página\") abrem uma lista de opções ao receber foco (.br-list passa de display:none para block), mas não têm role=\"combobox\", aria-expanded, aria-haspopup nem aria-controls; o botão acionador tem tabindex=\"-1\". A abertura e o fechamento da lista não são expostos à tecnologia assistiva.",
    "expected": "O campo deve expor seu papel de combobox e o estado da lista (aria-expanded true/false), referenciando a lista via aria-controls.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "focar o campo \"Exibir\" da paginação"
      ]
    },
    "evidence": [
      "consulta nos dois selects: {inputRole:null, ariaExpanded:null, ariaHaspopup:null}",
      "ao focar #total: listaVisivel=\"block\" e ariaExpanded continua null",
      "outerHTML: <button type=\"button\" aria-label=\"Exibir lista\" tabindex=\"-1\" data-trigger=\"data-trigger\">"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-889906e4c840fc787a1295b629ab26c8b906ae08e7aaf40a08b109fbdd487c32",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8ab98113fef52cc35cdbd56129cae1acf5c86e4f83527e4dc214aac799ca689a

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-cd1bf589230dd069e95d596ab76a47f1eeff2d20a5b45d248f6be9d4a03a2fff — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(8) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8ab98113fef52cc35cdbd56129cae1acf5c86e4f83527e4dc214aac799ca689a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8bc46032e61a6d6dc61d6a3b890a8516c5207a441513c8ce6e40c3d45a083f66

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:320x640

Observado: Com a janela em 320 px de largura (clientWidth 305 px), a barra de abas não quebra nem rola internamente: o item "Concluídos" se estende até x=478 e "Tramitando" até x=324, exigindo rolagem horizontal da página para alcançar as abas.

Esperado: Em 320 px de largura as abas devem refluir (quebrar em linhas ou rolar dentro do próprio contêiner) sem exigir rolagem horizontal da página.

Janela: 320×640 · interações desde o carregamento: 1. carregar a tela 2. redimensionar a janela para 320x640

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 320x640; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(2)>nav>ul" — <ul> "Agendar Tramitando Concluídos"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `medição em 320x640: {sel:"li.tab-item", right:478, w:154, txt:"Concluídos"} e {sel:"li.tab-item.active", right:324, w:155, txt:"Tramitando"}` → identificador devolvido por ferramenta (sem arquivo)
- `clientWidth=305 px` → identificador devolvido por ferramenta (sem arquivo)
- `validação de seletor: 1 ocorrência de nav.tab-nav ul` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "nav.tab-nav ul",
    "relatedSelectors": [
      "nav.tab-nav li.tab-item"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com a janela em 320 px de largura (clientWidth 305 px), a barra de abas não quebra nem rola internamente: o item \"Concluídos\" se estende até x=478 e \"Tramitando\" até x=324, exigindo rolagem horizontal da página para alcançar as abas.",
    "expected": "Em 320 px de largura as abas devem refluir (quebrar em linhas ou rolar dentro do próprio contêiner) sem exigir rolagem horizontal da página.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 640
      },
      "steps": [
        "carregar a tela",
        "redimensionar a janela para 320x640"
      ]
    },
    "evidence": [
      "medição em 320x640: {sel:\"li.tab-item\", right:478, w:154, txt:\"Concluídos\"} e {sel:\"li.tab-item.active\", right:324, w:155, txt:\"Tramitando\"}",
      "clientWidth=305 px",
      "validação de seletor: 1 ocorrência de nav.tab-nav ul"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-8bc46032e61a6d6dc61d6a3b890a8516c5207a441513c8ce6e40c3d45a083f66",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8bf1187e434fe9ed46c16ff623743019cc3e6c921e2f3255104f9c26ee14a5aa

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(6) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(6) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8bf1187e434fe9ed46c16ff623743019cc3e6c921e2f3255104f9c26ee14a5aa",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8cded0b8947b15d3e4ba830030b67c53b9d3a275c8dcae20c01e40863e3b8ef2

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A tabela de vistorias (9 colunas, 10 linhas, 34 itens paginados) nao tem <caption>, nem aria-label, aria-labelledby ou summary; a arvore de acessibilidade expoe 'table' sem nome. O titulo 'Vistorias' da tela e um <h2> independente, sem associacao programatica com a tabela.

Esperado: A tabela deve ser identificada com <caption> (ou nome acessivel equivalente) descrevendo seu conteudo, e receber descricao contextual quando a complexidade exigir.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-cd705eb5da2a

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table" — <table> "# Nome da embarcação RAEP Data/Hora Vistoria Loc"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM: table.table com hasCaption=false, aria-label=null, aria-labelledby=null, summary=null` → identificador devolvido por ferramenta (sem arquivo)
- `arvore de acessibilidade: node e110 exposto como 'table' sem nome` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-propesc-vistorias table",
    "rule": "govbr-3.7.0-accessibility-global-cd705eb5da2a",
    "observed": "A tabela de vistorias (9 colunas, 10 linhas, 34 itens paginados) nao tem <caption>, nem aria-label, aria-labelledby ou summary; a arvore de acessibilidade expoe 'table' sem nome. O titulo 'Vistorias' da tela e um <h2> independente, sem associacao programatica com a tabela.",
    "expected": "A tabela deve ser identificada com <caption> (ou nome acessivel equivalente) descrevendo seu conteudo, e receber descricao contextual quando a complexidade exigir.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "DOM: table.table com hasCaption=false, aria-label=null, aria-labelledby=null, summary=null",
      "arvore de acessibilidade: node e110 exposto como 'table' sem nome"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-8cded0b8947b15d3e4ba830030b67c53b9d3a275c8dcae20c01e40863e3b8ef2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8d33d330f2ad65d42d48198f434889f128491cb4db6ca53272f14398db8822b7

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A página corrente da paginação é sinalizada só por estilo (classe .active: branco sobre rgb(12,50,111), font-weight 600, contra rgb(19,81,180) transparente nas demais) e pelo atributo não semântico data-current="1" no <nav>. O link ativo não tem aria-current; na árvore de acessibilidade os links 1–4 são expostos apenas como "link 1".."link 4".

Esperado: O link da página corrente deve expor aria-current="page" para que a posição seja programaticamente determinável.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar no link da página 2 da paginação numérica

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>li>a" — <a> "1"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `outerHTML: <a href="javascript:void(0)" class="page active"> 1 </a> com aria-current=null` → não encontrado na evidência preservada da execução
- `estilos comparados: ativo color rgb(255,255,255)/bg rgb(12,50,111)/fw 600 vs inativo color rgb(19,81,180)/bg transparente/fw 400` → não encontrado na evidência preservada da execução
- `snapshot a11y refs e494/e497/e500/e503 — "link 1..4" sem estado` → não encontrado na evidência preservada da execução
- `após ir à página 2: activeLink="2", contador "11– 20 de 34 itens"` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "govbr-custom-pagination a.page.active",
    "relatedSelectors": [
      "govbr-custom-pagination a.page:not(.active)"
    ],
    "rule": "wcag:1.3.1",
    "observed": "A página corrente da paginação é sinalizada só por estilo (classe .active: branco sobre rgb(12,50,111), font-weight 600, contra rgb(19,81,180) transparente nas demais) e pelo atributo não semântico data-current=\"1\" no <nav>. O link ativo não tem aria-current; na árvore de acessibilidade os links 1–4 são expostos apenas como \"link 1\"..\"link 4\".",
    "expected": "O link da página corrente deve expor aria-current=\"page\" para que a posição seja programaticamente determinável.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar no link da página 2 da paginação numérica"
      ]
    },
    "evidence": [
      "outerHTML: <a href=\"javascript:void(0)\" class=\"page active\"> 1 </a> com aria-current=null",
      "estilos comparados: ativo color rgb(255,255,255)/bg rgb(12,50,111)/fw 600 vs inativo color rgb(19,81,180)/bg transparente/fw 400",
      "snapshot a11y refs e494/e497/e500/e503 — \"link 1..4\" sem estado",
      "após ir à página 2: activeLink=\"2\", contador \"11– 20 de 34 itens\""
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-8d33d330f2ad65d42d48198f434889f128491cb4db6ca53272f14398db8822b7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8d87617917d4605481ec845c198395d9e59c4013f21c792032acca749fde7111

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-61b0f575c57922f2491d6c2312a813385a09e1f96cd24a34a53e9b14edc5b401 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(8) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8d87617917d4605481ec845c198395d9e59c4013f21c792032acca749fde7111",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8e4e090bca904c61e1e0c427348f762af17522922f4d6a45221e92a36426b508

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-719e012653c9e138c309d9114860d8c4ca1d23331f29f580175ea72d282d9606 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-b3e7529e3a437858f21a9fedcb26980f3dcedcf07f8b8e43d6d500141e508e1c — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(9) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8e4e090bca904c61e1e0c427348f762af17522922f4d6a45221e92a36426b508",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8ed3e052558a574a957835d055bc037188cc45df97d76828940b3e9f4a965697

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Na aba 'Agendar', o texto do selo de status nas 10 linhas tem contraste de 3,54:1 (primeiro plano #ffffff sobre fundo #888888, 14px, peso normal). E um par de cores distinto do selo da aba 'Tramitando': corrigir um nao corrige o outro.

Esperado: Texto deve ter contraste minimo de 4,5:1 em relacao ao fundo, em todos os pares de cor de status produzidos pelo componente de selo.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa) 2. clicar na aba 'Agendar' (#AGENDAR)

Regra declarada: govbr-3.7.0-accessibility-global-cb09bc0c77c0

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:table tbody tr td:nth-child(7) pnip-status-solicitacao-utils .text-secondary-01" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-012/F-300..F-309 (axe-core, regra color-contrast, severidade serious, 10 elementos, razao medida 3.54; stateDiff em relacao a S-page-008 com added incluindo F-300..F-309)` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody tr td:nth-child(7) pnip-status-solicitacao-utils .text-secondary-01",
    "rule": "govbr-3.7.0-accessibility-global-cb09bc0c77c0",
    "observed": "Na aba 'Agendar', o texto do selo de status nas 10 linhas tem contraste de 3,54:1 (primeiro plano #ffffff sobre fundo #888888, 14px, peso normal). E um par de cores distinto do selo da aba 'Tramitando': corrigir um nao corrige o outro.",
    "expected": "Texto deve ter contraste minimo de 4,5:1 em relacao ao fundo, em todos os pares de cor de status produzidos pelo componente de selo.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)",
        "clicar na aba 'Agendar' (#AGENDAR)"
      ]
    },
    "evidence": [
      "S-page-012/F-300..F-309 (axe-core, regra color-contrast, severidade serious, 10 elementos, razao medida 3.54; stateDiff em relacao a S-page-008 com added incluindo F-300..F-309)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-8ed3e052558a574a957835d055bc037188cc45df97d76828940b3e9f4a965697",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-929bf0a7e7d22ecf20514bcb9cadb90f5432bca6bc1561683c1568a7acb5879e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-d9d058c837d7a226ee252aedac0d3081d5e7e7d1deea30e21093ded6eb031d76 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-ee5e64797680cb09161a6820073c7c7e530cf5b4d2d0ea4233d37a9fd9d356fa — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(5) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-929bf0a7e7d22ecf20514bcb9cadb90f5432bca6bc1561683c1568a7acb5879e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-931d70644ed372ac4dbab431fb542f093fedd815d4de7ebf800cf380ad414686

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Com a lista do filtro 'Cidade' aberta, as 6 opcoes sao renderizadas como <div class="br-radio"><label>Texto</label></div>: nao existe nenhum <input type="radio"> (document.querySelectorAll('pnip-filter-panel .br-radio input') retorna 0), os <label> nao tem atributo for nem controle aninhado, e o container nao expoe role=listbox/radiogroup. As opcoes nao recebem foco, nao tem papel nem estado de selecao.

Esperado: Cada opcao do filtro deve ser um controle real e operavel por teclado — <input type="radio"> associado ao seu <label for>, dentro de um agrupamento com papel e estado de selecao expostos — de modo que a opcao possa ser alcancada, lida e escolhida sem mouse.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa) 2. clicar no acionador de filtro 'Cidade' para abrir a lista de opcoes

Regra declarada: govbr-3.7.0-accessibility-global-e6fd5e1247de

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:pnip-filter-panel .br-radio > label" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM no estado aberto: 6 elementos em 'pnip-filter-panel .br-radio > label', 0 elementos em 'pnip-filter-panel .br-radio input', label sem atributo for` → identificador devolvido por ferramenta (sem arquivo)
- `S-page-011 (axe com o dropdown aberto: stateChanged=true, findings added=[] — o axe nao cobre opcao sem controle, achado sustentado por inspecao direta)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel .br-radio > label",
    "rule": "govbr-3.7.0-accessibility-global-e6fd5e1247de",
    "relatedSelectors": [
      "pnip-filter-panel .br-select .br-list"
    ],
    "observed": "Com a lista do filtro 'Cidade' aberta, as 6 opcoes sao renderizadas como <div class=\"br-radio\"><label>Texto</label></div>: nao existe nenhum <input type=\"radio\"> (document.querySelectorAll('pnip-filter-panel .br-radio input') retorna 0), os <label> nao tem atributo for nem controle aninhado, e o container nao expoe role=listbox/radiogroup. As opcoes nao recebem foco, nao tem papel nem estado de selecao.",
    "expected": "Cada opcao do filtro deve ser um controle real e operavel por teclado — <input type=\"radio\"> associado ao seu <label for>, dentro de um agrupamento com papel e estado de selecao expostos — de modo que a opcao possa ser alcancada, lida e escolhida sem mouse.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)",
        "clicar no acionador de filtro 'Cidade' para abrir a lista de opcoes"
      ]
    },
    "evidence": [
      "DOM no estado aberto: 6 elementos em 'pnip-filter-panel .br-radio > label', 0 elementos em 'pnip-filter-panel .br-radio input', label sem atributo for",
      "S-page-011 (axe com o dropdown aberto: stateChanged=true, findings added=[] — o axe nao cobre opcao sem controle, achado sustentado por inspecao direta)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-931d70644ed372ac4dbab431fb542f093fedd815d4de7ebf800cf380ad414686",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-954c35d2d5f47f76aec0664bc83a8805d1e4889ab99ffb5539609da99e7cde9e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Nenhum elemento .br-footer nem web component <br-footer> no documento (DOM claro e shadow roots abertos).

Esperado: Uma Área de Rodapé com o componente Footer (.br-footer ou <br-footer>), como o Template Base exige.

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:page-footer

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds:page-footer",
    "observed": "Nenhum elemento .br-footer nem web component <br-footer> no documento (DOM claro e shadow roots abertos).",
    "expected": "Uma Área de Rodapé com o componente Footer (.br-footer ou <br-footer>), como o Template Base exige.",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-954c35d2d5f47f76aec0664bc83a8805d1e4889ab99ffb5539609da99e7cde9e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-975028d130b93f641aa6a5ba6981c3abe155a1a9b2332adfbeae88be3346af73

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: Scrollable region must have keyboard access

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: axe:scrollable-region-focusable

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>div>pnip-propesc-trocar-embarcacao>div>div>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Aurora Veloz - RAEP SC99100000 / TIE 9910000000 "

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-embarcacoes",
    "rule": "axe:scrollable-region-focusable",
    "observed": "Scrollable region must have keyboard access",
    "expected": null,
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-975028d130b93f641aa6a5ba6981c3abe155a1a9b2332adfbeae88be3346af73",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-9948ce1dbbe16bec06296361bf04009bf314d6841a30ef2e2f2be4bc0fe8b1f6

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-6341b4d0d71c65cc5e698aec6269b94450f2785ffa61177947917f532001448e — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(10) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-9948ce1dbbe16bec06296361bf04009bf314d6841a30ef2e2f2be4bc0fe8b1f6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-9987ee12bedd284c053f1c46358cb05bf74b3ee3627d53a0b2236df12e659450

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:br-input:nth-child(4) #br-input-9" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-input:nth-child(4) #br-input-9",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-9987ee12bedd284c053f1c46358cb05bf74b3ee3627d53a0b2236df12e659450",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-9ce175f0a387ea8a4162c1a1dd0f593da1eec787e6fbd15fa8495fe0526a84ec

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: Page should contain a level-one heading

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: axe:page-has-heading-one

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Usuária de T"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "axe:page-has-heading-one",
    "observed": "Page should contain a level-one heading",
    "expected": null,
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-9ce175f0a387ea8a4162c1a1dd0f593da1eec787e6fbd15fa8495fe0526a84ec",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-9e505af238a1a0bc0e3828c0b01bdff42ab2b021478f15c9ee27b39bd114d660

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os dois campos do filtro 'Data da vistoria' (inputs #br-input-8 e #br-input-9 nos shadow roots dos hosts br-input) nao tem label, placeholder, aria-label nem aria-labelledby; o texto 'Data da vistoria:' e o separador 'ate' sao spans soltos, sem associacao programatica com nenhum dos dois campos.

Esperado: Cada um dos dois campos deve expor etiqueta propria e programaticamente associada, distinguindo inicio e fim do intervalo (por exemplo 'Data da vistoria - de' e 'Data da vistoria - ate').

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-b95c42b61ed3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>div>br-input:nth-of-type(1)" — <br-input>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>div>br-input:nth-of-type(2)" — <br-input>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-236 e S-page-008/F-237 (axe-core, regra label, severidade critical)` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: nodes e101 e e105 expostos como 'textbox' sem nome` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "div.col-auto.d-flex.align-items-center > br-input",
    "rule": "govbr-3.7.0-accessibility-global-b95c42b61ed3",
    "relatedSelectors": [
      "pnip-propesc-vistorias .br-tag.primary-pastel-01"
    ],
    "observed": "Os dois campos do filtro 'Data da vistoria' (inputs #br-input-8 e #br-input-9 nos shadow roots dos hosts br-input) nao tem label, placeholder, aria-label nem aria-labelledby; o texto 'Data da vistoria:' e o separador 'ate' sao spans soltos, sem associacao programatica com nenhum dos dois campos.",
    "expected": "Cada um dos dois campos deve expor etiqueta propria e programaticamente associada, distinguindo inicio e fim do intervalo (por exemplo 'Data da vistoria - de' e 'Data da vistoria - ate').",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-236 e S-page-008/F-237 (axe-core, regra label, severidade critical)",
      "arvore de acessibilidade: nodes e101 e e105 expostos como 'textbox' sem nome"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-9e505af238a1a0bc0e3828c0b01bdff42ab2b021478f15c9ee27b39bd114d660",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a109da45d5e11dc50e447add786c458d68f6a64c9540b2f932160d6ca60bba8d

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O primeiro link da pagina e o 'Home' do breadcrumb (href="/portal-mpa"), que nao e ancora interna; nao existe link de salto para o conteudo principal antes dele.

Esperado: O primeiro link da pagina deve ser uma ancora interna de salto para o conteudo principal (skip link), permitindo pular as regioes de navegacao.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: ds-page-skip-link

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-002/F-090 (govbr-ds-page, restricao ds-page-skip-link, severidade serious, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds-page-skip-link",
    "observed": "O primeiro link da pagina e o 'Home' do breadcrumb (href=\"/portal-mpa\"), que nao e ancora interna; nao existe link de salto para o conteudo principal antes dele.",
    "expected": "O primeiro link da pagina deve ser uma ancora interna de salto para o conteudo principal (skip link), permitindo pular as regioes de navegacao.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-002/F-090 (govbr-ds-page, restricao ds-page-skip-link, severidade serious, confidence 1, pathway deterministic)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-a109da45d5e11dc50e447add786c458d68f6a64c9540b2f932160d6ca60bba8d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a571c74c37f0ca3a77dbc8404df4b8e385eb4ee80bbbc3b541f8b6646d540fbb

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-0258a2251c421932d6e11f3c0ce23150e365764ed2e697c7e9c5c6825933bb54 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(9) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-a571c74c37f0ca3a77dbc8404df4b8e385eb4ee80bbbc3b541f8b6646d540fbb",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a5a6f9fbbae6bd997efc9f04a56ad9b25c45e2816aeb68c44bae4bf666b54a50

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: O primeiro link da página (href="/portal-mpa", "Home") não é uma âncora interna.

Esperado: O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:page-skip-link

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Vistorias Ex"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds:page-skip-link",
    "observed": "O primeiro link da página (href=\"/portal-mpa\", \"Home\") não é uma âncora interna.",
    "expected": "O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-a5a6f9fbbae6bd997efc9f04a56ad9b25c45e2816aeb68c44bae4bf666b54a50",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a68fd17b65c0962f55e3b583584b9c3776db1c12104a675cd382a10ef00144f9

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-19ca16582dcc40a9305397b4cebe70cf60687de565533ab4f4d5de3991446b95 — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(6) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-a68fd17b65c0962f55e3b583584b9c3776db1c12104a675cd382a10ef00144f9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a867146a9baa8bf2c2cefaa35e0be8c4cdaeafa1a543bf2c12770ec71731c1ae

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-80d427f0aba5699380a544bbe2c85dbca2b581b8471d21c72c60691c2e9c6636 — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(3) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-a867146a9baa8bf2c2cefaa35e0be8c4cdaeafa1a543bf2c12770ec71731c1ae",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a9343a074edbf673350f0edee4cdfdee018154afff41d60fd2a8c6b7aa47b790

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: <li> elements must be contained in a <ul> or <ol>

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:listitem

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(5)>li" — <li> "4"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "li:nth-child(5) > li",
    "rule": "axe:listitem",
    "observed": "<li> elements must be contained in a <ul> or <ol>",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-a9343a074edbf673350f0edee4cdfdee018154afff41d60fd2a8c6b7aa47b790",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a9e2993ac9ebe660057480343ec422316b04f03630434d1df1d35919138e11a4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O terceiro botao de acao de cada linha (icone de olho, 10 instancias) renderiza no shadow root um <button class="secondary middle" aria-label=""> sem texto visivel a leitores de tela, sem aria-labelledby e com title ausente; a arvore de acessibilidade expoe 'button' sem nome, ao contrario dos vizinhos 'Atribuir vistoriador', 'Excluir vistoria' e 'Notificar solicitante da vistoria'.

Esperado: Todo botao deve ter nome acessivel determinavel programaticamente, descrevendo sua acao (por exemplo 'Visualizar vistoria'), via conteudo textual, aria-label nao vazio ou aria-labelledby valido.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button" — <br-button>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-213..F-222 (axe-core 4.12.1, regra button-name, severidade critical, 10 elementos)` → não encontrado na evidência preservada da execução
- `arvore de acessibilidade: nodes e147, e183, e219, e255, e291, e327, e363, e399, e435, e471 expostos como 'button' sem nome` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody tr td:nth-child(9) br-button[icon=\"eye\"]",
    "rule": "wcag:4.1.2",
    "observed": "O terceiro botao de acao de cada linha (icone de olho, 10 instancias) renderiza no shadow root um <button class=\"secondary middle\" aria-label=\"\"> sem texto visivel a leitores de tela, sem aria-labelledby e com title ausente; a arvore de acessibilidade expoe 'button' sem nome, ao contrario dos vizinhos 'Atribuir vistoriador', 'Excluir vistoria' e 'Notificar solicitante da vistoria'.",
    "expected": "Todo botao deve ter nome acessivel determinavel programaticamente, descrevendo sua acao (por exemplo 'Visualizar vistoria'), via conteudo textual, aria-label nao vazio ou aria-labelledby valido.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-213..F-222 (axe-core 4.12.1, regra button-name, severidade critical, 10 elementos)",
      "arvore de acessibilidade: nodes e147, e183, e219, e255, e291, e327, e363, e399, e435, e471 expostos como 'button' sem nome"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-a9e2993ac9ebe660057480343ec422316b04f03630434d1df1d35919138e11a4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-abae331851dac30c108a13298ad31b0bee8c682808290765734dffd570c68651

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: border-radius: 6px fora da escala do DS

Esperado: Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:token-radius

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>div>div:nth-of-type(2)>form>div:nth-of-type(4)>div:nth-of-type(2)>div:nth-of-type(3)>div>textarea" — <textarea> "Complemente aqui o texto da conclusão se desejar" · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "div:nth-of-type(4) > div:nth-of-type(2) > div:nth-of-type(3) > div > textarea",
    "rule": "ds:token-radius",
    "observed": "border-radius: 6px fora da escala do DS",
    "expected": "Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-abae331851dac30c108a13298ad31b0bee8c682808290765734dffd570c68651",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ac71b231b4daea663158801c0e771832a0d118b48cf03ba0b96acc9a1ae7cea0

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-8e1c6e6dfaa6a3ae9b7ab34d5b2172ff399e720d098a46041fe748f07ccb9520 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(6) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-ac71b231b4daea663158801c0e771832a0d118b48cf03ba0b96acc9a1ae7cea0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-af307ca29f85a55d4057c96e59f33ff8e7408f1ce05dcb49f4aee744b95b77c3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O texto "Vistoria agendada" é rgb(255,255,255) sobre bg-blue-40 rgb(79,151,209), 14px peso 500: razão de contraste 3.14:1. Atinge 10 elementos na aba Tramitando.

Esperado: Texto normal (menor que 18,66px em negrito ou 24px) precisa de razão de contraste mínima de 4.5:1 com o fundo.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela

Regra declarada: wcag:1.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `cálculo de contraste sobre getComputedStyle: fg rgb(255,255,255) / bg rgb(79,151,209) = 3.14:1` → não encontrado na evidência preservada da execução
- `selecao-todos.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/selecao-todos.png` (sha256 73cbcfc3dcec)
- `snapshot a11y ref e137` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".br-table .bg-blue-40 .text-secondary-01",
    "relatedSelectors": [],
    "rule": "wcag:1.4.3",
    "observed": "O texto \"Vistoria agendada\" é rgb(255,255,255) sobre bg-blue-40 rgb(79,151,209), 14px peso 500: razão de contraste 3.14:1. Atinge 10 elementos na aba Tramitando.",
    "expected": "Texto normal (menor que 18,66px em negrito ou 24px) precisa de razão de contraste mínima de 4.5:1 com o fundo.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela"
      ]
    },
    "evidence": [
      "cálculo de contraste sobre getComputedStyle: fg rgb(255,255,255) / bg rgb(79,151,209) = 3.14:1",
      "selecao-todos.png",
      "snapshot a11y ref e137"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-af307ca29f85a55d4057c96e59f33ff8e7408f1ce05dcb49f4aee744b95b77c3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-af791e367743cb60728a6b4336a7b4f345e861b9bdfcb40b7504794105dd2996

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-186bf84ebe2669bf2cf857447aa4337f5a835ca376ff49d89291fa259f3be432 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(4) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-af791e367743cb60728a6b4336a7b4f345e861b9bdfcb40b7504794105dd2996",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b17ee9944d0b309ddbd48050d61290d97fb75e3f6d0046beeadf3931c3cbb333

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-0b56e5b10f4881a7605386c84f28bbcd225b3a6127a73c212dad3d0d8c45a4e5 — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(1) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-b17ee9944d0b309ddbd48050d61290d97fb75e3f6d0046beeadf3931c3cbb333",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b1d12b0ff27a9319d348ada403cedb508b4c0ee318fe42d7f547a0742b36fb27

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: border-radius: 20px fora da escala do DS

Esperado: Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:token-radius

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>pnip-header>div>div>div>button" — <button> "Sair" · **oculto**: nao-renderizado, aria-hidden

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-menu > button",
    "rule": "ds:token-radius",
    "observed": "border-radius: 20px fora da escala do DS",
    "expected": "Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-b1d12b0ff27a9319d348ada403cedb508b4c0ee318fe42d7f547a0742b36fb27",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b207406e62afda5885863e76b90b4d58feea2151c114cd3d8e02a4e522886834

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: All page content should be contained by landmarks

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: axe:region

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>pnip-header>div>div>div" — <div#avatar-menu> "Usuária de Teste usuaria.teste@exemplo.invalid S"

### Unidades candidatas (não são crédito)

- U-060619c23f438737b6ceda1f36f200d1431c490df3fd7941c57b2f4a1a8679bc — B-17 · detalhe-menu · cena 1280x900@detalhe-menu · <div#avatar-menu> "Usuária de Teste usuaria.teste@exemplo.invalid S": Menu do avatar (div#avatar-menu.br-list) declara role="menu" e não tem nenhum descendente com papel menuitem: o "Sair" é um <button> sem papel e "Trocar unidade" um <span>. O papel declarado não corresponde ao conteúdo. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: detalhe-menu
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-menu",
    "rule": "axe:region",
    "observed": "All page content should be contained by landmarks",
    "expected": null,
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-b207406e62afda5885863e76b90b4d58feea2151c114cd3d8e02a4e522886834",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b6526606139de7f58dd6d282c044a145a5936abf347f8b29cc9861d3ebbbddbe

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O componente breadcrumb instanciado nesta tela aplica a classe br-breadcrumb a um <div> (raiz do shadow root: <div class="br-breadcrumb">), e nao ha nenhum <nav> no shadow root nem aria-label de navegacao. O seletor aponta o host, pois o elemento infrator esta no shadow root e nao e alcancavel por document.querySelectorAll.

Esperado: br-breadcrumb deve ser aplicado ao elemento canonico <nav> do componente, expondo a regiao de navegacao estrutural.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: ds-structure-breadcrumb-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>br-breadcrumb" — <br-breadcrumb>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-004/F-132 (govbr-ds-structure, restricao ds-structure-breadcrumb-tag, severidade serious, confidence 1, locator 'pnip-root > main > pnip-mpa > pnip-propesc-vistorias > br-breadcrumb >>> div')` → não encontrado na evidência preservada da execução
- `DOM do shadow root: elemento raiz div.br-breadcrumb, 0 elementos <nav>, aria-label=null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-breadcrumb",
    "rule": "ds-structure-breadcrumb-tag",
    "observed": "O componente breadcrumb instanciado nesta tela aplica a classe br-breadcrumb a um <div> (raiz do shadow root: <div class=\"br-breadcrumb\">), e nao ha nenhum <nav> no shadow root nem aria-label de navegacao. O seletor aponta o host, pois o elemento infrator esta no shadow root e nao e alcancavel por document.querySelectorAll.",
    "expected": "br-breadcrumb deve ser aplicado ao elemento canonico <nav> do componente, expondo a regiao de navegacao estrutural.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-004/F-132 (govbr-ds-structure, restricao ds-structure-breadcrumb-tag, severidade serious, confidence 1, locator 'pnip-root > main > pnip-mpa > pnip-propesc-vistorias > br-breadcrumb >>> div')",
      "DOM do shadow root: elemento raiz div.br-breadcrumb, 0 elementos <nav>, aria-label=null"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-b6526606139de7f58dd6d282c044a145a5936abf347f8b29cc9861d3ebbbddbe",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b6adcc1af380b1be87f6c82d11d2dc7378cbaaa7ccf8dc7ddc6013163e50121f

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: No breadcrumb, o item "Home" é um <button> aninhado dentro de um <a href="/portal-mpa">: <li class="crumb home"><a href="/portal-mpa"><button class="br-button small circle" aria-label=""><span class="sr-only">Home</span>...</button></a></li>. A árvore de acessibilidade mostra link "Home" contendo button "Home", e a varredura de focáveis registra os dois elementos — duas paradas de tabulação para uma única ação.

Esperado: O item do breadcrumb deve ser um único controle interativo: ou o link <a>, ou o botão, sem aninhar conteúdo interativo dentro do link.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. inspecionar o shadow DOM de br-breadcrumb 3. varrer elementos focáveis

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta · janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>br-breadcrumb" — <br-breadcrumb>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y refs e34/e35: link "Home" (/url: /portal-mpa) contendo button "Home"` → não encontrado na evidência preservada da execução
- `shadowRoot de br-breadcrumb: <a href="/portal-mpa"><button class="br-button small circle" aria-label="" type="button"><span class="sr-only">Home</span><i class="fas fa-home" aria-hidden="true"></i></button></a>` → não encontrado na evidência preservada da execução
- `varredura de focáveis: "shadow:BR-BREADCRUMB|A|Home" e "shadow:BR-BREADCRUMB|BUTTON|Home"` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-breadcrumb",
    "relatedSelectors": [],
    "rule": null,
    "observed": "No breadcrumb, o item \"Home\" é um <button> aninhado dentro de um <a href=\"/portal-mpa\">: <li class=\"crumb home\"><a href=\"/portal-mpa\"><button class=\"br-button small circle\" aria-label=\"\"><span class=\"sr-only\">Home</span>...</button></a></li>. A árvore de acessibilidade mostra link \"Home\" contendo button \"Home\", e a varredura de focáveis registra os dois elementos — duas paradas de tabulação para uma única ação.",
    "expected": "O item do breadcrumb deve ser um único controle interativo: ou o link <a>, ou o botão, sem aninhar conteúdo interativo dentro do link.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "inspecionar o shadow DOM de br-breadcrumb",
        "varrer elementos focáveis"
      ]
    },
    "evidence": [
      "snapshot a11y refs e34/e35: link \"Home\" (/url: /portal-mpa) contendo button \"Home\"",
      "shadowRoot de br-breadcrumb: <a href=\"/portal-mpa\"><button class=\"br-button small circle\" aria-label=\"\" type=\"button\"><span class=\"sr-only\">Home</span><i class=\"fas fa-home\" aria-hidden=\"true\"></i></button></a>",
      "varredura de focáveis: \"shadow:BR-BREADCRUMB|A|Home\" e \"shadow:BR-BREADCRUMB|BUTTON|Home\""
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-b6adcc1af380b1be87f6c82d11d2dc7378cbaaa7ccf8dc7ddc6013163e50121f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b6bddc2e7119d3f7c434450f22c2ff3324b9fc348a56cb940296337c74039c65

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Nas 7 linhas que já possuem vistoriador, o botão usa o ícone "user-times" (remover usuário) mas mantém title="Atribuir vistoriador"; acioná-lo abre o modal "Atribuir Vistoriador" com a lista de vistoriadores, confirmando que a ação é atribuir/reatribuir. Nas 3 linhas sem vistoriador o ícone é "user-plus" com o mesmo title.

Esperado: O ícone deve corresponder à ação executada e ao nome acessível: usar um ícone de atribuição/edição para a ação de atribuir, ou — se a intenção for desatribuir — alterar a ação e o nome acessível de forma coerente.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. acionar o botão com ícone user-times da linha 2 (Maresia Nova I, vistoriador Paulo Cordeiro Paiva) 3. fechar o modal em "Cancelar"

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button" — <br-button>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `mapa linha→ícone/título: linhas 2,3,4,6,7,8,10 = user-times + title "Atribuir vistoriador"; linhas 1,5,9 (sem vistoriador) = user-plus + mesmo title` → não encontrado na evidência preservada da execução
- `snapshot do modal: dialog "Atribuir Vistoriador" com opções de vistoriador e botões OK/Cancelar` → não encontrado na evidência preservada da execução
- `vistoriador da linha antes do clique: "Paulo Cordeiro Paiva"` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody br-button[icon=\"user-times\"]",
    "relatedSelectors": [
      "table tbody br-button[icon=\"user-plus\"]"
    ],
    "rule": "wcag:4.1.2",
    "observed": "Nas 7 linhas que já possuem vistoriador, o botão usa o ícone \"user-times\" (remover usuário) mas mantém title=\"Atribuir vistoriador\"; acioná-lo abre o modal \"Atribuir Vistoriador\" com a lista de vistoriadores, confirmando que a ação é atribuir/reatribuir. Nas 3 linhas sem vistoriador o ícone é \"user-plus\" com o mesmo title.",
    "expected": "O ícone deve corresponder à ação executada e ao nome acessível: usar um ícone de atribuição/edição para a ação de atribuir, ou — se a intenção for desatribuir — alterar a ação e o nome acessível de forma coerente.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "acionar o botão com ícone user-times da linha 2 (Maresia Nova I, vistoriador Paulo Cordeiro Paiva)",
        "fechar o modal em \"Cancelar\""
      ]
    },
    "evidence": [
      "mapa linha→ícone/título: linhas 2,3,4,6,7,8,10 = user-times + title \"Atribuir vistoriador\"; linhas 1,5,9 (sem vistoriador) = user-plus + mesmo title",
      "snapshot do modal: dialog \"Atribuir Vistoriador\" com opções de vistoriador e botões OK/Cancelar",
      "vistoriador da linha antes do clique: \"Paulo Cordeiro Paiva\""
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-b6bddc2e7119d3f7c434450f22c2ff3324b9fc348a56cb940296337c74039c65",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b8b0ab7168010716c6420e2c9cf67d24728cfa0926d718d323fb775f3297cc8f

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-a536907d260e7d4c81756d2ad78e31444190463c52bbc16565eaa9564d319dd6 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(7) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-b8b0ab7168010716c6420e2c9cf67d24728cfa0926d718d323fb775f3297cc8f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-be02f9e50dac7adbfaf67e7db42831189b200f9b130d5afc663307eaf556564a

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(2) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(2) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-be02f9e50dac7adbfaf67e7db42831189b200f9b130d5afc663307eaf556564a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c056651a210812382f6e82bd02d599316edfcac96063c92a1626d48ab4d0d653

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: padding: 0px 6px (fora da escala: 6px, 6px, 6px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>br-breadcrumb >>> div>ul>li:nth-of-type(1)>a" — <a> "Home" [shadow]

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-root > main > pnip-mpa > pnip-propesc-agendar-vistoria > br-breadcrumb >>> div > ul > li:nth-of-type(1) > a",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 6px (fora da escala: 6px, 6px, 6px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-c056651a210812382f6e82bd02d599316edfcac96063c92a1626d48ab4d0d653",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c16051b27be6566496a742a798d61985b0a67cb0be81d0755dc55b8e30067452

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: A aba ativa é indicada apenas pela classe CSS .active no <li> (cor rgb(12,50,111) e borda inferior de 4px). Os três botões não têm role="tab", aria-selected nem aria-current, e o <ul> não tem role="tablist"; na árvore de acessibilidade as três abas são indistinguíveis. Confirmado também após trocar para "Agendar".

Esperado: O estado selecionado deve ser programaticamente determinável, via padrão de abas (role="tablist"/role="tab" com aria-selected) ou, mantendo os botões, via aria-current na aba ativa.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar na aba "Agendar" 3. clicar na aba "Concluídos" 4. voltar para a aba "Tramitando"

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>button" — <button#TRAMITANDO> "Tramitando"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `outerHTML: <li class="tab-item active"><button id="TRAMITANDO" type="button">` → identificador devolvido por ferramenta (sem arquivo)
- `consulta: AGENDAR/TRAMITANDO/HISTORICO todos com aria-selected=null, aria-current=null, role=null; ul role=null` → não encontrado na evidência preservada da execução
- `snapshot a11y refs e53/e55/e57 — três "button" equivalentes` → não encontrado na evidência preservada da execução
- `após clicar em Agendar: AGENDAR* ativo, aria ainda todos null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "nav.tab-nav li.tab-item.active > button",
    "relatedSelectors": [
      "nav.tab-nav li.tab-item:not(.active) > button"
    ],
    "rule": "wcag:4.1.2",
    "observed": "A aba ativa é indicada apenas pela classe CSS .active no <li> (cor rgb(12,50,111) e borda inferior de 4px). Os três botões não têm role=\"tab\", aria-selected nem aria-current, e o <ul> não tem role=\"tablist\"; na árvore de acessibilidade as três abas são indistinguíveis. Confirmado também após trocar para \"Agendar\".",
    "expected": "O estado selecionado deve ser programaticamente determinável, via padrão de abas (role=\"tablist\"/role=\"tab\" com aria-selected) ou, mantendo os botões, via aria-current na aba ativa.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar na aba \"Agendar\"",
        "clicar na aba \"Concluídos\"",
        "voltar para a aba \"Tramitando\""
      ]
    },
    "evidence": [
      "outerHTML: <li class=\"tab-item active\"><button id=\"TRAMITANDO\" type=\"button\">",
      "consulta: AGENDAR/TRAMITANDO/HISTORICO todos com aria-selected=null, aria-current=null, role=null; ul role=null",
      "snapshot a11y refs e53/e55/e57 — três \"button\" equivalentes",
      "após clicar em Agendar: AGENDAR* ativo, aria ainda todos null"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-c16051b27be6566496a742a798d61985b0a67cb0be81d0755dc55b8e30067452",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c1965ef78a6e657847298628f846f698c68fd3a35a7a69e5564391f0327e17da

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os tres botoes de aba (Agendar, Tramitando, Concluidos) nao tem role=tab, aria-selected nem aria-current, e o <ul> ancestral nao tem role=tablist. A aba ativa e indicada somente pela classe CSS 'active' no <li> pai: no carregamento, li.tab-item.active e 'Tramitando'. Depois de clicar em 'Agendar', a classe migrou e o conteudo da tabela mudou, mas aria-selected permaneceu null nos tres botoes.

Esperado: A aba selecionada deve expor seu estado programaticamente — role=tab com aria-selected=true no botao ativo e false nos demais, dentro de container role=tablist (ou aria-current equivalente) — e nao apenas por classe CSS e estilo visual.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa) 2. clicar na aba 'Agendar' e reinspecionar os atributos dos tres botoes

Regra declarada: govbr-3.7.0-accessibility-global-e038367bd7d6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(1)>button" — <button#AGENDAR> "Agendar"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(2)>button" — <button#TRAMITANDO> "Tramitando"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(2)>nav>ul>li:nth-of-type(3)>button" — <button#HISTORICO> "Concluídos"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `V-002 (verify_finding, live=true, 3 elementos: ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate; stateFingerprint sha256:fc09f343e8c5ce6a1d8ede7553c2adf608fd54aa2b5fc6a86ad1386abfb5a2b0)` → identificador devolvido por ferramenta (sem arquivo)
- `DOM antes e depois do clique: role=null, aria-selected=null, aria-current=null nos 3 botoes; indicador de ativo = class='tab-item active'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".br-tab .tab-item button",
    "rule": "govbr-3.7.0-accessibility-global-e038367bd7d6",
    "relatedSelectors": [
      ".br-tab .tab-nav ul"
    ],
    "observed": "Os tres botoes de aba (Agendar, Tramitando, Concluidos) nao tem role=tab, aria-selected nem aria-current, e o <ul> ancestral nao tem role=tablist. A aba ativa e indicada somente pela classe CSS 'active' no <li> pai: no carregamento, li.tab-item.active e 'Tramitando'. Depois de clicar em 'Agendar', a classe migrou e o conteudo da tabela mudou, mas aria-selected permaneceu null nos tres botoes.",
    "expected": "A aba selecionada deve expor seu estado programaticamente — role=tab com aria-selected=true no botao ativo e false nos demais, dentro de container role=tablist (ou aria-current equivalente) — e nao apenas por classe CSS e estilo visual.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)",
        "clicar na aba 'Agendar' e reinspecionar os atributos dos tres botoes"
      ]
    },
    "evidence": [
      "V-002 (verify_finding, live=true, 3 elementos: ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate; stateFingerprint sha256:fc09f343e8c5ce6a1d8ede7553c2adf608fd54aa2b5fc6a86ad1386abfb5a2b0)",
      "DOM antes e depois do clique: role=null, aria-selected=null, aria-current=null nos 3 botoes; indicador de ativo = class='tab-item active'"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-c1965ef78a6e657847298628f846f698c68fd3a35a7a69e5564391f0327e17da",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c341e07dfb23ad6763998d92236cb1b797d417badd0ba278b7b101b53012b88e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

- U-378ca27cdcd3ddaeff869d2dc65fb85c2dbae1863257673c49fff068452ab683 — B-12 · inicial · cena 1280x900@inicial · <div> "Vistoria agendada": Etiqueta de status "Vistoria agendada" de cada linha: texto branco (rgb 255,255,255; classe text-secondary-01) sobre fundo #4f97d1 (bg-blue-40), 14 px peso 500 — contraste 3,14:1, abaixo de 4,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(7) > td:nth-child(8) > pnip-status-solicitacao-utils > .justify-content-center.d-flex > .pt-1.pb-1.pr-2 > .text-secondary-01.text-center",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-c341e07dfb23ad6763998d92236cb1b797d417badd0ba278b7b101b53012b88e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c723d5335640ad71a372e00d1c1227bd2ed94f8ee2f908eccc5ec79f5b2dec0d

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-4e1a48a085fa1848925675355c50a9f84de93f9ffbc1e0fb5f4f22caaf7a6bfa — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(8) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-c723d5335640ad71a372e00d1c1227bd2ed94f8ee2f908eccc5ec79f5b2dec0d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c78315260577a3a132eecae54b9aa47629a845b5bb247cfbc1884984e9ac3658

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-7426e44eda093679f1f4893f006351774a9c67a087a32d79b722e14b9f9f8923 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(5) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-c78315260577a3a132eecae54b9aa47629a845b5bb247cfbc1884984e9ac3658",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c9eb167933b7044478d8088d43970a7afe53fc6e4e46a14c3e2106148ea404c9

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os dois selects da paginação ("Exibir" e "Página") mantêm o ícone fa-angle-up (seta para cima) tanto com a lista fechada (.br-list display:none) quanto aberta (display:block). Com a lista fechada a seta aponta para cima, indicando recolher; o ícone não muda entre os estados.

Esperado: O ícone deve refletir o estado do select: seta para baixo quando a lista está fechada e para cima quando aberta.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. inspecionar o select "Exibir" fechado 3. focar o campo "Exibir", que abre a lista 4. inspecionar o ícone novamente

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta · janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(3)>nav>div:nth-of-type(1)>br-select-pnip>div>div:nth-of-type(1)>button>i" — <i> · **oculto**: aria-hidden
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>govbr-custom-pagination>div>div:nth-of-type(3)>nav>div:nth-of-type(3)>br-select-pnip>div>div:nth-of-type(1)>button>i" — <i> · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `fechado: {listDisplay:"none", triggerIcon:"fas fa-angle-up"} para label "Exibir" e "Página"` → identificador devolvido por ferramenta (sem arquivo)
- `aberto: {listaDisplay:"block", iconeAberto:"fas fa-angle-up"}` → identificador devolvido por ferramenta (sem arquivo)
- `validação de seletor: 2 ocorrências` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-select-pnip button[data-trigger] i",
    "relatedSelectors": [
      "br-select-pnip .br-list"
    ],
    "rule": null,
    "observed": "Os dois selects da paginação (\"Exibir\" e \"Página\") mantêm o ícone fa-angle-up (seta para cima) tanto com a lista fechada (.br-list display:none) quanto aberta (display:block). Com a lista fechada a seta aponta para cima, indicando recolher; o ícone não muda entre os estados.",
    "expected": "O ícone deve refletir o estado do select: seta para baixo quando a lista está fechada e para cima quando aberta.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "inspecionar o select \"Exibir\" fechado",
        "focar o campo \"Exibir\", que abre a lista",
        "inspecionar o ícone novamente"
      ]
    },
    "evidence": [
      "fechado: {listDisplay:\"none\", triggerIcon:\"fas fa-angle-up\"} para label \"Exibir\" e \"Página\"",
      "aberto: {listaDisplay:\"block\", iconeAberto:\"fas fa-angle-up\"}",
      "validação de seletor: 2 ocorrências"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-c9eb167933b7044478d8088d43970a7afe53fc6e4e46a14c3e2106148ea404c9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-cb39d82e821bf75f7e5b9d461401fb87762f19ebe411fcbf972c733d8f1742fe

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(3) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(3) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-cb39d82e821bf75f7e5b9d461401fb87762f19ebe411fcbf972c733d8f1742fe",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-cd3a8c42338c91e0e9d0de6485c5fdf6a912e03bd3929a5cc38fcf38eb8d8841

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-3bf71c1b9bc5e863496d0227d9b0c52b17896364fce0fa37e170ff35a34c3f1b — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(2) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-cd3a8c42338c91e0e9d0de6485c5fdf6a912e03bd3929a5cc38fcf38eb8d8841",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-cef0fef9ccca8a6b15bcdd030ff8023ecfec2c51da7d2f08137d0353837a20d7

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Ao buscar um termo sem resultados, a tabela e a paginação são removidas e surge o <p>Não há vistorias para exibir.</p>, sem role="status", aria-live ou aria-atomic. Nesse estado a página fica com zero regiões live — a única existente (.pagination-information com aria-live="polite", que anuncia "1– 10 de 34 itens") é removida junto com a paginação. O foco permanece no campo de busca e nada é anunciado.

Esperado: A mensagem de resultado vazio deve ser exposta como mensagem de status (role="status" ou aria-live="polite") para ser anunciada sem receber foco.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. digitar "zzzzzz" no campo "Pesquise aqui ..." 3. pressionar Enter

Regra declarada: wcag:4.1.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:pnip-propesc-vistorias div.d-flex.flex-column.justify-content-center.align-items-center.mt-5 p" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `busca-sem-resultados.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/busca-sem-resultados.png` (sha256 96bb2f457802)
- `estado após Enter: {temTabela:false, p:1, texto:"Não há vistorias para exibir.", liveRegions:[], foco:"BR-INPUT#search"}` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML: <p>Não há vistorias para exibir.</p> sem aria-live/role` → não encontrado na evidência preservada da execução
- `estado com resultados: liveRegions=["DIV|polite|1– 10 de 34 itens"]` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-propesc-vistorias div.d-flex.flex-column.justify-content-center.align-items-center.mt-5 p",
    "relatedSelectors": [],
    "rule": "wcag:4.1.3",
    "observed": "Ao buscar um termo sem resultados, a tabela e a paginação são removidas e surge o <p>Não há vistorias para exibir.</p>, sem role=\"status\", aria-live ou aria-atomic. Nesse estado a página fica com zero regiões live — a única existente (.pagination-information com aria-live=\"polite\", que anuncia \"1– 10 de 34 itens\") é removida junto com a paginação. O foco permanece no campo de busca e nada é anunciado.",
    "expected": "A mensagem de resultado vazio deve ser exposta como mensagem de status (role=\"status\" ou aria-live=\"polite\") para ser anunciada sem receber foco.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "digitar \"zzzzzz\" no campo \"Pesquise aqui ...\"",
        "pressionar Enter"
      ]
    },
    "evidence": [
      "busca-sem-resultados.png",
      "estado após Enter: {temTabela:false, p:1, texto:\"Não há vistorias para exibir.\", liveRegions:[], foco:\"BR-INPUT#search\"}",
      "outerHTML: <p>Não há vistorias para exibir.</p> sem aria-live/role",
      "estado com resultados: liveRegions=[\"DIV|polite|1– 10 de 34 itens\"]"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-cef0fef9ccca8a6b15bcdd030ff8023ecfec2c51da7d2f08137d0353837a20d7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-cf8f875b652c79f8f3e262732d8453b9c97c9429cae27883f69ebcbec9c49346

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-0e3c3cd985ca9f31b3d3465ce348f80f17e37e60b54b2f8671135a6f5e75482f — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-7f3e0abf3655e5a4a709cc014a2b7d516cdb5ccdc9697e86aba1022d0e14db65 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(7) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-cf8f875b652c79f8f3e262732d8453b9c97c9429cae27883f69ebcbec9c49346",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d048d063533f9fdbf6177cc41c03985411a0763241b78bcb43369a304fbab516

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: Os quatro acionadores de filtro (Cidade, Porto, Vistoriador, Status) são <span class="br-tag interaction"> com style="cursor:pointer" e handler de clique, sem tabindex, sem role e sem aria-expanded; não aparecem em nenhuma posição da ordem de tabulação (varredura de focáveis retornou 94 elementos, nenhum deles estes spans) e Escape não fecha a lista aberta.

Esperado: Cada acionador deve ser operável por teclado (elemento button ou role="button" com tabindex="0" acionável por Enter/Espaço) e expor aria-expanded refletindo o estado aberto/fechado da lista.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. varrer elementos focáveis em light DOM e shadow DOM 3. clicar no acionador "Cidade" 4. pressionar Escape

Regra declarada: wcag:2.1.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(1)>span" — <span> "Cidade"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(2)>span" — <span> "Porto"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(3)>span" — <span> "Vistoriador"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(1)>pnip-filter-panel>div>div:nth-of-type(4)>span" — <span> "Status"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `filtro-cidade-aberto.png` → `pipeline/logs/2026-10-02T12-56-12-sem-run1-120f567c-evidencia/filtro-cidade-aberto.png` (sha256 41445e56f6e6)
- `snapshot a11y refs e65/e70/e75/e80 (generic [cursor=pointer], sem role de botão)` → não encontrado na evidência preservada da execução
- `outerHTML de pnip-filter-panel: span.br-tag sem tabindex/role/aria-expanded` → não encontrado na evidência preservada da execução
- `varredura de focáveis: 0 ocorrências de span.br-tag` → identificador devolvido por ferramenta (sem arquivo)
- `após Escape: pnip-filter-panel .br-list.d-block = 1 (continua aberta)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel span.br-tag.interaction.small.bg-pure-0",
    "relatedSelectors": [],
    "rule": "wcag:2.1.1",
    "observed": "Os quatro acionadores de filtro (Cidade, Porto, Vistoriador, Status) são <span class=\"br-tag interaction\"> com style=\"cursor:pointer\" e handler de clique, sem tabindex, sem role e sem aria-expanded; não aparecem em nenhuma posição da ordem de tabulação (varredura de focáveis retornou 94 elementos, nenhum deles estes spans) e Escape não fecha a lista aberta.",
    "expected": "Cada acionador deve ser operável por teclado (elemento button ou role=\"button\" com tabindex=\"0\" acionável por Enter/Espaço) e expor aria-expanded refletindo o estado aberto/fechado da lista.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "varrer elementos focáveis em light DOM e shadow DOM",
        "clicar no acionador \"Cidade\"",
        "pressionar Escape"
      ]
    },
    "evidence": [
      "filtro-cidade-aberto.png",
      "snapshot a11y refs e65/e70/e75/e80 (generic [cursor=pointer], sem role de botão)",
      "outerHTML de pnip-filter-panel: span.br-tag sem tabindex/role/aria-expanded",
      "varredura de focáveis: 0 ocorrências de span.br-tag",
      "após Escape: pnip-filter-panel .br-list.d-block = 1 (continua aberta)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-d048d063533f9fdbf6177cc41c03985411a0763241b78bcb43369a304fbab516",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d07f7388255e5e7cb856a568f18624c45ec9165ea10d1d22dd6f51fbf19489c8

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O botao 'Buscar' da barra de busca tem margin: -38px 4px 0px 0px, com -38px fora da escala de espacamento do DS — deslocamento negativo usado para posicionar o botao sobre o campo.

Esperado: Valores de margem devem pertencer a escala de espacamento do gov.br DS (tokens --spacing-scale-*), sem deslocamentos negativos arbitrarios.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: ds-token-spacing

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(2)>pnip-search-table-utils>div>div>div>button" — <button> "Buscar"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-010/F-256 (govbr-ds-token, regra ds-token-spacing, severidade minor, confidence 1, pathway deterministic)` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-search-table-utils button",
    "rule": "ds-token-spacing",
    "observed": "O botao 'Buscar' da barra de busca tem margin: -38px 4px 0px 0px, com -38px fora da escala de espacamento do DS — deslocamento negativo usado para posicionar o botao sobre o campo.",
    "expected": "Valores de margem devem pertencer a escala de espacamento do gov.br DS (tokens --spacing-scale-*), sem deslocamentos negativos arbitrarios.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-010/F-256 (govbr-ds-token, regra ds-token-spacing, severidade minor, confidence 1, pathway deterministic)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-d07f7388255e5e7cb856a568f18624c45ec9165ea10d1d22dd6f51fbf19489c8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d16381a4fbbea673480ee1d2b0debe89051d19977f9aac886eeac1c72c9a5b67

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O acionador do menu do usuario ('Olá, Usuária de Teste, SUPERVISOR') controla o dropdown #avatar-menu, mas nao possui aria-expanded, aria-haspopup nem aria-controls. Apos o clique que abre o menu (container passa de display:none/aria-hidden=true para display:block/aria-hidden=false), aria-expanded permanece null; o foco tambem continua no proprio acionador.

Esperado: O acionador de um menu suspenso deve expor aria-haspopup, referenciar o menu com aria-controls e refletir o estado com aria-expanded alternando entre false e true conforme o menu feche e abra.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa) 2. clicar no acionador do avatar para abrir o menu 3. reinspecionar os atributos do acionador e do container 4. clicar novamente para fechar

Regra declarada: govbr-3.7.0-accessibility-global-e038367bd7d6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>pnip-header>div>div>button" — <button#avatar-dropdown-trigger> "Avatar com dropdown"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM fechado: aria-expanded=null, aria-haspopup=null, aria-controls=null; container .br-list.dropdown-menu com display:none, hidden e aria-hidden=true` → identificador devolvido por ferramenta (sem arquivo)
- `DOM aberto: container com display:block e aria-hidden=false, acionador ainda com aria-expanded=null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-dropdown-trigger",
    "rule": "govbr-3.7.0-accessibility-global-e038367bd7d6",
    "relatedSelectors": [
      "#avatar-menu"
    ],
    "observed": "O acionador do menu do usuario ('Olá, Usuária de Teste, SUPERVISOR') controla o dropdown #avatar-menu, mas nao possui aria-expanded, aria-haspopup nem aria-controls. Apos o clique que abre o menu (container passa de display:none/aria-hidden=true para display:block/aria-hidden=false), aria-expanded permanece null; o foco tambem continua no proprio acionador.",
    "expected": "O acionador de um menu suspenso deve expor aria-haspopup, referenciar o menu com aria-controls e refletir o estado com aria-expanded alternando entre false e true conforme o menu feche e abra.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)",
        "clicar no acionador do avatar para abrir o menu",
        "reinspecionar os atributos do acionador e do container",
        "clicar novamente para fechar"
      ]
    },
    "evidence": [
      "DOM fechado: aria-expanded=null, aria-haspopup=null, aria-controls=null; container .br-list.dropdown-menu com display:none, hidden e aria-hidden=true",
      "DOM aberto: container com display:block e aria-hidden=false, acionador ainda com aria-expanded=null"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-d16381a4fbbea673480ee1d2b0debe89051d19977f9aac886eeac1c72c9a5b67",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d20cb3446e54fffae04cf791b1212b219b5fda4aa10f951c13401867c5928f16

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-6ee11b5414617b1588a795c9ff95c7ee16756d82512b41d92507434edd975bfd — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(10) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-d20cb3446e54fffae04cf791b1212b219b5fda4aa10f951c13401867c5928f16",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d255bd41d2e89ae6ef7c59628978de128ec8d43ebe6eaeea4dea0498a7e8a7c7

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(9)>div>div:nth-of-type(4)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-00d1141e08ad376117efa9541fe624b5c5501835885644a09a6557220f9290e3 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(8) > td:nth-of-type(9) > div > div:nth-of-type(4) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-d255bd41d2e89ae6ef7c59628978de128ec8d43ebe6eaeea4dea0498a7e8a7c7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d501b6c3f1caea359b937c04276cd260a2c67a2a51f42fcd0f3e7609efb4780e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: O primeiro link da página (href="/portal-mpa", "Home") não é uma âncora interna.

Esperado: O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:page-skip-link

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Usuária de T"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds:page-skip-link",
    "observed": "O primeiro link da página (href=\"/portal-mpa\", \"Home\") não é uma âncora interna.",
    "expected": "O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-d501b6c3f1caea359b937c04276cd260a2c67a2a51f42fcd0f3e7609efb4780e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d50d85df7cb361077d03b82ca23573f13fdf7f0c2ed4aebe43b529acdc4b4885

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-agendar-vistoria>div>div:nth-of-type(2)>form>pnip-propesc-nao-comparecimento>div>div:nth-of-type(2)>div>div>textarea" — <textarea>

### Unidades candidatas (não são crédito)

- U-238f9e8879e41566f840160f72c03e67a02b73d7a42128f02a5935cc250e0e6f — B-20 · detalhe-menu · cena 1280x900@detalhe-menu · <textarea>: Detalhe da vistoria de não comparecimento: a <textarea> do motivo tem um <label> "Descrever o motivo do não comparecimento" como irmão, mas sem for (e a textarea sem id): o rótulo não está associado; nome acessível vazio. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: detalhe-menu
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "textarea",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-d50d85df7cb361077d03b82ca23573f13fdf7f0c2ed4aebe43b529acdc4b4885",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dae0ae76d3b6a2f8da692c942b50779fdf4144dea3ec8e165bfbe778b542b493

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-3ec4428dd5adf38650270e029ad19fabdea037fa2d7ea63fc5e8caed85ad1047 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(2) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-dae0ae76d3b6a2f8da692c942b50779fdf4144dea3ec8e165bfbe778b542b493",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-db7037d3ac42687e8108b8dea83a6aaebad3f296b3794c5e0c8dc5bdb2e7d18e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-2b33b7eba5e9c5af4e4fbea1a344d0a19086aa2b6a02cb38d30d56d8de042000 — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(7) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-db7037d3ac42687e8108b8dea83a6aaebad3f296b3794c5e0c8dc5bdb2e7d18e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dc6886df4a96b2ad40ddd41cd5b422960bae00e50d80d828b5dbeec31629cdca

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:br-input:nth-child(2) #br-input-8" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "br-input:nth-child(2) #br-input-8",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-dc6886df4a96b2ad40ddd41cd5b422960bae00e50d80d828b5dbeec31629cdca",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dc8efa067efc221cb3573c15675444c54fc227a229db8477f8b3d567e78cbd86

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-a80ba4fa0e4e8dcc3209bd5f984d110e3d9b52df1b836a9579647be5634914aa — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(5) > td:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-dc8efa067efc221cb3573c15675444c54fc227a229db8477f8b3d567e78cbd86",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ddccc56beb8d81ff2b560146b705426294b3b9c10a6a82b83aa676e4cbeee720

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-10a37dc0d8c4dfcdb169ccb9616aa37cb63dc2ef443778ecb5719fde1e491f5c — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(5) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-ddccc56beb8d81ff2b560146b705426294b3b9c10a6a82b83aa676e4cbeee720",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-df08f2f013d09c8a1c489cae3fa5db18d15839866186f39b7ceb66719f2c098a

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: margin: -38px 4px 0px 0px (fora da escala: -38px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(2)>pnip-search-table-utils>div>div>div>button" — <button> "Buscar"

### Unidades candidatas (não são crédito)

- U-3993a821217adf04163bb635bbef658eeedd7f545eec0c26ed68d7166e39e8f6 — B-09 · inicial · cena 1280x900@inicial · <button> "Buscar": Botão "Buscar" da busca: button.br-button só com ícone (lupa), 32×32, sem a classe circle — sem rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-cc6c46e167e0d20868ba66ed04918cd88020fedbf3ffcdb7395251824f07d313 — B-28 · inicial · cena 1280x900@inicial · <button> "Buscar": Escalada E-07, origem: "autora" (decisão da escalada, 2026-10-01, D-61). O botão de ícone "Buscar", montado pelo app fora do br-input, mede 32×32 px: abaixo da área de toque de 48×48. Tamanhos padrão do DS (br-button de 40 px, Menu e Home dos web components, paginação) ficam como fundo. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-search-table-utils > div > div > div > button",
    "rule": "ds:token-spacing",
    "observed": "margin: -38px 4px 0px 0px (fora da escala: -38px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-df08f2f013d09c8a1c489cae3fa5db18d15839866186f39b7ceb66719f2c098a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e41b3f1804d331e58a9d8c6d054841c9b33536daab04caca14f1418d6c82b1a9

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O título do documento é "PNIP" — apenas a sigla da plataforma — e não identifica a tela exibida, cujo conteúdo é a listagem de Vistorias (heading "Vistorias"). O título permanece "PNIP" em todas as abas e estados percorridos, inclusive após trocar para "Agendar" e "Concluídos".

Esperado: O título deve descrever o tópico ou finalidade da tela, por exemplo "Vistorias — PNIP".

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. alternar entre as abas Agendar, Tramitando e Concluídos

Regra declarada: wcag:2.4.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "head>title" — <title> "PNIP" · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `document.title = "PNIP" em todas as leituras` → identificador devolvido por ferramenta (sem arquivo)
- `heading da tela: H2 "Vistorias"` → identificador devolvido por ferramenta (sem arquivo)
- `Page Title relatado pela ferramenta em todas as navegações: "PNIP"` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "title",
    "relatedSelectors": [
      "pnip-propesc-vistorias h2"
    ],
    "rule": "wcag:2.4.2",
    "observed": "O título do documento é \"PNIP\" — apenas a sigla da plataforma — e não identifica a tela exibida, cujo conteúdo é a listagem de Vistorias (heading \"Vistorias\"). O título permanece \"PNIP\" em todas as abas e estados percorridos, inclusive após trocar para \"Agendar\" e \"Concluídos\".",
    "expected": "O título deve descrever o tópico ou finalidade da tela, por exemplo \"Vistorias — PNIP\".",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "alternar entre as abas Agendar, Tramitando e Concluídos"
      ]
    },
    "evidence": [
      "document.title = \"PNIP\" em todas as leituras",
      "heading da tela: H2 \"Vistorias\"",
      "Page Title relatado pela ferramenta em todas as navegações: \"PNIP\""
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-e41b3f1804d331e58a9d8c6d054841c9b33536daab04caca14f1418d6c82b1a9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e7211c85e8701ce0192189140423cfda0b6972d27c9d248ee03894f3c3ef2d40

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O texto do selo de status 'Vistoria agendada' nas 10 linhas da aba 'Tramitando' tem contraste de 3,14:1 (primeiro plano #ffffff sobre fundo #4f97d1, 14px, peso normal).

Esperado: Texto deve ter contraste minimo de 4,5:1 em relacao ao fundo; para 14px e peso normal nao se aplica a excecao de texto grande.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-cb09bc0c77c0

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(1)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(10)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(3)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(4)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(8)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"
- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(9)>td:nth-of-type(8)>pnip-status-solicitacao-utils>div>div>div" — <div> "Vistoria agendada"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `S-page-008/F-224..F-233 (axe-core, regra color-contrast, severidade serious, 10 elementos, razao medida 3.14)` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "table tbody tr td:nth-child(8) pnip-status-solicitacao-utils .text-secondary-01",
    "rule": "govbr-3.7.0-accessibility-global-cb09bc0c77c0",
    "observed": "O texto do selo de status 'Vistoria agendada' nas 10 linhas da aba 'Tramitando' tem contraste de 3,14:1 (primeiro plano #ffffff sobre fundo #4f97d1, 14px, peso normal).",
    "expected": "Texto deve ter contraste minimo de 4,5:1 em relacao ao fundo; para 14px e peso normal nao se aplica a excecao de texto grande.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "S-page-008/F-224..F-233 (axe-core, regra color-contrast, severidade serious, 10 elementos, razao medida 3.14)"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-e7211c85e8701ce0192189140423cfda0b6972d27c9d248ee03894f3c3ef2d40",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ecd1dfeda07134848d632f95066e190598820528e21d7589ad8c6a7420753743

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>thead>tr>th:nth-of-type(2)>input" — <input>

### Unidades candidatas (não são crédito)

- U-50a27493b185c0bbb0179208240a74e28e88df151508b8845c55406c1030426e — B-06 · inicial · cena 1280x900@inicial · <input>: As 11 caixas de seleção da tabela (a do cabeçalho, que seleciona todas, e uma por linha) não têm rótulo: nenhum <label>, aria-label nem aria-labelledby; nome acessível vazio na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "th:nth-child(2) > input[type=\"checkbox\"]",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-ecd1dfeda07134848d632f95066e190598820528e21d7589ad8c6a7420753743",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ecf9ce24d1a7bd185dd6d6aadef59fc7aa42cd777471f201d7224246e5e489e6

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: border-radius: 20px fora da escala do DS

Esperado: Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:token-radius

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>pnip-header>div>div>div>button" — <button> "Sair" · **oculto**: nao-renderizado, aria-hidden

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#avatar-menu > button",
    "rule": "ds:token-radius",
    "observed": "border-radius: 20px fora da escala do DS",
    "expected": "Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-ecf9ce24d1a7bd185dd6d6aadef59fc7aa42cd777471f201d7224246e5e489e6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-edac5b59bce8ca92de98a8a1b89ca24cbce82bbb88e714f115a1564ca1bba7a8

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@detalhe-menu

Observado: Nenhum elemento .br-footer nem web component <br-footer> no documento (DOM claro e shadow roots abertos).

Esperado: Uma Área de Rodapé com o componente Footer (.br-footer ou <br-footer>), como o Template Base exige.

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até detalhe-menu (3 passo(s))

Regra declarada: ds:page-footer

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Usuária de T"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds:page-footer",
    "observed": "Nenhum elemento .br-footer nem web component <br-footer> no documento (DOM claro e shadow roots abertos).",
    "expected": "Uma Área de Rodapé com o componente Footer (.br-footer ou <br-footer>), como o Template Base exige.",
    "scene": "1280x900@detalhe-menu",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até detalhe-menu (3 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-edac5b59bce8ca92de98a8a1b89ca24cbce82bbb88e714f115a1564ca1bba7a8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-efed299ace67f8eeaa6fd6fa9431187870900948c39e483d8831a72bad9d58c4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: No modal "Atribuir Vistoriador", o <select> de vistoriadores não tem aria-label, aria-labelledby, title nem <label for="swal2-select">; a árvore de acessibilidade o expõe como "combobox" sem nome. O texto visível "Selecione um Vistoriador" está em #swal2-html-container, usado como aria-describedby do diálogo, não como rótulo do campo.

Esperado: O select deve ter nome acessível próprio (ex.: aria-label="Selecione um Vistoriador" ou aria-labelledby="swal2-html-container").

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. acionar o botão de atribuir vistoriador da linha 2 (Maresia Nova I)

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:#swal2-select" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y: combobox [active] [ref=e745] sem nome, dentro de dialog "Atribuir Vistoriador"` → identificador devolvido por ferramenta (sem arquivo)
- `consulta de atributos: ariaLabel=null, ariaLabelledby=null, labelFor=false, dentroDeLabel=false, title=null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#swal2-select",
    "relatedSelectors": [
      "#swal2-html-container"
    ],
    "rule": "wcag:4.1.2",
    "observed": "No modal \"Atribuir Vistoriador\", o <select> de vistoriadores não tem aria-label, aria-labelledby, title nem <label for=\"swal2-select\">; a árvore de acessibilidade o expõe como \"combobox\" sem nome. O texto visível \"Selecione um Vistoriador\" está em #swal2-html-container, usado como aria-describedby do diálogo, não como rótulo do campo.",
    "expected": "O select deve ter nome acessível próprio (ex.: aria-label=\"Selecione um Vistoriador\" ou aria-labelledby=\"swal2-html-container\").",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "acionar o botão de atribuir vistoriador da linha 2 (Maresia Nova I)"
      ]
    },
    "evidence": [
      "snapshot a11y: combobox [active] [ref=e745] sem nome, dentro de dialog \"Atribuir Vistoriador\"",
      "consulta de atributos: ariaLabel=null, ariaLabelledby=null, labelFor=false, dentroDeLabel=false, title=null"
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-efed299ace67f8eeaa6fd6fa9431187870900948c39e483d8831a72bad9d58c4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f04f7b7241c4e2f710fb440318b499b71a22ae30c1193f09b9cbad529078fad6

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(5)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-d1ef6c8b7de732ce0cc20c8f4af61e9023217ac2944c179ffc72c2b5d7d6bf30 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(5) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-f04f7b7241c4e2f710fb440318b499b71a22ae30c1193f09b9cbad529078fad6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f2afd7114a98ee57ead8c217b7c85c71d1c79006b3189ce121443f223ff12c25

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(2)>td:nth-of-type(9)>div>div:nth-of-type(2)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-12016f38bbfe6f3d2ddf321f52931758cf1254bf4eeefc27fb37ce683c6c5ce2 — B-07 · inicial · cena 1280x900@inicial · <button> [shadow]: O botão de abrir a vistoria (ícone de olho) de cada linha não tem nome acessível: sem texto, aria-label vazio, sem title (o hospedeiro br-button também não tem title, ao contrário das outras três ações da linha). Papel button com nome "" na árvore do Chromium. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-377e0c75de9f9a39252a341918da83b93669c82f954178b59b446ff438c5d245 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(2) > td:nth-of-type(9) > div > div:nth-of-type(2) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-f2afd7114a98ee57ead8c217b7c85c71d1c79006b3189ce121443f223ff12c25",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f2cc278f1f6669eb9efab5763577ef84f3b8417da2101d48c409d693bfb45234

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Buttons must have discernible text

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:button-name

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:tr:nth-child(10) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-child(10) > td:nth-child(9) > .d-flex > div:nth-child(2) > br-button[icon=\"eye\"][type=\"secondary\"] .secondary.middle[aria-label=\"\"]",
    "rule": "axe:button-name",
    "observed": "Buttons must have discernible text",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-f2cc278f1f6669eb9efab5763577ef84f3b8417da2101d48c409d693bfb45234",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f37929251829b2b1e8afa35e831d52d192946bed655120c014468d9367288124

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O campo de busca da tabela (input#search no shadow root do host br-input) nao tem label nem aria-label; sua unica identificacao e o placeholder 'Pesquise aqui ...', que desaparece ao digitar e nao constitui etiqueta.

Esperado: O campo de busca deve ter etiqueta persistente e programaticamente associada (por exemplo <label for="search">Pesquisar vistorias</label> ou aria-label equivalente), nao apenas placeholder.

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela no estado padrao (aba 'Tramitando' ativa)

Regra declarada: govbr-3.7.0-accessibility-global-b95c42b61ed3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(1)>div:nth-of-type(2)>pnip-search-table-utils>div>div>div>br-input" — <br-input#search> "Pesquise aqui ..."

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `DOM: input#search com placeholder='Pesquise aqui ...', aria-label=null, aria-labelledby=null, nenhum label[for='search'] no documento e nenhum label ancestral` → identificador devolvido por ferramenta (sem arquivo)
- `arvore de acessibilidade: node e93 exposto como textbox nomeado apenas pelo placeholder` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-search-table-utils br-input",
    "rule": "govbr-3.7.0-accessibility-global-b95c42b61ed3",
    "observed": "O campo de busca da tabela (input#search no shadow root do host br-input) nao tem label nem aria-label; sua unica identificacao e o placeholder 'Pesquise aqui ...', que desaparece ao digitar e nao constitui etiqueta.",
    "expected": "O campo de busca deve ter etiqueta persistente e programaticamente associada (por exemplo <label for=\"search\">Pesquisar vistorias</label> ou aria-label equivalente), nao apenas placeholder.",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela no estado padrao (aba 'Tramitando' ativa)"
      ]
    },
    "evidence": [
      "DOM: input#search com placeholder='Pesquise aqui ...', aria-label=null, aria-labelledby=null, nenhum label[for='search'] no documento e nenhum label ancestral",
      "arvore de acessibilidade: node e93 exposto como textbox nomeado apenas pelo placeholder"
    ]
  },
  "scope": [
    "tela inteira de Vistorias (perfil mpa/SUPERVISOR), estado padrao de carregamento em 1440x900 com a aba 'Tramitando' ativa",
    "regioes: header/avatar, breadcrumb, titulo e acao 'Exportar Vistorias', abas, painel de filtros, busca, filtro de data, tabela de vistorias, paginacao, acao 'Voltar'",
    "estados adicionais percorridos: dropdown do filtro 'Cidade' aberto, dropdown do avatar aberto, aba 'Agendar' ativa"
  ],
  "notes": "Interacoes executadas: resize para 1440x900; snapshot da arvore de acessibilidade; clique no avatar (abre e fecha o dropdown, verificando aria-expanded antes/depois); clique no filtro 'Cidade' (abre e fecha a lista de opcoes); clique na aba 'Agendar' (classe active migra e o conteudo da tabela muda); inspecao de DOM/estilos computados em light DOM e shadow roots abertos; levantamento da ordem de foco sequencial (84 focaveis em light DOM + shadow roots abertos) para confirmar que os acionadores de filtro nao sao alcancaveis por Tab. | Varreduras do oraculo: scan_page page (S-page-002), structure (S-page-004, S-page-007), axe (S-page-008, estado padrao), tokens color/font (S-page-009, sem achados), tokens radius/spacing (S-page-010), axe com dropdown de filtro aberto (S-page-011, stateChanged=true e nenhum finding novo), axe na aba Agendar (S-page-012, 11 findings adicionais). Uma varredura por estado; evidencia recuperada por scanId/cursor sem repetir varredura. | Verificacao: verify_finding executado nos dois achados heuristicos mais estruturais (V-001 filtros por teclado, V-002 estado das abas). Em ambos ruleExists=pass, applicability=pass, evidenceConsistent=pass e violation=no-predicate — o oraculo nao implementa predicado mecanico para regras de ARIA/teclado, de modo que o veredito e 'unverifiable' por ausencia de predicado, nao por contradicao. Os demais achados de ARIA/rotulagem cairiam no mesmo no-predicate e nao foram reenviados individualmente. | Limitacao de expressividade do seletor: a pagina e composta por web components com shadow roots abertos (br-button, br-input, br-breadcrumb, br-header, br-divider). Como o seletor do relatorio e executado com document.querySelectorAll, que nao atravessa shadow DOM, os achados cujo elemento infrator vive no shadow root foram ancorados no elemento host correspondente (br-button[icon=eye], br-input, br-breadcrumb), indicado explicitamente em 'observed'. | Limitacao registrada: o achado determinista ds-token-spacing de padding 0px 6px no <a> interno do br-breadcrumb (S-page-010/F-257) nao foi reportado porque seu sujeito esta no shadow root e nao e alcancavel por document.querySelectorAll; ancorar no host br-breadcrumb descreveria outro elemento. | Limitacao de orcamento: as chamadas scan_page com checks=structure para o conjunto completo de componentes e para 'button' excederam o limite de resposta da ferramenta (saida arquivada em disco, cuja leitura foi negada por permissao). A cobertura de structure foi obtida por lotes menores (table/pagination/breadcrumb/tab), complementada por inspecao direta de DOM; nao se pode afirmar cobertura exaustiva de constraints ds-structure-* para os demais 32 componentes. | Candidatos avaliados e REJEITADOS: (a) botao 'Sair' do dropdown do avatar focavel com o menu fechado — rejeitado, o container tem display:none e atributo hidden, logo esta fora da ordem de foco; (b) suposta divergencia entre a aba ativa e o conteudo exibido — rejeitado, no carregamento li.tab-item.active e 'Tramitando' e a tabela corresponde a essa aba, confirmado ao clicar em 'Agendar' e observar a troca de colunas e de dados; (c) ausencia de lang — rejeitado, html[lang='pt-br'] presente; (d) celulas vazias na coluna 'Vistoriador' (linhas 1, 5 e 9) — rejeitado, representam vistoria sem vistoriador atribuido, nao defeito de interface; (e) tokens de cor e de fonte — rejeitado, scan de tokens color/font sem achados. | Candidatos deixados explicitamente INCERTOS, nao reportados como achado: (a) links de paginacao com href='javascript:void(0)' acionando funcao em vez de navegacao — a marcacao canonica de paginacao do proprio DS usa <a class='page'>, e o axe nao acusa; nao consigo sustentar atribuicao normativa sem gabarito; (b) atributo href='javascript:void(0)' em <button class='br-item dropdown-button'> (item 'Sair') — atributo invalido para <button>, porem sem impacto observavel de uso e sem check do oraculo que o cubra."
}
````

### Decisão

````json
{
  "cardId": "C-f37929251829b2b1e8afa35e831d52d192946bed655120c014468d9367288124",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f7ae52ef43c766d4315fec86389ea8155836e8f83ffe76eef93224d970b02329

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:1440x900

Observado: O botão que remove um filtro aplicado (ícone "×") não tem aria-label, title nem texto: a árvore de acessibilidade o expõe como button "" (nome vazio). O glifo do FontAwesome vem de ::before e não compõe nome acessível.

Esperado: O botão de remoção deve ter nome acessível identificando o filtro removido (ex.: aria-label="Remover filtro Barra Nova").

Janela: 1440×900 · interações desde o carregamento: 1. carregar a tela 2. clicar no acionador "Cidade" 3. clicar na opção "Barra Nova"

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 1440x900; sujeitos lidos na cena 1280x900@inicial, sem âncora em unidade

### Sujeitos

- "unresolved:pnip-filter-panel span.br-tag.interaction.small:not(.bg-pure-0) button.br-button" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `snapshot a11y ref e557 — button "" [cursor=pointer]` → identificador devolvido por ferramenta (sem arquivo)
- `outerHTML: <button type="button" class="br-button inverted circle"><i class="fas fa-times"></i></button>` → não encontrado na evidência preservada da execução
- `consulta de atributos: aria-label=null, title=null, textContent=""` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "pnip-filter-panel span.br-tag.interaction.small:not(.bg-pure-0) button.br-button",
    "relatedSelectors": [],
    "rule": "wcag:4.1.2",
    "observed": "O botão que remove um filtro aplicado (ícone \"×\") não tem aria-label, title nem texto: a árvore de acessibilidade o expõe como button \"\" (nome vazio). O glifo do FontAwesome vem de ::before e não compõe nome acessível.",
    "expected": "O botão de remoção deve ter nome acessível identificando o filtro removido (ex.: aria-label=\"Remover filtro Barra Nova\").",
    "state": {
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "steps": [
        "carregar a tela",
        "clicar no acionador \"Cidade\"",
        "clicar na opção \"Barra Nova\""
      ]
    },
    "evidence": [
      "snapshot a11y ref e557 — button \"\" [cursor=pointer]",
      "outerHTML: <button type=\"button\" class=\"br-button inverted circle\"><i class=\"fas fa-times\"></i></button>",
      "consulta de atributos: aria-label=null, title=null, textContent=\"\""
    ]
  },
  "scope": [
    "tela inteira de Vistorias: cabeçalho gov.br e avatar, breadcrumb, título e ação Exportar, abas Agendar/Tramitando/Concluídos, painel de filtros por chip, campo de busca, filtro de intervalo de datas, tabela de vistorias com seleção e ações por linha, paginação numérica e seletores Exibir/Página, modal \"Atribuir Vistoriador\", estado sem resultados e viewport 320x640"
  ],
  "notes": "Nenhuma ferramenta de oráculo (consulta de regras, scan_page ou verificação de achados) estava disponível nesta execução; por isso os identificadores de regra foram atribuídos apenas quando justificáveis por WCAG, e usei \"rule\": null nos defeitos de comportamento e estrutura sem critério normativo que eu pudesse sustentar. Interações executadas: carga inicial em 1440x900; snapshot da árvore de acessibilidade em cada estado; abertura do filtro \"Cidade\" por mouse e tentativa de fechá-lo com Escape (não fecha); aplicação e remoção do filtro Cidade=Barra Nova; aplicação e limpeza do intervalo de datas 25/03/2026–31/03/2026; marcação da caixa \"selecionar todos\" do cabeçalho; navegação para a página 2 da paginação (numérica e seletor \"Página\" permanecem sincronizados); foco por teclado no seletor \"Exibir\" (a lista abre ao focar); troca para as abas Agendar e Concluídos e retorno a Tramitando; busca por \"zzzzzz\" com Enter, levando ao estado sem resultados; abertura do modal \"Atribuir Vistoriador\" pela linha 2 e fechamento em \"Cancelar\"; medições de refluxo em 360x740 e 320x640. Foram necessárias investigações detalhadas além do limite de 12 porque a tela tem fingerprints distintos que precisavam de evidência própria: aba Tramitando, aba Agendar, aba Concluídos, filtro aberto, filtro aplicado, resultado vazio, modal aberto e viewport 320x640. Candidatos avaliados e rejeitados: o menu do avatar está corretamente oculto (hidden + aria-hidden + display:none) e o acionador expõe aria-expanded/aria-controls; as paginações numérica e por seletor permanecem sincronizadas ao trocar de página; os distintivos \"Vistoria preenchida\"/\"Concluído\" (4.59:1) e \"Não comparecimento\" (4.60:1) atingem o contraste exigido; o modal usa role=\"dialog\" com aria-modal=\"true\" e aria-labelledby, e move o foco para dentro; não há ids duplicados; o atributo lang=\"pt-br\" está presente; a ausência de caixa de seleção nas linhas com status diferente de \"Vistoria agendada\" aparenta ser regra de negócio, não defeito. Limitações registradas: (1) os três campos br-input têm outline-style:none quando focados, sem anel de foco próprio (o restante da tela usa contorno tracejado dourado de 4px) — classifiquei como incerto quanto a WCAG 2.4.7, porque o cursor de texto e o indicador nativo do seletor de data permanecem visíveis, e por isso não gerei achado; (2) os campos de data nativos exibem o formato mm/dd/yyyy, mas isso decorre do locale do navegador de teste (en-US) e não da página, então não foi reportado; (3) a troca de abas não altera a URL, o que impede marcar ou voltar para uma aba específica — deixado como incerto por não haver referência normativa que eu pudesse sustentar; (4) a avaliação foi feita com o perfil mock-perfil=mpa (SUPERVISOR); outros perfis podem expor ações diferentes e não foram percorridos."
}
````

### Decisão

````json
{
  "cardId": "C-f7ae52ef43c766d4315fec86389ea8155836e8f83ffe76eef93224d970b02329",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-fca2b2e820e871ee634d9164f8a38b0584428701db6587eb6581b012f87dd041

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(6)>td:nth-of-type(9)>div>div:nth-of-type(1)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-c15b6c5eebcba3398c66c3e0637a94d83df38dbadd90880ebdf2d2fc868db6b8 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(6) > td:nth-of-type(9) > div > div:nth-of-type(1) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-fca2b2e820e871ee634d9164f8a38b0584428701db6587eb6581b012f87dd041",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-fd165b7cc6f33d013f846a9efa99e77a2504b05898f9f5716318265a6d149711

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(4)>table>tbody>tr:nth-of-type(7)>td:nth-of-type(9)>div>div:nth-of-type(3)>br-button >>> button" — <button> [shadow]

### Unidades candidatas (não são crédito)

- U-9bca684779864d487de252714c42d88bf603438c290f8f1035d9d643cf38aad9 — B-08 · inicial · cena 1280x900@inicial · <button> [shadow]: Os 40 botões de ação das linhas (4 por linha: atribuir/remover vistoriador, abrir, excluir, notificar) são br-button só com ícone, variante secondary sem circle (classes "br-button secondary middle"): nenhum rótulo visível fora da variante circular. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "tr:nth-of-type(7) > td:nth-of-type(9) > div > div:nth-of-type(3) > br-button >>> button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-fd165b7cc6f33d013f846a9efa99e77a2504b05898f9f5716318265a6d149711",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-fdd6272fcd1cc9a439d26f1c37d8df93bbec2137d181afe2a10853ce0896488b

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@modal

Observado: O primeiro link da página (href="/portal-mpa", "Home") não é uma âncora interna.

Esperado: O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até modal (8 passo(s))

Regra declarada: ds:page-skip-link

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "" — <html> "U Olá, Usuária de Teste, SUPERVISOR Programa Nac"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "html",
    "rule": "ds:page-skip-link",
    "observed": "O primeiro link da página (href=\"/portal-mpa\", \"Home\") não é uma âncora interna.",
    "expected": "O primeiro link da página é o salto para o conteúdo: âncora interna cujo alvo existe (e-MAG 1.5).",
    "scene": "1280x900@modal",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até modal (8 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-fdd6272fcd1cc9a439d26f1c37d8df93bbec2137d181afe2a10853ce0896488b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-fe43906babed67996ed371665f56d326999014642da1b301e8f7690531c841a7

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900@inicial

Observado: Elements must meet minimum color contrast ratio thresholds

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados até inicial (0 passo(s))

Regra declarada: axe:color-contrast

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>pnip-root>main>pnip-mpa>pnip-propesc-vistorias>div>div:nth-of-type(3)>div>div:nth-of-type(2)>span" — <span> "Nenhum filtro de data aplicado"

### Unidades candidatas (não são crédito)

- U-294d06e9c9ac03ecc74fb602199737580e11736300a52c3df77daafce5eb8a3c — B-13 · inicial · cena 1280x900@inicial · <span> "Nenhum filtro de data aplicado": Etiqueta "Nenhum filtro de data aplicado" (br-tag primary-pastel-01 small): texto branco sobre #c5d4eb, 14 px peso 500 — contraste 1,5:1. Sem predicado na referência; medido em tela-b/vistorias/conferir-auditoria.mjs.
  - estados em que a unidade existe: inicial
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".primary-pastel-01",
    "rule": "axe:color-contrast",
    "observed": "Elements must meet minimum color contrast ratio thresholds",
    "expected": null,
    "scene": "1280x900@inicial",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados até inicial (0 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-fe43906babed67996ed371665f56d326999014642da1b301e8f7690531c841a7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````
